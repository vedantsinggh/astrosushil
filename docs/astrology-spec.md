# Astrology Engine Technical Specification - Astro Sushil

This specification documents the technical architecture, mathematical standards, input/output models, and methodology configurations for `packages/astrology-engine`.

---

## 1. Core Architectural Boundary

`packages/astrology-engine` is an independent, pure TypeScript computational library.
- **Zero HTTP / Network Dependencies**: Does not depend on Fastify, HTTP, PostgreSQL, Prisma, Redis, or BullMQ.
- **Zero Paid Astrology API Dependencies**: All calculations execute 100% locally on owned infrastructure.
- **Data Flow**: `BirthDetails` -> `Astrology Engine` -> `AstroChart`.

---

## 2. Input Model & Validation

### 2.1 Canonical `BirthDetails` Structure
```ts
export interface LocalDateInput {
  year: number;   // Four-digit year, e.g. 1990
  month: number;  // 1 to 12
  day: number;    // 1 to 31
}

export interface LocalTimeInput {
  hour: number;   // 0 to 23
  minute: number; // 0 to 59
  second: number; // 0 to 59
}

export interface BirthDetails {
  date: LocalDateInput;
  time: LocalTimeInput;
  timezone: string;       // IANA Timezone ID (e.g. "Asia/Kolkata")
  latitude: number;       // Decimal degrees [-90.0, 90.0]
  longitude: number;      // Decimal degrees [-180.0, 180.0]
  altitudeMeters?: number;// Altitude above sea level in meters (Default: 0)
  placeName?: string;     // Optional location description
}
```

### 2.2 Date & Time Normalization Rules
1. Preserves original local birth details untouched.
2. Converts local birth time to UTC ISO string (`YYYY-MM-DDTHH:mm:ss.sssZ`) via IANA timezone lookup.
3. Computes Julian Day Number in Universal Time (`julianDayUT`).

---

## 3. Methodology Configuration (`AstrologyConfig`)

Methodology parameters that require explicit client confirmation are marked with `CLIENT_CONFIRMATION_REQUIRED`.
Attempts to perform calculations using unconfirmed methodologies throw an `UnconfirmedMethodologyError`.

```ts
export const CLIENT_CONFIRMATION_REQUIRED = 'CLIENT_CONFIRMATION_REQUIRED' as const;

export interface AstrologyConfig {
  zodiacType: 'SIDEREAL' | 'TROPICAL' | typeof CLIENT_CONFIRMATION_REQUIRED;
  ayanamsa: 'LAHIRI' | 'RAMAN' | 'KRISHNAMURTI' | 'KP' | typeof CLIENT_CONFIRMATION_REQUIRED;
  houseSystem: 'WHOLE_SIGN' | 'EQUAL' | 'PLACIDUS' | 'SRI_PATI' | typeof CLIENT_CONFIRMATION_REQUIRED;
  nodeCalculation: 'MEAN_NODE' | 'TRUE_NODE' | typeof CLIENT_CONFIRMATION_REQUIRED;
  planetaryCalculationMode: 'GEOCENTRIC' | 'TOPOCENTRIC' | typeof CLIENT_CONFIRMATION_REQUIRED;
  precisionDegrees: number;
  roundingRule: 'NEAREST' | 'TRUNCATE' | 'NONE';
  dashaSystem: 'VIMSHOTTARI' | typeof CLIENT_CONFIRMATION_REQUIRED;
}
```

---

## 4. Ephemeris Abstraction & Local Calculations

Calculation primitives are decoupled from underlying astronomy libraries via the `EphemerisProvider` abstraction:

```
  AstrologyEngine (ChartCalculator)
            │
            ▼
     EphemerisProvider (Interface)
        /           \
       v             v
AstronomyEngineAdapter   MockEphemerisProvider
 (astronomy-engine MIT)   (Offline Unit Testing)
```

---

## 5. Output Model (`AstroChart`)

```ts
export const ASTROLOGY_ENGINE_VERSION = '0.1.0';

export interface ChartCalculationMetadata {
  engineVersion: string;
  calculationTimestampIso: string;
  providerName: string;
  providerVersion: string;
  config: AstrologyConfig;
  normalizedTime: NormalizedBirthTime;
}

export interface AstroChart {
  metadata: ChartCalculationMetadata;
  birthDetails: BirthDetails;
  ascendant?: CalculatedPoint;
  planets: Record<PlanetSymbol, PlanetPosition>;
  houses?: HousePlacement[];
  vargas?: Partial<Record<VargaType, VargaChart>>;
  dashas?: VimshottariDashaTree;
}
```

---

## 6. Requirements Status

### 6.1 Confirmed Engine Features (Phase 2 Foundation)
- [x] Independent TypeScript package architecture (`packages/astrology-engine`).
- [x] Canonical `BirthDetails` input model & strict validation.
- [x] Timezone-aware UTC normalization & Julian Day UT calculation.
- [x] Explicit `AstrologyConfig` with `CLIENT_CONFIRMATION_REQUIRED` boundary safety.
- [x] `EphemerisProvider` abstraction layer.
- [x] Evaluated and integrated `astronomy-engine` (MIT License) for zero-cost, local execution.
- [x] Mock ephemeris provider for ultra-fast, deterministic offline unit tests.
- [x] Floating-point boundary-safe Rashi, Nakshatra, and Pada algorithms.
- [x] Engine version constant (`ASTROLOGY_ENGINE_VERSION = '0.1.0'`).
- [x] 100% deterministic & reproducible calculation pipeline tested across 100 runs.

### 6.2 Unresolved Requirements (Awaiting Client Confirmation)
- [ ] Confirmation of primary Ayanamsa (Lahiri vs Raman vs KP).
- [ ] Confirmation of primary House system for natal chart and Bhava Chalit.
- [ ] Confirmation of Mean Node vs True Node for Rahu/Ketu calculations.
- [ ] Confirmation of required Divisional Charts (Vargas list).
- [ ] Confirmation of Vimshottari Dasha year length (365.2425 days vs 360-day Savana year).
- [ ] Client reference benchmark chart fixtures.
