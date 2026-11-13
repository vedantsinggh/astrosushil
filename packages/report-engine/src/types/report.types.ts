export enum ReportType {
  KUNDLI = 'KUNDLI',
  PLANETARY_SUMMARY = 'PLANETARY_SUMMARY',
  CAREER_PROSITY = 'CAREER_PROSITY',
  MARRIAGE_COMPATIBILITY = 'MARRIAGE_COMPATIBILITY',
  CAREER = 'CAREER',
  GUPTA_NADI_DOSSIER = 'GUPTA_NADI_DOSSIER',
  CHILDBIRTH_FAMILY = 'CHILDBIRTH_FAMILY',
  HOROSCOPE = 'HOROSCOPE',
  FINANCE = 'FINANCE',
  LOVE = 'LOVE',
  FORTUNE = 'FORTUNE',
  SATURN = 'SATURN',
  JUPITER_TRANSIT = 'JUPITER_TRANSIT',
  RAHU_KETU_TRANSIT = 'RAHU_KETU_TRANSIT',
  VARSHPHAL = 'VARSHPHAL',
  FORTUNE_PLUS = 'FORTUNE_PLUS',
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
  isTimeUnknown?: boolean;
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

export interface PlanetaryPlacementAndTransitDto {
  manglik: {
    status: 'Present' | 'Not Present';
    isManglik: boolean;
    description: string;
    cancellingFactors: string[];
  };
  saturnTransit: {
    transitHouseFromMoon: number;
    description: string;
  };
}

export interface DoshaAnalysisDto {
  manglik: {
    status?: 'Present' | 'Not Present';
    isManglik: boolean;
    severity?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'Present' | 'Not Present';
    description: string;
    cancellingFactors: string[];
  };
  sadeSati?: {
    isSadeSatiActive: boolean;
    phase: string;
    phaseName: string;
    description: string;
    isDhaiyyaActive: boolean;
    dhaiyyaName: string;
  };
  kaalSarp?: {
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
  navamshaKundli?: {
    ascendantSign: string;
    houses: ReportHouseDto[];
  };
  avakahadaChakra?: {
    varna: string;
    vashya: string;
    yoni: string;
    gana: string;
    nadi: string;
    rashi: string;
    rashiLord: string;
    nakshatra: string;
    nakshatraLord: string;
    pada: number;
    namakshara: string;
    tatwa: string;
    paya: string;
    yunja: string;
    hansaka: string;
  };
  panchangSnapshot?: {
    tithi: string;
    vara: string;
    nakshatra: string;
    yoga: string;
    karana: string;
    paksha: string;
    sunrise: string;
    sunset: string;
    dayDuration: string;
    ayan: string;
    season: string;
  };
  shodashvargas?: Array<{
    planet: string;
    rashi: string;
    d2: string;
    d3: string;
    d4: string;
    d7: string;
    d9: string;
    d10: string;
    d12: string;
    d16: string;
    d20: string;
    d24: string;
    d27: string;
    d30: string;
    d40: string;
    d45: string;
    d60: string;
  }>;
  ashtakavargaTable?: {
    sav: Record<number, number>;
    totalPoints: number;
  };
  divisionalCharts?: Array<{
    vargaCode: string;
    name: string;
    divisionNumber: number;
    purpose: string;
    domain: string;
    ascendantSign: string;
    placements: Array<{
      planet: string;
      rashi: string;
      house: number;
    }>;
  }>;
  bhavphal?: Array<{
    houseNumber: number;
    houseName: string;
    sanskritName: string;
    traditionalTitle: string;
    sign: string;
    lord: string;
    lordPlacedInHouse: number;
    lordSign: string;
    planetsPresent: string[];
    attributes: string[];
    analysis: string;
  }>;
  charaKarakas?: Array<{
    karaka: string;
    sanskritName: string;
    planet: string;
    degree: number;
    significance: string;
  }>;
  yogas?: Array<{
    name: string;
    category: string;
    description: string;
    planetsInvolved: string[];
    isAuspicious: boolean;
  }>;
  numerology?: {
    mulank: number;
    bhagyank: number;
    successNumber: number;
    connectionNumber: number;
    summary: string;
  };
  remedies?: {
    rudraksha: string;
    mantras: Array<{ deity: string; mantra: string; purpose: string }>;
    ishtdev: string;
    yantra: string;
    dana: string;
  };
  vimshottariDasha?: VimshottariDashaDto;
  planetaryPlacementAndTransits?: PlanetaryPlacementAndTransitDto;
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

export interface HoroscopeMoonSignDetailsDto {
  sign: string;
  sanskritSign: string;
  signLord: string;
  nakshatra: string;
  pada: number;
  element: string;
  modality: string;
  symbol: string;
  syllables: string;
}

export interface HoroscopeYearlyOverviewDto {
  year: number;
  universalYearNumber: number;
  significanceTitle: string;
  cosmicTheme: string;
  opportunities: string[];
  cautions: string[];
  summary: string;
}

export interface HoroscopePersonalityTraitItem {
  name: string;
  description: string;
}

export interface HoroscopeLifeDomainDto {
  domain: 'CAREER' | 'FINANCE' | 'EDUCATION' | 'LOVE_RELATIONSHIPS' | 'FAMILY' | 'HEALTH';
  title: string;
  outlook: string;
  timeline: string;
  keyGuidance: string;
  highlights: string[];
}

export interface HoroscopePlanetaryInfluenceDto {
  planet: string;
  transitSign: string;
  houseFromMoon: number;
  status: string;
  period: string;
  impact: string;
  guidance: string;
}

export interface HoroscopeFavorableUnfavorableDto {
  favorableColors: Array<{ color: string; reason: string }>;
  unfavorableColors: Array<{ color: string; reason: string }>;
  luckyDates: Array<{ dates: string; reason: string; tip: string }>;
  unluckyDates: Array<{ dates: string; reason: string; tip: string }>;
}

export interface HoroscopeGemstoneItem {
  name: string;
  sanskritName: string;
  rulingPlanet: string;
  benefits: string;
  wearingInstructions: {
    finger: string;
    metal: string;
    day: string;
    time: string;
    mantra: string;
  };
}

export interface HoroscopeGemstonesDto {
  primaryGem: HoroscopeGemstoneItem;
  secondaryGem: HoroscopeGemstoneItem;
  generalCaution: string;
}

export interface HoroscopeEmpoweredPathwaysDto {
  dos: string[];
  donts: string[];
  spiritualPractices: Array<{ practice: string; day: string; deity: string; description: string }>;
  fastsAndVrats: Array<{ name: string; frequency: string; procedure: string }>;
}

export interface HoroscopeNumerologyForecastDto {
  universalYear: number;
  universalYearMeaning: string;
  moonSignResonance: string;
  mulank: number;
  bhagyank: number;
  coreAlignmentAdvice: string;
}

export interface HoroscopeAffirmationDto {
  focusArea: string;
  planet: string;
  affirmationText: string;
  scientificInsight: string;
}

export interface HoroscopeQuarterlyForecastDto {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  period: string;
  rating: number; // 1-5 integer opportunity rating
  qualitativeRating?: string; // Qualitative description (e.g. "High Opportunity & Auspicious Growth")
  compositeScore?: number; // Exact unrounded composite average across component months
  focus: string;
  opportunities: string;
  challenges: string;
}

export interface HoroscopeMonthlyMatrixItemDto {
  month: string;
  careerRating: number;
  financeRating: number;
  healthRating: number;
  relationshipRating: number;
  summary: string;
}

export interface HoroscopeClosingNoteDto {
  author: string;
  message: string;
  ephemerisStandard: string;
  disclaimer: string;
}

export interface ProHoroscopeModel {
  version: string;
  type: ReportType.HOROSCOPE | ReportType.RASHI_BHAVISHYA;
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
  moonSignDetails?: HoroscopeMoonSignDetailsDto;
  yearlyOverview?: HoroscopeYearlyOverviewDto;
  personalityTraits?: {
    coreIdentity: string;
    traits: HoroscopePersonalityTraitItem[];
  };
  lifeDomainForecasts?: HoroscopeLifeDomainDto[];
  planetaryInfluences?: HoroscopePlanetaryInfluenceDto[];
  favorableUnfavorable?: HoroscopeFavorableUnfavorableDto;
  gemstones?: HoroscopeGemstonesDto;
  empoweredPathways?: HoroscopeEmpoweredPathwaysDto;
  numerologyForecast?: HoroscopeNumerologyForecastDto;
  affirmations?: HoroscopeAffirmationDto[];
  quarterlyForecasts?: HoroscopeQuarterlyForecastDto[];
  monthlyForecastMatrix?: HoroscopeMonthlyMatrixItemDto[];
  closingNote?: HoroscopeClosingNoteDto;
  normalizedTime?: any;
  sections: ReportSectionDto[];
}

export type PersonalisedHoroscopeModel = ProHoroscopeModel;

// -----------------------------------------------------------------------------
// MATCHMAKING REPORT (ASHTAKOOTA & GUNA MILAN) MODEL
// -----------------------------------------------------------------------------

export interface KootaScoreDto {
  name: string;
  sanskritName: string;
  maxPoints: number;
  obtainedPoints: number;
  status: 'EXCELLENT' | 'AVERAGE' | 'DOSHA' | 'DEFICIENT' | 'NEEDS_ATTENTION';
  description: string;
  boyDetail: string;
  girlDetail: string;
  hasDosha?: boolean;
  areaOfLife?: string;
}

export interface MatchmakingReportModel {
  version: string;
  type: ReportType.MARRIAGE_COMPATIBILITY;
  title: string;
  generatedAt: string;
  profile1: ReportProfileDto; // Partner A / Groom
  profile2: ReportProfileDto; // Partner B / Bride
  configuration: ReportConfigDto;
  isTimeUnknownA?: boolean;
  isTimeUnknownB?: boolean;
  isMoonIndeterminate?: boolean;
  astroDetails?: {
    boy: {
      ascendantSign: string;
      ascendantLord: string;
      moonSign: string;
      moonLord: string;
      nakshatra: string;
      pada: number;
      nakshatraLord: string;
      varna: string;
      vashya: string;
      yoni: string;
      gana: string;
      nadi: string;
      varga: string;
      isTimeUnknown?: boolean;
    };
    girl: {
      ascendantSign: string;
      ascendantLord: string;
      moonSign: string;
      moonLord: string;
      nakshatra: string;
      pada: number;
      nakshatraLord: string;
      varna: string;
      vashya: string;
      yoni: string;
      gana: string;
      nadi: string;
      varga: string;
      isTimeUnknown?: boolean;
    };
    vargaRelationship: string;
  };
  gunaMilan: {
    totalScore: number;
    nominalScore?: number;
    maxScore: number; // 36
    verdict: string; // e.g. "UTTAM (HIGHLY AUSPICIOUS)", "MADHYAMA (AVERAGE)"
    verdictDescription: string;
    kootas: KootaScoreDto[];
    isIndeterminate?: boolean;
  };
  manglikComparison: {
    personA: {
      name: string;
      isManglik: boolean;
      status?: 'Present' | 'Not Present' | 'Indeterminate';
      severity: string;
      factors: string[];
      marsHouse?: number | null;
      isIndeterminate?: boolean;
      statusFromLagna?: 'Present' | 'Not Present' | 'Indeterminate';
      statusFromMoon?: 'Present' | 'Not Present' | 'Indeterminate';
      statusFromVenus?: 'Present' | 'Not Present' | 'Indeterminate';
    };
    personB: {
      name: string;
      isManglik: boolean;
      status?: 'Present' | 'Not Present' | 'Indeterminate';
      severity: string;
      factors: string[];
      marsHouse?: number | null;
      isIndeterminate?: boolean;
      statusFromLagna?: 'Present' | 'Not Present' | 'Indeterminate';
      statusFromMoon?: 'Present' | 'Not Present' | 'Indeterminate';
      statusFromVenus?: 'Present' | 'Not Present' | 'Indeterminate';
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
  predictions?: {
    nature: string;
    health: string;
    inLawsMale: string;
    inLawsFemale: string;
    children: string;
  };
  sections: ReportSectionDto[];
}

// -----------------------------------------------------------------------------
// CAREER REPORT (BASIC & PRO) MODEL
// -----------------------------------------------------------------------------

export interface CareerHouseAnalysisDto {
  houseNumber: number;
  sign: string;
  signLord: string;
  occupants: string[];
  aspectingPlanets: string[];
  significance: string;
  interpretation: string;
}

export interface PlanetarySignificatorDto {
  planet: string;
  sign: string;
  house: number;
  role: string;
  dignity: string;
  impactOnCareer: string;
}

export interface CareerYogaDto {
  name: string;
  category: string;
  planetsInvolved: string[];
  description: string;
  careerImpact: string;
}

export interface D10DashamshaAnalysisDto {
  ascendantSign: string;
  ascendantLord: string;
  ascendantTraits: string[];
  tenthSign: string;
  tenthLord: string;
  tenthLordPlacement: { sign: string; house: number; planet: string };
  occupantsInTenth: string[];
  sixthLordAnalysis?: { planet: string; sign: string; house: number; impact: string };
  seventhLordAnalysis?: { planet: string; sign: string; house: number; impact: string };
  synthesis: string;
}

export interface JaiminiAmatyakarakaDto {
  planet: string;
  degreeInSign: number;
  sign: string;
  signLord: string;
  house: number;
  coreAdvisory: string;
  naturalTalents: string[];
  idealWorkEnvironments: string[];
  growthAdvice: string;
}

export interface BnnSaturnAnalysisDto {
  saturnSign: string;
  saturnHouse: number;
  saturnDignity: string;
  saturnMindset: string;
  saturnInSignAnalysis: string;
  saturnAspects: Array<{ house: number; sign: string; nature: string }>;
  saturnPlanetaryChains: Array<{ planet: string; relationship: string; significance: string; synthesis: string }>;
}

export interface GovernmentJobAnalysisDto {
  sunDignity: string;
  sunHouse: number;
  saturnRelationship: string;
  sixthHouseInfluence: string;
  tenthHouseInfluence: string;
  rajyaSevaYogaStatus: 'STRONG' | 'MODERATE' | 'NEUTRAL' | 'CHALLENGING';
  verdict: string;
  recommendations: string[];
}

export interface EntrepreneurialCompassDto {
  mercurySign: string;
  mercuryHouse: number;
  venusSign: string;
  venusHouse: number;
  seventhHouseLord: string;
  seventhHouseSign: string;
  ashtakavargaSavPoints: {
    tenthHouse: number;
    eleventhHouse: number;
    seventhHouse: number;
    sixthHouse: number;
    firstHouse: number;
  };
  comparativeAnalysis: {
    sixthVsSeventhVerdict: 'EMPLOYMENT_PREFERRED' | 'BUSINESS_PREFERRED' | 'BALANCED';
    sixthVsSeventhAnalysis: string;
    eleventhVsTenthVerdict: 'REWARDS_EXCEED_EFFORT' | 'EFFORT_PRECEDES_REWARDS' | 'BALANCED';
    eleventhVsTenthAnalysis: string;
    preferredOrientation: 'EMPLOYMENT_FOCUSED' | 'BUSINESS_ENTREPRENEURIAL' | 'BALANCED_DUAL';
    rationale: string;
  };
  favorableSectors: string[];
}

export interface MultiYearCareerRoadmapItemDto {
  period: string;
  mahadasha: string;
  antardasha: string;
  durationYears: number;
  careerPhase: string;
  opportunities: string[];
  challenges: string[];
  actionableAdvice: string;
  astrologicalBasis: string;
}

export interface CareerRemediesDto {
  primaryGemstone: {
    gemstone: string;
    sanskritName: string;
    rulingPlanet: string;
    finger: string;
    metal: string;
    day: string;
    benefits: string;
    caution: string;
  };
  secondaryGemstone?: {
    gemstone: string;
    sanskritName: string;
    rulingPlanet: string;
    finger: string;
    metal: string;
    day: string;
    benefits: string;
    caution: string;
  };
  mantras: Array<{ planet: string; mantraText: string; count: number; purpose: string }>;
  lifestyleAndHabits: string[];
  karmicCharity: Array<{ planet: string; charityItem: string; day: string; recipient: string }>;
}

export interface CareerClosingNoteDto {
  author: string;
  title: string;
  message: string;
  ephemerisStandard: string;
  disclaimer: string;
}

export interface CareerReportModel extends StructuredReportModel {
  type: ReportType.CAREER | ReportType.CAREER_PROSITY;
  tier: 'BASIC' | 'PRO';
  careerOverview: {
    destinyTheme: string;
    executiveSummary: string;
    dominantElement: string;
  };
  careerHouses: CareerHouseAnalysisDto[];
  planetarySignificators: PlanetarySignificatorDto[];
  careerYogas: CareerYogaDto[];
  d10Summary: D10DashamshaAnalysisDto;
  suitableIndustries: string[];
  workEnvironments: string[];
  aptitudesAndPathways: string[];
  // Pro Tier Additions:
  d10DashamshaDeepDive?: D10DashamshaAnalysisDto;
  amatyakaraka?: JaiminiAmatyakarakaDto;
  bnnSaturnAnalysis?: BnnSaturnAnalysisDto;
  governmentJobAnalysis?: GovernmentJobAnalysisDto;
  entrepreneurialCompass?: EntrepreneurialCompassDto;
  multiYearCareerRoadmap?: MultiYearCareerRoadmapItemDto[];
  careerRemedies?: CareerRemediesDto;
  closingNote?: CareerClosingNoteDto;
}

// ---------------------------------------------------------------------------
// PERSONALISED FINANCE & WEALTH DOSSIER TYPES
// ---------------------------------------------------------------------------

export interface WealthHouseAnalysisDto {
  houseNumber: number; // 2, 11, 9, 10, 12, etc.
  bhavaName: string; // "Dhana Bhava", "Labha Bhava", "Bhagya Bhava", "Karma Bhava", "Vyaya Bhava"
  sign: string;
  lord: string;
  lordPlacementHouse: number;
  lordPlacementSign: string;
  occupantPlanets: string[];
  aspectingPlanets: string[];
  strengthScore: number;
  financialSignificance: string;
  interpretation: string;
}

export interface FinancialSignificatorDto {
  planet: string; // Jupiter, Mercury, Venus, Sun, Saturn
  role: string;
  sign: string;
  house: number;
  degree: number;
  dignity: string;
  financialInfluence: string;
  recommendation: string;
}

export interface DhanaYogaDto {
  name: string;
  description: string;
  participatingPlanets: string[];
  participatingHouses: number[];
  classicalReference: string;
  status: 'ACTIVE' | 'PARTIAL' | 'ABSENT';
  wealthImpact: string;
}

export interface SavWealthFlowDto {
  housePoints: Record<number, number>; // 1-12
  dhanaPoints: number; // H2
  labhaPoints: number; // H11
  karmaPoints: number; // H10
  vyayaPoints: number; // H12
  wealthRetentionRatio: number;
  comparativeSavIndicator?: string;
  inflowVsOutflowSummary: string;
  cashflowTrajectory: string;
}

export interface AnnualFinancialForecastDto {
  year: number;
  annualTheme: string;
  overview: string;
  keyTransitInfluences: Array<{
    planet: string;
    sign: string;
    houseFromMoon: number;
    transitEffect: string;
  }>;
  quarterlyOutlook: Array<{
    quarter: string;
    outlook: string;
    rating: number;
    outlookAssessment?: string;
    recommendations: string;
  }>;
  auspiciousWindows: string[];
  cautionWindows: string[];
}

export interface VimshottariFinancialPeriodDto {
  periodName: string;
  startDate: string;
  endDate: string;
  mahadashaLord: string;
  antardashaLord: string;
  financialTone: string;
  recommendation: string;
}

export interface FinancialRemediesDto {
  primaryGemstone: {
    name: string;
    planet: string;
    weightCarats: string;
    metal: string;
    finger: string;
    wearingDay: string;
    mantra: string;
    rationale: string;
  };
  secondaryGemstone?: {
    name: string;
    planet: string;
    weightCarats: string;
    metal: string;
    finger: string;
    wearingDay: string;
    mantra: string;
    rationale: string;
  };
  dashaGemstones: Array<{
    dashaLord: string;
    gemstone: string;
    applicability: string;
  }>;
  rudrakshaKavach: {
    mukhis: number[];
    rulingDeities: string;
    benefits: string;
    consecrationRitual: string;
    wearingDay: string;
    sacredMantra: string;
  };
  sacredMantras: Array<{
    deity: string;
    mantra: string;
    count: number;
    purpose: string;
  }>;
  ethicalStewardshipRules: string[];
}

export interface FinanceClosingNoteDto {
  author: string;
  title: string;
  message: string;
  ephemerisStandard: string;
  nonInvestmentDisclaimer: string;
}

export interface FinanceReportModel extends StructuredReportModel {
  type: ReportType.FINANCE;
  financialOverview: {
    dominantElement: string;
    lagnaLordFinancialStatus: string;
    primaryDhanaLord: string;
    primaryLabhaLord: string;
    wealthAccumulationCapacity: 'EXCEPTIONAL' | 'STRONG' | 'MODERATE' | 'VOLATILE';
    executiveSummary: string;
  };
  wealthHouses: WealthHouseAnalysisDto[];
  financialSignificators: FinancialSignificatorDto[];
  dhanaYogas: DhanaYogaDto[];
  savWealthFlow: SavWealthFlowDto;
  multiYearForecast: AnnualFinancialForecastDto[];
  vimshottariDashaTimeline: VimshottariFinancialPeriodDto[];
  financialRemedies: FinancialRemediesDto;
  closingNote: FinanceClosingNoteDto;
}

// ---------------------------------------------------------------------------
// LOVE REPORT DTOs & MODEL (Phase 6.5)
// ---------------------------------------------------------------------------

export interface LoveAstralDetailsDto {
  birthDate: string;
  birthTime: string;
  mulank: number;
  bhagyank: number;
  lagnaAscendant: string;
  nakshatra: string;
  moonSign: string;
  venusHousePlacement: number;
  venusSignPlacement: string;
  darkarak: string;
}

export interface LoveMirrorOfSoulDto {
  personalityTitle: string;
  personalityInsights: string;
  loveLanguage: string;
  emotionalExpression: string;
  moonlightAndLoveTitle: string;
  moonlightAndLoveInsights: string;
  emotionalRefugeNeeds: string;
}

export interface LoveVenusCelestialCupidDto {
  personalGuideTitle: string;
  venusHouseSignInsights: string;
  aestheticSensibilities: string;
  romanticApproach: string;
  languageOfVenusTitle: string;
  venusConjunctions: Array<{
    conjunctionWith: string;
    house: number;
    sign: string;
    influence: string;
    advice: string;
  }>;
}

export interface LoveCompassDto {
  fifthHouseSign: string;
  fifthHouseLord: string;
  heartstringsInsights: string;
  romanceAndDatingStyle: string;
  artOfAttraction: string;
}

export interface LoveMarriageHouseDto {
  seventhHouseSign: string;
  seventhHouseLord: string;
  eternalBondsInsights: string;
  marriageTone: string;
  togethernessStrengths: string;
}

export interface LoveSpousePortraitDto {
  partnerPortraitInsights: string;
  partnerCharacteristics: string[];
  darakarakaPlanet: string;
  darakarakaInsights: string[];
  darakarakaHouse: number;
  darakarakaHouseInsights: string[];
}

export interface LoveNumerologyDto {
  mulank: number;
  bhagyank: number;
  numerologyInsights: string[];
}

export interface LoveStarsOfFavourDto {
  compatibleMulanks: number[];
  compatibleMoonSigns: string[];
  luckyDays: string[];
  luckyColours: string[];
  favourableStone: string;
  rudraksh: string;
  luckyDates: string[];
  luckyBracelet: string;
}

export interface LoveCosmicRedFlagsDto {
  incompatibleMulanks: number[];
  frictionMoonSigns: string[];
  unfavourableDays: string[];
  unfavourableStones: string[];
  tithiAnalysis: {
    shuklaPaksha: {
      good: string[];
      moderate: string[];
      challenging: string[];
    };
    krishnaPaksha: {
      good: string[];
      moderate: string[];
      challenging: string[];
    };
  };
  nakshatraQualities: {
    nakshatraName: string;
    qualities: string;
  };
}

export interface LoveMarriageTimingWindowDto {
  rating: 'Good' | 'Very Good' | 'Fair';
  beginningPeriod: string;
  endingPeriod: string;
  astrologicalBasis: string;
}

export interface LovePathToEverlastingLoveDto {
  personalizedSuggestions: string[];
  consecratedRemedies: Array<{
    title: string;
    remedy: string;
    category: 'MANTRA' | 'COLOUR' | 'FOOD' | 'DEITY' | 'PURIFICATION';
  }>;
  marriageTimingWindows: LoveMarriageTimingWindowDto[];
}

export interface LoveClosingNoteDto {
  epilogueTitle: string;
  epilogueMessage: string;
  offerCouponCode: string;
  offerDetails: string;
  closingBlessing: string;
}

export interface LoveReportModel extends StructuredReportModel {
  type: ReportType.LOVE;
  astralDetails: LoveAstralDetailsDto;
  mirrorOfSoul: LoveMirrorOfSoulDto;
  venusCelestialCupid: LoveVenusCelestialCupidDto;
  loveCompass: LoveCompassDto;
  marriageHouse: LoveMarriageHouseDto;
  spousePortrait: LoveSpousePortraitDto;
  numerologyOfLove: LoveNumerologyDto;
  starsOfFavour: LoveStarsOfFavourDto;
  cosmicRedFlags: LoveCosmicRedFlagsDto;
  pathToEverlastingLove: LovePathToEverlastingLoveDto;
  closingNote: LoveClosingNoteDto;
}

// =============================================================================
// PHASE 6.6: PERSONALISED FORTUNE REPORT TYPES
// =============================================================================

export interface FortuneLuckyProfileDto {
  name: string;
  nameNumber: number;
  birthDate: string;
  gender: string;
  sunSign: string;
  mulank: number;
  mulankLord: string;
  bhagyank: number;
  bhagyankLord: string;
  kuaNumber: number;
  luckyNumbers: number[];
  avoidNumbers: number[];
  luckyColours: string[];
  luckyDates: string[];
  luckyYears: string[];
  successNumber: number;
  luckyRudraksh: string;
  luckyBracelet: string;
  luckyYantra: string;
  favourableMantra: string;
}

export interface FortuneNumerologyAnalysisDto {
  mulankDetails: {
    number: number;
    rulingPlanet: string;
    characteristics: string[];
    advice: string[];
    favourablePeriod: string;
    avoidPeriod: string;
  };
  bhagyankDetails: {
    number: number;
    rulingPlanet: string;
    spiritualSignificance: string;
    intuitiveGifts: string[];
  };
  birthDateDecoding: string;
  combinationInsights: string;
  zodiacTraits: {
    sunSign: string;
    traits: string[];
  };
  deityAndFasting: {
    deity: string;
    fastingDay: string;
    ritualGuidance: string;
  };
  friendshipCompatibility: Record<number, string>;
  romanceCompatibility: Record<number, string>;
}

export interface FortuneHealthAndCareerDto {
  healthVulnerabilities: string[];
  wellnessSolutions: string[];
  careerOptions: string[];
  wealthGuidance: string[];
}

export interface FortuneGridDto {
  loShuMatrix: number[][];
  numberOccurrences: Record<number, number>;
  arrowsOfStrength: Array<{ name: string; numbers: number[]; present: boolean; description: string }>;
  arrowsOfWeakness: Array<{ name: string; missingNumbers: number[]; description: string }>;
  missingNumberRemedies: Array<{ number: number; missingImpact: string; remedy: string }>;
}

export interface FortuneKuaAndDirectionDto {
  kuaNumber: number;
  element: string;
  group: string;
  favourableDirections: {
    wealthShengChi: string;
    healthTienYi: string;
    romanceNienYen: string;
    growthFuWei: string;
  };
  avoidDirections: string[];
}

export interface FortuneNameAnalysisDto {
  name: string;
  nameNumber: number;
  soulUrgeNumber: number;
  personalityNumber: number;
  maturityNumber: number;
  nameGrid: Record<number, number>;
  nameNumberInterpretation: string;
}

export interface FortuneTrendDto {
  currentYear: number;
  personalYear: number;
  personalYearTheme: string;
  personalMonths: Array<{
    monthNumber: number;
    monthName: string;
    personalMonthNumber: number;
    guidance: string;
  }>;
}

export interface FortuneLifeChallengesDto {
  challengeCycles: Array<{
    cycle: number;
    ageRange: string;
    challengeNumber: number;
    description: string;
  }>;
}

export interface FortuneCosmicPathwayDto {
  charts: {
    lagna: ReportHouseDto[];
    moon: ReportHouseDto[];
    navamsha: ReportHouseDto[];
    lalKitab: ReportHouseDto[];
  };
  panchang: {
    tithi: string;
    vara: string;
    nakshatra: string;
    yoga: string;
    karana: string;
  };
  janmNakshatra: {
    name: string;
    pada: number;
    rulingLord: string;
    symbol: string;
    qualities: string[];
  };
}

export interface FortuneAstrologyAnalysisDto {
  rashiPredictions: {
    lagnaSign: string;
    moonSign: string;
    keyTraits: string[];
  };
  planetsInHouses: Array<{
    planet: string;
    sign: string;
    house: number;
    attributes: string;
  }>;
  manglikDosh: {
    hasManglik: boolean;
    doshType: 'NONE' | 'ANSHIK' | 'PURNA';
    marsPlacement: string;
    mitigatingFactors: string[];
    remedies: string[];
  };
  sadeSati: {
    currentStatus: string;
    isUnderSadeSati: boolean;
    shaniPlacement: string;
    phaseAnalysis: string;
    remedies: string[];
  };
  yogas: Array<{
    name: string;
    status: 'ACTIVE' | 'INACTIVE';
    planetsInvolved: string[];
    influence: string;
  }>;
  marriageAndSpouse: {
    darakarakaPlanet: string;
    darakarakaHouse: number;
    spouseTraits: string[];
    timingWindows: Array<{
      rating: string;
      beginningPeriod: string;
      endingPeriod: string;
      astrologicalBasis: string;
    }>;
  };
  careerPredictions: {
    vocationalSignificators: string[];
    careerTrajectory: string;
  };
}

export interface FortuneRemediesDto {
  sacredYantras: Array<{ name: string; purpose: string }>;
  rudrakshaRecommendation: { name: string; mukhi: string; purpose: string };
  gemstonesAndCrystals: Array<{ stone: string; substitute: string; fingerMetal: string; mantra: string }>;
  lifestyleRemedies: string[];
  closingBlessing: string;
}

export interface FortuneReportModel extends Omit<StructuredReportModel, 'remedies'> {
  type: ReportType.FORTUNE;
  luckyProfile: FortuneLuckyProfileDto;
  numerologyAnalysis: FortuneNumerologyAnalysisDto;
  healthAndCareer: FortuneHealthAndCareerDto;
  fortuneGrid: FortuneGridDto;
  kuaAndDirection: FortuneKuaAndDirectionDto;
  nameAnalysis: FortuneNameAnalysisDto;
  fortuneTrend: FortuneTrendDto;
  lifeChallenges: FortuneLifeChallengesDto;
  cosmicPathway: FortuneCosmicPathwayDto;
  astrologyAnalysis: FortuneAstrologyAnalysisDto;
  remedies: FortuneRemediesDto;
}

// =============================================================================
// PHASE 6.11: PERSONALISED FORTUNE REPORT PLUS DATA CONTRACTS & DTOS
// =============================================================================

export interface FortunePlusAreYouOnRightPathDto {
  successNumber: number;
  successNumberFormula: string;
  successNumberQualities: string[];
  successNumberChallenges: string[];
  connectionNumber: number;
  connectionNumberFormula: string;
  connectionNumberSynthesis: string;
  maturityNumber: number;
  maturityNumberFormula: string;
  maturityNumberQualities: string[];
  maturityNumberGuidance: string;
}

export interface FortunePlusEverydayLuckyItemsDto {
  luckyEmailId: string;
  emailModificationRules: string[];
  luckyBanks: string[];
  luckyTattoo: string;
  signatureAdvice: string;
}

export interface FortunePlusMissingNumberRemedyDto {
  number: number;
  planet: string;
  impact: string;
  remedy: string;
  mantra: string;
}

export interface FortunePlusHealthMantrasDto {
  mahamrityunjaya: {
    title: string;
    mantra: string;
    pronunciation: string;
    hindi: string;
    timing: string;
  };
  suryaMantra: {
    title: string;
    mantra: string;
    pronunciation: string;
    hindi: string;
    timing: string;
  };
  gayatriMantra: {
    title: string;
    mantra: string;
    pronunciation: string;
    hindi: string;
    timing: string;
  };
}

export interface FortunePlusLifePinnacleCycleDto {
  cycle: number;
  ageRange: string;
  pinnacleNumber: number;
  phaseName: string;
  attributes: string;
  phaseOpportunity: string;
}

export interface FortunePlusReportModel extends Omit<StructuredReportModel, 'remedies'> {
  type: ReportType.FORTUNE_PLUS;
  luckyProfile: FortuneLuckyProfileDto;
  numerologyAnalysis: FortuneNumerologyAnalysisDto;
  healthAndCareer: FortuneHealthAndCareerDto;
  fortuneGrid: FortuneGridDto;
  kuaAndDirection: FortuneKuaAndDirectionDto;
  nameAnalysis: FortuneNameAnalysisDto;
  fortuneTrend: FortuneTrendDto;
  lifeChallenges: FortuneLifeChallengesDto;
  lifePinnacles: FortunePlusLifePinnacleCycleDto[];
  areYouOnRightPath: FortunePlusAreYouOnRightPathDto;
  everydayLuckyItems: FortunePlusEverydayLuckyItemsDto;
  missingNumberRemedies: FortunePlusMissingNumberRemedyDto[];
  healthMantras: FortunePlusHealthMantrasDto;
  threeRemedyCautionRule: string;
  cosmicPathway: FortuneCosmicPathwayDto;
  astrologyAnalysis: FortuneAstrologyAnalysisDto;
  remedies: FortuneRemediesDto;
}

// =============================================================================
// SATURN REPORT (PHASE 6.8) DATA CONTRACTS & DTOS
// =============================================================================

export interface SaturnPlacementDto {
  sign: string;
  signIndex: number;
  degree: number;
  degreeInRashi: number;
  house: number | null;
  houseFormatted: string;
  nakshatra: string;
  pada: number;
  nakshatraLord: string;
  dignity: string;
  isRetrograde: boolean;
  isCombust: boolean;
  lordship: number[];
  traits: string[];
  karmicLesson: string;
}

export interface SaturnAspectsDto {
  aspects: Array<{
    aspectNumber: number; // 3, 7, 10
    house: number | null;
    sign: string;
    areaTested: string;
  }>;
  description: string;
}

export interface SaturnBeneficVsMaleficDto {
  nature: string;
  challenges: string[];
  growthOpportunities: string[];
}

export interface SaturnMoonRelationDto {
  moonSign: string;
  moonNakshatra: string;
  moonPada: number;
  moonNakshatraLord: string;
  saturnRelationToMoonLord: string;
  houseFromMoon: number;
  archetype: string;
  psycheEvolution: string;
}

export interface SaturnNakshatraAnalysisDto {
  nakshatra: string;
  pada: number;
  lord: string;
  symbol: string;
  deity: string;
  karmicTheme: string;
}

export interface SaturnConjunctionsDto {
  conjoinedPlanets: string[];
  interpretation: string;
}

export interface SaturnAshtakavargaDto {
  bindus: number[];
  total: number;
  currentTransitHousePoints: number;
  natalHousePoints: number | null;
  matrix: Array<{ contributor: string; bindus: number[] }>;
  interpretation: string;
}

export interface SaturnSadeSatiDto {
  isActive: boolean;
  currentStatus: string;
  currentPhase: string;
  firstCycle: Array<{ phase: string; rashi: string; startDate: string; endDate: string }>;
  secondCycle: Array<{ phase: string; rashi: string; startDate: string; endDate: string }>;
  lifeOverview: {
    marriage: string;
    finance: string;
    health: string;
    career: string;
    spirituality: string;
  };
}

export interface SaturnTransitDetailDto {
  sign: string;
  startYear: string;
  endYear: string;
  houseFromLagna: number | null;
  houseFromMoon: number;
  retrogradePeriod: string;
  predictions: string[];
  aspects: string[];
  transitOverPlanets: string[];
}

export interface SaturnKantakShaniDto {
  isActiveFromMoon: boolean;
  houseFromMoon: number;
  isActiveFromLagna: boolean;
  houseFromLagna: number | null;
  isAshtamaShani: boolean;
  transitCategory?: 'KANTAK_SHANI' | 'ASHTAMA_SHANI' | 'SADE_SATI' | 'UPACHAYA_FAVORABLE' | 'NEUTRAL';
  specificType?: string;
  description: string;
  effects: string[];
  remedies: string[];
}

export interface SaturnRemediesDto {
  gemstone: {
    name: string;
    alternative: string;
    metal: string;
    finger: string;
    day: string;
    weightRule: string;
    caution: string;
  };
  rudraksha: {
    mukhi: string;
    benefits: string;
    ritual: string;
  };
  astrovastu: {
    direction: string;
    dos: string[];
    donts: string[];
  };
  charity: {
    items: string[];
    recipient: string;
    day: string;
    significance: string;
  };
  discipline: {
    habits: string[];
  };
  mantras: {
    beejMantra: string;
    gayatriMantra: string;
    dhyanMantra: string;
    guidelines: string;
  };
}

export interface SaturnReportModel extends Omit<StructuredReportModel, 'remedies'> {
  type: ReportType.SATURN;
  saturnPlacement: SaturnPlacementDto;
  saturnAspects: SaturnAspectsDto;
  beneficVsMalefic: SaturnBeneficVsMaleficDto;
  moonSignRelation: SaturnMoonRelationDto;
  saturnNakshatraAnalysis: SaturnNakshatraAnalysisDto;
  saturnConjunctions: SaturnConjunctionsDto;
  saturnAshtakavarga: SaturnAshtakavargaDto;
  sadeSatiPhases: SaturnSadeSatiDto;
  saturnTransits: {
    transit2025_2027: SaturnTransitDetailDto;
    transit2027_2029: SaturnTransitDetailDto;
  };
  kantakShani: SaturnKantakShaniDto;
  remedies: SaturnRemediesDto;
  iconicInspirations: Array<{
    name: string;
    title: string;
    story: string;
    takeaway: string;
  }>;
}

// =============================================================================
// JUPITER TRANSIT REPORT (PHASE 6.9) DATA CONTRACTS & DTOS
// =============================================================================

export interface JupiterPlacementDto {
  sign: string;
  signIndex: number;
  degree: number;
  degreeInRashi: number;
  house: number | null;
  houseFormatted: string;
  nakshatra: string;
  pada: number;
  dignity: string;
  isRetrograde: boolean;
  isCombust: boolean;
  lordship: number[];
  traits: string[];
  karmicLesson: string;
}

export interface JupiterAspectsDto {
  aspects: Array<{
    aspectNumber: number;
    house: number | null;
    sign: string;
    areaTested: string;
  }>;
  description: string;
}

export interface JupiterBeneficVsMaleficDto {
  nature: string;
  functionalRole: string;
  challenges: string[];
  growthOpportunities: string[];
}

export interface JupiterMoonRelationDto {
  moonSign: string;
  moonNakshatra: string;
  moonPada: number;
  jupiterRelationToMoonLord: string;
  houseFromMoon: number;
  archetype: string;
  psycheEvolution: string;
}

export interface JupiterNakshatraAnalysisDto {
  nakshatra: string;
  pada: number;
  lord: string;
  symbol: string;
  deity: string;
  karmicTheme: string;
}

export interface JupiterConjunctionsDto {
  conjoinedPlanets: string[];
  interpretation: string;
  yogas: string[];
}

export interface JupiterAshtakavargaDto {
  bindus: number[];
  total: number;
  currentGeminiPoints: number;
  cancerPoints: number;
  natalHousePoints: number | null;
  matrix: Array<{ contributor: string; bindus: number[] }>;
  interpretation: string;
}

export interface JupiterTransitPeriodDto {
  sign: string;
  period: string;
  houseFromLagna: number | null;
  houseFromMoon: number;
  predictions: string[];
  aspects: string[];
  physicalChanges: string[];
}

export interface JupiterRemediesDto {
  gemstone: {
    name: string;
    alternative: string;
    metal: string;
    finger: string;
    day: string;
    weightRule: string;
    caution: string;
  };
  rudraksha: {
    mukhi: string;
    benefits: string;
    ritual: string;
  };
  crystals: {
    citrine: string;
    yellowJasper: string;
    pyrite: string;
    angels: string;
  };
  astrovastu: {
    direction: string;
    zoneDescription: string;
    dos: string[];
    donts: string[];
  };
  mantras: {
    traditionalMantra: string;
    beejMantra: string;
    guruGayatri: string;
    guidelines: string;
  };
}

export interface JupiterTransitTimelineItemDto {
  phaseName: string;
  sign: string;
  signIndex: number;
  startDateIso: string;
  endDateIso: string;
  periodFormatted: string;
  motion: 'DIRECT' | 'RETROGRADE';
  dignity: string;
  houseFromLagna: number | null;
  houseFromMoon: number;
  status: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
}

export interface JupiterReportModel extends Omit<StructuredReportModel, 'remedies'> {
  type: ReportType.JUPITER_TRANSIT;
  referenceDateIso?: string;
  jupiterPlacement: JupiterPlacementDto;
  jupiterAspects: JupiterAspectsDto;
  beneficVsMalefic: JupiterBeneficVsMaleficDto;
  moonSignRelation: JupiterMoonRelationDto;
  jupiterNakshatraAnalysis: JupiterNakshatraAnalysisDto;
  jupiterConjunctions: JupiterConjunctionsDto;
  jupiterAshtakavarga: JupiterAshtakavargaDto;
  geminiTransit: JupiterTransitPeriodDto;
  cancerTransit: JupiterTransitPeriodDto;
  leoTransit: JupiterTransitPeriodDto;
  currentTransit: JupiterTransitPeriodDto;
  transitTimeline: JupiterTransitTimelineItemDto[];
  remedies: JupiterRemediesDto;
}

// =============================================================================
// RAHU-KETU TRANSIT REPORT (PHASE 6.9) DATA CONTRACTS & DTOS
// =============================================================================

export interface NodePlacementItemDto {
  planet: 'RAHU' | 'KETU';
  sign: string;
  signIndex: number;
  degree: number;
  degreeInRashi: number;
  house: number | null;
  houseFormatted: string;
  nakshatra: string;
  pada: number;
  dignity: string;
  isRetrograde: boolean;
  traits: string[];
  karmicFocus: string;
}

export interface RahuKetuPlacementDto {
  rahu: NodePlacementItemDto;
  ketu: NodePlacementItemDto;
  axisSeparation: number;
  axisName: string;
}

export interface RahuKetuAspectsDto {
  rahuAspects: Array<{
    aspectNumber: number;
    house: number | null;
    sign: string;
    influence: string;
  }>;
  ketuAspects: Array<{
    aspectNumber: number;
    house: number | null;
    sign: string;
    influence: string;
  }>;
  description: string;
}

export interface RahuKetuConjunctionsDto {
  rahuConjunctions: string[];
  ketuConjunctions: string[];
  interpretation: string;
}

export interface RahuKetuMoonRelationDto {
  moonSign: string;
  moonNakshatra: string;
  rahuHouseFromMoon: number;
  ketuHouseFromMoon: number;
  overallPower: string;
  psycheEvolution: string;
}

export interface RahuKetuKarmicJourneyDto {
  pastLifeKarma: string;
  soulObsessionRahu: string;
  soulReleaseKetu: string;
  karmicLesson: string;
}

export interface NodalTransitCycleDto {
  cycleName: string;
  period: string;
  rahuSign: string;
  rahuHouseFromLagna: number | null;
  rahuHouseFromMoon: number;
  rahuAspects: string[];
  rahuPredictions: string[];
  ketuSign: string;
  ketuHouseFromLagna: number | null;
  ketuHouseFromMoon: number;
  ketuAspects: string[];
  ketuPredictions: string[];
  spheresOfLife: Array<{ sphere: string; impact: string }>;
}

export interface RahuKetuRemediesDto {
  gemstones: {
    rahuGomedCaution: string;
    ketuCatsEyeCaution: string;
    safeAlternatives: string;
  };
  rudraksha: {
    rahuMukhi: string;
    rahuBenefits: string;
    ketuMukhi: string;
    ketuBenefits: string;
  };
  astrovastu: {
    rahuDirection: string;
    rahuZoneGuidance: string;
    ketuDirection: string;
    ketuZoneGuidance: string;
    generalRemedies: string[];
  };
  mantras: {
    durgaMantra: string;
    ganeshaMantra: string;
    rahuBeej: string;
    ketuBeej: string;
    chantingRules: string;
  };
}

export interface NodalTransitTimelineItemDto {
  cycleName: string;
  startDateIso: string;
  endDateIso: string;
  periodFormatted: string;
  rahuSign: string;
  rahuSignIndex: number;
  rahuHouseFromLagna: number | null;
  rahuHouseFromMoon: number;
  ketuSign: string;
  ketuSignIndex: number;
  ketuHouseFromLagna: number | null;
  ketuHouseFromMoon: number;
  status: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
}

export interface RahuKetuReportModel extends Omit<StructuredReportModel, 'remedies'> {
  type: ReportType.RAHU_KETU_TRANSIT;
  referenceDateIso?: string;
  nodalPlacement: RahuKetuPlacementDto;
  nodalAspects: RahuKetuAspectsDto;
  nodalConjunctions: RahuKetuConjunctionsDto;
  moonSignRelation: RahuKetuMoonRelationDto;
  karmicJourney: RahuKetuKarmicJourneyDto;
  transit2025_2026: NodalTransitCycleDto;
  transit2026_2028: NodalTransitCycleDto;
  transit2028_2030: NodalTransitCycleDto;
  currentCycle: NodalTransitCycleDto;
  transitTimeline: NodalTransitTimelineItemDto[];
  remedies: RahuKetuRemediesDto;
}

// =============================================================================
// VARSHPHAL ANNUAL REPORT (PHASE 6.10)
// =============================================================================

export interface SolarReturnDto {
  targetYear: number;
  age: number;
  natalSunLongitude: number;
  solarReturnSunLongitude: number;
  angularErrorDegrees: number;
  solarReturnUtcIso: string;
  solarReturnLocalIso: string;
  timezone: string;
  annualLocation: {
    latitude: number;
    longitude: number;
    timezone: string;
    placeName?: string;
  };
}

export interface VarshaLagnaDto {
  sign: string;
  signIndex: number;
  degree: number;
  degreeInRashi: number;
  nakshatra: string;
  pada: number;
  lord: string;
}

export interface MunthaDto {
  rashiIndex: number;
  rashiName: string;
  houseInVarshaChart: number;
  houseInNatalChart: number;
  lord: string;
  progressionYears: number;
  interpretation: string;
  karmicLesson: string;
}

export interface VarsheshaDto {
  selectedVarshesha: string;
  role: string;
  selectionReason: string;
  aspectsVarshaLagna: boolean;
  harshaBalaScore: number;
  candidates: Array<{
    role: string;
    roleTitle: string;
    planet: string;
    sourceDescription: string;
    aspectsVarshaLagna: boolean;
    harshaBalaScore: number;
    houseInVarshaChart: number;
  }>;
}

export interface HarshaBalaScoresDto {
  scores: Record<
    string,
    {
      sthanaBala: number;
      ucchaBala: number;
      striPurushaBala: number;
      dinaRatriBala: number;
      totalScore: number;
      hasHarsha: boolean;
    }
  >;
}

export interface TajikaYogaDto {
  type: string;
  name: string;
  planet1: string;
  planet2: string;
  intermediaryPlanet?: string;
  orbDegrees: number;
  actualDistanceDegrees: number;
  isApplying: boolean;
  description: string;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
}

export interface AnnualPlanetEffectDto {
  planet: string;
  house: number;
  sign: string;
  effect: 'Favourable' | 'Unfavourable';
  description: string;
  bullets: string[];
}

export interface MuddaDashaItemDto {
  planet: string;
  startDateIso: string;
  endDateIso: string;
  periodFormatted: string;
  durationDays: number;
  isCurrent: boolean;
}

export interface MonthlyForecastRatingsDto {
  career: number | null;
  love: number | null;
  health: number | null;
  family: number | null;
  education: number | null;
  spirituality: number | null;
  isIndeterminate?: boolean;
  qualitativeNarrative?: string;
}

export interface MonthlyForecastDto {
  monthName: string;
  monthIndex: number;
  year: number;
  periodFormatted: string;
  ratings: MonthlyForecastRatingsDto;
  overview: string;
  careerBusiness: string;
  loveRelationships: string;
  healthVitality: string;
  familyHome: string;
  educationLearning: string;
  spiritualGrowth: string;
  remedies: string[];
}

export interface PanchangRemedyDto {
  occasionName: string;
  theme: string;
  significance: string;
  remedies: string[];
}

export interface VarshphalReportModel extends Omit<StructuredReportModel, 'remedies'> {
  type: ReportType.VARSHPHAL;
  targetYear: number;
  referenceDateIso?: string;
  isTimeUnknown?: boolean;
  solarReturn: SolarReturnDto;
  varshaLagna: VarshaLagnaDto;
  muntha: MunthaDto;
  varshesha: VarsheshaDto;
  harshaBala: HarshaBalaScoresDto;
  tajikaYogas: TajikaYogaDto[];
  annualPlanetEffects: AnnualPlanetEffectDto[];
  muddaDasha: MuddaDashaItemDto[];
  monthlyForecasts: MonthlyForecastDto[];
  panchangRemedies: PanchangRemedyDto[];
  remedyCaution: string;
  natalChartPlacements: Array<{
    planet: string;
    sign: string;
    degree: number;
    house: number;
    isRetrograde?: boolean;
  }>;
  annualChartPlacements: Array<{
    planet: string;
    sign: string;
    degree: number;
    house: number;
    isRetrograde?: boolean;
    isCombust?: boolean;
  }>;
}

