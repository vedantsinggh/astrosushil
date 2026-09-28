import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS, getRashiIndex, getDegreeInRashi } from '../zodiac/rashi';
import { normalizeDegree } from '../coordinates/angular-math';
import type { AstroChart } from '../chart/astro-chart.types';
import {
  DashaPeriod,
  ShoolaDashaTree,
  ActiveDashaInfo,
  ActiveDashaPeriodSummary,
  DashaCalculationOptions,
} from './dasha.types';
import { MS_PER_YEAR } from './dasha-calculator';
import { RASHI_LORD_BY_INDEX, evaluateShoolaEligibility, resolveLagnaRashiIndex } from './dasha-eligibility';

export const SHOOLA_SIGN_YEARS = 9;
export const TOTAL_SHOOLA_YEARS = 108; // 12 * 9

/**
 * Deterministic Shoola Dasha calculation engine (Jaimini / Parashari Rashi Dasha).
 * Evaluates 108-year sign-based Dasha timelines starting from the stronger of 1st vs 7th house,
 * with direct or reverse progression based on the odd/even nature of the starting sign.
 */
export class ShoolaDashaCalculator {
  /**
   * Compares 1st house vs 7th house strength according to deterministic Jaimini rules.
   * Returns 1 if Lagna is stronger or tied, 7 if 7th house is stronger.
   */
  public determineStrongerStartingHouse(chart?: AstroChart): 1 | 7 {
    if (!chart) {
      return 1;
    }

    const lagnaRashi = resolveLagnaRashiIndex(chart);
    const seventhRashi = ((lagnaRashi - 1 + 6) % 12) + 1;

    // 1. Count planetary occupants in 1st vs 7th
    let lagnaCount = 0;
    let seventhCount = 0;

    for (const pos of Object.values(chart.planets)) {
      if (!pos || typeof pos.longitude !== 'number') continue;
      const rashi = pos.rashiIndex ?? getRashiIndex(pos.longitude);
      if (rashi === lagnaRashi) lagnaCount++;
      if (rashi === seventhRashi) seventhCount++;
    }

    if (lagnaCount > seventhCount) return 1;
    if (seventhCount > lagnaCount) return 7;

    // 2. Check presence of Jupiter or Mercury (benefics giving strength)
    const jupiterRashi = chart.planets[PlanetSymbol.JUPITER]
      ? (chart.planets[PlanetSymbol.JUPITER]?.rashiIndex ?? getRashiIndex(chart.planets[PlanetSymbol.JUPITER]?.longitude ?? 0))
      : 0;
    const mercuryRashi = chart.planets[PlanetSymbol.MERCURY]
      ? (chart.planets[PlanetSymbol.MERCURY]?.rashiIndex ?? getRashiIndex(chart.planets[PlanetSymbol.MERCURY]?.longitude ?? 0))
      : 0;

    const lagnaBenefic = (jupiterRashi === lagnaRashi ? 1 : 0) + (mercuryRashi === lagnaRashi ? 1 : 0);
    const seventhBenefic = (jupiterRashi === seventhRashi ? 1 : 0) + (mercuryRashi === seventhRashi ? 1 : 0);

    if (lagnaBenefic > seventhBenefic) return 1;
    if (seventhBenefic > lagnaBenefic) return 7;

    // 3. Modality: Dual (3) > Fixed (2) > Movable (1)
    const modalityWeight = (rashiIndex: number): number => {
      const mod = RASHIS[rashiIndex - 1].modality;
      if (mod === 'DVISVABHAVA') return 3;
      if (mod === 'STHIRA') return 2;
      return 1;
    };

    const lagnaWeight = modalityWeight(lagnaRashi);
    const seventhWeight = modalityWeight(seventhRashi);

    if (lagnaWeight > seventhWeight) return 1;
    if (seventhWeight > lagnaWeight) return 7;

    // Default tie breaker: 1st house (Lagna)
    return 1;
  }

