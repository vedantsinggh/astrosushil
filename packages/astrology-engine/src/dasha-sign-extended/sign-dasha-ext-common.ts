import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { normalizeDegree } from '../coordinates/angular-math';
import type { AstroChart } from '../chart/astro-chart.types';
import { MS_PER_YEAR } from '../dasha/dasha-calculator';
import { SignDashaDirection, SignDashaYearsEvidence } from '../dasha/dasha.types';
import { STHIRA_RASHI_YEARS } from '../dasha/sthira-dasha-calculator';
import { buildPeriodBase, buildSubPeriods, PeriodTreeContext } from '../dasha/period-tree-builder';
import {
  compareSignStrength,
  computeSignDashaYears,
  getJaiminiSignLords,
  isOddFooted,
  jaiminiSignAspects,
  occupantsOf,
  signAt,
} from '../dasha/jaimini-sign-dasha-utils';
import { SignDashaExtPeriod, SignDashaExtSreeLagna, SignDashaExtYearsRule } from './sign-dasha-ext.types';

/**
 * Shared, table-driven helpers for the extra sign dashas. Each helper implements one published
 * rule; the citation is on the helper. Sign indices are 1 (Aries) .. 12 (Pisces).
 */

const NAKSHATRA_SPAN = 360 / 27;

/** Offsets of the kendradi movement: kendras (1,4,7,10), panapharas (2,5,8,11), apoklimas (3,6,9,12). */
export const SIGN_DASHA_EXT_KENDRADI_OFFSETS = [0, 3, 6, 9, 1, 4, 7, 10, 2, 5, 8, 11];
/** Offsets of the trinal movement: trines of the 1st, then of the 2nd, 3rd and 4th signs. */
export const SIGN_DASHA_EXT_TRIKONA_OFFSETS = [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11];

/**
 * Antardasha offsets by the modality of the sign they start from, BPHS ch. 51 v. 7-12
 * (R. Santhanam translation, vol. 2 p. 623): movable -> consecutive signs; fixed -> every 6th sign;
 * dual -> kendras of the sign, then kendras of its 5th, then kendras of its 9th.
 */
export const SIGN_DASHA_EXT_ANTARDASHA_OFFSETS: Record<'CHARA' | 'STHIRA' | 'DVISVABHAVA', number[]> = {
  CHARA: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  STHIRA: [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7],
  DVISVABHAVA: [0, 3, 6, 9, 4, 7, 10, 1, 8, 11, 2, 5],
};

export function signDashaExtSignName(sign: number): string {
  return RASHIS[sign - 1].englishName;
}

export function signDashaExtSequence(start: number, offsets: number[], direction: SignDashaDirection): number[] {
  const step = direction === 'FORWARD' ? 1 : -1;
  return offsets.map((o) => signAt(start, o * step));
}

/** Odd sign (Ar, Ge, Le, Li, Sg, Aq) -> FORWARD, even sign -> REVERSE. */
export function signDashaExtParityDirection(sign: number): SignDashaDirection {
  return sign % 2 === 1 ? 'FORWARD' : 'REVERSE';
}

/**
 * The Saturn / Ketu exceptions of P.V.R. Narasimha Rao, "Vedic Astrology: An Integrated Approach"
 * (VAIA) 18.2.1 and 19.2(2): Saturn in the seed sign makes the order forward; otherwise Ketu in the
 * seed sign reverses the natural order. Saturn is checked first when both are present (the book
 * gives no rule for that case; recorded in conventionNotes by the callers).
 */
