import { PlanetSymbol } from '../planets/planet.types';
import { BirthDetails } from '../input/birth-details';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { VarshaphalaCalculator } from '../varshaphala/varshaphala-calculator';
import { AnnualLocationInput } from '../varshaphala/varshaphala.types';
import type { AstroChart } from '../chart/astro-chart.types';
import {
  PLANETARY_EXT_PROVISIONAL_LABEL,
  PatyayiniDashaResult,
  PatyayiniInputPoint,
  PatyayiniKey,
  PatyayiniPeriod,
  PatyayiniRow,
} from './planetary-ext.types';

export const PATYAYINI_SOURCE =
  'Patyayini dasa of the Tajaka writers (Tajika Neelakanthi tradition), krisamsa/patyamsa procedure as stated in ' +
  'P.V.R. Narasimha Rao, "Vedic Astrology: An Integrated Approach", ch. 30.3 (Patyayini Dasa), steps (1)-(4) and Table 75.';

/** Lagna + the seven grahas; Rahu and Ketu are excluded (standard krisamsa method). */
export const PATYAYINI_POINTS: PatyayiniKey[] = [
  'LAGNA',
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
];

const MS_PER_DAY = 86400000;

/**
 * Steps (1)-(3): sort by krisamsa (degrees advanced in the sign) ascending; the patyamsa of the first is
 * its own krisamsa, of every other the difference from the krisamsa just below it; each dasha's share
 * is patyamsa / sum(patyamsas) (the sum equals the largest krisamsa). Ties keep PATYAYINI_POINTS order.
 */
export function patyayiniRows(points: PatyayiniInputPoint[]): PatyayiniRow[] {
  const rank = (k: PatyayiniKey) => PATYAYINI_POINTS.indexOf(k);
  const sorted = [...points].sort((a, b) => a.degreeInSign - b.degreeInSign || rank(a.key) - rank(b.key));
  const total = sorted.length > 0 ? sorted[sorted.length - 1].degreeInSign : 0;
  if (!(total > 0)) throw new Error('Patyayini dasha: the largest krisamsa must be positive.');
  let prev = 0;
  return sorted.map((p, i) => {
    const patyamsha = p.degreeInSign - prev;
    prev = p.degreeInSign;
    return { key: p.key, order: i + 1, krishamsha: p.degreeInSign, patyamsha, fraction: patyamsha / total };
  });
}

/**
 * Step (4) and the period tree: dashas in krisamsa order over [startMs, endMs); antardashas use the same
 * ratios and order, starting with the dasha's own point ("first antardasa is the same as dasa").
 */
export function buildPatyayiniPeriods(rows: PatyayiniRow[], startMs: number, endMs: number, maxLevel = 2): PatyayiniPeriod[] {
  const level = Math.max(1, Math.min(3, Math.trunc(maxLevel)));
  const build = (startKeyIdx: number, s: number, e: number, lvl: number): PatyayiniPeriod[] => {
    const out: PatyayiniPeriod[] = [];
    let cursor = s;
    const n = rows.length;
    for (let k = 0; k < n; k++) {
      const row = rows[(startKeyIdx + k) % n];
      const end = k === n - 1 ? e : Math.round(cursor + (e - s) * row.fraction);
      const node: PatyayiniPeriod = {
        level: lvl,
        order: k + 1,
        key: row.key,
        lord: row.key,
        fraction: row.fraction,
        days: ((e - s) * row.fraction) / MS_PER_DAY,
        startDateIso: new Date(cursor).toISOString(),
        endDateIso: new Date(end).toISOString(),
      };
      if (lvl < level) node.subPeriods = build((startKeyIdx + k) % n, cursor, end, lvl + 1);
      out.push(node);
      cursor = end;
    }
    return out;
  };
  return build(0, startMs, endMs, 1);
}

