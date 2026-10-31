export type DataStatus = 'VERIFIED' | 'DERIVED' | 'UNAVAILABLE';

export interface ClientReportHeader {
  clientName: string;
  dateOfBirth: string;
  timeOfBirth: string;
  birthPlace: string;
  timeZone: string;
  latitude: string;
  longitude: string;
  birthDataSource: string;
  birthDataConfidence: string;
  reportDate: string;
  reportType: string;
  privacyStatus: string;
  reportDataStatus: DataStatus;
  sourcePackageSummary: string;
  birthDataScopeNote: string;
  utcTimeOfBirth?: string;
  utcOffsetMinutes?: number;
  ephemerisProvider?: string;
  calculationVersion?: string;
  reportTemplateVersion?: string;
}

export interface CalculationConfigModel {
  zodiacSystem: string;
  zodiacSystemStatus: DataStatus;
  ayanamsa: string;
  ayanamsaStatus: DataStatus;
  houseSystem: string;
  houseSystemStatus: DataStatus;
  nodeMode: string;
  nodeModeStatus: DataStatus;
  calculationVersion: string;
  calculationVersionStatus: DataStatus;
  vimshottariBasis: string;
  vimshottariBasisStatus: DataStatus;
  transitReference: string;
  transitReferenceStatus: DataStatus;
  divisionalChartsIncluded: string;
  divisionalChartsStatus: DataStatus;
  chartStatus: DataStatus;
  chartConfigurationNote: string;
  kundliCenterLabel: string;
  kundliUpperLabel: string;
  kundliLowerLabel: string;
  chartVisualizationStatus: DataStatus;
  chartVisualizationNote: string;
  kundliHouseNodes?: Record<number, string>;
}

export interface AscendantReportModel {
  sign: string;
  degree: string;
  nakshatra: string;
  pada: string;
  status: DataStatus;
  careerInterpretation: string;
  lord: string;
  lordSign: string;
  lordHouse: string;
  lordDegree: string;
  lordNakshatra: string;
  lordCondition: string;
  lordRelationships: string;
  lordStatus: DataStatus;
  lordInterpretation: string;
  rashiIndex?: number;
  nakshatraLord?: string;
}

export interface HouseReportModel {
  houseNumber: number;
  houseName: string;
  sign: string;
  degree: string;
  lord: string;
  lordPlacement: string;
  occupants: string;
  aspects: string;
  condition: string;
  nakshatraInfo: string;
  careerInterpretation: string;
  constructiveExpression: string;
  challenge: string;
  practicalInterpretation: string;
  status: DataStatus;
  bhavaBalaScore?: string;
  bhavaBalaRank?: number;
}

export interface PlanetReportModel {
  name: string;
  sign: string;
  degree: string;
  house: string;
  nakshatra: string;
  pada: string;
  dignity: string;
  retrograde: string;
  combustion: string;
  lordship: string;
  aspectsRelationships: string;
  strength: string;
  careerSignificance: string;
  constructiveExpression: string;
  potentialChallenge: string;
  placementInterpretation: string;
  practicalCareerInterpretation: string;
  status: DataStatus;
  speed?: string;
  avastha?: string;
  charaKaraka?: string;
  shadbalaScore?: string;
  shadbalaRank?: number;
}

export interface VargaChartReportModel {
  vargaType: string;
  division: number;
  name: string;
  sanskritName: string;
  purpose: string;
  careerRelevance: string;
  ascendantSign: string;
  ascendantLord: string;
  status: DataStatus;
  kundliHouseNodes: Record<number, string>;
  placements: Array<{
    planet: string;
    sign: string;
    house: number;
    isRetrograde: boolean;
  }>;
  analysisText: string;
}

export interface D10DashamshaReportModel {
  chart: VargaChartReportModel;
  ascendantSign: string;
  ascendantLord: string;
  ascendantLordPlacement: string;
  tenthHouseSign: string;
  tenthHouseLord: string;
  tenthHouseLordPlacement: string;
  tenthHouseOccupants: string;
  sixthHouseSign: string;
  sixthHouseLord: string;
  seventhHouseSign: string;
  seventhHouseLord: string;
  sunInD10: string;
  saturnInD10: string;
  amatyakarakaInD10: string;
  d10DignitySummary: string;
  d1D10Synthesis: string;
  status: DataStatus;
}

export interface NakshatraReportItem {
  planet: string;
  nakshatra: string;
  pada: number;
  lord: string;
  deity: string;
  shakti: string;
  careerSignificance: string;
}

