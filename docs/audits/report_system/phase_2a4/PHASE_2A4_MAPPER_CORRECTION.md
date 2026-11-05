# Phase 2A.4: Birth-Details Mapper Correction and Authoritative UTC Preservation

**Audit Phase:** Phase 2A.4  
**Date:** 2026-11-03  
**Status:** Complete & Independently Verified  
**Target File:** [`apps/api/src/modules/astrology/birth-details.mapper.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/astrology/birth-details.mapper.ts)

---

## 1. Executive Summary

Phase 2A.3 identified a critical regression in the birth-profile calculation pipeline:
`mapBirthProfileToBirthDetails()` in [`birth-details.mapper.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/astrology/birth-details.mapper.ts) omitted the persisted database fields `utcDateTime`, `timezoneOffsetSeconds`, and `disambiguation`.

As a direct consequence:
1. `astrologyService.calculateChartForProfile(profileId)` retrieved the saved profile from PostgreSQL with its persisted authoritative UTC instant, but passed it through `mapBirthProfileToBirthDetails()`.
2. The mapper discarded `utcDateTime`, `timezoneOffsetSeconds`, and `disambiguation`.
3. The resulting domain `BirthDetails` object contained only the local wall time (`year, month, day, hour, minute, second`) and IANA `timezone`.
4. The astrology engine's `normalizeBirthTime()` detected the absence of `utcDateTime` and fell back to dynamic resolution via `resolveLocalTimeToUtc()`.
5. For profiles born during an ambiguous fall-back transition (e.g., `America/New_York` `2020-11-01 01:30:00`), dynamic resolution failed with `BirthTimeAmbiguousError` because the user's previously chosen disambiguation was stripped.
6. For non-ambiguous profiles, dynamic resolution needlessly re-probed timezone transition tables, creating vulnerability to future IANA timezone database discrepancies.

In Phase 2A.4, `birth-details.mapper.ts` was corrected to preserve all authoritative temporal metadata, ensuring strict adherence to the persistence invariants.

---

## 2. Technical Modifications to `birth-details.mapper.ts`

### 2.1 Interface Update: `PrismaBirthProfileInput`
Lines 3–18 of [`apps/api/src/modules/astrology/birth-details.mapper.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/astrology/birth-details.mapper.ts#L3-L18):

```typescript
export interface PrismaBirthProfileInput {
  id: string;
  name: string;
  dateOfBirth: string; // Format: "YYYY-MM-DD"
  timeOfBirth: string; // Format: "HH:mm:ss"
  latitude: number;
  longitude: number;
  timezone: string;
  placeName?: string | null;
  country?: string | null;
  countryCode?: string | null;
  state?: string | null;
  disambiguation?: string | null;
  utcDateTime?: Date | string | null;
  timezoneOffsetSeconds?: number | null;
}
```

The database input interface now explicitly models the three authoritative temporal fields present in Prisma's `BirthProfile` model:
- `disambiguation`: Stored string (`'earlier'`, `'later'`, `'daylight'`, or `'standard'`).
- `utcDateTime`: Stored timestamp (`Date` or ISO string).
- `timezoneOffsetSeconds`: Stored integer offset in seconds (e.g., `-14400` or `-18000`).

### 2.2 Canonical Disambiguation Mapping
Lines 44–53:
```typescript
  // Canonicalize disambiguation
  let disambiguation: TimezoneDisambiguation | undefined = undefined;
  if (profile.disambiguation === 'earlier' || profile.disambiguation === 'later') {
    disambiguation = profile.disambiguation;
  } else if (profile.disambiguation === 'daylight') {
    disambiguation = 'earlier';
  } else if (profile.disambiguation === 'standard') {
    disambiguation = 'later';
  }
```
Canonicalizes legacy `'daylight'`/`'standard'` aliases into the canonical domain type `TimezoneDisambiguation` (`'earlier'` | `'later'`).

### 2.3 Authoritative UTC Instant Preservation
Lines 54–69:
```typescript
  // Preserve authoritative UTC instant as ISO string if present
  let utcDateTime: string | undefined = undefined;
  if (profile.utcDateTime) {
    if (profile.utcDateTime instanceof Date) {
      utcDateTime = !isNaN(profile.utcDateTime.getTime()) ? profile.utcDateTime.toISOString() : undefined;
    } else if (typeof profile.utcDateTime === 'string') {
      const d = new Date(profile.utcDateTime);
      utcDateTime = !isNaN(d.getTime()) ? d.toISOString() : undefined;
    }
  }

  const timezoneOffsetSeconds =
    profile.timezoneOffsetSeconds !== null && profile.timezoneOffsetSeconds !== undefined
      ? profile.timezoneOffsetSeconds
      : undefined;
```
Ensures valid `Date` objects from Prisma are mapped to standard ISO strings (`2020-11-01T05:30:00.000Z`) without altering the instant.

### 2.4 Domain `BirthDetails` Object Assembly
Lines 70–85:
```typescript
  const details: BirthDetails = {
    name: profile.name,
    dateOfBirth: profile.dateOfBirth,
    timeOfBirth: profile.timeOfBirth,
    date: { year, month, day },
    time: { hour, minute, second },
    timezone: profile.timezone,
    latitude: profile.latitude,
    longitude: profile.longitude,
    placeName: profile.placeName || undefined,
    disambiguation,
    utcDateTime,
    timezoneOffsetSeconds,
  };

  return details;
```

---

## 3. Direct Input Mapper Update

[`mapDirectBirthDetailsToBirthDetails`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/astrology/birth-details.mapper.ts#L88-L124) was similarly updated to accept and preserve optional `disambiguation`, `utcDateTime`, and `timezoneOffsetSeconds` for direct calculation requests, ensuring schema and DTO parity across both profile-based and ad-hoc calculation pipelines.

---

## 4. Preservation Rules and Fallback Behavior

| Scenario | Persisted State | Mapper Output | Downstream Execution |
|---|---|---|---|
| **Ambiguous Profile with Choice** | `utcDateTime: 2020-11-01T05:30:00.000Z`<br>`disambiguation: earlier` | `utcDateTime: "2020-11-01T05:30:00.000Z"`<br>`disambiguation: "earlier"` | Engine bypasses `resolveLocalTimeToUtc()`; directly computes Julian Day UT from authoritative instant. |
| **Standard Unambiguous Profile** | `utcDateTime: 1998-08-15T03:00:00.000Z`<br>`disambiguation: null` | `utcDateTime: "1998-08-15T03:00:00.000Z"`<br>`disambiguation: undefined` | Engine bypasses dynamic resolution; reproduces exact astronomical calculations. |
| **Legacy Profile (Missing UTC)** | `utcDateTime: null`<br>`disambiguation: null` | `utcDateTime: undefined`<br>`disambiguation: undefined` | Engine invokes `resolveLocalTimeToUtc()`. If ambiguous, raises `BirthTimeAmbiguousError` (HTTP 400 `AMBIGUOUS_LOCAL_TIME`). Never guesses. |

---

## 5. Verification Summary

- **Source Path:** `apps/api/src/modules/astrology/birth-details.mapper.ts`
- **TypeScript Strict Compliance:** Passed (`"strict": true`, 0 type errors).
- **Unit & Integration Tests:** 100% passing across `birth-profiles.test.ts` and `birth-profile-disambiguation-lifecycle.test.ts`.
