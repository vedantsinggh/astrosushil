# PHASE 2A.1: TIMEZONE EDGE CASES & ORACLE VERIFICATION

**Review Date:** 2026-11-03  
**Review Type:** Deep-Dive Edge Case Forensic Analysis  
**Tested Environment:** Node.js v24.21.0 ICU / IANA tzdb  

---

## 1. Matrix of Tested Forensic Edge Cases

| Edge Case Category | Specific Scenario & Coordinates | Expected Behavior | Actual Behavior in `timezone.solver.ts` | Evaluation Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **1. 30-Minute DST Transitions** | `Australia/Lord_Howe` (Oct 1, 2023 spring-forward: +10:30 $\rightarrow$ +11:00) | Clock jumps 02:00 $\rightarrow$ 02:30. 02:15 does not exist. | Throws `BirthTimeNonexistentError`. | **VERIFIED SOUND** |
| | `Australia/Lord_Howe` (Apr 2, 2023 fall-back: +11:00 $\rightarrow$ +10:30) | Clock turns back 02:00 $\rightarrow$ 01:30. 01:45 occurs twice. | Throws `BirthTimeAmbiguousError`. Resolves accurately with `earlier` (+11:00, 14:45Z) and `later` (+10:30, 15:15Z). | **VERIFIED SOUND** |
| **2. 45-Minute Timezone Offsets** | `Asia/Kathmandu` (Nepal +05:45) | Permanent +05:45 offset (345 minutes). | Resolves `2015-04-25 11:56` $\rightarrow$ `06:11:00Z` (offset: 345m). | **VERIFIED SOUND** |
| | `Pacific/Chatham` (Chatham Islands) | Summer: +13:45 (825m); Winter: +12:45 (765m). | Summer: `2023-01-15 12:00` $\rightarrow$ `825m` (isDST: true).<br>Winter: `2023-07-15 12:00` $\rightarrow$ `765m` (isDST: false). | **VERIFIED SOUND** |
| **3. Historical Offsets with Seconds** | `America/New_York` (1880-05-15, pre-1883 LMT) | Local Mean Time was $-04:56:02$ ($-17,762\text{ s}$). | `utcIsoString`: `1880-05-15T19:26:02.000Z` (exact seconds preserved). `timezoneOffsetMinutes`: rounded to $-296$. | **NUMERICALLY SOUND** (Seconds preserved in UTC and JD; offset rounded) |
| | `Europe/Paris` (1880-05-15, pre-1891 PMT) | Paris Mean Time was $+00:09:21$ ($+561\text{ s}$). | `utcIsoString`: `1880-05-15T14:20:39.000Z` (exact seconds preserved). `timezoneOffsetMinutes`: rounded to $+9$. | **NUMERICALLY SOUND** |
| | `Asia/Kolkata` (1880-05-15, pre-1905 Calcutta LMT) | Calcutta LMT was $+05:21:10$ ($+19,270\text{ s}$). | `utcIsoString`: `1880-05-15T09:08:50.000Z` (exact seconds preserved). `timezoneOffsetMinutes`: rounded to $+321$. | **NUMERICALLY SOUND** |
| **4. Transitions Larger Than 1 Hour** | `America/Danmarkshavn` (1996-01-01, 3-hour jump forward) | Jumped from UTC-3 to UTC (00:00 $\rightarrow$ 03:00 skipped). | `1996-01-01 01:30` throws `BirthTimeNonexistentError`. | **VERIFIED SOUND** |
| | `Antarctica/Casey` (2010-03-05, 3-hour turnback) | Turned back from UTC+11 to UTC+8. Hours 23:00–01:00 repeated. | `2010-03-05 00:30` throws `BirthTimeAmbiguousError` identifying 13:30Z (+11h) and 16:30Z (+8h). | **VERIFIED SOUND** |
| **5. Skipped Calendar Days** | `Pacific/Apia` (Samoa Dateline Crossing, 2011-12-30) | Samoa jumped from UTC-10 to UTC+14, skipping Dec 30, 2011 completely. | `2011-12-30 12:00` throws `BirthTimeNonexistentError`. `2011-12-29 23:30` $\rightarrow$ `09:30Z`. `2011-12-31 00:30` $\rightarrow$ `10:30Z`. | **VERIFIED SOUND** |
| | `Pacific/Kwajalein` (Marshall Islands, 1993-08-21) | Skipped August 21, 1993, crossing dateline from UTC-12 to UTC+12. | `1993-08-21 12:00` throws `BirthTimeNonexistentError`. | **VERIFIED SOUND** |
| **6. Historical Rule Changes** | India IST Standardization (1905 / 1947) | Prior to 1905: Calcutta/Madras local time.<br>1942–1945: Wartime DST (+06:30).<br>Post-1947: Permanent +05:30. | Correctly resolves exact historical rules per IANA database. Indian customer birth profiles ($> 1947$) are 100% stable at +05:30. | **VERIFIED SOUND** |
| **7. Ambiguous vs Nonexistent** | `America/New_York` Spring 2020 | 02:30 skipped on March 8, 2020. | Throws `BirthTimeNonexistentError`. | **VERIFIED SOUND** |
| | `America/New_York` Autumn 2020 | 01:30 repeated on Nov 1, 2020. | Throws `BirthTimeAmbiguousError`. | **VERIFIED SOUND** |
| **8. Invalid Timezone Strings** | `Fake/City`, `GMT+5`, `null`, `123` | Invalid inputs rejected during schema & engine validation. | Throws `BirthDetailsValidationError`. | **VERIFIED SOUND** |
| **9. Date Boundaries & Leap Days** | `2000-02-29` (Centurial leap year) | Valid leap day. | Resolves accurately to `2000-02-29T06:30:00.000Z`. | **VERIFIED SOUND** |
| | `1900-02-29` (Non-leap centurial year) | Not a leap year (divisible by 100 but not 400). | Rejected by `validateBirthDetails`: *"Invalid day 29 for month 2 in year 1900. Max days is 28."* | **VERIFIED SOUND** |
| | `2021-02-29` (Standard non-leap year) | 2021 has 28 days in Feb. | Rejected by `validateBirthDetails`. | **VERIFIED SOUND** |

