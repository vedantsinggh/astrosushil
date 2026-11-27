/**
 * Career Report — platform definition.
 *
 * Reference: docs/referencerepots/Career Report.pdf (138 pp, third-party; used
 * for information architecture only — no prose, tables or branding copied).
 * Analysis: docs/report-system/analysis/ref-career.md. Method decisions:
 * docs/report-system/decisions/career.md (CAR-xxx).
 * Every reference topic is mapped with `referencePages`; `bonus: true` marks
 * topics Astro Sushil adds beyond the reference.
 */
import { ReportDefinitionInput, ReportTopicInput } from '../../contracts';

type Depth = NonNullable<ReportTopicInput['depth']>;
const D_STD: Depth = { minParagraphs: 3, maxParagraphs: 4, bullets: 4 };
const D_SHORT: Depth = { minParagraphs: 2, maxParagraphs: 3, bullets: 3 };
const D_LONG: Depth = { minParagraphs: 3, maxParagraphs: 5, bullets: 5 };

/*
 * 2026-11 interpretation-engine changes (docs/report-system/decisions/interpretation.md):
 *  - Redundancy (audit F11/F20): each career house is ONE topic covering its sign, lord, occupants
 *    and aspects; the separate "Planets in" and "Influences on" topics are retired. Also retired:
 *    advancement-d1 (restated the four house-lord placements; the career-lords-table keeps the
 *    facts) and government-houses (restated the 6th/10th; folded into sun-saturn-government).
 *  - Opt-in: topics with `interpretations` narrate the deterministic interp.career.* conclusions.
 *  - Life-stage variants (product defaults, NOT astrology): EARLY_CAREER_MAX_AGE and
 *    RETIREMENT_REFRAME_MAX_AGE below.
 *  - first-earnings receives only the Mahadashas in the earning-years window (EARNINGS_WINDOW in
 *    calc/career-calc.ts) with the native's age.
 */

/** Product default: seniority framing (board-level, executive, mentoring juniors) is withheld up to this age (shared with the validator). */
import { EARLY_CAREER_MAX_AGE } from '../../life-stage';
export { EARLY_CAREER_MAX_AGE };
/** Product default: the retirement topic is reframed as long-term stability up to this age. */
export const RETIREMENT_REFRAME_MAX_AGE = 39;

const EARLY_CAREER_NOTE = 'The reader is early in their working life (see the life-stage evidence): frame authority, leadership and recognition as abilities that develop over time; do not refer to board-level, executive or senior positions, mentoring juniors, retirement or a past track record.';
const EARLY_CAREER_VARIANT = { id: 'early-career', when: { maxAge: EARLY_CAREER_MAX_AGE }, objectiveAppend: EARLY_CAREER_NOTE };
const LIFE_STAGE_EVIDENCE = ['native.age', 'native.life-stage'];

/** Adds the life-stage evidence and the early-career variant to a topic. */
function lifeStageAware(t: ReportTopicInput): ReportTopicInput {
  return {
    ...t,
    optionalEvidence: [...(t.optionalEvidence ?? []), ...LIFE_STAGE_EVIDENCE],
    variants: [...(t.variants ?? []), EARLY_CAREER_VARIANT],
  };
}

const HOUSE_NOTE = 'Cover, in this order: the sign, the lord\'s house, sign and dignity (and its dispositor where listed), the planets placed in the house, and the planets aspecting it (name each aspect). If the house is unoccupied or unaspected, say so in one sentence and read the house through its sign and lord; never present an empty or unaspected house as protected, free from friction or an advantage. When the Sarvashtakavarga score is cited, use the SAV definition in the evidence (natal bindu totals per sign); never describe bindus as support from transiting planets.';

/** One topic per career house: sign, lord placement, occupants and aspects (merged; audit F11/F20). */
function houseTopic(h: number, id: string, title: string, subtitle: string, objective: string, referencePages: string): ReportTopicInput {
  return {
    id, title, subtitle, kind: 'narrative', objective: `${objective} ${HOUSE_NOTE}`, referencePages, depth: D_STD,
    requiredEvidence: [`house.${h}.d1.sign`, `house.${h}.d1.lord`, `house.${h}.d1.lord-house`],
    optionalEvidence: [`sav.house.${h}`, `career.sav.house.${h}.benchmark`, 'planet.*.d1.lordship', 'planet.*.d1.sign', 'planet.*.d1.dignity',
      `house.${h}.d1.occupants`, `career.house.${h}.aspected-by`, 'planet.*.d1.house', 'planet.*.d1.retrograde', 'planet.*.d1.combust',
      'planet.*.d1.dispositor', 'fact.definition.sav'],
    interpretations: [`interp.career.house-${h}.*`],
  };
}

/**
 * The D1 facts `planet.<p>.d1.*` resolved to before the interpretation facts were added. Legacy
 * (non-opted) topics list them explicitly so their evidence and cache keys stay byte-identical now
 * that `planet.<p>.d1.aspects-cast|combust-distance|avastha|paksha` also exist.
 */
function legacyD1(p: string): string[] {
  const suffixes = ['sign', 'house', 'degree', 'nakshatra', 'dignity', 'retrograde', 'combust', 'lordship', 'aspected-by', 'conjunctions'];
  return suffixes.filter((x) => !(x === 'combust' && p === 'sun')).map((x) => `planet.${p}.d1.${x}`);
}

/** Same idea for `house.<n>.d1.*` (now also matching `house.<n>.d1.aspected-by`). */
function legacyHouse(n: number): string[] {
  return ['sign', 'lord', 'lord-house', 'occupants'].map((x) => `house.${n}.d1.${x}`);
}

const D10_DIGNITY = ['planet.*.d10.dignity'];
const D10_NOTE = 'Whenever a planet\'s D10 placement is discussed, state its D10 dignity from the evidence (exalted, debilitated, own sign); D10 dignity is sign dignity only and must not be equated with the birth-chart dignity. Do not describe a planet as "neither exalted nor debilitated".';

