# Universal Report Platform — Developer Guide

Code: `packages/report-engine/src/platform/`. Tests: `packages/report-engine/src/__tests__/platform-core.test.ts`.
Forensics, catalogue and roadmap: [`README.md`](README.md).

This document describes what is implemented today. Planned work is listed separately under **Not yet implemented**.

## Pipeline

```
SubjectInput ─► buildChartSnapshot (astrology-engine only; hashed snapshotId; no wall-clock data)
             ─► EvidenceRegistry (flattened, stable evidence IDs, each with source + engine version)
             ─► per section:
                  data topics      → BLOCKS[block](snapshot, registry)          provenance: deterministic
                  narrative topics → LlmNarrator.generateBatch                 provenance: llm
                                       cache lookup (client+evidence-scoped key)
                                       Gemini call (transport retries, backoff, optional fallback models)
                                       zod schema parse
                                       claim validation (re-derived from snapshot)
                                       editorial validation (no fear/dosha/guarantees/sales/brand leaks)
                                       retry with feedback, else FAILED (no substitute text)
             ─► assembleDocument (editorial pages + sections) ─► XeLaTeX (3 passes, temp dir deleted)
             ─► runPdfQa (on the PDF: pages, fonts embedded, text, headings in order, forbidden strings)
             ─► ReportManifest (zod-validated)
```

Report status: `completed` only when every topic was produced and validated and PDF QA passed. Any failed or skipped topic gives `partial`; the PDF then shows a clearly labelled "could not be prepared" notice for that topic. A compile failure gives `failed`.

## Key modules

| File | Responsibility |
|---|---|
| `contracts.ts` | zod schemas and types: `ReportDefinition`, `ReportTopic`, `EvidenceItem`, `GeneratedTopicPayload`, `InterpretationClaim`, `TopicValidationResult`, `ReportManifest` |
| `snapshot/chart-snapshot.ts` | Canonical snapshot: natal (normalized), vargas, Vimshottari (MD/AD), Ashtakavarga, detected yogas, Jupiter/Saturn sign periods. Conventions recorded as **provisional**. |
| `snapshot/transit-periods.ts` | Sign periods from `TransitIngressSolver` (retrograde re-entries kept) |
| `evidence/evidence-registry.ts` | Evidence IDs such as `planet.venus.d1.house`, `house.7.d1.lord-house`, `karaka.dk`, `dasha.current.md`, `transit.jupiter.03`, `yoga.budha-aditya`, `sav.house.7`, `numerology.mulank`. Glob patterns (`planet.*.d1.sign`). |
| `validation/claim-validator.ts` | Claim and prose verification (see below) |
| `validation/editorial-validator.ts` | Safeguards and cross-topic repetition |
| `llm/narrator.ts`, `llm/prompts.ts`, `llm/topic-cache.ts` | Generation, retries, cache. `PROMPT_VERSION` is part of the cache key. |
| `llm/offline-test-provider.ts` | Zero-cost provider for tests and layout (`providerId: offline-test`; its text is visibly marked as test text) |
| `render/*` | LaTeX helpers, editorial pages, deterministic blocks, document assembly and compile. Style: `templates/platform/astrosushil-platform.sty` |
| `qa/pdf-qa.ts` | PDF inspection with poppler-utils |
| `registry.ts` | Registered definitions and their implementation status |
| `orchestrator.ts` | `generateReport()` |

## Evidence and claim validation

- The LLM receives only derived chart facts with evidence IDs. It never receives name, date, time or place of birth.
- Each claim must cite evidence IDs. A claim is **verified** only if:
  - every ID exists in the registry of the current snapshot;
  - every ID is within the topic's allowed scope;
  - the statement does not contradict the chart;
  - the cited value actually appears in the statement.
- Unknown IDs are **rejected**, never copied into the verified list. So are IDs from another snapshot or client, out-of-scope IDs, and contradicting statements.
- Independently of the claims, every natal "Planet in Nth house" or "Planet in Sign" sentence in the prose is re-checked against the chart. Transit, divisional-chart and hypothetical sentences are excluded from this check.
- A narrative topic passes only with at least one verified claim, no rejected claims, no prose contradictions, no editorial errors and sufficient depth.

## Cache

The key is a hash of: snapshotId, subjectRef, definitionId, specVersion, topicId, promptVersion, evidence fingerprint, model and generation config.

- **Dev store:** `FileTopicCacheStore`, at `REPORT_LLM_CACHE_DIR` (default `.cache/report-llm/<provider>/<subjectRef>/`, gitignored, files mode 0600).
- **Cache hits:**
  - are reported as `cached`, with the original `sourceGenerationId`;
  - carry no tokens or latency;
  - are re-validated against the current validators before use.

