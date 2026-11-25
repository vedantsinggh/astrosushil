# Security Audit Report — Astro Sushil Monorepo

**Audit Date:** 2026-11-25
**Baseline Commit:** `f107143` (`staging`)
**Scope:** `apps/api`, `apps/website`, `apps/admin`, `apps/mobile`, `packages/`, `scripts/`

---

## Current status (2026-11-26)

This document retains the original findings below as the baseline evidence. The owner approved HttpOnly browser sessions and major dependency upgrades for VM demo readiness, with a separate origin review before public deployment.

| Finding | Current status |
|---|---|
| SEC-001–005, SEC-008–009 | Remediations were already present at handoff; retain regression verification from handoff and full API suite result below. |
| SEC-006 | Implemented for Website and Admin with API-hosted HttpOnly access/refresh cookies and CSRF validation. Browser localStorage JWT usage removed. See [deployment review](SECURITY_DEPLOYMENT_REVIEW.md); final host/origin review remains a deployment prerequisite. |
| SEC-007 | Added persistent per-account staff login/password-reset lockout (five failures in 15 minutes; 15-minute lock), plus existing route rate limits. |
| SEC-010 | Swagger remains disabled in production per handoff. Online npm audits reported zero vulnerabilities for the root workspace and Website lockfile on 2026-11-26. |

The full API regression suite is running against local PostgreSQL; its observed final result is recorded in the handoff once complete. No production data or live messaging/payment providers were accessed.

---

## Findings

### SEC-001: Global Error Handler Bypasses CORS Allowlist and Reflects Arbitrary Origins with Credentials
- **Affected component:** `apps/api/src/errors/error-handler.ts:9-14`
- **Severity:** High
- **Evidence:** `globalErrorHandler` unconditionally sets `Access-Control-Allow-Origin: request.headers.origin` and `Access-Control-Allow-Credentials: 'true'` whenever `request.headers.origin` is present.
- **Reproduction:** Send any cross-origin request with `Origin: https://evil.example` that triggers a 4xx/5xx error (e.g., invalid route or validation error); the response includes `Access-Control-Allow-Origin: https://evil.example` and `Access-Control-Allow-Credentials: true`.
- **Impact:** Any untrusted origin can read credentialed error responses, bypassing `@fastify/cors`.
- **Recommended fix:** Remove manual `Access-Control-Allow-Origin` / `Access-Control-Allow-Credentials` headers from `globalErrorHandler` and let `@fastify/cors` handle CORS headers.
- **Fix status:** Fixed per handoff; independent retest outstanding

### SEC-002: Overly Permissive CORS Substring Matching (Including `trycloudflare.com` and `localhost` in Production)
- **Affected component:** `apps/api/src/plugins/cors.ts:9-22`
- **Severity:** High
- **Evidence:** `cors.ts` permits `origin.includes('localhost')`, `origin.includes('127.0.0.1')`, and `origin.includes('trycloudflare.com')` unconditionally (even when `NODE_ENV === 'production'`), and checks `CORS_ORIGIN` via `.includes(allowed.trim())`.
- **Reproduction:** Send `Origin: https://trycloudflare.com.attacker.com` or `Origin: http://evil-localhost.com` in production; CORS allows it with credentials.
- **Impact:** Substring matching and hardcoded tunnel/localhost allowlists enable credentialed cross-origin requests from attacker-controlled domains in production.
- **Recommended fix:** Allow `localhost`/`127.0.0.1` only when `NODE_ENV !== 'production'`, remove `trycloudflare.com` in production, and compare `new URL(origin).origin` against an exact allowlist `Set`.
- **Fix status:** Fixed per handoff; independent retest outstanding

### SEC-003: Non-Atomic Refresh Token Rotation (Concurrency / Replay Window)
- **Affected component:** `apps/api/src/services/token.service.ts:75-103`
- **Severity:** Medium
- **Evidence:** `rotateRefreshToken` reads via `findUnique`, checks `revokedAt` in JS, and updates `revokedAt` separately without a transaction or `revokedAt: null` precondition.
- **Impact:** Concurrent `/auth/refresh` requests with the same token can mint multiple valid session pairs; replaying a revoked token does not revoke the user's active token family.
- **Recommended fix:** Wrap rotation in `prisma.$transaction` with atomic `updateMany({ where: { id, revokedAt: null } })` (`count === 1`). On reuse of a revoked token, revoke all active refresh tokens for `userId`.
- **Fix status:** Fixed per handoff; independent retest outstanding

