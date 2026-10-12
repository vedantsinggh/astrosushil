import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { paymentService } from '../../src/services/payment.service';
import { commerceCatalog } from '../../src/modules/commerce/commerce.catalog';
import { config } from '../../src/config';
import { OrderStatus, PaymentStatus, RefundStatus, Role } from '@prisma/client';

describe('Phase 3 Unified Commerce, Database & Payment Foundation Tests', () => {
  let app: FastifyInstance;

  const testKeySecret = 'test_razorpay_secret_key_1234567890';
  const testWebhookSecret = 'test_webhook_secret_key_0987654321';

  let userA: any;
  let userB: any;
  let adminUser: any;

  let tokenUserA: string;
  let tokenUserB: string;
  let tokenAdmin: string;

  beforeAll(async () => {
    // Set test secrets for signature HMAC calculations
    process.env.RAZORPAY_KEY_SECRET = testKeySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;

    app = buildApp();
    await app.ready();

    // Clean up any existing test users
    await prisma.user.deleteMany({
      where: { email: { in: ['user-a-comm@test.com', 'user-b-comm@test.com', 'admin-comm@test.com'] } },
    });

    // Create persistent test users in database
    userA = await prisma.user.create({
      data: {
        email: 'user-a-comm@test.com',
        fullName: 'Commerce Test User A',
        role: Role.USER,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: 'user-b-comm@test.com',
        fullName: 'Commerce Test User B',
        role: Role.USER,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: 'admin-comm@test.com',
        fullName: 'Commerce Admin User',
        role: Role.SUPER_ADMIN,
      },
    });

    tokenUserA = (app as any).jwt.sign({ sub: userA.id, role: 'USER' });
    tokenUserB = (app as any).jwt.sign({ sub: userB.id, role: 'USER' });
    tokenAdmin = (app as any).jwt.sign({ sub: adminUser.id, role: 'SUPER_ADMIN', email: adminUser.email });
  });

  afterAll(async () => {
    // Cleanup created data
    if (userA && userB && adminUser) {
      await prisma.order.deleteMany({
        where: { userId: { in: [userA.id, userB.id, adminUser.id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [userA.id, userB.id, adminUser.id] } },
      });
    }
    await app.close();
  });

  // ===========================================================================
  // 1. CREATING ORDERS WITH VALID CATALOG ITEMS
  // ===========================================================================
  it('1. Creates order with valid multi-item catalog items across different categories', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        items: [
          { catalogId: 'report-career', quantity: 1 },
          { catalogId: 'product-rudraksha-5-mukhi', quantity: 2 },
        ],
        notes: 'Multi-category test purchase',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);

    expect(body.orderId).toBeDefined();
    expect(body.razorpayOrderId).toBeDefined();
    expect(body.status).toBe('PENDING');
    expect(body.paymentStatus).toBe('PENDING');

    // ₹499 (49900 paise) + 2 * ₹1,100 (220000 paise) = 269900 paise
    expect(body.amount).toBe(269900);
    expect(body.items.length).toBe(2);

    // Verify database record
    const dbOrder = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { items: true },
    });
    expect(dbOrder).not.toBeNull();
    expect(dbOrder?.amount).toBe(269900);
    expect(dbOrder?.items.length).toBe(2);
  });

  // ===========================================================================
  // 2. REJECTING INACTIVE, UNKNOWN, OR UNAVAILABLE OFFERINGS
  // ===========================================================================
  it('2. Rejects order containing unknown catalog identifier or inactive item', async () => {
    // Unknown item
    const resUnknown = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        items: [{ catalogId: 'non-existent-super-item-999', quantity: 1 }],
      },
    });
    expect(resUnknown.statusCode).toBe(400);

    // Inactive item
    const resInactive = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        items: [{ catalogId: 'product-archived-yantra', quantity: 1 }],
      },
    });
    expect(resInactive.statusCode).toBe(400);
  });

  // ===========================================================================
  // 3. REJECTING CLIENT-SUPPLIED PRICE MANIPULATION
  // ===========================================================================
  it('3. Ignores client-supplied prices/discounts and uses authoritative server pricing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        items: [{ catalogId: 'report-career', quantity: 1 }],
        // Client maliciously claims price is 100 paise (₹1) and total is 100 paise
        amount: 100,
        price: 100,
        discount: 49800,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    // Server must strictly enforce ₹499 (49900 paise)
    expect(body.amount).toBe(49900);
    expect(body.items[0].unitPrice).toBe(49900);
    expect(body.items[0].totalAmount).toBe(49900);
  });

  // ===========================================================================
  // 4. CORRECT DECIMAL-SAFE AMOUNT AND TAX CALCULATION
  // ===========================================================================
  it('4. Performs decimal-safe integer tax allocation where subtotal + taxAmount === totalAmount', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        items: [
          { catalogId: 'consult-video-45', quantity: 1 }, // ₹3,100 (310000 paise @ 18% GST)
          { catalogId: 'product-sphatik-mala', quantity: 3 }, // 3 * ₹1,800 (540000 paise @ 3% GST)
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.amount).toBe(850000); // 310000 + 540000

    // Strict decimal-safe equality: subtotal + taxAmount must equal totalAmount exactly
    expect(body.subtotal + body.taxAmount).toBe(body.amount);
    expect(Number.isInteger(body.subtotal)).toBe(true);
    expect(Number.isInteger(body.taxAmount)).toBe(true);
  });

  // ===========================================================================
  // 5. ENFORCING ORDER OWNERSHIP (PREVENT IDOR)
  // ===========================================================================
  it('5. Enforces order ownership: User B cannot view User A order', async () => {
    // Create order for User A
    const orderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { items: [{ catalogId: 'report-career', quantity: 1 }] },
    });
    const orderId = JSON.parse(orderRes.payload).orderId;

    // User A can access own order
    const getResA = await app.inject({
      method: 'GET',
      url: `/api/v1/payments/orders/${orderId}`,
      headers: { authorization: `Bearer ${tokenUserA}` },
    });
    expect(getResA.statusCode).toBe(200);

    // User B attempts to access User A's order -> 404 Not Found (prevents ID enumeration)
    const getResB = await app.inject({
      method: 'GET',
      url: `/api/v1/payments/orders/${orderId}`,
      headers: { authorization: `Bearer ${tokenUserB}` },
    });
    expect(getResB.statusCode).toBe(404);
  });

  // ===========================================================================
  // 6. PREVENTING UNAUTHORIZED ADMINISTRATIVE OPERATIONS
  // ===========================================================================
  it('6. Rejects unauthorized administrative refund attempts by non-owner regular users', async () => {
    // Create & pay order for User A
    const order = await prisma.order.create({
      data: {
        userId: userA.id,
        razorpayOrderId: `order_${crypto.randomBytes(8).toString('hex')}`,
        razorpayPaymentId: `pay_${crypto.randomBytes(8).toString('hex')}`,
        amount: 49900,
        subtotal: 42288,
        taxAmount: 7612,
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.CAPTURED,
      },
    });

    // User B attempts to refund User A's order -> 404 (ownership check)
    const refundResUserB = await app.inject({
      method: 'POST',
      url: `/api/v1/payments/orders/${order.id}/refund`,
      headers: { authorization: `Bearer ${tokenUserB}` },
      payload: { amountPaise: 49900, reason: 'Unauthorized attempt' },
    });
    expect(refundResUserB.statusCode).toBe(404);

    // Super Admin IS permitted to initiate refund
    const refundResAdmin = await app.inject({
      method: 'POST',
      url: `/api/v1/payments/orders/${order.id}/refund`,
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { amountPaise: 49900, reason: 'Authorized Admin Refund' },
    });
    expect(refundResAdmin.statusCode).toBe(200);
    const body = JSON.parse(refundResAdmin.payload);
    expect(body.order.status).toBe('REFUNDED');
  });

  // ===========================================================================
  // 7. VALID AND INVALID CHECKOUT SIGNATURES
  // ===========================================================================
  it('7. Validates checkout signatures: accepts valid HMAC and rejects tampered signatures', async () => {
    const rzOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    const rzPaymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;

    await prisma.order.create({
      data: {
        userId: userA.id,
        razorpayOrderId: rzOrderId,
        amount: 29900,
        status: OrderStatus.PENDING,
      },
    });

    // Tampered signature
    const invalidSigRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        razorpayOrderId: rzOrderId,
        razorpayPaymentId: rzPaymentId,
        razorpaySignature: 'tampered_invalid_hex_signature_99999',
      },
    });
    expect(invalidSigRes.statusCode).toBe(400);

    // Verify order was marked FAILED
    const failedOrder = await prisma.order.findUnique({ where: { razorpayOrderId: rzOrderId } });
    expect(failedOrder?.status).toBe(OrderStatus.FAILED);

    // Create another order for valid signature test
    const rzOrderId2 = `order_${crypto.randomBytes(8).toString('hex')}`;
    const rzPaymentId2 = `pay_${crypto.randomBytes(8).toString('hex')}`;
    await prisma.order.create({
      data: {
        userId: userA.id,
        razorpayOrderId: rzOrderId2,
        amount: 29900,
        status: OrderStatus.PENDING,
      },
    });

    const validSig = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${rzOrderId2}|${rzPaymentId2}`)
      .digest('hex');

    const validSigRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        razorpayOrderId: rzOrderId2,
        razorpayPaymentId: rzPaymentId2,
        razorpaySignature: validSig,
      },
    });
    expect(validSigRes.statusCode).toBe(200);
    const paidOrder = await prisma.order.findUnique({ where: { razorpayOrderId: rzOrderId2 } });
    expect(paidOrder?.status).toBe(OrderStatus.PAID);
    expect(paidOrder?.paymentStatus).toBe(PaymentStatus.CAPTURED);
  });

  // ===========================================================================
  // 8. VALID AND INVALID WEBHOOK SIGNATURES
  // ===========================================================================
  it('8. Validates webhook signatures: rejects tampered webhook and accepts authentic signature', async () => {
    const rawPayload = JSON.stringify({
      entity: 'event',
      event: 'payment.captured',
      event_id: `evt_${crypto.randomBytes(8).toString('hex')}`,
      payload: {
        payment: { entity: { id: 'pay_test_wh_1', order_id: 'order_test_wh_1', amount: 49900 } },
      },
    });

    // 1. Missing signature
    const resNoSig = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/razorpay',
      payload: rawPayload,
      headers: { 'content-type': 'application/json' },
    });
    expect(resNoSig.statusCode).toBe(400);

    // 2. Tampered signature
    const resBadSig = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/razorpay',
      payload: rawPayload,
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': 'bad_tampered_signature_hex',
      },
    });
    expect(resBadSig.statusCode).toBe(400);

    // 3. Valid signature calculated with RAZORPAY_WEBHOOK_SECRET
    const validWhSig = crypto
      .createHmac('sha256', testWebhookSecret)
      .update(rawPayload)
      .digest('hex');

    const resGoodSig = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/razorpay',
      payload: rawPayload,
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': validWhSig,
      },
    });
    expect(resGoodSig.statusCode).toBe(200);
  });

  // ===========================================================================
  // 9. DUPLICATE WEBHOOK DELIVERY (IDEMPOTENCY DEDUPLICATION)
  // ===========================================================================
  it('9. Deduplicates webhooks idempotently: duplicate delivery does not re-process', async () => {
    const eventId = `evt_dedup_${crypto.randomBytes(8).toString('hex')}`;
    const payload = JSON.stringify({
      entity: 'event',
      event: 'payment.captured',
      event_id: eventId,
      payload: {
        payment: { entity: { id: 'pay_dedup', order_id: 'order_dedup', amount: 10000 } },
      },
    });

    const sig = crypto.createHmac('sha256', testWebhookSecret).update(payload).digest('hex');

    // First delivery
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/razorpay',
      payload,
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': sig },
    });
    expect(res1.statusCode).toBe(200);

    // Second delivery (duplicate replay)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/razorpay',
      payload,
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': sig },
    });
    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.duplicate).toBe(true);
  });

  // ===========================================================================
  // 10. OUT-OF-ORDER OR INVALID STATE TRANSITIONS
  // ===========================================================================
  it('10. Blocks invalid state transitions: cannot pay a cancelled order or refund an unpaid order', async () => {
    // 1. Cancelled order cannot be verified
    const cancelledOrder = await prisma.order.create({
      data: {
        userId: userA.id,
        razorpayOrderId: `order_${crypto.randomBytes(8).toString('hex')}`,
        amount: 49900,
        status: OrderStatus.CANCELLED,
      },
    });

    const sig = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${cancelledOrder.razorpayOrderId}|pay_dummy`)
      .digest('hex');

    const verifyCancelledRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        razorpayOrderId: cancelledOrder.razorpayOrderId,
        razorpayPaymentId: 'pay_dummy',
        razorpaySignature: sig,
      },
    });
    expect(verifyCancelledRes.statusCode).toBe(400);

    // 2. Unpaid PENDING order cannot be refunded
    const pendingOrder = await prisma.order.create({
      data: {
        userId: userA.id,
        razorpayOrderId: `order_${crypto.randomBytes(8).toString('hex')}`,
        amount: 49900,
        status: OrderStatus.PENDING,
      },
    });

    const refundPendingRes = await app.inject({
      method: 'POST',
      url: `/api/v1/payments/orders/${pendingOrder.id}/refund`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { amountPaise: 49900 },
    });
    expect(refundPendingRes.statusCode).toBe(400);
  });

  // ===========================================================================
  // 11. CONCURRENT / REPLAY PAYMENT VERIFICATION (IDEMPOTENT REPLAY)
  // ===========================================================================
  it('11. Handles payment verification replay idempotently without double-charging or error', async () => {
    const rzOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    const rzPaymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;

    await prisma.order.create({
      data: {
        userId: userA.id,
        razorpayOrderId: rzOrderId,
        amount: 19900,
        status: OrderStatus.PENDING,
      },
    });

    const validSig = crypto
      .createHmac('sha256', testKeySecret)
      .update(`${rzOrderId}|${rzPaymentId}`)
      .digest('hex');

    // First call
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        razorpayOrderId: rzOrderId,
        razorpayPaymentId: rzPaymentId,
        razorpaySignature: validSig,
      },
    });
    expect(res1.statusCode).toBe(200);

    // Second call (replay)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/verify',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: {
        razorpayOrderId: rzOrderId,
        razorpayPaymentId: rzPaymentId,
        razorpaySignature: validSig,
      },
    });
    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.message).toBe('Payment verified successfully');
  });

  // ===========================================================================
  // 12. FAILED PAYMENTS
  // ===========================================================================
  it('12. Handles payment.failed webhook event and marks order FAILED', async () => {
    const rzOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    const order = await prisma.order.create({
      data: {
        userId: userA.id,
        razorpayOrderId: rzOrderId,
        amount: 49900,
        status: OrderStatus.PENDING,
      },
    });

    const payload = JSON.stringify({
      entity: 'event',
      event: 'payment.failed',
      event_id: `evt_fail_${crypto.randomBytes(8).toString('hex')}`,
      payload: {
        payment: { entity: { id: 'pay_failed_1', order_id: rzOrderId } },
      },
    });
    const sig = crypto.createHmac('sha256', testWebhookSecret).update(payload).digest('hex');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/razorpay',
      payload,
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': sig },
    });
    expect(res.statusCode).toBe(200);

    const updated = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updated?.status).toBe(OrderStatus.FAILED);
    expect(updated?.paymentStatus).toBe(PaymentStatus.FAILED);
  });

  // ===========================================================================
  // 13. REFUND OWNERSHIP AND AMOUNT LIMITS (PREVENT OVER-REFUND)
  // ===========================================================================
  it('13. Enforces refund limits: prevents over-refunding and transitions through PARTIALLY_REFUNDED to REFUNDED', async () => {
    const order = await prisma.order.create({
      data: {
        userId: userA.id,
        razorpayOrderId: `order_${crypto.randomBytes(8).toString('hex')}`,
        razorpayPaymentId: `pay_${crypto.randomBytes(8).toString('hex')}`,
        amount: 50000, // ₹500
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.CAPTURED,
      },
    });

    // 1. Attempting to refund more than 50000 paise
    const overRefundRes = await app.inject({
      method: 'POST',
      url: `/api/v1/payments/orders/${order.id}/refund`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { amountPaise: 50001 },
    });
    expect(overRefundRes.statusCode).toBe(400);

    // 2. Partial refund of 20000 paise (₹200)
    const part1 = await app.inject({
      method: 'POST',
      url: `/api/v1/payments/orders/${order.id}/refund`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { amountPaise: 20000, reason: 'Partial return' },
    });
    expect(part1.statusCode).toBe(200);
    const body1 = JSON.parse(part1.payload);
    expect(body1.order.status).toBe('PARTIALLY_REFUNDED');

    // 3. Attempting to refund 35000 paise when only 30000 remains
    const overpartRes = await app.inject({
      method: 'POST',
      url: `/api/v1/payments/orders/${order.id}/refund`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { amountPaise: 35000 },
    });
    expect(overpartRes.statusCode).toBe(400);

    // 4. Refund remaining 30000 paise -> full refund
    const part2 = await app.inject({
      method: 'POST',
      url: `/api/v1/payments/orders/${order.id}/refund`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { amountPaise: 30000 },
    });
    expect(part2.statusCode).toBe(200);
    const body2 = JSON.parse(part2.payload);
    expect(body2.order.status).toBe('REFUNDED');

    // 5. Subsequent refund attempt when balance is 0
    const emptyRefundRes = await app.inject({
      method: 'POST',
      url: `/api/v1/payments/orders/${order.id}/refund`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { amountPaise: 100 },
    });
    expect(emptyRefundRes.statusCode).toBe(400);
  });

  // ===========================================================================
  // 14. DUPLICATE REFUND REQUESTS (IDEMPOTENCY KEY PROTECTION)
  // ===========================================================================
  it('14. Idempotent refund requests: same idempotencyKey returns existing refund without re-processing', async () => {
    const order = await prisma.order.create({
      data: {
        userId: userA.id,
        razorpayOrderId: `order_${crypto.randomBytes(8).toString('hex')}`,
        razorpayPaymentId: `pay_${crypto.randomBytes(8).toString('hex')}`,
        amount: 30000,
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.CAPTURED,
      },
    });

    const idempotencyKey = `idemp_rfnd_${Date.now()}`;

    // First refund call
    const res1 = await app.inject({
      method: 'POST',
      url: `/api/v1/payments/orders/${order.id}/refund`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { amountPaise: 10000, idempotencyKey },
    });
    expect(res1.statusCode).toBe(200);
    const refundId1 = JSON.parse(res1.payload).refund.id;

    // Duplicate call with same idempotencyKey
    const res2 = await app.inject({
      method: 'POST',
      url: `/api/v1/payments/orders/${order.id}/refund`,
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { amountPaise: 10000, idempotencyKey },
    });
    expect(res2.statusCode).toBe(200);
    const refundId2 = JSON.parse(res2.payload).refund.id;

    expect(refundId1).toBe(refundId2);
  });

  // ===========================================================================
  // 15. LEGACY ORDER COMPATIBILITY
  // ===========================================================================
  it('15. Backward compatibility: supports legacy { reportType: "GUPTA_NADI_DOSSIER" } payload', async () => {
    const legacyRes = await app.inject({
      method: 'POST',
      url: '/api/v1/payments/create-order',
      headers: { authorization: `Bearer ${tokenUserA}` },
      payload: { reportType: 'GUPTA_NADI_DOSSIER' },
    });

    expect(legacyRes.statusCode).toBe(201);
    const body = JSON.parse(legacyRes.payload);
    expect(body.reportType).toBe('GUPTA_NADI_DOSSIER');
    expect(body.amount).toBe(99900); // ₹999

    // Check database has both reportType and order_items
    const dbOrder = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: { items: true },
    });
    expect(dbOrder?.reportType).toBe('GUPTA_NADI_DOSSIER');
    expect(dbOrder?.items.length).toBe(1);
    expect(dbOrder?.items[0].catalogId).toBe('report-gupta-nadi');
  });

  // ===========================================================================
  // 16. PREVENTING DUPLICATE FULFILLMENT
  // ===========================================================================
  it('16. Prevents duplicate fulfillment: repeated webhook captured events do not mutate order', async () => {
    const rzOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    const order = await prisma.order.create({
      data: {
        userId: userA.id,
        razorpayOrderId: rzOrderId,
        amount: 49900,
        status: OrderStatus.PAID,
        paymentStatus: PaymentStatus.CAPTURED,
        updatedAt: new Date(Date.now() - 5000),
      },
    });

    const payload = JSON.stringify({
      entity: 'event',
      event: 'payment.captured',
      event_id: `evt_repeat_${crypto.randomBytes(8).toString('hex')}`,
      payload: {
        payment: { entity: { id: 'pay_repeat', order_id: rzOrderId, amount: 49900 } },
      },
    });
    const sig = crypto.createHmac('sha256', testWebhookSecret).update(payload).digest('hex');

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/razorpay',
      payload,
      headers: { 'content-type': 'application/json', 'x-razorpay-signature': sig },
    });
    expect(res.statusCode).toBe(200);

    const checkOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(checkOrder?.status).toBe(OrderStatus.PAID);
  });

  // ===========================================================================
  // 17. REJECTING DEVELOPMENT-ONLY SIGNATURE BYPASSES IN PRODUCTION MODE
  // ===========================================================================
  it('17. CRITICAL: in production mode, mock checkout & webhook signatures are STRICTLY rejected', async () => {
    const originalNodeEnv = config.NODE_ENV;
    try {
      (config as any).NODE_ENV = 'production';

      // 1. Mock checkout signature bypass must be rejected
      const checkoutIsValid = paymentService.verifyCheckoutSignature(
        'order_prod_test',
        'pay_prod_test',
        'mock_sig_bypass_12345'
      );
      expect(checkoutIsValid).toBe(false);

      // 2. Mock webhook signature bypass must be rejected
      const webhookIsValid = paymentService.verifyWebhookSignature(
        '{"event":"test"}',
        'mock_wh_sig_bypass_12345'
      );
      expect(webhookIsValid).toBe(false);
    } finally {
      (config as any).NODE_ENV = originalNodeEnv;
    }
  });
});
