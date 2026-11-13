# Phase 2B.5 Task 1D: Implementation Report
## Queue Recovery, Heartbeats and Multi-Worker Safety

**Date:** 2026-11-05  
**Task:** Phase 2B.5 Task 1D (Remediating concerns from `PHASE_2B5_TASK1C_FOLLOWUP_AUDIT.md`)  
**Status:** COMPLETED & VERIFIED (Awaiting Independent Read-Only Acceptance Audit)

---

## 1. Exact Files Changed

### Backend Core Implementation Files:
1. `apps/api/src/services/report-worker.service.ts`
   - Replaced process-local mutex in `recoverStaleJobs()` with distributed Redis lock `astrosushil:lock:stale-recovery` (with PostgreSQL advisory lock fallback).
   - Added abandoned job detection in `executeStaleRecovery()` distinguishing genuinely un-enqueued jobs (`enqueued: false`) from crashed workers.
   - Implemented re-enqueue logic with attempt counters in `metadata.recoveryAttempts` up to limit of 3 before marking `FAILED` (`QUEUE_RECOVERY_EXHAUSTED`).
   - Added `touchHeartbeat()` and a 30-second interval worker heartbeat in `executeReportPipeline()` wrapped in `try/finally` with `stopHeartbeat()`.
   - Converted all status updates (`updateJobStatus`), failure transitions (`failJob`), and final completion writes (`prisma.report.updateMany`) to conditional database operations filtering strictly by active statuses (`QUEUED`, `CALCULATING`, `ANALYZING`, `RENDERING`, `COMPILING`, `UPLOADING`).
   - Guarded order fulfillment transitions: an order is never marked `FAILED` if any report for the order is already `COMPLETED`.

2. `apps/api/src/modules/reports/reports.service.ts`
   - Initialized `metadata: { enqueued: false, recoveryAttempts: 0 }` upon initial report record creation in `createCareerReportJob()` and `initializeReportJob()`.
   - Marked `metadata: { enqueued: true }` via `careerReportWorker.markJobEnqueued(reportId)` immediately upon successful Redis list push in `createReportJob()`.
   - Updated `executeSynchronousReportPipeline()` to use conditional `prisma.report.updateMany` for failure and completion transitions.

### Test Architecture & Test Suites:
3. `apps/api/tests/integration/phase2b5-task1d-queue-heartbeat-recovery.test.ts` *(New dedicated integration suite)*
   - 11 deterministic integration tests covering all 11 required scenarios:
     1. API crash after database commit leaves abandoned `QUEUED` report (`enqueued: false`).
     2. Recovery successfully re-enqueues an abandoned `QUEUED` report.
     3. Repeated recovery does not create duplicate queue jobs or reports.
     4. Redis unavailable during recovery preserves recovery metadata and retries successfully.
     5. A legitimate job running longer than 5 minutes with heartbeats is not recovered as stale.
     6. Heartbeat cannot update `FAILED` or `COMPLETED` reports.
     7. Two independent worker processes attempting recovery simultaneously execute safely without conflict.
     8. Recovery lock expiry and stale-owner protection handles TTL cleanly.
     9. Active worker completion racing with recovery does not cause corrupt overwrite.
     10. Conditional failure updates never overwrite `COMPLETED` reports or orders.
     11. Failed generation remains retryable without another payment.

4. `apps/api/tests/helpers/process-report-runner.ts`
   - Added IPC message handler for `RECOVER_STALE_JOBS` and response event `RECOVERY_RESULT` to allow child worker processes to invoke `careerReportWorker.recoverStaleJobs()`.

5. `apps/api/tests/integration/phase2b5-cross-process-concurrency.test.ts`
   - Added type definition for `RECOVER_STALE_JOBS` IPC message.

6. `apps/api/tests/integration/phase4-consumer-reports.test.ts`
   - Added `vi.spyOn(prisma.report, 'updateMany')` to mock store so conditional updates properly update the in-memory mock store in unit/integration environments.

