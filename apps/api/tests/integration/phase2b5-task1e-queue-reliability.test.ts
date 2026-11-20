import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as path from 'path';
import * as child_process from 'child_process';
import crypto from 'crypto';
import { prisma } from '../../src/services/prisma.service';
import { redisQueueService } from '../../src/services/redis-queue.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { nativeRedisClient } from '../../src/services/redis-client';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { reportsService } from '../../src/modules/reports/reports.service';
import { OrderStatus, FulfillmentStatus, ReportType } from '@prisma/client';

describe('Phase 2B.5 Task 1E: Final Queue Reliability & Multi-Process Concurrency Suite', { timeout: 30000 }, () => {
  let testUser: any;
  let testProfile: any;

  const RUNNER_SCRIPT = path.resolve(__dirname, '../helpers/process-report-runner.ts');

  function forkRunner(): Promise<child_process.ChildProcess> {
    return new Promise((resolve, reject) => {
      const child = child_process.fork(RUNNER_SCRIPT, [], {
        execArgv: [require.resolve('tsx/cli')],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          LLM_PROVIDER: 'mock',
        },
      });

      const onMessage = (msg: any) => {
        if (msg && msg.event === 'READY') {
          child.removeListener('message', onMessage);
          resolve(child);
        }
      };

      child.on('message', onMessage);
      child.on('error', reject);
    });
  }

  async function createPaidOrder(reportType: ReportType = 'CAREER') {
    const orderId = crypto.randomUUID();
    const rzpOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    const rzpPayId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const targetCatalog = `report-${reportType.toLowerCase().replace(/_/g, '-')}`;

    return await prisma.order.create({
      data: {
        id: orderId,
        userId: testUser.id,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPayId,
        amount: 29900,
        currency: 'INR',
        status: OrderStatus.PAID,
        paymentStatus: 'CAPTURED' as any,
        fulfillmentStatus: FulfillmentStatus.PROCESSING,
        reportType: reportType,
        items: {
          create: [
            {
              catalogId: targetCatalog,
              title: `${reportType} Report`,
              itemType: 'REPORT' as any,
              unitPrice: 29900,
              totalAmount: 29900,
              quantity: 1,
            },
          ],
        },
      },
      include: { items: true },
    });
  }

  /** Simulates the crashed worker's lease running out (lease expiry is judged by the DB clock). */
  async function expireLease(reportId: string) {
    await prisma.$executeRaw`UPDATE "reports" SET "claimExpiresAt" = clock_timestamp() - INTERVAL '1 second' WHERE id = ${reportId}`;
  }

  /** Makes a scheduled (backoff) retry due now. */
  async function makeRetryDue(reportId: string) {
    await prisma.$executeRaw`UPDATE "reports" SET "retryAfter" = clock_timestamp() - INTERVAL '1 second' WHERE id = ${reportId}`;
  }

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: `task1e-${Date.now()}@test.com`,
        phoneNumber: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        fullName: 'Task 1E Test User',
      },
    });

    testProfile = await prisma.birthProfile.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        name: 'Task 1E Test Profile',
        dateOfBirth: '1990-01-01',
        timeOfBirth: '12:00',
        placeName: 'New Delhi, India',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
    });
  });

  beforeEach(async () => {
    await redisQueueService.clearQueue();
    nativeRedisClient.setMockDisabled(false);
  });

  afterAll(async () => {
    await redisQueueService.clearQueue();
    await nativeRedisClient.quit().catch(() => { });
    if (testUser) {
      await prisma.report.deleteMany({ where: { userId: testUser.id } }).catch(() => { });
      await prisma.orderItem.deleteMany({ where: { order: { userId: testUser.id } } }).catch(() => { });
      await prisma.order.deleteMany({ where: { userId: testUser.id } }).catch(() => { });
      await prisma.birthProfile.deleteMany({ where: { userId: testUser.id } }).catch(() => { });
      await prisma.user.deleteMany({ where: { id: testUser.id } }).catch(() => { });
    }
  });

  it('1. Actual API child-process termination after DB commit and before enqueue', async () => {
    const order = await createPaidOrder('CAREER');
    const reportId = crypto.randomUUID();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const child = await forkRunner();

    const crashPromise = new Promise<{ reportId: string; exitCode: number | null }>((resolve) => {
      let recId = '';
      child.on('message', (msg: any) => {
        if (msg.event === 'CRASHING_BEFORE_ENQUEUE') {
          recId = msg.reportId;
        }
      });
      child.on('exit', (code) => {
        resolve({ reportId: recId, exitCode: code });
      });
    });

    child.send({
      action: 'CRASH_BEFORE_ENQUEUE',
      reportData: {
        id: reportId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        createdAt: tenMinutesAgo,
        updatedAt: tenMinutesAgo,
        metadata: { enqueued: false, recoveryAttempts: 0 },
      },
    });

    const crashResult = await crashPromise;
    expect(crashResult.reportId).toBe(reportId);
    expect(crashResult.exitCode).toBe(1);

    // The committed QUEUED row survived the crash (the DB row IS the queue entry)
    const repBefore = await prisma.report.findUnique({ where: { id: reportId } });
    expect(repBefore?.status).toBe('QUEUED');
    expect((repBefore?.metadata as any)?.enqueued).toBe(false);

    // Stale recovery has nothing to re-enqueue and must not fail or alter it
    const recoveryRes = await careerReportWorker.recoverStaleJobs();
    expect(recoveryRes.skipped).toBeUndefined();
    const repAfter = await prisma.report.findUnique({ where: { id: reportId } });
    expect(repAfter?.status).toBe('QUEUED');
    expect(repAfter?.errorCode).toBeNull();
    expect(repAfter?.recoveryAttempts).toBe(0);

    // The job is not lost: a worker claims it straight from the DB queue
    const claim = await postgresQueueService.claimJobById(reportId);
    expect(claim?.id).toBe(reportId);
    expect(claim?.claimVersion).toBe(1);
    expect(claim?.executionAttempts).toBe(1);
  });

  it('2. Actual process termination after Redis enqueue but before DB metadata update', async () => {
    const order = await createPaidOrder('KUNDLI');
    const reportId = crypto.randomUUID();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const child = await forkRunner();

    const crashPromise = new Promise<{ reportId: string; exitCode: number | null }>((resolve) => {
      let recId = '';
      child.on('message', (msg: any) => {
        if (msg.event === 'CRASHING_AFTER_ENQUEUE') {
          recId = msg.reportId;
        }
      });
      child.on('exit', (code) => {
        resolve({ reportId: recId, exitCode: code });
      });
    });

    child.send({
      action: 'CRASH_AFTER_ENQUEUE',
      reportData: {
        id: reportId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'KUNDLI',
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        createdAt: tenMinutesAgo,
        updatedAt: tenMinutesAgo,
        metadata: { enqueued: false, recoveryAttempts: 0 },
      },
    });

    const crashResult = await crashPromise;
    expect(crashResult.reportId).toBe(reportId);
    expect(crashResult.exitCode).toBe(1);

    // In DB: enqueued in the queue, but the metadata marker was never written
    const repBefore = await prisma.report.findUnique({ where: { id: reportId } });
    expect((repBefore?.metadata as any)?.enqueued).toBe(false);
    expect(repBefore?.status).toBe('QUEUED');

    // Recovery leaves the queued job alone (no duplicate, no failure)
    await careerReportWorker.recoverStaleJobs();
    const repAfter = await prisma.report.findUnique({ where: { id: reportId } });
    expect(repAfter?.status).toBe('QUEUED');
    expect(repAfter?.recoveryAttempts).toBe(0);
    expect(await prisma.report.count({ where: { orderId: order.id } })).toBe(1);

    // Exactly ONE worker can claim it (no duplicate execution)
    const firstClaim = await postgresQueueService.claimJobById(reportId);
    expect(firstClaim?.id).toBe(reportId);
    const secondClaim = await postgresQueueService.claimJobById(reportId);
    expect(secondClaim).toBeNull();
  });

  it('3. Repeated enqueue attempts do not duplicate queue jobs and preserve FIFO semantics', async () => {
    const jobA = 'job-order-aaa';
    const jobB = 'job-order-bbb';
    const jobC = 'job-order-ccc';

    // Enqueue jobA three times
    await redisQueueService.enqueueJob(jobA);
    await redisQueueService.enqueueJob(jobA);
    await redisQueueService.enqueueJob(jobA);

    // Enqueue jobB twice
    await redisQueueService.enqueueJob(jobB);
    await redisQueueService.enqueueJob(jobB);

    // Enqueue jobC once
    await redisQueueService.enqueueJob(jobC);

    // Verify FIFO dequeues: jobA first, jobB second, jobC third, then null
    const first = await redisQueueService.dequeueJob();
    expect(first).toBe(jobA);

    const second = await redisQueueService.dequeueJob();
    expect(second).toBe(jobB);

    const third = await redisQueueService.dequeueJob();
    expect(third).toBe(jobC);

    const fourth = await redisQueueService.dequeueJob();
    expect(fourth).toBeNull();

    await redisQueueService.completeJob(jobA);
    await redisQueueService.completeJob(jobB);
    await redisQueueService.completeJob(jobC);
  });

  it('4. Queue backlog exceeding five minutes does not falsely mark enqueued report as FAILED', async () => {
    const order = await createPaidOrder('PLANETARY_SUMMARY');
    const reportId = crypto.randomUUID();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Create report that was enqueued and has been waiting in queue for 10 minutes
    await prisma.report.create({
      data: {
        id: reportId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'PLANETARY_SUMMARY',
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        createdAt: tenMinutesAgo,
        updatedAt: tenMinutesAgo,
        metadata: { enqueued: true, recoveryAttempts: 0 },
      },
    });

    await redisQueueService.enqueueJob(reportId);
    expect(await redisQueueService.isInPendingQueue(reportId)).toBe(true);

    // Run recovery
    await careerReportWorker.recoverStaleJobs();

    // Verify report is STILL in QUEUED status (NOT FAILED!)
    const rep = await prisma.report.findUnique({ where: { id: reportId } });
    expect(rep?.status).toBe('QUEUED');
    expect(rep?.errorCode).toBeNull();

    // Order remains in PROCESSING
    const ord = await prisma.order.findUnique({ where: { id: order.id } });
    expect(ord?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);

    // Clean up
    await redisQueueService.dequeueJob();
    await redisQueueService.completeJob(reportId);
  });

  it('5. Worker dequeue followed by crash and subsequent recovery', async () => {
    const order = await createPaidOrder('CAREER_PROSITY');
    const reportId = crypto.randomUUID();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    await prisma.report.create({
      data: {
        id: reportId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'CAREER_PROSITY',
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        createdAt: tenMinutesAgo,
        updatedAt: tenMinutesAgo,
        metadata: { enqueued: true, recoveryAttempts: 0 },
      },
    });

    // Worker child process claims the job and crashes immediately
    const child = await forkRunner();
    const crashPromise = new Promise<{ reportId: string; exitCode: number | null }>((resolve) => {
      let recId = '';
      child.on('message', (msg: any) => {
        if (msg.event === 'DEQUEUED_CRASHING') {
          recId = msg.reportId;
        }
      });
      child.on('exit', (code) => {
        resolve({ reportId: recId, exitCode: code });
      });
    });

    child.send({ action: 'DEQUEUE_AND_CRASH', reportId });
    const crashResult = await crashPromise;

    expect(crashResult.reportId).toBe(reportId);
    expect(crashResult.exitCode).toBe(1);

    // The dead worker still holds the DB claim
    const claimed = await prisma.report.findUnique({ where: { id: reportId } });
    expect(claimed?.status).toBe('CALCULATING');
    expect(claimed?.claimToken).not.toBeNull();
    expect(claimed?.claimVersion).toBe(1);

    // A live lease is never recovered
    await careerReportWorker.recoverStaleJobs();
    expect((await prisma.report.findUnique({ where: { id: reportId } }))?.status).toBe('CALCULATING');

    // Once the lease expires, recovery requeues it with backoff and fences the dead worker
    await expireLease(reportId);
    await careerReportWorker.recoverStaleJobs();
    const requeued = await prisma.report.findUnique({ where: { id: reportId } });
    expect(requeued?.status).toBe('QUEUED');
    expect(requeued?.errorCode).toBeNull();
    expect(requeued?.claimToken).toBeNull();
    expect(requeued?.claimVersion).toBe(2);
    expect(requeued?.recoveryAttempts).toBe(1);
    expect(requeued?.retryAfter!.getTime()).toBeGreaterThan(Date.now());
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);

    // Not claimable before the backoff elapses
    expect(await postgresQueueService.claimJobById(reportId)).toBeNull();

    // Repeated crashes: recovery attempts 2 and 3 requeue, the 4th exhausts (MAX_RECOVERY_ATTEMPTS = 3)
    for (const expectedAttempts of [2, 3]) {
      await makeRetryDue(reportId);
      expect(await postgresQueueService.claimJobById(reportId)).not.toBeNull();
      await expireLease(reportId);
      await careerReportWorker.recoverStaleJobs();
      const rep = await prisma.report.findUnique({ where: { id: reportId } });
      expect(rep?.status).toBe('QUEUED');
      expect(rep?.recoveryAttempts).toBe(expectedAttempts);
    }
    await makeRetryDue(reportId);
    expect(await postgresQueueService.claimJobById(reportId)).not.toBeNull();
    await expireLease(reportId);
    await careerReportWorker.recoverStaleJobs();

    const rep = await prisma.report.findUnique({ where: { id: reportId } });
    expect(rep?.status).toBe('FAILED');
    expect(rep?.errorCode).toBe('RECOVERY_EXHAUSTED');
    expect(rep?.claimToken).toBeNull();

    // Order transitioned to FAILED, ready for retry without double-charge
    const ord = await prisma.order.findUnique({ where: { id: order.id } });
    expect(ord?.fulfillmentStatus).toBe(FulfillmentStatus.FAILED);
    expect(ord?.status).toBe(OrderStatus.PAID);
  });

  it('6. Real heartbeat interval during a long-running worker operation updates DB timestamps', async () => {
    const order = await createPaidOrder('MARRIAGE_COMPATIBILITY');
    const reportId = crypto.randomUUID();

    const initialReport = await prisma.report.create({
      data: {
        id: reportId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'MARRIAGE_COMPATIBILITY',
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
      },
    });

    const initialUpdatedAt = initialReport.updatedAt.getTime();

    // Launch child process to execute long-running task with 50ms heartbeats for 400ms
    const child = await forkRunner();
    const heartbeatPromise = new Promise<void>((resolve) => {
      child.on('message', (msg: any) => {
        if (msg.event === 'LONG_JOB_HEARTBEAT_DONE') {
          resolve();
        }
      });
    });

    child.send({
      action: 'RUN_LONG_JOB_HEARTBEAT',
      reportId,
      durationMs: 400,
      heartbeatIntervalMs: 50,
    });

    await heartbeatPromise;

    const repAfter = await prisma.report.findUnique({ where: { id: reportId } });
    expect(repAfter?.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt);
    expect(repAfter?.status).toBe('CALCULATING');

    child.send({ action: 'EXIT' });
  });

  it('7. Forced simultaneous completion and recovery using independent processes', async () => {
    const order = await createPaidOrder('CAREER');
    const reportId = crypto.randomUUID();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    await prisma.report.create({
      data: {
        id: reportId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'CALCULATING',
        stage: 'CALCULATING',
        progress: 50,
        createdAt: tenMinutesAgo,
        updatedAt: tenMinutesAgo,
      },
    });

    const [childA, childB] = await Promise.all([forkRunner(), forkRunner()]);

    const completionPromise = new Promise<{ count: number }>((resolve) => {
      childA.on('message', (msg: any) => {
        if (msg.event === 'SIMULATE_COMPLETION_DONE') {
          resolve({ count: msg.count });
        }
      });
    });

    const recoveryPromise = new Promise<any>((resolve) => {
      childB.on('message', (msg: any) => {
        if (msg.event === 'RECOVERY_RESULT') {
          resolve(msg.result);
        }
      });
    });

    // Fire both simultaneously across independent processes
    childA.send({ action: 'SIMULATE_COMPLETION', reportId });
    childB.send({ action: 'RECOVER_STALE_JOBS', id: 'rec-sim-1' });

    await Promise.all([completionPromise, recoveryPromise]);

    // Inspect report: must be COMPLETED or FAILED, never corrupt or null
    const rep = await prisma.report.findUnique({ where: { id: reportId } });
    expect(['COMPLETED', 'FAILED']).toContain(rep?.status);

    if (rep?.status === 'COMPLETED') {
      expect(rep.progress).toBe(100);
      expect((rep.metadata as any)?.summary || (rep as any).report?.summary).toBe('Completed from runner process');
    }

    childA.send({ action: 'EXIT' });
    childB.send({ action: 'EXIT' });
  });

  it('8. Redis outage followed by recovery preserves recoverable state and succeeds on reconnect', async () => {
    const order = await createPaidOrder('KUNDLI');
    const reportId = crypto.randomUUID();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    await prisma.report.create({
      data: {
        id: reportId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'KUNDLI',
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        createdAt: tenMinutesAgo,
        updatedAt: tenMinutesAgo,
        metadata: { enqueued: false, recoveryAttempts: 0 },
      },
    });

    // Simulate Redis outage
    nativeRedisClient.setMockDisabled(true);

    // Run recovery during outage
    const outageResult = await careerReportWorker.recoverStaleJobs();
    expect(outageResult.recoveredReports).toBe(0);

    // Verify report was NOT permanently failed
    const repDuringOutage = await prisma.report.findUnique({ where: { id: reportId } });
    expect(repDuringOutage?.status).toBe('QUEUED');
    expect(repDuringOutage?.errorCode).toBeNull();

    // Restore Redis
    nativeRedisClient.setMockDisabled(false);

    // Run recovery after Redis restored: still nothing to repair
    const restoredResult = await careerReportWorker.recoverStaleJobs();
    expect(restoredResult.skipped).toBeUndefined();

    const repAfter = await prisma.report.findUnique({ where: { id: reportId } });
    expect(repAfter?.status).toBe('QUEUED');
    expect(repAfter?.errorCode).toBeNull();
    expect(repAfter?.recoveryAttempts).toBe(0);

    // The job proceeds after reconnect: a worker claims it from the DB queue
    const claim = await postgresQueueService.claimJobById(reportId);
    expect(claim?.id).toBe(reportId);
  });

  it('9. Safe retry exhaustion transitions to FAILED but preserves retryability without re-charge', async () => {
    const order = await createPaidOrder('CAREER');
    const reportId = crypto.randomUUID();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    await prisma.report.create({
      data: {
        id: reportId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'CALCULATING',
        stage: 'CALCULATING',
        progress: 15,
        createdAt: tenMinutesAgo,
        updatedAt: tenMinutesAgo,
        // Third crashed worker: its lease has expired and recovery attempts are used up
        claimToken: crypto.randomUUID(),
        claimVersion: 4,
        claimExpiresAt: new Date(Date.now() - 60 * 1000),
        recoveryAttempts: 3,
        metadata: { enqueued: true },
      },
    });

    // Run recovery: attempts are exhausted (3 >= 3)
    await careerReportWorker.recoverStaleJobs();

    const repFailed = await prisma.report.findUnique({ where: { id: reportId } });
    expect(repFailed?.status).toBe('FAILED');
    expect(repFailed?.errorCode).toBe('RECOVERY_EXHAUSTED');
    expect(repFailed?.claimToken).toBeNull();

    const ordFailed = await prisma.order.findUnique({ where: { id: order.id } });
    expect(ordFailed?.fulfillmentStatus).toBe(FulfillmentStatus.FAILED);
    expect(ordFailed?.status).toBe(OrderStatus.PAID);

    // Operational retry resets report and re-enqueues it in the DB queue
    const retried = await careerReportWorker.retryReportJob(reportId);
    expect(retried).toBe(true);

    const repRetried = await prisma.report.findUnique({ where: { id: reportId } });
    expect(repRetried?.status).toBe('QUEUED');
    expect(repRetried?.errorCode).toBeNull();
    expect(repRetried?.recoveryAttempts).toBe(0);
    expect(repRetried?.retryAfter).toBeNull();

    const ordRetried = await prisma.order.findUnique({ where: { id: order.id } });
    expect(ordRetried?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
    expect(ordRetried?.status).toBe(OrderStatus.PAID);

    // Immediately claimable, with a fresh fencing version
    const claim = await postgresQueueService.claimJobById(reportId);
    expect(claim?.id).toBe(reportId);
    expect(claim?.claimVersion).toBe(6);
  });
});