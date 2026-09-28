import { AstroChart } from '../chart/astro-chart.types';
import { PlanetSymbol } from '../planets/planet.types';
import { AshtakavargaPlanet, ShodhanaTable } from './ashtakavarga.types';

/**
 * The 4 Trikona groups (0-indexed sign indices):
 * - Fire (Agni): Aries (0), Leo (4), Sagittarius (8)
 * - Earth (Bhu): Taurus (1), Virgo (5), Capricorn (9)
 * - Air (Vayu): Gemini (2), Libra (6), Aquarius (10)
 * - Water (Jala): Cancer (3), Scorpio (7), Pisces (11)
 */
export const TRIKONA_GROUPS: [number, number, number][] = [
  [0, 4, 8],   // Signs 1, 5, 9
  [1, 5, 9],   // Signs 2, 6, 10
  [2, 6, 10],  // Signs 3, 7, 11
  [3, 7, 11],  // Signs 4, 8, 12
];

/**
 * Dual sign pairs ruled by Mars, Mercury, Jupiter, Venus, Saturn (0-indexed):
 * - Mars: Aries (0) & Scorpio (7)
 * - Mercury: Gemini (2) & Virgo (5)
 * - Jupiter: Sagittarius (8) & Pisces (11)
 * - Venus: Taurus (1) & Libra (6)
 * - Saturn: Capricorn (9) & Aquarius (10)
 */
export const DUAL_LORD_PAIRS: { planet: PlanetSymbol; signs: [number, number] }[] = [
  { planet: PlanetSymbol.MARS, signs: [0, 7] },
  { planet: PlanetSymbol.MERCURY, signs: [2, 5] },
  { planet: PlanetSymbol.JUPITER, signs: [8, 11] },
  { planet: PlanetSymbol.VENUS, signs: [1, 6] },
  { planet: PlanetSymbol.SATURN, signs: [9, 10] },
];

/**
 * Calculates Trikona Shodhana (Triplicity Reduction) according to BPHS Ch. 73:
 * - If all 3 signs have points: subtract min(p1, p2, p3) from all 3.
 * - If 1 sign has 0 and other 2 have points:
 *     - If equal, both become 0.
 *     - If unequal, subtract the smaller non-zero from both (smaller becomes 0, larger reduced by smaller).
 * - If 2 or 3 signs have 0 points: no reduction.
 */
export function calculateTrikonaShodhana(signList: number[]): number[] {
  const result = [...signList];

  for (const [s1, s2, s3] of TRIKONA_GROUPS) {
    const p1 = result[s1];
    const p2 = result[s2];
    const p3 = result[s3];

    const nonZeroes = [p1, p2, p3].filter((p) => p > 0);

    if (nonZeroes.length === 3) {
      // All 3 signs have points -> subtract min from all three
      const minVal = Math.min(p1, p2, p3);
      result[s1] = p1 - minVal;
      result[s2] = p2 - minVal;
      result[s3] = p3 - minVal;
    } else if (nonZeroes.length === 2) {
      // Exactly 2 signs have points, 1 is zero -> subtract smaller non-zero from both
      const minNonZero = Math.min(...nonZeroes);
      result[s1] = p1 > 0 ? p1 - minNonZero : 0;
      result[s2] = p2 > 0 ? p2 - minNonZero : 0;
      result[s3] = p3 > 0 ? p3 - minNonZero : 0;
    }
    // If nonZeroes.length <= 1, no reduction is made
  }

  return result;
}

/**
 * Calculates Ekadhipatya Shodhana (Dual-Lordship Reduction) according to BPHS Ch. 73.
 * Evaluates the post-Trikona reduced figures for dual signs based on planetary occupancy.
 */
export function calculateEkadhipatyaShodhana(
  trikonaList: number[],
  chart: AstroChart
): number[] {
  const result = [...trikonaList];

  // Determine which signs are occupied by planets in the natal chart
  const occupiedSigns = new Set<number>();
  for (const pos of Object.values(chart.planets)) {
    if (pos && pos.rashiIndex >= 1 && pos.rashiIndex <= 12) {
      occupiedSigns.add(pos.rashiIndex - 1); // 0-indexed
    }
  }

  for (const { signs } of DUAL_LORD_PAIRS) {
    const [sA, sB] = signs;
    const pA = result[sA];
    const pB = result[sB];
    const occA = occupiedSigns.has(sA);
    const occB = occupiedSigns.has(sB);

    // Case 1: Both signs have 0 points
    if (pA === 0 && pB === 0) {
      continue;
    }

    // Case 2: One sign has 0 points, the other has points
    if (pA === 0 && pB > 0) {
      if (!occB) {
        result[sB] = 0; // Unoccupied becomes 0
      }
      continue;
    }
    if (pB === 0 && pA > 0) {
      if (!occA) {
        result[sA] = 0; // Unoccupied becomes 0
      }
      continue;
    }

    // Case 3: Both signs have points (pA > 0 and pB > 0)
    if (occA && occB) {
      // Both occupied -> no reduction
      continue;
    }

    if (!occA && !occB) {
      // Both unoccupied
      if (pA === pB) {
        // Equal points -> both become 0
        result[sA] = 0;
        result[sB] = 0;
      } else {
        // Unequal points -> larger becomes equal to smaller (both become min)
        const minVal = Math.min(pA, pB);
        result[sA] = minVal;
        result[sB] = minVal;
      }
      continue;
    }

    // One occupied, one unoccupied
    const occSign = occA ? sA : sB;
    const unoccSign = occA ? sB : sA;
    const pOcc = result[occSign];
    const pUnocc = result[unoccSign];

    if (pUnocc > pOcc) {
      // Unoccupied has more points -> excess removed, becomes equal to occupied
      result[unoccSign] = pOcc;
    } else {
      // Unoccupied has less or equal points -> eliminated completely
      result[unoccSign] = 0;
    }
  }

  return result;
}

/**
 * Calculates complete Shodhana (Trikona + Ekadhipatya reductions) for a planet.
 */
export function calculateShodhana(
  planet: AshtakavargaPlanet,
  signList: number[],
  chart: AstroChart
): ShodhanaTable {
  const trikonaReduced = calculateTrikonaShodhana(signList);
  const ekadhipatyaReduced = calculateEkadhipatyaShodhana(trikonaReduced, chart);

  const totalTrikonaPoints = trikonaReduced.reduce((acc, val) => acc + val, 0);
  const totalEkadhipatyaPoints = ekadhipatyaReduced.reduce((acc, val) => acc + val, 0);

  return {
    planet,
    trikonaReduced,
    ekadhipatyaReduced,
    totalTrikonaPoints,
    totalEkadhipatyaPoints,
  };
}
