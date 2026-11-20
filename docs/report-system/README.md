# Astro Sushil Report System — Forensics, Catalogue & Universal Architecture

Status: **Phase A–D complete (investigation + design). No implementation yet.**
Date: 2026-11-18. Baseline commit: `c969b68` (branch `chore/ci-infra-pricing-mobile-updates`).

Detailed evidence (file:line citations) lives in [`analysis/`](analysis/):

| File | Scope |
|---|---|
| `analysis/architecture-product-privacy.md` | Repo map, DB, product/purchase flow, storage, external data flows, logging, env vars |
| `analysis/existing-pipeline.md` | Current report-engine, worker, LLM, caching, validation, tests |
| `analysis/astrology-engines.md` | Calculation capabilities, conventions, duplicates, defects, gaps |
| `analysis/ref-*.md` (13 files) | Page-by-page analysis of each reference PDF |

Everything in this document was established by reading code or rendering PDFs. Items marked **(verified)** were re-checked by the lead engineer, not only by an investigating agent.

---

## 1. Initial repository state

- npm workspaces monorepo, Node 20.19 (CI) / 24 locally, Flutter 3.41.5. Tests: vitest.
- Working tree clean at baseline. Untracked test output (`phase2d_career_report_sample.pdf`) is produced by the report-engine test suite on each run.
- Baseline test results: astrology-engine **382/382 pass**; report-engine **129/130 pass** (`phase2a-pdf-verification` failed once — XeLaTeX could not find `parts/part02_lagna.tex` — and passed on isolated re-run; flaky, cause unconfirmed).

## 2. Architecture map (summary)

| Component | Role | Notes |
|---|---|---|
| `apps/api` | Fastify API + Prisma (`apps/api/prisma/schema.prisma`, 24 migrations) | Also hosts the report worker: `apps/api/src/worker.ts` → `services/report-worker.service.ts` |
| Report queue | Postgres row queue (`FOR UPDATE SKIP LOCKED`, fencing tokens, heartbeat) | **Not BullMQ** despite docs. `workers/` is only a README. In non-production the API process also consumes jobs. |
| `packages/astrology-engine` | Ephemeris & chart calculations | `astronomy-engine` 2.1.19 (MIT). Broad, accurate, well-tested. Canonical source of truth. |
| `packages/report-engine` | 13 generators, LaTeX + hand-written PDF writers, chapter LLM pipeline, validation | ~38k lines. Per-report silos; no shared contract. |
| `packages/prediction-engine` | Rule-based predictions | |
| `packages/gupta-nadi-engine` | **Placeholder (single function)** | BNN rules not implemented. |
| `apps/mobile` | Flutter client | Hard-codes report titles and prices (drifts from server catalogue). |
| `apps/admin` | Next.js admin | Scope-frozen (AGENTS.md §6). Regenerate action is broken (see §6). |
| Storage | Cloudflare R2, 15-min presigned GET; local `/tmp` fallback | Ownership checked on every report route. |

Data flow today: mobile → `POST /reports` (payment/entitlement) → `Report` row + queue job → worker allow-list → per-type generator → PDF writer (LaTeX for Career, hand-written Helvetica writer for all others) → R2 → presigned download.

## 3. Reference report inventory

13 unique PDFs in `docs/referencerepots/` (`docs/reference repots/` is a byte-identical duplicate — verified by md5).

> **Critical context (verified):** every reference PDF is a **third-party product of "Astro Arun Pandit Pvt Ltd"** (remedy upsell via Gemsmantra), produced for one sample native, *Puneet Kumar, 28/12/1983 04:45, Bulandshahr*. They define **information architecture and depth only**. Their prose, artwork, branding, coupons, phone numbers and sales CTAs must not be copied. Astro Sushil output must use Astro Sushil's own assets (`packages/report-engine/templates/assets/`) and original content.