  /**
   * Calculates Shoola Dasha tree.
   */
  public calculateShoolaDasha(
    startingLongitude: number,
    birthDateUtc: Date,
    startingFromHouse: 1 | 7 = 1,
    options?: DashaCalculationOptions
  ): ShoolaDashaTree {
    const opts = options || {};
    const maxLevel = Math.max(1, Math.min(3, opts.maxLevel ?? 2));
    const targetDate = opts.targetDate;

    const normLon = normalizeDegree(startingLongitude);
    const startRashiIndex = getRashiIndex(normLon);
    const startRashiDef = RASHIS[startRashiIndex - 1];
    const degreeInStartingRashi = getDegreeInRashi(normLon);

    // Direction: Odd sign (1, 3, 5, 7, 9, 11) -> DIRECT, Even sign (2, 4, 6, 8, 10, 12) -> REVERSE
    const isOdd = (startRashiIndex % 2 !== 0);
    const direction: 'DIRECT' | 'REVERSE' = isOdd ? 'DIRECT' : 'REVERSE';

    const fractionElapsed = degreeInStartingRashi / 30.0;
    const fractionRemaining = Math.max(0, Math.min(1, 1.0 - fractionElapsed));

    const nominalYearsPerSign = SHOOLA_SIGN_YEARS; // 9.0
    const elapsedAtBirthYears = fractionElapsed * nominalYearsPerSign;
    const balanceAtBirthYears = fractionRemaining * nominalYearsPerSign;

    const birthTimeMs = birthDateUtc.getTime();
    const theoreticalFirstStartMs = Math.round(birthTimeMs - elapsedAtBirthYears * MS_PER_YEAR);

    const mahadashas: DashaPeriod[] = [];
    const cycleCount = opts.cycleCount ?? 1;
    const targetMahaCount = cycleCount * 12;
    const hasExplicitHorizon = typeof opts.timeHorizonYears === 'number' && opts.timeHorizonYears > 0;
    const horizonYears = opts.timeHorizonYears ?? TOTAL_SHOOLA_YEARS;

    let periodTheoreticalStartMs = theoreticalFirstStartMs;
    let periodActiveStartMs = birthTimeMs;
    let totalYearsGenerated = 0;
    let mahaIndex = 0;

    while (
      mahaIndex < targetMahaCount ||
      (hasExplicitHorizon && totalYearsGenerated < horizonYears)
    ) {
      let rashiIndex: number;
      if (direction === 'DIRECT') {
        rashiIndex = ((startRashiIndex - 1 + mahaIndex) % 12) + 1;
      } else {
        rashiIndex = ((startRashiIndex - 1 - (mahaIndex % 12) + 120) % 12) + 1;
      }

      const rashiDef = RASHIS[rashiIndex - 1];
      const lord = RASHI_LORD_BY_INDEX[rashiIndex];
      const nominalYears = nominalYearsPerSign;
      const isBirthMaha = (mahaIndex === 0);

      const periodTheoreticalEndMs = Math.round(periodTheoreticalStartMs + nominalYears * MS_PER_YEAR);
      const periodActiveEndMs = periodTheoreticalEndMs;
      const activeDurationMs = periodActiveEndMs - periodActiveStartMs;
      const activeDurationYears = activeDurationMs / MS_PER_YEAR;

      const startDateIso = new Date(periodActiveStartMs).toISOString();
      const endDateIso = new Date(periodActiveEndMs).toISOString();
      const nominalStartDateIso = new Date(periodTheoreticalStartMs).toISOString();
      const nominalEndDateIso = new Date(periodTheoreticalEndMs).toISOString();

      let subPeriods: DashaPeriod[] | undefined = undefined;
      if (maxLevel >= 2) {
        subPeriods = this.calculateSubPeriods(
          rashiIndex,
          periodTheoreticalStartMs,
          nominalYears,
          periodActiveStartMs,
          periodActiveEndMs,
          2,
          maxLevel,
          birthTimeMs
        );
      }

      mahadashas.push({
        level: 1,
        lord,
        rashiIndex,
        signName: rashiDef.englishName,
        order: mahaIndex + 1,
        startDateIso,
        endDateIso,
        durationYears: activeDurationYears,
        nominalYears,
        isBirthDasha: isBirthMaha,
        nominalStartDateIso,
        nominalEndDateIso,
        subPeriods: subPeriods && subPeriods.length > 0 ? subPeriods : undefined,
      });

      totalYearsGenerated += activeDurationYears;
      periodTheoreticalStartMs = periodTheoreticalEndMs;
      periodActiveStartMs = periodActiveEndMs;
      mahaIndex++;

      if (mahaIndex >= 60) {
        break;
      }
    }

    const tree: ShoolaDashaTree = {
      dashaSystem: 'SHOOLA',
      basis: 'RASHI',
      startingRashiIndex: startRashiIndex,
      startingRashiName: startRashiDef.englishName,
      startingFromHouse,
      direction,
      startingLongitude: normLon,
      degreeInStartingRashi,
      birthLord: RASHI_LORD_BY_INDEX[startRashiIndex],
      balanceAtBirthYears,
      elapsedAtBirthYears,
      totalCycleYears: TOTAL_SHOOLA_YEARS,
      timeHorizonYears: opts.timeHorizonYears,
      eligibility: evaluateShoolaEligibility(),
      mahadashas,
    };

    if (targetDate) {
      const activeInfo = this.getActiveDasha(tree, targetDate);
      if (activeInfo) {
        tree.activeDasha = activeInfo;
        this.markActivePeriods(tree.mahadashas, new Date(targetDate).getTime());
      }
    }

    return tree;
  }

