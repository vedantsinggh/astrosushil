# Phase 2A.5: Source Diff and Mapper Integrity Review

**Audit Phase:** Phase 2A.5 (Final Closure Review)  
**Date:** 2026-11-03  
**Status:** Strictly Read-Only Forensic Verification  
**Reviewed Changes:** Phase 2A.4 modifications across API, Domain Engine, and Mobile Application

---

## 1. Executive Summary

Phase 2A.4 was initiated to resolve a critical defect uncovered during the Phase 2A.3 audit:
`mapBirthProfileToBirthDetails()` in `apps/api/src/modules/astrology/birth-details.mapper.ts` dropped persisted `utcDateTime`, `timezoneOffsetSeconds`, and `disambiguation` fields.

In this closure review, all Git diffs, type interfaces, schemas, and call sites across the Astro Sushil codebase were forensically inspected. The inspection verifies that:
1. `mapBirthProfileToBirthDetails()` preserves all authoritative UTC metadata without re-resolving or altering the instant.
2. `mapDirectBirthDetailsToBirthDetails()` preserves the same fields for direct inputs, maintaining complete API parity and backward compatibility.
3. The domain types in `@astro/astrology-engine` and the API validation schemas agree.
4. No other production astrology calculation mapper drops these fields.
5. Two diagnostic preview queries in `admin.service.ts` manually project a subset of fields and should be noted for future maintenance, but do not affect user-facing calculations or report generation.

---

## 2. Source-Level Diff Inspection

