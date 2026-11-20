import { PlanetSymbol, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { isExalted, isDebilitated } from '../planets/planetary-dignity';
import { RASHIS, getRashiIndex, getDegreeInRashi } from '../zodiac/rashi';
import type { AstroChart } from '../chart/astro-chart.types';
import { SignDashaDirection, SignDashaYearsEvidence } from './dasha.types';

/**
 * Shared Jaimini sign-dasha rules used by Chara (K.N. Rao) and Narayana Dasha.
 * Every rule here is logged in docs/report-system/decisions/engine-extensions.md (JSD-xxx).
 */

/** Sign lords incl. Jaimini co-lords: Scorpio = Mars + Ketu, Aquarius = Saturn + Rahu (JSD-001). */
export function getJaiminiSignLords(signIndex: number): PlanetSymbol[] {
  if (signIndex === 8) return [PlanetSymbol.MARS, PlanetSymbol.KETU];
  if (signIndex === 11) return [PlanetSymbol.SATURN, PlanetSymbol.RAHU];
  return [RASHIS[signIndex - 1].ruler as PlanetSymbol];
}

/** "Odd-footed" (savya) signs: Aries, Taurus, Gemini, Libra, Scorpio, Sagittarius (JSD-002). */
export const ODD_FOOTED_SIGNS = [1, 2, 3, 7, 8, 9];
export function isOddFooted(signIndex: number): boolean {
  return ODD_FOOTED_SIGNS.includes(signIndex);
}

export function signAt(start: number, offset: number): number {
  return ((((start - 1 + offset) % 12) + 12) % 12) + 1;
}

/** Inclusive count from `from` to `to` (1..12) in the given direction. */
export function countSigns(from: number, to: number, direction: SignDashaDirection): number {
  return direction === 'FORWARD' ? ((to - from + 12) % 12) + 1 : ((from - to + 12) % 12) + 1;
}

export function planetSignIndex(chart: AstroChart, planet: PlanetSymbol): number | undefined {
  const pos = chart.planets[planet];
  if (!pos || typeof pos.longitude !== 'number') return undefined;
  return typeof pos.rashiIndex === 'number' ? pos.rashiIndex : getRashiIndex(pos.longitude);
}

function planetDegree(chart: AstroChart, planet: PlanetSymbol): number {
  const pos = chart.planets[planet];
  if (!pos) return 0;
  const deg = typeof pos.degreeInRashi === 'number' ? pos.degreeInRashi : getDegreeInRashi(pos.longitude);
  // Nodes move backwards through a sign, so their advancement is 30 - degree (JSD-004f).
  return planet === PlanetSymbol.RAHU || planet === PlanetSymbol.KETU ? 30 - deg : deg;
}

/** Occupants of a sign among the nine Vedic grahas (outer planets are never counted). */
export function occupantsOf(chart: AstroChart, signIndex: number): PlanetSymbol[] {
  return MANDATORY_VEDIC_PLANETS.filter((p) => planetSignIndex(chart, p) === signIndex);
}

function modalityWeight(signIndex: number): number {
  const m = RASHIS[signIndex - 1].modality;
  return m === 'DVISVABHAVA' ? 3 : m === 'STHIRA' ? 2 : 1;
}

/**
 * Jaimini Rashi Drishti: movable signs aspect the fixed signs except the adjacent one, fixed signs
 * aspect the movable signs except the adjacent one, dual signs aspect the other dual signs.
 */
export function jaiminiSignAspects(source: number, target: number): boolean {
  if (source === target) return false;
  const m = RASHIS[source - 1].modality;
  const t = RASHIS[target - 1].modality;
  if (m === 'CHARA') return t === 'STHIRA' && target !== signAt(source, 1);
  if (m === 'STHIRA') return t === 'CHARA' && target !== signAt(source, -1);
  return t === 'DVISVABHAVA';
}

export interface CoLordSelection {
  lord: PlanetSymbol;
  lordInOwnSign: boolean;
  reason?: string;
}

/**
 * Stronger lord of a dual-lordship sign (Scorpio, Aquarius) per K.N. Rao's Chara Dasha rules
 * (JSD-004). Single-lord signs return their lord.
 */
export function selectSignLord(chart: AstroChart, signIndex: number): CoLordSelection {
  const lords = getJaiminiSignLords(signIndex);
  if (lords.length === 1) {
    return { lord: lords[0], lordInOwnSign: planetSignIndex(chart, lords[0]) === signIndex };
  }
  const [a, b] = lords;
  const signA = planetSignIndex(chart, a);
  const signB = planetSignIndex(chart, b);
  const aIn = signA === signIndex;
  const bIn = signB === signIndex;

  if (aIn && bIn) return { lord: a, lordInOwnSign: true, reason: 'Both lords occupy the sign: treated as own sign.' };
  if (aIn) return { lord: b, lordInOwnSign: false, reason: `${a} occupies the sign itself, so the other lord ${b} is used.` };
  if (bIn) return { lord: a, lordInOwnSign: false, reason: `${b} occupies the sign itself, so the other lord ${a} is used.` };

  const conj = (p: PlanetSymbol, s?: number) => (s ? occupantsOf(chart, s).filter((x) => x !== p).length : 0);
  const ca = conj(a, signA);
  const cb = conj(b, signB);
  if (ca !== cb) {
    const w = ca > cb ? a : b;
    return { lord: w, lordInOwnSign: false, reason: `${w} is conjoined with more planets (${Math.max(ca, cb)} vs ${Math.min(ca, cb)}).` };
  }
  const ea = signA ? isExalted(a, signA) : false;
  const eb = signB ? isExalted(b, signB) : false;
  if (ea !== eb) {
    const w = ea ? a : b;
    return { lord: w, lordInOwnSign: false, reason: `${w} is exalted.` };
  }
  const ma = signA ? modalityWeight(signA) : 0;
  const mb = signB ? modalityWeight(signB) : 0;
  if (ma !== mb) {
    const w = ma > mb ? a : b;
    return { lord: w, lordInOwnSign: false, reason: `${w} occupies a sign of greater natural strength (dual > fixed > movable).` };
  }
  const da = planetDegree(chart, a);
  const db = planetDegree(chart, b);
  if (da !== db) {
    const w = da > db ? a : b;
    return { lord: w, lordInOwnSign: false, reason: `${w} is more advanced in its sign.` };
  }
  return { lord: a, lordInOwnSign: false, reason: `All tie-breakers equal: primary lord ${a} used.` };
}

/**
 * Sign-dasha length (JSD-003): inclusive count from the dasha sign to its lord in
 * `countingDirection`, minus one; 12 when the lord occupies the sign. Then +1 if the lord is
 * exalted, -1 if debilitated (not applied to the own-sign case). A result of 0 is floored at 1
 * (JSD-005). Cycle 2 = 12 - cycle-1 years (JSD-006).
 */
export function computeSignDashaYears(
  chart: AstroChart,
  signIndex: number,
  countingDirection: SignDashaDirection,
  cycle: number = 1
): SignDashaYearsEvidence {
  const sel = selectSignLord(chart, signIndex);
  const lordSign = planetSignIndex(chart, sel.lord) ?? signIndex;
  const coLords = getJaiminiSignLords(signIndex);
  const count = countSigns(signIndex, lordSign, countingDirection);

  let baseYears: number;
  let adjustment = 0;
  let adjustmentReason: string | undefined;
  let flooredAtOne = false;
  let years: number;

  if (sel.lordInOwnSign || count === 1) {
    baseYears = 12;
    years = 12;
  } else {
    baseYears = count - 1;
    if (isExalted(sel.lord, lordSign)) {
      adjustment = 1;
      adjustmentReason = `${sel.lord} is exalted in ${RASHIS[lordSign - 1].englishName}: +1 year.`;
    } else if (isDebilitated(sel.lord, lordSign)) {
      adjustment = -1;
      adjustmentReason = `${sel.lord} is debilitated in ${RASHIS[lordSign - 1].englishName}: -1 year.`;
    }
    years = baseYears + adjustment;
    if (years < 1) {
      years = 1;
      flooredAtOne = true;
    }
    if (years > 12) years = 12;
  }

  const evidence: SignDashaYearsEvidence = {
    lordUsed: sel.lord,
    coLords,
    lordSignIndex: lordSign,
    countingDirection,
    countInclusive: count,
    baseYears,
    adjustment,
    cycle: 1,
    years,
  };
  if (sel.reason) evidence.coLordSelectionReason = sel.reason;
  if (adjustmentReason) evidence.adjustmentReason = adjustmentReason;
  if (flooredAtOne) evidence.flooredAtOne = true;

  if (cycle >= 2) {
    evidence.cycle = 2;
    evidence.years = 12 - years;
  }
  return evidence;
}

export interface SignStrengthComparison {
  winner: 'A' | 'B';
  decidingRule: string;
  scoreA: Record<string, number>;
  scoreB: Record<string, number>;
}

/**
 * Jaimini sign strength (Rasi Bala) comparison used to pick the stronger of Lagna and 7th for
 * Narayana Dasha (JSD-007). Rules are applied in order; the first that separates the signs decides.
 */
export function compareSignStrength(chart: AstroChart, signA: number, signB: number): SignStrengthComparison {
  const score = (s: number): Record<string, number> => {
    const occ = occupantsOf(chart, s);
    const lords = getJaiminiSignLords(s);
    const associates = new Set<PlanetSymbol>([PlanetSymbol.JUPITER, PlanetSymbol.MERCURY, ...lords]);
    let association = 0;
    for (const p of associates) {
      const ps = planetSignIndex(chart, p);
      if (ps !== undefined && (ps === s || jaiminiSignAspects(ps, s))) association++;
    }
    const exaltedOccupants = occ.filter((p) => isExalted(p, s)).length;
    const lord = selectSignLord(chart, s).lord;
    const lordSign = planetSignIndex(chart, lord) ?? s;
    const lordDifferentOddity = lordSign % 2 !== s % 2 ? 1 : 0;
    return {
      occupants: occ.length,
      jupiterMercuryLordAssociation: association,
      exaltedOccupants,
      naturalStrength: modalityWeight(s),
      lordInSignOfDifferentOddity: lordDifferentOddity,
      lordAdvancement: Math.round(planetDegree(chart, lord) * 1e6) / 1e6,
    };
  };

  const scoreA = score(signA);
  const scoreB = score(signB);
  const order: [string, string][] = [
    ['occupants', 'More planets occupy the sign'],
    ['jupiterMercuryLordAssociation', 'More of Jupiter, Mercury and the sign lord(s) conjoin or aspect the sign'],
    ['exaltedOccupants', 'More exalted planets occupy the sign'],
    ['naturalStrength', 'Greater natural strength (dual > fixed > movable)'],
    ['lordInSignOfDifferentOddity', 'Sign lord occupies a sign of different oddity'],
    ['lordAdvancement', 'Sign lord is more advanced in its sign'],
  ];
  for (const [key, label] of order) {
    if (scoreA[key] !== scoreB[key]) {
      return { winner: scoreA[key] > scoreB[key] ? 'A' : 'B', decidingRule: label, scoreA, scoreB };
    }
  }
  return { winner: 'A', decidingRule: 'All rules tied: Lagna retained', scoreA, scoreB };
}
