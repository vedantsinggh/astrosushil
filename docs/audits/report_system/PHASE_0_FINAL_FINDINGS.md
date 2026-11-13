# Astro Sushil: Phase 0 Forensic Audit Final Findings & Readiness Report

**Document Reference:** `docs/audits/report_system/PHASE_0_FINAL_FINDINGS.md`  
**Classification:** Comprehensive Audit Synthesis & Readiness Evaluation  
**Date of Completion:** November 3, 2026  
**Auditor:** DeepMind Agentic Pair Programmer  
**Phase:** Phase 0 (Forensic Audit & Baseline Verification)  

---

## 1. Executive Summary & Overview Status

This comprehensive forensic audit was initiated following reports that two separately generated customer reports were identical word-for-word. Under strict non-modification directives, we audited the entire Astro Sushil report generation architecture, deterministic astrology calculation engine, AI interpretation pipelines, database queries, caching, data mappers, XeLaTeX compilation, and security layers.

### Overall Status Scorecard

| Domain | Status | Key Justification |
| :--- | :--- | :--- |
| **1. Astrology Calculation Correctness** | **NON-COMPLIANT** | Critical 1-hour DST jump bug (15° Lagna shift); hardcoded static transits in 2 generators; linear Lahiri ayanamsha approximation; discrepancy between documented "Swiss Ephemeris" claim and actual pure-JS `astronomy-engine` v2.1.19. |
| **2. Personalisation Correctness** | **CRITICAL FAILURE** | Over 70% of the Career Report narrative is physically hardcoded to static constants in `career-report.mapper.ts`. All natives receive identical career directions, caution sectors, roadmaps, and financial advice. |
| **3. AI Interpretation Quality** | **COMPROMISED** | Disconnect between prompt (requesting 41 fields) and report mapper (discarding ~80% of fields); silent fallback to static mock paragraphs when free-tier OpenRouter models timeout or fail. |
| **4. PDF Generation Correctness** | **PARTIALLY COMPLIANT**| XeLaTeX compiler produces visually superior 65–85 page dossiers; however, 4 out of 5 catalog reports use rudimentary 4-page vector PDFs with hardcoded astronomical data. |
| **5. Data Integrity and Security** | **SUBSTANTIALLY SECURE**| Strong profile ownership and download authorization guards; signed URLs expire in 15 mins. Risk identified in local `/tmp` filesystem fallback and request concurrency race conditions. |
| **6. Production Readiness** | **NOT PRODUCTION READY**| System must not be marketed as personalized astrological dossiers until hardcoded mapper arrays, DST time normalization, and transit generators are overhauled. |

---

## 2. Confirmed Defects Register

---

### FINDING-01: Hardcoded Static Narrative & Career Directions in Report Mapper
- **Severity:** **CRITICAL**
- **Affected Component:** `packages/report-engine/src/mappers/career-report.mapper.ts` (Lines 1508–1804)
- **Evidence & File References:**
  - Lines 1650–1693: `careerDirections` array contains 3 hardcoded objects (Rank 1: Technology & Engineering Management, Rank 2: Corporate Strategy, Rank 3: Financial Strategy).
  - Lines 1694–1707: `cautionCareerDirections` hardcoded to "High-Frequency Speculative Trading" and "Pure Administrative Roles".
  - Lines 1708–1742: `moneyIncomeArchitecture`, `professionalRelationships`, `careerSustainability`, and `careerObstacles` are static text blocks.
  - Lines 1765–1798: 30-day, 90-day, 1-year, 3-year roadmaps and decision frameworks are constant strings.
- **Reproduction Steps:**
  1. Generate report data using `careerReportService.generateCareerReportData` for Profile A (1998 Tech Virgo) and Profile B (1985 Creative Leo).
  2. Inspect the resulting `reportData` object.
  3. Notice that `careerDirections`, `cautionCareerDirections`, `roadmapThirtyDay`, etc., are identical word-for-word.
- **Expected Behaviour:**  
  Career directions, cautions, and roadmaps must be dynamically derived from the native's 10th house, Amatyakaraka, D10 Dashamsha, and AI synthesis.
- **Actual Behaviour:**  
  Every native on Earth receives the exact same career directions and strategic roadmaps.
- **Root Cause:**  
  Developer hardcoded placeholder arrays directly into the mapper during initial scaffolding and never connected them to dynamic calculation models or AI output fields.
- **Confidence Level:** **100% (Confirmed by code inspection and empirical test diffs).**
- **Recommended Action:**  
  Refactor `mapNormalizedChartToCareerReportData` to populate `careerDirections`, cautions, and roadmaps dynamically from the deterministic `CareerEvidenceEngine` and `CareerAnalysis` response.

---

