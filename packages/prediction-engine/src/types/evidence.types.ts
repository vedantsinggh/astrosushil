import { NormalizedChart } from '@astro/astrology-engine';

export type EvidenceStrength =
  | 'STRONG'
  | 'MODERATE'
  | 'SUPPORTIVE'
  | 'MIXED'
  | 'WEAK'
  | 'UNAVAILABLE';

export type DataConfidence = 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT';

export interface ChartFactSummary {
  clientName: string;
  dateOfBirth: string;
  timeOfBirth: string;
  birthPlace: string;
  ascendantSign: string;
  ascendantLord: string;
  moonSign: string;
  moonNakshatra: string;
  sunSign: string;
  sunHouse: number;
  totalPlanetsCount: number;
  totalHousesCount: number;
}

export interface HouseLordRelationshipEvidence {
  fromHouse: number;
  toHouse: number;
  lord: string;
  lordPlacementHouse: number;
  lordPlacementSign: string;
  relationshipName: string;
  isDirectLink: boolean;
  aspectLink: boolean;
  supportingNote: string;
}

export interface CareerAxisEvidence {
  ascendantSign: string;
  ascendantDegree: number;
  ascendantNakshatra: string;
  ascendantLord: string;
  ascendantLordSign: string;
  ascendantLordHouse: number;
  ascendantLordDignity: string;
  houseTenSign: string;
  houseTenLord: string;
  houseTenLordHouse: number;
  houseTenLordSign: string;
  houseTenOccupants: string[];
  houseTenAspects: string[];
  relationships: HouseLordRelationshipEvidence[];
  supportingFactors: string[];
  conflictingFactors: string[];
  strength: EvidenceStrength;
}

export interface IncomeEvidence {
  wealthHouseNumber: number; // 2
  wealthHouseSign: string;
  wealthHouseLord: string;
  wealthHouseLordPlacement: { house: number; sign: string };
  wealthHouseOccupants: string[];
  gainsHouseNumber: number; // 11
  gainsHouseSign: string;
  gainsHouseLord: string;
  gainsHouseLordPlacement: { house: number; sign: string };
  gainsHouseOccupants: string[];
  wealthHouseStrength: EvidenceStrength;
  gainsHouseStrength: EvidenceStrength;
  relevantPlanets: string[];
  lordRelationships: string[];
  supportingFactors: string[];
  conflictingFactors: string[];
  overallStrength: EvidenceStrength;
}

export interface WorkEnvironmentEvidence {
  houseSixSign: string;
  houseSixLord: string;
  houseSixLordPlacement: { house: number; sign: string };
  houseSixOccupants: string[];
  saturnPlacement: { house: number; sign: string; dignity: string; retrograde: boolean };
  marsPlacement: { house: number; sign: string; dignity: string; retrograde: boolean };
  structuredWorkIndicators: string[];
  serviceIndicators: string[];
  competitionIndicators: string[];
  operationalDiscipline: EvidenceStrength;
  routineStructureStrength: EvidenceStrength;
  supportingFactors: string[];
  conflictingFactors: string[];
  strength: EvidenceStrength;
}

export interface LeadershipEvidence {
  sunPlacement: { house: number; sign: string; dignity: string };
  marsPlacement: { house: number; sign: string; dignity: string };
  saturnPlacement: { house: number; sign: string; dignity: string };
  ascendantLordPlacement: { house: number; sign: string };
  houseTenLordPlacement: { house: number; sign: string };
  houseElevenLordPlacement: { house: number; sign: string };
  authorityIndicators: string[];
  initiativeIndicators: string[];
  responsibilityIndicators: string[];
  persistenceIndicators: string[];
  publicVisibilityIndicators: string[];
  supportingFactors: string[];
  conflictingFactors: string[];
  strength: EvidenceStrength;
}

