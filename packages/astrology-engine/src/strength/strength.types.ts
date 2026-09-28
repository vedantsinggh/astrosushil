import { PlanetSymbol } from '../planets/planet.types';

export const SHADBALA_PLANETS = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
] as const;

export type ShadbalaPlanet = (typeof SHADBALA_PLANETS)[number];

export interface SthanaBalaBreakdown {
  uchchaBala: number;        // Exaltation strength [0, 60]
  saptavargajaBala: number;  // 7-Divisional strength
  ojhayugmaBala: number;     // Odd/Even sign strength in Rashi & Navamsha [0, 30]
  kendradiBala: number;      // Kendra/Panaphara/Apoklima strength (15, 30, 60)
  drekkanaBala: number;      // Decanate gender strength [0, 15]
  total: number;
}

export interface KalaBalaBreakdown {
  nathonnathaBala: number;   // Diurnal / nocturnal strength [0, 60]
  pakshaBala: number;        // Fortnight lunar phase strength [0, 120]
  tribhagaBala: number;      // Three-part day/night strength [0, 60]
  varaBala: number;          // Weekday lord strength [0, 45]
  horaBala: number;          // Planetary hour lord strength [0, 60]
  ayanaBala: number;         // Declination strength [0, 60]
  yuddhaBala: number;        // Planetary war strength (+/-)
  total: number;
}

export interface PlanetShadbala {
  planet: PlanetSymbol;
  totalShashtiamsas: number;
  totalRupas: number;
  sthanaBala: SthanaBalaBreakdown;
  digBala: number;           // Directional strength [0, 60]
  kalaBala: KalaBalaBreakdown;
  cheshtaBala: number;       // Motional strength [0, 60]
  naisargikaBala: number;    // Natural luminosity strength [8.57, 60]
  drikBala: number;          // Aspectual strength (+/-)
  minimumRequirement: number; // In Shashtiamsas
  minimumRequirementRupas: number;
  ratio: number;             // totalShashtiamsas / minimumRequirement
  isStrong: boolean;         // ratio >= 1.0
  rank: number;              // 1 to 7
}

export interface ShadbalaReport {
  planets: Partial<Record<PlanetSymbol, PlanetShadbala>>;
  summary: PlanetShadbala[]; // Ranked 1 to 7
}

export interface HouseBhavaBala {
  houseNumber: number;        // 1 to 12
  sign: string;
  rashiIndex: number;
  lord: PlanetSymbol;
  bhavadhipatiBala: number;   // Lord's total Shadbala
  bhavaDigBala: number;       // Directional strength of sign on cusp [0, 60]
  bhavaDrishtiBala: number;   // Net aspectual strength on house
  bhavaOccupantBala: number;  // Contribution of planets situated in house
  totalShashtiamsas: number;
  totalRupas: number;
  rank: number;               // 1 to 12
}

export interface BhavaBalaReport {
  houses: HouseBhavaBala[];
}

export interface ComprehensiveStrengthReport {
  shadbala: ShadbalaReport;
  bhavaBala: BhavaBalaReport;
}
