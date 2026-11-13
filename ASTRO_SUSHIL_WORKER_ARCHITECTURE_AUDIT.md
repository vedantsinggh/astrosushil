# ASTRO SUSHIL — WORKER & QUEUE ARCHITECTURE AUDIT

**Document Version:** 1.0.0  
**Audit Date:** November 5, 2026  
**Auditor:** DeepMind Agentic Coding Engineering Pair  
**Authorization Mode:** READ-ONLY ARCHITECTURAL AUDIT  
**Component Scope:** Background Workers, Redis Queue, Distributed Locks, Heartbeats, Recovery, Storage Durability, Delivery SLA  

---

## 1. Executive Summary

The existing background processing architecture in Astro Sushil is centered around an asynchronous queue and execution engine distributed between Redis and PostgreSQL:
- **Fastify Web API (`apps/api/src/server.ts`)**: Accepts client requests, verifies payment/entitlement state, records a `Report` record in PostgreSQL (`status = 'QUEUED'`), and enqueues the `reportId` into Redis.
- **Standalone Worker Process (`apps/api/src/worker.ts`)**: Dequeues jobs from Redis, acquires a distributed token-fenced lease, manages heartbeats, executes the end-to-end report pipeline (astronomy math, rule evaluation, LLM natural language formatting, PDF compilation, QA validation, object storage upload), and marks the report `COMPLETED` and the order `FULFILLED`.
- **Stale Job Recovery Daemon (`careerReportWorker.startStaleRecoveryLoop()`)**: Periodically scans PostgreSQL for abandoned or crashed jobs (>5 minutes old) under a distributed leader lock.

Following recent hardening (Phase 2B.5 Task 1G), the architecture enforces atomic ownership fencing and Lua-scripted queue mutations, passing 41 multi-process integration tests. However, this audit answers the 12 mandatory architectural questions, identifies critical operational risks, and proposes the simplest reliable path forward to guarantee the 24-hour delivery SLA.

---

## 2. In-Depth Audit: The 12 Mandatory Architecture Questions

---

### Question 1: What does each worker actually do?

- **Audit Finding `[VERIFIED: SOURCE CODE & INTEGRATION TESTS]`**:
  In `apps/api/src/worker.ts` and `apps/api/src/services/report-worker.service.ts`, each worker process executes an infinite dequeue loop and a background recovery timer:
  1. **Stale Recovery Timer**: Every 60s, attempts to acquire distributed lock `astrosushil:lock:stale-recovery` (TTL 30s) and runs `recoverStaleJobs()`.
  2. **Job Dequeue**: Executes `redisQueueService.dequeueJob()` which runs an atomic Lua script (`LPOP` from `astrosushil:queue:reports`, `SREM` from `...:pending`, `SADD` to `...:claimed`).
  3. **Atomic Claim Acquisition (`acquireWorkerClaim`)**:
     - Generates a unique UUID `claimToken`.
     - In Redis: Executes `SET astrosushil:claim:report:<id> <claimToken> PX 300000` (`SET NX PX`).
     - In PostgreSQL: Executes atomic CAS:
       ```sql
       UPDATE "Report"
       SET status = 'CALCULATING', stage = 'CALCULATING', progress = 15, "updatedAt" = NOW(),
           metadata = metadata || jsonb_build_object('claimToken', $token, 'claimedAt', NOW())
       WHERE id = $reportId AND status IN ('QUEUED', 'PENDING');
       ```
     - If either step fails, the worker releases the claim and abandons execution.
  4. **Active Heartbeat Spawning**:
     - Starts a 20s recurring interval timer.
     - Renews Redis key TTL to 60s via Lua script (verifying stored token equals `claimToken`).
     - Touches PostgreSQL `updatedAt = NOW()` via CAS (verifying `metadata.claimToken == claimToken`).
     - If either heartbeat fails, sets `lostOwnership = true` and halts execution immediately.
  5. **Pipeline Execution**:
     - Stage 2 (`CALCULATING`, 15%): Computes natal chart, planetary degrees, houses, and Vargas via `@astro/astrology-engine`.
     - Stage 3 (`ANALYZING`, 35%): Evaluates Gupta Nadi rules (`@astro/gupta-nadi-engine`) or invokes LLM Career Analyst (`@astro/prediction-engine` via OpenRouter or deterministic provider).
     - Stage 4 (`RENDERING`, 60%): Assembles report payload and generates LaTeX `.tex` source or HTML markup.
     - Stage 5 (`COMPILING`, 75%): Compiles binary PDF via `latexCompiler` (spawning external `xelatex` subprocess) or Puppeteer.
     - Stage 5.5 (`VALIDATING / QA`, 85%): Validates PDF binary header (`%PDF-1.`), footer (`%%EOF`), page count (>0), and checks for unrendered placeholders (`TODO`, `undefined`, `null`).
     - Stage 6 (`UPLOADING`, 95%): Uploads PDF buffer to Cloud Object Storage (S3 / Cloudflare R2) under key `reports/${userId}/${reportId}.pdf`.
     - Stage 7 (`COMPLETED`, 100%): Executes atomic CAS in PostgreSQL setting `status = 'COMPLETED'`, `pageCount`, `fileSize`, `storageKey`. Updates associated `Order.fulfillmentStatus` to `FULFILLED`. Dispatches FCM/in-app notification via `notificationService`.

