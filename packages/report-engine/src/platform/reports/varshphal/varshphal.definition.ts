/**
 * Varshphal (Tajik annual solar-return) Report — platform definition.
 *
 * Reference: docs/referencerepots/Varshphal Report.pdf (97 pp, third-party; used
 * for information architecture only). Analysis: docs/report-system/analysis/ref-varshphal.md.
 * The reference omitted the classical Tajik elements; this report adds them
 * (Year Lord, Panchadhikari, Tajik yogas, Sahams, Mudda dasha, Masa Pravesha
 * months) as `bonus` topics. Monthly sections are written from each month's
 * own transits and Mudda period — never from fixed month texts.
 */
import { ReportDefinitionInput } from '../../contracts';

type SectionInput = ReportDefinitionInput['sections'][number];
import { pad2 } from '../_annual-shared/astro';

const NATAL_CORE = ['asc.d1.sign', 'asc.d1.lord', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra'];

function planetTopic(planet: string, refPage: string, theme: string) {
  const k = planet.toLowerCase();
  return {
    id: `${k}-year`, title: `${planet} Through Your Year`, subtitle: theme, kind: 'narrative' as const,
    objective: `Interpret ${planet}'s transit through this Varsha year: each sign it occupies (with dates), the houses it activates counted from the natal Ascendant and from the Moon, and whether the classical gochara rule calls each stretch supportive or demanding. Relate it to ${planet}'s natal placement and to its role in the annual chart. Give concrete guidance for the supportive and the demanding stretches.`,
    requiredEvidence: [`varsha.transit.${k}.*`],
    optionalEvidence: [`planet.${k}.d1.sign`, `planet.${k}.d1.house`, `planet.${k}.d1.lordship`, `varsha.planet.${k}.*`, 'varsha.lord'],
    depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, referencePages: refPage,
  };
}

function monthSection(i: number): SectionInput {
  const n = pad2(i);
  const m = `varsha.month.${n}`;
  const base = [`${m}.dates`, `${m}.mudda`, `${m}.focus`, `${m}.ingresses`, `${m}.supportive-count`];
  const ref = `${20 + 6 * (i - 1)}-${25 + 6 * (i - 1)}`;
  return {
    id: `month-${n}`,
    title: `Month ${i} of Your Varsha Year`,
    kicker: `Varsha Month ${i}`,
    intro: 'A Tajik month begins each time the Sun advances a further 30° from its birth position. Everything below is drawn from this month\'s own Mudda period and transits.',
    topics: [
      { id: `m${n}-sky`, title: 'The Sky This Month', kind: 'data', block: `varshphal-month-${n}`, objective: 'Mudda period, mid-month transits, sign changes and life-area houses for this month.', referencePages: ref },
      {
        id: `m${n}-work`, title: 'Career, Money and Learning', subtitle: 'Work, finances, study and decisions this month', kind: 'narrative',
        objective: `Write this month's guidance for career, business, finances and education from this month's evidence only: the Mudda lord(s) and their dates, the transits through the work and wealth houses and the learning houses, and any sign change that falls in the month (name its date). Say which part of the month suits starting, negotiating, consolidating or studying, and why. Be specific to this month; do not write generic monthly filler.`,
        requiredEvidence: [`${m}.dates`, `${m}.area.work`],
        optionalEvidence: [...base, `${m}.area.inner`, `${m}.transit.*`, 'house.10.d1.lord', 'house.2.d1.lord', 'house.11.d1.lord', 'varsha.lord'],
        depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, referencePages: ref,
      },
      {
        id: `m${n}-heart`, title: 'Love, Family and Home', subtitle: 'Relationships and home life this month', kind: 'narrative',
        objective: `Write this month's guidance for love, partnership, family and home life from this month's evidence only: transits through the relationship and home houses, Venus's and the Moon-related factors given, the Mudda lord, and any sign change in the month (with its date). Speak to every relationship stage; suggest one or two concrete relationship habits that fit this month's sky.`,
        requiredEvidence: [`${m}.dates`, `${m}.area.heart`],
        optionalEvidence: [...base, `${m}.transit.venus`, `${m}.transit.*`, 'house.7.d1.lord', 'house.4.d1.lord', 'planet.venus.d1.sign'],
        depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 0 }, dependsOn: [`m${n}-work`], referencePages: ref,
      },
      {
        id: `m${n}-wellbeing`, title: 'Health, Spirit and Practices', subtitle: 'Vitality, inner growth and this month\'s practices', kind: 'narrative',
        objective: `Write this month's guidance for health habits, energy, rest and spiritual growth from this month's evidence (transits through the health houses and the inner-life houses, the supportive-count, the Mudda lord). Then give five practical, ethical or devotional practices keyed to this month's practice planet (the Mudda lord at mid-month) and its weekday: e.g. a routine, an act of service, a short mantra or prayer, a mindful habit. Nothing to buy; no medical claims.`,
        requiredEvidence: [`${m}.focus`, `${m}.area.health`],
        optionalEvidence: [...base, `${m}.area.inner`, `${m}.transit.*`, 'house.6.d1.lord', 'house.1.d1.lord'],
        depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 5 }, dependsOn: [`m${n}-heart`], referencePages: ref,
      },
    ],
  };
}