### 2.1 Interface & Mapper Correction: `birth-details.mapper.ts`
File: [`apps/api/src/modules/astrology/birth-details.mapper.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/astrology/birth-details.mapper.ts#L3-L85)

#### Added Fields to `PrismaBirthProfileInput`:
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

#### Mapping Logic in `mapBirthProfileToBirthDetails(profile)`:
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

**Verification:**
- `Date` objects returned by Prisma queries are converted to canonical ISO-8601 UTC strings (`.toISOString()`).
- Timezone offsets in integer seconds (`-14400`, `-18000`) are mapped directly.
- Disambiguation aliases (`'daylight'` / `'standard'`) are canonicalized to `'earlier'` / `'later'`.
- If `profile.utcDateTime` is `null` or `undefined` (as in unmigrated legacy records), `utcDateTime` evaluates to `undefined`, allowing downstream fallback to dynamic validation without silently guessing.

---

### 2.2 Direct Input Mapper & Schema Alignment
File: [`apps/api/src/modules/astrology/astrology.schemas.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/astrology/astrology.schemas.ts#L14-L16)
```typescript
export const directBirthDetailsSchema = z.object({
  name: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeOfBirth: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
  placeName: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  disambiguation: z.enum(['earlier', 'later', 'daylight', 'standard']).optional(),
  utcDateTime: z.string().optional(),
  timezoneOffsetSeconds: z.number().int().optional(),
});
```

File: [`apps/api/src/modules/astrology/birth-details.mapper.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/astrology/birth-details.mapper.ts#L88-L124)
```typescript
export function mapDirectBirthDetailsToBirthDetails(input: {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  placeName?: string | null;
  disambiguation?: TimezoneDisambiguation;
  utcDateTime?: string | Date;
  timezoneOffsetSeconds?: number;
}): BirthDetails { ... }
```

**Verification:**
- Domain contract: `BirthDetails` in `@astro/astrology-engine` specifies optional `disambiguation?: TimezoneDisambiguation`, `utcDateTime?: string`, `timezoneOffsetSeconds?: number`.
- API schema: `directBirthDetailsSchema` mirrors these optional fields.
- Backward compatibility: Existing clients sending only local wall-clock coordinates (`name`, `dateOfBirth`, `timeOfBirth`, `latitude`, `longitude`, `timezone`) continue to work without modification.

---

### 2.3 Exception Handling in `astrology.service.ts`
File: [`apps/api/src/modules/astrology/astrology.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/astrology/astrology.service.ts#L209-L231)
```typescript
    } catch (error: any) {
      if (error instanceof BirthTimeAmbiguousError) {
        throw new ValidationError(error.message, [
          {
            field: 'timeOfBirth',
            message: error.message,
            code: 'AMBIGUOUS_LOCAL_TIME',
            localIsoString: error.localIsoString,
            timezone: error.timezone,
            candidates: error.candidates,
          },
        ]);
      }
      if (error instanceof BirthTimeNonexistentError) {
        throw new ValidationError(error.message, [
          {
            field: 'timeOfBirth',
            message: error.message,
            code: 'NONEXISTENT_LOCAL_TIME',
            localIsoString: error.localIsoString,
            timezone: error.timezone,
          },
        ]);
      }
```

File: [`apps/api/src/errors/app-error.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/errors/app-error.ts#L2-L8)
```typescript
export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
  localIsoString?: string;
  timezone?: string;
  candidates?: any[];
  [key: string]: any;
}
```

**Verification:**
Direct calculation requests encountering ambiguous or nonexistent birth times return structured HTTP 400 responses with full candidate lists (`AMBIGUOUS_LOCAL_TIME`), enabling identical error-handling workflows for direct calculations and profile creations.

---

## 3. Comprehensive Audit of Profile-to-Domain Mappers

A repository-wide search was conducted for all call sites converting database `BirthProfile` records into domain models.

### 3.1 Primary Production Calculations
- [`apps/api/src/modules/astrology/astrology.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/astrology/astrology.service.ts#L146):
  `resolveBirthDetails()` calls `mapBirthProfileToBirthDetails(profile)`.
  Passes full `profile` record $\implies$ **All authoritative fields preserved**.
- [`apps/api/src/modules/rashi-bhavishya/rashi-bhavishya.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/rashi-bhavishya/rashi-bhavishya.service.ts#L75):
  `mapBirthProfileToBirthDetails(userProfile)` receives full Prisma record $\implies$ **All authoritative fields preserved**.
- [`apps/api/src/modules/reports/reports.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L390,L406):
  Calls `astrologyService.calculateChartForProfile()`, routing through `resolveBirthDetails()` $\implies$ **All authoritative fields preserved**.

### 3.2 Diagnostic Endpoints in `admin.service.ts`
In [`apps/api/src/modules/admin/admin.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/admin/admin.service.ts#L1426-L1435,L1642-L1650):
```typescript
// Line 1426: getBirthProfileDiagnostic
const birthDetails = mapBirthProfileToBirthDetails({
  id: profile.id,
  name: profile.name,
  dateOfBirth: profile.dateOfBirth,
  timeOfBirth: profile.timeOfBirth,
  latitude: profile.latitude,
  longitude: profile.longitude,
  timezone: profile.timezone,
  placeName: profile.placeName || undefined,
});

// Line 1642: getReportDiagnostic
const birthDetails = mapBirthProfileToBirthDetails({
  id: report.birthProfile.id,
  name: report.birthProfile.name,
  dateOfBirth: report.birthProfile.dateOfBirth,
  timeOfBirth: report.birthProfile.timeOfBirth,
  latitude: report.birthProfile.latitude,
  longitude: report.birthProfile.longitude,
  timezone: report.birthProfile.timezone,
});
```

**Finding:**
These two diagnostic admin methods manually construct an object literal omitting `utcDateTime`, `timezoneOffsetSeconds`, and `disambiguation` before calling `mapBirthProfileToBirthDetails`.
- **Impact:** Diagnostic previews in the admin panel for ambiguous profiles will trigger dynamic recalculation rather than displaying the exact persisted instant.
- **Scope Note:** Per `AGENTS.md` Section 6, the Admin Panel (`apps/admin`) is under Scope Freeze. However, `admin.service.ts` can be trivially updated in a future administrative maintenance pass by replacing the manual object literals with `mapBirthProfileToBirthDetails(profile)`.
- **User Impact:** Zero. No customer reports, Flutter views, public APIs, or payment/generation flows use `admin.service.ts`.

---

## 4. Flutter Linter Warning Resolution

In Phase 2A.3, two `prefer_const_constructors` warnings were reported at lines 370 and 417 in [`apps/mobile/lib/features/birth_profile/screens/create_birth_profile_screen.dart`](file:///home/pilot/Projects/astrosushil/apps/mobile/lib/features/birth_profile/screens/create_birth_profile_screen.dart).

In Phase 2A.4:
- Line 370: `const Row(...)` added for the informational warning banner.
- Line 417: `const Row(...)` added for the helper text row.

Running `flutter analyze lib/features/birth_profile/` confirms that both warnings were cleanly eliminated, leaving only 17 pre-existing Flutter 3.32+ deprecation notices (`withOpacity`, `RadioListTile.groupValue`).
