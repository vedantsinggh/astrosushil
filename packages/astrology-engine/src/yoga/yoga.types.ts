import { PlanetSymbol } from '../planets/planet.types';
import { VargaType } from '../varga/varga.types';
import { AstroChart } from '../chart/astro-chart.types';

export type YogaCategory =
  | 'MAHAPURUSHA'
  | 'RAJA'
  | 'DHANA'
  | 'CHANDRA'
  | 'SURYA'
  | 'NEECHA_BHANGA'
  | 'PARIVARTANA'
  | 'VIPARITA'
  | 'NABHASA'
  | 'AUSPICIOUS'
  | 'INAUSPICIOUS'
  | 'MISCELLANEOUS';

export interface YogaCondition {
  id: string;
  description: string;
  satisfied: boolean;
  expected: string | number | boolean;
  observed: string | number | boolean;
}

export interface YogaPlanetEvidence {
  planet: PlanetSymbol;
  rashiIndex: number;
  rashiName: string;
  house: number;
  longitude: number;
  degreeInRashi: number;
  dignity: string;
  isCombust: boolean;
  isRetrograde: boolean;
}

export interface HouseClassification {
  isKendra: boolean;      // 1, 4, 7, 10
  isTrikona: boolean;     // 1, 5, 9
  isDusthana: boolean;    // 6, 8, 12 (Trik)
  isUpachaya: boolean;    // 3, 6, 10, 11
  isPanaphara: boolean;   // 2, 5, 8, 11
  isApoklima: boolean;    // 3, 6, 9, 12
  isMaraka: boolean;      // 2, 7
}

export interface YogaHouseEvidence {
  houseNumber: number;
  rashiIndex: number;
  rashiName: string;
  lord: PlanetSymbol;
  occupyingPlanets: PlanetSymbol[];
  classification?: HouseClassification;
}

export type YogaRelationshipType =
  | 'CONJUNCTION'
  | 'MUTUAL_ASPECT'
  | 'SIGN_EXCHANGE'
  | 'KENDRA_RELATION'
  | 'DISTANCE_FROM_MOON'
  | 'DISTANCE_FROM_SUN';

export interface YogaRelationshipEvidence {
  relationshipType: YogaRelationshipType;
  planets: PlanetSymbol[];
  houses: number[];
  description: string;
}

export interface YogaEvidence {
  conditions: YogaCondition[];
  involvedPlanets: YogaPlanetEvidence[];
  involvedHouses: YogaHouseEvidence[];
  relationships: YogaRelationshipEvidence[];
  strengthFactors?: string[];
}

export interface YogaResult {
  id: string;
  canonicalName: string;
  sanskritName: string;
  category: YogaCategory;
  isDetected: boolean;
  varga: VargaType;
  convention: string;
  evidence: YogaEvidence;
}

export interface SignExchangeDetail {
  planetA: PlanetSymbol;
  planetB: PlanetSymbol;
  signA: number;
  signB: number;
  houseA: number;
  houseB: number;
  exchangeType: 'MAHA' | 'DAINYA' | 'KHALA';
}

export interface PlanetaryDistributionSummary {
  movableCount: number;    // Chara signs (1, 4, 7, 10)
  fixedCount: number;      // Sthira signs (2, 5, 8, 11)
  dualCount: number;       // Dvisvabhava signs (3, 6, 9, 12)
  kendraCount: number;     // Houses 1, 4, 7, 10
  panapharaCount: number;  // Houses 2, 5, 8, 11
  apoklimaCount: number;   // Houses 3, 6, 9, 12
  occupiedSignsCount: number;
  occupiedHousesCount: number;
  occupiedSigns: number[];
  occupiedHouses: number[];
}

export interface YogaChartContext {
  chart: AstroChart;
  varga: VargaType;
  ascendant: {
    rashiIndex: number;
    rashiName: string;
    longitude: number;
    degreeInRashi: number;
  };
  planets: Record<PlanetSymbol, YogaPlanetEvidence & { speedLongitude: number }>;
  houses: Record<number, YogaHouseEvidence & { classification: HouseClassification }>;
  houseLords: Record<number, PlanetSymbol>;
  lordHouses: Record<PlanetSymbol, number[]>;
  moonPlanet: YogaPlanetEvidence;
  sunPlanet: YogaPlanetEvidence;
  conjunctions: Map<PlanetSymbol, PlanetSymbol[]>;
  mutualAspects: Array<{ planetA: PlanetSymbol; planetB: PlanetSymbol; aspectType: string }>;
  signExchanges: SignExchangeDetail[];
  distribution: PlanetaryDistributionSummary;
}

export interface YogaDefinition {
  id: string;
  canonicalName: string;
  sanskritName: string;
  category: YogaCategory;
  description: string;
  supportedVargas: VargaType[];
  convention: string;
  evaluate: (context: YogaChartContext) => YogaResult;
}

export interface YogaEvaluationOptions {
  varga?: VargaType;
  categories?: YogaCategory[];
  yogaIds?: string[];
  includeUndetected?: boolean;
}

export interface YogaEvaluationReport {
  calculationVersion: string;
  varga: VargaType;
  totalEvaluated: number;
  detectedCount: number;
  detectedYogas: YogaResult[];
  undetectedYogas?: YogaResult[];
}

export type YogaEvaluationResponse = YogaEvaluationReport;

