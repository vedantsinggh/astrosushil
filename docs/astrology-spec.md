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
  dashaSystem: 'VIMSHOTTARI' | 'ASHTOTTARI' | typeof CLIENT_CONFIRMATION_REQUIRED;
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
  dashas?: DashaTree;
}
```

---

## 6. Dasha Subsystems

### 6.1 Vimshottari Dasha Engine (Phase 2E)
- **Cycle Duration**: Exactly 120 solar years (365.2425 days/year).
- **Lords & Durations**: Ketu (7), Venus (20), Sun (6), Moon (10), Mars (7), Rahu (18), Jupiter (16), Saturn (19), Mercury (17).
- **Zodiac Division**: 27 canonical Nakshatras (13°20' each).
- **Starting Point**: Continuous sidereal Moon longitude inside birth Nakshatra.
- **Hierarchy**: 5 levels (Mahadasha, Antardasha, Pratyantardasha, Sookshma, Prana).

### 6.2 Ashtottari Dasha Engine (Phase 2F)
- **Cycle Duration**: Exactly 108 solar years (365.2425 days/year).
- **Planetary Sequence & Durations**:
  - Sun: 6 years
  - Moon: 15 years
  - Mars: 8 years
  - Mercury: 17 years
  - Saturn: 10 years
  - Jupiter: 19 years
  - Rahu: 12 years
  - Venus: 21 years
  *(Note: Ketu has no period in the Ashtottari system).*
- **28-Sector Zodiac Division (including Abhijit)**:
  - Sun (4 sectors): Ardra, Punarvasu, Pushya, Ashlesha (1.5y each)
  - Moon (3 sectors): Magha, Purva Phalguni, Uttara Phalguni (5.0y each)
  - Mars (4 sectors): Hasta, Chitra, Swati, Vishakha (2.0y each)
  - Mercury (3 sectors): Anuradha, Jyeshtha, Mula (17/3y each)
  - Saturn (4 sectors): Purva Ashadha, Uttara Ashadha (Padas 1-3: 10°00'), Abhijit (UA Pada 4 + 1/15th Shravana = 4°13'20''), Shravana (remainder: 12°26'40'') (2.5y each)
  - Jupiter (3 sectors): Dhanishta, Shatabhisha, Purva Bhadrapada (19/3y each)
  - Rahu (4 sectors): Uttara Bhadrapada, Revati, Ashwini, Bharani (3.0y each)
  - Venus (3 sectors): Krittika, Rohini, Mrigashira (7.0y each)
- **Parashari Eligibility Evaluation (BPHS Ch. 46, Verses 12-13)**:
  1. *Rahu Condition*: Rahu must be in Kendra (1, 4, 7, 10) or Trikona (1, 5, 9) from the Lagna Lord, and Rahu must NOT be placed in the Lagna itself.
  2. *Paksha / Diurnal Condition*: Birth must occur during daytime in Krishna Paksha (waning Moon) OR during nighttime in Shukla Paksha (waxing Moon).
- **Continuous Starting Point & Balance**:
  - Calculated strictly from exact continuous sidereal Moon longitude within the sector span (no Pada-based rounding).
  - Elapsed and balance portions sum to the exact nominal Mahadasha years.
- **Proportional Sub-Periods**:
  - Antardasha nominal years: `parentDurationYears * (subLordYears / 108)`.
  - Child periods that ended before the birth timestamp are excluded from the active lifetime timeline; periods spanning birth are clipped to start at the birth instant with `isBirthDasha: true`.
- **API Endpoints**:
  - `POST /api/v1/astrology/dasha` and `POST /api/v1/astrology/dashas` (plural alias).
  - Accepts `dashaSystem: 'VIMSHOTTARI' | 'ASHTOTTARI'`.

### 6.3 Additional Classical Dasha Systems (Phase 2R)

#### Dasha Systems Overview Table

| System | Status | Cycle | Basis | Eligibility Rule | Balance Method | Nested Support | Convention |
|---|---|---|---|---|---|---|---|
| **Vimshottari** | IMPLEMENTED | 120y | Nakshatra (27) | Universal (Kali Yuga standard) | Exact Moon in Nakshatra | 5 Levels | Parashara |
| **Ashtottari** | IMPLEMENTED | 108y | Nakshatra (28 w/ Abhijit) | Rahu in Kendra/Trikona from Lagna Lord & not in Lagna + Day Krishna / Night Shukla | Exact Moon in Sector Group | 5 Levels | Parashara (BPHS 46:12-13) |
| **Sthira** | IMPLEMENTED | 96y | Rashi (12) | Universal (Jaimini longevity & lifecycle) | Exact Ascendant in starting Rashi | 3 Levels | Jaimini / Parashara |
| **Shoola** | IMPLEMENTED | 108y | Rashi (12) | Universal (Jaimini longevity & crises) | Exact starting cusp in starting Rashi | 3 Levels | Jaimini / Parashara |
| **Dwisaptati Sama** | IMPLEMENTED | 72y | Nakshatra (27) | Lagna Lord in 7th House OR 7th Lord in Lagna | Exact Moon in Janma Nakshatra | 3 Levels | Parashara (BPHS 46:27-31) |
| **Shatabdika** | IMPLEMENTED | 100y | Nakshatra (27) | Lagna is Vargottama (D1 Rashi === D9 Rashi) | Exact Moon in 7-sector group | 3 Levels | Parashara (BPHS 46:32-35) |
| **Chaturaseeti Sama** | IMPLEMENTED | 84y | Nakshatra (27) | 10th Lord in 10th House | Exact Moon in Janma Nakshatra | 3 Levels | Parashara (BPHS 46:36-39) |
| **Dwadashottari** | IMPLEMENTED | 112y | Nakshatra (27) | Lagna in Venus Navamsha (Taurus or Libra) | Exact Moon in Janma Nakshatra | 3 Levels | Parashara (BPHS 46:40-45) |
| **Panchottari** | IMPLEMENTED | 105y | Nakshatra (27) | Cancer Lagna (D1) AND Cancer Dwadasamsha (D12) | Exact Moon in Janma Nakshatra | 3 Levels | Parashara (BPHS 46:46-51) |
| **Yogini** | PENDING | 36y | Nakshatra (27) | Universal | Nakshatra fraction | Planned | Parashara |
| **Chara** | PENDING | 96y | Rashi (12) | Universal | Sign / Karaka progression | Planned | Jaimini |
| **Narayana** | PENDING | 144y | Rashi (12) | Universal | Padakrama sign progression | Planned | Jaimini |
| **Kalachakra** | PENDING | 100y | Nakshatra (27) | Universal | Pada fraction / Deha-Jeeva | Planned | Parashara |

#### System Specifications

1. **Sthira Dasha (96-Year Rashi Dasha)**:
   - **Starting Sign**: Natal Lagna (Ascendant) Rashi.
   - **Sequence**: Direct zodiacal progression (1 to 12) through all signs.
   - **Sign Durations**: Movable (Chara: 1, 4, 7, 10) = 7y; Fixed (Sthira: 2, 5, 8, 11) = 8y; Dual (Dwisvabhava: 3, 6, 9, 12) = 9y. Total = 96y.
   - **Birth Balance**: Proportional to Ascendant degree in starting Rashi: `elapsed = (deg / 30) * nominalYears`.
   - **Sub-Periods**: 12 Antardashas direct from Mahadasha sign with proportional duration: `parentNominalYears * (subSignYears / 96)`.

2. **Shoola Dasha (108-Year Rashi Dasha)**:
   - **Starting Sign**: Stronger of 1st House (Lagna) vs 7th House (evaluated by planetary occupants, benefic aspect, sign modality).
   - **Direction**: Direct if starting sign is Odd (1, 3, 5, 7, 9, 11); Reverse if Even (2, 4, 6, 8, 10, 12).
   - **Sign Durations**: Exactly 9.0 years for every sign (12 × 9y = 108y).
   - **Birth Balance**: Proportional to starting point degree in starting Rashi.
   - **Sub-Periods**: 12 Antardashas of 0.75y (9 months) each.

3. **Dwisaptati Sama Dasha (72-Year Nakshatra Dasha)**:
   - **Eligibility**: Lagna Lord is in 7th House OR 7th Lord is in 1st House.
   - **Lords & Durations**: 9 planets × 8 years each (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu). Total = 72y.
   - **Starting Lord**: Count Janma Nakshatra from Moola (Nakshatra 19) modulo 9.
   - **Birth Balance**: Proportional to Moon longitude in Janma Nakshatra: `elapsed = fractionInNakshatra * 8.0y`.
   - **Sub-Periods**: 9 equal Antardashas of 8/9 years each.

4. **Shatabdika Dasha (100-Year Nakshatra Dasha)**:
   - **Eligibility**: Lagna is Vargottama (D1 Lagna Rashi === D9 Navamsha Lagna Rashi).
   - **Lords & Durations**: Sun 5y, Moon 5y, Venus 10y, Mars 10y, Jupiter 10y, Saturn 30y, Mercury 30y. Total = 100y.
   - **Sectors from Revati**: Revati-Bharani (Sun 3), Krittika-Mrigashira (Moon 3), Ardra-Ashlesha (Venus 4), Magha-Uttara Phalguni (Mars 3), Hasta-Vishakha (Jupiter 4), Anuradha-Mula (Saturn 3), Purva Ashadha-Uttara Bhadrapada (Mercury 7).
   - **Birth Balance**: Proportional to Moon longitude in the ruling planet's sector group.
   - **Sub-Periods**: 7 Antardashas proportional: `parentNominalYears * (subLordYears / 100)`.

5. **Chaturaseeti Sama Dasha (84-Year Nakshatra Dasha)**:
   - **Eligibility**: 10th Lord is in the 10th House (Karmesha karma-bhavasthe).
   - **Lords & Durations**: 7 planets × 12 years each (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn). Total = 84y.
   - **Starting Lord**: Count Janma Nakshatra from Ardra (Nakshatra 6) modulo 7.
   - **Birth Balance**: Proportional to Moon longitude in Janma Nakshatra: `elapsed = fractionInNakshatra * 12.0y`.
   - **Sub-Periods**: 7 equal Antardashas of 12/7 years each.

6. **Dwadashottari Dasha (112-Year Nakshatra Dasha)**:
   - **Eligibility**: Lagna is in Venus Navamsha (Taurus or Libra Navamsha).
   - **Lords & Durations**: Sun 7y, Jupiter 9y, Ketu 11y, Mercury 13y, Rahu 15y, Mars 17y, Saturn 19y, Moon 21y. Total = 112y.
   - **Starting Lord**: Count Janma Nakshatra from Pushya (Nakshatra 8) modulo 8.
   - **Birth Balance**: Proportional to Moon longitude in Janma Nakshatra.
   - **Sub-Periods**: 8 Antardashas proportional: `parentNominalYears * (subLordYears / 112)`.

7. **Panchottari Dasha (105-Year Nakshatra Dasha)**:
   - **Eligibility**: Lagna is in Cancer in both D1 Natal and D12 Dwadasamsha.
   - **Lords & Durations**: Sun 12y, Mercury 13y, Saturn 14y, Mars 15y, Venus 16y, Moon 17y, Jupiter 18y. Total = 105y.
   - **Starting Lord**: Count Janma Nakshatra from Anuradha (Nakshatra 17) modulo 7.
   - **Birth Balance**: Proportional to Moon longitude in Janma Nakshatra.
   - **Sub-Periods**: 7 Antardashas proportional: `parentNominalYears * (subLordYears / 105)`.

---

## 7. Requirements Status

### 7.1 Confirmed Engine Features
- [x] Independent TypeScript package architecture (`packages/astrology-engine`).
- [x] Canonical `BirthDetails` input model & strict validation.
- [x] Timezone-aware UTC normalization & Julian Day UT calculation.
- [x] Explicit `AstrologyConfig` with `CLIENT_CONFIRMATION_REQUIRED` boundary safety.
- [x] `EphemerisProvider` abstraction layer with local astronomical execution.
- [x] Mock ephemeris provider for deterministic offline unit tests.
- [x] Floating-point boundary-safe Rashi, Nakshatra, and Pada algorithms.
- [x] Vimshottari Dasha Engine (Phase 2E, 120-year cycle, 5 levels).
- [x] Ashtottari Dasha Engine (Phase 2F, 108-year cycle, 28 sectors with Abhijit, Parashari eligibility, 5 levels).
- [x] Additional Classical Dasha Engines (Phase 2R):
  - [x] Sthira Dasha (96-year Rashi dasha, 12 signs, 3 levels)
  - [x] Shoola Dasha (108-year Rashi dasha, 1st/7th house strength, direct/reverse, 3 levels)
  - [x] Dwisaptati Sama Dasha (72-year Nakshatra dasha, 9 lords × 8y, 3 levels)
  - [x] Shatabdika Dasha (100-year Nakshatra dasha, 7 lords, 3 levels)
  - [x] Chaturaseeti Sama Dasha (84-year Nakshatra dasha, 7 lords × 12y, 3 levels)
  - [x] Dwadashottari Dasha (112-year Nakshatra dasha, 8 lords, 3 levels)
  - [x] Panchottari Dasha (105-year Nakshatra dasha, 7 lords, 3 levels)
  - [x] Unified `DashaRegistry` with metadata, eligibility checking, and calculation dispatch.
- [x] Deterministic active period lookup (`targetDate`) across all Dasha hierarchies.
- [x] Zero `{}` empty-object serialization safety across all engine and API models.
- [x] Engine version constant (`ASTROLOGY_ENGINE_VERSION = '0.1.0'`).
- [x] 100% deterministic & reproducible calculation pipeline.
- [x] Varshaphala Annual Astrology Foundation (Phase 2S):
  - [x] Exact astronomical sidereal Solar Return numerical solver (< 1e-6° angular error, 0°/360° wraparound).
  - [x] Varsha Lagna calculation at exact return instant with explicit annual location support.
  - [x] Annual Planets (9 Vedic planets with house and combustion).
  - [x] Annual Houses (12 Whole Sign houses with sign, lord, and occupants).
  - [x] Muntha progression (1 sign/year progression from Natal Lagna).
  - [x] Panchadhikari 5 office-bearers (Munthesha, Janmesha, Varsha Lagnesha, Tri-Rashi table, Dina/Ratri Pati).
  - [x] Varshesha determination with Tajika Lagna aspect filter and Harsha Bala strength.
  - [x] Harsha Bala 4-fold happiness score & structural Harsha detection.
  - [x] Foundational Tajika Yogas (Ithasala, Isarpha, Nakta, Yamaya, Kamboola).
  - [x] Sahams calculation framework with 10 foundational sensitive points.
  - [x] Mudda Dasha annual timing (365.2425 days proportional cycle).
  - [x] Annual Panchanga context at the return moment.
  - [x] Clean API endpoint (`POST /api/v1/astrology/varshaphala`) and zero `{}` serialization.

### 7.2 Unresolved Requirements (Awaiting Client Confirmation)
- [ ] Confirmation of primary Ayanamsa (Lahiri vs Raman vs KP).
- [ ] Confirmation of primary House system for natal chart and Bhava Chalit.
- [ ] Confirmation of Mean Node vs True Node for Rahu/Ketu calculations.
- [ ] Confirmation of required Divisional Charts (Vargas list).
- [ ] Confirmation of Dasha year length (365.2425 days solar year vs 360-day Savana year).
- [ ] Client reference benchmark chart fixtures.

---

## 8. Varshaphala / Tajika Annual Astrology (Phase 2S)

### 8.1 Astronomical Solar Return Solver
- **Definition**: Exact instant when the transiting Sun's sidereal longitude returns to the exact natal sidereal Sun longitude:
  $$\lambda_{\odot, \text{transit}}(t) = \lambda_{\odot, \text{natal}}$$
- **Numerical Solver**: Newton-Raphson method with adaptive step clamping ($\le 5.0$ days) and boundary-aware angular delta normalization across $0^\circ / 360^\circ$:
  $$\Delta \theta = ((\lambda_{\text{transit}} - \lambda_{\text{natal}}) \pmod{360} + 360) \pmod{360}$$
- **Numerical Tolerance**: Solver iterates until $|\Delta \theta| \le 1 \times 10^{-7}$ degrees (~0.00036 arcseconds) and enforces convergence within $1 \times 10^{-5}$ degrees.
- **Cycle Window Constraint**: Prevents runaway jumps to previous or subsequent solar cycles ($|JD - JD_{\text{approx}}| \le 5.0$ days).
- **Timezone & Location**: Timezone-aware ISO timestamps (`solarReturnUtcIso`, `solarReturnLocalIso`). Supports explicit `annualLocation` with latitude, longitude, and IANA timezone (defaults to natal location).

### 8.2 Varsha Lagna & Annual Chart
- **Varsha Lagna**: Annual Ascendant evaluated at the exact solar return instant at the annual location. Returns absolute longitude, Rashi index, Rashi name, degree in Rashi, Nakshatra, Pada, and Lord.
- **Annual Planets (`AnnualPlanet`)**: All 9 Vedic planets evaluated using the canonical engine, enriched with `house` placement in the annual chart and deterministic `isCombust` status relative to the Sun.
- **Annual Houses (`AnnualHouse`)**: 12 Whole Sign houses enriched with `sign`, `lord`, and `occupyingPlanets`.

### 8.3 Muntha
- **Natal Origin**: Natal Ascendant sign and exact degree inside the sign:
  $$\text{Muntha Rashi} = ((\text{Natal Lagna Rashi} - 1 + (\text{Completed Years} \pmod{12})) \pmod{12}) + 1$$
- **Progression**: Advances exactly 1 zodiac sign per completed year of age ($\text{targetYear} - \text{birthYear}$).
- **Longitude**: Preserves the degree in sign from the natal Ascendant:
  $$\lambda_{\text{Muntha}} = (\text{Muntha Rashi} - 1) \times 30^\circ + (\lambda_{\text{Natal Lagna}} \pmod{30^\circ})$$

### 8.4 Panchadhikari & Varshesha
- **Five Office-Bearers (Panchadhikari)**:
  1. **Munthesha**: Lord of the Muntha sign.
  2. **Janmesha**: Lord of the Natal Lagna sign.
  3. **Varsha Lagnesha**: Lord of the Varsha Lagna sign.
  4. **Trirashisha**: Tri-Rashi Lord determined by the classical 12-sign Day/Night table (*Tajika Neelakanthi* & Dr. B.V. Raman).
  5. **Dina-Ratri Pati**: Day Return (Sun in houses 7-12) $\rightarrow$ Lord of the Sun's sign (Surya Rashi Lord); Night Return (Sun in houses 1-6) $\rightarrow$ Lord of the Moon's sign (Chandra Rashi Lord).
- **Varshesha Selection**:
  - Filter candidates that cast a Tajika aspect to Varsha Lagna (houses 1, 3, 4, 5, 7, 9, 10, 11).
  - Select candidate with highest Harsha Bala score.
  - Fallback: Highest Harsha Bala candidate if none directly aspect Lagna.

### 8.5 Harsha Bala & Harsha Yogas
- **Harsha Bala (4-Fold Joy Strength)** for the 7 classical planets (score 0 to 20):
  - Sthana Bala (Joy House: Su 9, Mo 3, Ma 6, Me 1, Ju 11, Ve 5, Sa 12): 5 points.
  - Uccha Bala (Own or Exaltation sign): 5 points.
  - Stri/Purusha Griha Bala (Masculine planet in odd sign, Feminine in even sign): 5 points.
  - Dina/Ratri Bala (Diurnal in day, Nocturnal in night, Mercury always): 5 points.
- **Harsha Status**: Planet with total score $\ge 15$ achieves Harsha status.

### 8.6 Foundational Tajika Yogas
- **Ithasala (Muthashila)**: Faster planet applies to slower planet in mutual Tajika aspect within their combined orbs ($\text{Deeptamsha}_{\text{avg}}$).
- **Isarpha (Musaripha)**: Faster planet separates from slower planet in mutual Tajika aspect within orbs.
- **Nakta Yoga**: Faster intermediary planet connects two unconnected planets by applying to one and aspecting the other.
- **Yamaya Yoga**: Slower intermediary planet collects light from two applying faster planets.
- **Kamboola Yoga**: Moon aspects a planet involved in an existing Ithasala yoga.

### 8.7 Sahams Foundation
- Generic framework computing 10 classical sensitive points:
  - Day Return: $\text{Lagna} + \text{Planet A} - \text{Planet B}$
  - Night Return: $\text{Lagna} + \text{Planet B} - \text{Planet A}$
  - Core collection: Punya, Vidya, Yashas, Mitra, Mahatmya, Karma, Roga, Karya Siddhi, Asha, Preeti.

### 8.8 Mudda Dasha
- 365.2425-day compressed annual cycle based on Vimshottari planetary proportions:
  $$\text{Duration} = \frac{\text{Vimshottari Years}}{120} \times 365.2425 \text{ days}$$
- Starts with the ruler of the Moon's Nakshatra in the annual chart.
- Supports active Dasha lookup for arbitrary query dates.

### 8.9 Implementation Status Matrix
| Component | Status | Details |
| :--- | :--- | :--- |
| **Solar Return Solver** | `IMPLEMENTED` | Astronomical root finder, $< 1 \times 10^{-6\circ}$ error, wraparound safe |
| **Varsha Lagna** | `IMPLEMENTED` | Annual Ascendant at exact return and annual location |
| **Annual Planets & Houses** | `IMPLEMENTED` | 9 Vedic planets with house & combustion; 12 Whole Sign houses |
| **Muntha** | `IMPLEMENTED` | Deterministic 1 sign/year progression with structured evidence |
| **Panchadhikari** | `IMPLEMENTED` | 5 classical office-bearers (12-sign Tri-Rashi & Surya/Chandra lords) |
| **Varshesha** | `IMPLEMENTED` | Tajika aspect filter + Harsha Bala selection |
| **Harsha Bala & Yogas** | `IMPLEMENTED` | 4-fold joy strength & structural Harsha detection |
| **Tajika Yogas Subset** | `IMPLEMENTED` | Ithasala, Isarpha, Nakta, Yamaya, Kamboola |
| **Sahams Subset** | `IMPLEMENTED` | 10 classical Sahams with Day/Night branching |
| **Mudda Dasha** | `IMPLEMENTED` | 365.2425-day cycle with active period lookup |
| **Annual Panchanga** | `IMPLEMENTED` | Instantaneous Tithi, Vara, Nakshatra, Yoga, Karana |
| **API Endpoint** | `IMPLEMENTED` | `POST /api/v1/astrology/varshaphala` |
| **Tripataki Chakra** | `PENDING` | Awaiting client specification on geometric layout & Vedha tradition |
| **Patyayini Dasha** | `PENDING` | Annual timing system scheduled for future expansion |

---

## 9. Prashna / Horary Astrology Foundation (Phase 2T)

### 9.1 Philosophy & Core Principles
Prashna (Horary Astrology) evaluates the planetary geometry at the exact moment and location a question is formulated or submitted to the astrologer (*Prashna Marga*, *Daivajna Vallabha*).
- **Zero Birth Data Dependency**: Does NOT require natal birth profile or natal birth date/time.
- **Zero Server Time Dependency**: Must NEVER use implicit server system clock. The `questionTimestamp` and IANA `timezone` are explicitly provided and normalized to UTC Julian Day.
- **Strictly Deterministic**: 100% rule-based calculations; zero LLM interpretation or calculation of horary charts.
- **Pure Structural Evidence**: Establishes mathematical and astrological facts without speculative predictive text.

### 9.2 Classical Prashna Conventions
| Parameter | Setting | Rationale |
| :--- | :--- | :--- |
| **Zodiac** | `SIDEREAL` (Nirayana) | Classical Vedic Horary / Prashna Marga standard |
| **Ayanamsa** | `LAHIRI` | Standard Lahiri formula (23.85° at J2000 + precession) |
| **House System** | `WHOLE_SIGN` | Canonical default across the Astro Sushil engine |
| **Planetary Coordinates** | `GEOCENTRIC` | Apparent geocentric coordinates via `astronomy-engine` |
| **Lunar Node Mode** | `MEAN_NODE` | Canonical mean lunar node calculation |
| **Time Parameter** | Explicit ISO + IANA Timezone | Converted deterministically to UTC Julian Day |
| **Location Parameter** | Explicit Geographic Coordinates | Query location coordinates (latitude, longitude, timezone) |

### 9.3 Prashna Lagna (Udaya Lagna) & Houses
- **Prashna Lagna**: Sidereal Ascendant rising at the query moment and location, calculated using verified GMST, LST, and obliquity equations with Lahiri Ayanamsa. Exposes Rashi, degree in sign, Nakshatra, Pada, Nakshatra Lord, and Rashi Lord.
- **Whole Sign Houses (Bhavas)**: 12 houses established from Prashna Lagna (House 1 = Lagna sign, House 2 = next sign, etc.), detailing sign, lord, cusp boundaries, and occupying planets.
- **Planetary States**: 9 Vedic planets (Sun through Ketu) with sidereal longitude, sign, degree, speed, retrograde status, house position from Prashna Lagna, and combustion status relative to the Sun.

### 9.4 Prashna Moon (Chandra as Query Carrier)
In classical horary astrology (*Prashna Marga*), Chandra represents the querent's mind (*manas*) and the query itself:
- **Moon Placement**: Longitude, sign, degree, house from Prashna Lagna, Nakshatra, Pada, and Nakshatra Lord.
- **Paksha & Illumination**: Evaluates waxing (*Shukla Paksha*) vs waning (*Krishna Paksha*) based on angular distance from the Sun:
  $$\Delta\lambda = (\lambda_{\text{Moon}} - \lambda_{\text{Sun}}) \pmod{360^\circ}$$
  Waxing when $\Delta\lambda < 180^\circ$; Waning when $\Delta\lambda \ge 180^\circ$.
- **Aspects Received**: Evaluates planetary aspects received by the Moon (conjunction, opposition, trine, square, sextile).

### 9.5 Classical Sensitive Points & Sphutas (Prashna Marga)
1. **Gulika (Mandi)**:
   - Day is divided into 8 equal parts ($\text{Day Length} / 8$).
   - Night is divided into 8 equal parts ($\text{Night Length} / 8$).
   - Gulika rises at the start of Saturn's portion:
     - Day query: Sun=6, Mon=5, Tue=4, Wed=3, Thu=2, Fri=1, Sat=0 parts elapsed.
     - Night query: Sun=2, Mon=1, Tue=0, Wed=6, Thu=5, Fri=4, Sat=3 parts elapsed.
   - Gulika longitude is the sidereal Ascendant rising at that exact moment.
2. **Trisphuta**:
   $$\lambda_{\text{Trisphuta}} = (\lambda_{\text{Lagna}} + \lambda_{\text{Moon}} + \lambda_{\text{Gulika}}) \pmod{360^\circ}$$
3. **Chatusphuta**:
   $$\lambda_{\text{Chatusphuta}} = (\lambda_{\text{Trisphuta}} + \lambda_{\text{Sun}}) \pmod{360^\circ}$$
4. **Panchasphuta**:
   $$\lambda_{\text{Panchasphuta}} = (\lambda_{\text{Chatusphuta}} + \lambda_{\text{Rahu}}) \pmod{360^\circ}$$

### 9.6 Question Number Systems
- **Classical Parashari / Arya (1–108)**:
  - The zodiac is divided into 108 Navamsha arcs of $3^\circ20'$ each.
  - Number $N \in [1, 108]$ identifies the Navamsha arc:
    $$\text{Span} = [(N-1) \times 3^\circ20', N \times 3^\circ20')$$
    $$\text{Navamsha Rashi} = ((N - 1) \pmod{12}) + 1$$
    $$\text{Nakshatra Index} = \lfloor (N - 1) / 4 \rfloor + 1, \quad \text{Pada} = ((N - 1) \pmod 4) + 1$$
  - Determines the **Arudha Lagna** and its Whole Sign house offset relative to the time-based Prashna Lagna.
- **Krishnamurti Paddhati (KP 1–249)**:
  - Strictly isolated from Parashari logic (`system: 'KP_1_249'`).
  - The zodiac is partitioned into 249 sub-divisions (27 Nakshatras $\times$ 9 Vimshottari sub-lords with 6 sign-boundary splits at $30^\circ, 90^\circ, 150^\circ, 210^\circ, 270^\circ, 330^\circ$).
  - For $K \in [1, 249]$, details Sign Lord, Star Lord, and Sub Lord.

### 9.7 Instantaneous Panchanga & Rahu Kala
- Panchanga computed at the exact question moment and coordinates: Tithi, Vara, Nakshatra, Soli-Lunar Yoga, Karana, Sunrise, and Sunset.
- **Rahu Kala Indicator**: Identifies whether the question was asked during Rahu Kala (inauspicious timing factor in classical Prashna).

### 9.8 Implementation Status Matrix
| Component | Status | Details |
| :--- | :--- | :--- |
| **Prashna Lagna** | `IMPLEMENTED` | Sidereal Ascendant at question timestamp and coordinates |
| **Planets & Houses** | `IMPLEMENTED` | 9 Vedic planets with house positions & combustion; 12 Whole Sign houses |
| **Prashna Moon** | `IMPLEMENTED` | Detailed Chandra analysis (Paksha, house, aspects received) |
| **Gulika (Mandi)** | `IMPLEMENTED` | Diurnal/nocturnal 8-part division with Ascendant derivation |
| **Classical Sphutas** | `IMPLEMENTED` | Trisphuta, Chatusphuta, and Panchasphuta mathematical points |
| **Parashari 1–108** | `IMPLEMENTED` | Navamsha Arudha, Nakshatra, Pada, and Lagna house offset |
| **KP 1–249** | `IMPLEMENTED` | 249-subdivision table with Sign, Star, and Sub lords |
| **Panchanga & Rahu Kala** | `IMPLEMENTED` | Instantaneous Panchanga and Rahu Kala query flag |
| **API Endpoint** | `IMPLEMENTED` | `POST /api/v1/astrology/prashna` |
| **Prashna Interpretation** | `DEFERRED` | Prediction interpretation strictly reserved for future phase |

