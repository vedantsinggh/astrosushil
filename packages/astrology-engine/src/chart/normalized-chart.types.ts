import { PlanetSymbol } from '../planets/planet.types';

export interface NormalizedCalculationMetadata {
  calculationVersion: string;
  providerName: string;
  providerVersion: string;
  calculationTimestampIso: string;
  normalizedTime: {
    utcIsoString: string;
    julianDayUT: number;
    timezoneOffsetMinutes: number;
  };
  config: {
    zodiacType: 'SIDEREAL' | string;
    ayanamsa: 'LAHIRI' | string;
    houseSystem: 'WHOLE_SIGN' | string;
    nodeCalculation: 'MEAN_NODE' | string;
    planetaryCalculationMode: 'GEOCENTRIC' | string;
  };
}

export interface NormalizedAscendant {
  sign: string;           // Sanskrit Rashi name (e.g., "Vrischika" / "Scorpio")
  rashiIndex: number;     // 1 to 12
  degree: number;         // Relative degree in sign [0, 30)
  absoluteDegree: number; // Absolute longitude [0, 360)
  nakshatra: string;      // Nakshatra name (e.g. "Anuradha")
  nakshatraIndex: number; // 1 to 27
  pada: number;           // 1 to 4
  house: number;          // Always 1 for Lagna
  lord: PlanetSymbol;     // Ruler planet symbol of the ascendant sign
}

export type PlanetaryDignity =
  | 'EXALTED'
  | 'DEBILITATED'
  | 'MOOLATRIKONA'
  | 'OWN_SIGN'
  | 'GREAT_FRIEND'
  | 'FRIEND'
  | 'NEUTRAL'
  | 'ENEMY'
  | 'GREAT_ENEMY';

export interface NormalizedPlanet {
  name: PlanetSymbol;     // 'SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU'
  sign: string;           // Rashi name
  rashiIndex: number;     // 1 to 12
  degree: number;         // Relative degree in sign [0, 30)
  absoluteDegree: number; // Absolute longitude [0, 360)
  house: number;          // House number 1 to 12
  nakshatra: string;      // Nakshatra name
  nakshatraIndex: number; // 1 to 27
  pada: number;           // 1 to 4
  nakshatraLord: PlanetSymbol;
  retrograde: boolean;
  combust: boolean;
  dignity: PlanetaryDignity;
  lordship: number[];     // House numbers this planet rules
  speedLongitude?: number;
  latitude?: number;
  avastha?: {
    baladi: string;
    baladiStrengthPercent: number;
    jagratadi: string;
  };
  charaKaraka?: string;   // e.g. 'AK', 'AmK', 'BK', 'MK', 'PK', 'GK', 'DK'
  aspectsReceived?: PlanetSymbol[];
  aspectsCast?: number[]; // houses aspected
  status: 'VERIFIED';
}

export interface NormalizedHouse {
  number: number;           // 1 to 12
  sign: string;             // Rashi name on cusp
  rashiIndex: number;       // 1 to 12
  lord: PlanetSymbol;       // Ruling planet of house sign
  occupants: PlanetSymbol[];// Planets positioned in this house
  cuspLongitude: number;
  startLongitude: number;
  endLongitude: number;
  status: 'VERIFIED';
}

export interface NormalizedRashi {
  index: number;            // 1 to 12
  name: string;             // Sanskrit name
  englishName: string;      // English name
  lord: PlanetSymbol;       // Ruling planet
  element: 'FIRE' | 'EARTH' | 'AIR' | 'WATER' | string;
  modality: 'CHARA' | 'STHIRA' | 'DVISVABHAVA' | string;
  houseNumber: number;      // House number mapped to this Rashi
  occupants: PlanetSymbol[];
}

export interface NormalizedNakshatra {
  index: number;            // 1 to 27
  name: string;
  lord: PlanetSymbol;
  startDegree: number;
  endDegree: number;
  occupants: PlanetSymbol[];
}

export interface NormalizedChart {
  calculation: NormalizedCalculationMetadata;
  birthDetails: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    latitude: number;
    longitude: number;
    timezone: string;
    placeName?: string;
  };
  ascendant: NormalizedAscendant;
  planets: NormalizedPlanet[];
  houses: NormalizedHouse[];
  rashis: NormalizedRashi[];
  nakshatras: NormalizedNakshatra[];
}
