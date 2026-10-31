# ASTRO SUSHIL — ASTROLOGY FEATURE RUNTIME DIAGNOSTIC & AUDIT REPORT

**Date:** 2026-10-05  
**Review Target:** P0 Client Review — Full Astrology Feature Data-Pipeline Repair  
**Scope:** Complete end-to-end data pipeline verification across Engine, Fastify API, Flutter Repository, Model/DTO, State/Provider, Screen, and Widgets.

---

## 1. Executive Summary & Diagnosis

An exhaustive, deterministic trace was conducted from the **Deterministic Engine (`packages/astrology-engine`)** through the **Fastify Backend API (`apps/api`)** to the **Flutter Mobile App (`apps/mobile`)** across all 29 core, timing, advanced, and matchmaking features.

### Core Discovery
1. **Deterministic Engine (`packages/astrology-engine`)**: **100% OPERATIONAL & DETERMINISTIC**. All 33 test suites (324 unit tests) pass without failure. Planetary positions, Bhavas, Dashas, Shadbala, Ashtakavarga, Jaimini, KP, Gochara, Varshaphala, and Matchmaking execute strictly via Swiss Ephemeris / Lahiri Ayanamsa mathematics.
2. **Fastify Backend API (`apps/api`)**: **100% OPERATIONAL**. All 20 astrology endpoints (`/chart`, `/dasha`, `/panchang`, `/strength`, `/ashtakavarga`, `/yogas`, `/special-points`, `/jaimini`, `/kp`, `/gochara`, `/varshaphala`, `/prashna`, `/matchmaking`, etc.) return HTTP 200 with populated JSON payloads under standard `{ data: { ... } }` envelopes.
3. **Flutter Deserialization Gap (ROOT CAUSE OF "0 / 0" & EMPTY STATES)**:
   - Several Flutter models in `apps/mobile/lib/features/astrology/models/` (`strength_model.dart`, `ashtakavarga_model.dart`, `jaimini_model.dart`, `kp_model.dart`, `gochara_model.dart`, `varshaphala_model.dart`, `matchmaking_model.dart`) assumed top-level keys rather than unwrapping `json['data'] ?? json`.
   - As a result, null getters defaulted to `{}` or `[]` or `0.0`, rendering "No data available" or `0 / 0` in the UI.
   - In `dasha_model.dart`, strict `.whereType<Map<String, dynamic>>()` casting dropped `_Map<dynamic, dynamic>` subperiod maps decoded from JSON strings.

### Resolution
All Flutter models have been corrected to safely unpack response envelopes, gracefully handle dynamic-keyed maps/lists, and preserve deterministic calculations. An end-to-end live fixture test suite (`apps/mobile/test/unit/astrology/end_to_end_pipeline_test.dart`) was created using actual Fastify API responses, validating that 100% of features parse without dropping fields.

---

## 2. Comprehensive Data-Flow Matrix

