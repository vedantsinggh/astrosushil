import { PlanetSymbol, PlanetPosition } from '../planets/planet.types';
import { CalculatedPoint, HousePlacement } from '../houses/house.types';
import { PanchangOutput } from '../panchang/panchang.types';
import { AstroChart } from '../chart/astro-chart.types';
import { BirthDetails, LocalDateInput, LocalTimeInput } from '../input/birth-details';
import { DashaPeriod, ActiveDashaInfo } from '../dasha/dasha.types';
import { CombustionDetail } from '../planets/planetary-intelligence.types';

export interface AnnualLocationInput {
  latitude: number;
  longitude: number;
  timezone: string;
  placeName?: string;
  altitudeMeters?: number;
}

export interface VarshaphalaCalculationOptions {
  targetYear: number;                 // e.g. 2026
  annualLocation?: AnnualLocationInput; // Optional annual location (defaults to natal location)
  targetDate?: Date | string;        // Optional query date for active annual dasha lookup
}

export interface SolarReturnDetails {
  targetYear: number;
  age: number;                        // completed years of age
  natalSunLongitude: number;
  natalSunSign: string;
  natalSunDegree: number;
  solarReturnSunLongitude: number;
  solarReturnSunSign: string;
  solarReturnSunDegree: number;
  angularErrorDegrees: number;        // Absolute difference between natal and transit Sun (< 1e-6)
  julianDayUT: number;
  solarReturnUtcIso: string;
  solarReturnLocalIso: string;
  timezone: string;
  annualLocation: {
    latitude: number;
    longitude: number;
    timezone: string;
    placeName?: string;
  };
  iterations: number;
}

export interface VarshaLagna extends CalculatedPoint {
  rashiIndex: number;
  rashiName: string;
  degreeInRashi: number;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  lord: PlanetSymbol;
}

export interface AnnualPlanet extends PlanetPosition {
  house: number;                      // 1 to 12 in the annual chart
  isCombust: boolean;                 // Whether the planet is combust by the Sun
  combustionDetail?: CombustionDetail;// Detailed combustion status
}

export interface AnnualHouse extends HousePlacement {
  sign: string;                       // Sanskrit/English name of the sign
  lord: PlanetSymbol;                 // Planetary ruler of the house's sign
  occupyingPlanets: PlanetSymbol[];   // Planets situated in this house
}

export interface MunthaDetails {
  rashiIndex: number;                 // 1 to 12
  rashiName: string;                  // e.g. "Aries"
  longitude: number;                  // Decimal longitude [0, 360)
  degreeInRashi: number;
  lord: PlanetSymbol;
  houseInVarshaChart: number;         // 1 to 12
  houseInNatalChart: number;          // 1 to 12
  progressionYears: number;           // Completed years passed from birth
  progressionIndex: number;           // Progression step index (completedYears % 12)
  evidence?: {
    natalLagnaRashiIndex: number;
    natalLagnaLongitude: number;
    completedYears: number;
    formula: string;
  };
}

export type PanchadhikariRole =
  | 'MUNTHESHA'        // Lord of the Muntha sign
  | 'JANMESHA'         // Lord of the Natal Lagna
  | 'VARSHA_LAGNESHA'  // Lord of the Varsha Lagna
  | 'TRIRASHISHA'      // Tri-Rashi Lord (Day / Night by sign from classical Tajika table)
  | 'DINA_RATRI_PATI'; // Surya Rashi Lord for Day return, Chandra Rashi Lord for Night return

export interface PanchadhikariCandidate {
  role: PanchadhikariRole;
  roleTitle: string;
  planet: PlanetSymbol;
  sourceDescription: string;
  aspectsVarshaLagna: boolean;
  harshaBalaScore: number;
  houseInVarshaChart: number;
}

export interface PanchadhikariDetails {
  isDayReturn: boolean;
  sunHouseInVarshaChart: number;
  candidates: PanchadhikariCandidate[];
}

export interface VarsheshaDetails {
  selectedVarshesha: PlanetSymbol;
  role: PanchadhikariRole;
  selectionReason: string;
  aspectsVarshaLagna: boolean;
  harshaBalaScore: number;
  candidates: PanchadhikariCandidate[];
  convention: string;
}

