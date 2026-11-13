# Phase 2B.5 Task 1B Implementation Report
## Distributed Report Deduplication & Order Fulfilment Integrity

**Date:** 2026-11-05  
**Branch:** `backend`  
**Author:** AI Engineering Agent  
**Status:** IMPLEMENTED & TESTED (Awaiting Independent Read-Only Acceptance Audit)

---

### 1. Existing Architecture & Identified Risks

#### 1.1 Process-Local Concurrency Risk (Identified in Task 1A Audit)
Prior to Task 1B, `ReportsService` used an in-memory process-local Map (`inflightJobLocks: Map<string, Promise<any>>`). While this protected identical requests landing on the exact same Node.js process thread:
- **Multi-Instance Ineffectiveness:** In clustered or multi-pod deployments (e.g. horizontal autoscaling on Kubernetes, AWS ECS, or multi-process PM2), requests arriving simultaneously at separate API instances completely bypassed this map.
- **Race Condition Vulnerability:** Two identical requests hitting Instance A and Instance B concurrently both checked `prisma.report.findFirst(...)` before either wrote to the database, resulting in duplicate `Report` rows in `QUEUED` state, duplicate BullMQ/Redis worker job enqueueing, and redundant AI compute invocation.
- **Dependency Missing in Runtime:** `RedisQueueService` imported `ioredis` dynamically, but `ioredis` was not listed in `package.json` dependencies, leaving Redis queue operations to fail silently or fall back inconsistently.

#### 1.2 Order Fulfilment Disconnect & Lifecycle Gaps
- **Lifecycle Desynchronization:** `Order.fulfillmentStatus` was never updated through the report execution lifecycle. Orders remained `UNFULFILLED` indefinitely even after reports were generated.
- **Premature Fulfillment Risk:** In unhardened paths, orders could be marked fulfilled simply because a job was enqueued, leading to unrecoverable paid orders if worker generation subsequently failed.
- **Cross-Profile Exploitation:** Paid orders were not authoritatively bound to the `birthProfileId` for which they were purchased, permitting a single paid order to potentially fulfill reports for arbitrary birth profiles.

---

### 2. Distributed Locking & Deduplication Design

#### 2.1 Dual-Engine Distributed Locking Architecture
To provide 100% reliable cross-instance concurrency serialization across all five supported report SKUs (`CAREER`, `KUNDLI`, `PLANETARY_SUMMARY`, `CAREER_PROSITY`, `MARRIAGE_COMPATIBILITY`), we implemented a dual-engine distributed locking coordinator (`DistributedLockService` at `apps/api/src/services/distributed-lock.service.ts`):

1. **Primary Layer: Atomic Redis Distributed Locks (via `NativeRedisClient`)**
   - Implemented a lightweight, zero-dependency Redis client (`apps/api/src/services/redis-client.ts`) utilizing Node's native `node:net` module communicating directly via the Redis RESP (REdis Serialization Protocol) standard, with an automatic REST fallback for Upstash.
   - Lock Acquisition: `SET astrosushil:lock:<userId>:<birthProfileId>:<reportType> <uuid_token> NX PX <ttlMs>`
   - Lock Release: Safe atomic release using Redis Lua script verifying that the key value matches `<uuid_token>` before deletion:
     ```lua
     if redis.call("get", KEYS[1]) == ARGV[1] then
       return redis.call("del", KEYS[1])
     else
       return 0
     end
     ```
   - Auto-Expiration: Default TTL of 15,000 ms prevents deadlocks if a server crashes during execution.

2. **Secondary/Fallback Guarantee Layer: PostgreSQL 64-bit Advisory Locks**
   - If Redis is unavailable, unreachable, or unconfigured, the lock coordinator automatically falls back to PostgreSQL transaction-level advisory locks (`pg_advisory_xact_lock(bigint)`).
   - The lock key is deterministically hashed to a 64-bit signed BigInt (`hash.readBigInt64BE(0)`).
   - Executed via Prisma (`tx.$executeRaw\`SELECT pg_advisory_xact_lock(${hash})\``) inside a transaction.
   - Cluster-Wide Guarantee: Guarantees serialization across all distributed API instances connecting to the shared PostgreSQL database even during complete Redis outages.

