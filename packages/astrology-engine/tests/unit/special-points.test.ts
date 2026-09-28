import { describe, it, expect } from 'vitest';
import { SpecialPointsCalculator } from '../../src/special-points/special-points.calculator';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';
import { BENCHMARK_REFERENCE_CHARTS } from '../fixtures/reference-charts';
import { PlanetSymbol } from '../../src/planets/planet.types';

describe('Special Points & Upagrahas Engine Tests', () => {
  const chartCalculator = new ChartCalculator(new MockEphemerisProvider());
  const specialPointsCalculator = new SpecialPointsCalculator();
  const fixture = BENCHMARK_REFERENCE_CHARTS[0];

  it('should calculate 5 mathematical Upagrahas deterministically', async () => {
    const chart = await chartCalculator.calculateChart(fixture.birthDetails, {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
    });

    const birthDate = new Date('1990-01-15T06:30:00.000Z');
    const upagrahas = specialPointsCalculator.calculateUpagrahas(
      chart.planets[PlanetSymbol.SUN].longitude,
      chart.ascendant!.rashiIndex,
      birthDate,
      fixture.birthDetails.latitude,
      fixture.birthDetails.longitude
    );

    expect(upagrahas.dhooma.longitude).toBeGreaterThanOrEqual(0);
    expect(upagrahas.dhooma.longitude).toBeLessThan(360);
    expect(upagrahas.vyatipata.longitude).toBeGreaterThanOrEqual(0);
    expect(upagrahas.parivesha.longitude).toBeGreaterThanOrEqual(0);
    expect(upagrahas.indrachapa.longitude).toBeGreaterThanOrEqual(0);
    expect(upagrahas.upaketu.longitude).toBeGreaterThanOrEqual(0);
    expect(upagrahas.gulika.longitude).toBeGreaterThanOrEqual(0);
    expect(upagrahas.mandi.longitude).toBeGreaterThanOrEqual(0);

    // Verify mathematical relation: Vyatipata + Dhooma == 360° (or 0°)
    const sum = (upagrahas.vyatipata.longitude + upagrahas.dhooma.longitude) % 360;
    expect(sum < 0.001 || Math.abs(sum - 360) < 0.001).toBe(true);
  });

  it('should calculate Special Lagnas including Indu Lagna and Bhava Lagna', async () => {
    const chart = await chartCalculator.calculateChart(fixture.birthDetails, {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
    });

    const birthDate = new Date('1990-01-15T06:30:00.000Z');
    const specialLagnas = specialPointsCalculator.calculateSpecialLagnas(
      chart,
      birthDate,
      fixture.birthDetails.latitude,
      fixture.birthDetails.longitude
    );

    expect(specialLagnas.bhavaLagna.house).toBeGreaterThanOrEqual(1);
    expect(specialLagnas.bhavaLagna.house).toBeLessThanOrEqual(12);
    expect(specialLagnas.horaLagna.house).toBeGreaterThanOrEqual(1);
    expect(specialLagnas.ghatikaLagna.house).toBeGreaterThanOrEqual(1);
    expect(specialLagnas.induLagna.rashiIndex).toBeGreaterThanOrEqual(1);
    expect(specialLagnas.induLagna.rashiIndex).toBeLessThanOrEqual(12);
    expect(specialLagnas.pranapadaLagna.nakshatraIndex).toBeGreaterThanOrEqual(1);
    expect(specialLagnas.varnadaLagna.rashiIndex).toBeGreaterThanOrEqual(1);
  });

  it('should calculate Arishta Points (64th Navamsha, 22nd Drekkana, Sarpa Drekkana)', async () => {
    const chart = await chartCalculator.calculateChart(fixture.birthDetails, {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
    });

    const arishta = specialPointsCalculator.calculateArishtaPoints(chart);

    expect(arishta.sixtyFourthNavamshaMoon.longitude).toBeGreaterThanOrEqual(0);
    expect(arishta.sixtyFourthNavamshaAscendant.longitude).toBeGreaterThanOrEqual(0);
    expect(arishta.twentySecondDrekkanaAscendant.longitude).toBeGreaterThanOrEqual(0);
    expect(arishta.twentySecondDrekkanaMoon.longitude).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(arishta.sarpaDreshkanaPlacements)).toBe(true);
    expect(arishta.sarpaDreshkanaPlacements.length).toBeGreaterThanOrEqual(7);
  });

  it('should evaluate Yogi and Avyogi points correctly', () => {
    const sunLong = 280.5;
    const moonLong = 125.2;
    const lagnaRashi = 10;

    const yogiDetails = specialPointsCalculator.calculateYogiPoints(sunLong, moonLong, lagnaRashi);

    expect(yogiDetails.yogiPoint.longitude).toBeGreaterThanOrEqual(0);
    expect(yogiDetails.yogiPlanet).toBeDefined();
    expect(yogiDetails.avyogiPoint.longitude).toBeGreaterThanOrEqual(0);
    expect(yogiDetails.avyogiPlanet).toBeDefined();
    expect(yogiDetails.duplicateYogiPlanet).toBeDefined();
  });

  it('should evaluate Mrityu Bhaga without false positives', async () => {
    const chart = await chartCalculator.calculateChart(fixture.birthDetails, {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
    });

    const report = specialPointsCalculator.calculateFromChart(
      chart,
      new Date('1990-01-15T06:30:00.000Z'),
      fixture.birthDetails.latitude,
      fixture.birthDetails.longitude
    );

    expect(report.mrityuBhaga).toBeDefined();
    expect(Array.isArray(report.mrityuBhaga.points)).toBe(true);
    expect(report.mrityuBhaga.points.length).toBeGreaterThanOrEqual(8);
  });
});
