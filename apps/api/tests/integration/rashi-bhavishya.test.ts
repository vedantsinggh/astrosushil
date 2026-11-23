/**
 * Rashi Bhavishya HTTP contract. Offline: the LLM provider is stubbed to fail
 * and the store is stubbed, so no network or database is needed.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { GeminiAiProvider } from '@astro/prediction-engine';
import { reportPlatform } from '@astro/report-engine';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { RashiGocharaEngine, factsForRashi } from '../../src/modules/rashi-bhavishya/rashi-gochara.engine';
import { RashiNarrator } from '../../src/modules/rashi-bhavishya/rashi-bhavishya.narrator';
import { istDateOf } from '../../src/modules/rashi-bhavishya/rashi-gochara.engine';

describe('Rashi Bhavishya API', () => {
  let app: FastifyInstance;
  const user1Id = '11111111-1111-1111-1111-111111111111';
  let user1Token: string;
  let storedRow: Record<string, unknown>;
  const today = istDateOf(new Date());

  beforeAll(async () => {
    // Never reach Gemini from tests.
    vi.spyOn(GeminiAiProvider.prototype, 'generate').mockRejectedValue(new Error('HTTP 400 offline test'));

    const sky = await new RashiGocharaEngine().computeDailySky(today);
    const facts = factsForRashi(sky, 1);
    const out = await new RashiNarrator(new reportPlatform.OfflineTestProvider()).generate(facts);
    storedRow = {
      id: 'row-1', date: today, rashiIndex: 1, language: 'en', methodVersion: facts.method.version, promptVersion: out.promptVersion,
      factsHash: 'h', facts, narrative: out.narrative, provider: out.provider, model: out.model, generationId: out.generationId,
      tokens: out.tokens, latencyMs: 0, createdAt: new Date('2026-11-18T00:00:00Z'),
    };

    vi.spyOn(prisma.rashiDailyHoroscope, 'findUnique').mockImplementation((async (args: any) => {
      const k = args.where.date_rashiIndex_language_methodVersion_promptVersion;
      return k.rashiIndex === 1 && k.date === today && k.language === 'en' ? storedRow : null;
    }) as any);
    vi.spyOn(prisma.rashiDailyHoroscope, 'findMany').mockImplementation((async (args: any) => (args.where.language === 'en' ? [storedRow] : [])) as any);
    vi.spyOn(prisma.birthProfile, 'findFirst').mockResolvedValue(null);

    app = buildApp();
    await app.ready();
    user1Token = app.jwt.sign({ sub: user1Id, role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('GET /today?rashiIndex=1 returns facts, narrative and method for the IST date', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/rashi-bhavishya/today?rashiIndex=1' });
    expect(res.statusCode).toBe(200);
    const { data } = JSON.parse(res.payload);
    expect(data.date).toBe(today);
    expect(data.timezone).toBe('Asia/Kolkata');
    expect(data.rashi).toMatchObject({ index: 1, sanskritName: 'Mesha', englishName: 'Aries' });
    expect(data.facts.planets).toHaveLength(9);
    expect(data.facts.moon.house).toBeGreaterThanOrEqual(1);
    expect(data.facts.tally.method).toMatch(/not a score/);
    expect(data.prediction.sections).toHaveLength(3);
    expect(data.prediction.summary.length).toBeGreaterThan(10);
    expect(data.method.vedha).toBe('not-applied');
    expect(data.isDevelopmentFixture).toBe(false);
    expect(data.prediction.luckyNumber).toBeUndefined();
    expect(data.narrativeSource).toBe('validated-llm');
  });

  it('GET /today returns the deterministic result with plain wording when the LLM fails', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/rashi-bhavishya/today?rashiIndex=2', headers: { 'x-request-id': 'rashi-test-0001' } });
    expect(res.statusCode).toBe(200);
    const { data } = JSON.parse(res.payload);
    expect(data.narrativeSource).toBe('deterministic');
    expect(data.rashi.index).toBe(2);
    expect(data.facts.planets).toHaveLength(9);
    expect(data.prediction.summary.length).toBeGreaterThan(10);
    expect(data.prediction.sections.length).toBeGreaterThan(0);
    expect(data.isDevelopmentFixture).toBe(false);
  });

  it('GET /today?language=hi returns the same facts with Hindi names and Hindi wording', async () => {
    const [en, hi] = await Promise.all(
      ['', '&language=hi'].map(async (q) => {
        const res = await app.inject({ method: 'GET', url: `/api/v1/rashi-bhavishya/today?rashiIndex=2${q}` });
        expect(res.statusCode).toBe(200);
        return JSON.parse(res.payload).data;
      })
    );
    expect(en.language).toBe('en');
    expect(JSON.stringify(en)).not.toMatch(/[\u0900-\u097F]/);
    expect(hi.language).toBe('hi');
    expect(hi.prediction.language).toBe('hi');
    expect(hi.narrativeSource).toBe('deterministic');
    expect(hi.rashi).toMatchObject({ index: 2, englishName: 'Taurus', hindiName: 'वृषभ' });
    expect(hi.facts.planets.map((p: any) => [p.planet, p.sign.index, p.house, p.classification])).toEqual(
      en.facts.planets.map((p: any) => [p.planet, p.sign.index, p.house, p.classification])
    );
    expect(hi.facts.reference).toEqual(en.facts.reference);
    expect(hi.facts.planets[0].name).toBe('सूर्य');
    expect(hi.facts.panchang.vara.name).toMatch(/वार$/);
    expect(hi.prediction.summary).toMatch(/^आज चंद्र /);
    expect(hi.prediction.summary).not.toMatch(/[A-Za-z]/);
  });

  it('GET /today?language=en is the default response; an unknown language returns 400', async () => {
    const plain = await app.inject({ method: 'GET', url: '/api/v1/rashi-bhavishya/today?rashiIndex=1' });
    const explicit = await app.inject({ method: 'GET', url: '/api/v1/rashi-bhavishya/today?rashiIndex=1&language=en' });
    expect(JSON.parse(explicit.payload)).toEqual(JSON.parse(plain.payload));
    for (const url of ['/api/v1/rashi-bhavishya/today?rashiIndex=1&language=mr', '/api/v1/rashi-bhavishya/all?language=mr']) {
      const bad = await app.inject({ method: 'GET', url });
      expect(bad.statusCode).toBe(400);
      expect(JSON.parse(bad.payload).error.code).toBeTruthy();
    }
  });

  it('GET /all?language=hi lists only Hindi rows (none prepared here: 503, never generated)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/rashi-bhavishya/all?language=hi' });
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.payload).error.code).toBe('RASHI_BHAVISHYA_UNAVAILABLE');
  });

  it('GET /today (as the app calls it) still answers 200 when the horoscope table is missing (regression)', async () => {
    const spy = vi.spyOn(prisma.rashiDailyHoroscope, 'findUnique').mockRejectedValueOnce(
      Object.assign(new Error('The table `public.rashi_daily_horoscopes` does not exist in the current database.'), { code: 'P2021' })
    );
    const res = await app.inject({ method: 'GET', url: `/api/v1/rashi-bhavishya/today?rashiIndex=4&date=${today}` });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.narrativeSource).toBe('deterministic');
    expect(spy).toHaveBeenCalled();
  });

  it('GET /today with an unknown rashi name returns 400 instead of defaulting to Mesha', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/rashi-bhavishya/today?rashi=NotARashi', headers: { authorization: `Bearer ${user1Token}` } });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /today without auth or rashi returns 401 instead of silently using Mesha', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/rashi-bhavishya/today' });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.payload).error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('GET /today for a signed-in user without a birth profile returns 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/rashi-bhavishya/today', headers: { authorization: `Bearer ${user1Token}` } });
    expect(res.statusCode).toBe(404);
  });

  it('GET /today with a date outside today-7 … tomorrow returns 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/rashi-bhavishya/today?rashiIndex=1&date=2020-01-01' });
    expect(res.statusCode).toBe(400);
  });

  it('GET /all lists only prepared signs and the missing ones', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/rashi-bhavishya/all' });
    expect(res.statusCode).toBe(200);
    const { data } = JSON.parse(res.payload);
    expect(data.items).toHaveLength(1);
    expect(data.language).toBe('en');
    expect(data.unavailableRashiIndexes).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});
