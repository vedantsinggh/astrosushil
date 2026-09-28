import { PlanetSymbol } from './planet.types';

export type ExtendedPlanetaryDignity =
  | 'EXALTED'
  | 'DEBILITATED'
  | 'MOOLATRIKONA'
  | 'OWN_SIGN'
  | 'GREAT_FRIEND'
  | 'FRIEND'
  | 'NEUTRAL'
  | 'ENEMY'
  | 'GREAT_ENEMY';

export type NaturalRelationship = 'FRIEND' | 'NEUTRAL' | 'ENEMY';
export type TemporalRelationship = 'FRIEND' | 'ENEMY';
export type CompoundRelationship = 'GREAT_FRIEND' | 'FRIEND' | 'NEUTRAL' | 'ENEMY' | 'GREAT_ENEMY';

export type AspectType =
  | 'OPPOSITION_7TH'
  | 'SPECIAL_4TH'
  | 'SPECIAL_8TH'
  | 'SPECIAL_5TH'
  | 'SPECIAL_9TH'
  | 'SPECIAL_3RD'
  | 'SPECIAL_10TH'
  | 'TRINE_ASPECT'
  | 'CONJUNCTION';

export interface PlanetaryAspectDetail {
  sourcePlanet: PlanetSymbol;
  targetPlanet?: PlanetSymbol;
  targetHouse: number;
  targetSign: number;
  aspectType: AspectType;
  angleDegrees: number;
  isFullDrishti: boolean;
}

export interface CombustionDetail {
  isCombust: boolean;
  angularSeparation: number;
  threshold: number;
  isRetrograde: boolean;
}

export type BaladiAvastha = 'BALA' | 'KUMARA' | 'YUVA' | 'VRIDDHA' | 'MRITA';
export type JagratadiAvastha = 'JAGRATA' | 'SWAPNA' | 'SUSHUPTI';

export interface PlanetaryAvastha {
  baladi: BaladiAvastha;
  baladiStrengthPercent: number; // 25, 50, 100, 0
  jagratadi: JagratadiAvastha;
}

export type CharaKarakaType =
  | 'ATMAKARAKA'
  | 'AMATYAKARAKA'
  | 'BHRATRIKARAKA'
  | 'MATRIKARAKA'
  | 'PUTRAKARAKA'
  | 'GNATIKARAKA'
  | 'DARAKARAKA';

export type CharaKarakaCode = 'AK' | 'AmK' | 'BK' | 'MK' | 'PK' | 'GK' | 'DK';

export interface CharaKarakaAssignment {
  planet: PlanetSymbol;
  karaka: CharaKarakaType;
  code: CharaKarakaCode;
  degreeInRashi: number;
  rank: number; // 1 to 7
}

export interface PlanetaryWarDetail {
  planet1: PlanetSymbol;
  planet2: PlanetSymbol;
  longitudinalSeparation: number;
  victor: PlanetSymbol;
  defeated: PlanetSymbol;
  victorLatitude: number;
  defeatedLatitude: number;
}

export interface ConjunctionDetail {
  planet1: PlanetSymbol;
  planet2: PlanetSymbol;
  rashiIndex: number;
  angularSeparation: number;
  isTight: boolean; // within 3.5 degrees
}

export interface PlanetaryIntelligence {
  planet: PlanetSymbol;
  dignity: ExtendedPlanetaryDignity;
  combustion: CombustionDetail;
  avastha: PlanetaryAvastha;
  charaKaraka?: CharaKarakaAssignment;
  aspectsCast: PlanetaryAspectDetail[];
  aspectsReceived: PlanetaryAspectDetail[];
  aspectedHouses: number[];
  aspectingPlanets: PlanetSymbol[];
  isRetrograde: boolean;
  speedLongitude: number;
  latitude: number;
}

export interface PlanetaryIntelligenceReport {
  planets: Partial<Record<PlanetSymbol, PlanetaryIntelligence>>;
  charaKarakas: CharaKarakaAssignment[];
  planetaryWars: PlanetaryWarDetail[];
  conjunctions: ConjunctionDetail[];
}
