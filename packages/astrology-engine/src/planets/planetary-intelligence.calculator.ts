import { PlanetSymbol, MANDATORY_VEDIC_PLANETS } from './planet.types';
import {
  PlanetaryIntelligence,
  PlanetaryIntelligenceReport,
} from './planetary-intelligence.types';
import { calculatePlanetaryDignity } from './planetary-dignity';
import { calculateCombustion } from './combustion';
import { calculatePlanetaryAvastha } from './planetary-avasthas';
import { calculatePlanetaryAspects } from './planetary-aspects';
import { calculateCharaKarakas } from './planetary-karakas';
import { calculatePlanetaryWars, calculateConjunctions } from './planetary-war';
import { AstroChart } from '../chart/astro-chart.types';

export interface PlanetaryInputFact {
  planet: PlanetSymbol;
  longitude: number;     // [0, 360)
  latitude?: number;     // ecliptic latitude
  speedLongitude?: number;
  isRetrograde?: boolean;
  rashiIndex: number;    // 1 to 12
  degreeInRashi: number; // [0, 30)
  house: number;         // 1 to 12
}

export class PlanetaryIntelligenceCalculator {
  /**
   * Compiles complete deterministic planetary intelligence for an AstroChart.
   */
  public calculateFromChart(chart: AstroChart): PlanetaryIntelligenceReport {
    const ascRashi = chart.ascendant?.rashiIndex || 1;

    const facts: PlanetaryInputFact[] = [];
    for (const sym of MANDATORY_VEDIC_PLANETS) {
      const pos = chart.planets[sym];
      if (!pos) continue;

      const house = ((pos.rashiIndex - ascRashi + 12) % 12) + 1;
      facts.push({
        planet: sym,
        longitude: pos.longitude,
        latitude: pos.latitude || 0.0,
        speedLongitude: pos.speedLongitude || 0.0,
        isRetrograde: pos.isRetrograde || false,
        rashiIndex: pos.rashiIndex,
        degreeInRashi: pos.degreeInRashi,
        house,
      });
    }

    return this.calculateFromFacts(facts);
  }

  /**
   * Compiles complete deterministic planetary intelligence from individual planetary facts.
   */
  public calculateFromFacts(facts: PlanetaryInputFact[]): PlanetaryIntelligenceReport {
    // 1. Sun Longitude for Combustion
    const sunFact = facts.find((f) => f.planet === PlanetSymbol.SUN);
    const sunLongitude = sunFact ? sunFact.longitude : 0.0;

    // 2. Map of positions for 5-fold temporal relationship lookups
    const planetPositions: Partial<Record<PlanetSymbol, { rashiIndex: number }>> = {};
    for (const f of facts) {
      planetPositions[f.planet] = { rashiIndex: f.rashiIndex };
    }

    // 3. Aspects (Graha Drishti)
    const aspectInputs = facts.map((f) => ({
      planet: f.planet,
      rashiIndex: f.rashiIndex,
      house: f.house,
      longitude: f.longitude,
    }));
    const { aspectsCast, aspectsReceived, aspectedHouses } = calculatePlanetaryAspects(aspectInputs);

    // 4. Chara Karakas
    const degreesRecord: Partial<Record<PlanetSymbol, number>> = {};
    for (const f of facts) {
      degreesRecord[f.planet] = f.degreeInRashi;
    }
    const charaKarakas = calculateCharaKarakas(degreesRecord);
    const karakaMap = new Map(charaKarakas.map((k) => [k.planet, k]));

    // 5. Planetary Wars & Conjunctions
    const warInputs = facts.map((f) => ({
      planet: f.planet,
      longitude: f.longitude,
      latitude: f.latitude || 0.0,
      rashiIndex: f.rashiIndex,
    }));
    const planetaryWars = calculatePlanetaryWars(warInputs);
    const conjunctions = calculateConjunctions(warInputs);

    // 6. Build Individual Planetary Intelligence
    const planetsReport: Partial<Record<PlanetSymbol, PlanetaryIntelligence>> = {};

    for (const f of facts) {
      const isRetro = f.isRetrograde || false;
      const dignity = calculatePlanetaryDignity(f.planet, f.rashiIndex, f.degreeInRashi, planetPositions);
      const combustion = calculateCombustion(f.planet, f.longitude, sunLongitude, isRetro);
      const avastha = calculatePlanetaryAvastha(f.rashiIndex, f.degreeInRashi, dignity);

      const castList = aspectsCast.get(f.planet) || [];
      const receivedList = aspectsReceived.get(f.planet) || [];
      const aspHouses = aspectedHouses.get(f.planet) || [];
      const aspectingPlanets = Array.from(new Set(receivedList.map((d) => d.sourcePlanet)));

      planetsReport[f.planet] = {
        planet: f.planet,
        dignity,
        combustion,
        avastha,
        charaKaraka: karakaMap.get(f.planet),
        aspectsCast: castList,
        aspectsReceived: receivedList,
        aspectedHouses: aspHouses,
        aspectingPlanets,
        isRetrograde: isRetro,
        speedLongitude: f.speedLongitude || 0.0,
        latitude: f.latitude || 0.0,
      };
    }

    return {
      planets: planetsReport,
      charaKarakas,
      planetaryWars,
      conjunctions,
    };
  }
}
