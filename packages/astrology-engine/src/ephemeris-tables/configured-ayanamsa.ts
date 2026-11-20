import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { ChartCalculator } from '../chart/chart-calculator';
import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
import { MANDATORY_VEDIC_PLANETS, PlanetSymbol, RawPlanetaryCoordinates } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { julianDayToUtcDate } from '../varshaphala/solar-return.solver';

/** Provider returning longitude 0 for every body: the chart calculator then reports -ayanamsa. */
class ZeroLongitudeProvider implements EphemerisProvider {
  getProviderName(): string {
    return 'ZeroLongitudeProvider';
  }
  getProviderVersion(): string {
    return '1';
  }
  getPlanetaryPosition(planet: PlanetSymbol): RawPlanetaryCoordinates {
    return { planet, longitude: 0, latitude: 0, distanceAU: 1, speedLongitude: 1, isRetrograde: false };
  }
  getAllPlanetaryPositions(): Record<PlanetSymbol, RawPlanetaryCoordinates> {
    const out: Partial<Record<PlanetSymbol, RawPlanetaryCoordinates>> = {};
    for (const p of MANDATORY_VEDIC_PLANETS) out[p] = this.getPlanetaryPosition(p);
    return out as Record<PlanetSymbol, RawPlanetaryCoordinates>;
  }
}

const zeroChart = new ChartCalculator(new ZeroLongitudeProvider());

/**
 * The ayanamsa (degrees) the engine chart calculator applies at an instant for a configuration.
 * Obtained from the chart calculator itself (no formula is repeated here), so new ayanamsa
 * options added to the chart calculator are picked up automatically. 0 for tropical.
 */
export async function getConfiguredAyanamsa(julianDayUT: number, config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG): Promise<number> {
  if (config.zodiacType !== 'SIDEREAL') return 0;
  const utc = julianDayToUtcDate(julianDayUT);
  const chart = await zeroChart.calculateChart(
    {
      date: { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() },
      time: { hour: utc.getUTCHours(), minute: utc.getUTCMinutes(), second: utc.getUTCSeconds() },
      timezone: 'UTC',
      latitude: 0,
      longitude: 0,
      utcDateTime: utc.toISOString(),
    },
    config,
  );
  let a = normalizeDegree(-chart.planets[PlanetSymbol.SUN].longitude);
  if (a > 180) a -= 360;
  return a;
}
