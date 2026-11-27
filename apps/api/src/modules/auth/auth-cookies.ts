import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../../config';
import { AuthorizationError } from '../../errors/app-error';

export const ACCESS_COOKIE = 'astro_access';
export const REFRESH_COOKIE = 'astro_refresh';
export const ADMIN_ACCESS_COOKIE = 'astro_admin_access';
export const ADMIN_REFRESH_COOKIE = 'astro_admin_refresh';
export const CSRF_HEADER = 'x-csrf-token';
export const AUTH_SCOPE_HEADER = 'x-auth-scope';

export type AuthScope = 'admin' | 'user';

export function authScopeOf(request: FastifyRequest): AuthScope {
  const header = request.headers[AUTH_SCOPE_HEADER];
  if (typeof header === 'string' && header.toLowerCase() === 'admin') return 'admin';
  const rawUrl = request.url || '';
  const path = rawUrl.split('?')[0];
  if (path === '/api/v1/admin' || path.startsWith('/api/v1/admin/')) return 'admin';
  return 'user';
}

function cookieNamesFor(scope: AuthScope) {
  return scope === 'admin'
    ? { access: ADMIN_ACCESS_COOKIE, refresh: ADMIN_REFRESH_COOKIE }
    : { access: ACCESS_COOKIE, refresh: REFRESH_COOKIE };
}

export function getAccessCookie(request: FastifyRequest): string | undefined {
  const { access } = cookieNamesFor(authScopeOf(request));
  return request.cookies?.[access];
}

type SessionTokens = { accessToken: string; refreshToken: string; expiresIn: string };

function parseDurationSeconds(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/i.exec(value.trim());
  if (!match) return 30 * 60;
  const amount = Number(match[1]);
  const factor: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return amount * factor[match[2].toLowerCase()];
}

export function isAllowedAuthOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  let normalized: string;
  let hostname: string;
  try {
    const parsed = new URL(origin);
    normalized = parsed.origin;
    hostname = parsed.hostname;
  } catch {
    return false;
  }

  const allowed = new Set(
    (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        try { return new URL(entry).origin; } catch { return entry; }
      })
  );
  if (process.env.NODE_ENV !== 'production' &&
      (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.trycloudflare.com'))) {
    return true;
  }
  return allowed.has(normalized);
}

function cookieOptions(maxAge: number) {
  return {
    path: '/',
    httpOnly: true,
    secure: config.AUTH_COOKIE_SECURE,
    sameSite: config.AUTH_COOKIE_SAME_SITE,
    ...(config.AUTH_COOKIE_DOMAIN ? { domain: config.AUTH_COOKIE_DOMAIN } : {}),
    maxAge,
  } as const;
}

export function createCsrfToken(accessToken: string): string {
  return crypto.createHmac('sha256', config.JWT_SECRET).update(`csrf:${accessToken}`).digest('base64url');
}

/** Establishes an HttpOnly browser session only for a configured frontend origin. */
export function setBrowserSessionCookies(
  reply: FastifyReply,
  request: FastifyRequest,
  tokens: SessionTokens,
  scope: AuthScope = authScopeOf(request)
): string | null {
  if (!isAllowedAuthOrigin(request.headers.origin)) return null;
  const { access, refresh } = cookieNamesFor(scope);
  reply
    .setCookie(access, tokens.accessToken, cookieOptions(parseDurationSeconds(tokens.expiresIn)))
    .setCookie(refresh, tokens.refreshToken, cookieOptions(parseDurationSeconds(config.JWT_REFRESH_EXPIRES_IN)));
  return createCsrfToken(tokens.accessToken);
}

export function clearBrowserSessionCookies(reply: FastifyReply, scope: AuthScope = 'user'): void {
  const { access, refresh } = cookieNamesFor(scope);
  const options = { ...cookieOptions(0), expires: new Date(0) };
  reply.clearCookie(access, options);
  reply.clearCookie(refresh, options);
}

export function isCookieAuthenticatedRequest(request: FastifyRequest): boolean {
  return !request.headers.authorization && !!getAccessCookie(request);
}

export function assertCsrfRequest(request: FastifyRequest): void {
  const origin = request.headers.origin;
  const accessToken = getAccessCookie(request);
  const headerValue = request.headers[CSRF_HEADER];
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return;
  if (!isAllowedAuthOrigin(origin) || typeof accessToken !== 'string' || typeof headerValue !== 'string') {
    throw new AuthorizationError('Invalid or missing CSRF token');
  }
  const cookieBytes = Buffer.from(createCsrfToken(accessToken));
  const headerBytes = Buffer.from(headerValue);
  if (cookieBytes.length !== headerBytes.length || !crypto.timingSafeEqual(cookieBytes, headerBytes)) {
    throw new AuthorizationError('Invalid or missing CSRF token');
  }
}

export function getRefreshCookie(request: FastifyRequest): string | undefined {
  const { refresh } = cookieNamesFor(authScopeOf(request));
  return request.cookies?.[refresh];
}