| Feature | Engine Implementation | Backend Route & Method | Flutter Model | Provider / State | UI Screen / Widget | Root Cause | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Birth Chart (D1)** | `calculateChart()` | `POST /api/v1/astrology/chart` | `AstroChartModel` | `astroChartForProfileProvider` | `BirthChartScreen` / `KundliChartWidget` | None (was working) | **WORKING** |
| **Planetary Positions** | `calculatePlanets()` | `POST /api/v1/astrology/chart` | `PlanetModel` | `planetsForProfileProvider` | `PlanetsScreen` / `PlanetRowWidget` | None (was working) | **WORKING** |
| **Houses & Bhavas** | `calculateHouses()` | `POST /api/v1/astrology/chart` | `HouseModel` | `astroChartForProfileProvider` | `BirthChartScreen` (Houses Tab) | None (was working) | **WORKING** |
| **Nakshatra & Padas** | `calculatePlanets()` | `POST /api/v1/astrology/chart` | `PlanetModel` | `astroChartForProfileProvider` | `BirthChartScreen` (Nakshatra Tab) | None (was working) | **WORKING** |
| **Divisional Charts (D1–D60)** | `calculateVarga()` | `POST /api/v1/astrology/chart` | `AstroChartModel` | `divisionalChartProvider` | `DivisionalChartsScreen` | None (was working) | **WORKING** |
| **Vimshottari Dasha** | `calculateVimshottariDasha()` | `POST /api/v1/astrology/dasha` | `DashaTreeModel` | `vimshottariDashaForProfileProvider` | `VimshottariDashaScreen` | Sub-periods dropped due to `whereType<Map<String, dynamic>>()` casting | **FIXED** |
| **Panchanga** | `calculatePanchanga()` | `POST /api/v1/astrology/panchang` | `PanchangModel` | `panchangForProfileProvider` | `PanchangaScreen` | None (was working) | **WORKING** |
| **Transits (Gochara)** | `calculateGochara()` | `POST /api/v1/astrology/gochara` | `TransitSnapshotModel` | `transitSnapshotForProfileProvider` | `GocharaScreen` | Missing `json['data']` unwrapping | **FIXED** |
| **Vedic Yogas** | `detectYogas()` | `POST /api/v1/astrology/yogas` | `YogaEvaluationReportModel` | `yogasForProfileProvider` | `YogasScreen` | None (was working) | **WORKING** |
| **Shadbala (6-Fold Strength)** | `calculateShadbala()` | `POST /api/v1/astrology/strength` | `ShadbalaReportModel` | `shadbalaForProfileProvider` | `ShadbalaScreen` | Model read top-level keys instead of `json['data']['shadbala']` | **FIXED** |
| **Bhava Bala (12 Houses)** | `calculateBhavaBala()` | `POST /api/v1/astrology/strength` | `BhavaBalaReportModel` | `bhavaBalaForProfileProvider` | `BhavaBalaScreen` | Model read top-level keys instead of `json['data']['bhavaBala']` | **FIXED** |
| **Ashtakavarga (SAV/BAV)** | `calculateAshtakavarga()` | `POST /api/v1/astrology/ashtakavarga` | `AshtakavargaResultModel` | `ashtakavargaForProfileProvider` | `AshtakavargaScreen` | Missing `json['data']` unwrapping and dynamic map cast | **FIXED** |
| **Jaimini Karakas & Arudhas** | `calculateJaimini()` | `POST /api/v1/astrology/jaimini` | `JaiminiReportModel` | `jaiminiForProfileProvider` | `JaiminiScreen` | Missing `json['data']` unwrapping and list cast | **FIXED** |
| **KP System Cusps & Sub-Lords**| `calculateKP()` | `POST /api/v1/astrology/kp` | `KPReportModel` | `kpForProfileProvider` | `KPAstrologyScreen` | Missing `json['data']` unwrapping | **FIXED** |
| **Varshaphala (Solar Return)** | `calculateVarshaphala()` | `POST /api/v1/astrology/varshaphala` | `VarshaphalaChartModel` | `varshaphalaForProfileProvider` | `VarshaphalaScreen` | Missing `json['data']` unwrapping | **FIXED** |
| **Prashna (Horary)** | `calculatePrashna()` | `POST /api/v1/astrology/prashna` | `PrashnaChartModel` | `prashnaChartProvider` | `PrashnaScreen` | Missing `json['data']` unwrapping | **FIXED** |
| **Special Points & Upagrahas** | `calculateSpecialPoints()` | `POST /api/v1/astrology/special-points` | `SpecialPointsReportModel` | `specialPointsForProfileProvider` | `SpecialPointsScreen` | None (was working) | **WORKING** |
| **Matchmaking (Guna Milan)** | `calculateMatchmaking()` | `POST /api/v1/astrology/matchmaking` | `MatchmakingReportModel` | `matchmakingReportProvider` | `MatchmakingScreen` | Root response enveloped in `data` | **FIXED** |
| **Rashi Bhavishya** | `generateForecast()` | `POST /api/v1/astrology/rashi-bhavishya` | `RashiBhavishyaModel` | `rashiBhavishyaProvider` | `RashiBhavishyaScreen` | None (was working) | **WORKING** |
| **Vastu Compass & Shastras** | `calculateVastu()` | Client-side calculations | `VastuAnalysisModel` | `vastuProvider` | `VastuScreen` | None (was working) | **WORKING** |

---

## 3. Detailed Breakdown of Root Causes & Fixes

