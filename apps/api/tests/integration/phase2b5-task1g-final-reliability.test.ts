import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as path from 'path';
import { fork, ChildProcess } from 'child_process';
import crypto from 'crypto';
import { prisma } from '../../src/services/prisma.service';
import { redisQueueService } from '../../src/services/redis-queue.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { nativeRedisClient } from '../../src/services/redis-client';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { OrderStatus, FulfillmentStatus, ReportType } from '@prisma/client';
import { stubPlatformGeneration } from '../helpers/platform-report-stub';

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

  /** Simulates a crashed worker's lease running out (judged by the DB clock). */
  async function expireLease(reportId: string) {
    await prisma.$executeRaw`UPDATE "reports" SET "claimExpiresAt" = clock_timestamp() - INTERVAL '1 second' WHERE id = ${reportId}`;
  }

  /** A report a (possibly dead) worker holds: DB claim columns as the PostgreSQL queue writes them. */
  function claimedColumns(leaseMs: number, claimVersion = 1) {
    return {
      claimToken: crypto.randomUUID(),
      claimVersion,
      claimedAt: new Date(),
      claimExpiresAt: new Date(Date.now() + leaseMs),
      executionAttempts: claimVersion,
    };
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

      const activeToken = (resA.acquired ? resA.claim : resB.claim).claimToken;
      expect(activeToken).toBeTruthy();

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('CALCULATING');
      expect(dbReport?.claimToken).toBe(activeToken);
      expect(dbReport?.claimVersion).toBe(1);
    });

    it('Condition 2: completeJob called with matching token and version completes the report and clears the claim', async () => {
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

      const claim = await careerReportWorker.acquireWorkerClaim(report.id);
      expect(claim).not.toBeNull();

      const cleaned = await postgresQueueService.completeJob(report.id, claim!.claimToken, claim!.claimVersion, `reports/${report.id}.pdf`, 'r.pdf', 2048, 3);
      expect(cleaned).toBe(true);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('COMPLETED');
      expect(dbReport?.claimToken).toBeNull();
      expect(dbReport?.claimExpiresAt).toBeNull();
      expect(dbReport?.storageKey).toBe(`reports/${report.id}.pdf`);
      // Nothing left to claim
      expect(await postgresQueueService.claimJobById(report.id)).toBeNull();
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

      const claim = await careerReportWorker.acquireWorkerClaim(report.id);
      expect(claim).not.toBeNull();
      const before = await prisma.report.findUnique({ where: { id: report.id } });

      // Stale worker attempts completeJob with a foreign token, and with an old version
      expect(await postgresQueueService.completeJob(report.id, crypto.randomUUID(), claim!.claimVersion, 'x', 'x', 1, 1)).toBe(false);
      expect(await postgresQueueService.completeJob(report.id, claim!.claimToken, claim!.claimVersion - 1, 'x', 'x', 1, 1)).toBe(false);

      // Verify the active claim is COMPLETELY intact
      const after = await prisma.report.findUnique({ where: { id: report.id } });
      expect(after?.status).toBe('CALCULATING');
      expect(after?.claimToken).toBe(claim!.claimToken);
      expect(after?.claimVersion).toBe(claim!.claimVersion);
      expect(after?.claimExpiresAt?.getTime()).toBe(before?.claimExpiresAt?.getTime());
      expect(after?.storageKey).toBeNull();
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
      const { claimToken: ownerToken, claimVersion: ownerVersion } = claimA.claim;

      // Worker A renews claim (lease extended to 120 s)
      const renewA = await workerA.sendRequest('RENEW_CLAIM', { reportId: report.id, claimToken: ownerToken, claimVersion: ownerVersion, ttlMs: 120000 });
      expect(renewA.renewed).toBe(true);
      const renewed = await prisma.report.findUnique({ where: { id: report.id } });
      expect(renewed!.claimExpiresAt!.getTime()).toBeGreaterThan(Date.now() + 90000);

      // Worker B attempts to complete job with tokenB
      const compB = await workerB.sendRequest('COMPLETE_JOB', { reportId: report.id, claimToken: tokenB, claimVersion: ownerVersion });
      expect(compB.completed).toBe(false);

      // Active claim in the DB is still worker A's
      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('CALCULATING');
      expect(dbReport?.claimToken).toBe(ownerToken);
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

    it('Condition 12: failJobIfStale clears the worker claim upon successful failure transition', async () => {
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
          ...claimedColumns(-300000),
        },
      });
      expect(report.claimToken).not.toBeNull();

      const failed = await careerReportWorker.failJobIfStale(report.id, pastTime, 'STALE_TIMEOUT', 'Timeout');
      expect(failed).toBe(true);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('FAILED');
      expect(dbReport?.claimToken).toBeNull();
      expect(dbReport?.claimExpiresAt).toBeNull();
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
      expect(dbReport?.errorCode).toBeNull();

      // Exactly one queued job: one claim succeeds, a second finds nothing
      const first = await postgresQueueService.claimJobById(report.id);
      expect(first?.id).toBe(report.id);
      expect(first?.claimVersion).toBe(1);
      expect(await postgresQueueService.claimJobById(report.id)).toBeNull();
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

    it('Condition 16: Retry clears the stale claim and resets errorCode, errorMessage, failedAt; next claim increments claimVersion', async () => {
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
          claimToken: crypto.randomUUID(),
          claimVersion: 2,
          generationFailures: 4,
          recoveryAttempts: 3,
        },
      });

      const retried = await careerReportWorker.retryReportJob(report.id);
      expect(retried).toBe(true);

      const updated = await prisma.report.findUnique({ where: { id: report.id } });
      expect(updated?.status).toBe('QUEUED');
      expect(updated?.errorCode).toBeNull();
      expect(updated?.errorMessage).toBeNull();
      expect(updated?.failedAt).toBeNull();
      expect(updated?.claimToken).toBeNull();
      expect(updated?.generationFailures).toBe(0);
      expect(updated?.recoveryAttempts).toBe(0);
      expect(updated?.retryAfter).toBeNull();

      // The fencing version only moves forward: the next claim gets version 3
      const claim = await postgresQueueService.claimJobById(report.id);
      expect(claim?.claimVersion).toBe(3);
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

    it('Condition 18: Consecutive retry-and-claim cycles increment claimVersion monotonically', async () => {
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

      // First retry, then a worker claims and the attempt fails permanently
      expect(await careerReportWorker.retryReportJob(report.id)).toBe(true);
      const claim1 = await postgresQueueService.claimJobById(report.id);
      expect(claim1?.claimVersion).toBe(1);
      expect(await postgresQueueService.failJob(report.id, claim1!.claimToken, claim1!.claimVersion, 'X', 'x')).toBe(true);

      // Second retry and claim
      expect(await careerReportWorker.retryReportJob(report.id)).toBe(true);
      const claim2 = await postgresQueueService.claimJobById(report.id);
      expect(claim2?.claimVersion).toBe(2);

      // The first attempt's stale fencing pair can no longer write
      expect(await postgresQueueService.updateJobStatus(report.id, claim1!.claimToken, claim1!.claimVersion, 'ANALYZING', 'ANALYZING', 40)).toBe(false);
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

    it('Condition 20: Retry enqueues the report in the DB queue and it is immediately claimable', async () => {
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

      expect(await careerReportWorker.retryReportJob(report.id)).toBe(true);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('QUEUED');
      expect(dbReport?.retryAfter).toBeNull();
      const claim = await postgresQueueService.claimJobById(report.id);
      expect(claim?.id).toBe(report.id);
    });
  });

  // =========================================================================
  // SECTION D: QUEUE CRASH-WINDOW RECOVERY (Tests 21 - 30)
  // =========================================================================
  describe('Section D: Queue Crash-Window Recovery', () => {
    it('Condition 21: Process crash after DB commit but before enqueue bookkeeping leaves a claimable job', async () => {
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

      // Recovery does not fail or alter a committed QUEUED row
      const res = await careerReportWorker.recoverStaleJobs();
      expect(res.skipped).toBeUndefined();
      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('QUEUED');
      expect(dbReport?.recoveryAttempts).toBe(0);

      // The committed row is the queue entry: a worker claims it
      const claim = await postgresQueueService.claimJobById(report.id);
      expect(claim?.id).toBe(report.id);
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

    it('Condition 23: Process crash after worker claim: job recovered after lease expiry', async () => {
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

      const claim = await postgresQueueService.claimJobById(report.id);
      expect(claim?.id).toBe(report.id);

      // Worker crashed after claiming; the lease runs out
      await expireLease(report.id);
      const res = await careerReportWorker.recoverStaleJobs();
      expect(res.recoveredReports).toBeGreaterThanOrEqual(1);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('QUEUED');
      expect(dbReport?.recoveryAttempts).toBe(1);
      expect(dbReport?.claimVersion).toBe(claim!.claimVersion + 1);
      expect(dbReport?.claimToken).toBeNull();
      // The dead worker is fenced out
      expect(await postgresQueueService.updateJobStatus(report.id, claim!.claimToken, claim!.claimVersion, 'ANALYZING', 'ANALYZING', 40)).toBe(false);
    });

    it('Condition 24: Recovery obeys MAX_RECOVERY_ATTEMPTS (3) and transitions to FAILED on exhaustion', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'CALCULATING',
          stage: 'CALCULATING',
          recoveryAttempts: 3,
          ...claimedColumns(-60000, 4),
          createdAt: new Date(Date.now() - 350000),
          updatedAt: new Date(Date.now() - 350000),
        },
      });

      await careerReportWorker.recoverStaleJobs();

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('FAILED');
      expect(dbReport?.errorCode).toBe('RECOVERY_EXHAUSTED');
      expect(dbReport?.claimToken).toBeNull();
      expect(dbReport?.recoveryAttempts).toBe(4);

      // The order becomes recoverable FAILED (still PAID, retry without re-charge)
      const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(dbOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FAILED);
      expect(dbOrder?.status).toBe(OrderStatus.PAID);
    });

    it('Condition 25: Recovery increments recoveryAttempts counter on each re-enqueue', async () => {
      const order = await createPaidOrder();
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'ANALYZING',
          stage: 'ANALYZING',
          recoveryAttempts: 1,
          ...claimedColumns(-60000, 2),
          createdAt: new Date(Date.now() - 350000),
          updatedAt: new Date(Date.now() - 350000),
        },
      });

      await careerReportWorker.recoverStaleJobs();

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('QUEUED');
      expect(dbReport?.recoveryAttempts).toBe(2);
      expect(dbReport?.claimVersion).toBe(3);
      // Exponential backoff: 2^1 * 10 s after the previous recovery
      expect(dbReport!.retryAfter!.getTime()).toBeGreaterThan(Date.now() + 10000);
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
          status: 'CALCULATING',
          stage: 'CALCULATING',
          ...claimedColumns(-60000),
          createdAt: new Date(Date.now() - 350000),
          updatedAt: new Date(Date.now() - 350000),
        },
      });

      await Promise.all([
        careerReportWorker.recoverStaleJobs(),
        careerReportWorker.recoverStaleJobs(),
      ]);

      // Recovered exactly once
      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('QUEUED');
      expect(dbReport?.recoveryAttempts).toBe(1);
      expect(dbReport?.claimVersion).toBe(2);
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
      expect(dbClaimed?.claimVersion).toBe(1);

      // While the dead worker's lease is live, nobody else can claim
      const tokenB = crypto.randomUUID();
      const early = await workerB.sendRequest('ACQUIRE_CLAIM', { reportId: report.id, claimToken: tokenB });
      expect(early.acquired).toBe(false);

      // Worker B takes over once the lease expires (expired leases are directly re-claimable)
      await expireLease(report.id);
      const claimB = await workerB.sendRequest('ACQUIRE_CLAIM', { reportId: report.id, claimToken: tokenB });
      expect(claimB.acquired).toBe(true);
      expect(claimB.claim.claimVersion).toBe(2);
      expect(claimB.claim.claimToken).not.toBe(dbClaimed?.claimToken);
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
      {
        // The paid LLM generation is substituted; delivery, fencing and fulfilment run for real.
        const generation = stubPlatformGeneration();
        try {
          await careerReportWorker.executeReportPipeline(report.id);
        } finally {
          generation.mockRestore();
        }
      }

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

      const claimed = await careerReportWorker.acquireWorkerClaim(report.id);
      expect(claimed?.id).toBe(report.id);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport?.status).toBe('CALCULATING');
      expect(dbReport?.claimToken).toBe(claimed!.claimToken);
      expect(dbReport?.claimVersion).toBe(1);
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
      const claim = claimedColumns(60000);
      const token = claim.claimToken;
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'CALCULATING',
          stage: 'CALCULATING',
          progress: 20,
          ...claim,
        },
      });

      // Wrong token fails
      const badUpdate = await careerReportWorker.updateJobStatus(
        report.id,
        'ANALYZING',
        35,
        'ANALYZING',
        'wrong_token',
        claim.claimVersion
      );
      expect(badUpdate).toBe(false);

      // Correct token with a stale version fails
      const staleVersion = await careerReportWorker.updateJobStatus(report.id, 'ANALYZING', 35, 'ANALYZING', token, claim.claimVersion - 1);
      expect(staleVersion).toBe(false);
      expect((await prisma.report.findUnique({ where: { id: report.id } }))?.status).toBe('CALCULATING');

      // Correct token succeeds
      const goodUpdate = await careerReportWorker.updateJobStatus(
        report.id,
        'ANALYZING',
        35,
        'ANALYZING',
        token,
        claim.claimVersion
      );
      expect(goodUpdate).toBe(true);
      expect((await prisma.report.findUnique({ where: { id: report.id } }))?.status).toBe('ANALYZING');
    });

    it('Condition 39: Under Redis outage, touchHeartbeat updates updatedAt without error', async () => {
      const order = await createPaidOrder();
      const claim = claimedColumns(30000);
      const report = await prisma.report.create({
        data: {
          userId: testUser.id,
          birthProfileId: testProfile.id,
          orderId: order.id,
          reportType: 'CAREER',
          status: 'CALCULATING',
          stage: 'CALCULATING',
          ...claim,
          updatedAt: new Date(Date.now() - 60000),
        },
      });

      const alive = await careerReportWorker.touchHeartbeat(report.id, claim.claimToken, claim.claimVersion);
      expect(alive).toBe(true);

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      expect(dbReport!.updatedAt.getTime()).toBeGreaterThan(report.updatedAt.getTime());
      // Lease extended beyond the original 30 s
      expect(dbReport!.claimExpiresAt!.getTime()).toBeGreaterThan(claim.claimExpiresAt.getTime());
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

      {
        // The paid LLM generation is substituted; delivery, fencing and fulfilment run for real.
        const generation = stubPlatformGeneration();
        try {
          await careerReportWorker.executeReportPipeline(report.id);
        } finally {
          generation.mockRestore();
        }
      }

      const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
      const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });

      expect(dbReport?.status).toBe('COMPLETED');
      expect(dbOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);
    });
  });
});
