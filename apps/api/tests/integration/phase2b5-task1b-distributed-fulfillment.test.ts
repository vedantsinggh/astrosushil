import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { distributedLockService } from '../../src/services/distributed-lock.service';
import { nativeRedisClient } from '../../src/services/redis-client';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { paymentService } from '../../src/services/payment.service';
import { OrderStatus, PaymentStatus, FulfillmentStatus } from '@prisma/client';

describe('Phase 2B.5 Task 1B: Distributed Report Deduplication & Order Fulfillment Integrity', () => {
  let appInstanceA: FastifyInstance;
  let appInstanceB: FastifyInstance;
  let testUserA: any;
  let testUserB: any;
  let testProfileA: any;
  let testProfileB: any;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret_key_phase2b5';

    // Create two independent Fastify API service instances sharing the same DB & Redis
    appInstanceA = await buildApp();
    appInstanceB = await buildApp();
    await appInstanceA.ready();
    await appInstanceB.ready();

    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: { in: ['task1b-user-a', 'task1b-user-b'] } },
          { phoneNumber: { in: ['+919111111111', '+919222222222'] } },
          { email: { in: ['task1b.user.a@astrosushil.com', 'task1b.user.b@astrosushil.com'] } },
        ],
      },
    });

    // Seed test users
    testUserA = await prisma.user.create({
      data: {
        id: 'task1b-user-a',
        email: 'task1b.user.a@astrosushil.com',
        phoneNumber: '+919111111111',
        fullName: 'Task 1B Test User A',
        role: 'USER',
      },
    });

    testUserB = await prisma.user.create({
      data: {
        id: 'task1b-user-b',
        email: 'task1b.user.b@astrosushil.com',
        phoneNumber: '+919222222222',
        fullName: 'Task 1B Test User B',
        role: 'USER',
      },
    });

    // Seed test profiles
    testProfileA = await prisma.birthProfile.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUserA.id,
        name: 'Profile A - Delhi Native',
        dateOfBirth: '1990-01-15T00:00:00.000Z',
        timeOfBirth: '10:30',
        placeName: 'New Delhi, India',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
      },
    });

    testProfileB = await prisma.birthProfile.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUserA.id,
        name: 'Profile B - Mumbai Native',
        dateOfBirth: '1992-05-20T00:00:00.000Z',
        timeOfBirth: '14:45',
        placeName: 'Mumbai, India',
        latitude: 19.0760,
        longitude: 72.8777,
        timezone: 'Asia/Kolkata',
      },
    });

    tokenA = (appInstanceA as any).jwt.sign({ sub: testUserA.id, role: 'USER' });
    tokenB = (appInstanceA as any).jwt.sign({ sub: testUserB.id, role: 'USER' });
  });

  beforeEach(async () => {
    await prisma.report.deleteMany({ where: { userId: { in: [testUserA.id, testUserB.id] } } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [testUserA.id, testUserB.id] } } } });
    await prisma.order.deleteMany({ where: { userId: { in: [testUserA.id, testUserB.id] } } });
  });

  afterAll(async () => {
    // Restore Redis config if modified during tests
    nativeRedisClient.setMockDisabled(false);

    await prisma.report.deleteMany({ where: { userId: { in: ['task1b-user-a', 'task1b-user-b'] } } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: { in: ['task1b-user-a', 'task1b-user-b'] } } } });
    await prisma.order.deleteMany({ where: { userId: { in: ['task1b-user-a', 'task1b-user-b'] } } });
    await prisma.birthProfile.deleteMany({ where: { userId: { in: ['task1b-user-a', 'task1b-user-b'] } } });
    await prisma.user.deleteMany({ where: { id: { in: ['task1b-user-a', 'task1b-user-b'] } } });

    await appInstanceA.close();
    await appInstanceB.close();
  });

  // Helper to create verified PAID order
  async function createPaidOrder(sku: string, user = testUserA) {
    const orderId = crypto.randomUUID();
    const rzpOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    const rzpPayId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const targetCatalog = `report-${sku.toLowerCase().replace(/_/g, '-')}`;

    return await prisma.order.create({
      data: {
        id: orderId,
        userId: user.id,
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPayId,
        amount: 29900,
        currency: 'INR',
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.CAPTURED,
        fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
        reportType: sku as any,
        items: {
          create: [
            {
              catalogId: targetCatalog,
              itemType: 'REPORT',
              title: `${sku} Report`,
              unitPrice: 29900,
              totalAmount: 29900,
            },
          ],
        },
      },
      include: { items: true, reports: true },
    });
  }

  // =========================================================================
  // PART 1: DISTRIBUTED REPORT DEDUPLICATION
  // =========================================================================

  describe('1. Distributed Report-Job Deduplication', () => {
    it('1.1 Concurrent equivalent requests across two independent API instances produce identical reportId and single job', async () => {
      const order = await createPaidOrder('KUNDLI');

      // Send requests simultaneously to Instance A and Instance B
      const [resA, resB] = await Promise.all([
        appInstanceA.inject({
          method: 'POST',
          url: '/api/v1/reports',
          headers: { authorization: `Bearer ${tokenA}` },
          payload: {
            birthProfileId: testProfileA.id,
            reportType: 'KUNDLI',
            orderId: order.id,
            async: true,
          },
        }),
        appInstanceB.inject({
          method: 'POST',
          url: '/api/v1/reports',
          headers: { authorization: `Bearer ${tokenA}` },
          payload: {
            birthProfileId: testProfileA.id,
            reportType: 'KUNDLI',
            orderId: order.id,
            async: true,
          },
        }),
      ]);

      expect(resA.statusCode).toBe(201);
      expect(resB.statusCode).toBe(201);

      const bodyA = JSON.parse(resA.payload);
      const bodyB = JSON.parse(resB.payload);

      // Both instances must resolve to the identical reportId
      expect(bodyA.reportId).toBe(bodyB.reportId);

      // In database, strictly 1 report record must exist for this order
      const reports = await prisma.report.findMany({ where: { orderId: order.id } });
      expect(reports.length).toBe(1);
    });

    it('1.2 Concurrent requests for DIFFERENT report SKUs proceed independently without blocking', async () => {
      const orderKundli = await createPaidOrder('KUNDLI');
      const orderPlanetary = await createPaidOrder('PLANETARY_SUMMARY');

      const [resKundli, resPlanetary] = await Promise.all([
        appInstanceA.inject({
          method: 'POST',
          url: '/api/v1/reports',
          headers: { authorization: `Bearer ${tokenA}` },
          payload: {
            birthProfileId: testProfileA.id,
            reportType: 'KUNDLI',
            orderId: orderKundli.id,
            async: true,
          },
        }),
        appInstanceB.inject({
          method: 'POST',
          url: '/api/v1/reports',
          headers: { authorization: `Bearer ${tokenA}` },
          payload: {
            birthProfileId: testProfileA.id,
            reportType: 'PLANETARY_SUMMARY',
            orderId: orderPlanetary.id,
            async: true,
          },
        }),
      ]);

      expect(resKundli.statusCode).toBe(201);
      expect(resPlanetary.statusCode).toBe(201);

      const bodyKundli = JSON.parse(resKundli.payload);
      const bodyPlanetary = JSON.parse(resPlanetary.payload);

      expect(bodyKundli.reportId).not.toBe(bodyPlanetary.reportId);
    });

    it('1.3 Distributed lock auto-expires after TTL without leaving deadlock', async () => {
      const testKey = `test:expire:${Date.now()}`;
      const lockRes = await distributedLockService.acquireRedisLock(testKey, 200); // 200ms TTL
      expect(lockRes).not.toBeNull();
      expect(lockRes?.acquired).toBe(true);

      // Immediately trying again should fail
      const lockResImmediate = await distributedLockService.acquireRedisLock(testKey, 200);
      expect(lockResImmediate?.acquired).toBe(false);

      // Wait 300ms for TTL expiration
      await new Promise((r) => setTimeout(r, 300));

      // After expiration, lock should be acquirable again
      const lockResAfter = await distributedLockService.acquireRedisLock(testKey, 1000);
      expect(lockResAfter?.acquired).toBe(true);

      if (lockResAfter) {
        await distributedLockService.releaseRedisLock(lockResAfter.key, lockResAfter.token);
      }
    });

    it('1.4 Distributed lock releases cleanly even if operation throws an error', async () => {
      const testKey = `test:error:${Date.now()}`;

      await expect(
        distributedLockService.withDistributedLock(testKey, async () => {
          throw new Error('Simulated failure during lock');
        })
      ).rejects.toThrow('Simulated failure during lock');

      // The lock must be released immediately in finally block
      const nextAcquire = await distributedLockService.acquireRedisLock(testKey, 2000);
      expect(nextAcquire?.acquired).toBe(true);

      if (nextAcquire) {
        await distributedLockService.releaseRedisLock(nextAcquire.key, nextAcquire.token);
      }
    });

    it('1.5 Explicit fallback to PostgreSQL transaction advisory locks when Redis is unavailable', async () => {
      // Temporarily disable Redis
      nativeRedisClient.setMockDisabled(true);

      const order = await createPaidOrder('CAREER_PROSITY');

      // Send concurrent requests across instances with Redis disabled
      const [resA, resB] = await Promise.all([
        appInstanceA.inject({
          method: 'POST',
          url: '/api/v1/reports',
          headers: { authorization: `Bearer ${tokenA}` },
          payload: {
            birthProfileId: testProfileA.id,
            reportType: 'CAREER_PROSITY',
            orderId: order.id,
            async: true,
          },
        }),
        appInstanceB.inject({
          method: 'POST',
          url: '/api/v1/reports',
          headers: { authorization: `Bearer ${tokenA}` },
          payload: {
            birthProfileId: testProfileA.id,
            reportType: 'CAREER_PROSITY',
            orderId: order.id,
            async: true,
          },
        }),
      ]);

      // Re-enable Redis
      nativeRedisClient.setMockDisabled(false);

      if (resA.statusCode !== 201) {
        console.error('Test 1.5 payload A:', resA.payload);
      }
      if (resB.statusCode !== 201) {
        console.error('Test 1.5 payload B:', resB.payload);
      }

      expect(resA.statusCode).toBe(201);
      expect(resB.statusCode).toBe(201);

      const bodyA = JSON.parse(resA.payload);
      const bodyB = JSON.parse(resB.payload);

      // Cross-instance deduplication must still succeed via Postgres advisory locks!
      expect(bodyA.reportId).toBe(bodyB.reportId);
    });

    it('1.6 Stale orphaned job recovery handles worker crash and resets order to FAILED (recoverable)', async () => {
      const order = await createPaidOrder('KUNDLI');

      // Simulate a crashed worker: report stuck in QUEUED with updatedAt 10 minutes ago
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const crashedReport = await prisma.report.create({
        data: {
          id: crypto.randomUUID(),
          userId: testUserA.id,
          birthProfileId: testProfileA.id,
          orderId: order.id,
          reportType: 'KUNDLI',
          status: 'QUEUED',
          createdAt: tenMinutesAgo,
          updatedAt: tenMinutesAgo,
        },
      });

      // Update order to PROCESSING
      await prisma.order.update({
        where: { id: order.id },
        data: { fulfillmentStatus: FulfillmentStatus.PROCESSING },
      });

      // Run stale job recovery
      await careerReportWorker.recoverStaleJobs();

      // Report should be marked FAILED
      const recoveredReport = await prisma.report.findUnique({ where: { id: crashedReport.id } });
      expect(recoveredReport?.status).toBe('FAILED');
      expect(recoveredReport?.errorCode).toBe('WORKER_TIMEOUT_RECOVERED');

      // Order fulfillmentStatus should be transitioned to FAILED, ready for retry without re-charge!
      const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(updatedOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FAILED);
      expect(updatedOrder?.status).toBe(OrderStatus.PAID);
    });

    it('1.7 Completed report is reused when birth profile is unmodified', async () => {
      const order = await createPaidOrder('PLANETARY_SUMMARY');

      // Create a COMPLETED report for testProfileA
      const completedReport = await prisma.report.create({
        data: {
          id: crypto.randomUUID(),
          userId: testUserA.id,
          birthProfileId: testProfileA.id,
          orderId: order.id,
          reportType: 'PLANETARY_SUMMARY',
          status: 'COMPLETED',
          stage: 'COMPLETED',
          progress: 100,
          reportVersion: '1.0.0',
          calculationVersion: '1.0.0',
          storageKey: `reports/test-${Date.now()}.pdf`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const res = await appInstanceA.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          birthProfileId: testProfileA.id,
          reportType: 'PLANETARY_SUMMARY',
          orderId: order.id,
          async: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.reportId).toBe(completedReport.id);
      expect(body.reused).toBe(true);
    });

    it('1.8 Modified birth profile invalidates completed report reuse and generates fresh report', async () => {
      const order = await createPaidOrder('PLANETARY_SUMMARY');

      // Create old completed report
      const oneHourAgo = new Date(Date.now() - 3600 * 1000);
      await prisma.report.create({
        data: {
          id: crypto.randomUUID(),
          userId: testUserA.id,
          birthProfileId: testProfileA.id,
          reportType: 'PLANETARY_SUMMARY',
          status: 'COMPLETED',
          stage: 'COMPLETED',
          progress: 100,
          reportVersion: '1.0.0',
          calculationVersion: '1.0.0',
          storageKey: `reports/test-old-${Date.now()}.pdf`,
          createdAt: oneHourAgo,
          updatedAt: oneHourAgo,
        },
      });

      // Update birth profile updatedAt to now
      await prisma.birthProfile.update({
        where: { id: testProfileA.id },
        data: { updatedAt: new Date() },
      });

      // Request report with new paid order
      const res = await appInstanceA.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          birthProfileId: testProfileA.id,
          reportType: 'PLANETARY_SUMMARY',
          orderId: order.id,
          async: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.reused).toBe(false);
    });
  });

  // =========================================================================
  // PART 2: PAYMENT ORDER-TO-REPORT FULFILLMENT INTEGRITY
  // =========================================================================

  describe('2. Order Fulfilment Integrity Lifecycle', () => {
    it('2.1 Verified payment followed by report generation transitions order through CREATED -> PAID -> PROCESSING -> FULFILLED', async () => {
      const order = await createPaidOrder('KUNDLI');
      expect(order.fulfillmentStatus).toBe(FulfillmentStatus.UNFULFILLED);

      // Initiate report generation
      const res = await appInstanceA.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          birthProfileId: testProfileA.id,
          reportType: 'KUNDLI',
          orderId: order.id,
          async: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);

      // Order must now be bound and in PROCESSING state
      const processingOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { reports: true },
      });
      expect(processingOrder?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
      expect(processingOrder?.reports.some((r) => r.id === body.reportId)).toBe(true);

      // Simulate worker pipeline completion
      await careerReportWorker.executeReportPipeline(body.reportId);

      // Order must now be marked FULFILLED
      const fulfilledOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(fulfilledOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);
    });

    it('2.2 Failed report generation leaves a recoverable PAID order with FAILED fulfillmentStatus', async () => {
      const order = await createPaidOrder('CAREER_PROSITY');

      const res = await appInstanceA.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          birthProfileId: testProfileA.id,
          reportType: 'CAREER_PROSITY',
          orderId: order.id,
          async: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);

      // Simulate pipeline failure
      await (careerReportWorker as any).failJob(body.reportId, 'SIMULATED_TEST_FAILURE', 'Simulated failure for Task 1B audit');

      // Order must have status PAID and fulfillmentStatus FAILED
      const failedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(failedOrder?.status).toBe(OrderStatus.PAID);
      expect(failedOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FAILED);
    });

    it('2.3 Retry after failed generation succeeds using the same orderId without an additional charge', async () => {
      const order = await createPaidOrder('KUNDLI');

      // First attempt: fail it
      const res1 = await appInstanceA.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          birthProfileId: testProfileA.id,
          reportType: 'KUNDLI',
          orderId: order.id,
          async: true,
        },
      });
      const body1 = JSON.parse(res1.payload);
      await (careerReportWorker as any).failJob(body1.reportId, 'TEST_FAIL', 'Failure 1');

      // Verify order is FAILED (recoverable)
      const intermediateOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(intermediateOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FAILED);

      // Retry generation using the EXACT SAME orderId
      const res2 = await appInstanceA.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          birthProfileId: testProfileA.id,
          reportType: 'KUNDLI',
          orderId: order.id,
          forceRegenerate: true,
          async: true,
        },
      });

      expect(res2.statusCode).toBe(201);
      const body2 = JSON.parse(res2.payload);

      // Order should transition to PROCESSING
      const retryingOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(retryingOrder?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);

      // Complete second attempt
      await careerReportWorker.executeReportPipeline(body2.reportId);

      // Final order must be FULFILLED
      const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(finalOrder?.fulfillmentStatus).toBe(FulfillmentStatus.FULFILLED);
    });

    it('2.4 Submitting an already FULFILLED order for the same profile idempotently returns existing report', async () => {
      const order = await createPaidOrder('KUNDLI');

      // Create completed report and mark order FULFILLED
      const report = await prisma.report.create({
        data: {
          id: crypto.randomUUID(),
          userId: testUserA.id,
          birthProfileId: testProfileA.id,
          orderId: order.id,
          reportType: 'KUNDLI',
          status: 'COMPLETED',
          stage: 'COMPLETED',
          progress: 100,
          reportVersion: '1.0.0',
          calculationVersion: '1.0.0',
          storageKey: `reports/fulfilled-${Date.now()}.pdf`,
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
      });

      // Submit again with the fulfilled order
      const res = await appInstanceA.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          birthProfileId: testProfileA.id,
          reportType: 'KUNDLI',
          orderId: order.id,
          async: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.reportId).toBe(report.id);
      expect(body.reused).toBe(true);
    });

    it('2.5 Submitting the same paid order for a DIFFERENT birth profile is strictly rejected with 403 Forbidden', async () => {
      const order = await createPaidOrder('KUNDLI');

      // Fulfill order for Profile A
      await appInstanceA.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          birthProfileId: testProfileA.id,
          reportType: 'KUNDLI',
          orderId: order.id,
          async: true,
        },
      });

      // Attempt to reuse the SAME order for Profile B (multi-fulfillment attempt)
      const res = await appInstanceA.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          birthProfileId: testProfileB.id,
          reportType: 'KUNDLI',
          orderId: order.id,
          async: true,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error?.message).toMatch(/bound to a different birth profile|Payment or entitlement required/);
    });

    it('2.6 Submitting an order with a MISMATCHED report SKU is strictly rejected with 403 Forbidden', async () => {
      // Order bought for CAREER
      const careerOrder = await createPaidOrder('CAREER');

      // Attempt to fulfill KUNDLI report with Career order
      const res = await appInstanceA.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          birthProfileId: testProfileA.id,
          reportType: 'KUNDLI',
          orderId: careerOrder.id,
          async: true,
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('2.7 Submitting another user\'s paid order is strictly rejected with 403 Forbidden', async () => {
      // Order owned by User A
      const orderA = await createPaidOrder('KUNDLI', testUserA);

      // User B attempts to use User A's orderId
      const res = await appInstanceA.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          birthProfileId: testProfileA.id,
          reportType: 'KUNDLI',
          orderId: orderA.id,
          async: true,
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('2.8 Two simultaneous fulfillment requests on the same order cannot fulfill the order twice', async () => {
      const order = await createPaidOrder('KUNDLI');

      const [res1, res2] = await Promise.all([
        appInstanceA.inject({
          method: 'POST',
          url: '/api/v1/reports',
          headers: { authorization: `Bearer ${tokenA}` },
          payload: {
            birthProfileId: testProfileA.id,
            reportType: 'KUNDLI',
            orderId: order.id,
            async: true,
          },
        }),
        appInstanceB.inject({
          method: 'POST',
          url: '/api/v1/reports',
          headers: { authorization: `Bearer ${tokenA}` },
          payload: {
            birthProfileId: testProfileA.id,
            reportType: 'KUNDLI',
            orderId: order.id,
            async: true,
          },
        }),
      ]);

      expect(res1.statusCode).toBe(201);
      expect(res2.statusCode).toBe(201);

      const body1 = JSON.parse(res1.payload);
      const body2 = JSON.parse(res2.payload);

      // Must share identical report
      expect(body1.reportId).toBe(body2.reportId);

      // Exactly 1 report in DB for this order
      const boundReports = await prisma.report.findMany({ where: { orderId: order.id } });
      expect(boundReports.length).toBe(1);
    });

    it('2.9 Webhook vs client verification race resolves cleanly and idempotently', async () => {
      const orderId = crypto.randomUUID();
      const rzpOrderId = `order_race_${crypto.randomBytes(6).toString('hex')}`;
      const rzpPayId = `pay_race_${crypto.randomBytes(6).toString('hex')}`;
      const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret_for_vitest_mocking_only';
      const validSig = crypto
        .createHmac('sha256', secret)
        .update(`${rzpOrderId}|${rzpPayId}`)
        .digest('hex');

      // Create pending order
      await prisma.order.create({
        data: {
          id: orderId,
          userId: testUserA.id,
          razorpayOrderId: rzpOrderId,
          amount: 29900,
          currency: 'INR',
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          reportType: 'KUNDLI',
          items: {
            create: [
              {
                catalogId: 'report-kundli',
                itemType: 'REPORT',
                title: 'Kundli Report',
                unitPrice: 29900,
                totalAmount: 29900,
              },
            ],
          },
        },
      });

      // Simulate simultaneous verification requests (e.g. webhook and client verify)
      const [resVerify1, resVerify2] = await Promise.all([
        appInstanceA.inject({
          method: 'POST',
          url: '/api/v1/payments/verify',
          headers: { authorization: `Bearer ${tokenA}` },
          payload: {
            razorpayOrderId: rzpOrderId,
            razorpayPaymentId: rzpPayId,
            razorpaySignature: validSig,
          },
        }),
        appInstanceB.inject({
          method: 'POST',
          url: '/api/v1/payments/verify',
          headers: { authorization: `Bearer ${tokenA}` },
          payload: {
            razorpayOrderId: rzpOrderId,
            razorpayPaymentId: rzpPayId,
            razorpaySignature: validSig,
          },
        }),
      ]);

      expect(resVerify1.statusCode).toBe(200);
      expect(resVerify2.statusCode).toBe(200);

      // Order must be PAID and UNFULFILLED
      const verifiedOrder = await prisma.order.findUnique({ where: { id: orderId } });
      expect(verifiedOrder?.status).toBe(OrderStatus.PAID);
      expect(verifiedOrder?.paymentStatus).toBe(PaymentStatus.CAPTURED);
      expect(verifiedOrder?.fulfillmentStatus).toBe(FulfillmentStatus.UNFULFILLED);
    });

    it('2.10 Final order-to-report relationship is strictly bound and verifiable in database', async () => {
      const order = await createPaidOrder('CAREER');

      const res = await appInstanceA.inject({
        method: 'POST',
        url: '/api/v1/reports/career',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          birthProfileId: testProfileA.id,
          orderId: order.id,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);

      // Verify DB relationship
      const dbReport = await prisma.report.findUnique({
        where: { id: body.reportId },
        include: { order: true },
      });

      expect(dbReport?.orderId).toBe(order.id);
      expect(dbReport?.order?.id).toBe(order.id);
      expect(dbReport?.order?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
    });
  });
});
