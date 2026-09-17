import { DashaSystem } from '../configuration/astrology-config';
import type { AstroChart } from '../chart/astro-chart.types';
import {
  DashaCalculationOptions,
  DashaCalculationResult,
  DashaEligibilityResult,
  DashaTree,
  IneligibleDashaResult,
} from './dasha.types';
import { DashaCalculator } from './dasha-calculator';
import { AshtottariCalculator } from './ashtottari-calculator';
import { SthiraDashaCalculator } from './sthira-dasha-calculator';
import { ShoolaDashaCalculator } from './shoola-dasha-calculator';
import {
  DwisaptatiSamaCalculator,
  ShatabdikaCalculator,
  ChaturaseetiSamaCalculator,
  DwadashottariCalculator,
  PanchottariCalculator,
} from './nakshatra-dasha-calculators';
import {
  evaluateVimshottariEligibility,
  evaluateAshtottariEligibilityStandard,
  evaluateSthiraEligibility,
  evaluateShoolaEligibility,
  evaluateDwisaptatiSamaEligibility,
  evaluateShatabdikaEligibility,
  evaluateChaturaseetiSamaEligibility,
  evaluateDwadashottariEligibility,
  evaluatePanchottariEligibility,
} from './dasha-eligibility';

export type DashaImplementationStatus = 'IMPLEMENTED' | 'PENDING';

export interface DashaSystemMetadata {
  system: DashaSystem;
  name: string;
  sanskritName: string;
  tradition: 'PARASHARA' | 'JAIMINI';
  basis: 'NAKSHATRA' | 'RASHI';
  totalCycleYears: number;
  maxSupportedLevel: number;
  isConditional: boolean;
  status: DashaImplementationStatus;
  eligibilityMethod: string;
  description: string;
  startingRule: string;
  durationRule: string;
  balanceMethodology: string;
}

export interface DashaSystemDefinition extends DashaSystemMetadata {
  checkEligibility: (chart: AstroChart) => DashaEligibilityResult;
  calculate: (chart: AstroChart, options?: DashaCalculationOptions) => DashaCalculationResult;
}

/**
 * Unified Registry of Classical Dasha Systems for Astro Sushil.
 */
export class DashaRegistry {
  private static vimshottariCalc = new DashaCalculator();
  private static ashtottariCalc = new AshtottariCalculator();
  private static sthiraCalc = new SthiraDashaCalculator();
  private static shoolaCalc = new ShoolaDashaCalculator();
  private static dwisaptatiCalc = new DwisaptatiSamaCalculator();
  private static shatabdikaCalc = new ShatabdikaCalculator();
  private static chaturaseetiCalc = new ChaturaseetiSamaCalculator();
  private static dwadashottariCalc = new DwadashottariCalculator();
  private static panchottariCalc = new PanchottariCalculator();

