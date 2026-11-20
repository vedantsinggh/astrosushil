# Forensic audit: the existing report-generation pipeline (Astro Sushil)

Repo: /home/pilot/Projects/astrosushil, branch chore/ci-infra-pricing-mobile-updates, HEAD c969b68. Read-only audit. All line numbers refer to HEAD.

Abbreviations:
- `W` = apps/api/src/services/report-worker.service.ts
- `RS` = apps/api/src/modules/reports/reports.service.ts
- `CAT` = apps/api/src/modules/commerce/commerce.catalog.ts
- `CPS` = packages/prediction-engine/src/services/chapter-pipeline.service.ts
- `RE` = packages/report-engine/src

---

## 0. Executive summary (the facts that matter)

1. **Paid CAREER reports in production use another person's prose.** The worker compiles `RE/../templates/main.tex`, which `\input`s `templates/parts/part01..part10.tex` (main.tex:647-656). `parts/part02`–`part10` use **0** of the 1,578 data macros. They are static prose written for the reference native "Puneet Kumar" (Scorpio Lagna, Mars in Virgo in the 11th, and so on; for example parts/part02_lagna.tex:12-20). Every customer would get this Scorpio-Lagna text. Only main.tex (97 macros) and part01 (6 macros) are personalised.
2. **The production LLM output is computed, paid for, and then thrown away.** `careerReportService` runs the OpenRouter `CareerAnalysis` call plus 10 LLM chapters and renders them as macros (`ExecutiveCareerSummary`, `CareerIdentity`, `Chapter*Lead`, and others; report-data-tex.generator.ts:594-603, :767-803). **None of these macros is referenced** by main.tex or by any part file (grep count = 0). They are also tagged `VERIFIED` even though an LLM wrote them.
3. **The LLM chapter prompts are seeded with the reference client's chart facts.** `CPS.buildEvidencePacket` (:166 onward) uses fallbacks and literals such as `ascSign || 'Scorpio'`, `'Mars in House 11 (Virgo at 28.86°)'`, and `d10Ascendant: 'Libra at 01° 04''`. For ch07 it uses fully literal "Mars in Virgo in 11th / Saturn 3rd aspect on Sun in 2nd / Ketu in 1st" (≈ :393-399). ch02, ch03, ch05 and ch06 also carry Scorpio/Virgo/Leo/Sagittarius house-sign literals. This is cross-client contamination at the prompt level, and it breaks AGENTS.md §1.3 and §1.4.
4. **Saturn is sold (₹499, `isActive: true`, CAT:190) but always fails asynchronously.** The worker's local allow-list `W:424` (`['CAREER','KUNDLI','PLANETARY_SUMMARY','CAREER_PROSITY','MARRIAGE_COMPATIBILITY','HOROSCOPE','FINANCE','LOVE','FORTUNE']`) fails SATURN, FORTUNE_PLUS, JUPITER_TRANSIT, RAHU_KETU_TRANSIT and VARSHPHAL with `REPORT_TYPE_NOT_SUPPORTED`. The dispatch branches at W:851-905 are therefore dead code. Mobile always sends `async: true` (apps/mobile/lib/features/reports/providers/reports_provider.dart:210), so these reports always take the worker path. The class constant `SUPPORTED_REPORT_TYPES` (W:59-74) and `RS:743-758` both list all 14 types. Only the synchronous API path (RS:~1136-1170) can produce them.
5. **Two more products are sold with no generator at all.** `report-childbirth-family` (CAT:270, ₹499) and `report-gupta-nadi` (CAT:286, ₹999) are both `isActive: true`. `RS.createReportJob` rejects them (RS:760-765). A customer can pay but can never be fulfilled.
6. **The root manifests show that an offline script ran. They do not show that the product works.** `RANDOM_CUSTOMER_LLM_MANIFEST.json` is **byte-identical** to `ANANYA_IYER_72_TOPICS_MANIFEST.json` (`cmp`). The script deliberately mirrors it (generate-customer-career-report.ts:852-853), so the name "random customer" is false. `isRealLlm: true` and `fallbackTopics: 0` are **hard-coded literals** (same file :569, :595). All 72 topics have `cacheStatus: CACHED` and `latencyMs: 0`, and all share one timestamp, so the manifest is a replay of a disk cache. The underlying responseIds look like genuine Gemini IDs (none match the fabricated `gemini-N-<ts>` pattern from resumable-career-generator.service.ts:403), and the cache exists at `/tmp/astro-sushil/cache/ananya_iyer/topic_01..72.json` (ephemeral /tmp). The 82-page Ananya PDF came from `RE/scripts/generate-customer-career-report.ts` using `templates/parts_ananya/`. **That Gemini 72-topic path is not wired into the API or worker.**
7. **Tests: 129/130 pass.** The one failure, `phase2a-pdf-verification`, is flaky. It passed when re-run in isolation.

---

## 1. Report types: entry points, data flow, reference mapping, and content source

### Common request path
- `POST /api/v1/reports` or `/reports/generate` (reports.routes.ts:61-72) → `RS.createReportJob` (RS:739).
- An in-process promise map (`inflightJobLocks`) plus a distributed lock wrap `initializeReportJob` (RS:829 onward). That function checks profile ownership (RS:845-848), checks partner ownership (RS:863-865), runs `validateAndClaimOrder` (CAS claim on the order/fulfilment unit), and then deduplicates: it reuses an active job (RS:~880-925) or reuses a COMPLETED job when `reportVersion`, `calculationVersion` and `profile.updatedAt` are unchanged (RS:928-950). It then creates the Report row with status QUEUED.
- With `async: true` (mobile always sends it): `careerReportWorker.enqueueReportJob` → Postgres queue (`postgres-queue.service.ts` claims with `FOR UPDATE SKIP LOCKED`, :95-132). The worker process (`apps/api/src/worker.ts`) polls every 3 s.
- In non-production, `enqueueReportJob` also executes the job inline in the API process (W:146-167).
- Without `async`: the synchronous pipeline runs inside the API request (`RS.executeSynchronousReportPipeline`, RS:~1077).
- CAREER takes a special path: `createCareerReportJob` (RS:200), and also `POST /reports/career` (reports.routes.ts:17-43).
- Storage: `reports/{userId}/{reportId}.pdf` goes to object storage (W:654-668, W:949-965). `postgresQueueService.completeJob` (fenced by claimToken and claimVersion) runs, then `fulfillmentService.reconcileFulfillmentUnit`, then a notification with idempotency key `report_ready:{id}`.
- Download: `RS.getReportPdf` streams the buffer from storage (RS:~700-735).

### Table: catalogue vs generators

The "Content" column uses these keys:
- **D-tmpl**: deterministic string templates interpolated with chart values (`DeterministicInterpretationProvider`, RE/providers/deterministic-interpretation.provider.ts, 86 lines, plus the generator's own templates).
- **Static**: fixed text copied from the reference report.

Page counts come from generated sample PDFs in the repo root (measured with pdfinfo) or from the worker's hard-coded `pageCount` (W:979). The **Reference** column gives page counts measured with pdfinfo from docs/referencerepots/*.pdf.

| Catalog id (price, active) | ReportType | Generator | Async worker? | PDF tech | Content | Pages produced vs Reference | Est. completeness |
|---|---|---|---|---|---|---|---|
| report-kundli (₹299, on) | KUNDLI | kundli-report.generator.ts (1276 lines) | yes | native PdfWriter | D-tmpl | 18 (phase2b3_kundli_test.pdf) vs **295** (Premium Personalised Kundli) | ~10% |
| report-planetary-summary (₹199, on) | PLANETARY_SUMMARY | planetary-report.generator.ts | yes | native | D-tmpl | 3 hard-coded (sample 2 pp) vs no reference | n/a |
| report-career (₹499, on) | CAREER | career-report.service.ts + LaTeX; fallback career-report.generator.ts | yes | XeLaTeX (fallback: native) | LLM computed but discarded; **static Puneet prose**; data tables are deterministic | ~68 (phase2b4) vs **138** (Career Report) | data ~40%; narrative **0% personalised** |
| report-career-pro (₹699, on) | CAREER_PROSITY | same as CAREER | yes | same | same | same | same |
| report-marriage (₹499, on) | MARRIAGE_COMPATIBILITY | matchmaking-report.generator.ts (556 lines) | yes | native | D-tmpl | 11 hard-coded vs **96** (Couple Kundli Matching) | ~10-15% |
| report-horoscope / report-personalised-horoscope (₹499, on; two catalogue ids for one type) | HOROSCOPE | pro-horoscope.generator.ts (1821 lines) | yes | native | D-tmpl | 11 (test-horoscope-2026.pdf) vs **70** | ~15% |
| report-finance (₹499, on) | FINANCE | finance-report.generator.ts | yes | native | D-tmpl | 12 hard-coded vs **32** | ~35% |
| report-love (₹499, on) | LOVE | love-report.generator.ts | yes | native | D-tmpl plus lookup tables | 23 hard-coded vs **23** | structure ~70%, prose depth unknown |
| report-fortune (₹499, on) | FORTUNE | fortune-report.generator.ts | yes | native | D-tmpl (numerology) | 27 hard-coded vs **112** | ~25% |
| report-fortune-plus (₹0, **off**) | FORTUNE_PLUS | fortune-plus-report.generator.ts + fortune-plus-report-pdf.builder.ts | **NO** (W:424) | native | D-tmpl | 35 (canonical_fortune_plus_report.pdf) vs **139** | ~25% |
| report-saturn (**₹499, on**) | SATURN | saturn-report.generator.ts | **NO, always FAILS** | native | D-tmpl | 10 hard-coded vs **87** | ~10%, and unreachable |
| report-jupiter-transit (₹0, off) | JUPITER_TRANSIT | jupiter-report.generator.ts | NO | native | D-tmpl | 11 vs **79** | ~14% |
| report-rahu-ketu-transit (₹0, off) | RAHU_KETU_TRANSIT | rahu-ketu-report.generator.ts | NO | native | D-tmpl | 12 vs **90** | ~13% |
| report-varshphal (₹0, off) | VARSHPHAL | varshphal-report.generator.ts + varshphal-report-pdf.builder.ts | NO | native | **Static**: 12-month predictions copied verbatim from the reference dossier for every client (varshphal-reference-months.ts:1-3 and :18 onward; used at varshphal-report.generator.ts:480). Includes extraction garbage ("s Your partner…", "life Your household…") and fixed "01 January 2026" dates | 16 vs **97** | ~15%, and the content is not personalised |
| report-childbirth-family (**₹499, on**) | CHILDBIRTH_FAMILY | **none** | rejected at API | — | — | — vs (no reference) | 0% (sold anyway) |
| report-gupta-nadi (**₹999, on**) | GUPTA_NADI_DOSSIER | **none** | rejected at API | — | — | — | 0% (sold anyway) |
| (no catalogue entry) | — | none | — | — | — | Baby Name Report reference (15 pp) | 0% |

Other catalogue and generator defects:
- Catalogue descriptions hard-code the reference native's chart: "Swati Nakshatra" (Saturn, CAT:194), "Mula Nakshatra" (Jupiter), "Rohini/Jyeshtha" (Rahu-Ketu).
- Generators default to the reference person when data is missing: varshphal-report.generator.ts:75 (`bYear=1983, bMonth=12, bDay=28`), and fortune-plus-report.generator.ts:107, :233-242 and :289 (`profile.name || 'Puneet Kumar'`).
- `career-report.service.ts:79-82` defaults the client name, DOB and place to Puneet Kumar's.
- `CPS.generateCanonicalChapter` also defaults to Puneet Kumar (`clientName || 'Puneet Kumar'`).
- `pageCount` is a hard-coded nested ternary, not measured (W:979; RS:~1270; career fallback W:609 uses 13 or 7). For example, Kundli is recorded as 3 pages but actually renders 18.

### CAREER worker flow in detail (W:504-740)
1. `calculateNormalizedChart` → completeness checks (W:506-525) → `setStage ANALYZING`.
2. Provider selection (W:530-556). In production it fails if the provider is `mock` or there is no OpenRouter key. In development it falls back to `MockCareerAnalysisProvider` when there is no key. `LLM_PROVIDER=groq` (the current `.env`) is **ignored**: the career path is OpenRouter-only.
3. `careerReportService.generateCareerReportData` (RE/services/career-report.service.ts:47-120):
   - evidence engine
   - `provider.analyze`, an OpenRouter call (unused downstream)
   - `VocationalSynthesisEngine`
   - `chapterPipelineService.generateAllChapters`: 10 LLM calls (unused downstream)
   - mapper → `generateReportDataTex`
4. `latexCompiler.compileReport` (local XeLaTeX by default; RE/pdf/latex-compiler.factory.ts).
5. **On any LaTeX failure, the worker silently falls back** to the native deterministic career generator (W:593-621). The LLM work is discarded, the page count is faked (13 or 7), and the DB/customer record does not mark that a fallback happened (only a warn-level log).
6. QA (`validateReportPdf`, W:1398-1437) checks the PDF header, `%%EOF`, and placeholder strings in the **TeX data string**, not in the PDF. After a fallback, it validates text from a PDF that was not shipped. In `.env`, QA is disabled by `REPORT_PDF_QA_ENABLED=false`.
7. Upload, fenced completion, reconcile, notify.

---

## 2. PDF technology
- **Two renderers.**
  - **(a) Native hand-written PDF 1.4 writer** (RE/pdf/pdf-writer.ts, 261 lines, plus RE/pdf/report-pdf.service.ts, 8,073 lines) for every non-career type. It uses only the Type1 base fonts **Helvetica and Helvetica-Bold with WinAnsiEncoding** (pdf-writer.ts:198-205). `sanitizeText` strips every character outside `\x20-\x7E\xA0-\xFF` (pdf-writer.ts:94-100). As a result there is **no Devanagari, no Unicode, no images and no logo** in these PDFs. Sanskrit slokas cannot appear.
  - **(b) XeLaTeX** (RE/pdf/xelatex-compiler.ts) for CAREER and CAREER_PROSITY. It runs `execFile xelatex -no-shell-escape -interaction=nonstopmode` in `/tmp/astro-sushil/reports/{reportId}` (:28-83). Note that the `reportId` is used in the filesystem path; it is a UUID from the DB in production. It checks fonts with fc-list (:147-151).
- **LaTeX fonts** (templates/main.tex:5-24):
  - Main text: TeX Gyre Pagella.
  - Display: Libre Bodoni, falling back to Pagella.
  - Devanagari: **Noto Serif Devanagari**, falling back to FreeSerif, then Pagella, through `\setTransitionsForDevanagari`.
  - No fonts are vendored in the repo. They depend on the host's TeX Live or fontconfig.
- **Brand assets** in packages/report-engine/templates/assets/: `astrosushil_logo.png`, `astrosushil_logo_gold.png` (used on the cover, main.tex:377), `celestial_cover.png` (main.tex:369), `celestial_cover.jpg`, `logo.webp`, `about_sushil.png` and `about_sushil.webp` (the author image). Author and disclaimer pages: templates/author_note.tex, templates/disclaimer_philosophy.tex.
- **Alternatives:** `latexto-compiler.ts` is an alternative (env `LATEX_COMPILER=latexto`; the network compile service is described in docs/LATEXTO.md). `pressa-compiler.ts` exists but **nothing references it** (no factory branch).
- **Stray build artefacts are committed** in templates/: main.log (230 KB), prototype_main.log, and a Puneet-specific `report_data.tex` (186 KB, `\ClientName{Puneet Kumar}`).

---

## 3. LLM integration

Everything lives in packages/prediction-engine. The report-engine has no LLM code beyond the scripts.

| Path | Provider / model | Used in production? |
|---|---|---|
| `OpenRouterCareerAnalysisProvider` (providers/openrouter-career-analysis.provider.ts) | OpenRouter; default model `poolside/laguna-s-2.1:free` (config/openrouter-career.config.ts:18-21); `.env.example` uses `minimax/minimax-m3:free`; `.env` uses `baidu/ernie-5.5-flash-preview:free` | yes (CAREER worker) |
| `chapterPipelineService` (CPS) | OpenRouter **free models discovered at runtime** (`openRouterModelRegistry.getHealthyFreeModels`), with hard fallbacks `baidu/ernie…:free`, `particle-ai/particle-1:free`, `openrouter/free` (CPS:576) | yes (CAREER worker) |
| `GroqAIProvider`, `GeminiAIProvider`, `ai-provider.factory.ts`, `careerEditorialLlmService`, `ResumableCareerGeneratorService` (Gemini, `gemini-3-flash-preview`) | Groq `openai/gpt-oss-120b`; Gemini | **scripts only** (RE/scripts/*, scripts/generate-career-report-batched.ts) |

- **Structured output:**
  - OpenRouter analysis uses `response_format: json_object` plus `careerAnalysisValidator` and correction-prompt retries (openrouter-career-analysis.provider.ts:46-99, :180-196).
  - Chapters use **no** response_format. They ask for JSON in the prompt, strip code fences, and run a shape validator (CPS:659-790).
  - Gemini uses `responseMimeType: application/json` (gemini-ai.provider.ts:116).
  - There is no JSON-schema-enforced output in production.
- **Retries:**
  - Analysis: up to `maxRetries` (default 2), exponential backoff on 429 errors.
  - Chapters: 3 attempts per model across N models, with 1-4 s backoff (CPS:580-640).
- **Silent deterministic fallback (several paths):**
  - Chapters: with no API key → `generateCanonicalChapter` (CPS:553-558). **This has no NODE_ENV guard.** The worker blocks the no-key case in production first, but the service itself does not.
  - Chapters: **quota exhausted → canonical chapter, also in production** (CPS:568-574, no NODE_ENV check), and the result is **written to the cache**.
  - Chapters: retries exhausted → canonical outside production (CPS:641-653), also cached.
  - Canonical chapters carry no `modelUsed` or fallback flag. Once cached, they are indistinguishable from LLM output except that `modelUsed` is missing.
  - Canonical chapter text is written for the Scorpio reference native (ch07 and others).
  - Analysis: falls back to the Mock provider outside production when `ALLOW_MOCK_FALLBACK=true` or provider=mock (openrouter-career-analysis.provider.ts:121-131).
  - In the editorial LLM service (scripts only), fallback is labelled "transparent", using `isFallbackPreview` (career-editorial-llm.service.ts:318-344).
- **Caching:**
  - **Chapters:** disk cache at `/tmp/astro-sushil/cache/chapters/{chapterId}_{hash16}.json` (CPS:113, :531). The key is the SHA-256 of `{chapterId, calculatedFacts, clientMetadata(name, dob, tob, place), PROMPT_VERSION}`, truncated to 16 hex characters (CPS:853-861). The key has **no model, no userId/profileId and no ayanamsa/config**. Because the "facts" are largely hard-coded literals (see §0.3), the cache identity mostly reduces to name + DOB + TOB + place. The cache is a per-host /tmp directory: not shared across workers, not durable, and with no tenant isolation. `forceRegenerate` from the API is **not** forwarded as `forceRegenerateChapters`, so regeneration reuses the cached chapters (W:560-571 passes no flag).
  - **Script cache:** `ResumableCareerGeneratorService` builds a composite key from `clientId (name), birthData, chartHash, evidenceHash, topic, promptVersion, schemaVersion, modelVersion` (resumable-career-generator.service.ts:200-232). On read, however, it only checks `clientId (name), chartHash, evidenceHash, promptVersion` (:236-243): **model and schema version are ignored on a hit**. Cache files are named `topic_NN.json` per directory, so the per-client directory is chosen manually by the script (:840).
  - No DB table holds LLM outputs or prompts. There is no prompt or evidence snapshot per report.
- **Cost and token tracking:**
  - Production (OpenRouter) logs `completionTokens` and `reasoningTokens` to console only (provider :60-75). Nothing is persisted and there is no per-report cost.
  - Gemini scripts compute an estimated USD cost from hard-coded rates and write it into the manifest only.
- **PII and secrets:**
  - Chapter prompts send **client name, DOB, birth time and place** (CPS:681-686) to **free-tier OpenRouter models**, chosen dynamically from a list of providers with unknown data-retention policies.
  - Keys are not logged. The constructor logs provider and model only (W:81-89).
  - The prediction-engine uses `console.*`, not the redacting `logger`.
  - Raw upstream error text (`OpenRouter HTTP ${status}: ${errText}`) is propagated into `report.errorMessage` (W:576), which is returned to clients.

---

## 4. Evidence and claim validation
- **report-engine/validation:**
  - `traceability.validator.ts`: `verifyAiInterpretationTraceability` regex-checks "Planet in Sign" and "Planet in Nth house" claims against `VerifiedAstrologyEvidence` built from the engine chart. This is a genuine but shallow independent check, used by the deterministic generators.
  - `report-evidence.validator.ts`: `extractVerifiedEvidenceFromChart` and `validateVerifiedAstrologyEvidence` check presence and placeholders.
  - `claim-validation.engine.ts`: used only via `pdf-qa.validator.ts`, which is used only by the xelatex and latexto compilers and the tests.
- **prediction-engine `CareerEditorialTopicValidator`** (validation/career-editorial-topic.validator.ts), which produces the manifest's `verifiedEvidenceIds`:
  - Contradiction checks (ascendant, planet sign, planet house) are regexes over phrases like "your/natal X in Y" against actual chart placements (:183-245). Phrasings outside these patterns are not caught.
  - **"Verified evidence" is keyword presence, not value verification** (:288-334). Examples: `planet-X` counts as verified if the planet name appears anywhere; `conjunction-*` if the word "conjunction" appears; `varga-d10-*` if "executive" appears; `transit-*` if "cycle" appears; and **any other ID is pushed unconditionally** (:330-332). A missing ID does **not** fail validation (`isValid` ignores the verified list, :336). The output is a subset of the requested IDs. It is not a copy of them, but it is also not an independent check against engine values.
- **Cross-client protection:**
  - `disallowedSigns` is checked against regex placement claims (:255-264), but only when the caller supplies the list.
  - The production chapter pipeline does not run this validator; it uses `validateChapterContent`, which is shape-only.
  - Nothing checks that the evidence packet itself belongs to the client, and the packets contain reference-native literals (§0.3).

---

## 5. Job state machine, idempotency and regeneration
- **States** (schema.prisma `ReportStatus`): PENDING, QUEUED, CALCULATING, ANALYZING, RENDERING, COMPILING, UPLOADING, COMPLETED, FAILED, plus legacy PROCESSING. The worker uses QUEUED → CALCULATING (set on claim) → ANALYZING 35 → RENDERING 60 → COMPILING 75 → "VALIDATING" (stage string only, status COMPILING 85) → UPLOADING 95 → COMPLETED.
- **Queue:**
  - Postgres-backed (`postgres-queue.service.ts`): `claimJob` and `claimJobById` with `FOR UPDATE SKIP LOCKED`; `claimToken` + `claimVersion` fencing; 60 s lease with a heartbeat every 20 s (W:441-476).
  - Stale recovery runs with exponential `retryAfter` and `recoveryAttempts` (:418-470), then ends with `RECOVERY_EXHAUSTED`.
  - When `enqueueJob` fails, a fallback in-memory `jobQueue` exists (W:136-143).
- **Fencing gap:** most `failJob` calls inside the pipeline pass `claimToken` but **not `claimVersion`** (for example W:545, 576, 617, 671, 765, 908, 931, 968). `failJob` then takes the **unfenced** `prisma.report.updateMany({status in active})` branch (W:1299-1320). A worker that has lost its lease can therefore mark FAILED a job now owned by another worker.
- **Idempotency:**
  - In-process promise map (per pod), plus distributed lock on `userId:profile:type:partner`.
  - Active-job reuse, and completed-report reuse keyed on `reportVersion`, `calculationVersion` and `profile.updatedAt`.
  - Notifications use the idempotency keys `report_ready:` and `report_failed:`.
  - Order/fulfilment claims use CAS.
  - **There is no input snapshot or hash** (birth data, ayanamsa, engine version, prompt version) stored on the Report row; only the two version strings.
- **Regeneration:**
  - User: `POST /reports/career/:id/regenerate` → `createCareerReportJob(forceRegenerate: true)` (RS:437-458). CAREER only.
  - Admin: `POST /admin/reports/:id/regenerate` with RBAC `reports:regenerate` (admin.routes.ts:436) and `logAction`. It first creates a PENDING Report and then calls `createReportJob`, which creates/claims its own row, so it can leave an orphan PENDING row (admin.service.ts:1752-1770). Inferred from the code; not executed.
  - Retry: `retryReportJob` sets FAILED → QUEUED with CAS (W:1055-1110).
  - LLM chapter caches are not invalidated on regeneration (§3).

---

## 6. Test results (actually run)

Command:
```
npx vitest run --root=. --config=vitest.config.ts --fileParallelism=false packages/report-engine/src/__tests__
```
This mirrors `npm run test:report` in apps/api. It took 333 s.

- **Test files:** 19 passed, 1 failed (20 total).
- **Tests:** 129 passed, **1 failed** (130 total).
- **Failing test:** `packages/report-engine/src/__tests__/phase2a-pdf-verification.test.ts`, "Phase 2A XeLaTeX Career Report PDF Verification › Compiles full Career Report PDF with Scorpio Moon and verifies Dasha + Transits in PDF text". The error was `XELATEX_COMPILATION_FAILED … LaTeX Error: File 'parts/part02_lagna.tex' not found` (xelatex-compiler.ts:83).
- **The failure is flaky:** re-running the file alone **passed** (1/1, 65 s). The likely cause is shared mutable state under `/tmp/astro-sushil/reports/*` or the template copy. This is not confirmed.
- Raw output was captured during the 2026-11-18 forensics run (session scratchpad, not retained in the repo).
- Note that the passing tests largely assert on the reference chart, the mock provider and canonical content. Several of them encode reference-native literals (Puneet Kumar, Scorpio).

---

## 7. Critical defects and gaps, ranked
1. **(P0, customer harm and false advertising)** CAREER/CAREER_PROSITY PDFs embed the static Puneet-Kumar narrative (`templates/parts/part02-10`). Every buyer gets someone else's chart interpretation.
2. **(P0)** LLM chapter evidence packets hard-code the reference native's placements (CPS:166-520), and the canonical fallbacks are Scorpio-specific. This violates AGENTS.md §1.3 and §1.4.
3. **(P0, revenue and fulfilment)** SATURN is sold but always fails on the async path (W:424). CHILDBIRTH_FAMILY and GUPTA_NADI_DOSSIER are sold with no generator. Paid orders end up FAILED or are never created.
4. **(P1)** Production LLM spend has no effect: the analysis and chapter macros are never rendered, yet they are labelled `VERIFIED`.
5. **(P1)** Silent fallbacks:
   - A LaTeX failure falls back to a different deterministic product (W:593-621) with a fake page count.
   - Quota exhaustion falls back to canonical chapters even in production (CPS:568-574), and these are cached without a fallback flag.
6. **(P1)** Varshphal monthly predictions are verbatim reference-dossier text with OCR artefacts and fixed 2026 dates. The type is currently inactive.
7. **(P1)** PII (name, DOB, TOB, place) is sent to rotating free-tier OpenRouter models. There is no DPA or retention control and no persisted token or cost accounting.
8. **(P1)** Native PdfWriter: Helvetica/WinAnsi only, strips non-Latin-1 characters, no Devanagari, no images or brand assets. This falls far short of the references; non-career reports reach roughly 10-35% of reference page counts.
9. **(P2)** Unfenced `failJob` calls (missing `claimVersion`). Hard-coded `pageCount`. QA validates the TeX string, not the PDF, and QA is disabled in `.env`. Non-production inline execution inside the API process.
10. **(P2)** The chapter cache lives in /tmp, its key omits model and tenant, `forceRegenerate` is not propagated, and script-cache hits ignore model and schema version.
11. **(P2)** The evidence "verification" is keyword presence (the generic branch pushes IDs unconditionally), so `verifiedEvidenceIds` and `claimValidationPassed` in the manifests overstate their rigour.
12. **(P3)** Misleading artefacts:
    - The RANDOM_CUSTOMER manifest is a copy of the Ananya manifest.
    - `isRealLlm` and `fallbackTopics` are hard-coded.
    - CAREER_REPORT_FINAL_COMPLETION_REPORT.md:9 claims "100% PRODUCTION READY" for a script-only Gemini path that the API and worker never call.
    - Catalogue copy names the reference native's nakshatras.
    - Generated logs and a client-specific `report_data.tex` are committed in templates/.
    - `pressa-compiler.ts` is dead code.
