import { Prisma, ReportStatus } from '@prisma/client';
import { prisma } from './prisma.service';
import { logger } from '../utils/logger';
import { newClaimToken, instanceClaimPrefix, bootClaimPrefix } from './process-identity';

/**
 * Leases are short (60 s, renewed by the heartbeat). A lease further in the
 * future than this cannot have been written by a live worker on the same clock
 * basis (e.g. it was written while the DB session ran in another time zone), so
 * recovery treats it as stale instead of waiting hours for it.
 */
export const MAX_PLAUSIBLE_LEASE_MINUTES = 30;

export interface ClaimedReportJob {
  id: string;
  claimToken: string;
  claimVersion: number;
  claimExpiresAt: Date;
  executionAttempts: number;
  recoveryAttempts: number;
  reportType: string;
  orderId: string | null;
  userId: string;
  birthProfileId: string;
  fulfillmentUnitId: string | null;
}

export interface EnqueueOptions {
  expectedDeliveryAt?: Date;
  priority?: number;
}

export class PostgresQueueService {
  private readonly defaultLeaseDurationSeconds = 60;
  private readonly defaultHeartbeatExtensionSeconds = 60;
  private readonly maxRecoveryAttempts = 3;

  /**
   * Enqueue a report job idempotently.
   * - Transition to QUEUED if in PENDING, or keep in QUEUED.
   * - Never overwrite an active worker claim (claimExpiresAt > clock_timestamp()).
   * - Never re-enqueue completed reports.
   * - Duplicate requests are safe and idempotent.
   * - A report waiting for a scheduled generation retry (QUEUED with a future
   *   "retryAfter") keeps its schedule; callers that want an immediate run
   *   (user/admin regeneration, manual retry) clear "retryAfter" themselves.
   */
  public async enqueueJob(
    reportId: string,
    options?: EnqueueOptions,
    txClient?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = txClient || prisma;

    try {
      // Conditional update: only transitions if not completed and not actively claimed by a live worker
      const rowsAffected = await client.$executeRaw`
        UPDATE "reports"
        SET
          status = 'QUEUED'::"ReportStatus",
          stage = 'QUEUED',
          progress = 0,
          "expectedDeliveryAt" = COALESCE(${options?.expectedDeliveryAt ? options.expectedDeliveryAt : null}, "expectedDeliveryAt"),
          "retryAfter" = CASE
            WHEN status = 'QUEUED'::"ReportStatus" AND "retryAfter" > clock_timestamp() THEN "retryAfter"
            ELSE NULL
          END,
          "updatedAt" = clock_timestamp()
        WHERE id = ${reportId}
          AND status NOT IN ('COMPLETED'::"ReportStatus")
          AND ("claimExpiresAt" IS NULL OR "claimExpiresAt" <= clock_timestamp());
      `;

      if (rowsAffected > 0) {
        logger.info({ reportId }, '[PostgresQueue] Report enqueued successfully');
        return true;
      }

      // Check why it wasn't updated (idempotency check)
      const report = await client.report.findUnique({
        where: { id: reportId },
        select: { status: true, claimExpiresAt: true },
      });

      if (!report) {
        logger.warn({ reportId }, '[PostgresQueue] Enqueue failed: report record not found');
        return false;
      }

      if (report.status === 'COMPLETED') {
        logger.warn({ reportId }, '[PostgresQueue] Enqueue rejected: report is already COMPLETED');
        return false;
      }

      if (report.status === 'QUEUED') {
        // Already queued and waiting -> idempotent success
        return true;
      }

      logger.info({ reportId, status: report.status }, '[PostgresQueue] Report has active claim or in-flight processing; enqueue preserved');
      return true;
    } catch (err: any) {
      logger.error({ reportId, err: err?.message || err }, '[PostgresQueue] Error enqueuing report');
      throw err;
    }
  }

