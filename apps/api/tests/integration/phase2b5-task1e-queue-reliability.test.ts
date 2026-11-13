import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as path from 'path';
import * as child_process from 'child_process';
import crypto from 'crypto';
import { prisma } from '../../src/services/prisma.service';
import { redisQueueService } from '../../src/services/redis-queue.service';
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

    // Verify report exists in DB with enqueued=false and is NOT in Redis queue
    const repBefore = await prisma.report.findUnique({ where: { id: reportId } });
    expect(repBefore).toBeDefined();
    expect((repBefore?.metadata as any)?.enqueued).toBe(false);
    expect(await redisQueueService.isInPendingQueue(reportId)).toBe(false);

    // Run recovery
    const recoveryRes = await careerReportWorker.recoverStaleJobs();
    expect(recoveryRes.recoveredReports).toBeGreaterThanOrEqual(1);

    // Verify recovery successfully enqueued the job into Redis
    expect(await redisQueueService.isInPendingQueue(reportId)).toBe(true);
    const repAfter = await prisma.report.findUnique({ where: { id: reportId } });
    expect(repAfter?.status).toBe('QUEUED');
    expect((repAfter?.metadata as any)?.enqueued).toBe(true);
    expect((repAfter?.metadata as any)?.recoveryAttempts).toBe(1);

    // Clean up popped item
    const popped = await redisQueueService.dequeueJob();
    expect(popped).toBe(reportId);
    await redisQueueService.completeJob(reportId);
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

    // In DB: metadata.enqueued is false
    const repBefore = await prisma.report.findUnique({ where: { id: reportId } });
    expect((repBefore?.metadata as any)?.enqueued).toBe(false);

    // In Redis: it was already pushed to queue!
    expect(await redisQueueService.isInPendingQueue(reportId)).toBe(true);

    // Run recovery
    await careerReportWorker.recoverStaleJobs();

    // Verify metadata was self-healed to enqueued=true
    const repAfter = await prisma.report.findUnique({ where: { id: reportId } });
    expect((repAfter?.metadata as any)?.enqueued).toBe(true);
    expect(repAfter?.status).toBe('QUEUED');

    // Verify exactly ONE item exists in queue (no duplicate job was added)
    const poppedFirst = await redisQueueService.dequeueJob();
    expect(poppedFirst).toBe(reportId);

    const poppedSecond = await redisQueueService.dequeueJob();
    expect(poppedSecond).toBeNull();

    await redisQueueService.completeJob(reportId);
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

    await redisQueueService.enqueueJob(reportId);

    // Worker child process dequeues the job and crashes immediately
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

    child.send({ action: 'DEQUEUE_AND_CRASH' });
    const crashResult = await crashPromise;

    expect(crashResult.reportId).toBe(reportId);
    expect(crashResult.exitCode).toBe(1);

    // Job is no longer in pending queue, but was claimed by worker
    expect(await redisQueueService.isInPendingQueue(reportId)).toBe(false);
    expect(await redisQueueService.isClaimedByWorker(reportId)).toBe(true);

    // Set updatedAt to 10 minutes ago simulating crashed worker
    await prisma.report.update({
      where: { id: reportId },
      data: { updatedAt: tenMinutesAgo },
    });

    // Run recovery
    await careerReportWorker.recoverStaleJobs();

    // Verify report is transitioned to FAILED with WORKER_TIMEOUT_RECOVERED
    const rep = await prisma.report.findUnique({ where: { id: reportId } });
    expect(rep?.status).toBe('FAILED');
    expect(rep?.errorCode).toBe('WORKER_TIMEOUT_RECOVERED');

    // Order transitioned to FAILED, ready for retry without double-charge
    const ord = await prisma.order.findUnique({ where: { id: order.id } });
    expect(ord?.fulfillmentStatus).toBe(FulfillmentStatus.FAILED);
    expect(ord?.status).toBe(OrderStatus.PAID);

    // Job tracking is cleaned up
    expect(await redisQueueService.isClaimedByWorker(reportId)).toBe(false);
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

    // Run recovery after Redis restored
    const restoredResult = await careerReportWorker.recoverStaleJobs();
    expect(restoredResult.recoveredReports).toBeGreaterThanOrEqual(1);

    const repAfter = await prisma.report.findUnique({ where: { id: reportId } });
    expect(repAfter?.status).toBe('QUEUED');
    expect((repAfter?.metadata as any)?.enqueued).toBe(true);

    const popped = await redisQueueService.dequeueJob();
    expect(popped).toBe(reportId);
    await redisQueueService.completeJob(reportId);
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
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        createdAt: tenMinutesAgo,
        updatedAt: tenMinutesAgo,
        metadata: { enqueued: false, recoveryAttempts: 3 },
      },
    });

    // Run recovery: attempts are exhausted (3 >= 3)
    await careerReportWorker.recoverStaleJobs();

    const repFailed = await prisma.report.findUnique({ where: { id: reportId } });
    expect(repFailed?.status).toBe('FAILED');
    expect(repFailed?.errorCode).toBe('QUEUE_RECOVERY_EXHAUSTED');

    const ordFailed = await prisma.order.findUnique({ where: { id: order.id } });
    expect(ordFailed?.fulfillmentStatus).toBe(FulfillmentStatus.FAILED);
    expect(ordFailed?.status).toBe(OrderStatus.PAID);

    // Operational retry resets report and enqueues to Redis
    const retried = await careerReportWorker.retryReportJob(reportId);
    expect(retried).toBe(true);

    const repRetried = await prisma.report.findUnique({ where: { id: reportId } });
    expect(repRetried?.status).toBe('QUEUED');
    expect(repRetried?.errorCode).toBeNull();
    expect((repRetried?.metadata as any)?.recoveryAttempts).toBe(0);

    const ordRetried = await prisma.order.findUnique({ where: { id: order.id } });
    expect(ordRetried?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);

    // Clean up
    await redisQueueService.dequeueJob();
    await redisQueueService.completeJob(reportId);
  });
});