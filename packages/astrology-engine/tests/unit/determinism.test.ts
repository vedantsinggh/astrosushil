import { describe, it, expect } from 'vitest';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';
import { AstronomyEngineAdapter } from '../../src/ephemeris/astronomy-engine.adapter';
import { AstrologyConfig } from '../../src/configuration/astrology-config';
import { BENCHMARK_REFERENCE_CHARTS } from '../fixtures/reference-charts';

describe('Astrology Engine Determinism & Reproducibility Tests', () => {
  const confirmedConfig: AstrologyConfig = {
    zodiacType: 'SIDEREAL',
    ayanamsa: 'LAHIRI',
    houseSystem: 'WHOLE_SIGN',
    nodeCalculation: 'MEAN_NODE',
    planetaryCalculationMode: 'GEOCENTRIC',
    precisionDegrees: 0.0001,
    roundingRule: 'NEAREST',
    dashaSystem: 'VIMSHOTTARI',
  };

  it('should produce identical AstroChart outputs across 100 consecutive executions with MockEphemerisProvider', async () => {
    const calculator = new ChartCalculator(new MockEphemerisProvider());
    const fixture = BENCHMARK_REFERENCE_CHARTS[0];

    const firstRun = await calculator.calculateChart(fixture.birthDetails, confirmedConfig);

    for (let i = 0; i < 100; i++) {
      const currentRun = await calculator.calculateChart(fixture.birthDetails, confirmedConfig);

      // Compare planets vector for absolute identity
      expect(currentRun.planets).toEqual(firstRun.planets);
      expect(currentRun.metadata.normalizedTime.julianDayUT).toBe(
        firstRun.metadata.normalizedTime.julianDayUT
      );
    }
  });

  it('should produce identical AstroChart outputs across executions with AstronomyEngineAdapter', async () => {
    const calculator = new ChartCalculator(new AstronomyEngineAdapter());
    const fixture = BENCHMARK_REFERENCE_CHARTS[0];

    const run1 = await calculator.calculateChart(fixture.birthDetails, confirmedConfig);
    const run2 = await calculator.calculateChart(fixture.birthDetails, confirmedConfig);

    expect(run1.planets).toEqual(run2.planets);
  });
});
