/**
 * Pushkara Navamsha and Pushkara Bhaga (ADR-016 §6, provisional – pending client review).
 *
 * Pushkara Navamsha: in each element the navamsas that fall in signs of the natural benefics
 * (Venus, Jupiter, Moon, Mercury) are "pushkara". Standard published table:
 *   Fire  (Aries, Leo, Sagittarius):     7th navamsa (Libra, 20°00'–23°20') and 9th (Sagittarius, 26°40'–30°00')
 *   Earth (Taurus, Virgo, Capricorn):    3rd navamsa (Pisces, 6°40'–10°00') and 5th (Taurus, 13°20'–16°40')
 *   Air   (Gemini, Libra, Aquarius):     6th navamsa (Pisces, 16°40'–20°00') and 8th (Taurus, 23°20'–26°40')
 *   Water (Cancer, Scorpio, Pisces):     1st navamsa (Cancer, 0°00'–3°20') and 3rd (Virgo, 6°40'–10°00')
 *
 * Pushkara Bhaga: one degree per sign, standard published table
 *   Ar 21, Ta 14, Ge 18, Cn 8, Le 19, Vi 9, Li 24, Sc 11, Sg 23, Cp 14, Aq 19, Pi 9.
 */
import { AstroChart } from '../chart/astro-chart.types';
import { ChartCalculator } from '../chart/chart-calculator';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { BirthDetails } from '../input/birth-details';
import { normalizeDegree, EPSILON } from '../coordinates/angular-math';
import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS, getRashiIndex } from '../zodiac/rashi';
import { VargaCalculator } from '../varga/varga-calculator';
import { EXTRA_VARGA_PROVISIONAL_LABEL } from './extra-varga';

export const PUSHKARA_SOURCE =
  'Standard published Pushkara Navamsha table (benefic-ruled navamsas per element: fire 7th & 9th, earth 3rd & 5th, air 6th & 8th, water 1st & 3rd) and Pushkara Bhaga table (Ar 21, Ta 14, Ge 18, Cn 8, Le 19, Vi 9, Li 24, Sc 11, Sg 23, Cp 14, Aq 19, Pi 9), as reproduced in Jagannatha Hora (P.V.R. Narasimha Rao) and in muhurta literature following B.V. Raman, "Muhurtha (Electional Astrology)"';

/** Pushkara navamsa ordinals (1–9) per sign index 1–12 (index 0 unused). */
export const PUSHKARA_NAVAMSA_TABLE: Readonly<Record<number, readonly number[]>> = {
  1: [7, 9], 5: [7, 9], 9: [7, 9], // fire
  2: [3, 5], 6: [3, 5], 10: [3, 5], // earth
  3: [6, 8], 7: [6, 8], 11: [6, 8], // air
  4: [1, 3], 8: [1, 3], 12: [1, 3], // water
};

/** Pushkara Bhaga degree per sign index 1–12 (array index = sign - 1). */
export const PUSHKARA_BHAGA_TABLE: readonly number[] = [21, 14, 18, 8, 19, 9, 24, 11, 23, 14, 19, 9];

export const PUSHKARA_CONVENTION_NOTES: readonly string[] = [
  'Pushkara Bhaga: a body is flagged when it lies within the bhaga-th degree of the sign, i.e. degreeInSign in [bhaga - 1, bhaga) (ordinal reading, as for Mrityu Bhaga degrees). distanceFromBhaga (degreeInSign - bhaga) is also given for users who apply an orb around the exact degree.',
  'Alternative Pushkara Bhaga table (element-based): fire signs 21, earth 14, air 24, water 7.',
  'Some sources list Cancer 7 instead of 8 in the per-sign Pushkara Bhaga table.',
  'Pushkara Navamsha table has no widely published variant; it is asserted against the benefic-sign rule in the tests.',
];

export interface PushkaraBodyStatus {
  body: PlanetSymbol | 'Ascendant';
  longitude: number;
  rashiIndex: number;
  rashiName: string;
  degreeInSign: number;
  navamsaNumber: number; // 1–9 inside the sign
  navamsaSign: number; // 1–12
  navamsaSignName: string;
  inPushkaraNavamsa: boolean;
  pushkaraNavamsas: number[]; // pushkara navamsa ordinals of this sign
  pushkaraBhaga: number; // degree of this sign
  distanceFromBhaga: number; // degreeInSign - pushkaraBhaga (degrees)
  inPushkaraBhaga: boolean;
}

