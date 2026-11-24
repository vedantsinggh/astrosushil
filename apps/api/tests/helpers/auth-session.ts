import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import type { Prisma, User } from '@prisma/client';
import { prisma } from '../../src/services/prisma.service';
import { TokenService } from '../../src/services/token.service';
import { setMessagingProviders } from '../../src/services/messaging/provider-registry';
import { FakeEmailProvider, FakeSmsProvider, FakeWhatsAppProvider } from '../../src/services/messaging/providers/fake.providers';

/**
 * Shared helpers for database-backed suites that need a user and a session.
 *
 * A suite that only needs "a signed-in customer" as SETUP creates the row and the tokens here,
 * directly, instead of driving the sign-in endpoints: customers sign in with a one-time code
 * (there is no password to register or log in with), and a setup step should not depend on OTP
 * delivery, cooldowns or send limits.
 */

export interface TestSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  /** Ready to spread into `app.inject({ headers })`. */
  headers: { authorization: string };
}

const unique = () => `${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;

/** A phone number in E.164 that no other run uses (+91 9xxxxxxxxx). */
export function uniqueTestPhone(): string {
  return `+919${crypto.randomInt(0, 1_000_000_000).toString().padStart(9, '0')}`;
}

export function uniqueTestEmail(prefix = 'test'): string {
  return `${prefix}-${unique()}@example.test`;
}

/** Creates a user row exactly as given (defaults: role USER, nothing verified). */
export function createTestUser(data: Prisma.UserCreateInput = {}): Promise<User> {
  return prisma.user.create({ data: { role: 'USER', ...data } });
}

/** Issues an access token and a stored refresh token for an existing user, as a sign-in would. */
export async function createSessionFor(app: FastifyInstance, user: User): Promise<TestSession> {
  const accessToken = app.jwt.sign({ sub: user.id, role: user.role });
  const refreshToken = TokenService.generateRawRefreshToken();
  await TokenService.saveRefreshToken(user.id, refreshToken);
  return { user, accessToken, refreshToken, headers: { authorization: `Bearer ${accessToken}` } };
}

/**
 * A signed-in customer with a complete profile (name, verified phone, verified e-mail) unless
 * overridden.
 */
export async function createTestCustomerSession(app: FastifyInstance, overrides: Prisma.UserCreateInput = {}): Promise<TestSession> {
  const now = new Date();
  const user = await createTestUser({
    fullName: 'Test Customer',
    phoneNumber: uniqueTestPhone(),
    phoneVerifiedAt: now,
    email: uniqueTestEmail('customer'),
    emailVerifiedAt: now,
    ...overrides,
  });
  return createSessionFor(app, user);
}

/** Removes users created by a suite (their OTP records and refresh tokens cascade). */
export async function deleteTestUsers(ids: string[]): Promise<void> {
  if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/**
 * Clears the OTP send counter for the given identifiers and for the address `app.inject()` calls
 * come from, so a suite's sends are not refused because of an earlier run (the counter is an
 * append-only table with limits per identifier and per IP).
 */
export async function clearOtpSendLimits(identifiers: string[] = []): Promise<void> {
  const keys = [...identifiers.map((value) => value.trim().toLowerCase()), '127.0.0.1'].map(sha256);
  await prisma.otpSendLog.deleteMany({ where: { keyHash: { in: keys } } });
}

/** Makes the 60-second resend cooldown of a user's codes look elapsed. */
export async function expireOtpCooldown(userId: string): Promise<void> {
  await prisma.otpVerification.updateMany({
    where: { userId },
    data: { createdAt: new Date(Date.now() - 61_000) },
  });
}

/**
 * Installs in-memory messaging providers and reads the codes they were asked to deliver, so an
 * OTP flow can be driven end to end without sending anything.
 */
export function installOtpInbox() {
  const sms = new FakeSmsProvider();
  const whatsapp = new FakeWhatsAppProvider();
  const email = new FakeEmailProvider();
  setMessagingProviders({ sms, whatsapp, email });

  return {
    sms,
    whatsapp,
    email,
    /** The most recent code sent by SMS to this E.164 number. */
    lastPhoneCode(phone: string): string {
      const message = [...sms.sent].reverse().find((m) => m.to === phone);
      const code = message && /OTP is (\d{6})\./.exec(message.text)?.[1];
      if (!code) throw new Error(`No OTP was sent to ${phone}`);
      return code;
    },
    /** The most recent code e-mailed to this address. */
    lastEmailCode(address: string): string {
      const message = [...email.sent].reverse().find((m) => m.to === address);
      const code = message && /letter-spacing:10px;">(\d{6})</.exec(message.html)?.[1];
      if (!code) throw new Error(`No OTP was e-mailed to ${address}`);
      return code;
    },
    sentTo(identifier: string): number {
      return sms.sent.filter((m) => m.to === identifier).length + email.sent.filter((m) => m.to === identifier).length;
    },
    uninstall(): void {
      setMessagingProviders(null);
    },
  };
}

/** A 6-digit code guaranteed to differ from the real one (and from the usual development master codes). */
export function wrongCode(real: string): string {
  return ['000001', '000002', '000003'].find((code) => code !== real) as string;
}
