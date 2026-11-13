# Phase 2A.5: Chart Pipeline Verification and Invariant Audit

**Audit Phase:** Phase 2A.5 (Final Closure Review)  
**Date:** 2026-11-03  
**Status:** Strictly Read-Only Forensic Verification  
**Reviewed Test Suite:** [`apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts`](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts)

---

## 1. Executive Summary

Phase 2A.3 discovered that previous lifecycle tests constructed custom inputs and directly invoked internal calculator classes, bypassing `mapBirthProfileToBirthDetails()` and `astrologyService.calculateChartForProfile()`.

In Phase 2A.5, the rewritten regression suite was inspected line-by-line and independently executed to verify that:
1. All tests execute the production method `astrologyService.calculateChartForProfile(profileId, user)`.
2. Persisted database profiles in PostgreSQL / mock Prisma storage are retrieved through the real API and service layer.
3. No test manually injects UTC metadata into the calculator to bypass the mapper.
4. Exact numerical values for UTC timestamps, Julian Days, and Ascendant longitudes confirm complete temporal accuracy.
5. The timezone solver is never invoked when an authoritative UTC instant exists.

---

## 2. Forensic Inspection of Lifecycle Tests

### 2.1 Test A: Earlier Occurrence (EDT = UTC-4)
Location: [`apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts`](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts#L128-L180)

#### Execution Flow:
1. `app.inject({ method: 'POST', url: '/api/v1/birth-profiles', payload: { ... disambiguation: 'earlier' } })`
   - Creates profile via real HTTP controller.
   - Status: HTTP 201 Created.
   - Stored `utcDateTime`: `2020-11-01T05:30:00.000Z`
   - Stored `timezoneOffsetSeconds`: `-14400`
2. Real service call:
   ```typescript
   earlierCalculatedChart = await astrologyService.calculateChartForProfile(
     sequenceAProfileId,
     { id: userId, role: 'USER' }
   );
   ```
   **Verification:** Calls the real production service method with the profile ID. No calculator inputs are manually constructed.
3. Assertions:
   - `earlierCalculatedChart.chart.normalizedTime.utcIsoString === '2020-11-01T05:30:00.000Z'`
   - `earlierCalculatedChart.chart.normalizedTime.timezoneOffsetMinutes === -240`
   - `earlierCalculatedChart.chart.ascendant.longitude === 172.95155700812743` (Virgo $22.95^\circ$)
   - Astronomical Julian Day (UT): `2459154.7291666665`

---

### 2.2 Test B: Later Occurrence (EST = UTC-5)
Location: [`apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts`](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts#L186-L233)

#### Execution Flow:
1. `app.inject({ method: 'POST', url: '/api/v1/birth-profiles', payload: { ... disambiguation: 'later' } })`
   - Stored `utcDateTime`: `2020-11-01T06:30:00.000Z`
   - Stored `timezoneOffsetSeconds`: `-18000`
2. Real service call:
   ```typescript
   laterCalculatedChart = await astrologyService.calculateChartForProfile(
     sequenceBProfileId,
     { id: userId, role: 'USER' }
   );
   ```
3. Assertions & Invariant Proof:
   - `laterCalculatedChart.chart.normalizedTime.utcIsoString === '2020-11-01T06:30:00.000Z'`
   - `laterCalculatedChart.chart.normalizedTime.timezoneOffsetMinutes === -300`
   - `laterCalculatedChart.chart.ascendant.longitude === 186.75338006450638` (Libra $6.75^\circ$)
   - Astronomical Julian Day (UT): `2459154.7708333335`
   - Temporal difference: Exactly $3,600,000\text{ ms} = 1.0\text{ hour}$.
   - Ascendant shift: $\Delta = 13.80182305637895^\circ$.

---

### 2.3 Test C: Verification of Timezone Solver Independence
Location: [`apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts`](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts#L236-L251)

```typescript
  it('Test C: Persisted UTC instant is authoritative and does not re-invoke resolveLocalTimeToUtc', async () => {
    const resolveSpy = vi.spyOn(timezoneSolver, 'resolveLocalTimeToUtc');

    const chartRes = await astrologyService.calculateChartForProfile(
      sequenceAProfileId,
      { id: userId, role: 'USER' }
    );

    expect(resolveSpy).not.toHaveBeenCalled();
    expect(chartRes.chart.normalizedTime.utcIsoString).toBe('2020-11-01T05:30:00.000Z');

    resolveSpy.mockRestore();
  });
```

**Verification:**
The spy on `timezoneSolver.resolveLocalTimeToUtc` registered **0 invocations** during the full execution of `astrologyService.calculateChartForProfile()`.
This proves that when `utcDateTime` is populated on `BirthDetails`, `normalizeBirthTime()` honors the stored timestamp directly without re-evaluating the local wall clock against IANA transition rules.

---

### 2.4 Test D: Non-Temporal Profile Update Invariant
Location: [`apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts`](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts#L254-L279)

**Procedure:**
1. A profile was updated using `PUT /api/v1/birth-profiles/:id` with `{ name: 'Ambiguous User Name Modified' }`.
2. Verified that `utcDateTime`, `timezoneOffsetSeconds`, and `disambiguation` remained identical in the database.
3. Called `astrologyService.calculateChartForProfile()`.
4. Verified that `chart.ascendant.longitude` remained bit-for-bit identical to the initial calculation ($172.95155700812743^\circ$).

---

### 2.5 Test F: Legacy Profile Safety & Zero-Guessing Guarantee
Location: [`apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts`](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/birth-profile-disambiguation-lifecycle.test.ts#L316-L369)

**Procedure:**
A legacy profile with `utcDateTime: null` and `disambiguation: null` was created in the database.
1. `GET /api/v1/birth-profiles` safely listed the profile with `disambiguationRequired: true`.
2. Calling `astrologyService.calculateChartForProfile()` threw `ValidationError` with:
   - `code: 'AMBIGUOUS_LOCAL_TIME'`
   - `candidates.length: 2` (candidate 1: `'earlier'` EDT, candidate 2: `'later'` EST).
3. The engine refused to calculate the chart and never guessed an interpretation.

---

## 3. Mathematical Verification of Calculation Invariants

$$\begin{aligned}
\text{Julian Day UT (Earlier)} &= \frac{1604208600000}{86400000} + 2440587.5 = 2459154.7291666665 \\
\text{Julian Day UT (Later)}   &= \frac{1604212200000}{86400000} + 2440587.5 = 2459154.7708333335 \\
\Delta \text{JD} &= 0.041666667 \text{ days} = 1.0000 \text{ hour}
\end{aligned}$$

The astrological engine calculates planetary positions with Swiss Ephemeris based solely on this Julian Day UT. Because the exact authoritative timestamp reaches `normalizeBirthTime()`, the resulting astronomical positions are 100% deterministic, auditable, and immutable.
