import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { ArudhaPadaPlacement } from './jaimini.types';

export class ArudhaCalculator {
  /**
   * Calculates all 12 Arudha Padas (A1/AL to A12/UL) according to canonical Jaimini Sutras / BPHS.
   *
   * Formula:
   * 1. House H sign = S1
   * 2. Lord of S1 = L, residing in sign S2
   * 3. Steps count = (S2 - S1 + 12) % 12 + 1
   * 4. Candidate Arudha Pada Sign = (S2 + steps - 1) % 12 (or (S1 + 2*(steps-1)) % 12 + 1)
   * 5. Classical Exception Rules (BPHS Ch. 29):
   *    - If Candidate Sign == House Sign (steps == 1 or steps == 7):
   *      - When lord is in 1st from house (steps == 1), Candidate = 1st -> Shift to 10th house from H.
   *      - When lord is in 7th from house (steps == 7), Candidate = 1st -> Shift to 10th from candidate = 10th from H (or 4th from H).
   */
  public static calculateAllArudhas(
    ascendantRashiIndex: number,
    planetSigns: Partial<Record<PlanetSymbol, number>>
  ): ArudhaPadaPlacement[] {
    const padas: ArudhaPadaPlacement[] = [];

    const ARUDHA_NAMES: Record<number, { code: string; name: string }> = {
      1: { code: 'AL', name: 'Arudha Lagna (A1 / Pada Lagna)' },
      2: { code: 'A2', name: 'Dhana Pada (A2 / Kosa Pada)' },
      3: { code: 'A3', name: 'Bhratri Pada (A3 / Vikramapada)' },
      4: { code: 'A4', name: 'Matri Pada (A4 / Sukha Pada)' },
      5: { code: 'A5', name: 'Mantra Pada (A5 / Putra Pada)' },
      6: { code: 'A6', name: 'Roga Pada (A6 / Shatru Pada)' },
      7: { code: 'A7', name: 'Dara Pada (A7 / Stri Pada)' },
      8: { code: 'A8', name: 'Mrityu Pada (A8 / Randhra Pada)' },
      9: { code: 'A9', name: 'Bhagya Pada (A9 / Dharma Pada)' },
      10: { code: 'A10', name: 'Karma Pada (A10 / Rajya Pada)' },
      11: { code: 'A11', name: 'Labha Pada (A11)' },
      12: { code: 'UL', name: 'Upapada Lagna (A12 / Gaunapada)' },
    };

    for (let h = 1; h <= 12; h++) {
      const houseRashiIndex = ((ascendantRashiIndex - 1 + (h - 1)) % 12) + 1;
      const houseRashiDef = RASHIS[houseRashiIndex - 1];
      const lordSymbol = houseRashiDef.ruler as PlanetSymbol;
      const lordSign = planetSigns[lordSymbol] ?? houseRashiIndex;

      // Distance from house sign to lord sign in signs (1 to 12)
      const steps = ((lordSign - houseRashiIndex + 12) % 12) + 1;

      // Raw target sign
      let targetSign = ((lordSign - 1 + (steps - 1)) % 12) + 1;
      let exceptionApplied: 'TEN_SIGN_SHIFT' | 'FOURTH_HOUSE_SHIFT' | 'NONE' = 'NONE';

      // If Arudha falls in the house itself (when lord is in the house itself, steps = 1)
      if (targetSign === houseRashiIndex) {
        if (steps === 1) {
          // Shift 10 signs forward from the house
          targetSign = ((houseRashiIndex - 1 + 9) % 12) + 1;
          exceptionApplied = 'TEN_SIGN_SHIFT';
        } else if (steps === 7) {
          // If lord is in 7th, 7 + 7 = 14 = 2 signs = falls in 1st again -> shift to 4th house or 10th
          targetSign = ((houseRashiIndex - 1 + 3) % 12) + 1;
          exceptionApplied = 'FOURTH_HOUSE_SHIFT';
        }
      }

      const targetRashiDef = RASHIS[targetSign - 1];
      const meta = ARUDHA_NAMES[h] || { code: `A${h}`, name: `Arudha Pada ${h}` };

      // Find planets occupying this Arudha sign
      const occupants = Object.entries(planetSigns)
        .filter(([_, sIdx]) => sIdx === targetSign)
        .map(([sym]) => sym as PlanetSymbol);

      padas.push({
        houseNumber: h,
        code: meta.code,
        name: meta.name,
        signIndex: targetSign,
        signName: targetRashiDef.sanskritName,
        lord: lordSymbol,
        lordSignIndex: lordSign,
        stepsCount: steps,
        exceptionApplied,
        occupants,
      });
    }

    return padas;
  }
}
