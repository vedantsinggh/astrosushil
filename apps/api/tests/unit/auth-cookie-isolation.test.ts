import { describe, expect, it } from 'vitest';
import {
  ACCESS_COOKIE,
  ADMIN_ACCESS_COOKIE,
  ADMIN_REFRESH_COOKIE,
  authScopeOf,
  clearBrowserSessionCookies,
  getAccessCookie,
  getRefreshCookie,
  REFRESH_COOKIE,
  setBrowserSessionCookies,
} from '../../src/modules/auth/auth-cookies';

function makeRequest(opts: { url?: string; headers?: Record<string, string>; cookies?: Record<string, string> }) {
  return {
    url: opts.url ?? '/api/v1/auth/me',
    headers: opts.headers ?? {},
    cookies: opts.cookies ?? {},
  } as any;
}

function makeReply() {
  const setCalls: Array<{ name: string; value: string }> = [];
  const cleared: string[] = [];
  const reply: any = {
    setCookie(name: string, value: string) {
      setCalls.push({ name, value });
      return reply;
    },
    clearCookie(name: string) {
      cleared.push(name);
      return reply;
    },
  };
  return { reply, setCalls, cleared };
}

describe('admin vs website cookie isolation', () => {
  it('routes /api/v1/admin/* and X-Auth-Scope: admin to admin cookies only', () => {
    const adminReq = makeRequest({
      url: '/api/v1/admin/auth/me',
      cookies: { [ACCESS_COOKIE]: 'user-jwt', [ADMIN_ACCESS_COOKIE]: 'admin-jwt' },
    });
    expect(authScopeOf(adminReq)).toBe('admin');
    expect(getAccessCookie(adminReq)).toBe('admin-jwt');

    const csrfAdminReq = makeRequest({
      url: '/api/v1/auth/csrf',
      headers: { 'x-auth-scope': 'admin' },
      cookies: { [ACCESS_COOKIE]: 'user-jwt', [ADMIN_ACCESS_COOKIE]: 'admin-jwt', [ADMIN_REFRESH_COOKIE]: 'admin-ref' },
    });
    expect(authScopeOf(csrfAdminReq)).toBe('admin');
    expect(getAccessCookie(csrfAdminReq)).toBe('admin-jwt');
    expect(getRefreshCookie(csrfAdminReq)).toBe('admin-ref');
  });

  it('website requests never read admin cookies even if admin is logged in', () => {
    const websiteReq = makeRequest({
      url: '/api/v1/auth/me',
      cookies: { [ADMIN_ACCESS_COOKIE]: 'admin-jwt', [ADMIN_REFRESH_COOKIE]: 'admin-ref' },
    });
    expect(authScopeOf(websiteReq)).toBe('user');
    expect(getAccessCookie(websiteReq)).toBeUndefined();
    expect(getRefreshCookie(websiteReq)).toBeUndefined();
  });

  it('sets and clears separate cookies for admin and user scopes', () => {
    const tokens = { accessToken: 'acc', refreshToken: 'ref', expiresIn: '15m' };
    const req = makeRequest({ headers: { origin: 'http://localhost:3001' } });

    const adminOut = makeReply();
    setBrowserSessionCookies(adminOut.reply, req, tokens, 'admin');
    expect(adminOut.setCalls.map((c) => c.name)).toEqual([ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE]);

    const userOut = makeReply();
    setBrowserSessionCookies(userOut.reply, req, tokens, 'user');
    expect(userOut.setCalls.map((c) => c.name)).toEqual([ACCESS_COOKIE, REFRESH_COOKIE]);

    clearBrowserSessionCookies(adminOut.reply, 'admin');
    expect(adminOut.cleared).toEqual([ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE]);

    clearBrowserSessionCookies(userOut.reply, 'user');
    expect(userOut.cleared).toEqual([ACCESS_COOKIE, REFRESH_COOKIE]);
  });
});
