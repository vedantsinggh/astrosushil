# Astro Sushil: Architecture, Product Flow and Privacy Forensics

Scope: read-only audit of `/home/pilot/Projects/astrosushil` at branch `chore/ci-infra-pricing-mobile-updates` (HEAD c969b68). All evidence is from code. Docs were not treated as authoritative. Paths are relative to the repo root.

Severity tags: **[P0]** breaks paid product or is a false legal/privacy claim; **[P1]** a significant defect or risk; **[P2]** hygiene.

---

## 1. Architecture map

### Tooling
- **Package manager:** npm workspaces (`package.json:5-8`, `apps/*`, `packages/*`). `package-lock.json` is present. `workers/` is NOT a workspace.
- **Runtime:** Node 20.19.0 (CI `setup-node`, `apps/api/Dockerfile:1`, `infrastructure/docker/Dockerfile.worker:1`). Flutter 3.41.5 stable (`.github/workflows/ci.yml` mobile job). TypeScript ^5.3.
- **Root scripts** (`package.json:9-31`):
  - `build` = `build:packages` (tsc -b for shared, astrology, gupta-nadi, prediction, report) + api + admin.
  - `test` = api vitest + `test:report` + `test:prediction` + astrology-engine vitest.
  - `dev:worker` / `start:worker` delegate to `apps/api` (`tsx watch src/worker.ts` / `node dist/worker.js`, `apps/api/package.json:8-10`).
- **Vitest:** root `vitest.config.ts` aliases `@astro/*` to package `src` and hardcodes a test DATABASE_URL and JWT_SECRET (`vitest.config.ts:8-12`). API tests run with `--fileParallelism=false` and a junit reporter (`apps/api/package.json:11-13`).
- **CI** (`.github/workflows/ci.yml`) has 6 jobs:
  - `backend`: Postgres 16 + Redis 7 services, `prisma migrate deploy`, full build, TeX Live install, api tests, `LLM_PROVIDER=mock`, `LATEX_COMPILER=local`.
  - `report-regression`
  - `astrology-regression`
  - `prediction-regression`
  - `mobile`: `flutter analyze --no-fatal-infos` + `flutter test`.
  - `frontend-and-containers`: admin lint/build plus docker build of api, worker and admin.
  - Actions are SHA-pinned, except `subosito/flutter-action`, which is pinned by SHA without a version comment.
- **Docker:** `docker-compose.yml` defines postgres, redis, api (:3000), admin (:3001) and report-worker.
  - Every service sets `NODE_ENV: development` (`docker-compose.yml:33,48,61`).
  - **[P1]** There is no shared volume between api and report-worker. In non-production, storage falls back to local disk at `/tmp/astro-sushil/storage` (`apps/api/src/services/storage.service.ts:27`). A PDF written by the worker container is therefore not readable by the api container, so downloads fail under compose unless R2 is configured.
  - The worker defaults to `LATEX_COMPILER=latexto` (`docker-compose.yml:66`). latexto depends on playwright-core / Chromium (`package-lock.json:5545-5555`), but `Dockerfile.worker` installs no Chromium. `node_modules/latexto` is also absent locally.
  - The fallback is the in-house vector PDF writer (`report-worker.service.ts:592-617`).
  - A duplicate compose file exists at `infrastructure/docker/docker-compose.yml`.
- **Worker process:** `apps/api/src/worker.ts:1-43` runs an infinite loop. It calls `postgresQueueService.claimJob('worker-main')`, which uses `UPDATE ... FOR UPDATE SKIP LOCKED` on the `reports` table (`apps/api/src/services/postgres-queue.service.ts:101-135`). On a claim it runs `careerReportWorker.executeReportPipeline`; otherwise it sleeps 3s.
  - A stale-recovery loop runs every 60s (`STALE_JOB_RECOVERY_INTERVAL_MS`).
  - **[P2]** Docs are stale. `workers/README.md` says "RedisQueueService / BullMQ", and `docs/LATEXTO.md` says "BullMQ Queue / Redis". The real queue is a PostgreSQL row queue; Redis is used only for distributed locks and rate limiting.
  - **[P1]** In non-production, `enqueueReportJob` also executes the job in-process inside the API (`report-worker.service.ts:146-160`, "Instant execution ... test/debug mode"). Because compose runs NODE_ENV=development, the API and the worker both execute jobs.

