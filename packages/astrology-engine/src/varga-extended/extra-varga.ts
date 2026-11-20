/**
 * Extra divisional charts (ADR-016 §6, provisional – pending client review):
 * D5 Panchamsa, D6 Shashtamsa, D8 Ashtamsa, D11 Rudramsa (Ekadasamsa), D81 Nava-navamsa,
 * D108 Ashtottaramsa, D144 Dwadas-dwadasamsa, D150 Nadiamsa.
 *
 * None of these eight is among the sixteen vargas of BPHS ch. 6, so each rule follows the most widely
 * published modern definition (cited per varga in EXTRA_VARGA_DEFINITIONS). Known alternative schemes
 * are recorded in each chart's `conventionNotes`.
 *
 * The output reuses the shape of the core `VargaChart` (src/varga) so the desktop ChartView can draw it;
 * only `vargaType` is widened to the extra codes.
 */
import { AstroChart } from '../chart/astro-chart.types';
import { ChartCalculator } from '../chart/chart-calculator';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { BirthDetails } from '../input/birth-details';
import { normalizeDegree, EPSILON } from '../coordinates/angular-math';
import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS, getRashiIndex } from '../zodiac/rashi';
import { VargaChart, VargaHousePlacement, VargaPlacement, VargaSignSummary } from '../varga/varga.types';

export type ExtraVargaType = 'D5' | 'D6' | 'D8' | 'D11' | 'D81' | 'D108' | 'D144' | 'D150';

export const EXTRA_VARGA_TYPES: readonly ExtraVargaType[] = ['D5', 'D6', 'D8', 'D11', 'D81', 'D108', 'D144', 'D150'];

export const EXTRA_VARGA_PROVISIONAL_LABEL = 'provisional – pending client review';

/** A placement in an extra varga; D150 also carries the Nadiamsa ordinal (1–150). */
export interface ExtraVargaPlacement extends VargaPlacement {
  /** Only for D150: the nadiamsa ordinal after the chara/sthira/dwiswabhava ordering (1 to 150). */
  nadiamsaNumber?: number;
}

export interface ExtraVargaChart extends Omit<VargaChart, 'vargaType' | 'placements' | 'ascendant'> {
  vargaType: ExtraVargaType;
  ascendant?: ExtraVargaPlacement;
  placements: Record<string, ExtraVargaPlacement>;
  provisional: true;
  provisionalLabel: string;
  source: string;
  conventionNotes: string[];
}

export interface ExtraVargaDefinition {
  vargaType: ExtraVargaType;
  division: number;
  name: string;
  calculationRule: string;
  source: string;
  conventionNotes: string[];
}

const PVRNR = 'P.V.R. Narasimha Rao, "Vedic Astrology: An Integrated Approach" (Sagar Publications, 2000), ch. 6 (divisional charts); same rule is the documented default of Jagannatha Hora';

