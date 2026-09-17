import { describe, it, expect } from 'vitest';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { YogaCalculator } from '../../src/yoga/yoga-calculator';

function createMockChart(overrides: Partial<AstroChart> = {}): AstroChart {
  const defaultChart: AstroChart = {
    metadata: {
      engineVersion: '0.1.0',
      calculationTimestampIso: '2026-01-01T00:00:00Z',
      providerName: 'TestProvider',
      providerVersion: '1.0.0',
      config: {
        zodiacType: 'SIDEREAL',
        ayanamsa: 'LAHIRI',
        houseSystem: 'WHOLE_SIGN',
        nodeCalculation: 'MEAN_NODE',
        planetaryCalculationMode: 'GEOCENTRIC',
        precisionDegrees: 0.0001,
        roundingRule: 'NEAREST',
        dashaSystem: 'VIMSHOTTARI',
      },
      normalizedTime: {} as any,
    },
    birthDetails: {
      date: { year: 1990, month: 1, day: 1 },
      time: { hour: 12, minute: 0, second: 0 },
      timezone: 'UTC',
      latitude: 0,
      longitude: 0,
    },
    ascendant: {
      name: 'Ascendant',
      longitude: 15, // Aries (Rashi 1)
      rashiIndex: 1,
      rashiName: 'Aries',
      degreeInRashi: 15,
      nakshatraIndex: 1,
      nakshatraName: 'Ashwini',
      pada: 2,
    },
    planets: {
      [PlanetSymbol.SUN]: {
        planet: PlanetSymbol.SUN,
        longitude: 250, // Sagittarius (Rashi 9) -> House 9
        latitude: 0,
        speedLongitude: 1.0,
        isRetrograde: false,
        rashiIndex: 9,
        rashiName: 'Sagittarius',
        degreeInRashi: 10,
        nakshatraIndex: 19,
        nakshatraName: 'Mula',
        pada: 1,
        nakshatraLord: PlanetSymbol.KETU,
      },
      [PlanetSymbol.MOON]: {
        planet: PlanetSymbol.MOON,
        longitude: 40, // Taurus (Rashi 2, Exalted) -> House 2
        latitude: 0,
        speedLongitude: 13.0,
        isRetrograde: false,
        rashiIndex: 2,
        rashiName: 'Taurus',
        degreeInRashi: 10,
        nakshatraIndex: 3,
        nakshatraName: 'Krittika',
        pada: 2,
        nakshatraLord: PlanetSymbol.SUN,
      },
      [PlanetSymbol.MARS]: {
        planet: PlanetSymbol.MARS,
        longitude: 10, // Aries (Rashi 1, Own Sign) -> House 1 (Kendra)
        latitude: 0,
        speedLongitude: 0.5,
        isRetrograde: false,
        rashiIndex: 1,
        rashiName: 'Aries',
        degreeInRashi: 10,
        nakshatraIndex: 1,
        nakshatraName: 'Ashwini',
        pada: 1,
        nakshatraLord: PlanetSymbol.KETU,
      },
      [PlanetSymbol.MERCURY]: {
        planet: PlanetSymbol.MERCURY,
        longitude: 260, // Sagittarius (Rashi 9) -> House 9 (Conjunct Sun)
        latitude: 0,
        speedLongitude: 1.2,
        isRetrograde: false,
        rashiIndex: 9,
        rashiName: 'Sagittarius',
        degreeInRashi: 20,
        nakshatraIndex: 20,
        nakshatraName: 'Purva Ashadha',
        pada: 1,
        nakshatraLord: PlanetSymbol.VENUS,
      },
      [PlanetSymbol.JUPITER]: {
        planet: PlanetSymbol.JUPITER,
        longitude: 100, // Cancer (Rashi 4, Exalted) -> House 4 (Kendra & Kendra from Moon)
        latitude: 0,
        speedLongitude: 0.1,
        isRetrograde: false,
        rashiIndex: 4,
        rashiName: 'Cancer',
        degreeInRashi: 10,
        nakshatraIndex: 8,
        nakshatraName: 'Pushya',
        pada: 1,
        nakshatraLord: PlanetSymbol.SATURN,
      },
      [PlanetSymbol.VENUS]: {
        planet: PlanetSymbol.VENUS,
        longitude: 345, // Pisces (Rashi 12, Exalted) -> House 12
        latitude: 0,
        speedLongitude: 1.1,
        isRetrograde: false,
        rashiIndex: 12,
        rashiName: 'Pisces',
        degreeInRashi: 15,
        nakshatraIndex: 26,
        nakshatraName: 'Uttara Bhadrapada',
        pada: 4,
        nakshatraLord: PlanetSymbol.SATURN,
      },
      [PlanetSymbol.SATURN]: {
        planet: PlanetSymbol.SATURN,
        longitude: 280, // Capricorn (Rashi 10, Own Sign) -> House 10 (Kendra)
        latitude: 0,
        speedLongitude: 0.05,
        isRetrograde: false,
        rashiIndex: 10,
        rashiName: 'Capricorn',
        degreeInRashi: 10,
        nakshatraIndex: 22,
        nakshatraName: 'Shravana',
        pada: 1,
        nakshatraLord: PlanetSymbol.MOON,
      },
      [PlanetSymbol.RAHU]: {
        planet: PlanetSymbol.RAHU,
        longitude: 140, // Leo (Rashi 5) -> House 5
        latitude: 0,
        speedLongitude: -0.05,
        isRetrograde: true,
        rashiIndex: 5,
        rashiName: 'Leo',
        degreeInRashi: 20,
        nakshatraIndex: 11,
        nakshatraName: 'Purva Phalguni',
        pada: 3,
        nakshatraLord: PlanetSymbol.VENUS,
      },
      [PlanetSymbol.KETU]: {
        planet: PlanetSymbol.KETU,
        longitude: 320, // Aquarius (Rashi 11) -> House 11
        latitude: 0,
        speedLongitude: -0.05,
        isRetrograde: true,
        rashiIndex: 11,
        rashiName: 'Aquarius',
        degreeInRashi: 20,
        nakshatraIndex: 25,
        nakshatraName: 'Purva Bhadrapada',
        pada: 1,
        nakshatraLord: PlanetSymbol.JUPITER,
      },
    },
  };

  return {
    ...defaultChart,
    ...overrides,
    planets: {
      ...defaultChart.planets,
      ...(overrides.planets || {}),
    },
  };
}

