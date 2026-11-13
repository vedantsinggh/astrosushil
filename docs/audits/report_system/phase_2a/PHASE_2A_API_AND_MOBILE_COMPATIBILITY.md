# PHASE 2A: API & MOBILE COMPATIBILITY SPECIFICATION

**Document Version:** 1.0.0  
**Target Subsystems:** `apps/api`, `apps/mobile`, `packages/shared`  

---

## 1. REST API Contract & Backward Compatibility

### Zero Breaking Changes for Standard Birth Profiles
Over $99.98\%$ of human birth dates fall on unambiguous calendar times. For all unambiguous times (and 100% of Indian profiles), API request payloads and response contracts remain strictly unchanged.

### Schema Extension: Optional `disambiguation` Parameter
In `apps/api/src/modules/birth-profiles/birth-profiles.schemas.ts`, `createBirthProfileSchema` and `updateBirthProfileSchema` have been extended with an optional field:
```typescript
export const createBirthProfileSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  dateOfBirth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/),
  timeOfBirth: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(1),
  // Optional Phase 2A disambiguation field
  disambiguation: z.enum(['earlier', 'later', 'daylight', 'standard']).optional(),
  placeName: z.string().max(200).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  countryCode: z.string().max(10).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  isResolved: z.boolean().optional(),
});
```

---

## 2. Structured Error Responses

In compliance with `AGENTS.md` Directives (Section 5: Standardized Machine-Readable Error Responses), birth time errors return structured 400 Bad Request payloads:

### A. Nonexistent Spring-Forward Time
When a user submits a time within the Daylight Saving Time spring-forward jump gap:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nonexistent local birth time: \"2020-03-08T02:30:00\" does not exist in timezone \"America/New_York\" because clocks jumped forward for Daylight Saving Time.",
    "details": [
      {
        "field": "timeOfBirth",
        "message": "Nonexistent local birth time: \"2020-03-08T02:30:00\" does not exist in timezone \"America/New_York\" because clocks jumped forward for Daylight Saving Time.",
        "code": "NONEXISTENT_LOCAL_TIME"
      }
    ],
    "requestId": "req_abc123"
  }
}
```

### B. Ambiguous Autumn Fall-Back Time
When a user submits a time during the repeated 1-hour autumn fall-back window without `disambiguation`:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Ambiguous local birth time: \"2020-11-01T01:30:00\" occurs twice in timezone \"America/New_York\" due to Daylight Saving Time autumn fall-back. Explicit disambiguation choice (\"earlier\" / \"later\" or \"daylight\" / \"standard\") is required. Candidates: [2020-11-01T05:30:00.000Z (daylight, offset: -240m), 2020-11-01T06:30:00.000Z (standard, offset: -300m)].",
    "details": [
      {
        "field": "timeOfBirth",
        "message": "Ambiguous local birth time: \"2020-11-01T01:30:00\" occurs twice in timezone \"America/New_York\" due to Daylight Saving Time autumn fall-back. Explicit disambiguation choice (\"earlier\" / \"later\" or \"daylight\" / \"standard\") is required. Candidates: [2020-11-01T05:30:00.000Z (daylight, offset: -240m), 2020-11-01T06:30:00.000Z (standard, offset: -300m)].",
        "code": "AMBIGUOUS_LOCAL_TIME"
      }
    ],
    "requestId": "req_xyz789"
  }
}
```

---

## 3. Flutter Mobile Client Compatibility

### Inspection of `apps/mobile/lib/features/birth_profile/`
1. `create_birth_profile_screen.dart` submits local calendar date (`dateOfBirth`: `YYYY-MM-DD`) and clock time (`timeOfBirth`: `HH:mm:ss`) along with the location's IANA timezone.
2. In the overwhelming majority of cases ($> 99.98\%$), the existing form succeeds identically.
3. For the rare edge case where a user enters an ambiguous birth time:
   - The backend returns HTTP 400 with `code: "AMBIGUOUS_LOCAL_TIME"`.
   - The mobile UI displays the backend validation message prompting the user to clarify whether birth occurred before or after the clock changeover.
4. **Mobile UX Change Required in Phase 2A:** Minimum compatible change.
   - The API handles the optional parameter cleanly.
   - Flutter models do not require schema breaking changes.
   - `astrology_hub_screen.dart:174` attribution text was updated to remove Swiss Ephemeris.

---

## 4. Database Schema Impact & Record Integrity

1. **Prisma Schema (`schema.prisma`):**
   - The `BirthProfile` model persists:
     - `dateOfBirth String` (`YYYY-MM-DD`)
     - `timeOfBirth String` (`HH:mm:ss`)
     - `timezone String`
     - `latitude Float`, `longitude Float`
   - Normalized UTC timestamps are computed deterministically on-the-fly and cached in Redis.
   - **Zero Prisma migrations or database schema changes are required.**
2. **Database Record Preservation:**
   - In accordance with Phase 2A directives, zero database records were modified or deleted.
