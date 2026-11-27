/**
 * Love & Relationship Report — platform definition.
 *
 * Reference: docs/referencerepots/Love Report.pdf (23 pp, third-party; used for
 * information architecture only). Analysis: docs/report-system/analysis/ref-love.md.
 * Every reference topic is mapped below (`referencePages`); `bonus: true` marks
 * topics Astro Sushil adds beyond the reference.
 */
import { ReportDefinitionInput } from '../../contracts';

const VENUS = ['planet.venus.d1.*'];
const MOON = ['planet.moon.d1.*'];

export const LOVE_DEFINITION: ReportDefinitionInput = {
  id: 'love',
  reportType: 'LOVE',
  specVersion: '1.0.0',
  title: 'Love Report',
  subtitle: 'Your heart, your bonds and your timing — read through your Vedic birth chart',
  description: 'Lagna, Moon, Venus, the 5th and 7th houses, the Darakaraka and the Navamsa, with Jupiter-based timing windows and practical relationship guidance.',
  referenceFiles: ['docs/referencerepots/Love Report.pdf'],
  requires: { birthTime: true, partner: false },
  theme: { primary: '4E1635', accent: 'B2597E', tint: 'F8EBF0' },
  writingGuidance: [
    'This is a love and relationship report: keep every topic anchored to romance, partnership, emotional needs and marriage.',
    'Speak to all relationship stages (single, dating, married) without assuming the reader\'s current status, gender of partner or orientation.',
    'Describe a future partner as tendencies and qualities, never as a fixed prediction of appearance, profession or identity.',
    'Timing language must be about supportive windows, never promised events.',
    'Mars placement is discussed as passion and assertiveness; never use the words Manglik dosha as a problem.',
  ],
  sections: [
    {
      id: 'love-map',
      title: 'The Love Map of Your Stars',
      kicker: 'Your Chart',
      intro: 'Your natal chart (Rasi, D1) and the key facts this report is built on.',
      topics: [
        { id: 'birth-summary', title: 'Your Astral Details', kind: 'data', block: 'love-astral-details', objective: 'Key chart facts used in this report.', referencePages: '7' },
        { id: 'natal-chart', title: 'Your Birth Chart (D1)', kind: 'data', block: 'chart-d1', objective: 'North Indian D1 chart.', referencePages: '7' },
      ],
    },
    {
      id: 'mirror-of-soul',
      title: 'The Mirror of Your Soul',
      kicker: 'Section 1',
      topics: [
        {
          id: 'lagna-in-love', title: 'Who You Are in Love', subtitle: 'Your Ascendant and your love personality', kind: 'narrative',
          objective: 'How the Ascendant sign and its lord shape the reader\'s love personality, how they show affection and what they look for. Include their love language.',
          requiredEvidence: ['asc.d1.sign', 'asc.d1.lord'], optionalEvidence: ['asc.d1.nakshatra', 'house.1.d1.*'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 4 }, referencePages: '8',
        },
        {
          id: 'moon-and-love', title: 'Moonlight and Love', subtitle: 'Your emotional needs in a relationship', kind: 'narrative',
          objective: 'How the Moon\'s sign, nakshatra and house describe emotional needs, what makes the reader feel secure, and how they express feelings.',
          requiredEvidence: ['planet.moon.d1.sign', 'planet.moon.d1.nakshatra'], optionalEvidence: MOON,
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, dependsOn: ['lagna-in-love'], referencePages: '9',
        },
      ],
    },
    {
      id: 'venus',
      title: 'Venus, the Celestial Cupid',
      kicker: 'Section 2',
      topics: [
        {
          id: 'venus-placement', title: 'Your Personal Guide to Love', subtitle: 'Venus by sign, house and nakshatra', kind: 'narrative',
          objective: 'Explain Venus as the significator of love, then interpret the reader\'s Venus sign, house, nakshatra and dignity for romance, attraction and pleasure.',
          requiredEvidence: ['planet.venus.d1.sign', 'planet.venus.d1.house'], optionalEvidence: VENUS,
          depth: { minParagraphs: 3, maxParagraphs: 5, bullets: 4 }, referencePages: '10',
        },
        {
          id: 'venus-with-planets', title: 'The Language of Venus with Other Planets', subtitle: 'Conjunctions and aspects on Venus', kind: 'narrative',
          objective: 'Interpret the planets that share a house with Venus or aspect it, and what this blend means for relationships. If Venus is alone and unaspected, explain what a pure, unmixed Venus means.',
          requiredEvidence: ['planet.venus.d1.conjunctions', 'planet.venus.d1.aspected-by'], optionalEvidence: ['planet.venus.d1.house', 'planet.venus.d1.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 }, dependsOn: ['venus-placement'], referencePages: '11',
        },
      ],
    },
    {
      id: 'love-compass',
      title: 'The Love Compass',
      kicker: 'Section 3',
      topics: [
        {
          id: 'fifth-house', title: 'Heartstrings of the Cosmos', subtitle: 'The 5th house of romance and attraction', kind: 'narrative',
          objective: 'Interpret the 5th house sign, its lord\'s placement and any occupants for romance style, courtship, flirtation and creative self-expression in love.',
          requiredEvidence: ['house.5.d1.sign', 'house.5.d1.lord', 'house.5.d1.lord-house'], optionalEvidence: ['house.5.d1.occupants', 'sav.house.5'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, referencePages: '12',
        },
      ],
    },
    {
      id: 'marriage',
      title: 'Marriage: The House of Eternal Bonds',
      kicker: 'Section 4',
      topics: [
        {
          id: 'seventh-house', title: 'The Stars of Togetherness', subtitle: 'Your 7th house of partnership', kind: 'narrative',
          objective: 'Interpret the 7th house sign, lord placement, occupants and the Sarvashtakavarga strength of the 7th for the tone of committed partnership and marriage.',
          requiredEvidence: ['house.7.d1.sign', 'house.7.d1.lord', 'house.7.d1.lord-house'], optionalEvidence: ['house.7.d1.occupants', 'sav.house.7'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 3 }, referencePages: '13',
        },
      ],
    },
    {
      id: 'partner',
      title: 'Your Perfect Partner Awaits',
      kicker: 'Section 5',
      topics: [
        {
          id: 'spouse-portrait', title: 'A Portrait of Your Partner', subtitle: 'Qualities indicated by the 7th house', kind: 'narrative',
          objective: 'Describe the qualities and temperament of a well-matched partner suggested by the 7th house sign and the 7th lord\'s placement, as tendencies not fixed predictions.',
          requiredEvidence: ['house.7.d1.sign', 'house.7.d1.lord-house'], optionalEvidence: ['house.7.d1.lord', 'house.7.d1.occupants'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 4 }, dependsOn: ['seventh-house'], referencePages: '14',
        },
        {
          id: 'darakaraka', title: 'Destiny\'s Matchmaker: Your Darakaraka', subtitle: 'The Jaimini significator of the spouse', kind: 'narrative',
          objective: 'Explain the Darakaraka (planet with the lowest degree among the seven) and interpret the reader\'s Darakaraka planet and its house and sign for partnership.',
          requiredEvidence: ['karaka.dk'], optionalEvidence: ['planet.*'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 5 }, referencePages: '14-15',
        },
        { id: 'navamsa-chart', title: 'Your Navamsa Chart (D9)', kind: 'data', block: 'chart-d9', objective: 'North Indian D9 chart.', bonus: true },
        {
          id: 'navamsa-love', title: 'The Navamsa Lens', subtitle: 'Your D9 chart of marriage and inner partnership', kind: 'narrative', bonus: true,
          objective: 'Explain why the Navamsa (D9) matters for marriage, then interpret the D9 ascendant and Venus\'s and the Moon\'s D9 signs for the deeper texture of long-term partnership.',
          requiredEvidence: ['asc.d9.sign', 'planet.venus.d9.sign'], optionalEvidence: ['planet.moon.d9.sign', 'planet.jupiter.d9.sign', 'planet.venus.d9.house'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 0 },
        },
        {
          id: 'mars-passion', title: 'Mars and the Fire of Passion', subtitle: 'Desire, assertiveness and healthy conflict', kind: 'narrative', bonus: true,
          objective: 'Interpret Mars by sign and house for passion, physical chemistry, assertiveness and how the reader handles disagreements, with constructive guidance. No dosha framing.',
          requiredEvidence: ['planet.mars.d1.sign', 'planet.mars.d1.house'], optionalEvidence: ['planet.mars.d1.*'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 },
        },
      ],
    },
    {
      id: 'numerology-of-love',
      title: 'Numerology of Love',
      kicker: 'Section 6',
      topics: [
        {
          id: 'love-numbers', title: 'Love and Numbers', subtitle: 'Your Mulank and Bhagyank in relationships', kind: 'narrative',
          objective: 'Interpret the Mulank (driver) and Bhagyank (destiny) numbers for how the reader loves, what they need from a partner and what they bring to one.',
          requiredEvidence: ['numerology.mulank', 'numerology.bhagyank'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 }, referencePages: '16',
        },
      ],
    },
    {
      id: 'favour-and-caution',
      title: 'Stars of Favour, Signs of Caution',
      kicker: 'Sections 7 & 8',
      intro: 'Traditional numerological associations for your Mulank. These are cultural correspondences, offered as gentle symbols rather than rules.',
      topics: [
        { id: 'cosmic-allies', title: 'Your Cosmic Allies', kind: 'data', block: 'love-allies', objective: 'Mulank-keyed favourable associations.', referencePages: '17' },
        { id: 'gentle-cautions', title: 'Gentle Cautions', kind: 'data', block: 'love-cautions', objective: 'Mulank-keyed less-supportive associations, framed without fear.', referencePages: '18' },
      ],
    },
    {
      id: 'everlasting-love',
      title: 'The Path to Everlasting Love',
      kicker: 'Section 9',
      topics: [
        {
          id: 'current-period', title: 'Your Current Relationship Season', subtitle: 'The running Vimshottari period', kind: 'narrative', bonus: true,
          objective: 'Interpret the current Mahadasha and Antardasha lords specifically for love and partnership in this phase of life, linking each lord to the houses it rules.',
          requiredEvidence: ['dasha.current.md', 'dasha.current.ad'], optionalEvidence: ['planet.*.d1.lordship', 'planet.*.d1.house'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 3 },
        },
        {
          id: 'marriage-windows', title: 'Happily Ever After: Supportive Windows', kind: 'data', block: 'love-jupiter-windows',
          objective: 'Jupiter transit periods over the 7th house, the 7th lord\'s sign and the Darakaraka\'s sign.', referencePages: '20',
        },
        {
          id: 'care-tips', title: 'Heart-Care Practices', subtitle: 'Gentle, practical ways to nurture love', kind: 'narrative',
          objective: 'Practical, ethical relationship practices tailored to the Venus, Moon and 7th-lord placements: communication habits, self-care, devotional or mindful practices. No purchases, no fear.',
          requiredEvidence: ['planet.venus.d1.sign', 'house.7.d1.lord'], optionalEvidence: ['planet.moon.d1.sign', 'planet.venus.d1.house', 'house.7.d1.lord-house'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 6 }, dependsOn: ['venus-placement', 'seventh-house'], referencePages: '19',
        },
      ],
    },
  ],
};
