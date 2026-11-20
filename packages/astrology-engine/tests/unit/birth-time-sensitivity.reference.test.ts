import { describe, it, expect } from 'vitest';
import { BirthTimeSensitivityCalculator } from '../../src/index';

/**
 * Independent reference: instants at which sidereal ecliptic longitudes rise at New Delhi
 * (28.6139 N, 77.209 E) near 1990-05-15 09:00 UT, computed outside the engine with the same
 * method as ascendant-rising.reference.test.ts (hour angle of an ecliptic point on the
 * geometric horizon; USNO GMST formula; mean obliquity; the engine's documented Lahiri
 * convention as an input). Tolerance 30 s.
 *   150° (Simha → Kanya; also a pada/D9, D10, D12 and D60 boundary)  08:51:20 UT
 *   151.5° (D60)  08:58:08    152° (D60, D12 boundary at 152.5 is later)  09:00:23
 *   153° (D10)   09:04:55     153°20′ (pada / D9)  09:06:26     146°40′ (nakshatra)  08:36:13
 */
const T = (hms: string) => Date.parse(`1990-05-15T${hms}Z`);
const TOL = 30_000;

describe('BirthTimeSensitivityCalculator', () => {
  it('finds Lagna boundary crossings within ±30 min of the reference birth', async () => {
    const r = await new BirthTimeSensitivityCalculator().calculate({ birthUtcIso: '1990-05-15T09:00:00Z', latitude: 28.6139, longitude: 77.209, windowMinutes: 30 });
    const at = (key: string, boundary: number) => r.changes.find((c) => c.key === key && Math.abs(c.boundary - boundary) < 1e-6);
    expect(Math.abs(Date.parse(at('LAGNA_SIGN', 150)!.instantIso) - T('08:51:20'))).toBeLessThan(TOL);
    expect(at('LAGNA_SIGN', 150)!.fromPart).toBe(4); // Simha
    expect(at('LAGNA_SIGN', 150)!.toPart).toBe(5); // Kanya
    expect(Math.abs(Date.parse(at('LAGNA_D60', 151.5)!.instantIso) - T('08:58:08'))).toBeLessThan(TOL);
    expect(Math.abs(Date.parse(at('LAGNA_D60', 152)!.instantIso) - T('09:00:23'))).toBeLessThan(TOL);
    expect(Math.abs(Date.parse(at('LAGNA_D10', 153)!.instantIso) - T('09:04:55'))).toBeLessThan(TOL);
    expect(Math.abs(Date.parse(at('LAGNA_PADA_D9', 360 / 108 * 46)!.instantIso) - T('09:06:26'))).toBeLessThan(TOL);
    // Margins: the given time is ~23 s before the 152° D60 boundary and ~8.7 min after the sign change.
    const d60 = r.margins.find((m) => m.key === 'LAGNA_D60')!;
    expect(Math.abs(d60.minutesToNext! - 23 / 60)).toBeLessThan(0.5);
    const sign = r.margins.find((m) => m.key === 'LAGNA_SIGN')!;
    expect(sign.part).toBe(5);
    expect(Math.abs(sign.minutesSincePrevious! - 8.67)).toBeLessThan(0.5);
    // Lagna nakshatra: Purva → Uttara Phalguni at 146°40′ (reference 08:36:13 UT); the next (160°) is at 09:36:36, outside
    const nak = r.changes.filter((c) => c.key === 'LAGNA_NAKSHATRA');
    expect(nak.length).toBe(1);
    expect(Math.abs(Date.parse(nak[0].instantIso) - T('08:36:13'))).toBeLessThan(TOL);
    // changes are in time order and inside the window
    for (const c of r.changes) expect(Math.abs(c.offsetMinutes)).toBeLessThanOrEqual(30);
  });

  it('validates input', async () => {
    const c = new BirthTimeSensitivityCalculator();
    await expect(c.calculate({ birthUtcIso: 'x', latitude: 0, longitude: 0 })).rejects.toThrow();
    await expect(c.calculate({ birthUtcIso: '2000-01-01T00:00:00Z', latitude: 0, longitude: 0, windowMinutes: 500 })).rejects.toThrow();
  });
});
