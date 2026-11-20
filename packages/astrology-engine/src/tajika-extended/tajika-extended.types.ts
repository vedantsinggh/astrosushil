import { PlanetSymbol } from '../planets/planet.types';
import { CompoundRelationship } from '../planets/planetary-intelligence.types';
import { AstroChart } from '../chart/astro-chart.types';

/** The seven Tajika grahas (Tajika yogas and balas do not use the nodes or outer planets). */
export type TajikaGraha =
  | PlanetSymbol.SUN
  | PlanetSymbol.MOON
  | PlanetSymbol.MARS
  | PlanetSymbol.MERCURY
  | PlanetSymbol.JUPITER
  | PlanetSymbol.VENUS
  | PlanetSymbol.SATURN;

export type TajikaAspectName = 'CONJUNCTION' | 'SEXTILE' | 'SQUARE' | 'TRINE' | 'OPPOSITION' | 'SEMI_SEXTILE' | 'NONE';

/** How the "within deeptamsha" test for a pair is applied. */
export type TajikaOrbRule =
  /** Each planet lies within the other's deeptamsha, i.e. gap <= min(d1, d2) (P.V.R. Narasimha Rao §29.2.3 worked example). */
  | 'MUTUAL'
  /** Gap <= (d1 + d2) / 2, the "sum of half-orbs" reading used by the engine's TajikaYogasCalculator. */
  | 'HALF_SUM';

export interface TajikaYogaOptions {
  /** Default 'MUTUAL'. */
  orbRule?: TajikaOrbRule;
  /** Count the 2nd/12th ("semi-sextile", neutral) aspect for yogas. Default false (Neelakanthi: 2/12 and 6/8 have no aspect). */
  includeSemiSextile?: boolean;
  /** Manahoo: also accept a Mars/Saturn aspect (not only conjunction) on the faster planet. Default false. */
  manahooByAspect?: boolean;
}

/** Evidence for one pair of planets. Degrees are advancement inside the sign (0-30). */
export interface TajikaPairEvidence {
  faster: TajikaGraha;
  slower: TajikaGraha;
  fasterLongitude: number;
  slowerLongitude: number;
  fasterDegreeInSign: number;
  slowerDegreeInSign: number;
  /** Count of the slower planet's sign from the faster planet's sign (1-12). */
  signDistance: number;
  aspect: TajikaAspectName;
  /** slowerDegreeInSign - fasterDegreeInSign (positive: faster planet is behind). */
  degreeGap: number;
  fasterDeeptamsha: number;
  slowerDeeptamsha: number;
  /** Orb allowed for the pair under the active orb rule. */
  allowedOrb: number;
  withinOrb: boolean;
  fasterRetrograde: boolean;
  slowerRetrograde: boolean;
  /** APPLYING = Ithasala geometry, SEPARATING = Ishrafa geometry, NONE = no aspect within orb. */
  motion: 'APPLYING' | 'SEPARATING' | 'NONE';
}

export type TajikaSixteenYogaId =
  | 'IKKAVALA'
  | 'INDUVARA'
  | 'ITHASALA'
  | 'ISHRAFA'
  | 'NAKTA'
  | 'YAMAYA'
  | 'MANAHOO'
  | 'KAMBOOLA'
  | 'GAIRI_KAMBOOLA'
  | 'KHALLASARA'
  | 'RADDA'
  | 'DUPHALI_KUTTHA'
  | 'DUTTHOTTHA_DAVIRA'
  | 'TAMBIRA'
  | 'KUTTHA'
  | 'DURUPHA';

export interface TajikaYogaOccurrence {
  /** All planets taking part, in rule order. */
  planets: TajikaGraha[];
  /** Named roles, e.g. { faster, slower, intermediary, moon, lagnesha, x }. */
  roles: Record<string, TajikaGraha>;
  /** Ithasala only: VARTAMANA, POORNA or BHAVISHYAT. */
  variant?: 'VARTAMANA' | 'POORNA' | 'BHAVISHYAT';
  /** Pair evidence (longitudes, orbs, aspect, applying/separating). */
  evidence: TajikaPairEvidence[];
  /** Additional facts that decided the rule (houses, dignity, combustion, bala). */
  facts: string[];
  /** Gairi-Kamboola only: the text's extra effectiveness conditions are all met. */
  effective?: boolean;
}

