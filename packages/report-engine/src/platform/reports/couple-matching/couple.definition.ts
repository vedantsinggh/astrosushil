/**
 * Couple Kundli Matching Report — platform definition.
 *
 * Reference: docs/referencerepots/Couple Kundli Matching Report.pdf (96 pp,
 * third-party; information architecture only). Analysis:
 * docs/report-system/analysis/ref-couple-kundli-matching-report.md.
 * Method decisions: docs/report-system/decisions/finance-couple.md.
 *
 * Evidence ordering: in every narrative topic the first evidence items are the
 * native's facts or `match.*` pair summaries (whose labels are safe for the
 * claim validator); raw `partner.planet.*` facts follow (see COU-010).
 */
import { z } from 'zod';
import { ReportDefinitionInput, ReportTopicSchema } from '../../contracts';

type TopicInput = z.input<typeof ReportTopicSchema>;

const PLANET_THEMES: Record<string, string> = {
  sun: 'identity, self-respect and the way each of you leads',
  moon: 'emotional needs, moods and what makes each of you feel at home',
  mars: 'energy, assertiveness, anger and how each of you acts under pressure',
  mercury: 'communication, humour, reasoning and everyday negotiation',
  jupiter: 'values, faith, generosity and the wisdom each brings to the home',
  venus: 'love style, affection, pleasure and aesthetic harmony',
  saturn: 'duty, patience, fears and long-term commitment',
  rahu: 'ambitions and restless desires that pull each of you forward',
  ketu: 'detachment, inner gifts and areas each of you lets go of easily',
};

function planetTopic(p: string, ref: string): TopicInput {
  const Name = p[0].toUpperCase() + p.slice(1);
  return {
    id: `planet-${p}`, title: `${Name} in Both Charts`, kind: 'narrative',
    objective: `Compare ${Name} in both charts (sign, house, dignity, conjunctions) for ${PLANET_THEMES[p]}. Say how the two placements meet: where they echo each other, where they differ and how the couple can use the difference. Cite both the reader's and the partner's evidence.`,
    requiredEvidence: [`match.pair.${p}`, `planet.${p}.d1.sign`, `planet.${p}.d1.house`, `partner.planet.${p}.d1.dignity`, `partner.planet.${p}.d1.sign`, `partner.planet.${p}.d1.house`],
    optionalEvidence: [`planet.${p}.d1.*`, `partner.planet.${p}.d1.*`],
    depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: ref,
  };
}

const HOUSE_TITLES: Record<number, [string, string]> = {
  1: ['Physique, Health and Nature', 'self-image, vitality and temperament'],
  2: ['Finance, Family and Speech', 'savings, family values and the way each of you speaks'],
  3: ['Courage, Siblings and Short Journeys', 'initiative, siblings, hobbies and communication'],
  4: ['Home, Mother and Property', 'the home, inner peace, mother and property'],
  5: ['Love, Children and Intellect', 'romance, creativity, children and intelligence'],
  6: ['Health Routines, Disputes and Service', 'daily routines, conflict style, debts and service'],
  7: ['Marriage and Partnership', 'the partner each of you seeks and the shape of the marriage'],
  8: ['Longevity, Shared Resources and Change', 'shared finances, in-laws\' resources, secrets and transformation'],
  9: ['Fortune, Faith and Long Journeys', 'shared beliefs, fortune, teachers and travel'],
  10: ['Profession, Status and Father', 'careers, public life and ambition'],
  11: ['Friends, Gains and Elder Siblings', 'social circles, gains and hopes'],
  12: ['Expenses, Foreign Lands and Rest', 'spending, sleep, retreat and life abroad'],
};

