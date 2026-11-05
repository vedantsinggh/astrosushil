# Phase 2B.1 Execution Report: Lifecycle Hardening, Storage Durability, AI Safety, Whole Sign & Numerical Integrity

**Date:** 2026-11-03  
**Status:** Completed & Fully Remediated  
**Branch/Workspace:** `/home/pilot/Projects/astrosushil`  
**Phase:** 2B.1 of `PHASE_2B_IMPLEMENTATION_PLAN.md`  

---

## 1. Executive Summary

Phase 2B.1 implementation has been completed and remediated strictly within the authorized scope boundaries. This phase resolves five critical production vulnerabilities and integrity defects in the Astro Sushil platform:
1. **Report Download Lifecycle:** Replaced on-the-fly chart recalculation and PDF re-rendering on download with strictly deterministic retrieval of stored artifact bytes. Profile ownership is strictly enforced; missing storage assets emit an operational alert `[PDF_DOWNLOAD_ALERT]` and return HTTP 404 `REPORT_ASSET_NOT_FOUND` without fallback regeneration. Real adapter-level SHA-256 verification confirms exact byte-for-byte fidelity with zero recalculation.
2. **Storage Durability & Failure Handling:** Ephemeral `/tmp` fallback is strictly prohibited in production (`process.env.NODE_ENV === 'production'`). Storage upload failures immediately mark report records as `FAILED` (`STORAGE_UPLOAD_FAILED`) and can never produce a `COMPLETED` report. If recording the `FAILED` state to the database encounters an error (double-fault), it is logged with full context (`reportId`, `userId`, `uploadErr`, `dbErr`) and re-thrown.
3. **Production AI Safety & Retry Limits:** Disabled mock AI provider fallbacks in production. In production, unconfigured OpenRouter credentials immediately fail jobs with `AI_CREDENTIALS_MISSING` (0 network attempts), and explicit `mock` requests fail with `AI_PROVIDER_ERROR`. Controlled exponential backoff retries are preserved for transient provider failures (HTTP 429, 500, 502, 503, 504, network drops, output truncation), while non-transient errors (HTTP 401, 403, 400) immediately abort retries without consuming extra attempts.
4. **Whole Sign House Construction Integrity:** Replaced an erroneous house cusp calculation in `pro-horoscope.generator.ts` (which offset 30° houses from the exact ascendant longitude) with the canonical Whole Sign house system matching `chart-calculator.ts`. The sign containing the ascendant defines House 1, beginning at the 0° boundary of that sign; each subsequent house begins at the next 30° sign boundary; and the ascendant degree remains strictly within House 1.
5. **Numerical Calculation Integrity:** Eliminated fabricated fallback constants in `pro-horoscope.generator.ts` (previously `sthanaBala: 140.0`, `totalRupas: 5.33`, `bhavadhipatiBala: 5.0`). Replaced with explicit error propagation (`SHADBALA_CALCULATION_FAILED` and `BHAVA_BALA_CALCULATION_FAILED`). With Whole Sign house boundaries and sign indices correctly mapped, deterministic Shadbala and Bhava Bala calculations succeed authentically end-to-end.

---

## 2. Exact Files Changed

