# Phase 2A.4: Regression Test Results and Verification Log

**Audit Phase:** Phase 2A.4  
**Date:** 2026-11-03  
**Status:** All Tests Passing (0 Failures)  
**Scope:** Real-service birth-profile lifecycle, disambiguation, authoritative UTC propagation, astrology calculations, and report generation.

---

## 1. Summary of Executed Test Suites

| Test Suite / Scope | Working Directory | Command | Duration | Tests Passed / Total | Exit Code |
|---|---|---|---|---|---|
| **Disambiguation Lifecycle & Real Services** | `apps/api` | `npx vitest run tests/integration/birth-profile-disambiguation-lifecycle.test.ts` | 5.78s | **8 / 8** | `0` |
| **Birth Profiles Integration API** | `apps/api` | `npx vitest run tests/integration/birth-profiles.test.ts` | 5.59s | **12 / 12** | `0` |
| **Reports API & PDF Generation Integration** | `apps/api` | `npx vitest run tests/integration/reports.test.ts` | 5.95s | **7 / 7** | `0` |
| **Timezone & Historical DST Unit Tests** | `apps/api` | `npx vitest run tests/unit/timezone-dst.test.ts` | 2.74s | **10 / 10** | `0` |
| **Astrology Engine Domain Tests** | `packages/astrology-engine` | `npm test` | 5.58s | **335 / 335** (34 files) | `0` |
| **Monorepo Production Build** | Repository Root | `npm run build` | 28.5s | **7 workspaces built** | `0` |
| **Flutter Static Analysis** | `apps/mobile` | `flutter analyze lib/features/birth_profile/` | 5.7s | **17 pre-existing warnings** (0 new) | `1` (pre-existing) |

---

## 2. Real-Service Disambiguation Lifecycle Test Details

File: [`apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts`](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts)

### Test A: Earlier Occurrence Lifecycle
- **Input:** `America/New_York`, `2020-11-01 01:30:00`, `disambiguation: 'earlier'`.
- **Created Profile ID:** Saved to PostgreSQL via `POST /api/v1/birth-profiles`.
- **Persisted UTC Instant:** `2020-11-01T05:30:00.000Z` (`timezoneOffsetSeconds: -14400`).
- **Real Service Invocation:** `astrologyService.calculateChartForProfile(savedProfile.id, user, 'D1')`.
- **Verified Calculations:**
  - `chart.normalizedTime.utcIsoString === '2020-11-01T05:30:00.000Z'`
  - `chart.normalizedTime.julianDayUT === 2459154.7291666665`
  - `chart.ascendant.longitude === 172.95155700812743` (Virgo)
- **Status:** PASS

### Test B: Later Occurrence Lifecycle
- **Input:** `America/New_York`, `2020-11-01 01:30:00`, `disambiguation: 'later'`.
- **Created Profile ID:** Saved to PostgreSQL via `POST /api/v1/birth-profiles`.
- **Persisted UTC Instant:** `2020-11-01T06:30:00.000Z` (`timezoneOffsetSeconds: -18000`).
- **Real Service Invocation:** `astrologyService.calculateChartForProfile(savedProfile.id, user, 'D1')`.
- **Verified Calculations:**
  - `chart.normalizedTime.utcIsoString === '2020-11-01T06:30:00.000Z'`
  - `chart.normalizedTime.julianDayUT === 2459154.7708333335`
  - `chart.ascendant.longitude === 186.75338006450638` (Libra)
- **Distinct Instant Invariant Verification:**
  - $\Delta \text{Julian Day} = 0.041666667 \text{ days} = 1.0 \text{ hour}$
  - $\Delta \text{Ascendant Longitude} = 13.80182305637895^\circ$
- **Status:** PASS

