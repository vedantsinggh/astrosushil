# Astro Sushil: Phase 2B.5 Report UI & Integration Audit Report

**Audit Type:** Read-Only Forensic Audit & Architectural Implementation Plan  
**Scope:** Mobile App (`apps/mobile`), Backend API (`apps/api`), Report Engine (`packages/report-engine`), Prediction Engine (`packages/prediction-engine`), Commerce & Entitlement Integration  
**Date:** November 2026  
**Status:** Audit Completed — Read-Only Mode Enforced (Zero Code or Production Data Modified)

---

## 1. Executive Summary

A comprehensive, read-only forensic audit was conducted on the Astro Sushil report experience across all layers of the monorepo: mobile UI screens, Riverpod state management, HTTP service layers, Fastify API endpoints, Prisma database schema, Commerce and Feature Entitlement access gates, BullMQ asynchronous worker pipelines, and PDF generation engines.

### Key Audit Findings:
1. **Authoritative SKU Support:** 
   The backend API and report engine formally support **5 core astrological report SKUs**:
   - `CAREER` (Career & Professional Life Report)
   - `KUNDLI` (Janma Kundli & Birth Chart Report)
   - `PLANETARY_SUMMARY` (Planetary Strengths & Dignities / Mini Horoscope Report)
   - `CAREER_PROSITY` (Comprehensive Professional Horoscope Report)
   - `MARRIAGE_COMPATIBILITY` (Kundli Milan & Relationship Compatibility Report)
   Two SKUs displayed in mobile as "Upcoming Editions" (`CHILDBIRTH_FAMILY` and `GUPTA_NADI_DOSSIER`) are **explicitly unsupported** on the backend and reject generation with HTTP 400 (`REPORT_TYPE_NOT_SUPPORTED`).

2. **Severe Commerce / Payment Bypass on Mobile:**
   `ReportDetailScreen` (`apps/mobile/lib/features/reports/screens/report_detail_screen.dart`) renders pricing, breakdown, and GST calculations, but tapping **"Unlock & Generate Report"** directly invokes `createReportJob` on `reports_provider.dart` without creating a Razorpay order or executing payment checkout. While this succeeds in `test` environments where entitlement checks are skipped, it will trigger an immediate **HTTP 403 Forbidden (`Payment or entitlement required to access this report`)** for real users in production.

3. **Dual / Fragmented Mobile Report Architecture:**
   The mobile codebase contains two parallel, un-unified report execution pipelines:
   - **Universal Flow:** Used by `KUNDLI`, `PLANETARY_SUMMARY`, `CAREER_PROSITY`, and `MARRIAGE_COMPATIBILITY`. Managed via `reportGenerationNotifierProvider` and `ReportGenerationScreen`.
   - **Dedicated Career Flow:** Used exclusively by `CAREER`. Managed via `careerReportNotifierProvider`, routing through `CareerReportOverviewScreen`, `CareerReportGenerationScreen`, and `CareerReportPdfScreen`.
   This leads to duplicate polling logic, inconsistent error handlers, and diverging user experiences.

4. **"Update Report" Contextual Audit:**
   The label "Update Report" does not exist as an isolated screen. Instead, it manifests in two specific architectural places:
   - In state notification error strings (`career_report_provider.dart:237`: `"You're offline. Connect to the internet to update report status."`), representing background status polling.
   - In the report generation lifecycle when an existing report is detected (`report_detail_screen.dart:420-470`), offering an **"Existing Report Found"** prompt with an option to generate a new report (`forceRegenerate: true`), which updates the user's active report.
   - In the History tab (`reports_screen.dart:1238`), where active processing jobs show a **"Track Progress"** banner that initiates live status polling.

---

## 2. Authoritative Supported-Report Inventory