export function markPatyayiniActive(periods: PatyayiniPeriod[], target: Date | string | undefined): PatyayiniKey[] | undefined {
  if (target === undefined) return undefined;
  const t = new Date(target).getTime();
  if (Number.isNaN(t)) return undefined;
  const path: PatyayiniKey[] = [];
  let list: PatyayiniPeriod[] | undefined = periods;
  while (list && list.length > 0) {
    let found: PatyayiniPeriod | undefined;
    for (const p of list) {
      const active = !found && t >= Date.parse(p.startDateIso) && t < Date.parse(p.endDateIso) && p.days > 0;
      p.isActive = active;
      if (active) found = p;
    }
    if (!found) break;
    path.push(found.key);
    list = found.subPeriods;
  }
  return path.length > 0 ? path : undefined;
}

/** Krisamsa inputs from a (Tajika annual) chart: Lagna + seven grahas, degree within sign. */
export function patyayiniPointsFromChart(chart: AstroChart): PatyayiniInputPoint[] {
  if (!chart.ascendant) throw new Error('Patyayini dasha requires the annual Lagna.');
  const out: PatyayiniInputPoint[] = [{ key: 'LAGNA', degreeInSign: chart.ascendant.degreeInRashi }];
  for (const k of PATYAYINI_POINTS) {
    if (k === 'LAGNA') continue;
    const pos = chart.planets[k];
    if (!pos) throw new Error(`Patyayini dasha requires ${k}.`);
    out.push({ key: k, degreeInSign: pos.degreeInRashi });
  }
  return out;
}

export interface PatyayiniOptions {
  targetYear: number;
  annualLocation?: AnnualLocationInput;
  /** 1 = dashas only, 2 = with antardashas (default), 3 = with pratyantardashas. */
  maxLevel?: number;
  targetDate?: Date | string;
}

export class PatyayiniDashaCalculator {
  constructor(private readonly varshaphala: VarshaphalaCalculator = new VarshaphalaCalculator()) {}

  /** Patyayini dasha of the Tajika year beginning at the solar return of `targetYear`. */
  public async calculate(
    natalBirthDetails: BirthDetails,
    options: PatyayiniOptions,
    config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG
  ): Promise<PatyayiniDashaResult> {
    const vp = await this.varshaphala.calculateVarshaphala(
      natalBirthDetails,
      { targetYear: options.targetYear, annualLocation: options.annualLocation },
      config
    );
    const next = vp.nextSolarReturn;
    if (!next) throw new Error('Patyayini dasha requires the next solar return to bound the year.');
    const startMs = Date.parse(vp.solarReturn.solarReturnUtcIso);
    const endMs = Date.parse(next.solarReturnUtcIso);
    const rows = patyayiniRows(patyayiniPointsFromChart(vp.annualChart));
    const periods = buildPatyayiniPeriods(rows, startMs, endMs, options.maxLevel ?? 2);
    const activePath = markPatyayiniActive(periods, options.targetDate);
    const result: PatyayiniDashaResult = {
      dashaSystem: 'PATYAYINI',
      provisional: true,
      label: PLANETARY_EXT_PROVISIONAL_LABEL,
      source: PATYAYINI_SOURCE,
      conventionNotes: [
        'Points: Lagna and the seven grahas of the Tajika annual chart; Rahu and Ketu are excluded.',
        'Year: the interval between this solar return and the next (engine sidereal solar-return solver). Narasimha Rao scales to 365.2425 days; the difference is under a day over the year.',
        'Ties in krisamsa give a zero-length period and keep the fixed order Lagna, Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn.',
        'Antardashas use the same ratios and order, starting with the dasha\'s own point (step 4). Some authors use a 360-day Tajika year or include the nodes; not adopted.',
        'Annual location defaults to the birth place unless one is given.',
      ],
      targetYear: options.targetYear,
      solarReturnUtcIso: vp.solarReturn.solarReturnUtcIso,
      nextSolarReturnUtcIso: next.solarReturnUtcIso,
      yearLengthDays: (endMs - startMs) / MS_PER_DAY,
      annualLocation: vp.solarReturn.annualLocation,
      rows,
      periods,
    };
    if (activePath) result.activePath = activePath;
    return result;
  }
}
