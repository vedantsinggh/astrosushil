# Astro Sushil: Phase 1 Repository-Wide Hardcoding Inventory

**Document Reference:** `docs/audits/report_system/phase_1_verification/PHASE_1_HARDCODING_INVENTORY.md`  
**Classification:** Source Code Hardcoding & Technical Debt Inventory  
**Date of Audit:** November 3, 2026  
**Auditor:** DeepMind Agentic Pair Programmer  
**Scope:** Repository-wide audit of static data, placeholder values, and mock fallbacks across `apps/` and `packages/`.  

---

## 1. Classification Scheme

To distinguish between genuine critical defects and appropriate engineering constants, all occurrences are categorized into four distinct classes:

- **Class A: Customer-Specific Hardcoding (MUST BE REMOVED)**  
  Data or text that should vary per native/customer but is hardcoded to static values in production runtime paths, causing identical or false customer output.
- **Class B: Static Business Content (SHOULD BECOME MANAGED CONFIGURATION)**  
  Business copy, prices, delivery estimates, or model configurations hardcoded in code that should be maintained in database configuration or environment variables.
- **Class C: Legitimate Constants & Mathematical Formulas (SHOULD REMAIN IN CODE)**  
  Universal astronomical constants, classical zodiac boundaries, degrees per sign, IAU physical constants, or standard security rules.
- **Class D: Test Fixtures & Mocks (MUST REMAIN ISOLATED IN TESTS)**  
  Synthetic test profiles, golden reference vectors, and mock providers used exclusively within test directories.

---

## 2. Hardcoding Findings by Classification

---

### Class A: Customer-Specific Hardcoding (MUST BE REMOVED)

These items represent direct product defects that directly undermine personalization and astronomical correctness:

| ID | Location | Hardcoded Value / Code Snippet | Customer Impact |
| :- | :--- | :--- | :--- |
| **A-01** | `packages/report-engine/src/mappers/career-report.mapper.ts:1650-1693` | `careerDirections: [ { rank: 1, title: 'Technology & Engineering Management...' }, { rank: 2, title: 'Corporate Strategy...' }, { rank: 3, title: 'Data-Driven Financial Strategy...' } ]` | **All customers** receive identical top 3 career recommendations regardless of birth chart. |
| **A-02** | `packages/report-engine/src/mappers/career-report.mapper.ts:1694-1707` | `cautionCareerDirections: [ { title: 'High-Frequency Speculative Trading without Quantitative Models' }, { title: 'Pure Administrative Roles Lacking Strategic Ownership' } ]` | **All customers** receive identical career caution sectors. |
| **A-03** | `packages/report-engine/src/mappers/career-report.mapper.ts:1708-1742` | `moneyIncomeArchitecture: { earningPattern: '...', incomeModes: '...', financialStability: '...' }` | **All customers** receive identical financial advice and revenue architecture. |
| **A-04** | `packages/report-engine/src/mappers/career-report.mapper.ts:1743-1764` | `professionalRelationships: { partnershipViability: '...', networkingStrategy: '...' }` | **All customers** receive identical networking and partnership guidance. |
| **A-05** | `packages/report-engine/src/mappers/career-report.mapper.ts:1765-1798` | `roadmapThirtyDay`, `roadmapNinetyDay`, `roadmapOneYear`, `roadmapThreeYear` | **All customers** receive identical strategic milestone roadmaps. |
| **A-06** | `packages/report-engine/src/generators/planetary-report.generator.ts:138-147` | `const ephemerisSnapshot = [ { planet: 'SATURN', deg: 15.2, sign: 'Pisces' }, { planet: 'JUPITER', deg: 18.5, sign: 'Taurus' }, ... ]` | Transit positions and Gochara house effects are completely static and never change with time. |
| **A-07** | `packages/report-engine/src/generators/kundli-report.generator.ts:216` | `const transitSaturnLong = 345.0; // Pisces` | Sade Sati transit status is evaluated against a fixed 345.0° Saturn for all natives forever. |
| **A-08** | `packages/report-engine/src/generators/pro-horoscope.generator.ts:179` | `julianDayUT: 2451545.0` | Planetary positions are computed for January 1, 2000 instead of native's actual birth date. |
| **A-09** | `packages/report-engine/src/generators/matchmaking-report.generator.ts:59` | `julianDayUT: 2451545.0` | Marriage compatibility chart calculation evaluates positions at J2000 epoch. |
| **A-10** | `packages/prediction-engine/src/providers/openrouter-career-analysis.provider.ts:120-130` | `return new MockCareerAnalysisProvider().analyze(input);` | Silently substitutes static mock narrative text when LLM calls fail. |

---

