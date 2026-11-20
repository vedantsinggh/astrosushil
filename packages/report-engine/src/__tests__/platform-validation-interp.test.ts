/**
 * Narration & validation for interpretation topics (proposal §5 V1–V6; report audit
 * F2, F8–F11, F20; calculation audit A1). No network, no paid API.
 *
 * Golden subject (user decision 2026-11-20): 08 Jun 2004 08:30 IST, Akbarpur
 * (Ambedkar Nagar) 26.4295 N, 82.5343 E. Cancer Lagna, Moon in Aquarius; on
 * 2026-11-20 Saturn transits Pisces = the 9th from the Ascendant and the 2nd
 * from the Moon (report audit, verified independently of this code).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { AiGenerationOptions, AiGenerationResult } from '@astro/prediction-engine';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';
import { AddEvidence, EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { GeneratedTopicPayload, ReportDefinition, ReportTopic, ReportTopicSchema } from '../platform/contracts';
import { checkTransitAssertion, extractTransitAssertions, validateGeneratedTopic } from '../platform/validation/claim-validator';
import {
  findCrossTopicRepetition,
  findNearDuplicates,
  findNearDuplicatesAgainst,
  validateEditorial,
} from '../platform/validation/editorial-validator';
import { extractProseDates, interpretationView, validateInterpretationTopic } from '../platform/validation/interpretation-validator';
import { findJudgementTerms } from '../platform/validation/judgement-lexicon';
import { buildTrace } from '../platform/validation/trace';
import { topicCacheKey, InMemoryTopicCacheStore } from '../platform/llm/topic-cache';
import { DEFAULT_INTERPRETATION_TEMPERATURE, DEFAULT_INTERPRETATION_MAX_OUTPUT_TOKENS, DEFAULT_NARRATOR_CONFIG, LlmNarrator } from '../platform/llm/narrator';
import { OfflineTestProvider } from '../platform/llm/offline-test-provider';
import { buildBatchPrompt, GLOSSARY, INTERPRETATION_PROMPT_VERSION, PROMPT_VERSION } from '../platform/llm/prompts';

const AS_OF = new Date('2026-11-20T06:00:00Z');
const GOLDEN: SubjectInput = {
  name: 'Golden Subject', gender: 'female', dateOfBirth: '2004-06-08', timeOfBirth: '08:30', placeName: 'Akbarpur',
  latitude: 26.4295, longitude: 82.5343, timezone: 'Asia/Kolkata',
};

const MIXED_ID = 'interp.career.house-10.lord-placement';
const SUPPORTED_ID = 'interp.career.house-6.sav';
const MIXED_LABEL =
  'The 10th lord Mars is placed in the 12th house [mixed; natal; MIXED_INDICATORS, PROVISIONAL_RULE] — because Mars owns the 10th and 5th but sits in a dusthana';
const SUPPORTED_LABEL = 'The 6th house holds above-average bindus [supported; natal; PROVISIONAL_CONVENTION] — because its SAV of 33 is above 28';

/** Test-only contributor: interpretation results as A5 registers them (A1 contract), plus two facts. */
const contributor = (add: AddEvidence) => {
  add(MIXED_ID, 'interpretation', MIXED_LABEL, 'TENTH_LORD_IN_DUSTHANA', 'interpretation:INT-H-001,CRP-002');
  add(SUPPORTED_ID, 'interpretation', SUPPORTED_LABEL, 'SAV_ABOVE_AVERAGE', 'interpretation:INT-S-003');
  add('career.dispositor.mars', 'planet-dispositor', "Mars's dispositor is Mercury (lord of Gemini)", 'Mercury', 'test');
  add('native.life-stage', 'life-stage', 'The native is 22 years old (early career)', 22, 'test');
};

let snap: ChartSnapshot;
let reg: EvidenceRegistry;
beforeAll(async () => {
  snap = await buildChartSnapshot(GOLDEN, { asOf: AS_OF, vargas: ['D1', 'D9'], transitYears: 2 });
  reg = new EvidenceRegistry(snap, { contributors: [(add) => contributor(add)] });
}, 60000);

