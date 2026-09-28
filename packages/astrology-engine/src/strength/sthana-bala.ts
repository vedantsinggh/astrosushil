import { PlanetSymbol } from '../planets/planet.types';
import { SthanaBalaBreakdown, ShadbalaPlanet } from './strength.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { calculatePlanetaryDignity } from '../planets/planetary-dignity';
import { VargaCalculator } from '../varga/varga-calculator';
import { AstroChart } from '../chart/astro-chart.types';

/**
 * Classical Deep Debilitation Points (Neecha Sphuta) according to BPHS Ch. 3 / Ch. 27:
 * - Sun: 190° (Libra 10°)
 * - Moon: 213° (Scorpio 3°)
 * - Mars: 118° (Cancer 28°)
 * - Mercury: 345° (Pisces 15°)
 * - Jupiter: 275° (Capricorn 5°)
 * - Venus: 177° (Virgo 27°)
 * - Saturn: 20° (Aries 20°)
 */
export const DEEP_DEBILITATION_LONGITUDES: Record<ShadbalaPlanet, number> = {
  [PlanetSymbol.SUN]: 190.0,
  [PlanetSymbol.MOON]: 213.0,
  [PlanetSymbol.MARS]: 118.0,
  [PlanetSymbol.MERCURY]: 345.0,
  [PlanetSymbol.JUPITER]: 275.0,
  [PlanetSymbol.VENUS]: 177.0,
  [PlanetSymbol.SATURN]: 20.0,
};

/**
 * 1. Uchcha Bala (Exaltation Strength)
 * Measures angular distance from the deep debilitation point.
 * Ranges from 0 (at deep debilitation) to 60 Shashtiamsas (at deep exaltation).
 */
export function calculateUchchaBala(planet: ShadbalaPlanet, longitude: number): number {
  const debLong = DEEP_DEBILITATION_LONGITUDES[planet];
  let diff = Math.abs(normalizeDegree(longitude - debLong));
  if (diff > 180) {
    diff = 360 - diff;
  }
  const score = (diff / 180.0) * 60.0;
  return Number(score.toFixed(4));
}

/**
 * 2. Saptavargaja Bala (Divisional Dignity Strength across 7 Vargas)
 * Evaluates D1, D2, D3, D7, D9, D12, D30.
 *
 * Classical Points per Varga (BPHS Ch. 27):
 * - Moolatrikona: 45
 * - Sva Rashi (Own Sign): 30
 * - Adhi Mitra (Great Friend): 20
 * - Mitra (Friend): 15
 * - Sama (Neutral): 10
 * - Shatru (Enemy): 4
 * - Adhi Shatru (Great Enemy): 2
 */
export function calculateSaptavargajaBala(
  planet: ShadbalaPlanet,
  chart: AstroChart,
  vargaCalculator: VargaCalculator = new VargaCalculator()
): number {
  const saptavargaTypes = ['D1', 'D2', 'D3', 'D7', 'D9', 'D12', 'D30'] as const;
  let totalBala = 0;

  for (const vType of saptavargaTypes) {
    const vChart = vargaCalculator.calculateVarga(chart, vType);
    const placement = vChart.placements[planet];
    if (!placement) continue;

    // Collect sign positions of all planets in this varga for compound relationship lookup
    const vargaPositions: Partial<Record<PlanetSymbol, { rashiIndex: number }>> = {};
    for (const [sym, pl] of Object.entries(vChart.placements)) {
      vargaPositions[sym as PlanetSymbol] = { rashiIndex: pl.rashiIndex };
    }

    const degInVarga = placement.degreeInVarga || 0;
    const dignity = calculatePlanetaryDignity(planet, placement.rashiIndex, degInVarga, vargaPositions);

    switch (dignity) {
      case 'MOOLATRIKONA':
        totalBala += 45.0;
        break;
      case 'OWN_SIGN':
      case 'EXALTED': // In classical saptavargaja, exaltation within varga counts as own/highest
        totalBala += 30.0;
        break;
      case 'GREAT_FRIEND':
        totalBala += 20.0;
        break;
      case 'FRIEND':
        totalBala += 15.0;
        break;
      case 'NEUTRAL':
        totalBala += 10.0;
        break;
      case 'ENEMY':
        totalBala += 4.0;
        break;
      case 'GREAT_ENEMY':
      case 'DEBILITATED':
        totalBala += 2.0;
        break;
      default:
        totalBala += 10.0;
        break;
    }
  }

  return Number(totalBala.toFixed(4));
}

