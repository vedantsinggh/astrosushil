/**
 * Rahu Ketu Transit Report — platform definition.
 *
 * Reference: docs/referencerepots/Rahu Ketu Transit Report.pdf (90 pp, third-party;
 * information architecture only). Analysis: docs/report-system/analysis/ref-rahu-ketu-transit.md.
 * Every reference topic is mapped (`referencePages`); `bonus: true` marks additions.
 * Gemstone eligibility, rudraksha and crystal pages (ref 70–73) are replaced by
 * purchase-free practices (decision D-007); Astro-Vastu (ref 75–76) rests on an
 * undefined mapping and is replaced by a living-space practice topic.
 */
import { ReportDefinitionInput, ReportTopicInput } from '../../contracts';
import {
  collectiveTopic,
  moonSignTopic,
  natalAspectsTopic,
  natalConjunctionTopic,
  natalHouseTopic,
  natalNakshatraTopic,
  natalSignTopic,
  PlanetKey,
  practicesTopic,
  stayAspectsTopic,
  stayLagnaTopic,
  stayMoonTopic,
  stayNatalTopic,
} from '../_planet-transit-shared';

function karmaTopic(k: PlanetKey, pages: string): ReportTopicInput {
  const N = k === 'rahu' ? 'Rahu' : 'Ketu';
  return {
    id: `${k}-karma`, title: `Transcending Karmic Patterns: ${N}`, subtitle: k === 'rahu' ? 'What you came to learn' : 'What you already carry', kind: 'narrative',
    objective: `Using natal ${N}'s house, sign and dispositor, describe in three parts: the past-life or inherited pattern traditionally read from this placement (as a symbolic, not literal, idea), the challenges it tends to bring in this life, and practical ways to work with them. No fear; free will first.`,
    requiredEvidence: [`planet.${k}.d1.house`, `planet.${k}.d1.sign`, `${k}.natal.dispositor`],
    optionalEvidence: [`planet.${k}.d1.nakshatra`, `planet.${k}.d1.conjunctions`],
    depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 6 }, referencePages: pages,
  };
}

function spheresTopic(slot: 'a' | 'b', view: 'asc' | 'moon', pages: string | undefined): ReportTopicInput {
  const from = view === 'asc' ? 'Ascendant' : 'Moon sign';
  return {
    id: `nodes-${slot}-spheres-${view}`, title: `Spheres of Your Life: from Your ${from}`, kind: 'narrative',
    ...(pages ? { referencePages: pages } : { bonus: true }),
    objective: `For the ${slot === 'a' ? 'current' : 'next'} node period, combine the houses Rahu and Ketu occupy from the ${from} into practical guidance for ${view === 'asc' ? 'family, career, finances and relationships' : 'career and finances, family and relationships, well-being habits, and one piece of overall advice'}. Mention the dates once. Supportive-window language only; no medical or financial advice.`,
    requiredEvidence: [`rahu.transit.${slot}.house-${view}`, `ketu.transit.${slot}.house-${view}`, `rahu.transit.${slot}.dates`],
    optionalEvidence: [`rahu.transit.${slot}.sign`, `ketu.transit.${slot}.sign`, view === 'asc' ? 'asc.d1.sign' : 'planet.moon.d1.sign'],
    depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 6 },
  };
}

