/**
 * Blocked (suspended or deleted) accounts: one check for the login paths, token refresh and every
 * authenticated request, with a short per-user cache.
 * prisma, the suspension lookup, OTP storage and delivery and refresh-token storage are
 * substituted; nothing leaves the process.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

interface TestUser {
  id: string;
  role: string;
  email: string | null;
  phoneNumber: string | null;
  googleId: string | null;
  fullName: string | null;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
}

const h = vi.hoisted(() => {
  const state = {
    users: [] as TestUser[],
    blocked: new Set<string>(),
    lookupFails: false,
    validOtp: '123456',
    staffUserIds: new Set<string>(),
    savedTokens: [] as Array<{ userId: string; token: string }>,
  };
  const matches = (u: TestUser, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) => (u as unknown as Record<string, unknown>)[key] === value);
  const prisma = {
    user: {
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => state.users.find((u) => matches(u, where)) ?? null),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.users.find((u) => u.id === where.id) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<TestUser> }) => {
        const user = state.users.find((u) => u.id === where.id) as TestUser;
        Object.assign(user, data);
        return user;
      }),
      create: vi.fn(async ({ data }: { data: Partial<TestUser> }) => {
        const user = { id: `new-${state.users.length + 1}`, role: 'USER', email: null, phoneNumber: null, googleId: null, fullName: null, passwordHash: null, emailVerifiedAt: null, phoneVerifiedAt: null, ...data } as TestUser;
        state.users.push(user);
        return user;
      }),
    },
    staffProfile: {
      findUnique: vi.fn(async ({ where }: { where: { userId: string } }) => (state.staffUserIds.has(where.userId) ? { isDeleted: false } : null)),
    },
    refreshToken: { updateMany: vi.fn(async () => ({ count: 1 })) },
    birthProfile: { findFirst: vi.fn(async () => null), create: vi.fn() },
  };
  return {
    state,
    prisma,
    isUserSuspended: vi.fn(async (userId: string) => {
      if (state.lookupFails) throw new Error('database unavailable');
      return state.blocked.has(userId);
    }),
    deliverOtp: vi.fn(async () => ({ delivered: true })),
    deliverEmailOtp: vi.fn(async () => ({ ok: true })),
    createOtpRecord: vi.fn(async () => undefined),
    saveRefreshToken: vi.fn(async (userId: string, token: string) => {
      state.savedTokens.push({ userId, token });
    }),
    rotateRefreshToken: vi.fn(async (raw: string) => ({ userId: raw.replace('refresh-of-', ''), newRawRefreshToken: 'rotated-token' })),
  };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: h.prisma }));
vi.mock('../../src/services/feature-access.service', () => ({ featureAccessService: { isUserSuspended: h.isUserSuspended } }));
vi.mock('../../src/utils/hash', () => ({
  hashPassword: vi.fn(async (password: string) => `hash:${password}`),
  verifyPassword: vi.fn(async (password: string, hash: string) => hash === `hash:${password}`),
}));
vi.mock('../../src/modules/auth/otp.service', () => ({
  otpService: {
    generateOtp: () => h.state.validOtp,
    createOtpRecord: h.createOtpRecord,
    isWithinResendCooldown: vi.fn(async () => false),
    verifyOtp: vi.fn(async (_userId: string, otp: string) => otp === h.state.validOtp),
    invalidatePreviousOtps: vi.fn(),
    isDevMasterOtpEnabled: () => false,
    hashOtp: (otp: string) => `otp:${otp}`,
  },
}));
vi.mock('../../src/services/messaging/otp-delivery.service', () => ({
  otpDeliveryService: { sendPhoneOtp: h.deliverOtp, sendEmailOtp: h.deliverEmailOtp },
  otpSendLimiter: { consume: vi.fn(async () => ({ allowed: true })), release: vi.fn() },
}));
vi.mock('../../src/services/email.service', () => ({
  emailService: { sendVerificationEmail: vi.fn(), sendPasswordResetEmail: vi.fn() },
}));
vi.mock('../../src/services/token.service', () => ({
  TokenService: {
    generateRawRefreshToken: () => 'raw-refresh-token',
    saveRefreshToken: h.saveRefreshToken,
    rotateRefreshToken: h.rotateRefreshToken,
    revokeRefreshToken: vi.fn(),
  },
}));

import { AuthService } from '../../src/modules/auth/auth.service';
import {
  ACCOUNT_BLOCKED_MESSAGE,
  ACCOUNT_STATUS_CACHE_TTL_MS,
  assertAccountActive,
  invalidateAccountStatusCache,
  isAccountBlocked,
} from '../../src/modules/auth/account-status';
import { forgetCustomerBlockState, isCustomerBlocked } from '../../src/modules/products/shop-http';
import { registerJwt } from '../../src/plugins/jwt';
import { globalErrorHandler } from '../../src/errors/error-handler';

const { state, prisma } = h;
const PHONE = '+919876543210';
const EMAIL = 'asha@example.test';
const signJwt = (payload: object) => `jwt:${JSON.stringify(payload)}`;

function user(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: 'u1', role: 'USER', email: 'asha@example.test', phoneNumber: PHONE, googleId: null, fullName: 'Asha',
    passwordHash: 'hash:correct-password', emailVerifiedAt: new Date('2026-01-01T00:00:00Z'), phoneVerifiedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

const BLOCKED_ERROR = { statusCode: 403, code: 'AUTHORIZATION_ERROR', message: ACCOUNT_BLOCKED_MESSAGE };

let auth: AuthService;

beforeEach(() => {
  vi.clearAllMocks();
  state.users = [user()];
  state.blocked = new Set();
  state.lookupFails = false;
  state.savedTokens = [];
  state.staffUserIds = new Set();
  invalidateAccountStatusCache();
  auth = new AuthService();
});

describe('login paths refuse a blocked account', () => {
  it('OTP send answers a blocked account exactly as any other account, and still sends the code', async () => {
    const normal = await auth.sendPhoneOtp({ phoneNumber: PHONE });
    state.blocked.add('u1');
    const blocked = await auth.sendPhoneOtp({ phoneNumber: PHONE });

    expect(blocked).toEqual(normal);
    expect(h.deliverOtp).toHaveBeenCalledTimes(2);
    expect(h.deliverOtp.mock.calls[1]).toEqual(h.deliverOtp.mock.calls[0]);
    // The send path never looks the status up, so it cannot differ in outcome.
    expect(h.isUserSuspended).not.toHaveBeenCalled();
  });

  it('a wrong code gets the same 401 whether or not the account is blocked', async () => {
    const wrong = { phoneNumber: PHONE, otp: '000000' };
    const unblocked = await auth.verifyPhoneOtp(wrong, signJwt).catch((e) => e);
    state.blocked.add('u1');
    const blocked = await auth.verifyPhoneOtp(wrong, signJwt).catch((e) => e);

    expect(blocked).toMatchObject({ statusCode: 401, code: 'AUTHENTICATION_ERROR' });
    expect(blocked.message).toBe(unblocked.message);
    expect(h.isUserSuspended).not.toHaveBeenCalled();
  });

  it('a valid code for a blocked account is refused: no session, nothing written, sessions revoked', async () => {
    state.blocked.add('u1');
    await expect(auth.verifyPhoneOtp({ phoneNumber: PHONE, otp: state.validOtp }, signJwt)).rejects.toMatchObject(BLOCKED_ERROR);

    expect(state.savedTokens).toEqual([]);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('a valid code for an active account still signs in', async () => {
    const result = await auth.verifyPhoneOtp({ phoneNumber: PHONE, otp: state.validOtp }, signJwt);
    expect(result.tokens.accessToken).toBe(signJwt({ sub: 'u1', role: 'USER' }));
    expect(state.savedTokens).toEqual([{ userId: 'u1', token: 'raw-refresh-token' }]);
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it('e-mail OTP send answers a blocked account exactly as any other account, and still sends the code', async () => {
    const normal = await auth.sendEmailOtp({ email: EMAIL });
    state.blocked.add('u1');
    const blocked = await auth.sendEmailOtp({ email: EMAIL });

    expect(blocked).toEqual(normal);
    expect(h.deliverEmailOtp).toHaveBeenCalledTimes(2);
    expect(h.isUserSuspended).not.toHaveBeenCalled();
  });

  it('e-mail OTP: a wrong code is a 401 for a blocked account too; the right one is refused with 403', async () => {
    state.blocked.add('u1');
    await expect(auth.verifyEmailOtp({ email: EMAIL, otp: '000000' }, signJwt)).rejects.toMatchObject({
      statusCode: 401,
      message: 'This code has expired or is invalid. Request a new one.',
    });
    expect(h.isUserSuspended).not.toHaveBeenCalled();

    await expect(auth.verifyEmailOtp({ email: EMAIL, otp: state.validOtp }, signJwt)).rejects.toMatchObject(BLOCKED_ERROR);
    expect(state.savedTokens).toEqual([]);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('e-mail OTP of an active account signs in, whatever the account was created with', async () => {
    state.users = [user({ googleId: 'g-1', phoneNumber: null, phoneVerifiedAt: null })];
    const result = await auth.verifyEmailOtp({ email: EMAIL, otp: state.validOtp }, signJwt);
    expect(result).toMatchObject({ isNewAccount: false, user: { id: 'u1', googleId: 'g-1' }, tokens: { refreshToken: 'raw-refresh-token' } });
    // The old credentials are left exactly as they were.
    expect(state.users[0].passwordHash).toBe('hash:correct-password');
    expect(state.users[0].googleId).toBe('g-1');
  });

  it('an unknown identifier gets the same 401 as a wrong code, on both channels', async () => {
    const wrong = await auth.verifyEmailOtp({ email: EMAIL, otp: '000000' }, signJwt).catch((e) => e);
    const unknownEmail = await auth.verifyEmailOtp({ email: 'nobody@example.test', otp: '000000' }, signJwt).catch((e) => e);
    const unknownPhone = await auth.verifyPhoneOtp({ phoneNumber: '+919800000000', otp: '000000' }, signJwt).catch((e) => e);
    for (const answer of [unknownEmail, unknownPhone]) {
      expect(answer).toMatchObject({ statusCode: 401, code: 'AUTHENTICATION_ERROR', message: wrong.message });
    }
  });

  it('a staff account is refused a customer OTP session on both channels, only after a valid code', async () => {
    state.users = [user({ role: 'ADMIN' })];
    await expect(auth.verifyPhoneOtp({ phoneNumber: PHONE, otp: '000000' }, signJwt)).rejects.toMatchObject({ statusCode: 401 });
    for (const attempt of [
      () => auth.verifyPhoneOtp({ phoneNumber: PHONE, otp: state.validOtp }, signJwt),
      () => auth.verifyEmailOtp({ email: EMAIL, otp: state.validOtp }, signJwt),
    ]) {
      await expect(attempt()).rejects.toMatchObject({ statusCode: 403, message: expect.stringContaining('staff account') });
    }
    expect(state.savedTokens).toEqual([]);

    // A suspended staff account has role USER but keeps its staff profile: still refused.
    state.users = [user({ role: 'USER' })];
    state.staffUserIds.add('u1');
    await expect(auth.verifyEmailOtp({ email: EMAIL, otp: state.validOtp }, signJwt)).rejects.toMatchObject({ statusCode: 403 });
    expect(state.savedTokens).toEqual([]);
  });

  it('token refresh is refused and the freshly rotated token is revoked with the rest', async () => {
    state.blocked.add('u1');
    await expect(auth.refresh('refresh-of-u1', signJwt)).rejects.toMatchObject(BLOCKED_ERROR);

    expect(h.rotateRefreshToken).toHaveBeenCalledTimes(1);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    // The revocation happens after the rotation, so it covers the token the rotation issued.
    expect(prisma.refreshToken.updateMany.mock.invocationCallOrder[0]).toBeGreaterThan(h.rotateRefreshToken.mock.invocationCallOrder[0]);
  });

  it('token refresh of an active account still works', async () => {
    const result = await auth.refresh('refresh-of-u1', signJwt);
    expect(result).toMatchObject({ accessToken: signJwt({ sub: 'u1', role: 'USER' }), refreshToken: 'rotated-token' });
  });

  it('login reads the status from the database even when a cached "not blocked" exists', async () => {
    expect(await isAccountBlocked('u1')).toBe(false);
    state.blocked.add('u1'); // blocked by another API instance: this process was not told
    await expect(auth.verifyEmailOtp({ email: EMAIL, otp: state.validOtp }, signJwt)).rejects.toMatchObject(BLOCKED_ERROR);
    // ...and the fresh answer replaces the cached one.
    expect(await isAccountBlocked('u1')).toBe(true);
    expect(h.isUserSuspended).toHaveBeenCalledTimes(2);
  });
});

describe('account status cache', () => {
  it('asks the database once per user within the TTL and again after it', async () => {
    const t0 = 1_000_000;
    expect(await isAccountBlocked('u1', { now: t0 })).toBe(false);
    expect(await isAccountBlocked('u1', { now: t0 + ACCOUNT_STATUS_CACHE_TTL_MS - 1 })).toBe(false);
    expect(h.isUserSuspended).toHaveBeenCalledTimes(1);

    state.blocked.add('u1');
    expect(await isAccountBlocked('u1', { now: t0 + ACCOUNT_STATUS_CACHE_TTL_MS })).toBe(true);
    expect(h.isUserSuspended).toHaveBeenCalledTimes(2);
  });

  it('keeps users apart', async () => {
    state.blocked.add('u2');
    expect(await isAccountBlocked('u1')).toBe(false);
    expect(await isAccountBlocked('u2')).toBe(true);
    expect(await isAccountBlocked('u1')).toBe(false);
    expect(h.isUserSuspended).toHaveBeenCalledTimes(2);
  });

  it('a block, an unblock and a deletion take effect at once after invalidation', async () => {
    expect(await isAccountBlocked('u1')).toBe(false);
    state.blocked.add('u1');
    expect(await isAccountBlocked('u1')).toBe(false); // still the cached answer
    invalidateAccountStatusCache('u1');
    expect(await isAccountBlocked('u1')).toBe(true);

    state.blocked.delete('u1');
    invalidateAccountStatusCache('u1');
    expect(await isAccountBlocked('u1')).toBe(false);
  });

  it('is the cache the customers module already clears (forgetCustomerBlockState) and the shop check reads', async () => {
    expect(await isCustomerBlocked('u1')).toBe(false);
    expect(await isAccountBlocked('u1')).toBe(false);
    expect(h.isUserSuspended).toHaveBeenCalledTimes(1);

    state.blocked.add('u1');
    forgetCustomerBlockState('u1');
    expect(await isAccountBlocked('u1')).toBe(true);
    expect(await isCustomerBlocked('u1')).toBe(true);
    expect(h.isUserSuspended).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed lookup and does not treat it as "not blocked"', async () => {
    state.lookupFails = true;
    await expect(assertAccountActive('u1')).rejects.toThrow('database unavailable');
    state.lookupFails = false;
    await expect(assertAccountActive('u1')).resolves.toBeUndefined();
  });
});

describe('fastify.authenticate refuses a blocked account on every request', () => {
  let app: FastifyInstance;
  let customerToken: string;
  let staffToken: string;

  beforeAll(async () => {
    app = Fastify();
    app.setErrorHandler(globalErrorHandler);
    await app.register(registerJwt);
    app.get('/me', { onRequest: [app.authenticate] }, async (request) => ({ id: request.user.id }));
    app.get('/admin-only', { onRequest: [app.authenticate, app.authorize(['ADMIN'])] }, async (request) => ({ id: request.user.id }));
    app.get('/public', { onRequest: [app.authenticateOptional] }, async (request) => ({ id: request.user?.id ?? null }));
    await app.ready();
    customerToken = app.jwt.sign({ sub: 'u1', role: 'USER' });
    staffToken = app.jwt.sign({ sub: 'staff-1', role: 'ADMIN' });
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (url: string, token?: string) =>
    app.inject({ method: 'GET', url, headers: token ? { authorization: `Bearer ${token}` } : {} });

  it('an active customer passes, and repeated requests cost one status lookup', async () => {
    for (let i = 0; i < 5; i += 1) {
      const response = await get('/me', customerToken);
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ id: 'u1' });
    }
    expect(h.isUserSuspended).toHaveBeenCalledTimes(1);
  });

  it('a blocked customer with a still-valid access token gets the standard 403 error', async () => {
    expect((await get('/me', customerToken)).statusCode).toBe(200);

    state.blocked.add('u1');
    invalidateAccountStatusCache('u1'); // what blocking does on this instance
    const response = await get('/me', customerToken);

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: { code: 'AUTHORIZATION_ERROR', message: ACCOUNT_BLOCKED_MESSAGE, requestId: expect.any(String) },
    });
  });

  it('without invalidation (blocked from another instance) the token stops working once the TTL has passed', async () => {
    const start = Date.now(); // the token was signed just now; only the cache's clock needs moving
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date(start));
      expect((await get('/me', customerToken)).statusCode).toBe(200);
      state.blocked.add('u1');
      vi.setSystemTime(new Date(Date.now() + ACCOUNT_STATUS_CACHE_TTL_MS - 1));
      expect((await get('/me', customerToken)).statusCode).toBe(200);
      vi.setSystemTime(new Date(Date.now() + 1));
      expect((await get('/me', customerToken)).statusCode).toBe(403);
    } finally {
      vi.useRealTimers();
    }
  });

  it('unblocking lets the same token work again', async () => {
    state.blocked.add('u1');
    expect((await get('/me', customerToken)).statusCode).toBe(403);
    state.blocked.delete('u1');
    invalidateAccountStatusCache('u1');
    expect((await get('/me', customerToken)).statusCode).toBe(200);
  });

  it('a missing or invalid token is still a 401 and causes no status lookup', async () => {
    expect((await get('/me')).statusCode).toBe(401);
    expect((await get('/me', 'not-a-token')).statusCode).toBe(401);
    expect(h.isUserSuspended).not.toHaveBeenCalled();
  });

  it('fails closed: when the status cannot be read the request is not served', async () => {
    state.lookupFails = true;
    const response = await get('/me', customerToken);
    expect(response.statusCode).toBeGreaterThanOrEqual(500);
    expect(response.json()).not.toHaveProperty('id');
    expect(response.json().error.code).toBe('INTERNAL_ERROR');
  });

  it('staff tokens keep working, and a suspended staff account is refused like any other', async () => {
    expect((await get('/admin-only', staffToken)).statusCode).toBe(200);
    state.blocked.add('staff-1');
    invalidateAccountStatusCache('staff-1');
    expect((await get('/admin-only', staffToken)).statusCode).toBe(403);
  });

  it('optional authentication: anonymous passes, a blocked account presenting its token is refused', async () => {
    expect((await get('/public')).json()).toEqual({ id: null });
    expect((await get('/public', customerToken)).json()).toEqual({ id: 'u1' });
    expect((await get('/public', 'not-a-token')).statusCode).toBe(200);

    state.blocked.add('u1');
    invalidateAccountStatusCache('u1');
    expect((await get('/public', customerToken)).statusCode).toBe(403);
    expect((await get('/public')).statusCode).toBe(200);
  });
});
