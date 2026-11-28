import { logger } from '../../utils/logger';
import { maskEmail, maskPhone, toE164 } from './phone';
import type {
  EmailMessage,
  EmailProvider,
  MessagingProviders,
  SendResult,
  SmsMessage,
  SmsProvider,
  WhatsAppMessage,
  WhatsAppProvider,
} from './types';

/**
 * Recipient allowlist for non-production deployments that run on a copy of real customer data
 * (the testing deployment, infrastructure/testing/docs/integrations.md).
 *
 * When `MESSAGING_RECIPIENT_ALLOWLIST_ENABLED=true`, an SMS, WhatsApp, e-mail or push message is
 * only handed to its provider when the recipient is on the list; every other send is NOT made and
 * is reported as the non-retryable failure `RECIPIENT_NOT_ALLOWLISTED` (the outbox stores it as
 * FAILED with that code in `lastError`). Unset or any other value: no check, behaviour unchanged.
 *
 *   MESSAGING_ALLOWED_PHONES   comma-separated; any format toE164 accepts (10-digit Indian,
 *                              91..., +91..., +<cc>...). Compared after the same normalisation
 *                              every outbound send uses.
 *   MESSAGING_ALLOWED_EMAILS   comma-separated; exact addresses (case-insensitive) or "@domain"
 *                              entries that allow every address at exactly that domain.
 *   PUSH_ALLOWED_USER_IDS      comma-separated user ids whose devices may receive a push.
 *   PUSH_ALLOWED_DEVICE_TOKENS comma-separated FCM tokens that may receive a push.
 *
 * Enabled with empty lists = nothing is sent at all (the safe testing default).
 * The check sits at the provider layer (provider-registry.ts, fcm.provider.ts), so every path
 * (OTP, outbox, inline e-mail, campaigns, reminders, report notifications) goes through it.
 */
export const RECIPIENT_NOT_ALLOWLISTED = 'RECIPIENT_NOT_ALLOWLISTED';

export interface RecipientAllowlist {
  enabled: boolean;
  /** E.164 numbers. */
  phones: ReadonlySet<string>;
  /** Lower-case full addresses. */
  emails: ReadonlySet<string>;
  /** Lower-case domains (without "@"). */
  emailDomains: ReadonlySet<string>;
  pushUserIds: ReadonlySet<string>;
  pushTokens: ReadonlySet<string>;
}

const list = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const isTrue = (raw: string | undefined): boolean => {
  const v = raw?.trim().toLowerCase();
  return v === 'true' || v === '1';
};

export function recipientAllowlistFromEnv(env: NodeJS.ProcessEnv = process.env): RecipientAllowlist {
  const phones = new Set<string>();
  for (const entry of list(env.MESSAGING_ALLOWED_PHONES)) {
    const e164 = toE164(entry);
    if (e164) phones.add(e164);
    else logger.warn('[RecipientAllowlist] Ignoring an unusable MESSAGING_ALLOWED_PHONES entry');
  }
  const emails = new Set<string>();
  const emailDomains = new Set<string>();
  for (const entry of list(env.MESSAGING_ALLOWED_EMAILS)) {
    const lower = entry.toLowerCase();
    if (lower.startsWith('@')) {
      if (lower.length > 1) emailDomains.add(lower.slice(1));
    } else {
      emails.add(lower);
    }
  }
  return {
    enabled: isTrue(env.MESSAGING_RECIPIENT_ALLOWLIST_ENABLED),
    phones,
    emails,
    emailDomains,
    pushUserIds: new Set(list(env.PUSH_ALLOWED_USER_IDS)),
    pushTokens: new Set(list(env.PUSH_ALLOWED_DEVICE_TOKENS)),
  };
}

export const DISABLED_ALLOWLIST: RecipientAllowlist = {
  enabled: false,
  phones: new Set(),
  emails: new Set(),
  emailDomains: new Set(),
  pushUserIds: new Set(),
  pushTokens: new Set(),
};

export function isPhoneAllowed(allowlist: RecipientAllowlist, raw: string | null | undefined): boolean {
  if (!allowlist.enabled) return true;
  const e164 = toE164(raw);
  return e164 !== null && allowlist.phones.has(e164);
}

export function isEmailAllowed(allowlist: RecipientAllowlist, raw: string | null | undefined): boolean {
  if (!allowlist.enabled) return true;
  const email = raw?.trim().toLowerCase();
  if (!email) return false;
  if (allowlist.emails.has(email)) return true;
  const at = email.lastIndexOf('@');
  return at > 0 && allowlist.emailDomains.has(email.slice(at + 1));
}

export function isPushAllowed(allowlist: RecipientAllowlist, target: { userId?: string | null; token: string }): boolean {
  if (!allowlist.enabled) return true;
  if (allowlist.pushTokens.has(target.token)) return true;
  return Boolean(target.userId && allowlist.pushUserIds.has(target.userId));
}

const suppressed = (channel: string, maskedTo: string): SendResult => {
  logger.info({ channel, to: maskedTo }, '[RecipientAllowlist] Send suppressed: recipient is not on the testing allowlist');
  return { ok: false, code: RECIPIENT_NOT_ALLOWLISTED, retryable: false, detail: 'recipient is not on MESSAGING_ALLOWED_* list' };
};

class AllowlistedSms implements SmsProvider {
  constructor(private readonly inner: SmsProvider, private readonly allowlist: RecipientAllowlist) {}
  get name(): string {
    return this.inner.name;
  }
  send(message: SmsMessage): Promise<SendResult> {
    if (!isPhoneAllowed(this.allowlist, message.to)) return Promise.resolve(suppressed('SMS', maskPhone(message.to)));
    return this.inner.send(message);
  }
}

class AllowlistedWhatsApp implements WhatsAppProvider {
  constructor(private readonly inner: WhatsAppProvider, private readonly allowlist: RecipientAllowlist) {}
  get name(): string {
    return this.inner.name;
  }
  send(message: WhatsAppMessage): Promise<SendResult> {
    if (!isPhoneAllowed(this.allowlist, message.to)) return Promise.resolve(suppressed('WHATSAPP', maskPhone(message.to)));
    return this.inner.send(message);
  }
}

class AllowlistedEmail implements EmailProvider {
  constructor(private readonly inner: EmailProvider, private readonly allowlist: RecipientAllowlist) {}
  get name(): string {
    return this.inner.name;
  }
  send(message: EmailMessage): Promise<SendResult> {
    if (!isEmailAllowed(this.allowlist, message.to)) return Promise.resolve(suppressed('EMAIL', maskEmail(message.to)));
    return this.inner.send(message);
  }
}

/** Wraps every channel with the allowlist check; returns the providers untouched when it is disabled. */
export function withRecipientAllowlist(providers: MessagingProviders, allowlist: RecipientAllowlist): MessagingProviders {
  if (!allowlist.enabled) return providers;
  logger.info(
    {
      phones: allowlist.phones.size,
      emails: allowlist.emails.size,
      emailDomains: allowlist.emailDomains.size,
    },
    '[RecipientAllowlist] Enabled: SMS, WhatsApp and e-mail go only to allowlisted recipients'
  );
  return {
    sms: new AllowlistedSms(providers.sms, allowlist),
    whatsapp: new AllowlistedWhatsApp(providers.whatsapp, allowlist),
    email: new AllowlistedEmail(providers.email, allowlist),
  };
}
