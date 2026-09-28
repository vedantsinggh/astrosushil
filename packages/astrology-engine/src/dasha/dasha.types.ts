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

export interface CurrentDashaPeriod {
  mahadasha: any;
  antardasha?: any;
  pratyantardasha?: any;
  sookshma?: any;
  prana?: any;
  level?: number;
  startDateIso?: string;
  endDateIso?: string;
  targetDateIso?: string;
}

export interface SignDashaPeriod {
  sign?: string;
  rashiIndex?: number;
  signIndex?: number;
  signName?: string;
  sanskritName?: string;
  lord?: any;
  startDateIso: string;
  endDateIso: string;
  durationYears: number;
  subPeriods?: SignDashaPeriod[];
}

export interface CharaDashaTree {
  system?: string;
  startingSign?: any;
  startingSignName?: string;
  direction?: string;
  currentPeriod?: any;
  lagnaRashiIndex?: number;
  mahadashas?: SignDashaPeriod[];
  periods?: SignDashaPeriod[];
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

export interface KalachakraDashaPeriod {
  sign?: string;
  rashiIndex?: number;
  signIndex?: number;
  signName?: string;
  sanskritName?: string;
  navamshaRashiIndex?: number;
  lord: PlanetSymbol;
  startDateIso: string;
  endDateIso: string;
  durationYears: number;
  isDeha?: boolean;
  isJeeva?: boolean;
  movementType?: string;
  subPeriods?: KalachakraDashaPeriod[];
}

export interface KalachakraDashaTree {
  system?: string;
  directionType?: string;
  nakshatraIndex?: number;
  nakshatraName?: string;
  pada?: number;
  totalPadaYears?: number;
  dehaRashi?: any;
  jeevaRashi?: any;
  currentPeriod?: any;
  moonLongitude?: number;
  balanceAtBirthYears: number;
  mahadashas: KalachakraDashaPeriod[];
}

export interface NarayanaDashaTree {
  system?: string;
  startingSign?: any;
  startingSignName?: string;
  direction?: string;
  progressionType?: string;
  currentPeriod?: any;
  lagnaRashiIndex?: number;
  mahadashas?: SignDashaPeriod[];
  periods?: SignDashaPeriod[];
}

export interface YoginiDashaPeriod {
  yoginiName: string;
  lord: PlanetSymbol;
  startDateIso: string;
  endDateIso: string;
  durationYears: number;
  subPeriods?: YoginiDashaPeriod[];
}

export interface YoginiDashaTree {
  system?: string;
  totalCycleYears?: number;
  startingYogini?: string;
  startingLord?: any;
  currentPeriod?: any;
  moonNakshatraIndex: number;
  balanceAtBirthYears: number;
  mahadashas: YoginiDashaPeriod[];
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
