import { PlanetSymbol } from '../planets/planet.types';
import type { AstroChart } from '../chart/astro-chart.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { NAKSHATRAS, getNakshatraIndex } from '../nakshatra/nakshatra';
import { getAshtottariSectorByLongitude } from '../dasha/ashtottari-sectors';
import {
  PLANETARY_EXT_PROVISIONAL_LABEL,
  PlanetaryExtCalculationOptions,
  PlanetaryExtDashaTree,
  PlanetaryExtEligibility,
} from './planetary-ext.types';
import {
  buildPlanetaryExtSequence,
  clampPlanetaryExtLevel,
  planetaryExtChartInputs,
  resolvePlanetaryExtCurrent,
} from './planetary-ext-common';

export const SHASTIHAYANI_SOURCE =
  'BPHS ch. 46 v.40-41 (R. Santhanam tr., Ranjan Publications; G.C. Sharma tr.): applicable when the Sun is in the ' +
  'Lagna; lords Jupiter, Sun, Mars, Moon, Mercury, Venus, Saturn, Rahu; Jupiter, Sun and Mars 10 years, the rest 6 ' +
  '(60 years); nakshatra allocation from Ashwini including Abhijit as tabulated in the slokas (table as published by ' +
  'S. Adawal, "Shashtihayani dasa"); balance "as adopted for the Ashtottari system" (Santhanam\'s example, v.40-41).';

/** Shastihayani lords in dasha order (BPHS 46.40-41). */
export const SHASTIHAYANI_ORDER: PlanetSymbol[] = [
  PlanetSymbol.JUPITER,
  PlanetSymbol.SUN,
  PlanetSymbol.MARS,
  PlanetSymbol.MOON,
  PlanetSymbol.MERCURY,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
  PlanetSymbol.RAHU,
];

export const SHASTIHAYANI_TOTAL_YEARS = 60;

export function shastihayaniYears(lord: PlanetSymbol): number {
  return lord === PlanetSymbol.JUPITER || lord === PlanetSymbol.SUN || lord === PlanetSymbol.MARS ? 10 : 6;
}

/**
 * Nakshatra allocation (28 sectors incl. Abhijit, sector index 1 = Ashwini ... 22 = Abhijit ... 28 = Revati),
 * counted from Ashwini in the dasha order with alternating groups of 3 and 4:
 * Jupiter Ashwini-Krittika (3), Sun Rohini-Punarvasu (4), Mars Pushya-Magha (3),
 * Moon P.Phalguni-Chitra (4), Mercury Swati-Anuradha (3), Venus Jyeshtha-U.Ashadha (4),
 * Saturn Abhijit-Dhanishta (3), Rahu Shatabhisha-Revati (4).
 */
export const SHASTIHAYANI_GROUPS: Array<{ lord: PlanetSymbol; sectors: string[] }> = [
  { lord: PlanetSymbol.JUPITER, sectors: ['Ashwini', 'Bharani', 'Krittika'] },
  { lord: PlanetSymbol.SUN, sectors: ['Rohini', 'Mrigashira', 'Ardra', 'Punarvasu'] },
  { lord: PlanetSymbol.MARS, sectors: ['Pushya', 'Ashlesha', 'Magha'] },
  { lord: PlanetSymbol.MOON, sectors: ['Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra'] },
  { lord: PlanetSymbol.MERCURY, sectors: ['Swati', 'Vishakha', 'Anuradha'] },
  { lord: PlanetSymbol.VENUS, sectors: ['Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha'] },
  { lord: PlanetSymbol.SATURN, sectors: ['Abhijit', 'Shravana', 'Dhanishta'] },
  { lord: PlanetSymbol.RAHU, sectors: ['Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'] },
];

export interface ShastihayaniSectorInfo {
  sectorName: string;
  lord: PlanetSymbol;
  orderInGroup: number;   // 1-based
  groupSize: number;
  fractionInSector: number;
  elapsedYears: number;
  balanceYears: number;
}

/**
 * Locates the Moon in the 28-sector (Abhijit) zodiac and computes the balance:
 * each sector of a lord's group carries lordYears / groupSize years; the elapsed part of the first
 * dasha = completed sectors of the group + elapsed fraction of the current sector.
 * Sector boundaries (incl. Abhijit = last pada of U.Ashadha + first 1/15 of Shravana) are the engine's
 * Ashtottari 28-sector table, the same Abhijit convention BPHS uses for Ashtottari.
 */
export function shastihayaniSectorOf(moonLongitude: number): ShastihayaniSectorInfo {
  const sector = getAshtottariSectorByLongitude(moonLongitude);
  const lon = normalizeDegree(moonLongitude);
  const group = SHASTIHAYANI_GROUPS.find((g) => g.sectors.includes(sector.name));
  if (!group) throw new Error(`Shastihayani: no group for sector ${sector.name}`);
  const orderInGroup = group.sectors.indexOf(sector.name) + 1;
  const fractionInSector = Math.max(0, Math.min(1, (lon - sector.startDegree) / sector.spanDegrees));
  const years = shastihayaniYears(group.lord);
  const perSector = years / group.sectors.length;
  const elapsedYears = (orderInGroup - 1 + fractionInSector) * perSector;
  return {
    sectorName: sector.name,
    lord: group.lord,
    orderInGroup,
    groupSize: group.sectors.length,
    fractionInSector,
    elapsedYears,
    balanceYears: years - elapsedYears,
  };
}

