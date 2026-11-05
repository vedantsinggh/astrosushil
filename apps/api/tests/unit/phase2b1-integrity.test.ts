import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { reportsService } from '../../src/modules/reports/reports.service';
import { storageService } from '../../src/services/storage.service';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import { reportPdfService } from '@astro/report-engine';
import { prisma } from '../../src/services/prisma.service';
import { careerReportWorker } from '../../src/services/report-worker.service';
import {
  OpenRouterCareerAnalysisProvider,
  MockCareerAnalysisProvider,
} from '@astro/prediction-engine';
import {
  generateProHoroscopeReport,
  DeterministicInterpretationProvider,
} from '@astro/report-engine';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from '../../src/utils/logger';
import * as reportEngine from '@astro/report-engine';
import * as astrologyEngine from '@astro/astrology-engine';

describe('Phase 2B.1 Verification Suite: Report Download, Storage Durability, AI Safety, Numerical Integrity', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    vi.spyOn(prisma.report, 'update').mockResolvedValue({} as any);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. REPORT DOWNLOAD LIFECYCLE
  // =========================================================================
  describe('1. Report Download Lifecycle', () => {
    const mockUser = { id: 'usr-123', role: 'USER' };
    const mockOtherUser = { id: 'usr-999', role: 'USER' };
    const mockReportId = 'rep-456';
    const testPdfBytes = Buffer.from('%PDF-1.4 Test Stored PDF Content Exact Bytes %EOF');
    const expectedSha256 = crypto.createHash('sha256').update(testPdfBytes).digest('hex');

    it('serves exact stored PDF bytes with matching SHA-256 and zero recalculation/regeneration calls', async () => {
      // Mock report record in COMPLETED state
      vi.spyOn(reportsService as any, 'getReportStatus').mockResolvedValue({
        id: mockReportId,
        userId: mockUser.id,
        status: 'COMPLETED',
        stage: 'COMPLETED',
        reportType: 'KUNDLI',
        birthProfile: {
          name: 'Rohan Sharma',
          dateOfBirth: '1990-01-01',
          timeOfBirth: '12:00:00',
          placeName: 'Delhi',
          timezone: 'Asia/Kolkata',
          latitude: 28.6,
          longitude: 77.2,
        },
      });

      vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({
        id: mockReportId,
        userId: mockUser.id,
        status: 'COMPLETED',
        storageKey: `reports/${mockUser.id}/${mockReportId}.pdf`,
      } as any);

      // Mock storageService.downloadBuffer returning exact stored bytes
      const downloadBufferSpy = vi.spyOn(storageService, 'downloadBuffer').mockResolvedValue(testPdfBytes);

      // Spies to ensure ZERO recalculation and ZERO regeneration
      const calcChartSpy = vi.spyOn(astrologyService, 'calculateChartForProfile');
      const calcNormSpy = vi.spyOn(astrologyService, 'calculateNormalizedChart');
      const genReportPdfSpy = vi.spyOn(reportPdfService, 'generateReportPdf');
      const genCareerPdfSpy = vi.spyOn(reportPdfService, 'generateCareerReportPdf');

      const result = await reportsService.generateReportPdfBuffer(mockReportId, mockUser);

      // Verify exact bytes and SHA-256
      expect(result.buffer).toEqual(testPdfBytes);
      const actualSha256 = crypto.createHash('sha256').update(result.buffer).digest('hex');
      expect(actualSha256).toBe(expectedSha256);

      // Verify ZERO calculation and ZERO PDF rendering calls
      expect(downloadBufferSpy).toHaveBeenCalledWith(`reports/${mockUser.id}/${mockReportId}.pdf`);
      expect(calcChartSpy).not.toHaveBeenCalled();
      expect(calcNormSpy).not.toHaveBeenCalled();
      expect(genReportPdfSpy).not.toHaveBeenCalled();
      expect(genCareerPdfSpy).not.toHaveBeenCalled();
    });

    it('verifies real PDF download integrity using actual local test-storage adapter without mocks', async () => {
      process.env.NODE_ENV = 'development';
      const testDir = path.join(os.tmpdir(), `astro-test-storage-${Date.now()}`);
      process.env.STORAGE_LOCAL_DIR = testDir;

      const realPdfBytes = Buffer.from('%PDF-1.4 Real Local Test Storage PDF Bytes For Checksum Validation %EOF');
      const expectedHash = crypto.createHash('sha256').update(realPdfBytes).digest('hex');
      const realReportId = `rep-real-${Date.now()}`;
      const realUser = { id: `usr-real-${Date.now()}`, role: 'USER' };
      const realKey = `reports/${realUser.id}/${realReportId}.pdf`;

      // 1. Upload known bytes using actual storageService.upload to local storage
      const uploadRes = await storageService.upload({
        key: realKey,
        body: realPdfBytes,
        contentType: 'application/pdf',
      });
      expect(uploadRes.fileSize).toBe(realPdfBytes.length);

      // 2. Mock Prisma report record pointing to realKey
      vi.spyOn(reportsService as any, 'getReportStatus').mockResolvedValue({
        id: realReportId,
        userId: realUser.id,
        status: 'COMPLETED',
        stage: 'COMPLETED',
        reportType: 'KUNDLI',
      });
      vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({
        id: realReportId,
        userId: realUser.id,
        status: 'COMPLETED',
        storageKey: realKey,
        fileName: 'real-test-report.pdf',
      } as any);

      // Spies to verify download invokes zero chart calculations and zero PDF generation
      const calcChartSpy = vi.spyOn(astrologyService, 'calculateChartForProfile');
      const calcNormSpy = vi.spyOn(astrologyService, 'calculateNormalizedChart');
      const genReportPdfSpy = vi.spyOn(reportPdfService, 'generateReportPdf');
      const genCareerPdfSpy = vi.spyOn(reportPdfService, 'generateCareerReportPdf');

      // 3. Download via reportsService.generateReportPdfBuffer (real storageService.downloadBuffer path)
      const downloadResult = await reportsService.generateReportPdfBuffer(realReportId, realUser);

      // 4. Verify byte-for-byte equality and identical SHA-256
      expect(downloadResult.buffer.equals(realPdfBytes)).toBe(true);
      const downloadedHash = crypto.createHash('sha256').update(downloadResult.buffer).digest('hex');
      expect(downloadedHash).toBe(expectedHash);

      // 5. Verify zero calculation/generation calls
      expect(calcChartSpy).not.toHaveBeenCalled();
      expect(calcNormSpy).not.toHaveBeenCalled();
      expect(genReportPdfSpy).not.toHaveBeenCalled();
      expect(genCareerPdfSpy).not.toHaveBeenCalled();

      // Clean up
      await storageService.delete(realKey);
      try {
        fs.rmSync(testDir, { recursive: true, force: true });
      } catch (_) {}
    });

    it('enforces ownership verification and rejects cross-user access', async () => {
      vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({
        id: mockReportId,
        userId: mockUser.id,
        status: 'COMPLETED',
        birthProfile: { name: 'Rohan' },
      } as any);

      await expect(
        reportsService.generateReportPdfBuffer(mockReportId, mockOtherUser)
      ).rejects.toThrow();
    });

    it('returns REPORT_ASSET_NOT_FOUND (404) without regenerating when storageKey is missing', async () => {
      vi.spyOn(reportsService as any, 'getReportStatus').mockResolvedValue({
        id: mockReportId,
        userId: mockUser.id,
        status: 'COMPLETED',
      });

      vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({
        id: mockReportId,
        userId: mockUser.id,
        status: 'COMPLETED',
        storageKey: null,
      } as any);

      const genReportPdfSpy = vi.spyOn(reportPdfService, 'generateReportPdf');
      const calcChartSpy = vi.spyOn(astrologyService, 'calculateChartForProfile');

      await expect(
        reportsService.generateReportPdfBuffer(mockReportId, mockUser)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'REPORT_ASSET_NOT_FOUND',
      });

      expect(genReportPdfSpy).not.toHaveBeenCalled();
      expect(calcChartSpy).not.toHaveBeenCalled();
    });

    it('returns REPORT_ASSET_NOT_FOUND (404) without regenerating when storage file read fails', async () => {
      vi.spyOn(reportsService as any, 'getReportStatus').mockResolvedValue({
        id: mockReportId,
        userId: mockUser.id,
        status: 'COMPLETED',
      });

      vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({
        id: mockReportId,
        userId: mockUser.id,
        status: 'COMPLETED',
        storageKey: `reports/${mockUser.id}/${mockReportId}.pdf`,
      } as any);

      vi.spyOn(storageService, 'downloadBuffer').mockRejectedValue(new Error('Object not found in bucket'));

      const genReportPdfSpy = vi.spyOn(reportPdfService, 'generateReportPdf');

      await expect(
        reportsService.generateReportPdfBuffer(mockReportId, mockUser)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'REPORT_ASSET_NOT_FOUND',
      });

      expect(genReportPdfSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. STORAGE DURABILITY
  // =========================================================================
  describe('2. Storage Durability', () => {
    it('disables ephemeral /tmp fallback in production and requires object storage credentials', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.S3_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;

      const testBuffer = Buffer.from('test data');

      await expect(
        storageService.upload({
          key: 'reports/test/sample.pdf',
          body: testBuffer,
        })
      ).rejects.toThrow(/STORAGE_CONFIGURATION_ERROR/);

      await expect(
        storageService.downloadBuffer('reports/test/sample.pdf')
      ).rejects.toThrow(/STORAGE_CONFIGURATION_ERROR/);

      await expect(
        storageService.getSignedDownloadUrl('reports/test/sample.pdf')
      ).rejects.toThrow(/STORAGE_CONFIGURATION_ERROR/);

      expect(storageService.verifyLocalSignedUrl('reports/test/sample.pdf', Date.now() + 10000, 'tok')).toBe(false);
    });

    it('preserves safe local storage behavior in development/test environments', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.S3_ACCOUNT_ID;

      const testBuffer = Buffer.from('development test buffer %PDF-');
      const testKey = `reports/test-${Date.now()}/dev-sample.pdf`;

      const uploadResult = await storageService.upload({
        key: testKey,
        body: testBuffer,
      });

      expect(uploadResult.key).toBe(testKey);
      expect(uploadResult.fileSize).toBe(testBuffer.length);

      const downloaded = await storageService.downloadBuffer(testKey);
      expect(downloaded).toEqual(testBuffer);

      // Clean up test file
      await storageService.delete(testKey);
    });

    it('ensures storage failure during synchronous creation cannot result in a COMPLETED report', async () => {
      const mockUser = { id: 'usr-stor-fail', role: 'USER' };
      const profileId = 'prof-stor-fail';

      vi.spyOn(prisma.birthProfile, 'findUnique').mockResolvedValue({
        id: profileId,
        userId: mockUser.id,
        name: 'Test Profile',
        dateOfBirth: '1992-05-10',
        timeOfBirth: '08:00:00',
        latitude: 28.6,
        longitude: 77.2,
        timezone: 'Asia/Kolkata',
        updatedAt: new Date(),
      } as any);

      vi.spyOn(astrologyService, 'calculateChartForProfile').mockResolvedValue({
        ascendant: { sign: 'Aries', degree: 15, nakshatra: 'Ashwini', pada: 1 },
        planets: [
          { name: 'Sun', sign: 'Aries', degree: 10, house: 1, nakshatra: 'Ashwini', pada: 1 },
          { name: 'Moon', sign: 'Taurus', degree: 15, house: 2, nakshatra: 'Rohini', pada: 2 },
          { name: 'Mars', sign: 'Gemini', degree: 20, house: 3, nakshatra: 'Punarvasu', pada: 1 },
          { name: 'Mercury', sign: 'Cancer', degree: 5, house: 4, nakshatra: 'Pushya', pada: 1 },
          { name: 'Jupiter', sign: 'Leo', degree: 12, house: 5, nakshatra: 'Magha', pada: 4 },
          { name: 'Venus', sign: 'Virgo', degree: 18, house: 6, nakshatra: 'Hasta', pada: 3 },
          { name: 'Saturn', sign: 'Libra', degree: 22, house: 7, nakshatra: 'Chitra', pada: 3 },
          { name: 'Rahu', sign: 'Scorpio', degree: 8, house: 8, nakshatra: 'Anuradha', pada: 2 },
          { name: 'Ketu', sign: 'Taurus', degree: 8, house: 2, nakshatra: 'Krittika', pada: 4 },
        ],
        houses: Array.from({ length: 12 }, (_, i) => ({ houseNumber: i + 1, sign: 'Aries', degree: 15 })),
      } as any);

      vi.spyOn(reportPdfService, 'generateReportPdf').mockResolvedValue(Buffer.from('%PDF-1.4 mock'));

      // Storage upload fails catastrophically
      vi.spyOn(storageService, 'upload').mockRejectedValue(new Error('S3 connection timed out'));

      let createdReportData: any = null;
      vi.spyOn(prisma.report, 'create').mockImplementation(async ({ data }: any) => {
        createdReportData = data;
        return { ...data, id: data.id || 'gen-id' };
      });

      await expect(
        reportsService.createReportJob(
          { birthProfileId: profileId, reportType: 'KUNDLI', forceRegenerate: true },
          mockUser
        )
      ).rejects.toMatchObject({
        code: 'STORAGE_UPLOAD_FAILED',
      });

      // Assert that the created record is strictly FAILED and NEVER COMPLETED
      expect(createdReportData).toBeDefined();
      expect(createdReportData.status).toBe('FAILED');
      expect(createdReportData.stage).toBe('FAILED');
      expect(createdReportData.errorCode).toBe('STORAGE_UPLOAD_FAILED');
      expect(createdReportData.errorMessage).toContain('S3 connection timed out');
    });

    it('logs critical double-fault and throws when recording FAILED state also encounters database error', async () => {
      const mockUser = { id: 'usr-double-fault', role: 'USER' };
      const profileId = 'prof-double-fault';

      vi.spyOn(prisma.birthProfile, 'findUnique').mockResolvedValue({
        id: profileId,
        userId: mockUser.id,
        name: 'Test Profile',
        dateOfBirth: '1992-05-10',
        timeOfBirth: '08:00:00',
        latitude: 28.6,
        longitude: 77.2,
        timezone: 'Asia/Kolkata',
        updatedAt: new Date(),
      } as any);

      vi.spyOn(astrologyService, 'calculateChartForProfile').mockResolvedValue({
        ascendant: { sign: 'Aries', degree: 15, nakshatra: 'Ashwini', pada: 1 },
        planets: [
          { name: 'Sun', sign: 'Aries', degree: 10, house: 1, nakshatra: 'Ashwini', pada: 1 },
          { name: 'Moon', sign: 'Taurus', degree: 15, house: 2, nakshatra: 'Rohini', pada: 2 },
          { name: 'Mars', sign: 'Gemini', degree: 20, house: 3, nakshatra: 'Punarvasu', pada: 1 },
          { name: 'Mercury', sign: 'Cancer', degree: 5, house: 4, nakshatra: 'Pushya', pada: 1 },
          { name: 'Jupiter', sign: 'Leo', degree: 12, house: 5, nakshatra: 'Magha', pada: 4 },
          { name: 'Venus', sign: 'Virgo', degree: 18, house: 6, nakshatra: 'Hasta', pada: 3 },
          { name: 'Saturn', sign: 'Libra', degree: 22, house: 7, nakshatra: 'Chitra', pada: 3 },
          { name: 'Rahu', sign: 'Scorpio', degree: 8, house: 8, nakshatra: 'Anuradha', pada: 2 },
          { name: 'Ketu', sign: 'Taurus', degree: 8, house: 2, nakshatra: 'Krittika', pada: 4 },
        ],
        houses: Array.from({ length: 12 }, (_, i) => ({ houseNumber: i + 1, sign: 'Aries', degree: 15 })),
      } as any);

      vi.spyOn(reportPdfService, 'generateReportPdf').mockResolvedValue(Buffer.from('%PDF-1.4 mock'));

      // Storage upload fails
      vi.spyOn(storageService, 'upload').mockRejectedValue(new Error('S3 socket hang up'));

      // Database create also fails (double-fault)
      vi.spyOn(prisma.report, 'create').mockRejectedValue(new Error('Prisma database connection dropped'));

      const loggerSpy = vi.spyOn(logger, 'error');

      await expect(
        reportsService.createReportJob(
          { birthProfileId: profileId, reportType: 'KUNDLI', forceRegenerate: true },
          mockUser
        )
      ).rejects.toMatchObject({
        code: 'STORAGE_UPLOAD_FAILED',
      });

      // Verify double-fault was logged with reportId and failure reasons
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          uploadErr: expect.stringContaining('S3 socket hang up'),
          dbErr: expect.stringContaining('Prisma database connection dropped'),
        }),
        expect.stringContaining('Critical double-fault')
      );
    });

    it('worker failJob logs critical double-fault if database persistence fails during status update', async () => {
      const loggerSpy = vi.spyOn(logger, 'error');
      vi.spyOn(prisma.report, 'update').mockRejectedValueOnce(new Error('DB unreachable during failJob'));

      await (careerReportWorker as any).failJob('rep-failjob-test', 'OBJECT_STORAGE_UPLOAD_FAILED', 'Disk full');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          reportId: 'rep-failjob-test',
          errorCode: 'OBJECT_STORAGE_UPLOAD_FAILED',
          dbErr: expect.stringContaining('DB unreachable during failJob'),
        }),
        expect.stringContaining('Critical double-fault')
      );
    });
  });

  // =========================================================================
  // 3. PRODUCTION AI SAFETY
  // =========================================================================
  describe('3. Production AI Safety', () => {
    it('prevents mock provider usage in production and fails job with AI_PROVIDER_ERROR', async () => {
      process.env.NODE_ENV = 'production';
      process.env.LLM_PROVIDER = 'mock';

      const mockReportId = 'rep-ai-safety-1';
      vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({
        id: mockReportId,
        userId: 'usr-1',
        birthProfileId: 'prof-1',
        reportType: 'CAREER',
        status: 'QUEUED',
        birthProfile: {
          name: 'Aarav',
          dateOfBirth: '1990-01-01',
          timeOfBirth: '12:00:00',
          timezone: 'Asia/Kolkata',
          latitude: 28.6,
          longitude: 77.2,
        },
      } as any);

      vi.spyOn(astrologyService, 'calculateNormalizedChart').mockResolvedValue({
        ascendant: { sign: 'Leo', degree: 10 },
        planets: [
          { name: 'Sun', sign: 'Leo', degree: 10, house: 1 },
          { name: 'Moon', sign: 'Cancer', degree: 15, house: 12 },
          { name: 'Mars', sign: 'Aries', degree: 5, house: 9 },
          { name: 'Mercury', sign: 'Virgo', degree: 20, house: 2 },
          { name: 'Jupiter', sign: 'Sagittarius', degree: 12, house: 5 },
          { name: 'Venus', sign: 'Libra', degree: 18, house: 3 },
          { name: 'Saturn', sign: 'Capricorn', degree: 25, house: 6 },
          { name: 'Rahu', sign: 'Taurus', degree: 8, house: 10 },
          { name: 'Ketu', sign: 'Scorpio', degree: 8, house: 4 },
        ],
        houses: Array.from({ length: 12 }, (_, i) => ({ houseNumber: i + 1, sign: 'Leo', degree: 10 })),
      } as any);

      let failedStatus: { code: string; reason: string } | null = null;
      vi.spyOn(careerReportWorker as any, 'failJob').mockImplementation(async (id: string, code: string, reason: string) => {
        failedStatus = { code, reason };
      });

      await careerReportWorker.executeReportPipeline(mockReportId);

      expect(failedStatus).toBeDefined();
      expect(failedStatus?.code).toBe('AI_PROVIDER_ERROR');
      expect(failedStatus?.reason).toContain('Mock AI provider is strictly prohibited in production');
    });

    it('fails job with AI_CREDENTIALS_MISSING when OpenRouter key is missing in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.LLM_PROVIDER = 'openrouter';
      delete process.env.OPENROUTER_API_KEY;

      const mockReportId = 'rep-ai-safety-2';
      vi.spyOn(prisma.report, 'findUnique').mockResolvedValue({
        id: mockReportId,
        userId: 'usr-1',
        birthProfileId: 'prof-1',
        reportType: 'CAREER',
        status: 'QUEUED',
        birthProfile: {
          name: 'Aarav',
          dateOfBirth: '1990-01-01',
          timeOfBirth: '12:00:00',
          timezone: 'Asia/Kolkata',
          latitude: 28.6,
          longitude: 77.2,
        },
      } as any);

      vi.spyOn(astrologyService, 'calculateNormalizedChart').mockResolvedValue({
        ascendant: { sign: 'Leo', degree: 10 },
        planets: [
          { name: 'Sun', sign: 'Leo', degree: 10, house: 1 },
          { name: 'Moon', sign: 'Cancer', degree: 15, house: 12 },
          { name: 'Mars', sign: 'Aries', degree: 5, house: 9 },
          { name: 'Mercury', sign: 'Virgo', degree: 20, house: 2 },
          { name: 'Jupiter', sign: 'Sagittarius', degree: 12, house: 5 },
          { name: 'Venus', sign: 'Libra', degree: 18, house: 3 },
          { name: 'Saturn', sign: 'Capricorn', degree: 25, house: 6 },
          { name: 'Rahu', sign: 'Taurus', degree: 8, house: 10 },
          { name: 'Ketu', sign: 'Scorpio', degree: 8, house: 4 },
        ],
        houses: Array.from({ length: 12 }, (_, i) => ({ houseNumber: i + 1, sign: 'Leo', degree: 10 })),
      } as any);

      let failedStatus: { code: string; reason: string } | null = null;
      vi.spyOn(careerReportWorker as any, 'failJob').mockImplementation(async (id: string, code: string, reason: string) => {
        failedStatus = { code, reason };
      });

      await careerReportWorker.executeReportPipeline(mockReportId);

      expect(failedStatus).toBeDefined();
      expect(failedStatus?.code).toBe('AI_CREDENTIALS_MISSING');
    });

    it('OpenRouterCareerAnalysisProvider throws without mock fallback when retries exhaust in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.OPENROUTER_API_KEY = 'sk-or-v1-prod-key-sample';

      const provider = new OpenRouterCareerAnalysisProvider();

      // Mock fetch to simulate 503 Service Unavailable on all retries
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Service Unavailable',
      } as any);

      const sampleInput: any = {
        careerAxis: { ascendantSign: 'Aries', houseTenSign: 'Capricorn' },
        timingEvidence: { status: 'FAVORABLE' },
        planetaryEvidence: [],
        houseEvidence: [],
      };

      await expect(provider.analyze(sampleInput)).rejects.toThrow(/OPENROUTER_ANALYSIS_FAILED/);
    });

    it('OpenRouterCareerAnalysisProvider immediately aborts without retrying on non-transient HTTP 401 error', async () => {
      process.env.NODE_ENV = 'production';
      process.env.OPENROUTER_API_KEY = 'sk-or-invalid-key';

      const provider = new OpenRouterCareerAnalysisProvider();

      let fetchCallCount = 0;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        fetchCallCount++;
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: async () => 'Invalid API Key',
        } as any;
      });

      const sampleInput: any = {
        careerAxis: { ascendantSign: 'Aries', houseTenSign: 'Capricorn' },
        timingEvidence: { status: 'FAVORABLE' },
        planetaryEvidence: [],
        houseEvidence: [],
      };

      await expect(provider.analyze(sampleInput)).rejects.toThrow(/OPENROUTER_ANALYSIS_FAILED/);
      // Non-transient 401 error must NOT consume retry attempts
      expect(fetchCallCount).toBe(1);
    });
  });

  // =========================================================================
  // 4. NUMERICAL CALCULATION INTEGRITY
  // =========================================================================
  describe('4. Numerical Calculation Integrity', () => {
    const sampleProfile = {
      name: 'Priya Sharma',
      dateOfBirth: '1995-03-20',
      timeOfBirth: '14:30:00',
      placeName: 'Mumbai',
      timezone: 'Asia/Kolkata',
      latitude: 19.076,
      longitude: 72.8777,
    };

    const validChart: any = {
      ascendant: { sign: 'Cancer', degree: 12.5, nakshatra: 'Pushya', pada: 3 },
      planets: [
        { name: 'Sun', sign: 'Pisces', degree: 5.5, house: 9, nakshatra: 'Uttara Bhadrapada', pada: 1 },
        { name: 'Moon', sign: 'Libra', degree: 22.1, house: 4, nakshatra: 'Vishakha', pada: 1 },
        { name: 'Mars', sign: 'Cancer', degree: 14.2, house: 1, nakshatra: 'Pushya', pada: 4 },
        { name: 'Mercury', sign: 'Aquarius', degree: 18.0, house: 8, nakshatra: 'Shatabhisha', pada: 4 },
        { name: 'Jupiter', sign: 'Scorpio', degree: 20.3, house: 5, nakshatra: 'Jyeshtha', pada: 2 },
        { name: 'Venus', sign: 'Aries', degree: 8.7, house: 10, nakshatra: 'Ashwini', pada: 3 },
        { name: 'Saturn', sign: 'Aquarius', degree: 28.4, house: 8, nakshatra: 'Purva Bhadrapada', pada: 3 },
        { name: 'Rahu', sign: 'Scorpio', degree: 12.0, house: 5, nakshatra: 'Anuradha', pada: 3 },
        { name: 'Ketu', sign: 'Taurus', degree: 12.0, house: 11, nakshatra: 'Rohini', pada: 1 },
      ],
      houses: Array.from({ length: 12 }, (_, i) => ({
        houseNumber: i + 1,
        sign: 'Cancer',
        degree: 12.5,
      })),
    };

    it('propagates Shadbala calculation errors instead of injecting fabricated 140.0 fallback values', async () => {
      // Mock ShadbalaCalculator to throw calculation failure
      vi.spyOn(astrologyEngine.ShadbalaCalculator.prototype, 'calculate').mockImplementation(() => {
        throw new Error('Planetary ephemeris precision lost');
      });

      const interpretationProvider = new DeterministicInterpretationProvider();

      await expect(
        generateProHoroscopeReport(sampleProfile, validChart, interpretationProvider)
      ).rejects.toThrow(/SHADBALA_CALCULATION_FAILED/);
    });

    it('propagates Bhava Bala calculation errors instead of injecting fabricated 5.0 fallback values', async () => {
      // Mock calculateBhavaBala to throw calculation failure
      vi.spyOn(astrologyEngine, 'calculateBhavaBala').mockImplementation(() => {
        throw new Error('House cusp alignment failure');
      });

      const interpretationProvider = new DeterministicInterpretationProvider();

      await expect(
        generateProHoroscopeReport(sampleProfile, validChart, interpretationProvider)
      ).rejects.toThrow(/BHAVA_BALA_CALCULATION_FAILED/);
    });
  });
});
