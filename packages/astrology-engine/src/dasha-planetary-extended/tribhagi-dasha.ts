import { PlanetSymbol } from '../planets/planet.types';
import type { AstroChart } from '../chart/astro-chart.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { NAKSHATRAS, getNakshatraIndex } from '../nakshatra/nakshatra';
import { DASHA_ORDER, DASHA_YEARS, TOTAL_VIMSHOTTARI_YEARS } from '../dasha/dasha-calculator';
import {
  PLANETARY_EXT_PROVISIONAL_LABEL,
  PlanetaryExtCalculationOptions,
  PlanetaryExtDashaTree,
} from './planetary-ext.types';
import {
  buildPlanetaryExtSequence,
  clampPlanetaryExtLevel,
  planetaryExtChartInputs,
  resolvePlanetaryExtCurrent,
} from './planetary-ext-common';

export const TRIBHAGI_SOURCE =
  'Tribhagi ("one-third") dasha as published in the Parashari secondary literature and implemented in ' +
  'Jagannatha Hora (P.V.R. Narasimha Rao): the 120-year Vimshottari dasha divided into three 40-year parts. ' +
  'Base Vimshottari order, years and Moon-nakshatra start: BPHS ch. 46 v.12-15 (G.C. Sharma / R. Santhanam tr.); ' +
  'antardasha proportion: BPHS (G.C. Sharma tr.) ch. 51 v.1-2.';

/** One third of the Vimshottari years of each lord (Ketu 2y4m, Venus 6y8m, Sun 2y, ...). */
export function tribhagiYears(lord: PlanetSymbol): number {
  return DASHA_YEARS[lord] / 3;
}

/**
 * Tribhagi dasha: Vimshottari lords, order and starting nakshatra, but every Mahadasha lasts one
 * third of its Vimshottari years, so the 9-lord cycle is 40 years and runs three times (120 years).
 * Balance at birth = unelapsed fraction of the Moon's nakshatra x (lord's years / 3).
 * Sub-periods: Vimshottari proportions inside each Tribhagi Mahadasha.
 */
export class TribhagiDashaCalculator {
  public calculateFromMoon(
    moonLongitude: number,
    birthDateUtc: Date,
    options: PlanetaryExtCalculationOptions = {}
  ): PlanetaryExtDashaTree {
    const maxLevel = clampPlanetaryExtLevel(options.maxLevel);
    const lon = normalizeDegree(moonLongitude);
    const nakIndex = getNakshatraIndex(lon);
    const nak = NAKSHATRAS[nakIndex - 1];
    const span = 360 / 27;
    const fractionElapsed = Math.max(0, Math.min(1, (lon - (nakIndex - 1) * span) / span));

    const startLord = nak.lord;
    const elapsedAtBirthYears = fractionElapsed * tribhagiYears(startLord);
    const balanceAtBirthYears = tribhagiYears(startLord) - elapsedAtBirthYears;

    const mahadashas = buildPlanetaryExtSequence({
      order: DASHA_ORDER,
      mdYears: tribhagiYears,
      subWeights: (l) => DASHA_YEARS[l],
      startIndex: DASHA_ORDER.indexOf(startLord),
      elapsedYears: elapsedAtBirthYears,
      count: 27,
      birthMs: birthDateUtc.getTime(),
      maxLevel,
    });

    const tree: PlanetaryExtDashaTree = {
      dashaSystem: 'TRIBHAGI',
      system: 'TRIBHAGI',
      basis: 'NAKSHATRA',
      provisional: true,
      label: PLANETARY_EXT_PROVISIONAL_LABEL,
      source: TRIBHAGI_SOURCE,
      conventionNotes: [
        'Tribhagi dasha is not among the dashas enumerated in BPHS ch. 46 of the Sharma and Santhanam translations; the one-third rule follows the secondary literature / Jagannatha Hora.',
        'Each Mahadasha = Vimshottari years / 3; the 40-year cycle of nine lords is repeated three times (27 Mahadashas, 120 years).',
        'Balance at birth = unelapsed fraction of the Moon\'s nakshatra x (first lord\'s years / 3), as in Vimshottari.',
        'Antardasha / pratyantardasha follow the Vimshottari proportion (parent x lord years / 120), starting with the parent lord.',
      ],
      eligibility: {
        isEligible: true,
        condition: 'No applicability condition is stated; usable for every chart (Vimshottari variant).',
        reason: 'Universal variant of Vimshottari dasha.',
      },
      startingLord: startLord,
      moonLongitude: lon,
      moonNakshatraIndex: nakIndex,
      moonNakshatraName: nak.name,
      balanceAtBirthYears,
      elapsedAtBirthYears,
      totalCycleYears: TOTAL_VIMSHOTTARI_YEARS / 3,
      cycles: 3,
      mahadashas,
    };
    const current = resolvePlanetaryExtCurrent(mahadashas, options.targetDate);
    if (current) tree.currentPeriod = current;
    return tree;
  }

  public calculateForChart(chart: AstroChart, options: PlanetaryExtCalculationOptions = {}): PlanetaryExtDashaTree {
    const { moonLongitude, birth } = planetaryExtChartInputs(chart, 'Tribhagi dasha');
    return this.calculateFromMoon(moonLongitude, birth, options);
  }
}
