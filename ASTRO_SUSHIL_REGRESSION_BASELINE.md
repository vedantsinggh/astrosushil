# ASTRO SUSHIL — REGRESSION BASELINE & TEST EXECUTION AUDIT

**Document Version:** 1.0.0  
**Audit Date:** November 5, 2026  
**Auditor:** DeepMind Agentic Coding Engineering Pair  
**Authorization Mode:** READ-ONLY COMPREHENSIVE REGRESSION RUN  
**Repository Working Directory:** `/home/pilot/Projects/astrosushil`  

---

## 1. Executive Summary

This document establishes the verified test baseline for the Astro Sushil codebase across all internal packages (`packages/shared`, `packages/astrology-engine`, `packages/gupta-nadi-engine`, `packages/prediction-engine`, `packages/report-engine`), the backend API and worker (`apps/api`), the administrative portal (`apps/admin`), and the mobile application (`apps/mobile`).

All test executions were run in a strict **read-only** mode without modifying source code, test assertions, or database configuration.

### Summary Test Matrix:
| Subsystem / Workspace | Test Runner | Test Files Passing | Tests Passing | Tests Failing | Status / Exit Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`packages/astrology-engine`** | Vitest | 34 / 34 (100%) | 335 / 335 (100%) | 0 | **PASSED (Exit: 0)** |
| **`packages/report-engine`** | Vitest + XeLaTeX | 9 / 9 (100%) | 55 / 55 (100%) | 0 | **PASSED (Exit: 0)** |
| **`packages/prediction-engine`** | Vitest | 3 / 3 (100%) | 47 / 47 (100%) | 0 | **PASSED (Exit: 0)** |
| **Monorepo Package Builds** | TypeScript `tsc` | 5 / 5 packages | N/A (Build) | 0 type errors | **PASSED (Exit: 0)** |
| **`apps/admin` (Next.js)** | TypeScript `tsc` | N/A (Typecheck) | N/A (Typecheck) | 0 type errors | **PASSED (Exit: 0)** |
| **`apps/api` (Task 1G Reliability)** | Vitest (Multi-Process) | 1 / 1 (100%) | 41 / 41 (100%) | 0 | **PASSED (Exit: 0)** |
| **`apps/mobile` (Commerce Checkout)**| Flutter Test | 1 / 1 (100%) | 8 / 8 (100%) | 0 | **PASSED (Exit: 0)** |
| **`apps/api` (Unit Test Suite)** | Vitest | 21 / 24 (87.5%) | 182 / 191 (95.3%) | 8 | **PARTIAL (Exit: 1)** |
| **`apps/api` (Unsupported SKU)** | Vitest | 0 / 1 (0%) | 4 / 6 (66.7%) | 2 | **PARTIAL (Exit: 1)** |

---

## 2. Test Execution Logs & Verification Evidence

---

### 2.1. Astrology Engine Test Suite (`packages/astrology-engine`)

- **Verification Status:** `[VERIFIED: AUTOMATED TESTS]`
- **Command:** `npm run test --workspace=packages/astrology-engine`
- **Exit Code:** `0`
- **Execution Duration:** `6.02s`
- **Test Summary:** `34 passed (34 test files), 335 passed (335 tests)`
- **Key Modules Verified:**
  - `varga-calculator.test.ts`: Shodashvargas D1 through D60 calculations.
  - `dasha-calculator.test.ts`: Vimshottari Mahadasha, Antardasha, and Pratyantardasha periods.
  - `matchmaking-kootas.test.ts`: Ashtakoota 36-point scoring algorithms (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi).
  - `ashtakavarga-calculator.test.ts`: Sarvashtakavarga 337 points and planetary Bhinnashtakavargas.
  - `shadbala-calculator.test.ts`: Six-fold planetary strength calculations.
  - `timezone-dst-resolution.test.ts`: Canonical IANA timezone resolution and DST disambiguation.
  - `panchang-calculator.test.ts`: Tithi, Vara, Nakshatra, Yoga, Karana.
  - `determinism.test.ts`: Identical inputs produce bit-for-bit identical astronomical coordinates under Lahiri Ayanamsa.

