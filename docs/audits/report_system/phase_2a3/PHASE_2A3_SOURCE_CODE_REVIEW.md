# PHASE 2A.3: SOURCE CODE VERIFICATION REPORT
## Forensic Inspection of Implementation, Mappers, Models, and Call Sites

**Document Status:** Complete  
**Date:** November 2026  
**Review Type:** Independent Read-Only Source Code Audit  
**Target Codebases:** `packages/astrology-engine`, `packages/shared`, `apps/api`, `apps/mobile`

---

## 1. Executive Summary

This independent source code verification evaluated the completed changes from Phase 2A.2 against the ten mandatory requirements in the specification. 

While significant progress was made—including the standardization of canonical `'earlier' | 'later'` disambiguation values, backward-compatible Zod parsing, Flutter candidate rendering, and Prisma schema expansion—a **critical architectural defect was identified**:
The database mapper bridging Prisma `BirthProfile` records to the astrology engine's `BirthDetails` domain model ([`birth-details.mapper.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/astrology/birth-details.mapper.ts#L21-L53)) **fails to map `utcDateTime`, `timezoneOffsetSeconds`, and `disambiguation`**.

As a direct consequence, every downstream service that calculates charts for a saved profile (`astrologyService.calculateChartForProfile`, `reportsService`, `predictionsService`, `guptaNadiService`, `reportWorkerService`):
1. **Recalculates UTC from local birth details** instead of using the persisted authoritative UTC instant.
2. **Crashes with `BirthTimeAmbiguousError`** when invoked on an ambiguous birth profile, even after the user successfully disambiguated and persisted the choice.

---

## 2. Requirement-by-Requirement Verification