describe('YogaCalculator (Phase 2W)', () => {
  const calculator = new YogaCalculator();

  describe('Pancha Mahapurusha Yogas', () => {
    it('should detect Ruchaka, Hamsa, and Shasha Yogas in reference chart', () => {
      const chart = createMockChart();
      const report = calculator.evaluateYogas(chart, { categories: ['MAHAPURUSHA'] });

      const detectedIds = report.detectedYogas.map((y) => y.id);
      expect(detectedIds).toContain('YOGA_RUCHAKA'); // Mars in Aries (H1 - Kendra)
      expect(detectedIds).toContain('YOGA_HAMSA');   // Jupiter in Cancer (H4 - Kendra & Exalted)
      expect(detectedIds).toContain('YOGA_SHASHA');  // Saturn in Capricorn (H10 - Kendra & Own Sign)
      expect(detectedIds).not.toContain('YOGA_BHADRA'); // Mercury in Sagittarius
      expect(detectedIds).not.toContain('YOGA_MALAVYA'); // Venus in Pisces (H12 - not Kendra)
    });

    it('should NOT detect Ruchaka Yoga if Mars is exalted but in a Dusthana (false positive check)', () => {
      // Ascendant = Leo (Rashi 5), Mars in Capricorn (Rashi 10) -> House 6 (Dusthana)
      const chart = createMockChart({
        ascendant: {
          name: 'Ascendant',
          longitude: 135, // Leo (Rashi 5)
          rashiIndex: 5,
          rashiName: 'Leo',
          degreeInRashi: 15,
          nakshatraIndex: 10,
          nakshatraName: 'Magha',
          pada: 2,
        },
        planets: {
          [PlanetSymbol.MARS]: {
            planet: PlanetSymbol.MARS,
            longitude: 298, // Capricorn (Exalted), Rashi 10 -> House 6
            latitude: 0,
            speedLongitude: 0.5,
            isRetrograde: false,
            rashiIndex: 10,
            rashiName: 'Capricorn',
            degreeInRashi: 28,
            nakshatraIndex: 23,
            nakshatraName: 'Dhanishta',
            pada: 2,
            nakshatraLord: PlanetSymbol.MARS,
          },
        } as any,
      });

      const report = calculator.evaluateYogas(chart, { yogaIds: ['YOGA_RUCHAKA'], includeUndetected: true });
      expect(report.detectedCount).toBe(0);
      const ruchaka = report.undetectedYogas?.find((y) => y.id === 'YOGA_RUCHAKA');
      expect(ruchaka).toBeDefined();
      expect(ruchaka?.evidence.conditions.find((c) => c.id === 'PLANET_IN_KENDRA')?.satisfied).toBe(false);
      expect(ruchaka?.evidence.conditions.find((c) => c.id === 'PLANET_IN_OWN_OR_EXALTED_SIGN')?.satisfied).toBe(true);
    });

    it('should detect Malavya Yoga when Venus is in Pisces in 1st house (Kendra)', () => {
      // Ascendant = Pisces (Rashi 12), Venus in Pisces (Rashi 12) -> House 1 (Kendra & Exalted)
      const chart = createMockChart({
        ascendant: {
          name: 'Ascendant',
          longitude: 345, // Pisces (Rashi 12)
          rashiIndex: 12,
          rashiName: 'Pisces',
          degreeInRashi: 15,
          nakshatraIndex: 26,
          nakshatraName: 'Uttara Bhadrapada',
          pada: 4,
        },
        planets: {
          [PlanetSymbol.VENUS]: {
            planet: PlanetSymbol.VENUS,
            longitude: 357, // Pisces (Exalted), Rashi 12 -> House 1
            latitude: 0,
            speedLongitude: 1.1,
            isRetrograde: false,
            rashiIndex: 12,
            rashiName: 'Pisces',
            degreeInRashi: 27,
            nakshatraIndex: 27,
            nakshatraName: 'Revati',
            pada: 4,
            nakshatraLord: PlanetSymbol.MERCURY,
          },
        } as any,
      });

      const report = calculator.evaluateYogas(chart, { yogaIds: ['YOGA_MALAVYA'] });
      expect(report.detectedCount).toBe(1);
      expect(report.detectedYogas[0].id).toBe('YOGA_MALAVYA');
    });
  });

  describe('Chandra & Surya Yogas', () => {
    it('should detect Gajakesari Yoga when Jupiter is in 4th from Moon', () => {
      // Moon in Aries (Rashi 1), Jupiter in Cancer (Rashi 4) -> 4th house from Moon (Kendra)
      const chart = createMockChart({
        planets: {
          [PlanetSymbol.MOON]: {
            planet: PlanetSymbol.MOON,
            longitude: 15, // Aries (Rashi 1)
            latitude: 0,
            speedLongitude: 13.0,
            isRetrograde: false,
            rashiIndex: 1,
            rashiName: 'Aries',
            degreeInRashi: 15,
            nakshatraIndex: 1,
            nakshatraName: 'Ashwini',
            pada: 2,
            nakshatraLord: PlanetSymbol.KETU,
          },
          [PlanetSymbol.JUPITER]: {
            planet: PlanetSymbol.JUPITER,
            longitude: 100, // Cancer (Rashi 4) -> 4th from Moon
            latitude: 0,
            speedLongitude: 0.1,
            isRetrograde: false,
            rashiIndex: 4,
            rashiName: 'Cancer',
            degreeInRashi: 10,
            nakshatraIndex: 8,
            nakshatraName: 'Pushya',
            pada: 1,
            nakshatraLord: PlanetSymbol.SATURN,
          },
        } as any,
      });
      const report = calculator.evaluateYogas(chart, { yogaIds: ['YOGA_GAJAKESARI'] });

      expect(report.detectedCount).toBe(1);
      const gajakesari = report.detectedYogas[0];
      expect(gajakesari.isDetected).toBe(true);
      expect(gajakesari.evidence.conditions[0].satisfied).toBe(true);
      expect(gajakesari.evidence.involvedPlanets.length).toBe(2);
    });

    it('should detect Budha-Aditya Yoga when Sun and Mercury are conjunct in the same sign', () => {
      // In reference chart: Sun and Mercury both in Sagittarius (Rashi 9)
      const chart = createMockChart();
      const report = calculator.evaluateYogas(chart, { yogaIds: ['YOGA_BUDHA_ADITYA'] });

      expect(report.detectedCount).toBe(1);
      const budhaAditya = report.detectedYogas[0];
      expect(budhaAditya.isDetected).toBe(true);
      expect(budhaAditya.evidence.relationships[0].relationshipType).toBe('CONJUNCTION');
    });

    it('should evaluate Sunapha, Anapha, Durudhara correctly', () => {
      // Moon in Aries (Rashi 1). Mars in Taurus (Rashi 2), Venus in Pisces (Rashi 12)
      const chart = createMockChart({
        planets: {
          [PlanetSymbol.MOON]: {
            planet: PlanetSymbol.MOON,
            longitude: 15, // Aries (Rashi 1)
            latitude: 0,
            speedLongitude: 13.0,
            isRetrograde: false,
            rashiIndex: 1,
            rashiName: 'Aries',
            degreeInRashi: 15,
            nakshatraIndex: 1,
            nakshatraName: 'Ashwini',
            pada: 2,
            nakshatraLord: PlanetSymbol.KETU,
          },
          [PlanetSymbol.MARS]: {
            planet: PlanetSymbol.MARS,
            longitude: 45, // Taurus (Rashi 2) -> 2nd from Moon
            latitude: 0,
            speedLongitude: 0.5,
            isRetrograde: false,
            rashiIndex: 2,
            rashiName: 'Taurus',
            degreeInRashi: 15,
            nakshatraIndex: 3,
            nakshatraName: 'Krittika',
            pada: 3,
            nakshatraLord: PlanetSymbol.SUN,
          },
          [PlanetSymbol.VENUS]: {
            planet: PlanetSymbol.VENUS,
            longitude: 345, // Pisces (Rashi 12) -> 12th from Moon
            latitude: 0,
            speedLongitude: 1.1,
            isRetrograde: false,
            rashiIndex: 12,
            rashiName: 'Pisces',
            degreeInRashi: 15,
            nakshatraIndex: 26,
            nakshatraName: 'Uttara Bhadrapada',
            pada: 4,
            nakshatraLord: PlanetSymbol.SATURN,
          },
        } as any,
      });

      const report = calculator.evaluateYogas(chart, { categories: ['CHANDRA'] });
      const durudhara = report.detectedYogas.find((y) => y.id === 'YOGA_DURUDHARA');
      const sunapha = report.detectedYogas.find((y) => y.id === 'YOGA_SUNAPHA');
      const anapha = report.detectedYogas.find((y) => y.id === 'YOGA_ANAPHA');

      expect(durudhara?.isDetected).toBe(true);
      expect(sunapha).toBeUndefined();
      expect(anapha).toBeUndefined();
    });
  });

  describe('Neecha Bhanga Raja Yoga', () => {
    it('should detect Neecha Bhanga Raja Yoga when debilitated planet has sign lord in Kendra', () => {
      // Sun in Libra (Rashi 7 - Debilitated). Ascendant = Aries (Rashi 1).
      // Venus (lord of Libra) in Capricorn (Rashi 10) -> House 10 (Kendra to Lagna).
      const chart = createMockChart({
        ascendant: {
          name: 'Ascendant',
          longitude: 15, // Aries (Rashi 1)
          rashiIndex: 1,
          rashiName: 'Aries',
          degreeInRashi: 15,
          nakshatraIndex: 1,
          nakshatraName: 'Ashwini',
          pada: 2,
        },
        planets: {
          [PlanetSymbol.SUN]: {
            planet: PlanetSymbol.SUN,
            longitude: 190, // Libra (Rashi 7 - Debilitated) -> House 7
            latitude: 0,
            speedLongitude: 1.0,
            isRetrograde: false,
            rashiIndex: 7,
            rashiName: 'Libra',
            degreeInRashi: 10,
            nakshatraIndex: 14,
            nakshatraName: 'Chitra',
            pada: 3,
            nakshatraLord: PlanetSymbol.MARS,
          },
          [PlanetSymbol.VENUS]: {
            planet: PlanetSymbol.VENUS,
            longitude: 285, // Capricorn (Rashi 10) -> House 10 (Kendra from Lagna)
            latitude: 0,
            speedLongitude: 1.1,
            isRetrograde: false,
            rashiIndex: 10,
            rashiName: 'Capricorn',
            degreeInRashi: 15,
            nakshatraIndex: 22,
            nakshatraName: 'Shravana',
            pada: 2,
            nakshatraLord: PlanetSymbol.MOON,
          },
        } as any,
      });

      const report = calculator.evaluateYogas(chart, { yogaIds: ['YOGA_NEECHA_BHANGA_SUN'] });
      expect(report.detectedCount).toBe(1);
      const nbry = report.detectedYogas[0];
      expect(nbry.isDetected).toBe(true);
      expect(nbry.evidence.conditions.find((c) => c.id === 'PLANET_DEBILITATED')?.satisfied).toBe(true);
      expect(nbry.evidence.conditions.find((c) => c.id === 'DEB_SIGN_LORD_KENDRA_LAGNA')?.satisfied).toBe(true);
    });
  });

  describe('Parivartana & Viparita Raja Yogas', () => {
    it('should detect Maha Parivartana Yoga on planetary sign exchange between Kendra/Trikona lords', () => {
      // Sun in Aries (Rashi 1, ruled by Mars) and Mars in Leo (Rashi 5, ruled by Sun)
      const chart = createMockChart({
        ascendant: {
          name: 'Ascendant',
          longitude: 15, // Aries
          rashiIndex: 1,
          rashiName: 'Aries',
          degreeInRashi: 15,
          nakshatraIndex: 1,
          nakshatraName: 'Ashwini',
          pada: 2,
        },
        planets: {
          [PlanetSymbol.SUN]: {
            planet: PlanetSymbol.SUN,
            longitude: 10, // Aries (Rashi 1) -> House 1
            latitude: 0,
            speedLongitude: 1.0,
            isRetrograde: false,
            rashiIndex: 1,
            rashiName: 'Aries',
            degreeInRashi: 10,
            nakshatraIndex: 1,
            nakshatraName: 'Ashwini',
            pada: 1,
            nakshatraLord: PlanetSymbol.KETU,
          },
          [PlanetSymbol.MARS]: {
            planet: PlanetSymbol.MARS,
            longitude: 130, // Leo (Rashi 5) -> House 5
            latitude: 0,
            speedLongitude: 0.5,
            isRetrograde: false,
            rashiIndex: 5,
            rashiName: 'Leo',
            degreeInRashi: 10,
            nakshatraIndex: 10,
            nakshatraName: 'Magha',
            pada: 3,
            nakshatraLord: PlanetSymbol.KETU,
          },
        } as any,
      });

      const report = calculator.evaluateYogas(chart, { categories: ['PARIVARTANA'] });
      expect(report.detectedCount).toBe(1);
      expect(report.detectedYogas[0].id).toBe('YOGA_MAHA_PARIVARTANA_SUN_MARS');
      expect(report.detectedYogas[0].evidence.relationships[0].relationshipType).toBe('SIGN_EXCHANGE');
    });

    it('should detect Harsha Viparita Raja Yoga when 6th lord is in 8th house', () => {
      // Ascendant = Aries (Rashi 1). 6th lord = Mercury (Virgo).
      // Mercury placed in Scorpio (Rashi 8) -> House 8.
      const chart = createMockChart({
        ascendant: {
          name: 'Ascendant',
          longitude: 15, // Aries
          rashiIndex: 1,
          rashiName: 'Aries',
          degreeInRashi: 15,
          nakshatraIndex: 1,
          nakshatraName: 'Ashwini',
          pada: 2,
        },
        planets: {
          [PlanetSymbol.MERCURY]: {
            planet: PlanetSymbol.MERCURY,
            longitude: 220, // Scorpio (Rashi 8) -> House 8 (Dusthana)
            latitude: 0,
            speedLongitude: 1.2,
            isRetrograde: false,
            rashiIndex: 8,
            rashiName: 'Scorpio',
            degreeInRashi: 10,
            nakshatraIndex: 17,
            nakshatraName: 'Anuradha',
            pada: 3,
            nakshatraLord: PlanetSymbol.SATURN,
          },
        } as any,
      });

      const report = calculator.evaluateYogas(chart, { yogaIds: ['YOGA_HARSHA'] });
      expect(report.detectedCount).toBe(1);
      expect(report.detectedYogas[0].id).toBe('YOGA_HARSHA');
      expect(report.detectedYogas[0].category).toBe('VIPARITA');
    });
  });

  describe('Dharma-Karmadhipati & Nabhasa Yogas', () => {
    it('should detect Dharma-Karmadhipati Raja Yoga when 9th and 10th lords are conjunct', () => {
      // Ascendant = Aries. 9th lord = Jupiter (Sagittarius), 10th lord = Saturn (Capricorn).
      // Both conjunct in Cancer (Rashi 4).
      const chart = createMockChart({
        ascendant: {
          name: 'Ascendant',
          longitude: 15,
          rashiIndex: 1,
          rashiName: 'Aries',
          degreeInRashi: 15,
          nakshatraIndex: 1,
          nakshatraName: 'Ashwini',
          pada: 2,
        },
        planets: {
          [PlanetSymbol.JUPITER]: {
            planet: PlanetSymbol.JUPITER,
            longitude: 100, // Cancer (Rashi 4)
            latitude: 0,
            speedLongitude: 0.1,
            isRetrograde: false,
            rashiIndex: 4,
            rashiName: 'Cancer',
            degreeInRashi: 10,
            nakshatraIndex: 8,
            nakshatraName: 'Pushya',
            pada: 1,
            nakshatraLord: PlanetSymbol.SATURN,
          },
          [PlanetSymbol.SATURN]: {
            planet: PlanetSymbol.SATURN,
            longitude: 110, // Cancer (Rashi 4) -> Conjunct Jupiter
            latitude: 0,
            speedLongitude: 0.05,
            isRetrograde: false,
            rashiIndex: 4,
            rashiName: 'Cancer',
            degreeInRashi: 20,
            nakshatraIndex: 9,
            nakshatraName: 'Ashlesha',
            pada: 2,
            nakshatraLord: PlanetSymbol.MERCURY,
          },
        } as any,
      });

      const report = calculator.evaluateYogas(chart, { yogaIds: ['YOGA_DHARMA_KARMADHIPATI'] });
      expect(report.detectedCount).toBe(1);
      expect(report.detectedYogas[0].id).toBe('YOGA_DHARMA_KARMADHIPATI');
      expect(report.detectedYogas[0].evidence.relationships[0].relationshipType).toBe('CONJUNCTION');
    });

    it('should detect Vallaki Nabhasa Yoga when 7 classical planets are distributed across 7 distinct signs', () => {
      // 7 planets across 7 signs (1, 2, 3, 4, 5, 6, 7)
      const chart = createMockChart({
        planets: {
          [PlanetSymbol.SUN]: { rashiIndex: 1, longitude: 10, degreeInRashi: 10 } as any,
          [PlanetSymbol.MOON]: { rashiIndex: 2, longitude: 40, degreeInRashi: 10 } as any,
          [PlanetSymbol.MARS]: { rashiIndex: 3, longitude: 70, degreeInRashi: 10 } as any,
          [PlanetSymbol.MERCURY]: { rashiIndex: 4, longitude: 100, degreeInRashi: 10 } as any,
          [PlanetSymbol.JUPITER]: { rashiIndex: 5, longitude: 130, degreeInRashi: 10 } as any,
          [PlanetSymbol.VENUS]: { rashiIndex: 6, longitude: 160, degreeInRashi: 10 } as any,
          [PlanetSymbol.SATURN]: { rashiIndex: 7, longitude: 190, degreeInRashi: 10 } as any,
        } as any,
      });

      const report = calculator.evaluateYogas(chart, { yogaIds: ['YOGA_NABHASA_VALLAKI'] });
      expect(report.detectedCount).toBe(1);
      expect(report.detectedYogas[0].id).toBe('YOGA_NABHASA_VALLAKI');
    });
  });
});