### Apps and packages

| Unit | Purpose / framework | Entry | Key deps | DB access | Consumers |
|---|---|---|---|---|---|
| `apps/api` | Fastify 4 REST API **and** report worker | `src/server.ts` → `src/app.ts`; `src/worker.ts` | prisma 5, @fastify/jwt/helmet/cors/rate-limit/swagger, ioredis, nodemailer, zod, pino (transitive) | Prisma → Postgres (`prisma/schema.prisma`); raw SQL in the queue | mobile, admin, Razorpay/WhatsApp webhooks |
| `apps/admin` | Next.js 14 app router (`app/*`) | `app/layout.tsx` | next/react only | none; calls `NEXT_PUBLIC_API_URL` (`lib/api-client.ts:1`) | staff |
| `apps/mobile` | Flutter, Riverpod, Dio | `lib/main.dart` | flutter_riverpod, dio, flutter_secure_storage, pdf, printing, url_launcher, razorpay_flutter (`pubspec.yaml:10-21`) | none; REST to `https://backend.astrosushil.com/api/v1` (`lib/core/config/app_config.dart:21`) | end users |
| `packages/astrology-engine` | Deterministic ephemeris, charts, dasha, varga, transits, varshaphala | `src/index.ts` | `astronomy-engine` (MIT) | none | api, prediction, report |
| `packages/prediction-engine` | Career evidence engine plus LLM providers (OpenRouter/Gemini/Groq) and chapter pipeline | `src/index.ts` | shared, astrology, gupta-nadi | none (writes a disk cache) | api worker, report-engine |
| `packages/report-engine` | Generators per report type, LaTeX templates, vector PDF writer | `src/index.ts` | latexto ^0.1.0 | none | api (service and worker) |
| `packages/gupta-nadi-engine` | **[P1] Placeholder only.** The whole package is a 5-line stub (`src/index.ts:1-5`). It is not imported by the API. | — | shared | — | none |
| `packages/shared` | Shared types (73 lines) | `src/index.ts` | — | — | all |
| `workers/` | README placeholder only | — | — | — | — |

- **[P2]** `apps/api/package.json` declares only `@astro/astrology-engine` and `@astro/shared`. It imports `@astro/report-engine` and `@astro/prediction-engine` anyway (`report-worker.service.ts:10-36`, `reports.service.ts`), which works only because of workspace hoisting.
- **[P2]** `pino` is used directly (`apps/api/src/utils/logger.ts:1`) but is not declared as a dependency.

---

## 2. Database

- **ORM:** Prisma. Schema is `apps/api/prisma/schema.prisma` (950 lines). There are 24 migrations in `apps/api/prisma/migrations/`. Each new report type was added by its own migration (`20261107231500_add_horoscope_report_type` … `20261111020000_add_fortune_plus_report_type`).
- **Report-relevant tables:**
  - `birth_profiles` (`schema.prisma:74-101`): name, DOB, TOB, lat/long, timezone, place, utcDateTime. Cascade-deleted with the user.
  - `orders` (`:103-147`): razorpayOrderId/PaymentId, amount in paise, status, paymentStatus, fulfillmentStatus, legacy `reportType`, `paidAt`, CAS `version`.
  - `order_items` (`:149-176`): `catalogId`, price snapshot, metadata.
  - `fulfillment_units` (`:856-889`): one row per purchased unit; Report has a 1:1 relation via `fulfillmentUnitId`.
  - `reports` (`:215-257`): status, stage, progress, `storageKey`, `s3Url`, fileName/Size/pageCount, errorCode, metadata (partnerProfileId, referenceDate, targetYear), and queue lease fields (`claimToken`, `claimExpiresAt`, `claimVersion`, `recoveryAttempts`, `executionAttempts`, `retryAfter`). Indexed on `(status, expectedDeliveryAt, createdAt)`.
  - `webhook_events` (`:200-213`) stores the full Razorpay payload JSON. `refunds` and `refund_item_allocations` also exist.
  - Entitlements: `CourseEntitlement` and `DigitalProductEntitlement`. **There is no report entitlement table.** Report access comes from a PAID order plus a fulfillment unit, or from `featureAccessService` with source `SUPPORT_ENTITLEMENT_GRANT` (`reports.service.ts:74-77`).
  - **No cache table exists.** Caching happens in memory or Redis, plus the chapter disk cache described in section 5.
