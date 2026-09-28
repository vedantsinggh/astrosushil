import { describe, it, expect } from 'vitest';
import { KPCalculator } from '../../src/kp/kp-calculator';
import { KPSubLordCalculator } from '../../src/kp/kp-sub-lords';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';
import { BENCHMARK_REFERENCE_CHARTS } from '../fixtures/reference-charts';

describe('KP (Krishnamurti Padhdhati) Engine Tests', () => {
  const chartCalculator = new ChartCalculator(new MockEphemerisProvider());
  const kpCalculator = new KPCalculator();
  const fixture = BENCHMARK_REFERENCE_CHARTS[0];

  it('should compute 4-tier KP Lordship for any longitude within [0, 360)', () => {
    const lords = KPSubLordCalculator.calculateKPLords(15.5); // Aries, Bharani
    expect(lords.signLord).toBeDefined();
    expect(lords.starLord).toBeDefined();
    expect(lords.subLord).toBeDefined();
    expect(lords.subSubLord).toBeDefined();
    expect(lords.subNumber).toBeGreaterThanOrEqual(1);
    expect(lords.subNumber).toBeLessThanOrEqual(249);
  });

  it('should calculate complete KP Report including Cusps, Significators, Ruling Planets, and Pars Fortuna', async () => {
    const chart = await chartCalculator.calculateChart(fixture.birthDetails, {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
    });

    const birthDate = new Date('1990-01-15T06:30:00.000Z');
    const kpReport = kpCalculator.calculateKP(chart, birthDate, true);

    expect(kpReport.cusps.length).toBe(12);
    expect(Object.keys(kpReport.planets).length).toBeGreaterThanOrEqual(7);
    expect(kpReport.houseSignificators.length).toBe(12);
    expect(kpReport.rulingPlanets.primaryRulingPlanets.length).toBeGreaterThan(0);
    expect(kpReport.parsFortuna.longitude).toBeGreaterThanOrEqual(0);
    expect(kpReport.parsFortuna.longitude).toBeLessThan(360);
  });
});