export interface NakshatraAnalysisReportModel {
  moonNakshatra: string;
  moonPada: number;
  moonNakshatraLord: string;
  ascendantNakshatra: string;
  ascendantPada: number;
  ascendantNakshatraLord: string;
  taraChakraStatus: string;
  nakshatraTable: NakshatraReportItem[];
  careerNakshatraSynthesis: string;
  status: DataStatus;
}

export interface YogaReportItem {
  id: string;
  name: string;
  sanskritName: string;
  category: string;
  rule: string;
  chartEvidence: string;
  planetsInvolved: string;
  housesInvolved: string;
  conditionSatisfied: string;
  strength: string;
  careerRelevance: string;
  manifestation: string;
  limitations: string;
}

export interface YogaAnalysisReportModel {
  detectedYogasCount: number;
  detectedYogas: YogaReportItem[];
  yogaSummary: string;
  status: DataStatus;
}

export interface ShadbalaPlanetRow {
  planet: string;
  sthanaBala: string;
  digBala: string;
  kalaBala: string;
  cheshtaBala: string;
  naisargikaBala: string;
  drikBala: string;
  totalShashtiamsas: string;
  totalRupas: string;
  minimumRequirement: string;
  ratio: string;
  isStrong: boolean;
  rank: number;
}

export interface ShadbalaReportModel {
  planets: ShadbalaPlanetRow[];
  strongestPlanet: string;
  weakestPlanet: string;
  interpretation: string;
  status: DataStatus;
}

export interface BhavaBalaRow {
  houseNumber: number;
  houseName: string;
  sign: string;
  lord: string;
  bhavadhipatiBala: string;
  bhavaDigBala: string;
  bhavaDrishtiBala: string;
  bhavaOccupantBala: string;
  totalRupas: string;
  rank: number;
  careerRelevance: string;
}

export interface BhavaBalaReportModel {
  houses: BhavaBalaRow[];
  topCareerHousesSummary: string;
  interpretation: string;
  status: DataStatus;
}

export interface VimshopakaBalaRow {
  planet: string;
  shadvarga: string;
  saptavarga: string;
  dashavarga: string;
  shodashavarga: string;
  status: string;
}

export interface VimshopakaReportModel {
  rows: VimshopakaBalaRow[];
  summary: string;
  status: DataStatus;
}

export interface AshtakavargaReportModel {
  savTotal: number;
  savSigns: Record<number, number>; // 1..12 sign -> bindus
  savHouses: Record<number, number>; // 1..12 house -> bindus
  bavTable: Array<{
    planet: string;
    signs: number[]; // 12 numbers
    total: number;
  }>;
  careerHouseBindus: {
    houseOne: number;
    houseTwo: number;
    houseSix: number;
    houseTen: number;
    houseEleven: number;
  };
  savAnalysis: string;
  bavAnalysis: string;
  status: DataStatus;
}

export interface DashaPeriodRow {
  level: number;
  planet: string;
  startDate: string;
  endDate: string;
  duration: string;
  careerTheme: string;
}

export interface DashaReportModel {
  status: DataStatus;
  dashaAvailabilityNote: string;
  birthMahadasha: string;
  balanceAtBirth: string;
  currentMahadasha: string;
  mahadashaStart: string;
  mahadashaEnd: string;
  currentMahadashaInterpretation: string;
  currentAntardasha: string;
  antardashaStart: string;
  antardashaEnd: string;
  currentAntardashaInterpretation: string;
  currentPratyantardasha: string;
  pratyantardashaStart: string;
  pratyantardashaEnd: string;
  upcomingPeriods: string;
  upcomingTimeline: DashaPeriodRow[];
  lifetimeMahadashas: Array<{
    planet: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  }>;
  relevantCareerThemes: string;
  opportunityPeriods: string;
  patiencePeriods: string;
  currentPeriodLabel: string;
  currentPeriodTheme: string;
  currentPeriodOpportunity: string;
  currentPeriodApproach: string;
  upcomingPeriodLabel: string;
  upcomingPeriodTheme: string;
  upcomingPeriodOpportunity: string;
  upcomingPeriodApproach: string;
  longTermPeriodLabel: string;
  longTermPeriodTheme: string;
  longTermPeriodOpportunity: string;
  longTermPeriodApproach: string;
  careerTransitionIndicators: string;
  shortTermOutlook: string;
  mediumTermOutlook: string;
  longTermOutlook: string;
}