- **`ReportStatus` enum** (`schema.prisma:438-449`): PENDING, PROCESSING, COMPLETED, FAILED, QUEUED, CALCULATING, ANALYZING, RENDERING, COMPILING, UPLOADING.
  - The worker only claims QUEUED, or an expired in-flight state (`postgres-queue.service.ts:124-128`). **PENDING and PROCESSING are never claimed.**
- **`ReportType` enum** (`:419-436`): MARRIAGE_COMPATIBILITY, CAREER_PROSITY, CHILDBIRTH_FAMILY, GUPTA_NADI_DOSSIER, CAREER, KUNDLI, PLANETARY_SUMMARY, HOROSCOPE, FINANCE, LOVE, FORTUNE, SATURN, JUPITER_TRANSIT, RAHU_KETU_TRANSIT, VARSHPHAL, FORTUNE_PLUS.

---

## 3. Report product flow

### Catalogue vs. generator matrix
Sources: `apps/api/src/modules/commerce/commerce.catalog.ts:31-299`, API allowlist `reports.service.ts:743-758`, worker allowlist `report-worker.service.ts:426`, worker dispatch `:836-909`.

| Catalog ID | ReportType | Price | isActive | API allows | Worker allows (`:426`) | Generator exists |
|---|---|---|---|---|---|---|
| report-kundli | KUNDLI | ₹299 | yes | yes | yes | yes |
| report-planetary-summary | PLANETARY_SUMMARY | ₹199 | yes | yes | yes | yes |
| report-career | CAREER | ₹499 | yes | yes | yes | yes (LLM path) |
| report-marriage | MARRIAGE_COMPATIBILITY | ₹499 | yes | yes | yes | yes |
| report-career-pro | CAREER_PROSITY | ₹699 | yes | yes | yes | yes (career PRO tier) |
| report-horoscope | HOROSCOPE | ₹499 | yes | yes | yes | yes (pro-horoscope) |
| report-personalised-horoscope | HOROSCOPE (duplicate SKU) | ₹499 | yes | yes | yes | yes |
| report-finance | FINANCE | ₹499 | yes | yes | yes | yes |
| report-love | LOVE | ₹499 | yes | yes | yes | yes |
| report-fortune | FORTUNE | ₹499 | yes | yes | yes | yes |
| **report-saturn** | **SATURN** | **₹499** | **yes** | yes | **NO** | yes, but unreachable in the worker |
| report-fortune-plus | FORTUNE_PLUS | 0 (pending) | no | yes | NO | yes, unreachable |
| report-jupiter-transit | JUPITER_TRANSIT | 0 | no | yes | NO | yes, unreachable |
| report-rahu-ketu-transit | RAHU_KETU_TRANSIT | 0 | no | yes | NO | yes, unreachable |
| report-varshphal | VARSHPHAL | 0 | no | yes | NO | yes, unreachable |
| **report-childbirth-family** | CHILDBIRTH_FAMILY | **₹499** | **yes** | no | no | **NONE** |
| **report-gupta-nadi** | GUPTA_NADI_DOSSIER | **₹999** | **yes** | no | no | **NONE** (the engine is a stub) |

**[P0] SATURN is sold but cannot be fulfilled by the worker.** It is active at ₹499 and mobile shows it as purchasable (`home/screens/reports_screen.dart:421-427,1256-1265`).
- Mobile always generates with `async: true` (`features/reports/providers/reports_provider.dart:210`).
- With `async: true` the job goes to the worker, whose hardcoded allowlist at `report-worker.service.ts:426` omits SATURN, FORTUNE_PLUS, JUPITER_TRANSIT, RAHU_KETU_TRANSIT and VARSHPHAL. The job fails with `REPORT_TYPE_NOT_SUPPORTED`.
- The dispatch code for those types at `:852-906` is dead code.
- A second, correct list exists in the class at `:59-73` but is not used at `:426`.
- The synchronous API pipeline (`reports.service.ts:1120-1170`) does support them.

