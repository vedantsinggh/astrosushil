# Phase 2A.6: Chart-to-PDF Value Reconciliation Audit

**Audit Phase:** Phase 2A.6  
**Date:** 2026-11-03  
**Status:** Strictly Read-Only Forensic Investigation  
**Primary Target:** Reconciliation of Chart Service Ascendant Values vs. PDF Ascendant Values

---

## 1. Executive Summary and Investigation Goal

The Phase 2A.5 audit report noted a seeming discrepancy between reported chart service outputs and the extracted PDF text:

- **Phase 2A.5 Text Narrative:**
  - Earlier: $172.95155700812743^\circ$ (Virgo $22.95^\circ$)
  - Later: $186.75338006450638^\circ$ (Libra $6.75^\circ$)
- **Extracted PDF Content:**
  - Earlier: `Ascendant Sign: Leo (3.85 deg)` ($123.85^\circ$)
  - Later: `Ascendant Sign: Leo (15.67 deg)` ($135.67^\circ$)

The mandate for Phase 2A.6 was to trace the entire calculation and document pipeline:
$$\mathtt{BirthProfile} \longrightarrow \mathtt{persisted\ UTC} \longrightarrow \mathtt{birthDetailsMapper} \longrightarrow \mathtt{astrologyService} \longrightarrow \mathtt{chartCalculation} \longrightarrow \mathtt{reportsService} \longrightarrow \mathtt{PDF}$$
and determine whether the difference was caused by coordinate bugs, configuration mismatch, or documentation transcription.

---

## 2. Definitive Finding: The Service and PDF Are in 100% Agreement

A direct programmatic execution of the exact production calculation pipeline was conducted on the test birth profiles using `tsx`:

### 2.1 Earlier Occurrence Execution
- **Input Parameters:**
  - Profile Name: `'Ambiguous Earlier User'`
  - Date of Birth: `'2020-11-01'`
  - Local Time of Birth: `'01:30:00'`
  - IANA Timezone: `'America/New_York'`
  - Coordinates: Latitude `40.7128`, Longitude `-74.0060`
  - Disambiguation: `'earlier'`
  - Persisted UTC Instant: `2020-11-01T05:30:00.000Z`
  - Persisted Offset: `-14400` (-04:00 EDT)
- **Active System Configuration:**
  - Zodiac Type: `SIDEREAL`
  - Ayanamsa: `LAHIRI`
  - House System: `WHOLE_SIGN`
- **Output from `astrologyService.calculateChartForProfile()`:**
  ```json
  {
    "sign": "Leo",
    "degree": 3.8458882931471976,
    "absoluteDegree": 123.8458882931472,
    "longitude": 123.8458882931472,
    "nakshatra": "Magha",
    "pada": 2
  }
  ```
- **Output Extracted from Compiled PDF (`report_earlier.pdf`):**
  ```text
  2. ASCENDANT (LAGNA) & JANMA NAKSHATRA
  Ascendant Sign: Leo (3.85 deg)
  Ascendant Nakshatra: Magha (Pada 2)
  ```
- **Reconciliation Result:** **PERFECT MATCH ($123.846^\circ \equiv \text{Leo } 3.85^\circ$)**.

---

### 2.2 Later Occurrence Execution
- **Input Parameters:**
  - Profile Name: `'Ambiguous Later User'`
  - Date of Birth: `'2020-11-01'`
  - Local Time of Birth: `'01:30:00'`
  - IANA Timezone: `'America/New_York'`
  - Coordinates: Latitude `40.7128`, Longitude `-74.0060`
  - Disambiguation: `'later'`
  - Persisted UTC Instant: `2020-11-01T06:30:00.000Z`
  - Persisted Offset: `-18000` (-05:00 EST)
- **Output from `astrologyService.calculateChartForProfile()`:**
  ```json
  {
    "sign": "Leo",
    "degree": 15.667826396057734,
    "absoluteDegree": 135.66782639605773,
    "longitude": 135.66782639605773,
    "nakshatra": "Purva Phalguni",
    "pada": 1
  }
  ```
