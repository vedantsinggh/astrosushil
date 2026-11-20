/**
 * Saturn In Your Birth Chart — platform definition.
 *
 * Reference: docs/referencerepots/Saturn In Your Birth Chart Report.pdf (87 pp,
 * third-party; information architecture only). Analysis:
 * docs/report-system/analysis/ref-saturn-birth-chart.md. Every reference topic
 * is mapped (`referencePages`); `bonus: true` marks additions. Celebrity case
 * studies (ref 76–82) are replaced by a reading of the reader's own chart: we do
 * not publish unverified charts of real people.
 */
import { ReportDefinitionInput, ReportTopicInput } from '../../contracts';
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

function phaseTopic(key: 'rising' | 'peak' | 'setting', title: string, house: string, pages: string): ReportTopicInput {
  return {
    id: `sade-sati-${key}`, title, subtitle: `Saturn in the ${house} from your Moon`, kind: 'narrative',
    objective: `Explain the ${key} phase of Sade Sati (Saturn in the ${house} from the Moon) for this reader: the sign involved, the house it occupies from the Ascendant, and how the roughly two and a half years tend to unfold, in three movements (first year, second year, final half year). Cite the dates of this phase in each of the reader's cycles. Constructive, never fearful.`,
    requiredEvidence: ['sadesati.signs', `sadesati.cycle.01.${key}`],
    optionalEvidence: [`sadesati.cycle.*.${key}`, 'sadesati.signs-from-lagna', 'planet.moon.d1.sign', 'planet.saturn.d1.house'],
    depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 3 }, referencePages: pages,
  };
}