| Report SKU | Display Name | Backend Support | API Endpoint & Method | Price (Paise / INR) | Generation Mechanism | PDF Download Endpoint | Special Input Requirements |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`CAREER`** | Career & Professional Life Report | **Supported** | `POST /api/v1/reports/career` | 49,900 (₹499) | Async BullMQ Worker (`careerReportQueue`) or In-Process fallback via `generateCareerReport` (`packages/report-engine` + OpenRouter LLM synthesis) | `GET /api/v1/reports/:id/download-file` or `/pdf` | Single birth profile (`profileId`), target career role/question (optional) |
| **`KUNDLI`** | Janma Kundli & Birth Chart Report | **Supported** | `POST /api/v1/reports` (`reportType: 'KUNDLI'`) | 29,900 (₹299) | In-process synchronous/queued `generateKundliReport` (`packages/report-engine`) using deterministic ephemeris | `GET /api/v1/reports/:id/download-file` or `/pdf` | Single birth profile (`profileId`) |
| **`PLANETARY_SUMMARY`** | Planetary Strengths & Dignities Report | **Supported** | `POST /api/v1/reports` (`reportType: 'PLANETARY_SUMMARY'`) | 19,900 (₹199) | In-process synchronous/queued `generatePlanetaryReport` (`packages/report-engine`) | `GET /api/v1/reports/:id/download-file` or `/pdf` | Single birth profile (`profileId`) |
| **`CAREER_PROSITY`** | Comprehensive Pro Horoscope Report | **Supported** | `POST /api/v1/reports` (`reportType: 'CAREER_PROSITY'`) | 69,900 (₹699) | In-process synchronous/queued `generateProHoroscopeReport` (`packages/report-engine`) | `GET /api/v1/reports/:id/download-file` or `/pdf` | Single birth profile (`profileId`) |
| **`MARRIAGE_COMPATIBILITY`** | Kundli Milan & Relationship Report | **Supported** | `POST /api/v1/reports` (`reportType: 'MARRIAGE_COMPATIBILITY'`) | 99,900 (₹999) | In-process synchronous/queued `generateMatchmakingReport` (`packages/report-engine`) | `GET /api/v1/reports/:id/download-file` or `/pdf` | Dual birth profiles (`profileId` primary + `partnerProfileId` secondary) |
| **`CHILDBIRTH_FAMILY`** | Childbirth & Family Lineage Dossier | **UNSUPPORTED** | None (Rejects with 400 `REPORT_TYPE_NOT_SUPPORTED`) | N/A | None (Planned future edition) | None | N/A |
| **`GUPTA_NADI_DOSSIER`** | Gupta Nadi Life Dossier | **UNSUPPORTED** | None (Rejects with 400 `REPORT_TYPE_NOT_SUPPORTED`) | N/A | None (Planned future edition) | None | N/A |

### Backend Endpoint Contracts & Status Format:
- **Generation Trigger Endpoints:**
  - `POST /api/v1/reports/career`: Body `{ profileId: string, forceRegenerate?: boolean, notes?: string }`
  - `POST /api/v1/reports`: Body `{ profileId: string, reportType: ReportType, partnerProfileId?: string, forceRegenerate?: boolean }`
- **Status & Retrieval Endpoints:**
  - `GET /api/v1/reports/:id/status`: Returns `{ id, status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED', progress: number, currentStep?: string, error?: string, downloadUrl?: string }`
  - `GET /api/v1/reports/:id/pdf` and `GET /api/v1/reports/:id/download-file`: Streams existing PDF binary directly (`application/pdf`) with `Content-Disposition: attachment; filename="report-..."`. **Verified:** Does NOT trigger regeneration.
  - `GET /api/v1/reports/my-reports`: Returns historical array of reports for authenticated user.

---

## 3. Mobile App UI Audit

### 3.1 Report Catalogue & Selection (`ReportsScreen`)
- **File:** `apps/mobile/lib/home/screens/reports_screen.dart` (1,510 lines)
- **Structure:**
  - Header with active Profile Selector chip (`_buildActiveProfileChip`).
  - Tier Comparison Sheet (`_showTierComparisonSheet`) describing Basic, Standard, and Premium report tiers.
  - Five Active Report Cards (`_buildReportCard`):
    - Kundli (`_onKundliReportAction`) -> Routes to `ReportDetailScreen(reportType: 'KUNDLI')`.
    - Planetary Strengths (`_onPlanetaryReportAction`) -> Routes to `ReportDetailScreen(reportType: 'PLANETARY_SUMMARY')`.
    - Pro Horoscope (`_onProHoroscopeAction`) -> Routes to `ReportDetailScreen(reportType: 'CAREER_PROSITY')`.
    - Kundli Milan (`_onMatchmakingReportAction`) -> Routes to `ReportDetailScreen(reportType: 'MARRIAGE_COMPATIBILITY')`.
    - Career Report (`_onCareerReportAction`) -> Dispatches to `CareerReportOverviewScreen` (fragmented from other reports).
  - Upcoming Editions Carousel (`_buildUpcomingCard`):
    - Shows `Childbirth & Family Lineage` (`CHILDBIRTH_FAMILY`) and `Gupta Nadi Life Dossier` (`GUPTA_NADI_DOSSIER`).
    - Both cards feature a "Notify Me" action that displays a snackbar (`"We'll notify you when this edition is released"`). These correctly prevent purchase attempts.

