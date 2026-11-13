# Astro Sushil — Phase 0: Read-Only Baseline Report

**Document Version:** 1.0.0  
**Audit Date:** November 5, 2026 (07:25 IST)  
**Auditor:** DeepMind Agentic Coding Engineering Pair  
**Execution Mode:** STRICT READ-ONLY BASELINE AUDIT  
**Repository Working Directory:** `/home/pilot/Projects/astrosushil`  
**Execution Condition:** PRE-IMPLEMENTATION GO-NO-GO REVIEW  

---

## 1. Git State

### 1.1. Exact Command Outputs

#### Command: `git status --short`
```text
(Clean - no output)
```

#### Command: `git branch --show-current`
```text
backend
```

#### Command: `git log -5 --oneline`
```text
fecd3f8 (HEAD -> backend) safe commit
96a0b17 (origin/backend) huge changes
b1a8a20 feat: implement core modules for shop, courses, consultations, and reporting features
e0fd6fa update
63d6489 feat: add end-to-end astrology model parsing tests and fix response JSON deserialization handling
```

#### Command: `git diff --stat`
```text
(Clean - no output)
```

#### Command: `git diff --cached --stat`
```text
(Clean - no output)
```

#### Command: `git ls-files --others --exclude-standard`
```text
(Clean - no output)
```

### 1.2. Existing Work & Working-Tree Analysis
- **Snapshot State:** The working tree is currently clean at `HEAD`. All local work, including Phase 2A/2B hardening, distributed queue remediation (Task 1G), Flutter report commerce checkout tests, audit reports, and reference PDFs, was safely committed into local commit `fecd3f8` (*"safe commit"*), authored by `vedantsinggh <vedantsinggh@gmail.com>` on Thu Nov 5 07:13:45 2026 +0530.
- **Local vs Remote Divergence:** The local `backend` branch is **ahead of `origin/backend` by 1 commit (`fecd3f8`)**.
- **Environment Files Presence (Secrets Strictly Redacted):**
  - `.env` (Project Root): Configured with local DB, Redis, JWT, LLM provider, Razorpay, R2 object storage, Firebase FCM, and WhatsApp verify token keys.
  - `.env.example` (Project Root): Template environment file.
  - `apps/admin/.env.local`: Configured with Next.js public API URL and port.
  - `apps/api/.env`: Backend API environment configuration.
  - `apps/api/.env.example`: Template API environment file.
  *No secret keys, tokens, or passwords have been logged or exposed.*

---

## 2. Existing Uncommitted Work

Because commit `fecd3f8` was created immediately prior to Phase 0, there are currently 0 uncommitted dirty changes in the working tree. However, commit `fecd3f8` contains **215 files (+35,401 / -1,318 lines)** that are local and not yet pushed to `origin/backend`.

### Breakdown of Significant Work Snapshotted in `fecd3f8`:
1. **Distributed Queue & Worker Hardening (`apps/api/src/services/` & `tests/`)**:
   - `redis-queue.service.ts`: Atomic Lua scripts for queue operations, pending/claimed set tracking, and claim release.
   - `report-worker.service.ts`: Atomic CAS claim acquisition, 20s heartbeat lease renewal, and staged pipeline execution.
   - `distributed-lock.service.ts`: Primary Redis locking with fallback to PostgreSQL transaction advisory locks (`pg_advisory_xact_lock`).
   - `phase2b5-task1g-final-reliability.test.ts`: 41 multi-process integration tests verifying distributed queue reliability.
2. **Canonical Timekeeping & DST Boundary Solver (`packages/astrology-engine/`)**:
   - `timezone.solver.ts` & `birth-details.validator.ts`: Disambiguates ambiguous/nonexistent clock times during DST boundaries.
   - `apps/api/prisma/migrations/20261102232635_add_birth_profile_disambiguation_and_utc/`: Database migration storing `utcDateTime`, `timezoneOffsetSeconds`, and `disambiguation`.