---

## 2. Queue Recovery Implementation

### Problem Solved
If an API process crashed after committing a `QUEUED` report and transitioning the order to `PROCESSING` in PostgreSQL, but before `redisQueueService.enqueueJob(report.id)` could succeed, the job was previously orphaned. In earlier recovery routines, stale jobs were unconditionally marked `FAILED`, forcing users or administrators to deal with failed orders.

### Identification of Abandoned QUEUED vs Started Jobs
- When `reports.service.ts` creates a report in PostgreSQL, it initializes `metadata: { enqueued: false, recoveryAttempts: 0 }`.
- When `redisQueueService.enqueueJob(report.id)` completes successfully, `markJobEnqueued(report.id)` updates `metadata: { enqueued: true }`.
- In `recoverStaleJobs()`:
  - If a report is `QUEUED`, has `metadata.enqueued === false`, and its `updatedAt` is older than 5 minutes, it is recognized as an **abandoned queued report** from a crash window.
  - If a report is in an active status with `metadata.enqueued === true` (or in `CALCULATING`, `ANALYZING`, etc.), and has no heartbeat for > 5 minutes, it is recognized as a **crashed worker job**.

### Re-Enqueue Logic and Failure Limits
- If an abandoned queued report has `metadata.recoveryAttempts < 3`:
  - It pushes the job ID back to Redis queue (`redisQueueService.enqueueJob(report.id)`).
  - Updates `updatedAt` to `now()`, marks `metadata.enqueued = true`, and increments `recoveryAttempts: (currentAttempts + 1)`.
  - The status remains `QUEUED` and the order remains `PROCESSING`.
- If `metadata.recoveryAttempts >= 3` or Redis repeatedly fails:
  - The report transitions to `FAILED` with error code `QUEUE_RECOVERY_EXHAUSTED`.
  - The linked order transitions to `FAILED` (remaining retryable without double-payment).

---

## 3. Heartbeat Lifecycle and Cleanup

### Implementation
- Added `careerReportWorker.touchHeartbeat(reportId)` which issues a conditional query:
  ```typescript
  await prisma.report.updateMany({
    where: {
      id: reportId,
      status: { in: ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'] },
    },
    data: { updatedAt: new Date() },
  });
  ```
- If the report is already `COMPLETED` or `FAILED`, `updateMany` returns `count: 0`, ensuring heartbeats cannot revive terminal records.
- In `executeReportPipeline()`:
  ```typescript
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let isHeartbeating = false;

  const startHeartbeat = () => {
    heartbeatTimer = setInterval(async () => {
      if (isHeartbeating) return; // Prevent overlapping async calls
      isHeartbeating = true;
      try {
        await this.touchHeartbeat(reportId);
      } finally {
        isHeartbeating = false;
      }
    }, 30000);
    heartbeatTimer.unref(); // Does not keep event loop alive
  };

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };
  ```
- `stopHeartbeat()` is guaranteed to execute in the outermost `finally` block of `executeReportPipeline()`, preventing leaked timers on normal completion, pipeline errors, or uncaught exceptions.

---

## 4. Distributed Recovery Coordination

### Implementation
- Replaced the local in-process `isRecovering` boolean in `recoverStaleJobs()` with `distributedLockService.withDistributedLock`:
  ```typescript
  public async recoverStaleJobs(): Promise<{ recoveredCount: number; reEnqueuedCount: number; skipped?: boolean }> {
    const LOCK_KEY = 'astrosushil:lock:stale-recovery';
    try {
      return await distributedLockService.withDistributedLock(
        LOCK_KEY,
        async () => {
          return await this.executeStaleRecovery();
        },
        { ttlMs: 30000, waitTimeoutMs: 500 }
      );
    } catch (err: any) {
      if (err?.code === 'DISTRIBUTED_LOCK_TIMEOUT') {
        logger.info('[CareerReportWorker] Stale job recovery skipped: lock held by another worker instance.');
        return { recoveredCount: 0, reEnqueuedCount: 0, skipped: true };
      }
      throw err;
    }
  }
  ```
