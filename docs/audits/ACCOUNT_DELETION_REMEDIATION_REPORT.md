# Astro Sushil — Self-Service Account Deletion Remediation Report

**Date:** 2026-10-31  
**Target Environment:** Staging & Production Readiness  
**Specification References:** Apple App Store Review Guideline 5.1.1(v), Google Play User Data Policy, Section 128 of the Companies Act 2013, Rule 56 of CGST Rules 2017.

---

## 1. Executive Summary & Baseline Verification

During the staging-readiness audit, a critical compliance defect was verified:
- **Baseline Mobile State:** The Flutter mobile client featured a "Delete Account" button in `AppSettingsScreen` (`_confirmAccountDeletion`), but it only displayed an informational alert dialog with no underlying backend invocation or session invalidation.
- **Baseline Backend State:** The API gateway (`apps/api`) lacked any authenticated self-service account deletion route (`DELETE /api/v1/users/me`), meaning users were unable to initiate self-service deletion, violating Apple App Store Review Guideline 5.1.1(v).
- **Database Schema Risk:** Directly executing a naive `prisma.user.delete({ where: { id: userId } })` would trigger `onDelete: Cascade` across foreign keys, destroying `Order`, `OrderItem`, and `Refund` records, thereby violating Indian statutory tax accounting laws requiring an 8-year record retention horizon.

### Remediation Completed
1. **Authenticated Self-Service Endpoint:** Implemented `DELETE /api/v1/users/me` requiring an authenticated JWT bearer token and confirmation (`confirmation: 'DELETE'`).
2. **Safe Transactional PII Scrubbing:** Architected a deterministic transactional data scrubbing and anonymization routine that strips all personal identifiable information (PII) while preserving required financial audit trails.
3. **End-to-End Mobile Integration:** Connected the mobile UI to the backend endpoint with clear consequence disclosures, loading spinners, double-submission locking, local cache flushing, signed-out navigation, and full English/Hindi localization.
4. **Comprehensive Test Suites:** Developed and verified 6 backend integration tests (Vitest) and 6 mobile widget tests (Flutter Test), achieving a 100% pass rate.

---

## 2. Endpoint Specification: `DELETE /api/v1/users/me`

### Request Definition
- **Route:** `DELETE /api/v1/users/me`
- **Authentication:** Mandatory (`request.user.id` extracted strictly from validated JWT bearer session).
- **Body Schema (JSON):**
  ```json
  {
    "confirmation": "DELETE",
    "password": "OptionalSecurePassword123!"
  }
  ```
  - `confirmation` (string, required): Must equal `"DELETE"`.
  - `password` (string, optional): Required if the account is password-secured (email/password login). Accounts authenticated exclusively via Phone OTP or Google OAuth do not maintain a password and authenticate via session token identity.

### Response Definitions

#### Success (HTTP 200 OK)
```json
{
  "success": true,
  "message": "Your account and personal data have been permanently deleted and active sessions revoked in accordance with data privacy regulations. Financial order records have been anonymized for statutory tax compliance.",
  "deletedAt": "2026-10-31T02:00:00.000Z"
}
```

#### Reauthentication Failure (HTTP 401 Unauthorized)
```json
{
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "Incorrect password provided for account deletion reauthentication.",
    "requestId": "req-98765432"
  }
}
```

#### Missing/Invalid Confirmation (HTTP 400 Bad Request)
```json
{
  "error": {
    "code": "CONFIRMATION_REQUIRED",
    "message": "Confirmation string 'DELETE' is required to permanently delete your account.",
    "requestId": "req-98765433"
  }
}
```

---

## 3. Data Category Retention, Anonymization & Deletion Matrix

The table below details the specific retention and deletion policy implemented for each database entity:

