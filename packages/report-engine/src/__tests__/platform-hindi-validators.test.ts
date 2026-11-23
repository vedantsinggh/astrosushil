/**
 * Hindi narrative is validated as strictly as English narrative
 * (docs/integration/hindi-reports-design.md: "write directly in Hindi, with the same checks").
 *
 * For every prose-reading rule of the claim, interpretation and editorial validators there is
 * (a) a Hindi sentence that must be rejected with the same code and severity as its English
 * counterpart, and (b) a natural Hindi sentence that must pass (false-positive guard). The cases
 * mirror platform-validation-interp.test.ts and platform-validation-false-positives.test.ts.
 *
 * In a Hindi edition the prose is Hindi and every claim statement stays English (copied from the
 * evidence label), so these payloads use Hindi paragraphs with English claims. No network, no LLM.
 *
 * Golden subject (user decision 2026-11-20): 08 Jun 2004 08:30 IST, Akbarpur. Cancer Lagna, Moon in
 * Aquarius, Saturn in the 12th house; on 2026-11-20 Saturn transits Pisces = the 9th from the
 * Ascendant and the 2nd from the Moon.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { GeneratedTopicPayload, ReportDefinition, ReportTopic, ReportTopicSchema } from '../platform/contracts';
import { AddEvidence, EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { PLANET_HI, SIGN_HI } from '../platform/i18n/hindi';
import { contributeInterpretationFacts } from '../platform/interpretation/facts';
import { buildBatchPrompt } from '../platform/llm/prompts';
import { isRepairable, quotedSentence, repairOnce } from '../platform/llm/sentence-repair';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';
import { checkTransitAssertion, extractNatalAssertions, extractTransitAssertions, validateGeneratedTopic } from '../platform/validation/claim-validator';
import { findNearDuplicates, sentenceSimilarity, validateEditorial } from '../platform/validation/editorial-validator';
import { HI_PLANETS, HI_SIGNS, hiNumber, hiOrdinalToken, hindiDatesToEnglish } from '../platform/validation/hindi-chart-terms';
import { crossMatch, devanagariSkeleton, hindiRestatesConclusion, hindiSentenceCovers, latinSkeleton } from '../platform/validation/hindi-coverage';
import {
  extractHindiProseAges,
  findHindiJudgementTerms,
  HINDI_CHART_ENTITY,
  HINDI_DERIVED_PATTERNS,
  HINDI_MIXED_MARKERS,
  HINDI_ONE_SIDED_INTENSIFIERS,
} from '../platform/validation/hindi-judgement-lexicon';
import { deniedInHindiClause, findHindiOverstatement, misdefinesAshtakavargaHindi } from '../platform/validation/hindi-lexicon';
import { extractProseDates, interpretationView, sentenceCoveredBy, validateInterpretationTopic } from '../platform/validation/interpretation-validator';
import { DERIVED_TERMS, findJudgementTerms, findOneSidedIntensifier, hasMixedMarker } from '../platform/validation/judgement-lexicon';

const AS_OF = new Date('2026-11-20T06:00:00Z');
const GOLDEN: SubjectInput = {
  name: 'Golden Subject', gender: 'female', dateOfBirth: '2004-06-08', timeOfBirth: '08:30', placeName: 'Akbarpur',
  latitude: 26.4295, longitude: 82.5343, timezone: 'Asia/Kolkata',
};

const MIXED_ID = 'interp.career.house-10.lord-placement';
const SUPPORTED_ID = 'interp.career.house-6.sav';
const MIXED_CONCLUSION = 'The 10th lord Mars is placed in the 12th house';
const MIXED_LABEL = `${MIXED_CONCLUSION} [mixed; natal; MIXED_INDICATORS, PROVISIONAL_RULE] — because Mars owns the 10th and 5th but sits in a dusthana`;
const SUPPORTED_CONCLUSION = 'The 6th house holds above-average bindus';
const SUPPORTED_LABEL = `${SUPPORTED_CONCLUSION} [supported; natal; PROVISIONAL_CONVENTION] — because its SAV of 33 is above 28`;

const MIXED_EXPLANATION = 'supporting and challenging indicators both apply and no cited precedence rule settles them, so both are shown.';
/** Interp labels copied from the golden registry (as in platform-validation-false-positives.test.ts). */
const INTERP: Record<string, [string, string]> = {
  'interp.career.yoga.budha-aditya': ['YOGA_FORMED_MODERATE',
    `Budha-Aditya Yoga is formed by the engine rule; its provisional yoga class is "moderate". [mixed; natal; PROVISIONAL_RULE, MIXED_INDICATORS] — because ${MIXED_EXPLANATION} supporting: Shadbala meets the required rupas [planet.sun.shadbala]. challenging: combust [planet.mercury.d1.combust].`],
  'interp.career.yoga.gajakesari': ['YOGA_FORMED_WEAK',
    `Gajakesari Yoga is formed by the engine rule; its provisional yoga class is "weak". [mixed; natal; PROVISIONAL_RULE, MIXED_INDICATORS] — because ${MIXED_EXPLANATION} supporting: in a great friend's sign [planet.jupiter.d1.dignity]. challenging: in an enemy's sign [planet.moon.d1.dignity].`],
  'interp.career.house-7.lord-placement': ['LORD_IN_DUSTHANA',
    `The 7th lord Saturn is placed in the 12th house, a dusthana. [mixed; natal; PROVISIONAL_RULE, MIXED_INDICATORS] — because ${MIXED_EXPLANATION} supporting: in a great friend's sign [planet.saturn.d1.dignity]. challenging: Shadbala below the required rupas [planet.saturn.shadbala].`],
  'interp.career.house-7.occupants': ['HOUSE_EMPTY',
    'The 7th house is unoccupied; an empty house is read through its lord. [neutral; natal; PROVISIONAL_RULE] — because no supporting or challenging indicator applies.'],
  'interp.career.house-7.sav': ['SAV_BELOW_28',
    'The 7th house has 26 Sarvashtakavarga bindus (a natal tally per sign), below the 28-bindu average. [challenged; natal; PROVISIONAL_CONVENTION] — because only challenging indicators apply. challenging: Sarvashtakavarga below 28 [sav.house.7].'],
  'interp.career.d10.house-1.lord': ['D10_LORD_DEBILITATED',
    'In the D10 chart the 1st lord Venus is in Virgo, D10 house 5, debilitated (sign-based D10 dignity). [challenged; natal; PROVISIONAL_RULE] — because only challenging indicators apply. challenging: debilitated in the D10 [planet.venus.d10.dignity].'],
};