| Canonical ID | Reference file | Pages | Lang | Family | Sections / topics | Personal data needed |
|---|---|---|---|---|---|---|
| `kundli-premium` | Premium Personalised Kundli | 295 | EN (+Hindi para) | Authored | 17 ch / ~330 | Full chart, 20 vargas, Vimshottari MD/AD/PD 120 yr, BAV/SAV, karakas, doshas, yogas, panchang, numerology |
| `career` | Career Report | 138 | EN | Authored | 15 / ~90 | D1, D10, career houses, yogas, BNN Saturn, BAV/SAV rules, current/next transits |
| `love` | Love Report | 23 | EN | Authored | 10 / ~35 | Lagna, Moon, Venus, 5th/7th, Darakaraka, Mulank, Jupiter marriage windows |
| `baby-name` | Baby Name Report | 15 | EN | Authored | 11 / ~25 | Numerology grids only; **selection rule absent** |
| `fortune` | Fortune Report | 112 | **Hindi** | Authored | 12 / ~70 | Numerology only (no birth time) |
| `fortune-plus` | Personalised Fortune Report Plus | 139 | EN | Authored | 25 / ~95 | Fortune numerology + astrology half (D1, D9, Moon, panchang, Manglik, Sade Sati, 5 yogas, marriage, career, gems) |
| `finance` | Finance Report | 32 | EN | Software | 8 / ~90 | Full planet table, Vimshottari+Yogini, D9/D10, SAV, gem power %, 5 yr × 12 month finance |
| `couple-matching` | Couple Kundli Matching | 96 | EN | Software | 33 / ~150 | Two full kundlis, 36-guna Ashtakoot, Manglik match, KP, 11 vargas, Kaal Sarp, 12-yr monthly graphs |
| `jupiter-transit` | Jupiter Transit Report | 79 | EN | Planet template | ~10 | Jupiter ingress windows incl. retrograde re-entries, Jupiter BAV + SAV |
| `rahu-ketu-transit` | Rahu Ketu Transit Report | 90 | EN | Planet template ×2 | ~12 | Node ingresses, transit houses from Lagna & Moon |
| `saturn` | Saturn In Your Birth Chart | 87 | EN | Planet template | ~12 | **Lifetime Sade Sati** (3 cycles), Kantak Shani, retro stations, Saturn BAV |
| `varshphal` | Varshphal Report | 97 | EN | Authored | ~10 + 12 monthly | Avakhada, solar return, Muntha. **No Tajik elements in reference.** |
| `horoscope-annual` | Personalised Horoscope Report | 70 | EN | Authored | ~10 | **Name + Moon sign only** (sign-level annual) |

Fortune vs Fortune Plus are **separate tiers**, not versions. Three structural families exist: Authored narrative, Software tabular, Planet-transit template.

Products in the commerce catalogue with **no reference**: `PLANETARY_SUMMARY`, `CAREER_PROSITY` (mobile sells it as "Pro Horoscope & Divisional Charts"; backend makes a career dossier), `CHILDBIRTH_FAMILY`, `GUPTA_NADI_DOSSIER`. The reference `baby-name` has **no catalogue entry**.

## 4. Existing implementation coverage matrix

| Report | Generator | Reachable via worker | Content source | Pages vs ref | Assessment |
|---|---|---|---|---|---|
| KUNDLI | yes | yes | deterministic templates, **fake fallbacks** (fixed Saturn 345°, invented Budhaditya Yoga, hard-coded SAV), **local time treated as UTC** | 18 / 295 | Partially implemented, defective |
| CAREER / CAREER_PROSITY | yes (LaTeX) | yes | **static prose written for the sample native — verified** (`templates/parts/part02_lagna.tex` "Scorpio Lagna… Mars in Virgo"); LLM output computed and discarded | ~68 / 138 | **Delivers another person's reading** |
| MARRIAGE_COMPATIBILITY | yes | yes | templates | 11 / 96 | Partial |
| HOROSCOPE (2 SKUs) | yes | yes | templates | 11 / 70 | Partial |
| FINANCE | yes | yes | templates; dashas anchored at midnight UTC | 12 / 32 | Partial, defective |
| LOVE | yes | yes | templates; Jupiter table has wrong signs | 23 / 23 | Structure close; data defect |
| FORTUNE | yes | yes | numerology templates; **no Hindi** | 27 / 112 | Partial |
| FORTUNE_PLUS | yes | **no** | templates; falls back to "Puneet Kumar" | 35 / 139 | Unreachable |
| SATURN (sold ₹499) | yes | **no — verified** (`report-worker.service.ts:423` allow-list) | **fixed Virgo-Moon Sade Sati dates for every native** | 10 / 87 | **Sold, always fails** |
| JUPITER_TRANSIT | yes | no | static 2025–30 table | 11 / 79 | Unreachable |
| RAHU_KETU_TRANSIT | yes | no | static table | 12 / 90 | Unreachable |
| VARSHPHAL | yes | no | **12 months copied verbatim from reference for every client** | 16 / 97 | Not personalised |
| CHILDBIRTH_FAMILY (sold ₹499) | none | no | — | — | **Sold, cannot fulfil** |
| GUPTA_NADI_DOSSIER (sold ₹999) | none | no | — | — | **Sold, cannot fulfil** |
| baby-name | none | — | — | 0 / 15 | Not implemented |

