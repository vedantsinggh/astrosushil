import { AstroChart } from '../chart/astro-chart.types';
import { NormalizedChart } from '../chart/normalized-chart.types';
import { normalizeAstroChart } from '../chart/chart-normalizer';
import { ConventionRegistry } from '../metadata/convention-registry';

export interface UnifiedAstrologyEvidenceQuery {
  category: 'PLANET' | 'HOUSE' | 'RASHI' | 'NAKSHATRA' | 'SPECIAL_POINT' | 'DASHA' | 'STRENGTH';
  targetIdentifier: string; // e.g. "JUPITER", "HOUSE_7", "MESHA", "ROHINI"
}

export interface UnifiedAstrologyEvidenceFact {
  source: string;
  calculation: string;
  value: any;
  convention: string;
  timestampIso: string;
  precision: number;
}

export class UnifiedAstrologyEvidenceBuilder {
  /**
   * Extracts strongly-typed, verifiable atomic facts from normalized chart data
   * for downstream consumption by prediction engines, reports, and Jyoti.
   */
  public static extractEvidence(
    chart: AstroChart,
    query: UnifiedAstrologyEvidenceQuery
  ): UnifiedAstrologyEvidenceFact | null {
    const norm = normalizeAstroChart(chart);
    const convention = ConventionRegistry.getConvention('PARASHARA');
    const timestampIso = norm.calculation.calculationTimestampIso;

    if (query.category === 'PLANET') {
      const p = norm.planets.find(
        (planet) => planet.name.toUpperCase() === query.targetIdentifier.toUpperCase()
      );
      if (!p) return null;

      return {
        source: 'Canonical Planetary Intelligence',
        calculation: 'Planetary Position & Dignity Evaluation',
        value: {
          planet: p.name,
          sign: p.sign,
          rashiIndex: p.rashiIndex,
          degree: p.degree,
          house: p.house,
          nakshatra: p.nakshatra,
          pada: p.pada,
          retrograde: p.retrograde,
          combust: p.combust,
          dignity: p.dignity,
          charaKaraka: p.charaKaraka,
          aspectsCast: p.aspectsCast,
          aspectsReceived: p.aspectsReceived,
        },
        convention: convention.tradition,
        timestampIso,
        precision: 0.0001,
      };
    }

    if (query.category === 'HOUSE') {
      const houseNum = parseInt(query.targetIdentifier.replace(/\D/g, ''), 10) || 1;
      const h = norm.houses.find((house) => house.number === houseNum);
      if (!h) return null;

      return {
        source: 'Canonical House System',
        calculation: 'Whole Sign House Placement & Occupancy',
        value: {
          houseNumber: h.number,
          sign: h.sign,
          rashiIndex: h.rashiIndex,
          lord: h.lord,
          occupants: h.occupants,
          cuspLongitude: h.cuspLongitude,
        },
        convention: convention.tradition,
        timestampIso,
        precision: 0.0001,
      };
    }

    return null;
  }
}