**[P0] CHILDBIRTH_FAMILY (₹499) and GUPTA_NADI_DOSSIER (₹999) are active, priced SKUs with no generator.**
- Mobile blocks them only on the client side (`features/reports/screens/report_detail_screen.dart:183-191`).
- The server will create a Razorpay order for them: `createRazorpayOrder` checks only `amount > 0` (`apps/api/src/services/payment.service.ts:54`), and the catalog's `isActive` is true.
- After payment, `createReportJob` rejects them with a 400 (`reports.service.ts:760`).

**[P1] Product mismatch for CAREER_PROSITY.**
- Mobile sells it as "Pro Horoscope & Divisional Charts — Shodashvargas & Shadbala" (`reports_screen.dart:138-150,1135-1144`).
- The backend catalog calls it "Executive Career & Wealth Prosperity Dossier".
- The worker generates the career PRO tier (`report-worker.service.ts:596,843`).

**[P2] Mobile hardcodes every price and title** (`reports_screen.dart:85-454`, `:524-554`), duplicating the server catalog. There is no catalog fetch for reports, so the two will drift.

### End-to-end mobile flow
1. **List my reports:** `GET /reports/my-reports` (`features/reports/services/reports_service.dart:115` → `reports.routes.ts:98` → `reportsService.getUserReports`, `reports.service.ts:663`). The response strips claim fields.
2. **Buy:**
   - `POST /payments/create-order {reportType}` (`reports_service.dart:19`). The server maps it via `commerceCatalog.getItemByLegacyReportType` (`commerce.service.ts:75-79`). HOROSCOPE resolves to the first match, `report-horoscope`.
   - The server calculates the price (`commerce.catalog.ts:968-1036`) and creates a Razorpay order (`payment.service.ts:66`).
   - The client opens `razorpay_flutter`, then calls `POST /payments/verify` (`reports_service.dart:35`), which verifies the HMAC signature (`payment.service.ts:131-170`).
   - There is also a webhook at `POST /webhooks/razorpay` that verifies a raw-body HMAC (`payment.service.ts:173`).
3. **Generate:** `POST /reports {birthProfileId, reportType, partnerProfileId?, orderId?, async:true}` (`reports_service.dart:150-157`) → `reportsService.createReportJob` (`reports.service.ts:740+`).
   - Checks profile ownership (`:846-856`) and partner ownership (`:862-880`).
   - Takes a distributed lock and claims an order fulfillment unit (`validateAndClaimOrder`, `:50-195`).
   - Creates the Report row and enqueues it (`postgres-queue.service.ts:37-62`).
   - CAREER goes through `createCareerReportJob` and `POST /reports/career` (`reports.routes.ts:18`).
4. **Poll:** `GET /reports/:id/status` every 2.5s (`reports_provider.dart:268-288`, `reports.routes.ts:113`). Polling stops on COMPLETED or FAILED.
5. **Download:** `GET /reports/:id/download-file` returns the PDF bytes through the API (`reports_service.dart:85`, `reports.routes.ts:202`, `reports.service.ts:700-736`). That service code reads from storage by `storageKey` and never regenerates.
   - The alternative `GET /reports/:id/access` returns a 15-minute signed URL (`reports.service.ts:579-620`).
6. **Regenerate (user):** `POST /reports/career/:id/regenerate` (`reports_service.dart:68`, `reports.service.ts:437`).
7. **Delete (user):** `DELETE /reports/:id` hard-deletes the DB row and the stored object (`reports.service.ts:625-661`).
   - **[P1]** `isAdminUser` (`:47`, which includes SUPPORT) lets any staff JWT hard-delete any user's report through this consumer route, with no `adminService.logAction` audit entry. This conflicts with AGENTS.md section 6.3 (audit logging) and 6.4 (no hard deletes).
   - Deleting a report may also free its fulfillment unit for reuse (the relation is `fulfillmentUnitId @unique`). Worth verifying.

