import { PlanetSymbol } from '../planets/planet.types';
import { getNakshatraByLongitude, getPada, NAKSHATRAS } from '../nakshatra/nakshatra';
import { normalizeDegree } from '../coordinates/angular-math';
import type { AstroChart } from '../chart/astro-chart.types';
import {
  DashaPeriod,
  ActiveDashaInfo,
  ActiveDashaPeriodSummary,
  DashaCalculationOptions,
  DwisaptatiSamaDashaTree,
  ShatabdikaDashaTree,
  ChaturaseetiSamaDashaTree,
  DwadashottariDashaTree,
  PanchottariDashaTree,
} from './dasha.types';
import { MS_PER_YEAR } from './dasha-calculator';
import {
  evaluateDwisaptatiSamaEligibility,
  evaluateShatabdikaEligibility,
  evaluateChaturaseetiSamaEligibility,
  evaluateDwadashottariEligibility,
  evaluatePanchottariEligibility,
} from './dasha-eligibility';

const NAKSHATRA_SPAN = 360 / 27; // 13.333333333333334

// ============================================================================
// 1. DWISAPTATI SAMA DASHA (72-Year Cycle, 9 Planets × 8 Years)
// ============================================================================
export const DWISAPTATI_SAMA_ORDER: PlanetSymbol[] = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
  PlanetSymbol.RAHU,
  PlanetSymbol.KETU,
];

export const DWISAPTATI_SAMA_YEARS = 8;
export const TOTAL_DWISAPTATI_SAMA_YEARS = 72;

export class DwisaptatiSamaCalculator {
  public calculateDwisaptatiSamaDasha(
    moonLongitude: number,
    birthDateUtc: Date,
    options?: DashaCalculationOptions,
    chart?: AstroChart
  ): DwisaptatiSamaDashaTree {
    const opts = options || {};
    const maxLevel = Math.max(1, Math.min(3, opts.maxLevel ?? 2));
    const targetDate = opts.targetDate;

    const normMoon = normalizeDegree(moonLongitude);
    const nakshatraDef = getNakshatraByLongitude(normMoon);
    const moonPada = getPada(normMoon);

    // Count Janma Nakshatra from Moola (Nakshatra 19)
    const offsetFromMoola = ((nakshatraDef.index - 19 + 27) % 27);
    const firstLordIndex = offsetFromMoola % 9;
    const firstLord = DWISAPTATI_SAMA_ORDER[firstLordIndex];

    const degreeInNakshatra = Math.max(0, Math.min(NAKSHATRA_SPAN, normMoon - nakshatraDef.startDegree));
    const fractionElapsed = degreeInNakshatra / NAKSHATRA_SPAN;
    const fractionRemaining = Math.max(0, Math.min(1, 1.0 - fractionElapsed));

    const nominalYears = DWISAPTATI_SAMA_YEARS; // 8.0
    const elapsedAtBirthYears = fractionElapsed * nominalYears;
    const balanceAtBirthYears = fractionRemaining * nominalYears;

    const birthTimeMs = birthDateUtc.getTime();
    const theoreticalFirstStartMs = Math.round(birthTimeMs - elapsedAtBirthYears * MS_PER_YEAR);

    const mahadashas: DashaPeriod[] = [];
    const cycleCount = opts.cycleCount ?? 1;
    const targetMahaCount = cycleCount * 9;
    const hasExplicitHorizon = typeof opts.timeHorizonYears === 'number' && opts.timeHorizonYears > 0;
    const horizonYears = opts.timeHorizonYears ?? TOTAL_DWISAPTATI_SAMA_YEARS;

    let currentLordIndex = firstLordIndex;
    let periodTheoreticalStartMs = theoreticalFirstStartMs;
    let periodActiveStartMs = birthTimeMs;
    let totalYearsGenerated = 0;
    let mahaIndex = 0;

    while (
      mahaIndex < targetMahaCount ||
      (hasExplicitHorizon && totalYearsGenerated < horizonYears)
    ) {
      const lord = DWISAPTATI_SAMA_ORDER[currentLordIndex % 9];
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

      if (mahaIndex >= 90) break;
    }

    const tree: DwisaptatiSamaDashaTree = {
      dashaSystem: 'DWISAPTATI_SAMA',
      basis: 'NAKSHATRA',
      moonLongitude: normMoon,
      moonNakshatraIndex: nakshatraDef.index,
      moonNakshatraName: nakshatraDef.name,
      moonPada,
      birthLord: firstLord,
      balanceAtBirthYears,
      elapsedAtBirthYears,
      totalCycleYears: TOTAL_DWISAPTATI_SAMA_YEARS,
      timeHorizonYears: opts.timeHorizonYears,
      eligibility: chart ? evaluateDwisaptatiSamaEligibility(chart) : undefined,
      mahadashas,
    };

    if (targetDate) {
      const activeInfo = getActiveDashaGeneric(tree.mahadashas, targetDate);
      if (activeInfo) {
        tree.activeDasha = activeInfo;
        markActivePeriodsGeneric(tree.mahadashas, new Date(targetDate).getTime());
      }
    }

    return tree;
  }