function periodSections(slot: 'a' | 'b'): ReportDefinitionInput['sections'] {
  const label = slot === 'a' ? 'The Current Node Transit' : 'The Next Node Transit';
  const cur = slot === 'a';
  return [
    {
      id: `nodes-${slot}-kundali`, title: `Cosmic Karma: ${label}`, kicker: 'Rahu and Ketu in Transit',
      intro: cur ? 'The node period in progress on the report date. Rahu and Ketu always change signs together, so the pair is read as one season.' : 'The node period that follows, so that you can prepare rather than react.',
      topics: [
        { id: `rahu-${slot}-card`, title: cur ? 'Transiting Rahu at a Glance' : 'The Next Rahu Transit at a Glance', kind: 'data', block: `rahu-ketu-rahu-stay-${slot}`, objective: 'Dates, houses, aspects, natal contacts.', referencePages: cur ? '40' : '59' },
        stayLagnaTopic('rahu', slot, { title: cur ? 'Rahu\'s Transit Embraces Your Kundali' : 'The Next Rahu Transit in Your Kundali', referencePages: cur ? '40-41' : '59' }),
        stayAspectsTopic('rahu', slot, { title: cur ? 'Aspects of Transiting Rahu' : 'Aspects of the Next Rahu Transit', referencePages: cur ? '42' : '60' }),
        stayNatalTopic('rahu', slot, { title: cur ? 'Rahu\'s Transit over Natal Planets' : 'The Next Rahu Transit over Natal Planets', referencePages: cur ? '47' : '63' }),
        { id: `ketu-${slot}-card`, title: cur ? 'Transiting Ketu at a Glance' : 'The Next Ketu Transit at a Glance', kind: 'data', block: `rahu-ketu-ketu-stay-${slot}`, objective: 'Dates, houses, aspects, natal contacts.', referencePages: cur ? '44' : '61' },
        stayLagnaTopic('ketu', slot, { title: cur ? 'Ketu\'s Transit Embraces Your Kundali' : 'The Next Ketu Transit in Your Kundali', referencePages: cur ? '44-45' : '61' }),
        stayAspectsTopic('ketu', slot, { title: cur ? 'Aspects of Transiting Ketu' : 'Aspects of the Next Ketu Transit', referencePages: cur ? '46' : '62' }),
        stayNatalTopic('ketu', slot, { title: cur ? 'Ketu\'s Transit over Natal Planets' : 'The Next Ketu Transit over Natal Planets', referencePages: cur ? '48' : '64' }),
      ],
    },
    {
      id: `nodes-${slot}-moon`, title: `${label}: Moon and Life Spheres`, kicker: 'Rahu and Ketu in Transit',
      topics: [
        stayMoonTopic('rahu', slot, cur ? { title: 'When Rahu\'s Transit Embraces Your Moon Sign', referencePages: '49-52' } : { title: 'The Next Rahu Transit from Your Moon', bonus: true }),
        stayMoonTopic('ketu', slot, cur ? { title: 'When Ketu\'s Transit Embraces Your Moon Sign', referencePages: '53-54' } : { title: 'The Next Ketu Transit from Your Moon', bonus: true }),
        spheresTopic(slot, 'asc', cur ? '55' : '66-67'),
        spheresTopic(slot, 'moon', cur ? '56' : '67-68'),
      ],
    },
  ];
}

