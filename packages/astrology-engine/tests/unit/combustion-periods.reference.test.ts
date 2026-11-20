import { describe, it, expect } from 'vitest';
import { CombustionPeriodSolver, PlanetSymbol } from '../../src/index';

/**
 * Reference: JPL Horizons (DE441) geocentric apparent ecliptic longitudes (QUANTITIES='31',
 * CENTER='500@399') of the Sun and each planet, 1-hour steps for 2026 (Moon: 10-minute steps,
 * Jan–Feb 2026), fetched 2026-11-20. Expected crossings were found outside the engine by linear
 * interpolation of |λplanet - λSun| - orb between samples, with the orb chosen by the sign of the
 * Horizons longitude rate (retrograde orbs for Mercury 12° and Venus 8°; otherwise the engine's
 * existing orbs, which are provisional: ADR-016 §6 / N8).
 * Tolerance: 45 min for planets (astronomy-engine ±1′ divided by the slowest relative motion,
 * ~0.4°/day for Mercury near its stations, plus interpolation error), 10 min for the Moon.
 */
const REF_2026: Array<[PlanetSymbol, 'ENTER' | 'EXIT', string]> = [
  [PlanetSymbol.MERCURY, 'EXIT', '2026-02-09T22:46:00Z'],
  [PlanetSymbol.MERCURY, 'ENTER', '2026-02-28T16:37:45Z'],
  [PlanetSymbol.MERCURY, 'EXIT', '2026-03-13T16:39:58Z'],
  [PlanetSymbol.MERCURY, 'ENTER', '2026-05-01T17:46:45Z'],
  [PlanetSymbol.MERCURY, 'EXIT', '2026-05-26T17:54:08Z'],
  [PlanetSymbol.MERCURY, 'ENTER', '2026-07-05T03:42:39Z'],
  [PlanetSymbol.MERCURY, 'EXIT', '2026-07-21T08:38:27Z'],
  [PlanetSymbol.MERCURY, 'ENTER', '2026-08-13T19:58:25Z'],
  [PlanetSymbol.MERCURY, 'EXIT', '2026-09-13T13:05:57Z'],
  [PlanetSymbol.MERCURY, 'ENTER', '2026-10-30T00:34:11Z'],
  [PlanetSymbol.MERCURY, 'EXIT', '2026-11-10T10:24:11Z'],
  [PlanetSymbol.MERCURY, 'ENTER', '2026-12-06T19:24:59Z'],
  [PlanetSymbol.VENUS, 'EXIT', '2026-02-17T09:38:18Z'],
  [PlanetSymbol.VENUS, 'ENTER', '2026-10-19T02:45:37Z'],
  [PlanetSymbol.VENUS, 'EXIT', '2026-10-29T04:09:57Z'],
  [PlanetSymbol.MARS, 'EXIT', '2026-03-26T08:37:05Z'],
  [PlanetSymbol.JUPITER, 'ENTER', '2026-07-14T12:33:53Z'],
  [PlanetSymbol.JUPITER, 'EXIT', '2026-08-13T10:23:04Z'],
  [PlanetSymbol.SATURN, 'ENTER', '2026-03-08T04:04:34Z'],
  [PlanetSymbol.SATURN, 'EXIT', '2026-04-11T18:34:58Z'],
];

describe('CombustionPeriodSolver vs JPL Horizons (2026)', () => {
  const solver = new CombustionPeriodSolver();

  it('finds every entry and exit within tolerance, and nothing else', async () => {
    const r = await solver.findPeriods({
      startIso: '2026-01-02T00:00:00Z',
      endIso: '2026-12-31T00:00:00Z',
      planets: [PlanetSymbol.MERCURY, PlanetSymbol.VENUS, PlanetSymbol.MARS, PlanetSymbol.JUPITER, PlanetSymbol.SATURN],
    });
    expect(r.provisional).toBe(true);
    const found: Array<[string, string, string]> = [];
    for (const p of r.periods) {
      if (!p.startsBeforeRange) found.push([p.planet, 'ENTER', p.startIso]);
      if (!p.endsAfterRange) found.push([p.planet, 'EXIT', p.endIso]);
    }
    expect(found.length).toBe(REF_2026.length);
    for (const [planet, kind, iso] of REF_2026) {
      const hit = found.find((f) => f[0] === planet && f[1] === kind && Math.abs(Date.parse(f[2]) - Date.parse(iso)) < 45 * 60000);
      expect(hit, `${planet} ${kind} ${iso}`).toBeDefined();
    }
    // Mercury, Venus and Mars were already combust on 2 Jan 2026 (Horizons: their first crossings in 2026 are exits)
    const before = r.periods.filter((p) => p.startsBeforeRange).map((p) => p.planet).sort();
    expect(before).toEqual([PlanetSymbol.MARS, PlanetSymbol.MERCURY, PlanetSymbol.VENUS]);
  });

  it('Venus inferior conjunction period is retrograde with the 8° orb', async () => {
    const r = await solver.findPeriods({ startIso: '2026-10-01T00:00:00Z', endIso: '2026-11-15T00:00:00Z', planets: [PlanetSymbol.VENUS] });
    expect(r.periods.length).toBe(1);
    const p = r.periods[0];
    expect(p.retrogradeAtClosest).toBe(true);
    expect(p.orbAtStart).toBe(8);
    expect(p.orbAtEnd).toBe(8);
  });

  it('Moon combustion around the new moons of Jan and Feb 2026 (Horizons 10-minute data)', async () => {
    const r = await solver.findPeriods({ startIso: '2026-01-10T00:00:00Z', endIso: '2026-02-25T00:00:00Z', planets: [PlanetSymbol.MOON] });
    const ref = [
      ['2026-01-17T18:34:26Z', '2026-01-19T20:44:38Z'],
      ['2026-02-16T12:04:34Z', '2026-02-18T11:28:03Z'],
    ];
    expect(r.periods.length).toBe(2);
    r.periods.forEach((p, i) => {
      expect(Math.abs(Date.parse(p.startIso) - Date.parse(ref[i][0]))).toBeLessThan(10 * 60000);
      expect(Math.abs(Date.parse(p.endIso) - Date.parse(ref[i][1]))).toBeLessThan(10 * 60000);
      expect(p.minSeparation).toBeLessThan(0.01); // longitude separation is 0 at the new moon (conjunction in longitude)
    });
  });

  it('rejects planets that cannot be combust and over-long ranges', async () => {
    await expect(solver.findPeriods({ startIso: '2026-01-01T00:00:00Z', endIso: '2026-02-01T00:00:00Z', planets: [PlanetSymbol.RAHU] })).rejects.toThrow();
    await expect(solver.findPeriods({ startIso: '2000-01-01T00:00:00Z', endIso: '2030-02-01T00:00:00Z' })).rejects.toThrow();
  });
});
