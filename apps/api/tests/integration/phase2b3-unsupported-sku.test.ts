import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { finalFailureMessage } from '../../src/services/report-retry.policy';

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

  /**
   * Runs the worker on an in-memory report: the queue's fenced claim / fail SQL is
   * substituted with equivalents over reportsStore (no real report rows exist in this suite).
   */
  async function runWorkerWithInMemoryQueue(
    worker: typeof import('../../src/services/report-worker.service').careerReportWorker,
    reportId: string
  ) {
    const claimSpy = vi.spyOn(postgresQueueService, 'claimJobById').mockImplementation(async (id: string) => {
      const r = reportsStore.get(id);
      if (!r || r.status !== 'QUEUED') return null;
      Object.assign(r, { status: 'CALCULATING', stage: 'CALCULATING', claimToken: 'claim-2b3', claimVersion: (r.claimVersion ?? 0) + 1 });
      return { id, claimToken: 'claim-2b3', claimVersion: r.claimVersion, claimExpiresAt: new Date(Date.now() + 60000), executionAttempts: 1, recoveryAttempts: 0, reportType: r.reportType, orderId: null, userId: r.userId, birthProfileId: r.birthProfileId, fulfillmentUnitId: null } as any;
    });
    const failSpy = vi.spyOn(postgresQueueService, 'failJob').mockImplementation(async (id: string, token: string, version: number, errorCode: string, errorMessage: string) => {
      const r = reportsStore.get(id);
      if (!r || r.claimToken !== token || r.claimVersion !== version) return false;
      Object.assign(r, { status: 'FAILED', stage: 'FAILED', progress: 0, errorCode, errorMessage, failedAt: new Date(), claimToken: null, claimExpiresAt: null });
      return true;
    });
    const rescheduleSpy = vi.spyOn(postgresQueueService, 'rescheduleJob');
    const updateManySpy = vi.spyOn(prisma.report, 'updateMany').mockImplementation(async ({ where, data }: any) => {
      const r = reportsStore.get(where.id);
      if (!r || (where.claimToken !== undefined && r.claimToken !== where.claimToken)) return { count: 0 } as any;
      Object.assign(r, data);
      return { count: 1 } as any;
    });
    try {
      await worker.executeReportPipeline(reportId);
      expect(claimSpy).toHaveBeenCalledTimes(1);
      expect(failSpy).toHaveBeenCalledTimes(1);
      expect(rescheduleSpy).not.toHaveBeenCalled();
    } finally {
      claimSpy.mockRestore();
      failSpy.mockRestore();
      rescheduleSpy.mockRestore();
      updateManySpy.mockRestore();
    }
  }

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

  it('1. Rejects synchronous generation of GUPTA_NADI_DOSSIER with 400 REPORT_TYPE_NOT_AVAILABLE', async () => {
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
    expect(body.error?.code).toBe('REPORT_TYPE_NOT_AVAILABLE');
    expect(body.error?.message).toContain('is not available');
    expect(body.error?.message).toContain('no genuine generator exists');

    // Verify NO report record was created in database store
    expect(reportsStore.size).toBe(0);
  });

  it('2. Rejects synchronous generation of CHILDBIRTH_FAMILY with 400 REPORT_TYPE_NOT_AVAILABLE', async () => {
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
    expect(body.error?.code).toBe('REPORT_TYPE_NOT_AVAILABLE');
    expect(body.error?.message).toContain('is not available');
    expect(body.error?.message).toContain('no genuine generator exists');

    expect(reportsStore.size).toBe(0);
  });

  it('3. Rejects asynchronous queueing of GUPTA_NADI_DOSSIER with 400 REPORT_TYPE_NOT_AVAILABLE', async () => {
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
    expect(body.error?.code).toBe('REPORT_TYPE_NOT_AVAILABLE');

    expect(reportsStore.size).toBe(0);
  });

  it('4. Rejects asynchronous queueing of CHILDBIRTH_FAMILY with 400 REPORT_TYPE_NOT_AVAILABLE', async () => {
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
    expect(body.error?.code).toBe('REPORT_TYPE_NOT_AVAILABLE');

    expect(reportsStore.size).toBe(0);
  });

  it('5. Worker execution on GUPTA_NADI_DOSSIER marks report FAILED with REPORT_TYPE_NOT_AVAILABLE', async () => {
    const { careerReportWorker } = await import('../../src/services/report-worker.service');
    const legacyReportId = '99999999-aaaa-9999-aaaa-999999999991';

    reportsStore.set(legacyReportId, {
      id: legacyReportId,
      userId: testUser.id,
      birthProfileId: testProfile.id,
      reportType: 'GUPTA_NADI_DOSSIER',
      status: 'QUEUED',
      stage: 'QUEUED',
      createdAt: new Date(),
      expectedDeliveryAt: null,
      generationFailures: 0,
    });

    await runWorkerWithInMemoryQueue(careerReportWorker, legacyReportId);

    // REPORT_TYPE_NOT_AVAILABLE is permanent under the retry policy: failed at once, never rescheduled.
    const updated = reportsStore.get(legacyReportId);
    expect(updated.status).toBe('FAILED');
    expect(updated.stage).toBe('FAILED');
    expect(updated.errorCode).toBe('REPORT_TYPE_NOT_AVAILABLE');
    expect(updated.errorMessage).toBe(finalFailureMessage({ action: 'fail', reason: 'PERMANENT_ERROR', failureClass: 'permanent' }, 'REPORT_TYPE_NOT_AVAILABLE', 1));
    expect(updated.retryAfter ?? null).toBeNull();
    expect(updated.lastAttemptErrorCode).toBe('REPORT_TYPE_NOT_AVAILABLE');
    expect(updated.lastAttemptErrorMessage).toContain('is not available');
    expect(updated.claimToken).toBeNull();
  });

  it('6. Worker execution on CHILDBIRTH_FAMILY marks report FAILED with REPORT_TYPE_NOT_AVAILABLE', async () => {
    const { careerReportWorker } = await import('../../src/services/report-worker.service');
    const legacyReportId = '99999999-aaaa-9999-aaaa-999999999992';

    reportsStore.set(legacyReportId, {
      id: legacyReportId,
      userId: testUser.id,
      birthProfileId: testProfile.id,
      reportType: 'CHILDBIRTH_FAMILY',
      status: 'QUEUED',
      stage: 'QUEUED',
      createdAt: new Date(),
      expectedDeliveryAt: null,
      generationFailures: 0,
    });

    await runWorkerWithInMemoryQueue(careerReportWorker, legacyReportId);

    // REPORT_TYPE_NOT_AVAILABLE is permanent under the retry policy: failed at once, never rescheduled.
    const updated = reportsStore.get(legacyReportId);
    expect(updated.status).toBe('FAILED');
    expect(updated.stage).toBe('FAILED');
    expect(updated.errorCode).toBe('REPORT_TYPE_NOT_AVAILABLE');
    expect(updated.errorMessage).toBe(finalFailureMessage({ action: 'fail', reason: 'PERMANENT_ERROR', failureClass: 'permanent' }, 'REPORT_TYPE_NOT_AVAILABLE', 1));
    expect(updated.retryAfter ?? null).toBeNull();
    expect(updated.lastAttemptErrorCode).toBe('REPORT_TYPE_NOT_AVAILABLE');
    expect(updated.lastAttemptErrorMessage).toContain('is not available');
    expect(updated.claimToken).toBeNull();
  });
});
