/**
 * Report language (`en` | `hi`) through the reports API and the worker, without a
 * database or an LLM: Prisma, the queue's fenced SQL operations, storage and
 * notifications are substituted; validation, de-duplication and the hand-over of
 * the stored language to the generator run for real.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { reportPlatform } from '@astro/report-engine';
import { prisma } from '../../src/services/prisma.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { storageService } from '../../src/services/storage.service';
import { distributedLockService } from '../../src/services/distributed-lock.service';
import { featureAccessService } from '../../src/services/feature-access.service';
import { fulfillmentService } from '../../src/modules/fulfillment/fulfillment.service';
import { notificationService } from '../../src/modules/notifications/notification.service';
import { careerReportWorker, reportFileName } from '../../src/services/report-worker.service';
import { platformReportLanguages, normalizeReportLanguage } from '../../src/services/platform-report.runner';
import { reportsService, resolveReportLanguage, assertReportLanguageUnchanged } from '../../src/modules/reports/reports.service';
import { createReportSchema, createCareerReportSchema } from '../../src/modules/reports/reports.schemas';
import { buildApp } from '../../src/app';
import { fakePlatformResult } from '../helpers/platform-report-stub';

const PROFILE_ID = '11111111-1111-4111-8111-111111111111';
const ORDER_ID = '22222222-2222-4222-8222-222222222222';
const admin = { id: 'admin-1', role: 'ADMIN' };
const customer = { id: 'user-1', role: 'USER' };
const profile = { id: PROFILE_ID, userId: 'user-1', name: 'Asha Rao', updatedAt: new Date('2026-11-01T00:00:00Z') };

/** Makes the registry report these languages for every report (availability is read at call time). */
function registryLanguages(languages: Array<'en' | 'hi'>) {
  return vi.spyOn(reportPlatform.ReportRegistry, 'languages').mockReturnValue(languages);
}

describe('report language: request validation', () => {
  it('accepts en, hi and no language; rejects anything else', () => {
    const base = { birthProfileId: PROFILE_ID, reportType: 'KUNDLI' };
    expect(createReportSchema.parse(base).language).toBeUndefined();
    expect(createReportSchema.parse({ ...base, language: 'en' }).language).toBe('en');
    expect(createReportSchema.parse({ ...base, language: 'hi' }).language).toBe('hi');
    expect(createReportSchema.safeParse({ ...base, language: 'fr' }).success).toBe(false);
    expect(createReportSchema.safeParse({ ...base, language: 'HI' }).success).toBe(false);
    expect(createCareerReportSchema.parse({ birthProfileId: PROFILE_ID, language: 'hi' }).language).toBe('hi');
    expect(createCareerReportSchema.safeParse({ birthProfileId: PROFILE_ID, language: 'hindi' }).success).toBe(false);
  });

  it('treats an unknown or missing stored value as English', () => {
    expect(normalizeReportLanguage('hi')).toBe('hi');
    expect(normalizeReportLanguage('en')).toBe('en');
    expect(normalizeReportLanguage(undefined)).toBe('en');
    expect(normalizeReportLanguage(null)).toBe('en');
    expect(normalizeReportLanguage('English')).toBe('en');
  });
});

