# PHASE 2A.2: API CONTRACT SPECIFICATION
## Birth-Time Disambiguation, Nonexistent Time, and Profile Lifecycle Contract

**Document Status:** Complete  
**Date:** November 2026  
**Audience:** Backend Engineers, Mobile (Flutter) Engineers, Integration QA  
**Governing Standard:** Astro Sushil Phase 2A.2 Architecture

---

## 1. Executive Summary

Phase 2A.1 identified that the Astro Sushil API lacked an end-to-end disambiguation protocol: ambiguous local birth times threw an unrecoverable 400 error, mobile clients could not pass user selections, and successful creations never persisted the choice, causing dynamic re-normalization crashes on subsequent profile reads, chart recalculations, and report generation.

Phase 2A.2 standardizes the API contract on **canonical** values:
- **Canonical Values:** `'earlier' | 'later'`
- **Deprecated Aliases:** `'daylight' | 'standard'` (handled via input preprocessing for backward compatibility, mapped to `'earlier'` and `'later'` respectively).
- **Authoritative Persistence:** Requests accept `disambiguation` and return persisted `utcDateTime`, `timezoneOffsetSeconds`, `disambiguation`, and `disambiguationRequired`.
- **Structured Error Payloads:** Errors return structured candidates with both UTC interpretations, exact offsets, and canonical identifiers.

---

## 2. Canonical Disambiguation Values

### 2.1 The Semantic Rationale
Time is unidirectionally ordered:
$$t_{\text{earlier}} < t_{\text{later}}$$

DST nomenclature (`daylight` vs `standard`) is fraught with edge cases:
- In the Southern Hemisphere (e.g., Australia, New Zealand, Chile), the fall-back transition occurs in April when leaving Daylight Saving Time into Standard Time; however, unusual historical transitions (such as wartime shifts, permanent DST rollbacks, or mid-year geopolitical time adjustments) do not follow standard summer/winter conventions.
- Astrologically and mathematically, the clock moves backwards by $\Delta t$, repeating an interval $[T_0, T_0 + \Delta t)$. The first instant through that interval is chronologically **earlier**; the second instant through that interval is chronologically **later**.

### 2.2 Zod Schema Preprocessing
`createBirthProfileSchema` and `updateBirthProfileSchema` implement backwards compatibility:
```typescript
const canonicalDisambiguationSchema = z.preprocess((val) => {
  if (typeof val !== 'string') return val;
  const lower = val.toLowerCase().trim();
  if (lower === 'daylight') return 'earlier';
  if (lower === 'standard') return 'later';
  return lower;
}, z.enum(['earlier', 'later'])).optional();
```

---

## 3. Endpoints and Request/Response DTOs

### 3.1 POST `/api/v1/birth-profiles` (Create Birth Profile)

