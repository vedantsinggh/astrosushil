/**
 * Outbox (delivery, retries, idempotency) and OTP send limiter / delivery.
 * In-memory stores and fake providers: no database, no network.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/services/prisma.service', () => ({ prisma: {} }));

import {
  dedupeKeyOf,
  NewOutboundMessage,
  OutboundRow,
  OutboxService,
  OutboxStore,
  StoredOutboundMessage,
} from '../../src/services/messaging/outbox.service';
import {
  OtpDeliveryService,
  OtpLimitScope,
  OtpSendLimiter,
  OtpSendLogStore,
} from '../../src/services/messaging/otp-delivery.service';
import { FakeEmailProvider, FakeSmsProvider, FakeWhatsAppProvider } from '../../src/services/messaging/providers/fake.providers';
import type { MessagingProviders } from '../../src/services/messaging/types';

type Row = StoredOutboundMessage & {
  id: string;
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';
  attempts: number;
  lockedAt: Date | null;
  lastError: string | null;
  sentAt: Date | null;
};

export class MemoryOutboxStore implements OutboxStore {
  public rows: Row[] = [];
  async insert(row: StoredOutboundMessage): Promise<boolean> {
    if (this.rows.some((r) => r.dedupeKey === row.dedupeKey)) return false;
    this.rows.push({ ...row, id: `m${this.rows.length + 1}`, status: 'PENDING', attempts: 0, lockedAt: null, lastError: null, sentAt: null });
    return true;
  }
  async findDue(now: Date, limit: number): Promise<OutboundRow[]> {
    return this.rows
      .filter((r) => r.status === 'PENDING' && r.notBefore.getTime() <= now.getTime())
      .slice(0, limit)
      .map((r) => ({ id: r.id, dedupeKey: r.dedupeKey, event: r.event, channel: r.channel, recipient: r.recipient, payload: r.payload, attempts: r.attempts, maxAttempts: r.maxAttempts }));
  }
  async claim(id: string, now: Date): Promise<boolean> {
    const r = this.rows.find((x) => x.id === id);
    if (!r || r.status !== 'PENDING') return false;
    r.status = 'SENDING';
    r.lockedAt = now;
    r.attempts += 1;
    return true;
  }
  async markSent(id: string, now: Date): Promise<void> {
    const r = this.rows.find((x) => x.id === id)!;
    r.status = 'SENT';
    r.sentAt = now;
    r.lockedAt = null;
  }
  async markRetry(id: string, notBefore: Date, error: string): Promise<void> {
    const r = this.rows.find((x) => x.id === id)!;
    r.status = 'PENDING';
    r.notBefore = notBefore;
    r.lastError = error;
    r.lockedAt = null;
  }
  async markFailed(id: string, error: string): Promise<void> {
    const r = this.rows.find((x) => x.id === id)!;
    r.status = 'FAILED';
    r.lastError = error;
    r.lockedAt = null;
  }
  async failStale(lockedBefore: Date): Promise<number> {
    const stale = this.rows.filter((r) => r.status === 'SENDING' && r.lockedAt !== null && r.lockedAt.getTime() < lockedBefore.getTime());
    for (const r of stale) {
      r.status = 'FAILED';
      r.lastError = 'DELIVERY_UNCERTAIN';
    }
    return stale.length;
  }
}

const fakes = () => {
  const sms = new FakeSmsProvider();
  const whatsapp = new FakeWhatsAppProvider();
  const email = new FakeEmailProvider();
  const providers: MessagingProviders = { sms, whatsapp, email };
  return { sms, whatsapp, email, providers };
};

const smsMessage = (entityKey = 'b1'): NewOutboundMessage => ({
  event: 'booking-confirmed', entityKey, channel: 'SMS', recipient: '+919876543210', payload: { kind: 'sms', text: 'hello' },
});

describe('OutboxService', () => {
  let store: MemoryOutboxStore;
  let f: ReturnType<typeof fakes>;
  let clock: Date;
  let outbox: OutboxService;

  beforeEach(() => {
    store = new MemoryOutboxStore();
    f = fakes();
    clock = new Date('2026-11-24T10:00:00Z');
    outbox = new OutboxService({ store, providers: () => f.providers, now: () => clock });
  });
  const advance = (ms: number) => { clock = new Date(clock.getTime() + ms); };

  it('builds one key per event, entity, audience and channel', () => {
    expect(dedupeKeyOf(smsMessage())).toBe('booking-confirmed:b1:CUSTOMER:SMS');
    expect(dedupeKeyOf({ ...smsMessage(), audience: 'ADMIN', channel: 'WHATSAPP' })).toBe('booking-confirmed:b1:ADMIN:WHATSAPP');
  });

  it('sends each channel through its provider and marks the row SENT', async () => {
    await outbox.enqueue([
      smsMessage(),
      { event: 'booking-confirmed', entityKey: 'b1', channel: 'WHATSAPP', recipient: '+919876543210', payload: { kind: 'whatsapp', template: 'BOOKING_CONFIRMED', variables: { a: '1' } } },
      { event: 'booking-confirmed', entityKey: 'b1', channel: 'EMAIL', recipient: 'c@example.com', payload: { kind: 'email', subject: 'S', html: 'H' } },
    ]);
    expect(await outbox.processDue()).toEqual({ sent: 3, retried: 0, failed: 0 });
    expect(f.sms.sent).toEqual([{ to: '+919876543210', text: 'hello' }]);
    expect(f.whatsapp.sent).toEqual([{ to: '+919876543210', template: 'BOOKING_CONFIRMED', variables: { a: '1' } }]);
    expect(f.email.sent[0]).toMatchObject({ to: 'c@example.com', subject: 'S', html: 'H' });
    expect(store.rows.every((r) => r.status === 'SENT')).toBe(true);
  });

  it('never sends the same event twice: re-raising it creates nothing', async () => {
    expect(await outbox.enqueue([smsMessage()])).toEqual({ queued: ['booking-confirmed:b1:CUSTOMER:SMS'], duplicates: [] });
    await outbox.processDue();
    // The request is retried / the webhook arrives again / the worker restarts.
    expect(await outbox.enqueue([smsMessage()])).toEqual({ queued: [], duplicates: ['booking-confirmed:b1:CUSTOMER:SMS'] });
    await outbox.processDue();
    await outbox.processDue();
    expect(f.sms.sent).toHaveLength(1);
    expect(store.rows).toHaveLength(1);
  });

  it('a row claimed by another process is not sent by this one', async () => {
    await outbox.enqueue([smsMessage()]);
    await store.claim(store.rows[0].id, clock); // another worker got there first
    expect(await outbox.processDue()).toEqual({ sent: 0, retried: 0, failed: 0 });
    expect(f.sms.sent).toHaveLength(0);
  });

  it('retries a retryable failure with backoff, then delivers exactly once', async () => {
    await outbox.enqueue([smsMessage()]);
    f.sms.failNext({ ok: false, code: 'TIMEOUT', retryable: true }, { ok: false, code: 'PROVIDER_HTTP_ERROR', retryable: true, detail: 'HTTP 503' });

    expect(await outbox.processDue()).toEqual({ sent: 0, retried: 1, failed: 0 });
    expect(store.rows[0]).toMatchObject({ status: 'PENDING', attempts: 1, lastError: 'TIMEOUT' });
    // Not due again until the backoff (30 s) has passed.
    expect(await outbox.processDue()).toEqual({ sent: 0, retried: 0, failed: 0 });
    advance(30_000);
    expect(await outbox.processDue()).toEqual({ sent: 0, retried: 1, failed: 0 });
    advance(119_000);
    expect((await outbox.processDue()).sent).toBe(0);
    advance(1_000);
    expect(await outbox.processDue()).toEqual({ sent: 1, retried: 0, failed: 0 });
    expect(f.sms.sent).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({ status: 'SENT', attempts: 3 });
  });

  it('gives up after the maximum number of attempts and records why', async () => {
    await outbox.enqueue([smsMessage()]);
    const down = { ok: false as const, code: 'NETWORK_ERROR', retryable: true };
    f.sms.failNext(down, down, down, down, down);
    for (let i = 0; i < 6; i += 1) {
      await outbox.processDue();
      advance(60 * 60 * 1000);
    }
    expect(store.rows[0]).toMatchObject({ status: 'FAILED', attempts: 4, lastError: 'NETWORK_ERROR' });
    expect(f.sms.sent).toHaveLength(0);
  });

  it('does not retry a permanent failure (provider not configured, rejected content)', async () => {
    await outbox.enqueue([smsMessage()]);
    f.sms.failNext({ ok: false, code: 'PROVIDER_NOT_CONFIGURED', retryable: false, detail: 'no provider' });
    expect(await outbox.processDue()).toEqual({ sent: 0, retried: 0, failed: 1 });
    expect(store.rows[0]).toMatchObject({ status: 'FAILED', attempts: 1, lastError: 'PROVIDER_NOT_CONFIGURED: no provider' });
    advance(24 * 60 * 60 * 1000);
    expect((await outbox.processDue()).sent).toBe(0);
  });

  it('treats a provider that throws as a retryable failure', async () => {
    await outbox.enqueue([smsMessage()]);
    const throwing: MessagingProviders = { ...f.providers, sms: { name: 'x', send: async () => { throw new Error('boom'); } } };
    const o = new OutboxService({ store, providers: () => throwing, now: () => clock });
    expect(await o.processDue()).toEqual({ sent: 0, retried: 1, failed: 0 });
  });

  it('holds a delayed message until notBefore', async () => {
    const notBefore = new Date(clock.getTime() + 24 * 60 * 60 * 1000);
    await outbox.enqueue([{ ...smsMessage('r1'), event: 'report-ready', notBefore }]);
    expect((await outbox.processDue()).sent).toBe(0);
    advance(24 * 60 * 60 * 1000 - 1);
    expect((await outbox.processDue()).sent).toBe(0);
    advance(1);
    expect((await outbox.processDue()).sent).toBe(1);
  });

  it('after a crash in the middle of a send the message is closed as uncertain, not sent again', async () => {
    await outbox.enqueue([smsMessage()]);
    await store.claim(store.rows[0].id, clock); // process died after claiming / calling the provider
    advance(9 * 60 * 1000);
    expect(await outbox.recoverStale()).toBe(0);
    advance(2 * 60 * 1000);
    expect(await outbox.recoverStale()).toBe(1);
    expect(store.rows[0].status).toBe('FAILED');
    expect((await outbox.processDue()).sent).toBe(0);
    // Raising the event again still cannot produce a second message.
    expect((await outbox.enqueue([smsMessage()])).queued).toEqual([]);
    expect(f.sms.sent).toHaveLength(0);
  });
});

class MemoryOtpSendLog implements OtpSendLogStore {
  public rows: Array<{ id: string; scope: OtpLimitScope; keyHash: string; at: Date }> = [];
  private seq = 0;
  async record(scope: OtpLimitScope, keyHash: string, at: Date): Promise<string> {
    const id = `l${(this.seq += 1)}`;
    this.rows.push({ id, scope, keyHash, at });
    return id;
  }
  async count(scope: OtpLimitScope, keyHash: string, since: Date): Promise<number> {
    return this.rows.filter((r) => r.scope === scope && r.keyHash === keyHash && r.at.getTime() >= since.getTime()).length;
  }
  async remove(ids: string[]): Promise<void> {
    this.rows = this.rows.filter((r) => !ids.includes(r.id));
  }
  async deleteOlderThan(cutoff: Date): Promise<number> {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.at.getTime() >= cutoff.getTime());
    return before - this.rows.length;
  }
}

describe('OtpSendLimiter (website finding 5)', () => {
  let log: MemoryOtpSendLog;
  let clock: Date;
  let limiter: OtpSendLimiter;
  const advanceMin = (m: number) => { clock = new Date(clock.getTime() + m * 60 * 1000); };

  beforeEach(() => {
    log = new MemoryOtpSendLog();
    clock = new Date('2026-11-24T10:00:00Z');
    limiter = new OtpSendLimiter(log, () => clock);
  });

  it('allows 3 sends per identifier in 10 minutes and refuses the 4th', async () => {
    for (let i = 0; i < 3; i += 1) expect((await limiter.consume({ identifier: '+919876543210', ip: `10.0.0.${i}` })).allowed).toBe(true);
    expect(await limiter.consume({ identifier: '+919876543210', ip: '10.0.0.9' })).toEqual({ allowed: false, scope: 'IDENTIFIER', window: 'SHORT' });
  });

  it('cannot be reset by requesting again (the website deleted its counter on every request)', async () => {
    for (let i = 0; i < 3; i += 1) await limiter.consume({ identifier: '+919876543210' });
    for (let i = 0; i < 20; i += 1) {
      advanceMin(0.2);
      expect((await limiter.consume({ identifier: '+919876543210' })).allowed).toBe(false);
    }
    // Refused requests are not counted, so the window still ends 10 minutes after the real sends.
    expect(log.rows).toHaveLength(3);
    advanceMin(7);
    expect((await limiter.consume({ identifier: '+919876543210' })).allowed).toBe(true);
  });

  it('limits per IP address across different numbers', async () => {
    for (let i = 0; i < 10; i += 1) expect((await limiter.consume({ identifier: `+9198765432${10 + i}`, ip: '203.0.113.7' })).allowed).toBe(true);
    expect(await limiter.consume({ identifier: '+919800000000', ip: '203.0.113.7' })).toEqual({ allowed: false, scope: 'IP', window: 'SHORT' });
    // The refused request left no trace against the new number either.
    expect((await limiter.consume({ identifier: '+919800000000', ip: '203.0.113.8' })).allowed).toBe(true);
  });

  it('applies a daily cap per identifier', async () => {
    let allowed = 0;
    for (let i = 0; i < 30; i += 1) {
      if ((await limiter.consume({ identifier: 'user@example.com' })).allowed) allowed += 1;
      advanceMin(11);
    }
    expect(allowed).toBe(10);
    expect(await limiter.consume({ identifier: 'USER@example.com ' })).toEqual({ allowed: false, scope: 'IDENTIFIER', window: 'DAY' });
  });

  it('gives an allowance back when nothing was sent, stores only hashes, and purges by age', async () => {
    const a = await limiter.consume({ identifier: '+919876543210', ip: '203.0.113.7' });
    expect(log.rows).toHaveLength(2);
    expect(JSON.stringify(log.rows)).not.toContain('9876543210');
    expect(JSON.stringify(log.rows)).not.toContain('203.0.113.7');
    await limiter.release(a);
    expect(log.rows).toHaveLength(0);

    await limiter.consume({ identifier: '+919876543210' });
    advanceMin(49 * 60);
    expect(await limiter.purgeOld()).toBe(1);
  });
});

describe('OtpDeliveryService', () => {
  const saved = process.env.WHATCHIMP_TEMPLATE_ID;
  afterEach(() => {
    if (saved === undefined) delete process.env.WHATCHIMP_TEMPLATE_ID;
    else process.env.WHATCHIMP_TEMPLATE_ID = saved;
  });

  it('PHONE sends both SMS (DLT text) and WhatsApp, to the E.164 number', async () => {
    const f = fakes();
    const result = await new OtpDeliveryService(() => f.providers).sendPhoneOtp({ phone: '98765 43210', otp: '482913', purpose: 'login', name: 'Asha' });
    expect(result.delivered).toBe(true);
    expect(f.sms.sent).toEqual([{ to: '+919876543210', text: 'Hello Asha, Your login OTP is 482913. ASTRO SUSHIL PRIVATE LIMITED' }]);
    expect(f.whatsapp.sent).toEqual([{ to: '+919876543210', template: 'OTP', variables: { 'templateVariable-otp-2': '482913' } }]);
    expect(f.email.sent).toHaveLength(0);
  });

  it('uses "Customer" when there is no name and the signup text for a new number', async () => {
    const f = fakes();
    await new OtpDeliveryService(() => f.providers).sendPhoneOtp({ phone: '+919876543210', otp: '111222', purpose: 'signup', name: null });
    expect(f.sms.sent[0].text).toBe('Hello Customer, Your Signup OTP is 111222. ASTRO SUSHIL PRIVATE LIMITED');
  });

  it('one channel failing does not block the other; both failing is reported', async () => {
    const f = fakes();
    const svc = new OtpDeliveryService(() => f.providers);
    f.whatsapp.failNext({ ok: false, code: 'NETWORK_ERROR', retryable: true });
    expect((await svc.sendPhoneOtp({ phone: '+919876543210', otp: '1', purpose: 'login' })).delivered).toBe(true);

    f.sms.failNext({ ok: false, code: 'PROVIDER_NOT_CONFIGURED', retryable: false });
    f.whatsapp.failNext({ ok: false, code: 'PROVIDER_NOT_CONFIGURED', retryable: false });
    const both = await svc.sendPhoneOtp({ phone: '+919876543210', otp: '1', purpose: 'login' });
    expect(both.delivered).toBe(false);

    const throwing: MessagingProviders = { ...f.providers, sms: { name: 'x', send: async () => { throw new Error('boom'); } } };
    expect((await new OtpDeliveryService(() => throwing).sendPhoneOtp({ phone: '+919876543210', otp: '1', purpose: 'login' })).delivered).toBe(true);
  });

  it('refuses an unusable phone number without calling a provider', async () => {
    const f = fakes();
    expect((await new OtpDeliveryService(() => f.providers).sendPhoneOtp({ phone: 'abc', otp: '1', purpose: 'login' })).delivered).toBe(false);
    expect(f.sms.sent).toHaveLength(0);
  });

  it('EMAIL sends the website OTP e-mail only', async () => {
    const f = fakes();
    const result = await new OtpDeliveryService(() => f.providers).sendEmailOtp({ email: 'c@example.com', otp: '482913', expiryMinutes: 10 });
    expect(result.ok).toBe(true);
    expect(f.email.sent[0]).toMatchObject({ to: 'c@example.com', subject: 'Your Verification Code — Astro Sushil' });
    expect(f.email.sent[0].html).toContain('482913');
    expect(f.sms.sent).toHaveLength(0);
    expect(f.whatsapp.sent).toHaveLength(0);
  });
});
