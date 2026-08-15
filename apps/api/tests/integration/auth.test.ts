import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';

describe('Auth API Endpoints (Integration)', () => {
  let app: FastifyInstance;

  // In-memory data store for tests
  const usersDb = new Map<string, any>();
  const refreshTokensDb = new Map<string, any>();

  beforeAll(async () => {
    // Mock Prisma methods for isolated testing environment
    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.email) {
        return Array.from(usersDb.values()).find((u) => u.email === where.email) || null;
      }
      if (where.id) {
        return usersDb.get(where.id) || null;
      }
      return null;
    });

    vi.spyOn(prisma.user, 'create').mockImplementation(async ({ data }: any) => {
      const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newUser = {
        id,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role || 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      usersDb.set(id, newUser);
      return newUser;
    });

    vi.spyOn(prisma.refreshToken, 'create').mockImplementation(async ({ data }: any) => {
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

    vi.spyOn(prisma.refreshToken, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.tokenHash) {
        return refreshTokensDb.get(where.tokenHash) || null;
      }
      return null;
    });

    vi.spyOn(prisma.refreshToken, 'update').mockImplementation(async ({ where, data }: any) => {
      for (const [key, tokenRecord] of refreshTokensDb.entries()) {
        if (tokenRecord.id === where.id) {
          const updated = { ...tokenRecord, ...data };
          refreshTokensDb.set(key, updated);
          return updated;
        }
      }
      throw new Error('Token not found');
    });

    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  let registeredAccessToken: string;
  let registeredRefreshToken: string;
  const testEmail = 'testuser@example.com';
  const testPassword = 'Password123!';

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
    expect(body.user.email).toBe(testEmail);
    expect(body.user.role).toBe('USER');
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
        email: 'weakpass@example.com',
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
    expect(body.tokens.accessToken).toBeDefined();
    expect(body.tokens.refreshToken).toBeDefined();
    expect(body.tokens.refreshToken).not.toBe(registeredRefreshToken);

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
