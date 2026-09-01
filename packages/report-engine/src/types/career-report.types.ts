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
}

export interface HouseReportModel {
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
}

export interface DashaReportModel {
  status: DataStatus;
  dashaAvailabilityNote: string;
  currentMahadasha: string;
  mahadashaStart: string;
  mahadashaEnd: string;
  currentMahadashaInterpretation: string;
  currentAntardasha: string;
  antardashaStart: string;
  antardashaEnd: string;
  currentAntardashaInterpretation: string;
  upcomingPeriods: string;
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
  employmentEntrepreneurshipAnalysis: string;
  leadershipAnalysis: string;
  technicalAnalyticalAptitude: string;
  creativeCommunicationBusinessAptitude: string;
  researchPotential: string;
  sectorFit: string;
  internationalCareer: string;
  workEnvironment: string;
  careerFieldsAnalysis: string;
  topCareerDirections: string;
  careerDirectionsCaution: string;
  moneyIncomePattern: string;
  relationshipsNetworking: string;
  teamDynamics: string;
  sustainabilityAnalysis: string;
  careerObstacles: string;
  professionalGrowth: string;
  recommendations: string;
  professionalDevelopmentPriorities: string;
  decisionGuidance: string;
  actionPlanSummary: string;
  finalSynthesis: string;
  methodologyDataNote: string;
  primaryProfessionalPriority: string;
  technicalSkillPriority: string;
  communicationSkillPriority: string;
  leadershipSkillPriority: string;
  networkSkillPriority: string;
  mistakeToAvoid: string;
  thirtyDayFocus: string;
  ninetyDayFocus: string;
  oneYearFocus: string;
  threeYearDirection: string;
}

export interface CareerReportData {
  client: ClientReportHeader;
  calculation: CalculationConfigModel;
  ascendant: AscendantReportModel;
  houses: {
    houseTwo: HouseReportModel;
    houseFive: HouseReportModel;
    houseSix: HouseReportModel;
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
  dasha: DashaReportModel;
  careerAnalysis: CareerAnalysisModel;
}
