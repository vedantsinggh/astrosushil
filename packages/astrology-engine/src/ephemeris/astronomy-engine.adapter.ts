import { EphemerisProvider } from './ephemeris.interface';
import { PlanetSymbol, RawPlanetaryCoordinates, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { EphemerisProviderError } from '../errors/astrology.error';

/**
 * Adapter integrating Don Cross's astronomy-engine (MIT Licensed local ephemeris)
 * into our EphemerisProvider abstraction layer.
 */
export class AstronomyEngineAdapter implements EphemerisProvider {
  private astronomyLib: any = null;

  constructor() {
    try {
      // Lazy-load astronomy-engine if available
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.astronomyLib = require('astronomy-engine');
    } catch {
      this.astronomyLib = null;
    }
  }

  public getProviderName(): string {
    return 'AstronomyEngineAdapter (astronomy-engine)';
  }

  public getProviderVersion(): string {
    return '2.1.19-mit';
  }

  /**
   * Maps internal PlanetSymbol to astronomy-engine Planet enum/string
   */
  private mapPlanetSymbolToBody(planet: PlanetSymbol): string {
    switch (planet) {
      case PlanetSymbol.SUN:
        return 'Sun';
      case PlanetSymbol.MOON:
        return 'Moon';
      case PlanetSymbol.MERCURY:
        return 'Mercury';
      case PlanetSymbol.VENUS:
        return 'Venus';
      case PlanetSymbol.MARS:
        return 'Mars';
      case PlanetSymbol.JUPITER:
        return 'Jupiter';
      case PlanetSymbol.SATURN:
        return 'Saturn';
      case PlanetSymbol.URANUS:
        return 'Uranus';
      case PlanetSymbol.NEPTUNE:
        return 'Neptune';
      case PlanetSymbol.PLUTO:
        return 'Pluto';
      default:
        throw new EphemerisProviderError(`Planet ${planet} body mapping not supported by astronomy-engine`);
    }
  }

  public getPlanetaryPosition(planet: PlanetSymbol, julianDayUT: number): RawPlanetaryCoordinates {
    // If astronomy-engine library is present, compute via VSOP87/ELP2000 celestial mechanics
    if (this.astronomyLib) {
      try {
        const dateObj = new Date((julianDayUT - 2440587.5) * 86400000);
        const astroTime = this.astronomyLib.MakeTime(dateObj);

        if (planet === PlanetSymbol.RAHU || planet === PlanetSymbol.KETU) {
          // Calculate Lunar Node (Mean Node)
          // Mean node longitude formula relative to J2000 equinox
          const T = (julianDayUT - 2451545.0) / 36525;
          let omega = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000;
          omega = ((omega % 360) + 360) % 360; // Normalize 0..360

          const rahuLon = omega;
          const ketuLon = (omega + 180) % 360;
          const targetLon = planet === PlanetSymbol.RAHU ? rahuLon : ketuLon;

          return {
            planet,
            longitude: targetLon,
            latitude: 0.0,
            distanceAU: 0.00257,
            speedLongitude: -0.05295, // Mean daily retrograde motion ~3.18 arcmin/day
            isRetrograde: true,
          };
        }

        const bodyName = this.mapPlanetSymbolToBody(planet);
        const geoVector = this.astronomyLib.GeoVector(bodyName, astroTime, true);
        const ecliptic = this.astronomyLib.Ecliptic(geoVector);

        // Calculate velocity by evaluating position + 1 hour
        const dateObjNext = new Date((julianDayUT + 1 / 24 - 2440587.5) * 86400000);
        const astroTimeNext = this.astronomyLib.MakeTime(dateObjNext);
        const geoVectorNext = this.astronomyLib.GeoVector(bodyName, astroTimeNext, true);
        const eclipticNext = this.astronomyLib.Ecliptic(geoVectorNext);

        let deltaLon = eclipticNext.elon - ecliptic.elon;
        if (deltaLon > 180) deltaLon -= 360;
        if (deltaLon < -180) deltaLon += 360;
        const speedLongitude = deltaLon * 24; // degrees per day

        const longitude = ((ecliptic.elon % 360) + 360) % 360;

        return {
          planet,
          longitude,
          latitude: ecliptic.elat,
          distanceAU: ecliptic.vec.Length(),
          speedLongitude,
          isRetrograde: speedLongitude < 0,
        };
      } catch (err: any) {
        throw new EphemerisProviderError(`Error calculating position for ${planet}: ${err.message}`);
      }
    }

    throw new EphemerisProviderError(
      `astronomy-engine library is not installed or available in runtime. Install "astronomy-engine" or use MockEphemerisProvider.`
    );
  }

  public getAllPlanetaryPositions(julianDayUT: number): Record<PlanetSymbol, RawPlanetaryCoordinates> {
    const result: Partial<Record<PlanetSymbol, RawPlanetaryCoordinates>> = {};
    for (const planet of MANDATORY_VEDIC_PLANETS) {
      result[planet] = this.getPlanetaryPosition(planet, julianDayUT);
    }
    return result as Record<PlanetSymbol, RawPlanetaryCoordinates>;
  }
}