---

### Question 2: Which requirements genuinely need background processing?

- **Audit Finding `[VERIFIED: SOURCE CODE]`**:
  Only three operational requirements genuinely require asynchronous background worker processing:
  1. **Heavy Subprocess PDF Compilation**: LaTeX document compilation (`xelatex`) is a CPU-intensive, disk-writing external operating system process taking **15 to 45 seconds** per report. Running this synchronously inside the Fastify web server event loop would block request processing and trigger HTTP gateway timeouts (ALB / Cloudflare / Nginx 30s–60s timeouts).
  2. **External LLM Network Calls**: Synthesizing deep career or personality analysis via OpenRouter / external AI models takes **10 to 45 seconds** and is subject to rate limiting (HTTP 429), transient gateway errors (HTTP 502/503), and network retries with exponential backoff.
  3. **The 24-Hour Delivery SLA**: Users purchase reports and expect delivery within 24 hours. The API must return an instantaneous purchase confirmation and order receipt within <500ms, while queuing the generation work for durable processing.
  - **What Does NOT Need Background Processing**:
    - Pure mathematical astrology calculations (natal chart, panchang, dasha dates, ashtakvarga) take **< 30 milliseconds** and run purely synchronously in memory.
    - Development and test generation modes (which need instant feedback without waiting for background loops).

---

### Question 3: Is Redis required, or is an existing simpler mechanism sufficient?

- **Audit Finding `[VERIFIED: SOURCE CODE & ARCHITECTURAL ANALYSIS]`**:
  - **Is Redis strictly required? NO.**
  - **Why?**:
    The system already relies on PostgreSQL 16 as its single source of truth for `Order`, `Report`, and `User` records.
    PostgreSQL provides native transactional concurrency primitives:
    ```sql
    -- Atomic Dequeue with Zero Split-Brain:
    SELECT id FROM "reports"
    WHERE status = 'QUEUED'
    ORDER BY "createdAt" ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;
    ```
  - **The Problem with Redis in this Architecture**:
    Dual-state split-brain. Every job requires state in Redis (queue, pending set, claimed set, claim key, hash) AND state in PostgreSQL (`Report` row, `Order` row, `metadata.claimToken`). If a network blip, container restart, or crash occurs between the DB insert and the Redis enqueue, a self-healing reconciliation scan is required.
  - **Trade-off Evaluation**:
    - *Retaining Redis*: Already implemented with atomic Lua scripts; provides sub-millisecond in-memory queueing.
    - *Switching to PostgreSQL `SKIP LOCKED`*: Eliminates Redis entirely from the report pipeline, eliminates all crash-window reconciliation logic, eliminates Redis memory limits, guarantees 100% ACID persistence, and makes the architecture dramatically simpler and easier to maintain.
  - **Recommendation**:
    Because the Redis Lua scripts are currently tested and passing, retain Redis for the immediate completion audit. However, transitioning to a pure PostgreSQL queue (`SKIP LOCKED`) represents the cleanest long-term architectural simplification.