function houseTopic(n: number, ref: string): TopicInput {
  const [title, theme] = HOUSE_TITLES[n];
  return {
    id: `house-${n}`, title, kind: 'narrative',
    objective: `Compare the ${n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`} house in both charts (sign, lord and where it is placed, occupants, Sarvashtakavarga) for ${theme}, and what the combination means for life together.`,
    requiredEvidence: [`match.pair.house.${n}`, `house.${n}.d1.sign`, `house.${n}.d1.lord`, `partner.house.${n}.d1.sign`, `partner.house.${n}.d1.lord`],
    optionalEvidence: [`house.${n}.d1.*`, `partner.house.${n}.d1.*`, `sav.house.${n}`, `partner.sav.house.${n}`],
    depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: ref,
  };
}

function kootaTopic(slug: string, title: string, focus: string, extra: string[]): TopicInput {
  return {
    id: `koota-${slug}`, title, kind: 'narrative',
    objective: `Explain the ${title.replace(/ Koota.*/, '')} koota in plain language (${focus}), then interpret this couple's points and the factors behind them. If the points are low, describe the practical habits that support harmony; never fearful language.`,
    requiredEvidence: [`match.koota.${slug}`, ...extra],
    optionalEvidence: ['match.avakhada.native', 'match.avakhada.partner', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'partner.planet.moon.d1.nakshatra'],
    depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '31-33',
  };
}

const MOON_BOTH = ['match.pair.moon', 'match.avakhada.native', 'match.avakhada.partner'];

