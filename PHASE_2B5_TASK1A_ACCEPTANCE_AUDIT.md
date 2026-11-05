# Phase 2B.5 Task 1A: Final Independent Acceptance Audit Report

**Date of Audit:** 2026-11-05  
**Audit Type:** Read-Only Independent Acceptance Audit  
**Target:** Phase 2B.5 Task 1A — Payment Integration & Security Remediation  
**Auditor:** AI Coding Assistant (Antigravity Agent)  
**Final Recommendation:** **ACCEPT WITH CONDITIONS**

---

## Executive Summary & Acceptance Matrix

| # | Audit Requirement | Status | Summary Finding |
|---|---|:---:|---|
| **1.1** | **Native Razorpay Flutter SDK Dependency** | **PASS** | `razorpay_flutter: ^1.4.7` registered in `pubspec.yaml` and resolved in `pubspec.lock`. |
| **1.2** | **Actual Native SDK Invocation** | **PASS** | `NativeRazorpayCheckoutService` invokes `Razorpay.open(...)` with full options map. |
| **1.3** | **Order Parameters & Public Key** | **PASS** | Backend-provided `order_id`, `amount` (paise), `currency`, and `key` correctly bound. |
| **1.4** | **SDK Callbacks & Lifecycle** | **PASS** | Success, Error, and External Wallet callbacks registered and properly cleared via `dispose()`. |
| **1.5** | **Duplicate Callback Protection** | **PASS** | Guarded by `_isCheckoutActive` and `_hasHandledCallback` flags. |
| **1.6** | **Server Verification Before Report Generation** | **PASS** | `_handlePaymentSuccessCallback` requires backend HMAC verification before initiating generation. |
| **1.7** | **No Simulated Checkout Fallback in Production** | **PASS** | In-app mock checkout sheet removed from active code path; zero production mock fallbacks. |
| **1.8** | **Physical-Device Verification** | **UNVERIFIED** | Not tested on physical hardware or native Android/iOS emulators in this Linux CI/sandbox environment. |
| **2.1** | **All 5 Supported Report SKUs Mapped** | **PASS** | `CAREER`, `KUNDLI`, `PLANETARY_SUMMARY`, `CAREER_PROSITY`, and `MARRIAGE_COMPATIBILITY` all covered. |
| **2.2** | **In-Flight Concurrency Lock Scope** | **FAIL** | `inflightJobLocks` is process-local (`Map<string, Promise<any>>`); does not protect across multi-instance clusters. |
| **2.3** | **Active & Completed Report Reuse** | **PASS** | In-flight active jobs and completed reports reused cleanly without redundant generation. |
| **2.4** | **Stale Report Invalidation on Profile Update** | **PASS** | Profile modification (`profile.updatedAt > report.createdAt`) correctly invalidates stale report cache. |
| **2.5** | **Database Uniqueness & Queue Job Concurrency** | **FAIL** | No DB-level uniqueness constraint on `reports` table; simultaneous cross-instance requests can create duplicate BullMQ jobs. |
| **3.1** | **Authoritative Paid Order Requirement** | **PASS** | All SKUs strictly require active entitlement or verified `PAID` order; returns 403 Forbidden otherwise. |
| **3.2** | **Order Ownership & SKU Matching** | **PASS** | `order.userId === user.id` and SKU matching verified on both career and consumer generation paths. |
| **3.3** | **Pending / Failed Order Rejection** | **PASS** | Unpaid (`PENDING`), `FAILED`, or `CANCELLED` orders are strictly rejected with 403 Forbidden. |
| **3.4** | **Test Environment Security Parity** | **PASS** | `process.env.NODE_ENV !== 'test'` bypass completely removed from `reports.service.ts`. |
| **3.5** | **Alternate Route Bypass Prevention** | **PASS** | All routes (`/career`, `/generate`, `/`, `/career/:id/regenerate`) enforce entitlement checks. |
| **3.6** | **Order Fulfillment Idempotency & Replay** | **CONDITIONAL PASS** | Payment verification replay is idempotent; however, orders are not marked `FULFILLED` or locked 1-to-1 to a single report. |
| **3.7** | **`NODE_ENV` Inspection Around Payments** | **PASS** | Zero `NODE_ENV` bypasses in `reports.service.ts`; production guards enforce real HMAC signatures and disallow mock AI. |
| **4.1** | **Test Verification & Output Reconciliation** | **PASS** | 23 backend tests and 21 mobile tests run and pass completely, matching reported counts. |
| **4.2** | **Test Suite Classification** | **PASS** | Tests accurately classified into unit, integration (real DB), and Flutter widget tests. |
| **4.3** | **Missing Test Coverage Identified** | **PASS** | Missing cross-instance concurrency, queue deduplication, and native platform channel tests documented. |
| **5.1** | **Git Scope & Preservation** | **PASS** | Zero schema migrations created in Task 1A; Tasks 2, 3, 4 untouched; prior phases preserved. |

