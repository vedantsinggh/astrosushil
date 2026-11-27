/**
 * Premium Personalised Kundli — platform definition (flagship report).
 *
 * Reference: docs/referencerepots/Premium Personalised Kundli Report.pdf (295 pp,
 * third-party; information architecture only). Analysis:
 * docs/report-system/analysis/ref-premium-personalised-kundli.md.
 * Every reference chapter is mapped below via `referencePages`; `bonus: true`
 * marks Astro Sushil additions. Method decisions: docs/report-system/decisions/kundli.md.
 *
 * Cost design: the reference's 79 generic Antardasha pages are replaced by
 * deterministic Antardasha/Pratyantardasha tables plus one narrative per
 * Mahadasha of life (9). Total narrative topics: 45, in sections of ≤ 6.
 */
import { ReportDefinitionInput, ReportTopicInput } from '../../contracts';
import { KUNDLI_VARGAS } from './blocks/charts';

const PLANET_TOPICS: Record<string, { title: string; subtitle: string; ref: string }> = {
  sun: { title: 'The Sun: Your Inner Authority', subtitle: 'Placement, sign and aspects of the Sun', ref: '40-41' },
  moon: { title: 'The Moon: Your Emotional Climate', subtitle: 'Placement, sign and aspects of the Moon', ref: '42-43' },
  mars: { title: 'Mars: Your Drive and Courage', subtitle: 'Placement, sign and aspects of Mars', ref: '48-50' },
  mercury: { title: 'Mercury: How You Think and Speak', subtitle: 'Placement, sign and aspects of Mercury', ref: '44-45' },
  jupiter: { title: 'Jupiter: Your Wisdom and Growth', subtitle: 'Placement, sign and aspects of Jupiter', ref: '51-53' },
  venus: { title: 'Venus: Love, Beauty and Values', subtitle: 'Placement, sign and aspects of Venus', ref: '46-47' },
  saturn: { title: 'Saturn: Discipline and Endurance', subtitle: 'Placement, sign and aspects of Saturn', ref: '54-56' },
  rahu: { title: 'Rahu: The Pull Towards the New', subtitle: 'The north node by house, sign and aspect', ref: '57-59, 121-123' },
  ketu: { title: 'Ketu: The Wisdom You Carry', subtitle: 'The south node by house, sign and aspect', ref: '60-62, 124-126' },
};

function planetTopic(p: string): ReportTopicInput {
  const t = PLANET_TOPICS[p];
  const node = p === 'rahu' || p === 'ketu';
  return {
    id: `planet-${p}`, title: t.title, subtitle: t.subtitle, kind: 'narrative',
    objective: node
      ? `Interpret ${p === 'rahu' ? 'Rahu' : 'Ketu'} by house, sign, nakshatra and dispositor: the theme of the house it occupies, the ${p === 'rahu' ? 'appetite for growth, novelty and unconventional paths' : 'innate detachment, past mastery and spiritual depth'} it brings there, what its aspects (5th, 7th, 9th) touch, any planets it joins, and one constructive way to work with it. Keep the tone curious and empowering; nodes are karmic teachers, not threats.`
      : `Interpret the ${p === 'sun' ? 'Sun' : p.charAt(0).toUpperCase() + p.slice(1)} as a personal profile: first its sign, house, nakshatra and dignity (what it signifies and how it expresses itself here), then what its graha drishti (aspects) brings to the houses and planets it looks at, then the planets it joins or that aspect it. Close with practical guidance for using this planet well.`,
    requiredEvidence: [`planet.${p}.d1.sign`, `planet.${p}.d1.house`],
    optionalEvidence: [`planet.${p}.d1.*`, `kundli.planet.${p}.*`],
    depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 3 },
    referencePages: t.ref,
  };
}

