# PHASE 2A.2: FLUTTER DISAMBIGUATION UX SPECIFICATION
## Mobile Resolution Workflow, Nonexistent Time Handling, and State Retention

**Document Status:** Complete  
**Date:** November 2026  
**Audience:** Mobile Engineers, Product Designers, QA Engineers  
**Target Codebase:** `apps/mobile`

---

## 1. Overview of the Problem & Solution

In Phase 2A.1, when a user entered a birth time during a Daylight Saving Time fall-back transition (for instance, 1:30 AM in New York on November 5, 2023), the backend rejected the request with HTTP 400 `AMBIGUOUS_LOCAL_TIME`. The Flutter app had:
1. No field in `CreateBirthProfileDto` or `BirthProfileModel` for `disambiguation`.
2. No parser for candidate instants in `AppException`.
3. No UI mechanism for the user to pick an occurrence. The user was permanently blocked from creating or updating their profile.

Phase 2A.2 implements a non-technical, user-friendly resolution flow that directly presents the real-world choices, retains the user's choice across retries, and clearly explains clock changes without confusing acronyms or jargon.

---

## 2. Flutter Architectural Integration

### 2.1 Exception Model (`lib/core/errors/app_exception.dart`)
`AppException` parses the backend's structured `details` array and extracts candidate options:
```dart
class AmbiguousTimeCandidateModel {
  final String disambiguation; // 'earlier' or 'later'
  final DateTime utcDateTime;
  final int timezoneOffsetSeconds;
  final int offsetMinutes;
  final String? type;

  String get formattedOffset {
    final totalMinutes = (timezoneOffsetSeconds / 60).round();
    final sign = totalMinutes >= 0 ? '+' : '-';
    final absMin = totalMinutes.abs();
    final h = (absMin ~/ 60).toString().padLeft(2, '0');
    final m = (absMin % 60).toString().padLeft(2, '0');
    return 'UTC $sign$h:$m';
  }
}
```

### 2.2 DTO & Model Expansion (`lib/features/birth_profile/models/birth_profile_model.dart`)
- `CreateBirthProfileDto` includes `disambiguation` (`'earlier' | 'later'`).
- `BirthProfileModel` includes `disambiguation`, `utcDateTime`, `timezoneOffsetSeconds`, and `disambiguationRequired`.
- `NormalizedDetailsModel` preserves the resolved UTC instant and exact offset.

### 2.3 Provider State Management (`lib/features/birth_profile/providers/birth_profile_provider.dart`)
- `BirthProfilesState` stores `lastValidationException: AppException?`.
- When an API call throws a `ValidationException`, the structured candidates are preserved in the provider state so UI forms can dynamically present resolution cards.

---

## 3. Disambiguation User Experience (`create_birth_profile_screen.dart`)

### 3.1 Ambiguous Local Time UI (`AMBIGUOUS_LOCAL_TIME`)
When the backend returns `AMBIGUOUS_LOCAL_TIME`, the form renders an interactive resolution card:

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Birth Time Occurred Twice                               │
│  The time 01:30 in America/New_York occurred twice on this  │
│  date because the clocks were set back 1 hour. Please       │
│  select which occurrence applies to your birth:             │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🔘 Earlier Occurrence (First Time)                     │  │
│  │    Occurred before the clock change                   │  │
│  │    Exact Time: 2023-11-05 05:30:00 UTC (UTC -04:00)   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ⚪ Later Occurrence (Second Time)                      │  │
│  │    Occurred after the clock change                    │  │
│  │    Exact Time: 2023-11-05 06:30:00 UTC (UTC -05:00)   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [ Save & Calculate Chart ]                                 │
└─────────────────────────────────────────────────────────────┘
```

#### UI Elements:
1. **Entered Local Time & Timezone:** Clearly displays the user's input (`01:30 in America/New_York`).
2. **Clear Plain English:** Explains that the clock was turned back 1 hour, without forcing users to decode "Daylight Saving Time" or astronomical jargon.
3. **Selectable Cards:**
   - Card 1: **Earlier Occurrence (First Time)** — shows the exact UTC instant and the corresponding UTC offset (`UTC -04:00`).
   - Card 2: **Later Occurrence (Second Time)** — shows the exact UTC instant and the shifted UTC offset (`UTC -05:00`).
4. **Immediate Retry:** Tapping either card updates the selected state (`_selectedDisambiguation = 'earlier' | 'later'`). Tapping "Save & Calculate Chart" automatically re-submits the form with `disambiguation` attached.

### 3.2 Nonexistent Local Time UI (`NONEXISTENT_LOCAL_TIME`)
When the user enters a birth time during a spring-forward transition gap (e.g., 2:30 AM in New York on March 10, 2024):

```
┌─────────────────────────────────────────────────────────────┐
│  ❌ Birth Time Did Not Exist                                │
│  The time 02:30 in America/New_York did not occur on this   │
│  date because the clocks moved forward 1 hour (skipping     │
│  from 02:00 to 03:00).                                      │
│                                                             │
│  Please verify your birth certificate or family records     │
│  and enter the corrected local birth time.                  │
└─────────────────────────────────────────────────────────────┘
```

#### Safety Principles:
- **No Automatic Adjustment:** The system strictly refuses to automatically bump the time forward to 03:00 or back to 01:59. In Vedic and Gupta Nadi astrology, an artificial shift of 30 minutes alters the Ascendant degree by $\approx 7.5^\circ$, completely corrupting the divisional charts (D9, D10) and dasha timing.
- **Actionable Guidance:** Prompts the user to check birth records.

### 3.3 State Retention on Unrelated Errors
If the user selects "Earlier Occurrence" and submits, but the request fails due to an unrelated error (e.g. network timeout or server 500):
- `_selectedDisambiguation` is stored in the widget's local state.
- The selection is **not cleared**.
- When the user retries, the previously chosen disambiguation is re-transmitted automatically without requiring the user to re-select it.

---

## 4. Verification and Mobile Test Coverage

1. **Compilation Analysis:**
   ```bash
   flutter analyze lib/features/birth_profile/ lib/core/errors/
   # Result: 0 issues found.
   ```
2. **Widget Test Integrity:**
   Existing tests (`home_screen_test.dart`, `birth_profile_list_screen_test.dart`) continue to pass without regression.
3. **End-to-End Simulation:**
   Verified in backend integration tests (`tests/integration/birth-profile-disambiguation-lifecycle.test.ts` Sequence I) that the exact payload format produced by `CreateBirthProfileDto.toJson()` with `'earlier'` resolves the ambiguous birth time and persists it successfully.
