import { AstroChart } from '../chart/astro-chart.types';
import { PlanetSymbol } from '../planets/planet.types';
import { getRashiIndex, RASHIS } from '../zodiac/rashi';
import {
  ASHTAKAVARGA_CONTRIBUTORS,
  AshtakavargaContributor,
  AshtakavargaPlanet,
  BAV_EXPECTED_TOTALS,
  BhinnashtakavargaTable,
} from './ashtakavarga.types';
import { BAV_BENEFIC_HOUSES } from './bav-rules';

/**
 * Resolves 1-indexed Rashi index from a sign name (case-insensitive English or Sanskrit).
 */
function resolveRashiIndexFromName(signName?: string): number | undefined {
  if (!signName || typeof signName !== 'string') return undefined;
  const norm = signName.trim().toUpperCase();
  const found = RASHIS.find(
    (r) => r.englishName.toUpperCase() === norm || r.sanskritName.toUpperCase() === norm
  );
  return found ? found.index : undefined;
}

/**
 * Extracts 1-indexed Rashi index (1 = Aries to 12 = Pisces) for an Ashtakavarga contributor.
 * Resilient against varied chart data formats (arrays, case variations, longitude, or rashiIndex).
 */
export function getContributorRashiIndex(
  contributor: AshtakavargaContributor,
  chart: AstroChart
): number {
  if (contributor === AshtakavargaContributor.LAGNA) {
    if (chart.ascendant) {
      if (typeof chart.ascendant.rashiIndex === 'number' && chart.ascendant.rashiIndex >= 1 && chart.ascendant.rashiIndex <= 12) {
        return chart.ascendant.rashiIndex;
      }
      if (typeof chart.ascendant.longitude === 'number') {
        return getRashiIndex(chart.ascendant.longitude);
      }
      const signName = (chart.ascendant as any).sign || (chart.ascendant as any).rashiName;
      const idx = resolveRashiIndexFromName(signName);
      if (idx !== undefined) return idx;
    }
    return 1; // Fallback to Aries
  }

  const contributorStr = contributor.toString().toUpperCase();

  if (chart.planets) {
    // 1. If chart.planets is an array of planet objects
    if (Array.isArray(chart.planets)) {
      const found = (chart.planets as any[]).find((p) => {
        const pName = (p.planet || p.name || p.symbol || '').toString().toUpperCase();
        return pName === contributorStr;
      });
      if (found) {
        if (typeof found.rashiIndex === 'number' && found.rashiIndex >= 1 && found.rashiIndex <= 12) {
          return found.rashiIndex;
        }
        if (typeof found.longitude === 'number') {
          return getRashiIndex(found.longitude);
        }
        const signIdx = resolveRashiIndexFromName(found.sign || found.rashiName);
        if (signIdx !== undefined) return signIdx;
      }
    } else {
      // 2. chart.planets is an object / Record
      const planetSymbol = contributor as unknown as PlanetSymbol;
      const pos =
        chart.planets[planetSymbol] ||
        (chart.planets as any)[contributorStr] ||
        (chart.planets as any)[contributorStr.toLowerCase()];

      if (pos) {
        if (typeof pos.rashiIndex === 'number' && pos.rashiIndex >= 1 && pos.rashiIndex <= 12) {
          return pos.rashiIndex;
        }
        if (typeof pos.longitude === 'number') {
          return getRashiIndex(pos.longitude);
        }
        const signIdx = resolveRashiIndexFromName((pos as any).sign || (pos as any).rashiName);
        if (signIdx !== undefined) return signIdx;
      }

      // Case-insensitive key lookup across chart.planets
      const keys = Object.keys(chart.planets);
      const matchedKey = keys.find((k) => k.toUpperCase() === contributorStr);
      if (matchedKey) {
        const pObj = (chart.planets as any)[matchedKey];
        if (typeof pObj.rashiIndex === 'number' && pObj.rashiIndex >= 1 && pObj.rashiIndex <= 12) {
          return pObj.rashiIndex;
        }
        if (typeof pObj.longitude === 'number') {
          return getRashiIndex(pObj.longitude);
        }
        const signIdx = resolveRashiIndexFromName(pObj.sign || pObj.rashiName);
        if (signIdx !== undefined) return signIdx;
      }
    }
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
