import {
  BaladiAvastha,
  JagratadiAvastha,
  PlanetaryAvastha,
  ExtendedPlanetaryDignity,
} from './planetary-intelligence.types';

/**
 * Calculates Baladi Avastha (state based on infancy to death) according to BPHS Ch. 45.
 *
 * Each sign is divided into 5 states of 6 degrees each:
 * - Odd signs:
 *   0° - 6°: Bala (Infant, 25% strength)
 *   6° - 12°: Kumara (Youth, 50% strength)
 *   12° - 18°: Yuva (Adult/Prime, 100% strength)
 *   18° - 24°: Vriddha (Old Age, negligible ~10% strength)
 *   24° - 30°: Mrita (Deceased/Inert, 0% strength)
 * - Even signs:
 *   Reversed order (Mrita -> Vriddha -> Yuva -> Kumara -> Bala)
 */
export function calculateBaladiAvastha(
  rashiIndex: number,
  degreeInRashi: number
): { baladi: BaladiAvastha; baladiStrengthPercent: number } {
  const isOdd = rashiIndex % 2 !== 0;
  const deg = Math.min(29.9999, Math.max(0, degreeInRashi));

  if (isOdd) {
    if (deg < 6) return { baladi: 'BALA', baladiStrengthPercent: 25 };
    if (deg < 12) return { baladi: 'KUMARA', baladiStrengthPercent: 50 };
    if (deg < 18) return { baladi: 'YUVA', baladiStrengthPercent: 100 };
    if (deg < 24) return { baladi: 'VRIDDHA', baladiStrengthPercent: 10 };
    return { baladi: 'MRITA', baladiStrengthPercent: 0 };
  } else {
    if (deg < 6) return { baladi: 'MRITA', baladiStrengthPercent: 0 };
    if (deg < 12) return { baladi: 'VRIDDHA', baladiStrengthPercent: 10 };
    if (deg < 18) return { baladi: 'YUVA', baladiStrengthPercent: 100 };
    if (deg < 24) return { baladi: 'KUMARA', baladiStrengthPercent: 50 };
    return { baladi: 'BALA', baladiStrengthPercent: 25 };
  }
}

/**
 * Calculates Jagratadi Avastha (Alertness state) based on planetary dignity.
 *
 * - Jagrata (Awake): In exaltation, moolatrikona, or own sign.
 * - Swapna (Dreaming): In friendly or neutral signs.
 * - Sushupti (Sleeping): In enemy signs or debilitation.
 */
export function calculateJagratadiAvastha(dignity: ExtendedPlanetaryDignity): JagratadiAvastha {
  switch (dignity) {
    case 'EXALTED':
    case 'MOOLATRIKONA':
    case 'OWN_SIGN':
      return 'JAGRATA';

    case 'GREAT_FRIEND':
    case 'FRIEND':
    case 'NEUTRAL':
      return 'SWAPNA';

    case 'ENEMY':
    case 'GREAT_ENEMY':
    case 'DEBILITATED':
      return 'SUSHUPTI';

    default:
      return 'SWAPNA';
  }
}

/**
 * Computes consolidated PlanetaryAvastha.
 */
export function calculatePlanetaryAvastha(
  rashiIndex: number,
  degreeInRashi: number,
  dignity: ExtendedPlanetaryDignity
): PlanetaryAvastha {
  const baladiInfo = calculateBaladiAvastha(rashiIndex, degreeInRashi);
  const jagratadi = calculateJagratadiAvastha(dignity);

  return {
    baladi: baladiInfo.baladi,
    baladiStrengthPercent: baladiInfo.baladiStrengthPercent,
    jagratadi,
  };
}
