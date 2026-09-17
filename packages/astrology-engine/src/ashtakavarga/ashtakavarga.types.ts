import { PlanetSymbol } from '../planets/planet.types';

export const ASHTAKAVARGA_PLANETS = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
] as const;

export type AshtakavargaPlanet = (typeof ASHTAKAVARGA_PLANETS)[number];

export enum AshtakavargaContributor {
  SATURN = 'SATURN',
  JUPITER = 'JUPITER',
  MARS = 'MARS',
  SUN = 'SUN',
  VENUS = 'VENUS',
  MERCURY = 'MERCURY',
  MOON = 'MOON',
  LAGNA = 'LAGNA',
}

export const ASHTAKAVARGA_CONTRIBUTORS: AshtakavargaContributor[] = [
  AshtakavargaContributor.SATURN,
  AshtakavargaContributor.JUPITER,
  AshtakavargaContributor.MARS,
  AshtakavargaContributor.SUN,
  AshtakavargaContributor.VENUS,
  AshtakavargaContributor.MERCURY,
  AshtakavargaContributor.MOON,
  AshtakavargaContributor.LAGNA,
];

/**
 * Expected total benefic points for each of the 7 planets in BAV.
 * Sum across all 7 equals exactly 337 points.
 */
export const BAV_EXPECTED_TOTALS: Record<AshtakavargaPlanet, number> = {
  [PlanetSymbol.SUN]: 48,
  [PlanetSymbol.MOON]: 49,
  [PlanetSymbol.MARS]: 39,
  [PlanetSymbol.MERCURY]: 54,
  [PlanetSymbol.JUPITER]: 56,
  [PlanetSymbol.VENUS]: 52,
  [PlanetSymbol.SATURN]: 39,
};

export const SAV_EXPECTED_GRAND_TOTAL = 337;

/**
 * Individual Bhinnashtakavarga (BAV) for a single planet.
 */
export interface BhinnashtakavargaTable {
  planet: PlanetSymbol;
  // 1-indexed Rashi numbers (1 = Aries to 12 = Pisces)
  signs: Record<number, number>;
  // 0-indexed array where index 0 = Aries (Rashi 1) and index 11 = Pisces (Rashi 12)
  signList: number[];
  // Contributor matrices (each array of 12 elements with value 0 or 1)
  prastara: Record<AshtakavargaContributor, number[]>;
  totalPoints: number;
}

/**
 * Sarvashtakavarga (SAV) aggregating points from all 7 planets.
 */
export interface SarvashtakavargaTable {
  signs: Record<number, number>;
  signList: number[];
  byPlanet: Record<AshtakavargaPlanet, number[]>;
  grandTotal: number;
}

/**
 * Shodhana (Reductions) table for a single planet.
 */
export interface ShodhanaTable {
  planet: PlanetSymbol;
  trikonaReduced: number[];
  ekadhipatyaReduced: number[];
  totalTrikonaPoints: number;
  totalEkadhipatyaPoints: number;
}

/**
 * Shodhya Pinda (Pinda Sadhana) values for a single planet.
 */
export interface ShodhyaPinda {
  planet: PlanetSymbol;
  rashiPinda: number;
  grahaPinda: number;
  shodhyaPinda: number;
}

/**
 * Complete Ashtakavarga computation result.
 */
export interface AshtakavargaResult {
  bav: Record<AshtakavargaPlanet, BhinnashtakavargaTable>;
  sav: SarvashtakavargaTable;
  shodhana: Record<AshtakavargaPlanet, ShodhanaTable>;
  pinda: Record<AshtakavargaPlanet, ShodhyaPinda>;
}