export interface AnalyticalEvidence {
  mercuryPlacement: { house: number; sign: string; dignity: string; retrograde: boolean };
  marsPlacement: { house: number; sign: string; dignity: string };
  houseFiveSign: string;
  houseFiveLord: string;
  houseFiveLordPlacement: { house: number; sign: string };
  houseSixSign: string;
  houseEightSign: string;
  analysisIndicators: string[];
  logicIndicators: string[];
  systemsThinkingIndicators: string[];
  problemSolvingIndicators: string[];
  technicalDepthIndicators: string[];
  detailOrientationIndicators: string[];
  supportingFactors: string[];
  conflictingFactors: string[];
  strength: EvidenceStrength;
}

export interface CommunicationEvidence {
  mercuryPlacement: { house: number; sign: string; dignity: string };
  venusPlacement: { house: number; sign: string; dignity: string };
  houseTwoSign: string;
  houseThreeSign?: string;
  houseFiveSign: string;
  houseSevenSign: string;
  houseTenSign: string;
  houseElevenSign: string;
  communicationIndicators: string[];
  persuasionIndicators: string[];
  negotiationIndicators: string[];
  teachingIndicators: string[];
  writingIndicators: string[];
  commercialInteractionIndicators: string[];
  supportingFactors: string[];
  conflictingFactors: string[];
  strength: EvidenceStrength;
}

export interface CreativityEvidence {
  venusPlacement: { house: number; sign: string; dignity: string };
  moonPlacement: { house: number; sign: string; dignity: string };
  mercuryPlacement: { house: number; sign: string; dignity: string };
  houseFiveSign: string;
  houseFiveLord: string;
  creativeExpressionIndicators: string[];
  aestheticsIndicators: string[];
  imaginationIndicators: string[];
  designIndicators: string[];
  storytellingIndicators: string[];
  supportingFactors: string[];
  conflictingFactors: string[];
  strength: EvidenceStrength;
}

export interface ResearchEvidence {
  houseFiveSign: string;
  houseEightSign: string;
  houseNineSign: string;
  houseTwelveSign: string;
  mercuryPlacement: { house: number; sign: string };
  saturnPlacement: { house: number; sign: string };
  rahuPlacement: { house: number; sign: string };
  investigationIndicators: string[];
  deepStudyIndicators: string[];
  specializationIndicators: string[];
  hiddenSystemsIndicators: string[];
  researchEnvironmentIndicators: string[];
  supportingFactors: string[];
  conflictingFactors: string[];
  strength: EvidenceStrength;
}

export interface EntrepreneurshipEvidence {
  houseThreeSign?: string;
  houseFiveSign: string;
  houseSevenSign: string;
  houseTenSign: string;
  houseElevenSign: string;
  marsPlacement: { house: number; sign: string };
  mercuryPlacement: { house: number; sign: string };
  rahuPlacement: { house: number; sign: string };
  initiativeIndicators: string[];
  independenceIndicators: string[];
  commercialOrientationIndicators: string[];
  riskIndicators: string[];
  partnershipIndicators: string[];
  executionIndicators: string[];
  gainsIndicators: string[];
  supportingFactors: string[];
  conflictingFactors: string[];
  strength: EvidenceStrength;
}

export interface InternationalEvidence {
  houseNineSign: string;
  houseNineLord: string;
  houseTwelveSign: string;
  houseTwelveLord: string;
  rahuPlacement: { house: number; sign: string };
  foreignConnectionIndicators: string[];
  multinationalEnvironmentIndicators: string[];
  remoteWorkIndicators: string[];
  relocationIndicators: string[];
  crossCulturalIndicators: string[];
  supportingFactors: string[];
  conflictingFactors: string[];
  strength: EvidenceStrength;
}

export interface NetworkingEvidence {
  houseTenSign: string;
  houseElevenSign: string;
  houseSevenSign: string;
  sunPlacement: { house: number; sign: string };
  venusPlacement: { house: number; sign: string };
  mercuryPlacement: { house: number; sign: string };
  visibilityIndicators: string[];
  networkReachIndicators: string[];
  collaborationIndicators: string[];
  publicFacingIndicators: string[];
  audienceIndicators: string[];
  institutionalIndicators: string[];
  supportingFactors: string[];
  conflictingFactors: string[];
  strength: EvidenceStrength;
}

