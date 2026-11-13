# Phase 2B.5 Task 1B: Acceptance Audit Report
## Distributed Report Deduplication and Order Fulfilment Integrity

**Audit Date:** 2026-11-05  
**Auditor:** Independent AI Engineering Auditor  
**Scope:** Strictly Read-Only Independent Audit of Phase 2B.5 Task 1B Implementation  
**Documents Audited:** `PHASE_2B5_TASK1B_IMPLEMENTATION_REPORT.md`, Git diff, Prisma schema, and API source code  

---

## Executive Summary

This independent acceptance audit evaluated the Task 1B remediation across distributed concurrency, custom Redis networking, PostgreSQL advisory lock fallback, order-to-report lifecycle integrity, worker recovery, and test independence.

### Overall Audit Verdict: **ACCEPT WITH CONDITIONS**

The Task 1B implementation successfully provides cross-instance report deduplication and fulfills order lifecycle requirements without requiring database schema changes or data migrations. The Compare-And-Swap (CAS) atomic order claim and dual-engine locking (Redis + PostgreSQL advisory locks) successfully eliminate double-fulfillment and allow non-destructive retry after report generation failures.

However, several architectural caveats, performance risks in the custom TCP Redis client, and test isolation limitations were identified during code inspection and must be addressed prior to high-traffic production release.

---

## 1. Redis Lock Correctness

