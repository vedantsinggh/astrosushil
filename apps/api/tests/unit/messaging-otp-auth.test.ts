/**
 * AuthService.sendPhoneOtp / sendEmailOtp and EmailService: OTP delivery wired to the
 * messaging providers, with the send limits. Prisma is an in-memory substitute; providers are fakes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const db = vi.hoisted(() => {
  const state = {
    users: [] as Array<{ id: string; role: string; phoneNumber: string | null; email?: string | null; fullName: string | null; phoneVerifiedAt: Date | null; passwordHash?: string }>,
    staffProfiles: [] as Array<{ userId: string; isDeleted: boolean }>,
    otps: [] as Array<{ id: string; userId: string; purpose: string; codeHash: string; usedAt: Date | null; createdAt: Date; expiresAt: Date; attempts: number }>,
    sendLog: [] as Array<{ id: string; scope: string; keyHash: string; createdAt: Date }>,
    seq: 0,
  };
  const prisma = {
    user: {
      findFirst: async ({ where }: { where: { phoneNumber?: string; email?: string } }) =>
        state.users.find((u) => (where.email ? u.email === where.email : u.phoneNumber === where.phoneNumber)) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: { passwordHash: string } }) => {
        const u = state.users.find((x) => x.id === where.id)!;
        Object.assign(u, data);
        return u;
      },
      create: async ({ data }: { data: { phoneNumber?: string; email?: string } }) => {
        const u = { id: `u${(state.seq += 1)}`, role: 'USER', phoneNumber: data.phoneNumber ?? null, email: data.email ?? null, fullName: null, phoneVerifiedAt: null };
        state.users.push(u);
        return u;
      },
    },
    otpVerification: {
      findFirst: async ({ where }: { where: { userId: string; purpose: string; usedAt?: null } }) =>
        [...state.otps].reverse().find((o) => o.userId === where.userId && o.purpose === where.purpose && (!('usedAt' in where) || o.usedAt === null)) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const o = state.otps.find((x) => x.id === where.id)!;
        Object.assign(o, data);
        return o;
      },
      updateMany: async ({ where }: { where: { userId: string; purpose: string } }) => {
        const hit = state.otps.filter((o) => o.userId === where.userId && o.purpose === where.purpose && o.usedAt === null);
        hit.forEach((o) => (o.usedAt = new Date()));
        return { count: hit.length };
      },
      create: async ({ data }: { data: { userId: string; purpose: string; codeHash: string; expiresAt: Date } }) => {
        const o = { id: `o${(state.seq += 1)}`, ...data, usedAt: null, createdAt: new Date(), attempts: 0 };
        state.otps.push(o);
        return o;
      },
    },
    staffProfile: {
      findUnique: async ({ where }: { where: { userId: string } }) => state.staffProfiles.find((p) => p.userId === where.userId) ?? null,
    },
    refreshToken: { updateMany: async () => ({ count: 0 }) },
    otpSendLog: {
      create: async ({ data }: { data: { scope: string; keyHash: string; createdAt: Date } }) => {
        const row = { id: `l${(state.seq += 1)}`, ...data };
        state.sendLog.push(row);
        return { id: row.id };
      },
      count: async ({ where }: { where: { scope: string; keyHash: string; createdAt: { gte: Date } } }) =>
        state.sendLog.filter((r) => r.scope === where.scope && r.keyHash === where.keyHash && r.createdAt >= where.createdAt.gte).length,
      deleteMany: async ({ where }: { where: { id?: { in: string[] } } }) => {
        const ids = where.id?.in ?? [];
        const before = state.sendLog.length;
        state.sendLog = state.sendLog.filter((r) => !ids.includes(r.id));
        return { count: before - state.sendLog.length };
      },
    },
  };
  return { state, prisma };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: db.prisma }));

import { AuthService } from '../../src/modules/auth/auth.service';
import { otpService } from '../../src/modules/auth/otp.service';
import { EmailService } from '../../src/services/email.service';
import { setMessagingProviders } from '../../src/services/messaging/provider-registry';
import { FakeEmailProvider, FakeSmsProvider, FakeWhatsAppProvider } from '../../src/services/messaging/providers/fake.providers';

const ENV = ['NODE_ENV', 'DEV_OTP', 'DEV_MASTER_OTP'];
let savedEnv: Record<string, string | undefined>;
let sms: FakeSmsProvider;
let whatsapp: FakeWhatsAppProvider;
let email: FakeEmailProvider;
const auth = new AuthService();

/** Makes the 60-second resend cooldown look elapsed. */
const passCooldown = () => db.state.otps.forEach((o) => (o.createdAt = new Date(o.createdAt.getTime() - 61_000)));
const otpIn = (text: string) => /OTP is (\d{6})\./.exec(text)![1];

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  delete process.env.DEV_OTP;
  delete process.env.DEV_MASTER_OTP;
  db.state.users = [];
  db.state.staffProfiles = [];
  db.state.otps = [];
  db.state.sendLog = [];
  sms = new FakeSmsProvider();
  whatsapp = new FakeWhatsAppProvider();
  email = new FakeEmailProvider();
  setMessagingProviders({ sms, whatsapp, email });
});
afterEach(() => {
  setMessagingProviders(null);
  for (const k of ENV) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

describe('AuthService.sendPhoneOtp delivers the code', () => {
  it('sends the SAME code by SMS and WhatsApp and stores only its hash', async () => {
    const result = await auth.sendPhoneOtp({ phoneNumber: '98765 43210' }, { ip: '203.0.113.7' });
    expect(result).toEqual({ success: true, message: 'Verification code sent to your phone number.', phoneNumber: '+919876543210', expiresIn: 600 });

    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0].to).toBe('+919876543210');
    // New (unverified) number: the website's signup text, name "Customer".
    expect(sms.sent[0].text).toMatch(/^Hello Customer, Your Signup OTP is \d{6}\. ASTRO SUSHIL PRIVATE LIMITED$/);
    const code = otpIn(sms.sent[0].text);
    expect(whatsapp.sent).toEqual([{ to: '+919876543210', template: 'OTP', variables: { 'templateVariable-otp-2': code } }]);

    expect(db.state.otps).toHaveLength(1);
    expect(db.state.otps[0].codeHash).toBe(otpService.hashOtp(code));
    expect(JSON.stringify(db.state.otps)).not.toContain(code);
    expect(JSON.stringify(result)).not.toContain(code);
  });

  it('answers identically for a new number and an existing account', async () => {
    db.state.users.push({ id: 'existing', role: 'USER', phoneNumber: '+919876543210', fullName: 'Asha Rao', phoneVerifiedAt: new Date() });
    const existing = await auth.sendPhoneOtp({ phoneNumber: '+919876543210' }, { ip: '203.0.113.7' });
    const fresh = await auth.sendPhoneOtp({ phoneNumber: '+919876500000' }, { ip: '203.0.113.8' });
    expect({ ...existing, phoneNumber: '' }).toEqual({ ...fresh, phoneNumber: '' });
    // A verified account gets the login text with the first name.
    expect(sms.sent[0].text).toMatch(/^Hello Asha, Your login OTP is \d{6}\./);
  });

  it('keeps the 60-second resend cooldown, which does not use up the send limit', async () => {
    await auth.sendPhoneOtp({ phoneNumber: '+919876543210' });
    await expect(auth.sendPhoneOtp({ phoneNumber: '+919876543210' })).rejects.toMatchObject({ statusCode: 429 });
    expect(sms.sent).toHaveLength(1);
    expect(db.state.sendLog).toHaveLength(1);
  });

  it('limits sends per phone number; requesting again cannot reset the limit', async () => {
    for (let i = 0; i < 3; i += 1) {
      await auth.sendPhoneOtp({ phoneNumber: '+919876543210' }, { ip: `198.51.100.${i}` });
      passCooldown();
    }
    for (let i = 0; i < 5; i += 1) {
      await expect(auth.sendPhoneOtp({ phoneNumber: '+919876543210' }, { ip: `198.51.100.${10 + i}` })).rejects.toMatchObject({ statusCode: 429, code: 'RATE_LIMIT_EXCEEDED' });
    }
    expect(sms.sent).toHaveLength(3);
    expect(whatsapp.sent).toHaveLength(3);
  });

  it('limits sends per IP address across many numbers', async () => {
    for (let i = 0; i < 10; i += 1) await auth.sendPhoneOtp({ phoneNumber: `+9198765432${10 + i}` }, { ip: '203.0.113.7' });
    await expect(auth.sendPhoneOtp({ phoneNumber: '+919800000001' }, { ip: '203.0.113.7' })).rejects.toMatchObject({ statusCode: 429 });
    expect(sms.sent).toHaveLength(10);
    // Refused before anything was created for the new number.
    expect(db.state.users.some((u) => u.phoneNumber === '+919800000001')).toBe(false);
    await expect(auth.sendPhoneOtp({ phoneNumber: '+919800000001' }, { ip: '203.0.113.99' })).resolves.toMatchObject({ success: true });
  });

  it('succeeds when only one channel delivers', async () => {
    whatsapp.failNext({ ok: false, code: 'NETWORK_ERROR', retryable: true });
    await expect(auth.sendPhoneOtp({ phoneNumber: '+919876543210' })).resolves.toMatchObject({ success: true });
    expect(sms.sent).toHaveLength(1);
  });

  it('production: when no channel delivers, the request fails and the code is invalidated', async () => {
    process.env.NODE_ENV = 'production';
    sms.failNext({ ok: false, code: 'PROVIDER_NOT_CONFIGURED', retryable: false });
    whatsapp.failNext({ ok: false, code: 'PROVIDER_NOT_CONFIGURED', retryable: false });
    await expect(auth.sendPhoneOtp({ phoneNumber: '+919876543210' })).rejects.toMatchObject({ statusCode: 503, code: 'OTP_DELIVERY_FAILED' });
    expect(db.state.otps[0].usedAt).not.toBeNull();
    expect(otpService.isDevMasterOtpEnabled()).toBe(false);
  });

  it('development with the master OTP enabled: an undelivered code does not block testers', async () => {
    process.env.DEV_MASTER_OTP = '4444';
    sms.failNext({ ok: false, code: 'NETWORK_ERROR', retryable: true });
    whatsapp.failNext({ ok: false, code: 'NETWORK_ERROR', retryable: true });
    await expect(auth.sendPhoneOtp({ phoneNumber: '+919876543210' })).resolves.toMatchObject({ success: true });
    expect(db.state.otps[0].usedAt).toBeNull();
  });
});