type InterpTopic = ReportTopic & { interpretations: string[] };
function legacyTopic(id = 'tenth-house', extra: Partial<ReportTopic> = {}): ReportTopic {
  return {
    ...ReportTopicSchema.parse({
      id, title: 'Tenth house', kind: 'narrative', objective: 'x',
      requiredEvidence: ['house.10.d1.sign'], optionalEvidence: ['house.10.d1.*', 'planet.*.d1.*', 'transit.*', 'sav.*', 'career.dispositor.*'],
    }),
    ...extra,
  };
}
function interpTopic(patterns: string[] = ['interp.career.*'], id = 'tenth-house-interp'): InterpTopic {
  return { ...legacyTopic(id), optionalEvidence: [...legacyTopic().optionalEvidence, 'native.life-stage'], interpretations: patterns };
}
const allowedFor = (t: ReportTopic) => [...t.requiredEvidence, ...t.optionalEvidence, ...((t as Partial<InterpTopic>).interpretations ?? [])];

function payload(topicId: string, paragraphs: string[], claims: GeneratedTopicPayload['claims'], extra: Partial<GeneratedTopicPayload> = {}): GeneratedTopicPayload {
  return { topicId, lead: 'Your career house in context.', paragraphs, bullets: [], claims, ...extra };
}

function run(t: ReportTopic, p: GeneratedTopicPayload) {
  const allowed = allowedFor(t);
  const validation = validateGeneratedTopic(t, p, reg, { expectedSnapshotId: reg.snapshotId, allowedEvidence: allowed });
  const extra = validateInterpretationTopic(t, p, reg, validation, { allowedEvidence: allowed });
  const editorial = validateEditorial(p, { interpretationTopic: (t as Partial<InterpTopic>).interpretations !== undefined });
  const all = [...validation.issues, ...extra, ...editorial];
  return { validation, issues: all, errors: all.filter((i) => i.severity === 'error').map((i) => i.code), warnings: all.filter((i) => i.severity === 'warning').map((i) => i.code) };
}

const ascClaim = () => ({ statement: `The 10th house is ${String(reg.get('house.10.d1.sign')!.value)}`, evidenceIds: ['house.10.d1.sign'] });

describe('golden chart facts used by these tests', () => {
  it('Cancer Lagna, Moon in Aquarius, Saturn currently in Pisces', () => {
    expect(reg.get('asc.d1.sign')!.value).toBe('Cancer');
    expect(reg.get('planet.moon.d1.sign')!.value).toBe('Aquarius');
    expect(reg.get('planet.saturn.d1.house')!.value).toBe(12);
    const saturnNow = reg.resolve(['transit.saturn.*']).find((i) => {
      const v = i.value as string[];
      return v[1] <= '2026-11-20' && '2026-11-20' < v[2];
    });
    expect(saturnNow?.value).toEqual(expect.arrayContaining(['Pisces', '9', '2']));
  });
});

describe('V3 transit assertions (all topics)', () => {
  it('REJECTS "Saturn transits through your 12th house" (Saturn transits Pisces = 9th)', () => {
    const golden = 'Embrace periods of independent research and quiet study while Saturn transits through your 12th house.';
    const r = run(legacyTopic(), payload('tenth-house', [golden], [ascClaim(), { statement: 'Saturn transits through your 12th house', evidenceIds: ['transit.saturn.01'] }]));
    expect(r.errors).toContain('NARRATIVE_CONTRADICTS_TRANSIT');
    expect(r.validation.claims[1].status).toBe('rejected');
    expect(r.validation.claims[1].reasons.join()).toMatch(/CONTRADICTS_TRANSIT/);
    expect(r.validation.passed).toBe(false);
  });

  it('rejects a wrong current sign and a wrong house from the Moon', () => {
    const errs = (text: string) => extractTransitAssertions(text).map((a) => checkTransitAssertion(a, reg)).filter(Boolean);
    expect(errs('Saturn is transiting Gemini right now.')).toHaveLength(1);
    expect(errs('Saturn transits the 12th house from the Moon.')).toHaveLength(1);
    expect(errs("Saturn's transit through your 12th house asks for patience.")).toHaveLength(1);
  });

  it('accepts correct transit statements and does not check what it cannot confirm', () => {
    const errs = (text: string) => extractTransitAssertions(text).map((a) => checkTransitAssertion(a, reg)).filter(Boolean);
    expect(errs('Saturn currently transits Pisces, your 9th house.')).toHaveLength(0);
    expect(errs('Saturn transits your 9th house.')).toHaveLength(0);
    expect(errs('Saturn transits the 2nd house from the Moon.')).toHaveLength(0);
    // Past, hypothetical, natal-only and out-of-horizon statements are not transit assertions to refute.
    expect(errs('Saturn transited your 12th house years ago.')).toHaveLength(0);
    expect(errs('If Saturn transits your 12th house, rest matters.')).toHaveLength(0);
    expect(errs('Natal Saturn sits in your 12th house.')).toHaveLength(0);
    expect(errs('Saturn transits Sagittarius from 1999 to 2002.')).toHaveLength(0);
    // Mars has no computed transit periods in this registry: nothing to check against.
    expect(errs('Mars transits your 3rd house.')).toHaveLength(0);
    const ok = run(legacyTopic(), payload('tenth-house', ['Saturn currently transits Pisces, the 9th house from your Ascendant, a steady background for study.'], [ascClaim()]));
    expect(ok.errors).not.toContain('NARRATIVE_CONTRADICTS_TRANSIT');
  });
});

