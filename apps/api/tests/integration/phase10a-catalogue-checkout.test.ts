import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { paymentService, REPORT_PRICES_PAISE } from '../../src/services/payment.service';
import { COMMERCE_CATALOG, commerceCatalog } from '../../src/modules/commerce/commerce.catalog';
import { reportsService } from '../../src/modules/reports/reports.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { storageService } from '../../src/services/storage.service';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { stubPlatformGeneration } from '../helpers/platform-report-stub';
import { OrderStatus, PaymentStatus, Role, ReportType, OrderItemType, FulfillmentStatus, ObligationType } from '@prisma/client';

describe('Phase 10A: Catalogue and Checkout Integration Test Suite', () => {
  let app: FastifyInstance;

  const testKeySecret = 'test_webhook_and_checkout_secret_phase10a';
  let testUser: any;
  let otherUser: any;
  let userToken: string;
  let otherUserToken: string;
  let birthProfile: any;

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_SECRET = testKeySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = testKeySecret;

    app = buildApp();
    await app.ready();

    // Clean up test records
    const testEmails = ['user-p10a@test.com', 'other-p10a@test.com'];
    await prisma.report.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.fulfillmentUnit.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.order.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });

    testUser = await prisma.user.create({
      data: {
        email: 'user-p10a@test.com',
        fullName: 'Phase 10A Test User',
        role: Role.USER,
      },
    });

    otherUser = await prisma.user.create({
      data: {
        email: 'other-p10a@test.com',
        fullName: 'Phase 10A Other User',
        role: Role.USER,
      },
    });

    userToken = (app as any).jwt.sign({
      sub: testUser.id,
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });

    otherUserToken = (app as any).jwt.sign({
      sub: otherUser.id,
      id: otherUser.id,
      email: otherUser.email,
      role: otherUser.role,
    });

    birthProfile = await prisma.birthProfile.create({
      data: {
        userId: testUser.id,
        name: 'Phase 10A Client Profile',
        dateOfBirth: '1983-12-28',
        timeOfBirth: '04:45:00',
        latitude: 28.4069,
        longitude: 77.8498,
        timezone: 'Asia/Kolkata',
        placeName: 'Uttar Pradesh, India',
      },
    });
  });

  afterAll(async () => {
    const testEmails = ['user-p10a@test.com', 'other-p10a@test.com'];
    await prisma.report.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.fulfillmentUnit.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.order.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.birthProfile.deleteMany({ where: { userId: { in: [testUser.id, otherUser.id] } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
    await app.close();
  });

  // =========================================================================
  // 1. CATALOGUE CORRECTNESS & PRICE INVARIANTS
  // =========================================================================
  describe('1. Catalogue Inventory & Pricing Invariants', () => {
    it('should strictly maintain authorized pricing for all 9 released reports and the retired Career Pro alias', () => {
      const EXPECTED_PRICES: Record<string, { price: number; reportType: ReportType; isActive: boolean }> = {
        // Website price since 2026-11-24: ₹999 + 18% GST, stored GST-inclusive.
        'report-kundli': { price: 117882, reportType: ReportType.KUNDLI, isActive: true },
        // Website price since 2026-11-24: ₹199 + 18% GST, stored GST-inclusive.
        'report-planetary-summary': { price: 23482, reportType: ReportType.PLANETARY_SUMMARY, isActive: true },
        'report-horoscope': { price: 49900, reportType: ReportType.HOROSCOPE, isActive: true },
        'report-career': { price: 49900, reportType: ReportType.CAREER, isActive: true },
        // Retired from sale (only one Career report exists); kept so historical CAREER_PROSITY orders still fulfil.
        'report-career-pro': { price: 69900, reportType: ReportType.CAREER_PROSITY, isActive: false },
        'report-finance': { price: 49900, reportType: ReportType.FINANCE, isActive: true },
        'report-love': { price: 49900, reportType: ReportType.LOVE, isActive: true },
        'report-fortune': { price: 49900, reportType: ReportType.FORTUNE, isActive: true },
        // Website price since 2026-11-24: ₹999, GST rate 0.
        'report-marriage': { price: 99900, reportType: ReportType.MARRIAGE_COMPATIBILITY, isActive: true },
        'report-saturn': { price: 49900, reportType: ReportType.SATURN, isActive: true },
      };

      for (const [sku, expected] of Object.entries(EXPECTED_PRICES)) {
        const item = COMMERCE_CATALOG[sku];
        expect(item, `SKU ${sku} must exist in COMMERCE_CATALOG`).toBeDefined();
        expect(item.pricePaise).toBe(expected.price);
        expect(item.legacyReportType).toBe(expected.reportType);
        expect(item.isActive, `SKU ${sku} isActive`).toBe(expected.isActive);
        expect(REPORT_PRICES_PAISE[expected.reportType]).toBe(expected.price);
      }
    });

    it('should enforce distinct titles between Fortune and Fortune Plus', () => {
      expect(COMMERCE_CATALOG['report-fortune'].title).toBe('Personalised Fortune Report');
      expect(COMMERCE_CATALOG['report-fortune-plus'].title).toBe(
        'Personalised Fortune Report Plus (Comprehensive Edition)'
      );
    });

    it('should price the reports aligned with the website on 2026-11-24', () => {
      // Fortune Plus is on sale since 2026-11-24 (₹699 + 18% GST, stored GST-inclusive).
      expect(COMMERCE_CATALOG['report-fortune-plus'].pricePaise).toBe(82482);
      expect(COMMERCE_CATALOG['report-fortune-plus'].isActive).toBe(true);
      expect(REPORT_PRICES_PAISE[ReportType.FORTUNE_PLUS]).toBe(82482);
      // Basic Kundli: ₹299 + 18% GST, stored GST-inclusive.
      expect(COMMERCE_CATALOG['report-kundli-basic'].pricePaise).toBe(35282);
      expect(COMMERCE_CATALOG['report-kundli-basic'].isActive).toBe(true);
      expect(REPORT_PRICES_PAISE[ReportType.KUNDLI_BASIC]).toBe(35282);
      // Marriage compatibility carries GST rate 0 on the website.
      expect(COMMERCE_CATALOG['report-marriage'].taxRateBasisPoints).toBe(0);
    });

    it('should keep all 4 unreleased reports inactive at 0 paise with checkout blocked', () => {
      // Fortune Plus was released on 2026-11-24; Baby Name takes its place as the fourth unreleased report.
      const UNRELEASED_SKUS = [
        'report-jupiter-transit',
        'report-rahu-ketu-transit',
        'report-varshphal',
        'report-baby-name',
      ];

      for (const sku of UNRELEASED_SKUS) {
        const item = COMMERCE_CATALOG[sku];
        expect(item, `Unreleased SKU ${sku} must exist`).toBeDefined();
        expect(item.pricePaise).toBe(0);
        expect(item.isActive).toBe(false);
      }
    });
  });

  // =========================================================================
  // 2. CHECKOUT VALIDATION & TAMPERING IMMUNITY
  // =========================================================================
  describe('2. Checkout Validation & Security Safeguards', () => {
    it('should reject order creation for unreleased inactive SKUs', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          // Still unpriced and inactive (Fortune Plus, used here before, is on sale since 2026-11-24).
          items: [{ catalogId: 'report-baby-name', quantity: 1 }],
        },
      });

      expect(resp.statusCode).toBe(400);
      const body = JSON.parse(resp.body);
      expect(body.error.message).toContain('currently inactive or unavailable');
    });

    it('should block checkout when an unreleased reportType is passed via legacy parameter', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          // Still unpriced and inactive (FORTUNE_PLUS, used here before, is on sale since 2026-11-24).
          reportType: 'BABY_NAME',
        },
      });

      expect(resp.statusCode).toBe(400);
      const body = JSON.parse(resp.body);
      expect(body.error.message).toContain('currently inactive or unavailable');
    });

    it('should completely ignore client-supplied price or discount parameters', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          items: [{ catalogId: 'report-saturn', quantity: 1 }],
          pricePaise: 100, // Attempted tamper to ₹1
          amount: 50,      // Attempted tamper
          discountAmount: 49800,
        },
      });

      expect(resp.statusCode).toBe(201);
      const body = JSON.parse(resp.body);
      expect(body.amount).toBe(49900); // Must strictly remain ₹499
      expect(body.currency).toBe('INR');
      expect(body.paymentStatus).toBe('PENDING');
    });
  });

  // =========================================================================
  // 3. COMPLETE PAYMENT TO FULFILLMENT WEBHOOK JOURNEY
  // =========================================================================
  describe('3. Payment Capture, Webhook Deduplication & Fulfillment Units', () => {
    let orderId: string;
    let razorpayOrderId: string;

    it('should create an immutable order snapshot for Saturn Report', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          items: [{ catalogId: 'report-saturn', quantity: 1 }],
        },
      });

      expect(resp.statusCode).toBe(201);
      const body = JSON.parse(resp.body);
      orderId = body.orderId;
      razorpayOrderId = body.razorpayOrderId;
      expect(body.amount).toBe(49900);
    });

    it('should verify payment and create exactly 1 fulfillment unit atomically', async () => {
      const razorpayPaymentId = `pay_mock_${Date.now()}`;
      const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
      const razorpaySignature = crypto
        .createHmac('sha256', testKeySecret)
        .update(payload)
        .digest('hex');

      const verifyResp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/verify',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
        },
      });

      expect(verifyResp.statusCode).toBe(200);
      const body = JSON.parse(verifyResp.body);
      expect(body.order.status).toBe('PAID');
      expect(body.order.paymentStatus).toBe('CAPTURED');

      // Verify exactly 1 fulfillment unit created
      const units = await prisma.fulfillmentUnit.findMany({
        where: { orderId },
      });
      expect(units).toHaveLength(1);
      expect(units[0].obligationType).toBe(ObligationType.REPORT);
      expect(units[0].unitIndex).toBe(1);
      expect(units[0].status).toBe('UNFULFILLED');
    });

    it('should process payment.captured webhook idempotently without creating duplicate units', async () => {
      // Simulate Razorpay webhook delivery
      const webhookPayload = {
        event: 'payment.captured',
        event_id: `evt_mock_${orderId}`,
        payload: {
          payment: {
            entity: {
              id: `pay_wh_${Date.now()}`,
              order_id: razorpayOrderId,
              amount: 49900,
              status: 'captured',
            },
          },
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const signature = crypto
        .createHmac('sha256', testKeySecret)
        .update(rawBody)
        .digest('hex');

      // First webhook delivery
      const whResp1 = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: {
          'x-razorpay-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawBody,
      });

      expect(whResp1.statusCode).toBe(200);

      // Duplicate webhook delivery
      const whResp2 = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: {
          'x-razorpay-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawBody,
      });

      expect(whResp2.statusCode).toBe(200);
      const body2 = JSON.parse(whResp2.body);
      expect(body2.duplicate).toBe(true);

      // Verify fulfillment units remain strictly 1
      const units = await prisma.fulfillmentUnit.findMany({
        where: { orderId },
      });
      expect(units).toHaveLength(1);
    });
  });

  // =========================================================================
  // 4. REPORT QUEUE DISPATCH, REUSE & ACCESS CONTROL
  // =========================================================================
  describe('4. Report Dispatch, Fulfillment Linkage & Customer Authorization', () => {
    let paidOrderId: string;
    let generatedReportId: string;

    beforeAll(async () => {
      // Create a paid order for Horoscope
      const order = await prisma.order.create({
        data: {
          userId: testUser.id,
          razorpayOrderId: `order_paid_horo_${Date.now()}`,
          amount: 49900,
          currency: 'INR',
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.CAPTURED,
          reportType: ReportType.HOROSCOPE,
          items: {
            create: [
              {
                catalogId: 'report-horoscope',
                itemType: OrderItemType.REPORT,
                title: 'Personalised Horoscope & Yearly Transit Dossier 2026',
                unitPrice: 49900,
                quantity: 1,
                totalAmount: 49900,
                fulfillmentType: 'DIGITAL',
              },
            ],
          },
        },
      });
      paidOrderId = order.id;
    });

    it('should generate report, bind fulfillment unit, and enqueue in PostgreSQL queue', async () => {
      // The request enqueues without awaiting; wait for that durable-queue UPDATE to settle
      // so the worker claim below is not skipped by its row lock (FOR UPDATE SKIP LOCKED).
      const enqueueSpy = vi.spyOn(careerReportWorker, 'enqueueReportJob');
      let genResp;
      try {
        genResp = await app.inject({
          method: 'POST',
          url: '/api/v1/reports/generate',
          headers: { authorization: `Bearer ${userToken}` },
          payload: {
            birthProfileId: birthProfile.id,
            reportType: 'HOROSCOPE',
            orderId: paidOrderId,
          },
        });
        await Promise.all(enqueueSpy.mock.results.map((r) => r.value));
        expect(enqueueSpy).toHaveBeenCalledTimes(1);
        expect(await enqueueSpy.mock.results[0].value).toBe(true);
      } finally {
        enqueueSpy.mockRestore();
      }

      // Generation always runs in the report worker: the request only queues the job.
      expect(genResp.statusCode).toBe(201);
      const body = JSON.parse(genResp.body);
      generatedReportId = body.id;
      expect(body.status).toBe('QUEUED');
      expect(body.reused).toBe(false);

      // Verify report is queued and attached to the fulfillment unit
      const report = await prisma.report.findUnique({
        where: { id: generatedReportId },
        include: { fulfillmentUnit: true },
      });
      expect(report?.status).toBe('QUEUED');
      expect(report?.reportType).toBe('HOROSCOPE');
      expect(report?.orderId).toBe(paidOrderId);
      expect(report?.fulfillmentUnitId).toBeTruthy();
      expect(report?.fulfillmentUnit?.orderId).toBe(paidOrderId);
      expect(report?.fulfillmentUnit?.status).toBe('PROCESSING');

      // The worker claims the queued job and delivers it (platform generation stubbed: no LLM).
      const generation = stubPlatformGeneration('completed');
      let generationCalls = 0;
      try {
        await careerReportWorker.executeReportPipeline(generatedReportId);
        generationCalls = generation.mock.calls.length;
      } finally {
        generation.mockRestore();
      }
      expect(generationCalls).toBe(1);

      const delivered = await prisma.report.findUnique({
        where: { id: generatedReportId },
        include: { fulfillmentUnit: true },
      });
      expect(delivered?.status).toBe('COMPLETED');
      expect(delivered?.storageKey).toBe(`reports/${testUser.id}/${generatedReportId}.pdf`);
      expect(delivered?.fulfillmentUnit?.status).toBe('FULFILLED');
    });

    it('should reuse existing completed report artifact without regenerating on second request', async () => {
      const secondGenResp = await app.inject({
        method: 'POST',
        url: '/api/v1/reports/generate',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          birthProfileId: birthProfile.id,
          reportType: 'HOROSCOPE',
          orderId: paidOrderId,
        },
      });

      expect(secondGenResp.statusCode).toBe(201);
      const body = JSON.parse(secondGenResp.body);
      expect(body.reused).toBe(true);
      expect(body.id).toBe(generatedReportId);
    });

    it('should re-queue and increment claimVersion when forceRegenerate is true', async () => {
      const initialReport = await prisma.report.findUnique({
        where: { id: generatedReportId },
      });
      const initialVersion = initialReport?.claimVersion || 0;

      const regenResp = await app.inject({
        method: 'POST',
        url: '/api/v1/reports/generate',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          birthProfileId: birthProfile.id,
          reportType: 'HOROSCOPE',
          orderId: paidOrderId,
          forceRegenerate: true,
        },
      });

      expect(regenResp.statusCode).toBe(201);

      const updatedReport = await prisma.report.findUnique({
        where: { id: generatedReportId },
      });
      expect(updatedReport?.claimVersion).toBeGreaterThan(initialVersion);
    });

    it('should reject unauthorized customer access to another user’s report (Anti-Enumeration 404)', async () => {
      const unauthResp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/${generatedReportId}`,
        headers: { authorization: `Bearer ${otherUserToken}` },
      });

      // Must return 404 Not Found to prevent ID enumeration
      expect(unauthResp.statusCode).toBe(404);
    });

    it('should reject unauthorized customer download of another user’s PDF', async () => {
      const unauthDownloadResp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/${generatedReportId}/download-file`,
        headers: { authorization: `Bearer ${otherUserToken}` },
      });

      expect(unauthDownloadResp.statusCode).toBe(404);
    });
  });
});
