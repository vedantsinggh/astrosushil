import { PlanetSymbol } from './planet.types';
import { ExtendedPlanetaryDignity } from './planetary-intelligence.types';
import {
  getNaturalRelationship,
  getTemporalRelationship,
  getCompoundRelationship,
} from './planetary-relationships';
import { RASHIS } from '../zodiac/rashi';

interface ExaltationDebilitationSpec {
  exaltSign: number; // 1 to 12
  deepExaltDegree: number; // 0 to 30
  debilitateSign: number; // 1 to 12
  deepDebilitateDegree: number; // 0 to 30
}

const EXALTATION_SPECS: Partial<Record<PlanetSymbol, ExaltationDebilitationSpec>> = {
  [PlanetSymbol.SUN]: { exaltSign: 1, deepExaltDegree: 10, debilitateSign: 7, deepDebilitateDegree: 10 },
  [PlanetSymbol.MOON]: { exaltSign: 2, deepExaltDegree: 3, debilitateSign: 8, deepDebilitateDegree: 3 },
  [PlanetSymbol.MARS]: { exaltSign: 10, deepExaltDegree: 28, debilitateSign: 4, deepDebilitateDegree: 28 },
  [PlanetSymbol.MERCURY]: { exaltSign: 6, deepExaltDegree: 15, debilitateSign: 12, deepDebilitateDegree: 15 },
  [PlanetSymbol.JUPITER]: { exaltSign: 4, deepExaltDegree: 5, debilitateSign: 10, deepDebilitateDegree: 5 },
  [PlanetSymbol.VENUS]: { exaltSign: 12, deepExaltDegree: 27, debilitateSign: 6, deepDebilitateDegree: 27 },
  [PlanetSymbol.SATURN]: { exaltSign: 7, deepExaltDegree: 20, debilitateSign: 1, deepDebilitateDegree: 20 },
  [PlanetSymbol.RAHU]: { exaltSign: 2, deepExaltDegree: 15, debilitateSign: 8, deepDebilitateDegree: 15 },
  [PlanetSymbol.KETU]: { exaltSign: 8, deepExaltDegree: 15, debilitateSign: 2, deepDebilitateDegree: 15 },
};

export function isExalted(planet: PlanetSymbol, rashiIndex: number): boolean {
  const spec = EXALTATION_SPECS[planet];
  return spec ? spec.exaltSign === rashiIndex : false;
}

export function isDebilitated(planet: PlanetSymbol, rashiIndex: number): boolean {
  const spec = EXALTATION_SPECS[planet];
  return spec ? spec.debilitateSign === rashiIndex : false;
}

/**
 * Classical Moolatrikona zones according to BPHS Ch. 3.
 */
export function isMoolatrikona(planet: PlanetSymbol, rashiIndex: number, degreeInRashi: number): boolean {
  const deg = degreeInRashi;
  switch (planet) {
    case PlanetSymbol.SUN:
      // Leo 0° to 20°
      return rashiIndex === 5 && deg >= 0 && deg <= 20;
    case PlanetSymbol.MOON:
      // Taurus 3° to 30° (0-3° is exaltation)
      return rashiIndex === 2 && deg > 3 && deg <= 30;
    case PlanetSymbol.MARS:
      // Aries 0° to 12°
      return rashiIndex === 1 && deg >= 0 && deg <= 12;
    case PlanetSymbol.MERCURY:
      // Virgo 15° to 20° (0-15° is exaltation)
      return rashiIndex === 6 && deg > 15 && deg <= 20;
    case PlanetSymbol.JUPITER:
      // Sagittarius 0° to 10°
      return rashiIndex === 9 && deg >= 0 && deg <= 10;
    case PlanetSymbol.VENUS:
      // Libra 0° to 15°
      return rashiIndex === 7 && deg >= 0 && deg <= 15;
    case PlanetSymbol.SATURN:
      // Aquarius 0° to 20°
      return rashiIndex === 11 && deg >= 0 && deg <= 20;
    default:
      return false;
  }
}

