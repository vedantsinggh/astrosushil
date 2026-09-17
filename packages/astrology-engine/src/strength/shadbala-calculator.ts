import { PlanetSymbol } from '../planets/planet.types';
import {
  SHADBALA_PLANETS,
  ShadbalaPlanet,
  PlanetShadbala,
  ShadbalaReport,
} from './strength.types';
import { AstroChart } from '../chart/astro-chart.types';
import { calculateSthanaBala } from './sthana-bala';
import { calculateDigBala } from './dig-bala';
import { calculateKalaBala } from './kala-bala';
import { calculateCheshtaBala } from './cheshta-bala';
import { calculateNaisargikaBala } from './naisargika-bala';
import { calculateDrikBala } from './drik-bala';
import { VargaCalculator } from '../varga/varga-calculator';

/**
 * Classical Minimum Required Strengths (in Shashtiamsas) according to BPHS Ch. 27:
 * - Sun: 390.0 (6.5 Rupas)
 * - Moon: 360.0 (6.0 Rupas)
 * - Mars: 300.0 (5.0 Rupas)
 * - Mercury: 420.0 (7.0 Rupas)
 * - Jupiter: 390.0 (6.5 Rupas)
 * - Venus: 330.0 (5.5 Rupas)
 * - Saturn: 300.0 (5.0 Rupas)
 */
export const SHADBALA_MINIMUM_REQUIREMENTS: Record<ShadbalaPlanet, number> = {
  [PlanetSymbol.SUN]: 390.0,
  [PlanetSymbol.MOON]: 360.0,
  [PlanetSymbol.MARS]: 300.0,
  [PlanetSymbol.MERCURY]: 420.0,
  [PlanetSymbol.JUPITER]: 390.0,
  [PlanetSymbol.VENUS]: 330.0,
  [PlanetSymbol.SATURN]: 300.0,
};

export class ShadbalaCalculator {
  private readonly vargaCalculator: VargaCalculator;

  constructor(vargaCalculator?: VargaCalculator) {
    this.vargaCalculator = vargaCalculator || new VargaCalculator();
  }

  public calculate(chart: AstroChart): ShadbalaReport {
    return this.calculateShadbala(chart);
  }

  /**
   * Computes complete Shadbala for all 7 physical planets in the natal chart.
   */
  public calculateShadbala(chart: AstroChart): ShadbalaReport {
    const rawResults: { planet: ShadbalaPlanet; data: Omit<PlanetShadbala, 'rank'> }[] = [];

    for (const planet of SHADBALA_PLANETS) {
      const pos = chart.planets[planet];
      if (!pos) continue;

      const sthanaBala = calculateSthanaBala(planet, chart, this.vargaCalculator);
      const digBala = calculateDigBala(planet, pos.longitude, chart);
      const kalaBala = calculateKalaBala(planet, chart);
      const cheshtaBala = calculateCheshtaBala(planet, chart);
      const naisargikaBala = calculateNaisargikaBala(planet);
      const drikBala = calculateDrikBala(planet, chart);

      const totalShashtiamsas = Number(
        (
          sthanaBala.total +
          digBala +
          kalaBala.total +
          cheshtaBala +
          naisargikaBala +
          drikBala
        ).toFixed(4)
      );

      const totalRupas = Number((totalShashtiamsas / 60.0).toFixed(4));
      const minReq = SHADBALA_MINIMUM_REQUIREMENTS[planet];
      const minReqRupas = Number((minReq / 60.0).toFixed(4));
      const ratio = Number((totalShashtiamsas / minReq).toFixed(4));
      const isStrong = ratio >= 1.0;

      rawResults.push({
        planet,
        data: {
          planet,
          totalShashtiamsas,
          totalRupas,
          sthanaBala,
          digBala,
          kalaBala,
          cheshtaBala,
          naisargikaBala,
          drikBala,
          minimumRequirement: minReq,
          minimumRequirementRupas: minReqRupas,
          ratio,
          isStrong,
        },
      });
    }

    // Rank descending by ratio (strength relative to requirement)
    rawResults.sort((a, b) => b.data.ratio - a.data.ratio);

    const summary: PlanetShadbala[] = [];
    const planetsMap: Partial<Record<PlanetSymbol, PlanetShadbala>> = {};

    for (let i = 0; i < rawResults.length; i++) {
      const item = rawResults[i];
      const fullItem: PlanetShadbala = {
        ...item.data,
        rank: i + 1,
      };
      summary.push(fullItem);
      planetsMap[item.planet] = fullItem;
    }

    return {
      planets: planetsMap,
      summary,
    };
  }
}