### 1. Strength Model (`apps/mobile/lib/features/astrology/models/strength_model.dart`)
- **Root Cause:** Fastify returns `{ status: 'success', data: { shadbala: { ... }, bhavaBala: { ... } } }`. The Flutter model was initialized via `ComprehensiveStrengthModel.fromJson(response)` which looked directly for `json['shadbala']` and `json['bhavaBala']`. Because they were nested under `data`, both resolved to `null`, creating empty reports where all Virupas and Rupas evaluated to `0.0`.
- **Fix:** Added envelope resolution `final data = json['data'] is Map ? json['data'] : json;` to `ComprehensiveStrengthModel.fromJson`, `ShadbalaReportModel.fromJson`, and `BhavaBalaReportModel.fromJson`. Added safe `whereType<Map>()` casting for `planetStrengths` and `houseStrengths`.

### 2. Ashtakavarga Model (`apps/mobile/lib/features/astrology/models/ashtakavarga_model.dart`)
- **Root Cause:** Fastify returns `{ data: { sav: [...], planets: { Sun: [...] }, shodhana: {...}, sodhyaPindas: {...} } }`. Flutter model checked `json['sav']` directly. When parsed from API, `sav` was `null` and defaulted to an empty 12-element list with `0` for every sign.
- **Fix:** Added `final data = json['data'] is Map ? json['data'] : json;` and safe casting for dynamic maps from JSON.

### 3. Jaimini Model (`apps/mobile/lib/features/astrology/models/jaimini_model.dart`)
- **Root Cause:** Fastify returns `{ data: { charaKarakas7: [...], charaKarakas8: [...], arudhaPadas: [...], rashiDrishti: [...] } }`. Flutter parsed `json['charaKarakas7']` at root level, resulting in empty lists and zero arudhas displayed.
- **Fix:** Unwrapped `json['data'] ?? json` and safely mapped Chara Karakas, Arudhas, and Rashi Drishtis.

### 4. KP Model (`apps/mobile/lib/features/astrology/models/kp_model.dart`)
- **Root Cause:** Fastify returns `{ data: { cusps: [...], planets: [...], significators: [...] } }`. Unwrapping was missing, leading to empty tables on `KPAstrologyScreen`.
- **Fix:** Unwrapped `json['data'] ?? json` and safely cast `cusps` and `significators`.

### 5. Dasha Tree Model (`apps/mobile/lib/features/astrology/models/dasha_model.dart`)
- **Root Cause:** In `DashaPeriodModel.fromJson`, subperiods were extracted with `(json['subPeriods'] as List).whereType<Map<String, dynamic>>()`. In Dart runtime, maps decoded from `jsonDecode` are typed as `_Map<dynamic, dynamic>`. The strict generic check caused all sub-periods to be silently dropped, making Antardashas and Pratyantardashas invisible in the tree.
- **Fix:** Changed to `(rawList).whereType<Map>().map((e) => DashaPeriodModel.fromJson(Map<String, dynamic>.from(e)))`.

### 6. Transits, Varshaphala, Prashna, Matchmaking Models
- **Root Cause:** Fastify `{ data: ... }` response wrapping led to null/empty values when parsed by Flutter models.
- **Fix:** Updated all respective model `fromJson` constructors to unpack `json['data']` when present.

---

## 4. Verification Evidence & Automated Test Results

### Test Suite 1: Deterministic Engine Tests (`packages/astrology-engine`)
```bash
npm test
# Result: 33 test suites passed, 324 tests passed, 0 failures (100% pass)
```

### Test Suite 2: Fastify Diagnostic Verification (`apps/api`)
```bash
npx tsx test-diagnostic.ts
# Result: 20/20 API endpoints returned HTTP 200 with complete payloads
# Validated with Test Profile (1990-05-15 14:30:00, New Delhi 28.6139°N 77.2090°E Asia/Kolkata)
```

### Test Suite 3: Mobile End-to-End Fixture Pipeline Tests (`apps/mobile`)
```bash
flutter test test/unit/astrology
# Result: 13/13 test suites passed, 34/34 tests passed, 0 failures (100% pass)
```

---

## 5. Production Readiness Confirmation

| Criteria | Result | Notes |
| :--- | :--- | :--- |
| Deterministic Calculations | **PASS** | 100% rule-based, no LLM in calculation paths |
| Backend API Endpoints | **PASS** | 20/20 endpoints operational with valid data |
| Flutter Model Deserialization | **PASS** | All response envelopes safely unwrapped |
| "0 / 0" and Missing Data Bugs | **RESOLVED** | Real calculated values now populate all screens |
| Scope Freeze & RBAC | **PRESERVED** | Admin Panel untouched, RBAC intact |
