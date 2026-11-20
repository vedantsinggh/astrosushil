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
  /** Lord of the year: 15 virupas (BPHS ch. 27; Raman Ahargana method). Provisional. */
  abdaBala?: number;
  /** Lord of the month: 30 virupas (BPHS ch. 27; Raman Ahargana method). Provisional. */
  masaBala?: number;
  total: number;             // Sum of all components present, including abda/masa
}

/**
 * Combustion (asta) reported alongside Shadbala. It is NOT added to Shadbala: BPHS ch. 27 has no
 * combustion term; combustion is judged separately. Orbs: Surya Siddhanta kalamsha values
 * (planets/combustion.ts), provisional – pending client review.
 */
export interface ShadbalaCombustionInfo {
  isCombust: boolean;
  /** Angular distance from the Sun in degrees. */
  distanceFromSun: number;
  /** Orb applied in degrees. */
  orbDegrees: number;
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
  /** Combustion facts, exposed separately (not part of the Shadbala total). Absent for the Sun. */
  combustion?: ShadbalaCombustionInfo;
}

export interface ShadbalaKalaContextSummary {
  source: 'SOLAR' | 'FALLBACK';
  isDayBirth: boolean;
  vedicWeekday: number;
  sunriseIso: string | null;
  sunsetIso: string | null;
  unnataHours: number;
  tribhagaPart: number;
  horaLord: PlanetSymbol;
  abdaLord: PlanetSymbol;
  masaLord: PlanetSymbol;
  ahargana: number;
  ayanamsaDegrees: number;
  conventionNotes: string[];
}

export interface ShadbalaReport {
  planets: Partial<Record<PlanetSymbol, PlanetShadbala>>;
  summary: PlanetShadbala[]; // Ranked 1 to 7
  /** Time basis used for Kala Bala (sunrise/sunset, weekday, hora, year/month lords). */
  kalaContext?: ShadbalaKalaContextSummary;
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
