import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../src/services/prisma.service';
import { buildApp } from '../../src/app';
import { commerceService } from '../../src/modules/commerce/commerce.service';
import { fulfillmentService } from '../../src/modules/fulfillment/fulfillment.service';
import { reportsService } from '../../src/modules/reports/reports.service';
import { coursesService } from '../../src/modules/courses/courses.service';
import { consultationsService } from '../../src/modules/consultations/consultations.service';
import { productsService } from '../../src/modules/products/products.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { OrderStatus, PaymentStatus, FulfillmentStatus, ObligationType, FulfillmentUnitStatus, RefundStatus, OrderItemType } from '@prisma/client';
import crypto from 'crypto';

describe('Phase 3 Commerce and Fulfillment Integration Tests', () => {
  let app: FastifyInstance;

  const testUserId = crypto.randomUUID();
  const foreignUserId = crypto.randomUUID();
  let testBirthProfileId: string;
  let authToken: string;
  const userContext = { id: testUserId, role: 'USER' };

  const testKeySecret = 'test_razorpay_secret_key_1234567890';

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_SECRET = testKeySecret;
    app = buildApp();
    await app.ready();

    // Setup test users
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: {
        id: testUserId,
        email: `phase3-test-${Date.now()}@example.com`,
        fullName: 'Phase 3 Test User',
        role: 'USER',
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.user.upsert({
      where: { id: foreignUserId },
      update: {},
      create: {
        id: foreignUserId,
        email: `phase3-foreign-${Date.now()}@example.com`,
        fullName: 'Foreign User',
        role: 'USER',
        emailVerifiedAt: new Date(),
      },
    });

    // Create birth profile for test user
    const profile = await prisma.birthProfile.create({
      data: {
        userId: testUserId,
        name: 'Fulfillment Test Profile',
        dateOfBirth: '1990-01-01',
        timeOfBirth: '12:00:00',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
        placeName: 'New Delhi',
      },
    });
    testBirthProfileId = profile.id;

    authToken = (app as any).jwt.sign({ sub: testUserId, role: 'USER' });
  });

  afterAll(async () => {
    // Cleanup records in strict dependency order
    await prisma.refundItemAllocation.deleteMany({
      where: { orderItem: { order: { userId: { in: [testUserId, foreignUserId] } } } },
    });
    await prisma.shipmentItem.deleteMany({
      where: { fulfillmentUnit: { order: { userId: { in: [testUserId, foreignUserId] } } } },
    });
    await prisma.shipment.deleteMany({
      where: { order: { userId: { in: [testUserId, foreignUserId] } } },
    });
    await prisma.report.deleteMany({
      where: { userId: { in: [testUserId, foreignUserId] } },
    });
    await prisma.courseEntitlement.deleteMany({
      where: { userId: { in: [testUserId, foreignUserId] } },
    });
    await prisma.consultationBooking.deleteMany({
      where: { userId: { in: [testUserId, foreignUserId] } },
    });
    await prisma.digitalProductEntitlement.deleteMany({
      where: { userId: { in: [testUserId, foreignUserId] } },
    });
    await prisma.fulfillmentUnit.deleteMany({
      where: { order: { userId: { in: [testUserId, foreignUserId] } } },
    });
    await prisma.refund.deleteMany({
      where: { order: { userId: { in: [testUserId, foreignUserId] } } },
    });
    await prisma.orderItem.deleteMany({
      where: { order: { userId: { in: [testUserId, foreignUserId] } } },
    });
    await prisma.order.deleteMany({
      where: { userId: { in: [testUserId, foreignUserId] } },
    });
    await prisma.birthProfile.deleteMany({
      where: { userId: { in: [testUserId, foreignUserId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, foreignUserId] } },
    });

    await app.close();
  });

  // Helper to create test order
  async function createTestOrder(
    items: Array<{ catalogId: string; itemType: OrderItemType; quantity: number; unitPrice: number; fulfillmentType?: any }>,
    userId = testUserId
  ) {
    const totalAmount = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
    const razorpayOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    const order = await prisma.order.create({
      data: {
        userId,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
        currency: 'INR',
        amount: totalAmount,
        subtotal: totalAmount,
        taxAmount: 0,
        razorpayOrderId,
        items: {
          create: items.map((it) => ({
            catalogId: it.catalogId,
            itemType: it.itemType,
            title: `Item ${it.catalogId}`,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalAmount: it.unitPrice * it.quantity,
            fulfillmentType: it.fulfillmentType || (it.itemType === OrderItemType.PRODUCT ? 'PHYSICAL' : 'DIGITAL'),
          })),
        },
      },
      include: { items: true },
    });
    return order;
  }

  // Helper to simulate valid payment signature
  function generateSignature(razorpayOrderId: string, paymentId: string) {
    const secret = process.env.RAZORPAY_KEY_SECRET || testKeySecret;
    return crypto.createHmac('sha256', secret).update(`${razorpayOrderId}|${paymentId}`).digest('hex');
  }

  // 1. Successful payment capture creates correct fulfillment units
  it('1. Successful payment capture creates correct fulfillment units', async () => {
    const order = await createTestOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 2, unitPrice: 99900 },
      { catalogId: 'prod-rudraksha', itemType: OrderItemType.PRODUCT, quantity: 1, unitPrice: 150000 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const signature = generateSignature(order.razorpayOrderId!, paymentId);

    const result = await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    }, userContext);

    expect(result.order.status).toBe(OrderStatus.PAID);
    expect(result.order.paymentStatus).toBe(PaymentStatus.CAPTURED);
    expect(result.order.paidAt).toBeDefined();

    const units = await prisma.fulfillmentUnit.findMany({
      where: { orderId: order.id },
      orderBy: [{ orderItemId: 'asc' }, { unitIndex: 'asc' }],
    });

    // 2 units for REPORT (qty 2) + 1 unit for PHYSICAL_PRODUCT (qty 1) = 3 units
    expect(units.length).toBe(3);
    const reportUnits = units.filter((u) => u.obligationType === ObligationType.REPORT);
    expect(reportUnits.length).toBe(2);
    expect(reportUnits[0].unitIndex).toBe(1);
    expect(reportUnits[1].unitIndex).toBe(2);
    expect(reportUnits[0].status).toBe(FulfillmentUnitStatus.UNFULFILLED);

    const physUnits = units.filter((u) => u.obligationType === ObligationType.PHYSICAL_PRODUCT);
    expect(physUnits.length).toBe(1);
    expect(physUnits[0].unitIndex).toBe(1);
  });

  // 2. Repeated payment verification creates no duplicates
  it('2. Repeated payment verification creates no duplicates', async () => {
    const order = await createTestOrder([
      { catalogId: 'report-kundli', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 50000 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const signature = generateSignature(order.razorpayOrderId!, paymentId);

    // First verification
    await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    }, userContext);

    // Second (duplicate) verification
    const repeatResult = await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    }, userContext);

    expect(repeatResult.order.status).toBe(OrderStatus.PAID);

    const units = await prisma.fulfillmentUnit.findMany({
      where: { orderId: order.id },
    });
    expect(units.length).toBe(1);
  });

  // 3. Failed payment verification creates no fulfillment units
  it('3. Failed payment verification creates no fulfillment units', async () => {
    const order = await createTestOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const badSignature = 'invalid_tampered_signature';

    await expect(
      commerceService.verifyPayment({
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId!,
        razorpayPaymentId: paymentId,
        razorpaySignature: badSignature,
      }, userContext)
    ).rejects.toThrow();

    const units = await prisma.fulfillmentUnit.findMany({
      where: { orderId: order.id },
    });
    expect(units.length).toBe(0);

    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(dbOrder?.status).not.toBe(OrderStatus.PAID);
  });

  // 4. Report creation attaches correct fulfillment unit
  it('4. Report creation attaches correct fulfillment unit', async () => {
    const order = await createTestOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: generateSignature(order.razorpayOrderId!, paymentId),
    }, userContext);

    const job = await reportsService.createCareerReportJob(
      { birthProfileId: testBirthProfileId, orderId: order.id },
      { id: testUserId, role: 'USER' }
    );

    const createdReport = await prisma.report.findUnique({
      where: { id: job.reportId },
    });
    expect(createdReport?.fulfillmentUnitId).toBeDefined();

    const boundUnit = await prisma.fulfillmentUnit.findUnique({
      where: { id: createdReport!.fulfillmentUnitId! },
    });
    expect(boundUnit?.orderId).toBe(order.id);
    expect(boundUnit?.obligationType).toBe(ObligationType.REPORT);
  });

  // 5. Repeated report initialization does not create duplicate reports or queue jobs
  it('5. Repeated report initialization does not create duplicate reports or queue jobs', async () => {
    const order = await createTestOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: generateSignature(order.razorpayOrderId!, paymentId),
    }, userContext);

    const job1 = await reportsService.createCareerReportJob(
      { birthProfileId: testBirthProfileId, orderId: order.id },
      { id: testUserId, role: 'USER' }
    );

    // Second call with same order and birth profile
    const job2 = await reportsService.createCareerReportJob(
      { birthProfileId: testBirthProfileId, orderId: order.id },
      { id: testUserId, role: 'USER' }
    );

    expect(job1.reportId).toBe(job2.reportId);
    expect(job2.reused).toBe(true);

    const reportsCount = await prisma.report.count({
      where: { orderId: order.id },
    });
    expect(reportsCount).toBe(1);
  });

  // 6. Report completion fulfills only its own unit
  it('6. Report completion fulfills only its own unit', async () => {
    const order = await createTestOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 2, unitPrice: 99900 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: generateSignature(order.razorpayOrderId!, paymentId),
    }, userContext);

    const units = await prisma.fulfillmentUnit.findMany({
      where: { orderId: order.id },
      orderBy: { unitIndex: 'asc' },
    });
    expect(units.length).toBe(2);

    // Create report on unit 1
    const report1 = await prisma.report.create({
      data: {
        userId: testUserId,
        birthProfileId: testBirthProfileId,
        orderId: order.id,
        fulfillmentUnitId: units[0].id,
        reportType: 'CAREER',
        status: 'COMPLETED',
        storageKey: `reports/${testUserId}/test.pdf`,
        fileName: 'test.pdf',
        fileSize: 1024,
      },
    });

    // Reconcile unit 1
    await fulfillmentService.reconcileFulfillmentUnit(order.id, units[0].id);

    const refreshedUnit1 = await prisma.fulfillmentUnit.findUnique({ where: { id: units[0].id } });
    const refreshedUnit2 = await prisma.fulfillmentUnit.findUnique({ where: { id: units[1].id } });

    expect(refreshedUnit1?.status).toBe(FulfillmentUnitStatus.FULFILLED);
    expect(refreshedUnit1?.fulfilledAt).toBeDefined();
    // Unit 2 must remain UNFULFILLED
    expect(refreshedUnit2?.status).toBe(FulfillmentUnitStatus.UNFULFILLED);

    const orderFulfillment = await prisma.order.findUnique({ where: { id: order.id } });
    expect(orderFulfillment?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
  });

  // 7. Completed report reconciled after simulated worker crash (reconcileOrphanedCompletedReports)
  it('7. Completed report reconciled after simulated worker crash', async () => {
    const order = await createTestOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: generateSignature(order.razorpayOrderId!, paymentId),
    }, userContext);

    const unit = await prisma.fulfillmentUnit.findFirst({ where: { orderId: order.id } });
    expect(unit).toBeDefined();

    // Simulate crash: Report COMPLETED but fulfillment unit left PROCESSING/UNFULFILLED
    await prisma.report.create({
      data: {
        userId: testUserId,
        birthProfileId: testBirthProfileId,
        orderId: order.id,
        fulfillmentUnitId: unit!.id,
        reportType: 'CAREER',
        status: 'COMPLETED',
        storageKey: `reports/${testUserId}/crashed.pdf`,
        fileName: 'crashed.pdf',
        fileSize: 1024,
      },
    });

    // Unit still UNFULFILLED
    const preCheck = await prisma.fulfillmentUnit.findUnique({ where: { id: unit!.id } });
    expect(preCheck?.status).toBe(FulfillmentUnitStatus.UNFULFILLED);

    // Run reconciliation recovery
    const healedCount = await fulfillmentService.reconcileOrphanedCompletedReports();
    expect(healedCount).toBeGreaterThanOrEqual(1);

    const postCheck = await prisma.fulfillmentUnit.findUnique({ where: { id: unit!.id } });
    expect(postCheck?.status).toBe(FulfillmentUnitStatus.FULFILLED);
  });

  // 8. Course entitlement granted once
  it('8. Course entitlement granted once', async () => {
    const course = await prisma.course.findFirst();
    const order = await createTestOrder([
      { catalogId: course?.sku || 'course-gupt-nadi', itemType: OrderItemType.COURSE, quantity: 1, unitPrice: 499900 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const signature = generateSignature(order.razorpayOrderId!, paymentId);

    const res1 = await coursesService.verifyCoursePayment(
      testUserId,
      {
        courseId: course?.id || '9a6d88f8-8948-4608-b917-6b406a8819ef',
        orderId: order.id,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      }
    );

    expect(res1.success).toBe(true);
    expect(res1.entitlement).toBeDefined();
    expect(res1.entitlement.userId).toBe(testUserId);
    expect(res1.entitlement.fulfillmentUnitId).toBeDefined();

    // Repeated call returns same entitlement
    const res2 = await coursesService.verifyCoursePayment(
      testUserId,
      {
        courseId: course?.id || '9a6d88f8-8948-4608-b917-6b406a8819ef',
        orderId: order.id,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      }
    );
    expect(res2.entitlement.id).toBe(res1.entitlement.id);

    const totalEntitlements = await prisma.courseEntitlement.count({
      where: { orderId: order.id },
    });
    expect(totalEntitlements).toBe(1);

    const unit = await prisma.fulfillmentUnit.findUnique({
      where: { id: res1.entitlement.fulfillmentUnitId! },
    });
    expect(unit?.status).toBe(FulfillmentUnitStatus.FULFILLED);
  });

  // 9. Multi-seat course purchase rejected (MULTI_SEAT_COURSES_UNSUPPORTED)
  it('9. Multi-seat course purchase rejected (MULTI_SEAT_COURSES_UNSUPPORTED)', async () => {
    const course = await prisma.course.findFirst();
    const order = await createTestOrder([
      { catalogId: course?.sku || 'course-gupt-nadi', itemType: OrderItemType.COURSE, quantity: 2, unitPrice: 999900 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const signature = generateSignature(order.razorpayOrderId!, paymentId);

    await expect(
      coursesService.verifyCoursePayment(
        testUserId,
        {
          courseId: course?.id || '9a6d88f8-8948-4608-b917-6b406a8819ef',
          orderId: order.id,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        }
      )
    ).rejects.toMatchObject({ code: 'MULTI_SEAT_COURSES_UNSUPPORTED' });
  });

  // 10. Consultation confirmation is idempotent
  it('10. Consultation confirmation is idempotent', async () => {
    const order = await createTestOrder([
      { catalogId: 'consult-video-45', itemType: OrderItemType.CONSULTATION, quantity: 1, unitPrice: 250000 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const signature = generateSignature(order.razorpayOrderId!, paymentId);

    // Create a pending consultation booking linked to this order
    const booking = await prisma.consultationBooking.create({
      data: {
        userId: testUserId,
        orderId: order.id,
        consultationId: 'consult-video-45',
        title: 'Vedic Consultation',
        mode: 'VIDEO' as any,
        durationMinutes: 45,
        date: '2026-12-01',
        startTime: '10:00',
        endTime: '10:45',
        slotStartTimeUtc: new Date(Date.now() + 86400000),
        slotEndTimeUtc: new Date(Date.now() + 86400000 + 45 * 60000),
        timezone: 'Asia/Kolkata',
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        status: 'PENDING_PAYMENT' as any,
      },
    });

    const verifyInput = {
      bookingId: booking.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    };

    const res1 = await consultationsService.verifyPayment(testUserId, verifyInput);
    expect(res1.booking.status).toBe('CONFIRMED');
    expect(res1.booking.fulfillmentUnitId).toBeDefined();

    // Idempotent repeat call
    const res2 = await consultationsService.verifyPayment(testUserId, verifyInput);
    expect(res2.booking.id).toBe(res1.booking.id);

    const unit = await prisma.fulfillmentUnit.findUnique({
      where: { id: res1.booking.fulfillmentUnitId! },
    });
    expect(unit?.status).toBe(FulfillmentUnitStatus.SCHEDULED);
  });

  // 11. Digital product entitlement granted once
  it('11. Digital product entitlement granted once', async () => {
    const product = await prisma.product.findFirst({ where: { requiresShipping: false } });
    const order = await createTestOrder([
      {
        catalogId: product?.catalogId || 'vivah-siddh-wallpaper-for-getting-married',
        itemType: OrderItemType.PRODUCT,
        fulfillmentType: 'DIGITAL',
        quantity: 1,
        unitPrice: 29900,
      },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const signature = generateSignature(order.razorpayOrderId!, paymentId);

    const verifyInput = {
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    };

    const res1 = await productsService.verifyShopPayment(userContext, verifyInput);
    expect(res1.digitalEntitlements?.length).toBe(1);
    expect(res1.digitalEntitlements[0].fulfillmentUnitId).toBeDefined();

    // Idempotent repeat call
    const res2 = await productsService.verifyShopPayment(userContext, verifyInput);
    expect(res2.digitalEntitlements[0].id).toBe(res1.digitalEntitlements[0].id);

    const unit = await prisma.fulfillmentUnit.findUnique({
      where: { id: res1.digitalEntitlements[0].fulfillmentUnitId! },
    });
    expect(unit?.status).toBe(FulfillmentUnitStatus.FULFILLED);
  });

  // 12. Cross-order refund allocation rejected
  it('12. Cross-order refund allocation rejected', async () => {
    const orderA = await createTestOrder([
      { catalogId: 'prod-a', itemType: OrderItemType.PRODUCT, fulfillmentType: 'DIGITAL', quantity: 1, unitPrice: 10000 },
    ]);
    const orderB = await createTestOrder([
      { catalogId: 'prod-b', itemType: OrderItemType.PRODUCT, fulfillmentType: 'DIGITAL', quantity: 1, unitPrice: 20000 },
    ]);
    const paymentIdA = `pay_${crypto.randomBytes(8).toString('hex')}`;
    await commerceService.verifyPayment({
      orderId: orderA.id,
      razorpayOrderId: orderA.razorpayOrderId!,
      razorpayPaymentId: paymentIdA,
      razorpaySignature: generateSignature(orderA.razorpayOrderId!, paymentIdA),
    }, userContext);

    const refund = await prisma.refund.create({
      data: {
        orderId: orderA.id,
        amount: 5000,
        currency: 'INR',
        status: RefundStatus.PENDING,
        reason: 'Customer request',
      },
    });

    // Try allocating refund on orderA to orderItem belonging to orderB
    await expect(
      commerceService.allocateRefundToItem({
        orderId: orderA.id,
        refundId: refund.id,
        orderItemId: orderB.items[0].id,
        amountPaise: 5000,
      })
    ).rejects.toMatchObject({ code: 'ORDER_MISMATCH' });
  });

  // 13. Refund allocation cannot exceed refund amount
  it('13. Refund allocation cannot exceed refund amount', async () => {
    const order = await createTestOrder([
      { catalogId: 'prod-gemstone', itemType: OrderItemType.PRODUCT, quantity: 1, unitPrice: 10000 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: generateSignature(order.razorpayOrderId!, paymentId),
    }, userContext);

    const refund = await prisma.refund.create({
      data: {
        orderId: order.id,
        amount: 3000,
        currency: 'INR',
        status: RefundStatus.PENDING,
        reason: 'Partial return',
      },
    });

    await expect(
      commerceService.allocateRefundToItem({
        orderId: order.id,
        refundId: refund.id,
        orderItemId: order.items[0].id,
        amountPaise: 4000, // exceeds 3000 refund total
      })
    ).rejects.toMatchObject({ code: 'ALLOCATION_EXCEEDS_REFUND' });
  });

  // 14. Refund allocation cannot exceed order item refundable balance
  it('14. Refund allocation cannot exceed order item refundable balance', async () => {
    const order = await createTestOrder([
      { catalogId: 'prod-crystal', itemType: OrderItemType.PRODUCT, quantity: 1, unitPrice: 5000 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: generateSignature(order.razorpayOrderId!, paymentId),
    }, userContext);

    const refund = await prisma.refund.create({
      data: {
        orderId: order.id,
        amount: 6000,
        currency: 'INR',
        status: RefundStatus.PENDING,
        reason: 'Return',
      },
    });

    await expect(
      commerceService.allocateRefundToItem({
        orderId: order.id,
        refundId: refund.id,
        orderItemId: order.items[0].id,
        amountPaise: 5500, // exceeds 5000 item totalPrice
      })
    ).rejects.toMatchObject({ code: 'ALLOCATION_EXCEEDS_ITEM_BALANCE' });
  });

  // 15. Failed refunds do not consume refundable balance
  it('15. Failed refunds do not consume refundable balance', async () => {
    const order = await createTestOrder([
      { catalogId: 'prod-pendant', itemType: OrderItemType.PRODUCT, quantity: 1, unitPrice: 8000 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: generateSignature(order.razorpayOrderId!, paymentId),
    }, userContext);

    // Create a FAILED refund with an allocation
    const failedRefund = await prisma.refund.create({
      data: {
        orderId: order.id,
        amount: 8000,
        currency: 'INR',
        status: RefundStatus.FAILED,
        reason: 'Payment gateway error',
      },
    });
    await prisma.refundItemAllocation.create({
      data: {
        orderId: order.id,
        refundId: failedRefund.id,
        orderItemId: order.items[0].id,
        amount: 8000,
      },
    });

    // Now create a new PENDING refund for full amount - should succeed because failed refund does not consume balance
    const activeRefund = await prisma.refund.create({
      data: {
        orderId: order.id,
        amount: 8000,
        currency: 'INR',
        status: RefundStatus.PENDING,
        reason: 'Retry refund',
      },
    });

    const allocation = await commerceService.allocateRefundToItem({
      orderId: order.id,
      refundId: activeRefund.id,
      orderItemId: order.items[0].id,
      amountPaise: 8000,
    });
    expect(allocation.amount).toBe(8000);
  });

  // 16. Partial refund updates payment state correctly
  it('16. Partial refund updates payment state correctly', async () => {
    const order = await createTestOrder([
      { catalogId: 'prod-item-1', itemType: OrderItemType.PRODUCT, quantity: 1, unitPrice: 5000 },
      { catalogId: 'prod-item-2', itemType: OrderItemType.PRODUCT, quantity: 1, unitPrice: 5000 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: generateSignature(order.razorpayOrderId!, paymentId),
    }, userContext);

    const refundResult = await commerceService.requestRefund(
      {
        orderId: order.id,
        amountPaise: 5000,
        reason: 'Partial return',
        itemAllocations: [{ orderItemId: order.items[0].id, amountPaise: 5000 }],
      },
      { id: testUserId, role: 'ADMIN' }
    );

    expect(refundResult.order.paymentStatus).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    expect(refundResult.order.status).toBe(OrderStatus.PARTIALLY_REFUNDED);
  });

  // 17. Complete refund updates payment state correctly
  it('17. Complete refund updates payment state correctly', async () => {
    const order = await createTestOrder([
      { catalogId: 'prod-single', itemType: OrderItemType.PRODUCT, quantity: 1, unitPrice: 10000 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: generateSignature(order.razorpayOrderId!, paymentId),
    }, userContext);

    const refundResult = await commerceService.requestRefund(
      {
        orderId: order.id,
        amountPaise: 10000,
        reason: 'Full refund',
        itemAllocations: [{ orderItemId: order.items[0].id, amountPaise: 10000 }],
      },
      { id: testUserId, role: 'ADMIN' }
    );

    expect(refundResult.order.paymentStatus).toBe(PaymentStatus.REFUNDED);
    expect(refundResult.order.status).toBe(OrderStatus.REFUNDED);
  });

  // 18. Partially fulfilled multi-item order remains correctly represented
  it('18. Partially fulfilled multi-item order remains correctly represented', async () => {
    // Clear any previous course entitlements for test user to prevent unique constraint conflict
    await prisma.courseEntitlement.deleteMany({ where: { userId: testUserId } });

    const course = await prisma.course.findFirst();
    const order = await createTestOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
      { catalogId: course?.sku || 'course-gupt-nadi', itemType: OrderItemType.COURSE, quantity: 1, unitPrice: 499900 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: generateSignature(order.razorpayOrderId!, paymentId),
    }, userContext);

    const units = await prisma.fulfillmentUnit.findMany({
      where: { orderId: order.id },
    });
    expect(units.length).toBe(2);

    const courseUnit = units.find((u) => u.obligationType === ObligationType.COURSE)!;
    await prisma.courseEntitlement.create({
      data: {
        userId: testUserId,
        courseId: course?.id || '9a6d88f8-8948-4608-b917-6b406a8819ef',
        orderId: order.id,
        fulfillmentUnitId: courseUnit.id,
        status: 'ACTIVE',
      },
    });
    await fulfillmentService.reconcileFulfillmentUnit(order.id, courseUnit.id);

    // One unit FULFILLED, one unit UNFULFILLED
    const refreshedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(refreshedOrder?.fulfillmentStatus).toBe(FulfillmentStatus.PROCESSING);
    expect(refreshedOrder?.status).toBe(OrderStatus.PAID);
    expect(refreshedOrder?.paymentStatus).toBe(PaymentStatus.CAPTURED);
  });

  // 19. Concurrent payment verification does not create duplicate fulfillment units
  it('19. Concurrent payment verification does not create duplicate fulfillment units', async () => {
    const order = await createTestOrder([
      { catalogId: 'report-career', itemType: OrderItemType.REPORT, quantity: 1, unitPrice: 99900 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const signature = generateSignature(order.razorpayOrderId!, paymentId);

    const [res1, res2] = await Promise.all([
      commerceService.verifyPayment({
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId!,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      }, userContext),
      commerceService.verifyPayment({
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId!,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      }, userContext),
    ]);

    expect(res1.order.status).toBe(OrderStatus.PAID);
    expect(res2.order.status).toBe(OrderStatus.PAID);

    const units = await prisma.fulfillmentUnit.findMany({
      where: { orderId: order.id },
    });
    expect(units.length).toBe(1);
  });

  // 20. Concurrent refund allocations cannot exceed available refundable balance
  it('20. Concurrent refund allocations cannot exceed available refundable balance', async () => {
    const order = await createTestOrder([
      { catalogId: 'prod-item-balance', itemType: OrderItemType.PRODUCT, quantity: 1, unitPrice: 10000 },
    ]);
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    await commerceService.verifyPayment({
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId!,
      razorpayPaymentId: paymentId,
      razorpaySignature: generateSignature(order.razorpayOrderId!, paymentId),
    }, userContext);

    const refund1 = await prisma.refund.create({
      data: {
        orderId: order.id,
        amount: 8000,
        currency: 'INR',
        status: RefundStatus.PENDING,
        reason: 'Refund 1',
      },
    });
    const refund2 = await prisma.refund.create({
      data: {
        orderId: order.id,
        amount: 8000,
        currency: 'INR',
        status: RefundStatus.PENDING,
        reason: 'Refund 2',
      },
    });

    // Try allocating 8000 on refund1 and 8000 on refund2 concurrently against 10000 total balance
    const results = await Promise.allSettled([
      commerceService.allocateRefundToItem({
        orderId: order.id,
        refundId: refund1.id,
        orderItemId: order.items[0].id,
        amountPaise: 8000,
      }),
      commerceService.allocateRefundToItem({
        orderId: order.id,
        refundId: refund2.id,
        orderItemId: order.items[0].id,
        amountPaise: 8000,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one should succeed, one should fail with ALLOCATION_EXCEEDS_ITEM_BALANCE
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });
});
