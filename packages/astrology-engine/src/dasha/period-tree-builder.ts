import { MS_PER_YEAR } from './dasha-calculator';
import {
  CurrentDashaPeriod,
  CurrentDashaPeriodSummary,
  ExtendedDashaPeriodBase,
} from './dasha.types';

/**
 * Shared, deterministic period-tree helpers for the Yogini, Chara, Narayana and Kalachakra
 * calculators. The astrology (which child follows which, and with what weight) is supplied by
 * each calculator; this module only does the date arithmetic and the active-period lookup.
 *
 * Date semantics are documented on ExtendedDashaPeriodBase (dasha.types.ts).
 */

export interface ChildSpec<K> {
  key: K;
  /** Relative weight; the child's nominal years = parentYears * weight / sum(weights). */
  weight: number;
}

export interface PeriodTreeContext<K, P extends ExtendedDashaPeriodBase & { subPeriods?: P[] }> {
  birthMs: number;
  maxLevel: number;
  /** Children of a period identified by `key` at `childLevel` (2 = Antardasha, 3 = Pratyantar). */
  childrenOf: (parentKey: K, childLevel: number) => ChildSpec<K>[];
  /** Builds the system-specific node from the common base fields. */
  decorate: (key: K, base: ExtendedDashaPeriodBase) => P;
}

/** Builds common base fields for a period with nominal bounds [nominalStartMs, nominalEndMs). */
export function buildPeriodBase(
  level: number,
  order: number,
  lord: ExtendedDashaPeriodBase['lord'],
  nominalStartMs: number,
  nominalEndMs: number,
  nominalYears: number,
  birthMs: number
): ExtendedDashaPeriodBase {
  const isBeforeBirth = nominalEndMs <= birthMs;
  const spansBirth = nominalStartMs <= birthMs && birthMs < nominalEndMs;
  const activeStartMs = spansBirth ? birthMs : nominalStartMs;
  // Unclipped periods report their exact nominal length (avoids millisecond-rounding drift).
  const durationYears = isBeforeBirth ? 0 : spansBirth ? (nominalEndMs - activeStartMs) / MS_PER_YEAR : nominalYears;

  return {
    level,
    order,
    lord,
    startDateIso: new Date(activeStartMs).toISOString(),
    endDateIso: new Date(nominalEndMs).toISOString(),
    durationYears,
    nominalYears,
    nominalStartDateIso: new Date(nominalStartMs).toISOString(),
    nominalEndDateIso: new Date(nominalEndMs).toISOString(),
    isBirthDasha: spansBirth,
    isBeforeBirth,
  };
}

/**
 * Recursively builds the complete classical sequence of sub-periods of one parent.
 * The last child always ends exactly at the parent's nominal end (no rounding drift).
 */
export function buildSubPeriods<K, P extends ExtendedDashaPeriodBase & { subPeriods?: P[] }>(
  ctx: PeriodTreeContext<K, P>,
  parentKey: K,
  parentNominalStartMs: number,
  parentNominalYears: number,
  childLevel: number,
  lordOf: (key: K) => ExtendedDashaPeriodBase['lord']
): P[] {
  if (childLevel > ctx.maxLevel) return [];
  const specs = ctx.childrenOf(parentKey, childLevel);
  const totalWeight = specs.reduce((sum, s) => sum + s.weight, 0);
  if (specs.length === 0 || totalWeight <= 0) return [];

  const parentEndMs = Math.round(parentNominalStartMs + parentNominalYears * MS_PER_YEAR);
  const children: P[] = [];
  let cursorMs = parentNominalStartMs;

  specs.forEach((spec, i) => {
    const years = (parentNominalYears * spec.weight) / totalWeight;
    const endMs = i === specs.length - 1 ? parentEndMs : Math.round(cursorMs + years * MS_PER_YEAR);
    const base = buildPeriodBase(childLevel, i + 1, lordOf(spec.key), cursorMs, endMs, years, ctx.birthMs);
    const node = ctx.decorate(spec.key, base);
    const grandChildren = buildSubPeriods(ctx, spec.key, cursorMs, years, childLevel + 1, lordOf);
    if (grandChildren.length > 0) node.subPeriods = grandChildren;
    children.push(node);
    cursorMs = endMs;
  });

  return children;
}

type LabelledPeriod = ExtendedDashaPeriodBase & {
  subPeriods?: LabelledPeriod[];
  yoginiName?: string;
  signName?: string;
  signIndex?: number;
};

function summarize(p: LabelledPeriod): CurrentDashaPeriodSummary {
  const summary: CurrentDashaPeriodSummary = {
    level: p.level,
    lord: p.lord,
    label: p.yoginiName ?? p.signName ?? p.lord,
    startDateIso: p.startDateIso,
    endDateIso: p.endDateIso,
    nominalYears: p.nominalYears,
  };
  if (typeof p.signIndex === 'number') summary.signIndex = p.signIndex;
  if (p.signName) summary.signName = p.signName;
  return summary;
}

/** Marks isActive on every node and returns the active hierarchy at targetDate (or undefined). */
export function resolveCurrentPeriod(
  periods: LabelledPeriod[],
  targetDate: Date | string | undefined
): CurrentDashaPeriod | undefined {
  if (targetDate === undefined) return undefined;
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const targetMs = target.getTime();
  if (isNaN(targetMs)) return undefined;

  const chain: LabelledPeriod[] = [];
  const mark = (list: LabelledPeriod[] | undefined): void => {
    if (!list) return;
    let found: LabelledPeriod | undefined;
    for (const p of list) {
      const s = new Date(p.startDateIso).getTime();
      const e = new Date(p.endDateIso).getTime();
      const active = !p.isBeforeBirth && targetMs >= s && targetMs < e;
      p.isActive = active;
      if (active && !found) found = p;
    }
    if (found) {
      chain.push(found);
      mark(found.subPeriods);
    }
  };
  mark(periods);

  if (chain.length === 0) return undefined;
  const labels = chain.map((p) => p.yoginiName ?? p.signName ?? p.lord);
  const current: CurrentDashaPeriod = {
    targetDateIso: target.toISOString(),
    mahadasha: summarize(chain[0]),
    path: labels,
    description: labels.join(' - '),
  };
  if (chain[1]) current.antardasha = summarize(chain[1]);
  if (chain[2]) current.pratyantardasha = summarize(chain[2]);
  return current;
}
