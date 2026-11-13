import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { paymentService } from '../../src/services/payment.service';
import { commerceCatalog } from '../../src/modules/commerce/commerce.catalog';
import { commerceService } from '../../src/modules/commerce/commerce.service';
import {
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  Role,
  ReportType,
  OrderItemType,
  FulfillmentStatus,
  FulfillmentUnitStatus,
} from '@prisma/client';

describe('Phase 10B: Payment, Fulfillment and Customer Access Security Audit', () => {
  let app: FastifyInstance;

  const testKeySecret = 'test_webhook_and_checkout_secret_phase10b';
  let customerA: any;
  let customerB: any;
  let customerAToken: string;
  let customerBToken: string;
  let birthProfileA: any;
  let birthProfileB: any;

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_SECRET = testKeySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = testKeySecret;

    app = buildApp();
    await app.ready();

    // Clean up test records
    const testEmails = ['customer-a-p10b@test.com', 'customer-b-p10b@test.com'];
    await prisma.report.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.refundItemAllocation.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.refund.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.fulfillmentUnit.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.order.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.birthProfile.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });

    customerA = await prisma.user.create({
      data: {
        email: 'customer-a-p10b@test.com',
        fullName: 'Phase 10B Customer A',
        role: Role.USER,
      },
    });

    customerB = await prisma.user.create({
      data: {
        email: 'customer-b-p10b@test.com',
        fullName: 'Phase 10B Customer B',
        role: Role.USER,
      },
    });

    customerAToken = (app as any).jwt.sign({
      sub: customerA.id,
      id: customerA.id,
      email: customerA.email,
      role: customerA.role,
    });

    customerBToken = (app as any).jwt.sign({
      sub: customerB.id,
      id: customerB.id,
      email: customerB.email,
      role: customerB.role,
    });

    birthProfileA = await prisma.birthProfile.create({
      data: {
        userId: customerA.id,
        name: 'Puneet Kumar Profile',
        dateOfBirth: '1983-12-28',
        timeOfBirth: '04:45:00',
        latitude: 28.4069,
        longitude: 77.8498,
        timezone: 'Asia/Kolkata',
        placeName: 'Bulandshahr, Uttar Pradesh, India',
      },
    });

    birthProfileB = await prisma.birthProfile.create({
      data: {
        userId: customerB.id,
        name: 'Customer B Profile',
        dateOfBirth: '1990-01-15',
        timeOfBirth: '10:30:00',
        latitude: 19.0760,
        longitude: 72.8777,
        timezone: 'Asia/Kolkata',
        placeName: 'Mumbai, Maharashtra, India',
      },
    });
  });

  afterAll(async () => {
    const testEmails = ['customer-a-p10b@test.com', 'customer-b-p10b@test.com'];
    await prisma.report.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.refundItemAllocation.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.refund.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.fulfillmentUnit.deleteMany({ where: { order: { user: { email: { in: testEmails } } } } });
    await prisma.order.deleteMany({ where: { user: { email: { in: testEmails } } } });
    await prisma.birthProfile.deleteMany({ where: { userId: { in: [customerA.id, customerB.id] } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
    await app.close();
  });

  // Helper to construct HMAC-signed webhook payloads
  function createSignedWebhook(event: string, payloadData: any) {
    const eventId = `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const fullPayload = {
      entity: 'event',
      account_id: 'acc_test_10b',
      event,
      contains: ['payment'],
      payload: payloadData,
      created_at: Math.floor(Date.now() / 1000),
      event_id: eventId,
    };
    const rawBody = JSON.stringify(fullPayload);
    const signature = crypto
      .createHmac('sha256', testKeySecret)
      .update(rawBody)
      .digest('hex');

    return { rawBody, signature, eventId };
  }

  // =========================================================================
  // 1. PAYMENT WEBHOOK SECURITY
  // =========================================================================
  describe('1. Payment Webhook Security & Tamper Resistance', () => {
    it('should reject webhook requests with missing x-razorpay-signature', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: { 'content-type': 'application/json' },
        payload: { event: 'payment.captured' },
      });

      expect(resp.statusCode).toBe(400);
      const body = JSON.parse(resp.body);
      expect(body.error.code).toBe('WEBHOOK_SIGNATURE_MISSING');
    });

    it('should reject webhook requests with forged or invalid signature', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: {
          'x-razorpay-signature': 'forged_deadbeef_signature',
          'content-type': 'application/json',
        },
        payload: { event: 'payment.captured' },
      });

      expect(resp.statusCode).toBe(400);
      const body = JSON.parse(resp.body);
      expect(body.error.code).toBe('WEBHOOK_SIGNATURE_INVALID');
    });

    it('should reject malformed webhook payloads lacking event field', async () => {
      const rawBody = JSON.stringify({ invalidStructure: true });
      const signature = crypto.createHmac('sha256', testKeySecret).update(rawBody).digest('hex');

      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: {
          'x-razorpay-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawBody,
      });

      expect(resp.statusCode).toBe(400);
      const body = JSON.parse(resp.body);
      expect(body.error.code).toBe('INVALID_PAYLOAD');
    });

    it('should reject payment.captured event if captured amount mismatches persisted order amount', async () => {
      // Create order for ₹499 (49,900 paise)
      const rzOrderId = `order_tamper_amt_${Date.now()}`;
      const order = await prisma.order.create({
        data: {
          userId: customerA.id,
          razorpayOrderId: rzOrderId,
          amount: 49900,
          currency: 'INR',
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          reportType: ReportType.FORTUNE,
          items: {
            create: [
              {
                catalogId: 'report-fortune',
                itemType: OrderItemType.REPORT,
                title: 'Personalised Fortune Report',
                unitPrice: 49900,
                quantity: 1,
                totalAmount: 49900,
              },
            ],
          },
        },
      });

      // Attacker attempts to capture only ₹100 (10,000 paise)
      const { rawBody, signature } = createSignedWebhook('payment.captured', {
        payment: {
          entity: {
            id: `pay_tamper_${Date.now()}`,
            order_id: rzOrderId,
            amount: 10000, // Mismatched! Expected 49900
            currency: 'INR',
            status: 'captured',
          },
        },
      });

      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: {
          'x-razorpay-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawBody,
      });

      expect(resp.statusCode).toBe(400);
      const body = JSON.parse(resp.body);
      expect(body.error.code).toBe('PAYMENT_AMOUNT_MISMATCH');

      // Verify order remains PENDING and NO fulfillment units were provisioned
      const freshOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { fulfillmentUnits: true },
      });
      expect(freshOrder?.status).toBe(OrderStatus.PENDING);
      expect(freshOrder?.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(freshOrder?.fulfillmentUnits).toHaveLength(0);
    });

    it('should reject payment.captured event if captured currency mismatches persisted order currency', async () => {
      const rzOrderId = `order_tamper_curr_${Date.now()}`;
      const order = await prisma.order.create({
        data: {
          userId: customerA.id,
          razorpayOrderId: rzOrderId,
          amount: 49900,
          currency: 'INR',
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          reportType: ReportType.SATURN,
          items: {
            create: [
              {
                catalogId: 'report-saturn',
                itemType: OrderItemType.REPORT,
                title: 'Saturn in Your Birth Chart',
                unitPrice: 49900,
                quantity: 1,
                totalAmount: 49900,
              },
            ],
          },
        },
      });

      // Tampered currency (USD instead of INR)
      const { rawBody, signature } = createSignedWebhook('payment.captured', {
        payment: {
          entity: {
            id: `pay_curr_${Date.now()}`,
            order_id: rzOrderId,
            amount: 49900,
            currency: 'USD',
            status: 'captured',
          },
        },
      });

      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: {
          'x-razorpay-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawBody,
      });

      expect(resp.statusCode).toBe(400);
      const body = JSON.parse(resp.body);
      expect(body.error.code).toBe('PAYMENT_CURRENCY_MISMATCH');

      const freshOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(freshOrder?.status).toBe(OrderStatus.PENDING);
    });

    it('should prevent out-of-order payment.failed event from corrupting a PAID order', async () => {
      const rzOrderId = `order_out_of_order_${Date.now()}`;
      const order = await prisma.order.create({
        data: {
          userId: customerA.id,
          razorpayOrderId: rzOrderId,
          amount: 49900,
          currency: 'INR',
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.CAPTURED,
          paidAt: new Date(),
          reportType: ReportType.HOROSCOPE,
          items: {
            create: [
              {
                catalogId: 'report-horoscope',
                itemType: OrderItemType.REPORT,
                title: 'Personalised Horoscope',
                unitPrice: 49900,
                quantity: 1,
                totalAmount: 49900,
              },
            ],
          },
        },
      });

      // Out-of-order payment.failed webhook arrives after order is already PAID
      const { rawBody, signature } = createSignedWebhook('payment.failed', {
        payment: {
          entity: {
            id: `pay_failed_${Date.now()}`,
            order_id: rzOrderId,
            amount: 49900,
            status: 'failed',
          },
        },
      });

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

      // Verify order status was NOT downgraded to FAILED
      const freshOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(freshOrder?.status).toBe(OrderStatus.PAID);
      expect(freshOrder?.paymentStatus).toBe(PaymentStatus.CAPTURED);
    });

    it('should prevent payment.captured from resurrecting a CANCELLED or REFUNDED order', async () => {
      const rzOrderId = `order_cancelled_${Date.now()}`;
      const order = await prisma.order.create({
        data: {
          userId: customerA.id,
          razorpayOrderId: rzOrderId,
          amount: 49900,
          currency: 'INR',
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
          reportType: ReportType.LOVE,
        },
      });

      const { rawBody, signature } = createSignedWebhook('payment.captured', {
        payment: {
          entity: {
            id: `pay_late_${Date.now()}`,
            order_id: rzOrderId,
            amount: 49900,
            currency: 'INR',
            status: 'captured',
          },
        },
      });

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
      const freshOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(freshOrder?.status).toBe(OrderStatus.CANCELLED);
    });
  });

  // =========================================================================
  // 2. DUAL-PATH PAYMENT VERIFICATION & CONVERGENCE
  // =========================================================================
  describe('2. Dual-Path Payment Verification (Webhook & Direct Verify)', () => {
    it('should converge idempotently when Webhook processes FIRST, then Direct Verify occurs', async () => {
      const rzOrderId = `order_dual_wh_first_${Date.now()}`;
      const rzPaymentId = `pay_dual_1_${Date.now()}`;

      const order = await prisma.order.create({
        data: {
          userId: customerA.id,
          razorpayOrderId: rzOrderId,
          amount: 49900,
          currency: 'INR',
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          reportType: ReportType.CAREER,
          items: {
            create: [
              {
                catalogId: 'report-career',
                itemType: OrderItemType.REPORT,
                title: 'Comprehensive Career Dossier',
                unitPrice: 49900,
                quantity: 1,
                totalAmount: 49900,
              },
            ],
          },
        },
      });

      // 1. Path A: Webhook arrives first
      const { rawBody, signature } = createSignedWebhook('payment.captured', {
        payment: {
          entity: {
            id: rzPaymentId,
            order_id: rzOrderId,
            amount: 49900,
            currency: 'INR',
            status: 'captured',
          },
        },
      });

      const whResp = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: {
          'x-razorpay-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawBody,
      });
      expect(whResp.statusCode).toBe(200);

      // Verify order moved to PAID and has exactly 1 fulfillment unit
      const orderAfterWh = await prisma.order.findUnique({
        where: { id: order.id },
        include: { fulfillmentUnits: true },
      });
      expect(orderAfterWh?.status).toBe(OrderStatus.PAID);
      expect(orderAfterWh?.fulfillmentUnits).toHaveLength(1);

      // 2. Path B: Direct verify called subsequently by mobile app
      const checkoutSig = crypto
        .createHmac('sha256', testKeySecret)
        .update(`${rzOrderId}|${rzPaymentId}`)
        .digest('hex');

      const directResp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/verify',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          razorpayOrderId: rzOrderId,
          razorpayPaymentId: rzPaymentId,
          razorpaySignature: checkoutSig,
        },
      });

      expect(directResp.statusCode).toBe(200);

      // Convergence proof: Still exactly 1 fulfillment unit
      const finalUnits = await prisma.fulfillmentUnit.findMany({
        where: { orderId: order.id },
      });
      expect(finalUnits).toHaveLength(1);
      expect(finalUnits[0].status).toBe(FulfillmentUnitStatus.UNFULFILLED);
    });

    it('should converge idempotently when Direct Verify processes FIRST, then Webhook arrives', async () => {
      const rzOrderId = `order_dual_direct_first_${Date.now()}`;
      const rzPaymentId = `pay_dual_2_${Date.now()}`;

      const order = await prisma.order.create({
        data: {
          userId: customerA.id,
          razorpayOrderId: rzOrderId,
          amount: 49900,
          currency: 'INR',
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          reportType: ReportType.FINANCE,
          items: {
            create: [
              {
                catalogId: 'report-finance',
                itemType: OrderItemType.REPORT,
                title: 'Financial Astrology Dossier',
                unitPrice: 49900,
                quantity: 1,
                totalAmount: 49900,
              },
            ],
          },
        },
      });

      // 1. Path B: Direct verify occurs first
      const checkoutSig = crypto
        .createHmac('sha256', testKeySecret)
        .update(`${rzOrderId}|${rzPaymentId}`)
        .digest('hex');

      const directResp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/verify',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          razorpayOrderId: rzOrderId,
          razorpayPaymentId: rzPaymentId,
          razorpaySignature: checkoutSig,
        },
      });
      expect(directResp.statusCode).toBe(200);

      const orderAfterDirect = await prisma.order.findUnique({
        where: { id: order.id },
        include: { fulfillmentUnits: true },
      });
      expect(orderAfterDirect?.status).toBe(OrderStatus.PAID);
      expect(orderAfterDirect?.fulfillmentUnits).toHaveLength(1);

      // 2. Path A: Webhook arrives second
      const { rawBody, signature } = createSignedWebhook('payment.captured', {
        payment: {
          entity: {
            id: rzPaymentId,
            order_id: rzOrderId,
            amount: 49900,
            currency: 'INR',
            status: 'captured',
          },
        },
      });

      const whResp = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: {
          'x-razorpay-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawBody,
      });
      expect(whResp.statusCode).toBe(200);

      // Convergence proof: Still exactly 1 fulfillment unit
      const finalUnits = await prisma.fulfillmentUnit.findMany({
        where: { orderId: order.id },
      });
      expect(finalUnits).toHaveLength(1);
    });
  });

  // =========================================================================
  // 3. PRICE AND ORDER INTEGRITY
  // =========================================================================
  describe('3. Price and Order Integrity', () => {
    it('should ignore client-supplied discountAmount and maintain authoritative server price', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          items: [{ catalogId: 'report-love', quantity: 1 }],
          discountAmount: 49800, // Attacker attempts to pay ₹1
          amount: 100,
        },
      });

      expect(resp.statusCode).toBe(201);
      const body = JSON.parse(resp.body);
      expect(body.amount).toBe(49900); // Server calculated ₹499 strictly
    });

    it('should reject non-existent or modified SKU values', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          items: [{ catalogId: 'report-nonexistent-sku-tamper', quantity: 1 }],
        },
      });

      expect(resp.statusCode).toBe(400);
      const body = JSON.parse(resp.body);
      expect(body.error.message).toContain('Catalog offering not found');
    });

    it('should reject purchase of inactive unreleased reports (Jupiter Transit)', async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          items: [{ catalogId: 'report-jupiter-transit', quantity: 1 }],
        },
      });

      expect(resp.statusCode).toBe(400);
      const body = JSON.parse(resp.body);
      expect(body.error.message).toContain('currently inactive or unavailable');
    });

    it('should reject purchase with invalid non-positive or float quantities', async () => {
      // Quantity = 0
      const respZero = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          items: [{ catalogId: 'report-saturn', quantity: 0 }],
        },
      });
      expect(respZero.statusCode).toBe(400);

      // Quantity = -2
      const respNeg = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${customerAToken}` },
        payload: {
          items: [{ catalogId: 'report-saturn', quantity: -2 }],
        },
      });
      expect(respNeg.statusCode).toBe(400);
    });
  });

  // =========================================================================
  // 4. CUSTOMER ACCESS AND REPORT DELIVERY SECURITY
  // =========================================================================
  describe('4. Customer Access Control and Anti-Enumeration', () => {
    let reportAId: string;
    let orderAId: string;

    beforeAll(async () => {
      // Create a completed report for Customer A
      const orderA = await prisma.order.create({
        data: {
          userId: customerA.id,
          razorpayOrderId: `order_cross_a_${Date.now()}`,
          amount: 49900,
          currency: 'INR',
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.CAPTURED,
          paidAt: new Date(Date.now() - 3600000), // Paid 1 hour ago
          reportType: ReportType.FORTUNE,
          items: {
            create: [
              {
                catalogId: 'report-fortune',
                itemType: OrderItemType.REPORT,
                title: 'Personalised Fortune Report',
                unitPrice: 49900,
                quantity: 1,
                totalAmount: 49900,
              },
            ],
          },
        },
      });
      orderAId = orderA.id;

      const reportA = await prisma.report.create({
        data: {
          userId: customerA.id,
          birthProfileId: birthProfileA.id,
          orderId: orderA.id,
          reportType: ReportType.FORTUNE,
          status: 'COMPLETED',
          stage: 'COMPLETED',
          progress: 100,
          storageKey: `reports/${customerA.id}/sample_fortune.pdf`,
          fileName: 'fortune_report.pdf',
          fileSize: 102400,
          pageCount: 27,
          expectedDeliveryAt: new Date(orderA.paidAt!.getTime() + 24 * 60 * 60 * 1000),
          completedAt: new Date(),
        },
      });
      reportAId = reportA.id;
    });

    it('should return 404 Anti-Enumeration when Customer B queries Customer A’s report metadata', async () => {
      const resp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/${reportAId}`,
        headers: { authorization: `Bearer ${customerBToken}` },
      });

      expect(resp.statusCode).toBe(404);
      const body = JSON.parse(resp.body);
      expect(body.error.message).toBe('Report not found');
    });

    it('should return 404 Anti-Enumeration when Customer B polls Customer A’s report status', async () => {
      const resp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/${reportAId}/status`,
        headers: { authorization: `Bearer ${customerBToken}` },
      });

      expect(resp.statusCode).toBe(404);
      const body = JSON.parse(resp.body);
      expect(body.error.message).toBe('Report not found');
    });

    it('should return 404 Anti-Enumeration when Customer B attempts to download Customer A’s PDF', async () => {
      const resp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/${reportAId}/pdf`,
        headers: { authorization: `Bearer ${customerBToken}` },
      });

      expect(resp.statusCode).toBe(404);
    });

    it('should return 404 Anti-Enumeration when Customer B attempts to get download access URL', async () => {
      const resp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/${reportAId}/access`,
        headers: { authorization: `Bearer ${customerBToken}` },
      });

      expect(resp.statusCode).toBe(404);
    });

    it('should reject unauthenticated access to download-secure with 401 Unauthorized', async () => {
      const resp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/download-secure?key=reports/test.pdf&expires=${Date.now() + 60000}&token=forged_token`,
      });

      expect(resp.statusCode).toBe(401);
    });

    it('should reject tampered download-secure signature with 403 Forbidden when authenticated', async () => {
      const resp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/download-secure?key=reports/test.pdf&expires=${Date.now() + 60000}&token=forged_token`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(resp.statusCode).toBe(403);
    });

    it('should preserve 24-hour delivery SLA anchor tied to original payment confirmation', async () => {
      const statusResp = await app.inject({
        method: 'GET',
        url: `/api/v1/reports/${reportAId}/status`,
        headers: { authorization: `Bearer ${customerAToken}` },
      });

      expect(statusResp.statusCode).toBe(200);
      const body = JSON.parse(statusResp.body);
      expect(body.isReady).toBe(true);
      expect(body.expectedDeliveryAt).toBeDefined();

      const order = await prisma.order.findUnique({ where: { id: orderAId } });
      const expectedTime = new Date(order!.paidAt!.getTime() + 24 * 60 * 60 * 1000).toISOString();
      expect(new Date(body.expectedDeliveryAt).toISOString()).toBe(expectedTime);
    });
  });

  // =========================================================================
  // 5. REGENERATION AND REFUND ALLOCATION INTEGRITY
  // =========================================================================
  describe('5. Regeneration and Refund State Transitions', () => {
    it('should prevent over-refunds beyond total order amount', async () => {
      // Customer A has a paid order of 49,900 paise
      const order = await prisma.order.create({
        data: {
          userId: customerA.id,
          razorpayOrderId: `order_refund_test_${Date.now()}`,
          razorpayPaymentId: `pay_refund_test_${Date.now()}`,
          amount: 49900,
          currency: 'INR',
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.CAPTURED,
          paidAt: new Date(),
          items: {
            create: [
              {
                catalogId: 'report-saturn',
                itemType: OrderItemType.REPORT,
                title: 'Saturn Report',
                unitPrice: 49900,
                quantity: 1,
                totalAmount: 49900,
              },
            ],
          },
        },
      });

      // Attempt to refund 50,000 paise (more than 49,900)
      await expect(
        commerceService.requestRefund(
          {
            orderId: order.id,
            amountPaise: 50000,
            reason: 'Tampered over-refund request',
          },
          customerA
        )
      ).rejects.toThrow('exceeds maximum refundable balance');
    });

    it('should cancel unfulfilled units and reconcile status on full refund', async () => {
      const order = await prisma.order.create({
        data: {
          userId: customerA.id,
          razorpayOrderId: `order_full_ref_${Date.now()}`,
          razorpayPaymentId: `pay_full_ref_${Date.now()}`,
          amount: 49900,
          currency: 'INR',
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.CAPTURED,
          paidAt: new Date(),
          items: {
            create: [
              {
                catalogId: 'report-saturn',
                itemType: OrderItemType.REPORT,
                title: 'Saturn Report',
                unitPrice: 49900,
                quantity: 1,
                totalAmount: 49900,
              },
            ],
          },
        },
      });

      // Provision unfulfilled unit
      await prisma.fulfillmentUnit.create({
        data: {
          orderId: order.id,
          orderItemId: (await prisma.orderItem.findFirst({ where: { orderId: order.id } }))!.id,
          obligationType: 'REPORT',
          unitIndex: 1,
          status: FulfillmentUnitStatus.UNFULFILLED,
        },
      });

      // Process full refund through webhook refund.processed
      const { rawBody, signature } = createSignedWebhook('refund.processed', {
        refund: {
          entity: {
            id: `rfnd_${Date.now()}`,
            payment_id: order.razorpayPaymentId,
            amount: 49900,
            status: 'processed',
          },
        },
      });

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

      // Verify Order is REFUNDED and fulfillment units are CANCELLED
      const freshOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: { fulfillmentUnits: true },
      });

      expect(freshOrder?.status).toBe(OrderStatus.REFUNDED);
      expect(freshOrder?.paymentStatus).toBe(PaymentStatus.REFUNDED);
      expect(freshOrder?.fulfillmentUnits[0].status).toBe(FulfillmentUnitStatus.CANCELLED);
    });

    it('should reject refund allocation that exceeds line item balance', async () => {
      const order = await prisma.order.create({
        data: {
          userId: customerA.id,
          razorpayOrderId: `order_alloc_test_${Date.now()}`,
          razorpayPaymentId: `pay_alloc_test_${Date.now()}`,
          amount: 49900,
          currency: 'INR',
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.CAPTURED,
          paidAt: new Date(),
          items: {
            create: [
              {
                catalogId: 'report-saturn',
                itemType: OrderItemType.REPORT,
                title: 'Saturn Report',
                unitPrice: 49900,
                quantity: 1,
                totalAmount: 49900,
              },
            ],
          },
        },
        include: { items: true },
      });

      const refund = await prisma.refund.create({
        data: {
          orderId: order.id,
          razorpayPaymentId: order.razorpayPaymentId!,
          amount: 49900,
          currency: 'INR',
          status: RefundStatus.PROCESSED,
        },
      });

      // Attempt to allocate 60,000 paise to an item of 49,900 paise
      await expect(
        commerceService.allocateRefundToItem({
          orderId: order.id,
          refundId: refund.id,
          orderItemId: order.items[0].id,
          amountPaise: 60000,
        })
      ).rejects.toThrow('exceeds remaining unallocated refund balance');
    });
  });
});
