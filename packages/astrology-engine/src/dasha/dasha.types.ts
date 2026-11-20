import { PlanetSymbol } from '../planets/planet.types';
import { DashaSystem } from '../configuration/astrology-config';

export { DashaSystem };

export interface DashaPeriod {
  level: number;                  // 1 = Mahadasha, 2 = Antardasha, 3 = Pratyantardasha, 4 = Sookshma, 5 = Prana
  lord: PlanetSymbol;             // Ruling planet of this period
  parentLord?: PlanetSymbol;      // Ruler of the direct parent period (undefined for Mahadasha)
  order: number;                  // 1-indexed order within parent
  startDateIso: string;           // ISO 8601 UTC start timestamp
  endDateIso: string;             // ISO 8601 UTC end timestamp
  durationYears: number;          // Active duration in decimal years (based on 365.2425 days/year)
  nominalYears: number;           // Full theoretical nominal duration in years
  isBirthDasha: boolean;          // True if this period encompasses the native's birth instant
  isActive?: boolean;             // True if this period contains the query targetDate
  nominalStartDateIso?: string;   // Full unclipped start timestamp for birth periods
  nominalEndDateIso?: string;     // Full unclipped end timestamp
  rashiIndex?: number;            // 1 to 12 (Present for Rashi-based Dasha systems like Sthira / Shoola)
  signName?: string;              // e.g. "Aries", "Taurus" (Present for Rashi-based Dasha systems)
  subPeriods?: DashaPeriod[];     // Child periods
}

export interface ActiveDashaPeriodSummary {
  level: number;
  lord: PlanetSymbol;
  signName?: string;
  rashiIndex?: number;
  startDateIso: string;
  endDateIso: string;
  durationYears: number;
  nominalYears: number;
}

export interface ActiveDashaInfo {
  targetDateIso: string;
  mahadasha: ActiveDashaPeriodSummary;
  antardasha?: ActiveDashaPeriodSummary;
  pratyantardasha?: ActiveDashaPeriodSummary;
  sookshma?: ActiveDashaPeriodSummary;
  prana?: ActiveDashaPeriodSummary;
  path: (PlanetSymbol | string)[];
  description: string;
}

export interface DashaCalculationOptions {
  maxLevel?: number;              // Depth: 1 = Mahadasha, 2 = Antardasha, 3 = Pratyantardasha (default), 4 = Sookshma, 5 = Prana
  targetDate?: Date | string;     // Optional timestamp to query active Dasha
  timeHorizonYears?: number;      // Optional duration horizon in years
  cycleCount?: number;            // Optional number of cycles (default 1)
}

export type VimshottariCalculationOptions = DashaCalculationOptions;
export type AshtottariCalculationOptions = DashaCalculationOptions;

export interface DashaEligibilityResult {
  isEligible: boolean;
  system: DashaSystem;
  tradition: 'PARASHARA' | 'JAIMINI';
  eligibilityMethod: string;
  reason: string;
  criteria?: Record<string, any>;
}

export interface VimshottariDashaTree {
  dashaSystem?: 'VIMSHOTTARI';
  moonLongitude: number;
  moonNakshatraIndex: number;     // 1 to 27
  moonNakshatraName: string;      // e.g. "Ashwini"
  moonPada: number;               // 1 to 4
  birthLord: PlanetSymbol;        // Nakshatra lord at birth
  balanceAtBirthYears: number;    // Remaining balance of first Mahadasha in years
  elapsedAtBirthYears: number;    // Elapsed portion of first Mahadasha before birth
  totalCycleYears: number;        // 120
  timeHorizonYears?: number;
  activeDasha?: ActiveDashaInfo;  // Present if targetDate provided
  mahadashas: DashaPeriod[];
}

export interface AshtottariEligibility {
  isEligible: boolean;
  rahuHouseFromLagna: number;
  rahuHouseFromLagnaLord: number;
  lagnaLord: PlanetSymbol;
  isRahuInKendraOrTrikonaFromLagnaLord: boolean;
  isRahuInLagna: boolean;
  paksha: 'SHUKLA' | 'KRISHNA';
  birthTimeOfDay: 'DAY' | 'NIGHT';
  meetsRahuCondition: boolean;
  meetsPakshaCondition: boolean;
  eligibilityMethod: 'PARASHARA_RAHU_KENDRA_TRIKONA' | 'PARASHARA_PAKSHA_DAY_NIGHT' | 'COMBINED';
  reason: string;
}

