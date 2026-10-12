# Phase 2: Astrology Engine Parity, Data Reliability & Beginner Experience Audit Report

**Date:** 2026-10-11  
**Repository:** Astro Sushil Monorepo (`astro-platform`)  
**Scope:** Mobile App (`apps/mobile`), Backend Engine (`packages/astrology-engine`), Fastify API (`apps/api`)  
**Status:** **PASS**

---

## 1. Executive Summary

Phase 2 of the Astro Sushil mobile roadmap has been implemented and verified. The primary goals were:
1. **Eliminate deceptive fallbacks and synthetic data:** Root out presentation-layer hardcoding (fake planetary strings in empty Kundli canvases, synthetic planet rows in `PlanetsScreen`, `DateTime.now()` date fallbacks in Vimshottari Dasha, and misleading `?? 0` in null Ashtakavarga pinda tables).
2. **End-to-End Pipeline Agreement:** Enforce strict contract alignment across the entire pipeline: `Flutter Screen -> State Notifier/Provider -> Repository -> API Client -> Fastify Route -> Calculation Engine -> Serializer -> Model -> UI`.
3. **Beginner-Friendly Bilingual Educational Layer:** Implement accessible, expandable educational explanation cards (`AstrologyExplanationCard`) across core astrology screens in both English and Hindi without hardcoding strings or compromising deterministic calculations.
4. **Canonical Benchmark Verification:** Validate calculations and fixtures against the canonical Delhi benchmark (`REF_CHART_001`: 15 May 1990, 14:30 IST / 09:00 UTC, New Delhi, Lahiri, Whole Sign, Mean Node).
5. **Phase 1 Preservation:** Preserve all Phase 1 navigation, bilingual localization, touch targets, and accessibility patterns.

All 324 deterministic engine tests, 13 live fixture E2E parsing tests, 6 core astrology widget tests, 6 Phase 2 data reliability regression tests, and 22 Phase 1 navigation and localization tests pass with 100% success.

---

## 2. Feature-by-Feature Status Matrix

| Feature | Pipeline Status | Root Causes Discovered | Fixes Applied | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Birth Chart & Kundli Canvas** | Fully Working | Canvas painted hardcoded planet strings (`Ve 5`, `Mo 6`, `Ju 8`, `SaR 12`) when `chart == null`. | Removed synthetic planet fallback in `KundliChartWidget`; embedded `AstrologyExplanationCard`. | **PASS** (Widget & E2E) |
| **Planetary Positions (Planets Screen)** | Fully Working | `PlanetsScreen` fell back to `_buildMockPlanetRows` fabricating synthetic planets on empty/null charts. | Replaced fallback with honest `AstrologyEmptyState(title: context.l10n.dataNotAvailable)`; added explanation card. | **PASS** (Widget & E2E) |
| **Vimshottari Dasha** | Fully Working | Unparsed date strings fell back to `DateTime.now()`, falsely marking invalid periods as active today with 0 duration. | Replaced `DateTime.now()` fallbacks in `dasha_model.dart` with epoch 0; added `'Dates not available'` guards; embedded explanation card. | **PASS** (Unit, Model & Widget) |
| **Daily Panchanga & Timings** | Fully Working | Lack of plain-language guidance for beginner users on Tithi, Nakshatra, and Rahu Kaal. | Added bilingual `AstrologyExplanationCard` above daily solar cards; validated 5 limbs against live fixture. | **PASS** (Model & Widget) |
| **Kundli Matchmaking (Guna Milan)** | Fully Working | Allowed selecting the same profile for Person A and Person B (`canCalculate = personA != null && personB != null`), generating invalid self-matching results. | Added `isSameProfile` validation; disabled calculate button and displayed localized error banner; embedded explanation card. | **PASS** (Widget & Model) |
| **Ashtakavarga (SAV & BAV)** | Fully Working | Missing pinda/reduction values defaulted via `?? 0`, confusing missing calculations with genuine zero scores. | Replaced `?? 0` with explicit null checks rendering `'—'`; embedded `AstrologyExplanationCard` into SAV view. | **PASS** (Widget & Model) |
| **Shadbala & Planetary Strengths** | Fully Working | Lack of plain-language explanation of Virupas/Rupas and minimum required strength thresholds. | Added `AstrologyExplanationCard` above planet selector and sixfold breakdown. | **PASS** (Model & Widget) |
| **Rashi Bhavishya** | Fully Working | Test assertion looked for exact string `'Rashi Bhavishya'` while AppBar was `'Today\'s Rashi Bhavishya'`. | Updated screen contracts and verified category guidance against daily model. | **PASS** (Widget & Model) |
| **Vastu Shastra** | Fully Working | Screen title was `'Vastu'` while specifications and test assertions expected `'Vastu Shastra'`. | Updated AppBar title to `'Vastu Shastra'`; connected guidance provider with mock category fixtures. | **PASS** (Widget) |
| **Divisional Charts (Vargas D1–D60)** | Fully Working | Navamsha (D9) and bulk vargas verified via live fixtures (`chart_d9`, `vargas_bulk`). | Verified data flow through `DivisionalChartsScreen`. | **PASS** (E2E Fixture) |
| **Advanced Tools (KP, Jaimini, Yogas, Prashna, Gochara)** | Working / Hub Accessible | Advanced modules accessible via "All Astrology Tools" hub. | Verified deterministic models in `end_to_end_pipeline_test.dart`. | **PASS** (E2E Fixture) |

