/**
 * Offline provider for tests and layout work. It writes obviously-synthetic
 * text built from the evidence labels in the prompt, so it exercises parsing,
 * validation, caching and rendering without any API cost.
 *
 * Its providerId is `offline-test` and every manifest records it, so its
 * output can never be mistaken for real LLM narrative.
 */
import type { AiGenerationOptions, AiGenerationResult, IAiProvider } from '@astro/prediction-engine';

export class OfflineTestProvider implements IAiProvider {
  public readonly providerId = 'offline-test';
  public calls = 0;
  constructor(private readonly mutate?: (json: { topics: Array<Record<string, unknown>> }) => void) {}

  get isConfigured() {
    return true;
  }
  getAvailableModels() {
    return ['offline-test'];
  }
  getUsageMetadata() {
    return { totalRequests: this.calls, totalTokens: 0 };
  }
  async healthCheck() {
    return { ok: true, message: 'offline', latencyMs: 0 };
  }
  async generateStructured<T>(prompt: string, options?: AiGenerationOptions) {
    const result = await this.generate(prompt, options);
    return { data: result.parsedJson as T, result };
  }

  async generate(prompt: string, options?: AiGenerationOptions): Promise<AiGenerationResult> {
    this.calls++;
    const topics: Array<Record<string, unknown>> = [];
    const [preamble, ...blocks] = prompt.split('=== TOPIC ');
    // Facts shared by every topic of the call are listed once, before the topic blocks.
    const commonAt = preamble.indexOf('EVIDENCE COMMON TO EVERY TOPIC');
    const common = commonAt >= 0 ? [...preamble.slice(commonAt).matchAll(/\[([a-z0-9.-]+)\] (.*)/g)] : [];
    // A Hindi edition gets Devanagari placeholder prose (the facts stay in the English claims).
    const hindi = preamble.includes('LANGUAGE: Write lead, paragraphs, bullets and takeaway in natural, warm Hindi');
    for (const b of blocks) {
      const id = /topicId="([^"]+)"/.exec(b)![1];
      const title = /Title: (.*)/.exec(b)![1];
      const ev = [...b.matchAll(/\[([a-z0-9.-]+)\] (.*)/g), ...common].slice(0, 4);
      const facts = ev.map(([, eid, label]) => ({ eid, label: label.replace(/\.$/, '') }));
      const para = (i: number) =>
        `[Offline test text ${i}] This placeholder paragraph for "${title}" exists only to test layout and validation. ` +
        facts.map((f) => `${f.label}.`).join(' ') +
        ' The real report replaces this with personalised narrative written from the same verified facts, explained in plain language with practical guidance.';
      if (hindi) {
        const paraHi = (i: number) =>
          `[ऑफ़लाइन परीक्षण पाठ ${i}] "${title}" के लिए यह अस्थायी अनुच्छेद केवल पृष्ठ-सज्जा और जाँच के परीक्षण के लिए है। ` +
          'वास्तविक रिपोर्ट में इसकी जगह उन्हीं सत्यापित तथ्यों से लिखा गया व्यक्तिगत विवेचन आता है, जो सरल भाषा और व्यावहारिक सुझावों के साथ समझाया जाता है।';
        topics.push({
          topicId: id,
          lead: `[ऑफ़लाइन परीक्षण] ${title}: आपकी गणना की गई कुंडली के तथ्यों से बना पृष्ठ-सज्जा का नमूना।`,
          paragraphs: [paraHi(1), paraHi(2), paraHi(3)],
          bullets: ['पृष्ठ-सज्जा के लिए ऑफ़लाइन परीक्षण बिंदु एक।', 'पृष्ठ-सज्जा के लिए ऑफ़लाइन परीक्षण बिंदु दो।', 'पृष्ठ-सज्जा के लिए ऑफ़लाइन परीक्षण बिंदु तीन।'],
          takeaway: 'ऑफ़लाइन परीक्षण सार: वास्तविक रिपोर्ट में इसकी जगह असली विवेचन आता है।',
          claims: facts.map((f) => ({ statement: f.label, evidenceIds: [f.eid] })),
        });
        continue;
      }
      topics.push({
        topicId: id,
        lead: `[Offline test] ${title}: a layout preview built from your calculated chart facts.`,
        paragraphs: [para(1), para(2), para(3)],
        bullets: ['Offline test bullet one for layout.', 'Offline test bullet two for layout.', 'Offline test bullet three for layout.'],
        takeaway: 'Offline test takeaway — replaced by the real narrative in production.',
        claims: facts.map((f) => ({ statement: f.label, evidenceIds: [f.eid] })),
      });
    }
    const json = { topics };
    this.mutate?.(json);
    return {
      text: JSON.stringify(json), parsedJson: json, provider: this.providerId, model: options?.model ?? 'offline-test',
      tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0, thinkingTokens: 0 }, latencyMs: 0, finishReason: 'STOP',
      provenance: { provider: this.providerId, model: 'offline-test', timestamp: new Date().toISOString(), isRealLlm: false, anonymized: false },
    } as AiGenerationResult;
  }
}