export interface AshtottariDashaTree {
  dashaSystem: 'ASHTOTTARI';
  system?: string;
  totalYears?: number;
  startingLord?: any;
  isEligible?: boolean;
  eligibilityReason?: string;
  currentPeriod?: any;
  moonLongitude: number;
  moonNakshatraIndex: number;     // 1 to 27
  moonNakshatraName: string;      // e.g. "Magha"
  moonPada: number;               // 1 to 4
  sectorIndex: number;            // 1 to 28 (including Abhijit)
  sectorName: string;             // e.g. "Abhijit", "Ardra"
  birthLord: PlanetSymbol;        // Ashtottari ruler at birth
  balanceAtBirthYears: number;    // Remaining balance of first Mahadasha in years
  elapsedAtBirthYears: number;    // Elapsed portion of first Mahadasha before birth
  totalCycleYears: number;        // 108
  timeHorizonYears?: number;
  eligibility?: AshtottariEligibility;
  activeDasha?: ActiveDashaInfo;  // Present if targetDate provided
  mahadashas: DashaPeriod[];
}

export interface SthiraDashaTree {
  dashaSystem: 'STHIRA';
  basis: 'RASHI';
  startingRashiIndex: number;     // 1 to 12
  startingRashiName: string;      // e.g. "Aries"
  ascendantLongitude: number;
  degreeInStartingRashi: number;
  birthLord: PlanetSymbol;
  balanceAtBirthYears: number;
  elapsedAtBirthYears: number;
  totalCycleYears: number;        // 96
  timeHorizonYears?: number;
  eligibility?: DashaEligibilityResult;
  activeDasha?: ActiveDashaInfo;
  mahadashas: DashaPeriod[];
}

export interface ShoolaDashaTree {
  dashaSystem: 'SHOOLA';
  basis: 'RASHI';
  startingRashiIndex: number;     // 1 to 12
  startingRashiName: string;      // e.g. "Aries"
  startingFromHouse: 1 | 7;
  direction: 'DIRECT' | 'REVERSE';
  startingLongitude: number;
  degreeInStartingRashi: number;
  birthLord: PlanetSymbol;
  balanceAtBirthYears: number;
  elapsedAtBirthYears: number;
  totalCycleYears: number;        // 108
  timeHorizonYears?: number;
  eligibility?: DashaEligibilityResult;
  activeDasha?: ActiveDashaInfo;
  mahadashas: DashaPeriod[];
}

export interface DwisaptatiSamaDashaTree {
  dashaSystem: 'DWISAPTATI_SAMA';
  basis: 'NAKSHATRA';
  moonLongitude: number;
  moonNakshatraIndex: number;     // 1 to 27
  moonNakshatraName: string;
  moonPada: number;
  birthLord: PlanetSymbol;
  balanceAtBirthYears: number;
  elapsedAtBirthYears: number;
  totalCycleYears: number;        // 72
  timeHorizonYears?: number;
  eligibility?: DashaEligibilityResult;
  activeDasha?: ActiveDashaInfo;
  mahadashas: DashaPeriod[];
}

export interface ShatabdikaDashaTree {
  dashaSystem: 'SHATABDIKA';
  basis: 'NAKSHATRA';
  moonLongitude: number;
  moonNakshatraIndex: number;     // 1 to 27
  moonNakshatraName: string;
  moonPada: number;
  birthLord: PlanetSymbol;
  balanceAtBirthYears: number;
  elapsedAtBirthYears: number;
  totalCycleYears: number;        // 100
  timeHorizonYears?: number;
  eligibility?: DashaEligibilityResult;
  activeDasha?: ActiveDashaInfo;
  mahadashas: DashaPeriod[];
}

export interface ChaturaseetiSamaDashaTree {
  dashaSystem: 'CHATURASEETI_SAMA';
  basis: 'NAKSHATRA';
  moonLongitude: number;
  moonNakshatraIndex: number;     // 1 to 27
  moonNakshatraName: string;
  moonPada: number;
  birthLord: PlanetSymbol;
  balanceAtBirthYears: number;
  elapsedAtBirthYears: number;
  totalCycleYears: number;        // 84
  timeHorizonYears?: number;
  eligibility?: DashaEligibilityResult;
  activeDasha?: ActiveDashaInfo;
  mahadashas: DashaPeriod[];
}

export interface DwadashottariDashaTree {
  dashaSystem: 'DWADASHOTTARI';
  basis: 'NAKSHATRA';
  moonLongitude: number;
  moonNakshatraIndex: number;     // 1 to 27
  moonNakshatraName: string;
  moonPada: number;
  birthLord: PlanetSymbol;
  balanceAtBirthYears: number;
  elapsedAtBirthYears: number;
  totalCycleYears: number;        // 112
  timeHorizonYears?: number;
  eligibility?: DashaEligibilityResult;
  activeDasha?: ActiveDashaInfo;
  mahadashas: DashaPeriod[];
}

