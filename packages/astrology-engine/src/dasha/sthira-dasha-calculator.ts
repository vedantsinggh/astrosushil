import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS, getRashiIndex, getDegreeInRashi } from '../zodiac/rashi';
import { normalizeDegree } from '../coordinates/angular-math';
import type { AstroChart } from '../chart/astro-chart.types';
import {
  DashaPeriod,
  SthiraDashaTree,
  ActiveDashaInfo,
  ActiveDashaPeriodSummary,
  DashaCalculationOptions,
} from './dasha.types';
import { MS_PER_YEAR } from './dasha-calculator';
import { RASHI_LORD_BY_INDEX, evaluateSthiraEligibility } from './dasha-eligibility';

/**
 * Canonical Sthira Dasha durations in years per Rashi index (1 to 12).
 * Chara (Movable: 1, 4, 7, 10) = 7 years
 * Sthira (Fixed: 2, 5, 8, 11) = 8 years
 * Dwisvabhava (Dual: 3, 6, 9, 12) = 9 years
 * Total = 4*7 + 4*8 + 4*9 = 96 years.
 */
export const STHIRA_RASHI_YEARS: Record<number, number> = {
  1: 7,   // Aries (Movable)
  2: 8,   // Taurus (Fixed)
  3: 9,   // Gemini (Dual)
  4: 7,   // Cancer (Movable)
  5: 8,   // Leo (Fixed)
  6: 9,   // Virgo (Dual)
  7: 7,   // Libra (Movable)
  8: 8,   // Scorpio (Fixed)
  9: 9,   // Sagittarius (Dual)
  10: 7,  // Capricorn (Movable)
  11: 8,  // Aquarius (Fixed)
  12: 9,  // Pisces (Dual)
};

export const TOTAL_STHIRA_YEARS = 96;

/**
 * Deterministic Sthira Dasha calculation engine (Jaimini / Parashari Rashi Dasha).
 * Evaluates 96-year sign-based Dasha timelines starting from the natal Lagna Rashi
 * with proportional sub-periods and exact Ascendant continuous birth balance.
 */
export class SthiraDashaCalculator {
  /**
   * Calculates Sthira Dasha tree from Ascendant longitude and UTC birth date.
   */
  public calculateSthiraDasha(
    ascendantLongitude: number,
    birthDateUtc: Date,
    options?: DashaCalculationOptions
  ): SthiraDashaTree {
    const opts = options || {};
    const maxLevel = Math.max(1, Math.min(3, opts.maxLevel ?? 2));
    const targetDate = opts.targetDate;

    const normAsc = normalizeDegree(ascendantLongitude);
    const startRashiIndex = getRashiIndex(normAsc);
    const startRashiDef = RASHIS[startRashiIndex - 1];
    const degreeInStartingRashi = getDegreeInRashi(normAsc);

    // Continuous fractional balance based on Ascendant degree in starting Rashi
    const fractionElapsed = degreeInStartingRashi / 30.0;
    const fractionRemaining = Math.max(0, Math.min(1, 1.0 - fractionElapsed));

    const firstNominalYears = STHIRA_RASHI_YEARS[startRashiIndex];
    const elapsedAtBirthYears = fractionElapsed * firstNominalYears;
    const balanceAtBirthYears = fractionRemaining * firstNominalYears;

    const birthTimeMs = birthDateUtc.getTime();
    const theoreticalFirstStartMs = Math.round(birthTimeMs - elapsedAtBirthYears * MS_PER_YEAR);

    const mahadashas: DashaPeriod[] = [];
    const cycleCount = opts.cycleCount ?? 1;
    const targetMahaCount = cycleCount * 12;
    const hasExplicitHorizon = typeof opts.timeHorizonYears === 'number' && opts.timeHorizonYears > 0;
    const horizonYears = opts.timeHorizonYears ?? TOTAL_STHIRA_YEARS;

    let periodTheoreticalStartMs = theoreticalFirstStartMs;
    let periodActiveStartMs = birthTimeMs;
    let totalYearsGenerated = 0;
    let mahaIndex = 0;

    while (
      mahaIndex < targetMahaCount ||
      (hasExplicitHorizon && totalYearsGenerated < horizonYears)
    ) {
      const rashiIndex = ((startRashiIndex - 1 + mahaIndex) % 12) + 1;
      const rashiDef = RASHIS[rashiIndex - 1];
      const lord = RASHI_LORD_BY_INDEX[rashiIndex];
      const nominalYears = STHIRA_RASHI_YEARS[rashiIndex];
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

    const tree: SthiraDashaTree = {
      dashaSystem: 'STHIRA',
      basis: 'RASHI',
      startingRashiIndex: startRashiIndex,
      startingRashiName: startRashiDef.englishName,
      ascendantLongitude: normAsc,
      degreeInStartingRashi,
      birthLord: RASHI_LORD_BY_INDEX[startRashiIndex],
      balanceAtBirthYears,
      elapsedAtBirthYears,
      totalCycleYears: TOTAL_STHIRA_YEARS,
      timeHorizonYears: opts.timeHorizonYears,
      eligibility: evaluateSthiraEligibility(),
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
   */
  public calculateForChart(
    chart: AstroChart,
    options?: DashaCalculationOptions
  ): SthiraDashaTree {
    const ascLon = chart.ascendant?.longitude ?? 0;
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    const birthDateUtc = birthIso ? new Date(birthIso) : new Date();
    return this.calculateSthiraDasha(ascLon, birthDateUtc, options);
  }

  /**
   * Calculates sub-periods (Antardashas & Pratyantardashas) for Sthira Dasha.
   * Progresses direct through 12 signs starting from the parent sign.
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

    let childTheoreticalStartMs = theoreticalStartMs;

    for (let k = 0; k < 12; k++) {
      const subRashiIndex = ((parentRashiIndex - 1 + k) % 12) + 1;
      const subRashiDef = RASHIS[subRashiIndex - 1];
      const subLord = RASHI_LORD_BY_INDEX[subRashiIndex];
      const subNominalFraction = STHIRA_RASHI_YEARS[subRashiIndex] / TOTAL_STHIRA_YEARS;
      const subNominalYears = parentNominalYears * subNominalFraction;

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
    tree: SthiraDashaTree,
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
