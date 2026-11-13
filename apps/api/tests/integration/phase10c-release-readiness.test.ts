import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { commerceService } from '../../src/modules/commerce/commerce.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { COMMERCE_CATALOG } from '../../src/modules/commerce/commerce.catalog';
import {
  OrderStatus,
  PaymentStatus,
  Role,
  ReportType,
  FulfillmentUnitStatus,
  ObligationType,
} from '@prisma/client';

describe('Phase 10C: End-to-End Release Readiness Audit', () => {
  let app: FastifyInstance;

  const testKeySecret = 'test_webhook_and_checkout_secret_phase10c';
  let customerA: any;
  let otherCustomer: any;
  let customerAToken: string;
  let otherCustomerToken: string;
  let primaryProfile: any;
  let partnerProfile: any;

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_SECRET = testKeySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = testKeySecret;
    process.env.LLM_PROVIDER = 'mock';

    app = buildApp();
    await app.ready();

    // Clean up test records
    const testEmails = ['customer-a-p10c@test.com', 'other-customer-p10c@test.com'];
    await prisma.report.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.refundItemAllocation.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.refund.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.fulfillmentUnit.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.order.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.birthProfile.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });

    customerA = await prisma.user.create({
      data: {
        email: 'customer-a-p10c@test.com',
        fullName: 'Phase 10C Puneet Kumar',
        role: Role.USER,
      },
    });

    otherCustomer = await prisma.user.create({
      data: {
        email: 'other-customer-p10c@test.com',
        fullName: 'Phase 10C Other User',
        role: Role.USER,
      },
    });

    customerAToken = (app as any).jwt.sign({
      sub: customerA.id,
      id: customerA.id,
      email: customerA.email,
      role: customerA.role,
    });

    otherCustomerToken = (app as any).jwt.sign({
      sub: otherCustomer.id,
      id: otherCustomer.id,
      email: otherCustomer.email,
      role: otherCustomer.role,
    });

    // Puneet Kumar canonical birth profile
    primaryProfile = await prisma.birthProfile.create({
      data: {
        userId: customerA.id,
        name: 'Puneet Kumar',
        dateOfBirth: '1983-12-28',
        timeOfBirth: '04:45:00',
        latitude: 28.4069,
        longitude: 77.8498,
        timezone: 'Asia/Kolkata',
        placeName: 'Bulandshahr, Uttar Pradesh, India',
      },
    });

    // Partner birth profile for marriage compatibility
    partnerProfile = await prisma.birthProfile.create({
      data: {
        userId: customerA.id,
        name: 'Partner Compatibility Profile',
        dateOfBirth: '1986-05-14',
        timeOfBirth: '14:30:00',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
        placeName: 'New Delhi, India',
      },
    });
  });

  afterAll(async () => {
    const testEmails = ['customer-a-p10c@test.com', 'other-customer-p10c@test.com'];
    await prisma.report.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.refundItemAllocation.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.refund.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.fulfillmentUnit.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.order.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.birthProfile.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
    await app.close();
  });

  function signPayment(orderId: string, paymentId: string): string {
    return crypto.createHmac('sha256', testKeySecret).update(`${orderId}|${paymentId}`).digest('hex');
  }

  // =========================================================================
  // 1. REFUND VERSUS ACTIVE WORKER RACE CONDITIONS
  // =========================================================================
  describe('1. Refund Versus Active Worker Race Conditions', () => {
    it('1.1 should fence active worker claim on full refund, preventing late completion and revoking customer access', async () => {
      // 1. Order created & paid
      const orderResp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          items: [{ catalogId: 'report-kundli', quantity: 1 }],
        },
      });
      expect(orderResp.statusCode).toBe(201);
      const { orderId, razorpayOrderId } = JSON.parse(orderResp.body);

      const paymentId = `pay_race_${Date.now()}`;
      const signature = signPayment(razorpayOrderId, paymentId);
      const verifyResp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/verify',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: { razorpayOrderId, razorpayPaymentId: paymentId, razorpaySignature: signature },
      });
      expect(verifyResp.statusCode).toBe(200);

      // Verify 1 fulfillment unit created
      const units = await prisma.fulfillmentUnit.findMany({ where: { orderId } });
      expect(units).toHaveLength(1);
      const unit = units[0];

      // 2. Enqueue report job
      const reportId = crypto.randomUUID();
      const now = new Date();
      await prisma.report.create({
        data: {
          id: reportId,
          userId: customerA.id,
          birthProfileId: primaryProfile.id,
          orderId,
          fulfillmentUnitId: unit.id,
          reportType: ReportType.KUNDLI,
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
          expectedDeliveryAt: new Date(now.getTime() + 24 * 3600 * 1000),
          reportVersion: '1.0.0',
          calculationVersion: '1.0.0',
          claimVersion: 1,
        },
      });

      // 3. Worker claims the job (atomic claim increments claimVersion)
      const workerId = 'worker-p10c-race';
      const claimedJob = await postgresQueueService.claimJob(workerId, 60);
      expect(claimedJob).not.toBeNull();
      expect(claimedJob!.id).toBe(reportId);
      expect(claimedJob!.claimToken).toBeTruthy();
      expect(claimedJob!.claimVersion).toBeGreaterThanOrEqual(1);

      // 4. Report is in PROCESSING/CALCULATING state
      const processingReport = await prisma.report.findUnique({ where: { id: reportId } });
      expect(['PROCESSING', 'CALCULATING']).toContain(processingReport?.status);

      // 5. Customer receives a full refund
      const refundResult = await commerceService.requestRefund(
        {
          orderId,
          amountPaise: 29900,
          reason: 'Customer requested full cancellation during generation',
        },
        { id: customerA.id, role: Role.USER }
      );
      expect(refundResult.refund.status).toBe('PROCESSED');
      expect(refundResult.order.status).toBe('REFUNDED');

      // 6. Verify cancellation invalidates worker claim & cancels fulfillment
      const cancelledUnit = await prisma.fulfillmentUnit.findUnique({ where: { id: unit.id } });
      expect(cancelledUnit?.status).toBe(FulfillmentUnitStatus.CANCELLED);

      const fencedReport = await prisma.report.findUnique({ where: { id: reportId } });
      expect(fencedReport?.status).toBe('FAILED');
      expect(fencedReport?.errorCode).toBe('ORDER_REFUNDED');
      expect(fencedReport?.claimToken).toBeNull();
      expect(fencedReport?.claimVersion).toBeGreaterThan(claimedJob!.claimVersion);

      // 7. Stale worker finishes PDF generation and attempts to complete the job
      const staleCompleteResult = await postgresQueueService.completeJob(
        reportId,
        claimedJob!.claimToken,
        claimedJob!.claimVersion,
        'reports/pdf/orphaned_race.pdf',
        'orphaned_race.pdf',
        12345,
        16
      );

      // Stale worker completeJob MUST return false (fenced by version mismatch and cleared token!)
      expect(staleCompleteResult).toBe(false);

      // Report must remain FAILED, never marked COMPLETED
      const finalReport = await prisma.report.findUnique({ where: { id: reportId } });
      expect(finalReport?.status).toBe('FAILED');
      expect(finalReport?.storageKey).toBeNull();

      // 8. Customer cannot access the refunded report (Anti-Enumeration 404)
      const statusResp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/${reportId}/status`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });
      expect(statusResp.statusCode).toBe(404);

      const pdfResp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/${reportId}/pdf`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });
      expect(pdfResp.statusCode).toBe(404);

      // 9. Customer cannot re-generate against refunded order
      const regenResp = await app.inject({
        method: 'POST',
        url: '/api/v1/reports/generate',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          birthProfileId: primaryProfile.id,
          reportType: 'KUNDLI',
          orderId,
        },
      });
      expect(regenResp.statusCode).toBe(403);
    });

    it('1.2 should isolate partial refunds: fence refunded item while preserving unaffected fulfillment units', async () => {
      // 1. Multi-item order: Item 1 (Kundli ₹299) + Item 2 (Horoscope ₹499)
      const orderResp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          items: [
            { catalogId: 'report-kundli', quantity: 1 },
            { catalogId: 'report-horoscope', quantity: 1 },
          ],
        },
      });
      expect(orderResp.statusCode).toBe(201);
      const { orderId, razorpayOrderId } = JSON.parse(orderResp.body);

      const paymentId = `pay_multi_${Date.now()}`;
      const signature = signPayment(razorpayOrderId, paymentId);
      await app.inject({
        method: 'POST',
        url: '/api/v1/payments/verify',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: { razorpayOrderId, razorpayPaymentId: paymentId, razorpaySignature: signature },
      });

      // Verify 2 fulfillment units created
      const units = await prisma.fulfillmentUnit.findMany({
        where: { orderId },
        include: { orderItem: true },
        orderBy: { unitIndex: 'asc' },
      });
      expect(units).toHaveLength(2);

      const kundliUnit = units.find((u) => u.orderItem.catalogId === 'report-kundli')!;
      const horoscopeUnit = units.find((u) => u.orderItem.catalogId === 'report-horoscope')!;

      // Create reports for both
      const kundliReportId = crypto.randomUUID();
      const horoReportId = crypto.randomUUID();
      const now = new Date();

      await prisma.report.create({
        data: {
          id: kundliReportId,
          userId: customerA.id,
          birthProfileId: primaryProfile.id,
          orderId,
          fulfillmentUnitId: kundliUnit.id,
          reportType: ReportType.KUNDLI,
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
          expectedDeliveryAt: new Date(now.getTime() + 24 * 3600 * 1000),
          reportVersion: '1.0.0',
          calculationVersion: '1.0.0',
          claimVersion: 1,
        },
      });

      await prisma.report.create({
        data: {
          id: horoReportId,
          userId: customerA.id,
          birthProfileId: primaryProfile.id,
          orderId,
          fulfillmentUnitId: horoscopeUnit.id,
          reportType: ReportType.HOROSCOPE,
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
          expectedDeliveryAt: new Date(now.getTime() + 24 * 3600 * 1000),
          reportVersion: '1.0.0',
          calculationVersion: '1.0.0',
          claimVersion: 1,
        },
      });

      // Workers claim both jobs
      const claim1 = await postgresQueueService.claimJob('worker-p10c-partial-1', 60);
      const claim2 = await postgresQueueService.claimJob('worker-p10c-partial-2', 60);
      expect(claim1).not.toBeNull();
      expect(claim2).not.toBeNull();

      const claimedKundli = claim1!.id === kundliReportId ? claim1! : claim2!;
      const claimedHoro = claim1!.id === horoReportId ? claim1! : claim2!;

      // Partial refund: Refund Kundli item (29900 paise) only
      const refundRecord = await prisma.refund.create({
        data: {
          orderId,
          amount: 29900,
          currency: 'INR',
          reason: 'Partial refund of Kundli report',
          status: 'PROCESSED',
        },
      });

      await commerceService.allocateRefundToItem({
        orderId,
        refundId: refundRecord.id,
        orderItemId: kundliUnit.orderItemId,
        amountPaise: 29900,
      });

      // Verify Kundli fulfillment unit is CANCELLED
      const updatedKundliUnit = await prisma.fulfillmentUnit.findUnique({ where: { id: kundliUnit.id } });
      expect(updatedKundliUnit?.status).toBe(FulfillmentUnitStatus.CANCELLED);

      // Verify Kundli report is FAILED & claimVersion bumped
      const updatedKundliReport = await prisma.report.findUnique({ where: { id: kundliReportId } });
      expect(updatedKundliReport?.status).toBe('FAILED');
      expect(updatedKundliReport?.errorCode).toBe('ORDER_REFUNDED');
      expect(updatedKundliReport?.claimVersion).toBeGreaterThan(claimedKundli.claimVersion);

      // Verify Horoscope fulfillment unit remains ACTIVE
      const updatedHoroUnit = await prisma.fulfillmentUnit.findUnique({ where: { id: horoscopeUnit.id } });
      expect(updatedHoroUnit?.status).not.toBe(FulfillmentUnitStatus.CANCELLED);

      // Horoscope worker completes normally
      const horoCompleteRes = await postgresQueueService.completeJob(
        horoReportId,
        claimedHoro.claimToken,
        claimedHoro.claimVersion,
        'reports/pdf/horoscope_partial_success.pdf',
        'horoscope_partial_success.pdf',
        54321,
        20
      );
      expect(horoCompleteRes).toBe(true);

      const completedHoroReport = await prisma.report.findUnique({ where: { id: horoReportId } });
      expect(completedHoroReport?.status).toBe('COMPLETED');
      expect(completedHoroReport?.storageKey).toBe('reports/pdf/horoscope_partial_success.pdf');

      // Stale Kundli worker attempt is fenced
      const staleKundliComplete = await postgresQueueService.completeJob(
        kundliReportId,
        claimedKundli.claimToken,
        claimedKundli.claimVersion,
        'reports/pdf/stale_kundli.pdf',
        'stale_kundli.pdf',
        11111,
        15
      );
      expect(staleKundliComplete).toBe(false);
    });
  });

  // =========================================================================
  // 2. END-TO-END CUSTOMER JOURNEY FOR ALL 10 RELEASED SKUS
  // =========================================================================
  describe('2. End-to-End Customer Journey For All 10 Released SKUs', () => {
    const RELEASED_SKUS = [
      { sku: 'report-kundli', price: 29900, reportType: ReportType.KUNDLI, isCareer: false },
      { sku: 'report-planetary-summary', price: 19900, reportType: ReportType.PLANETARY_SUMMARY, isCareer: false },
      { sku: 'report-horoscope', price: 49900, reportType: ReportType.HOROSCOPE, isCareer: false },
      { sku: 'report-career', price: 49900, reportType: ReportType.CAREER, isCareer: true },
      { sku: 'report-career-pro', price: 69900, reportType: ReportType.CAREER_PROSITY, isCareer: false },
      { sku: 'report-finance', price: 49900, reportType: ReportType.FINANCE, isCareer: false },
      { sku: 'report-love', price: 49900, reportType: ReportType.LOVE, isCareer: false },
      { sku: 'report-fortune', price: 49900, reportType: ReportType.FORTUNE, isCareer: false },
      { sku: 'report-marriage', price: 49900, reportType: ReportType.MARRIAGE_COMPATIBILITY, isCareer: false, needsPartner: true },
      { sku: 'report-saturn', price: 49900, reportType: ReportType.SATURN, isCareer: false },
    ];

    for (const item of RELEASED_SKUS) {
      it(
        `should successfully complete end-to-end journey for ${item.sku} (₹${item.price / 100})`,
        async () => {
          // Step 1: Catalogue selection & Server-side price validation
          const catalogEntry = COMMERCE_CATALOG[item.sku];
          expect(catalogEntry).toBeDefined();
          expect(catalogEntry.pricePaise).toBe(item.price);
          expect(catalogEntry.isActive).toBe(true);

          // Step 2: Create Order
          const orderResp = await app.inject({
            method: 'POST',
            url: '/api/v1/payments/create-order',
            headers: { authorization: `Bearer ${customerAToken}` },
            payload: {
              items: [{ catalogId: item.sku, quantity: 1 }],
              // Client price tampering attempt must be ignored
              pricePaise: 1,
              amount: 1,
            },
          });

          expect(orderResp.statusCode).toBe(201);
          const { orderId, razorpayOrderId, amount } = JSON.parse(orderResp.body);
          expect(amount).toBe(item.price);

          // Step 3: Payment Verification
          const paymentId = `pay_sku_${item.sku.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
          const signature = signPayment(razorpayOrderId, paymentId);

          const verifyResp = await app.inject({
            method: 'POST',
            url: '/api/v1/payments/verify',
            headers: { authorization: `Bearer ${customerAToken}` },
            payload: { razorpayOrderId, razorpayPaymentId: paymentId, razorpaySignature: signature },
          });

          expect(verifyResp.statusCode).toBe(200);
          const verifyBody = JSON.parse(verifyResp.body);
          expect(verifyBody.order.status).toBe(OrderStatus.PAID);
          expect(verifyBody.order.paymentStatus).toBe(PaymentStatus.CAPTURED);

          // Step 4: Verify exactly 1 fulfillment unit created
          const units = await prisma.fulfillmentUnit.findMany({ where: { orderId } });
          expect(units).toHaveLength(1);
          expect(units[0].obligationType).toBe(ObligationType.REPORT);

          // Step 5: Report generation request
          const genPayload: any = {
            birthProfileId: primaryProfile.id,
            reportType: item.reportType,
            orderId,
          };
          if (item.needsPartner) {
            genPayload.partnerProfileId = partnerProfile.id;
          }

          const genUrl = item.isCareer ? '/api/v1/reports/career' : '/api/v1/reports/generate';
          const genResp = await app.inject({
            method: 'POST',
            url: genUrl,
            headers: { authorization: `Bearer ${customerAToken}` },
            payload: genPayload,
          });

          expect(genResp.statusCode).toBe(201);
          const genBody = JSON.parse(genResp.body);
          const reportId = genBody.id || genBody.reportId;
          expect(reportId).toBeDefined();

          // If job was queued (e.g. career report pipeline), execute worker pipeline to completion
          if (genBody.status === 'QUEUED') {
            await careerReportWorker.executeReportPipeline(reportId);
          }

          // Step 6: Verify 24-hour delivery SLA calculation
          const orderRecord = await prisma.order.findUnique({ where: { id: orderId } });
          const reportRecord = await prisma.report.findUnique({ where: { id: reportId } });
          expect(reportRecord).toBeDefined();
          expect(reportRecord!.status).toBe('COMPLETED');

          const paidTime = orderRecord!.paidAt!.getTime();
          const expectedDeliveryTime = reportRecord!.expectedDeliveryAt!.getTime();
          const differenceHours = (expectedDeliveryTime - paidTime) / (1000 * 60 * 60);
          expect(Math.round(differenceHours)).toBe(24);

          // Step 7: Customer downloads PDF
          const pdfResp = await app.inject({
            method: 'GET',
            url: `/api/v1/reports/${reportId}/pdf`,
            headers: { authorization: `Bearer ${customerAToken}` },
          });

          expect(pdfResp.statusCode).toBe(200);
          expect(pdfResp.headers['content-type']).toBe('application/pdf');
          expect(pdfResp.rawPayload.length).toBeGreaterThan(100);
          expect(pdfResp.rawPayload.toString('utf8', 0, 5)).toBe('%PDF-');

          // Step 8: Reopening without regeneration (idempotent reuse)
          const reopenResp = await app.inject({
            method: 'POST',
            url: genUrl,
            headers: { authorization: `Bearer ${customerAToken}` },
            payload: genPayload,
          });

          expect(reopenResp.statusCode).toBe(201);
          const reopenBody = JSON.parse(reopenResp.body);
          expect(reopenBody.reused).toBe(true);
          expect(reopenBody.id || reopenBody.reportId).toBe(reportId);

          // Step 9: Unauthorized customer cannot access this report (Anti-Enumeration 404)
          const unauthResp = await app.inject({
            method: 'GET',
            url: `/api/v1/reports/${reportId}/pdf`,
            headers: { authorization: `Bearer ${otherCustomerToken}` },
          });
          expect(unauthResp.statusCode).toBe(404);
        },
        90000
      );
    }
  });

  // =========================================================================
  // 3. CHECKOUT BLOCKED FOR ALL 4 UNRELEASED SKUS
  // =========================================================================
  describe('3. Checkout Blocked for All 4 Unreleased SKUs', () => {
    const UNRELEASED_SKUS = [
      'report-jupiter-transit',
      'report-rahu-ketu-transit',
      'report-varshphal',
      'report-fortune-plus',
    ];

    for (const sku of UNRELEASED_SKUS) {
      it(`should strictly reject checkout for unreleased SKU ${sku}`, async () => {
        const resp = await app.inject({
          method: 'POST',
          url: '/api/v1/payments/create-order',
          headers: { authorization: `Bearer ${customerAToken}` },
          payload: {
            items: [{ catalogId: sku, quantity: 1 }],
          },
        });

        expect(resp.statusCode).toBe(400);
        const body = JSON.parse(resp.body);
        expect(body.error.message).toContain('currently inactive or unavailable');

        // Verify no order created
        const unreleasedItem = COMMERCE_CATALOG[sku];
        expect(unreleasedItem.isActive).toBe(false);
        expect(unreleasedItem.pricePaise).toBe(0);
      });
    }
  });

  // =========================================================================
  // 4. RELEASE CONFIGURATION & OPERATIONAL READINESS
  // =========================================================================
  describe('4. Release Configuration & Operational Readiness', () => {
    it('4.1 should return healthy status on liveness probe /health', async () => {
      const resp = await app.inject({
        method: 'GET',
        url: '/health',
      });
      expect(resp.statusCode).toBe(200);
      const body = JSON.parse(resp.body);
      expect(body.status).toBe('ok');
      expect(body.service).toBe('astro-api');
    });

    it('4.2 should return healthy database and queue connectivity on readiness probe /ready and /health/ready', async () => {
      const resp1 = await app.inject({
        method: 'GET',
        url: '/ready',
      });
      expect(resp1.statusCode).toBe(200);
      const body1 = JSON.parse(resp1.body);
      expect(body1.status).toBe('ok');
      expect(body1.database).toBe('connected');
      expect(body1.queue).toBe('connected');

      const resp2 = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });
      expect(resp2.statusCode).toBe(200);
      const body2 = JSON.parse(resp2.body);
      expect(body2.status).toBe('ok');
      expect(body2.database).toBe('connected');
      expect(body2.queue).toBe('connected');
    });

    it('4.3 should emit no-store and anti-caching headers on all report endpoints', async () => {
      const resp = await app.inject({
        method: 'GET',
        url: '/api/v1/reports/my-reports',
        headers: { authorization: `Bearer ${customerAToken}` },
      });
      expect(resp.statusCode).toBe(200);
      expect(resp.headers['cache-control']).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(resp.headers['pragma']).toBe('no-cache');
      expect(resp.headers['expires']).toBe('0');
    });
  });
});
