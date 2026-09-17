import { PlanetSymbol } from '../planets/planet.types';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { normalizeDegree } from '../coordinates/angular-math';
import type { AstroChart } from '../chart/astro-chart.types';
import {
  DashaPeriod,
  ActiveDashaInfo,
  ActiveDashaPeriodSummary,
  AshtottariCalculationOptions,
  AshtottariDashaTree,
  AshtottariEligibility,
} from './dasha.types';
import {
  ASHTOTTARI_YEARS,
  ASHTOTTARI_ORDER,
  TOTAL_ASHTOTTARI_YEARS,
  getAshtottariSectorByLongitude,
} from './ashtottari-sectors';
import { evaluateAshtottariEligibility } from './ashtottari-eligibility';

import { MS_PER_YEAR } from './dasha-calculator';

export { ASHTOTTARI_YEARS, ASHTOTTARI_ORDER, TOTAL_ASHTOTTARI_YEARS, MS_PER_YEAR };

/**
 * Deterministic Ashtottari Dasha calculation engine.
 * Calculates 108-year multi-level Dasha timelines (Mahadasha -> Antardasha -> Pratyantardasha -> Sookshma -> Prana)
 * anchored to the native's canonical sidereal Moon Nakshatra position (using the classical 28-sector system including Abhijit)
 * and evaluates Parashari eligibility criteria.
 */
