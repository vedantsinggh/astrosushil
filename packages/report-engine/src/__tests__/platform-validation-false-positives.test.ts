/**
 * Validator false positives found in the first real Gemini career run (scratchpad
 * 06-sample-comparison.md §1), with regression tests for BOTH sides of each fix:
 * (a) the correct wording the model produced now passes, and (b) the bad wording each check was
 * written for is still rejected.
 *
 * - ASHTAKAVARGA_MISDEFINED: negated, correct SAV definitions ("a natal tally rather than support
 *   given by transiting planets") were rejected.
 * - OVERSTATEMENT: a denied term ("rather than reliance on effortless gains") was rejected.
 * - V1 UNSUPPORTED_JUDGEMENT: restated fact values ("functionally challenging", "dignity: neutral")
 *   were treated as free judgements.
 * - INTERPRETATION_CLAIM_UNVERIFIABLE: yoga results carry two vocabularies (strength class "mixed",
 *   yoga class "moderate"); "evaluated as mixed with a moderate classification" was rejected.
 * - EARLY_CAREER_MAX_AGE: one shared constant (29) for the topic variant and the validator.
 * - Dates (audit F24): IST calendar dates in one human format.
 * - Ages in prose (audit F1 drift): warning only.
 *
 * Golden subject (user decision 2026-11-20): 08 Jun 2004 08:30 IST, Akbarpur (Ambedkar Nagar)
 * 26.4295 N, 82.5343 E. The fact labels used below come from the real `contributeInterpretationFacts`
 * output; the interp labels are copied verbatim from the golden registry (A1 contract).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { GeneratedTopicPayload, ReportTopic, ReportTopicSchema } from '../platform/contracts';
import { AddEvidence, EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { contributeInterpretationFacts } from '../platform/interpretation/facts';
import { EARLY_CAREER_MAX_AGE as LIFE_STAGE_MAX_AGE, isEarlyCareerAge } from '../platform/life-stage';
import { EARLY_CAREER_MAX_AGE as DEFINITION_MAX_AGE } from '../platform/reports/career/career.definition';
import { businessDateIso, buildChartSnapshot, ChartSnapshot, formatBusinessDate, SubjectInput } from '../platform/snapshot/chart-snapshot';
import { interpretationGrounded, validateGeneratedTopic, yogaGrounded } from '../platform/validation/claim-validator';
import { validateEditorial } from '../platform/validation/editorial-validator';
import {
  ageNumber,
  EARLY_CAREER_MAX_AGE as VALIDATOR_MAX_AGE,
  extractProseAges,
  validateInterpretationTopic,
} from '../platform/validation/interpretation-validator';
import { deniedInClause, misdefinesAshtakavarga } from '../platform/validation/judgement-lexicon';

const AS_OF = new Date('2026-11-20T00:00:00Z');
const GOLDEN: SubjectInput = {
  name: 'Golden Subject', gender: 'female', dateOfBirth: '2004-06-08', timeOfBirth: '08:30', placeName: 'Akbarpur',
  latitude: 26.4295, longitude: 82.5343, timezone: 'Asia/Kolkata',
};

const MIXED_EXPLANATION =
  'supporting and challenging indicators both apply and no cited precedence rule settles them, so both are shown.';
const INTERP: Record<string, [string, string]> = {
  'interp.career.yoga.budha-aditya': ['YOGA_FORMED_MODERATE',
    `Budha-Aditya Yoga is formed by the engine rule; its provisional yoga class is "moderate". [mixed; natal; BIRTH_TIME_SENSITIVE, PROVISIONAL_CONVENTION, PROVISIONAL_RULE, MIXED_INDICATORS] — because ${MIXED_EXPLANATION} supporting: Shadbala meets the required rupas [planet.sun.shadbala]. challenging: combust [planet.mercury.d1.combust].`],
  'interp.career.yoga.gajakesari': ['YOGA_FORMED_WEAK',
    `Gajakesari Yoga is formed by the engine rule; its provisional yoga class is "weak". [mixed; natal; BIRTH_TIME_SENSITIVE, PROVISIONAL_CONVENTION, PROVISIONAL_RULE, MIXED_INDICATORS] — because ${MIXED_EXPLANATION} supporting: in a great friend's sign [planet.jupiter.d1.dignity]. challenging: in an enemy's sign [planet.moon.d1.dignity].`],
  'interp.career.yoga.dhana-h2-h11': ['YOGA_FORMED_MODERATE',
    `Dhana Yoga (2nd Lord (Dhana) + 11th Lord (Labha)) is formed by the engine rule; its provisional yoga class is "moderate". [mixed; natal; BIRTH_TIME_SENSITIVE, PROVISIONAL_CONVENTION, PROVISIONAL_RULE, MIXED_INDICATORS] — because ${MIXED_EXPLANATION} supporting: in its own sign [planet.venus.d1.dignity]. challenging: combust [planet.venus.d1.combust].`],
  'interp.career.house-7.lord-placement': ['LORD_IN_DUSTHANA',
    `The 7th lord Saturn is placed in the 12th house, a dusthana. [mixed; natal; BIRTH_TIME_SENSITIVE, PROVISIONAL_CONVENTION, PROVISIONAL_RULE, MIXED_INDICATORS] — because ${MIXED_EXPLANATION} supporting: in a great friend's sign [planet.saturn.d1.dignity]. challenging: Shadbala below the required rupas [planet.saturn.shadbala].`],
  'interp.career.house-7.occupants': ['HOUSE_EMPTY',
    'The 7th house is unoccupied; an empty house is read through its lord. [neutral; natal; BIRTH_TIME_SENSITIVE, PROVISIONAL_CONVENTION, PROVISIONAL_RULE] — because no supporting or challenging indicator applies.'],
  'interp.career.house-7.sav': ['SAV_BELOW_28',
    'The 7th house has 26 Sarvashtakavarga bindus (a natal tally per sign), below the 28-bindu average. [challenged; natal; BIRTH_TIME_SENSITIVE, PROVISIONAL_CONVENTION] — because only challenging indicators apply. challenging: Sarvashtakavarga below 28 [sav.house.7].'],
  'interp.career.d10.house-1.lord': ['D10_LORD_DEBILITATED',
    'In the D10 chart the 1st lord Venus is in Virgo, D10 house 5, debilitated (sign-based D10 dignity). [challenged; natal; BIRTH_TIME_SENSITIVE, PROVISIONAL_CONVENTION, PROVISIONAL_RULE] — because only challenging indicators apply. challenging: debilitated in the D10 [planet.venus.d10.dignity].'],
  'interp.career.enterprise': ['INDICATORS_MIXED',
    `Business and enterprise: the chart indicators considered for this area are mixed: some support it and some call for effort. [mixed; natal; MIXED_INDICATORS, PRACTITIONER_HEURISTIC] — because ${MIXED_EXPLANATION} supporting: in a great friend's sign [planet.saturn.d1.dignity]. challenging: debilitated in the D10 [planet.jupiter.d10.dignity]; Shadbala below the required rupas [planet.saturn.shadbala].`],
};

let snap: ChartSnapshot;
let reg: EvidenceRegistry;
const registryWith = (extra: (add: AddEvidence) => void = () => undefined) =>
  new EvidenceRegistry(snap, {
    contributors: [
      (add) => contributeInterpretationFacts(add, snap),
      (add) => {
        for (const [id, [code, label]] of Object.entries(INTERP)) add(id, 'interpretation', label, code, 'interpretation:INT-TEST-001');
        extra(add);
      },
    ],
  });
beforeAll(async () => {
  snap = await buildChartSnapshot(GOLDEN, { asOf: AS_OF, vargas: ['D1', 'D9', 'D10'], transitYears: 2 });
  reg = registryWith();
}, 60000);

type InterpTopic = ReportTopic & { interpretations: string[] };
function topic(patterns: string[] = ['interp.career.*']): InterpTopic {
  return {
    ...ReportTopicSchema.parse({
      id: 'fp-topic', title: 'Seventh house', kind: 'narrative', objective: 'x',
      requiredEvidence: ['house.7.d1.sign'], optionalEvidence: ['house.*.d1.*', 'planet.*.d1.*', 'planet.*.shadbala', 'yoga.*', 'native.*', 'dasha.*', 'sav.*'],
    }),
    interpretations: patterns,
  };
}
const allowedFor = (t: InterpTopic) => [...t.requiredEvidence, ...t.optionalEvidence, ...t.interpretations];
const signClaim = () => ({ statement: `The 7th house is ${String(reg.get('house.7.d1.sign')!.value)}`, evidenceIds: ['house.7.d1.sign'] });
function payload(paragraphs: string[], claims: GeneratedTopicPayload['claims']): GeneratedTopicPayload {
  return { topicId: 'fp-topic', lead: 'Partnership and the seventh house.', paragraphs, bullets: [], claims };
}
function run(p: GeneratedTopicPayload, t: InterpTopic = topic(), registry: EvidenceRegistry = reg) {
  const allowed = allowedFor(t);
  const validation = validateGeneratedTopic(t, p, registry, { expectedSnapshotId: registry.snapshotId, allowedEvidence: allowed });
  const extra = validateInterpretationTopic(t, p, registry, validation, { allowedEvidence: allowed });
  const editorial = validateEditorial(p, { interpretationTopic: true });
  const all = [...validation.issues, ...extra, ...editorial];
  return { validation, all, errors: all.filter((i) => i.severity === 'error').map((i) => i.code), warnings: all.filter((i) => i.severity === 'warning').map((i) => i.code) };
}
const editorialErrors = (sentence: string) => validateEditorial(payload([sentence], [signClaim()]), { interpretationTopic: true }).filter((i) => i.severity === 'error').map((i) => i.code);

describe('golden facts used here', () => {
  it('Saturn is functionally challenging; Mars has neutral dignity; Jupiter is functionally mixed', () => {
    expect(reg.get('planet.saturn.d1.functional-nature')!.value).toBe('challenging');
    expect(reg.get('planet.saturn.d1.functional-nature')!.label).toMatch(/^Saturn is functionally challenging for a Cancer Ascendant/);
    expect(reg.get('planet.mars.d1.dignity')!.label).toBe('Mars dignity: neutral');
    expect(reg.get('planet.jupiter.d1.functional-nature')!.label).toMatch(/^Jupiter is functionally mixed .*\(Rules a trikona \(9th\) and a challenging house/);
  });
});

describe('ASHTAKAVARGA_MISDEFINED: negation and contrast', () => {
  it('accepts the correct negated definitions the model wrote (lagna-career, seventh-house, transit-jupiter)', () => {
    for (const s of [
      'Because these bindus are a natal tally rather than support given by transiting planets, this transit emphasizes deliberate effort.',
      'The bindus are natal: they are not support given by transiting planets.',
      'Sarvashtakavarga is the natal total of benefic points in each sign contributed by the seven planets and the Lagna, not support from transiting planets.',
      'The 10th house has 34 bindus, a natal count instead of support from transiting planets.',
      'Its 26 bindus are a birth-chart tally as opposed to support lent by the transiting planets.',
      'The SAV score is not something given by transiting planets; a transiting planet is judged against it.',
      'It is not that transiting planets contribute bindus; the bindus are fixed at birth.',
    ]) {
      expect(misdefinesAshtakavarga(s), s).toBe(false);
      expect(editorialErrors(s), s).not.toContain('ASHTAKAVARGA_MISDEFINED');
    }
  });

  it('REJECTS the affirmative misdefinition (audit F10) and denials that do not reach the claim', () => {
    for (const s of [
      'Here the bindus represent units of energetic support that a house receives from all transiting planets.',
      'Bindus represent units of energetic support from all transiting planets.',
      // the denial is in another clause
      'Bindus are not natal points; they represent support from transiting planets.',
      'Rather than being natal, bindus represent support from transiting planets.',
      'Bindus do not come from the natal chart but represent support from all transiting planets.',
      // the second affirmative form
      'In the Ashtakavarga, transiting planets contribute bindus to each sign.',
    ]) {
      expect(misdefinesAshtakavarga(s), s).toBe(true);
      expect(editorialErrors(s), s).toContain('ASHTAKAVARGA_MISDEFINED');
    }
  });

  it('deniedInClause: a denial reaches at most four words and stops at a clause boundary; "not only" is no denial', () => {
    const at = (s: string, w: string) => deniedInClause(s, s.indexOf(w));
    expect(at('a tally rather than support given by transiting planets', 'by transiting')).toBe(true);
    expect(at('not, as some say, support from transiting planets', 'from transiting')).toBe(false);
    expect(at('not the five or six units of support from transiting planets', 'from transiting')).toBe(false);
    expect(at('this yoga not only ensures success', 'ensures')).toBe(false);
  });
});

describe('OVERSTATEMENT: denied terms', () => {
  it('accepts "rather than reliance on effortless …" and "does not ensure" (seventh-house)', () => {
    for (const s of [
      'This indicates that collaborative ventures require patient cultivation and structured systems rather than reliance on effortless gains.',
      'The yoga does not ensure an outcome; it describes a potential.',
    ]) expect(editorialErrors(s), s).not.toContain('OVERSTATEMENT');
  });

  it('REJECTS real overstatement, including "not only ensures" (roadmap-summary)', () => {
    for (const s of [
      'Grounding your efforts in dependable collaboration, ethical work habits, and continuous refinement ensures that your earnings grow steadily.',
      'Vesi Yoga ensures calculated resourcefulness in every negotiation.',
      'This dasha not only ensures recognition but also wealth.',
      'Rather than hoping, this period ensures promotion.',
    ]) expect(editorialErrors(s), s).toContain('OVERSTATEMENT');
  });
});

describe('V1 UNSUPPORTED_JUDGEMENT: restated fact values', () => {
  const saturnFn = 'Saturn also rules the eighth house, carries a Shadbala score of 4.89 rupas against the 5.00 required, and is treated as functionally challenging.';

  it('accepts "functionally challenging" when a covering claim cites the functional-nature fact', () => {
    const r = run(payload([saturnFn], [signClaim(), { statement: saturnFn, evidenceIds: ['planet.saturn.d1.functional-nature', 'planet.saturn.d1.lordship'] }]));
    expect(r.validation.claims[1].status).toBe('verified');
    expect(r.errors).not.toContain('UNSUPPORTED_JUDGEMENT');
    expect(r.errors).not.toContain('JUDGEMENT_CLASS_MISMATCH');
  });

  it('accepts "functionally challenging" / "neutral dignity" when the sentence restates the in-scope fact label', () => {
    const r = run(payload([saturnFn, 'Mars holds a neutral dignity in its sign.'], [signClaim()]));
    expect(r.errors).not.toContain('UNSUPPORTED_JUDGEMENT');
  });

  it('accepts "neutral" restating an in-scope interpretation conclusion of that class, and a "challenging indicators" side label of a mixed result', () => {
    const r = run(payload([
      'The 7th house is unoccupied; an empty house is read through its lord, which is neutral.',
      "Challenging indicators show Jupiter debilitated in Capricorn in the D10 chart and Saturn's Shadbala below the required rupas.",
    ], [signClaim()]));
    expect(r.errors).not.toContain('UNSUPPORTED_JUDGEMENT');
  });

  it('a claim citing a mixed result and the fact may restate the fact value without a class mismatch', () => {
    const s = 'The 7th lord Saturn is placed in the 12th house, a dusthana, which is mixed: it cuts both ways, and Saturn is functionally challenging.';
    const r = run(payload([s], [signClaim(), { statement: s, evidenceIds: ['interp.career.house-7.lord-placement', 'planet.saturn.d1.functional-nature'] }]));
    expect(r.validation.claims[1].status).toBe('verified');
    expect(r.errors).toEqual([]);
  });

  it('REJECTS free-floating judgements: "potent gathering", "exceptionally strong", a contradicting fact value, a parenthetical word', () => {
    for (const s of [
      // eleventh-house: no fact or interpretation says "potent" (a true positive)
      'Your earning potential and long-range goals operate through a potent gathering of planets in Taurus within your 11th house.',
      'Saturn is exceptionally strong in your chart.',
      // the fact says Saturn is challenging; "favourable" belongs to the Moon's fact
      'Saturn is functionally favourable for your partnerships.',
      // Jupiter's main label clause says "mixed"; "challenging house" sits in its parenthesis
      'Jupiter is challenging for your partnerships.',
    ]) {
      expect(run(payload([s], [signClaim()])).errors, s).toContain('UNSUPPORTED_JUDGEMENT');
    }
  });

  it('still REJECTS "exceptionally strong" citing a mixed result', () => {
    const s = 'The 7th lord Saturn placed in the 12th house is exceptionally strong for your partnerships.';
    const r = run(payload([s], [signClaim(), { statement: s, evidenceIds: ['interp.career.house-7.lord-placement'] }]));
    expect(r.errors).toEqual(expect.arrayContaining(['JUDGEMENT_CLASS_MISMATCH', 'MIXED_RESULT_OVERSTATED']));
  });
});

describe('V1 coverage misses seen in golden run 2 (correct classes, split or loose restatement)', () => {
  const savClaim = { statement: 'The 7th house has 26 Sarvashtakavarga bindus in Capricorn, below the 28-bindu average, representing a challenged result.', evidenceIds: ['interp.career.house-7.sav', 'sav.house.7'] };
  const savLead = 'The 7th house has 26 Sarvashtakavarga bindus in Capricorn, below the 28-bindu average.';

  it('accepts a judgement that continues the previous sentence\'s claim with a compatible class', () => {
    const r = run(payload([`${savLead} This is below the classical benchmark of 28 bindus, which marks this area as a challenged score.`], [signClaim(), savClaim]));
    expect(r.errors).toEqual([]);
  });

  it('REJECTS the continued sentence with the wrong class, and a judgement after an unrelated sentence', () => {
    const wrong = run(payload([`${savLead} This bindu score is a supported and favourable one.`], [signClaim(), savClaim]));
    expect(wrong.errors).toContain('JUDGEMENT_CLASS_MISMATCH');
    const unrelated = run(payload(['Partnerships take patience. This house is a challenged and difficult area.'], [signClaim(), savClaim]));
    expect(unrelated.errors).toContain('UNSUPPORTED_JUDGEMENT');
  });

  it('accepts a loose restatement of an in-scope conclusion (anchors + 60% stems) with a compatible class', () => {
    const s = 'In the D10 chart, the 1st lord Venus is in Virgo in D10 house 5, where its debilitation marks a challenged factor that calls for mindful awareness.';
    expect(run(payload([s], [signClaim()])).errors).not.toContain('UNSUPPORTED_JUDGEMENT');
  });

  it('REJECTS a loose restatement with the wrong class or the wrong planet', () => {
    for (const s of [
      'In the D10 chart, the 1st lord Venus is in Virgo in D10 house 5, a supported and favourable factor.',
      'In the D10 chart, the 1st lord Mars is in Virgo in D10 house 5, where its debilitation marks a challenged factor.',
    ]) expect(run(payload([s], [signClaim()])).errors, s).toContain('UNSUPPORTED_JUDGEMENT');
  });

  it('accepts a denied classification ("does not treat an empty house as an advantage") and REJECTS the affirmative', () => {
    for (const s of [
      'Classical astrology does not treat an empty house as an advantage or as protected from friction; it simply directs focus toward Saturn and its condition.',
      'An unaspected house must be evaluated through its occupants and lord, and Vedic astrology never treats an unaspected house as protected from friction or as an advantage.',
    ]) {
      const r = run(payload([s], [signClaim()]));
      expect(r.errors, s).not.toContain('UNSUPPORTED_JUDGEMENT');
      expect(r.errors, s).not.toContain('ABSENCE_PRESENTED_AS_ADVANTAGE');
    }
    const bad = run(payload(['Your empty 7th house is an advantage that keeps partnerships free from friction.'], [signClaim()]));
    expect(bad.errors).toEqual(expect.arrayContaining(['UNSUPPORTED_JUDGEMENT', 'ABSENCE_PRESENTED_AS_ADVANTAGE']));
    const treats = run(payload(['Vedic astrology treats an empty house as an advantage for partnerships.'], [signClaim()]));
    expect(treats.errors).toContain('ABSENCE_PRESENTED_AS_ADVANTAGE');
  });

  it('a purpose clause in advice ("to ensure transparency") is not an overstatement; in a predictive sentence it is', () => {
    expect(editorialErrors('Review contractual responsibilities periodically to ensure administrative transparency across long-term partnerships.')).not.toContain('OVERSTATEMENT');
    expect(editorialErrors('This dasha period arrives to ensure your promotion.')).toContain('OVERSTATEMENT');
    expect(editorialErrors('Patient application ensures that your vocational principles develop into dependable practice.')).toContain('OVERSTATEMENT');
  });
});

describe('INTERPRETATION_CLAIM_UNVERIFIABLE: yoga results accept either vocabulary', () => {
  const label = (id: string) => INTERP[id][1];
  const code = (id: string) => INTERP[id][0];

  it('yogaGrounded: name + yoga class or strength class; a different yoga class is never grounded', () => {
    const ba = 'interp.career.yoga.budha-aditya';
    expect(yogaGrounded(label(ba), code(ba), 'Budha-Aditya Yoga is evaluated as mixed with a moderate classification, meaning its potential cuts both ways.')).toBe(true);
    expect(yogaGrounded(label(ba), code(ba), 'Budha-Aditya Yoga is mixed: it cuts both ways.')).toBe(true);
    expect(yogaGrounded(label(ba), code(ba), 'Budha-Aditya Yoga has a moderate yoga class.')).toBe(true);
    expect(yogaGrounded(label(ba), code(ba), 'Budha-Aditya Yoga is evaluated as strong.')).toBe(false);
    expect(yogaGrounded(label(ba), code(ba), 'Budha-Aditya Yoga is mixed with a weak classification.')).toBe(false);
    const dh = 'interp.career.yoga.dhana-h2-h11';
    expect(interpretationGrounded(label(dh), code(dh), 'Dhana Yoga is evaluated as mixed with a moderate classification, meaning its potential cuts both ways.')).toBe(true);
    expect(yogaGrounded('The 10th lord is placed [mixed; natal]', 'LORD_IN_DUSTHANA', 'anything')).toBeUndefined();
  });

  it('accepts the career-yogas claims and prose of the golden run', () => {
    const c1 = 'Budha-Aditya Yoga is evaluated as mixed with a moderate classification, meaning its potential cuts both ways.';
    const c2 = 'Gajakesari Yoga is evaluated as mixed with a weak classification, meaning its potential cuts both ways.';
    const p1 = 'For Budha-Aditya Yoga, the evaluation is mixed with a moderate classification, meaning the vocational results cut both ways.';
    const p2 = 'For Gajakesari Yoga, the evaluation is mixed with a weak classification, meaning its potential cuts both ways.';
    const r = run(payload([`${p1} ${p2}`], [
      signClaim(),
      { statement: c1, evidenceIds: ['interp.career.yoga.budha-aditya'] },
      { statement: c2, evidenceIds: ['interp.career.yoga.gajakesari'] },
    ]));
    expect(r.validation.claims.map((c) => c.status)).toEqual(['verified', 'verified', 'verified']);
    expect(r.errors).toEqual([]);
  });

  it('REJECTS a wrong yoga class and a claim that restates nothing', () => {
    const r = run(payload(['Gajakesari Yoga is evaluated as mixed with a moderate classification.'], [
      signClaim(),
      { statement: 'Gajakesari Yoga is evaluated as mixed with a moderate classification.', evidenceIds: ['interp.career.yoga.gajakesari'] },
      { statement: 'This yoga shapes your work.', evidenceIds: ['interp.career.yoga.budha-aditya'] },
      { statement: 'Budha-Aditya Yoga is strong.', evidenceIds: ['interp.career.yoga.budha-aditya'] },
    ]));
    expect(r.validation.claims.slice(1).map((c) => c.status)).toEqual(['unverifiable', 'unverifiable', 'unverifiable']);
    expect(r.errors).toContain('INTERPRETATION_CLAIM_UNVERIFIABLE');
  });
});

describe('EARLY_CAREER_MAX_AGE: one shared constant', () => {
  it('the career variant and the validator use the same value, 29, inclusively', () => {
    expect(LIFE_STAGE_MAX_AGE).toBe(29);
    expect(DEFINITION_MAX_AGE).toBe(LIFE_STAGE_MAX_AGE);
    expect(VALIDATOR_MAX_AGE).toBe(LIFE_STAGE_MAX_AGE);
    expect(isEarlyCareerAge(29)).toBe(true);
    expect(isEarlyCareerAge(30)).toBe(false);
  });

  it('LIFE_STAGE_MISMATCH fires at 29 and not at 30 (the variant applies up to 29)', () => {
    const s = 'Board-level responsibility arrives as your 7th house matures.';
    const at = (age: number) => {
      const r2 = registryWith((add) => add('native.test-age', 'life-stage', `The native is ${age} years old`, age, 'test'));
      return run(payload([s], [signClaim()]), { ...topic(), optionalEvidence: ['house.*.d1.*', 'native.test-age'] }, r2).errors;
    };
    expect(at(29)).toContain('LIFE_STAGE_MISMATCH');
    expect(at(30)).not.toContain('LIFE_STAGE_MISMATCH');
  });
});

describe('dates in IST, one human format (audit F24)', () => {
  it('businessDateIso / formatBusinessDate', () => {
    expect(businessDateIso('2026-11-19T21:10:00.000Z')).toBe('2026-11-20');
    expect(businessDateIso('2026-11-19T18:29:59.000Z')).toBe('2026-11-19');
    expect(businessDateIso('2026-11-19T18:30:00.000Z')).toBe('2026-11-20');
    expect(businessDateIso('2026-11-19')).toBe('2026-11-19');
    expect(formatBusinessDate('2026-11-19T21:10:00.000Z')).toBe('20 Nov 2026');
    expect(formatBusinessDate('2027-06-03')).toBe('03 Jun 2027');
  });

  it('career-only dasha facts give the IST date in labels and values', () => {
    const ad = snap.vimshottari.mahadashas[2].subPeriods![1];
    const item = reg.get('dasha.ad.03.02')!;
    expect(item.value).toEqual(['Saturn', businessDateIso(ad.startDateIso), businessDateIso(ad.endDateIso)]);
    expect(item.label).toBe(`Jupiter–Saturn Antardasha: ${formatBusinessDate(ad.startDateIso)} to ${formatBusinessDate(ad.endDateIso)}`);
    expect(item.label).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe('ages in prose (audit F1 drift): warning only', () => {
  it('parses ages in words and digits', () => {
    expect(ageNumber('twenty-nine')).toBe(29);
    expect(ageNumber('twenty')).toBe(20);
    expect(ageNumber('seventeen')).toBe(17);
    expect(ageNumber('29')).toBe(29);
    expect(ageNumber('lots')).toBeUndefined();
    expect(extractProseAges('starting around age twenty-nine, and at 22 years old now').map((a) => a.age)).toEqual([29, 22]);
  });

  it('warns when a prose age is outside every evidence age range, never errors', () => {
    // dasha.ad.03.* (the Jupiter Antardashas) names ages 20 to 36.
    const t = { ...topic(), optionalEvidence: ['house.*.d1.*', 'dasha.ad.03.*'] };
    const ok = run(payload(['The Jupiter–Saturn Antardasha runs from age 22 to age 24, starting around age twenty-two.'], [signClaim()]), t);
    expect(ok.warnings).not.toContain('AGE_NOT_IN_EVIDENCE');
    const drift = run(payload(['The Jupiter–Saturn Antardasha begins around age forty-one.'], [signClaim()]), t);
    expect(drift.warnings).toContain('AGE_NOT_IN_EVIDENCE');
    expect(drift.errors).not.toContain('AGE_NOT_IN_EVIDENCE');
  });
});