#### 2.2 Report Cache & Birth Profile Invalidation
- **Unmodified Profile Reuse:** If an existing `COMPLETED` report exists for `(userId, birthProfileId, reportType)` and `birthProfile.updatedAt <= existingReport.createdAt`, the completed report is reused idempotently without queuing duplicate work.
- **Profile Modification Detection:** If the user updates their birth profile details (`birthProfile.updatedAt > existingReport.createdAt`), stale completed reports are bypassed and a fresh calculation is executed.
- **In-Flight Active Reuse:** If an existing report is `QUEUED` or `GENERATING`, duplicate submissions return the active report ID and avoid enqueueing a second worker task.

---

### 3. Order Fulfilment Lifecycle

#### 3.1 State Machine
```
   [CREATED]
       │
       ▼ (User completes Razorpay payment & HMAC signature verified)
    [PAID] (fulfillmentStatus: UNFULFILLED)
       │
       ▼ (User requests report generation with orderId)
 [PROCESSING] (fulfillmentStatus: PROCESSING claimed atomically via CAS)
       │
 ┌─────┴──────────────────────────────┐
 │ (Generation succeeds)              │ (Generation fails)
 ▼                                    ▼
[FULFILLED]                         [FAILED] (Order remains status: PAID,
                                             fulfillmentStatus: FAILED,
                                             available for immediate retry)
```

#### 3.2 Key Fulfilment Integrity Guarantees
1. **Authoritative Ownership & SKU Validation:**
   - In `ReportsService.validateAndClaimOrder`, the order's `userId` must strictly match the authenticated user context.
   - The order's `status` must be `OrderStatus.PAID`.
   - The order SKU (`order.reportType` or `order.items[].catalogId`) must match the requested `reportType`.
2. **Birth Profile Binding:**
   - When an order fulfills a report, it is bound to `birthProfileId`. Subsequent attempts to reuse that paid order for a different birth profile are rejected with `403 Forbidden` (`"This paid order has already been bound to a different birth profile"`).
3. **Atomic Claim (Compare-And-Swap):**
   - Before queueing or executing report generation, an atomic DB update claims the order:
     ```ts
     const claimResult = await prisma.order.updateMany({
       where: {
         id: order.id,
         fulfillmentStatus: { in: [FulfillmentStatus.UNFULFILLED, FulfillmentStatus.FAILED] },
       },
       data: { fulfillmentStatus: FulfillmentStatus.PROCESSING },
     });
     ```
   - Two simultaneous requests cannot claim the same order; the second receives `409 ORDER_FULFILLMENT_CONFLICT`.
4. **Resilient Retry Without Re-Charging:**
   - If report worker compilation or storage upload fails, `failJob` transitions `Order.fulfillmentStatus` to `FAILED` while leaving `Order.status = PAID`.
   - The user can retry report generation using the exact same `orderId` without making a new payment.
5. **No Premature Fulfilment:**
   - The order is only marked `FULFILLED` in Stage 7 of `CareerReportWorker` or upon synchronous completion after artifacts have been written to S3/MinIO and DB record is updated to `COMPLETED`.

---

### 4. Database Changes

- **Schema Changes:** **NONE (0 schema changes).**
- The existing Prisma schema (`apps/api/prisma/schema.prisma`) already defined:
  - `Report.orderId` with `@relation(fields: [orderId], references: [id])`
  - `Order.fulfillmentStatus` with enum `FulfillmentStatus` (`UNFULFILLED`, `PROCESSING`, `FULFILLED`, `FAILED`, `CANCELLED`)
  - `Order.reports` back-relation `Report[]`