---

### 2.2. Report Engine Test Suite (`packages/report-engine`)

- **Verification Status:** `[VERIFIED: AUTOMATED TESTS]`
- **Command:** `npx vitest run --dir packages/report-engine`
- **Exit Code:** `0`
- **Execution Duration:** `63.29s` (includes live local XeLaTeX compilation runs)
- **Test Summary:** `9 passed (9 test files), 55 passed (55 tests)`
- **Key Modules Verified:**
  - `phase2b2-editorial-compliance.test.ts` (11 tests): Eliminates dosha classifications, Kaal Sarp, Kumbha Vivaha, and Nadi Shanti; verifies neutral Gochara Saturn analysis and traditional gemstone parameters.
  - `phase2b3-calculation-integrity.test.ts` (13 tests): Dynamic Gochara transits, Pro Horoscope UTC/DST precision, Whole Sign houses, and actual PDF buffer validity across generators.
  - `phase2b4-prompt-mapper-sync.test.ts` (9 tests): Prompt requests structured evidence-grounded house and planetary interpretations; schema validation; mapper correctness.
  - `career-report.test.ts` (6 tests): End-to-end LaTeX compilation of Career Dossier via `xelatex`.
  - `claim-validation.test.ts` (4 tests): PDF QA verification enforcing `%PDF-1.` header, `%%EOF` footer, and rejecting unrendered placeholders.

---

### 2.3. Prediction Engine Test Suite (`packages/prediction-engine`)

- **Verification Status:** `[VERIFIED: AUTOMATED TESTS]`
- **Command:** `npx vitest run --dir packages/prediction-engine`
- **Exit Code:** `0`
- **Execution Duration:** `5.66s`
- **Test Summary:** `3 passed (3 test files), 47 passed (47 tests)`
- **Key Modules Verified:**
  - `career-evidence-engine.test.ts` (12 tests): Deterministic extraction of 10th house, 6th house, Lagna, and planetary vocational evidence.
  - `openrouter-career-analysis.test.ts` (28 tests): OpenRouter HTTP retries, exponential backoff, prompt synthesis, strict JSON object schema validation, rejection of ungrounded or hallucinated evidence IDs, and prohibition of mock providers in production.
  - `gemini-career-analysis.test.ts` (7 tests): Gemini provider integration and fallback handling.

---

### 2.4. TypeScript Monorepo Build & Typecheck

- **Verification Status:** `[VERIFIED: AUTOMATED TESTS]`
- **Commands:**
  ```bash
  npm run build:packages
  cd apps/api && npx tsc --noEmit
  cd apps/admin && npx tsc --noEmit
  ```
- **Exit Code:** `0`
- **Test Summary:** All 5 internal packages compiled to `dist/`; API and Admin typechecked with **0 type errors**.

---

### 2.5. Worker Distributed Reliability Suite (`apps/api/tests/integration/phase2b5-task1g-final-reliability.test.ts`)

- **Verification Status:** `[VERIFIED: INTEGRATION TESTS]`
- **Command:** `npx vitest run apps/api/tests/integration/phase2b5-task1g-final-reliability.test.ts`
- **Exit Code:** `0`
- **Execution Duration:** `7.89s`
- **Test Summary:** `1 passed (1 test file), 41 passed (41 tests)`
- **Key Invariants Verified:**
  - *Section A: Worker Ownership & Lease Integrity* (Conditions 1–7): Concurrent child-process claiming; token-matching completeJob; lease renewals.
  - *Section B: Recovery Racing & Heartbeat Safety* (Conditions 8–12): Active heartbeat advances abort recovery; stale recovery racing with completion preserves `COMPLETED` and `FULFILLED`.
  - *Section C: Atomic & Honest Retry Handling* (Conditions 13–20): Simultaneous retry concurrency; retry rejected if not FAILED; monotonic `claimVersion` increments.
  - *Section D: Queue Crash-Window Recovery* (Conditions 21–30): Self-healing of DB-committed un-enqueued jobs; `MAX_RECOVERY_ATTEMPTS` enforcement; backlog preservation.
  - *Section E: Order Fulfillment Integrity* (Conditions 31–35): Order marked `FULFILLED` only when report reaches `COMPLETED`; multi-report orders prevent false failures.
  - *Section F: PostgreSQL Fallback Concurrency* (Conditions 36–41): Single and multi-worker claim acquisition and stage progression under total Redis outage using DB CAS.

