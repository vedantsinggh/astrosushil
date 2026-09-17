import { PlanetSymbol } from '../planets/planet.types';
import { getNakshatraByLongitude, getPada, NAKSHATRA_LORDS_ORDER } from '../nakshatra/nakshatra';
import {
  DashaPeriod,
  VimshottariDashaTree,
  ActiveDashaInfo,
  ActiveDashaPeriodSummary,
  VimshottariCalculationOptions,
} from './dasha.types';
import { normalizeDegree } from '../coordinates/angular-math';
import type { AstroChart } from '../chart/astro-chart.types';

/**
 * Standard mean Gregorian / solar astronomical year in milliseconds.
 * 365.2425 days * 24 h * 60 m * 60 s * 1000 ms = 31,556,952,000 ms.
 */
export const MS_PER_YEAR = 365.2425 * 24 * 60 * 60 * 1000;

/**
 * Canonical Vimshottari Dasha durations in years per planetary ruler.
 * Full cycle sums to exactly 120 years.
 */
export const DASHA_YEARS: Record<PlanetSymbol, number> = {
  [PlanetSymbol.KETU]: 7,
  [PlanetSymbol.VENUS]: 20,
  [PlanetSymbol.SUN]: 6,
  [PlanetSymbol.MOON]: 10,
  [PlanetSymbol.MARS]: 7,
  [PlanetSymbol.RAHU]: 18,
  [PlanetSymbol.JUPITER]: 16,
  [PlanetSymbol.SATURN]: 19,
  [PlanetSymbol.MERCURY]: 17,
  [PlanetSymbol.URANUS]: 0,
  [PlanetSymbol.NEPTUNE]: 0,
  [PlanetSymbol.PLUTO]: 0,
};

/**
 * Total duration of one complete Vimshottari cycle.
 */
export const TOTAL_VIMSHOTTARI_YEARS = 120;

/**
 * Canonical planetary lord sequence for Vimshottari Dasha (matches Nakshatra lords order).
 */
export const DASHA_ORDER: PlanetSymbol[] = NAKSHATRA_LORDS_ORDER;

/**
 * Deterministic Vimshottari Dasha calculation engine.
 * Calculates multi-level Dasha timelines (Mahadasha -> Antardasha -> Pratyantardasha -> Sookshma -> Prana)
 * anchored to the native's canonical sidereal Moon Nakshatra position and birth timestamp.
 */
