/**
 * Fenced in-attempt progress writes against PostgreSQL (test database):
 * monotonic progress, metadata.progressDetail merge, and claim fencing.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/services/prisma.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { reportsService } from '../../src/modules/reports/reports.service';
import { ReportStatus, ReportType, Role } from '@prisma/client';

const EMAIL = 'progress-db-test@astrosushil.com';

describe('updateJobProgress (PostgreSQL)', () => {
  let user: any;
  let profile: any;

  async function cleanup() {
    const u = await prisma.user.findFirst({ where: { email: EMAIL }, select: { id: true } });
    if (u) {
      await prisma.report.deleteMany({ where: { userId: u.id } });
      await prisma.birthProfile.deleteMany({ where: { userId: u.id } });
      await prisma.user.deleteMany({ where: { id: u.id } });
    }
  }

  beforeAll(async () => {
    await cleanup();
    user = await prisma.user.create({ data: { email: EMAIL, fullName: 'Progress Test User', role: Role.USER } });
    profile = await prisma.birthProfile.create({
      data: {
        userId: user.id, name: 'Progress Test Profile', dateOfBirth: '1990-01-01', timeOfBirth: '12:00:00',
        latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', placeName: 'New Delhi, India',
      },
    });
  });

  beforeEach(async () => {
    await prisma.report.deleteMany({ where: { userId: user.id } });
  });

  afterAll(async () => {
    careerReportWorker.stopStaleRecoveryLoop();
    await cleanup();
  });

  it('writes stage, monotonic progress and detail for the claim holder only, keeping other metadata', async () => {
    await prisma.report.create({
      data: {
        userId: user.id, birthProfileId: profile.id, reportType: ReportType.CAREER, status: ReportStatus.QUEUED,
        stage: 'QUEUED', progress: 0, metadata: { partnerProfileId: 'keep-me' },
      },
    });
    const claim = await postgresQueueService.claimJob('worker-progress-db', 60);
    expect(claim).not.toBeNull();
    const { id, claimToken, claimVersion } = claim!;

    expect(await postgresQueueService.updateJobStatus(id, claimToken, claimVersion, ReportStatus.CALCULATING, 'CALCULATING', 15)).toBe(true);
    expect(await postgresQueueService.updateJobProgress(id, claimToken, claimVersion, ReportStatus.ANALYZING, 'ANALYZING', 40, 'Writing section 23 of 60')).toBe(true);

    let row = await prisma.report.findUnique({ where: { id } });
    expect(row!.status).toBe(ReportStatus.ANALYZING);
    expect(row!.progress).toBe(40);
    expect(row!.metadata).toEqual({ partnerProfileId: 'keep-me', progressDetail: 'Writing section 23 of 60' });

    // The status endpoint exposes the detail while ANALYZING.
    const status = await reportsService.getReportStatusOnly(id, { id: user.id, role: 'USER' } as any);
    expect(status.progressDetail).toBe('Writing section 23 of 60');
    expect(status.progress).toBe(40);

    // Progress never moves backwards; a null detail is stored as JSON null (metadata kept).
    expect(await postgresQueueService.updateJobProgress(id, claimToken, claimVersion, ReportStatus.COMPILING, 'COMPILING', 30, null)).toBe(true);
    row = await prisma.report.findUnique({ where: { id } });
    expect(row!.progress).toBe(40);
    expect(row!.stage).toBe('COMPILING');
    expect(row!.metadata).toEqual({ partnerProfileId: 'keep-me', progressDetail: null });

    // A stale claim cannot write progress.
    expect(await postgresQueueService.updateJobProgress(id, claimToken, claimVersion - 1, ReportStatus.ANALYZING, 'ANALYZING', 90, 'stale')).toBe(false);
    expect(await postgresQueueService.updateJobProgress(id, 'other-token', claimVersion, ReportStatus.ANALYZING, 'ANALYZING', 90, 'stale')).toBe(false);
    row = await prisma.report.findUnique({ where: { id } });
    expect(row!.progress).toBe(40);
    expect(row!.stage).toBe('COMPILING');
  });

  it('handles a report whose metadata is null', async () => {
    await prisma.report.create({
      data: { userId: user.id, birthProfileId: profile.id, reportType: ReportType.CAREER, status: ReportStatus.QUEUED, stage: 'QUEUED', progress: 0 },
    });
    const claim = await postgresQueueService.claimJob('worker-progress-db-2', 60);
    expect(await postgresQueueService.updateJobProgress(claim!.id, claim!.claimToken, claim!.claimVersion, ReportStatus.ANALYZING, 'ANALYZING', 20, 'Writing section 1 of 60')).toBe(true);
    const row = await prisma.report.findUnique({ where: { id: claim!.id } });
    expect(row!.metadata).toEqual({ progressDetail: 'Writing section 1 of 60' });
  });
});
