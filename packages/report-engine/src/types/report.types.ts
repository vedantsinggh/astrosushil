export enum ReportType {
  KUNDLI = 'KUNDLI',
  PLANETARY_SUMMARY = 'PLANETARY_SUMMARY',
  CAREER_PROSITY = 'CAREER_PROSITY',
  MARRIAGE_COMPATIBILITY = 'MARRIAGE_COMPATIBILITY',
  CAREER = 'CAREER',
  GUPTA_NADI_DOSSIER = 'GUPTA_NADI_DOSSIER',
  CHILDBIRTH_FAMILY = 'CHILDBIRTH_FAMILY',
  // Backward compatibility aliases
  PERSONALITY = 'PERSONALITY',
  RELATIONSHIP = 'RELATIONSHIP',
  RASHI_BHAVISHYA = 'RASHI_BHAVISHYA',
  VASTU = 'VASTU',
}

export interface ReportProfileDto {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeName: string | null;
  timezone: string;
  latitude?: number;
  longitude?: number;
}

export interface ReportConfigDto {
  zodiacType: string;
  ayanamsa: string;
  houseSystem: string;
  nodeCalculation: string;
}

export interface ReportAscendantDto {
  sign: string;
  degree: number;
  nakshatra: string;
  pada: number;
}

export interface ReportPlanetDto {
  planet: string;
  sign: string;
  degree: number;
  house: number;
  nakshatra: string;
  pada: number;
  isRetrograde: boolean;
}

export interface ReportHouseDto {
  houseNumber: number;
  sign: string;
  planetsPresent: string[];
}

export interface ReportNakshatraDto {
  birthNakshatra: string;
  pada: number;
  rulingPlanet: string;
  associatedInfo: string;
}

export interface ReportSectionDto {
  id: string;
  title: string;
  type: 'TEXT' | 'KEY_VALUE' | 'LIST';
  content: string;
  keyValues?: Record<string, string>;
  listItems?: string[];
}

export interface GemstoneRecommendationItem {
  gemstone: string;
  sanskritName: string;
  finger: string;
  metal: string;
  rulingLord: string;
  purpose: string;
  caution: string;
  isRecommended: boolean;
}

export interface GemstoneRecommendationsDto {
  lagnaGem: GemstoneRecommendationItem;
  luckyGem5th: GemstoneRecommendationItem;
  fortuneGem9th: GemstoneRecommendationItem;
  generalAdvisory: string;
}

export interface VimshottariDashaPeriodDto {
  planet: string;
  startDate: string;
  endDate: string;
  durationYears: number;
  isCurrent?: boolean;
}

export interface VimshottariDashaDto {
  currentMahadasha: string;
  currentAntardasha: string;
  currentPratyantardasha?: string;
  currentCycleStart: string;
  currentCycleEnd: string;
  timeline: VimshottariDashaPeriodDto[];
}

export interface DoshaAnalysisDto {
  manglik: {
    isManglik: boolean;
    severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
    cancellingFactors: string[];
  };
  sadeSati: {
    isSadeSatiActive: boolean;
    phase: string;
    phaseName: string;
    description: string;
    isDhaiyyaActive: boolean;
    dhaiyyaName: string;
  };
  kaalSarp: {
    isKaalSarpPresent: boolean;
    typeName: string;
    description: string;
  };
}

export interface StructuredReportModel {
  version: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  profile: ReportProfileDto;
  configuration: ReportConfigDto;
  ascendant: ReportAscendantDto;
  planets: ReportPlanetDto[];
  houses: ReportHouseDto[];
  nakshatra: ReportNakshatraDto;
  sections: ReportSectionDto[];
  // Extended fields for Basic Horoscope (Kundli)
  chandraKundli?: {
    moonSign: string;
    houses: ReportHouseDto[];
  };
  vimshottariDasha?: VimshottariDashaDto;
  doshaAnalysis?: DoshaAnalysisDto;
  gemstoneRecommendations?: GemstoneRecommendationsDto;
}

// -----------------------------------------------------------------------------
// MINI HOROSCOPE (PLANETARY TRANSIT FORECAST) MODEL
// -----------------------------------------------------------------------------

export interface TransitPlacementDto {
  planet: string;
  currentSign: string;
  currentDegree: number;
  houseFromMoon: number;
  houseFromLagna: number;
  isRetrograde: boolean;
  status: string;
  impactSummary: string;
}