let snap: ChartSnapshot;
/** Registry of platform-validation-interp.test.ts: two interpretation results, a dispositor fact, a 22-year-old native. */
let reg: EvidenceRegistry;
/** Registry of platform-validation-false-positives.test.ts: the real interpretation facts plus golden interp labels. */
let fpReg: EvidenceRegistry;
beforeAll(async () => {
  snap = await buildChartSnapshot(GOLDEN, { asOf: AS_OF, vargas: ['D1', 'D9', 'D10'], transitYears: 2 });
  reg = new EvidenceRegistry(snap, {
    contributors: [(add: AddEvidence) => {
      add(MIXED_ID, 'interpretation', MIXED_LABEL, 'TENTH_LORD_IN_DUSTHANA', 'interpretation:INT-H-001,CRP-002');
      add(SUPPORTED_ID, 'interpretation', SUPPORTED_LABEL, 'SAV_ABOVE_AVERAGE', 'interpretation:INT-S-003');
      add('career.dispositor.mars', 'planet-dispositor', "Mars's dispositor is Mercury (lord of Gemini)", 'Mercury', 'test');
      add('native.life-stage', 'life-stage', 'The native is 22 years old (early career)', 22, 'test');
    }],
  });
  fpReg = new EvidenceRegistry(snap, {
    contributors: [
      (add) => contributeInterpretationFacts(add, snap),
      (add) => {
        for (const [id, [code, label]] of Object.entries(INTERP)) add(id, 'interpretation', label, code, 'interpretation:INT-TEST-001');
      },
    ],
  });
}, 60000);

type InterpTopic = ReportTopic & { interpretations: string[] };
function legacyTopic(id = 'tenth-house'): ReportTopic {
  return ReportTopicSchema.parse({
    id, title: 'दशम भाव', kind: 'narrative', objective: 'x',
    requiredEvidence: ['house.10.d1.sign'], optionalEvidence: ['house.10.d1.*', 'planet.*.d1.*', 'transit.*', 'sav.*', 'career.dispositor.*'],
  });
}
function interpTopic(patterns: string[] = ['interp.career.*'], id = 'tenth-house-interp'): InterpTopic {
  return { ...legacyTopic(id), optionalEvidence: [...legacyTopic().optionalEvidence, 'native.life-stage'], interpretations: patterns };
}
function fpTopic(optional: string[] = ['house.*.d1.*', 'planet.*.d1.*', 'planet.*.shadbala', 'yoga.*', 'native.*', 'dasha.*', 'sav.*']): InterpTopic {
  return {
    ...ReportTopicSchema.parse({ id: 'fp-topic', title: 'सप्तम भाव', kind: 'narrative', objective: 'x', requiredEvidence: ['house.7.d1.sign'], optionalEvidence: optional }),
    interpretations: ['interp.career.*'],
  };
}
const allowedFor = (t: ReportTopic) => [...t.requiredEvidence, ...t.optionalEvidence, ...((t as Partial<InterpTopic>).interpretations ?? [])];
const LEAD = 'आपके कार्यक्षेत्र की एक झलक।';
function payload(topicId: string, paragraphs: string[], claims: GeneratedTopicPayload['claims'], extra: Partial<GeneratedTopicPayload> = {}): GeneratedTopicPayload {
  return { topicId, lead: LEAD, paragraphs, bullets: [], claims, ...extra };
}
function run(t: ReportTopic, p: GeneratedTopicPayload, registry: EvidenceRegistry = reg) {
  const allowed = allowedFor(t);
  const validation = validateGeneratedTopic(t, p, registry, { expectedSnapshotId: registry.snapshotId, allowedEvidence: allowed });
  const extra = validateInterpretationTopic(t, p, registry, validation, { allowedEvidence: allowed });
  const editorial = validateEditorial(p, { interpretationTopic: (t as Partial<InterpTopic>).interpretations !== undefined, language: 'hi' });
  const all = [...validation.issues, ...extra, ...editorial];
  return { validation, issues: all, errors: all.filter((i) => i.severity === 'error').map((i) => i.code), warnings: all.filter((i) => i.severity === 'warning').map((i) => i.code) };
}
/** The English fact claim every payload carries (as the model copies it from the evidence label). */
const signClaim = (house: 7 | 10, registry: EvidenceRegistry = reg) => ({ statement: `The ${house}th house is ${String(registry.get(`house.${house}.d1.sign`)!.value)}`, evidenceIds: [`house.${house}.d1.sign`] });
const interp = (paragraphs: string[], claims: GeneratedTopicPayload['claims'] = []) => run(interpTopic(), payload('tenth-house-interp', paragraphs, [signClaim(10), ...claims]));
const legacy = (paragraphs: string[], claims: GeneratedTopicPayload['claims'] = []) => run(legacyTopic(), payload('tenth-house', paragraphs, [signClaim(10), ...claims]));
const fp = (paragraphs: string[], claims: GeneratedTopicPayload['claims'] = [], t: InterpTopic = fpTopic()) =>
  run(t, { topicId: 'fp-topic', lead: 'साझेदारी और सप्तम भाव।', paragraphs, bullets: [], claims: [signClaim(7, fpReg), ...claims] }, fpReg);
const editorial = (sentence: string, opts: { interpretationTopic?: boolean } = {}) => validateEditorial(payload('tenth-house', [sentence], []), { ...opts, language: 'hi' });

const mixedClaim = { statement: `${MIXED_CONCLUSION}. This is mixed: it cuts both ways.`, evidenceIds: [MIXED_ID] };
const supportedClaim = { statement: `${SUPPORTED_CONCLUSION}. This is supported.`, evidenceIds: [SUPPORTED_ID] };

describe('golden chart facts used by these tests', () => {
  it('Cancer Lagna, Moon in Aquarius, Saturn in the 12th house, Saturn transiting Pisces', () => {
    expect(reg.get('asc.d1.sign')!.value).toBe('Cancer');
    expect(reg.get('planet.moon.d1.sign')!.value).toBe('Aquarius');
    expect(reg.get('planet.saturn.d1.house')!.value).toBe(12);
    expect(fpReg.get('planet.saturn.d1.functional-nature')!.label).toMatch(/^Saturn is functionally challenging for a Cancer Ascendant/);
    expect(fpReg.get('planet.mars.d1.dignity')!.label).toBe('Mars dignity: neutral');
  });
});

describe('Hindi chart vocabulary covers the glossary (platform/i18n/hindi.ts)', () => {
  it('recognises every glossary planet and sign, and the other names in common use', () => {
    for (const [en, hi] of Object.entries(PLANET_HI)) if (en !== 'Ascendant') expect(HI_PLANETS.find(([h]) => h === hi)?.[1], hi).toBe(en);
    for (const [en, hi] of Object.entries(SIGN_HI)) expect(HI_SIGNS.find(([h]) => h === hi)?.[1], hi).toBe(en);
    for (const [hi, en] of [['बृहस्पति', 'Jupiter'], ['गुरु', 'Jupiter'], ['चंद्रमा', 'Moon'], ['चन्द्र', 'Moon'], ['रवि', 'Sun'], ['कुम्भ', 'Aquarius'], ['वृष', 'Taurus']]) {
      expect([...HI_PLANETS, ...HI_SIGNS].find(([h]) => h === hi)?.[1], hi).toBe(en);
    }
  });

  it('reads house ordinals as words and digits, numbers in words, and Hindi dates', () => {
    expect(['दसवें', 'दशम', '10वें', 'बारहवाँ', 'सप्तम', 'पहले', 'छठे'].map(hiOrdinalToken)).toEqual([10, 10, 10, 12, 7, 1, 6]);
    expect(hiOrdinalToken('नव')).toBeUndefined(); // "नव" (new) is not the 9th
    expect([hiNumber('उनतीस'), hiNumber('२९'), hiNumber('बाईस'), hiNumber('बहुत')]).toEqual([29, 29, 22, undefined]);
    expect(hindiDatesToEnglish('२० नवंबर 2026 से')).toBe('20 Nov 2026 से');
    expect(hindiDatesToEnglish('20 Nov 2026')).toBe('20 Nov 2026');
  });
});