  private static registry: Map<DashaSystem, DashaSystemDefinition> = new Map([
    [
      'VIMSHOTTARI',
      {
        system: 'VIMSHOTTARI',
        name: 'Vimshottari Dasha',
        sanskritName: 'विंशोत्तरी दशा',
        tradition: 'PARASHARA',
        basis: 'NAKSHATRA',
        totalCycleYears: 120,
        maxSupportedLevel: 5,
        isConditional: false,
        status: 'IMPLEMENTED',
        eligibilityMethod: 'UNIVERSAL_PARASHARA_VIMSHOTTARI',
        description: 'Canonical 120-year Nakshatra Dasha ruled by 9 grahas (Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury).',
        startingRule: 'Determined by continuous sidereal Moon longitude inside birth Nakshatra (27 Nakshatras).',
        durationRule: 'Fixed planetary durations totaling 120 years: Ke 7, Ve 20, Su 6, Mo 10, Ma 7, Ra 18, Ju 16, Sa 19, Me 17.',
        balanceMethodology: 'Continuous fractional Moon longitude remaining in Janma Nakshatra multiplied by first lord duration.',
        checkEligibility: (chart: AstroChart) => evaluateVimshottariEligibility(chart),
        calculate: (chart: AstroChart, options?: DashaCalculationOptions) =>
          DashaRegistry.vimshottariCalc.calculateForChart(chart, options),
      },
    ],
    [
      'ASHTOTTARI',
      {
        system: 'ASHTOTTARI',
        name: 'Ashtottari Dasha',
        sanskritName: 'अष्टोत्तरी दशा',
        tradition: 'PARASHARA',
        basis: 'NAKSHATRA',
        totalCycleYears: 108,
        maxSupportedLevel: 5,
        isConditional: true,
        status: 'IMPLEMENTED',
        eligibilityMethod: 'PARASHARA_RAHU_KENDRA_TRIKONA_AND_PAKSHA',
        description: 'Classical 108-year Nakshatra Dasha with 28 sectors (including Abhijit) ruled by 8 planets (Ketu omitted).',
        startingRule: 'Continuous sidereal Moon longitude inside the 28-sector division of the zodiac.',
        durationRule: 'Fixed durations totaling 108 years: Su 6, Mo 15, Ma 8, Me 17, Sa 10, Ju 19, Ra 12, Ve 21.',
        balanceMethodology: 'Continuous fractional Moon position in sector group multiplied by sector nominal duration.',
        checkEligibility: (chart: AstroChart) => evaluateAshtottariEligibilityStandard(chart),
        calculate: (chart: AstroChart, options?: DashaCalculationOptions) =>
          DashaRegistry.ashtottariCalc.calculateForChart(chart, options),
      },
    ],
    [
      'STHIRA',
      {
        system: 'STHIRA',
        name: 'Sthira Dasha',
        sanskritName: 'स्थिर दशा',
        tradition: 'JAIMINI',
        basis: 'RASHI',
        totalCycleYears: 96,
        maxSupportedLevel: 3,
        isConditional: false,
        status: 'IMPLEMENTED',
        eligibilityMethod: 'UNIVERSAL_JAIMINI_RASHI',
        description: 'Classical Jaimini 96-year sign-based Dasha progressing direct through 12 signs from Lagna.',
        startingRule: 'Starts from the natal Lagna Rashi.',
        durationRule: 'Movable (Chara) signs = 7y, Fixed (Sthira) signs = 8y, Dual (Dwisvabhava) signs = 9y. Total = 96y.',
        balanceMethodology: 'Continuous fractional Ascendant degree inside the starting Rashi (30° span).',
        checkEligibility: (chart: AstroChart) => evaluateSthiraEligibility(chart),
        calculate: (chart: AstroChart, options?: DashaCalculationOptions) =>
          DashaRegistry.sthiraCalc.calculateForChart(chart, options),
      },
    ],
    [
      'SHOOLA',
      {
        system: 'SHOOLA',
        name: 'Shoola Dasha',
        sanskritName: 'शूल दशा',
        tradition: 'JAIMINI',
        basis: 'RASHI',
        totalCycleYears: 108,
        maxSupportedLevel: 3,
        isConditional: false,
        status: 'IMPLEMENTED',
        eligibilityMethod: 'UNIVERSAL_JAIMINI_SHOOLA',
        description: 'Classical Jaimini 108-year sign-based Dasha for longevity and critical period analysis.',
        startingRule: 'Starts from the stronger of 1st House (Lagna) vs 7th House. Direct for Odd signs, Reverse for Even signs.',
        durationRule: 'Fixed 9.0 years for every sign (12 signs × 9y = 108y).',
        balanceMethodology: 'Continuous fractional starting longitude inside starting Rashi (30° span).',
        checkEligibility: (chart: AstroChart) => evaluateShoolaEligibility(chart),
        calculate: (chart: AstroChart, options?: DashaCalculationOptions) =>
          DashaRegistry.shoolaCalc.calculateForChart(chart, options),
      },
    ],
    [
      'DWISAPTATI_SAMA',
      {
        system: 'DWISAPTATI_SAMA',
        name: 'Dwisaptati Sama Dasha',
        sanskritName: 'द्विसप्तति समा दशा',
        tradition: 'PARASHARA',
        basis: 'NAKSHATRA',
        totalCycleYears: 72,
        maxSupportedLevel: 3,
        isConditional: true,
        status: 'IMPLEMENTED',
        eligibilityMethod: 'LAGNA_LORD_IN_7TH_OR_7TH_LORD_IN_1ST',
        description: 'Parashari 72-year Nakshatra Dasha with 9 planets × 8 years each, applicable when Lagna lord is in 7th or 7th lord in Lagna.',
        startingRule: 'Count Janma Nakshatra from Moola (Nakshatra 19) modulo 9.',
        durationRule: 'Equal 8.0 years for all 9 planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu).',
        balanceMethodology: 'Continuous fractional Moon longitude in Janma Nakshatra multiplied by 8.0 years.',
        checkEligibility: (chart: AstroChart) => evaluateDwisaptatiSamaEligibility(chart),
        calculate: (chart: AstroChart, options?: DashaCalculationOptions) =>
          DashaRegistry.dwisaptatiCalc.calculateForChart(chart, options),
      },
    ],
    [
      'SHATABDIKA',
      {
        system: 'SHATABDIKA',
        name: 'Shatabdika Dasha',
        sanskritName: 'शताब्दिका दशा',
        tradition: 'PARASHARA',
        basis: 'NAKSHATRA',
        totalCycleYears: 100,
        maxSupportedLevel: 3,
        isConditional: true,
        status: 'IMPLEMENTED',
        eligibilityMethod: 'LAGNA_VARGOTTAMA',
        description: 'Parashari 100-year Nakshatra Dasha ruled by 7 planets, applicable when Lagna is Vargottama.',
        startingRule: 'Nakshatra groups counted from Revati (Nakshatra 27).',
        durationRule: 'Sun 5y, Moon 5y, Venus 10y, Mars 10y, Jupiter 10y, Saturn 30y, Mercury 30y. Total = 100y.',
        balanceMethodology: 'Continuous fractional Moon longitude inside the planet’s Nakshatra group.',
        checkEligibility: (chart: AstroChart) => evaluateShatabdikaEligibility(chart),
        calculate: (chart: AstroChart, options?: DashaCalculationOptions) =>
          DashaRegistry.shatabdikaCalc.calculateForChart(chart, options),
      },
    ],
    [
      'CHATURASEETI_SAMA',
      {
        system: 'CHATURASEETI_SAMA',
        name: 'Chaturaseeti Sama Dasha',
        sanskritName: 'चतुराशीति समा दशा',
        tradition: 'PARASHARA',
        basis: 'NAKSHATRA',
        totalCycleYears: 84,
        maxSupportedLevel: 3,
        isConditional: true,
        status: 'IMPLEMENTED',
        eligibilityMethod: '10TH_LORD_IN_10TH_HOUSE',
        description: 'Parashari 84-year Nakshatra Dasha with 7 planets × 12 years each, applicable when 10th lord is in 10th house.',
        startingRule: 'Count Janma Nakshatra from Ardra (Nakshatra 6) modulo 7.',
        durationRule: 'Equal 12.0 years for 7 planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn).',
        balanceMethodology: 'Continuous fractional Moon longitude in Janma Nakshatra multiplied by 12.0 years.',
        checkEligibility: (chart: AstroChart) => evaluateChaturaseetiSamaEligibility(chart),
        calculate: (chart: AstroChart, options?: DashaCalculationOptions) =>
          DashaRegistry.chaturaseetiCalc.calculateForChart(chart, options),
      },
    ],
    [
      'DWADASHOTTARI',
      {
        system: 'DWADASHOTTARI',
        name: 'Dwadashottari Dasha',
        sanskritName: 'द्वादशोत्तरी दशा',
        tradition: 'PARASHARA',
        basis: 'NAKSHATRA',
        totalCycleYears: 112,
        maxSupportedLevel: 3,
        isConditional: true,
        status: 'IMPLEMENTED',
        eligibilityMethod: 'LAGNA_IN_VENUS_NAVAMSHA',
        description: 'Parashari 112-year Nakshatra Dasha with 8 planets, applicable when Lagna is in Venus Navamsha (Taurus or Libra).',
        startingRule: 'Count Janma Nakshatra from Pushya (Nakshatra 8) modulo 8.',
        durationRule: 'Sun 7y, Jupiter 9y, Ketu 11y, Mercury 13y, Rahu 15y, Mars 17y, Saturn 19y, Moon 21y. Total = 112y.',
        balanceMethodology: 'Continuous fractional Moon longitude in Janma Nakshatra multiplied by first lord duration.',
        checkEligibility: (chart: AstroChart) => evaluateDwadashottariEligibility(chart),
        calculate: (chart: AstroChart, options?: DashaCalculationOptions) =>
          DashaRegistry.dwadashottariCalc.calculateForChart(chart, options),
      },
    ],
    [
      'PANCHOTTARI',
      {
        system: 'PANCHOTTARI',
        name: 'Panchottari Dasha',
        sanskritName: 'पञ्चोत्तरी दशा',
        tradition: 'PARASHARA',
        basis: 'NAKSHATRA',
        totalCycleYears: 105,
        maxSupportedLevel: 3,
        isConditional: true,
        status: 'IMPLEMENTED',
        eligibilityMethod: 'CANCER_LAGNA_AND_CANCER_DWADASAMSHA',
        description: 'Parashari 105-year Nakshatra Dasha with 7 planets, applicable when Lagna is in Cancer in both D1 and D12.',
        startingRule: 'Count Janma Nakshatra from Anuradha (Nakshatra 17) modulo 7.',
        durationRule: 'Sun 12y, Mercury 13y, Saturn 14y, Mars 15y, Venus 16y, Moon 17y, Jupiter 18y. Total = 105y.',
        balanceMethodology: 'Continuous fractional Moon longitude in Janma Nakshatra multiplied by first lord duration.',
        checkEligibility: (chart: AstroChart) => evaluatePanchottariEligibility(chart),
        calculate: (chart: AstroChart, options?: DashaCalculationOptions) =>
          DashaRegistry.panchottariCalc.calculateForChart(chart, options),
      },
    ],
  ]);

