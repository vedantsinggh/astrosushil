/**
 * Cost reporting, cheap-model escalation and report illustrations (no network, no paid API).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import '../platform/index';
import { EvidenceRegistry } from '../platform/evidence/evidence-registry';
import { DEFAULT_NARRATOR_CONFIG, LlmNarrator } from '../platform/llm/narrator';
import { OfflineTestProvider } from '../platform/llm/offline-test-provider';
import { isRepairable, quotedSentence, repairOnce } from '../platform/llm/sentence-repair';
import { InMemoryTopicCacheStore } from '../platform/llm/topic-cache';
import { MODEL_LIST_PRICES, summariseUsage } from '../platform/orchestrator';
import { ReportRegistry } from '../platform/registry';
import { assembleDocument } from '../platform/render/document';
import { coverImageTex, LibraryImage, MAX_PICTURES, planIllustrations, subjectsFor } from '../platform/render/illustrations';
import { buildChartSnapshot, ChartSnapshot, SubjectInput } from '../platform/snapshot/chart-snapshot';

const A: SubjectInput = { name: 'Test Native A', gender: 'female', dateOfBirth: '1994-03-17', timeOfBirth: '06:42', placeName: 'Jaipur', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' };

describe('usage summary', () => {
  const call = (model: string, i: number, o: number, t: number) => ({ model, inputTokens: i, outputTokens: o, thinkingTokens: t, atIso: '2026-11-23T10:00:00.000Z', topics: 1, attempt: 1 });

  it('prices each model at its own list price and bills thinking as output', () => {
    const u = summariseUsage([call('gemini-3.1-flash-lite', 1_000_000, 100_000, 0), call('gemini-3.8-flash', 100_000, 10_000, 10_000)]);
    const lite = MODEL_LIST_PRICES['gemini-3.1-flash-lite'];
    const flash = MODEL_LIST_PRICES['gemini-3.8-flash'];
    expect(u.byModel.map((r) => r.model)).toEqual(['gemini-3.1-flash-lite', 'gemini-3.8-flash']);
    expect(u.byModel[0].estimatedCostUsd).toBeCloseTo(lite.input + 0.1 * lite.output, 4);
    expect(u.byModel[1].estimatedCostUsd).toBeCloseTo(0.1 * flash.input + 0.02 * flash.output, 4);
    expect(u.estimatedCostUsd).toBeCloseTo(u.byModel[0].estimatedCostUsd + u.byModel[1].estimatedCostUsd, 4);
    expect(u.inputTokens).toBe(1_100_000);
    expect(u.thinkingTokens).toBe(10_000);
  });

  it('says so instead of guessing when a model has no known price', () => {
    const u = summariseUsage([call('some-new-model', 1000, 1000, 0)]);
    expect(u.estimatedCostUsd).toBe(0);
    expect(u.costBasis).toMatch(/No list price known for: some-new-model/);
  });

  it('is empty for a fully cached run', () => {
    const u = summariseUsage([]);
    expect(u).toMatchObject({ byModel: [], inputTokens: 0, estimatedCostUsd: 0 });
    expect(u.firstCallAtIso).toBeUndefined();
  });
});

describe('cheap model first, stronger model only on the final attempt', () => {
  let snap: ChartSnapshot;
  let reg: EvidenceRegistry;
  beforeAll(async () => {
    snap = await buildChartSnapshot(A, { asOf: new Date('2026-11-18T00:00:00Z'), vargas: ['D1', 'D9'], transitYears: 3 });
    reg = new EvidenceRegistry(snap);
  }, 60000);

  async function run(badAnswers: number) {
    const def = ReportRegistry.entry('love').definition;
    const topic = def.sections.flatMap((s) => s.topics).find((t) => t.id === 'venus-placement')!;
    const inner = new OfflineTestProvider();
    const seen: Array<{ model: string; thinkingLevel: unknown }> = [];
    let bad = badAnswers;
    const spy = Object.assign(Object.create(inner), {
      providerId: 'offline-test',
      generate: async (prompt: string, o: any) => {
        seen.push({ model: o.model, thinkingLevel: o.thinkingLevel });
        const res = await inner.generate(prompt, o);
        return bad-- > 0 ? { ...res, parsedJson: { topics: 'not-an-array' }, text: '{"topics":"not-an-array"}' } : res;
      },
    });
    const narrator = new LlmNarrator(spy, new InMemoryTopicCacheStore(), {
      ...DEFAULT_NARRATOR_CONFIG, model: 'cheap', retryModel: 'strong', thinkingLevel: 'minimal', retryThinkingLevel: 'low', maxAttempts: 3, fallbackModels: [],
    });
    const [o] = await narrator.generateBatch({ definition: def, registry: reg, subjectRef: snap.subjectRef, topics: [topic], sectionTitle: 'Venus', priorSummaries: [] });
    return { o, seen, narrator };
  }

  it('never calls the stronger model when the cheap one succeeds', async () => {
    const { o, seen, narrator } = await run(0);
    expect(o.status).toBe('generated');
    expect(seen).toEqual([{ model: 'cheap', thinkingLevel: 'minimal' }]);
    expect(narrator.calls.map((c) => c.model)).toEqual(['cheap']);
  });

  it('falls back to low thinking when a model rejects minimal', async () => {
    const def = ReportRegistry.entry('love').definition;
    const topic = def.sections.flatMap((s) => s.topics).find((t) => t.id === 'venus-placement')!;
    const inner = new OfflineTestProvider();
    const levels: unknown[] = [];
    const picky = Object.assign(Object.create(inner), {
      providerId: 'offline-test',
      generate: async (prompt: string, o: any) => {
        levels.push(o.thinkingLevel);
        if (o.thinkingLevel === 'minimal') throw new Error('GEMINI_API_ERROR: HTTP 400 from Gemini API. Thinking level MINIMAL is not supported for this model.');
        return inner.generate(prompt, o);
      },
    });
    const narrator = new LlmNarrator(picky, new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'picky', thinkingLevel: 'minimal', fallbackModels: [], backoffBaseMs: 1 });
    const [o] = await narrator.generateBatch({ definition: def, registry: reg, subjectRef: snap.subjectRef, topics: [topic], sectionTitle: 'Venus', priorSummaries: [] });
    expect(o.status).toBe('generated');
    expect(levels).toEqual(['minimal', 'low']);
  });

  it('re-asks the cheap model once, then escalates', async () => {
    const { o, seen, narrator } = await run(2);
    expect(o.status).toBe('generated');
    expect(o.model).toBe('strong');
    expect(seen).toEqual([
      { model: 'cheap', thinkingLevel: 'minimal' },
      { model: 'cheap', thinkingLevel: 'minimal' },
      { model: 'strong', thinkingLevel: 'low' },
    ]);
    // Rejected attempts are billed too, so they stay in the ledger.
    expect(narrator.calls.map((c) => c.attempt)).toEqual([1, 2, 3]);
  });
});

describe('sentence repair', () => {
  const payload = {
    topicId: 't', lead: 'An opening line about the chart.',
    paragraphs: ['Saturn sits in the 8th house in Leo. This is a strong placement for research. It asks for patience.', 'A second paragraph that stays as it is, long enough to keep.'],
    bullets: ['Keep a steady routine.', 'Lean on your strong Saturn every day.'], takeaway: 'Steady effort matters.',
    claims: [{ statement: 'Saturn sits in the 8th house in Leo.', evidenceIds: ['a'] }, { statement: 'Saturn is exalted.', evidenceIds: ['b'] }],
  };
  const validation = {
    topicId: 't', passed: false, verifiedEvidenceIds: ['a'], issues: [],
    claims: [
      { statement: 'Saturn sits in the 8th house in Leo.', evidenceIds: ['a'], status: 'verified' as const, reasons: [] },
      { statement: 'Saturn is exalted.', evidenceIds: ['b'], status: 'rejected' as const, reasons: ['VALUE_MISMATCH'] },
    ],
  };
  const err = (code: string, message: string) => ({ severity: 'error' as const, code, message });

  it('removes exactly the rejected sentences and unverified claims, and adds nothing', () => {
    const issues = [
      err('UNSUPPORTED_JUDGEMENT', 'Evaluative sentence ("strong") is not a verified claim citing an interp.* result: "This is a strong placement for research."'),
      err('UNSUPPORTED_JUDGEMENT', 'Evaluative sentence ("strong") is not a verified claim citing an interp.* result: "Lean on your strong Saturn every day."'),
      err('REJECTED_CLAIMS', '1 claim(s) rejected: VALUE_MISMATCH'),
    ];
    expect(isRepairable(issues)).toBe(true);
    const step = repairOnce(payload, validation as any, issues)!;
    expect(step.removedSentences).toEqual(['This is a strong placement for research.', 'Lean on your strong Saturn every day.']);
    expect(step.payload.paragraphs[0]).toBe('Saturn sits in the 8th house in Leo. It asks for patience.');
    expect(step.payload.bullets).toEqual(['Keep a steady routine.']);
    expect(step.payload.claims.map((c) => c.statement)).toEqual(['Saturn sits in the 8th house in Leo.']);
    expect(step.payload.lead).toBe(payload.lead);
  });

  it('does not repair problems that are about the whole topic, or a faulty opening line', () => {
    expect(isRepairable([err('TOO_SHORT', '2 paragraphs < 3')])).toBe(false);
    expect(isRepairable([err('MIXED_RESULT_NOT_ACKNOWLEDGED', 'x is mixed; the narrative must say that it cuts both ways')])).toBe(false);
    const leadIssue = [err('OVERSTATEMENT', 'Overstated or guaranteed outcome ("always"): "An opening line about the chart."')];
    expect(repairOnce(payload, { ...validation, claims: [validation.claims[0]] } as any, leadIssue)).toBeUndefined();
    expect(quotedSentence('Needs at least 1 verified claim(s)')).toBeUndefined();
  });
});

describe('report illustrations', () => {
  const img = (id: string, subjects: string[], width = 1100, height = 733): LibraryImage => ({
    id, file: `${id}.jpg`, subjects, caption: `Caption ${id}`, credit: 'NASA', license: 'Public domain', sourceUrl: 'https://example.org', width, height,
  });
  const library = [
    img('saturn-1', ['saturn']), img('saturn-2', ['saturn']), img('jupiter-1', ['jupiter']), img('venus-1', ['venus']),
    img('moon-1', ['moon']), img('mars-1', ['mars']), img('love-1', ['love']), img('marriage-1', ['marriage']),
    img('career-1', ['career']), img('time-1', ['time']),
    ...Array.from({ length: 12 }, (_, i) => img(`sky-${i + 1}`, ['night-sky'])),
    img('leo-1', ['leo']), img('numbers-1', ['numbers']),
  ];

  it('derives subjects from what a passage is about, planet before theme', () => {
    expect(subjectsFor("Saturn's Transit: the Season of Effort").slice(0, 2)).toEqual(['saturn', 'time']);
    expect(subjectsFor('Setting Sail: Learning and Beginnings')).not.toContain('wealth');
    expect(subjectsFor('The 7th House: Business and Partnership')).not.toContain('marriage');
    expect(subjectsFor('Your 7th house of partnership')).toContain('marriage');
    expect(subjectsFor('Love and Numbers Your Mulank and Bhagyank in relationships')).toEqual(expect.arrayContaining(['numbers', 'love']));
    expect(subjectsFor('Your Ascendant (Lagna)', { lagna: 'Leo' })[0]).toBe('leo');
    expect(subjectsFor('Your Ascendant (Lagna)')).not.toContain('leo');
  });

  it('illustrates life themes only: no pictures of planets, sky or technique', () => {
    const def = ReportRegistry.entry('career').definition;
    expect(planIllustrations(def, { lagna: 'leo' }, library.filter((i) => i.subjects[0] !== 'career')).used).toEqual([]);
    const plan = planIllustrations(def, { lagna: 'leo' }, library);
    expect(plan.used.map((i) => i.id)).toEqual(['career-1']);
  });

  it('keeps wedding and family pictures out of a career report', () => {
    const plan = planIllustrations(ReportRegistry.entry('career').definition, {}, [img('marriage-1', ['marriage']), img('love-1', ['love'])]);
    expect(plan.used).toEqual([]);
  });

  it('uses at most ten pictures from the real library, each once, each matching its passage, repeatably', () => {
    const def = ReportRegistry.entry('career').definition;
    const hints = { lagna: 'cancer', moon: 'aquarius' };
    const plan = planIllustrations(def, hints);
    const ids = plan.used.map((i) => i.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.length).toBeLessThanOrEqual(MAX_PICTURES);
    expect(ids.length).toBe(plan.topics.size);
    expect(new Set(ids).size).toBe(ids.length);
    const topics = def.sections.flatMap((s) => s.topics);
    for (const [topicId, image] of plan.topics) {
      const t = topics.find((x) => x.id === topicId)!;
      expect(subjectsFor(`${t.title} ${t.subtitle ?? ''}`, hints), t.title).toContain(image.subjects[0]);
      expect(['night-sky', 'observatory', 'time', 'saturn', 'sun', 'jupiter', 'rahu', 'nakshatra']).not.toContain(image.subjects[0]);
    }
    expect(planIllustrations(def, hints).used.map((i) => i.id)).toEqual(ids);
  });

  it('prefers a photograph of people for a theme', () => {
    const def = ReportRegistry.entry('career').definition;
    const plan = planIllustrations(def, {}, [img('career-desk', ['career']), { ...img('career-person', ['career']), people: true }]);
    expect(plan.used[0].id).toBe('career-person');
  });

  it('scales a picture to cover its box', () => {
    expect(coverImageTex(img('wide', ['x'], 2000, 500), 170, 96)).toContain('{height=96mm}');
    expect(coverImageTex(img('tall', ['x'], 500, 2000), 170, 96)).toContain('{width=170mm}');
  });

  it('renders a small uncaptioned theme-harmonized picture without an Image Credits page', () => {
    const def = ReportRegistry.entry('career').definition;
    const plan = planIllustrations(def, {}, library);
    const topicId = [...plan.topics.keys()][0];
    const section = def.sections.find((s) => s.topics.some((t) => t.id === topicId))!;
    const topic = section.topics.find((t) => t.id === topicId)!;
    const payload = { topicId: topic.id, lead: 'Lead.', paragraphs: ['One.', 'Two.'], bullets: [], takeaway: 'T.', claims: [] };
    const input = {
      definition: def, llmProviderLabel: 'x',
      cover: { clientName: 'N', dateOfBirth: '01 Jan 2000', placeName: 'P', generatedOn: '01 Jan 2026' },
      sections: [{ section, topics: [{ topic, kind: 'narrative' as const, payload }] }],
    };
    const plain = assembleDocument(input);
    expect(plain).not.toContain('assets/library/');
    expect(plain).not.toContain('Image Credits');
    const illustrated = assembleDocument({ ...input, illustrations: plan });
    expect(illustrated).toContain('\\AsImage{48mm}{44mm}');
    expect(illustrated).toContain('assets/library/career-1.jpg');
    expect(illustrated).not.toContain('Image Credits');
    expect(illustrated).toContain('About Astro Sushil');
  });

  it('matches working-life themes and keeps the Ascendant sign out of career-chart passages', () => {
    const hints = { lagna: 'cancer', moon: 'aquarius' };
    expect(subjectsFor('Collaborations that Thrive', hints)).toContain('teamwork');
    expect(subjectsFor('Changing Course The 8th house of transformation', hints)[0]).toBe('change');
    expect(subjectsFor('Karmic Balance through Seva', hints)).toContain('spirituality');
    expect(subjectsFor('The Persona You Bring to Work Your D10 ascendant', hints)).not.toContain('cancer');
    expect(subjectsFor('The Guiding Star of Your Career Your Ascendant sign', hints)).toContain('cancer');
  });
});