describe('editorial: SAV definition and overstatement', () => {
  it('REJECTS "bindus represent support from all transiting planets"', () => {
    const p = payload('tenth-house', ['Here the bindus represent units of energetic support that a house receives from all transiting planets.'], [ascClaim()]);
    expect(validateEditorial(p).filter((i) => i.severity === 'error').map((i) => i.code)).toContain('ASHTAKAVARGA_MISDEFINED');
  });

  it('accepts the canonical SAV wording', () => {
    const p = payload('tenth-house', ['The 10th house holds 34 Sarvashtakavarga bindus, natal points from the eight contributors; a transiting planet is judged by this score.'], [ascClaim()]);
    expect(validateEditorial(p).map((i) => i.code)).not.toContain('ASHTAKAVARGA_MISDEFINED');
  });

  it('REJECTS "Vesi Yoga ensures…" in any topic; non-predictive overstatement is a legacy warning', () => {
    const yoga = payload('tenth-house', ['Vesi Yoga ensures calculated resourcefulness in every negotiation you lead.'], [ascClaim()]);
    expect(validateEditorial(yoga).find((i) => i.code === 'OVERSTATEMENT')?.severity).toBe('error');
    const plain = payload('tenth-house', ['You command respect effortlessly in quiet rooms and small teams alike.'], [ascClaim()]);
    expect(validateEditorial(plain).find((i) => i.code === 'OVERSTATEMENT')?.severity).toBe('warning');
    expect(validateEditorial(plain, { interpretationTopic: true }).find((i) => i.code === 'OVERSTATEMENT')?.severity).toBe('error');
    for (const w of ['grants', 'endows', 'guarantees', 'assured', 'unshakeable', 'destined', 'certainly will']) {
      const p = payload('tenth-house', [`This yoga ${w} a lasting outcome for your working life and its direction.`], [ascClaim()]);
      expect(validateEditorial(p).some((i) => (i.code === 'OVERSTATEMENT' || i.code === 'GUARANTEE') && i.severity === 'error'), w).toBe(true);
    }
  });
});