#### Request Body (`CreateBirthProfileDto`)
```json
{
  "name": "Alex Miller",
  "dateOfBirth": "2023-11-05",
  "timeOfBirth": "01:30",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "cityName": "New York",
  "countryCode": "US",
  "timezone": "America/New_York",
  "disambiguation": "earlier",
  "gender": "male"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `dateOfBirth` | `string` (YYYY-MM-DD) | Yes | Calendar date in local wall time. |
| `timeOfBirth` | `string` (HH:mm) | Yes | Wall-clock time in 24-hour format. |
| `timezone` | `string` | Yes | Valid IANA timezone identifier. |
| `disambiguation` | `'earlier' \| 'later'` | Optional | Required when local time is ambiguous; optional otherwise. |

#### Successful Response (`201 Created`)
```json
{
  "id": "c1234567-89ab-cdef-0123-456789abcdef",
  "userId": "u1234567-89ab-cdef-0123-456789abcdef",
  "name": "Alex Miller",
  "dateOfBirth": "2023-11-05T00:00:00.000Z",
  "timeOfBirth": "01:30",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "cityName": "New York",
  "countryCode": "US",
  "timezone": "America/New_York",
  "disambiguation": "earlier",
  "utcDateTime": "2023-11-05T05:30:00.000Z",
  "timezoneOffsetSeconds": -14400,
  "disambiguationRequired": false,
  "createdAt": "2026-11-03T05:00:00.000Z",
  "updatedAt": "2026-11-03T05:00:00.000Z",
  "normalized": {
    "utcIso": "2023-11-05T05:30:00.000Z",
    "timezone": "America/New_York",
    "offsetMinutes": -240,
    "timezoneOffsetSeconds": -14400,
    "disambiguation": "earlier",
    "disambiguationRequired": false
  }
}
```

---

### 3.2 Error Responses

#### A. Ambiguous Local Time (`400 Bad Request` - `AMBIGUOUS_LOCAL_TIME`)
Returned when an ambiguous wall time is submitted without `disambiguation`.

```json
{
  "error": {
    "code": "AMBIGUOUS_LOCAL_TIME",
    "message": "Local birth time 2023-11-05 01:30 is ambiguous in timezone America/New_York due to daylight saving time transition. Please specify disambiguation ('earlier' or 'later').",
    "requestId": "req-9a8b7c6d",
    "details": [
      {
        "field": "timeOfBirth",
        "message": "Ambiguous local time: occurs twice during DST transition.",
        "code": "AMBIGUOUS_LOCAL_TIME",
        "timezone": "America/New_York",
        "localIsoString": "2023-11-05T01:30:00",
        "candidates": [
          {
            "disambiguation": "earlier",
            "utcDateTime": "2023-11-05T05:30:00.000Z",
            "timezoneOffsetSeconds": -14400,
            "offsetMinutes": -240,
            "type": "daylight"
          },
          {
            "disambiguation": "later",
            "utcDateTime": "2023-11-05T06:30:00.000Z",
            "timezoneOffsetSeconds": -18000,
            "offsetMinutes": -300,
            "type": "standard"
          }
        ]
      }
    ]
  }
}
```

#### B. Nonexistent Local Time (`400 Bad Request` - `NONEXISTENT_LOCAL_TIME`)
Returned when a wall-clock time falls directly into a spring-forward transition gap.

```json
{
  "error": {
    "code": "NONEXISTENT_LOCAL_TIME",
    "message": "Local birth time 2024-03-10 02:30 does not exist in timezone America/New_York (clocks skipped forward from 02:00 to 03:00). Please check and correct the birth time.",
    "requestId": "req-1a2b3c4d",
    "details": [
      {
        "field": "timeOfBirth",
        "message": "Nonexistent local time: time was skipped during DST transition.",
        "code": "NONEXISTENT_LOCAL_TIME",
        "timezone": "America/New_York",
        "localIsoString": "2024-03-10T02:30:00"
      }
    ]
  }
}
```

---

### 3.3 PUT `/api/v1/birth-profiles/:id` (Update Birth Profile)

#### Request Body (`UpdateBirthProfileDto`)
Supports updating either disambiguation, date/time, or non-temporal fields (e.g. name, latitude).
```json
{
  "name": "Alex Miller Updated",
  "disambiguation": "later"
}
```

When `timeOfBirth` or `dateOfBirth` or `timezone` changes:
- Recalculates candidate instants.
- If the new combination is ambiguous, requires `disambiguation`.
- If non-temporal fields are changed, existing `utcDateTime`, `disambiguation`, and `timezoneOffsetSeconds` are preserved intact.

---

### 3.4 GET `/api/v1/birth-profiles` and GET `/api/v1/birth-profiles/:id`

#### Backward Compatibility Safeguard
If a legacy profile exists in the database where an ambiguous time was created without disambiguation prior to Phase 2A.2:
- The backend normalizer catches the `BirthTimeAmbiguousError`.
- It does **NOT** throw HTTP 400 (which previously crashed the entire list).
- It returns the profile with:
  ```json
  {
    "disambiguationRequired": true,
    "disambiguation": null,
    "utcDateTime": null
  }
  ```
- This allows mobile and admin clients to list profiles safely and prompt the user to resolve the profile.

---

## 4. Contract Conformance Summary

| Feature | Legacy Behavior (Phase 2A.1) | Standardized Contract (Phase 2A.2) |
|---|---|---|
| **Disambiguation Enum** | `daylight \| standard` (inconsistent across DTOs) | Canonical: `earlier \| later` (with backward-compatible parser) |
| **Persistence of Choice** | Discarded after validation | Persisted in `BirthProfile.disambiguation` |
| **Authoritative Instant** | None; re-computed on every read | Persisted in `BirthProfile.utcDateTime` and `timezoneOffsetSeconds` |
| **Ambiguous Profile Read** | Crash (`400 AMBIGUOUS_LOCAL_TIME`) | Success; flags `disambiguationRequired: true` if legacy unselected |
| **Error Details Payload** | Unstructured text | Structured `candidates` array with UTC times, seconds offsets, and labels |
| **Flutter Resolution** | Blocked; no field in UI or model | Full UI modal with earlier/later cards, auto-retry |
