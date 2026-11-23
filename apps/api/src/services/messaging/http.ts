/**
 * Minimal HTTP GET used by the SMS and WhatsApp providers (Node's built-in fetch;
 * no extra dependency). Both providers take their credentials as query parameters,
 * so NOTHING in here may ever log or return the request URL: errors carry only a
 * code and the HTTP status.
 */

export interface HttpResponse {
  status: number;
  /** Parsed JSON when the body is JSON, otherwise the raw text (truncated). */
  body: unknown;
}

export interface HttpClient {
  get(url: string, params: Record<string, string>, timeoutMs: number): Promise<HttpResponse>;
}

export class HttpRequestError extends Error {
  constructor(public readonly code: 'TIMEOUT' | 'NETWORK_ERROR') {
    // The message deliberately omits the URL and the underlying error text
    // (fetch errors can echo the full URL, which contains the provider token).
    super(code);
    this.name = 'HttpRequestError';
  }
}

export const fetchHttpClient: HttpClient = {
  async get(url, params, timeoutMs) {
    const target = new URL(url);
    for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(target, { method: 'GET', signal: controller.signal, redirect: 'error' });
      const text = await res.text();
      let body: unknown = text.slice(0, 2000);
      try {
        body = JSON.parse(text);
      } catch {
        /* not JSON: keep the truncated text */
      }
      return { status: res.status, body };
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      throw new HttpRequestError(aborted ? 'TIMEOUT' : 'NETWORK_ERROR');
    } finally {
      clearTimeout(timer);
    }
  },
};

/** Turns a thrown error from an HttpClient into a retryable failure code. */
export function httpFailureCode(err: unknown): string {
  return err instanceof HttpRequestError ? err.code : 'NETWORK_ERROR';
}
