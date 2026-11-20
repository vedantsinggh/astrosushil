import { RASHIS } from '../zodiac/rashi';
import { MS_PER_YEAR } from './dasha-calculator';
import { SignDashaPeriod, SignDashaYearsEvidence } from './dasha.types';
import { buildPeriodBase, buildSubPeriods, PeriodTreeContext } from './period-tree-builder';
import { getJaiminiSignLords } from './jaimini-sign-dasha-utils';

export interface SignMahadashaSpec {
  signIndex: number;
  evidence: SignDashaYearsEvidence;
}

/**
 * Builds Jaimini sign-dasha Mahadashas starting at birth (Jaimini sign dashas have no birth
 * balance: the first sign runs its full length from birth). Each Mahadasha is split into 12 equal
 * sub-periods whose sign order is given by `subSignOrder(parentSign)`.
 */
export function buildSignMahadashas(
  specs: SignMahadashaSpec[],
  birthMs: number,
  maxLevel: number,
  subSignOrder: (parentSign: number) => number[]
): SignDashaPeriod[] {
  const decorate = (sign: number, base: ReturnType<typeof buildPeriodBase>): SignDashaPeriod => {
    const def = RASHIS[sign - 1];
    return { ...base, signIndex: sign, rashiIndex: sign, signName: def.englishName, sanskritName: def.sanskritName };
  };
  const lordOf = (sign: number) => getJaiminiSignLords(sign)[0];
  const ctx: PeriodTreeContext<number, SignDashaPeriod> = {
    birthMs,
    maxLevel,
    childrenOf: (parentSign) => subSignOrder(parentSign).map((s) => ({ key: s, weight: 1 })),
    decorate,
  };

  const out: SignDashaPeriod[] = [];
  let cursorMs = birthMs;
  specs.forEach((spec, i) => {
    const years = spec.evidence.years;
    const endMs = Math.round(cursorMs + years * MS_PER_YEAR);
    // A Mahadasha is named after its sign; `lord` reports the lord actually used for its length.
    const base = buildPeriodBase(1, i + 1, spec.evidence.lordUsed, cursorMs, endMs, years, birthMs);
    const md = decorate(spec.signIndex, base);
    md.yearsEvidence = spec.evidence;
    const subs = buildSubPeriods(ctx, spec.signIndex, cursorMs, years, 2, lordOf);
    if (subs.length > 0) md.subPeriods = subs;
    out.push(md);
    cursorMs = endMs;
  });
  return out;
}
