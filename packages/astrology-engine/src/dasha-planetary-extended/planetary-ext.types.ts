import { PlanetSymbol } from '../planets/planet.types';
import { CurrentDashaPeriod, ExtendedDashaPeriodBase } from '../dasha/dasha.types';

/**
 * Extra planet-based dashas (client decision ADR-016 §3). Every result is provisional
 * ("provisional – pending client review") and carries its source citation.
 */
export type PlanetaryExtDashaSystem = 'TRIBHAGI' | 'SHASTIHAYANI' | 'TARA';

/** Systems listed for the UI, including ones that could not be defined from a published source. */
export type PlanetaryExtListedSystem = PlanetaryExtDashaSystem | 'MOOLA' | 'PATYAYINI';

export const PLANETARY_EXT_PROVISIONAL_LABEL = 'provisional – pending client review';

export interface PlanetaryExtEligibility {
  isEligible: boolean;
  /** Classical applicability condition as stated by the source. */
  condition: string;
  reason: string;
  criteria?: Record<string, string | number | boolean | null>;
}

/** Same node shape as the engine's Yogini/Chara/Kalachakra trees (ExtendedDashaPeriodBase). */
export interface PlanetaryExtDashaPeriod extends ExtendedDashaPeriodBase {
  /** Tara dasha only: the tara (Janma, Sampat, ...) that replaces the planet (BPHS 46.207-209). */
  taraName?: string;
  subPeriods?: PlanetaryExtDashaPeriod[];
}

export interface PlanetaryExtDashaTree {
  dashaSystem: PlanetaryExtDashaSystem;
  system: PlanetaryExtDashaSystem;
  basis: 'NAKSHATRA' | 'KENDRA';
  provisional: true;
  label: string;
  source: string;
  conventionNotes: string[];
  eligibility: PlanetaryExtEligibility;
  /** Lord of the first (birth) dasha. */
  startingLord: PlanetSymbol | null;
  moonLongitude: number;
  moonNakshatraIndex: number;
  moonNakshatraName: string;
  /** Sector (nakshatra, or Abhijit for Shastihayani) used for the balance. */
  sectorName?: string;
  balanceAtBirthYears: number;
  elapsedAtBirthYears: number;
  /** Nominal years of one full cycle of the system. */
  totalCycleYears: number;
  cycles: number;
  mahadashas: PlanetaryExtDashaPeriod[];
  currentPeriod?: CurrentDashaPeriod;
  /** Tara dasha: strength figures used to pick the first dasha. */
  strengthEvidence?: Array<{ planet: PlanetSymbol; house: number; shadbalaRupas: number | null }>;
}

export interface PlanetaryExtCalculationOptions {
  /** 1 = Mahadasha, 2 = Antardasha, 3 = Pratyantardasha (default 3). */
  maxLevel?: number;
  targetDate?: Date | string;
}

export interface PlanetaryExtSystemInfo {
  system: PlanetaryExtListedSystem;
  name: string;
  implemented: boolean;
  provisional: true;
  label: string;
  source: string;
  eligibilityNote: string;
  totalCycleYears: number | null;
  /** Why the system is not implemented (still ❓), when implemented is false. */
  notImplementedReason?: string;
  /** Sidecar / API entry point hint. */
  calculatedBy: 'REGISTRY' | 'PATYAYINI_CALCULATOR' | 'NONE';
}

// ---------------------------------------------------------------------------------------------
// Patyayini (Tajika annual dasha)
// ---------------------------------------------------------------------------------------------

export type PatyayiniKey = 'LAGNA' | PlanetSymbol;

export interface PatyayiniInputPoint {
  key: PatyayiniKey;
  /** Advancement within its sign in degrees [0, 30) ("krishamsha"). */
  degreeInSign: number;
}

export interface PatyayiniRow {
  key: PatyayiniKey;
  order: number;           // 1..8 in ascending krishamsha
  krishamsha: number;      // degrees
  patyamsha: number;       // degrees
  fraction: number;        // patyamsha / sum of patyamshas
}

export interface PatyayiniPeriod {
  level: number;           // 1 = dasha, 2 = antardasha, 3 = pratyantardasha
  order: number;
  key: PatyayiniKey;
  /** Same as key (kept so the node reads like the other dasha trees). */
  lord: PatyayiniKey;
  fraction: number;        // share of the parent period
  days: number;
  startDateIso: string;
  endDateIso: string;
  isActive?: boolean;
  subPeriods?: PatyayiniPeriod[];
}

export interface PatyayiniDashaResult {
  dashaSystem: 'PATYAYINI';
  provisional: true;
  label: string;
  source: string;
  conventionNotes: string[];
  targetYear: number;
  solarReturnUtcIso: string;
  nextSolarReturnUtcIso: string;
  yearLengthDays: number;
  annualLocation: { latitude: number; longitude: number; timezone: string; placeName?: string };
  rows: PatyayiniRow[];
  periods: PatyayiniPeriod[];
  activePath?: PatyayiniKey[];
}
