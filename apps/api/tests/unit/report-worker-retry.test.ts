/**
 * Worker retry handling without a database: the queue's fenced SQL operations
 * and notifications are substituted, the decision logic runs for real.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '../../src/services/prisma.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { careerReportWorker, classifyIncompleteManifest, AttemptContext, attemptTimeoutMs, CareerReportWorker } from '../../src/services/report-worker.service';
import { fakePlatformResult } from '../helpers/platform-report-stub';

const deadline = new Date('2026-11-19T10:00:00Z');
const attempt = (failedAttempts = 0): AttemptContext => ({ reportId: 'rep-1', claimToken: 'tok', claimVersion: 3, failedAttempts, deadline });

describe('report worker retry handling', () => {
  let reschedule: any;
  let failJob: any;

  beforeEach(() => {
    reschedule = vi.spyOn(postgresQueueService, 'rescheduleJob').mockResolvedValue(true);
    failJob = vi.spyOn(careerReportWorker, 'failJob').mockResolvedValue(true);
    vi.spyOn(prisma.report, 'updateMany').mockResolvedValue({ count: 1 } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reschedules a transient failure instead of failing the report', async () => {
    const now = new Date('2026-11-18T11:00:00Z');
    const outcome = await careerReportWorker.handleAttemptFailure(attempt(0), 'GENERATION_INCOMPLETE', 'topic x failed', undefined, now);
    expect(outcome).toBe('rescheduled');
    expect(reschedule).toHaveBeenCalledWith('rep-1', 'tok', 3, new Date(now.getTime() + 15 * 60 * 1000), 'GENERATION_INCOMPLETE', 'topic x failed');
    expect(failJob).not.toHaveBeenCalled();
  });

  it('uses the recorded failure count for backoff (4th failure waits 2h)', async () => {
    const now = new Date('2026-11-18T11:00:00Z');
    await careerReportWorker.handleAttemptFailure(attempt(3), 'ATTEMPT_TIMEOUT', 'timed out', undefined, now);
    expect(reschedule.mock.calls[0][3]).toEqual(new Date(now.getTime() + 2 * 60 * 60 * 1000));
  });

  it('fails a permanent error immediately with the clear input message', async () => {
    const outcome = await careerReportWorker.handleAttemptFailure(attempt(0), 'PARTNER_PROFILE_NOT_FOUND', 'Partner birth profile not found.', 'Partner birth profile not found.', new Date('2026-11-18T11:00:00Z'));
    expect(outcome).toBe('failed');
    expect(reschedule).not.toHaveBeenCalled();
    expect(failJob).toHaveBeenCalledWith('rep-1', 'PARTNER_PROFILE_NOT_FOUND', 'Partner birth profile not found.', 'tok', 3);
  });

  it('fails a transient error after the delivery deadline', async () => {
    const outcome = await careerReportWorker.handleAttemptFailure(attempt(7), 'GENERATION_INCOMPLETE', 'still failing', undefined, new Date('2026-11-19T10:01:00Z'));
    expect(outcome).toBe('failed');
    expect(failJob.mock.calls[0][1]).toBe('GENERATION_INCOMPLETE');
    expect(String(failJob.mock.calls[0][2])).toContain('delivery time');
  });

  it('reports a lost claim as skipped (fencing kept)', async () => {
    reschedule.mockResolvedValueOnce(false);
    expect(await careerReportWorker.handleAttemptFailure(attempt(0), 'PDF_RENDER_FAILED', 'x', undefined, new Date('2026-11-18T11:00:00Z'))).toBe('skipped');
  });
});

describe('classifyIncompleteManifest', () => {
  it('treats failed narrative topics as transient GENERATION_INCOMPLETE', () => {
    const { manifest } = fakePlatformResult('LOVE', 'partial');
    expect(classifyIncompleteManifest(manifest, true).code).toBe('GENERATION_INCOMPLETE');
  });

  it('treats a missing PDF as transient PDF_RENDER_FAILED', () => {
    const { manifest } = fakePlatformResult('LOVE', 'failed');
    expect(classifyIncompleteManifest(manifest, false).code).toBe('PDF_RENDER_FAILED');
  });

  it('treats missing chart evidence or a failed data block as permanent REPORT_DATA_UNAVAILABLE', () => {
    const { manifest } = fakePlatformResult('LOVE', 'partial');
    const skipped = { ...manifest, topics: [{ ...manifest.topics[0], status: 'skipped-missing-evidence' }] } as typeof manifest;
    expect(classifyIncompleteManifest(skipped, true).code).toBe('REPORT_DATA_UNAVAILABLE');
    const dataFailed = { ...manifest, topics: [{ ...manifest.topics[0], provenance: 'deterministic' }] } as typeof manifest;
    expect(classifyIncompleteManifest(dataFailed, true).code).toBe('REPORT_DATA_UNAVAILABLE');
  });
});

describe('worker configuration', () => {
  const original = process.env.REPORT_ATTEMPT_TIMEOUT_MS;
  afterEach(() => {
    if (original === undefined) delete process.env.REPORT_ATTEMPT_TIMEOUT_MS;
    else process.env.REPORT_ATTEMPT_TIMEOUT_MS = original;
  });

  it('never allows the attempt time limit above 10 minutes', () => {
    process.env.REPORT_ATTEMPT_TIMEOUT_MS = String(60 * 60 * 1000);
    expect(attemptTimeoutMs()).toBe(10 * 60 * 1000);
    process.env.REPORT_ATTEMPT_TIMEOUT_MS = '5000';
    expect(attemptTimeoutMs()).toBe(5000);
  });

  it('supports exactly the platform report types', () => {
    expect(CareerReportWorker.SUPPORTED_REPORT_TYPES).toContain('CAREER_PROSITY');
    expect(CareerReportWorker.SUPPORTED_REPORT_TYPES).toContain('PLANETARY_SUMMARY');
    expect(CareerReportWorker.SUPPORTED_REPORT_TYPES).not.toContain('CHILDBIRTH_FAMILY');
    expect(CareerReportWorker.SUPPORTED_REPORT_TYPES).not.toContain('GUPTA_NADI_DOSSIER');
  });
});

describe('executeReportPipeline attempt limit and delivery rules', () => {
  const report = {
    id: 'rep-2', userId: 'usr-1', birthProfileId: 'bp-1', orderId: null, fulfillmentUnitId: null, reportType: 'LOVE',
    createdAt: new Date(), expectedDeliveryAt: new Date(Date.now() + 24 * 60 * 60 * 1000), generationFailures: 0, metadata: {},
    birthProfile: { name: 'Test Native', dateOfBirth: '1990-01-01', timeOfBirth: '10:00', latitude: 18.5, longitude: 73.8, timezone: 'Asia/Kolkata', placeName: 'Pune' },
    order: null,
  };
  let reschedule: any;

  beforeEach(() => {
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue(report as any);
    vi.spyOn(prisma.report, 'update').mockResolvedValue(report as any);
    vi.spyOn(prisma.report, 'updateMany').mockResolvedValue({ count: 1 } as any);
    vi.spyOn(postgresQueueService, 'updateJobStatus').mockResolvedValue(true);
    vi.spyOn(postgresQueueService, 'touchHeartbeat').mockResolvedValue(true);
    reschedule = vi.spyOn(postgresQueueService, 'rescheduleJob').mockResolvedValue(true);
  });

  afterEach(() => {
    delete process.env.REPORT_ATTEMPT_TIMEOUT_MS;
    vi.restoreAllMocks();
  });

  it('abandons an attempt at the time limit, cancels generation and reschedules it', async () => {
    process.env.REPORT_ATTEMPT_TIMEOUT_MS = '50';
    let signal: AbortSignal | undefined;
    vi.spyOn(careerReportWorker, 'generatePlatformReport').mockImplementation((input) => {
      signal = input.signal;
      return new Promise(() => undefined); // never settles
    });
    const failJob = vi.spyOn(careerReportWorker, 'failJob').mockResolvedValue(true);

    await careerReportWorker.executeReportPipeline('rep-2', 'tok', 1);

    expect(signal?.aborted).toBe(true);
    expect(reschedule).toHaveBeenCalledTimes(1);
    expect(reschedule.mock.calls[0][4]).toBe('ATTEMPT_TIMEOUT');
    expect(failJob).not.toHaveBeenCalled();
  });

  it('never delivers a partial report: it is rescheduled and nothing is uploaded', async () => {
    vi.spyOn(careerReportWorker, 'generatePlatformReport').mockResolvedValue(fakePlatformResult('LOVE', 'partial'));
    const complete = vi.spyOn(postgresQueueService, 'completeJob').mockResolvedValue(true);

    await careerReportWorker.executeReportPipeline('rep-2', 'tok', 1);

    expect(complete).not.toHaveBeenCalled();
    expect(reschedule.mock.calls[0][4]).toBe('GENERATION_INCOMPLETE');
  });

  it('fails a report type without a genuine generator permanently', async () => {
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({ ...report, reportType: 'GUPTA_NADI_DOSSIER' } as any);
    const generate = vi.spyOn(careerReportWorker, 'generatePlatformReport');
    const failJob = vi.spyOn(careerReportWorker, 'failJob').mockResolvedValue(true);

    await careerReportWorker.executeReportPipeline('rep-2', 'tok', 1);

    expect(generate).not.toHaveBeenCalled();
    expect(reschedule).not.toHaveBeenCalled();
    expect(failJob.mock.calls[0][1]).toBe('REPORT_TYPE_NOT_AVAILABLE');
  });
});
