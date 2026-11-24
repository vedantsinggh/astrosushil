const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface ApiFetchOptions extends RequestInit {
  token?: string | null;
}

export async function apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, headers, ...restOptions } = options;

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  } else if (typeof window !== 'undefined') {
    const savedToken = localStorage.getItem('admin_access_token');
    if (savedToken) {
      reqHeaders['Authorization'] = `Bearer ${savedToken}`;
    }
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...restOptions,
    headers: reqHeaders,
  });

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
