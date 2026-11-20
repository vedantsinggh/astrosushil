/**
 * Personalised Fortune Report Plus — numerology (shared with Fortune) plus the
 * "Cosmic Pathway" astrology half.
 *
 * Reference: docs/referencerepots/Personalised Fortune Report Plus.pdf (139 pp,
 * third-party; information architecture only). Analysis:
 * docs/report-system/analysis/ref-personalised-fortune-report-plus.md.
 * Decisions: docs/report-system/decisions/numerology.md (NUM-xxx, FP-xxx).
 */
import { ReportDefinitionInput, ReportTopicInput } from '../../contracts';
import { NUMEROLOGY_WRITING_GUIDANCE, numerologySections } from '../_numerology-shared/sections';

const PLANET_PAGES: Record<string, string> = {
  Sun: '84-85', Moon: '86-87', Jupiter: '88-89', Rahu: '90-91', Mercury: '92-93', Venus: '94-95', Ketu: '96', Saturn: '97', Mars: '98',
};

function planetTopic(name: string): ReportTopicInput {
  const k = name.toLowerCase();
  return {
    id: `planet-${k}`, title: `${name} in Your Chart`, subtitle: `What ${name} represents, and its house in your chart`, kind: 'narrative',
    objective: `Briefly explain what ${name} signifies (its karakatva), then interpret its sign and house in the reader's birth chart, with its dignity, conjunctions and aspects where given: how it shows up in daily life, strengths and points of care, and one or two practical suggestions.`,
    requiredEvidence: [`planet.${k}.d1.house`, `planet.${k}.d1.sign`],
    optionalEvidence: [`planet.${k}.d1.*`, `house.*.d1.lord`],
    depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 4 }, referencePages: PLANET_PAGES[name],
  };
}

