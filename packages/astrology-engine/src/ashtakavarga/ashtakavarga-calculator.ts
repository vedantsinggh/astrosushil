import { AstroChart } from '../chart/astro-chart.types';
import {
  ASHTAKAVARGA_PLANETS,
  AshtakavargaPlanet,
  AshtakavargaResult,
  BhinnashtakavargaTable,
  ShodhanaTable,
  ShodhyaPinda,
} from './ashtakavarga.types';
import { calculateBhinnashtakavarga } from './bav-calculator';
import { calculateSarvashtakavarga } from './sav-calculator';
import { calculateShodhana } from './shodhana-calculator';
import { calculateShodhyaPinda } from './pinda-calculator';

export class AshtakavargaCalculator {
  /**
   * Computes complete, deterministic Ashtakavarga:
   * 1. Bhinnashtakavarga (BAV) & Prastara matrices for all 7 physical Grahas.
   * 2. Sarvashtakavarga (SAV) aggregating 12 signs to exactly 337 points.
   * 3. Trikona and Ekadhipatya Shodhana reductions.
   * 4. Rashi, Graha, and Shodhya Pinda calculations.
   */
  public calculate(chart: AstroChart): AshtakavargaResult {
    const bav: Record<AshtakavargaPlanet, BhinnashtakavargaTable> = {} as any;
    for (const planet of ASHTAKAVARGA_PLANETS) {
      bav[planet] = calculateBhinnashtakavarga(planet, chart);
    }

    const sav = calculateSarvashtakavarga(bav);

    const shodhana: Record<AshtakavargaPlanet, ShodhanaTable> = {} as any;
    for (const planet of ASHTAKAVARGA_PLANETS) {
      shodhana[planet] = calculateShodhana(planet, bav[planet].signList, chart);
    }

    const pinda: Record<AshtakavargaPlanet, ShodhyaPinda> = {} as any;
    for (const planet of ASHTAKAVARGA_PLANETS) {
      pinda[planet] = calculateShodhyaPinda(planet, shodhana[planet].ekadhipatyaReduced, chart);
    }

    return {
      bav,
      sav,
      shodhana,
      pinda,
    };
  }

  /**
   * Convenience method mirroring calculate()
   */
  public calculateAshtakavarga(chart: AstroChart): AshtakavargaResult {
    return this.calculate(chart);
  }
}