### 3.2 Report Details & Purchase Flow (`ReportDetailScreen`)
- **File:** `apps/mobile/lib/features/reports/screens/report_detail_screen.dart` (728 lines)
- **Structure:**
  - Displays Report Header, Included Sections, Feature Highlights, Sample Previews, and Pricing Breakdown (Base Price + 18% GST).
  - Profile Selector: Allows selecting user's profiles (`activeBirthProfileProvider`).
  - Partner Profile Selector: Conditionally rendered only for `MARRIAGE_COMPATIBILITY`. If no secondary profile exists, prompts user to add a partner profile.
  - Existing Report Detection: If `reportsState.reports` contains a `COMPLETED` report for the selected profile, renders an info box offering `View Existing Report` or `Generate New Report`.
  - **Defect (Critical):** The "Unlock & Generate Report" CTA directly triggers `reportsNotifier.createReportJob(reportType: widget.reportType, profileId: profile.id, partnerProfileId: partnerId)` instead of launching the Razorpay payment checkout sheet.

### 3.3 Report Generation & Polling Flow (`ReportGenerationScreen` vs `CareerReportGenerationScreen`)
- **Universal Screen:** `apps/mobile/lib/features/reports/screens/report_generation_screen.dart` (442 lines)
  - Listens to `reportGenerationNotifierProvider`.
  - Displays astronomical animation, circular progress bar, progress percentage, step label (`currentStep`), and astrological aphorisms.
  - Handles `COMPLETED` by automatically replacing route with `ReportPdfViewerScreen`.
  - Handles `FAILED` by presenting error dialog with a "Retry Generation" CTA.
- **Career-Specific Screen:** `apps/mobile/lib/features/reports/screens/career_report_generation_screen.dart` (386 lines)
  - Listens to `careerReportNotifierProvider`.
  - Mirrors UI of `ReportGenerationScreen` with minor cosmetic differences.
  - Employs independent timer polling every 2.5 seconds calling `reportsService.getCareerReportStatus(reportId)`.
  - **Architectural Redundancy:** Re-implements 90% of the universal generation screen logic.

### 3.4 Report History Tab (`ReportsScreen._buildHistoryTab`)
- **File:** `apps/mobile/lib/home/screens/reports_screen.dart:1238-1490`
- **Behavior:**
  - Watches `userReportsProvider` (which fetches `GET /api/v1/reports/my-reports`).
  - Displays active processing banner if any report is in `PENDING` or `PROCESSING` state with a "Track Progress" CTA.
  - Groups completed reports with metadata: Date, Profile Name, Report Type badge, and Page Count.
  - Actions per history item:
    - `View PDF`: Opens `ReportPdfViewerScreen`.
    - `Download`: Invokes `reportsService.downloadUniversalReportFile(report.id)`.
    - `Delete / Remove`: Soft UI dismissal only.
  - Handles empty state (`_buildEmptyHistoryView`) and error state (`_buildHistoryErrorView`) with retry capability.

### 3.5 PDF Viewing & Downloading (`ReportPdfViewerScreen`)
- **File:** `apps/mobile/lib/features/reports/screens/report_pdf_viewer_screen.dart` (186 lines)
- **Behavior:**
  - Supports both direct file bytes rendering and remote URL viewing using `pdfx`.
  - Includes App Bar actions:
    - **Share:** Triggers native OS share sheet via `Share.shareXFiles`.
    - **Save / Download:** Saves PDF to device downloads / documents directory and displays toast notification.
  - Page navigation controls with page indicator (`Page X of Y`).

---

## 4. Backend Integration Audit

### 4.1 Route Declarations & Authentication (`reports.routes.ts`)
- **File:** `apps/api/src/modules/reports/reports.routes.ts`
- Routes:
  - `POST /api/v1/reports/career` (Auth required, preHandler `authenticate`)
  - `POST /api/v1/reports` (Auth required, preHandler `authenticate`)
  - `GET /api/v1/reports/:id/status` (Auth required, ownership verified in service)
  - `GET /api/v1/reports/:id/pdf` (Auth required, ownership verified in service)
  - `GET /api/v1/reports/:id/download-file` (Auth required, ownership verified in service)
  - `GET /api/v1/reports/my-reports` (Auth required, returns `where: { userId: user.id }`)
