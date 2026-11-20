/**
 * Interpretation registration (proposal §5).
 *
 * Runs the deterministic interpretation pipeline (`runInterpretation`, prediction-engine) after
 * the module's evidence contributors and registers every result as an `interp.*` evidence item,
 * so the LLM, the validators and the manifest see the same conclusions. Fail closed: a result
 * that cites a chart fact the registry does not hold throws `INTERPRETATION_UNKNOWN_FACT`.
 */
import { BirthTimeSensitivityCalculator, SadeSatiPeriodsCalculator, ShadbalaCalculator, YogaCalculator } from '@astro/astrology-engine';
import * as PredictionEngine from '@astro/prediction-engine';
import {
  CONFLICT_POLICY,
  InterpretationInput,
  InterpretationPack,
  InterpretationResult,
  InterpretationSet,
  InterpretationSetSchema,
  isInterpretationId,
  PlanetName,
  RunInterpretation,
  ShadbalaInput,
  TimeRelevance,
} from '@astro/prediction-engine';
import { AddEvidence, EvidenceRegistry, planetName } from '../evidence/evidence-registry';
import { ChartSnapshot, formatBusinessDate } from '../snapshot/chart-snapshot';

export interface InterpretationIndex {
  packId: string;
  set: InterpretationSet;
  byId: ReadonlyMap<string, InterpretationResult>;
}

export class InterpretationUnknownFactError extends Error {
  readonly code = 'INTERPRETATION_UNKNOWN_FACT';
  constructor(resultId: string, refs: string[]) {
    super(`INTERPRETATION_UNKNOWN_FACT: ${resultId} cites chart facts not in the evidence registry: ${refs.join(', ')}`);
  }
}

export class InterpretationUnavailableError extends Error {
  readonly code = 'INTERPRETATION_UNAVAILABLE';
  constructor() {
    super('INTERPRETATION_UNAVAILABLE: @astro/prediction-engine does not export runInterpretation');
  }
}

/**
 * `runInterpretation` from prediction-engine, looked up at runtime so report-engine builds before
 * the pipeline lands (Wave 1). Once `pipeline.ts` is exported this always returns it.
 */
export function resolveRunInterpretation(): RunInterpretation | undefined {
  const candidate = (PredictionEngine as unknown as Record<string, unknown>).runInterpretation;
  return typeof candidate === 'function' ? (candidate as RunInterpretation) : undefined;
}

function timeText(t: TimeRelevance): string {
  switch (t.kind) {
    case 'natal': return 'natal';
    // IST calendar dates in the one human format (audit F24).
    case 'period': return `period ${formatBusinessDate(t.startIso)} to ${formatBusinessDate(t.endIso)}`;
    case 'current': return `current as of ${formatBusinessDate(t.asOfIso)}`;
  }
}

/** `'<conclusion.text> [<strengthClass>; <time>; <qualification>] — because <explanation>'` (A1 contract). */
export function interpretationLabel(r: InterpretationResult): string {
  const q = r.qualification.length ? r.qualification.join(', ') : 'no qualification';
  return `${r.conclusion.text} [${r.strengthClass}; ${timeText(r.timeRelevance)}; ${q}] — because ${r.explanation}`;
}

/**
 * Validates the set and registers each result. Every chartRef must already be a registry item
 * (or an earlier interp result). Returns the index attached to the registry.
 */
export function registerInterpretationSet(add: AddEvidence, registry: EvidenceRegistry, set: InterpretationSet, packId: string): InterpretationIndex {
  const parsed = InterpretationSetSchema.parse(set);
  const byId = new Map<string, InterpretationResult>();
  const results = [...parsed.results].sort((a, b) => a.id.localeCompare(b.id));
  const resultIds = new Set(results.map((r) => r.id));
  for (const r of results) {
    const unknown = r.chartRefs.filter((ref) => !registry.has(ref) && !resultIds.has(ref));
    if (unknown.length) throw new InterpretationUnknownFactError(r.id, unknown);
    if (!isInterpretationId(r.id)) throw new Error(`INTERPRETATION_ID_INVALID: ${r.id}`);
  }
  for (const r of results) {
    add(r.id, 'interpretation', interpretationLabel(r), r.conclusion.code, `interpretation:${r.ruleIds.join(',')}`);
    byId.set(r.id, r);
  }
  const index: InterpretationIndex = { packId, set: parsed, byId };
  registry.attachInterpretation(index);
  return index;
}

