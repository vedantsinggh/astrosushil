# Astro Sushil: Phase 1 Test Execution & Test Suite Audit

**Document Reference:** `docs/audits/report_system/phase_1_verification/PHASE_1_TEST_RESULTS.md`  
**Classification:** Empirical Test Execution & Diagnostic Report  
**Date of Execution:** November 3, 2026  
**Auditor:** DeepMind Agentic Pair Programmer  
**Scope:** Execution of all existing automated test suites across the Astro Sushil monorepo without code modification.  

---

## 1. Test Execution Summary Matrix

| Monorepo Package / App | Test Command | Test Files Passed / Total | Tests Passed / Total | Skipped | Duration | Primary Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `packages/astrology-engine` | `npm --prefix packages/astrology-engine test` | **33 / 33 (100%)** | **324 / 324 (100%)** | 0 | 4.73s | **ALL PASS** |
| `packages/prediction-engine` | `npx vitest run packages/prediction-engine` | **3 / 3 (100%)** | **24 / 24 (100%)** | 0 | 3.16s | **ALL PASS** |
| `packages/report-engine` | `npx vitest run packages/report-engine` | **4 / 5 (80%)** | **16 / 17 (94.1%)** | 0 | 183.69s | **1 TIMEOUT FAILURE** |
| `packages/gupta-nadi-engine` | `npx vitest run packages/gupta-nadi-engine` | 0 / 0 | 0 / 0 | 0 | — | *No tests defined* |
| `apps/api` | `npm --prefix apps/api test` | **42 / 55 (76.4%)** | **452 / 539 (83.9%)** | 1 | 185.10s | **13 FILES / 86 TESTS FAILED** |
| **Monorepo Totals** | — | **81 / 96 (84.4%)** | **816 / 904 (90.3%)** | 1 | ~376s | **PARTIAL PASS / TEST ROT** |

---

## 2. Detailed Breakdown by Package

---

### 1. `packages/astrology-engine`
- **Command:** `npm --prefix packages/astrology-engine test`
- **Runner:** Vitest v1.2.2
- **Result:** **33 Passed / 33 Files (324 Tests Passed, 0 Failed)**
- **Duration:** 4.73 seconds
- **Suites Verified:**
  - `tests/unit/birth-details.test.ts` (6 tests)
  - `tests/unit/panchang-calculator.test.ts` (18 tests)
  - `tests/unit/shadbala-calculator.test.ts` (23 tests)
  - `tests/unit/ashtakavarga-calculator.test.ts` (18 tests)
  - `tests/unit/dasha-calculator.test.ts` (20 tests)
  - `tests/unit/yoga-calculator.test.ts` (11 tests)
  - `tests/unit/matchmaking-kootas.test.ts` (33 tests)
  - `tests/unit/varga-calculator.test.ts` (22 tests)
  - `tests/unit/sade-sati.test.ts` (4 tests)
  - `tests/unit/determinism.test.ts` (2 tests)
  - `tests/unit/special-points.test.ts` (5 tests)
  - `tests/unit/transit-calculator.test.ts` (2 tests)
  - `tests/unit/varshaphala-calculator.test.ts` (7 tests)
- **Evaluation:** High unit test stability for pure deterministic formulas within the engine's internal test scope.

---

### 2. `packages/prediction-engine`
- **Command:** `npx vitest run packages/prediction-engine`
- **Result:** **3 Passed / 3 Files (24 Tests Passed, 0 Failed)**
- **Duration:** 3.16 seconds
- **Suites Verified:**
  - `packages/prediction-engine/src/__tests__/career-evidence-engine.test.ts` (12 tests passed)
  - `packages/prediction-engine/src/__tests__/gemini-career-analysis.test.ts` (7 tests passed)
  - `packages/prediction-engine/src/__tests__/openrouter-career-analysis.test.ts` (5 tests passed)
- **Observations:** In `openrouter-career-analysis.test.ts`, tests confirm that when the API key is missing, the provider logs a warning and falls back to `MockCareerAnalysisProvider`.

---

