# Phase 2B Implementation Plan: Report System Personalization, Editorial Compliance & Lifecycle Hardening

**Document Version:** 2.0.0 (Engineering Review Correction)  
**Audit Date:** November 3, 2026  
**Auditor:** DeepMind Agentic Pair Programmer  
**Repository:** `Astro Sushil` Monorepo  
**Status:** Approved Architectural Blueprint & Implementation Specification (Strictly Read-Only Analysis)  
**Execution Condition:** Awaiting Human Engineering Supervisor Approval  

---

## 1. Executive Summary

Phase 2A successfully resolved foundational timekeeping and astronomical calculations:
1. Canonical IANA timezone resolution with complete DST boundary solver coverage.
2. Earlier vs. Later ambiguous hour disambiguation and authoritative UTC instant persistence (`utcDateTime`, `timezoneOffsetSeconds`, `disambiguation`).
3. Propagation of resolved UTC instants into `@astro/astrology-engine`.
4. Ephemeris attribution alignment in key templates, certifying runtime execution of Don Cross's `astronomy-engine` v2.1.19 (VSOP87/ELP2000-82) under Sidereal Lahiri Ayanamsa.

Phase 2A.6 concluded with formal approval while documenting specific limitations deferred to Phase 2B. Following engineering review, this Phase 2B Implementation Plan corrects and refines all findings, architecture decisions, and implementation stages:

1. **Strict Editorial Policy:**
   - **Retain:** Gemstone recommendations; traditional gemstone wearing instructions (ruler, finger, metal, day/hora, natural untreated stone); Manglik calculated status; neutral planetary placement analysis; neutral astronomical transit analysis.
   - **Remove Completely:** All dosha features, classifications, and report sections; Kaal Sarp classifications; Sade Sati classifications (general Saturn transit information remains as neutral astronomical analysis); Nadi Dosha classifications; *Kumbha Vivaha* and *Nadi Shanti* rituals; dosha cancellation and remedies marketing; fear-based predictions and mandatory remedies.
   - **No Disguised Doshas:** Dosha concepts must not be reintroduced under euphemistic terminology.
2. **Download Lifecycle & Asset Integrity:**
   - Eliminate runtime regeneration during report downloading/viewing (`GET /api/v1/reports/:id/download-file`).
   - The download endpoint must strictly: (1) retrieve the existing report record, (2) verify user ownership, (3) retrieve the existing stored PDF bytes, and (4) return the exact stored bytes.
   - If the stored asset is missing, return a controlled error and log an operational alert. **Never** regenerate the report from the download endpoint.
3. **Storage Durability:** Eliminate silent `/tmp` storage fallback in production environments to prevent permanent report loss.
4. **Production AI Safety:** Prohibit silent fallback to mock AI output in production. Implement controlled retries for transient provider failures, followed by explicit job failure. Mock providers remain strictly confined to development and testing.
5. **Dynamic Planetary Transits:** Compute live astronomical transits in the Planetary Report, replacing the frozen October 2024 static snapshot.
6. **Career Prompt & Mapper Synchronization:** Map the 10 horizon and priority fields into LaTeX macros; expand the prompt schema to supply structured house and planet guidance, eliminating static template fallbacks.
7. **Atomic Concurrency Protection:** Enforce atomic database-level idempotency or equivalent concurrency protection to prevent duplicate active report jobs.
8. **Configurable Delivery Windows:** Implement next-calendar-day delivery using configurable IST delivery windows, rather than hardcoding static hours.

---

## 2. Repository Areas Inspected

The audit inspected the following production modules and documentation:

| Subsystem | Inspected Paths |
| :--- | :--- |
| **Astrology Engine** | `packages/astrology-engine/src/configuration/astrology-config.ts`<br>`packages/astrology-engine/src/chart/chart-normalizer.ts`<br>`packages/astrology-engine/src/chart/chart-calculator.ts`<br>`packages/astrology-engine/src/matchmaking/matchmaking-calculator.ts`<br>`packages/astrology-engine/src/transit/sade-sati-calculator.ts` |
| **Prediction Engine** | `packages/prediction-engine/src/prompts/career-analyst.prompt.ts`<br>`packages/prediction-engine/src/providers/openrouter-career-analysis.provider.ts`<br>`packages/prediction-engine/src/providers/mock-career-analysis.provider.ts`<br>`packages/prediction-engine/src/validation/career-analysis.validator.ts`<br>`packages/prediction-engine/src/types/evidence.types.ts` |
| **Report Engine** | `packages/report-engine/src/generators/kundli-report.generator.ts`<br>`packages/report-engine/src/generators/planetary-report.generator.ts`<br>`packages/report-engine/src/generators/pro-horoscope.generator.ts`<br>`packages/report-engine/src/generators/matchmaking-report.generator.ts`<br>`packages/report-engine/src/generators/report-data-tex.generator.ts`<br>`packages/report-engine/src/mappers/career-report.mapper.ts`<br>`packages/report-engine/src/pdf/report-pdf.service.ts`<br>`packages/report-engine/src/providers/deterministic-interpretation.provider.ts`<br>`packages/report-engine/templates/main.tex`<br>`packages/report-engine/templates/report_data.tex` |
| **API Backend** | `apps/api/src/modules/reports/reports.service.ts`<br>`apps/api/src/modules/reports/reports.routes.ts`<br>`apps/api/src/modules/commerce/commerce.service.ts`<br>`apps/api/src/modules/commerce/commerce.catalog.ts`<br>`apps/api/src/services/report-worker.service.ts`<br>`apps/api/src/services/storage.service.ts`<br>`apps/api/src/modules/astrology/astrology.service.ts`<br>`apps/api/src/modules/astrology/birth-details.mapper.ts`<br>`apps/api/src/modules/admin/admin.service.ts`<br>`apps/api/prisma/schema.prisma` |
| **Mobile Client** | `apps/mobile/lib/features/reports/services/reports_service.dart`<br>`apps/mobile/lib/features/astrology/screens/matchmaking_screen.dart`<br>`apps/mobile/lib/home/screens/reports_screen.dart`<br>`apps/mobile/lib/features/astrology/screens/astrology_hub_screen.dart`<br>`apps/mobile/lib/l10n/app_en.arb`, `app_hi.arb` |
| **Audit History & Docs** | `docs/audits/report_system/phase_1a_verification/PHASE_1A_EDITORIAL_POLICY.md`<br>`docs/audits/report_system/phase_2a/PHASE_2A_EPHEMERIS_ATTRIBUTION.md`<br>`docs/audits/report_system/phase_2a6/PHASE_2A6_FINAL_REVIEW.md`<br>`docs/audits/report_system/phase_2a6/PHASE_2A6_REPORT_EDITORIAL_COMPLIANCE.md` |