describe('AuthService.sendEmailOtp delivers the code', () => {
  const emailCode = (html: string) => /letter-spacing:10px;">(\d{6})</.exec(html)![1];

  it('e-mails the code (no SMS, no WhatsApp) and stores only its hash', async () => {
    const result = await auth.sendEmailOtp({ email: 'Asha@Example.com ' }, { ip: '203.0.113.7' });
    expect(result).toEqual({ success: true, message: 'Verification code sent to your e-mail address.', email: 'asha@example.com', expiresIn: 600 });

    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe('asha@example.com');
    expect(email.sent[0].html).toContain('<strong>10 minutes</strong>');
    expect(sms.sent).toHaveLength(0);
    expect(whatsapp.sent).toHaveLength(0);

    const code = emailCode(email.sent[0].html);
    expect(db.state.otps).toHaveLength(1);
    expect(db.state.otps[0]).toMatchObject({ purpose: 'EMAIL_VERIFICATION', codeHash: otpService.hashOtp(code) });
    expect(JSON.stringify(db.state.otps)).not.toContain(code);
    expect(JSON.stringify(result)).not.toContain(code);
  });

  it('answers identically for a new address, a customer account and a staff account', async () => {
    db.state.users.push({ id: 'customer', role: 'USER', phoneNumber: null, email: 'customer@example.com', fullName: 'Asha Rao', phoneVerifiedAt: null });
    db.state.users.push({ id: 'staff', role: 'ADMIN', phoneNumber: null, email: 'staff@example.com', fullName: 'Staff', phoneVerifiedAt: null, passwordHash: 'x' });
    const fresh = await auth.sendEmailOtp({ email: 'new@example.com' }, { ip: '203.0.113.1' });
    const customer = await auth.sendEmailOtp({ email: 'customer@example.com' }, { ip: '203.0.113.2' });
    const staff = await auth.sendEmailOtp({ email: 'staff@example.com' }, { ip: '203.0.113.3' });
    expect({ ...customer, email: '' }).toEqual({ ...fresh, email: '' });
    expect({ ...staff, email: '' }).toEqual({ ...fresh, email: '' });
    expect(email.sent).toHaveLength(3);
  });

  it('keeps the 60-second resend cooldown, which does not use up the send limit', async () => {
    await auth.sendEmailOtp({ email: 'asha@example.com' });
    await expect(auth.sendEmailOtp({ email: 'asha@example.com' })).rejects.toMatchObject({ statusCode: 429 });
    expect(email.sent).toHaveLength(1);
    expect(db.state.sendLog).toHaveLength(1);
  });

  it('limits sends per address and per IP address', async () => {
    for (let i = 0; i < 3; i += 1) {
      await auth.sendEmailOtp({ email: 'asha@example.com' }, { ip: `198.51.100.${i}` });
      passCooldown();
    }
    await expect(auth.sendEmailOtp({ email: 'asha@example.com' }, { ip: '198.51.100.50' })).rejects.toMatchObject({ statusCode: 429, code: 'RATE_LIMIT_EXCEEDED' });
    expect(email.sent).toHaveLength(3);

    for (let i = 0; i < 10; i += 1) await auth.sendEmailOtp({ email: `person${i}@example.com` }, { ip: '203.0.113.7' });
    await expect(auth.sendEmailOtp({ email: 'one-more@example.com' }, { ip: '203.0.113.7' })).rejects.toMatchObject({ statusCode: 429 });
    // Refused before anything was created for the new address.
    expect(db.state.users.some((u) => u.email === 'one-more@example.com')).toBe(false);
  });

  it('production: when the e-mail cannot be sent, the request fails and the code is invalidated', async () => {
    process.env.NODE_ENV = 'production';
    email.failNext({ ok: false, code: 'PROVIDER_NOT_CONFIGURED', retryable: false });
    await expect(auth.sendEmailOtp({ email: 'asha@example.com' })).rejects.toMatchObject({ statusCode: 503, code: 'OTP_DELIVERY_FAILED' });
    expect(db.state.otps[0].usedAt).not.toBeNull();
  });

  it('production: the development master OTP is never accepted for an e-mail code', async () => {
    process.env.DEV_MASTER_OTP = '4444';
    process.env.DEV_OTP = '123456';
    await auth.sendEmailOtp({ email: 'asha@example.com' });
    process.env.NODE_ENV = 'production';
    const signJwt = () => 'jwt';
    await expect(auth.verifyEmailOtp({ email: 'asha@example.com', otp: '4444' }, signJwt)).rejects.toMatchObject({ statusCode: 401 });
    await expect(auth.verifyEmailOtp({ email: 'asha@example.com', otp: '123456' }, signJwt)).rejects.toMatchObject({ statusCode: 401 });
    expect(otpService.isDevMasterOtp('4444')).toBe(false);
  });
});