### SEC-004: Non-Atomic OTP Verification (Race Condition on Attempt Limit and Single-Use)
- **Affected component:** `apps/api/src/modules/auth/otp.service.ts:120-175`
- **Severity:** Medium
- **Evidence:** `OtpService.verifyOtp` checks `record.attempts >= 5` in JS and updates `attempts` / `usedAt` without `usedAt: null` / `attempts < 5` preconditions.
- **Impact:** Concurrent verification requests can race past the 5-attempt limit or consume the same OTP multiple times.
- **Recommended fix:** Use atomic `updateMany` with `where: { id: record.id, usedAt: null, attempts: { lt: 5 } }` inside a transaction.
- **Fix status:** Fixed per handoff; independent retest outstanding

### SEC-005: Unsanitized Product Description HTML Rendered via `dangerouslySetInnerHTML` (Stored XSS)
- **Affected component:** `apps/website/src/pages/Products/Productdetailpage.jsx:223,667`, `apps/website/src/pages/Blogs/BlogCard.jsx:8`, `apps/api/src/modules/products/products.service.ts`
- **Severity:** Medium
- **Evidence:** `sanitizeRichText` is applied to blogs and legal pages, but not to product `description`. `Productdetailpage.jsx:667` renders `dangerouslySetInnerHTML={{ __html: p.descriptionHtml }}`, and `BlogCard.jsx:8` assigns `div.innerHTML = html` directly.
- **Impact:** Compromised admin account or unsanitized migrated HTML can execute JS in visitors' browsers and steal `localStorage` JWTs.
- **Recommended fix:** Sanitize product `description` on write with `sanitizeRichText` in `products.service.ts` and use safe parsing/sanitization on the client.
- **Fix status:** Fixed per handoff; independent retest outstanding

### SEC-006: Bearer JWTs Stored in `localStorage` Across Website and Admin Portals
- **Affected component:** `apps/website/src/store/useAuthStore.js:12,87`, `apps/admin/lib/auth-context.tsx:31,66`
- **Severity:** Medium
- **Evidence:** Access tokens are stored in `localStorage` and sent via `Authorization: Bearer`.
- **Impact:** Any XSS in the browser context can exfiltrate customer or admin JWTs.
- **Recommended fix:** Migrate web and admin auth to `HttpOnly`, `Secure`, `SameSite=Lax` cookies with CSRF protection (requires coordinated auth/cookie architecture).
- **Fix status:** Implemented after owner approval. Website and Admin use API-hosted HttpOnly cookies and send CSRF tokens on unsafe requests. The VM's actual Website/Admin/API origins must be configured and tested; cross-site cookie limitations are documented in `SECURITY_DEPLOYMENT_REVIEW.md`.

### SEC-007: Missing Per-Route Rate Limiting & Account Lockout on Staff Login and Password Reset
- **Affected component:** `apps/api/src/modules/admin/admin.routes.ts:35-57`, `apps/api/src/modules/auth/auth.routes.ts:229-270`
- **Severity:** Medium
- **Evidence:** Staff login and password reset rely only on the global `100 req/min` IP rate limit (`apps/api/src/plugins/rate-limit.ts:7`) and have no per-account failed-attempt lockout.
- **Impact:** Susceptible to high-rate password brute-force attacks.
- **Recommended fix:** Add per-route `config.rateLimit` (e.g., `10/min`) and per-account failed-login throttling.
- **Fix status:** Fixed. Per-route rate limits plus persistent HMAC-keyed per-account failed-attempt lockout are implemented for staff login and password reset.

### SEC-008: `xelatex` Report Compilation Omits `-no-shell-escape` Flag
- **Affected component:** `packages/report-engine/src/platform/render/document.ts:120`
- **Severity:** Low
- **Evidence:** `compileLatex` invokes `xelatex` without `-no-shell-escape` (unlike `packages/report-engine/src/invoice/render.ts:35`).
- **Recommended fix:** Add `'-no-shell-escape'` to `xelatex` args.
- **Fix status:** Fixed per handoff; independent retest outstanding

### SEC-009: Hardcoded Fallback Signing Secret in `StorageService`
- **Affected component:** `apps/api/src/services/storage.service.ts:98-100`
- **Severity:** Low
- **Evidence:** Falls back to `'astro-sushil-storage-secret-key-v1'` if `JWT_SECRET` and `STORAGE_SECRET` are unset.
- **Recommended fix:** Throw an error if neither secret is configured in production (or whenever signing is invoked without config).
- **Fix status:** Fixed per handoff; independent retest outstanding

### SEC-010: Swagger UI Exposed Unconditionally & Offline Dependency Audit Limitation
- **Affected component:** `apps/api/src/plugins/swagger.ts:38-45`
- **Severity:** Informational
- **Evidence:** `@fastify/swagger-ui` (`/documentation`) is registered regardless of `NODE_ENV`. `npm audit --offline` could not query online advisories.
- **Recommended fix:** Disable Swagger UI in production (`NODE_ENV === 'production'`) and run online `npm audit` in CI.
- **Fix status:** Swagger UI disabled in production per handoff; online npm audits reported zero known vulnerabilities for the root and Website dependency graphs on 2026-11-26.