### Worker pipeline
Stages: CALCULATING 15 → ANALYZING 35 → RENDERING 60 → COMPILING 75/85 (VALIDATING) → UPLOADING 95 → COMPLETED.
- A heartbeat runs every 20s on a 60s lease. Fencing checks happen before upload and before completion (`report-worker.service.ts:440-500,646-700,943-1000`).
- Then it reconciles the fulfillment unit and sends a notification.
- **[P2]** The notification title is "Your Career Report is Ready!" for every type (`notifications/notification.templates.ts:23`).
- **[P2]** pageCount is a hardcoded nested ternary (`report-worker.service.ts:979`), not measured.

### Admin regeneration
`POST /admin/reports/:id/regenerate` is guarded by `checkPermission('reports:regenerate')` (`admin.routes.ts:436-442`) and calls `adminService.regenerateReport` (`admin.service.ts:1730-1790`). **[P1] The flow is broken:**
- It creates an orphan Report row with `status: 'PENDING'` (`:1752-1761`). The worker never claims PENDING, so that row stays PENDING forever.
- It then separately calls `reportsService.createReportJob` with only `{birthProfileId, reportType}`:
  - No `async`, so generation runs synchronously inside the API request.
  - No `forceRegenerate`, so it will likely reuse the existing COMPLETED report.
  - No `partnerProfileId`, so MARRIAGE_COMPATIBILITY regeneration always fails.
  - User context is `{role:'ADMIN'}`, which skips order binding.
- The audit log and the response point at the orphan `newReport.id`, not the real job (`:1774-1789`). The admin UI navigates to it (`apps/admin/app/reports/[id]/page.tsx:117-129`).
- In-memory 10s idempotency (`regenerationCache`) does not work across replicas.

---

## 4. PDF storage and access control
- **Storage:** Cloudflare R2 through hand-rolled SigV4 (`apps/api/src/services/storage.service.ts:38-57,80-140`).
  - Credentials come from `R2_*` or `S3_*`. The bucket defaults to `astro-sushil-reports`.
  - Local disk fallback is `STORAGE_LOCAL_DIR`, default `/tmp/astro-sushil/storage` (`:27`). Production refuses to start storage without R2 (`:30-36`).
  - Key format: `reports/{userId}/{reportId}.pdf` (`report-worker.service.ts:654,949`).
  - File name: `{type}-{birthProfile.name}-{id8}.pdf` (`:950-951`). The person's name ends up in the filename and Content-Disposition.
- **Client isolation:** every read path checks `report.userId !== user.id && !isAdminUser(user)` and returns 404 on mismatch:
  - status `reports.service.ts:479`
  - get `:529`
  - access URL `:592`
  - delete `:638`

  Refunded or cancelled orders hide the report from non-admins (`:483,533,596`). The router applies `fastify.authenticate` to all routes (`reports.routes.ts:8`). Isolation looks correct.
- **Signed URLs:** R2 presigned GET, 900s (`storage.service.ts:147-201`).
  - The local fallback signs an HMAC over `key:expires` with **JWT_SECRET** (`:59-61`), falling back to the literal `'astro-sushil-storage-secret-key-v1'`. **[P2]** This reuses the JWT key.
  - `verifyLocalSignedUrl` always returns false in production (`:214-217`).
  - `/reports/download-secure` sets `onRequest: []` (`reports.routes.ts:178-197`), but the plugin-level `authenticate` hook still runs. A signed link therefore also needs a Bearer token. That is harmless, but it defeats the purpose of a signed link.

---

## 5. External data flows

