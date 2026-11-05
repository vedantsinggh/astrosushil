import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as path from 'path';
import { fork, ChildProcess } from 'child_process';
import crypto from 'crypto';
import { prisma } from '../../src/services/prisma.service';
import { redisQueueService } from '../../src/services/redis-queue.service';
import { nativeRedisClient } from '../../src/services/redis-client';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { OrderStatus, FulfillmentStatus, ReportType } from '@prisma/client';

interface ChildWorker {
  process: ChildProcess;
  pid: number;
  sendRequest: (action: string, data?: any) => Promise<any>;
}

describe('Phase 2B.5 Task 1F: Atomic Worker Ownership & Race-Safe Queue Recovery Suite', { timeout: 35000 }, () => {
  let testUser: any;
  let testProfile: any;
  let workerA: ChildWorker;
  let workerB: ChildWorker;

  const RUNNER_SCRIPT = path.resolve(__dirname, '../helpers/process-report-runner.ts');

  function spawnWorker(): Promise<ChildWorker> {
    return new Promise((resolve, reject) => {
      const cp = fork(RUNNER_SCRIPT, [], {
        execArgv: [require.resolve('tsx/cli')],
        env: {
          ...process.env,
          NODE_ENV: 'test',
          LLM_PROVIDER: 'mock',
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
                const reqId = data.id || crypto.randomUUID();
                pendingMap.set(reqId, { resolve: res, reject: rej });
                cp.send({ action, id: reqId, ...data });
              });
            },
          };
          resolve(worker);
        } else if (msg.id && pendingMap.has(msg.id)) {
          const entry = pendingMap.get(msg.id)!;
          pendingMap.delete(msg.id);
          entry.resolve(msg);
        }
      });

      cp.on('error', reject);
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
    [workerA, workerB] = await Promise.all([spawnWorker(), spawnWorker()]);

    testUser = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: `task1f-${Date.now()}@test.com`,
        phoneNumber: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        fullName: 'Task 1F Test User',
      },
    });

    testProfile = await prisma.birthProfile.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        name: 'Task 1F Test Profile',
        dateOfBirth: '1990-01-01',
        timeOfBirth: '12:00',
        placeName: 'New Delhi, India',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
    });
  }, 40000);

  beforeEach(async () => {
    await redisQueueService.clearQueue();
    nativeRedisClient.setMockDisabled(false);
  });

  afterAll(async () => {
    try {
      workerA.process.kill();
      workerB.process.kill();
    } catch (_) {}

    await redisQueueService.clearQueue();
    await nativeRedisClient.quit().catch(() => {});
    if (testUser) {
      await prisma.report.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.orderItem.deleteMany({ where: { order: { userId: testUser.id } } }).catch(() => {});
      await prisma.order.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.birthProfile.deleteMany({ where: { userId: testUser.id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: testUser.id } }).catch(() => {});
    }
  });

  it('1. Two child process workers simultaneously attempting to claim the same report: exactly one succeeds', async () => {
    const order = await createPaidOrder('CAREER');
    const report = await prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
      },
    });

    const tokenA = `token_A_${crypto.randomUUID()}`;
    const tokenB = `token_B_${crypto.randomUUID()}`;

    const claimPromiseA = workerA.sendRequest('ACQUIRE_CLAIM', {
      reportId: report.id,
      claimToken: tokenA,
    });

    const claimPromiseB = workerB.sendRequest('ACQUIRE_CLAIM', {
      reportId: report.id,
      claimToken: tokenB,
    });

    const [resA, resB] = await Promise.all([claimPromiseA, claimPromiseB]);

    // Exactly one succeeds and one fails
    const successes = [resA.acquired, resB.acquired].filter(Boolean).length;
    expect(successes).toBe(1);

    // Verify DB state
    const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
    expect(dbReport?.status).toBe('CALCULATING');
    const meta = dbReport?.metadata as Record<string, any>;
    expect(meta?.claimToken).toBeDefined();
    expect([tokenA, tokenB]).toContain(meta?.claimToken);

    // Verify winner holds claim in Redis
    const activeClaim = await redisQueueService.getClaimToken(report.id);
    expect(activeClaim).toBe(meta?.claimToken);
  });

  it('2. Enqueue attempt while report is actively claimed: active claim is NOT removed or overwritten', async () => {
    const reportId = crypto.randomUUID();
    const tokenWorker1 = `worker1_${crypto.randomUUID()}`;

    // Claim the report
    const claimed = await redisQueueService.acquireReportClaim(reportId, tokenWorker1);
    expect(claimed).toBe(true);

    const tokenBeforeEnqueue = await redisQueueService.getClaimToken(reportId);
    expect(tokenBeforeEnqueue).toBe(tokenWorker1);
    expect(await redisQueueService.isClaimActive(reportId)).toBe(true);

    // Enqueue the report (e.g. concurrent or re-enqueue)
    await redisQueueService.enqueueJob(reportId);

    // Verify active claim is preserved and NOT removed by Lua enqueue
    const tokenAfterEnqueue = await redisQueueService.getClaimToken(reportId);
    expect(tokenAfterEnqueue).toBe(tokenWorker1);
    expect(await redisQueueService.isClaimActive(reportId)).toBe(true);

    // Clean up claim
    await redisQueueService.releaseReportClaim(reportId, tokenWorker1);
    expect(await redisQueueService.isClaimActive(reportId)).toBe(false);
  });

  it('3. Expired worker attempting to release a newer worker claim: release rejected, newer claim intact', async () => {
    const reportId = crypto.randomUUID();
    const tokenOld = `old_worker_${crypto.randomUUID()}`;
    const tokenNew = `new_worker_${crypto.randomUUID()}`;

    // Initial claim by worker 1
    await redisQueueService.acquireReportClaim(reportId, tokenOld);
    expect(await redisQueueService.getClaimToken(reportId)).toBe(tokenOld);

    // Worker 1 expired or timed out; Worker 2 acquires claim
    await redisQueueService.releaseReportClaim(reportId, tokenOld);
    await redisQueueService.acquireReportClaim(reportId, tokenNew);
    expect(await redisQueueService.getClaimToken(reportId)).toBe(tokenNew);

    // Expired Worker 1 attempts to release with old token
    const oldReleaseResult = await redisQueueService.releaseReportClaim(reportId, tokenOld);
    expect(oldReleaseResult).toBe(false);

    // Newer claim MUST remain intact
    expect(await redisQueueService.getClaimToken(reportId)).toBe(tokenNew);
    expect(await redisQueueService.isClaimActive(reportId)).toBe(true);

    // Cleanup with new token
    const newReleaseResult = await redisQueueService.releaseReportClaim(reportId, tokenNew);
    expect(newReleaseResult).toBe(true);
  });

  it('4. Heartbeat advancing between stale-query and failure-transition: recovery update affects 0 rows and aborts', async () => {
    const order = await createPaidOrder('CAREER');
    const staleTime = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago
    const report = await prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'CALCULATING',
        stage: 'CALCULATING',
        progress: 25,
        updatedAt: staleTime,
      },
    });

    const capturedUpdatedAt = staleTime;

    // Concurrently, active worker advances heartbeat before recovery CAS update runs
    const heartbeatAdvanced = await careerReportWorker.touchHeartbeat(report.id);
    expect(heartbeatAdvanced).toBe(true);

    // Stale recovery attempts conditional failure transition using capturedUpdatedAt
    const failed = await careerReportWorker.failJobIfStale(
      report.id,
      capturedUpdatedAt,
      'STALE_WORKER_TIMEOUT',
      'Worker stalled'
    );

    // Failure transition MUST abort (0 rows affected)
    expect(failed).toBe(false);

    // Report MUST remain CALCULATING and NOT FAILED
    const checkReport = await prisma.report.findUnique({ where: { id: report.id } });
    expect(checkReport?.status).toBe('CALCULATING');
    expect(checkReport?.progress).toBe(25);

    // Order MUST remain PROCESSING
    const checkOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(checkOrder?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
  });

  it('5. Recovery racing with report completion: report remains COMPLETED and order FULFILLED', async () => {
    const order = await createPaidOrder('CAREER');
    const staleTime = new Date(Date.now() - 10 * 60 * 1000);
    const report = await prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'UPLOADING',
        stage: 'UPLOADING',
        progress: 95,
        updatedAt: staleTime,
      },
    });

    const capturedUpdatedAt = staleTime;

    // Worker finishes and transitions report to COMPLETED and order to FULFILLED
    const now = new Date();
    await prisma.report.update({
      where: { id: report.id },
      data: {
        status: 'COMPLETED',
        stage: 'COMPLETED',
        progress: 100,
        completedAt: now,
        updatedAt: now,
      },
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
    });

    // Recovery attempts to mark report FAILED using stale timestamp
    const failed = await careerReportWorker.failJobIfStale(
      report.id,
      capturedUpdatedAt,
      'STALE_TIMEOUT',
      'Stale upload'
    );

    expect(failed).toBe(false);

    // Ensure database consistency: report remains COMPLETED, order FULFILLED
    const finalReport = await prisma.report.findUnique({ where: { id: report.id } });
    expect(finalReport?.status).toBe('COMPLETED');
    expect(finalReport?.progress).toBe(100);

    const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(finalOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);
  });

  it('6. Two simultaneous retry requests for the same failed report: exactly one succeeds, single job enqueued', async () => {
    const order = await createPaidOrder('CAREER');
    const report = await prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'FAILED',
        stage: 'FAILED',
        progress: 0,
        metadata: { errorCode: 'PREVIOUS_ERROR' },
      },
    });

    const retryPromiseA = workerA.sendRequest('RETRY_REPORT', { reportId: report.id });
    const retryPromiseB = workerB.sendRequest('RETRY_REPORT', { reportId: report.id });

    const [resA, resB] = await Promise.all([retryPromiseA, retryPromiseB]);

    const successCount = [resA.retried, resB.retried].filter(Boolean).length;
    expect(successCount).toBe(1);

    // Verify queue has exactly ONE job
    expect(await redisQueueService.getQueueLength()).toBe(1);
    const dequeued = await redisQueueService.dequeueJob();
    expect(dequeued).toBe(report.id);
    expect(await redisQueueService.getQueueLength()).toBe(0);

    // Verify DB report status transitioned to QUEUED
    const updatedReport = await prisma.report.findUnique({ where: { id: report.id } });
    expect(updatedReport?.status).toBe('QUEUED');

    // Order must remain PAID and not double-charged
    const checkOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(checkOrder?.status).toBe(OrderStatus.PAID);
    expect(checkOrder?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
  });

  it('7. Stale worker attempting stage update after losing ownership: update rejected, worker stops', async () => {
    const order = await createPaidOrder('CAREER');
    const report = await prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'CALCULATING',
        stage: 'CALCULATING',
        progress: 15,
        metadata: { claimToken: 'current_valid_token' },
      },
    });

    // Stale worker with an expired claimToken attempts stage update
    const staleToken = 'expired_old_token';
    const updated = await careerReportWorker.updateJobStatus(
      report.id,
      'ANALYZING',
      35,
      'ANALYZING',
      staleToken
    );

    // Update must be rejected (count === 0)
    expect(updated).toBe(false);

    // Verify DB state was NOT touched by stale worker
    const currentReport = await prisma.report.findUnique({ where: { id: report.id } });
    expect(currentReport?.status).toBe('CALCULATING');
    expect(currentReport?.progress).toBe(15);
    expect((currentReport?.metadata as any)?.claimToken).toBe('current_valid_token');
  });

  it('8. Redis outage during claim: fallback to PostgreSQL CAS, no duplicate execution', async () => {
    const order = await createPaidOrder('CAREER');
    const report = await prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
      },
    });

    // Simulate Redis outage
    nativeRedisClient.setMockDisabled(true);

    try {
      const claimToken1 = `fallback_token_1_${crypto.randomUUID()}`;
      const claimToken2 = `fallback_token_2_${crypto.randomUUID()}`;

      // Worker 1 claims under Redis outage (uses fallback)
      const claimed1 = await careerReportWorker.acquireWorkerClaim(report.id, claimToken1);
      expect(claimed1).toBe(true);

      // Verify PostgreSQL state
      const dbReport1 = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport1?.status).toBe('CALCULATING');
      expect((dbReport1?.metadata as any)?.claimToken).toBe(claimToken1);

      // Worker 2 attempts claim on the same report
      const claimed2 = await careerReportWorker.acquireWorkerClaim(report.id, claimToken2);
      expect(claimed2).toBe(false);

      // PostgreSQL state unchanged
      const dbReport2 = await prisma.report.findUnique({ where: { id: report.id } });
      expect((dbReport2?.metadata as any)?.claimToken).toBe(claimToken1);
    } finally {
      nativeRedisClient.setMockDisabled(false);
    }
  });

  it('9. Multi-process fallback concurrency: two child processes attempting claim under Redis outage: exactly one succeeds', async () => {
    const order = await createPaidOrder('CAREER');
    const report = await prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
      },
    });

    try {
      // Disable Redis on both child processes
      await workerA.sendRequest('DISABLE_REDIS');
      await workerB.sendRequest('DISABLE_REDIS');

      const tokenA = `redis_down_A_${crypto.randomUUID()}`;
      const tokenB = `redis_down_B_${crypto.randomUUID()}`;

      const claimPromiseA = workerA.sendRequest('ACQUIRE_CLAIM', {
        reportId: report.id,
        claimToken: tokenA,
      });

      const claimPromiseB = workerB.sendRequest('ACQUIRE_CLAIM', {
        reportId: report.id,
        claimToken: tokenB,
      });

      const [resA, resB] = await Promise.all([claimPromiseA, claimPromiseB]);

      // Exactly one succeeds
      const successes = [resA.acquired, resB.acquired].filter(Boolean).length;
      expect(successes).toBe(1);

      // Verify DB record
      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('CALCULATING');
      const meta = dbReport?.metadata as Record<string, any>;
      expect([tokenA, tokenB]).toContain(meta?.claimToken);
    } finally {
      // Re-enable Redis on child workers
      await workerA.sendRequest('ENABLE_REDIS');
      await workerB.sendRequest('ENABLE_REDIS');
    }
  });

  it('10. Process termination (crash) at each critical point: claim, execution, completion', async () => {
    // 10a: Crash after claim but before execution -> stale recovery marks FAILED, ready for retry
    const orderA = await createPaidOrder('CAREER');
    const reportA = await prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: orderA.id,
        reportType: 'CAREER',
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
      },
    });

    // Spawn a one-shot child process to claim and crash
    const crashWorker = fork(RUNNER_SCRIPT, [], {
      execArgv: [require.resolve('tsx/cli')],
      env: { ...process.env, NODE_ENV: 'test', LLM_PROVIDER: 'mock' },
    });

    const token1 = `crash_claim_${crypto.randomUUID()}`;
    await new Promise<void>((resolve) => {
      crashWorker.on('message', (msg: any) => {
        if (msg.event === 'READY') {
          crashWorker.send({
            action: 'CLAIM_AND_CRASH',
            reportId: reportA.id,
            claimToken: token1,
          });
        }
      });
      crashWorker.on('exit', () => resolve());
    });

    // Manually age the report updatedAt to simulate stale crash
    await prisma.report.update({
      where: { id: reportA.id },
      data: { updatedAt: new Date(Date.now() - 6 * 60 * 1000) },
    });

    // Run recovery
    const rec1 = await careerReportWorker.recoverStaleJobs();
    expect(rec1.recoveredReports).toBeGreaterThanOrEqual(1);

    const reportAAfterRecovery = await prisma.report.findUnique({ where: { id: reportA.id } });
    expect(reportAAfterRecovery?.status).toBe('FAILED');

    // Can be cleanly retried
    const retried = await careerReportWorker.retryReportJob(reportA.id);
    expect(retried).toBe(true);

    // 10b: Crash during execution -> heartbeat ceases -> recovery picks up
    const orderB = await createPaidOrder('CAREER');
    const reportB = await prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: orderB.id,
        reportType: 'CAREER',
        status: 'ANALYZING',
        stage: 'ANALYZING',
        progress: 35,
        updatedAt: new Date(Date.now() - 7 * 60 * 1000), // Ceased heartbeating 7 mins ago
      },
    });

    const rec2 = await careerReportWorker.recoverStaleJobs();
    expect(rec2.recoveredReports).toBeGreaterThanOrEqual(1);

    const reportBAfterRecovery = await prisma.report.findUnique({ where: { id: reportB.id } });
    expect(reportBAfterRecovery?.status).toBe('FAILED');

    // 10c: Crash after completion -> no recovery needed
    const orderC = await createPaidOrder('CAREER');
    const reportC = await prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        birthProfileId: testProfile.id,
        orderId: orderC.id,
        reportType: 'CAREER',
        status: 'COMPLETED',
        stage: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
        updatedAt: new Date(Date.now() - 20 * 60 * 1000), // Completed 20 mins ago
      },
    });

    const rec3 = await careerReportWorker.recoverStaleJobs();
    const reportCAfterRecovery = await prisma.report.findUnique({ where: { id: reportC.id } });
    expect(reportCAfterRecovery?.status).toBe('COMPLETED');
    expect(reportCAfterRecovery?.progress).toBe(100);
  });
});
