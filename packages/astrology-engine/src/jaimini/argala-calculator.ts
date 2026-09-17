import { PlanetSymbol } from '../planets/planet.types';
import { ArgalaDetail } from './jaimini.types';

const BENEFIC_PLANETS = new Set<PlanetSymbol>([
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.MOON,
]);

export class ArgalaCalculator {
  /**
   * Evaluates Argala and Virodha Argala for all 12 houses from an Ascendant.
   *
   * Classical Pairs:
   * - 2nd house (Argala) <--> 12th house (Virodha / Obstruction)
   * - 4th house (Argala) <--> 10th house (Virodha / Obstruction)
   * - 11th house (Argala) <--> 3rd house (Virodha / Obstruction)
   * - 5th house (Secondary Argala) <--> 9th house (Virodha / Obstruction)
   */
  public static calculateArgalaForHouses(
    ascendantRashiIndex: number,
    planetSigns: Partial<Record<PlanetSymbol, number>>
  ): ArgalaDetail[] {
    const results: ArgalaDetail[] = [];

    // Map planets per sign
    const planetsBySign: Record<number, PlanetSymbol[]> = {};
    for (let s = 1; s <= 12; s++) planetsBySign[s] = [];
    for (const [sym, sIdx] of Object.entries(planetSigns)) {
      if (typeof sIdx === 'number' && sIdx >= 1 && sIdx <= 12) {
        planetsBySign[sIdx].push(sym as PlanetSymbol);
      }
    }

    const ARGALA_PAIRS = [
      { argalaRel: 2, virodhaRel: 12 },
      { argalaRel: 4, virodhaRel: 10 },
      { argalaRel: 11, virodhaRel: 3 },
      { argalaRel: 5, virodhaRel: 9 },
    ];

    for (let h = 1; h <= 12; h++) {
      const targetSignIndex = ((ascendantRashiIndex - 1 + (h - 1)) % 12) + 1;

      const interveningHouses: ArgalaDetail['interveningHouses'] = [];
      const obstructingHouses: ArgalaDetail['obstructingHouses'] = [];

      let hasIntervention = false;
      let totalArgalaWeight = 0;
      let totalObstructionWeight = 0;
      let beneficCount = 0;
      let maleficCount = 0;

      for (const pair of ARGALA_PAIRS) {
        const argalaSign = ((targetSignIndex - 1 + (pair.argalaRel - 1)) % 12) + 1;
        const virodhaSign = ((targetSignIndex - 1 + (pair.virodhaRel - 1)) % 12) + 1;

        const argalaPlanets = planetsBySign[argalaSign] || [];
        const virodhaPlanets = planetsBySign[virodhaSign] || [];

        if (argalaPlanets.length > 0) {
          hasIntervention = true;
          const isBenefic = argalaPlanets.some((p) => BENEFIC_PLANETS.has(p));
          interveningHouses.push({
            relativeHouse: pair.argalaRel,
            houseNumber: ((h - 1 + (pair.argalaRel - 1)) % 12) + 1,
            planets: argalaPlanets,
            isBenefic,
          });

          for (const p of argalaPlanets) {
            if (BENEFIC_PLANETS.has(p)) beneficCount++;
            else maleficCount++;
            totalArgalaWeight += 1;
          }
        }

        if (virodhaPlanets.length > 0) {
          obstructingHouses.push({
            relativeHouse: pair.virodhaRel,
            houseNumber: ((h - 1 + (pair.virodhaRel - 1)) % 12) + 1,
            planets: virodhaPlanets,
          });
          totalObstructionWeight += virodhaPlanets.length;
        }
      }

      const isObstructed = totalObstructionWeight >= totalArgalaWeight && totalArgalaWeight > 0;
      let argalaType: 'SHUBHA' | 'PAPA' | 'MIXED' | 'NONE' = 'NONE';
      if (hasIntervention) {
        if (beneficCount > 0 && maleficCount === 0) argalaType = 'SHUBHA';
        else if (maleficCount > 0 && beneficCount === 0) argalaType = 'PAPA';
        else if (beneficCount > 0 && maleficCount > 0) argalaType = 'MIXED';
      }

      results.push({
        houseNumber: h,
        targetSignIndex,
        argalaType,
        interveningHouses,
        obstructingHouses,
        isObstructed,
        netArgalaScore: Math.max(0, totalArgalaWeight - totalObstructionWeight),
      });
    }

    return results;
  }
}
