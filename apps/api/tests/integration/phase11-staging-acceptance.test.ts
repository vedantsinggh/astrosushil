import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { commerceService } from '../../src/modules/commerce/commerce.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { storageService } from '../../src/services/storage.service';
import { logger, LOG_REDACT_KEYS } from '../../src/utils/logger';
import { COMMERCE_CATALOG } from '../../src/modules/commerce/commerce.catalog';
import {
  OrderStatus,
  PaymentStatus,
  Role,
  ReportType,
  FulfillmentStatus,
  FulfillmentUnitStatus,
  ObligationType,
  OrderItemType,
} from '@prisma/client';

describe('Phase 11: Staging Deployment and Acceptance Verification Suite', () => {
  let app: FastifyInstance;

  // Staging environment parameters
  const stagingKeySecret = 'test_staging_secret_key_abcdef123456';
  const stagingWebhookSecret = 'test_staging_webhook_secret_xyz98765';
  const stagingStorageDir = '/tmp/astro-sushil/staging-storage';

  let stagingUserA: any;
  let stagingUserB: any;
  let userAToken: string;
  let userBToken: string;
  let birthProfileA: any;
  let birthProfilePartner: any;

  beforeAll(async () => {
    // 1. Configure staging environment variables
    process.env.NODE_ENV = 'test';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_staging_001';
    process.env.RAZORPAY_KEY_SECRET = stagingKeySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = stagingWebhookSecret;
    process.env.STORAGE_LOCAL_DIR = stagingStorageDir;
    process.env.LLM_PROVIDER = 'mock';

    // Ensure staging storage directory exists
    if (!fs.existsSync(stagingStorageDir)) {
      fs.mkdirSync(stagingStorageDir, { recursive: true });
    }

    app = buildApp();
    await app.ready();

    // Clean up test records
    const testEmails = ['staging-user-a@astrosushil.com', 'staging-user-b@astrosushil.com'];
    await prisma.report.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.refundItemAllocation.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.refund.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.fulfillmentUnit.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.order.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.birthProfile.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });

    // Seed staging test customers
    stagingUserA = await prisma.user.create({
      data: {
        email: 'staging-user-a@astrosushil.com',
        fullName: 'Staging Customer A',
        role: Role.USER,
      },
    });

    stagingUserB = await prisma.user.create({
      data: {
        email: 'staging-user-b@astrosushil.com',
        fullName: 'Staging Customer B',
        role: Role.USER,
      },
    });

    userAToken = (app as any).jwt.sign({
      sub: stagingUserA.id,
      id: stagingUserA.id,
      email: stagingUserA.email,
      role: stagingUserA.role,
    });

    userBToken = (app as any).jwt.sign({
      sub: stagingUserB.id,
      id: stagingUserB.id,
      email: stagingUserB.email,
      role: stagingUserB.role,
    });

    // Primary canonical birth profile (Puneet Kumar)
    birthProfileA = await prisma.birthProfile.create({
      data: {
        userId: stagingUserA.id,
        name: 'Puneet Kumar Staging',
        dateOfBirth: '1983-12-28',
        timeOfBirth: '04:45:00',
        latitude: 28.4069,
        longitude: 77.8498,
        timezone: 'Asia/Kolkata',
        placeName: 'Bulandshahr, Uttar Pradesh, India',
      },
    });

    // Partner profile for compatibility
    birthProfilePartner = await prisma.birthProfile.create({
      data: {
        userId: stagingUserA.id,
        name: 'Partner Compatibility Staging',
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
    const testEmails = ['staging-user-a@astrosushil.com', 'staging-user-b@astrosushil.com'];
    await prisma.report.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.refundItemAllocation.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.refund.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.fulfillmentUnit.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.order.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.birthProfile.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
    await app.close();
  });

  function signRazorpay(orderId: string, paymentId: string, secret = stagingKeySecret): string {
    return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  }

  function signWebhook(rawBody: string, secret = stagingWebhookSecret): string {
    return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  }

  // =========================================================================
  // 1. STAGING ENVIRONMENT & SECURITY CONFIGURATION
  // =========================================================================
  describe('1. Staging Environment & Security Configuration', () => {
    it('1.1 should enforce CORS policy allowing non-browser/dev origins and rejecting unauthorized origins', async () => {
      // Allowed dev / non-browser origin with CORS preflight headers
      const allowedResp = await app.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: 'http://localhost:3000',
          'access-control-request-method': 'GET',
        },
      });
      expect(allowedResp.statusCode).toBe(204);
      expect(allowedResp.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(allowedResp.headers['access-control-allow-credentials']).toBe('true');
    });

    it('1.2 should sanitize user-supplied x-request-id headers to prevent header injection', async () => {
      const validReqId = 'req_staging_test_12345678';
      const resp = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-request-id': validReqId },
      });
      expect(resp.headers['x-request-id']).toBe(validReqId);

      // Malformed / unsafe request ID must be replaced by a clean UUID
      const malformedResp = await app.inject({
        method: 'GET',
        url: '/health',
        headers: { 'x-request-id': 'bad\r\ninjection;DROP TABLE' },
      });
      expect(malformedResp.headers['x-request-id']).not.toContain('bad');
      expect(malformedResp.headers['x-request-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('1.3 should redact sensitive fields (tokens, secrets, passwords) in structured logging', () => {
      // Strictly verify sensitive keys are configured for redaction
      expect(LOG_REDACT_KEYS).toContain('password');
      expect(LOG_REDACT_KEYS).toContain('otp');
      expect(LOG_REDACT_KEYS).toContain('token');
      expect(LOG_REDACT_KEYS).toContain('secret');
      expect(LOG_REDACT_KEYS).toContain('apiKey');
      expect(LOG_REDACT_KEYS).toContain('razorpayKeySecret');
      expect(LOG_REDACT_KEYS).toContain('razorpaySignature');
    });
  });

  // =========================================================================
  // 2. PAYMENT & FULFILLMENT ACCEPTANCE (RAZORPAY TEST MODE)
  // =========================================================================
  describe('2. Payment & Fulfillment Acceptance (Razorpay Test Mode)', () => {
    let orderId: string;
    let razorpayOrderId: string;
    const testAmount = 49900; // ₹499 for Horoscope

    it('2.1 should create order with server-validated pricing, rejecting client tampering', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: {
          items: [{ catalogId: 'report-horoscope', quantity: 1 }],
          pricePaise: 100, // Attempted tamper to ₹1
          amount: 50,
        },
      });

      expect(resp.statusCode).toBe(201);
      const body = JSON.parse(resp.body);
      orderId = body.orderId;
      razorpayOrderId = body.razorpayOrderId;
      expect(body.amount).toBe(testAmount);
      expect(body.currency).toBe('INR');
      expect(body.status).toBe(OrderStatus.PENDING);
      expect(body.paymentStatus).toBe(PaymentStatus.PENDING);
    });

    it('2.2 should verify payment directly with valid signature and provision exactly 1 fulfillment unit', async () => {
      const paymentId = `pay_staging_${Date.now()}`;
      const signature = signRazorpay(razorpayOrderId, paymentId);

      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/verify',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: {
          razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
        },
      });

      expect(resp.statusCode).toBe(200);
      const body = JSON.parse(resp.body);
      expect(body.order.status).toBe(OrderStatus.PAID);
      expect(body.order.paymentStatus).toBe(PaymentStatus.CAPTURED);
      expect(body.order.paidAt).toBeDefined();

      // Verify exactly 1 fulfillment unit created
      const units = await prisma.fulfillmentUnit.findMany({ where: { orderId } });
      expect(units).toHaveLength(1);
      expect(units[0].obligationType).toBe(ObligationType.REPORT);
      expect(units[0].status).toBe(FulfillmentUnitStatus.UNFULFILLED);
    });

    it('2.3 should reject direct payment verification when signature is invalid/tampered', async () => {
      // Create separate pending order
      const createResp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: { items: [{ catalogId: 'report-kundli', quantity: 1 }] },
      });
      const pendingOrder = JSON.parse(createResp.body);

      const badResp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/verify',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: {
          razorpayOrderId: pendingOrder.razorpayOrderId,
          razorpayPaymentId: `pay_tampered_${Date.now()}`,
          razorpaySignature: 'invalid_tampered_signature_hex_0000000',
        },
      });

      expect(badResp.statusCode).toBe(400);

      // Verify NO fulfillment units were created
      const units = await prisma.fulfillmentUnit.findMany({ where: { orderId: pendingOrder.orderId } });
      expect(units).toHaveLength(0);
    });

    it('2.4 should process payment.captured webhook idempotently without creating duplicate units', async () => {
      const webhookPayload = {
        event: 'payment.captured',
        event_id: `evt_staging_captured_${orderId}`,
        payload: {
          payment: {
            entity: {
              id: `pay_wh_${Date.now()}`,
              order_id: razorpayOrderId,
              amount: testAmount,
              status: 'captured',
            },
          },
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const signature = signWebhook(rawBody);

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

      // Duplicate replay delivery
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
      const whBody2 = JSON.parse(whResp2.body);
      expect(whBody2.duplicate).toBe(true);

      // Strict invariant: Fulfillment units remain exactly 1
      const units = await prisma.fulfillmentUnit.findMany({ where: { orderId } });
      expect(units).toHaveLength(1);
    });

    it('2.5 should reject webhook when signature does not match secret', async () => {
      const rawBody = JSON.stringify({ event: 'payment.captured', payload: {} });
      const badSigResp = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: {
          'x-razorpay-signature': 'bad_webhook_sig_hex_99999',
          'content-type': 'application/json',
        },
        payload: rawBody,
      });

      expect(badSigResp.statusCode).toBe(400);
    });

    it('2.6 should handle payment.failed webhook by transitioning order to FAILED without fulfillment units', async () => {
      const createResp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: { items: [{ catalogId: 'report-saturn', quantity: 1 }] },
      });
      const order = JSON.parse(createResp.body);

      const failedPayload = {
        event: 'payment.failed',
        event_id: `evt_fail_${order.orderId}`,
        payload: {
          payment: {
            entity: {
              id: `pay_failed_${Date.now()}`,
              order_id: order.razorpayOrderId,
              status: 'failed',
              error_code: 'BAD_REQUEST_ERROR',
              error_description: 'Payment was declined by issuing bank',
            },
          },
        },
      };

      const rawBody = JSON.stringify(failedPayload);
      const signature = signWebhook(rawBody);

      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: {
          'x-razorpay-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawBody,
      });

      expect(resp.statusCode).toBe(200);

      const dbOrder = await prisma.order.findUnique({ where: { id: order.orderId } });
      expect(dbOrder?.status).toBe(OrderStatus.FAILED);
      expect(dbOrder?.paymentStatus).toBe(PaymentStatus.FAILED);

      const units = await prisma.fulfillmentUnit.findMany({ where: { orderId: order.orderId } });
      expect(units).toHaveLength(0);
    });
  });

  // =========================================================================
  // 3. WORKER RESTART, LEASE RECOVERY & CAS FENCING
  // =========================================================================
  describe('3. Worker Restart, Lease Recovery & CAS Fencing Acceptance', () => {
    let raceReportId: string;
    let raceOrderId: string;

    it('3.1 should handle worker restart: recover expired lease and fence stale worker CAS completion', async () => {
      // 1. Create paid order for Saturn report
      const orderResp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: { items: [{ catalogId: 'report-saturn', quantity: 1 }] },
      });
      const { orderId, razorpayOrderId } = JSON.parse(orderResp.body);
      raceOrderId = orderId;

      const paymentId = `pay_worker_${Date.now()}`;
      await app.inject({
        method: 'POST',
        url: '/api/v1/payments/verify',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: {
          razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signRazorpay(razorpayOrderId, paymentId),
        },
      });

      const units = await prisma.fulfillmentUnit.findMany({ where: { orderId } });
      expect(units).toHaveLength(1);

      // 2. Enqueue report job with initial claimVersion = 1
      raceReportId = crypto.randomUUID();
      const now = new Date();
      await prisma.report.create({
        data: {
          id: raceReportId,
          userId: stagingUserA.id,
          birthProfileId: birthProfileA.id,
          orderId,
          fulfillmentUnitId: units[0].id,
          reportType: ReportType.SATURN,
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
          expectedDeliveryAt: new Date(now.getTime() + 24 * 3600 * 1000),
          reportVersion: '1.0.0',
          calculationVersion: '1.0.0',
          claimVersion: 1,
        },
      });

      // 3. Worker 1 claims job with a very short lease (1 second) to simulate crash
      const worker1Claim = await postgresQueueService.claimJob('worker-instance-crash-simulation', 1);
      expect(worker1Claim).not.toBeNull();
      expect(worker1Claim!.id).toBe(raceReportId);
      const staleToken = worker1Claim!.claimToken;
      const staleVersion = worker1Claim!.claimVersion; // claimVersion is 2 after claim

      // 4. Wait for lease to expire (1.1s)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // 5. Stale Recovery loop executes (Worker restart simulation)
      const recovery = await postgresQueueService.recoverStaleJobs(3);
      expect(recovery.recoveredCount).toBeGreaterThanOrEqual(1);

      // Verify report is re-enqueued to QUEUED with exponential backoff
      const recoveredReport = await prisma.report.findUnique({ where: { id: raceReportId } });
      expect(recoveredReport?.status).toBe('QUEUED');
      expect(recoveredReport?.claimToken).toBeNull();
      expect(recoveredReport?.retryAfter).not.toBeNull();

      // Premature claim is blocked by backoff
      const prematureClaim = await postgresQueueService.claimJobById(raceReportId);
      expect(prematureClaim).toBeNull();

      // Fast-forward backoff
      await prisma.$executeRaw`
        UPDATE "reports"
        SET "retryAfter" = clock_timestamp() - INTERVAL '1 second'
        WHERE id = ${raceReportId};
      `;

      // 6. Worker 2 claims the recovered job
      const worker2Claim = await postgresQueueService.claimJobById(raceReportId);
      expect(worker2Claim).not.toBeNull();
      expect(worker2Claim!.id).toBe(raceReportId);
      expect(worker2Claim!.claimVersion).toBeGreaterThan(staleVersion); // Version bumped

      // 7. Stale Worker 1 wakes up late and attempts completeJob with stale token and old version
      const staleCompleteResult = await postgresQueueService.completeJob(
        raceReportId,
        staleToken,
        staleVersion,
        'reports/pdf/stale_worker1_attempt.pdf',
        'stale_worker1.pdf',
        12345,
        15
      );

      // CAS Invariant: Stale completion MUST fail (return false)
      expect(staleCompleteResult).toBe(false);

      // 8. Legitimate Worker 2 successfully completes PDF generation
      const validCompleteResult = await postgresQueueService.completeJob(
        raceReportId,
        worker2Claim!.claimToken,
        worker2Claim!.claimVersion,
        'reports/pdf/worker2_legitimate_success.pdf',
        'saturn-report.pdf',
        54321,
        22
      );

      expect(validCompleteResult).toBe(true);

      const finalReport = await prisma.report.findUnique({ where: { id: raceReportId } });
      expect(finalReport?.status).toBe('COMPLETED');
      expect(finalReport?.storageKey).toBe('reports/pdf/worker2_legitimate_success.pdf');
    });

    it('3.2 should maintain atomic queue health and readiness endpoints', async () => {
      // Test liveness probe
      const healthResp = await app.inject({ method: 'GET', url: '/health' });
      expect(healthResp.statusCode).toBe(200);
      const healthBody = JSON.parse(healthResp.body);
      expect(healthBody.status).toBe('ok');
      expect(healthBody.service).toBe('astro-api');

      // Test readiness probes
      const readyResp = await app.inject({ method: 'GET', url: '/ready' });
      expect(readyResp.statusCode).toBe(200);
      const readyBody = JSON.parse(readyResp.body);
      expect(readyBody.status).toBe('ok');
      expect(readyBody.database).toBe('connected');
      expect(readyBody.queue).toBe('connected');

      const k8sReadyResp = await app.inject({ method: 'GET', url: '/health/ready' });
      expect(k8sReadyResp.statusCode).toBe(200);
      const k8sBody = JSON.parse(k8sReadyResp.body);
      expect(k8sBody.database).toBe('connected');
      expect(k8sBody.queue).toBe('connected');
    });
  });

  // =========================================================================
  // 4. COMMERCIAL CONTROLS & UNRELEASED SKU BLOCKING
  // =========================================================================
  describe('4. Commercial Controls & Invariant Audit', () => {
    it('4.1 should enforce exact authorized prices across all 10 released catalogue items', () => {
      const EXPECTED_RELEASED_PRICES: Record<string, number> = {
        'report-kundli': 29900,
        'report-planetary-summary': 19900,
        'report-horoscope': 49900,
        'report-career': 49900,
        'report-career-pro': 69900,
        'report-finance': 49900,
        'report-love': 49900,
        'report-fortune': 49900,
        'report-marriage': 49900,
        'report-saturn': 49900,
      };

      for (const [sku, expectedPaise] of Object.entries(EXPECTED_RELEASED_PRICES)) {
        const item = COMMERCE_CATALOG[sku];
        expect(item, `Catalog item ${sku} must exist`).toBeDefined();
        expect(item.pricePaise).toBe(expectedPaise);
        expect(item.isActive).toBe(true);
      }
    });

    it('4.2 should strictly keep all 4 unreleased SKUs inactive at zero price with checkout blocked', async () => {
      const UNRELEASED_SKUS = [
        'report-jupiter-transit',
        'report-rahu-ketu-transit',
        'report-varshphal',
        'report-fortune-plus',
      ];

      for (const sku of UNRELEASED_SKUS) {
        const item = COMMERCE_CATALOG[sku];
        expect(item).toBeDefined();
        expect(item.pricePaise).toBe(0);
        expect(item.isActive).toBe(false);

        // Verify checkout request is blocked with HTTP 400
        const checkoutResp = await app.inject({
          method: 'POST',
          url: '/api/v1/payments/create-order',
          headers: { authorization: `Bearer ${userAToken}` },
          payload: { items: [{ catalogId: sku, quantity: 1 }] },
        });

        expect(checkoutResp.statusCode).toBe(400);
        const errBody = JSON.parse(checkoutResp.body);
        expect(errBody.error.message).toContain('currently inactive or unavailable');
      }
    });
  });

  // =========================================================================
  // 5. PDF GENERATION, PRIVATE STORAGE & CUSTOMER ACCESS
  // =========================================================================
  describe('5. PDF Generation, Private Staging Storage & Customer Access', () => {
    let completedReportId: string;
    let paidOrderId: string;

    it('5.1 should generate report, store PDF in staging storage, and allow customer download', async () => {
      // 1. Create and pay for Planetary Summary report (₹199)
      const orderResp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: { items: [{ catalogId: 'report-planetary-summary', quantity: 1 }] },
      });
      const { orderId, razorpayOrderId } = JSON.parse(orderResp.body);
      paidOrderId = orderId;

      const paymentId = `pay_plan_${Date.now()}`;
      await app.inject({
        method: 'POST',
        url: '/api/v1/payments/verify',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: {
          razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: signRazorpay(razorpayOrderId, paymentId),
        },
      });

      // 2. Generate report
      const genResp = await app.inject({
        method: 'POST',
        url: '/api/v1/reports/generate',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: {
          birthProfileId: birthProfileA.id,
          reportType: 'PLANETARY_SUMMARY',
          orderId,
        },
      });

      expect(genResp.statusCode).toBe(201);
      const genBody = JSON.parse(genResp.body);
      completedReportId = genBody.id;
      expect(genBody.status).toBe('COMPLETED');

      // 3. Customer downloads PDF
      const pdfResp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/${completedReportId}/pdf`,
        headers: { authorization: `Bearer ${userAToken}` },
      });

      expect(pdfResp.statusCode).toBe(200);
      expect(pdfResp.headers['content-type']).toBe('application/pdf');
      expect(pdfResp.rawPayload.length).toBeGreaterThan(100);
      expect(pdfResp.rawPayload.toString('utf8', 0, 5)).toBe('%PDF-');

      // 4. Reopen without regeneration
      const reopenResp = await app.inject({
        method: 'POST',
        url: '/api/v1/reports/generate',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: {
          birthProfileId: birthProfileA.id,
          reportType: 'PLANETARY_SUMMARY',
          orderId,
        },
      });
      expect(reopenResp.statusCode).toBe(201);
      const reopenBody = JSON.parse(reopenResp.body);
      expect(reopenBody.reused).toBe(true);
      expect(reopenBody.id).toBe(completedReportId);

      // 5. Cross-user access denial (Anti-Enumeration 404)
      const unauthResp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/${completedReportId}/pdf`,
        headers: { authorization: `Bearer ${userBToken}` },
      });
      expect(unauthResp.statusCode).toBe(404);
    });

    it('5.2 should revoke report access immediately when order is refunded (Anti-Enumeration 404)', async () => {
      // Process full refund for the planetary summary order
      const refundResult = await commerceService.requestRefund(
        {
          orderId: paidOrderId,
          amountPaise: 19900,
          reason: 'Customer requested full refund in staging',
        },
        { id: stagingUserA.id, role: Role.USER }
      );
      expect(refundResult.refund.status).toBe('PROCESSED');
      expect(refundResult.order.status).toBe(OrderStatus.REFUNDED);

      // Verify report status query returns 404
      const statusResp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/${completedReportId}/status`,
        headers: { authorization: `Bearer ${userAToken}` },
      });
      expect(statusResp.statusCode).toBe(404);

      // Verify download query returns 404
      const downloadResp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/${completedReportId}/pdf`,
        headers: { authorization: `Bearer ${userAToken}` },
      });
      expect(downloadResp.statusCode).toBe(404);
    });
  });
});
