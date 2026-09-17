import { PlanetSymbol } from '../planets/planet.types';

export type VargaType =
  | 'D1'  // Rashi (Natal Chart)
  | 'D2'  // Hora (Wealth)
  | 'D3'  // Drekkana (Siblings)
  | 'D4'  // Chaturthamsa (Fortunes)
  | 'D7'  // Saptamsa (Progeny)
  | 'D9'  // Navamsha (Spouse & Fortune)
  | 'D10' // Dasamsa (Career)
  | 'D12' // Dwadasamsa (Parents)
  | 'D16' // Shodasamsa (Vehicles & Desires)
  | 'D20' // Vimsamsa (Spiritual Progress)
  | 'D24' // Chaturvimsamsa (Learning & Education)
  | 'D27' // Saptavimsamsa / Bhamsa (Strengths)
  | 'D30' // Trimsamsa (Misfortunes)
  | 'D40' // Khavedamsa (Auspicious Effects)
  | 'D45' // Akshavedamsa (General Character)
  | 'D60';// Shashtiamsa (Past Karma)

export const CANONICAL_VARGAS: VargaType[] = [
  'D1',
  'D2',
  'D3',
  'D4',
  'D7',
  'D9',
  'D10',
  'D12',
  'D16',
  'D20',
  'D24',
  'D27',
  'D30',
  'D40',
  'D45',
  'D60',
];

export interface VargaPlacement {
  planet: PlanetSymbol | 'Ascendant';
  rashiIndex: number; // Sign index in divisional chart (1 to 12)
  rashiName: string;
  degreeInVarga?: number; // Relative degree in divisional sign [0.0, 30.0)
  sourceLongitude?: number; // Original sidereal longitude [0.0, 360.0)
  house?: number; // House relative to Varga Ascendant (1 to 12)
  isRetrograde?: boolean;
}

export interface VargaHousePlacement {
  houseNumber: number; // 1 to 12
  rashiIndex: number;  // 1 to 12
  rashiName: string;
  occupants: (PlanetSymbol | 'Ascendant')[];
}

export interface VargaSignSummary {
  index: number; // 1 to 12
  name: string;  // Sanskrit sign name
  houseNumber: number; // House number mapped to this sign (1 to 12)
  occupants: (PlanetSymbol | 'Ascendant')[];
}

export interface VargaChart {
  vargaType: VargaType;
  division: number;
  name: string;
  calculationRule: string;
  ascendant?: VargaPlacement;
  placements: Record<string, VargaPlacement>;
  houses?: VargaHousePlacement[];
  signs?: VargaSignSummary[];
}
