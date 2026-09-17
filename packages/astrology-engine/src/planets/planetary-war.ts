import { PlanetSymbol } from './planet.types';
import {
  PlanetaryWarDetail,
  ConjunctionDetail,
} from './planetary-intelligence.types';
import { normalizeDegree } from '../coordinates/angular-math';

const TARA_GRAHAS = [
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
] as const;

export interface PlanetWarInput {
  planet: PlanetSymbol;
  longitude: number; // [0.0, 360.0)
  latitude: number;  // Ecliptic latitude in decimal degrees
  rashiIndex: number;
}

/**
 * Calculates Graha Yuddha (Planetary War) according to Surya Siddhanta and BPHS.
 *
 * Rules:
 * - Only the 5 true physical planets (Mars, Mercury, Jupiter, Venus, Saturn) enter Graha Yuddha.
 * - Sun, Moon, Rahu, and Ketu do not engage in planetary war.
 * - Condition: Absolute longitudinal separation <= 1.0 degree (1°00').
 * - Victor (Jayi): The planet with the higher northern ecliptic latitude is declared victor.
 */
export function calculatePlanetaryWars(planets: PlanetWarInput[]): PlanetaryWarDetail[] {
  const wars: PlanetaryWarDetail[] = [];
  const taraPlanets = planets.filter((p) => (TARA_GRAHAS as readonly PlanetSymbol[]).includes(p.planet));

  for (let i = 0; i < taraPlanets.length; i++) {
    for (let j = i + 1; j < taraPlanets.length; j++) {
      const p1 = taraPlanets[i];
      const p2 = taraPlanets[j];

      let diff = Math.abs(normalizeDegree(p1.longitude - p2.longitude));
      if (diff > 180) diff = 360 - diff;

      // Condition: within 1 degree
      if (diff <= 1.0) {
        let victor: PlanetSymbol;
        let defeated: PlanetSymbol;
        let victorLat: number;
        let defeatedLat: number;

        if (p1.latitude >= p2.latitude) {
          victor = p1.planet;
          defeated = p2.planet;
          victorLat = p1.latitude;
          defeatedLat = p2.latitude;
        } else {
          victor = p2.planet;
          defeated = p1.planet;
          victorLat = p2.latitude;
          defeatedLat = p1.latitude;
        }

        wars.push({
          planet1: p1.planet,
          planet2: p2.planet,
          longitudinalSeparation: Number(diff.toFixed(4)),
          victor,
          defeated,
          victorLatitude: Number(victorLat.toFixed(4)),
          defeatedLatitude: Number(defeatedLat.toFixed(4)),
        });
      }
    }
  }

  return wars;
}

/**
 * Calculates all planetary conjunctions in the chart.
 */
export function calculateConjunctions(planets: PlanetWarInput[]): ConjunctionDetail[] {
  const conjunctions: ConjunctionDetail[] = [];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];

      if (p1.rashiIndex === p2.rashiIndex) {
        let diff = Math.abs(normalizeDegree(p1.longitude - p2.longitude));
        if (diff > 180) diff = 360 - diff;

        conjunctions.push({
          planet1: p1.planet,
          planet2: p2.planet,
          rashiIndex: p1.rashiIndex,
          angularSeparation: Number(diff.toFixed(4)),
          isTight: diff <= 3.5,
        });
      }
    }
  }

  return conjunctions;
}