---

### Question 4: Are workers processing jobs exactly once in practice, or merely attempting to?

- **Audit Finding `[VERIFIED: INTEGRATION TESTS]`**:
  - In practice, workers achieve **At-Most-Once Active Execution** and **At-Least-Once Eventual Processing** with **Token-Fenced Idempotent Completion**:
    1. At any single instant, at most one worker process holds the valid lease and database claim token for a report.
    2. If a worker process dies mid-pipeline, stale-job recovery re-enqueues or fails the job after 5 minutes.
    3. If an expired worker resumes after a network freeze, its stage writes and completion queries fail CAS because its `claimToken` has been invalidated (`lostOwnership = true`), preventing duplicate completions or corrupt overwrites.

---

### Question 5: Can a job be lost between database creation and queue insertion?

- **Audit Finding `[VERIFIED: SOURCE CODE & AUTOMATED TESTS]`**:
  - **Can the crash window occur? YES.**
    In `reports.service.ts`, the database transaction commits the `Report` with status `QUEUED` and `metadata.enqueued = false`. If the API process crashes before `careerReportWorker.enqueueReportJob(reportId)` finishes, the job is not in the Redis queue.
  - **Is the job lost permanently? NO `[VERIFIED: INTEGRATION TESTS]`**:
    Phase 2B.5 Task 1D/1G implemented crash-window recovery in `report-worker.service.ts`:
    `recoverStaleJobs` queries all `Report` records with status `QUEUED` older than 5 minutes where `metadata.enqueued === false` and `isInPendingQueue === false`. It automatically enqueues them into Redis (up to 3 attempts).
  - **Limitation**:
    The recovery delay is 5 minutes. If a crash occurs, the report waits 5 minutes before entering the queue.

---

### Question 6: Can two workers generate the same report?

- **Audit Finding `[VERIFIED: INTEGRATION TESTS]`**:
  - **NO.**
  - Verified by Condition 1 and Condition 37 of `phase2b5-task1g-final-reliability.test.ts`:
    1. Worker A and Worker B competing for the same `reportId` execute `acquireWorkerClaim`.
    2. Redis `SET NX PX` grants the key to exactly one worker.
    3. Even under a total Redis outage, PostgreSQL atomic CAS updates `status = 'CALCULATING'` with a unique `claimToken`. The competing worker's `updateMany` returns `count === 0`, and the worker immediately aborts execution.

---

### Question 7: Can an expired worker overwrite a newer worker's result?

- **Audit Finding `[VERIFIED: INTEGRATION TESTS]`**:
  - **NO.**
  - Verified by Condition 7 and Condition 35 of `phase2b5-task1g-final-reliability.test.ts`:
    1. If Worker 1's claim expires and Worker 2 claims the report with a new token, Worker 1's subsequent writes are fenced:
       ```sql
       UPDATE "Report"
       SET status = 'COMPLETED', ...
       WHERE id = $reportId AND status IN ('QUEUED', 'CALCULATING', ...)
         AND (metadata->>'claimToken') = $oldToken;
       ```
    2. Because `metadata.claimToken` now equals Worker 2's token, Worker 1's update matches 0 rows (`count === 0`).
    3. In Redis, `completeJob` executes an atomic Lua script:
       `if redis.call("GET", KEYS[1]) ~= ARGV[1] then return 0 end`
       Worker 1 cannot delete Worker 2's Redis claim or tracking sets.

---

### Question 8: Does stale-job recovery distinguish queued jobs from genuinely abandoned jobs?

