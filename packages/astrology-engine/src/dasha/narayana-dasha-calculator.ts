import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import type { AstroChart } from '../chart/astro-chart.types';
import {
  DashaCalculationOptions,
  DashaEligibilityResult,
  NarayanaDashaTree,
  NarayanaProgressionType,
  SignDashaDirection,
} from './dasha.types';
import { resolveLagnaRashiIndex } from './dasha-eligibility';
import { resolveCurrentPeriod } from './period-tree-builder';
import { compareSignStrength, computeSignDashaYears, occupantsOf, signAt } from './jaimini-sign-dasha-utils';
import { buildSignMahadashas, SignMahadashaSpec } from './sign-dasha-tree';

/**
 * Narayana (Padakrama) Dasha per the Jaimini Sutras as taught by P.V.R. Narasimha Rao /
 * Sanjay Rath. Decision log NAR-001..NAR-007:
 *  - Starts from the stronger of Lagna and 7th (JSD-007 Rasi Bala), full length from birth.
 *  - Direction: odd starting sign -> FORWARD, even -> REVERSE; Ketu in the starting sign
 *    reverses that; Saturn in the starting sign makes it FORWARD (Saturn takes precedence).
 *  - Progression by the starting sign's nature: movable -> consecutive signs; fixed -> every 6th
 *    sign; dual -> trines (1, 5, 9, then 2, 6, 10, then 3, 7, 11, then 4, 8, 12).
 *  - Length of each sign: JSD-003 counting, forward from odd signs, reverse from even signs.
 *  - Antardashas: 12 equal parts starting with the Mahadasha sign itself and following the same
 *    progression pattern and direction as the Mahadashas.
 */
export const NARAYANA_PROGRESSION_OFFSETS: Record<NarayanaProgressionType, number[]> = {
  MOVABLE_REGULAR: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  FIXED_SIXTH: [0, 5, 10, 3, 8, 1, 6, 11, 4, 9, 2, 7],
  DUAL_TRINE: [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11],
};

export function getNarayanaProgressionType(signIndex: number): NarayanaProgressionType {
  const m = RASHIS[signIndex - 1].modality;
  return m === 'CHARA' ? 'MOVABLE_REGULAR' : m === 'STHIRA' ? 'FIXED_SIXTH' : 'DUAL_TRINE';
}

export function evaluateNarayanaEligibility(): DashaEligibilityResult {
  return {
    isEligible: true,
    system: 'NARAYANA',
    tradition: 'JAIMINI',
    eligibilityMethod: 'UNIVERSAL_JAIMINI_NARAYANA',
    reason: 'Narayana Dasha is a universal Jaimini sign Dasha applicable to every chart.',
  };
}

export class NarayanaDashaCalculator {
  public calculateForChart(chart: AstroChart, options?: DashaCalculationOptions): NarayanaDashaTree {
    const opts = options || {};
    const maxLevel = Math.max(1, Math.min(3, opts.maxLevel ?? 2));
    const cycles = Math.max(1, Math.min(2, opts.cycleCount ?? 1));
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    if (!birthIso) throw new Error('Narayana Dasha requires the normalized UTC birth instant.');
    const birthMs = new Date(birthIso).getTime();

    const lagna = resolveLagnaRashiIndex(chart);
    const seventh = signAt(lagna, 6);
    const cmp = compareSignStrength(chart, lagna, seventh);
    const start = cmp.winner === 'A' ? lagna : seventh;

    const occupants = occupantsOf(chart, start);
    let direction: SignDashaDirection = start % 2 === 1 ? 'FORWARD' : 'REVERSE';
    let directionReason = `${RASHIS[start - 1].englishName} is an ${start % 2 === 1 ? 'odd' : 'even'} sign`;
    if (occupants.includes(PlanetSymbol.SATURN)) {
      direction = 'FORWARD';
      directionReason += '; Saturn occupies it, so the order is forward';
    } else if (occupants.includes(PlanetSymbol.KETU)) {
      direction = direction === 'FORWARD' ? 'REVERSE' : 'FORWARD';
      directionReason += '; Ketu occupies it, so the natural order is reversed';
    }
    directionReason += '.';

    const progressionType = getNarayanaProgressionType(start);
    const offsets = NARAYANA_PROGRESSION_OFFSETS[progressionType];
    const step = direction === 'FORWARD' ? 1 : -1;
    const sequence = offsets.map((o) => signAt(start, o * step));

    const specs: SignMahadashaSpec[] = [];
    for (let c = 1; c <= cycles; c++) {
      for (const sign of sequence) {
        const countDir: SignDashaDirection = sign % 2 === 1 ? 'FORWARD' : 'REVERSE';
        const evidence = computeSignDashaYears(chart, sign, countDir, c);
        if (evidence.years > 0) specs.push({ signIndex: sign, evidence });
      }
    }

    const subOrder = (parent: number) => offsets.map((o) => signAt(parent, o * step));
    const periods = buildSignMahadashas(specs, birthMs, maxLevel, subOrder);
    const firstCycleYears = periods.filter((p) => p.yearsEvidence?.cycle === 1).reduce((s, p) => s + p.nominalYears, 0);

    const tree: NarayanaDashaTree = {
      dashaSystem: 'NARAYANA',
      system: 'NARAYANA',
      basis: 'RASHI',
      lagnaRashiIndex: lagna,
      startingSign: start,
      startingSignName: RASHIS[start - 1].englishName,
      startingSignEvidence: {
        lagnaSignIndex: lagna,
        seventhSignIndex: seventh,
        chosen: cmp.winner === 'A' ? 1 : 7,
        decidingRule: cmp.decidingRule,
        lagnaScore: cmp.scoreA,
        seventhScore: cmp.scoreB,
      },
      progressionType,
      direction,
      directionReason,
      totalCycleYears: firstCycleYears,
      cycles,
      balanceAtBirthYears: periods[0]?.nominalYears ?? 0,
      periods,
      mahadashas: periods,
    };
    const current = resolveCurrentPeriod(periods, opts.targetDate);
    if (current) tree.currentPeriod = current;
    return tree;
  }
}
