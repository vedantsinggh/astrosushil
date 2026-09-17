import { PlanetSymbol } from '../planets/planet.types';
import { VargaType } from '../varga/varga.types';
import { ExtendedPlanetaryDignity } from '../planets/planetary-intelligence.types';

export interface VargaDignityPlacement {
  varga: VargaType;
  rashiIndex: number;
  rashiName: string;
  degreeInVarga: number;
  dignity: ExtendedPlanetaryDignity;
  dignityScore: number; // 2 to 20
  weight: number;
  weightedScore: number;
}

export interface PlanetaryVimshopakaScore {
  planet: PlanetSymbol;
  shadvargaScore: number;      // 0 to 20
  saptavargaScore: number;     // 0 to 20
  dashavargaScore: number;     // 0 to 20
  shodashavargaScore: number;  // 0 to 20
  shodashavargaPlacements: VargaDignityPlacement[];
  vaisheshikamsaCategory: string; // e.g. Parijata (2), Uttama (3), Gopura (4), etc.
  goodVargasCount: number;
}

export interface PlanetaryRashmiDetail {
  planet: PlanetSymbol;
  baseRays: number;
  exaltationRays: number;
  modifiedRays: number;
  combustionDeduction: number;
  retrogradeBonus: number;
  netRays: number;
}

export interface VimshopakaBalaReport {
  planets: Record<string, PlanetaryVimshopakaScore>;
  rashmis: Record<string, PlanetaryRashmiDetail>;
  totalChartRays: number;
}
