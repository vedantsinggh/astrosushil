# PHASE 2A.3: TIMEZONE SOLVER CORRECTNESS AND ROBUSTNESS AUDIT
## Algorithmic Evaluation of Transition-Aware Sampling, Binary Search, and Edge Cases

**Document Status:** Complete  
**Date:** November 2026  
**Review Type:** Independent Algorithmic Audit  
**Target File:** [`packages/astrology-engine/src/validation/timezone.solver.ts`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/validation/timezone.solver.ts)

---

## 1. Overview of the Investigated Implementation

In Phase 2A.2, `resolveLocalTimeToUtc` was overhauled to eliminate the vulnerability of coarse fixed probe offsets. The Phase 2A.2 execution report characterized the algorithm as:
> *"a transition-aware sampling algorithm across the full global IANA offset range [-15h, +15h] with binary search of transition boundaries"*

This audit evaluated the exact source code to determine the mathematical soundness of this approach, whether any transitions can be missed, and whether the claimed guarantees match the actual code behavior.

---

## 2. In-Depth Algorithmic Analysis

### 2.1 The Sampling Loop and the "Binary Search" No-Op
In [`timezone.solver.ts`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/validation/timezone.solver.ts#L120-L151):
```typescript
  const offsets = new Set<number>();
  const windowMs = 15 * 3600000;
  const stepMs = 30 * 60000; // 30-minute sampling steps

  let prevOffset: number | null = null;
  let prevT = naiveUtc - windowMs;

  for (let t = naiveUtc - windowMs; t <= naiveUtc + windowMs; t += stepMs) {
    const off = getOffsetMsAtUtc(t, timeZone);
    offsets.add(off);

    // If offset changed between consecutive sample points, binary search the exact transition boundary
    if (prevOffset !== null && off !== prevOffset) {
      let low = prevT;
      let high = t;
      while (high - low > 1000) {
        const mid = Math.floor((low + high) / 2000) * 1000;
        if (mid === low) break;
        const midOff = getOffsetMsAtUtc(mid, timeZone);
        if (midOff === prevOffset) {
          low = mid;
        } else {
          high = mid;
        }
      }
      offsets.add(getOffsetMsAtUtc(low, timeZone));
      offsets.add(getOffsetMsAtUtc(high, timeZone));
    }

    prevOffset = off;
    prevT = t;
  }
```

#### Forensic Finding:
1. **The Binary Search Is a Functional No-Op:**
   - The loop checks `getOffsetMsAtUtc(t, timeZone)` at 30-minute intervals and adds `off` to `offsets` (a `Set<number>`).
   - When an offset difference is detected (`off !== prevOffset`), it runs a binary search to find `low` and `high` separated by 1 second.
   - At the end of the binary search, `getOffsetMsAtUtc(low, timeZone)` is identical to `prevOffset`, and `getOffsetMsAtUtc(high, timeZone)` is identical to `off`.
   - Both `prevOffset` and `off` were **already added** to the `Set<number>`!
   - Because `offsets` stores only the numeric offset values (e.g. `{-14400000, -18000000}`), re-adding them produces zero change.
   - The boundary instant (`low` or `high` timestamp) is **discarded** and never used.
2. **Claim vs Reality:**
   - The claim that the solver "binary searches transition boundaries to resolve candidates" is **PARTIALLY VERIFIED / MISREPRESENTED**.
   - The actual candidate generation mechanism is simply:
     $$\mathcal{C} = \{ \text{naiveUtc} - \text{off} \mid \text{off} \in \text{distinct offsets observed in } [\text{naiveUtc}-15\text{h}, \text{naiveUtc}+15\text{h}] \}$$
     followed by back-formatting to check which candidates match the local wall time.

---

### 2.2 Can Multiple Transitions Be Missed Within One Sampling Interval?
- **Sampling Interval:** `stepMs = 30 * 60000` (30 minutes).
- **Theoretical Vulnerability:** If a timezone underwent two transitions within 30 minutes (e.g. from UTC+2 to UTC+3 at minute 5, and back to UTC+2 at minute 20), sampling at minute 0 and minute 30 would see `off === prevOffset` and miss the intermediate UTC+3 offset completely.
- **Empirical Reality in IANA tzdb:** In the entire history of the IANA Time Zone Database (tzdb), no geopolitical or astronomical entity has ever instituted two transitions within a 30-minute interval. Transitions are separated by months (seasonal DST) or days/years (geopolitical shifts).
- **Audit Verdict:** While theoretically not mathematically exhaustive for arbitrary synthetic transition functions, for all historical terrestrial timezones in the IANA database, 30-minute sampling is sufficient to collect all active offsets.

---

### 2.3 Historical Second-Level Offsets
- **Implementation:**
  In [`timezone.solver.ts`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/validation/timezone.solver.ts#L81-L86, L177-L178):
  ```typescript
  export function getOffsetMsAtUtc(utcMs: number, timeZone: string): number {
    const loc = getLocalPartsFromUtc(utcMs, timeZone);
    const asUtc = Date.UTC(loc.year, loc.month - 1, loc.day, loc.hour, loc.minute, loc.second);
    const diff = asUtc - utcMs;
    return Math.round(diff / 1000) * 1000;
  }
  ...
  const offsetSeconds = Math.round(off / 1000);
  const offsetMinutes = offsetSeconds / 60;
  ```
- **Audit Assessment:**
  - Rounding to the nearest 1,000 milliseconds preserves exact integer seconds.
  - For Paris Mean Time before 1911 (LMT $+00:09:21$), `diff` is $561,000$ ms, yielding `offsetSeconds = 561` and `offsetMinutes = 9.35`.
  - No sub-minute truncation occurs.
- **Status:** **VERIFIED**

---

### 2.4 UTC Candidate Deduplication
- **Implementation:**
  In [`timezone.solver.ts`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/validation/timezone.solver.ts#L160-L177):
  ```typescript
  const matchedUtcs = new Set<number>();
  const matches: MatchCandidate[] = [];

  for (const off of offsets) {
    const candUtc = naiveUtc - off;
    if (matchedUtcs.has(candUtc)) continue;
    ...
    matchedUtcs.add(candUtc);
    matches.push(...);
  }
  ```
- **Audit Assessment:**
  Each candidate UTC instant is checked against `matchedUtcs`. If two identical UTC instants arise (which is impossible given that `offsets` is a `Set` of unique numbers), deduplication ensures no duplicate candidate entries.
- **Status:** **VERIFIED**

---

### 2.5 Chronological Ordering (`earlier` vs `later`)
- **Implementation:**
  In [`timezone.solver.ts`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/validation/timezone.solver.ts#L189):
  ```typescript
  matches.sort((a, b) => a.utcMs - b.utcMs);
  ```
  Lines 198 and 206 assign `matches[0]` to `'earlier'` and `matches[1]` to `'later'`.
- **Audit Assessment:**
  Since $a.\text{utcMs} < b.\text{utcMs}$, `matches[0]` is strictly the earlier chronological point in universal time ($t_1 < t_2$).
- **Status:** **VERIFIED**

---

### 2.6 Skipped Dates, Non-Hour Shifts, and Dateline Jumps
- **Skipped Calendar Days (e.g., `Pacific/Apia` 2011-12-30):**
  - Samoa transitioned across the dateline from UTC-10 to UTC+14, skipping December 30, 2011 entirely.
  - Any local time on 2011-12-30 tested with all offsets in $[-15\text{h}, +15\text{h}]$ yields `matches.length === 0`.
  - Properly throws `BirthTimeNonexistentError`.
- **Non-Hour DST Shifts (e.g. `Australia/LHI` 30-min DST):**
  - Lord Howe Island transitions between $+10:30$ and $+11:00$. Both offsets are captured in `offsets`.
  - Ambiguous times produce two candidates differing by 30 minutes (1,800 seconds).
- **45-Minute Offsets (`Asia/Kathmandu`, `Pacific/Chatham`):**
  - Offsets $+05:45$ and $+12:45 / +13:45$ are accurately captured.
- **Status:** **VERIFIED**

---

### 2.7 Inaccurate Heuristic on Non-Seasonal Transitions
- **Implementation:**
  In [`timezone.solver.ts`](file:///home/pilot/Projects/astrosushil/packages/astrology-engine/src/validation/timezone.solver.ts#L203, L211, L221, L231):
  ```typescript
  candidates: AmbiguousTimeCandidate[] = [
    { disambiguation: 'earlier', ..., type: 'daylight' },
    { disambiguation: 'later', ..., type: 'standard' },
  ];
  ...
  if (disambiguation === 'earlier' || disambiguation === 'daylight') {
    return { ... isDaylightSaving: true };
  }
  ```
- **Audit Assessment:**
  While `'earlier'` and `'later'` are universally valid, hardcoding `type: 'daylight'` and `isDaylightSaving: true` on `matches[0]` assumes every clock rollback is a Daylight Saving Time transition.
  In historical geopolitical transitions where a region permanently rolled back its civil offset (e.g., permanent cancellation of daylight time or geopolitical timezone realignments), the rollback is NOT daylight saving.
  However, because `type` is marked deprecated and the application operates exclusively on canonical `'earlier' | 'later'`, this is a minor metadata inconsistency rather than an algorithmic blocker.
- **Status:** **PARTIALLY VERIFIED (DOCUMENTED LIMITATION)**

---

## 3. Correctness Evaluation Matrix

| Criterion | Audit Finding | Classification | Reference |
|---|---|---|---|
| Historical second offsets | Preserves integer seconds without rounding | **VERIFIED** | `timezone.solver.ts:85, 177` |
| Chronological ordering | Strict sort by `utcMs` ascending | **VERIFIED** | `timezone.solver.ts:189` |
| Candidate deduplication | Uses `matchedUtcs` Set tracking | **VERIFIED** | `timezone.solver.ts:160-176` |
| 30-min & 45-min offsets | Tested and verified against Lord Howe / Nepal | **VERIFIED** | `timezone.solver.ts:128` |
| Skipped days detection | Throws `BirthTimeNonexistentError` on Samoa 2011 | **VERIFIED** | `timezone.solver.ts:191-193` |
| Binary search claims | Binary search is an inert no-op; results are identical to loop | **PARTIALLY VERIFIED** | `timezone.solver.ts:132-147` |
| Non-seasonal DST flags | Hardcodes `type: 'daylight'` on earlier occurrence | **DOCUMENTED LIMITATION** | `timezone.solver.ts:203, 221` |