| Data Category / Entity | Action | Retention Horizon | Technical Implementation | Statutory / Compliance Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **User Identity (`User`)** | **Anonymized & Scrubbed** | Retained (as scrubbed placeholder) | `email: null`, `phoneNumber: null`, `googleId: null`, `fullName: 'Deleted User'`, `passwordHash: null`. | Strips all PII while keeping the UUID primary key intact to satisfy foreign keys for archived financial tax invoices. |
| **Birth Profiles (`BirthProfile`)** | **Hard Deleted** | Immediate (0 days) | `prisma.birthProfile.deleteMany({ where: { userId } })`. | Kundli birth data (DOB, TOB, latitude, longitude, birthplace) is sensitive personal data under DPDP Act / GDPR. |
| **Astrology Reports (`UserReport`)** | **Hard Deleted** | Immediate (0 days) | `prisma.userReport.deleteMany({ where: { userId } })`. | Contains personalized career/health interpretations and birth chart configurations. |
| **Consultation Appointments (`ConsultationBooking`)** | **Cancelled & Slot Restored** | Status preserved as `CANCELLED` | Active bookings updated to `CANCELLED`; linked `AppointmentSlot.status` restored to `AVAILABLE`. | Cancels future appointments and returns calendar time to practitioner while keeping calendar audit log. |
| **Course Access (`CourseAccess`)** | **Revoked** | Immediate (0 days) | `prisma.courseAccess.deleteMany({ where: { userId } })`. | Immediate termination of digital academy entitlements upon account closure. |
| **Digital Purchases (`DigitalPurchase`)** | **Revoked** | Immediate (0 days) | `prisma.digitalPurchase.deleteMany({ where: { userId } })`. | Prevents access to download URLs or e-book resources post-deletion. |
| **Shipping Addresses (`Address`)** | **Hard Deleted** | Immediate (0 days) | `prisma.address.deleteMany({ where: { userId } })`. | Physical home/office addresses deleted immediately. |
| **Order Notes & Shipping Details (`Order`)** | **PII Scrubbed & Archived** | 8 Years | `notes: null`, `shippingAddressSnapshot: null`. Financial amounts (`totalAmount`, `paymentStatus`, `razorpayPaymentId`) preserved. | Section 128 of the Companies Act 2013 and Rule 56 of CGST Rules 2017 mandate retaining tax records for 8 years. |
| **Refunds (`Refund`)** | **Archived** | 8 Years | Preserved as-is linked to `orderId`. | Statutory audit trail of banking reversals and tax adjustments. |
| **Payment Webhooks (`WebhookEvent`)** | **Archived** | 3 Years | Preserved as-is (contains Razorpay transaction IDs, no raw user passwords/PII). | Financial audit and dispute resolution trail. |
| **Refresh Tokens (`RefreshToken`)** | **Revoked & Deleted** | Immediate (0 days) | `prisma.refreshToken.deleteMany({ where: { userId } })`. | Instantly invalidates all active sessions across all devices. |
| **Push Tokens (`DeviceToken`)** | **Hard Deleted** | Immediate (0 days) | `prisma.deviceToken.deleteMany({ where: { userId } })`. | Prevents sending notifications, marketing, or transactional push messages post-deletion. |
| **One-Time Passwords (`Otp`)** | **Hard Deleted** | Immediate (0 days) | `prisma.otp.deleteMany({ where: { identifier: { in: identifiers } } })`. | Eliminates lingering verification codes. |
| **Audit Logs (`AuditLog`)** | **Immutable Compliance Entry** | Permanent | Inserts `action: 'USER_ACCOUNT_DELETED'`, `resource: 'User'`, `metadata: { reason: 'Self-service account deletion' }`. | Proof of regulatory compliance demonstrating that the request was processed and data purged. |

---

## 4. Security Controls & IDOR Protection

1. **Derived Server-Side Identity (Anti-IDOR):**
   - The deletion operation **never** accepts a `userId` in URL parameters, request headers, or JSON body.
   - The user ID is extracted directly from the verified cryptographic JWT bearer token (`request.user.id`). An attacker cannot target another user's account without possessing their valid, signed session token.

2. **Reauthentication for Password-Secured Users:**
   - If an account has an existing `passwordHash`, the user must provide their current password in the payload.
   - The backend validates the password using Argon2id/scrypt (`verifyPassword`) before executing the transaction.

3. **Immediate Cross-Device Session Invalidation:**
   - Deleting the account wipes all records in `RefreshToken` and drops device push tokens.
   - Subsequent requests with existing refresh tokens will fail, and token refreshes are rejected.