  /**
   * Atomically claim the next eligible report job using FOR UPDATE SKIP LOCKED.
   * - Uses database clock_timestamp() exclusively.
   * - Increments claimVersion and executionAttempts.
   * - Sets unique claimToken and claimExpiresAt.
   * - Safe against concurrent worker contention.
   */
  public async claimJob(
    workerId?: string,
    leaseSeconds = this.defaultLeaseDurationSeconds,
    txClient?: Prisma.TransactionClient
  ): Promise<ClaimedReportJob | null> {
    const client = txClient || prisma;
    const token = newClaimToken();

    try {
      const rows = await client.$queryRaw<ClaimedReportJob[]>`
        UPDATE "reports"
        SET
          status = 'CALCULATING'::"ReportStatus",
          stage = 'CALCULATING',
          progress = 15,
          "claimToken" = ${token},
          "claimedAt" = clock_timestamp(),
          "claimExpiresAt" = clock_timestamp() + (${leaseSeconds} * INTERVAL '1 second'),
          "claimVersion" = "claimVersion" + 1,
          "executionAttempts" = "executionAttempts" + 1,
          "updatedAt" = clock_timestamp()
        WHERE id = (
          SELECT id
          FROM "reports"
          WHERE (
            (status = 'QUEUED'::"ReportStatus" AND ("claimExpiresAt" IS NULL OR "claimExpiresAt" <= clock_timestamp()))
            OR
            (status IN ('CALCULATING'::"ReportStatus", 'ANALYZING'::"ReportStatus", 'RENDERING'::"ReportStatus", 'COMPILING'::"ReportStatus", 'UPLOADING'::"ReportStatus") AND "claimExpiresAt" <= clock_timestamp())
          )
          AND ("retryAfter" IS NULL OR "retryAfter" <= clock_timestamp())
          ORDER BY "expectedDeliveryAt" ASC NULLS LAST, "createdAt" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING 
          id, 
          "claimToken", 
          "claimVersion", 
          "claimExpiresAt", 
          "executionAttempts", 
          "recoveryAttempts", 
          "reportType", 
          "orderId", 
          "userId", 
          "birthProfileId",
          "fulfillmentUnitId";
      `;

      if (!rows.length) {
        return null;
      }

      const claimed = rows[0];
      logger.info(
        { reportId: claimed.id, claimToken: claimed.claimToken, claimVersion: claimed.claimVersion, workerId },
        '[PostgresQueue] Report job atomically claimed'
      );
      return claimed;
    } catch (err: any) {
      logger.error({ err: err?.message || err, workerId }, '[PostgresQueue] Error claiming report job');
      throw err;
    }
  }

  /**
   * Atomically claim a SPECIFIC report by ID (e.g., when requested directly).
   */
  public async claimJobById(
    reportId: string,
    leaseSeconds = this.defaultLeaseDurationSeconds,
    txClient?: Prisma.TransactionClient
  ): Promise<ClaimedReportJob | null> {
    const client = txClient || prisma;
    const token = newClaimToken();

    try {
      const rows = await client.$queryRaw<ClaimedReportJob[]>`
        UPDATE "reports"
        SET
          status = 'CALCULATING'::"ReportStatus",
          stage = 'CALCULATING',
          progress = 15,
          "claimToken" = ${token},
          "claimedAt" = clock_timestamp(),
          "claimExpiresAt" = clock_timestamp() + (${leaseSeconds} * INTERVAL '1 second'),
          "claimVersion" = "claimVersion" + 1,
          "executionAttempts" = "executionAttempts" + 1,
          "updatedAt" = clock_timestamp()
        WHERE id = (
          SELECT id
          FROM "reports"
          WHERE id = ${reportId}
            AND (
              (status = 'QUEUED'::"ReportStatus" AND ("claimExpiresAt" IS NULL OR "claimExpiresAt" <= clock_timestamp()))
              OR
              (status IN ('CALCULATING'::"ReportStatus", 'ANALYZING'::"ReportStatus", 'RENDERING'::"ReportStatus", 'COMPILING'::"ReportStatus", 'UPLOADING'::"ReportStatus") AND "claimExpiresAt" <= clock_timestamp())
            )
            AND ("retryAfter" IS NULL OR "retryAfter" <= clock_timestamp())
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING 
          id, 
          "claimToken", 
          "claimVersion", 
          "claimExpiresAt", 
          "executionAttempts", 
          "recoveryAttempts", 
          "reportType", 
          "orderId", 
          "userId", 
          "birthProfileId",
          "fulfillmentUnitId";
      `;

      if (!rows.length) {
        return null;
      }

      return rows[0];
    } catch (err: any) {
      logger.error({ reportId, err: err?.message || err }, '[PostgresQueue] Error claiming job by ID');
      throw err;
    }
  }

