/**
 * Owner decision 2026-11-26: no rate limit in the admin, except staff sign-in and the
 * password-reset code endpoints.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { registerRateLimit } from '../../src/plugins/rate-limit';
import { globalErrorHandler } from '../../src/errors/error-handler';

const SECRET = 'test-secret-for-rate-limit-only-0123456789';
let app: FastifyInstance;

beforeEach(async () => {
  app = Fastify();
  await app.register(fastifyJwt, { secret: SECRET });
  app.setErrorHandler(globalErrorHandler);
  await app.register(registerRateLimit);
  const ok = async () => ({ ok: true });
  app.get('/api/v1/admin/bookings', { config: { rateLimit: { max: 2, timeWindow: '1 minute' } } }, ok);
  app.post('/api/v1/admin/auth/login', { config: { rateLimit: { max: 2, timeWindow: '1 minute' } } }, ok);
  app.get('/api/v1/astrology/panchang', { config: { rateLimit: { max: 2, timeWindow: '1 minute' } } }, ok);
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

async function hit(method: 'GET' | 'POST', url: string, times: number, token?: string): Promise<number[]> {
  const codes: number[] = [];
  for (let i = 0; i < times; i++) {
    const res = await app.inject({ method, url, headers: token ? { authorization: `Bearer ${token}` } : {} });
    codes.push(res.statusCode);
  }
  return codes;
}

describe('rate limit and staff', () => {
  it('never limits an admin API path, even with a route limit', async () => {
    const codes = await hit('GET', '/api/v1/admin/bookings?page=1', 6);
    expect(codes.every((c) => c === 200)).toBe(true);
  });

  it('keeps the limit on staff login', async () => {
    const codes = await hit('POST', '/api/v1/admin/auth/login', 3);
    expect(codes).toEqual([200, 200, 429]);
  });

  it('exempts a shared endpoint called with a valid staff token', async () => {
    const token = app.jwt.sign({ sub: 'staff-1', role: 'ADMIN' });
    const codes = await hit('GET', '/api/v1/astrology/panchang', 6, token);
    expect(codes.every((c) => c === 200)).toBe(true);
  });

  it('still limits customers and forged tokens on shared endpoints', async () => {
    const customer = app.jwt.sign({ sub: 'user-1', role: 'USER' });
    expect(await hit('GET', '/api/v1/astrology/panchang', 3, customer)).toEqual([200, 200, 429]);
    await app.close();
    app = Fastify();
    await app.register(fastifyJwt, { secret: SECRET });
    app.setErrorHandler(globalErrorHandler);
  await app.register(registerRateLimit);
    app.get('/api/v1/astrology/panchang', { config: { rateLimit: { max: 2, timeWindow: '1 minute' } } }, async () => ({ ok: true }));
    await app.ready();
    const forged = Fastify();
    await forged.register(fastifyJwt, { secret: 'a-different-secret-0123456789-abcdef' });
    await forged.ready();
    const badToken = forged.jwt.sign({ sub: 'x', role: 'SUPER_ADMIN' });
    await forged.close();
    expect(await hit('GET', '/api/v1/astrology/panchang', 3, badToken)).toEqual([200, 200, 429]);
  });
});