describe('V1/V2 judgement lexicon and mixed honesty (opted-in topics)', () => {
  it('reads class, timing and rules from the registry label', () => {
    const v = interpretationView(reg.get(MIXED_ID)!);
    expect(v.strengthClass).toBe('mixed');
    expect(v.timing).toBe('natal');
    expect(v.ruleIds).toEqual(['INT-H-001', 'CRP-002']);
    expect(findJudgementTerms('Mars is not especially strong here')).toEqual([]);
  });

  it('REJECTS "exceptionally strong" citing a mixed interpretation', () => {
    const s = 'The 10th lord Mars placed in the 12th house is exceptionally strong for your career.';
    const r = run(interpTopic(), payload('tenth-house-interp', [s], [ascClaim(), { statement: s, evidenceIds: [MIXED_ID] }]));
    expect(r.validation.claims[1].status).toBe('verified');
    expect(r.errors).toEqual(expect.arrayContaining(['JUDGEMENT_CLASS_MISMATCH', 'MIXED_RESULT_OVERSTATED', 'MIXED_RESULT_NOT_ACKNOWLEDGED']));
  });

  it('REJECTS an evaluative sentence that is not backed by an interp claim', () => {
    const r = run(interpTopic(), payload('tenth-house-interp', ['Your 10th house is remarkably strong and favourable.'], [ascClaim()]));
    expect(r.errors).toContain('UNSUPPORTED_JUDGEMENT');
  });

  it('REJECTS an interp claim that does not restate the conclusion', () => {
    const r = run(interpTopic(), payload('tenth-house-interp', ['Career themes evolve.'], [ascClaim(), { statement: 'Career themes evolve', evidenceIds: [MIXED_ID] }]));
    expect(r.errors).toContain('INTERPRETATION_CLAIM_UNVERIFIABLE');
  });

  it('accepts an honest mixed sentence and a supported judgement', () => {
    const mixed = 'The 10th lord Mars is placed in the 12th house, a mixed picture: it favours research but works against public visibility.';
    const sav = 'The 6th house holds above-average bindus, a supportive sign for steady service work.';
    const r = run(
      interpTopic(),
      payload('tenth-house-interp', [`${mixed} ${sav}`], [
        ascClaim(),
        { statement: mixed, evidenceIds: [MIXED_ID] },
        { statement: sav, evidenceIds: [SUPPORTED_ID] },
      ])
    );
    expect(r.errors).toEqual([]);
  });

  it('V5: an exactly named interpretation must be cited', () => {
    const r = run(interpTopic([MIXED_ID]), payload('tenth-house-interp', ['Your 10th house sign sets the tone of your public work.'], [ascClaim()]));
    expect(r.errors).toContain('REQUIRED_INTERPRETATION_NOT_CITED');
  });
});

describe('V4 derived terms, V6 rule phrasing, absence spin, life stage, dates', () => {
  const dispositorText = 'Its dispositor Mercury quietly shapes how the 10th lord expresses itself at work.';

  it('REJECTS "dispositor" without a cited fact (opted-in); warns for legacy', () => {
    expect(run(interpTopic(), payload('tenth-house-interp', [dispositorText], [ascClaim()])).errors).toContain('DERIVED_TERM_UNSUPPORTED');
    const legacy = run(legacyTopic(), payload('tenth-house', [dispositorText], [ascClaim()]));
    expect(legacy.errors).not.toContain('DERIVED_TERM_UNSUPPORTED');
    expect(legacy.warnings).toContain('DERIVED_TERM_UNSUPPORTED');
  });

  it('accepts "dispositor" backed by a cited dispositor fact', () => {
    const r = run(interpTopic(), payload('tenth-house-interp', [dispositorText], [ascClaim(), { statement: "Mars's dispositor is Mercury", evidenceIds: ['career.dispositor.mars'] }]));
    expect(r.errors).not.toContain('DERIVED_TERM_UNSUPPORTED');
  });

  it('flags invented-rule phrasing (warning)', () => {
    const r = run(legacyTopic(), payload('tenth-house', ['A 10th lord in the 12th generally requires work abroad before recognition.'], [ascClaim()]));
    expect(r.warnings).toContain('INVENTED_RULE_PHRASING');
  });

  it('positive spin on an empty house: error when opted in, warning for legacy', () => {
    const text = 'Your 6th house is empty, which gives your daily work a welcome operational simplicity.';
    expect(run(interpTopic(), payload('tenth-house-interp', [text], [ascClaim()])).errors).toContain('ABSENCE_PRESENTED_AS_ADVANTAGE');
    expect(run(legacyTopic(), payload('tenth-house', [text], [ascClaim()])).warnings).toContain('ABSENCE_PRESENTED_AS_ADVANTAGE');
  });

  it('TOO_SHORT is only a warning for a factual-absence topic', () => {
    const empty = reg.resolve(['house.*.d1.occupants']).find((i) => Array.isArray(i.value) && i.value.length === 0)!;
    const n = empty.id.split('.')[1];
    const t = { ...legacyTopic('empty-house'), requiredEvidence: [empty.id], optionalEvidence: [], depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 } };
    const p = payload('empty-house', [`The ${n}th house holds no planets, so its sign and lord carry its themes.`], [{ statement: `The house has no occupants`, evidenceIds: [empty.id] }]);
    const res = validateGeneratedTopic(t, p, reg, { expectedSnapshotId: reg.snapshotId, allowedEvidence: [empty.id] });
    expect(res.issues.find((i) => i.code === 'TOO_SHORT')?.severity).toBe('warning');
    const full = { ...legacyTopic(), depth: { minParagraphs: 2, maxParagraphs: 3, bullets: 0 } };
    const res2 = validateGeneratedTopic(full, payload('tenth-house', ['One paragraph only about the tenth house and its sign.'], [ascClaim()]), reg, { expectedSnapshotId: reg.snapshotId, allowedEvidence: allowedFor(full) });
    expect(res2.issues.find((i) => i.code === 'TOO_SHORT')?.severity).toBe('error');
  });

  it('life stage: seniority framing for a 22-year-old is rejected when opted in', () => {
    const r = run(interpTopic(), payload('tenth-house-interp', ['Apply your natural authority to board-level strategy and governance.'], [ascClaim()]));
    expect(r.errors).toContain('LIFE_STAGE_MISMATCH');
  });

  it('dates must lie within a dated period of the evidence', () => {
    expect(extractProseDates('From 19 Nov 2026 to 2029-06-02, and again in March 2031.').map((d) => d.precision)).toEqual(['day', 'day', 'month']);
    const saturn = reg.resolve(['transit.saturn.*'])[0].value as string[];
    const inside = run(interpTopic(), payload('tenth-house-interp', [`From ${saturn[1]} the steady pace of study continues.`], [ascClaim()]));
    expect(inside.errors).not.toContain('DATE_OUTSIDE_EVIDENCE');
    const outside = run(interpTopic(), payload('tenth-house-interp', ['The period from 2083-10-02 brings your first earnings.'], [ascClaim()]));
    expect(outside.errors).toContain('DATE_OUTSIDE_EVIDENCE');
    const legacyOutside = run(legacyTopic(), payload('tenth-house', ['The period from 2083-10-02 brings your first earnings.'], [ascClaim()]));
    expect(legacyOutside.errors).not.toContain('DATE_OUTSIDE_EVIDENCE');
    expect(legacyOutside.warnings).toContain('DATE_OUTSIDE_EVIDENCE');
  });
});

