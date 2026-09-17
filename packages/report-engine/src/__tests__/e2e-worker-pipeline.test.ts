import { describe, it, expect, vi } from 'vitest';
import { prisma } from '../../../../apps/api/src/services/prisma.service';
import { careerReportWorker } from '../../../../apps/api/src/services/report-worker.service';
import { reportsService } from '../../../../apps/api/src/modules/reports/reports.service';
import { astrologyService } from '../../../../apps/api/src/modules/astrology/astrology.service';
import { normalizeAstroChart } from '../../../../packages/astrology-engine/src';
import crypto from 'crypto';

describe('E2E Worker Pipeline & Prisma ReportStatus Verification', () => {
  it('Should follow fresh report through entire pipeline with Prisma database status updates', async () => {
    const rawChart: any = {
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

    const normalizedChart = normalizeAstroChart(rawChart);
    normalizedChart.birthDetails = {
      name: 'Aarav Sharma',
      dateOfBirth: '1995-08-15',
      timeOfBirth: '14:30:00',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
    };

    vi.spyOn(astrologyService, 'calculateNormalizedChart').mockResolvedValue(normalizedChart);
    // 1. Create test user and birth profile
    const testUserId = `test-user-${crypto.randomUUID()}`;
    const testUser = await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${Date.now()}@astrosushil.com`,
        passwordHash: 'hashed_password_for_testing',
        fullName: 'Aarav Test User',
      },
    });

    const testProfile = await prisma.birthProfile.create({
      data: {
        id: `profile-${crypto.randomUUID()}`,
        userId: testUser.id,
        name: 'Aarav Sharma',
        dateOfBirth: '1995-08-15',
        timeOfBirth: '14:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
        placeName: 'New Delhi, India',
      },
    });

    // 2. Create Career Report Job
    const jobResult = await reportsService.createCareerReportJob(
      { birthProfileId: testProfile.id },
      { id: testUser.id, role: 'USER' }
    );

    expect(jobResult.reportId).toBeDefined();
    expect(jobResult.status).toBe('QUEUED');

    // 3. Execute Worker Pipeline directly
    await careerReportWorker.executeReportPipeline(jobResult.reportId);

    // 4. Retrieve status via API service (as Flutter client would)
    const reportStatus = await reportsService.getReportStatus(
      jobResult.reportId,
      { id: testUser.id, role: 'USER' }
    );

    console.log('=== E2E PIPELINE EXECUTION COMPLETED ===');
    console.log(`- Report ID: ${reportStatus.id}`);
    console.log(`- Final DB Status: ${reportStatus.status}`);
    console.log(`- Final DB Stage: ${reportStatus.stage}`);
    console.log(`- Final DB Error Code: ${reportStatus.errorCode}`);
    console.log(`- Final DB Error Message: ${reportStatus.errorMessage}`);
    console.log(`- Final DB Progress: ${reportStatus.progress}%`);
    console.log(`- Page Count: ${reportStatus.pageCount}`);
    console.log(`- File Size: ${reportStatus.fileSize} bytes`);
    console.log(`- Download URL: ${reportStatus.downloadUrl}`);

    expect(reportStatus.status).toBe('COMPLETED');
    expect(reportStatus.stage).toBe('COMPLETED');
    expect(reportStatus.progress).toBe(100);
    expect(reportStatus.pageCount).toBeGreaterThanOrEqual(1);

    // 5. Test Download Access URL for Flutter
    const accessUrlObj = await reportsService.getReportAccessUrl(
      jobResult.reportId,
      { id: testUser.id, role: 'USER' }
    );
    console.log(`- Access URL: ${accessUrlObj.accessUrl}`);
    expect(accessUrlObj.accessUrl).toBeDefined();

    // 6. Test PDF Buffer Retrieval for Flutter
    const pdfBufferResult = await reportsService.generateReportPdfBuffer(
      jobResult.reportId,
      { id: testUser.id, role: 'USER' }
    );
    expect(pdfBufferResult.buffer).toBeDefined();
    expect(pdfBufferResult.buffer.toString('utf-8', 0, 5)).toBe('%PDF-');

    // Clean up test data
    await prisma.report.delete({ where: { id: jobResult.reportId } });
    await prisma.birthProfile.delete({ where: { id: testProfile.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  }, 180000);
});