### Class B: Static Business Content (SHOULD BECOME MANAGED CONFIGURATION)

These items represent business parameters that are currently embedded in source code rather than database-backed or environment-driven settings:

| ID | Location | Hardcoded Value | Recommendation |
| :- | :--- | :--- | :--- |
| **B-01** | `packages/prediction-engine/src/config/openrouter-career.config.ts:14` | `'poolside/laguna-s-2.1:free'` | Move default model selection and fallbacks to database system configuration. |
| **B-02** | `apps/mobile/lib/features/auth/screens/register_screen.dart:43` | `TextEditingController(text: '1998-08-15')` | Remove default birth date pre-fill; require explicit date picker selection. |
| **B-03** | `apps/api/src/modules/auth/auth.routes.ts:63, 100` | `example: '1998-08-15'` | Document as Swagger example only; ensure documentation explicitly distinguishes examples from defaults. |
| **B-04** | `apps/api/src/services/storage.service.ts:26` | `path.resolve('/tmp/astro-sushil/storage')` | Make non-volatile persistent storage mount mandatory in configuration. |
| **B-05** | `packages/report-engine/templates/main.tex:24` | `"All calculations... auditable against Swiss Ephemeris release standards."` | Update legal/technical copy to accurately state calculation library. |
| **B-06** | `apps/mobile/lib/features/astrology/screens/astrology_hub_screen.dart:212` | `"All calculations are 100% deterministic using Swiss Ephemeris..."` | Align customer-facing documentation with actual runtime calculation engine. |

---

### Class C: Legitimate Constants & Mathematical Formulas (REMAIN IN CODE)

These values represent universal physical, astronomical, or mathematical truths:

| ID | Location | Constant / Formula | Justification |
| :- | :--- | :--- | :--- |
| **C-01** | `packages/astrology-engine/src/zodiac/rashi.ts` | `30.0` degrees per Rashi, 12 Rashis | Universal mathematical definition of the 360° zodiac. |
| **C-02** | `packages/astrology-engine/src/nakshatra/nakshatra.ts` | `13.333333333333334` degrees ($13^\circ 20'$), $3^\circ 20'$ per Pada | Classical definition of 27 Nakshatras and 108 Padas. |
| **C-03** | `packages/astrology-engine/src/dasha/dasha-calculator.ts` | Total Vimshottari cycle = 120 years, Sun=6, Moon=10, Mars=7, Rahu=18, Jupiter=16, Saturn=19, Mercury=17, Ketu=7, Venus=20 | Canonical Parashari Vimshottari dasha lord periods (*Brihat Parashara Hora Shastra*). |
| **C-04** | `packages/astrology-engine/src/ashtakavarga/ashtakavarga-calculator.ts` | Sarvashtakavarga total points = 337 bindus | Canonical classical Ashtakavarga mathematical invariant. |
| **C-05** | `packages/astrology-engine/src/coordinates/angular-math.ts` | `normalizeDegree(deg) => ((deg % 360) + 360) % 360` | Standard circular coordinate normalization. |
| **C-06** | `packages/astrology-engine/src/validation/birth-details.validator.ts:135` | `julianDayUT = utcTimestampMs / 86400000 + 2440587.5` | Standard astronomical formula for Unix epoch to Julian Day conversion. |

---

### Class D: Test Fixtures & Mocks (MUST REMAIN ISOLATED IN TESTS)

These fixtures are legitimate testing assets and must not leak into production code:

| ID | Location | Purpose | Isolation Verification |
| :- | :--- | :--- | :--- |
| **D-01** | `packages/astrology-engine/tests/fixtures/reference-charts.ts` | Golden charts: New Delhi 1990, Y2K Epoch, Sydney Southern | Properly isolated in `tests/fixtures/`. |
| **D-02** | `packages/prediction-engine/src/providers/mock-career-analysis.provider.ts` | Offline deterministic mock provider for unit testing | Leaks into production fallback via `openrouter-career-analysis.provider.ts` (addressed in A-10). |
| **D-03** | `apps/api/tests/unit/reference-astrology-fixtures.test.ts` | API unit test fixtures | Properly isolated in `tests/unit/`. |

---

## 3. Hardcoding Elimination Priority for Phase 2

1. **Immediate Elimination:** Class A findings (A-01 through A-10) must be resolved first. Replacing hardcoded arrays with dynamic evidence binding in `career-report.mapper.ts` will immediately solve identical report generation.
2. **Transit Engine Wiring:** Remove hardcoded snapshots in `planetary-report.generator.ts` and `kundli-report.generator.ts` and inject `TransitCalculator`.
3. **Epoch Fix:** Pass native birth timestamps into `pro-horoscope.generator.ts` and `matchmaking-report.generator.ts`.
