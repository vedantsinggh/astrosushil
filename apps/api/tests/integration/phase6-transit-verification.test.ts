import { describe, it, expect } from 'vitest';
import { TransitIngressSolver } from '../../../../packages/astrology-engine/src/transit/transit-ingress.solver';
import { AstronomyEngineAdapter } from '../../../../packages/astrology-engine/src/ephemeris/astronomy-engine.adapter';
import { PlanetSymbol } from '../../../../packages/astrology-engine/src/planets/planet.types';
import { utcDateToJulianDay, julianDayToUtcDate } from '../../../../packages/astrology-engine/src/varshaphala/solar-return.solver';

describe('Phase 6.2B: 2026 Sidereal Lahiri Planetary Transit Verification', () => {
  const solver = new TransitIngressSolver(new AstronomyEngineAdapter());

  // 2026 Interval Boundaries in Julian Day (UT)
  const start2026JD = utcDateToJulianDay(new Date('2026-01-01T00:00:00.000Z'));
  const mid2026JD = utcDateToJulianDay(new Date('2026-07-01T00:00:00.000Z'));
  const end2026JD = utcDateToJulianDay(new Date('2026-12-31T23:59:59.000Z'));

  /**
   * 1. Saturn Transit Verification:
   * Source: Sidereal Lahiri Ephemeris (AstronomyEngine Adapter).
   * Convention: Sidereal Zodiac, Lahiri Ayanamsa, UTC.
   * Expected: Saturn resides in Pisces (Meena, Rashi 12) throughout 2026.
   * Sign Ingresses: 0 (No sign boundary crossings).
   * Retrogression Cycle: Starts ~July 26/27, 2026, stations direct ~December 10/11, 2026.
   */
  it('1. Saturn remains in Pisces throughout 2026 with verified retrogression stations', async () => {
    const saturnIngresses = await solver.findSignIngresses(PlanetSymbol.SATURN, start2026JD, end2026JD);
    expect(saturnIngresses.length).toBe(0);

    const jan1State = await solver.getPlanetaryState(PlanetSymbol.SATURN, start2026JD);
    expect(jan1State.rashiIndex).toBe(12); // Pisces
    expect(jan1State.longitude).toBeGreaterThanOrEqual(330);
    expect(jan1State.longitude).toBeLessThan(360);
    expect(jan1State.isRetrograde).toBe(false);

    const jul1State = await solver.getPlanetaryState(PlanetSymbol.SATURN, mid2026JD);
    expect(jul1State.rashiIndex).toBe(12); // Pisces
    expect(jul1State.isRetrograde).toBe(false);

    // Verify Retrogression Station in late July 2026
    const jul20JD = utcDateToJulianDay(new Date('2026-07-20T00:00:00.000Z'));
    const jul30JD = utcDateToJulianDay(new Date('2026-07-30T00:00:00.000Z'));
    const preRetroState = await solver.getPlanetaryState(PlanetSymbol.SATURN, jul20JD);
    const postRetroState = await solver.getPlanetaryState(PlanetSymbol.SATURN, jul30JD);
    expect(preRetroState.isRetrograde).toBe(false);
    expect(postRetroState.isRetrograde).toBe(true);

    // Verify Direct Station in mid December 2026
    const dec05JD = utcDateToJulianDay(new Date('2026-12-05T00:00:00.000Z'));
    const dec15JD = utcDateToJulianDay(new Date('2026-12-15T00:00:00.000Z'));
    const retroDecState = await solver.getPlanetaryState(PlanetSymbol.SATURN, dec05JD);
    const directDecState = await solver.getPlanetaryState(PlanetSymbol.SATURN, dec15JD);
    expect(retroDecState.isRetrograde).toBe(true);
    expect(directDecState.isRetrograde).toBe(false);

    const dec31State = await solver.getPlanetaryState(PlanetSymbol.SATURN, end2026JD);
    expect(dec31State.rashiIndex).toBe(12); // Pisces
  });

  /**
   * 2. Jupiter Transit Verification:
   * Source: Sidereal Lahiri Ephemeris.
   * Convention: UTC timestamp, Sidereal Zodiac.
   * Transition 1: Gemini (Mithuna, Rashi 3) -> Cancer (Karka, Rashi 4 - Exaltation).
   * Expected Timestamp: ~2026-06-01T19:15:00Z (June 2, 2026 IST at ~00:45 IST).
   * Boundary: 90.0 degrees sidereal longitude.
   * Secondary Ingress: Cancer -> Leo (Simha, Rashi 5) on ~2026-10-31T04:47:00Z.
   */
  it('2. Jupiter transitions from Gemini to Exalted Cancer on June 1-2, 2026', async () => {
    const jupiterIngresses = await solver.findSignIngresses(PlanetSymbol.JUPITER, start2026JD, end2026JD);
    expect(jupiterIngresses.length).toBeGreaterThanOrEqual(1);

    // Ingress 1: Gemini -> Cancer
    const cancerIngress = jupiterIngresses.find((ing) => ing.fromSign?.index === 3 && ing.toSign?.index === 4);
    expect(cancerIngress).toBeDefined();

    const ingressUtcDate = julianDayToUtcDate(cancerIngress!.julianDayUT);
    expect(ingressUtcDate.getUTCFullYear()).toBe(2026);
    expect(ingressUtcDate.getUTCMonth()).toBe(5); // June (0-indexed = 5)
    expect(ingressUtcDate.getUTCDate()).toBeGreaterThanOrEqual(1);
    expect(ingressUtcDate.getUTCDate()).toBeLessThanOrEqual(2);

    // Test state immediately prior and after the ingress
    const preIngress = await solver.getPlanetaryState(PlanetSymbol.JUPITER, cancerIngress!.julianDayUT - 0.05);
    const postIngress = await solver.getPlanetaryState(PlanetSymbol.JUPITER, cancerIngress!.julianDayUT + 0.05);
    expect(preIngress.rashiIndex).toBe(3); // Gemini
    expect(postIngress.rashiIndex).toBe(4); // Cancer (Exalted)
  });

  /**
   * 3. Rahu & Ketu Transit Ingress Verification:
   * Source: Sidereal Lahiri Ephemeris (Mean Node calculation).
   * Direction: Retrograde (Decreasing longitude).
   * Rahu: Aquarius (Kumbha, Rashi 11) -> Capricorn (Makara, Rashi 10) crossing 300.0 degrees.
   * Ketu: Leo (Simha, Rashi 5) -> Cancer (Karka, Rashi 4) crossing 120.0 degrees.
   * Exact Timestamp (engine 0.2.0, true Lahiri / mean ayanamsa for the mean node, ADR-017):
   * 2026-12-05T17:03Z = 2026-12-05 22:33 IST. Published Lahiri mean-node panchangs give 5 December 2026,
   * 10:32-10:33 PM IST (PanchangBodh "Rahu Ketu Gochar"; Astroyogi "Rahu transit in Capricorn 2026").
   * The pre-0.2.0 linear ayanamsa gave 20:22 UTC (6 December 01:52 IST), 3 h 19 min late.
   */
  it('3. Rahu and Ketu transit sign boundaries into Capricorn and Cancer in December 2026', async () => {
    const rahuIngresses = await solver.findSignIngresses(PlanetSymbol.RAHU, start2026JD, end2026JD);
    const ketuIngresses = await solver.findSignIngresses(PlanetSymbol.KETU, start2026JD, end2026JD);

    expect(rahuIngresses.length).toBe(1);
    expect(ketuIngresses.length).toBe(1);

    const rahuIngress = rahuIngresses[0];
    const ketuIngress = ketuIngresses[0];

    // Rahu: Aquarius (11) -> Capricorn (10)
    expect(rahuIngress.fromSign?.index).toBe(11);
    expect(rahuIngress.toSign?.index).toBe(10);
    const rahuDate = julianDayToUtcDate(rahuIngress.julianDayUT);
    expect(rahuDate.getUTCFullYear()).toBe(2026);
    expect(rahuDate.getUTCMonth()).toBe(11); // December (0-indexed = 11)
    expect(rahuDate.getUTCDate()).toBe(5);
    expect(rahuDate.getUTCHours()).toBe(17);
    expect(rahuDate.getUTCMinutes()).toBeGreaterThanOrEqual(0);
    expect(rahuDate.getUTCMinutes()).toBeLessThanOrEqual(6);
    expect(Math.abs(rahuIngress.longitude - 300.0)).toBeLessThan(0.01);

    // Ketu: Leo (5) -> Cancer (4)
    expect(ketuIngress.fromSign?.index).toBe(5);
    expect(ketuIngress.toSign?.index).toBe(4);
    const ketuDate = julianDayToUtcDate(ketuIngress.julianDayUT);
    expect(ketuDate.getUTCFullYear()).toBe(2026);
    expect(ketuDate.getUTCMonth()).toBe(11); // December
    expect(ketuDate.getUTCDate()).toBe(5);
    expect(ketuDate.getUTCHours()).toBe(17);
    expect(ketuDate.getUTCMinutes()).toBeGreaterThanOrEqual(0);
    expect(ketuDate.getUTCMinutes()).toBeLessThanOrEqual(6);
    expect(Math.abs(ketuIngress.longitude - 120.0)).toBeLessThan(0.01);
  });
  // Tests 4-5 exercised the removed legacy horoscope generator; the platform
  // horoscope-annual module is covered in packages/report-engine/src/__tests__/platform-annual.test.ts.
});
