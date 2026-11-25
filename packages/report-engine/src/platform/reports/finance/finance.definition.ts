/**
 * Finance Report — platform definition.
 *
 * Reference: docs/referencerepots/Finance Report.pdf (32 pp, third-party; used
 * for information architecture only). Analysis: docs/report-system/analysis/ref-finance-report.md.
 * Every reference topic is mapped below (`referencePages`); `bonus: true` marks
 * topics Astro Sushil adds beyond the reference. Method decisions: docs/report-system/decisions/finance-couple.md.
 */
import { ReportDefinitionInput, ReportSectionSchema } from '../../contracts';
import { z } from 'zod/v3';
import { FINANCE_YEARS } from './finance.calc';

type SectionInput = z.input<typeof ReportSectionSchema>;

const YEAR_WORDS = ['One', 'Two', 'Three', 'Four', 'Five'];

function yearSection(n: number): SectionInput {
  const y = `finance.year.${n}`;
  return {
    id: `outlook-year-${n}`,
    title: `Finance Outlook: Year ${YEAR_WORDS[n - 1]}`,
    kicker: `Section ${5 + n}`,
    intro: 'The calendar year read through Jupiter and Saturn in transit, counted from your Ascendant and your Moon, alongside the dasha periods that run beneath it.',
    topics: [
      {
        id: `year-${n}-transits`, title: 'The Year in Transits and Periods', kind: 'data', block: `finance-year-${n}`,
        objective: 'Jupiter and Saturn sign periods, their houses from Lagna and Moon, classical gochara and the running dasha, month by month.',
        referencePages: '10-29',
      },
      {
        id: `year-${n}-overview`, title: 'The Financial Tone of the Year', subtitle: 'Jupiter, Saturn and your wealth houses', kind: 'narrative',
        objective: `Interpret the financial climate of the calendar year in ${y}.year: how Jupiter's and Saturn's transits (houses from the Ascendant and from the Moon, classical gochara, contacts with the 2nd, 5th, 9th and 11th houses) combine with the running dasha periods. Distinguish the first and second half of the year where the transits change sign. Frame as seasons for saving, earning, consolidating or reviewing, never as promised gains or losses.`,
        requiredEvidence: [`${y}.year`, `${y}.jupiter`, `${y}.saturn`, `${y}.wealth-contacts`, `${y}.dasha`],
        optionalEvidence: [`${y}.*`, 'house.2.d1.sign', 'house.11.d1.sign', 'house.2.d1.lord', 'house.11.d1.lord', 'finance.functional.*', 'sav.house.2', 'sav.house.11'],
        depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 0 }, referencePages: '10, 14, 18, 22, 26',
      },
      {
        id: `year-${n}-months`, title: 'Month-by-Month Money Guidance', subtitle: 'Using the monthly table above', kind: 'narrative',
        objective: `Walk through the year in ${y}.year in three or four stretches of months, as defined by the sign changes of Jupiter and Saturn and by any dasha change in ${y}.dasha. For each stretch, give practical money guidance (budgeting, saving, negotiating, reviewing commitments, avoiding impulsive spending) that follows from the transit houses and gochara. Name the months explicitly. No percentages, no promises.`,
        requiredEvidence: [`${y}.year`, `${y}.jupiter-gochara`, `${y}.saturn-gochara`, `${y}.dasha`],
        optionalEvidence: [`${y}.*`, 'finance.functional.*'],
        depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, dependsOn: [`year-${n}-overview`], referencePages: '11-13, 15-17, 19-21, 23-25, 27-29',
      },
    ],
  };
}

