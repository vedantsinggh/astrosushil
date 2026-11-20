/**
 * Topic builders shared by the planet-transit family. Each report composes its
 * own sections from these and sets its own titles, reference pages and order.
 */
import { ReportTopicInput } from '../../contracts';
import { PlanetKey, PLANET_NAME } from './calc/planet-transit';

type Extra = Partial<ReportTopicInput>;
const N = (k: PlanetKey) => PLANET_NAME[k];

export function natalHouseTopic(k: PlanetKey, x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-house`, title: `${N(k)} in Your Birth Chart`, subtitle: 'The house that receives this planet\'s lifelong lesson', kind: 'narrative',
    objective: `Explain what the house occupied by natal ${N(k)} governs in plain language, then interpret ${N(k)}'s placement there: the life areas it shapes, the typical inner experience, the strengths it builds with maturity and how the reader can work with it. Use the sign, dignity, nakshatra and houses it rules where given.`,
    requiredEvidence: [`planet.${k}.d1.house`, `planet.${k}.d1.sign`],
    optionalEvidence: [`planet.${k}.d1.*`, `house.*.d1.sign`, `${k}.natal.lordship-type`, `${k}.natal.dispositor`],
    depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 5 }, ...x,
  };
}

export function natalSignTopic(k: PlanetKey, x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-sign`, title: `${N(k)} in Its Sign`, subtitle: 'Sign, dignity and the sign lord that carries the result', kind: 'narrative',
    objective: `Interpret natal ${N(k)}'s sign and its dignity (exalted, own, friendly, neutral, enemy or debilitated as given), and the dispositor (sign lord) through which ${N(k)} delivers results. Combine sign and house into a clear picture of the planet's karmic lesson for this reader.`,
    requiredEvidence: [`planet.${k}.d1.sign`, `planet.${k}.d1.dignity`, `${k}.natal.dispositor`],
    optionalEvidence: [`planet.${k}.d1.house`, `planet.${k}.d1.degree`, `planet.${k}.d1.retrograde`],
    depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, ...x,
  };
}

export function natalNakshatraTopic(k: PlanetKey, x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-nakshatra`, title: `${N(k)}'s Nakshatra`, subtitle: 'The lunar mansion that colours its expression', kind: 'narrative',
    objective: `Explain what a nakshatra is, then interpret natal ${N(k)}'s nakshatra and pada and the nakshatra lord: temperament, motivation and the way ${N(k)}'s themes show up in daily life.`,
    requiredEvidence: [`planet.${k}.d1.nakshatra`],
    optionalEvidence: [`planet.${k}.d1.sign`, `planet.${k}.d1.house`],
    depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 5 }, ...x,
  };
}

export function natalAspectsTopic(k: PlanetKey, x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-aspects`, title: `${N(k)}'s Glance (Drishti)`, subtitle: 'The houses and planets your natal placement watches over', kind: 'narrative',
    objective: `Explain ${N(k)}'s classical aspects, then interpret each aspected sign and house from the Ascendant and any natal planets in those signs, one by one: how ${N(k)}'s influence is felt in those areas of life.`,
    requiredEvidence: [`${k}.natal.aspects`],
    optionalEvidence: [`${k}.natal.aspected-planets`, `planet.${k}.d1.house`, `planet.${k}.d1.sign`],
    depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 3 }, ...x,
  };
}

export function natalConjunctionTopic(k: PlanetKey, x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-conjunctions`, title: `${N(k)}'s Companions`, subtitle: 'Planets that share its house or cast their glance on it', kind: 'narrative',
    objective: `Interpret the natal planets sharing ${N(k)}'s house and the planets aspecting ${N(k)}, and what each blend means. If ${N(k)} stands alone and unaspected, explain what an unmixed ${N(k)} means for the reader.`,
    requiredEvidence: [`planet.${k}.d1.conjunctions`, `planet.${k}.d1.aspected-by`],
    optionalEvidence: [`planet.${k}.d1.house`, `planet.${k}.d1.sign`],
    depth: { minParagraphs: 2, maxParagraphs: 4, bullets: 4 }, ...x,
  };
}

export function natalLordshipTopic(k: PlanetKey, x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-functional`, title: `Benefic or Demanding? ${N(k)}'s Role for Your Ascendant`, subtitle: 'Functional nature from the houses it rules', kind: 'narrative',
    objective: `Explain that a planet's practical role depends on the houses it rules from the Ascendant. Interpret the houses ${N(k)} rules and their classical categories, and whether it is a yogakaraka, as a balanced picture of where ${N(k)} supports the reader and where it asks for effort. No scores, no fear.`,
    requiredEvidence: [`${k}.natal.lordship-type`, `${k}.natal.yogakaraka`],
    optionalEvidence: [`planet.${k}.d1.house`, `planet.${k}.d1.lordship`, `asc.d1.sign`],
    depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, ...x,
  };
}