describe('NARRATIVE_CONTRADICTS_CHART in Hindi', () => {
  const errs = (s: string) => legacy([s]).errors;

  it('REJECTS a wrong house or sign, in either word order, with digits or words', () => {
    const jupiterSign = String(reg.get('planet.jupiter.d1.sign')!.value);
    const wrongSign = SIGN_HI[jupiterSign === 'Aries' ? 'Taurus' : 'Aries'];
    for (const s of [
      'आपका शनि पाँचवें भाव में स्थित है।',
      'शनि आपकी कुंडली के 5वें भाव में बैठा है।',
      'शनि ५वें भाव में है।',
      'पंचम भाव में स्थित शनि आपको धैर्य सिखाता है।',
      'लग्न से पाँचवें भाव में शनि अनुशासन माँगता है।',
      'शनि आपके कर्म भाव में है।',
      `गुरु ${wrongSign} राशि में है।`,
      `बृहस्पति ${wrongSign} में स्थित है।`,
      `${wrongSign} राशि में स्थित गुरु सीखने की ओर ले जाता है।`,
    ]) expect(errs(s), s).toContain('NARRATIVE_CONTRADICTS_CHART');
  });

  it('accepts correct placements and sentences that assert no natal placement', () => {
    const jupiterSign = SIGN_HI[String(reg.get('planet.jupiter.d1.sign')!.value)];
    for (const s of [
      'आपका शनि बारहवें भाव में स्थित है।',
      'शनि आपकी कुंडली के 12वें भाव में बैठा है।',
      'द्वादश भाव में स्थित शनि आपको एकांत में काम करना सिखाता है।',
      'शनि आपके व्यय भाव में है।',
      `गुरु ${jupiterSign} राशि में है।`,
      `बृहस्पति ${jupiterSign} में स्थित है।`,
      // an aspect or a lordship is not a placement
      'शनि की दृष्टि पाँचवें भाव में पढ़ाई के विषयों को गंभीर बनाती है।',
      'पाँचवें भाव में शनि की दृष्टि धैर्य की माँग करती है।',
      // counted from the Moon, a divisional chart, a hypothetical: not the natal D1 house
      'चंद्र से शनि दूसरे भाव में पड़ता है।',
      'नवांश कुंडली में शनि पाँचवें भाव में है।',
      'यदि शनि पाँचवें भाव में हो, तो पढ़ाई में धैर्य चाहिए।',
    ]) expect(errs(s), s).not.toContain('NARRATIVE_CONTRADICTS_CHART');
    expect(extractNatalAssertions('शनि की दृष्टि पाँचवें भाव में पड़ती है।')).toEqual([]);
  });

  it('a partner sentence is not checked against the native chart', () => {
    expect(extractNatalAssertions('आपके साथी का शनि पाँचवें भाव में है।')[0]).toMatchObject({ planet: 'Saturn', house: 5, who: 'partner' });
    expect(errs('आपके साथी का शनि पाँचवें भाव में है।')).not.toContain('NARRATIVE_CONTRADICTS_CHART');
  });

  it('the error message ends with the quoted sentence (sentence repair)', () => {
    const s = 'आपका शनि पाँचवें भाव में स्थित है।';
    const issue = legacy([s]).issues.find((i) => i.code === 'NARRATIVE_CONTRADICTS_CHART')!;
    expect(issue.severity).toBe('error');
    expect(s.startsWith(quotedSentence(issue.message)!)).toBe(true);
  });
});

describe('NARRATIVE_CONTRADICTS_TRANSIT in Hindi (Saturn transits Pisces = 9th from the Ascendant, 2nd from the Moon)', () => {
  const errs = (text: string) => extractTransitAssertions(text).map((a) => checkTransitAssertion(a, reg)).filter(Boolean);

  it('REJECTS a wrong current house, sign and house from the Moon', () => {
    for (const s of [
      'शनि इस समय आपके बारहवें भाव में गोचर कर रहा है।',
      'शनि मिथुन राशि में गोचर कर रहा है।',
      'शनि का गोचर आपके बारहवें भाव में धैर्य माँगता है।',
      'बारहवें भाव में शनि का गोचर एकांत का समय है।',
      'शनि चंद्र से बारहवें भाव में गोचर कर रहा है।',
      'शनि आपके १२वें भाव से गोचर कर रहा है।',
    ]) expect(errs(s), s).toHaveLength(1);
    const r = legacy(['शांत अध्ययन को अपनाइए, क्योंकि शनि इस समय आपके बारहवें भाव में गोचर कर रहा है।']);
    expect(r.errors).toContain('NARRATIVE_CONTRADICTS_TRANSIT');
    const issue = r.issues.find((i) => i.code === 'NARRATIVE_CONTRADICTS_TRANSIT')!;
    expect('शांत अध्ययन को अपनाइए, क्योंकि शनि इस समय आपके बारहवें भाव में गोचर कर रहा है।'.startsWith(quotedSentence(issue.message)!)).toBe(true);
  });

  it('accepts correct transit statements and does not check what it cannot confirm', () => {
    for (const s of [
      'शनि इस समय मीन राशि में गोचर कर रहा है।',
      'शनि आपके नवम भाव में गोचर कर रहा है।',
      'शनि का गोचर आपके नौवें भाव में अध्ययन को गहराई देता है।',
      'शनि चंद्र से दूसरे भाव में गोचर कर रहा है।',
      // past, hypothetical, future and natal statements are not current transit assertions
      'शनि ने वर्षों पहले आपके बारहवें भाव में गोचर किया था।',
      'यदि शनि बारहवें भाव में गोचर करे, तो विश्राम का महत्व बढ़ता है।',
      'आगे चलकर शनि आपके दसवें भाव में गोचर करेगा।',
      'जन्म कुंडली में शनि बारहवें भाव में है, जबकि गोचर में वह अभी नवम भाव में है।',
      // Mars has no computed transit periods in this registry
      'मंगल आपके तीसरे भाव में गोचर कर रहा है।',
    ]) expect(errs(s), s).toHaveLength(0);
    expect(legacy(['शनि इस समय मीन राशि में, यानी आपके लग्न से नवम भाव में गोचर कर रहा है।']).errors).not.toContain('NARRATIVE_CONTRADICTS_TRANSIT');
  });
});

