import { PlanetSymbol } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { NAKSHATRAS, getNakshatraIndex, getPada } from '../nakshatra/nakshatra';
import type { AstroChart } from '../chart/astro-chart.types';
import { MS_PER_YEAR } from './dasha-calculator';
import { DashaCalculationOptions, DashaEligibilityResult, YoginiDashaPeriod, YoginiDashaTree } from './dasha.types';
import { buildPeriodBase, buildSubPeriods, resolveCurrentPeriod, PeriodTreeContext } from './period-tree-builder';

/**
 * Yogini Dasha (BPHS, Yogini Dasha chapter; decision log YOG-001..YOG-005).
 *
 * - 8 Yoginis in fixed order, the n-th ruling n years (1+2+...+8 = 36).
 * - Starting Yogini = (Janma Nakshatra number + 3) mod 8, remainder 0 meaning the 8th (Sankata).
 * - Balance at birth = unelapsed fraction of the Moon's nakshatra x years of the starting Yogini.
 * - Antardasha / Pratyantardasha: start with the parent's own Yogini and run through all 8 in
 *   order, each lasting parentYears x childYears / 36 (the Vimshottari proportional rule).
 */
export const YOGINI_TOTAL_YEARS = 36;

export interface YoginiDefinition {
  number: number;     // 1..8, equals the Yogini's years
  name: string;
  lord: PlanetSymbol;
}

export const YOGINIS: YoginiDefinition[] = [
  { number: 1, name: 'Mangala', lord: PlanetSymbol.MOON },
  { number: 2, name: 'Pingala', lord: PlanetSymbol.SUN },
  { number: 3, name: 'Dhanya', lord: PlanetSymbol.JUPITER },
  { number: 4, name: 'Bhramari', lord: PlanetSymbol.MARS },
  { number: 5, name: 'Bhadrika', lord: PlanetSymbol.MERCURY },
  { number: 6, name: 'Ulka', lord: PlanetSymbol.SATURN },
  { number: 7, name: 'Siddha', lord: PlanetSymbol.VENUS },
  { number: 8, name: 'Sankata', lord: PlanetSymbol.RAHU },
];

/** Starting Yogini number (1..8) for a Janma Nakshatra number (1..27). */
export function getStartingYoginiNumber(nakshatraIndex: number): number {
  const r = (nakshatraIndex + 3) % 8;
  return r === 0 ? 8 : r;
}

export function evaluateYoginiEligibility(): DashaEligibilityResult {
  return {
    isEligible: true,
    system: 'YOGINI',
    tradition: 'PARASHARA',
    eligibilityMethod: 'UNIVERSAL_PARASHARA_YOGINI',
    reason: 'Yogini Dasha is a universal Nakshatra Dasha applicable to every chart.',
  };
}

export class YoginiDashaCalculator {
  public calculateYoginiDasha(
    moonLongitude: number,
    birthDateUtc: Date,
    options?: DashaCalculationOptions
  ): YoginiDashaTree {
    const opts = options || {};
    const maxLevel = Math.max(1, Math.min(3, opts.maxLevel ?? 3));
    const cycles = Math.max(1, Math.min(4, opts.cycleCount ?? 1));

    const lon = normalizeDegree(moonLongitude);
    const nakIndex = getNakshatraIndex(lon);
    const nak = NAKSHATRAS[nakIndex - 1];
    const nakSpan = 360 / 27;
    const fractionElapsed = Math.max(0, Math.min(1, (lon - (nakIndex - 1) * nakSpan) / nakSpan));

    const startNumber = getStartingYoginiNumber(nakIndex);
    const startYogini = YOGINIS[startNumber - 1];
    const elapsedAtBirthYears = fractionElapsed * startYogini.number;
    const balanceAtBirthYears = startYogini.number - elapsedAtBirthYears;

    const birthMs = birthDateUtc.getTime();
    const ctx: PeriodTreeContext<number, YoginiDashaPeriod> = {
      birthMs,
      maxLevel,
      childrenOf: (parentNumber) =>
        Array.from({ length: 8 }, (_, k) => {
          const n = ((parentNumber - 1 + k) % 8) + 1;
          return { key: n, weight: n };
        }),
      decorate: (n, base) => ({ ...base, yoginiName: YOGINIS[n - 1].name, yoginiNumber: n }),
    };
    const lordOf = (n: number) => YOGINIS[n - 1].lord;

    const mahadashas: YoginiDashaPeriod[] = [];
    let cursorMs = Math.round(birthMs - elapsedAtBirthYears * MS_PER_YEAR);
    for (let i = 0; i < cycles * 8; i++) {
      const n = ((startNumber - 1 + i) % 8) + 1;
      const years = n;
      const endMs = Math.round(cursorMs + years * MS_PER_YEAR);
      const base = buildPeriodBase(1, i + 1, lordOf(n), cursorMs, endMs, years, birthMs);
      const md = ctx.decorate(n, base);
      const subs = buildSubPeriods(ctx, n, cursorMs, years, 2, lordOf);
      if (subs.length > 0) md.subPeriods = subs;
      mahadashas.push(md);
      cursorMs = endMs;
    }

    const tree: YoginiDashaTree = {
      dashaSystem: 'YOGINI',
      system: 'YOGINI',
      basis: 'NAKSHATRA',
      totalCycleYears: YOGINI_TOTAL_YEARS,
      moonLongitude: lon,
      moonNakshatraIndex: nakIndex,
      moonNakshatraName: nak.name,
      moonPada: getPada(lon),
      startingYogini: startYogini.name,
      startingYoginiNumber: startNumber,
      startingLord: startYogini.lord,
      nodeLordConvention: 'SANKATA_RAHU',
      balanceAtBirthYears,
      elapsedAtBirthYears,
      cycles,
      mahadashas,
    };

    const current = resolveCurrentPeriod(mahadashas, opts.targetDate);
    if (current) tree.currentPeriod = current;
    return tree;
  }

  public calculateForChart(chart: AstroChart, options?: DashaCalculationOptions): YoginiDashaTree {
    const moon = chart.planets[PlanetSymbol.MOON];
    if (!moon || typeof moon.longitude !== 'number') {
      throw new Error('Yogini Dasha requires the natal Moon longitude.');
    }
    const birthIso = chart.metadata?.normalizedTime?.utcIsoString;
    if (!birthIso) {
      throw new Error('Yogini Dasha requires the normalized UTC birth instant.');
    }
    return this.calculateYoginiDasha(moon.longitude, new Date(birthIso), options);
  }
}
