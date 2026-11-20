import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { emailService } from '../../src/services/email.service';

/**
 * Legacy email/password auth flow (integration, real test database).
 *
 * The register flow requires email verification: POST /register returns
 * `{ requiresEmailVerification, email, message }` (no tokens) and the session
 * is only issued by POST /verify-email (or POST /login once verified).
 * The OTP is captured by spying on the outbound verification email so no
 * real email transport is used.
 */
describe('Auth API Endpoints (Integration)', () => {
  let app: FastifyInstance;
  const sentOtps: string[] = [];

  const runId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const testEmail = `auth-it-${runId}@example.com`;
  const testPassword = 'Password123!';

  beforeAll(async () => {
    vi.spyOn(emailService, 'sendVerificationEmail').mockImplementation(async (_to: string, otp: string) => {
      sentOtps.push(otp);
    });

    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // OTP records and refresh tokens cascade on user delete.
    await prisma.user.deleteMany({ where: { email: { in: [testEmail, `weakpass-${runId}@example.com`] } } });
    await app.close();
    vi.restoreAllMocks();
  });

  let registeredAccessToken: string;
  let registeredRefreshToken: string;

  it('POST /api/v1/auth/register should successfully create a user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.requiresEmailVerification).toBe(true);
    expect(body.email).toBe(testEmail);
    expect(body.tokens).toBeUndefined();
    expect(sentOtps).toHaveLength(1);
    expect(sentOtps[0]).toMatch(/^\d{6}$/);

    const user = await prisma.user.findFirst({ where: { email: testEmail } });
    expect(user).not.toBeNull();
    expect(user!.role).toBe('USER');
    expect(user!.emailVerifiedAt).toBeNull();
    expect(user!.passwordHash).not.toBe(testPassword);
  });

  it('POST /api/v1/auth/login should not issue tokens before email verification', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: testEmail, password: testPassword },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.requiresEmailVerification).toBe(true);
    expect(body.email).toBe(testEmail);
    expect(body.tokens).toBeUndefined();
    expect(body.user).toBeUndefined();
  });

  it('POST /api/v1/auth/verify-email should reject an incorrect code', async () => {
    const wrongCode = sentOtps[0] === '000000' ? '111111' : '000000';
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email',
      payload: { email: testEmail, otp: wrongCode },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('POST /api/v1/auth/verify-email should verify the user and issue a session', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/verify-email',
      payload: { email: testEmail, otp: sentOtps[sentOtps.length - 1] },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.verified).toBe(true);
    expect(body.user.email).toBe(testEmail);
    expect(body.user.role).toBe('USER');
    expect(body.user.emailVerifiedAt).not.toBeNull();
    expect(body.tokens.accessToken).toBeDefined();
    expect(body.tokens.refreshToken).toBeDefined();

    registeredAccessToken = body.tokens.accessToken;
    registeredRefreshToken = body.tokens.refreshToken;
  });

  it('POST /api/v1/auth/register should return 409 for duplicate email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('POST /api/v1/auth/register should return 400 for weak password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: `weakpass-${runId}@example.com`,
        password: 'weak',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/login should authenticate user with correct credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.user.email).toBe(testEmail);
    expect(body.tokens.accessToken).toBeDefined();
    expect(body.tokens.refreshToken).toBeDefined();
  });

  it('POST /api/v1/auth/login should return 401 for incorrect password', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: testEmail,
        password: 'WrongPassword999!',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('GET /api/v1/auth/me should return current profile when authenticated', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${registeredAccessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.email).toBe(testEmail);
    expect(body.role).toBe('USER');
  });

  it('GET /api/v1/auth/me should return 401 when token is missing', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
  });

  it('POST /api/v1/auth/refresh should rotate refresh token and issue new access token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refreshToken: registeredRefreshToken,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.tokens.accessToken).toBeDefined();
    expect(body.tokens.refreshToken).toBeDefined();
    expect(body.refreshToken).not.toBe(registeredRefreshToken);

    // The rotated-out token must no longer be usable
    const reuseResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: registeredRefreshToken },
    });
    expect(reuseResponse.statusCode).toBe(401);

    // Update reference token
    registeredRefreshToken = body.tokens.refreshToken;
  });

  it('POST /api/v1/auth/logout should revoke refresh token', async () => {
    const logoutResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: {
        refreshToken: registeredRefreshToken,
      },
    });

    expect(logoutResponse.statusCode).toBe(200);

    // Attempting to refresh again with revoked token should fail
    const refreshResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refreshToken: registeredRefreshToken,
      },
    });

    expect(refreshResponse.statusCode).toBe(401);
  });
});
