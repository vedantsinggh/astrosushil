/**
 * Read-only inputs of the interpretation pipeline.
 *
 * `InterpretationInput` is the minimal structural view of report-engine's `ChartSnapshot`
 * (`packages/report-engine/src/platform/snapshot/chart-snapshot.ts`): a snapshot is
 * assignable to it without prediction-engine importing report-engine (no package cycle).
 * `FactView` is satisfied structurally by report-engine's `EvidenceRegistry`, so every
 * `chartRef` a stage emits is an ID the LLM and the validator already know.
 */
import type {
  AshtakavargaResult,
  BirthTimeSensitivityResult,
  NormalizedChart,
  SadeSatiPeriodsResult,
  VargaChart,
  VargaType,
  VimshottariDashaTree,
  YogaResult,
} from '@astro/astrology-engine';
import type { PlanetName } from './types';

// ---------------------------------------------------------------------------
// FactView (EvidenceRegistry, read-only)
// ---------------------------------------------------------------------------

/** Same union as report-engine `EvidenceValue`. */
export type FactValue = string | number | boolean | string[];

/** Subset of report-engine `EvidenceItem`. */
export interface FactItem {
  id: string;
  kind: string;
  label: string;
  value: FactValue;
  source: string;
}

export interface FactView {
  has(id: string): boolean;
  get(id: string): FactItem | undefined;
  /** Exact IDs and glob patterns (`*` matches any run of characters). */
  resolve(patterns: string[]): FactItem[];
}

// ---------------------------------------------------------------------------
// InterpretationInput (ChartSnapshot, structurally)
// ---------------------------------------------------------------------------

/** Same shape as report-engine `SignPeriod` (transit-periods.ts). `signIndex` is 1–12. */
export interface TransitSignPeriod {
  planet: string;
  sign: string;
  signIndex: number;
  startIso: string;
  endIso: string;
  enteredRetrograde: boolean;
}

/** Subset of report-engine `SubjectInput`. Name and place are deliberately absent. */
export interface InterpretationSubject {
  /** YYYY-MM-DD local date of birth. */
  dateOfBirth: string;
  /** HH:mm or HH:mm:ss; absent when the birth time is unknown. */
  timeOfBirth?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/** Shadbala per planet, precomputed by the caller (the snapshot does not carry it yet). */
export interface ShadbalaInput {
  totalRupas: number;
  requiredRupas: number;
}

export interface LifeStage {
  /** Completed years at asOf (birth date vs asOf calendar date). */
  ageYears: number;
  /** YYYY-MM-DD. */
  birthDate: string;
  /** YYYY-MM-DD (calendar date of asOf). */
  asOfDate: string;
}

export interface InterpretationInput {
  snapshotId: string;
  subject: InterpretationSubject;
  engineVersion: string;
  conventions: Record<string, string>;
  conventionsProvisional: boolean;
  /** "As of" calendar date at 00:00 UTC (report-engine `businessAsOfDate`). */
  asOfIso: string;
  natal: NormalizedChart;
  vargas: Partial<Record<VargaType, VargaChart>>;
  vimshottari: VimshottariDashaTree;
  ashtakavarga: Pick<AshtakavargaResult, 'sav' | 'bav'>;
  yogas: YogaResult[];
  transits: Partial<Record<'JUPITER' | 'SATURN', TransitSignPeriod[]>>;

  // --- Optional precomputed inputs (absent from ChartSnapshot today) ---------
  /** Overrides the derived life stage (tests). */
  lifeStage?: LifeStage;
  /** Engine `BirthTimeSensitivityCalculator` output (async; computed by the caller). */
  birthTimeSensitivity?: BirthTimeSensitivityResult;
  /** Engine `SadeSatiPeriodsCalculator` output (async; computed by the caller). */
  sadeSati?: SadeSatiPeriodsResult;
  /** Shadbala per planet; when absent, Shadbala conditions are not emitted. */
  shadbala?: Partial<Record<PlanetName, ShadbalaInput>>;
}

// ---------------------------------------------------------------------------
// Life stage (age gating)
// ---------------------------------------------------------------------------

export class InterpretationInputError extends Error {
  constructor(message: string) {
    super(`INTERPRETATION_INPUT_INVALID: ${message}`);
  }
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

function parseDate(text: string, label: string): [number, number, number] {
  const m = DATE_RE.exec(text);
  if (!m) throw new InterpretationInputError(`${label} must start with YYYY-MM-DD`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** The parts of an `InterpretationInput` the life stage is derived from. */
export interface LifeStageSource {
  subject: Pick<InterpretationSubject, 'dateOfBirth'>;
  asOfIso: string;
  lifeStage?: LifeStage;
}

/** Completed years between two calendar dates (YYYY-MM-DD prefixes). Pure. */
export function completedYears(fromDate: string, toDate: string): number {
  const [y1, m1, d1] = parseDate(fromDate, 'fromDate');
  const [y2, m2, d2] = parseDate(toDate, 'toDate');
  let years = y2 - y1;
  if (m2 < m1 || (m2 === m1 && d2 < d1)) years -= 1;
  return years;
}

/**
 * Age at asOf from the local birth date and the asOf calendar date. Uses
 * `input.lifeStage` when the caller supplies one. No wall-clock time.
 */
export function deriveLifeStage(input: LifeStageSource): LifeStage {
  if (input.lifeStage) return input.lifeStage;
  const birthDate = input.subject.dateOfBirth.slice(0, 10);
  const asOfDate = input.asOfIso.slice(0, 10);
  const ageYears = completedYears(birthDate, asOfDate);
  if (ageYears < 0) throw new InterpretationInputError('asOf precedes the date of birth');
  return { ageYears, birthDate, asOfDate };
}

/** Completed years at an ISO instant (e.g. a dasha start), for age gating. */
export function ageAt(input: Pick<LifeStageSource, 'subject'>, iso: string): number {
  return completedYears(input.subject.dateOfBirth.slice(0, 10), iso.slice(0, 10));
}