3. **Reference PDF Reports Suite (`docs/reference repots/`)**:
   - 13 reference PDFs (total ~250MB) committed as the authoritative commercial specification.
4. **Editorial Compliance & Prohibited Dosha Elimination (`packages/report-engine/`)**:
   - `phase2b2-editorial-compliance.test.ts`: Zero dosha classifications, zero curse language, zero *Kumbha Vivaha* / *Nadi Shanti* rituals.
5. **Report Commerce & Mobile Checkout (`apps/mobile/`)**:
   - Native Razorpay checkout service and widget integration tests (`phase2b5_report_commerce_checkout_test.dart`).

---

## 3. Architecture Inventory

```
+──────────────────────────────────────────────────────────────────────────────────────────+
|                                    ASTRO SUSHIL ARCHITECTURE                             |
|                                                                                          |
|  [ apps/mobile ] (Flutter 3.x Android/iOS)                                               |
|         │                                                                                |
|         ▼  REST / WebSocket APIs                                                         |
|  [ apps/api ] (Node.js Fastify Modular Backend)                                          |
|     ├── Modules: auth, birth-profiles, reports, commerce, astrology, jyoti, admin        |
|     ├── Queue Service: redisQueueService (Lua scripts)                                   |
|     ├── Lock Service: distributedLockService (Redis SET NX + pg_advisory_xact_lock)      |
|     ├── Storage: storageService (AWS S3, Cloudflare R2, Local Disk)                      |
|     └── Notifications: notificationService (FCM, In-App)                                 |
|         │                                                                                |
|         ├──► Redis 7 (In-Memory Queue & Fast Fenced Leases)                              |
|         ├──► PostgreSQL 16 (Relational DB & Transactional State)                         |
|         └──► [ apps/api/src/worker.ts ] (Background Processing Worker)                   |
|                   │                                                                      |
|                   ├──► packages/astrology-engine (VSOP87 / Sidereal Lahiri)              |
|                   ├──► packages/gupta-nadi-engine (BNN Combinations)                     |
|                   ├──► packages/prediction-engine (Evidence Engine & OpenRouter LLM)     |
|                   └──► packages/report-engine (LaTeX Compilation & PDF QA)               |
|                                                                                          |
|  [ apps/admin ] (Next.js 14 React Dashboard - RBAC Enforced via Fastify Backend)         |
+──────────────────────────────────────────────────────────────────────────────────────────+
```

### Exact File Paths & Component Responsibilities:

