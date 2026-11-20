import { EphemerisProvider } from './ephemeris.interface';
import { PlanetSymbol, RawPlanetaryCoordinates, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';

export class MockEphemerisProvider implements EphemerisProvider {
  private readonly defaultPositions: Record<PlanetSymbol, RawPlanetaryCoordinates>;

  constructor(customPositions?: Partial<Record<PlanetSymbol, RawPlanetaryCoordinates>>) {
    // Default deterministic reference coordinates: REF_CHART_001 (1990-05-15 09:00 UT, JD 2448026.875).
    // TROPICAL apparent geocentric ecliptic-of-date values from NASA/JPL Horizons; Rahu/Ketu are the
    // Meeus (eq. 47.7) mean node. Source query and tolerances are documented in
    // tests/fixtures/reference-charts.ts (REF_CHART_001_SOURCE). The engine subtracts the ayanamsa.
    // NOTE: these positions are returned for ANY Julian Day; they are only real-sky for that instant.
    this.defaultPositions = {
      [PlanetSymbol.SUN]: {
        planet: PlanetSymbol.SUN,
        longitude: 54.2755655,
        latitude: -0.0000283,
        distanceAU: 1.0108726,
        speedLongitude: 0.9642616,
        isRetrograde: false,
      },
      [PlanetSymbol.MOON]: {
        planet: PlanetSymbol.MOON,
        longitude: 295.6195136,
        latitude: -1.2783803,
        distanceAU: 0.0026465,
        speedLongitude: 12.3288368,
        isRetrograde: false,
      },
      [PlanetSymbol.MARS]: {
        planet: PlanetSymbol.MARS,
        longitude: 348.2409959,
        latitude: -1.7287412,
        distanceAU: 1.4573563,
        speedLongitude: 0.7427622,
        isRetrograde: false,
      },
      [PlanetSymbol.MERCURY]: {
        planet: PlanetSymbol.MERCURY,
        longitude: 38.0280756,
        latitude: -2.495234,
        distanceAU: 0.6008284,
        speedLongitude: -0.1296287,
        isRetrograde: true,
      },
      [PlanetSymbol.JUPITER]: {
        planet: PlanetSymbol.JUPITER,
        longitude: 99.5180914,
        latitude: 0.1424267,
        distanceAU: 5.8615054,
        speedLongitude: 0.1890378,
        isRetrograde: false,
      },
      [PlanetSymbol.VENUS]: {
        planet: PlanetSymbol.VENUS,
        longitude: 12.6757335,
        latitude: -1.7932409,
        distanceAU: 1.037062,
        speedLongitude: 1.1404351,
        isRetrograde: false,
      },
      [PlanetSymbol.SATURN]: {
        planet: PlanetSymbol.SATURN,
        longitude: 295.2515022,
        latitude: 0.1552388,
        distanceAU: 9.4864721,
        speedLongitude: -0.0167064,
        isRetrograde: true,
      },
      [PlanetSymbol.RAHU]: {
        planet: PlanetSymbol.RAHU,
        longitude: 311.3425338,
        latitude: 0.0,
        distanceAU: 0.0,
        speedLongitude: -0.053,
        isRetrograde: true,
      },
      [PlanetSymbol.KETU]: {
        planet: PlanetSymbol.KETU,
        longitude: 131.3425338,
        latitude: 0.0,
        distanceAU: 0.0,
        speedLongitude: -0.053,
        isRetrograde: true,
      },
      [PlanetSymbol.URANUS]: {
        planet: PlanetSymbol.URANUS,
        longitude: 279.1869306,
        latitude: -0.3147087,
        distanceAU: 18.6748915,
        speedLongitude: -0.0244994,
        isRetrograde: true,
      },
      [PlanetSymbol.NEPTUNE]: {
        planet: PlanetSymbol.NEPTUNE,
        longitude: 284.3547057,
        latitude: 0.8724093,
        distanceAU: 29.5486448,
        speedLongitude: -0.0146672,
        isRetrograde: true,
      },
      [PlanetSymbol.PLUTO]: {
        planet: PlanetSymbol.PLUTO,
        longitude: 226.1708513,
        latitude: 15.9918746,
        distanceAU: 28.6947622,
        speedLongitude: -0.0277212,
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
