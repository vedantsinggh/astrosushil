import { PlanetSymbol } from './planet.types';
import { RASHIS } from '../zodiac/rashi';

/**
 * Functional (lordship-based) nature of planets for a given Lagna — Parashari, pure and
 * deterministic.
 *
 * Classical basis: Brihat Parashara Hora Shastra ch. 34 ("Yogakarakas", Santhanam numbering) and
 * Laghu Parashari (Uḍu Dāya Pradīpa) ch. 2. Ported unchanged in its classification rules from
 * report-engine `_finance-couple-shared/functional-nature.ts` so every package can share one
 * implementation. Rules, in priority order:
 *   1. The Lagna lord is always favourable (its 6th/8th ownership does not spoil it — BPHS 34;
 *      Laghu Parashari 2.8). Seed precedence CRP-002 (provisional).
 *   2. A planet owning a kendra (4, 7, 10) and a trikona (5, 9) is a Yogakaraka (BPHS 34;
 *      Laghu Parashari 2.12-2.13).
 *   3. A trikona lord (5, 9) is favourable; if it also owns 3, 6, 8 or 11 the result is mixed.
 *   4. A lord of 3, 6, 8 or 11 (without trikona ownership) is challenging — except that the Sun
 *      and the Moon incur no blemish from owning the 8th (Laghu Parashari 2.9; CRP-003).
 *   5. A lord of kendras only (with or without 2/12) is neutral: natural benefics lose their
 *      beneficence and natural malefics their maleficence (kendradhipatya, Laghu Parashari 2.7).
 *   6. A lord of the 2nd and/or 12th only is neutral; it acts by association (Laghu Parashari 2.4).
 *   7. Rahu and Ketu own no sign here; they act through their dispositor and associations.
 *
 * Additional facts (no verdicts), provisional – pending client review:
 *   - `kendradhipatiDosha`: a natural benefic (Jupiter, Venus, Mercury, Moon) that owns a kendra
 *     (4/7/10), owns no trikona and is not the Lagna lord (Laghu Parashari 2.7-2.8).
 *   - `maraka`: owns the 2nd or the 7th (BPHS ch. 44 "Maraka", Laghu Parashari ch. 4).
 * Verse numbers follow commonly cited translations and are to be verified against the client's
 * edition before display.
 */

export type FunctionalNatureClass = 'yogakaraka' | 'favourable' | 'mixed' | 'neutral' | 'challenging' | 'shadow';

export interface FunctionalNatureResult {
  planet: PlanetSymbol;
  lagnaSign: number;
  /** Houses (from the Lagna, whole sign) the planet owns, ascending. */
  lordships: number[];
  nature: FunctionalNatureClass;
  isYogakaraka: boolean;
  kendraLordships: number[];
  trikonaLordships: number[];
  /** Lordships of the 3rd, 6th, 8th and 11th. */
  trishadayaOrDusthanaLordships: number[];
  kendradhipatiDosha: boolean;
  maraka: boolean;
  reason: string;
  source: string;
  provisional: true;
}

export const FUNCTIONAL_NATURE_SOURCE =
  'BPHS ch. 34 (Santhanam numbering); Laghu Parashari ch. 2 (functional nature by lordship)';

const SEVEN_GRAHAS: readonly PlanetSymbol[] = [
  PlanetSymbol.SUN,
  PlanetSymbol.MOON,
  PlanetSymbol.MARS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.SATURN,
];

const NATURAL_BENEFICS_FOR_KENDRADHIPATYA: readonly PlanetSymbol[] = [
  PlanetSymbol.JUPITER,
  PlanetSymbol.VENUS,
  PlanetSymbol.MERCURY,
  PlanetSymbol.MOON,
];

const ORD = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

function assertSign(lagnaSign: number): void {
  if (!Number.isInteger(lagnaSign) || lagnaSign < 1 || lagnaSign > 12) {
    throw new RangeError(`lagnaSign must be an integer 1..12, got ${lagnaSign}`);
  }
}

