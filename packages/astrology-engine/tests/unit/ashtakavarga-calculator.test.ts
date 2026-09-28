import { describe, it, expect } from 'vitest';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { PlanetSymbol } from '../../src/planets/planet.types';
import {
  ASHTAKAVARGA_CONTRIBUTORS,
  ASHTAKAVARGA_PLANETS,
  BAV_EXPECTED_TOTALS,
  SAV_EXPECTED_GRAND_TOTAL,
  AshtakavargaContributor,
} from '../../src/ashtakavarga/ashtakavarga.types';
import { calculateBhinnashtakavarga } from '../../src/ashtakavarga/bav-calculator';
import { calculateSarvashtakavarga } from '../../src/ashtakavarga/sav-calculator';
import {
  calculateTrikonaShodhana,
  calculateEkadhipatyaShodhana,
} from '../../src/ashtakavarga/shodhana-calculator';
import {
  calculateShodhyaPinda,
  RASHI_GUNAKARAS,
  GRAHA_GUNAKARAS,
} from '../../src/ashtakavarga/pinda-calculator';
import { AshtakavargaCalculator } from '../../src/ashtakavarga/ashtakavarga-calculator';

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
      longitude: 145.0, // Leo (5)
      rashiIndex: 5,
      degreeInRashi: 25.0,
      nakshatraIndex: 11,
      pada: 4,
      nakshatraLord: PlanetSymbol.VENUS,
    },
    planets: {
      [PlanetSymbol.SUN]: {
        planet: PlanetSymbol.SUN,
        longitude: 40.0, // Taurus (2)
        latitude: 0.0,
        distanceAU: 1.0,
        speedLongitude: 0.98,
        isRetrograde: false,
        rashiIndex: 2,
        rashiName: 'Vrishabha',
        degreeInRashi: 10.0,
        nakshatraIndex: 3,
        nakshatraName: 'Krittika',
        pada: 4,
        nakshatraLord: PlanetSymbol.SUN,
      },
      [PlanetSymbol.MOON]: {
        planet: PlanetSymbol.MOON,
        longitude: 95.0, // Cancer (4)
        latitude: 4.5,
        distanceAU: 0.0025,
        speedLongitude: 13.2,
        isRetrograde: false,
        rashiIndex: 4,
        rashiName: 'Karka',
        degreeInRashi: 5.0,
        nakshatraIndex: 8,
        nakshatraName: 'Pushya',
        pada: 2,
        nakshatraLord: PlanetSymbol.SATURN,
      },
      [PlanetSymbol.MARS]: {
        planet: PlanetSymbol.MARS,
        longitude: 275.0, // Capricorn (10)
        latitude: -1.2,
        distanceAU: 1.4,
        speedLongitude: 0.65,
        isRetrograde: false,
        rashiIndex: 10,
        rashiName: 'Makara',
        degreeInRashi: 5.0,
        nakshatraIndex: 21,
        nakshatraName: 'Uttara Ashadha',
        pada: 3,
        nakshatraLord: PlanetSymbol.SUN,
      },
      [PlanetSymbol.MERCURY]: {
        planet: PlanetSymbol.MERCURY,
        longitude: 55.0, // Taurus (2)
        latitude: 1.5,
        distanceAU: 0.9,
        speedLongitude: 1.2,
        isRetrograde: false,
        rashiIndex: 2,
        rashiName: 'Vrishabha',
        degreeInRashi: 25.0,
        nakshatraIndex: 4,
        nakshatraName: 'Rohini',
        pada: 4,
        nakshatraLord: PlanetSymbol.MOON,
      },
      [PlanetSymbol.JUPITER]: {
        planet: PlanetSymbol.JUPITER,
        longitude: 100.0, // Cancer (4)
        latitude: 0.3,
        distanceAU: 5.2,
        speedLongitude: 0.08,
        isRetrograde: false,
        rashiIndex: 4,
        rashiName: 'Karka',
        degreeInRashi: 10.0,
        nakshatraIndex: 8,
        nakshatraName: 'Pushya',
        pada: 3,
        nakshatraLord: PlanetSymbol.SATURN,
      },
      [PlanetSymbol.VENUS]: {
        planet: PlanetSymbol.VENUS,
        longitude: 15.0, // Aries (1)
        latitude: -2.1,
        distanceAU: 0.72,
        speedLongitude: 1.15,
        isRetrograde: false,
        rashiIndex: 1,
        rashiName: 'Mesha',
        degreeInRashi: 15.0,
        nakshatraIndex: 2,
        nakshatraName: 'Bharani',
        pada: 1,
        nakshatraLord: PlanetSymbol.VENUS,
      },
      [PlanetSymbol.SATURN]: {
        planet: PlanetSymbol.SATURN,
        longitude: 310.0, // Aquarius (11)
        latitude: 2.2,
        distanceAU: 9.8,
        speedLongitude: 0.03,
        isRetrograde: false,
        rashiIndex: 11,
        rashiName: 'Kumbha',
        degreeInRashi: 10.0,
        nakshatraIndex: 24,
        nakshatraName: 'Shatabhisha',
        pada: 2,
        nakshatraLord: PlanetSymbol.RAHU,
      },
      [PlanetSymbol.RAHU]: {
        planet: PlanetSymbol.RAHU,
        longitude: 345.0, // Pisces (12)
        latitude: 0.0,
        distanceAU: 0.00257,
        speedLongitude: -0.05,
        isRetrograde: true,
        rashiIndex: 12,
        rashiName: 'Meena',
        degreeInRashi: 15.0,
        nakshatraIndex: 26,
        nakshatraName: 'Uttara Bhadrapada',
        pada: 4,
        nakshatraLord: PlanetSymbol.SATURN,
      },
      [PlanetSymbol.KETU]: {
        planet: PlanetSymbol.KETU,
        longitude: 165.0, // Virgo (6)
        latitude: 0.0,
        distanceAU: 0.00257,
        speedLongitude: -0.05,
        isRetrograde: true,
        rashiIndex: 6,
        rashiName: 'Kanya',
        degreeInRashi: 15.0,
        nakshatraIndex: 12,
        nakshatraName: 'Uttara Phalguni',
        pada: 4,
        nakshatraLord: PlanetSymbol.SUN,
      },
    } as any,
  };
}

