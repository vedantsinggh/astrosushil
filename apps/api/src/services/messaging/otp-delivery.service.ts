import crypto from 'crypto';
import { prisma } from '../prisma.service';
import { logger } from '../../utils/logger';
import { messagingEnv } from './config';
import { maskEmail, maskPhone, toE164 } from './phone';
import { getMessagingProviders } from './provider-registry';
import { emailTemplates } from './templates/email.templates';
import { OtpSmsPurpose, smsTemplates } from './templates/sms.templates';
import { whatsappTemplates } from './templates/whatsapp.templates';
import type { MessagingProviders, SendResult } from './types';

// ---------------------------------------------------------------------------
// Send rate limit (website security finding 5)
// ---------------------------------------------------------------------------

export type OtpLimitScope = 'IDENTIFIER' | 'IP';

/** Persistence for the send counter. Rows are only ever removed by age (or by `remove` for a send that did not happen). */
export interface OtpSendLogStore {
  record(scope: OtpLimitScope, keyHash: string, at: Date): Promise<string>;
  count(scope: OtpLimitScope, keyHash: string, since: Date): Promise<number>;
  remove(ids: string[]): Promise<void>;
  deleteOlderThan(cutoff: Date): Promise<number>;
}

export class PrismaOtpSendLogStore implements OtpSendLogStore {
  public async record(scope: OtpLimitScope, keyHash: string, at: Date): Promise<string> {
    const row = await prisma.otpSendLog.create({ data: { scope, keyHash, createdAt: at }, select: { id: true } });
    return row.id;
  }
  public count(scope: OtpLimitScope, keyHash: string, since: Date): Promise<number> {
    return prisma.otpSendLog.count({ where: { scope, keyHash, createdAt: { gte: since } } });
  }
  public async remove(ids: string[]): Promise<void> {
    if (ids.length) await prisma.otpSendLog.deleteMany({ where: { id: { in: ids } } });
  }
  public async deleteOlderThan(cutoff: Date): Promise<number> {
    const res = await prisma.otpSendLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return res.count;
  }
}

export type OtpAllowance =
  | { allowed: true; ticket: string[] }
  | { allowed: false; scope: OtpLimitScope; window: 'SHORT' | 'DAY' };

const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Counts OTP sends per identifier (phone or e-mail) AND per IP address, each over a
 * short window and over 24 hours.
 *
 * The website counted the OTP records themselves and deleted them on every new
 * request, so its counter never reached the limit. Here the counter is a separate
 * append-only log: asking again adds a row, it never removes one, so the limit
 * cannot be reset by requesting again. The row is written BEFORE counting, so two
 * simultaneous requests can only make the limiter stricter, never looser.
 */
export class OtpSendLimiter {
  constructor(
    private readonly store: OtpSendLogStore = new PrismaOtpSendLogStore(),
    private readonly now: () => Date = () => new Date()
  ) {}

  public async consume(input: { identifier: string; ip?: string | null }): Promise<OtpAllowance> {
    const cfg = messagingEnv().otp;
    const at = this.now();
    const checks: Array<{ scope: OtpLimitScope; keyHash: string; windowMinutes: number; maxWindow: number; maxDay: number }> = [
      {
        scope: 'IDENTIFIER',
        keyHash: sha256(input.identifier.trim().toLowerCase()),
        windowMinutes: cfg.identifierWindowMinutes,
        maxWindow: cfg.identifierMaxPerWindow,
        maxDay: cfg.identifierMaxPerDay,
      },
    ];
    if (input.ip) {
      checks.push({
        scope: 'IP',
        keyHash: sha256(input.ip.trim()),
        windowMinutes: cfg.ipWindowMinutes,
        maxWindow: cfg.ipMaxPerWindow,
        maxDay: cfg.ipMaxPerDay,
      });
    }

    const ticket: string[] = [];
    for (const c of checks) ticket.push(await this.store.record(c.scope, c.keyHash, at));

    for (const c of checks) {
      const inWindow = await this.store.count(c.scope, c.keyHash, new Date(at.getTime() - c.windowMinutes * 60 * 1000));
      const inDay = inWindow > c.maxWindow ? 0 : await this.store.count(c.scope, c.keyHash, new Date(at.getTime() - DAY_MS));
      if (inWindow > c.maxWindow || inDay > c.maxDay) {
        // The refused request itself is not counted (otherwise anyone could keep a
        // number locked forever); the sends that WERE made stay counted.
        await this.store.remove(ticket);
        return { allowed: false, scope: c.scope, window: inWindow > c.maxWindow ? 'SHORT' : 'DAY' };
      }
    }
    return { allowed: true, ticket };
  }

