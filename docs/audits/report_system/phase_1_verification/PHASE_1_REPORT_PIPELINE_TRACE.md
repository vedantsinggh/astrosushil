# Astro Sushil: Phase 1 End-to-End Report Pipeline Technical Trace

**Document Reference:** `docs/audits/report_system/phase_1_verification/PHASE_1_REPORT_PIPELINE_TRACE.md`  
**Classification:** Technical Data Flow & Architectural Pipeline Trace  
**Date of Audit:** November 3, 2026  
**Auditor:** DeepMind Agentic Pair Programmer  
**Scope:** Technical decomposition of all 13 pipeline stages from client request to artifact delivery.  

---

## 1. End-to-End Architecture Overview

The Astro Sushil report pipeline spans multiple workspace layers: Flutter Mobile UI (`apps/mobile`), Fastify REST API (`apps/api`), Redis/BullMQ Queue Workers (`apps/api/src/services/report-worker.service.ts`), Core Calculation Packages (`@astro/astrology-engine`, `@astro/prediction-engine`, `@astro/report-engine`), and Cloudflare R2 / Local Filesystem Storage (`apps/api/src/services/storage.service.ts`).

```
[Mobile / Web Client]
        │
        ▼
[Stage 1: Client Request & Auth] (JWT validation, birth profile ID, report type)
        │
        ▼
[Stage 2: API Entitlement & Duplicate Check] (prisma.report.findFirst, race condition vulnerability)
        │
        ▼
[Stage 3: BullMQ Job Enqueue] (Redis reportQueue: 'career-report-generation')
        │
        ▼
[Stage 4: Birth Details Normalization] (Timezone resolution, DST 1-hour jump defect)
        │
        ▼
[Stage 5: Deterministic Astrology Engine] (Planetary positions, Whole Sign houses, SAV, Dashas)
        │
        ▼
[Stage 6: Prediction & Evidence Extraction] (CareerEvidenceEngine: 10th house, Amatyakaraka)
        │
        ▼
[Stage 7: AI Prompt Assembly] (CAREER_ANALYST_SYSTEM_PROMPT: 41 structured schema fields)
        │
        ▼
[Stage 8: AI Provider Execution] (OpenRouter poolside/laguna-s-2.1:free -> silent mock fallback)
        │
        ▼
[Stage 9: Report Data Mapping] (career-report.mapper: DISCARDS AI output, injects hardcoded arrays)
        │
        ▼
[Stage 10: TeX Source Generation] (report-data-tex.generator creates report_data.tex)
        │
        ▼
[Stage 11: Document Compilation] (XeLaTeX two-pass execution: /tmp/astro-sushil/reports/)
        │
        ▼
[Stage 12: Storage & Persistence] (Cloudflare R2 or volatile /tmp fallback, Prisma status COMPLETED)
        │
        ▼
[Stage 13: Signed URL Delivery] (GET /api/v1/reports/:id/download, 15-min HMAC signed URL)
```

---

## 2. Stage-by-Stage Forensic Breakdown

---

### Stage 1: Client Request & Authentication
- **Components:** `apps/mobile/lib/features/reports/services/reports_service.dart`, `apps/api/src/modules/reports/reports.routes.ts`.
- **Inputs:** Bearer JWT in `Authorization` header, JSON payload `{ "birthProfileId": "uuid", "reportType": "CAREER" }`.
- **Validation:** Fastify JWT plugin checks token validity; extracts `userId` and `role`.
- **Error Handling:** Returns HTTP 401 Unauthorized if token is missing or expired.

---

### Stage 2: Profile Access & Duplicate Resolution
- **Component:** `apps/api/src/modules/reports/reports.service.ts` (`createCareerReportJob`).
- **Inputs:** `birthProfileId`, `userContext`.
- **Transformation:** Queries `prisma.birthProfile.findUnique({ where: { id } })`.
- **Authorization Check:** Verifies `profile.userId === user.id` or `user.role === 'ADMIN'`. Returns HTTP 403 Forbidden on mismatch.
- **Vulnerability Identified:** Non-atomic query `prisma.report.findFirst(...)` checks for active or existing reports. Under concurrent requests (double-tap), both requests pass the check and create duplicate DB records.