export const FORTUNE_PLUS_DEFINITION: ReportDefinitionInput = {
  id: 'fortune-plus',
  reportType: 'FORTUNE_PLUS',
  specVersion: '1.0.0',
  title: 'Fortune Report Plus',
  subtitle: 'Your numbers and your stars — numerology and Vedic astrology in one personal guide',
  description:
    'Part one reads your numbers: Mulank, Bhagyank, name numbers, the Lo Shu grid, Kua directions, your twelve-month fortune trend and life cycles. Part two, the Cosmic Pathway, reads your Vedic birth chart: charts and panchang, birth star and ascendant, every planet in its house, Mars and Saturn themes explained calmly, yogas, marriage timing, career and simple remedies.',
  referenceFiles: ['docs/referencerepots/Personalised Fortune Report Plus.pdf'],
  requires: { birthTime: true, partner: false, vargas: ['D1', 'D9', 'D10'], transitYears: 12 },
  language: 'en',
  theme: { primary: '5A3A28', accent: 'B8863B', tint: 'F7F0E6' },
  writingGuidance: [
    ...NUMEROLOGY_WRITING_GUIDANCE.map((g) => g.replace('in this numerology part', 'in the numerology part (part two uses real chart positions from the evidence)')),
    'In the astrology part (the Cosmic Pathway), planets and houses are real chart positions: use only the evidence given for each topic.',
    'Manglik and Sade Sati are explained as developmental themes, never as doshas, afflictions or reasons for fear; no grading of severity.',
    'Remedies in the astrology part are devotional, ethical and practical only; no gemstones, rudraksha, yantras or anything to buy.',
  ],
  sections: [
    ...numerologySections('fortune-plus', 'en', 'p'),
    {
      id: 'cosmic-pathway',
      title: 'The Cosmic Pathway: Your Charts',
      kicker: 'Part Two · Vedic Astrology',
      intro: 'From numbers to stars: your birth charts, planetary positions and birth panchang.',
      topics: [
        {
          id: 'cosmic-bridge', title: 'From Numbers to Stars', kind: 'narrative',
          objective: 'A bridge from the numerology part to the birth chart: explain how the Vedic chart adds the positions of the planets at the moment of birth, and introduce the reader\'s Ascendant and Moon sign alongside their Mulank.',
          requiredEvidence: ['asc.d1.sign', 'planet.moon.d1.sign'], optionalEvidence: ['numerology.mulank', 'asc.d1.lord'],
          depth: { minParagraphs: 2, maxParagraphs: 3 }, referencePages: '76',
        },
        { id: 'chart-d1', title: 'Lagna Chart (D1)', kind: 'data', block: 'chart-d1', objective: 'North Indian birth chart.', referencePages: '77' },
        { id: 'chart-d9', title: 'Navamsa Chart (D9)', kind: 'data', block: 'chart-d9', objective: 'Navamsa chart.', referencePages: '77' },
        { id: 'chart-moon', title: 'Chandra Kundali (Moon Chart)', kind: 'data', block: 'fortune-plus-moon-chart', objective: 'Chart from the Moon sign.', referencePages: '77' },
        { id: 'planet-table', title: 'Planetary Positions', kind: 'data', block: 'fortune-plus-planets', objective: 'Sign, house, degree, nakshatra and dignity of every planet.', bonus: true },
        { id: 'birth-panchang', title: 'Birth Panchang', kind: 'data', block: 'fortune-plus-panchang', objective: 'Paksha, tithi, vara, nakshatra, yoga, karana, sunrise and sunset.', referencePages: '78' },
      ],
    },
    {
      id: 'star-and-ascendant',
      title: 'Your Birth Star and Ascendant',
      kicker: 'Cosmic Pathway',
      topics: [
        {
          id: 'janma-nakshatra', title: 'Your Janma Nakshatra', subtitle: 'The lunar mansion of your birth', kind: 'narrative',
          objective: 'Explain the 27 nakshatras briefly, then interpret the reader\'s Moon nakshatra and pada (with its ruling planet): key traits and gifts.',
          requiredEvidence: ['planet.moon.d1.nakshatra'], optionalEvidence: ['dasha.birth-lord', 'planet.moon.d1.sign', 'panchang.tithi'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 5 }, referencePages: '79-80',
        },
        {
          id: 'nakshatra-potential', title: 'Ways to Harness Your Birth Star', kind: 'narrative',
          objective: 'Five practical ways to use the strengths of the reader\'s birth nakshatra in work, relationships and self-care.',
          requiredEvidence: ['planet.moon.d1.nakshatra'], optionalEvidence: ['dasha.birth-lord'],
          depth: { minParagraphs: 2, maxParagraphs: 2, bullets: 5 }, dependsOn: ['janma-nakshatra'], referencePages: '81',
        },
        {
          id: 'ascendant', title: 'Your Ascendant', subtitle: 'The rising sign and how you meet the world', kind: 'narrative',
          objective: 'Interpret the Ascendant sign and the placement of its lord: temperament, approach to life, physical vitality and everyday habits.',
          requiredEvidence: ['asc.d1.sign', 'asc.d1.lord'], optionalEvidence: ['house.1.d1.*', 'asc.d1.nakshatra'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 6 }, referencePages: '82-83',
        },
        {
          id: 'moon-sign', title: 'Your Moon Sign', subtitle: 'Your emotional nature', kind: 'narrative',
          objective: 'Interpret the Moon\'s sign and house as the emotional nature and the mind: what brings the reader peace and how they handle stress.',
          requiredEvidence: ['planet.moon.d1.sign', 'planet.moon.d1.house'], optionalEvidence: ['planet.moon.d1.*'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, bonus: true,
        },
      ],
    },
    {
      id: 'planets-1',
      title: 'Planets and Their Houses: Luminaries and Inner Planets',
      kicker: 'Planets and Their Attributes',
      intro: 'Each planet signifies certain areas of life; its house shows where that energy is most active for you.',
      topics: ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter'].map(planetTopic),
    },
    {
      id: 'planets-2',
      title: 'Planets and Their Houses: Venus, Saturn and the Nodes',
      kicker: 'Planets and Their Attributes',
      topics: ['Venus', 'Saturn', 'Rahu', 'Ketu'].map(planetTopic),
    },
    {
      id: 'manglik',
      title: 'Mars and Partnership: Manglik Analysis',
      kicker: 'Cosmic Pathway',
      intro: 'A calm look at a configuration that is often over-dramatised.',
      topics: [
        { id: 'manglik-table', title: 'Where Mars Stands', kind: 'data', block: 'fortune-plus-manglik', objective: 'Mars counted from Lagna, Moon and Venus, with moderating factors.', referencePages: '99' },
        {
          id: 'manglik-view', title: 'Understanding Your Mars Placement', kind: 'narrative',
          objective: 'Explain what the classical Manglik rule looks at, then state factually from which reference points (if any) Mars is in a Manglik position and which moderating factors apply. Frame it as energy and temperament in partnership, never as a dosha or a problem.',
          requiredEvidence: ['manglik.reference-points'], optionalEvidence: ['manglik.*', 'planet.mars.d1.house', 'planet.mars.d1.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, referencePages: '99-101',
        },
        {
          id: 'mars-energy', title: 'How to Harness Your Mars Energy', kind: 'narrative',
          objective: 'Strengths of the reader\'s Mars and practical ways to channel its energy (exercise, courage, patience in disagreements, devotion such as Hanuman Chalisa if they wish).',
          requiredEvidence: ['planet.mars.d1.house', 'planet.mars.d1.sign'], optionalEvidence: ['planet.mars.d1.*', 'manglik.reference-points'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 6 }, dependsOn: ['manglik-view'], referencePages: '100-102',
        },
      ],
    },
    {
      id: 'sade-sati',
      title: 'Sade Sati: Saturn over Your Moon',
      kicker: 'Cosmic Pathway',
      intro: 'The seven-and-a-half-year passage of Saturn over your Moon sign, calculated for your whole life.',
      topics: [
        { id: 'sadesati-table', title: 'Your Sade Sati Periods', kind: 'data', block: 'fortune-plus-sadesati', objective: 'All Sade Sati cycles and phases with dates.', referencePages: '110' },
        {
          id: 'sadesati-meaning', title: 'What Sade Sati Means for You', kind: 'narrative',
          objective: 'Explain Sade Sati as a period of maturing and restructuring keyed to the Moon sign, and state whether it is active on the report date and when the next cycle falls (from the evidence).',
          requiredEvidence: ['sadesati.moon-sign', 'sadesati.current'], optionalEvidence: ['sadesati.cycle.*'],
          depth: { minParagraphs: 2, maxParagraphs: 3 }, referencePages: '103',
        },
        {
          id: 'sadesati-phases', title: 'The Three Phases', subtitle: 'Rising, peak and setting', kind: 'narrative',
          objective: 'Describe the typical emphasis of the rising, peak and setting phases (emotional, health routines, finances as habits, family), with constructive guidance for each; refer to the reader\'s cycle dates where useful.',
          requiredEvidence: ['sadesati.cycle.*'], optionalEvidence: ['sadesati.moon-sign', 'sadesati.current'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, dependsOn: ['sadesati-meaning'], referencePages: '104-109',
        },
        {
          id: 'sadesati-practices', title: 'Practices for Saturn\'s Seasons', kind: 'narrative',
          objective: 'Free, ethical practices that suit Saturn: discipline, service to the elderly and workers, Saturday lamp or prayer if wished, Hanuman Chalisa or Shani mantra. Nothing to buy.',
          requiredEvidence: ['sadesati.moon-sign'], optionalEvidence: ['sadesati.current', 'planet.saturn.d1.house'],
          depth: { minParagraphs: 2, maxParagraphs: 2, bullets: 6 }, referencePages: '109',
        },
      ],
    },
    {
      id: 'yogas',
      title: 'Yogas Formed in Your Birth Chart',
      kicker: 'Cosmic Pathway',
      intro: 'Special planetary combinations recognised by classical texts, detected by our engine\'s rules.',
      topics: [
        { id: 'yoga-table', title: 'Yogas Detected', kind: 'data', block: 'fortune-plus-yogas', objective: 'Detected yogas with conditions.', referencePages: '111-123' },
        {
          id: 'yogas-effects', title: 'The Effects of Your Yogas', kind: 'narrative',
          objective: 'Explain what a yoga is, then interpret the yogas detected in the chart (only those in the evidence): their themes and how they tend to show in life. If none is listed, explain that the chart\'s strength lies in individual placements instead.',
          requiredEvidence: ['asc.d1.sign'], optionalEvidence: ['yoga.*'],
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 4 }, referencePages: '111-123',
        },
        { id: 'dasha-table', title: 'Your Vimshottari Mahadashas', kind: 'data', block: 'fortune-plus-dashas', objective: 'Mahadasha sequence with dates.', bonus: true },
        {
          id: 'yogas-timing', title: 'When Your Yogas Come Alive', kind: 'narrative',
          objective: 'Using the Mahadasha periods given, explain which periods tend to activate the planets of the detected yogas, and the current period\'s theme. Use only the dates in the evidence.',
          requiredEvidence: ['dasha.md.*', 'dasha.current.md'], optionalEvidence: ['yoga.*', 'dasha.current.ad'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, dependsOn: ['yogas-effects'], referencePages: '112-123',
        },
      ],
    },
    {
      id: 'marriage',
      title: 'About Your Marriage',
      kicker: 'Cosmic Pathway',
      topics: [
        {
          id: 'darakaraka-spouse', title: 'Your Marriage and Spouse', subtitle: 'The Darakaraka and the 7th house', kind: 'narrative',
          objective: 'Explain the Darakaraka (the planet with the lowest degree, signifying the spouse) and the 7th house; interpret them as qualities of a partner and of the partnership, the likely setting in which the reader meets partners, and the partner\'s working style. Tendencies only; inclusive of any relationship status.',
          requiredEvidence: ['karaka.dk', 'house.7.d1.sign', 'house.7.d1.lord'], optionalEvidence: ['house.7.d1.*', 'planet.*.d1.house', 'planet.venus.d1.sign', 'asc.d9.sign'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, referencePages: '124-125',
        },
        {
          id: 'marriage-character', title: 'Key Characteristics of Your Marriage', kind: 'narrative',
          objective: 'The tone of married life suggested by Venus, the 7th lord\'s placement and the Navamsa ascendant: what nourishes the bond and what needs care.',
          requiredEvidence: ['planet.venus.d1.sign', 'house.7.d1.lord-house'], optionalEvidence: ['planet.venus.d1.*', 'asc.d9.sign', 'planet.venus.d9.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, dependsOn: ['darakaraka-spouse'], referencePages: '125',
        },
        { id: 'marriage-windows', title: 'Favourable Periods for Marriage', kind: 'data', block: 'fortune-plus-jupiter-windows', objective: 'Jupiter transit windows over the 7th house, 7th lord and Darakaraka.', referencePages: '126' },
      ],
    },
    {
      id: 'astro-career',
      title: 'Career Predictions',
      kicker: 'Cosmic Pathway',
      topics: [
        {
          id: 'career-houses', title: 'Your Career Indicators', subtitle: 'The 10th house, its lord and the D10 chart', kind: 'narrative',
          objective: 'Interpret the 10th house sign, its occupants and its lord\'s placement, and the D10 ascendant where given: suitable work environments and fields.',
          requiredEvidence: ['house.10.d1.sign', 'house.10.d1.lord'], optionalEvidence: ['house.10.d1.*', 'asc.d10.sign', 'planet.*.d10.house'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 5 }, referencePages: '127',
        },
        {
          id: 'career-dasha', title: 'Career Through Your Planetary Periods', kind: 'narrative',
          objective: 'The birth Mahadasha and the current Mahadasha/Antardasha as seasons of career growth: what each period favours, using only the dates given.',
          requiredEvidence: ['dasha.birth-lord', 'dasha.current.md'], optionalEvidence: ['dasha.current.ad', 'dasha.md.*', 'house.10.d1.lord'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, dependsOn: ['career-houses'], referencePages: '127',
        },
      ],
    },
    {
      id: 'astro-remedies',
      title: 'Astrology Remedies',
      kicker: 'Cosmic Pathway',
      intro: 'Simple, free practices. Choose only two or three and keep them with sincerity.',
      topics: [
        { id: 'remedy-table', title: 'Strengthening Your Key Planets', kind: 'data', block: 'fortune-plus-remedies', objective: 'Trikona lords with day, deity form, mantra and service.', referencePages: '128-133' },
        {
          id: 'remedy-practices', title: 'Mantra, Devotion and Service', kind: 'narrative',
          objective: 'How to work with the Ascendant, 5th and 9th lords through mantra, devotion and service, explaining why these lords are chosen. No gemstones, rudraksha or purchases.',
          requiredEvidence: ['house.1.d1.lord', 'house.5.d1.lord', 'house.9.d1.lord'], optionalEvidence: ['asc.d1.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 4 }, referencePages: '128-133',
        },
        {
          id: 'lifestyle-remedies', title: 'Remedies for Improving Lifestyle', kind: 'narrative',
          objective: 'Six everyday lifestyle habits suited to the reader\'s Moon sign and Ascendant lord (routine, food sharing, nature, sleep, gratitude, generosity).',
          requiredEvidence: ['planet.moon.d1.sign', 'asc.d1.lord'], optionalEvidence: ['num.mulank.planet'],
          depth: { minParagraphs: 2, maxParagraphs: 2, bullets: 6 }, referencePages: '133-135',
        },
      ],
    },
  ],
};