- **Security Check:** Ownership verification is enforced on all endpoints via `report.userId !== user.id` throwing HTTP 403 `ForbiddenError`.

### 4.2 Feature Access & Entitlement Enforcement (`reports.service.ts`)
- **File:** `apps/api/src/modules/reports/reports.service.ts:455-465`
- Logic:
  ```typescript
  const featureKey = REPORT_TYPE_TO_FEATURE[reportType];
  if (env.NODE_ENV !== 'test') {
    const hasAccess = await this.featureAccessService.evaluateFeatureAccess(user.id, featureKey);
    if (!hasAccess) {
      throw new ForbiddenError('Payment or entitlement required to access this report');
    }
  }
  ```
- **Finding:** The backend strictly gates report creation behind `featureAccessService`. Because the mobile app skips commerce checkout, generation requests from production mobile builds will fail.

### 4.3 Commerce Catalog Alignment (`commerce.catalog.ts`)
- **File:** `apps/api/src/modules/commerce/commerce.catalog.ts`
- Catalog items:
  - `report-kundli` -> `legacyReportType: ReportType.KUNDLI`, price: ₹299
  - `report-planetary-summary` -> `legacyReportType: ReportType.PLANETARY_SUMMARY`, price: ₹199
  - `report-career` -> `legacyReportType: ReportType.CAREER`, price: ₹499
  - `report-marriage` -> `legacyReportType: ReportType.MARRIAGE_COMPATIBILITY`, price: ₹999
  - `report-career-pro` -> `legacyReportType: ReportType.CAREER_PROSITY`, price: ₹699
  - `report-childbirth-family` -> `legacyReportType: ReportType.CHILDBIRTH_FAMILY`, status: Catalog only (engine unsupported)
  - `report-gupta-nadi` -> `legacyReportType: ReportType.GUPTA_NADI_DOSSIER`, status: Catalog only (engine unsupported)
- Pricing and tax configurations are completely synchronized between `commerce.catalog.ts` and mobile UI pricing sheets.

### 4.4 Regeneration Integrity vs Direct Download
- `GET /api/v1/reports/:id/download-file` queries `prisma.report.findUnique` for `storageKey`, generates a signed S3/MinIO download URL, and streams the cached bytes with `attachment` headers.
- It **never** invokes any report generator, ensuring zero unintended LLM or ephemeris recalculations upon download.

---

## 5. "Update Report" Section Audit

### 5.1 Identity & Location
A precise text audit across the repository reveals that there is no standalone navigation tab or screen titled "Update Report". Instead, "Update Report" represents three distinct operational touchpoints:

1. **Offline Status Notification String:**
   - **Location:** `apps/mobile/lib/features/reports/providers/career_report_provider.dart:237`
   - **Code:** `errorMessage: 'You\'re offline. Connect to the internet to update report status.'`
   - **Purpose:** Informs the user when background polling cannot reach `GET /api/v1/reports/career/:id/status`.

2. **Existing Report Detection & Update Banner:**
   - **Location:** `apps/mobile/lib/features/reports/screens/report_detail_screen.dart:420-470`
   - **Behavior:** When selecting a birth profile that already has an existing generated report, the UI displays:
     > *"Existing Report Found: A completed [Report Name] already exists for [Profile Name]. Generated on [Date]."*
   - **Actions:** 
     - *"View Existing Report"* (Navigates to `ReportPdfViewerScreen` with existing report ID).
     - *"Generate New Report"* (Invokes `createReportJob` with `forceRegenerate: true`, updating the database record with freshly generated astrological data).

3. **Active Processing "Track Progress" Banner (History Tab):**
   - **Location:** `apps/mobile/lib/home/screens/reports_screen.dart:1260-1300`
   - **Data Source:** Populated by `userReportsProvider` filtering for `status == 'PENDING' || status == 'PROCESSING'`.
   - **Behavior:** Renders an animated status card showing current processing status and a **"Track Progress"** button that opens `ReportGenerationScreen` to monitor real-time updates.