| File | Change Description |
|---|---|
| [`packages/report-engine/src/generators/pro-horoscope.generator.ts`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/generators/pro-horoscope.generator.ts) | 1. Corrected Whole Sign house construction to use canonical sign boundaries (`startLongitude = (houseRashiIndex - 1) * 30`, `cuspLongitude = startLongitude`, `endLongitude = houseRashiIndex * 30`), ensuring the ascendant remains within House 1.<br>2. Mapped `rashiIndex`, `startLongitude`, `endLongitude`, and `cuspLongitude` into `astroChart.houses`.<br>3. Removed fabricated fallback values (`140.0`, `5.0`); propagated calculation failures explicitly. |
| [`packages/report-engine/src/__tests__/whole-sign-pro-horoscope.test.ts`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/__tests__/whole-sign-pro-horoscope.test.ts) | Added comprehensive regression test suite covering ascendant at 3°, 29°, sign boundaries (0.05°, 29.95°), Whole Sign 12-house sequence, Shadbala/Bhava Bala input consistency, and real calculated charts. |
| [`apps/api/src/modules/reports/reports.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts) | 1. Removed on-the-fly chart recalculation and PDF rendering fallback from `generateReportPdfBuffer`. Verified ownership and served exact stored bytes. Emitted `[PDF_DOWNLOAD_ALERT]` and threw `REPORT_ASSET_NOT_FOUND` on missing key or unreadable storage asset.<br>2. In `createReportJob`, caught storage upload errors, recorded a `FAILED` report record in Prisma, added double-fault error logging if Prisma write fails, and threw `STORAGE_UPLOAD_FAILED` to prevent creating a `COMPLETED` record on storage failure. |
| [`apps/api/src/services/report-worker.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts) | 1. Added production guards in `executeReportPipeline`: if `NODE_ENV === 'production'`, explicit `mock` requests transition to `FAILED` with `AI_PROVIDER_ERROR`, and missing API keys transition to `FAILED` with `AI_CREDENTIALS_MISSING`. Guaranteed `useMock = false` in production.<br>2. Wrapped status persistence in `failJob` with double-fault logging so database failures during failure handling are never swallowed. |
| [`apps/api/src/services/storage.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/storage.service.ts) | 1. Made `localFallbackDir` configurable via `process.env.STORAGE_LOCAL_DIR`.<br>2. Implemented `ensureConfiguredInProduction()` throwing `STORAGE_CONFIGURATION_ERROR` when R2 credentials are missing in production across `upload`, `downloadBuffer`, `getSignedDownloadUrl`, `delete`, `exists`, `getMetadata`.<br>3. Disabled local signed token downloads in production within `verifyLocalSignedUrl`. |
| [`packages/prediction-engine/src/providers/openrouter-career-analysis.provider.ts`](file:///home/pilot/Projects/astrosushil/packages/prediction-engine/src/providers/openrouter-career-analysis.provider.ts) | In production, disabled mock fallback on missing API keys (`AI_CREDENTIALS_MISSING`) and on retry exhaustion. Preserved non-transient error immediate aborts (HTTP 401, 403, 400). Maintained mock provider behavior in non-production. |
| [`apps/api/tests/unit/phase2b1-integrity.test.ts`](file:///home/pilot/Projects/astrosushil/apps/api/tests/unit/phase2b1-integrity.test.ts) | Expanded verification suite to 16 tests covering real local test-storage PDF retrieval, storage double-fault logging, AI non-transient aborts, and numerical integrity. |
| [`apps/api/tests/integration/phase4-report-hardening.test.ts`](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/phase4-report-hardening.test.ts) | Adjusted test 2 timeout to 120000ms to accommodate local xelatex compilation execution time (~58s). |

---

## 3. Whole Sign House Mapping: Before vs. After & Verification

### A. Defect Identification
In `packages/report-engine/src/generators/pro-horoscope.generator.ts`, line 191 previously computed:
```ts
// DEFECTIVE (Previous implementation):
const cuspLong = ((h.houseNumber - 1) * 30 + (asc.longitude || 0)) % 360;
const rashiIdx = Math.floor(cuspLong / 30) + 1;
```
This formula constructed 30° equal houses starting at the *exact ascendant degree*, rather than Whole Sign houses. For example, if the ascendant was at 14.5° of Aries:
- House 1 began at 14.5° of Aries and ended at 44.5° (14.5° Taurus).
- House 2 began at 14.5° of Taurus.
This violated the canonical Whole Sign house convention mandated by the system.

### B. Correct Whole Sign Construction
In canonical Whole Sign house construction:
1. Determine the zodiac sign containing the ascendant (`ascRashiIndex = getRashiIndex(ascLongitude)`).
2. House 1 begins at the **0° boundary** of that sign: `startLongitude = (ascRashiIndex - 1) * 30`.
3. House 1 ends at the sign boundary: `endLongitude = ascRashiIndex * 30`.
4. House cusp is the sign boundary: `cuspLongitude = startLongitude`.
5. The ascendant degree strictly satisfies `startLongitude <= ascLongitude < endLongitude`, remaining within House 1.
6. Each subsequent house $h$ (from 1 to 12) begins at the next sign boundary:
   ```ts
   const houseRashiIndex = ((ascRashiIndex - 1 + (h.houseNumber - 1)) % 12) + 1;
   const houseRashiDef = RASHIS[houseRashiIndex - 1];
   const startLongitude = (houseRashiIndex - 1) * 30;
   const endLongitude = houseRashiIndex * 30;
   const cuspLongitude = startLongitude;
   ```

### C. Evidence of Production Correctness
The corrected mapping in `pro-horoscope.generator.ts` now matches the canonical Whole Sign house logic defined in [`chart-calculator.ts:L121-L137`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/chart/chart-calculator.ts#L121-L137) and [`chart-normalizer.ts:L110-L128`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/chart/chart-normalizer.ts#L110-L128).

Tested and verified in [`whole-sign-pro-horoscope.test.ts`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/__tests__/whole-sign-pro-horoscope.test.ts):
- **Early degree ascendant (Aries 3.0°):** House 1 = Aries [0°, 30°), House 2 = Taurus [30°, 60°), ..., House 12 = Pisces [330°, 360°). Ascendant degree remains in House 1.
- **Late degree ascendant (Leo 29.0°):** House 1 = Leo [120°, 150°), House 2 = Virgo [150°, 180°), ..., House 12 = Cancer [90°, 120°). Ascendant degree remains in House 1.
- **Sign boundary ascendant (Taurus 0.05°):** House 1 = Taurus [30°, 60°), House 2 = Gemini [60°, 90°), House 12 = Aries [0°, 30°).
- **Sign boundary ascendant (Pisces 29.95°):** House 1 = Pisces [330°, 360°), House 2 = Aries [0°, 30°).
- **Strength engine consistency:** `ShadbalaCalculator` and `calculateBhavaBala` execute without errors and produce accurate lordships (e.g. Scorpio Lagna -> House 1 lord Mars, House 2 lord Jupiter, House 9 lord Moon, House 10 lord Sun).
- **Real calculated chart:** Verified using `ChartCalculator` and `AstronomyEngineAdapter`.

---

## 4. Storage Durability & Failure State Handling

1. **No Unpersisted Completed Reports:**
   - In `reports.service.ts:createReportJob`, storage upload is attempted *before* writing `status: 'COMPLETED'`.
   - If `storageService.upload` fails, the catch block writes a `status: 'FAILED'` record with `errorCode: 'STORAGE_UPLOAD_FAILED'` and throws HTTP 500. A report can never be marked `COMPLETED` without durable artifact storage.
2. **Double-Fault Resilience:**
   - If persisting the `FAILED` state to Prisma also throws an error (e.g. database down), the double-fault is caught, logged with full context (`reportId`, `userId`, `uploadErr`, `dbErr`) under `[REPORT_CREATE] Critical double-fault`, and the original error is still thrown.
   - In `report-worker.service.ts:failJob`, `prisma.report.update` is wrapped in a try/catch. If the database update fails, it is logged under `[CareerReportWorker] Critical double-fault` and not swallowed.
3. **Production Guard:**
   - In `storage.service.ts:ensureConfiguredInProduction`, missing R2 credentials in production throw `STORAGE_CONFIGURATION_ERROR`. Production cannot silently fall back to ephemeral `/tmp` storage.

---

## 5. AI Retry Boundaries & Request Multiplier Audit

### A. Source-Code Retry Loop Mechanics
In [`packages/prediction-engine/src/providers/openrouter-career-analysis.provider.ts:L48-L120`](file:///home/pilot/Projects/astrosushil/packages/prediction-engine/src/providers/openrouter-career-analysis.provider.ts#L48-L120):
```ts
let attempt = 0;
while (attempt < this.config.maxRetries) {
  attempt++;
  // ... attempt HTTP fetch call ...
}
```
1. **Meaning of `maxRetries`:** `this.config.maxRetries` represents the **TOTAL MAXIMUM ATTEMPTS BUDGET** (initial request + all retries combined), NOT "1 initial + N retries".
   - In iteration 1 (`attempt = 0 < maxRetries`): `attempt` becomes 1 (Initial Request).
   - In iteration 2 (`attempt = 1 < maxRetries`): `attempt` becomes 2 (Retry 1).
   - In iteration 3 (`attempt = 2 < maxRetries`): `attempt` becomes 3 (Retry 2).
   - When `attempt = 3`, condition `3 < 3` evaluates to `false` and the loop terminates. **A 4th request is mathematically impossible.**
2. **Default vs. Configured Limit:**
   - In [`openrouter-career.config.ts:L34`](file:///home/pilot/Projects/astrosushil/packages/prediction-engine/src/config/openrouter-career.config.ts#L34), `OPENROUTER_CAREER_MAX_RETRIES` defaults to `'2'` (1 initial + 1 retry = 2 total requests max).
   - If `OPENROUTER_CAREER_MAX_RETRIES=3` is configured in the environment, `this.config.maxRetries` is 3 (1 initial + 2 retries = 3 total requests max).

### B. Cross-Layer Matrix & Request Multiplication Audit

| Property | Provider Layer (`OpenRouterCareerAnalysisProvider`) | Worker Layer (`CareerReportWorker`) |
|---|---|---|
| **Attempt Budget Configuration** | `OPENROUTER_CAREER_MAX_RETRIES`: default `2` (max 2 total requests). If set to `3`: max 3 total requests. | 0 retries (1 single execution pass per enqueued job). |
| **Backoff Strategy** | Exponential backoff:<br>• HTTP 429: `min(2000 * 2^(attempt-1), 10000)` ms (2s, 4s, capped at 10s)<br>• 5xx / Network / Truncation: `min(1000 * 2^(attempt-1), 5000)` ms (1s, 2s, capped at 5s) | None (single pass). |
| **Retryable Errors** | Network disconnects (`ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `fetch failed`), timeouts (`AbortError`), token truncation (`finishReason=length`), HTTP 429, 500, 502, 503, 504. | N/A |
| **Fatal / Non-Retryable Errors** | Missing API credentials (`AI_CREDENTIALS_MISSING`), HTTP 400, 401, 403, 404. **Aborts immediately after 0 or 1 attempt.** | Calculation errors, validation failures, storage failures -> transitions job to `FAILED`. |
| **Re-enqueue Behavior** | Throws `OPENROUTER_ANALYSIS_FAILED` after retry exhaustion. | Catches error, calls `failJob(reportId, 'CAREER_ANALYSIS_FAILED')`. **Does not re-enqueue failed jobs.** |
| **Max Requests per Job** | **Strict maximum of 2 requests (default)** or **3 requests (when configured)** under transient failures.<br>Exactly 1 request for HTTP 401/403.<br>Exactly 0 requests if credentials missing. | Exactly 1 pipeline execution per job. |

