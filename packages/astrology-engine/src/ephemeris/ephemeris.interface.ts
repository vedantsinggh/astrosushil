import { PlanetSymbol, RawPlanetaryCoordinates } from '../planets/planet.types';

export interface EphemerisProvider {
  /**
   * Identifies the provider implementation name (e.g. "AstronomyEngineAdapter", "MockEphemerisProvider")
   */
  getProviderName(): string;

  /**
   * Returns provider algorithm version
   */
  getProviderVersion(): string;

  /**
   * Calculates raw ecliptic coordinates for a single planet at a given Julian Day UT.
   * Contract (engine 0.2.0, ADR-017): planet longitudes are apparent and referred to the TRUE
   * equinox of date; RAHU/KETU are the MEAN lunar node referred to the MEAN equinox of date.
   */
  getPlanetaryPosition(
    planet: PlanetSymbol,
    julianDayUT: number
  ): Promise<RawPlanetaryCoordinates> | RawPlanetaryCoordinates;

  /**
   * Calculates raw ecliptic coordinates for all mandatory planets at a given Julian Day UT.
   */
  getAllPlanetaryPositions(
    julianDayUT: number
  ): Promise<Record<PlanetSymbol, RawPlanetaryCoordinates>> | Record<PlanetSymbol, RawPlanetaryCoordinates>;
}
