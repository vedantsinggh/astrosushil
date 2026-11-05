# PHASE 2A: EPHEMERIS & ASTRONOMY ATTRIBUTION REVISION

**Document Version:** 1.0.0  
**Target Subsystems:** `apps/mobile`, `packages/report-engine`, Public Documentation  

---

## 1. Audit Context & Discrepancy Reconciliation

Throughout earlier phases of development, marketing copy, report templates, and mobile UI SnackBars claimed that astrological calculations were computed using *\"Swiss Ephemeris algorithms\"* or verified under *\"Swiss Ephemeris release standards\"*.

### Forensic Findings:
1. **Zero Execution of Swiss Ephemeris (`libswe`):**  
   The platform runtime contains zero dependencies on `libswe`, `swetest`, or compiled Swiss Ephemeris C binaries.
2. **Actual Runtime Ephemeris:**  
   The platform strictly executes Don Cross's `astronomy-engine` v2.1.19 (MIT Licensed pure-JavaScript library).
3. **Underlying Astronomical Models in `astronomy-engine`:**  
   - Heliocentric planetary positions: **VSOP87 theory** (Variations Séculaires des Orbites Planétaires).
   - Geocentric lunar positions: **ELP2000-82 theory** (Éphéméride Lunaire Parisienne).
   - Coordinate conversions: Classical J2000 equatorial/ecliptic transformations.
4. **No Claim of IAU SOFA:**  
   The user directives explicitly forbid claiming IAU SOFA (Standards of Fundamental Astronomy) attribution unless directly executed in code. `astronomy-engine` is an independent implementation based on VSOP87/ELP2000; therefore, IAU SOFA attribution is deliberately omitted.

---

## 2. Updated Attribution Text Across Codebase

| Location | Pre-Phase 2A (Defective / Inaccurate) | Phase 2A (Accurate Runtime Attribution) |
| :--- | :--- | :--- |
| `apps/mobile/.../astrology_hub_screen.dart:174` | `'All calculations are 100% deterministic using Swiss Ephemeris & Lahiri Ayanamsa.'` | `'All calculations are 100% deterministic using Astronomy Engine (VSOP87/ELP2000-82) & Lahiri Ayanamsa.'` |
| `packages/report-engine/.../career-report.mapper.ts:514` | `'...calculated using Swiss Ephemeris algorithms under Sidereal Lahiri Ayanamsa.'` | `'...calculated using Astronomy Engine (VSOP87 / ELP2000-82) under Sidereal Lahiri Ayanamsa.'` |
| `packages/report-engine/.../career-report.mapper.ts:517` | `'Astro Sushil Ephemeris Engine (Swiss Ephemeris Base)'` | `'Astro Sushil Ephemeris Engine (Astronomy Engine v2.1.19 Base)'` |
| `packages/report-engine/templates/main.tex:330` | `© 2026 Astro Sushil. All rights reserved. Deterministic calculation verified under Swiss Ephemeris.` | `© 2026 Astro Sushil. All rights reserved. Deterministic calculation verified under Astronomy Engine v2.1.19 (VSOP87/ELP2000-82).` |
| `packages/report-engine/templates/main.tex:1809` | `...Every data point is auditable against Swiss Ephemeris release standards.` | `...Every data point is auditable against Astronomy Engine (VSOP87/ELP2000-82) astronomical algorithms.` |
| `packages/report-engine/templates/report_data.tex:28` | `\newcommand{\BirthDataScopeNote}{...using Swiss Ephemeris algorithms...}` | `\newcommand{\BirthDataScopeNote}{...using Astronomy Engine (VSOP87 / ELP2000-82)...}` |
| `packages/report-engine/templates/report_data.tex:33` | `\newcommand{\EphemerisProvider}{...Swiss Ephemeris Base}` | `\newcommand{\EphemerisProvider}{...Astronomy Engine v2.1.19 Base}` |
| `packages/report-engine/.../report-data-tex.generator.ts:147` | `data.client.ephemerisProvider \|\| 'Swiss Ephemeris Engine'` | `data.client.ephemerisProvider \|\| 'Astronomy Engine (VSOP87/ELP2000-82)'` |

---

## 3. Pending Calculation Safeguard for Phase 2B: The 25.53-Arcsecond Baseline Offset

In accordance with Phase 2A instructions, **the Lahiri ayanamsha formula was not modified during Phase 2A**.

### Architectural Record for Phase 2B:
- **Current Formula (`chart-calculator.ts:41`):**  
  `ayanamsaOffset = 23.85 + 0.01396 * yearsFromJ2000;`
- **Root Cause of Baseline Error:**  
  Truncating the official 1 January 2000 Lahiri epoch baseline ($23^\circ 51' 25.53'' = 23.857092^\circ$) to `23.85°` introduced a constant **25.53 arcsecond ($0.007092^\circ$) shortfall**.
- **Impact Assessment:**  
  Across 100 years of historical charts (1920–2020), this causes a minor, uniform offset of $\approx 25.5''$ across all planetary sidereal longitudes. While well below the 12,000'' width of a single nakshatra quarter (pada), it will be addressed in Phase 2B by adopting the official Positional Astronomy Centre (PAC) polynomial:
  $$\Delta\lambda_{\text{Lahiri}}(t) = 23.857092^\circ + 1.396042^\circ \cdot T + 0.000308^\circ \cdot T^2$$
  where $T$ is Julian centuries from J2000.
