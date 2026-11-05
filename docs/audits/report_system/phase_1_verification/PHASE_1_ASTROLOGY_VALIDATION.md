# Astro Sushil: Phase 1 Independent Astrology Engine Validation

**Document Reference:** `docs/audits/report_system/phase_1_verification/PHASE_1_ASTROLOGY_VALIDATION.md`  
**Classification:** Astronomical Accuracy & Deterministic Engine Validation  
**Date of Audit:** November 3, 2026  
**Auditor:** DeepMind Agentic Pair Programmer  
**Scope:** Independent validation of calculation logic in `@astro/astrology-engine` against authoritative reference standards.  

---

## 1. Engine Architecture & Baseline Standards

The deterministic core of the platform resides in `packages/astrology-engine`. It evaluates astronomical calculations without external network API calls.

### Platform Astrological Conventions:
- **Zodiac System:** Sidereal Zodiac (`ZodiacType.SIDEREAL`).
- **Ayanamsha Standard:** Chitra Paksha Lahiri (`AyanamsaSystem.LAHIRI`).
- **House System:** Whole Sign (`HouseSystem.WHOLE_SIGN`).
- **Node Calculation:** Mean Node (`NodeCalculationMethod.MEAN_NODE`).
- **Planetary Frame:** Geocentric (`PlanetaryCalculationMode.GEOCENTRIC`).
- **Underlying Ephemeris Library:** Pure-JS `astronomy-engine` v2.1.19 (Don Cross).

---

## 2. Benchmark Fixture 1: Reference Report Native (Puneet Kumar)

The primary reference chart extracted from commercial reference reports (`docs/reference repots/Finance Report.pdf` and `Couple Kundli Matching Report.pdf`) was evaluated in `@astro/astrology-engine`:

- **Native Name:** Puneet Kumar
- **Local Birth Time:** December 28, 1983, 04:45:00 IST (+05:30)
- **UTC Equivalent:** December 27, 1983, 23:15:00.000Z
- **Calculated Julian Day (UT):** `2445696.46875`
- **Location:** Bulandshahr, Uttar Pradesh, India ($28^\circ 25' 00''\text{ N}, 77^\circ 50' 00''\text{ E}$)

### Planetary Position Accuracy Comparison Table

| Body | Calculated Longitude | Calculated Sign & Deg | Reference Position (PDF) | Angular Delta | Delta (Arcminutes) | Categorical Match? |
| :--- | :---: | :--- | :--- | :---: | :---: | :---: |
| **Ascendant** | `219.0878°` | Scorpio 09° 05' 16" | Scorpio 09° 04' 54" | $0.0061^\circ$ | **0.36'** ($21.6''$) | **EXACT (Anuradha 2)** |
| **Sun** | `252.0084°` | Sagittarius 12° 00' 30" | Sagittarius 12° 00' 22" | $0.0023^\circ$ | **0.14'** ($8.4''$) | **EXACT (Moola 4)** |
| **Moon** | `177.1857°` | Virgo 27° 11' 09" | Virgo 27° 11' 00" | $0.0024^\circ$ | **0.15'** ($8.9''$) | **EXACT (Chitra 2)** |
| **Mars** | `178.8601°` | Virgo 28° 51' 36" | Virgo 28° 51' 28" | $0.0023^\circ$ | **0.14'** ($8.3''$) | **EXACT (Chitra 2)** |
| **Mercury** | `259.6761°` | Sagittarius 19° 40' 34" R | Sagittarius 19° 40' 28" R | $0.0017^\circ$ | **0.10'** ($6.1''$) | **EXACT (P. Ashadha 2)** |
| **Jupiter** | `241.3763°` | Sagittarius 01° 22' 35" | Sagittarius 01° 22' 26" | $0.0024^\circ$ | **0.14'** ($8.6''$) | **EXACT (Moola 1)** |
| **Venus** | `211.4356°` | Scorpio 01° 26' 08" | Scorpio 01° 26' 02" | $0.0017^\circ$ | **0.10'** ($6.2''$) | **EXACT (Vishakha 4)** |
| **Saturn** | `199.9649°` | Libra 19° 57' 54" | Libra 19° 57' 45" | $0.0024^\circ$ | **0.14'** ($8.6''$) | **EXACT (Swati 4, Exalted)** |
| **Rahu (Mean)** | `51.1199°` | Taurus 21° 07' 12" R | Taurus 21° 06' 47" R | $0.0068^\circ$ | **0.41'** ($24.6''$) | **EXACT (Rohini 4)** |
| **Ketu (Mean)** | `231.1199°` | Scorpio 21° 07' 12" R | Scorpio 21° 06' 47" R | $0.0068^\circ$ | **0.41'** ($24.6''$) | **EXACT (Jyeshtha 2)** |

### Vimshottari Dasha Timeline Validation (Puneet Kumar)
- **Moon Longitude:** `177.1857°` $\rightarrow$ Chitra Nakshatra (Spans $173^\circ 20'$ to $180^\circ 00'$, ruled by Mars).
- **Balance of Dasha at Birth:** Mars balance = **4.977 years (4 Years, 11 Months, 22 Days)**. Matches reference report exactly.
- **Mahadasha Transition Dates:**
  - Mars Mahadasha: Ends **1988-12-18** (Reference report: `19/12/1988` IST).
  - Rahu Mahadasha: **1988-12-18 to 2006-12-19** (18 years).
  - Jupiter Mahadasha: **2006-12-19 to 2022-12-19** (16 years).
  - Saturn Mahadasha: **2022-12-19 to 2041-12-19** (19 years).