export class DashaCalculator {
  /**
   * Calculates complete Vimshottari Dasha tree from canonical sidereal Moon longitude and UTC birth date.
   * Supports options object or maxLevel number for backward compatibility.
   */
  public calculateVimshottariDasha(
    moonLongitude: number,
    birthDateUtc: Date,
    optionsOrMaxLevel?: number | VimshottariCalculationOptions
  ): VimshottariDashaTree {
    const options: VimshottariCalculationOptions =
      typeof optionsOrMaxLevel === 'number'
        ? { maxLevel: optionsOrMaxLevel }
        : (optionsOrMaxLevel || {});

    const maxLevel = Math.max(1, Math.min(5, options.maxLevel ?? 3));
    const targetDate = options.targetDate;

    // Normalize Moon longitude [0, 360)
    const normMoon = normalizeDegree(moonLongitude);
    const nakshatraDef = getNakshatraByLongitude(normMoon);
    const moonPada = getPada(normMoon);
    const nakshatraSpan = 360 / 27; // 13.333333333333334 degrees

    // Exact elapsed and remaining proportions within the birth Nakshatra
    const degreeInNakshatra = Math.max(0, Math.min(nakshatraSpan, normMoon - nakshatraDef.startDegree));
    const fractionElapsed = degreeInNakshatra / nakshatraSpan;
    const fractionRemaining = Math.max(0, Math.min(1, 1 - fractionElapsed));

    const firstLord = nakshatraDef.lord;
    const firstLordNominalYears = DASHA_YEARS[firstLord];
    const balanceAtBirthYears = fractionRemaining * firstLordNominalYears;
    const elapsedAtBirthYears = fractionElapsed * firstLordNominalYears;

    // Unambiguous birth epoch in milliseconds
    const birthTimeMs = birthDateUtc.getTime();

    // Theoretical start of the birth Mahadasha (prior to or at birth)
    const theoreticalFirstStartMs = Math.round(birthTimeMs - elapsedAtBirthYears * MS_PER_YEAR);

    const mahadashas: DashaPeriod[] = [];
    const firstLordIndex = DASHA_ORDER.indexOf(firstLord);

    // Determine number of Mahadashas: default 9 (1 full cycle of 9 lords).
    // If an explicit time horizon is requested, generate additional periods to satisfy it.
    const cycleCount = options.cycleCount ?? 1;
    const targetMahadashaCount = cycleCount * 9;
    const hasExplicitHorizon = typeof options.timeHorizonYears === 'number' && options.timeHorizonYears > 0;
    const horizonYears = options.timeHorizonYears ?? TOTAL_VIMSHOTTARI_YEARS;

    let currentLordIndex = firstLordIndex;
    let periodTheoreticalStartMs = theoreticalFirstStartMs;
    let periodActiveStartMs = birthTimeMs; // First Mahadasha starts strictly at birth
    let totalYearsGenerated = 0;
    let mahaIndex = 0;

    while (
      mahaIndex < targetMahadashaCount ||
      (hasExplicitHorizon && totalYearsGenerated < horizonYears)
    ) {
      const lord = DASHA_ORDER[currentLordIndex % 9];
      const nominalYears = DASHA_YEARS[lord];
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

      // Safety check to prevent runaway loops if horizonYears is very high
      if (mahaIndex >= 90) {
        break;
      }
    }

    const tree: VimshottariDashaTree = {
      dashaSystem: 'VIMSHOTTARI',
      moonLongitude: normMoon,
      moonNakshatraIndex: nakshatraDef.index,
      moonNakshatraName: nakshatraDef.name,
      moonPada,
      birthLord: firstLord,
      balanceAtBirthYears,
      elapsedAtBirthYears,
      totalCycleYears: TOTAL_VIMSHOTTARI_YEARS,
      timeHorizonYears: options.timeHorizonYears,
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
   * Convenience method to calculate Vimshottari Dasha directly from an AstroChart instance.
   */
  public calculateForChart(
    chart: AstroChart,
    options?: VimshottariCalculationOptions
  ): VimshottariDashaTree {
    const moonPlanet = chart.planets[PlanetSymbol.MOON];
    if (!moonPlanet) {
      throw new Error('Moon planet is missing from AstroChart');
    }
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    const birthDateUtc = birthIso ? new Date(birthIso) : new Date();
    return this.calculateVimshottariDasha(moonPlanet.longitude, birthDateUtc, options);
  }

  /**
   * Recursively generates child Dasha periods (Antardasha, Pratyantardasha, Sookshma, Prana).
   * Ensures 100% period continuity without gaps, overlaps, or duration discrepancies.
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
    const startIndex = DASHA_ORDER.indexOf(parentLord);
    const parentTheoreticalEndMs = Math.round(theoreticalStartMs + theoreticalDurationYears * MS_PER_YEAR);

    let childTheoreticalStartMs = theoreticalStartMs;

    for (let k = 0; k < 9; k++) {
      const subLordIndex = (startIndex + k) % 9;
      const subLord = DASHA_ORDER[subLordIndex];
      const subLordFraction = DASHA_YEARS[subLord] / TOTAL_VIMSHOTTARI_YEARS;
      const subLordNominalYears = theoreticalDurationYears * subLordFraction;

      const childTheoreticalEndMs =
        k === 8
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
   * Deterministically finds the active Dasha hierarchy for an arbitrary timestamp.
   * Returns null if targetDate is outside the calculated Dasha tree span.
   */
  public getActiveDasha(
    tree: VimshottariDashaTree,
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