| Integration | Code | User data sent | Notes |
|---|---|---|---|
| **OpenRouter: career analysis** (CAREER, CAREER_PROSITY) | `packages/prediction-engine/src/providers/openrouter-career-analysis.provider.ts:166-205`; invoked at `report-worker.service.ts:549-571` | Full `CareerAnalysisInput` JSON. Its `chartSummary` holds **clientName, dateOfBirth, timeOfBirth, birthPlace** (`types/evidence.types.ts:13-17`, filled at `services/career-evidence.engine.ts:121`), plus all chart facts. | Default model is `poolside/laguna-s-2.1:free` (`config/openrouter-career.config.ts:18-21`). Free-tier models on OpenRouter may log or train on prompts. |
| **OpenRouter: chapter pipeline** (career LaTeX path) | `prediction-engine/src/services/chapter-pipeline.service.ts:660-745`; called from `report-engine/src/services/career-report.service.ts:86-96` | System and user prompt contain **Name, Birth Date, Birth Time, Place** (`:664,678-682`) and chart facts. Up to 10 chapters per report. | Explicitly selects **free** models (`getHealthyFreeModels`, `:563`; hardcoded `...:free` fallbacks `:575`). **[P1]** This path ignores `LLM_PROVIDER=mock`: it runs whenever an API key is present. **[P1]** Responses are cached unencrypted and never purged in `/tmp/astro-sushil/cache/chapters/{chapter}_{hash}.json` (`:113,531,605`). The hash includes client PII. |
| **OpenRouter: Jyoti chat / explainer** | `apps/api/src/modules/jyoti/providers/openrouter.provider.ts:74-110` (`gemini.provider.ts` is an alias); context built in `jyoti/context/astrology-context.builder.ts:30-60` | **User email** (`:31`), **every saved birth profile's name/DOB/TOB/place/timezone** (`:38-48`), last 3 report statuses, conversation, and client-supplied `userProfileContext` JSON (`jyoti.service.ts:179-200`) | Default model `minimax/minimax-m3:free` (`openrouter.provider.ts:14`); config default `poolside/laguna-s-2.1:free` (`config/index.ts:41`). |
| Gemini / Groq / OpenRouterAi providers | `prediction-engine/src/providers/{gemini-ai,groq-ai,openrouter-ai}.provider.ts` | — | Not used by the API runtime. Only `ResumableCareerGeneratorService` in a script uses them (`report-engine/src/scripts/generate-customer-career-report.ts:502`). **[P1]** `AI_ANONYMIZE_PII` is honoured only here, and its default is inverted: anonymization is ON outside production and OFF in production (`gemini-ai.provider.ts:49`, `groq-ai.provider.ts:58`, `openrouter-ai.provider.ts:56`). |
| Razorpay | `apps/api/src/services/payment.service.ts:66,246` | amount, receipt, `notes` | **[P1]** Any non-production NODE_ENV accepts `mock_sig_*` signatures without an opt-in flag (`:144-147`), even though a comment says "only if explicitly configured". docker-compose sets `NODE_ENV=development`, so any non-prod deployment can mark orders PAID for free. |
| Open-Meteo geocoding | `apps/api/src/modules/locations/locations.service.ts:285` | Birthplace search text | **[P2]** The free API's terms are non-commercial. |
| FCM | `apps/api/src/modules/notifications/fcm.provider.ts:22` | Device token, title/body (report name) | **[P1]** Uses the legacy `fcm/send` server-key API, which Google shut down in 2024. Mobile has no `firebase_messaging` dependency (`apps/mobile/pubspec.yaml`), so push notifications are effectively non-functional. |
| Email (SMTP / nodemailer) | `apps/api/src/services/email.service.ts:13-28` | Email address, report name | **[P2]** `.env.example` uses `SMTP_*` names, but the config reads `EMAIL_HOST/USER/PASSWORD` (`config/index.ts:25-29`). This mismatch silently leaves email in dev-log mode. |
| SMS (OTP) | `apps/api/src/modules/auth/auth.service.ts:79-88` | — | **[P1]** No SMS provider exists. The OTP is stored hashed and logged as "dispatched", but it is never sent anywhere. Phone login only works with the dev master OTP. |
| Google sign-in | `apps/api/src/modules/auth/google-auth.service.ts:39` | id_token to Google tokeninfo | OK |
| WhatsApp (Meta) | `apps/api/src/modules/webhooks/webhooks.routes.ts:444-478` | Inbound only | **[P1]** POST has no `X-Hub-Signature-256` check and **logs the entire body** (phone numbers, message text) at `:451`. The verify token defaults to `astro_verify_token` outside production (`:470`). Mobile only opens `wa.me` deep links (`order_detail_screen.dart:26`, `consult_screen.dart:58`). |
| Upstash Redis REST | `apps/api/src/services/redis-client.ts:19,119` | Lock / rate-limit keys | — |
| Cloudflare R2 | `storage.service.ts` | Report PDFs containing the full name and birth data | — |
| Analytics / crash reporting | none found in mobile or api | — | — |

