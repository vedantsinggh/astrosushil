import { API_BASE } from './api-base';

export interface ApiFetchOptions extends RequestInit {
}

let browserCsrfToken: string | null = null;

export function setBrowserCsrfToken(token: string | null): void {
  browserCsrfToken = token;
}

async function refreshBrowserCsrfToken(): Promise<string | null> {
  if (browserCsrfToken) return browserCsrfToken;
  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/csrf`, {
      credentials: 'include',
      headers: { 'X-Auth-Scope': 'admin' },
    });
    if (!response.ok) return null;
    const data = await response.json() as { csrfToken?: string };
    browserCsrfToken = data.csrfToken || null;
    return browserCsrfToken;
  } catch {
    return null;
  }
}

export async function cookieAuthHeaders(method = 'GET', headers: Record<string, string> = {}): Promise<Record<string, string>> {
  const result = { 'X-Auth-Scope': 'admin', ...headers };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    const csrfToken = await refreshBrowserCsrfToken();
    if (csrfToken) result['X-CSRF-Token'] = csrfToken;
  }
  return result;
}

export async function apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { headers, method = 'GET', ...restOptions } = options;

  let reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };
  reqHeaders = await cookieAuthHeaders(method, reqHeaders);

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const requestInit: RequestInit = {
    ...restOptions,
    method,
    credentials: 'include',
    headers: reqHeaders,
  };
  let response = await fetch(url, requestInit);

  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const oldCsrf = browserCsrfToken || await refreshBrowserCsrfToken();
    if (oldCsrf) {
      const refreshResponse = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': oldCsrf, 'X-Auth-Scope': 'admin' },
      });
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json() as { csrfToken?: string };
        browserCsrfToken = refreshData.csrfToken || null;
        reqHeaders = await cookieAuthHeaders(method, requestInit.headers as Record<string, string>);
        response = await fetch(url, { ...requestInit, headers: reqHeaders });
      } else {
        browserCsrfToken = null;
      }
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // The API answers `{ error: { code, message, requestId } }`; older endpoints sent a plain string.
    const errorMessage =
      (typeof data?.error === 'object' && data?.error !== null ? data.error.message : undefined) ||
      data?.message ||
      (typeof data?.error === 'string' ? data.error : undefined) ||
      `HTTP ${response.status} Error`;
    const err = new Error(errorMessage) as any;
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data as T;
}
