# Astro Sushil: Phase 1 AI Provider, Data Integrity & Security Audit

**Document Reference:** `docs/audits/report_system/phase_1_verification/PHASE_1_AI_AND_SECURITY_AUDIT.md`  
**Classification:** AI Architecture, Security & Data Protection Forensic Audit  
**Date of Audit:** November 3, 2026  
**Auditor:** DeepMind Agentic Pair Programmer  
**Scope:** Detailed examination of AI routing, prompt engineering, validation schemas, authorization barriers, cryptographic token security, storage immutability, and tenant isolation.  

---

## 1. AI Integration & Provider Architecture Audit

The report generation architecture delegates natural language narrative generation to LLM providers via `packages/prediction-engine`.

### 1. Provider Routing & Centralized Configuration
- **Configuration File:** `packages/prediction-engine/src/config/openrouter-career.config.ts`.
- **Default Model:** `poolside/laguna-s-2.1:free` via OpenRouter.
- **Provider Status:** `GeminiCareerAnalysisProvider` is an unmaintained alias pointing to `OpenRouterCareerAnalysisProvider`.
- **Configuration Assessment:** Centralized via environment variables (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_CAREER_MAX_TOKENS`). However, the default fallback to an unreliable free-tier model on OpenRouter is unsuitable for a production commercial application.

### 2. Prompt Grounding & Astronomical Hallucination Resistance
- **Prompt File:** `packages/prediction-engine/src/prompts/career-analyst.prompt.ts` (`CAREER_ANALYST_SYSTEM_PROMPT`).
- **Grounding Mechanism:**
  - The prompt passes pre-calculated astronomical facts (Ascendant sign, 10th house lord, planetary placements, retrogrades, dignities, dasha periods).
  - Explicit instruction: *"Every interpretive assertion MUST cite the astrological evidence provided in the context."*
- **Resistance Finding:** **SOUND.** The LLM is strictly constrained from calculating charts or inventing planetary placements. The prompt architecture conforms strictly to Directive 1.4 of `AGENTS.md` (*Calculations $\rightarrow$ Deterministic Evidence $\rightarrow$ LLM Formatting*).

### 3. Schema Validation & Field Consumption
- **Validator File:** `packages/prediction-engine/src/validation/career-analysis.validator.ts`.
- **Validation Quality:** Validates JSON syntax, presence of required sections, word count boundaries, and basic evidence ID cross-referencing.
- **Critical Pipeline Defect (Finding 06):** While the validator successfully ensures the LLM returns 41 structured fields, **the report data mapper (`career-report.mapper.ts`) does not consume them**. The mapper uses hardcoded arrays for career directions and roadmaps, rendering the entire AI execution redundant for those sections.

### 4. Failure Handling & Silent Mock Traps
- **Trap Mechanism:**
  ```typescript
  if (allowMockFallback) {
    return new MockCareerAnalysisProvider().analyze(input);
  }
  ```
- **Finding:** **UNACCEPTABLE FOR PRODUCTION.** When OpenRouter rate limits or times out, the system swallows the error and produces mock reports without alerting administrators or re-queuing the job for an enterprise secondary provider.

---

## 2. Authorization, Tenant Isolation & Access Controls

---

### 1. Profile Ownership & Authorization Guards
- **Verification Endpoint:** `POST /api/v1/reports/request` and `POST /api/v1/reports/career/request`.
- **Authentication:** Enforces JWT Bearer token validation via Fastify plugin.
- **Ownership Verification in `reports.service.ts`:**
  ```typescript
  const profile = await prisma.birthProfile.findUnique({
    where: { id: input.birthProfileId },
  });
  if (!profile || (profile.userId !== user.id && !this.isAdminUser(user))) {
    throw new ForbiddenError('You do not have access to this birth profile');
  }
  ```
- **Finding:** **SECURE.** An authenticated user cannot initiate a report for a birth profile owned by another user. Direct database queries confirm strict tenant scoping.

---

### 2. Report Ownership & Download Delivery
- **Download Endpoints:**
  - `GET /api/v1/reports/:id/access-url`
  - `GET /api/v1/reports/:id/download`
- **Verification Logic:**
  ```typescript
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report || (report.userId !== user.id && !this.isAdminUser(user))) {
    throw new NotFoundError('Report not found');
  }
  ```
- **Signed URL Mechanism:**
  - Download access URLs use HMAC-SHA256 signatures with 15-minute expiration windows:
    ```typescript
    const token = crypto.createHmac('sha256', secret).update(`${reportId}:${userId}:${expiresAt}`).digest('hex');
    ```
- **Finding:** **SECURE.** Unauthenticated guests receive HTTP 401; users requesting another native's report receive HTTP 404 (preventing user enumeration). Download URLs expire after 900 seconds.

---

## 3. Storage Security & Infrastructure Integrity

---

### 1. Cloud Object Storage vs. Volatile Local Disk
- **Storage Service:** `apps/api/src/services/storage.service.ts`.
- **Cloud Provider:** Cloudflare R2 / S3-compatible API.
- **Local Fallback:**
  ```typescript
  private readonly localFallbackDir = path.resolve('/tmp/astro-sushil/storage');
  ```
- **Security & Integrity Finding:** **HIGH RISK.**
  - If R2 credentials are unset or invalid in environment configurations, reports are written to `/tmp/astro-sushil/storage/`.
  - In multi-container Docker deployments without shared network mounts, or following a host reboot, `/tmp` is wiped.
  - The database records retain permanent references (`storageKey`), creating dangling pointers and broken downloads for paid customers.
- **Recommended Action:** Storage service must throw a fatal initialization error in `NODE_ENV === 'production'` if cloud object storage credentials are not verified.

---

### 2. Request Idempotency & Concurrency Race Condition
- **Vulnerability File:** `apps/api/src/modules/reports/reports.service.ts` (Lines 57–85).
- **Vulnerability Type:** Check-Then-Act Race Condition (CWE-362).
- **Mechanism:**
  1. Incoming request calls `prisma.report.findFirst(...)` looking for an in-progress job.
  2. If none found, calls `prisma.report.create(...)` and enqueues BullMQ job.
  3. If a mobile user taps "Generate" twice rapidly (or network retry submits parallel requests), both requests execute step 1 before either completes step 2.
  4. Two database records and two XeLaTeX compilation jobs are spawned for the identical report.
- **Finding:** **MEDIUM RISK.** Does not leak data across tenants, but causes redundant CPU exhaustion and duplicate billing states.
- **Recommended Action:** Enforce a Redis distributed lock (`redlock`) scoped to `${userId}:${birthProfileId}:${reportType}` during report creation.

---

### 3. Temporary File Isolation & Child Process Execution
- **Compiler Execution:** `packages/report-engine/src/compilers/latexto-compiler.ts`.
- **Execution Isolation:**
  - Each XeLaTeX compilation executes within an isolated, randomized directory:
    `/tmp/astro-sushil/reports/<reportId>/`
  - Command executes with `-no-shell-escape`, preventing arbitrary shell script injection from malicious macro payloads.
  - Child process is bounded by a 120-second timeout.
- **Finding:** **SECURE.** Shell escapes are blocked, and workspace folders are tenant-isolated by UUID.

---

## 4. Privacy & Anonymization Audit

- In accordance with privacy and security directives, all audit logs and verification scripts operate on synthetic fixtures (`Puneet Kumar`, `Aditi Harish`, `Aarav Sharma`) or anonymized UUIDs.
- Zero customer PII or production credentials have been logged or committed.