---

## 3. Findings Grouped by Workstream

### Workstream A: Ephemeris Attribution

#### Finding A.1: Stray `SWISSEPH` Default in Chart Normalizer
- **Classification:** `CONFIRMED DEFECT`
- **Severity:** Medium
- **Location:** [`packages/astrology-engine/src/chart/chart-normalizer.ts:290`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/chart/chart-normalizer.ts#L290)
- **Code Evidence:**
  ```typescript
  config: {
    zodiacType: String(cfg.zodiacType || 'SIDEREAL'),
    ayanamsa: String(cfg.ayanamsa || 'LAHIRI'),
    houseSystem: String(cfg.houseSystem || 'WHOLE_SIGN'),
    nodeCalculation: String(cfg.nodeCalculation || 'MEAN_NODE'),
    planetaryCalculationMode: String(cfg.planetaryCalculationMode || 'SWISSEPH'),
  }
  ```
- **Type Inspection & Analysis:**
  Inspection of [`packages/astrology-engine/src/configuration/astrology-config.ts:20`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/configuration/astrology-config.ts#L20) demonstrates that the canonical type is:
  ```typescript
  export type PlanetaryCalculationMode = 'GEOCENTRIC' | 'TOPOCENTRIC' | ClientConfirmationRequired;
  ```
  In line 50 of `astrology-config.ts` and line 491 of `chart-normalizer.ts`, the default is correctly defined as `'GEOCENTRIC'`. Line 290 contains a stray `'SWISSEPH'` string literal that violates the defined union type and incorrectly references Swiss Ephemeris.
  Platform ephemeris attribution is maintained via `providerName` / `ephemerisProvider` (`'AstronomyEngine'`), while `planetaryCalculationMode` strictly denotes geometric coordinate reference (`'GEOCENTRIC'`).
- **Remediation:** Replace the stray `'SWISSEPH'` fallback on line 290 with the supported enum value `'GEOCENTRIC'`. Preserve ephemeris provider attribution in `providerName` metadata without inventing unsupported configuration strings.

#### Finding A.2: Inconsistent House System Fallback in PDF Generator
- **Classification:** `CONFIRMED DEFECT`
- **Severity:** Low
- **Location:** [`packages/report-engine/src/pdf/report-pdf.service.ts:54`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/pdf/report-pdf.service.ts#L54)
- **Code Evidence:**
  ```typescript
  pdf.drawText(`House System: ${careerData.calculation?.houseSystem || 'Placidus'}`, pdf.marginLeft + 280, 601, 10, false, PdfColors.DARK_TEXT);
  ```
- **Analysis:** Mandatory project directives mandate `WHOLE_SIGN` houses. Falling back to `'Placidus'` contradicts the platform calculation baseline.
- **Remediation:** Change fallback from `'Placidus'` to `'Whole Sign'`.

#### Finding A.3: Legacy Test Fixture Attribution Strings
- **Classification:** `POTENTIAL RISK`
- **Severity:** Low
- **Locations:**
  - [`apps/mobile/test/widget/astrology_phase2_widget_test.dart:30`](file:///home/pilot/Projects/astrosushil/apps/mobile/test/widget/astrology_phase2_widget_test.dart#L30)
  - [`packages/astrology-engine/tests/unit/shadbala-calculator.test.ts:32`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/tests/unit/shadbala-calculator.test.ts#L32)
  - [`packages/astrology-engine/tests/unit/bhava-bala.test.ts:18`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/tests/unit/bhava-bala.test.ts#L18)
  - [`packages/astrology-engine/tests/unit/ashtakavarga-calculator.test.ts:29`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/tests/unit/ashtakavarga-calculator.test.ts#L29)
- **Code Evidence:**
  `providerName: 'SwissEphemeris'`
- **Analysis:** Test mocks continue to inject `providerName: 'SwissEphemeris'`. While not affecting production runtime, it creates discrepancies in test suites.
- **Remediation:** Normalize test fixture metadata to `'AstronomyEngine'`.

---

### Workstream B: Report Editorial Compliance

#### Finding B.1: Kumbha Vivaha, Nadi Shanti & Superstitious Remedies in Matchmaking
- **Classification:** `EDITORIAL NON-COMPLIANCE`
- **Severity:** High
- **Location:** [`packages/report-engine/src/generators/matchmaking-report.generator.ts:272, 286, 289, 308`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/generators/matchmaking-report.generator.ts#L272-L308)
- **Code Evidence:**
  ```typescript
  // Line 272
  verdict = 'ALPA (BELOW THRESHOLD / REQUIRING REMEDIES)';
  
  // Line 286
  manglikExplanation = 'One partner has Kuja dosha while the other does not. Classical Vedic astrology recommends Kumbha Vivaha or mutual propitiation remedies.';

  // Line 289
  manglikExplanation = 'One partner has Kuja dosha while the other does not. Classical propitiation remedies are recommended.';

  // Line 308
  healthAndProgeny: 'Same Nadi identified. Consultation with a qualified physician and Vedic Nadi Shanti is advised.'
  ```
- **Analysis:** Recommending *Kumbha Vivaha* (marrying a pot/tree), *Nadi Shanti* rituals, or claiming that partnerships require paid remedies violates the Astro Sushil Approved Editorial Policy ([`PHASE_1A_EDITORIAL_POLICY.md`](file:///home/pilot/Projects/astrosushil/docs/audits/report_system/phase_1a_verification/PHASE_1A_EDITORIAL_POLICY.md)).
- **Remediation:** Remove all references to *Kumbha Vivaha*, *Nadi Shanti*, and propitiation rituals. Replace with neutral psychological and communication guidance. Remove `'ALPA (... REQUIRING REMEDIES)'` and `'DOSHA'` tags from koota evaluations; replace with neutral compatibility scoring terms (`'MODERATE'`, `'NEEDS_ATTENTION'`).

#### Finding B.2: Classical Dosha Section, Alarmist Manglik Badges & Dosha Classifications
- **Classification:** `EDITORIAL NON-COMPLIANCE`
- **Severity:** High
- **Locations:**
  - [`packages/report-engine/src/pdf/report-pdf.service.ts:323-344`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/pdf/report-pdf.service.ts#L323-L344)
  - [`packages/report-engine/src/generators/kundli-report.generator.ts:203-265`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/generators/kundli-report.generator.ts#L203-L265)
- **Code Evidence:**
  ```typescript
  // report-pdf.service.ts:324
  pdf.drawText('7. CLASSICAL DOSHA EVALUATION', pdf.marginLeft, curY, 11, true, PdfColors.INDIGO);

  // report-pdf.service.ts:328-330
  const doshas = [
    { name: 'Manglik Dosha', status: report.doshaAnalysis.manglik.isManglik ? `Active (${report.doshaAnalysis.manglik.severity})` : 'Not Present', desc: report.doshaAnalysis.manglik.description },
    { name: 'Sade Sati Status', status: report.doshaAnalysis.sadeSati.isSadeSatiActive ? `Active (${report.doshaAnalysis.sadeSati.phaseName})` : 'Not Active', desc: report.doshaAnalysis.sadeSati.description },
    { name: 'Kaal Sarp Yoga', status: report.doshaAnalysis.kaalSarp.isKaalSarpPresent ? report.doshaAnalysis.kaalSarp.typeName : 'Not Present', desc: report.doshaAnalysis.kaalSarp.description },
  ];

  // report-pdf.service.ts:339
  pdf.drawText(`Status: ${d.status}`, pdf.marginLeft + 280, curY - 15, 9, true, d.status.includes('Active') || d.status.includes('Present') ? PdfColors.ROSE : PdfColors.PURPLE);
  ```
- **Engineering Review Decision:** Do not merely rename the section. The entire dosha evaluation section must be completely eliminated.
- **Remediation:**
  1. Remove the entire `7. CLASSICAL DOSHA EVALUATION` section from `report-pdf.service.ts` and `kundli-report.generator.ts`.
  2. Remove Kaal Sarp classifications completely.
  3. Remove Sade Sati classifications completely.
  4. Retain Manglik status strictly as a neutral calculated indicator:
     - Name: `Manglik Status` (not Manglik Dosha).
     - Values: `Present` or `Not Present`.
     - Remove severity ratings (`HIGH`/`MEDIUM`) and rose-red alert badges.
     - Narrative: Objective explanation of Mars placement (e.g. *"Mars is placed in House 8: Suggests direct communication style in partnerships"*).
  5. Rebuild the section as `7. PLANETARY PLACEMENT & TRANSIT ANALYSIS`, containing only legitimate planetary placement observations and neutral astronomical transit cycles.

#### Finding B.3: Omitted Gemstone Methodology Disclaimer on Rendered PDF
- **Classification:** `CONFIRMED DEFECT` & `EDITORIAL NON-COMPLIANCE`
- **Severity:** Medium
- **Locations:**
  - [`packages/report-engine/src/generators/kundli-report.generator.ts:307-309`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/generators/kundli-report.generator.ts#L307-L309)
  - [`packages/report-engine/src/pdf/report-pdf.service.ts:347-374`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/pdf/report-pdf.service.ts#L347-L374)
- **Code Evidence:**
  `report.gemstoneRecommendations.generalAdvisory` defines the methodology disclaimer, but `report-pdf.service.ts:347-374` never renders it onto Page 3.
- **Analysis:** Omitting the methodology disclaimer allows recommendations to be misinterpreted as medical or financial prescriptions.
- **Remediation:** Add a prominent disclaimer card at the bottom of the Gemstone Recommendations page rendering `generalAdvisory`.

#### Finding B.4: Prescriptive Ritual Language in Gemstone Cautions
- **Classification:** `EDITORIAL NON-COMPLIANCE`
- **Severity:** Low
- **Location:** [`packages/report-engine/src/generators/kundli-report.generator.ts:304`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/generators/kundli-report.generator.ts#L304)
- **Code Evidence:**
  ```typescript
  caution: 'Perform proper purification (Prana Pratishtha) before first wear.'
  ```
- **Engineering Review Decision:** Retain legitimate traditional wearing instructions (metal, finger, day, hora, untreated stone). Remove mandatory ritual requirements (*Prana Pratishtha*). Do not invent modern cleaning or care instructions.
- **Remediation:** Remove `caution: 'Perform proper purification (Prana Pratishtha) before first wear.'`. Retain traditional parameters:
  - Ruling Lord: Mars
  - Finger: Ring Finger
  - Metal: Copper / Gold
  - Timing: Tuesday morning during Mars hora.
  - Caution: *"Ensure natural, untreated gemstone. Avoid wearing if Mars rules dusthana houses without benefic aspect."*

#### Finding B.5: Mobile UI Dosha Marketing & Classification
- **Classification:** `EDITORIAL NON-COMPLIANCE`
- **Severity:** Medium
- **Locations:**
  - [`apps/mobile/lib/home/screens/reports_screen.dart:89, 99, 177, 308, 843`](file:///home/pilot/Projects/astrosushil/apps/mobile/lib/home/screens/reports_screen.dart#L89-L99)
  - [`apps/mobile/lib/l10n/app_en.arb:84`](file:///home/pilot/Projects/astrosushil/apps/mobile/lib/l10n/app_en.arb#L84)
  - [`apps/mobile/lib/features/astrology/screens/matchmaking_screen.dart:904-905`](file:///home/pilot/Projects/astrosushil/apps/mobile/lib/features/astrology/screens/matchmaking_screen.dart#L904-L905)
- **Code Evidence:**
  - `'Classical Dosha Detection (Manglik, Sade Sati, Kaal Sarp)'`
  - `'36-Guna matching, dosha cancellation & remedies'`
  - `'Manglik Dosha Comparison (Kuja Dosha)'`
- **Analysis:** Mobile catalog copy and screen titles actively market doshas, dosha cancellation, and superstitious remedies.
- **Remediation:** Cleanse mobile strings and localization files. Update catalog copy to highlight planetary strengths, compatibility scoring, and traditional gemstone analysis.

---

### Workstream C: Report SKU Personalization

#### Finding C.1: Static Transit Snapshot in Planetary Report Generator
- **Classification:** `CONFIRMED DEFECT`
- **Severity:** High
- **Location:** [`packages/report-engine/src/generators/planetary-report.generator.ts:138-147`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/generators/planetary-report.generator.ts#L138-L147)
- **Code Evidence:**
  ```typescript
  const ephemerisSnapshot: Array<{ planet: string; sign: string; signIdx: number; deg: number; isRetro: boolean }> = [
    { planet: 'SATURN', sign: 'Pisces', signIdx: 12, deg: 15.2, isRetro: false },
    { planet: 'JUPITER', sign: 'Taurus', signIdx: 2, deg: 18.5, isRetro: false },
    { planet: 'RAHU', sign: 'Pisces', signIdx: 12, deg: 20.1, isRetro: true },
    { planet: 'KETU', sign: 'Virgo', signIdx: 6, deg: 20.1, isRetro: true },
    { planet: 'MARS', sign: 'Gemini', signIdx: 3, deg: 11.4, isRetro: false },
    { planet: 'SUN', sign: 'Libra', signIdx: 7, deg: 24.0, isRetro: false },
    { planet: 'VENUS', sign: 'Scorpio', signIdx: 8, deg: 5.6, isRetro: false },
    { planet: 'MERCURY', sign: 'Libra', signIdx: 7, deg: 14.8, isRetro: false },
  ];
  ```
- **Analysis:** Planetary transits in the Planetary Report are completely hardcoded to an October 2024 snapshot.
- **Remediation:** Calculate live astronomical transits dynamically using `TransitCalculator` or `ChartCalculator` evaluated at the current report generation timestamp.

#### Finding C.2: Sade Sati Feature & Classification Removal
- **Classification:** `EDITORIAL NON-COMPLIANCE` (Superseded by Policy Decision)
- **Severity:** Medium
- **Location:** [`packages/report-engine/src/generators/kundli-report.generator.ts:213-218`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/generators/kundli-report.generator.ts#L213-L218)
- **Engineering Review Decision:** Do **not** dynamically calculate Sade Sati. Remove the Sade Sati classification and its report feature entirely. General Saturn transit information may remain as neutral astronomical analysis.
- **Remediation:** Remove Sade Sati calculation, phase names, and status fields from `kundli-report.generator.ts` and `report-pdf.service.ts`. If Saturn transit analysis is included, frame it neutrally as Saturn's Gochara transit through the zodiac houses.

#### Finding C.3: Timezone and UTC Instant Bypass in Pro Horoscope Generator
- **Classification:** `CONFIRMED DEFECT`
- **Severity:** High
- **Location:** [`packages/report-engine/src/generators/pro-horoscope.generator.ts:177-180`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/generators/pro-horoscope.generator.ts#L177-L180)
- **Code Evidence:**
  ```typescript
  normalizedTime: {
    originalDetails: bDetails as any,
    utcIsoString: new Date(`${profileInput.dateOfBirth}T${profileInput.timeOfBirth || '12:00:00'}Z`).toISOString(),
    utcTimestampMs: Date.now(),
    julianDayUT: 2451545.0,
    timezoneOffsetMinutes: 330,
  }
  ```
- **Analysis:** Bypasses Phase 2A resolved UTC instants, appends `'Z'` to local time, hardcodes +5:30 offset, and sets J2000 epoch.
- **Remediation:** Pass the pre-computed `NormalizedChart` directly into `generateProHoroscopeReport`.

#### Finding C.4: Discarded AI Horizon Fields & Silent Fallback to Generic Text in Career Mapper
- **Classification:** `CONFIRMED DEFECT`
- **Severity:** High
- **Locations:**
  - [`packages/prediction-engine/src/prompts/career-analyst.prompt.ts:76-86`](file:///home/pilot/Projects/astrosushil/packages/prediction-engine/src/prompts/career-analyst.prompt.ts#L76-L86)
  - [`packages/report-engine/src/mappers/career-report.mapper.ts:636, 780`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/mappers/career-report.mapper.ts#L636)
- **Code Evidence:**
  - Prompt generates 10 priority and horizon fields (`thirtyDayFocus`, `ninetyDayFocus`, `oneYearFocus`, `threeYearDirection`, `primaryProfessionalPriority`, `technicalSkillPriority`, `communicationSkillPriority`, `leadershipSkillPriority`, `networkSkillPriority`, `mistakeToAvoid`) that have **0 occurrences** in `career-report.mapper.ts`.
  - Conversely, `career-report.mapper.ts:636, 780` tries to read `analysis.houseInterpretations` and `analysis.planetInterpretations`, which the prompt never generates, causing silent fallback to hardcoded template strings for all 12 houses and all 9 planets.
- **Remediation:**
  1. Map the 10 horizon fields into LaTeX macros in `career-report.mapper.ts` and `report_data.tex`.
  2. Expand `career-analyst.prompt.ts` to generate structured house and planet guidance so the mapper utilizes real personalized AI analysis.

#### Finding C.5: Silent Fallback Numerical Defaults in Strength Calculations
- **Classification:** `CONFIRMED DEFECT`
- **Severity:** Medium
- **Location:** [`packages/report-engine/src/generators/pro-horoscope.generator.ts:283-300, 320-333`](file:///home/pilot/Projects/astrosushil/packages/report-engine/src/generators/pro-horoscope.generator.ts#L283-L333)
- **Code Evidence:**
  Catch blocks inject hardcoded Shadbala values (`sthanaBala: 140.0`, `digBala: 45.0`, `isStrong: true`) and Bhava Bala values (`bhavadhipatiBala: 5.0`).
- **Analysis:** Directly violates the mandatory rule: *"Do not silently introduce defaults or fallback calculations."*
- **Remediation:** Remove fake numerical defaults. Propagate errors or explicitly flag missing values as unavailable.

#### Finding C.6: Silent Substitution of Unsupported SKUs
- **Classification:** `CONFIRMED DEFECT`
- **Severity:** High
- **Locations:**
  - [`apps/api/src/modules/reports/reports.service.ts:416`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L416)
  - [`apps/api/src/services/report-worker.service.ts:428`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L428)
- **Code Evidence:**
  Synchronous mode silently generates a Kundli report when `GUPTA_NADI_DOSSIER` or `CHILDBIRTH_FAMILY` is requested. Async worker mode fails with `UNSUPPORTED_REPORT_TYPE`.
- **Remediation:** Reject generation requests and block purchases for unbuilt SKUs until their dedicated generator pipelines and templates are implemented.

---

### Workstream D: AI Provider and Job Reliability

#### Finding D.1: Silent Fallback to Mock Provider in Production
- **Classification:** `CONFIRMED DEFECT`
- **Severity:** Critical
- **Location:** [`apps/api/src/services/report-worker.service.ts:183-195`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L183-L195)
- **Code Evidence:**
  ```typescript
  const useMock = llmProviderEnv === 'mock' || (!isApiKeyAvailable && llmProviderEnv !== 'openrouter');
  const provider: CareerAnalysisProvider = useMock
    ? new MockCareerAnalysisProvider()
    : new OpenRouterCareerAnalysisProvider();
  ```
- **Engineering Review Decision:** Production must **never** silently fall back to mock AI output. Implement controlled retries for transient provider failures, followed by explicit job failure. Mock providers remain strictly confined to development and testing.
- **Remediation:**
  1. In `report-worker.service.ts`, if `NODE_ENV === 'production'`, throw an immediate fatal error (`AI_CREDENTIALS_MISSING`) if API credentials are not set.
  2. In `OpenRouterCareerAnalysisProvider`, implement exponential backoff retries for transient HTTP errors (429, 500, 502, 503, 504, timeout).
  3. If retries are exhausted in production, fail the job with `AI_PROVIDER_ERROR`. Never substitute mock data in production.

#### Finding D.2: Non-Atomic Concurrency & Duplicate Report Request Races
- **Classification:** `CONFIRMED DEFECT`
- **Severity:** Medium
- **Location:** [`apps/api/src/modules/reports/reports.service.ts:504-533`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L504-L533)
- **Engineering Review Decision:** Use atomic database-level idempotency or equivalent concurrency protection. An application-level active-job lookup alone is insufficient.
- **Remediation:** Wrap report creation in an atomic transaction with a database-level lock (e.g. advisory lock or active-state partial unique constraint on `[userId, birthProfileId, reportType]`), ensuring concurrent requests cannot create duplicate active jobs.

#### Finding D.3: Lack of Failure Notification Dispatch
- **Classification:** `CONFIRMED DEFECT`
- **Severity:** Medium
- **Location:** [`apps/api/src/services/report-worker.service.ts:545-565`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L545-L565)
- **Analysis:** When a job fails, `failJob` marks DB status as `FAILED` but dispatches no notification.
- **Remediation:** Add `REPORT_FAILED` notification dispatch in `failJob`.

---

### Workstream E: Report Delivery and Lifecycle

#### Finding E.1: Report Regeneration on User Open / Download
- **Classification:** `CONFIRMED DEFECT`
- **Severity:** Critical
- **Locations:**
  - [`apps/api/src/modules/reports/reports.service.ts:365-422`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L365-L422)
  - [`apps/api/src/modules/reports/reports.routes.ts:142-153`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.routes.ts#L142-L153)
  - [`apps/mobile/lib/features/reports/services/reports_service.dart:45`](file:///home/pilot/Projects/astrosushil/apps/mobile/lib/features/reports/services/reports_service.dart#L45)
- **Code Evidence:**
  `generateReportPdfBuffer` recalculates the chart and re-renders the PDF from scratch on every download request instead of streaming the pre-compiled PDF from storage.
- **Engineering Review Decision:** Remove the proposed fallback to PDF regeneration when the stored asset is missing. The download endpoint must:
  1. Retrieve the existing report record.
  2. Verify user ownership.
  3. Retrieve the existing stored PDF.
  4. Return the exact stored bytes.
  If the stored asset is missing, return a controlled error and log an operational alert. **Never** regenerate the report from the download endpoint.
- **Remediation:** Refactor `handlePdfDownload` and `generateReportPdfBuffer` to stream stored bytes from `storageService.downloadBuffer(report.storageKey)`. If missing, return `404 Not Found` with code `REPORT_ASSET_NOT_FOUND` and log a high-priority operational alert.

#### Finding E.2: Ephemeral Local Disk Storage (`/tmp`) Data Loss Risk
- **Classification:** `CONFIRMED DEFECT` & `POTENTIAL RISK`
- **Severity:** High
- **Location:** [`apps/api/src/services/storage.service.ts:26, 122-126`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/storage.service.ts#L26-L126)
- **Analysis:** Fallback writes to `/tmp/astro-sushil/storage` are wiped on container restart.
- **Remediation:** In production environments, throw a fatal error on upload failure rather than silently writing to `/tmp`.

#### Finding E.3: Missing Next-Calendar-Day Delivery Policy with Configurable IST Window
- **Classification:** `CONFIRMED DEFECT` / `ARCHITECTURAL GAP`
- **Severity:** High
- **Location:** [`apps/api/src/modules/commerce/commerce.service.ts:210-245`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/commerce/commerce.service.ts#L210-L245)
- **Engineering Review Decision:** The next-calendar-day delivery policy must use a configurable IST delivery window. Do not hardcode 09:00 as an immutable business rule.
- **Remediation:** Introduce a delivery scheduling service that computes `scheduledDeliveryAt` using configurable IST delivery window parameters (e.g. `REPORT_DELIVERY_WINDOW_START_IST` and `REPORT_DELIVERY_WINDOW_END_IST`) in production, while maintaining instant delivery in development.

#### Finding E.4: Regeneration ID Semantics
- **Classification:** `NO ACTION REQUIRED`
- **Location:** [`apps/api/src/modules/reports/reports.service.ts:165`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L165)
- **Analysis:** Verified that `regenerateCareerReport` invokes `createCareerReportJob` with `forceRegenerate: true`, creating a new report record with a new ID while leaving original records intact.

---

### Workstream F: Phase 2A Regression Protection

#### Finding F.1: Partial Profile Mapping in Administrative Diagnostics
- **Classification:** `CONFIRMED DEFECT`
- **Severity:** Medium
- **Location:** [`apps/api/src/modules/admin/admin.service.ts:1426-1435, 1642-1650`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/admin/admin.service.ts#L1426-L1650)
- **Code Evidence:**
  Passes a partial object to `mapBirthProfileToBirthDetails`, omitting `disambiguation`, `utcDateTime`, and `timezoneOffsetSeconds`.
- **Remediation:** Pass the complete `profile` object directly into `mapBirthProfileToBirthDetails(profile)`.

#### Finding F.2: Production Path Verification of Phase 2A Timezone & Disambiguation
- **Classification:** `NO ACTION REQUIRED`
- **Locations:**
  - [`apps/api/src/modules/astrology/birth-details.mapper.ts:54-83`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/astrology/birth-details.mapper.ts#L54-L83)
  - [`apps/api/src/modules/astrology/astrology.service.ts:146`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/astrology/astrology.service.ts#L146)
- **Analysis:** Verified that production paths correctly map `disambiguation`, `utcDateTime`, and `timezoneOffsetSeconds` into the astrology engine.

#### Finding F.3: Integration Test Suite Mocking Limitations
- **Classification:** `POTENTIAL RISK`
- **Locations:**
  - [`apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts:19-105`](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts#L19-L105)
  - [`apps/api/tests/integration/phase4-report-hardening.test.ts:100-165`](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/phase4-report-hardening.test.ts#L100-L165)
- **Analysis:** Integration tests mock Prisma using in-memory Maps and test `/download-file` (which dynamically re-renders), hiding the storage bypass defect.
- **Remediation:** Implement un-mocked integration tests running against real PostgreSQL and storage services.

---

## 4. Comprehensive Findings Summary Table

| ID | Workstream | Description | Classification | Severity | Impacted Module |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **A.1** | Ephemeris Attribution | Stray `'SWISSEPH'` fallback in normalizer line 290 | `CONFIRMED DEFECT` | Medium | `packages/astrology-engine` |
| **A.2** | Ephemeris Attribution | Fallback house system in `report-pdf.service.ts` set to `'Placidus'` | `CONFIRMED DEFECT` | Low | `packages/report-engine` |
| **A.3** | Ephemeris Attribution | Unit test fixtures declare `providerName: 'SwissEphemeris'` | `POTENTIAL RISK` | Low | `packages/astrology-engine` |
| **B.1** | Editorial Compliance | Matchmaking recommends *Kumbha Vivaha*, *Nadi Shanti*, and remedies | `EDITORIAL NON-COMPLIANCE` | High | `packages/report-engine` |
| **B.2** | Editorial Compliance | Complete dosha evaluation section present in report & PDF | `EDITORIAL NON-COMPLIANCE` | High | `packages/report-engine` |
| **B.3** | Editorial Compliance | Gemstone methodology advisory disclaimer omitted from PDF layout | `CONFIRMED DEFECT` | Medium | `packages/report-engine` |
| **B.4** | Editorial Compliance | Prescriptive ritual language (*"Prana Pratishtha"*) in gemstones | `EDITORIAL NON-COMPLIANCE` | Low | `packages/report-engine` |
| **B.5** | Editorial Compliance | Mobile UI marketing cards promote dosha detection & cancellation | `EDITORIAL NON-COMPLIANCE` | Medium | `apps/mobile` |
| **C.1** | SKU Personalization | Planetary Report uses hardcoded static transit snapshot (Oct 2024) | `CONFIRMED DEFECT` | High | `packages/report-engine` |
| **C.2** | SKU Personalization | Sade Sati classification removal (superseded by editorial policy) | `EDITORIAL NON-COMPLIANCE` | Medium | `packages/report-engine` |
| **C.3** | SKU Personalization | Pro Horoscope bypasses UTC instant, hardcodes +5:30 offset & J2000 epoch | `CONFIRMED DEFECT` | High | `packages/report-engine` |
| **C.4** | SKU Personalization | LLM prompt horizon fields discarded; house/planet sections fall back to static text | `CONFIRMED DEFECT` | High | `packages/report-engine` / `packages/prediction-engine` |
| **C.5** | SKU Personalization | Pro Horoscope catch blocks silently inject fake Shadbala numerical values | `CONFIRMED DEFECT` | Medium | `packages/report-engine` |
| **C.6** | SKU Personalization | `GUPTA_NADI_DOSSIER` & `CHILDBIRTH_FAMILY` silently deliver Kundli report | `CONFIRMED DEFECT` | High | `apps/api` |
| **D.1** | Job Reliability | Worker silently falls back to Mock provider in production when API key missing | `CONFIRMED DEFECT` | Critical | `apps/api` |
| **D.2** | Job Reliability | Lack of atomic concurrency protection against duplicate active report jobs | `CONFIRMED DEFECT` | Medium | `apps/api` |
| **D.3** | Job Reliability | Failed worker jobs do not dispatch user failure notifications | `CONFIRMED DEFECT` | Medium | `apps/api` |
| **E.1** | Lifecycle & Delivery | Opening/downloading report triggers on-the-fly recalculation & regeneration | `CONFIRMED DEFECT` | Critical | `apps/api` / `apps/mobile` |
| **E.2** | Lifecycle & Delivery | Ephemeral `/tmp` fallback risks permanent customer report loss | `CONFIRMED DEFECT` | High | `apps/api` |
| **E.3** | Lifecycle & Delivery | Missing scheduled next-calendar-day delivery using configurable IST window | `CONFIRMED DEFECT` | High | `apps/api` |
| **F.1** | Phase 2A Protection | Admin diagnostic methods pass partial profile object omitting UTC/DST | `CONFIRMED DEFECT` | Medium | `apps/api` |
| **F.3** | Phase 2A Protection | Integration test suites rely on in-memory mocks, bypassing DB & storage | `POTENTIAL RISK` | Medium | `apps/api/tests` |

---

## 5. Revised Implementation Stages

Implementation must proceed in the following six strictly sequenced stages:

### Phase 2B.1: Report Lifecycle, Storage Durability, Production AI Safety, Fake Numerical Fallback Removal
1. **Download Endpoint Refactoring:**
   - Modify `handlePdfDownload` and `generateReportPdfBuffer` in `apps/api/src/modules/reports/`.
   - Strictly retrieve existing report record, verify ownership, retrieve stored PDF bytes from `storageService.downloadBuffer(report.storageKey)`, and return exact stored bytes.
   - If stored asset is missing, return controlled error (`404` / `REPORT_ASSET_NOT_FOUND`) and log an operational alert. **Never** regenerate the report on download.
2. **Storage Durability Hardening:**
   - Disable silent `/tmp` fallback in production in `storage.service.ts`. Throw a fatal error on upload failure.
3. **Production AI Safety:**
   - In `report-worker.service.ts`, prohibit silent fallback to mock providers in production.
   - Implement controlled retries with exponential backoff for transient errors, followed by explicit failure (`AI_PROVIDER_ERROR`). Mock providers remain strictly for development and testing.
4. **Fake Numerical Fallback Removal:**
   - In `pro-horoscope.generator.ts`, eliminate fake Shadbala and Bhava Bala fallback values in catch blocks. Bubble up errors or mark values as unavailable.

### Phase 2B.2: Complete Dosha Removal and Editorial Compliance
1. **Complete Dosha Section Removal:**
   - Remove the entire `7. CLASSICAL DOSHA EVALUATION` section from `kundli-report.generator.ts` and `report-pdf.service.ts`.
   - Remove Kaal Sarp classifications completely.
   - Remove Sade Sati classifications completely.
   - Rebuild legitimate content under `7. PLANETARY PLACEMENT & TRANSIT ANALYSIS` (neutral planetary placements and Gochara transit cycles).
2. **Neutral Manglik Status:**
   - Keep Manglik status strictly as a neutral calculated indicator (`Present` / `Not Present`) without severity badges or red formatting.
3. **Gemstone Disclaimer & Care Language:**
   - Render `gemstoneRecommendations.generalAdvisory` on Page 3 of the Kundli PDF.
   - Retain traditional wearing parameters (ruler, finger, metal, day/hora, untreated stone); remove *"Prana Pratishtha"* ritual language. Do not invent modern care/cleaning instructions.
4. **Matchmaking Cleansing:**
   - Scrub *Kumbha Vivaha*, *Nadi Shanti*, and paid remedies from `matchmaking-report.generator.ts`.
   - Remove `'DOSHA'` tags from koota evaluations; replace with neutral alignment ratings.
5. **Mobile Marketing Copy:**
   - Cleanse mobile screens (`reports_screen.dart`, `matchmaking_screen.dart`, `app_en.arb`) of dosha marketing, fear-based framing, and remedy claims.

### Phase 2B.3: Ephemeris Metadata, House-System Defaults, UTC Correctness, Dynamic Planetary Transits
1. **Ephemeris Metadata Correction:**
   - In `packages/astrology-engine/src/chart/chart-normalizer.ts:290`, replace stray `'SWISSEPH'` fallback with canonical `'GEOCENTRIC'`. Preserve ephemeris attribution in `providerName` metadata without inventing unsupported configuration strings.
2. **House-System Default:**
   - In `packages/report-engine/src/pdf/report-pdf.service.ts:54`, update fallback from `'Placidus'` to `'Whole Sign'`.
3. **Pro Horoscope UTC Instant Preservation:**
   - In `pro-horoscope.generator.ts`, accept pre-computed `NormalizedChart` to preserve Phase 2A UTC instant. Remove hardcoded +5:30 offset and J2000 epoch.
4. **Dynamic Planetary Transits:**
   - In `planetary-report.generator.ts`, replace frozen `ephemerisSnapshot` with dynamic astronomical calculations evaluated at the report generation timestamp.
5. **Admin Diagnostic Mapping:**
   - In `apps/api/src/modules/admin/admin.service.ts:1426, 1642`, pass complete `BirthProfile` objects into `mapBirthProfileToBirthDetails`.

### Phase 2B.4: Career Prompt/Mapper Synchronization and Unsupported SKU Protection
1. **Prompt & Mapper Synchronization:**
   - In `packages/report-engine/src/mappers/career-report.mapper.ts`, map the 10 horizon and priority fields (`thirtyDayFocus`, `ninetyDayFocus`, etc.) into LaTeX macros.
   - In `packages/prediction-engine/src/prompts/career-analyst.prompt.ts`, expand the JSON schema contract to supply structured house and planet guidance, eliminating static template fallbacks.
2. **Unsupported SKU Protection:**
   - In `apps/api/src/modules/reports/reports.service.ts` and commerce services, block purchases and generation requests for unbuilt SKUs (`GUPTA_NADI_DOSSIER`, `CHILDBIRTH_FAMILY`) with explicit error messages, eliminating silent substitution.

### Phase 2B.5: Duplicate-Job Protection, Failure Notifications and Configurable IST Delivery Scheduling
1. **Atomic Concurrency Protection:**
   - In `apps/api/src/modules/reports/reports.service.ts`, implement atomic database-level idempotency or equivalent concurrency protection (e.g. database-level advisory locks or active-state unique constraints) to ensure concurrent requests cannot create duplicate active jobs.
2. **Failure Notifications:**
   - In `apps/api/src/services/report-worker.service.ts:545`, dispatch `REPORT_FAILED` notifications upon job failure.
3. **Configurable IST Delivery Scheduling:**
   - In `commerce.service.ts`, implement a delivery scheduling service computing `scheduledDeliveryAt` based on configurable IST delivery window parameters (e.g. `REPORT_DELIVERY_WINDOW_START_IST`, `REPORT_DELIVERY_WINDOW_END_IST`) in production, while preserving instant delivery in development.

### Phase 2B.6: Full Integration and Regression Testing
1. **Un-mocked Database & Storage Verification:**
   - Run end-to-end integration tests with real PostgreSQL persistence and S3/R2 storage verification.
2. **Regression Assertions:**
   - Execute complete regression suites validating immutability, editorial compliance, dynamic transits, and Phase 2A timezone calculations.

---

## 6. Measurable Acceptance Criteria

Every deliverable must satisfy the following explicit acceptance criteria:

1. **Exact PDF Checksum Match:**
   - The SHA-256 checksum of bytes downloaded via `GET /api/v1/reports/:id/download-file` must identically match the checksum of the PDF stored in object storage.
2. **Zero Download-Time Recalculation:**
   - Invoking the download endpoint must execute **0** calls to `astrologyService.calculateChartForProfile`, `careerReportService.generateCareerReportData`, or `reportPdfService.generateReportPdf`.
3. **Missing Storage Asset Handling:**
   - If the storage asset is missing for a completed report, the download endpoint must return `404 Not Found` with code `REPORT_ASSET_NOT_FOUND` and log an operational alert. It must **never** regenerate the report.
4. **Production AI Fallback Guard:**
   - In `NODE_ENV === 'production'`, when `OPENROUTER_API_KEY` is missing or fails, the job must transition to `FAILED` with `errorCode: 'AI_PROVIDER_ERROR'`. No mock output can be marked `COMPLETED` in production.
5. **Zero Fabricated Calculation Defaults:**
   - In `pro-horoscope.generator.ts`, catch blocks must never inject hardcoded numerical values (`sthanaBala: 140.0`, `bhavadhipatiBala: 5.0`). Missing metrics must be flagged as unavailable.
6. **Complete Dosha Removal:**
   - Rendered PDFs and mobile screens must contain **0** occurrences of dosha classifications, dosha sections, Kaal Sarp labels, Sade Sati classifications, *Kumbha Vivaha*, *Nadi Shanti*, or dosha cancellation marketing.
7. **Neutral Manglik Status Availability:**
   - Manglik calculated status must remain available as a neutral indicator (`Present` / `Not Present`) with objective placement text and zero alarmist severity ratings.
8. **Gemstone Recommendations & Traditional Instructions Availability:**
   - Gemstone recommendations (Trikona lords), traditional wearing parameters (finger, metal, day/hora, untreated stone), and the methodology disclaimer must be present on Page 3 of the Kundli PDF, with zero ritual purification requirements (*Prana Pratishtha*).
9. **Unsupported SKU Protection:**
   - Requesting `GUPTA_NADI_DOSSIER` or `CHILDBIRTH_FAMILY` must return `400 Bad Request` with code `UNSUPPORTED_REPORT_TYPE`. Silent substitution with Kundli reports is strictly prohibited.
10. **Atomic Duplicate-Job Prevention:**
    - Concurrent requests for the same `(userId, birthProfileId, reportType)` must result in exactly **1** active database report record and worker job.
11. **Configurable IST Delivery Scheduling:**
    - In production, paid report delivery must be scheduled within the configured IST delivery window. In development, delivery must remain instant.
12. **Phase 2A Timezone Regression Safety:**
    - All Phase 2A DST boundary tests (`America/New_York` 2020-11-01 01:30:00 earlier vs later) must evaluate to Leo $3.85^\circ$ and Leo $15.67^\circ$ with 100% mathematical certainty.

---

## 7. Explicit Items That Must Remain Unchanged

In strict adherence to mandatory project rules, the following components must **NOT** be modified:
1. **The Core Astrology Calculation Engine:**
   - Formulas in `packages/astrology-engine/src/chart/chart-calculator.ts`.
   - Coordinate conversions, Lahiri ayanamsha algorithms, and house division algorithms.
   - Mathematical precision and deterministic outputs.
2. **Gemstone Recommendations Presence:**
   - Gemstones derived from the 1st, 5th, and 9th Trikona lords remain fully intact. Only prescriptive ritual purification language (*"Prana Pratishtha"*) is removed, and the omitted methodology disclaimer is restored to the PDF.
3. **Manglik Status Calculation:**
   - Mathematical detection of Mars placements in houses 1, 4, 7, 8, 12 remains 100% deterministic. Only the editorial presentation and severity labeling are neutralized.
4. **Phase 2A Timezone and UTC Persistence:**
   - Database schema fields (`dateOfBirth`, `timeOfBirth`, `timezone`, `disambiguation`, `utcDateTime`, `timezoneOffsetSeconds`).
   - Timezone solver sampling logic in `timezone.solver.ts`.
5. **Admin Panel Scope:**
   - Frozen as of Phase 12. No UI redesign or feature additions in `apps/admin`. Only the internal diagnostic mapper call in `admin.service.ts` is updated.

---

## 8. Conclusion & Stop Condition

This updated implementation plan incorporates all engineering review decisions. It eliminates runtime regeneration on download, enforces complete editorial dosha removal, guarantees production AI safety, establishes atomic concurrency protection, synchronizes career prompts and mappers, and hardens storage durability while strictly preserving the deterministic calculation engine and Phase 2A timekeeping integrity.

**Execution Boundary:**  
This plan is strictly **READ-ONLY**. No source code, database tables, migrations, configurations, or templates have been modified. Execution is halted awaiting human engineering review and approval before proceeding to Phase 2B implementation.