export const RAHU_KETU_DEFINITION: ReportDefinitionInput = {
  id: 'rahu-ketu-transit',
  reportType: 'RAHU_KETU_TRANSIT',
  specVersion: '1.0.0',
  title: 'Rahu Ketu Transit Report',
  subtitle: 'Your karmic axis and the timing of the shadow planets, read from your own chart',
  description: 'This report reads natal Rahu and Ketu by house, sign, nakshatra, aspects and companions, your karmic axis, and the current and next node transits computed from real ingress dates (mean node), from your Ascendant and from your Moon, with practical, purchase-free practices.',
  referenceFiles: ['docs/referencerepots/Rahu Ketu Transit Report.pdf'],
  requires: { birthTime: true, partner: false, vargas: ['D1'], transitYears: 3 },
  theme: { primary: '2B2340', accent: 'B48A5A', tint: 'F6F1F4' },
  writingGuidance: [
    'This is a Rahu and Ketu report: Rahu is ambition, curiosity, desire, the new and unconventional; Ketu is detachment, intuition, past mastery and spiritual release. Always treat them as a pair on one axis.',
    'Astro Sushil does not believe in doshas. Never present Rahu or Ketu, Kaal Sarp or eclipses as curses, bad luck or danger. Frame them as karmic learning and growth.',
    'Past-life ideas are symbolic and traditional, never literal claims about the reader\'s previous lives.',
    'Transit periods are supportive or demanding windows, never promised events. Name dates only as they appear in the evidence.',
  ],
  sections: [
    {
      id: 'nodes-glance', title: 'Rahu and Ketu at a Glance', kicker: 'Your Charts',
      intro: 'The calculated facts this report is built on: your birth chart, your Moon chart and the sky on the report date.',
      topics: [
        { id: 'nodes-summary', title: 'Your Rahu and Ketu Details', kind: 'data', block: 'rahu-ketu-summary', objective: 'Birth details and node placements.', referencePages: '11' },
        { id: 'natal-chart', title: 'Birth Chart (Lagna Kundali)', kind: 'data', block: 'chart-d1', objective: 'North Indian D1 chart.', referencePages: '12' },
        { id: 'moon-chart', title: 'Moon Chart (Chandra Kundali)', kind: 'data', block: 'rahu-ketu-moon-chart', objective: 'Chart counted from the Moon sign.', referencePages: '12' },
        { id: 'transit-chart', title: 'Transit Chart of Rahu and Ketu', subtitle: 'The planets on the report date, in your houses', kind: 'data', block: 'rahu-ketu-transit-chart', objective: 'Transit positions on the report date.', referencePages: '12' },
      ],
    },
    {
      id: 'nodes-shift', title: 'The Shadow Planets Shift', kicker: 'Introduction',
      topics: [
        {
          id: 'nodes-why-now', title: 'The Nodes Realign', subtitle: 'Your personalised forecast in brief', kind: 'narrative',
          objective: 'Introduce the current Rahu and Ketu transit signs, their dates and the houses they touch from the Ascendant and Moon for this reader, and what this report covers (natal axis, transits, practices). Warm and orienting, no fear.',
          requiredEvidence: ['rahu.transit.a.sign', 'ketu.transit.a.sign', 'rahu.transit.a.dates', 'rahu.transit.a.house-asc'],
          optionalEvidence: ['ketu.transit.a.house-asc', 'rahu.transit.a.house-moon', 'ketu.transit.a.house-moon', 'rahu.transit.b.sign'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, referencePages: '7-8',
        },
        { id: 'nodes-legend', title: 'The Illusionist and the Liberator', kind: 'data', block: 'rahu-ketu-legend', objective: 'Samudra Manthan and the Rahu verse.', referencePages: '7, 9' },
        { id: 'ketu-verse', title: 'Ketu, the Head of the Stars', kind: 'data', block: 'rahu-ketu-ketu-verse', objective: 'Ketu verse.', referencePages: '10' },
        { id: 'nodes-houses', title: 'How the Shadow Planets Shape Your Houses', kind: 'data', block: 'rahu-ketu-houses', objective: 'How nodes work in a chart.', referencePages: '14-15' },
        collectiveTopic('rahu', { id: 'nodes-collective', title: 'Karmic Catalyst: The Collective Climate', referencePages: '16-17', requiredEvidence: ['rahu.transit.a.sign', 'ketu.transit.a.sign'], optionalEvidence: ['rahu.transit.a.dates'] }),
      ],
    },
    {
      id: 'natal-rahu', title: 'Rahu in Your Chart', kicker: 'The Celestial Journey of the Nodes',
      topics: [
        natalNakshatraTopic('rahu', { title: 'Journey Through the Nakshatras: Rahu', referencePages: '18' }),
        natalHouseTopic('rahu', { title: 'All About Your Natal Rahu', referencePages: '21-23' }),
        { id: 'rahu-aspect-table', title: 'Where Rahu Looks', kind: 'data', block: 'rahu-ketu-rahu-aspects', objective: 'Natal Rahu aspects.', referencePages: '24' },
        natalAspectsTopic('rahu', { title: 'Aspects of Your Natal Rahu', referencePages: '24-25' }),
        natalSignTopic('rahu', { title: 'Your Natal Rahu\'s Sign Energy', referencePages: '31' }),
        natalConjunctionTopic('rahu', { title: 'Your Natal Rahu\'s Companions', referencePages: '33' }),
        moonSignTopic('rahu', { title: 'Natal Rahu and Your Moon Sign', referencePages: '36' }),
      ],
    },
    {
      id: 'natal-ketu', title: 'Ketu in Your Chart', kicker: 'The Celestial Journey of the Nodes',
      topics: [
        natalNakshatraTopic('ketu', { title: 'Journey Through the Nakshatras: Ketu', referencePages: '19' }),
        natalHouseTopic('ketu', { title: 'All About Your Natal Ketu', referencePages: '26-27' }),
        { id: 'ketu-aspect-table', title: 'Where Ketu Looks', kind: 'data', block: 'rahu-ketu-ketu-aspects', objective: 'Natal Ketu aspects.', referencePages: '28' },
        natalAspectsTopic('ketu', { title: 'Aspects of Your Natal Ketu', referencePages: '28-29' }),
        natalSignTopic('ketu', { title: 'Your Natal Ketu\'s Sign Energy', referencePages: '32' }),
        natalConjunctionTopic('ketu', { title: 'Your Natal Ketu\'s Companions', referencePages: '34' }),
        moonSignTopic('ketu', { title: 'Natal Ketu and Your Moon Sign', referencePages: '37' }),
      ],
    },
    {
      id: 'karmic-axis', title: 'The Karmic Axis', kicker: 'Past and Purpose',
      intro: 'Rahu and Ketu always sit opposite each other. Together they describe a single line through your chart, from familiar ground to new territory.',
      topics: [
        { id: 'nodes-axis-table', title: 'Your Node Axis', kind: 'data', block: 'rahu-ketu-axis', objective: 'Rahu/Ketu axis facts.', bonus: true },
        karmaTopic('rahu', '38'),
        karmaTopic('ketu', '39'),
        {
          id: 'nodes-axis', title: 'Balancing the Axis', subtitle: 'Growing towards Rahu without abandoning Ketu', kind: 'narrative', bonus: true,
          objective: 'Interpret the two houses of the node axis together as one life theme: how to grow into Rahu\'s house while drawing on Ketu\'s natural strengths, with practical examples. No fear.',
          requiredEvidence: ['planet.rahu.d1.house', 'planet.ketu.d1.house'],
          optionalEvidence: ['planet.rahu.d1.sign', 'planet.ketu.d1.sign', 'rahu.natal.dispositor', 'ketu.natal.dispositor'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 },
        },
      ],
    },
    ...periodSections('a'),
    ...periodSections('b'),
    {
      id: 'nodes-ashtakavarga', title: 'The Nodes and Ashtakavarga', kicker: 'Points of Support',
      topics: [
        { id: 'nodes-motion', title: 'Fun Facts: Why the Nodes Move Backwards', kind: 'data', block: 'rahu-ketu-motion', objective: 'Node motion, returns and Ashtakavarga facts.', referencePages: '21, 57' },
        { id: 'nodes-sav-table', title: 'Sarvashtakavarga of the Node Transit Signs', kind: 'data', block: 'rahu-ketu-sav-nodes', objective: 'SAV of node transit signs.', bonus: true },
        { id: 'nodes-sav', title: 'Sarvashtakavarga', subtitle: 'The combined support of every sign', kind: 'data', block: 'rahu-ketu-sav', objective: 'SAV matrix.', bonus: true },
      ],
    },
    {
      id: 'nodes-road', title: 'The Eighteen-Year Road of the Nodes', kicker: 'Long View',
      intro: 'Every node sign period for the next nineteen years, and the node returns across your life.',
      topics: [
        { id: 'rahu-overview', title: 'Rahu\'s Sign Periods', kind: 'data', block: 'rahu-ketu-rahu-overview', objective: 'All Rahu sign periods.', bonus: true },
        { id: 'ketu-overview', title: 'Ketu\'s Sign Periods', kind: 'data', block: 'rahu-ketu-ketu-overview', objective: 'All Ketu sign periods.', bonus: true },
        { id: 'rahu-returns-table', title: 'Your Node Returns', kind: 'data', block: 'rahu-ketu-returns', objective: 'Rahu returns to its natal sign.', bonus: true },
        {
          id: 'nodes-returns', title: 'The Node Return', subtitle: 'Turning points about every 18.6 years', kind: 'narrative', bonus: true,
          objective: 'Explain the node return (transiting Rahu re-entering its natal sign, with Ketu in its natal sign at the same time) and interpret the reader\'s returns by age as turning points of direction, linked to the natal node houses.',
          requiredEvidence: ['rahu.returns', 'planet.rahu.d1.sign'],
          optionalEvidence: ['planet.rahu.d1.house', 'planet.ketu.d1.house', 'rahu.transit.horizon'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 },
        },
      ],
    },
    {
      id: 'nodes-remedies', title: 'Sacred Remedies, Nothing to Buy', kicker: 'Remedies',
      intro: 'Classical remedies for the nodes are awareness, simplicity, service and devotion. Everything here is free.',
      topics: [
        { id: 'remedy-principles', title: 'How Astro Sushil Approaches Remedies', kind: 'data', block: 'rahu-ketu-remedy-principles', objective: 'Remedy philosophy and boundaries.', referencePages: '69, 86' },
        { id: 'nodes-mantra', title: 'Mantra Chanting', kind: 'data', block: 'rahu-ketu-mantra', objective: 'Node mantras and devotional practice.', referencePages: '77-78' },
        practicesTopic('rahu', 'remedy-rahu', 'Practices for Rahu', 'grounding restlessness, honest ambition, digital discipline, keeping promises, service to people on the margins (reference: donations, seva, meditation and lifestyle for Rahu)', { referencePages: '79, 81-84' }),
        practicesTopic('ketu', 'remedy-ketu', 'Practices for Ketu', 'meditation, simplicity, finishing what is started, care for animals and the sick, letting go of what is complete (reference: donations, seva, meditation and lifestyle for Ketu)', { referencePages: '79, 81-85' }),
        practicesTopic('rahu', 'remedy-space', 'Order and Simplicity at Home', 'decluttering, repairing broken things, a calm corner free of screens, simple routines that steady the mind (in place of the reference\'s Astro-Vastu directions, which rest on an undefined mapping)', { referencePages: '75-76, 84-85' }),
      ],
    },
    {
      id: 'nodes-closing', title: 'Two Halves, One Journey', kicker: 'Your Rahu and Ketu Evolution',
      topics: [
        {
          id: 'nodes-evolution', title: 'Your Rahu and Ketu Evolution', subtitle: 'Bringing the axis together', kind: 'narrative',
          objective: 'Draw the report together: the natal node axis and the current and next transit houses as one evolving story of growth and release. End with encouragement and a reminder that choices remain the reader\'s.',
          requiredEvidence: ['planet.rahu.d1.house', 'planet.ketu.d1.house', 'rahu.transit.a.house-asc'],
          optionalEvidence: ['ketu.transit.a.house-asc', 'rahu.transit.b.house-asc', 'ketu.transit.b.house-asc', 'rahu.returns'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, referencePages: '89',
        },
      ],
    },
  ],
};