export interface PushkaraTableRow {
  rashiIndex: number;
  rashiName: string;
  pushkaraNavamsas: { navamsaNumber: number; fromDegree: number; toDegree: number; navamsaSign: number; navamsaSignName: string }[];
  pushkaraBhaga: number;
}

export interface PushkaraResult {
  bodies: PushkaraBodyStatus[];
  table: PushkaraTableRow[];
  provisional: true;
  provisionalLabel: string;
  source: string;
  conventionNotes: string[];
}

const vargaCalc = new VargaCalculator();

/** Pushkara status of one sidereal longitude. Pure, deterministic. */
export function evaluatePushkara(body: PlanetSymbol | 'Ascendant', longitude: number): PushkaraBodyStatus {
  const norm = normalizeDegree(longitude);
  const sign = getRashiIndex(norm);
  const deg = Math.min(30 - EPSILON, Math.max(0, norm - (sign - 1) * 30));
  const navamsaNumber = Math.min(9, Math.floor((deg * 9) / 30 + EPSILON) + 1);
  const navamsaSign = vargaCalc.calculateLongitudeVarga(norm, 'D9');
  const pushkaraNavamsas = [...PUSHKARA_NAVAMSA_TABLE[sign]];
  const bhaga = PUSHKARA_BHAGA_TABLE[sign - 1];
  return {
    body,
    longitude: norm,
    rashiIndex: sign,
    rashiName: RASHIS[sign - 1].sanskritName,
    degreeInSign: deg,
    navamsaNumber,
    navamsaSign,
    navamsaSignName: RASHIS[navamsaSign - 1].sanskritName,
    inPushkaraNavamsa: pushkaraNavamsas.includes(navamsaNumber),
    pushkaraNavamsas,
    pushkaraBhaga: bhaga,
    distanceFromBhaga: deg - bhaga,
    inPushkaraBhaga: deg >= bhaga - 1 && deg < bhaga,
  };
}

/** The reference table (12 rows), for display. */
export function pushkaraReferenceTable(): PushkaraTableRow[] {
  return RASHIS.map((r) => ({
    rashiIndex: r.index,
    rashiName: r.sanskritName,
    pushkaraNavamsas: PUSHKARA_NAVAMSA_TABLE[r.index].map((n) => {
      const fromDegree = ((n - 1) * 30) / 9;
      const navamsaSign = vargaCalc.calculateLongitudeVarga((r.index - 1) * 30 + fromDegree + 1e-6, 'D9');
      return { navamsaNumber: n, fromDegree, toDegree: (n * 30) / 9, navamsaSign, navamsaSignName: RASHIS[navamsaSign - 1].sanskritName };
    }),
    pushkaraBhaga: PUSHKARA_BHAGA_TABLE[r.index - 1],
  }));
}

export class PushkaraCalculator {
  constructor(private readonly chartCalculator: ChartCalculator = new ChartCalculator()) {}

  public calculateFromChart(chart: AstroChart): PushkaraResult {
    const bodies: PushkaraBodyStatus[] = [];
    if (chart.ascendant) bodies.push(evaluatePushkara('Ascendant', chart.ascendant.longitude));
    for (const [sym, pos] of Object.entries(chart.planets)) {
      if (!pos || typeof pos.longitude !== 'number') continue;
      bodies.push(evaluatePushkara(sym as PlanetSymbol, pos.longitude));
    }
    return {
      bodies,
      table: pushkaraReferenceTable(),
      provisional: true,
      provisionalLabel: EXTRA_VARGA_PROVISIONAL_LABEL,
      source: PUSHKARA_SOURCE,
      conventionNotes: [...PUSHKARA_CONVENTION_NOTES],
    };
  }

  public async calculate(details: BirthDetails, config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG): Promise<PushkaraResult> {
    return this.calculateFromChart(await this.chartCalculator.calculateChart(details, config));
  }
}