  /**
   * Pending classical Dasha systems scheduled for future phases.
   */
  private static pendingSystems: DashaSystemMetadata[] = [
    {
      system: 'YOGINI' as any,
      name: 'Yogini Dasha',
      sanskritName: 'योगिनी दशा',
      tradition: 'PARASHARA',
      basis: 'NAKSHATRA',
      totalCycleYears: 36,
      maxSupportedLevel: 3,
      isConditional: false,
      status: 'PENDING',
      eligibilityMethod: 'UNIVERSAL_PARASHARA_YOGINI',
      description: '36-year cycle with 8 Yoginis (Mangala, Pingala, Dhanya, Bhramari, Bhadrika, Ulka, Siddha, Sankata).',
      startingRule: 'Count from Ardra plus birth Nakshatra modulo 8.',
      durationRule: '1 through 8 years successively (total 36y).',
      balanceMethodology: 'Nakshatra balance proportion.',
    },
    {
      system: 'CHARA' as any,
      name: 'Chara Dasha',
      sanskritName: 'चर दशा',
      tradition: 'JAIMINI',
      basis: 'RASHI',
      totalCycleYears: 96,
      maxSupportedLevel: 3,
      isConditional: false,
      status: 'PENDING',
      eligibilityMethod: 'UNIVERSAL_JAIMINI_CHARA',
      description: 'Jaimini Chara Dasha evaluated by counting from sign to lord.',
      startingRule: 'Lagna or 7th house.',
      durationRule: 'Variable year durations based on Karakas and lord placement.',
      balanceMethodology: 'Lagna fraction or full year cycles.',
    },
    {
      system: 'NARAYANA' as any,
      name: 'Narayana Dasha',
      sanskritName: 'नारायण दशा',
      tradition: 'JAIMINI',
      basis: 'RASHI',
      totalCycleYears: 144,
      maxSupportedLevel: 3,
      isConditional: false,
      status: 'PENDING',
      eligibilityMethod: 'UNIVERSAL_JAIMINI_NARAYANA',
      description: 'Padakrama Rashi progression dasha.',
      startingRule: 'Stronger of Lagna vs 7th house.',
      durationRule: 'Lord counting rules with exaltation/debilitation modifications.',
      balanceMethodology: 'Sign progression.',
    },
    {
      system: 'KALACHAKRA' as any,
      name: 'Kalachakra Dasha',
      sanskritName: 'कालचक्र दशा',
      tradition: 'PARASHARA',
      basis: 'NAKSHATRA',
      totalCycleYears: 100,
      maxSupportedLevel: 3,
      isConditional: false,
      status: 'PENDING',
      eligibilityMethod: 'UNIVERSAL_PARASHARA_KALACHAKRA',
      description: 'Deha and Jeeva Nakshatra Pada progression dasha.',
      startingRule: 'Moon Pada within Savya/Apasavya cycle.',
      durationRule: 'Rashi lord durations.',
      balanceMethodology: 'Pada fraction.',
    },
  ];

