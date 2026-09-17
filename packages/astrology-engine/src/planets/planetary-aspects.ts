import { PlanetSymbol } from './planet.types';
import { AspectType, PlanetaryAspectDetail } from './planetary-intelligence.types';
import { normalizeDegree } from '../coordinates/angular-math';

export interface PlanetAspectInput {
  planet: PlanetSymbol;
  rashiIndex: number; // 1 to 12
  house: number;      // 1 to 12
  longitude: number;  // [0.0, 360.0)
}

/**
 * Returns the houses aspected by a planet based on classical Vedic rules (BPHS Ch. 8 / Ch. 26).
 *
 * Rules:
 * - All planets aspect 7th house (100% full aspect).
 * - Mars also aspects 4th and 8th houses.
 * - Jupiter also aspects 5th and 9th houses.
 * - Saturn also aspects 3rd and 10th houses.
 * - Rahu/Ketu cast 7th opposition, plus 5th/9th trines (Phaladeepika tradition).
 */
export function getAspectedHouses(
  planet: PlanetSymbol,
  sourceHouse: number
): { house: number; aspectType: AspectType }[] {
  const aspects: { house: number; aspectType: AspectType }[] = [];

  const addAspect = (offset: number, type: AspectType) => {
    const targetHouse = ((sourceHouse - 1 + (offset - 1)) % 12) + 1;
    aspects.push({ house: targetHouse, aspectType: type });
  };

  // 1. 7th Aspect (All planets)
  addAspect(7, 'OPPOSITION_7TH');

  // 2. Special Aspects
  switch (planet) {
    case PlanetSymbol.MARS:
      addAspect(4, 'SPECIAL_4TH');
      addAspect(8, 'SPECIAL_8TH');
      break;

    case PlanetSymbol.JUPITER:
      addAspect(5, 'SPECIAL_5TH');
      addAspect(9, 'SPECIAL_9TH');
      break;

    case PlanetSymbol.SATURN:
      addAspect(3, 'SPECIAL_3RD');
      addAspect(10, 'SPECIAL_10TH');
      break;

    case PlanetSymbol.RAHU:
    case PlanetSymbol.KETU:
      // 5th and 9th trines according to Phaladeepika tradition
      addAspect(5, 'TRINE_ASPECT');
      addAspect(9, 'TRINE_ASPECT');
      break;

    default:
      break;
  }

  return aspects;
}

/**
 * Returns the signs aspected by a planet.
 */
export function getAspectedSigns(
  planet: PlanetSymbol,
  sourceRashiIndex: number
): { rashiIndex: number; aspectType: AspectType }[] {
  const aspects: { rashiIndex: number; aspectType: AspectType }[] = [];

  const addAspect = (offset: number, type: AspectType) => {
    const targetSign = ((sourceRashiIndex - 1 + (offset - 1)) % 12) + 1;
    aspects.push({ rashiIndex: targetSign, aspectType: type });
  };

  addAspect(7, 'OPPOSITION_7TH');

  switch (planet) {
    case PlanetSymbol.MARS:
      addAspect(4, 'SPECIAL_4TH');
      addAspect(8, 'SPECIAL_8TH');
      break;

    case PlanetSymbol.JUPITER:
      addAspect(5, 'SPECIAL_5TH');
      addAspect(9, 'SPECIAL_9TH');
      break;

    case PlanetSymbol.SATURN:
      addAspect(3, 'SPECIAL_3RD');
      addAspect(10, 'SPECIAL_10TH');
      break;

    case PlanetSymbol.RAHU:
    case PlanetSymbol.KETU:
      addAspect(5, 'TRINE_ASPECT');
      addAspect(9, 'TRINE_ASPECT');
      break;

    default:
      break;
  }

  return aspects;
}

/**
 * Calculates complete planetary aspects across all planets in a chart.
 */
export function calculatePlanetaryAspects(
  planets: PlanetAspectInput[]
): {
  aspectsCast: Map<PlanetSymbol, PlanetaryAspectDetail[]>;
  aspectsReceived: Map<PlanetSymbol, PlanetaryAspectDetail[]>;
  aspectedHouses: Map<PlanetSymbol, number[]>;
} {
  const aspectsCast = new Map<PlanetSymbol, PlanetaryAspectDetail[]>();
  const aspectsReceived = new Map<PlanetSymbol, PlanetaryAspectDetail[]>();
  const aspectedHouses = new Map<PlanetSymbol, number[]>();

  for (const p of planets) {
    aspectsCast.set(p.planet, []);
    aspectsReceived.set(p.planet, []);
    aspectedHouses.set(p.planet, []);
  }

  for (const source of planets) {
    const houseAspects = getAspectedHouses(source.planet, source.house);
    aspectedHouses.set(
      source.planet,
      houseAspects.map((ha) => ha.house)
    );

    const signAspects = getAspectedSigns(source.planet, source.rashiIndex);

    for (const sa of signAspects) {
      // Find all target planets in this aspected sign
      const targetPlanets = planets.filter(
        (tp) => tp.rashiIndex === sa.rashiIndex && tp.planet !== source.planet
      );

      const targetHouse = ((source.house - 1 + (sa.rashiIndex - source.rashiIndex + 12) % 12) % 12) + 1;

      if (targetPlanets.length === 0) {
        // House receives aspect even if empty
        const detail: PlanetaryAspectDetail = {
          sourcePlanet: source.planet,
          targetHouse,
          targetSign: sa.rashiIndex,
          aspectType: sa.aspectType,
          angleDegrees: ((sa.rashiIndex - source.rashiIndex + 12) % 12) * 30,
          isFullDrishti: true,
        };
        aspectsCast.get(source.planet)!.push(detail);
      } else {
        for (const target of targetPlanets) {
          let angle = Math.abs(normalizeDegree(target.longitude - source.longitude));
          if (angle > 180) angle = 360 - angle;

          const detail: PlanetaryAspectDetail = {
            sourcePlanet: source.planet,
            targetPlanet: target.planet,
            targetHouse: target.house,
            targetSign: target.rashiIndex,
            aspectType: sa.aspectType,
            angleDegrees: angle,
            isFullDrishti: true,
          };

          aspectsCast.get(source.planet)!.push(detail);
          aspectsReceived.get(target.planet)!.push(detail);
        }
      }
    }
  }

  return { aspectsCast, aspectsReceived, aspectedHouses };
}