const HOUSE_TOPICS: Array<{ title: string; subtitle: string }> = [
  { title: '1st House: The Self You Present', subtitle: 'Tanu bhava: body, temperament and first impressions' },
  { title: '2nd House: Wealth, Family and Voice', subtitle: 'Dhana bhava: resources, speech and values' },
  { title: '3rd House: Courage and Communication', subtitle: 'Sahaja bhava: effort, siblings and skills' },
  { title: '4th House: Home and Inner Peace', subtitle: 'Sukha bhava: mother, property and comfort' },
  { title: '5th House: Intelligence and Creativity', subtitle: 'Putra bhava: children, learning and romance' },
  { title: '6th House: Service and Resilience', subtitle: 'Ripu bhava: health routines, work and competition' },
  { title: '7th House: Partnership and Marriage', subtitle: 'Kalatra bhava: spouse, contracts and the public' },
  { title: '8th House: Transformation and Depth', subtitle: 'Randhra bhava: longevity, research and shared resources' },
  { title: '9th House: Fortune and Faith', subtitle: 'Dharma bhava: teachers, father and higher learning' },
  { title: '10th House: Career and Reputation', subtitle: 'Karma bhava: work, status and responsibility' },
  { title: '11th House: Gains and Networks', subtitle: 'Labha bhava: income, friends and ambitions' },
  { title: '12th House: Release and Retreat', subtitle: 'Vyaya bhava: expenses, foreign lands and liberation' },
];

function houseTopic(n: number): ReportTopicInput {
  const t = HOUSE_TOPICS[n - 1];
  return {
    id: `house-${n}`, title: t.title, subtitle: t.subtitle, kind: 'narrative',
    objective: `Read the ${n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`} house as a whole: what this bhava governs in plain language, how its sign colours those themes, where its lord is placed and what that placement directs the house towards (bhavesha phala), the planets occupying or aspecting it, and its Sarvashtakavarga support. Give concrete, everyday guidance for this area of life.`,
    requiredEvidence: [`house.${n}.d1.sign`, `house.${n}.d1.lord-house`],
    optionalEvidence: [`house.${n}.d1.*`, `kundli.house.${n}.*`, `sav.house.${n}`],
    depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 },
    referencePages: `${70 + (n - 1) * 2}-${71 + (n - 1) * 2}`,
  };
}

const ORDINAL_WORDS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth'];
const MD_REF = ['161-176', '161-187', '161-198', '161-209', '161-220', '161-231', '161-242', '161-253', '161-263'];

function mahadashaTopics(n: number): ReportTopicInput[] {
  const id = String(n).padStart(2, '0');
  return [
    {
      id: `md-${n}-glance`, title: `The ${ORDINAL_WORDS[n - 1]} Mahadasha of Your Life`, kind: 'data', block: `kundli-md-glance-${n}`,
      objective: 'Dates, ages and the Mahadasha lord\'s placement, with every Antardasha located in the birth chart.', referencePages: MD_REF[n - 1],
    },
    {
      id: `md-${n}-reading`, title: `Living the ${ORDINAL_WORDS[n - 1]} Mahadasha`, subtitle: 'What this period emphasises and how to use it', kind: 'narrative',
      objective: `Interpret Mahadasha ${n} of life. Name its planet and explain what that planet's placement (house, sign, nakshatra, dignity) and the houses it rules bring to the foreground during these years: the life areas activated, the opportunities, the lessons, and the mindset that works best. Then describe how the flavour shifts across its Antardashas in broad strokes (group them; do not write one paragraph per Antardasha). Respect the period status: for a past period write reflectively about what such a period typically develops, for the current period be practical and present-focused, for a future period describe what to prepare for. Include what to emphasise and what to avoid.`,
      requiredEvidence: [`kundli.md.${id}.lord`, `kundli.md.${id}.lord-house`],
      optionalEvidence: [`kundli.md.${id}.*`, `dasha.md.${id}`],
      depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 4 },
      dependsOn: [], referencePages: MD_REF[n - 1],
    },
  ];
}

