/**
 * Functional (lordship-based) nature of planets for a given Lagna.
 *
 * Classical basis: Brihat Parashara Hora Shastra ch. 34 ("Yoga-karakas") and
 * Laghu Parashari (Uḍu Dāya Pradīpa) ch. 2. Deterministic rule set, applied in
 * this order of priority:
 *   1. The Lagna lord is always treated as favourable (its 8th/6th ownership
 *      does not spoil it — BPHS 34.9; Laghu Parashari 2.8).
 *   2. A planet owning a kendra (4, 7, 10) and a trikona (5, 9) is a Yogakaraka.
 *   3. A trikona lord (5, 9) is favourable; if it also owns 3, 6, 8 or 11 the
 *      result is mixed.
 *   4. A lord of 3, 6, 8 or 11 (without trikona ownership) is challenging —
 *      except that the Sun and the Moon incur no blemish from owning the 8th.
 *   5. A lord of kendras only (with or without 2/12) is neutral: natural benefics
 *      lose their beneficence and natural malefics their maleficence by kendra
 *      lordship (kendradhipatya, Laghu Parashari 2.7).
 *   6. A lord of the 2nd and/or 12th only is neutral; it gives results according
 *      to its associations (Laghu Parashari 2.4).
 *   7. Rahu and Ketu own no sign; they act through their dispositor and associations.
 *
 * Used instead of the reference's undefined "gem power %" (decision FIN-003).
 */
import { planetName, PlanetName, PLANETS } from '../../evidence/evidence-registry';
import { FUNCTIONAL_METHOD_HI, Lang, ordOblique } from './shared.hindi';

export type FunctionalNature = 'yogakaraka' | 'favourable' | 'mixed' | 'neutral' | 'challenging' | 'shadow';

export interface FunctionalClassification {
  planet: PlanetName;
  lordships: number[];
  nature: FunctionalNature;
  reason: string;
}

/** Sign lords, 1 = Aries … 12 = Pisces. */
export const SIGN_LORD: PlanetName[] = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];

export const NATURE_LABEL: Record<FunctionalNature, string> = {
  yogakaraka: 'Yogakaraka (most supportive)',
  favourable: 'Functionally favourable',
  mixed: 'Mixed',
  neutral: 'Neutral',
  challenging: 'Functionally challenging',
  shadow: 'Shadow planet (acts through its sign lord)',
};

const ORD = (n: number) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

/** Houses (from the Lagna) owned by each planet. */
export function lordshipsFor(ascRashiIndex: number): Record<PlanetName, number[]> {
  const out = Object.fromEntries(PLANETS.map((p) => [p, [] as number[]])) as unknown as Record<PlanetName, number[]>;
  for (let h = 1; h <= 12; h++) {
    const sign = ((ascRashiIndex - 1 + h - 1) % 12) + 1;
    out[SIGN_LORD[sign - 1]].push(h);
  }
  return out;
}

export function classifyFunctionalNature(ascRashiIndex: number): FunctionalClassification[] {
  const lords = lordshipsFor(ascRashiIndex);
  return PLANETS.map((planet) => {
    const ls = lords[planet];
    const owns = (hs: number[]) => ls.filter((h) => hs.includes(h));
    const list = ls.map(ORD).join(' and ');
    if (ls.length === 0) {
      return { planet, lordships: ls, nature: 'shadow' as const, reason: 'Owns no sign; gives the results of its sign lord and the planets it joins.' };
    }
    if (ls.includes(1)) {
      return { planet, lordships: ls, nature: 'favourable' as const, reason: `Lagna lord (rules the ${list}); the Ascendant lord is always supportive.` };
    }
    const kendra = owns([4, 7, 10]);
    const trikona = owns([5, 9]);
    const hard = owns([3, 6, 8, 11]);
    if (kendra.length && trikona.length) {
      return { planet, lordships: ls, nature: 'yogakaraka' as const, reason: `Rules a kendra and a trikona (the ${list}).` };
    }
    if (trikona.length && hard.length) {
      return { planet, lordships: ls, nature: 'mixed' as const, reason: `Rules a trikona (${trikona.map(ORD).join(', ')}) and a challenging house (${hard.map(ORD).join(', ')}).` };
    }
    if (trikona.length) {
      return { planet, lordships: ls, nature: 'favourable' as const, reason: `Rules the ${list}, including a trikona.` };
    }
    if (hard.length === 1 && hard[0] === 8 && (planet === 'Sun' || planet === 'Moon')) {
      return { planet, lordships: ls, nature: 'neutral' as const, reason: 'Rules the 8th; the Sun and the Moon incur no blemish from 8th lordship.' };
    }
    if (hard.length) {
      return { planet, lordships: ls, nature: 'challenging' as const, reason: `Rules the ${list}; lords of the 3rd, 6th, 8th and 11th are treated as functionally challenging.` };
    }
    if (kendra.length) {
      return { planet, lordships: ls, nature: 'neutral' as const, reason: `Rules the ${list}; kendra lordship neutralises a planet's natural tendency.` };
    }
    return { planet, lordships: ls, nature: 'neutral' as const, reason: `Rules the ${list}; 2nd and 12th lords act according to their associations.` };
  });
}