  /** Gives an allowance back when the send was refused for another reason (e.g. the resend cooldown) and nothing was sent. */
  public async release(allowance: OtpAllowance): Promise<void> {
    if (allowance.allowed) await this.store.remove(allowance.ticket);
  }

  /** Age-based clean-up, run by the worker. */
  public purgeOld(): Promise<number> {
    return this.store.deleteOlderThan(new Date(this.now().getTime() - 2 * DAY_MS));
  }
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

export interface PhoneOtpDelivery {
  /** True when at least one of SMS / WhatsApp accepted the message. */
  delivered: boolean;
  sms: SendResult;
  whatsapp: SendResult;
}

const INVALID_RECIPIENT: SendResult = { ok: false, code: 'INVALID_RECIPIENT', retryable: false };

/**
 * Sends an OTP the way the website does: the PHONE channel sends BOTH an SMS
 * (DLT text for the purpose) and a WhatsApp template message, in parallel; the
 * EMAIL channel sends the OTP e-mail. OTPs are sent inline (never stored in the
 * outbox) and never logged.
 */
export class OtpDeliveryService {
  constructor(private readonly providers: () => MessagingProviders = getMessagingProviders) {}

  public async sendPhoneOtp(input: { phone: string; otp: string; purpose: OtpSmsPurpose; name?: string | null }): Promise<PhoneOtpDelivery> {
    const to = toE164(input.phone);
    if (!to) return { delivered: false, sms: INVALID_RECIPIENT, whatsapp: INVALID_RECIPIENT };

    const { sms, whatsapp } = this.providers();
    const text = smsTemplates.OTP({ purpose: input.purpose, name: input.name?.trim() || 'Customer', otp: input.otp });
    const wa = whatsappTemplates.OTP({ otp: input.otp });

    const guard = async (send: () => Promise<SendResult>): Promise<SendResult> => {
      try {
        return await send();
      } catch {
        return { ok: false, code: 'UNEXPECTED_ERROR', retryable: true };
      }
    };

    // One channel failing never blocks the other.
    const [smsResult, whatsappResult] = await Promise.all([
      guard(() => sms.send({ to, text })),
      guard(() => whatsapp.send({ to, ...wa })),
    ]);

    const log = { to: maskPhone(to), sms: describe(smsResult), whatsapp: describe(whatsappResult) };
    const delivered = smsResult.ok || whatsappResult.ok;
    if (!delivered) logger.error(log, '[OtpDelivery] Phone OTP could not be sent on any channel');
    else if (!smsResult.ok || !whatsappResult.ok) logger.warn(log, '[OtpDelivery] Phone OTP sent on one channel only');
    else logger.info(log, '[OtpDelivery] Phone OTP sent');

    return { delivered, sms: smsResult, whatsapp: whatsappResult };
  }

  public async sendEmailOtp(input: { email: string; otp: string; expiryMinutes: number }): Promise<SendResult> {
    const { subject, html } = emailTemplates.OTP({ otp: input.otp, expiryMinutes: input.expiryMinutes });
    let result: SendResult;
    try {
      result = await this.providers().email.send({ to: input.email, subject, html });
    } catch {
      result = { ok: false, code: 'UNEXPECTED_ERROR', retryable: true };
    }
    const log = { to: maskEmail(input.email), email: describe(result) };
    if (result.ok) logger.info(log, '[OtpDelivery] E-mail OTP sent');
    else logger.error(log, '[OtpDelivery] E-mail OTP could not be sent');
    return result;
  }
}

const describe = (r: SendResult): string => (r.ok ? (r.simulated ? 'SIMULATED' : 'SENT') : r.code);

export const otpSendLimiter = new OtpSendLimiter();
export const otpDeliveryService = new OtpDeliveryService();
