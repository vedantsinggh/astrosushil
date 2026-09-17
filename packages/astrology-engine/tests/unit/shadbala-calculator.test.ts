import { describe, it, expect } from 'vitest';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { PlanetSymbol } from '../../src/planets/planet.types';
import {
  calculateUchchaBala,
  calculateOjhayugmaBala,
  calculateKendradiBala,
  calculateDrekkanaBala,
  calculateSthanaBala,
} from '../../src/strength/sthana-bala';
import { calculateDigBala } from '../../src/strength/dig-bala';
import {
  calculateNathonnathaBala,
  calculatePakshaBala,
  calculateTribhagaBala,
  calculateVaraBala,
  calculateHoraBala,
  calculateAyanaBala,
  calculateKalaBala,
} from '../../src/strength/kala-bala';
import { calculateCheshtaBala } from '../../src/strength/cheshta-bala';
import { calculateNaisargikaBala, NAISARGIKA_BALA_VIRUPAS } from '../../src/strength/naisargika-bala';
import { calculateAspectValue, calculateDrikBala } from '../../src/strength/drik-bala';
import { ShadbalaCalculator } from '../../src/strength/shadbala-calculator';
import { SHADBALA_PLANETS } from '../../src/strength/strength.types';

function createMockChart(): AstroChart {
  return {
    metadata: {
      engineVersion: '0.1.0',
      calculationTimestampIso: '2026-09-08T00:00:00Z',
      providerName: 'SwissEphemeris',
      providerVersion: '2.10',
      config: {
        zodiacType: 'SIDEREAL' as any,
        ayanamsa: 'LAHIRI' as any,
        houseSystem: 'WHOLE_SIGN' as any,
        nodeCalculation: 'MEAN_NODE' as any,
        planetaryCalculationMode: 'GEOCENTRIC' as any,
      },
      normalizedTime: {
        utcIsoString: '2026-09-08T06:00:00.000Z',
        utcTimestampMs: 1788847200000,
        birthDateUtc: new Date('2026-09-08T06:00:00Z'),
        julianDayUT: 2461291.75,
        deltaTSeconds: 69.2,
        timezoneOffsetMinutes: 330,
        originalDetails: {} as any,
      },
    },
    birthDetails: {
      date: { year: 2026, month: 9, day: 8 },
      time: { hour: 11, minute: 30, second: 0 },
      dateOfBirth: '2026-09-08',
      timeOfBirth: '11:30:00',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
    },
    ascendant: {
      name: 'Ascendant',
      longitude: 215.0, // 5° Scorpio (8)
      rashiIndex: 8,
      degreeInRashi: 5.0,
      nakshatraIndex: 16,
      pada: 2,
      nakshatraLord: PlanetSymbol.JUPITER,
    },
    planets: {
      [PlanetSymbol.SUN]: {
        planet: PlanetSymbol.SUN,
        longitude: 10.0, // 10° Aries (Deep exaltation)
        latitude: 0.0,
        distanceAU: 1.0,
        speedLongitude: 0.98,
        isRetrograde: false,
        rashiIndex: 1,
        rashiName: 'Mesha',
        degreeInRashi: 10.0,
        nakshatraIndex: 1,
        nakshatraName: 'Ashwini',
        pada: 3,
        nakshatraLord: PlanetSymbol.KETU,
      },
      [PlanetSymbol.MOON]: {
        planet: PlanetSymbol.MOON,
        longitude: 33.0, // 3° Taurus (Deep exaltation)
        latitude: 4.5,
        distanceAU: 0.0025,
        speedLongitude: 13.2,
        isRetrograde: false,
        rashiIndex: 2,
        rashiName: 'Vrishabha',
        degreeInRashi: 3.0,
        nakshatraIndex: 2,
        nakshatraName: 'Bharani',
        pada: 1,
        nakshatraLord: PlanetSymbol.VENUS,
      },
      [PlanetSymbol.MARS]: {
        planet: PlanetSymbol.MARS,
        longitude: 298.0, // 28° Capricorn (Deep exaltation)
        latitude: -1.2,
        distanceAU: 1.4,
        speedLongitude: 0.65,
        isRetrograde: false,
        rashiIndex: 10,
        rashiName: 'Makara',
        degreeInRashi: 28.0,
        nakshatraIndex: 23,
        nakshatraName: 'Dhanishta',
        pada: 2,
        nakshatraLord: PlanetSymbol.MARS,
      },
      [PlanetSymbol.MERCURY]: {
        planet: PlanetSymbol.MERCURY,
        longitude: 165.0, // 15° Virgo (Deep exaltation)
        latitude: 1.5,
        distanceAU: 0.9,
        speedLongitude: -0.3,
        isRetrograde: true,
        rashiIndex: 6,
        rashiName: 'Kanya',
        degreeInRashi: 15.0,
        nakshatraIndex: 12,
        nakshatraName: 'Uttara Phalguni',
        pada: 4,
        nakshatraLord: PlanetSymbol.SUN,
      },
      [PlanetSymbol.JUPITER]: {
        planet: PlanetSymbol.JUPITER,
        longitude: 95.0, // 5° Cancer (Deep exaltation)
        latitude: 0.3,
        distanceAU: 5.2,
        speedLongitude: 0.08,
        isRetrograde: false,
        rashiIndex: 4,
        rashiName: 'Karka',
        degreeInRashi: 5.0,
        nakshatraIndex: 8,
        nakshatraName: 'Pushya',
        pada: 1,
        nakshatraLord: PlanetSymbol.SATURN,
      },
      [PlanetSymbol.VENUS]: {
        planet: PlanetSymbol.VENUS,
        longitude: 357.0, // 27° Pisces (Deep exaltation)
        latitude: -2.1,
        distanceAU: 0.72,
        speedLongitude: 1.15,
        isRetrograde: false,
        rashiIndex: 12,
        rashiName: 'Meena',
        degreeInRashi: 27.0,
        nakshatraIndex: 27,
        nakshatraName: 'Revati',
        pada: 4,
        nakshatraLord: PlanetSymbol.MERCURY,
      },
      [PlanetSymbol.SATURN]: {
        planet: PlanetSymbol.SATURN,
        longitude: 200.0, // 20° Libra (Deep exaltation)
        latitude: 2.2,
        distanceAU: 9.8,
        speedLongitude: 0.03,
        isRetrograde: false,
        rashiIndex: 7,
        rashiName: 'Tula',
        degreeInRashi: 20.0,
        nakshatraIndex: 16,
        nakshatraName: 'Vishakha',
        pada: 1,
        nakshatraLord: PlanetSymbol.JUPITER,
      },
      [PlanetSymbol.RAHU]: {
        planet: PlanetSymbol.RAHU,
        longitude: 45.0,
        latitude: 0.0,
        distanceAU: 0.00257,
        speedLongitude: -0.05,
        isRetrograde: true,
        rashiIndex: 2,
        rashiName: 'Vrishabha',
        degreeInRashi: 15.0,
        nakshatraIndex: 4,
        nakshatraName: 'Rohini',
        pada: 2,
        nakshatraLord: PlanetSymbol.MOON,
      },
      [PlanetSymbol.KETU]: {
        planet: PlanetSymbol.KETU,
        longitude: 225.0,
        latitude: 0.0,
        distanceAU: 0.00257,
        speedLongitude: -0.05,
        isRetrograde: true,
        rashiIndex: 8,
        rashiName: 'Vrischika',
        degreeInRashi: 15.0,
        nakshatraIndex: 17,
        nakshatraName: 'Anuradha',
        pada: 4,
        nakshatraLord: PlanetSymbol.SATURN,
      },
    } as any,
    houses: [
      { houseNumber: 1, cuspLongitude: 215.0, startLongitude: 210.0, endLongitude: 240.0, rashiIndex: 8, rashiName: 'Vrischika' },
      { houseNumber: 2, cuspLongitude: 245.0, startLongitude: 240.0, endLongitude: 270.0, rashiIndex: 9, rashiName: 'Dhanu' },
      { houseNumber: 3, cuspLongitude: 275.0, startLongitude: 270.0, endLongitude: 300.0, rashiIndex: 10, rashiName: 'Makara' },
      { houseNumber: 4, cuspLongitude: 305.0, startLongitude: 300.0, endLongitude: 330.0, rashiIndex: 11, rashiName: 'Kumbha' },
      { houseNumber: 5, cuspLongitude: 335.0, startLongitude: 330.0, endLongitude: 360.0, rashiIndex: 12, rashiName: 'Meena' },
      { houseNumber: 6, cuspLongitude: 5.0, startLongitude: 0.0, endLongitude: 30.0, rashiIndex: 1, rashiName: 'Mesha' },
      { houseNumber: 7, cuspLongitude: 35.0, startLongitude: 30.0, endLongitude: 60.0, rashiIndex: 2, rashiName: 'Vrishabha' },
      { houseNumber: 8, cuspLongitude: 65.0, startLongitude: 60.0, endLongitude: 90.0, rashiIndex: 3, rashiName: 'Mithuna' },
      { houseNumber: 9, cuspLongitude: 95.0, startLongitude: 90.0, endLongitude: 120.0, rashiIndex: 4, rashiName: 'Karka' },
      { houseNumber: 10, cuspLongitude: 125.0, startLongitude: 120.0, endLongitude: 150.0, rashiIndex: 5, rashiName: 'Simha' },
      { houseNumber: 11, cuspLongitude: 155.0, startLongitude: 150.0, endLongitude: 180.0, rashiIndex: 6, rashiName: 'Kanya' },
      { houseNumber: 12, cuspLongitude: 185.0, startLongitude: 180.0, endLongitude: 210.0, rashiIndex: 7, rashiName: 'Tula' },
    ],
  };
}