| Subsystem / Component | Exact File Path | Primary Functions / Responsibilities |
| :--- | :--- | :--- |
| **API Server Entry** | `apps/api/src/server.ts` | Fastify instance initialization, CORS, JWT auth hooks, plugin registration, graceful shutdown. |
| **Report Worker Process** | `apps/api/src/worker.ts` | Standalone process running `startStaleRecoveryLoop()` and continuous `dequeueJob()` loop. |
| **Queue Service** | `apps/api/src/services/redis-queue.service.ts` | `enqueueJob`, `dequeueJob`, `acquireReportClaim`, `renewReportClaim`, `completeJob` (Atomic Lua). |
| **Worker Execution Engine** | `apps/api/src/services/report-worker.service.ts` | `executeReportPipeline`, `acquireWorkerClaim`, `touchHeartbeat`, `failJobIfStale`, `recoverStaleJobs`. |
| **Distributed Lock** | `apps/api/src/services/distributed-lock.service.ts` | `withDistributedLock`: Redis SET NX PX with automatic fallback to PostgreSQL `pg_advisory_xact_lock`. |
| **Commerce & Entitlements** | `apps/api/src/modules/commerce/commerce.service.ts` | `createOrder`, `verifyRazorpayPayment`, `checkEntitlement`, `assertCanGenerateReport`. |
| **Commerce Catalog** | `apps/api/src/modules/commerce/commerce.catalog.ts` | Master pricing table (paise), tax rates (GST), SKU definitions, legacy type mappers. |
| **Report Service** | `apps/api/src/modules/reports/reports.service.ts` | `createReportJob`, `getReportStatusOnly`, `generateReportPdfBuffer` (download strictly from storage). |
| **Storage Service** | `apps/api/src/services/storage.service.ts` | `upload`, `downloadBuffer`, `getSignedUrl` (S3/R2 with ephemeral `/tmp` disabled in production). |
| **Notification Service** | `apps/api/src/modules/notifications/notification.service.ts`| `sendNotification`, FCM push dispatch, in-app notification database logging. |
| **Astrology Calculations** | `packages/astrology-engine/src/` | `calculateChart`, `calculateVargas`, `calculateDashas`, `calculateAshtakavarga`, `evaluateSadeSati`. |
| **Vocational Predictions** | `packages/prediction-engine/src/` | `careerEvidenceEngine`, `OpenRouterCareerAnalysisProvider`, `MockCareerAnalysisProvider`. |
| **Document Compilation** | `packages/report-engine/src/` | `careerReportService`, `latexCompiler` (`xelatex`), `reportPdfService`, `generateKundliReport`. |
| **Shared Types & DTOs** | `packages/shared/src/index.ts` | Common DTOs, Enums, API request/response contracts across apps and packages. |
| **Mobile Client** | `apps/mobile/lib/` | Flutter 3.x UI, Riverpod/Provider state, native Razorpay checkout, PDF viewer. |
| **Admin Portal** | `apps/admin/app/` | Next.js 14 management portal (users, sessions, payments, reports, analytics). |
| **Docker Compose** | `docker-compose.yml` | Multi-container definitions for `postgres:16-alpine`, `redis:7-alpine`, `api`, `admin`, `report-worker`. |

---

## 4. Existing Feature Inventory

| Feature | Audit Status | Implementation Details & Source Files |
| :--- | :--- | :--- |
| **Authentication & User Profiles** | **Implemented & Source-Verified** | JWT tokens with refresh rotation (`Session` table). Phone OTP (Msg91/Twilio) and Google OAuth token verification. Implemented in `apps/api/src/modules/auth/` and verified in tests. |
| **Birth Profile Management** | **Implemented & Source-Verified** | Full CRUD on `BirthProfile` table. Canonical IANA timezone solver with DST boundary resolution. Implemented in `apps/api/src/modules/birth-profiles/` and `packages/astrology-engine/src/validation/timezone.solver.ts`. |
| **Report Catalogue & Pricing** | **Partially Implemented** | Master catalog defined in `commerce.catalog.ts` with 7 report SKUs. **Gap:** The 13 reference PDFs require 13 distinct products; 8 products are missing from catalog. |
| **Checkout & Payment Verification** | **Implemented & Source-Verified** | Razorpay SDK order creation, HMAC-SHA256 signature verification, and webhook fulfillment in `apps/api/src/modules/commerce/` and `apps/mobile/lib/features/reports/services/razorpay_checkout_service.dart`. |
| **Report Generation & Delivery** | **Partially Implemented** | Background worker pipeline operational with atomic Lua scripts. **Gaps:** Non-career generators produce 3-4 page summaries instead of reference depth; 24-hour delivery SLA fields missing from schema. |
| **Report History & Status Updates** | **Implemented & Source-Verified** | `GET /api/v1/reports/my-reports` and `GET /api/v1/reports/:id/status`. Polling and stage updates (`QUEUED` -> `CALCULATING` -> `ANALYZING` -> `RENDERING` -> `COMPILING` -> `UPLOADING` -> `COMPLETED`). |
| **Career Report Pipeline** | **Implemented & Source-Verified** | Complete LaTeX dossier compilation pipeline via `careerReportService` and `latexCompiler` (`xelatex`). Passing automated PDF QA checks. |
| **Jyoti Assistant** | **Implemented & Source-Verified** | AI assistant in `apps/api/src/modules/jyoti/` supporting astrological context chats with OpenRouter provider, fallback models, and daily rate limits. |
| **Sushil Explainer** | **Implemented & Source-Verified** | One-shot explanation engine formatting astrological placements into structured layperson headlines and key points (`apps/api/src/modules/jyoti/prompts/sushil-explainer.prompt.ts`). |
| **Admin Dashboard** | **Implemented & Source-Verified** | Next.js 14 portal feature-complete as of Phase 12. Server-side RBAC preHandlers (`checkPermission`) and audit logging (`adminService.logAction`) strictly enforced. |
| **Notifications** | **Implemented & Source-Verified** | Push notifications via Firebase Cloud Messaging (FCM) and in-app alerts logged to database. Dispatches `REPORT_READY` upon worker completion. |
| **Development Instant Generation**| **Implemented & Source-Verified** | Synchronous execution path preserved in `apps/api/src/modules/reports/reports.service.ts:577` (`executeSynchronousReportPipeline`) when `async=false`. |