---

### Stage 3: BullMQ Queue Dispatch
- **Component:** `apps/api/src/services/report-worker.service.ts` (`careerReportWorker`).
- **Inputs:** `reportId`.
- **Action:** Creates database record with `status: 'QUEUED'` and enqueues job in BullMQ Redis queue `career-report-generation`.
- **Job Options:** `attempts: 3`, `backoff: { type: 'exponential', delay: 5000 }`.

---

### Stage 4: Birth Details Normalization
- **Component:** `packages/astrology-engine/src/validation/birth-details.validator.ts` (`normalizeBirthTime`).
- **Inputs:** `BirthDetails` (year, month, day, hour, minute, second, timezone, latitude, longitude).
- **Transformation:** Computes UTC timestamp and Julian Day Number (UT).
- **Defect Identified:** Evaluates local time against `Intl.DateTimeFormat` using naive UTC date, causing a **+1-hour jump error** during DST morning transitions (shifts Ascendant by $15^\circ$).

---

### Stage 5: Deterministic Astrological Calculations
- **Component:** `packages/astrology-engine/src/chart/chart-calculator.ts`.
- **Calculations Performed:**
  - Sidereal planetary longitudes using linear Lahiri ayanamsha ($23.85 + 0.01396 \times t$).
  - Whole Sign house cusps (House 1 = Ascendant Rashi).
  - Sarvashtakavarga (SAV) bindu scores (337 total points).
  - Shadbala planetary strengths.
  - Vimshottari Dasha timeline tree (Mahadasha, Antardasha).
- **Inconsistency Identified:** Used only by `CareerReportService`. Lightweight generators (`planetary-report.generator.ts`, `kundli-report.generator.ts`, `pro-horoscope.generator.ts`) **bypass this stage** and use hardcoded snapshots or fixed J2000 epoch.

---

### Stage 6: Prediction Evidence Extraction
- **Component:** `packages/prediction-engine/src/evidence/career-evidence.engine.ts`.
- **Inputs:** `NormalizedAstroChart`.
- **Outputs:** `CareerAnalysisInput` containing:
  - `careerAxis`: Ascendant sign/lord, 10th house sign/lord.
  - `planetaryEvidence`: Dignities, houses, retrogrades.
  - `houseEvidence`: Occupants, lords, aspects for houses 1, 2, 6, 7, 10, 11.
  - `timingEvidence`: Active Mahadasha and Antardasha.

---

### Stage 7: AI Prompt Assembly
- **Component:** `packages/prediction-engine/src/prompts/career-analyst.prompt.ts`.
- **Inputs:** `CareerAnalysisInput`.
- **Outputs:** System prompt (`CAREER_ANALYST_SYSTEM_PROMPT`) and formatted User context.
- **Schema Demand:** Mandates JSON response conforming to 41 distinct structured fields (including `topCareerDirections`, `careerDirectionsCaution`, `moneyIncomePattern`, `roadmapThirtyDay`, etc.).

---

### Stage 8: AI Provider Execution & Fallback Trap
- **Component:** `packages/prediction-engine/src/providers/openrouter-career-analysis.provider.ts`.
- **Configured Model:** `poolside/laguna-s-2.1:free` via OpenRouter HTTP API.
- **Failure Handling Trap:**
  ```typescript
  if (allowMockFallback) {
    console.warn('Falling back to deterministic MockCareerAnalysisProvider');
    return new MockCareerAnalysisProvider().analyze(input);
  }
  ```
- **Consequence:** Network timeouts, rate limits, or length errors silently trigger `MockCareerAnalysisProvider`. The worker reports no failure, and mock analysis is generated.

---

