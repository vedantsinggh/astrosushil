import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../src/services/prisma.service';
import { buildApp } from '../../src/app';
import { commerceService } from '../../src/modules/commerce/commerce.service';
import { reportsService } from '../../src/modules/reports/reports.service';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { notificationService } from '../../src/modules/notifications/notification.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { paymentService } from '../../src/services/payment.service';
import { OrderStatus, PaymentStatus, FulfillmentStatus, FulfillmentUnitStatus, RefundStatus, OrderItemType, ObligationType } from '@prisma/client';
import crypto from 'crypto';

describe('Phase 4 Delivery SLA, Notifications and Customer Experience Tests', () => {
  let app: FastifyInstance;

  const testUserId = crypto.randomUUID();
  const foreignUserId = crypto.randomUUID();
  let testBirthProfileId: string;
  let foreignBirthProfileId: string;
  const userContext = { id: testUserId, role: 'USER' };
  const foreignUserContext = { id: foreignUserId, role: 'USER' };

  const testKeySecret = 'test_razorpay_secret_key_phase4_sla';

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_SECRET = testKeySecret;
    app = buildApp();
    await app.ready();

    // Create primary test user
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: `phase4-sla-${Date.now()}@example.com`,
        fullName: 'Phase 4 SLA User',
        role: 'USER',
        emailVerifiedAt: new Date(),
      },
    });

    // Create foreign test user for IDOR testing
    await prisma.user.upsert({
      where: { id: foreignUserId },
      update: {},
      create: {
        id: foreignUserId,
        email: `phase4-foreign-${Date.now()}@example.com`,
        fullName: 'Phase 4 Foreign User',
        role: 'USER',
        emailVerifiedAt: new Date(),
      },
    });

    // Create birth profiles
    const profile = await prisma.birthProfile.create({
      data: {
        userId: testUserId,
        name: 'SLA Test Profile',
        dateOfBirth: '1992-05-15',
        timeOfBirth: '08:30:00',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
        placeName: 'New Delhi',
      },
    });
    testBirthProfileId = profile.id;

    const foreignProfile = await prisma.birthProfile.create({
      data: {
        userId: foreignUserId,
        name: 'Foreign SLA Profile',
        dateOfBirth: '1995-10-20',
        timeOfBirth: '14:15:00',
        latitude: 19.0760,
        longitude: 72.8777,
        timezone: 'Asia/Kolkata',
        placeName: 'Mumbai',
      },
    });
    foreignBirthProfileId = foreignProfile.id;
  });

  afterAll(async () => {
    const userIds = [testUserId, foreignUserId];
    await prisma.refundItemAllocation.deleteMany({
      where: { orderItem: { order: { userId: { in: userIds } } } },
    });
    await prisma.notification.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.report.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.fulfillmentUnit.deleteMany({
      where: { order: { userId: { in: userIds } } },
    });
    await prisma.refund.deleteMany({
      where: { order: { userId: { in: userIds } } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { userId: { in: userIds } } },
    });
    await prisma.order.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.birthProfile.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    await app.close();
  });

  function generateSignature(orderId: string, paymentId: string): string {
    return crypto.createHmac('sha256', testKeySecret).update(`${orderId}|${paymentId}`).digest('hex');
  }

  async function createTestPaidOrder(items: Array<{ catalogId: string; quantity: number; unitPrice: number; itemType: OrderItemType }>, userId = testUserId) {
    const totalAmount = items.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0);
    const rzOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    const order = await prisma.order.create({
      data: {
        userId,
        razorpayOrderId: rzOrderId,
        amount: totalAmount,
        currency: 'INR',
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        items: {
          create: items.map((it) => ({
            catalogId: it.catalogId,
            itemType: it.itemType,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalAmount: it.quantity * it.unitPrice,
            title: it.catalogId,
          })),
        },
      },
      include: { items: true },
    });

    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const signature = generateSignature(order.razorpayOrderId!, paymentId);

    const verified = await commerceService.verifyPayment(
      {
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId!,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      },
      { id: userId, role: 'USER' }
    );

    return verified.order;
  }

  // 1. Deadline equals paidAt plus exactly 24 hours
  it('1. Deadline equals paidAt plus exactly 24 hours', async () => {
    const order = await createTestPaidOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ]);

    expect(order.paidAt).toBeDefined();
    expect(order.paidAt).not.toBeNull();

    const job = await reportsService.createCareerReportJob(
      { birthProfileId: testBirthProfileId, orderId: order.id },
      userContext
    );

    const report = await prisma.report.findUnique({ where: { id: job.reportId } });
    expect(report?.expectedDeliveryAt).toBeDefined();

    const expectedDeadline = new Date(order.paidAt!.getTime() + 24 * 60 * 60 * 1000);
    expect(report!.expectedDeliveryAt!.getTime()).toBe(expectedDeadline.getTime());
  });

  // 2. Repeated payment verification does not change paidAt
  it('2. Repeated payment verification does not change paidAt', async () => {
    const order = await createTestPaidOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ]);
    const originalPaidAt = order.paidAt!.getTime();

    // Call verifyPayment again (idempotent replay)
    const reVerify = await commerceService.verifyPayment(
      {
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId!,
        razorpayPaymentId: order.razorpayPaymentId!,
        razorpaySignature: generateSignature(order.razorpayOrderId!, order.razorpayPaymentId!),
      },
      userContext
    );

    const refreshedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(refreshedOrder!.paidAt!.getTime()).toBe(originalPaidAt);
    expect(reVerify.order.paidAt!.getTime()).toBe(originalPaidAt);
  });

  // 3. Late report initialization retains the original deadline
  it('3. Late report initialization retains the original deadline', async () => {
    // Simulate an order paid 6 hours ago
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const rzOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    const order = await prisma.order.create({
      data: {
        userId: testUserId,
        razorpayOrderId: rzOrderId,
        amount: 99900,
        currency: 'INR',
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.CAPTURED,
        paidAt: sixHoursAgo,
        items: {
          create: [{
            catalogId: 'report-career',
            itemType: OrderItemType.REPORT,
            quantity: 1,
            unitPrice: 99900,
            totalAmount: 99900,
            title: 'Career Report',
          }],
        },
      },
      include: { items: true },
    });

    // Create a distinct birth profile for this test
    const profile = await prisma.birthProfile.create({
      data: {
        userId: testUserId,
        name: 'Late Init Profile',
        dateOfBirth: '1991-03-20',
        timeOfBirth: '09:00:00',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
        placeName: 'Delhi',
      },
    });

    const job = await reportsService.createCareerReportJob(
      { birthProfileId: profile.id, orderId: order.id },
      userContext
    );

    const report = await prisma.report.findUnique({ where: { id: job.reportId } });
    const expectedDeadline = new Date(sixHoursAgo.getTime() + 24 * 60 * 60 * 1000);

    // The deadline must be 24h from paidAt (only 18 hours remaining from now), NOT 24h from now!
    expect(report!.expectedDeliveryAt!.getTime()).toBe(expectedDeadline.getTime());
    expect(report!.expectedDeliveryAt!.getTime()).toBeLessThan(Date.now() + 20 * 60 * 60 * 1000);
  });

  // 4. Multiple reports in one order share the same SLA anchor
  it('4. Multiple reports in one order share the same SLA anchor', async () => {
    const order = await createTestPaidOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 2, unitPrice: 99900 },
    ]);

    const profile2 = await prisma.birthProfile.create({
      data: {
        userId: testUserId,
        name: 'Sibling Profile',
        dateOfBirth: '1994-07-11',
        timeOfBirth: '16:45:00',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
        placeName: 'Delhi',
      },
    });

    const job1 = await reportsService.createCareerReportJob(
      { birthProfileId: testBirthProfileId, orderId: order.id },
      userContext
    );
    const job2 = await reportsService.createCareerReportJob(
      { birthProfileId: profile2.id, orderId: order.id },
      userContext
    );

    const rep1 = await prisma.report.findUnique({ where: { id: job1.reportId } });
    const rep2 = await prisma.report.findUnique({ where: { id: job2.reportId } });

    expect(rep1!.expectedDeliveryAt).toBeDefined();
    expect(rep2!.expectedDeliveryAt).toBeDefined();

    // Both reports share the exact same delivery deadline
    expect(rep1!.expectedDeliveryAt!.getTime()).toBe(rep2!.expectedDeliveryAt!.getTime());
    expect(rep1!.expectedDeliveryAt!.getTime()).toBe(order.paidAt!.getTime() + 24 * 60 * 60 * 1000);
  });

  // 5. Regeneration does not silently reset the SLA
  it('5. Regeneration does not silently reset the SLA', async () => {
    const order = await createTestPaidOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ]);

    const job1 = await reportsService.createCareerReportJob(
      { birthProfileId: testBirthProfileId, orderId: order.id },
      userContext
    );
    const initialReport = await prisma.report.findUnique({ where: { id: job1.reportId } });
    const originalDeadline = initialReport!.expectedDeliveryAt!.getTime();

    // Regenerate report
    const regenJob = await reportsService.regenerateCareerReport(initialReport!.id, userContext);
    const regeneratedReport = await prisma.report.findUnique({ where: { id: regenJob.reportId } });

    // The regenerated report must preserve the original deadline
    expect(regeneratedReport!.expectedDeliveryAt!.getTime()).toBe(originalDeadline);
  });

  // 6. Customer can retrieve expectedDeliveryAt
  it('6. Customer can retrieve expectedDeliveryAt', async () => {
    const order = await createTestPaidOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ]);

    const job = await reportsService.createCareerReportJob(
      { birthProfileId: testBirthProfileId, orderId: order.id },
      userContext
    );

    const statusDetails = await reportsService.getReportStatus(job.reportId, userContext);
    expect(statusDetails.expectedDeliveryAt).toBeDefined();
    expect(statusDetails.paymentStatus).toBe(PaymentStatus.CAPTURED);
    expect(statusDetails.isOnSchedule).toBe(true);
    expect(statusDetails.isOverdue).toBe(false);
    expect(statusDetails.isReady).toBe(false);
    expect(statusDetails.isFailed).toBe(false);

    const statusOnly = await reportsService.getReportStatusOnly(job.reportId, userContext);
    expect(statusOnly.expectedDeliveryAt).toBeDefined();
    expect(statusOnly.isOnSchedule).toBe(true);
    expect(statusOnly.isOverdue).toBe(false);
  });

  // 7. Customer cannot access another user's report delivery information
  it('7. Customer cannot access another user\'s report delivery information', async () => {
    const foreignOrder = await createTestPaidOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ], foreignUserId);

    const foreignJob = await reportsService.createCareerReportJob(
      { birthProfileId: foreignBirthProfileId, orderId: foreignOrder.id },
      foreignUserContext
    );

    // Primary user attempts to access foreign report
    await expect(
      reportsService.getReportStatus(foreignJob.reportId, userContext)
    ).rejects.toThrow('Report not found');

    await expect(
      reportsService.getReportStatusOnly(foreignJob.reportId, userContext)
    ).rejects.toThrow('Report not found');
  });

  // 8. Approaching-deadline monitoring works
  it('8. Approaching-deadline monitoring works', async () => {
    const order = await createTestPaidOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ]);

    // Create a report with expectedDeliveryAt 1 hour from now (within 2h approaching window)
    const approachingDeadline = new Date(Date.now() + 60 * 60 * 1000);
    const report = await prisma.report.create({
      data: {
        userId: testUserId,
        birthProfileId: testBirthProfileId,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'QUEUED',
        stage: 'QUEUED',
        expectedDeliveryAt: approachingDeadline,
      },
    });

    const result = await careerReportWorker.monitorReportDeadlines();
    expect(result.approachingCount).toBeGreaterThanOrEqual(1);

    const updated = await prisma.report.findUnique({ where: { id: report.id } });
    const metadata = (updated?.metadata || {}) as Record<string, any>;
    expect(metadata.slaApproachingNotifiedAt).toBeDefined();
    expect(metadata.escalationStage).toBe('APPROACHING');
  });

  // 9. Overdue reports are detected
  it('9. Overdue reports are detected', async () => {
    const order = await createTestPaidOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ]);

    // Create a report with expectedDeliveryAt in the past
    const overdueDeadline = new Date(Date.now() - 30 * 60 * 1000);
    const report = await prisma.report.create({
      data: {
        userId: testUserId,
        birthProfileId: testBirthProfileId,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'QUEUED',
        stage: 'QUEUED',
        expectedDeliveryAt: overdueDeadline,
      },
    });

    const result = await careerReportWorker.monitorReportDeadlines();
    expect(result.overdueCount).toBeGreaterThanOrEqual(1);

    const updated = await prisma.report.findUnique({ where: { id: report.id } });
    const metadata = (updated?.metadata || {}) as Record<string, any>;
    expect(metadata.slaOverdueNotifiedAt).toBeDefined();
    expect(metadata.escalationStage).toBe('OVERDUE');
  });

  // 10. Active leases prevent incorrect stuck-job escalation
  it('10. Active leases prevent incorrect stuck-job escalation', async () => {
    const order = await createTestPaidOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ]);

    // Report is overdue, but has an active worker lease (claimExpiresAt in the future)
    const overdueDeadline = new Date(Date.now() - 10 * 60 * 1000);
    const activeLease = new Date(Date.now() + 60 * 1000);
    const claimToken = `active_worker_${crypto.randomBytes(4).toString('hex')}`;

    const report = await prisma.report.create({
      data: {
        userId: testUserId,
        birthProfileId: testBirthProfileId,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'CALCULATING',
        stage: 'CALCULATING',
        claimToken,
        claimExpiresAt: activeLease,
        expectedDeliveryAt: overdueDeadline,
      },
    });

    const result = await careerReportWorker.monitorReportDeadlines();
    expect(result.overdueCount).toBeGreaterThanOrEqual(1);

    // Active lease must NOT be cleared or stripped
    const refreshed = await prisma.report.findUnique({ where: { id: report.id } });
    expect(refreshed?.claimToken).toBe(claimToken);
    expect(refreshed?.status).toBe('CALCULATING');
  });

  // 11. Duplicate SLA notifications are prevented
  it('11. Duplicate SLA notifications are prevented', async () => {
    const order = await createTestPaidOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ]);

    const overdueDeadline = new Date(Date.now() - 45 * 60 * 1000);
    const report = await prisma.report.create({
      data: {
        userId: testUserId,
        birthProfileId: testBirthProfileId,
        orderId: order.id,
        reportType: 'CAREER',
        status: 'QUEUED',
        stage: 'QUEUED',
        expectedDeliveryAt: overdueDeadline,
      },
    });

    // First monitor pass: triggers alert and sets metadata
    const pass1 = await careerReportWorker.monitorReportDeadlines();
    expect(pass1.alertsTriggered).toBeGreaterThanOrEqual(1);

    // Second monitor pass: report is still overdue, but already notified
    const pass2 = await careerReportWorker.monitorReportDeadlines();
    // No new alert should be triggered for this report
    const refreshed = await prisma.report.findUnique({ where: { id: report.id } });
    const metadata = (refreshed?.metadata || {}) as Record<string, any>;
    expect(metadata.slaOverdueNotifiedAt).toBeDefined();
  });

  // 12. Completed reports generate ready notifications once
  it('12. Completed reports generate ready notifications once', async () => {
    const reportId = crypto.randomUUID();

    const notif1 = await notificationService.sendNotification({
      userId: testUserId,
      type: 'REPORT_READY',
      entityId: reportId,
      idempotencyKey: `report_ready:${reportId}`,
      templateData: { reportName: 'Career Intelligence Report', reportId },
    });

    expect(notif1.channels.inApp?.status).toBe('SENT');

    // Duplicate notification call with same idempotencyKey
    const notif2 = await notificationService.sendNotification({
      userId: testUserId,
      type: 'REPORT_READY',
      entityId: reportId,
      idempotencyKey: `report_ready:${reportId}`,
      templateData: { reportName: 'Career Intelligence Report', reportId },
    });

    expect(notif2.channels.inApp?.status).toBe('SKIPPED');
  });

  // 13. Permanent failures generate appropriate notifications
  it('13. Permanent failures generate appropriate notifications', async () => {
    const report = await prisma.report.create({
      data: {
        userId: testUserId,
        birthProfileId: testBirthProfileId,
        reportType: 'CAREER',
        status: 'CALCULATING',
        stage: 'CALCULATING',
      },
    });

    await careerReportWorker.failJob(
      report.id,
      'PERMANENT_ENGINE_ERROR',
      'Astronomical calculation failed permanently'
    );

    const refreshed = await prisma.report.findUnique({ where: { id: report.id } });
    expect(refreshed?.status).toBe('FAILED');
    expect(refreshed?.errorCode).toBe('PERMANENT_ENGINE_ERROR');

    // Check that a REPORT_FAILED notification was created
    const notif = await prisma.notification.findFirst({
      where: {
        userId: testUserId,
        type: 'REPORT_FAILED',
        metadata: { contains: report.id },
      },
    });
    expect(notif).toBeDefined();
  });

  // 14. Refund allocation does not imply provider-confirmed refund
  it('14. Refund allocation does not imply provider-confirmed refund', async () => {
    const order = await createTestPaidOrder([
      { catalogId: 'prod-item', itemType: OrderItemType.PRODUCT, quantity: 1, unitPrice: 10000 },
    ]);

    // Create a PENDING refund without provider confirmation
    const pendingRefund = await prisma.refund.create({
      data: {
        orderId: order.id,
        amount: 5000,
        currency: 'INR',
        status: RefundStatus.PENDING,
        reason: 'Customer inquiry',
      },
    });

    // Allocate refund to order item
    const allocation = await commerceService.allocateRefundToItem({
      orderId: order.id,
      refundId: pendingRefund.id,
      orderItemId: order.items[0].id,
      amountPaise: 5000,
    });
    expect(allocation.amount).toBe(5000);

    // Order status must remain PAID and CAPTURED; allocation does NOT confirm provider refund!
    const refreshedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(refreshedOrder?.status).toBe(OrderStatus.PAID);
    expect(refreshedOrder?.paymentStatus).toBe(PaymentStatus.CAPTURED);
  });

  // 15. Failed provider refunds do not incorrectly change payment status
  it('15. Failed provider refunds do not incorrectly change payment status', async () => {
    const order = await createTestPaidOrder([
      { catalogId: 'prod-item-failed-ref', itemType: OrderItemType.PRODUCT, quantity: 1, unitPrice: 15000 },
    ]);

    // Simulate provider rejecting refund by mocking createRazorpayRefund failure
    const originalCreateRefund = paymentService.createRazorpayRefund;
    paymentService.createRazorpayRefund = async () => {
      return {
        id: `rfnd_${crypto.randomBytes(6).toString('hex')}`,
        paymentId: order.razorpayPaymentId!,
        amount: 5000,
        currency: 'INR',
        status: 'failed' as any,
        isTestMode: true,
      };
    };

    try {
      const res = await commerceService.requestRefund(
        {
          orderId: order.id,
          amountPaise: 5000,
          reason: 'Defective item',
        },
        { id: testUserId, role: 'ADMIN' }
      );

      // Refund must be marked FAILED
      expect(res.refund.status).toBe(RefundStatus.FAILED);

      // Order must remain PAID / CAPTURED
      const refreshedOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(refreshedOrder?.status).toBe(OrderStatus.PAID);
      expect(refreshedOrder?.paymentStatus).toBe(PaymentStatus.CAPTURED);
    } finally {
      paymentService.createRazorpayRefund = originalCreateRefund;
    }
  });
});