describe('Hindi judgement lexicon (V1)', () => {
  it('finds Hindi judgement words with their polarity', () => {
    expect(findJudgementTerms('शनि यहाँ मजबूत है।')).toEqual([{ term: 'मजबूत', polarity: 'positive' }]);
    expect(findJudgementTerms('यह भाव चुनौतीपूर्ण है।')).toEqual([{ term: 'चुनौतीपूर्ण', polarity: 'negative' }]);
    expect(findJudgementTerms('यह चित्र मिला-जुला है।')).toEqual([{ term: 'मिला-जुला', polarity: 'mixed' }]);
    expect(findJudgementTerms('मंगल सम राशि में है।')).toEqual([{ term: 'सम', polarity: 'neutral' }]);
    expect(findJudgementTerms('यह स्थिति अनुकूल और शुभ है।').map((h) => h.polarity)).toEqual(['positive', 'positive']);
  });

  it('a negated word, a classification and a look-alike are not judgements', () => {
    for (const s of [
      'मंगल यहाँ विशेष रूप से मजबूत नहीं है।',
      'यह न तो मजबूत है न कमजोर।',
      'गुरु एक शुभ ग्रह माना जाता है।',
      'यह समय धैर्य से काम लेने का है।', // "समय" is not "सम"
      'खाली भाव को लाभकारी के रूप में नहीं देखा जाता।',
    ]) expect(findHindiJudgementTerms(s), s).toEqual([]);
    // English behaviour is unchanged
    expect(findJudgementTerms('Mars is not especially strong here')).toEqual([]);
    expect(findJudgementTerms('Saturn is strong here')).toEqual([{ term: 'strong', polarity: 'positive' }]);
  });

  it('chart entities: planets, houses, lords, yogas; not ordinary words that contain them', () => {
    for (const s of ['शनि', 'दसवें भाव', 'दशमेश', 'ग्रहों', 'राशियों', 'गजकेसरी योग', 'महादशा', 'कुंडली']) expect(HINDI_CHART_ENTITY.test(s), s).toBe(true);
    for (const s of ['आपका योगदान', 'आपकी योग्यता', 'समय और धैर्य']) expect(HINDI_CHART_ENTITY.test(s), s).toBe(false);
  });
});

describe('UNSUPPORTED_JUDGEMENT / JUDGEMENT_CLASS_MISMATCH in Hindi prose', () => {
  it('REJECTS an evaluative Hindi sentence that is not backed by an interp claim', () => {
    const s = 'आपका दसवाँ भाव बहुत मजबूत और अनुकूल है।';
    const r = interp([s]);
    expect(r.errors).toContain('UNSUPPORTED_JUDGEMENT');
    const issue = r.issues.find((i) => i.code === 'UNSUPPORTED_JUDGEMENT')!;
    expect(issue.severity).toBe('error');
    expect(s.startsWith(quotedSentence(issue.message)!)).toBe(true);
    // legacy topics: V1 does not run, exactly as in English
    expect(legacy([s]).errors).not.toContain('UNSUPPORTED_JUDGEMENT');
  });

  it('accepts natural Hindi prose that evaluates nothing', () => {
    const r = interp([
      'आपका दसवाँ भाव आपके सार्वजनिक काम का स्वर बताता है। यह स्थान आपसे धैर्य, नियमित अभ्यास और अपने काम की ज़िम्मेदारी लेने की अपेक्षा रखता है।',
      'शनि बारहवें भाव में है, इसलिए एकांत में किया गया अध्ययन आपके काम को गहराई देता है।',
    ]);
    expect(r.errors).toEqual([]);
  });

  it('REJECTS "असाधारण रूप से मजबूत" for a mixed result (class mismatch + overstated)', () => {
    const s = 'दशमेश मंगल बारहवें भाव में स्थित है और आपके करियर के लिए असाधारण रूप से मजबूत है।';
    const r = interp([s], [mixedClaim]);
    expect(r.validation.claims[1].status).toBe('verified');
    expect(r.errors).toEqual(expect.arrayContaining(['JUDGEMENT_CLASS_MISMATCH', 'MIXED_RESULT_OVERSTATED']));
    for (const code of ['JUDGEMENT_CLASS_MISMATCH', 'MIXED_RESULT_OVERSTATED']) {
      const issue = r.issues.find((i) => i.code === code)!;
      expect(issue.severity, code).toBe('error');
      expect(s.startsWith(quotedSentence(issue.message)!), code).toBe(true);
    }
  });

  it('accepts an honest mixed sentence and a supported judgement in Hindi', () => {
    const mixed = 'दशमेश मंगल बारहवें भाव में स्थित है; यह मिला-जुला चित्र है, जो शोध के लिए अनुकूल है लेकिन सार्वजनिक पहचान के लिए अधिक मेहनत माँगता है।';
    const sav = 'छठे भाव में औसत से अधिक बिंदु हैं, जो नियमित सेवा-कार्य के लिए एक सहायक संकेत है।';
    const r = interp([`${mixed} ${sav}`], [mixedClaim, supportedClaim]);
    expect(r.validation.claims.map((c) => c.status)).toEqual(['verified', 'verified', 'verified']);
    expect(r.errors).toEqual([]);
  });

  it('REJECTS the wrong class for a supported result, and a judgement about a different house', () => {
    expect(interp(['छठे भाव में औसत से अधिक बिंदु हैं, जो इस भाव को कमजोर और कठिन बनाते हैं।'], [supportedClaim]).errors).toContain('JUDGEMENT_CLASS_MISMATCH');
    // the supported result is about the 6th house; the 8th house has no result
    expect(interp(['आठवें भाव में औसत से अधिक बिंदु हैं, जो एक सहायक संकेत है।'], [supportedClaim]).errors).toContain('UNSUPPORTED_JUDGEMENT');
  });

  it('a Hindi claim statement cannot verify an interpretation (claims stay English)', () => {
    const r = interp(['करियर के विषय समय के साथ बदलते हैं।'], [{ statement: 'करियर के विषय समय के साथ बदलते हैं', evidenceIds: [MIXED_ID] }]);
    expect(r.errors).toContain('INTERPRETATION_CLAIM_UNVERIFIABLE');
  });

  it('V5: an exactly named interpretation must be cited, whatever the prose language', () => {
    const r = run(interpTopic([MIXED_ID]), payload('tenth-house-interp', ['आपके दशम भाव की राशि आपके सार्वजनिक काम का स्वर बताती है।'], [signClaim(10)]));
    expect(r.errors).toContain('REQUIRED_INTERPRETATION_NOT_CITED');
  });
});