### 5.2 Accuracy, Refreshing & Missing Functionality:
- **Refresh Mechanism:** The history tab relies on `ref.refresh(userReportsProvider)`. Pull-to-refresh is properly supported.
- **Multi-Report Coverage:** The history and status tracking mechanisms correctly handle all 5 supported report types (`CAREER`, `KUNDLI`, `PLANETARY_SUMMARY`, `CAREER_PROSITY`, `MARRIAGE_COMPATIBILITY`).
- **Gaps Identified:**
  - If a user triggers generation on the dedicated Career flow, `userReportsProvider` in the universal history tab does not automatically invalidate until manually refreshed.
  - The offline error message in `career_report_provider.dart` does not offer an explicit "Retry" button.

---

## 6. Report-by-Report UI Matrix

| Report SKU | Catalogue | Purchase | Input | Generation Status | History | PDF View | Download | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`CAREER`** | Implemented and verified | Partially implemented | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | **Partially implemented** |
| **`KUNDLI`** | Implemented and verified | Partially implemented | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | **Partially implemented** |
| **`PLANETARY_SUMMARY`** | Implemented and verified | Partially implemented | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | **Partially implemented** |
| **`CAREER_PROSITY`** | Implemented and verified | Partially implemented | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | **Partially implemented** |
| **`MARRIAGE_COMPATIBILITY`** | Implemented and verified | Partially implemented | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | Implemented and verified | **Partially implemented** |
| **`CHILDBIRTH_FAMILY`** | Implemented and verified | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | **Not applicable** |
| **`GUPTA_NADI_DOSSIER`** | Implemented and verified | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | **Not applicable** |

### Matrix Legend & Evidentiary Support:
- **Catalogue:** `reports_screen.dart:450-800` (All 5 active + 2 upcoming editions rendered).
- **Purchase:** Marked *Partially implemented* across all 5 supported SKUs because `ReportDetailScreen` renders full pricing breakdown and tax calculation, but bypasses Razorpay checkout order generation before calling `createReportJob`.
- **Input:** Single-profile selector verified in `ReportDetailScreen:380-420`; dual-profile selector for `MARRIAGE_COMPATIBILITY` verified in `ReportDetailScreen:440-520`.
- **Generation Status:** `ReportGenerationScreen:1-442` and `CareerReportGenerationScreen:1-386` verify polling against `/api/v1/reports/:id/status`.
- **History:** `reports_screen.dart:1238-1490` verifies multi-report rendering from `GET /api/v1/reports/my-reports`.
- **PDF View & Download:** `report_pdf_viewer_screen.dart:1-186` verified with `pdfx`, sharing, and device download streaming.
- **Childbirth & Gupta Nadi:** Correctly marked *Not applicable* for generation/history because backend support is unimplemented and UI displays "Coming Soon" notification dialog.

---

## 7. Missing Functionality, Discrepancies & Bugs

### 7.1 Critical Bugs
1. **Commerce / Payment Flow Disconnect in `ReportDetailScreen`:**
   - **Severity:** High / Blocker for Production.
   - **Finding:** `_handleGenerateReport()` in `ReportDetailScreen` calls `reportsNotifier.createReportJob()` directly. It must invoke `commerceService.createOrder()` and launch the Razorpay payment sheet (analogous to `apps/mobile/lib/features/shop/screens/checkout_screen.dart` and `consultations/widgets/booking_flow_sheet.dart`).
   - **Impact:** Any non-test user will receive HTTP 403 Forbidden when attempting to generate a report.

### 7.2 Architectural Inconsistencies & Redundancies
2. **Duplicated Career Report Pipeline:**
   - **Severity:** Medium.
   - **Finding:** The Career report has separate screens (`CareerReportOverviewScreen`, `CareerReportGenerationScreen`, `CareerReportPdfScreen`) and a separate Riverpod provider (`career_report_provider.dart`), while all other 4 reports use the universal pipeline (`ReportDetailScreen`, `ReportGenerationScreen`, `ReportPdfViewerScreen`, `reports_provider.dart`).
   - **Impact:** Maintenance overhead and fragmented status polling logic.

3. **Missing Auto-Invalidation of History Provider:**
   - **Severity:** Low.
   - **Finding:** When a report finishes generation in `ReportGenerationScreen` or `CareerReportGenerationScreen`, `userReportsProvider` is not explicitly invalidated, requiring the user to pull-to-refresh the History tab to see their newly generated report.

