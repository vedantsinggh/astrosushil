import type { CurrentDashaPeriod, SignDashaDirection, SignDashaPeriod } from '../dasha/dasha.types';

/**
 * Extra sign-based (rashi) dasha systems added for desktop parity (ADR-016 decision 3).
 * Every system here is a provisional convention pending client review; each result carries the
 * book/verse it follows in `source` and the choices made in `conventionNotes`.
 */
export type SignDashaExtSystem = 'SUDASA' | 'DRIG' | 'NIRYANA_SHOOLA' | 'MANDOOKA' | 'TRIKONA' | 'KENDRADI';

/** Systems requested by the client that could not be defined unambiguously from a published source. */
export type SignDashaExtPendingSystem = 'BRAHMA' | 'NAVAMSA' | 'VARNADA' | 'PADANADHAMSA';

export const SIGN_DASHA_EXT_PROVISIONAL_LABEL = 'provisional – pending client review';

/** How the length (years) of each sign's Mahadasha is obtained. */
export type SignDashaExtYearsRule =
  /** Count from the sign to its lord (forward for odd-footed signs, backward otherwise), minus one; 12 if the lord is in the sign; +1 exalted / -1 debilitated. */
  | 'CHARA_NARAYANA_COUNT'
  /** 7 years for movable, 8 for fixed, 9 for dual signs (Sthira Dasa spans). */
  | 'STHIRA_FIXED';

export interface SignDashaExtSystemInfo {
  system: SignDashaExtSystem;
  name: string;
  group: 'SIGN';
  implemented: true;
  provisional: true;
  provisionalLabel: string;
  source: string;
  yearsRule: SignDashaExtYearsRule;
  /** Nominal length of one full cycle in years when it is fixed (Sthira spans), otherwise undefined. */
  fixedCycleYears?: number;
  summary: string;
}

export interface SignDashaExtPendingInfo {
  system: SignDashaExtPendingSystem;
  name: string;
  group: 'SIGN';
  implemented: false;
  reason: string;
}

/** A Mahadasha / Antardasha / Pratyantardasha node: the shared sign-dasha shape plus the cycle. */
export interface SignDashaExtPeriod extends SignDashaPeriod {
  /** 1 for the first round of 12 signs, 2 for the second round (Mahadashas only). */
  cycle?: number;
  subPeriods?: SignDashaExtPeriod[];
}

export interface SignDashaExtSreeLagna {
  longitude: number;
  signIndex: number;
  signName: string;
  degreeInSign: number;
  moonNakshatraFractionTraversed: number;
  formula: string;
}

export interface SignDashaExtTree {
  system: SignDashaExtSystem;
  dashaSystem: SignDashaExtSystem;
  systemName: string;
  basis: 'RASHI';
  provisional: true;
  provisionalLabel: string;
  source: string;
  conventionNotes: string[];
  yearsRule: SignDashaExtYearsRule;
  lagnaRashiIndex: number;
  startingSign: number;
  startingSignName: string;
  startingSignReason: string;
  /** Overall direction of the Mahadasha sequence (Drig Dasa has a direction per group: see directionReason). */
  direction: SignDashaDirection;
  directionReason: string;
  /** First-cycle sign order (1..12 each, 12 entries). */
  sequence: number[];
  totalCycleYears: number;
  cycles: number;
  /** Years of the first Mahadasha left at birth (equals its full length unless the system defines a balance). */
  balanceAtBirthYears: number;
  elapsedAtBirthYears: number;
  sreeLagna?: SignDashaExtSreeLagna;
  periods: SignDashaExtPeriod[];
  mahadashas: SignDashaExtPeriod[];
  currentPeriod?: CurrentDashaPeriod;
}

export interface SignDashaExtOptions {
  /** 1 = Mahadashas, 2 = + Antardashas, 3 = + Pratyantardashas. Default 2. */
  maxLevel?: number;
  /** Marks `isActive` and fills `currentPeriod` for this instant. */
  targetDate?: Date | string;
}