export const COUPLE_DEFINITION: ReportDefinitionInput = {
  id: 'couple-matching',
  reportType: 'MARRIAGE_COMPATIBILITY',
  specVersion: '1.0.0',
  title: 'Couple Kundli Matching',
  subtitle: 'Two charts read side by side: Guna Milan, Mars, the Moon, Venus, the 7th house and your shared timeline',
  description: 'Classical 36-guna Ashtakoota with koota-by-koota explanations, neutral Manglik comparison, both natives\' D1, D9 and divisional charts, planet tables, Ashtakavarga, Vimshottari periods with their overlap, Saturn and Jupiter cycles, and planet-by-planet and house-by-house comparison.',
  referenceFiles: ['docs/referencerepots/Couple Kundli Matching Report.pdf'],
  requires: { birthTime: true, partner: true, vargas: ['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D30', 'D60'], transitYears: 12 },
  theme: { primary: '4A2545', accent: 'C08A3E', tint: 'FBF4F2' },
  writingGuidance: [
    'This report is about two people. Address the reader as "you" and the other person as "your partner". Never use names.',
    'Describe the partner\'s placements with the possessive and "their", for example "your partner\'s Venus sign is Taurus" and "your partner\'s Venus sits in their 2nd house". Never write "Venus is in Taurus" or "in the 2nd house" for the partner: those sentence forms are reserved for the reader\'s own chart and are checked against it.',
    'Compare, do not judge: show where the charts echo each other and where they differ, and how the difference can be used well. No verdicts on whether the couple should marry.',
    'Astro Sushil does not believe in doshas. Manglik, Nadi, Bhakoot and Sade Sati are explained neutrally as classical conventions and growth areas, never as dangers.',
    'No guarantees about marriage, children, health or longevity. Health topics speak of routines and wellbeing only, never illness.',
    'Remedies are practical, ethical and devotional only; nothing to buy.',
  ],
  sections: [
    {
      id: 'matching-overview', title: 'Matching at a Glance', kicker: 'Your Charts',
      intro: 'What classical matching looks at, and the essential birth details of both of you, side by side.',
      topics: [
        { id: 'significance', title: 'The Significance of Matching', kind: 'data', block: 'couple-significance', objective: 'Explain the eight kootas and Manglik convention.', referencePages: '2' },
        { id: 'birth-details', title: 'Birth Details Side by Side', subtitle: 'Lagna, Moon, Panchang and Avakahada', kind: 'data', block: 'couple-birth-details', objective: 'Both natives\' birth and Avakahada details.', referencePages: '3' },
      ],
    },
    {
      id: 'guna-milan', title: 'Ashtakoota Guna Milan', kicker: 'Section 1',
      intro: 'The 36-point comparison of your two Moons, koota by koota, with the classical exceptions.',
      topics: [
        { id: 'koota-table', title: 'Ashtakoota Guna Chart', kind: 'data', block: 'couple-koota-table', objective: 'Koota table and bar chart.', referencePages: '26' },
        { id: 'verdict', title: 'Result and Classical Exceptions', kind: 'data', block: 'couple-verdict', objective: 'Total, threshold, Bhakoot and Nadi notes.', referencePages: '27' },
        {
          id: 'guna-overview', title: 'What Your Guna Score Means', kind: 'narrative',
          objective: 'Interpret the overall Guna Milan total, the classical 18-point line, the strongest and weakest kootas, and any Bhakoot or Nadi exception, keeping the score in proportion as one lens among many.',
          requiredEvidence: ['match.total', 'match.threshold', 'match.total-effective', 'match.bhakoot.status', 'match.nadi.status'],
          optionalEvidence: ['match.koota.*'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 0 }, referencePages: '26-27',
        },
      ],
    },
    {
      id: 'koota-reading-1', title: 'Koota by Koota: Values and Instinct', kicker: 'Section 2',
      topics: [
        kootaTopic('varna', 'Varna Koota', 'work ethic and values', ['match.groom-chart']),
        kootaTopic('vashya', 'Vashya Koota', 'mutual attraction and influence', ['match.groom-chart']),
        kootaTopic('tara', 'Tara Koota', 'the rhythm of wellbeing between the two birth stars', ['planet.moon.d1.nakshatra']),
        kootaTopic('yoni', 'Yoni Koota', 'instinct, intimacy and physical comfort', ['match.avakhada.native']),
      ],
    },
    {
      id: 'koota-reading-2', title: 'Koota by Koota: Mind and Family', kicker: 'Section 3',
      topics: [
        kootaTopic('maitri', 'Graha Maitri Koota', 'friendship between the lords of the two Moon signs', ['match.pair.moon']),
        kootaTopic('gana', 'Gana Koota', 'temperament: Deva, Manushya or Rakshasa', ['match.avakhada.native']),
        kootaTopic('bhakoot', 'Bhakoot Koota', 'the distance between the two Moon signs and family life', ['match.bhakoot.status']),
        kootaTopic('nadi', 'Nadi Koota', 'constitution and health rhythms', ['match.nadi.status']),
      ],
    },
    {
      id: 'mars-comparison', title: 'Mars and the Manglik Comparison', kicker: 'Section 4',
      intro: 'A classical convention shown for completeness. We do not believe in doshas; Mars is energy to be shared wisely.',
      topics: [
        { id: 'manglik-table', title: 'Mars in Both Charts', kind: 'data', block: 'couple-manglik', objective: 'Manglik placement table and comparison.', referencePages: '27' },
        {
          id: 'manglik-reading', title: 'Two Kinds of Fire', subtitle: 'Mars, drive and conflict style', kind: 'narrative',
          objective: 'Explain the classical Manglik convention neutrally, then interpret both charts\' Mars positions and the comparison as differences in energy, pace and conflict style, with practical ways to channel Mars together. Never fearful.',
          requiredEvidence: ['match.manglik.native', 'match.manglik.partner', 'match.manglik.comparison', 'planet.mars.d1.house'],
          optionalEvidence: ['match.pair.mars', 'planet.mars.d1.*', 'partner.planet.mars.d1.dignity'],
          depth: { minParagraphs: 3, maxParagraphs: 3, bullets: 3 }, referencePages: '27',
        },
      ],
    },
    {
      id: 'matching-prediction', title: 'Life Together', kicker: 'Section 5',
      intro: 'How the two charts meet in the main areas of shared life.',
      topics: [
        {
          id: 'together-nature', title: 'Nature and Temperament', kind: 'narrative',
          objective: 'Compare the two Ascendants, Moon profiles (Gana, Vashya) and Moon signs for how each of you behaves, reacts and recharges, and where the temperaments complement or test each other.',
          requiredEvidence: ['match.pair.asc', 'asc.d1.sign', 'match.avakhada.native', 'match.avakhada.partner'],
          optionalEvidence: ['match.pair.moon', 'match.koota.gana', 'partner.asc.d1.lord'],
          depth: { minParagraphs: 3, maxParagraphs: 3, bullets: 0 }, referencePages: '28',
        },
        {
          id: 'together-finance', title: 'Money as a Couple', kind: 'narrative',
          objective: 'Compare the 2nd and 11th houses of both charts for the couple\'s attitudes to saving, earning and spending, and suggest how to share financial decisions. No financial advice.',
          requiredEvidence: ['match.pair.house.2', 'match.pair.house.11', 'house.2.d1.sign', 'house.11.d1.sign'],
          optionalEvidence: ['partner.house.2.d1.sign', 'partner.house.11.d1.sign', 'sav.house.2', 'partner.sav.house.2', 'sav.house.11', 'partner.sav.house.11'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '28',
        },
        {
          id: 'together-wellbeing', title: 'Wellbeing and Daily Rhythm', kind: 'narrative',
          objective: 'Using the Nadi and Tara kootas and both 6th houses, describe complementary daily routines, rest and care habits. Wellbeing only: never predict illness.',
          requiredEvidence: ['match.koota.nadi', 'match.koota.tara', 'match.pair.house.6', 'house.6.d1.sign'],
          optionalEvidence: ['match.nadi.status', 'partner.house.6.d1.sign', 'house.1.d1.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, referencePages: '29',
        },
        {
          id: 'together-family', title: 'Children and Family Growth', kind: 'narrative',
          objective: 'Compare both 5th houses and the Bhakoot koota for the couple\'s approach to children, creativity and family growth, as tendencies only, never predictions about having children.',
          requiredEvidence: ['match.pair.house.5', 'house.5.d1.sign', 'match.koota.bhakoot', 'house.5.d1.lord'],
          optionalEvidence: ['partner.house.5.d1.sign', 'partner.house.5.d1.lord', 'match.bhakoot.status', 'planet.jupiter.d1.house'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '29',
        },
        {
          id: 'inlaws-native', title: 'You and Your Partner\'s Family', kind: 'narrative',
          objective: 'From the reader\'s 7th house and its 4th from the 7th (the 10th house) and the partner\'s 4th house, describe how the reader may relate to the partner\'s family and home, with practical ways to build trust.',
          requiredEvidence: ['house.7.d1.sign', 'house.10.d1.sign', 'match.pair.house.4', 'house.7.d1.lord'],
          optionalEvidence: ['partner.house.4.d1.sign', 'partner.house.4.d1.lord'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '30',
        },
        {
          id: 'inlaws-partner', title: 'Your Partner and Your Family', kind: 'narrative',
          objective: 'From the partner\'s 7th and 10th houses and the reader\'s 4th house, describe how the partner may relate to the reader\'s family, and how the reader can help bridge the two families.',
          requiredEvidence: ['match.pair.house.7', 'match.pair.house.10', 'house.4.d1.sign', 'partner.house.7.d1.sign'],
          optionalEvidence: ['partner.house.10.d1.sign', 'house.4.d1.lord'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '30',
        },
      ],
    },
    {
      id: 'heart-of-match', title: 'Moon, Venus and the Seventh House', kicker: 'Section 6',
      intro: 'The three classical pillars of a relationship beyond the guna score, read in both charts.',
      topics: [
        {
          id: 'moon-comparison', title: 'Two Moons: Emotional Harmony', kind: 'narrative',
          objective: 'Compare both Moons (sign, nakshatra, house, Moon profile) for emotional needs, how each of you seeks comfort, and how to care for each other\'s moods.',
          requiredEvidence: [...MOON_BOTH, 'planet.moon.d1.sign', 'partner.planet.moon.d1.nakshatra'],
          optionalEvidence: ['planet.moon.d1.*', 'partner.planet.moon.d1.*'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 },
        },
        {
          id: 'venus-comparison', title: 'Two Venuses: The Language of Love', kind: 'narrative',
          objective: 'Compare both Venus placements (sign, house, dignity, conjunctions, Navamsa sign) for love styles, affection and pleasure, and how each can speak the other\'s love language.',
          requiredEvidence: ['match.pair.venus', 'planet.venus.d1.sign', 'planet.venus.d1.house', 'partner.planet.venus.d1.dignity', 'partner.planet.venus.d1.sign'],
          optionalEvidence: ['planet.venus.d1.*', 'partner.planet.venus.d1.*', 'planet.venus.d9.sign', 'partner.planet.venus.d9.sign'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 },
        },
        {
          id: 'seventh-comparison', title: 'Two Seventh Houses: What Each Seeks in Marriage', kind: 'narrative',
          objective: 'Compare both 7th houses (sign, lord placement, occupants), both Darakarakas and both Navamsa ascendants for what each of you seeks and offers in marriage, and how well these expectations meet.',
          requiredEvidence: ['match.pair.house.7', 'house.7.d1.sign', 'house.7.d1.lord-house', 'karaka.dk', 'partner.karaka.dk', 'match.pair.d9-asc'],
          optionalEvidence: ['house.7.d1.*', 'partner.house.7.d1.sign', 'partner.house.7.d1.lord', 'asc.d9.sign', 'partner.asc.d9.sign'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 },
        },
      ],
    },
    {
      id: 'two-charts', title: 'Two Charts Side by Side', kicker: 'Section 7',
      intro: 'The full calculated data for both of you: planetary tables and the principal charts.',
      topics: [
        { id: 'planets-native', title: 'Planetary Positions: You', kind: 'data', block: 'couple-planets-native', objective: 'Native planet table.', referencePages: '4, 6' },
        { id: 'planets-partner', title: 'Planetary Positions: Your Partner', kind: 'data', block: 'couple-planets-partner', objective: 'Partner planet table.', referencePages: '4, 6' },
        { id: 'charts-d1', title: 'Birth Charts (D1)', kind: 'data', block: 'couple-charts-d1', objective: 'Both D1 charts.', referencePages: '4' },
        { id: 'charts-moon-sun', title: 'Moon and Sun Charts', kind: 'data', block: 'couple-charts-moon-sun', objective: 'Both Moon and Sun charts.', referencePages: '5' },
        { id: 'charts-d9', title: 'Navamsa Charts (D9)', kind: 'data', block: 'couple-charts-d9', objective: 'Both D9 charts.', referencePages: '5' },
        {
          id: 'navamsa-reading', title: 'The Navamsa: The Marriage Chart', kind: 'narrative',
          objective: 'Explain the Navamsa (D9) as the classical chart of marriage and inner strength, then compare both D9 ascendants and the D9 signs of Venus and the Moon in both charts.',
          requiredEvidence: ['match.pair.d9-asc', 'asc.d9.sign', 'planet.venus.d9.sign', 'partner.asc.d9.sign'],
          optionalEvidence: ['planet.moon.d9.sign', 'partner.planet.venus.d9.sign', 'partner.planet.moon.d9.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '5, 9', bonus: true,
        },
      ],
    },
    {
      id: 'divisional-charts', title: 'Divisional Charts', kicker: 'Section 8',
      intro: 'The Shodashvarga charts used in classical analysis, for both of you. Each refines one area of life.',
      topics: [
        { id: 'vargas-a', title: 'Hora, Drekkana and Chaturthamsa', kind: 'data', block: 'couple-vargas-a', objective: 'D2, D3, D4 for both.', referencePages: '8-9' },
        { id: 'vargas-b', title: 'Saptamsa, Dasamsa and Dwadasamsa', kind: 'data', block: 'couple-vargas-b', objective: 'D7, D10, D12 for both.', referencePages: '9-10' },
        { id: 'vargas-c', title: 'Shodasamsa, Trimsamsa and Shashtiamsa', kind: 'data', block: 'couple-vargas-c', objective: 'D16, D30, D60 for both.', referencePages: '10-11' },
      ],
    },
    {
      id: 'strength-tables', title: 'Friendship and Ashtakavarga', kicker: 'Section 9',
      intro: 'How the planets relate to each other in each chart, and the bindu strength of every house.',
      topics: [
        { id: 'friendship', title: 'Planetary Friendship', kind: 'data', block: 'couple-friendship', objective: 'Naisargika and Panchadha friendship.', referencePages: '12' },
        { id: 'ashtakavarga-native', title: 'Ashtakavarga: You', kind: 'data', block: 'couple-ashtakavarga-native', objective: 'BAV/SAV and Shodhya pinda.', referencePages: '13-15' },
        { id: 'ashtakavarga-partner', title: 'Ashtakavarga: Your Partner', kind: 'data', block: 'couple-ashtakavarga-partner', objective: 'BAV/SAV and Shodhya pinda.', referencePages: '13-15' },
      ],
    },
    {
      id: 'individual-profiles', title: 'Two Individual Profiles', kicker: 'Section 10',
      intro: 'Each of you, read on your own terms: personality, birth star and Moon sign.',
      topics: [
        {
          id: 'personality-native', title: 'Your Personality', kind: 'narrative',
          objective: 'Describe the reader\'s personality from the Ascendant sign, its nakshatra, its lord\'s placement and the Navamsa ascendant, with an eye to what they bring to a partnership.',
          requiredEvidence: ['asc.d1.sign', 'asc.d1.lord', 'asc.d1.nakshatra', 'asc.d9.sign'],
          optionalEvidence: ['house.1.d1.*'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '36-37',
        },
        {
          id: 'personality-partner', title: 'Your Partner\'s Personality', kind: 'narrative',
          objective: 'Describe the partner\'s personality from their Ascendant sign, nakshatra, Ascendant lord and Navamsa ascendant, with an eye to what they bring to the partnership. Use "your partner".',
          requiredEvidence: ['match.pair.asc', 'partner.asc.d1.sign', 'partner.asc.d1.lord', 'partner.asc.d1.nakshatra'],
          optionalEvidence: ['partner.asc.d9.sign', 'partner.house.1.d1.sign', 'partner.house.1.d1.occupants'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '37-38',
        },
        {
          id: 'nakshatra-both', title: 'Your Birth Stars', subtitle: 'Nakshatra phal for both', kind: 'narrative',
          objective: 'Interpret both Moon nakshatras and padas (and their lords) for innate qualities, and how the two birth stars interact.',
          requiredEvidence: ['planet.moon.d1.nakshatra', 'partner.planet.moon.d1.nakshatra', 'match.koota.tara', 'match.avakhada.native'],
          optionalEvidence: ['match.avakhada.partner', 'dasha.birth-lord', 'partner.dasha.birth-lord'],
          depth: { minParagraphs: 3, maxParagraphs: 3, bullets: 0 }, referencePages: '39-40',
        },
        {
          id: 'rashi-both', title: 'Your Moon Signs', subtitle: 'Rashi phal for both', kind: 'narrative',
          objective: 'Interpret both Moon signs (Rashi) for mind and habits, and give each a simple, cost-free practice that suits their Moon sign (fasting from distraction, devotion, service).',
          requiredEvidence: ['match.pair.moon', 'planet.moon.d1.sign', 'match.koota.maitri', 'match.avakhada.partner'],
          optionalEvidence: ['planet.moon.d1.house', 'partner.planet.moon.d1.dignity'],
          depth: { minParagraphs: 3, maxParagraphs: 3, bullets: 2 }, referencePages: '41-45',
        },
        {
          id: 'temperament-both', title: 'Gana, Yoni and Paya', subtitle: 'Classical temperament markers', kind: 'narrative',
          objective: 'Explain Gana (temperament), Yoni (instinct) and Paya (the "foot" of the Moon from the Ascendant) and interpret both Moon profiles neutrally.',
          requiredEvidence: ['match.avakhada.native', 'match.avakhada.partner', 'match.koota.gana', 'match.koota.yoni'],
          optionalEvidence: ['planet.moon.d1.house'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '46-48',
        },
        { id: 'numerology-table', title: 'Numerology Side by Side', kind: 'data', block: 'couple-numerology', objective: 'Mulank and Bhagyank for both.', referencePages: '34-35' },
        {
          id: 'numerology-both', title: 'Your Numbers Together', kind: 'narrative',
          objective: 'Interpret both Mulank (day) and Bhagyank (destiny) numbers and their ruling planets, and how the two sets of numbers get along.',
          requiredEvidence: ['numerology.mulank', 'numerology.bhagyank', 'partner.numerology.mulank', 'partner.numerology.bhagyank'],
          optionalEvidence: [],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '34-35',
        },
      ],
    },
    {
      id: 'planets-1', title: 'Planet by Planet: The Personal Planets', kicker: 'Section 11',
      topics: [planetTopic('sun', '49'), planetTopic('moon', '50'), planetTopic('mars', '51'), planetTopic('mercury', '52'), planetTopic('jupiter', '53')],
    },
    {
      id: 'planets-2', title: 'Planet by Planet: Venus, Saturn and the Nodes', kicker: 'Section 12',
      topics: [planetTopic('venus', '54'), planetTopic('saturn', '55'), planetTopic('rahu', '56'), planetTopic('ketu', '57')],
    },
    {
      id: 'houses-1', title: 'House by House: Self, Home and Love', kicker: 'Section 13',
      topics: [houseTopic(1, '58-59'), houseTopic(2, '60'), houseTopic(3, '61-62'), houseTopic(4, '63-64'), houseTopic(5, '65'), houseTopic(6, '66-67')],
    },
    {
      id: 'houses-2', title: 'House by House: Partnership, Fortune and Gains', kicker: 'Section 14',
      topics: [houseTopic(7, '68-69'), houseTopic(8, '70-71'), houseTopic(9, '72-73'), houseTopic(10, '74-75'), houseTopic(11, '76-78'), houseTopic(12, '79-81')],
    },
    {
      id: 'timelines', title: 'Dasha Timelines', kicker: 'Section 15',
      intro: 'Both Vimshottari timelines and the stretches you live through together.',
      topics: [
        { id: 'dasha-tables', title: 'Mahadashas and Antardashas', kind: 'data', block: 'couple-dasha-md', objective: 'MD and running AD tables for both.', referencePages: '16' },
        { id: 'pratyantar', title: 'Sub-Sub Periods Now', kind: 'data', block: 'couple-pratyantar', objective: 'Pratyantar of the running AD for both.', referencePages: '17-18' },
        { id: 'overlap-table', title: 'Your Shared Timeline', kind: 'data', block: 'couple-overlap', objective: 'Overlapping Antardashas for 12 years.', referencePages: '91-96' },
        {
          id: 'dasha-native', title: 'Your Running Periods', kind: 'narrative',
          objective: 'Interpret the reader\'s running Mahadasha and Antardasha lords (their houses and lordship) for what this period emphasises, and what it asks of the relationship.',
          requiredEvidence: ['match.dasha.native', 'dasha.current.md', 'dasha.current.ad'],
          optionalEvidence: ['planet.*.d1.house', 'planet.*.d1.lordship'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '82-86',
        },
        {
          id: 'dasha-partner', title: 'Your Partner\'s Running Periods', kind: 'narrative',
          objective: 'Interpret the partner\'s running Mahadasha and Antardasha and the paired placement of those lords, for what the partner is going through and how the reader can support it.',
          requiredEvidence: ['match.dasha.partner', 'partner.dasha.current.md', 'partner.dasha.current.ad'],
          optionalEvidence: ['match.pair.*'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '86-90',
        },
        {
          id: 'shared-periods', title: 'Walking the Timeline Together', kind: 'narrative',
          objective: 'Go through the shared timeline stretches in order, naming dates, and describe how the two simultaneous periods colour each stretch for the couple (supportive stretches, stretches needing patience). No percentages.',
          requiredEvidence: ['match.overlap.*'],
          optionalEvidence: ['match.dasha.native', 'match.dasha.partner'],
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 0 }, dependsOn: ['dasha-native', 'dasha-partner'], referencePages: '91-96',
        },
      ],
    },
    {
      id: 'cycles', title: 'Saturn, Jupiter and the Nodes', kicker: 'Section 16',
      intro: 'Slow-planet cycles over the next twelve years, counted from each Moon.',
      topics: [
        { id: 'saturn-table', title: 'Sade Sati and Dhaiya Periods', kind: 'data', block: 'couple-saturn', objective: 'Saturn over 12/1/2/4/8 from each Moon.', referencePages: '23' },
        { id: 'nodes-table', title: 'The Rahu-Ketu Axis', kind: 'data', block: 'couple-nodes', objective: 'Planet distribution around the nodal axis.', referencePages: '24-25' },
        { id: 'joint-transits', title: 'Jupiter and Saturn for Both of You', kind: 'data', block: 'couple-joint-transits', objective: 'Joint transit table.', referencePages: '91-96' },
        {
          id: 'saturn-reading', title: 'Seasons of Responsibility', kind: 'narrative',
          objective: 'Interpret the Saturn periods for both (Sade Sati and Dhaiya, with dates) neutrally as seasons of maturity, and how the partners can support each other when one is in such a phase.',
          requiredEvidence: ['match.saturn.native.count', 'match.saturn.partner.count'],
          optionalEvidence: ['match.saturn.*', 'planet.moon.d1.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '23',
        },
        {
          id: 'jupiter-reading', title: 'Seasons of Grace', kind: 'narrative',
          objective: 'Identify the Jupiter periods (with dates) that are classically favourable from both Moons or from one, and describe them as supportive windows for shared plans. Also mention, neutrally, the nodal-axis facts for both.',
          requiredEvidence: ['match.jupiter.*', 'match.nodes.native', 'match.nodes.partner'],
          optionalEvidence: [],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '24-25, 91-96',
        },
      ],
    },
    {
      id: 'harmony', title: 'Practical Harmony', kicker: 'Section 17',
      intro: 'In place of gemstones and lucky-item lists: each of your supportive planets, and practices that cost nothing.',
      topics: [
        { id: 'functional-table', title: 'Supportive Planets for Each of You', kind: 'data', block: 'couple-functional', objective: 'Functional nature by Lagna for both.', referencePages: '21-22' },
        {
          id: 'harmony-practices', title: 'Practices for a Shared Life', subtitle: 'Nothing to buy', kind: 'narrative',
          objective: 'Offer practical, ethical and devotional practices for the couple tied to each person\'s functionally favourable planets and to their Moon profiles (communication rituals, shared service, weekday disciplines, gratitude). State that nothing needs to be bought.',
          requiredEvidence: ['match.functional.native', 'match.functional.partner', 'match.avakhada.native'],
          optionalEvidence: ['match.avakhada.partner', 'match.total'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 5 }, referencePages: '21-22',
        },
        {
          id: 'closing-summary', title: 'Bringing It Together', kind: 'narrative',
          objective: 'Summarise the main strengths and growth areas of the match across Guna Milan, Moon, Venus, 7th house, Mars and timelines, and close with encouragement about free will, effort and mutual respect.',
          requiredEvidence: ['match.total', 'match.pair.moon', 'match.pair.venus', 'match.pair.house.7', 'match.manglik.comparison'],
          optionalEvidence: ['match.koota.*', 'match.dasha.native', 'match.dasha.partner'],
          depth: { minParagraphs: 3, maxParagraphs: 3, bullets: 0 }, bonus: true,
        },
      ],
    },
  ],
};