### 3. `packages/report-engine`
- **Command:** `npx vitest run packages/report-engine`
- **Result:** **4 Passed, 1 Failed (16 Tests Passed, 1 Failed)**
- **Duration:** 183.69 seconds
- **Passed Suites:**
  - `packages/report-engine/src/__tests__/career-report.test.ts` (6 tests passed, 57.94s) — *Successfully compiled an 85-page XeLaTeX document containing Unicode characters (`CO₂`, subscript numbers).*
  - `packages/report-engine/src/__tests__/claim-validation.test.ts` (4 tests passed)
  - `packages/report-engine/src/__tests__/latexto-compiler.test.ts` (3 tests passed)
  - `packages/report-engine/src/__tests__/multi-chart-profiles.test.ts` (3 tests passed)
- **Failed Suite:**
  - `packages/report-engine/src/__tests__/e2e-worker-pipeline.test.ts`
  - **Error Output:**
    ```
    FAIL packages/report-engine/src/__tests__/e2e-worker-pipeline.test.ts > E2E Worker Pipeline & Prisma ReportStatus Verification
    Error: Test timed out in 180000ms.
    ```
  - **Root Cause:** The test executes `careerReportWorker.executeReportPipeline` end-to-end, which includes chart calculation, OpenRouter mock fallback, TeX generation, two passes of XeLaTeX compilation, and storage upload. In the test environment without Redis connection pooling, it exceeds the 180-second timeout ceiling.

---

### 4. `apps/api`
- **Command:** `npm --prefix apps/api test`
- **Result:** **13 Failed Files, 42 Passed Files (86 Tests Failed, 452 Passed, 1 Skipped)**
- **Duration:** 185.10 seconds
- **Failed Test Suite Catalog:**

| Failing Test File | Failed Tests | Root Cause / Diagnostic Output |
| :--- | :---: | :--- |
| `tests/integration/shadbala-bhava-bala.test.ts` | 4 failed | `AssertionError: expected 404 to be 400` / `expected 404 to be 200`. Endpoints `/api/v1/astrology/shadbala` and `/api/v1/astrology/bhava-bala` are unmounted or route path altered in Fastify server. |
| `tests/integration/yoga.test.ts` | 3 failed | `TypeError: Cannot read properties of undefined (reading 'totalEvaluated')`. Response structure returned by `/api/v1/astrology/yogas` does not match test schema expectation. |
| `tests/unit/ashtakavarga-api.test.ts` | 2 failed | `TypeError: Cannot read properties of undefined (reading 'sav')`. `result.ashtakavarga` structure drifted from test assertions. |
| `tests/unit/astrology-intelligence.test.ts` | 1 failed | `AssertionError: expected undefined not to be undefined`. DeterministicPredictionEngine test fixture expectation mismatch for `'CAREER'` category. |
| `tests/integration/ashtottari-dasha.test.ts` | 4 failed | `POST /api/v1/astrology/dashas/ashtottari` endpoint returns HTTP 404. |
| `tests/integration/special-points.test.ts` | 4 failed | Endpoints `/api/v1/astrology/special-points` return HTTP 404. |
| `tests/integration/vimshopaka-bala.test.ts` | 4 failed | Endpoints `/api/v1/astrology/vimshopaka-bala` return HTTP 404. |
| `tests/integration/conventions.test.ts` | 2 failed | `GET /api/v1/astrology/conventions` returns HTTP 404. |
| `tests/integration/e2e-worker-pipeline.test.ts` | 1 failed | Timed out after 180,000ms. |
| *Other Integration Suites (4 files)* | ~57 failed | Additional route mounting and contract drift issues between Fastify route definitions and integration fixtures. |

---

## 3. Test Audit Conclusions & Diagnostics

1. **Deterministic Package Health:** The underlying math engines (`@astro/astrology-engine`, `@astro/prediction-engine`) are stable in unit test isolation, with 100% of unit tests passing.
2. **XeLaTeX Production Capability:** The XeLaTeX compilation pipeline in `packages/report-engine` is fully functional on the host system, successfully compiling complete 85-page PDF documents.
3. **API Integration Test Rot:** The 86 failing tests in `apps/api` are primarily caused by **Fastify route mounting mismatches** (tests query endpoints that return HTTP 404) and response payload contract drift.
4. **Non-Destructive Observation:** Per Phase 1 directives, **zero test files or source files were modified** during this audit.
