/**
 * Generation progress events: monotonic per-topic progress through the LLM
 * phase, with cached topics counted immediately. Runs offline and stops before
 * the PDF compile (no XeLaTeX, no paid LLM).
 */
import { describe, expect, it } from 'vitest';
import { generateReport, ReportGenerationAbortedError, ReportProgressEvent } from '../platform/orchestrator';
import { LlmNarrator, DEFAULT_NARRATOR_CONFIG } from '../platform/llm/narrator';
import { InMemoryTopicCacheStore } from '../platform/llm/topic-cache';
import { OfflineTestProvider } from '../platform/llm/offline-test-provider';
import { ReportRegistry } from '../platform/registry';
import { SubjectInput } from '../platform/snapshot/chart-snapshot';

const AS_OF = new Date('2026-11-18T00:00:00Z');
const A: SubjectInput = { name: 'Test Native A', gender: 'female', dateOfBirth: '1994-03-17', timeOfBirth: '06:42', placeName: 'Jaipur', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' };

/** Runs the love report up to (not including) the PDF compile and records every progress event. */
async function runUntilCompile(narrator: LlmNarrator): Promise<ReportProgressEvent[]> {
  const events: ReportProgressEvent[] = [];
  const controller = new AbortController();
  await expect(
    generateReport({
      definitionId: 'love',
      subject: A,
      narrator,
      asOf: AS_OF,
      signal: controller.signal,
      onProgress: (e) => {
        events.push({ ...e });
        if (e.phase === 'compile') controller.abort();
      },
    })
  ).rejects.toBeInstanceOf(ReportGenerationAbortedError);
  return events;
}

function expectMonotonic(events: ReportProgressEvent[], total: number) {
  for (let i = 1; i < events.length; i++) {
    expect(events[i].completedTopics).toBeGreaterThanOrEqual(events[i - 1].completedTopics);
  }
  for (const e of events) expect(e.totalTopics).toBe(total);
}

describe('report generation progress', () => {
  const def = ReportRegistry.get('love');
  const total = def.sections.flatMap((s) => s.topics).filter((t) => t.kind === 'narrative').length;

  it('reports 0..total narrative topics monotonically, then the compile phase', async () => {
    const narrator = new LlmNarrator(new OfflineTestProvider(), new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test' });
    const events = await runUntilCompile(narrator);

    expect(events[0]).toEqual({ phase: 'narrative', completedTopics: 0, totalTopics: total });
    expectMonotonic(events, total);
    const narrative = events.filter((e) => e.phase === 'narrative');
    // One event per settled topic after the initial 0 (each topic counted exactly once).
    expect(narrative.map((e) => e.completedTopics)).toEqual(Array.from({ length: total + 1 }, (_, i) => i));
    expect(events[events.length - 1]).toEqual({ phase: 'compile', completedTopics: total, totalTopics: total });
  }, 120000);

  it('counts cached topics as done immediately without calling the model', async () => {
    const cache = new InMemoryTopicCacheStore();
    const first = new OfflineTestProvider();
    await runUntilCompile(new LlmNarrator(first, cache, { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test' }));

    const second = new OfflineTestProvider();
    const events = await runUntilCompile(new LlmNarrator(second, cache, { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test' }));
    expect(second.calls).toBe(0);
    expectMonotonic(events, total);
    expect(events.filter((e) => e.phase === 'narrative').map((e) => e.completedTopics)).toEqual(Array.from({ length: total + 1 }, (_, i) => i));
  }, 120000);

  it('ignores errors thrown by the progress callback', async () => {
    const narrator = new LlmNarrator(new OfflineTestProvider(), new InMemoryTopicCacheStore(), { ...DEFAULT_NARRATOR_CONFIG, model: 'offline-test' });
    const controller = new AbortController();
    await expect(
      generateReport({
        definitionId: 'love', subject: A, narrator, asOf: AS_OF, signal: controller.signal,
        onProgress: (e) => {
          if (e.phase === 'compile') controller.abort();
          throw new Error('boom');
        },
      })
    ).rejects.toBeInstanceOf(ReportGenerationAbortedError);
  }, 120000);
});
