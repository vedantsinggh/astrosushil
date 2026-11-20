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

/** Chara-karaka scheme: 7 karakas (Sun..Saturn, default) or 8 karakas (adds Rahu). */
export type CharaKarakaRankingScheme = 'SEVEN_KARAKA' | 'EIGHT_KARAKA';

/** Degrees closer than this are treated as a tie. */
export const CHARA_KARAKA_TIE_TOLERANCE_DEG = 1e-6;

/** Tie-break order: Sun > Moon > Mars > Mercury > Jupiter > Venus > Saturn > Rahu. */
const CHARA_KARAKA_TIE_PRIORITY: readonly PlanetSymbol[] = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
  PlanetSymbol.RAHU,
];

export interface CharaKarakaRankEntry {
  planet: PlanetSymbol;
  /** Degree used for ranking: degree in sign, or 30 − degree for Rahu (8-karaka scheme). */
  effectiveDegree: number;
  /** True when this planet's position was decided by the priority tie-break. */
  tieResolvedByPriority: boolean;
}

/**
 * The single chara-karaka ranking used by both `calculateCharaKarakas` (reports) and
 * `JaiminiCalculator.calculateCharaKarakas` (/astrology/jaimini).
 *
 * - SEVEN_KARAKA (default; decision D-005): Sun..Saturn by degree in sign, descending.
 * - EIGHT_KARAKA: adds Rahu with effective degree 30 − degree in sign (BPHS ch. 32).
 * - Ties (|Δ| ≤ 1e-6°): BPHS ch. 32 compares minutes and seconds, and if still equal treats the
 *   karaka as lost (a sthira karaka substitutes). That substitution is NOT implemented; ties are
 *   resolved deterministically by the fixed priority Sun > Moon > Mars > Mercury > Jupiter >
 *   Venus > Saturn > Rahu and flagged with `tieResolvedByPriority` (provisional – pending client
 *   review).
 */
export function rankCharaKarakas(
  planetDegrees: Partial<Record<PlanetSymbol, number>>,
  scheme: CharaKarakaRankingScheme = 'SEVEN_KARAKA'
): CharaKarakaRankEntry[] {
  const eligible: { planet: PlanetSymbol; effectiveDegree: number }[] = [];
  for (const p of SEVEN_CHARA_PLANETS) {
    const deg = planetDegrees[p];
    if (typeof deg === 'number') eligible.push({ planet: p, effectiveDegree: deg });
  }
  if (scheme === 'EIGHT_KARAKA') {
    const rahuDeg = planetDegrees[PlanetSymbol.RAHU];
    if (typeof rahuDeg === 'number') eligible.push({ planet: PlanetSymbol.RAHU, effectiveDegree: 30 - rahuDeg });
  }

  const tied = new Set<PlanetSymbol>();
  eligible.sort((a, b) => {
    const diff = b.effectiveDegree - a.effectiveDegree;
    if (Math.abs(diff) > CHARA_KARAKA_TIE_TOLERANCE_DEG) return diff;
    tied.add(a.planet);
    tied.add(b.planet);
    return CHARA_KARAKA_TIE_PRIORITY.indexOf(a.planet) - CHARA_KARAKA_TIE_PRIORITY.indexOf(b.planet);
  });

  return eligible.map((e) => ({ ...e, tieResolvedByPriority: tied.has(e.planet) }));
}

/**
 * Calculates classical Parashari 7-Chara Karakas (BPHS Ch. 32).
 *
 * Sorts the 7 physical planets by degree within sign in descending order.
 * In case of identical floating-point degrees, resolves ties deterministically
 * via canonical Vedic planetary priority (Sun > Moon > Mars > Mercury > Jupiter > Venus > Saturn).
 * Uses the shared {@link rankCharaKarakas} ranking.
 *
 * @param planetDegrees Record of planet to its degree inside its sign [0.0, 30.0)
 */
export function calculateCharaKarakas(
  planetDegrees: Partial<Record<PlanetSymbol, number>>
): CharaKarakaAssignment[] {
  const ranked = rankCharaKarakas(planetDegrees, 'SEVEN_KARAKA');
  const assignments: CharaKarakaAssignment[] = [];

  for (let i = 0; i < ranked.length && i < KARAKA_DEFINITIONS.length; i++) {
    const item = ranked[i];
    const def = KARAKA_DEFINITIONS[i];
    assignments.push({
      planet: item.planet,
      karaka: def.type,
      code: def.code,
      degreeInRashi: Number(item.effectiveDegree.toFixed(4)),
      rank: i + 1,
      ...(item.tieResolvedByPriority ? { tieResolvedByPriority: true } : {}),
    });
  }

  return assignments;
}
