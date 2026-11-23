import { nativeRedisClient } from '../../services/redis-client';
import { logger } from '../../utils/logger';

/**
 * Read cache for public content (banners per page, SEO meta per page) and the per-IP counter for
 * the public contact form.
 *
 * When Redis is configured it is the only store, so a delete on an admin write is seen by every API
 * process at once. Without Redis (local development, tests) the same calls use this process's
 * memory; entries then live for at most LOCAL_MAX_TTL_MS, which bounds how long another process
 * could serve a value that was invalidated elsewhere.
 *
 * Every Redis failure is treated as a miss: a cache outage never fails a request.
 */

export interface KeyValueStore {
  readonly isConfigured: boolean;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
}

const LOCAL_MAX_TTL_MS = 60_000;
const LOCAL_MAX_ENTRIES = 5_000;

const SET_WITH_TTL_SCRIPT = "return redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2])";

/** Counts a hit in a fixed window; the window starts at the first hit. Returns the new count. */
const FIXED_WINDOW_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return count
`;

interface LocalEntry {
  value: string;
  expiresAt: number;
}

interface LocalCounter {
  count: number;
  resetAt: number;
}

export class ContentCache {
  private readonly local = new Map<string, LocalEntry>();
  private readonly counters = new Map<string, LocalCounter>();

  constructor(
    private readonly store: KeyValueStore = nativeRedisClient,
    private readonly now: () => number = () => Date.now()
  ) {}

  public async get<T>(key: string): Promise<T | null> {
    const raw = this.store.isConfigured ? await this.safeGet(key) : this.localGet(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.store.isConfigured) {
      try {
        await this.store.eval(SET_WITH_TTL_SCRIPT, 1, key, raw, ttlMs);
      } catch (err) {
        logger.warn({ key, err: err instanceof Error ? err.message : String(err) }, '[content] cache write failed');
      }
      return;
    }
    if (this.local.size >= LOCAL_MAX_ENTRIES) this.evictExpired();
    if (this.local.size >= LOCAL_MAX_ENTRIES) this.local.clear();
    this.local.set(key, { value: raw, expiresAt: this.now() + Math.min(ttlMs, LOCAL_MAX_TTL_MS) });
  }

  public async del(...keys: string[]): Promise<void> {
    for (const key of keys) {
      this.local.delete(key);
      if (this.store.isConfigured) {
        try {
          await this.store.del(key);
        } catch (err) {
          logger.warn({ key, err: err instanceof Error ? err.message : String(err) }, '[content] cache delete failed');
        }
      }
    }
  }

  /**
   * Counts one hit for `key` in a fixed window and returns the count including this hit.
   * If Redis is configured but failing, the in-process counter is used so the limit still holds
   * per process instead of disappearing.
   */
  public async hit(key: string, windowMs: number): Promise<number> {
    if (this.store.isConfigured) {
      try {
        const count = Number(await this.store.eval(FIXED_WINDOW_SCRIPT, 1, key, windowMs));
        if (Number.isFinite(count) && count > 0) return count;
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : String(err) }, '[content] rate-limit counter unavailable, using process memory');
      }
    }
    return this.localHit(key, windowMs);
  }

  /** Test helper: forgets everything held in process memory. */
  public clearLocal(): void {
    this.local.clear();
    this.counters.clear();
  }

  private async safeGet(key: string): Promise<string | null> {
    try {
      return await this.store.get(key);
    } catch {
      return null;
    }
  }

  private localGet(key: string): string | null {
    const entry = this.local.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.local.delete(key);
      return null;
    }
    return entry.value;
  }

  private localHit(key: string, windowMs: number): number {
    const now = this.now();
    const current = this.counters.get(key);
    if (!current || current.resetAt <= now) {
      if (this.counters.size >= LOCAL_MAX_ENTRIES) {
        for (const [k, counter] of this.counters) {
          if (counter.resetAt <= now) this.counters.delete(k);
        }
        if (this.counters.size >= LOCAL_MAX_ENTRIES) this.counters.clear();
      }
      this.counters.set(key, { count: 1, resetAt: now + windowMs });
      return 1;
    }
    current.count += 1;
    return current.count;
  }

  private evictExpired(): void {
    const now = this.now();
    for (const [key, entry] of this.local) {
      if (entry.expiresAt <= now) this.local.delete(key);
    }
  }
}

export const contentCache = new ContentCache();

/** Banners per page: 24 hours, as on the website; every banner write deletes all page keys. */
export const BANNER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** SEO meta per page: 10 minutes, as on the website; every SEO write deletes the affected names. */
export const SEO_CACHE_TTL_MS = 10 * 60 * 1000;

export const bannerCacheKey = (page: string): string => `content:banners:frontend:${page}`;
export const seoCacheKey = (name: string): string => `content:seo:${name}`;
