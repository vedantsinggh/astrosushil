import { createHash } from 'crypto';
import { prisma } from '../../services/prisma.service';
import { ChartCalculator, AstrologyConfig, RASHIS } from '@astro/astrology-engine';
import { GeminiAiProvider } from '@astro/prediction-engine';
import type { IAiProvider } from '@astro/prediction-engine';
import { mapBirthProfileToBirthDetails } from '../astrology/birth-details.mapper';
import { AppError, AuthenticationError, NotFoundError, ValidationError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { RashiBhavishyaQuery } from './rashi-bhavishya.schemas';
import {
  DailySky,
  RASHI_METHOD_VERSION,
  RashiDailyFacts,
  RashiGocharaEngine,
  addDays,
  factsForRashi,
  istDateOf,
} from './rashi-gochara.engine';
import { RASHI_NARRATIVE_VERSION, RashiNarrative, RashiNarrativeError, RashiNarrator } from './rashi-bhavishya.narrator';
import { PrismaRashiHoroscopeStore, RashiHoroscopeStore, StoredHoroscope } from './rashi-bhavishya.store';
import { RASHI_PLAIN_VERSION, buildPlainNarrative } from './rashi-bhavishya.plain';

export const RASHI_LANGUAGE = 'en';
/** RB-011: past dates are served from the store only, for at most this many days back. */
export const PAST_DAYS_SERVED = 7;
/** RB-012: after a failed on-demand generation, requests for that sign/date fail fast for this long (cost guard). */
export const ON_DEMAND_FAILURE_COOLDOWN_MS = 5 * 60 * 1000;

export interface RashiBhavishyaDto {
  date: string;
  timezone: string;
  rashi: { index: number; sanskritName: string; englishName: string; element: string; ruler: string };
  resolvedFrom: 'rashiIndex' | 'rashi' | 'birthProfile';
  facts: {
    reference: DailySky['reference'];
    panchang: DailySky['panchang'];
    moon: RashiDailyFacts['moon'];
    planets: RashiDailyFacts['planets'];
    events: DailySky['events'];
    tally: RashiDailyFacts['tally'];
  };
  prediction: RashiNarrative & { language: string };
  /**
   * `validated-llm`: the stored narrative written by the LLM from the facts and validated.
   * `deterministic`: plain template wording of the same facts, served when the LLM narrative
   * is unavailable (not configured, failed, or the store is unreachable). Never stored.
   */
  narrativeSource: 'validated-llm' | 'deterministic';
  method: RashiDailyFacts['method'];
  generation: { provider: string; model: string; promptVersion: string; generatedAt: string };
  source: string;
  isDevelopmentFixture: false;
}

export interface RashiBhavishyaResponseDto {
  data: RashiBhavishyaDto;
}

export class RashiBhavishyaUnavailableError extends AppError {
  constructor(message = "Today's Rashi Bhavishya could not be prepared right now. Please try again in a few minutes.") {
    super(message, 503, 'RASHI_BHAVISHYA_UNAVAILABLE');
  }
}

const MOON_RASHI_CONFIG: AstrologyConfig = {
  zodiacType: 'SIDEREAL',
  ayanamsa: 'LAHIRI',
  houseSystem: 'WHOLE_SIGN',
  nodeCalculation: 'MEAN_NODE',
  planetaryCalculationMode: 'GEOCENTRIC',
  precisionDegrees: 0.0001,
  roundingRule: 'NEAREST',
  dashaSystem: 'VIMSHOTTARI',
};

export interface RashiBhavishyaServiceDeps {
  calculator?: ChartCalculator;
  engine?: RashiGocharaEngine;
  store?: RashiHoroscopeStore;
  /** Narrator used for on-demand generation inside a request (short retries). */
  requestNarrator?: RashiNarrator | null;
  /** Narrator used by the background job (full retries/backoff). */
  jobNarrator?: RashiNarrator | null;
  now?: () => Date;
}

function defaultNarrator(kind: 'request' | 'job'): RashiNarrator | null {
  const provider: IAiProvider = new GeminiAiProvider();
  if (!provider.isConfigured) {
    if (kind === 'request') {
      logger.warn('[RashiBhavishya] GEMINI_API_KEY is not configured; serving deterministic plain-wording horoscopes only');
    }
    return null;
  }
  return new RashiNarrator(
    provider,
    kind === 'request'
      ? { config: { maxTransportRetries: 1, backoffBaseMs: 2000, timeoutMs: 60000 }, maxCheckAttempts: 1 }
      : { maxCheckAttempts: 2 }
  );
}

export class RashiBhavishyaService {
  private readonly calculator: ChartCalculator;
  private readonly engine: RashiGocharaEngine;
  private readonly store: RashiHoroscopeStore;
  private readonly requestNarrator: RashiNarrator | null;
  private readonly jobNarrator: RashiNarrator | null;
  private readonly now: () => Date;
  /** Single-flight per key inside this process. */
  private readonly inFlight = new Map<string, Promise<StoredHoroscope>>();
  /** The sky is identical for all 12 signs of a date. */
  private readonly skyCache = new Map<string, Promise<DailySky>>();
  /** On-demand failures: key → epoch ms until which requests fail fast. */
  private readonly failedUntil = new Map<string, number>();

  constructor(deps: RashiBhavishyaServiceDeps = {}) {
    this.calculator = deps.calculator ?? new ChartCalculator();
    this.engine = deps.engine ?? new RashiGocharaEngine();
    this.store = deps.store ?? new PrismaRashiHoroscopeStore();
    this.requestNarrator = deps.requestNarrator !== undefined ? deps.requestNarrator : defaultNarrator('request');
    this.jobNarrator = deps.jobNarrator !== undefined ? deps.jobNarrator : defaultNarrator('job');
    this.now = deps.now ?? (() => new Date());
  }

  todayIst(): string {
    return istDateOf(this.now());
  }

  /**
   * Resolves the Moon sign from the query or the user's birth profile.
   * Never defaults to an arbitrary rashi: unresolvable input is an explicit error.
   */
  public async resolveRashi(
    userId: string | undefined,
    query?: RashiBhavishyaQuery
  ): Promise<{ index: number; from: RashiBhavishyaDto['resolvedFrom'] }> {
    if (query?.rashiIndex) return { index: query.rashiIndex, from: 'rashiIndex' };

    if (query?.rashi) {
      const targetName = query.rashi.trim().toLowerCase();
      const matched = RASHIS.find((r) => r.sanskritName.toLowerCase() === targetName || r.englishName.toLowerCase() === targetName);
      if (!matched) {
        throw new ValidationError(`Unknown rashi "${query.rashi}"`, [{ field: 'rashi', message: 'Must be a valid Sanskrit or English rashi name' }]);
      }
      return { index: matched.index, from: 'rashi' };
    }

    if (!userId) {
      throw new AuthenticationError('Sign in to use your birth profile, or select a rashi.');
    }

    const userProfile = query?.profileId
      ? await prisma.birthProfile.findFirst({ where: { id: query.profileId, userId } })
      : await prisma.birthProfile.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (!userProfile) {
      throw new NotFoundError(
        query?.profileId ? 'Birth profile not found.' : 'No birth profile found. Create a birth profile or select a rashi.'
      );
    }

    let moonRashiIndex: number | undefined;
    try {
      const birthDetails = mapBirthProfileToBirthDetails(userProfile);
      const chart = await this.calculator.calculateChart(birthDetails, MOON_RASHI_CONFIG);
      moonRashiIndex = chart.planets.MOON?.rashiIndex;
    } catch {
      moonRashiIndex = undefined;
    }
    if (!moonRashiIndex) {
      throw new AppError('Could not calculate your Moon rashi from the birth profile. Please verify your birth details.', 422, 'MOON_RASHI_CALCULATION_FAILED');
    }
    return { index: moonRashiIndex, from: 'birthProfile' };
  }

  /** Dates the API serves: today−7 … tomorrow (IST). Generation happens only for today and tomorrow. */
  private checkDate(date: string): { canGenerate: boolean } {
    const today = this.todayIst();
    const tomorrow = addDays(today, 1);
    if (date > tomorrow || date < addDays(today, -PAST_DAYS_SERVED)) {
      throw new ValidationError(`Date must be between ${addDays(today, -PAST_DAYS_SERVED)} and ${tomorrow}`, [
        { field: 'date', message: 'Outside the served range' },
      ]);
    }
    return { canGenerate: date === today || date === tomorrow };
  }

  /**
   * Stored validated narrative if present; otherwise an on-demand LLM generation (today/tomorrow only).
   * If the narrative cannot be produced (no provider, provider/validation failure, cooldown, store
   * unreachable), the deterministic facts are served with plain template wording instead of an error.
   */
  public async getTodayPrediction(userId: string | undefined, query?: RashiBhavishyaQuery): Promise<RashiBhavishyaResponseDto> {
    const date = query?.date ?? this.todayIst();
    const { canGenerate } = this.checkDate(date);
    const rashi = await this.resolveRashi(userId, query);

    let storeAvailable = true;
    try {
      const existing = await this.store.find(this.key(date, rashi.index));
      if (existing) return { data: this.toDto(existing, rashi.from) };
    } catch (err) {
      // e.g. the rashi_daily_horoscopes migration is not applied. Do not call the LLM when its result cannot be kept.
      storeAvailable = false;
      logger.error({ date, rashiIndex: rashi.index, err: err instanceof Error ? err.message.slice(0, 300) : String(err) }, '[RashiBhavishya] Store unavailable');
    }

    if (canGenerate && storeAvailable && this.requestNarrator) {
      try {
        const stored = await this.getOrGenerate(date, rashi.index, this.requestNarrator, 'request');
        return { data: this.toDto(stored, rashi.from) };
      } catch {
        // Already logged in generate(); fall through to the deterministic wording.
      }
    }
    return { data: await this.plainDto(date, rashi.index, rashi.from) };
  }

  /** The day's deterministic facts with plain template wording (no LLM, not stored). */
  private async plainDto(date: string, rashiIndex: number, resolvedFrom: RashiBhavishyaDto['resolvedFrom']): Promise<RashiBhavishyaDto> {
    let facts: RashiDailyFacts;
    try {
      facts = await this.computeFacts(date, rashiIndex);
    } catch (err) {
      logger.error({ date, rashiIndex, err: err instanceof Error ? err.message : String(err) }, '[RashiBhavishya] Fact calculation failed');
      throw new RashiBhavishyaUnavailableError();
    }
    const dto = this.toDto(
      {
        ...this.key(date, rashiIndex),
        promptVersion: RASHI_PLAIN_VERSION,
        factsHash: '',
        facts,
        narrative: buildPlainNarrative(facts),
        provider: 'deterministic',
        model: 'none',
        generationId: '',
        tokens: { input: 0, output: 0, thinking: 0 },
        latencyMs: 0,
        createdAt: this.now(),
      },
      resolvedFrom
    );
    return { ...dto, narrativeSource: 'deterministic' };
  }

  /** Every sign already prepared for the date; never generates inside the request. */
  public async getAllPredictions(date?: string): Promise<{ data: { date: string; items: RashiBhavishyaDto[]; unavailableRashiIndexes: number[] } }> {
    const target = date ?? this.todayIst();
    this.checkDate(target);
    let rows: StoredHoroscope[];
    try {
      rows = await this.store.listForDate(target, RASHI_LANGUAGE, RASHI_METHOD_VERSION, RASHI_NARRATIVE_VERSION);
    } catch (err) {
      logger.error({ date: target, err: err instanceof Error ? err.message.slice(0, 300) : String(err) }, '[RashiBhavishya] Store unavailable');
      throw new RashiBhavishyaUnavailableError();
    }
    if (rows.length === 0) throw new RashiBhavishyaUnavailableError('Rashi Bhavishya for this date has not been prepared yet. Please try again later.');
    const have = new Set(rows.map((r) => r.rashiIndex));
    return {
      data: {
        date: target,
        items: rows.map((r) => this.toDto(r, 'rashiIndex')),
        unavailableRashiIndexes: RASHIS.map((r) => r.index).filter((i) => !have.has(i)),
      },
    };
  }

  /** Background job entry: prepares every missing sign of a date. Returns per-sign outcome. */
  public async ensureDate(date: string): Promise<{ generated: number[]; existing: number[]; failed: Array<{ rashiIndex: number; error: string }> }> {
    const result = { generated: [] as number[], existing: [] as number[], failed: [] as Array<{ rashiIndex: number; error: string }> };
    for (const r of RASHIS) {
      const key = this.key(date, r.index);
      if (await this.store.find(key)) {
        result.existing.push(r.index);
        continue;
      }
      try {
        await this.getOrGenerate(date, r.index, this.jobNarrator, 'job');
        result.generated.push(r.index);
      } catch (err) {
        result.failed.push({ rashiIndex: r.index, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return result;
  }

  /** Deterministic facts for a sign and date (no LLM). */
  public async computeFacts(date: string, rashiIndex: number): Promise<RashiDailyFacts> {
    let sky = this.skyCache.get(date);
    if (!sky) {
      sky = this.engine.computeDailySky(date);
      this.skyCache.set(date, sky);
      sky.catch(() => this.skyCache.delete(date));
      if (this.skyCache.size > 8) this.skyCache.delete(this.skyCache.keys().next().value as string);
    }
    return factsForRashi(await sky, rashiIndex);
  }

  private key(date: string, rashiIndex: number) {
    return { date, rashiIndex, language: RASHI_LANGUAGE, methodVersion: RASHI_METHOD_VERSION, promptVersion: RASHI_NARRATIVE_VERSION };
  }

  private async getOrGenerate(date: string, rashiIndex: number, narrator: RashiNarrator | null, mode: 'request' | 'job'): Promise<StoredHoroscope> {
    const key = this.key(date, rashiIndex);
    const existing = await this.store.find(key);
    if (existing) return existing;
    if (!narrator) {
      throw new RashiBhavishyaUnavailableError(
        this.requestNarrator || this.jobNarrator
          ? 'Rashi Bhavishya for this date is not available.'
          : "Today's Rashi Bhavishya is not available: the narrative service is not configured."
      );
    }
    const flightKey = `${date}|${rashiIndex}`;
    const running = this.inFlight.get(flightKey);
    if (running) return running;
    const isRequest = mode === 'request';
    if (isRequest && (this.failedUntil.get(flightKey) ?? 0) > this.now().getTime()) {
      throw new RashiBhavishyaUnavailableError();
    }
    const job = this.generate(date, rashiIndex, narrator)
      .then((row) => {
        this.failedUntil.delete(flightKey);
        return row;
      })
      .catch((err) => {
        if (isRequest) this.failedUntil.set(flightKey, this.now().getTime() + ON_DEMAND_FAILURE_COOLDOWN_MS);
        throw err;
      })
      .finally(() => this.inFlight.delete(flightKey));
    this.inFlight.set(flightKey, job);
    return job;
  }

  private async generate(date: string, rashiIndex: number, narrator: RashiNarrator): Promise<StoredHoroscope> {
    let facts: RashiDailyFacts;
    try {
      facts = await this.computeFacts(date, rashiIndex);
    } catch (err) {
      logger.error({ date, rashiIndex, err: err instanceof Error ? err.message : String(err) }, '[RashiBhavishya] Fact calculation failed');
      throw new RashiBhavishyaUnavailableError();
    }
    try {
      const out = await narrator.generate(facts);
      const saved = await this.store.save({
        ...this.key(date, rashiIndex),
        factsHash: createHash('sha256').update(JSON.stringify(facts)).digest('hex').slice(0, 32),
        facts,
        narrative: out.narrative,
        provider: out.provider,
        model: out.model,
        generationId: out.generationId,
        tokens: out.tokens,
        latencyMs: out.latencyMs,
      });
      logger.info(
        { date, rashiIndex, provider: out.provider, model: out.model, tokens: out.tokens, latencyMs: out.latencyMs, attempts: out.attempts },
        '[RashiBhavishya] Narrative generated and stored'
      );
      return saved;
    } catch (err) {
      const details = err instanceof RashiNarrativeError ? err.details : [];
      logger.warn(
        { date, rashiIndex, err: err instanceof Error ? err.message.slice(0, 300) : String(err), details: details.slice(0, 5) },
        '[RashiBhavishya] Narrative could not be produced'
      );
      throw new RashiBhavishyaUnavailableError();
    }
  }

  private toDto(row: StoredHoroscope, resolvedFrom: RashiBhavishyaDto['resolvedFrom']): RashiBhavishyaDto {
    const f = row.facts;
    return {
      date: row.date,
      timezone: f.sky.timezone,
      rashi: f.rashi,
      resolvedFrom,
      facts: {
        reference: f.sky.reference,
        panchang: f.sky.panchang,
        moon: f.moon,
        planets: f.planets,
        events: f.sky.events,
        tally: f.tally,
      },
      prediction: { ...row.narrative, language: row.language },
      narrativeSource: 'validated-llm',
      method: f.method,
      generation: { provider: row.provider, model: row.model, promptVersion: row.promptVersion, generatedAt: row.createdAt.toISOString() },
      source: 'astro-sushil-gochara',
      isDevelopmentFixture: false,
    };
  }
}

export const rashiBhavishyaService = new RashiBhavishyaService();