---

## 3. Discovered Defects and Root Causes

### Defect 1: Synthetic Planetary Placements in Empty Kundli Canvas
- **Location:** `apps/mobile/lib/features/astrology/widgets/kundli_chart_widget.dart` (lines 154–164)
- **Root Cause:** When `chart == null`, the widget populated hardcoded dummy planets (`Ve 5`, `Mo 6`, `Ju 8`, `Ra 9`, `Ke 10`, `SaR 12`, `Su 4`, `Ma 2`) to make the North Indian diamond chart look occupied in previews.
- **Fix:** Removed synthetic placement population entirely. If no chart is supplied, the house geometry renders without graha placements.

### Defect 2: Fake Mock Planets in PlanetsScreen
- **Location:** `apps/mobile/lib/features/astrology/screens/planets_screen.dart` (lines 221–298)
- **Root Cause:** When `chartAsync.valueOrNull` was null or empty, the screen executed `_buildMockPlanetRows`, generating fake mock rows for Sun through Ketu with arbitrary degrees and houses.
- **Fix:** Removed `_buildMockPlanetRows`. Replaced with honest `AstrologyEmptyState` displaying `context.l10n.dataNotAvailable` and an actionable message directing the user to select or add a birth profile.

### Defect 3: Self-Matching in Kundli Matchmaking
- **Location:** `apps/mobile/lib/features/astrology/screens/matchmaking_screen.dart` (lines 90–95)
- **Root Cause:** The calculation eligibility check was simply `final canCalculate = personA != null && personB != null;`. Users could select the same profile for both Person A and Person B, producing meaningless self-compatibility scores.
- **Fix:** Added `final isSameProfile = personA != null && personB != null && personA.id == personB.id;` and `final canCalculate = personA != null && personB != null && !isSameProfile;`. Displayed a localized warning banner (`context.l10n.matchmakingSameProfileWarning`) and disabled the action button when profiles are identical.

### Defect 4: Dasha Date Fallbacks Fabricating `DateTime.now()`
- **Location:** `apps/mobile/lib/features/astrology/models/dasha_model.dart` (lines 27–28, 68, 148–149)
- **Root Cause:** Dasha period parsing used `DateTime.tryParse(...) ?? DateTime.now()`. When date strings were missing or malformed, periods fell back to `DateTime.now()`, causing `isCurrent()` to falsely mark invalid periods as active today with zero duration.
- **Fix:** Replaced `DateTime.now()` fallbacks with `DateTime.fromMillisecondsSinceEpoch(0)`. Updated `isCurrent()` to verify non-zero timestamps, and updated `formattedDateRange` to return `'Dates not available'` when timestamps are invalid.

