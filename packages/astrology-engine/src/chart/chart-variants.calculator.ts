import { AstroChart } from './astro-chart.types';
import { normalizeAstroChart } from './chart-normalizer';
import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS, getRashiByLongitude, getDegreeInRashi } from '../zodiac/rashi';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { normalizeDegree } from '../coordinates/angular-math';
import {
  ChartVariantType,
  ChartVariantSummary,
  ChartVariantsCollection,
} from './chart-variants.types';
import { VargaCalculator } from '../varga/varga-calculator';
import { JaiminiCalculator } from '../jaimini/jaimini-calculator';
import { calculateHouseAngles, calculateSripatiBhavas, houseOfLongitude } from '../houses/house-cusps';
import { computeAyanamsa, resolveAyanamsaSystem } from '../ayanamsa/ayanamsa';
import { AstrologyEngineError } from '../errors/astrology.error';

export class ChartVariantsCalculator {
  private vargaCalculator: VargaCalculator;
  private jaiminiCalculator: JaiminiCalculator;

  constructor(
    vargaCalculator?: VargaCalculator,
    jaiminiCalculator?: JaiminiCalculator
  ) {
    this.vargaCalculator = vargaCalculator || new VargaCalculator();
    this.jaiminiCalculator = jaiminiCalculator || new JaiminiCalculator(this.vargaCalculator);
  }

  /**
   * Helper to derive an AstroChart with an altered Ascendant point.
   */
  private deriveChartWithAscendant(
    baseChart: AstroChart,
    ascendantLongitude: number,
    ascendantName: string = 'Ascendant'
  ): AstroChart {
    const normAsc = normalizeDegree(ascendantLongitude);
    const ascRashiDef = getRashiByLongitude(normAsc);
    const ascNakDef = getNakshatraByLongitude(normAsc);
    const ascPada = getPada(normAsc);
    const ascDegInRashi = getDegreeInRashi(normAsc);

    const derivedAscendant = {
      name: ascendantName,
      longitude: normAsc,
      rashiIndex: ascRashiDef.index,
      degreeInRashi: ascDegInRashi,
      nakshatraIndex: ascNakDef.index,
      pada: ascPada,
      nakshatraLord: ascNakDef.lord,
    };

    return {
      ...baseChart,
      ascendant: derivedAscendant,
    };
  }