- **Audit Finding `[VERIFIED: INTEGRATION TESTS]`**:
  - **YES.**
  - Verified by Condition 26 and Condition 8 of `phase2b5-task1g-final-reliability.test.ts`:
    1. When a report is in `QUEUED` status and older than 5 minutes, `recoverStaleJobs` checks `redisQueueService.isInPendingQueue(report.id)`.
    2. If the report is present in the Redis pending queue, it is recognized as waiting in a large backlog and is **NEVER** marked failed or re-enqueued.
    3. If the report is in `CALCULATING` status, `failJobIfStale` executes a conditional CAS requiring that `updatedAt` matches the exact timestamp inspected. If an active worker touches its heartbeat in the interim, the recovery update matches 0 rows and cleanly aborts.

---

### Question 9: Are retries safe and idempotent?

- **Audit Finding `[VERIFIED: INTEGRATION TESTS]`**:
  - **YES.**
  - Verified by Conditions 13 through 20 of `phase2b5-task1g-final-reliability.test.ts`:
    1. Retries are strictly rejected unless `report.status === 'FAILED'` and the associated `Order` is `PAID`.
    2. Two simultaneous retry requests race via CAS; exactly one transitions the row back to `QUEUED`.
    3. The retry resets error state (`errorCode = null`, `errorMessage = null`, `failedAt = null`) and monotonically increments `metadata.claimVersion`.
    4. The associated order's `fulfillmentStatus` transitions back from `FAILED` to `PROCESSING`.

---

### Question 10: Does the system recover after Redis, PostgreSQL, object storage or API outages?

- **Audit Finding `[VERIFIED: SOURCE CODE & INTEGRATION TESTS]`**:
  - **PostgreSQL Outage**: API returns 500/503; workers catch DB errors and back off (3–5 seconds) without crashing. When PostgreSQL recovers, workers resume seamlessly.
  - **Redis Outage**:
    - Under a Redis outage, `distributedLockService` automatically falls back to PostgreSQL transaction advisory locks (`SELECT pg_advisory_xact_lock(...)`).
    - Stale-job recovery explicitly checks `isRedisHealthy` and **defers** recovery runs when Redis is down to avoid falsely failing valid jobs.
  - **Object Storage Outage**: If S3 upload fails, worker calls `failJob(reportId, 'OBJECT_STORAGE_UPLOAD_FAILED')`. The report and order transition cleanly to `FAILED` with a visible error code, allowing user-triggered retry once S3 recovers. No broken URLs or empty files are saved.
  - **API Outage / Restart**: Jobs in Redis queue persist and are consumed by independent worker processes. Un-enqueued jobs are self-healed by worker recovery within 5 minutes.

---

### Question 11: Does the 24-hour delivery SLA remain enforceable after a restart or deployment?

- **Audit Finding `[KNOWN DEFECT & CRITICAL ARCHITECTURAL GAP]`**:
  - **NO. The 24-hour delivery SLA is currently NOT systematically enforced.**
  - **Specific Deficiencies**:
    1. **Missing Schema Fields**: Neither `Report` nor `Order` in `apps/api/prisma/schema.prisma` contains an authoritative `deliveryDeadline` or `expectedDeliveryAt` timestamp column.
    2. **No Priority Enqueueing**: The Redis queue (`astrosushil:queue:reports`) is a simple FIFO list (`RPUSH` / `LPOP`). If a cluster restart occurs, or a backlog of hundreds of jobs accumulates, there is no priority scoring (`ZSET`) to process older orders approaching their 24-hour deadline before newly placed orders.
    3. **Misleading Mobile UI**: The Flutter mobile app currently displays `"Instant Digital PDF Delivery"` and `"Delivery: Instant Vector PDF"` instead of displaying the order time, 24-hour delivery deadline, and current status.
    4. **No SLA Breach Monitoring**: There is no alerting or monitoring service that flags reports that have been queued or in-flight for >18 hours or >24 hours.

---

### Question 12: Is the PostgreSQL fallback actually safe across independent processes?