### FINDING-02: Silent Fallback to Static Mock Analysis in OpenRouter Provider
- **Severity:** **CRITICAL**
- **Affected Component:** `packages/prediction-engine/src/providers/openrouter-career-analysis.provider.ts` (Lines 117–121)
- **Evidence & File References:**
  ```typescript
  catch (error) {
    logger.warn('OpenRouter provider failed. Falling back to MockCareerAnalysisProvider', {
      error: error instanceof Error ? error.message : String(error),
    });
    return new MockCareerAnalysisProvider().analyze(input);
  }
  ```
- **Reproduction Steps:**
  1. Trigger an OpenRouter call with invalid API key or induced timeout.
  2. Observe that no exception is thrown to the worker.
  3. The report is marked as `COMPLETED` and compiled using `MockCareerAnalysisProvider`.
- **Expected Behaviour:**  
  Transient API failures should trigger exponential backoff retries. Permanent failures should mark the report as `FAILED` and alert operators.
- **Actual Behaviour:**  
  The system silently swallows the error and injects hardcoded mock text into customer reports.
- **Root Cause:**  
  Defensive coding anti-pattern that prioritizes job completion over output correctness.
- **Confidence Level:** **100% (Confirmed by code inspection).**
- **Recommended Action:**  
  Remove the silent mock fallback in production. Fail the BullMQ job with clear retry telemetry or route to an enterprise fallback provider (e.g. Gemini).

---

### FINDING-03: Critical 1-Hour Shift on Daylight Saving Transition Days
- **Severity:** **CRITICAL**
- **Affected Component:** `packages/astrology-engine/src/validation/birth-details.validator.ts` (`normalizeBirthTime`)
- **Evidence & File References:**
  - Evaluates local time against `Intl.DateTimeFormat` using a naive UTC Date constructed from local clock values (`Date.UTC(year, month-1, day, hour, minute, second)`).
  - Empirical verification on Fixture F5 (`2020-03-08 03:30 America/New_York`):
    - Astro Sushil UTC: `2020-03-08T08:30:00Z`
    - True UTC: `2020-03-08T07:30:00Z`
    - Resulting Ascendant Error: **15.0769° (904.6 arcminutes)**.
- **Reproduction Steps:**
  1. Run `normalizeBirthTime` on a birth during the DST transition morning in any jurisdiction with daylight saving.
  2. Compare calculated Julian Day and Ascendant with Swiss Ephemeris (`swetest`).
- **Expected Behaviour:**  
  Local time must resolve to the exact astronomical UTC timestamp according to official IANA timezone transition boundaries.
- **Actual Behaviour:**  
  Evaluates timezone offset before the jump occurs, creating a full 1-hour time error and shifting the Ascendant by 15 degrees.
- **Root Cause:**  
  Circular logic: determining timezone offset by passing naive local time into a UTC timestamp parameter.
- **Confidence Level:** **100% (Mathematically and empirically proven).**
- **Recommended Action:**  
  Implement an iterative solver or use a verified timezone library (e.g. `luxon` or `date-fns-tz`) to reliably resolve local wall-clock times to UTC.

---

### FINDING-04: Hardcoded Static Planetary Transits in Report Generators
- **Severity:** **CRITICAL**
- **Affected Component:** 
  - `packages/report-engine/src/generators/planetary-report.generator.ts` (Lines 138–147)
  - `packages/report-engine/src/generators/kundli-report.generator.ts` (Line 216)
- **Evidence & File References:**
  - `planetary-report.generator.ts`:
    ```typescript
    const ephemerisSnapshot: Record<PlanetSymbol, number> = {
      [PlanetSymbol.SUN]: 204.0,   // Libra 24°
      [PlanetSymbol.MOON]: 82.5,   // Gemini 22.5°
      [PlanetSymbol.MARS]: 71.4,   // Gemini 11.4°
      [PlanetSymbol.SATURN]: 345.2, // Pisces 15.2°
      ...
    };
    ```
  - `kundli-report.generator.ts`:
    ```typescript
    const transitSaturnLong = 345.0; // Pisces
    ```
- **Reproduction Steps:**
  1. Inspect source code of `planetary-report.generator.ts`.
  2. Generate a Planetary Summary Report on two different dates.
  3. Observe that transit positions are physically identical constants.
- **Expected Behaviour:**  
  Transits must be calculated dynamically for the exact date of report generation using the ephemeris adapter.
- **Actual Behaviour:**  
  Transits are fixed constants hardcoded in the codebase.
- **Root Cause:**  
  Developers wrote temporary mock constants during rapid prototyping and never replaced them with ephemeris calls.
- **Confidence Level:** **100% (Confirmed by code inspection).**
- **Recommended Action:**  
  Inject `EphemerisProvider` into report generators and compute real-time transits for the generation timestamp.

