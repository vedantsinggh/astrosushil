import { PlanetSymbol } from '../planets/planet.types';
import { ShadbalaPlanet } from './strength.types';

/**
 * Classical Naisargika Bala (Natural Planetary Strength) according to BPHS Ch. 27, V. 14.
 *
 * Fixed constants based on natural luminosity and celestial stature:
 * - Sun: 60.00 (7/7 * 60)
 * - Moon: 51.43 (6/7 * 60)
 * - Venus: 42.86 (5/7 * 60)
 * - Jupiter: 34.29 (4/7 * 60)
 * - Mercury: 25.71 (3/7 * 60)
 * - Mars: 17.14 (2/7 * 60)
 * - Saturn: 8.57 (1/7 * 60)
 */
export const NAISARGIKA_BALA_VALUES: Record<ShadbalaPlanet, number> = {
  [PlanetSymbol.SUN]: 60.0,
  [PlanetSymbol.MOON]: 51.43,
  [PlanetSymbol.VENUS]: 42.86,
  [PlanetSymbol.JUPITER]: 34.29,
  [PlanetSymbol.MERCURY]: 25.71,
  [PlanetSymbol.MARS]: 17.14,
  [PlanetSymbol.SATURN]: 8.57,
};

export function calculateNaisargikaBala(planet: ShadbalaPlanet): number {
  return NAISARGIKA_BALA_VALUES[planet] || 0.0;
}
