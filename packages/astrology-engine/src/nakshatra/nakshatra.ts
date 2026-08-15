import { PlanetSymbol } from '../planets/planet.types';
import { normalizeDegree, EPSILON } from '../coordinates/angular-math';

export interface NakshatraDefinition {
  index: number;         // 1 to 27
  name: string;          // e.g. "Ashwini"
  lord: PlanetSymbol;    // Ruler planet
  startDegree: number;   // Inclusive start degree
  endDegree: number;     // Exclusive end degree
}

export const NAKSHATRA_LORDS_ORDER: PlanetSymbol[] = [
  PlanetSymbol.KETU,
  PlanetSymbol.VENUS,
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.RAHU,
  PlanetSymbol.JUPITER,
  PlanetSymbol.SATURN,
  PlanetSymbol.MERCURY,
];

export const NAKSHATRAS: NakshatraDefinition[] = [
  { index: 1, name: 'Ashwini', lord: PlanetSymbol.KETU, startDegree: 0, endDegree: 13.333333333333334 },
  { index: 2, name: 'Bharani', lord: PlanetSymbol.VENUS, startDegree: 13.333333333333334, endDegree: 26.666666666666668 },
  { index: 3, name: 'Krittika', lord: PlanetSymbol.SUN, startDegree: 26.666666666666668, endDegree: 40.0 },
  { index: 4, name: 'Rohini', lord: PlanetSymbol.MOON, startDegree: 40.0, endDegree: 53.333333333333336 },
  { index: 5, name: 'Mrigashira', lord: PlanetSymbol.MARS, startDegree: 53.333333333333336, endDegree: 66.66666666666667 },
  { index: 6, name: 'Ardra', lord: PlanetSymbol.RAHU, startDegree: 66.66666666666667, endDegree: 80.0 },
  { index: 7, name: 'Punarvasu', lord: PlanetSymbol.JUPITER, startDegree: 80.0, endDegree: 93.33333333333333 },
  { index: 8, name: 'Pushya', lord: PlanetSymbol.SATURN, startDegree: 93.33333333333333, endDegree: 106.66666666666667 },
  { index: 9, name: 'Ashlesha', lord: PlanetSymbol.MERCURY, startDegree: 106.66666666666667, endDegree: 120.0 },
  { index: 10, name: 'Magha', lord: PlanetSymbol.KETU, startDegree: 120.0, endDegree: 133.33333333333334 },
  { index: 11, name: 'Purva Phalguni', lord: PlanetSymbol.VENUS, startDegree: 133.33333333333334, endDegree: 146.66666666666666 },
  { index: 12, name: 'Uttara Phalguni', lord: PlanetSymbol.SUN, startDegree: 146.66666666666666, endDegree: 160.0 },
  { index: 13, name: 'Hasta', lord: PlanetSymbol.MOON, startDegree: 160.0, endDegree: 173.33333333333334 },
  { index: 14, name: 'Chitra', lord: PlanetSymbol.MARS, startDegree: 173.33333333333334, endDegree: 186.66666666666666 },
  { index: 15, name: 'Swati', lord: PlanetSymbol.RAHU, startDegree: 186.66666666666666, endDegree: 200.0 },
  { index: 16, name: 'Vishakha', lord: PlanetSymbol.JUPITER, startDegree: 200.0, endDegree: 213.33333333333334 },
  { index: 17, name: 'Anuradha', lord: PlanetSymbol.SATURN, startDegree: 213.33333333333334, endDegree: 226.66666666666666 },
  { index: 18, name: 'Jyeshtha', lord: PlanetSymbol.MERCURY, startDegree: 226.66666666666666, endDegree: 240.0 },
  { index: 19, name: 'Mula', lord: PlanetSymbol.KETU, startDegree: 240.0, endDegree: 253.33333333333334 },
  { index: 20, name: 'Purva Ashadha', lord: PlanetSymbol.VENUS, startDegree: 253.33333333333334, endDegree: 266.6666666666667 },
  { index: 21, name: 'Uttara Ashadha', lord: PlanetSymbol.SUN, startDegree: 266.6666666666667, endDegree: 280.0 },
  { index: 22, name: 'Shravana', lord: PlanetSymbol.MOON, startDegree: 280.0, endDegree: 293.33333333333337 },
  { index: 23, name: 'Dhanishta', lord: PlanetSymbol.MARS, startDegree: 293.33333333333337, endDegree: 306.6666666666667 },
  { index: 24, name: 'Shatabhisha', lord: PlanetSymbol.RAHU, startDegree: 306.6666666666667, endDegree: 320.0 },
  { index: 25, name: 'Purva Bhadrapada', lord: PlanetSymbol.JUPITER, startDegree: 320.0, endDegree: 333.33333333333337 },
  { index: 26, name: 'Uttara Bhadrapada', lord: PlanetSymbol.SATURN, startDegree: 333.33333333333337, endDegree: 346.6666666666667 },
  { index: 27, name: 'Revati', lord: PlanetSymbol.MERCURY, startDegree: 346.6666666666667, endDegree: 360.0 },
];

/**
 * Calculates Nakshatra index (1 to 27) for a given longitude in degrees.
 */
export function getNakshatraIndex(longitude: number): number {
  const norm = normalizeDegree(longitude);
  const nakshatraSpan = 360 / 27; // 13.333333333333334
  const index = Math.floor(norm / nakshatraSpan) + 1;
  if (index > 27) {
    return 27;
  }
  return index;
}

/**
 * Gets Nakshatra definition by longitude.
 */
export function getNakshatraByLongitude(longitude: number): NakshatraDefinition {
  const index = getNakshatraIndex(longitude);
  return NAKSHATRAS[index - 1];
}

/**
 * Calculates Pada (1, 2, 3, or 4) for a given longitude.
 */
export function getPada(longitude: number): number {
  const norm = normalizeDegree(longitude);
  const padaSpan = 360 / 108; // 3.3333333333333335 (108 padas total)
  const totalPadaIndex = Math.floor(norm / padaSpan);
  const pada = (totalPadaIndex % 4) + 1;
  return pada;
}
