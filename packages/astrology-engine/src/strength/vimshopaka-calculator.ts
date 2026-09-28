import { PlanetSymbol, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { AstroChart } from '../chart/astro-chart.types';
import { VargaType, CANONICAL_VARGAS } from '../varga/varga.types';
import { VargaCalculator } from '../varga/varga-calculator';
import { calculatePlanetaryDignity } from '../planets/planetary-dignity';
import { RASHIS } from '../zodiac/rashi';
import {
  VargaDignityPlacement,
  PlanetaryVimshopakaScore,
  VimshopakaBalaReport,
} from './vimshopaka.types';
import {
  SHODASHAVARGA_WEIGHTS,
  SHADVARGA_WEIGHTS,
  SAPTAVARGA_WEIGHTS,
  DASHAVARGA_WEIGHTS,
  dignityToScore,
  getVaisheshikamsaCategory,
} from './shodashvarga-summary';
import { RashmiCalculator } from './rashmi-calculator';

export class VimshopakaCalculator {
  private vargaCalculator: VargaCalculator;

  constructor(vargaCalculator?: VargaCalculator) {
    this.vargaCalculator = vargaCalculator || new VargaCalculator();
  }

  /**
   * Computes complete Vimshopaka Bala, 16-Varga dignity matrix, Vaisheshikamsa, and Rashmis.
   */
  public calculateVimshopaka(chart: AstroChart): VimshopakaBalaReport {
    // 1. Calculate all 16 canonical Varga charts
    const vargaCharts: Partial<Record<VargaType, any>> = {};
    for (const vType of CANONICAL_VARGAS) {
      vargaCharts[vType] = this.vargaCalculator.calculateVarga(chart, vType);
    }

    const planetsReport: Record<string, PlanetaryVimshopakaScore> = {};

    const PHYSICAL_SEVEN = [
      PlanetSymbol.SUN,
      PlanetSymbol.MOON,
      PlanetSymbol.MARS,
      PlanetSymbol.MERCURY,
      PlanetSymbol.JUPITER,
      PlanetSymbol.VENUS,
      PlanetSymbol.SATURN,
    ];

    for (const sym of PHYSICAL_SEVEN) {
      const placements: VargaDignityPlacement[] = [];

      let shadSum = 0;
      let saptaSum = 0;
      let dashaSum = 0;
      let shodashaSum = 0;
      let goodVargasCount = 0;

      for (const vType of CANONICAL_VARGAS) {
        const vChart = vargaCharts[vType];
        const vPlacement = vChart?.placements[sym];
        const rashiIndex = vPlacement?.rashiIndex ?? 1;
        const degreeInVarga = vPlacement?.degreeInVarga ?? 0;
        const rashiDef = RASHIS[rashiIndex - 1];

        // Map planetary positions in this varga for temporal relationships
        const vargaPosMap: Partial<Record<PlanetSymbol, { rashiIndex: number }>> = {};
        for (const pSym of PHYSICAL_SEVEN) {
          if (vChart?.placements[pSym]) {
            vargaPosMap[pSym] = { rashiIndex: vChart.placements[pSym].rashiIndex };
          }
        }

        const dignity = calculatePlanetaryDignity(sym, rashiIndex, degreeInVarga, vargaPosMap);
        const rawScore = dignityToScore(dignity);
        const weight = SHODASHAVARGA_WEIGHTS[vType] ?? 0.5;
        const weightedScore = (rawScore * weight) / 20;

        if (['EXALTED', 'MOOLATRIKONA', 'OWN_SIGN'].includes(dignity)) {
          goodVargasCount++;
        }

        shodashaSum += (rawScore * weight);

        if (SHADVARGA_WEIGHTS[vType]) {
          shadSum += (rawScore * SHADVARGA_WEIGHTS[vType]);
        }
        if (SAPTAVARGA_WEIGHTS[vType]) {
          saptaSum += (rawScore * SAPTAVARGA_WEIGHTS[vType]);
        }
        if (DASHAVARGA_WEIGHTS[vType]) {
          dashaSum += (rawScore * DASHAVARGA_WEIGHTS[vType]);
        }

        placements.push({
          varga: vType,
          rashiIndex,
          rashiName: rashiDef.sanskritName,
          degreeInVarga: Number(degreeInVarga.toFixed(2)),
          dignity,
          dignityScore: rawScore,
          weight,
          weightedScore: Number(weightedScore.toFixed(2)),
        });
      }

      const shadvargaScore = Number((shadSum / 20).toFixed(2));
      const saptavargaScore = Number((saptaSum / 20).toFixed(2));
      const dashavargaScore = Number((dashaSum / 20).toFixed(2));
      const shodashavargaScore = Number((shodashaSum / 20).toFixed(2));
      const vaisheshikamsaCategory = getVaisheshikamsaCategory(goodVargasCount);

      planetsReport[sym] = {
        planet: sym,
        shadvargaScore,
        saptavargaScore,
        dashavargaScore,
        shodashavargaScore,
        shodashavargaPlacements: placements,
        vaisheshikamsaCategory,
        goodVargasCount,
      };
    }

    // 2. Rashmi calculation
    const { rashmis, totalChartRays } = RashmiCalculator.calculatePlanetaryRashmis(chart);

    return {
      planets: planetsReport,
      rashmis,
      totalChartRays,
    };
  }
}