export function moonSignTopic(k: PlanetKey, x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-moon-sign`, title: `${N(k)} and Your Moon Sign`, subtitle: 'How the mind meets this planet', kind: 'narrative',
    objective: `Interpret the relationship between the reader's Moon sign and ${N(k)}: ${N(k)}'s house counted from the Moon and its natural relationship with the Moon-sign lord. Describe the emotional experience of ${N(k)}'s themes and healthy ways to respond.`,
    requiredEvidence: ['planet.moon.d1.sign', `${k}.natal.house-from-moon`],
    optionalEvidence: [`${k}.natal.moon-lord-relationship`, 'planet.moon.d1.nakshatra', 'planet.moon.d1.house'],
    depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 5 }, ...x,
  };
}

export function moonPsycheTopic(k: PlanetKey, x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-moon-psyche`, title: `The Inner Evolution: Moon and ${N(k)}`, subtitle: 'Your emotional growth path with this planet', kind: 'narrative',
    objective: `Describe the reader's emotional temperament from the Moon's sign, nakshatra and house, and how natal ${N(k)} matures it over a lifetime: early tendencies, what life teaches, and the settled strength that emerges. No ratings or scores.`,
    requiredEvidence: ['planet.moon.d1.sign', 'planet.moon.d1.nakshatra', `planet.${k}.d1.house`],
    optionalEvidence: ['planet.moon.d1.house', 'planet.moon.d1.aspected-by', `${k}.natal.house-from-moon`],
    depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, ...x,
  };
}

// ---- transit stays ---------------------------------------------------------

const S = (slot: 'a' | 'b') => (slot === 'a' ? 'current' : 'next');

export function stayLagnaTopic(k: PlanetKey, slot: 'a' | 'b', x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-${slot}-lagna`, title: `What This Transit Brings`, subtitle: 'Physical, mental and spiritual themes from your Ascendant', kind: 'narrative',
    objective: `For the ${S(slot)} ${N(k)} transit period, explain the house it passes through from the Ascendant and interpret it in three parts: physical and practical life (work, routine, health habits), mental and emotional shifts, and spiritual growth. Mention the dates once. Supportive-window language only.`,
    requiredEvidence: [`${k}.transit.${slot}.sign`, `${k}.transit.${slot}.house-asc`, `${k}.transit.${slot}.dates`],
    optionalEvidence: [`${k}.transit.${slot}.status`, `${k}.transit.${slot}.sav`, `${k}.transit.${slot}.bav`, `${k}.natal.lordship-type`, `planet.${k}.d1.house`],
    depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 6 }, ...x,
  };
}

export function stayAspectsTopic(k: PlanetKey, slot: 'a' | 'b', x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-${slot}-aspects`, title: `Where Its Glance Falls`, subtitle: 'Aspects of the transiting planet', kind: 'narrative',
    objective: `Interpret each aspect of transiting ${N(k)} in the ${S(slot)} period: which sign and house from the Ascendant it touches and what that means for those areas of life, one aspect at a time.`,
    requiredEvidence: [`${k}.transit.${slot}.aspects`],
    optionalEvidence: [`${k}.transit.${slot}.sign`, `${k}.transit.${slot}.house-asc`, `${k}.transit.${slot}.aspected-natal`],
    depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, ...x,
  };
}

export function stayMoonTopic(k: PlanetKey, slot: 'a' | 'b', x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-${slot}-moon`, title: `The Same Transit, Seen from Your Moon`, subtitle: 'Gochara from the Moon sign: the emotional weather', kind: 'narrative',
    objective: `Explain that classical gochara is read from the Moon sign as well as the Ascendant. Interpret the house transiting ${N(k)} occupies from the Moon in the ${S(slot)} period, and the houses it aspects from the Moon: mood, relationships, motivation and practical advice.`,
    requiredEvidence: [`${k}.transit.${slot}.house-moon`, `${k}.transit.${slot}.aspects-moon`],
    optionalEvidence: [`${k}.transit.${slot}.sign`, 'planet.moon.d1.sign'],
    depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 5 }, ...x,
  };
}

