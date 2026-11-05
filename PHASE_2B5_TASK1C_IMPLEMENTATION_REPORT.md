# Astro Sushil: Phase 2B.5 Task 1C Implementation Report
## Distributed Infrastructure Hardening

**Date:** 2026-11-05  
**Author:** AI Engineering Agent  
**Status:** IMPLEMENTED & VERIFIED (Awaiting Independent Engineering Acceptance Audit)  
**Scope:** Distributed infrastructure hardening addressing the four critical findings of `PHASE_2B5_TASK1B_ACCEPTANCE_AUDIT.md`.

---

## 1. Executive Summary

In response to the independent audit of Task 1B, Task 1C was authorized to implement exactly four distributed infrastructure remediations:
1. **Maintained Redis Client Integration:** Replaced the custom raw TCP RESP socket client with standard, battle-tested `ioredis` (version `^5.11.1`), supporting connection pooling, keep-alive, TLS SNI, database index selection, backoff reconnection, graceful shutdown, and authenticated Upstash REST JSON POST fallback.
2. **Genuine Cross-Process Concurrency Verification:** Created process-level integration tests utilizing isolated Node.js child processes with independent memory heaps, isolated static Maps, and separate Fastify/service instances contending simultaneously against shared PostgreSQL and Redis infrastructure.
3. **Critical Section Minimization:** Deconstructed the distributed lock boundary in `ReportsService.createReportJob`. The distributed lock is now held exclusively for millisecond-level database validation, CAS order claiming, and initial report record creation (~15ms), releasing the lock *before* heavy CPU/IO operations (chart calculations, AI interpretation calls, PDF LaTeX compilation, and S3 upload).
4. **Autonomous Recurring Stale-Job Recovery:** Implemented an autonomous periodic recovery loop in `ReportWorkerService` and wired it into `worker.ts` with interval scheduling, concurrency mutex guards, and SIGINT/SIGTERM shutdown hooks to recover stale jobs and orphaned `PROCESSING` orders.

All 47 integration tests across 4 test suites pass cleanly.

---

## 2. Maintained Redis Client Replacement

### 2.1 Problems with Previous Custom Implementation
The previous Task 1B implementation in `redis-client.ts` utilized a custom raw Node.js `net.Socket` RESP protocol parser that had critical production risks:
- Fragmented TCP bulk strings or arrays arriving across multiple packets caused corrupted command responses.
- One-off TCP connection creation per command or brittle socket reuse without keep-alives or heartbeat management.
- Incomplete TLS handling for servername identification (SNI) when connecting to managed Redis instances (Upstash, AWS ElastiCache, Redis Enterprise).
- Ambient TypeScript stubs (`ioredis.d.ts`) that obscured real client type contracts.

### 2.2 Implementation with `ioredis`
- Explicit dependency declared in `apps/api/package.json`: `"ioredis": "^5.11.1"`.
- `ManagedRedisClient` in [redis-client.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/services/redis-client.ts) wraps `ioredis`:
  - Persistent, reusable connection created at application boot.
  - Configurable `REDIS_URL` or discrete `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS`, `REDIS_DB`.
  - Configured with `lazyConnect: true`, `maxRetriesPerRequest: 2`, `connectTimeout: 5000ms`, and exponential backoff retry strategy (`Math.min(times * 100, 2000)`).
  - Explicit TLS SNI support (`tls: { servername: ... }`) for `rediss://` schemes.
  - Database index selection via URL pathname (e.g. `redis://.../1` selects DB 1) or `REDIS_DB`.
  - Atomicity of distributed locks preserved:
    - Lock acquire: `this.client.set(key, token, 'PX', ttlMs, 'NX')` -> returns `'OK'` if acquired.
    - Lock release: Token-matching atomic Lua script:
      ```lua
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
      ```
    - Queue semantics preserved: `rpush` and `lpop` commands preserve FIFO ordering for `redis-queue.service.ts`.
- **Graceful Shutdown:** `quit()` method invokes `ioredis.quit()` on Fastify server close and worker process termination (`SIGINT` / `SIGTERM`).
- **Upstash Compatibility:** Preserved REST API fallback via JSON POST requests when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured without direct TCP Redis connectivity.

