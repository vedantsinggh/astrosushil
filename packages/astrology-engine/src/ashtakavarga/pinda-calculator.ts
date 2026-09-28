import { AstroChart } from '../chart/astro-chart.types';
import { PlanetSymbol } from '../planets/planet.types';
import { ASHTAKAVARGA_PLANETS, AshtakavargaPlanet, ShodhyaPinda } from './ashtakavarga.types';

/**
 * Classical Rashi Gunakaras (Sign Multipliers) from BPHS Ch. 73.
 * 0-indexed array where index 0 = Aries and index 11 = Pisces.
 */
export const RASHI_GUNAKARAS: readonly number[] = [
  7,  // Aries (1)
  10, // Taurus (2)
  8,  // Gemini (3)
  4,  // Cancer (4)
  10, // Leo (5)
  5,  // Virgo (6)
  7,  // Libra (7)
  8,  // Scorpio (8)
  9,  // Sagittarius (9)
  5,  // Capricorn (10)
  11, // Aquarius (11)
  12, // Pisces (12)
];

/**
 * Classical Graha Gunakaras (Planetary Multipliers) from BPHS Ch. 73:
 * - Sun: 5
 * - Moon: 5
 * - Mars: 8
 * - Mercury: 5
 * - Jupiter: 10
 * - Venus: 7
 * - Saturn: 5
 */
export const GRAHA_GUNAKARAS: Record<AshtakavargaPlanet, number> = {
  [PlanetSymbol.SUN]: 5,
  [PlanetSymbol.MOON]: 5,
  [PlanetSymbol.MARS]: 8,
  [PlanetSymbol.MERCURY]: 5,
  [PlanetSymbol.JUPITER]: 10,
  [PlanetSymbol.VENUS]: 7,
  [PlanetSymbol.SATURN]: 5,
};

/**
 * Calculates Shodhya Pinda (Rashi Pinda + Graha Pinda) for a planet
 * from its final Ekadhipatya-reduced sign points according to BPHS Ch. 73.
 */
export function calculateShodhyaPinda(
  planet: AshtakavargaPlanet,
  ekadhipatyaReduced: number[],
  chart: AstroChart
): ShodhyaPinda {
  // 1. Rashi Pinda: Sum of (reduced points in sign * sign multiplier) across all 12 signs
  let rashiPinda = 0;
  for (let s = 0; s < 12; s++) {
    rashiPinda += ekadhipatyaReduced[s] * RASHI_GUNAKARAS[s];
  }

  // 2. Graha Pinda: For each of the 7 planets, multiply reduced points in its sign by its multiplier
  let grahaPinda = 0;
  for (const p of ASHTAKAVARGA_PLANETS) {
    const pos = chart.planets[p];
    if (pos && pos.rashiIndex >= 1 && pos.rashiIndex <= 12) {
      const signIndex = pos.rashiIndex - 1; // 0-indexed
      const pointsInSign = ekadhipatyaReduced[signIndex];
      grahaPinda += pointsInSign * GRAHA_GUNAKARAS[p];
    }
  }

  // 3. Total Shodhya Pinda (Yoga Pinda)
  const shodhyaPinda = rashiPinda + grahaPinda;

  return {
    planet,
    rashiPinda,
    grahaPinda,
    shodhyaPinda,
  };
}