### Requirement 1: Canonical Disambiguation Values (`earlier` | `later`)
- **Status:** **VERIFIED**
- **Evidence:**
  - In [`packages/astrology-engine/src/input/birth-details.ts`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/input/birth-details.ts#L13-L15):
    ```typescript
    export type TimezoneDisambiguation = 'earlier' | 'later' | 'daylight' | 'standard';
    ```
  - In [`apps/api/src/modules/birth-profiles/birth-profiles.schemas.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/birth-profiles/birth-profiles.schemas.ts#L52-L59):
    ```typescript
    disambiguation: z
      .preprocess(
        (val) => (val === 'daylight' ? 'earlier' : val === 'standard' ? 'later' : val),
        z.enum(['earlier', 'later'], {
          errorMap: () => ({ message: 'Disambiguation must be either "earlier" or "later"' }),
        })
      )
      .optional()
    ```
  - In [`apps/mobile/lib/features/birth_profile/models/birth_profile_model.dart`](file:///home/pilot/Projects/astrosushil/apps/mobile/lib/features/birth_profile/models/birth_profile_model.dart#L211):
    `disambiguation` is documented and serialized as canonical `'earlier' | 'later'`.

---

### Requirement 2: Handling of Legacy Aliases
- **Status:** **VERIFIED**
- **Evidence:**
  - Both `createBirthProfileSchema` and `updateBirthProfileSchema` in [`apps/api/src/modules/birth-profiles/birth-profiles.schemas.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/birth-profiles/birth-profiles.schemas.ts#L54) preprocess `'daylight'` $\to$ `'earlier'` and `'standard'` $\to$ `'later'`.
  - In [`packages/astrology-engine/src/validation/timezone.solver.ts`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/validation/timezone.solver.ts#L215-L233):
    ```typescript
    if (disambiguation === 'earlier' || disambiguation === 'daylight') { ... }
    if (disambiguation === 'later' || disambiguation === 'standard') { ... }
    ```
  - Incoming requests with legacy strings are accepted without runtime rejection and are persisted in the database as canonical `'earlier'` or `'later'`.

---

### Requirement 3: API Returns Both Valid Interpretations for Ambiguous Times
- **Status:** **VERIFIED**
- **Evidence:**
  - In [`packages/astrology-engine/src/validation/timezone.solver.ts`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/validation/timezone.solver.ts#L196-L213), both matched candidate instants are constructed and passed to `BirthTimeAmbiguousError(localIsoString, timeZone, candidates)`.
  - In [`apps/api/src/utils/birth-details-normalizer.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/utils/birth-details-normalizer.ts#L154-L165):
    `BirthTimeAmbiguousError` is caught and converted to a `ValidationError` with `candidates: err.candidates`.
  - In [`apps/api/src/errors/app-error.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/errors/app-error.ts) and Fastify error handler, the response emits HTTP 400 with `candidates` array containing both `'earlier'` and `'later'` interpretations with UTC ISO timestamps and exact offsets in seconds and minutes.

---

### Requirement 4: Flutter Displays Both Interpretations and Submits Selection
- **Status:** **VERIFIED**
- **Evidence:**
  - In [`apps/mobile/lib/core/errors/app_exception.dart`](file:///home/pilot/Projects/astrosushil/apps/mobile/lib/core/errors/app_exception.dart#L30-L55), `AmbiguousTimeCandidateModel` deserializes the candidate objects.
  - In [`apps/mobile/lib/features/birth_profile/screens/create_birth_profile_screen.dart`](file:///home/pilot/Projects/astrosushil/apps/mobile/lib/features/birth_profile/screens/create_birth_profile_screen.dart#L449-L491):
    Renders two `RadioListTile<String>` cards displaying:
    - Earlier occurrence (First pass before clock change) with exact UTC timestamp and UTC offset.
    - Later occurrence (Second pass after clock change) with exact UTC timestamp and UTC offset.
  - Tapping "Confirm Choice & Calculate Chart" (line 494) invokes `_submit()`, which populates `CreateBirthProfileDto.disambiguation` and re-submits the request.

---

### Requirement 5: Nonexistent Times Rejected Without Silent Modification
- **Status:** **VERIFIED**
- **Evidence:**
  - In [`packages/astrology-engine/src/validation/timezone.solver.ts`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/validation/timezone.solver.ts#L191-L193):
    Throws `BirthTimeNonexistentError(localIsoString, timeZone)` when `matches.length === 0`.
  - In [`apps/mobile/lib/features/birth_profile/screens/create_birth_profile_screen.dart`](file:///home/pilot/Projects/astrosushil/apps/mobile/lib/features/birth_profile/screens/create_birth_profile_screen.dart#L357-L401):
    Renders an informational warning banner: "Clock Change: Time Did Not Occur... Please check your official birth records or certificate and adjust the time above before proceeding."
  - The application strictly refuses to automatically bump the time forward or backward.

---

### Requirement 6: Original Local Birth Details Preserved
- **Status:** **VERIFIED**
- **Evidence:**
  - In [`apps/api/src/modules/birth-profiles/birth-profiles.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/birth-profiles/birth-profiles.service.ts#L38-L42):
    Stores `dateOfBirth: input.dateOfBirth` and `timeOfBirth: normalized.localDateTime.split('T')[1]` directly in the `birth_profiles` table.
  - In [`packages/astrology-engine/src/validation/birth-details.validator.ts`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/validation/birth-details.validator.ts#L127, L156):
    The returned `NormalizedBirthTime` encapsulates `originalDetails: validated` unmodified.
  - Database verification confirmed all 14 development profile birth details match the pre-migration baseline.

---

### Requirement 7: Authoritative Resolved UTC Instant Persisted
- **Status:** **VERIFIED**
- **Evidence:**
  - In [`apps/api/prisma/schema.prisma`](file:///home/pilot/Projects/astrosushil/apps/api/prisma/schema.prisma#L89-L90):
    `BirthProfile` model defines `utcDateTime DateTime?` and `timezoneOffsetSeconds Int?`.
  - In [`apps/api/src/modules/birth-profiles/birth-profiles.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/birth-profiles/birth-profiles.service.ts#L49-L50):
    `prisma.birthProfile.create` persists `utcDateTime: new Date(normalized.utcDateTime)` and `timezoneOffsetSeconds: normalized.timezoneOffsetSeconds`.
  - In [`packages/astrology-engine/src/validation/birth-details.validator.ts`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/validation/birth-details.validator.ts#L115-L135):
    If `validated.utcDateTime` is provided, `normalizeBirthTime` bypasses timezone resolution entirely and uses `utcDateTime` as authoritative.

---

### Requirement 8: Profile Lifecycle Uses Persisted UTC Instant
- **Status:** **DEFECT FOUND**
- **File & Line Reference:** [`apps/api/src/modules/astrology/birth-details.mapper.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/astrology/birth-details.mapper.ts#L3-L53)
- **Detailed Findings:**
  1. In `apps/api/src/modules/astrology/birth-details.mapper.ts`:
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
     }

     export function mapBirthProfileToBirthDetails(profile: PrismaBirthProfileInput): BirthDetails {
       ...
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
       };

       return details;
     }
     ```
  2. Notice that `PrismaBirthProfileInput` and `mapBirthProfileToBirthDetails` **omit `utcDateTime`, `timezoneOffsetSeconds`, and `disambiguation`**.
  3. When `astrologyService.calculateChartForProfile(birthProfileId)` is called:
     - It queries `profile = await prisma.birthProfile.findUnique({ where: { id: birthProfileId } })`.
     - It passes `profile` into `mapBirthProfileToBirthDetails(profile)`.
     - The returned `BirthDetails` has `utcDateTime: undefined`, `timezoneOffsetSeconds: undefined`, `disambiguation: undefined`.
     - It calls `this.calculator.calculateChart(birthDetails)`.
     - `calculateChart` calls `normalizeBirthTime(birthDetails)`.
     - `normalizeBirthTime` finds `validated.utcDateTime` is `undefined`, so it re-runs `resolveLocalTimeToUtc(year, month, day, hour, min, sec, timezone, undefined)`.
  4. **The Failure Impact:**
     - For **unambiguous profiles**: It recalculates UTC from naive local clock time, breaking the authoritative instant guarantee.
     - For **ambiguous profiles**: `resolveLocalTimeToUtc` receives `disambiguation: undefined` and throws `BirthTimeAmbiguousError`! Chart calculation and report generation fail completely for any ambiguous profile.
  5. **Why Phase 2A.2 Tests Missed This:**
     In `apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts` lines 136 and 192, the test manually invoked `calculator.calculateChart({ ... utcDateTime: retrieved.utcDateTime })`, bypassing `astrologyService.calculateChartForProfile` and `mapBirthProfileToBirthDetails`. In Sequence F (lines 309–321), it mocked a database row insertion into `prisma.report.create` rather than running the real report generation pipeline.

---

### Requirement 9: Legacy Unresolved Profiles Handled Explicitly
- **Status:** **VERIFIED**
- **Evidence:**
  - In [`apps/api/src/modules/birth-profiles/birth-profiles.service.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/birth-profiles/birth-profiles.service.ts#L136-L158, L204-L224):
    `getUserProfiles` and `getProfileById` wrap `normalizeBirthProfile` in a `try...catch` block.
  - If a legacy profile without disambiguation metadata throws `BirthTimeAmbiguousError`, it does **not** crash with HTTP 400. Instead, it marks `dto.disambiguationRequired = true` and returns the profile safely so the user can be prompted to resolve it.

---

### Requirement 10: No Unrelated Astrology Calculations or Report Logic Modified
- **Status:** **VERIFIED**
- **Evidence:**
  - Git diff analysis confirms that core calculation modules in `@astro/astrology-engine` (`ephemeris`, `chart-calculator.ts`, `shadbala`, `dasha`, `varshaphala`, `panchang`, `matchmaking`) were untouched.
  - Changes were strictly confined to timezone solving, input validation, and profile CRUD persistence.

---

## 3. Summary of Code Review Classifications

| Requirement | Audit Classification | Reference |
|---|---|---|
| 1. Canonical values (`earlier` \| `later`) | **VERIFIED** | `birth-details.ts:15`, `birth-profiles.schemas.ts:55` |
| 2. Backward compatibility for legacy aliases | **VERIFIED** | `birth-profiles.schemas.ts:54`, `timezone.solver.ts:215` |
| 3. API returns structured candidates | **VERIFIED** | `timezone.solver.ts:196`, `birth-details-normalizer.ts:154` |
| 4. Flutter displays candidate cards & retries | **VERIFIED** | `create_birth_profile_screen.dart:449-491` |
| 5. Nonexistent local time rejected | **VERIFIED** | `timezone.solver.ts:191`, `create_birth_profile_screen.dart:357` |
| 6. Original local details preserved | **VERIFIED** | `birth-details.validator.ts:127`, `birth-profiles.service.ts:38` |
| 7. Authoritative UTC instant persisted | **VERIFIED** | `schema.prisma:89`, `birth-profiles.service.ts:49` |
| 8. Persisted UTC used in chart/report calculations | **DEFECT FOUND** | `birth-details.mapper.ts:21-53` (drops `utcDateTime`) |
| 9. Legacy profiles return `disambiguationRequired` | **VERIFIED** | `birth-profiles.service.ts:136-158` |
| 10. Scope isolation maintained | **VERIFIED** | Git status and diff verification |
