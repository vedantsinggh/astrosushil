import { PlanetSymbol } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';

export interface AshtottariSector {
  index: number;            // 1 to 28
  name: string;             // Nakshatra / segment name
  lord: PlanetSymbol;       // Ruling planet
  orderInGroup: number;     // 1 to 4 (or 1 to 3) in this lord's sequence
  totalInGroup: number;     // 4 or 3
  startDegree: number;      // Inclusive start degree [0, 360)
  endDegree: number;        // Exclusive end degree [0, 360]
  spanDegrees: number;      // Exact span in decimal degrees
  segmentYears: number;     // Nominal years allotted to this single sector
}

// Canonical Ashtottari lord durations in years (sum = 108)
export const ASHTOTTARI_YEARS: Record<PlanetSymbol, number> = {
  [PlanetSymbol.SUN]: 6,
  [PlanetSymbol.MOON]: 15,
  [PlanetSymbol.MARS]: 8,
  [PlanetSymbol.MERCURY]: 17,
  [PlanetSymbol.SATURN]: 10,
  [PlanetSymbol.JUPITER]: 19,
  [PlanetSymbol.RAHU]: 12,
  [PlanetSymbol.VENUS]: 21,
  [PlanetSymbol.KETU]: 0,
  [PlanetSymbol.URANUS]: 0,
  [PlanetSymbol.NEPTUNE]: 0,
  [PlanetSymbol.PLUTO]: 0,
};

export const TOTAL_ASHTOTTARI_YEARS = 108;

// Canonical 8-planet Ashtottari Mahadasha sequence
export const ASHTOTTARI_ORDER: PlanetSymbol[] = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.SATURN,
  PlanetSymbol.JUPITER,
  PlanetSymbol.RAHU,
  PlanetSymbol.VENUS,
];

// Standard 13°20' span in decimal degrees
const STANDARD_SPAN = 360 / 27; // 13.333333333333334

/**
 * 28 classical Ashtottari sectors in zodiac order from 0° Aries to 360° Pisces.
 * Includes Abhijit Nakshatra (4th Pada of Uttara Ashadha + 1/15th of Shravana) in Saturn's 4-Nakshatra group.
 */
