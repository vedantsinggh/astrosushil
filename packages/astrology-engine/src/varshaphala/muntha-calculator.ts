import { RASHIS } from '../zodiac/rashi';
import { normalizeDegree } from '../coordinates/angular-math';
import { PlanetSymbol } from '../planets/planet.types';
import { CalculatedPoint } from '../houses/house.types';
import { AstroChart } from '../chart/astro-chart.types';
import { MunthaDetails } from './varshaphala.types';

/**
 * Deterministic Muntha calculator for Tajika Varshaphala.
 * Muntha is the annual sensitive point that starts at the natal Ascendant Rashi at birth
 * and advances by exactly one zodiac sign per completed year of life.
 */
export class MunthaCalculator {
  /**
   * Calculates Muntha details for a given age (completed years).
   */
  public calculateMuntha(
    natalLagnaRashiIndex: number,
    natalAscendantLongitude: number,
    varshaLagnaRashiIndex: number,
    completedYears: number
  ): MunthaDetails {
    if (completedYears < 0) {
      throw new Error(`Completed years (${completedYears}) cannot be negative`);
    }

    const progressionIndex = completedYears % 12;
    const munthaRashiIndex = ((natalLagnaRashiIndex - 1 + progressionIndex) % 12) + 1;
    const rashiDef = RASHIS[munthaRashiIndex - 1];
    const natalLagnaRashiDef = RASHIS[natalLagnaRashiIndex - 1];

    const degreeInRashi = normalizeDegree(natalAscendantLongitude) % 30;
    const munthaLongitude = (munthaRashiIndex - 1) * 30 + degreeInRashi;

    const lord = rashiDef.ruler as PlanetSymbol;
    const houseInVarshaChart = ((munthaRashiIndex - varshaLagnaRashiIndex + 12) % 12) + 1;
    const houseInNatalChart = ((munthaRashiIndex - natalLagnaRashiIndex + 12) % 12) + 1;

    return {
      rashiIndex: munthaRashiIndex,
      rashiName: rashiDef.sanskritName,
      longitude: munthaLongitude,
      degreeInRashi,
      lord,
      houseInVarshaChart,
      houseInNatalChart,
      progressionYears: completedYears,
      progressionIndex,
      evidence: {
        natalLagnaRashiIndex,
        natalLagnaLongitude: natalAscendantLongitude,
        completedYears,
        formula: `Muntha = (Natal Lagna sign [${natalLagnaRashiDef.sanskritName}] + ${completedYears} completed years) mod 12 -> sign ${rashiDef.sanskritName} at degree ${degreeInRashi.toFixed(4)}°`,
      },
    };
  }

  /**
   * Static helper to compute Muntha from Natal Lagna, target year, birth year, and annual chart.
   */
  public static calculate(
    natalLagna: CalculatedPoint,
    targetYear: number,
    birthYear: number,
    annualChart: AstroChart
  ): MunthaDetails {
    const calc = new MunthaCalculator();
    const completedYears = targetYear - birthYear;
    const varshaLagnaRashi = annualChart.ascendant?.rashiIndex ?? 1;

    return calc.calculateMuntha(
      natalLagna.rashiIndex,
      natalLagna.longitude,
      varshaLagnaRashi,
      completedYears
    );
  }
}