export const KUNDLI_DEFINITION: ReportDefinitionInput = {
  id: 'kundli',
  reportType: 'KUNDLI',
  specVersion: '1.0.0',
  title: 'Premium Personalised Kundli Report',
  subtitle: 'Your complete Vedic birth chart: calculations, life areas, periods and guidance',
  description: 'The full Kundli: birth particulars and panchang, North and South Indian charts, sixteen divisional charts, Vimshottari periods for the whole of life, Ashtakavarga, twelve houses, nine planets, karakas, Rahu-Ketu, Mars and Sade Sati presented without fear, yogas, numerology and practical guidance.',
  referenceFiles: ['docs/referencerepots/Premium Personalised Kundli Report.pdf'],
  requires: { birthTime: true, partner: false, vargas: KUNDLI_VARGAS as NonNullable<ReportDefinitionInput['requires']['vargas']>, transitYears: 12 },
  theme: { primary: '2E1A47', accent: 'B5852E', tint: 'F3EAF8' },
  writingGuidance: [
    'This is a complete life Kundli. Cover personality, relationships, work, wealth, health habits, learning and spiritual life as each topic requires, always grounded in the cited chart facts.',
    'Write for a reader with no astrology background: explain each term (house, lord, aspect, dasha, nakshatra) briefly the first time it appears in a topic.',
    'Doshas: Astro Sushil does not believe in doshas. Mangal placement, Sade Sati, the Rahu-Ketu axis and challenging houses are described as tendencies and growth areas, never as defects, curses or dangers.',
    'Remedies are practical, ethical and devotional only: habits, service, mantra, reflection. Never recommend gemstones, yantras, rudraksha, paid rituals or anything to buy.',
    'Health: speak of wellbeing habits and areas to care for; never predict illness or give medical advice.',
    'For Mahadasha topics, describe periods as seasons of emphasis, not fixed events; never promise or rule out specific outcomes, and never invent the reader\'s past.',
    'Planets in divisional charts (Navamsa, D10 and others) must always be named with their chart, e.g. "in the Navamsa".',
  ],
  sections: [
    {
      id: 'birth-particulars', title: 'Your Birth Particulars', kicker: 'Kundli at a Glance',
      intro: 'The calculated foundation of your Kundli: time and place, the panchang of your birth day and the Avakahada Chakra.',
      topics: [
        { id: 'birth-details', title: 'Birth Details and Astronomical Data', kind: 'data', block: 'kundli-birth-details', objective: 'Birth data, sunrise, local mean time, ayanamsa and key chart points.', referencePages: '8' },
        { id: 'avakahada', title: 'Avakahada Chakra', subtitle: 'Varna, vashya, yoni, gana, nadi and more', kind: 'data', block: 'kundli-avakahada', objective: 'Moon-based classical attributes.', referencePages: '8' },
        { id: 'panchang-at-birth', title: 'Panchang at Birth', subtitle: 'The five limbs of the day you were born', kind: 'data', block: 'kundli-panchang', objective: 'Vara, tithi, nakshatra, yoga, karana at birth and at sunrise; bhayat/bhabhog; dasha balance.', referencePages: '9' },
        { id: 'ghatak', title: 'Ghatak Chakra', subtitle: 'A traditional almanac reference', kind: 'data', block: 'kundli-ghatak', objective: 'Moon-sign Ghatak factors, presented neutrally.', referencePages: '9' },
      ],
    },
    {
      id: 'blueprint', title: 'Your Planetary Blueprint', kicker: 'Chapter 1',
      intro: 'Your birth chart in North and South Indian styles, the Moon chart, the Navamsa, and the exact position of every planet.',
      topics: [
        { id: 'chart-d1-north', title: 'Lagna Chart (D1), North Indian Style', kind: 'data', block: 'chart-d1', objective: 'North Indian D1 with degrees.', referencePages: '11, 13' },
        { id: 'chart-d1-south-moon', title: 'South Indian Chart and Moon Chart', kind: 'data', block: 'kundli-south-moon', objective: 'South Indian D1 and Chandra lagna chart.', referencePages: '11, 13' },
        { id: 'chart-d9', title: 'Navamsa Chart (D9)', subtitle: 'The chart of marriage, dharma and inner strength', kind: 'data', block: 'chart-d9', objective: 'D9 chart.', referencePages: '12' },
        { id: 'planet-positions', title: 'Planetary Degrees and Positions', kind: 'data', block: 'kundli-planet-table', objective: 'Sign, degree, nakshatra, pada, lords, house, dignity, retrograde/combust, speed.', referencePages: '14' },
        { id: 'house-overview', title: 'The Twelve Houses at a Glance', kind: 'data', block: 'kundli-house-table', objective: 'Sign, lord, lord placement, occupants, aspects and SAV of every house.', bonus: true },
        { id: 'aspect-table', title: 'Planetary Aspects (Graha Drishti)', kind: 'data', block: 'kundli-aspect-table', objective: 'Houses, signs and planets aspected by each planet.', referencePages: '39-62' },
      ],
    },
    {
      id: 'shodashvarga', title: 'The Divisional Charts', kicker: 'Chapter 2',
      intro: 'Sixteen divisional charts (Shodashvarga) refine the birth chart for specific areas of life.',
      topics: [
        { id: 'varga-charts', title: 'Shodashvarga Charts', subtitle: 'Fifteen divisional charts and what each describes', kind: 'data', block: 'kundli-varga-charts', objective: 'Small North Indian charts for D2-D60.', referencePages: '15-19' },
        { id: 'varga-table', title: 'Shodashvarga Table', subtitle: 'Sign of the Ascendant and each planet in every varga', kind: 'data', block: 'kundli-varga-table', objective: 'Varga sign table.', referencePages: '20' },
      ],
    },
    {
      id: 'dasha-tables', title: 'Vimshottari Dasha for Your Whole Life', kicker: 'Chapter 3',
      intro: 'The planetary periods of your life, from Mahadasha to Pratyantardasha. Use these tables as a calendar alongside the Mahadasha readings later in the report.',
      topics: [
        { id: 'life-timeline', title: 'Your Life in Planetary Periods', kind: 'data', block: 'kundli-life-timeline', objective: 'Scaled MD timeline.', bonus: true },
        { id: 'md-table', title: 'Mahadasha Table', kind: 'data', block: 'kundli-md-table', objective: 'MD start, end, length, ages; balance at birth.', referencePages: '13, 22' },
        { id: 'ad-table', title: 'Antardasha Table', subtitle: 'Sub-periods of every Mahadasha', kind: 'data', block: 'kundli-ad-table', objective: 'All MD-AD periods.', referencePages: '22' },
        { id: 'pd-table', title: 'Pratyantardasha Tables', subtitle: 'Sub-sub-periods for the whole of life', kind: 'data', block: 'kundli-pd-tables', objective: 'All MD-AD-PD periods.', referencePages: '23-28' },
      ],
    },
    {
      id: 'ashtakavarga', title: 'Ashtakavarga', kicker: 'Chapter 4',
      intro: 'The classical point system that shows how much support each sign of your chart receives from the planets.',
      topics: [
        { id: 'ashtakavarga-table', title: 'Bhinnashtakavarga and Sarvashtakavarga', kind: 'data', block: 'kundli-ashtakavarga', objective: 'BAV of 7 planets and SAV by sign.', referencePages: '29' },
      ],
    },
    {
      id: 'panchang-decoded', title: 'Your Panchang Decoded', kicker: 'Chapter 5',
      topics: [
        {
          id: 'panchang-reading', title: 'The Five Limbs of Your Birth Day', subtitle: 'Vara, tithi, nakshatra, yoga and karana', kind: 'narrative',
          objective: 'Explain the panchang as the quality of the moment of birth and interpret each limb in turn: the Vedic weekday and its ruling planet, the tithi and paksha, the birth nakshatra, the panchang yoga and the karana. For each, give the temperament it traditionally indicates and one practical use (for example a supportive weekday or tithi for beginnings). Keep it warm and non-fatalistic.',
          requiredEvidence: ['kundli.vara', 'kundli.tithi', 'kundli.nitya-yoga', 'kundli.karana'],
          optionalEvidence: ['kundli.vara.lord', 'kundli.paksha', 'kundli.masa', 'kundli.ritu', 'planet.moon.d1.nakshatra'],
          depth: { minParagraphs: 3, maxParagraphs: 6, bullets: 5 }, referencePages: '30-31',
        },
      ],
    },
    {
      id: 'three-pillars', title: 'The Three Pillars of the Self', kicker: 'Chapter 6',
      intro: 'Your Ascendant, your Moon sign and your birth nakshatra together describe how you meet the world, how you feel and what drives you.',
      topics: [
        {
          id: 'pillar-lagna', title: 'Your Ascendant (Lagna)', subtitle: 'How you meet the world', kind: 'narrative',
          objective: 'Interpret the Ascendant sign, its degree and nakshatra, and the Ascendant lord\'s placement: outlook, physical constitution and style, instincts, and how the lord\'s house directs the life. Practical self-understanding, no flattery.',
          requiredEvidence: ['asc.d1.sign', 'asc.d1.lord'], optionalEvidence: ['asc.d1.*', 'house.1.d1.*', 'kundli.asc.pada'],
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 3 }, referencePages: '32-34',
        },
        {
          id: 'pillar-moon', title: 'Your Moon Sign (Rashi)', subtitle: 'How you feel and what nourishes you', kind: 'narrative',
          objective: 'Interpret the Moon sign, house and dignity: emotional nature, needs for security, how moods move, relationships with family and how the mind best rests. Include the Moon sign element from the Avakahada.',
          requiredEvidence: ['planet.moon.d1.sign', 'planet.moon.d1.house'], optionalEvidence: ['planet.moon.d1.*', 'kundli.avakahada.tatwa', 'kundli.avakahada.gana'],
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 3 }, dependsOn: ['pillar-lagna'], referencePages: '32-34',
        },
        {
          id: 'pillar-nakshatra', title: 'Your Birth Nakshatra', subtitle: 'The lunar mansion of your Moon and its pada', kind: 'narrative',
          objective: 'Interpret the Moon\'s nakshatra, its ruling planet and pada: core motivation, talents and the nakshatra\'s symbolism, plus what the pada adds. Mention the traditional name syllable as a cultural note.',
          requiredEvidence: ['planet.moon.d1.nakshatra', 'kundli.moon.pada'], optionalEvidence: ['kundli.avakahada.*', 'dasha.birth-lord'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, dependsOn: ['pillar-moon'], referencePages: '35-36',
        },
      ],
    },
    {
      id: 'planet-profiles-1', title: 'Planetary Profiles: The Personal Planets', kicker: 'Chapter 7',
      intro: 'Each planet by placement and by aspect: the Sun, Moon, Mars and Mercury.',
      topics: ['sun', 'moon', 'mars', 'mercury'].map(planetTopic),
    },
    {
      id: 'planet-profiles-2', title: 'Planetary Profiles: The Great Teachers', kicker: 'Chapter 8',
      intro: 'Jupiter, Venus and Saturn by placement and by aspect.',
      topics: ['jupiter', 'venus', 'saturn'].map(planetTopic),
    },
    {
      id: 'bhavphal-1', title: 'Bhavphal: Houses One to Six', kicker: 'Chapter 9',
      intro: 'Your life through the twelve houses. Each reading combines the house sign, the placement of its lord, its occupants and aspects, and its Ashtakavarga support.',
      topics: [
        { id: 'bhava-significators', title: 'What Each House Governs', kind: 'data', block: 'kundli-bhava-significators', objective: 'Bhava significations with your signs and lords.', referencePages: '68-69' },
        ...[1, 2, 3, 4, 5, 6].map(houseTopic),
      ],
    },
    {
      id: 'bhavphal-2', title: 'Bhavphal: Houses Seven to Twelve', kicker: 'Chapter 10',
      topics: [
        ...[7, 8, 9, 10, 11, 12].map(houseTopic),
        { id: 'house-lords', title: 'Placement of the House Lords', kind: 'data', block: 'kundli-house-lords', objective: 'Where every house lord sits.', referencePages: '70-93' },
      ],
    },
    {
      id: 'conjunctions', title: 'When Energies Merge: Conjunctions', kicker: 'Chapter 11',
      topics: [
        { id: 'conjunction-table', title: 'Planets Sharing a Sign', kind: 'data', block: 'kundli-conjunctions', objective: 'Conjunction groups with degrees.', referencePages: '95-100' },
        {
          id: 'conjunction-reading', title: 'How Your Planets Blend', subtitle: 'Conjunctions and what they combine', kind: 'narrative',
          objective: 'Explain what a conjunction is, then interpret each conjunction group in the chart: the house it occupies, how the planets\' natures combine or compete, and how closeness in degree intensifies the blend. If there are no conjunctions, explain what a chart of independent planets means and how the strongest planetary relationships then work through aspects instead.',
          requiredEvidence: ['kundli.conjunctions.count'], optionalEvidence: ['kundli.conjunction.*', 'planet.*.d1.conjunctions', 'planet.*.d1.house'],
          depth: { minParagraphs: 2, maxParagraphs: 5, bullets: 0 }, referencePages: '95-100',
        },
      ],
    },
    {
      id: 'love-marriage', title: 'Love and Marriage Snapshot', kicker: 'Chapter 12',
      topics: [
        {
          id: 'love-heart', title: 'What Ignites Your Heart', subtitle: 'The 5th house of romance and Venus', kind: 'narrative',
          objective: 'Interpret romance and attraction from the 5th house sign, its lord\'s placement and Venus: how the reader falls in love, expresses affection and what keeps romance alive. Do not assume relationship status, gender of partner or orientation.',
          requiredEvidence: ['house.5.d1.sign', 'house.5.d1.lord-house'], optionalEvidence: ['house.5.d1.*', 'planet.venus.d1.sign', 'planet.venus.d1.house', 'planet.venus.d1.dignity'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, referencePages: '101-102',
        },
        {
          id: 'love-darakaraka', title: 'Your Darakaraka and the Partner You Grow With', subtitle: 'The 7th house and the Jaimini spouse significator', kind: 'narrative',
          objective: 'Explain the Darakaraka (the planet with the lowest degree among the seven), interpret its planet and placement together with the 7th house sign and lord: qualities of a well-matched partner as tendencies, where connections tend to form, how the bond matures over time, what to be mindful of, and simple relationship practices.',
          requiredEvidence: ['karaka.dk', 'house.7.d1.sign'], optionalEvidence: ['kundli.karaka.dk.placement', 'house.7.d1.*', 'kundli.house.7.*', 'planet.venus.d9.sign'],
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 4 }, dependsOn: ['love-heart'], referencePages: '102-104',
        },
        { id: 'marriage-windows', title: 'Supportive Windows for Commitment', kind: 'data', block: 'kundli-marriage-windows', objective: 'Jupiter transit windows over the 7th house, 7th lord and Darakaraka (D-004).', referencePages: '105' },
      ],
    },
    {
      id: 'career', title: 'Your Career Calling', kicker: 'Chapter 13',
      topics: [
        {
          id: 'career-calling', title: 'Work, Purpose and Professional Style', subtitle: 'Sun, Saturn, the 10th house, the Amatyakaraka and your birth Mahadasha', kind: 'narrative',
          objective: 'Synthesise career direction from: the Sun (authority and visibility), Saturn (discipline and the work you build over time), the 10th house sign and lord placement, the Amatyakaraka planet and placement (Jaimini career significator), and the lord of the Mahadasha running at birth. Name suitable fields as possibilities drawn from these significations, the working style that suits the reader, and practical steps. No guarantees of jobs or income.',
          requiredEvidence: ['house.10.d1.sign', 'house.10.d1.lord-house', 'karaka.amk'],
          optionalEvidence: ['house.10.d1.*', 'kundli.karaka.amk.placement', 'planet.sun.d1.sign', 'planet.sun.d1.house', 'planet.saturn.d1.sign', 'planet.saturn.d1.house', 'dasha.birth-lord', 'kundli.md.01.lord-house', 'asc.d10.sign'],
          depth: { minParagraphs: 3, maxParagraphs: 6, bullets: 4 }, referencePages: '106-109',
        },
      ],
    },
    {
      id: 'chara-karakas', title: 'Chara Karakas: The Planets Behind Your Purpose', kicker: 'Chapter 14',
      topics: [
        { id: 'karaka-table', title: 'Your Seven Chara Karakas', kind: 'data', block: 'kundli-karaka-table', objective: 'Karaka planets, degrees and placements, plus Karakamsha.', referencePages: '112' },
        {
          id: 'karaka-reading', title: 'Reading Your Karakas', subtitle: 'From the Atmakaraka to the Darakaraka', kind: 'narrative',
          objective: 'Explain chara karakas briefly, then give the Atmakaraka the most depth (the soul\'s central lesson, by planet, house and sign, plus the Karakamsha sign in the Navamsa), followed by shorter readings of the Amatyakaraka, Bhratrikaraka, Matrikaraka, Putrakaraka and Gnatikaraka by planet and placement. The Darakaraka is covered in the love chapter; mention it only in passing. Include simple practices that support the Atmakaraka.',
          requiredEvidence: ['karaka.ak', 'kundli.karaka.ak.placement'], optionalEvidence: ['karaka.*', 'kundli.karaka.*', 'kundli.karakamsha.sign'],
          depth: { minParagraphs: 3, maxParagraphs: 6, bullets: 4 }, dependsOn: ['love-darakaraka'], referencePages: '111-120',
        },
      ],
    },
    {
      id: 'rahu-ketu', title: 'Rahu and Ketu: The Karmic Axis', kicker: 'Chapter 15',
      intro: 'The two lunar nodes always sit opposite each other. Rahu shows where life pulls you to grow; Ketu shows what you already know deeply and can release.',
      topics: [planetTopic('rahu'), planetTopic('ketu')],
    },
    {
      id: 'mangal', title: 'Mars and Marriage: The Mangal Question', kicker: 'Chapter 16',
      topics: [
        { id: 'mangal-table', title: 'Where Mars Falls', subtitle: 'Counted from the Ascendant, the Moon and Venus', kind: 'data', block: 'kundli-mangal-table', objective: 'Mangal house check from three points with exceptions; no grading.', referencePages: '128-132' },
        {
          id: 'mangal-reading', title: 'Your Mars in Relationships', subtitle: 'Energy, assertiveness and partnership', kind: 'narrative',
          objective: 'Explain neutrally what people mean by Mangal (Manglik) status and state plainly whether Mars falls in a classical Mangal house from the Ascendant, Moon or Venus in this chart and which exceptions apply. Then interpret Mars by house and sign for temperament, partnership, work and energy, with practical ways to channel it. Never frame it as a dosha, defect, danger or a reason to delay or avoid marriage.',
          requiredEvidence: ['kundli.mangal.pattern', 'planet.mars.d1.house'], optionalEvidence: ['kundli.mangal.*', 'planet.mars.d1.sign', 'planet.mars.d1.dignity', 'planet.mars.d1.aspected-by'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, dependsOn: ['planet-mars'], referencePages: '128-132',
        },
      ],
    },
    {
      id: 'sade-sati', title: 'Your Sade Sati Journey', kicker: 'Chapter 17',
      topics: [
        { id: 'sade-sati-table', title: 'Sade Sati Cycles of Your Life', kind: 'data', block: 'kundli-sadesati-table', objective: 'Lifetime Sade Sati cycles and phases from real Saturn transits.', referencePages: '136, 141-149' },
        {
          id: 'sade-sati-reading', title: 'Saturn and Your Moon', subtitle: 'What the three phases ask of you', kind: 'narrative',
          objective: 'Explain Sade Sati as Saturn\'s seven-and-a-half-year passage over the natal Moon sign and its neighbours, in a calm, constructive tone. Describe what each phase (12th, over the Moon, 2nd) typically emphasises for this Moon sign, state whether it is active now and when the next cycle begins, and give practical habits for these years. It is a period of maturing responsibility, never a curse.',
          requiredEvidence: ['kundli.sadesati.status', 'planet.moon.d1.sign'], optionalEvidence: ['kundli.sadesati.*', 'planet.saturn.d1.sign', 'planet.saturn.d1.house'],
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 4 }, referencePages: '133-152',
        },
      ],
    },
    {
      id: 'yogas', title: 'Yogas in Your Chart', kicker: 'Chapter 18',
      topics: [
        { id: 'yoga-table', title: 'Detected Yogas', kind: 'data', block: 'kundli-yoga-table', objective: 'Engine-detected yogas with their verified conditions.', referencePages: '153-156' },
        {
          id: 'yoga-reading', title: 'What Your Yogas Mean', subtitle: 'Combinations and the potential they describe', kind: 'narrative',
          objective: 'Interpret only the yogas listed in the evidence (they were detected by the calculation engine): what each combination is, the potential it describes and how it tends to show itself when supported by effort and the right periods. Do not name any yoga that is not in the evidence. If none is detected, explain that yogas are one layer of the chart and point to the strongest placements instead.',
          requiredEvidence: ['kundli.yogas.count'], optionalEvidence: ['yoga.*'],
          depth: { minParagraphs: 2, maxParagraphs: 6, bullets: 0 }, referencePages: '153-156',
        },
      ],
    },
    {
      id: 'doshas', title: 'A Note on Doshas', kicker: 'Chapter 19',
      topics: [
        { id: 'dosha-note', title: 'Patterns, Not Problems', kind: 'data', block: 'kundli-pattern-note', objective: 'Neutral list of commonly asked-about patterns with our philosophy.', referencePages: '157-158' },
      ],
    },
    {
      id: 'mahadashas-1', title: 'Your Mahadashas: The Early and Middle Years', kicker: 'Chapter 20',
      intro: 'A reading of each Mahadasha of your life in order, with its Antardashas located in your chart.',
      topics: [1, 2, 3, 4, 5].flatMap(mahadashaTopics),
    },
    {
      id: 'mahadashas-2', title: 'Your Mahadashas: The Later Years', kicker: 'Chapter 21',
      topics: [6, 7, 8, 9].flatMap(mahadashaTopics),
    },
    {
      id: 'numerology', title: 'Numerology Basics', kicker: 'Chapter 22',
      topics: [
        { id: 'numerology-table', title: 'Your Core Numbers', kind: 'data', block: 'kundli-numerology-table', objective: 'Mulank and Bhagyank with ruling planets.', referencePages: '265-268' },
        {
          id: 'numerology-reading', title: 'Mulank and Bhagyank', subtitle: 'Your driver and destiny numbers', kind: 'narrative',
          objective: 'Interpret the Mulank (how the reader approaches daily life) and the Bhagyank (the longer arc of purpose) through their ruling planets, how the two numbers combine, and practical uses for work, learning and relationships.',
          requiredEvidence: ['numerology.mulank', 'numerology.bhagyank'], optionalEvidence: ['kundli.numerology.*'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, referencePages: '265-268',
        },
      ],
    },
    {
      id: 'spiritual', title: 'Your Spiritual Potential', kicker: 'Chapter 23',
      topics: [
        {
          id: 'spiritual-reading', title: 'When the Soul Blooms', subtitle: 'The 9th and 12th houses, Ketu, Jupiter and the Karakamsha', kind: 'narrative',
          objective: 'Describe the reader\'s natural spiritual inclinations from the 9th house (faith, teachers), the 12th house (retreat, surrender), Ketu, Jupiter, the Atmakaraka and the 12th sign from the Karakamsha. Suggest a few suitable practices (meditation styles, study, service, devotion) without prescribing any paid ritual.',
          requiredEvidence: ['house.9.d1.sign', 'house.12.d1.sign'],
          optionalEvidence: ['house.9.d1.*', 'house.12.d1.*', 'planet.ketu.d1.sign', 'planet.ketu.d1.house', 'planet.jupiter.d1.sign', 'planet.jupiter.d1.house', 'karaka.ak', 'kundli.karakamsha.*'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, referencePages: '269-270',
        },
      ],
    },
    {
      id: 'remedies', title: 'Practices to Strengthen Your Chart', kicker: 'Chapter 24',
      topics: [
        { id: 'practice-table', title: 'Your Supportive Practices', subtitle: 'Ascendant lord, Moon-sign lord and current Mahadasha lord', kind: 'data', block: 'kundli-practice-table', objective: 'Deterministic weekday, colour, mantra and service per focus planet.', referencePages: '271-292' },
        {
          id: 'remedy-reading', title: 'Living in Harmony with Your Chart', subtitle: 'Ethical, practical and devotional guidance', kind: 'narrative',
          objective: 'Give a personalised, practical plan based on the focus planets (Ascendant lord, Moon-sign lord and current Mahadasha lord): why each matters for this chart, daily and weekly habits, a simple mantra practice, acts of service, and self-reflection prompts. Emphasise consistency over quantity. Nothing to buy: no gemstones, yantras, rudraksha or paid rituals.',
          requiredEvidence: ['kundli.remedy.focus', 'asc.d1.lord'], optionalEvidence: ['dasha.current.*', 'planet.moon.d1.sign'],
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 5 }, referencePages: '271-292',
        },
      ],
    },
  ],
};