### Test C: Timezone Database Independence
- **Procedure:** Spied on `timezoneSolver.resolveLocalTimeToUtc`.
- **Action:** Executed `astrologyService.calculateChartForProfile()` with saved ambiguous profile.
- **Verification:** `resolveSpy` call count was strictly 0.
- **Proof:** Confirmed the calculation honored the persisted instant directly without querying transition tables.
- **Status:** PASS

### Test D: Non-Temporal Profile Update Invariant
- **Procedure:** Updated `name` from `'Temporal Invariant Test'` to `'Temporal Invariant Test Renamed'` using `PATCH /api/v1/birth-profiles/:id`.
- **Verification:**
  - `updatedProfile.utcDateTime` preserved as `2020-11-01T05:30:00.000Z`.
  - `updatedProfile.timezoneOffsetSeconds` preserved as `-14400`.
  - `updatedProfile.disambiguation` preserved as `'earlier'`.
  - Recalculated chart produced identical planetary positions.
- **Status:** PASS

### Test E: Real Report Generation Pipeline
- **Procedure:**
  - Executed `POST /api/v1/reports` with `{ birthProfileId: earlierProfileId, reportType: 'KUNDLI' }`.
  - Retrieved generated report via `GET /api/v1/reports/:id/pdf`.
- **Verification:**
  - Status 200 OK.
  - Content-Type: `application/pdf`.
  - Buffer begins with `%PDF-1.4`.
  - File size: 1,353 bytes.
- **Status:** PASS

### Test F: Legacy Unresolved Profile Handling
- **Procedure:** Created database profile with `disambiguation: null` and `utcDateTime: null` simulating legacy pre-Phase 2A records.
- **Verification:**
  - Profile listing endpoint sets `disambiguationRequired: true`.
  - Direct chart calculation (`calculateChartForProfile`) fails safely with error code `AMBIGUOUS_LOCAL_TIME`.
  - Response contains candidate options:
    - Candidate 1: `2020-11-01T05:30:00.000Z` (`EDT`, `earlier`)
    - Candidate 2: `2020-11-01T06:30:00.000Z` (`EST`, `later`)
  - The system never silently guesses or picks an interpretation.
- **Status:** PASS

### Test G: Nonexistent Local Time Rejection
- **Input:** `2020-03-08 02:30:00` in `America/New_York` (spring-forward gap).
- **Verification:**
  - `POST /api/v1/birth-profiles` returns HTTP 400.
  - Error code: `NONEXISTENT_LOCAL_TIME`.
  - Message informs client of the 1-hour gap (`02:00 -> 03:00`).
- **Status:** PASS

### Test H: Mobile Client Disambiguation Flow
- **Procedure:**
  - Submitted ambiguous birth profile without disambiguation choice $\to$ received 400 `AMBIGUOUS_LOCAL_TIME` with candidates.
  - Extracted `candidates[0].disambiguation` (`'earlier'`).
  - Resubmitted creation request with `disambiguation: 'earlier'` $\to$ 201 Created.
  - Immediately invoked `calculateChartForProfile` $\to$ returned complete chart.
- **Status:** PASS

---

## 3. Flutter Analysis Details

Analyzer target: `apps/mobile/lib/features/birth_profile/`

```text
Analyzing birth_profile...
17 issues found. (ran in 5.7s)
```

### Analysis of Findings:
- In Phase 2A.3, 19 warnings were reported, of which 2 were new `prefer_const_constructors` in `create_birth_profile_screen.dart` at lines 370 and 417.
- Both const constructors were corrected in Phase 2A.4:
  - Line 370: `const Row(...)`
  - Line 417: `const Row(...)`
- The remaining 17 warnings are all pre-existing Flutter 3.32+ deprecations:
  - 14 occurrences of `withOpacity` (deprecation recommendation: `withValues()`).
  - 2 occurrences of `RadioListTile.groupValue` / `onChanged` (deprecation recommendation: `RadioGroup`).
  - 1 unnecessary import in `birth_profile_detail_screen.dart`.
- In strict compliance with audit restrictions, no broad or unrelated Flutter refactoring was performed.