4. **Error Handling for Unsupported Types:**
   - **Severity:** Low.
   - **Finding:** While the mobile UI displays "Notify Me" for `CHILDBIRTH_FAMILY` and `GUPTA_NADI_DOSSIER`, if an API request with these types is sent directly, the backend returns HTTP 400 `REPORT_TYPE_NOT_SUPPORTED`. The generic error mapper in mobile does not display a specialized "Edition Coming Soon" message.

---

## 8. Prioritized Implementation Plan

The following tasks represent the sequential roadmap for implementing Phase 2B.5. Each task is small, decoupled, and testable.

### Task 1: Integrate Commerce & Razorpay Checkout in `ReportDetailScreen`
- **Goal:** Connect report purchase to the backend commerce order and Razorpay verification pipeline before initiating report generation.
- **Files Likely to Change:**
  - `apps/mobile/lib/features/reports/screens/report_detail_screen.dart`
  - `apps/mobile/lib/features/reports/services/reports_service.dart`
  - `apps/mobile/lib/features/reports/providers/reports_provider.dart`
- **Expected Behavior:**
  1. User selects profile(s) and taps "Unlock & Pay ₹[Amount]".
  2. Mobile app calls `POST /api/v1/commerce/orders` with `reportType` and `profileId`.
  3. Razorpay payment sheet opens.
  4. On successful payment, mobile calls `POST /api/v1/commerce/orders/:id/verify-payment`.
  5. Upon confirmation of active entitlement, app invokes `createReportJob` and transitions to `ReportGenerationScreen`.
- **Backend Dependencies:** `POST /api/v1/commerce/orders`, `POST /api/v1/commerce/orders/:id/verify-payment` (Existing, verified).
- **Tests Required:** Unit tests for order creation in `reports_provider_test.dart`, widget test for checkout sheet invocation in `report_detail_screen_test.dart`.

### Task 2: Unify Career Report Flow into Universal Report Architecture
- **Goal:** Eliminate duplicate screens (`CareerReportGenerationScreen`, `CareerReportPdfScreen`) and consolidate Career report state under `reports_provider.dart` and `ReportGenerationScreen`.
- **Files Likely to Change:**
  - `apps/mobile/lib/home/screens/reports_screen.dart`
  - `apps/mobile/lib/features/reports/screens/report_detail_screen.dart`
  - `apps/mobile/lib/features/reports/providers/reports_provider.dart`
  - Deprecate/retire `apps/mobile/lib/features/reports/screens/career_report_generation_screen.dart`
- **Expected Behavior:** `_onCareerReportAction` navigates to `ReportDetailScreen(reportType: 'CAREER')`, reusing universal polling, progress visualization, and PDF viewing.
- **Backend Dependencies:** None.
- **Tests Required:** Widget navigation tests, verification of `ReportGenerationScreen` handling `CAREER` SKU.

### Task 3: Automatic Invalidation of History & Real-Time Sync
- **Goal:** Ensure the History tab immediately reflects newly completed reports without requiring manual pull-to-refresh.
- **Files Likely to Change:**
  - `apps/mobile/lib/features/reports/providers/reports_provider.dart`
  - `apps/mobile/lib/home/screens/reports_screen.dart`
- **Expected Behavior:** When `reportGenerationNotifierProvider` transitions to `COMPLETED`, `ref.invalidate(userReportsProvider)` is dispatched.
- **Backend Dependencies:** None.
- **Tests Required:** StateNotifier provider test asserting invalidation call upon completion.

### Task 4: Offline Reconnect & Polling Recovery in Status Poller
- **Goal:** Provide explicit user-facing "Tap to Retry" when connectivity is lost during status polling.
- **Files Likely to Change:**
  - `apps/mobile/lib/features/reports/screens/report_generation_screen.dart`
  - `apps/mobile/lib/features/reports/providers/reports_provider.dart`
- **Expected Behavior:** If status polling fails due to a network exception, polling pauses, an offline indicator appears with a "Retry Connection" button, and auto-resumes once network connectivity is restored.
- **Backend Dependencies:** None.
- **Tests Required:** Mock network failure and recovery widget tests.

---

## 9. Acceptance Criteria and Test Plan

### Acceptance Criteria:
1. **Commerce Flow:**
   - [ ] No report generation request can be dispatched in production mode without a verified Razorpay payment or existing entitlement.
   - [ ] Failed or canceled Razorpay payments safely return the user to `ReportDetailScreen` with a clear explanation and no corrupted state.