export interface PanchottariDashaTree {
  dashaSystem: 'PANCHOTTARI';
  basis: 'NAKSHATRA';
  moonLongitude: number;
  moonNakshatraIndex: number;     // 1 to 27
  moonNakshatraName: string;
  moonPada: number;
  birthLord: PlanetSymbol;
  balanceAtBirthYears: number;
  elapsedAtBirthYears: number;
  totalCycleYears: number;        // 105
  timeHorizonYears?: number;
  eligibility?: DashaEligibilityResult;
  activeDasha?: ActiveDashaInfo;
  mahadashas: DashaPeriod[];
}

export interface IneligibleDashaResult {
  dashaSystem: DashaSystem;
  isEligible: false;
  eligibility: DashaEligibilityResult;
}

/**
 * Generic period node used by the Yogini, Chara, Narayana and Kalachakra calculators
 * (see docs/report-system/decisions/engine-extensions.md).
 *
 * Date semantics (identical for all four systems):
 *  - nominalStartDateIso / nominalEndDateIso: the full theoretical period.
 *  - startDateIso / endDateIso: the nominal dates, except that a period spanning the birth
 *    instant starts at birth.
 *  - durationYears: the portion of the period lived after birth (0 for a pre-birth period).
 *  - isBeforeBirth: true when the whole period elapsed before birth. Such periods are kept
 *    only so that every parent lists its complete classical sequence of sub-periods.
 */
export interface ExtendedDashaPeriodBase {
  level: number;                  // 1 = Mahadasha, 2 = Antardasha, 3 = Pratyantardasha
  order: number;                  // 1-indexed order within the parent
  lord: PlanetSymbol;
  startDateIso: string;
  endDateIso: string;
  durationYears: number;
  nominalYears: number;
  nominalStartDateIso: string;
  nominalEndDateIso: string;
  isBirthDasha: boolean;
  isBeforeBirth: boolean;
  isActive?: boolean;
}

export interface CurrentDashaPeriodSummary {
  level: number;
  lord: PlanetSymbol;
  label: string;                  // Yogini name or sign name
  signIndex?: number;
  signName?: string;
  startDateIso: string;
  endDateIso: string;
  nominalYears: number;
}

export interface CurrentDashaPeriod {
  targetDateIso: string;
  mahadasha: CurrentDashaPeriodSummary;
  antardasha?: CurrentDashaPeriodSummary;
  pratyantardasha?: CurrentDashaPeriodSummary;
  path: string[];
  description: string;
}

/** Evidence for how a Jaimini sign-dasha length was obtained (auditable). */
export interface SignDashaYearsEvidence {
  lordUsed: PlanetSymbol;
  coLords: PlanetSymbol[];
  coLordSelectionReason?: string;
  lordSignIndex: number;
  countingDirection: 'FORWARD' | 'REVERSE';
  countInclusive: number;         // Inclusive count from dasha sign to lord's sign (1..12)
  baseYears: number;              // countInclusive - 1, or 12 when the lord occupies the sign
  adjustment: number;             // +1 exalted, -1 debilitated, 0 otherwise
  adjustmentReason?: string;
  flooredAtOne?: boolean;         // True when a debilitation adjustment would have produced 0
  cycle: number;                  // 1 = first cycle; 2 = second cycle (12 - first-cycle years)
  years: number;
}

export interface SignDashaPeriod extends ExtendedDashaPeriodBase {
  signIndex: number;              // 1..12
  rashiIndex: number;             // alias of signIndex for consistency with Sthira/Shoola
  signName: string;               // English name
  sanskritName: string;
  yearsEvidence?: SignDashaYearsEvidence; // present on Mahadashas only
  subPeriods?: SignDashaPeriod[];
}

export type SignDashaDirection = 'FORWARD' | 'REVERSE';

export interface CharaDashaTree {
  dashaSystem: 'CHARA';
  system: 'CHARA';
  method: 'KN_RAO';
  basis: 'RASHI';
  lagnaRashiIndex: number;
  startingSign: number;           // 1..12 (Lagna sign)
  startingSignName: string;
  ninthFromLagnaSignIndex: number;
  direction: SignDashaDirection;
  directionReason: string;
  totalCycleYears: number;        // Sum of the generated first-cycle Mahadashas
  cycles: number;
  balanceAtBirthYears: number;    // Jaimini sign dashas run full from birth: equals first period
  periods: SignDashaPeriod[];
  mahadashas: SignDashaPeriod[];
  currentPeriod?: CurrentDashaPeriod;
}

export type NarayanaProgressionType = 'MOVABLE_REGULAR' | 'FIXED_SIXTH' | 'DUAL_TRINE';

