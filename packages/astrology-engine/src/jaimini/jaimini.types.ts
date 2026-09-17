import { PlanetSymbol } from '../planets/planet.types';

export type CharaKarakaScheme = 'SEVEN_KARAKA' | 'EIGHT_KARAKA';

export interface CharaKarakaDetail {
  planet: PlanetSymbol;
  code: 'AK' | 'AmK' | 'BK' | 'MK' | 'PiK' | 'PK' | 'GK' | 'DK';
  name: string;
  sanskritName: string;
  significance: string;
  rank: number; // 1 (AK) to 7/8 (DK)
  degreeInSign: number;
}

export interface ArudhaPadaPlacement {
  houseNumber: number; // 1 to 12
  code: string;        // 'AL' / 'A1' ... 'A12' / 'UL'
  name: string;
  signIndex: number;   // 1 to 12
  signName: string;
  lord: PlanetSymbol;
  lordSignIndex: number;
  stepsCount: number;
  exceptionApplied?: 'TEN_SIGN_SHIFT' | 'FOURTH_HOUSE_SHIFT' | 'NONE';
  occupants: PlanetSymbol[];
}

export interface RashiDrishtiDetail {
  sourceSignIndex: number;
  sourceSignName: string;
  modality: 'CHARA' | 'STHIRA' | 'DVISVABHAVA';
  aspectedSigns: {
    signIndex: number;
    signName: string;
    aspectingPlanets: PlanetSymbol[];
  }[];
}

export interface ArgalaDetail {
  houseNumber: number;
  targetSignIndex: number;
  argalaType: 'SHUBHA' | 'PAPA' | 'MIXED' | 'NONE';
  interveningHouses: {
    relativeHouse: number; // 2, 4, 11, or 5
    houseNumber: number;
    planets: PlanetSymbol[];
    isBenefic: boolean;
  }[];
  obstructingHouses: {
    relativeHouse: number; // 12, 10, 3, or 9
    houseNumber: number;
    planets: PlanetSymbol[];
  }[];
  isObstructed: boolean;
  netArgalaScore: number;
}

export interface KarakamshaReport {
  atmakarakaPlanet: PlanetSymbol;
  karakamshaRashiIndex: number;
  karakamshaRashiName: string;
  karakamshaHouseFromLagna: number;
  karakamshaPlanetsInKendra: PlanetSymbol[];
  karakamshaPlanetsInTrikona: PlanetSymbol[];
}

export interface JaiminiReport {
  scheme: CharaKarakaScheme;
  charaKarakas: CharaKarakaDetail[];
  arudhaPadas: ArudhaPadaPlacement[];
  arudhaLagna: ArudhaPadaPlacement;
  upapadaLagna: ArudhaPadaPlacement;
  darapada: ArudhaPadaPlacement;
  rashiDrishtis: RashiDrishtiDetail[];
  argalas: ArgalaDetail[];
  karakamsha: KarakamshaReport;
}
