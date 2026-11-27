/**
 * Personalised Horoscope (annual) — platform definition.
 *
 * Reference: docs/referencerepots/Personalised Horoscope Report.pdf (70 pp,
 * third-party; information architecture only). Analysis:
 * docs/report-system/analysis/ref-personalised-horoscope.md. The reference is a
 * Moon-sign template; this report reads the full chart: every forecast counts
 * the year's Jupiter, Saturn, Rahu and Ketu transits from BOTH the Moon sign
 * and the Ascendant, for the 12 months starting with the report month.
 */
import { ReportDefinitionInput } from '../../contracts';

type TopicInput = ReportDefinitionInput['sections'][number]['topics'][number];

const WINDOWS = ['horo.window.*'];

function areaTopics(key: string, title: string, subtitle: string, focus: string, natal: string[], ref: string): TopicInput[] {
  return [
    {
      id: `${key}-forecast`, title, subtitle, kind: 'narrative',
      objective: `Forecast ${focus} for the year, window by window (the three four-month windows, named by their months). Base it on the slow-planet transits over this area's houses counted from the Moon sign and from the Ascendant, and on the natal promise given (house lords and placements). Say what each window favours, what it asks for, and practical steps. Tendencies and seasons, never promised events.`,
      requiredEvidence: [`horo.area.${key}.window.*`],
      optionalEvidence: [...natal, ...WINDOWS, 'dasha.current.md', 'dasha.current.ad'],
      depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 3 }, referencePages: ref,
    },
    { id: `${key}-in-short`, title: `In Short: ${title}`, kind: 'data', block: `horoscope-area-${key}`, objective: `Window-by-window transit facts for ${focus}.`, referencePages: ref },
  ];
}

function planetInfluence(planet: string, title: string, ref: string, bonus = false): TopicInput {
  const k = planet.toLowerCase();
  return {
    id: `${k}-influence`, title, kind: 'narrative', bonus,
    objective: `Explain ${planet}'s transit through the year: each sign with its dates, the houses it activates from the Moon sign and from the Ascendant, the classical gochara label, and what that means for career, relationships and personal growth. Close with one short affirmation suited to ${planet}'s theme.`,
    requiredEvidence: [`horo.transit.${k}.*`],
    optionalEvidence: [`planet.${k}.d1.house`, `planet.${k}.d1.sign`, `planet.${k}.d1.lordship`],
    depth: { minParagraphs: 2, maxParagraphs: 4, bullets: 0 }, referencePages: ref || undefined,
  };
}

