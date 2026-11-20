import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { reportsService } from '../../src/modules/reports/reports.service';
import { storageService } from '../../src/services/storage.service';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import { prisma } from '../../src/services/prisma.service';
import { careerReportWorker } from '../../src/services/report-worker.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { logger } from '../../src/utils/logger';

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

      const result = await reportsService.generateReportPdfBuffer(mockReportId, mockUser);

      // Verify exact bytes and SHA-256
      expect(result.buffer).toEqual(testPdfBytes);
      const actualSha256 = crypto.createHash('sha256').update(result.buffer).digest('hex');
      expect(actualSha256).toBe(expectedSha256);

      // Verify ZERO calculation and ZERO PDF rendering calls
      expect(downloadBufferSpy).toHaveBeenCalledWith(`reports/${mockUser.id}/${mockReportId}.pdf`);
      expect(calcChartSpy).not.toHaveBeenCalled();
      expect(calcNormSpy).not.toHaveBeenCalled();
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

      // 3. Download via reportsService.generateReportPdfBuffer (real storageService.downloadBuffer path)
      const downloadResult = await reportsService.generateReportPdfBuffer(realReportId, realUser);

      // 4. Verify byte-for-byte equality and identical SHA-256
      expect(downloadResult.buffer.equals(realPdfBytes)).toBe(true);
      const downloadedHash = crypto.createHash('sha256').update(downloadResult.buffer).digest('hex');
      expect(downloadedHash).toBe(expectedHash);

      // 5. Verify zero calculation/generation calls
      expect(calcChartSpy).not.toHaveBeenCalled();
      expect(calcNormSpy).not.toHaveBeenCalled();

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
      const calcChartSpy = vi.spyOn(astrologyService, 'calculateChartForProfile');

      await expect(
        reportsService.generateReportPdfBuffer(mockReportId, mockUser)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'REPORT_ASSET_NOT_FOUND',
      });
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

      await expect(
        reportsService.generateReportPdfBuffer(mockReportId, mockUser)
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'REPORT_ASSET_NOT_FOUND',
      });
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

    it('worker failJob logs critical double-fault if database persistence fails during status update', async () => {
      const loggerSpy = vi.spyOn(logger, 'error');
      // Without a claim token failJob persists FAILED through a guarded updateMany (active statuses only).
      const updateManySpy = vi.spyOn(prisma.report, 'updateMany').mockRejectedValueOnce(new Error('DB unreachable during failJob'));

      const result = await careerReportWorker.failJob('rep-failjob-test', 'OBJECT_STORAGE_UPLOAD_FAILED', 'Disk full');

      expect(result).toBe(false);
      expect(updateManySpy).toHaveBeenCalledTimes(1);

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
  // Section 4 (Shadbala/Bhava Bala error propagation) exercised the removed legacy
  // horoscope generator and was removed with it.
});