  public calculateForChart(chart: AstroChart, options?: DashaCalculationOptions): DwisaptatiSamaDashaTree {
    const moonPlanet = chart.planets[PlanetSymbol.MOON];
    if (!moonPlanet) throw new Error('Moon planet is missing from AstroChart');
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    const birthDateUtc = birthIso ? new Date(birthIso) : new Date();
    return this.calculateDwisaptatiSamaDasha(moonPlanet.longitude, birthDateUtc, options, chart);
  }

  private calculateSubPeriods(
    parentLord: PlanetSymbol,
    theoreticalStartMs: number,
    parentNominalYears: number,
    activeStartMs: number,
    activeEndMs: number,
    currentLevel: number,
    maxLevel: number,
    birthTimeMs: number
  ): DashaPeriod[] {
    const children: DashaPeriod[] = [];
    const startIndex = DWISAPTATI_SAMA_ORDER.indexOf(parentLord);
    const parentTheoreticalEndMs = Math.round(theoreticalStartMs + parentNominalYears * MS_PER_YEAR);
    const subNominalYears = parentNominalYears / 9.0; // 8/9 years

    let childTheoreticalStartMs = theoreticalStartMs;

    for (let k = 0; k < 9; k++) {
      const subLordIndex = (startIndex + k) % 9;
      const subLord = DWISAPTATI_SAMA_ORDER[subLordIndex];

      const childTheoreticalEndMs =
        k === 8
          ? parentTheoreticalEndMs
          : Math.round(childTheoreticalStartMs + subNominalYears * MS_PER_YEAR);

      if (childTheoreticalEndMs > activeStartMs && childTheoreticalStartMs < activeEndMs) {
        const childActiveStartMs = Math.max(childTheoreticalStartMs, activeStartMs);
        const childActiveEndMs = Math.min(childTheoreticalEndMs, activeEndMs);
        const childActiveDurationMs = childActiveEndMs - childActiveStartMs;
        const childActiveDurationYears = childActiveDurationMs / MS_PER_YEAR;

        const isChildBirthDasha = childActiveStartMs <= birthTimeMs && birthTimeMs < childActiveEndMs;

        let childSubPeriods: DashaPeriod[] | undefined = undefined;
        if (currentLevel < maxLevel) {
          childSubPeriods = this.calculateSubPeriods(
            subLord,
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
}

// ============================================================================
// 2. SHATABDIKA DASHA (100-Year Cycle, 7 Planets)
// ============================================================================
export const SHATABDIKA_YEARS: Record<PlanetSymbol, number> = {
  [PlanetSymbol.SUN]: 5,
  [PlanetSymbol.MOON]: 5,
  [PlanetSymbol.VENUS]: 10,
  [PlanetSymbol.MARS]: 10,
  [PlanetSymbol.JUPITER]: 10,
  [PlanetSymbol.SATURN]: 30,
  [PlanetSymbol.MERCURY]: 30,
  [PlanetSymbol.RAHU]: 0,
  [PlanetSymbol.KETU]: 0,
  [PlanetSymbol.URANUS]: 0,
  [PlanetSymbol.NEPTUNE]: 0,
  [PlanetSymbol.PLUTO]: 0,
};

export const TOTAL_SHATABDIKA_YEARS = 100;

export const SHATABDIKA_ORDER: PlanetSymbol[] = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.VENUS,
  PlanetSymbol.MARS,
  PlanetSymbol.JUPITER,
  PlanetSymbol.SATURN,
  PlanetSymbol.MERCURY,
];

interface ShatabdikaSectorDef {
  nakshatraIndex: number;
  lord: PlanetSymbol;
  orderInGroup: number;
  totalInGroup: number;
}

// 27 Nakshatras mapped from Revati (27)
function getShatabdikaSectorDef(nakshatraIndex: number): ShatabdikaSectorDef {
  // 1. Revati (27), Ashwini (1), Bharani (2) -> Sun (3)
  if (nakshatraIndex === 27) return { nakshatraIndex, lord: PlanetSymbol.SUN, orderInGroup: 1, totalInGroup: 3 };
  if (nakshatraIndex === 1) return { nakshatraIndex, lord: PlanetSymbol.SUN, orderInGroup: 2, totalInGroup: 3 };
  if (nakshatraIndex === 2) return { nakshatraIndex, lord: PlanetSymbol.SUN, orderInGroup: 3, totalInGroup: 3 };

  // 2. Krittika (3), Rohini (4), Mrigashira (5) -> Moon (3)
  if (nakshatraIndex === 3) return { nakshatraIndex, lord: PlanetSymbol.MOON, orderInGroup: 1, totalInGroup: 3 };
  if (nakshatraIndex === 4) return { nakshatraIndex, lord: PlanetSymbol.MOON, orderInGroup: 2, totalInGroup: 3 };
  if (nakshatraIndex === 5) return { nakshatraIndex, lord: PlanetSymbol.MOON, orderInGroup: 3, totalInGroup: 3 };

  // 3. Ardra (6), Punarvasu (7), Pushya (8), Ashlesha (9) -> Venus (4)
  if (nakshatraIndex === 6) return { nakshatraIndex, lord: PlanetSymbol.VENUS, orderInGroup: 1, totalInGroup: 4 };
  if (nakshatraIndex === 7) return { nakshatraIndex, lord: PlanetSymbol.VENUS, orderInGroup: 2, totalInGroup: 4 };
  if (nakshatraIndex === 8) return { nakshatraIndex, lord: PlanetSymbol.VENUS, orderInGroup: 3, totalInGroup: 4 };
  if (nakshatraIndex === 9) return { nakshatraIndex, lord: PlanetSymbol.VENUS, orderInGroup: 4, totalInGroup: 4 };

  // 4. Magha (10), Purva Phalguni (11), Uttara Phalguni (12) -> Mars (3)
  if (nakshatraIndex === 10) return { nakshatraIndex, lord: PlanetSymbol.MARS, orderInGroup: 1, totalInGroup: 3 };
  if (nakshatraIndex === 11) return { nakshatraIndex, lord: PlanetSymbol.MARS, orderInGroup: 2, totalInGroup: 3 };
  if (nakshatraIndex === 12) return { nakshatraIndex, lord: PlanetSymbol.MARS, orderInGroup: 3, totalInGroup: 3 };

  // 5. Hasta (13), Chitra (14), Swati (15), Vishakha (16) -> Jupiter (4)
  if (nakshatraIndex === 13) return { nakshatraIndex, lord: PlanetSymbol.JUPITER, orderInGroup: 1, totalInGroup: 4 };
  if (nakshatraIndex === 14) return { nakshatraIndex, lord: PlanetSymbol.JUPITER, orderInGroup: 2, totalInGroup: 4 };
  if (nakshatraIndex === 15) return { nakshatraIndex, lord: PlanetSymbol.JUPITER, orderInGroup: 3, totalInGroup: 4 };
  if (nakshatraIndex === 16) return { nakshatraIndex, lord: PlanetSymbol.JUPITER, orderInGroup: 4, totalInGroup: 4 };

  // 6. Anuradha (17), Jyeshtha (18), Mula (19) -> Saturn (3)
  if (nakshatraIndex === 17) return { nakshatraIndex, lord: PlanetSymbol.SATURN, orderInGroup: 1, totalInGroup: 3 };
  if (nakshatraIndex === 18) return { nakshatraIndex, lord: PlanetSymbol.SATURN, orderInGroup: 2, totalInGroup: 3 };
  if (nakshatraIndex === 19) return { nakshatraIndex, lord: PlanetSymbol.SATURN, orderInGroup: 3, totalInGroup: 3 };

  // 7. Purva Ashadha (20) to Uttara Bhadrapada (26) -> Mercury (7)
  const mercuryOrder = nakshatraIndex - 19;
  return { nakshatraIndex, lord: PlanetSymbol.MERCURY, orderInGroup: mercuryOrder, totalInGroup: 7 };
}

export class ShatabdikaCalculator {
  public calculateShatabdikaDasha(
    moonLongitude: number,
    birthDateUtc: Date,
    options?: DashaCalculationOptions,
    chart?: AstroChart
  ): ShatabdikaDashaTree {
    const opts = options || {};
    const maxLevel = Math.max(1, Math.min(3, opts.maxLevel ?? 2));
    const targetDate = opts.targetDate;

    const normMoon = normalizeDegree(moonLongitude);
    const nakshatraDef = getNakshatraByLongitude(normMoon);
    const moonPada = getPada(normMoon);

    const sectorDef = getShatabdikaSectorDef(nakshatraDef.index);
    const firstLord = sectorDef.lord;
    const lordNominalYears = SHATABDIKA_YEARS[firstLord];
    const segmentYears = lordNominalYears / sectorDef.totalInGroup;

    const priorElapsedYears = (sectorDef.orderInGroup - 1) * segmentYears;
    const degreeInNakshatra = Math.max(0, Math.min(NAKSHATRA_SPAN, normMoon - nakshatraDef.startDegree));
    const fractionInSegment = degreeInNakshatra / NAKSHATRA_SPAN;
    const inSegmentElapsedYears = fractionInSegment * segmentYears;

    const elapsedAtBirthYears = priorElapsedYears + inSegmentElapsedYears;
    const balanceAtBirthYears = lordNominalYears - elapsedAtBirthYears;

    const birthTimeMs = birthDateUtc.getTime();
    const theoreticalFirstStartMs = Math.round(birthTimeMs - elapsedAtBirthYears * MS_PER_YEAR);

    const mahadashas: DashaPeriod[] = [];
    const firstLordIndex = SHATABDIKA_ORDER.indexOf(firstLord);
    const cycleCount = opts.cycleCount ?? 1;
    const targetMahaCount = cycleCount * 7;
    const hasExplicitHorizon = typeof opts.timeHorizonYears === 'number' && opts.timeHorizonYears > 0;
    const horizonYears = opts.timeHorizonYears ?? TOTAL_SHATABDIKA_YEARS;

    let currentLordIndex = firstLordIndex;
    let periodTheoreticalStartMs = theoreticalFirstStartMs;
    let periodActiveStartMs = birthTimeMs;
    let totalYearsGenerated = 0;
    let mahaIndex = 0;

    while (
      mahaIndex < targetMahaCount ||
      (hasExplicitHorizon && totalYearsGenerated < horizonYears)
    ) {
      const lord = SHATABDIKA_ORDER[currentLordIndex % 7];
      const nominalYears = SHATABDIKA_YEARS[lord];
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

      if (mahaIndex >= 70) break;
    }

    const tree: ShatabdikaDashaTree = {
      dashaSystem: 'SHATABDIKA',
      basis: 'NAKSHATRA',
      moonLongitude: normMoon,
      moonNakshatraIndex: nakshatraDef.index,
      moonNakshatraName: nakshatraDef.name,
      moonPada,
      birthLord: firstLord,
      balanceAtBirthYears,
      elapsedAtBirthYears,
      totalCycleYears: TOTAL_SHATABDIKA_YEARS,
      timeHorizonYears: opts.timeHorizonYears,
      eligibility: chart ? evaluateShatabdikaEligibility(chart) : undefined,
      mahadashas,
    };

    if (targetDate) {
      const activeInfo = getActiveDashaGeneric(tree.mahadashas, targetDate);
      if (activeInfo) {
        tree.activeDasha = activeInfo;
        markActivePeriodsGeneric(tree.mahadashas, new Date(targetDate).getTime());
      }
    }

    return tree;
  }

  public calculateForChart(chart: AstroChart, options?: DashaCalculationOptions): ShatabdikaDashaTree {
    const moonPlanet = chart.planets[PlanetSymbol.MOON];
    if (!moonPlanet) throw new Error('Moon planet is missing from AstroChart');
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    const birthDateUtc = birthIso ? new Date(birthIso) : new Date();
    return this.calculateShatabdikaDasha(moonPlanet.longitude, birthDateUtc, options, chart);
  }

  private calculateSubPeriods(
    parentLord: PlanetSymbol,
    theoreticalStartMs: number,
    parentNominalYears: number,
    activeStartMs: number,
    activeEndMs: number,
    currentLevel: number,
    maxLevel: number,
    birthTimeMs: number
  ): DashaPeriod[] {
    const children: DashaPeriod[] = [];
    const startIndex = SHATABDIKA_ORDER.indexOf(parentLord);
    const parentTheoreticalEndMs = Math.round(theoreticalStartMs + parentNominalYears * MS_PER_YEAR);

    let childTheoreticalStartMs = theoreticalStartMs;

    for (let k = 0; k < 7; k++) {
      const subLordIndex = (startIndex + k) % 7;
      const subLord = SHATABDIKA_ORDER[subLordIndex];
      const subFraction = SHATABDIKA_YEARS[subLord] / TOTAL_SHATABDIKA_YEARS;
      const subNominalYears = parentNominalYears * subFraction;

      const childTheoreticalEndMs =
        k === 6
          ? parentTheoreticalEndMs
          : Math.round(childTheoreticalStartMs + subNominalYears * MS_PER_YEAR);

      if (childTheoreticalEndMs > activeStartMs && childTheoreticalStartMs < activeEndMs) {
        const childActiveStartMs = Math.max(childTheoreticalStartMs, activeStartMs);
        const childActiveEndMs = Math.min(childTheoreticalEndMs, activeEndMs);
        const childActiveDurationMs = childActiveEndMs - childActiveStartMs;
        const childActiveDurationYears = childActiveDurationMs / MS_PER_YEAR;

        const isChildBirthDasha = childActiveStartMs <= birthTimeMs && birthTimeMs < childActiveEndMs;

        let childSubPeriods: DashaPeriod[] | undefined = undefined;
        if (currentLevel < maxLevel) {
          childSubPeriods = this.calculateSubPeriods(
            subLord,
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
}

// ============================================================================
// 3. CHATURASEETI SAMA DASHA (84-Year Cycle, 7 Planets × 12 Years)
// ============================================================================
export const CHATURASEETI_SAMA_ORDER: PlanetSymbol[] = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
];

export const CHATURASEETI_SAMA_YEARS = 12;
export const TOTAL_CHATURASEETI_SAMA_YEARS = 84;

export class ChaturaseetiSamaCalculator {
  public calculateChaturaseetiSamaDasha(
    moonLongitude: number,
    birthDateUtc: Date,
    options?: DashaCalculationOptions,
    chart?: AstroChart
  ): ChaturaseetiSamaDashaTree {
    const opts = options || {};
    const maxLevel = Math.max(1, Math.min(3, opts.maxLevel ?? 2));
    const targetDate = opts.targetDate;

    const normMoon = normalizeDegree(moonLongitude);
    const nakshatraDef = getNakshatraByLongitude(normMoon);
    const moonPada = getPada(normMoon);

    // Counting Janma Nakshatra from Ardra (Nakshatra 6)
    const offsetFromArdra = ((nakshatraDef.index - 6 + 27) % 27);
    const firstLordIndex = offsetFromArdra % 7;
    const firstLord = CHATURASEETI_SAMA_ORDER[firstLordIndex];

    const degreeInNakshatra = Math.max(0, Math.min(NAKSHATRA_SPAN, normMoon - nakshatraDef.startDegree));
    const fractionElapsed = degreeInNakshatra / NAKSHATRA_SPAN;
    const fractionRemaining = Math.max(0, Math.min(1, 1.0 - fractionElapsed));

    const nominalYears = CHATURASEETI_SAMA_YEARS; // 12.0
    const elapsedAtBirthYears = fractionElapsed * nominalYears;
    const balanceAtBirthYears = fractionRemaining * nominalYears;

    const birthTimeMs = birthDateUtc.getTime();
    const theoreticalFirstStartMs = Math.round(birthTimeMs - elapsedAtBirthYears * MS_PER_YEAR);

    const mahadashas: DashaPeriod[] = [];
    const cycleCount = opts.cycleCount ?? 1;
    const targetMahaCount = cycleCount * 7;
    const hasExplicitHorizon = typeof opts.timeHorizonYears === 'number' && opts.timeHorizonYears > 0;
    const horizonYears = opts.timeHorizonYears ?? TOTAL_CHATURASEETI_SAMA_YEARS;

    let currentLordIndex = firstLordIndex;
    let periodTheoreticalStartMs = theoreticalFirstStartMs;
    let periodActiveStartMs = birthTimeMs;
    let totalYearsGenerated = 0;
    let mahaIndex = 0;

    while (
      mahaIndex < targetMahaCount ||
      (hasExplicitHorizon && totalYearsGenerated < horizonYears)
    ) {
      const lord = CHATURASEETI_SAMA_ORDER[currentLordIndex % 7];
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

      if (mahaIndex >= 70) break;
    }

    const tree: ChaturaseetiSamaDashaTree = {
      dashaSystem: 'CHATURASEETI_SAMA',
      basis: 'NAKSHATRA',
      moonLongitude: normMoon,
      moonNakshatraIndex: nakshatraDef.index,
      moonNakshatraName: nakshatraDef.name,
      moonPada,
      birthLord: firstLord,
      balanceAtBirthYears,
      elapsedAtBirthYears,
      totalCycleYears: TOTAL_CHATURASEETI_SAMA_YEARS,
      timeHorizonYears: opts.timeHorizonYears,
      eligibility: chart ? evaluateChaturaseetiSamaEligibility(chart) : undefined,
      mahadashas,
    };

    if (targetDate) {
      const activeInfo = getActiveDashaGeneric(tree.mahadashas, targetDate);
      if (activeInfo) {
        tree.activeDasha = activeInfo;
        markActivePeriodsGeneric(tree.mahadashas, new Date(targetDate).getTime());
      }
    }

    return tree;
  }

  public calculateForChart(chart: AstroChart, options?: DashaCalculationOptions): ChaturaseetiSamaDashaTree {
    const moonPlanet = chart.planets[PlanetSymbol.MOON];
    if (!moonPlanet) throw new Error('Moon planet is missing from AstroChart');
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    const birthDateUtc = birthIso ? new Date(birthIso) : new Date();
    return this.calculateChaturaseetiSamaDasha(moonPlanet.longitude, birthDateUtc, options, chart);
  }

  private calculateSubPeriods(
    parentLord: PlanetSymbol,
    theoreticalStartMs: number,
    parentNominalYears: number,
    activeStartMs: number,
    activeEndMs: number,
    currentLevel: number,
    maxLevel: number,
    birthTimeMs: number
  ): DashaPeriod[] {
    const children: DashaPeriod[] = [];
    const startIndex = CHATURASEETI_SAMA_ORDER.indexOf(parentLord);
    const parentTheoreticalEndMs = Math.round(theoreticalStartMs + parentNominalYears * MS_PER_YEAR);
    const subNominalYears = parentNominalYears / 7.0; // 12/7 years

    let childTheoreticalStartMs = theoreticalStartMs;

    for (let k = 0; k < 7; k++) {
      const subLordIndex = (startIndex + k) % 7;
      const subLord = CHATURASEETI_SAMA_ORDER[subLordIndex];

      const childTheoreticalEndMs =
        k === 6
          ? parentTheoreticalEndMs
          : Math.round(childTheoreticalStartMs + subNominalYears * MS_PER_YEAR);

      if (childTheoreticalEndMs > activeStartMs && childTheoreticalStartMs < activeEndMs) {
        const childActiveStartMs = Math.max(childTheoreticalStartMs, activeStartMs);
        const childActiveEndMs = Math.min(childTheoreticalEndMs, activeEndMs);
        const childActiveDurationMs = childActiveEndMs - childActiveStartMs;
        const childActiveDurationYears = childActiveDurationMs / MS_PER_YEAR;

        const isChildBirthDasha = childActiveStartMs <= birthTimeMs && birthTimeMs < childActiveEndMs;

        let childSubPeriods: DashaPeriod[] | undefined = undefined;
        if (currentLevel < maxLevel) {
          childSubPeriods = this.calculateSubPeriods(
            subLord,
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
}

// ============================================================================
// 4. DWADASHOTTARI DASHA (112-Year Cycle, 8 Planets)
// ============================================================================
export const DWADASHOTTARI_YEARS: Record<PlanetSymbol, number> = {
  [PlanetSymbol.SUN]: 7,
  [PlanetSymbol.JUPITER]: 9,
  [PlanetSymbol.KETU]: 11,
  [PlanetSymbol.MERCURY]: 13,
  [PlanetSymbol.RAHU]: 15,
  [PlanetSymbol.MARS]: 17,
  [PlanetSymbol.SATURN]: 19,
  [PlanetSymbol.MOON]: 21,
  [PlanetSymbol.VENUS]: 0,
  [PlanetSymbol.URANUS]: 0,
  [PlanetSymbol.NEPTUNE]: 0,
  [PlanetSymbol.PLUTO]: 0,
};

export const TOTAL_DWADASHOTTARI_YEARS = 112;

export const DWADASHOTTARI_ORDER: PlanetSymbol[] = [
  PlanetSymbol.SUN,
  PlanetSymbol.JUPITER,
  PlanetSymbol.KETU,
  PlanetSymbol.MERCURY,
  PlanetSymbol.RAHU,
  PlanetSymbol.MARS,
  PlanetSymbol.SATURN,
  PlanetSymbol.MOON,
];

export class DwadashottariCalculator {
  public calculateDwadashottariDasha(
    moonLongitude: number,
    birthDateUtc: Date,
    options?: DashaCalculationOptions,
    chart?: AstroChart
  ): DwadashottariDashaTree {
    const opts = options || {};
    const maxLevel = Math.max(1, Math.min(3, opts.maxLevel ?? 2));
    const targetDate = opts.targetDate;

    const normMoon = normalizeDegree(moonLongitude);
    const nakshatraDef = getNakshatraByLongitude(normMoon);
    const moonPada = getPada(normMoon);

    // Counting from Pushya (Nakshatra 8)
    const offsetFromPushya = ((nakshatraDef.index - 8 + 27) % 27);
    const firstLordIndex = offsetFromPushya % 8;
    const firstLord = DWADASHOTTARI_ORDER[firstLordIndex];
    const nominalYears = DWADASHOTTARI_YEARS[firstLord];

    const degreeInNakshatra = Math.max(0, Math.min(NAKSHATRA_SPAN, normMoon - nakshatraDef.startDegree));
    const fractionElapsed = degreeInNakshatra / NAKSHATRA_SPAN;
    const fractionRemaining = Math.max(0, Math.min(1, 1.0 - fractionElapsed));

    const elapsedAtBirthYears = fractionElapsed * nominalYears;
    const balanceAtBirthYears = fractionRemaining * nominalYears;

    const birthTimeMs = birthDateUtc.getTime();
    const theoreticalFirstStartMs = Math.round(birthTimeMs - elapsedAtBirthYears * MS_PER_YEAR);

    const mahadashas: DashaPeriod[] = [];
    const cycleCount = opts.cycleCount ?? 1;
    const targetMahaCount = cycleCount * 8;
    const hasExplicitHorizon = typeof opts.timeHorizonYears === 'number' && opts.timeHorizonYears > 0;
    const horizonYears = opts.timeHorizonYears ?? TOTAL_DWADASHOTTARI_YEARS;

    let currentLordIndex = firstLordIndex;
    let periodTheoreticalStartMs = theoreticalFirstStartMs;
    let periodActiveStartMs = birthTimeMs;
    let totalYearsGenerated = 0;
    let mahaIndex = 0;

    while (
      mahaIndex < targetMahaCount ||
      (hasExplicitHorizon && totalYearsGenerated < horizonYears)
    ) {
      const lord = DWADASHOTTARI_ORDER[currentLordIndex % 8];
      const mahaNominalYears = DWADASHOTTARI_YEARS[lord];
      const isBirthMaha = (mahaIndex === 0);

      const periodTheoreticalEndMs = Math.round(periodTheoreticalStartMs + mahaNominalYears * MS_PER_YEAR);
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
          mahaNominalYears,
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
        nominalYears: mahaNominalYears,
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

      if (mahaIndex >= 80) break;
    }

    const tree: DwadashottariDashaTree = {
      dashaSystem: 'DWADASHOTTARI',
      basis: 'NAKSHATRA',
      moonLongitude: normMoon,
      moonNakshatraIndex: nakshatraDef.index,
      moonNakshatraName: nakshatraDef.name,
      moonPada,
      birthLord: firstLord,
      balanceAtBirthYears,
      elapsedAtBirthYears,
      totalCycleYears: TOTAL_DWADASHOTTARI_YEARS,
      timeHorizonYears: opts.timeHorizonYears,
      eligibility: chart ? evaluateDwadashottariEligibility(chart) : undefined,
      mahadashas,
    };

    if (targetDate) {
      const activeInfo = getActiveDashaGeneric(tree.mahadashas, targetDate);
      if (activeInfo) {
        tree.activeDasha = activeInfo;
        markActivePeriodsGeneric(tree.mahadashas, new Date(targetDate).getTime());
      }
    }

    return tree;
  }

  public calculateForChart(chart: AstroChart, options?: DashaCalculationOptions): DwadashottariDashaTree {
    const moonPlanet = chart.planets[PlanetSymbol.MOON];
    if (!moonPlanet) throw new Error('Moon planet is missing from AstroChart');
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    const birthDateUtc = birthIso ? new Date(birthIso) : new Date();
    return this.calculateDwadashottariDasha(moonPlanet.longitude, birthDateUtc, options, chart);
  }

  private calculateSubPeriods(
    parentLord: PlanetSymbol,
    theoreticalStartMs: number,
    parentNominalYears: number,
    activeStartMs: number,
    activeEndMs: number,
    currentLevel: number,
    maxLevel: number,
    birthTimeMs: number
  ): DashaPeriod[] {
    const children: DashaPeriod[] = [];
    const startIndex = DWADASHOTTARI_ORDER.indexOf(parentLord);
    const parentTheoreticalEndMs = Math.round(theoreticalStartMs + parentNominalYears * MS_PER_YEAR);

    let childTheoreticalStartMs = theoreticalStartMs;

    for (let k = 0; k < 8; k++) {
      const subLordIndex = (startIndex + k) % 8;
      const subLord = DWADASHOTTARI_ORDER[subLordIndex];
      const subFraction = DWADASHOTTARI_YEARS[subLord] / TOTAL_DWADASHOTTARI_YEARS;
      const subNominalYears = parentNominalYears * subFraction;

      const childTheoreticalEndMs =
        k === 7
          ? parentTheoreticalEndMs
          : Math.round(childTheoreticalStartMs + subNominalYears * MS_PER_YEAR);

      if (childTheoreticalEndMs > activeStartMs && childTheoreticalStartMs < activeEndMs) {
        const childActiveStartMs = Math.max(childTheoreticalStartMs, activeStartMs);
        const childActiveEndMs = Math.min(childTheoreticalEndMs, activeEndMs);
        const childActiveDurationMs = childActiveEndMs - childActiveStartMs;
        const childActiveDurationYears = childActiveDurationMs / MS_PER_YEAR;

        const isChildBirthDasha = childActiveStartMs <= birthTimeMs && birthTimeMs < childActiveEndMs;

        let childSubPeriods: DashaPeriod[] | undefined = undefined;
        if (currentLevel < maxLevel) {
          childSubPeriods = this.calculateSubPeriods(
            subLord,
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
}

// ============================================================================
// 5. PANCHOTTARI DASHA (105-Year Cycle, 7 Planets)
// ============================================================================
export const PANCHOTTARI_YEARS: Record<PlanetSymbol, number> = {
  [PlanetSymbol.SUN]: 12,
  [PlanetSymbol.MERCURY]: 13,
  [PlanetSymbol.SATURN]: 14,
  [PlanetSymbol.MARS]: 15,
  [PlanetSymbol.VENUS]: 16,
  [PlanetSymbol.MOON]: 17,
  [PlanetSymbol.JUPITER]: 18,
  [PlanetSymbol.RAHU]: 0,
  [PlanetSymbol.KETU]: 0,
  [PlanetSymbol.URANUS]: 0,
  [PlanetSymbol.NEPTUNE]: 0,
  [PlanetSymbol.PLUTO]: 0,
};

export const TOTAL_PANCHOTTARI_YEARS = 105;

export const PANCHOTTARI_ORDER: PlanetSymbol[] = [
  PlanetSymbol.SUN,
  PlanetSymbol.MERCURY,
  PlanetSymbol.SATURN,
  PlanetSymbol.MARS,
  PlanetSymbol.VENUS,
  PlanetSymbol.MOON,
  PlanetSymbol.JUPITER,
];

export class PanchottariCalculator {
  public calculatePanchottariDasha(
    moonLongitude: number,
    birthDateUtc: Date,
    options?: DashaCalculationOptions,
    chart?: AstroChart
  ): PanchottariDashaTree {
    const opts = options || {};
    const maxLevel = Math.max(1, Math.min(3, opts.maxLevel ?? 2));
    const targetDate = opts.targetDate;

    const normMoon = normalizeDegree(moonLongitude);
    const nakshatraDef = getNakshatraByLongitude(normMoon);
    const moonPada = getPada(normMoon);

    // Counting from Anuradha (Nakshatra 17)
    const offsetFromAnuradha = ((nakshatraDef.index - 17 + 27) % 27);
    const firstLordIndex = offsetFromAnuradha % 7;
    const firstLord = PANCHOTTARI_ORDER[firstLordIndex];
    const nominalYears = PANCHOTTARI_YEARS[firstLord];

    const degreeInNakshatra = Math.max(0, Math.min(NAKSHATRA_SPAN, normMoon - nakshatraDef.startDegree));
    const fractionElapsed = degreeInNakshatra / NAKSHATRA_SPAN;
    const fractionRemaining = Math.max(0, Math.min(1, 1.0 - fractionElapsed));

    const elapsedAtBirthYears = fractionElapsed * nominalYears;
    const balanceAtBirthYears = fractionRemaining * nominalYears;

    const birthTimeMs = birthDateUtc.getTime();
    const theoreticalFirstStartMs = Math.round(birthTimeMs - elapsedAtBirthYears * MS_PER_YEAR);

    const mahadashas: DashaPeriod[] = [];
    const cycleCount = opts.cycleCount ?? 1;
    const targetMahaCount = cycleCount * 7;
    const hasExplicitHorizon = typeof opts.timeHorizonYears === 'number' && opts.timeHorizonYears > 0;
    const horizonYears = opts.timeHorizonYears ?? TOTAL_PANCHOTTARI_YEARS;

    let currentLordIndex = firstLordIndex;
    let periodTheoreticalStartMs = theoreticalFirstStartMs;
    let periodActiveStartMs = birthTimeMs;
    let totalYearsGenerated = 0;
    let mahaIndex = 0;

    while (
      mahaIndex < targetMahaCount ||
      (hasExplicitHorizon && totalYearsGenerated < horizonYears)
    ) {
      const lord = PANCHOTTARI_ORDER[currentLordIndex % 7];
      const mahaNominalYears = PANCHOTTARI_YEARS[lord];
      const isBirthMaha = (mahaIndex === 0);

      const periodTheoreticalEndMs = Math.round(periodTheoreticalStartMs + mahaNominalYears * MS_PER_YEAR);
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
          mahaNominalYears,
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
        nominalYears: mahaNominalYears,
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

      if (mahaIndex >= 70) break;
    }

    const tree: PanchottariDashaTree = {
      dashaSystem: 'PANCHOTTARI',
      basis: 'NAKSHATRA',
      moonLongitude: normMoon,
      moonNakshatraIndex: nakshatraDef.index,
      moonNakshatraName: nakshatraDef.name,
      moonPada,
      birthLord: firstLord,
      balanceAtBirthYears,
      elapsedAtBirthYears,
      totalCycleYears: TOTAL_PANCHOTTARI_YEARS,
      timeHorizonYears: opts.timeHorizonYears,
      eligibility: chart ? evaluatePanchottariEligibility(chart) : undefined,
      mahadashas,
    };

    if (targetDate) {
      const activeInfo = getActiveDashaGeneric(tree.mahadashas, targetDate);
      if (activeInfo) {
        tree.activeDasha = activeInfo;
        markActivePeriodsGeneric(tree.mahadashas, new Date(targetDate).getTime());
      }
    }

    return tree;
  }

  public calculateForChart(chart: AstroChart, options?: DashaCalculationOptions): PanchottariDashaTree {
    const moonPlanet = chart.planets[PlanetSymbol.MOON];
    if (!moonPlanet) throw new Error('Moon planet is missing from AstroChart');
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    const birthDateUtc = birthIso ? new Date(birthIso) : new Date();
    return this.calculatePanchottariDasha(moonPlanet.longitude, birthDateUtc, options, chart);
  }

  private calculateSubPeriods(
    parentLord: PlanetSymbol,
    theoreticalStartMs: number,
    parentNominalYears: number,
    activeStartMs: number,
    activeEndMs: number,
    currentLevel: number,
    maxLevel: number,
    birthTimeMs: number
  ): DashaPeriod[] {
    const children: DashaPeriod[] = [];
    const startIndex = PANCHOTTARI_ORDER.indexOf(parentLord);
    const parentTheoreticalEndMs = Math.round(theoreticalStartMs + parentNominalYears * MS_PER_YEAR);

    let childTheoreticalStartMs = theoreticalStartMs;

    for (let k = 0; k < 7; k++) {
      const subLordIndex = (startIndex + k) % 7;
      const subLord = PANCHOTTARI_ORDER[subLordIndex];
      const subFraction = PANCHOTTARI_YEARS[subLord] / TOTAL_PANCHOTTARI_YEARS;
      const subNominalYears = parentNominalYears * subFraction;

      const childTheoreticalEndMs =
        k === 6
          ? parentTheoreticalEndMs
          : Math.round(childTheoreticalStartMs + subNominalYears * MS_PER_YEAR);

      if (childTheoreticalEndMs > activeStartMs && childTheoreticalStartMs < activeEndMs) {
        const childActiveStartMs = Math.max(childTheoreticalStartMs, activeStartMs);
        const childActiveEndMs = Math.min(childTheoreticalEndMs, activeEndMs);
        const childActiveDurationMs = childActiveEndMs - childActiveStartMs;
        const childActiveDurationYears = childActiveDurationMs / MS_PER_YEAR;

        const isChildBirthDasha = childActiveStartMs <= birthTimeMs && birthTimeMs < childActiveEndMs;

        let childSubPeriods: DashaPeriod[] | undefined = undefined;
        if (currentLevel < maxLevel) {
          childSubPeriods = this.calculateSubPeriods(
            subLord,
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
}

// ============================================================================
// HELPER FUNCTIONS FOR ACTIVE PERIOD & HIERARCHY TAGGING
// ============================================================================
export function getActiveDashaGeneric(
  mahadashas: DashaPeriod[],
  targetDate: Date | string
): ActiveDashaInfo | null {
  const targetDateObj = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const targetMs = targetDateObj.getTime();

  if (isNaN(targetMs) || mahadashas.length === 0) {
    return null;
  }

  const firstMahaStartMs = new Date(mahadashas[0].startDateIso).getTime();
  const lastMahaEndMs = new Date(mahadashas[mahadashas.length - 1].endDateIso).getTime();

  if (targetMs < firstMahaStartMs || targetMs >= lastMahaEndMs) {
    return null;
  }

  const activeMaha = mahadashas.find((m) => {
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

  const formatSegment = (item: PlanetSymbol | string): string =>
    typeof item === 'string'
      ? item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()
      : item;

  const description = path.map(formatSegment).join(' - ');

  return {
    targetDateIso: targetDateObj.toISOString(),
    mahadasha: mahaSummary,
    antardasha: antarSummary,
    pratyantardasha: pratyantarSummary,
    path,
    description,
  };
}

export function markActivePeriodsGeneric(periods: DashaPeriod[], targetMs: number): void {
  for (const period of periods) {
    const s = new Date(period.startDateIso).getTime();
    const e = new Date(period.endDateIso).getTime();
    if (targetMs >= s && targetMs < e) {
      period.isActive = true;
      if (period.subPeriods) {
        markActivePeriodsGeneric(period.subPeriods, targetMs);
      }
    } else {
      period.isActive = false;
    }
  }
}
