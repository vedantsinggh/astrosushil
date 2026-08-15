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
  | 'D16' // Shodasamsa (Vehicles & Comforts)
  | 'D20' // Vimsamsa (Spiritual Progress)
  | 'D24' // Chaturvimsamsa (Learning & Education)
  | 'D27' // Saptavimsamsa (Strengths)
  | 'D30' // Trimsamsa (Misfortunes)
  | 'D40' // Khavedamsa (Auspicious Effects)
  | 'D45' // Akshavedamsa (General Character)
  | 'D60';// Shashtiamsa (Past Karma)

export interface VargaPlacement {
  planet: PlanetSymbol;
  rashiIndex: number; // Sign index in divisional chart (1 to 12)
  rashiName: string;
}

export interface VargaChart {
  vargaType: VargaType;
  name: string;
  placements: Record<PlanetSymbol, VargaPlacement>;
}