describe('near-duplicate repetition (deterministic)', () => {
  const a = payload('ten', ['Your 10th lord Mars sits in the 12th house, pointing your career towards behind-the-scenes research work.'], []);
  const b = payload('six', ['With your 10th lord Mars sitting in the 12th house, your career points towards behind-the-scenes research work.'], []);
  const c = payload('eleven', ['Venus in its own sign in the 11th house links your gains to creative networks and friendships.'], []);

  it('detects a paraphrase across topics but not unrelated sentences', () => {
    const d = findNearDuplicates([a, b, c]);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ topicId: 'six', otherTopicId: 'ten' });
    expect(findNearDuplicates([a, c])).toEqual([]);
    expect(findNearDuplicates([a, b, c])).toEqual(findNearDuplicates([a, b, c])); // deterministic
  });

  it('report-level repetition keeps exact matches and adds near duplicates (legacy warning shape)', () => {
    const groups = findCrossTopicRepetition([a, b, c]);
    expect(groups).toHaveLength(1);
    expect(groups[0].topics.sort()).toEqual(['six', 'ten']);
    const exact = payload('dup', [a.paragraphs[0]], []);
    expect(findCrossTopicRepetition([a, exact]).some((g) => g.topics.includes('dup'))).toBe(true);
  });

  it('is an error for an opted-in topic in the narrator', async () => {
    const t = interpTopic(['interp.career.*'], 'six');
    const provider = new OfflineTestProvider((json) => {
      for (const topic of json.topics) topic.paragraphs = [b.paragraphs[0]];
    });
    const narrator = new LlmNarrator(provider, new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test', maxAttempts: 1, maxTransportRetries: 0 });
    const out = await narrator.generateBatch({ definition: DEF, registry: reg, subjectRef: snap.subjectRef, topics: [t], sectionTitle: 'S', priorSummaries: [], priorPayloads: [a] });
    expect(out[0].validation?.issues.map((i) => i.code)).toContain('NEAR_DUPLICATE_ACROSS_TOPICS');
    expect(findNearDuplicatesAgainst(b, [a])).toHaveLength(1);
  });
});

