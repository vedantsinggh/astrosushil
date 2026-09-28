import { describe, it, expect } from 'vitest';
import { VargaCalculator } from '../../src/varga/varga-calculator';
import { VargaType } from '../../src/varga/varga.types';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { PlanetSymbol } from '../../src/planets/planet.types';

describe('Varga Serialization Tests - Guard Against Empty Objects', () => {
  const calculator = new VargaCalculator();

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
      longitude: 145.5,
      rashiIndex: 5,
      degreeInRashi: 25.5,
      nakshatraIndex: 11,
      pada: 4,
      nakshatraLord: PlanetSymbol.VENUS,
    },
    planets: {
      [PlanetSymbol.SUN]: {
        planet: PlanetSymbol.SUN,
        longitude: 30.5,
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
        longitude: 275.2,
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
        longitude: 320.0,
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
        longitude: 25.0,
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
        longitude: 95.0,
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
        longitude: 355.0,
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
        longitude: 295.0,
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
        longitude: 285.0,
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
        longitude: 105.0,
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

  const allVargas: VargaType[] = [
    'D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12',
    'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60',
  ];

  it('serializes all 16 Vargas into valid, non-empty JSON without "{}" anomalies', () => {
    for (const vType of allVargas) {
      const vChart = calculator.calculateVarga(mockChart, vType);
      const jsonStr = JSON.stringify(vChart);
      expect(jsonStr).not.toBe('{}');
      expect(jsonStr).not.toContain('"{}"');

      const parsed = JSON.parse(jsonStr);
      expect(parsed.vargaType).toBe(vType);
      expect(typeof parsed.division).toBe('number');
      expect(typeof parsed.name).toBe('string');
      expect(typeof parsed.calculationRule).toBe('string');

      // Ascendant serialized cleanly
      expect(parsed.ascendant).toBeDefined();
      expect(parsed.ascendant.planet).toBe('Ascendant');
      expect(typeof parsed.ascendant.rashiIndex).toBe('number');
      expect(typeof parsed.ascendant.rashiName).toBe('string');

      // Placements contains all planets
      expect(parsed.placements).toBeDefined();
      expect(parsed.placements['Ascendant']).toBeDefined();
      expect(parsed.placements['SUN']).toBeDefined();
      expect(parsed.placements['MOON']).toBeDefined();
      expect(parsed.placements['MARS']).toBeDefined();
      expect(parsed.placements['MERCURY']).toBeDefined();
      expect(parsed.placements['JUPITER']).toBeDefined();
      expect(parsed.placements['VENUS']).toBeDefined();
      expect(parsed.placements['SATURN']).toBeDefined();
      expect(parsed.placements['RAHU']).toBeDefined();
      expect(parsed.placements['KETU']).toBeDefined();

      // Houses array has 12 valid entries
      expect(Array.isArray(parsed.houses)).toBe(true);
      expect(parsed.houses).toHaveLength(12);
      expect(parsed.houses[0].houseNumber).toBe(1);
      expect(parsed.houses[0].rashiIndex).toBe(parsed.ascendant.rashiIndex);

      // Signs array has 12 valid entries
      expect(Array.isArray(parsed.signs)).toBe(true);
      expect(parsed.signs).toHaveLength(12);
    }
  });
});