/** Houses (from the Lagna, whole sign) owned by `planet`. Empty for Rahu/Ketu/outer planets. */
export function getLordships(lagnaSign: number, planet: PlanetSymbol): number[] {
  assertSign(lagnaSign);
  const out: number[] = [];
  for (let h = 1; h <= 12; h++) {
    const sign = ((lagnaSign - 1 + h - 1) % 12) + 1;
    if (RASHIS[sign - 1].ruler === planet) out.push(h);
  }
  return out;
}

/** Functional nature of one planet for a Lagna sign (1 = Aries … 12 = Pisces). */
export function getFunctionalNature(lagnaSign: number, planet: PlanetSymbol): FunctionalNatureResult {
  const ls = getLordships(lagnaSign, planet);
  const owns = (hs: number[]) => ls.filter((h) => hs.includes(h));
  const kendra = owns([4, 7, 10]);
  const trikona = owns([5, 9]);
  const hard = owns([3, 6, 8, 11]);
  const list = ls.map(ORD).join(' and ');
  const isLagnaLord = ls.includes(1);

  const base = {
    planet,
    lagnaSign,
    lordships: ls,
    kendraLordships: kendra,
    trikonaLordships: trikona,
    trishadayaOrDusthanaLordships: hard,
    kendradhipatiDosha:
      NATURAL_BENEFICS_FOR_KENDRADHIPATYA.includes(planet) && kendra.length > 0 && trikona.length === 0 && !isLagnaLord,
    maraka: ls.includes(2) || ls.includes(7),
    source: FUNCTIONAL_NATURE_SOURCE,
    provisional: true as const,
  };

  if (ls.length === 0) {
    return { ...base, nature: 'shadow', isYogakaraka: false, reason: 'Owns no sign; gives the results of its sign lord and the planets it joins.' };
  }
  if (isLagnaLord) {
    return { ...base, nature: 'favourable', isYogakaraka: false, reason: `Lagna lord (rules the ${list}); the Ascendant lord is always supportive.` };
  }
  if (kendra.length && trikona.length) {
    return {
      ...base,
      nature: 'yogakaraka',
      isYogakaraka: true,
      reason: `Yogakaraka: owns both kendra ${kendra.map(ORD).join(', ')} and trikona ${trikona.map(ORD).join(', ')}.`,
    };
  }
  if (trikona.length && hard.length) {
    return {
      ...base,
      nature: 'mixed',
      isYogakaraka: false,
      reason: `Rules a trikona (${trikona.map(ORD).join(', ')}) and a challenging house (${hard.map(ORD).join(', ')}).`,
    };
  }
  if (trikona.length) {
    return { ...base, nature: 'favourable', isYogakaraka: false, reason: `Rules the ${list}, including a trikona.` };
  }
  if (hard.length === 1 && hard[0] === 8 && (planet === PlanetSymbol.SUN || planet === PlanetSymbol.MOON)) {
    return { ...base, nature: 'neutral', isYogakaraka: false, reason: 'Rules the 8th; the Sun and the Moon incur no blemish from 8th lordship.' };
  }
  if (hard.length) {
    return {
      ...base,
      nature: 'challenging',
      isYogakaraka: false,
      reason: `Rules the ${list}; lords of the 3rd, 6th, 8th and 11th are treated as functionally challenging.`,
    };
  }
  if (kendra.length) {
    return { ...base, nature: 'neutral', isYogakaraka: false, reason: `Rules the ${list}; kendra lordship neutralises a planet's natural tendency.` };
  }
  return { ...base, nature: 'neutral', isYogakaraka: false, reason: `Rules the ${list}; 2nd and 12th lords act according to their associations.` };
}

/** Functional nature of the seven grahas plus Rahu and Ketu (shadow) for a Lagna sign. */
export function classifyFunctionalNatures(lagnaSign: number): FunctionalNatureResult[] {
  return [...SEVEN_GRAHAS, PlanetSymbol.RAHU, PlanetSymbol.KETU].map((p) => getFunctionalNature(lagnaSign, p));
}

/** Planets that own both a kendra (4/7/10) and a trikona (5/9) for the Lagna sign. */
export function getYogakarakas(lagnaSign: number): PlanetSymbol[] {
  return SEVEN_GRAHAS.filter((p) => getFunctionalNature(lagnaSign, p).isYogakaraka);
}
