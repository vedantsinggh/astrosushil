# Astro Sushil: Phase 2B.5 Task 1C Follow-up Acceptance Audit
## Distributed Infrastructure & Resilience Audit

**Date:** 2026-11-05  
**Auditor:** Independent AI Engineering Auditor  
**Status:** AUDIT COMPLETE (Actionable Findings Identified)  
**Scope:** Strictly read-only audit of Task 1C implementation across `apps/api`, evaluating distributed concurrency, locking, queue mechanics, recovery loops, and system failure modes.

---

## Executive Summary

This independent audit evaluated the four remediations delivered in Task 1C (`PHASE_2B5_TASK1C_IMPLEMENTATION_REPORT.md`):
1. Integration of `ioredis` replacing the custom RESP parser.
2. Cross-process concurrency tests using isolated Node.js child processes.
3. Shortening of the distributed lock critical section.
4. Autonomous recurring stale-job recovery.

The audit verified that the primary goals—replacing the brittle TCP client, shortening the lock critical section to ~15ms, and testing genuine cross-process coordination—were successfully executed and verified by automated tests. However, this in-depth resilience audit identified **two failure windows** in the asynchronous pipeline and recovery architecture that must be addressed prior to high-volume production deployment:
- **Queue Crash Window:** An API crash between the database commit of a `QUEUED` report and the Redis `enqueueJob` call leaves the report stranded until the 5-minute timeout marks it `FAILED` rather than autonomously re-enqueuing it.
- **Worker/Recovery Race & Queue Starvation:** A job delayed in a deep queue backlog (>5 minutes) or a slow-running pipeline stage can be prematurely marked `FAILED` by `recoverStaleJobs` without distributed locking or heartbeats, risking split-brain overwrites if the worker later completes.

---

## Detailed Audit Findings

```
┌──────────────────────────────────────────────────────────┬──────────────┐
│ Evaluation Area                                          │ Verdict      │
├──────────────────────────────────────────────────────────┼──────────────┤
│ 1. Queue Crash Window                                    │ FAIL         │
│ 2. Order CAS and Deduplication                           │ PASS         │
│ 3. Stale-Job Detection & Heartbeats                     │ FAIL         │
│ 4. Multi-Worker Recovery Coordination                    │ FAIL         │
│ 5. Redis Fallback to PostgreSQL Advisory Locks           │ PASS         │
│ 6. Lock Expiry, Ownership & Fencing                      │ PASS         │
│ 7. Queue Implementation & BullMQ Discrepancy             │ PASS         │
│ 8. Change Inventory & Scope Compliance                   │ PASS         │
└──────────────────────────────────────────────────────────┴──────────────┘
```

---

### Finding 1: Queue Crash Window
- **Verdict:** **FAIL**
- **Component / File:** [reports.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L572-L596) (`createReportJob`, `initializeReportJob`) and [report-worker.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L142-L155) (`recoverStaleJobs`)

#### Evidence & Analysis
In [reports.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L572-L596):
```typescript
const runTask = async () => {
  // 1. Critical section under distributed lock (commits DB record and CAS order claim)
  const initResult = await distributedLockService.withDistributedLock(concurrencyKey, async () => {
    return await this.initializeReportJob(input, user);
  });

  if (initResult.reused) {
    return initResult.result;
  }

  // If async mode requested, enqueue in background worker and return immediately
  if (input.async) {
    careerReportWorker.enqueueReportJob(initResult.reportId); // <--- UNPROTECTED WINDOW
    return {
      reportId: initResult.reportId,
      id: initResult.reportId,
      status: 'QUEUED',
      stage: 'QUEUED',
      progress: 0,
      reused: false,
    };
  }
  ...
};
```
1. `initializeReportJob` executes under the distributed lock. It claims the order (`fulfillmentStatus = PROCESSING`) and persists the `Report` with `status = QUEUED`. The database transaction commits and the distributed lock is released.
2. If the API process terminates abruptly (OOM kill, node crash, power interruption) between the release of the lock and the completion of `careerReportWorker.enqueueReportJob(initResult.reportId)`, the job ID is never written to Redis (`astrosushil:queue:reports`).
3. In [report-worker.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L142-L155):
```typescript
const staleReports = await prisma.report.findMany({
  where: {
    status: { in: ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'] as any[] },
    updatedAt: { lt: fiveMinutesAgo },
  },
});

for (const r of staleReports) {
  logger.warn({ reportId: r.id, status: r.status }, '[CareerReportWorker] Recovering orphaned stale job');
  await this.failJob(r.id, 'WORKER_TIMEOUT_RECOVERED', 'Report processing timed out or server restarted. Please try again.');
  recoveredReports++;
}
```
When recovery runs after 5 minutes, it does **not** re-enqueue the un-started `QUEUED` job; it permanently transitions the report to `FAILED` and the order to `FAILED`. While this leaves the order recoverable for a manual retry, the system fails to autonomously fulfill the purchased report.