| Metric / Requirement | Status | Evidence / Line Reference |
| :--- | :---: | :--- |
| **1.1 Atomic Lock Acquisition** | **PASS** | [`NativeRedisClient.setNxPx`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/redis-client.ts#L218-L225) executes atomic Redis command `SET <key> <token> NX PX <ttlMs>`. |
| **1.2 Protected Token-Matching Release** | **PASS** | [`DistributedLockService.releaseScript`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/distributed-lock.service.ts#L29-L35) evaluates atomic Lua script `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`. |
| **1.3 Operation Exceeding 15s TTL** | **FAIL** | If a protected operation takes $> 15,000\text{ ms}$, Redis automatically expires the key (`PX 15000`). The lock drops in Redis while the thread continues executing. |
| **1.4 Lock Renewal (Watchdog)** | **FAIL** | [`DistributedLockService`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/distributed-lock.service.ts) contains no heartbeat timer, watchdog, or auto-renewal mechanism. |
| **1.5 Fencing Tokens** | **FAIL** | No monotonic fencing tokens are issued or validated at the database level. |
| **1.6 Expired Lock Holder DB Writes** | **FAIL** | An expired lock holder resuming after a delay (e.g. GC pause or slow PDF generation) will still execute DB writes (`prisma.report.create`) without verifying lock ownership. |
| **1.7 Delayed Release Safety** | **PASS** | Delayed release cannot delete another instance's lock because the Lua release script strictly checks token equality. |
| **1.8 Lock Error Handling** | **PASS** | [`acquireRedisLock`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/distributed-lock.service.ts#L50-L56) and [`releaseRedisLock`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/distributed-lock.service.ts#L66-L69) catch errors and log warnings without crashing. |
| **1.9 Guaranteed Cleanup on Exceptions** | **PASS** | [`withDistributedLock`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/distributed-lock.service.ts#L111-L115) wraps `fn()` in `try ... finally` calling `releaseRedisLock`. |
| **1.10 Scope of Lock Critical Section** | **PASS WITH CONDITIONS** | - In async mode (`input.async = true`), only fast validations and job enqueueing are executed under lock (~10-50ms).<br>- In synchronous mode ([`reports.service.ts:776-850`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L776-L850)), chart calculations, PDF compilation, and storage upload run *while holding the lock*. This can take 2-8 seconds, approaching the 15s TTL. |

---

## 2. Custom Redis Client Audit (`NativeRedisClient`)

| Area | Status | Findings & Technical References |
| :--- | :---: | :--- |
| **Redis URL Parsing** | **PASS WITH CONDITIONS** | [`NativeRedisClient.init`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/redis-client.ts#L29-L40) parses `host`, `port`, `password`, and `rediss:` protocol. However, database selection in URL path (`redis://.../1`) is ignored (no `SELECT` command sent). |
| **TLS Support (`rediss://`)** | **PASS WITH CONDITIONS** | Uses `tls.connect` ([line 157](file:///home/pilot/Projects/astrosushil/apps/api/src/services/redis-client.ts#L157)). However, `servername` (SNI) is not specified, which may cause TLS handshake failures on managed cloud Redis providers (e.g. AWS ElastiCache / Redis Cloud) requiring SNI. |
| **Socket Lifecycle & Connection Model** | **FAIL** | **Substantial Architectural Risk:** [`executeCommand`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/redis-client.ts#L154-L206) creates a brand new TCP connection (`net.createConnection`) and destroys it (`socket.destroy()`) for **every single command**. There is no connection pooling or persistent connection. In production or worker loops, polling `LPOP` every 3 seconds creates and destroys 1,200 connections/hour per worker, risking TCP ephemeral port exhaustion (`TIME_WAIT`). |
| **RESP Protocol Parsing** | **PASS WITH CONDITIONS** | [`parseResp`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/redis-client.ts#L88-L123) correctly decodes Simple Strings (`+`), Errors (`-`), Integers (`:`), and Bulk Strings (`$`). However, **RESP Arrays (`*`) are unparsed** (returns raw string), and there is **no chunk accumulation buffer** for fragmented TCP packets (assumes entire response arrives in single `data` event). |
| **Upstash REST Fallback** | **PASS WITH CONDITIONS** | Simple commands (`PING`, `RPUSH`, `LPOP`) work via REST URL path. However, `EVAL` with a multi-line Lua script in URL path ([line 134](file:///home/pilot/Projects/astrosushil/apps/api/src/services/redis-client.ts#L134)) is rejected by Upstash REST (requires POST JSON body). It catches the error and falls back to TCP. |
| **BullMQ Compatibility & Semantics** | **PASS** | Inspection of the monorepo confirmed that **BullMQ is NOT used anywhere in the codebase**. The report queue has always been a custom Redis list (`RPUSH`/`LPOP`) implemented in [`RedisQueueService`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/redis-queue.service.ts). Replacing the uninstalled `ioredis` import with `NativeRedisClient` restored TCP queue operations without breaking any BullMQ dependencies. |

---

## 3. PostgreSQL Advisory-Lock Fallback

| Metric / Requirement | Status | Evidence / Line Reference |
| :--- | :---: | :--- |
| **3.1 Transaction-Level Scope** | **PASS** | [`withDistributedLock`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/distributed-lock.service.ts#L132-L136) invokes `SELECT pg_advisory_xact_lock(${hash})` inside `prisma.$transaction`. |
| **3.2 Transaction Remains Open** | **PASS** | `return await fn()` is awaited inside the interactive transaction callback before Prisma commits. |
| **3.3 Automatic Lock Release** | **PASS** | PostgreSQL documentation guarantees `pg_advisory_xact_lock` auto-releases when the transaction commits or aborts. |
| **3.4 Cross-Instance Blocking** | **PASS** | In PostgreSQL, `pg_advisory_xact_lock` blocks any other session/transaction requesting the same 64-bit integer lock until the first transaction closes. |
| **3.5 Guaranteed Lock Acquisition** | **PASS** | A request cannot proceed without either Redis or PostgreSQL lock acquisition. If both fail, an exception is thrown. |
| **3.6 Connection Pool & Timeout Handling** | **PASS** | Prisma transaction timeout is configured to `{ timeout: 30000 }`. If a lock wait exceeds 30 seconds, Prisma aborts the transaction cleanly without deadlock. |
| **3.7 Critical Section Connection Scope Caveat** | **NOTE** | `fn()` inside `withDistributedLock` executes queries on the global `prisma` client rather than the transaction client `tx`. While the advisory lock successfully serializes concurrent callers across instances, inner database writes run on autocommit connections. |

---

## 4. Order-to-Report Integrity

| Metric / Requirement | Status | Evidence / Line Reference |
| :--- | :---: | :--- |
| **4.1 `birthProfileId` Storage Location** | **PASS** | `Order` has no direct `birthProfileId` column. The binding is stored on `Report.birthProfileId` linked via `Report.orderId` ([`schema.prisma:206-207`](file:///home/pilot/Projects/astrosushil/apps/api/prisma/schema.prisma#L206-L207)). |
| **4.2 Atomicity of Binding & Order Claim** | **PASS WITH CONDITIONS** | The claim (`Order.fulfillmentStatus = PROCESSING`) is executed first via CAS ([`reports.service.ts:257-266`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L257-L266)), and the `Report` row is created second ([`reports.service.ts:276-285`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L276-L285)). They are sequential queries rather than a single atomic interactive transaction. |
| **4.3 1:N Report Association** | **PASS WITH CONDITIONS** | In `schema.prisma`, `Report.orderId` is NOT `@unique`. Multiple `Report` rows can reference the same order (e.g. one FAILED report and one subsequent retry report). Application logic in `validateAndClaimOrder` ensures only one active/completed report is associated. |
| **4.4 Duplicate Records on Retry** | **PASS** | When retrying after `FAILED`, a new `Report` row is created while the previous record remains `FAILED` for auditability. |
| **4.5 Protection from Stale Worker State** | **PASS** | [`failJob`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L619-L626) transitions order to `FAILED` only `where: { id: failedReport.orderId, fulfillmentStatus: PROCESSING }`. A late failure cannot overwrite an order that has already transitioned to `FULFILLED`. |
| **4.6 Report ID Linked to Order** | **PASS** | Every completed or in-progress report stores `orderId`, allowing bidirectional navigation via `order.reports`. |
| **4.7 `FULFILLED` Updated Only After Success** | **PASS** | `Order.fulfillmentStatus` is updated to `FULFILLED` strictly in Stage 7 of [`CareerReportWorker`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L332-L343) and synchronous completion ([`reports.service.ts:894-901`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L894-L901)) after PDF upload succeeds. |
| **4.8 Webhook Idempotency** | **PASS** | [`webhooks.routes.ts:90-98`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/webhooks/webhooks.routes.ts#L90-L98) and [`commerce.service.ts:177-183`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/commerce/commerce.service.ts#L177-L183) check if order is already `PAID`; if so, they return cleanly without altering `fulfillmentStatus`. |
| **4.9 Simultaneous Claim Prevention** | **PASS** | Atomic CAS in [`reports.service.ts:257-269`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L257-L269) updates `where: { id: order.id, fulfillmentStatus: in [UNFULFILLED, FAILED] }`. If two requests execute simultaneously, row-level locking ensures only one updates the row; the second sees `count === 0` and is rejected with `409 ORDER_FULFILLMENT_CONFLICT`. |
| **4.10 DB vs Application Guarantees** | **PASS** | - **Database Guarantees:** Atomic row-level CAS claim (`updateMany`), unique `razorpayOrderId`.<br>- **Application Guarantees:** 1:1 `birthProfileId` order binding, deduplication of active jobs, and single-fulfilled-report constraint. |

---

## 5. Worker Failure and Recovery

| Metric / Requirement | Status | Evidence / Line Reference |
| :--- | :---: | :--- |
| **5.1 Worker Crash Recovery** | **PASS WITH CONDITIONS** | [`recoverStaleJobs`](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L84-L98) queries reports stuck in non-terminal states with `updatedAt < 5 minutes ago` and marks them `FAILED` and order `FAILED`.<br>**Limitation:** `recoverStaleJobs` is only invoked inside `enqueueReportJob` ([line 64](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts#L64)). It is **not** called periodically in [`apps/api/src/worker.ts`](file:///home/pilot/Projects/astrosushil/apps/api/src/worker.ts) or via background cron. |
| **5.2 Failed Order Recovery & Retry** | **PASS** | Failed generation leaves `Order.status = PAID` and `Order.fulfillmentStatus = FAILED`. [`validateAndClaimOrder`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L80-L107) allows retrying with the same `orderId` without re-charging. |
| **5.3 Storage Upload Failures** | **PASS** | [`reports.service.ts:845-871`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L845-L871) catches storage upload exceptions, creates a `FAILED` report record, and updates `order.fulfillmentStatus = FAILED`. |
| **5.4 Orphaned `PROCESSING` Order Handling** | **PASS WITH CONDITIONS** | If a server crashes between order CAS claim and `Report.create`, the order remains `PROCESSING`. Stale recovery currently inspects `Report` rows, not orphaned `Order` rows. A periodic reaper for `Order.fulfillmentStatus === 'PROCESSING'` with `updatedAt < 10 minutes ago` should be added in a future maintenance cycle. |

---

## 6. Test Independence and Quality

| Test Inspection Area | Status | Findings |
| :--- | :---: | :--- |
| **Two-Instance Test Independence** | **FAIL** | In [`tests/integration/phase2b5-task1b-distributed-fulfillment.test.ts:26-27`](file:///home/pilot/Projects/astrosushil/apps/api/tests/integration/phase2b5-task1b-distributed-fulfillment.test.ts#L26-L27), `appInstanceA` and `appInstanceB` are instantiated inside the **same Node.js process**. Because [`ReportsService.inflightJobLocks`](file:///home/pilot/Projects/astrosushil/apps/api/src/modules/reports/reports.service.ts#L33) is a `static readonly` map in shared memory, Test 1.1's second request is intercepted in-memory before reaching `withDistributedLock`. While Test 1.5 tests the Postgres lock fallback with Redis disabled, genuinely testing multi-process distributed contention requires running tests across separate OS worker processes or clearing the in-memory map. |
| **Redis Outage Simulation** | **PASS** | Test 1.5 uses `nativeRedisClient.setMockDisabled(true)` to cleanly test the PostgreSQL advisory lock fallback path under Redis failure. |
| **Actual Test Execution & Counts** | **PASS** | Verified actual execution of all 18 Task 1B integration tests (**18/18 PASS**) and full regression suite (41/41 PASS across Phase 4 and Phase 2B.5). Zero TypeScript errors on `tsc --noEmit`. |

---

## 7. Git and Scope Audit

| Scope Audit Item | Status | Verification Result |
| :--- | :---: | :--- |
| **Scope Boundary Discipline** | **PASS** | No code was written for Task 2 (`REPORT_FAILED` notifications), Task 3 (configurable IST delivery scheduling), or Task 4 (Career pipeline unification). |
| **No Schema or Migration Changes** | **PASS** | Git diff confirms **0 schema or migration modifications** made during Task 1B. |
| **No Production Config Modifications** | **PASS** | No `.env.production` or live credentials modified. |
| **Preservation of Earlier Phases** | **PASS** | Earlier phase changes in astrology engine and report mappers remain intact. |
| **Safety Directives** | **PASS** | Confirmed no real payments were initiated and no production database was accessed. |

---

## Remaining Risks & Required Conditions for Acceptance

1. **Redis Connection-Per-Command Inefficiency (High Priority for Production):**  
   The current `NativeRedisClient` opens and destroys a raw TCP socket connection on every single Redis command. Before deploying to high-traffic environments, connection pooling or persistent socket reuse must be introduced, or an approved lightweight persistent Redis package (e.g. `ioredis` properly added to `package.json`) should replace the ad-hoc socket implementation.

2. **Cron-Based Stale Job Reaper (Medium Priority):**  
   `recoverStaleJobs` should be called on a recurring timer inside `apps/api/src/worker.ts` (e.g. every 60 seconds) rather than only when a user triggers an `enqueueReportJob` call on the API.

3. **Lock Scope in Synchronous Report Generation (Medium Priority):**  
   In synchronous mode, the distributed lock should only be held during active report lookup, duplicate check, and order claim; PDF generation and storage upload should be decoupled from the lock to prevent lock timeouts on slow PDF compiles.

---

## Final Recommendation

### **ACCEPT WITH CONDITIONS**

**Conditions for production sign-off:**
1. Retain the verified Task 1B implementation for integration environments.
2. In Phase 2B.5 follow-up or Phase 2C, implement persistent connection pooling in `redis-client.ts` to eliminate TCP socket churn.
3. Wire `recoverStaleJobs` into `worker.ts` so orphaned jobs are recovered autonomously.

No further modifications are permitted in this turn. The engineering audit is concluded.