  /**
   * Extend the worker lease (Heartbeat).
   * - Verifies reportId, claimToken, claimVersion.
   * - Verifies existing lease has NOT expired (claimExpiresAt > clock_timestamp()).
   * - Returns false if ownership is lost.
   */
  public async touchHeartbeat(
    reportId: string,
    claimToken: string,
    claimVersion: number,
    extendSeconds = this.defaultHeartbeatExtensionSeconds,
    txClient?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = txClient || prisma;

    try {
      const rowsAffected = await client.$executeRaw`
        UPDATE "reports"
        SET
          "claimExpiresAt" = clock_timestamp() + (${extendSeconds} * INTERVAL '1 second'),
          "updatedAt" = clock_timestamp()
        WHERE id = ${reportId}
          AND "claimToken" = ${claimToken}
          AND "claimVersion" = ${claimVersion}
          AND "claimExpiresAt" > clock_timestamp();
      `;

      return rowsAffected > 0;
    } catch (err: any) {
      logger.warn({ reportId, claimToken, err: err?.message || err }, '[PostgresQueue] Heartbeat renewal error');
      return false;
    }
  }

  /**
   * Fenced report status update (stage, progress).
   * Rejects update if claimToken or claimVersion does not match, or lease is expired.
   */
  public async updateJobStatus(
    reportId: string,
    claimToken: string,
    claimVersion: number,
    status: ReportStatus,
    stage: string,
    progress: number,
    txClient?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = txClient || prisma;

    try {
      const rowsAffected = await client.$executeRaw`
        UPDATE "reports"
        SET
          status = ${status}::"ReportStatus",
          stage = ${stage},
          progress = ${progress},
          "updatedAt" = clock_timestamp()
        WHERE id = ${reportId}
          AND "claimToken" = ${claimToken}
          AND "claimVersion" = ${claimVersion}
          AND "claimExpiresAt" > clock_timestamp();
      `;

      return rowsAffected > 0;
    } catch (err: any) {
      logger.error({ reportId, claimToken, err: err?.message || err }, '[PostgresQueue] Fenced updateJobStatus error');
      return false;
    }
  }

  /**
   * Fenced in-attempt progress update (stage, progress and a short display
   * detail stored at metadata.progressDetail). Same ownership fence as
   * updateJobStatus; progress never moves backwards (GREATEST). Does not touch
   * the lease. Presentation only: a false return is not treated as lost ownership.
   */
  public async updateJobProgress(
    reportId: string,
    claimToken: string,
    claimVersion: number,
    status: ReportStatus,
    stage: string,
    progress: number,
    progressDetail: string | null
  ): Promise<boolean> {
    try {
      const rowsAffected = await prisma.$executeRaw`
        UPDATE "reports"
        SET
          status = ${status}::"ReportStatus",
          stage = ${stage},
          progress = GREATEST(progress, ${progress}),
          metadata = jsonb_set(CASE WHEN jsonb_typeof(metadata) = 'object' THEN metadata ELSE '{}'::jsonb END, '{progressDetail}', COALESCE(to_jsonb(${progressDetail}::text), 'null'::jsonb)),
          "updatedAt" = clock_timestamp()
        WHERE id = ${reportId}
          AND "claimToken" = ${claimToken}
          AND "claimVersion" = ${claimVersion}
          AND "claimExpiresAt" > clock_timestamp();
      `;
      return rowsAffected > 0;
    } catch (err: any) {
      logger.warn({ reportId, err: err?.message || err }, '[PostgresQueue] Fenced updateJobProgress error');
      return false;
    }
  }