#### Proposed Safe Remediation (Zero Schema Changes)
In `report-worker.service.ts:recoverStaleJobs`:
When inspecting `staleReports`, distinguish between jobs that crashed mid-flight (`progress > 0` or status `!= 'QUEUED'`) and un-started jobs (`status === 'QUEUED'` and `progress === 0`):
- For un-started `QUEUED` reports whose `createdAt < fiveMinutesAgo`, re-enqueue the job ID via `redisQueueService.enqueueJob(r.id)` and touch `updatedAt = new Date()`, with an in-memory or metadata retry counter (up to 3 retries) before marking `FAILED`.
- Alternatively, perform the Redis `enqueueJob` call **inside** `initializeReportJob` before the lock is released.

---

### Finding 2: Order CAS and Deduplication
- **Verdict:** **PASS**
- **Component / File:** [reports.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L39-L125) (`validateAndClaimOrder`), [reports.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L624-L796) (`initializeReportJob`)

#### Evidence & Analysis
1. **Validation Checks (Ownership, SKU, Profile Binding):**
   In `validateAndClaimOrder`:
   - Enforces user ownership: `order.userId !== user.id && !this.isAdminUser(user) -> 403 Forbidden`.
   - Enforces paid status: `order.status !== OrderStatus.PAID -> 403 Forbidden`.
   - Enforces SKU match: Verifies `order.reportType === reportType` or `order.items` catalog ID matching target SKU -> `403 Forbidden` on mismatch.
   - Enforces birth profile binding:
     ```typescript
     const foreignReport = order.reports?.find((r: any) => r.birthProfileId !== birthProfileId);
     if (foreignReport) {
       throw new ForbiddenError('This paid order has already been bound to a different birth profile');
     }
     ```
   - Enforces completed fulfillment reuse: If `order.fulfillmentStatus === FULFILLED`, idempotently returns the order if a completed report exists for this profile; otherwise rejects with `400 ORDER_ALREADY_FULFILLED`.

2. **Atomic CAS State Transition:**
   In `initializeReportJob`:
   ```typescript
   if (order && order.fulfillmentStatus !== FulfillmentStatus.PROCESSING) {
     const claimResult = await prisma.order.updateMany({
       where: {
         id: order.id,
         status: OrderStatus.PAID,
         fulfillmentStatus: { in: [FulfillmentStatus.UNFULFILLED, FulfillmentStatus.FAILED] },
       },
       data: {
         fulfillmentStatus: FulfillmentStatus.PROCESSING,
       },
     });
     if (claimResult.count === 0 && order.fulfillmentStatus !== FulfillmentStatus.PROCESSING) {
       throw new AppError('Order fulfillment is already in progress or completed', 409, 'ORDER_FULFILLMENT_CONFLICT');
     }
   }
   ```
   If two requests arrive concurrently:
   - Request 1 transitions `UNFULFILLED -> PROCESSING` (`claimResult.count === 1`).
   - Request 2 finds `claimResult.count === 0`. Because in-memory `order.fulfillmentStatus` is `UNFULFILLED`, it throws `409 ORDER_FULFILLMENT_CONFLICT`.
   - If Request 2 arrives while Request 1 is already `PROCESSING` without `forceRegenerate`, Step 4 detects `activeReport` and reuses it without attempting to re-claim the order.
   - If an earlier generation failed (`fulfillmentStatus === FAILED`), the CAS condition `{ in: [UNFULFILLED, FAILED] }` permits retry without an additional charge.

---

### Finding 3: Stale-Job Detection & Heartbeats
- **Verdict:** **FAIL**
- **Component / File:** [report-worker.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L681-L696) (`updateJobStatus`), [report-worker.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L129-L155) (`recoverStaleJobs`)

