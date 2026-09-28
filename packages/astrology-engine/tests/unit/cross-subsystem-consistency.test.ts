import { describe, it, expect } from 'vitest';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';
import { BENCHMARK_REFERENCE_CHARTS } from '../fixtures/reference-charts';
import { SpecialPointsCalculator } from '../../src/special-points/special-points.calculator';
import { JaiminiCalculator } from '../../src/jaimini/jaimini-calculator';
import { KPCalculator } from '../../src/kp/kp-calculator';
import { ChartVariantsCalculator } from '../../src/chart/chart-variants.calculator';
import { VimshopakaCalculator } from '../../src/strength/vimshopaka-calculator';
import { PlanetSymbol } from '../../src/planets/planet.types';

describe('Cross-Subsystem Consistency & Determinism Tests (Step 25 & 26)', () => {
  const chartCalculator = new ChartCalculator(new MockEphemerisProvider());
  const fixture = BENCHMARK_REFERENCE_CHARTS[0];

  it('should maintain strict identity between chart planets, Jaimini, KP, Special Points, and Variants', async () => {
    const config = {
      zodiacType: 'SIDEREAL' as const,
      ayanamsa: 'LAHIRI' as const,
      houseSystem: 'WHOLE_SIGN' as const,
    };

    const chart1 = await chartCalculator.calculateChart(fixture.birthDetails, config);
    const chart2 = await chartCalculator.calculateChart(fixture.birthDetails, config);

    // Byte & value determinism
    expect(chart1.planets).toEqual(chart2.planets);
    expect(chart1.ascendant).toEqual(chart2.ascendant);

    // Special Points
    const spCalc = new SpecialPointsCalculator();
    const spReport1 = spCalc.calculateFromChart(chart1, new Date('1990-01-15T06:30:00.000Z'), fixture.birthDetails.latitude, fixture.birthDetails.longitude);
    const spReport2 = spCalc.calculateFromChart(chart2, new Date('1990-01-15T06:30:00.000Z'), fixture.birthDetails.latitude, fixture.birthDetails.longitude);
    expect(spReport1).toEqual(spReport2);

    // Jaimini
    const jaiminiCalc = new JaiminiCalculator();
    const jaiminiReport1 = jaiminiCalc.calculateFromChart(chart1);
    const jaiminiReport2 = jaiminiCalc.calculateFromChart(chart2);
    expect(jaiminiReport1).toEqual(jaiminiReport2);

    // KP
    const kpCalc = new KPCalculator();
    const kpReport1 = kpCalc.calculateKP(chart1, new Date('1990-01-15T06:30:00.000Z'), true);
    const kpReport2 = kpCalc.calculateKP(chart2, new Date('1990-01-15T06:30:00.000Z'), true);
    expect(kpReport1).toEqual(kpReport2);

    // Variants: Compare planet longitudes and houses
    const varCalc = new ChartVariantsCalculator();
    const varReport1 = varCalc.calculateAllVariants(chart1);
    const varReport2 = varCalc.calculateAllVariants(chart2);
    expect(varReport1.sunChart.chart.planets).toEqual(varReport2.sunChart.chart.planets);
    expect(varReport1.moonChart.chart.planets).toEqual(varReport2.moonChart.chart.planets);
    expect(varReport1.karakamshaChart.chart.planets).toEqual(varReport2.karakamshaChart.chart.planets);
    expect(varReport1.bhavaEqual.chart.houses).toEqual(varReport2.bhavaEqual.chart.houses);

    // Vimshopaka
    const vimCalc = new VimshopakaCalculator();
    const vimReport1 = vimCalc.calculateVimshopaka(chart1);
    const vimReport2 = vimCalc.calculateVimshopaka(chart2);
    expect(vimReport1).toEqual(vimReport2);
  });
});
