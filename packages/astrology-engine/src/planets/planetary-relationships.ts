import { PlanetSymbol } from './planet.types';
import {
  NaturalRelationship,
  TemporalRelationship,
  CompoundRelationship,
} from './planetary-intelligence.types';

/**
 * Classical Natural (Naisargika) Relationships according to Brihat Parashara Hora Shastra (BPHS Ch. 15).
 */
const NAISARGIKA_RELATIONSHIPS: Record<
  PlanetSymbol,
  { friends: PlanetSymbol[]; enemies: PlanetSymbol[] }
> = {
  [PlanetSymbol.SUN]: {
    friends: [PlanetSymbol.MOON, PlanetSymbol.MARS, PlanetSymbol.JUPITER],
    enemies: [PlanetSymbol.VENUS, PlanetSymbol.SATURN, PlanetSymbol.RAHU, PlanetSymbol.KETU],
  },
  [PlanetSymbol.MOON]: {
    friends: [PlanetSymbol.SUN, PlanetSymbol.MERCURY],
    enemies: [PlanetSymbol.RAHU, PlanetSymbol.KETU],
  },
  [PlanetSymbol.MARS]: {
    friends: [PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.JUPITER],
    enemies: [PlanetSymbol.MERCURY, PlanetSymbol.RAHU, PlanetSymbol.KETU],
  },
  [PlanetSymbol.MERCURY]: {
    friends: [PlanetSymbol.SUN, PlanetSymbol.VENUS],
    enemies: [PlanetSymbol.MOON, PlanetSymbol.RAHU, PlanetSymbol.KETU],
  },
  [PlanetSymbol.JUPITER]: {
    friends: [PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.MARS],
    enemies: [PlanetSymbol.MERCURY, PlanetSymbol.VENUS, PlanetSymbol.RAHU, PlanetSymbol.KETU],
  },
  [PlanetSymbol.VENUS]: {
    friends: [PlanetSymbol.MERCURY, PlanetSymbol.SATURN],
    enemies: [PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.RAHU, PlanetSymbol.KETU],
  },
  [PlanetSymbol.SATURN]: {
    friends: [PlanetSymbol.MERCURY, PlanetSymbol.VENUS],
    enemies: [PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.MARS, PlanetSymbol.RAHU, PlanetSymbol.KETU],
  },
  [PlanetSymbol.RAHU]: {
    friends: [PlanetSymbol.MERCURY, PlanetSymbol.VENUS, PlanetSymbol.SATURN],
    enemies: [PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.MARS, PlanetSymbol.KETU],
  },
  [PlanetSymbol.KETU]: {
    friends: [PlanetSymbol.MARS, PlanetSymbol.VENUS, PlanetSymbol.SATURN],
    enemies: [PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.RAHU],
  },
  // Outer planets (defaults)
  [PlanetSymbol.URANUS]: { friends: [], enemies: [] },
  [PlanetSymbol.NEPTUNE]: { friends: [], enemies: [] },
  [PlanetSymbol.PLUTO]: { friends: [], enemies: [] },
};

/**
 * Returns the Natural (Naisargika) relationship of planet1 toward planet2.
 */
export function getNaturalRelationship(planet1: PlanetSymbol, planet2: PlanetSymbol): NaturalRelationship {
  if (planet1 === planet2) return 'NEUTRAL';
  const entry = NAISARGIKA_RELATIONSHIPS[planet1];
  if (!entry) return 'NEUTRAL';
  if (entry.friends.includes(planet2)) return 'FRIEND';
  if (entry.enemies.includes(planet2)) return 'ENEMY';
  return 'NEUTRAL';
}

/**
 * Calculates Temporal (Tatkalika) relationship of planet1 toward planet2 based on sign distance.
 * Rule (BPHS Ch. 15, V. 10-11):
 * Planets in 2nd, 3rd, 4th, 10th, 11th, and 12th signs from a planet become its temporal friends.
 * Planets in 1st, 5th, 6th, 7th, 8th, and 9th signs from it become its temporal enemies.
 *
 * @param rashiIndex1 Sign index of source planet (1 to 12)
 * @param rashiIndex2 Sign index of target planet (1 to 12)
 */
export function getTemporalRelationship(rashiIndex1: number, rashiIndex2: number): TemporalRelationship {
  const distance = ((rashiIndex2 - rashiIndex1 + 12) % 12) + 1;
  const friendlyDistances = [2, 3, 4, 10, 11, 12];
  return friendlyDistances.includes(distance) ? 'FRIEND' : 'ENEMY';
}

/**
 * Calculates Compound 5-Fold (Panchadha Sambandha) relationship between two planets.
 * Combines Natural (Naisargika) + Temporal (Tatkalika):
 * - Friend + Friend = Great Friend (Adhi Mitra)
 * - Friend + Enemy = Neutral (Sama)
 * - Neutral + Friend = Friend (Mitra)
 * - Neutral + Enemy = Enemy (Shatru)
 * - Enemy + Friend = Neutral (Sama)
 * - Enemy + Enemy = Great Enemy (Adhi Shatru)
 */
export function getCompoundRelationship(
  natural: NaturalRelationship,
  temporal: TemporalRelationship
): CompoundRelationship {
  const naturalScore = natural === 'FRIEND' ? 1 : natural === 'ENEMY' ? -1 : 0;
  const temporalScore = temporal === 'FRIEND' ? 1 : -1;
  const combined = naturalScore + temporalScore;

  if (combined >= 2) return 'GREAT_FRIEND';
  if (combined === 1) return 'FRIEND';
  if (combined === 0) return 'NEUTRAL';
  if (combined === -1) return 'ENEMY';
  return 'GREAT_ENEMY';
}