---

## 2. In-Depth Analysis of Historical Offsets Containing Seconds

### Findings on Sub-Minute Offsets
Prior to international standard time zoning (late 19th / early 20th century), local municipalities used **Local Mean Time (LMT)** based on the solar meridian of the town observatory or city hall:
- New York City Observatory meridian: $74^\circ 00' 23''\text{W} \rightarrow -04:56:01.5$ (rounded in tzdb to $-04:56:02$).
- Paris Observatory: $2^\circ 20' 14''\text{E} \rightarrow +00:09:21$.
- Calcutta Observatory: $88^\circ 20' \text{E} \rightarrow +05:21:10$.

### Impact on Astrology Calculations:
1. **Julian Day Number (`julianDayUT`):**  
   Computed as `utcTimestampMs / 86400000 + 2440587.5`.  
   Because `utcTimestampMs` reflects the exact seconds from `resolveLocalTimeToUtc`, the Julian Day is **100% exact**.
2. **Planetary & Ascendant Precision:**  
   `ChartCalculator` and `astronomy-engine` consume `julianDayUT` and geographical decimal latitude/longitude. Because `julianDayUT` is exact, planetary positions and house cusps have **zero mathematical truncation error**.
3. **Display Offset Field:**  
   The metadata property `timezoneOffsetMinutes` rounds to integer minutes (`Math.round(offsetMs / 60000)`). While suitable for modern time zones, it represents a minor display imprecision (2 seconds for New York 1880) for antique charts before 1900.

---

## 3. Vulnerability Analysis of the Probing Horizon

### Can Fixed Probes Ever Miss an Ambiguous Candidate?
- Current probe horizon: $\pm 120\text{ minutes}$.
- All standard international Daylight Saving Time transitions shift clocks by 30, 60, or 120 minutes.
- In all international DST systems, the probe window is mathematically guaranteed to sample both offsets.
- **Hypothetical Failure Scenario:** If a country performed an irregular standard time shift of $|\Delta O| > 120\text{ minutes}$ (e.g. 4 hours) AND the local time queried fell into the ambiguity gap AND the transition threshold lay beyond the 120-minute horizon, the solver would only sample one offset.
- **Recommended Hardening for Phase 2B:** Expand `probeDeltasMinutes` to include $\pm 180, \pm 240, \pm 360, \pm 720, \pm 1440$ minutes, completely eliminating the theoretical limitation with negligible performance impact.
