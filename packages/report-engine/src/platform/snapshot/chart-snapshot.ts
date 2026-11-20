/**
 * Canonical chart snapshot.
 *
 * A snapshot is the single source of astrological truth for one report run.
 * It is computed exclusively by @astro/astrology-engine and is immutable once
 * built. Its ID is a hash of the inputs, conventions and engine version — never
 * of wall-clock time — so identical inputs always produce the same snapshot ID.
 */
import { createHash } from 'crypto';
import { computeSignPeriods, SignPeriod } from './transit-periods';
import {
  AstroChart,
  PlanetSymbol,
  AstrologyConfig,
  ASTROLOGY_ENGINE_VERSION,
  AshtakavargaCalculator,
  AshtakavargaResult,
  BirthDetails,
  ChartCalculator,
  DashaCalculator,
  DEFAULT_ASTROLOGY_CONFIG,
  NormalizedChart,
  normalizeAstroChart,
  VargaCalculator,
  VargaChart,
  VargaType,
  VimshottariDashaTree,
  YogaCalculator,
  YogaResult,
} from '@astro/astrology-engine';

export interface SubjectInput {
  /** Display name; used only at render time, never sent to an LLM. */
  name: string;
  gender?: 'male' | 'female' | 'other';
  /** YYYY-MM-DD local date of birth. */
  dateOfBirth: string;
  /** HH:mm or HH:mm:ss local time of birth. Required for timed reports. */
  timeOfBirth?: string;
  placeName: string;
  latitude: number;
  longitude: number;
  /** IANA timezone, e.g. Asia/Kolkata. */
  timezone: string;
  /** Authoritative resolved birth instant (ISO UTC) when the profile stores one; wins over local time + zone. */
  utcDateTime?: string;
  /** Exact UTC offset in seconds at birth, when known. */
  timezoneOffsetSeconds?: number;
  /** DST disambiguation for local times that occur twice ('earlier' | 'later'). */
  disambiguation?: 'earlier' | 'later';
  /** Baby Name report: names the parents are considering (checked locally; never sent to the LLM). */
  candidateNames?: string[];
}

export interface ChartSnapshot {
  snapshotId: string;
  /** Opaque, privacy-safe reference to the subject (hash, not the name). */
  subjectRef: string;
  subject: SubjectInput;
  engineVersion: string;
  conventions: Record<string, string>;
  /**
   * Conventions are recorded as provisional until the client signs off
   * (docs/astrology-spec.md §"awaiting confirmation").
   */
  conventionsProvisional: boolean;
  /** Date used for "current" period evaluation (dasha now, transits now). */
  asOfIso: string;
  raw: AstroChart;
  natal: NormalizedChart;
  vargas: Partial<Record<VargaType, VargaChart>>;
  vimshottari: VimshottariDashaTree;
  ashtakavarga: AshtakavargaResult;
  yogas: YogaResult[];
  /** Sign periods of slow planets from asOf, for `transitYears` years. */
  transits: Record<'JUPITER' | 'SATURN', SignPeriod[]>;
}