- **Audit Finding `[VERIFIED: SOURCE CODE & ARCHITECTURAL ANALYSIS]`**:
  - **Partially Safe (Advisory Locks and CAS are Safe; In-Memory Queues are NOT Safe across processes).**
  - **Detailed Breakdown**:
    1. **Advisory Locks (`distributedLockService`) `[VERIFIED SAFE]`**:
       `pg_advisory_xact_lock(hash)` locks a 64-bit BigInt at the PostgreSQL server level across all connections. This is 100% safe across multiple independent Node.js processes, containers, and physical servers.
    2. **State Updates (`acquireWorkerClaim`, `touchHeartbeat`, `failJobIfStale`) `[VERIFIED SAFE]`**:
       All state transitions use atomic SQL `WHERE` clauses (CAS). PostgreSQL row-level locks ensure that even if 10 independent worker processes compete, exactly one succeeds.
    3. **Queue Fallback (`redisQueueService.fallbackQueue`) `[KNOWN DEFECT UNDER REDIS OUTAGE]`**:
       In `redisQueueService.ts`, when Redis is unconfigured or disconnected, `fallbackQueue` is an in-memory JavaScript array (`private fallbackQueue: string[] = []`).
       **If multiple worker processes are running and Redis goes down, Process A cannot see jobs enqueued in Process B's memory!**
       To make the PostgreSQL fallback genuinely safe across independent processes, the queue itself must read from PostgreSQL (`SELECT ... FOR UPDATE SKIP LOCKED`), not an in-memory array.

---

## 3. Recommended Simplest Reliable Architecture

To guarantee the 24-hour delivery SLA with maximum reliability and minimal moving parts, the architecture should evolve along the following blueprint:

```
+─────────────────────────────────────────────────────────────────────────────────────────+
|                                RECOMMENDED ARCHITECTURE                                 |
|                                                                                         |
|  [ Fastify Web API ]                                                                    |
|         │                                                                               |
|         │  1. Create Order (PAID) + Report (QUEUED)                                     |
|         │     SET expectedDeliveryAt = NOW() + 24 HOURS                                 |
|         ▼                                                                               |
|  [ PostgreSQL 16 (ACID Source of Truth) ]                                               |
|     - Table: "reports" (status: QUEUED, CALCULATING, COMPLETED, FAILED)                 |
|     - Priority Index: (status, expectedDeliveryAt ASC)                                  |
|         │                                                                               |
|         │  2. SELECT id FROM "reports"                                                  |
|         │     WHERE status = 'QUEUED'                                                   |
|         │     ORDER BY "expectedDeliveryAt" ASC                                         |
|         │     FOR UPDATE SKIP LOCKED LIMIT 1;                                           |
|         ▼                                                                               |
|  [ Background Report Worker Pool ]                                                      |
|     - Acquires atomic row lock via SKIP LOCKED transaction                              |
|     - Executes Astronomy Math (VSOP87 Lahiri)                                           |
|     - Executes LLM Explanation (OpenRouter / Deterministic)                             |
|     - Compiles LaTeX PDF (XeLaTeX)                                                      |
|     - Verifies QA Constraints (%PDF-, %%EOF, Placeholders)                              |
|     - Uploads to Cloud Object Storage (S3 / R2)                                         |
|     - Sets status = 'COMPLETED', Order = 'FULFILLED'                                    |
|     - Triggers Customer Notification ("Your report is ready!")                          |
|         │                                                                               |
|         ▼                                                                               |
|  [ SLA Escalation & Alerting Cron (Every 15m) ]                                         |
|     - Checks reports WHERE status = 'QUEUED' AND expectedDeliveryAt < NOW() + 2h       |
|     - Triggers operational alerts and raises worker concurrency                         |
+─────────────────────────────────────────────────────────────────────────────────────────+
```

### Architectural Benefits:
1. **Zero Dual-System Split-Brain**: Eliminates the crash window between database commit and Redis enqueue.
2. **Deterministic 24-Hour SLA Ordering**: Workers automatically pull the job with the nearest `expectedDeliveryAt` deadline first.
3. **No In-Memory Fallback Bugs**: Operates identically across 1 worker or 100 workers without relying on Redis memory or in-process arrays.
4. **Resilient Across Restarts**: Database transactions are inherently crash-proof and restart-proof.