export function stayNatalTopic(k: PlanetKey, slot: 'a' | 'b', x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-${slot}-natal`, title: `Transit over Your Natal Planets`, subtitle: 'Conjunctions and aspects to your birth planets', kind: 'narrative',
    objective: `Interpret the natal planets that transiting ${N(k)} passes over (same sign) and aspects in the ${S(slot)} period, and what each contact activates. If it contacts none, explain what an uncrowded transit means: a quieter, more open field where effort shapes results.`,
    requiredEvidence: [`${k}.transit.${slot}.conjunct`, `${k}.transit.${slot}.aspected-natal`],
    optionalEvidence: [`${k}.transit.${slot}.sign`, `${k}.transit.${slot}.house-asc`],
    depth: { minParagraphs: 2, maxParagraphs: 4, bullets: 3 }, ...x,
  };
}

export function stayRetroTopic(k: 'saturn' | 'jupiter', slot: 'a' | 'b', x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-${slot}-retro`, title: `The Retrograde Season`, subtitle: 'Review, revision and inner work', kind: 'narrative',
    objective: `Explain apparent retrograde motion simply (no fear), then interpret the retrograde window(s) of ${N(k)} in the ${S(slot)} period with their dates: what to review, slow down, revisit or complete, physically, mentally and spiritually.`,
    requiredEvidence: [`${k}.transit.${slot}.retro`],
    optionalEvidence: [`${k}.transit.${slot}.sign`, `${k}.transit.${slot}.house-asc`, `${k}.transit.${slot}.house-moon`],
    depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 4 }, ...x,
  };
}

export function stayAvTopic(k: 'saturn' | 'jupiter', slot: 'a' | 'b', x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-${slot}-av`, title: `Ashtakavarga Support for This Transit`, subtitle: 'What your bindus say about this sign', kind: 'narrative',
    objective: `Interpret ${N(k)}'s own Bhinnashtakavarga bindus and the Sarvashtakavarga total of the ${S(slot)} transit sign, using only the classical reading given in the evidence (four bindus is the midpoint, 28 the SAV average). Read it as per the Ascendant house and per the Moon house.`,
    requiredEvidence: [`${k}.transit.${slot}.bav`, `${k}.transit.${slot}.sav`],
    optionalEvidence: [`${k}.transit.${slot}.sign`, `${k}.transit.${slot}.house-asc`, `${k}.transit.${slot}.house-moon`],
    depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 4 }, ...x,
  };
}

export function collectiveTopic(k: PlanetKey, x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-collective`, title: `The Collective Climate`, subtitle: `What ${N(k)}'s present sign means for everyone`, kind: 'narrative',
    objective: `Describe, in general and symbolic terms, the collective themes traditionally associated with transiting ${N(k)} in its current sign (the element and nature of the sign meeting the nature of the planet). Do not predict specific world events, disasters, markets, elections or people.`,
    requiredEvidence: [`${k}.transit.a.sign`],
    optionalEvidence: [`${k}.transit.a.dates`, `${k}.transit.b.sign`],
    depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 5 }, ...x,
  };
}

export function bavReadingTopic(k: 'saturn' | 'jupiter', x: Extra = {}): ReportTopicInput {
  return {
    id: `${k}-bav-reading`, title: `Reading Your ${N(k)} Ashtakavarga`, subtitle: 'Where this planet\'s transit finds the most and least support', kind: 'narrative',
    objective: `Explain Ashtakavarga simply, then interpret ${N(k)}'s strongest and weakest signs (with the houses they are from the Ascendant), the bindus in its natal sign, and what that means across ${N(k)}'s long transit cycle. Use only the classical four-bindu threshold.`,
    requiredEvidence: [`${k}.bav.strongest`, `${k}.bav.weakest`, `${k}.bav.natal-sign`],
    optionalEvidence: [`${k}.bav.sign.*`, `${k}.bav.total`],
    depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 5 }, ...x,
  };
}

export function practicesTopic(k: PlanetKey, id: string, title: string, focus: string, x: Extra = {}): ReportTopicInput {
  return {
    id, title, kind: 'narrative',
    objective: `Practical, ethical and devotional practices for working with ${N(k)}, tailored to the reader's natal ${N(k)} house and the current transit house: ${focus}. Nothing to buy: no gemstones, paid rituals or products. Calm, encouraging tone.`,
    requiredEvidence: [`planet.${k}.d1.house`, `${k}.transit.a.house-asc`],
    optionalEvidence: [`planet.${k}.d1.sign`, `${k}.transit.a.sign`, `${k}.transit.a.house-moon`],
    depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 6 }, ...x,
  };
}
