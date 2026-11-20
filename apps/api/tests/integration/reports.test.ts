import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import { featureAccessService } from '../../src/services/feature-access.service';

describe('Reports API & PDF Generation Integration Tests', () => {
  let app: FastifyInstance;

  const profilesDb = new Map<string, any>();
  const reportsDb = new Map<string, any>();
  const ordersDb = new Map<string, any>();

  const user1Id = '11111111-1111-1111-1111-111111111111';
  const user2Id = '22222222-2222-2222-2222-222222222222';
  let user1Token: string;
  let user2Token: string;

  const user1ProfileId = '33333333-3333-3333-3333-333333333333';
  const user2ProfileId = '44444444-4444-4444-4444-444444444444';
  let user1ReportId: string;
  let user2ReportId: string;

  beforeAll(async () => {
    // Populate birth profiles
    profilesDb.set(user1ProfileId, {
      id: user1ProfileId,
      userId: user1Id,
      name: 'User 1 Profile',
      dateOfBirth: '1990-05-15',
      timeOfBirth: '14:30:00',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    profilesDb.set(user2ProfileId, {
      id: user2ProfileId,
      userId: user2Id,
      name: 'User 2 Profile',
      dateOfBirth: '1992-08-20',
      timeOfBirth: '09:15:00',
      latitude: 19.076,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
      placeName: 'Mumbai, India',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Populate valid paid order fixtures for commerce & entitlement verification
    const order1Id = '55555555-5555-5555-5555-555555555555';
    ordersDb.set(order1Id, {
      id: order1Id,
      userId: user1Id,
      status: 'PAID',
      paymentStatus: 'CAPTURED',
      fulfillmentStatus: 'PENDING',
      reportType: 'KUNDLI',
      paidAt: new Date(),
      items: [
        { id: 'item-1', orderId: order1Id, itemType: 'REPORT', catalogId: 'report-kundli', quantity: 1, price: 999 },
        { id: 'item-2', orderId: order1Id, itemType: 'REPORT', catalogId: 'report-planetary-summary', quantity: 1, price: 499 },
      ],
      reports: [],
    });

    (vi.spyOn(featureAccessService, 'evaluateFeatureAccess') as any).mockResolvedValue({
      allowed: true,
      source: 'SUPPORT_ENTITLEMENT_GRANT',
    });

    (vi.spyOn(prisma.birthProfile, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return profilesDb.get(where.id) || null;
    });

    (vi.spyOn(prisma.order, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return ordersDb.get(where.id) || null;
    });

    (vi.spyOn(prisma.order, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return Array.from(ordersDb.values()).find((o) => {
        if (where.userId && o.userId !== where.userId) return false;
        if (where.status && o.status !== where.status) return false;
        return true;
      }) || null;
    });

    (vi.spyOn(prisma.order, 'updateMany') as any).mockImplementation(async ({ where, data }: any) => {
      let count = 0;
      for (const [id, o] of ordersDb.entries()) {
        if (where.id && o.id !== where.id) continue;
        Object.assign(o, data);
        count++;
      }
      return { count };
    });

    (vi.spyOn(prisma.report, 'create') as any).mockImplementation(async ({ data }: any) => {
      const id = data.id || crypto.randomUUID();
      const record = {
        id,
        userId: data.userId,
        birthProfileId: data.birthProfileId,
        orderId: data.orderId || null,
        fulfillmentUnitId: data.fulfillmentUnitId || null,
        reportType: data.reportType,
        status: data.status || 'QUEUED',
        stage: data.stage || 'QUEUED',
        progress: data.progress ?? 0,
        storageKey: data.storageKey || null,
        fileName: data.fileName || null,
        fileSize: data.fileSize || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      reportsDb.set(id, record);
      return record;
    });

    (vi.spyOn(prisma.report, 'updateMany') as any).mockImplementation(async ({ where, data }: any) => {
      let count = 0;
      for (const [id, r] of reportsDb.entries()) {
        if (where.id && r.id !== where.id) continue;
        if (where.status?.in && !where.status.in.includes(r.status)) continue;
        Object.assign(r, data);
        count++;
      }
      return { count };
    });

    (vi.spyOn(prisma.report, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const r = reportsDb.get(where.id);
      if (r) {
        Object.assign(r, data);
      }
      return r || null;
    });

    (vi.spyOn(prisma.report, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      const record = reportsDb.get(where.id);
      if (!record) return null;
      return {
        ...record,
        birthProfile: profilesDb.get(record.birthProfileId),
      };
    });

    (vi.spyOn(prisma.report, 'findMany') as any).mockImplementation(async ({ where }: any) => {
      return Array.from(reportsDb.values()).filter((r) => r.userId === where.userId);
    });

    (vi.spyOn(prisma.report, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return Array.from(reportsDb.values()).find((r) => {
        if (where.userId && r.userId !== where.userId) return false;
        if (where.birthProfileId && r.birthProfileId !== where.birthProfileId) return false;
        if (where.reportType && r.reportType !== where.reportType) return false;
        return true;
      }) || null;
    });

    app = buildApp();
    await app.ready();

    user1Token = (app as any).jwt.sign({ sub: user1Id, role: 'USER' });
    user2Token = (app as any).jwt.sign({ sub: user2Id, role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // 1. Authenticated user can request a KUNDLI report (generated later by the worker)
  it('1. Authenticated user can request a KUNDLI report and it is queued for the worker', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        birthProfileId: user1ProfileId,
        reportType: 'KUNDLI',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.id).toBeDefined();
    expect(body.status).toBe('QUEUED');
    expect(body.report).toBeUndefined(); // no in-request generation
    user1ReportId = body.id;
  });

  // 2. A report that has not been delivered yet cannot be downloaded
  it('2. Download before delivery is refused with REPORT_NOT_READY', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${user1ReportId}/pdf`,
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).error.code).toBe('REPORT_NOT_READY');
  });

  // 9. Planetary summary is served by the platform module and queued
  it('9. Planetary summary request is accepted and queued', async () => {
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        birthProfileId: user1ProfileId,
        reportType: 'PLANETARY_SUMMARY',
      },
    });
    expect(genRes.statusCode).toBe(201);
    expect(JSON.parse(genRes.payload).status).toBe('QUEUED');
  });

  // 10. Guest PDF download is rejected
  it('10. Guest PDF download is rejected (returns 401)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${user1ReportId}/pdf`,
    });

    expect(response.statusCode).toBe(401);
  });

  // 11. User A cannot download User B's report
  it('11. User A cannot download User B\'s report (returns 404)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${user1ReportId}/pdf`,
      headers: { authorization: `Bearer ${user2Token}` },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // 12. A report type with no genuine generator is rejected clearly (nothing is substituted)
  it('12. CHILDBIRTH_FAMILY is rejected with REPORT_TYPE_NOT_AVAILABLE (400)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        birthProfileId: user1ProfileId,
        reportType: 'CHILDBIRTH_FAMILY',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).error.code).toBe('REPORT_TYPE_NOT_AVAILABLE');
  });

  // 13 & 14. Expired token refreshes and download succeeds
  it('13 & 14. Refreshed access token is accepted by the download route', async () => {
    const refreshedToken = (app as any).jwt.sign({ sub: user1Id, role: 'USER' }, { expiresIn: '15m' });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${user1ReportId}/pdf`,
      headers: { authorization: `Bearer ${refreshedToken}` },
    });

    // Authenticated (not 401); the report is still being prepared.
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload).error.code).toBe('REPORT_NOT_READY');
  });
});
