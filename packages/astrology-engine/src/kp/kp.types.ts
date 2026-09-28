import { PlanetSymbol } from '../planets/planet.types';

export interface KPLordshipFourFold {
  signLord: PlanetSymbol;
  starLord: PlanetSymbol;
  subLord: PlanetSymbol;
  subSubLord: PlanetSymbol;
}

export interface KPPointPlacement extends KPLordshipFourFold {
  name: string;
  longitude: number;
  rashiIndex: number;
  rashiName: string;
  degreeInRashi: number;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  house: number;
  subNumber: number; // 1 to 249
}

export interface KPCuspPlacement extends KPLordshipFourFold {
  houseNumber: number; // 1 to 12
  cuspLongitude: number;
  rashiIndex: number;
  rashiName: string;
  degreeInRashi: number;
  nakshatraIndex: number;
  nakshatraName: string;
  subNumber: number;
}

export interface KPHouseSignificators {
  houseNumber: number;
  levelA_StarOfOccupants: PlanetSymbol[];
  levelB_Occupants: PlanetSymbol[];
  levelC_StarOfLord: PlanetSymbol[];
  levelD_Lord: PlanetSymbol[];
  allSignificators: PlanetSymbol[];
}

export interface KPRulingPlanets {
  dayLord: PlanetSymbol;
  moonSignLord: PlanetSymbol;
  moonStarLord: PlanetSymbol;
  ascendantSignLord: PlanetSymbol;
  ascendantStarLord: PlanetSymbol;
  nodeRahuRepresents: PlanetSymbol[];
  nodeKetuRepresents: PlanetSymbol[];
  primaryRulingPlanets: PlanetSymbol[];
}

export interface KPReport {
  ayanamsaType: string;
  ayanamsaValue: number;
  cusps: KPCuspPlacement[];
  planets: Record<string, KPPointPlacement>;
  houseSignificators: KPHouseSignificators[];
  planetSignifications: Record<string, number[]>; // Planet -> Houses signified
  rulingPlanets: KPRulingPlanets;
  parsFortuna: KPPointPlacement;
}
