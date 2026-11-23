import { AppError } from '../../../errors/app-error';
import { logger } from '../../../utils/logger';
import {
  BASE_CURRENCY,
  RATE_SCALE,
  SupportedCurrency,
  rateToScaled,
  scaledRateToDecimalString,
} from './currency';

/** Rates as published by the provider: units of each currency per 1 INR. */
export interface ExchangeRateSnapshot {
  base: 'INR';
  rates: Record<string, number>;
  fetchedAt: string; // ISO timestamp
}

/** Source of INR-based rates. The only implementation that leaves the process is `ExchangeRateApiProvider`. */
export interface ExchangeRateProvider {
  fetchInrRates(): Promise<ExchangeRateSnapshot>;
}

export interface ExchangeRateCache {
  get(): Promise<ExchangeRateSnapshot | null>;
  set(snapshot: ExchangeRateSnapshot, ttlSeconds: number): Promise<void>;
}

/** The rate used for one order: fixed at order creation and stored with it. */
export interface RateQuote {
  currency: SupportedCurrency;
  /** Foreign units per 1 INR, scaled by 10^10. */
  rateScaled: bigint;
  /** Same value as decimal text, for storage. */
  rate: string;
  fetchedAt: string;
}

/** Website: `exchange_rates` Redis key, 24 hours. */
export const EXCHANGE_RATE_TTL_SECONDS = 24 * 60 * 60;

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/**
 * exchangerate-api.com v6, `latest/INR` (the website's provider). The API key is part of the URL,
 * so the URL is never logged.
 */
export class ExchangeRateApiProvider implements ExchangeRateProvider {
  constructor(
    private readonly apiKey: () => string | undefined = () => process.env.EXCHANGE_RATE_API_KEY,
    private readonly fetchImpl: FetchLike = (url) => fetch(url),
    private readonly now: () => Date = () => new Date()
  ) {}

  public async fetchInrRates(): Promise<ExchangeRateSnapshot> {
    const key = this.apiKey()?.trim();
    if (!key) {
      throw new AppError('Foreign-currency payments are not configured on this server.', 503, 'EXCHANGE_RATE_UNCONFIGURED');
    }
    let body: unknown;
    let ok = false;
    let status = 0;
    try {
      const response = await this.fetchImpl(`https://v6.exchangerate-api.com/v6/${encodeURIComponent(key)}/latest/INR`);
      ok = response.ok;
      status = response.status;
      body = await response.json();
    } catch {
      logger.error('Exchange rate provider request failed');
      throw new AppError('Exchange rates are temporarily unavailable.', 503, 'EXCHANGE_RATE_UNAVAILABLE');
    }
    const data = (body ?? {}) as { result?: unknown; conversion_rates?: unknown };
    if (!ok || data.result !== 'success' || typeof data.conversion_rates !== 'object' || data.conversion_rates === null) {
      logger.error({ status }, 'Exchange rate provider returned an unusable response');
      throw new AppError('Exchange rates are temporarily unavailable.', 503, 'EXCHANGE_RATE_UNAVAILABLE');
    }
    const rates: Record<string, number> = {};
    for (const [code, value] of Object.entries(data.conversion_rates as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) rates[code.toUpperCase()] = value;
    }
    return { base: 'INR', rates, fetchedAt: this.now().toISOString() };
  }
}

/** Fixed rates for tests and local development. Makes no network call. */
export class FakeExchangeRateProvider implements ExchangeRateProvider {
  public calls = 0;
  constructor(
    private rates: Record<string, number>,
    private readonly fetchedAt: string = '2026-01-01T00:00:00.000Z'
  ) {}

  public setRates(rates: Record<string, number>): void {
    this.rates = rates;
  }

  public async fetchInrRates(): Promise<ExchangeRateSnapshot> {
    this.calls += 1;
    return { base: 'INR', rates: { ...this.rates }, fetchedAt: this.fetchedAt };
  }
}

/** Per-process cache. One API process serves the site, so this gives the website's "fetch once a day" behaviour. */
export class InMemoryExchangeRateCache implements ExchangeRateCache {
  private entry: { snapshot: ExchangeRateSnapshot; expiresAt: number } | null = null;
  constructor(private readonly nowMs: () => number = () => Date.now()) {}

  public async get(): Promise<ExchangeRateSnapshot | null> {
    if (!this.entry) return null;
    if (this.nowMs() >= this.entry.expiresAt) {
      this.entry = null;
      return null;
    }
    return this.entry.snapshot;
  }

  public async set(snapshot: ExchangeRateSnapshot, ttlSeconds: number): Promise<void> {
    this.entry = { snapshot, expiresAt: this.nowMs() + ttlSeconds * 1000 };
  }
}

export class ExchangeRateService {
  private inflight: Promise<ExchangeRateSnapshot> | null = null;

  constructor(
    private provider: ExchangeRateProvider,
    private cache: ExchangeRateCache,
    private readonly ttlSeconds: number = EXCHANGE_RATE_TTL_SECONDS
  ) {}

  /** Test seam: swap the provider and cache. */
  public configure(provider: ExchangeRateProvider, cache: ExchangeRateCache = new InMemoryExchangeRateCache()): void {
    this.provider = provider;
    this.cache = cache;
    this.inflight = null;
  }

  private async snapshot(): Promise<ExchangeRateSnapshot> {
    const cached = await this.cache.get();
    if (cached) return cached;
    if (!this.inflight) {
      this.inflight = (async () => {
        try {
          const fresh = await this.provider.fetchInrRates();
          await this.cache.set(fresh, this.ttlSeconds);
          return fresh;
        } finally {
          this.inflight = null;
        }
      })();
    }
    return this.inflight;
  }

  /**
   * The server-side rate for `currency`. INR is always exactly 1 and needs no provider.
   * A currency the provider has no positive rate for is an error, never rate 1.
   */
  public async getQuote(currency: SupportedCurrency): Promise<RateQuote> {
    if (currency === BASE_CURRENCY) {
      return { currency, rateScaled: RATE_SCALE, rate: scaledRateToDecimalString(RATE_SCALE), fetchedAt: new Date().toISOString() };
    }
    const snapshot = await this.snapshot();
    const raw = snapshot.rates[currency];
    if (typeof raw !== 'number') {
      throw new AppError(`No exchange rate is available for ${currency}.`, 503, 'EXCHANGE_RATE_UNAVAILABLE');
    }
    const rateScaled = rateToScaled(raw);
    return { currency, rateScaled, rate: scaledRateToDecimalString(rateScaled), fetchedAt: snapshot.fetchedAt };
  }
}

export const exchangeRateService = new ExchangeRateService(new ExchangeRateApiProvider(), new InMemoryExchangeRateCache());