export const HOROSCOPE_ANNUAL_DEFINITION: ReportDefinitionInput = {
  id: 'horoscope-annual',
  reportType: 'HOROSCOPE',
  specVersion: '1.0.0',
  title: 'Personalised Horoscope Report',
  subtitle: 'Your year ahead, read from your Moon sign and your Ascendant together',
  description: 'A twelve-month horoscope built from your full birth chart. The year\'s major transits are counted from both your Moon sign and your Ascendant, and every life area is read in three four-month windows, with personality insights, traditional associations, practices, numerology and affirmations.',
  referenceFiles: ['docs/referencerepots/Personalised Horoscope Report.pdf'],
  requires: { birthTime: true, partner: false, vargas: ['D1', 'D9'], transitYears: 2 },
  theme: { primary: '332163', accent: 'B5853E', tint: 'F3F1FA' },
  writingGuidance: [
    'This is a twelve-month personal horoscope. Read every forecast from BOTH the Moon sign and the Ascendant, saying which one a transit is counted from.',
    'For transits always use the verb "transits" (for example "Jupiter transits Cancer, the 5th from your Moon"). Never write "<planet> in the Nth house" or "<planet> in <sign>" for a transit; natal placements may be stated only from natal evidence.',
    'Refer to the three windows by their month ranges as given in the evidence.',
    '"Supportive" and "demanding" are classical gochara labels; present them as seasons needing different approaches, never as predictions of harm.',
    'No ratings or scores, no promised events, no pseudo-science (no neurotransmitter or brain claims). Remedies and practices are free, ethical or devotional, with nothing to buy.',
  ],
  sections: [
    {
      id: 'chart', title: 'Your Chart at a Glance', kicker: 'Your Chart',
      intro: 'Your birth details and chart, from which every forecast in this horoscope is counted.',
      topics: [
        { id: 'birth-synopsis', title: 'Synopsis of Your Birth Details', subtitle: 'Avakahada Chakra and birth Panchanga', kind: 'data', block: 'horoscope-synopsis', objective: 'Avakahada and birth Panchanga.', bonus: true },
        { id: 'natal-chart', title: 'Your Birth Chart (D1)', kind: 'data', block: 'chart-d1', objective: 'North Indian D1 chart.', bonus: true },
      ],
    },
    {
      id: 'introduction', title: 'Introduction to Your Year', kicker: 'Section 1',
      topics: [
        {
          id: 'how-it-is-read', title: 'How This Horoscope Is Read', subtitle: 'Moon sign and Ascendant together', kind: 'narrative',
          objective: 'Explain that a classical Rashi horoscope counts transits from the Moon sign, and that this report also counts them from the Ascendant for a fuller picture. Introduce the reader\'s Moon sign, nakshatra and Ascendant, and the twelve-month period covered in three windows.',
          requiredEvidence: ['planet.moon.d1.sign', 'asc.d1.sign', 'horo.period'], optionalEvidence: ['planet.moon.d1.nakshatra', 'avakahada.moon-sign-lord', 'asc.d1.lord'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '6',
        },
        { id: 'year-at-a-glance', title: 'The Slow Planets Window by Window', kind: 'data', block: 'horoscope-windows', objective: 'Slow-planet signs per window.', referencePages: '10-12' },
        {
          id: 'year-overview', title: 'Your Year at a Glance', subtitle: 'Career, money, learning, love, family and health in brief', kind: 'narrative',
          objective: 'Give a short overview of the year for each of the six life areas (one paragraph per two areas), drawn from the window-level slow-planet transits, before the detailed chapters.',
          requiredEvidence: ['horo.window.1.jupiter', 'horo.window.1.saturn'], optionalEvidence: [...WINDOWS, 'horo.area.*'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 0 }, dependsOn: ['how-it-is-read'], referencePages: '7-9',
        },
        { id: 'gochara-now', title: 'Where the Slow Planets Stand', kind: 'data', block: 'horoscope-gochara', objective: 'Slow-planet positions at the start of the year.', referencePages: '10-12' },
        {
          id: 'signs-in-the-year', title: 'Your Signs in the Year Ahead', subtitle: 'Jupiter, Saturn, Rahu and Ketu from your Moon and Ascendant', kind: 'narrative',
          objective: 'Interpret where Jupiter, Saturn and the Rahu-Ketu axis transit through the year, counted from the Moon sign and from the Ascendant, with their sign-change dates, and the overall character of the year that results.',
          requiredEvidence: ['horo.transit.jupiter.*', 'horo.transit.saturn.*'], optionalEvidence: ['horo.transit.rahu.*', 'horo.transit.ketu.*'],
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 0 }, referencePages: '10-12',
        },
      ],
    },
    {
      id: 'personality', title: 'Your Personality and Traits', kicker: 'Section 2',
      topics: [
        {
          id: 'moon-nature', title: 'Your Moon Sign Nature', subtitle: 'Emotional temperament and instincts', kind: 'narrative',
          objective: 'Describe the reader\'s emotional nature from the Moon sign, its lord and the birth nakshatra, with five key traits as bullets (strength first, then how to balance it).',
          requiredEvidence: ['planet.moon.d1.sign', 'planet.moon.d1.nakshatra'], optionalEvidence: ['avakahada.moon-sign-lord', 'avakahada.nakshatra-lord', 'avakahada.gana', 'avakahada.tatva', 'planet.moon.d1.house'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 5 }, referencePages: '13-15',
        },
        {
          id: 'ascendant-nature', title: 'Your Ascendant Nature', subtitle: 'How you meet the world', kind: 'narrative',
          objective: 'Describe the reader\'s outward personality, approach to life and natural strengths from the Ascendant sign, its lord and its placement, with five traits as bullets.',
          requiredEvidence: ['asc.d1.sign', 'asc.d1.lord'], optionalEvidence: ['asc.d1.nakshatra', 'house.1.d1.lord-house', 'house.1.d1.occupants'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 5 }, dependsOn: ['moon-nature'], referencePages: '13-15', bonus: true,
        },
      ],
    },
    {
      id: 'horoscope-work', title: 'Work, Money and Learning', kicker: 'Your Personal Horoscope · Section 3',
      intro: 'Each life area is read in three four-month windows. The table after each forecast lists the transit facts it rests on.',
      topics: [
        ...areaTopics('career', 'Career Forecast', 'Work, recognition and direction', 'career and professional life', ['house.10.d1.sign', 'house.10.d1.lord', 'house.10.d1.lord-house', 'house.6.d1.lord'], '16-18'),
        ...areaTopics('finance', 'Financial Insights', 'Income, savings and money flow', 'income, savings and financial decisions', ['house.2.d1.lord', 'house.2.d1.lord-house', 'house.11.d1.lord', 'house.11.d1.lord-house'], '19-21'),
        ...areaTopics('education', 'Education and Learning', 'Study, skills and wisdom', 'studies, skills and higher learning', ['house.4.d1.lord', 'house.5.d1.lord', 'house.5.d1.lord-house', 'house.9.d1.lord'], '22-24'),
      ],
    },
    {
      id: 'horoscope-heart', title: 'Love, Family and Health', kicker: 'Your Personal Horoscope · Section 4',
      intro: 'The same three windows, for your relationships, your home and your wellbeing.',
      topics: [
        ...areaTopics('love', 'Love and Relationships', 'Romance, partnership and understanding', 'love, romance and partnership (for every relationship stage)', ['house.7.d1.sign', 'house.7.d1.lord', 'house.7.d1.lord-house', 'house.5.d1.lord', 'planet.venus.d1.sign'], '25-27'),
        ...areaTopics('family', 'Family Life and Harmony', 'Home, parents and the household', 'family life, home and domestic harmony', ['house.4.d1.sign', 'house.4.d1.lord', 'house.4.d1.lord-house', 'house.2.d1.lord'], '28-30'),
        ...areaTopics('health', 'Health Outlook', 'Energy, routine and resilience', 'energy, routines and wellbeing (no medical claims)', ['house.1.d1.lord', 'house.1.d1.lord-house', 'house.6.d1.lord', 'house.6.d1.sign'], '31-34'),
      ],
    },
    {
      id: 'planetary-influences', title: 'Planetary Influences in the Year Ahead', kicker: 'Section 5',
      topics: [
        { id: 'slow-transit-table', title: 'Sign Periods of the Slow Planets', kind: 'data', block: 'horoscope-slow-table', objective: 'Jupiter, Saturn, Rahu, Ketu sign periods.', referencePages: '35-38' },
        planetInfluence('Saturn', 'Saturn: The Teacher of Patience', '36'),
        planetInfluence('Jupiter', 'Jupiter: The Giver of Growth', '37'),
        {
          id: 'nodes-influence', title: 'Rahu and Ketu: The Axis of Change', kind: 'narrative',
          objective: 'Explain the Rahu-Ketu transit axis through the year with dates, the houses it activates from the Moon sign and the Ascendant, and how to use Rahu\'s ambition and Ketu\'s detachment constructively. Close with one short affirmation.',
          requiredEvidence: ['horo.transit.rahu.*', 'horo.transit.ketu.*'], optionalEvidence: ['planet.rahu.d1.house', 'planet.ketu.d1.house'],
          depth: { minParagraphs: 2, maxParagraphs: 4, bullets: 0 }, referencePages: '38',
        },
        planetInfluence('Venus', 'Venus: The Harmoniser', '39-40'),
        planetInfluence('Mars', 'Mars: The Energiser', '', true),
        { id: 'fast-transit-table', title: 'Sign Periods of Venus, Mars and Mercury', kind: 'data', block: 'horoscope-fast-table', objective: 'Venus, Mars, Mercury sign periods.', bonus: true },
      ],
    },
    {
      id: 'favourable', title: 'Favourable and Unfavourable Influences', kicker: 'Section 6',
      intro: 'Traditional correspondences of the planet that rules your Moon sign — colours, numbers, dates and a symbolic gem.',
      topics: [
        { id: 'lucky-table', title: 'Colours, Numbers and Dates', kind: 'data', block: 'horoscope-lucky', objective: 'Classically derived associations.', referencePages: '41-47' },
        {
          id: 'using-associations', title: 'Using These Associations Wisely', kind: 'narrative',
          objective: 'Explain the reasoning behind the supportive colours, number, dates and weekday (the Moon sign\'s ruling planet and its natural friendships), and suggest light, practical ways to use them (choosing a day to start something, a colour for an important meeting) without superstition or purchases.',
          requiredEvidence: ['horo.lucky.planet', 'horo.lucky.number'], optionalEvidence: ['horo.lucky.*'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 4 }, referencePages: '41-47',
        },
      ],
    },
    {
      id: 'remedies', title: 'Empowered Pathways: Practices for Your Year', kicker: 'Section 7',
      topics: [
        {
          id: 'weekday-practices', title: 'Weekly Practices', subtitle: 'Simple devotional and practical habits', kind: 'narrative',
          objective: 'Suggest weekday practices linked to the Moon-sign lord, the Ascendant lord and the year\'s slow planets (their traditional deities, mantras and acts of service), each simple and free. Explain why each planet is chosen.',
          requiredEvidence: ['horo.lucky.deity', 'horo.lucky.weekday'], optionalEvidence: ['horo.lucky.lagna-deity', 'horo.window.1.saturn', 'horo.window.1.jupiter'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 6 }, referencePages: '49-50',
        },
        {
          id: 'dos-and-donts', title: 'Your Key Do\'s and Don\'ts', subtitle: 'For a steady, productive year', kind: 'narrative',
          objective: 'Give concrete do\'s and don\'ts for the year, each tied to a specific transit window (for example what to begin while Jupiter is supportive, what to avoid rushing while Saturn is demanding). Bullets carry the do\'s and don\'ts.',
          requiredEvidence: ['horo.window.1.jupiter', 'horo.window.1.saturn'], optionalEvidence: [...WINDOWS],
          depth: { minParagraphs: 1, maxParagraphs: 2, bullets: 7 }, dependsOn: ['weekday-practices'], referencePages: '51-53',
        },
      ],
    },
    {
      id: 'numerology', title: 'Numerology for Your Year', kicker: 'Section 8',
      topics: [
        { id: 'numerology-table', title: 'Your Year Numbers', kind: 'data', block: 'horoscope-numerology', objective: 'Universal and personal year numbers.', referencePages: '55' },
        {
          id: 'numerology-reading', title: 'What Your Numbers Say', subtitle: 'Universal and personal year', kind: 'narrative',
          objective: 'Interpret the universal year and the reader\'s personal year number(s) for work, money, relationships, health and personal growth, and how they sit with the Mulank and Bhagyank.',
          requiredEvidence: ['horo.numerology.personal.*'], optionalEvidence: ['horo.numerology.universal.*', 'numerology.mulank', 'numerology.bhagyank'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 0 }, referencePages: '55-58',
        },
      ],
    },
    {
      id: 'affirmations', title: 'Affirmations for Your Year', kicker: 'Section 9',
      topics: [
        {
          id: 'planet-affirmations', title: 'Daily Affirmations Aligned with Your Planets', kind: 'narrative',
          objective: 'Offer affirmations for the Moon-sign lord, the Ascendant lord, Jupiter, Saturn, Rahu and Ketu, each linked to how that planet works in the reader\'s chart or year, then explain simply how to use affirmations (morning, before decisions, journalling). No scientific or neurological claims.',
          requiredEvidence: ['horo.lucky.planet'], optionalEvidence: ['horo.window.1.*', 'asc.d1.lord'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 6 }, referencePages: '59-65',
        },
      ],
    },
    {
      id: 'conclusion', title: 'Conclusion', kicker: 'Section 10',
      topics: [
        {
          id: 'year-closing', title: 'Preparing for a Successful Year', subtitle: 'Strengths, challenges and growth', kind: 'narrative',
          objective: 'Close the horoscope: the reader\'s natural strengths (Moon sign and Ascendant), how to meet the demanding windows, and where the year\'s best growth lies. Warm and encouraging, without repeating earlier text.',
          requiredEvidence: ['planet.moon.d1.sign', 'asc.d1.sign'], optionalEvidence: [...WINDOWS],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '66-69',
        },
      ],
    },
  ],
};
