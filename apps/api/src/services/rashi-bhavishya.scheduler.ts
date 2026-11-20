/**
 * Background preparation of the daily Rashi Bhavishya (12 Moon signs per day).
 *
 * Runs in the worker process. Every tick it makes sure today's 12 signs exist
 * (catch-up) and, from PREPARE_TOMORROW_AFTER_IST_HOUR onwards, tomorrow's 12.
 * Signs that fail are retried on later ticks with a per-date backoff
 * (15 min, 30 min, 1 h, then every 2 h). Stored rows are never regenerated, so a
 * normal day costs exactly 12 LLM calls. Generation is idempotent (unique key +
 * upsert), so a second worker instance can at most duplicate a call, never content.
 */
import { RashiBhavishyaService, rashiBhavishyaService } from '../modules/rashi-bhavishya/rashi-bhavishya.service';
import { addDays, istParts } from '../modules/rashi-bhavishya/rashi-gochara.engine';
import { logger } from '../utils/logger';

export const PREPARE_TOMORROW_AFTER_IST_HOUR = 18;
const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
const BACKOFF_MS = [15, 30, 60, 120].map((m) => m * 60 * 1000);

export interface RashiSchedulerOptions {
  intervalMs?: number;
  now?: () => Date;
}

export class RashiBhavishyaScheduler {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly failures = new Map<string, { count: number; nextAt: number }>();
  private readonly intervalMs: number;
  private readonly now: () => Date;

  constructor(private readonly service: RashiBhavishyaService = rashiBhavishyaService, options: RashiSchedulerOptions = {}) {
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.now = options.now ?? (() => new Date());
  }

  /** Dates that should exist at this moment (IST). */
  datesDue(): string[] {
    const { dateIst, timeIst } = istParts(this.now().toISOString());
    const hour = Number(timeIst.slice(0, 2));
    return hour >= PREPARE_TOMORROW_AFTER_IST_HOUR ? [dateIst, addDays(dateIst, 1)] : [dateIst];
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (const date of this.datesDue()) {
        const f = this.failures.get(date);
        if (f && this.now().getTime() < f.nextAt) continue;
        const res = await this.service.ensureDate(date);
        if (res.failed.length) {
          const count = (f?.count ?? 0) + 1;
          const delay = BACKOFF_MS[Math.min(count - 1, BACKOFF_MS.length - 1)];
          this.failures.set(date, { count, nextAt: this.now().getTime() + delay });
          logger.warn(
            { date, generated: res.generated, failed: res.failed.map((x) => x.rashiIndex), retryInMs: delay },
            '[RashiBhavishyaScheduler] Some signs could not be prepared; will retry'
          );
        } else {
          this.failures.delete(date);
          if (res.generated.length) logger.info({ date, generated: res.generated }, '[RashiBhavishyaScheduler] Signs prepared');
        }
      }
      // Forget backoff state of past dates.
      const due = new Set(this.datesDue());
      for (const d of [...this.failures.keys()]) if (!due.has(d)) this.failures.delete(d);
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, '[RashiBhavishyaScheduler] Tick failed');
    } finally {
      this.running = false;
    }
  }

  start(): void {
    if (this.timer) return;
    if (process.env.RASHI_BHAVISHYA_SCHEDULER_ENABLED === 'false') {
      logger.info('[RashiBhavishyaScheduler] Disabled by RASHI_BHAVISHYA_SCHEDULER_ENABLED=false');
      return;
    }
    logger.info({ intervalMs: this.intervalMs }, '[RashiBhavishyaScheduler] Starting daily Rashi Bhavishya preparation');
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}

export const rashiBhavishyaScheduler = new RashiBhavishyaScheduler();