---

## 5. Regression Baseline (Test Results with Exact Exit Codes)

### 5.1. Summary Table
| Suite / Command | Exact Command Executed | Exit Code | Passing | Failing | Skipped | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Astrology Engine** | `npm run test --workspace=packages/astrology-engine` | **`0`** | 335 tests (34 files) | 0 | 0 | **PASSED** |
| **Report Engine** | `npx vitest run --dir packages/report-engine` | **`0`** | 55 tests (9 files) | 0 | 0 | **PASSED** |
| **Prediction Engine** | `npx vitest run --dir packages/prediction-engine` | **`0`** | 47 tests (3 files) | 0 | 0 | **PASSED** |
| **Worker Distributed Reliability** | `npx vitest run apps/api/tests/integration/phase2b5-task1g-final-reliability.test.ts` | **`0`** | 41 tests (1 file) | 0 | 0 | **PASSED** |
| **Mobile Commerce Checkout** | `cd apps/mobile && flutter test test/widget/phase2b5_report_commerce_checkout_test.dart` | **`0`** | 8 tests (1 file) | 0 | 0 | **PASSED** |
| **Mobile Unit Tests** | `cd apps/mobile && flutter test test/unit/` | **`0`** | 96 tests (19 files) | 0 | 0 | **PASSED** |
| **Package Builds** | `npm run build:packages` | **`0`** | 5 packages built | 0 | 0 | **PASSED** |
| **Admin Typecheck** | `cd apps/admin && npx tsc --noEmit` | **`0`** | 0 type errors | 0 | 0 | **PASSED** |
| **API Typecheck** | `cd apps/api && npx tsc --noEmit` | **`0`** | 0 type errors | 0 | 0 | **PASSED** |
| **Flutter Analyze** | `cd apps/mobile && flutter analyze` | **`1`** | 0 fatal errors | 192 warnings | 0 | **LINT ONLY** |
| **API Unit Tests** | `npx vitest run apps/api/tests/unit/` | **`1`** | 182 tests (21 files) | 8 tests (3 files) | 1 | **PARTIAL** |
| **Unsupported SKU Integration** | `npx vitest run apps/api/tests/integration/phase2b3-unsupported-sku.test.ts` | **`1`** | 4 tests | 2 tests | 0 | **PARTIAL** |

### 5.2. Detailed Analysis of the 4 Test Harness / Mocking Failures
1. `apps/api/tests/unit/ashtakavarga-api.test.ts` (2 tests failed):
   - Service method `astrologyService.calculateAshtakavarga` directly returns raw calculation result `ashtakavargaCalculator.calculateAshtakavarga(rawChart)`. The test expected `{ birthDetails, ashtakavarga }` wrapper.