export const VARSHPHAL_DEFINITION: ReportDefinitionInput = {
  id: 'varshphal',
  reportType: 'VARSHPHAL',
  specVersion: '1.0.0',
  title: 'Varshphal Report',
  subtitle: 'Your year from one birthday to the next — read through your Tajik solar-return chart',
  description: 'This report reads the year that began at your latest solar return: the annual (Varsha) chart, its Year Lord and Muntha, Tajik yogas and Sahams, the Mudda dasha periods, every planetary transit of the year and twelve Tajik months, each written from its own planetary weather.',
  referenceFiles: ['docs/referencerepots/Varshphal Report.pdf'],
  requires: { birthTime: true, partner: false, vargas: ['D1', 'D9'], transitYears: 2 },
  theme: { primary: '7A2E12', accent: 'D9822B', tint: 'FCF4EC' },
  writingGuidance: [
    'This is a Varshphal (Tajik annual) report for one solar-return year. Keep every topic anchored to this year and to the facts given for it.',
    'Annual-chart houses must always be written as "the year\'s Nth house" (for example "Jupiter falls in the year\'s 1st house"). Never write "<planet> in the Nth house" or "<planet> in <sign>" for an annual-chart or transit position; for transits always use the verb "transits" (for example "Saturn transits Pisces, the 7th from your Moon").',
    'Natal placements may be mentioned only from natal evidence and should be marked as "in your birth chart".',
    '"Supportive" and "demanding" are the classical gochara labels from the Moon; present them as seasons that call for different approaches, never as predictions of events or harm.',
    'Monthly topics must be written from that month\'s evidence only (its Mudda lord, its mid-month transits and its sign changes, with dates). Every month must read differently; do not reuse sentences or generic monthly filler.',
    'Never give ratings, scores or stars. Never promise events. Remedies are practical, ethical or devotional, cost nothing and never involve purchases.',
  ],
  sections: [
    {
      id: 'foundations', title: 'Your Birth Foundations', kicker: 'Your Chart',
      intro: 'The birth details and natal chart that every annual calculation in this report starts from.',
      topics: [
        { id: 'birth-synopsis', title: 'Synopsis of Your Birth Details', subtitle: 'Avakahada Chakra and birth Panchanga', kind: 'data', block: 'varshphal-synopsis', objective: 'Avakahada and birth Panchanga.', referencePages: '7' },
        { id: 'natal-chart', title: 'Your Birth Chart (Lagna Kundali)', kind: 'data', block: 'chart-d1', objective: 'North Indian D1 chart.', referencePages: '8' },
        {
          id: 'varshphal-intro', title: 'What Your Varshphal Shows', subtitle: 'The fruit of the year', kind: 'narrative',
          objective: 'Explain in plain language what Varshphal (Tajik annual astrology) is: the solar return, why the year runs from birthday to birthday, and how the annual chart, Year Lord, Muntha, Mudda dasha and transits work together. Then introduce this particular year using its solar-return date and the number of completed years.',
          requiredEvidence: ['varsha.return.date', 'varsha.age'], optionalEvidence: ['varsha.year.end', 'varsha.day-night', 'varsha.lagna.sign', ...NATAL_CORE],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 0 }, referencePages: '6',
        },
      ],
    },
    {
      id: 'annual-chart', title: 'Your Varshphal Chart', kicker: 'Section 1',
      intro: 'The chart cast for the exact moment the Sun returned to its birth position this year.',
      topics: [
        { id: 'solar-return', title: 'The Solar Return Chart', kind: 'data', block: 'varshphal-return', objective: 'Solar-return details and annual chart.', referencePages: '19' },
        { id: 'annual-positions', title: 'Planetary Positions in the Annual Chart', kind: 'data', block: 'varshphal-positions', objective: 'Annual chart positions and Harsha Bala.', bonus: true },
        {
          id: 'annual-chart-reading', title: 'Reading the Year\'s Chart', subtitle: 'The annual Ascendant and the key placements', kind: 'narrative', bonus: true,
          objective: 'Interpret the annual Ascendant and its lord, where the annual Ascendant falls counted from the natal Ascendant, whether this is a day or night return, and the two or three most telling planetary placements of the annual chart (by house) for the tone of the year.',
          requiredEvidence: ['varsha.lagna.sign', 'varsha.lagna.lord'], optionalEvidence: ['varsha.lagna.from-natal', 'varsha.day-night', 'varsha.planet.*', 'varsha.harsha.*'],
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 3 },
        },
      ],
    },
    {
      id: 'year-lord', title: 'The Year Lord and the Muntha', kicker: 'Section 2',
      intro: 'Two classical Tajik keys to the year: the planet that governs it, and the point that carries the year\'s focus.',
      topics: [
        { id: 'panchadhikari', title: 'The Five Office-Bearers (Panchadhikari)', kind: 'data', block: 'varshphal-panchadhikari', objective: 'Panchadhikari and Varshesha selection.', bonus: true },
        {
          id: 'year-lord-reading', title: 'Your Year Lord', subtitle: 'The Varshesha and what it asks of you', kind: 'narrative', bonus: true,
          objective: 'Explain what the Year Lord (Varshesha) is and why it was chosen among the office-bearers, then interpret the reader\'s Year Lord: its house in the annual chart, the houses it rules in the birth chart and its strength, for the overall direction of the year. Include practical guidance for working with this planet\'s themes.',
          requiredEvidence: ['varsha.lord', 'varsha.lord.house'], optionalEvidence: ['varsha.lord.natal-lordship', 'varsha.office.*', 'varsha.harsha.*'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 },
        },
        { id: 'muntha-table', title: 'Your Muntha This Year', kind: 'data', block: 'varshphal-muntha', objective: 'Muntha position and lord.', referencePages: '19' },
        {
          id: 'muntha-reading', title: 'The Muntha and the Year\'s Focus', subtitle: 'Where the year\'s attention gathers', kind: 'narrative',
          objective: 'Explain Muntha, then interpret its house in the annual chart and counted from the natal Ascendant, and the placement of its lord, as the area of life where this year\'s attention and lessons gather. Constructive framing for every house, including the 6th, 8th and 12th.',
          requiredEvidence: ['varsha.muntha.sign', 'varsha.muntha.house'], optionalEvidence: ['varsha.muntha.natal-house', 'varsha.muntha.lord'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, referencePages: '19',
        },
      ],
    },
    {
      id: 'tajik', title: 'Tajik Yogas and Sahams', kicker: 'Section 3',
      intro: 'Tajik astrology reads the year through applying and separating aspects between planets, and through sensitive points called Sahams.',
      topics: [
        { id: 'tajik-yogas', title: 'Tajik Yogas in Your Annual Chart', kind: 'data', block: 'varshphal-tajik', objective: 'Tajik yogas with orbs.', bonus: true },
        {
          id: 'tajik-reading', title: 'What the Year\'s Planetary Links Mean', subtitle: 'Ithasala, Isarpha and related yogas', kind: 'narrative', bonus: true,
          objective: 'Explain applying (Ithasala) versus separating (Isarpha) contacts in plain language, then interpret the most significant Tajik yogas listed — matters that are coming together versus matters that are completing — by the planets involved. If no yoga is formed, explain what that means.',
          requiredEvidence: ['varsha.tajik.count'], optionalEvidence: ['varsha.tajik.*', 'varsha.planet.*.house'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 0 },
        },
        { id: 'sahams', title: 'Sahams: The Year\'s Sensitive Points', kind: 'data', block: 'varshphal-sahams', objective: 'Saham positions.', bonus: true },
        {
          id: 'sahams-reading', title: 'Reading Your Sahams', subtitle: 'Fortune, learning, work and affection points', kind: 'narrative', bonus: true,
          objective: 'Explain what Sahams are, then interpret the houses that the Punya (fortune), Karma (work), Vidya (learning), Preeti (affection) and Karya Siddhi (accomplishment) Sahams fall in this year, and what each suggests. Treat Roga Saham, if mentioned, only as a reminder to keep healthy routines.',
          requiredEvidence: ['varsha.saham.punya'], optionalEvidence: ['varsha.saham.*'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 0 },
        },
      ],
    },
    {
      id: 'mudda', title: 'Mudda Dasha: Planetary Periods of the Year', kicker: 'Section 4',
      intro: 'The Mudda dasha divides the year into nine planetary periods, in the same proportions as the Vimshottari dasha.',
      topics: [
        { id: 'mudda-table', title: 'Your Mudda Dasha Periods', kind: 'data', block: 'varshphal-mudda', objective: 'Mudda dasha table.', bonus: true },
        {
          id: 'mudda-reading', title: 'The Chapters of Your Year', subtitle: 'What each Mudda period emphasises', kind: 'narrative', bonus: true,
          objective: 'Walk through the year\'s Mudda periods in order, with their dates, explaining the theme each lord brings, with emphasis on the longer periods and the period ruled by the Year Lord.',
          requiredEvidence: ['varsha.mudda.01'], optionalEvidence: ['varsha.mudda.*', 'varsha.lord', 'varsha.planet.*.house'],
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 0 },
        },
      ],
    },
    {
      id: 'year-transits', title: 'Transits Through Your Year', kicker: 'Section 5',
      intro: 'Where each planet travels during this Varsha year, counted from your natal Ascendant and Moon.',
      topics: [
        { id: 'transit-summary', title: 'Summary of the Year\'s Transits', kind: 'data', block: 'varshphal-transit-summary', objective: 'Per-planet transit summary with gochara.', referencePages: '8-9' },
        { id: 'transit-table', title: 'Every Sign Period of the Year', kind: 'data', block: 'varshphal-transit-table', objective: 'All transit sign periods with houses.', bonus: true },
      ],
    },
    {
      id: 'planets-swift', title: 'The Swift Planets This Year', kicker: 'Section 6',
      topics: [
        planetTopic('Sun', '10', 'Vitality, authority and purpose'),
        {
          id: 'moon-year', title: 'The Moon in Your Annual Chart', subtitle: 'The year\'s emotional climate', kind: 'narrative',
          objective: 'The Moon changes sign every two and a half days, so its annual role is read from the annual chart: interpret the annual Moon\'s sign and house for the emotional tone, public life and wellbeing of the year, and relate it to the natal Moon sign.',
          requiredEvidence: ['varsha.planet.moon.sign', 'varsha.planet.moon.house'], optionalEvidence: ['planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'varsha.harsha.moon'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, referencePages: '11',
        },
        planetTopic('Mercury', '12', 'Thinking, communication and trade'),
        planetTopic('Mars', '13', 'Drive, courage and property'),
        planetTopic('Venus', '14', 'Love, comfort and creativity'),
      ],
    },
    {
      id: 'planets-slow', title: 'The Slow Planets This Year', kicker: 'Section 7',
      topics: [
        planetTopic('Jupiter', '15', 'Growth, wisdom and blessings'),
        planetTopic('Saturn', '16', 'Discipline, duty and endurance'),
        planetTopic('Rahu', '17', 'Ambition, novelty and the unfamiliar'),
        planetTopic('Ketu', '18', 'Detachment, insight and letting go'),
      ],
    },
    ...Array.from({ length: 12 }, (_, i) => monthSection(i + 1)),
    {
      id: 'observances', title: 'Sacred Days of Your Year', kicker: 'Panchanga',
      intro: 'Full moons and festival tithis that fall within this Varsha year, with practices that cost nothing.',
      topics: [
        { id: 'observance-dates', title: 'Full Moons and Festival Tithis', kind: 'data', block: 'varshphal-observances', objective: 'Computed Purnima and Akshaya Tritiya tithis.', referencePages: '92-94' },
        {
          id: 'observance-practices', title: 'Practices for Sacred Days', subtitle: 'Purnima, Hanuman Jayanti and Akshaya Tritiya', kind: 'narrative',
          objective: 'Explain the meaning of Purnima, Hanuman Jayanti (Chaitra Purnima) and Akshaya Tritiya, and suggest simple devotional, charitable and reflective practices for them, linked to the Year Lord where natural. Nothing to buy; generosity and discipline rather than purchases.',
          requiredEvidence: ['varsha.observances.purnima'], optionalEvidence: ['varsha.lord'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 5 }, referencePages: '92-94',
        },
      ],
    },
    {
      id: 'closing', title: 'Closing Reflections for Your Year', kicker: 'In Closing',
      topics: [
        { id: 'practice-note', title: 'A Note on Practices', kind: 'data', block: 'varshphal-practice-note', objective: 'Caution on practices.', referencePages: '95' },
        {
          id: 'year-closing', title: 'Carrying the Year Forward', subtitle: 'The year in one view', kind: 'narrative',
          objective: 'Draw the year together: the Year Lord, the Muntha house and the longest Mudda period as the three threads of the year, and close with encouraging, practical reflections. Do not repeat earlier paragraphs.',
          requiredEvidence: ['varsha.lord', 'varsha.muntha.house'], optionalEvidence: ['varsha.mudda.*', 'varsha.lagna.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, referencePages: '96',
        },
      ],
    },
  ],
};