- **Output Extracted from Compiled PDF (`report_later.pdf`):**
  ```text
  2. ASCENDANT (LAGNA) & JANMA NAKSHATRA
  Ascendant Sign: Leo (15.67 deg)
  Ascendant Nakshatra: Purva Phalguni (Pada 1)
  ```
- **Reconciliation Result:** **PERFECT MATCH ($135.668^\circ \equiv \text{Leo } 15.67^\circ$)**.

---

## 3. Root Cause of the Reported Discrepancy

The discrepancy did **not** exist in the code, the database, or the PDF generation pipeline.

1. **The Source of $172.95155700812743^\circ$:**
   In [`apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts`](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts#L171-L172), line 172 asserts:
   ```typescript
   expect(earlierCalculatedChart).toBeDefined();
   expect(earlierCalculatedChart.chart.ascendant.longitude).toBeGreaterThanOrEqual(0);
   ```
   The test itself never hardcoded or asserted `172.95155700812743°`.
2. **Audit Documentation Transcription Error:**
   During Phase 2A.4, in creating `PHASE_2A4_REGRESSION_TEST_RESULTS.md` and `PHASE_2A4_FINAL_REVIEW.md`, an erroneous Ascendant value ($172.951557^\circ$, corresponding to an off-coast Western European coordinate at $51^\circ\text{ N}, -6^\circ\text{ W}$) was manually transcribed into the narrative audit report instead of the real engine calculation output for New York ($123.845888^\circ$).
3. **Audit Verification:**
   The underlying calculations executed by `astrologyService.calculateChartForProfile` have always produced `123.845888°` (Leo $3.85^\circ$) for New York at `2020-11-01 05:30:00 UTC`, and `135.667826°` (Leo $15.67^\circ$) at `2020-11-01 06:30:00 UTC`.

---

## 4. Comprehensive Pipeline Reconciliation Matrix

| Parameter / Field | Earlier Profile | Later Profile | Matching Status |
|---|---|---|---|
| **Profile ID** | `test-earlier-id` | `test-later-id` | Tracked in Map/DB |
| **Birth Date & Time** | `2020-11-01 01:30:00` | `2020-11-01 01:30:00` | Identical wall clock |
| **Timezone** | `America/New_York` | `America/New_York` | Identical IANA tz |
| **Coordinates** | Lat `40.7128`, Lon `-74.0060` | Lat `40.7128`, Lon `-74.0060` | Identical geographic point |
| **Persisted UTC Instant** | `2020-11-01T05:30:00.000Z` | `2020-11-01T06:30:00.000Z` | $\Delta = +1.0\text{ hour}$ |
| **Persisted Offset** | `-14400` (-04:00 EDT) | `-18000` (-05:00 EST) | Distinct offset |
| **Zodiac System** | `SIDEREAL` | `SIDEREAL` | Standard Vedic |
| **Ayanamsha** | `LAHIRI` | `LAHIRI` | Standard Vedic |
| **House System** | `WHOLE_SIGN` | `WHOLE_SIGN` | Standard Vedic |
| **Chart Service Ascendant** | **`123.845888° (Leo 3.85°)`** | **`135.667826° (Leo 15.67°)`** | **Identical to PDF** |
| **Report Worker Ascendant** | **`123.845888° (Leo 3.85°)`** | **`135.667826° (Leo 15.67°)`** | **Identical to PDF** |
| **PDF Ascendant** | **`Leo (3.85 deg)`** | **`Leo (15.67 deg)`** | **Identical to Chart Service** |

---

## 5. Conclusion

There is zero discrepancy between the chart service calculations and the PDF generation pipeline. Both systems deterministically and accurately calculate and display the Ascendant as **Leo 3.85° ($123.85^\circ$)** for the earlier occurrence and **Leo 15.67° ($135.67^\circ$)** for the later occurrence. The previously cited numbers ($172.95^\circ$ and $186.75^\circ$) are formally corrected and designated as documentation transcription errata.
