import { describe, it, expect } from 'vitest';
import { VimshopakaCalculator } from '../../src/strength/vimshopaka-calculator';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';
import { BENCHMARK_REFERENCE_CHARTS } from '../fixtures/reference-charts';

describe('Vimshopaka Bala & Planetary Rays Tests', () => {
  const chartCalculator = new ChartCalculator(new MockEphemerisProvider());
  const vimshopakaCalculator = new VimshopakaCalculator();
  const fixture = BENCHMARK_REFERENCE_CHARTS[0];

  it('should calculate Shadvarga, Saptavarga, Dashavarga, and Shodashavarga Vimshopaka Bala', async () => {
    const chart = await chartCalculator.calculateChart(fixture.birthDetails, {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
    });

    const report = vimshopakaCalculator.calculateVimshopaka(chart);

    expect(Object.keys(report.planets).length).toBe(7);
    for (const [_, pScore] of Object.entries(report.planets)) {
      expect(pScore.shadvargaScore).toBeGreaterThanOrEqual(0);
      expect(pScore.shadvargaScore).toBeLessThanOrEqual(20);
      expect(pScore.shodashavargaScore).toBeGreaterThanOrEqual(0);
      expect(pScore.shodashavargaScore).toBeLessThanOrEqual(20);
      expect(pScore.shodashavargaPlacements.length).toBe(16);
      expect(pScore.vaisheshikamsaCategory).toBeDefined();
    }

    expect(Object.keys(report.rashmis).length).toBe(7);
    expect(report.totalChartRays).toBeGreaterThan(0);
  });
});
