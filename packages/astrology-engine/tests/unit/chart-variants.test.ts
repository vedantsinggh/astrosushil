import { describe, it, expect } from 'vitest';
import { ChartVariantsCalculator } from '../../src/chart/chart-variants.calculator';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';
import { BENCHMARK_REFERENCE_CHARTS } from '../fixtures/reference-charts';

describe('Chart Variants Engine Tests', () => {
  const chartCalculator = new ChartCalculator(new MockEphemerisProvider());
  const variantsCalculator = new ChartVariantsCalculator();
  const fixture = BENCHMARK_REFERENCE_CHARTS[0];

  it('should derive Sun, Moon, Karakamsha, Sunrise, Equal, and Sripati charts from base chart', async () => {
    const chart = await chartCalculator.calculateChart(fixture.birthDetails, {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
    });

    const variants = variantsCalculator.calculateAllVariants(chart);

    expect(variants.rashi.chart.ascendant).toBeDefined();
    expect(variants.sunChart.chart.ascendant).toBeDefined();
    expect(variants.moonChart.chart.ascendant).toBeDefined();
    expect(variants.karakamshaChart.chart.ascendant).toBeDefined();
    expect(variants.sunriseChart.chart.ascendant).toBeDefined();
    expect(variants.bhavaEqual.chart.houses.length).toBe(12);
    expect(variants.bhavaSripati.chart.houses.length).toBe(12);

    // Verify Sun chart has Sun in 1st house
    const sunPlanetInSunChart = variants.sunChart.chart.planets.find((p) => p.name === 'SUN');
    expect(sunPlanetInSunChart?.house).toBe(1);

    // Verify Moon chart has Moon in 1st house
    const moonPlanetInMoonChart = variants.moonChart.chart.planets.find((p) => p.name === 'MOON');
    expect(moonPlanetInMoonChart?.house).toBe(1);
  });
});
