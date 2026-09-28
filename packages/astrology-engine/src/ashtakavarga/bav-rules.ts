import { PlanetSymbol } from '../planets/planet.types';
import { AshtakavargaContributor, AshtakavargaPlanet } from './ashtakavarga.types';

/**
 * Classical BPHS Chapters 66-72 Benefic Point Tables:
 * Lists the relative house numbers (1 to 12) from each contributor
 * that contribute 1 benefic point (Bindu) to the target planet's Ashtakavarga.
 *
 * Each contributor's own sign is house 1, next sign is house 2, etc.
 */
export const BAV_BENEFIC_HOUSES: Record<
  AshtakavargaPlanet,
  Record<AshtakavargaContributor, readonly number[]>
> = {
  // 1. Sun (Surya) - Total: 48 points
  [PlanetSymbol.SUN]: {
    [AshtakavargaContributor.SATURN]: [1, 2, 4, 7, 8, 9, 10, 11],
    [AshtakavargaContributor.JUPITER]: [5, 6, 9, 11],
    [AshtakavargaContributor.MARS]: [1, 2, 4, 7, 8, 9, 10, 11],
    [AshtakavargaContributor.SUN]: [1, 2, 4, 7, 8, 9, 10, 11],
    [AshtakavargaContributor.VENUS]: [6, 7, 12],
    [AshtakavargaContributor.MERCURY]: [3, 5, 6, 9, 10, 11, 12],
    [AshtakavargaContributor.MOON]: [3, 6, 10, 11],
    [AshtakavargaContributor.LAGNA]: [3, 4, 6, 10, 11, 12],
  },

  // 2. Moon (Chandra) - Total: 49 points
  [PlanetSymbol.MOON]: {
    [AshtakavargaContributor.SATURN]: [3, 5, 6, 11],
    [AshtakavargaContributor.JUPITER]: [1, 4, 7, 8, 10, 11, 12],
    [AshtakavargaContributor.MARS]: [2, 3, 5, 6, 9, 10, 11],
    [AshtakavargaContributor.SUN]: [3, 6, 7, 8, 10, 11],
    [AshtakavargaContributor.VENUS]: [3, 4, 5, 7, 9, 10, 11],
    [AshtakavargaContributor.MERCURY]: [1, 3, 4, 5, 7, 8, 10, 11],
    [AshtakavargaContributor.MOON]: [1, 3, 6, 7, 10, 11],
    [AshtakavargaContributor.LAGNA]: [3, 6, 10, 11],
  },

  // 3. Mars (Mangala) - Total: 39 points
  [PlanetSymbol.MARS]: {
    [AshtakavargaContributor.SATURN]: [1, 4, 7, 8, 9, 10, 11],
    [AshtakavargaContributor.JUPITER]: [6, 10, 11, 12],
    [AshtakavargaContributor.MARS]: [1, 2, 4, 7, 8, 10, 11],
    [AshtakavargaContributor.SUN]: [3, 5, 6, 10, 11],
    [AshtakavargaContributor.VENUS]: [6, 8, 11, 12],
    [AshtakavargaContributor.MERCURY]: [3, 5, 6, 11],
    [AshtakavargaContributor.MOON]: [3, 6, 11],
    [AshtakavargaContributor.LAGNA]: [1, 3, 6, 10, 11],
  },

  // 4. Mercury (Budha) - Total: 54 points
  [PlanetSymbol.MERCURY]: {
    [AshtakavargaContributor.SATURN]: [1, 2, 4, 7, 8, 9, 10, 11],
    [AshtakavargaContributor.JUPITER]: [6, 8, 11, 12],
    [AshtakavargaContributor.MARS]: [1, 2, 4, 7, 8, 9, 10, 11],
    [AshtakavargaContributor.SUN]: [5, 6, 9, 11, 12],
    [AshtakavargaContributor.VENUS]: [1, 2, 3, 4, 5, 8, 9, 11],
    [AshtakavargaContributor.MERCURY]: [1, 3, 5, 6, 9, 10, 11, 12],
    [AshtakavargaContributor.MOON]: [2, 4, 6, 8, 10, 11],
    [AshtakavargaContributor.LAGNA]: [1, 2, 4, 6, 8, 10, 11],
  },

  // 5. Jupiter (Guru) - Total: 56 points
  [PlanetSymbol.JUPITER]: {
    [AshtakavargaContributor.SATURN]: [3, 5, 6, 12],
    [AshtakavargaContributor.JUPITER]: [1, 2, 3, 4, 7, 8, 10, 11],
    [AshtakavargaContributor.MARS]: [1, 2, 4, 7, 8, 10, 11],
    [AshtakavargaContributor.SUN]: [1, 2, 3, 4, 7, 8, 9, 10, 11],
    [AshtakavargaContributor.VENUS]: [2, 5, 6, 9, 10, 11],
    [AshtakavargaContributor.MERCURY]: [1, 2, 4, 5, 6, 9, 10, 11],
    [AshtakavargaContributor.MOON]: [2, 5, 7, 9, 11],
    [AshtakavargaContributor.LAGNA]: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },

  // 6. Venus (Shukra) - Total: 52 points
  [PlanetSymbol.VENUS]: {
    [AshtakavargaContributor.SATURN]: [3, 4, 5, 8, 9, 10, 11],
    [AshtakavargaContributor.JUPITER]: [5, 8, 9, 10, 11],
    [AshtakavargaContributor.MARS]: [3, 5, 6, 9, 11, 12],
    [AshtakavargaContributor.SUN]: [8, 11, 12],
    [AshtakavargaContributor.VENUS]: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    [AshtakavargaContributor.MERCURY]: [3, 5, 6, 9, 11],
    [AshtakavargaContributor.MOON]: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    [AshtakavargaContributor.LAGNA]: [1, 2, 3, 4, 5, 8, 9, 11],
  },

  // 7. Saturn (Shani) - Total: 39 points
  [PlanetSymbol.SATURN]: {
    [AshtakavargaContributor.SATURN]: [3, 5, 6, 11],
    [AshtakavargaContributor.JUPITER]: [5, 6, 11, 12],
    [AshtakavargaContributor.MARS]: [3, 5, 6, 10, 11, 12],
    [AshtakavargaContributor.SUN]: [1, 2, 4, 7, 8, 10, 11],
    [AshtakavargaContributor.VENUS]: [6, 11, 12],
    [AshtakavargaContributor.MERCURY]: [6, 8, 9, 10, 11, 12],
    [AshtakavargaContributor.MOON]: [3, 6, 11],
    [AshtakavargaContributor.LAGNA]: [1, 3, 4, 6, 10, 11],
  },
};
