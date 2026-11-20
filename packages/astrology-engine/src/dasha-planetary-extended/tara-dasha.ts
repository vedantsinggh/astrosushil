import { PlanetSymbol, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import type { AstroChart } from '../chart/astro-chart.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { NAKSHATRAS, getNakshatraIndex } from '../nakshatra/nakshatra';
import { DASHA_ORDER, DASHA_YEARS, TOTAL_VIMSHOTTARI_YEARS } from '../dasha/dasha-calculator';
import { ShadbalaCalculator } from '../strength/shadbala-calculator';
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
  planetaryExtHouseFrom,
  resolvePlanetaryExtCurrent,
} from './planetary-ext-common';

export const TARA_DASHA_SOURCE =
  'BPHS ch. 46 v.207-209 (R. Santhanam tr., incl. his illustrative table; G.C. Sharma tr.): "Tara Dasa is like ' +
  'Vimsottari Dasa. Janma, Sampat etc. in their order replace the Sun, Moon etc. housed in Kendras. Applied only ' +
  'where there are planets in Kendras. If there are a number of planets, the first Dasa belongs to the strongest." ' +
  'Strength: Shadbala, BPHS ch. 27.';

/** The nine taras, attached in order to the Vimshottari sequence beginning with the Sun (Santhanam's table). */
export const TARA_NAMES = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyari', 'Sadhana', 'Vadha', 'Maitra', 'Atimaitra'];

/** Tara name replacing a planet: Sun = Janma, Moon = Sampat, Mars = Vipat, ... Venus = Atimaitra. */
export function taraNameOf(lord: PlanetSymbol): string {
  const sunIdx = DASHA_ORDER.indexOf(PlanetSymbol.SUN);
  const i = DASHA_ORDER.indexOf(lord);
  return TARA_NAMES[(i - sunIdx + 9) % 9];
}

export interface TaraKendraPlanet {
  planet: PlanetSymbol;
  house: number;
  /** Shadbala total in rupas; null for the nodes (BPHS Shadbala covers the seven grahas only). */
  shadbalaRupas: number | null;
}

/**
 * Picks the first Tara dasha lord: the strongest planet in a kendra (1/4/7/10 from the Lagna sign) by
 * Shadbala. Returns null when no graha with a defined Shadbala is in a kendra.
 */
export function selectTaraStartingLord(kendraPlanets: TaraKendraPlanet[]): PlanetSymbol | null {
  const ranked = kendraPlanets
    .filter((k) => typeof k.shadbalaRupas === 'number')
    .sort((a, b) => (b.shadbalaRupas as number) - (a.shadbalaRupas as number) || MANDATORY_VEDIC_PLANETS.indexOf(a.planet as never) - MANDATORY_VEDIC_PLANETS.indexOf(b.planet as never));
  return ranked.length > 0 ? ranked[0].planet : null;
}

export class TaraDashaCalculator {
  constructor(private readonly shadbala: ShadbalaCalculator = new ShadbalaCalculator()) {}

  /** Planets in kendras from the Lagna sign, with their Shadbala (rupas). */
  public kendraPlanets(chart: AstroChart): TaraKendraPlanet[] {
    const lagnaSign = chart.ascendant?.rashiIndex;
    if (!lagnaSign) return [];
    const report = this.shadbala.calculateShadbala(chart);
    const out: TaraKendraPlanet[] = [];
    for (const p of MANDATORY_VEDIC_PLANETS) {
      const pos = chart.planets[p];
      if (!pos) continue;
      const house = planetaryExtHouseFrom(lagnaSign, pos.rashiIndex);
      if (house % 3 !== 1) continue; // 1, 4, 7, 10
      const rupas = report.planets[p]?.totalRupas;
      out.push({ planet: p, house, shadbalaRupas: typeof rupas === 'number' ? rupas : null });
    }
    return out;
  }