describe('MIXED_RESULT_OVERSTATED / MIXED_RESULT_NOT_ACKNOWLEDGED in Hindi', () => {
  it('Hindi intensifiers and mixed markers', () => {
    for (const s of ['यह अत्यंत मजबूत है', 'यह बेहद अनुकूल है', 'यह पूरी तरह सहायक है', 'यह निस्संदेह मजबूत है', 'यह बहुत मजबूत है', 'यह पूर्णतः अनुकूल है']) {
      expect(HINDI_ONE_SIDED_INTENSIFIERS.test(s), s).toBe(true);
      expect(findOneSidedIntensifier(s), s).toBeDefined();
    }
    for (const s of ['यह आपसे बहुत धैर्य माँगता है', 'यह स्थान अध्ययन की ओर ले जाता है']) expect(findOneSidedIntensifier(s), s).toBeUndefined();
    for (const s of ['यह मिश्रित है', 'दोनों बातें सच हैं', 'एक ओर सहारा है', 'लेकिन मेहनत भी है', 'जबकि पहचान देर से मिलती है', 'फिर भी राह खुली है']) {
      expect(HINDI_MIXED_MARKERS.test(s), s).toBe(true);
      expect(hasMixedMarker(s), s).toBe(true);
    }
    expect(hasMixedMarker('यह स्थान अध्ययन की ओर ले जाता है')).toBe(false);
    expect(hasMixedMarker('both sides apply')).toBe(true);
  });

  it('a mixed result must be acknowledged as two-sided; Hindi prose can do it', () => {
    const bare = { statement: MIXED_CONCLUSION, evidenceIds: [MIXED_ID] };
    const silent = interp(['दशमेश मंगल बारहवें भाव में स्थित है, जो आपको पर्दे के पीछे के काम की ओर ले जाता है।'], [bare]);
    expect(silent.errors).toContain('MIXED_RESULT_NOT_ACKNOWLEDGED');
    const honest = interp(['दशमेश मंगल बारहवें भाव में स्थित है, और यह दोनों तरह से काम करता है: शोध को सहारा मिलता है, जबकि पहचान देर से आती है।'], [bare]);
    expect(honest.errors).toEqual([]);
  });
});

describe('cross-language coverage (Hindi sentence against an English statement)', () => {
  it('matches anchors (numbers, planets, signs), glossary words and yoga names', () => {
    expect(hindiSentenceCovers('दशमेश मंगल बारहवें भाव में स्थित है, और चित्र मिला-जुला है।', mixedClaim.statement)).toBe(true);
    expect(sentenceCoveredBy('दशमेश मंगल बारहवें भाव में स्थित है, और चित्र मिला-जुला है।', mixedClaim.statement)).toBe(true);
    expect(hindiRestatesConclusion('सप्तमेश शनि 12वें भाव में है, जो एक दुःस्थान है।', 'The 7th lord Saturn is placed in the 12th house, a dusthana.')).toBe(true);
    expect(hindiRestatesConclusion('गजकेसरी योग बनता है और इसकी श्रेणी कमजोर है।', 'Gajakesari Yoga is formed by the engine rule; its provisional yoga class is "weak".')).toBe(true);
    expect(devanagariSkeleton('बुधादित्य')).toBe(latinSkeleton('Budha-Aditya'));
    expect(devanagariSkeleton('गजकेसरी')).toBe(latinSkeleton('Gajakesari'));
  });

  it('does NOT match a different planet, house or yoga, nor a text with too little to compare', () => {
    expect(hindiSentenceCovers('दशमेश शनि ग्यारहवें भाव में है।', 'The 10th lord Mars is placed in the 12th house')).toBe(false);
    expect(hindiRestatesConclusion('सप्तमेश शनि ग्यारहवें भाव में है, जो एक दुःस्थान है।', 'The 7th lord Saturn is placed in the 12th house, a dusthana.')).toBe(false);
    expect(hindiRestatesConclusion('बुधादित्य योग बनता है और इसकी श्रेणी कमजोर है।', 'Gajakesari Yoga is formed by the engine rule; its provisional yoga class is "weak".')).toBe(false);
    // nothing comparable: fail closed
    expect(crossMatch('करियर के विषय बदलते हैं।', 'Career themes evolve').total).toBeLessThan(3);
    expect(hindiSentenceCovers('करियर के विषय बदलते हैं।', 'Career themes evolve')).toBe(false);
    // English against English is the unchanged word-share rule
    expect(sentenceCoveredBy('The 10th lord Mars is placed in the 12th house, a mixed picture.', MIXED_CONCLUSION)).toBe(true);
  });
});

describe('restated fact values and conclusions in Hindi (false-positive guards with the real fact labels)', () => {
  it('accepts a Hindi restatement of a fact that states the word (functionally challenging, neutral dignity)', () => {
    const r = fp([
      'शनि आठवें भाव का भी स्वामी है और कर्क लग्न के लिए कार्यात्मक रूप से चुनौतीपूर्ण माना जाता है।',
      'मंगल अपनी राशि में सम स्थिति रखता है।',
    ]);
    expect(r.errors).not.toContain('UNSUPPORTED_JUDGEMENT');
  });

  it('accepts "तटस्थ" restating a neutral conclusion, and a "चुनौतीपूर्ण संकेत" side label of a mixed result', () => {
    const r = fp([
      '7वाँ भाव खाली है; खाली भाव को उसके स्वामी के माध्यम से पढ़ा जाता है, और यह तटस्थ है।',
      'चुनौतीपूर्ण संकेत बताते हैं कि D10 में गुरु मकर राशि में नीच है और शनि का षड्बल आवश्यक मान से कम है।',
    ]);
    expect(r.errors).not.toContain('UNSUPPORTED_JUDGEMENT');
    expect(r.errors).not.toContain('ABSENCE_PRESENTED_AS_ADVANTAGE');
  });

  it('REJECTS free-floating Hindi judgements', () => {
    for (const s of [
      'शनि आपकी कुंडली में असाधारण रूप से मजबूत है।',
      // the fact says Saturn is challenging; "favourable" belongs to another planet's fact
      'शनि आपकी साझेदारी के लिए कार्यात्मक रूप से अनुकूल है।',
      // Jupiter's fact says "mixed"
      'गुरु आपकी साझेदारी के लिए चुनौतीपूर्ण है।',
      'वृषभ राशि में ग्रहों का एक प्रबल जमावड़ा आपकी आय को दिशा देता है।',
    ]) expect(fp([s]).errors, s).toContain('UNSUPPORTED_JUDGEMENT');
  });

  const savClaim = { statement: 'The 7th house has 26 Sarvashtakavarga bindus in Capricorn, below the 28-bindu average, representing a challenged result.', evidenceIds: ['interp.career.house-7.sav', 'sav.house.7'] };
  const savLead = '7वें भाव में मकर राशि में 26 सर्वाष्टकवर्ग बिंदु हैं, जो 28 बिंदु के औसत से कम हैं।';

  it('accepts a judgement that continues the previous sentence with a compatible class; REJECTS the wrong class and an unrelated sentence', () => {
    expect(fp([`${savLead} यह 28 बिंदु के मानक से नीचे है, इसलिए यह एक चुनौतीपूर्ण अंक है।`], [savClaim]).errors).toEqual([]);
    expect(fp([`${savLead} बिंदु का यह अंक समर्थित और अनुकूल है।`], [savClaim]).errors).toContain('JUDGEMENT_CLASS_MISMATCH');
    expect(fp(['साझेदारी धैर्य माँगती है। यह भाव एक चुनौतीपूर्ण और कठिन क्षेत्र है।'], [savClaim]).errors).toContain('UNSUPPORTED_JUDGEMENT');
  });

  it('accepts a loose Hindi restatement of an in-scope conclusion; REJECTS the wrong class or planet', () => {
    const ok = 'D10 कुंडली में प्रथम भाव का स्वामी शुक्र कन्या राशि में, D10 के पाँचवें भाव में नीच है, जो एक चुनौतीपूर्ण कारक है और सजगता माँगता है।';
    expect(fp([ok]).errors).not.toContain('UNSUPPORTED_JUDGEMENT');
    for (const s of [
      'D10 कुंडली में प्रथम भाव का स्वामी शुक्र कन्या राशि में, D10 के पाँचवें भाव में है, जो एक समर्थित और अनुकूल कारक है।',
      'D10 कुंडली में प्रथम भाव का स्वामी मंगल कन्या राशि में, D10 के पाँचवें भाव में नीच है, जो एक चुनौतीपूर्ण कारक है।',
    ]) expect(fp([s]).errors, s).toContain('UNSUPPORTED_JUDGEMENT');
  });

  it('yoga results: Hindi prose restating the English claim, with the yoga named in Devanagari', () => {
    const c1 = { statement: 'Budha-Aditya Yoga is evaluated as mixed with a moderate classification, meaning its potential cuts both ways.', evidenceIds: ['interp.career.yoga.budha-aditya'] };
    const c2 = { statement: 'Gajakesari Yoga is evaluated as mixed with a weak classification, meaning its potential cuts both ways.', evidenceIds: ['interp.career.yoga.gajakesari'] };
    const p1 = 'बुधादित्य योग का मूल्यांकन मिश्रित है और इसकी श्रेणी मध्यम है; इसका फल दोनों ओर जाता है।';
    const p2 = 'गजकेसरी योग का मूल्यांकन भी मिश्रित है, पर इसकी श्रेणी कमजोर है; इसका फल दोनों ओर जाता है।';
    const r = fp([`${p1} ${p2}`], [c1, c2]);
    expect(r.validation.claims.map((c) => c.status)).toEqual(['verified', 'verified', 'verified']);
    expect(r.errors).toEqual([]);
    // an unknown yoga, or a one-sided word for a mixed yoga, is rejected
    expect(fp(['वेशि योग का मूल्यांकन मिश्रित है और इसकी श्रेणी मध्यम है।'], [c1]).errors).toContain('UNSUPPORTED_JUDGEMENT');
    expect(fp(['बुधादित्य योग आपके काम के लिए अत्यंत मजबूत है।'], [c1]).errors).toEqual(expect.arrayContaining(['UNSUPPORTED_JUDGEMENT']));
  });
});