**Multiplying Retry Audit:** Verified directly from code that retries across layers **do not multiply**. The worker executes 1 pipeline pass without automated retry loops (BullMQ is not active; Redis queue/memory queue performs 1 pass per enqueued report). Failed jobs transition to `FAILED` and are not re-enqueued. Provider retries are strictly bounded by `this.config.maxRetries`.

---

## 6. PDF Download Integrity: Mocks vs. Real Storage Adapter

- **Mocked Unit Test:** Verified in `phase2b1-integrity.test.ts` (test 1) that `downloadBuffer` is called with exact path and zero calculation spies are invoked.
- **Real Storage Adapter Test:** Added dedicated adapter-level test `verifies real PDF download integrity using actual local test-storage adapter without mocks` in [`phase2b1-integrity.test.ts:L98-L159`](file:///home/pilot/Projects/astrosushil/apps/api/tests/unit/phase2b1-integrity.test.ts#L98-L159).
  - Configures `STORAGE_LOCAL_DIR` to a clean temporary directory.
  - Uploads a known test PDF buffer using the real `storageService.upload` implementation.
  - Downloads the buffer through `reportsService.generateReportPdfBuffer`.
  - Asserts byte-for-byte equality: `expect(downloadResult.buffer.equals(realPdfBytes)).toBe(true)`.
  - Asserts SHA-256 equality: `crypto.createHash('sha256').update(downloadResult.buffer).digest('hex') === expectedHash`.
  - Asserts 0 calls to `calculateChartForProfile`, `calculateNormalizedChart`, `generateReportPdf`, `generateCareerReportPdf`.
  - Cleans up real test files from disk.

---

## 7. Tests Executed and Actual Results

### A. Dedicated Phase 2B.1 Verification Suite
Command: `npx vitest run tests/unit/phase2b1-integrity.test.ts` (in `apps/api`)  
Status: **PASSED (16/16 tests, 100%)**
- 1. Report Download Lifecycle (5 tests):
  - serves exact stored PDF bytes with matching SHA-256 and zero recalculation/regeneration calls (PASSED)
  - verifies real PDF download integrity using actual local test-storage adapter without mocks (PASSED)
  - enforces ownership verification and rejects cross-user access (PASSED)
  - returns `REPORT_ASSET_NOT_FOUND` (404) without regenerating when storageKey is missing (PASSED)
  - returns `REPORT_ASSET_NOT_FOUND` (404) without regenerating when storage file read fails (PASSED)
- 2. Storage Durability (5 tests):
  - disables ephemeral `/tmp` fallback in production and requires object storage credentials (PASSED)
  - preserves safe local storage behavior in development/test environments (PASSED)
  - ensures storage failure during synchronous creation cannot result in a `COMPLETED` report (PASSED)
  - logs critical double-fault and throws when recording `FAILED` state also encounters database error (PASSED)
  - worker `failJob` logs critical double-fault if database persistence fails during status update (PASSED)
- 3. Production AI Safety (4 tests):
  - prevents mock provider usage in production and fails job with `AI_PROVIDER_ERROR` (PASSED)
  - fails job with `AI_CREDENTIALS_MISSING` when OpenRouter key is missing in production (PASSED)
  - `OpenRouterCareerAnalysisProvider` throws without mock fallback when retries exhaust in production (PASSED)
  - `OpenRouterCareerAnalysisProvider` immediately aborts without retrying on non-transient HTTP 401 error (PASSED)
- 4. Numerical Calculation Integrity (2 tests):
  - propagates Shadbala calculation errors instead of injecting fabricated 140.0 fallback values (PASSED)
  - propagates Bhava Bala calculation errors instead of injecting fabricated 5.0 fallback values (PASSED)

### B. Whole Sign House Mapping & Strength Consistency Suite
Command: `npx vitest run packages/report-engine/src/__tests__/whole-sign-pro-horoscope.test.ts`  
Status: **PASSED (5/5 tests, 100%)**
- correctly maps Whole Sign houses when ascendant is at 3° of a sign (early degree) (PASSED)
- correctly maps Whole Sign houses when ascendant is at 29° of a sign (late degree) (PASSED)
- correctly maps Whole Sign houses when ascendant is close to a sign boundary (0.05° and 29.95°) (PASSED)
- maintains input consistency between Whole Sign houses and Shadbala/Bhava Bala (PASSED)
- verifies real calculated chart through `AstronomyEngineAdapter` produces consistent Whole Sign houses (PASSED)

### C. Consumer Reports Multi-Tier Integration Suite
Command: `npx vitest run tests/integration/phase4-consumer-reports.test.ts` (in `apps/api`)  
Status: **PASSED (5/5 tests, 100%)**
- Generates Pro Horoscope (`CAREER_PROSITY`) with Shodashvargas, Shadbala, and Bhava Bala (PASSED)
- Rejects Matchmaking report when partnerProfileId is missing or identical (PASSED)
- Generates Matchmaking Report with 36-point Guna Milan & Manglik comparative evaluation (PASSED)
- Asynchronously processes Pro Horoscope and Matchmaking jobs through worker pipeline (PASSED)
- Evaluates featureAccessService for paid orders on consumer report types (PASSED)

### D. OpenRouter Career Analysis Suite
Command: `npx vitest run packages/prediction-engine/src/__tests__/openrouter-career-analysis.test.ts`  
Status: **PASSED (5/5 tests, 100%)**

### E. Strength API & Service Unit Suite
Command: `npx vitest run tests/unit/strength-api.test.ts` (in `apps/api`)  
Status: **PASSED (5/5 tests, 100%)**

### F. Multi-Chart & Claim Validation Suites
Command: `npx vitest run packages/report-engine/src/__tests__/multi-chart-profiles.test.ts packages/report-engine/src/__tests__/claim-validation.test.ts`  
Status: **PASSED (7/7 tests, 100%)**

### G. Report Hardening Integration Suite
Command: `npx vitest run tests/integration/phase4-report-hardening.test.ts` (in `apps/api`)  
Status: **PASSED (10/10 tests, 100%)**

### H. Monorepo Build Check
Command: `npm run build` across all workspaces  
Status: **Exit Code 0**  
- `@astro/admin`: Compiled Next.js 14 production bundle cleanly.
- `@astro/api`: `tsc` clean (0 errors).
- `@astro/astrology-engine`: `tsc` clean (0 errors).
- `@astro/gupta-nadi-engine`: `tsc` clean (0 errors).
- `@astro/prediction-engine`: `tsc` clean (0 errors).
- `@astro/report-engine`: `tsc` clean (0 errors).
- `@astro/shared`: `tsc` clean (0 errors).

---

## 8. Remaining Limitations & Phase 2B Boundary Compliance

1. **R2 Credentials in Production:** Production environments must configure `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME`. Operations will fail fast with `STORAGE_CONFIGURATION_ERROR` if unconfigured.
2. **Phase 2B.2 Scope Boundary:**
   - Editorial dosha removals, template changes, and section removals were **NOT** performed.
   - Astrological calculation formulas in `chart-calculator.ts` were **NOT** modified.
   - Timezone solver and Phase 2A persistence were **NOT** modified.
   - Database schema was **NOT** altered.

Phase 2B.1 remediation is complete. Work has stopped awaiting explicit supervisor authorization for Phase 2B.2.
