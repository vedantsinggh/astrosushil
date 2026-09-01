import {
  NormalizedChart,
  NormalizedAscendant,
  NormalizedPlanet,
  NormalizedHouse,
  NormalizedRashi,
  NormalizedNakshatra,
} from '@astro/astrology-engine';

export interface AstrologySnapshotCalculationMeta {
  calculationVersion: string;
  providerName: string;
  providerVersion: string;
  calculationTimestampIso: string;
  normalizedTime: {
    utcIsoString: string;
    julianDayUT: number;
    timezoneOffsetMinutes: number;
  };
  config: {
    zodiacType: string;
    ayanamsa: string;
    houseSystem: string;
    nodeCalculation: string;
    planetaryCalculationMode: string;
  };
}

export interface AstrologySnapshotBirthDetails {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  placeName: string;
}

export interface AstrologySnapshot {
  version: string;
  calculation: AstrologySnapshotCalculationMeta;
  birthDetails: AstrologySnapshotBirthDetails;
  ascendant: NormalizedAscendant;
  planets: NormalizedPlanet[];
  houses: NormalizedHouse[];
  rashis: NormalizedRashi[];
  nakshatras: NormalizedNakshatra[];
  dasha?: {
    currentMahadasha?: string;
    currentAntardasha?: string;
    startDate?: string;
    endDate?: string;
  };
  vargas?: Array<{
    vargaType: string;
    ascendantSign: string;
  }>;
}

export type DomainCategory =
  | 'CAREER'
  | 'MONEY'
  | 'EDUCATION'
  | 'RELATIONSHIPS'
  | 'HEALTH_GENERAL'
  | 'PERSONALITY'
  | 'FAMILY'
  | 'TRAVEL'
  | 'SPIRITUALITY'
  | 'TIMING';

export interface DomainEvidenceFact {
  source: string; // e.g. '10TH_HOUSE', 'SATURN_DIGNITY', 'ASHTAKOOTA'
  factText: string;
  relevanceStrength: 'HIGH' | 'MODERATE' | 'SUPPORTIVE';
  houseNumber?: number;
  planet?: string;
  sign?: string;
}

export interface DomainEvidence {
  domain: DomainCategory;
  confidence: 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT';
  supportingFacts: DomainEvidenceFact[];
  conflictingFacts: DomainEvidenceFact[];
  overallStrength: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
  summaryNote: string;
}

export interface DeterministicPredictionItem {
  id: string;
  category: DomainCategory;
  title: string;
  timingPeriod?: string;
  confidence: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
  underlyingEvidence: string[];
  ruleCode: string;
  interpretationText: string;
}

export interface AstrologyExplanationTrace {
  userId?: string;
  queryInput?: string;
  domain: DomainCategory;
  snapshotVersion: string;
  evidenceFactsCount: number;
  triggeredRules: string[];
  rawAnalysis: any;
  llmUsed: boolean;
  timestamp: string;
}