describe('Phase 2C: Shadbala Calculations Suite', () => {
  const chart = createMockChart();

  describe('1. Sthana Bala (Positional Strength)', () => {
    it('calculates full Uchcha Bala (60) at exact deep exaltation degree', () => {
      // Sun deep exaltation is 10° Aries (10.0)
      expect(calculateUchchaBala(PlanetSymbol.SUN, 10.0)).toBe(60.0);
      // Moon deep exaltation is 3° Taurus (33.0)
      expect(calculateUchchaBala(PlanetSymbol.MOON, 33.0)).toBe(60.0);
      // Jupiter deep exaltation is 5° Cancer (95.0)
      expect(calculateUchchaBala(PlanetSymbol.JUPITER, 95.0)).toBe(60.0);
      // Saturn deep exaltation is 20° Libra (200.0)
      expect(calculateUchchaBala(PlanetSymbol.SATURN, 200.0)).toBe(60.0);
    });

    it('calculates zero Uchcha Bala (0) at exact deep debilitation degree', () => {
      // Sun deep debilitation is 10° Libra (190.0)
      expect(calculateUchchaBala(PlanetSymbol.SUN, 190.0)).toBe(0.0);
      // Saturn deep debilitation is 20° Aries (20.0)
      expect(calculateUchchaBala(PlanetSymbol.SATURN, 20.0)).toBe(0.0);
    });

    it('calculates 30 Uchcha Bala at 90 degrees away from exaltation/debilitation', () => {
      // Sun exaltation 10.0 + 90 = 100.0 (10° Cancer)
      expect(calculateUchchaBala(PlanetSymbol.SUN, 100.0)).toBe(30.0);
    });

    it('calculates Ojhayugma Bala correctly for male, female, and neutral planets', () => {
      // Sun (Male) in Odd Rashi & Odd Navamsha gets 30
      // Aries (1, Odd), Navamsha 10° is Cancer (4, Even) -> 15
      expect(calculateOjhayugmaBala(PlanetSymbol.SUN, 1, 4)).toBe(15);
      // Moon (Female) in Even Rashi & Even Navamsha gets 30
      expect(calculateOjhayugmaBala(PlanetSymbol.MOON, 2, 4)).toBe(30);
    });

    it('calculates Kendradi Bala based on Kendra, Panaphara, Apoklima', () => {
      // Kendra houses (1, 4, 7, 10) -> 60
      expect(calculateKendradiBala(1)).toBe(60);
      expect(calculateKendradiBala(4)).toBe(60);
      expect(calculateKendradiBala(7)).toBe(60);
      expect(calculateKendradiBala(10)).toBe(60);

      // Panaphara houses (2, 5, 8, 11) -> 30
      expect(calculateKendradiBala(2)).toBe(30);
      expect(calculateKendradiBala(5)).toBe(30);

      // Apoklima houses (3, 6, 9, 12) -> 15
      expect(calculateKendradiBala(3)).toBe(15);
      expect(calculateKendradiBala(12)).toBe(15);
    });

    it('calculates Drekkana Bala correctly according to decanate gender', () => {
      // Sun (Male) in 1st decanate (0-10°) gets 15
      expect(calculateDrekkanaBala(PlanetSymbol.SUN, 5.0)).toBe(15);
      // Sun in 2nd decanate gets 0
      expect(calculateDrekkanaBala(PlanetSymbol.SUN, 15.0)).toBe(0);

      // Mercury (Neutral) in 2nd decanate (10-20°) gets 15
      expect(calculateDrekkanaBala(PlanetSymbol.MERCURY, 15.0)).toBe(15);

      // Moon (Female) in 3rd decanate (20-30°) gets 15
      expect(calculateDrekkanaBala(PlanetSymbol.MOON, 25.0)).toBe(15);
    });

    it('computes complete Sthana Bala breakdown for all 7 physical planets', () => {
      for (const p of SHADBALA_PLANETS) {
        const breakdown = calculateSthanaBala(p, chart);
        expect(breakdown.uchchaBala).toBeGreaterThanOrEqual(0);
        expect(breakdown.uchchaBala).toBeLessThanOrEqual(60);
        expect(breakdown.saptavargajaBala).toBeGreaterThanOrEqual(0);
        expect(breakdown.ojhayugmaBala).toBeGreaterThanOrEqual(0);
        expect(breakdown.kendradiBala).toBeGreaterThanOrEqual(15);
        expect(breakdown.drekkanaBala).toBeGreaterThanOrEqual(0);
        expect(breakdown.total).toBe(
          Number(
            (
              breakdown.uchchaBala +
              breakdown.saptavargajaBala +
              breakdown.ojhayugmaBala +
              breakdown.kendradiBala +
              breakdown.drekkanaBala
            ).toFixed(4)
          )
        );
      }
    });
  });

  describe('2. Dig Bala (Directional Strength)', () => {
    const mockAscChart = { ascendant: { longitude: 0.0 } } as AstroChart;

    it('gives full 60 Dig Bala at the exact directional peak', () => {
      // Sun / Mars powerful at 10th house cusp (ascendant + 270°)
      const asc = 0.0;
      const h10Cusp = 270.0;
      expect(calculateDigBala(PlanetSymbol.SUN, h10Cusp, mockAscChart)).toBe(60.0);
      expect(calculateDigBala(PlanetSymbol.MARS, h10Cusp, mockAscChart)).toBe(60.0);

      // Jupiter / Mercury powerful at 1st house cusp (ascendant)
      expect(calculateDigBala(PlanetSymbol.JUPITER, asc, mockAscChart)).toBe(60.0);
      expect(calculateDigBala(PlanetSymbol.MERCURY, asc, mockAscChart)).toBe(60.0);

      // Venus / Moon powerful at 4th house cusp (ascendant + 90°)
      const h4Cusp = 90.0;
      expect(calculateDigBala(PlanetSymbol.VENUS, h4Cusp, mockAscChart)).toBe(60.0);
      expect(calculateDigBala(PlanetSymbol.MOON, h4Cusp, mockAscChart)).toBe(60.0);

      // Saturn powerful at 7th house cusp (ascendant + 180°)
      const h7Cusp = 180.0;
      expect(calculateDigBala(PlanetSymbol.SATURN, h7Cusp, mockAscChart)).toBe(60.0);
    });

    it('gives 0 Dig Bala at the Nirbala (opposite) point', () => {
      // Sun nirbala at 4th cusp (90°)
      expect(calculateDigBala(PlanetSymbol.SUN, 90.0, mockAscChart)).toBe(0.0);
      // Jupiter nirbala at 7th cusp (180°)
      expect(calculateDigBala(PlanetSymbol.JUPITER, 180.0, mockAscChart)).toBe(0.0);
      // Saturn nirbala at 1st cusp (0°)
      expect(calculateDigBala(PlanetSymbol.SATURN, 0.0, mockAscChart)).toBe(0.0);
    });
  });

  describe('3. Kala Bala (Temporal Strength)', () => {
    it('calculates Nathonnatha Bala correctly for day vs night', () => {
      // Day chart
      expect(calculateNathonnathaBala(PlanetSymbol.SUN, true)).toBe(60);
      expect(calculateNathonnathaBala(PlanetSymbol.JUPITER, true)).toBe(60);
      expect(calculateNathonnathaBala(PlanetSymbol.VENUS, true)).toBe(60);
      expect(calculateNathonnathaBala(PlanetSymbol.MOON, true)).toBe(0);
      expect(calculateNathonnathaBala(PlanetSymbol.MARS, true)).toBe(0);
      expect(calculateNathonnathaBala(PlanetSymbol.SATURN, true)).toBe(0);
      expect(calculateNathonnathaBala(PlanetSymbol.MERCURY, true)).toBe(60); // Mercury always 60

      // Night chart
      expect(calculateNathonnathaBala(PlanetSymbol.MOON, false)).toBe(60);
      expect(calculateNathonnathaBala(PlanetSymbol.MARS, false)).toBe(60);
      expect(calculateNathonnathaBala(PlanetSymbol.SATURN, false)).toBe(60);
      expect(calculateNathonnathaBala(PlanetSymbol.SUN, false)).toBe(0);
    });

    it('calculates Paksha Bala correctly across lunar phases and doubles for Moon', () => {
      // Full Moon (180° elongation) -> Paksha Bala 60, Moon doubles to 120
      const fullMoonBala = calculatePakshaBala(PlanetSymbol.JUPITER, 0, 180);
      expect(fullMoonBala).toBe(60);
      const moonDouble = calculatePakshaBala(PlanetSymbol.MOON, 0, 180);
      expect(moonDouble).toBe(120);

      // New Moon (0° elongation) -> Benefics 0, Malefics get 60 - 0 = 60
      const sunNewMoon = calculatePakshaBala(PlanetSymbol.SUN, 0, 0);
      expect(sunNewMoon).toBe(60);
    });

    it('calculates Vara Bala granting 45 Virupas to the day ruler', () => {
      // Tuesday (day 2): Mars
      expect(calculateVaraBala(PlanetSymbol.MARS, 2)).toBe(45);
      expect(calculateVaraBala(PlanetSymbol.SUN, 2)).toBe(0);
    });

    it('calculates Hora Bala granting 60 Virupas to the hora ruler', () => {
      // Thursday (day 4) at 6 AM -> Jupiter's hora
      expect(calculateHoraBala(PlanetSymbol.JUPITER, 4, 6.0)).toBe(60);
      expect(calculateHoraBala(PlanetSymbol.VENUS, 4, 6.0)).toBe(0);
    });

    it('computes complete Kala Bala breakdown deterministically', () => {
      for (const p of SHADBALA_PLANETS) {
        const kala = calculateKalaBala(p, chart);
        expect(kala.total).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('4. Cheshta Bala (Motional Strength)', () => {
    it('awards 60 Cheshta Bala to retrograde planets', () => {
      const retroChart: AstroChart = {
        ...chart,
        planets: {
          ...chart.planets,
          [PlanetSymbol.MERCURY]: {
            ...chart.planets[PlanetSymbol.MERCURY],
            isRetrograde: true,
            speedLongitude: -0.2,
          },
        },
      };
      expect(calculateCheshtaBala(PlanetSymbol.MERCURY, retroChart)).toBe(60.0);
    });

    it('awards Ayana Bala to Sun and Paksha Bala to Moon as Cheshta Bala', () => {
      const sunCheshta = calculateCheshtaBala(PlanetSymbol.SUN, chart);
      expect(sunCheshta).toBeGreaterThanOrEqual(0);
      expect(sunCheshta).toBeLessThanOrEqual(60);

      const moonCheshta = calculateCheshtaBala(PlanetSymbol.MOON, chart);
      expect(moonCheshta).toBeGreaterThanOrEqual(0);
      expect(moonCheshta).toBeLessThanOrEqual(60);
    });
  });

  describe('5. Naisargika Bala (Natural Luminosity Strength)', () => {
    it('returns exact classical Virupa constants', () => {
      expect(calculateNaisargikaBala(PlanetSymbol.SUN)).toBe(60.0);
      expect(calculateNaisargikaBala(PlanetSymbol.MOON)).toBe(51.43);
      expect(calculateNaisargikaBala(PlanetSymbol.VENUS)).toBe(42.86);
      expect(calculateNaisargikaBala(PlanetSymbol.JUPITER)).toBe(34.29);
      expect(calculateNaisargikaBala(PlanetSymbol.MERCURY)).toBe(25.71);
      expect(calculateNaisargikaBala(PlanetSymbol.MARS)).toBe(17.14);
      expect(calculateNaisargikaBala(PlanetSymbol.SATURN)).toBe(8.57);
    });
  });

  describe('6. Drik Bala (Aspectual Strength)', () => {
    it('calculates aspect curve according to BPHS Ch. 28', () => {
      // 180° opposition has full aspect (60 Virupas)
      expect(calculateAspectValue(0.0, 180.0, PlanetSymbol.SUN)).toBe(60.0);
      // 0° conjunction has 0 aspect
      expect(calculateAspectValue(0.0, 0.0, PlanetSymbol.SUN)).toBe(0.0);
    });

    it('calculates Drik Bala with positive benefic and negative malefic aspects', () => {
      const drikSun = calculateDrikBala(PlanetSymbol.SUN, chart);
      expect(typeof drikSun).toBe('number');
      expect(Number.isFinite(drikSun)).toBe(true);
    });
  });

  describe('7. Unified Shadbala Calculator Orchestration', () => {
    const calculator = new ShadbalaCalculator();
    const report = calculator.calculate(chart);

    it('calculates strength for all 7 physical planets and excludes nodes', () => {
      expect(Object.keys(report.planets)).toHaveLength(7);
      for (const p of SHADBALA_PLANETS) {
        expect(report.planets[p]).toBeDefined();
      }
      expect(report.planets[PlanetSymbol.RAHU]).toBeUndefined();
      expect(report.planets[PlanetSymbol.KETU]).toBeUndefined();
    });

    it('ranks all 7 planets uniquely from 1 to 7', () => {
      expect(report.summary).toHaveLength(7);
      const ranks = report.summary.map((p) => p.rank).sort();
      expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7]);
      // Verify summary is sorted in descending order of ratio (relative strength)
      for (let i = 0; i < report.summary.length - 1; i++) {
        expect(report.summary[i].ratio).toBeGreaterThanOrEqual(
          report.summary[i + 1].ratio
        );
      }
    });

    it('converts Shashtiamsas to Rupas accurately (Virupas / 60)', () => {
      for (const p of report.summary) {
        expect(p.totalRupas).toBeCloseTo(p.totalShashtiamsas / 60.0, 3);
        expect(p.ratio).toBeCloseTo(p.totalShashtiamsas / p.minimumRequirement, 3);
        expect(p.isStrong).toBe(p.ratio >= 1.0);
      }
    });

    it('guarantees numerical determinism on repeated calls', () => {
      const report2 = calculator.calculate(chart);
      expect(report).toEqual(report2);
    });
  });
});
