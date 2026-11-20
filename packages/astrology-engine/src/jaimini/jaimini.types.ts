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
  /** Present (true) only when a degree tie was resolved by the fixed priority order. */
  tieResolvedByPriority?: boolean;
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
  /** Sign the pada falls in before the BPHS ch. 29 1st/7th exception. */
  rawPadaSignIndex?: number;
  /** Which exception fired (only when `exceptionApplied` is TEN_SIGN_SHIFT). */
  exceptionDetail?: 'PADA_IN_1ST_FROM_HOUSE' | 'PADA_IN_7TH_FROM_HOUSE';
  /** Why a Scorpio/Aquarius co-lord was chosen (stronger co-lord rule, provisional). */
  lordSelectionReason?: string;
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