- Under high multi-worker concurrency, one worker acquires `astrosushil:lock:stale-recovery`. Any peer workers attempting recovery within that window cleanly catch `DISTRIBUTED_LOCK_TIMEOUT` and return `{ skipped: true }` without crashing or executing duplicate queries.
- Falls back automatically to PostgreSQL transaction-level advisory locks (`pg_try_advisory_xact_lock`) if Redis is unavailable.

---

## 5. Conditional Failure and Completion Transitions

### Conditional Failure (`failJob`)
`failJob` now issues a conditional `prisma.report.updateMany`:
```typescript
const updateResult = await prisma.report.updateMany({
  where: {
    id: reportId,
    status: { in: ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING', 'PENDING', 'PROCESSING'] },
  },
  data: {
    status: 'FAILED',
    stage: 'FAILED',
    progress: 0,
    errorCode,
    errorMessage,
    failedAt: now,
    updatedAt: now,
  },
});
```
- If `updateResult.count === 0`, `failJob` logs a warning and exits cleanly returning `false`.
- Order fulfillment status is updated to `FAILED` only if no other report for the order is `COMPLETED`.

### Conditional Completion (Stage 7)
In both Career and Consumer report pipelines:
```typescript
const completionResult = await prisma.report.updateMany({
  where: {
    id: reportId,
    status: { in: ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'] },
  },
  data: {
    status: 'COMPLETED',
    stage: 'COMPLETED',
    progress: 100,
    report: structuredReport,
    pdfUrl,
    pdfStorageKey,
    updatedAt: new Date(),
  },
});

if (completionResult.count === 0) {
  logger.warn({ reportId }, '[CareerReportWorker] Skipped completion update: report is no longer in an active state.');
  return;
}
```
- A late-finishing worker whose job was marked `FAILED` by a stale recovery routine will not overwrite the `FAILED` state and will not mark an already-failed or refunded order as `FULFILLED`.

---

## 6. Multi-Process Test Architecture

The multi-process test architecture in `apps/api/tests/integration/phase2b5-task1d-queue-heartbeat-recovery.test.ts` and `apps/api/tests/integration/phase2b5-cross-process-concurrency.test.ts`:
- Spawns independent Node.js processes using `child_process.fork()` running `apps/api/tests/helpers/process-report-runner.ts`.
- Communicates via Node.js IPC messages (`RECOVER_STALE_JOBS`, `START_JOB`, etc.).
- Verifies:
  - Two child processes simultaneously requesting stale job recovery: exactly one acquires the distributed lock and performs recovery; the second cleanly returns `{ skipped: true }`.
  - When Redis lock is held and expires, subsequent processes safely acquire the lock without deadlocking.
  - Heartbeats from one process preserve an active running job beyond 5 minutes while another process runs recovery.

---

## 7. Exact Test Commands and Results

### Test Execution Commands:
```bash
# 1. New Phase 2B.5 Task 1D Integration Suite (11 tests)
cd apps/api && npx vitest run tests/integration/phase2b5-task1d-queue-heartbeat-recovery.test.ts

# 2. Complete Phase 2B.5 & Consumer Reports Integration Suites (58 tests total)
cd apps/api && npx vitest run --fileParallelism=false \
  tests/integration/phase2b5-task1d-queue-heartbeat-recovery.test.ts \
  tests/integration/phase2b5-cross-process-concurrency.test.ts \
  tests/integration/phase2b5-task1b-distributed-fulfillment.test.ts \
  tests/integration/phase2b5-report-commerce.test.ts \
  tests/integration/phase4-consumer-reports.test.ts

# 3. Monorepo TypeScript & Production Workspace Builds
cd apps/api && npx tsc --noEmit
npm run build --workspaces --if-present
```

