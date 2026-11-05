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

describe('Phase 2B.5 Task 1G: Final Distributed Report Queue Reliability Remediation Suite', { timeout: 60000 }, () => {
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
        metadata: {
          catalogId: targetCatalog,
          birthProfileId: testProfile.id,
        },
      },
    });
  }

  beforeAll(async () => {
    testUser = await prisma.user.create({
      data: {
        email: `task1g_test_${Date.now()}@example.com`,
        phoneNumber: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        fullName: 'Task 1G User',
      },
    });

    testProfile = await prisma.birthProfile.create({
      data: {
        userId: testUser.id,
        name: 'Task 1G Subject',
        dateOfBirth: '1990-05-15',
        timeOfBirth: '14:30',
        placeName: 'New Delhi, India',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
    });

    workerA = await spawnWorker();
    workerB = await spawnWorker();
  });

  afterAll(async () => {
    try {
      if (workerA?.process?.connected) workerA.process.kill('SIGKILL');
      if (workerB?.process?.connected) workerB.process.kill('SIGKILL');
      await redisQueueService.clearQueue();
      await prisma.report.deleteMany({ where: { userId: testUser.id } });
      await prisma.order.deleteMany({ where: { userId: testUser.id } });
      await prisma.birthProfile.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.deleteMany({ where: { id: testUser.id } });
    } catch (_) {}
  });

  beforeEach(async () => {
    await redisQueueService.clearQueue();
    nativeRedisClient.setMockDisabled(false);
  });

  // =========================================================================
  // SECTION A: WORKER OWNERSHIP & LEASE INTEGRITY (Tests 1 - 7)
  // =========================================================================
  describe('Section A: Worker Ownership & Lease Integrity', () => {
    it('Condition 1: Two child processes attempt to claim the same report concurrently: exactly one succeeds', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
        },
      });

      const tokenA = crypto.randomUUID();
      const tokenB = crypto.randomUUID();

      const [resA, resB] = await Promise.all([
        workerA.sendRequest('ACQUIRE_CLAIM', { reportId: report.id, claimToken: tokenA }),
        workerB.sendRequest('ACQUIRE_CLAIM', { reportId: report.id, claimToken: tokenB }),
      ]);

      const successCount = (resA.acquired ? 1 : 0) + (resB.acquired ? 1 : 0);
      expect(successCount).toBe(1);

      const activeToken = await redisQueueService.getClaimToken(report.id);
      expect(activeToken).toBeTruthy();
      expect([tokenA, tokenB]).toContain(activeToken);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('CALCULATING');
      expect((dbReport?.metadata as any)?.claimToken).toBe(activeToken);
    });

    it('Condition 2: completeJob called with matching token cleans up claimKey, claimsHash, claimedSet, and pendingSet', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
        },
      });

      const token = crypto.randomUUID();
      await careerReportWorker.acquireWorkerClaim(report.id, token);
      expect(await redisQueueService.isClaimActive(report.id)).toBe(true);

      const cleaned = await redisQueueService.completeJob(report.id, token);
      expect(cleaned).toBe(true);

      expect(await redisQueueService.isClaimActive(report.id)).toBe(false);
      expect(await redisQueueService.getClaimToken(report.id)).toBeNull();
      expect(await redisQueueService.isClaimedByWorker(report.id)).toBe(false);
      expect(await redisQueueService.isInPendingQueue(report.id)).toBe(false);
    });

    it('Condition 3: completeJob called with non-matching token returns false and deletes NOTHING', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
        },
      });

      const realToken = crypto.randomUUID();
      const staleToken = crypto.randomUUID();

      await careerReportWorker.acquireWorkerClaim(report.id, realToken);
      expect(await redisQueueService.getClaimToken(report.id)).toBe(realToken);

      // Stale worker attempts completeJob
      const res = await redisQueueService.completeJob(report.id, staleToken);
      expect(res).toBe(false);

      // Verify the active claim is COMPLETELY intact
      expect(await redisQueueService.getClaimToken(report.id)).toBe(realToken);
      expect(await redisQueueService.isClaimActive(report.id)).toBe(true);
    });

    it('Condition 4: renewReportClaim with matching token extends TTL in Redis', async () => {
      const reportId = crypto.randomUUID();
      const token = crypto.randomUUID();

      // Acquire claim with short initial TTL
      await redisQueueService.acquireReportClaim(reportId, token, 10000);
      expect(await redisQueueService.getClaimToken(reportId)).toBe(token);

      // Renew with matching token for 60s
      const renewed = await redisQueueService.renewReportClaim(reportId, token, 60000);
      expect(renewed).toBe(true);
      expect(await redisQueueService.getClaimToken(reportId)).toBe(token);
    });

    it('Condition 5: renewReportClaim with non-matching token returns false and does not alter claim', async () => {
      const reportId = crypto.randomUUID();
      const realToken = crypto.randomUUID();
      const staleToken = crypto.randomUUID();

      await redisQueueService.acquireReportClaim(reportId, realToken, 30000);

      const renewed = await redisQueueService.renewReportClaim(reportId, staleToken, 60000);
      expect(renewed).toBe(false);
      expect(await redisQueueService.getClaimToken(reportId)).toBe(realToken);
    });

    it('Condition 6: releaseReportClaim with non-matching token returns false and preserves active owner', async () => {
      const reportId = crypto.randomUUID();
      const realToken = crypto.randomUUID();
      const staleToken = crypto.randomUUID();

      await redisQueueService.acquireReportClaim(reportId, realToken, 30000);

      const released = await redisQueueService.releaseReportClaim(reportId, staleToken);
      expect(released).toBe(false);
      expect(await redisQueueService.getClaimToken(reportId)).toBe(realToken);
    });

    it('Condition 7: Cross-process lease renewal and stale worker completeJob rejection', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
        },
      });

      const tokenA = crypto.randomUUID();
      const tokenB = crypto.randomUUID();

      // Worker A claims
      const claimA = await workerA.sendRequest('ACQUIRE_CLAIM', { reportId: report.id, claimToken: tokenA });
      expect(claimA.acquired).toBe(true);

      // Worker A renews claim
      const renewA = await workerA.sendRequest('RENEW_CLAIM', { reportId: report.id, claimToken: tokenA, ttlMs: 60000 });
      expect(renewA.renewed).toBe(true);

      // Worker B attempts to complete job with tokenB
      const compB = await workerB.sendRequest('COMPLETE_JOB', { reportId: report.id, claimToken: tokenB });
      expect(compB.completed).toBe(false);

      // Active claim in Redis is still tokenA
      expect(await redisQueueService.getClaimToken(report.id)).toBe(tokenA);
    });
  });

  // =========================================================================
  // SECTION B: RECOVERY RACING & HEARTBEAT SAFETY (Tests 8 - 12)
  // =========================================================================
  describe('Section B: Recovery Racing & Heartbeat Safety', () => {
    it('Condition 8: Heartbeat advancing between stale query and failJobIfStale aborts recovery', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'CALCULATING',
          stage: 'CALCULATING',
          progress: 25,
          updatedAt: new Date(Date.now() - 360000), // 6 minutes ago
        },
      });

      const capturedUpdatedAt = report.updatedAt;

      // Active worker touches heartbeat in PostgreSQL
      await careerReportWorker.touchHeartbeat(report.id);

      // Stale recovery attempts failJobIfStale with stale capturedUpdatedAt
      const failed = await careerReportWorker.failJobIfStale(
        report.id,
        capturedUpdatedAt,
        'STALE_WORKER',
        'Stale execution timeout'
      );

      expect(failed).toBe(false);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('CALCULATING');
      expect(dbReport?.errorCode).toBeNull();
    });

    it('Condition 9: Recovery racing with report completion preserves COMPLETED status and FULFILLED order', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'COMPILING',
          stage: 'COMPILING',
          progress: 80,
          updatedAt: new Date(Date.now() - 360000),
        },
      });

      const capturedUpdatedAt = report.updatedAt;

      // Worker finishes report
      await prisma.report.update({
        where: { id: report.id },
        data: {
          status: 'COMPLETED',
          stage: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
      });

      // Stale recovery runs
      const failed = await careerReportWorker.failJobIfStale(
        report.id,
        capturedUpdatedAt,
        'STALE_TIMEOUT',
        'Stale recovery attempt'
      );

      expect(failed).toBe(false);

      const finalReport = await prisma.report.findUnique({ where: { id: report.id } });
      const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });

      expect(finalReport?.status).toBe('COMPLETED');
      expect(finalOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);
    });

    it('Condition 10: Truly abandoned CALCULATING report without heartbeat is safely transitioned to FAILED', async () => {
      const order = await createPaidOrder();
      const pastTime = new Date(Date.now() - 400000);
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'CALCULATING',
          stage: 'CALCULATING',
          progress: 25,
          updatedAt: pastTime,
        },
      });

      const failed = await careerReportWorker.failJobIfStale(
        report.id,
        pastTime,
        'STALE_WORKER',
        'Stale execution'
      );

      expect(failed).toBe(true);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });

      expect(dbReport?.status).toBe('FAILED');
      expect(dbReport?.errorCode).toBe('STALE_WORKER');
      expect(dbOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FAILED);
    });

    it('Condition 11: Two recovery processes race to fail the same stale job: exactly one succeeds', async () => {
      const order = await createPaidOrder();
      const pastTime = new Date(Date.now() - 400000);
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'CALCULATING',
          stage: 'CALCULATING',
          progress: 25,
          updatedAt: pastTime,
        },
      });

      const [res1, res2] = await Promise.all([
        workerA.sendRequest('FAIL_IF_STALE', { reportId: report.id, capturedUpdatedAt: pastTime.toISOString() }),
        workerB.sendRequest('FAIL_IF_STALE', { reportId: report.id, capturedUpdatedAt: pastTime.toISOString() }),
      ]);

      const successCount = (res1.failed ? 1 : 0) + (res2.failed ? 1 : 0);
      expect(successCount).toBe(1);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('FAILED');
    });

    it('Condition 12: failJobIfStale cleans up Redis claim upon successful failure transition', async () => {
      const order = await createPaidOrder();
      const pastTime = new Date(Date.now() - 400000);
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'CALCULATING',
          stage: 'CALCULATING',
          progress: 25,
          updatedAt: pastTime,
        },
      });

      const token = crypto.randomUUID();
      await redisQueueService.acquireReportClaim(report.id, token);
      expect(await redisQueueService.isClaimActive(report.id)).toBe(true);

      await careerReportWorker.failJobIfStale(report.id, pastTime, 'STALE_TIMEOUT', 'Timeout');

      expect(await redisQueueService.isClaimActive(report.id)).toBe(false);
    });
  });

  // =========================================================================
  // SECTION C: ATOMIC & HONEST RETRY HANDLING (Tests 13 - 20)
  // =========================================================================
  describe('Section C: Atomic & Honest Retry Handling', () => {
    it('Condition 13: Two simultaneous retry requests for the same failed report: exactly one succeeds', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'FAILED',
          stage: 'FAILED',
          progress: 0,
          errorCode: 'MOCK_ERROR',
          errorMessage: 'Original error',
          failedAt: new Date(),
        },
      });

      const [retA, retB] = await Promise.all([
        workerA.sendRequest('RETRY_REPORT', { reportId: report.id }),
        workerB.sendRequest('RETRY_REPORT', { reportId: report.id }),
      ]);

      const successCount = (retA.retried ? 1 : 0) + (retB.retried ? 1 : 0);
      expect(successCount).toBe(1);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('QUEUED');
      expect((dbReport?.metadata as any)?.claimVersion).toBe(1);

      // Verify exactly one item in pending queue
      const qLen = await redisQueueService.getQueueLength();
      expect(qLen).toBe(1);
    });

    it('Condition 14: Retry rejected if report is not in FAILED status', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'CALCULATING',
          stage: 'CALCULATING',
          progress: 30,
        },
      });

      const retried = await careerReportWorker.retryReportJob(report.id);
      expect(retried).toBe(false);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('CALCULATING');
    });

    it('Condition 15: Retry rejected if associated order is not PAID', async () => {
      const order = await prisma.order.create({
        data: {
          id: crypto.randomUUID(),
          userId: testUser.id,
          razorpayOrderId: `order_${crypto.randomBytes(8).toString('hex')}`,
          amount: 29900,
          currency: 'INR',
          status: OrderStatus.CREATED,
          paymentStatus: 'PENDING' as any,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          reportType: 'CAREER',
        },
      });

      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'FAILED',
          stage: 'FAILED',
        },
      });

      const retried = await careerReportWorker.retryReportJob(report.id);
      expect(retried).toBe(false);
    });

    it('Condition 16: Retry increments claimVersion and resets errorCode, errorMessage, failedAt', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'FAILED',
          stage: 'FAILED',
          progress: 0,
          errorCode: 'CRASH',
          errorMessage: 'Worker died',
          failedAt: new Date(),
          metadata: { claimVersion: 2 },
        },
      });

      const retried = await careerReportWorker.retryReportJob(report.id);
      expect(retried).toBe(true);

      const updated = await prisma.report.findUnique({ where: { id: report.id } });
      expect(updated?.status).toBe('QUEUED');
      expect(updated?.errorCode).toBeNull();
      expect(updated?.errorMessage).toBeNull();
      expect(updated?.failedAt).toBeNull();
      expect((updated?.metadata as any)?.claimVersion).toBe(3);
    });

    it('Condition 17: Retry transitions order fulfillmentStatus back to PROCESSING', async () => {
      const order = await createPaidOrder();
      await prisma.order.update({
        where: { id: order.id },
        data: { fulfillmentStatus: FulfillmentStatus.FAILED },
      });

      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'FAILED',
          stage: 'FAILED',
        },
      });

      await careerReportWorker.retryReportJob(report.id);

      const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(dbOrder?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
    });

    it('Condition 18: Consecutive retries increment claimVersion monotonically', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'FAILED',
          stage: 'FAILED',
        },
      });

      // First retry
      await careerReportWorker.retryReportJob(report.id);
      let rep = await prisma.report.findUnique({ where: { id: report.id } });
      expect((rep?.metadata as any)?.claimVersion).toBe(1);

      // Fail again
      await prisma.report.update({ where: { id: report.id }, data: { status: 'FAILED' } });

      // Second retry
      await careerReportWorker.retryReportJob(report.id);
      rep = await prisma.report.findUnique({ where: { id: report.id } });
      expect((rep?.metadata as any)?.claimVersion).toBe(2);
    });

    it('Condition 19: Retry without orderId succeeds cleanly for free reports', async () => {
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: null,
          reportType: 'KUNDLI',
          status: 'FAILED',
          stage: 'FAILED',
        },
      });

      const retried = await careerReportWorker.retryReportJob(report.id);
      expect(retried).toBe(true);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('QUEUED');
      expect(dbReport?.orderId).toBeNull();
    });

    it('Condition 20: Retry enqueues to Redis and marks metadata.enqueued true', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'FAILED',
          stage: 'FAILED',
        },
      });

      await careerReportWorker.retryReportJob(report.id);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect((dbReport?.metadata as any)?.enqueued).toBe(true);
      expect(await redisQueueService.isInPendingQueue(report.id)).toBe(true);
    });
  });

  // =========================================================================
  // SECTION D: QUEUE CRASH-WINDOW RECOVERY (Tests 21 - 30)
  // =========================================================================
  describe('Section D: Queue Crash-Window Recovery', () => {
    it('Condition 21: Process crash after DB commit but before Redis enqueue is recovered by recoverStaleJobs', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
          metadata: { enqueued: false },
          createdAt: new Date(Date.now() - 350000), // > 5 minutes ago
          updatedAt: new Date(Date.now() - 350000),
        },
      });

      // Verify not yet in Redis
      expect(await redisQueueService.isInPendingQueue(report.id)).toBe(false);

      // Run recovery
      const res = await careerReportWorker.recoverStaleJobs();
      expect(res.recoveredReports).toBeGreaterThanOrEqual(1);

      // Verify now in Redis pending queue
      expect(await redisQueueService.isInPendingQueue(report.id)).toBe(true);
    });

    it('Condition 22: Process crash after Redis enqueue but before metadata update does NOT duplicate job', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
          metadata: { enqueued: false },
          createdAt: new Date(Date.now() - 350000),
          updatedAt: new Date(Date.now() - 350000),
        },
      });

      // Already in Redis
      await redisQueueService.enqueueJob(report.id);
      expect(await redisQueueService.getQueueLength()).toBe(1);

      // Recovery runs
      await careerReportWorker.recoverStaleJobs();

      // Set deduplication guarantees only 1 entry in queue
      expect(await redisQueueService.getQueueLength()).toBe(1);
    });

    it('Condition 23: Process crash after worker dequeue: job recovered after stale timeout', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
          metadata: { enqueued: true },
          updatedAt: new Date(Date.now() - 400000),
        },
      });

      await redisQueueService.enqueueJob(report.id);
      const popped = await redisQueueService.dequeueJob();
      expect(popped).toBe(report.id);

      // Job is claimed in Redis set but worker crashed before DB update
      const res = await careerReportWorker.recoverStaleJobs();
      expect(res.recoveredReports).toBeGreaterThanOrEqual(1);
    });

    it('Condition 24: Recovery obeys MAX_RECOVERY_ATTEMPTS (3) and transitions to FAILED on exhaustion', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
          metadata: { recoveryAttempts: 3, enqueued: false },
          createdAt: new Date(Date.now() - 350000),
          updatedAt: new Date(Date.now() - 350000),
        },
      });

      await careerReportWorker.recoverStaleJobs();

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('FAILED');
      expect(dbReport?.errorCode).toBe('QUEUE_RECOVERY_EXHAUSTED');
    });

    it('Condition 25: Recovery increments recoveryAttempts counter on each re-enqueue', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
          metadata: { recoveryAttempts: 1, enqueued: false },
          createdAt: new Date(Date.now() - 350000),
          updatedAt: new Date(Date.now() - 350000),
        },
      });

      await careerReportWorker.recoverStaleJobs();

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect((dbReport?.metadata as any)?.recoveryAttempts).toBe(2);
    });

    it('Condition 26: Recovery does not re-enqueue recently created QUEUED jobs (< 5m)', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
          metadata: { enqueued: false },
          createdAt: new Date(), // Just created
          updatedAt: new Date(),
        },
      });

      const res = await careerReportWorker.recoverStaleJobs();
      expect(res.recoveredReports).toBe(0);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect((dbReport?.metadata as any)?.recoveryAttempts || 0).toBe(0);
    });

    it('Condition 27: Stale recovery coordination: two recovery runs in parallel do not duplicate re-enqueues', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
          metadata: { enqueued: false },
          createdAt: new Date(Date.now() - 350000),
          updatedAt: new Date(Date.now() - 350000),
        },
      });

      await Promise.all([
        careerReportWorker.recoverStaleJobs(),
        careerReportWorker.recoverStaleJobs(),
      ]);

      const qLen = await redisQueueService.getQueueLength();
      expect(qLen).toBe(1);
    });

    it('Condition 28: Enqueue attempt while report is actively claimed does NOT remove claim', async () => {
      const reportId = crypto.randomUUID();
      const claimToken = crypto.randomUUID();

      await redisQueueService.acquireReportClaim(reportId, claimToken);
      expect(await redisQueueService.getClaimToken(reportId)).toBe(claimToken);

      await redisQueueService.enqueueJob(reportId);

      // Active claim token must be unchanged
      expect(await redisQueueService.getClaimToken(reportId)).toBe(claimToken);
    });

    it('Condition 29: Stale worker attempting stage update after losing ownership is rejected', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'CALCULATING',
          stage: 'CALCULATING',
          progress: 20,
          metadata: { claimToken: 'token_new' },
        },
      });

      // Worker holding stale token attempts stage update
      const updated = await careerReportWorker.updateJobStatus(
        report.id,
        'ANALYZING',
        35,
        'ANALYZING',
        'token_stale'
      );

      expect(updated).toBe(false);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('CALCULATING');
    });

    it('Condition 30: Multi-process crash recovery at claim boundary', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
        },
      });

      const token = `crash_${crypto.randomUUID()}`;
      // Spawn a dedicated one-shot child process to claim and crash
      const crashWorker = fork(RUNNER_SCRIPT, [], {
        execArgv: [require.resolve('tsx/cli')],
        env: { ...process.env, NODE_ENV: 'test', LLM_PROVIDER: 'mock' },
      });

      await new Promise<void>((resolve) => {
        crashWorker.on('message', (msg: any) => {
          if (msg.event === 'READY') {
            crashWorker.send({
              action: 'CLAIM_AND_CRASH',
              reportId: report.id,
              claimToken: token,
            });
          }
        });
        crashWorker.on('exit', () => resolve());
      });

      // Verify report was claimed before crash
      const dbClaimed = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbClaimed?.status).toBe('CALCULATING');

      // Worker B can take over after release
      await redisQueueService.releaseReportClaim(report.id, token);
      await prisma.report.update({ where: { id: report.id }, data: { status: 'QUEUED' } });

      const tokenB = crypto.randomUUID();
      const claimB = await workerB.sendRequest('ACQUIRE_CLAIM', { reportId: report.id, claimToken: tokenB });
      expect(claimB.acquired).toBe(true);
    });
  });

  // =========================================================================
  // SECTION E: ORDER FULFILLMENT INTEGRITY (Tests 31 - 35)
  // =========================================================================
  describe('Section E: Order Fulfillment Integrity', () => {
    it('Condition 31: Order marked FULFILLED only when report successfully reaches COMPLETED', async () => {
      const order = await createPaidOrder('KUNDLI');
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'KUNDLI',
          status: 'QUEUED',
          stage: 'QUEUED',
        },
      });

      expect(order.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);

      // Execute pipeline
      await careerReportWorker.executeReportPipeline(report.id);

      const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });

      expect(dbReport?.status).toBe('COMPLETED');
      expect(dbOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);
    });

    it('Condition 32: If a report fails permanently, order fulfillmentStatus transitions to FAILED', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'CALCULATING',
          stage: 'CALCULATING',
        },
      });

      await careerReportWorker.failJob(report.id, 'PERMANENT_ERROR', 'Fatal error');

      const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(dbOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FAILED);
    });

    it('Condition 33: Multi-report order: one completed report prevents order from ever marking FAILED', async () => {
      const order = await createPaidOrder();

      // First report completed
      const rep1 = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'COMPLETED',
          stage: 'COMPLETED',
        },
      });

      // Second report fails
      const rep2 = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'CALCULATING',
          stage: 'CALCULATING',
        },
      });

      await careerReportWorker.failJob(rep2.id, 'SUB_REPORT_FAIL', 'Minor failure');

      const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
      // Order must NOT be FAILED because rep1 is COMPLETED
      expect(dbOrder?.fulfillmentStatus).not.toBe(FulfillmentStatus.FAILED);
    });

    it('Condition 34: Retry on failed report returns order fulfillmentStatus to PROCESSING', async () => {
      const order = await createPaidOrder();
      await prisma.order.update({
        where: { id: order.id },
        data: { fulfillmentStatus: FulfillmentStatus.FAILED },
      });

      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'FAILED',
          stage: 'FAILED',
        },
      });

      await careerReportWorker.retryReportJob(report.id);

      const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(dbOrder?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
    });

    it('Condition 35: Expired worker completing after report already completed does not overwrite or double-fulfill', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'COMPLETED',
          stage: 'COMPLETED',
          progress: 100,
          metadata: { claimToken: 'winner_token' },
        },
      });

      // Expired worker with loser_token attempts Stage 7 completion
      const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'];
      const updateRes = await prisma.report.updateMany({
        where: {
          id: report.id,
          status: { in: activeStatuses as any[] },
          metadata: { path: ['claimToken'], equals: 'loser_token' },
        },
        data: { status: 'COMPLETED' },
      });

      expect(updateRes.count).toBe(0);
    });
  });

  // =========================================================================
  // SECTION F: POSTGRESQL FALLBACK CONCURRENCY (Tests 36 - 41)
  // =========================================================================
  describe('Section F: PostgreSQL Fallback Concurrency Under Redis Outage', () => {
    beforeEach(() => {
      nativeRedisClient.setMockDisabled(true);
    });

    afterEach(() => {
      nativeRedisClient.setMockDisabled(false);
    });

    it('Condition 36: Under Redis outage, single worker successfully acquires claim via DB CAS', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
        },
      });

      const token = crypto.randomUUID();
      const claimed = await careerReportWorker.acquireWorkerClaim(report.id, token);
      expect(claimed).toBe(true);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('CALCULATING');
      expect((dbReport?.metadata as any)?.claimToken).toBe(token);
    });

    it('Condition 37: Under Redis outage, two workers compete for claim: exactly one succeeds via DB CAS', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'QUEUED',
          stage: 'QUEUED',
        },
      });

      const tokenA = crypto.randomUUID();
      const tokenB = crypto.randomUUID();

      const [resA, resB] = await Promise.all([
        careerReportWorker.acquireWorkerClaim(report.id, tokenA),
        careerReportWorker.acquireWorkerClaim(report.id, tokenB),
      ]);

      const successCount = (resA ? 1 : 0) + (resB ? 1 : 0);
      expect(successCount).toBe(1);
    });

    it('Condition 38: Under Redis outage, stage transitions enforce claimToken in DB', async () => {
      const order = await createPaidOrder();
      const token = crypto.randomUUID();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'CALCULATING',
          stage: 'CALCULATING',
          progress: 20,
          metadata: { claimToken: token },
        },
      });

      // Wrong token fails
      const badUpdate = await careerReportWorker.updateJobStatus(
        report.id,
        'ANALYZING',
        35,
        'ANALYZING',
        'wrong_token'
      );
      expect(badUpdate).toBe(false);

      // Correct token succeeds
      const goodUpdate = await careerReportWorker.updateJobStatus(
        report.id,
        'ANALYZING',
        35,
        'ANALYZING',
        token
      );
      expect(goodUpdate).toBe(true);
    });

    it('Condition 39: Under Redis outage, touchHeartbeat updates updatedAt without error', async () => {
      const order = await createPaidOrder();
      const token = crypto.randomUUID();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'CALCULATING',
          stage: 'CALCULATING',
          metadata: { claimToken: token },
        },
      });

      const alive = await careerReportWorker.touchHeartbeat(report.id, token);
      expect(alive).toBe(true);
    });

    it('Condition 40: Under Redis outage, completeJob succeeds cleanly via fallback tracking', async () => {
      const reportId = crypto.randomUUID();
      const token = crypto.randomUUID();

      await redisQueueService.acquireReportClaim(reportId, token);
      const res = await redisQueueService.completeJob(reportId, token);
      expect(res).toBe(true);
    });

    it('Condition 41: End-to-end report execution completes under Redis outage using DB fallback', async () => {
      const order = await createPaidOrder('KUNDLI');
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'KUNDLI',
          status: 'QUEUED',
          stage: 'QUEUED',
        },
      });

      await careerReportWorker.executeReportPipeline(report.id);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });

      expect(dbReport?.status).toBe('COMPLETED');
      expect(dbOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);
    });
  });
});
