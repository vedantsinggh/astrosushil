import { PlanetSymbol } from '../planets/planet.types';

export interface NodePlacementDetail {
  planet: 'RAHU' | 'KETU';
  sign: string;
  signIndex: number; // 1 to 12
  signLord: PlanetSymbol;
  degree: number;
  degreeInRashi: number;
  house: number | null;
  houseFormatted: string;
  nakshatra: string;
  nakshatraIndex: number;
  pada: number;
  nakshatraLord: PlanetSymbol;
  dignity: string;
  isRetrograde: boolean;
  traits: string[];
  karmicFocus: string;
}

export interface RahuKetuPlacementResult {
  rahu: NodePlacementDetail;
  ketu: NodePlacementDetail;
  axisSeparation: number; // strictly 180.0 degrees
  axisName: string;
}

export interface NodeAspectDetail {
  sourceNode: 'RAHU' | 'KETU';
  aspectNumber: number; // 5, 7, 9
  house: number | null;
  signIndex: number;
  sign: string;
  influence: string;
}

export interface RahuKetuAspectsResult {
  rahuAspects: NodeAspectDetail[];
  ketuAspects: NodeAspectDetail[];
  description: string;
}

export interface RahuKetuConjunctionResult {
  rahuConjunctions: string[];
  ketuConjunctions: string[];
  interpretation: string;
}

export interface RahuKetuMoonRelationResult {
  moonSign: string;
  moonSignIndex: number;
  moonNakshatra: string;
  rahuHouseFromMoon: number;
  ketuHouseFromMoon: number;
  overallPower: string;
  psycheEvolution: string;
}

export interface RahuKetuKarmicJourneyResult {
  pastLifeKarma: string;
  soulObsessionRahu: string;
  soulReleaseKetu: string;
  karmicLesson: string;
}

export interface NodalTransitCycleDetail {
  cycleName: string;
  period: string;
  rahuSign: string;
  rahuSignIndex: number;
  rahuHouseFromLagna: number | null;
  rahuHouseFromMoon: number;
  rahuAspects: string[];
  rahuPredictions: string[];
  ketuSign: string;
  ketuSignIndex: number;
  ketuHouseFromLagna: number | null;
  ketuHouseFromMoon: number;
  ketuAspects: string[];
  ketuPredictions: string[];
  spheresOfLife: Array<{ sphere: string; impact: string }>;
}

export interface NodalTransitTimelineItem {
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

export interface RahuKetuRemediesResult {
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

export interface CompleteRahuKetuAnalysisResult {
  nodalPlacement: RahuKetuPlacementResult;
  nodalAspects: RahuKetuAspectsResult;
  nodalConjunctions: RahuKetuConjunctionResult;
  moonSignRelation: RahuKetuMoonRelationResult;
  karmicJourney: RahuKetuKarmicJourneyResult;
  transit2025_2026: NodalTransitCycleDetail;
  transit2026_2028: NodalTransitCycleDetail;
  transit2028_2030: NodalTransitCycleDetail;
  currentCycle: NodalTransitCycleDetail;
  transitTimeline: NodalTransitTimelineItem[];
  remedies: RahuKetuRemediesResult;
  referenceDateIso: string;
}
