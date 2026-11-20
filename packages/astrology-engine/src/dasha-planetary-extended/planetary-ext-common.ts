import { PlanetSymbol } from '../planets/planet.types';
import type { AstroChart } from '../chart/astro-chart.types';
import { MS_PER_YEAR } from '../dasha/dasha-calculator';
import { buildPeriodBase, buildSubPeriods, PeriodTreeContext, resolveCurrentPeriod } from '../dasha/period-tree-builder';
import { CurrentDashaPeriod } from '../dasha/dasha.types';
import { PlanetaryExtDashaPeriod } from './planetary-ext.types';

/** Natal Moon longitude and UTC birth instant of a chart (shared input validation). */
export function planetaryExtChartInputs(chart: AstroChart, systemName: string): { moonLongitude: number; birth: Date } {
  const moon = chart.planets[PlanetSymbol.MOON];
  if (!moon || typeof moon.longitude !== 'number') {
    throw new Error(`${systemName} requires the natal Moon longitude.`);
  }
  const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
  if (!birthIso) throw new Error(`${systemName} requires the normalized UTC birth instant.`);
  return { moonLongitude: moon.longitude, birth: new Date(birthIso) };
}

export function clampPlanetaryExtLevel(maxLevel: number | undefined): number {
  return Math.max(1, Math.min(3, Math.trunc(maxLevel ?? 3)));
}

/**
 * Builds a planetary dasha sequence with the BPHS sub-period rule (G.C. Sharma tr. ch. 51 v.1-2;
 * Santhanam ch. 46 notes): an antardasha starts with the dasha lord itself, follows the dasha order,
 * and lasts parentYears x lordYears / total years of the cycle. Pratyantardashas repeat the rule.
 *
 * @param order        Cyclic lord order of the system.
 * @param mdYears      Nominal Mahadasha years of each lord in this system.
 * @param subWeights   Weights for the sub-period rule (each lord's share of the cycle).
 * @param startIndex   Index in `order` of the first (birth) dasha.
 * @param elapsedYears Part of the first dasha elapsed before birth.
 * @param count        Number of Mahadashas to generate.
 */
export function buildPlanetaryExtSequence(params: {
  order: PlanetSymbol[];
  mdYears: (lord: PlanetSymbol) => number;
  subWeights: (lord: PlanetSymbol) => number;
  startIndex: number;
  elapsedYears: number;
  count: number;
  birthMs: number;
  maxLevel: number;
  decorate?: (lord: PlanetSymbol, node: PlanetaryExtDashaPeriod) => PlanetaryExtDashaPeriod;
}): PlanetaryExtDashaPeriod[] {
  const { order, mdYears, subWeights, startIndex, elapsedYears, count, birthMs, maxLevel } = params;
  const decorate = params.decorate ?? ((_l, n) => n);
  const n = order.length;
  const ctx: PeriodTreeContext<PlanetSymbol, PlanetaryExtDashaPeriod> = {
    birthMs,
    maxLevel,
    childrenOf: (parent) => {
      const i0 = order.indexOf(parent);
      return Array.from({ length: n }, (_, k) => {
        const lord = order[(i0 + k) % n];
        return { key: lord, weight: subWeights(lord) };
      });
    },
    decorate: (lord, base) => decorate(lord, { ...base }),
  };
  const lordOf = (l: PlanetSymbol) => l;

  const out: PlanetaryExtDashaPeriod[] = [];
  let cursorMs = Math.round(birthMs - elapsedYears * MS_PER_YEAR);
  for (let i = 0; i < count; i++) {
    const lord = order[(startIndex + i) % n];
    const years = mdYears(lord);
    const endMs = Math.round(cursorMs + years * MS_PER_YEAR);
    const md = ctx.decorate(lord, buildPeriodBase(1, i + 1, lord, cursorMs, endMs, years, birthMs));
    const subs = buildSubPeriods(ctx, lord, cursorMs, years, 2, lordOf);
    if (subs.length > 0) md.subPeriods = subs;
    out.push(md);
    cursorMs = endMs;
  }
  return out;
}

export function resolvePlanetaryExtCurrent(
  periods: PlanetaryExtDashaPeriod[],
  targetDate: Date | string | undefined
): CurrentDashaPeriod | undefined {
  return resolveCurrentPeriod(periods, targetDate);
}

/** Whole-sign house (1..12) of a sign counted from the Lagna sign. */
export function planetaryExtHouseFrom(lagnaSign: number, sign: number): number {
  return ((sign - lagnaSign + 12) % 12) + 1;
}
