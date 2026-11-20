import { AstroChart } from './astro-chart.types';
import { PlanetSymbol, MANDATORY_VEDIC_PLANETS } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';

/**
 * Sudarshana Chakra (BPHS, "Sudarshana Chakra" chapter).
 *
 * Three concentric rings read the twelve houses from three reference points:
 *  - inner ring: Surya Lagna (sign of the Sun),
 *  - middle ring: Chandra Lagna (sign of the Moon),
 *  - outer ring: Janma Lagna (sign of the Ascendant).
 * House n of a ring = the n-th sign counted from that ring's reference sign (whole-sign).
 * This is a pure re-indexing of the natal chart; no new astronomical assumption is made.
 */

export type SudarshanaRingName = 'LAGNA' | 'CHANDRA' | 'SURYA';

export interface SudarshanaHouse {
  houseNumber: number; // 1-12
  rashiIndex: number; // 1-12
  rashiName: string;
  occupants: PlanetSymbol[];
}

export interface SudarshanaRing {
  ring: SudarshanaRingName;
  referenceRashiIndex: number;
  houses: SudarshanaHouse[];
}

export interface SudarshanaChakra {
  rings: SudarshanaRing[]; // order: LAGNA (outer), CHANDRA (middle), SURYA (inner)
}

export function signFromReference(referenceRashiIndex: number, houseNumber: number): number {
  return ((referenceRashiIndex - 1 + houseNumber - 1) % 12) + 1;
}

export function calculateSudarshanaChakra(chart: AstroChart): SudarshanaChakra {
  if (!chart.ascendant) {
    throw new Error('Sudarshana Chakra requires a calculated ascendant');
  }
  const occupantsBySign = new Map<number, PlanetSymbol[]>();
  for (const p of MANDATORY_VEDIC_PLANETS) {
    const pos = chart.planets[p];
    if (!pos) continue;
    const list = occupantsBySign.get(pos.rashiIndex) || [];
    list.push(p);
    occupantsBySign.set(pos.rashiIndex, list);
  }

  const refs: Array<[SudarshanaRingName, number]> = [
    ['LAGNA', chart.ascendant.rashiIndex],
    ['CHANDRA', chart.planets[PlanetSymbol.MOON].rashiIndex],
    ['SURYA', chart.planets[PlanetSymbol.SUN].rashiIndex],
  ];

  return {
    rings: refs.map(([ring, ref]) => ({
      ring,
      referenceRashiIndex: ref,
      houses: Array.from({ length: 12 }, (_, i) => {
        const rashiIndex = signFromReference(ref, i + 1);
        return {
          houseNumber: i + 1,
          rashiIndex,
          rashiName: RASHIS[rashiIndex - 1].sanskritName,
          occupants: [...(occupantsBySign.get(rashiIndex) || [])],
        };
      }),
    })),
  };
}