---

## 3. Genuine Cross-Process Concurrency Testing

### 3.1 Test Architecture & Process Isolation
Prior test fixtures ran two Fastify instances within the same Node.js process, sharing the static class variable `ReportsService.inflightJobLocks`. This masked whether distributed Redis locking or database advisory locking actually worked across distinct OS processes.

Task 1C created an isolated child process runner:
- **Helper Script:** [process-report-runner.ts](file:///home/pilot/Projects/astrosushil/apps/api/tests/helpers/process-report-runner.ts).
- **Execution Mechanism:** Uses `child_process.fork` with Node IPC. Each child process runs in a distinct PID with its own V8 heap, independent static memory, and its own Prisma Client connection pool.
- **Contention Mechanism:** Both processes connect to the identical test PostgreSQL database and Redis coordination layer. They synchronize via IPC `READY` signals, then receive an IPC `EXECUTE` message simultaneously to invoke `createReportJob` on equivalent payloads.

### 3.2 Test Coverage in `phase2b5-cross-process-concurrency.test.ts`
1. **Test 1.1 (Multi-Process Deduplication):** Two independent Node.js processes submit identical `(userId, birthProfileId, SKU: KUNDLI)` requests concurrently. Verified that exactly 1 `Report` record is created, exactly 1 BullMQ/Redis job is queued, and both processes receive the identical `reportId`.
2. **Test 1.2 (Orthogonal SKU Independence):** Two independent processes submit concurrent requests for different SKUs (`KUNDLI` vs `PLANETARY_SUMMARY`) on the same birth profile. Both succeed immediately without blocking each other.
3. **Test 1.3 (PostgreSQL Advisory-Lock Fallback Cross-Process):** Redis is disabled across both processes (`setMockDisabled(true)`). Two independent Node.js processes contend on PostgreSQL transaction advisory locks (`pg_advisory_xact_lock`). Exactly 1 report record is created and both resolve cleanly.
4. **Test 1.4 (Lock Expiration & Clean Cleanup):** Verified that simulated worker or lock exceptions do not leave residual locks; subsequent child process executions succeed immediately.
5. **Test 2.1 (Worker Stale-Job Recovery):** Simulates an orphaned job stuck in `QUEUED` >5 minutes following an abrupt worker crash. The stale recovery loop resets the report to `FAILED` and order `fulfillmentStatus` to `FAILED` (recoverable).
6. **Test 2.2 (Orphaned Order Recovery):** Simulates an orphaned `PAID` order stuck in `PROCESSING` without active report records. Verified autonomous recovery resets the order to `FAILED` for retry.

---

## 4. Shortened Distributed-Lock Critical Section

### 4.1 Previous vs New Critical Section
- **Previous Architecture (Task 1B):**
  The distributed lock was acquired around the entire report generation lifecycle in `executeReportJob`, including:
  - Chart planetary calculations (~200ms)
  - AI analysis provider calls (5–15 seconds or more)
  - LaTeX PDF generation via `pdflatex` (~1.5–3 seconds)
  - S3 / Local storage artifact upload (~300ms)
  - *Total Lock Duration:* 8,000ms – 18,000ms.
  - *Risk:* Exceeded the 15-second TTL on slow network or heavy CPU load, risking split-brain executions.

- **Hardened Architecture (Task 1C):**
  Deconstructed in `ReportsService.createReportJob`:
  - Extracted `initializeReportJob` to execute strictly under `withDistributedLock`.
  - Operations inside lock:
    1. Validate birth profile ownership & permissions (~3ms).
    2. Validate and claim order with CAS transition `UNFULFILLED | FAILED -> PROCESSING` (~5ms).
    3. Check active in-progress job or completed reusable report (~3ms).
    4. Create new `Report` record with `QUEUED` status (~4ms).
  - *Total Lock Duration:* **~15ms** (released immediately).
  - Heavy synchronous generation (`executeSynchronousReportPipeline`) runs entirely **outside the distributed lock**.
  - Worker async enqueue (`careerReportWorker.enqueueReportJob`) runs **outside the distributed lock**.

### 4.2 Timeline of Execution

```
Client Request
      │
      ▼
Acquire Distributed Lock (Redis SET NX PX or PG Advisory Lock)
      │
      ├─ 1. Verify birth profile ownership
      ├─ 2. CAS claim Order (UNFULFILLED/FAILED -> PROCESSING)
      ├─ 3. Deduplication check (Active / Completed)
      └─ 4. Persist Report record (QUEUED)
      │
Release Distributed Lock (~15ms total lock holding time)
      │
      ▼
Synchronous Pipeline or Background Queue (Lock is FREE for concurrent clients)
      ├─ Chart & Astrology calculations
      ├─ AI natural language interpretation
      ├─ LaTeX / PDF compilation
      ├─ S3 Object Storage upload
      └─ Update Report COMPLETED & Order FULFILLED
```

---

## 5. Recurring Stale-Job & Orphaned Order Recovery

### 5.1 Architecture
In `ReportWorkerService` ([report-worker.service.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/services/report-worker.service.ts)):
- Added `startStaleRecoveryLoop(intervalMs = 60000)`:
  - Runs every 60 seconds (configurable).
  - Guarded by an in-memory `isRecovering` mutex flag to prevent overlapping executions on slow database iterations.
  - Scans for reports with `status IN ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING']` where `updatedAt < NOW() - 5 minutes`. Marks reports `FAILED` with code `WORKER_TIMEOUT_RECOVERED` and transitions linked orders to `FAILED`.
  - Scans for `PAID` orders with `fulfillmentStatus == 'PROCESSING'` where `updatedAt < NOW() - 5 minutes` and no active reports exist. Transitions order to `FAILED` (recoverable) so the user or support can retry without paying again.
- Added `stopStaleRecoveryLoop()` for clean interval cancellation.

### 5.2 Worker Integration
In `worker.ts` ([worker.ts](file:///home/pilot/Projects/astrosushil/apps/api/src/worker.ts)):
- Invokes `careerReportWorker.startStaleRecoveryLoop()` upon worker startup.
- In graceful shutdown handlers (`SIGTERM`, `SIGINT`), invokes:
  ```ts
  careerReportWorker.stopStaleRecoveryLoop();
  await nativeRedisClient.quit();
  ```

---

## 6. Verification & Test Execution Results

All integration test suites were executed sequentially and in combination:

```bash
cd apps/api && npx vitest run \
  tests/integration/phase2b5-cross-process-concurrency.test.ts \
  tests/integration/phase2b5-task1b-distributed-fulfillment.test.ts \
  tests/integration/phase2b5-report-commerce.test.ts \
  tests/integration/phase4-consumer-reports.test.ts
```

### Result Summary
```
Test Files  4 passed (4)
     Tests  47 passed (47)
  Duration  6.61s
```

1. **`phase2b5-cross-process-concurrency.test.ts`**: 6/6 passed (Genuine 2-process concurrency, SKU independence, Postgres fallback, clean release, stale recovery).
2. **`phase2b5-task1b-distributed-fulfillment.test.ts`**: 18/18 passed (Distributed deduplication, order state machine, single-use enforcement, failure recovery).
3. **`phase2b5-report-commerce.test.ts`**: 18/18 passed (Razorpay native checkout verification, order fulfillment, SKU validation, entitlement checks).
4. **`phase4-consumer-reports.test.ts`**: 5/5 passed (Consumer report endpoints and permissions).

### TypeScript Compilation Check
```bash
cd apps/api && npx tsc --noEmit
# Exit code: 0 (Zero errors)
```

---

## 7. Scope & Integrity Assurance

- **Prisma Schema & Migrations:** 0 schema changes made in Task 1C.
- **Unrelated Modules:** Tasks 2, 3, and 4 were NOT touched.
- **Payment Safety:** No mock checkouts in production code; all real payment webhooks and verification require cryptographic Razorpay signature checks.

---

## 8. Status & Next Step

Task 1C is complete, verified, and ready for independent engineering acceptance audit.
*(Awaiting Phase 2B.5 Task 1C Independent Acceptance Audit)*

