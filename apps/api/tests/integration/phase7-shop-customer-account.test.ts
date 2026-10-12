import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

describe('Phase 7: Shop, Digital Products, Physical Products & Customer Account Suite', { timeout: 35000 }, () => {
  let app: FastifyInstance;
  let userA: any;
  let userB: any;
  let adminUser: any;
  let tokenA: string;
  let tokenB: string;
  let adminToken: string;

  let physicalHerbProduct: any;
  let wallpaperProduct: any;
  let digitalBundleProduct: any;
  let digitalArtProduct: any;

  let createdAddressId: string;
  let createdOrderId: string;
  let razorpayOrderId: string;

  const RAZORPAY_SECRET = 'test_razorpay_secret_for_local_development_12345';
  const RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret_for_local_development_67890';

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_SECRET = RAZORPAY_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = RAZORPAY_WEBHOOK_SECRET;
    process.env.RAZORPAY_KEY_ID = 'rzp_test_placeholder_key';
    app = buildApp();
    await app.ready();

    // Create test users
    userA = await prisma.user.create({
      data: {
        email: `shop_customer_a_${Date.now()}@example.com`,
        fullName: 'Vikram Aditya',
        phoneNumber: `+9198711${Math.floor(10000 + Math.random() * 90000)}`,
        role: 'USER',
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `shop_customer_b_${Date.now()}@example.com`,
        fullName: 'Ananya Sharma',
        phoneNumber: `+9198722${Math.floor(10000 + Math.random() * 90000)}`,
        role: 'USER',
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `shop_admin_${Date.now()}@example.com`,
        fullName: 'Astro Admin Commerce',
        phoneNumber: `+9198733${Math.floor(10000 + Math.random() * 90000)}`,
        role: 'SUPER_ADMIN',
      },
    });

    tokenA = (app as any).jwt.sign({ sub: userA.id, id: userA.id, role: 'USER' });
    tokenB = (app as any).jwt.sign({ sub: userB.id, id: userB.id, role: 'USER' });
    adminToken = (app as any).jwt.sign({ sub: adminUser.id, id: adminUser.id, role: 'SUPER_ADMIN' });
  });

  afterAll(async () => {
    try {
      if (userA) {
        await prisma.digitalProductEntitlement.deleteMany({ where: { userId: userA.id } });
        await prisma.shippingAddress.deleteMany({ where: { userId: userA.id } });
        await prisma.order.deleteMany({ where: { userId: userA.id } });
        await prisma.user.delete({ where: { id: userA.id } });
      }
      if (userB) {
        await prisma.digitalProductEntitlement.deleteMany({ where: { userId: userB.id } });
        await prisma.shippingAddress.deleteMany({ where: { userId: userB.id } });
        await prisma.order.deleteMany({ where: { userId: userB.id } });
        await prisma.user.delete({ where: { id: userB.id } });
      }
      if (adminUser) {
        await prisma.user.delete({ where: { id: adminUser.id } });
      }
    } catch (e) {
      // Ignore cleanup error
    }
    await app.close();
  });

  // ===========================================================================
  // 1. PRODUCT CATALOGUE AUDIT & DISCOVERY
  // ===========================================================================
  describe('1. Product Catalogue Discovery & Verification', () => {
    it('GET /api/v1/products - retrieves verified live catalogue with accurate pricing and types', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/products',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.products.length).toBeGreaterThanOrEqual(10);

      // Verify physical herb
      physicalHerbProduct = body.data.products.find((p: any) => p.productType === 'PHYSICAL');
      expect(physicalHerbProduct).toBeDefined();
      expect(physicalHerbProduct.price).toBe(399900); // ₹3,999
      expect(physicalHerbProduct.requiresShipping).toBe(true);
      expect(physicalHerbProduct.stock).toBeGreaterThan(0);

      // Verify wallpaper
      wallpaperProduct = body.data.products.find((p: any) => p.slug === 'vivah-siddh-wallpaper-for-getting-married');
      expect(wallpaperProduct).toBeDefined();
      expect(wallpaperProduct.price).toBe(89900); // ₹899
      expect(wallpaperProduct.requiresShipping).toBe(false);

      // Verify digital bundle
      digitalBundleProduct = body.data.products.find((p: any) => p.productType === 'DIGITAL_BUNDLE');
      expect(digitalBundleProduct).toBeDefined();
      expect(digitalBundleProduct.price).toBe(219900); // ₹2,199
      expect(digitalBundleProduct.requiresShipping).toBe(false);

      // Verify variant artwork
      digitalArtProduct = body.data.products.find((p: any) => p.slug === 'maa-lakshmi-large-variant-digital-image');
      expect(digitalArtProduct).toBeDefined();
      expect(Array.isArray(digitalArtProduct.variants)).toBe(true);
      expect(digitalArtProduct.variants.length).toBe(3); // Large, Medium, Small
    });

    it('GET /api/v1/products?category=WALLPAPER - filters products accurately', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/products?category=WALLPAPER',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.products.every((p: any) => p.category === 'WALLPAPER')).toBe(true);
      expect(body.data.products.length).toBe(6);
    });

    it('GET /api/v1/products/:idOrSlug - returns full product detail with variants', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/products/${digitalArtProduct.slug}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.title).toBe(digitalArtProduct.title);
      expect(body.data.variants.length).toBe(3);
    });

    it('GET /api/v1/products/non-existent-product - returns 404', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/products/non-existent-fake-product-12345',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================================================
  // 2. SHIPPING ADDRESS MANAGEMENT
  // ===========================================================================
  describe('2. Shipping Address Management', () => {
    it('POST /api/v1/account/addresses - saves a valid shipping address', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/account/addresses',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          fullName: 'Vikram Aditya',
          phoneNumber: '+919871122334',
          addressLine1: 'Flat 402, Shanti Niketan Apartments',
          addressLine2: 'Near Ram Mandir, Gomti Nagar',
          city: 'Lucknow',
          state: 'Uttar Pradesh',
          postalCode: '226010',
          country: 'India',
          isDefault: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.id).toBeDefined();
      expect(body.data.isDefault).toBe(true);
      createdAddressId = body.data.id;
    });

    it('GET /api/v1/account/addresses - lists saved shipping addresses for user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/account/addresses',
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].id).toBe(createdAddressId);
    });

    it('PUT /api/v1/account/addresses/:id - updates address details', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/account/addresses/${createdAddressId}`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          city: 'Ayodhya',
          state: 'Uttar Pradesh',
          postalCode: '224123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.city).toBe('Ayodhya');
      expect(body.data.postalCode).toBe('224123');
    });

    it('Cross-user isolation: User B cannot modify User A shipping address', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/account/addresses/${createdAddressId}`,
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          city: 'Hacked City',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================================================
  // 3. SERVER-AUTHORITATIVE CART CALCULATION
  // ===========================================================================
  describe('3. Server-Authoritative Cart Calculation', () => {
    it('Calculates digital-only cart with 18% inclusive GST and ₹0 shipping', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/products/cart/calculate',
        payload: {
          items: [
            { productId: wallpaperProduct.id, quantity: 1 }, // ₹899 = 89900 paise
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.totalAmount).toBe(89900);
      expect(body.data.shippingAmount).toBe(0);
      expect(body.data.requiresShipping).toBe(false);
      expect(body.data.subtotal + body.data.taxAmount).toBe(89900);
    });

    it('Calculates variant pricing accurately (Small art: ₹1,499 vs Large: ₹2,499)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/products/cart/calculate',
        payload: {
          items: [
            { productId: digitalArtProduct.id, variantId: 'size-small', quantity: 1 },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.totalAmount).toBe(149900); // Small variant price ₹1,499
      expect(body.data.items[0].unitPrice).toBe(149900);
    });

    it('Applies free shipping threshold for physical orders >= ₹2,000', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/products/cart/calculate',
        payload: {
          items: [
            { productId: physicalHerbProduct.id, quantity: 1 }, // ₹3,999 > ₹2,000 threshold
          ],
          shippingAddressId: createdAddressId,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.requiresShipping).toBe(true);
      expect(body.data.shippingAmount).toBe(0);
      expect(body.data.eligibleForFreeShipping).toBe(true);
      expect(body.data.totalAmount).toBe(399900);
    });

    it('Rejects cart exceeding stock for physical items', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/products/cart/calculate',
        payload: {
          items: [
            { productId: physicalHerbProduct.id, quantity: 100000 },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================================================
  // 4. UNIFIED SHOP ORDER CREATION
  // ===========================================================================
  describe('4. Unified Shop Order Creation', () => {
    it('Fails order creation for physical product when shipping address is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/products/orders',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          items: [{ productId: physicalHerbProduct.id, quantity: 1 }],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message || body.error?.message).toContain('shipping address is required');
    });

    it('Creates shop order with physical herb, wallpaper, and shipping address', async () => {
      const idempotencyKey = `shop_order_${Date.now()}`;
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/products/orders',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          items: [
            { productId: physicalHerbProduct.id, quantity: 1 }, // ₹3,999
            { productId: wallpaperProduct.id, quantity: 1 }, // ₹899
          ],
          shippingAddressId: createdAddressId,
          idempotencyKey,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.orderId).toBeDefined();
      expect(body.data.razorpayOrderId).toBeDefined();
      expect(body.data.amount).toBe(399900 + 89900); // 489,800 paise = ₹4,898
      expect(body.data.shippingAmount).toBe(0); // Free shipping because physical subtotal >= ₹2,000
      expect(body.data.status).toBe('PENDING');
      expect(body.data.paymentStatus).toBe('PENDING');

      createdOrderId = body.data.orderId;
      razorpayOrderId = body.data.razorpayOrderId;
    });

    it('Enforces idempotency: Duplicate order creation with same key returns existing order', async () => {
      const idempotencyKey = `idemp_repeat_${Date.now()}`;
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/products/orders',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          items: [{ productId: wallpaperProduct.id, quantity: 1 }],
          idempotencyKey,
        },
      });

      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/products/orders',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          items: [{ productId: wallpaperProduct.id, quantity: 1 }],
          idempotencyKey,
        },
      });

      expect(res1.statusCode).toBe(201);
      expect(res2.statusCode).toBe(200);
      expect(JSON.parse(res1.payload).data.orderId).toBe(JSON.parse(res2.payload).data.orderId);
    });
  });

  // ===========================================================================
  // 5. PAYMENT VERIFICATION & FULFILLMENT
  // ===========================================================================
  describe('5. Payment Verification & Digital/Physical Fulfillment', () => {
    it('Rejects payment verification with invalid HMAC signature', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/products/orders/${createdOrderId}/verify-payment`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          orderId: createdOrderId,
          razorpayOrderId,
          razorpayPaymentId: 'pay_invalid_123',
          razorpaySignature: 'invalid_forged_signature_hex',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('Cross-user isolation: User B cannot verify User A order', async () => {
      const fakePaymentId = `pay_shop_${Date.now()}`;
      const validSignature = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(`${razorpayOrderId}|${fakePaymentId}`)
        .digest('hex');

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/products/orders/${createdOrderId}/verify-payment`,
        headers: { authorization: `Bearer ${tokenB}` },
        payload: {
          orderId: createdOrderId,
          razorpayOrderId,
          razorpayPaymentId: fakePaymentId,
          razorpaySignature: validSignature,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('Verifies payment with valid signature and triggers fulfillment atomically', async () => {
      const paymentId = `pay_shop_valid_${Date.now()}`;
      const validSignature = crypto
        .createHmac('sha256', RAZORPAY_SECRET)
        .update(`${razorpayOrderId}|${paymentId}`)
        .digest('hex');

      const initialHerbStock = (await prisma.product.findUnique({ where: { id: physicalHerbProduct.id } }))?.stock || 0;

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/products/orders/${createdOrderId}/verify-payment`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          orderId: createdOrderId,
          razorpayOrderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: validSignature,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.order.status).toBe('PAID');
      expect(body.data.order.paymentStatus).toBe('CAPTURED');
      expect(body.data.order.fulfillmentStatus).toBe('PROCESSING'); // PROCESSING because contains physical herb

      // Verify physical stock was safely decremented
      const updatedHerb = await prisma.product.findUnique({ where: { id: physicalHerbProduct.id } });
      expect(updatedHerb?.stock).toBe(initialHerbStock - 1);

      // Verify digital entitlement was granted for wallpaper
      const entitlement = await prisma.digitalProductEntitlement.findFirst({
        where: { userId: userA.id, productId: wallpaperProduct.id },
      });
      expect(entitlement).toBeDefined();
      expect(entitlement?.status).toBe('ACTIVE');
    });

    it('Idempotent replay: Calling verify-payment on already PAID order returns 200 without duplicate fulfillment', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/products/orders/${createdOrderId}/verify-payment`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          orderId: createdOrderId,
          razorpayOrderId,
          razorpayPaymentId: 'pay_repeat',
          razorpaySignature: 'any_sig',
        },
      });

      expect(response.statusCode).toBe(200);
      const entitlements = await prisma.digitalProductEntitlement.findMany({
        where: { userId: userA.id, productId: wallpaperProduct.id },
      });
      expect(entitlements.length).toBe(1); // No duplicate entitlement created
    });
  });

  // ===========================================================================
  // 6. DIGITAL PRODUCT FULFILLMENT & SECURE EXPIRING DOWNLOADS
  // ===========================================================================
  describe('6. Digital Downloads & Entitlements', () => {
    let entitlementId: string;

    it('GET /api/v1/account/downloads - returns entitled digital products for customer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/account/downloads',
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.items.length).toBeGreaterThanOrEqual(1);
      const item = body.data.items[0];
      expect(item.productId).toBe(wallpaperProduct.id);
      expect(item.status).toBe('ACTIVE');
      entitlementId = item.id;
    });

    it('GET /api/v1/account/downloads/:id - generates signed expiring download link', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/account/downloads/${entitlementId}`,
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.downloadUrl).toContain('token=');
      expect(body.data.downloadUrl).toContain('expires=');
      expect(body.data.downloadCount).toBe(1);
    });

    it('Cross-user isolation: User B cannot access User A download link', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/account/downloads/${entitlementId}`,
        headers: { authorization: `Bearer ${tokenB}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================================================
  // 7. WEBHOOK FULFILLMENT & DEDUPLICATION
  // ===========================================================================
  describe('7. Webhooks & Idempotent Fulfillment', () => {
    it('Handles duplicate webhook delivery idempotently without double-fulfillment', async () => {
      const rawPayload = JSON.stringify({
        event: 'payment.captured',
        event_id: `evt_test_shop_${Date.now()}`,
        payload: {
          payment: {
            entity: {
              id: 'pay_webhook_test_1',
              order_id: razorpayOrderId,
              amount: 489800,
            },
          },
        },
      });

      const signature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(rawPayload)
        .digest('hex');

      // First webhook post
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: {
          'x-razorpay-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawPayload,
      });

      // Second webhook post (duplicate)
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/razorpay',
        headers: {
          'x-razorpay-signature': signature,
          'content-type': 'application/json',
        },
        payload: rawPayload,
      });

      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);
      expect(JSON.parse(res2.payload).duplicate).toBe(true);
    });
  });

  // ===========================================================================
  // 8. CUSTOMER ACCOUNT HUB SUMMARY
  // ===========================================================================
  describe('8. Customer Account Hub Summary', () => {
    it('GET /api/v1/account/summary - aggregates user profile, metrics, and orders', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/account/summary',
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.user.id).toBe(userA.id);
      expect(body.data.stats.ordersCount).toBeGreaterThanOrEqual(1);
      expect(body.data.stats.digitalDownloadsCount).toBeGreaterThanOrEqual(1);
      expect(body.data.recentOrders.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/account/orders - returns complete customer order history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/account/orders',
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.orders.length).toBeGreaterThanOrEqual(1);
      expect(body.data.orders[0].items.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/v1/account/orders/:id - returns detailed order breakdown', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/account/orders/${createdOrderId}`,
        headers: { authorization: `Bearer ${tokenA}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.id).toBe(createdOrderId);
      expect(body.data.shippingAddress).toBeDefined();
    });

    it('Cross-user isolation: User B cannot view User A order details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/account/orders/${createdOrderId}`,
        headers: { authorization: `Bearer ${tokenB}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================================================
  // 9. ADMIN DASHBOARD & AUDIT TRAILS
  // ===========================================================================
  describe('9. Admin Operations & Audit Trails', () => {
    it('GET /api/v1/admin/orders - lists orders with server RBAC enforcement', async () => {
      // Non-admin request rejected
      const nonAdminRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/orders',
        headers: { authorization: `Bearer ${tokenA}` },
      });
      expect(nonAdminRes.statusCode).toBe(403);

      // Super Admin request succeeds
      const adminRes = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/orders',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(adminRes.statusCode).toBe(200);
      const body = JSON.parse(adminRes.payload);
      expect(body.data.orders.length).toBeGreaterThanOrEqual(1);
    });

    it('PUT /api/v1/admin/orders/:id/fulfillment - updates fulfillment status to DISPATCHED with tracking and logs audit trail', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/orders/${createdOrderId}/fulfillment`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          fulfillmentStatus: 'DISPATCHED',
          trackingNumber: 'DELHIVERY_123456789',
          courierPartner: 'Delhivery Surface Express',
        },
      });

      expect(response.statusCode).toBe(200);
      const updatedOrder = await prisma.order.findUnique({ where: { id: createdOrderId } });
      expect(updatedOrder?.fulfillmentStatus).toBe('DISPATCHED');
      expect(updatedOrder?.trackingNumber).toBe('DELHIVERY_123456789');
      expect(updatedOrder?.dispatchedAt).toBeDefined();

      // Verify audit log entry was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          adminId: adminUser.id,
          action: 'ORDER_FULFILLMENT_UPDATE',
          resource: `Order:${createdOrderId}`,
        },
      });
      expect(auditLog).toBeDefined();
    });

    it('PUT /api/v1/admin/products/:id/stock - updates stock and logs audit trail', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/admin/products/${physicalHerbProduct.id}/stock`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          stock: 9950,
          isAvailable: true,
        },
      });

      expect(response.statusCode).toBe(200);
      const updatedProduct = await prisma.product.findUnique({ where: { id: physicalHerbProduct.id } });
      expect(updatedProduct?.stock).toBe(9950);

      // Verify audit log entry was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          adminId: adminUser.id,
          action: 'PRODUCT_STOCK_UPDATE',
          resource: `Product:${physicalHerbProduct.id}`,
        },
      });
      expect(auditLog).toBeDefined();
    });
  });
});