#### Evidence & Analysis
1. **Operations that Update `updatedAt`:**
   In `report-worker.service.ts`, `updatedAt` is updated strictly when `updateJobStatus` is called at discrete stage transitions:
   - `QUEUED` (0%)
   - `CALCULATING` (15%)
   - `ANALYZING` (35%)
   - `RENDERING` (60%)
   - `COMPILING` (75%)
   - `VALIDATING` (85%)
   - `UPLOADING` (95%)
   - `COMPLETED` (100%)
2. **Absence of Background Heartbeat:**
   There is no interval heartbeat timer while a worker is executing within a single long-running stage.
3. **Queue Starvation & Premature Failure Window:**
   - A report created in `QUEUED` status has its `updatedAt` timestamp initialized to `now()`.
   - If 3 reports are already queued and each takes 2 minutes to generate, Report #4 will sit in Redis waiting to be popped for >6 minutes.
   - While Report #4 is still legitimately waiting in the queue, `recoverStaleJobs` executes:
     `where: { status: { in: ['QUEUED', ...] }, updatedAt: { lt: fiveMinutesAgo } }`.
     Because Report #4 has not been popped yet, its `updatedAt` is >5 minutes old.
     `recoverStaleJobs` prematurely marks Report #4 `FAILED` with `WORKER_TIMEOUT_RECOVERED`!
4. **Worker/Recovery Race Condition:**
   `recoverStaleJobs` performs no check on whether a worker process is currently processing the report. If a LaTeX compilation or LLM retry takes 5 minutes and 10 seconds:
   - `recoverStaleJobs` marks the report `FAILED` and order `FAILED`.
   - The worker finishes 5 seconds later and executes:
     `prisma.report.update({ where: { id: reportId }, data: { status: 'COMPLETED' } })`.
   - Result: Inconsistent state where `report.status = COMPLETED` but `order.fulfillmentStatus = FAILED`.

#### Proposed Remediation
1. **Active Heartbeat:** While a worker is actively executing a pipeline, touch `updatedAt` periodically (e.g. every 30 seconds via `setInterval`).
2. **Queue Backlog Exemption:** For `status === 'QUEUED'`, do not fail based on `updatedAt` unless the job was verified missing from the Redis queue.
3. **Optimistic Locking on Failure:** In `failJob`, use conditional update: `prisma.report.updateMany({ where: { id: reportId, status: { notIn: ['COMPLETED', 'FAILED'] } } })`.

---

### Finding 4: Multi-Worker Recovery Coordination
- **Verdict:** **FAIL**
- **Component / File:** [report-worker.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L129-L135) (`recoverStaleJobs`)

#### Evidence & Analysis
1. **In-Memory Mutex Non-Distribution:**
   ```typescript
   public async recoverStaleJobs(): Promise<{ recoveredReports: number; recoveredOrders: number }> {
     if (this.isRecovering) {
       logger.debug('[CareerReportWorker] Stale recovery already in progress, skipping overlapping run.');
       return { recoveredReports: 0, recoveredOrders: 0 };
     }
     this.isRecovering = true;
   ```
   `this.isRecovering` is an in-memory boolean variable local to a single Node.js process.
2. **Multi-Worker Execution:**
   When scaling the backend to multiple worker instances (e.g. 2 worker pods in Kubernetes or 2 cluster workers):
   - Every worker process starts its own `setInterval(..., 60000)` via `startStaleRecoveryLoop()`.
   - All worker processes trigger `recoverStaleJobs()` concurrently.
   - Because no distributed lock (e.g. `astrosushil:lock:stale-recovery` or PostgreSQL advisory lock) guards `recoverStaleJobs()`, all workers perform identical queries simultaneously.
