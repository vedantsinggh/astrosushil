import { NAKSHATRAS, getNakshatraByLongitude } from '../nakshatra/nakshatra';
import { normalizeDegree } from '../coordinates/angular-math';

export type TaraChakraCategory =
  | 'JANMA'
  | 'SAMPAT'
  | 'VIPAT'
  | 'KSHEMA'
  | 'PRATYAK'
  | 'SADHANA'
  | 'NAIDHANA'
  | 'MITRA'
  | 'PARAMA_MITRA';

export interface TaraChakraDetail {
  targetNakshatraIndex: number; // 1 to 27
  targetNakshatraName: string;
  distanceFromRef: number;      // 1 to 27
  taraIndex: number;            // 1 to 9
  taraCategory: TaraChakraCategory;
  taraName: string;
  sanskritName: string;
  isAuspicious: boolean;
  cycle: number;                // 1 (Prathama), 2 (Dvitiya), 3 (Tritiya Paryaya)
}

export interface TaraChakraReport {
  referenceNakshatraIndex: number;
  referenceNakshatraName: string;
  taras: TaraChakraDetail[];
}

export const TARA_CHAKRA_DEFINITIONS: {
  category: TaraChakraCategory;
  name: string;
  sanskritName: string;
  isAuspicious: boolean;
}[] = [
  { category: 'JANMA', name: 'Janma (Birth/Self)', sanskritName: 'Janma', isAuspicious: true },
  { category: 'SAMPAT', name: 'Sampat (Wealth/Prosperity)', sanskritName: 'Sampat', isAuspicious: true },
  { category: 'VIPAT', name: 'Vipat (Danger/Misfortune)', sanskritName: 'Vipat', isAuspicious: false },
  { category: 'KSHEMA', name: 'Kshema (Well-being/Security)', sanskritName: 'Kshema', isAuspicious: true },
  { category: 'PRATYAK', name: 'Pratyak (Obstacles/Rivalry)', sanskritName: 'Pratyak', isAuspicious: false },
  { category: 'SADHANA', name: 'Sadhana (Success/Achievement)', sanskritName: 'Sadhana', isAuspicious: true },
  { category: 'NAIDHANA', name: 'Naidhana / Vadha (Destruction/Affliction)', sanskritName: 'Naidhana', isAuspicious: false },
  { category: 'MITRA', name: 'Mitra (Friendship/Harmony)', sanskritName: 'Mitra', isAuspicious: true },
  { category: 'PARAMA_MITRA', name: 'Parama Mitra (Supreme Ally/Best Friend)', sanskritName: 'Parama Mitra', isAuspicious: true },
];

export class TaraChakraCalculator {
  /**
   * Calculates the 9-Tara Chakra for all 27 Nakshatras relative to a reference Nakshatra (e.g. Natal Moon).
   */
  public static calculateTaraChakra(referenceNakshatraIndex: number): TaraChakraReport {
    const refIdx = Math.min(27, Math.max(1, referenceNakshatraIndex));
    const refNak = NAKSHATRAS[refIdx - 1];

    const taras: TaraChakraDetail[] = [];

    for (let targetIdx = 1; targetIdx <= 27; targetIdx++) {
      const targetNak = NAKSHATRAS[targetIdx - 1];
      const distance = ((targetIdx - refIdx + 27) % 27) + 1; // 1 to 27
      const taraIndex = ((distance - 1) % 9) + 1; // 1 to 9
      const cycle = Math.floor((distance - 1) / 9) + 1; // 1, 2, or 3
      const def = TARA_CHAKRA_DEFINITIONS[taraIndex - 1];

      taras.push({
        targetNakshatraIndex: targetIdx,
        targetNakshatraName: targetNak.name,
        distanceFromRef: distance,
        taraIndex,
        taraCategory: def.category,
        taraName: def.name,
        sanskritName: def.sanskritName,
        isAuspicious: def.isAuspicious,
        cycle,
      });
    }

    return {
      referenceNakshatraIndex: refIdx,
      referenceNakshatraName: refNak.name,
      taras,
    };
  }

  /**
   * Evaluates the Tara relationship between two specific Nakshatras or longitudes.
   */
  public static evaluateTara(
    referenceLongitude: number,
    targetLongitude: number
  ): TaraChakraDetail {
    const refNak = getNakshatraByLongitude(normalizeDegree(referenceLongitude));
    const targetNak = getNakshatraByLongitude(normalizeDegree(targetLongitude));

    const distance = ((targetNak.index - refNak.index + 27) % 27) + 1;
    const taraIndex = ((distance - 1) % 9) + 1;
    const cycle = Math.floor((distance - 1) / 9) + 1;
    const def = TARA_CHAKRA_DEFINITIONS[taraIndex - 1];

    return {
      targetNakshatraIndex: targetNak.index,
      targetNakshatraName: targetNak.name,
      distanceFromRef: distance,
      taraIndex,
      taraCategory: def.category,
      taraName: def.name,
      sanskritName: def.sanskritName,
      isAuspicious: def.isAuspicious,
      cycle,
    };
  }
}