## Running

```bash
# Offline (no API cost) — layout and pipeline check
npx tsx packages/report-engine/src/scripts/generate-platform-report.ts \
  --report love --subject subject.json --out platform-output --provider offline --as-of 2026-11-18

# Real narrative (spends Gemini credit; needs GEMINI_API_KEY in the environment)
set -a; . ./.env; set +a
npx tsx packages/report-engine/src/scripts/generate-platform-report.ts --report love --subject subject.json --provider gemini

# Regenerate specific topics (bypasses their cache entries)
... --provider gemini --regenerate venus-placement,care-tips
```

`subject.json`:

```json
{ "name": "…", "gender": "female", "dateOfBirth": "YYYY-MM-DD", "timeOfBirth": "HH:mm", "placeName": "…", "latitude": 0, "longitude": 0, "timezone": "Asia/Kolkata" }
```

Outputs:
- `<report>-<subjectRef>.pdf`
- `<report>-<subjectRef>.manifest.json`
- `<report>-<subjectRef>.tex`, only with `--keep-tex`

Environment variables:

| Variable | Default / meaning |
|---|---|
| `REPORT_LLM_MODEL` | `gemini-3.1-flash-lite` (falls back to `GEMINI_MODEL` when set). Writes every topic on the first two attempts |
| `REPORT_LLM_RETRY_MODEL` | `gemini-3.8-flash`. Used only for the final attempt of a topic the primary model could not write validly. Empty = keep the primary model |
| `REPORT_LLM_FALLBACK_MODELS` | Comma-separated list, used on overload |
| `REPORT_LLM_THINKING_LEVEL` | `minimal`; `minimal`/`low`/`medium`/`high`, or `default` for the model's own setting. Sent to Gemini 3+ only; thinking tokens are billed as output. A model that rejects `minimal` is retried with `low` |
| `REPORT_LLM_RETRY_THINKING_LEVEL` | `low`, for `REPORT_LLM_RETRY_MODEL` |
| `REPORT_LLM_MAX_REPAIR_SHARE` | `0.3`. Largest share of a topic's sentences that sentence repair may remove; `0` disables repair |
| `REPORT_LLM_PRICE_INPUT_PER_MTOK`, `REPORT_LLM_PRICE_OUTPUT_PER_MTOK` | Unset. When both are set they replace the built-in per-model list prices (`MODEL_LIST_PRICES` in `orchestrator.ts`) for the cost estimate |
| `REPORT_LLM_CACHE_DIR` | Location of the dev topic cache |

Tests: `npx vitest run packages/report-engine/src/__tests__/platform-core.test.ts`. These use no network and no paid API.

## Cost control

Measured on the golden Career chart (46 narrative topics, 2026-11-23), list prices:

| Configuration | Input / output+thinking tokens | Estimate |
|---|---|---|
| `gemini-3.8-flash`, default thinking (2026-11-18, before the interpretation validators) | 94k / 138k | $0.59 |
| `gemini-3.1-flash-lite` + retry on `gemini-3.8-flash`, no repair | 365k / 64k | $0.30, 17 topics failed |
| Same, with sentence repair and the `ip1.2.0` prompt | 194k / 31k | $0.10, all topics passed |

What keeps the cost down:
- **Cheap model first.** `gemini-3.1-flash-lite` with minimal thinking writes every topic. A topic that fails validation is re-asked once on the same model with the validator feedback; only the final attempt goes to `REPORT_LLM_RETRY_MODEL`.
- **Sentence repair** (`llm/sentence-repair.ts`). When a topic fails only because individual sentences or claims were rejected (unsupported judgement, contradiction of the chart, near-duplicate, overstatement, unverified claim), those sentences and claims are removed and the topic is validated again, with no model call. Nothing is added or reworded. Each removal is recorded on the topic as an `UNVERIFIED_SENTENCE_REMOVED` or `UNVERIFIED_CLAIM_DROPPED` warning. Whole-topic problems (too short, a required interpretation not cited, a mixed result not acknowledged) still go back to the model.
- **Prompt size.** The interpretation instruction and the facts shared by every topic of a call are stated once per call; earlier topics are recalled by title and the first 150 characters of their opening line.
- **Claims.** The model is told to copy evidence labels and interpretation conclusions word for word as claim statements, which is what the validators match against.

The manifest's `usage` is built from every provider call of the run, including rejected attempts, split `byModel`, with `firstCallAtIso`/`lastCallAtIso` to match against the provider's billing report. The daily Rashi Bhavishya keeps its own settings (`RASHI_NARRATOR_DEFAULTS`).

