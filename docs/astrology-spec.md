# Astrology Engine Technical Specification - Astro Sushil

This specification outlines the technical contracts, inputs, outputs, mathematical standards, and configuration parameters for `packages/astrology-engine`.

> **IMPORTANT**: No custom formulas are invented in this document. Parameters requiring client verification are explicitly marked as `[CLIENT CONFIRMATION REQUIRED]`.

---

## 1. Input Parameters & Normalization

### 1.1 Birth Data Structure
The engine accepts raw birth input structured as follows:
- **Date of Birth**: Year, Month, Day (Gregorian Calendar).
- **Time of Birth**: Hours, Minutes, Seconds (24-hour format).
- **Geographic Latitude**: Decimal degrees (-90.0 to +90.0). Positive = North, Negative = South.
- **Geographic Longitude**: Decimal degrees (-180.0 to +180.0). Positive = East, Negative = West.
- **Altitude**: Altitude above sea level in meters (Default: 0m).
- **Timezone Offset**: Standard UTC offset (e.g. `+05:30` for IST).

### 1.2 Date & Time Standardization
1. Convert local birth time to Coordinated Universal Time (UTC).
2. Account for Daylight Saving Time (DST) historical offsets based on geographical location.
3. Compute Julian Day Number (UT) and Ephemeris Time (TT = UT + Delta T).

---

## 2. Astronomical Standards & Calculations

### 2.1 Astronomical Source Engine
- **Ephemeris Data Source**: `[CLIENT CONFIRMATION REQUIRED: Swiss Ephemeris vs Pure JS Open-Source Ephemeris Engine]`
- **Planets Calculated**: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu (North Node), Ketu (South Node).
- **Outer Planets (Optional)**: Uranus, Neptune, Pluto `[CLIENT CONFIRMATION REQUIRED: Include outer planets in Kundli?]`
- **Node Calculation Method**: `[CLIENT CONFIRMATION REQUIRED: Mean Node vs True Node (Default recommended: Mean Node)]`

### 2.2 Zodiac Methodology & Ayanamsa
- **Zodiac System**: Sidereal Zodiac (Nirayana Chakra).
- **Ayanamsa System**: `[CLIENT CONFIRMATION REQUIRED: Lahiri / Chitrapaksha Ayanamsa vs Krishnamurti (KP) vs Raman Ayanamsa (Default recommended: Lahiri)]`

### 2.3 Ascendant (Lagna) & House System (Bhava)
- **Ascendant Calculation**: Exact longitude of the eastern horizon at the birth moment for given latitude/longitude.
- **House System (Bhava Chalit)**: `[CLIENT CONFIRMATION REQUIRED: Whole Sign System vs Equal House System vs Sri Pati / Placidus Bhava Chalit (Default recommended: Equal House / Whole Sign for Rashi Chart, Sri Pati for Bhava Chalit)]`

---

## 3. Core Astrological Data Outputs

### 3.1 Planetary Position Vector
For each planet (Sun through Ketu), the engine outputs:
- **Longitude**: Absolute tropical/sidereal longitude (0° to 360°).
- **Rashi (Sign)**: Sign index (1 = Aries / Mesha to 12 = Pisces / Meena).
- **Degree in Sign**: Degree, Minute, Second (0°0'0" to 29°59'59").
- **House (Bhava)**: House index (1 to 12).
- **Nakshatra**: Nakshatra index (1 = Ashwini to 27 = Revati). Abhijit Nakshatra handling: `[CLIENT CONFIRMATION REQUIRED: Include 28-Nakshatra system for specific calculations?]`
- **Nakshatra Pada**: Quarter index (1, 2, 3, or 4).
- **Nakshatra Lord**: Planetary ruler of the nakshatra.
- **Retrograde Status (Vakra)**: Boolean (`true` if planet has negative daily velocity).
- **Combustion Status (Lupta)**: Boolean (`true` if angular distance to Sun is within combustion orb limits). `[CLIENT CONFIRMATION REQUIRED: Specify combustion orb degrees per planet]`

---

### 3.2 Divisional Charts (Vargas)
The engine must compute the following Vargas:
- **D-1**: Rashi Chart (Primary natal chart).
- **D-2**: Hora Chart (Wealth & resources). `[CLIENT CONFIRMATION REQUIRED: Parashari Hora vs Traditional]`
- **D-3**: Drekkana (Siblings & courage).
- **D-7**: Saptamsa (Progeny & children).
- **D-9**: Navamsha (Spouse, inner self, marriage). `[CLIENT CONFIRMATION REQUIRED: Standard Parashari D-9 mapping]`
- **D-10**: Dasamsa (Career, status, occupation).
- **D-12**: Dwadasamsa (Parents).
- **D-30**: Trimsamsa (Misfortunes & obstacles).
- **D-60**: Shashtiamsa (Past karma & deep subtle analysis). `[CLIENT CONFIRMATION REQUIRED: List all mandatory Vargas]`

---

### 3.3 Dasha Systems
- **Primary Dasha**: Vimshottari Dasha (120-year cycle based on Moon's birth Nakshatra).
- **Dasha Levels**:
  - Mahadasha (Major period)
  - Antardasha / Bhukti (Sub-period)
  - Pratyantardasha (Sub-sub-period)
  - Sookshmadasha (Level 4 - optional)
- **Year Length Standard**: `[CLIENT CONFIRMATION REQUIRED: 365.2425 days solar year vs 360-day Savana year]`

---

### 3.4 Panchang Calculations
- **Tithi**: Lunar day based on Moon-Sun angular distance (1 to 30).
- **Vara**: Solar weekday (Sunday to Saturday).
- **Nakshatra**: Moon's nakshatra position.
- **Yoga**: Combined Sun + Moon longitude (1 = Vishkambha to 27 = Vaidhriti).
- **Karana**: Half-tithi period (1 to 60).

---

## 4. Computational Precision & Validation

### 4.1 Precision Standards
- Planetary Longitudes: Minimum precision of `0.0001` degrees (`~0.36` arcseconds).
- Ascendant Degrees: Minimum precision of `0.001` degrees.
- Time Handling: Millisecond precision converted to fractional days.

### 4.2 Chart Validation Methodology
1. **Reference Benchmark Charts**: A test suite of 50 standard reference charts with verified planetary positions across various global coordinates and historical dates.
2. **Regression Testing**: Automated test runner verifying that changes in `packages/astrology-engine` do not alter reference chart outputs.
3. **Cross-Validation**: Periodic verification against verified ephemeris tables (e.g. NASA JPL / Swiss Ephemeris test vectors).