export interface TransitWindowDto {
  planet: string;
  event: string;
  startDate: string;
  endDate: string;
  significance: string;
  recommendation: string;
}

export interface MiniHoroscopeModel {
  version: string;
  type: ReportType.PLANETARY_SUMMARY;
  title: string;
  generatedAt: string;
  referenceDate: string;
  forecastPeriod: string;
  profile: ReportProfileDto;
  configuration: ReportConfigDto;
  currentTransits: TransitPlacementDto[];
  sadeSati: DoshaAnalysisDto['sadeSati'];
  transitWindows: TransitWindowDto[];
  cautionPeriods: Array<{ period: string; planet: string; caution: string }>;
  sections: ReportSectionDto[];
}

// -----------------------------------------------------------------------------
// PRO HOROSCOPE (MULTI-DIVISIONAL SHODASHVARGA & SHADBALA) MODEL
// -----------------------------------------------------------------------------

export interface VargaSummaryDto {
  vargaCode: string; // D1, D9, D10, D7, D12
  vargaName: string; // Rashi, Navamsha, Dashamsha, Saptamsha, Dwadashamsha
  focusArea: string; // Physical/Core, Soul/Dharma, Career/Status, Progeny, Ancestral
  ascendantSign: string;
  placements: Array<{
    planet: string;
    sign: string;
    house: number;
    isRetrograde?: boolean;
  }>;
}

export interface ShadbalaItemDto {
  planet: string;
  sthanaBala: number;
  digBala: number;
  kalaBala: number;
  cheshtaBala: number;
  naisargikaBala: number;
  drikBala: number;
  totalShashtiamsas: number;
  totalRupas: number;
  requiredRupas: number;
  relativeRank: number;
  isStrong: boolean;
}

export interface BhavaBalaItemDto {
  houseNumber: number;
  sign: string;
  lord: string;
  bhavadhipatiBala: number;
  bhavaDigBala: number;
  bhavaDrishtiBala: number;
  totalRupas: number;
  relativeRank: number;
}

export interface ProHoroscopeModel {
  version: string;
  type: ReportType.CAREER_PROSITY;
  title: string;
  generatedAt: string;
  profile: ReportProfileDto;
  configuration: ReportConfigDto;
  ascendant: ReportAscendantDto;
  planets: ReportPlanetDto[];
  houses: ReportHouseDto[];
  vargas: VargaSummaryDto[];
  shadbala: ShadbalaItemDto[];
  bhavaBala: BhavaBalaItemDto[];
  remedies: Array<{
    type: 'MANTRA' | 'CHARITY' | 'BEHAVIORAL';
    title: string;
    description: string;
    mantraText?: string;
  }>;
  sections: ReportSectionDto[];
}

// -----------------------------------------------------------------------------
// MATCHMAKING REPORT (ASHTAKOOTA & GUNA MILAN) MODEL
// -----------------------------------------------------------------------------

export interface KootaScoreDto {
  name: string;
  sanskritName: string;
  maxPoints: number;
  obtainedPoints: number;
  status: 'EXCELLENT' | 'AVERAGE' | 'DOSHA' | 'DEFICIENT';
  description: string;
  boyDetail: string;
  girlDetail: string;
}

export interface MatchmakingReportModel {
  version: string;
  type: ReportType.MARRIAGE_COMPATIBILITY;
  title: string;
  generatedAt: string;
  profile1: ReportProfileDto; // Partner A / Groom
  profile2: ReportProfileDto; // Partner B / Bride
  configuration: ReportConfigDto;
  gunaMilan: {
    totalScore: number;
    maxScore: number; // 36
    verdict: string; // e.g. "UTTAM (HIGHLY AUSPICIOUS)", "MADHYAMA (AVERAGE)"
    verdictDescription: string;
    kootas: KootaScoreDto[];
  };
  manglikComparison: {
    personA: {
      name: string;
      isManglik: boolean;
      severity: string;
      factors: string[];
    };
    personB: {
      name: string;
      isManglik: boolean;
      severity: string;
      factors: string[];
    };
    verdict: string;
    explanation: string;
  };
  synthesis: {
    mentalHarmony: string;
    emotionalHarmony: string;
    healthAndProgeny: string;
    remediesOrGuidance: string;
  };
  sections: ReportSectionDto[];
}
