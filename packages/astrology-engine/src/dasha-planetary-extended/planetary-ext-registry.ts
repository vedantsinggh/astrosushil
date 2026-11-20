import type { AstroChart } from '../chart/astro-chart.types';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import {
  PLANETARY_EXT_PROVISIONAL_LABEL,
  PlanetaryExtCalculationOptions,
  PlanetaryExtDashaSystem,
  PlanetaryExtDashaTree,
  PlanetaryExtSystemInfo,
} from './planetary-ext.types';
import { TribhagiDashaCalculator, TRIBHAGI_SOURCE } from './tribhagi-dasha';
import { ShastihayaniDashaCalculator, SHASTIHAYANI_SOURCE, SHASTIHAYANI_TOTAL_YEARS } from './shastihayani-dasha';
import { TaraDashaCalculator, TARA_DASHA_SOURCE } from './tara-dasha';
import { PATYAYINI_SOURCE } from './patyayini-dasha';

export const PLANETARY_EXT_DASHA_SYSTEMS: readonly PlanetaryExtDashaSystem[] = ['TRIBHAGI', 'SHASTIHAYANI', 'TARA'];

export const MOOLA_DASHA_NOT_IMPLEMENTED_REASON =
  'Moola (Lagna Kendradi graha) dasha could not be defined unambiguously from a published source. ' +
  'P.V.R. Narasimha Rao ("Vedic Astrology: An Integrated Approach", 19.1) names it ("Vimsottari years with ' +
  'moolatrikona correction") but declares it out of scope. S. Rath (srath.com, "Mula dasa - Varahamihira\'s success") ' +
  'gives years = Vimshottari years - (count from the planet to its moolatrikona sign - 1), +/-1 for exaltation/' +
  'debility, without the counting direction, and his worked table (Cancer Lagna, Sri Rama) cannot be reproduced ' +
  'with one consistent direction (Jupiter 10 needs a reverse count, Moon 10 a forward count, Saturn 14 neither). ' +
  'Birth balance and antardasha rules are not stated. Pending client methodology.';

/**
 * Standalone registry for the planet-based extra dashas of ADR-016 §3 (Tribhagi, Shastihayani, Tara),
 * plus listing entries for Patyayini (annual, separate calculator) and Moola (not implemented).
 * Returns the same period-tree shape as the engine's Yogini/Chara trees (mahadashas -> subPeriods).
 */
export class PlanetaryDashaExtendedRegistry {
  public static isSupported(system: string): system is PlanetaryExtDashaSystem {
    return (PLANETARY_EXT_DASHA_SYSTEMS as readonly string[]).includes(system);
  }

  /**
   * @param config accepted so the chart's ayanamsa/node choice stays explicit at the call site; all
   *               positions come from the supplied chart (computed by ChartCalculator with that config).
   */
  public static calculate(
    system: PlanetaryExtDashaSystem,
    chart: AstroChart,
    options: PlanetaryExtCalculationOptions = {},
    _config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG
  ): PlanetaryExtDashaTree {
    switch (system) {
      case 'TRIBHAGI':
        return new TribhagiDashaCalculator().calculateForChart(chart, options);
      case 'SHASTIHAYANI':
        return new ShastihayaniDashaCalculator().calculateForChart(chart, options);
      case 'TARA':
        return new TaraDashaCalculator().calculateForChart(chart, options);
      default:
        throw new Error(`Unsupported planetary extended dasha system: ${String(system)}`);
    }
  }

  public static listSystems(): PlanetaryExtSystemInfo[] {
    const base = { provisional: true as const, label: PLANETARY_EXT_PROVISIONAL_LABEL };
    return [
      {
        ...base,
        system: 'TRIBHAGI',
        name: 'Tribhagi Dasha',
        implemented: true,
        source: TRIBHAGI_SOURCE,
        eligibilityNote: 'No condition; Vimshottari variant applicable to every chart.',
        totalCycleYears: 40,
        calculatedBy: 'REGISTRY',
      },
      {
        ...base,
        system: 'SHASTIHAYANI',
        name: 'Shastihayani Dasha',
        implemented: true,
        source: SHASTIHAYANI_SOURCE,
        eligibilityNote: 'Applicable when the Sun is in the Lagna (BPHS 46.40); calculated for every chart, eligibility reported.',
        totalCycleYears: SHASTIHAYANI_TOTAL_YEARS,
        calculatedBy: 'REGISTRY',
      },
      {
        ...base,
        system: 'TARA',
        name: 'Tara Dasha',
        implemented: true,
        source: TARA_DASHA_SOURCE,
        eligibilityNote: 'Applicable when planets occupy kendras from the Lagna (BPHS 46.207-209); first dasha = strongest kendra planet by Shadbala.',
        totalCycleYears: 120,
        calculatedBy: 'REGISTRY',
      },
      {
        ...base,
        system: 'PATYAYINI',
        name: 'Patyayini Dasha (Tajika annual)',
        implemented: true,
        source: PATYAYINI_SOURCE,
        eligibilityNote: 'Annual dasha of the Tajika (Varshaphala) year; requires a target year.',
        totalCycleYears: 1,
        calculatedBy: 'PATYAYINI_CALCULATOR',
      },
      {
        ...base,
        system: 'MOOLA',
        name: 'Moola Dasha (Lagna Kendradi graha dasha)',
        implemented: false,
        source: 'P.V.R. Narasimha Rao, Vedic Astrology: An Integrated Approach, 19.1; S. Rath, srath.com "Mula dasa".',
        eligibilityNote: 'Not implemented.',
        totalCycleYears: null,
        notImplementedReason: MOOLA_DASHA_NOT_IMPLEMENTED_REASON,
        calculatedBy: 'NONE',
      },
    ];
  }
}