describe('staff password reset by e-mailed code (/auth/forgot-password, /auth/reset-password)', () => {
  beforeEach(() => {
    db.state.users.push({ id: 'staff1', role: 'SUPPORT', phoneNumber: null, email: 'staff@example.com', fullName: 'Staff', phoneVerifiedAt: null, passwordHash: 'old' });
    db.state.users.push({ id: 'customer1', role: 'USER', phoneNumber: null, email: 'customer@example.com', fullName: 'Customer', phoneVerifiedAt: null, passwordHash: 'customer-old' });
  });

  it('e-mails a code through the e-mail provider and the code resets the password', async () => {
    const answer = await auth.forgotPassword({ email: 'Staff@Example.com' });
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe('staff@example.com');
    const code = /letter-spacing:10px;">(\d{6})</.exec(email.sent[0].html)![1];
    expect(db.state.otps[0].codeHash).toBe(otpService.hashOtp(code));

    await expect(auth.resetPassword({ email: 'staff@example.com', otp: '000000', newPassword: 'N3w-Passw0rd!' })).rejects.toMatchObject({ statusCode: 401 });
    await expect(auth.resetPassword({ email: 'staff@example.com', otp: code, newPassword: 'N3w-Passw0rd!' })).resolves.toMatchObject({ message: expect.stringContaining('reset successfully') });
    expect(db.state.users.find((u) => u.id === 'staff1')!.passwordHash).not.toBe('old');

    // Same answer for an address without an account, and nothing is sent to it.
    expect(await auth.forgotPassword({ email: 'nobody@example.com' })).toEqual(answer);
    expect(email.sent).toHaveLength(1);
  });

  it('a customer address gets the same answers as an unknown one: no code, no password change', async () => {
    const unknownForgot = await auth.forgotPassword({ email: 'nobody@example.com' });
    expect(await auth.forgotPassword({ email: 'customer@example.com' })).toEqual(unknownForgot);
    expect(email.sent).toHaveLength(0);
    expect(db.state.otps).toHaveLength(0);

    const unknownReset = await auth.resetPassword({ email: 'nobody@example.com', otp: '123456', newPassword: 'N3w-Passw0rd!' }).catch((e) => e);
    const customerReset = await auth.resetPassword({ email: 'customer@example.com', otp: '123456', newPassword: 'N3w-Passw0rd!' }).catch((e) => e);
    expect(customerReset).toMatchObject({ statusCode: 401, code: 'AUTHENTICATION_ERROR' });
    expect(customerReset.message).toBe(unknownReset.message);
    expect(db.state.users.find((u) => u.id === 'customer1')!.passwordHash).toBe('customer-old');
  });

  it('a suspended staff account (role USER, staff profile kept) is still a staff account; a removed one is not', async () => {
    db.state.users.push({ id: 'staff2', role: 'USER', phoneNumber: null, email: 'suspended@example.com', fullName: 'S', phoneVerifiedAt: null, passwordHash: 'old' });
    db.state.users.push({ id: 'staff3', role: 'USER', phoneNumber: null, email: 'removed@example.com', fullName: 'R', phoneVerifiedAt: null, passwordHash: 'old' });
    db.state.staffProfiles.push({ userId: 'staff2', isDeleted: false }, { userId: 'staff3', isDeleted: true });
    await auth.forgotPassword({ email: 'suspended@example.com' });
    await auth.forgotPassword({ email: 'removed@example.com' });
    expect(email.sent.map((m) => m.to)).toEqual(['suspended@example.com']);
  });

  it('answers the same even when the e-mail cannot be sent (production, provider down)', async () => {
    process.env.NODE_ENV = 'production';
    const unknown = await auth.forgotPassword({ email: 'nobody@example.com' });
    email.failNext({ ok: false, code: 'PROVIDER_NOT_CONFIGURED', retryable: false });
    await expect(auth.forgotPassword({ email: 'staff@example.com' })).resolves.toEqual(unknown);
    expect(email.sent).toHaveLength(0);
  });
});

