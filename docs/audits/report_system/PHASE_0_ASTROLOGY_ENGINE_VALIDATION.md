# Astro Sushil: Phase 0 Astrology Engine Correctness & Validation

**Document Reference:** `docs/audits/report_system/PHASE_0_ASTROLOGY_ENGINE_VALIDATION.md`  
**Classification:** Ephemeris, Astronomical & Vedic Calculation Audit  
**Date of Audit:** November 3, 2026  
**Status:** Audit Completed; Critical Defects Identified  

---

## 1. Scope & Methodology

This audit evaluated the deterministic astrological calculation pipeline in `@astro/astrology-engine` independently of any AI services or PDF rendering layers.

Every formula, coordinate transformation, time normalization step, and astronomical calculation was audited against mathematical reference standards, and verified against a compiled standalone Swiss Ephemeris (`swetest` v2.10.03) binary using Moshier/Swiss analytical models with Lahiri Ayanamsha (`-sid1`).

---

## 2. Ephemeris Provider & Architectural Discrepancy

### 1. The Ephemeris Provider Mismatch
- **Documented Product Claim:** Technical documentation and user-facing reports assert:  
  *"Deterministic calculation verified under Swiss Ephemeris algorithms."*
- **Actual Runtime Implementation:**  
  The engine uses **`astronomy-engine` v2.1.19** (authored by Don Cross, MIT license), wrapped in `packages/astrology-engine/src/ephemeris/astronomy-engine.adapter.ts`.
- **Finding:** Swiss Ephemeris (`libswe`) is **not** present in the runtime dependencies. While `astronomy-engine` is an excellent, compact pure-JavaScript orbital calculation library, claiming "Swiss Ephemeris verification" without dynamic linking or independent Swiss validation is an audit discrepancy.

### 2. Geocentric vs. Topocentric Configuration
- `AstronomyEngineAdapter.getAllPlanetaryPositions`:
  - Uses `Astronomy.GeoVector(body, time, true)` for celestial bodies (geocentric coordinates with light-time correction).
  - Obliquity is computed via IAU 2000 approximations.
- In Vedic astrology, geocentric longitudes are standard, which matches the implementation.

---

## 3. Critical Defects in Astronomical & Time Calculations

### Defect 1: Critical 1-Hour Time Shift on Daylight Saving Transition Days (CRITICAL)
- **File:** `packages/astrology-engine/src/validation/birth-details.validator.ts`
- **Function:** `normalizeBirthTime` (lines 102–148)
- **Mechanism:**
  To convert local time to UTC, the function constructs a naive UTC Date:
  ```typescript
  const targetNaiveUtc = new Date(Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute, time.second));
  ```
  It then queries `Intl.DateTimeFormat` with `targetNaiveUtc` to determine the timezone offset.
- **The Failure Mode:**
  On the day of a Daylight Saving Time transition (e.g., US Spring Forward on March 8, 2020 at 02:00 local time):
  A birth at 03:30 local time in New York (`America/New_York`) is in Daylight Saving Time (UTC-4, so true UTC is 07:30:00Z).
  However, because `targetNaiveUtc` (03:30Z) is passed into the timezone formatter, the formatter checks the local time for 03:30 UTC (which is 22:30 EST on March 7—*before* the DST jump!).
  The formatter therefore returns standard offset (UTC-5) instead of daylight offset (UTC-4).