4. **Subsequent Access Denial:**
   - `getUserById(userId)` explicitly checks if the record has been anonymized (`fullName === 'Deleted User'` or `email === null`). If so, it returns `404 Not Found`.
   - Feature access guards in `feature-access.service.ts` reject deleted accounts immediately.

5. **Concurrency & Idempotency Safety:**
   - The deletion operation runs within an isolated `prisma.$transaction()`.
   - If a user sends concurrent or duplicate deletion requests, the transaction detects if the account is already anonymized and returns `HTTP 200 OK` idempotently without duplicate side-effects or database errors.

6. **Log Sanitization:**
   - Passwords, OTP codes, session tokens, and raw PII are strictly excluded from backend structured logs (`logger.info`). Only the anonymized `userId` and client IP are logged for audit compliance.

---

## 5. Mobile Client Integration

The Flutter mobile application (`apps/mobile`) has been connected to the real backend service:

1. **Location & Accessibility:**
   - Located in `AppSettingsScreen` under the Danger Zone section (`AppColors.error`).
   - Accessible only to authenticated users (hidden for guest users, who instead have an "Exit Guest Mode" option).

2. **Bilingual Consequence Disclosures:**
   - Displays an `AlertDialog` detailing exact consequences before confirmation:
     - All active sessions across all devices revoked.
     - Future consultation bookings cancelled.
     - Course and digital download access terminated.
     - Statutory tax rules & past invoice archive disclosure.
     - Irreversible action warning.
   - Full bilingual support in English and Hindi (Devanagari).

3. **Concurrency & Double-Submission Prevention:**
   - While the request is in flight (`isDeleting = true`), both the "Permanently Delete" and "Cancel" buttons are disabled (`onPressed: null`).
   - An in-line loading spinner (`CircularProgressIndicator`) and text ("Deleting account..." / "खाता हटाया जा रहा है...") are displayed.

4. **Local Cache & Storage Invalidation:**
   - Upon successful backend response, `clearAllLocalReportCache()` purges all cached PDF summaries and Kundli charts from device storage.
   - Secure storage keys (`accessToken`, `refreshToken`, `userProfile`, `isGuestMode`) are wiped.
   - A success SnackBar is presented, and the navigation stack is cleared via `pushAndRemoveUntil` to route the user to `OnboardingScreen`.

5. **Failure & Error Recovery:**
   - If the API returns an error or network connection fails, `isDeleting` resets to `false`.
   - An error SnackBar displays the server error message or a user-friendly fallback.
   - The user is **not** signed out or shown a false success state.

---

## 6. Test Verification & Execution Results

### Backend Integration Tests (Vitest)
Command executed:
```bash
npm test tests/integration/account-deletion.test.ts
```
**Results:** `6 passed (6), 100% pass rate`
```
✓ 1. Rejects unauthenticated DELETE /api/v1/users/me with HTTP 401
✓ 2. Rejects deletion if invalid password is provided for password-secured account (879ms)
✓ 3. Successfully deletes own account with valid confirmation (753ms)
✓ 4. Idempotent replay: Repeated DELETE /api/v1/users/me returns HTTP 200 without duplicate side-effects
✓ 5. Subsequent GET /api/v1/users/me by deleted user rejects with HTTP 404 (Not Found)
✓ 6. Deletion derives identity exclusively from token: Other user account is unaffected
```

### TypeScript Backend Build
Command executed:
```bash
npm run build
```
**Result:** `tsc` compiled with exit code 0 (zero errors).

### Mobile Widget Tests (Flutter Test)
Command executed:
```bash
flutter test test/widget/account_deletion_flow_test.dart
```
**Results:** `6 passed (6), 100% pass rate`
```
00:00 +0: Mobile Account Deletion Flow Tests 1. Displays confirmation dialog with comprehensive statutory consequence disclosures (English)
00:02 +1: Mobile Account Deletion Flow Tests 2. Cancellation dismisses dialog and leaves account intact without backend invocation
00:02 +2: Mobile Account Deletion Flow Tests 3. Successful deletion invokes backend with confirmation, clears cache, shows snackbar, and redirects to signed-out screen
00:03 +3: Mobile Account Deletion Flow Tests 4. API failure keeps user authenticated, shows recoverable error, and does not falsely report success
00:04 +4: Mobile Account Deletion Flow Tests 5. In-flight deletion shows loading indicator and prevents duplicate submissions
00:05 +5: Mobile Account Deletion Flow Tests 6. Hindi localization displays authentic Devanagari warnings and labels
00:05 +6: All tests passed!
```