export const ASHTOTTARI_SECTORS: AshtottariSector[] = [
  // Rahu (segments 3 & 4 of 4)
  {
    index: 1,
    name: 'Ashwini',
    lord: PlanetSymbol.RAHU,
    orderInGroup: 3,
    totalInGroup: 4,
    startDegree: 0.0,
    endDegree: STANDARD_SPAN,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 12 / 4, // 3.0
  },
  {
    index: 2,
    name: 'Bharani',
    lord: PlanetSymbol.RAHU,
    orderInGroup: 4,
    totalInGroup: 4,
    startDegree: STANDARD_SPAN,
    endDegree: STANDARD_SPAN * 2,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 12 / 4, // 3.0
  },

  // Venus (segments 1, 2, 3 of 3)
  {
    index: 3,
    name: 'Krittika',
    lord: PlanetSymbol.VENUS,
    orderInGroup: 1,
    totalInGroup: 3,
    startDegree: STANDARD_SPAN * 2,
    endDegree: STANDARD_SPAN * 3,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 21 / 3, // 7.0
  },
  {
    index: 4,
    name: 'Rohini',
    lord: PlanetSymbol.VENUS,
    orderInGroup: 2,
    totalInGroup: 3,
    startDegree: STANDARD_SPAN * 3,
    endDegree: STANDARD_SPAN * 4,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 21 / 3, // 7.0
  },
  {
    index: 5,
    name: 'Mrigashira',
    lord: PlanetSymbol.VENUS,
    orderInGroup: 3,
    totalInGroup: 3,
    startDegree: STANDARD_SPAN * 4,
    endDegree: STANDARD_SPAN * 5,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 21 / 3, // 7.0
  },

  // Sun (segments 1, 2, 3, 4 of 4)
  {
    index: 6,
    name: 'Ardra',
    lord: PlanetSymbol.SUN,
    orderInGroup: 1,
    totalInGroup: 4,
    startDegree: STANDARD_SPAN * 5,
    endDegree: STANDARD_SPAN * 6,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 6 / 4, // 1.5
  },
  {
    index: 7,
    name: 'Punarvasu',
    lord: PlanetSymbol.SUN,
    orderInGroup: 2,
    totalInGroup: 4,
    startDegree: STANDARD_SPAN * 6,
    endDegree: STANDARD_SPAN * 7,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 6 / 4, // 1.5
  },
  {
    index: 8,
    name: 'Pushya',
    lord: PlanetSymbol.SUN,
    orderInGroup: 3,
    totalInGroup: 4,
    startDegree: STANDARD_SPAN * 7,
    endDegree: STANDARD_SPAN * 8,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 6 / 4, // 1.5
  },
  {
    index: 9,
    name: 'Ashlesha',
    lord: PlanetSymbol.SUN,
    orderInGroup: 4,
    totalInGroup: 4,
    startDegree: STANDARD_SPAN * 8,
    endDegree: STANDARD_SPAN * 9,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 6 / 4, // 1.5
  },

  // Moon (segments 1, 2, 3 of 3)
  {
    index: 10,
    name: 'Magha',
    lord: PlanetSymbol.MOON,
    orderInGroup: 1,
    totalInGroup: 3,
    startDegree: STANDARD_SPAN * 9,
    endDegree: STANDARD_SPAN * 10,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 15 / 3, // 5.0
  },
  {
    index: 11,
    name: 'Purva Phalguni',
    lord: PlanetSymbol.MOON,
    orderInGroup: 2,
    totalInGroup: 3,
    startDegree: STANDARD_SPAN * 10,
    endDegree: STANDARD_SPAN * 11,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 15 / 3, // 5.0
  },
  {
    index: 12,
    name: 'Uttara Phalguni',
    lord: PlanetSymbol.MOON,
    orderInGroup: 3,
    totalInGroup: 3,
    startDegree: STANDARD_SPAN * 11,
    endDegree: STANDARD_SPAN * 12,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 15 / 3, // 5.0
  },

  // Mars (segments 1, 2, 3, 4 of 4)
  {
    index: 13,
    name: 'Hasta',
    lord: PlanetSymbol.MARS,
    orderInGroup: 1,
    totalInGroup: 4,
    startDegree: STANDARD_SPAN * 12,
    endDegree: STANDARD_SPAN * 13,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 8 / 4, // 2.0
  },
  {
    index: 14,
    name: 'Chitra',
    lord: PlanetSymbol.MARS,
    orderInGroup: 2,
    totalInGroup: 4,
    startDegree: STANDARD_SPAN * 13,
    endDegree: STANDARD_SPAN * 14,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 8 / 4, // 2.0
  },
  {
    index: 15,
    name: 'Swati',
    lord: PlanetSymbol.MARS,
    orderInGroup: 3,
    totalInGroup: 4,
    startDegree: STANDARD_SPAN * 14,
    endDegree: STANDARD_SPAN * 15,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 8 / 4, // 2.0
  },
  {
    index: 16,
    name: 'Vishakha',
    lord: PlanetSymbol.MARS,
    orderInGroup: 4,
    totalInGroup: 4,
    startDegree: STANDARD_SPAN * 15,
    endDegree: STANDARD_SPAN * 16,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 8 / 4, // 2.0
  },

  // Mercury (segments 1, 2, 3 of 3)
  {
    index: 17,
    name: 'Anuradha',
    lord: PlanetSymbol.MERCURY,
    orderInGroup: 1,
    totalInGroup: 3,
    startDegree: STANDARD_SPAN * 16,
    endDegree: STANDARD_SPAN * 17,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 17 / 3, // 5.666667
  },
  {
    index: 18,
    name: 'Jyeshtha',
    lord: PlanetSymbol.MERCURY,
    orderInGroup: 2,
    totalInGroup: 3,
    startDegree: STANDARD_SPAN * 17,
    endDegree: STANDARD_SPAN * 18,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 17 / 3, // 5.666667
  },
  {
    index: 19,
    name: 'Mula',
    lord: PlanetSymbol.MERCURY,
    orderInGroup: 3,
    totalInGroup: 3,
    startDegree: STANDARD_SPAN * 18,
    endDegree: STANDARD_SPAN * 19,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 17 / 3, // 5.666667
  },

  // Saturn (segments 1, 2, 3, 4 of 4)
  // Purva Ashadha: full 13°20'
  {
    index: 20,
    name: 'Purva Ashadha',
    lord: PlanetSymbol.SATURN,
    orderInGroup: 1,
    totalInGroup: 4,
    startDegree: STANDARD_SPAN * 19, // 253.33333333333334 (253°20')
    endDegree: STANDARD_SPAN * 20,   // 266.6666666666667 (266°40')
    spanDegrees: STANDARD_SPAN,
    segmentYears: 10 / 4, // 2.5
  },
  // Uttara Ashadha (Padas 1-3): 10°00' (from 266°40' to 276°40')
  {
    index: 21,
    name: 'Uttara Ashadha',
    lord: PlanetSymbol.SATURN,
    orderInGroup: 2,
    totalInGroup: 4,
    startDegree: 266.6666666666667,  // 266°40'
    endDegree: 276.6666666666667,    // 276°40'
    spanDegrees: 10.0,
    segmentYears: 10 / 4, // 2.5
  },
  // Abhijit: 4th Pada of UA (3°20') + first 1/15th of Shravana (0°53'20'') = 4°13'20'' (4.222222°)
  {
    index: 22,
    name: 'Abhijit',
    lord: PlanetSymbol.SATURN,
    orderInGroup: 3,
    totalInGroup: 4,
    startDegree: 276.6666666666667,          // 276°40'
    endDegree: 276.6666666666667 + 4.222222222222222, // 280°53'20'' (280.888889°)
    spanDegrees: 4.222222222222222,
    segmentYears: 10 / 4, // 2.5
  },
  // Shravana (Remainder): from 280°53'20'' to 293°20' (12°26'40'' = 12.444444°)
  {
    index: 23,
    name: 'Shravana',
    lord: PlanetSymbol.SATURN,
    orderInGroup: 4,
    totalInGroup: 4,
    startDegree: 280.8888888888889,  // 280°53'20''
    endDegree: STANDARD_SPAN * 22,   // 293°20' (293.33333333333337°)
    spanDegrees: STANDARD_SPAN * 22 - 280.8888888888889, // 12.444444444444445
    segmentYears: 10 / 4, // 2.5
  },

  // Jupiter (segments 1, 2, 3 of 3)
  {
    index: 24,
    name: 'Dhanishta',
    lord: PlanetSymbol.JUPITER,
    orderInGroup: 1,
    totalInGroup: 3,
    startDegree: STANDARD_SPAN * 22,
    endDegree: STANDARD_SPAN * 23,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 19 / 3, // 6.333333
  },
  {
    index: 25,
    name: 'Shatabhisha',
    lord: PlanetSymbol.JUPITER,
    orderInGroup: 2,
    totalInGroup: 3,
    startDegree: STANDARD_SPAN * 23,
    endDegree: STANDARD_SPAN * 24,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 19 / 3, // 6.333333
  },
  {
    index: 26,
    name: 'Purva Bhadrapada',
    lord: PlanetSymbol.JUPITER,
    orderInGroup: 3,
    totalInGroup: 3,
    startDegree: STANDARD_SPAN * 24,
    endDegree: STANDARD_SPAN * 25,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 19 / 3, // 6.333333
  },

  // Rahu (segments 1 & 2 of 4)
  {
    index: 27,
    name: 'Uttara Bhadrapada',
    lord: PlanetSymbol.RAHU,
    orderInGroup: 1,
    totalInGroup: 4,
    startDegree: STANDARD_SPAN * 25,
    endDegree: STANDARD_SPAN * 26,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 12 / 4, // 3.0
  },
  {
    index: 28,
    name: 'Revati',
    lord: PlanetSymbol.RAHU,
    orderInGroup: 2,
    totalInGroup: 4,
    startDegree: STANDARD_SPAN * 26,
    endDegree: 360.0,
    spanDegrees: STANDARD_SPAN,
    segmentYears: 12 / 4, // 3.0
  },
];

/**
 * Finds the exact Ashtottari sector (1 to 28) for a given sidereal longitude.
 */
export function getAshtottariSectorByLongitude(longitude: number): AshtottariSector {
  const norm = normalizeDegree(longitude);

  for (const sector of ASHTOTTARI_SECTORS) {
    if (norm >= sector.startDegree && norm < sector.endDegree) {
      return sector;
    }
  }

  // Handle boundary at exactly 360.0 or micro-epsilon near 360
  if (norm >= 360.0 - 1e-9) {
    return ASHTOTTARI_SECTORS[0]; // Ashwini
  }

  return ASHTOTTARI_SECTORS[ASHTOTTARI_SECTORS.length - 1]; // Revati fallback
}