### Privacy claims vs. reality
1. **[P0] Every PDF built from the LaTeX templates** (`packages/report-engine/templates/disclaimer_philosophy.tex:43-45`) says: "calculated locally ... in compliance with our **zero-data-leakage architecture**. No client details are ever ... transmitted to third-party commercial databases."
   - **This is false for career reports.** Name, DOB, TOB and place are sent to OpenRouter free-tier third-party models (see the table).
2. **[P1] Mobile onboarding** (`apps/mobile/lib/features/onboarding/screens/onboarding_screen.dart:138-139`): "Your details are used strictly for astrological chart generation and **never shared with third parties**." This is false, because of OpenRouter. It also conflicts with the AGENTS.md rule that the LLM is formatting-only.
3. **[P1] Mobile FAQ** (`features/support/models/faq_model.dart:82`): "encrypted in transit and at rest ... strictly used to compute your astrological charts". At-rest encryption is not verifiable in code: Postgres is plain, the chapter cache is plaintext JSON, and local storage is plaintext `/tmp`. The data is also used for LLM prompts.
4. **Legal privacy policy** (`features/legal/screens/legal_documents_screen.dart:221-231`) says birth data is used "exclusively for calculating ... charts" (false) and claims "TLS 1.3" (not enforced in code). The settings dialog (`app_settings_screen.dart:606-614`) says "strictly utilized for deterministic astrological calculations" (false for career and Jyoti).
5. **Policy says logs "never record ... OTPs"** (`legal_documents_screen.dart:236`). That is mostly true, but email addresses and WhatsApp bodies are logged (section 6).
6. `consultPrivacyReassurance` ("shared only with Astro Sushil", `l10n/app_localizations_en.dart:866`) is false if Jyoti is used.
7. `shared-report-foundation.types.ts:195` ("protected under strict privacy protocols") is vague and unverifiable.

### PII / customer data in the repo
- **[P1]** A real-looking default client is hardcoded as a fallback: "Puneet Kumar", 1983-12-28 04:45, Bulandshahr (`report-engine/src/services/career-report.service.ts:78-81`, `chapter-pipeline.service.ts:867`). If a profile field is missing, another person's birth data would be printed into the PDF and sent to the LLM.
- Generated customer PDFs and manifests are tracked at the repo root: `career_report_ananya_iyer.pdf`, `RANDOM_CUSTOMER_LLM_MANIFEST.json`, `synthetic_customer_*.json`, and many `phase2b*_*.pdf`. The third-party reference report PDFs under `docs/reference repots/` and `docs/referencerepots/` (duplicated) are also tracked. The PDF contents were not opened. Someone should confirm whether they hold real customer data.
- `.env` is present locally but not tracked (`git ls-files` confirms). Good.

---

## 7. Logging
- `apps/api/src/utils/logger.ts:7-48` uses pino with `LOG_REDACT_KEYS`, the same list Fastify uses (`app.ts:15-18`).
- **[P1]** The redact paths are plain top-level keys (`password`, `otp`, `token`, ...). In pino / fast-redact these match **only top-level properties**. Nested objects such as `{ body: { password } }` or `{ err: { config: { headers } } }` are not redacted, because no `*.password` wildcards exist.
- `request.log.info({ body })` in the WhatsApp webhook (`webhooks.routes.ts:451`) logs raw inbound PII.
- `logger.info({ email: user.email })` (`notification.service.ts:140`) and `{ toEmail }` (`notifications/email.provider.ts:18,21`) log email addresses.
- `console.log('[LLM CONFIG]')` (`report-worker.service.ts:84`) logs provider and model only.
- The career provider logs only metadata and redacts the API key from error text (`openrouter-career-analysis.provider.ts:209-211`). The chapter pipeline does **not** redact: it throws the raw OpenRouter error text (`chapter-pipeline.service.ts:752`).
- Prompts are not logged directly. Error handlers log `err` objects (`errors/error-handler.ts:18,63,82,133`).
- There are about 50 raw `console.*` calls in api and packages that bypass pino redaction, including `[JYOTI DEBUG]` (`jyoti.service.ts:59-61,107`) and `[REPORT_DELETED] ... by user` (`reports.service.ts:658`).
- The phone number is masked in the OTP log (`auth.service.ts:84-86`). Good.
- The `x-request-id` regex sanitisation is present (`app.ts:24-34`).

