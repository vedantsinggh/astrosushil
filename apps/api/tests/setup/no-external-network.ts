/**
 * Test-only network guard, loaded through `setupFiles` in both vitest configs.
 *
 * No test may reach a real third party. Several suites set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
 * to placeholder values (to exercise real HMAC signatures), which makes PaymentService call
 * api.razorpay.com; a developer's .env can also hold a working test-mode key. This guard answers
 * those calls locally:
 *
 *  - api.razorpay.com: HTTP 401, which is what the gateway itself answers for placeholder
 *    credentials. Outside production PaymentService then falls back to its local mock order,
 *    refund and "payment not readable" paths, exactly as the suites expect.
 *  - any other non-local host: the request fails like an unreachable network.
 *
 * A test that stubs `fetch` itself (vi.stubGlobal / vi.spyOn) replaces this guard for its own
 * duration, so explicit per-test mocks keep working.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

const realFetch = globalThis.fetch;

function hostOf(input: Parameters<typeof fetch>[0]): string | null {
  try {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const guardedFetch: typeof fetch = async (input, init) => {
  const host = hostOf(input);
  if (host === null || LOCAL_HOSTS.has(host)) {
    return realFetch(input, init);
  }
  if (host === 'api.razorpay.com') {
    return new Response(
      JSON.stringify({ error: { code: 'BAD_REQUEST_ERROR', description: 'Authentication failed (test network guard)' } }),
      { status: 401, statusText: 'Unauthorized', headers: { 'content-type': 'application/json' } }
    );
  }
  throw new TypeError(`fetch failed: external network is disabled in tests (${host})`);
};

globalThis.fetch = guardedFetch;