export interface PlanetHarshaBala {
  planet: PlanetSymbol;
  sthanaBala: number;                 // 0 or 5 (joy house)
  ucchaBala: number;                  // 0 or 5 (own sign or exaltation)
  striPurushaBala: number;            // 0 or 5 (gender-matched sign)
  dinaRatriBala: number;              // 0 or 5 (day/night nature match)
  totalScore: number;                 // 0 to 20
  hasHarsha: boolean;                 // totalScore >= 15
}

export type HarshaBalaScores = Record<PlanetSymbol, PlanetHarshaBala>;

export interface HarshaYogaResult {
  yogaId: string;
  name: string;
  involvedPlanet: PlanetSymbol;
  house: number;
  score: number;
  evidence: string;
}

export type TajikaYogaType =
  | 'ITHASALA'     // Muthashila (Applying aspect within orb)
  | 'ISARPHA'      // Musaripha (Separating aspect)
  | 'NAKTA'        // Intermediary faster planet connects two non-aspecting planets
  | 'YAMAYA'       // Intermediary slower planet connects two non-aspecting planets
  | 'KAMBOOLA';    // Moon joins an Ithasala yoga

export interface TajikaYoga {
  type: TajikaYogaType;
  name: string;
  planet1: PlanetSymbol;
  planet2: PlanetSymbol;
  intermediaryPlanet?: PlanetSymbol;
  orbDegrees: number;
  actualDistanceDegrees: number;
  isApplying: boolean;
  description: string;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
}

export interface SahamResult {
  name: string;
  sanskritName: string;
  longitude: number;                  // [0, 360)
  rashiIndex: number;
  rashiName: string;
  degreeInRashi: number;
  houseInVarshaChart: number;
  formula: string;
  isDayFormula: boolean;
  sourcePoints: string[];
  convention: string;
}

export interface MuddaDashaTree {
  dashaSystem: 'MUDDA';
  birthLord: PlanetSymbol;
  totalCycleDays: number;             // 365.2425
  startDateIso: string;
  endDateIso: string;
  periods: DashaPeriod[];
  activeDasha?: ActiveDashaInfo;
  convention: string;
}

export interface VarshaphalaConvention {
  zodiac: 'SIDEREAL';
  ayanamsa: 'LAHIRI';
  planetaryModel: 'GEOCENTRIC';
  nodeModel: 'MEAN_NODE';
  houseSystem: 'WHOLE_SIGN';
  locationConvention: 'EXPLICIT_ANNUAL_OR_NATAL_DEFAULT';
  timezoneConvention: 'IANA_TIMEZONE_AWARE';
  solarReturnDefinition: 'EXACT_SIDEREAL_SUN_LONGITUDE_RETURN';
  annualYearNumbering: 'CALENDAR_YEAR_WITH_COMPLETED_AGE';
  tripatakiStatus: 'PENDING';
}

export const DEFAULT_VARSHAPHALA_CONVENTION: VarshaphalaConvention = {
  zodiac: 'SIDEREAL',
  ayanamsa: 'LAHIRI',
  planetaryModel: 'GEOCENTRIC',
  nodeModel: 'MEAN_NODE',
  houseSystem: 'WHOLE_SIGN',
  locationConvention: 'EXPLICIT_ANNUAL_OR_NATAL_DEFAULT',
  timezoneConvention: 'IANA_TIMEZONE_AWARE',
  solarReturnDefinition: 'EXACT_SIDEREAL_SUN_LONGITUDE_RETURN',
  annualYearNumbering: 'CALENDAR_YEAR_WITH_COMPLETED_AGE',
  tripatakiStatus: 'PENDING',
};

export interface VarshaphalaChart {
  calculationVersion: string;
  convention: VarshaphalaConvention;
  natalBirthDetails: BirthDetails;
  solarReturn: SolarReturnDetails;
  varshaLagna: VarshaLagna;
  natalLagna: CalculatedPoint;
  planets: Record<PlanetSymbol, AnnualPlanet>;
  houses: AnnualHouse[];
  muntha: MunthaDetails;
  panchadhikari: PanchadhikariDetails;
  varshesha: VarsheshaDetails;
  harshaBala: HarshaBalaScores;
  harshaYogas?: HarshaYogaResult[];
  tajikaYogas: TajikaYoga[];
  sahams: SahamResult[];
  muddaDasha: MuddaDashaTree;
  panchanga: PanchangOutput;
  annualChart: AstroChart;
}
