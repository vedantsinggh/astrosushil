# Astro Sushil: Phase 1A Report Catalogue & Generator Matrix

**Document Reference:** `docs/audits/report_system/phase_1a_verification/PHASE_1A_REPORT_CATALOGUE_MATRIX.md`  
**Classification:** Product Catalogue & Report Engine Coverage Audit  
**Date of Completion:** November 3, 2026  
**Auditor:** DeepMind Agentic Pair Programmer  
**Phase:** Phase 1A (Independent Verification and Evidence Reconciliation)  
**Inspection Coverage:** 13 Commercial Reference PDFs (`docs/reference repots/`) and all generator modules in `packages/report-engine/src/generators/`  

---

## 1. Executive Summary

We audited the product catalogue of Astro Sushil against the 13 reference commercial reports supplied in `docs/reference repots/`. We inspected every generator module in `packages/report-engine/src/generators/` and categorized the implementation status of each SKU.

### Implementation Status Breakdown:
- **Fully Implemented Dossiers (XeLaTeX, 65+ pages):** **1 SKU** (`CAREER`)
- **Rudimentary Vector Summaries (PDFKit, 4 pages, with static assumptions):** **4 SKUs** (`KUNDLI`, `PLANETARY`, `PRO_HOROSCOPE`, `MATCHMAKING`)
- **Completely Missing SKUs:** **8 SKUs** (No generator or PDF template exists)

---

## 2. Comprehensive 13-SKU Catalogue Comparison Matrix

| # | Reference Product Title (`docs/reference repots/`) | Reference Size / Page Count | Astro Sushil Implemented SKU | Implementation Status | Active Engine / Generator File | Astronomical Defect / Static Assumption Identified |
| :-: | :--- | :---: | :--- | :--- | :--- | :--- |
| **1** | **Career Report.pdf** | 10.5 MB<br>65 pages | `CAREER` | **Fully Implemented** *(Dossier)* | `career-report.service.ts`<br>`report-data-tex.generator.ts`<br>`templates/main.tex` | Hardcoded career directions, cautions, financial advice, and roadmaps in mapper. |
| **2** | **Premium Personalised Kundli Report.pdf** | 42.1 MB<br>88 pages | `KUNDLI` | **Rudimentary** *(4-Page Vector)* | `kundli-report.generator.ts` | Hardcodes transit Saturn at Pisces 345° (`line 216`) for Sade Sati calculation. |
| **3** | **Personalised Horoscope Report.pdf** | 2.4 MB<br>36 pages | `PRO_HOROSCOPE` | **Rudimentary** *(4-Page Vector)* | `pro-horoscope.generator.ts` | Hardcodes J2000 epoch (`julianDayUT: 2451545.0`, `line 179`) and `timezoneOffsetMinutes: 330`. |
| **4** | **Couple Kundli Matching Report.pdf** | 1.7 MB<br>28 pages | `MATCHMAKING` | **Rudimentary** *(4-Page Vector)* | `matchmaking-report.generator.ts` | Hardcodes J2000 epoch (`julianDayUT: 2451545.0`, `line 59`) and `timezoneOffsetMinutes: 330`. |
| **5** | *(Planetary Transits Reference)* | N/A | `PLANETARY` | **Rudimentary** *(4-Page Vector)* | `planetary-report.generator.ts` | Hardcodes static ephemeris snapshot for 8 planets (`lines 138–147`). |
| **6** | **Varshphal Report.pdf** | 13.3 MB<br>62 pages | None | **Completely Missing** | *None* | No generator exists in `packages/report-engine`. |
| **7** | **Jupiter Transit Report.pdf** | 60.3 MB<br>82 pages | None | **Completely Missing** | *None* | No generator exists in `packages/report-engine`. |
| **8** | **Rahu Ketu Transit Report.pdf** | 32.2 MB<br>78 pages | None | **Completely Missing** | *None* | No generator exists in `packages/report-engine`. |
| **9** | **Saturn In Your Birth Chart Report.pdf** | 11.4 MB<br>58 pages | None | **Completely Missing** | *None* | No generator exists in `packages/report-engine`. |
| **10** | **Finance Report.pdf** | 0.8 MB<br>24 pages | None | **Completely Missing** | *None* | No generator exists in `packages/report-engine`. |
| **11** | **Love Report.pdf** | 2.2 MB<br>30 pages | None | **Completely Missing** | *None* | No generator exists in `packages/report-engine`. |
| **12** | **Baby Name Report.pdf** | 1.8 MB<br>32 pages | None | **Completely Missing** | *None* | No generator exists in `packages/report-engine`. |
| **13** | **Fortune Report.pdf** / **Personalised Fortune Report Plus.pdf** | 11.3 MB / 38.0 MB<br>54 / 74 pages | None | **Completely Missing** | *None* | No generator exists in `packages/report-engine`. |

