import { ReportStatus, FulfillmentStatus, OrderStatus, FulfillmentUnitStatus } from '@prisma/client';
import { reportPlatform } from '@astro/report-engine';
import { prisma } from './prisma.service';
import { storageService } from './storage.service';
import { notificationService } from '../modules/notifications/notification.service';
import { logger } from '../utils/logger';
import { postgresQueueService, ClaimedReportJob } from './postgres-queue.service';
import { fulfillmentService } from '../modules/fulfillment/fulfillment.service';
import { distributedLockService } from './distributed-lock.service';
import { isPlatformReportType, platformReportTypes, runPlatformReport, PlatformInputError, PlatformRunInput } from './platform-report.runner';
import { ATTEMPT_TIMEOUT_MS, decideRetry, deliveryDeadline, finalFailureMessage } from './report-retry.policy';
import { verifyDatabaseSessionTimeZone } from './prisma.service';
import { progressFromEvent, ThrottledProgressWriter } from './report-progress';

/**
 * Whether a report is generated inside the API process as soon as it is enqueued
 * (development / debug). REPORT_INSTANT_EXECUTION=false leaves every job to the
 * worker process (one report at a time), e.g. on a small VM.
 */
export function isInstantExecutionEnabled(): boolean {
  return (
    (process.env.NODE_ENV !== 'production' ||
      process.env.DEBUG === 'true' ||
      process.env.AUTO_DELIVER_WHEN_READY === 'true') &&
    process.env.REPORT_INSTANT_EXECUTION !== 'false'
  );
}

/** How long shutdown waits for in-flight reports before releasing their claims. */
export function shutdownGraceMs(): number {
  const fromEnv = Number(process.env.REPORT_SHUTDOWN_GRACE_MS);
  return Number.isFinite(fromEnv) && fromEnv >= 0 ? fromEnv : 2000;
}

/** A report pipeline currently running in this process. */
interface InFlightJob {
  claimToken: string;
  claimVersion: number;
  /** Stops the pipeline from writing anything further (ownership given up). */
  relinquish: () => void;
  done: Promise<void>;
}

export type ReportJobStage =
  | 'QUEUED'
  | 'CALCULATING'
  | 'ANALYZING'
  | 'RENDERING'
  | 'COMPILING'
  | 'UPLOADING'
  | 'COMPLETED'
  | 'FAILED';

export interface ReportJobProgress {
  stage: ReportJobStage;
  progress: number;
  message?: string;
}

/** The claimed attempt a failure belongs to (fencing + retry bookkeeping). */
export interface AttemptContext {
  reportId: string;
  claimToken?: string;
  claimVersion?: number;
  /** Transient failures recorded before this attempt. */
  failedAttempts: number;
  deadline: Date;
}

export class AttemptTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`ATTEMPT_TIMEOUT: generation attempt exceeded ${Math.round(timeoutMs / 1000)} s`);
  }
}