---

### FINDING-05: Fixed J2000 Epoch in Horoscope & Compatibility Generators
- **Severity:** **HIGH**
- **Affected Component:** 
  - `packages/report-engine/src/generators/pro-horoscope.generator.ts`
  - `packages/report-engine/src/generators/matchmaking-report.generator.ts`
- **Evidence & File References:**
  - Code hardcodes:
    ```typescript
    julianDayUT: 2451545.0, // J2000 epoch
    utcTimestampMs: Date.now()
    ```
- **Reproduction Steps:**
  1. Inspect `pro-horoscope.generator.ts`.
  2. Observe that planetary positions are computed relative to Julian Day 2451545.0 regardless of the native's birth date.
- **Expected Behaviour:**  
  Calculations must use the native's normalized birth Julian Day.
- **Actual Behaviour:**  
  Calculations evaluate astronomical positions at January 1, 2000.
- **Confidence Level:** **100% (Confirmed by code inspection).**
- **Recommended Action:**  
  Pass `normalizedTime.julianDayUT` from the birth profile into the calculation pipeline.

---

### FINDING-06: Disconnect Between AI Output and Report Data Mapper
- **Severity:** **HIGH**
- **Affected Component:** 
  - `packages/prediction-engine/src/prompts/career-analyst.prompt.ts`
  - `packages/report-engine/src/mappers/career-report.mapper.ts`
- **Evidence & File References:**
  - `CAREER_ANALYST_SYSTEM_PROMPT` requests 41 distinct fields, including `topCareerDirections`, `cautionsInCareer`, `financialAnalysis`, `actionRoadmap`.
  - `career-report.mapper.ts` never accesses `analysis.topCareerDirections` or `analysis.actionRoadmap`, using hardcoded arrays instead.
- **Expected Behaviour:**  
  The data mapper should ingest the 41 fields produced by the LLM and bind them to the LaTeX macros.
- **Actual Behaviour:**  
  The LLM output is largely discarded.
- **Root Cause:**  
  Architectural drift between prompt engineering team and report templating team.
- **Confidence Level:** **100% (Confirmed by cross-file inspection).**
- **Recommended Action:**  
  Update `CareerReportData` and the mapper to directly consume and render all structured AI fields.

---

### FINDING-07: Discrepancy Between Swiss Ephemeris Claims and Pure-JS Implementation
- **Severity:** **HIGH**
- **Affected Component:** `packages/astrology-engine/src/ephemeris/astronomy-engine.adapter.ts`
- **Evidence & File References:**
  - User documentation and report covers state: *"Calculated under Swiss Ephemeris algorithms."*
  - Runtime code uses pure-JS `astronomy-engine` v2.1.19.
- **Expected Behaviour:**  
  Marketing and technical documentation must accurately reflect runtime calculation libraries, or Swiss Ephemeris (`libswe`) should be linked.
- **Actual Behaviour:**  
  The platform claims Swiss Ephemeris backing without executing Swiss Ephemeris code.
- **Confidence Level:** **100% (Verified via `package.json` and dependency tree).**
- **Recommended Action:**  
  Either integrate dynamic linking to `libswe` or update documentation to truthfully state that calculations use Don Cross's `astronomy-engine`.

---