---

### 2.6. Flutter Mobile Commerce Checkout (`apps/mobile/test/widget/phase2b5_report_commerce_checkout_test.dart`)

- **Verification Status:** `[VERIFIED: AUTOMATED TESTS]`
- **Command:** `cd apps/mobile && flutter test test/widget/phase2b5_report_commerce_checkout_test.dart`
- **Exit Code:** `0`
- **Execution Duration:** `3s`
- **Test Summary:** `8 passed (8 widget tests)`
- **Key Flows Verified:**
  - Order creation requests correct report SKU (`report-career`, `report-kundli`).
  - Native Razorpay SDK checkout integration and payment success callback.
  - User cancellation resets UI state without generating unearned reports.
  - Razorpay payment failure handling.
  - Double-tap button submission protection.
  - Rejection of purchases for unsupported SKUs.

---

### 2.7. Known Test Failures & Defects Under Investigation

The audit identified two test files with failures in `apps/api`:

#### Failure 1: Unit Test Suite (`apps/api/tests/unit/`)
- **Command:** `npx vitest run apps/api/tests/unit/`
- **Exit Code:** `1` (3 failed, 21 passed)
- **Detailed Defect Analysis:**
  1. `ashtakavarga-api.test.ts` (2 failures):
     - The test expects `astrologyService.calculateAshtakavarga` to return `{ birthDetails, ashtakavarga }`.
     - The service method directly returns the raw calculation result `ashtakavargaCalculator.calculateAshtakavarga(rawChart)`, causing `result.birthDetails` to be undefined.
     - *Classification:* `[KNOWN DEFECT: TEST HARNESS MISALIGNMENT]`.
  2. `astrology-intelligence.test.ts` (1 failure):
     - `expect(careerPred).toBeDefined()` failed because the test chart's specific planetary placements did not trigger any of the existing deterministic CAREER rules in `gupta-nadi-engine`.
     - *Classification:* `[KNOWN DEFECT: TEST FIXTURE RULE COVERAGE GAP]`.
  3. `phase2b1-integrity.test.ts` (5 failures):
     - Unit test relies on a hardcoded test user ID (`usr-unit-test-123`) without seeding the corresponding user in the database or mocking the user lookup service, triggering `USER_NOT_FOUND` authorization errors.
     - *Classification:* `[KNOWN DEFECT: TEST SEEDING GAP]`.

#### Failure 2: Unsupported SKU Integration (`apps/api/tests/integration/phase2b3-unsupported-sku.test.ts`)
- **Command:** `npx vitest run apps/api/tests/integration/phase2b3-unsupported-sku.test.ts`
- **Exit Code:** `1` (2 failed, 4 passed)
- **Detailed Defect Analysis:**
  - Tests 5 and 6 test worker handling of `GUPTA_NADI_DOSSIER` and `CHILDBIRTH_FAMILY`.
  - The test harness mocked Prisma in-memory using a Map store (`reportsStore`), but `careerReportWorker.acquireWorkerClaim` and `failJob` were hardened in Task 1G to execute direct atomic SQL updates with `metadata.claimToken` CAS.
  - The in-memory test mock did not emulate the CAS metadata query, leaving the report in `QUEUED` instead of `FAILED`.
  - *Classification:* `[KNOWN DEFECT: TEST MOCK HARNESS OUTDATED]`.

