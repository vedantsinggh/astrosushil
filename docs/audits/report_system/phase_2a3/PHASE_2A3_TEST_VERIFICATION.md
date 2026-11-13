# PHASE 2A.3: INDEPENDENT TEST EXECUTION AND VERIFICATION
## Empirical Test Results, Command Invocations, and Static Analysis Audit

**Document Status:** Complete  
**Date:** November 2026  
**Execution Context:** Independent Read-Only Review (Phase 2A.3)  
**Host Environment:** Linux (x86_64), Node.js v20.x, Flutter 3.32+

---

## 1. Executive Summary

During this independent review, all seven mandated test and analysis commands were executed directly from the terminal without modifying source code, test files, dependencies, or database records.

**Summary of Independent Test Runs:**
- **Astrology Engine Timezone Regression Tests:** 11 / 11 passed (Exit Code 0).
- **API Birth-Details Normalizer & Timezone Tests:** 15 / 15 passed (Exit Code 0).
- **API Birth-Profile Integration & Disambiguation Lifecycle Tests:** 21 / 21 passed (Exit Code 0).
- **Astrology Engine Complete Test Suite:** 335 / 335 passed across 34 test files (Exit Code 0).
- **API Reports Integration Test Suite:** 7 / 7 passed (Exit Code 0).
- **Report Engine Package Scripts:** Package `package.json` contains no `"test"` script (Exit Code 1).
- **Flutter Static Analysis:** Completed with 19 informational/deprecation warnings, exiting with Code 1.

All results documented below reflect live executions performed during Phase 2A.3, distinct from historical Phase 2A.2 reports.

---

## 2. Independent Test Execution Logs

### Test Suite 1: Timezone Solver Forensic Regression Tests
- **Target File:** `packages/astrology-engine/tests/unit/timezone-dst-resolution.test.ts`
- **Working Directory:** `/home/pilot/Projects/astrosushil/packages/astrology-engine`
- **Command:** `npx vitest run tests/unit/timezone-dst-resolution.test.ts`
- **Execution Timestamp:** 2026-11-03T05:20:00+05:30
- **Exit Code:** `0`
- **Results:**
  - Files: 1 passed (1)
  - Tests: 11 passed (11)
  - Duration: 1.27s
- **Verified Test Cases:**
  1. Asia/Kolkata control without DST shift ($\checkmark$)
  2. America/New_York winter standard time ($\checkmark$)
  3. America/New_York summer daylight saving time ($\checkmark$)
  4. Spring-forward gap rejection (2020-03-08 02:30 EDT) ($\checkmark$)
  5. Fall-back ambiguity detection (2020-11-01 01:30 EDT/EST) ($\checkmark$)
  6. UTC zero-offset verification ($\checkmark$)
  7. Nepal 45-minute offset (+05:45) ($\checkmark$)
  8. UTC midnight date rollover ($\checkmark$)
  9. Invalid IANA string rejection ($\checkmark$)
  10. Julian Day UT precision preservation ($\checkmark$)
  11. Reported 03:30 bug fix verification ($\checkmark$)

---

### Test Suite 2: API Birth-Details Normalizer Tests
- **Target Files:**
  - `apps/api/tests/unit/birth-details-normalizer.test.ts`
  - `apps/api/tests/unit/timezone-dst.test.ts`
- **Working Directory:** `/home/pilot/Projects/astrosushil/apps/api`
- **Command:** `npx vitest run tests/unit/birth-details-normalizer.test.ts tests/unit/timezone-dst.test.ts`
- **Execution Timestamp:** 2026-11-03T05:20:06+05:30
- **Exit Code:** `0`
- **Results:**
  - Files: 2 passed (2)
  - Tests: 15 passed (15)
  - Duration: 2.81s
- **Findings:**
  - Normalizer accepts authoritative `utcDateTime` and skips re-resolution.
  - Normalizer rejects nonexistent times with structured `NONEXISTENT_LOCAL_TIME` details.
  - Normalizer rejects ambiguous times without disambiguation with structured candidate array.

---

### Test Suite 3: API Birth-Profiles Integration & Lifecycle Tests
- **Target Files:**
  - `apps/api/tests/integration/birth-profiles.test.ts`
  - `apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts`
- **Working Directory:** `/home/pilot/Projects/astrosushil/apps/api`
- **Command:** `npx vitest run tests/integration/birth-profiles.test.ts tests/integration/birth-profile-disambiguation-lifecycle.test.ts`
- **Execution Timestamp:** 2026-11-03T05:20:14+05:30
- **Exit Code:** `0`
- **Results:**
  - Files: 2 passed (2)
  - Tests: 21 passed (21)
    - `birth-profiles.test.ts`: 12 passed
    - `birth-profile-disambiguation-lifecycle.test.ts`: 9 passed
  - Duration: 5.80s
