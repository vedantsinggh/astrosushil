/**
 * Regression tests for Jyoti AI chat and the "Let Sushil Sir explain" endpoint.
 *
 * Bugs covered:
 *  1. Reasoning models spent the whole 1000-token budget on hidden reasoning, so the explainer
 *     always received empty `content` (finish_reason=length) and failed.
 *  2. The per-request abort timer was cleared once headers arrived, so a slow body could hang
 *     past the mobile timeout; retries were not bounded by an overall deadline.
 *  3. Explainer failures surfaced "Jyoti AI ..." copy instead of Sushil Sir copy.
 *  4. Mobile feature identifiers `home_dashboard` / `courses_overview` were rejected with 400.
 *  5. The chat context omitted computed houses / lords / dasha, so the LLM had to derive them
 *     itself (AGENTS.md violation), and it never said which profile the chart belonged to.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  birthProfile: { findMany: vi.fn(), findUnique: vi.fn() },
  report: { findMany: vi.fn() },
  order: { findMany: vi.fn() },
  notificationPreference: { findUnique: vi.fn() },
}));
const astrologyMock = vi.hoisted(() => ({
  calculateChartForProfile: vi.fn(),
  calculateDasha: vi.fn(),
}));

vi.mock('../../src/services/prisma.service', () => ({ prisma: prismaMock }));
vi.mock('../../src/modules/astrology/astrology.service', () => ({ astrologyService: astrologyMock }));

import { OpenRouterProvider } from '../../src/modules/jyoti/providers/openrouter.provider';
import { JyotiService, SUSHIL_UNAVAILABLE_MESSAGE, JYOTI_UNAVAILABLE_MESSAGE } from '../../src/modules/jyoti/jyoti.service';
import { JyotiExplainRequestSchema } from '../../src/modules/jyoti/jyoti.schemas';
import { AstrologyContextBuilder } from '../../src/modules/jyoti/context/astrology-context.builder';

const PROFILE_ID = '11111111-1111-4111-8111-111111111111';

const CHART = {
  ascendant: { rashiName: 'Virgo', degreeInRashi: 2.25, nakshatraName: 'Uttara Phalguni', pada: 2, lord: 'Mercury' },
  planets: [
    { planet: 'MOON', rashiName: 'Taurus', degreeInRashi: 2.21, house: 9, nakshatraName: 'Krittika', pada: 2, dignity: 'EXALTED', lordship: [11], aspectsCast: [3], isRetrograde: false },
    { planet: 'JUPITER', rashiName: 'Pisces', degreeInRashi: 2.97, house: 7, nakshatraName: 'Purva Bhadrapada', pada: 4, dignity: 'OWN_SIGN', lordship: [4, 7], aspectsCast: [11, 1, 3], isRetrograde: true },
  ],
  houses: [
    { houseNumber: 1, rashiName: 'Virgo', lord: 'Mercury' },
    { houseNumber: 7, rashiName: 'Pisces', lord: 'Jupiter' },
  ],
};

const ACTIVE_DASHA = {
  targetDateIso: '2026-11-19T00:00:00.000Z',
  mahadasha: { lord: 'RAHU', startDateIso: '2019-02-15T16:12:27.924Z', endDateIso: '2037-02-15T00:58:03.924Z' },
  antardasha: { lord: 'SATURN', startDateIso: '2024-03-23T00:00:00.000Z', endDateIso: '2027-01-28T00:00:00.000Z' },
};

function okJson(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) };
}

describe('OpenRouterProvider regressions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retries with a larger token budget when reasoning exhausts max_tokens (empty content, finish_reason=length)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson({ model: 'x', choices: [{ finish_reason: 'length', message: { content: '' } }], usage: { completion_tokens: 1000 } }))
      .mockResolvedValueOnce(okJson({ model: 'x', choices: [{ finish_reason: 'stop', message: { content: '{"headline":"H","message":"Explained.","keyPoints":["a"]}' } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const provider = new OpenRouterProvider('test-key', 'test/model:free');
    const res = await provider.generateResponse('prompt', { maxOutputTokens: 1000 });

    expect(res.message).toBe('Explained.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = JSON.parse(fetchMock.mock.calls[0][1].body);
    const second = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(first.max_tokens).toBe(1000);
    expect(second.max_tokens).toBe(2000);
    // Reasoning effort is kept low so the answer is not starved by hidden reasoning.
    expect(first.reasoning).toMatchObject({ effort: 'low', exclude: true });
  });

  it('keeps the abort timer armed while the body is read and respects the overall deadline', async () => {
    // Headers arrive at once, but the body never completes until the request is aborted.
    const fetchMock = vi.fn().mockImplementation((_url: string, init: { signal: AbortSignal }) =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => {
              const err: any = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }),
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const provider = new OpenRouterProvider('test-key', 'test/model:free');
    const started = Date.now();
    await expect(provider.generateResponse('prompt', { totalTimeoutMs: 5500 })).rejects.toMatchObject({
      code: 'AI_SERVICE_UNAVAILABLE',
      statusCode: 503,
    });
    // One attempt fits in the budget; it is aborted at the deadline instead of hanging.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(Date.now() - started).toBeLessThan(8000);
  }, 12000);

  it('does not retry non-transient 4xx errors (e.g. invalid model id)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 400, text: () => Promise.resolve('bad model') });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new OpenRouterProvider('test-key', 'missing/model:free');
    await expect(provider.generateResponse('prompt')).rejects.toMatchObject({ code: 'AI_SERVICE_UNAVAILABLE' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('JyotiService failure mapping & budgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.birthProfile.findMany.mockResolvedValue([]);
    prismaMock.birthProfile.findUnique.mockResolvedValue(null);
    prismaMock.report.findMany.mockResolvedValue([]);
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.notificationPreference.findUnique.mockResolvedValue(null);
  });

  const explainPayload = {
    feature: 'birth_chart' as const,
    screenTitle: 'Birth Chart',
    context: { astrologyData: { ascendant: { sign: 'Virgo' } } },
  };

  it('explainer requests a generous token budget (1000 was fully consumed by reasoning)', async () => {
    const llm = { generateResponse: vi.fn().mockResolvedValue({ message: 'ok', keyPoints: [] }) };
    await new JyotiService(llm).processExplain('u-budget', explainPayload);
    expect(llm.generateResponse.mock.calls[0][1].maxOutputTokens).toBeGreaterThanOrEqual(4000);
  });

  it('explainer LLM failure surfaces a Sushil Sir message with AI_SERVICE_UNAVAILABLE', async () => {
    const llm = { generateResponse: vi.fn().mockRejectedValue(new OpenRouterProviderError()) };
    await expect(new JyotiService(llm).processExplain('u-ex-fail', explainPayload)).rejects.toMatchObject({
      code: 'AI_SERVICE_UNAVAILABLE',
      statusCode: 503,
      message: SUSHIL_UNAVAILABLE_MESSAGE,
    });
  });

  it('explainer empty model message surfaces AI_RESPONSE_INVALID with Sushil Sir copy', async () => {
    const llm = { generateResponse: vi.fn().mockResolvedValue({ message: '   ' }) };
    await expect(new JyotiService(llm).processExplain('u-ex-empty', explainPayload)).rejects.toMatchObject({
      code: 'AI_RESPONSE_INVALID',
      statusCode: 502,
      message: SUSHIL_UNAVAILABLE_MESSAGE,
    });
  });

  it('explainer strips personal identifiers from userProfileContext before prompting', async () => {
    const llm = { generateResponse: vi.fn().mockResolvedValue({ message: 'ok' }) };
    await new JyotiService(llm).processExplain('u-pii', {
      ...explainPayload,
      context: { ...explainPayload.context, userProfileContext: { name: 'Ravi Kumar', email: 'r@example.com', placeName: 'Delhi' } },
    });
    const prompt: string = llm.generateResponse.mock.calls[0][0];
    expect(prompt).not.toContain('Ravi Kumar');
    expect(prompt).not.toContain('r@example.com');
    expect(prompt).toContain('Delhi');
  });

  it('chat LLM failure surfaces a Jyoti message with AI_SERVICE_UNAVAILABLE', async () => {
    const llm = { generateResponse: vi.fn().mockRejectedValue(new Error('socket hang up')) };
    await expect(new JyotiService(llm).processChat('u-chat-fail', { message: 'hi' })).rejects.toMatchObject({
      code: 'AI_SERVICE_UNAVAILABLE',
      message: JYOTI_UNAVAILABLE_MESSAGE,
    });
  });

  it('chat prompt carries computed houses, lords and current dasha for the requested profile', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u-ctx', email: 'person@example.com', role: 'USER', fullName: 'P' });
    prismaMock.birthProfile.findMany.mockResolvedValue([
      { id: 'other-profile', name: 'Older', dateOfBirth: '1990-01-01', timeOfBirth: '10:00', placeName: 'X', timezone: 'Asia/Kolkata' },
      { id: PROFILE_ID, name: 'Active One', dateOfBirth: '1998-08-15', timeOfBirth: '08:30', placeName: 'Delhi', timezone: 'Asia/Kolkata' },
    ]);
    astrologyMock.calculateChartForProfile.mockResolvedValue({ data: CHART });
    astrologyMock.calculateDasha.mockResolvedValue({ activePeriods: ACTIVE_DASHA });

    const llm = { generateResponse: vi.fn().mockResolvedValue({ message: 'Your 7th lord is Jupiter.' }) };
    await new JyotiService(llm).processChat('u-ctx', {
      message: 'What does my 7th house lord show?',
      context: { birthProfileId: PROFILE_ID },
    });

    expect(astrologyMock.calculateChartForProfile).toHaveBeenCalledWith(PROFILE_ID, expect.anything());
    const prompt: string = llm.generateResponse.mock.calls[0][0];
    expect(prompt).toContain('ACTIVE BIRTH PROFILE');
    expect(prompt).toContain('ACTIVE BIRTH PROFILE: Profile 2.');
    expect(prompt).toContain('- Profile 2 [ACTIVE]');
    // Names / exact birth data are not sent to the third-party LLM (docs/jyoti.md privacy rule).
    expect(prompt).not.toContain('Active One');
    expect(prompt).not.toContain('1998-08-15');
    expect(prompt).toContain('JUPITER: Pisces 2.97°, house 7');
    expect(prompt).toContain('lord of house 4 & 7');
    expect(prompt).toContain('House 7: Pisces, lord Jupiter, occupants: JUPITER');
    expect(prompt).toContain('Mahadasha RAHU (2019-02-15 to 2037-02-15)');
    expect(prompt).toContain('Antardasha SATURN');
    // PII minimisation: the account email is not sent to the third-party LLM.
    expect(prompt).not.toContain('person@example.com');
  });

  it('does not let the LLM guess the dasha when the dasha engine fails', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u-nodasha', email: null, role: 'USER', fullName: null });
    prismaMock.birthProfile.findMany.mockResolvedValue([
      { id: PROFILE_ID, name: 'Only', dateOfBirth: '1998-08-15', timeOfBirth: '08:30', placeName: 'Delhi', timezone: 'Asia/Kolkata' },
    ]);
    astrologyMock.calculateChartForProfile.mockResolvedValue({ data: CHART });
    astrologyMock.calculateDasha.mockRejectedValue(new Error('engine failure'));

    const context = await AstrologyContextBuilder.buildContext({ userId: 'u-nodasha', birthProfileId: PROFILE_ID });
    expect(context).toContain('JUPITER: Pisces');
    expect(context).toContain('CURRENT VIMSHOTTARI DASHA: unavailable. Do NOT state or guess the current dasha.');
  });
});

describe('Explainer schema accepts every feature id the mobile app sends', () => {
  it.each(['home_dashboard', 'courses_overview', 'birth_chart', 'vimshottari_dasha', 'career_report'])('%s', (feature) => {
    const parsed = JyotiExplainRequestSchema.safeParse({
      feature,
      screenTitle: 'Screen',
      context: { astrologyData: { a: 1 } },
    });
    expect(parsed.success).toBe(true);
  });
});

describe('AstrologyContextBuilder formatting helpers', () => {
  it('formatActiveDasha returns null when the engine supplied no active period', () => {
    expect(AstrologyContextBuilder.formatActiveDasha(undefined)).toBeNull();
    expect(AstrologyContextBuilder.formatActiveDasha({})).toBeNull();
  });

  it('formatChart is deterministic for identical input', () => {
    expect(AstrologyContextBuilder.formatChart(CHART)).toEqual(AstrologyContextBuilder.formatChart(CHART));
  });
});

class OpenRouterProviderError extends Error {
  constructor() {
    super('OpenRouter transient error 503');
  }
}
