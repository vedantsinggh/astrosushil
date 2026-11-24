# Customer & Staff Authentication (auth)

**Status:** built, fully tested, OTP-only for customers.
**Last updated:** 2026-11-24

Customer authentication on Astro Sushil is by one-time code only (owner decision, 2026-11-24): a 6-digit code sent to a phone number (SMS + WhatsApp) or to an e-mail address. Customers have no password and no Google sign-in. Staff sign in with e-mail and password at `/admin/auth/login`.

---

## 1. Principles & Decisions

1. **OTP-Only for Customers**:
   - Customers sign in using a verified phone number or e-mail address.
   - Password registration/login and Google sign-in are removed for customers.
   - Legacy customer endpoints return HTTP 410 `AUTH_METHOD_REMOVED` with clear human-readable messages instructing users to update their app.
2. **Staff Retain Email + Password**:
   - Staff sign in exclusively at `/admin/auth/login`.
   - Customer OTP verification rejects staff accounts (preventing OTP-based entry into the admin panel).
   - Staff forgot/reset password flow is preserved at `/api/v1/auth/forgot-password` and `/api/v1/auth/reset-password`.
3. **No Account Probing / Enumeration**:
   - Send OTP endpoints answer identically whether an identifier is registered, unknown, staff, or suspended.
   - Blocked accounts and staff role restrictions are enforced only *after* a valid OTP is verified.
4. **Never Auto-Merge Accounts**:
   - Existing accounts created under passwords or Google in legacy versions access their account via email OTP.
   - Linking a phone or email to an existing account refuses (HTTP 409) if that identifier belongs to another real customer account.
5. **Multi-Layered Abuse Prevention**:
   - Cryptographic hashing of OTPs in `otp_verifications` (SHA-256).
   - 10-minute expiry and 60-second cooldown per identifier.
   - Maximum attempt caps.
   - Append-only rate limiting table (`otp_send_logs`) per identifier and per IP address.

---

## 2. Customer Auth Endpoints

All customer endpoints are mounted under `/api/v1/auth`.

### `POST /api/v1/auth/phone/send-otp`
- **Purpose**: Dispatches a 6-digit sign-in code via SMS and WhatsApp.
- **Request Body**:
  ```json
  { "phoneNumber": "+919876543210" }
  ```
- **Response**: HTTP 200
  ```json
  {
    "success": true,
    "message": "Verification code sent to your phone number.",
    "phoneNumber": "+919876543210",
    "expiresIn": 600
  }
  ```
- **Behaviors**:
  - Normalizes phone number to E.164.
  - Checks rate limits (per-number and per-IP).
  - Checks 60-second cooldown.
  - Creates a pending unverified user record if the number does not exist yet.
  - Generates 6-digit OTP, stores hash in `otp_verifications`, and sends via messaging providers.

### `POST /api/v1/auth/phone/verify-otp`
- **Purpose**: Verifies phone sign-in code and issues JWT access and refresh tokens.
- **Request Body**:
  ```json
  {
    "phoneNumber": "+919876543210",
    "otp": "123456",
    "fullName": "Rahul Sharma",
    "birthProfile": {
      "name": "Rahul Sharma",
      "dateOfBirth": "1998-08-15",
      "timeOfBirth": "08:30:00",
      "latitude": 28.6139,
      "longitude": 77.2090,
      "timezone": "Asia/Kolkata",
      "placeName": "New Delhi, India"
    }
  }
  ```
- **Response**: HTTP 200
  ```json
  {
    "user": {
      "id": "usr_...",
      "fullName": "Rahul Sharma",
      "phoneNumber": "+919876543210",
      "isPhoneVerified": true,
      "role": "USER",
      "profileComplete": true
    },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "...",
      "expiresIn": "15m"
    },
    "isNewAccount": true
  }
  ```
- **Behaviors**:
  - Rejects wrong or expired codes with HTTP 401 `This code has expired or is invalid. Request a new one.`.
  - Rejects suspended or deleted accounts with HTTP 403 `ACCOUNT_BLOCKED_MESSAGE`.
  - Rejects staff accounts with HTTP 403 `This is a staff account. Sign in at the admin panel with your e-mail address and password.`.
  - Marks `phoneVerifiedAt`. If new user, marks `isNewAccount: true`.
  - Creates initial birth profile if provided.

### `POST /api/v1/auth/email/send-otp`
- **Purpose**: Dispatches a 6-digit sign-in code via email.
- **Request Body**:
  ```json
  { "email": "customer@example.com" }
  ```
- **Response**: HTTP 200
  ```json
  {
    "success": true,
    "message": "Verification code sent to your e-mail address.",
    "email": "customer@example.com",
    "expiresIn": 600
  }
  ```

### `POST /api/v1/auth/email/verify-otp`
- **Purpose**: Verifies email sign-in code and issues session tokens.
- **Request Body**:
  ```json
  {
    "email": "customer@example.com",
    "otp": "123456",
    "fullName": "Rahul Sharma"
  }
  ```
