# Birthplace and Geographic Location Architecture

## 1. Overview

Accurate astrological calculations (Kundli chart, Bhavas/Houses, Ascendant/Lagna, and Panchanga) require exact geographic coordinates (latitude & longitude) and precise historical timezone resolution.

The Astro Sushil platform replaces arbitrary free-text birthplace input with a **verified geographic location model** that resolves canonical city/place names, coordinates, and IANA timezone identifiers via server-side geocoding and structured database persistence.

---

## 2. Location Data Model

Structured location data is stored on the `BirthProfile` model:

```typescript
export interface LocationSearchResult {
  id: string;              // Unique provider or catalog ID
  name: string;            // Primary city name (e.g. "New Delhi")
  displayName: string;     // Canonical display name (e.g. "New Delhi, Delhi, India")
  country: string;         // Country name (e.g. "India")
  countryCode: string;     // 2-letter ISO country code (e.g. "IN")
  state?: string;          // State/Province/Admin1 (e.g. "Delhi")
  latitude: number;        // Decimal degrees [-90.0, 90.0] (4-decimal precision)
  longitude: number;       // Decimal degrees [-180.0, 180.0] (4-decimal precision)
  timezone: string;        // IANA Timezone identifier (e.g. "Asia/Kolkata")
}
```

### Database Schema (`birth_profiles` table)

- `id`: UUID (Primary Key)
- `userId`: UUID (Foreign Key to users)
- `name`: VARCHAR(100)
- `dateOfBirth`: VARCHAR(10) (YYYY-MM-DD)
- `timeOfBirth`: VARCHAR(8) (HH:mm:ss)
- `latitude`: FLOAT (WGS84 decimal degrees)
- `longitude`: FLOAT (WGS84 decimal degrees)
- `timezone`: VARCHAR(50) (IANA Timezone String)
- `placeName`: VARCHAR(200) (Formatted display name)
- `country`: VARCHAR(100) (Optional)
- `countryCode`: VARCHAR(10) (Optional)
- `state`: VARCHAR(100) (Optional)
- `isResolved`: BOOLEAN (Default: true)

---

## 3. Geocoding Provider & Backend Abstraction

- **Provider**: Open-Meteo Geocoding API (`https://geocoding-api.open-meteo.com/v1/search`)
  - Fast, free, production-ready, no API keys exposed on client.
  - Returns canonical city names, coordinates, country, and IANA timezones worldwide.
- **Backend Service (`LocationService`)**:
  - `searchPlaces(query, limit)`: Debounced server-side geocoding.
  - **In-memory Cache**: 24-hour TTL caching for repeated city queries.
  - **Offline Fallback Catalog**: Preloaded major world cities catalog ensures high availability even during external provider timeouts.
  - **Endpoint**: `GET /api/v1/locations/search?q=:query&limit=:limit`

---

## 4. Timezone & Historical UTC Conversion

1. Local birth date (`YYYY-MM-DD`) and birth time (`HH:mm:ss`) are local clock time at the birthplace.
2. `normalizeBirthProfile` uses the `Intl.DateTimeFormat` API with the IANA timezone string to evaluate the exact historical timezone offset, automatically accounting for Daylight Saving Time (DST) changes in any historical era.
3. The deterministic astrology engine receives:
   - `utcDateTime`: Canonical UTC instant
   - `latitude`: Precise geographic latitude
   - `longitude`: Precise geographic longitude

---

## 5. Flutter Mobile UX

- **`LocationAutocompleteField`**:
  - User types city/place -> Debounced query -> Suggestion list.
  - Suggestions show city name, administrative region/country, and timezone pill.
  - Selecting a suggestion stores the complete `LocationModel` and displays a verified badge (`Verified • Asia/Kolkata (28.61°, 77.21°)`).
  - Editing text after selection clears the verified location so arbitrary unverified text cannot be submitted.
  - Users never manually input raw coordinates.

---

## 6. Existing Profile Compatibility & Migration Strategy

- Existing profiles in the database are **never broken or deleted**.
- Profiles created prior to this enhancement are inspected for resolution status:
  - If a profile has valid coordinates and an IANA timezone, it is marked as `isResolved = true`.
  - If a profile has missing or dummy coordinates (`0, 0, UTC`), it is flagged as `isResolved = false`.
- Unresolved profiles remain visible in the mobile app, with a clear notice: *"Location Confirmation Required"* and a direct button to confirm the verified birthplace.