### Mobile Static Analysis
Command executed:
```bash
flutter analyze test/widget/account_deletion_flow_test.dart --no-pub
flutter analyze lib --no-pub --no-fatal-infos
```
**Results:** Clean run, exit code 0, 0 compiler warnings or fatal errors.

---

## 7. Policy & Operational Questions for Product Owner & Legal Counsel

While the technical implementation complies with Apple App Store Review Guideline 5.1.1(v) and Indian statutory tax rules, the following operational and policy decisions must be reviewed and formally signed off by the product owner and legal counsel:

1. **Statutory Tax Invoice Retention Horizon (8 Years vs Shorter):**
   - *Current Implementation:* Retains anonymized `Order` headers (amounts, GST tax breakup, payment gateway reference) with scrubbed PII.
   - *Question for Legal:* Confirm that maintaining the `User.id` foreign key as a pseudonymized UUID satisfies DPDP Act 2023 "Right to Erasure" exemptions under Section 8 (statutory legal obligations) without requiring full database decoupling of historical invoices.

2. **Physical Shipping Courier Manifests (Blue Dart / Shiprocket):**
   - *Current Implementation:* Deletes shipping address from database (`Address` table) and sets `shippingAddressSnapshot: null` on `Order`.
   - *Question for Operations:* For physical consecrated items dispatched from Ayodhya Dham, third-party logistics aggregators (e.g. Shiprocket or Blue Dart) retain shipping manifests and AWB labels for 90–180 days. Does the organization require an automated webhook to instruct courier partners to scrub recipient address records once delivery is confirmed?

3. **Pending Dispatched Orders & Open Refunds:**
   - *Current Implementation:* Deletion cancels future consultation appointments, but already completed or in-transit physical orders remain in their existing status.
   - *Question for Product Owner:* Should a user be blocked from deleting their account if they have an active physical shipment with status `IN_TRANSIT` or a pending refund under dispute, or should deletion proceed with email notifications redirected to customer care?

4. **Practitioner Notes on Past Consultations:**
   - *Current Implementation:* Consultation bookings have their PII stripped and user profile detached, but astrologer private consultation notes remain tied to the anonymous consultation ID for quality assurance.
   - *Question for Legal:* Confirm whether astrologer clinical/predictive notes are considered company work product or user personal data requiring complete erasure.

---

## 8. Summary of Modified & Created Files

| File | Status | Description |
| :--- | :--- | :--- |
| `apps/api/src/modules/users/users.schemas.ts` | Modified | Added `deleteAccountSchema`, `DeleteAccountInput`, `deleteAccountResponseSchema`. |
| `apps/api/src/modules/users/users.service.ts` | Modified | Implemented `deleteOwnAccount` with transactional PII scrubbing; updated `getUserById` to return 404 for deleted users. |
| `apps/api/src/modules/users/users.routes.ts` | Modified | Registered authenticated `DELETE /me` endpoint. |
| `apps/api/src/services/feature-access.service.ts` | Modified | Added audit check for `USER_ACCOUNT_DELETED` to prevent access to protected resources. |
| `apps/api/tests/integration/account-deletion.test.ts` | Created | 6 integration tests verifying auth, PII scrubbing, financial record retention, and idempotency. |
| `apps/mobile/lib/features/auth/data/auth_repository.dart` | Modified | Added `deleteAccount({String? confirmation, String? password})`. |
| `apps/mobile/lib/features/auth/providers/auth_provider.dart` | Modified | Added `deleteAccount` to `AuthNotifier`. |
| `apps/mobile/lib/features/settings/screens/app_settings_screen.dart` | Modified | Connected UI to `deleteAccount`, added dialog warnings, loading spinner, and cache cleanup. |
| `apps/mobile/test/widget/account_deletion_flow_test.dart` | Created | 6 widget tests verifying confirmation, cancellation, loading, success, failure, and Hindi locale. |
| `docs/audits/ACCOUNT_DELETION_REMEDIATION_REPORT.md` | Created | Comprehensive audit documentation. |