### FINDING-08: Truncated Linear Approximation of Lahiri Ayanamsha
- **Severity:** **MEDIUM**
- **Affected Component:** `packages/astrology-engine/src/chart/chart-calculator.ts` (Lines 40–42)
- **Evidence & File References:**
  ```typescript
  ayanamsaOffset = 23.85 + 0.01396 * yearsFromJ2000;
  ```
  - True Lahiri at J2000 is `23.85709°` ($23^\circ 51' 25.53''$).
  - Introduces a systematic baseline offset of 25.5 arcseconds, plus omitting nutation ($\pm 17.2''$).
- **Expected Behaviour:**  
  Precise IAU precession and nutation expansion for Chitra Paksha Lahiri Ayanamsha.
- **Actual Behaviour:**  
  Crude linear truncation with up to 35 arcseconds of error.
- **Confidence Level:** **100% (Mathematically validated against Swiss Ephemeris).**
- **Recommended Action:**  
  Implement the standard IAU 1980 / 2000 nutation and precession polynomial for true Chitra Paksha Lahiri.

---

### FINDING-09: Insecure Local `/tmp` Filesystem Storage Fallback
- **Severity:** **HIGH**
- **Affected Component:** `apps/api/src/services/storage.service.ts` (Lines 35–52)
- **Evidence & File References:**
  - Falls back to `/tmp/astro-sushil/storage/reports` when R2 credentials are missing.
  - Linux `systemd-tmpfiles-clean` or server reboots erase this directory, permanently losing customer PDF files while database records become dangling pointers.
- **Expected Behaviour:**  
  Persistent local storage should point to a dedicated volume mount outside of volatile `/tmp`, or cloud storage should be mandatory.
- **Confidence Level:** **100% (Confirmed by code inspection).**
- **Recommended Action:**  
  Enforce mandatory cloud object storage in production and use a non-volatile directory for development.

---

### FINDING-10: Concurrency Race Condition in Report Generation Requests
- **Severity:** **MEDIUM**
- **Affected Component:** `apps/api/src/modules/reports/reports.service.ts` (Lines 85–115)
- **Evidence & File References:**
  - Non-atomic check-then-act query: queries `prisma.report.findFirst`, then enqueues BullMQ job.
  - Rapid double-tap requests cause duplicate jobs and redundant compilations.
- **Expected Behaviour:**  
  Distributed Redis lock or database unique constraint preventing simultaneous job submissions for the same profile and report type.
- **Confidence Level:** **100% (Confirmed by code analysis).**
- **Recommended Action:**  
  Implement a Redis distributed lock (`redlock`) or database constraint during report request dispatch.

---

### FINDING-11: Broken Integration Tests in `apps/api`
- **Severity:** **HIGH**
- **Affected Component:** `apps/api/tests/integration/`
- **Evidence & File References:**
  - Running vitest on `apps/api` revealed 12 failing test files and 84 failing tests:
    - `shadbala-bhava-bala.test.ts` (Fails with HTTP 404 - routes unmounted).
    - `yoga.test.ts` (Fails due to undefined response structure).
    - `ashtakavarga-api.test.ts` (Fails serialization assertions).
    - `e2e-worker-pipeline.test.ts` (Times out after 180s).
- **Expected Behaviour:**  
  All test suites in the monorepo should pass or be kept in sync with active route schemas.
- **Actual Behaviour:**  
  Significant test rot in API integration suites.
- **Confidence Level:** **100% (Direct vitest execution output).**
- **Recommended Action:**  
  Fix route mounting and synchronize API test fixtures with current endpoint contracts.

---

### FINDING-12: Commercial Catalogue & Depth Deficit (13 SKUs vs 1 Real Generator)
- **Severity:** **HIGH**
- **Affected Component:** `apps/api`, `packages/report-engine`
- **Evidence & File References:**
  - Benchmarked against all 13 Astro Arun Pandit reference PDFs.
  - Astro Sushil only has 1 dossier generator (`CAREER`).
  - 3 SKUs (`Kundli`, `Planetary`, `Matchmaking`) exist only as 4-page vector summaries.
  - 8 SKUs do not exist at all (`Varshphal`, `Jupiter Transit`, `Rahu Ketu`, `Saturn in Chart`, `Finance`, `Love`, `Baby Name`, `Fortune`).
- **Confidence Level:** **100% (Confirmed by filesystem inventory and comparison).**
- **Recommended Action:**  
  Develop phased roadmap to implement missing generators.

---

## 3. Suspected Defects & Unverified Assumptions

1. **Suspected Memory Leak in XeLaTeX Child Processes:**
   - Spawning `xelatex` subprocesses repeatedly in worker containers without CPU/RAM limits may cause Out-Of-Memory (OOM) kills under high concurrency.
   - *Status:* Suspected; requires load testing under multi-tenant concurrent traffic.
2. **Suspected Mobile UI Handling of Long PDF Downloads:**
   - Reports exceeding 80 pages (1.5 MB) may encounter timeout or rendering lag in Flutter mobile PDF viewer widgets on low-end Android devices.
   - *Status:* Unverified; requires physical device testing.

---

## 4. Phase 0 Audit Conclusion & Next Steps

This forensic audit has definitively resolved the mystery of identical reports:
1. **Identical inputs** were submitted in multiple test birth profiles (`1998-08-15 08:30:00`).
2. **Hardcoded static arrays** in `career-report.mapper.ts` cause every user to receive identical career directions, caution sectors, roadmaps, and advice.
3. **Silent fallbacks** in `openrouter-career-analysis.provider.ts` inject static mock text whenever free-tier OpenRouter models fail.
4. **Astronomical calculation errors**, specifically the 1-hour DST bug and hardcoded transits, undermine the deterministic core.

In accordance with Phase 0 directives, **no source code has been altered during this audit**.

We recommend human leadership review these findings to prioritize Phase 1 implementation planning, focusing immediately on:
1. Fixing the 1-hour DST bug in `normalizeBirthTime`.
2. Eliminating hardcoded static arrays in `career-report.mapper.ts`.
3. Upgrading AI provider routing to eliminate the silent mock fallback.
4. Replacing hardcoded transits in lightweight generators with real-time ephemeris calculations.