  /**
   * Convenience calculation from an AstroChart instance.
   * Automatically resolves stronger starting house (1st vs 7th).
   */
  public calculateForChart(
    chart: AstroChart,
    options?: DashaCalculationOptions
  ): ShoolaDashaTree {
    const strongerHouse = this.determineStrongerStartingHouse(chart);
    let startLon = chart.ascendant?.longitude ?? 0;
    if (strongerHouse === 7) {
      startLon = normalizeDegree(startLon + 180);
    }
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    const birthDateUtc = birthIso ? new Date(birthIso) : new Date();
    return this.calculateShoolaDasha(startLon, birthDateUtc, strongerHouse, options);
  }

  /**
   * Calculates sub-periods (Antardashas) for Shoola Dasha.
   * 12 sub-periods of 0.75y (9 months each). Direct if odd, Reverse if even.
   */
  private calculateSubPeriods(
    parentRashiIndex: number,
    theoreticalStartMs: number,
    parentNominalYears: number,
    activeStartMs: number,
    activeEndMs: number,
    currentLevel: number,
    maxLevel: number,
    birthTimeMs: number
  ): DashaPeriod[] {
    const children: DashaPeriod[] = [];
    const parentLord = RASHI_LORD_BY_INDEX[parentRashiIndex];
    const parentTheoreticalEndMs = Math.round(theoreticalStartMs + parentNominalYears * MS_PER_YEAR);
    const isParentOdd = (parentRashiIndex % 2 !== 0);
    const subNominalYears = parentNominalYears / 12.0; // 0.75 years

    let childTheoreticalStartMs = theoreticalStartMs;

    for (let k = 0; k < 12; k++) {
      let subRashiIndex: number;
      if (isParentOdd) {
        subRashiIndex = ((parentRashiIndex - 1 + k) % 12) + 1;
      } else {
        subRashiIndex = ((parentRashiIndex - 1 - k + 120) % 12) + 1;
      }

      const subRashiDef = RASHIS[subRashiIndex - 1];
      const subLord = RASHI_LORD_BY_INDEX[subRashiIndex];

      const childTheoreticalEndMs =
        k === 11
          ? parentTheoreticalEndMs
          : Math.round(childTheoreticalStartMs + subNominalYears * MS_PER_YEAR);

      if (childTheoreticalEndMs > activeStartMs && childTheoreticalStartMs < activeEndMs) {
        const childActiveStartMs = Math.max(childTheoreticalStartMs, activeStartMs);
        const childActiveEndMs = Math.min(childTheoreticalEndMs, activeEndMs);
        const childActiveDurationMs = childActiveEndMs - childActiveStartMs;
        const childActiveDurationYears = childActiveDurationMs / MS_PER_YEAR;

        const isChildBirthDasha =
          childActiveStartMs <= birthTimeMs && birthTimeMs < childActiveEndMs;

        let childSubPeriods: DashaPeriod[] | undefined = undefined;
        if (currentLevel < maxLevel) {
          childSubPeriods = this.calculateSubPeriods(
            subRashiIndex,
            childTheoreticalStartMs,
            subNominalYears,
            childActiveStartMs,
            childActiveEndMs,
            currentLevel + 1,
            maxLevel,
            birthTimeMs
          );
        }

        children.push({
          level: currentLevel,
          lord: subLord,
          rashiIndex: subRashiIndex,
          signName: subRashiDef.englishName,
          parentLord,
          order: k + 1,
          startDateIso: new Date(childActiveStartMs).toISOString(),
          endDateIso: new Date(childActiveEndMs).toISOString(),
          durationYears: childActiveDurationYears,
          nominalYears: subNominalYears,
          isBirthDasha: isChildBirthDasha,
          nominalStartDateIso: new Date(childTheoreticalStartMs).toISOString(),
          nominalEndDateIso: new Date(childTheoreticalEndMs).toISOString(),
          subPeriods: childSubPeriods && childSubPeriods.length > 0 ? childSubPeriods : undefined,
        });
      }

      childTheoreticalStartMs = childTheoreticalEndMs;
    }

    return children;
  }

