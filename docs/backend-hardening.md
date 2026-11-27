# Backend Security & Hardening

## 1. Logging & PII Redaction
- All backend logging uses Pino (`apps/api/src/utils/logger.ts`).
- Passwords, OTPs, JWT tokens, API keys (including SMSLane/WhatChimp query tokens), and payment secrets are strictly redacted and never logged.

## 2. Request Correlation & Error Format
- Every request accepts/generates an `x-request-id` sanitized against `/^[a-zA-Z0-9_-]{8,64}$/`.
- All API errors return `{ "error": { "code", "message", "requestId" } }` with no stack traces, raw SQL, or filesystem paths exposed in production.

## 3. Authentication & Session Security
- **Admin vs. Customer Cookie Isolation**: Admin uses `astro_admin_access` / `astro_admin_refresh`; Website uses `astro_access` / `astro_refresh`.
- **CSRF Protection**: Cookie-authenticated mutations require HMAC-verified `X-CSRF-Token` plus origin validation against `CORS_ORIGIN`.
- **Master OTP Prohibition**: `OtpService.isDevMasterOtpEnabled()` unconditionally returns `false` when `NODE_ENV === 'production'`.
- **Blocked Account Enforcement**: `assertAccountActive()` checks suspended/deleted status on every authenticated request.

## 4. Business & Legal Enforcement
- **Admin-Only Rescheduling**: `POST /api/v1/consultations/bookings/:id/reschedule` and `consultationsService.rescheduleBooking()` reject non-admin callers with `403 ForbiddenError`.
- **Server-Side RBAC & Audit Logs**: All `/api/v1/admin/*` routes enforce `checkPermission('module:action')`, and state-changing actions are recorded via `adminService.logAction`.
- **Webhook Verification**: Razorpay webhooks verify HMAC-SHA256 signatures over the raw request body and deduplicate via `WebhookEvent`.