  /**
   * Checks if a given Dasha system is supported and implemented.
   */
  public static isSupported(system: DashaSystem | string): boolean {
    return this.registry.has(system as DashaSystem);
  }

  /**
   * Retrieves definition for an implemented Dasha system.
   */
  public static getDefinition(system: DashaSystem | string): DashaSystemDefinition | undefined {
    return this.registry.get(system as DashaSystem);
  }

  /**
   * Returns list of all implemented Dasha systems metadata.
   */
  public static getImplementedSystems(): DashaSystemMetadata[] {
    return Array.from(this.registry.values()).map(({ checkEligibility, calculate, ...meta }) => meta);
  }

  /**
   * Returns list of all pending Dasha systems metadata.
   */
  public static getPendingSystems(): DashaSystemMetadata[] {
    return this.pendingSystems;
  }

  /**
   * Evaluates eligibility for a requested Dasha system given an AstroChart.
   */
  public static checkEligibility(system: DashaSystem | string, chart: AstroChart): DashaEligibilityResult {
    const def = this.registry.get(system as DashaSystem);
    if (!def) {
      return {
        isEligible: false,
        system: system as DashaSystem,
        tradition: 'PARASHARA',
        eligibilityMethod: 'UNSUPPORTED_SYSTEM',
        reason: `Dasha system ${system} is not implemented or supported in this engine version.`,
      };
    }
    return def.checkEligibility(chart);
  }

  /**
   * Calculates Dasha for a chart with strict eligibility enforcement.
   * If the chart is not eligible for a conditional Dasha, returns an IneligibleDashaResult
   * with complete evidence rather than fabricating a fake timeline.
   */
  public static calculateDasha(
    system: DashaSystem | string,
    chart: AstroChart,
    options?: DashaCalculationOptions
  ): DashaCalculationResult {
    const def = this.registry.get(system as DashaSystem);
    if (!def) {
      throw new Error(`Dasha system "${system}" is not implemented.`);
    }

    const eligibility = def.checkEligibility(chart);
    if (!eligibility.isEligible) {
      const ineligibleResult: IneligibleDashaResult = {
        dashaSystem: system as DashaSystem,
        isEligible: false,
        eligibility,
      };
      return ineligibleResult;
    }

    return def.calculate(chart, options);
  }
}
