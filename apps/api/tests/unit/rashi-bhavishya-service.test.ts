/**
 * Rashi Bhavishya narrative, service and scheduler — offline only
 * (OfflineTestProvider; no network, no paid API).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { reportPlatform } from '@astro/report-engine';
import { prisma } from '../../src/services/prisma.service';
import { RashiGocharaEngine, RashiDailyFacts, factsForRashi } from '../../src/modules/rashi-bhavishya/rashi-gochara.engine';
import {
  RashiNarrator,
  RashiNarrativeError,
  buildRashiEvidence,
  checkTransitProse,
} from '../../src/modules/rashi-bhavishya/rashi-bhavishya.narrator';
import { RashiBhavishyaService } from '../../src/modules/rashi-bhavishya/rashi-bhavishya.service';
import { InMemoryRashiHoroscopeStore } from '../../src/modules/rashi-bhavishya/rashi-bhavishya.store';
import { RashiBhavishyaScheduler } from '../../src/services/rashi-bhavishya.scheduler';

const NOW = () => new Date('2026-11-18T05:00:00Z'); // 10:30 IST on 2026-11-18
const fastConfig = { config: { backoffBaseMs: 1, maxTransportRetries: 0 } };

function offlineNarrator(mutate?: (json: { topics: Array<Record<string, unknown>> }) => void) {
  const provider = new reportPlatform.OfflineTestProvider(mutate);
  return { provider, narrator: new RashiNarrator(provider, fastConfig) };
}

let ariesFacts: RashiDailyFacts;
beforeAll(async () => {
  const sky = await new RashiGocharaEngine().computeDailySky('2026-11-18');
  ariesFacts = factsForRashi(sky, 1);
});

describe('evidence', () => {
  it('has stable IDs whose labels state their values', () => {
    const { snapshotId, items } = buildRashiEvidence(ariesFacts);
    expect(snapshotId).toHaveLength(32);
    expect(buildRashiEvidence(ariesFacts).snapshotId).toBe(snapshotId);
    const ids = items.map((i) => i.id);
    for (const id of ['rashi.sign', 'transit.moon.sign', 'transit.moon.house', 'transit.moon.gochara', 'transit.saturn.house', 'tally.favourable', 'panchang.tithi']) {
      expect(ids).toContain(id);
    }
    for (const i of items) {
      expect(i.id).toMatch(/^[a-z0-9]+(\.[a-z0-9-]+)+$/);
      const v = Array.isArray(i.value) ? i.value[0] : i.value;
      if (typeof v === 'string') expect(i.label.toLowerCase()).toContain(v.toLowerCase());
      if (typeof v === 'number') expect(i.label).toMatch(new RegExp(`\\b${v}(st|nd|rd|th)?\\b`));
    }
    expect(items.find((i) => i.id === 'transit.saturn.house')!.value).toBe(12);
  });
});

describe('checkTransitProse', () => {
  it('accepts sentences that match the day', () => {
    expect(checkTransitProse('Saturn moves through Pisces, the 12th house from your Moon sign.', ariesFacts)).toEqual([]);
    expect(checkTransitProse('Jupiter in Leo sits in the 5th house from Aries.', ariesFacts)).toEqual([]);
    expect(checkTransitProse('For everyone born with the Moon in Aries, the Moon transits Aquarius today.', ariesFacts)).toEqual([]);
  });

  it('does not mistake the tithi name "Dashami" for a dasha (regression)', () => {
    expect(checkTransitProse('The morning opens with Shukla Dashami tithi active until 07:16 IST.', ariesFacts)).toEqual([]);
    expect(checkTransitProse('Your current dasha supports this.', ariesFacts)[0]).toMatch(/dasha/i);
    expect(checkTransitProse('There is a 70% chance of success.', ariesFacts)[0]).toMatch(/%/);
  });

  it('rejects a wrong sign, a wrong house and forbidden content', () => {
    expect(checkTransitProse('Saturn transits Aries today.', ariesFacts)[0]).toMatch(/Saturn in Aries/);
    expect(checkTransitProse('Jupiter is in the 9th house from your Moon sign.', ariesFacts)[0]).toMatch(/9th house/);
    expect(checkTransitProse('Your lucky number is 7.', ariesFacts)[0]).toMatch(/lucky number/i);
    expect(checkTransitProse('Your ascendant lord is strong.', ariesFacts)[0]).toMatch(/ascendant/i);
    // Today's Moon is in Aquarius; "Moon in Aries" is only allowed when it speaks about the birth Moon.
    expect(checkTransitProse('Today the Moon is in Aries.', ariesFacts).length).toBe(1);
  });
});

describe('RashiNarrator', () => {
  it('produces validated sections from the facts (offline provider, one call)', async () => {
    const { provider, narrator } = offlineNarrator();
    const out = await narrator.generate(ariesFacts);
    expect(provider.calls).toBe(1);
    expect(out.narrative.sections.map((s) => s.id)).toEqual(['day-overview', 'planetary-weather', 'guidance']);
    expect(out.narrative.summary.length).toBeGreaterThan(10);
    expect(out.narrative.verifiedEvidenceIds).toContain('transit.moon.house');
    expect(out.provider).toBe('offline-test');
  });

  it('fails (no substitute text) when the prose contradicts a transit', async () => {
    const { narrator } = offlineNarrator((json) => {
      (json.topics[1].paragraphs as string[])[0] = 'Saturn transits Gemini today, which is a long paragraph that otherwise reads normally.';
    });
    await expect(narrator.generate(ariesFacts)).rejects.toBeInstanceOf(RashiNarrativeError);
  });

  it('fails when a claim cites evidence that does not exist', async () => {
    const { narrator } = offlineNarrator((json) => {
      (json.topics[0].claims as Array<{ statement: string; evidenceIds: string[] }>).push({ statement: 'Mars is exalted in Capricorn', evidenceIds: ['planet.mars.d1.sign'] });
    });
    await expect(narrator.generate(ariesFacts)).rejects.toThrow(/validation/);
  });

  it('fails when the editorial validator finds fear language', async () => {
    const { narrator } = offlineNarrator((json) => {
      (json.topics[2].paragraphs as string[])[0] = 'This day is cursed for you and nothing will work out at all, so stay home.';
    });
    await expect(narrator.generate(ariesFacts)).rejects.toThrow(/validation/);
  });

  it('refuses to run without a configured provider', async () => {
    const provider = new reportPlatform.OfflineTestProvider();
    Object.defineProperty(provider, 'isConfigured', { get: () => false });
    await expect(new RashiNarrator(provider).generate(ariesFacts)).rejects.toThrow(/not configured/);
  });
});

describe('RashiBhavishyaService', () => {
  function service(narrator: RashiNarrator | null, store = new InMemoryRashiHoroscopeStore()) {
    return { store, svc: new RashiBhavishyaService({ store, requestNarrator: narrator, jobNarrator: narrator, now: NOW }) };
  }

  it('generates once per sign and date, then serves the stored row', async () => {
    const { provider, narrator } = offlineNarrator();
    const { svc, store } = service(narrator);
    const a = await svc.getTodayPrediction(undefined, { rashiIndex: 1 });
    const b = await svc.getTodayPrediction(undefined, { rashi: 'Mesha' });
    expect(provider.calls).toBe(1);
    expect(store.rows.size).toBe(1);
    expect(a.data.date).toBe('2026-11-18');
    expect(a.data.rashi.englishName).toBe('Aries');
    expect(a.data.facts.planets).toHaveLength(9);
    expect(a.data.facts.tally.favourable + a.data.facts.tally.demanding).toBe(9);
    expect(a.data.prediction.sections).toHaveLength(3);
    expect(a.data.isDevelopmentFixture).toBe(false);
    expect(b.data.prediction).toEqual(a.data.prediction);
    expect(b.data.resolvedFrom).toBe('rashi');
  });

  it('deduplicates concurrent requests for the same sign', async () => {
    const { provider, narrator } = offlineNarrator();
    const { svc } = service(narrator);
    await Promise.all([1, 2, 3].map(() => svc.getTodayPrediction(undefined, { rashiIndex: 4 })));
    expect(provider.calls).toBe(1);
  });

  it('serves deterministic facts with plain wording when no LLM is configured (never an error)', async () => {
    const { svc, store } = service(null);
    const a = await svc.getTodayPrediction(undefined, { rashiIndex: 2 });
    const b = await svc.getTodayPrediction(undefined, { rashiIndex: 2 });
    expect(a.data.narrativeSource).toBe('deterministic');
    expect(a.data.generation.provider).toBe('deterministic');
    expect(a.data.isDevelopmentFixture).toBe(false);
    expect(a.data.facts.planets).toHaveLength(9);
    expect(a.data.prediction.sections.map((s) => s.id)).toEqual(['day-overview', 'planetary-weather', 'tally']);
    for (const s of a.data.prediction.sections) expect(s.paragraphs.length).toBeGreaterThan(0);
    // Deterministic: identical wording for identical inputs.
    expect(b.data.prediction).toEqual(a.data.prediction);
    expect(b.data.facts).toEqual(a.data.facts);
    // Every planet/sign/house sentence agrees with the facts, and nothing forbidden is said.
    const text = a.data.prediction.sections.flatMap((s) => [a.data.prediction.summary, s.lead, ...s.paragraphs, ...s.bullets]).join('\n');
    expect(checkTransitProse(text, factsForRashi(await new RashiGocharaEngine().computeDailySky('2026-11-18'), 2))).toEqual([]);
    expect(a.data.prediction.summary).toContain(a.data.facts.moon.sign.englishName);
    expect(a.data.prediction.summary).toContain(`${a.data.facts.tally.favourable} of 9`);
    expect(store.rows.size).toBe(0); // plain wording is never stored
  });

  it('falls back to plain wording when the narrative fails validation, and does not store it', async () => {
    const { narrator } = offlineNarrator((json) => {
      json.topics.splice(0, json.topics.length);
    });
    const { svc, store } = service(narrator);
    const res = await svc.getTodayPrediction(undefined, { rashiIndex: 3 });
    expect(res.data.narrativeSource).toBe('deterministic');
    expect(res.data.rashi.index).toBe(3);
    expect(store.rows.size).toBe(0);
  });

  it('falls back to plain wording when the LLM provider throws', async () => {
    const provider = new reportPlatform.OfflineTestProvider();
    vi.spyOn(provider, 'generate').mockRejectedValue(new Error('HTTP 401 invalid key'));
    const { svc } = service(new RashiNarrator(provider, fastConfig));
    const res = await svc.getTodayPrediction(undefined, { rashiIndex: 6 });
    expect(res.data.narrativeSource).toBe('deterministic');
  });

  it('serves plain wording without calling the LLM when the store is unreachable (e.g. migration not applied)', async () => {
    const { provider, narrator } = offlineNarrator();
    const broken = new InMemoryRashiHoroscopeStore();
    broken.find = vi.fn().mockRejectedValue(new Error('The table `public.rashi_daily_horoscopes` does not exist in the current database.'));
    const { svc } = service(narrator, broken);
    const res = await svc.getTodayPrediction(undefined, { rashiIndex: 4 });
    expect(res.data.narrativeSource).toBe('deterministic');
    expect(provider.calls).toBe(0);
  });

  it('marks stored LLM narrative as validated-llm', async () => {
    const { narrator } = offlineNarrator();
    const { svc } = service(narrator);
    const res = await svc.getTodayPrediction(undefined, { rashiIndex: 1 });
    expect(res.data.narrativeSource).toBe('validated-llm');
  });

  it('fails fast for 5 minutes after an on-demand failure (cost guard), then tries again', async () => {
    const { provider, narrator } = offlineNarrator((json) => {
      json.topics.splice(0, json.topics.length);
    });
    let now = NOW();
    const svc = new RashiBhavishyaService({ store: new InMemoryRashiHoroscopeStore(), requestNarrator: narrator, jobNarrator: null, now: () => now });
    expect((await svc.getTodayPrediction(undefined, { rashiIndex: 3 })).data.narrativeSource).toBe('deterministic');
    const callsAfterFirst = provider.calls;
    expect((await svc.getTodayPrediction(undefined, { rashiIndex: 3 })).data.narrativeSource).toBe('deterministic');
    expect(provider.calls).toBe(callsAfterFirst);
    now = new Date(now.getTime() + 6 * 60 * 1000);
    expect((await svc.getTodayPrediction(undefined, { rashiIndex: 3 })).data.narrativeSource).toBe('deterministic');
    expect(provider.calls).toBeGreaterThan(callsAfterFirst);
  });

  it('only serves today-7 … tomorrow and generates only for today and tomorrow', async () => {
    const { provider, narrator } = offlineNarrator();
    const { svc } = service(narrator);
    await expect(svc.getTodayPrediction(undefined, { rashiIndex: 1, date: '2026-11-20' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(svc.getTodayPrediction(undefined, { rashiIndex: 1, date: '2026-11-10' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    // A past date not in the store is served with plain wording; it is never generated.
    expect((await svc.getTodayPrediction(undefined, { rashiIndex: 1, date: '2026-11-15' })).data.narrativeSource).toBe('deterministic');
    expect(provider.calls).toBe(0);
    const tomorrow = await svc.getTodayPrediction(undefined, { rashiIndex: 1, date: '2026-11-19' });
    expect(tomorrow.data.date).toBe('2026-11-19');
  });

  it('resolves the Moon sign from the birth profile; never defaults to Mesha', async () => {
    const calculator = { calculateChart: vi.fn().mockResolvedValue({ planets: { MOON: { rashiIndex: 7 } } }) } as any;
    const profile = {
      id: 'p', userId: 'u', name: 'X', dateOfBirth: '1990-05-15', timeOfBirth: '14:30:00',
      latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', placeName: 'Delhi', createdAt: new Date(), updatedAt: new Date(),
    } as any;
    const spy = vi.spyOn(prisma.birthProfile, 'findFirst').mockResolvedValueOnce(profile);
    const svc = new RashiBhavishyaService({ calculator, store: new InMemoryRashiHoroscopeStore(), requestNarrator: null, jobNarrator: null, now: NOW });
    await expect(svc.resolveRashi('u')).resolves.toEqual({ index: 7, from: 'birthProfile' });

    spy.mockResolvedValueOnce(profile);
    await svc.resolveRashi('u', { profileId: '6f1c1d0e-9a43-4b8e-a5d2-0c4b1e0f9a11' });
    expect(spy).toHaveBeenLastCalledWith({ where: { id: '6f1c1d0e-9a43-4b8e-a5d2-0c4b1e0f9a11', userId: 'u' } });

    spy.mockResolvedValueOnce(null);
    await expect(svc.resolveRashi('nobody')).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
    await expect(svc.resolveRashi(undefined)).rejects.toMatchObject({ code: 'AUTHENTICATION_ERROR' });
    await expect(svc.resolveRashi(undefined, { rashi: 'NotARashi' })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    const failing = { calculateChart: vi.fn().mockRejectedValue(new Error('ephemeris failure')) } as any;
    spy.mockResolvedValueOnce(profile);
    const svc2 = new RashiBhavishyaService({ calculator: failing, store: new InMemoryRashiHoroscopeStore(), requestNarrator: null, jobNarrator: null, now: NOW });
    await expect(svc2.resolveRashi('u')).rejects.toMatchObject({ code: 'MOON_RASHI_CALCULATION_FAILED', statusCode: 422 });
    spy.mockRestore();
  });

  it('ensureDate prepares all 12 signs with 12 calls, then nothing more', async () => {
    const { provider, narrator } = offlineNarrator();
    const { svc } = service(narrator);
    const first = await svc.ensureDate('2026-11-18');
    expect(first.generated).toHaveLength(12);
    expect(first.failed).toHaveLength(0);
    expect(provider.calls).toBe(12);
    const second = await svc.ensureDate('2026-11-18');
    expect(second.existing).toHaveLength(12);
    expect(provider.calls).toBe(12);
    const all = await svc.getAllPredictions('2026-11-18');
    expect(all.data.items).toHaveLength(12);
    expect(all.data.unavailableRashiIndexes).toEqual([]);
  });

  it('getAllPredictions never generates and reports missing signs', async () => {
    const { provider, narrator } = offlineNarrator();
    const { svc } = service(narrator);
    await expect(svc.getAllPredictions()).rejects.toMatchObject({ code: 'RASHI_BHAVISHYA_UNAVAILABLE' });
    await svc.getTodayPrediction(undefined, { rashiIndex: 5 });
    const all = await svc.getAllPredictions();
    expect(all.data.items.map((i) => i.rashi.index)).toEqual([5]);
    expect(all.data.unavailableRashiIndexes).toHaveLength(11);
    expect(provider.calls).toBe(1);
  });
});

describe('RashiBhavishyaScheduler', () => {
  it('prepares tomorrow only from 18:00 IST', () => {
    const svc = new RashiBhavishyaService({ store: new InMemoryRashiHoroscopeStore(), requestNarrator: null, jobNarrator: null, now: NOW });
    expect(new RashiBhavishyaScheduler(svc, { now: () => new Date('2026-11-18T12:29:00Z') }).datesDue()).toEqual(['2026-11-18']);
    expect(new RashiBhavishyaScheduler(svc, { now: () => new Date('2026-11-18T12:30:00Z') }).datesDue()).toEqual(['2026-11-18', '2026-11-19']);
  });

  it('backs off after failures and retries later', async () => {
    let now = new Date('2026-11-18T05:00:00Z');
    const ensure = vi.fn().mockResolvedValue({ generated: [], existing: [], failed: [{ rashiIndex: 1, error: 'x' }] });
    const svc = { ensureDate: ensure } as unknown as RashiBhavishyaService;
    const s = new RashiBhavishyaScheduler(svc, { now: () => now });
    await s.tick();
    await s.tick(); // inside the 15-minute backoff
    expect(ensure).toHaveBeenCalledTimes(1);
    now = new Date(now.getTime() + 16 * 60 * 1000);
    await s.tick();
    expect(ensure).toHaveBeenCalledTimes(2);
  });
});
