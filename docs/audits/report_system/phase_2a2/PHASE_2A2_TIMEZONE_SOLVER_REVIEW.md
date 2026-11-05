# PHASE 2A.2: TIMEZONE SOLVER ROBUSTNESS REVIEW
## Transition-Aware Solvers, Historical Offset Analysis, and Architectural Invariants

**Document Status:** Complete  
**Date:** November 2026  
**Audience:** Core Systems Architects, Astrology Engine Engineers  
**Target File:** `packages/astrology-engine/src/validation/timezone.solver.ts`

---

## 1. Background & Problem Statement

In Phase 2A.1, the timezone solver was evaluated. The legacy implementation probed a fixed set of candidate offsets (e.g. $+0, \pm 1, \pm 2$ hours around standard offsets). While adequate for standard 1-hour North American and European DST transitions, this approach had several potential failure modes:
1. **Fixed Discrete Grid Assumption:** Probing integer hours or 30-minute intervals fails when historical transitions involve seconds (e.g. Paris Mean Time $+00:09:21$ before 1911).
2. **Dateline and Multi-Hour Jumps:** Geopolitical shifts can jump 24 hours (e.g., Samoa skipping December 30, 2011 entirely) or shift clocks by 2 or more hours.
3. **Double Counting / Missed Candidates:** Fixed grids can sample the same local minute twice without detecting whether a transition boundary occurred between sampling points.

Phase 2A.2 conducted an investigation into transition-aware resolution algorithms, historical offset boundaries, and the behavioral boundaries of Node.js / V8's `Intl.DateTimeFormat` engine.

---

## 2. Investigation of Historical and Geographic Edge Cases

### 2.1 30-Minute and 45-Minute Offsets
- **Lord Howe Island (`Australia/LHI`):** Uses a 30-minute DST shift ($+10:30$ standard to $+11:00$ daylight).
- **Nepal (`Asia/Kathmandu`):** Constant $+05:45$ offset.
- **Chatham Islands (`Pacific/Chatham`):** $+12:45$ standard to $+13:45$ daylight (45-minute base offset with 1-hour DST).
- **Evaluation:** Probing in 1-hour steps fails for Lord Howe Island. The solver must sample or evaluate at sub-hour resolutions or use exact offset lookup.

### 2.2 Historical Offsets with Discrete Seconds
Prior to standardized railroad time in the late 19th and early 20th centuries, cities used Local Mean Time (LMT) derived from their exact longitude.
- **Paris (`Europe/Paris`):** Prior to March 11, 1911, Paris civil time was Paris Mean Time: $+00:09:21$ ($+561$ seconds).
- **Amsterdam (`Europe/Amsterdam`):** Used $+00:19:32.13$ until 1937, rounded to $+00:20$ until 1940.
- **Evaluation:** A timezone solver that stores only integer minutes truncates or rounds offsets, introducing up to several minutes of error in the calculated Julian Day and planetary longitudes.
  $$\Delta t = 39\text{ seconds} \implies \Delta \text{Ascendant} \approx 10\text{ arcminutes}$$

### 2.3 Transitions Greater than Two Hours & Skipped Calendar Days
- **Pacific/Apia (Samoa, December 2011):** At the end of December 29, 2011, Samoa shifted across the International Date Line to align trading days with Australasia. Clocks skipped directly from 23:59:59 on December 29 to 00:00:00 on December 31. **December 30, 2011 did not exist** in Samoa.
- **Evaluation:** Probing $[-15\text{h}, +15\text{h}]$ around naive UTC correctly detects zero valid UTC instants for December 30, 2011 in `Pacific/Apia`, throwing `NONEXISTENT_LOCAL_TIME`.

---

## 3. Transition-Aware Sampling Algorithm (`timezone.solver.ts`)

To overcome the vulnerabilities of coarse fixed grids without introducing bulky external timezone libraries, Phase 2A.2 implemented a **Continuous Window Sampling with Binary Search Refinement** algorithm.

### 3.1 Mathematical Formulation
Let:
- $L = (Y, M, D, H, m, s)$ be the target local wall-clock components.
- $T_{\text{naive}} = \text{Date.UTC}(Y, M-1, D, H, m, s)$ be the naive epoch millisecond timestamp.
- $f_{\text{tz}}(U)$ be the function that formats a UTC millisecond timestamp $U$ into the target timezone's wall-clock components.

The set of valid UTC instants is defined as:
$$\mathcal{S} = \{ U \in [T_{\text{naive}} - 15\text{h}, T_{\text{naive}} + 15\text{h}] \mid f_{\text{tz}}(U) = L \}$$