No report type today meets the bar of "fully implemented and validated".

## 5. Astrology engine conventions & gaps

Conventions in code: Lahiri ayanamsa (linear formula, duplicated in 7 places), sidereal, **Whole Sign houses only** (house-system parameter ignored; KP labels itself Placidus but uses equal cusps), **mean node**. `docs/astrology-spec.md:273-275` still lists ayanamsa, house system and node type as **awaiting client confirmation**.

Available and tested: positions/nakshatra/pada, retrograde, combustion, dignity, graha drishti, 16 vargas, Vimshottari to 5 levels + 8 other dashas, ~60 yogas, Manglik, point-in-time Sade Sati, Ashtakavarga, Shadbala, generic transit ingress/station solver, Varshphal core (solar return, Muntha, Panchadhikari, 5 Tajik yogas, 10 Sahams, Mudda), 36-guna matching, panchang, namakshara, Jaimini, KP.

Missing: BNN/Gupta Nadi, Yogini dasha, Kaal Sarp, lifetime Sade Sati/Kantak finder (solver exists; wrapper missing), baby-name generator, canonical numerology (4 divergent copies in report-engine).

Defects (not fixed — need approval as they change outputs): fabricated "Verified" fixture (`tests/fixtures/reference-charts.ts`), Saturn module hard-codes, static transit tables with wrong signs, Sripati bhava MC = Asc+270°, local-time-as-UTC in Kundli, panchang vara by UTC weekday, non-reproducible outputs (timestamps/`Date.now()` in IDs).

## 6. Critical architectural gaps (ranked)

**P0 — customer harm / legal exposure**
1. Career buyers receive prose written for the sample native (verified).
2. Generators silently fall back to the reference native's identity/birth data (`'Puneet Kumar'` defaults in career service, fortune-plus, varshphal, chapter pipeline, numerology).
3. Saturn (₹499), Childbirth (₹499), Gupta Nadi (₹999) are payable on the server but cannot be fulfilled.
4. Privacy claims are false: "zero-data-leakage" (`disclaimer_philosophy.tex:45`), "never shared with third parties" (mobile onboarding). Name + DOB + time + place are sent to rotating **free-tier OpenRouter models**; chapter cache stores this PII as plain JSON in `/tmp`; chapter pipeline ignores `LLM_PROVIDER=mock`.
5. LLM prompts are seeded with the sample native's chart facts (`chapter-pipeline.service.ts` `buildEvidencePacket`) — violates AGENTS.md §1.4.

**P1 — integrity**
6. Evidence "verification" is keyword presence; unknown IDs auto-verified; root manifests hard-code `isRealLlm: true` / `fallbackTopics: 0` (verified, `generate-customer-career-report.ts:569,595`).
7. Silent fallbacks: LaTeX failure ships a different PDF; quota exhaustion ships canned chapters unflagged; page counts hard-coded; PDF QA inspects TeX source, not the PDF.
8. Cache key lacks user ID, model, schema/spec version; regeneration does not invalidate.
9. Admin regenerate creates an orphan PENDING job then runs synchronously in the request.
10. Non-career PDFs: Helvetica only, non-Latin-1 stripped → **no Devanagari**, no images, no logo. The Hindi Fortune product cannot be rendered.

**P2** — duplicate numerology/Manglik/transit implementations, mobile price hard-coding, nested-key logging redaction, Razorpay mock signatures accepted outside production.

## 7. Proposed universal architecture

Modular monolith; new code lives in `packages/report-engine/src/platform/` (no new services). Existing generators keep working and are migrated one at a time behind the same `ReportType` values.