2. `apps/api/tests/unit/astrology-intelligence.test.ts` (1 test failed):
   - Test fixture birth details did not trigger any of the existing deterministic CAREER rules in `gupta-nadi-engine`, causing `careerPred` to be undefined.
3. `apps/api/tests/unit/phase2b1-integrity.test.ts` (5 tests failed):
   - Unit test invokes authorization-gated operations using an unseeded test user ID (`usr-unit-test-123`), resulting in `USER_NOT_FOUND` authorization rejections.
4. `apps/api/tests/integration/phase2b3-unsupported-sku.test.ts` (2 tests failed):
   - The test mocked Prisma with an in-memory Map store. In Task 1G, `careerReportWorker.acquireWorkerClaim` and `failJob` were hardened to execute direct atomic SQL CAS updates with `metadata.claimToken`. The in-memory mock did not emulate the CAS metadata query, leaving the report in `QUEUED` instead of `FAILED`.

---

## 6. Database and Migration Baseline

### 6.1. Prisma Schema State & Migrations
- **Prisma Schema:** Located at `apps/api/prisma/schema.prisma`.
- **Migration Status:** Verified via `npx prisma migrate status`:
  - 15 applied migrations found in `apps/api/prisma/migrations/`.
  - Database schema is **completely up to date**; 0 pending migrations; 0 drift detected.

### 6.2. Relevant Models, Statuses & Timestamps

#### `Order` Model (`orders` table):
- **Fields:** `id`, `userId`, `totalAmount`, `taxAmount`, `currency`, `status`, `paymentStatus`, `fulfillmentStatus`, `idempotencyKey`, `metadata`, `createdAt`, `updatedAt`, `dispatchedAt`, `deliveredAt`.
- **Statuses:**
  - `status`: `PENDING`, `PAID`, `FAILED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`.
  - `paymentStatus`: `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`.
  - `fulfillmentStatus`: `UNFULFILLED`, `PROCESSING`, `PARTIALLY_FULFILLED`, `FULFILLED`, `FAILED`, `CANCELLED`.
- **Key Relationships:** `user User`, `items OrderItem[]`, `refunds Refund[]`, `reports Report[]`.
- **Indexes:** `[userId]`, `[status]`, `[createdAt]`.

#### `Report` Model (`reports` table):
- **Fields:** `id`, `userId`, `birthProfileId`, `orderId`, `reportType`, `status`, `s3Url`, `errorMessage`, `createdAt`, `updatedAt`, `stage`, `progress`, `storageKey`, `fileName`, `fileSize`, `pageCount`, `errorCode`, `metadata`, `completedAt`, `failedAt`.
- **Statuses (`ReportStatus`):** `QUEUED`, `CALCULATING`, `ANALYZING`, `RENDERING`, `COMPILING`, `UPLOADING`, `COMPLETED`, `FAILED`, `PENDING`, `PROCESSING`.
- **Key Relationships:** `user User`, `birthProfile BirthProfile`, `order Order?`.
- **Indexes:** `[userId]`.

### 6.3. Payment Confirmation Time & 24-Hour SLA Derivation Analysis
- **Is payment confirmation time stored explicitly? NO.**
  - When payment is confirmed via Razorpay webhook, `Order.status` transitions to `PAID` and `Order.updatedAt` is updated to the current timestamp. The exact payment event timestamp is recorded in `WebhookEvent.processedAt`, but there is **no dedicated `paidAt` column on the `Order` model**.
- **Can a 24-hour delivery deadline be derived reliably? NO.**
  - Relying on `Order.updatedAt` is unreliable because subsequent state changes (e.g. `fulfillmentStatus` transitions to `PROCESSING` or `FAILED`) overwrite `updatedAt`.
  - Relying on `Report.createdAt` is unreliable because a report may be retried, regenerated, or created before payment confirmation.
  - **Critical Architectural Recommendation:** Add an explicit, immutable `expectedDeliveryAt DateTime?` column to `Report` and `paidAt DateTime?` to `Order` in Phase 1.

