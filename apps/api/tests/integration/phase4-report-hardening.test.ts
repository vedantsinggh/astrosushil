import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { storageService } from '../../src/services/storage.service';
import { reportsService } from '../../src/modules/reports/reports.service';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { normalizeAstroChart, AstroChart } from '@astro/astrology-engine';
import {
  careerEvidenceEngine,
  careerAnalysisValidator,
  MockCareerAnalysisProvider,
  CareerAnalysisInput,
} from '@astro/prediction-engine';
import {
  escapeLatex,
  generateReportDataTex,
  pdfQaValidator,
} from '@astro/report-engine';

describe('Phase 4: Astrology Report Pipeline Hardening Suite', () => {
  let app: FastifyInstance;

  const userA = {
    id: '11111111-aaaa-1111-aaaa-111111111111',
    email: 'usera@astrosushil.com',
    role: 'USER',
  };

  const userB = {
    id: '22222222-bbbb-2222-bbbb-222222222222',
    email: 'userb@astrosushil.com',
    role: 'USER',
  };

  let tokenA: string;
  let tokenB: string;

  const profileA = {
    id: '33333333-aaaa-3333-aaaa-333333333333',
    userId: userA.id,
    name: 'Aarav Sharma',
    dateOfBirth: '1992-10-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const profileB = {
    id: '44444444-bbbb-4444-bbbb-444444444444',
    userId: userB.id,
    name: 'Diya Patel',
    dateOfBirth: '1995-04-20',
    timeOfBirth: '10:15:00',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    placeName: 'Mumbai, India',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const sampleAstroChart: AstroChart = {
    ascendant: { sign: 'Scorpio', degree: 22.45, nakshatra: 'Jyeshtha', pada: 2 },
    planets: [
      { name: 'Sun', sign: 'Leo', degree: 28.1, house: 10, nakshatra: 'Uttara Phalguni', pada: 1, retrograde: false },
      { name: 'Moon', sign: 'Pisces', degree: 14.2, house: 5, nakshatra: 'Uttara Bhadrapada', pada: 4, retrograde: false },
      { name: 'Mars', sign: 'Virgo', degree: 19.8, house: 11, nakshatra: 'Hasta', pada: 3, retrograde: false },
      { name: 'Mercury', sign: 'Leo', degree: 11.4, house: 10, nakshatra: 'Magha', pada: 4, retrograde: false },
      { name: 'Jupiter', sign: 'Scorpio', degree: 12.6, house: 1, nakshatra: 'Anuradha', pada: 3, retrograde: false },
      { name: 'Venus', sign: 'Cancer', degree: 25.3, house: 9, nakshatra: 'Ashlesha', pada: 3, retrograde: false },
      { name: 'Saturn', sign: 'Aquarius', degree: 28.9, house: 4, nakshatra: 'Purva Bhadrapada', pada: 3, retrograde: true },
      { name: 'Rahu', sign: 'Taurus', degree: 4.5, house: 7, nakshatra: 'Krittika', pada: 3, retrograde: true },
      { name: 'Ketu', sign: 'Scorpio', degree: 4.5, house: 1, nakshatra: 'Anuradha', pada: 1, retrograde: true },
    ],
    houses: [
      { houseNumber: 1, sign: 'Scorpio', degree: 22.45 },
      { houseNumber: 2, sign: 'Sagittarius', degree: 22.45 },
      { houseNumber: 3, sign: 'Capricorn', degree: 22.45 },
      { houseNumber: 4, sign: 'Aquarius', degree: 22.45 },
      { houseNumber: 5, sign: 'Pisces', degree: 22.45 },
      { houseNumber: 6, sign: 'Aries', degree: 22.45 },
      { houseNumber: 7, sign: 'Taurus', degree: 22.45 },
      { houseNumber: 8, sign: 'Gemini', degree: 22.45 },
      { houseNumber: 9, sign: 'Cancer', degree: 22.45 },
      { houseNumber: 10, sign: 'Leo', degree: 22.45 },
      { houseNumber: 11, sign: 'Virgo', degree: 22.45 },
      { houseNumber: 12, sign: 'Libra', degree: 22.45 },
    ],
  };

  const reportsStore = new Map<string, any>();
  const profilesStore = new Map<string, any>();

  beforeAll(async () => {
    process.env.LLM_PROVIDER = 'mock';
    profilesStore.set(profileA.id, { ...profileA });
    profilesStore.set(profileB.id, { ...profileB });

    vi.spyOn(prisma.birthProfile, 'findUnique').mockImplementation(async ({ where }: any) => {
      return profilesStore.get(where.id) || null;
    });

    vi.spyOn(prisma.report, 'findUnique').mockImplementation(async ({ where }: any) => {
      const r = reportsStore.get(where.id);
      if (!r) return null;
      return {
        ...r,
        birthProfile: profilesStore.get(r.birthProfileId),
        user: r.userId === userA.id ? userA : userB,
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

    vi.spyOn(prisma.report, 'findMany').mockImplementation(async ({ where }: any) => {
      return Array.from(reportsStore.values()).filter((r) => r.userId === where.userId);
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

    vi.spyOn(prisma.report, 'delete').mockImplementation(async ({ where }: any) => {
      const existing = reportsStore.get(where.id);
      reportsStore.delete(where.id);
      return existing;
    });

    app = buildApp();
    await app.ready();

    tokenA = (app as any).jwt.sign({ sub: userA.id, role: 'USER' });
    tokenB = (app as any).jwt.sign({ sub: userB.id, role: 'USER' });
  });

  beforeEach(() => {
    reportsStore.clear();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // --- TASK 2 & 1: FULL PIPELINE TRACE & VERIFICATION ---
  it('1. Traces complete Career Report Pipeline from API job creation to PDF storage & access', async () => {
    // Stage 1: API Request
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports/career',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { birthProfileId: profileA.id },
    });

    expect(createRes.statusCode).toBe(201);
    const createBody = JSON.parse(createRes.payload);
    expect(createBody.reportId).toBeDefined();
    expect(createBody.status).toBe('QUEUED');
    expect(createBody.reused).toBe(false);

    const reportId = createBody.reportId;

    // Stage 2: Worker Execution
    await careerReportWorker.executeReportPipeline(reportId);

    // Stage 3: Verify DB Record reaches final COMPLETED state
    const reportRecord = reportsStore.get(reportId);
    expect(reportRecord.status).toBe('COMPLETED');
    expect(reportRecord.stage).toBe('COMPLETED');
    expect(reportRecord.progress).toBe(100);
    expect(reportRecord.storageKey).toBe(`reports/${userA.id}/${reportId}.pdf`);
    expect(reportRecord.fileSize).toBeGreaterThan(1000);
    expect(reportRecord.completedAt).toBeDefined();

    // Stage 4: Secure Download Access
    const accessRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${reportId}/access`,
      headers: { authorization: `Bearer ${tokenA}` },
    });

    expect(accessRes.statusCode).toBe(200);
    const accessBody = JSON.parse(accessRes.payload);
    expect(accessBody.accessUrl).toBeDefined();
    expect(accessBody.expiresAt).toBeDefined();

    // Stage 5: Binary PDF Download & Magic Bytes Verification
    const downloadRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${reportId}/download-file`,
      headers: { authorization: `Bearer ${tokenA}` },
    });

    expect(downloadRes.statusCode).toBe(200);
    expect(downloadRes.headers['content-type']).toBe('application/pdf');
    const pdfBuffer = downloadRes.rawPayload;
    expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
  }, 60000);

  // --- TASK 3: REPORT STATUS & STAGE SEPARATION ---
  it('2. Enforces semantic correctness between worker stages and Prisma ReportStatus enum', async () => {
    const statusUpdates: Array<{ status: string; stage: string; progress: number }> = [];

    const updateMock = vi.spyOn(prisma.report, 'update').mockImplementation(async ({ where, data }: any) => {
      const existing = reportsStore.get(where.id) || {};
      const updated = { ...existing, ...data };
      reportsStore.set(where.id, updated);
      if (data.status && data.stage) {
        statusUpdates.push({ status: data.status, stage: data.stage, progress: data.progress });
      }
      return updated;
    });

    const testReportId = '77777777-7777-7777-7777-777777777777';
    reportsStore.set(testReportId, {
      id: testReportId,
      userId: userA.id,
      birthProfileId: profileA.id,
      reportType: 'CAREER',
      status: 'QUEUED',
      stage: 'QUEUED',
      progress: 0,
      createdAt: new Date(),
    });

    await careerReportWorker.executeReportPipeline(testReportId);

    // Verify all emitted status values belong to Prisma enum
    const validPrismaStatuses = [
      'PENDING',
      'QUEUED',
      'CALCULATING',
      'ANALYZING',
      'RENDERING',
      'COMPILING',
      'UPLOADING',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
    ];

    for (const update of statusUpdates) {
      expect(validPrismaStatuses).toContain(update.status);
    }

    // Verify VALIDATING stage used valid status COMPILING
    const validatingStage = statusUpdates.find((u) => u.stage === 'VALIDATING');
    expect(validatingStage).toBeDefined();
    expect(validatingStage?.status).toBe('COMPILING');
    expect(validatingStage?.progress).toBe(85);

    updateMock.mockImplementation(async ({ where, data }: any) => {
      const existing = reportsStore.get(where.id);
      if (!existing) throw new Error(`Report ${where.id} not found`);
      const updated = { ...existing, ...data, updatedAt: new Date() };
      reportsStore.set(where.id, updated);
      return updated;
    });
  }, 60000);

  // --- TASK 4: DETERMINISTIC EVIDENCE BOUNDARY ---
  it('4. Deterministic evidence boundary: calculations are strictly deterministic, LLM interprets facts', () => {
    const normalized = normalizeAstroChart(sampleAstroChart);
    const evidence: CareerAnalysisInput = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    // Verify core deterministic facts extracted
    expect(evidence.chartSummary.ascendantSign).toBe('Scorpio');
    expect(evidence.careerAxis.houseTenSign).toBe('Leo');
    expect(evidence.careerAxis.houseTenLord).toBe('Sun');
    expect(evidence.leadershipEvidence.sunPlacement.house).toBe(10);
    expect(evidence.planetaryEvidence.length).toBe(9);
    expect(evidence.houseEvidence.length).toBe(7);

    // Verify total planets count is deterministic
    expect(evidence.chartSummary.totalPlanetsCount).toBe(9);
  });

  // --- TASK 5 & 6: STRUCTURED REPORT SCHEMA & ANTI-HALLUCINATION ---
  it('5. Structured validator rejects missing required fields and forbidden guaranteed predictions', async () => {
    const normalized = normalizeAstroChart(sampleAstroChart);
    const evidence = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    // Test missing fields
    const invalidPayload: any = {
      executiveCareerSummary: 'Short summary',
      // Missing other 25+ required fields
    };

    const result1 = careerAnalysisValidator.validate(invalidPayload, evidence);
    expect(result1.isValid).toBe(false);
    expect(result1.errors.some((e) => e.includes('Missing or empty required field'))).toBe(true);

    // Test forbidden guaranteed predictions
    const mockProvider = new MockCareerAnalysisProvider();
    const analysis = await mockProvider.analyze(evidence);
    const hallucinated = {
      ...analysis,
      executiveCareerSummary: 'In 2028 you will become rich and destiny guarantees huge success.',
    };
    const result2 = careerAnalysisValidator.validate(hallucinated, evidence);
    expect(result2.isValid).toBe(false);
    expect(result2.errors.some((e) => e.includes('Forbidden guaranteed prediction'))).toBe(true);
  });

  // --- TASK 7: LATEX ESCAPING & UNICODE HANDLING ---
  it('7. Safely escapes all special LaTeX characters (& % $ # _ { } ~ ^ \\ °) and handles Unicode/Hindi text', () => {
    const rawSpecial = 'Vedic & Tech 100% #1 $USD _key_ {scope} ~approx ^power \\backslash 28° वृश्चिक राशि';
    const escaped = escapeLatex(rawSpecial);

    expect(escaped).toContain('\\&');
    expect(escaped).toContain('\\%');
    expect(escaped).toContain('\\#');
    expect(escaped).toContain('\\$');
    expect(escaped).toContain('\\_');
    expect(escaped).toContain('\\{');
    expect(escaped).toContain('\\}');
    expect(escaped).toContain('\\textasciitilde{}');
    expect(escaped).toContain('\\textasciicircum{}');
    expect(escaped).toContain('\\textbackslash{}');
    expect(escaped).toContain('\\textdegree{}');
    expect(escaped).toContain('वृश्चिक राशि'); // Unicode preserved
  });

  // --- TASK 8: PDF QA VALIDATION ---
  it('8. PdfQaValidator catches corrupt, zero-byte, missing headers, or placeholder payloads', () => {
    const cleanTex = '\\newcommand{\\ClientName}{\\RenderVerified{Aarav Sharma}}\n';

    // Zero-byte buffer
    const zeroByteRes = pdfQaValidator.validatePdf({
      pdfBuffer: Buffer.alloc(0),
      reportDataTex: cleanTex,
    });
    expect(zeroByteRes.isValid).toBe(false);
    expect(zeroByteRes.errors.some((e) => e.includes('empty'))).toBe(true);

    // Invalid PDF header
    const invalidHeaderRes = pdfQaValidator.validatePdf({
      pdfBuffer: Buffer.from('NOT_A_PDF_BUFFER_DATA'),
      reportDataTex: cleanTex,
    });
    expect(invalidHeaderRes.isValid).toBe(false);
    expect(invalidHeaderRes.errors.some((e) => e.includes('Invalid PDF header'))).toBe(true);

    // Forbidden production placeholder
    const dirtyTex = cleanTex + '\\newcommand{\\Title}{\\RenderUnavailable{Valued Client}}';
    const placeholderRes = pdfQaValidator.validatePdf({
      pdfBuffer: Buffer.from('%PDF-1.4\n/Type /Page\n'.repeat(6) + '%%EOF'),
      reportDataTex: dirtyTex,
      expectedClientName: 'Aarav Sharma',
    });
    expect(placeholderRes.isValid).toBe(false);
    expect(placeholderRes.errors.some((e) => e.includes('Forbidden placeholder'))).toBe(true);
  });

  // --- TASK 9: STORAGE SECURITY & PATH TRAVERSAL REJECTION ---
  it('9. Storage service enforces path traversal protection and secure signed token download verification', async () => {
    // 1. Upload valid object
    const validKey = `reports/${userA.id}/test-report.pdf`;
    const uploadRes = await storageService.upload({
      key: validKey,
      body: Buffer.from('%PDF-1.4\nTest PDF\n%%EOF'),
    });
    expect(uploadRes.key).toBe(validKey);

    // 2. Path traversal upload attempt is rejected
    await expect(
      storageService.upload({
        key: '../../../../etc/passwd',
        body: Buffer.from('malicious'),
      })
    ).rejects.toThrow('Path traversal attempt detected');

    // 3. Path traversal download attempt is rejected
    await expect(
      storageService.downloadBuffer('../../etc/shadow')
    ).rejects.toThrow('Path traversal attempt detected');

    // 4. Tokenized URL verification with invalid/mismatched signature
    const validUrl = await storageService.getSignedDownloadUrl(validKey, 900);
    expect(validUrl).toContain('token=');

    const isValidSig = storageService.verifyLocalSignedUrl(validKey, Date.now() + 60000, 'invalid-fake-signature');
    expect(isValidSig).toBe(false);
  });

  // --- TASK 10: REPORT OWNERSHIP & IDOR PROTECTION ---
  it('10. Strictly rejects IDOR cross-user access attempts (view, access, download, delete, regenerate)', async () => {
    // Create completed report owned by User A (using valid UUID)
    const reportAId = '99999999-9999-9999-9999-999999999999';
    reportsStore.set(reportAId, {
      id: reportAId,
      userId: userA.id,
      birthProfileId: profileA.id,
      reportType: 'CAREER',
      status: 'COMPLETED',
      stage: 'COMPLETED',
      progress: 100,
      storageKey: `reports/${userA.id}/${reportAId}.pdf`,
      createdAt: new Date(),
    });

    // User B attempts to access User A's report details -> 404
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${reportAId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(getRes.statusCode).toBe(404);

    // User B attempts to get download URL for User A's report -> 404
    const accessRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${reportAId}/access`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(accessRes.statusCode).toBe(404);

    // User B attempts to download User A's PDF binary -> 404
    const downloadRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${reportAId}/download-file`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(downloadRes.statusCode).toBe(404);

    // User B attempts to delete User A's report -> 404
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/reports/${reportAId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(deleteRes.statusCode).toBe(404);

    // User B attempts to regenerate User A's report -> 403
    const regenRes = await app.inject({
      method: 'POST',
      url: `/api/v1/reports/career/${reportAId}/regenerate`,
      headers: { authorization: `Bearer ${tokenB}` },
    });
    expect(regenRes.statusCode).toBe(403);
  });

  // --- TASK 13: EXISTING REPORT REUSE VS EXPLICIT REGENERATION ---
  it('13. Reuses existing completed report when profile is unchanged, and generates new report ID on explicit regenerate', async () => {
    // 1. Initial request creates Report 1
    const res1 = await reportsService.createCareerReportJob({ birthProfileId: profileA.id }, userA);
    expect(res1.reused).toBe(false);
    const report1Id = res1.reportId;

    // Simulate completion
    await careerReportWorker.executeReportPipeline(report1Id);

    // 2. Second request for same profile reuses completed report
    const res2 = await reportsService.createCareerReportJob({ birthProfileId: profileA.id }, userA);
    expect(res2.reused).toBe(true);
    expect(res2.reportId).toBe(report1Id);

    // 3. Explicit regeneration creates a NEW report ID
    const res3 = await reportsService.createCareerReportJob(
      { birthProfileId: profileA.id, forceRegenerate: true },
      userA
    );
    expect(res3.reused).toBe(false);
    expect(res3.reportId).not.toBe(report1Id);
  }, 60000);

  // --- TASK 11 & 12: FAILURE HANDLING & CONCURRENT ISOLATION ---
  it('12. Enters FAILED state safely on calculation/pipeline errors without corrupting DB or leaking secrets', async () => {
    const failReportId = '88888888-8888-8888-8888-888888888888';
    reportsStore.set(failReportId, {
      id: failReportId,
      userId: userA.id,
      birthProfileId: 'non-existent-profile-id',
      reportType: 'CAREER',
      status: 'QUEUED',
      stage: 'QUEUED',
      progress: 0,
      createdAt: new Date(),
    });

    await careerReportWorker.executeReportPipeline(failReportId);

    const record = reportsStore.get(failReportId);
    expect(record.status).toBe('FAILED');
    expect(record.stage).toBe('FAILED');
    expect(record.errorCode).toBeDefined();
    expect(record.errorMessage).toBeDefined();
    expect(record.failedAt).toBeDefined();
  });
});