export function signDashaExtSaturnKetuDirection(
  chart: AstroChart,
  seed: number,
  natural: SignDashaDirection,
  applyKetu: boolean
): { direction: SignDashaDirection; reason: string } {
  const occ = occupantsOf(chart, seed);
  const name = signDashaExtSignName(seed);
  let reason = `${name} is an ${seed % 2 === 1 ? 'odd' : 'even'} sign, so the natural order is ${natural === 'FORWARD' ? 'forward' : 'backward'}`;
  let direction = natural;
  if (occ.includes(PlanetSymbol.SATURN)) {
    direction = 'FORWARD';
    reason += '; Saturn occupies it, so the order is forward (Saturn exception)';
  } else if (applyKetu && occ.includes(PlanetSymbol.KETU)) {
    direction = natural === 'FORWARD' ? 'REVERSE' : 'FORWARD';
    reason += '; Ketu occupies it, so the order is reversed (Ketu exception)';
  }
  return { direction, reason: reason + '.' };
}

/** Stronger of two signs by the engine's Jaimini Rasi Bala rules (JSD-007); a full tie keeps `a`. */
export function signDashaExtStronger(chart: AstroChart, a: number, b: number): { sign: number; rule: string } {
  const cmp = compareSignStrength(chart, a, b);
  return { sign: cmp.winner === 'A' ? a : b, rule: cmp.decidingRule };
}

/**
 * Sree Lagna, VAIA 5.7: the fraction of its nakshatra already traversed by the Moon, taken of the
 * whole zodiac (360 degrees), added to the Lagna longitude.
 */
export function signDashaExtSreeLagna(lagnaLongitude: number, moonLongitude: number): SignDashaExtSreeLagna {
  const moon = normalizeDegree(moonLongitude);
  const traversed = (moon - Math.floor(moon / NAKSHATRA_SPAN) * NAKSHATRA_SPAN) / NAKSHATRA_SPAN;
  const longitude = normalizeDegree(lagnaLongitude + traversed * 360);
  const signIndex = Math.min(12, Math.floor(longitude / 30) + 1);
  return {
    longitude,
    signIndex,
    signName: signDashaExtSignName(signIndex),
    degreeInSign: longitude - (signIndex - 1) * 30,
    moonNakshatraFractionTraversed: traversed,
    formula: 'Lagna + 360 deg x (fraction of its nakshatra traversed by the Moon) (VAIA 5.7)',
  };
}

/**
 * Antardasha order of a sign, BPHS ch. 51 v. 5-12 (Santhanam): 12 equal parts starting from the
 * Dasa sign or the 7th from it, whichever is stronger; onwards if the Dasa sign is odd, in reverse
 * if it is even; the movement follows the modality of the starting sign. Applied again to each
 * Antardasha sign for Pratyantardashas ("calculated in the same manner", v. 5).
 */
export function signDashaExtAntardashaOrder(chart: AstroChart, dasaSign: number): number[] {
  const start = signDashaExtStronger(chart, dasaSign, signAt(dasaSign, 6)).sign;
  const offsets = SIGN_DASHA_EXT_ANTARDASHA_OFFSETS[RASHIS[start - 1].modality];
  return signDashaExtSequence(start, offsets, signDashaExtParityDirection(dasaSign));
}

/**
 * Drig Dasa order, BPHS ch. 46 v. 185-187 (Santhanam / G.C. Sharma): the 9th, 10th and 11th signs
 * from Lagna, each followed by the three signs it aspects (Jaimini rasi drishti). The aspected
 * signs are taken counting backwards from a movable sign, onwards from a fixed sign, and onwards
 * from an odd dual sign / backwards from an even dual sign.
 */
export function signDashaExtDrigSequence(lagna: number): { sequence: number[]; groups: { sign: number; direction: SignDashaDirection }[] } {
  const sequence: number[] = [];
  const groups: { sign: number; direction: SignDashaDirection }[] = [];
  for (const house of [9, 10, 11]) {
    const s = signAt(lagna, house - 1);
    const m = RASHIS[s - 1].modality;
    const direction: SignDashaDirection =
      m === 'CHARA' ? 'REVERSE' : m === 'STHIRA' ? 'FORWARD' : s % 2 === 1 ? 'FORWARD' : 'REVERSE';
    const step = direction === 'FORWARD' ? 1 : -1;
    sequence.push(s);
    for (let k = 1; k < 12; k++) {
      const t = signAt(s, k * step);
      if (jaiminiSignAspects(s, t)) sequence.push(t);
    }
    groups.push({ sign: s, direction });
  }
  return { sequence, groups };
}

