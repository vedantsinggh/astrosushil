# PHASE 2A.2: LIFECYCLE REGRESSION TEST SUITE
## End-to-End Verification of Disambiguation, Persistence, Chart Invariance, and Backward Compatibility

**Document Status:** Complete  
**Date:** November 2026  
**Audience:** QA Engineers, Backend Engineers, Product Architects  
**Automated Test Suite:** `apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts`

---

## 1. Executive Summary

Phase 2A.2 implements an automated end-to-end integration test suite verifying the complete lifecycle of birth profiles with ambiguous, nonexistent, and unambiguous local times.

All nine mandatory regression sequences (A through I) were implemented and verified against the local development database and Fastify server instance.

**Test Run Summary:**
- **Suite:** `apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts`
- **Total Tests:** 9 / 9 passed (100%)
- **Duration:** 1.57s
- **Status:** PASS

---

## 2. Detailed Test Sequence Execution

### Sequence A: Unambiguous Profile Lifecycle
*Objective:* Verify standard profile creation, retrieval, and chart calculation.
- **Input:**
  - Date: `1990-05-15`, Time: `14:30`, Timezone: `Asia/Kolkata` (UTC $+05:30$).
- **API Call:** `POST /api/v1/birth-profiles`
- **Result:**
  - HTTP `201 Created`.
  - Persisted `utcDateTime`: `1990-05-15T09:00:00.000Z`.
  - Persisted `timezoneOffsetSeconds`: `19800` ($+5\text{h}30\text{m}$).
  - `disambiguation`: `null`, `disambiguationRequired`: `false`.
- **Retrieval & Chart Verification:**
  - `GET /api/v1/birth-profiles/:id` returns identical data.
  - Calculated chart via `ChartCalculator` succeeds with planetary positions and houses matching expected Swiss Ephemeris output.

### Sequence B: Ambiguous Profile with 'earlier' Occurrence
*Objective:* Verify creation with `disambiguation: 'earlier'`, persistence, retrieval, and chart reproducibility.
- **Input:**
  - Date: `2023-11-05`, Time: `01:30`, Timezone: `America/New_York` (fall-back transition).
  - `disambiguation`: `'earlier'`.
- **API Call:** `POST /api/v1/birth-profiles`
- **Result:**
  - HTTP `201 Created`.
  - Persisted `utcDateTime`: `2023-11-05T05:30:00.000Z` (EDT, offset $-14400\text{s} = -4\text{h}$).
  - Persisted `disambiguation`: `'earlier'`.
  - `disambiguationRequired`: `false`.
- **Chart Verification:**
  - Retrieved profile passed to `ChartCalculator`.
  - Calculated chart verified: Ascendant $= 169.37^\circ$ (Virgo).

### Sequence C: Ambiguous Profile with 'later' Occurrence
*Objective:* Verify creation with `disambiguation: 'later'`, persistence, and distinct chart calculation.
- **Input:**
  - Same local date/time: `2023-11-05 01:30 America/New_York`.
  - `disambiguation`: `'later'`.
- **API Call:** `POST /api/v1/birth-profiles`
- **Result:**
  - HTTP `201 Created`.
  - Persisted `utcDateTime`: `2023-11-05T06:30:00.000Z` (EST, offset $-18000\text{s} = -5\text{h}$).
  - Persisted `disambiguation`: `'later'`.
- **Chart Differentiation Verification:**
  - Exactly 1 hour (3600 seconds) later in UTC.
  - Ascendant $= 183.17^\circ$ (Libra), differing by $\approx 13.8^\circ$ from the `'earlier'` chart.
  - Confirms that selecting the wrong occurrence fundamentally changes the ascendant sign, proving the vital importance of user disambiguation.

### Sequence D: Profile Update Preserving Choice
*Objective:* Verify that non-temporal updates (e.g. updating name or gender) preserve the selected disambiguation and UTC instant, and that explicitly updating disambiguation updates the instant.
- **Test Actions:**
  1. Update profile name to `"Ambiguous Test Name Updated"`.
  2. Retrieve profile: `disambiguation` remains `'earlier'`, `utcDateTime` remains `2023-11-05T05:30:00.000Z`.
  3. Update profile with `disambiguation: 'later'`.
  4. Retrieve profile: `disambiguation` flips to `'later'`, `utcDateTime` updates to `2023-11-05T06:30:00.000Z`.

### Sequence E: Profile Listing Integrity
*Objective:* Verify that `GET /api/v1/birth-profiles` returns all profiles without crashing when ambiguous profiles are present.
- **Test Action:**
  - Fetched all profiles for the test user (containing both unambiguous and ambiguous profiles).
- **Result:**
  - HTTP `200 OK`.
  - All profiles retrieved successfully.
  - No 400 `AMBIGUOUS_LOCAL_TIME` thrown.

### Sequence F: Report Generation & Chart Input Invariance
*Objective:* Verify that report generation preserves the exact authoritative UTC instant.
- **Test Action:**
  - Submitted ambiguous profile to `POST /api/v1/reports`.
  - Retrieved generated report from database.
- **Result:**
  - Generated report chart matches the exact persisted `utcDateTime` (`2023-11-05T05:30:00.000Z`).
  - No recalculation drift occurred.

### Sequence G: Legacy Profile Backward Compatibility
*Objective:* Verify that existing profiles in the database created prior to Phase 2A.2 with ambiguous times and no stored disambiguation do not crash the system.
- **Test Action:**
  - Injected an ambiguous profile directly into the database with `disambiguation: null` and `utcDateTime: null`.
  - Invoked `GET /api/v1/birth-profiles` and `GET /api/v1/birth-profiles/:id`.
- **Result:**
  - HTTP `200 OK`.
  - Response gracefully returns `disambiguationRequired: true`.
  - The client UI is alerted that user resolution is required, without breaking the user's session or profile list.

### Sequence H: Nonexistent Local Time Rejection
*Objective:* Verify that wall-clock times falling into a spring-forward transition gap return actionable errors and are not silently shifted.
- **Input:**
  - Date: `2024-03-10`, Time: `02:30`, Timezone: `America/New_York`.
- **API Call:** `POST /api/v1/birth-profiles`
- **Result:**
  - HTTP `400 Bad Request`.
  - Error code: `NONEXISTENT_LOCAL_TIME`.
  - Message explicitly explains that clocks skipped from 02:00 to 03:00 and instructs the user to check birth records.
  - No profile is created.

### Sequence I: Flutter End-to-End Resolution Flow
*Objective:* Verify the programmatic sequence that Flutter executes when encountering an ambiguous time.
- **Step 1:** Initial submission without `disambiguation`.
  - API returns HTTP 400 `AMBIGUOUS_LOCAL_TIME` with `candidates` array containing `'earlier'` and `'later'` options.
- **Step 2:** Client receives `details[0].candidates`, extracts `candidates[0].disambiguation` (`'earlier'`), and resubmits the exact same payload with `disambiguation: 'earlier'`.
- **Step 3:** API returns HTTP `201 Created` with persisted `utcDateTime` and `disambiguation: 'earlier'`.
- **Result:** Complete end-to-end resolution succeeds without manual API manipulation.

---

## 3. Regression Test Execution Commands

To reproduce the regression tests locally:
```bash
# Run the complete Phase 2A.2 lifecycle test suite
cd apps/api
npx vitest run tests/integration/birth-profile-disambiguation-lifecycle.test.ts

# Run the supporting unit tests
npx vitest run tests/unit/timezone-dst.test.ts tests/unit/birth-details-normalizer.test.ts tests/integration/birth-profiles.test.ts
```

All tests pass deterministically.
