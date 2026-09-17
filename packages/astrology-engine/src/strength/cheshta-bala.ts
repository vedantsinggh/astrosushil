import { PlanetSymbol } from '../planets/planet.types';
import { ShadbalaPlanet } from './strength.types';
import { AstroChart } from '../chart/astro-chart.types';
import { calculateAyanaBala, calculatePakshaBala } from './kala-bala';

// Classical mean daily velocities in degrees/day
const MEAN_DAILY_SPEEDS: Record<ShadbalaPlanet, number> = {
  [PlanetSymbol.SUN]: 0.9856,
  [PlanetSymbol.MOON]: 13.1764,
  [PlanetSymbol.MARS]: 0.524,
  [PlanetSymbol.MERCURY]: 1.383,
  [PlanetSymbol.JUPITER]: 0.083,
  [PlanetSymbol.VENUS]: 1.200,
  [PlanetSymbol.SATURN]: 0.033,
};

/**
 * Classical Cheshta Bala (Motional Strength) according to BPHS Ch. 27.
 *
 * Rules:
 * - Sun: Cheshta Bala equals its Ayana Bala.
 * - Moon: Cheshta Bala equals its Paksha Bala.
 * - Mars, Mercury, Jupiter, Venus, Saturn (Tara Grahas):
 *   - Retrograde (Vakra): 60.0 Shashtiamsas (Full Strength).
 *   - Stationary (Anuvakra): 30.0 Shashtiamsas.
 *   - Direct: Scaled between 15.0 and 45.0 based on speed relative to mean velocity.
 */
export function calculateCheshtaBala(planet: ShadbalaPlanet, chart: AstroChart): number {
  const pos = chart.planets[planet];
  if (!pos) return 0.0;

  // Sun special rule
  if (planet === PlanetSymbol.SUN) {
    return calculateAyanaBala(PlanetSymbol.SUN, pos.longitude);
  }

  // Moon special rule
  if (planet === PlanetSymbol.MOON) {
    const sunPos = chart.planets[PlanetSymbol.SUN];
    const sunLong = sunPos ? sunPos.longitude : 0;
    // For Moon's Cheshta Bala, classical BPHS equates it to its Paksha Bala (capped at 60 for Cheshta component)
    const rawPaksha = calculatePakshaBala(PlanetSymbol.MOON, sunLong, pos.longitude);
    return Number(Math.min(60.0, rawPaksha / 2.0).toFixed(4));
  }

  // 5 Tara Grahas
  const isRetro = pos.isRetrograde || (typeof pos.speedLongitude === 'number' && pos.speedLongitude < 0);
  if (isRetro) {
    return 60.0; // Retrograde planets possess full Cheshta Bala
  }

  const speed = typeof pos.speedLongitude === 'number' ? pos.speedLongitude : MEAN_DAILY_SPEEDS[planet];
  const avgSpeed = MEAN_DAILY_SPEEDS[planet];

  if (Math.abs(speed) <= 0.05 * avgSpeed) {
    return 30.0; // Stationary
  }

  // Scaled direct speed
  const ratio = Math.min(1.5, Math.max(0.2, speed / avgSpeed));
  const score = 15.0 + ((ratio - 0.2) / 1.3) * 30.0;

  return Number(Math.max(15.0, Math.min(45.0, score)).toFixed(4));
}
