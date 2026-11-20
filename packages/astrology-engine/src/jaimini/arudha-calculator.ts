import { PlanetSymbol } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { ArudhaPadaPlacement } from './jaimini.types';
import { selectSignLordFromPositions } from '../dasha/jaimini-sign-dasha-utils';

/**
 * How the lord of Scorpio / Aquarius is chosen for Arudha computation.
 * - `STRONGER_CO_LORD` (default): Jaimini co-lords (Scorpio = Mars + Ketu, Aquarius = Saturn +
 *   Rahu), the stronger chosen by {@link selectSignLordFromPositions} (K.N. Rao stronger-lord
 *   rules, JSD-004). Provisional – pending client review (user decision 2026-11-20 #3).
 * - `SINGLE_RULER`: the Parashari single ruler (Mars, Saturn), the pre-2026-11 behaviour.
 */
export type ArudhaCoLordMode = 'STRONGER_CO_LORD' | 'SINGLE_RULER';

export interface ArudhaOptions {
  coLordMode?: ArudhaCoLordMode;
  /** Degree advancement per planet (degree in sign; 30 − degree for nodes), for the last tie-breaker. */
  planetAdvancement?: Partial<Record<PlanetSymbol, number>>;
}

function signFrom(start: number, count: number): number {
  // `count` is inclusive (1 = the start sign itself).
  return ((start - 1 + (count - 1)) % 12 + 12) % 12 + 1;
}

export class ArudhaCalculator {
  /**
   * Calculates all 12 Arudha Padas (A1/AL to A12/UL).
   *
   * Rule (BPHS ch. 29 "Arudha Padas", Santhanam numbering; provisional – pending client review):
   * 1. House sign S1; its lord L sits in S2, `steps` signs from S1 (inclusive count).
   * 2. Raw pada = the sign `steps` signs from S2 (inclusive).
   * 3. The Arudha cannot fall in the house itself or in the 7th from it. When the raw pada is
   *    the 1st or the 7th from the house, the Arudha shifts 10 signs: it is the 10th from the raw
   *    pada. (Raw in the 1st → the 10th from the house; raw in the 7th → the 4th from the house.)
   * 4. Scorpio and Aquarius use the stronger co-lord (see {@link ArudhaCoLordMode}).
   *
   * `exceptionApplied` is `TEN_SIGN_SHIFT` whenever step 3 fires; `exceptionDetail` says whether
   * the raw pada was in the 1st or the 7th from the house. `FOURTH_HOUSE_SHIFT` is no longer
   * emitted (kept in the type for backward compatibility).
   */
  public static calculateAllArudhas(
    ascendantRashiIndex: number,
    planetSigns: Partial<Record<PlanetSymbol, number>>,
    options: ArudhaOptions = {}
  ): ArudhaPadaPlacement[] {
    const padas: ArudhaPadaPlacement[] = [];
    const coLordMode: ArudhaCoLordMode = options.coLordMode ?? 'STRONGER_CO_LORD';

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

      let lordSymbol = houseRashiDef.ruler as PlanetSymbol;
      let lordSelectionReason: string | undefined;
      if (coLordMode === 'STRONGER_CO_LORD' && (houseRashiIndex === 8 || houseRashiIndex === 11)) {
        const sel = selectSignLordFromPositions(houseRashiIndex, planetSigns, options.planetAdvancement);
        if (planetSigns[sel.lord] !== undefined) {
          lordSymbol = sel.lord;
          lordSelectionReason = sel.reason;
        }
      }
      const lordSign = planetSigns[lordSymbol] ?? houseRashiIndex;

      // Distance from house sign to lord sign in signs (1 to 12)
      const steps = ((lordSign - houseRashiIndex + 12) % 12) + 1;

      // Raw pada: as many signs from the lord as the lord is from the house
      const rawSign = signFrom(lordSign, steps);
      const rawFromHouse = ((rawSign - houseRashiIndex + 12) % 12) + 1;

      let targetSign = rawSign;
      let exceptionApplied: 'TEN_SIGN_SHIFT' | 'FOURTH_HOUSE_SHIFT' | 'NONE' = 'NONE';
      let exceptionDetail: ArudhaPadaPlacement['exceptionDetail'];
      if (rawFromHouse === 1 || rawFromHouse === 7) {
        targetSign = signFrom(rawSign, 10);
        exceptionApplied = 'TEN_SIGN_SHIFT';
        exceptionDetail = rawFromHouse === 1 ? 'PADA_IN_1ST_FROM_HOUSE' : 'PADA_IN_7TH_FROM_HOUSE';
      }

      const targetRashiDef = RASHIS[targetSign - 1];
      const meta = ARUDHA_NAMES[h] || { code: `A${h}`, name: `Arudha Pada ${h}` };

      // Find planets occupying this Arudha sign
      const occupants = Object.entries(planetSigns)
        .filter(([, sIdx]) => sIdx === targetSign)
        .map(([sym]) => sym as PlanetSymbol);

      const placement: ArudhaPadaPlacement = {
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
        rawPadaSignIndex: rawSign,
      };
      if (exceptionDetail) placement.exceptionDetail = exceptionDetail;
      if (lordSelectionReason) placement.lordSelectionReason = lordSelectionReason;
      padas.push(placement);
    }

    return padas;
  }
}
