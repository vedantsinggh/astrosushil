/**
 * Bhrigu Bindu (ADR-016 §6 / Q6, provisional – pending client review).
 *
 * Standard published definition: the midpoint of the Moon and Rahu, taking the arc measured
 * zodiacally FROM Rahu TO the Moon:  BB = Rahu + ((Moon - Rahu) mod 360) / 2.
 * The node (mean/true) follows the AstrologyConfig passed to the chart calculation.
 */
import { AstroChart } from '../chart/astro-chart.types';
import { ChartCalculator } from '../chart/chart-calculator';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { BirthDetails } from '../input/birth-details';
import { normalizeDegree, EPSILON } from '../coordinates/angular-math';
import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS, getRashiIndex } from '../zodiac/rashi';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { EXTRA_VARGA_PROVISIONAL_LABEL } from './extra-varga';

export const BHRIGU_BINDU_SOURCE =
  'Bhrigu Bindu = midpoint of Moon and Rahu, arc taken from Rahu to Moon in zodiacal order: (Moon + Rahu)/2 with Moon taken as Moon + 360 when Moon < Rahu; as popularised in The Astrological Magazine and implemented in Jagannatha Hora (P.V.R. Narasimha Rao)';

export const BHRIGU_BINDU_CONVENTION_NOTES: readonly string[] = [
  'Arc from Rahu to Moon (zodiacal) is used. Alternative: midpoint of the shorter arc between Moon and Rahu; it differs by exactly 180 degrees whenever the Rahu-to-Moon arc exceeds 180 degrees (shorterArcLongitude is given for reference).',
  'Rahu longitude follows the configured node method (mean/true).',
];

export interface BhriguBinduResult {
  longitude: number;
  rashiIndex: number;
  rashiName: string;
  degreeInSign: number;
  nakshatra: string;
  nakshatraIndex: number;
  pada: number;
  moonLongitude: number;
  rahuLongitude: number;
  /** Arc from Rahu to Moon, zodiacal, [0, 360). */
  arcRahuToMoon: number;
  /** Midpoint on the shorter arc (alternative convention, for reference only). */
  shorterArcLongitude: number;
  provisional: true;
  provisionalLabel: string;
  source: string;
  conventionNotes: string[];
}

/** Pure Bhrigu Bindu longitude from Moon and Rahu longitudes (degrees). */
export function computeBhriguBinduLongitude(moonLongitude: number, rahuLongitude: number): number {
  const arc = normalizeDegree(moonLongitude - rahuLongitude);
  return normalizeDegree(rahuLongitude + arc / 2);
}

function shorterArcMidpoint(a: number, b: number): number {
  const arc = normalizeDegree(a - b);
  return arc <= 180 ? normalizeDegree(b + arc / 2) : normalizeDegree(a + (360 - arc) / 2);
}

export function bhriguBinduFromLongitudes(moonLongitude: number, rahuLongitude: number): BhriguBinduResult {
  const moon = normalizeDegree(moonLongitude);
  const rahu = normalizeDegree(rahuLongitude);
  const lon = computeBhriguBinduLongitude(moon, rahu);
  const sign = getRashiIndex(lon);
  const nak = getNakshatraByLongitude(lon);
  return {
    longitude: lon,
    rashiIndex: sign,
    rashiName: RASHIS[sign - 1].sanskritName,
    degreeInSign: Math.min(30 - EPSILON, Math.max(0, lon - (sign - 1) * 30)),
    nakshatra: nak.name,
    nakshatraIndex: nak.index,
    pada: getPada(lon),
    moonLongitude: moon,
    rahuLongitude: rahu,
    arcRahuToMoon: normalizeDegree(moon - rahu),
    shorterArcLongitude: shorterArcMidpoint(moon, rahu),
    provisional: true,
    provisionalLabel: EXTRA_VARGA_PROVISIONAL_LABEL,
    source: BHRIGU_BINDU_SOURCE,
    conventionNotes: [...BHRIGU_BINDU_CONVENTION_NOTES],
  };
}

export class BhriguBinduCalculator {
  constructor(private readonly chartCalculator: ChartCalculator = new ChartCalculator()) {}

  public calculateFromChart(chart: AstroChart): BhriguBinduResult {
    const moon = chart.planets[PlanetSymbol.MOON];
    const rahu = chart.planets[PlanetSymbol.RAHU];
    if (!moon || !rahu) throw new Error('Bhrigu Bindu requires Moon and Rahu positions');
    return bhriguBinduFromLongitudes(moon.longitude, rahu.longitude);
  }

  public async calculate(details: BirthDetails, config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG): Promise<BhriguBinduResult> {
    return this.calculateFromChart(await this.chartCalculator.calculateChart(details, config));
  }
}