/**
 * Checks whether the planet occupies its own ruling sign outside Moolatrikona.
 */
export function isOwnSign(planet: PlanetSymbol, rashiIndex: number, degreeInRashi?: number): boolean {
  if (typeof degreeInRashi === 'number' && isMoolatrikona(planet, rashiIndex, degreeInRashi)) {
    return false;
  }
  switch (planet) {
    case PlanetSymbol.SUN:
      return rashiIndex === 5;
    case PlanetSymbol.MOON:
      return rashiIndex === 4;
    case PlanetSymbol.MARS:
      return rashiIndex === 1 || rashiIndex === 8;
    case PlanetSymbol.MERCURY:
      return rashiIndex === 3 || rashiIndex === 6;
    case PlanetSymbol.JUPITER:
      return rashiIndex === 9 || rashiIndex === 12;
    case PlanetSymbol.VENUS:
      return rashiIndex === 2 || rashiIndex === 7;
    case PlanetSymbol.SATURN:
      return rashiIndex === 10 || rashiIndex === 11;
    case PlanetSymbol.RAHU:
      return rashiIndex === 11; // Aquarius
    case PlanetSymbol.KETU:
      return rashiIndex === 8;  // Scorpio
    default:
      return false;
  }
}

/**
 * Returns the ruling planet symbol for a given Rashi index (1 to 12).
 */
export function getRashiRuler(rashiIndex: number): PlanetSymbol {
  const rashi = RASHIS[rashiIndex - 1];
  return (rashi ? rashi.ruler : 'MARS') as PlanetSymbol;
}

/**
 * Comprehensive 5-Fold Planetary Dignity Calculator.
 *
 * Hierarchy:
 * 1. Exalted (Uchcha)
 * 2. Debilitated (Neecha)
 * 3. Moolatrikona
 * 4. Own Sign (Sva Rashi)
 * 5. 5-Fold Compound Relationship (Panchadha Sambandha with sign ruler):
 *    - Great Friend (Adhi Mitra)
 *    - Friend (Mitra)
 *    - Neutral (Sama)
 *    - Enemy (Shatru)
 *    - Great Enemy (Adhi Shatru)
 */
export function calculatePlanetaryDignity(
  planet: PlanetSymbol,
  rashiIndex: number,
  degreeInRashi: number,
  planetPositions?: Partial<Record<PlanetSymbol, { rashiIndex: number }>>
): ExtendedPlanetaryDignity {
  // 1. Exaltation
  if (isExalted(planet, rashiIndex)) {
    // For Mercury, 0-15° in Virgo is Exalted, 15-20° is Moolatrikona, 20-30° is Own Sign
    if (planet === PlanetSymbol.MERCURY && rashiIndex === 6) {
      if (degreeInRashi <= 15) return 'EXALTED';
      if (degreeInRashi <= 20) return 'MOOLATRIKONA';
      return 'OWN_SIGN';
    }
    return 'EXALTED';
  }

  // 2. Debilitation
  if (isDebilitated(planet, rashiIndex)) {
    return 'DEBILITATED';
  }

  // 3. Moolatrikona
  if (isMoolatrikona(planet, rashiIndex, degreeInRashi)) {
    return 'MOOLATRIKONA';
  }

  // 4. Own Sign
  if (isOwnSign(planet, rashiIndex, degreeInRashi)) {
    return 'OWN_SIGN';
  }

  // 5. Compound 5-Fold Relationship with Sign Ruler
  const signRuler = getRashiRuler(rashiIndex);
  const natural = getNaturalRelationship(planet, signRuler);

  if (planetPositions && planetPositions[signRuler]) {
    const rulerRashiIndex = planetPositions[signRuler]!.rashiIndex;
    const temporal = getTemporalRelationship(rashiIndex, rulerRashiIndex);
    const compound = getCompoundRelationship(natural, temporal);
    return compound;
  }

  // Fallback to natural relationship when chart positions are not supplied
  if (natural === 'FRIEND') return 'FRIEND';
  if (natural === 'ENEMY') return 'ENEMY';
  return 'NEUTRAL';
}