export interface TransitReportModel {
  referenceDate: string;
  saturnTransit: {
    sign: string;
    houseFromLagna: number;
    houseFromMoon: number;
    aspects: string;
    sadeSatiPhase: string;
    sadeSatiActive: boolean;
    careerImpact: string;
  };
  jupiterTransit: {
    sign: string;
    houseFromLagna: number;
    houseFromMoon: number;
    aspects: string;
    careerImpact: string;
  };
  rahuKetuTransit: {
    rahuSign: string;
    rahuHouseFromLagna: number;
    ketuSign: string;
    ketuHouseFromLagna: number;
    careerImpact: string;
  };
  transitSynthesis: string;
  status: DataStatus;
}

export interface CharaKarakaRow {
  code: string;
  name: string;
  sanskritName: string;
  planet: string;
  sign: string;
  degreeInSign: string;
  significance: string;
  careerImplication: string;
}

export interface ArudhaRow {
  code: string;
  name: string;
  houseNumber: number;
  sign: string;
  signIndex: number;
  significance: string;
}

export interface JaiminiReportModel {
  charaKarakas: CharaKarakaRow[];
  atmakaraka: string;
  amatyakaraka: string;
  amatyakarakaAnalysis: string;
  arudhaLagna: ArudhaRow;
  upapadaLagna: ArudhaRow;
  rajyaPadaA10: ArudhaRow;
  labhaPadaA11: ArudhaRow;
  dhanaPadaA2: ArudhaRow;
  arudhaAnalysis: string;
  argalaSummary: string;
  karakamshaSign: string;
  karakamshaAnalysis: string;
  status: DataStatus;
}

export interface KPCuspRow {
  houseNumber: number;
  longitude: string;
  sign: string;
  signLord: string;
  starLord: string;
  subLord: string;
  subSubLord: string;
}

export interface KPReportModel {
  cusps: KPCuspRow[];
  significators: Array<{
    houseNumber: number;
    levelA: string;
    levelB: string;
    levelC: string;
    levelD: string;
    allSignificators: string;
  }>;
  careerHouseSubLords: {
    houseTwoSubLord: string;
    houseSixSubLord: string;
    houseTenSubLord: string;
    houseElevenSubLord: string;
  };
  tenthCuspSubLordAnalysis: string;
  rulingPlanetsSummary: string;
  parsFortuna: string;
  status: DataStatus;
}

export interface PanchangaReportModel {
  tithi: string;
  vara: string;
  nakshatra: string;
  yoga: string;
  karana: string;
  sunriseTime: string;
  sunsetTime: string;
  avakhadaVarna: string;
  avakhadaVashya: string;
  avakhadaYoni: string;
  avakhadaGana: string;
  avakhadaNadi: string;
  ghatChakraMonth: string;
  ghatChakraTithi: string;
  ghatChakraDay: string;
  taraChakraBirthTara: string;
  status: DataStatus;
}

export interface SpecialPointsReportModel {
  upagrahas: Array<{
    name: string;
    sign: string;
    degree: string;
    house: number;
  }>;
  specialLagnas: Array<{
    name: string;
    sign: string;
    degree: string;
    house: number;
  }>;
  mrityuBhagaStatus: string;
  sahamsSummary: string;
  status: DataStatus;
}

export interface CareerDirectionItem {
  rank: number;
  title: string;
  category: string;
  whySupported: string;
  astrologicalEvidence: string;
  relevantHouses: string;
  relevantPlanets: string;
  relevantVargas: string;
  requiredStrengths: string;
  potentialChallenges: string;
  optimalEnvironment: string;
  practicalExperiment: string;
}

export interface StrengthMatrixDimension {
  dimension: string;
  scoreLabel: string;
  indicatorLevel: 'HIGH' | 'MODERATE' | 'DEVELOPING';
  astrologicalEvidence: string;
  professionalManifestation: string;
}

export interface SectorComparisonItem {
  sectorName: string;
  fitLevel: 'EXCELLENT' | 'HIGH' | 'MODERATE' | 'LOW';
  astrologicalBasis: string;
  opportunities: string;
  hazards: string;
  strategicGuidance: string;
}

export interface TimelineWindowItem {
  dateRange: string;
  dashaContext: string;
  transitContext: string;
  category: 'OPPORTUNITY' | 'CONSOLIDATION' | 'TRANSITION' | 'PATIENCE';
  careerTheme: string;
  strategicObjective: string;
  riskFactors: string;
  actionProtocol: string;
}

