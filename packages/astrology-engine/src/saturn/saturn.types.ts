import { PlanetSymbol } from '../planets/planet.types';

export interface SaturnPlacementResult {
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
  isCombust: boolean;
  lordship: number[];
  traits: string[];
  karmicLesson: string;
}

export interface SaturnAspectDetail {
  aspectNumber: number; // 3, 7, 10
  house: number | null;
  signIndex: number;
  sign: string;
  areaTested: string;
}

export interface SaturnAspectsResult {
  aspects: SaturnAspectDetail[];
  description: string;
}

export interface SaturnBeneficVsMaleficResult {
  nature: string;
  challenges: string[];
  growthOpportunities: string[];
}

export interface SaturnMoonRelationResult {
  moonSign: string;
  moonSignIndex: number;
  moonSignLord: PlanetSymbol;
  moonNakshatra: string;
  moonNakshatraIndex: number;
  moonPada: number;
  moonNakshatraLord: string;
  saturnRelationToMoonLord: string;
  houseFromMoon: number;
  archetype: string;
  psycheEvolution: string;
}

export interface SaturnNakshatraAnalysisResult {
  nakshatra: string;
  nakshatraIndex: number;
  lord: string;
  pada: number;
  symbol: string;
  deity: string;
  karmicTheme: string;
}

export interface SaturnConjunctionsResult {
  conjoinedPlanets: string[];
  interpretation: string;
}

export interface SaturnAshtakavargaResult {
  bindus: number[]; // 12 elements (Aries=0 to Pisces=11)
  total: number; // strictly 39
  currentTransitHousePoints: number;
  natalHousePoints: number | null;
  matrix: Array<{ contributor: string; bindus: number[] }>;
  interpretation: string;
}

export interface SadeSatiCyclePhase {
  phase: string;
  rashiIndex: number;
  rashi: string;
  startDate: string;
  endDate: string;
}

export interface SaturnSadeSatiResult {
  isActive: boolean;
  currentStatus: string;
  currentPhase: string;
  firstCycle: SadeSatiCyclePhase[];
  secondCycle: SadeSatiCyclePhase[];
  lifeOverview: {
    marriage: string;
    finance: string;
    health: string;
    career: string;
    spirituality: string;
  };
}

export interface SaturnTransitDetailResult {
  sign: string;
  signIndex: number;
  startYear: string;
  endYear: string;
  houseFromLagna: number | null;
  houseFromMoon: number;
  retrogradePeriod: string;
  predictions: string[];
  aspects: string[];
  transitOverPlanets: string[];
}

export interface SaturnKantakShaniResult {
  isActiveFromMoon: boolean;
  houseFromMoon: number;
  isActiveFromLagna: boolean;
  houseFromLagna: number | null;
  isAshtamaShani: boolean;
  transitCategory: 'KANTAK_SHANI' | 'ASHTAMA_SHANI' | 'SADE_SATI' | 'UPACHAYA_FAVORABLE' | 'NEUTRAL';
  specificType: string;
  description: string;
  effects: string[];
  remedies: string[];
}

export interface SaturnRemediesResult {
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

export interface SaturnIconicInspiration {
  name: string;
  title: string;
  story: string;
  takeaway: string;
}

export interface CompleteSaturnAnalysisResult {
  saturnPlacement: SaturnPlacementResult;
  saturnAspects: SaturnAspectsResult;
  beneficVsMalefic: SaturnBeneficVsMaleficResult;
  moonSignRelation: SaturnMoonRelationResult;
  saturnNakshatraAnalysis: SaturnNakshatraAnalysisResult;
  saturnConjunctions: SaturnConjunctionsResult;
  saturnAshtakavarga: SaturnAshtakavargaResult;
  sadeSatiPhases: SaturnSadeSatiResult;
  saturnTransits: {
    transit2025_2027: SaturnTransitDetailResult;
    transit2027_2029: SaturnTransitDetailResult;
  };
  kantakShani: SaturnKantakShaniResult;
  remedies: SaturnRemediesResult;
  iconicInspirations: SaturnIconicInspiration[];
}