- **Lifecycle Sequence Verification:**
  - Sequence A (Unambiguous profile $\to$ retrieve $\to$ chart): $\checkmark$ Pass
  - Sequence B (Ambiguous 'earlier' $\to$ retrieve $\to$ chart): $\checkmark$ Pass
  - Sequence C (Ambiguous 'later' $\to$ retrieve $\to$ chart differs by 1 hr): $\checkmark$ Pass
  - Sequence D (Profile update preserves choice and instant): $\checkmark$ Pass
  - Sequence E (Profile listing with mixed entries): $\checkmark$ Pass
  - Sequence F (Report creation referencing ambiguous profile): $\checkmark$ Pass (Mocked)
  - Sequence G (Legacy ambiguous profile flags `disambiguationRequired`): $\checkmark$ Pass
  - Sequence H (Validation errors for nonexistent/ambiguous time): $\checkmark$ Pass
  - Sequence I (Flutter retry simulation): $\checkmark$ Pass

---

### Test Suite 4: Astrology Engine Complete Test Suite
- **Target Directory:** `packages/astrology-engine`
- **Working Directory:** `/home/pilot/Projects/astrosushil`
- **Command:** `npm run test --workspace=packages/astrology-engine`
- **Execution Timestamp:** 2026-11-03T05:20:26+05:30
- **Exit Code:** `0`
- **Results:**
  - Test Files: 34 passed (34)
  - Tests: 335 passed (335)
  - Duration: 6.10s
- **Verified Subsystems:**
  - Ephemeris, Chart Calculator, Shadbala, Ashtakavarga, Jaimini, KP System, Panchang, Special Points, Sade Sati, Solar Return / Varshaphala, Prashna, Matchmaking, Varga Calculations, Vimshottari & Classical Dashas.
  - Zero regressions across core astrological calculations.

---

### Test Suite 5: Flutter Static Analysis
- **Target Directories:** `lib/features/birth_profile/`, `lib/core/errors/`
- **Working Directory:** `/home/pilot/Projects/astrosushil/apps/mobile`
- **Command:** `flutter analyze lib/features/birth_profile/ lib/core/errors/`
- **Execution Timestamp:** 2026-11-03T05:20:37+05:30
- **Exit Code:** `1` (19 informational warnings found)
- **Breakdown of Issues Found:**
  - `lib/features/birth_profile/screens/create_birth_profile_screen.dart`:
    - Lines 370, 417: `prefer_const_constructors` (performance linter recommendation).
    - Lines 323, 325, 459, 532, 781: `deprecated_member_use` (`withOpacity` deprecated in Flutter 3.32+ in favor of `.withValues()`).
    - Lines 468, 469: `deprecated_member_use` (`groupValue` and `onChanged` on `RadioListTile` deprecated in favor of `RadioGroup`).
  - `lib/features/birth_profile/screens/birth_profile_detail_screen.dart`: 4 deprecation/unnecessary import warnings.
  - `lib/features/birth_profile/screens/birth_profile_list_screen.dart`: 2 deprecation warnings.
  - `lib/features/birth_profile/widgets/location_autocomplete_field.dart`: 4 deprecation warnings.
- **Audit Assessment:**
  There are zero compiler syntax errors or broken imports. However, the Phase 2A.2 report claimed "0 issues found" under `flutter analyze`. In reality, modern Flutter SDKs flag 19 deprecation and const warnings, causing the command to exit with code 1.

---

### Test Suite 6: Report Engine Tests & Pipeline Verification
- **Target Workspace:** `packages/report-engine`
- **Command:** `npm run test --workspace=packages/report-engine`
- **Execution Timestamp:** 2026-11-03T05:20:50+05:30
- **Exit Code:** `1`
- **Output:** `npm error Missing script: "test"`
- **Assessment:**
  `packages/report-engine/package.json` contains only `"build": "tsc"` and `"dev": "tsc -w"`. Report tests reside in `apps/api/tests/integration/reports.test.ts`.
- **Secondary Run (`apps/api/tests/integration/reports.test.ts`):**
  - Command: `npx vitest run tests/integration/reports.test.ts`
  - Execution Timestamp: 2026-11-03T05:20:58+05:30
  - Exit Code: `0`
  - Results: 1 test file, 7 passed, 0 failed.

---

## 3. Discrepancies Between Phase 2A.2 Claims and Phase 2A.3 Findings

| Test Area | Phase 2A.2 Claim | Phase 2A.3 Actual Result | Divergence Severity |
|---|---|---|---|
| **Flutter Static Analysis** | "Result: 0 issues found" | Exit code 1 (19 info/deprecation warnings) | Low (Linter deprecations) |
| **Report Engine Tests** | Claimed report invariance tested | `npm run test` missing in report-engine; reports tests in API | Low (Packaging clarity) |
| **Lifecycle Sequence F** | "Generate a report from an ambiguous profile $\to$ verify original chart inputs preserved" | Mocked `prisma.report.create` row insertion; never executed real chart generation or report worker | **High (Masked Mapper Defect)** |
| **Lifecycle Sequence B/C** | "Calculate chart $\to$ verify identical UTC instant" | Manually passed `utcDateTime` directly to `calculator.calculateChart`, bypassing `astrologyService.calculateChartForProfile` | **High (Masked Mapper Defect)** |
