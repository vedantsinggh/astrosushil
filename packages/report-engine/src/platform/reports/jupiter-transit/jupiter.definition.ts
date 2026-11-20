/**
 * Jupiter Transit Report — platform definition.
 *
 * Reference: docs/referencerepots/Jupiter Transit Report.pdf (79 pp, third-party;
 * information architecture only). Analysis: docs/report-system/analysis/ref-jupiter-transit.md.
 * Every reference topic is mapped (`referencePages`); `bonus: true` marks additions.
 * Gemstone, rudraksha and crystal pages (ref 57–63) are replaced by purchase-free
 * practices (decision D-007); Astro-Vastu directions (ref 65–66) rest on an
 * undefined mapping and are replaced by a living-space practice topic.
 */
import { ReportDefinitionInput } from '../../contracts';
import {
  bavReadingTopic,
  collectiveTopic,
  moonPsycheTopic,
  moonSignTopic,
  natalAspectsTopic,
  natalConjunctionTopic,
  natalHouseTopic,
  natalLordshipTopic,
  natalNakshatraTopic,
  natalSignTopic,
  practicesTopic,
  stayAspectsTopic,
  stayAvTopic,
  stayLagnaTopic,
  stayMoonTopic,
  stayNatalTopic,
  stayRetroTopic,
} from '../_planet-transit-shared';