export const SATURN_DEFINITION: ReportDefinitionInput = {
  id: 'saturn',
  reportType: 'SATURN',
  specVersion: '1.0.0',
  title: 'Saturn in Your Birth Chart',
  subtitle: 'Your karma, your discipline and the timing of Saturn\'s lessons, read from your own chart',
  description: 'This report reads natal Saturn by house, sign, nakshatra, aspects and lordship, its Ashtakavarga, every Sade Sati, Kantaka Shani and Dhaiya period of your life computed from Saturn\'s real ingress dates, and Saturn\'s current and next transits, with practical, purchase-free practices.',
  referenceFiles: ['docs/referencerepots/Saturn In Your Birth Chart Report.pdf'],
  requires: { birthTime: true, partner: false, vargas: ['D1'], transitYears: 3 },
  theme: { primary: '1F2A4D', accent: 'B08A4E', tint: 'F3F1EC' },
  writingGuidance: [
    'This is a Saturn report: keep every topic anchored to Saturn\'s themes (time, discipline, responsibility, karma, structure, patience, service).',
    'Astro Sushil does not believe in doshas. Sade Sati, Kantaka Shani and Dhaiya are seasons of maturity, never curses or guaranteed hardship. Never use words like doom, suffering, curse or bad luck.',
    'Transit and Sade Sati periods are supportive or demanding windows, never promised events. Name dates only as they appear in the evidence.',
    'Saturn rewards effort: make every topic practical, with steady, realistic suggestions.',
  ],
  sections: [
    {
      id: 'saturn-glance', title: 'Your Saturn at a Glance', kicker: 'Your Charts',
      intro: 'The calculated facts this report is built on: your birth chart, your Moon chart and the sky on the report date.',
      topics: [
        { id: 'saturn-summary', title: 'Your Saturn Details', kind: 'data', block: 'saturn-summary', objective: 'Birth details, Saturn placement and Sade Sati status.', referencePages: '14' },
        { id: 'natal-chart', title: 'Birth Chart (Lagna Kundali)', kind: 'data', block: 'chart-d1', objective: 'North Indian D1 chart.', referencePages: '15' },
        { id: 'moon-chart', title: 'Moon Chart (Chandra Kundali)', kind: 'data', block: 'saturn-moon-chart', objective: 'Chart counted from the Moon sign.', referencePages: '15' },
        { id: 'transit-chart', title: 'Saturn Transit Chart', subtitle: 'The planets on the report date, in your houses', kind: 'data', block: 'saturn-transit-chart', objective: 'Transit positions on the report date.', referencePages: '15' },
      ],
    },
    {
      id: 'saturn-introduction', title: 'Meeting Shani', kicker: 'Introduction',
      intro: 'Who Saturn is in the Vedic tradition, why its slow journey matters, and what the coming years hold in broad strokes.',
      topics: [
        { id: 'shani-legends', title: 'The Legends of Shani Dev', kind: 'data', block: 'saturn-legends', objective: 'Mythology and the Navagraha verse.', referencePages: '7, 10-11' },
        { id: 'saturn-lord-of-karma', title: 'Saturn, the Lord of Karma', kind: 'data', block: 'saturn-karma', objective: 'What Saturn signifies.', referencePages: '12-13' },
        {
          id: 'saturn-why-now', title: 'Your Saturn Transformation Guide', subtitle: 'Why Saturn\'s present journey matters to you', kind: 'narrative',
          objective: 'Introduce the reader to Saturn\'s present position in their chart: the current transit sign and the house it touches from the Ascendant and the Moon, whether Sade Sati is active, and what this report will help them understand. Warm and orienting, no fear.',
          requiredEvidence: ['saturn.transit.a.sign', 'saturn.transit.a.house-asc', 'sadesati.status'],
          optionalEvidence: ['saturn.transit.a.dates', 'saturn.transit.a.house-moon', 'sadesati.next', 'saturn.transit.b.sign'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, referencePages: '8-9',
        },
        collectiveTopic('saturn', { referencePages: '13', title: 'Saturn and the Collective Mood' }),
      ],
    },
    {
      id: 'saturn-in-chart', title: 'Saturn in Your Chart', kicker: 'Natal Saturn',
      topics: [
        natalHouseTopic('saturn', { title: 'Saturn\'s Placement in Your Chart', referencePages: '16' }),
        natalSignTopic('saturn', { title: 'Saturn\'s Impact and Karmic Lesson', referencePages: '17' }),
        natalNakshatraTopic('saturn', { title: 'The Nakshatra of Your Saturn', referencePages: '22' }),
        { id: 'saturn-lordship', title: 'The Houses Saturn Rules for You', kind: 'data', block: 'saturn-lordship', objective: 'Lordship and yogakaraka check.', referencePages: '19' },
        natalLordshipTopic('saturn', { title: 'Benefic or Demanding? Saturn\'s Role for You', referencePages: '19' }),
        natalConjunctionTopic('saturn', { title: 'Saturn\'s Conjunctions and Companions', referencePages: '23' }),
      ],
    },
    {
      id: 'saturn-karmic-web', title: 'The Karmic Web: Aspects of Saturn', kicker: 'Natal Saturn',
      topics: [
        { id: 'saturn-aspect-table', title: 'Where Saturn Looks', kind: 'data', block: 'saturn-natal-aspects', objective: 'Natal 3rd/7th/10th aspects.', referencePages: '18' },
        natalAspectsTopic('saturn', { title: 'Shani\'s Drishti in Your Life', referencePages: '18' }),
      ],
    },
    {
      id: 'saturn-and-moon', title: 'Saturn and Your Moon', kicker: 'The Mind\'s View',
      intro: 'Saturn\'s most personal transits are counted from the Moon, so its relationship with your Moon sign deserves its own chapter.',
      topics: [
        moonSignTopic('saturn', { title: 'Your Moon Sign and Saturn', referencePages: '20-21' }),
        moonPsycheTopic('saturn', { title: 'Moon-Sign Psyche Evolution', referencePages: '24' }),
      ],
    },
    {
      id: 'saturn-ashtakavarga', title: 'The Ashtakavarga of Saturn', kicker: 'Points of Support',
      intro: 'Ashtakavarga measures, sign by sign, how much support each planet finds in your chart. It is the classical way to judge how a transit will feel.',
      topics: [
        { id: 'saturn-bav', title: 'Saturn\'s Bhinnashtakavarga', subtitle: 'Contributions of each planet and the Ascendant', kind: 'data', block: 'saturn-bav', objective: 'Saturn BAV prastara.', referencePages: '25-26' },
        { id: 'saturn-sav', title: 'Sarvashtakavarga', subtitle: 'The combined support of every sign', kind: 'data', block: 'saturn-sav', objective: 'SAV matrix.', referencePages: '27' },
        { id: 'saturn-bindu-guide', title: 'How to Read the Bindus', kind: 'data', block: 'saturn-bindu-guide', objective: 'Classical interpretation of bindus.', referencePages: '27-29' },
        { id: 'saturn-transit-bindus', title: 'Saturn\'s Coming Transits and Their Bindus', kind: 'data', block: 'saturn-transit-bindus', objective: 'BAV/SAV per upcoming transit sign.', referencePages: '27' },
        bavReadingTopic('saturn', { referencePages: '25' }),
      ],
    },
    {
      id: 'sade-sati', title: 'Sade Sati: Your Lifetime Map', kicker: 'Phases of Sade Sati',
      intro: 'Every Sade Sati of your life, computed from Saturn\'s actual ingress dates rather than from a generic table.',
      topics: [
        { id: 'sade-sati-explained', title: 'What Sade Sati Really Is', kind: 'data', block: 'saturn-sadesati-explained', objective: 'Sade Sati explained calmly.', referencePages: '8, 12, 34' },
        { id: 'sade-sati-status', title: 'Your Sade Sati Status', kind: 'data', block: 'saturn-sadesati-status', objective: 'Status and next cycle.', referencePages: '14' },
        { id: 'saturn-timeline', title: 'Saturn and Your Moon Across a Lifetime', kind: 'data', block: 'saturn-lifetime-timeline', objective: 'Lifetime timeline graphic.', bonus: true },
        { id: 'sade-sati-cycles', title: 'Your Sade Sati Cycles', kind: 'data', block: 'saturn-sadesati-cycles', objective: 'All cycles with phase dates.', referencePages: '31-33' },
        {
          id: 'sade-sati-overview', title: 'Reading Your Sade Sati Cycles', subtitle: 'What each cycle is likely to ask of you', kind: 'narrative',
          objective: 'Interpret the reader\'s Sade Sati cycles one by one, by the ages at which they fall (childhood, early adulthood, midlife, later life), the three signs involved and the houses they occupy from the Ascendant. Say whether one is active now. Present them as chapters of maturity, never as misfortune.',
          requiredEvidence: ['sadesati.status', 'sadesati.count', 'sadesati.cycle.01.span'],
          optionalEvidence: ['sadesati.cycle.*.span', 'sadesati.signs', 'sadesati.signs-from-lagna', 'sadesati.next'],
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 4 }, referencePages: '31-34',
        },
      ],
    },
    {
      id: 'sade-sati-phases', title: 'The Three Phases of Sade Sati', kicker: 'Phases of Sade Sati',
      topics: [
        phaseTopic('rising', 'The Rising Phase', '12th', '34'),
        phaseTopic('peak', 'The Peak Phase', '1st (your Moon sign)', '35'),
        phaseTopic('setting', 'The Setting Phase', '2nd', '36'),
        {
          id: 'sade-sati-life-1', title: 'Sade Sati and Your Relationships', subtitle: 'Love, marriage and family during Saturn\'s passage', kind: 'narrative',
          objective: 'For this reader\'s Moon sign and the houses the Sade Sati signs occupy from the Ascendant, describe how love life, marriage and family life tend to be refined during Sade Sati, with practical guidance for each. Constructive and specific; no fear, no promises.',
          requiredEvidence: ['sadesati.signs', 'sadesati.signs-from-lagna', 'planet.moon.d1.sign'],
          optionalEvidence: ['house.7.d1.sign', 'house.4.d1.sign', 'house.2.d1.sign', 'planet.saturn.d1.house'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 6 }, referencePages: '37-38',
        },
        {
          id: 'sade-sati-life-2', title: 'Sade Sati, Work, Money and Well-being', subtitle: 'Career, finances, health, mind and spirit', kind: 'narrative',
          objective: 'For this reader\'s Moon sign and the houses the Sade Sati signs occupy from the Ascendant, describe how career, finances, physical well-being habits, mental health and spirituality tend to evolve during Sade Sati, with practical guidance for each. No medical or financial advice; no fear.',
          requiredEvidence: ['sadesati.signs', 'sadesati.signs-from-lagna', 'planet.moon.d1.sign'],
          optionalEvidence: ['house.10.d1.sign', 'house.11.d1.sign', 'house.6.d1.sign', 'planet.saturn.d1.house', 'planet.saturn.d1.lordship'],
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 6 }, referencePages: '38-41',
        },
      ],
    },
    {
      id: 'saturn-transit-current', title: 'Saturn Now: The Current Transit', kicker: 'Saturn\'s Transit',
      intro: 'The Saturn sign period in progress (or about to begin) on the report date, with every retrograde re-entry and station.',
      topics: [
        { id: 'saturn-a-card', title: 'The Transit at a Glance', kind: 'data', block: 'saturn-stay-a', objective: 'Dates, stations, houses, aspects, bindus.', referencePages: '42, 45' },
        stayLagnaTopic('saturn', 'a', { title: 'Predictions of Transiting Saturn', referencePages: '42-43' }),
        stayAspectsTopic('saturn', 'a', { title: 'Aspects of Transiting Saturn', referencePages: '44' }),
        stayMoonTopic('saturn', 'a', { title: 'This Transit from Your Moon', referencePages: '44' }),
        stayRetroTopic('saturn', 'a', { title: 'Retrograde Saturn in This Period', referencePages: '45-46' }),
        stayNatalTopic('saturn', 'a', { title: 'Saturn\'s Transit over Your Natal Planets', referencePages: '47' }),
        stayAvTopic('saturn', 'a', { title: 'Ashtakavarga and This Transit', bonus: true }),
      ],
    },
    {
      id: 'saturn-transit-next', title: 'The Next Saturn Transit', kicker: 'Saturn\'s Transit',
      intro: 'The Saturn sign period that follows, so that you can prepare rather than react.',
      topics: [
        { id: 'saturn-b-card', title: 'The Next Transit at a Glance', kind: 'data', block: 'saturn-stay-b', objective: 'Dates, stations, houses, aspects, bindus.', referencePages: '48, 51' },
        stayLagnaTopic('saturn', 'b', { title: 'Predictions for the Next Saturn Transit', referencePages: '48-49' }),
        stayAspectsTopic('saturn', 'b', { title: 'Aspects of the Next Transit', referencePages: '50' }),
        stayMoonTopic('saturn', 'b', { title: 'The Next Transit from Your Moon', referencePages: '50' }),
        stayRetroTopic('saturn', 'b', { title: 'Retrograde Saturn in the Next Period', referencePages: '51-52' }),
        stayNatalTopic('saturn', 'b', { title: 'The Next Transit over Your Natal Planets', referencePages: '53' }),
        stayAvTopic('saturn', 'b', { title: 'Ashtakavarga and the Next Transit', bonus: true }),
      ],
    },
    {
      id: 'saturn-long-road', title: 'The Long Road of Saturn', kicker: 'Thirty Years Ahead',
      intro: 'Every Saturn sign period for the next thirty years, and each of Saturn\'s returns to its natal sign.',
      topics: [
        { id: 'saturn-overview', title: 'Saturn\'s Sign Periods, Next 30 Years', kind: 'data', block: 'saturn-overview', objective: 'All Saturn sign periods.', bonus: true },
        { id: 'saturn-returns-table', title: 'Your Saturn Returns', kind: 'data', block: 'saturn-returns', objective: 'Saturn returns to its natal sign.', bonus: true },
        {
          id: 'saturn-returns', title: 'The Saturn Return', subtitle: 'Milestones of maturity, about every 29.5 years', kind: 'narrative', bonus: true,
          objective: 'Explain the Saturn return (transiting Saturn re-entering its natal sign) and interpret the reader\'s returns by age as milestones of responsibility and self-definition, linked to the natal Saturn house.',
          requiredEvidence: ['saturn.returns', 'planet.saturn.d1.sign'],
          optionalEvidence: ['planet.saturn.d1.house', 'saturn.transit.horizon'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 },
        },
      ],
    },
    {
      id: 'kantak-shani', title: 'Kantaka Shani and Dhaiya', kicker: 'Saturn from the Moon',
      topics: [
        { id: 'kantak-explained', title: 'Kantaka Shani and Dhaiya Explained', kind: 'data', block: 'saturn-kantak-explained', objective: 'Definitions used.', referencePages: '64-65' },
        { id: 'kantak-table', title: 'Your Kantaka and Dhaiya Periods', kind: 'data', block: 'saturn-kantak', objective: 'Lifetime 4/7/8/10-from-Moon Saturn transits.', referencePages: '64' },
        {
          id: 'kantak-from-moon', title: 'Effects in the Houses from Your Moon', subtitle: 'Saturn in the 4th, 7th, 8th and 10th from the Moon', kind: 'narrative',
          objective: 'Interpret each of the four transits (4th, 7th, 8th and 10th from the Moon) for this reader: the sign involved, the life area it touches and practical ways to work with it. Neutral and constructive.',
          requiredEvidence: ['kantak.signs', 'kantak.period.01'],
          optionalEvidence: ['kantak.period.*', 'planet.moon.d1.sign'],
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 4 }, referencePages: '66-69',
        },
        {
          id: 'kantak-from-lagna', title: 'The Same Periods from Your Ascendant', subtitle: 'Which houses of your birth chart they activate', kind: 'narrative',
          objective: 'Using the houses the four Kantaka and Dhaiya signs occupy from the Ascendant, interpret what each period activates in the birth chart: home, partnership, transformation or career areas as given by those house numbers.',
          requiredEvidence: ['kantak.signs', 'asc.d1.sign'],
          optionalEvidence: ['kantak.period.*', 'house.*.d1.sign'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, referencePages: '70-72',
        },
        {
          id: 'kantak-now', title: 'Where You Stand Now', subtitle: 'The current and next Kantaka or Dhaiya period', kind: 'narrative', bonus: true,
          objective: 'State whether a Kantaka or Dhaiya transit is in progress on the report date and when the next one begins, then give calm, practical preparation advice for it.',
          requiredEvidence: ['kantak.status', 'kantak.next'],
          optionalEvidence: ['kantak.period.*', 'saturn.transit.a.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 4 },
        },
      ],
    },
    {
      id: 'saturn-remedies', title: 'Remedies: Practices, Not Purchases', kicker: 'Remedies',
      intro: 'Classical remedies for Saturn are conduct, service and devotion. Everything here is free.',
      topics: [
        { id: 'remedy-principles', title: 'How Astro Sushil Approaches Remedies', kind: 'data', block: 'saturn-remedy-principles', objective: 'Remedy philosophy.', referencePages: '54, 58, 83' },
        { id: 'saturn-mantra', title: 'Mantra and Devotion', kind: 'data', block: 'saturn-mantra', objective: 'Saturn mantra and devotional practice.', referencePages: '62-63' },
        practicesTopic('saturn', 'remedy-discipline', 'Yoga, Meditation and Daily Discipline', 'body and breath practices, meditation, punctuality, routines, finishing what is started, honest work (reference: yoga, meditation, daily discipline)', { referencePages: '59, 61' }),
        practicesTopic('saturn', 'remedy-service', 'Charity and Seva', 'service to elders, workers and people in need, simple food or clothing given within one\'s means, caring for animals, volunteering time (reference: charity)', { referencePages: '60' }),
        practicesTopic('saturn', 'remedy-environment', 'Your Living Space and Habits', 'decluttering, repairing what is broken, keeping the home orderly and simple, mindful use of resources, rest and sleep routines (in place of the reference\'s Astro-Vastu directions, which rest on an undefined mapping)', { referencePages: '57' }),
        {
          id: 'kantak-remedies', title: 'Practices for the Kantaka and Dhaiya Years', kind: 'narrative',
          objective: 'Practical, ethical and devotional practices for each of the four Saturn-from-Moon periods (4th, 7th, 8th and 10th) for this reader, focusing on the life area each one touches. Nothing to buy; no rituals for money; calm tone.',
          requiredEvidence: ['kantak.signs'],
          optionalEvidence: ['kantak.next', 'kantak.status'],
          depth: { minParagraphs: 2, maxParagraphs: 4, bullets: 8 }, referencePages: '73-75',
        },
      ],
    },
    {
      id: 'trials-to-triumph', title: 'From Trials to Triumph', kicker: 'Rise and Transform',
      topics: [
        {
          id: 'saturn-triumph', title: 'How Saturn Builds Your Strength', subtitle: 'Turning effort into mastery', kind: 'narrative',
          objective: 'Draw the report together: show how this reader\'s natal Saturn (house, sign, houses ruled) and their Sade Sati timing describe a path from effort to mastery. Use the idea that many accomplished people built their foundations during Saturn periods, without naming any real person. End with encouragement.',
          requiredEvidence: ['planet.saturn.d1.house', 'planet.saturn.d1.sign', 'sadesati.count'],
          optionalEvidence: ['saturn.natal.lordship-type', 'sadesati.next', 'saturn.returns'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, referencePages: '76-82, 85',
        },
      ],
    },
  ],
};