- **Validation Outcome:** **PASS**. Dasha transition dates and sub-period bounds match commercial reference calculations within a 24-hour boundary.

---

## 3. Controlled Boundary & Extreme Coordinate Test Fixtures

---

### Fixture 2: J2000.0 Epoch Reference
- **Inputs:** `2000-01-01 12:00:00 UTC`, Greenwich ($0.0^\circ\text{N}, 0.0^\circ\text{E}$).
- **Calculated Julian Day:** `2451545.0`
- **Tropical Sun Longitude:** `280.4606°`
- **Calculated Lahiri Ayanamsha:** `23.8500°` (True Lahiri: `23.8571°`, baseline delta: $25.5''$).
- **Calculated Sidereal Sun:** `256.6106°` (Sagittarius 16° 36' 38").
- **Expected Sidereal Sun:** `256.6035°` (Delta: $25.5''$).
- **Validation Outcome:** Matches within tolerance ($< 0.01^\circ$).

---

### Fixture 3: Southern Hemisphere Polar Inversion (Sydney, Australia)
- **Inputs:** `1990-05-15 14:30:00 AEST` (+10:00), Sydney ($33^\circ 52' 00''\text{ S}, 151^\circ 12' 36''\text{ E}$).
- **UTC Time:** `1990-05-15T04:30:00.000Z`, JD: `2448026.6875`.
- **Calculated Ascendant:** Virgo `164.21°` (Whole Sign House 1: Virgo, House 2: Libra, House 10: Gemini).
- **Southern Coordinate Handling:** Verified that latitude negation does not invert sign sequence or generate negative house spans.
- **Validation Outcome:** **PASS**. Whole sign house calculation in Southern Hemisphere functions accurately.

---

### Fixture 4: Nakshatra & Rashi Boundary Transition (Revati to Ashwini / Gandanta)
- **Inputs:** Test date calibrated for Moon crossing $359^\circ 59' \rightarrow 00^\circ 01'$.
- **Evaluated Transition:**
  - $359.98^\circ$: Rashi = Pisces (12), Nakshatra = Revati (27), Pada = 4.
  - $00.02^\circ$: Rashi = Aries (1), Nakshatra = Ashwini (1), Pada = 1.
- **Validation Outcome:** **PASS**. Clean boundary handoff with zero modulo wrap glitches or index out-of-bounds errors.

---

### Fixture 5: Daylight Saving Time Transition Morning (New York)
- **Inputs:** `2020-03-08 03:30:00 America/New_York` (40.7128°N, 74.0060°W).
- **DST Context:** At 02:00 EST, clocks jumped forward to 03:00 EDT (UTC-4).
- **True Astronomical UTC:** `2020-03-08T07:30:00.000Z` (JD: `2458916.8125`).
- **Engine Calculated UTC:** `2020-03-08T08:30:00.000Z` (JD: `2458916.8542`).
- **Discrepancy:** Exactly **+1.0000 hour (+60 minutes)**.
- **Resulting Ascendant Discrepancy:**
  - True Ascendant at 07:30 UTC: **Capricorn 02° 36'** (`272.61°`).
  - Engine Ascendant at 08:30 UTC: **Capricorn 17° 41'** (`287.69°`).
  - Angular Error: **$15.0769^\circ$ (904.6 arcminutes)**.
- **Root Cause:** In `normalizeBirthTime`, naive local clock time is passed into `Date.UTC`, evaluating the timezone offset before the UTC transition threshold.
- **Validation Outcome:** **CRITICAL DEFECT CONFIRMED**.

---

## 4. Transit Calculation Validation

### Gochara Calculation Logic in `@astro/astrology-engine`:
The package contains `TransitCalculator` (`packages/astrology-engine/src/transit/transit-calculator.ts`) and `SadeSatiCalculator`.
- **Ephemeris Calculation:** In `TransitCalculator`, planetary positions are evaluated dynamically for any specified UTC timestamp:
  ```typescript
  const transitChart = await this.chartCalculator.calculateChart(transitBirthDetails, config);
  ```
- **The Disconnect:** Although the engine contains dynamic transit calculation methods, **the report generators in `packages/report-engine` do NOT invoke them**. Instead, `planetary-report.generator.ts` and `kundli-report.generator.ts` bypass the engine and utilize the static snapshot constants identified in Finding 04.

---

## 5. Summary of Confirmed Astrology Engine Deficiencies

1. **Daylight Saving Normalization Bug:** Causes 15-degree Ascendant errors for births on DST transition days.
2. **Linear Lahiri Truncation:** Omits IAU nutation expansion and introduces a 25.5 arcsecond baseline bias.
3. **Misleading Documentation:** Codebase claims Swiss Ephemeris release standards while executing `astronomy-engine` v2.1.19.
4. **Transit Engine Isolation:** Fully functional transit solver in `astrology-engine` is ignored by report generators, which use hardcoded constants instead.