const DEF = {
  id: 'career', reportType: 'CAREER', additionalReportTypes: [], specVersion: '1.0.0', title: 'Career', subtitle: 'Test', description: 'd',
  referenceFiles: [], requires: { birthTime: true, partner: false, vargas: ['D1', 'D9'], transitYears: 2 }, language: 'en',
  theme: { primary: '000000', accent: '000000', tint: '000000' }, writingGuidance: ['Be measured.'],
  sections: [{ id: 's', title: 'S', kicker: 'k', topics: [legacyTopic()] }],
} as ReportDefinition;

class RecordingProvider extends OfflineTestProvider {
  public temperatures: Array<number | undefined> = [];
  public prompts: string[] = [];
  public maxTokens: Array<number | undefined> = [];
  override async generate(prompt: string, options?: AiGenerationOptions): Promise<AiGenerationResult> {
    this.temperatures.push(options?.temperature);
    this.maxTokens.push(options?.maxTokens);
    this.prompts.push(prompt);
    return super.generate(prompt, options);
  }
}

/** The buildBatchPrompt topic block exactly as it was before interpretations existed (regression reference). */
function legacyPromptReference(topics: Array<{ topic: ReportTopic; evidence: ReturnType<EvidenceRegistry['resolve']> }>): string {
  const lines: string[] = [];
  lines.push(`REPORT: ${DEF.title} — ${DEF.subtitle}`);
  lines.push(`REPORT-SPECIFIC GUIDANCE:\n${DEF.writingGuidance.map((g) => `- ${g}`).join('\n')}`);
  lines.push('SECTION: S');
  for (const { topic, evidence } of topics) {
    lines.push(
      [`\n=== TOPIC topicId="${topic.id}" ===`, `Title: ${topic.title}`, `Objective: ${topic.objective}`, 'Length: 2-3 paragraphs. Include at least 2 claims.', 'EVIDENCE (cite these IDs exactly):', ...evidence.map((e) => `  [${e.id}] ${e.label}`)].join('\n')
    );
  }
  return lines.join('\n\n');
}