export const EXTRA_VARGA_DEFINITIONS: Record<ExtraVargaType, ExtraVargaDefinition> = {
  D5: {
    vargaType: 'D5',
    division: 5,
    name: 'Panchamsa',
    calculationRule:
      '6-degree division: odd signs Aries, Aquarius, Sagittarius, Gemini, Libra (odd signs of Mars, Saturn, Jupiter, Mercury, Venus); even signs Taurus, Virgo, Pisces, Capricorn, Scorpio (even signs of Venus, Mercury, Jupiter, Saturn, Mars)',
    source: PVRNR,
    conventionNotes: [
      'Not one of the BPHS ch. 6 sixteen vargas; the lord sequence mirrors the Trimsamsa lords (Mars, Saturn, Jupiter, Mercury, Venus in odd signs, reversed in even signs) with equal 6-degree parts.',
      'Alternative 1 (some tables): odd signs Aries, Capricorn, Sagittarius, Gemini, Libra and even signs Taurus, Virgo, Pisces, Aquarius, Scorpio (Saturn sign swapped).',
      'Alternative 2 (parivritti / cyclic): parts counted continuously from Aries through the zodiac.',
    ],
  },
  D6: {
    vargaType: 'D6',
    division: 6,
    name: 'Shashtamsa',
    calculationRule: '5-degree division: odd signs count from Aries, even signs count from Libra',
    source: PVRNR,
    conventionNotes: ['Alternative (parivritti / cyclic): parts counted continuously from Aries (6 parts per sign).'],
  },
  D8: {
    vargaType: 'D8',
    division: 8,
    name: 'Ashtamsa',
    calculationRule: '3.75-degree division: movable signs count from Aries, fixed signs from Sagittarius, dual signs from Leo',
    source: PVRNR,
    conventionNotes: ['Alternative (parivritti / cyclic): parts counted continuously from Aries (8 parts per sign).'],
  },
  D11: {
    vargaType: 'D11',
    division: 11,
    name: 'Rudramsa (Ekadasamsa)',
    calculationRule:
      '30/11-degree division: count from Aries to the occupied sign, count the same number of signs backwards from Aries to get the starting sign, then the 11 parts run zodiacally from that starting sign',
    source: PVRNR,
    conventionNotes: [
      'Alternative 1 (some varga tables): odd signs count from Leo, even signs from Cancer.',
      'Alternative 2 (parivritti / cyclic): parts counted continuously from Aries (11 parts per sign).',
    ],
  },
  D81: {
    vargaType: 'D81',
    division: 81,
    name: 'Nava-navamsa',
    calculationRule:
      '30/81-degree division counted continuously through the zodiac from 0 Aries (navamsa of the navamsa): part q of sign s maps to sign ((81*(s-1)+q) mod 12)+1',
    source: `${PVRNR}; Prasna Marga (navamsa-of-navamsa: whole longitude multiplied by 81)`,
    conventionNotes: [
      'Navamsa-of-navamsa and continuous counting from Aries give the same sign because 81 = 9 x 9 and the navamsa itself counts continuously from Aries.',
    ],
  },
  D108: {
    vargaType: 'D108',
    division: 108,
    name: 'Ashtottaramsa',
    calculationRule:
      '30/108-degree division counted continuously through the zodiac from 0 Aries (parivritti); since 108 is a multiple of 12 every sign starts from Aries',
    source: PVRNR,
    conventionNotes: [
      'Alternative 1: navamsa of the dwadasamsa (D9 applied inside each D12 part).',
      'Alternative 2: dwadasamsa of the navamsa (D12 applied inside each D9 part).',
    ],
  },
  D144: {
    vargaType: 'D144',
    division: 144,
    name: 'Dwadas-dwadasamsa',
    calculationRule:
      'Dwadasamsa of the dwadasamsa: the 2.5-degree D12 part p1 gives sign s+p1; that part is again divided into 12 parts p2 counted from it: sign ((s-1+p1+p2) mod 12)+1',
    source: PVRNR,
    conventionNotes: [
      'Alternative (parivritti / cyclic): 144 parts per sign counted continuously from Aries (every sign then starts from Aries).',
    ],
  },
  D150: {
    vargaType: 'D150',
    division: 150,
    name: 'Nadiamsa',
    calculationRule:
      '0.2-degree division into 150 nadiamsas; ordinal counted directly in movable signs, in reverse in fixed signs, and from the 76th in dual signs; the n-th nadiamsa falls in the n-th sign counted from the occupied sign',
    source:
      'Nadiamsa ordering as in Chandra Kala Nadi (Deva Keralam), tr. R. Santhanam, introduction (direct in chara, reverse in sthira, from the middle/76th in dwiswabhava signs); D-150 sign placement as in Jagannatha Hora (P.V.R. Narasimha Rao)',
    conventionNotes: [
      'The nadiamsa ordinal (nadiamsaNumber) is the classically defined quantity; the sign placement of the n-th nadiamsa (counted from the occupied sign) is the software convention and needs client confirmation.',
      'Alternative sign placement: n-th nadiamsa counted from Aries.',
      'Some authors use unequal nadiamsa spans; equal 12-arc-minute spans are used here.',
      'degreeInVarga is measured zodiacally inside the 0.2-degree part, also in fixed and dual signs.',
    ],
  },
};

/**
 * 0-based index of the equal part (of n per sign) containing degreeInSign.
 * The tiny EPSILON absorbs floating-point representation error at exact boundaries
 * (e.g. 20 + 2/3 for a 30/9 boundary), so a longitude exactly on a boundary starts the new part.
 */
function partIndex(degreeInSign: number, n: number): number {
  return Math.min(n - 1, Math.max(0, Math.floor((degreeInSign * n) / 30 + EPSILON)));
}

const wrapSign = (zeroBased: number): number => (((zeroBased % 12) + 12) % 12) + 1;

const D5_ODD = [1, 11, 9, 3, 7];
const D5_EVEN = [2, 6, 12, 10, 8];

function signAndDegree(longitude: number): { sign: number; deg: number } {
  const norm = normalizeDegree(longitude);
  const sign = getRashiIndex(norm);
  const deg = Math.min(30 - EPSILON, Math.max(0, norm - (sign - 1) * 30));
  return { sign, deg };
}

/** Nadiamsa ordinal (1–150) for a sidereal longitude, per the chara/sthira/dwiswabhava ordering. */
export function extraVargaNadiamsaNumber(longitude: number): number {
  const { sign, deg } = signAndDegree(longitude);
  const k = partIndex(deg, 150);
  const modality = RASHIS[sign - 1].modality;
  if (modality === 'CHARA') return k + 1;
  if (modality === 'STHIRA') return 150 - k;
  return ((k + 75) % 150) + 1;
}