  /**
   * Deterministically finds the active Dasha hierarchy for an arbitrary timestamp.
   */
  public getActiveDasha(
    tree: ShoolaDashaTree,
    targetDate: Date | string
  ): ActiveDashaInfo | null {
    const targetDateObj = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    const targetMs = targetDateObj.getTime();

    if (isNaN(targetMs) || tree.mahadashas.length === 0) {
      return null;
    }

    const firstMahaStartMs = new Date(tree.mahadashas[0].startDateIso).getTime();
    const lastMahaEndMs = new Date(tree.mahadashas[tree.mahadashas.length - 1].endDateIso).getTime();

    if (targetMs < firstMahaStartMs || targetMs >= lastMahaEndMs) {
      return null;
    }

    const activeMaha = tree.mahadashas.find((m) => {
      const s = new Date(m.startDateIso).getTime();
      const e = new Date(m.endDateIso).getTime();
      return targetMs >= s && targetMs < e;
    });

    if (!activeMaha) {
      return null;
    }

    const path: (PlanetSymbol | string)[] = [activeMaha.signName || activeMaha.lord];
    const mahaSummary: ActiveDashaPeriodSummary = {
      level: 1,
      lord: activeMaha.lord,
      signName: activeMaha.signName,
      rashiIndex: activeMaha.rashiIndex,
      startDateIso: activeMaha.startDateIso,
      endDateIso: activeMaha.endDateIso,
      durationYears: activeMaha.durationYears,
      nominalYears: activeMaha.nominalYears,
    };

    let antarSummary: ActiveDashaPeriodSummary | undefined;
    let pratyantarSummary: ActiveDashaPeriodSummary | undefined;

    if (activeMaha.subPeriods) {
      const activeAntar = activeMaha.subPeriods.find((a) => {
        const s = new Date(a.startDateIso).getTime();
        const e = new Date(a.endDateIso).getTime();
        return targetMs >= s && targetMs < e;
      });

      if (activeAntar) {
        path.push(activeAntar.signName || activeAntar.lord);
        antarSummary = {
          level: 2,
          lord: activeAntar.lord,
          signName: activeAntar.signName,
          rashiIndex: activeAntar.rashiIndex,
          startDateIso: activeAntar.startDateIso,
          endDateIso: activeAntar.endDateIso,
          durationYears: activeAntar.durationYears,
          nominalYears: activeAntar.nominalYears,
        };

        if (activeAntar.subPeriods) {
          const activePratyantar = activeAntar.subPeriods.find((p) => {
            const s = new Date(p.startDateIso).getTime();
            const e = new Date(p.endDateIso).getTime();
            return targetMs >= s && targetMs < e;
          });

          if (activePratyantar) {
            path.push(activePratyantar.signName || activePratyantar.lord);
            pratyantarSummary = {
              level: 3,
              lord: activePratyantar.lord,
              signName: activePratyantar.signName,
              rashiIndex: activePratyantar.rashiIndex,
              startDateIso: activePratyantar.startDateIso,
              endDateIso: activePratyantar.endDateIso,
              durationYears: activePratyantar.durationYears,
              nominalYears: activePratyantar.nominalYears,
            };
          }
        }
      }
    }

    const description = path.join(' - ');

    return {
      targetDateIso: targetDateObj.toISOString(),
      mahadasha: mahaSummary,
      antardasha: antarSummary,
      pratyantardasha: pratyantarSummary,
      path,
      description,
    };
  }

  private markActivePeriods(periods: DashaPeriod[], targetMs: number): void {
    for (const period of periods) {
      const s = new Date(period.startDateIso).getTime();
      const e = new Date(period.endDateIso).getTime();
      if (targetMs >= s && targetMs < e) {
        period.isActive = true;
        if (period.subPeriods) {
          this.markActivePeriods(period.subPeriods, targetMs);
        }
      } else {
        period.isActive = false;
      }
    }
  }
}