export interface PlanetaryEvidenceItem {
  planet: string;
  sign: string;
  house: number;
  dignity: string;
  strength: EvidenceStrength;
  retrograde: boolean;
  combustion: boolean;
  lordship: number[];
  aspects: number[];
  relevantCareerHouses: number[];
  supportingCareerFactors: string[];
  conflictingCareerFactors: string[];
}

export interface HouseEvidenceItem {
  houseNumber: number;
  sign: string;
  lord: string;
  lordPlacement: { house: number; sign: string };
  occupants: string[];
  aspects: string[];
  relevantPlanets: string[];
  supportingFactors: string[];
  conflictingFactors: string[];
  strength: EvidenceStrength;
}

export interface YogaEvidence {
  status: 'AVAILABLE' | 'UNAVAILABLE';
  supportedYogas: Array<{
    name: string;
    description: string;
    planetsInvolved: string[];
    housesInvolved: number[];
    strength: EvidenceStrength;
  }>;
  unsupportedYogas: string[];
  note: string;
}

export interface EvidenceConflictItem {
  domainA: string;
  factorA: string;
  domainB: string;
  factorB: string;
  description: string;
}

export interface EvidenceConflicts {
  competingFactors: EvidenceConflictItem[];
  supportingFactors: string[];
  conflictingFactors: string[];
  unresolvedFactors: string[];
}

export interface TimingEvidence {
  status: 'AVAILABLE' | 'UNAVAILABLE';
  currentMahadasha?: string;
  currentAntardasha?: string;
  start?: string;
  end?: string;
  relevantPlanetaryThemes: string[];
  careerHouseActivations: number[];
  note?: string;
}

export interface CareerAnalysisInput {
  reportId?: string;
  confidence: DataConfidence;
  chartSummary: ChartFactSummary;
  careerAxis: CareerAxisEvidence;
  incomeEvidence: IncomeEvidence;
  workEnvironmentEvidence: WorkEnvironmentEvidence;
  leadershipEvidence: LeadershipEvidence;
  analyticalEvidence: AnalyticalEvidence;
  communicationEvidence: CommunicationEvidence;
  creativityEvidence: CreativityEvidence;
  researchEvidence: ResearchEvidence;
  entrepreneurshipEvidence: EntrepreneurshipEvidence;
  internationalEvidence: InternationalEvidence;
  networkingEvidence: NetworkingEvidence;
  planetaryEvidence: PlanetaryEvidenceItem[];
  houseEvidence: HouseEvidenceItem[];
  yogaEvidence: YogaEvidence;
  evidenceConflicts: EvidenceConflicts;
  timingEvidence: TimingEvidence;
}

export interface CareerAnalysisHouseInterpretation {
  houseNumber: number;
  houseMeaning: string;
  careerRelevance: string;
  supportingEvidence: string;
  constructiveExpression: string;
  potentialChallenge: string;
  practicalInterpretation: string;
  evidenceIds: string[];
}

export interface CareerAnalysisPlanetInterpretation {
  planet: string;
  placementSummary: string;
  careerSignificance: string;
  constructiveExpression: string;
  potentialPressure: string;
  placementSpecificInterpretation: string;
  practicalCareerImplication: string;
  evidenceIds: string[];
}

export interface RecommendedCareerField {
  field: string;
  rank: 'PRIMARY' | 'SECONDARY' | 'EXPLORATORY';
  rationale: string;
  supportingEvidence: string;
  suitableFunctions: string[];
  suitableWorkMode: string;
  potentialChallenge: string;
  timingRelevance: string;
  evidenceIds: string[];
}

export interface CareerAnalysis {
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

  // Granular interpretations for report builder traceability:
  ascendantInterpretation?: string;
  houseInterpretations?: CareerAnalysisHouseInterpretation[];
  planetInterpretations?: CareerAnalysisPlanetInterpretation[];
  recommendedFields?: RecommendedCareerField[];
  evidenceTraceabilityMap?: Record<string, string[]>;
}

export interface CareerAnalysisProvider {
  analyze(input: CareerAnalysisInput): Promise<CareerAnalysis>;
}