## Illustrations

`render/illustrations.ts` places pictures from `templates/assets/library` (freely licensed photographs; sources and licences in its `SOURCES.md` and `library.json`). Rules, set by the client on 2026-11-24:

- **At most ten pictures per report** (`MAX_PICTURES`).
- **Life themes only** (`THEME_TAGS`: career, craft, teamwork, leadership, wealth, growth, change, and so on). A passage about a planet, a sign or a technique gets no picture, so there are no sky or planet photographs.
- **Small and uncaptioned:** one 48 x 44 mm picture beside the opening paragraph of a narrative topic. No full-width pictures and no section opener pages. Credit and licence appear only on the Image Credits page before the closing page.
- **Relevant and never repeated:** a picture is used only when its main subject is the passage's theme, and only once per report. Photographs of people (`"people": true` in `library.json`) are preferred over objects.
- **Deterministic:** selection is by fixed keyword rules (`SUBJECT_RULES`) over topic titles, with no LLM call. Passages that are first of all about a life theme are illustrated first, one picture per theme before a second of the same theme, and the allowance is spread through the report.

To add pictures, add the JPEG and a `library.json` entry whose first subject is one of the theme tags.

## Manifest

Each topic records:
- provenance and status;
- provider, model (the one actually used) and prompt version;
- cache key and hit, and source generation;
- evidence IDs and verified evidence IDs;
- claim counts and issues;
- tokens, latency and attempts (live calls only);
- error.

At report level:
- snapshotId, engine version and conventions, with `conventionsProvisional: true`;
- usage totals and per-model breakdown, with `estimatedCostUsd` and its stated `costBasis` (always an estimate, never billing);
- PDF page count, sha256 and QA result.

## Adding a report type

1. Read its analysis in `docs/report-system/analysis/ref-<report>.md`.
2. Create `definitions/<id>.definition.ts`. Map every reference topic, with `referencePages`, and mark extras `bonus: true`. Narrative topics declare `requiredEvidence` and `optionalEvidence`. Data topics name a `block`.
3. Add any new deterministic blocks to `render/blocks.ts`, built from the snapshot and registry only. Add any new evidence to `EvidenceRegistry`, sourced from the astrology engine.
4. Register it in `registry.ts` with an honest status.
5. Run it offline. Inspect the rendered pages (`pdftoppm`). Then run it once with Gemini and inspect again.
6. Add tests for the new blocks and evidence.

**Do not** encode an astrology rule that `docs/report-system/README.md` §9 lists as undefined. Ask first.

## Troubleshooting

- **`GEMINI_API_ERROR: HTTP 503` or timeouts:** the model is overloaded. The narrator backs off for up to about 6 retries per call. If retries run out, the topic is `failed` and the report `partial`. Re-run later: topics that already succeeded come from the cache.
- **`HTTP 404` for a model:** that model is not enabled for this API key. List the enabled models with `GET /v1beta/models`.
- **`LATEX_COMPILE_FAILED`:** the error excerpt is in the manifest. Re-run with `--keep-tex` and compile it manually to debug.
- **`skipped-missing-evidence`:** the chart lacks a required fact, for example a varga that was not computed. Check `vargasFor()` in `orchestrator.ts`.

## Registered reports (2026-11-18)

All 13 reference report types are registered in `platform/registry.ts`. Each one completes offline end to end, with PDF QA passing, for at least two synthetic subjects. Method decisions for each report are in `docs/report-system/decisions/`.

| Module | ReportType | Offline pages | Notes |
|---|---|---|---|
| love | LOVE | 22 | |
| career | CAREER | 72 | BNN as sign links only; the degree chain is not implemented (CAR decisions) |
| kundli | KUNDLI | 83 | Weekday computed sunrise to sunrise locally (engine defect D6) |
| finance | FINANCE | 50 | Functional nature replaces the undefined "gem power %" |
| couple-matching | MARRIAGE_COMPATIBILITY | 78 | Requires a partner; the partner profile must belong to the buyer |
| varshphal | VARSHPHAL | 86 | Includes Tajik elements; 12 personalised Tajik months |
| horoscope-annual | HOROSCOPE | 43 | Moon sign and Lagna |
| saturn | SATURN | 60 | Lifetime Sade Sati computed by the solver |
| jupiter-transit | JUPITER_TRANSIT | 44 | |
| rahu-ketu-transit | RAHU_KETU_TRANSIT | 57 | Mean nodes |
| fortune | FORTUNE | 53 | **Hindi** (`language: 'hi'`) |
| fortune-plus | FORTUNE_PLUS | 83 | |
| baby-name | BABY_NAME | 17 | Optional `candidateNames`; names are never sent to the LLM |
| planetary-summary | PLANETARY_SUMMARY | 17 | No reference report; D1 chart, planet table and one short reading per planet |

