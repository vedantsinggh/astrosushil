/**
 * Testing-deployment safety: messaging recipient allowlist (SMS, WhatsApp, e-mail, push),
 * individual scheduler switches and the start-up deployment checks.
 * Fake providers and in-memory stores only: no database, no network.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/services/prisma.service', () => ({ prisma: {} }));

import { logger } from '../../src/utils/logger';
import { messagingEnv } from '../../src/services/messaging/config';
import { buildMessagingProviders } from '../../src/services/messaging/provider-registry';
import {
  DISABLED_ALLOWLIST,
  isEmailAllowed,
  isPhoneAllowed,
  isPushAllowed,
  RECIPIENT_NOT_ALLOWLISTED,
  recipientAllowlistFromEnv,
  withRecipientAllowlist,
} from '../../src/services/messaging/recipient-allowlist';
import { FakeEmailProvider, FakeSmsProvider, FakeWhatsAppProvider } from '../../src/services/messaging/providers/fake.providers';
import { OutboundRow, OutboxService, OutboxStore, StoredOutboundMessage } from '../../src/services/messaging/outbox.service';
import { OtpDeliveryService } from '../../src/services/messaging/otp-delivery.service';
import { messagingSweepFlags } from '../../src/services/messaging/messaging.scheduler';
import { FcmProvider } from '../../src/modules/notifications/fcm.provider';
import { campaignsEnabled, CampaignsService } from '../../src/modules/notifications/campaigns.service';
import { checkDeploymentSafety, enforceDeploymentSafety } from '../../src/services/deployment-safety';
import { isReportSlaMonitorEnabled, isStaleRecoveryLoopEnabled } from '../../src/services/report-worker.service';
import type { MessagingProviders } from '../../src/services/messaging/types';

const ENV_KEYS = [
  'MESSAGING_RECIPIENT_ALLOWLIST_ENABLED',
  'MESSAGING_ALLOWED_PHONES',
  'MESSAGING_ALLOWED_EMAILS',
  'PUSH_ALLOWED_USER_IDS',
  'PUSH_ALLOWED_DEVICE_TOKENS',
  'FIREBASE_SERVICE_ACCOUNT_FILE',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'SMS_PROVIDER',
];
let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.restoreAllMocks();
});

const enabledEnv = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  MESSAGING_RECIPIENT_ALLOWLIST_ENABLED: 'true',
  MESSAGING_ALLOWED_PHONES: '9876543210, +1 (555) 234-5678',
  MESSAGING_ALLOWED_EMAILS: 'Tester@Example.com,@qa.example.org',
  PUSH_ALLOWED_USER_IDS: 'user-ok',
  PUSH_ALLOWED_DEVICE_TOKENS: 'token-ok',
  ...extra,
});

function fakes() {
  const sms = new FakeSmsProvider();
  const whatsapp = new FakeWhatsAppProvider();
  const email = new FakeEmailProvider();
  return { sms, whatsapp, email, providers: { sms, whatsapp, email } as MessagingProviders };
}

describe('allowlist parsing and normalisation', () => {
  it('is disabled unless MESSAGING_RECIPIENT_ALLOWLIST_ENABLED is true or 1', () => {
    expect(recipientAllowlistFromEnv({}).enabled).toBe(false);
    expect(recipientAllowlistFromEnv({ MESSAGING_RECIPIENT_ALLOWLIST_ENABLED: 'false' }).enabled).toBe(false);
    expect(recipientAllowlistFromEnv({ MESSAGING_RECIPIENT_ALLOWLIST_ENABLED: 'yes' }).enabled).toBe(false);
    expect(recipientAllowlistFromEnv({ MESSAGING_RECIPIENT_ALLOWLIST_ENABLED: 'TRUE' }).enabled).toBe(true);
    expect(recipientAllowlistFromEnv({ MESSAGING_RECIPIENT_ALLOWLIST_ENABLED: '1' }).enabled).toBe(true);
  });

  it('normalises allowed phones the same way every send does (E.164, India by default)', () => {
    const list = recipientAllowlistFromEnv(enabledEnv());
    expect([...list.phones].sort()).toEqual(['+15552345678', '+919876543210']);
    for (const raw of ['9876543210', '919876543210', '+919876543210', '+91 98765-43210', '09876543210', '00919876543210']) {
      expect(isPhoneAllowed(list, raw)).toBe(true);
    }
    expect(isPhoneAllowed(list, '+15552345678')).toBe(true);
    expect(isPhoneAllowed(list, '9876543211')).toBe(false);
    expect(isPhoneAllowed(list, '')).toBe(false);
    expect(isPhoneAllowed(list, null)).toBe(false);
  });

  it('drops unusable phone entries instead of allowing anything', () => {
    const list = recipientAllowlistFromEnv({ MESSAGING_RECIPIENT_ALLOWLIST_ENABLED: 'true', MESSAGING_ALLOWED_PHONES: 'abc,12,' });
    expect(list.phones.size).toBe(0);
    expect(isPhoneAllowed(list, '9876543210')).toBe(false);
  });

  it('matches e-mails exactly (case-insensitive) or by @domain, never by suffix', () => {
    const list = recipientAllowlistFromEnv(enabledEnv());
    expect(isEmailAllowed(list, 'tester@example.com')).toBe(true);
    expect(isEmailAllowed(list, ' TESTER@EXAMPLE.COM ')).toBe(true);
    expect(isEmailAllowed(list, 'anyone@qa.example.org')).toBe(true);
    expect(isEmailAllowed(list, 'other@example.com')).toBe(false);
    expect(isEmailAllowed(list, 'x@sub.qa.example.org')).toBe(false);
    expect(isEmailAllowed(list, 'x@evilqa.example.org')).toBe(false);
    expect(isEmailAllowed(list, 'tester@example.com.evil.net')).toBe(false);
    expect(isEmailAllowed(list, '')).toBe(false);
  });

  it('allows a push by user id or by device token', () => {
    const list = recipientAllowlistFromEnv(enabledEnv());
    expect(isPushAllowed(list, { userId: 'user-ok', token: 'any' })).toBe(true);
    expect(isPushAllowed(list, { token: 'token-ok' })).toBe(true);
    expect(isPushAllowed(list, { userId: 'user-x', token: 'token-x' })).toBe(false);
    expect(isPushAllowed(list, { token: 'token-x' })).toBe(false);
  });

  it('enabled with empty lists allows nobody', () => {
    const list = recipientAllowlistFromEnv({ MESSAGING_RECIPIENT_ALLOWLIST_ENABLED: 'true' });
    expect(isPhoneAllowed(list, '9876543210')).toBe(false);
    expect(isEmailAllowed(list, 'a@b.co')).toBe(false);
    expect(isPushAllowed(list, { userId: 'u', token: 't' })).toBe(false);
  });

  it('disabled allows everybody', () => {
    expect(isPhoneAllowed(DISABLED_ALLOWLIST, '9876543210')).toBe(true);
    expect(isEmailAllowed(DISABLED_ALLOWLIST, 'a@b.co')).toBe(true);
    expect(isPushAllowed(DISABLED_ALLOWLIST, { token: 't' })).toBe(true);
  });
});

describe('provider wrapper (the choke point every SMS / WhatsApp / e-mail goes through)', () => {
  it('sends to allowlisted recipients on every channel', async () => {
    const f = fakes();
    const p = withRecipientAllowlist(f.providers, recipientAllowlistFromEnv(enabledEnv()));
    expect((await p.sms.send({ to: '+919876543210', text: 'hi' })).ok).toBe(true);
    expect((await p.whatsapp.send({ to: '+919876543210', template: 'OTP', variables: {} })).ok).toBe(true);
    expect((await p.email.send({ to: 'tester@example.com', subject: 's', html: 'h' })).ok).toBe(true);
    expect(f.sms.sent).toHaveLength(1);
    expect(f.whatsapp.sent).toHaveLength(1);
    expect(f.email.sent).toHaveLength(1);
  });

  it('suppresses non-allowlisted recipients on every channel, non-retryable', async () => {
    const f = fakes();
    const p = withRecipientAllowlist(f.providers, recipientAllowlistFromEnv(enabledEnv()));
    const results = [
      await p.sms.send({ to: '+919000000001', text: 'hi' }),
      await p.whatsapp.send({ to: '+919000000001', template: 'OTP', variables: {} }),
      await p.email.send({ to: 'customer@gmail.com', subject: 's', html: 'h' }),
    ];
    for (const r of results) expect(r).toMatchObject({ ok: false, code: RECIPIENT_NOT_ALLOWLISTED, retryable: false });
    expect(f.sms.sent).toHaveLength(0);
    expect(f.whatsapp.sent).toHaveLength(0);
    expect(f.email.sent).toHaveLength(0);
  });

  it('logs suppressed sends masked (never the full phone or e-mail)', async () => {
    const info = vi.spyOn(logger, 'info');
    const f = fakes();
    const p = withRecipientAllowlist(f.providers, recipientAllowlistFromEnv(enabledEnv()));
    await p.sms.send({ to: '+919000012345', text: 'hi' });
    await p.email.send({ to: 'customer.name@gmail.com', subject: 's', html: 'h' });
    const logged = JSON.stringify(info.mock.calls);
    expect(logged).not.toContain('9000012345');
    expect(logged).not.toContain('customer.name@gmail.com');
    expect(logged).toContain('2345');
    expect(logged).toContain('c***@gmail.com');
  });

  it('returns the providers untouched when disabled (production behaviour)', () => {
    const f = fakes();
    expect(withRecipientAllowlist(f.providers, DISABLED_ALLOWLIST)).toBe(f.providers);
    expect(withRecipientAllowlist(f.providers, recipientAllowlistFromEnv({}))).toBe(f.providers);
  });

  it('is applied by buildMessagingProviders from the environment and keeps the provider names', async () => {
    process.env.MESSAGING_RECIPIENT_ALLOWLIST_ENABLED = 'true';
    process.env.MESSAGING_ALLOWED_PHONES = '9876543210';
    process.env.SMS_PROVIDER = 'none';
    const p = buildMessagingProviders(messagingEnv());
    expect(p.sms.name).toBe('log-only');
    expect(await p.sms.send({ to: '+919000000001', text: 'x' })).toMatchObject({ code: RECIPIENT_NOT_ALLOWLISTED });
    expect((await p.sms.send({ to: '+919876543210', text: 'x' })).ok).toBe(true);

    delete process.env.MESSAGING_RECIPIENT_ALLOWLIST_ENABLED;
    const unguarded = buildMessagingProviders(messagingEnv());
    expect((await unguarded.sms.send({ to: '+919000000001', text: 'x' })).ok).toBe(true);
  });
});

class MemoryStore implements OutboxStore {
  public rows: Array<StoredOutboundMessage & { id: string; status: string; attempts: number; lastError: string | null }> = [];
  async insert(row: StoredOutboundMessage): Promise<boolean> {
    this.rows.push({ ...row, id: `m${this.rows.length + 1}`, status: 'PENDING', attempts: 0, lastError: null });
    return true;
  }
  async findDue(now: Date): Promise<OutboundRow[]> {
    return this.rows
      .filter((r) => r.status === 'PENDING' && r.notBefore <= now)
      .map((r) => ({ id: r.id, dedupeKey: r.dedupeKey, event: r.event, channel: r.channel, recipient: r.recipient, payload: r.payload, attempts: r.attempts, maxAttempts: r.maxAttempts }));
  }
  async claim(id: string): Promise<boolean> {
    const r = this.rows.find((x) => x.id === id)!;
    if (r.status !== 'PENDING') return false;
    r.status = 'SENDING';
    r.attempts += 1;
    return true;
  }
  async markSent(id: string): Promise<void> {
    this.rows.find((x) => x.id === id)!.status = 'SENT';
  }
  async markRetry(id: string, _notBefore: Date, error: string): Promise<void> {
    const r = this.rows.find((x) => x.id === id)!;
    r.status = 'PENDING';
    r.lastError = error;
  }
  async markFailed(id: string, error: string): Promise<void> {
    const r = this.rows.find((x) => x.id === id)!;
    r.status = 'FAILED';
    r.lastError = error;
  }
  async failStale(): Promise<number> {
    return 0;
  }
}

describe('outbox with the allowlist', () => {
  it('sends allowlisted rows and records the others as FAILED with RECIPIENT_NOT_ALLOWLISTED, never retried', async () => {
    const f = fakes();
    const guarded = withRecipientAllowlist(f.providers, recipientAllowlistFromEnv(enabledEnv()));
    const store = new MemoryStore();
    const outbox = new OutboxService({ store, providers: () => guarded });
    await outbox.enqueue([
      { event: 'e', entityKey: '1', channel: 'EMAIL', recipient: 'tester@example.com', payload: { kind: 'email', subject: 's', html: 'h' } },
      { event: 'e', entityKey: '2', channel: 'EMAIL', recipient: 'customer@gmail.com', payload: { kind: 'email', subject: 's', html: 'h' } },
      { event: 'e', entityKey: '3', channel: 'WHATSAPP', recipient: '+919000000001', payload: { kind: 'whatsapp', template: 'REPORT_READY', variables: {} } },
    ]);
    const summary = await outbox.processDue();
    expect(summary).toEqual({ sent: 1, retried: 0, failed: 2 });
    expect(store.rows.map((r) => r.status)).toEqual(['SENT', 'FAILED', 'FAILED']);
    expect(store.rows[1].lastError).toMatch(/^RECIPIENT_NOT_ALLOWLISTED/);
    expect(store.rows[2].attempts).toBe(1);
    expect(f.email.sent.map((m) => m.to)).toEqual(['tester@example.com']);
    expect(f.whatsapp.sent).toHaveLength(0);
    // A second run sends nothing more.
    expect(await outbox.processDue()).toEqual({ sent: 0, retried: 0, failed: 0 });
  });
});

describe('OTP with the allowlist', () => {
  it('still sends an allowlisted tester OTP by SMS and WhatsApp, and by e-mail', async () => {
    const f = fakes();
    const guarded = withRecipientAllowlist(f.providers, recipientAllowlistFromEnv(enabledEnv()));
    const otp = new OtpDeliveryService(() => guarded);
    const phone = await otp.sendPhoneOtp({ phone: '98765 43210', otp: '123456', purpose: 'login' });
    expect(phone.delivered).toBe(true);
    expect(f.sms.sent).toHaveLength(1);
    expect(f.whatsapp.sent).toHaveLength(1);
    expect((await otp.sendEmailOtp({ email: 'tester@example.com', otp: '123456', expiryMinutes: 10 })).ok).toBe(true);
  });

  it('does not send an OTP to a copied customer number', async () => {
    const f = fakes();
    const guarded = withRecipientAllowlist(f.providers, recipientAllowlistFromEnv(enabledEnv()));
    const otp = new OtpDeliveryService(() => guarded);
    const phone = await otp.sendPhoneOtp({ phone: '9000000001', otp: '123456', purpose: 'login' });
    expect(phone.delivered).toBe(false);
    expect(phone.sms).toMatchObject({ code: RECIPIENT_NOT_ALLOWLISTED });
    expect(f.sms.sent).toHaveLength(0);
    expect(f.whatsapp.sent).toHaveLength(0);
  });
});

describe('push (FCM) with the allowlist', () => {
  it('suppresses a device that is neither an allowed user nor an allowed token', async () => {
    Object.assign(process.env, enabledEnv());
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const res = await new FcmProvider().sendPushNotification({ token: 'token-x', userId: 'user-x', notification: { title: 't', body: 'b' }, data: { type: 'SYSTEM' } });
    expect(res).toEqual({ success: false, errorCode: RECIPIENT_NOT_ALLOWLISTED });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('lets an allowlisted user through (simulated outside production when Firebase is not configured)', async () => {
    Object.assign(process.env, enabledEnv());
    const p = new FcmProvider();
    expect(await p.sendPushNotification({ token: 'token-x', userId: 'user-ok', notification: { title: 't', body: 'b' }, data: { type: 'SYSTEM' } })).toEqual({ success: true });
    expect(await p.sendPushNotification({ token: 'token-ok', notification: { title: 't', body: 'b' }, data: { type: 'SYSTEM' } })).toEqual({ success: true });
  });

  it('is unchanged when the allowlist is disabled', async () => {
    const res = await new FcmProvider().sendPushNotification({ token: 'token-x', notification: { title: 't', body: 'b' }, data: { type: 'SYSTEM' } });
    expect(res).toEqual({ success: true });
  });
});

describe('individual scheduler switches (default on, as in production)', () => {
  it('messaging sweeps are all on when unset', () => {
    expect(messagingSweepFlags({})).toEqual({ outboxDispatch: true, reportRelease: true, consultationReminder: true, otpCleanup: true });
  });

  it('each messaging sweep can be switched off on its own', () => {
    expect(messagingSweepFlags({ OUTBOX_DISPATCH_SCHEDULER_ENABLED: 'false' }).outboxDispatch).toBe(false);
    expect(messagingSweepFlags({ REPORT_RELEASE_SCHEDULER_ENABLED: 'false' })).toMatchObject({ reportRelease: false, outboxDispatch: true });
    expect(messagingSweepFlags({ CONSULTATION_REMINDER_SCHEDULER_ENABLED: 'FALSE' }).consultationReminder).toBe(false);
    expect(messagingSweepFlags({ OTP_CLEANUP_SCHEDULER_ENABLED: 'false' }).otpCleanup).toBe(false);
    expect(messagingSweepFlags({ OTP_CLEANUP_SCHEDULER_ENABLED: 'true' }).otpCleanup).toBe(true);
  });

  it('campaigns default on; NOTIFICATION_CAMPAIGNS_ENABLED=false refuses a new campaign before any lookup', async () => {
    expect(campaignsEnabled({})).toBe(true);
    expect(campaignsEnabled({ NOTIFICATION_CAMPAIGNS_ENABLED: 'false' })).toBe(false);
    const saved = process.env.NOTIFICATION_CAMPAIGNS_ENABLED;
    process.env.NOTIFICATION_CAMPAIGNS_ENABLED = 'false';
    try {
      await expect(
        new CampaignsService().create(
          { kind: 'ANNOUNCEMENT', title: 't', body: 'b', channels: ['IN_APP'], audience: { type: 'ALL' } } as never,
          { id: 'a', name: 'A' }
        )
      ).rejects.toMatchObject({ code: 'CAMPAIGNS_DISABLED' });
    } finally {
      if (saved === undefined) delete process.env.NOTIFICATION_CAMPAIGNS_ENABLED;
      else process.env.NOTIFICATION_CAMPAIGNS_ENABLED = saved;
    }
  });

  it('report stale-recovery loop and SLA monitor default on and switch off with "false"', () => {
    expect(isStaleRecoveryLoopEnabled({})).toBe(true);
    expect(isStaleRecoveryLoopEnabled({ REPORT_STALE_RECOVERY_SCHEDULER_ENABLED: 'false' })).toBe(false);
    expect(isReportSlaMonitorEnabled({})).toBe(true);
    expect(isReportSlaMonitorEnabled({ REPORT_SLA_SCHEDULER_ENABLED: 'false' })).toBe(false);
  });
});

describe('deployment safety checks', () => {
  it('checks nothing when DEPLOYMENT_ENVIRONMENT is not testing (production)', () => {
    const env = { RAZORPAY_KEY_ID: 'rzp_live_abc' };
    expect(checkDeploymentSafety(env)).toEqual({ testing: false, errors: [], warnings: [] });
    expect(() => enforceDeploymentSafety('api', env)).not.toThrow();
  });

  it('refuses a live Razorpay key in testing', () => {
    const env = { DEPLOYMENT_ENVIRONMENT: 'testing', RAZORPAY_KEY_ID: 'rzp_live_abc', MESSAGING_RECIPIENT_ALLOWLIST_ENABLED: 'true' };
    expect(checkDeploymentSafety(env).errors).toHaveLength(1);
    expect(() => enforceDeploymentSafety('api', env)).toThrow(/LIVE key/);
  });

  it('accepts test keys and warns (without refusing) when the allowlist is off', () => {
    const warn = vi.spyOn(logger, 'warn');
    const env = { DEPLOYMENT_ENVIRONMENT: 'Testing', RAZORPAY_KEY_ID: 'rzp_test_abc' };
    const result = checkDeploymentSafety(env);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(() => enforceDeploymentSafety('worker', env)).not.toThrow();
    expect(warn).toHaveBeenCalled();
    expect(checkDeploymentSafety({ ...env, MESSAGING_RECIPIENT_ALLOWLIST_ENABLED: 'true' }).warnings).toEqual([]);
  });
});