/** Optional precomputed inputs (the engine calculators are async or heavy). Missing ones degrade. */
export type InterpretationExtras = Pick<InterpretationInput, 'birthTimeSensitivity' | 'shadbala' | 'sadeSati'> & {
  /** Detected + formed-but-cancelled yogas (with Shadbala-filled assessments); replaces `snapshot.yogas` for the stages. */
  yogas?: InterpretationInput['yogas'];
};

export interface ExtrasOptions {
  /** Horizon of the Sade Sati periods from the report date (years; default 12). */
  transitYears?: number;
}

/**
 * Precomputes the optional pipeline inputs from the snapshot (the engine calculators are async or
 * heavy): Shadbala (BPHS ch. 27), birth-time sensitivity (timed charts), Sade Sati periods over
 * [asOf, asOf + transitYears], and the yoga list including formed-but-cancelled yogas with
 * Shadbala-filled assessments. A calculator failure leaves its field absent (the stage then
 * degrades as the contract describes).
 */
export async function buildInterpretationExtras(snapshot: ChartSnapshot, opts: ExtrasOptions = {}): Promise<InterpretationExtras> {
  const extras: InterpretationExtras = {};
  try {
    const report = new ShadbalaCalculator().calculate(snapshot.raw);
    const shadbala: Partial<Record<PlanetName, ShadbalaInput>> = {};
    for (const p of Object.values(report.planets)) {
      if (!p) continue;
      shadbala[planetName(p.planet)] = { totalRupas: p.totalRupas, requiredRupas: p.minimumRequirementRupas };
    }
    extras.shadbala = shadbala;
  } catch {
    // Shadbala unavailable: no Shadbala conditions are emitted.
  }
  try {
    const report = new YogaCalculator().evaluateYogas(snapshot.raw, { computeShadbala: true });
    extras.yogas = [...(report.detectedYogas ?? []), ...(report.formedButCancelledYogas ?? [])];
  } catch {
    // keep snapshot.yogas
  }
  try {
    const years = opts.transitYears ?? 12;
    const start = snapshot.asOfIso;
    const end = new Date(Date.parse(start) + years * 365.25 * 86400000).toISOString();
    const moon = snapshot.natal.planets.find((p) => String(p.name).toUpperCase() === 'MOON')!;
    extras.sadeSati = await new SadeSatiPeriodsCalculator().calculate({ natalMoonLongitude: moon.absoluteDegree, startIso: start, endIso: end });
  } catch {
    // stages derive the Saturn-from-Moon phase from transits.SATURN
  }
  if (snapshot.subject.timeOfBirth) {
    try {
      extras.birthTimeSensitivity = await new BirthTimeSensitivityCalculator().calculate({
        birthUtcIso: snapshot.natal.calculation.normalizedTime.utcIsoString,
        latitude: snapshot.subject.latitude,
        longitude: snapshot.subject.longitude,
      });
    } catch {
      // e.g. polar latitudes: no boundary-sensitivity qualification.
    }
  }
  return extras;
}

export function interpretationInputFor(snapshot: ChartSnapshot, extras: InterpretationExtras = {}): InterpretationInput {
  const base: InterpretationInput = snapshot;
  return { ...base, ...extras };
}

export interface RunAndRegisterOptions {
  pack: InterpretationPack;
  extras?: InterpretationExtras;
  /** Injected runner (tests); defaults to prediction-engine `runInterpretation`. */
  run?: RunInterpretation;
}

/** The registry contributor: runs the pack on the snapshot and registers the results. */
export function runAndRegisterInterpretations(add: AddEvidence, registry: EvidenceRegistry, opts: RunAndRegisterOptions): InterpretationIndex {
  const run = opts.run ?? resolveRunInterpretation();
  if (!run) throw new InterpretationUnavailableError();
  const set = run(interpretationInputFor(registry.snapshot, opts.extras), registry, opts.pack, CONFLICT_POLICY);
  return registerInterpretationSet(add, registry, set, opts.pack.id);
}

/** Contributor factory for `EvidenceRegistryOptions.contributors` (runs after the module's). */
export function interpretationContributor(opts: RunAndRegisterOptions): (add: AddEvidence, registry: EvidenceRegistry) => void {
  return (add, registry) => {
    runAndRegisterInterpretations(add, registry, opts);
  };
}
