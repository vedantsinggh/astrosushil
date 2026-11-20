/**
 * Universal report platform — integrity tests (no network, no paid API).
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { validateGeneratedTopic, extractNatalAssertions } from '../platform/validation/claim-validator';
import { validateEditorial } from '../platform/validation/editorial-validator';
import { topicCacheKey, InMemoryTopicCacheStore } from '../platform/llm/topic-cache';
import { LlmNarrator, DEFAULT_NARRATOR_CONFIG, resolveThinkingLevel } from '../platform/llm/narrator';
import { OfflineTestProvider } from '../platform/llm/offline-test-provider';
import { ReportRegistry } from '../platform/registry';
import { ReportTopicSchema, GeneratedTopicPayload } from '../platform/contracts';

const AS_OF = new Date('2026-11-18T00:00:00Z');
const A: SubjectInput = { name: 'Test Native A', gender: 'female', dateOfBirth: '1994-03-17', timeOfBirth: '06:42', placeName: 'Jaipur', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' };
const B: SubjectInput = { name: 'Test Native B', gender: 'male', dateOfBirth: '1988-11-02', timeOfBirth: '21:10', placeName: 'Pune', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' };

let snapA: ChartSnapshot;
let snapB: ChartSnapshot;
let regA: EvidenceRegistry;
let regB: EvidenceRegistry;

beforeAll(async () => {
  snapA = await buildChartSnapshot(A, { asOf: AS_OF, vargas: ['D1', 'D9'], transitYears: 3 });
  snapB = await buildChartSnapshot(B, { asOf: AS_OF, vargas: ['D1', 'D9'], transitYears: 3 });
  regA = new EvidenceRegistry(snapA);
  regB = new EvidenceRegistry(snapB);
}, 60000);

const topic = ReportTopicSchema.parse({
  id: 'venus-placement', title: 'Venus', kind: 'narrative', objective: 'x',
  requiredEvidence: ['planet.venus.d1.sign', 'planet.venus.d1.house'], optionalEvidence: ['planet.venus.d1.*'],
});
const allowed = [...topic.requiredEvidence, ...topic.optionalEvidence];

function payloadFor(reg: EvidenceRegistry, extra: Partial<GeneratedTopicPayload> = {}): GeneratedTopicPayload {
  const sign = String(reg.get('planet.venus.d1.sign')!.value);
  const house = Number(reg.get('planet.venus.d1.house')!.value);
  return {
    topicId: 'venus-placement',
    lead: 'Venus shapes how you love.',
    paragraphs: [`Your Venus sits in ${sign}, which colours your romantic taste in a distinctive way that rewards patience.`],
    bullets: [],
    claims: [
      { statement: `Venus is in ${sign}`, evidenceIds: ['planet.venus.d1.sign'] },
      { statement: `Venus occupies house number ${house}`, evidenceIds: ['planet.venus.d1.house'] },
    ],
    ...extra,
  };
}

describe('chart snapshot', () => {
  it('is deterministic for identical inputs', async () => {
    const again = await buildChartSnapshot(A, { asOf: AS_OF, vargas: ['D1', 'D9'], transitYears: 3 });
    expect(again.snapshotId).toBe(snapA.snapshotId);
    expect(JSON.stringify(again.natal)).toBe(JSON.stringify(snapA.natal));
    expect(new EvidenceRegistry(again).fingerprint(new EvidenceRegistry(again).all())).toBe(regA.fingerprint(regA.all()));
  });

  it('differs between clients and records provisional conventions', () => {
    expect(snapA.snapshotId).not.toBe(snapB.snapshotId);
    expect(snapA.subjectRef).not.toContain('Test');
    expect(snapA.conventionsProvisional).toBe(true);
    expect(snapA.conventions).toMatchObject({ ayanamsa: 'LAHIRI', houseSystem: 'WHOLE_SIGN', node: 'MEAN_NODE' });
  });

  it('rejects missing birth time when the report needs it, with no default identity', async () => {
    await expect(buildChartSnapshot({ ...A, timeOfBirth: undefined }, { asOf: AS_OF })).rejects.toThrow(/timeOfBirth is required/);
    await expect(buildChartSnapshot({ ...A, name: '' }, { asOf: AS_OF })).rejects.toThrow(/name is required/);
  });
});

describe('evidence registry', () => {
  it('derives every evidence value from the snapshot', () => {
    const venus = snapA.natal.planets.find((p) => p.name === 'VENUS')!;
    expect(regA.get('planet.venus.d1.house')!.value).toBe(venus.house);
    expect(regA.get('planet.venus.d1.sign')!.value).toBe(venus.sign);
    expect(regA.get('asc.d1.sign')!.value).toBe(snapA.natal.ascendant.sign);
    for (const item of regA.all()) expect(item.snapshotId).toBe(snapA.snapshotId);
  });

  it('resolves glob patterns', () => {
    expect(regA.resolve(['planet.*.d1.house'])).toHaveLength(9);
    expect(EvidenceRegistry.matches('planet.venus.d1.sign', ['planet.*.d1.sign'])).toBe(true);
    expect(EvidenceRegistry.matches('planet.venus.d9.sign', ['planet.*.d1.sign'])).toBe(false);
  });
});

describe('claim validation', () => {
  const opts = () => ({ expectedSnapshotId: snapA.snapshotId, allowedEvidence: allowed });

  it('verifies claims whose statements match the canonical values', () => {
    const r = validateGeneratedTopic(topic, payloadFor(regA), regA, opts());
    expect(r.passed).toBe(true);
    expect(r.claims.every((c) => c.status === 'verified')).toBe(true);
    expect(r.verifiedEvidenceIds).toEqual(['planet.venus.d1.house', 'planet.venus.d1.sign']);
  });

  it('rejects fabricated evidence IDs (never copies requested IDs into verified)', () => {
    const p = payloadFor(regA);
    p.claims.push({ statement: 'Venus forms Malavya Yoga', evidenceIds: ['yoga.malavya-fabricated'] });
    const r = validateGeneratedTopic(topic, p, regA, opts());
    expect(r.passed).toBe(false);
    expect(r.claims.find((c) => c.evidenceIds.includes('yoga.malavya-fabricated'))!.status).toBe('rejected');
    expect(r.verifiedEvidenceIds).not.toContain('yoga.malavya-fabricated');
  });

  it('rejects evidence outside the topic scope', () => {
    const p = payloadFor(regA);
    p.claims.push({ statement: `Moon is in ${regA.get('planet.moon.d1.sign')!.value}`, evidenceIds: ['planet.moon.d1.sign'] });
    const r = validateGeneratedTopic(topic, p, regA, opts());
    expect(r.claims.at(-1)!.reasons[0]).toMatch(/OUT_OF_SCOPE/);
    expect(r.passed).toBe(false);
  });

  it('rejects a claim whose statement contradicts the chart even with a valid ID', () => {
    const house = Number(regA.get('planet.venus.d1.house')!.value);
    const wrong = (house % 12) + 1;
    const p = payloadFor(regA);
    p.claims = [{ statement: `Venus is placed in the ${wrong}th house`, evidenceIds: ['planet.venus.d1.house'] }];
    const r = validateGeneratedTopic(topic, p, regA, opts());
    expect(r.claims[0].status).toBe('rejected');
    expect(r.passed).toBe(false);
  });

  it('catches unsupported placements in prose that were not claimed', () => {
    const sign = String(regA.get('planet.mars.d1.sign')!.value);
    const other = sign === 'Aries' ? 'Taurus' : 'Aries';
    const p = payloadFor(regA, { paragraphs: [`Your Mars is placed in ${other}, which adds fire to every relationship you build over time.`] });
    const r = validateGeneratedTopic(topic, p, regA, opts());
    expect(r.issues.some((i) => i.code === 'NARRATIVE_CONTRADICTS_CHART')).toBe(true);
  });

  it('ignores transit and divisional-chart sentences when checking natal facts', () => {
    expect(extractNatalAssertions('When Jupiter transits your 7th house, ties deepen.')).toHaveLength(0);
    expect(extractNatalAssertions('In the Navamsa, Venus is in Aries.')).toHaveLength(0);
    expect(extractNatalAssertions('Venus is in your 5th house.')).toEqual([expect.objectContaining({ planet: 'Venus', house: 5 })]);
  });

  it('does not check annual, divisional or Moon-counted houses against the natal chart', () => {
    for (const t of [
      'Jupiter is placed in the 1st house of the annual chart this year.',
      'In the Varshaphal chart, Saturn sits in the 9th house.',
      'Venus is in the 4th house of the D2 chart.',
      'Saturn is in the 12th house from your Moon.',
      'In the Hora chart, the Sun is in Leo.',
    ]) expect(extractNatalAssertions(t)).toHaveLength(0);
  });

  it('checks partner sentences against the partner chart in two-person reports', async () => {
    const two = new EvidenceRegistry(snapA, { partner: snapB });
    const pSign = String(two.get('partner.planet.venus.d1.sign')!.value);
    const nSign = String(two.get('planet.venus.d1.sign')!.value);
    const ok = validateGeneratedTopic(topic, payloadFor(two, { paragraphs: [`Your partner's Venus is placed in ${pSign}, which shapes how they express affection over time.`] }), two, { expectedSnapshotId: two.snapshotId, allowedEvidence: allowed });
    expect(ok.issues.some((i) => i.code === 'NARRATIVE_CONTRADICTS_CHART')).toBe(false);
    if (pSign !== nSign) {
      const bad = validateGeneratedTopic(topic, payloadFor(two, { paragraphs: [`Your partner's Venus is placed in ${nSign}, which shapes how they express affection over time.`] }), two, { expectedSnapshotId: two.snapshotId, allowedEvidence: allowed });
      expect(bad.issues.some((i) => i.code === 'NARRATIVE_CONTRADICTS_CHART')).toBe(true);
    }
    expect(two.snapshotId).not.toBe(snapA.snapshotId);
  });

  it('accepts a divisional-chart placement only when the topic may cite that chart', async () => {
    const snap10 = await buildChartSnapshot(A, { asOf: AS_OF, vargas: ['D1', 'D10'], transitYears: 3 });
    const reg = new EvidenceRegistry(snap10);
    const planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'sun', 'moon'];
    const p = planets.find((k) => reg.get(`planet.${k}.d10.sign`)!.value !== reg.get(`planet.${k}.d1.sign`)!.value)!;
    expect(p).toBeDefined();
    const name = p.charAt(0).toUpperCase() + p.slice(1);
    const d10Sign = String(reg.get(`planet.${p}.d10.sign`)!.value);
    const d1Sign = String(reg.get(`planet.${p}.d1.sign`)!.value);
    const other = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].find((x) => x !== d10Sign && x !== d1Sign)!;
    const t = ReportTopicSchema.parse({ id: 'd10-topic', title: 'D10', kind: 'narrative', objective: 'x', requiredEvidence: [`planet.${p}.d10.sign`] });
    const make = (sign: string): GeneratedTopicPayload => ({
      topicId: 'd10-topic', lead: 'Your career chart speaks.', bullets: [],
      paragraphs: [`${name} in ${sign} connects your work to a distinctive professional style that grows over time.`],
      claims: [{ statement: `${name} is in ${d10Sign} in the D10 chart`, evidenceIds: [`planet.${p}.d10.sign`] }],
    });
    const scoped = { expectedSnapshotId: snap10.snapshotId, allowedEvidence: [`planet.${p}.d10.sign`] };
    expect(validateGeneratedTopic(t, make(d10Sign), reg, scoped).issues.some((i) => i.code === 'NARRATIVE_CONTRADICTS_CHART')).toBe(false);
    expect(validateGeneratedTopic(t, make(other), reg, scoped).issues.some((i) => i.code === 'NARRATIVE_CONTRADICTS_CHART')).toBe(true);
    const unscoped = { expectedSnapshotId: snap10.snapshotId, allowedEvidence: [`planet.${p}.d1.sign`] };
    const t1 = ReportTopicSchema.parse({ ...t, requiredEvidence: [`planet.${p}.d1.sign`] });
    expect(validateGeneratedTopic(t1, make(d10Sign), reg, unscoped).issues.some((i) => i.code === 'NARRATIVE_CONTRADICTS_CHART')).toBe(true);
  });

  it('rejects cross-client content: client B narrative validated against client A', () => {
    const r = validateGeneratedTopic(topic, payloadFor(regB), regA, opts());
    const differs = regA.get('planet.venus.d1.sign')!.value !== regB.get('planet.venus.d1.sign')!.value
      || regA.get('planet.venus.d1.house')!.value !== regB.get('planet.venus.d1.house')!.value;
    if (differs) expect(r.passed).toBe(false);
    const wrongSnapshot = validateGeneratedTopic(topic, payloadFor(regA), regA, { ...opts(), expectedSnapshotId: snapB.snapshotId });
    expect(wrongSnapshot.passed).toBe(false);
  });
});

describe('editorial safeguards', () => {
  const base = (text: string): GeneratedTopicPayload => ({ topicId: 't', lead: 'A calm opening sentence.', paragraphs: [text], bullets: [], claims: [] });
  it.each([
    ['You suffer from Manglik dosha, which will hurt your marriage.', 'DOSHA_AS_AFFLICTION'],
    ['You will definitely marry in 2027.', 'GUARANTEE'],
    ['Buy a Yellow Sapphire gemstone today for love.', 'REMEDY_SALES'],
    ['As Puneet discovered, Scorpio rising is intense.', 'REFERENCE_IDENTITY_LEAK'],
    ['This placement is cursed and doomed to fail.', 'FEAR_LANGUAGE'],
  ])('blocks: %s', (text, code) => {
    expect(validateEditorial(base(text)).map((i) => i.code)).toContain(code);
  });
  it('allows reassuring negations of fear words but blocks the words themselves', () => {
    const codes = (t: string) => validateEditorial(base(t)).map((i) => i.code);
    expect(codes('This placement is not a curse; it is a call for patient, steady effort over the years.')).not.toContain('FEAR_LANGUAGE');
    expect(codes('Saturn here is never a curse but a disciplined teacher who rewards consistent work.')).not.toContain('FEAR_LANGUAGE');
    expect(codes('This placement is a curse on your career and partnerships for many years ahead.')).toContain('FEAR_LANGUAGE');
    expect(codes('Your efforts are doomed unless you change direction quickly in the coming year.')).toContain('FEAR_LANGUAGE');
  });

  it('allows measured language', () => {
    expect(validateEditorial(base('This placement tends to favour steady, loyal bonds that grow with patience and honest conversation.')).filter((i) => i.severity === 'error')).toHaveLength(0);
  });
});

describe('topic cache identity', () => {
  const parts = {
    snapshotId: 'a'.repeat(32), subjectRef: 'subj_x', definitionId: 'love', specVersion: '1.0.0', topicId: 'venus-placement',
    promptVersion: 'p1', evidenceFingerprint: 'f1', model: 'm1', generationConfig: { temperature: 0.5 },
  };
  it('changes when any identity component changes', () => {
    const k = topicCacheKey(parts);
    for (const [field, value] of Object.entries({ snapshotId: 'b'.repeat(32), subjectRef: 'subj_y', specVersion: '1.0.1', promptVersion: 'p2', evidenceFingerprint: 'f2', model: 'm2', topicId: 'other' })) {
      expect(topicCacheKey({ ...parts, [field]: value })).not.toBe(k);
    }
    expect(topicCacheKey({ ...parts, generationConfig: { temperature: 0.6 } })).not.toBe(k);
  });
});

describe('narrator', () => {
  const def = ReportRegistry.get('love');
  const loveTopic = def.sections.flatMap((s) => s.topics).find((t) => t.id === 'venus-placement')!;

  it('records cache hits as cached (no tokens, original generation id) and never re-calls the model', async () => {
    const provider = new OfflineTestProvider();
    const narrator = new LlmNarrator(provider, new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test' });
    const ctx = { definition: def, registry: regA, subjectRef: snapA.subjectRef, topics: [loveTopic], sectionTitle: 'Venus', priorSummaries: [] };
    const [first] = await narrator.generateBatch(ctx);
    expect(first.status).toBe('generated');
    const [second] = await narrator.generateBatch(ctx);
    expect(second.status).toBe('cached');
    expect(second.sourceGenerationId).toBe(first.sourceGenerationId);
    expect(provider.calls).toBe(1);
    // Client B with the same topic must not hit A's cache.
    const [forB] = await narrator.generateBatch({ ...ctx, registry: regB, subjectRef: snapB.subjectRef });
    expect(forB.status).toBe('generated');
    expect(provider.calls).toBe(2);
  });

  it('fails the topic (no silent fallback) when the model keeps citing fabricated evidence', async () => {
    const provider = new OfflineTestProvider((json) => {
      for (const t of json.topics) (t.claims as Array<{ evidenceIds: string[] }>).forEach((c) => (c.evidenceIds = ['planet.venus.d1.fabricated']));
    });
    const narrator = new LlmNarrator(provider, new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test', maxAttempts: 2 });
    const [o] = await narrator.generateBatch({ definition: def, registry: regA, subjectRef: snapA.subjectRef, topics: [loveTopic], sectionTitle: 'Venus', priorSummaries: [] });
    expect(o.status).toBe('failed');
    expect(o.attempts).toBe(2);
    expect(o.validation!.verifiedEvidenceIds).toHaveLength(0);
  });

  it('retries transient overloads with backoff and then succeeds, recording the model used', async () => {
    const inner = new OfflineTestProvider();
    let failures = 2;
    const flaky = Object.assign(Object.create(inner), {
      providerId: 'offline-test',
      generate: async (prompt: string, o: any) => {
        if (failures-- > 0) throw new Error('GEMINI_API_ERROR: HTTP 503 from Gemini API. high demand');
        return inner.generate(prompt, o);
      },
    });
    const narrator = new LlmNarrator(flaky, new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test', backoffBaseMs: 1, maxTransportRetries: 3 });
    const [o] = await narrator.generateBatch({ definition: def, registry: regA, subjectRef: snapA.subjectRef, topics: [loveTopic], sectionTitle: 'Venus', priorSummaries: [] });
    expect(o.status).toBe('generated');
    expect(o.model).toBe('offline-test');
  });

  it('surfaces exhausted transport retries as a failed topic', async () => {
    const down = Object.assign(Object.create(new OfflineTestProvider()), {
      providerId: 'offline-test',
      generate: async () => { throw new Error('GEMINI_API_ERROR: HTTP 503 from Gemini API.'); },
    });
    const narrator = new LlmNarrator(down, new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test', backoffBaseMs: 1, maxTransportRetries: 2 });
    const [o] = await narrator.generateBatch({ definition: def, registry: regA, subjectRef: snapA.subjectRef, topics: [loveTopic], sectionTitle: 'Venus', priorSummaries: [] });
    expect(o.status).toBe('failed');
    expect(o.payload).toBeUndefined();
    expect(o.error).toMatch(/503/);
  });

  it('forwards the configured thinking level to the provider and omits it when unset', async () => {
    const seen: unknown[] = [];
    const inner = new OfflineTestProvider();
    const spy = Object.assign(Object.create(inner), {
      providerId: 'offline-test',
      generate: async (prompt: string, o: any) => { seen.push(o.thinkingLevel); return inner.generate(prompt, o); },
    });
    const ctx = { definition: def, registry: regA, subjectRef: snapA.subjectRef, topics: [loveTopic], sectionTitle: 'Venus', priorSummaries: [] };
    await new LlmNarrator(spy, new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test', thinkingLevel: 'low' }).generateBatch(ctx);
    await new LlmNarrator(spy, new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test', thinkingLevel: undefined }).generateBatch(ctx);
    expect(seen).toEqual(['low', undefined]);
  });

  it('resolves REPORT_LLM_THINKING_LEVEL (default low, "default" = model default, rejects typos)', () => {
    expect(resolveThinkingLevel(undefined)).toBe('low');
    expect(resolveThinkingLevel(' High ')).toBe('high');
    expect(resolveThinkingLevel('default')).toBeUndefined();
    expect(() => resolveThinkingLevel('lo')).toThrow(/REPORT_LLM_THINKING_LEVEL/);
  });

  it('skips a topic whose required evidence is missing instead of inventing it', async () => {
    const narrator = new LlmNarrator(new OfflineTestProvider(), new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test' });
    const t = ReportTopicSchema.parse({ ...loveTopic, id: 'needs-d60', requiredEvidence: ['planet.venus.d60.sign'] });
    const [o] = await narrator.generateBatch({ definition: def, registry: regA, subjectRef: snapA.subjectRef, topics: [t], sectionTitle: 'X', priorSummaries: [] });
    expect(o.status).toBe('skipped-missing-evidence');
  });
});

describe('report registry', () => {
  it('validates every registered definition and maps it to a ReportType', () => {
    for (const e of ReportRegistry.list()) {
      expect(() => ReportRegistry.validateDefinition(e.definition, e.module)).not.toThrow();
      expect(ReportRegistry.byReportType(e.definition.reportType)?.id).toBe(e.definition.id);
    }
  });
});
