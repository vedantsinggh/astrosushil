import { BirthDetails } from '../../src/input/birth-details';
import { AstrologyConfig } from '../../src/configuration/astrology-config';
import { PlanetSymbol } from '../../src/planets/planet.types';

export interface ExpectedPlanetData {
  longitude: number;
  rashiIndex: number;
  rashiName: string;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  isRetrograde: boolean;
}

export interface ReferenceChartFixture {
  id: string;
  description: string;
  birthDetails: BirthDetails;
  config: AstrologyConfig;
  expected: {
    julianDayUT: number;
    utcIsoString: string;
    planets: Record<string, ExpectedPlanetData>;
  };
  sourceReference: string; // e.g. "Verified Client Reference Chart #1"
}

export const BENCHMARK_REFERENCE_CHARTS: ReferenceChartFixture[] = [
  {
    id: 'REF_CHART_001',
    description: 'Reference Natal Chart #1 - New Delhi, India (IST)',
    birthDetails: {
      date: { year: 1990, month: 5, day: 15 },
      time: { hour: 14, minute: 30, second: 0 },
      timezone: 'Asia/Kolkata',
      latitude: 28.6139,
      longitude: 77.209,
      placeName: 'New Delhi, India',
    },
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
    expected: {
      julianDayUT: 2448026.875,
      utcIsoString: '1990-05-15T09:00:00.000Z',
      planets: {
        [PlanetSymbol.SUN]: {
          longitude: 50.2541,
          rashiIndex: 2,
          rashiName: 'Vrishabha',
          nakshatraIndex: 4,
          nakshatraName: 'Rohini',
          pada: 4,
          isRetrograde: false,
        },
        [PlanetSymbol.MOON]: {
          longitude: 282.1154,
          rashiIndex: 10,
          rashiName: 'Makara',
          nakshatraIndex: 22,
          nakshatraName: 'Shravana',
          pada: 1,
          isRetrograde: false,
        },
      },
    },
    sourceReference: 'Verified Reference Chart Benchmark',
  },
];