  /**
   * Computes all canonical Chart Variants from a base AstroChart.
   */
  public calculateAllVariants(baseChart: AstroChart): ChartVariantsCollection {
    const normNatal = normalizeAstroChart(baseChart);
    const natalAscLong = baseChart.ascendant?.longitude ?? 0;
    const natalAscRashi = baseChart.ascendant?.rashiIndex ?? 1;

    // 1. Rashi Chart (D1)
    const rashiSummary: ChartVariantSummary = {
      variantType: 'RASHI',
      title: 'Rashi Chart (D1)',
      sanskritTitle: 'Lagna Kundli',
      referenceSignIndex: natalAscRashi,
      referenceSignName: RASHIS[natalAscRashi - 1].sanskritName,
      referenceLongitude: natalAscLong,
      chart: normNatal,
    };

    // 2. Sun Chart (Surya Lagna)
    const sunPos = baseChart.planets[PlanetSymbol.SUN];
    const sunLong = sunPos?.longitude ?? 0;
    const sunRashi = sunPos?.rashiIndex ?? 1;
    const sunChartBase = this.deriveChartWithAscendant(baseChart, sunLong, 'Surya Lagna');
    const sunChart = normalizeAstroChart(sunChartBase);
    const sunSummary: ChartVariantSummary = {
      variantType: 'SUN_CHART',
      title: 'Sun Chart',
      sanskritTitle: 'Surya Kundli',
      referenceSignIndex: sunRashi,
      referenceSignName: RASHIS[sunRashi - 1].sanskritName,
      referenceLongitude: sunLong,
      chart: sunChart,
    };

    // 3. Moon Chart (Chandra Lagna)
    const moonPos = baseChart.planets[PlanetSymbol.MOON];
    const moonLong = moonPos?.longitude ?? 0;
    const moonRashi = moonPos?.rashiIndex ?? 1;
    const moonChartBase = this.deriveChartWithAscendant(baseChart, moonLong, 'Chandra Lagna');
    const moonChart = normalizeAstroChart(moonChartBase);
    const moonSummary: ChartVariantSummary = {
      variantType: 'MOON_CHART',
      title: 'Moon Chart',
      sanskritTitle: 'Chandra Kundli',
      referenceSignIndex: moonRashi,
      referenceSignName: RASHIS[moonRashi - 1].sanskritName,
      referenceLongitude: moonLong,
      chart: moonChart,
    };

    // 4. Karakamsha Chart (Navamsha sign of Atmakaraka)
    const jaiminiReport = this.jaiminiCalculator.calculateFromChart(baseChart, 'SEVEN_KARAKA');
    const klRashiIndex = jaiminiReport.karakamsha.karakamshaRashiIndex;
    const klLongitude = (klRashiIndex - 1) * 30 + 15; // Midpoint of Karakamsha sign
    const klChartBase = this.deriveChartWithAscendant(baseChart, klLongitude, 'Karakamsha Lagna');
    const klChart = normalizeAstroChart(klChartBase);
    const karakamshaSummary: ChartVariantSummary = {
      variantType: 'KARAKAMSHA_CHART',
      title: 'Karakamsha Chart',
      sanskritTitle: 'Karakamsha Kundli',
      referenceSignIndex: klRashiIndex,
      referenceSignName: RASHIS[klRashiIndex - 1].sanskritName,
      referenceLongitude: klLongitude,
      chart: klChart,
    };

    // 5. Sunrise Chart (Arka Lagna / Chart at exact Sunrise)
    const sunriseLongitude = (Math.floor(sunLong / 30)) * 30; // Cusp of Sun's sign
    const sunriseChartBase = this.deriveChartWithAscendant(baseChart, sunriseLongitude, 'Sunrise Lagna');
    const sunriseChart = normalizeAstroChart(sunriseChartBase);
    const sunriseSummary: ChartVariantSummary = {
      variantType: 'SUNRISE_CHART',
      title: 'Sunrise Chart',
      sanskritTitle: 'Arka / Suryodaya Kundli',
      referenceSignIndex: Math.floor(sunLong / 30) + 1,
      referenceSignName: RASHIS[Math.floor(sunLong / 30)].sanskritName,
      referenceLongitude: sunriseLongitude,
      chart: sunriseChart,
    };

    // 6. Bhava Equal (Equal houses with start degree = Ascendant degree)
    const bhavaEqualChart = this.buildEqualBhavaChart(normNatal, natalAscLong);
    const bhavaEqualSummary: ChartVariantSummary = {
      variantType: 'BHAVA_EQUAL',
      title: 'Equal Bhava Chart',
      sanskritTitle: 'Sama Bhava Chalit',
      referenceSignIndex: natalAscRashi,
      referenceSignName: RASHIS[natalAscRashi - 1].sanskritName,
      referenceLongitude: natalAscLong,
      chart: bhavaEqualChart,
    };

    // 7. Bhava Sripati (Sripati unequal house chalit)
    const bhavaSripatiChart = this.buildSripatiBhavaChart(normNatal, natalAscLong, resolveMidheavenLongitude(baseChart));
    const bhavaSripatiSummary: ChartVariantSummary = {
      variantType: 'BHAVA_SRIPATI',
      title: 'Sripati Bhava Chalit Chart',
      sanskritTitle: 'Sripati Bhava Madhya Chart',
      referenceSignIndex: natalAscRashi,
      referenceSignName: RASHIS[natalAscRashi - 1].sanskritName,
      referenceLongitude: natalAscLong,
      chart: bhavaSripatiChart,
    };

    return {
      rashi: rashiSummary,
      sunChart: sunSummary,
      moonChart: moonSummary,
      karakamshaChart: karakamshaSummary,
      sunriseChart: sunriseSummary,
      bhavaEqual: bhavaEqualSummary,
      bhavaSripati: bhavaSripatiSummary,
    };
  }

