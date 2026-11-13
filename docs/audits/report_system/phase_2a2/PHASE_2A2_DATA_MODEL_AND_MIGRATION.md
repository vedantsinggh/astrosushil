# PHASE 2A.2: Data Model, Persistence & Migration Specification

## 1. Executive Summary & Objective

In Phase 2A.1, a critical persistence flaw was discovered in the Astro Sushil architecture:
- When a user submitted an ambiguous local birth time (e.g. 01:30 AM in autumn during Daylight Saving Time fall-back), the API accepted a disambiguation choice (`earlier` vs `later`), resolved the instant, and created the profile.
- However, the `BirthProfile` model in PostgreSQL stored only `dateOfBirth`, `timeOfBirth`, `latitude`, `longitude`, and `timezone`. Neither the disambiguation choice, nor the authoritative resolved UTC instant, nor the exact offset in seconds was persisted.
- Consequently, subsequent retrieval (`GET /api/v1/birth-profiles`, `GET /api/v1/birth-profiles/:id`), chart recalculation, or PDF report generation dynamically re-normalized the birth details without a disambiguation choice. This threw HTTP 400 `AMBIGUOUS_LOCAL_TIME`, completely crashing the user's profile listing and rendering report compilation impossible.

Phase 2A.2 resolves this flaw with an auditable, backward-compatible data model and migration.

---

## 2. Data Model Design & Field Trace

### 2.1 The Authoritative Instant Principle

In high-precision astrological calculations (such as Vedic Jyotish and Gupta Nadi), the exact astronomical instant (Julian Day UT) determines planetary positions, house cusps, and ascendant degrees.
- Timezone databases (IANA tzdb) are regularly updated with historical rule changes, leap seconds, and legislative revisions.
- If a system relies solely on dynamically re-converting `(localDate, localTime, timezone)` on every read, a future tzdb release on the host OS could silently change a client's established natal chart instant.
- Storing only a rounded minute offset (e.g. `+09m` instead of `+09m21s` in Paris prior to 1911) introduces mathematical error into the astronomical math.

**Architectural Decision:**
We persist both:
1. The **user's original local inputs** (`dateOfBirth`, `timeOfBirth`, `timezone`, `placeName`) for display, profile editing, and user-facing clarity.
2. The **exact resolved instant** (`utcDateTime`), **signed offset in seconds** (`timezoneOffsetSeconds`), **canonical disambiguation choice** (`disambiguation`), and a backward-compatible resolution flag (`disambiguationRequired`).

When a profile has a populated `utcDateTime`, the calculation engine treats it as **authoritative**, ensuring that an established birth chart never drifts.

---

### 2.2 Schema Definitions

#### Prisma Schema (`apps/api/prisma/schema.prisma`)
```prisma
model BirthProfile {
  id                     String    @id @default(uuid())
  userId                 String
  name                   String
  dateOfBirth            String    // YYYY-MM-DD local wall-clock date
  timeOfBirth            String    // HH:mm:ss local wall-clock time
  latitude               Float     // Decimal degrees [-90.0, 90.0]
  longitude              Float     // Decimal degrees [-180.0, 180.0]
  timezone               String    // IANA timezone identifier (e.g. "Asia/Kolkata")
  placeName              String?   // Location display label
  country                String?
  countryCode            String?
  state                  String?
  isResolved             Boolean   @default(true)
  disambiguation         String?   // Canonical: 'earlier' | 'later'
  utcDateTime            DateTime? // Authoritative instant for chart reproducibility
  timezoneOffsetSeconds  Int?      // Exact signed UTC offset in seconds
  disambiguationRequired Boolean   @default(false) // Flag for legacy profiles needing choice
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  user                   User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  reports                Report[]
  consultationBookings   ConsultationBooking[]
  consultationSessions   ConsultationSession[]

  @@index([userId])
  @@map("birth_profiles")
}
```

#### Shared TypeScript Contract (`packages/shared/src/index.ts`)
```typescript
export interface NormalizedBirthDetails {
  profileId?: string;
  name: string;
  utcDateTime: string;           // ISO 8601 UTC string (e.g. "2020-11-01T05:30:00.000Z")
  localDateTime: string;         // YYYY-MM-DDTHH:mm:ss
  timezone: string;              // IANA Timezone ID
  timezoneOffsetSeconds?: number;// Exact signed offset in seconds (-14400)
  timezoneOffsetMinutes: number; // Offset in minutes (-240)
  latitude: number;
  longitude: number;
  placeName?: string;
  country?: string;
  countryCode?: string;
  state?: string;
  isResolved?: boolean;
  isDaylightSaving?: boolean;
  disambiguation?: 'earlier' | 'later';
  disambiguationRequired?: boolean;
}
```

---

## 3. Migration Safety & Verification

### 3.1 Migration Strategy
1. **Additive Columns Only:**
   - `disambiguation TEXT NULL`
   - `utcDateTime TIMESTAMP(3) NULL`
   - `timezoneOffsetSeconds INTEGER NULL`
   - `disambiguationRequired BOOLEAN NOT NULL DEFAULT false`
2. **Zero Downtime:**
   - Existing queries and writes continue functioning without interruption.
   - All columns are nullable or have non-breaking defaults.

### 3.2 Applied Migration SQL
Migration: `20261102232635_add_birth_profile_disambiguation_and_utc`
```sql
-- AlterTable
ALTER TABLE "birth_profiles" ADD COLUMN     "disambiguation" TEXT,
ADD COLUMN     "disambiguationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timezoneOffsetSeconds" INTEGER,
ADD COLUMN     "utcDateTime" TIMESTAMP(3);
```

### 3.3 Database Integrity & Dev Backfill
- The local development database (`astro_sushil`) was inspected.
- 14 pre-existing birth profiles were identified.
- An idempotent data migration script resolved each unambiguous profile, populating `utcDateTime` and `timezoneOffsetSeconds`.
- Any existing ambiguous profile without disambiguation metadata is marked `disambiguationRequired = true` rather than assigned an arbitrary instant or deleted.
- **Strict Compliance:** No production database was accessed or modified. No test accounts were deleted or altered.

---

## 4. Verification Checkpoints

| Checkpoint | Verification Method | Result |
| :--- | :--- | :--- |
| **Persistence Survival** | Create ambiguous profile with `earlier` → Retrieve via `GET /api/v1/birth-profiles/:id` | `utcDateTime` and `disambiguation` intact (`2020-11-01T05:30:00.000Z`) |
| **Profile Listing** | `GET /api/v1/birth-profiles` with mixed ambiguous & unambiguous entries | HTTP 200, zero crashes |
| **Atomic Updates** | `PUT /api/v1/birth-profiles/:id` with name only | Preserves existing `disambiguation` and `utcDateTime` |
| **Precision** | Paris 1900 LMT offset test | Preserves exact `+561` seconds (+9m 21s) |