---

## 8. Env vars (names only)

**Reports / LLM / PDF:**
- LLM_PROVIDER, AI_PROVIDER, AI_MODEL, AI_ANONYMIZE_PII, ALLOW_MOCK_FALLBACK
- OPENROUTER_API_KEY, OPENROUTER_CAREER_API_KEY, OPENROUTER_MODEL, OPENROUTER_CAREER_MODEL, OPENROUTER_FALLBACK_MODELS, OPENROUTER_SITE_URL, OPENROUTER_SITE_NAME
- OPENROUTER_CAREER_TEMPERATURE, OPENROUTER_CAREER_MAX_TOKENS, OPENROUTER_CAREER_TIMEOUT_MS, OPENROUTER_CAREER_MAX_RETRIES
- GEMINI_API_KEY, GEMINI_MODEL, GOOGLE_API_KEY, GROQ_API_KEY, GROQ_MODEL, GROQ_BASE_URL
- JYOTI_RATE_LIMIT_PER_MINUTE, JYOTI_DAILY_LIMIT
- LATEX_COMPILER, REPORT_PDF_QA_ENABLED
- WORKER_HEARTBEAT_INTERVAL_MS, STALE_JOB_RECOVERY_INTERVAL_MS, AUTO_DELIVER_WHEN_READY, DEBUG
- R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_REGION
- S3_ACCOUNT_ID, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME, S3_REGION
- STORAGE_LOCAL_DIR, STORAGE_SECRET, PUBLIC_API_URL

**Payments / other:**
- RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
- WHATSAPP_VERIFY_TOKEN
- FCM_SERVER_KEY, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
- EMAIL_HOST/PORT/USER/PASSWORD/FROM (`.env.example` has SMTP_* instead)
- DEV_OTP, DEV_MASTER_OTP, ALLOW_DEV_MASTER_OTP
- UPSTASH_REDIS_REST_URL/TOKEN, REDIS_*, MAINTENANCE_MODE

**Undocumented in `.env.example`:** AI_ANONYMIZE_PII, OPENROUTER_CAREER_*, GEMINI_*, GROQ_*, STORAGE_SECRET, STORAGE_LOCAL_DIR, PUBLIC_API_URL, WHATSAPP_VERIFY_TOKEN, FCM_SERVER_KEY, AUTO_DELIVER_WHEN_READY.

---

## Top findings (prioritised)
1. **[P0]** SATURN (₹499, active) always fails in the worker. The allowlist at `report-worker.service.ts:426` is missing 5 types that have generators.
2. **[P0]** CHILDBIRTH_FAMILY (₹499) and GUPTA_NADI_DOSSIER (₹999) are active and server-purchasable with no generator. `gupta-nadi-engine` is a stub.
3. **[P0]** The "zero-data-leakage" and "never shared with third parties" claims are false. Career reports and Jyoti send name, DOB, TOB, place and email to OpenRouter **free** models, and there is no anonymization on the live paths.
4. **[P1]** Admin regenerate creates an orphan PENDING report, runs generation synchronously in the API, may reuse the old report, and cannot regenerate marriage reports.
5. **[P1]** Mock Razorpay signatures are accepted in any non-production env, including the compose default.
6. **[P1]** Delivery channels: there is no SMS sender for OTP, FCM uses a dead legacy API and has no mobile SDK, and the SMTP env names mismatch.
7. **[P1]** Logging: redaction is top-level only, the WhatsApp body is logged, emails are logged, and console.* bypasses redaction.
8. **[P1]** Hardcoded real-looking fallback birth data ("Puneet Kumar"), and a plaintext PII chapter cache in /tmp.
9. **[P1]** Consumer `DELETE /reports/:id` lets staff roles hard-delete without an audit log.
10. **[P1]** Mobile's CAREER_PROSITY copy ("Pro Horoscope") doesn't match the backend product (career PRO dossier). Mobile hardcodes prices.
