# Astro Sushil Authentication System Documentation

This document describes the complete architecture, data flows, API specifications, database schemas, and security controls for the email authentication, email verification, and password reset flows in **Astro Sushil**.

---

## 1. Core Architecture Overview

Astro Sushil implements a secure, deterministic email authentication system adhering to modular monorepo principles and strict security standards:

1. **Frontend Client**: Flutter Mobile Application (`apps/mobile`) communicating via REST APIs.
2. **Backend API**: Node.js + Fastify service (`apps/api`) managing authentication routes, rate limiting, and password cryptography.
3. **Database**: PostgreSQL managed via Prisma ORM with atomic transactions for user and birth profile initialization.
4. **Email Service**: Decoupled SMTP transport abstraction with HTML/text templates (`EmailService`).

---

## 2. Authentication Flows

```
[Flutter App]                          [Fastify API]                         [PostgreSQL DB]
      │                                      │                                      │
      ├─────── POST /auth/register ─────────►│                                      │
      │   (Email, Pass, Name, BirthData)     ├───── Transaction: Create User ──────►│
      │                                      ├───── Transaction: Create BirthProfile►│
      │                                      ├───── Transaction: Store Hashed OTP ─►│
      │                                      ├───── Send Verification Email ───────►│
      │◄────── requiresEmailVerification ────┤                                      │
      │                                      │                                      │
      ├─────── POST /auth/verify-email ─────►│                                      │
      │         (Email, 6-digit OTP)         ├───── Verify OTP & Expire Record ────►│
      │                                      ├───── Set emailVerifiedAt = NOW() ───►│
      │◄────── Authenticated Session ────────┤                                      │
```

### Flow Specifications:

1. **Registration**:
   - `POST /api/v1/auth/register`
   - Accepts `email`, `password`, optional `fullName`, optional `phoneNumber`, and optional `birthProfile` object (`name`, `dateOfBirth`, `timeOfBirth`, `latitude`, `longitude`, `timezone`, `placeName`).
   - Hashes passwords using bcrypt (12 salt rounds).
   - Stores user and initial birth profile in a single database transaction.
   - Generates a cryptographically secure 6-digit OTP, stores a SHA-256 hash with 10-minute expiration, and dispatches a verification email.
   - Returns `{ "requiresEmailVerification": true, "email": "user@example.com" }`.

2. **Email Verification**:
   - `POST /api/v1/auth/verify-email`
   - Accepts `email` and `otp`.
   - Validates OTP hash, purpose (`EMAIL_VERIFICATION`), attempt limit (< 5 attempts), and expiry.
   - Sets `emailVerifiedAt` timestamp and returns JWT access token (`15m`) & refresh token (`7d`).

3. **Login**:
   - `POST /api/v1/auth/login`
   - Checks user existence and verifies password hash.
   - If `emailVerifiedAt` is `null`, returns `{ "requiresEmailVerification": true }` and sends a new verification OTP (respecting cooldown).
   - If verified, issues authenticated JWT session tokens.

4. **Resend OTP**:
   - `POST /api/v1/auth/resend-verification`
   - Enforces a **60-second cooldown rate limit** between resend requests per user.
   - Invalidates previous active OTPs for `EMAIL_VERIFICATION`.

5. **Forgot Password**:
   - `POST /api/v1/auth/forgot-password`
   - Accepts `email`.
   - Returns generic response (`"If an account exists for this email, a reset code has been sent."`) to prevent account enumeration attacks.
   - Generates 6-digit OTP for `PASSWORD_RESET` purpose with 10-minute expiry.

6. **Password Reset**:
   - `POST /api/v1/auth/reset-password`
   - Accepts `email`, `otp`, `newPassword`.
   - Verifies OTP purpose (`PASSWORD_RESET`), updates `user.passwordHash`, and revokes active refresh tokens.

---

## 3. Development / Staging Master OTP (`4444`)

> [!WARNING]
> **DEVELOPMENT / STAGING ONLY REQUIREMENT**
>
> The master OTP `4444` is explicitly designed for testing automation in development and staging environments.
>
> **CRITICAL SECURITY RULE**: `4444` **MUST NEVER WORK IN PRODUCTION**.

### Production Restriction Architecture:

```typescript
public isDevMasterOtp(inputOtp: string): boolean {
  // STRICT SECURITY ENFORCEMENT: Never allowed in production!
  if (config.NODE_ENV === 'production') {
    return false;
  }
  if (!config.ALLOW_DEV_MASTER_OTP) {
    return false;
  }
  const devMasterCode = config.DEV_MASTER_OTP || '4444';
  return inputOtp === devMasterCode;
}
```

- When `NODE_ENV=production`, `isDevMasterOtp()` returns `false` unconditionally.
- Even in development, `4444` bypasses ONLY the random-code hash comparison. It **STILL ENFORCES** user existence, rate limits, attempt tracking, and OTP purpose checks.
- The Flutter application contains **NO HARDCODED 4444 OR MASTER OTP REFERENCES**.

---

## 4. OTP Storage & Lifecycle Security

- **Storage**: OTPs are NEVER stored as plain text. The database stores a SHA-256 hash (`codeHash`).
- **Expiry**: OTPs expire in **10 minutes**.
- **Attempt Limits**: Maximum **5 failed attempts**. On the 5th failed attempt, the OTP is invalidated.
- **Purpose Isolation**: `EMAIL_VERIFICATION` OTPs cannot be used for `PASSWORD_RESET` and vice versa.
- **Invalidation**: Upon successful usage or new OTP request, previous active OTPs for that user and purpose are marked `usedAt = NOW()`.

---

## 5. Database Schema & Persistence

### Models:
```prisma
model User {
  id              String         @id @default(uuid())
  email           String         @unique
  passwordHash    String
  fullName        String?
  phoneNumber     String?
  emailVerifiedAt DateTime?
  role            Role           @default(USER)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  birthProfiles    BirthProfile[]
  refreshTokens   RefreshToken[]
  otpVerifications OtpVerification[]
  ...
}

model OtpVerification {
  id        String              @id @default(uuid())
  userId    String
  codeHash  String
  purpose   VerificationPurpose // EMAIL_VERIFICATION | PASSWORD_RESET
  expiresAt DateTime
  attempts  Int                 @default(0)
  usedAt    DateTime?
  createdAt DateTime            @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  ...
}
```

---

## 6. Email Configuration

Set environment variables in `apps/api/.env`:

```env
NODE_ENV=development
DEV_MASTER_OTP=4444
ALLOW_DEV_MASTER_OTP=true

EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=smtp_user
EMAIL_PASSWORD=smtp_password
EMAIL_FROM="Astro Sushil <noreply@astrosushil.com>"
```

For production deployments:
```env
NODE_ENV=production
ALLOW_DEV_MASTER_OTP=false
DEV_MASTER_OTP=
```

---

## 7. Guest Mode Compatibility

Guest users retain full access to free tools without database user registration. When a guest user decides to register or sign in, any locally saved guest birth profile is seamlessly migrated to their newly verified account.