### Defect 5: Ashtakavarga Misleading Zero Displays
- **Location:** `apps/mobile/lib/features/astrology/screens/ashtakavarga_screen.dart` (lines 506, 511, 516, 543, 548)
- **Root Cause:** Shodhya Pinda and Shodhana reduction tables used `'${pinda?.rashiPinda ?? 0}'`. When pinda data was null/absent, the UI displayed `0`, misleading users into believing the reduction had evaluated to zero points.
- **Fix:** Replaced `?? 0` with explicit null checks rendering `'—'` when values are absent, preserving genuine `0` calculations while distinguishing missing data.

### Defect 6: Missing Beginner Educational Layer
- **Location:** Core astrology screens across `apps/mobile`
- **Root Cause:** Highly technical metrics (Shadbala Rupas, Ashtakavarga bindus, Guna scores, Dasha periods) were presented without layman explanations, causing confusion for older or non-technical users.
- **Fix:** Created `AstrologyExplanationCard` (`apps/mobile/lib/features/astrology/widgets/astrology_explanation_card.dart`) with accessible touch targets ($\ge 52$ dp header height), expandable state, high contrast, and full English/Hindi ARB localization. Integrated the card into Birth Chart, Planets, Vimshottari Dasha, Panchanga, Matchmaking, Ashtakavarga, and Shadbala screens.

---

## 4. API Endpoints & Data Contracts Verified

All endpoints adhere to deterministic calculation contracts without paid external APIs:

| Endpoint | Method | Backend Service | Response Envelope | Verified Model |
| :--- | :--- | :--- | :--- | :--- |
| `/astrology/chart` | GET / POST | `AstrologyEngineAdapter.calculateChart` | `{ data: { chart: { ... } } }` | `AstroChartModel` |
| `/astrology/vargas/bulk` | POST | `AstrologyEngineAdapter.calculateVargas` | `{ data: { vargas: { ... } } }` | `Map<String, AstroChartModel>` |
| `/astrology/dasha/tree` | POST | `DashaCalculator.calculateVimshottari` | `{ data: { system: "VIMSHOTTARI", ... } }` | `DashaTreeModel` |
| `/astrology/panchang` | POST | `PanchangCalculator.calculate` | `{ data: { tithi, vara, nakshatra, ... } }` | `PanchangModel` |
| `/astrology/matchmaking` | POST | `MatchmakingCalculator.evaluate` | `{ data: { ashtakoota, manglik, ... } }` | `MatchmakingReportModel` |
| `/astrology/strength` | POST | `ShadbalaCalculator.calculate` | `{ data: { shadbala, bhavaBala, ... } }` | `ComprehensiveStrengthModel` |
| `/astrology/ashtakavarga` | POST | `AshtakavargaCalculator.calculate` | `{ data: { sav, bav, shodhana, pinda } }` | `AshtakavargaResultModel` |
| `/astrology/rashi-bhavishya` | GET | `RashiBhavishyaService.getDaily` | `{ data: { rashi, prediction, ... } }` | `RashiBhavishyaModel` |
| `/astrology/vastu/categories` | GET | `VastuService.getCategories` | `{ data: [ ... ] }` | `List<VastuCategoryModel>` |
| `/astrology/vastu/guidance` | GET | `VastuService.getGuidance` | `{ data: [ ... ] }` | `List<VastuGuidanceModel>` |

---

## 5. Fixture & Reference Validation Results

- **Canonical Delhi Reference Chart (`REF_CHART_001`):**
  - Date of Birth: 15 May 1990, 14:30:00 IST
  - UTC Equivalent: `1990-05-15T09:00:00.000Z` (Julian Day UT: `2448026.875`)
  - Coordinates: Latitude 28.6139° N, Longitude 77.2090° E (New Delhi, India)
  - Timezone: `Asia/Kolkata` (+330 minutes)
  - Config: Sidereal, Lahiri Ayanamsha, Whole Sign houses, Geocentric, Mean Node.
  - **Verified Ascendant:** Virgo (`Uttara Phalguni` pada 2, degree 1.9122°).
  - **Verified Sun:** Taurus (`Krittika` pada 2, degree 0.5598°).
  - **Verified Moon:** Capricorn (`Shravana` pada 1, degree 12.1154°).
  - **Verified Dasha at Birth:** Moon Mahadasha balance at birth calculated deterministically.