/**
 * 3. Ojhayugma Bala (Odd/Even Sign Strength in Rashi & Navamsha)
 * - Moon & Venus get 15 Shashtiamsas each for being in Even signs in Rashi & Navamsha.
 * - Sun, Mars, Jupiter, Mercury, Saturn get 15 Shashtiamsas each for being in Odd signs in Rashi & Navamsha.
 */
export function calculateOjhayugmaBala(
  planet: ShadbalaPlanet,
  rashiIndex: number,
  navamshaIndex: number
): number {
  const isFemalePlanet = planet === PlanetSymbol.MOON || planet === PlanetSymbol.VENUS;
  let bala = 0;

  const rashiIsEven = rashiIndex % 2 === 0;
  const navamshaIsEven = navamshaIndex % 2 === 0;

  if (isFemalePlanet) {
    if (rashiIsEven) bala += 15.0;
    if (navamshaIsEven) bala += 15.0;
  } else {
    if (!rashiIsEven) bala += 15.0;
    if (!navamshaIsEven) bala += 15.0;
  }

  return Number(bala.toFixed(4));
}

/**
 * 4. Kendradi Bala (Angles Strength)
 * - Kendra (Houses 1, 4, 7, 10): 60 Shashtiamsas
 * - Panaphara (Houses 2, 5, 8, 11): 30 Shashtiamsas
 * - Apoklima (Houses 3, 6, 9, 12): 15 Shashtiamsas
 */
export function calculateKendradiBala(houseNumber: number): number {
  const kendras = [1, 4, 7, 10];
  const panapharas = [2, 5, 8, 11];

  if (kendras.includes(houseNumber)) return 60.0;
  if (panapharas.includes(houseNumber)) return 30.0;
  return 15.0;
}

/**
 * 5. Drekkana Bala (Decanate Gender Strength)
 * - Male planets (Sun, Mars, Jupiter) in 1st Drekkana (0-10°): 15 Shashtiamsas
 * - Neutral/Hermaphrodite planets (Mercury, Saturn) in 2nd Drekkana (10-20°): 15 Shashtiamsas
 * - Female planets (Moon, Venus) in 3rd Drekkana (20-30°): 15 Shashtiamsas
 */
export function calculateDrekkanaBala(planet: ShadbalaPlanet, degreeInRashi: number): number {
  const deg = Math.min(29.9999, Math.max(0, degreeInRashi));
  const drekkanaPart = Math.floor(deg / 10); // 0 = 1st, 1 = 2nd, 2 = 3rd

  const malePlanets = [PlanetSymbol.SUN, PlanetSymbol.MARS, PlanetSymbol.JUPITER];
  const neutralPlanets = [PlanetSymbol.MERCURY, PlanetSymbol.SATURN];
  const femalePlanets = [PlanetSymbol.MOON, PlanetSymbol.VENUS];

  if (malePlanets.includes(planet) && drekkanaPart === 0) return 15.0;
  if (neutralPlanets.includes(planet) && drekkanaPart === 1) return 15.0;
  if (femalePlanets.includes(planet) && drekkanaPart === 2) return 15.0;

  return 0.0;
}

/**
 * Calculates complete Sthana Bala and its 5 subcomponents.
 */
export function calculateSthanaBala(
  planet: ShadbalaPlanet,
  chart: AstroChart,
  vargaCalculator: VargaCalculator = new VargaCalculator()
): SthanaBalaBreakdown {
  const pos = chart.planets[planet];
  if (!pos) {
    return { uchchaBala: 0, saptavargajaBala: 0, ojhayugmaBala: 0, kendradiBala: 0, drekkanaBala: 0, total: 0 };
  }

  const ascRashi = chart.ascendant?.rashiIndex || 1;
  const houseNumber = ((pos.rashiIndex - ascRashi + 12) % 12) + 1;

  // Navamsha sign index
  const d9Chart = vargaCalculator.calculateVarga(chart, 'D9');
  const d9Placement = d9Chart.placements[planet];
  const navamshaIndex = d9Placement ? d9Placement.rashiIndex : pos.rashiIndex;

  const uchchaBala = calculateUchchaBala(planet, pos.longitude);
  const saptavargajaBala = calculateSaptavargajaBala(planet, chart, vargaCalculator);
  const ojhayugmaBala = calculateOjhayugmaBala(planet, pos.rashiIndex, navamshaIndex);
  const kendradiBala = calculateKendradiBala(houseNumber);
  const drekkanaBala = calculateDrekkanaBala(planet, pos.degreeInRashi);

  const total = uchchaBala + saptavargajaBala + ojhayugmaBala + kendradiBala + drekkanaBala;

  return {
    uchchaBala,
    saptavargajaBala,
    ojhayugmaBala,
    kendradiBala,
    drekkanaBala,
    total: Number(total.toFixed(4)),
  };
}
