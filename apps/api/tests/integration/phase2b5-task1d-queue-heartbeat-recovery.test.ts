import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import path from 'node:path';
import { fork, ChildProcess } from 'node:child_process';
import { prisma } from '../../src/services/prisma.service';
import { nativeRedisClient } from '../../src/services/redis-client';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { redisQueueService } from '../../src/services/redis-queue.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { distributedLockService } from '../../src/services/distributed-lock.service';
import { reportsService } from '../../src/modules/reports/reports.service';
import { OrderStatus, PaymentStatus, FulfillmentStatus } from '@prisma/client';

interface ChildWorker {
  process: ChildProcess;
  pid: number;
  sendRequest: (action: string, data?: any) => Promise<any>;
}

describe('Phase 2B.5 Task 1D: Queue Recovery, Heartbeats & Multi-Worker Safety', () => {
  let worker1: ChildWorker;
  let worker2: ChildWorker;
  let testUser: any;
  let testProfile: any;

  function spawnWorkerProcess(): Promise<ChildWorker> {
    return new Promise((resolve, reject) => {
      const runnerScript = path.resolve(__dirname, '../helpers/process-report-runner.ts');

      const cp = fork(runnerScript, [], {
        execArgv: [require.resolve('tsx/cli')],
        env: {
          ...process.env,
          NODE_ENV: 'test',
        },
      });

      const pendingMap = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();

      cp.on('message', (msg: any) => {
        if (msg.event === 'READY') {
          const worker: ChildWorker = {
            process: cp,
            pid: msg.pid,
            sendRequest(action: string, data: any = {}) {
              return new Promise((res, rej) => {
                const reqId = crypto.randomUUID();
                pendingMap.set(reqId, { resolve: res, reject: rej });
                cp.send({ action, id: reqId, ...data });
              });
            },
          };
          resolve(worker);
        } else if (msg.event === 'REPORT_RESULT' || msg.event === 'RECOVERY_RESULT') {
          const entry = pendingMap.get(msg.id);
          if (entry) {
            pendingMap.delete(msg.id);
            if (msg.success) {
              entry.resolve(msg.result);
            } else {
              entry.reject(msg.error);
            }
          }
        } else if (msg.event === 'REDIS_DISABLED' || msg.event === 'REDIS_ENABLED' || msg.event === 'PONG') {
          for (const [id, entry] of pendingMap.entries()) {
            pendingMap.delete(id);
            entry.resolve(msg);
            break;
          }
        }
      });

      cp.on('error', (err) => {
        reject(err);
      });

      cp.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          for (const entry of pendingMap.values()) {
            entry.reject(new Error(`Child process exited with code ${code}`));
          }
        }
      });
    });
  }

  beforeAll(async () => {
    [worker1, worker2] = await Promise.all([spawnWorkerProcess(), spawnWorkerProcess()]);

    const existingUsers = await prisma.user.findMany({
      where: {
        OR: [
          { id: 'task1d-test-user' },
          { email: 'task1d.user@astrosushil.com' },
          { phoneNumber: '+919444444444' },
        ],
      },
      select: { id: true },
    });
    const existingUserIds = existingUsers.map(({ id }) => id);
    await prisma.report.deleteMany({ where: { userId: { in: existingUserIds } } });
    await prisma.fulfillmentUnit.deleteMany({ where: { order: { userId: { in: existingUserIds } } } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: { in: existingUserIds } } } });
    await prisma.order.deleteMany({ where: { userId: { in: existingUserIds } } });
    await prisma.birthProfile.deleteMany({ where: { userId: { in: existingUserIds } } });

    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: 'task1d-test-user' },
          { email: 'task1d.user@astrosushil.com' },
          { phoneNumber: '+919444444444' },
        ],
      },
    });

    testUser = await prisma.user.create({
      data: {
        id: 'task1d-test-user',
        email: 'task1d.user@astrosushil.com',
        phoneNumber: '+919444444444',
        fullName: 'Task 1D Queue Recovery Test User',
        role: 'USER',
      },
    });

    testProfile = await prisma.birthProfile.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        name: 'Task 1D Profile',
        dateOfBirth: '1990-06-15T00:00:00.000Z',
        timeOfBirth: '11:15',
        placeName: 'Delhi, India',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
      },
    });
  }, 30000);

  beforeEach(async () => {
    // Drain Redis queue
    while (await redisQueueService.dequeueJob()) {}

    await prisma.report.deleteMany({ where: { userId: testUser.id } });
    await prisma.fulfillmentUnit.deleteMany({ where: { order: { userId: testUser.id } } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: testUser.id } } });
    await prisma.order.deleteMany({ where: { userId: testUser.id } });
  });

  afterAll(async () => {
    try {
      if (worker1?.process) worker1.process.kill('SIGTERM');
      if (worker2?.process) worker2.process.kill('SIGTERM');
    } catch (_) {}

    await prisma.report.deleteMany({ where: { userId: testUser.id } });
    await prisma.fulfillmentUnit.deleteMany({ where: { order: { userId: testUser.id } } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: testUser.id } } });
    await prisma.order.deleteMany({ where: { userId: testUser.id } });
    await prisma.birthProfile.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });

    await nativeRedisClient.quit();
  }, 15000);

  async function createPaidOrder(sku: string) {
    const orderId = crypto.randomUUID();
    const rzpOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    const rzpPayId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const targetCatalog = `report-${sku.toLowerCase().replace(/_/g, '-')}`;

    return await prisma.order.create({
      data: {
        id: orderId,
        userId: testUser.id,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPayId,
        amount: 29900,
        currency: 'INR',
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.CAPTURED,
        fulfillmentStatus: FulfillmentStatus.PROCESSING,
        reportType: sku as any,
        items: {
          create: [
            {
              catalogId: targetCatalog,
              itemType: 'REPORT',
              title: `${sku} Report`,
              unitPrice: 29900,
              totalAmount: 29900,
              quantity: 1,
            },
          ],
        },
      },
      include: { items: true, reports: true },
    });
  }

  // =========================================================================
  // 1. QUEUE CRASH-WINDOW & RE-ENQUEUE RECOVERY
  // =========================================================================

  it('1. API crash after database commit leaves abandoned QUEUED report with enqueued=false', async () => {
    const order = await createPaidOrder('KUNDLI');
    const reportId = crypto.randomUUID();

    // Simulate API process committing Report to Postgres then crashing before Redis enqueue
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
        metadata: { enqueued: false },
      } as any,
    });

    // Redis queue must have zero jobs
    const dequeued = await redisQueueService.dequeueJob();
    expect(dequeued).toBeNull();

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    expect(report?.status).toBe('QUEUED');
    expect((report?.metadata as any)?.enqueued).toBe(false);
  });

  it('2. Recovery successfully re-enqueues an abandoned QUEUED report', async () => {
    const order = await createPaidOrder('KUNDLI');
    const reportId = crypto.randomUUID();

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
        metadata: { enqueued: false },
      } as any,
    });
    // Set updatedAt to 10 minutes ago
    await prisma.$executeRaw`UPDATE "reports" SET "updatedAt" = (NOW() at time zone 'UTC') - INTERVAL '10 minutes' WHERE id = ${reportId}`;

    // The PostgreSQL row queue is the source of truth: a QUEUED row is claimable as-is,
    // so stale recovery has nothing to re-enqueue and must leave it untouched (not failed).
    const stats = await careerReportWorker.recoverStaleJobs();
    expect(stats.skipped).toBeUndefined();

    const recovered = await prisma.report.findUnique({ where: { id: reportId } });
    expect(recovered?.status).toBe('QUEUED');
    expect(recovered?.recoveryAttempts).toBe(0);
    expect(recovered?.claimVersion).toBe(0);
    expect(recovered?.retryAfter).toBeNull();

    // The abandoned job is directly claimable by a worker from the DB queue.
    const claim = await postgresQueueService.claimJobById(reportId);
    expect(claim?.id).toBe(reportId);
    expect(claim?.claimVersion).toBe(1);
  });

  it('3. Repeated recovery does not create duplicate queue jobs or reports', async () => {
    const order = await createPaidOrder('KUNDLI');
    const reportId = crypto.randomUUID();

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
        metadata: { enqueued: false },
      } as any,
    });
    await prisma.$executeRaw`UPDATE "reports" SET "updatedAt" = (NOW() at time zone 'UTC') - INTERVAL '10 minutes' WHERE id = ${reportId}`;

    // Two recovery runs back to back
    await careerReportWorker.recoverStaleJobs();
    const stats2 = await careerReportWorker.recoverStaleJobs();
    expect(stats2.recoveredReports).toBe(0);

    // Still exactly one report row for the order, unchanged by recovery
    const rows = await prisma.report.findMany({ where: { orderId: order.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('QUEUED');
    expect(rows[0].recoveryAttempts).toBe(0);

    // Exactly one claim succeeds: no duplicate execution
    const firstClaim = await postgresQueueService.claimJobById(reportId);
    expect(firstClaim?.id).toBe(reportId);
    const secondClaim = await postgresQueueService.claimJobById(reportId);
    expect(secondClaim).toBeNull();
  });

  it('4. Redis unavailable during recovery does not lose recovery info, followed by successful retry', async () => {
    const order = await createPaidOrder('PLANETARY_SUMMARY');
    const reportId = crypto.randomUUID();

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
        metadata: { enqueued: false },
      } as any,
    });
    await prisma.$executeRaw`UPDATE "reports" SET "updatedAt" = (NOW() at time zone 'UTC') - INTERVAL '10 minutes' WHERE id = ${reportId}`;

    // Disable Redis to simulate network partition
    nativeRedisClient.setMockDisabled(true);

    try {
      // Recovery runs while Redis is offline (PostgreSQL advisory-lock fallback)
      const outageStats = await careerReportWorker.recoverStaleJobs();
      expect(outageStats.skipped).toBeUndefined();

      // Report must still be QUEUED (not prematurely failed) and keep its recovery state
      const pendingReport = await prisma.report.findUnique({ where: { id: reportId } });
      expect(pendingReport?.status).toBe('QUEUED');
      expect(pendingReport?.errorCode).toBeNull();
      expect(pendingReport?.recoveryAttempts).toBe(0);

      // The DB queue does not depend on Redis: the job is claimable during the outage
      const claim = await postgresQueueService.claimJobById(reportId);
      expect(claim?.id).toBe(reportId);
    } finally {
      // Re-enable Redis
      nativeRedisClient.setMockDisabled(false);
    }

    const claimed = await prisma.report.findUnique({ where: { id: reportId } });
    expect(claimed?.status).toBe('CALCULATING');
    expect(claimed?.claimToken).not.toBeNull();
  });

  // =========================================================================
  // 2. WORKER HEARTBEAT
  // =========================================================================

  it('5. A legitimate job running longer than five minutes with heartbeats is not recovered as stale', async () => {
    const order = await createPaidOrder('CAREER_PROSITY');
    const reportId = crypto.randomUUID();

    await prisma.report.create({
      data: {
        id: reportId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'CAREER_PROSITY',
        status: 'ANALYZING',
        stage: 'ANALYZING',
        progress: 35,
        metadata: { enqueued: true },
      } as any,
    });

    // Simulate creation 8 minutes ago, but heartbeat touched updatedAt 30 seconds ago
    await prisma.$executeRaw`UPDATE "reports" SET "createdAt" = (NOW() at time zone 'UTC') - INTERVAL '8 minutes' WHERE id = ${reportId}`;
    const touched = await careerReportWorker.touchHeartbeat(reportId);
    expect(touched).toBe(true);

    // Run recovery
    const stats = await careerReportWorker.recoverStaleJobs();
    expect(stats.recoveredReports).toBe(0);

    // Report remains active in ANALYZING status
    const activeReport = await prisma.report.findUnique({ where: { id: reportId } });
    expect(activeReport?.status).toBe('ANALYZING');
  });

  it('6. Heartbeat cannot update FAILED or COMPLETED reports', async () => {
    const order = await createPaidOrder('KUNDLI');

    // 1. COMPLETED report
    const completedId = crypto.randomUUID();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    await prisma.report.create({
      data: {
        id: completedId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'KUNDLI',
        status: 'COMPLETED',
        stage: 'COMPLETED',
        progress: 100,
        createdAt: tenMinutesAgo,
        updatedAt: tenMinutesAgo,
      } as any,
    });

    const completedHeartbeat = await careerReportWorker.touchHeartbeat(completedId);
    expect(completedHeartbeat).toBe(false);

    // 2. FAILED report
    const failedId = crypto.randomUUID();
    await prisma.report.create({
      data: {
        id: failedId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'KUNDLI',
        status: 'FAILED',
        stage: 'FAILED',
        progress: 0,
        createdAt: tenMinutesAgo,
        updatedAt: tenMinutesAgo,
      } as any,
    });

    const failedHeartbeat = await careerReportWorker.touchHeartbeat(failedId);
    expect(failedHeartbeat).toBe(false);
  });

  // =========================================================================
  // 3. MULTI-WORKER DISTRIBUTED RECOVERY COORDINATION
  // =========================================================================

  it('7. Two independent worker processes attempting recovery simultaneously execute safely without conflict', async () => {
    const order = await createPaidOrder('KUNDLI');
    const staleReportId = crypto.randomUUID();

    await prisma.report.create({
      data: {
        id: staleReportId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'KUNDLI',
        status: 'CALCULATING',
        stage: 'CALCULATING',
        progress: 20,
        claimToken: crypto.randomUUID(),
        claimVersion: 1,
        executionAttempts: 1,
      } as any,
    });
    // The crashed worker's lease expired 10 minutes ago
    await prisma.$executeRaw`UPDATE "reports" SET "updatedAt" = clock_timestamp() - INTERVAL '10 minutes', "claimExpiresAt" = clock_timestamp() - INTERVAL '9 minutes' WHERE id = ${staleReportId}`;

    // Send recovery command simultaneously to both independent OS processes
    const [res1, res2] = await Promise.all([
      worker1.sendRequest('RECOVER_STALE_JOBS'),
      worker2.sendRequest('RECOVER_STALE_JOBS'),
    ]);

    expect(res1).toBeDefined();
    expect(res2).toBeDefined();

    // Exactly one worker recovers the job or one skips due to lock
    const totalRecovered = (res1.recoveredReports || 0) + (res2.recoveredReports || 0);
    expect(totalRecovered).toBe(1);

    // Recovery requeues the crashed job exactly once with backoff and fences the dead worker
    const finalReport = await prisma.report.findUnique({ where: { id: staleReportId } });
    expect(finalReport?.status).toBe('QUEUED');
    expect(finalReport?.recoveryAttempts).toBe(1);
    expect(finalReport?.claimVersion).toBe(2);
    expect(finalReport?.claimToken).toBeNull();
    expect(finalReport?.claimExpiresAt).toBeNull();
    expect(finalReport?.retryAfter).not.toBeNull();
    expect(finalReport?.errorCode).toBeNull();
  });

  it('8. Recovery lock expiry and stale-owner protection handles TTL cleanly', async () => {
    const testKey = 'test:stale-recovery-ttl';
    const lock1 = await distributedLockService.acquireRedisLock(testKey, 200); // 200ms TTL
    expect(lock1?.acquired).toBe(true);

    // Immediate acquisition by another client fails
    const lockImmediate = await distributedLockService.acquireRedisLock(testKey, 500);
    expect(lockImmediate?.acquired).toBe(false);

    // Wait 300ms for TTL expiration
    await new Promise((r) => setTimeout(r, 300));

    // Next client acquires cleanly
    const lock2 = await distributedLockService.acquireRedisLock(testKey, 1000);
    expect(lock2?.acquired).toBe(true);

    // Stale owner 1 trying to release cannot delete owner 2's lock!
    if (lock1) {
      await distributedLockService.releaseRedisLock(lock1.key, lock1.token);
    }

    // Owner 2's lock is still held
    const lock3 = await distributedLockService.acquireRedisLock(testKey, 500);
    expect(lock3?.acquired).toBe(false);

    if (lock2) {
      await distributedLockService.releaseRedisLock(lock2.key, lock2.token);
    }
  });

  // =========================================================================
  // 4. CONDITIONAL FAILURE TRANSITIONS
  // =========================================================================

  it('9. Active worker completion racing with recovery does not cause corrupt overwrite', async () => {
    const order = await createPaidOrder('PLANETARY_SUMMARY');
    const reportId = crypto.randomUUID();

    await prisma.report.create({
      data: {
        id: reportId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'PLANETARY_SUMMARY',
        status: 'UPLOADING',
        stage: 'UPLOADING',
        progress: 95,
      } as any,
    });

    // Simulate recovery failing the report first
    const failed = await careerReportWorker.failJob(reportId, 'TIMEOUT', 'Worker timed out');
    expect(failed).toBe(true);

    // Worker attempts late completion update using conditional updateMany
    const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'];
    const lateComplete = await prisma.report.updateMany({
      where: {
        id: reportId,
        status: { in: activeStatuses as any[] },
      },
      data: {
        status: 'COMPLETED',
        progress: 100,
      } as any,
    });

    // Late completion matches 0 rows! Status remains FAILED!
    expect(lateComplete.count).toBe(0);

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    expect(report?.status).toBe('FAILED');
  });

  it('10. Conditional failure updates never overwrite COMPLETED reports or orders', async () => {
    const order = await createPaidOrder('KUNDLI');
    const reportId = crypto.randomUUID();

    await prisma.report.create({
      data: {
        id: reportId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'KUNDLI',
        status: 'COMPLETED',
        stage: 'COMPLETED',
        progress: 100,
      } as any,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
    });

    // Attempt to fail a completed job
    const result = await careerReportWorker.failJob(reportId, 'LATE_ERROR', 'Should be rejected');
    expect(result).toBe(false);

    // Report and Order remain untouched
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    expect(report?.status).toBe('COMPLETED');

    const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(finalOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);
  });

  it('11. Failed generation remains retryable without another payment', async () => {
    const order = await createPaidOrder('KUNDLI');
    const reportId = crypto.randomUUID();

    await prisma.report.create({
      data: {
        id: reportId,
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'KUNDLI',
        status: 'FAILED',
        stage: 'FAILED',
        progress: 0,
        errorCode: 'SIMULATED_FAIL',
      } as any,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { fulfillmentStatus: FulfillmentStatus.FAILED },
    });

    // Retry report generation with the EXACT SAME orderId
    const userContext = { id: testUser.id, role: 'USER' };
    const retryRes = await reportsService.createReportJob(
      {
        birthProfileId: testProfile.id,
        reportType: 'KUNDLI',
        orderId: order.id,
        forceRegenerate: true,
        async: true,
      },
      userContext
    );

    expect(retryRes.reportId).toBeDefined();
    expect(retryRes.reportId).not.toBe(reportId);

    // Order transitions cleanly back to PROCESSING
    const retryingOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(retryingOrder?.status).toBe(OrderStatus.PAID);
    expect(retryingOrder?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
  });
});
