import { normalizeDegree, EPSILON } from '../coordinates/angular-math';

export interface RashiDefinition {
  index: number;         // 1 to 12
  englishName: string;   // e.g. "Aries"
  sanskritName: string;  // e.g. "Mesha"
  element: 'FIRE' | 'EARTH' | 'AIR' | 'WATER';
  modality: 'CHARA' | 'STHIRA' | 'DVISVABHAVA'; // Cardinal / Fixed / Dual
  ruler: string;         // Ruling planet symbol
  startDegree: number;   // Inclusive start degree
  endDegree: number;     // Exclusive end degree
}

export const RASHIS: RashiDefinition[] = [
  { index: 1, englishName: 'Aries', sanskritName: 'Mesha', element: 'FIRE', modality: 'CHARA', ruler: 'MARS', startDegree: 0, endDegree: 30 },
  { index: 2, englishName: 'Taurus', sanskritName: 'Vrishabha', element: 'EARTH', modality: 'STHIRA', ruler: 'VENUS', startDegree: 30, endDegree: 60 },
  { index: 3, englishName: 'Gemini', sanskritName: 'Mithuna', element: 'AIR', modality: 'DVISVABHAVA', ruler: 'MERCURY', startDegree: 60, endDegree: 90 },
  { index: 4, englishName: 'Cancer', sanskritName: 'Karka', element: 'WATER', modality: 'CHARA', ruler: 'MOON', startDegree: 90, endDegree: 120 },
  { index: 5, englishName: 'Leo', sanskritName: 'Simha', element: 'FIRE', modality: 'STHIRA', ruler: 'SUN', startDegree: 120, endDegree: 150 },
  { index: 6, englishName: 'Virgo', sanskritName: 'Kanya', element: 'EARTH', modality: 'DVISVABHAVA', ruler: 'MERCURY', startDegree: 150, endDegree: 180 },
  { index: 7, englishName: 'Libra', sanskritName: 'Tula', element: 'AIR', modality: 'CHARA', ruler: 'VENUS', startDegree: 180, endDegree: 210 },
  { index: 8, englishName: 'Scorpio', sanskritName: 'Vrischika', element: 'WATER', modality: 'STHIRA', ruler: 'MARS', startDegree: 210, endDegree: 240 },
  { index: 9, englishName: 'Sagittarius', sanskritName: 'Dhanu', element: 'FIRE', modality: 'DVISVABHAVA', ruler: 'JUPITER', startDegree: 240, endDegree: 270 },
  { index: 10, englishName: 'Capricorn', sanskritName: 'Makara', element: 'EARTH', modality: 'CHARA', ruler: 'SATURN', startDegree: 270, endDegree: 300 },
  { index: 11, englishName: 'Aquarius', sanskritName: 'Kumbha', element: 'AIR', modality: 'STHIRA', ruler: 'SATURN', startDegree: 300, endDegree: 330 },
  { index: 12, englishName: 'Pisces', sanskritName: 'Meena', element: 'WATER', modality: 'DVISVABHAVA', ruler: 'JUPITER', startDegree: 330, endDegree: 360 },
];

/**
 * Calculates Rashi index (1 to 12) for a given longitude in degrees [0.0, 360.0).
 * Handles boundary conditions with floating point safety.
 */
export function getRashiIndex(longitude: number): number {
  const norm = normalizeDegree(longitude);
  const index = Math.floor(norm / 30) + 1;
  // Handle edge case where 359.99999999999999 resolves to 13
  if (index > 12) {
    return 12;
  }
  return index;
}

/**
 * Gets Rashi definition details by longitude.
 */
export function getRashiByLongitude(longitude: number): RashiDefinition {
  const index = getRashiIndex(longitude);
  return RASHIS[index - 1];
}

/**
 * Calculates relative degree inside the sign [0.0, 30.0).
 */
export function getDegreeInRashi(longitude: number): number {
  const norm = normalizeDegree(longitude);
  const degree = norm % 30;
  if (degree >= 30 - EPSILON) {
    return 0.0;
  }
  return degree;
}