2. **Report Coverage:**
   - [ ] All 5 supported reports (`CAREER`, `KUNDLI`, `PLANETARY_SUMMARY`, `CAREER_PROSITY`, `MARRIAGE_COMPATIBILITY`) can be selected, purchased, generated, viewed, and downloaded through the unified mobile UI.
   - [ ] `MARRIAGE_COMPATIBILITY` strictly validates that both primary and secondary birth profiles are selected before purchase.
3. **Generation & Polling:**
   - [ ] Generation progress displays real-time step names and percentage indicators.
   - [ ] Background polling stops immediately upon receiving `COMPLETED` or `FAILED`.
   - [ ] PDF viewing and downloading never triggers backend report recalculation.
4. **History & Persistence:**
   - [ ] Previously purchased reports appear in the History tab with accurate dates, profile names, and page counts.
   - [ ] Tapping "View PDF" on a historical report instantly loads the pre-rendered PDF.

### Test Plan:
- **Unit Tests:**
  - `reports_service_test.dart`: Validate API request payloads, query parameters, and error parsing across all 5 SKUs.
  - `reports_provider_test.dart`: Test state transitions (`idle` -> `creating` -> `polling` -> `completed` / `failed`).
- **Integration Tests:**
  - Test checkout and entitlement flow end-to-end using simulated Razorpay webhooks in staging.
- **E2E Golden / Widget Tests:**
  - `report_detail_screen_test.dart`: Ensure single vs dual profile selector behaves correctly per report type.
  - `report_generation_screen_test.dart`: Verify animation, aphorisms, and error dialog behavior.

---

## 10. Files Inspected and Evidentiary Traceability

### Mobile UI Files Inspected:
- `apps/mobile/lib/home/screens/reports_screen.dart` (Catalogue, Tier Sheet, Upcoming editions, History tab)
- `apps/mobile/lib/features/reports/screens/report_detail_screen.dart` (Purchase details, pricing breakdown, profile inputs, generation trigger)
- `apps/mobile/lib/features/reports/screens/report_generation_screen.dart` (Universal progress animation & status polling)
- `apps/mobile/lib/features/reports/screens/report_pdf_viewer_screen.dart` (PDF viewing, downloading, native sharing)
- `apps/mobile/lib/features/reports/screens/career_report_overview_screen.dart` (Career-specific overview)
- `apps/mobile/lib/features/reports/screens/career_report_generation_screen.dart` (Career-specific polling screen)
- `apps/mobile/lib/features/reports/screens/career_report_pdf_screen.dart` (Career-specific PDF screen)
- `apps/mobile/lib/features/reports/providers/reports_provider.dart` (Universal reports StateNotifier)
- `apps/mobile/lib/features/reports/providers/career_report_provider.dart` (Career-specific StateNotifier)
- `apps/mobile/lib/features/reports/services/reports_service.dart` (Mobile HTTP service for reports)
- `apps/mobile/lib/features/reports/models/report_model.dart` & `user_report_item_model.dart` (Data models)
- `apps/mobile/lib/features/shop/screens/checkout_screen.dart` (Reference for Razorpay integration pattern)
- `apps/mobile/lib/features/consultations/widgets/booking_flow_sheet.dart` (Reference for checkout integration pattern)

### Backend API & Engine Files Inspected:
- `apps/api/src/modules/reports/reports.routes.ts` (Fastify route declarations, schemas, RBAC)
- `apps/api/src/modules/reports/reports.service.ts` (Report lifecycle, feature access gates, S3 downloads)
- `apps/api/src/modules/commerce/commerce.catalog.ts` (Catalog SKUs, prices, tax configuration)
- `apps/api/src/modules/commerce/commerce.service.ts` (Order creation, Razorpay order generation)
- `packages/report-engine/src/index.ts` (Report generator exports: Kundli, Planetary, Matchmaking, Pro Horoscope, Career)
- `packages/prediction-engine/src/services/openrouter-career-analysis.provider.ts` (Career analysis engine)

---

## 11. Explicit Confirmation of System State

**Strict Read-Only Audit Adherence:**
- Zero code modifications were made to `apps/mobile`, `apps/api`, `packages/`, or `workers/`.
- No configuration files, environment variables, or dependencies were altered.
- No database schemas, Prisma migrations, or production data were created, modified, or deleted.
- Phase 2B.4 remains closed and unmodified.
- System state is strictly read-only and awaiting engineering approval before Phase 2B.5 implementation commences.
