/**
 * Planetary Dynamics & Dignity Summary — platform definition (reportType PLANETARY_SUMMARY).
 *
 * There is no reference PDF for this product (docs/report-system/README.md §3).
 * It is a short, genuine summary built only from facts the platform already
 * computes and validates: the D1 chart, the planet table (sign, degree,
 * nakshatra, dignity, retrograde/combust state) and one short interpretation
 * per planet. It invents no new astrology rule; there is no strength score.
 */
import { ReportDefinitionInput, ReportTopicInput } from '../../contracts';

const PLANETS: Array<{ id: string; name: string; subtitle: string }> = [
  { id: 'sun', name: 'Sun', subtitle: 'Vitality, purpose and authority' },
  { id: 'moon', name: 'Moon', subtitle: 'Mind, feelings and inner security' },
  { id: 'mars', name: 'Mars', subtitle: 'Energy, courage and drive' },
  { id: 'mercury', name: 'Mercury', subtitle: 'Thinking, speech and learning' },
  { id: 'jupiter', name: 'Jupiter', subtitle: 'Wisdom, growth and guidance' },
  { id: 'venus', name: 'Venus', subtitle: 'Love, beauty and values' },
  { id: 'saturn', name: 'Saturn', subtitle: 'Discipline, patience and endurance' },
  { id: 'rahu', name: 'Rahu', subtitle: 'The north node: appetite for the new' },
  { id: 'ketu', name: 'Ketu', subtitle: 'The south node: innate wisdom and detachment' },
];

function planetTopic(p: (typeof PLANETS)[number]): ReportTopicInput {
  const node = p.id === 'rahu' || p.id === 'ketu';
  return {
    id: `planet-${p.id}`,
    title: p.name,
    subtitle: p.subtitle,
    kind: 'narrative',
    objective: node
      ? `A concise profile of ${p.name}: what the house and sign it occupies mean for this reader, its nakshatra, and any planets it joins or that aspect it. Close with one constructive way to work with it. Nodes are teachers, not threats.`
      : `A concise profile of ${p.name}: what it signifies, how its sign, house and nakshatra shape its expression for this reader, what its dignity and retrograde or combust state (only if given in the evidence) add, and the planets it joins or that aspect it. Close with one practical suggestion.`,
    requiredEvidence: [`planet.${p.id}.d1.sign`, `planet.${p.id}.d1.house`],
    optionalEvidence: [`planet.${p.id}.d1.*`],
    depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 2 },
  };
}

export const PLANETARY_SUMMARY_DEFINITION: ReportDefinitionInput = {
  id: 'planetary-summary',
  reportType: 'PLANETARY_SUMMARY',
  specVersion: '1.0.0',
  title: 'Planetary Dynamics & Dignity Summary',
  subtitle: 'Your nine planets: where they stand, how strong their placement is and what they mean for you',
  description: 'Your Vedic birth chart (D1) and planet table, with a short personal reading of each of the nine planets by sign, house, nakshatra, dignity and retrograde or combust state.',
  referenceFiles: [],
  requires: { birthTime: true, partner: false, vargas: ['D1'] },
  theme: { primary: '2E1A47', accent: 'B5852E', tint: 'F3EAF8' },
  writingGuidance: [
    'This is a short planetary summary: keep each planet profile focused and concrete; do not repeat the general meaning of a house in every topic.',
    'Dignity words (exalted, own sign, debilitated and so on) are described as how comfortably a planet expresses itself, never as good or bad luck.',
    'Mention retrograde or combust state only when the evidence states it, and explain it calmly as an inward or blended expression.',
    'No predictions of events, no fear language, no remedies that require a purchase.',
  ],
  sections: [
    {
      id: 'your-chart',
      title: 'Your Birth Chart at a Glance',
      kicker: 'Your Chart',
      intro: 'The chart and planet table below are calculated from your birth details. Every interpretation in this summary is built on these positions.',
      topics: [
        { id: 'natal-chart', title: 'Your Birth Chart (D1)', kind: 'data', block: 'chart-d1', objective: 'North Indian D1 chart.' },
        { id: 'planet-table', title: 'Planetary Positions and Dignities', kind: 'data', block: 'planetary-summary-planet-table', objective: 'Sign, degree, nakshatra, lords, house, dignity and retrograde/combust state of every planet.' },
        {
          id: 'chart-overview', title: 'The Shape of Your Chart', subtitle: 'Your Ascendant and its ruler', kind: 'narrative',
          objective: 'Introduce the reader to their chart: the Ascendant sign and nakshatra, where its lord is placed and what that says about the overall direction of the chart. Keep it to an orientation, not a full reading.',
          requiredEvidence: ['asc.d1.sign', 'asc.d1.lord'], optionalEvidence: ['asc.d1.nakshatra', 'house.1.d1.*', 'planet.*.d1.house'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 },
        },
      ],
    },
    {
      id: 'personal-planets',
      title: 'The Luminaries and Personal Planets',
      kicker: 'Section 1',
      topics: PLANETS.slice(0, 4).map(planetTopic),
    },
    {
      id: 'social-planets',
      title: 'Jupiter, Venus and Saturn',
      kicker: 'Section 2',
      topics: PLANETS.slice(4, 7).map(planetTopic),
    },
    {
      id: 'nodes',
      title: 'Rahu and Ketu',
      kicker: 'Section 3',
      topics: PLANETS.slice(7).map(planetTopic),
    },
    {
      id: 'planetary-balance',
      title: 'Your Planetary Balance',
      kicker: 'Summary',
      topics: [
        {
          id: 'dignity-overview', title: 'Comfort and Challenge Across Your Planets', subtitle: 'Dignity, retrograde and combust states together', kind: 'narrative',
          objective: 'Summarise which planets are placed comfortably (exalted, own or friendly signs) and which work harder (debilitated or enemy signs, combust), and what any retrograde planets add. Close with how the reader can lean on the comfortable planets to support the others.',
          requiredEvidence: ['planet.*.d1.dignity'], optionalEvidence: ['planet.*.d1.retrograde', 'planet.*.d1.combust', 'planet.*.d1.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 },
        },
      ],
    },
  ],
};