describe('report language: availability comes from the registry', () => {
  afterEach(() => vi.restoreAllMocks());

  it('asks the registry for the report serving the ReportType', () => {
    const languages = registryLanguages(['en', 'hi']);
    expect(platformReportLanguages('KUNDLI')).toEqual(['en', 'hi']);
    expect(languages).toHaveBeenCalledWith(reportPlatform.ReportRegistry.byReportType('KUNDLI')!.id);
    languages.mockReturnValue(['en']);
    expect(platformReportLanguages('KUNDLI')).toEqual(['en']);
  });

  it('has no languages for a ReportType without a generator', () => {
    expect(platformReportLanguages('GUPTA_NADI_DOSSIER')).toEqual([]);
    expect(platformReportLanguages('NOT_A_REPORT')).toEqual([]);
  });

  it('defaults to English and rejects an edition the report does not have', () => {
    registryLanguages(['en']);
    expect(resolveReportLanguage('KUNDLI')).toBe('en');
    expect(resolveReportLanguage('KUNDLI', 'en')).toBe('en');
    expect(() => resolveReportLanguage('KUNDLI', 'hi')).toThrowError(
      expect.objectContaining({ code: 'REPORT_LANGUAGE_NOT_AVAILABLE', statusCode: 400 })
    );
    registryLanguages(['en', 'hi']);
    expect(resolveReportLanguage('KUNDLI', 'hi')).toBe('hi');
  });

  it('keeps the language of an existing report', () => {
    expect(() => assertReportLanguageUnchanged({ language: 'en' }, 'hi')).toThrowError(
      expect.objectContaining({ code: 'REPORT_LANGUAGE_FIXED', statusCode: 409 })
    );
    expect(() => assertReportLanguageUnchanged({ language: 'hi' }, 'hi')).not.toThrow();
    expect(() => assertReportLanguageUnchanged({ language: 'hi' }, undefined)).not.toThrow();
    expect(() => assertReportLanguageUnchanged(null, 'hi')).not.toThrow();
    // A row from before the column existed is English.
    expect(() => assertReportLanguageUnchanged({}, 'en')).not.toThrow();
  });
});