```
ReportRequest ──► ReportRegistry ──► ReportDefinition (spec JSON + strategy module)
                                         │
ChartSnapshotService (astrology-engine, immutable, hashed: snapshotId = H(birth data, conventions, engine version))
                                         │
EvidenceRegistry  — typed EvidenceItem{id, snapshotId, type, value, source, engineVersion}
                                         │
TopicPlanner — resolves topic dependencies, checks required evidence, emits GenerationPlan
                                         │
Deterministic rule layer (prediction-engine / report rules) → InterpretationFacts   ← no LLM
                                         │
LlmNarrator (provider abstraction; structured JSON out; per-report prompt pack, versioned)
                                         │
ClaimValidator — re-derives every cited evidence value from the snapshot; rejects unknown,
                 cross-snapshot or mismatched IDs; yoga claims re-checked against engine definitions
                                         │
EditorialValidator (repetition, banned fear/guarantee language, consistency across topics)
                                         │
ReportAssembler → Renderer (shared component library; Chromium HTML→PDF or XeLaTeX) → PdfQa (on the PDF)
                                         │
ReportManifest (per-topic provenance: llm | deterministic | static-educational, cache hit/miss, tokens, latency, errors)
```

Key contracts (zod schemas, runtime-validated): `ReportDefinition`, `ReportSection`, `ReportTopic`, `EvidenceRequirement`, `EvidenceItem`, `InterpretationClaim`, `GeneratedTopic`, `ValidationResult`, `ReportManifest`, `ReportQualityResult`.

Rules baked in:
- Topic content provenance is one of `llm`, `deterministic`, `static-educational`, `editorial`; never relabelled.
- Cache key = H(snapshotId, reportId+specVersion, topicId, promptVersion, evidenceFingerprint, model, genConfig). Cache stored in Postgres, scoped by user, not `/tmp`.
- LLM failure → topic `FAILED`, report `PARTIAL`/`FAILED`, controlled regeneration; no silent substitution.
- Page count and QA read the produced PDF.
- No defaults for identity or birth data — missing input is a validation error.

## 8. Phased implementation plan

| Phase | Work | Changes existing behaviour? |
|---|---|---|
| **0. Stop-the-bleed** | Remove sample-native fallbacks; deactivate unfulfillable SKUs (Saturn until fixed, Childbirth, Gupta Nadi) or fix the worker allow-list; stop shipping static Career prose; correct false privacy copy | **Yes — needs approval** |
| E. Core platform | Contracts, registry, ChartSnapshot, EvidenceRegistry, ClaimValidator, manifest, tests — additive | No |
| F. Generation | Provider abstraction, prompt packs, Postgres cache, retries, cost tracking | Only when a report is switched over |
| G. Rendering | Shared component library with Devanagari-capable fonts and Astro Sushil assets; PDF QA | Only when switched over |
| H. Migration | One report at a time: spec JSON → strategy → E2E test → switch `ReportType` to platform. Suggested order: Love (smallest, structure already close) → Saturn → Jupiter/Rahu-Ketu → Finance → Career → Fortune/Fortune Plus → Couple → Varshphal → Horoscope → Kundli → Baby Name | Yes, per report |
| I–K | Coverage/regression/E2E tests, mobile catalogue fetch, admin regenerate fix, audit | Yes |

Scale note: 13 report types and 1,370 reference pages. Each migrated report is a substantial unit of work; this is a multi-session programme, not a single change.

## 9. Decisions required from humans (AGENTS.md §2.5)

> Update 2026-11-18: the product owner delegated astrology-method choices to engineering. Each choice made is logged with its classical basis in [`DECISIONS.md`](DECISIONS.md) for later client review. Product and brand questions (author name spelling, catalogue scope) remain with the client.

Conventions: ayanamsa, house system, true vs mean node (spec still unconfirmed).

Rules the references use but never define — **will not be guessed**: BNN "Saturn chain by degree"; Career p45–46 house mappings and "Sun 10th special aspect"; Mangal dosha from Moon / "Anshik"; marriage-window grading; Success/Connection/Maturity number formulas; "Challenge" vs Pinnacle numbers; Ishtdev, beej mantra, rudraksha, donation and gemstone selection; gem power %; baby-name selection; Moon-sign "power" rating; Sade Sati intensity gauge; Varshphal favourability, monthly ratings, monthly remedy planet; whether Varshphal must include Tajik elements; Love lucky/unlucky tables; Astro-Vastu direction mapping.

Reference samples contradict each other for the same native (tithi/yoga/karana/sunrise, Manglik, lucky numbers, gemstones, Sade Sati dates), so they cannot be used as golden fixtures without client confirmation.

Product: what CAREER_PROSITY is; whether to sell Childbirth/Gupta Nadi; whether Baby Name is a product; Hindi edition scope; LLM provider and data-processing basis (paid provider with no-retention terms vs. current free tier).
