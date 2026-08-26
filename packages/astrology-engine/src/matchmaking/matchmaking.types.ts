import { PlanetSymbol } from '../planets/planet.types';

export interface KootaScore {
  name: string;             // e.g., "Varna", "Vashya", "Tara", "Yoni", "Graha Maitri", "Gana", "Bhakoot", "Nadi"
  maxPoints: number;
  obtainedPoints: number;
  description: string;
}

export interface AshtakootaResult {
  totalMaxPoints: number;    // Always 36
  totalObtainedPoints: number;
  kootas: Record<string, KootaScore>;
  isCompatible: boolean;     // >= 18 points is considered compatible
}

export interface ManglikStatus {
  isManglik: boolean;
  manglikHouses: number[];   // Houses containing Mars (e.g. [1, 4, 7, 8, 12])
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MatchmakingResult {
  ashtakoota: AshtakootaResult;
  boyManglik: ManglikStatus;
  girlManglik: ManglikStatus;
  overallVerdict: string;
}