export const JUPITER_DEFINITION: ReportDefinitionInput = {
  id: 'jupiter-transit',
  reportType: 'JUPITER_TRANSIT',
  specVersion: '1.0.0',
  title: 'Jupiter Transit Report',
  subtitle: 'Wisdom, growth and the timing of Jupiter\'s blessings, read from your own chart',
  description: 'This report reads natal Jupiter by house, sign, nakshatra, aspects and lordship, its Ashtakavarga, and Jupiter\'s current and next transits computed from real ingress and station dates, from your Ascendant and from your Moon, with practical, purchase-free practices.',
  referenceFiles: ['docs/referencerepots/Jupiter Transit Report.pdf'],
  requires: { birthTime: true, partner: false, vargas: ['D1'], transitYears: 3 },
  theme: { primary: '5A3A12', accent: 'C8962E', tint: 'FBF5E8' },
  writingGuidance: [
    'This is a Jupiter report: keep every topic anchored to Jupiter\'s themes (wisdom, growth, teachers, children, fortune, ethics, faith, wealth through right conduct).',
    'Transit periods are supportive windows, never promised events. Name dates only as they appear in the evidence.',
    'Jupiter expands: balance optimism with practical advice about excess, overconfidence and over-commitment.',
    'Never claim that Jupiter guarantees marriage, children, wealth or success.',
  ],
  sections: [
    {
      id: 'jupiter-glance', title: 'Jupiter at a Glance', kicker: 'Your Charts',
      intro: 'The calculated facts this report is built on: your birth chart, your Moon chart and the sky on the report date.',
      topics: [
        { id: 'jupiter-summary', title: 'Your Jupiter Details', kind: 'data', block: 'jupiter-summary', objective: 'Birth details and Jupiter placement.', referencePages: '12' },
        { id: 'natal-chart', title: 'Birth Chart (Lagna Kundali)', kind: 'data', block: 'chart-d1', objective: 'North Indian D1 chart.', referencePages: '13' },
        { id: 'moon-chart', title: 'Moon Chart (Chandra Kundali)', kind: 'data', block: 'jupiter-moon-chart', objective: 'Chart counted from the Moon sign.', referencePages: '13' },
        { id: 'transit-chart', title: 'Jupiter Transit Chart', subtitle: 'The planets on the report date, in your houses', kind: 'data', block: 'jupiter-transit-chart', objective: 'Transit positions on the report date.', referencePages: '14' },
      ],
    },
    {
      id: 'jupiter-shift', title: 'The Grand Celestial Shift', kicker: 'Introduction',
      topics: [
        {
          id: 'jupiter-why-now', title: 'Jupiter\'s Transformative Transit for You', subtitle: 'Why Jupiter\'s present journey matters', kind: 'narrative',
          objective: 'Introduce Jupiter\'s present and next transit signs for this reader, the houses they touch from the Ascendant and the Moon, and what the report will help them understand and plan. Warm, orienting, no promises.',
          requiredEvidence: ['jupiter.transit.a.sign', 'jupiter.transit.a.house-asc', 'jupiter.transit.b.sign'],
          optionalEvidence: ['jupiter.transit.a.dates', 'jupiter.transit.a.house-moon', 'jupiter.transit.b.house-asc', 'jupiter.transit.a.status'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, referencePages: '8-9',
        },
        { id: 'brihaspati', title: 'The Cosmic King: Brihaspati', kind: 'data', block: 'jupiter-legend', objective: 'Mythology and Navagraha verse.', referencePages: '8, 10' },
        { id: 'jupiter-houses', title: 'How the Benevolent Giant Shapes the Houses', kind: 'data', block: 'jupiter-houses', objective: 'What Jupiter signifies and how its aspects work.', referencePages: '15' },
        collectiveTopic('jupiter', { title: 'The Game-Changer: Jupiter and the Collective', referencePages: '16' }),
      ],
    },
    {
      id: 'jupiter-journey', title: 'The Celestial Journey of Jupiter', kicker: 'Natal Jupiter',
      topics: [
        natalNakshatraTopic('jupiter', { title: 'Journey Through the Nakshatras', referencePages: '18-19' }),
        natalHouseTopic('jupiter', { title: 'All About Your Natal Jupiter', referencePages: '20-22' }),
        natalSignTopic('jupiter', { title: 'The Energy of Jupiter\'s Sign', referencePages: '31' }),
        { id: 'jupiter-lordship', title: 'The Houses Jupiter Rules for You', kind: 'data', block: 'jupiter-lordship', objective: 'Lordship and yogakaraka check.', referencePages: '28-29' },
        natalLordshipTopic('jupiter', { title: 'Benefic or Demanding? Jupiter\'s Role for You', referencePages: '28-29' }),
        natalConjunctionTopic('jupiter', { title: 'Planetary Conjunctions with Jupiter', referencePages: '32' }),
      ],
    },
    {
      id: 'jupiter-aspects-section', title: 'The Golden Glance of Jupiter', kicker: 'Natal Jupiter',
      topics: [
        { id: 'jupiter-aspect-table', title: 'Where Jupiter Looks', kind: 'data', block: 'jupiter-natal-aspects', objective: 'Natal 5th/7th/9th aspects.', referencePages: '24-27' },
        natalAspectsTopic('jupiter', { title: 'The Aspects of Your Natal Jupiter', referencePages: '24-27' }),
      ],
    },
    {
      id: 'jupiter-moon', title: 'Jupiter and Your Moon', kicker: 'The Mind\'s View',
      topics: [
        moonSignTopic('jupiter', { title: 'Your Moon Sign and Jupiter', bonus: true }),
        moonPsycheTopic('jupiter', { title: 'Moon-Sign Psyche Evolution', referencePages: '33' }),
      ],
    },
    {
      id: 'rendezvous-current', title: 'Cosmic Rendezvous: The Current Transit', kicker: 'Jupiter in Transit',
      intro: 'The Jupiter sign period in progress (or about to begin) on the report date, including every retrograde re-entry and station.',
      topics: [
        { id: 'jupiter-a-card', title: 'The Transit at a Glance', kind: 'data', block: 'jupiter-stay-a', objective: 'Dates, stations, houses, aspects, bindus.', referencePages: '35' },
        stayLagnaTopic('jupiter', 'a', { title: 'Jupiter\'s Transit Embraces Your Kundali', referencePages: '35-36' }),
        stayAspectsTopic('jupiter', 'a', { title: 'Transiting Jupiter\'s Aspects', referencePages: '37-38' }),
        stayMoonTopic('jupiter', 'a', { title: 'When Jupiter\'s Transit Embraces Your Moon Sign', referencePages: '40-44' }),
        stayRetroTopic('jupiter', 'a', { title: 'Jupiter\'s Retrograde Season', bonus: true }),
        stayNatalTopic('jupiter', 'a', { title: 'Jupiter\'s Transit over Natal Planets', referencePages: '6 (index)' }),
        stayAvTopic('jupiter', 'a', { title: 'Ashtakavarga and This Transit', referencePages: '49-50' }),
      ],
    },
    {
      id: 'rendezvous-next', title: 'Cosmic Rendezvous: The Next Transit', kicker: 'Jupiter in Transit',
      intro: 'The Jupiter sign period that follows, so that you can plan ahead.',
      topics: [
        { id: 'jupiter-b-card', title: 'The Next Transit at a Glance', kind: 'data', block: 'jupiter-stay-b', objective: 'Dates, stations, houses, aspects, bindus.', referencePages: '51' },
        stayLagnaTopic('jupiter', 'b', { title: 'The Next Transit in Your Kundali', referencePages: '51-52' }),
        stayAspectsTopic('jupiter', 'b', { title: 'Aspects of the Next Transit', referencePages: '53-54' }),
        stayMoonTopic('jupiter', 'b', { title: 'The Next Transit from Your Moon Sign', bonus: true }),
        stayRetroTopic('jupiter', 'b', { title: 'Retrograde Jupiter in the Next Period', bonus: true }),
        stayNatalTopic('jupiter', 'b', { title: 'The Next Transit over Natal Planets', referencePages: '7 (index)' }),
        stayAvTopic('jupiter', 'b', { title: 'Ashtakavarga and the Next Transit', bonus: true }),
      ],
    },
    {
      id: 'jupiter-ashtakavarga', title: 'The Ashtakavarga of Jupiter', kicker: 'Points of Support',
      intro: 'Ashtakavarga measures, sign by sign, how much support each planet finds in your chart. It is the classical way to judge how a Jupiter transit will feel.',
      topics: [
        { id: 'jupiter-bav', title: 'Jupiter\'s Bhinnashtakavarga', subtitle: 'Contributions of each planet and the Ascendant', kind: 'data', block: 'jupiter-bav', objective: 'Jupiter BAV prastara.', referencePages: '45' },
        { id: 'jupiter-sav', title: 'Sarvashtakavarga', subtitle: 'The combined support of every sign', kind: 'data', block: 'jupiter-sav', objective: 'SAV matrix.', referencePages: '46' },
        { id: 'jupiter-bindu-guide', title: 'How to Read the Bindus', kind: 'data', block: 'jupiter-bindu-guide', objective: 'Classical interpretation of bindus and DIY steps.', referencePages: '47-48' },
        { id: 'jupiter-transit-bindus', title: 'Jupiter\'s Coming Transits and Their Bindus', kind: 'data', block: 'jupiter-transit-bindus', objective: 'BAV/SAV per upcoming transit sign.', bonus: true },
        bavReadingTopic('jupiter', { title: 'Jupiter\'s Influence as per Your Ashtakavarga', referencePages: '46' }),
      ],
    },
    {
      id: 'jupiter-road', title: 'The Twelve-Year Road of Jupiter', kicker: 'Twelve Years Ahead',
      intro: 'Every Jupiter sign period for the next twelve years, and each of Jupiter\'s returns to its natal sign across your life.',
      topics: [
        { id: 'jupiter-overview', title: 'Jupiter\'s Sign Periods, Next 12 Years', kind: 'data', block: 'jupiter-overview', objective: 'All Jupiter sign periods.', bonus: true },
        { id: 'jupiter-returns-table', title: 'Your Jupiter Returns', kind: 'data', block: 'jupiter-returns', objective: 'Jupiter returns to its natal sign.', bonus: true },
        {
          id: 'jupiter-returns', title: 'The Jupiter Return', subtitle: 'A renewal of growth about every twelve years', kind: 'narrative', bonus: true,
          objective: 'Explain the Jupiter return (transiting Jupiter re-entering its natal sign) and interpret the reader\'s returns by age as twelve-year chapters of learning and renewal, linked to the natal Jupiter house.',
          requiredEvidence: ['jupiter.returns', 'planet.jupiter.d1.sign'],
          optionalEvidence: ['planet.jupiter.d1.house', 'jupiter.transit.horizon'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 },
        },
      ],
    },
    {
      id: 'jupiter-remedies', title: 'Sacred Remedies, Nothing to Buy', kicker: 'Remedies',
      intro: 'Classical remedies for Jupiter are knowledge, generosity, respect for teachers and ethical living. Everything here is free.',
      topics: [
        { id: 'remedy-principles', title: 'How Astro Sushil Approaches Remedies', kind: 'data', block: 'jupiter-remedy-principles', objective: 'Remedy philosophy and boundaries.', referencePages: '56, 76' },
        { id: 'jupiter-mantra', title: 'Mantra Chanting', kind: 'data', block: 'jupiter-mantra', objective: 'Jupiter mantra and devotional practice.', referencePages: '67-68' },
        practicesTopic('jupiter', 'remedy-giving', 'Donations, Charity and Seva', 'sharing knowledge, supporting students and teachers, feeding people, giving time and attention, offering within one\'s means (reference: donations, charity, seva)', { referencePages: '69-71' }),
        practicesTopic('jupiter', 'remedy-practice', 'Meditation, Yoga and Lifestyle', 'meditation, breathwork, morning study, honouring teachers and elders, ethical conduct in money and speech, moderation in food (reference: meditation, yoga, lifestyle changes)', { referencePages: '72-74' }),
        practicesTopic('jupiter', 'remedy-space', 'A Space for Wisdom', 'keeping a clean, uncluttered place for study or prayer at home, a daily reading corner, sacred books treated with respect (in place of the reference\'s Astro-Vastu directions, which rest on an undefined mapping)', { referencePages: '65-66' }),
      ],
    },
    {
      id: 'jupiter-closing', title: 'Making the Most of Jupiter', kicker: 'Harnessing Jupiter',
      topics: [
        {
          id: 'jupiter-harness', title: 'Harnessing Jupiter\'s Influence', subtitle: 'Turning opportunity into lasting growth', kind: 'narrative',
          objective: 'Draw the report together: the reader\'s natal Jupiter (house, sign, houses ruled) and the current and next transit houses, as a plan for the coming years. End with encouragement and a reminder that choices remain the reader\'s.',
          requiredEvidence: ['planet.jupiter.d1.house', 'jupiter.transit.a.house-asc', 'jupiter.transit.b.house-asc'],
          optionalEvidence: ['jupiter.natal.lordship-type', 'jupiter.transit.a.sign', 'jupiter.transit.b.sign', 'jupiter.returns'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, referencePages: '78',
        },
      ],
    },
  ],
};
