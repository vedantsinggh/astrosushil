import { describe, it, expect } from 'vitest';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { ShadbalaCalculator } from '../../src/strength/shadbala-calculator';
import {
  getSignType,
  calculateBhavaDigBala,
  calculateBhavaDrishtiBala,
  calculateBhavaOccupantBala,
  calculateBhavaBala,
} from '../../src/strength/bhava-bala';

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
      longitude: 0.0, // 0° Aries (1)
      rashiIndex: 1,
      degreeInRashi: 0.0,
      nakshatraIndex: 1,
      pada: 1,
      nakshatraLord: PlanetSymbol.KETU,
    },
    planets: {
      [PlanetSymbol.SUN]: {
        planet: PlanetSymbol.SUN,
        longitude: 125.0, // 5° Leo (5th house)
        latitude: 0.0,
        distanceAU: 1.0,
        speedLongitude: 0.98,
        isRetrograde: false,
        rashiIndex: 5,
        rashiName: 'Simha',
        degreeInRashi: 5.0,
        nakshatraIndex: 10,
        nakshatraName: 'Magha',
        pada: 2,
        nakshatraLord: PlanetSymbol.KETU,
      },
      [PlanetSymbol.MOON]: {
        planet: PlanetSymbol.MOON,
        longitude: 95.0, // 5° Cancer (4th house)
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
        longitude: 275.0, // 5° Capricorn (10th house)
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
        longitude: 165.0, // 15° Virgo (6th house)
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
        longitude: 5.0, // 5° Aries (1st house)
        latitude: 0.3,
        distanceAU: 5.2,
        speedLongitude: 0.08,
        isRetrograde: false,
        rashiIndex: 1,
        rashiName: 'Mesha',
        degreeInRashi: 5.0,
        nakshatraIndex: 1,
        nakshatraName: 'Ashwini',
        pada: 2,
        nakshatraLord: PlanetSymbol.KETU,
      },
      [PlanetSymbol.VENUS]: {
        planet: PlanetSymbol.VENUS,
        longitude: 350.0, // 20° Pisces (12th house)
        latitude: -2.1,
        distanceAU: 0.72,
        speedLongitude: 1.15,
        isRetrograde: false,
        rashiIndex: 12,
        rashiName: 'Meena',
        degreeInRashi: 20.0,
        nakshatraIndex: 27,
        nakshatraName: 'Revati',
        pada: 2,
        nakshatraLord: PlanetSymbol.MERCURY,
      },
      [PlanetSymbol.SATURN]: {
        planet: PlanetSymbol.SATURN,
        longitude: 195.0, // 15° Libra (7th house)
        latitude: 2.2,
        distanceAU: 9.8,
        speedLongitude: 0.03,
        isRetrograde: false,
        rashiIndex: 7,
        rashiName: 'Tula',
        degreeInRashi: 15.0,
        nakshatraIndex: 15,
        nakshatraName: 'Svati',
        pada: 3,
        nakshatraLord: PlanetSymbol.RAHU,
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
      { houseNumber: 1, cuspLongitude: 0.0, startLongitude: 0.0, endLongitude: 30.0, rashiIndex: 1, rashiName: 'Mesha' },
      { houseNumber: 2, cuspLongitude: 30.0, startLongitude: 30.0, endLongitude: 60.0, rashiIndex: 2, rashiName: 'Vrishabha' },
      { houseNumber: 3, cuspLongitude: 60.0, startLongitude: 60.0, endLongitude: 90.0, rashiIndex: 3, rashiName: 'Mithuna' },
      { houseNumber: 4, cuspLongitude: 90.0, startLongitude: 90.0, endLongitude: 120.0, rashiIndex: 4, rashiName: 'Karka' },
      { houseNumber: 5, cuspLongitude: 120.0, startLongitude: 120.0, endLongitude: 150.0, rashiIndex: 5, rashiName: 'Simha' },
      { houseNumber: 6, cuspLongitude: 150.0, startLongitude: 150.0, endLongitude: 180.0, rashiIndex: 6, rashiName: 'Kanya' },
      { houseNumber: 7, cuspLongitude: 180.0, startLongitude: 180.0, endLongitude: 210.0, rashiIndex: 7, rashiName: 'Tula' },
      { houseNumber: 8, cuspLongitude: 210.0, startLongitude: 210.0, endLongitude: 240.0, rashiIndex: 8, rashiName: 'Vrischika' },
      { houseNumber: 9, cuspLongitude: 240.0, startLongitude: 240.0, endLongitude: 270.0, rashiIndex: 9, rashiName: 'Dhanu' },
      { houseNumber: 10, cuspLongitude: 270.0, startLongitude: 270.0, endLongitude: 300.0, rashiIndex: 10, rashiName: 'Makara' },
      { houseNumber: 11, cuspLongitude: 300.0, startLongitude: 300.0, endLongitude: 330.0, rashiIndex: 11, rashiName: 'Kumbha' },
      { houseNumber: 12, cuspLongitude: 330.0, startLongitude: 330.0, endLongitude: 360.0, rashiIndex: 12, rashiName: 'Meena' },
    ],
  };
}

