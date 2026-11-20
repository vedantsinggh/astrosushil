/**
 * Maps report-platform progress events onto the customer-visible report
 * stage/progress and writes them with throttling. Presentation only: it never
 * changes what is generated, and it never decides ownership (the heartbeat and
 * the fenced stage updates do).
 */
import type { ReportStatus } from '@prisma/client';
import type { reportPlatform } from '@astro/report-engine';

export interface ProgressSnapshot {
  status: ReportStatus;
  stage: string;
  progress: number;
  detail: string | null;
}

/** LLM narrative phase spans 15% → 80%; PDF compile shows 85%; upload stays 95% (worker). */
export const NARRATIVE_PROGRESS_START = 15;
export const NARRATIVE_PROGRESS_END = 80;
export const COMPILE_PROGRESS = 85;

export function progressFromEvent(event: reportPlatform.ReportProgressEvent): ProgressSnapshot {
  if (event.phase === 'compile') {
    return { status: 'COMPILING', stage: 'COMPILING', progress: COMPILE_PROGRESS, detail: null };
  }
  const total = Math.max(0, event.totalTopics);
  const done = Math.min(Math.max(0, event.completedTopics), total);
  const fraction = total === 0 ? 1 : done / total;
  const progress = Math.round(NARRATIVE_PROGRESS_START + (NARRATIVE_PROGRESS_END - NARRATIVE_PROGRESS_START) * fraction);
  // "Writing section 23 of 60": the section currently being written (capped at the total).
  const detail = total > 0 ? `Writing section ${Math.min(done + 1, total)} of ${total}` : null;
  return { status: 'ANALYZING', stage: 'ANALYZING', progress, detail };
}

export interface ThrottledProgressWriterOptions {
  /** Fenced DB write; returns false when the row was not updated. */
  write: (snapshot: ProgressSnapshot) => Promise<boolean>;
  /** Skip writing once ownership is known to be lost. */
  isOwner: () => boolean;
  /** Minimum time between writes within the same stage (default 4s). */
  minIntervalMs?: number;
  now?: () => number;
}

/**
 * Throttled, monotonic progress writer for one generation attempt.
 * - progress never decreases (a lower value is ignored);
 * - a stage change is written immediately; within a stage, at most one write per
 *   `minIntervalMs`, with a trailing write so the latest value always lands;
 * - writes are serialised (never two in flight) and stop once ownership is lost.
 */
export class ThrottledProgressWriter {
  private readonly minIntervalMs: number;
  private readonly now: () => number;
  private latest: ProgressSnapshot | undefined;
  private lastWritten: ProgressSnapshot | undefined;
  private lastWriteAt = -Infinity;
  private inFlight: Promise<void> | undefined;
  private timer: NodeJS.Timeout | undefined;
  private stopped = false;

  constructor(private readonly opts: ThrottledProgressWriterOptions) {
    this.minIntervalMs = opts.minIntervalMs ?? 4000;
    this.now = opts.now ?? (() => Date.now());
  }

  /** Record a new progress value (sync; the DB write happens in the background). */
  update(next: ProgressSnapshot): void {
    if (this.stopped) return;
    const floor = this.latest?.progress ?? 0;
    if (next.progress < floor) return; // monotonic within an attempt
    if (this.latest && sameSnapshot(this.latest, next)) return;
    this.latest = next;
    this.schedule();
  }

  /** Write any pending value now (waits for an in-flight write first). */
  async flush(): Promise<void> {
    while (this.inFlight) await this.inFlight;
    this.clearTimer();
    if (this.isPending()) await this.writeNow();
  }

  /** Stop writing (end of attempt). Pending values are dropped. */
  stop(): void {
    this.stopped = true;
    this.clearTimer();
  }

  /** Waits for the in-flight write, if any (for tests and orderly shutdown). */
  async idle(): Promise<void> {
    while (this.inFlight) await this.inFlight;
  }

  private isPending(): boolean {
    return Boolean(this.latest && (!this.lastWritten || !sameSnapshot(this.latest, this.lastWritten)));
  }

  private schedule(): void {
    if (this.stopped || !this.isPending()) return;
    if (this.inFlight) return; // the in-flight write reschedules when it settles
    const stageChanged = !this.lastWritten || this.lastWritten.stage !== this.latest!.stage;
    const wait = stageChanged ? 0 : this.lastWriteAt + this.minIntervalMs - this.now();
    if (wait <= 0) {
      this.clearTimer();
      void this.writeNow();
      return;
    }
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.schedule();
    }, wait);
    if (this.timer.unref) this.timer.unref();
  }

  private writeNow(): Promise<void> {
    if (this.stopped || !this.latest || !this.opts.isOwner()) return Promise.resolve();
    const snapshot = this.latest;
    this.lastWriteAt = this.now();
    const run = (async () => {
      try {
        await this.opts.write(snapshot);
      } catch {
        // cosmetic write; the heartbeat remains the ownership authority
      }
      this.lastWritten = snapshot;
    })();
    this.inFlight = run;
    return run.finally(() => {
      if (this.inFlight === run) this.inFlight = undefined;
      this.schedule();
    });
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
}

function sameSnapshot(a: ProgressSnapshot, b: ProgressSnapshot): boolean {
  return a.status === b.status && a.stage === b.stage && a.progress === b.progress && a.detail === b.detail;
}
