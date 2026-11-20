/**
 * Restart safety of report generation:
 *  - DB session time zone (regression: server TimeZone=Asia/Kolkata made SQL-written
 *    claim leases 5h30m "in the future" from Prisma's point of view);
 *  - start-up release of claims left by a previous boot of the same process;
 *  - graceful-shutdown claim release;
 *  - lease heartbeat extension during a long generation step;
 *  - a restart mid-generation ends in a completed report within the lease window.
 *
 * Generation is stubbed (no paid LLM, no xelatex); the queue SQL runs for real
 * against the local test database.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { PrismaClient, ReportStatus, ReportType, Role } from '@prisma/client';
import { prisma, withUtcSessionTimeZone } from '../../src/services/prisma.service';
import { postgresQueueService, MAX_PLAUSIBLE_LEASE_MINUTES } from '../../src/services/postgres-queue.service';
import { CareerReportWorker } from '../../src/services/report-worker.service';
import { storageService } from '../../src/services/storage.service';
import { notificationService } from '../../src/modules/notifications/notification.service';
import { instanceClaimPrefix, bootClaimPrefix } from '../../src/services/process-identity';
import { fakePlatformResult } from '../helpers/platform-report-stub';

const EMAIL = 'restart-safety-test@astrosushil.com';
const TEST_DB_URL = process.env.DATABASE_URL!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withSessionTimeZone(url: string, tz: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}options=${encodeURIComponent(`-c TimeZone=${tz}`)}`;
}

describe('withUtcSessionTimeZone', () => {
  it('adds the UTC option to a URL without a query string', () => {
    expect(withUtcSessionTimeZone('postgresql://u:p@localhost:5432/db')).toBe('postgresql://u:p@localhost:5432/db?options=-c%20TimeZone%3DUTC');
  });
  it('appends it next to existing parameters', () => {
    expect(withUtcSessionTimeZone('postgresql://u:p@h/db?schema=public&connection_limit=5')).toBe(
      'postgresql://u:p@h/db?schema=public&connection_limit=5&options=-c%20TimeZone%3DUTC'
    );
  });
  it('replaces another TimeZone and keeps other options', () => {
    const out = withUtcSessionTimeZone('postgresql://u:p@h/db?options=-c%20statement_timeout%3D5000%20-c%20TimeZone%3DAsia%2FKolkata');
    expect(decodeURIComponent(out.split('options=')[1])).toBe('-c statement_timeout=5000 -c TimeZone=UTC');
  });
});

describe('Report restart safety', () => {
  let userId: string;
  let profileId: string;
  let istClient: PrismaClient;
  let fixedClient: PrismaClient;

  async function cleanup() {
    const user = await prisma.user.findFirst({ where: { email: EMAIL }, select: { id: true } });
    if (user) {
      await prisma.report.deleteMany({ where: { userId: user.id } });
      await prisma.birthProfile.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }

  async function createReport(overrides: Record<string, unknown> = {}) {
    return prisma.report.create({
      data: { userId, birthProfileId: profileId, reportType: ReportType.CAREER, status: ReportStatus.QUEUED, stage: 'QUEUED', progress: 0, ...overrides },
    });
  }

  beforeAll(async () => {
    await cleanup();
    const user = await prisma.user.create({ data: { email: EMAIL, fullName: 'Restart Safety', role: Role.USER } });
    userId = user.id;
    const profile = await prisma.birthProfile.create({
      data: { userId, name: 'Restart Safety', dateOfBirth: '1990-01-01', timeOfBirth: '12:00:00', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', placeName: 'New Delhi, India' },
    });
    profileId = profile.id;
    // A client on a server whose TimeZone is Asia/Kolkata, as on the developer machine.
    istClient = new PrismaClient({ datasources: { db: { url: withSessionTimeZone(TEST_DB_URL, 'Asia/Kolkata') } } });
    // The same server through the fix.
    fixedClient = new PrismaClient({ datasources: { db: { url: withUtcSessionTimeZone(withSessionTimeZone(TEST_DB_URL, 'Asia/Kolkata')) } } });
  });

  beforeEach(async () => {
    await prisma.report.deleteMany({ where: { userId } });
    vi.spyOn(storageService, 'upload').mockResolvedValue({ key: 'k', fileSize: 4110 } as any);
    vi.spyOn(storageService, 'delete').mockResolvedValue(undefined);
    vi.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.WORKER_HEARTBEAT_INTERVAL_MS;
  });

  afterAll(async () => {
    await cleanup();
    await istClient.$disconnect();
    await fixedClient.$disconnect();
  });

  describe('time zone regression (DB server TimeZone=Asia/Kolkata)', () => {
    it('the shared Prisma client always runs its sessions in UTC', async () => {
      const rows = await prisma.$queryRaw<Array<{ tz: string }>>`SELECT current_setting('TimeZone') AS tz`;
      expect(rows[0].tz).toBe('UTC');
      const fixed = await fixedClient.$queryRaw<Array<{ tz: string }>>`SELECT current_setting('TimeZone') AS tz`;
      expect(fixed[0].tz).toBe('UTC');
    });

    it('reproduces the bug without the fix: a fresh 60 s lease reads 5h30m in the future', async () => {
      const rep = await createReport();
      const claim = await postgresQueueService.claimJobById(rep.id, 60, istClient as any);
      expect(claim).not.toBeNull();
      const row = await istClient.report.findUnique({ where: { id: rep.id } });
      const aheadMs = row!.claimExpiresAt!.getTime() - Date.now();
      expect(aheadMs).toBeGreaterThan(5 * 60 * 60 * 1000);
    });

    it('with the fix a fresh 60 s lease reads ~60 s ahead of the JS clock', async () => {
      const rep = await createReport();
      const claim = await postgresQueueService.claimJobById(rep.id, 60, fixedClient as any);
      expect(claim).not.toBeNull();
      const row = await fixedClient.report.findUnique({ where: { id: rep.id } });
      const aheadMs = row!.claimExpiresAt!.getTime() - Date.now();
      expect(aheadMs).toBeGreaterThan(55_000);
      expect(aheadMs).toBeLessThan(65_000);
    });

    it('with the fix recovery agrees with Prisma-written leases: expired is recovered, live is kept', async () => {
      const expired = await createReport({ status: ReportStatus.CALCULATING, stage: 'CALCULATING', claimToken: randomUUID(), claimExpiresAt: new Date(Date.now() - 5000) });
      const live = await createReport({ status: ReportStatus.CALCULATING, stage: 'CALCULATING', claimToken: randomUUID(), claimExpiresAt: new Date(Date.now() + 30_000) });

      const result = await postgresQueueService.recoverStaleJobs(3, fixedClient as any);
      expect(result.recoveredCount).toBeGreaterThanOrEqual(1);
      expect((await prisma.report.findUnique({ where: { id: expired.id } }))!.status).toBe(ReportStatus.QUEUED);
      expect((await prisma.report.findUnique({ where: { id: live.id } }))!.status).toBe(ReportStatus.CALCULATING);
    });

    it('recovers a lease left implausibly far in the future (written under the old IST session)', async () => {
      const rep = await createReport({ status: ReportStatus.CALCULATING, stage: 'CALCULATING', claimToken: randomUUID() });
      await prisma.$executeRaw`UPDATE "reports" SET "claimExpiresAt" = clock_timestamp() + INTERVAL '5 hours 30 minutes' WHERE id = ${rep.id}`;
      const within = await createReport({ status: ReportStatus.CALCULATING, stage: 'CALCULATING', claimToken: randomUUID() });
      await prisma.$executeRaw`UPDATE "reports" SET "claimExpiresAt" = clock_timestamp() + (${MAX_PLAUSIBLE_LEASE_MINUTES - 1} * INTERVAL '1 minute') WHERE id = ${within.id}`;

      const result = await postgresQueueService.recoverStaleJobs();
      expect(result.recoveredCount).toBeGreaterThanOrEqual(1);
      expect((await prisma.report.findUnique({ where: { id: rep.id } }))!.status).toBe(ReportStatus.QUEUED);
      expect((await prisma.report.findUnique({ where: { id: within.id } }))!.status).toBe(ReportStatus.CALCULATING);
    });
  });

  describe('start-up recovery', () => {
    it('immediately requeues a still-leased claim of a previous boot of this instance, not other instances', async () => {
      const mine = await createReport({ status: ReportStatus.CALCULATING, stage: 'CALCULATING', progress: 15, claimToken: `${instanceClaimPrefix()}deadboot/${randomUUID()}`, claimVersion: 1 });
      const current = await createReport({ status: ReportStatus.CALCULATING, stage: 'CALCULATING', progress: 15, claimToken: `${bootClaimPrefix()}${randomUUID()}`, claimVersion: 1 });
      const other = await createReport({ status: ReportStatus.CALCULATING, stage: 'CALCULATING', progress: 15, claimToken: `other-host:worker:0/boot/${randomUUID()}`, claimVersion: 1 });
      await prisma.$executeRaw`UPDATE "reports" SET "claimExpiresAt" = clock_timestamp() + INTERVAL '60 seconds' WHERE id IN (${mine.id}, ${current.id}, ${other.id})`;

      const worker = new CareerReportWorker();
      const { releasedFromPreviousBoot } = await worker.recoverOnStartup();
      expect(releasedFromPreviousBoot).toEqual([mine.id]);

      const after = await prisma.report.findUnique({ where: { id: mine.id } });
      expect(after!.status).toBe(ReportStatus.QUEUED);
      expect(after!.claimToken).toBeNull();
      expect(after!.retryAfter).toBeNull();
      expect(after!.claimVersion).toBe(2);
      expect((await prisma.report.findUnique({ where: { id: current.id } }))!.status).toBe(ReportStatus.CALCULATING);
      expect((await prisma.report.findUnique({ where: { id: other.id } }))!.status).toBe(ReportStatus.CALCULATING);
    });

    it('recovers an expired claim of any instance on start-up', async () => {
      const rep = await createReport({ status: ReportStatus.CALCULATING, stage: 'CALCULATING', claimToken: `other-host:worker:0/boot/${randomUUID()}` });
      await prisma.$executeRaw`UPDATE "reports" SET "claimExpiresAt" = clock_timestamp() - INTERVAL '1 second' WHERE id = ${rep.id}`;
      const worker = new CareerReportWorker();
      const { staleRecovered } = await worker.recoverOnStartup();
      expect(staleRecovered).toBeGreaterThanOrEqual(1);
      expect((await prisma.report.findUnique({ where: { id: rep.id } }))!.status).toBe(ReportStatus.QUEUED);
    });
  });

  describe('graceful shutdown', () => {
    it('releases the claim of an in-flight report (back to QUEUED, no retry delay, no failure recorded)', async () => {
      const worker = new CareerReportWorker();
      vi.spyOn(worker, 'generatePlatformReport').mockImplementation((input) =>
        new Promise((_, reject) => input.signal?.addEventListener('abort', () => reject(new Error('aborted'))))
      );
      const rep = await createReport();
      const claim = await postgresQueueService.claimJobById(rep.id, 60);
      const pipeline = worker.executeReportPipeline(claim!.id, claim!.claimToken, claim!.claimVersion);
      await sleep(200);
      expect(worker.inFlightReportIds()).toEqual([rep.id]);

      const result = await worker.shutdown(50);
      await pipeline;
      expect(result.released).toBe(1);
      expect(worker.isDraining()).toBe(true);

      const after = await prisma.report.findUnique({ where: { id: rep.id } });
      expect(after!.status).toBe(ReportStatus.QUEUED);
      expect(after!.claimToken).toBeNull();
      expect(after!.claimExpiresAt).toBeNull();
      expect(after!.retryAfter).toBeNull();
      expect(after!.generationFailures).toBe(0);
      expect(after!.errorCode).toBeNull();

      // Immediately claimable by the next process.
      const next = await postgresQueueService.claimJobById(rep.id, 60);
      expect(next).not.toBeNull();
    });

    it('lets a report that finishes within the grace period complete', async () => {
      const worker = new CareerReportWorker();
      vi.spyOn(worker, 'generatePlatformReport').mockImplementation(async (input) => {
        await sleep(300);
        return fakePlatformResult(input.reportType);
      });
      const rep = await createReport();
      const claim = await postgresQueueService.claimJobById(rep.id, 60);
      const pipeline = worker.executeReportPipeline(claim!.id, claim!.claimToken, claim!.claimVersion);
      await sleep(100);
      const result = await worker.shutdown(5000);
      await pipeline;
      expect(result).toEqual({ finished: 1, released: 0 });
      expect((await prisma.report.findUnique({ where: { id: rep.id } }))!.status).toBe(ReportStatus.COMPLETED);
    });

    it('a draining worker claims nothing new', async () => {
      const worker = new CareerReportWorker();
      await worker.shutdown(0);
      await createReport();
      expect(await worker.runDispatchCycle()).toBe(0);
    });
  });

  it('heartbeat extends the lease during a long generation step', async () => {
    process.env.WORKER_HEARTBEAT_INTERVAL_MS = '100';
    const worker = new CareerReportWorker();
    vi.spyOn(worker, 'generatePlatformReport').mockImplementation(async (input) => {
      await sleep(700);
      return fakePlatformResult(input.reportType);
    });
    const rep = await createReport();
    // A 2 s lease that would expire during the 0.7 s step plus margin without renewal.
    const claim = await postgresQueueService.claimJobById(rep.id, 2);
    const initial = (await prisma.report.findUnique({ where: { id: rep.id } }))!.claimExpiresAt!;
    const pipeline = worker.executeReportPipeline(claim!.id, claim!.claimToken, claim!.claimVersion);
    await sleep(450);
    const during = (await prisma.report.findUnique({ where: { id: rep.id } }))!.claimExpiresAt!;
    expect(during.getTime()).toBeGreaterThan(initial.getTime() + 30_000);
    await pipeline;
    expect((await prisma.report.findUnique({ where: { id: rep.id } }))!.status).toBe(ReportStatus.COMPLETED);
  });

  describe('restart mid-generation ends in a completed report', () => {
    it('graceful restart (SIGTERM): the new process completes the released report at once', async () => {
      const oldProcess = new CareerReportWorker();
      vi.spyOn(oldProcess, 'generatePlatformReport').mockImplementation((input) =>
        new Promise((_, reject) => input.signal?.addEventListener('abort', () => reject(new Error('aborted'))))
      );
      const rep = await createReport();
      const claim = await postgresQueueService.claimJobById(rep.id, 60);
      const running = oldProcess.executeReportPipeline(claim!.id, claim!.claimToken, claim!.claimVersion);
      await sleep(150);
      await oldProcess.shutdown(0);
      await running;

      const started = Date.now();
      const newProcess = new CareerReportWorker();
      vi.spyOn(newProcess, 'generatePlatformReport').mockImplementation(async (input) => fakePlatformResult(input.reportType));
      await newProcess.recoverOnStartup();
      expect(await newProcess.runDispatchCycle('test-dispatch')).toBeGreaterThanOrEqual(1);
      const done = await prisma.report.findUnique({ where: { id: rep.id } });
      expect(done!.status).toBe(ReportStatus.COMPLETED);
      expect(Date.now() - started).toBeLessThan(10_000);
    });

    it('hard kill (no shutdown handler): the report is completed once its lease expires', async () => {
      const rep = await createReport();
      // The killed process held a 1 s lease (60 s in production) from another instance.
      const claim = await postgresQueueService.claimJobById(rep.id, 1);
      await prisma.$executeRaw`UPDATE "reports" SET "claimToken" = ${`dead-host:worker:0/boot/${randomUUID()}`} WHERE id = ${rep.id}`;
      expect(claim).not.toBeNull();

      const newProcess = new CareerReportWorker();
      vi.spyOn(newProcess, 'generatePlatformReport').mockImplementation(async (input) => fakePlatformResult(input.reportType));
      // Still leased: nothing to do yet.
      expect(await newProcess.runDispatchCycle('test-dispatch')).toBe(0);
      await sleep(1200);
      expect(await newProcess.runDispatchCycle('test-dispatch')).toBeGreaterThanOrEqual(1);
      const done = await prisma.report.findUnique({ where: { id: rep.id } });
      expect(done!.status).toBe(ReportStatus.COMPLETED);
      expect(done!.executionAttempts).toBe(2);
    });
  });
});