  /**
   * Builds the Tara dasha from a given kendra-planet list (exposed for deterministic tests).
   * Periods run from birth with full Vimshottari years (no nakshatra balance), in the Vimshottari order
   * starting with the strongest kendra planet, as in Santhanam's illustrative table.
   */
  public calculateFromKendraPlanets(
    kendra: TaraKendraPlanet[],
    moonLongitude: number,
    birthDateUtc: Date,
    options: PlanetaryExtCalculationOptions = {}
  ): PlanetaryExtDashaTree {
    const maxLevel = clampPlanetaryExtLevel(options.maxLevel);
    const lon = normalizeDegree(moonLongitude);
    const nakIndex = getNakshatraIndex(lon);
    const startLord = selectTaraStartingLord(kendra);
    const condition = 'At least one planet in a kendra (1st, 4th, 7th or 10th) from the Lagna (BPHS 46.207-209).';
    let eligibility: PlanetaryExtEligibility;
    if (kendra.length === 0) {
      eligibility = { isEligible: false, condition, reason: 'No planet occupies a kendra from the Lagna.' };
    } else if (!startLord) {
      eligibility = {
        isEligible: false,
        condition,
        reason: 'Only Rahu/Ketu occupy kendras; BPHS Shadbala is not defined for the nodes, so the strongest planet cannot be determined.',
      };
    } else {
      eligibility = {
        isEligible: true,
        condition,
        reason: `${kendra.length} planet(s) in kendras; strongest by Shadbala: ${startLord}.`,
        criteria: { kendraPlanetCount: kendra.length, startingLord: startLord },
      };
    }

    const mahadashas = startLord
      ? buildPlanetaryExtSequence({
          order: DASHA_ORDER,
          mdYears: (l) => DASHA_YEARS[l],
          subWeights: (l) => DASHA_YEARS[l],
          startIndex: DASHA_ORDER.indexOf(startLord),
          elapsedYears: 0,
          count: 9,
          birthMs: birthDateUtc.getTime(),
          maxLevel,
          decorate: (l, node) => ({ ...node, taraName: taraNameOf(l) }),
        })
      : [];

    const tree: PlanetaryExtDashaTree = {
      dashaSystem: 'TARA',
      system: 'TARA',
      basis: 'KENDRA',
      provisional: true,
      label: PLANETARY_EXT_PROVISIONAL_LABEL,
      source: TARA_DASHA_SOURCE,
      conventionNotes: [
        'Kendras are whole-sign houses 1, 4, 7, 10 from the Lagna sign; all nine planets are considered.',
        '"Strongest" is read as the highest Shadbala (BPHS ch. 27, engine ShadbalaCalculator). The nodes have no Shadbala and cannot start the dasha; if only the nodes occupy kendras the result is reported as not determinable.',
        'Order and years follow Vimshottari starting from the strongest kendra planet; the first dasha runs its full years from birth (no nakshatra balance), as in Santhanam\'s illustrative table.',
        'Taras label the planets in Vimshottari order from the Sun: Sun Janma, Moon Sampat, Mars Vipat, Rahu Kshema, Jupiter Pratyari, Saturn Sadhana, Mercury Vadha, Ketu Maitra, Venus Atimaitra (Santhanam\'s table).',
        'Alternative (not adopted): S. Rath (srath.com, lessons on Tara dasa) applies it when four or more planets are in kendras and orders the dashas kendra -> panapara -> apoklima planets.',
        'Antardasha: Vimshottari proportion (parent x lord years / 120), starting with the parent lord (BPHS ch. 51 v.1-2).',
      ],
      eligibility,
      startingLord: startLord,
      moonLongitude: lon,
      moonNakshatraIndex: nakIndex,
      moonNakshatraName: NAKSHATRAS[nakIndex - 1].name,
      balanceAtBirthYears: startLord ? DASHA_YEARS[startLord] : 0,
      elapsedAtBirthYears: 0,
      totalCycleYears: TOTAL_VIMSHOTTARI_YEARS,
      cycles: 1,
      mahadashas,
      strengthEvidence: kendra.map((k) => ({ planet: k.planet, house: k.house, shadbalaRupas: k.shadbalaRupas })),
    };
    const current = resolvePlanetaryExtCurrent(mahadashas, options.targetDate);
    if (current) tree.currentPeriod = current;
    return tree;
  }

  public calculateForChart(chart: AstroChart, options: PlanetaryExtCalculationOptions = {}): PlanetaryExtDashaTree {
    const { moonLongitude, birth } = planetaryExtChartInputs(chart, 'Tara dasha');
    return this.calculateFromKendraPlanets(this.kendraPlanets(chart), moonLongitude, birth, options);
  }
}
