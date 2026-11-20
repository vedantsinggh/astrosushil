/**
 * Report generation progress during the LLM topic phase: mapping, throttled
 * monotonic writes, claim fencing, and the status-response detail line.
 * No database: the queue's fenced SQL operations are substituted.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '../../src/services/prisma.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { progressFromEvent, ThrottledProgressWriter, ProgressSnapshot } from '../../src/services/report-progress';
import { reportProgressDetail } from '../../src/modules/reports/reports.service';
import { storageService } from '../../src/services/storage.service';
import { notificationService } from '../../src/modules/notifications/notification.service';
import { fakePlatformResult } from '../helpers/platform-report-stub';

const narrative = (completedTopics: number, totalTopics = 60) => ({ phase: 'narrative' as const, completedTopics, totalTopics });

describe('progressFromEvent', () => {
  it('maps the LLM phase onto 15% → 80% with stage ANALYZING and a section detail', () => {
    expect(progressFromEvent(narrative(0))).toEqual({ status: 'ANALYZING', stage: 'ANALYZING', progress: 15, detail: 'Writing section 1 of 60' });
    expect(progressFromEvent(narrative(30))).toMatchObject({ progress: 48, detail: 'Writing section 31 of 60' });
    expect(progressFromEvent(narrative(60))).toMatchObject({ progress: 80, detail: 'Writing section 60 of 60' });
    // Out-of-range counts are clamped.
    expect(progressFromEvent(narrative(99))).toMatchObject({ progress: 80 });
    expect(progressFromEvent(narrative(0, 0))).toMatchObject({ progress: 80, detail: null });
  });

  it('maps the compile phase to COMPILING 85% with no detail', () => {
    expect(progressFromEvent({ phase: 'compile', completedTopics: 60, totalTopics: 60 })).toEqual({ status: 'COMPILING', stage: 'COMPILING', progress: 85, detail: null });
  });
});

describe('ThrottledProgressWriter', () => {
  let clock = 0;
  let writes: ProgressSnapshot[];
  let owner: boolean;
  const make = (interval = 4000) =>
    new ThrottledProgressWriter({
      minIntervalMs: interval,
      now: () => clock,
      isOwner: () => owner,
      write: async (s) => {
        writes.push(s);
        return true;
      },
    });
  const tick = async (ms: number) => {
    clock += ms;
    await vi.advanceTimersByTimeAsync(ms);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    clock = 0;
    writes = [];
    owner = true;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes a stage change at once, then throttles with a trailing write of the latest value', async () => {
    const w = make();
    w.update(progressFromEvent(narrative(0)));
    await w.idle();
    expect(writes.map((s) => s.progress)).toEqual([15]);

    // A burst of cached topics: only the latest value lands, after the interval.
    for (let i = 1; i <= 20; i++) w.update(progressFromEvent(narrative(i)));
    await tick(1000);
    expect(writes).toHaveLength(1);
    await tick(3000);
    expect(writes.map((s) => s.progress)).toEqual([15, progressFromEvent(narrative(20)).progress]);

    // Stage change (compile) bypasses the throttle.
    w.update(progressFromEvent({ phase: 'compile', completedTopics: 60, totalTopics: 60 }));
    await w.idle();
    expect(writes[writes.length - 1]).toMatchObject({ stage: 'COMPILING', progress: 85 });
    expect(writes).toHaveLength(3);
  });

  it('never writes a lower progress than already reported (monotonic)', async () => {
    const w = make(0);
    const seen: number[] = [];
    for (const n of [0, 5, 3, 10, 10, 2, 60]) {
      w.update(progressFromEvent(narrative(n)));
      await w.flush();
    }
    for (const s of writes) seen.push(s.progress);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThan(seen[i - 1]);
    expect(seen[0]).toBe(15);
    expect(seen[seen.length - 1]).toBe(80);
  });

  it('writes nothing once ownership is lost or the writer is stopped', async () => {
    const w = make(0);
    owner = false;
    w.update(progressFromEvent(narrative(1)));
    await w.flush();
    expect(writes).toHaveLength(0);

    owner = true;
    w.stop();
    w.update(progressFromEvent(narrative(2)));
    await tick(10000);
    await w.flush();
    expect(writes).toHaveLength(0);
  });

  it('never has two writes in flight', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const w = new ThrottledProgressWriter({
      minIntervalMs: 0,
      now: () => clock,
      isOwner: () => true,
      write: async (s) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 50));
        writes.push(s);
        inFlight--;
        return true;
      },
    });
    for (let i = 0; i <= 10; i++) w.update(progressFromEvent(narrative(i, 10)));
    await tick(1000);
    await w.flush();
    expect(maxInFlight).toBe(1);
    expect(writes[writes.length - 1].progress).toBe(80);
  });
});

describe('worker progress during generation', () => {
  const report = {
    id: 'rep-3', userId: 'usr-1', birthProfileId: 'bp-1', orderId: null, fulfillmentUnitId: null, reportType: 'CAREER',
    createdAt: new Date(), expectedDeliveryAt: new Date(Date.now() + 24 * 60 * 60 * 1000), generationFailures: 0,
    metadata: { progressDetail: 'Writing section 40 of 60' },
    birthProfile: { name: 'Test Native', dateOfBirth: '1990-01-01', timeOfBirth: '10:00', latitude: 18.5, longitude: 73.8, timezone: 'Asia/Kolkata', placeName: 'Pune' },
    order: null,
  };
  let progressWrites: any[][];
  let statusWrites: any[][];
  let update: any;

  beforeEach(() => {
    process.env.REPORT_PROGRESS_WRITE_INTERVAL_MS = '60000'; // throttle everything except stage changes
    progressWrites = [];
    statusWrites = [];
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue(report as any);
    update = vi.spyOn(prisma.report, 'update').mockResolvedValue(report as any);
    vi.spyOn(prisma.report, 'updateMany').mockResolvedValue({ count: 1 } as any);
    vi.spyOn(postgresQueueService, 'touchHeartbeat').mockResolvedValue(true);
    vi.spyOn(postgresQueueService, 'rescheduleJob').mockResolvedValue(true);
    vi.spyOn(postgresQueueService, 'completeJob').mockResolvedValue(true);
    vi.spyOn(postgresQueueService, 'updateJobStatus').mockImplementation(async (...args: any[]) => {
      statusWrites.push(args);
      return true;
    });
    vi.spyOn(postgresQueueService, 'updateJobProgress').mockImplementation(async (...args: any[]) => {
      progressWrites.push(args);
      return true;
    });
    vi.spyOn(storageService, 'upload').mockResolvedValue({ fileSize: 4096 } as any);
    vi.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    delete process.env.REPORT_PROGRESS_WRITE_INTERVAL_MS;
    vi.restoreAllMocks();
  });

  it('writes fenced, monotonic ANALYZING progress (cached burst included), then COMPILING, then UPLOADING', async () => {
    vi.spyOn(careerReportWorker, 'generatePlatformReport').mockImplementation(async (input) => {
      input.onProgress!(narrative(0, 6));
      for (let i = 1; i <= 4; i++) input.onProgress!(narrative(i, 6)); // cached topics settle immediately
      await new Promise((r) => setTimeout(r, 5));
      input.onProgress!(narrative(6, 6));
      input.onProgress!({ phase: 'compile', completedTopics: 6, totalTopics: 6 });
      await new Promise((r) => setTimeout(r, 5));
      return fakePlatformResult('CAREER', 'completed');
    });

    await careerReportWorker.executeReportPipeline('rep-3', 'tok-3', 7);

    // Every progress write is fenced to the current claim.
    expect(progressWrites.length).toBeGreaterThan(0);
    for (const w of progressWrites) expect(w.slice(0, 3)).toEqual(['rep-3', 'tok-3', 7]);
    // Throttled: the 5 rapid narrative events collapse into the first write; the compile stage change is immediate.
    expect(progressWrites.map((w) => [w[4], w[5]])).toEqual([['ANALYZING', 15], ['COMPILING', 85]]);
    expect(progressWrites[0][6]).toBe('Writing section 1 of 6');

    const progresses = [...statusWrites.map((w) => ({ at: w[4], p: w[5] }))];
    expect(progresses[0]).toEqual({ at: 'CALCULATING', p: 15 });
    expect(progresses[progresses.length - 1]).toEqual({ at: 'UPLOADING', p: 95 });
    // The stale detail from an earlier attempt is cleared with the manifest.
    expect(update.mock.calls[0][0].data.metadata.progressDetail).toBeUndefined();
  });

  it('evaluates the report on the IST business date of the order, not its UTC date', async () => {
    // 2026-11-20 02:00 IST = 2026-11-19 20:30 UTC: the report date must be 2026-11-20.
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({ ...report, createdAt: new Date('2026-11-19T20:30:00Z') } as any);
    let asOf: Date | undefined;
    vi.spyOn(careerReportWorker, 'generatePlatformReport').mockImplementation(async (input) => {
      asOf = input.asOf;
      return fakePlatformResult('CAREER', 'completed');
    });

    await careerReportWorker.executeReportPipeline('rep-3', 'tok-3', 7);

    expect(asOf?.toISOString()).toBe('2026-11-20T00:00:00.000Z');
  });
});

describe('reportProgressDetail', () => {
  it('returns the detail only while the LLM phase is running', () => {
    const meta = { progressDetail: 'Writing section 23 of 60' };
    expect(reportProgressDetail({ status: 'ANALYZING', stage: 'ANALYZING', metadata: meta })).toBe('Writing section 23 of 60');
    expect(reportProgressDetail({ status: 'CALCULATING', stage: 'CALCULATING', metadata: meta })).toBeNull();
    expect(reportProgressDetail({ status: 'COMPLETED', stage: 'COMPLETED', metadata: meta })).toBeNull();
    expect(reportProgressDetail({ status: 'ANALYZING', stage: 'ANALYZING', metadata: null })).toBeNull();
    expect(reportProgressDetail({ status: 'ANALYZING', stage: 'ANALYZING', metadata: { progressDetail: 5 } })).toBeNull();
  });
});
