import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { reportsService } from '../../src/modules/reports/reports.service';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { featureAccessService } from '../../src/services/feature-access.service';

describe('Phase 4: Consumer Reports Multi-Tier & Matchmaking Integration Suite', () => {
  let app: FastifyInstance;

  const user1 = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'user1@astrosushil.com',
    role: 'USER',
  };

  const user2 = {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'user2@astrosushil.com',
    role: 'USER',
  };

  let token1: string;
  let token2: string;

  const groomProfile = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    userId: user1.id,
    name: 'Devendra Kumar',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const brideProfile = {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    userId: user1.id,
    name: 'Pooja Verma',
    dateOfBirth: '1993-08-22',
    timeOfBirth: '09:15:00',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    placeName: 'Mumbai, India',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const externalProfile = {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    userId: user2.id,
    name: 'Other User Profile',
    dateOfBirth: '1988-12-10',
    timeOfBirth: '18:00:00',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
    placeName: 'Bengaluru, India',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const reportsStore = new Map<string, any>();
  const profilesStore = new Map<string, any>();
  const ordersStore = new Map<string, any>();

  beforeAll(async () => {
    process.env.LLM_PROVIDER = 'mock';

    profilesStore.set(groomProfile.id, { ...groomProfile });
    profilesStore.set(brideProfile.id, { ...brideProfile });
    profilesStore.set(externalProfile.id, { ...externalProfile });

    vi.spyOn(prisma.birthProfile, 'findUnique').mockImplementation(async ({ where }: any) => {
      return profilesStore.get(where.id) || null;
    });

    vi.spyOn(prisma.user, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.id === user1.id) return { id: user1.id, email: user1.email, role: 'USER' };
      if (where.id === user2.id) return { id: user2.id, email: user2.email, role: 'USER' };
      return null;
    });

    vi.spyOn(prisma.report, 'findUnique').mockImplementation(async ({ where }: any) => {
      const r = reportsStore.get(where.id);
      if (!r) return null;
      return {
        ...r,
        birthProfile: profilesStore.get(r.birthProfileId),
        user: r.userId === user1.id ? user1 : user2,
      };
    });

    vi.spyOn(prisma.report, 'findFirst').mockImplementation(async ({ where }: any) => {
      const all = Array.from(reportsStore.values());
      const filtered = all.filter((r) => {
        if (where.userId && r.userId !== where.userId) return false;
        if (where.birthProfileId && r.birthProfileId !== where.birthProfileId) return false;
        if (where.reportType && r.reportType !== where.reportType) return false;
        if (where.status) {
          if (typeof where.status === 'string' && r.status !== where.status) return false;
          if (where.status.in && !where.status.in.includes(r.status)) return false;
        }
        return true;
      });
      return filtered[filtered.length - 1] || null;
    });

    vi.spyOn(prisma.report, 'create').mockImplementation(async ({ data }: any) => {
      const record = {
        ...data,
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date(),
      };
      reportsStore.set(record.id, record);
      return record;
    });

    vi.spyOn(prisma.report, 'update').mockImplementation(async ({ where, data }: any) => {
      const existing = reportsStore.get(where.id);
      if (!existing) throw new Error(`Report ${where.id} not found`);
      const updated = { ...existing, ...data, updatedAt: new Date() };
      reportsStore.set(where.id, updated);
      return updated;
    });

    vi.spyOn(prisma.order, 'findFirst').mockImplementation(async ({ where }: any) => {
      const all = Array.from(ordersStore.values());
      const filtered = all.filter((o) => {
        if (where.userId && o.userId !== where.userId) return false;
        if (where.status && o.status !== where.status) return false;
        if (where.reportType && o.reportType !== where.reportType) return false;
        return true;
      });
      return filtered[filtered.length - 1] || null;
    });

    app = buildApp();
    await app.ready();

    token1 = (app as any).jwt.sign({ sub: user1.id, role: 'USER' });
    token2 = (app as any).jwt.sign({ sub: user2.id, role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    reportsStore.clear();
    ordersStore.clear();
  });

  // --- 1. PRO HOROSCOPE (CAREER_PROSITY) GENERATION & VECTOR PDF ---
  it('1. Generates Pro Horoscope (CAREER_PROSITY) with Shodashvargas, Shadbala, and Bhava Bala', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${token1}` },
      payload: {
        birthProfileId: groomProfile.id,
        reportType: 'CAREER_PROSITY',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.id).toBeDefined();
    expect(body.reportType).toBe('CAREER_PROSITY');
    expect(body.status).toBe('COMPLETED');
    expect(body.report.title).toBe('Pro Horoscope & Multi-Divisional Shodashvarga Dossier');
    expect(body.report.vargas).toBeDefined();
    expect(body.report.vargas.length).toBeGreaterThanOrEqual(4); // D1, D9, D10, D7, D12
    expect(body.report.shadbala).toBeDefined();
    expect(body.report.bhavaBala).toBeDefined();
    expect(body.report.remedies).toBeDefined();

    // Download PDF
    const pdfRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${body.id}/download-file`,
      headers: { authorization: `Bearer ${token1}` },
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    const pdf = pdfRes.rawPayload.toString('utf-8');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.includes('%%EOF')).toBe(true);
    expect(pdf.includes('PRO HOROSCOPE')).toBe(true);
    expect(pdf.includes('SHODASHVARGA')).toBe(true);
  });

  // --- 2. MATCHMAKING REPORT (MARRIAGE_COMPATIBILITY) DUAL PROFILE VALIDATION ---
  it('2. Rejects Matchmaking report when partnerProfileId is missing or identical', async () => {
    // Missing partner profile
    const missingRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${token1}` },
      payload: {
        birthProfileId: groomProfile.id,
        reportType: 'MARRIAGE_COMPATIBILITY',
      },
    });
    expect(missingRes.statusCode).toBe(400);
    const missingBody = JSON.parse(missingRes.payload);
    expect(missingBody.error.message).toContain('Partner birth profile is required');

    // Identical partner profile
    const dupRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${token1}` },
      payload: {
        birthProfileId: groomProfile.id,
        partnerProfileId: groomProfile.id,
        reportType: 'MARRIAGE_COMPATIBILITY',
      },
    });
    expect(dupRes.statusCode).toBe(400);
    const dupBody = JSON.parse(dupRes.payload);
    expect(dupBody.error.message).toContain('Partner birth profile must be distinct');
  });

  // --- 3. MATCHMAKING REPORT GENERATION & 36-POINT ASHTAKOOTA MILAN ---
  it('3. Generates Matchmaking Report with 36-point Guna Milan & Manglik comparative evaluation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${token1}` },
      payload: {
        birthProfileId: groomProfile.id,
        partnerProfileId: brideProfile.id,
        reportType: 'MARRIAGE_COMPATIBILITY',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.id).toBeDefined();
    expect(body.reportType).toBe('MARRIAGE_COMPATIBILITY');
    expect(body.report.title).toBe('Marriage & Relationship Compatibility Report');
    expect(body.report.gunaMilan).toBeDefined();
    expect(body.report.gunaMilan.totalScore).toBeGreaterThanOrEqual(0);
    expect(body.report.gunaMilan.maxScore).toBe(36);
    expect(body.report.manglikComparison).toBeDefined();
    expect(body.report.profile1).toBeDefined();
    expect(body.report.profile2).toBeDefined();

    // Verify PDF download
    const pdfRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${body.id}/download-file`,
      headers: { authorization: `Bearer ${token1}` },
    });

    expect(pdfRes.statusCode).toBe(200);
    const pdf = pdfRes.rawPayload.toString('utf-8');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf.includes('VEDIC KUNDLI MILAN')).toBe(true);
    expect(pdf.includes('ASHTAKOOTA')).toBe(true);
  });

  // --- 4. ASYNC WORKER PIPELINE EXECUTION FOR ALL TIERS ---
  it('4. Asynchronously processes Pro Horoscope and Matchmaking jobs through worker pipeline', async () => {
    // Enqueue async Matchmaking job
    const asyncRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${token1}` },
      payload: {
        birthProfileId: groomProfile.id,
        partnerProfileId: brideProfile.id,
        reportType: 'MARRIAGE_COMPATIBILITY',
        async: true,
      },
    });

    expect(asyncRes.statusCode).toBe(201);
    const asyncBody = JSON.parse(asyncRes.payload);
    expect(asyncBody.reportId).toBeDefined();
    expect(asyncBody.status).toBe('QUEUED');
    expect(asyncBody.stage).toBe('QUEUED');

    // Execute worker pipeline
    await careerReportWorker.executeReportPipeline(asyncBody.reportId);

    // Verify DB record reaches COMPLETED with storageKey
    const record = reportsStore.get(asyncBody.reportId);
    expect(record.status).toBe('COMPLETED');
    expect(record.stage).toBe('COMPLETED');
    expect(record.progress).toBe(100);
    expect(record.storageKey).toBe(`reports/${user1.id}/${asyncBody.reportId}.pdf`);
    expect(record.fileSize).toBeGreaterThan(1000);
    expect(record.completedAt).toBeDefined();

    // Verify access URL
    const accessRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${asyncBody.reportId}/access`,
      headers: { authorization: `Bearer ${token1}` },
    });
    expect(accessRes.statusCode).toBe(200);
    const accessBody = JSON.parse(accessRes.payload);
    expect(accessBody.accessUrl).toBeDefined();
    expect(accessBody.fileName).toContain('marriage-compatibility');
  });

  // --- 5. ENTITLEMENT ACCESS VERIFICATION ---
  it('5. Evaluates featureAccessService for paid orders on consumer report types', async () => {
    // Before order, free tier check
    const accessBefore = await featureAccessService.evaluateFeatureAccess(user1.id, 'CAREER_PROSITY');
    expect(accessBefore.allowed).toBe(false);
    expect(accessBefore.reason).toBe('NO_ACTIVE_ORDER');

    // Create completed order
    ordersStore.set('order-1', {
      id: 'order-1',
      userId: user1.id,
      reportType: 'CAREER_PROSITY',
      status: 'PAID',
      razorpayOrderId: 'order_rzp_12345',
      amount: 69900,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // After order, access is granted
    const accessAfter = await featureAccessService.evaluateFeatureAccess(user1.id, 'CAREER_PROSITY');
    expect(accessAfter.allowed).toBe(true);
    expect(accessAfter.reason).toBe('PAID_PURCHASE_VERIFIED');
  });
});