export class AshtottariCalculator {
  /**
   * Calculates complete Ashtottari Dasha tree given sidereal Moon longitude and UTC birth date.
   * Optionally accepts AstroChart to evaluate Parashari eligibility.
   */
  public calculateAshtottariDasha(
    moonLongitude: number,
    birthDateUtc: Date,
    optionsOrMaxLevel?: number | AshtottariCalculationOptions,
    chart?: AstroChart
  ): AshtottariDashaTree {
    const options: AshtottariCalculationOptions =
      typeof optionsOrMaxLevel === 'number'
        ? { maxLevel: optionsOrMaxLevel }
        : (optionsOrMaxLevel || {});

    const maxLevel = Math.max(1, Math.min(5, options.maxLevel ?? 3));
    const targetDate = options.targetDate;

    // Normalize Moon longitude [0, 360)
    const normMoon = normalizeDegree(moonLongitude);

    // 1. Resolve 28-sector Ashtottari division (including Abhijit)
    const sector = getAshtottariSectorByLongitude(normMoon);

    // 2. Resolve canonical 27-Nakshatra and Pada information
    const nakshatraDef = getNakshatraByLongitude(normMoon);
    const moonPada = getPada(normMoon);

    // 3. Exact fractional elapsed and remaining balance within the Ashtottari sector group
    const firstLord = sector.lord;
    const firstLordNominalYears = ASHTOTTARI_YEARS[firstLord];
    const k = sector.orderInGroup;       // 1-based index within this lord's group
    const N = sector.totalInGroup;       // 3 or 4
    const segmentYears = sector.segmentYears;

    const priorElapsedYears = (k - 1) * segmentYears;

    const degreeInSegment = Math.max(0, Math.min(sector.spanDegrees, normMoon - sector.startDegree));
    const fractionElapsedInSegment = degreeInSegment / sector.spanDegrees;
    const fractionRemainingInSegment = Math.max(0, Math.min(1, 1 - fractionElapsedInSegment));

    const inSegmentElapsedYears = fractionElapsedInSegment * segmentYears;
    const inSegmentRemainingYears = fractionRemainingInSegment * segmentYears;

    const subsequentRemainingYears = (N - k) * segmentYears;

    const elapsedAtBirthYears = priorElapsedYears + inSegmentElapsedYears;
    const balanceAtBirthYears = inSegmentRemainingYears + subsequentRemainingYears;

    // Unambiguous birth epoch in milliseconds
    const birthTimeMs = birthDateUtc.getTime();

    // Theoretical start of the birth Mahadasha (prior to or at birth)
    const theoreticalFirstStartMs = Math.round(birthTimeMs - elapsedAtBirthYears * MS_PER_YEAR);

    const mahadashas: DashaPeriod[] = [];
    const firstLordIndex = ASHTOTTARI_ORDER.indexOf(firstLord);

    // Determine number of Mahadashas: default 8 (1 full 108-year cycle of 8 lords)
    const cycleCount = options.cycleCount ?? 1;
    const targetMahadashaCount = cycleCount * 8;
    const hasExplicitHorizon = typeof options.timeHorizonYears === 'number' && options.timeHorizonYears > 0;
    const horizonYears = options.timeHorizonYears ?? TOTAL_ASHTOTTARI_YEARS;

    let currentLordIndex = firstLordIndex;
    let periodTheoreticalStartMs = theoreticalFirstStartMs;
    let periodActiveStartMs = birthTimeMs; // First Mahadasha starts strictly at birth
    let totalYearsGenerated = 0;
    let mahaIndex = 0;

    while (
      mahaIndex < targetMahadashaCount ||
      (hasExplicitHorizon && totalYearsGenerated < horizonYears)
    ) {
      const lord = ASHTOTTARI_ORDER[currentLordIndex % 8];
      const nominalYears = ASHTOTTARI_YEARS[lord];
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
          lord,
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
      currentLordIndex++;
      mahaIndex++;

      // Safety bound to prevent infinite loops
      if (mahaIndex >= 80) {
        break;
      }
    }

    // Optional Parashari eligibility calculation if chart provided
    let eligibility: AshtottariEligibility | undefined;
    if (chart) {
      eligibility = evaluateAshtottariEligibility(chart);
    }

    const tree: AshtottariDashaTree = {
      dashaSystem: 'ASHTOTTARI',
      moonLongitude: normMoon,
      moonNakshatraIndex: nakshatraDef.index,
      moonNakshatraName: nakshatraDef.name,
      moonPada,
      sectorIndex: sector.index,
      sectorName: sector.name,
      birthLord: firstLord,
      balanceAtBirthYears,
      elapsedAtBirthYears,
      totalCycleYears: TOTAL_ASHTOTTARI_YEARS,
      timeHorizonYears: options.timeHorizonYears,
      eligibility,
      mahadashas,
    };

    // If targetDate is specified, determine active Dasha hierarchy and tag tree
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
   * Convenience method to calculate Ashtottari Dasha directly from an AstroChart instance.
   * Automatically evaluates Parashari eligibility.
   */
  public calculateForChart(
    chart: AstroChart,
    options?: AshtottariCalculationOptions
  ): AshtottariDashaTree {
    const moonPlanet = chart.planets[PlanetSymbol.MOON];
    if (!moonPlanet) {
      throw new Error('Moon planet is missing from AstroChart');
    }
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    const birthDateUtc = birthIso ? new Date(birthIso) : new Date();
    return this.calculateAshtottariDasha(moonPlanet.longitude, birthDateUtc, options, chart);
  }

  /**
   * Recursively generates child Ashtottari Dasha periods (Antardasha, Pratyantardasha, Sookshma, Prana).
   * Follows the canonical 8-lord sequence starting with the parent lord and proportional durations.
   */
  private calculateSubPeriods(
    parentLord: PlanetSymbol,
    theoreticalStartMs: number,
    theoreticalDurationYears: number,
    activeStartMs: number,
    activeEndMs: number,
    currentLevel: number,
    maxLevel: number,
    birthTimeMs: number
  ): DashaPeriod[] {
    const children: DashaPeriod[] = [];
    const startIndex = ASHTOTTARI_ORDER.indexOf(parentLord);
    const parentTheoreticalEndMs = Math.round(theoreticalStartMs + theoreticalDurationYears * MS_PER_YEAR);

    let childTheoreticalStartMs = theoreticalStartMs;

    for (let k = 0; k < 8; k++) {
      const subLordIndex = (startIndex + k) % 8;
      const subLord = ASHTOTTARI_ORDER[subLordIndex];
      const subLordFraction = ASHTOTTARI_YEARS[subLord] / TOTAL_ASHTOTTARI_YEARS;
      const subLordNominalYears = theoreticalDurationYears * subLordFraction;

      const childTheoreticalEndMs =
        k === 7
          ? parentTheoreticalEndMs
          : Math.round(childTheoreticalStartMs + subLordNominalYears * MS_PER_YEAR);

      // Check if child period intersects the active window [activeStartMs, activeEndMs]
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
            subLord,
            childTheoreticalStartMs,
            subLordNominalYears,
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
          parentLord,
          order: k + 1,
          startDateIso: new Date(childActiveStartMs).toISOString(),
          endDateIso: new Date(childActiveEndMs).toISOString(),
          durationYears: childActiveDurationYears,
          nominalYears: subLordNominalYears,
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
   * Deterministically finds the active Ashtottari Dasha hierarchy for an arbitrary timestamp.
   * Returns null if targetDate is outside the calculated Dasha tree span.
   */
  public getActiveDasha(
    tree: AshtottariDashaTree,
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

    // Locate active Mahadasha
    const activeMaha = tree.mahadashas.find((m) => {
      const s = new Date(m.startDateIso).getTime();
      const e = new Date(m.endDateIso).getTime();
      return targetMs >= s && targetMs < e;
    });

    if (!activeMaha) {
      return null;
    }

    const path: PlanetSymbol[] = [activeMaha.lord];
    const mahaSummary: ActiveDashaPeriodSummary = {
      level: 1,
      lord: activeMaha.lord,
      startDateIso: activeMaha.startDateIso,
      endDateIso: activeMaha.endDateIso,
      durationYears: activeMaha.durationYears,
      nominalYears: activeMaha.nominalYears,
    };

    let antarSummary: ActiveDashaPeriodSummary | undefined;
    let pratyantarSummary: ActiveDashaPeriodSummary | undefined;
    let sookshmaSummary: ActiveDashaPeriodSummary | undefined;
    let pranaSummary: ActiveDashaPeriodSummary | undefined;

    // Locate active Antardasha
    if (activeMaha.subPeriods) {
      const activeAntar = activeMaha.subPeriods.find((a) => {
        const s = new Date(a.startDateIso).getTime();
        const e = new Date(a.endDateIso).getTime();
        return targetMs >= s && targetMs < e;
      });

      if (activeAntar) {
        path.push(activeAntar.lord);
        antarSummary = {
          level: 2,
          lord: activeAntar.lord,
          startDateIso: activeAntar.startDateIso,
          endDateIso: activeAntar.endDateIso,
          durationYears: activeAntar.durationYears,
          nominalYears: activeAntar.nominalYears,
        };

        // Locate active Pratyantardasha
        if (activeAntar.subPeriods) {
          const activePratyantar = activeAntar.subPeriods.find((p) => {
            const s = new Date(p.startDateIso).getTime();
            const e = new Date(p.endDateIso).getTime();
            return targetMs >= s && targetMs < e;
          });

          if (activePratyantar) {
            path.push(activePratyantar.lord);
            pratyantarSummary = {
              level: 3,
              lord: activePratyantar.lord,
              startDateIso: activePratyantar.startDateIso,
              endDateIso: activePratyantar.endDateIso,
              durationYears: activePratyantar.durationYears,
              nominalYears: activePratyantar.nominalYears,
            };

            // Locate active Sookshma
            if (activePratyantar.subPeriods) {
              const activeSookshma = activePratyantar.subPeriods.find((sk) => {
                const s = new Date(sk.startDateIso).getTime();
                const e = new Date(sk.endDateIso).getTime();
                return targetMs >= s && targetMs < e;
              });

              if (activeSookshma) {
                path.push(activeSookshma.lord);
                sookshmaSummary = {
                  level: 4,
                  lord: activeSookshma.lord,
                  startDateIso: activeSookshma.startDateIso,
                  endDateIso: activeSookshma.endDateIso,
                  durationYears: activeSookshma.durationYears,
                  nominalYears: activeSookshma.nominalYears,
                };

                // Locate active Prana
                if (activeSookshma.subPeriods) {
                  const activePrana = activeSookshma.subPeriods.find((pr) => {
                    const s = new Date(pr.startDateIso).getTime();
                    const e = new Date(pr.endDateIso).getTime();
                    return targetMs >= s && targetMs < e;
                  });

                  if (activePrana) {
                    path.push(activePrana.lord);
                    pranaSummary = {
                      level: 5,
                      lord: activePrana.lord,
                      startDateIso: activePrana.startDateIso,
                      endDateIso: activePrana.endDateIso,
                      durationYears: activePrana.durationYears,
                      nominalYears: activePrana.nominalYears,
                    };
                  }
                }
              }
            }
          }
        }
      }
    }

    const formatLordName = (lord: PlanetSymbol): string =>
      lord.charAt(0).toUpperCase() + lord.slice(1).toLowerCase();
    const description = path.map(formatLordName).join(' - ');

    return {
      targetDateIso: targetDateObj.toISOString(),
      mahadasha: mahaSummary,
      antardasha: antarSummary,
      pratyantardasha: pratyantarSummary,
      sookshma: sookshmaSummary,
      prana: pranaSummary,
      path,
      description,
    };
  }

  /**
   * Recursively marks isActive: true on periods containing targetMs.
   */
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