  /**
   * Fenced report completion.
   * Atomically records storageKey and transitions to COMPLETED.
   * Clears claimToken and claimExpiresAt.
   */
  public async completeJob(
    reportId: string,
    claimToken: string,
    claimVersion: number,
    storageKey: string,
    fileName: string,
    fileSize: number,
    pageCount: number,
    txClient?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = txClient || prisma;

    try {
      const rowsAffected = await client.$executeRaw`
        UPDATE "reports"
        SET
          status = 'COMPLETED'::"ReportStatus",
          stage = 'COMPLETED',
          progress = 100,
          "storageKey" = ${storageKey},
          "fileName" = ${fileName},
          "fileSize" = ${fileSize},
          "pageCount" = ${pageCount},
          "completedAt" = clock_timestamp(),
          "claimToken" = NULL,
          "claimExpiresAt" = NULL,
          "updatedAt" = clock_timestamp()
        WHERE id = ${reportId}
          AND "claimToken" = ${claimToken}
          AND "claimVersion" = ${claimVersion}
          AND "claimExpiresAt" > clock_timestamp();
      `;

      return rowsAffected > 0;
    } catch (err: any) {
      logger.error({ reportId, claimToken, err: err?.message || err }, '[PostgresQueue] Fenced completeJob error');
      return false;
    }
  }

  /**
   * Fenced report failure.
   * Transitions report to FAILED with errorCode and errorMessage.
   * Clears claimToken and claimExpiresAt.
   */
  public async failJob(
    reportId: string,
    claimToken: string,
    claimVersion: number,
    errorCode: string,
    errorMessage: string,
    txClient?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = txClient || prisma;

    try {
      const rowsAffected = await client.$executeRaw`
        UPDATE "reports"
        SET
          status = 'FAILED'::"ReportStatus",
          stage = 'FAILED',
          progress = 0,
          "errorCode" = ${errorCode},
          "errorMessage" = ${errorMessage},
          "failedAt" = clock_timestamp(),
          "claimToken" = NULL,
          "claimExpiresAt" = NULL,
          "updatedAt" = clock_timestamp()
        WHERE id = ${reportId}
          AND "claimToken" = ${claimToken}
          AND "claimVersion" = ${claimVersion}
          AND "claimExpiresAt" > clock_timestamp();
      `;

      return rowsAffected > 0;
    } catch (err: any) {
      logger.error({ reportId, claimToken, err: err?.message || err }, '[PostgresQueue] Fenced failJob error');
      return false;
    }
  }

  /**
   * Fenced reschedule after a transient generation failure.
   * Returns the report to QUEUED with "retryAfter" = retryAt, counts the
   * failure and records internal diagnostics. The customer-facing
   * errorCode/errorMessage stay NULL: the report is still being prepared.
   * Clears claimToken and claimExpiresAt; the next claim increments claimVersion.
   */
  public async rescheduleJob(
    reportId: string,
    claimToken: string,
    claimVersion: number,
    retryAt: Date,
    errorCode: string,
    errorMessage: string,
    txClient?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = txClient || prisma;

    try {
      const rowsAffected = await client.$executeRaw`
        UPDATE "reports"
        SET
          status = 'QUEUED'::"ReportStatus",
          stage = 'QUEUED',
          progress = 0,
          "errorCode" = NULL,
          "errorMessage" = NULL,
          "retryAfter" = ${retryAt},
          "generationFailures" = "generationFailures" + 1,
          "lastAttemptAt" = clock_timestamp(),
          "lastAttemptErrorCode" = ${errorCode},
          "lastAttemptErrorMessage" = ${errorMessage.slice(0, 2000)},
          "claimToken" = NULL,
          "claimExpiresAt" = NULL,
          "updatedAt" = clock_timestamp()
        WHERE id = ${reportId}
          AND "claimToken" = ${claimToken}
          AND "claimVersion" = ${claimVersion}
          AND "claimExpiresAt" > clock_timestamp();
      `;

      return rowsAffected > 0;
    } catch (err: any) {
      logger.error({ reportId, claimToken, err: err?.message || err }, '[PostgresQueue] Fenced rescheduleJob error');
      return false;
    }
  }