/** Sign (1–12) of a sidereal longitude in one of the extra vargas. Pure function, deterministic. */
export function extraVargaSign(longitude: number, vargaType: ExtraVargaType): number {
  const { sign: s, deg } = signAndDegree(longitude);
  const odd = s % 2 === 1;
  const modality = RASHIS[s - 1].modality;
  switch (vargaType) {
    case 'D5': {
      const p = partIndex(deg, 5);
      return odd ? D5_ODD[p] : D5_EVEN[p];
    }
    case 'D6':
      return wrapSign((odd ? 0 : 6) + partIndex(deg, 6));
    case 'D8': {
      const start = modality === 'CHARA' ? 1 : modality === 'STHIRA' ? 9 : 5;
      return wrapSign(start - 1 + partIndex(deg, 8));
    }
    case 'D11': {
      // Count s signs backwards from Aries (Aries itself = 1st): start = Aries - (s - 1).
      const start = wrapSign(-(s - 1));
      return wrapSign(start - 1 + partIndex(deg, 11));
    }
    case 'D81':
      return wrapSign(81 * (s - 1) + partIndex(deg, 81));
    case 'D108':
      return wrapSign(108 * (s - 1) + partIndex(deg, 108));
    case 'D144': {
      const q = partIndex(deg, 144);
      const p1 = Math.floor(q / 12);
      const p2 = q % 12;
      return wrapSign(s - 1 + p1 + p2);
    }
    case 'D150':
      return wrapSign(s - 1 + extraVargaNadiamsaNumber(longitude) - 1);
    default: {
      const never: never = vargaType;
      throw new Error(`Unsupported extra varga ${String(never)}`);
    }
  }
}

/** Relative degree [0, 30) inside the divisional sign (elapsed fraction of the equal part x 30). */
export function extraVargaDegree(longitude: number, vargaType: ExtraVargaType): number {
  const { deg } = signAndDegree(longitude);
  const n = EXTRA_VARGA_DEFINITIONS[vargaType].division;
  const p = partIndex(deg, n);
  const span = 30 / n;
  const inVarga = (Math.max(0, deg - p * span) / span) * 30;
  return Math.min(30 - EPSILON, Math.max(0, inVarga));
}

export class ExtraVargaCalculator {
  constructor(private readonly chartCalculator: ChartCalculator = new ChartCalculator()) {}

  /** Builds one extra varga chart from an already calculated natal chart. */
  public calculateFromChart(chart: AstroChart, vargaType: ExtraVargaType): ExtraVargaChart {
    const def = EXTRA_VARGA_DEFINITIONS[vargaType];
    const place = (planet: PlanetSymbol | 'Ascendant', longitude: number, ascSign: number, isRetrograde: boolean): ExtraVargaPlacement => {
      const rashiIndex = extraVargaSign(longitude, vargaType);
      const pl: ExtraVargaPlacement = {
        planet,
        rashiIndex,
        rashiName: RASHIS[rashiIndex - 1].sanskritName,
        degreeInVarga: extraVargaDegree(longitude, vargaType),
        sourceLongitude: longitude,
        house: ((rashiIndex - ascSign + 12) % 12) + 1,
        isRetrograde,
      };
      if (vargaType === 'D150') pl.nadiamsaNumber = extraVargaNadiamsaNumber(longitude);
      return pl;
    };

    const ascLongitude = chart.ascendant?.longitude ?? 0;
    const ascSign = extraVargaSign(ascLongitude, vargaType);
    const placements: Record<string, ExtraVargaPlacement> = {};
    const ascendant = place('Ascendant', ascLongitude, ascSign, false);
    placements['Ascendant'] = ascendant;
    for (const [sym, pos] of Object.entries(chart.planets)) {
      if (!pos || typeof pos.longitude !== 'number') continue;
      placements[sym] = place(sym as PlanetSymbol, pos.longitude, ascSign, pos.isRetrograde);
    }

    const occupantsOf = (sign: number) =>
      Object.values(placements)
        .filter((p) => p.planet !== 'Ascendant' && p.rashiIndex === sign)
        .map((p) => p.planet);

    const houses: VargaHousePlacement[] = [];
    for (let h = 1; h <= 12; h++) {
      const rashiIndex = ((ascSign - 1 + (h - 1)) % 12) + 1;
      houses.push({ houseNumber: h, rashiIndex, rashiName: RASHIS[rashiIndex - 1].sanskritName, occupants: occupantsOf(rashiIndex) });
    }
    const signs: VargaSignSummary[] = RASHIS.map((r) => ({
      index: r.index,
      name: r.sanskritName,
      houseNumber: ((r.index - ascSign + 12) % 12) + 1,
      occupants: occupantsOf(r.index),
    }));

    return {
      vargaType,
      division: def.division,
      name: def.name,
      calculationRule: def.calculationRule,
      ascendant,
      placements,
      houses,
      signs,
      provisional: true,
      provisionalLabel: EXTRA_VARGA_PROVISIONAL_LABEL,
      source: def.source,
      conventionNotes: [...def.conventionNotes],
    };
  }

  /** Calculates the natal chart with `config` (ayanamsa/node options flow through) and the requested extra vargas. */
  public async calculate(
    details: BirthDetails,
    vargaTypes: readonly ExtraVargaType[] = EXTRA_VARGA_TYPES,
    config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG
  ): Promise<Partial<Record<ExtraVargaType, ExtraVargaChart>>> {
    const chart = await this.chartCalculator.calculateChart(details, config);
    const out: Partial<Record<ExtraVargaType, ExtraVargaChart>> = {};
    for (const v of vargaTypes) out[v] = this.calculateFromChart(chart, v);
    return out;
  }
}
