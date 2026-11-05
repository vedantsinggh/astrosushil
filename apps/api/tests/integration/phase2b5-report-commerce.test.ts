import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { paymentService } from '../../src/services/payment.service';
import { OrderStatus, PaymentStatus, Role, ReportType } from '@prisma/client';

describe('Phase 2B.5 Task 1: Report Commerce & Razorpay Checkout Integration Tests', () => {
  let app: FastifyInstance;

  const testKeySecret = 'test_razorpay_secret_key_phase2b5';
  let testUser: any;
  let unauthorizedUser: any;
  let unpaidUser: any;
  let userToken: string;
  let unauthorizedToken: string;
  let unpaidToken: string;
  let testBirthProfile: any;
  let unpaidBirthProfile: any;

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_SECRET = testKeySecret;

    app = buildApp();
    await app.ready();

    // Clean up any existing test records
    await prisma.user.deleteMany({
      where: { email: { in: ['user-phase2b5@test.com', 'unauth-phase2b5@test.com', 'unpaid-phase2b5@test.com'] } },
    });

    testUser = await prisma.user.create({
      data: {
        email: 'user-phase2b5@test.com',
        fullName: 'Phase 2B.5 Test User',
        role: Role.USER,
      },
    });

    unauthorizedUser = await prisma.user.create({
      data: {
        email: 'unauth-phase2b5@test.com',
        fullName: 'Phase 2B.5 Unauthorized User',
        role: Role.USER,
      },
    });

    unpaidUser = await prisma.user.create({
      data: {
        email: 'unpaid-phase2b5@test.com',
        fullName: 'Phase 2B.5 Unpaid User',
        role: Role.USER,
      },
    });

    testBirthProfile = await prisma.birthProfile.create({
      data: {
        userId: testUser.id,
        name: 'Phase 2B.5 Profile',
        dateOfBirth: '1990-05-15',
        timeOfBirth: '14:30:00',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
        placeName: 'New Delhi, India',
      },
    });

    unpaidBirthProfile = await prisma.birthProfile.create({
      data: {
        userId: unpaidUser.id,
        name: 'Unpaid Profile',
        dateOfBirth: '1992-07-20',
        timeOfBirth: '10:00:00',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
        placeName: 'New Delhi, India',
      },
    });

    userToken = (app as any).jwt.sign({ sub: testUser.id, role: 'USER' });
    unauthorizedToken = (app as any).jwt.sign({ sub: unauthorizedUser.id, role: 'USER' });
    unpaidToken = (app as any).jwt.sign({ sub: unpaidUser.id, role: 'USER' });
  });

  afterAll(async () => {
    const userIds = [testUser?.id, unauthorizedUser?.id, unpaidUser?.id].filter(Boolean);
    if (userIds.length > 0) {
      await prisma.report.deleteMany({
        where: { userId: { in: userIds } },
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
    }
    await app.close();
  });

  function calculateHmacSignature(orderId: string, paymentId: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  // ===========================================================================
  // 1. Authoritative Order Creation for All 5 Supported SKUs
  // ===========================================================================
  const supportedSkus = [
    { reportType: 'KUNDLI', expectedAmount: 29900 },
    { reportType: 'PLANETARY_SUMMARY', expectedAmount: 19900 },
    { reportType: 'CAREER', expectedAmount: 49900 },
    { reportType: 'MARRIAGE_COMPATIBILITY', expectedAmount: 49900 },
    { reportType: 'CAREER_PROSITY', expectedAmount: 69900 },
  ];

  for (const sku of supportedSkus) {
    it(`1. Creates order with authoritative price for ${sku.reportType}`, async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/create-order',
        headers: { authorization: `Bearer ${userToken}` },
        payload: {
          reportType: sku.reportType,
          idempotencyKey: `idemp_${sku.reportType}_${Date.now()}`,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.orderId).toBeDefined();
      expect(body.razorpayOrderId).toBeDefined();
      expect(body.amount).toBe(sku.expectedAmount);
      expect(body.currency).toBe('INR');
      expect(body.status).toBe('PENDING');
      expect(body.subtotal + body.taxAmount).toBe(body.amount);
    });
  }

  // ===========================================================================
  // 2. Reject Unsupported Report SKUs
  // ===========================================================================
  it('2. Rejects unsupported report SKU generation with 400 REPORT_TYPE_NOT_SUPPORTED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        birthProfileId: testBirthProfile.id,
        reportType: 'CHILDBIRTH_FAMILY',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error?.code).toBe('REPORT_TYPE_NOT_SUPPORTED');
  });

  // ===========================================================================
  // 3. Signature Verification & Tamper Resistance
  // ===========================================================================
  it('3. Rejects invalid checkout signature and transitions order to FAILED', async () => {
    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        reportType: 'KUNDLI',
      },
    });
    const orderBody = JSON.parse(orderRes.payload);

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        razorpayOrderId: orderBody.razorpayOrderId,
        razorpayPaymentId: 'pay_test_tampered',
        razorpaySignature: 'invalid_tampered_signature_1234567890abcdef',
      },
    });

    expect(verifyRes.statusCode).toBe(400);
    const verifyBody = JSON.parse(verifyRes.payload);
    expect(verifyBody.error?.message).toContain('Invalid payment signature');

    // Confirm DB status transitioned to FAILED
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderBody.orderId },
    });
    expect(updatedOrder?.status).toBe(OrderStatus.FAILED);
  });

  it('4. Successfully verifies valid HMAC signature and transitions order to PAID atomically', async () => {
    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        reportType: 'KUNDLI',
      },
    });
    const orderBody = JSON.parse(orderRes.payload);
    const paymentId = `pay_valid_${Date.now()}`;
    const validSignature = calculateHmacSignature(orderBody.razorpayOrderId, paymentId, testKeySecret);

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        razorpayOrderId: orderBody.razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validSignature,
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.payload);
    expect(verifyBody.message).toContain('Payment verified successfully');
    expect(verifyBody.order.status).toBe(OrderStatus.PAID);
    expect(verifyBody.order.paymentStatus).toBe(PaymentStatus.CAPTURED);
  });

  // ===========================================================================
  // 4. Idempotent Verification Replay
  // ===========================================================================
  it('5. Repeated payment verification returns existing paid order cleanly without error or double fulfillment', async () => {
    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        reportType: 'CAREER',
      },
    });
    const orderBody = JSON.parse(orderRes.payload);
    const paymentId = `pay_idemp_${Date.now()}`;
    const validSignature = calculateHmacSignature(orderBody.razorpayOrderId, paymentId, testKeySecret);

    // First verification
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        razorpayOrderId: orderBody.razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validSignature,
      },
    });
    expect(res1.statusCode).toBe(200);

    // Second verification (Replay)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        razorpayOrderId: orderBody.razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: validSignature,
      },
    });
    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.order.status).toBe(OrderStatus.PAID);
  });

  // ===========================================================================
  // 5. Order Status Lookup
  // ===========================================================================
  it('6. Fetches order status by ID with ownership enforcement', async () => {
    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${userToken}` },
      payload: { reportType: 'PLANETARY_SUMMARY' },
    });
    const orderBody = JSON.parse(orderRes.payload);

    // User A can fetch User A's order
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/payments/orders/${orderBody.orderId}`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = JSON.parse(getRes.payload);
    expect(getBody.order.id).toBe(orderBody.orderId);

    // Unauthorized user cannot access User A's order
    const unauthRes = await app.inject({
      method: 'GET',
      url: `/api/v1/payments/orders/${orderBody.orderId}`,
      headers: { authorization: `Bearer ${unauthorizedToken}` },
    });
    expect(unauthRes.statusCode).toBe(404); // 404 to prevent enumeration
  });

  // ===========================================================================
  // 6. Strict Unpaid-Order Security Enforcement
  // ===========================================================================
  it('7. Rejects report generation without an orderId or entitlement with 403 Forbidden', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${unpaidToken}` },
      payload: {
        birthProfileId: unpaidBirthProfile.id,
        reportType: 'KUNDLI',
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error?.message).toMatch(/NO_ACTIVE_ORDER|Payment or entitlement required/);
  });

  it('8. Rejects report generation with an UNPAID (PENDING) order with 403 Forbidden', async () => {
    // Create an order but do not pay/verify it
    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${unpaidToken}` },
      payload: { reportType: 'KUNDLI' },
    });
    const orderBody = JSON.parse(orderRes.payload);

    const reportRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${unpaidToken}` },
      payload: {
        birthProfileId: unpaidBirthProfile.id,
        reportType: 'KUNDLI',
        orderId: orderBody.orderId,
      },
    });

    expect(reportRes.statusCode).toBe(403);
    const body = JSON.parse(reportRes.payload);
    expect(body.error?.message).toMatch(/NO_ACTIVE_ORDER|Payment or entitlement required/);
  });

  it('9. Rejects report generation with another user\'s PAID order with 403 Forbidden', async () => {
    // Unauthorized user creates and pays for an order
    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${unauthorizedToken}` },
      payload: { reportType: 'KUNDLI' },
    });
    const orderBody = JSON.parse(orderRes.payload);
    const payId = `pay_cross_${Date.now()}`;
    const sig = calculateHmacSignature(orderBody.razorpayOrderId, payId, testKeySecret);

    await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: { authorization: `Bearer ${unauthorizedToken}` },
      payload: {
        razorpayOrderId: orderBody.razorpayOrderId,
        razorpayPaymentId: payId,
        razorpaySignature: sig,
      },
    });

    // unpaidUser attempts to use unauthorizedUser's paid order
    const reportRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${unpaidToken}` },
      payload: {
        birthProfileId: unpaidBirthProfile.id,
        reportType: 'KUNDLI',
        orderId: orderBody.orderId,
      },
    });

    expect(reportRes.statusCode).toBe(403);
    const body = JSON.parse(reportRes.payload);
    expect(body.error?.message).toMatch(/NO_ACTIVE_ORDER|Payment or entitlement required/);
  });

  it('10. Rejects report generation with mismatched SKU order with 403 Forbidden', async () => {
    // unpaidUser creates and pays for a PLANETARY_SUMMARY order
    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${unpaidToken}` },
      payload: { reportType: 'PLANETARY_SUMMARY' },
    });
    const orderBody = JSON.parse(orderRes.payload);
    const payId = `pay_mismatch_${Date.now()}`;
    const sig = calculateHmacSignature(orderBody.razorpayOrderId, payId, testKeySecret);

    await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: { authorization: `Bearer ${unpaidToken}` },
      payload: {
        razorpayOrderId: orderBody.razorpayOrderId,
        razorpayPaymentId: payId,
        razorpaySignature: sig,
      },
    });

    // unpaidUser attempts to use PLANETARY_SUMMARY order to generate KUNDLI
    const reportRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${unpaidToken}` },
      payload: {
        birthProfileId: unpaidBirthProfile.id,
        reportType: 'KUNDLI',
        orderId: orderBody.orderId,
      },
    });

    expect(reportRes.statusCode).toBe(403);
    const body = JSON.parse(reportRes.payload);
    expect(body.error?.message).toMatch(/NO_ACTIVE_ORDER|Payment or entitlement required/);
  });

  it('11. Successfully initiates report generation when valid verified PAID order is provided', async () => {
    // Create and verify order for KUNDLI
    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${unpaidToken}` },
      payload: { reportType: 'KUNDLI' },
    });
    const orderBody = JSON.parse(orderRes.payload);
    const payId = `pay_valid_kundli_${Date.now()}`;
    const sig = calculateHmacSignature(orderBody.razorpayOrderId, payId, testKeySecret);

    await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: { authorization: `Bearer ${unpaidToken}` },
      payload: {
        razorpayOrderId: orderBody.razorpayOrderId,
        razorpayPaymentId: payId,
        razorpaySignature: sig,
      },
    });

    const reportRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${unpaidToken}` },
      payload: {
        birthProfileId: unpaidBirthProfile.id,
        reportType: 'KUNDLI',
        orderId: orderBody.orderId,
        async: true,
      },
    });

    expect(reportRes.statusCode).toBe(201);
    const reportBody = JSON.parse(reportRes.payload);
    expect(reportBody.reportId).toBeDefined();
    expect(reportBody.status).toBe('QUEUED');
  });

  // ===========================================================================
  // 7. Consistent Async Report-Job Deduplication Across All SKUs
  // ===========================================================================
  it('12. Reuses active in-progress report for non-career SKU (KUNDLI) and prevents duplicate job enqueueing', async () => {
    // 1. Create an active report record in database with QUEUED status
    const activeKundli = await prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        birthProfileId: testBirthProfile.id,
        reportType: 'KUNDLI',
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 25,
      } as any,
    });

    // 2. Request a new job for KUNDLI while one is active
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: {
        authorization: `Bearer ${(app as any).jwt.sign({ sub: testUser.id, role: 'ADMIN' })}`,
      },
      payload: {
        birthProfileId: testBirthProfile.id,
        reportType: 'KUNDLI',
        async: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.reportId).toBe(activeKundli.id);
    expect(body.reused).toBe(true);
    expect(body.active).toBe(true);
  });

  it('13. Reuses completed report for non-career SKU (PLANETARY_SUMMARY) when profile is unmodified', async () => {
    // 1. Create a completed report record
    const completedPlanetary = await prisma.report.create({
      data: {
        id: crypto.randomUUID(),
        userId: testUser.id,
        birthProfileId: testBirthProfile.id,
        reportType: 'PLANETARY_SUMMARY',
        status: 'COMPLETED',
        createdAt: new Date(Date.now() + 1000), // after profile.updatedAt
        updatedAt: new Date(Date.now() + 1000),
      } as any,
    });

    // 2. Request report generation
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: {
        authorization: `Bearer ${(app as any).jwt.sign({ sub: testUser.id, role: 'ADMIN' })}`,
      },
      payload: {
        birthProfileId: testBirthProfile.id,
        reportType: 'PLANETARY_SUMMARY',
        async: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.reportId).toBe(completedPlanetary.id);
    expect(body.status).toBe('COMPLETED');
    expect(body.reused).toBe(true);
  });

  it('14. Concurrent in-flight report requests await same execution promise and return identical reportId', async () => {
    const adminToken = (app as any).jwt.sign({ sub: testUser.id, role: 'ADMIN' });

    // Send two concurrent generation requests simultaneously
    const [resA, resB] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          birthProfileId: testBirthProfile.id,
          reportType: 'CAREER_PROSITY',
          async: true,
        },
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/reports',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          birthProfileId: testBirthProfile.id,
          reportType: 'CAREER_PROSITY',
          async: true,
        },
      }),
    ]);

    expect(resA.statusCode).toBe(201);
    expect(resB.statusCode).toBe(201);
    const bodyA = JSON.parse(resA.payload);
    const bodyB = JSON.parse(resB.payload);

    // Both concurrent requests must have resolved to the EXACT same reportId
    expect(bodyA.reportId).toBe(bodyB.reportId);
  });
});
