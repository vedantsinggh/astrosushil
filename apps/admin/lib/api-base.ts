/**
 * The one place the admin decides where the backend API lives. Every request builds its URL as
 * `${API_BASE}/api/v1/...`.
 *
 * `NEXT_PUBLIC_API_URL` is inlined by Next.js at BUILD time (only the literal property access
 * below is replaced), so changing it needs a rebuild of the admin image.
 *
 *   unset or ''                   -> 'http://localhost:3000'  (local development, unchanged)
 *   '/'                           -> ''  same origin: requests go to `/api/v1/...` on the admin's
 *                                        own origin, which a reverse proxy forwards to the API
 *                                        (testing deployment, infrastructure/testing)
 *   'https://api.example.com/'    -> 'https://api.example.com'  (trailing slashes removed)
 *
 * All API calls in the admin run in the browser (client components). A relative base would not
 * work from Next.js server code; nothing calls the API server-side today.
 */
export const DEV_API_BASE = 'http://localhost:3000';

export function resolveApiBase(raw: string | undefined): string {
  const value = (raw || '').trim();
  if (!value) return DEV_API_BASE;
  if (value === '/') return '';
  return value.replace(/\/+$/, '');
}

export const API_BASE = resolveApiBase(process.env.NEXT_PUBLIC_API_URL);
