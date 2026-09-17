import { PlanetSymbol } from './planet.types';
import {
  CharaKarakaType,
  CharaKarakaCode,
  CharaKarakaAssignment,
} from './planetary-intelligence.types';

const KARAKA_DEFINITIONS: { type: CharaKarakaType; code: CharaKarakaCode }[] = [
  { type: 'ATMAKARAKA', code: 'AK' },
  { type: 'AMATYAKARAKA', code: 'AmK' },
  { type: 'BHRATRIKARAKA', code: 'BK' },
  { type: 'MATRIKARAKA', code: 'MK' },
  { type: 'PUTRAKARAKA', code: 'PK' },
  { type: 'GNATIKARAKA', code: 'GK' },
  { type: 'DARAKARAKA', code: 'DK' },
];

const SEVEN_CHARA_PLANETS = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
] as const;

/**
 * Calculates classical Parashari 7-Chara Karakas (BPHS Ch. 32).
 *
 * Sorts the 7 physical planets by degree within sign in descending order.
 * In case of identical floating-point degrees, resolves ties deterministically
 * via canonical Vedic planetary priority (Sun > Moon > Mars > Mercury > Jupiter > Venus > Saturn).
 *
 * @param planetDegrees Record of planet to its degree inside its sign [0.0, 30.0)
 */
export function calculateCharaKarakas(
  planetDegrees: Partial<Record<PlanetSymbol, number>>
): CharaKarakaAssignment[] {
  const eligible: { planet: PlanetSymbol; degreeInRashi: number }[] = [];

  for (const p of SEVEN_CHARA_PLANETS) {
    const deg = planetDegrees[p];
    if (typeof deg === 'number') {
      eligible.push({ planet: p, degreeInRashi: deg });
    }
  }

  // Sort descending by degreeInRashi
  eligible.sort((a, b) => {
    const diff = b.degreeInRashi - a.degreeInRashi;
    if (Math.abs(diff) > 1e-6) {
      return diff;
    }
    // Deterministic tie-breaking by classical planet priority
    const priority = [
      PlanetSymbol.SUN,
      PlanetSymbol.MOON,
      PlanetSymbol.MARS,
      PlanetSymbol.MERCURY,
      PlanetSymbol.JUPITER,
      PlanetSymbol.VENUS,
      PlanetSymbol.SATURN,
    ];
    return priority.indexOf(a.planet) - priority.indexOf(b.planet);
  });

  const assignments: CharaKarakaAssignment[] = [];

  for (let i = 0; i < eligible.length && i < KARAKA_DEFINITIONS.length; i++) {
    const item = eligible[i];
    const def = KARAKA_DEFINITIONS[i];
    assignments.push({
      planet: item.planet,
      karaka: def.type,
      code: def.code,
      degreeInRashi: Number(item.degreeInRashi.toFixed(4)),
      rank: i + 1,
    });
  }

  return assignments;
}