  /**
   * Release a claim manually without completing (e.g. during clean worker shutdown).
   */
  public async releaseClaim(
    reportId: string,
    claimToken: string,
    claimVersion: number,
    txClient?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = txClient || prisma;

    try {
      const rowsAffected = await client.$executeRaw`
        UPDATE "reports"
        SET
          status = 'QUEUED'::"ReportStatus",
          stage = 'QUEUED',
          progress = 0,
          "claimToken" = NULL,
          "claimExpiresAt" = NULL,
          "updatedAt" = clock_timestamp()
        WHERE id = ${reportId}
          AND "claimToken" = ${claimToken}
          AND "claimVersion" = ${claimVersion};
      `;

      return rowsAffected > 0;
    } catch (err: any) {
      logger.warn({ reportId, claimToken, err: err?.message || err }, '[PostgresQueue] Release claim error');
      return false;
    }
  }

  /**
   * Start-up recovery: requeue, immediately, in-progress reports still claimed by
   * a PREVIOUS boot of this same process instance (it is dead: only one process
   * per instance id runs at a time). Claims of other instances are left to lease
   * expiry. Counts as a recovery attempt so a job that keeps crashing its process
   * still ends in RECOVERY_EXHAUSTED via recoverStaleJobs().
   */
  public async releaseClaimsOfPreviousBoots(
    maxAttempts = this.maxRecoveryAttempts,
    instancePrefix = instanceClaimPrefix(),
    currentBootPrefix = bootClaimPrefix(),
    txClient?: Prisma.TransactionClient
  ): Promise<string[]> {
    const client = txClient || prisma;
    try {
      const rows = await client.$queryRaw<Array<{ id: string }>>`
        UPDATE "reports"
        SET
          status = 'QUEUED'::"ReportStatus",
          stage = 'QUEUED',
          progress = 0,
          "claimToken" = NULL,
          "claimExpiresAt" = NULL,
          "claimVersion" = "claimVersion" + 1,
          "recoveryAttempts" = "recoveryAttempts" + 1,
          "retryAfter" = NULL,
          "updatedAt" = clock_timestamp()
        WHERE id IN (
          SELECT id
          FROM "reports"
          WHERE status IN ('CALCULATING'::"ReportStatus", 'ANALYZING'::"ReportStatus", 'RENDERING'::"ReportStatus", 'COMPILING'::"ReportStatus", 'UPLOADING'::"ReportStatus")
            AND "claimToken" IS NOT NULL
            AND starts_with("claimToken", ${instancePrefix})
            AND NOT starts_with("claimToken", ${currentBootPrefix})
            AND "recoveryAttempts" < ${maxAttempts}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id;
      `;
      if (rows.length) {
        logger.info({ reportIds: rows.map((r) => r.id) }, '[PostgresQueue] Released claims left by a previous boot of this process');
      }
      return rows.map((r) => r.id);
    } catch (err: any) {
      logger.error({ err: err?.message || err }, '[PostgresQueue] Error releasing claims of previous boots');
      return [];
    }
  }

