import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';

describe('Phase 2B.3 Unsupported SKU & Error Handling Integration Suite', () => {
  let app: FastifyInstance;

  const testUser = {
    id: '77777777-aaaa-7777-aaaa-777777777777',
    email: 'phase2b3_sku@astrosushil.com',
    role: 'USER',
  };

  let userToken: string;

  const testProfile = {
    id: '88888888-aaaa-8888-aaaa-888888888888',
    userId: testUser.id,
    name: 'Vikram Mehta',
    dateOfBirth: '1991-03-20',
    timeOfBirth: '11:45:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const reportsStore = new Map<string, any>();

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    vi.spyOn(prisma.birthProfile, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.id === testProfile.id) {
        return testProfile as any;
      }
      return null;
    });

    vi.spyOn(prisma.report, 'create').mockImplementation(async ({ data }: any) => {
      reportsStore.set(data.id, data);
      return data as any;
    });

    vi.spyOn(prisma.report, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.id) {
        return reportsStore.get(where.id) || null;
      }
      return null;
    });

    vi.spyOn(prisma.report, 'update').mockImplementation(async ({ where, data }: any) => {
      const existing = reportsStore.get(where.id) || {};
      const updated = { ...existing, ...data };
      reportsStore.set(where.id, updated);
      return updated as any;
    });

    vi.spyOn(prisma.report, 'findFirst').mockImplementation(async () => null);

    userToken = app.jwt.sign({
      sub: testUser.id,
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it('1. Rejects synchronous generation of GUPTA_NADI_DOSSIER with 400 REPORT_TYPE_NOT_SUPPORTED', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        birthProfileId: testProfile.id,
        reportType: 'GUPTA_NADI_DOSSIER',
        async: false,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error?.code).toBe('REPORT_TYPE_NOT_SUPPORTED');
    expect(body.error?.message).toContain('not supported');

    // Verify NO report record was created in database store
    expect(reportsStore.size).toBe(0);
  });

  it('2. Rejects synchronous generation of CHILDBIRTH_FAMILY with 400 REPORT_TYPE_NOT_SUPPORTED', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        birthProfileId: testProfile.id,
        reportType: 'CHILDBIRTH_FAMILY',
        async: false,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error?.code).toBe('REPORT_TYPE_NOT_SUPPORTED');
    expect(body.error?.message).toContain('not supported');

    expect(reportsStore.size).toBe(0);
  });

  it('3. Rejects asynchronous queueing of GUPTA_NADI_DOSSIER with 400 REPORT_TYPE_NOT_SUPPORTED', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        birthProfileId: testProfile.id,
        reportType: 'GUPTA_NADI_DOSSIER',
        async: true,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error?.code).toBe('REPORT_TYPE_NOT_SUPPORTED');

    expect(reportsStore.size).toBe(0);
  });

  it('4. Rejects asynchronous queueing of CHILDBIRTH_FAMILY with 400 REPORT_TYPE_NOT_SUPPORTED', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: {
        authorization: `Bearer ${userToken}`,
      },
      payload: {
        birthProfileId: testProfile.id,
        reportType: 'CHILDBIRTH_FAMILY',
        async: true,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error?.code).toBe('REPORT_TYPE_NOT_SUPPORTED');

    expect(reportsStore.size).toBe(0);
  });

  it('5. Worker execution on GUPTA_NADI_DOSSIER marks report FAILED with REPORT_TYPE_NOT_SUPPORTED', async () => {
    const { careerReportWorker } = await import('../../src/services/report-worker.service');
    const legacyReportId = '99999999-aaaa-9999-aaaa-999999999991';

    reportsStore.set(legacyReportId, {
      id: legacyReportId,
      userId: testUser.id,
      birthProfileId: testProfile.id,
      reportType: 'GUPTA_NADI_DOSSIER',
      status: 'QUEUED',
      stage: 'QUEUED',
    });

    await careerReportWorker.executeReportPipeline(legacyReportId);

    const updated = reportsStore.get(legacyReportId);
    expect(updated.status).toBe('FAILED');
    expect(updated.stage).toBe('FAILED');
    expect(updated.errorCode).toBe('REPORT_TYPE_NOT_SUPPORTED');
    expect(updated.errorMessage).toContain('not supported');
  });

  it('6. Worker execution on CHILDBIRTH_FAMILY marks report FAILED with REPORT_TYPE_NOT_SUPPORTED', async () => {
    const { careerReportWorker } = await import('../../src/services/report-worker.service');
    const legacyReportId = '99999999-aaaa-9999-aaaa-999999999992';

    reportsStore.set(legacyReportId, {
      id: legacyReportId,
      userId: testUser.id,
      birthProfileId: testProfile.id,
      reportType: 'CHILDBIRTH_FAMILY',
      status: 'QUEUED',
      stage: 'QUEUED',
    });

    await careerReportWorker.executeReportPipeline(legacyReportId);

    const updated = reportsStore.get(legacyReportId);
    expect(updated.status).toBe('FAILED');
    expect(updated.stage).toBe('FAILED');
    expect(updated.errorCode).toBe('REPORT_TYPE_NOT_SUPPORTED');
    expect(updated.errorMessage).toContain('not supported');
  });
});