/** BPHS 46.40: "This Dasa may be adopted in cases where the Sun is posited in the Ascendant." */
export function evaluateShastihayaniEligibility(chart: AstroChart): PlanetaryExtEligibility {
  const condition = 'Sun in the Lagna (BPHS 46.40).';
  const lagnaSign = chart.ascendant?.rashiIndex;
  const sunSign = chart.planets[PlanetSymbol.SUN]?.rashiIndex;
  if (!lagnaSign || !sunSign) {
    return { isEligible: false, condition, reason: 'Lagna or Sun sign unavailable (birth time required).' };
  }
  const ok = lagnaSign === sunSign;
  return {
    isEligible: ok,
    condition,
    reason: ok ? 'The Sun occupies the Lagna sign.' : 'The Sun does not occupy the Lagna sign.',
    criteria: { lagnaSign, sunSign },
  };
}

export class ShastihayaniDashaCalculator {
  public calculateFromMoon(
    moonLongitude: number,
    birthDateUtc: Date,
    options: PlanetaryExtCalculationOptions = {},
    eligibility?: PlanetaryExtEligibility
  ): PlanetaryExtDashaTree {
    const maxLevel = clampPlanetaryExtLevel(options.maxLevel);
    const lon = normalizeDegree(moonLongitude);
    const s = shastihayaniSectorOf(lon);
    const nakIndex = getNakshatraIndex(lon);

    const mahadashas = buildPlanetaryExtSequence({
      order: SHASTIHAYANI_ORDER,
      mdYears: shastihayaniYears,
      subWeights: shastihayaniYears,
      startIndex: SHASTIHAYANI_ORDER.indexOf(s.lord),
      elapsedYears: s.elapsedYears,
      count: 16, // two 60-year cycles, covering a 120-year span
      birthMs: birthDateUtc.getTime(),
      maxLevel,
    });

    const tree: PlanetaryExtDashaTree = {
      dashaSystem: 'SHASTIHAYANI',
      system: 'SHASTIHAYANI',
      basis: 'NAKSHATRA',
      provisional: true,
      label: PLANETARY_EXT_PROVISIONAL_LABEL,
      source: SHASTIHAYANI_SOURCE,
      conventionNotes: [
        'Nakshatra allocation: Jupiter 3, Sun 4, Mars 3, Moon 4, Mercury 3, Venus 4, Saturn 3, Rahu 4 nakshatras counted from Ashwini with Abhijit (28 sectors). Santhanam\'s worked example (Janma nakshatra Mrigashira -> Sun dasha, Sun rules 4 nakshatras, Rohini already elapsed) agrees.',
        'Alternative: the G.C. Sharma translation prints a non-contiguous table (e.g. Jupiter with Punarvasu, Mars with Revati) that omits Chitra; not adopted because it does not cover the zodiac.',
        'Balance: each nakshatra of a lord\'s group carries lordYears / groupSize years (Ashtottari method); Abhijit = last pada of U.Ashadha + first 1/15 of Shravana (engine Ashtottari sectors), so U.Ashadha and Shravana use their reduced spans.',
        '"Sun in Lagna" is read as the Sun in the Lagna sign (whole-sign). The dasha is calculated for every chart; eligibility is reported, not enforced.',
        'Two 60-year cycles are generated. Antardasha: parent x lord years / 60, starting with the parent lord (BPHS ch. 51 v.1-2).',
      ],
      eligibility: eligibility ?? {
        isEligible: false,
        condition: 'Sun in the Lagna (BPHS 46.40).',
        reason: 'Not evaluated (no chart supplied).',
      },
      startingLord: s.lord,
      moonLongitude: lon,
      moonNakshatraIndex: nakIndex,
      moonNakshatraName: NAKSHATRAS[nakIndex - 1].name,
      sectorName: s.sectorName,
      balanceAtBirthYears: s.balanceYears,
      elapsedAtBirthYears: s.elapsedYears,
      totalCycleYears: SHASTIHAYANI_TOTAL_YEARS,
      cycles: 2,
      mahadashas,
    };
    const current = resolvePlanetaryExtCurrent(mahadashas, options.targetDate);
    if (current) tree.currentPeriod = current;
    return tree;
  }

  public calculateForChart(chart: AstroChart, options: PlanetaryExtCalculationOptions = {}): PlanetaryExtDashaTree {
    const { moonLongitude, birth } = planetaryExtChartInputs(chart, 'Shastihayani dasha');
    return this.calculateFromMoon(moonLongitude, birth, options, evaluateShastihayaniEligibility(chart));
  }
}