---

## 1. Native Razorpay Integration Audit

### 1.1 Dependency & Lockfile Inspection
- **File:** [`apps/mobile/pubspec.yaml`](file:///home/pilot/Projects/astrosushil/apps/mobile/pubspec.yaml#L21)
  - `razorpay_flutter: ^1.4.7` is declared under `dependencies`.
- **File:** [`apps/mobile/pubspec.lock`](file:///home/pilot/Projects/astrosushil/apps/mobile/pubspec.lock#L512-L519)
  - Locked to version `1.4.7`, hosted at `https://pub.dev`, SHA-256: `f0ffd4e162f0c4c8d72e512deaece22d2179e653e470fd794865283c28ff9079`.
- **Status:** **PASS**

### 1.2 Native SDK Invocation & Parameter Mapping
- **File:** [`apps/mobile/lib/features/reports/services/razorpay_checkout_service.dart`](file:///home/pilot/Projects/astrosushil/apps/mobile/lib/features/reports/services/razorpay_checkout_service.dart#L41-L154)
- **Code Inspection:**
  - `NativeRazorpayCheckoutService` creates an authentic `Razorpay()` instance (line 66) imported directly from `package:razorpay_flutter/razorpay_flutter.dart`.
  - In `openCheckout(...)` (lines 111-154), parameters are bound:
    - `key`: `order.razorpayKey` provided dynamically by the backend (line 128).
    - `amount`: `order.amount` in paise (line 134).
    - `currency`: `order.currency` (line 138).
    - `order_id`: `order.razorpayOrderId` from backend order creation (line 137).
    - `name`: `'Astro Sushil'` (line 135).
    - `description`: `reportTitle` (line 136).
    - `prefill`: `{ 'contact': userContact, 'email': userEmail }` (lines 140-143).
  - Invokes `_razorpay!.open(options)` at line 153.
- **Status:** **PASS**

### 1.3 SDK Listeners, Disposal & Duplicate Callback Protection
- **File:** [`apps/mobile/lib/features/reports/services/razorpay_checkout_service.dart`](file:///home/pilot/Projects/astrosushil/apps/mobile/lib/features/reports/services/razorpay_checkout_service.dart#L66-L109)
  - Listeners registered in `init(...)`:
    - `Razorpay.EVENT_PAYMENT_SUCCESS` -> `_handlePaymentSuccess` (line 67)
    - `Razorpay.EVENT_PAYMENT_ERROR` -> `_handlePaymentError` (line 68)
    - `Razorpay.EVENT_EXTERNAL_WALLET` -> `_handleExternalWallet` (line 69)
  - User cancellation is accurately detected at lines 91-96 (`response.code == Razorpay.PAYMENT_CANCELLED` or message contains `cancelled`/`canceled`).
  - Duplicate callback protection: lines 74 and 86 enforce:
    ```dart
    if (!_isCheckoutActive || _hasHandledCallback) return;
    _hasHandledCallback = true;
    _isCheckoutActive = false;
    ```
  - Disposal: `dispose()` at lines 157-169 calls `_razorpay?.clear()`, resets flags, and nulls all callback references. In [`report_detail_screen.dart`](file:///home/pilot/Projects/astrosushil/apps/mobile/lib/features/reports/screens/report_detail_screen.dart#L67-L70), `dispose()` calls `_razorpayService?.dispose()`.
- **Status:** **PASS**

### 1.4 Server Verification Authority Before Report Generation
- **File:** [`apps/mobile/lib/features/reports/screens/report_detail_screen.dart`](file:///home/pilot/Projects/astrosushil/apps/mobile/lib/features/reports/screens/report_detail_screen.dart#L336-L395)
  - `_handlePaymentSuccessCallback` receives provisional client success events and explicitly submits `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }` to `reportsService.verifyReportPayment(...)` (`POST /api/v1/payments/verify`).
  - `_proceedToReportGeneration` is executed **only if** `isPaymentVerified` is confirmed by backend response (`order.isPaid == true`).
  - Network timeout fallback at lines 367-378 queries `reportsService.getPaymentOrderStatus(order.orderId)` to confirm whether backend/webhook already marked the order `PAID` before declaring failure.
- **Status:** **PASS**

### 1.5 Simulated Checkout Fallback in Production
- **Inspection:**
  - Audited `apps/mobile/lib/features/reports/screens/report_detail_screen.dart`.
  - Zero references to `RazorpayCheckoutSheet` or mock UI bottom sheets.
  - All checkout invocations route through `_razorpayService.openCheckout(...)`.
  - The legacy untracked simulation widget `razorpay_checkout_sheet.dart` is unreferenced across the entire codebase.
- **Status:** **PASS**

### 1.6 Environment Verification Distinctions
- **Code Inspection:** Verified authentic Native SDK integration in `razorpay_checkout_service.dart` and `report_detail_screen.dart`.
- **Automated Tests:** Verified in 8 Flutter widget tests (`phase2b5_report_commerce_checkout_test.dart`) using `MockRazorpayCheckoutService`.
- **Physical-Device Verification:** **UNVERIFIED**. No physical Android or iOS device execution was conducted. Platform channels (`com.razorpay.flutter`) require hardware device or emulator deployment for runtime binary verification.

---

## 2. Async Deduplication and Concurrency Audit

### 2.1 All Five Supported SKUs
- **File:** [`apps/api/src/modules/reports/reports.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L430-L443)
  1. `CAREER`: Handled via `createCareerReportJob` (lines 37-191).
  2. `KUNDLI`: Handled via `executeReportJob` (lines 465-728).
  3. `PLANETARY_SUMMARY`: Handled via `executeReportJob`.
  4. `CAREER_PROSITY`: Handled via `executeReportJob`.
  5. `MARRIAGE_COMPATIBILITY`: Handled via `executeReportJob` (requires and validates partner profile at lines 483-500).
- **Status:** **PASS**

### 2.2 Deep Investigation of `inflightJobLocks`
- **File:** [`apps/api/src/modules/reports/reports.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L32)
  ```typescript
  private static readonly inflightJobLocks = new Map<string, Promise<any>>();
  ```
- **Concurreny Key Formats:**
  - Career: `${user.id}:${input.birthProfileId}:CAREER` (line 42)
  - Non-Career: `${user.id}:${input.birthProfileId}:${input.reportType}:${input.partnerProfileId || ''}` (line 445)
- **Lock Architecture & Findings:**
  1. **Process-Local vs Distributed:**
     `inflightJobLocks` is an in-memory `Map` resident in the Node.js process heap. It is **process-local**, NOT distributed. It has no integration with Redis, Redlock, or PostgreSQL advisory locks.
  2. **Multi-Instance Protection:**
     **FAIL**. `inflightJobLocks` provides **zero protection across multiple API instances**. If API Instance 1 and API Instance 2 run concurrently behind a load balancer, Instance 1 has no knowledge of locks held by Instance 2.
  3. **Simultaneous Request Race Condition:**
     - **Within a single process:** Safe. The `Map.set()` occurs synchronously prior to the first async I/O tick, causing concurrent requests in the same process to await the identical promise.
     - **Across multiple instances:** **UNPROTECTED**. If two simultaneous requests hit Instance 1 and Instance 2 at the same millisecond:
       - Both instances query `prisma.report.findFirst(...)` concurrently before either has inserted a record.
       - Both queries return `null`.
       - Both instances proceed to `prisma.report.create(...)` and generate two distinct report records with different UUIDs.
  4. **Duplicate BullMQ Job Creation:**
     **FAIL (Cross-Instance)**. Because both instances generate separate report records, both will call `careerReportWorker.enqueueReportJob(reportId)` (or `redisQueueService.enqueueJob`), pushing duplicate jobs to the Redis queue for the same birth profile and SKU.
  5. **Active & Completed Report Reuse:**
     **PASS**. Lines 535-571 query active report statuses (`QUEUED`, `PROCESSING`, etc.) and reuse existing `reportId` if present. Lines 574-617 query completed reports and reuse them cleanly if fresh.
  6. **Stale Report Invalidation on Profile Update:**
     **PASS**. Lines 595-598 verify:
     ```typescript
     const isProfileFresh = existing && profile.updatedAt <= existing.createdAt;
     const isPartnerFresh = !partnerProfile || (existing && partnerProfile.updatedAt <= existing.createdAt);
     if (existing && isProfileFresh && isPartnerFresh) { ... }
     ```
     If the birth profile was modified after report creation, reuse is rejected and fresh generation proceeds.
  7. **Database Constraints:**
     **FAIL**. Inspection of [`apps/api/prisma/schema.prisma`](file:///home/pilot/Projects/astrosushil/apps/api/prisma/schema.prisma#L203-L233) confirms `Report` only has `@@index([userId])` and `@@index([birthProfileId])`. There is **no database-level unique constraint** or partial unique index on active states (`userId, birthProfileId, reportType`).

---

## 3. Payment Authorization Audit

### 3.1 Authoritative Paid Order Enforcement
- **Files:**
  - Career: [`apps/api/src/modules/reports/reports.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L139-L156)
  - Non-Career: [`apps/api/src/modules/reports/reports.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L514-L532)
- **Rules Verified:**
  - Checks `featureAccessService.evaluateFeatureAccess(user.id, featureKey)`.
  - If user lacks active entitlement and is not admin:
    - Queries `prisma.order.findUnique({ where: { id: input.orderId }, include: { items: true } })`.
    - **Ownership:** `order.userId === user.id`.
    - **Status:** `order.status === 'PAID'`.
    - **SKU Matching:** `order.reportType === input.reportType` or `order.items.some(catalogId matches)`.
    - If unverified, throws `ForbiddenError(403)`.
- **Status:** **PASS**

### 3.2 Removal of Test-Only Security Bypasses
- **Inspection:**
  - Grepped `apps/api/src/modules/reports/reports.service.ts` for `NODE_ENV`.
  - **Result:** **0 matches found**.
  - The previous bypass `if (!orderVerified && process.env.NODE_ENV !== 'test')` has been completely deleted.
  - In vitest integration tests, test requests without a valid paid order receive HTTP 403 Forbidden.
- **Status:** **PASS**

### 3.3 Alternate Route Inspection
- **File:** [`apps/api/src/modules/reports/reports.routes.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.routes.ts)
  - `POST /api/v1/reports/career`: Enforces entitlement/paid order via `createCareerReportJob`.
  - `POST /api/v1/reports/generate`: Enforces entitlement/paid order via `createReportJob`.
  - `POST /api/v1/reports`: Enforces entitlement/paid order via `createReportJob`.
  - `POST /api/v1/reports/career/:reportId/regenerate`: Calls `createCareerReportJob({ forceRegenerate: true })`. Since `orderId` is not supplied, only users with active entitlement or admins can regenerate.
  - No alternate endpoints allow unauthenticated or unpaid report generation.
- **Status:** **PASS**

### 3.4 Payment Verification Replay vs Order Fulfillment
- **Verification Replay:** [`CommerceService.verifyPayment`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/commerce/commerce.service.ts#L176-L183) handles replayed verification calls idempotently: if already `PAID`, returns the existing order without re-verifying or charging.
- **Order Consumption Observation:**
  When `createReportJob` accepts `orderId`, it verifies `order.status === 'PAID'`, but:
  - It does **not** transition `order.fulfillmentStatus` to `FULFILLED`.
  - It does **not** record `orderId` on the created `Report` row.
  - While report deduplication prevents generating multiple reports for the *same* profile and SKU, a user could theoretically supply the same `orderId` to generate reports for multiple *different* birth profiles under their account.
- **Status:** **CONDITIONAL PASS** (Remaining improvement for Phase 2B.5 fulfillment tracking).

### 3.5 `NODE_ENV` Usage Audit
- Audited all 25 occurrences of `NODE_ENV` across `apps/api/src/`:
  - `payment.service.ts`: Enforces that `mock_sig_` signatures are rejected when `NODE_ENV === 'production'`.
  - `report-worker.service.ts`: Enforces that mock LLM provider is rejected when `NODE_ENV === 'production'`.
  - `otp.service.ts`: Enforces that master dev OTP is disabled in production.
  - No payment bypasses or security concessions exist for `NODE_ENV`.
- **Status:** **PASS**

---

## 4. Test Quality Audit

### 4.1 Test Classification
| Test File | Test Count | Classification | Description |
|---|:---:|---|---|
| `apps/api/tests/integration/phase2b5-report-commerce.test.ts` | 18 | **Integration (Real DB)** | Real Fastify instance, real PostgreSQL test DB (`astro_sushil_test`), real HMAC crypto, testing full commerce order, verification, deduplication, and in-flight locks. |
| `apps/api/tests/integration/phase4-consumer-reports.test.ts` | 5 | **Integration (Real DB)** | Real Fastify instance, real PostgreSQL test DB, verifying worker queue execution for multi-tier reports with seeded paid orders. |
| `apps/mobile/test/widget/phase2b5_report_commerce_checkout_test.dart` | 8 | **Flutter Widget Test** | Tests order creation, native Razorpay SDK listeners, cancellation, error handling, signature failure, and double-tap prevention using `MockRazorpayCheckoutService`. |
| `apps/mobile/test/widget/phase4_reports_screen_test.dart` | 2 | **Flutter Widget Test** | UI tests for reports catalogue and tab navigation. |
| `apps/mobile/test/widget/phase5_reports_experience_test.dart` | 11 | **Flutter Widget Test** | UI tests for tier comparison, dynamic scaling, Hindi l10n, and generation progress. |
| *Native SDK / Device Execution* | 0 | **Native SDK / Device** | None. |

### 4.2 Test Count Verification
- **Backend Test Run:**
  ```bash
  cd apps/api && npx vitest run tests/integration/phase2b5-report-commerce.test.ts tests/integration/phase4-consumer-reports.test.ts
  ```
  - **Output:** `Test Files: 2 passed (2)`, `Tests: 23 passed (23)`.
  - Matches reported counts exactly.
- **Mobile Test Run:**
  ```bash
  cd apps/mobile && flutter test test/widget/phase2b5_report_commerce_checkout_test.dart test/widget/phase4_reports_screen_test.dart test/widget/phase5_reports_experience_test.dart
  ```
  - **Output:** `All tests passed!`, `21 passed | 0 failed`.
  - Matches reported counts exactly.

### 4.3 Missing Test Scenarios Identified
1. **Two API Instances Concurrency:**
   - No integration test spins up two Fastify instances or separate Node worker processes against the same database to test cross-instance race conditions.
2. **Duplicate BullMQ Job Creation:**
   - No test verifies queue-level uniqueness when identical payloads are submitted concurrently.
3. **Payment Success Followed by Generation Failure (End-to-End Recovery):**
   - While `ReportGenerationScreen` displays a failure state with retry button, there is no end-to-end integration test verifying that tapping "Retry" after payment success invokes `_proceedToReportGeneration` without triggering a duplicate charge or re-order.
4. **Native Razorpay Callback Lifecycle on Device:**
   - Android `Activity` lifecycle recreation (rotation, process death, backgrounding) during active checkout is not tested due to lack of native device test harness.

---

## 5. Git and Scope Audit

### 5.1 Working Tree & Scope Verification
- **Inspection:** `git status` and `git diff --stat origin/backend`
- **Schema & Migrations:**
  - Zero schema modifications introduced in Task 1A. (Existing untracked migration directory was created in Phase 2B.1 on Nov 2).
  - No database migration executed during this audit.
- **Production Secrets & Configuration:**
  - Zero API secrets, private keys, or credentials committed or leaked.
- **Phase Boundaries:**
  - Task 2 (`REPORT_FAILED` failure notification dispatch) is **untouched**.
  - Task 3 (IST configurable delivery scheduling) is **untouched**.
  - Task 4 is **untouched**.
  - All Phase 2B.1, 2B.2, 2B.3, and 2B.4 changes are preserved intact.
- **Status:** **PASS**

---

## 6. Audit Conclusion & Final Recommendation

### Final Recommendation: **ACCEPT WITH CONDITIONS**

The remediation undertaken in **Phase 2B.5 Task 1A** successfully addresses the core architectural requirements:
1. Native `razorpay_flutter` SDK is cleanly integrated, replacing mock sheet UI in production paths while retaining mockability in widget tests.
2. Strict payment authorization is enforced across all 5 report SKUs with complete removal of `NODE_ENV !== 'test'` bypasses.
3. In-flight promise locking and active/completed report reuse are implemented across all SKUs, and test suites pass 100%.

### Remaining Conditions & Non-Blocking Findings
The following items do not block accepting Task 1A, but represent acknowledged architectural limitations that must be addressed before multi-instance production scale:

1. **Process-Local Concurrency Limitation:**
   - `inflightJobLocks` is process-local. In a horizontally scaled cluster, cross-instance concurrency deduplication is not guaranteed without a distributed lock (e.g. Redis / Redlock) or a PostgreSQL unique partial index on active reports (`WHERE status NOT IN ('COMPLETED', 'FAILED')`).
2. **Order Fulfillment State Tracking:**
   - Generating a report does not update `Order.fulfillmentStatus` to `FULFILLED` nor link `Report.orderId`. A paid order could theoretically be referenced multiple times across different birth profiles. Order consumption logic should be finalized in Phase 2B.5 Task 3.
3. **Physical Device Checkout Verification:**
   - Native Razorpay checkout lifecycle must be physically tested on Android and iOS hardware prior to mobile app production binary deployment.

