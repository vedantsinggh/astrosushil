import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { hashPassword } from '../../src/utils/hash';
import {
  clearOtpSendLimits,
  createSessionFor,
  createTestUser,
  deleteTestUsers,
  installOtpInbox,
  uniqueTestEmail,
  uniqueTestPhone,
  wrongCode,
} from '../helpers/auth-session';

/**
 * Accounts created before sign-in became OTP-only, and adding the second identifier
 * (integration, real test database).
 *
 *  - An account made with a password or with Google is reached by a code to its e-mail address
 *    (and to its phone number when it has one); its passwordHash / googleId stay as they were.
 *  - A signed-in customer adds and verifies the other identifier with link-phone / link-email.
 *    Two existing accounts are never merged.
 */
describe('Auth API: old password/Google accounts and account linking (Integration)', () => {
  let app: FastifyInstance;
  let inbox: ReturnType<typeof installOtpInbox>;
  const createdUserIds: string[] = [];
  const usedIdentifiers: string[] = [];

  const phone = () => {
    const value = uniqueTestPhone();
    usedIdentifiers.push(value);
    return value;
  };
  const email = (prefix: string) => {
    const value = uniqueTestEmail(prefix);
    usedIdentifiers.push(value);
    return value;
  };
  const post = (url: string, payload: unknown, headers: Record<string, string> = {}) =>
    app.inject({ method: 'POST', url: `/api/v1/auth${url}`, payload: payload as object, headers });
  const user = async (data: Parameters<typeof createTestUser>[0]) => {
    const created = await createTestUser(data);
    createdUserIds.push(created.id);
    return created;
  };

  /** send-otp + verify-otp for an e-mail address. */
  const signInByEmail = async (address: string) => {
    expect((await post('/email/send-otp', { email: address })).statusCode).toBe(200);
    return post('/email/verify-otp', { email: address, otp: inbox.lastEmailCode(address) });
  };
  const signInByPhone = async (phoneNumber: string) => {
    expect((await post('/phone/send-otp', { phoneNumber })).statusCode).toBe(200);
    return post('/phone/verify-otp', { phoneNumber, otp: inbox.lastPhoneCode(phoneNumber) });
  };
  const remember = (response: { statusCode: number; json: () => { user?: { id: string } } }) => {
    const id = response.statusCode === 200 ? response.json().user?.id : undefined;
    if (id && !createdUserIds.includes(id)) createdUserIds.push(id);
  };

  beforeAll(async () => {
    inbox = installOtpInbox();
    app = buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    await clearOtpSendLimits();
  });

  afterAll(async () => {
    // Pending records left by send-otp calls that were never verified.
    const leftovers = await prisma.user.findMany({
      where: { OR: [{ phoneNumber: { in: usedIdentifiers } }, { email: { in: usedIdentifiers } }] },
      select: { id: true },
    });
    await deleteTestUsers([...createdUserIds, ...leftovers.map((u) => u.id)]);
    await clearOtpSendLimits(usedIdentifiers);
    inbox.uninstall();
    await app.close();
  });

  describe('accounts created with a password or with Google are not locked out', () => {
    it('a password account (verified e-mail, no phone) is reached by a code to its e-mail address', async () => {
      const address = email('legacy-password');
      const passwordHash = await hashPassword('Legacy-Passw0rd!');
      const legacy = await user({ email: address, emailVerifiedAt: new Date('2026-01-05T00:00:00Z'), fullName: 'Legacy Password', passwordHash });

      const response = await signInByEmail(address);
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.user.id).toBe(legacy.id);
      expect(body.isNewAccount).toBe(false);
      expect(body.user.missingProfileFields).toEqual(['phoneNumber']);

      const row = await prisma.user.findUnique({ where: { id: legacy.id } });
      expect(row!.passwordHash).toBe(passwordHash);
      expect(row!.emailVerifiedAt!.toISOString()).toBe('2026-01-05T00:00:00.000Z');
      expect(await prisma.user.count({ where: { email: address } })).toBe(1);
    });

    it('a Google account is reached by a code to its Google e-mail address', async () => {
      const address = email('legacy-google');
      const legacy = await user({ email: address, emailVerifiedAt: new Date(), fullName: 'Legacy Google', googleId: `google-sub-${address}` });

      const response = await signInByEmail(address);
      expect(response.statusCode).toBe(200);
      expect(response.json().user).toMatchObject({ id: legacy.id, googleId: `google-sub-${address}` });
      expect((await prisma.user.findUnique({ where: { id: legacy.id } }))!.googleId).toBe(`google-sub-${address}`);
    });

    it('a password registration whose e-mail was never verified is reached by the code, which verifies the address', async () => {
      const address = email('legacy-unverified');
      const legacy = await user({ email: address, fullName: 'Never Verified', passwordHash: await hashPassword('Legacy-Passw0rd!') });

      const response = await signInByEmail(address);
      expect(response.statusCode).toBe(200);
      expect(response.json().user.id).toBe(legacy.id);
      expect(response.json().user.isEmailVerified).toBe(true);
    });

    it('an old account with a verified phone is reached by phone, and by e-mail, as ONE account', async () => {
      const address = email('legacy-both');
      const phoneNumber = phone();
      const legacy = await user({
        email: address,
        emailVerifiedAt: new Date(),
        phoneNumber,
        phoneVerifiedAt: new Date(),
        fullName: 'Legacy Both',
        googleId: `google-sub-${address}`,
      });

      const byPhone = await signInByPhone(phoneNumber);
      const byEmail = await signInByEmail(address);
      expect(byPhone.json().user.id).toBe(legacy.id);
      expect(byEmail.json().user.id).toBe(legacy.id);
      expect(byPhone.json().user.profileComplete).toBe(true);
    });

    it('an old password account that stored a phone number without verifying it is reached by that number (no second account)', async () => {
      const address = email('legacy-phone-unverified');
      const phoneNumber = phone();
      const legacy = await user({
        email: address,
        emailVerifiedAt: new Date(),
        phoneNumber,
        fullName: 'Typed A Phone',
        passwordHash: await hashPassword('Legacy-Passw0rd!'),
      });

      const response = await signInByPhone(phoneNumber);
      expect(response.statusCode).toBe(200);
      expect(response.json().user).toMatchObject({ id: legacy.id, isPhoneVerified: true, profileComplete: true });
      expect(await prisma.user.count({ where: { OR: [{ phoneNumber }, { email: address }] } })).toBe(1);
    });
  });

  describe('a signed-in customer adds the other identifier', () => {
    it('link-phone needs a session', async () => {
      expect((await post('/link-phone', { phoneNumber: uniqueTestPhone(), otp: '000001' })).statusCode).toBe(401);
      expect((await post('/link-email', { email: uniqueTestEmail(), otp: '000001' })).statusCode).toBe(401);
    });

    it('e-mail first, then phone: the phone joins the same account and later phone sign-in reaches it', async () => {
      const address = email('link-email-first');
      const phoneNumber = phone();

      const signIn = await signInByEmail(address);
      remember(signIn);
      const { user: created, tokens } = signIn.json();
      const headers = { authorization: `Bearer ${tokens.accessToken}` };

      expect((await post('/phone/send-otp', { phoneNumber })).statusCode).toBe(200);
      const code = inbox.lastPhoneCode(phoneNumber);

      const wrong = await post('/link-phone', { phoneNumber, otp: wrongCode(code) }, headers);
      expect(wrong.statusCode).toBe(401);

      const linked = await post('/link-phone', { phoneNumber, otp: code }, headers);
      expect(linked.statusCode).toBe(200);
      expect(linked.json()).toMatchObject({
        success: true,
        message: 'Phone number linked successfully.',
        user: { id: created.id, email: address, phoneNumber, isPhoneVerified: true, isEmailVerified: true, missingProfileFields: ['fullName'] },
      });

      // The pending record that held the code is gone: the number exists once, on this account.
      expect(await prisma.user.findMany({ where: { phoneNumber }, select: { id: true } })).toEqual([{ id: created.id }]);

      // Signing in by phone afterwards reaches the SAME account, not a second one.
      await prisma.otpVerification.deleteMany({ where: { userId: created.id } });
      const byPhone = await signInByPhone(phoneNumber);
      expect(byPhone.json().user.id).toBe(created.id);
      expect(byPhone.json().isNewAccount).toBe(false);
    });

    it('phone first, then e-mail: the address joins the same account and later e-mail sign-in reaches it', async () => {
      const address = email('link-phone-first');
      const phoneNumber = phone();

      const signIn = await signInByPhone(phoneNumber);
      remember(signIn);
      const { user: created, tokens } = signIn.json();
      const headers = { authorization: `Bearer ${tokens.accessToken}` };

      expect((await post('/email/send-otp', { email: address })).statusCode).toBe(200);
      const linked = await post('/link-email', { email: address.toUpperCase(), otp: inbox.lastEmailCode(address) }, headers);
      expect(linked.statusCode).toBe(200);
      expect(linked.json()).toMatchObject({
        success: true,
        message: 'E-mail address linked successfully.',
        user: { id: created.id, email: address, phoneNumber, isEmailVerified: true },
      });
      expect(await prisma.user.findMany({ where: { email: address }, select: { id: true } })).toEqual([{ id: created.id }]);

      await prisma.otpVerification.deleteMany({ where: { userId: created.id } });
      const byEmail = await signInByEmail(address);
      expect(byEmail.json().user.id).toBe(created.id);
    });

    it('an identifier the account already holds unverified (old registration) is marked verified', async () => {
      const phoneNumber = phone();
      const legacy = await user({ email: email('link-own'), emailVerifiedAt: new Date(), phoneNumber, fullName: 'Own Phone' });
      const session = await createSessionFor(app, legacy);

      expect((await post('/phone/send-otp', { phoneNumber })).statusCode).toBe(200);
      const linked = await post('/link-phone', { phoneNumber, otp: inbox.lastPhoneCode(phoneNumber) }, session.headers);
      expect(linked.statusCode).toBe(200);
      expect(linked.json().user).toMatchObject({ id: legacy.id, isPhoneVerified: true, profileComplete: true });
    });

    it('an identifier verified on ANOTHER account is refused with 409 and neither account changes', async () => {
      const phoneNumber = phone();
      const other = await user({ phoneNumber, phoneVerifiedAt: new Date(), fullName: 'Other Account' });
      const me = await user({ email: email('link-conflict'), emailVerifiedAt: new Date(), fullName: 'Me' });
      const session = await createSessionFor(app, me);

      expect((await post('/phone/send-otp', { phoneNumber })).statusCode).toBe(200);
      const response = await post('/link-phone', { phoneNumber, otp: inbox.lastPhoneCode(phoneNumber) }, session.headers);
      expect(response.statusCode).toBe(409);
      expect(response.json().error).toMatchObject({ code: 'CONFLICT', message: expect.stringContaining('another account') });

      expect((await prisma.user.findUnique({ where: { id: other.id } }))!.phoneNumber).toBe(phoneNumber);
      expect((await prisma.user.findUnique({ where: { id: me.id } }))!.phoneNumber).toBeNull();
    });

    it('an e-mail address of another account is refused with 409 even when that account never verified it', async () => {
      const address = email('link-conflict-unverified');
      const other = await user({ email: address, fullName: 'Abandoned Registration', passwordHash: await hashPassword('Legacy-Passw0rd!') });
      const me = await user({ phoneNumber: phone(), phoneVerifiedAt: new Date(), fullName: 'Me' });
      const session = await createSessionFor(app, me);

      expect((await post('/email/send-otp', { email: address })).statusCode).toBe(200);
      const response = await post('/link-email', { email: address, otp: inbox.lastEmailCode(address) }, session.headers);
      expect(response.statusCode).toBe(409);

      // Never merged, never deleted.
      expect((await prisma.user.findUnique({ where: { id: other.id } }))!.email).toBe(address);
      expect((await prisma.user.findUnique({ where: { id: me.id } }))!.email).toBeNull();
    });

    it('a code for one identifier cannot link a different one', async () => {
      const me = await user({ phoneNumber: phone(), phoneVerifiedAt: new Date(), fullName: 'Me' });
      const session = await createSessionFor(app, me);
      const mine = email('link-mine');
      const victim = email('link-victim');

      expect((await post('/email/send-otp', { email: mine })).statusCode).toBe(200);
      const response = await post('/link-email', { email: victim, otp: inbox.lastEmailCode(mine) }, session.headers);
      expect(response.statusCode).toBe(401);
      expect((await prisma.user.findUnique({ where: { id: me.id } }))!.email).toBeNull();
    });

    it('a staff account cannot use the customer link endpoints', async () => {
      const staff = await user({ email: email('link-staff'), emailVerifiedAt: new Date(), role: 'ADMIN', passwordHash: await hashPassword('Staff-Passw0rd!') });
      const session = await createSessionFor(app, staff);
      const phoneNumber = phone();

      expect((await post('/phone/send-otp', { phoneNumber })).statusCode).toBe(200);
      const response = await post('/link-phone', { phoneNumber, otp: inbox.lastPhoneCode(phoneNumber) }, session.headers);
      expect(response.statusCode).toBe(403);
      expect((await prisma.user.findUnique({ where: { id: staff.id } }))!.phoneNumber).toBeNull();
    });
  });
});
