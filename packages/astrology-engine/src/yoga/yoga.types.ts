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
  | 'DISTANCE_FROM_SUN'
  /** One planet aspects the other but not vice versa (flagged; does not form lord-association yogas). */
  | 'ONE_WAY_ASPECT'
  /** A single planet owns both houses (e.g. a Yogakaraka owning a kendra and a trikona). */
  | 'OWNERSHIP';

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

/** Whole-sign house categories (from the Lagna of the evaluated chart). */
export type YogaHouseCategory =
  | 'KENDRA'
  | 'TRIKONA'
  | 'DUSTHANA'
  | 'UPACHAYA'
  | 'PANAPHARA'
  | 'APOKLIMA'
  | 'MARAKA';

/**
 * Structured facts about one planet involved in a yoga. Facts only — no verdicts, no scores.
 * Graded values appear only where the classics define them (dignity ladder, Shadbala vs the
 * BPHS ch. 27 required rupas).
 */
export interface YogaPlanetFactors {
  planet: PlanetSymbol;
  rashiIndex: number;
  house: number;
  houseCategories: YogaHouseCategory[];
  /** D1 compound dignity (exalted … great enemy) from `calculatePlanetaryDignity`. */
  dignity: string;
  isRetrograde: boolean;
  combustion: {
    isCombust: boolean;
    /** Angular distance from the Sun in degrees; absent for the Sun and the nodes. */
    distanceFromSun?: number;
    /** Combustion orb used (Surya Siddhanta kalamsha values, provisional); absent when n/a. */
    orbDegrees?: number;
  };
  /** Houses owned (from the Lagna). Empty for the nodes. */
  lordships: number[];
  /** Lordship-based functional nature (Laghu Parashari ch. 2); D1 only. */
  functionalNature?: string;
  /** D9 placement facts (D1 evaluation only). */
  d9?: { rashiIndex: number; dignity: string; vargottama: boolean };
  /** Shadbala vs required rupas (BPHS ch. 27), present only when Shadbala was computed/supplied. */
  shadbala?: { ratio: number; totalRupas?: number; requiredRupas?: number };
}

/** A classical cancellation / qualifier condition and whether it holds. Facts only. */
export interface YogaCancellationFlag {
  id: string;
  description: string;
  /** True when the cancelling / disqualifying condition holds in this chart. */
  satisfied: boolean;
  observed: string;
  source: string;
  provisional: boolean;
}

/** How two lords are related for lord-association yogas (Raja, Dhana, Dharma-Karmadhipati). */
export type YogaLordRelation = 'CONJUNCTION' | 'MUTUAL_ASPECT' | 'SIGN_EXCHANGE' | 'OWNERSHIP' | 'ONE_WAY_ASPECT';

/**
 * Optional, structured assessment inputs attached to a yoga (2026-11 engine fixes). Describes
 * formation context only; never results or verdicts. Consumers grade it with cited set logic.
 */
export interface YogaAssessmentInputs {
  /** Did the base formation condition hold (independent of cancellation)? */
  formed: boolean;
  /** True when formed and a classical cancellation (bhanga) holds. */
  cancelled: boolean;
  /** Lord-association yogas: every relation found between the two lords (first = primary). */
  relations?: YogaLordRelation[];
  /** Directed aspects between the lords that are not mutual (flagged, not counted as formation). */
  oneWayAspects?: Array<{ from: PlanetSymbol; to: PlanetSymbol; aspect: string }>;
  /** Vesi/Vasi/Ubhayachari, Sunapha/Anapha/Durudhara: nature of the occupying planets. */
  variant?: 'BENEFIC' | 'MALEFIC' | 'MIXED';
  /** Planets whose condition decides the yoga (subset of the involved planets). */
  keyPlanets: PlanetSymbol[];
  planetFactors: YogaPlanetFactors[];
  cancellations: YogaCancellationFlag[];
  notes: string[];
  source: string;
  provisional: true;
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
  /** Optional structured assessment inputs (facts only). Added in the 2026-11 engine fixes. */
  assessment?: YogaAssessmentInputs;
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
  /**
   * Mutual graha drishti between the seven grahas (whole-sign, BPHS ch. 26): the 7th for all,
   * plus Mars 4/8, Jupiter 5/9 and Saturn 3/10 special aspects when the aspect is returned.
   */
  mutualAspects: Array<{ planetA: PlanetSymbol; planetB: PlanetSymbol; aspectType: string }>;
  /** Directed graha drishti between the seven grahas (whole-sign). */
  grahaAspects?: Array<{ from: PlanetSymbol; to: PlanetSymbol; aspectType: string }>;
  signExchanges: SignExchangeDetail[];
  distribution: PlanetaryDistributionSummary;
  /** Precomputed per-planet factor facts used for `YogaResult.assessment`. */
  planetFactors?: Partial<Record<PlanetSymbol, YogaPlanetFactors>>;
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
  /**
   * Shadbala ratios (total / BPHS ch. 27 requirement) to attach to planet factors. When omitted
   * and `computeShadbala` is true (D1 only), the engine's ShadbalaCalculator is run on the chart.
   */
  shadbalaRatios?: Partial<Record<PlanetSymbol, number>>;
  computeShadbala?: boolean;
}

export interface YogaEvaluationReport {
  calculationVersion: string;
  varga: VargaType;
  totalEvaluated: number;
  detectedCount: number;
  detectedYogas: YogaResult[];
  undetectedYogas?: YogaResult[];
  /**
   * Yogas whose base formation holds but a classical cancellation applies (e.g. Kemadruma with
   * Kemadruma Bhanga). Listed so consumers can say "formed and cancelled" instead of hiding it.
   * These are NOT in `detectedYogas` (isDetected stays false).
   */
  formedButCancelledYogas?: YogaResult[];
}

export type YogaEvaluationResponse = YogaEvaluationReport;