### Test Results:
```text
✓ tests/integration/phase2b5-task1d-queue-heartbeat-recovery.test.ts (11 tests) (2267ms)
  ✓ 1. API crash after database commit leaves abandoned QUEUED report with enqueued=false
  ✓ 2. Recovery successfully re-enqueues an abandoned QUEUED report
  ✓ 3. Repeated recovery does not create duplicate queue jobs or reports
  ✓ 4. Redis unavailable during recovery does not lose recovery info, followed by successful retry
  ✓ 5. A legitimate job running longer than five minutes with heartbeats is not recovered as stale
  ✓ 6. Heartbeat cannot update FAILED or COMPLETED reports
  ✓ 7. Two independent worker processes attempting recovery simultaneously execute safely without conflict
  ✓ 8. Recovery lock expiry and stale-owner protection handles TTL cleanly
  ✓ 9. Active worker completion racing with recovery does not cause corrupt overwrite
  ✓ 10. Conditional failure updates never overwrite COMPLETED reports or orders
  ✓ 11. Failed generation remains retryable without another payment

Test Files  5 passed (5)
     Tests  58 passed (58)
  Duration  17.47s
```

All monorepo packages compiled cleanly:
- `@astro/admin` (Next.js 14): Static pages generated (22/22)
- `@astro/api`: `tsc` clean (0 errors)
- `@astro/astrology-engine`: `tsc` clean (0 errors)
- `@astro/gupta-nadi-engine`: `tsc` clean (0 errors)
- `@astro/prediction-engine`: `tsc` clean (0 errors)
- `@astro/report-engine`: `tsc` clean (0 errors)
- `@astro/shared`: `tsc` clean (0 errors)

---

## 8. Git Diff Summary

```text
 apps/api/src/services/report-worker.service.ts | 465 +++++++++++++++++++++++---
 apps/api/src/modules/reports/reports.service.ts |  75 ++++-
 apps/api/tests/helpers/process-report-runner.ts  |  16 +
 apps/api/tests/integration/phase2b5-cross-process-concurrency.test.ts | 1 +
 apps/api/tests/integration/phase4-consumer-reports.test.ts | 24 ++
 apps/api/tests/integration/phase2b5-task1d-queue-heartbeat-recovery.test.ts | 473 +++++++++++++++++++++++++++
 6 files changed, 1002 insertions(+), 52 deletions(-)
```

---

## 9. Known Limitations

1. **Redis Failover Advisory Lock Granularity**:
   When Redis is down and the system falls back to PostgreSQL advisory locks, PostgreSQL advisory locks are hashed 32-bit integers derived from the lock name. While collision probability across distinct lock names is negligible ($1 \text{ in } 2^{32}$), advisory locks are connection-bound or transaction-bound.
2. **Synchronous Report Pipeline Heartbeats**:
   `executeSynchronousReportPipeline` (used for synchronous fallback in integration tests) does not run background interval timers because it completes in a single synchronous stack execution; conditional DB writes protect it.

---

## 10. Confirmation of Zero Schema Changes

- Verified: No modifications were made to `apps/api/prisma/schema.prisma` in Task 1D.
- No new Prisma migrations were created.
- The existing Prisma schema and JSON fields (`metadata`) were utilized without alteration.

---

## 11. Confirmation of Zero Real Payments

- Verified: All commerce and report tests use mock test tokens, local database fixtures, and simulated order records.
- No live Razorpay API calls or network payment requests were made.

---

## 12. Confirmation Tasks 2, 3, and 4 Remain Untouched

- Verified:
  - Task 2 (WhatsApp Meta webhook and channel integration) has NOT been started.
  - Task 3 (Admin panel audit logging and RBAC extensions) has NOT been started.
  - Task 4 (Mobile app report download and offline caching) has NOT been started.
- All changes are strictly confined to the authorized Task 1D scope.