- No migrations were created or executed.
- No `prisma db push` was run.
- Zero risk of schema mismatch or migration rollback.

---

### 5. Files Changed

| File Path | Description of Changes |
| :--- | :--- |
| `apps/api/src/services/redis-client.ts` | **NEW FILE**: Lightweight native Redis client using Node's `node:net` and RESP protocol (`SET ... NX PX`, `EVAL` with Lua script, `RPUSH`, `LPOP`, `PING`) with Upstash REST fallback and mock simulation hooks. Zero external npm dependencies. |
| `apps/api/src/services/distributed-lock.service.ts` | **NEW FILE**: Dual-engine distributed lock coordinator (`withDistributedLock`, `acquireRedisLock`, `releaseRedisLock`, and PostgreSQL transaction advisory lock fallback `pg_advisory_xact_lock`). |
| `apps/api/src/services/redis-queue.service.ts` | Replaced uninstalled `ioredis` import with `nativeRedisClient`. |
| `apps/api/src/modules/reports/reports.service.ts` | Integrated `DistributedLockService` across report creation entry points. Implemented `validateAndClaimOrder` (checking ownership, payment status, SKU matching, birth profile cross-binding, and atomic CAS claim). Added `orderId` linkage and synchronous completion/failure handling. |
| `apps/api/src/services/report-worker.service.ts` | Updated worker pipeline: on completion (Stage 7), marks `Order.fulfillmentStatus = FULFILLED`. On `failJob`, transitions `Order.fulfillmentStatus = FAILED` (leaving `status: PAID` for retry). |
| `apps/api/tests/integration/phase2b5-task1b-distributed-fulfillment.test.ts` | **NEW FILE**: Comprehensive integration test suite (18 tests) testing two independent Fastify instances, distributed deduplication, lock expiration, worker crash recovery, and all order fulfillment lifecycle states. |
| `apps/api/tests/integration/phase4-consumer-reports.test.ts` | Updated mock order store to include `fulfillmentStatus: 'UNFULFILLED'` and mocked `prisma.order.updateMany`. |

---

### 6. Concurrency & Recovery Guarantees

1. **Distributed Mutex:** Guaranteed by atomic Redis `SET NX PX` or PostgreSQL `pg_advisory_xact_lock`. Prevents race conditions across multiple API instances.
2. **Crash Resilience:** Locks hold an automatic TTL (15s). If an instance terminates abnormally while holding a lock, the lock auto-expires without deadlock.
3. **Worker Crash & Orphaned Job Recovery:** When a report worker fails or encounters a storage upload error, `failJob` catches the failure, marks `Report.status = FAILED`, and resets `Order.fulfillmentStatus = FAILED`. This enables the user to re-request the report using their existing order.
4. **Idempotent Verification & Fulfilment:** Razorpay payment verification can be invoked multiple times; it returns the existing `PAID` order without resetting fulfillment or double-charging. Re-submitting an already fulfilled order idempotently returns the existing report.

---

### 7. Test Commands & Exact Results