`career` also serves `CAREER_PROSITY` through `additionalReportTypes` (a definition may serve several ReportType values; `ReportRegistry.byReportType` resolves aliases and a ReportType served twice is a startup error). `CHILDBIRTH_FAMILY` and `GUPTA_NADI_DOSSIER` have no module: they are inactive in the catalogue and the API rejects them with `REPORT_TYPE_NOT_AVAILABLE`.

Page counts are with offline placeholder text; real narrative changes them.

## Worker integration

`apps/api/src/services/platform-report.runner.ts` is called by `report-worker.service.ts` for every ReportType. The platform is the only generation path: the legacy generators, the synchronous in-request generation and the `REPORT_PLATFORM_ENABLED` switch were removed.

- **Cache:** Postgres (`report_topic_cache`).
- **Delivery:** a report is delivered only when its status is `completed`. Nothing partial is ever delivered.
- **Measured values:** the page count is measured from the PDF, and the manifest is stored in `report.metadata.platformManifest` (not returned in the customer report list).
- **Retry later (reports are due one day after booking):** policy in `apps/api/src/services/report-retry.policy.ts`.
  - Each attempt has a hard 10-minute wall-clock limit (`REPORT_ATTEMPT_TIMEOUT_MS` may only lower it); on timeout the run is cancelled between sections.
  - Transient failures (`GENERATION_INCOMPLETE`, `PDF_RENDER_FAILED`, `ATTEMPT_TIMEOUT`, `LLM_NOT_CONFIGURED`, storage or unexpected errors) put the report back to `QUEUED` with `retryAfter` = now + 15m, 30m, 1h, 2h, then every 4h, never later than the deadline. Topics that already passed come from the cache, so retries are cheap.
  - The report is marked `FAILED` (with a customer-readable message, a `REPORT_FAILED` notification and a `[REPORT_ALERT]` log) only for permanent errors (invalid birth data, missing partner profile, unavailable report type, missing chart data), after the delivery deadline (`expectedDeliveryAt`, else booking + 24 h) or after 12 failed attempts.
  - While waiting, customers see the report as being prepared (`status: QUEUED`, `isPreparing: true`, no error fields). Diagnostics are kept in `generationFailures`, `lastAttemptAt`, `lastAttemptErrorCode` and `lastAttemptErrorMessage` (migration `20261118120000_report_retry_scheduling`).
  - User or admin regeneration and the manual retry reset the counter and run immediately.
- **Language:** each report row stores its language (`reports.language`, `en` or `hi`, default `en`; migration `20261124090000_add_report_language`). It is chosen when the report is created (`language` in the create request, see `docs/api-spec.md` section 2.8) and is fixed afterwards.
  - The API accepts a language only if `ReportRegistry.languages` lists it for that report, otherwise it answers `400 REPORT_LANGUAGE_NOT_AVAILABLE` before the order is looked up.
  - The worker passes the stored language to `generateReport` on every attempt, so retries and regeneration produce the same language.
  - The runner checks the registry again before any LLM call. `REPORT_LANGUAGE_NOT_AVAILABLE` at this stage (possible only if an edition was removed, or a worker runs older code than the API) is not in `PERMANENT_ERROR_CODES`, so it is retried like a transient failure until the deadline or attempt cap.
  - The storage key is per report row; the download file name of a non-English report ends in `-<language>`.

The migration `apps/api/prisma/migrations/20261118090000_report_platform` adds the `BABY_NAME` enum value and the cache table.

## Not yet done

- **Real-LLM validation of every report.** Gemini 3.8 Flash returned 503 overload on 2026-11-18. Every report type is therefore only "implemented, partially validated" until a real run is reviewed.
- **Engine defects** found during the build, which need a deliberate, tested engine change:
  - panchang weekday uses UTC (`panchang-calculator.ts:192`);
  - the chart normaliser replaces a timezone offset of 0 with 330 (`|| 330`);
  - Mitra Saham uses the Yashas formula;
  - the namakshara for Ashlesha pada 1 is "De" instead of "Di".
- **Mobile catalogue:** the app still hard-codes the report list and prices. Baby Name has no mobile entry, and its catalogue item is inactive with price 0 pending commercial sign-off.
- **Product question:** `CAREER_PROSITY` (₹699) is served by the same career report as `CAREER` (₹499) until the client defines a distinct product.