export interface SignDashaExtMahadashaSpec {
  sign: number;
  cycle: number;
  years: number;
  evidence?: SignDashaYearsEvidence;
}

/**
 * Mahadasha specs for a sign sequence. CHARA_NARAYANA_COUNT: count to the lord forward from an
 * odd-footed sign, backward otherwise (VAIA 18.2.2 / BPHS ch. 46 Chara Dasa; computed by the
 * engine's computeSignDashaYears), second cycle = 12 - first-cycle years with 0-year signs skipped
 * (VAIA 18.2.2 special note 2). STHIRA_FIXED: 7/8/9 years (BPHS ch. 46 v. 168), one cycle.
 */
export function signDashaExtSpecs(
  chart: AstroChart,
  sequence: number[],
  rule: SignDashaExtYearsRule
): SignDashaExtMahadashaSpec[] {
  if (rule === 'STHIRA_FIXED') {
    return sequence.map((sign) => ({ sign, cycle: 1, years: STHIRA_RASHI_YEARS[sign] }));
  }
  const specs: SignDashaExtMahadashaSpec[] = [];
  for (const cycle of [1, 2]) {
    for (const sign of sequence) {
      const evidence = computeSignDashaYears(chart, sign, isOddFooted(sign) ? 'FORWARD' : 'REVERSE', cycle);
      if (evidence.years > 0) specs.push({ sign, cycle, years: evidence.years, evidence });
    }
  }
  return specs;
}

/**
 * Builds the period tree. The first Mahadasha starts `elapsedAtBirthYears` before birth (0 for
 * systems that run their first sign in full from birth); sub-periods are 12 equal parts in the
 * BPHS ch. 51 order. Dates use the engine's shared period-tree builder (same semantics as Chara /
 * Narayana Dasa: periods before birth are flagged isBeforeBirth, the birth period is clipped).
 */
export function signDashaExtBuildTree(
  chart: AstroChart,
  specs: SignDashaExtMahadashaSpec[],
  birthMs: number,
  maxLevel: number,
  elapsedAtBirthYears: number
): SignDashaExtPeriod[] {
  const decorate = (sign: number, base: ReturnType<typeof buildPeriodBase>): SignDashaExtPeriod => {
    const def = RASHIS[sign - 1];
    return { ...base, signIndex: sign, rashiIndex: sign, signName: def.englishName, sanskritName: def.sanskritName };
  };
  const lordOf = (sign: number) => getJaiminiSignLords(sign)[0];
  const orderCache = new Map<number, number[]>();
  const ctx: PeriodTreeContext<number, SignDashaExtPeriod> = {
    birthMs,
    maxLevel,
    childrenOf: (parent) => {
      let order = orderCache.get(parent);
      if (!order) {
        order = signDashaExtAntardashaOrder(chart, parent);
        orderCache.set(parent, order);
      }
      return order.map((key) => ({ key, weight: 1 }));
    },
    decorate,
  };

  const out: SignDashaExtPeriod[] = [];
  let cursorMs = Math.round(birthMs - elapsedAtBirthYears * MS_PER_YEAR);
  specs.forEach((spec, i) => {
    const endMs = Math.round(cursorMs + spec.years * MS_PER_YEAR);
    const lord = spec.evidence?.lordUsed ?? lordOf(spec.sign);
    const md = decorate(spec.sign, buildPeriodBase(1, i + 1, lord, cursorMs, endMs, spec.years, birthMs));
    md.cycle = spec.cycle;
    if (spec.evidence) md.yearsEvidence = spec.evidence;
    const subs = buildSubPeriods(ctx, spec.sign, cursorMs, spec.years, 2, lordOf);
    if (subs.length > 0) md.subPeriods = subs;
    out.push(md);
    cursorMs = endMs;
  });
  return out;
}
