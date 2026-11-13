import { describe, it, expect } from 'vitest';
import { TransitIngressSolver } from '../../../../packages/astrology-engine/src/transit/transit-ingress.solver';
import { AstronomyEngineAdapter } from '../../../../packages/astrology-engine/src/ephemeris/astronomy-engine.adapter';
import { PlanetSymbol } from '../../../../packages/astrology-engine/src/planets/planet.types';
import { utcDateToJulianDay, julianDayToUtcDate } from '../../../../packages/astrology-engine/src/varshaphala/solar-return.solver';
import { generateProHoroscopeReport } from '../../../../packages/report-engine/src/generators/pro-horoscope.generator';

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
   * Exact Timestamp: 2026-12-05T20:22:35Z (~20:22 UTC / 2026-12-06 at 01:52 IST).
   * Date-Level Distinction: Published panchang tables record December 5, 2026 (UTC) or December 6, 2026 (IST).
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
    expect(rahuDate.getUTCHours()).toBe(20);
    expect(rahuDate.getUTCMinutes()).toBeGreaterThanOrEqual(20);
    expect(rahuDate.getUTCMinutes()).toBeLessThanOrEqual(25);
    expect(Math.abs(rahuIngress.longitude - 300.0)).toBeLessThan(0.01);

    // Ketu: Leo (5) -> Cancer (4)
    expect(ketuIngress.fromSign?.index).toBe(5);
    expect(ketuIngress.toSign?.index).toBe(4);
    const ketuDate = julianDayToUtcDate(ketuIngress.julianDayUT);
    expect(ketuDate.getUTCFullYear()).toBe(2026);
    expect(ketuDate.getUTCMonth()).toBe(11); // December
    expect(ketuDate.getUTCDate()).toBe(5);
    expect(ketuDate.getUTCHours()).toBe(20);
    expect(ketuDate.getUTCMinutes()).toBeGreaterThanOrEqual(20);
    expect(ketuDate.getUTCMinutes()).toBeLessThanOrEqual(25);
    expect(Math.abs(ketuIngress.longitude - 120.0)).toBeLessThan(0.01);
  });

  /**
   * 4. Generator Output Consistency:
   * Verify that generateProHoroscopeReport documents transits and dates accurately.
   */
  it('4. Horoscope generator planetary influence matches calculated 2026 ephemeris transits', async () => {
    const sampleInput = {
      name: 'Test Native',
      dateOfBirth: '1990-08-15',
      timeOfBirth: '14:30:00',
      placeName: 'New Delhi, India',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
    };

    const mockChartData = {
      chart: {
        ascendant: { sign: 'Scorpio', degree: 10.5, nakshatra: 'Anuradha', pada: 3, rashiIndex: 8 },
        planets: [
          { planet: 'SUN', sign: 'Leo', degree: 28.0, house: 10, nakshatra: 'Uttara Phalguni', pada: 1, isRetrograde: false, longitude: 148.0 },
          { planet: 'MOON', sign: 'Virgo', degree: 20.0, house: 11, nakshatra: 'Hasta', pada: 4, isRetrograde: false, longitude: 170.0 },
          { planet: 'MARS', sign: 'Virgo', degree: 15.0, house: 11, nakshatra: 'Hasta', pada: 2, isRetrograde: false, longitude: 165.0 },
          { planet: 'MERCURY', sign: 'Virgo', degree: 5.0, house: 11, nakshatra: 'Uttara Phalguni', pada: 3, isRetrograde: false, longitude: 155.0 },
          { planet: 'JUPITER', sign: 'Sagittarius', degree: 12.0, house: 2, nakshatra: 'Mula', pada: 4, isRetrograde: false, longitude: 252.0 },
          { planet: 'VENUS', sign: 'Libra', degree: 8.0, house: 12, nakshatra: 'Swati', pada: 1, isRetrograde: false, longitude: 188.0 },
          { planet: 'SATURN', sign: 'Capricorn', degree: 22.0, house: 3, nakshatra: 'Shravana', pada: 4, isRetrograde: false, longitude: 292.0 },
          { planet: 'RAHU', sign: 'Aquarius', degree: 18.0, house: 4, nakshatra: 'Shatabhisha', pada: 4, isRetrograde: true, longitude: 318.0 },
          { planet: 'KETU', sign: 'Leo', degree: 18.0, house: 10, nakshatra: 'Purva Phalguni', pada: 2, isRetrograde: true, longitude: 138.0 },
        ],
        houses: Array.from({ length: 12 }, (_, i) => ({ houseNumber: i + 1, sign: 'Scorpio', planetsPresent: [] })),
        config: { zodiacType: 'SIDEREAL', ayanamsa: 'LAHIRI', houseSystem: 'WHOLE_SIGN', nodeCalculation: 'MEAN_NODE' },
      },
    };

    const report = await generateProHoroscopeReport(sampleInput, mockChartData);

    expect(report.planetaryInfluences).toBeDefined();
    const influences = new Map(report.planetaryInfluences.map((p) => [p.planet, p]));

    // Saturn must be in Pisces
    const sat = influences.get('SATURN');
    expect(sat?.transitSign).toBe('Pisces');
    expect(sat?.period).toContain('Throughout 2026');
    expect(sat?.impact).toContain('Pisces');

    // Jupiter must indicate Gemini & Exalted Cancer
    const jup = influences.get('JUPITER');
    expect(jup?.transitSign).toBe('Gemini / Cancer');
    expect(jup?.period).toContain('June 2, 2026');
    expect(jup?.period).toContain('Cancer');

    // Rahu must be in Aquarius / Capricorn
    const rah = influences.get('RAHU');
    expect(rah?.transitSign).toContain('Aquarius');
    expect(rah?.period).toContain('Dec 5, 2026');

    // Ketu must be in Leo / Cancer
    const ket = influences.get('KETU');
    expect(ket?.transitSign).toContain('Leo');
    expect(ket?.period).toContain('Dec 5, 2026');
  });

  /**
   * 5. Monthly & Quarterly Opportunity Rating Methodology:
   * Verify deterministic Gochara scoring, domain weights, and exact quarterly composite averaging.
   */
  it('5. Monthly and quarterly ratings methodology is mathematically derived and auditable', async () => {
    const sampleInput = {
      name: 'Pooja Sharma',
      dateOfBirth: '1992-04-10',
      timeOfBirth: '09:15:00',
      placeName: 'Delhi, India',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
    };

    const chartWithPiscesMoon = {
      chart: {
        ascendant: { sign: 'Scorpio', degree: 14.2, nakshatra: 'Anuradha', pada: 4, rashiIndex: 8 },
        planets: [
          { planet: 'SUN', sign: 'Pisces', degree: 26.0, house: 5, nakshatra: 'Revati', pada: 3, isRetrograde: false, longitude: 356.0 },
          { planet: 'MOON', sign: 'Pisces', degree: 12.0, house: 5, nakshatra: 'Uttara Bhadrapada', pada: 3, isRetrograde: false, longitude: 342.0 },
          { planet: 'MARS', sign: 'Aquarius', degree: 8.0, house: 4, nakshatra: 'Shatabhisha', pada: 1, isRetrograde: false, longitude: 308.0 },
          { planet: 'MERCURY', sign: 'Aries', degree: 4.0, house: 6, nakshatra: 'Ashwini', pada: 2, isRetrograde: false, longitude: 4.0 },
          { planet: 'JUPITER', sign: 'Leo', degree: 11.0, house: 10, nakshatra: 'Magha', pada: 4, isRetrograde: false, longitude: 131.0 },
          { planet: 'VENUS', sign: 'Aquarius', degree: 20.0, house: 4, nakshatra: 'Purva Bhadrapada', pada: 1, isRetrograde: false, longitude: 320.0 },
          { planet: 'SATURN', sign: 'Capricorn', degree: 21.0, house: 3, nakshatra: 'Shravana', pada: 4, isRetrograde: false, longitude: 291.0 },
          { planet: 'RAHU', sign: 'Sagittarius', degree: 10.0, house: 2, nakshatra: 'Mula', pada: 4, isRetrograde: true, longitude: 250.0 },
          { planet: 'KETU', sign: 'Gemini', degree: 10.0, house: 8, nakshatra: 'Ardra', pada: 2, isRetrograde: true, longitude: 70.0 },
        ],
        houses: Array.from({ length: 12 }, (_, i) => ({ houseNumber: i + 1, sign: 'Scorpio', planetsPresent: [] })),
        config: { zodiacType: 'SIDEREAL', ayanamsa: 'LAHIRI', houseSystem: 'WHOLE_SIGN', nodeCalculation: 'MEAN_NODE' },
      },
    };

    const report = await generateProHoroscopeReport(sampleInput, chartWithPiscesMoon);

    expect(report.monthlyForecastMatrix).toBeDefined();
    expect(report.monthlyForecastMatrix?.length).toBe(12);

    expect(report.quarterlyForecasts).toBeDefined();
    expect(report.quarterlyForecasts?.length).toBe(4);

    // Verify mathematical derivation: Q1 is derived from months 0, 1, 2
    const q1Months = report.monthlyForecastMatrix!.slice(0, 3);
    const q1Avg =
      q1Months.reduce(
        (sum, m) => sum + (m.careerRating + m.financeRating + m.healthRating + m.relationshipRating) / 4,
        0
      ) / 3;

    const q1 = report.quarterlyForecasts![0];
    expect(q1.rating).toBe(Math.round(q1Avg));
    expect(q1.compositeScore).toBe(Number(q1Avg.toFixed(2)));
    expect(q1.qualitativeRating).toBeDefined();
    expect(typeof q1.qualitativeRating).toBe('string');

    // Confirm that ratings are tempered and not simply 5 stars across the board
    const allQuarterlyRatings = report.quarterlyForecasts!.map((q) => q.rating);
    expect(allQuarterlyRatings.some((r) => r <= 4)).toBe(true);
  });
});
