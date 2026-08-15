import { EphemerisProvider } from './ephemeris.interface';
import { PlanetSymbol, RawPlanetaryCoordinates, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';

export class MockEphemerisProvider implements EphemerisProvider {
  private readonly defaultPositions: Record<PlanetSymbol, RawPlanetaryCoordinates>;

  constructor(customPositions?: Partial<Record<PlanetSymbol, RawPlanetaryCoordinates>>) {
    // Default deterministic reference coordinates (Reference Chart #1 - 1990-05-15 09:00 UTC)
    this.defaultPositions = {
      [PlanetSymbol.SUN]: {
        planet: PlanetSymbol.SUN,
        longitude: 50.2541, // ~20° Taurus
        latitude: 0.0,
        distanceAU: 1.011,
        speedLongitude: 0.963,
        isRetrograde: false,
      },
      [PlanetSymbol.MOON]: {
        planet: PlanetSymbol.MOON,
        longitude: 282.1154, // ~12° Capricorn
        latitude: -1.24,
        distanceAU: 0.00257,
        speedLongitude: 13.12,
        isRetrograde: false,
      },
      [PlanetSymbol.MARS]: {
        planet: PlanetSymbol.MARS,
        longitude: 325.412, // ~25° Aquarius
        latitude: -1.12,
        distanceAU: 1.34,
        speedLongitude: 0.72,
        isRetrograde: false,
      },
      [PlanetSymbol.MERCURY]: {
        planet: PlanetSymbol.MERCURY,
        longitude: 35.841, // ~5° Taurus
        latitude: -2.45,
        distanceAU: 0.98,
        speedLongitude: 1.45,
        isRetrograde: false,
      },
      [PlanetSymbol.JUPITER]: {
        planet: PlanetSymbol.JUPITER,
        longitude: 98.452, // ~8° Cancer
        latitude: 0.15,
        distanceAU: 5.42,
        speedLongitude: 0.14,
        isRetrograde: false,
      },
      [PlanetSymbol.VENUS]: {
        planet: PlanetSymbol.VENUS,
        longitude: 12.145, // ~12° Aries
        latitude: 1.82,
        distanceAU: 0.82,
        speedLongitude: 1.18,
        isRetrograde: false,
      },
      [PlanetSymbol.SATURN]: {
        planet: PlanetSymbol.SATURN,
        longitude: 295.612, // ~25° Capricorn
        latitude: -0.45,
        distanceAU: 9.85,
        speedLongitude: 0.04,
        isRetrograde: false,
      },
      [PlanetSymbol.RAHU]: {
        planet: PlanetSymbol.RAHU,
        longitude: 285.342, // ~15° Capricorn
        latitude: 0.0,
        distanceAU: 0.0,
        speedLongitude: -0.053,
        isRetrograde: true,
      },
      [PlanetSymbol.KETU]: {
        planet: PlanetSymbol.KETU,
        longitude: 105.342, // ~15° Cancer (180° opposite Rahu)
        latitude: 0.0,
        distanceAU: 0.0,
        speedLongitude: -0.053,
        isRetrograde: true,
      },
      [PlanetSymbol.URANUS]: {
        planet: PlanetSymbol.URANUS,
        longitude: 278.45,
        latitude: -0.1,
        distanceAU: 19.2,
        speedLongitude: 0.01,
        isRetrograde: false,
      },
      [PlanetSymbol.NEPTUNE]: {
        planet: PlanetSymbol.NEPTUNE,
        longitude: 284.12,
        latitude: 0.4,
        distanceAU: 30.1,
        speedLongitude: 0.008,
        isRetrograde: false,
      },
      [PlanetSymbol.PLUTO]: {
        planet: PlanetSymbol.PLUTO,
        longitude: 226.78,
        latitude: 15.2,
        distanceAU: 29.4,
        speedLongitude: -0.002,
        isRetrograde: true,
      },
      ...customPositions,
    };
  }

  public getProviderName(): string {
    return 'MockEphemerisProvider';
  }

  public getProviderVersion(): string {
    return '1.0.0-mock';
  }

  public getPlanetaryPosition(_planet: PlanetSymbol, _julianDayUT: number): RawPlanetaryCoordinates {
    const coords = this.defaultPositions[_planet];
    if (!coords) {
      throw new Error(`Mock position for planet ${_planet} not found`);
    }
    return { ...coords };
  }

  public getAllPlanetaryPositions(_julianDayUT: number): Record<PlanetSymbol, RawPlanetaryCoordinates> {
    const result: Partial<Record<PlanetSymbol, RawPlanetaryCoordinates>> = {};
    for (const p of MANDATORY_VEDIC_PLANETS) {
      result[p] = this.getPlanetaryPosition(p, _julianDayUT);
    }
    return result as Record<PlanetSymbol, RawPlanetaryCoordinates>;
  }
}