describe('DERIVED_TERM_UNSUPPORTED in Hindi (V4)', () => {
  const dispositorText = 'इसका राशि स्वामी बुध चुपचाप यह रंग देता है कि दशमेश काम में कैसे व्यक्त होता है।';

  it('every English derived term has a Hindi pattern', () => {
    for (const d of DERIVED_TERMS) expect(HINDI_DERIVED_PATTERNS[d.term], d.term).toBeInstanceOf(RegExp);
  });

  it('REJECTS a derived term without a cited fact (error when opted in, warning for legacy)', () => {
    const r = interp([dispositorText]);
    expect(r.errors).toContain('DERIVED_TERM_UNSUPPORTED');
    expect(dispositorText.startsWith(quotedSentence(r.issues.find((i) => i.code === 'DERIVED_TERM_UNSUPPORTED')!.message)!)).toBe(true);
    const l = legacy([dispositorText]);
    expect(l.errors).not.toContain('DERIVED_TERM_UNSUPPORTED');
    expect(l.warnings).toContain('DERIVED_TERM_UNSUPPORTED');
    for (const s of [
      'शनि आपकी कुंडली का योगकारक है।',
      'आपका सूर्य वर्गोत्तम है।',
      'यह साढ़े साती का समय है।',
      'मंगल एक केंद्र भाव में स्थित है।',
      'गुरु त्रिकोण का स्वामी है।',
      'सूर्य और बुध के बीच परिवर्तन योग है।',
    ]) expect(interp([s]).errors, s).toContain('DERIVED_TERM_UNSUPPORTED');
  });

  it('accepts a derived term backed by a cited fact, and ordinary words that only look like one', () => {
    expect(interp([dispositorText], [{ statement: "Mars's dispositor is Mercury", evidenceIds: ['career.dispositor.mars'] }]).errors).not.toContain('DERIVED_TERM_UNSUPPORTED');
    for (const s of [
      'आपका काम आपके ध्यान का केंद्र बना रहता है।', // "केंद्र" = centre
      'शनि का राशि परिवर्तन एक नई गति लाता है।', // a sign change, not an exchange
      'आपका परिश्रम आपकी दिशा बदलता है।',
    ]) expect(interp([s]).issues.map((i) => i.code), s).not.toContain('DERIVED_TERM_UNSUPPORTED');
  });
});

describe('INVENTED_RULE_PHRASING in Hindi (V6, warning)', () => {
  it('flags a general rule stated in Hindi', () => {
    for (const s of [
      'दशमेश का बारहवें भाव में होना सामान्यतः विदेश में काम की माँग का संकेत देता है।',
      'शास्त्रीय नियम है कि दशमेश को केंद्र में होना चाहिए।',
      'आमतौर पर ऐसी स्थिति का अर्थ देर से मिलने वाली पहचान होता है।',
    ]) {
      const issue = legacy([s]).issues.find((i) => i.code === 'INVENTED_RULE_PHRASING');
      expect(issue?.severity, s).toBe('warning');
    }
  });

  it('does not flag ordinary Hindi', () => {
    for (const s of ['आप सुबह के समय बेहतर काम करते हैं।', 'नियमित अभ्यास आपके काम को निखारता है।']) {
      expect(legacy([s]).warnings, s).not.toContain('INVENTED_RULE_PHRASING');
    }
  });
});

describe('ABSENCE_PRESENTED_AS_ADVANTAGE in Hindi', () => {
  it('REJECTS positive spin on an empty or unaspected house (error when opted in, warning for legacy)', () => {
    const text = 'आपका छठा भाव खाली है, जो आपके रोज़ के काम को एक सुखद सरलता देता है।';
    const r = interp([text]);
    expect(r.errors).toContain('ABSENCE_PRESENTED_AS_ADVANTAGE');
    expect(text.startsWith(quotedSentence(r.issues.find((i) => i.code === 'ABSENCE_PRESENTED_AS_ADVANTAGE')!.message)!)).toBe(true);
    expect(legacy([text]).warnings).toContain('ABSENCE_PRESENTED_AS_ADVANTAGE');
    for (const s of [
      'सप्तम भाव में कोई ग्रह नहीं है, इसलिए साझेदारी टकराव से मुक्त रहती है।',
      'इस भाव पर कोई दृष्टि नहीं है, जो इसे सुरक्षित रखता है।',
      'रिक्त भाव होना आपके लिए एक लाभ है।',
    ]) expect(interp([s]).errors, s).toContain('ABSENCE_PRESENTED_AS_ADVANTAGE');
  });

  it('accepts a plain description of an empty house and a denied classification', () => {
    for (const s of [
      'आपका छठा भाव खाली है, इसलिए इसकी राशि और इसका स्वामी इसके विषयों को दिशा देते हैं।',
      'ज्योतिष खाली भाव को लाभ या सुरक्षा के रूप में नहीं देखता; वह ध्यान उसके स्वामी की ओर ले जाता है।',
      'आपका लाभ भाव खाली है, इसलिए उसका स्वामी उसकी कहानी कहता है।', // "लाभ भाव" is the 11th house
    ]) {
      const r = interp([s]);
      expect(r.errors, s).not.toContain('ABSENCE_PRESENTED_AS_ADVANTAGE');
      expect(r.errors, s).not.toContain('UNSUPPORTED_JUDGEMENT');
    }
  });
});

