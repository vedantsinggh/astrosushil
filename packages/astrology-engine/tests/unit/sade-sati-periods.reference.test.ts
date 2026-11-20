import { describe, it, expect } from 'vitest';
import { SadeSatiPeriodsCalculator } from '../../src/index';

/**
 * Reference: Saturn sidereal sign ingresses from JPL Horizons (DE441) geocentric apparent ecliptic
 * longitude (QUANTITIES='31', 12-hour steps 2020–2030, fetched 2026-11-20) minus the engine's
 * documented Lahiri convention (Q1), linearly interpolated at the sign boundary:
 *   Makara 2020-01-24 03:50Z, Kumbha 2022-04-29 01:04Z, back to Makara 2022-07-12 11:01Z,
 *   Kumbha 2023-01-17 11:35Z, Meena 2025-03-29 14:46Z, Mesha 2027-06-02 21:26Z,
 *   back to Meena 2027-10-20 04:56Z, Mesha 2028-02-23 10:58Z.
 * These agree with the published Lahiri ingress dates (e.g. Drik Panchang: Saturn into Kumbha
 * 29 Apr 2022, Meena 29 Mar 2025, Mesha 3 Jun 2027) to within a day.
 * Tolerance: 1 day (astronomy-engine ±1′ with Saturn's slow motion; up to hours near stations).
 */
const DAY = 86400000;
const near = (a: string | null, b: string) => a !== null && Math.abs(Date.parse(a) - Date.parse(b)) < DAY;

describe('SadeSatiPeriodsCalculator vs Horizons-derived Saturn ingresses', () => {
  const calc = new SadeSatiPeriodsCalculator();

  it('natal Moon in Kumbha: one cycle Jan 2020 – Feb 2028, peak Apr 2022 – Mar 2025', async () => {
    const r = await calc.calculate({ natalMoonLongitude: 305, startIso: '2019-06-01T00:00:00Z', endIso: '2029-06-01T00:00:00Z' });
    expect(r.natalMoonRashiIndex).toBe(11);
    expect(r.cycles.length).toBe(1);
    const c = r.cycles[0];
    expect(near(c.startIso, '2020-01-24T03:50:00Z')).toBe(true);
    expect(near(c.peakStartIso, '2022-04-29T01:04:00Z')).toBe(true);
    expect(near(c.peakEndIso, '2025-03-29T14:46:00Z')).toBe(true);
    expect(near(c.endIso, '2028-02-23T10:58:00Z')).toBe(true);
    // segments: Makara, Kumbha, Makara (retrograde), Kumbha, Meena, Mesha (short retrograde excursion, kept), Meena
    expect(c.segments.map((s) => s.houseFromMoon)).toEqual([12, 1, 12, 1, 2, 3, 2]);
    expect(near(c.segments[5].startIso, '2027-06-02T21:26:00Z')).toBe(true);
    expect(near(c.segments[6].startIso, '2027-10-20T04:56:00Z')).toBe(true);
    expect(c.segments[2].retrogradeEntry).toBe(true);
    expect(c.startsBeforeRange).toBe(false);
    expect(c.endsAfterRange).toBe(false);
  });

  it('natal Moon in Meena: cycle already running at range start; 4th/8th segments are listed', async () => {
    const r = await calc.calculate({ natalMoonLongitude: 345, startIso: '2024-01-01T00:00:00Z', endIso: '2026-01-01T00:00:00Z' });
    expect(r.cycles.length).toBe(1);
    expect(r.cycles[0].startsBeforeRange).toBe(true);
    expect(r.cycles[0].endsAfterRange).toBe(true);
    expect(near(r.cycles[0].peakStartIso, '2025-03-29T14:46:00Z')).toBe(true);
    const r2 = await calc.calculate({ natalMoonLongitude: 15, startIso: '2024-01-01T00:00:00Z', endIso: '2026-01-01T00:00:00Z' }); // Moon in Mesha
    // Saturn in Kumbha (11th from Mesha) then Meena (12th): Sade Sati begins 2025-03-29
    expect(near(r2.cycles[0].startIso, '2025-03-29T14:46:00Z')).toBe(true);
    const r3 = await calc.calculate({ natalMoonLongitude: 225, startIso: '2024-01-01T00:00:00Z', endIso: '2026-01-01T00:00:00Z' }); // Moon in Vrischika
    expect(r3.fourthAndEighth.map((s) => s.houseFromMoon)).toEqual([4]); // Saturn in Kumbha (4th from Vrischika) until 2025-03-29
    expect(near(r3.fourthAndEighth[0].endIso, '2025-03-29T14:46:00Z')).toBe(true);
  });
});