export interface NarayanaStartingSignEvidence {
  lagnaSignIndex: number;
  seventhSignIndex: number;
  chosen: 1 | 7;
  decidingRule: string;
  lagnaScore: Record<string, number>;
  seventhScore: Record<string, number>;
}

export interface NarayanaDashaTree {
  dashaSystem: 'NARAYANA';
  system: 'NARAYANA';
  basis: 'RASHI';
  lagnaRashiIndex: number;
  startingSign: number;
  startingSignName: string;
  startingSignEvidence: NarayanaStartingSignEvidence;
  progressionType: NarayanaProgressionType;
  direction: SignDashaDirection;
  directionReason: string;
  totalCycleYears: number;
  cycles: number;
  balanceAtBirthYears: number;
  periods: SignDashaPeriod[];
  mahadashas: SignDashaPeriod[];
  currentPeriod?: CurrentDashaPeriod;
}

export type ConditionalDashaType =
  | 'CHATURSHITI_SAMA'
  | 'SHATABDIKA'
  | 'DVADASHOTTARI'
  | 'DWISAPTATI_SAMA'
  | 'SHAT_TRIMSHATSAMA'
  | 'SHODASHOTTARI'
  | 'PANCHOTTARI';

export interface ConditionalDashaTree {
  system?: string;
  totalYears?: number;
  isEligible?: boolean;
  eligibilityReason?: string;
  startingLord?: any;
  balanceAtBirthYears?: number;
  currentPeriod?: any;
  dashaType?: ConditionalDashaType;
  mahadashas?: DashaPeriod[];
}

export interface KalachakraSignRef {
  signIndex: number;
  signName: string;
  sanskritName: string;
  lord: PlanetSymbol;
}

export interface KalachakraDashaPeriod extends ExtendedDashaPeriodBase {
  signIndex: number;
  rashiIndex: number;
  signName: string;
  sanskritName: string;
  /** Absolute navamsha-pada index (0..107) whose 9-sign sequence this period belongs to. */
  sourcePadaIndex: number;
  sourceNakshatraName: string;
  sourcePada: number;
  isDeha: boolean;
  isJeeva: boolean;
  subPeriods?: KalachakraDashaPeriod[];
}

export interface KalachakraDashaTree {
  dashaSystem: 'KALACHAKRA';
  system: 'KALACHAKRA';
  basis: 'NAKSHATRA_PADA';
  directionType: 'SAVYA' | 'APASAVYA';
  moonLongitude: number;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  padaIndex: number;              // 0..107
  padaSequence: KalachakraSignRef[];  // The 9 dasha signs of the birth pada
  totalPadaYears: number;         // Paramayus of the birth pada (sum of its 9 sign years)
  dehaRashi: KalachakraSignRef;
  jeevaRashi: KalachakraSignRef;
  dehaJeevaConvention: 'APASAVYA_REVERSED' | 'SAME_AS_SAVYA';
  elapsedInPadaYears: number;
  balanceAtBirthYears: number;
  totalCycleYears: number;        // Sum of the generated Mahadashas
  mahadashas: KalachakraDashaPeriod[];
  currentPeriod?: CurrentDashaPeriod;
}

export interface YoginiDashaPeriod extends ExtendedDashaPeriodBase {
  yoginiName: string;
  yoginiNumber: number;           // 1..8 (= nominal years)
  subPeriods?: YoginiDashaPeriod[];
}

export interface YoginiDashaTree {
  dashaSystem: 'YOGINI';
  system: 'YOGINI';
  basis: 'NAKSHATRA';
  totalCycleYears: 36;
  moonLongitude: number;
  moonNakshatraIndex: number;
  moonNakshatraName: string;
  moonPada: number;
  startingYogini: string;
  startingYoginiNumber: number;
  startingLord: PlanetSymbol;
  nodeLordConvention: 'SANKATA_RAHU';
  balanceAtBirthYears: number;
  elapsedAtBirthYears: number;
  cycles: number;
  mahadashas: YoginiDashaPeriod[];
  currentPeriod?: CurrentDashaPeriod;
}

export type DashaTree =
  | VimshottariDashaTree
  | AshtottariDashaTree
  | SthiraDashaTree
  | ShoolaDashaTree
  | DwisaptatiSamaDashaTree
  | ShatabdikaDashaTree
  | ChaturaseetiSamaDashaTree
  | DwadashottariDashaTree
  | PanchottariDashaTree
  | CharaDashaTree
  | ConditionalDashaTree
  | KalachakraDashaTree
  | NarayanaDashaTree
  | YoginiDashaTree;

export type DashaCalculationResult = DashaTree | IneligibleDashaResult;
