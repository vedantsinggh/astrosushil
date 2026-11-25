import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../../config';
import { AuthorizationError } from '../../errors/app-error';

export const ACCESS_COOKIE = 'astro_access';
export const REFRESH_COOKIE = 'astro_refresh';
export const CSRF_HEADER = 'x-csrf-token';

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
export function setBrowserSessionCookies(reply: FastifyReply, request: FastifyRequest, tokens: SessionTokens): string | null {
  if (!isAllowedAuthOrigin(request.headers.origin)) return null;
  reply
    .setCookie(ACCESS_COOKIE, tokens.accessToken, cookieOptions(parseDurationSeconds(tokens.expiresIn)))
    .setCookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(parseDurationSeconds(config.JWT_REFRESH_EXPIRES_IN)));
  return createCsrfToken(tokens.accessToken);
}

export function clearBrowserSessionCookies(reply: FastifyReply): void {
  const options = { ...cookieOptions(0), expires: new Date(0) };
  reply.clearCookie(ACCESS_COOKIE, options);
  reply.clearCookie(REFRESH_COOKIE, options);
}

export function isCookieAuthenticatedRequest(request: FastifyRequest): boolean {
  return !request.headers.authorization && !!request.cookies?.[ACCESS_COOKIE];
}

export function assertCsrfRequest(request: FastifyRequest): void {
  const origin = request.headers.origin;
  const accessToken = request.cookies?.[ACCESS_COOKIE];
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
  return request.cookies?.[REFRESH_COOKIE];
}