---

## 7. Known Risks

1. **LaTeX Compilation Resource Contention:**
   - Compiling 100+ page reports (like the 138-page Career Report or 295-page Kundli Report) via `xelatex` consumes significant CPU and takes 15–45 seconds. Running multiple parallel compilations without concurrency limits (`CONCURRENCY = 2`) risks high CPU spikes and worker OOM.
2. **Customer SLA Perception Mismatch:**
   - The Flutter mobile application currently advertises *"Instant Digital PDF Delivery"*. Transitioning to a 24-hour delivery SLA requires immediate UI alignment to manage customer expectations and prevent chargebacks.
3. **Dual-System Split-Brain During Redis Outage:**
   - While Phase 2B.5 Task 1G introduced heartbeat recovery and PostgreSQL fallback CAS, `redisQueueService` relies on an in-process JavaScript array when Redis is disconnected. If multiple worker processes run during a Redis outage, they cannot share queue items across processes without PostgreSQL `SKIP LOCKED`.
4. **OpenRouter Rate Limits & Transient HTTP Failures:**
   - Heavy concurrent report generation relying on external LLM calls risks encountering HTTP 429 rate limits or timeouts. The system must maintain strict exponential backoff and deterministic fallback generators.

---

## 8. Recommended Checkpoint Commit Contents

Commit `fecd3f8` (*"safe commit"*) already contains a comprehensive snapshot of all local changes up to this point. However, when Phase 1 implementation begins, a clean checkpoint commit should encompass:

1. **Baseline Audit Documents:**
   - `PHASE_0_BASELINE_REPORT.md`
   - `ASTRO_SUSHIL_FULL_APPLICATION_AUDIT.md`
   - `ASTRO_SUSHIL_REPORT_CATALOGUE_AUDIT.md`
   - `ASTRO_SUSHIL_WORKER_ARCHITECTURE_AUDIT.md`
   - `ASTRO_SUSHIL_REGRESSION_BASELINE.md`
   - `ASTRO_SUSHIL_COMPLETION_ROADMAP.md`
2. **Commit Message Standard:**
   ```text
   docs(audit): establish phase 0 read-only baseline and production completion specifications
   ```

---

## 9. Files That Must NOT Be Overwritten During Later Phases

To prevent breaking existing working features or violating AGENTS.md rules, the following files must **NEVER** be overwritten or discarded:

1. **`AGENTS.md`**: Monorepo architectural rules, client channel isolation, and prohibited dosha directives.
2. **`apps/api/src/services/redis-queue.service.ts`**: Fenced claim tokens and atomic Lua queue scripts verified in Task 1G.
3. **`apps/api/src/services/report-worker.service.ts`**: Hardened CAS state transitions, heartbeat renewals, and recovery logic.
4. **`packages/astrology-engine/src/validation/timezone.solver.ts`**: Canonical IANA timezone resolution and DST boundary solver.
5. **`apps/api/tests/integration/phase2b5-task1g-final-reliability.test.ts`**: 41 mandatory integration tests certifying distributed queue invariants.
6. **`apps/admin/`**: Admin portal codebase (Feature Frozen per AGENTS.md Section 6).
7. **`docs/reference repots/*.pdf`**: The 13 reference PDFs serving as the source of truth for report depth, structure, and design.

---

## 10. Explicit Confirmation of Read-Only Compliance

The auditor explicitly certifies and confirms that during this Phase 0 audit:
- [x] **No source files were modified.**
- [x] **No dependencies were installed, removed, or updated.**
- [x] **No database migrations were applied or generated.**
- [x] **No production databases were connected to or modified.**
- [x] **No real payments or third-party transactions were executed.**
- [x] **Existing working-tree changes were preserved in full.**

---

**STATUS: PHASE 0 BASELINE AUDIT COMPLETE.**  
*Strictly awaiting human engineering supervisor approval before proceeding with Phase 1.*