  /**
   * Recover stale jobs whose worker leases have expired according to clock_timestamp()
   * (or implausibly far in the future - see MAX_PLAUSIBLE_LEASE_MINUTES).
   * - Jobs with recoveryAttempts < maxRecoveryAttempts are requeued with exponential backoff.
   * - Jobs with recoveryAttempts >= maxRecoveryAttempts are marked FAILED with 'RECOVERY_EXHAUSTED'.
   * - Increments claimVersion, disarming stale workers.
   */
  public async recoverStaleJobs(
    maxAttempts = this.maxRecoveryAttempts,
    txClient?: Prisma.TransactionClient
  ): Promise<{ recoveredCount: number; failedCount: number; failedReportIds: string[] }> {
    const client = txClient || prisma;

    try {
      // 1. Requeue retryable stale reports (recoveryAttempts < maxAttempts)
      const requeuedRows = await client.$executeRaw`
        UPDATE "reports"
        SET
          status = 'QUEUED'::"ReportStatus",
          stage = 'QUEUED',
          progress = 0,
          "claimToken" = NULL,
          "claimExpiresAt" = NULL,
          "claimVersion" = "claimVersion" + 1,
          "recoveryAttempts" = "recoveryAttempts" + 1,
          "retryAfter" = clock_timestamp() + (POWER(2, LEAST("recoveryAttempts", 6)) * INTERVAL '10 seconds'),
          "updatedAt" = clock_timestamp()
        WHERE id IN (
          SELECT id
          FROM "reports"
          WHERE status IN ('CALCULATING'::"ReportStatus", 'ANALYZING'::"ReportStatus", 'RENDERING'::"ReportStatus", 'COMPILING'::"ReportStatus", 'UPLOADING'::"ReportStatus")
            AND ("claimExpiresAt" <= clock_timestamp()
              OR "claimExpiresAt" > clock_timestamp() + (${MAX_PLAUSIBLE_LEASE_MINUTES} * INTERVAL '1 minute'))
            AND "recoveryAttempts" < ${maxAttempts}
          FOR UPDATE SKIP LOCKED
        );
      `;

      // 2. Mark permanently failed stale reports (recoveryAttempts >= maxAttempts).
      //    Their ids are returned so the worker can notify the user and reconcile the order.
      const failedRows = await client.$queryRaw<Array<{ id: string }>>`
        UPDATE "reports"
        SET
          status = 'FAILED'::"ReportStatus",
          stage = 'FAILED',
          progress = 0,
          "errorCode" = 'RECOVERY_EXHAUSTED',
          "errorMessage" = 'Job recovery attempts exhausted after multiple worker crashes',
          "failedAt" = clock_timestamp(),
          "claimToken" = NULL,
          "claimExpiresAt" = NULL,
          "claimVersion" = "claimVersion" + 1,
          "recoveryAttempts" = "recoveryAttempts" + 1,
          "updatedAt" = clock_timestamp()
        WHERE id IN (
          SELECT id
          FROM "reports"
          WHERE status IN ('CALCULATING'::"ReportStatus", 'ANALYZING'::"ReportStatus", 'RENDERING'::"ReportStatus", 'COMPILING'::"ReportStatus", 'UPLOADING'::"ReportStatus")
            AND ("claimExpiresAt" <= clock_timestamp()
              OR "claimExpiresAt" > clock_timestamp() + (${MAX_PLAUSIBLE_LEASE_MINUTES} * INTERVAL '1 minute'))
            AND "recoveryAttempts" >= ${maxAttempts}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id;
      `;

      if (requeuedRows > 0 || failedRows.length > 0) {
        logger.info(
          { requeuedCount: requeuedRows, failedCount: failedRows.length },
          '[PostgresQueue] Stale-job recovery completed'
        );
      }

      return {
        recoveredCount: Number(requeuedRows),
        failedCount: failedRows.length,
        failedReportIds: failedRows.map((r) => r.id),
      };
    } catch (err: any) {
      logger.error({ err: err?.message || err }, '[PostgresQueue] Error recovering stale jobs');
      throw err;
    }
  }

  /**
   * Health check for PostgreSQL Queue.
   */
  public async checkHealth(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get queue metrics (counts of queued, active, failed, completed).
   */
  public async getQueueMetrics(): Promise<{ queued: number; active: number; failed: number; completed: number }> {
    const rows = await prisma.$queryRaw<Array<{ status: ReportStatus; count: bigint }>>`
      SELECT status, COUNT(*) as count
      FROM "reports"
      GROUP BY status;
    `;

    const metrics = { queued: 0, active: 0, failed: 0, completed: 0 };
    for (const r of rows) {
      const count = Number(r.count);
      if (r.status === 'QUEUED') metrics.queued += count;
      else if (['CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'].includes(r.status)) metrics.active += count;
      else if (r.status === 'FAILED') metrics.failed += count;
      else if (r.status === 'COMPLETED') metrics.completed += count;
    }
    return metrics;
  }
}

export const postgresQueueService = new PostgresQueueService();
