import { PlanetSymbol, PlanetPosition } from '../planets/planet.types';
import { CalculatedPoint, HousePlacement } from '../houses/house.types';
import { PanchangOutput } from '../panchang/panchang.types';
import { AstroChart } from '../chart/astro-chart.types';
import { CombustionDetail } from '../planets/planetary-intelligence.types';

export interface PrashnaLocation {
  latitude: number;
  longitude: number;
  timezone: string;
  placeName?: string;
  altitudeMeters?: number;
}

export type PrashnaNumberSystem = 'PARASHARI_1_108' | 'KP_1_249' | 'AUTO';

export interface PrashnaQuestionInput {
  questionTimestamp: string;          // ISO 8601 string (e.g. 2026-09-17T10:00:00+05:30)
  timezone: string;                   // IANA timezone string (e.g. 'Asia/Kolkata')
  location: PrashnaLocation;
  questionNumber?: number;            // 1-108 for classical Parashari/Arya, 1-249 for KP
  questionNumberSystem?: PrashnaNumberSystem;
  questionText?: string;              // Optional user query text
}

export interface PrashnaTimeDetails {
  utcIso: string;
  localIso: string;
  timezone: string;
  julianDayUT: number;
}

export interface PrashnaLagna extends CalculatedPoint {
  rashiIndex: number;                 // 1 to 12
  rashiName: string;                  // Sanskrit name
  degreeInRashi: number;
  nakshatraIndex: number;             // 1 to 27
  nakshatraName: string;
  pada: number;                       // 1 to 4
  nakshatraLord: PlanetSymbol;
  lord: PlanetSymbol;                 // Rashi ruler
}

export interface PrashnaPlanet extends PlanetPosition {
  house: number;                      // 1 to 12 from Prashna Lagna
  isCombust: boolean;                 // Whether combust relative to Sun
  combustionDetail?: CombustionDetail;
}

export interface PrashnaHouse extends HousePlacement {
  sign: string;                       // Sanskrit name
  lord: PlanetSymbol;                 // Rashi lord
  occupyingPlanets: PlanetSymbol[];   // Occupying planets
}

export interface MoonAspectDetail {
  aspectingPlanet: PlanetSymbol;
  aspectType: string;                 // 'CONJUNCTION' | 'OPPOSITION' | 'TRINE' | 'SQUARE' | 'SEXTILE' | 'SPECIAL'
  angleDegrees: number;
  orbDegrees: number;
}

export interface PrashnaMoon {
  longitude: number;
  rashiIndex: number;
  rashiName: string;
  degreeInRashi: number;
  house: number;                      // House in Prashna chart
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  nakshatraLord: PlanetSymbol;
  isWaxing: boolean;                  // True if Shukla Paksha, False if Krishna Paksha
  phaseName: string;                  // 'Shukla Paksha' | 'Krishna Paksha'
  aspectsReceived: MoonAspectDetail[];
}

export interface SphutaPoint {
  name: string;
  sanskritName: string;
  longitude: number;
  rashiIndex: number;
  rashiName: string;
  degreeInRashi: number;
  house: number;                      // House in Prashna chart
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  nakshatraLord: PlanetSymbol;
  formula: string;
}

export interface PrashnaSphutas {
  gulika: SphutaPoint;
  trisphuta: SphutaPoint;
  chatusphuta: SphutaPoint;
  panchasphuta: SphutaPoint;
}

export interface Parashari108Details {
  system: 'PARASHARI_1_108';
  number: number;
  startLongitude: number;
  endLongitude: number;
  midLongitude: number;
  rashiIndex: number;
  rashiName: string;
  navamshaRashiIndex: number;
  navamshaRashiName: string;
  navamshaLord: PlanetSymbol;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  nakshatraLord: PlanetSymbol;
  arudhaHouseFromLagna: number;
  description: string;
}

export interface KP249Details {
  system: 'KP_1_249';
  number: number;
  startLongitude: number;
  endLongitude: number;
  rashiIndex: number;
  rashiName: string;
  signLord: PlanetSymbol;
  starLord: PlanetSymbol;
  subLord: PlanetSymbol;
  description: string;
}

export type PrashnaNumberDetails = Parashari108Details | KP249Details;

export interface PrashnaConvention {
  zodiac: 'SIDEREAL';
  ayanamsa: 'LAHIRI';
  houseSystem: 'WHOLE_SIGN';
  planetaryModel: 'GEOCENTRIC';
  nodeModel: 'MEAN_NODE';
  timeConvention: 'EXPLICIT_QUESTION_TIMESTAMP_NO_SERVER_TIME';
  horaryMethodology: 'CLASSICAL_PRASHNA_MARGA_WITH_OPTIONAL_KP';
}

export const DEFAULT_PRASHNA_CONVENTION: PrashnaConvention = {
  zodiac: 'SIDEREAL',
  ayanamsa: 'LAHIRI',
  houseSystem: 'WHOLE_SIGN',
  planetaryModel: 'GEOCENTRIC',
  nodeModel: 'MEAN_NODE',
  timeConvention: 'EXPLICIT_QUESTION_TIMESTAMP_NO_SERVER_TIME',
  horaryMethodology: 'CLASSICAL_PRASHNA_MARGA_WITH_OPTIONAL_KP',
};

export interface PrashnaChart {
  calculationVersion: string;
  convention: PrashnaConvention;
  questionTime: PrashnaTimeDetails;
  location: PrashnaLocation;
  questionText?: string;
  prashnaLagna: PrashnaLagna;
  planets: Record<PlanetSymbol, PrashnaPlanet>;
  houses: PrashnaHouse[];
  moon: PrashnaMoon;
  sphutas: PrashnaSphutas;
  questionNumberDetails?: PrashnaNumberDetails;
  panchanga: PanchangOutput;
  isRahuKala: boolean;
  astroChart: AstroChart;
}