describe('report language: creating a report', () => {
  let create: any;
  let update: any;
  let findFirst: any;
  let enqueue: any;
  let claimOrder: any;

  beforeEach(() => {
    vi.spyOn(distributedLockService, 'withDistributedLock').mockImplementation(async (_key: string, fn: any) => fn());
    vi.spyOn(featureAccessService, 'evaluateFeatureAccess').mockResolvedValue({ allowed: true, source: 'ADMIN' } as any);
    vi.spyOn(prisma.birthProfile, 'findUnique').mockResolvedValue(profile as any);
    findFirst = vi.spyOn(prisma.report, 'findFirst').mockResolvedValue(null);
    create = vi.spyOn(prisma.report, 'create').mockImplementation((async (args: any) => args.data) as any);
    update = vi.spyOn(prisma.report, 'update').mockResolvedValue({} as any);
    vi.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined as any);
    vi.spyOn(fulfillmentService, 'reconcileFulfillmentUnit').mockResolvedValue(undefined as any);
    enqueue = vi.spyOn(careerReportWorker, 'enqueueReportJob').mockResolvedValue(true as any);
    claimOrder = vi.spyOn(reportsService as any, 'validateAndClaimOrder');
  });

  afterEach(() => vi.restoreAllMocks());

  it('rejects an unavailable language before any order, unit or report is touched', async () => {
    registryLanguages(['en']);
    const orderLookup = vi.spyOn(prisma.order, 'findFirst');
    const orderById = vi.spyOn(prisma.order, 'findUnique');
    const units = vi.spyOn(prisma.fulfillmentUnit, 'findMany');

    for (const reportType of ['KUNDLI', 'CAREER'] as const) {
      await expect(
        reportsService.createReportJob({ birthProfileId: PROFILE_ID, reportType, orderId: ORDER_ID, language: 'hi' }, customer)
      ).rejects.toMatchObject({ code: 'REPORT_LANGUAGE_NOT_AVAILABLE', statusCode: 400 });
    }
    await expect(
      reportsService.createCareerReportJob({ birthProfileId: PROFILE_ID, orderId: ORDER_ID, language: 'hi' }, customer)
    ).rejects.toMatchObject({ code: 'REPORT_LANGUAGE_NOT_AVAILABLE', statusCode: 400 });

    expect(claimOrder).not.toHaveBeenCalled();
    expect(orderLookup).not.toHaveBeenCalled();
    expect(orderById).not.toHaveBeenCalled();
    expect(units).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('stores the requested language on a new report and returns it', async () => {
    registryLanguages(['en', 'hi']);
    const result = await reportsService.createReportJob({ birthProfileId: PROFILE_ID, reportType: 'KUNDLI', language: 'hi' }, admin);
    expect(create.mock.calls[0][0].data.language).toBe('hi');
    expect(result).toMatchObject({ status: 'QUEUED', language: 'hi', reused: false });
    expect(enqueue).toHaveBeenCalledWith(result.reportId);
    // Reuse lookups only consider reports in the requested language.
    expect(findFirst.mock.calls.every((c: any[]) => c[0].where.language === 'hi')).toBe(true);
  });

  it('creates an English report when the request names no language (existing clients)', async () => {
    const result = await reportsService.createReportJob({ birthProfileId: PROFILE_ID, reportType: 'KUNDLI' }, admin);
    expect(create.mock.calls[0][0].data.language).toBe('en');
    expect(result.language).toBe('en');
    // No language filter is added: the lookups are exactly as before.
    expect(findFirst.mock.calls.every((c: any[]) => !('language' in c[0].where))).toBe(true);
  });

  it('stores the language on a career report (both career entry points)', async () => {
    registryLanguages(['en', 'hi']);
    const viaGeneric = await reportsService.createReportJob({ birthProfileId: PROFILE_ID, reportType: 'CAREER', language: 'hi' }, admin);
    const direct = await reportsService.createCareerReportJob({ birthProfileId: PROFILE_ID }, admin);
    expect(create.mock.calls[0][0].data.language).toBe('hi');
    expect(viaGeneric.language).toBe('hi');
    expect(create.mock.calls[1][0].data.language).toBe('en');
    expect(direct.language).toBe('en');
  });

  it('refuses a different language for the report already bound to the paid slot', async () => {
    registryLanguages(['en', 'hi']);
    claimOrder.mockResolvedValue({
      order: { id: ORDER_ID },
      targetFulfillmentUnit: { id: 'unit-1' },
      existingReport: { id: 'rep-en', status: 'COMPLETED', language: 'en', createdAt: new Date('2026-11-20T00:00:00Z') },
    });
    await expect(
      reportsService.createReportJob({ birthProfileId: PROFILE_ID, reportType: 'KUNDLI', orderId: ORDER_ID, language: 'hi' }, customer)
    ).rejects.toMatchObject({ code: 'REPORT_LANGUAGE_FIXED', statusCode: 409 });
    await expect(
      reportsService.createCareerReportJob({ birthProfileId: PROFILE_ID, orderId: ORDER_ID, language: 'hi', forceRegenerate: true }, customer)
    ).rejects.toMatchObject({ code: 'REPORT_LANGUAGE_FIXED', statusCode: 409 });
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('returns the existing report with its own language when the request names none', async () => {
    registryLanguages(['en', 'hi']);
    claimOrder.mockResolvedValue({
      order: { id: ORDER_ID },
      targetFulfillmentUnit: { id: 'unit-1' },
      existingReport: { id: 'rep-hi', status: 'ANALYZING', stage: 'ANALYZING', progress: 40, language: 'hi' },
    });
    const result = await reportsService.createReportJob({ birthProfileId: PROFILE_ID, reportType: 'KUNDLI', orderId: ORDER_ID }, customer);
    expect(result).toMatchObject({ reportId: 'rep-hi', reused: true, active: true, language: 'hi' });
    expect(create).not.toHaveBeenCalled();
  });

  it('regeneration re-queues the bound report without changing its language', async () => {
    registryLanguages(['en', 'hi']);
    claimOrder.mockResolvedValue({
      order: { id: ORDER_ID },
      targetFulfillmentUnit: { id: 'unit-1' },
      existingReport: { id: 'rep-hi', status: 'COMPLETED', language: 'hi', createdAt: new Date('2026-11-20T00:00:00Z') },
    });
    const result = await reportsService.createReportJob(
      { birthProfileId: PROFILE_ID, reportType: 'KUNDLI', orderId: ORDER_ID, forceRegenerate: true },
      customer
    );
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].where).toEqual({ id: 'rep-hi' });
    expect('language' in update.mock.calls[0][0].data).toBe(false);
    expect(create).not.toHaveBeenCalled();
    expect(result).toMatchObject({ reportId: 'rep-hi', status: 'QUEUED', language: 'hi', reused: false });
  });

  it('career regeneration keeps the stored language and refuses another', async () => {
    registryLanguages(['en', 'hi']);
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({ id: 'rep-hi', userId: 'user-1', birthProfileId: PROFILE_ID, orderId: null, language: 'hi' } as any);
    const createCareer = vi.spyOn(reportsService, 'createCareerReportJob').mockResolvedValue({ reportId: 'rep-hi' } as any);

    await reportsService.regenerateCareerReport('rep-hi', customer);
    expect(createCareer).toHaveBeenCalledWith({ birthProfileId: PROFILE_ID, forceRegenerate: true, orderId: undefined, language: 'hi' }, customer);

    await expect(reportsService.regenerateCareerReport('rep-hi', customer, 'en')).rejects.toMatchObject({ code: 'REPORT_LANGUAGE_FIXED', statusCode: 409 });
    expect(createCareer).toHaveBeenCalledTimes(1);
  });
});

describe('report language: read responses', () => {
  afterEach(() => vi.restoreAllMocks());

  const row = (language?: string) => ({
    id: 'rep-1', userId: 'user-1', birthProfileId: PROFILE_ID, reportType: 'KUNDLI', status: 'COMPLETED', stage: 'COMPLETED',
    progress: 100, createdAt: new Date('2026-11-20T00:00:00Z'), order: null, birthProfile: profile, metadata: {},
    ...(language === undefined ? {} : { language }),
  });

  it('returns the language in status, detail and list', async () => {
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue(row('hi') as any);
    vi.spyOn(prisma.report, 'findMany').mockResolvedValue([row('hi'), row('en')] as any);
    expect((await reportsService.getReportStatusOnly('rep-1', customer)).language).toBe('hi');
    expect((await reportsService.getReportStatus('rep-1', customer)).language).toBe('hi');
    expect((await reportsService.getUserReports(customer)).map((r: any) => r.language)).toEqual(['hi', 'en']);
  });

  it('reports English for a row without the column value', async () => {
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue(row() as any);
    expect((await reportsService.getReportStatusOnly('rep-1', customer)).language).toBe('en');
    expect((await reportsService.getReportStatus('rep-1', customer)).language).toBe('en');
  });
});

describe('report language: worker', () => {
  afterEach(() => vi.restoreAllMocks());

  it('names the Hindi PDF differently and leaves English names unchanged', () => {
    const id = 'abcdef12-0000-4000-8000-000000000000';
    expect(reportFileName('RAHU_KETU_TRANSIT', 'Asha Rao', id, 'en')).toBe('rahu-ketu-transit-asha-rao-abcdef12.pdf');
    expect(reportFileName('RAHU_KETU_TRANSIT', 'Asha Rao', id)).toBe('rahu-ketu-transit-asha-rao-abcdef12.pdf');
    expect(reportFileName('RAHU_KETU_TRANSIT', 'Asha Rao', id, 'hi')).toBe('rahu-ketu-transit-asha-rao-abcdef12-hi.pdf');
  });

  async function runPipeline(reportId: string, language: string | undefined) {
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({
      id: reportId, userId: 'user-1', birthProfileId: PROFILE_ID, reportType: 'KUNDLI', metadata: {}, generationFailures: 0,
      expectedDeliveryAt: new Date('2026-11-25T00:00:00Z'), createdAt: new Date('2026-11-24T00:00:00Z'),
      orderId: null, fulfillmentUnitId: null, order: null, birthProfile: profile,
      ...(language === undefined ? {} : { language }),
    } as any);
    vi.spyOn(prisma.report, 'update').mockResolvedValue({} as any);
    vi.spyOn(postgresQueueService, 'updateJobStatus').mockResolvedValue(true);
    vi.spyOn(postgresQueueService, 'updateJobProgress').mockResolvedValue(true as any);
    vi.spyOn(postgresQueueService, 'touchHeartbeat').mockResolvedValue(true as any);
    const complete = vi.spyOn(postgresQueueService, 'completeJob').mockResolvedValue(true as any);
    const upload = vi.spyOn(storageService, 'upload').mockResolvedValue({ fileSize: 4113 } as any);
    vi.spyOn(notificationService, 'sendNotification').mockResolvedValue(undefined as any);
    const generate = vi.spyOn(careerReportWorker, 'generatePlatformReport').mockImplementation(async (input) => fakePlatformResult(input.reportType));

    await careerReportWorker.executeReportPipeline(reportId, 'tok', 1);
    return { generate, upload, complete };
  }

  it('passes the stored language to the generator and stores each row under its own key', async () => {
    const hi = await runPipeline('aaaaaaaa-0000-4000-8000-000000000001', 'hi');
    expect(hi.generate.mock.calls[0][0].language).toBe('hi');
    const hiKey = hi.upload.mock.calls[0][0].key;
    expect(hi.upload.mock.calls[0][0].metadata).toMatchObject({ language: 'hi' });
    expect(hi.complete.mock.calls[0][3]).toBe(hiKey);
    expect(hi.complete.mock.calls[0][4]).toBe('kundli-asha-rao-aaaaaaaa-hi.pdf');
    vi.restoreAllMocks();

    const en = await runPipeline('bbbbbbbb-0000-4000-8000-000000000002', 'en');
    expect(en.generate.mock.calls[0][0].language).toBe('en');
    const enKey = en.upload.mock.calls[0][0].key;
    expect(en.complete.mock.calls[0][4]).toBe('kundli-asha-rao-bbbbbbbb.pdf');
    // Same person, same report type, two languages: two rows, two storage keys, two file names.
    expect(enKey).not.toBe(hiKey);
    expect(enKey).toBe('reports/user-1/bbbbbbbb-0000-4000-8000-000000000002.pdf');
  });

  it('generates in English for a row that has no language value', async () => {
    const { generate } = await runPipeline('cccccccc-0000-4000-8000-000000000003', undefined);
    expect(generate.mock.calls[0][0].language).toBe('en');
  });
});

describe('report language: HTTP contract', () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    token = app.jwt.sign({ sub: 'user-1', role: 'USER' });
  });
  afterAll(async () => {
    await app.close();
  });
  afterEach(() => vi.restoreAllMocks());

  const post = (url: string, payload: Record<string, unknown>) =>
    app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${token}`, 'x-request-id': 'req-lang-0001' }, payload });

  it('answers an unavailable language with the standard error shape before any lookup', async () => {
    registryLanguages(['en']);
    const profileLookup = vi.spyOn(prisma.birthProfile, 'findUnique');
    for (const [url, payload] of [
      ['/api/v1/reports/generate', { birthProfileId: PROFILE_ID, reportType: 'KUNDLI', language: 'hi' }],
      ['/api/v1/reports', { birthProfileId: PROFILE_ID, reportType: 'LOVE', orderId: ORDER_ID, language: 'hi' }],
      ['/api/v1/reports/career', { birthProfileId: PROFILE_ID, language: 'hi' }],
    ] as const) {
      const res = await post(url, payload);
      expect(res.statusCode, url).toBe(400);
      expect(res.json(), url).toEqual({
        error: { code: 'REPORT_LANGUAGE_NOT_AVAILABLE', message: expect.stringContaining('"hi"'), requestId: 'req-lang-0001' },
      });
    }
    expect(profileLookup).not.toHaveBeenCalled();
  });

  it('rejects a language value outside en | hi as a validation error', async () => {
    for (const [url, payload] of [
      ['/api/v1/reports/generate', { birthProfileId: PROFILE_ID, reportType: 'KUNDLI', language: 'fr' }],
      ['/api/v1/reports/career', { birthProfileId: PROFILE_ID, language: 'fr' }],
    ] as const) {
      const res = await post(url, payload);
      expect(res.statusCode, url).toBe(400);
      expect(res.json().error.code, url).toBe('VALIDATION_ERROR');
    }
  });

  it('passes the language of each create endpoint to the service', async () => {
    const generic = vi.spyOn(reportsService, 'createReportJob').mockResolvedValue({ reportId: 'r1', language: 'hi' } as any);
    const career = vi.spyOn(reportsService, 'createCareerReportJob').mockResolvedValue({ reportId: 'r2', language: 'hi' } as any);

    const res = await post('/api/v1/reports/generate', { birthProfileId: PROFILE_ID, reportType: 'KUNDLI', language: 'hi' });
    expect(res.statusCode).toBe(201);
    expect(res.json().language).toBe('hi');
    expect(generic.mock.calls[0][0]).toMatchObject({ reportType: 'KUNDLI', language: 'hi' });

    await post('/api/v1/reports/generate', { birthProfileId: PROFILE_ID, reportType: 'KUNDLI' });
    expect(generic.mock.calls[1][0].language).toBeUndefined();

    await post('/api/v1/reports/career', { birthProfileId: PROFILE_ID, language: 'hi' });
    expect(career.mock.calls[0][0]).toMatchObject({ birthProfileId: PROFILE_ID, language: 'hi' });
  });

  it('career regeneration works without a body and refuses a different language', async () => {
    vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({ id: 'rep-en', userId: 'user-1', birthProfileId: PROFILE_ID, orderId: null, language: 'en' } as any);
    const career = vi.spyOn(reportsService, 'createCareerReportJob').mockResolvedValue({ reportId: 'rep-en', language: 'en' } as any);
    const url = `/api/v1/reports/career/${ORDER_ID}/regenerate`;

    const noBody = await app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${token}` } });
    expect(noBody.statusCode).toBe(201);
    expect(career.mock.calls[0][0]).toMatchObject({ forceRegenerate: true, language: 'en' });

    const other = await post(url, { language: 'hi' });
    expect(other.statusCode).toBe(409);
    expect(other.json()).toEqual({ error: { code: 'REPORT_LANGUAGE_FIXED', message: expect.any(String), requestId: 'req-lang-0001' } });
    expect(career).toHaveBeenCalledTimes(1);
  });

  it('lists the available languages of each report in the catalogue', async () => {
    const languages = registryLanguages(['en', 'hi']);
    const res = await app.inject({ method: 'GET', url: '/api/v1/payments/catalog' });
    expect(res.statusCode).toBe(200);
    const items = res.json().items as Array<{ id: string; itemType: string; legacyReportType?: string; languages?: string[] }>;
    const kundli = items.find((i) => i.id === 'report-kundli')!;
    expect(kundli.languages).toEqual(['en', 'hi']);
    expect(languages).toHaveBeenCalled();
    // Items that are not reports are unchanged.
    expect(items.filter((i) => !i.legacyReportType).every((i) => !('languages' in i))).toBe(true);
  });
});

describe('report language is chosen before payment', () => {
  it('uses the language stored on the order item and refuses another one', async () => {
    const { reportLanguageForSlot } = await import('../../src/modules/reports/reports.service');
    expect(reportLanguageForSlot({ metadata: { language: 'hi' } })).toBe('hi');
    expect(reportLanguageForSlot({ metadata: { language: 'hi' } }, 'hi')).toBe('hi');
    expect(reportLanguageForSlot({ metadata: { birthProfileId: 'x' } })).toBe('en');
    expect(reportLanguageForSlot({ metadata: null }, 'en')).toBe('en');
    expect(() => reportLanguageForSlot({ metadata: { language: 'hi' } }, 'en')).toThrow(/purchased in language "hi"/);
    expect(() => reportLanguageForSlot({ metadata: {} }, 'hi')).toThrow(/purchased in language "en"/);
  });

  it('lets the request choose only when nothing was purchased (entitlement or support grant)', async () => {
    const { reportLanguageForSlot } = await import('../../src/modules/reports/reports.service');
    expect(reportLanguageForSlot(undefined, 'hi')).toBe('hi');
    expect(reportLanguageForSlot(null)).toBe('en');
  });
});