#### Test Suite 1: Task 1B Distributed Deduplication & Order Fulfillment Suite
```bash
cd apps/api && npx vitest run tests/integration/phase2b5-task1b-distributed-fulfillment.test.ts
```
**Output:**
```
 ✓ tests/integration/phase2b5-task1b-distributed-fulfillment.test.ts (18) 2071ms
   ✓ Phase 2B.5 Task 1B: Distributed Report Deduplication & Order Fulfillment Integrity (18) 2070ms
     ✓ 1. Distributed Report-Job Deduplication (8) 743ms
       ✓ 1.1 Concurrent equivalent requests across two independent API instances produce identical reportId and single job
       ✓ 1.2 Concurrent requests for DIFFERENT report SKUs proceed independently without blocking
       ✓ 1.3 Distributed lock auto-expires after TTL without leaving deadlock 316ms
       ✓ 1.4 Distributed lock releases cleanly even if operation throws an error
       ✓ 1.5 Explicit fallback to PostgreSQL transaction advisory locks when Redis is unavailable
       ✓ 1.6 Stale orphaned job recovery handles worker crash and resets order to FAILED (recoverable)
       ✓ 1.7 Completed report is reused when birth profile is unmodified
       ✓ 1.8 Modified birth profile invalidates completed report reuse and generates fresh report
     ✓ 2. Order Fulfilment Integrity Lifecycle (10) 684ms
       ✓ 2.1 Verified payment followed by report generation transitions order through CREATED -> PAID -> PROCESSING -> FULFILLED
       ✓ 2.2 Failed report generation leaves a recoverable PAID order with FAILED fulfillmentStatus
       ✓ 2.3 Retry after failed generation succeeds using the same orderId without an additional charge
       ✓ 2.4 Submitting an already FULFILLED order for the same profile idempotently returns existing report
       ✓ 2.5 Submitting the same paid order for a DIFFERENT birth profile is strictly rejected with 403 Forbidden
       ✓ 2.6 Submitting an order with a MISMATCHED report SKU is strictly rejected with 403 Forbidden
       ✓ 2.7 Submitting another user's paid order is strictly rejected with 403 Forbidden
       ✓ 2.8 Two simultaneous fulfillment requests on the same order cannot fulfill the order twice
       ✓ 2.9 Webhook vs client verification race resolves cleanly and idempotently
       ✓ 2.10 Final order-to-report relationship is strictly bound and verifiable in database

 Test Files  1 passed (1)
      Tests  18 passed (18)
```

#### Test Suite 2: Full Commerce & Report Hardening Regression Suite
```bash
cd apps/api && npx vitest run tests/integration/phase4-consumer-reports.test.ts tests/integration/phase2b5-report-commerce.test.ts tests/integration/phase2b5-task1b-distributed-fulfillment.test.ts
```
**Output:**
```
 ✓ tests/integration/phase4-consumer-reports.test.ts (5) 1032ms
 ✓ tests/integration/phase2b5-report-commerce.test.ts (18) 1618ms
 ✓ tests/integration/phase2b5-task1b-distributed-fulfillment.test.ts (18) 2939ms

 Test Files  3 passed (3)
      Tests  41 passed (41)
```

#### TypeScript Compilation Verification
```bash
cd apps/api && npx tsc --noEmit
```
**Output:**
```
(Exit code 0 — Zero TypeScript compilation errors)
```

---

### 8. Known Limitations

1. **Redis Upstash REST Latency:** While TCP-based native Redis lock acquisition is sub-millisecond, Upstash REST fallback roundtrips take 50-150ms depending on region latency. The 250ms retry poll loop accommodates this.
2. **Postgres Advisory Lock Scope:** Postgres fallback locks use 64-bit integer hashing of the concurrency string. Sha256 64-bit truncation has collision probability of $\approx 10^{-18}$, which is mathematically negligible for astronomical report workloads.

---

### 9. Git Diff & Working-Tree Status

- Staged/Unstaged changes in working tree are restricted to Task 1B additions and existing changes from prior authorized tasks.
- No schema or migration files were touched in Task 1B.
- No changes made to Flutter UI, astrology calculation packages, PDF engines, or admin portals.

---

### 10. Confirmation of Safety Directives

1. **No Real Payments:** All tests ran against mock payment verifications using local test HMAC calculations; zero calls were made to Razorpay production APIs.
2. **No Production Database Modifications:** All tests were executed against local isolated test databases (`astro_sushil_test`).
3. **Tasks Untouched:** Tasks 2 (`REPORT_FAILED` notifications), Task 3 (configurable IST delivery scheduling), and Task 4 remain untouched.

---

### 11. Conclusion & Next Steps

Task 1B is **IMPLEMENTED and TESTED**. In accordance with the instructions, no acceptance is claimed here. The codebase is now ready for a strictly read-only independent acceptance audit of Phase 2B.5 Task 1B.