describe('EmailService (e-mail OTP)', () => {
  it('sends the website OTP e-mail for verification and password reset', async () => {
    const service = new EmailService();
    await service.sendVerificationEmail('c@example.com', '482913');
    await service.sendPasswordResetEmail('c@example.com', '112233');
    expect(email.sent.map((m) => m.subject)).toEqual(['Your Verification Code — Astro Sushil', 'Your Verification Code — Astro Sushil']);
    expect(email.sent[0].html).toContain('482913');
    expect(email.sent[0].html).toContain('<strong>10 minutes</strong>');
    expect(sms.sent).toHaveLength(0);
  });

  it('drops sends over the per-address limit quietly (same answer for the caller)', async () => {
    const service = new EmailService();
    for (let i = 0; i < 6; i += 1) await expect(service.sendVerificationEmail('c@example.com', '482913')).resolves.toBeUndefined();
    expect(email.sent).toHaveLength(3);
  });

  it('production: a failed or unconfigured provider is an error, never a silent "sent"', async () => {
    process.env.NODE_ENV = 'production';
    email.failNext({ ok: false, code: 'PROVIDER_NOT_CONFIGURED', retryable: false });
    await expect(new EmailService().sendVerificationEmail('c@example.com', '482913')).rejects.toMatchObject({ statusCode: 503, code: 'EMAIL_DELIVERY_FAILED' });
    email.failNext({ ok: false, code: 'EMAIL_SEND_FAILED', retryable: true });
    await expect(new EmailService().sendMailDirect({ toEmail: 'c@example.com', subject: 's', html: 'h' })).rejects.toMatchObject({ code: 'EMAIL_DELIVERY_FAILED' });
  });
});