describe('LIFE_STAGE_MISMATCH in Hindi (native aged 22)', () => {
  it('REJECTS seniority framing when opted in; warns for legacy topics that see the life stage', () => {
    for (const s of [
      'अपने स्वाभाविक अधिकार को बोर्ड स्तर की रणनीति में लगाइए।',
      'सेवानिवृत्ति के बाद की योजना अभी से बनाइए।',
      'कनिष्ठ सहकर्मियों का मार्गदर्शन आपकी पहचान बनेगा।',
    ]) {
      const r = interp([s]);
      expect(r.errors, s).toContain('LIFE_STAGE_MISMATCH');
      expect(s.startsWith(quotedSentence(r.issues.find((i) => i.code === 'LIFE_STAGE_MISMATCH')!.message)!), s).toBe(true);
    }
  });

  it('accepts guidance that fits an early career', () => {
    expect(interp(['अपने काम में धीरे-धीरे ज़िम्मेदारी लेना सीखिए और अनुभवी लोगों से सीखते रहिए।']).errors).toEqual([]);
  });
});

describe('DATE_OUTSIDE_EVIDENCE and AGE_NOT_IN_EVIDENCE in Hindi', () => {
  it('reads Hindi dates', () => {
    expect(extractProseDates('19 नवंबर 2026 से 2029-06-02 तक, और फिर मार्च 2031 में।').map((d) => d.precision)).toEqual(['day', 'day', 'month']);
    expect(extractProseDates('२० नवंबर २०२६ को')[0]).toMatchObject({ from: '2026-11-20', to: '2026-11-20', precision: 'day' });
    expect(extractProseDates('वर्ष 2031 में')[0]).toMatchObject({ precision: 'year', from: '2031-01-01' });
  });

  it('a Hindi date must lie within a dated period of the evidence (error when opted in, warning for legacy)', () => {
    const outside = 'यह समय 2 अक्टूबर 2083 से आपकी पहली कमाई की ओर ले जाता है।';
    expect(interp([outside]).errors).toContain('DATE_OUTSIDE_EVIDENCE');
    const l = legacy([outside]);
    expect(l.errors).not.toContain('DATE_OUTSIDE_EVIDENCE');
    expect(l.warnings).toContain('DATE_OUTSIDE_EVIDENCE');
    const [, start] = reg.resolve(['transit.saturn.*'])[0].value as string[];
    const [y, m, d] = start.split('-').map(Number);
    const month = ['', 'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'][m];
    expect(interp([`${d} ${month} ${y} से अध्ययन की स्थिर गति बनी रहती है।`]).errors).not.toContain('DATE_OUTSIDE_EVIDENCE');
  });

  it('reads ages in Hindi and warns (never errors) when an age is not in the evidence', () => {
    expect(extractHindiProseAges('लगभग उनतीस वर्ष की आयु में, और अभी 22 साल की उम्र में').map((a) => a.age)).toEqual([29, 22]);
    expect(extractHindiProseAges('आयु 24 तक, और 30-वर्षीय जातक').map((a) => a.age)).toEqual([24, 30]);
    expect(extractHindiProseAges('अगले 2 वर्ष के दौरान')).toEqual([]);
    // dasha.ad.03.* (the Jupiter Antardashas) names ages 20 to 36.
    const t = fpTopic(['house.*.d1.*', 'dasha.ad.03.*']);
    const ok = fp(['गुरु–शनि अंतर्दशा लगभग बाईस वर्ष की आयु में शुरू होती है।'], [], t);
    expect(ok.warnings).not.toContain('AGE_NOT_IN_EVIDENCE');
    const drift = fp(['गुरु–शनि अंतर्दशा लगभग इकतालीस वर्ष की आयु में शुरू होती है।'], [], t);
    expect(drift.warnings).toContain('AGE_NOT_IN_EVIDENCE');
    expect(drift.errors).not.toContain('AGE_NOT_IN_EVIDENCE');
  });
});

describe('OVERSTATEMENT and ASHTAKAVARGA_MISDEFINED in Hindi (editorial)', () => {
  const codes = (s: string, opts: { interpretationTopic?: boolean } = {}) => editorial(s, opts).filter((i) => i.severity === 'error').map((i) => i.code);

  it('REJECTS a promise in a predictive sentence; elsewhere it is a legacy warning and an opted-in error', () => {
    for (const s of [
      'वेशि योग हर बातचीत में सूझबूझ सुनिश्चित करता है।',
      'यह योग आपको नेतृत्व की क्षमता प्रदान करता है।',
      'यह दशा निश्चित रूप से पदोन्नति दिलाएगी।',
      'इस गोचर में सफलता अवश्य मिलेगी।',
      'यह योग अटल सफलता का संकेत है।',
      'इस दशा में आपकी उन्नति होकर रहेगी।',
      'यह दशा आपकी पदोन्नति सुनिश्चित करने के लिए आती है।',
    ]) {
      const issue = editorial(s).find((i) => i.code === 'OVERSTATEMENT');
      expect(issue?.severity, s).toBe('error');
      expect(s.startsWith(quotedSentence(issue!.message)!), s).toBe(true);
    }
    const plain = 'आप शांत कमरों में अनायास सम्मान पा लेते हैं।';
    expect(editorial(plain).find((i) => i.code === 'OVERSTATEMENT')?.severity).toBe('warning');
    expect(editorial(plain, { interpretationTopic: true }).find((i) => i.code === 'OVERSTATEMENT')?.severity).toBe('error');
  });

  it('accepts measured Hindi, a denied promise and a purpose clause in advice', () => {
    for (const s of [
      'यह योग नेतृत्व की ओर झुकाव का संकेत देता है।',
      'यह योग किसी परिणाम को सुनिश्चित नहीं करता; यह एक संभावना बताता है।',
      'यह दशा बिना प्रयास के फल नहीं देती।',
      'पारदर्शिता सुनिश्चित करने के लिए अनुबंधों की समय-समय पर समीक्षा करते रहिए।',
      'गुरु की यह दशा सीखने के लिए सहारा दे सकती है।',
    ]) {
      expect(findHindiOverstatement(s), s).toBeNull();
      expect(codes(s, { interpretationTopic: true }), s).not.toContain('OVERSTATEMENT');
    }
  });

  it('REJECTS bindus described as support from transiting planets; accepts the natal definition', () => {
    const bad = 'यहाँ बिंदु वह सहयोग हैं जो भाव को गोचर के ग्रहों से मिलता है।';
    expect(misdefinesAshtakavargaHindi(bad)).toBe(true);
    expect(codes(bad)).toContain('ASHTAKAVARGA_MISDEFINED');
    for (const s of [
      'दसवें भाव में 34 सर्वाष्टकवर्ग बिंदु हैं; ये जन्म कुंडली के अंक हैं, और गोचर करते ग्रह को इसी अंक से परखा जाता है।',
      'बिंदु जन्म कुंडली के अंक हैं, न कि गोचर के ग्रहों से मिला सहयोग।',
    ]) expect(codes(s), s).not.toContain('ASHTAKAVARGA_MISDEFINED');
  });

  it('a denial must negate the term itself: it does not reach across a conjunction or a verb', () => {
    // reported by the daily-horoscope work: the later "नहीं" belongs to another statement
    expect(codes('यह स्थिति एक श्राप की तरह है और कुछ भी ठीक नहीं होगा।')).toContain('FEAR_LANGUAGE');
    expect(codes('इस दशा में सफलता की गारंटी है लेकिन मेहनत कम नहीं होगी।')).toContain('GUARANTEE');
    expect(codes('यह योग निश्चित रूप से धन देगा क्योंकि बाधा नहीं है।')).toContain('OVERSTATEMENT');
    expect(deniedInHindiClause('यह स्थिति एक श्राप की तरह है और कुछ भी ठीक नहीं होगा।', 13, 5)).toBe(false);
    for (const s of [
      'साढ़े साती कोई श्राप नहीं है, यह धैर्य सीखने का समय है।',
      'कुंडली किसी परिणाम की गारंटी नहीं देती; वह झुकाव बताती है।',
      'यह श्राप के बजाय सीखने का अवसर है।',
      'इसे श्राप जैसा कुछ नहीं समझना चाहिए।',
      'यह सीखने का समय है, न कि कोई श्राप।',
    ]) expect(codes(s), s).toEqual([]);
  });

  it('blocks a leaked sample identity in Hindi', () => {
    expect(codes('बुलंदशहर में जन्मे जातक की यह कुंडली है।')).toContain('REFERENCE_IDENTITY_LEAK');
    expect(codes('आपकी कुंडली आपके अपने जन्म-स्थान से बनी है।')).not.toContain('REFERENCE_IDENTITY_LEAK');
  });
});