- **Audit Evidence & Mathematical Proof (Fixture F5):**
  - **Input:** 2020-03-08 03:30:00 `America/New_York`
  - **Astro Sushil Engine Calculated UTC:** `2020-03-08T08:30:00.000Z` (1 hour late!)
  - **True Correct UTC:** `2020-03-08T07:30:00.000Z`
  - **Calculated Ascendant (Astro Sushil):** `263.7766°` (Sagittarius 23° 46')
  - **True Ascendant (Swiss Ephemeris):** `248.6997°` (Sagittarius 08° 42')
  - **Error Magnitude:** **15.0769° (904.6 arcminutes)!**
  - An error of 15° shifts the Ascendant across half a zodiac sign, altering the entire house structure and misplacing planets into incorrect houses. Moon longitude is displaced by 0.6276° (37.6 arcmin), throwing Vimshottari Dasha calculations off by months.

### Defect 2: Truncated Linear Approximation of Lahiri Ayanamsha (HIGH)
- **File:** `packages/astrology-engine/src/chart/chart-calculator.ts`
- **Lines:** 40–42:
  ```typescript
  const yearsFromJ2000 = (normalizedTime.julianDayUT - 2451545.0) / 365.25;
  ayanamsaOffset = 23.85 + 0.01396 * yearsFromJ2000;
  ```
- **The Issue:**
  1. The true Lahiri Ayanamsha at epoch J2000.0 (JD 2451545.0, Jan 1, 2000 12:00 UT) is:
     $$\text{Ayanamsha}_{\text{Lahiri}} = 23^\circ 51' 25.53'' = 23.85709^\circ$$
     Astro Sushil truncates the base offset to `23.85°`, introducing an immediate baseline systematic error of $0.00709^\circ = 25.5 \text{ arcseconds}$.
  2. The annual precession rate in Lahiri is $50.27''/\text{year} = 0.01396388^\circ/\text{year}$. Truncating to `0.01396` drops $0.014''/\text{year}$.
  3. Nutation in longitude ($\Delta\psi$) is completely omitted. Nutation oscillates with a period of 18.6 years and an amplitude of up to $\pm 17.2 \text{ arcseconds}$.
- **Result:** Every planetary and ascendant calculation in the system carries a systematic error of 20–35 arcseconds compared to the true Chitra Paksha Lahiri standard.

### Defect 3: Simplified Mean Lunar Node Formula (MEDIUM)
- **File:** `packages/astrology-engine/src/ephemeris/astronomy-engine.adapter.ts`
- **Lines:** 168–180:
  Rahu is computed using a single polynomial expansion:
  ```typescript
  const meanNodeLongitude = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000;
  ```
  True Node (True Rahu) is not supported, and higher-order gravitational perturbations by Jupiter and the Sun on the Moon's orbital plane are not modeled. This creates differences of 0.4–0.5 arcminutes against standard ephemerides.

### Defect 4: Hardcoded Transits in Lightweight Report Generators (CRITICAL)
- **File 1:** `packages/report-engine/src/generators/kundli-report.generator.ts` (Line 216):
  ```typescript
  const transitSaturnLong = 345.0; // Pisces
  ```
  Saturn's transit position is hardcoded to 345.0° (Pisces 15°) for all users regardless of date of generation!
- **File 2:** `packages/report-engine/src/generators/planetary-report.generator.ts` (Lines 138–147):
  ```typescript
  const ephemerisSnapshot: Record<PlanetSymbol, number> = {
    [PlanetSymbol.SUN]: 204.0,   // Libra 24°
    [PlanetSymbol.MOON]: 82.5,   // Gemini 22.5°
    [PlanetSymbol.MARS]: 71.4,   // Gemini 11.4°
    [PlanetSymbol.MERCURY]: 215.1, // Scorpio 5.1°
    [PlanetSymbol.JUPITER]: 45.8,  // Taurus 15.8°
    [PlanetSymbol.VENUS]: 240.2, // Sagittarius 0.2°
    [PlanetSymbol.SATURN]: 345.2, // Pisces 15.2°
    [PlanetSymbol.RAHU]: 352.0,  // Pisces 22°
    [PlanetSymbol.KETU]: 172.0,  // Virgo 22°
  };
  ```
  This generator **physically hardcodes static planetary transit positions**! No ephemeris calculations are executed at all.
- **File 3:** `packages/report-engine/src/generators/pro-horoscope.generator.ts` & `matchmaking-report.generator.ts`:
  Hardcodes `julianDayUT: 2451545.0` (J2000 epoch) and `utcTimestampMs: Date.now()`, making calculations non-deterministic and bound to arbitrary epochs.

---

## 4. Evaluation of Subsystem Logic

### 1. House Systems
- **Implementation:** Whole Sign House System (Bhava = Sign).
- **Algorithm:** In `chart-calculator.ts` (lines 121–137), House 1 starts at $(R_{\text{Asc}} - 1) \times 30^\circ$ and spans exactly $30^\circ$. Each subsequent house corresponds to the next sequential zodiac sign.
- **Verification:** Evaluated as correct for classical Parashari Whole Sign conventions.

### 2. Nakshatra & Pada Division
- **Implementation:** `packages/astrology-engine/src/nakshatra/nakshatra.ts`
- **Span:** Each nakshatra occupies exactly $13^\circ 20' = 13.333333^\circ$.
- **Pada:** Each pada occupies exactly $3^\circ 20' = 3.333333^\circ$.
- **Nakshatra Lords:** Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury (repeated 3 times across 27 asterisms).
- **Verification:** Correctly mapped across all 27 signs and 108 padas.

### 3. Vimshottari Dasha Engine
- **Implementation:** `packages/astrology-engine/src/dasha/dasha-calculator.ts`
- **Algorithm:**
  - Evaluates balance of Mahadasha based on Moon's elapsed longitude inside its birth nakshatra:
    $$\text{Balance Fraction} = 1 - \frac{\lambda_{\text{Moon}} \pmod{13.333333^\circ}}{13.333333^\circ}$$
  - Full 120-year cycle sequenced correctly: Ketu (7y), Venus (20y), Sun (6y), Moon (10y), Mars (7y), Rahu (18y), Jupiter (16y), Saturn (19y), Mercury (17y).
- **Verification:** Balance periods and Antardasha proportional splits conform to classical Parashara formulas.

### 4. Ashtakavarga Matrix
- **Implementation:** `packages/astrology-engine/src/ashtakavarga/ashtakavarga-calculator.ts`
- **Algorithm:** Implements all 7 planetary BAV rules (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn from each other and Lagna).
- **Verification:** Grand total sum of Sarvashtakavarga (SAV) points equals exactly 337 bindus across all 12 signs, conforming to Brihat Parashara Hora Shastra standards.

### 5. Divisional Charts (Vargas)
- **Implementation:** `packages/astrology-engine/src/varga/varga-calculator.ts`
- **Supported Vargas:** D1, D2, D3, D4, D7, D9 (Navamsha), D10 (Dashamsha), D12, D16, D20, D24, D27, D30, D40, D45, D60.
- **Verification:** Correct mathematical modulo mappings for both cyclic (D9, D10) and odd/even (D2, D30) sign divisions.

---

## 5. Summary Scorecard: Deterministic Astrology Engine

| Subsystem | Theoretical Formulation | Runtime Correctness | Severity |
| :--- | :--- | :--- | :--- |
| **Local-to-UTC Timezone Conversion** | Standard IANA | **FAIL (1-hour shift on DST transitions)** | **CRITICAL** |
| **Ephemeris Computation** | Swiss Ephemeris | **MISMATCH (Uses astronomy-engine v2.1.19)** | **HIGH** |
| **Ayanamsha Calculation** | Chitra Paksha Lahiri | **APPROXIMATE (Truncated linear formula)** | **HIGH** |
| **Lunar Nodes (Rahu/Ketu)** | Mean Node | **SIMPLIFIED (Omits nutation & perturb.)** | **MEDIUM** |
| **Whole Sign Bhavas** | Parashari Whole Sign | **PASS (100% correct)** | **NONE** |
| **Nakshatras & Padas** | 27 Nakshatras / 108 Padas| **PASS (100% correct)** | **NONE** |
| **Vimshottari Dasha Engine** | 120-Year Parashara | **PASS (Correct balance and sub-periods)** | **NONE** |
| **Ashtakavarga Engine** | Classical 337 Bindus | **PASS (Sum = 337 across 12 houses)** | **NONE** |
| **Lightweight Report Transits** | Dynamic Ephemeris | **FAIL (Hardcoded static positions in code)**| **CRITICAL** |
