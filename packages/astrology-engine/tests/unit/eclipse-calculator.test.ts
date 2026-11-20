import { describe, it, expect } from 'vitest';
import { EclipseCalculator } from '../../src/eclipses/eclipse-calculator';

/**
 * Reference eclipses from the NASA GSFC Eclipse catalogue (F. Espenak, eclipse.gsfc.nasa.gov).
 * NASA lists greatest eclipse in TD; UT = TD - ΔT (~69 s for 2017-2025). A 5-minute tolerance
 * covers that difference and the ephemeris model.
 */
const REFERENCE = [
  { body: 'SOLAR', kind: 'TOTAL', utc: '2017-08-21T18:25:30Z' },
  { body: 'SOLAR', kind: 'ANNULAR', utc: '2023-10-14T17:58:20Z' },
  { body: 'SOLAR', kind: 'TOTAL', utc: '2024-04-08T18:16:10Z' },
  { body: 'LUNAR', kind: 'TOTAL', utc: '2022-11-08T10:58:00Z' },
  { body: 'LUNAR', kind: 'PARTIAL', utc: '2023-10-28T20:14:00Z' },
  { body: 'LUNAR', kind: 'TOTAL', utc: '2025-03-14T06:58:40Z' },
] as const;

describe('EclipseCalculator', () => {
  const calc = new EclipseCalculator();

  for (const ref of REFERENCE) {
    it(`finds the ${ref.kind} ${ref.body} eclipse of ${ref.utc.slice(0, 10)}`, () => {
      const t = Date.parse(ref.utc);
      const found = calc.findEclipses(new Date(t - 3 * 86400000), new Date(t + 3 * 86400000));
      const e = found.find((x) => x.body === ref.body);
      expect(e).toBeDefined();
      expect(e!.kind).toBe(ref.kind);
      expect(Math.abs(Date.parse(e!.peakIso) - t)).toBeLessThan(5 * 60000);
    });
  }

  it('returns events sorted, with luminaries in opposition (lunar) / conjunction (solar)', () => {
    const list = calc.findEclipses(new Date('2024-01-01T00:00:00Z'), new Date('2026-01-01T00:00:00Z'));
    // 2024: 2 solar + 2 lunar; 2025: 2 solar + 2 lunar (NASA catalogue)
    expect(list.filter((e) => e.body === 'SOLAR')).toHaveLength(4);
    expect(list.filter((e) => e.body === 'LUNAR')).toHaveLength(4);
    for (let i = 1; i < list.length; i++) expect(Date.parse(list[i].peakIso)).toBeGreaterThan(Date.parse(list[i - 1].peakIso));
    for (const e of list) {
      const d = Math.abs((((e.moonSiderealLongitude - e.sunSiderealLongitude) % 360) + 360) % 360);
      const sep = Math.min(d, 360 - d);
      if (e.body === 'SOLAR') expect(sep).toBeLessThan(1.5);
      else expect(180 - sep).toBeLessThan(1.5);
      expect(e.rashiIndex).toBeGreaterThanOrEqual(1);
      expect(e.nakshatraIndex).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns an empty list for an empty range', () => {
    expect(calc.findEclipses(new Date('2024-01-01'), new Date('2024-01-01'))).toEqual([]);
  });
});