describe('near-duplicate repetition in Hindi', () => {
  const a = payload('ten', ['आपका दशमेश मंगल बारहवें भाव में बैठा है, जो आपके करियर को पर्दे के पीछे के शोध कार्य की ओर ले जाता है।'], []);
  const b = payload('six', ['दशमेश मंगल के बारहवें भाव में बैठे होने से आपका करियर पर्दे के पीछे के शोध कार्यों की ओर ले जाता है।'], []);
  const c = payload('eleven', ['ग्यारहवें भाव में अपनी राशि का शुक्र आपकी आय को रचनात्मक मित्र-मंडली और संबंधों से जोड़ता है।'], []);

  it('detects a Hindi paraphrase across topics (inflected forms count as the same word) but not unrelated sentences', () => {
    const d = findNearDuplicates([a, b, c]);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ topicId: 'six', otherTopicId: 'ten' });
    expect(findNearDuplicates([a, c])).toEqual([]);
    expect(sentenceSimilarity('भावों में ग्रह बैठे हैं।', 'भाव में ग्रह बैठा है।').unigram).toBe(1);
  });
});

describe('sentence repair works on Hindi errors', () => {
  it('removes exactly the rejected Hindi sentence and the topic then passes', () => {
    const good = 'शनि बारहवें भाव में है, इसलिए एकांत में किया गया अध्ययन आपके काम को गहराई देता है।';
    const bad = 'आपका दसवाँ भाव बहुत मजबूत और अनुकूल है।';
    const t = interpTopic();
    const p = payload('tenth-house-interp', [`${good} ${bad}`], [signClaim(10)]);
    const first = run(t, p);
    const errors = first.issues.filter((i) => i.severity === 'error');
    expect(errors.map((i) => i.code)).toEqual(['UNSUPPORTED_JUDGEMENT']);
    expect(isRepairable(first.issues)).toBe(true);
    const step = repairOnce(p, first.validation, first.issues)!;
    expect(step.removedSentences).toEqual([bad]);
    expect(step.payload.paragraphs).toEqual([good]);
    expect(run(t, step.payload).errors).toEqual([]);
  });
});

describe('prompts: Hindi guidance is added to Hindi prompts only', () => {
  const def = (language: 'en' | 'hi') => ({
    id: 'career', reportType: 'CAREER', additionalReportTypes: [], specVersion: '1.0.0', title: 'Career', subtitle: 'Test', description: 'd',
    referenceFiles: [], requires: { birthTime: true, partner: false, vargas: ['D1', 'D9'], transitYears: 2 }, language,
    theme: { primary: '000000', accent: '000000', tint: '000000' }, writingGuidance: ['Be measured.'],
    sections: [{ id: 's', title: 'S', kicker: 'k', topics: [legacyTopic()] }],
  }) as ReportDefinition;

  it('an English prompt has no Hindi text; a Hindi prompt names the words the validators recognise', () => {
    const opted = interpTopic();
    const evidence = reg.resolve(allowedFor(opted));
    const views = reg.resolve(['interp.career.*']).map((i) => interpretationView(i));
    const input = { sectionTitle: 'S', topics: [{ topic: opted, evidence, interpretations: views }], priorSummaries: [], feedback: [] };
    const en = buildBatchPrompt({ definition: def('en'), ...input });
    expect(en).not.toContain('HINDI');
    expect(en).not.toMatch(/मिश्रित|चुनौतीपूर्ण|राशि स्वामी/);
    const hi = buildBatchPrompt({ definition: def('hi'), ...input });
    expect(hi).toContain('HINDI WORDING (checked on your Hindi prose');
    expect(hi).toContain('HINDI WORDING FOR TOPICS WITH AN INTERPRETATIONS BLOCK');
    for (const w of ['मिश्रित', 'चुनौतीपूर्ण', 'समर्थित', 'तटस्थ', 'दुःस्थान', 'राशि स्वामी', 'गजकेसरी योग']) expect(hi, w).toContain(w);
    // Without the Hindi lines the two prompts are the same text: nothing else changed.
    const strip = (p: string) => p.split('\n\n').filter((block) => !/^(LANGUAGE:|HINDI )/.test(block)).join('\n\n');
    expect(strip(hi)).toBe(en);
    // A Hindi prompt without interpretation topics does not carry the interpretation wording.
    const legacyHi = buildBatchPrompt({ definition: def('hi'), sectionTitle: 'S', topics: [{ topic: legacyTopic(), evidence }], priorSummaries: [], feedback: [] });
    expect(legacyHi).toContain('HINDI WORDING (checked');
    expect(legacyHi).not.toContain('HINDI WORDING FOR TOPICS WITH AN INTERPRETATIONS BLOCK');
  });
});