export interface CareerAnalysisModel {
  executiveCareerSummary: string;
  executiveDecisionThemes: string;
  executiveRecommendations: string;
  careerIdentity: string;
  professionalPersonality: string;
  naturalStrengths: string;
  professionalChallenges: string;
  careerDNAAnalysis: string;
  planetarySynthesis: string;
  yogaAnalysis: string;
  strengthsMatrixStatus: DataStatus;
  challengeMatrixStatus: DataStatus;
  strengthMatrixDimensions: StrengthMatrixDimension[];
  challengeMatrixDimensions: Array<{
    challenge: string;
    astrologicalBasis: string;
    manifestation: string;
    mitigation: string;
  }>;
  employmentVsEntrepreneurship: {
    employmentSupport: string;
    employmentStrengths: string;
    employmentRisks: string;
    employmentEnvironment: string;
    entrepreneurshipSupport: string;
    entrepreneurshipStrengths: string;
    entrepreneurshipRisks: string;
    entrepreneurshipModel: string;
    synthesisConclusion: string;
  };
  sectorComparisons: SectorComparisonItem[];
  careerDirections: CareerDirectionItem[];
  cautionCareerDirections: Array<{
    title: string;
    reason: string;
    evidence: string;
    risk: string;
  }>;
  moneyIncomeArchitecture: {
    earningPattern: string;
    incomeModes: string;
    financialStability: string;
    wealthAccumulation: string;
    fiscalRiskMitigation: string;
  };
  professionalRelationships: {
    partnershipViability: string;
    clientDynamics: string;
    networkingStrategy: string;
    mentorAlliances: string;
    teamDynamics: string;
  };
  careerSustainability: {
    workLifeBalance: string;
    stressVulnerabilities: string;
    enduranceTactics: string;
  };
  careerObstacles: Array<{
    obstacle: string;
    evidence: string;
    manifestation: string;
    mitigation: string;
    practicalResponse: string;
  }>;
  timelineWindows: TimelineWindowItem[];
  roadmapThirtyDay: {
    focus: string;
    skills: string;
    immediateActions: string;
    experiments: string;
    risks: string;
    metrics: string;
  };
  roadmapNinetyDay: {
    focus: string;
    skills: string;
    immediateActions: string;
    experiments: string;
    risks: string;
    metrics: string;
  };
  roadmapOneYear: {
    focus: string;
    skills: string;
    immediateActions: string;
    experiments: string;
    risks: string;
    metrics: string;
  };
  roadmapThreeYear: {
    focus: string;
    skills: string;
    immediateActions: string;
    experiments: string;
    risks: string;
    metrics: string;
  };
  decisionFramework: string;
  finalSynthesis: string;
  closingNote: string;
}

export interface CareerReportData {
  client: ClientReportHeader;
  calculation: CalculationConfigModel;
  ascendant: AscendantReportModel;
  houses: {
    houseOne: HouseReportModel;
    houseTwo: HouseReportModel;
    houseThree: HouseReportModel;
    houseFour: HouseReportModel;
    houseFive: HouseReportModel;
    houseSix: HouseReportModel;
    houseSeven: HouseReportModel;
    houseEight: HouseReportModel;
    houseNine: HouseReportModel;
    houseTen: HouseReportModel;
    houseEleven: HouseReportModel;
    houseTwelve: HouseReportModel;
  };
  planets: {
    sun: PlanetReportModel;
    moon: PlanetReportModel;
    mars: PlanetReportModel;
    mercury: PlanetReportModel;
    jupiter: PlanetReportModel;
    venus: PlanetReportModel;
    saturn: PlanetReportModel;
    rahu: PlanetReportModel;
    ketu: PlanetReportModel;
  };
  vargas: {
    d1: VargaChartReportModel;
    d2: VargaChartReportModel;
    d3: VargaChartReportModel;
    d4: VargaChartReportModel;
    d7: VargaChartReportModel;
    d9: VargaChartReportModel;
    d10: VargaChartReportModel;
    d12: VargaChartReportModel;
    d16: VargaChartReportModel;
    d20: VargaChartReportModel;
    d24: VargaChartReportModel;
    d27: VargaChartReportModel;
    d30: VargaChartReportModel;
    d40: VargaChartReportModel;
    d45: VargaChartReportModel;
    d60: VargaChartReportModel;
  };
  d10Dashamsha: D10DashamshaReportModel;
  nakshatras: NakshatraAnalysisReportModel;
  yogas: YogaAnalysisReportModel;
  shadbala: ShadbalaReportModel;
  bhavaBala: BhavaBalaReportModel;
  vimshopaka: VimshopakaReportModel;
  ashtakavarga: AshtakavargaReportModel;
  dasha: DashaReportModel;
  transits: TransitReportModel;
  jaimini: JaiminiReportModel;
  kp: KPReportModel;
  panchanga: PanchangaReportModel;
  specialPoints: SpecialPointsReportModel;
  careerAnalysis: CareerAnalysisModel;
}