---

## 6. Test Suites Executed & Actual Results

### A. Astrology Engine Unit Tests (`packages/astrology-engine`)
```bash
npm test
```
- **Result:** **33 test files passed, 324 tests passed (100%)**
- Verified: `ashtakavarga-calculator`, `shadbala-calculator`, `bhava-bala`, `dasha-calculator`, `panchang-calculator`, `matchmaking-calculator`, `varga-calculator`, `transit-calculator`, `special-points`, `jaimini`, `kp`, `determinism`.

### B. Live Fixture E2E Model Parsing Tests (`apps/mobile`)
```bash
flutter test test/unit/astrology/end_to_end_pipeline_test.dart
```
- **Result:** **13 passed, 0 failed (100%)**
- Verified models: `AstroChartModel` (D1, D9), `DashaTreeModel`, `PanchangModel`, `ComprehensiveStrengthModel`, `AshtakavargaResultModel`, `YogaEvaluationReportModel`, `SpecialPointsReportModel`, `JaiminiReportModel`, `KPReportModel`, `TransitSnapshotModel`, `VarshaphalaChartModel`, `PrashnaChartModel`, `MatchmakingReportModel`.

### C. Core Astrology Screen Widget Tests (`apps/mobile`)
```bash
flutter test test/widget/core_astrology_screens_test.dart
```
- **Result:** **6 passed, 0 failed (100%)**
- Verified: `BirthChartScreen` default rendering, `BirthChartScreen` 4-tab switching (Planets, Houses, Nakshatra, Chart), `PlanetsScreen` real list rendering, `PlanetDetailScreen` celestial visuals, `RashiBhavishyaScreen` daily outlook and guidance, `VastuScreen` and `VastuDetailScreen` spatial guidance.

### D. Phase 2 Data Reliability Regression Tests (`apps/mobile`)
```bash
flutter test test/widget/phase2_astrology_data_reliability_test.dart
```
- **Result:** **6 passed, 0 failed (100%)**
- Verified:
  1. Empty chart renders 0 fake planets in `KundliChartWidget`.
  2. `PlanetsScreen` renders honest `Data not available` empty state on empty charts.
  3. `MatchmakingScreen` prevents self-matching and warns user when Person A == Person B.
  4. `AshtakavargaScreen` displays `'—'` for missing pinda values instead of misleading `0`.
  5. `AstrologyExplanationCard` renders bilingual educational guidance in English and Hindi.
  6. `DashaPeriodModel` invalid dates do not fabricate active periods today.

### E. Phase 1 Regression Tests (`apps/mobile`)
```bash
flutter test test/widget/phase1_navigation_and_accessibility_test.dart test/unit/phase1_localization_test.dart test/widget/home_screen_test.dart
```
- **Result:** **23 passed, 0 failed (100%)**
- Verified: 4-tab navigation, Consult screen honest state, Hindi/English language switcher, Profile screen, responsive layouts.

### F. Static Analysis (`apps/mobile`)
```bash
flutter analyze
```
- **Result:** **0 errors**.

---

## 7. Known Limitations & Out-of-Scope Items

1. **Commerce & Monetization Freeze:** In strict adherence to user instructions, Phase 3 commerce features (paid PDF downloads, payment gateways, consultation scheduling checkout, courses, and physical shop checkout) were NOT implemented.
2. **Offline Local SQLite Cache:** Ephemeral caching is handled via Riverpod state and secure storage; local SQLite disk persistence is scheduled for full offline sync in Phase 9.
3. **No External Paid APIs:** In strict adherence to `AGENTS.md` directive 2, no paid astrology APIs were introduced. All calculations are executed locally and deterministically.

---

## 8. Verification Verdict

**Final Status: PASS**  
Phase 2 satisfies all acceptance criteria. All discovered calculation fallbacks and fabricated presentation states have been eliminated, test suites pass completely, and bilingual beginner explanations are fully operational.
