import { PlanetSymbol } from '../planets/planet.types';
import { ShadbalaPlanet } from './strength.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { AstroChart } from '../chart/astro-chart.types';

/**
 * Classical Dig Bala (Directional Strength) according to BPHS Ch. 27.
 *
 * Powerful points:
 * - Jupiter & Mercury: 1st House cusp (East / Lagna) -> Nirbala point: 7th House cusp
 * - Moon & Venus: 4th House cusp (North / Nadir) -> Nirbala point: 10th House cusp
 * - Saturn: 7th House cusp (West / Descendant) -> Nirbala point: 1st House cusp
 * - Sun & Mars: 10th House cusp (South / Midheaven) -> Nirbala point: 4th House cusp
 *
 * Formula:
 * Dig Bala = (Distance from Nirbala point / 180°) * 60
 */
export function calculateDigBala(
  planet: ShadbalaPlanet,
  planetLongitude: number,
  chart: AstroChart
): number {
  const houses = chart.houses || [];
  const getCusp = (hNum: number): number => {
    const h = houses.find((item) => item.houseNumber === hNum);
    if (h) return h.cuspLongitude;
    // Fallback based on ascendant
    const ascLong = chart.ascendant?.longitude || 0;
    return normalizeDegree(ascLong + (hNum - 1) * 30);
  };

  let nirbalaLongitude = 0;

  switch (planet) {
    case PlanetSymbol.JUPITER:
    case PlanetSymbol.MERCURY:
      nirbalaLongitude = getCusp(7); // 7th cusp
      break;

    case PlanetSymbol.MOON:
    case PlanetSymbol.VENUS:
      nirbalaLongitude = getCusp(10); // 10th cusp
      break;

    case PlanetSymbol.SATURN:
      nirbalaLongitude = getCusp(1); // 1st cusp
      break;

    case PlanetSymbol.SUN:
    case PlanetSymbol.MARS:
      nirbalaLongitude = getCusp(4); // 4th cusp
      break;
  }

  let diff = Math.abs(normalizeDegree(planetLongitude - nirbalaLongitude));
  if (diff > 180) {
    diff = 360 - diff;
  }

  const digBala = (diff / 180.0) * 60.0;
  return Number(digBala.toFixed(4));
}
