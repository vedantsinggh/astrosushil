# Astro Sushil - Backend Hardening, Observability & Production Readiness (Phase 6)

This document describes the production hardening architecture, observability standards, security controls, and operational patterns implemented across the **Astro Sushil** backend API and background worker ecosystem.

---

## 1. Centralized Structured Logging & Redaction

- **Logger Utility**: Powered by `pino` (`apps/api/src/utils/logger.ts`).
- **Log Format**: Produces structured JSON log events in production and formatted output in development environments.
- **Automatic Key Redaction**: Sensitive attributes are censored with `[REDACTED]` prior to emission:
  - Authorization Bearer tokens & HTTP cookies
  - Passwords & password hashes
  - OTP values (`otp`, `code`, `codeHash`)
  - Refresh tokens & JWT signing secrets
  - Payment credentials (`razorpaySecret`, `razorpaySignature`)
  - LLM API keys (`geminiApiKey`)

---

## 2. Request Correlation & ID Sanitization

- **Header Specification**: `x-request-id`
- **Validation**: Incoming user headers are validated against `/^[a-zA-Z0-9_-]{8,64}$/`. Hostile or malformed request ID inputs are discarded and replaced with a `crypto.randomUUID()`.
- **Response Headers**: All HTTP responses echo the sanitized `x-request-id`.
- **Correlation**: Fastify logger instances attach `requestId` to every request trace, error object, and audit record.

---

## 3. Global Error Handling & Machine-Readable Error Schema

All exceptions are caught by `globalErrorHandler` (`apps/api/src/errors/error-handler.ts`).

### Error Response Payload Schema
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      { "field": "email", "message": "Invalid email address format" }
    ],
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Machine-Readable Error Codes
- `AUTHENTICATION_ERROR` (401)
- `AUTHORIZATION_ERROR` (403)
- `NOT_FOUND` (404)
- `VALIDATION_ERROR` (400)
- `CONFLICT_ERROR` (409)
- `RATE_LIMIT_EXCEEDED` (429)
- `DATABASE_UNAVAILABLE` (503)
- `SERVICE_MAINTENANCE` (503)
- `INTERNAL_ERROR` (500)

*Note: Stack traces, internal file paths, and database query parameters are strictly hidden in production environments.*

---

## 4. Authentication Lifecycle & Token Management

- **Access Token**: Short-lived JWT suitable for stateless API authentication.
- **Refresh Token**: Cryptographically secure, long-lived token stored in the database (`RefreshToken` model). Supports single-flight token rotation and explicit session revocation (`POST /api/v1/auth/logout` or admin revocation).
- **Development Master OTP**:
  - Controlled strictly via environment variables (`ALLOW_DEV_MASTER_OTP=true`, `DEV_MASTER_OTP=4444`).
  - **HARD CONSTRAINT**: Bypassed and forcibly disabled when `NODE_ENV === 'production'`.
- **Flutter Single-Flight Interceptor** (`apps/mobile/lib/core/network/auth_interceptor.dart`):
  - Listens for HTTP 401 status codes.
  - Queues concurrent failing requests into a single-flight refresh buffer to avoid duplicate refresh calls.
  - Automatically retries queued requests once token rotation succeeds.
  - Clears local storage and redirects user to sign-in on refresh failure.

---

## 5. Server-Side Authorization (RBAC)

- All administrative endpoints (`/api/v1/admin/*`) enforce role-based access control (`SUPER_ADMIN`, `ADMIN`, `SUPPORT`) server-side via `adminAuth` and `requirePermission` pre-handlers.
- End-user data endpoints (Birth Profiles, Reports, Orders) enforce strict ownership checks (`where: { userId: request.user.id }`).

---

## 6. Rate Limiting Strategy

High-risk routes enforce strict rate windows via `@fastify/rate-limit`:
- `/api/v1/auth/login`: 10 requests / min
- `/api/v1/auth/register`: 5 requests / min
- `/api/v1/auth/forgot-password`: 5 requests / min
- `/api/v1/jyoti/chat`: 20 requests / min per user
- `/api/v1/astrology/*`: 30 requests / min
- Global API fallback: 100 requests / min

---

## 7. Database Reliability & Atomic Transactions

- Multi-step state transitions (e.g. `verifyPayment`, `register`, `grantEntitlement`) execute inside Prisma `$transaction` blocks to ensure atomicity.
- Database connection checks are instrumented via `checkDatabaseHealth()` in `prisma.service.ts`.

---

## 8. Asynchronous Worker Observability (`CareerReportWorker`)

- Report jobs transition through deterministic, observable stages:
  `QUEUED` ➔ `CALCULATING` ➔ `ANALYZING` ➔ `RENDERING` ➔ `COMPILING` ➔ `UPLOADING` ➔ `COMPLETED`
- Stage failures update database status to `FAILED`, recording `errorCode` and `errorMessage` for administrative diagnostics without corrupting historic records.

---

## 9. Health & Readiness Probes

- **Liveness Probe** (`GET /health`): Fast non-blocking process check.
- **Readiness Probe** (`GET /health/ready` & `GET /ready`): Evaluates PostgreSQL database connectivity. Returns HTTP 200 OK when ready or HTTP 503 Service Unavailable when degraded.

---

## 10. Webhook Security & Payment Verification

- Razorpay payment signature verification computes HMAC SHA-256 over `${razorpayOrderId}|${razorpayPaymentId}` matching `RAZORPAY_KEY_SECRET`.
- Verification endpoint `verifyPayment` is idempotent; replaying a previously verified payment returns the existing `PAID` order without duplicate entitlement grants.

---

## 11. Known Limitations & Environment Requirements

1. **LaTeX Compiler Dependency**: Report generation requires `xelatex` binary on the host/container system. If missing, worker marks stage as `FAILED` with code `LATEX_COMPILE_FAILED`.
2. **Environment Variables Required for Production**:
   - `DATABASE_URL` (PostgreSQL connection string)
   - `JWT_SECRET` (min 32 characters)
   - `RAZORPAY_KEY_SECRET`
   - `GEMINI_API_KEY`