- **Response**: HTTP 200 (same structure as phone verification).

---

## 3. Account Linking Endpoints (Authenticated)

Signed-in customers can add and verify their other identifier (e.g., adding a phone number to an email-created account or vice versa).

### `POST /api/v1/auth/link-phone`
- **Auth**: Requires `Bearer <accessToken>`.
- **Request Body**:
  ```json
  { "phoneNumber": "+919876543210", "otp": "123456" }
  ```
- **Behavior**:
  - The code must have been sent via `POST /auth/phone/send-otp`.
  - If the phone number is already verified on another active customer account, returns HTTP 409 Conflict.
  - If the phone number was held by a pending placeholder record, that placeholder is removed and the number is linked to the current user.
  - Returns updated user profile.

### `POST /api/v1/auth/link-email`
- **Auth**: Requires `Bearer <accessToken>`.
- **Request Body**:
  ```json
  { "email": "user@example.com", "otp": "123456" }
  ```
- **Behavior**: Same conflict and pending resolution logic as `link-phone`.

---

## 4. Profile & Session Management

### `GET /api/v1/auth/me`
- **Auth**: Requires `Bearer <accessToken>`.
- **Response**: Current user profile including completeness check (`fullName`, verified phone).

### `PATCH /api/v1/auth/me`
- **Auth**: Requires `Bearer <accessToken>`.
- **Request Body**:
  ```json
  { "fullName": "New Name" }
  ```
- **Note**: Does not allow changing phone or email directly; those require OTP verification.

### `POST /api/v1/auth/refresh`
- **Request Body**:
  ```json
  { "refreshToken": "..." }
  ```
- **Response**: Rotated refresh token + new access token. Enforces check for suspended accounts.

### `POST /api/v1/auth/logout`
- **Request Body**:
  ```json
  { "refreshToken": "..." }
  ```
- **Behavior**: Revokes refresh token in database.

---

## 5. Retired Customer Endpoints (HTTP 410)

Older versions of mobile or web clients attempting to access deprecated auth routes receive HTTP 410 `AUTH_METHOD_REMOVED`:

| Endpoint | Status | Message |
|---|---|---|
| `POST /api/v1/auth/register` | 410 | Signing in with a password is no longer available. Please update the app, then sign in with a one-time code sent to your phone number or e-mail address. |
| `POST /api/v1/auth/login` | 410 | Signing in with a password is no longer available. Please update the app, then sign in with a one-time code sent to your phone number or e-mail address. |
| `POST /api/v1/auth/verify-email` | 410 | Signing in with a password is no longer available. Please update the app, then sign in with a one-time code sent to your phone number or e-mail address. |
| `POST /api/v1/auth/resend-verification` | 410 | Signing in with a password is no longer available. Please update the app, then sign in with a one-time code sent to your phone number or e-mail address. |
| `POST /api/v1/auth/google` | 410 | Google sign-in is no longer available. Please update the app, then sign in with a one-time code sent to your phone number or to the e-mail address of your Google account. |
| `POST /api/v1/auth/link-google` | 410 | Google sign-in is no longer available. Please update the app, then sign in with a one-time code sent to your phone number or to the e-mail address of your Google account. |

---

## 6. Staff Password Reset Endpoints

Preserved for administrative staff accounts only:

### `POST /api/v1/auth/forgot-password`
- **Request Body**:
  ```json
  { "email": "admin@astrosushil.com" }
  ```
- **Response**: Uniform response regardless of whether the email exists, is a customer, or is a staff member:
  `"If this address belongs to a staff account, a reset code has been sent to it. Customers sign in with a one-time code and have no password."`
- **Behavior**: Sends reset email with 6-digit code only if user has a staff role or active staff profile.

### `POST /api/v1/auth/reset-password`
- **Request Body**:
  ```json
  {
    "email": "admin@astrosushil.com",
    "otp": "123456",
    "newPassword": "NewStrongPassword123!"
  }
  ```
- **Behavior**:
  - Validates OTP with purpose `PASSWORD_RESET`.
  - Verifies account is a staff account.
  - Updates `passwordHash`.
  - Revokes all active refresh tokens for the user.

---

## 7. Test Helpers (`apps/api/tests/helpers/auth-session.ts`)

For integration tests that require an authenticated customer without going through OTP SMS/email flows:
- `createTestCustomerSession(app, overrides)`: Creates a verified user in database with full profile, generates valid JWT access and refresh tokens.
- `installOtpInbox()`: Mock in-memory messaging providers to capture sent SMS/email codes during auth tests.
- `clearOtpSendLimits()`: Cleans up the `otp_send_logs` table before and after test runs.
- `expireOtpCooldown(userId)`: Simulates expiration of the 60s resend timer for deterministic cooldown testing.

