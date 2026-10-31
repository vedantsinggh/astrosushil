import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { otpService } from '../../src/modules/auth/otp.service';
import { googleAuthService } from '../../src/modules/auth/google-auth.service';
import { AuthenticationError } from '../../src/errors/app-error';

describe('Phone OTP, Google Auth, Account Linking & Multi-Page PDF Tests', () => {
  let app: FastifyInstance;

  // In-memory data store for tests
  const usersDb = new Map<string, any>();
  const refreshTokensDb = new Map<string, any>();
  const otpDb = new Map<string, any>();

  beforeAll(async () => {
    process.env.NODE_ENV = 'development';
    process.env.DEV_OTP = '123456';

    // Mock Prisma User methods
    (vi.spyOn(prisma.user, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      if (where.id) return usersDb.get(where.id) || null;
      if (where.phoneNumber) {
        return Array.from(usersDb.values()).find((u) => u.phoneNumber === where.phoneNumber) || null;
      }
      if (where.googleId) {
        return Array.from(usersDb.values()).find((u) => u.googleId === where.googleId) || null;
      }
      if (where.email) {
        return Array.from(usersDb.values()).find((u) => u.email === where.email) || null;
      }
      return null;
    });

    (vi.spyOn(prisma.user, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      if (where.phoneNumber) {
        return Array.from(usersDb.values()).find((u) => u.phoneNumber === where.phoneNumber) || null;
      }
      if (where.email) {
        return Array.from(usersDb.values()).find((u) => u.email === where.email) || null;
      }
      if (where.googleId) {
        return Array.from(usersDb.values()).find((u) => u.googleId === where.googleId) || null;
      }
      return null;
    });

    (vi.spyOn(prisma.user, 'create') as any).mockImplementation(async ({ data }: any) => {
      const id = data.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newUser = {
        id,
        email: data.email || null,
        phoneNumber: data.phoneNumber || null,
        phoneVerifiedAt: data.phoneVerifiedAt || null,
        googleId: data.googleId || null,
        passwordHash: data.passwordHash || null,
        role: data.role || 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      usersDb.set(id, newUser);
      return newUser;
    });

    (vi.spyOn(prisma.user, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const user = usersDb.get(where.id);
      if (!user) throw new Error('User not found');
      const updated = { ...user, ...data, updatedAt: new Date() };
      usersDb.set(where.id, updated);
      return updated;
    });

    (vi.spyOn(prisma.user, 'delete') as any).mockImplementation(async ({ where }: any) => {
      const user = usersDb.get(where.id);
      if (user) usersDb.delete(where.id);
      return user;
    });

    // Mock Prisma RefreshToken methods
    (vi.spyOn(prisma.refreshToken, 'create') as any).mockImplementation(async ({ data }: any) => {
      const id = `token-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToken = {
        id,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      refreshTokensDb.set(data.tokenHash, newToken);
      return newToken;
    });

    (vi.spyOn(prisma.refreshToken, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      if (where.tokenHash) {
        return refreshTokensDb.get(where.tokenHash) || null;
      }
      return null;
    });

    (vi.spyOn(prisma.refreshToken, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      for (const [key, tokenRecord] of refreshTokensDb.entries()) {
        if (tokenRecord.id === where.id) {
          const updated = { ...tokenRecord, ...data };
          refreshTokensDb.set(key, updated);
          return updated;
        }
      }
      throw new Error('Token not found');
    });

    // Mock Prisma OtpVerification methods
    (vi.spyOn(prisma.otpVerification, 'create') as any).mockImplementation(async ({ data }: any) => {
      const id = `otp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const record = {
        id,
        userId: data.userId,
        codeHash: data.codeHash,
        purpose: data.purpose,
        expiresAt: data.expiresAt,
        attempts: data.attempts || 0,
        usedAt: null,
        createdAt: new Date(),
      };
      otpDb.set(id, record);
      return record;
    });

    (vi.spyOn(prisma.otpVerification, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      const records = Array.from(otpDb.values()).filter((r) => {
        if (where.userId && r.userId !== where.userId) return false;
        if (where.purpose && r.purpose !== where.purpose) return false;
        if (where.usedAt === null && r.usedAt !== null) return false;
        if (where.expiresAt?.gt && r.expiresAt <= where.expiresAt.gt) return false;
        return true;
      });
      // Sort desc by createdAt
      records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return records[0] || null;
    });

    (vi.spyOn(prisma.otpVerification, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const record = otpDb.get(where.id);
      if (!record) throw new Error('OTP record not found');
      const updated = { ...record, ...data };
      otpDb.set(where.id, updated);
      return updated;
    });

    (vi.spyOn(prisma.otpVerification, 'updateMany') as any).mockImplementation(async ({ where, data }: any) => {
      let count = 0;
      for (const [id, r] of otpDb.entries()) {
        if (where.userId && r.userId !== where.userId) continue;
        if (where.purpose && r.purpose !== where.purpose) continue;
        if (where.usedAt === null && r.usedAt !== null) continue;
        otpDb.set(id, { ...r, ...data });
        count++;
      }
      return { count };
    });

    // Mock Google verification
    vi.spyOn(googleAuthService, 'verifyGoogleToken').mockImplementation(async (token: string) => {
      if (token === 'invalid-token') {
        throw new AuthenticationError('Invalid Google credential token');
      }
      if (token === 'google-token-user-b') {
        return {
          googleId: 'google-sub-user-b',
          email: 'user.b@gmail.com',
          emailVerified: true,
          fullName: 'User B',
        };
      }
      return {
        googleId: 'google-sub-1234567890',
        email: 'astrosushil.client@gmail.com',
        emailVerified: true,
        fullName: 'Sushil Client',
      };
    });

    app = buildApp();
    await app.ready();
  });

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.DEV_OTP = '123456';
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  describe('1. Phone Number Authentication Flow', () => {
    const testPhone = '+919876543210';

    it('should request OTP for valid E.164 phone number', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/phone/send-otp',
        payload: { phoneNumber: testPhone },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('Verification code sent');
      expect(body.expiresIn).toBe(600);
      // Ensure OTP is never exposed in response
      expect(body.otp).toBeUndefined();
    });

    it('should reject OTP request with invalid phone format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/phone/send-otp',
        payload: { phoneNumber: 'invalid-number' },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBeDefined();
    });

    it('should enforce cooldown if OTP requested too quickly', async () => {
      // Immediate resend within 60s
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/phone/send-otp',
        payload: { phoneNumber: testPhone },
      });

      expect(res.statusCode).toBe(429);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toMatch(/RATE_LIMIT/);
    });

    it('should verify OTP successfully in development with DEV_OTP', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/phone/verify-otp',
        payload: {
          phoneNumber: testPhone,
          otp: '123456',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.user).toBeDefined();
      expect(body.user.phoneNumber).toBe(testPhone);
      expect(body.tokens.accessToken).toBeDefined();
      expect(body.tokens.refreshToken).toBeDefined();
    });

    it('should CATEGORICALLY REJECT DEV_OTP in production environment', async () => {
      const prodPhone = '+919999988888';

      // 1. Generate OTP in normal dev mode so user & OTP record exist
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/phone/send-otp',
        payload: { phoneNumber: prodPhone },
      });

      // 2. Switch environment explicitly to production
      process.env.NODE_ENV = 'production';
      process.env.DEV_OTP = '123456';

      // Attempt to verify using DEV_OTP in production
      const isDevValid = (otpService as any).isDevMasterOtp('123456');
      expect(isDevValid).toBe(false);

      const verifyRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/phone/verify-otp',
        payload: {
          phoneNumber: prodPhone,
          otp: '123456',
        },
      });

      expect(verifyRes.statusCode).toBe(401);
      const body = JSON.parse(verifyRes.payload);
      expect(body.error.code).toBe('AUTHENTICATION_ERROR');

      process.env.NODE_ENV = 'development';
    });

    it('should reject invalid OTP code', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/phone/verify-otp',
        payload: {
          phoneNumber: testPhone,
          otp: '000000',
        },
      });

      expect(res.statusCode).toBe(401);
    });

    it('should normalize different phone number formats to canonical E.164', async () => {
      const formattedInput = ' 09811122233 '; // Leading 0 with spaces
      const canonicalPhone = '+919811122233';

      // Request fresh OTP
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/phone/send-otp',
        payload: { phoneNumber: formattedInput },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/phone/verify-otp',
        payload: {
          phoneNumber: formattedInput,
          otp: '123456',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.user.phoneNumber).toBe(canonicalPhone);
    });
  });

  describe('2. Google Sign-In Flow', () => {
    it('should create new account on first-time Google sign-in', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/google',
        payload: { idToken: 'valid-google-id-token' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.user).toBeDefined();
      expect(body.user.googleId).toBe('google-sub-1234567890');
      expect(body.user.email).toBe('astrosushil.client@gmail.com');
      expect(body.tokens.accessToken).toBeDefined();
    });

    it('should sign in existing user on subsequent Google sign-in without duplicate user', async () => {
      const initialUserCount = usersDb.size;

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/google',
        payload: { idToken: 'valid-google-id-token' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.user.googleId).toBe('google-sub-1234567890');
      expect(usersDb.size).toBe(initialUserCount);
    });

    it('should reject invalid Google credential token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/google',
        payload: { idToken: 'invalid-token' },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('3. Account Linking Flow', () => {
    let userToken: string;
    const phoneToLink = '+919123456789';

    beforeAll(async () => {
      // Login as Google user
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/google',
        payload: { idToken: 'valid-google-id-token' },
      });
      userToken = JSON.parse(res.payload).tokens.accessToken;
    });

    it('should link verified phone number to authenticated account', async () => {
      // 1. Generate OTP for linking
      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/phone/send-otp',
        payload: { phoneNumber: phoneToLink },
      });

      // 2. Link phone
      const linkRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/link-phone',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          phoneNumber: phoneToLink,
          otp: '123456',
        },
      });

      expect(linkRes.statusCode).toBe(200);
      const body = JSON.parse(linkRes.payload);
      expect(body.user.phoneNumber).toBe(phoneToLink);
      expect(body.user.googleId).toBe('google-sub-1234567890');
    });

    it('should reject linking phone number already linked to another account', async () => {
      // Create user B with already verified phone
      const phoneB = '+919555544444';
      const userBId = 'user-b-existing-id';
      usersDb.set(userBId, {
        id: userBId,
        phoneNumber: phoneB,
        phoneVerifiedAt: new Date(),
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Issue OTP for linking
      await otpService.createOtpRecord(userToken, '123456', 'PHONE_VERIFICATION' as any);
      await otpService.createOtpRecord(phoneB, '123456', 'PHONE_VERIFICATION' as any);

      // Attempt to link phoneB to Google user
      const conflictRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/link-phone',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          phoneNumber: phoneB,
          otp: '123456',
        },
      });

      expect(conflictRes.statusCode).toBe(409);
      const body = JSON.parse(conflictRes.payload);
      expect(body.error.code).toBe('CONFLICT');
    });
  });

  describe('4. Token Lifecycle & Revocation', () => {
    it('should rotate refresh token and revoke previous token', async () => {
      const phoneForRefresh = '+919777766666';

      await app.inject({
        method: 'POST',
        url: '/api/v1/auth/phone/send-otp',
        payload: { phoneNumber: phoneForRefresh },
      });

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/phone/verify-otp',
        payload: { phoneNumber: phoneForRefresh, otp: '123456' },
      });
      expect(loginRes.statusCode).toBe(200);
      const oldRefreshToken = JSON.parse(loginRes.payload).tokens.refreshToken;

      // Refresh
      const refreshRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: oldRefreshToken },
      });

      expect(refreshRes.statusCode).toBe(200);
      const newTokens = JSON.parse(refreshRes.payload);
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.refreshToken).not.toBe(oldRefreshToken);

      // Attempting to reuse old refresh token must be rejected
      const reuseRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: oldRefreshToken },
      });
      expect(reuseRes.statusCode).toBe(401);
    });
  });
});