### 3.2 Algorithmic Steps
1. **Window Definition:**
   The physical range of terrestrial time offsets is bounded by $[-12\text{h}, +14\text{h}]$. A search window of $[T_{\text{naive}} - 15\text{h}, T_{\text{naive}} + 15\text{h}]$ strictly bounds all possible UTC candidates.
2. **Adaptive Probe Points:**
   - Evaluates the offset at $T_{\text{naive}}$: $\text{off}_0 = \text{getOffsetMsAtUtc}(T_{\text{naive}}, \text{tz})$.
   - Tests initial candidate: $U_0 = T_{\text{naive}} - \text{off}_0$. If $f_{\text{tz}}(U_0) = L$, $U_0$ is recorded.
   - Probes surrounding boundary offsets in fine 15-minute steps across $[-15\text{h}, +15\text{h}]$ to detect any distinct offset transitions.
   - For every sampled offset $\text{off}_k$, tests candidate $U_k = T_{\text{naive}} - \text{off}_k$.
3. **Exact Second Resolution:**
   Once a candidate instant $U$ is identified, the exact offset in seconds is obtained by:
   $$\text{offsetSeconds} = \frac{f_{\text{tz\_as\_epoch}}(U) - U}{1000}$$
   preserving discrete seconds (e.g. $+561\text{s}$).
4. **Candidate Partitioning:**
   - If $|\mathcal{S}| = 0$: Returns `type: 'nonexistent'`.
   - If $|\mathcal{S}| = 1$: Returns `type: 'unambiguous'`, candidate instant, and exact offset seconds.
   - If $|\mathcal{S}| \ge 2$: Sorts chronologically ($U_{\text{earlier}} < U_{\text{later}}$). Returns `type: 'ambiguous'`, both candidates tagged with `earlier` and `later`, UTC dates, and respective offsets.

---

## 4. `Intl.DateTimeFormat` Capabilities & Known Limitations

### 4.1 Strengths of Native Node.js `Intl`
- Zero third-party runtime dependencies.
- Powered by Google Chrome / V8's ICU library, incorporating the official IANA Time Zone Database (tzdb).
- Native C++ performance for date formatting.

### 4.2 Limitations & Mitigations

| Limitation | Impact | Astro Sushil Architectural Mitigation |
|---|---|---|
| **Pre-1970 Tzdb Inconsistencies** | In some operating systems or older ICU builds, historical offsets before 1970 may use different transition dates or omit LMT seconds. | **Persisted UTC Instant:** Once a birth profile is created, the backend persists the authoritative `utcDateTime`. Subsequent recalculations **never re-run the timezone solver**, insulating the user's chart from future OS tzdb updates. |
| **Non-Standard Locales** | Month/Day ordering variations in locale strings. | The solver uses `en-US` with explicit numeric parts (`year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false`) and `formatToParts()` to avoid locale parsing ambiguity. |
| **Intl Cache Contention** | Repeated instantiation of `Intl.DateTimeFormat` creates GC pressure. | The solver caches formatter instances by timezone string in an internal `Map<string, Intl.DateTimeFormat>`. |

---

## 5. Alternative Evaluation

| Approach | Pros | Cons | Decision |
|---|---|---|---|
| **Current: Native `Intl` with Transition Probing + Persisted UTC Instant** | Zero dependencies, highly performant, authoritative persistence guarantees immutable charts. | Limited by host ICU historical coverage for obscure 19th century rules. | **Adopted as primary standard for Phase 2A.2.** |
| **`luxon` / `date-fns-tz`** | High-level API. | Merely wraps `Intl` under the hood; inherits identical ICU limitations while adding 200KB bundle weight. | **Rejected (unnecessary dependency).** |
| **Compiled IANA tzdb parser (`tzdata` binary parser)** | Direct byte-level access to all historical transitions and leap seconds back to 1800. | Requires bundling $\approx 3$ MB of raw tz files, manual maintenance of leap seconds, and custom C++/Wasm bindings. | **Reserved for future Phase 3 audit if 19th century LMT charts require sub-second verification.** |

---

## 6. Conclusion

The transition-aware sampling engine implemented in Phase 2A.2 reliably detects:
1. Normal unambiguous times across all world timezones.
2. 30-min and 45-min DST shifts.
3. Historical offsets with seconds.
4. Nonexistent times across spring-forward gaps and dateline transitions.
5. Ambiguous times with exact chronological ordering (`earlier` vs `later`).

Combined with **authoritative UTC instant persistence**, the system guarantees 100% deterministic chart reproducibility.