---

## 3. Inspection Coverage Disclosure

To ensure scientific honesty and transparency:
- **Reference PDF Sampling:** We inspected text, metadata, table of contents, and astronomical charts from all 13 reference PDFs in `docs/reference repots/`. Detailed page-by-page visual layout sampling was performed on `Career Report.pdf`, `Finance Report.pdf`, `Jupiter Transit Report.pdf`, `Couple Kundli Matching Report.pdf`, and `Personalised Fortune Report Plus.pdf`.
- **Source Generator Inspection:** Every generator file in `packages/report-engine/src/generators/` was read in full.

---

## 4. Key Generator Defects Register

### A. Hardcoded Static Transits (`planetary-report.generator.ts:138–147`):
```typescript
const ephemerisSnapshot = [
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
- **Flaw:** Every user who requests a Planetary Report receives transit positions from an arbitrary snapshot (October 2024). Regardless of whether the report is generated today, next year, or in 2028, Jupiter is always at Taurus 18.5° and Saturn is at Pisces 15.2°.

### B. Hardcoded Saturn in Kundli Report (`kundli-report.generator.ts:216`):
```typescript
const transitSaturnLong = 345.0; // Pisces
const sadeSatiResult = SadeSatiCalculator.evaluateSadeSati(rawMoonLong, transitSaturnLong);
```
- **Flaw:** Sade Sati analysis evaluates whether transiting Saturn is within 45° of the natal Moon. Hardcoding Saturn to 345° means Sade Sati is permanently frozen to the 2023–2025 Saturn-in-Pisces transit. When Saturn ingresses into Aries, the report will continue reporting Sade Sati as if Saturn were still in Pisces.

### C. Fixed J2000 Epoch in Matchmaking & Horoscope (`pro-horoscope.generator.ts:179`, `matchmaking-report.generator.ts:59`):
```typescript
normalizedTime: {
  originalDetails: birthDetails as any,
  utcIsoString: new Date(`${profile.dateOfBirth}T${profile.timeOfBirth || '12:00:00'}Z`).toISOString(),
  utcTimestampMs: Date.now(),
  julianDayUT: 2451545.0, // Fixed J2000 Epoch
  timezoneOffsetMinutes: 330, // Fixed IST
}
```
- **Flaw:** When passing `normalizedTime` into downstream calculations, the Julian Day is hardcoded to January 1, 2000, 12:00 UTC, ignoring the native's actual birth date.

---

## 5. Architectural Assessment: The Depth Deficit

The platform currently exhibits a severe commercial depth deficit:
1. **Marketing vs Delivery:** Customers expect a comprehensive 50–80 page personalized dossier across diverse life areas (Finance, Love, Transits, Varshphal).
2. **Current Reality:** Only `CAREER` has a dossier generator (which is itself crippled by hardcoded narrative arrays). The remaining four active report types generate lightweight 4-page PDF documents. The remaining 8 commercial SKUs do not exist in code.
