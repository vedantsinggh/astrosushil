# Astro Sushil: Phase 1B Implementation Decision Matrix & Risk Assessment

**Document Reference:** `docs/audits/report_system/phase_1b_review/PHASE_1B_IMPLEMENTATION_DECISION_MATRIX.md`  
**Classification:** Architectural Decision Records (ADR) & Risk Evaluation  
**Date of Completion:** November 3, 2026  
**Auditor:** DeepMind Agentic Pair Programmer  
**Phase:** Phase 1B (Audit Evidence Review and Technical Decision Validation)  

---

## 1. Executive Summary

This document formalizes the eight architectural and engineering decisions required before code modifications begin. For each technical domain, we analyze the empirical evidence, operational risks, cross-package dependencies, migration complexity, customer impact, and mandatory release testing criteria.

---

## 2. Comprehensive Implementation Decision Matrix

### Decision 1: Ephemeris Engine Selection
- **Decision:** **RETAIN pure-JS `astronomy-engine` v2.1.19**. Reject migration to Swiss Ephemeris (`libswe`).
- **Supporting Evidence:** `astronomy-engine` is MIT-licensed, zero-dependency, and provides sub-arcminute planetary precision ($< 0.15'$ across all Grahas). Swiss Ephemeris carries viral AGPL licensing and requires native C binary toolchains incompatible with serverless/lightweight deployments.
- **Risks:** Public documentation currently promises "Swiss Ephemeris algorithms."
- **Mitigation & Dependencies:** Update report covers, disclaimers, and mobile UI text to truthfully state that calculations use analytical VSOP87/ELP2000 planetary mechanics.
- **Complexity:** **LOW (Documentation & copy update only)**.
- **Customer Impact:** Zero disruption; existing high precision maintained.
- **Pre-Release Verification:** Validate planetary longitudes against verified reference charts across 10 distinct historical dates.

---

### Decision 2: Lahiri Ayanamsha Correction
- **Decision:** **REPLACE truncated linear formula (`chart-calculator.ts:40–42`) with the official IAU / Indian Astronomical Ephemeris polynomial**.
- **Supporting Evidence:** The current formula has a $25.53''$ systematic deficit at J2000 and omits higher-order precession terms. The official PAC Lahiri polynomial eliminates this baseline offset.
- **Risks:** Extremely low. Sidereal planetary positions shift by $\approx +25.5$ arcseconds ($+0.007^\circ$), achieving sub-arcsecond parity with authoritative ephemeris tables.
- **Dependencies:** `@astro/astrology-engine`.
- **Complexity:** **LOW (1–2 hours)**.
- **Customer Impact:** Eliminates border-case nakshatra/pada rounding discrepancies on cusp transitions.
- **Pre-Release Verification:** Assert that Sun, Moon, and Ascendant positions match official PAC ephemeris fixtures within $< 1''$.

---

### Decision 3: Timezone & Daylight Saving Time Normalization
- **Decision:** **OVERHAUL `normalizeBirthTime` (`birth-details.validator.ts`) using an authoritative IANA timezone library (`luxon`)**.
- **Supporting Evidence:** Passing naive UTC Date objects into `Intl.DateTimeFormat` causes a full 1-hour time error on transition mornings, shifting the Ascendant by **$15.07^\circ$** and dasha balances by up to **5 years**.
- **Risks:** Rejection of historical nonexistent wall-clock inputs might surprise users if error messages are technical.
- **Mitigation & Dependencies:** Return user-friendly validation errors explaining spring-forward clock jumps; provide disambiguation flags for repeated autumn hours.
- **Complexity:** **MEDIUM (1–2 days)**.
- **Customer Impact:** Guarantees 100% chart accuracy for international clients born in DST jurisdictions (US, UK, EU, Australia). Current Indian customer profiles remain unaffected.
- **Pre-Release Verification:** Run the 6 controlled boundary test cases (Standard, Daylight, Spring Jump, Nonexistent Gap, Autumn Ambiguity, No-DST Control).

---

### Decision 4: AI Provider Routing & Structured Fallback Handling
- **Decision:** **REMOVE silent mock fallback in production. IMPLEMENT strict schema streaming, multi-model fallback (e.g. Gemini / Claude), and fail-fast worker retries**.
- **Supporting Evidence:** When OpenRouter free-tier models rate limit or truncate, `openrouter-career-analysis.provider.ts` silently injects hardcoded mock text. BullMQ marks the job as `COMPLETED` without any audit flag in `report.metadata`.
- **Risks:** If all AI providers fail, customer report jobs will fail rather than generating a mock PDF.
- **Mitigation:** Retrying via BullMQ exponential backoff; fallback to an enterprise-grade secondary provider (e.g., Google Gemini Flash / Pro); store `{ provider: 'GEMINI_FALLBACK', model: '...' }` in `report.metadata`.
- **Benchmark Plan Requirement:** Do **NOT** switch default models without running an evaluation benchmark:
  1. Generate 20 test reports across contrasting charts.
  2. Measure schema compliance rate ($> 99\%$).
  3. Measure latency (target: $< 15\text{s}$).
  4. Measure token costs.
- **Complexity:** **MEDIUM (2–3 days)**.
- **Pre-Release Verification:** Induce API failures, 429 rate limits, and JSON corruption; verify that worker retries, logs error telemetry, and never silently falls back to unflagged mock data.

---

### Decision 5: Career Report Mapper Personalisation
- **Decision:** **REFACTOR `career-report.mapper.ts` to dynamically populate career directions, cautions, financial architecture, and roadmaps from `CareerEvidenceEngine` and AI analysis**.
- **Supporting Evidence:** 88.9% of substantive advice fields in the current mapper are physically hardcoded constants. All natives receive identical recommendations regardless of birth chart.
- **Risks:** Variable text lengths from AI generation breaking XeLaTeX page layouts or causing typography overflow.
- **Mitigation:**
  - Enforce strict min/max word counts in Zod schema validation.
  - Apply defensive LaTeX character escaping (`escapeLatexSpecialChars`).
  - Implement dynamic fallback strings that interpolate 10th lord, Amatyakaraka, and D10 dignities if AI fields are absent.
- **Complexity:** **MEDIUM-HIGH (3–4 days)**.
- **Customer Impact:** Transforms the Career Report into a genuinely bespoke, high-value personalized dossier.
- **Pre-Release Verification:** Compile full 65+ page PDFs across the 3 contrasting fixtures; assert that career directions, cautionary sectors, and roadmaps are 100% distinct between them.

---

### Decision 6: Storage Durability & Local Fallback Overhaul
- **Decision:** **REPLACE `/tmp/astro-sushil/storage` with a persistent, non-volatile volume mount for local development, and ENFORCE valid R2/S3 cloud credentials in production**.
- **Supporting Evidence:** 16 report PDF binaries were found in `/tmp`. OS reboots or `systemd-tmpfiles-clean` wipe out `/tmp`, permanently destroying customer files and leaving dangling database pointers.
- **Risks:** Low. Local development storage path simply points to a non-volatile directory (e.g. `apps/api/storage/reports` or a mounted Docker volume).
- **Complexity:** **LOW (1 day)**.
- **Customer Impact:** Eliminates the risk of catastrophic data loss on server restarts.
- **Pre-Release Verification:** Simulate machine reboot / directory wipe; verify that signed download URLs retrieve from persistent cloud/volume storage.

---

### Decision 7: Atomic Report Job Creation (Race Condition Fix)
- **Decision:** **IMPLEMENT distributed lock or partial unique database constraint preventing simultaneous report generation requests**.
- **Supporting Evidence:** `reports.service.ts` uses non-atomic check-then-act (`prisma.report.findFirst` $\rightarrow$ `prisma.report.create`). Rapid double-taps spawn duplicate BullMQ jobs and redundant XeLaTeX compilations.
- **Dependencies:** Redis (`astro_redis` is already running on port 6379).
- **Complexity:** **LOW-MEDIUM (1–2 days)**.
- **Customer Impact:** Prevents duplicate charge attempts and redundant queue processing.
- **Pre-Release Verification:** Execute concurrent double-tap requests with `Promise.all`; assert that only one report record and one BullMQ job are created.

---

### Decision 8: API Route Registration & Integration Test Repair
- **Decision:** **REGISTER all 8 missing Phase 2 route files in Fastify and UNPACK `{ data: ... }` response wrappers in test suites**.
- **Supporting Evidence:** 61 out of 84 failing tests are caused by unmounted Fastify route files returning HTTP 404, while the underlying calculation logic is 100% passing unit tests.
- **Dependencies:** `apps/api/src/routes/astrology.routes.ts`.
- **Complexity:** **LOW (1–2 days)**.
- **Customer Impact:** Unlocks 8 critical API endpoints (`/shadbala`, `/bhava-bala`, `/dashas/ashtottari`, `/gochara`, etc.) for Flutter mobile and web integration.
- **Pre-Release Verification:** Execute `npm run test --workspace=apps/api`; assert that all 55 suites pass with zero failures.