3. **Database-Level Conditional Updates:**
   - The second loop ([report-worker.service.ts#L176-L179](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L176-L179)) uses `prisma.order.updateMany({ where: { id: ord.id, fulfillmentStatus: 'PROCESSING' } })`, which is conditionally safe.
   - However, the report update in `failJob` ([report-worker.service.ts#L702](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L702)) uses `prisma.report.update({ where: { id: reportId } })`, causing redundant writes and lock contention in PostgreSQL.

#### Proposed Remediation
Wrap the body of `recoverStaleJobs()` in a distributed lock with a short TTL:
```typescript
return await distributedLockService.withDistributedLock('astrosushil:lock:stale-recovery', async () => {
  ...
}, { ttlMs: 30000, waitTimeoutMs: 500 });
```

---

### Finding 5: Redis Fallback to PostgreSQL Advisory Locks
- **Verdict:** **PASS**
- **Component / File:** [distributed-lock.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/services/distributed-lock.service.ts#L77-L135) (`withDistributedLock`), [phase2b5-cross-process-concurrency.test.ts](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/phase2b5-cross-process-concurrency.test.ts#L264-L296) (Test 1.3)

#### Evidence & Analysis
1. **Fallback Logic:**
   In `distributed-lock.service.ts`:
   - Checks `isRedisWorking = await nativeRedisClient.ping()`.
   - If Redis ping fails, catches error or evaluates `false`.
   - Hashes `lockKey` via SHA-256 into a signed 64-bit integer (`hashKeyToBigInt`).
   - Opens a PostgreSQL transaction:
     ```typescript
     const lockId = this.hashKeyToBigInt(lockKey);
     return await prisma.$transaction(async (tx) => {
       await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;
       return await fn();
     }, { timeout: waitTimeoutMs });
     ```
2. **Cross-Process Verification:**
   - In Test 1.3 of `phase2b5-cross-process-concurrency.test.ts`, Redis is disabled across both independent Node.js processes (`worker1` and `worker2`).
   - Both processes submit concurrent report requests for the same order and profile.
   - PostgreSQL manages the transaction-level advisory locks at the server engine level. Process 2 is blocked on `pg_advisory_xact_lock` until Process 1's transaction commits.
   - Verified: Both processes resolve with identical `reportId`, and strictly 1 report record is created.
3. **Caveat on `setMockDisabled(true)`:**
   `setMockDisabled(true)` tests the explicit code branch where Redis is flagged as offline. While it confirms the fallback logic works across processes, it does not simulate mid-transaction TCP network partitions or socket hang timeouts.

---

### Finding 6: Lock Expiry, Ownership & Fencing
- **Verdict:** **PASS**
- **Component / File:** [distributed-lock.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/services/distributed-lock.service.ts#L29-L70), [phase2b5-task1b-distributed-fulfillment.test.ts](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/phase2b5-task1b-distributed-fulfillment.test.ts#L237-L275)

#### Evidence & Analysis
1. **Atomic Acquisition & Ownership Token:**
   Acquired via `SET lockKey token PX 15000 NX`. Token is a cryptographically unique UUID (`crypto.randomUUID()`).
2. **Safe Lock Release (Lua Script):**
   ```lua
   if redis.call("get", KEYS[1]) == ARGV[1] then
     return redis.call("del", KEYS[1])
   else
     return 0
   end
   ```
   If Client A's lock expires and Client B acquires the lock with a new token, when Client A attempts to release, `redis.call("get", KEYS[1])` returns Client B's token. The comparison evaluates to false, and the key is **not** deleted. Verified: An old lock owner cannot delete a newer owner's lock.
3. **Shortened Critical Section as Fencing Mitigation:**
   In Task 1B, holding the lock during 15-second PDF rendering risked TTL expiry and split-brain execution. In Task 1C, the critical section was shortened to ~15ms (in-memory validation, CAS order update, `Report` row insert). Because the critical section completes in milliseconds, the 15,000ms TTL provides a ~1000x safety margin against premature lock expiry.
4. **Test Distinction:**
   - Test 1.3 in `phase2b5-task1b-distributed-fulfillment.test.ts` is an **actual TTL expiry test** (sets 200ms TTL, waits 300ms, verifies re-acquisition).
   - Test 1.4 in Task 1B and Test 1.4 in Task 1C are **simulated exception tests** (verify release in `finally` blocks).

---

### Finding 7: Queue Implementation & BullMQ Discrepancy
- **Verdict:** **PASS**
- **Component / File:** [redis-queue.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/services/redis-queue.service.ts), [worker.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/worker.ts), [report-worker.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts)

#### Evidence & Analysis
1. **BullMQ Discrepancy Resolution:**
   The specification files and `AGENTS.md` referenced "BullMQ". Code inspection confirms that `bullmq` is **not installed** in `apps/api/package.json` nor imported in any source file. The actual queue architecture is a custom Redis List queue:
   - Enqueue: `RPUSH astrosushil:queue:reports <reportId>` in `redis-queue.service.ts`.
   - Dequeue: `LPOP astrosushil:queue:reports` in `worker.ts`.
   - Fallback: Local array queue (`this.jobQueue`) in `report-worker.service.ts` when Redis is unavailable.
2. **Queue Semantics:**
   - **FIFO:** `RPUSH` adds to the tail; `LPOP` removes from the head. FIFO ordering is strictly preserved.
   - **Retries:** There are no automatic retries at the Redis list level. When an unhandled error occurs in `executeReportPipeline`, `failJob` marks the report and order `FAILED`. The user or client initiates retries, which transition `FAILED -> PROCESSING` without extra billing.
   - **Duplicate Prevention:** Handled in `executeReportPipeline`:
     ```typescript
     const activeStatuses = ['CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'];
     const timeSinceLastUpdate = Date.now() - new Date(report.updatedAt).getTime();
     if (activeStatuses.includes(report.status) && timeSinceLastUpdate < 120000) {
       return; // Skips duplicate execution within 2 minutes
     }
     ```
   - **Crash Recovery:** If a worker crashes after `LPOP`, the job is recovered by `recoverStaleJobs` via PostgreSQL `updatedAt < fiveMinutesAgo`.

---

### Finding 8: Change Inventory & Scope Compliance
- **Verdict:** **PASS**
- **Component / File:** Git Working Tree & Repository Status

#### Evidence & Analysis
1. **Clean Scope Control:**
   - **Zero Schema or Migration Changes:** `apps/api/prisma/schema.prisma` was not altered in Task 1C.
   - **Tasks 2, 3, and 4 Preserved:** No code in payment checkout, client UI, or admin panel was modified.
2. **`git diff --stat` Summary:**
   The Task 1C hardening modified:
   - `apps/api/package.json`: Added `ioredis@^5.11.1`.
   - `apps/api/src/services/redis-client.ts`: Implemented `ManagedRedisClient` using `ioredis`.
   - `apps/api/src/services/report-worker.service.ts`: Implemented `startStaleRecoveryLoop`, `stopStaleRecoveryLoop`, and orphaned order recovery.
   - `apps/api/src/worker.ts`: Wired recurring recovery loop and graceful shutdown hooks.
   - `apps/api/src/modules/reports/reports.service.ts`: Deconstructed `createReportJob` into lock-protected `initializeReportJob` (~15ms) and unlocked `executeSynchronousReportPipeline`.
   - `apps/api/src/types/ioredis.d.ts`: Removed obsolete type stub.
   - `apps/api/tests/helpers/process-report-runner.ts`: Created IPC runner for multi-process concurrency testing.
   - `apps/api/tests/integration/phase2b5-cross-process-concurrency.test.ts`: Added 6 genuine cross-process tests.

3. **Exact Test Execution Commands & Verification:**
   All 47 tests passed:
   ```bash
   cd apps/api && npx vitest run \
     tests/integration/phase2b5-cross-process-concurrency.test.ts \
     tests/integration/phase2b5-task1b-distributed-fulfillment.test.ts \
     tests/integration/phase2b5-report-commerce.test.ts \
     tests/integration/phase4-consumer-reports.test.ts
   ```
   **Output:** `Test Files 4 passed (4), Tests 47 passed (47), Duration 6.61s`.
   
   TypeScript compilation check:
   ```bash
   cd apps/api && npx tsc --noEmit
   ```
   **Output:** `Exit code: 0` (Zero compiler errors).

---

## Summary of Actionable Remediations

To harden the production queue prior to Phase 3 load:
1. **Queue Crash Window:** In `recoverStaleJobs`, re-enqueue orphaned `status: 'QUEUED'` reports (`progress === 0`) rather than marking them `FAILED`.
2. **Heartbeat During Processing:** Add a 30-second heartbeat in `executeReportPipeline` to touch `updatedAt` during heavy LLM and LaTeX operations, preventing premature recovery sweeps.
3. **Multi-Worker Distributed Recovery Lock:** Acquire a Redis distributed lock (`astrosushil:lock:stale-recovery`, 30s TTL) at the start of `recoverStaleJobs` so only one worker instance runs recovery at a time.
4. **Conditional Update in `failJob`:** Change `prisma.report.update` to `updateMany` with `status: { notIn: ['COMPLETED', 'FAILED'] }` to eliminate worker/recovery overwrite races.

---

*(Audit completed in read-only mode. Working tree preserved without modification.)*

