# Auth and PDF Reliability Audit Report

**Project:** Astro Sushil  
**Date:** 2026-10-05  
**Auditor / Implementation:** Antigravity AI Engineering Agent  
**Scope:** Consumer Authentication Migration (Phone + OTP, Google Sign-In, Account Linking), Security Constraints, Multi-Device Session Reliability, and Multi-Page PDF Generation/Viewing/Download Architecture.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Authentication Architecture (Before vs After)](#2-authentication-architecture-before-vs-after)
3. [Phone + OTP Flow & Implementation Details](#3-phone--otp-flow--implementation-details)
4. [Google Sign-In Flow & Token Verification](#4-google-sign-in-flow--token-verification)
5. [Account Linking & Conflict Resolution](#5-account-linking--conflict-resolution)
6. [Guest-to-Authenticated Account Migration](#6-guest-to-authenticated-account-migration)
7. [Device Session Management & Token Refresh Reliability](#7-device-session-management--token-refresh-reliability)
8. [Database Schema Migrations](#8-database-schema-migrations)
9. [API Surface & Endpoints](#9-api-surface--endpoints)
10. [Flutter Mobile Implementation](#10-flutter-mobile-implementation)
11. [Admin Portal Compatibility & Scope Freeze](#11-admin-portal-compatibility--scope-freeze)
12. [PDF 1-Page Regression Root Cause Analysis](#12-pdf-1-page-regression-root-cause-analysis)
13. [End-to-End Multi-Page PDF Architecture](#13-end-to-end-multi-page-pdf-architecture)
14. [Report Reuse Rule Verification](#14-report-reuse-rule-verification)
15. [Security & Edge-Case Protection](#15-security--edge-case-protection)
16. [Test Coverage & Verification Results](#16-test-coverage--verification-results)
17. [Production Readiness & Environment Variables](#17-production-readiness--environment-variables)
18. [Troubleshooting Guide & Observability](#18-troubleshooting-guide--observability)
19. [Future Recommendations](#19-future-recommendations)

---

## 1. Executive Summary

This engineering audit details the complete overhaul of Astro Sushil's consumer authentication system and the resolution of the critical multi-page PDF viewing/download regression.

### Key Deliverables Completed:
- **Phone + OTP Primary Auth:** Implemented E.164 canonical normalization (`+91` default fallback), SHA-256 OTP hashing in PostgreSQL, 60s cooldown, max 5 verification attempts, and strict production protection for development OTPs.
- **Google Sign-In:** Added backend ID token validation via standard Google OAuth2 verification, mapping the immutable `sub` claim to `User.googleId`.
- **Seamless Account Linking:** Provided atomic linking endpoints (`/api/v1/auth/link-phone` and `/api/v1/auth/link-google`) enabling users to connect their phone and Google identities without duplicate account creation or data loss.
- **Multi-Page PDF Viewing & Download Fix:** Resolved coordinate bounds overflow and single-page fallback bugs in `report-pdf.service.ts` and `reports.service.ts`, added missing `Content-Length` headers in Fastify, and eliminated PDF truncation in Flutter's `PdfPreview`.
- **Zero Regression on Business Invariants:** Preserved deterministic astrology calculations, strict report reuse on completed reports, and Admin Panel scope freeze.

---

## 2. Authentication Architecture (Before vs After)

```
========================================================================================
BEFORE: Email + Password Centric
========================================================================================
[ Flutter Mobile / Web ] ---> POST /auth/login (email + password)
                          ---> POST /auth/register (email + password)
                          - High friction for mobile users
                          - Password recovery friction
                          - Inability to verify Indian mobile numbers directly

========================================================================================
AFTER: Modern Consumer Identity (Phone + OTP, Google Sign-In, Optional Linking)
========================================================================================
[ Flutter Client / Web ]
      │
      ├── (1) Phone OTP Flow:
      │         POST /auth/phone/send-otp   ──> Rate-limited (60s cooldown, SHA-256 hash)
      │         POST /auth/phone/verify-otp ──> 5-attempt check, Issues JWT access + refresh
      │
      ├── (2) Google Sign-In Flow:
      │         POST /auth/google           ──> Server-side Google ID Token verification (sub)
      │
      ├── (3) Identity Linking:
      │         POST /auth/link-phone       ──> Attach verified phone to active session
      │         POST /auth/link-google      ──> Attach Google ID to active session
      │
      └── (4) Guest Migration:
                Seamless transfer of birth profiles, reports, and orders upon signup
```

---

## 3. Phone + OTP Flow & Implementation Details

### E.164 Normalization (`apps/api/src/utils/phone.ts`)
- Accepts standard 10-digit Indian mobile numbers (e.g. `9876543210`), prefixed with `+91`, `91`, or `0`.
- Strips non-digit formatting characters (` `, `-`, `(`, `)`).
- Validates E.164 format via regex: `/^\+[1-9]\d{6,14}$/`.

### OTP Security Invariants (`apps/api/src/modules/auth/otp.service.ts`)
- **Generation:** 6-digit cryptographically secure pseudorandom numbers (`crypto.randomInt(100000, 999999)`).
- **Hashing:** OTPs are SHA-256 hashed with salt before storage in PostgreSQL (`OtpVerification` table). Cleartext OTP is never stored in DB or logged.
- **Expiry:** Default 5 minutes (configurable via `OTP_EXPIRY_SECONDS`).
- **Cooldown:** Strict 60-second cooldown enforced between requests to the same phone number.
- **Max Attempts:** Maximum 5 verification attempts permitted per OTP record. Exceeding 5 attempts immediately invalidates the OTP.
- **Single-Use:** OTP is marked as `consumedAt = new Date()` upon successful verification, preventing replay attacks.
- **Dev Master OTP Guard:** The master OTP (`DEV_OTP`, e.g. `123456`) is **strictly prohibited in production**. In `otp.service.ts`:
  ```typescript
  if (config.NODE_ENV === 'production') {
    return false; // Absolute guard against master OTP in production
  }
  ```

---

## 4. Google Sign-In Flow & Token Verification

### Google Auth Service (`apps/api/src/modules/auth/google-auth.service.ts`)
- **Protocol:** The Flutter mobile client obtains an `idToken` from Google Sign-In SDK and sends it to `POST /api/v1/auth/google`.
- **Verification:** The backend validates the ID token signature, expiration, issuer (`accounts.google.com` or `https://accounts.google.com`), and audience (`GOOGLE_CLIENT_ID`) via Google OAuth2 tokeninfo endpoints.
- **Account Lookup & Resolution:**
  1. Match existing user by `googleId`.
  2. If not matched, match existing user by verified `email`. If found, link `googleId` to existing record.
  3. If no user exists, create a new user record with `googleId`, `email`, `fullName`, and `isEmailVerified: true`.

---

## 5. Account Linking & Conflict Resolution

Users can link their phone number and Google account together without creating duplicate records or losing purchase history:

1. **`POST /api/v1/auth/link-phone`**:
   - Requires authenticated session (`Authorization: Bearer <jwt>`).
   - Requires valid `phoneNumber` and `otp`.
   - Validates OTP via `OtpService`.
   - Checks if phone number is already claimed by another user:
     - If claimed by another user: Returns `409 Conflict` with error message `"Phone number is already associated with another account."`
     - If unassigned: Updates current user with `phoneNumber` and `phoneVerifiedAt`.
2. **`POST /api/v1/auth/link-google`**:
   - Requires authenticated session and valid `idToken`.
   - Validates Google token.
   - Checks if `googleId` is already claimed:
     - If claimed by another user: Returns `409 Conflict`.
     - If unassigned: Sets `googleId` on current user.

---

## 6. Guest-to-Authenticated Account Migration

When a user begins as a Guest and later authenticates via Phone OTP or Google:
- The client passes `guestUserId` in the request body.
- The backend migrates all associated entities:
  - `BirthProfile` records reassigned from `guestUserId` to `user.id`.
  - `Report` records reassigned to `user.id`.
  - `Order` records reassigned to `user.id`.
- The ephemeral guest user record is purged cleanly.

---

## 7. Device Session Management & Token Refresh Reliability

- **JWT Tokens:**
  - Access Token: Short-lived (15 minutes), containing `userId`, `role`, `sessionVersion`.
  - Refresh Token: Long-lived (30 days), stored hashed in `RefreshToken` table with `deviceFingerprint` and `ipAddress`.
- **Multi-Device Support:** Users can be logged in concurrently across multiple mobile devices and web browsers.
- **Refresh Flow (`POST /api/v1/auth/refresh`):**
  - Validates active refresh token in database.
  - Automatically issues a fresh access token (and rotates refresh token).
- **Session Revocation:**
  - `POST /api/v1/auth/logout`: Revokes the specific device refresh token.
  - `POST /api/v1/auth/logout-all`: Increments user's `sessionVersion`, invalidating all existing JWTs across all devices.

---

## 8. Database Schema Migrations

The Prisma schema (`apps/api/prisma/schema.prisma`) was updated to accommodate phone-first and federated identities:

```prisma
model User {
  id              String         @id @default(uuid())
  email           String?        @unique
  phoneNumber     String?        @unique
  phoneVerifiedAt DateTime?
  googleId        String?        @unique
  passwordHash    String?
  fullName        String?
  role            UserRole       @default(USER)
  status          UserStatus     @default(ACTIVE)
  isGuest         Boolean        @default(false)
  sessionVersion  Int            @default(1)
  // relations...
}

model OtpVerification {
  id          String    @id @default(uuid())
  phoneNumber String
  hashedOtp   String
  attempts    Int       @default(0)
  maxAttempts Int       @default(5)
  expiresAt   DateTime
  consumedAt  DateTime?
  createdAt   DateTime  @default(now())

  @@index([phoneNumber, createdAt])
}
```

---

## 9. API Surface & Endpoints

| Endpoint | Method | Auth Required | Description |
|---|---|---|---|
| `/api/v1/auth/phone/send-otp` | `POST` | No | Request 6-digit OTP for phone login/registration |
| `/api/v1/auth/phone/verify-otp` | `POST` | No | Verify phone OTP and obtain JWT tokens |
| `/api/v1/auth/google` | `POST` | No | Authenticate via Google ID token |
| `/api/v1/auth/link-phone` | `POST` | Yes | Link verified phone number to active account |
| `/api/v1/auth/link-google` | `POST` | Yes | Link Google identity to active account |
| `/api/v1/auth/login` | `POST` | No | Email + password login (legacy/fallback) |
| `/api/v1/auth/register` | `POST` | No | Email + password registration (legacy/fallback) |
| `/api/v1/auth/refresh` | `POST` | No | Exchange refresh token for new access token |
| `/api/v1/auth/logout` | `POST` | Yes | Invalidate current session |
| `/api/v1/auth/logout-all` | `POST` | Yes | Invalidate all sessions across all devices |
| `/api/v1/reports/:id/pdf` | `GET` | Yes | Download or view full multi-page PDF report |

---

## 10. Flutter Mobile Implementation

### Redesigned Screens & State Management
- **`LoginScreen` (`apps/mobile/lib/features/auth/screens/login_screen.dart`):**
  - Primary UI: Phone number input field with `+91` country code selector, "Send OTP" CTA.
  - Federated Auth: "Continue with Google" button with official branding.
  - Guest Mode: "Explore as Guest" option.
  - Secondary / Legacy: Collapsible Email & Password login expandable on demand.
  - Safe Layout: Keyboard-dismissible, scrollable, overflow-safe.
- **`VerificationScreen` (`apps/mobile/lib/features/auth/screens/verification_screen.dart`):**
  - 6-digit individual digit input fields with auto-focus progression and paste support.
  - Dynamic 60-second countdown timer for OTP resend.
  - Masked destination indicator (e.g., `+91 98*** **210`).
  - Automatic prompt to migrate guest data upon successful verification.
- **`AuthRepository` & `AuthProvider`:**
  - Full StateNotifier integration for `sendPhoneOtp`, `verifyPhoneOtp`, `signInWithGoogle`, and account linking.
  - Secure storage of tokens via `flutter_secure_storage`.

---

## 11. Admin Portal Compatibility & Scope Freeze

- **Scope Freeze Compliance:** No new admin features or route modifications were added to `apps/admin`, complying strictly with Phase 12 scope freeze.
- **Compatibility:** Backend admin services (`apps/api/src/modules/admin/admin.service.ts`) and notification services were updated with null-safe handling for users created via phone or Google (where `email` or `passwordHash` is null).

---

## 12. PDF 1-Page Regression Root Cause Analysis

A systematic root cause analysis was conducted across the 4 layers of PDF generation and rendering:

```
+---------------------------------------------------------------------------------------+
| PDF Multi-Page Regression Root Causes Identified & Resolved                           |
+---------------------------------------------------------------------------------------+
| 1. Report PDF Engine (report-pdf.service.ts):                                         |
|    - `buildPlanetaryPdf` drew all section titles, tables, and paragraphs sequentially |
|      without checking vertical page bounds (`curY < 100`).                           |
|    - Consequence: All content after page 1 was drawn at negative Y coordinates,       |
|      resulting in a single-page document with missing sections.                       |
|                                                                                       |
| 2. Backend Fallback Generator (reports.service.ts):                                   |
|    - `generateReportPdfBuffer` contained a single-page summary fallback that only     |
|      rendered a single summary page when object storage was bypassed in dev.          |
|                                                                                       |
| 3. Fastify HTTP PDF Endpoint (reports.routes.ts):                                     |
|    - Omitted `Content-Length` header on PDF stream/buffer responses, causing partial  |
|      stream truncation on mobile networks.                                            |
|                                                                                       |
| 4. Flutter Mobile PDF Viewer (career_report_pdf_screen.dart):                         |
|    - `PdfPreview` used default dynamic layout mode which broke multi-page pagination   |
|      on certain screen densities. Set `dynamicLayout: false` to force fixed layout.   |
+---------------------------------------------------------------------------------------+
```

---

## 13. End-to-End Multi-Page PDF Architecture

```
[ Database / Calculations ]
           │
           ▼
[ ReportEngine.generatePdf(data) ]
           │
           ├── Dynamic Page Height Monitoring (`curY`)
           ├── Automatic `pdf.addPage()` & Header/Footer Re-rendering when `curY < 100`
           └── Generates Complete Multi-Page PDF Document (Pages 1..N)
           │
           ▼
[ Fastify GET /api/v1/reports/:id/pdf ]
           │
           ├── Headers: Content-Type: application/pdf
           ├── Headers: Content-Disposition: attachment; filename="report-..."
           ├── Headers: Content-Length: <exact byte length>
           └── Headers: Cache-Control: private, max-age=3600
           │
           ▼
[ Flutter Networking & Dio Client ]
           │
           ├── Receives full binary stream with verified byte count
           └── Caches bytes in memory / temporary file
           │
           ▼
[ Flutter PdfPreview Widget ]
           │
           ├── `dynamicLayout: false` (Preserves native multi-page pagination)
           ├── `canChangePageFormat: false`
           ├── Native multi-page scroll & zoom
           └── Native Share & Print actions enabled
```

---

## 14. Report Reuse Rule Verification

- **Rule:** Reopening or viewing an existing completed report **MUST** reuse the existing `Report.id` and stored PDF without re-running planetary computations or creating new database records. Explicit regeneration requests create a new versioned report.
- **Verification:**
  - `ReportsService.getReportById` checks if status is `COMPLETED` and returns the existing report record.
  - `ReportsService.downloadReportPdf` serves the existing pre-generated PDF buffer or storage URL.
  - Verified by integration test: `GET /api/v1/reports/:id/pdf` returns the existing report PDF with identical ID.

---

## 15. Security & Edge-Case Protection

1. **IDOR Prevention:** Accessing reports belonging to another user returns `404 Not Found` (never leaks existence or contents).
2. **Rate Limiting:** OTP endpoints enforce IP and phone rate-limiting to prevent SMS bombing.
3. **Data Completeness Validation:** `validateAstrologyDataForReport` validates birth chart presence before report generation; incomplete charts return `422 Unprocessable Entity` with `INCOMPLETE_ASTROLOGY_DATA`.
4. **Token Security:** Bearer token extraction handles malformed headers and enforces strict expiration.
5. **Production Master OTP Lockout:** Tested and verified that `DEV_OTP` is completely ignored and rejected when `NODE_ENV === 'production'`.

---

## 16. Test Coverage & Verification Results

### Backend Integration Tests (`apps/api`)
```
✓ tests/integration/auth-phone-google.test.ts (13 tests) - 100% Passed
  - Phone OTP request & validation
  - 60-second cooldown enforcement
  - Max attempt lockout (5 attempts)
  - Single-use OTP invalidation
  - Production master OTP rejection
  - Google Sign-In with new & existing accounts
  - Phone & Google Account linking & conflict detection
  - Multi-device token refresh & session revocation

✓ tests/integration/reports.test.ts (7 tests) - 100% Passed
  - Authenticated Kundli report generation & PDF download
  - Planetary multi-page PDF generation
  - Guest download rejection (401 Unauthorized)
  - IDOR cross-user protection (404 Not Found)
  - Incomplete chart data validation (422 Unprocessable Entity)
  - Token refresh during download
```

### Flutter Widget Tests (`apps/mobile`)
```
✓ test/widget/login_screen_test.dart & phone_auth_and_pdf_test.dart (6 tests) - 100% Passed
  - Phone login UI rendering (+91 selector, OTP CTA, Google button)
  - Password login collapsible mode toggle
  - Guest authentication action
  - 6-digit OTP verification UI with countdown timer
  - Multi-page PDF generation without truncation (full page count rendered)
```

---

## 17. Production Readiness & Environment Variables

| Variable | Required | Description | Example / Recommended |
|---|---|---|---|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/astro` |
| `JWT_SECRET` | Yes | Secret for signing JWT access tokens | `<64-character random hex>` |
| `JWT_REFRESH_SECRET` | Yes | Secret for signing refresh tokens | `<64-character random hex>` |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth2 Client ID | `*.apps.googleusercontent.com` |
| `OTP_EXPIRY_SECONDS` | No | OTP validity duration (default: 300s) | `300` |
| `OTP_COOLDOWN_SECONDS` | No | Cooldown between OTP sends (default: 60s) | `60` |
| `DEV_OTP` | No | Development-only OTP (Disabled in prod) | `123456` |

---

## 18. Troubleshooting Guide & Observability

- **SMS OTP Not Received:**
  - Check logger output for `[OtpService] Requesting OTP for phone`.
  - Verify phone number is in E.164 format (`+91...`).
  - Check if request is throttled by 60s cooldown (`OTP_COOLDOWN_ACTIVE`).
- **Google Sign-In Rejection:**
  - Ensure client ID matches between Flutter app (`google-services.json` / GoogleService-Info.plist) and API (`GOOGLE_CLIENT_ID`).
- **PDF Truncation on Mobile:**
  - Verify `PdfPreview` has `dynamicLayout: false`.
  - Inspect backend `Content-Length` header matches byte length of generated buffer.

---

## 19. Future Recommendations

1. **SMS Gateway Integration:** Plug in production SMS aggregators (e.g. AWS SNS, MSG91, or Twilio) via the `OtpService.sendOtpSms` abstraction hook.
2. **Apple Sign-In:** For iOS App Store compliance, implement Apple Sign-In using the same federated identity architecture established for Google Sign-In.
3. **Biometric Authentication:** Add local biometric (Face ID / Fingerprint) unlock on Flutter mobile to reuse stored refresh tokens without re-entering OTP.
