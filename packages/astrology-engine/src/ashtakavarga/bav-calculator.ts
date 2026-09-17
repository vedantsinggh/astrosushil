import { AstroChart } from '../chart/astro-chart.types';
import { PlanetSymbol } from '../planets/planet.types';
import { getRashiIndex } from '../zodiac/rashi';
import {
  ASHTAKAVARGA_CONTRIBUTORS,
  AshtakavargaContributor,
  AshtakavargaPlanet,
  BAV_EXPECTED_TOTALS,
  BhinnashtakavargaTable,
} from './ashtakavarga.types';
import { BAV_BENEFIC_HOUSES } from './bav-rules';

/**
 * Extracts 1-indexed Rashi index (1 = Aries to 12 = Pisces) for an Ashtakavarga contributor.
 */
export function getContributorRashiIndex(
  contributor: AshtakavargaContributor,
  chart: AstroChart
): number {
  if (contributor === AshtakavargaContributor.LAGNA) {
    if (chart.ascendant) {
      return chart.ascendant.rashiIndex ?? getRashiIndex(chart.ascendant.longitude);
    }
    return 1; // Fallback to Aries
  }

  const planetSymbol = contributor as unknown as PlanetSymbol;
  const pos = chart.planets[planetSymbol];
  if (pos) {
    return pos.rashiIndex ?? getRashiIndex(pos.longitude);
  }
  return 1;
}

/**
 * Calculates Bhinnashtakavarga (BAV) and Prastara Ashtakavarga matrix
 * for a single planet according to classical BPHS rules.
 */
export function calculateBhinnashtakavarga(
  planet: AshtakavargaPlanet,
  chart: AstroChart
): BhinnashtakavargaTable {
  const rules = BAV_BENEFIC_HOUSES[planet];
  const signList: number[] = new Array(12).fill(0);
  const prastara: Record<AshtakavargaContributor, number[]> = {
    [AshtakavargaContributor.SATURN]: new Array(12).fill(0),
    [AshtakavargaContributor.JUPITER]: new Array(12).fill(0),
    [AshtakavargaContributor.MARS]: new Array(12).fill(0),
    [AshtakavargaContributor.SUN]: new Array(12).fill(0),
    [AshtakavargaContributor.VENUS]: new Array(12).fill(0),
    [AshtakavargaContributor.MERCURY]: new Array(12).fill(0),
    [AshtakavargaContributor.MOON]: new Array(12).fill(0),
    [AshtakavargaContributor.LAGNA]: new Array(12).fill(0),
  };

  for (const contributor of ASHTAKAVARGA_CONTRIBUTORS) {
    const contributorRashi = getContributorRashiIndex(contributor, chart);
    const beneficHouses = rules[contributor];

    for (const house of beneficHouses) {
      // Relative count from contributor's sign (1 = same sign, 2 = next, etc.)
      const targetRashiIndex = ((contributorRashi - 1 + (house - 1)) % 12) + 1;
      const arrayIndex = targetRashiIndex - 1; // 0-indexed [0, 11]

      prastara[contributor][arrayIndex] = 1;
      signList[arrayIndex] += 1;
    }
  }

  const signs: Record<number, number> = {};
  for (let i = 0; i < 12; i++) {
    signs[i + 1] = signList[i];
  }

  const totalPoints = signList.reduce((acc, val) => acc + val, 0);

  // Invariant assertion: every planet's BAV total must strictly match its classical expectation
  const expectedTotal = BAV_EXPECTED_TOTALS[planet];
  if (totalPoints !== expectedTotal) {
    throw new Error(
      `Ashtakavarga invariant violation: ${planet} BAV total is ${totalPoints}, expected ${expectedTotal}`
    );
  }

  return {
    planet,
    signs,
    signList,
    prastara,
    totalPoints,
  };
}
