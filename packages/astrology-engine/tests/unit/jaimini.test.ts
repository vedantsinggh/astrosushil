import { describe, it, expect } from 'vitest';
import { JaiminiCalculator } from '../../src/jaimini/jaimini-calculator';
import { ArudhaCalculator } from '../../src/jaimini/arudha-calculator';
import { ArgalaCalculator } from '../../src/jaimini/argala-calculator';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';
import { BENCHMARK_REFERENCE_CHARTS } from '../fixtures/reference-charts';
import { PlanetSymbol } from '../../src/planets/planet.types';

describe('Jaimini Engine Tests', () => {
  const chartCalculator = new ChartCalculator(new MockEphemerisProvider());
  const jaiminiCalculator = new JaiminiCalculator();
  const fixture = BENCHMARK_REFERENCE_CHARTS[0];

  it('should evaluate 7-Karaka and 8-Karaka schemes properly', async () => {
    const chart = await chartCalculator.calculateChart(fixture.birthDetails, {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
    });

    const report7 = jaiminiCalculator.calculateFromChart(chart, 'SEVEN_KARAKA');
    expect(report7.charaKarakas.length).toBe(7);
    expect(report7.charaKarakas[0].code).toBe('AK');
    expect(report7.charaKarakas[6].code).toBe('DK');

    const report8 = jaiminiCalculator.calculateFromChart(chart, 'EIGHT_KARAKA');
    expect(report8.charaKarakas.length).toBe(8);
  });

  it('should calculate 12 Arudha Padas with classical exception shifts', () => {
    // Ascendant Aries (1), Sun in Aries (Lord Mars in Aries 1st) -> Lord in 1st => 10th sign shift
    const padas = ArudhaCalculator.calculateAllArudhas(1, {
      [PlanetSymbol.MARS]: 1, // Lord of 1st in 1st
      [PlanetSymbol.VENUS]: 2,
      [PlanetSymbol.MERCURY]: 3,
      [PlanetSymbol.MOON]: 4,
      [PlanetSymbol.SUN]: 5,
      [PlanetSymbol.JUPITER]: 9,
      [PlanetSymbol.SATURN]: 10,
    });

    expect(padas.length).toBe(12);
    const al = padas.find((p) => p.houseNumber === 1)!;
    // 1st house Aries (1) lord in 1st -> shifts 10 signs forward -> Capricorn (10)
    expect(al.signIndex).toBe(10);
    expect(al.exceptionApplied).toBe('TEN_SIGN_SHIFT');
  });

  it('should compute Rashi Drishti correctly according to sign modalities', () => {
    const drishti = jaiminiCalculator.calculateRashiDrishti({
      [PlanetSymbol.SUN]: 1, // Aries
      [PlanetSymbol.JUPITER]: 5, // Leo
    });

    expect(drishti.length).toBe(12);
    const ariesDrishti = drishti.find((d) => d.sourceSignIndex === 1)!;
    // Movable (Aries) aspects Fixed (Leo 5, Scorpio 8, Aquarius 11) except adjacent (Taurus 2)
    const aspectedSigns = ariesDrishti.aspectedSigns.map((s) => s.signIndex);
    expect(aspectedSigns).toContain(5);
    expect(aspectedSigns).toContain(8);
    expect(aspectedSigns).toContain(11);
    expect(aspectedSigns).not.toContain(2);
  });

  it('should evaluate Argala and Virodha Argala deterministically', () => {
    const argalas = ArgalaCalculator.calculateArgalaForHouses(1, {
      [PlanetSymbol.JUPITER]: 2, // 2nd house (Argala on 1st)
      [PlanetSymbol.SATURN]: 12, // 12th house (Virodha on 1st)
    });

    expect(argalas.length).toBe(12);
    const house1 = argalas.find((a) => a.houseNumber === 1)!;
    expect(house1.interveningHouses.length).toBeGreaterThan(0);
    expect(house1.obstructingHouses.length).toBeGreaterThan(0);
  });
});
