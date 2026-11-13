import { PlanetSymbol } from '../planets/planet.types';

export interface JupiterPlacementResult {
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

export interface JupiterAspectDetail {
  aspectNumber: number; // 5, 7, 9
  house: number | null;
  signIndex: number;
  sign: string;
  areaTested: string;
}

export interface JupiterAspectsResult {
  aspects: JupiterAspectDetail[];
  description: string;
}

export interface JupiterBeneficVsMaleficResult {
  nature: string;
  functionalRole: string;
  challenges: string[];
  growthOpportunities: string[];
}

export interface JupiterMoonRelationResult {
  moonSign: string;
  moonSignIndex: number;
  moonSignLord: PlanetSymbol;
  moonNakshatra: string;
  moonNakshatraIndex: number;
  moonPada: number;
  moonNakshatraLord: string;
  jupiterRelationToMoonLord: string;
  houseFromMoon: number;
  archetype: string;
  psycheEvolution: string;
}

export interface JupiterNakshatraAnalysisResult {
  nakshatra: string;
  nakshatraIndex: number;
  lord: string;
  pada: number;
  symbol: string;
  deity: string;
  karmicTheme: string;
}

export interface JupiterConjunctionsResult {
  conjoinedPlanets: string[];
  interpretation: string;
  yogas: string[];
}

export interface JupiterAshtakavargaResult {
  bindus: number[]; // 12 elements (Aries=0 to Pisces=11)
  total: number; // strictly 56 in Parashari BAV
  currentGeminiPoints: number;
  cancerPoints: number;
  natalHousePoints: number | null;
  matrix: Array<{ contributor: string; bindus: number[] }>;
  interpretation: string;
}

export interface JupiterTransitPeriodDetail {
  sign: string;
  signIndex: number;
  period: string;
  houseFromLagna: number | null;
  houseFromMoon: number;
  predictions: string[];
  aspects: string[];
  physicalChanges: string[];
}

export interface JupiterTransitTimelineItem {
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

export interface JupiterRemediesResult {
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

export interface CompleteJupiterAnalysisResult {
  jupiterPlacement: JupiterPlacementResult;
  jupiterAspects: JupiterAspectsResult;
  beneficVsMalefic: JupiterBeneficVsMaleficResult;
  moonSignRelation: JupiterMoonRelationResult;
  jupiterNakshatraAnalysis: JupiterNakshatraAnalysisResult;
  jupiterConjunctions: JupiterConjunctionsResult;
  jupiterAshtakavarga: JupiterAshtakavargaResult;
  geminiTransit: JupiterTransitPeriodDetail;
  cancerTransit: JupiterTransitPeriodDetail;
  leoTransit: JupiterTransitPeriodDetail;
  currentTransit: JupiterTransitPeriodDetail;
  transitTimeline: JupiterTransitTimelineItem[];
  remedies: JupiterRemediesResult;
  referenceDateIso: string;
}