describe('Phase 2D: Ashtakavarga Unit Tests Suite', () => {
  const chart = createMockChart();

  describe('1. Bhinnashtakavarga (BAV) & Invariant Totals', () => {
    it('calculates BAV for each planet matching its exact classical total', () => {
      for (const planet of ASHTAKAVARGA_PLANETS) {
        const bav = calculateBhinnashtakavarga(planet, chart);
        const expectedTotal = BAV_EXPECTED_TOTALS[planet];

        expect(bav.planet).toBe(planet);
        expect(bav.totalPoints).toBe(expectedTotal);
        expect(bav.signList).toHaveLength(12);

        // Sum of signList equals expected total
        const sumList = bav.signList.reduce((acc, val) => acc + val, 0);
        expect(sumList).toBe(expectedTotal);

        // All signs have points between 0 and 8 (since max contributors = 8)
        for (let s = 0; s < 12; s++) {
          expect(bav.signList[s]).toBeGreaterThanOrEqual(0);
          expect(bav.signList[s]).toBeLessThanOrEqual(8);
          expect(bav.signs[s + 1]).toBe(bav.signList[s]);
        }
      }
    });

    it('validates Prastara Ashtakavarga matrix structure and row sums', () => {
      const sunBav = calculateBhinnashtakavarga(PlanetSymbol.SUN, chart);

      expect(Object.keys(sunBav.prastara)).toHaveLength(8);

      for (const contributor of ASHTAKAVARGA_CONTRIBUTORS) {
        const row = sunBav.prastara[contributor];
        expect(row).toHaveLength(12);

        // Values are strictly 0 or 1
        for (const val of row) {
          expect([0, 1]).toContain(val);
        }
      }

      // Column sums in Prastara must equal signList
      for (let s = 0; s < 12; s++) {
        let colSum = 0;
        for (const contributor of ASHTAKAVARGA_CONTRIBUTORS) {
          colSum += sunBav.prastara[contributor][s];
        }
        expect(colSum).toBe(sunBav.signList[s]);
      }
    });
  });

  describe('2. Sarvashtakavarga (SAV) & The 337 Invariant', () => {
    it('aggregates all 7 BAVs and equals exactly 337 points', () => {
      const bavTables: any = {};
      for (const p of ASHTAKAVARGA_PLANETS) {
        bavTables[p] = calculateBhinnashtakavarga(p, chart);
      }

      const sav = calculateSarvashtakavarga(bavTables);

      expect(sav.grandTotal).toBe(SAV_EXPECTED_GRAND_TOTAL);
      expect(sav.grandTotal).toBe(337);
      expect(sav.signList).toHaveLength(12);

      // Verify sign sum matches grandTotal
      const signSum = sav.signList.reduce((acc, val) => acc + val, 0);
      expect(signSum).toBe(337);

      // Verify each sign equals sum of individual BAV points in that sign
      for (let s = 0; s < 12; s++) {
        let expectedSignSum = 0;
        for (const p of ASHTAKAVARGA_PLANETS) {
          expectedSignSum += bavTables[p].signList[s];
        }
        expect(sav.signList[s]).toBe(expectedSignSum);
        expect(sav.signs[s + 1]).toBe(expectedSignSum);
      }
    });
  });

  describe('3. Trikona Shodhana (Triplicity Reduction)', () => {
    it('reduces all three signs to 0 when points are equal', () => {
      // Fire trine (indices 0, 4, 8) equal
      const input = [4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0];
      const reduced = calculateTrikonaShodhana(input);
      expect(reduced[0]).toBe(0);
      expect(reduced[4]).toBe(0);
      expect(reduced[8]).toBe(0);
    });

    it('subtracts minimum from all 3 signs when all are non-zero', () => {
      // Fire trine: Aries=6, Leo=4, Sag=2 -> min=2 -> [4, 2, 0]
      const input = [6, 0, 0, 0, 4, 0, 0, 0, 2, 0, 0, 0];
      const reduced = calculateTrikonaShodhana(input);
      expect(reduced[0]).toBe(4);
      expect(reduced[4]).toBe(2);
      expect(reduced[8]).toBe(0);
    });

    it('reduces 2 non-zero signs when 1 sign is zero', () => {
      // Earth trine (indices 1, 5, 9): Taurus=5, Virgo=3, Cap=0 -> min non-zero=3 -> [2, 0, 0]
      const input = [0, 5, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0];
      const reduced = calculateTrikonaShodhana(input);
      expect(reduced[1]).toBe(2);
      expect(reduced[5]).toBe(0);
      expect(reduced[9]).toBe(0);
    });

    it('makes both 0 when 2 non-zero signs are equal and 1 is zero', () => {
      // Air trine (indices 2, 6, 10): Gemini=4, Libra=4, Aqua=0 -> [0, 0, 0]
      const input = [0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 0, 0];
      const reduced = calculateTrikonaShodhana(input);
      expect(reduced[2]).toBe(0);
      expect(reduced[6]).toBe(0);
      expect(reduced[10]).toBe(0);
    });

    it('makes no reduction when 2 or 3 signs have 0 points', () => {
      // Water trine (indices 3, 7, 11): Cancer=5, Scorpio=0, Pisces=0 -> unchanged
      const input = [0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0];
      const reduced = calculateTrikonaShodhana(input);
      expect(reduced[3]).toBe(5);
      expect(reduced[7]).toBe(0);
      expect(reduced[11]).toBe(0);
    });
  });

  describe('4. Ekadhipatya Shodhana (Dual-Lordship Reduction)', () => {
    it('eliminates unoccupied sign points when the other dual sign has 0 points', () => {
      // Mars dual signs: Aries (0) and Scorpio (7)
      // In chart, Aries (1) has Venus (occupied), Scorpio (8) has no planets (unoccupied)
      // If Aries=0 and Scorpio=4 (unoccupied) -> Scorpio becomes 0
      const trikona = [0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0];
      const reduced = calculateEkadhipatyaShodhana(trikona, chart);
      expect(reduced[7]).toBe(0);
    });

    it('preserves occupied sign points when the other dual sign has 0 points', () => {
      // Aries (0) is occupied by Venus, Scorpio (7) has 0 points
      const trikona = [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const reduced = calculateEkadhipatyaShodhana(trikona, chart);
      expect(reduced[0]).toBe(4);
    });

    it('makes both 0 when both signs are unoccupied and equal', () => {
      // Jupiter dual signs: Sagittarius (8) and Pisces (11)
      // In chart: Sag (8) has no planets, Pisces (11) has Rahu (occupied).
      // Let's test with a mock chart where both Sag & Pisces are unoccupied:
      const emptyChart: AstroChart = { ...chart, planets: {} as any };
      const trikona = [0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 3];
      const reduced = calculateEkadhipatyaShodhana(trikona, emptyChart);
      expect(reduced[8]).toBe(0);
      expect(reduced[11]).toBe(0);
    });

    it('makes larger equal to smaller when both signs are unoccupied and unequal', () => {
      const emptyChart: AstroChart = { ...chart, planets: {} as any };
      // Sag=5, Pisces=2 -> both become min(5, 2) = 2
      const trikona = [0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 2];
      const reduced = calculateEkadhipatyaShodhana(trikona, emptyChart);
      expect(reduced[8]).toBe(2);
      expect(reduced[11]).toBe(2);
    });
  });

  describe('5. Shodhya Pinda (Pinda Sadhana)', () => {
    it('calculates Rashi, Graha, and Shodhya Pinda correctly', () => {
      const reduced = [2, 0, 1, 3, 0, 2, 0, 1, 0, 1, 0, 2];
      const pinda = calculateShodhyaPinda(PlanetSymbol.SUN, reduced, chart);

      // Verify Rashi Pinda manual calculation:
      // sum(reduced[s] * RASHI_GUNAKARAS[s])
      let expectedRashi = 0;
      for (let s = 0; s < 12; s++) {
        expectedRashi += reduced[s] * RASHI_GUNAKARAS[s];
      }
      expect(pinda.rashiPinda).toBe(expectedRashi);

      // Verify Graha Pinda manual calculation:
      let expectedGraha = 0;
      for (const p of ASHTAKAVARGA_PLANETS) {
        const pos = chart.planets[p];
        if (pos) {
          const s = pos.rashiIndex - 1;
          expectedGraha += reduced[s] * GRAHA_GUNAKARAS[p];
        }
      }
      expect(pinda.grahaPinda).toBe(expectedGraha);

      // Shodhya Pinda = Rashi + Graha
      expect(pinda.shodhyaPinda).toBe(expectedRashi + expectedGraha);
      expect(pinda.shodhyaPinda).toBeGreaterThan(0);
    });
  });

  describe('6. Unified Ashtakavarga Calculator Orchestration', () => {
    const calculator = new AshtakavargaCalculator();
    const result = calculator.calculate(chart);

    it('returns complete BAV tables for all 7 planets', () => {
      expect(Object.keys(result.bav)).toHaveLength(7);
      for (const p of ASHTAKAVARGA_PLANETS) {
        expect(result.bav[p]).toBeDefined();
        expect(result.bav[p].totalPoints).toBe(BAV_EXPECTED_TOTALS[p]);
      }
    });

    it('returns SAV with exactly 337 grand total', () => {
      expect(result.sav).toBeDefined();
      expect(result.sav.grandTotal).toBe(337);
      expect(result.sav.signList).toHaveLength(12);
    });

    it('returns Shodhana tables for all 7 planets', () => {
      expect(Object.keys(result.shodhana)).toHaveLength(7);
      for (const p of ASHTAKAVARGA_PLANETS) {
        const sh = result.shodhana[p];
        expect(sh).toBeDefined();
        expect(sh.trikonaReduced).toHaveLength(12);
        expect(sh.ekadhipatyaReduced).toHaveLength(12);
        // Post-reduction totals are <= original BAV total
        expect(sh.totalTrikonaPoints).toBeLessThanOrEqual(result.bav[p].totalPoints);
        expect(sh.totalEkadhipatyaPoints).toBeLessThanOrEqual(sh.totalTrikonaPoints);
      }
    });

    it('returns Shodhya Pinda for all 7 planets', () => {
      expect(Object.keys(result.pinda)).toHaveLength(7);
      for (const p of ASHTAKAVARGA_PLANETS) {
        const pinda = result.pinda[p];
        expect(pinda).toBeDefined();
        expect(pinda.rashiPinda).toBeGreaterThanOrEqual(0);
        expect(pinda.grahaPinda).toBeGreaterThanOrEqual(0);
        expect(pinda.shodhyaPinda).toBe(pinda.rashiPinda + pinda.grahaPinda);
      }
    });

    it('guarantees numerical determinism on repeated calculations', () => {
      const result2 = calculator.calculate(chart);
      expect(result).toEqual(result2);
    });
  });
});