export interface TajikaYogaEntry {
  id: TajikaSixteenYogaId;
  name: string;
  alternateNames: string[];
  present: boolean;
  occurrences: TajikaYogaOccurrence[];
  /** The rule as implemented, in one sentence. */
  rule: string;
  /** Section citation. */
  source: string;
}

export interface TajikaPlanetState {
  planet: TajikaGraha;
  longitude: number;
  rashiIndex: number;
  degreeInSign: number;
  house: number;
  isRetrograde: boolean;
  isCombust: boolean;
  isExalted: boolean;
  isDebilitated: boolean;
  isOwnSign: boolean;
  /** Compound relationship of the planet towards the lord of the sign it occupies (undefined in own sign). */
  signLordRelationship?: CompoundRelationship;
  panchaVargiyaBala: number;
}

export interface TajikaSixteenYogasResult {
  ascendantRashiIndex: number;
  planets: TajikaPlanetState[];
  yogas: TajikaYogaEntry[];
  options: Required<TajikaYogaOptions>;
  provisional: true;
  source: string;
  conventionNotes: string[];
}

// ---------------------------------------------------------------- Pancha-vargiya Bala

export type TajikaVargaRelation = 'OWN' | 'FRIEND' | 'ENEMY';

/** How a compound-NEUTRAL (sama) lord is scored; the two-tier source gives only friend and enemy values. */
export type TajikaNeutralScoring = 'AS_ENEMY' | 'AS_FRIEND';

export interface TajikaVargaComponent {
  /** Lord of the sign / hadda / drekkana sign / navamsha sign. */
  lord: PlanetSymbol;
  /** Sign index (1-12) for kshetra, drekkana and navamsha; the sign of the hadda for hadda. */
  rashiIndex: number;
  compoundRelationship?: CompoundRelationship;
  relation: TajikaVargaRelation;
  maximum: number;
  score: number;
}

export interface TajikaPanchaVargiyaPlanet {
  planet: TajikaGraha;
  longitude: number;
  kshetra: TajikaVargaComponent;
  uchcha: {
    deepDebilitationLongitude: number;
    /** Shortest arc from the deep debilitation point (0-180). */
    arcFromDebilitation: number;
    maximum: 20;
    score: number;
  };
  hadda: TajikaVargaComponent & { haddaStartDegree: number; haddaEndDegree: number };
  drekkana: TajikaVargaComponent;
  navamsha: TajikaVargaComponent;
  /** Sum of the five components (maximum 80). */
  total: number;
  /** total / 4 (maximum 20, vimshopaka units) — the figure used for Varshesha selection. */
  vimshopaka: number;
  category: 'WEAK' | 'ORDINARY' | 'STRONG' | 'VERY_STRONG' | 'EXTRAORDINARY';
}

export interface TajikaPanchaVargiyaResult {
  planets: TajikaPanchaVargiyaPlanet[];
  neutralScoring: TajikaNeutralScoring;
  provisional: true;
  source: string;
  conventionNotes: string[];
}

// ---------------------------------------------------------------- Annual wrappers

export interface TajikaAnnualLocation {
  latitude: number;
  longitude: number;
  timezone: string;
  placeName?: string;
}

export interface TajikaAnnualContext {
  targetYear: number;
  solarReturnUtcIso: string;
  solarReturnLocalIso: string;
  annualChart: AstroChart;
}

// ---------------------------------------------------------------- Tithi Pravesha

export interface TithiPraveshaCandidate {
  utcIso: string;
  sunLongitude: number;
  moonLongitude: number;
  sunRashiIndex: number;
  sunSignMatchesNatal: boolean;
  /** Days from the solar return of the target year. */
  daysFromSolarReturn: number;
}

export interface TithiPraveshaResult {
  targetYear: number;
  natal: {
    utcIso: string;
    sunLongitude: number;
    moonLongitude: number;
    /** (Moon - Sun) mod 360. */
    elongation: number;
    tithiIndex: number;
    sunRashiIndex: number;
  };
  moment: {
    utcIso: string;
    localIso: string;
    timezone: string;
    utcOffsetMinutes: number;
    elongation: number;
    /** Signed residual (moment elongation - natal elongation), degrees. */
    elongationResidual: number;
    tithiIndex: number;
    sunRashiIndex: number;
    sunSignMatchesNatal: boolean;
  };
  solarReturnUtcIso: string;
  /** Every elongation match found in the search window (the chosen one included). */
  candidates: TithiPraveshaCandidate[];
  location: TajikaAnnualLocation;
  chart: AstroChart;
  provisional: true;
  source: string;
  conventionNotes: string[];
}