export const CAREER_DEFINITION: ReportDefinitionInput = {
  id: 'career',
  reportType: 'CAREER',
  // CAREER_PROSITY (catalogue 'report-career-pro') is fulfilled by this same genuine career report.
  additionalReportTypes: ['CAREER_PROSITY'],
  // 1.1.0: interpretation-engine opt-in (interp.* results, merged/retired topics, new evidence and
  // validators). Bumped once after the last migration wave (proposal §6) so every career topic gets a
  // fresh cache key; the other report definitions stay at 1.0.0.
  specVersion: '1.1.0',
  title: 'Career Report',
  subtitle: 'Your work, your calling and your timing, read through the birth chart and the Dashamsha',
  description: 'A deep reading of your professional life: the Lagna and the career houses (1st, 2nd, 6th, 7th, 10th, 11th) with their lords, occupants and aspects; the Dashamsha (D10) career chart; Atmakaraka and Amatyakaraka; career yogas detected in your chart; Saturn as the karma karaka in the Bhrigu Nandi Nadi tradition; the Ashtakavarga comparison of employment and enterprise; your dasha timeline; the current and coming transits of Saturn, Jupiter, Rahu and Ketu; and practical, ethical remedies with nothing to buy.',
  referenceFiles: ['docs/referencerepots/Career Report.pdf'],
  requires: { birthTime: true, partner: false, vargas: ['D1', 'D9', 'D10'], transitYears: 10 },
  theme: { primary: '133C4B', accent: 'B5852E', tint: 'EAF4F2' },
  writingGuidance: [
    'This is a career report: anchor every topic to work, vocation, skills, workplace behaviour, money earned through work, and professional timing.',
    'Do not assume the reader\'s current job, industry, seniority, education or employment status; speak to students, employees, business owners and career changers alike.',
    'Suggest fields and roles as natural inclinations and examples, never as the only path, and never as a guaranteed outcome.',
    'Timing language must describe supportive or demanding seasons, never promised promotions, job losses or dates of events.',
    'When you count houses from a point other than the Ascendant (from Saturn, the Moon, the 10th house or in the D10), write "the 5th from Saturn" or "D10 house 7"; never write "in the Nth house from ..." for such counts.',
    'Saturn, Rahu, Ketu and the 6th, 8th and 12th houses are discussed as themes of discipline, effort and change, never as afflictions or bad luck.',
    'Remedies are practical habits, ethical conduct, service and optional devotional practice. Never recommend buying gemstones, rudraksha, yantras, rituals or any product.',
  ],
  sections: [
    // ---------------------------------------------------------------------
    {
      id: 'career-charts',
      title: 'Your Career Charts',
      kicker: 'Your Chart',
      intro: 'The calculated facts this report is built on: your birth chart (D1) and your Dashamsha (D10), the divisional chart of profession.',
      topics: [
        { id: 'career-details', title: 'Your Career Profile at a Glance', kind: 'data', block: 'career-astral-details', objective: 'Key chart facts used throughout the report.', referencePages: '12' },
        { id: 'natal-chart', title: 'Your Birth Chart (D1, Rasi)', kind: 'data', block: 'chart-d1', objective: 'North Indian D1 chart.', referencePages: '12' },
        { id: 'd10-chart', title: 'Your Career Chart (D10, Dashamsha)', kind: 'data', block: 'chart-d10', objective: 'North Indian D10 chart.', referencePages: '12' },
        {
          id: 'career-intro', title: 'Karma, Calling and Choice', subtitle: 'How a birth chart describes a working life', kind: 'narrative',
          objective: 'Open the report: explain in plain language how Vedic astrology reads career (the 10th house of action, the 6th of service, the 11th of gains, the D10 chart, dashas for timing) and how the reader should use this report, briefly previewing the Ascendant and the 10th house sign as the two anchors of their professional story. Stress effort and free will.',
          requiredEvidence: ['asc.d1.sign', 'house.10.d1.sign'], optionalEvidence: ['asc.d10.sign', 'house.10.d1.lord'],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 0 }, referencePages: '10-11',
        },
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'lagna',
      title: 'The Self at Work: Your Lagna',
      kicker: 'Section 1',
      intro: 'The Ascendant is the lens of the whole chart. Before any career house, it shows the temperament, energy and reputation you bring to work.',
      topics: [
        { id: 'career-houses-table', title: 'Your Career Houses at a Glance', kind: 'data', block: 'career-houses', objective: 'Sign, lord, occupants, aspects and SAV of houses 1, 2, 6, 7, 10 and 11.', referencePages: '13-37' },
        {
          id: 'lagna-career', title: 'The Guiding Star of Your Career', subtitle: 'Your Ascendant sign and the placement of its lord', kind: 'narrative',
          objective: `Interpret the Ascendant sign and the house and sign of the Ascendant lord for work style: drive, how the reader approaches responsibility, what kind of environment energises them and where their professional energy naturally flows; then the planets in the 1st house (professional persona) and the planets aspecting it. ${HOUSE_NOTE}`,
          requiredEvidence: ['asc.d1.sign', 'asc.d1.lord', 'house.1.d1.lord-house'],
          optionalEvidence: ['asc.d1.nakshatra', 'house.1.d1.*', 'planet.*.d1.dignity', 'career.house.1.aspected-by', 'planet.*.d1.house', 'planet.*.d1.sign', 'planet.*.d1.lordship',
            'planet.*.d1.retrograde', 'planet.*.d1.combust', 'sav.house.1', 'career.sav.house.1.benchmark', 'planet.*.d1.dispositor', 'fact.asc.vargottama', 'fact.definition.sav'],
          interpretations: ['interp.career.house-1.*'],
          depth: D_LONG, referencePages: '13-16',
        },
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'tenth-sixth',
      title: 'Profession and Service: the 10th and 6th Houses',
      kicker: 'Section 2',
      intro: 'The 10th house is your field of action and public standing; the 6th is daily work, service, competition and employment.',
      topics: [
        lifeStageAware(houseTopic(10, 'tenth-house', 'The 10th House: Your Field of Action', 'Sign, lord, planets and aspects of the 10th house',
          'Explain the 10th house as the house of profession and status, then interpret its sign and the house and sign of the 10th lord for the kind of work, recognition and responsibility that suits the reader, and how career connects to the area of life where the 10th lord sits. Planets in the 10th: profession, visibility and authority; aspects on the 10th: career direction (e.g. Saturn\'s 3rd aspect).', '17-19')),
        houseTopic(6, 'sixth-house', 'The 6th House: Service and Competition', 'Sign, lord, planets and aspects of the 6th house',
          'Explain the 6th house as daily work, employment, service, competition and problem-solving, then interpret its sign and the 6th lord\'s house and sign for how the reader handles workload, colleagues, competition and routine, and what its occupants and aspects add to work habits and workplace challenges.', '20-24'),
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'seventh-eleventh',
      title: 'Partnership and Gains: the 7th and 11th Houses',
      kicker: 'Section 3',
      intro: 'The 7th house governs partners, clients and trade; the 11th governs income, networks and the fulfilment of goals.',
      topics: [
        houseTopic(7, 'seventh-house', 'The 7th House: Business and Partnership', 'Sign, lord, planets and aspects of the 7th house',
          'Interpret the 7th house sign and the 7th lord\'s placement for business partnerships, client relationships, trade and public dealings (not marriage), and what its occupants and aspects add to negotiation and partnership style at work.', '25-29'),
        houseTopic(11, 'eleventh-house', 'The 11th House: Income and Networks', 'Sign, lord, planets and aspects of the 11th house',
          'Interpret the 11th house sign and the 11th lord\'s placement for income through work, networks, seniors, ambitions and the pathways through which gains arrive, and what its occupants and aspects add to gains and the fulfilment of professional goals.', '30-32'),
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'second-house',
      title: 'The 2nd House: Resources and Earned Wealth',
      kicker: 'Section 4',
      intro: 'The 2nd house holds what you accumulate from work: savings, skills of speech and the resources that sustain a career.',
      topics: [
        houseTopic(2, 'second-house-lord', 'Unlocking Your Resources', 'Sign, lord, planets and aspects of the 2nd house',
          'Interpret the 2nd house sign and the 2nd lord\'s placement for earning style, savings habits, voice and the skills that turn work into lasting resources, and what its occupants and aspects add to earnings and wealth built through work.', '34-37'),
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'signatures',
      title: 'Signatures of Success',
      kicker: 'Section 5',
      intro: 'Yogas, the birth dasha, the Sun and Saturn, and the Jaimini karakas: the special signatures classical astrology reads for career.',
      topics: [
        { id: 'career-yoga-table', title: 'Career Yogas in Your Chart', kind: 'data', block: 'career-yogas', objective: 'Engine-detected yogas relevant to career.', referencePages: '39-42' },
        {
          id: 'career-yogas', title: 'What Your Yogas Mean for Work', subtitle: 'Planetary combinations detected in your chart', kind: 'narrative',
          objective: 'For each career-relevant yoga listed in the evidence, explain in plain language what the combination is, how it is formed in this chart (the relation or ownership stated in the evidence, e.g. a Yogakaraka owning a kendra and a trikona, not a planet "with itself") and how it can show up in professional life. A yoga indicates a potential that effort and the dashas of its planets activate: state the qualifying conditions given (placement house, dignity, combustion) and never say a yoga ensures, grants or endows a result. Mention only the yogas in the evidence; every yoga named must be one listed in the yoga table. If none are listed, explain that career strength is then read from houses, lords and periods.',
          requiredEvidence: ['career.yogas.relevant'], optionalEvidence: ['yoga.*', 'planet.*.d1.house', 'planet.*.d1.dignity', 'planet.*.d1.combust', 'planet.*.d1.retrograde'],
          interpretations: ['interp.career.yoga.*'],
          depth: D_LONG, referencePages: '39-42',
        },
        {
          id: 'birth-dasha', title: 'The Dasha Gateway', subtitle: 'The planetary period you were born into', kind: 'narrative',
          objective: 'Interpret the birth Mahadasha lord, its houses ruled and placement, as an early imprint on the reader\'s relationship with work, ambition and learning.',
          requiredEvidence: ['dasha.birth-lord'], optionalEvidence: ['planet.*.d1.lordship', 'planet.*.d1.house', 'dasha.md.01'],
          depth: D_SHORT, referencePages: '44',
        },
        { id: 'sun-saturn-table', title: 'The Sun and Saturn in Your Chart', kind: 'data', block: 'career-sun-saturn', objective: 'Sun and Saturn counted from Lagna, Moon and the 10th.', referencePages: '45-46' },
        {
          id: 'sun-career', title: 'The Sun\'s Path', subtitle: 'Authority, recognition and leadership', kind: 'narrative',
          objective: 'Interpret the Sun (significator of authority and recognition) by sign, house and dignity, and by its position counted from the Moon and from the 10th house, for leadership, relations with superiors and public recognition.',
          requiredEvidence: ['planet.sun.d1.sign', 'planet.sun.d1.house'], optionalEvidence: [...legacyD1('sun'), 'career.sun.*'],
          depth: D_STD, referencePages: '45',
        },
        {
          id: 'saturn-career', title: 'Saturn\'s March', subtitle: 'Discipline, endurance and long-term building', kind: 'narrative',
          objective: 'Interpret Saturn (significator of work, service and perseverance) by sign, house, dignity and its position counted from the Moon and from the 10th house, for work ethic, patience, responsibility and how success builds over time.',
          requiredEvidence: ['planet.saturn.d1.sign', 'planet.saturn.d1.house'], optionalEvidence: [...legacyD1('saturn'), 'career.saturn.*'],
          depth: D_STD, referencePages: '46',
        },
        { id: 'karaka-table', title: 'Your Jaimini Chara Karakas', kind: 'data', block: 'career-karakas', objective: 'Seven chara karakas by degree.', referencePages: '47, 131', bonus: false },
        {
          id: 'atmakaraka-career', title: 'Your Atmakaraka: the Soul\'s Direction', subtitle: 'The planet with the highest degree', kind: 'narrative',
          objective: 'Explain the Atmakaraka and interpret the reader\'s Atmakaraka planet, its sign and house, for the deeper purpose that makes work feel meaningful, with career suggestions as examples.',
          requiredEvidence: ['karaka.ak'], optionalEvidence: ['planet.*.d1.sign', 'planet.*.d1.house', 'planet.*.d1.degree'],
          depth: D_STD, referencePages: '131',
        },
        {
          id: 'amatyakaraka-career', title: 'Your Amatyakaraka: the Minister of Career', subtitle: 'The planet with the second-highest degree', kind: 'narrative',
          objective: 'Explain the Amatyakaraka as the Jaimini significator of career and counsel, and interpret the reader\'s Amatyakaraka planet, its sign and house, for professional strengths, the advisers or roles that suit them, and suitable fields as examples.',
          requiredEvidence: ['karaka.amk'], optionalEvidence: ['planet.*.d1.sign', 'planet.*.d1.house', 'planet.*.d1.degree'],
          depth: D_STD, dependsOn: ['atmakaraka-career'], referencePages: '47, 131',
        },
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'd10-map',
      title: 'The D10 Map: Your Dashamsha',
      kicker: 'Section 6',
      intro: 'The Dashamsha divides each sign into ten parts and magnifies the 10th-house story: it is the classical chart of profession, status and achievement.',
      topics: [
        { id: 'd10-houses-table', title: 'Your Dashamsha House by House', kind: 'data', block: 'career-d10-houses', objective: 'D10 signs, lords, placements and occupants.', referencePages: '49-58' },
        {
          id: 'd10-lagna', title: 'The Persona You Bring to Work', subtitle: 'Your D10 ascendant', kind: 'narrative',
          objective: `Explain the D10 chart, then interpret the D10 ascendant sign, its element and modality, its lord\'s D10 placement and dignity and any D10 1st-house occupants, for the reader\'s professional persona and approach. ${D10_NOTE}`,
          requiredEvidence: ['asc.d10.sign', 'career.d10.house.1.lord', 'career.d10.house.1.lord-house'], optionalEvidence: ['career.d10.house.1.*', 'career.d10.asc.quality', ...D10_DIGNITY],
          interpretations: ['interp.career.d10.*'],
          depth: D_STD, referencePages: '50-51',
        },
        {
          id: 'd10-tenth-lord', title: 'The Cornerstone of Success', subtitle: 'The D10 10th house and its lord', kind: 'narrative',
          objective: `Interpret the D10 10th house sign, its lord\'s D10 placement and dignity, and any D10 10th-house occupants, for achievement, authority and the kind of work that brings standing. ${D10_NOTE}`,
          requiredEvidence: ['career.d10.house.10.sign', 'career.d10.house.10.lord', 'career.d10.house.10.lord-house'], optionalEvidence: ['career.d10.house.10.occupants', ...D10_DIGNITY, ...LIFE_STAGE_EVIDENCE],
          interpretations: ['interp.career.d10.*'], variants: [EARLY_CAREER_VARIANT],
          depth: D_STD, dependsOn: ['d10-lagna'], referencePages: '52-54',
        },
        {
          id: 'd10-sixth-lord', title: 'Triumph over Workplace Challenges', subtitle: 'The D10 6th house and its lord', kind: 'narrative',
          objective: `Interpret the D10 6th house sign, its lord\'s D10 placement and dignity and any occupants, for routine, service, competition and handling pressure at work. ${D10_NOTE}`,
          requiredEvidence: ['career.d10.house.6.sign', 'career.d10.house.6.lord', 'career.d10.house.6.lord-house'], optionalEvidence: ['career.d10.house.6.occupants', ...D10_DIGNITY],
          interpretations: ['interp.career.d10.*'],
          depth: D_SHORT, dependsOn: ['d10-lagna'], referencePages: '55-56',
        },
        {
          id: 'd10-seventh-lord', title: 'Collaborations that Thrive', subtitle: 'The D10 7th house and its lord', kind: 'narrative',
          objective: `Interpret the D10 7th house sign, its lord\'s D10 placement and dignity and any occupants, for professional partnerships, clients and dealings with the public. ${D10_NOTE}`,
          requiredEvidence: ['career.d10.house.7.sign', 'career.d10.house.7.lord', 'career.d10.house.7.lord-house'], optionalEvidence: ['career.d10.house.7.occupants', ...D10_DIGNITY],
          interpretations: ['interp.career.d10.*'],
          depth: D_SHORT, dependsOn: ['d10-lagna'], referencePages: '57-58',
        },
        {
          id: 'd10-sun', title: 'The Sun in Your Dashamsha', subtitle: 'Authority and recognition in the career chart', kind: 'narrative',
          objective: `Interpret the Sun\'s D10 sign, D10 house and dignity: how it shapes authority, leadership, relations with superiors and recognition; include its strengths, its growth areas and suitable fields. Mention Rahu\'s D10 house only as an additional factor if provided. If the birth-chart dignity of the Sun differs, say that the two charts describe different layers. ${D10_NOTE}`,
          requiredEvidence: ['planet.sun.d10.sign', 'planet.sun.d10.house'], optionalEvidence: ['planet.sun.d10.dignity', 'planet.sun.d1.dignity', 'planet.rahu.d10.house', 'planet.rahu.d10.sign', ...LIFE_STAGE_EVIDENCE],
          interpretations: ['interp.career.d10.*'], variants: [EARLY_CAREER_VARIANT],
          depth: D_STD, referencePages: '59-60',
        },
        {
          id: 'd10-saturn', title: 'Saturn in Your Dashamsha', subtitle: 'Work ethic and endurance in the career chart', kind: 'narrative',
          objective: `Interpret Saturn\'s D10 sign, D10 house and dignity: how it shapes discipline, service, long projects and the pace of advancement; include strengths, growth areas and suitable fields, and how the D10 Sun and Saturn work together. ${D10_NOTE}`,
          requiredEvidence: ['planet.saturn.d10.sign', 'planet.saturn.d10.house'], optionalEvidence: ['planet.saturn.d10.dignity', 'planet.sun.d10.house', 'planet.sun.d10.dignity'],
          interpretations: ['interp.career.d10.*'],
          depth: D_STD, dependsOn: ['d10-sun'], referencePages: '61-62',
        },
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'bnn',
      title: 'Bhrigu Nandi Nadi: Saturn, the Karma Karaka',
      kicker: 'Section 7',
      intro: 'In the Bhrigu Nandi Nadi tradition, Saturn is the karaka of karma and profession. Its sign and the planets linked to it by sign describe the texture of your working life.',
      topics: [
        { id: 'bnn-table', title: 'Saturn and Its Nadi Links', kind: 'data', block: 'career-bnn', objective: 'Planets in Saturn\'s sign, its trines and its 2nd/12th signs.', referencePages: '63-66' },
        {
          id: 'bnn-saturn', title: 'Shani as Your Career Compass', subtitle: 'Saturn\'s sign and aspects in the Nadi view', kind: 'narrative',
          objective: 'Explain why Bhrigu Nandi Nadi treats Saturn as the karma karaka, then interpret Saturn\'s sign (and retrograde state if so) and the signs it aspects for the reader\'s career mindset and work environment.',
          requiredEvidence: ['career.bnn.saturn.sign', 'career.bnn.aspects'], optionalEvidence: ['planet.saturn.d1.retrograde', 'planet.saturn.d1.dignity'],
          depth: D_STD, referencePages: '63-65',
        },
        {
          id: 'bnn-links', title: 'Planets Linked to Saturn', subtitle: 'Conjunction, trines and the signs ahead and behind', kind: 'narrative',
          objective: 'Interpret each planet linked to Saturn by sign: in its sign, its 5th and 9th signs (trines), and the 2nd (ahead, what the career moves towards) and 12th (behind, what supports it). Explain each planet\'s natural signification combined with Saturn\'s karma (e.g. Saturn with Mercury: trade, writing, analysis). If a position is empty, say so briefly.',
          requiredEvidence: ['career.bnn.trine', 'career.bnn.second', 'career.bnn.twelfth'], optionalEvidence: ['career.bnn.conjunct', 'career.bnn.saturn.sign'],
          depth: D_LONG, dependsOn: ['bnn-saturn'], referencePages: '65-66',
        },
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'voyage',
      title: 'The Voyage of Your Career',
      kicker: 'Section 8',
      intro: 'From learning and first earnings to the lords that drive advancement, in both the birth chart and the career chart.',
      topics: [
        {
          id: 'early-education', title: 'Setting Sail: Learning and Beginnings', subtitle: 'The 4th house of education and the 5th of intellect', kind: 'narrative',
          objective: 'Interpret the 4th house (formal learning) and the 5th house (intellect, creativity) by sign and lord placement for how the reader learns and which studies or skills support their working life.',
          requiredEvidence: ['house.4.d1.sign', 'house.5.d1.sign', 'house.5.d1.lord-house'], optionalEvidence: [...legacyHouse(4), ...legacyHouse(5)],
          depth: D_STD, referencePages: '68-69',
        },
        {
          id: 'first-earnings', title: 'Climbing the Mast: First Earnings', subtitle: 'The 2nd and 11th lords and their periods', kind: 'narrative',
          objective: 'Interpret the 2nd lord (accumulation) and 11th lord (income) by placement. Then, only from the Mahadashas listed in the earning-years window evidence and the Antardashas of the current Mahadasha, name the periods ruled by the 2nd or 11th lord as seasons when earnings tend to be emphasised (never promised), with the reader\'s age at their start. If none of those lords\' periods falls in the window, say so plainly. Never name a period outside the window evidence.',
          requiredEvidence: ['house.2.d1.lord', 'house.11.d1.lord', 'house.11.d1.lord-house'],
          optionalEvidence: ['house.2.d1.lord-house', 'career.window.earnings.md.*', 'career.dasha.ad.*', ...LIFE_STAGE_EVIDENCE],
          interpretations: ['interp.career.house-2.*', 'interp.career.house-11.*', 'interp.career.period.earnings-window*', 'interp.career.financial-growth'], variants: [EARLY_CAREER_VARIANT],
          depth: D_STD, referencePages: '70-71',
        },
        {
          id: 'jupiter-guidance', title: 'Jupiter\'s Guidance', subtitle: 'The kind of work that brings growth', kind: 'narrative',
          objective: `Interpret Jupiter (wisdom, growth, mentors) by sign, house and dignity for the kind of work and roles that bring the reader growth, guidance and expansion, then its D10 placement with its D10 dignity. ${D10_NOTE}`,
          requiredEvidence: ['planet.jupiter.d1.sign', 'planet.jupiter.d1.house'], optionalEvidence: ['planet.jupiter.d1.*', 'planet.jupiter.d10.*', 'planet.jupiter.d10.dignity', 'planet.jupiter.d1.dispositor', ...LIFE_STAGE_EVIDENCE],
          interpretations: ['interp.career.d10.*'], variants: [EARLY_CAREER_VARIANT],
          depth: D_SHORT, referencePages: '72',
        },
        { id: 'career-lords-table', title: 'The Lords of Advancement', kind: 'data', block: 'career-lords', objective: 'Lords of 1, 6, 10, 11 in D1 and D10.', referencePages: '72-73' },
        {
          id: 'advancement-d10', title: 'Career Advancement in the Dashamsha', subtitle: 'D10 lords of the 1st, 6th, 10th and 11th', kind: 'narrative',
          objective: `Interpret the D10 placements and D10 dignity of the lords of D10 houses 1, 6, 10 and 11 as the professional-chart view of advancement. The birth-chart lords are covered in the house sections and the table above: refer to them in one sentence at most. ${D10_NOTE}`,
          requiredEvidence: ['career.d10.house.1.lord-house', 'career.d10.house.6.lord-house', 'career.d10.house.10.lord-house', 'career.d10.house.11.lord-house'], optionalEvidence: ['career.d10.house.*.lord', ...D10_DIGNITY],
          interpretations: ['interp.career.d10.*'],
          depth: D_STD, referencePages: '72-73',
        },
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'voyage-turns',
      title: 'Turning Points: Challenges, Change and Stability',
      kicker: 'Section 9',
      intro: 'Every career has storms, crossings and harbours. Classical bhavat bhavam counting reads them from the 10th house itself.',
      topics: [
        {
          id: 'stormy-seas-d1', title: 'Stormy Seas: Pressure and Breaks', subtitle: 'The 5th (8th from the 10th) and 9th (12th from the 10th) in the birth chart', kind: 'narrative',
          objective: 'Using bhavat bhavam (the 5th house is the 8th from the 10th; the 9th is the 12th from the 10th), interpret the 5th and 9th lords\' placements for how the reader meets career pressure, breaks, changes of direction and relations with bosses and mentors, with constructive guidance.',
          requiredEvidence: ['house.5.d1.lord-house', 'house.9.d1.lord-house'], optionalEvidence: [...legacyHouse(5), ...legacyHouse(9), 'career.house.5.aspected-by', 'career.house.9.aspected-by'],
          depth: D_STD, referencePages: '75-78',
        },
        {
          id: 'stormy-seas-d10', title: 'Stormy Seas in the Career Chart', subtitle: 'D10 houses 5 and 9', kind: 'narrative',
          objective: `Interpret the D10 5th and 9th lords\' D10 placements, dignity and occupants as the career-chart view of pressure points and their resolution. ${D10_NOTE}`,
          requiredEvidence: ['career.d10.house.5.lord-house', 'career.d10.house.9.lord-house'], optionalEvidence: ['career.d10.house.5.*', 'career.d10.house.9.*', ...D10_DIGNITY],
          interpretations: ['interp.career.d10.*'],
          depth: D_SHORT, dependsOn: ['stormy-seas-d1'], referencePages: '79-81',
        },
        {
          id: 'changing-course', title: 'Changing Course', subtitle: 'The 8th house of transformation in D1 and D10', kind: 'narrative',
          objective: `Interpret the 8th house sign, the 8th lord\'s placement in D1 and in D10 (with its D10 dignity), and any occupants, for job switches, moves between employment and enterprise, research-type work and reinvention. ${D10_NOTE}`,
          requiredEvidence: ['house.8.d1.sign', 'house.8.d1.lord-house', 'career.d10.house.8.lord-house'], optionalEvidence: ['house.8.d1.occupants', 'career.d10.house.8.*', ...D10_DIGNITY],
          interpretations: ['interp.career.d10.*'],
          depth: D_STD, referencePages: '83-84',
        },
        {
          id: 'retirement', title: 'Anchoring Down: Lasting Stability', subtitle: 'The 12th house (the 3rd from the 10th) in D1 and D10', kind: 'narrative',
          objective: 'Interpret the 12th house (withdrawal, completion; also the 3rd from the 10th) and its lord in D1 and D10, plus the 4th house of rest, for how the reader may build long-term stability, wind down or transition later in working life.',
          requiredEvidence: ['house.12.d1.sign', 'house.12.d1.lord-house', 'career.d10.house.12.lord-house'], optionalEvidence: ['house.12.d1.occupants', 'house.4.d1.lord-house', 'career.d10.house.12.*', ...LIFE_STAGE_EVIDENCE],
          // Life-stage gating (product default): no retirement content before RETIREMENT_REFRAME_MAX_AGE + 1.
          variants: [{
            id: 'long-term-stability', when: { maxAge: RETIREMENT_REFRAME_MAX_AGE },
            title: 'Anchoring Down: Building Lasting Stability',
            objective: 'Interpret the 12th house (rest, withdrawal and completion; also the 3rd from the 10th) and its lord in D1 and D10, plus the 4th house of rest, for how the reader can build long-term stability, sustainable work habits and room for rest and renewal. The reader is early or mid-way in their working life (see the life-stage evidence): do not discuss retirement, winding down or late-career transitions.',
          }],
          depth: D_SHORT, referencePages: '85-87',
        },
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'government',
      title: 'Public Service and Government Roles',
      kicker: 'Section 10',
      intro: 'Classical astrology reads public service through the Sun (the state), Saturn (administration), the 6th house (service) and the 10th (office).',
      topics: [
        { id: 'government-table', title: 'Your Public-Service Indicators', kind: 'data', block: 'career-government', objective: 'Sun, Saturn, 6th and 10th facts.', referencePages: '89-97' },
        {
          id: 'sun-saturn-government', title: 'The Sun and Saturn: Authority and Service', subtitle: 'The pairing behind government careers', kind: 'narrative',
          objective: 'Explain the Sun as karaka of government and authority and Saturn as karaka of service and administration, then interpret the reader\'s Sun–Saturn link and the Sun\'s relation to the 10th house, together with the 6th (service) and 10th (office) house lords, for public-sector, administrative or institutional roles. The absence of a link is "no specific indicator", never a negative verdict; present suitability as one profile across all the listed factors, not as government versus enterprise.',
          requiredEvidence: ['career.gov.sun-saturn', 'career.gov.sun-tenth'],
          optionalEvidence: ['planet.sun.d1.sign', 'planet.sun.d1.house', 'planet.saturn.d1.sign', 'planet.saturn.d1.house', 'house.6.d1.sign', 'house.10.d1.sign', 'house.6.d1.lord-house', 'house.10.d1.lord-house', 'career.house.10.aspected-by', ...LIFE_STAGE_EVIDENCE],
          interpretations: ['interp.career.service-orientation'], variants: [EARLY_CAREER_VARIANT],
          depth: D_STD, referencePages: '89-93',
        },
        {
          id: 'rajya-seva-yogas', title: 'Combinations for Public Service', subtitle: 'Yogas linked to authority in your chart', kind: 'narrative',
          objective: 'Discuss only the detected Raja yogas in the evidence and how they relate to authority and public roles, stating the conditions under which each formed; refer back to the yoga section instead of re-explaining yogas covered there. Do not present solar or lunar yogas (Budha-Aditya, Gajakesari, Vesi, Vosi, Ubhayachari) as indicators of public office, and make no claims about royal favour. If no Raja yoga is present, say so and explain that public roles are then read from the Sun, Saturn and the 10th house.',
          requiredEvidence: ['career.yogas.relevant'], optionalEvidence: ['yoga.*', 'career.gov.sun-tenth', ...LIFE_STAGE_EVIDENCE],
          interpretations: ['interp.career.yoga.*', 'interp.career.service-orientation'], variants: [EARLY_CAREER_VARIANT],
          depth: D_SHORT, dependsOn: ['career-yogas'], referencePages: '94-97',
        },
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'business',
      title: 'Charting the Entrepreneurial Waters',
      kicker: 'Section 11',
      intro: 'Mercury (commerce), Venus (value and negotiation) and the Sun (initiative), with the 7th house of trade and the Ashtakavarga balance of employment and enterprise.',
      topics: [
        {
          id: 'business-compass', title: 'Your Business Compass', subtitle: 'Mercury, Venus and the Sun', kind: 'narrative',
          objective: 'Interpret Mercury, Venus and the Sun by sign and house for commercial instinct, negotiation, value creation and the confidence to lead an enterprise.',
          requiredEvidence: ['planet.mercury.d1.house', 'planet.venus.d1.house', 'planet.sun.d1.house'], optionalEvidence: ['planet.mercury.d1.sign', 'planet.venus.d1.sign', 'planet.sun.d1.sign', 'planet.mercury.d1.dignity', 'planet.venus.d1.dignity'],
          depth: D_STD, referencePages: '98',
        },
        {
          id: 'business-growth', title: 'Tides of Growth', subtitle: 'When and how enterprise can scale', kind: 'narrative',
          objective: 'Using the 7th house sign, its lord, its occupants and its aspects, plus the 11th lord, interpret how partnerships and trade could grow and what approach suits scaling an enterprise.',
          requiredEvidence: ['house.7.d1.sign', 'house.7.d1.lord-house'], optionalEvidence: ['house.7.d1.occupants', 'career.house.7.aspected-by', 'house.11.d1.lord-house'],
          depth: D_SHORT, dependsOn: ['business-compass'], referencePages: '99-100',
        },
        { id: 'ashtakavarga-table', title: 'Your Ashtakavarga', kind: 'data', block: 'career-ashtakavarga', objective: 'BAV and SAV table.', referencePages: '101' },
        { id: 'job-vs-business-table', title: 'Employment or Enterprise? The Ashtakavarga View', kind: 'data', block: 'career-job-vs-business', objective: 'SAV comparison of 6th/7th and 10th/11th.', referencePages: '101' },
        {
          id: 'job-vs-business', title: 'Reading the Balance', subtitle: 'What the bindus suggest about your path', kind: 'narrative',
          objective: 'Interpret the two Sarvashtakavarga comparisons (6th vs 7th, 10th vs 11th) and the benchmark positions as one practitioner tendency between employment and enterprise and between effort and reward, and describe a balanced approach (e.g. employment with side ventures) where the numbers are close. Never present the comparison as a verdict or as deciding the path. Define SAV only as in the evidence (natal bindu totals per sign); never as support from transiting planets.',
          requiredEvidence: ['career.sav.service-vs-partnership', 'career.sav.effort-vs-gain'], optionalEvidence: ['career.sav.house.*.benchmark', 'fact.definition.sav'],
          interpretations: ['interp.career.service-orientation', 'interp.career.enterprise'],
          depth: D_SHORT, referencePages: '101',
        },
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'cosmic-clock',
      title: 'The Cosmic Clock: Transits',
      kicker: 'Section 12',
      intro: 'Saturn, Jupiter, Rahu and Ketu move slowly enough to set the tone of whole career seasons. Here are their present and coming signs, with exact dates.',
      topics: [
        { id: 'transit-table', title: 'Current and Coming Transits', kind: 'data', block: 'career-transits', objective: 'Current and next sign periods of Saturn, Jupiter, Rahu and Ketu.', referencePages: '102-108' },
        {
          id: 'transit-saturn', title: 'Saturn\'s Transit: the Season of Effort', subtitle: 'Now and next', kind: 'narrative',
          objective: 'Interpret Saturn\'s current transit sign (with its dates and the house from the Ascendant and the Moon), then its next period, for career pacing, responsibility, consolidation and patience. Name the Saturn-from-Moon phase from the evidence in neutral terms (a phase of consolidation and adjustment, never misfortune), and keep transit positions distinct from natal placements. If the SAV score of the transit sign is cited, use the SAV definition in the evidence.',
          requiredEvidence: ['career.transit.saturn.current'],
          optionalEvidence: ['career.transit.saturn.next.*', 'house.*.d1.sign', 'fact.transit.saturn.now', 'fact.transit.saturn.from-moon', 'sav.house.*', 'fact.definition.sav'],
          interpretations: ['interp.career.transit.saturn*'],
          depth: D_STD, referencePages: '102-103, 106',
        },
        {
          id: 'transit-jupiter', title: 'Jupiter\'s Transit: the Season of Growth', subtitle: 'Now and next', kind: 'narrative',
          objective: 'Interpret Jupiter\'s current transit sign (with dates and the house from the Ascendant and the Moon), then its next period, for learning, opportunity, mentors and expansion at work. Keep transit positions distinct from natal placements. If the SAV score of the transit sign is cited, use the SAV definition in the evidence.',
          requiredEvidence: ['career.transit.jupiter.current'], optionalEvidence: ['career.transit.jupiter.next.*', 'fact.transit.jupiter.now', 'sav.house.*', 'fact.definition.sav'],
          interpretations: ['interp.career.transit.jupiter*'],
          depth: D_STD, referencePages: '105, 108',
        },
        {
          id: 'transit-nodes', title: 'Rahu and Ketu: the Axis of Change', subtitle: 'Now and next', kind: 'narrative',
          objective: 'Interpret the current Rahu and Ketu transit signs (with dates and houses from the Ascendant) and their next signs, for new ambitions (Rahu) and what is being released or mastered (Ketu) in professional life.',
          requiredEvidence: ['career.transit.rahu.current', 'career.transit.ketu.current'], optionalEvidence: ['career.transit.rahu.next.*', 'career.transit.ketu.next.*'],
          depth: D_STD, referencePages: '104, 107',
        },
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'dasha-ahead',
      title: 'What Lies Ahead in Your Dashas',
      kicker: 'Section 13',
      intro: 'Vimshottari periods describe which planet takes the lead in each chapter of life. Their links to the career houses show when work themes come forward.',
      topics: [
        { id: 'dasha-timeline', title: 'Your Career Timeline by Dasha', kind: 'data', block: 'career-dasha-timeline', objective: 'Mahadasha timeline with career links.', referencePages: '109', bonus: false },
        { id: 'antardasha-table', title: 'Sub-periods of Your Current Mahadasha', kind: 'data', block: 'career-antardashas', objective: 'Antardashas of the running Mahadasha.', referencePages: '109', bonus: true },
        {
          id: 'current-dasha', title: 'Your Current Chapter', subtitle: 'The running Mahadasha and Antardasha', kind: 'narrative',
          objective: `Interpret the current Mahadasha and Antardasha lords for career: the houses they rule, where they sit in the birth chart and in the D10 (with D10 dignity), their listed career links, their mutual position, and practical focus for this chapter. Then set the period against the current slow transits and the Saturn-from-Moon phase in the evidence (neutral wording). Transit positions are where the planets move now and must never be confused with natal placements: say "Saturn transits Pisces, the 9th from the Ascendant", never that a transiting planet is in its natal house. ${D10_NOTE}`,
          requiredEvidence: ['dasha.current.md', 'dasha.current.ad'],
          optionalEvidence: ['planet.*.d1.lordship', 'planet.*.d1.house', 'planet.*.d10.house', 'career.dasha.md.*.links', 'career.dasha.ad.*',
            'fact.dasha.current.md-ad', 'planet.*.d10.dignity', 'fact.transit.*.now', 'fact.transit.saturn.from-moon', 'career.transit.*.current', ...LIFE_STAGE_EVIDENCE],
          interpretations: ['interp.career.period.*', 'interp.career.transit.*'], variants: [EARLY_CAREER_VARIANT],
          depth: D_LONG, referencePages: '109',
        },
        {
          id: 'next-dasha', title: 'The Next Chapter', subtitle: 'The coming Mahadasha', kind: 'narrative', bonus: true,
          objective: 'Interpret the next Mahadasha lord for career (its houses, placements and listed career links) as a preview of the coming chapter, with how to prepare during the current one.',
          requiredEvidence: ['career.dasha.next.md'],
          optionalEvidence: ['planet.*.d1.lordship', 'planet.*.d1.house', 'planet.*.d10.house', 'career.dasha.md.*.links', 'planet.*.d10.dignity', 'dasha.md.*.age', ...LIFE_STAGE_EVIDENCE],
          interpretations: ['interp.career.period.*'], variants: [EARLY_CAREER_VARIANT],
          depth: D_SHORT, dependsOn: ['current-dasha'],
        },
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'vocation',
      title: 'Your Vocational Signature',
      kicker: 'Section 14',
      intro: 'A synthesis beyond the individual houses: Varahamihira\'s Karmajiva rule for the source of livelihood, the qualities of the career signs, and how the birth chart and the D10 agree.',
      topics: [
        { id: 'karmajiva-table', title: 'Karmajiva: the Source of Livelihood', kind: 'data', block: 'career-karmajiva', objective: 'Karmajiva planets from Lagna, Moon and Sun; sign qualities.', bonus: true },
        {
          id: 'vocational-signature', title: 'The Nature of Your Work', subtitle: 'Livelihood planets and sign qualities', kind: 'narrative', bonus: true,
          objective: 'Explain the Karmajiva rule briefly and interpret the livelihood planets found from the Lagna, Moon and Sun (noting where they agree), together with the element and modality of the 10th house sign, the 10th lord\'s sign and the D10 ascendant, to describe the nature of work that suits the reader, with example fields.',
          requiredEvidence: ['career.karmajiva.lagna', 'career.karmajiva.moon', 'career.karmajiva.sun'], optionalEvidence: ['career.vocation.*', 'career.d10.asc.quality'],
          depth: D_LONG,
        },
        {
          id: 'd1-d10-synthesis', title: 'Birth Chart and Career Chart in Dialogue', subtitle: 'Where the D1 and the D10 agree', kind: 'narrative', bonus: true,
          objective: 'Compare the D1 10th house sign and 10th lord placement with the D10 ascendant and the D10 10th lord placement: where they reinforce each other and where they add a different emphasis, and what that means for career choices.',
          requiredEvidence: ['house.10.d1.sign', 'house.10.d1.lord-house', 'asc.d10.sign', 'career.d10.house.10.lord-house'],
          optionalEvidence: ['house.10.d1.lord', 'career.d10.house.10.lord', 'career.d10.house.10.sign', ...D10_DIGNITY, 'planet.*.vargottama'],
          interpretations: ['interp.career.d1-d10.*', 'interp.career.d10.*'],
          depth: D_STD, dependsOn: ['vocational-signature'],
        },
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'remedies',
      title: 'Practical Remedies for Career Growth',
      kicker: 'Section 15',
      intro: 'Astro Sushil remedies are habits, conduct, service and optional devotion. Nothing here needs to be bought.',
      topics: [
        {
          id: 'remedy-practices', title: 'Strengthening Your Career Planets', subtitle: 'Practices for the 10th lord, Saturn and the Sun', kind: 'narrative',
          objective: 'Offer practical, ethical practices that express the qualities of the 10th lord, Saturn and the Sun (for example punctuality and diligence for Saturn, leadership with humility for the Sun), plus an optional simple devotional or mindful practice. Explicitly say nothing needs to be bought. No gemstones, rudraksha, yantras or paid rituals.',
          requiredEvidence: ['house.10.d1.lord', 'planet.saturn.d1.sign'], optionalEvidence: ['planet.sun.d1.sign', 'house.10.d1.lord-house', 'planet.saturn.d1.house'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 6 }, referencePages: '110-118',
        },
        {
          id: 'lifestyle-practices', title: 'Lifestyle Alchemy', subtitle: 'Routines, focus and well-being at work', kind: 'narrative',
          objective: 'Practical lifestyle, focus, meditation and yoga-style routines suited to the Ascendant and the 6th house (daily work), to support energy, concentration and resilience at work. No medical claims.',
          requiredEvidence: ['asc.d1.sign', 'house.6.d1.sign'], optionalEvidence: ['house.6.d1.lord-house', 'planet.moon.d1.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 6 }, referencePages: '119-125',
        },
        {
          id: 'seva-practices', title: 'Karmic Balance through Seva', subtitle: 'Service and giving of time and skill', kind: 'narrative',
          objective: 'Suggest forms of seva (service) and giving of time, skill and mentorship linked to Saturn (service to workers and the elderly) and the 11th house (community), framed as ethical practice, not as a transaction for results.',
          requiredEvidence: ['planet.saturn.d1.house', 'house.11.d1.sign'], optionalEvidence: ['house.11.d1.lord-house', 'planet.saturn.d1.sign'],
          depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 5 }, referencePages: '126-130',
        },
      ],
    },
    // ---------------------------------------------------------------------
    {
      id: 'roadmap',
      title: 'Your Career Roadmap',
      kicker: 'Section 16',
      intro: 'Bringing it together: the fields that call to you and the steps that put the chart\'s strengths to work.',
      topics: [
        {
          id: 'fields-of-opportunity', title: 'Fields of Opportunity', subtitle: 'Recommendations from the Lagna lord and the trine lords', kind: 'narrative',
          objective: 'Give three recommendations of fields and roles, each grounded in one factor: the Ascendant lord, the 5th lord (intellect and talent) and the 9th lord (fortune and higher purpose), by their signs and houses. Present them as examples to explore.',
          requiredEvidence: ['asc.d1.lord', 'house.5.d1.lord', 'house.9.d1.lord'], optionalEvidence: ['house.1.d1.lord-house', 'house.5.d1.lord-house', 'house.9.d1.lord-house', ...LIFE_STAGE_EVIDENCE],
          interpretations: ['interp.career.fields.*'], variants: [EARLY_CAREER_VARIANT],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 6 }, referencePages: '132-133',
        },
        {
          id: 'roadmap-summary', title: 'Your Path Forward', subtitle: 'A practical synthesis', kind: 'narrative', bonus: true,
          objective: 'Synthesise the report into a practical roadmap: the reader\'s core professional strengths (10th lord, Amatyakaraka), the present season (current Mahadasha and Saturn\'s transit) and three to five concrete next steps. Do not introduce new chart facts beyond the evidence.',
          requiredEvidence: ['house.10.d1.lord', 'karaka.amk', 'dasha.current.md'],
          optionalEvidence: ['career.transit.saturn.current', 'asc.d10.sign', 'house.10.d1.lord-house', 'fact.transit.saturn.now', 'fact.transit.saturn.from-moon', ...LIFE_STAGE_EVIDENCE],
          interpretations: ['interp.career.period.*', 'interp.career.transit.*'], variants: [EARLY_CAREER_VARIANT],
          depth: { minParagraphs: 3, maxParagraphs: 4, bullets: 5 }, dependsOn: ['fields-of-opportunity'], referencePages: '137',
        },
      ],
    },
  ],
};
