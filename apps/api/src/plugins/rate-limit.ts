import { FastifyInstance, FastifyRequest } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import { getAccessCookie } from '../modules/auth/auth-cookies';

/** Roles of staff accounts (the coarse tier carried in the access token). */
const STAFF_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']);

/**
 * Staff sign-in endpoints. Owner decision 2026-11-26: the admin has no rate limit, except these,
 * which keep a limit against password and reset-code guessing. Their per-route `config.rateLimit`
 * sets the allowance; they are never exempt.
 */
export const STAFF_AUTH_PATHS: readonly string[] = [
  '/api/v1/admin/auth/login',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
];

function pathOf(request: FastifyRequest): string {
  const url = request.url;
  const query = url.indexOf('?');
  return query === -1 ? url : url.slice(0, query);
}

function bearerOrCookieToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim() || null;
  const cookie = getAccessCookie(request);
  return cookie || null;
}

/**
 * True when the request is exempt from the limiter: every admin API path, and any request signed
 * with a valid staff access token (the admin also calls shared endpoints such as `/astrology`).
 * The token is only verified here, not trusted for anything else: the route's own `authenticate`
 * and permission checks still run.
 */
export function isStaffRequest(app: FastifyInstance, request: FastifyRequest): boolean {
  const path = pathOf(request);
  if (STAFF_AUTH_PATHS.includes(path)) return false;
  if (path === '/api/v1/admin' || path.startsWith('/api/v1/admin/')) return true;
  const token = bearerOrCookieToken(request);
  if (!token) return false;
  try {
    const claims = app.jwt.verify<{ role?: string }>(token);
    return typeof claims.role === 'string' && STAFF_ROLES.has(claims.role);
  } catch {
    return false;
  }
}

async function rateLimitPlugin(app: FastifyInstance) {
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: (request) => isStaffRequest(app, request),
    errorResponseBuilder: (request, context) => {
      // `statusCode` makes the thrown object a 429 for the global error handler (without it the
      // handler answered 500 INTERNAL_ERROR to every limited request).
      return {
        statusCode: 429,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Rate limit exceeded. Try again in ${context.after}.`,
          requestId: request.id,
        },
      };
    },
  });
}

/**
 * Wrapped with fastify-plugin so the limiter applies to the whole application. Unwrapped, it stayed
 * inside this plugin's own scope and limited nothing, including the per-route `config.rateLimit`
 * settings. The limit is per client IP: behind a reverse proxy TRUST_PROXY must be set, otherwise
 * every request appears to come from the proxy and all customers share one allowance.
 *
 * Staff requests are exempt (see `isStaffRequest`); `app.jwt` must be registered before this.
 */
export const registerRateLimit = fp(rateLimitPlugin, { name: 'rate-limit' });
