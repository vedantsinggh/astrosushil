# Astrology Engine Testing Strategy & Standards - Astro Sushil

This document outlines the testing philosophy, reference benchmark standards, floating-point tolerances, and verification procedures for `packages/astrology-engine`.

---

## 1. Testing Philosophy

Astrological calculations must be **100% deterministic, reproducible, and auditable**. The engine must yield identical outputs given identical inputs (`BirthDetails` + `AstrologyConfig`).

Key testing principles:
1. **Isolation**: Core calculation logic has ZERO dependencies on HTTP, database, or external networks.
2. **Determinism**: No usage of `Math.random()`, current system clock (`new Date()`), or unseeded ambient state inside calculation functions.
3. **Explicit Boundary Safety**: Floating-point degree comparisons near sign/nakshatra boundaries must be explicitly handled to prevent precision off-by-one errors.
4. **Methodology Fail-Fast**: Attempts to run calculations with unconfirmed client methodologies (`CLIENT_CONFIRMATION_REQUIRED`) must throw explicit errors.

---

## 2. Test Categories

### Category A: Input & Validation Tests
- Validates canonical `BirthDetails` (date ranges, leap years, 24-hour time formatting, IANA timezone validation, coordinate boundaries [-90 to 90 lat, -180 to 180 long]).
- Rejection of invalid dates, times, timezones, and coordinates.

### Category B: Normalization & Timeplace Tests
- Timezone offset calculation against historical IANA timezone databases.
- Conversion of local birth time to UTC ISO string and Julian Day Number (UT) without mutating the original input.

### Category C: Ephemeris & Astronomical Vector Tests
- Verification of planetary longitudes, latitudes, and velocities against static ephemeris benchmarks.
- Verification of `EphemerisProvider` implementations (`AstronomyEngineAdapter` and `MockEphemerisProvider`).

### Category D: Zodiac, House & Nakshatra Boundary Tests
- Testing boundary conditions:
  - `0.0°` (Start of Aries / Mesha & Ashwini Nakshatra)
  - `30.0°` (Boundary between Aries and Taurus)
  - `13°20'` (Nakshatra boundary: 13.333333333333334°)
  - `3°20'` (Pada boundary: 3.3333333333333335°)
  - `359.999999°` (End of Pisces / Meena & Revati Nakshatra)

### Category E: Reproducibility & Golden Tests
- Re-running calculation pipelines 10,000 times for the same input to assert 100% output identity.
- Comparing engine results against confirmed client reference benchmark charts.

---

## 3. Floating-Point Tolerances

Due to floating-point representation in JavaScript IEEE 754 numbers:

| Calculated Parameter | Maximum Allowed Tolerance | Description |
| :--- | :--- | :--- |
| **Planetary Longitude** | `0.0001°` (~0.36 arcseconds) | Max acceptable variance across algorithms |
| **Ascendant Degree** | `0.001°` (~3.6 arcseconds) | Horizon calculation tolerance |
| **Julian Day (UT)** | `0.000001` days (~0.086 seconds) | Time precision boundary |
| **Nakshatra Boundary** | `0.0000001°` | Epsilon threshold for boundary checks |

```ts
export const DEGREE_TOLERANCE = 0.0001;
export const EPSILON = 1e-9;

export function isDegreeEqual(deg1: number, deg2: number, tolerance = DEGREE_TOLERANCE): boolean {
  return Math.abs(deg1 - deg2) <= tolerance;
}
```

---

## 4. Golden Test Fixture Schema

All reference test charts are stored in `packages/astrology-engine/tests/fixtures/reference-charts.ts`:

```ts
export interface ReferenceChartFixture {
  id: string;
  description: string;
  birthDetails: BirthDetails;
  config: AstrologyConfig;
  expected: {
    julianDayUT: number;
    ascendantLongitude?: number;
    planets: Record<string, {
      longitude: number;
      rashiIndex: number; // 1 to 12
      nakshatraIndex: number; // 1 to 27
      pada: number; // 1 to 4
      isRetrograde: boolean;
    }>;
  };
  sourceReference: string; // e.g. "Verified Client Reference Chart #1"
}
```

---

## 5. Engine Versioning in Metadata

Every generated `AstroChart` includes calculation metadata:

```ts
export const ASTROLOGY_ENGINE_VERSION = '0.1.0';

export interface ChartMetadata {
  engineVersion: string;
  calculationTimestampIso: string;
  config: AstrologyConfig;
}
```