### Stage 9: Report Data Mapping & Discarded Data
- **Component:** `packages/report-engine/src/mappers/career-report.mapper.ts`.
- **Inputs:** `NormalizedAstroChart`, `CareerAnalysis` (from AI or Mock).
- **The Disconnect Defect:**
  - The mapper extracts astrological numbers from the chart, BUT **discards the AI's career recommendations**.
  - `analysis.topCareerDirections` is completely ignored.
  - Hardcoded static arrays for `careerDirections`, `cautionCareerDirections`, `moneyIncomeArchitecture`, `professionalRelationships`, and `roadmap` are written directly into `CareerReportData`.

---

### Stage 10: TeX Source File Generation
- **Component:** `packages/report-engine/src/generators/report-data-tex.generator.ts`.
- **Inputs:** `CareerReportData`.
- **Outputs:** `report_data.tex` containing over 1,700 `\newcommand` LaTeX macro definitions.
- **Sanitization:** Escapes LaTeX special characters (`%`, `$`, `&`, `_`, `#`, `^`, `{`, `}`).

---

### Stage 11: Document Compilation via XeLaTeX
- **Component:** `packages/report-engine/src/compilers/latexto-compiler.ts`.
- **Working Directory:** `/tmp/astro-sushil/reports/<reportId>/`.
- **Execution Command:**
  `xelatex -no-shell-escape -interaction=nonstopmode -output-directory=output main.tex`
- **Execution Lifecycle:** Runs two consecutive passes to resolve page numbers and cross-references. Takes 25–45 seconds. Produces 65–85 page `main.pdf`.

---

### Stage 12: Artifact Storage & State Finalization
- **Component:** `apps/api/src/services/storage.service.ts`.
- **Storage Target:** Cloudflare R2 bucket (`astro-sushil-reports`).
- **Fallback Vulnerability:** If R2 environment keys are missing, falls back to `/tmp/astro-sushil/storage/`. Files are deleted on server restart.
- **Database Update:** Updates Prisma `Report` table:
  - `status: 'COMPLETED'`
  - `stage: 'COMPLETED'`
  - `progress: 100`
  - `storageKey: 'reports/<reportId>/report.pdf'`
  - `pageCount: <actual>`
  - `fileSize: <actual>`

---

### Stage 13: Secure Signed URL Delivery & Download
- **Endpoints:**
  - `GET /api/v1/reports/:id/status` (Polls job progress).
  - `GET /api/v1/reports/:id/access-url` (Returns 15-min HMAC signed download URL).
  - `GET /api/v1/reports/:id/download` (Verifies signature and streams PDF buffer to client).
- **Security Assessment:** Strong tenant isolation; users cannot access other users' report downloads.

---

## 3. Discrepancies Across Different Report Types

A major architectural finding is that **calculation logic is not unified across report types**:

| Feature / Metric | `CAREER` (XeLaTeX) | `KUNDLI` (PDFKit) | `PLANETARY_SUMMARY` (PDFKit) | `MARRIAGE_COMPATIBILITY` (PDFKit) |
| :--- | :--- | :--- | :--- | :--- |
| **Calculation Engine** | `@astro/astrology-engine` | `@astro/astrology-engine` | `@astro/astrology-engine` | `@astro/astrology-engine` |
| **Transit Calculations** | Dynamic Transit solver | **Hardcoded 345.0° Saturn** | **Static 8-planet constant array** | None |
| **Birth Epoch** | Actual birth date | Actual birth date | Actual birth date | **Hardcoded J2000 (2451545.0)** |
| **AI Interpretation** | OpenRouter / Mock | None (Rule tables) | None (Rule tables) | None (Rule tables) |
| **PDF Renderer** | XeLaTeX | PDFKit Vector | PDFKit Vector | PDFKit Vector |
| **Page Count** | 65–85 pages | 4 pages | 4 pages | 4 pages |
| **Execution Mode** | Asynchronous (BullMQ) | Synchronous / Instant | Synchronous / Instant | Synchronous / Instant |
