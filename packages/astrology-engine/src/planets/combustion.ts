import { PlanetSymbol } from './planet.types';
import { CombustionDetail } from './planetary-intelligence.types';
import { normalizeDegree } from '../coordinates/angular-math';

/**
 * Classical Combustion Thresholds in degrees (Surya Siddhanta & BPHS):
 * - Moon: 12°
 * - Mars: 17°
 * - Mercury: Direct 14°, Retrograde 12°
 * - Jupiter: 11°
 * - Venus: Direct 10°, Retrograde 8°
 * - Saturn: 15°
 */
export function getCombustionThreshold(planet: PlanetSymbol, isRetrograde: boolean = false): number {
  switch (planet) {
    case PlanetSymbol.MOON:
      return 12.0;
    case PlanetSymbol.MARS:
      return 17.0;
    case PlanetSymbol.MERCURY:
      return isRetrograde ? 12.0 : 14.0;
    case PlanetSymbol.JUPITER:
      return 11.0;
    case PlanetSymbol.VENUS:
      return isRetrograde ? 8.0 : 10.0;
    case PlanetSymbol.SATURN:
      return 15.0;
    default:
      return 0.0;
  }
}

/**
 * Calculates precision combustion (Asta) status for a planet relative to the Sun.
 */
export function calculateCombustion(
  planet: PlanetSymbol,
  planetLongitude: number,
  sunLongitude: number,
  isRetrograde: boolean = false
): CombustionDetail {
  // Sun cannot combust itself, and shadow nodes (Rahu/Ketu) do not combust
  if (
    planet === PlanetSymbol.SUN ||
    planet === PlanetSymbol.RAHU ||
    planet === PlanetSymbol.KETU ||
    planet === PlanetSymbol.URANUS ||
    planet === PlanetSymbol.NEPTUNE ||
    planet === PlanetSymbol.PLUTO
  ) {
    return {
      isCombust: false,
      angularSeparation: 0.0,
      threshold: 0.0,
      isRetrograde,
    };
  }

  let diff = Math.abs(normalizeDegree(planetLongitude - sunLongitude));
  if (diff > 180) {
    diff = 360 - diff;
  }

  const threshold = getCombustionThreshold(planet, isRetrograde);
  const isCombust = diff <= threshold;

  return {
    isCombust,
    angularSeparation: Number(diff.toFixed(4)),
    threshold,
    isRetrograde,
  };
}
