import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiAiProvider, supportsThinkingLevel } from '../providers/gemini-ai.provider';

function mockFetch() {
  const bodies: any[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body: string }) => {
    bodies.push(JSON.parse(init.body));
    return {
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '{}' }] }, finishReason: 'STOP' }], usageMetadata: {} }),
    };
  }));
  return bodies;
}

describe('Gemini thinking config', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('detects Gemini 3+ models only', () => {
    expect(supportsThinkingLevel('gemini-3.8-flash')).toBe(true);
    expect(supportsThinkingLevel('models/gemini-3-flash-preview')).toBe(true);
    expect(supportsThinkingLevel('gemini-2.5-flash')).toBe(false);
    expect(supportsThinkingLevel('llama-3.3-70b')).toBe(false);
  });

  it('sends thinkingLevel to Gemini 3+, never to older models, and nothing when unset', async () => {
    const bodies = mockFetch();
    const p = new GeminiAiProvider({ apiKey: 'test-key' });
    await p.generate('x', { model: 'gemini-3.8-flash', thinkingLevel: 'low' });
    await p.generate('x', { model: 'gemini-2.5-flash', thinkingLevel: 'low' });
    await p.generate('x', { model: 'gemini-3.8-flash' });
    expect(bodies[0].generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'low' });
    expect(bodies[1].generationConfig.thinkingConfig).toBeUndefined();
    expect(bodies[2].generationConfig.thinkingConfig).toBeUndefined();
  });
});