describe('Phase 2C: Bhava Bala Unit Tests', () => {
  const chart = createMockChart();
  const shadbalaCalc = new ShadbalaCalculator();
  const shadbalaReport = shadbalaCalc.calculate(chart);

  describe('1. Sign Classification for Bhava Dig Bala', () => {
    it('classifies Nara (Human) signs correctly', () => {
      expect(getSignType(3, 10.0)).toBe('NARA'); // Gemini
      expect(getSignType(6, 10.0)).toBe('NARA'); // Virgo
      expect(getSignType(7, 10.0)).toBe('NARA'); // Libra
      expect(getSignType(11, 10.0)).toBe('NARA'); // Aquarius
      expect(getSignType(9, 10.0)).toBe('NARA'); // Sagittarius 1st half
    });

    it('classifies Jala (Watery) signs correctly', () => {
      expect(getSignType(4, 10.0)).toBe('JALA'); // Cancer
      expect(getSignType(12, 10.0)).toBe('JALA'); // Pisces
      expect(getSignType(10, 20.0)).toBe('JALA'); // Capricorn 2nd half
    });

    it('classifies Chatushpada (Quadruped) signs correctly', () => {
      expect(getSignType(1, 10.0)).toBe('CHATUSHAPADA'); // Aries
      expect(getSignType(2, 10.0)).toBe('CHATUSHAPADA'); // Taurus
      expect(getSignType(5, 10.0)).toBe('CHATUSHAPADA'); // Leo
      expect(getSignType(9, 20.0)).toBe('CHATUSHAPADA'); // Sagittarius 2nd half
      expect(getSignType(10, 5.0)).toBe('CHATUSHAPADA'); // Capricorn 1st half
    });

    it('classifies Keeta (Insect) sign correctly', () => {
      expect(getSignType(8, 10.0)).toBe('KEETA'); // Scorpio
    });
  });

  describe('2. Bhava Dig Bala (Directional Strength of Houses)', () => {
    it('awards 60 Shashtiamsas to 10th house when cusp is Chatushpada', () => {
      // 10th house cusp is 270° (Capricorn 0° -> Chatushpada 1st half)
      // Chatushpada is powerful at 10th cusp (270°), Nirbala at 4th (90°)
      // Dist from Nirbala = |270 - 90| = 180° -> 180 / 3 = 60
      const digBalaH10 = calculateBhavaDigBala(270.0, 0.0);
      expect(digBalaH10).toBe(60.0);
    });

    it('awards 60 Shashtiamsas to 4th house when cusp is Jala', () => {
      // 4th house cusp is 90° (Cancer -> Jala)
      // Jala is powerful at 4th cusp (90°), Nirbala at 10th (270°)
      // Dist from Nirbala = 180° -> 180 / 3 = 60
      const digBalaH4 = calculateBhavaDigBala(90.0, 0.0);
      expect(digBalaH4).toBe(60.0);
    });

    it('awards 0 Shashtiamsas at the exact Nirbala point', () => {
      // 4th house cusp (90°) with Chatushpada sign (e.g. Leo at 90°)
      // Nirbala for Chatushpada is 4th house (90°), so dist = 0 -> 0
      // Let's test with cusp 90° in Aries (1, Chatushpada)
      const zeroBala = calculateBhavaDigBala(10.0, 280.0); // 10° Aries (Chatushpada, powerful at 10th cusp 280+270=190, nirbala at 4th cusp 280+90=10)
      expect(zeroBala).toBe(0.0);
    });
  });

  describe('3. Bhava Drishti Bala (Aspects on House Cusps)', () => {
    it('calculates aspectual strength on house cusps', () => {
      // House 1 cusp is 0°
      const drishtiH1 = calculateBhavaDrishtiBala(0.0, chart);
      expect(typeof drishtiH1).toBe('number');
      expect(Number.isFinite(drishtiH1)).toBe(true);
    });
  });

  describe('4. Bhava Occupant Bala', () => {
    it('calculates positive strength for benefic occupants and negative for malefics', () => {
      // House 1 (Aries, rashiIndex 1) has Jupiter (Benefic)
      const occupantH1 = calculateBhavaOccupantBala(1, chart, shadbalaReport);
      expect(occupantH1).toBeGreaterThan(0);

      // House 7 (Libra, rashiIndex 7) has Saturn (Malefic)
      const occupantH7 = calculateBhavaOccupantBala(7, chart, shadbalaReport);
      expect(occupantH7).toBeLessThan(0);

      // House 2 (Taurus, rashiIndex 2) has only Rahu (Malefic)
      const occupantH2 = calculateBhavaOccupantBala(2, chart, shadbalaReport);
      expect(occupantH2).toBeLessThanOrEqual(0);

      // House 3 (Gemini, rashiIndex 3) has no planets
      const occupantH3 = calculateBhavaOccupantBala(3, chart, shadbalaReport);
      expect(occupantH3).toBe(0);
    });
  });

  describe('5. Complete Bhava Bala Orchestration', () => {
    const bhavaBala = calculateBhavaBala(chart, shadbalaReport);

    it('calculates Bhava Bala for all 12 houses', () => {
      expect(bhavaBala.houses).toHaveLength(12);
      for (let h = 1; h <= 12; h++) {
        const house = bhavaBala.houses.find((item) => item.houseNumber === h);
        expect(house).toBeDefined();
        expect(house?.houseNumber).toBe(h);
        expect(house?.sign).toBeDefined();
        expect(house?.rashiIndex).toBeGreaterThanOrEqual(1);
        expect(house?.rashiIndex).toBeLessThanOrEqual(12);
        expect(house?.lord).toBeDefined();
        expect(house?.bhavadhipatiBala).toBeGreaterThan(0);
        expect(house?.bhavaDigBala).toBeGreaterThanOrEqual(0);
        expect(house?.bhavaDigBala).toBeLessThanOrEqual(60);
        expect(typeof house?.bhavaDrishtiBala).toBe('number');
        expect(typeof house?.bhavaOccupantBala).toBe('number');
        expect(house?.totalShashtiamsas).toBeGreaterThan(0);
        expect(house?.totalRupas).toBeCloseTo(house!.totalShashtiamsas / 60.0, 3);
        expect(house?.rank).toBeGreaterThanOrEqual(1);
        expect(house?.rank).toBeLessThanOrEqual(12);
      }
    });

    it('ranks all 12 houses uniquely from 1 to 12', () => {
      const ranks = bhavaBala.houses.map((h) => h.rank).sort((a, b) => a - b);
      expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('matches Bhavadhipati Bala to the lord Shadbala', () => {
      for (const house of bhavaBala.houses) {
        const lordShadbala = shadbalaReport.planets[house.lord]?.totalShashtiamsas;
        expect(house.bhavadhipatiBala).toBe(lordShadbala);
      }
    });

    it('is completely deterministic on repeated executions', () => {
      const bhavaBala2 = calculateBhavaBala(chart, shadbalaReport);
      expect(bhavaBala).toEqual(bhavaBala2);
    });
  });
});