  private buildEqualBhavaChart(baseNorm: any, ascLong: number): any {
    const houses: any[] = [];
    for (let h = 1; h <= 12; h++) {
      const cuspLong = normalizeDegree(ascLong + (h - 1) * 30);
      const startLong = normalizeDegree(cuspLong - 15);
      const endLong = normalizeDegree(cuspLong + 15);
      const rashiDef = getRashiByLongitude(cuspLong);

      houses.push({
        number: h,
        sign: rashiDef.englishName,
        rashiIndex: rashiDef.index,
        lord: rashiDef.ruler,
        occupants: [],
        cuspLongitude: Number(cuspLong.toFixed(4)),
        startLongitude: Number(startLong.toFixed(4)),
        endLongitude: Number(endLong.toFixed(4)),
        status: 'VERIFIED',
      });
    }

    return {
      ...baseNorm,
      houses,
    };
  }

  /**
   * Sripati Bhava Chalit (client decision ADR-017; B.V. Raman, "A Manual of Hindu Astrology"
   * ch. X §§83-90): bhava madhyas from the real Lagna and MC by quadrant trisection, bhava
   * sandhis at the midpoints of consecutive madhyas, and each planet placed in the bhava whose
   * [arambha sandhi, next arambha sandhi) interval contains it.
   */
  private buildSripatiBhavaChart(baseNorm: any, ascLong: number, mcLong: number): any {
    const { madhya, arambhaSandhi } = calculateSripatiBhavas(ascLong, mcLong);

    const planets = (baseNorm.planets || []).map((p: any) => ({
      ...p,
      house: houseOfLongitude(p.absoluteDegree, arambhaSandhi),
    }));

    const houses: any[] = [];
    for (let h = 1; h <= 12; h++) {
      const cuspLong = madhya[h - 1];
      const rashiDef = getRashiByLongitude(cuspLong);
      houses.push({
        number: h,
        sign: rashiDef.englishName,
        rashiIndex: rashiDef.index,
        lord: rashiDef.ruler,
        occupants: planets.filter((p: any) => p.house === h).map((p: any) => p.name),
        cuspLongitude: Number(cuspLong.toFixed(4)),
        startLongitude: Number(arambhaSandhi[h - 1].toFixed(4)),
        endLongitude: Number(arambhaSandhi[h % 12].toFixed(4)),
        status: 'VERIFIED',
      });
    }

    return {
      ...baseNorm,
      planets,
      houses,
    };
  }
}

/**
 * The chart's MC in its own zodiac: `chart.midheaven` (engine 0.2.0), else recomputed from the
 * chart's time and place with the chart's mean ayanamsa (same formulas as ChartCalculator).
 */
function resolveMidheavenLongitude(chart: AstroChart): number {
  if (chart.midheaven && typeof chart.midheaven.longitude === 'number') return chart.midheaven.longitude;
  const jd = chart.metadata?.normalizedTime?.julianDayUT;
  const lat = chart.birthDetails?.latitude;
  const lon = chart.birthDetails?.longitude;
  if (typeof jd !== 'number' || typeof lat !== 'number' || typeof lon !== 'number') {
    throw new AstrologyEngineError('Sripati Bhava Chalit needs the chart birth time and place to compute the MC.');
  }
  const angles = calculateHouseAngles(jd, lat, lon);
  const sidereal = chart.metadata.config?.zodiacType !== 'TROPICAL';
  const mean = chart.metadata.ayanamsa
    ? chart.metadata.ayanamsa.meanDegrees
    : sidereal
      ? computeAyanamsa(jd, resolveAyanamsaSystem(chart.metadata.config?.ayanamsa)).meanDegrees
      : 0;
  return normalizeDegree(angles.mcTropical - mean);
}