/** Per-attempt wall-clock limit; REPORT_ATTEMPT_TIMEOUT_MS may only shorten it. */
export function attemptTimeoutMs(): number {
  const fromEnv = Number(process.env.REPORT_ATTEMPT_TIMEOUT_MS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? Math.min(fromEnv, ATTEMPT_TIMEOUT_MS) : ATTEMPT_TIMEOUT_MS;
}

/** Minimum gap between in-attempt progress writes (REPORT_PROGRESS_WRITE_INTERVAL_MS, default 4s). */
function progressWriteIntervalMs(): number {
  const fromEnv = Number(process.env.REPORT_PROGRESS_WRITE_INTERVAL_MS);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 4000;
}

type PlatformManifest = reportPlatform.ReportManifest;

/**
 * Why a generated report could not be delivered.
 * - A deterministic data topic failed or required chart evidence is missing →
 *   permanent (the same input always gives the same result).
 * - No PDF (compile failure) → transient.
 * - Narrative topics failed validation or PDF QA failed → transient; the retry
 *   regenerates only the missing topics (the rest come from the cache).
 */
export function classifyIncompleteManifest(manifest: PlatformManifest, hasPdf: boolean): { code: string; detail: string; userMessage?: string } {
  const failedTopics = manifest.topics.filter((t) => t.status === 'failed' || t.status === 'skipped-missing-evidence');
  const dataGaps = failedTopics.filter((t) => t.status === 'skipped-missing-evidence' || t.provenance !== 'llm');
  const summary = `status=${manifest.status}; failed topics: ${failedTopics.map((t) => t.topicId).join(', ') || 'none'}; QA passed: ${manifest.pdf?.qaPassed ?? false}`;
  if (dataGaps.length) {
    return {
      code: 'REPORT_DATA_UNAVAILABLE',
      detail: `Report not delivered: ${summary}. Chart data missing for: ${dataGaps.map((t) => t.topicId).join(', ')}.`,
      userMessage: 'This report cannot be prepared because part of the required chart data is not available for the birth details on file. Our team has been alerted.',
    };
  }
  if (!hasPdf) return { code: 'PDF_RENDER_FAILED', detail: `Report not delivered: ${summary}.` };
  return { code: 'GENERATION_INCOMPLETE', detail: `Report not delivered: ${summary}. A retry regenerates only the missing parts.` };
}

export class CareerReportWorker {
  /** ReportTypes with a genuine generator (the platform registry is the single source). */
  public static get SUPPORTED_REPORT_TYPES(): string[] {
    return platformReportTypes();
  }

  private isProcessing = false;
  private isRecovering = false;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private readonly jobQueue: string[] = [];
  private draining = false;
  private readonly inFlight = new Map<string, InFlightJob>();
  private dispatcherTimer: NodeJS.Timeout | null = null;
  private isDispatching = false;

  /** True once shutdown() started: no new jobs are claimed by this process. */
  public isDraining(): boolean {
    return this.draining;
  }

  /** Report ids currently being generated in this process. */
  public inFlightReportIds(): string[] {
    return [...this.inFlight.keys()];
  }

  /**
   * Start-up recovery, run before the process claims anything:
   *  1. checks the DB session time zone is UTC (logs an error otherwise);
   *  2. requeues reports still claimed by a previous (dead) boot of this process;
   *  3. runs one stale-lease recovery pass (expired / implausible leases).
   */
  public async recoverOnStartup(): Promise<{ releasedFromPreviousBoot: string[]; staleRecovered: number }> {
    await verifyDatabaseSessionTimeZone();
    const releasedFromPreviousBoot = await postgresQueueService.releaseClaimsOfPreviousBoots();
    const stale = await this.recoverStaleJobs();
    logger.info(
      { releasedFromPreviousBoot: releasedFromPreviousBoot.length, staleRecovered: stale.recoveredReports },
      '[CareerReportWorker] Start-up report recovery completed'
    );
    return { releasedFromPreviousBoot, staleRecovered: stale.recoveredReports };
  }

  /**
   * In-process dispatcher for the API when instant execution is on (development):
   * periodically claims and runs queued / recovered / retry-due reports, one at a
   * time, so they do not depend on a separate worker process being started.
   * Safe next to a real worker (claims use FOR UPDATE SKIP LOCKED).
   */
  public startInProcessDispatcher(intervalMs?: number): void {
    if (this.dispatcherTimer) return;
    const interval = intervalMs ?? parseInt(process.env.REPORT_DISPATCH_INTERVAL_MS || '15000', 10);
    logger.info({ intervalMs: interval }, '[CareerReportWorker] Starting in-process report dispatcher (instant execution mode)');
    const tick = () => {
      this.runDispatchCycle().catch((err) => {
        logger.error({ err: err?.message || err }, '[CareerReportWorker] Dispatcher cycle error');
      });
    };
    setImmediate(tick);
    this.dispatcherTimer = setInterval(tick, interval);
    if (this.dispatcherTimer.unref) this.dispatcherTimer.unref();
  }

  public stopInProcessDispatcher(): void {
    if (this.dispatcherTimer) {
      clearInterval(this.dispatcherTimer);
      this.dispatcherTimer = null;
    }
  }

  /** Claims and runs eligible reports until none is left (or shutdown starts). */
  public async runDispatchCycle(workerId = 'api-dispatcher'): Promise<number> {
    if (this.isDispatching || this.draining) return 0;
    this.isDispatching = true;
    let ran = 0;
    try {
      while (!this.draining) {
        const claim = await postgresQueueService.claimJob(workerId);
        if (!claim) break;
        ran++;
        await this.executeReportPipeline(claim.id, claim.claimToken, claim.claimVersion);
      }
    } finally {
      this.isDispatching = false;
    }
    return ran;
  }

  /**
   * Graceful shutdown (SIGTERM / SIGINT: pm2 reload, deploys, tsx watch restarts).
   * Stops claiming, waits up to graceMs for in-flight reports to finish, then
   * releases the claims of the rest (back to QUEUED, no retry delay) so the next
   * process picks them up at once. Finished LLM topics stay in the topic cache,
   * so the rerun does not pay for them again.
   */
  public async shutdown(graceMs = shutdownGraceMs()): Promise<{ finished: number; released: number }> {
    this.draining = true;
    this.stopInProcessDispatcher();
    this.stopStaleRecoveryLoop();

    const startCount = this.inFlight.size;
    if (startCount > 0 && graceMs > 0) {
      const all = Promise.all([...this.inFlight.values()].map((j) => j.done));
      await Promise.race([all, new Promise((resolve) => setTimeout(resolve, graceMs))]);
    }

    const remaining = [...this.inFlight.entries()];
    let released = 0;
    for (const [reportId, job] of remaining) {
      job.relinquish();
      const ok = await postgresQueueService.releaseClaim(reportId, job.claimToken, job.claimVersion);
      if (ok) released++;
      logger.info({ reportId, released: ok }, '[CareerReportWorker] Shutdown: released in-flight report claim');
    }
    return { finished: startCount - remaining.length, released };
  }

  /**
   * Starts recurring stale-job and orphaned order recovery loop at configurable interval.
   * Guaranteed to be started only once per worker process.
   */
  public startStaleRecoveryLoop(intervalMs?: number): void {
    if (this.recoveryTimer) {
      logger.info('[CareerReportWorker] Stale recovery loop is already running in this process.');
      return;
    }

    const interval = intervalMs ?? parseInt(process.env.STALE_JOB_RECOVERY_INTERVAL_MS || '60000', 10);
    logger.info({ intervalMs: interval }, '⏱️ [CareerReportWorker] Starting recurring stale-job recovery loop');

    // Run recovery immediately on start
    this.recoverStaleJobs().catch((err) => {
      logger.error({ err: err?.message || err }, '[CareerReportWorker] Initial stale job recovery error');
    });

    this.recoveryTimer = setInterval(() => {
      this.recoverStaleJobs().catch((err) => {
        logger.error({ err: err?.message || err }, '[CareerReportWorker] Recurring stale job recovery error');
      });
    }, interval);

    if (this.recoveryTimer.unref) {
      this.recoveryTimer.unref();
    }
  }

  /**
   * Gracefully stops the recurring recovery loop during shutdown.
   */
  public stopStaleRecoveryLoop(): void {
    if (this.recoveryTimer) {
      clearInterval(this.recoveryTimer);
      this.recoveryTimer = null;
      logger.info('[CareerReportWorker] Stopped recurring stale-job recovery loop.');
    }
  }

  /**
   * Enqueues a report generation job by ID using the PostgreSQL queue.
   */
  public async enqueueReportJob(reportId: string): Promise<boolean> {
    try {
      const enqueued = await postgresQueueService.enqueueJob(reportId);
      if (!enqueued) {
        if (!this.jobQueue.includes(reportId)) {
          this.jobQueue.push(reportId);
        }
        setImmediate(() => {
          this.processQueue();
        });
      }

      // In test and debug mode, deliver report as soon as it is ready.
      // REPORT_INSTANT_EXECUTION=false leaves every job to the worker process
      // (one report at a time), e.g. on a small development VM.
      const isTestOrDebug = isInstantExecutionEnabled();

      if (isTestOrDebug && process.env.NODE_ENV !== 'test' && !this.draining) {
        setImmediate(async () => {
          try {
            const claim = await postgresQueueService.claimJobById(reportId);
            if (claim) {
              logger.info(
                { reportId: claim.id, claimToken: claim.claimToken },
                '[CareerReportWorker] Instant execution triggered in test/debug mode: delivering report as soon as it is ready'
              );
              await this.executeReportPipeline(claim.id, claim.claimToken, claim.claimVersion);
            }
          } catch (execErr: any) {
            logger.warn({ reportId, err: execErr?.message }, '[CareerReportWorker] Instant delivery notice');
          }
        });
      }

      return enqueued;
    } catch (err: any) {
      logger.error({ reportId, err: err?.message || err }, '[CareerReportWorker] Error enqueuing report job');
      if (!this.jobQueue.includes(reportId)) {
        this.jobQueue.push(reportId);
      }
      setImmediate(() => {
        this.processQueue();
      });
      return false;
    }
  }

  /**
   * Marks a report as successfully enqueued in metadata (backward compatibility helper).
   */
  public async markJobEnqueued(reportId: string): Promise<void> {
    try {
      const rep = await prisma.report.findUnique({ where: { id: reportId }, select: { metadata: true } });
      const currentMeta = (rep?.metadata || {}) as Record<string, any>;
      await prisma.report.updateMany({
        where: { id: reportId },
        data: {
          metadata: {
            ...currentMeta,
            enqueued: true,
            enqueuedAt: new Date().toISOString(),
          },
        } as any,
      });
    } catch (_) {}
  }

  /**
   * Recovers stuck in-progress report jobs whose leases have expired in PostgreSQL.
   * Distributed lock-protected across multiple worker processes.
   */
  public async recoverStaleJobs(): Promise<{ recoveredReports: number; recoveredOrders: number; skipped?: boolean }> {
    if (this.isRecovering) {
      logger.debug('[CareerReportWorker] Stale recovery already in progress on this instance, skipping overlapping run.');
      return { recoveredReports: 0, recoveredOrders: 0, skipped: true };
    }

    try {
      return await distributedLockService.withDistributedLock(
        'astrosushil:lock:stale-recovery',
        async () => {
          this.isRecovering = true;
          try {
            return await this.executeStaleRecovery();
          } finally {
            this.isRecovering = false;
          }
        },
        { ttlMs: 30000, waitTimeoutMs: 500 }
      );
    } catch (err: any) {
      if (err?.code === 'DISTRIBUTED_LOCK_TIMEOUT') {
        logger.debug('[CareerReportWorker] Another worker instance is currently executing stale recovery. Skipping iteration.');
        return { recoveredReports: 0, recoveredOrders: 0, skipped: true };
      }
      logger.error({ err: err?.message || err }, '[CareerReportWorker] Error in distributed recoverStaleJobs');
      return { recoveredReports: 0, recoveredOrders: 0 };
    }
  }

  /**
   * Core recovery routine executed under distributed lock using PostgreSQL atomic queue recovery.
   */
  private async executeStaleRecovery(): Promise<{ recoveredReports: number; recoveredOrders: number }> {
    try {
      const result = await postgresQueueService.recoverStaleJobs();
      // Reports failed by recovery exhaustion get the same follow-up as any other FAILED report.
      for (const failedReportId of result.failedReportIds) {
        await this.finalizeFailedReport(failedReportId);
      }
      const orphanedReconciled = await fulfillmentService.reconcileOrphanedCompletedReports();
      const slaResult = await this.monitorReportDeadlines();

      if (result.recoveredCount > 0 || result.failedCount > 0 || orphanedReconciled > 0 || slaResult.alertsTriggered > 0) {
        logger.info(
          { requeued: result.recoveredCount, failed: result.failedCount, orphanedReconciled, sla: slaResult },
          '[CareerReportWorker] PostgreSQL queue stale recovery & SLA monitoring completed'
        );
      }
      return {
        recoveredReports: result.recoveredCount + result.failedCount + orphanedReconciled,
        recoveredOrders: 0,
      };
    } catch (err: any) {
      logger.error({ err: err?.message || err }, '[CareerReportWorker] Error in executeStaleRecovery');
      return { recoveredReports: 0, recoveredOrders: 0 };
    }
  }

  /**
   * Evaluates delivery deadlines for in-progress reports with 24-hour SLAs.
   * Tracks approaching deadlines and overdue escalation idempotently via report metadata.
   */
  public async monitorReportDeadlines(): Promise<{ approachingCount: number; overdueCount: number; alertsTriggered: number }> {
    const now = new Date();
    let approachingCount = 0;
    let overdueCount = 0;
    let alertsTriggered = 0;

    try {
      const activeReports = await prisma.report.findMany({
        where: {
          orderId: { not: null },
          expectedDeliveryAt: { not: null },
          status: { in: ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING', 'PENDING', 'PROCESSING'] as any[] },
        },
        include: { order: true },
      });

      for (const report of activeReports) {
        const deadline = report.expectedDeliveryAt!;
        const metadata = ((report as any).metadata || {}) as Record<string, any>;
        const isActivelyLeased = Boolean(report.claimExpiresAt && report.claimExpiresAt > now);

        // Case 1: OVERDUE (now > expectedDeliveryAt)
        if (now > deadline) {
          overdueCount++;
          if (!metadata.slaOverdueNotifiedAt) {
            alertsTriggered++;
            if (isActivelyLeased) {
              logger.error(
                { reportId: report.id, userId: report.userId, claimToken: report.claimToken, expectedDeliveryAt: deadline },
                '[SLA_MONITOR] Report is OVERDUE with active lease. Worker is actively processing.'
              );
            } else {
              logger.error(
                { reportId: report.id, userId: report.userId, expectedDeliveryAt: deadline },
                '[SLA_MONITOR] Report is OVERDUE with NO active lease. Re-queuing job.'
              );
              if (!report.claimToken) {
                await postgresQueueService.enqueueJob(report.id);
              }
            }

            try {
              await notificationService.sendNotification({
                userId: report.userId,
                type: 'REPORT_DELAYED',
                entityId: report.id,
                idempotencyKey: `report_delayed:${report.id}`,
                route: 'OPEN_REPORT',
                templateData: {
                  reportName: report.reportType || 'Career Intelligence Report',
                  reportId: report.id,
                },
              });
            } catch (notifErr: any) {
              logger.warn({ reportId: report.id, notifErr: notifErr?.message }, '[SLA_MONITOR] Failed to send delay notification');
            }

            await prisma.report.updateMany({
              where: { id: report.id },
              data: {
                metadata: {
                  ...metadata,
                  slaOverdueNotifiedAt: now.toISOString(),
                  escalationStage: 'OVERDUE',
                },
              } as any,
            });
          }
        }
        // Case 2: APPROACHING DEADLINE (remaining time <= 2 hours)
        else if (deadline.getTime() - now.getTime() <= 2 * 60 * 60 * 1000) {
          approachingCount++;
          if (!metadata.slaApproachingNotifiedAt) {
            alertsTriggered++;
            logger.warn(
              { reportId: report.id, userId: report.userId, remainingMinutes: Math.round((deadline.getTime() - now.getTime()) / 60000), isActivelyLeased },
              '[SLA_MONITOR] Report approaching SLA delivery deadline (< 2h remaining)'
            );

            await prisma.report.updateMany({
              where: { id: report.id },
              data: {
                metadata: {
                  ...metadata,
                  slaApproachingNotifiedAt: now.toISOString(),
                  escalationStage: 'APPROACHING',
                },
              } as any,
            });
          }
        }
      }
    } catch (err: any) {
      logger.error({ err: err?.message || err }, '[CareerReportWorker] Error during monitorReportDeadlines');
    }

    return { approachingCount, overdueCount, alertsTriggered };
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.jobQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const reportId = this.jobQueue.shift()!;

    try {
      await this.executeReportPipeline(reportId);
    } catch (err: any) {
      logger.error({ reportId, err: err?.message || err }, '[CareerReportWorker] Unhandled pipeline exception');
    } finally {
      this.isProcessing = false;
      if (this.jobQueue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  /**
   * Atomically claims a report for execution using PostgreSQL atomic token-stamping.
   */
  public async acquireWorkerClaim(reportId: string): Promise<ClaimedReportJob | null> {
    return await postgresQueueService.claimJobById(reportId);
  }

  /**
   * End-to-end generation of one claimed report through the universal report
   * platform (the only generation path).
   *
   * Outcomes:
   *   - completed            → upload, fenced completion, fulfilment, notification
   *   - transient failure    → rescheduled (QUEUED + retryAfter) per report-retry.policy;
   *                            the customer still sees "being prepared"
   *   - permanent failure, deadline passed or attempts exhausted → FAILED + notification
   */
  public async executeReportPipeline(
    reportId: string,
    customClaimToken?: string,
    customClaimVersion?: number
  ): Promise<void> {
    const startTime = Date.now();
    let claimToken = customClaimToken;
    let claimVersion = customClaimVersion;

    // 1. Atomically acquire worker claim if not already provided
    if (!claimToken || claimVersion === undefined) {
      const claim = await this.acquireWorkerClaim(reportId);
      if (!claim) {
        logger.info({ reportId }, '[CareerReportWorker] Could not acquire worker claim. Skipping execution.');
        return;
      }
      claimToken = claim.claimToken;
      claimVersion = claim.claimVersion;
    }

    // 2. Fetch DB report record with relations
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { birthProfile: true, order: true },
    });

    if (!report) {
      logger.error({ reportId }, '[CareerReportWorker] Report record not found');
      return;
    }

    const attempt: AttemptContext = {
      reportId,
      claimToken,
      claimVersion,
      failedAttempts: report.generationFailures ?? 0,
      deadline: deliveryDeadline({ expectedDeliveryAt: report.expectedDeliveryAt, bookedAt: report.order?.paidAt ?? report.createdAt }),
    };

    if (!isPlatformReportType(report.reportType)) {
      await this.handleAttemptFailure(
        attempt,
        'REPORT_TYPE_NOT_AVAILABLE',
        `The ${report.reportType} report is not available: there is no genuine generator for it.`
      );
      return;
    }

    if (this.draining) {
      // Shutting down: give the fresh claim back instead of starting work that would be cut off.
      await postgresQueueService.releaseClaim(reportId, claimToken, claimVersion);
      return;
    }

    const heartbeatIntervalMs = parseInt(process.env.WORKER_HEARTBEAT_INTERVAL_MS || '20000', 10);
    const claimLeaseTtlSeconds = 60; // 60s lease renewed every 20s
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let isHeartbeating = false;
    let lostOwnership = false;
    let activeController: AbortController | undefined;
    let markDone: () => void = () => undefined;
    const done = new Promise<void>((resolve) => { markDone = resolve; });

    const stopHeartbeat = () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const startHeartbeat = () => {
      heartbeatTimer = setInterval(async () => {
        if (isHeartbeating || lostOwnership) return;
        isHeartbeating = true;
        try {
          const alive = await postgresQueueService.touchHeartbeat(reportId, claimToken!, claimVersion!, claimLeaseTtlSeconds);
          if (!alive) {
            lostOwnership = true;
            logger.warn({ reportId, claimToken, claimVersion }, '[CareerReportWorker] Lost DB ownership during heartbeat touch. Halting execution.');
            stopHeartbeat();
          }
        } catch (hbErr: any) {
          logger.warn({ reportId, err: hbErr?.message }, '[CareerReportWorker] Heartbeat error');
        } finally {
          isHeartbeating = false;
        }
      }, heartbeatIntervalMs);

      if (heartbeatTimer.unref) {
        heartbeatTimer.unref();
      }
    };

    const setStage = async (status: ReportStatus, progress: number, stage: string): Promise<boolean> => {
      if (lostOwnership) {
        logger.warn({ reportId, claimToken, stage }, '[CareerReportWorker] Aborting setStage because ownership was previously lost.');
        return false;
      }
      const ok = await postgresQueueService.updateJobStatus(reportId, claimToken!, claimVersion!, status, stage, progress);
      if (!ok) {
        lostOwnership = true;
        logger.warn({ reportId, claimToken, stage }, '[CareerReportWorker] Lost ownership during stage update. Aborting execution.');
        stopHeartbeat();
      }
      return ok;
    };

    this.inFlight.set(reportId, {
      claimToken: claimToken!,
      claimVersion: claimVersion!,
      relinquish: () => {
        lostOwnership = true;
        stopHeartbeat();
        activeController?.abort();
      },
      done,
    });

    try {
      startHeartbeat();

      const platformMeta = ((report as any).metadata || {}) as Record<string, any>;
      if (!(await setStage('CALCULATING', 15, 'CALCULATING'))) return;

      // Per-topic progress during the long LLM phase (15% → 80%, stage ANALYZING), then
      // COMPILING (85%). Throttled, monotonic and fenced to this claim; cosmetic only.
      const progressWriter = new ThrottledProgressWriter({
        isOwner: () => !lostOwnership,
        minIntervalMs: progressWriteIntervalMs(),
        write: (p) => postgresQueueService.updateJobProgress(reportId, claimToken!, claimVersion!, p.status, p.stage, p.progress, p.detail),
      });

      // 3. Generate within the hard per-attempt wall-clock limit.
      const timeoutMs = attemptTimeoutMs();
      const controller = new AbortController();
      activeController = controller;
      let timer: NodeJS.Timeout | undefined;
      const timedOut = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new AttemptTimeoutError(timeoutMs));
        }, timeoutMs);
        if (timer.unref) timer.unref();
      });
      const generation = this.generatePlatformReport({
        reportId,
        reportType: report.reportType,
        userId: report.userId,
        profile: report.birthProfile,
        partnerProfileId: platformMeta.partnerProfileId,
        regenerateTopics: Array.isArray(platformMeta.regenerateTopics) ? platformMeta.regenerateTopics : undefined,
        candidateNames: platformMeta.candidateNames,
        // The business (IST) calendar date the order was placed, not its UTC date.
        asOf: report.createdAt ? reportPlatform.businessAsOfDate(new Date(report.createdAt)) : undefined,
        signal: controller.signal,
        onProgress: (event) => progressWriter.update(progressFromEvent(event)),
      });
      // A timed-out generation may still settle later; its result is ignored (finished topics stay cached).
      generation.catch(() => undefined);

      let result: Awaited<ReturnType<typeof runPlatformReport>>;
      try {
        result = await Promise.race([generation, timedOut]);
      } catch (platformErr: any) {
        if (lostOwnership) return;
        const code = platformErr instanceof PlatformInputError
          ? platformErr.code
          : platformErr instanceof AttemptTimeoutError || platformErr instanceof reportPlatform.ReportGenerationAbortedError
            ? 'ATTEMPT_TIMEOUT'
            : 'GENERATION_ERROR';
        logger.error({ reportId, code, err: platformErr?.message }, '[ReportPlatform] Generation attempt failed');
        await this.handleAttemptFailure(attempt, code, platformErr?.message || 'Report generation failed.', platformErr instanceof PlatformInputError ? platformErr.message : undefined);
        return;
      } finally {
        if (timer) clearTimeout(timer);
        // No progress writes after the attempt settles (a timed-out run may keep emitting).
        progressWriter.stop();
        await progressWriter.idle();
      }
      if (lostOwnership) return;

      // Persist the manifest (no birth details or narrative text) for audit and admin visibility.
      await prisma.report.update({
        where: { id: reportId },
        data: { metadata: { ...platformMeta, regenerateTopics: undefined, progressDetail: undefined, platformManifest: result.manifest as any } },
      });

      // 4. Deliver only a fully generated, validated and QA-passed report. Never a partial substitute.
      if (result.manifest.status !== 'completed' || !result.pdf) {
        const outcome = classifyIncompleteManifest(result.manifest, Boolean(result.pdf));
        await this.handleAttemptFailure(attempt, outcome.code, outcome.detail, outcome.userMessage);
        return;
      }

      if (!(await setStage('UPLOADING', 95, 'UPLOADING'))) return;
      const storageKey = `reports/${report.userId}/${reportId}.pdf`;
      const prefix = report.reportType.toLowerCase().replace(/_/g, '-');
      const fileName = `${prefix}-${report.birthProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${reportId.substring(0, 8)}.pdf`;
      let uploadResult;
      try {
        uploadResult = await storageService.upload({
          key: storageKey,
          body: result.pdf,
          contentType: 'application/pdf',
          metadata: { userId: report.userId, reportId, birthProfileId: report.birthProfileId, reportType: report.reportType },
        });
      } catch (uploadErr: any) {
        await this.handleAttemptFailure(attempt, 'OBJECT_STORAGE_UPLOAD_FAILED', uploadErr?.message || 'Object storage upload failed.');
        return;
      }
      if (lostOwnership) return;

      const completed = await postgresQueueService.completeJob(
        reportId, claimToken!, claimVersion!, storageKey, fileName, uploadResult.fileSize,
        result.manifest.pdf!.pageCount // measured from the PDF, not hard-coded
      );
      if (!completed) {
        logger.warn({ reportId, claimToken }, '[ReportPlatform] Completion skipped: claim no longer owned');
        try { await storageService.delete(storageKey); } catch (_) {}
        return;
      }
      if (report.orderId && report.fulfillmentUnitId) {
        try {
          await fulfillmentService.reconcileFulfillmentUnit(report.orderId, report.fulfillmentUnitId);
        } catch (ordErr: any) {
          logger.warn({ orderId: report.orderId, err: ordErr?.message }, '[ReportPlatform] Failed to reconcile fulfillment unit');
        }
      } else if (report.orderId) {
        try {
          await prisma.order.updateMany({ where: { id: report.orderId }, data: { fulfillmentStatus: FulfillmentStatus.FULFILLED } });
        } catch (ordErr: any) {
          logger.warn({ orderId: report.orderId, err: ordErr?.message }, '[ReportPlatform] Failed to update order to FULFILLED');
        }
      }
      logger.info(
        { reportId, durationMs: Date.now() - startTime, pageCount: result.manifest.pdf!.pageCount, failedAttemptsBefore: attempt.failedAttempts },
        '[ReportPlatform] Report completed'
      );
      try {
        await notificationService.sendNotification({
          userId: report.userId,
          type: 'REPORT_READY',
          entityId: report.id,
          idempotencyKey: `report_ready:${report.id}`,
          route: 'OPEN_REPORT',
          templateData: { reportName: report.reportType, reportId: report.id },
        });
      } catch (notifErr) {
        logger.error({ reportId, notifErr }, '[ReportPlatform] Failed to dispatch report completion notification');
      }
    } catch (err: any) {
      logger.error({ reportId, err: err?.message || err }, '[CareerReportWorker] Pipeline error occurred');
      if (!lostOwnership) {
        await this.handleAttemptFailure(attempt, 'PIPELINE_ERROR', err?.message || 'An unexpected worker error occurred.');
      }
    } finally {
      stopHeartbeat();
      if (this.inFlight.get(reportId)?.done === done) this.inFlight.delete(reportId);
      markDone();
    }
  }

  /** One platform generation run (a seam so tests can substitute the generation without a paid LLM). */
  public generatePlatformReport(input: PlatformRunInput): ReturnType<typeof runPlatformReport> {
    return runPlatformReport(input);
  }

  /**
   * Applies the retry policy to a failed attempt: reschedule (transient, before
   * the deadline and under the attempt cap) or mark FAILED with a clear message.
   */
  public async handleAttemptFailure(
    attempt: AttemptContext,
    errorCode: string,
    detail: string,
    userMessage?: string,
    now: Date = new Date()
  ): Promise<'rescheduled' | 'failed' | 'skipped'> {
    const failedAttempts = attempt.failedAttempts + 1;
    const decision = decideRetry({ errorCode, failedAttempts, now, deadline: attempt.deadline });

    if (decision.action === 'retry') {
      const ok = await postgresQueueService.rescheduleJob(
        attempt.reportId, attempt.claimToken!, attempt.claimVersion!, decision.retryAt, errorCode, detail
      );
      if (!ok) {
        logger.warn({ reportId: attempt.reportId, errorCode }, '[ReportRetry] Reschedule skipped: claim no longer owned');
        return 'skipped';
      }
      logger.warn(
        { reportId: attempt.reportId, errorCode, failedAttempts, retryAt: decision.retryAt.toISOString(), deadline: attempt.deadline.toISOString() },
        '[ReportRetry] Transient generation failure; retry scheduled (customer still sees the report as being prepared)'
      );
      return 'rescheduled';
    }

    const message = finalFailureMessage(decision, errorCode, failedAttempts, userMessage);
    logger.error(
      { reportId: attempt.reportId, errorCode, reason: decision.reason, failedAttempts, deadline: attempt.deadline.toISOString(), detail: detail.slice(0, 500) },
      '[REPORT_ALERT] Report generation stopped; marking FAILED'
    );
    try {
      await prisma.report.updateMany({
        where: { id: attempt.reportId, claimToken: attempt.claimToken },
        data: { lastAttemptAt: now, lastAttemptErrorCode: errorCode, lastAttemptErrorMessage: detail.slice(0, 2000) },
      });
    } catch (_) {}
    const failed = await this.failJob(attempt.reportId, errorCode, message, attempt.claimToken, attempt.claimVersion);
    return failed ? 'failed' : 'skipped';
  }

  /**
   * Atomic and race-safe operational retry for failed report jobs without re-charging the user.
   */
  public async retryReportJob(reportId: string): Promise<boolean> {
    const updateResult = await prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({
        where: { id: reportId },
        include: { order: true },
      });

      if (!report || report.status !== 'FAILED') {
        return { success: false, reason: 'NOT_FAILED' };
      }

      if (report.order && report.order.status !== OrderStatus.PAID) {
        return { success: false, reason: 'ORDER_NOT_PAID' };
      }

      const res = await tx.report.updateMany({
        where: { id: reportId, status: 'FAILED' },
        data: {
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
          errorCode: null,
          errorMessage: null,
          failedAt: null,
          claimToken: null,
          claimExpiresAt: null,
          recoveryAttempts: 0,
          retryAfter: null,
          generationFailures: 0,
          lastAttemptErrorCode: null,
          lastAttemptErrorMessage: null,
          updatedAt: new Date(),
        } as any,
      });

      if (res.count === 0) {
        return { success: false, reason: 'CONCURRENT_RETRY' };
      }

      if (report.orderId && report.fulfillmentUnitId) {
        await tx.fulfillmentUnit.updateMany({
          where: { id: report.fulfillmentUnitId, status: FulfillmentUnitStatus.FAILED },
          data: { status: FulfillmentUnitStatus.PROCESSING },
        });
      } else if (report.orderId) {
        await tx.order.updateMany({
          where: { id: report.orderId, status: OrderStatus.PAID },
          data: { fulfillmentStatus: FulfillmentStatus.PROCESSING },
        });
      }

      return { success: true };
    });

    if (!updateResult.success) {
      logger.warn({ reportId, reason: updateResult.reason }, '[CareerReportWorker] retryReportJob rejected');
      return false;
    }

    return await postgresQueueService.enqueueJob(reportId);
  }

  /**
   * Directly touches heartbeat timestamp for an active report.
   * If claimToken and claimVersion are provided, respects ownership fencing.
   */
  public async touchHeartbeat(reportId: string, claimToken?: string, claimVersion?: number): Promise<boolean> {
    if (claimToken && claimVersion !== undefined) {
      return await postgresQueueService.touchHeartbeat(reportId, claimToken, claimVersion);
    }
    const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'];
    try {
      const whereClause: any = {
        id: reportId,
        status: { in: activeStatuses as any[] },
      };
      if (claimToken) {
        whereClause.claimToken = claimToken;
      }

      const res = await prisma.report.updateMany({
        where: whereClause,
        data: {
          updatedAt: new Date(),
        },
      });
      return res.count > 0;
    } catch (err: any) {
      logger.warn({ reportId, err: err?.message }, '[CareerReportWorker] touchHeartbeat DB error');
      return false;
    }
  }

  /**
   * Updates report stage and progress with optional claim ownership fencing.
   */
  public async updateJobStatus(
    reportId: string,
    status: ReportStatus,
    progress: number,
    stage: string,
    claimToken?: string,
    claimVersion?: number
  ): Promise<boolean> {
    if (claimToken && claimVersion !== undefined) {
      return await postgresQueueService.updateJobStatus(reportId, claimToken, claimVersion, status, stage, progress);
    }
    const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'];
    try {
      const whereClause: any = {
        id: reportId,
        status: { in: activeStatuses as any[] },
      };
      if (claimToken) {
        whereClause.claimToken = claimToken;
      }

      const res = await prisma.report.updateMany({
        where: whereClause,
        data: {
          status,
          stage,
          progress,
          updatedAt: new Date(),
        } as any,
      });
      return res.count > 0;
    } catch (err: any) {
      logger.warn({ reportId, err: err?.message }, '[CareerReportWorker] updateJobStatus DB error');
      return false;
    }
  }

  /**
   * Race-safe stale failure transition validating that heartbeat has not advanced.
   */
  public async failJobIfStale(
    reportId: string,
    capturedUpdatedAt: Date,
    errorCode: string,
    errorMessage: string
  ): Promise<boolean> {
    const now = new Date();
    const activeStatuses = [
      'QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING', 'PENDING', 'PROCESSING'
    ];

    try {
      const updateResult = await prisma.report.updateMany({
        where: {
          id: reportId,
          status: { in: activeStatuses as any[] },
          updatedAt: capturedUpdatedAt,
        },
        data: {
          status: 'FAILED',
          stage: 'FAILED',
          progress: 0,
          errorCode,
          errorMessage,
          claimToken: null,
          claimExpiresAt: null,
          failedAt: now,
          updatedAt: now,
        } as any,
      });

      if (updateResult.count === 0) {
        logger.warn(
          { reportId, capturedUpdatedAt },
          '[CareerReportWorker] Skipped stale failure: report heartbeat advanced or status changed during recovery.'
        );
        return false;
      }

      logger.warn({ reportId, errorCode, errorMessage }, '[CareerReportWorker] Job marked as FAILED by stale recovery');

      const failedReport = await prisma.report.findUnique({
        where: { id: reportId },
        select: { userId: true, reportType: true, orderId: true, fulfillmentUnitId: true },
      });

      if (failedReport?.userId) {
        try {
          await notificationService.sendNotification({
            userId: failedReport.userId,
            type: 'REPORT_FAILED',
            entityId: reportId,
            idempotencyKey: `report_failed:${reportId}`,
            route: 'OPEN_REPORT',
            templateData: {
              reportName: failedReport.reportType || 'Career Intelligence Report',
              reportId,
            },
          });
        } catch (notifErr: any) {
          logger.warn({ reportId, notifErr: notifErr?.message }, '[CareerReportWorker] Failed to dispatch report failure notification');
        }
      }

      if (failedReport?.orderId && failedReport?.fulfillmentUnitId) {
        try {
          await fulfillmentService.reconcileFulfillmentUnit(failedReport.orderId, failedReport.fulfillmentUnitId);
        } catch (fErr: any) {
          logger.warn({ orderId: failedReport.orderId, err: fErr?.message }, '[CareerReportWorker] Failed to reconcile fulfillment unit on stale fail');
        }
      } else if (failedReport?.orderId) {
        const order = await prisma.order.findUnique({
          where: { id: failedReport.orderId },
          include: { reports: true },
        });

        const hasCompletedReport = order?.reports.some((r) => r.status === 'COMPLETED');
        if (!hasCompletedReport && order?.fulfillmentStatus === FulfillmentStatus.PROCESSING) {
          await prisma.order.updateMany({
            where: {
              id: failedReport.orderId,
              fulfillmentStatus: FulfillmentStatus.PROCESSING,
            },
            data: {
              fulfillmentStatus: FulfillmentStatus.FAILED,
            },
          });
          logger.warn(
            { orderId: failedReport.orderId, reportId },
            '[ReportWorker] Order fulfillmentStatus transitioned to FAILED (recoverable)'
          );
        }
      }

      return true;
    } catch (dbErr: any) {
      logger.error({ reportId, dbErr: dbErr?.message }, '[CareerReportWorker] failJobIfStale error');
      return false;
    }
  }

  public async failJob(
    reportId: string,
    errorCode: string,
    errorMessage: string,
    claimToken?: string,
    claimVersion?: number
  ): Promise<boolean> {
    const now = new Date();
    try {
      let ok = false;
      if (claimToken && claimVersion !== undefined) {
        ok = await postgresQueueService.failJob(reportId, claimToken, claimVersion, errorCode, errorMessage);
      } else {
        const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING', 'PENDING', 'PROCESSING'];
        const updateResult = await prisma.report.updateMany({
          where: {
            id: reportId,
            status: { in: activeStatuses as any[] },
          },
          data: {
            status: 'FAILED',
            stage: 'FAILED',
            progress: 0,
            errorCode,
            errorMessage,
            failedAt: now,
            claimToken: null,
            claimExpiresAt: null,
            updatedAt: now,
          } as any,
        });
        ok = updateResult.count > 0;
      }

      if (!ok) {
        logger.warn(
          { reportId, errorCode },
          '[CareerReportWorker] Skipped failJob: report is not in an active state or ownership token mismatch'
        );
        return false;
      }

      logger.warn({ reportId, errorCode, errorMessage }, '[CareerReportWorker] Job marked as FAILED');

      await this.finalizeFailedReport(reportId);

      return true;
    } catch (dbErr: any) {
      logger.error(
        { reportId, errorCode, errorMessage, dbErr: dbErr?.message },
        '[CareerReportWorker] Critical double-fault: Failed to record FAILED report state to database.'
      );
      return false;
    }
  }

  /**
   * Follow-up after a report reached FAILED: notify the user and move the order
   * (or its fulfilment unit) to a recoverable FAILED state. Never marks an order
   * FAILED when one of its reports is COMPLETED.
   */
  private async finalizeFailedReport(reportId: string): Promise<void> {
    try {
      const failedReport = await prisma.report.findUnique({
        where: { id: reportId },
        select: { userId: true, reportType: true, orderId: true, fulfillmentUnitId: true },
      });

      if (failedReport?.userId) {
        try {
          await notificationService.sendNotification({
            userId: failedReport.userId,
            type: 'REPORT_FAILED',
            entityId: reportId,
            idempotencyKey: `report_failed:${reportId}`,
            route: 'OPEN_REPORT',
            templateData: {
              reportName: failedReport.reportType || 'Career Intelligence Report',
              reportId,
            },
          });
        } catch (notifErr: any) {
          logger.warn({ reportId, notifErr: notifErr?.message }, '[CareerReportWorker] Failed to dispatch report failure notification');
        }
      }

      if (failedReport?.orderId && failedReport?.fulfillmentUnitId) {
        try {
          await fulfillmentService.reconcileFulfillmentUnit(failedReport.orderId, failedReport.fulfillmentUnitId);
        } catch (fErr: any) {
          logger.warn({ orderId: failedReport.orderId, err: fErr?.message }, '[CareerReportWorker] Failed to reconcile fulfillment unit on failure');
        }
      } else if (failedReport?.orderId) {
        const order = await prisma.order.findUnique({
          where: { id: failedReport.orderId },
          include: { reports: true },
        });

        // Never mark order FAILED if any report for this order is COMPLETED!
        const hasCompletedReport = order?.reports.some((r) => r.status === 'COMPLETED');
        if (!hasCompletedReport && order?.fulfillmentStatus === FulfillmentStatus.PROCESSING) {
          await prisma.order.updateMany({
            where: {
              id: failedReport.orderId,
              fulfillmentStatus: FulfillmentStatus.PROCESSING,
            },
            data: {
              fulfillmentStatus: FulfillmentStatus.FAILED,
            },
          });
          logger.warn(
            { orderId: failedReport.orderId, reportId },
            '[ReportWorker] Order fulfillmentStatus transitioned to FAILED (recoverable)'
          );
        }
      }
    } catch (err: any) {
      logger.error({ reportId, err: err?.message || err }, '[CareerReportWorker] Failed to finalize FAILED report');
    }
  }
}

export const careerReportWorker = new CareerReportWorker();