export class SnapshotInputError extends Error {
  constructor(message: string) {
    super(`SNAPSHOT_INPUT_INVALID: ${message}`);
  }
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(',')}}`;
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function parseSubject(subject: SubjectInput, requireTime: boolean): BirthDetails {
  if (!subject.name || !subject.name.trim()) throw new SnapshotInputError('name is required');
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(subject.dateOfBirth || '');
  if (!dm) throw new SnapshotInputError('dateOfBirth must be YYYY-MM-DD');
  if (!Number.isFinite(subject.latitude) || !Number.isFinite(subject.longitude)) {
    throw new SnapshotInputError('latitude/longitude are required');
  }
  if (!subject.timezone) throw new SnapshotInputError('timezone is required');
  let hour = 12;
  let minute = 0;
  let second = 0;
  if (subject.timeOfBirth) {
    const tm = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(subject.timeOfBirth);
    if (!tm) throw new SnapshotInputError('timeOfBirth must be HH:mm[:ss]');
    hour = Number(tm[1]);
    minute = Number(tm[2]);
    second = Number(tm[3] || 0);
  } else if (requireTime) {
    throw new SnapshotInputError('timeOfBirth is required for this report');
  }
  return {
    name: subject.name,
    date: { year: Number(dm[1]), month: Number(dm[2]), day: Number(dm[3]) },
    time: { hour, minute, second },
    timezone: subject.timezone,
    latitude: subject.latitude,
    longitude: subject.longitude,
    placeName: subject.placeName,
    ...(subject.utcDateTime ? { utcDateTime: subject.utcDateTime } : {}),
    ...(typeof subject.timezoneOffsetSeconds === 'number' ? { timezoneOffsetSeconds: subject.timezoneOffsetSeconds } : {}),
    ...(subject.disambiguation ? { disambiguation: subject.disambiguation } : {}),
  };
}

/** India Standard Time offset (Asia/Kolkata, the business timezone; no DST). */
const IST_OFFSET_MS = 330 * 60 * 1000;

/**
 * The report's "as of" calendar date for an instant: the IST (business
 * timezone) calendar date, encoded as 00:00 UTC of that date, which is how
 * `asOf` represents a calendar date (`formatDate` prints its UTC fields).
 * An order placed at 04:22 IST on 20 Nov (22:52 UTC on 19 Nov) is as of 20 Nov.
 */
export function businessAsOfDate(instant: Date = new Date()): Date {
  const istDate = new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  return new Date(`${istDate}T00:00:00.000Z`);
}

/**
 * The IST (business timezone) calendar date of an instant, as YYYY-MM-DD (audit F24).
 * A bare YYYY-MM-DD input is already a calendar date and is returned unchanged.
 * Example: a dasha boundary at 2026-11-19T21:10Z is 2026-11-20 in IST.
 */
export function businessDateIso(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(Date.parse(iso) + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Human-readable IST calendar date, "20 Nov 2026": the one date format for career dasha and
 * transit labels and tables (audit F24). Same style as render/latex `formatDate`.
 */
export function formatBusinessDate(iso: string): string {
  return new Date(`${businessDateIso(iso)}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export interface BuildSnapshotOptions {
  /**
   * Evaluation date for current dasha/transits and the cover's "Generated on"
   * date: a calendar date at 00:00 UTC. Defaults to today's IST date
   * ([businessAsOfDate]).
   */
  asOf?: Date;
  config?: AstrologyConfig;
  vargas?: VargaType[];
  requireBirthTime?: boolean;
  /** Horizon for transit periods (default 12 years). */
  transitYears?: number;
}

export async function buildChartSnapshot(
  subject: SubjectInput,
  options: BuildSnapshotOptions = {}
): Promise<ChartSnapshot> {
  const config = options.config ?? DEFAULT_ASTROLOGY_CONFIG;
  const details = parseSubject(subject, options.requireBirthTime ?? true);
  const asOf = options.asOf ?? businessAsOfDate(new Date());
  const vargaTypes = options.vargas ?? ['D1', 'D9', 'D10'];

  const raw = await new ChartCalculator().calculateChart(details, config);
  // Remove wall-clock metadata so the snapshot content is reproducible.
  raw.metadata.calculationTimestampIso = 'deterministic';
  const natal = normalizeAstroChart(raw);
  natal.calculation.calculationTimestampIso = 'deterministic';

  const vargaCalc = new VargaCalculator();
  const vargas: Partial<Record<VargaType, VargaChart>> = {};
  for (const v of vargaTypes) vargas[v] = vargaCalc.calculateVarga(raw, v);

  const vimshottari = new DashaCalculator().calculateForChart(raw, { maxLevel: 2, targetDate: asOf });
  const ashtakavarga = new AshtakavargaCalculator().calculate(raw);
  const yogas = new YogaCalculator().evaluateYogas(raw).detectedYogas ?? [];

  const transitYears = options.transitYears ?? 12;
  const transits = {
    JUPITER: await computeSignPeriods(PlanetSymbol.JUPITER, asOf, transitYears),
    SATURN: await computeSignPeriods(PlanetSymbol.SATURN, asOf, transitYears),
  };

  const conventions: Record<string, string> = {
    zodiac: String(config.zodiacType),
    ayanamsa: String(config.ayanamsa),
    houseSystem: String(config.houseSystem),
    node: String(config.nodeCalculation),
    mode: String(config.planetaryCalculationMode),
    dasha: String(config.dashaSystem),
  };

  const identity = {
    dateOfBirth: subject.dateOfBirth,
    timeOfBirth: subject.timeOfBirth ?? null,
    latitude: subject.latitude,
    longitude: subject.longitude,
    timezone: subject.timezone,
    gender: subject.gender ?? null,
    utcDateTime: subject.utcDateTime ?? null,
    disambiguation: subject.disambiguation ?? null,
  };
  const snapshotId = sha256(
    stableStringify({ identity, conventions, engine: ASTROLOGY_ENGINE_VERSION, vargaTypes, asOf: asOf.toISOString(), transitYears })
  ).slice(0, 32);
  const subjectRef = 'subj_' + sha256(stableStringify({ ...identity, name: subject.name.trim().toLowerCase() })).slice(0, 20);

  return {
    snapshotId,
    subjectRef,
    subject,
    engineVersion: ASTROLOGY_ENGINE_VERSION,
    conventions,
    conventionsProvisional: true,
    asOfIso: asOf.toISOString(),
    raw,
    natal,
    vargas,
    vimshottari,
    ashtakavarga,
    yogas,
    transits,
  };
}
