import { RASHIS } from '../zodiac/rashi';
import type { AstroChart } from '../chart/astro-chart.types';
import { CharaDashaTree, DashaCalculationOptions, DashaEligibilityResult, SignDashaDirection } from './dasha.types';
import { resolveLagnaRashiIndex } from './dasha-eligibility';
import { resolveCurrentPeriod } from './period-tree-builder';
import { computeSignDashaYears, isOddFooted, signAt } from './jaimini-sign-dasha-utils';
import { buildSignMahadashas, SignMahadashaSpec } from './sign-dasha-tree';

/**
 * Jaimini Chara Dasha, K.N. Rao method ("Predicting through Jaimini's Chara Dasha").
 * Decision log CHR-001..CHR-006:
 *  - Dasha starts from the Lagna sign, full length from birth (no balance).
 *  - Direction: FORWARD if the 9th sign from Lagna is odd-footed (Ar, Ta, Ge, Li, Sc, Sg),
 *    otherwise REVERSE.
 *  - Length of each sign: JSD-003 counting, forward for odd-footed signs, reverse otherwise.
 *  - Antardashas: 12 equal parts. The first is the sign after the Mahadasha sign in the dasha
 *    direction; the Mahadasha sign's own Antardasha comes last.
 *  - Second cycle (cycles = 2): each sign gets 12 - first-cycle years; signs with 0 are skipped.
 */
export function evaluateCharaEligibility(): DashaEligibilityResult {
  return {
    isEligible: true,
    system: 'CHARA',
    tradition: 'JAIMINI',
    eligibilityMethod: 'UNIVERSAL_JAIMINI_CHARA',
    reason: 'Chara Dasha is a universal Jaimini sign Dasha applicable to every chart.',
  };
}

export class CharaDashaCalculator {
  public calculateForChart(chart: AstroChart, options?: DashaCalculationOptions): CharaDashaTree {
    const opts = options || {};
    const maxLevel = Math.max(1, Math.min(3, opts.maxLevel ?? 2));
    const cycles = Math.max(1, Math.min(2, opts.cycleCount ?? 1));
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    if (!birthIso) throw new Error('Chara Dasha requires the normalized UTC birth instant.');
    const birthMs = new Date(birthIso).getTime();

    const lagna = resolveLagnaRashiIndex(chart);
    const ninth = signAt(lagna, 8);
    const direction: SignDashaDirection = isOddFooted(ninth) ? 'FORWARD' : 'REVERSE';
    const step = direction === 'FORWARD' ? 1 : -1;
    const sequence = Array.from({ length: 12 }, (_, k) => signAt(lagna, k * step));

    const specs: SignMahadashaSpec[] = [];
    for (let c = 1; c <= cycles; c++) {
      for (const sign of sequence) {
        const countDir: SignDashaDirection = isOddFooted(sign) ? 'FORWARD' : 'REVERSE';
        const evidence = computeSignDashaYears(chart, sign, countDir, c);
        if (evidence.years > 0) specs.push({ signIndex: sign, evidence });
      }
    }

    const subOrder = (parent: number) => Array.from({ length: 12 }, (_, k) => signAt(parent, (k + 1) * step));
    const periods = buildSignMahadashas(specs, birthMs, maxLevel, subOrder);
    const firstCycleYears = periods.filter((p) => p.yearsEvidence?.cycle === 1).reduce((s, p) => s + p.nominalYears, 0);

    const tree: CharaDashaTree = {
      dashaSystem: 'CHARA',
      system: 'CHARA',
      method: 'KN_RAO',
      basis: 'RASHI',
      lagnaRashiIndex: lagna,
      startingSign: lagna,
      startingSignName: RASHIS[lagna - 1].englishName,
      ninthFromLagnaSignIndex: ninth,
      direction,
      directionReason: `9th from Lagna is ${RASHIS[ninth - 1].englishName}, ${
        isOddFooted(ninth) ? 'an odd-footed sign: dashas move forward' : 'an even-footed sign: dashas move in reverse'
      }.`,
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
