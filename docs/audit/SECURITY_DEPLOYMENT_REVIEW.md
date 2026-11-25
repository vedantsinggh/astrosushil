# Web Session Cookie Deployment Review

**Status:** Implemented for demo configuration; production origin review remains required.

## Current design

- Browser sessions use host-only `astro_access` and `astro_refresh` cookies issued by the API. Both are `HttpOnly`; `Secure` defaults on in production.
- Website and Admin requests include credentials and send an API-generated `X-CSRF-Token` on state-changing requests. The token is derived from the access cookie with an HMAC and is returned only to an exact configured frontend origin.
- Mobile clients without a browser `Origin` continue to receive bearer tokens in the REST response and may use the existing bearer-auth flow.
- Browser origins configured in `CORS_ORIGIN` must be exact origins. Credentialed CORS must never use `*`.

## Demo VM settings

For the documented API, Website, and Admin subdomains under `astrosushil.com`, use:

```dotenv
AUTH_COOKIE_SAME_SITE=lax
AUTH_COOKIE_SECURE=true
# Leave AUTH_COOKIE_DOMAIN unset; API cookies stay host-only.
CORS_ORIGIN=https://astrosushil.com,https://www.astrosushil.com,https://admin.astrosushil.com
```

Use the actual demo VM origins in `CORS_ORIGIN`; the example production names above are not a substitute for confirming the demo hostnames. Serve all three over HTTPS before enabling Secure cookies.

## Required review before public deployment

1. Confirm the deployed Website, Admin, and API origins and verify every exact origin is on the API allowlist.
2. Keep `AUTH_COOKIE_SAME_SITE=lax` when the frontends and API are different origins but remain same-site subdomains.
3. If a frontend is on a different site, `SameSite=None` requires `AUTH_COOKIE_SECURE=true`, but browser third-party-cookie restrictions may still prevent API cookies from being sent. Prefer a same-site reverse-proxy/BFF route for the API before relying on cross-site cookies in production.
4. Test login, reload, refresh rotation, logout, CSRF rejection, CORS preflight, and cookie expiry in the actual target browsers and demo domains.
5. Decide whether all pre-migration browser sessions should be revoked at deployment. The updated clients clear the legacy localStorage token keys on load; token rows otherwise remain subject to their existing expiration/revocation behavior.
