import { describe, it, expect } from 'vitest';
import { TransitIngressSolver, PlanetSymbol, utcDateToJulianDay } from '../../src/index';

/**
 * Independent check of the existing ingress/station solver used by the desktop transit tables.
 * Stations: JPL Horizons hourly geocentric apparent ecliptic longitudes (QUANTITIES='31', 2026,
 * fetched 2026-11-20); station = sign change of the central-difference longitude rate,
 * linearly interpolated. Tolerance 12 h (a station is ill-conditioned: the longitude rate
 * passes zero slowly, so ±1′ ephemeris error and the solver's 1-hour speed estimate move it by hours).
 * Sign ingress: Horizons longitude minus the engine's documented Lahiri convention (Q1).
 */
describe('TransitIngressSolver vs JPL Horizons (2026)', () => {
  const solver = new TransitIngressSolver();
  const jd = (iso: string) => utcDateToJulianDay(new Date(iso));

  it('Mercury, Venus, Jupiter and Saturn stations', async () => {
    const ref: Array<[PlanetSymbol, string, string]> = [
      [PlanetSymbol.MERCURY, 'RETROGRADE_STATION', '2026-02-26T06:48Z'],
      [PlanetSymbol.MERCURY, 'DIRECT_STATION', '2026-03-20T19:32Z'],
      [PlanetSymbol.MERCURY, 'RETROGRADE_STATION', '2026-06-29T17:35Z'],
      [PlanetSymbol.MERCURY, 'DIRECT_STATION', '2026-07-23T22:57Z'],
      [PlanetSymbol.MERCURY, 'RETROGRADE_STATION', '2026-10-24T07:12Z'],
      [PlanetSymbol.MERCURY, 'DIRECT_STATION', '2026-11-13T15:53Z'],
      [PlanetSymbol.VENUS, 'RETROGRADE_STATION', '2026-10-03T07:15Z'],
      [PlanetSymbol.VENUS, 'DIRECT_STATION', '2026-11-14T00:27Z'],
      [PlanetSymbol.JUPITER, 'DIRECT_STATION', '2026-03-11T03:30Z'],
      [PlanetSymbol.JUPITER, 'RETROGRADE_STATION', '2026-12-13T00:53Z'],
      [PlanetSymbol.SATURN, 'RETROGRADE_STATION', '2026-07-26T19:53Z'],
      [PlanetSymbol.SATURN, 'DIRECT_STATION', '2026-12-10T23:28Z'],
    ];
    for (const planet of [PlanetSymbol.MERCURY, PlanetSymbol.VENUS, PlanetSymbol.JUPITER, PlanetSymbol.SATURN]) {
      const ev = await solver.findStationEvents(planet, jd('2026-01-02T00:00Z'), jd('2026-12-31T00:00Z'));
      const want = ref.filter((r) => r[0] === planet);
      expect(ev.length, planet).toBe(want.length);
      want.forEach(([, type, iso], i) => {
        expect(ev[i].eventType).toBe(type);
        expect(Math.abs(Date.parse(ev[i].timestampIso) - Date.parse(iso)), `${planet} ${iso}`).toBeLessThan(12 * 3600000);
      });
    }
  });

  it('Saturn sidereal sign ingress into Meena, 2025-03-29 (Horizons-derived 14:46 UT, ±2 h)', async () => {
    const ev = await solver.findSignIngresses(PlanetSymbol.SATURN, jd('2025-03-01T00:00Z'), jd('2025-04-30T00:00Z'));
    expect(ev.length).toBe(1);
    expect(ev[0].toSign!.index).toBe(12);
    expect(Math.abs(Date.parse(ev[0].timestampIso) - Date.parse('2025-03-29T14:46Z'))).toBeLessThan(2 * 3600000);
  });
});
