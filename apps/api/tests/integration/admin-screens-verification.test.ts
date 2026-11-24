import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { seedRbac } from '../../src/modules/admin/rbac/rbac.seed';
import { consultationTypesService } from '../../src/modules/consultations/consultation-types.service';
import { setSellerDetailsProvider } from '../../src/modules/invoices/seller';

describe('Admin Screens End-to-End API Verification (Integration)', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    setSellerDetailsProvider({
      get: () => ({
        legalName: 'Astro Sushil Test',
        tagline: 'Vedic Astrology',
        address: 'Varanasi, UP',
        gstin: '09AAACA0000A1Z5',
        state: 'Uttar Pradesh',
        email: 'admin@astrosushil.com',
        phone: '+919999999999',
        website: 'https://astrosushil.com',
      }),
    });

    // Ensure super admin user exists
    const passwordHash = await bcrypt.hash('AdminPass123!', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin-screen-test@astrosushil.com' },
      update: { role: 'SUPER_ADMIN', passwordHash },
      create: {
        email: 'admin-screen-test@astrosushil.com',
        fullName: 'Super Admin Screen Tester',
        role: 'SUPER_ADMIN',
        passwordHash,
        emailVerifiedAt: new Date(),
      },
    });
    adminUserId = admin.id;

    // Seed RBAC and consultation types
    await seedRbac(prisma);
    await consultationTypesService.seedDefaults();

    // Log in
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: {
        email: 'admin-screen-test@astrosushil.com',
        password: 'AdminPass123!',
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const loginBody = JSON.parse(loginRes.payload);
    adminToken = loginBody.tokens.accessToken;
    expect(adminToken).toBeDefined();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'admin-screen-test@astrosushil.com' } });
    await app.close();
  });

  const authHeaders = () => ({
    authorization: `Bearer ${adminToken}`,
  });

  it('GET /api/v1/admin/dashboard responds with metrics and stats', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.stats).toBeDefined();
    expect(body.stats.totalUsers).toBeGreaterThanOrEqual(1);
    expect(body.metrics).toBeDefined();
    expect(body.recentOrders).toBeDefined();
  });

  it('GET /api/v1/admin/dashboard/summary responds with 12-month revenue series', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/dashboard/summary',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.monthlyRevenue).toBeInstanceOf(Array);
    expect(body.monthlyRevenue.length).toBe(12);
    expect(body.monthlyRevenue[0]).toHaveProperty('month');
    expect(body.monthlyRevenue[0]).toHaveProperty('revenue');
    expect(body.monthlyRevenue[0]).toHaveProperty('orders');
    expect(body).toHaveProperty('totalSales');
    expect(body).toHaveProperty('totalOrders');
  });

  it('GET /api/v1/admin/reports responds with items, pagination and handles language/stuck filters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reports?language=hi&status=STUCK&sortBy=duration',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.items).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
  });

  it('GET /api/v1/admin/transactions responds with transactions and totals breakdown', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/transactions',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.transactions).toBeInstanceOf(Array);
    expect(body.total).toBeDefined();
    expect(body.totals).toBeDefined();
    expect(body.totals).toHaveProperty('all');
    expect(body.totals).toHaveProperty('success');
    expect(body.totals).toHaveProperty('pending');
    expect(body.totals).toHaveProperty('failed');
    expect(body.totals).toHaveProperty('collectedPaise');
  });

  it('GET /api/v1/admin/transactions/unapplied-payments responds with payments array', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/transactions/unapplied-payments',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.payments).toBeInstanceOf(Array);
    expect(body.total).toBeDefined();
  });

  it('GET /api/v1/admin/shop-orders responds with orders array and pagination', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/shop-orders',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeDefined();
    expect(body.data.orders).toBeInstanceOf(Array);
    expect(body.data.pagination).toBeDefined();
  });

  it('GET /api/v1/admin/shop-orders/reports responds with sales summary', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/shop-orders/reports',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeDefined();
    expect(body.data).toHaveProperty('totalOrders');
    expect(body.data).toHaveProperty('totalSales');
    expect(body.data).toHaveProperty('monthlyRevenue');
  });

  it('GET /api/v1/admin/shop-orders/export.csv responds with CSV file', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/shop-orders/export.csv',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.payload).toContain('Order ID,Customer Name,Email,Phone,Product,Quantity,Item Price,Order Type,Order Status,Payment Status,Currency,Order Total,Date');
  });

  it('GET /api/v1/admin/consultation-types responds with consultation tiers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/consultation-types',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/admin/consultation-types/flat responds with flat mode options', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/consultation-types/flat',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0]).toHaveProperty('mode');
    expect(body.data[0]).toHaveProperty('pricePaise');
  });

  it('POST /api/v1/admin/bookings/quote calculates a price quote', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/bookings/quote',
      headers: authHeaders(),
      payload: {
        consultationId: 'consult-general-audio',
        discountType: 'FLAT',
        discountValue: 10000,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeDefined();
    expect(body.data).toHaveProperty('pricePaise');
    expect(body.data).toHaveProperty('discountPaise', 10000);
    expect(body.data).toHaveProperty('totalPaise');
    expect(body.data).toHaveProperty('taxablePaise');
    expect(body.data).toHaveProperty('gstPaise');
  });

  it('GET /api/v1/admin/availability responds with schedule configuration', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/availability',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeDefined();
    expect(body.data).toHaveProperty('startTime');
    expect(body.data).toHaveProperty('endTime');
  });

  it('GET /api/v1/admin/roles responds with roles list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/roles',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.items).toBeInstanceOf(Array);
    expect(body.items.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/admin/roles/options responds with role choices for picker', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/roles/options',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.items).toBeInstanceOf(Array);
  });

  it('GET /api/v1/admin/permissions and /api/v1/admin/roles/permissions-catalogue respond with matrix', async () => {
    const res1 = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/permissions',
      headers: authHeaders(),
    });
    expect(res1.statusCode).toBe(200);
    const body1 = JSON.parse(res1.payload);
    expect(body1.groups).toBeInstanceOf(Array);

    const res2 = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/roles/permissions-catalogue',
      headers: authHeaders(),
    });
    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.payload);
    expect(body2.groups).toEqual(body1.groups);
  });

  it('GET /api/v1/admin/staff responds with staff accounts list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/staff',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.items).toBeInstanceOf(Array);
  });

  it('GET /api/v1/admin/auth/profile and POST /api/v1/admin/staff/me/photo update photo', async () => {
    const profileRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/auth/profile',
      headers: authHeaders(),
    });
    expect(profileRes.statusCode).toBe(200);

    const photoRes = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/staff/me/photo',
      headers: authHeaders(),
      payload: {
        photoUrl: 'https://images.example.com/avatar.jpg',
      },
    });
    expect(photoRes.statusCode).toBe(200);
    const updated = JSON.parse(photoRes.payload);
    expect(updated.profilePhoto).toBe('https://images.example.com/avatar.jpg');
  });

  it('GET /api/v1/admin/coupons responds with coupons list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/coupons',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeDefined();
    expect(body.data.coupons).toBeInstanceOf(Array);
  });

  it('GET /api/v1/admin/customers responds with customers list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/customers',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeDefined();
    expect(body.data.users).toBeInstanceOf(Array);
  });

  it('GET /api/v1/admin/blogs responds with blogs list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/blogs',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeDefined();
    expect(body.data.blogs).toBeInstanceOf(Array);
  });

  it('GET /api/v1/admin/settings responds with settings dictionary', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/settings',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toBeDefined();
  });

  it('GET /api/v1/admin/gst-report responds with GST invoice summary', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/gst-report',
      headers: authHeaders(),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.summary).toBeDefined();
    expect(body.rows).toBeInstanceOf(Array);
  });
});
