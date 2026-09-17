import { PlanetSymbol } from '../planets/planet.types';
import { MrityuBhagaStatus, MrityuBhagaReport } from './special-points.types';

/**
 * Classical Mrityu Bhaga (Fatal Degrees) per Rashi (index 1 to 12) according to
 * Jataka Parijata and Brihat Parashara Hora Shastra.
 */
export const MRITYU_BHAGA_TABLE: Record<PlanetSymbol | 'ASCENDANT', number[]> = {
  [PlanetSymbol.SUN]: [20, 9, 12, 6, 8, 24, 16, 17, 22, 2, 3, 23],
  [PlanetSymbol.MOON]: [26, 12, 13, 25, 24, 11, 26, 14, 13, 25, 5, 12],
  [PlanetSymbol.MARS]: [19, 28, 25, 23, 29, 28, 14, 21, 2, 15, 11, 6],
  [PlanetSymbol.MERCURY]: [15, 14, 13, 12, 8, 18, 20, 10, 21, 22, 7, 5],
  [PlanetSymbol.JUPITER]: [19, 29, 12, 27, 6, 4, 13, 10, 17, 11, 15, 28],
  [PlanetSymbol.VENUS]: [28, 15, 11, 17, 10, 13, 4, 6, 27, 12, 29, 19],
  [PlanetSymbol.SATURN]: [10, 4, 7, 9, 12, 16, 3, 18, 28, 14, 13, 15],
  [PlanetSymbol.RAHU]: [14, 13, 12, 11, 24, 23, 24, 11, 10, 8, 18, 20],
  [PlanetSymbol.KETU]: [8, 18, 20, 10, 21, 22, 7, 5, 14, 13, 12, 11],
  ASCENDANT: [1, 9, 22, 22, 25, 2, 4, 23, 18, 20, 24, 10],
  [PlanetSymbol.URANUS]: [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  [PlanetSymbol.NEPTUNE]: [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  [PlanetSymbol.PLUTO]: [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
};

export function evaluateMrityuBhaga(
  planetKey: PlanetSymbol | 'ASCENDANT',
  rashiIndex: number, // 1 to 12
  degreeInRashi: number, // [0, 30)
  orbDegrees: number = 1.0
): MrityuBhagaStatus {
  const table = MRITYU_BHAGA_TABLE[planetKey];
  const exactFatalDegree = table ? table[rashiIndex - 1] ?? 15 : 15;
  const deltaDegree = Math.abs(degreeInRashi - exactFatalDegree);
  const isWithinOrb = deltaDegree <= orbDegrees;

  let severity: 'EXACT' | 'CRITICAL' | 'MODERATE' | 'NONE' = 'NONE';
  if (deltaDegree <= 0.25) {
    severity = 'EXACT';
  } else if (deltaDegree <= 0.75) {
    severity = 'CRITICAL';
  } else if (isWithinOrb) {
    severity = 'MODERATE';
  }

  return {
    planet: planetKey,
    exactFatalDegree,
    currentDegreeInRashi: Number(degreeInRashi.toFixed(4)),
    deltaDegree: Number(deltaDegree.toFixed(4)),
    isWithinOrb,
    orbDegrees,
    severity,
  };
}

export function evaluateAllMrityuBhaga(
  planets: Record<string, { rashiIndex: number; degreeInRashi: number }>,
  ascendant: { rashiIndex: number; degreeInRashi: number },
  orbDegrees: number = 1.0
): MrityuBhagaReport {
  const statuses: MrityuBhagaStatus[] = [];

  // Ascendant
  statuses.push(evaluateMrityuBhaga('ASCENDANT', ascendant.rashiIndex, ascendant.degreeInRashi, orbDegrees));

  // Planets
  for (const [symStr, pos] of Object.entries(planets)) {
    if (!pos) continue;
    const sym = symStr as PlanetSymbol;
    if (MRITYU_BHAGA_TABLE[sym]) {
      statuses.push(evaluateMrityuBhaga(sym, pos.rashiIndex, pos.degreeInRashi, orbDegrees));
    }
  }

  const afflicted = statuses.filter((s) => s.isWithinOrb).map((s) => s.planet);

  return {
    points: statuses,
    hasAnyAfflicted: afflicted.length > 0,
    afflictedPlanets: afflicted,
  };
}
