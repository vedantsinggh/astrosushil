import { describe, it, expect } from 'vitest';
import { VargaCalculator } from '../../src/varga/varga-calculator';
import { VargaType } from '../../src/varga/varga.types';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { PlanetSymbol } from '../../src/planets/planet.types';

describe('VargaCalculator - Classical Parashari Shodashavarga Suite', () => {
  const calculator = new VargaCalculator();

  describe('1. Individual Varga Mathematical Mapping', () => {
    // D1 - Rashi
    it('calculates D1 (Rashi) correctly across boundaries', () => {
      expect(calculator.calculateLongitudeVarga(0.0, 'D1')).toBe(1);   // 0 deg Aries -> Aries (1)
      expect(calculator.calculateLongitudeVarga(15.0, 'D1')).toBe(1);  // 15 deg Aries -> Aries (1)
      expect(calculator.calculateLongitudeVarga(29.999, 'D1')).toBe(1);// 29.999 deg Aries -> Aries (1)
      expect(calculator.calculateLongitudeVarga(30.0, 'D1')).toBe(2);  // 30 deg -> Taurus (2)
      expect(calculator.calculateLongitudeVarga(359.999, 'D1')).toBe(12); // Pisces (12)
    });

    // D2 - Hora (15 deg divisions)
    it('calculates D2 (Hora) correctly for odd and even signs', () => {
      // Odd sign (Aries 1): 0-15 Sun/Leo (5), 15-30 Moon/Cancer (4)
      expect(calculator.calculateLongitudeVarga(5.0, 'D2')).toBe(5);
      expect(calculator.calculateLongitudeVarga(14.999, 'D2')).toBe(5);
      expect(calculator.calculateLongitudeVarga(15.0, 'D2')).toBe(4);
      expect(calculator.calculateLongitudeVarga(29.999, 'D2')).toBe(4);

      // Even sign (Taurus 2): 0-15 Moon/Cancer (4), 15-30 Sun/Leo (5)
      expect(calculator.calculateLongitudeVarga(35.0, 'D2')).toBe(4);
      expect(calculator.calculateLongitudeVarga(44.999, 'D2')).toBe(4);
      expect(calculator.calculateLongitudeVarga(45.0, 'D2')).toBe(5);
      expect(calculator.calculateLongitudeVarga(59.999, 'D2')).toBe(5);
    });

    // D3 - Drekkana (10 deg decanates: 1st self, 2nd 5th, 3rd 9th)
    it('calculates D3 (Drekkana) correctly', () => {
      // Aries (1): 1st decan (0-10) -> Aries (1), 2nd decan (10-20) -> Leo (5), 3rd decan (20-30) -> Sag (9)
      expect(calculator.calculateLongitudeVarga(3.0, 'D3')).toBe(1);
      expect(calculator.calculateLongitudeVarga(12.0, 'D3')).toBe(5);
      expect(calculator.calculateLongitudeVarga(25.0, 'D3')).toBe(9);

      // Taurus (2): 1st decan -> Taurus (2), 2nd decan -> Virgo (6), 3rd decan -> Cap (10)
      expect(calculator.calculateLongitudeVarga(32.0, 'D3')).toBe(2);
      expect(calculator.calculateLongitudeVarga(45.0, 'D3')).toBe(6);
      expect(calculator.calculateLongitudeVarga(55.0, 'D3')).toBe(10);
    });

    // D4 - Chaturthamsa (7.5 deg divisions: 1st self, 2nd 4th, 3rd 7th, 4th 10th)
    it('calculates D4 (Chaturthamsa) correctly', () => {
      // Aries (1): 0-7.5 Aries(1), 7.5-15 Cancer(4), 15-22.5 Libra(7), 22.5-30 Cap(10)
      expect(calculator.calculateLongitudeVarga(2.0, 'D4')).toBe(1);
      expect(calculator.calculateLongitudeVarga(8.0, 'D4')).toBe(4);
      expect(calculator.calculateLongitudeVarga(16.0, 'D4')).toBe(7);
      expect(calculator.calculateLongitudeVarga(24.0, 'D4')).toBe(10);
    });

    // D7 - Saptamsa (30/7 deg: Odd start self, Even start 7th)
    it('calculates D7 (Saptamsa) correctly', () => {
      // Aries (Odd, 1): Starts from Aries (1)
      expect(calculator.calculateLongitudeVarga(1.0, 'D7')).toBe(1);
      expect(calculator.calculateLongitudeVarga(5.0, 'D7')).toBe(2); // part 1 -> Taurus(2)

      // Taurus (Even, 2): Starts from 7th from Taurus = Scorpio (8)
      expect(calculator.calculateLongitudeVarga(31.0, 'D7')).toBe(8); // part 0 -> Scorpio(8)
      expect(calculator.calculateLongitudeVarga(35.0, 'D7')).toBe(9); // part 1 -> Sag(9)
    });

    // D9 - Navamsha (3 deg 20 min: Fiery-Aries, Earthy-Cap, Airy-Libra, Watery-Cancer)
    it('calculates D9 (Navamsha) correctly across all element groups', () => {
      // Fiery (Aries 1) -> starts from Aries (1)
      expect(calculator.calculateLongitudeVarga(1.0, 'D9')).toBe(1);  // Pada 1: Aries
      expect(calculator.calculateLongitudeVarga(4.0, 'D9')).toBe(2);  // Pada 2: Taurus
      expect(calculator.calculateLongitudeVarga(7.0, 'D9')).toBe(3);  // Pada 3: Gemini
      expect(calculator.calculateLongitudeVarga(10.5, 'D9')).toBe(4); // Pada 4: Cancer

      // Earthy (Taurus 2) -> starts from Capricorn (10)
      expect(calculator.calculateLongitudeVarga(31.0, 'D9')).toBe(10); // Cap
      expect(calculator.calculateLongitudeVarga(34.0, 'D9')).toBe(11); // Aq

      // Airy (Gemini 3) -> starts from Libra (7)
      expect(calculator.calculateLongitudeVarga(61.0, 'D9')).toBe(7);  // Libra

      // Watery (Cancer 4) -> starts from Cancer (4)
      expect(calculator.calculateLongitudeVarga(91.0, 'D9')).toBe(4);  // Cancer
    });

    // D10 - Dasamsa (3 deg divisions: Odd start self, Even start 9th)
    it('calculates D10 (Dasamsa) correctly', () => {
      // Aries (Odd, 1): Starts from Aries (1)
      expect(calculator.calculateLongitudeVarga(1.0, 'D10')).toBe(1);
      expect(calculator.calculateLongitudeVarga(4.0, 'D10')).toBe(2);

      // Taurus (Even, 2): Starts from 9th from Taurus = Capricorn (10)
      expect(calculator.calculateLongitudeVarga(31.0, 'D10')).toBe(10);
      expect(calculator.calculateLongitudeVarga(34.0, 'D10')).toBe(11);
    });

    // D12 - Dwadasamsa (2.5 deg divisions: Starts from self for all signs)
    it('calculates D12 (Dwadasamsa) correctly', () => {
      // Aries (1): Starts from Aries
      expect(calculator.calculateLongitudeVarga(1.0, 'D12')).toBe(1);
      expect(calculator.calculateLongitudeVarga(3.0, 'D12')).toBe(2);

      // Leo (5): Starts from Leo (5)
      expect(calculator.calculateLongitudeVarga(121.0, 'D12')).toBe(5);
      expect(calculator.calculateLongitudeVarga(123.0, 'D12')).toBe(6);
    });

    // D16 - Shodashamsha (1.875 deg: Movable-Aries, Fixed-Leo, Dual-Sagittarius)
    it('calculates D16 (Shodashamsha) correctly for all modalities', () => {
      // Movable (Aries 1): Starts from Aries (1)
      expect(calculator.calculateLongitudeVarga(0.5, 'D16')).toBe(1);
      expect(calculator.calculateLongitudeVarga(2.0, 'D16')).toBe(2);

      // Fixed (Taurus 2): Starts from Leo (5)
      expect(calculator.calculateLongitudeVarga(30.5, 'D16')).toBe(5);
      expect(calculator.calculateLongitudeVarga(32.5, 'D16')).toBe(6);

      // Dual (Gemini 3): Starts from Sagittarius (9)
      expect(calculator.calculateLongitudeVarga(60.5, 'D16')).toBe(9);
      expect(calculator.calculateLongitudeVarga(62.5, 'D16')).toBe(10);
    });

    // D20 - Vimshamsha (1.5 deg: Movable-Aries, Fixed-Sagittarius, Dual-Leo)
    it('calculates D20 (Vimshamsha) correctly for all modalities', () => {
      // Movable (Aries 1): Starts from Aries (1)
      expect(calculator.calculateLongitudeVarga(0.5, 'D20')).toBe(1);
      expect(calculator.calculateLongitudeVarga(2.0, 'D20')).toBe(2);

      // Fixed (Taurus 2): Starts from Sagittarius (9)
      expect(calculator.calculateLongitudeVarga(30.5, 'D20')).toBe(9);
      expect(calculator.calculateLongitudeVarga(32.5, 'D20')).toBe(10);

      // Dual (Gemini 3): Starts from Leo (5)
      expect(calculator.calculateLongitudeVarga(60.5, 'D20')).toBe(5);
      expect(calculator.calculateLongitudeVarga(62.5, 'D20')).toBe(6);
    });

    // D24 - Chaturvimshamsha (1.25 deg: Odd-Leo 5, Even-Cancer 4)
    it('calculates D24 (Chaturvimshamsha) correctly for odd and even signs', () => {
      // Odd sign (Aries 1): Starts from Leo (5)
      expect(calculator.calculateLongitudeVarga(0.5, 'D24')).toBe(5);
      expect(calculator.calculateLongitudeVarga(1.5, 'D24')).toBe(6);

      // Even sign (Taurus 2): Starts from Cancer (4)
      expect(calculator.calculateLongitudeVarga(30.5, 'D24')).toBe(4);
      expect(calculator.calculateLongitudeVarga(32.0, 'D24')).toBe(5);
    });

    // D27 - Saptavimshamsha / Bhamsa (10/9 deg: Fiery-Aries, Earthy-Cancer, Airy-Libra, Watery-Cap)
    it('calculates D27 (Bhamsa) correctly across elements', () => {
      // Fiery (Aries 1): Starts from Aries (1)
      expect(calculator.calculateLongitudeVarga(0.5, 'D27')).toBe(1);

      // Earthy (Taurus 2): Starts from Cancer (4)
      expect(calculator.calculateLongitudeVarga(30.5, 'D27')).toBe(4);

      // Airy (Gemini 3): Starts from Libra (7)
      expect(calculator.calculateLongitudeVarga(60.5, 'D27')).toBe(7);

      // Watery (Cancer 4): Starts from Capricorn (10)
      expect(calculator.calculateLongitudeVarga(90.5, 'D27')).toBe(10);
    });

    // D30 - Trimsamsa (Unequal: Odd: Mars 5, Sat 5, Jup 8, Merc 7, Ven 5)
    it('calculates D30 (Trimsamsa) correctly for odd and even signs', () => {
      // Odd sign (Aries 1):
      expect(calculator.calculateLongitudeVarga(2.0, 'D30')).toBe(1);  // 0-5 Aries (Mars)
      expect(calculator.calculateLongitudeVarga(7.0, 'D30')).toBe(11); // 5-10 Aquarius (Saturn)
      expect(calculator.calculateLongitudeVarga(14.0, 'D30')).toBe(9); // 10-18 Sagittarius (Jupiter)
      expect(calculator.calculateLongitudeVarga(20.0, 'D30')).toBe(3); // 18-25 Gemini (Mercury)
      expect(calculator.calculateLongitudeVarga(27.0, 'D30')).toBe(7); // 25-30 Libra (Venus)

      // Even sign (Taurus 2):
      expect(calculator.calculateLongitudeVarga(32.0, 'D30')).toBe(2);  // 0-5 Taurus (Venus)
      expect(calculator.calculateLongitudeVarga(38.0, 'D30')).toBe(6);  // 5-12 Virgo (Mercury)
      expect(calculator.calculateLongitudeVarga(45.0, 'D30')).toBe(12); // 12-20 Pisces (Jupiter)
      expect(calculator.calculateLongitudeVarga(52.0, 'D30')).toBe(10); // 20-25 Capricorn (Saturn)
      expect(calculator.calculateLongitudeVarga(57.0, 'D30')).toBe(8);  // 25-30 Scorpio (Mars)
    });

    // D40 - Khavedamsa (0.75 deg: Odd-Aries 1, Even-Libra 7)
    it('calculates D40 (Khavedamsa) correctly', () => {
      // Odd sign (Aries 1): Starts from Aries (1)
      expect(calculator.calculateLongitudeVarga(0.2, 'D40')).toBe(1);
      expect(calculator.calculateLongitudeVarga(1.0, 'D40')).toBe(2);

      // Even sign (Taurus 2): Starts from Libra (7)
      expect(calculator.calculateLongitudeVarga(30.2, 'D40')).toBe(7);
      expect(calculator.calculateLongitudeVarga(31.0, 'D40')).toBe(8);
    });

    // D45 - Akshavedamsa (2/3 deg: Movable-Aries, Fixed-Leo, Dual-Sagittarius)
    it('calculates D45 (Akshavedamsa) correctly for all modalities', () => {
      // Movable (Aries 1): Starts from Aries (1)
      expect(calculator.calculateLongitudeVarga(0.2, 'D45')).toBe(1);

      // Fixed (Taurus 2): Starts from Leo (5)
      expect(calculator.calculateLongitudeVarga(30.2, 'D45')).toBe(5);

      // Dual (Gemini 3): Starts from Sagittarius (9)
      expect(calculator.calculateLongitudeVarga(60.2, 'D45')).toBe(9);
    });

    // D60 - Shashtiamsa (0.5 deg / 30 min divisions: Starts from sign itself)
    it('calculates D60 (Shashtiamsa) correctly', () => {
      // Aries (1):
      expect(calculator.calculateLongitudeVarga(0.2, 'D60')).toBe(1);  // 0.0 - 0.5 -> Aries (1)
      expect(calculator.calculateLongitudeVarga(0.7, 'D60')).toBe(2);  // 0.5 - 1.0 -> Taurus (2)
      expect(calculator.calculateLongitudeVarga(1.2, 'D60')).toBe(3);  // 1.0 - 1.5 -> Gemini (3)
      expect(calculator.calculateLongitudeVarga(5.8, 'D60')).toBe(12); // part 11 -> Pisces (12)
      expect(calculator.calculateLongitudeVarga(6.2, 'D60')).toBe(1);  // part 12 -> Aries (1) wraps cleanly

      // Scorpio (8):
      expect(calculator.calculateLongitudeVarga(210.2, 'D60')).toBe(8); // part 0 -> Scorpio (8)
      expect(calculator.calculateLongitudeVarga(210.7, 'D60')).toBe(9); // part 1 -> Sagittarius (9)
    });
  });

  describe('2. Boundary Conditions and Floating-Point Safety', () => {
    it('handles exact 0.0 degree boundary safely across all 16 Vargas', () => {
      const allVargas: VargaType[] = [
        'D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12',
        'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60',
      ];
      for (const vType of allVargas) {
        const sign = calculator.calculateLongitudeVarga(0.0, vType);
        expect(sign).toBeGreaterThanOrEqual(1);
        expect(sign).toBeLessThanOrEqual(12);

        const degInVarga = calculator.calculateDegreeInVarga(0.0, vType);
        expect(degInVarga).toBeGreaterThanOrEqual(0.0);
        expect(degInVarga).toBeLessThan(30.0);
      }
    });

    it('handles extreme upper boundary 359.999999 degrees without out-of-range signs', () => {
      const allVargas: VargaType[] = [
        'D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12',
        'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60',
      ];
      for (const vType of allVargas) {
        const sign = calculator.calculateLongitudeVarga(359.999999, vType);
        expect(sign).toBeGreaterThanOrEqual(1);
        expect(sign).toBeLessThanOrEqual(12);

        const degInVarga = calculator.calculateDegreeInVarga(359.999999, vType);
        expect(degInVarga).toBeGreaterThanOrEqual(0.0);
        expect(degInVarga).toBeLessThan(30.0);
      }
    });

    it('relative degreeInVarga is always within [0.0, 30.0) range', () => {
      const testLongitudes = [0.1, 7.5, 14.99, 15.0, 29.999, 30.0, 154.32, 287.65];
      const allVargas: VargaType[] = [
        'D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12',
        'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60',
      ];

      for (const lon of testLongitudes) {
        for (const vType of allVargas) {
          const degInVarga = calculator.calculateDegreeInVarga(lon, vType);
          expect(degInVarga, `degreeInVarga for ${vType} at lon ${lon}`).toBeGreaterThanOrEqual(0.0);
          expect(degInVarga, `degreeInVarga for ${vType} at lon ${lon}`).toBeLessThan(30.0);
        }
      }
    });
  });

  describe('3. Full VargaChart Object Construction', () => {
    // Mock canonical AstroChart
    const mockChart: AstroChart = {
      metadata: {
        engineVersion: '0.1.0',
        calculationTimestampIso: '2026-08-15T00:00:00.000Z',
        providerName: 'MockEphemerisProvider',
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
        normalizedTime: {
          utcIsoString: '1990-05-15T09:00:00.000Z',
          julianDayUT: 2448026.875,
          timezoneOffsetMinutes: 330,
        },
      },
      birthDetails: {
        date: { year: 1990, month: 5, day: 15 },
        time: { hour: 14, minute: 30, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.6139,
        longitude: 77.209,
      },
      ascendant: {
        name: 'Ascendant',
        longitude: 145.5, // 25.5 deg Leo (5)
        rashiIndex: 5,
        degreeInRashi: 25.5,
        nakshatraIndex: 11,
        pada: 4,
        nakshatraLord: PlanetSymbol.VENUS,
      },
      planets: {
        [PlanetSymbol.SUN]: {
          planet: PlanetSymbol.SUN,
          longitude: 30.5, // 0.5 deg Taurus (2)
          latitude: 0.0,
          distanceAU: 1.01,
          speedLongitude: 0.96,
          isRetrograde: false,
          rashiIndex: 2,
          rashiName: 'Vrishabha',
          degreeInRashi: 0.5,
          nakshatraIndex: 3,
          nakshatraName: 'Krittika',
          pada: 2,
          nakshatraLord: PlanetSymbol.SUN,
        },
        [PlanetSymbol.MOON]: {
          planet: PlanetSymbol.MOON,
          longitude: 275.2, // 5.2 deg Capricorn (10)
          latitude: 1.5,
          distanceAU: 0.0026,
          speedLongitude: 12.4,
          isRetrograde: false,
          rashiIndex: 10,
          rashiName: 'Makara',
          degreeInRashi: 5.2,
          nakshatraIndex: 21,
          nakshatraName: 'Uttara Ashadha',
          pada: 3,
          nakshatraLord: PlanetSymbol.SUN,
        },
        [PlanetSymbol.MARS]: {
          planet: PlanetSymbol.MARS,
          longitude: 320.0, // 20.0 deg Aquarius (11)
          latitude: -1.0,
          distanceAU: 1.5,
          speedLongitude: 0.7,
          isRetrograde: false,
          rashiIndex: 11,
          rashiName: 'Kumbha',
          degreeInRashi: 20.0,
          nakshatraIndex: 24,
          nakshatraName: 'Shatabhisha',
          pada: 1,
          nakshatraLord: PlanetSymbol.RAHU,
        },
        [PlanetSymbol.MERCURY]: {
          planet: PlanetSymbol.MERCURY,
          longitude: 25.0, // 25 deg Aries (1)
          latitude: 2.0,
          distanceAU: 0.9,
          speedLongitude: -0.4,
          isRetrograde: true,
          rashiIndex: 1,
          rashiName: 'Mesha',
          degreeInRashi: 25.0,
          nakshatraIndex: 2,
          nakshatraName: 'Bharani',
          pada: 4,
          nakshatraLord: PlanetSymbol.VENUS,
        },
        [PlanetSymbol.JUPITER]: {
          planet: PlanetSymbol.JUPITER,
          longitude: 95.0, // 5 deg Cancer (4)
          latitude: 0.2,
          distanceAU: 5.2,
          speedLongitude: 0.1,
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
          longitude: 355.0, // 25 deg Pisces (12)
          latitude: -0.5,
          distanceAU: 0.7,
          speedLongitude: 1.1,
          isRetrograde: false,
          rashiIndex: 12,
          rashiName: 'Meena',
          degreeInRashi: 25.0,
          nakshatraIndex: 27,
          nakshatraName: 'Revati',
          pada: 3,
          nakshatraLord: PlanetSymbol.MERCURY,
        },
        [PlanetSymbol.SATURN]: {
          planet: PlanetSymbol.SATURN,
          longitude: 295.0, // 25 deg Capricorn (10)
          latitude: -0.8,
          distanceAU: 9.5,
          speedLongitude: 0.05,
          isRetrograde: false,
          rashiIndex: 10,
          rashiName: 'Makara',
          degreeInRashi: 25.0,
          nakshatraIndex: 23,
          nakshatraName: 'Dhanishta',
          pada: 1,
          nakshatraLord: PlanetSymbol.MARS,
        },
        [PlanetSymbol.RAHU]: {
          planet: PlanetSymbol.RAHU,
          longitude: 285.0, // 15 deg Capricorn (10)
          latitude: 0.0,
          distanceAU: 0.00257,
          speedLongitude: -0.053,
          isRetrograde: true,
          rashiIndex: 10,
          rashiName: 'Makara',
          degreeInRashi: 15.0,
          nakshatraIndex: 22,
          nakshatraName: 'Shravana',
          pada: 2,
          nakshatraLord: PlanetSymbol.MOON,
        },
        [PlanetSymbol.KETU]: {
          planet: PlanetSymbol.KETU,
          longitude: 105.0, // 15 deg Cancer (4)
          latitude: 0.0,
          distanceAU: 0.00257,
          speedLongitude: -0.053,
          isRetrograde: true,
          rashiIndex: 4,
          rashiName: 'Karka',
          degreeInRashi: 15.0,
          nakshatraIndex: 8,
          nakshatraName: 'Pushya',
          pada: 4,
          nakshatraLord: PlanetSymbol.SATURN,
        },
        [PlanetSymbol.URANUS]: undefined as any,
        [PlanetSymbol.NEPTUNE]: undefined as any,
        [PlanetSymbol.PLUTO]: undefined as any,
      },
    };

    it('generates complete D9 Navamsha chart structure with ascendant and 12 houses', () => {
      const d9Chart = calculator.calculateVarga(mockChart, 'D9');

      expect(d9Chart.vargaType).toBe('D9');
      expect(d9Chart.division).toBe(9);
      expect(d9Chart.name).toContain('Navamsha');
      expect(d9Chart.calculationRule).toBeDefined();

      // Ascendant
      expect(d9Chart.ascendant).toBeDefined();
      expect(d9Chart.ascendant?.planet).toBe('Ascendant');
      expect(d9Chart.ascendant?.house).toBe(1);
      expect(d9Chart.ascendant?.rashiIndex).toBeGreaterThanOrEqual(1);
      expect(d9Chart.ascendant?.rashiIndex).toBeLessThanOrEqual(12);

      // Placements contains all 9 planets + Ascendant
      expect(d9Chart.placements['Ascendant']).toBeDefined();
      expect(d9Chart.placements[PlanetSymbol.SUN]).toBeDefined();
      expect(d9Chart.placements[PlanetSymbol.MOON]).toBeDefined();
      expect(d9Chart.placements[PlanetSymbol.MARS]).toBeDefined();
      expect(d9Chart.placements[PlanetSymbol.MERCURY]).toBeDefined();
      expect(d9Chart.placements[PlanetSymbol.JUPITER]).toBeDefined();
      expect(d9Chart.placements[PlanetSymbol.VENUS]).toBeDefined();
      expect(d9Chart.placements[PlanetSymbol.SATURN]).toBeDefined();
      expect(d9Chart.placements[PlanetSymbol.RAHU]).toBeDefined();
      expect(d9Chart.placements[PlanetSymbol.KETU]).toBeDefined();

      // Retrograde preservation
      expect(d9Chart.placements[PlanetSymbol.MERCURY].isRetrograde).toBe(true);
      expect(d9Chart.placements[PlanetSymbol.SUN].isRetrograde).toBe(false);

      // Houses array has 12 items
      expect(d9Chart.houses).toHaveLength(12);
      expect(d9Chart.houses![0].houseNumber).toBe(1);
      expect(d9Chart.houses![0].rashiIndex).toBe(d9Chart.ascendant?.rashiIndex);
      expect(d9Chart.houses![11].houseNumber).toBe(12);

      // Signs array has 12 items
      expect(d9Chart.signs).toHaveLength(12);
      expect(d9Chart.signs![0].index).toBe(1);
    });

    it('generates D10 Dasamsa with correct houses and occupant mapping', () => {
      const d10Chart = calculator.calculateVarga(mockChart, 'D10');
      expect(d10Chart.vargaType).toBe('D10');
      expect(d10Chart.division).toBe(10);
      expect(d10Chart.houses).toHaveLength(12);

      // Verify that every planet is mapped to a house 1 to 12
      for (const [key, p] of Object.entries(d10Chart.placements)) {
        if (key !== 'Ascendant') {
          expect(p.house).toBeGreaterThanOrEqual(1);
          expect(p.house).toBeLessThanOrEqual(12);
        }
      }
    });

    it('generates all 16 canonical Vargas without throwing', () => {
      const allVargas: VargaType[] = [
        'D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12',
        'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60',
      ];

      for (const vType of allVargas) {
        const vChart = calculator.calculateVarga(mockChart, vType);
        expect(vChart.vargaType).toBe(vType);
        expect(vChart.division).toBeGreaterThanOrEqual(1);
        expect(vChart.ascendant).toBeDefined();
        expect(vChart.houses).toHaveLength(12);
        expect(vChart.signs).toHaveLength(12);
        expect(Object.keys(vChart.placements).length).toBeGreaterThanOrEqual(10); // 9 planets + Lagna
      }
    });
  });
});
