# Authentication & Session Isolation

## 1. Customer Authentication (OTP-Only)

- Customers sign in exclusively via **6-digit OTP** sent to either:
  - **Phone** (`POST /api/v1/auth/phone/send-otp` -> `POST /api/v1/auth/phone/verify-otp`): normalized to E.164 (`+91...`) and delivered in parallel via **SMS (SMSLane)** and **WhatsApp (WhatChimp)**.
  - **Email** (`POST /api/v1/auth/email/send-otp` -> `POST /api/v1/auth/email/verify-otp`): delivered via **SMTP**.
- Legacy password and Google sign-in routes return `410 AUTH_METHOD_REMOVED`.
- Development master OTP (`DEV_MASTER_OTP`) is **strictly disabled** when `NODE_ENV=production`.
- Rate limiting is enforced per-identifier and per-IP using append-only `OtpSendLog` rows (`OtpSendLimiter`) plus a 60-second resend cooldown.

## 2. Admin / Staff Authentication

- Staff sign in via email + password at `POST /api/v1/admin/auth/login` (rate-limited to 30 attempts/minute).
- Staff permissions are resolved dynamically from PostgreSQL (`AdminRole` + `StaffProfile`) via `checkPermission('module:action')`.

## 3. Browser Cookie Isolation (Website vs. Admin)

Because `apps/website` and `apps/admin` share the same backend API, they use **strictly separate `httpOnly` cookie pairs** so logging into Admin never logs that account into the Website (and vice versa):

| Client | Access Cookie | Refresh Cookie | Scope Detection (`authScopeOf`) |
| --- | --- | --- | --- |
| **Website (Customer)** | `astro_access` | `astro_refresh` | Default for non-admin routes |
| **Admin Portal (Staff)** | `astro_admin_access` | `astro_admin_refresh` | Path `/api/v1/admin/*` OR header `X-Auth-Scope: admin` |

- `apps/admin/lib/api-client.ts` automatically attaches `X-Auth-Scope: admin` on `/api/v1/auth/csrf`, `/api/v1/auth/refresh`, and all admin requests.
- **CSRF Protection**: Browser cookie-authenticated mutations (`POST`, `PUT`, `PATCH`, `DELETE`) require `X-CSRF-Token`, computed as an HMAC-SHA256 of the scoped access cookie (`createCsrfToken`).

## 4. Mobile App Authentication (iOS & Android)

- Mobile clients receive `{ accessToken, refreshToken, expiresIn }` in the JSON body (no browser origin header) and store tokens in `flutter_secure_storage`, sending `Authorization: Bearer <accessToken>` on requests.