export const FINANCE_DEFINITION: ReportDefinitionInput = {
  id: 'finance',
  reportType: 'FINANCE',
  specVersion: '1.0.0',
  title: 'Finance Report',
  subtitle: 'Your wealth houses, planetary allies and a five-year financial outlook from your Vedic chart',
  description: 'Wealth houses (2nd, 5th, 9th, 11th) with lords, occupants and Ashtakavarga, engine-detected Dhana yogas, the Hora (D2), Navamsa and Dasamsa, functional nature of planets, Vimshottari periods and a five-year Jupiter/Saturn finance outlook with a monthly view.',
  referenceFiles: ['docs/referencerepots/Finance Report.pdf'],
  requires: { birthTime: true, partner: false, vargas: ['D1', 'D2', 'D9', 'D10'], transitYears: FINANCE_YEARS + 2 },
  theme: { primary: '1F3B2D', accent: 'B8913A', tint: 'F4F7F1' },
  writingGuidance: [
    'This is a personal finance report: keep every topic anchored to earning, saving, spending, debts, investments of effort and long-term security.',
    'Never give investment, tax, legal or financial-product advice; never name assets, shares, schemes or amounts. Speak of habits, timing and attitudes only.',
    'Never promise wealth, gains or losses. Use measured language: "favours", "supports", "asks for care with".',
    'Transit and dasha periods are seasons of opportunity or consolidation, not guaranteed events. Always mention the months or dates that are given in the evidence when you discuss timing.',
    'Remedies are practical, ethical and devotional only: nothing to buy, no gemstones, no rudraksha, no paid rituals.',
    'Functional "challenging" planets are areas that need conscious handling, never threats.',
  ],
  sections: [
    {
      id: 'wealth-chart',
      title: 'Your Wealth Chart at a Glance',
      kicker: 'Your Chart',
      intro: 'The calculated foundation of this report: your birth data sheet, the full planetary table and the charts used for wealth analysis.',
      topics: [
        { id: 'birth-summary', title: 'Birth Data Sheet', subtitle: 'Lagna, Moon, Panchang and Avakahada', kind: 'data', block: 'finance-summary', objective: 'Key chart, Panchang and Avakahada facts.', referencePages: '1' },
        { id: 'planet-table', title: 'Planetary Positions', subtitle: 'Sign, degree, nakshatra, lordship and karaka of every planet', kind: 'data', block: 'finance-planet-table', objective: 'Full planet table.', referencePages: '1' },
        { id: 'main-charts', title: 'Birth Chart and Moon Chart', kind: 'data', block: 'finance-charts-main', objective: 'D1 and Chandra Lagna charts.', referencePages: '1' },
        { id: 'wealth-charts', title: 'Wealth Divisional Charts', subtitle: 'Hora, Navamsa, Dasamsa and Sarvashtakavarga', kind: 'data', block: 'finance-charts-wealth', objective: 'D2, D9, D10 and SAV charts.', referencePages: '1' },
        { id: 'vimshottari', title: 'Vimshottari Mahadashas', kind: 'data', block: 'finance-vimshottari', objective: 'Mahadasha sequence with dates.', referencePages: '1' },
      ],
    },
    {
      id: 'wealth-houses',
      title: 'The Houses of Wealth',
      kicker: 'Section 1',
      intro: 'Classical astrology reads money through four houses: what you hold (2nd), what you invest your intelligence in (5th), what grace brings (9th) and what you gain (11th).',
      topics: [
        { id: 'wealth-houses-table', title: 'Your Wealth Houses', kind: 'data', block: 'finance-wealth-houses', objective: 'Sign, lord, occupants and SAV of the wealth houses.', bonus: true },
        {
          id: 'second-house', title: 'Finance, Family and Speech', subtitle: 'The 2nd house of accumulated wealth', kind: 'narrative',
          objective: 'Interpret the 2nd house sign, its lord and where that lord sits, any occupants and the 2nd house Sarvashtakavarga for savings habits, family resources, the role of speech and food habits in prosperity. Explain what the 2nd house is the first time.',
          requiredEvidence: ['house.2.d1.sign', 'house.2.d1.lord', 'house.2.d1.lord-house', 'house.2.d1.occupants'],
          optionalEvidence: ['sav.house.2', 'finance.functional.*', 'finance.sav.wealth-total'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, referencePages: '2',
        },
        {
          id: 'eleventh-house', title: 'Gains and Income Streams', subtitle: 'The 11th house of fulfilment', kind: 'narrative',
          objective: 'Interpret the 11th house sign, lord placement, occupants and Sarvashtakavarga for how income tends to arrive (networks, steady salary, multiple streams, elder siblings and friends) and how gains compare with outgo.',
          requiredEvidence: ['house.11.d1.sign', 'house.11.d1.lord', 'house.11.d1.lord-house', 'finance.sav.gain-vs-expense'],
          optionalEvidence: ['house.11.d1.occupants', 'sav.house.11', 'finance.functional.*'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, dependsOn: ['second-house'], bonus: true,
        },
        {
          id: 'fifth-ninth', title: 'Investments of the Mind and the Grace of Fortune', subtitle: 'The 5th and 9th houses', kind: 'narrative',
          objective: 'Interpret the 5th house (intelligence, considered risk, creative ventures) and the 9th house (fortune, mentors, dharma) through their signs, lords and lord placements, and what they say about the reader\'s relationship with risk and luck. Emphasise prudence; no advice about speculation.',
          requiredEvidence: ['house.5.d1.sign', 'house.5.d1.lord-house', 'house.9.d1.sign', 'house.9.d1.lord-house'],
          optionalEvidence: ['house.5.d1.*', 'house.9.d1.*', 'sav.house.5', 'sav.house.9', 'finance.functional.*'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 0 }, bonus: true,
        },
        {
          id: 'earning-power', title: 'Profession as the Engine of Income', subtitle: 'The 10th house and the Dasamsa (D10)', kind: 'narrative',
          objective: 'Interpret the 10th house sign and lord placement together with the D10 ascendant and the D10 placement of the 10th lord, for the style of work through which the reader tends to earn best.',
          requiredEvidence: ['house.10.d1.sign', 'house.10.d1.lord', 'house.10.d1.lord-house', 'asc.d10.sign'],
          optionalEvidence: ['house.10.d1.occupants', 'planet.*.d10.sign', 'planet.*.d10.house', 'sav.house.10'],
          depth: { minParagraphs: 3, maxParagraphs: 3, bullets: 3 }, bonus: true,
        },
      ],
    },
    {
      id: 'money-personality',
      title: 'Your Money Personality',
      kicker: 'Section 2',
      intro: 'How you naturally approach money: your temperament (Lagna), your emotional relationship with security (Moon) and the Hora chart that classical astrology devotes to wealth.',
      topics: [
        {
          id: 'personality', title: 'Personality and Prosperity', subtitle: 'Your Ascendant, its lord and your Navamsa', kind: 'narrative',
          objective: 'Describe the reader\'s temperament in matters of money from the Ascendant sign, its nakshatra, the Ascendant lord\'s placement and the Navamsa ascendant: decision style, spending and saving tendencies, suitable ways of working, and how they handle financial responsibility for family.',
          requiredEvidence: ['asc.d1.sign', 'asc.d1.lord', 'asc.d1.nakshatra', 'asc.d9.sign'],
          optionalEvidence: ['house.1.d1.*', 'planet.*.d1.house'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, referencePages: '4-5',
        },
        {
          id: 'moon-and-money', title: 'The Moon and Financial Security', subtitle: 'Emotions, comfort and spending', kind: 'narrative',
          objective: 'Interpret the Moon\'s sign, nakshatra and house for the emotional side of money: what makes the reader feel secure, emotional spending patterns, and how to build calm, steady habits.',
          requiredEvidence: ['planet.moon.d1.sign', 'planet.moon.d1.house', 'planet.moon.d1.nakshatra', 'planet.moon.d1.dignity'],
          optionalEvidence: ['planet.moon.d1.*'],
          depth: { minParagraphs: 3, maxParagraphs: 3, bullets: 3 }, dependsOn: ['personality'], bonus: true,
        },
        { id: 'hora-table', title: 'The Hora Chart (D2)', subtitle: 'The two halves of wealth', kind: 'data', block: 'finance-hora', objective: 'Sun and Moon hora placements.', bonus: true },
        {
          id: 'hora-reading', title: 'Earning and Keeping', subtitle: 'What the Hora balance suggests', kind: 'narrative',
          objective: 'Explain the Hora (D2) chart in plain language (Sun\'s hora: earning through effort and visibility; Moon\'s hora: accumulating and preserving), then interpret which planets fall in each hora and where the 2nd lord falls. Do not treat this as a prediction of amounts.',
          requiredEvidence: ['finance.d2.sun-hora', 'finance.d2.moon-hora', 'finance.d2.lord2'],
          optionalEvidence: ['house.2.d1.lord', 'house.2.d1.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, bonus: true,
        },
      ],
    },
    {
      id: 'wealth-yogas',
      title: 'Wealth Yogas',
      kicker: 'Section 3',
      intro: 'Classical planetary combinations for prosperity, listed only when our yoga engine detects them in your chart.',
      topics: [
        { id: 'dhana-yoga-table', title: 'Dhana Yogas in Your Chart', kind: 'data', block: 'finance-dhana-yogas', objective: 'Engine-detected Dhana and Lakshmi yogas.', bonus: true },
        {
          id: 'dhana-yogas', title: 'Reading Your Wealth Combinations', kind: 'narrative',
          objective: 'Explain what a Dhana yoga is (association of the lords of the 1st, 2nd, 5th, 9th and 11th houses). If yogas are detected, interpret each detected yoga from its stated conditions and how it may show in life when its planets run their dashas. If none is detected, explain calmly that wealth is then read from house lords, dashas and effort. Never inflate their meaning.',
          requiredEvidence: ['finance.dhana.count'],
          optionalEvidence: ['yoga.dhana-*', 'yoga.lakshmi', 'house.2.d1.lord', 'house.11.d1.lord', 'house.5.d1.lord', 'house.9.d1.lord', 'finance.sav.wealth-total'],
          depth: { minParagraphs: 2, maxParagraphs: 4, bullets: 0 }, bonus: true,
        },
      ],
    },
    {
      id: 'expenses',
      title: 'Debts, Expenses and Protection',
      kicker: 'Section 4',
      intro: 'The 6th, 8th and 12th houses describe loans, sudden changes and outgo. Understanding them is the best protection for what you build.',
      topics: [
        { id: 'trik-table', title: 'The Houses of Outgo', kind: 'data', block: 'finance-trik-houses', objective: '6th, 8th, 12th and 3rd houses with SAV gains-vs-outgo.', referencePages: '8-9' },
        {
          id: 'trik-houses', title: 'Debts, Sudden Events and Expenditure', subtitle: 'Your 6th, 8th and 12th lords', kind: 'narrative',
          objective: 'Interpret the 6th lord (loans, competition), 8th lord (sudden gains or losses, inheritance, insurance) and 12th lord (expenditure, giving, foreign spending) by placement, and any planets occupying the 12th house, as areas to manage consciously. Calm, practical, non-fearful.',
          requiredEvidence: ['house.6.d1.lord-house', 'house.8.d1.lord-house', 'house.12.d1.lord-house', 'house.12.d1.occupants'],
          optionalEvidence: ['house.6.d1.*', 'house.8.d1.*', 'house.12.d1.*', 'sav.house.12', 'finance.functional.*'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, referencePages: '8-9',
        },
        {
          id: 'savings-discipline', title: 'Building a Cushion', subtitle: 'Gains versus outgo in your Ashtakavarga', kind: 'narrative',
          objective: 'Using the Sarvashtakavarga comparison of the 11th and 12th houses and the 2nd house bindus, describe the reader\'s natural balance between earning and spending and give concrete saving and budgeting habits that suit it.',
          requiredEvidence: ['finance.sav.gain-vs-expense', 'sav.house.2', 'sav.house.11', 'sav.house.12'],
          optionalEvidence: ['finance.sav.wealth-total', 'house.12.d1.sign', 'house.2.d1.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 4 }, dependsOn: ['trik-houses'], bonus: true,
        },
      ],
    },
    {
      id: 'planetary-allies',
      title: 'Your Planetary Allies',
      kicker: 'Section 5',
      intro: 'Which planets work for your finances and which ask for care, by the classical lordship rules for your Ascendant. This replaces gemstone "power" percentages, which have no classical basis.',
      topics: [
        { id: 'functional-table', title: 'Functional Nature of the Planets', kind: 'data', block: 'finance-functional', objective: 'Functional benefic/malefic classification by Lagna.', referencePages: '3' },
        { id: 'dasha-nature-table', title: 'Mahadashas and Their Money Themes', kind: 'data', block: 'finance-dasha-nature', objective: 'Dasha-wise functional nature and wealth links.', referencePages: '3' },
        {
          id: 'planetary-allies-reading', title: 'Working with Your Allies', subtitle: 'Supportive and demanding planets for wealth', kind: 'narrative',
          objective: 'Explain functional nature in plain language, then interpret the reader\'s Yogakaraka (if any), the functionally favourable planets and the challenging ones for finances, linking each to the houses it rules. Suggest non-material ways to strengthen the favourable planets\' themes (qualities, habits, service). Nothing to buy.',
          requiredEvidence: ['finance.yogakaraka', 'finance.functional.*'],
          optionalEvidence: ['asc.d1.sign', 'planet.*.d1.house', 'planet.*.d1.lordship'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, referencePages: '3',
        },
      ],
    },
    ...Array.from({ length: FINANCE_YEARS }, (_, i) => yearSection(i + 1)),
    {
      id: 'dasha-analysis',
      title: 'Dasha Analysis for Wealth',
      kicker: 'Section 11',
      intro: 'Vimshottari periods set the long rhythm of financial life. Here are the running Mahadasha and every sub-period in the outlook window.',
      topics: [
        { id: 'dasha-window-table', title: 'Periods in the Outlook Window', kind: 'data', block: 'finance-dasha-window', objective: 'Antardashas with their lords\' houses and functional nature.', referencePages: '30-32' },
        {
          id: 'current-mahadasha', title: 'The Running Mahadasha', subtitle: 'Its long-term financial theme', kind: 'narrative',
          objective: 'Interpret the running Mahadasha lord for finances: the houses it rules and occupies, its functional nature and wealth links, and what this suggests for assets, profession, family responsibilities and learning during the whole period.',
          requiredEvidence: ['finance.md.current', 'dasha.current.md'],
          optionalEvidence: ['finance.functional.*', 'planet.*.d1.house', 'planet.*.d1.lordship', 'planet.*.d1.dignity'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 0 }, referencePages: '30',
        },
        {
          id: 'antardashas', title: 'Sub-Periods Through the Outlook Window', subtitle: 'Antardasha by Antardasha', kind: 'narrative',
          objective: 'Go through each Antardasha listed in the evidence in order, naming its dates, and describe its financial emphasis from the sub-period lord\'s house, lordship, functional nature and wealth links. One focused passage per sub-period, with a practical suggestion for each.',
          requiredEvidence: ['finance.ad.*'],
          optionalEvidence: ['finance.functional.*', 'finance.md.current'],
          depth: { minParagraphs: 3, maxParagraphs: 6, bullets: 0 }, dependsOn: ['current-mahadasha'], referencePages: '31-32',
        },
        {
          id: 'next-mahadasha', title: 'Looking Further: The Next Mahadasha', kind: 'narrative',
          objective: 'Describe the financial theme of the next Mahadasha from its lord\'s houses, functional nature and wealth links, and how to prepare for the transition.',
          requiredEvidence: ['finance.md.next'],
          optionalEvidence: ['finance.functional.*', 'dasha.md.*'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, bonus: true,
        },
      ],
    },
    {
      id: 'practices',
      title: 'Ethical Wealth Practices',
      kicker: 'Section 12',
      intro: 'Classical astrology pairs every reading with conduct. These practices cost nothing and ask only for consistency.',
      topics: [
        {
          id: 'wealth-practices', title: 'Practices for Prosperity', subtitle: 'Devotional and ethical, with nothing to buy', kind: 'narrative',
          objective: 'Offer practical, ethical and devotional practices tied to the reader\'s 2nd and 11th lords and Yogakaraka (for example honouring the planet\'s qualities through conduct, weekday discipline, charity of time, gratitude, honest dealings). State clearly that nothing needs to be bought: no gemstones, rudraksha or paid rituals.',
          requiredEvidence: ['house.2.d1.lord', 'house.11.d1.lord', 'finance.yogakaraka'],
          optionalEvidence: ['finance.functional.*', 'asc.d1.lord'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 5 }, referencePages: '6-9',
        },
        {
          id: 'money-habits', title: 'Your Personal Money Compass', subtitle: 'Bringing the report together', kind: 'narrative',
          objective: 'Summarise the report into a personal money compass: the reader\'s natural strengths with money, the areas needing care, the current dasha theme and the most supportive stretch in the outlook years. Close with encouragement about free will and effort.',
          requiredEvidence: ['house.2.d1.sign', 'house.11.d1.sign', 'finance.md.current', 'finance.sav.gain-vs-expense'],
          optionalEvidence: ['finance.year.*.year', 'finance.year.*.wealth-contacts', 'finance.yogakaraka', 'finance.dhana.count'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 4 }, bonus: true,
        },
      ],
    },
  ],
};
