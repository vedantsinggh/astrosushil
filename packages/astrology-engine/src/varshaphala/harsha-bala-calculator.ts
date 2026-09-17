import { PlanetSymbol, PlanetPosition } from '../planets/planet.types';
import { AstroChart } from '../chart/astro-chart.types';
import { HarshaBalaScores, PlanetHarshaBala, HarshaYogaResult } from './varshaphala.types';

const JOY_HOUSES: Record<PlanetSymbol, number> = {
  [PlanetSymbol.SUN]: 9,
  [PlanetSymbol.MOON]: 3,
  [PlanetSymbol.MARS]: 6,
  [PlanetSymbol.MERCURY]: 1,
  [PlanetSymbol.JUPITER]: 11,
  [PlanetSymbol.VENUS]: 5,
  [PlanetSymbol.SATURN]: 12,
  [PlanetSymbol.RAHU]: 0,
  [PlanetSymbol.KETU]: 0,
  [PlanetSymbol.URANUS]: 0,
  [PlanetSymbol.NEPTUNE]: 0,
  [PlanetSymbol.PLUTO]: 0,
};

const OWN_AND_EXALTATION_RASHIS: Record<PlanetSymbol, number[]> = {
  [PlanetSymbol.SUN]: [5, 1],        // Own: Leo(5), Exalted: Aries(1)
  [PlanetSymbol.MOON]: [4, 2],       // Own: Cancer(4), Exalted: Taurus(2)
  [PlanetSymbol.MARS]: [1, 8, 10],   // Own: Aries(1), Scorpio(8), Exalted: Capricorn(10)
  [PlanetSymbol.MERCURY]: [3, 6],    // Own: Gemini(3), Virgo(6), Exalted: Virgo(6)
  [PlanetSymbol.JUPITER]: [9, 12, 4],// Own: Sagittarius(9), Pisces(12), Exalted: Cancer(4)
  [PlanetSymbol.VENUS]: [2, 7, 12],  // Own: Taurus(2), Libra(7), Exalted: Pisces(12)
  [PlanetSymbol.SATURN]: [10, 11, 7],// Own: Capricorn(10), Aquarius(11), Exalted: Libra(7)
  [PlanetSymbol.RAHU]: [],
  [PlanetSymbol.KETU]: [],
  [PlanetSymbol.URANUS]: [],
  [PlanetSymbol.NEPTUNE]: [],
  [PlanetSymbol.PLUTO]: [],
};

const MASCULINE_PLANETS = new Set([PlanetSymbol.SUN, PlanetSymbol.MARS, PlanetSymbol.JUPITER]);
const FEMININE_OR_NEUTRAL_PLANETS = new Set([PlanetSymbol.MOON, PlanetSymbol.VENUS, PlanetSymbol.MERCURY, PlanetSymbol.SATURN]);

const DIURNAL_PLANETS = new Set([PlanetSymbol.SUN, PlanetSymbol.JUPITER, PlanetSymbol.SATURN]);
const NOCTURNAL_PLANETS = new Set([PlanetSymbol.MOON, PlanetSymbol.MARS, PlanetSymbol.VENUS]);

const SEVEN_VEDIC_PLANETS = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
];

/**
 * Calculates Tajika Harsha Bala (4-fold joy/happiness strength) for the 7 Vedic planets.
 */
export class HarshaBalaCalculator {
  public calculateHarshaBala(
    planets: Record<PlanetSymbol, PlanetPosition>,
    varshaLagnaRashiIndex: number
  ): HarshaBalaScores {
    // 1. Determine Day vs Night return based on Sun's house position in annual chart
    const sunPos = planets[PlanetSymbol.SUN];
    const sunRashi = sunPos?.rashiIndex ?? 1;
    const sunHouse = ((sunRashi - varshaLagnaRashiIndex + 12) % 12) + 1;
    const isDayReturn = (sunHouse >= 7 && sunHouse <= 12);

    const scores: Partial<HarshaBalaScores> = {};

    for (const p of SEVEN_VEDIC_PLANETS) {
      const pos = planets[p];
      const rashi = pos?.rashiIndex ?? 1;
      const house = ((rashi - varshaLagnaRashiIndex + 12) % 12) + 1;
      const isOddSign = (rashi % 2 !== 0);

      // Factor 1: Sthana Bala (Joy House) -> 5 points
      const sthanaBala = house === JOY_HOUSES[p] ? 5 : 0;

      // Factor 2: Uccha / Swakshetra Bala (Own or Exaltation sign) -> 5 points
      const ucchaBala = OWN_AND_EXALTATION_RASHIS[p].includes(rashi) ? 5 : 0;

      // Factor 3: Stri/Purusha Griha Bala (Sign Gender Match) -> 5 points
      let striPurushaBala = 0;
      if (MASCULINE_PLANETS.has(p) && isOddSign) {
        striPurushaBala = 5;
      } else if (FEMININE_OR_NEUTRAL_PLANETS.has(p) && !isOddSign) {
        striPurushaBala = 5;
      }

      // Factor 4: Dina / Ratri Bala (Day / Night match) -> 5 points
      let dinaRatriBala = 0;
      if (p === PlanetSymbol.MERCURY) {
        dinaRatriBala = 5; // Mercury always receives Dina/Ratri joy points
      } else if (isDayReturn && DIURNAL_PLANETS.has(p)) {
        dinaRatriBala = 5;
      } else if (!isDayReturn && NOCTURNAL_PLANETS.has(p)) {
        dinaRatriBala = 5;
      }

      const totalScore = sthanaBala + ucchaBala + striPurushaBala + dinaRatriBala;
      const hasHarsha = totalScore >= 15;

      scores[p] = {
        planet: p,
        sthanaBala,
        ucchaBala,
        striPurushaBala,
        dinaRatriBala,
        totalScore,
        hasHarsha,
      };
    }

    return scores as HarshaBalaScores;
  }

  /**
   * Identifies planets that have formed Harsha Yoga / state of joy in the annual chart.
   */
  public calculateHarshaYogas(
    scores: HarshaBalaScores,
    planets: Record<PlanetSymbol, PlanetPosition>,
    varshaLagnaRashiIndex: number
  ): HarshaYogaResult[] {
    const results: HarshaYogaResult[] = [];

    for (const p of SEVEN_VEDIC_PLANETS) {
      const score = scores[p];
      if (!score) continue;

      const pos = planets[p];
      const rashi = pos?.rashiIndex ?? 1;
      const house = ((rashi - varshaLagnaRashiIndex + 12) % 12) + 1;

      if (score.hasHarsha) {
        results.push({
          yogaId: `HARSHA_${p}`,
          name: `Harsha Yoga (${p})`,
          involvedPlanet: p,
          house,
          score: score.totalScore,
          evidence: `${p} achieved Harsha status with score ${score.totalScore}/20 (Joy House: ${score.sthanaBala}, Dignity: ${score.ucchaBala}, Gender Sign: ${score.striPurushaBala}, Day/Night: ${score.dinaRatriBala}).`,
        });
      }
    }

    return results;
  }

  /**
   * Static helper to compute Harsha Bala directly from annual AstroChart.
   */
  public static calculateAll(annualChart: AstroChart): {
    scores: HarshaBalaScores;
    yogas: HarshaYogaResult[];
  } {
    const calc = new HarshaBalaCalculator();
    const varshaLagnaRashi = annualChart.ascendant?.rashiIndex ?? 1;
    const scores = calc.calculateHarshaBala(annualChart.planets, varshaLagnaRashi);
    const yogas = calc.calculateHarshaYogas(scores, annualChart.planets, varshaLagnaRashi);
    return { scores, yogas };
  }
}