describe('cache keys and prompts: legacy topics unchanged', () => {
  it('a legacy key is byte-identical to the key recorded before this change', () => {
    const parts = {
      snapshotId: 'snap_0123456789abcdef', subjectRef: 'subj_x', definitionId: 'career', specVersion: '1.0.0', topicId: 'tenth-house',
      promptVersion: 'p1.0.0', evidenceFingerprint: 'abcdef0123456789abcdef01', model: 'gemini-3.8-flash', generationConfig: { temperature: 0.55, maxOutputTokens: 16000 },
    };
    const RECORDED = 'tc_ef90f9b1080fb401054bc8977eca71e35b15119b';
    expect(topicCacheKey(parts)).toBe(RECORDED);
    expect(topicCacheKey({ ...parts, interpretationFingerprint: undefined, interpretationPromptVersion: undefined })).toBe(RECORDED);
    expect(topicCacheKey({ ...parts, interpretationFingerprint: 'f', interpretationPromptVersion: INTERPRETATION_PROMPT_VERSION })).not.toBe(RECORDED);
  });

  it('the narrator keys a legacy topic exactly as before, and an opted-in topic with the interpretation parts', async () => {
    const provider = new RecordingProvider();
    const narrator = new LlmNarrator(provider, new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test', maxAttempts: 1, maxTransportRetries: 0 });
    const legacy = legacyTopic();
    const opted = interpTopic();
    const out = await narrator.generateBatch({ definition: DEF, registry: reg, subjectRef: snap.subjectRef, topics: [legacy, opted], sectionTitle: 'S', priorSummaries: [] });
    const legacyEvidence = reg.resolve([...legacy.requiredEvidence, ...legacy.optionalEvidence]);
    const base = {
      snapshotId: reg.snapshotId, subjectRef: snap.subjectRef, definitionId: 'career', specVersion: '1.0.0', promptVersion: PROMPT_VERSION, model: 'offline-test',
    };
    expect(out[0].cacheKey).toBe(
      topicCacheKey({ ...base, topicId: legacy.id, evidenceFingerprint: reg.fingerprint(legacyEvidence), generationConfig: { temperature: DEFAULT_NARRATOR_CONFIG.temperature, maxOutputTokens: DEFAULT_NARRATOR_CONFIG.maxOutputTokens } })
    );
    const optedEvidence = reg.resolve(allowedFor(opted));
    expect(out[1].cacheKey).toBe(
      topicCacheKey({
        ...base, topicId: opted.id, evidenceFingerprint: reg.fingerprint(optedEvidence),
        // Opted-in topics use the larger output cap (golden-run truncation fix, narrator.ts).
        generationConfig: { temperature: DEFAULT_INTERPRETATION_TEMPERATURE, maxOutputTokens: DEFAULT_INTERPRETATION_MAX_OUTPUT_TOKENS },
        interpretationFingerprint: reg.fingerprint(reg.resolve(['interp.career.*'])), interpretationPromptVersion: INTERPRETATION_PROMPT_VERSION,
      })
    );
    // Two groups: the legacy call is unchanged (prompt and temperature), the opted-in call is separate and cooler.
    expect(provider.temperatures).toEqual([DEFAULT_NARRATOR_CONFIG.temperature, DEFAULT_INTERPRETATION_TEMPERATURE]);
    expect(provider.maxTokens).toEqual([DEFAULT_NARRATOR_CONFIG.maxOutputTokens, DEFAULT_INTERPRETATION_MAX_OUTPUT_TOKENS]);
    expect(provider.prompts[0]).toBe(legacyPromptReference([{ topic: legacy, evidence: legacyEvidence }]));
    expect(provider.prompts[0]).not.toMatch(/INTERPRETATIONS|GLOSSARY/);
  });

  it('the opted-in prompt carries the INTERPRETATIONS block, instruction, glossary and life stage', () => {
    const opted = interpTopic();
    const evidence = reg.resolve(allowedFor(opted));
    const views = reg.resolve(['interp.career.*']).map((i) => interpretationView(i));
    const prompt = buildBatchPrompt({ definition: DEF, sectionTitle: 'S', topics: [{ topic: opted, evidence, interpretations: views }], priorSummaries: [], feedback: [] });
    expect(prompt).toContain('INTERPRETATIONS (state these conclusions; do not add others; cite their IDs):');
    expect(prompt).toContain(`[${MIXED_ID}] The 10th lord Mars is placed in the 12th house — mixed — natal — MIXED_INDICATORS, PROVISIONAL_RULE — supported by [none] — contradicted by [none]`);
    expect(prompt).toMatch(/must be backed by a claim that cites an interp\.\* ID/);
    expect(prompt).toContain('APPROVED GLOSSARY');
    expect(prompt).toMatch(/Sarvashtakavarga \(SAV\): the natal total/);
    expect(prompt).toMatch(/NOT support given by transiting planets/);
    expect(prompt).toMatch(/LIFE STAGE: The native is 22 years old/);
    expect(GLOSSARY.map((g) => g.term)).toEqual(expect.arrayContaining(['Yogakaraka', 'Dispositor', 'Vargottama', 'Combust', 'Sade Sati', 'Raja yoga / Dhana yoga', 'Bhinnashtakavarga (BAV)']));
    // interp items are listed only in the INTERPRETATIONS block, not as plain evidence
    const evidenceBlock = prompt.split('INTERPRETATIONS (')[0];
    expect(evidenceBlock).not.toContain(`[${MIXED_ID}]`);
  });
});

describe('trace', () => {
  it('maps statements to evidence, interpretations and rule ids', () => {
    const s = 'The 10th lord Mars is placed in the 12th house, a mixed picture.';
    const p = payload('tenth-house-interp', [s], [ascClaim(), { statement: s, evidenceIds: [MIXED_ID, 'planet.mars.d1.house', 'not.in.registry'] }]);
    const trace = buildTrace(p, reg);
    expect(trace[1]).toEqual({
      statement: s, evidenceIds: [MIXED_ID, 'planet.mars.d1.house'], interpretationIds: [MIXED_ID], ruleIds: ['CRP-002', 'INT-H-001'],
    });
    expect(trace[0].interpretationIds).toEqual([]);
    const validation = validateGeneratedTopic(interpTopic(), p, reg, { expectedSnapshotId: reg.snapshotId, allowedEvidence: allowedFor(interpTopic()) });
    expect(buildTrace(p, reg, validation).map((t) => t.statement)).toEqual([ascClaim().statement]); // the claim citing an unknown id is rejected
  });
});
