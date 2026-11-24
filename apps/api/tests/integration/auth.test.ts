import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { hashPassword } from '../../src/utils/hash';
import { invalidateAccountStatusCache } from '../../src/modules/auth/account-status';
import {
  clearOtpSendLimits,
  createSessionFor,
  createTestUser,
  deleteTestUsers,
  expireOtpCooldown,
  installOtpInbox,
  uniqueTestEmail,
  uniqueTestPhone,
  wrongCode,
} from '../helpers/auth-session';

/**
 * Customer sign-in by one-time code (integration, real test database).
 *
 * Customers sign in with a code sent to a phone number or an e-mail address; password and Google
 * sign-in are removed (410). Staff keep e-mail + password and are the only accounts that can use
 * forgot/reset password. Codes are read from in-memory messaging providers; nothing is sent.
 */
describe('Auth API: customer sign-in by one-time code (Integration)', () => {
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
  const post = (url: string, payload?: unknown, headers: Record<string, string> = {}) =>
    app.inject({ method: 'POST', url: `/api/v1/auth${url}`, payload: payload as object | undefined, headers });
  const track = async (where: { phoneNumber: string } | { email: string }) => {
    const user = await prisma.user.findFirst({ where });
    if (user && !createdUserIds.includes(user.id)) createdUserIds.push(user.id);
    return user;
  };

  beforeAll(async () => {
    inbox = installOtpInbox();
    app = buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    // Every request comes from 127.0.0.1; without this the per-IP send limit would stop the suite.
    await clearOtpSendLimits();
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { resource: { in: createdUserIds.map((id) => `User:${id}`) } } });
    await deleteTestUsers(createdUserIds);
    await clearOtpSendLimits(usedIdentifiers);
    inbox.uninstall();
    await app.close();
  });

  describe('sign-in by a code sent to a phone number', () => {
    const phoneNumber = phone();
    let accessToken: string;
    let refreshToken: string;
    let userId: string;

    it('send-otp sends the same code by SMS and WhatsApp and never returns it', async () => {
      const response = await post('/phone/send-otp', { phoneNumber: phoneNumber.replace('+91', '0') });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        success: true,
        message: 'Verification code sent to your phone number.',
        phoneNumber,
        expiresIn: 600,
      });

      const code = inbox.lastPhoneCode(phoneNumber);
      expect(inbox.whatsapp.sent.at(-1)).toMatchObject({ to: phoneNumber, variables: { 'templateVariable-otp-2': code } });
      expect(response.payload).not.toContain(code);

      // Nothing is an account yet: the number has only a pending record holding the hashed code.
      const pending = await track({ phoneNumber });
      expect(pending).toMatchObject({ phoneVerifiedAt: null, emailVerifiedAt: null, fullName: null, passwordHash: null });
      const stored = await prisma.otpVerification.findMany({ where: { userId: pending!.id } });
      expect(stored).toHaveLength(1);
      expect(stored[0].codeHash).not.toContain(code);
    });

    it('a second request within 60 seconds is refused and sends nothing', async () => {
      const before = inbox.sentTo(phoneNumber);
      const response = await post('/phone/send-otp', { phoneNumber });
      expect(response.statusCode).toBe(429);
      expect(response.json().error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(inbox.sentTo(phoneNumber)).toBe(before);
    });

    it('a wrong code is refused and creates no account', async () => {
      const response = await post('/phone/verify-otp', { phoneNumber, otp: wrongCode(inbox.lastPhoneCode(phoneNumber)) });
      expect(response.statusCode).toBe(401);
      expect(response.json().error).toMatchObject({
        code: 'AUTHENTICATION_ERROR',
        message: 'This code has expired or is invalid. Request a new one.',
      });
      expect((await prisma.user.findFirst({ where: { phoneNumber } }))!.phoneVerifiedAt).toBeNull();
    });

    it('a number that never asked for a code gets the same answer as a wrong code', async () => {
      const response = await post('/phone/verify-otp', { phoneNumber: uniqueTestPhone(), otp: '000001' });
      expect(response.statusCode).toBe(401);
      expect(response.json().error.message).toBe('This code has expired or is invalid. Request a new one.');
    });

    it('the right code creates the account and returns a session', async () => {
      const response = await post('/phone/verify-otp', {
        phoneNumber,
        otp: inbox.lastPhoneCode(phoneNumber),
        fullName: '  Asha Verma ',
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.isNewAccount).toBe(true);
      expect(body.user).toMatchObject({
        phoneNumber,
        email: null,
        fullName: 'Asha Verma',
        role: 'USER',
        isPhoneVerified: true,
        isEmailVerified: false,
        profileComplete: true,
        missingProfileFields: [],
      });
      expect(body.tokens.accessToken).toEqual(expect.any(String));
      expect(body.tokens.refreshToken).toEqual(expect.any(String));
      expect(body.tokens.expiresIn).toEqual(expect.any(String));
      accessToken = body.tokens.accessToken;
      refreshToken = body.tokens.refreshToken;
      userId = body.user.id;
    });

    it('a code works once', async () => {
      const response = await post('/phone/verify-otp', { phoneNumber, otp: inbox.lastPhoneCode(phoneNumber) });
      expect(response.statusCode).toBe(401);
    });

    it('signing in again reaches the same account and keeps its name', async () => {
      await expireOtpCooldown(userId);
      expect((await post('/phone/send-otp', { phoneNumber })).statusCode).toBe(200);
      // A verified number gets the "login" text with the first name.
      expect(inbox.sms.sent.at(-1)!.text).toMatch(/^Hello Asha, Your login OTP is \d{6}\./);

      const response = await post('/phone/verify-otp', {
        phoneNumber,
        otp: inbox.lastPhoneCode(phoneNumber),
        fullName: 'Someone Else',
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.isNewAccount).toBe(false);
      expect(body.user.id).toBe(userId);
      expect(body.user.fullName).toBe('Asha Verma');
      expect(await prisma.user.count({ where: { phoneNumber } })).toBe(1);
    });

    it('GET and PATCH /auth/me work with the session', async () => {
      const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { authorization: `Bearer ${accessToken}` } });
      expect(me.statusCode).toBe(200);
      expect(me.json()).toMatchObject({ id: userId, phoneNumber, profileComplete: true });

      const patched = await app.inject({
        method: 'PATCH',
        url: '/api/v1/auth/me',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { fullName: 'Asha V. Verma' },
      });
      expect(patched.statusCode).toBe(200);
      expect(patched.json().fullName).toBe('Asha V. Verma');

      expect((await app.inject({ method: 'GET', url: '/api/v1/auth/me' })).statusCode).toBe(401);
    });

    it('refresh rotates the refresh token and logout revokes it', async () => {
      const refreshed = await post('/refresh', { refreshToken });
      expect(refreshed.statusCode).toBe(200);
      const body = refreshed.json();
      expect(body.accessToken).toBeDefined();
      expect(body.tokens.refreshToken).toBe(body.refreshToken);
      expect(body.refreshToken).not.toBe(refreshToken);

      // The rotated-out token must no longer be usable.
      expect((await post('/refresh', { refreshToken })).statusCode).toBe(401);

      expect((await post('/logout', { refreshToken: body.refreshToken })).statusCode).toBe(200);
      expect((await post('/refresh', { refreshToken: body.refreshToken })).statusCode).toBe(401);
    });
  });

  describe('sign-in by a code sent to an e-mail address', () => {
    const address = email('otp-signin');
    let userId: string;

    it('send-otp e-mails the code; the answer is the same for an address with and without an account', async () => {
      const existing = await createTestUser({ email: email('otp-existing'), emailVerifiedAt: new Date(), fullName: 'Existing' });
      createdUserIds.push(existing.id);

      const fresh = await post('/email/send-otp', { email: `  ${address.toUpperCase()} ` });
      const known = await post('/email/send-otp', { email: existing.email });
      await track({ email: address });

      expect(fresh.statusCode).toBe(200);
      expect(known.statusCode).toBe(200);
      expect(fresh.json()).toEqual({
        success: true,
        message: 'Verification code sent to your e-mail address.',
        email: address,
        expiresIn: 600,
      });
      expect({ ...known.json(), email: '' }).toEqual({ ...fresh.json(), email: '' });

      const code = inbox.lastEmailCode(address);
      expect(fresh.payload).not.toContain(code);
      expect(inbox.sms.sent.filter((m) => m.text.includes(code))).toHaveLength(0);

      // Same cooldown answer for both, too.
      const freshAgain = await post('/email/send-otp', { email: address });
      const knownAgain = await post('/email/send-otp', { email: existing.email });
      expect(freshAgain.statusCode).toBe(429);
      expect(knownAgain.json().error.message).toBe(freshAgain.json().error.message);
    });

    it('rejects an invalid e-mail address', async () => {
      const response = await post('/email/send-otp', { email: 'not-an-address' });
      expect(response.statusCode).toBe(400);
    });

    it('a wrong code is refused; the right code creates the account and returns a session', async () => {
      const code = inbox.lastEmailCode(address);
      const wrong = await post('/email/verify-otp', { email: address, otp: wrongCode(code) });
      expect(wrong.statusCode).toBe(401);
      expect((await prisma.user.findFirst({ where: { email: address } }))!.emailVerifiedAt).toBeNull();

      const response = await post('/email/verify-otp', { email: address, otp: code });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.isNewAccount).toBe(true);
      expect(body.user).toMatchObject({
        email: address,
        phoneNumber: null,
        isEmailVerified: true,
        isPhoneVerified: false,
        // The backend still asks for a name and an OTP-verified phone number.
        profileComplete: false,
        missingProfileFields: ['fullName', 'phoneNumber'],
      });
      expect(body.user.emailVerifiedAt).not.toBeNull();
      expect(body.tokens.accessToken).toBeDefined();
      userId = body.user.id;

      const row = await prisma.user.findUnique({ where: { id: userId } });
      expect(row!.passwordHash).toBeNull();
      expect(row!.googleId).toBeNull();
    });

    it('five wrong attempts use the code up', async () => {
      await expireOtpCooldown(userId);
      expect((await post('/email/send-otp', { email: address })).statusCode).toBe(200);
      const code = inbox.lastEmailCode(address);
      for (let i = 0; i < 5; i += 1) {
        expect((await post('/email/verify-otp', { email: address, otp: wrongCode(code) })).statusCode).toBe(401);
      }
      expect((await post('/email/verify-otp', { email: address, otp: code })).statusCode).toBe(401);
    });

    it('an expired code is refused', async () => {
      await expireOtpCooldown(userId);
      expect((await post('/email/send-otp', { email: address })).statusCode).toBe(200);
      await prisma.otpVerification.updateMany({ where: { userId, usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await post('/email/verify-otp', { email: address, otp: inbox.lastEmailCode(address) })).statusCode).toBe(401);
    });

    it('sends are limited per address; asking again cannot reset the limit', async () => {
      const limited = email('otp-limit');
      let sent = 0;
      let refused = 0;
      for (let i = 0; i < 6; i += 1) {
        await clearOtpSendLimits(); // only the per-IP counter: this test is about the address
        const response = await post('/email/send-otp', { email: limited });
        const user = await track({ email: limited });
        await expireOtpCooldown(user!.id);
        if (response.statusCode === 200) sent += 1;
        else {
          expect(response.statusCode).toBe(429);
          expect(response.json().error.message).toBe('Too many verification code requests. Please try again later.');
          refused += 1;
        }
      }
      expect(sent).toBe(3);
      expect(refused).toBe(3);
      expect(inbox.sentTo(limited)).toBe(3);
    });
  });

  describe('a blocked account', () => {
    it('gets a code like anyone else and is refused at verification, with its sessions revoked', async () => {
      const address = email('otp-blocked');
      const user = await createTestUser({ email: address, emailVerifiedAt: new Date(), fullName: 'Blocked' });
      createdUserIds.push(user.id);
      const session = await createSessionFor(app, user);
      await prisma.auditLog.create({
        data: { adminId: 'test-admin', adminEmail: 'admin@example.test', action: 'USER_SUSPENDED', resource: `User:${user.id}` },
      });
      invalidateAccountStatusCache(user.id);

      expect((await post('/email/send-otp', { email: address })).statusCode).toBe(200);
      const code = inbox.lastEmailCode(address);

      const wrong = await post('/email/verify-otp', { email: address, otp: wrongCode(code) });
      expect(wrong.statusCode).toBe(401);

      const response = await post('/email/verify-otp', { email: address, otp: code });
      expect(response.statusCode).toBe(403);
      expect(response.json().error).toMatchObject({ code: 'AUTHORIZATION_ERROR', message: 'This account is blocked. Please contact support.' });
      expect(response.json().tokens).toBeUndefined();
      expect((await post('/refresh', { refreshToken: session.refreshToken })).statusCode).not.toBe(200);
    });
  });

  describe('password and Google sign-in are removed for customers', () => {
    const removed: Array<[string, unknown]> = [
      ['/register', { email: 'old-build@example.test', password: 'Password123!', fullName: 'Old Build' }],
      ['/login', { email: 'old-build@example.test', password: 'Password123!' }],
      ['/verify-email', { email: 'old-build@example.test', otp: '123456' }],
      ['/resend-verification', { email: 'old-build@example.test' }],
      ['/google', { idToken: 'test-google-token-old-build' }],
      ['/link-google', { idToken: 'test-google-token-old-build' }],
    ];

    it.each(removed)('POST /auth%s answers 410 AUTH_METHOD_REMOVED with a readable message', async (url, payload) => {
      for (const body of [payload, {}, undefined]) {
        const response = await post(url, body);
        expect(response.statusCode).toBe(410);
        const parsed = response.json();
        expect(parsed).toEqual({
          error: { code: 'AUTH_METHOD_REMOVED', message: expect.stringContaining('one-time code'), requestId: expect.any(String) },
        });
        expect(parsed.error.message).toContain('update the app');
      }
    });

    it('nothing is created or stored by the removed endpoints', async () => {
      expect(await prisma.user.count({ where: { email: 'old-build@example.test' } })).toBe(0);
      expect(await prisma.user.count({ where: { email: 'old-build@gmail.com' } })).toBe(0);
    });
  });

  describe('forgot / reset password is for staff accounts only', () => {
    const staffEmail = email('otp-staff');
    const customerEmail = email('otp-customer-reset');
    const unknownEmail = email('otp-nobody');
    const newPassword = 'N3w-Staff-Passw0rd!';
    let staffId: string;
    let customerId: string;
    let customerHash: string;

    beforeAll(async () => {
      const staff = await createTestUser({
        email: staffEmail,
        emailVerifiedAt: new Date(),
        fullName: 'Staff Member',
        role: 'ADMIN',
        passwordHash: await hashPassword('Old-Staff-Passw0rd!'),
      });
      customerHash = await hashPassword('Old-Customer-Passw0rd!');
      const customer = await createTestUser({
        email: customerEmail,
        emailVerifiedAt: new Date(),
        fullName: 'Old Password Customer',
        passwordHash: customerHash,
      });
      staffId = staff.id;
      customerId = customer.id;
      createdUserIds.push(staffId, customerId);
    });

    it('forgot-password answers identically for a staff, a customer and an unknown address, and e-mails only the staff address', async () => {
      const staff = await post('/forgot-password', { email: staffEmail });
      const customer = await post('/forgot-password', { email: customerEmail });
      const unknown = await post('/forgot-password', { email: unknownEmail });

      expect(staff.statusCode).toBe(200);
      expect(customer.statusCode).toBe(200);
      expect(unknown.statusCode).toBe(200);
      expect(customer.json()).toEqual(staff.json());
      expect(unknown.json()).toEqual(staff.json());
      expect(staff.json().message).toContain('staff account');

      expect(inbox.sentTo(staffEmail)).toBe(1);
      expect(inbox.sentTo(customerEmail)).toBe(0);
      expect(inbox.sentTo(unknownEmail)).toBe(0);
      expect(await prisma.otpVerification.count({ where: { userId: customerId } })).toBe(0);
      expect(await prisma.user.count({ where: { email: unknownEmail } })).toBe(0);
    });

    it('reset-password refuses a customer and an unknown address exactly like a wrong staff code', async () => {
      const code = inbox.lastEmailCode(staffEmail);
      const wrongStaff = await post('/reset-password', { email: staffEmail, otp: wrongCode(code), newPassword });
      const customer = await post('/reset-password', { email: customerEmail, otp: code, newPassword });
      const unknown = await post('/reset-password', { email: unknownEmail, otp: code, newPassword });

      expect(wrongStaff.statusCode).toBe(401);
      for (const response of [customer, unknown]) {
        expect(response.statusCode).toBe(401);
        expect({ ...response.json().error, requestId: '' }).toEqual({ ...wrongStaff.json().error, requestId: '' });
      }
      // The customer's old password hash is left exactly as it was: unused, not replaced.
      expect((await prisma.user.findUnique({ where: { id: customerId } }))!.passwordHash).toBe(customerHash);
    });

    it('a staff member resets the password with the e-mailed code and signs in at the admin login', async () => {
      const response = await post('/reset-password', { email: staffEmail, otp: inbox.lastEmailCode(staffEmail), newPassword });
      expect(response.statusCode).toBe(200);

      const oldLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: { email: staffEmail, password: 'Old-Staff-Passw0rd!' },
      });
      expect(oldLogin.statusCode).toBe(401);

      const login = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: { email: staffEmail, password: newPassword },
      });
      expect(login.statusCode).toBe(200);
      await prisma.auditLog.deleteMany({ where: { adminId: staffId } });
    });

    it('a customer with an old password cannot sign in at the admin login either', async () => {
      const login = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: { email: customerEmail, password: 'Old-Customer-Passw0rd!' },
      });
      expect(login.statusCode).toBe(403);
    });

    it('a staff account cannot sign in with a one-time code', async () => {
      const send = await post('/email/send-otp', { email: staffEmail });
      expect(send.statusCode).toBe(200);
      expect(send.json().message).toBe('Verification code sent to your e-mail address.');

      const response = await post('/email/verify-otp', { email: staffEmail, otp: inbox.lastEmailCode(staffEmail) });
      expect(response.statusCode).toBe(403);
      expect(response.json().error.message).toContain('staff account');
      expect(response.json().tokens).toBeUndefined();
    });
  });
});
