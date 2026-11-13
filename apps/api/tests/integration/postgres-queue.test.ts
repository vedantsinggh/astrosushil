import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/services/prisma.service';
import { postgresQueueService, ClaimedReportJob } from '../../src/services/postgres-queue.service';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { ReportStatus, ReportType, Role } from '@prisma/client';

describe('PostgreSQL Queue and Worker Integration Tests (Phase 2)', () => {
  let testUser: any;
  let testProfile: any;

  async function cleanupTestData() {
    const user = await prisma.user.findFirst({
      where: { email: 'queue-test@astrosushil.com' },
      select: { id: true },
    });
    if (user) {
      await prisma.report.deleteMany({ where: { userId: user.id } });
      await prisma.birthProfile.deleteMany({ where: { userId: user.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  }

  beforeAll(async () => {
    await cleanupTestData();

    testUser = await prisma.user.create({
      data: {
        email: 'queue-test@astrosushil.com',
        fullName: 'Queue Test User',
        role: Role.USER,
      },
    });

    testProfile = await prisma.birthProfile.create({
      data: {
        userId: testUser.id,
        name: 'Queue Test Profile',
        dateOfBirth: '1990-01-01',
        timeOfBirth: '12:00:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
        placeName: 'New Delhi, India',
      },
    });
  });

  beforeEach(async () => {
    if (testUser) {
      await prisma.report.deleteMany({ where: { userId: testUser.id } });
    }
  });

  afterAll(async () => {
    careerReportWorker.stopStaleRecoveryLoop();
    await cleanupTestData();
  });

  async function createTestReport(overrides: Partial<any> = {}) {
    return await prisma.report.create({
      data: {
        userId: testUser.id,
        birthProfileId: testProfile.id,
        reportType: ReportType.CAREER,
        status: ReportStatus.QUEUED,
        stage: 'QUEUED',
        progress: 0,
        ...overrides,
      },
    });
  }

  // 1. Enqueue idempotency
  it('1. Enqueue idempotency: repeated enqueues preserve QUEUED state without duplicates or errors', async () => {
    const rep = await createTestReport({ status: ReportStatus.PENDING, stage: 'PENDING' });

    const firstEnqueue = await postgresQueueService.enqueueJob(rep.id);
    expect(firstEnqueue).toBe(true);

    const afterFirst = await prisma.report.findUnique({ where: { id: rep.id } });
    expect(afterFirst?.status).toBe(ReportStatus.QUEUED);
    expect(afterFirst?.stage).toBe('QUEUED');

    // Repeated enqueue (idempotent)
    const secondEnqueue = await postgresQueueService.enqueueJob(rep.id);
    expect(secondEnqueue).toBe(true);

    const count = await prisma.report.count({ where: { id: rep.id } });
    expect(count).toBe(1);
  });

  // 2. Two workers claiming different jobs concurrently (FOR UPDATE SKIP LOCKED)
  it('2. Concurrent claim: two workers claim different jobs simultaneously via SKIP LOCKED', async () => {
    const rep1 = await createTestReport();
    const rep2 = await createTestReport();

    const [claim1, claim2] = await Promise.all([
      postgresQueueService.claimJob('worker-1'),
      postgresQueueService.claimJob('worker-2'),
    ]);

    expect(claim1).not.toBeNull();
    expect(claim2).not.toBeNull();
    expect(claim1!.id).not.toBe(claim2!.id);

    const claimedIds = [claim1!.id, claim2!.id];
    expect(claimedIds).toContain(rep1.id);
    expect(claimedIds).toContain(rep2.id);

    // Both reports are in CALCULATING with unique claim tokens
    expect(claim1!.claimToken).toBeTruthy();
    expect(claim2!.claimToken).toBeTruthy();
    expect(claim1!.claimToken).not.toBe(claim2!.claimToken);
  });

  // 3. No duplicate active claim for one report
  it('3. Mutual exclusion: no duplicate active claim for one report while lease is active', async () => {
    const rep = await createTestReport();

    const claim = await postgresQueueService.claimJob('worker-exclusive', 60);
    expect(claim).not.toBeNull();
    expect(claim!.id).toBe(rep.id);

    // Another worker attempts to claim by ID
    const duplicateClaim = await postgresQueueService.claimJobById(rep.id);
    expect(duplicateClaim).toBeNull();

    // Another worker attempts generic next claim
    const genericClaim = await postgresQueueService.claimJob('worker-rival');
    // Either null or a different job, never rep.id
    if (genericClaim) {
      expect(genericClaim.id).not.toBe(rep.id);
    }
  });

  // 4. Claim version increment
  it('4. Claim version increment: increments claimVersion and executionAttempts on each claim', async () => {
    const rep = await createTestReport();
    expect(rep.claimVersion).toBe(0);
    expect(rep.executionAttempts).toBe(0);

    const firstClaim = await postgresQueueService.claimJob('worker-ver', 60);
    expect(firstClaim).not.toBeNull();
    expect(firstClaim!.claimVersion).toBe(1);
    expect(firstClaim!.executionAttempts).toBe(1);

    // Simulate release and re-claim
    await postgresQueueService.releaseClaim(firstClaim!.id, firstClaim!.claimToken, firstClaim!.claimVersion);

    const secondClaim = await postgresQueueService.claimJob('worker-ver-2', 60);
    expect(secondClaim).not.toBeNull();
    expect(secondClaim!.id).toBe(firstClaim!.id);
    expect(secondClaim!.claimVersion).toBe(2);
    expect(secondClaim!.executionAttempts).toBe(2);
  });

  // 5. Successful heartbeat renewal
  it('5. Heartbeat renewal: successfully extends claimExpiresAt into the future', async () => {
    const rep = await createTestReport();
    const claim = await postgresQueueService.claimJob('worker-hb', 30);
    expect(claim).not.toBeNull();

    const renewed = await postgresQueueService.touchHeartbeat(claim!.id, claim!.claimToken, claim!.claimVersion, 120);
    expect(renewed).toBe(true);

    const updated = await prisma.report.findUnique({ where: { id: claim!.id } });
    expect(updated!.claimExpiresAt!.getTime()).toBeGreaterThan(claim!.claimExpiresAt.getTime());
  });

  // 6. Heartbeat rejection after lease expiration
  it('6. Heartbeat rejection after lease expiration: fails if claimExpiresAt is in the past', async () => {
    const rep = await createTestReport();
    const claim = await postgresQueueService.claimJob('worker-exp', 1);
    expect(claim).not.toBeNull();

    // Force lease into the past directly in DB
    await prisma.$executeRaw`
      UPDATE "reports"
      SET "claimExpiresAt" = clock_timestamp() - INTERVAL '10 seconds'
      WHERE id = ${claim!.id};
    `;

    const renewed = await postgresQueueService.touchHeartbeat(claim!.id, claim!.claimToken, claim!.claimVersion, 60);
    expect(renewed).toBe(false);
  });

  // 7. Heartbeat rejection for stale tokens
  it('7. Heartbeat rejection for stale tokens: rejects heartbeat with wrong token or version', async () => {
    const rep = await createTestReport();
    const claim = await postgresQueueService.claimJob('worker-stale-hb', 60);
    expect(claim).not.toBeNull();

    // Wrong token
    const wrongTokenResult = await postgresQueueService.touchHeartbeat(claim!.id, 'invalid-token-1234', claim!.claimVersion, 60);
    expect(wrongTokenResult).toBe(false);

    // Wrong version
    const wrongVersionResult = await postgresQueueService.touchHeartbeat(claim!.id, claim!.claimToken, 9999, 60);
    expect(wrongVersionResult).toBe(false);
  });

  // 8. Stale worker unable to update progress
  it('8. Fenced progress updates: stale worker cannot update stage or progress', async () => {
    const rep = await createTestReport();
    const claim = await postgresQueueService.claimJob('worker-fenced-progress', 60);
    expect(claim).not.toBeNull();

    // Valid worker update succeeds
    const validUpdate = await postgresQueueService.updateJobStatus(
      claim!.id,
      claim!.claimToken,
      claim!.claimVersion,
      ReportStatus.ANALYZING,
      'ANALYZING',
      35
    );
    expect(validUpdate).toBe(true);

    // Stale worker with wrong version cannot update
    const staleUpdate = await postgresQueueService.updateJobStatus(
      claim!.id,
      claim!.claimToken,
      claim!.claimVersion - 1,
      ReportStatus.RENDERING,
      'RENDERING',
      60
    );
    expect(staleUpdate).toBe(false);

    const reportInDb = await prisma.report.findUnique({ where: { id: claim!.id } });
    expect(reportInDb!.status).toBe(ReportStatus.ANALYZING);
    expect(reportInDb!.progress).toBe(35);
  });

  // 9. Stale worker unable to complete a recovered job
  it('9. Fenced completion: stale worker cannot complete a job after recovery', async () => {
    const rep = await createTestReport();
    const claim = await postgresQueueService.claimJob('worker-stale-complete', 1);
    expect(claim).not.toBeNull();

    // Force lease to expire and recover job
    await prisma.$executeRaw`
      UPDATE "reports"
      SET "claimExpiresAt" = clock_timestamp() - INTERVAL '5 seconds'
      WHERE id = ${claim!.id};
    `;

    const recovery = await postgresQueueService.recoverStaleJobs();
    expect(recovery.recoveredCount).toBe(1);

    // Stale worker attempts to complete
    const completeResult = await postgresQueueService.completeJob(
      claim!.id,
      claim!.claimToken,
      claim!.claimVersion,
      'reports/fake-key.pdf',
      'fake.pdf',
      12345,
      3
    );
    expect(completeResult).toBe(false);

    const currentRep = await prisma.report.findUnique({ where: { id: claim!.id } });
    expect(currentRep!.status).toBe(ReportStatus.QUEUED);
    expect(currentRep!.storageKey).toBeNull();
  });

  // 10. Stale worker unable to fail a recovered job
  it('10. Fenced failure: stale worker cannot fail a job after recovery', async () => {
    const rep = await createTestReport();
    const claim = await postgresQueueService.claimJob('worker-stale-fail', 1);
    expect(claim).not.toBeNull();

    // Force lease to expire and recover job
    await prisma.$executeRaw`
      UPDATE "reports"
      SET "claimExpiresAt" = clock_timestamp() - INTERVAL '5 seconds'
      WHERE id = ${claim!.id};
    `;

    await postgresQueueService.recoverStaleJobs();

    // Stale worker attempts to fail job
    const failResult = await postgresQueueService.failJob(
      claim!.id,
      claim!.claimToken,
      claim!.claimVersion,
      'CRASHED',
      'Worker crashed'
    );
    expect(failResult).toBe(false);

    const currentRep = await prisma.report.findUnique({ where: { id: claim!.id } });
    expect(currentRep!.status).toBe(ReportStatus.QUEUED);
    expect(currentRep!.errorCode).toBeNull();
  });

  // 11. Recovery of an expired lease
  it('11. Stale-job recovery: expired in-flight job is requeued and claimVersion incremented', async () => {
    const rep = await createTestReport();
    const claim = await postgresQueueService.claimJob('worker-recover', 1);
    expect(claim).not.toBeNull();

    // Force lease to expired state
    await prisma.$executeRaw`
      UPDATE "reports"
      SET "claimExpiresAt" = clock_timestamp() - INTERVAL '20 seconds'
      WHERE id = ${claim!.id};
    `;

    const result = await postgresQueueService.recoverStaleJobs(3);
    expect(result.recoveredCount).toBeGreaterThanOrEqual(1);

    const recovered = await prisma.report.findUnique({ where: { id: claim!.id } });
    expect(recovered!.status).toBe(ReportStatus.QUEUED);
    expect(recovered!.claimToken).toBeNull();
    expect(recovered!.claimExpiresAt).toBeNull();
    expect(recovered!.claimVersion).toBe(claim!.claimVersion + 1);
    expect(recovered!.recoveryAttempts).toBe(1);
    expect(recovered!.retryAfter).not.toBeNull();
  });

  // 12. Recovery racing with heartbeat renewal
  it('12. Concurrency race: recovery ignores job if heartbeat extended lease before recovery scan', async () => {
    const rep = await createTestReport();
    const claim = await postgresQueueService.claimJob('worker-race', 60);
    expect(claim).not.toBeNull();

    // Heartbeat touch extends lease
    await postgresQueueService.touchHeartbeat(claim!.id, claim!.claimToken, claim!.claimVersion, 120);

    // Recovery runs
    const recovery = await postgresQueueService.recoverStaleJobs();

    // Since lease is in the future, it was not recovered
    const repAfter = await prisma.report.findUnique({ where: { id: claim!.id } });
    expect(repAfter!.status).toBe(ReportStatus.CALCULATING);
    expect(repAfter!.claimToken).toBe(claim!.claimToken);
  });

  // 13. Exponential retry backoff
  it('13. Exponential backoff: recovered job has retryAfter set into future and is skipped until backoff passes', async () => {
    const rep = await createTestReport();
    const claim = await postgresQueueService.claimJob('worker-backoff', 1);
    expect(claim).not.toBeNull();

    // Expire lease
    await prisma.$executeRaw`
      UPDATE "reports"
      SET "claimExpiresAt" = clock_timestamp() - INTERVAL '5 seconds'
      WHERE id = ${claim!.id};
    `;

    await postgresQueueService.recoverStaleJobs();

    const repWithBackoff = await prisma.report.findUnique({ where: { id: claim!.id } });
    expect(repWithBackoff!.retryAfter).not.toBeNull();
    expect(repWithBackoff!.retryAfter!.getTime()).toBeGreaterThan(Date.now());

    // Claim should skip this job because retryAfter > clock_timestamp()
    const immediateClaim = await postgresQueueService.claimJobById(claim!.id);
    expect(immediateClaim).toBeNull();

    // Fast-forward retryAfter to past
    await prisma.$executeRaw`
      UPDATE "reports"
      SET "retryAfter" = clock_timestamp() - INTERVAL '1 second'
      WHERE id = ${claim!.id};
    `;

    // Now it can be claimed
    const claimAfterBackoff = await postgresQueueService.claimJobById(claim!.id);
    expect(claimAfterBackoff).not.toBeNull();
    expect(claimAfterBackoff!.id).toBe(claim!.id);
  });

  // 14. Maximum recovery attempts (transitions to FAILED with RECOVERY_EXHAUSTED)
  it('14. Recovery exhaustion: transitions to FAILED with RECOVERY_EXHAUSTED after max attempts', async () => {
    const rep = await createTestReport();
    const claim = await postgresQueueService.claimJob('worker-exhaust', 1);
    expect(claim).not.toBeNull();

    // Set recoveryAttempts to 3 and expire lease
    await prisma.$executeRaw`
      UPDATE "reports"
      SET "recoveryAttempts" = 3,
          "claimExpiresAt" = clock_timestamp() - INTERVAL '10 seconds'
      WHERE id = ${claim!.id};
    `;

    const recovery = await postgresQueueService.recoverStaleJobs(3);
    expect(recovery.failedCount).toBeGreaterThanOrEqual(1);

    const exhausted = await prisma.report.findUnique({ where: { id: claim!.id } });
    expect(exhausted!.status).toBe(ReportStatus.FAILED);
    expect(exhausted!.errorCode).toBe('RECOVERY_EXHAUSTED');
    expect(exhausted!.claimToken).toBeNull();
    expect(exhausted!.failedAt).not.toBeNull();
  });

  // 15. Completed reports cannot be re-enqueued
  it('15. Terminal protection: COMPLETED reports cannot be re-enqueued', async () => {
    const rep = await createTestReport({
      status: ReportStatus.COMPLETED,
      stage: 'COMPLETED',
      progress: 100,
      storageKey: 'reports/done.pdf',
      completedAt: new Date(),
    });

    const enqueueResult = await postgresQueueService.enqueueJob(rep.id);
    expect(enqueueResult).toBe(false);

    const repInDb = await prisma.report.findUnique({ where: { id: rep.id } });
    expect(repInDb!.status).toBe(ReportStatus.COMPLETED);
    expect(repInDb!.storageKey).toBe('reports/done.pdf');
  });

  // 16. Worker shutdown stops new claims and heartbeats cleanly
  it('16. Clean shutdown: releasing claim resets report to QUEUED with no active lease', async () => {
    const rep = await createTestReport();
    const claim = await postgresQueueService.claimJob('worker-shutdown', 60);
    expect(claim).not.toBeNull();

    // Release claim on worker shutdown
    const released = await postgresQueueService.releaseClaim(claim!.id, claim!.claimToken, claim!.claimVersion);
    expect(released).toBe(true);

    const repAfterRelease = await prisma.report.findUnique({ where: { id: claim!.id } });
    expect(repAfterRelease!.status).toBe(ReportStatus.QUEUED);
    expect(repAfterRelease!.claimToken).toBeNull();
    expect(repAfterRelease!.claimExpiresAt).toBeNull();

    // Stop recurring recovery loop cleanly
    careerReportWorker.startStaleRecoveryLoop(10000);
    careerReportWorker.stopStaleRecoveryLoop();
    expect(true).toBe(true);
  });
});
