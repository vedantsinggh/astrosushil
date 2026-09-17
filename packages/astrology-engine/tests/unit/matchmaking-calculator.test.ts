import { describe, it, expect } from 'vitest';
import { MatchmakingCalculator } from '../../src/matchmaking/matchmaking-calculator';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';

describe('MatchmakingCalculator Unit Tests', () => {
  const calculator = new MatchmakingCalculator();
  const chartCalculator = new ChartCalculator(new MockEphemerisProvider());

  const baseConfig = {
    zodiacType: 'SIDEREAL' as const,
    ayanamsa: 'LAHIRI' as const,
    houseSystem: 'WHOLE_SIGN' as const,
    nodeCalculation: 'MEAN_NODE' as const,
    planetaryCalculationMode: 'GEOCENTRIC' as const,
    precisionDegrees: 0.0001,
    roundingRule: 'NEAREST' as const,
    dashaSystem: 'VIMSHOTTARI' as const,
  };

  it('calculates Ashtakoota score correctly when derived profiles have matching and differing factors', async () => {
    const chartBoy = await chartCalculator.calculateChart(
      {
        date: { year: 1992, month: 5, day: 10 },
        time: { hour: 10, minute: 0, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.6139,
        longitude: 77.209,
      },
      baseConfig
    );

    const chartGirl = await chartCalculator.calculateChart(
      {
        date: { year: 1994, month: 8, day: 20 },
        time: { hour: 18, minute: 30, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 19.076,
        longitude: 72.8777,
      },
      baseConfig
    );

    const result = calculator.evaluateCompatibility(chartBoy, chartGirl, {
      personALabel: 'Groom',
      personBLabel: 'Bride',
    });

    expect(result.calculationVersion).toBe('0.1.0');
    expect(result.convention.totalMaxScore).toBe(36);
    expect(result.ashtakoota.totalMaxPoints).toBe(36);
    expect(result.ashtakoota.totalObtainedPoints).toBeGreaterThanOrEqual(0);
    expect(result.ashtakoota.totalObtainedPoints).toBeLessThanOrEqual(36);

    // Verify all 8 Kootas exist and have valid values
    const kootas = result.ashtakoota.kootas;
    expect(kootas.varna.maxPoints).toBe(1);
    expect(kootas.vashya.maxPoints).toBe(2);
    expect(kootas.tara.maxPoints).toBe(3);
    expect(kootas.yoni.maxPoints).toBe(4);
    expect(kootas.grahaMaitri.maxPoints).toBe(5);
    expect(kootas.gana.maxPoints).toBe(6);
    expect(kootas.bhakoot.maxPoints).toBe(7);
    expect(kootas.nadi.maxPoints).toBe(8);

    // Manglik comparison
    expect(result.manglikComparison).toBeDefined();
    expect(result.manglikComparison.personA).toBeDefined();
    expect(result.manglikComparison.personB).toBeDefined();
    expect(['BOTH_NON_MANGLIK', 'BOTH_MANGLIK', 'MANGLIK_MISMATCH']).toContain(
      result.manglikComparison.verdict
    );

    // Overall summary
    expect(result.overallSummary.totalScore).toBe(result.ashtakoota.totalObtainedPoints);
    expect(result.overallSummary.maxScore).toBe(36);
    expect(typeof result.overallSummary.isAshtakootaCompatible).toBe('boolean');
  });

  it('legacy evaluation helper supports backward compatibility', async () => {
    const chartBoy = await chartCalculator.calculateChart(
      {
        date: { year: 1990, month: 1, day: 1 },
        time: { hour: 12, minute: 0, second: 0 },
        timezone: 'UTC',
        latitude: 0,
        longitude: 0,
      },
      baseConfig
    );

    const chartGirl = await chartCalculator.calculateChart(
      {
        date: { year: 1992, month: 2, day: 2 },
        time: { hour: 12, minute: 0, second: 0 },
        timezone: 'UTC',
        latitude: 0,
        longitude: 0,
      },
      baseConfig
    );

    const legacyRes = calculator.evaluateCompatibilityLegacy(chartBoy, chartGirl);
    expect(legacyRes.ashtakoota.totalMaxPoints).toBe(36);
    expect(legacyRes.boyManglik).toBeDefined();
    expect(legacyRes.girlManglik).toBeDefined();
    expect(legacyRes.overallVerdict).toBeDefined();
  });
});