export function natureOf(ascRashiIndex: number, planet: string): FunctionalClassification {
  const name = planetName(planet);
  return classifyFunctionalNature(ascRashiIndex).find((c) => c.planet === name)!;
}

export const FUNCTIONAL_METHOD =
  'Functional nature by Lagna (Brihat Parashara Hora Shastra ch. 34; Laghu Parashari ch. 2): Lagna lord favourable; kendra + trikona lord = Yogakaraka; ' +
  'trikona (5th/9th) lords favourable, mixed if they also rule the 3rd/6th/8th/11th; lords of the 3rd/6th/8th/11th challenging (the Sun and Moon are exempt from 8th-lord blemish); ' +
  'kendra-only and 2nd/12th-only lords neutral; Rahu and Ketu act through their sign lord.';

// ------------------------------------------------------------ Hindi edition --

const NATURE_LABEL_HI: Record<FunctionalNature, string> = {
  yogakaraka: 'योगकारक (सबसे सहायक)',
  favourable: 'लग्न अनुसार अनुकूल',
  mixed: 'मिश्रित',
  neutral: 'तटस्थ',
  challenging: 'लग्न अनुसार चुनौतीपूर्ण',
  shadow: 'छाया ग्रह (अपने राशि स्वामी के अनुसार फल देता है)',
};

/** The nature label in the report language; `short` drops the "Functionally" qualifier, as the narrower tables do. */
export function natureLabel(lang: Lang, nature: FunctionalNature, short = false): string {
  if (lang === 'en') return short ? NATURE_LABEL[nature].replace('Functionally ', '') : NATURE_LABEL[nature];
  return short ? NATURE_LABEL_HI[nature].replace('लग्न अनुसार ', '') : NATURE_LABEL_HI[nature];
}

/**
 * The reason of a classification in the report language. It follows the same rule order as
 * `classifyFunctionalNature` (whose English `reason` it reproduces exactly) and decides nothing new.
 */
export function functionalReason(lang: Lang, c: FunctionalClassification): string {
  if (lang === 'en') return c.reason;
  const ls = c.lordships;
  const owns = (hs: number[]) => ls.filter((h) => hs.includes(h));
  const o = (n: number) => ordOblique('hi', n);
  const list = ls.map(o).join(' और ');
  if (c.nature === 'shadow') return 'किसी राशि का स्वामी नहीं; अपने राशि स्वामी और साथ बैठे ग्रहों के अनुसार फल देता है।';
  if (ls.includes(1)) return `लग्नेश (${list} भाव का स्वामी); लग्नेश सदा सहायक होता है।`;
  const kendra = owns([4, 7, 10]);
  const trikona = owns([5, 9]);
  const hard = owns([3, 6, 8, 11]);
  if (c.nature === 'yogakaraka') return `एक केंद्र और एक त्रिकोण का स्वामी (${list} भाव)।`;
  if (c.nature === 'mixed') return `एक त्रिकोण (${trikona.map(o).join(', ')}) और एक चुनौतीपूर्ण भाव (${hard.map(o).join(', ')}) का स्वामी।`;
  if (c.nature === 'favourable') return `${list} भाव का स्वामी, जिनमें एक त्रिकोण है।`;
  if (c.nature === 'challenging') return `${list} भाव का स्वामी; 3रे, 6ठे, 8वें और 11वें भाव के स्वामी लग्न अनुसार चुनौतीपूर्ण माने जाते हैं।`;
  if (hard.length) return '8वें भाव का स्वामी; सूर्य और चंद्र पर 8वें के स्वामित्व का प्रभाव नहीं माना जाता।';
  if (kendra.length) return `${list} भाव का स्वामी; केंद्र का स्वामित्व ग्रह की नैसर्गिक प्रवृत्ति को तटस्थ कर देता है।`;
  return `${list} भाव का स्वामी; 2रे और 12वें भाव के स्वामी अपने साथ के ग्रहों के अनुसार फल देते हैं।`;
}

export const functionalMethod = (lang: Lang): string => (lang === 'en' ? FUNCTIONAL_METHOD : FUNCTIONAL_METHOD_HI);
