import { PlanetSymbol } from '../planets/planet.types';
import { GanaType, YoniAnimal, YoniGender } from '../matchmaking/matchmaking.types';

/**
 * South Indian Porutham / Dashakoota types (ADR-016 §4). Provisional – pending client review.
 * Neutral calculated facts only: no verdict or interpretation text.
 */

/** Moon-based inputs for one person (all derived from the engine chart's Moon longitude). */
export interface SouthMatchPerson {
  label: string;
  moonLongitude: number | null;
  nakshatraIndex: number; // 1..27 (Ashwini = 1)
  nakshatraName: string;
  pada: number | null;
  rashiIndex: number; // 1..12 (Mesha = 1)
  rashiName: string;
  rashiLord: PlanetSymbol;
  gana: GanaType;
  yoni: { animal: YoniAnimal; gender: YoniGender };
  rajju: SouthRajjuGroup;
}

export type SouthKootaKey =
  | 'DINA'
  | 'GANA'
  | 'MAHENDRA'
  | 'STREE_DEERGHA'
  | 'YONI'
  | 'RASI'
  | 'RASI_ADHIPATI'
  | 'VASYA'
  | 'RAJJU'
  | 'VEDHA';

/** Tamil grading words, only set where the cited rule defines a grade. */
export type SouthKootaGrade = 'UTTAMA' | 'MADHYAMA' | 'ADHAMA';

export type SouthRajjuGroup = 'SIRO' | 'KANTHA' | 'NABHI' | 'KATI' | 'PADA';

export interface SouthKootaResult {
  key: SouthKootaKey;
  name: string;
  matched: boolean;
  /** Grade as defined by the cited rule; null where the rule is a plain match / no-match. */
  grade: SouthKootaGrade | null;
  /** True only for Rajju and Vedha when the source names the failure a dosha. */
  dosha: boolean;
  /** The rule applied, stated neutrally. */
  rule: string;
  /** The lookups used (counts, groups, lords...). */
  inputs: Record<string, string | number | boolean | null>;
}

export interface SouthMatchingResultBase {
  boy: SouthMatchPerson;
  girl: SouthMatchPerson;
  /** Count direction used by every count-based koota. */
  countDirection: 'GIRL_TO_BOY_INCLUSIVE';
  kootas: SouthKootaResult[];
  matchedCount: number;
  totalKootas: 10;
  rajjuDosha: boolean;
  vedhaDosha: boolean;
  provisional: true;
  provisionalLabel: string;
  source: string;
  conventionNotes: string[];
}

export interface PoruthamResult extends SouthMatchingResultBase {
  system: 'PORUTHAM';
}

export interface DashakootaResult extends SouthMatchingResultBase {
  system: 'DASHAKOOTA';
  /** Points are not assigned: no verified published point scheme (see conventionNotes). */
  points: null;
}
