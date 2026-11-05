import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from './prisma.service';
import { ReportStatus, FulfillmentStatus, OrderStatus } from '@prisma/client';
import { storageService } from './storage.service';
import { astrologyService } from '../modules/astrology/astrology.service';
import { notificationService } from '../modules/notifications/notification.service';
import { logger } from '../utils/logger';
import {
  careerEvidenceEngine,
  OpenRouterCareerAnalysisProvider,
  MockCareerAnalysisProvider,
  CareerAnalysisProvider,
  getOpenRouterCareerConfig,
} from '@astro/prediction-engine';
import {
  careerReportService,
  latexCompiler,
  generateKundliReport,
  generatePlanetaryReport,
  generateProHoroscopeReport,
  generateMatchmakingReport,
  validateAstrologyDataForReport,
  DeterministicInterpretationProvider,
  reportPdfService,
} from '@astro/report-engine';

export type ReportJobStage =
  | 'QUEUED'
  | 'CALCULATING'
  | 'ANALYZING'
  | 'RENDERING'
  | 'COMPILING'
  | 'UPLOADING'
  | 'COMPLETED'
  | 'FAILED';

import { redisQueueService } from './redis-queue.service';
import { distributedLockService } from './distributed-lock.service';

export interface ReportJobProgress {
  stage: ReportJobStage;
  progress: number;
  message?: string;
}

export class CareerReportWorker {
  private isProcessing = false;
  private isRecovering = false;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private readonly jobQueue: string[] = [];

  constructor() {
    const cfg = getOpenRouterCareerConfig();
    const provider = (process.env.LLM_PROVIDER || 'openrouter').toLowerCase();
    console.log('[LLM CONFIG]', {
      provider,
      model: cfg.model,
      fallbackModels: cfg.fallbackModels,
    });
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
   * Enqueues a report generation job by ID and kicks off worker processing loop.
   */
  public enqueueReportJob(reportId: string): void {
    redisQueueService.enqueueJob(reportId).then((enqueued) => {
      if (enqueued) {
        this.markJobEnqueued(reportId).catch(() => {});
      } else {
        if (!this.jobQueue.includes(reportId)) {
          this.jobQueue.push(reportId);
        }
        setImmediate(() => {
          this.processQueue();
        });
      }
    }).catch(() => {
      if (!this.jobQueue.includes(reportId)) {
        this.jobQueue.push(reportId);
      }
      setImmediate(() => {
        this.processQueue();
      });
    });
  }

  /**
   * Marks a report as successfully enqueued to Redis in metadata.
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
   * Recovers stuck in-progress report jobs and orphaned PROCESSING orders.
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
   * Core recovery routine executed under distributed lock.
   */
  private async executeStaleRecovery(): Promise<{ recoveredReports: number; recoveredOrders: number; redisUnavailable?: boolean }> {
    let recoveredReports = 0;
    let recoveredOrders = 0;

    // Check Redis health first to prevent falsely failing paid reports during temporary broker outages
    const isRedisEnvironmentConfigured = Boolean(
      process.env.REDIS_URL || process.env.REDIS_HOST || process.env.UPSTASH_REDIS_REST_URL
    );
    const isRedisHealthy = redisQueueService.isConfigured && (await redisQueueService.checkHealth());
    if (isRedisEnvironmentConfigured && !isRedisHealthy) {
      logger.warn('[CareerReportWorker] Redis broker unreachable. Deferring queue recovery to avoid failing valid jobs.');
      return { recoveredReports: 0, recoveredOrders: 0, redisUnavailable: true };
    }

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // 1. Recover abandoned or stalled reports
      const staleReports = await prisma.report.findMany({
        where: {
          status: { in: ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'] as any[] },
          updatedAt: { lt: fiveMinutesAgo },
        },
      });

      for (const r of staleReports) {
        const metadata = ((r.metadata || {}) as Record<string, any>);
        const recoveryAttempts = (metadata.recoveryAttempts as number) || 0;
        const MAX_QUEUED_RECOVERY_ATTEMPTS = 3;

        // Check whether report is waiting in Redis queue backlog
        const isPendingInQueue = await redisQueueService.isInPendingQueue(r.id);

        if (r.status === 'QUEUED') {
          if (isPendingInQueue) {
            // Requirement 1: Never fail an enqueued QUEUED report merely because it has waited five minutes!
            // It is waiting in queue backlog. Worker has not claimed it yet.
            if (metadata.enqueued !== true) {
              // Self-heal crash window: API crashed after Redis enqueue but before PostgreSQL metadata update
              await this.markJobEnqueued(r.id);
              logger.info({ reportId: r.id }, '[CareerReportWorker] Self-healed unconfirmed enqueued metadata for job in queue.');
            }
            logger.info(
              { reportId: r.id, updatedAt: r.updatedAt },
              '[CareerReportWorker] Report is waiting in Redis queue backlog. Preserving QUEUED state without failing.'
            );
            continue;
          }

          // Not in pending queue. Distinguish un-enqueued crash window vs claimed/abandoned jobs
          const wasClaimed = await redisQueueService.isClaimedByWorker(r.id);
          const isAbandonedUnenqueued = metadata.enqueued === false && !wasClaimed;

          if (isAbandonedUnenqueued) {
            // API crash window before enqueue: DB committed but not enqueued
            if (recoveryAttempts < MAX_QUEUED_RECOVERY_ATTEMPTS) {
              try {
                const enqueued = await redisQueueService.enqueueJob(r.id);
                if (enqueued) {
                  const nextAttempts = recoveryAttempts + 1;
                  const now = new Date();
                  const updateResult = await prisma.report.updateMany({
                    where: { id: r.id, status: 'QUEUED' },
                    data: {
                      updatedAt: now,
                      metadata: {
                        ...metadata,
                        enqueued: true,
                        recoveryAttempts: nextAttempts,
                        lastReenqueuedAt: now.toISOString(),
                      },
                    } as any,
                  });

                  if (updateResult.count > 0) {
                    if (r.orderId) {
                      await prisma.order.updateMany({
                        where: {
                          id: r.orderId,
                          status: OrderStatus.PAID,
                          fulfillmentStatus: { in: [FulfillmentStatus.UNFULFILLED, FulfillmentStatus.FAILED] },
                        },
                        data: { fulfillmentStatus: FulfillmentStatus.PROCESSING },
                      });
                    }
                    logger.warn(
                      { reportId: r.id, attempt: nextAttempts, maxAttempts: MAX_QUEUED_RECOVERY_ATTEMPTS },
                      '[CareerReportWorker] Re-enqueued abandoned QUEUED report successfully'
                    );
                    recoveredReports++;
                  }
                } else {
                  logger.warn(
                    { reportId: r.id },
                    '[CareerReportWorker] Redis unavailable when attempting to re-enqueue QUEUED report. Preserving for next recovery iteration.'
                  );
                }
              } catch (enqueueErr: any) {
                logger.error({ reportId: r.id, err: enqueueErr?.message }, '[CareerReportWorker] Error re-enqueueing abandoned report');
              }
            } else {
              // Exceeded max recovery attempts
              logger.error(
                { reportId: r.id, recoveryAttempts },
                '[CareerReportWorker] Abandoned QUEUED report exceeded max re-enqueue attempts. Transitioning to FAILED.'
              );
              const failed = await this.failJob(
                r.id,
                'QUEUE_RECOVERY_EXHAUSTED',
                'Report processing timed out after multiple re-enqueue attempts. Please retry.'
              );
              if (failed) recoveredReports++;
            }
          } else {
            // Worker claimed it or was enqueued and dequeued, but worker died!
            logger.warn(
              { reportId: r.id, status: r.status, updatedAt: r.updatedAt },
              '[CareerReportWorker] Worker dequeued job but crashed or abandoned it > 5 minutes ago. Attempting conditional failure transition.'
            );
            const failed = await this.failJobIfStale(
              r.id,
              r.updatedAt,
              'WORKER_TIMEOUT_RECOVERED',
              'Report processing timed out or server restarted. Please try again.'
            );
            if (failed) recoveredReports++;
          }
        } else {
          // Status is in CALCULATING, ANALYZING, RENDERING, COMPILING, UPLOADING
          // In-flight stage crashed (heartbeats expired > 5 minutes ago)
          logger.warn(
            { reportId: r.id, status: r.status, updatedAt: r.updatedAt },
            '[CareerReportWorker] Job heartbeat expired > 5 minutes. Attempting conditional failure transition.'
          );
          const failed = await this.failJobIfStale(
            r.id,
            r.updatedAt,
            'WORKER_TIMEOUT_RECOVERED',
            'Report processing timed out or server restarted. Please try again.'
          );
          if (failed) recoveredReports++;
        }
      }

      // 2. Recover orphaned orders stuck in PROCESSING without active reports
      const staleOrders = await prisma.order.findMany({
        where: {
          status: OrderStatus.PAID,
          fulfillmentStatus: FulfillmentStatus.PROCESSING,
          updatedAt: { lt: fiveMinutesAgo },
        },
        include: { reports: true },
      });

      for (const ord of staleOrders) {
        const hasLiveOrCompletedReport = ord.reports.some(
          (r) => r.status === 'COMPLETED' || (!['FAILED', 'CANCELLED'].includes(r.status) && r.updatedAt >= fiveMinutesAgo)
        );

        if (!hasLiveOrCompletedReport) {
          logger.warn(
            { orderId: ord.id },
            '[CareerReportWorker] Recovering orphaned PROCESSING order without active report. Resetting to FAILED (recoverable).'
          );
          await prisma.order.updateMany({
            where: { id: ord.id, fulfillmentStatus: FulfillmentStatus.PROCESSING },
            data: { fulfillmentStatus: FulfillmentStatus.FAILED },
          });
          recoveredOrders++;
        }
      }

      if (recoveredReports > 0 || recoveredOrders > 0) {
        logger.info(
          { recoveredReports, recoveredOrders },
          '[CareerReportWorker] Stale recovery execution completed successfully.'
        );
      }
    } catch (err: any) {
      logger.error({ err: err?.message || err }, '[CareerReportWorker] Error in executeStaleRecovery');
    }

    return { recoveredReports, recoveredOrders };
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
   * Atomically claims a report for execution using Redis atomic token-stamping
   * and PostgreSQL conditional atomic CAS state transition.
   */
  public async acquireWorkerClaim(reportId: string, claimToken: string): Promise<boolean> {
    // 1. Acquire distributed claim in Redis (SET NX PX)
    const redisOk = await redisQueueService.acquireReportClaim(reportId, claimToken);
    if (!redisOk) {
      logger.warn(
        { reportId, claimToken },
        '[CareerReportWorker] Redis claim rejected: report already claimed by another active worker'
      );
      return false;
    }

    // 2. Fetch existing report to preserve existing metadata
    const existing = await prisma.report.findUnique({
      where: { id: reportId },
      select: { metadata: true, status: true },
    });

    if (!existing || !['QUEUED', 'PENDING'].includes(existing.status)) {
      logger.warn(
        { reportId, status: existing?.status },
        '[CareerReportWorker] Report is not in claimable state (must be QUEUED or PENDING)'
      );
      await redisQueueService.releaseReportClaim(reportId, claimToken);
      return false;
    }

    const currentMeta = (existing.metadata && typeof existing.metadata === 'object')
      ? (existing.metadata as Record<string, any>)
      : {};

    const now = new Date();
    // 3. PostgreSQL atomic CAS transition: QUEUED/PENDING -> CALCULATING
    const updateRes = await prisma.report.updateMany({
      where: {
        id: reportId,
        status: { in: ['QUEUED', 'PENDING'] },
      },
      data: {
        status: 'CALCULATING',
        stage: 'CALCULATING',
        progress: 15,
        updatedAt: now,
        metadata: {
          ...currentMeta,
          claimToken,
          claimedAt: now.toISOString(),
        },
      },
    });

    if (updateRes.count === 0) {
      logger.warn(
        { reportId, claimToken },
        '[CareerReportWorker] PostgreSQL atomic claim failed: report was claimed or transitioned concurrently'
      );
      await redisQueueService.releaseReportClaim(reportId, claimToken);
      return false;
    }

    logger.info({ reportId, claimToken }, '[CareerReportWorker] Worker claim successfully acquired');
    return true;
  }

  /**
   * Complete End-to-End Async Pipeline Execution
   */
  public async executeReportPipeline(reportId: string, customClaimToken?: string): Promise<void> {
    const startTime = Date.now();
    const claimToken = customClaimToken || randomUUID();

    // 1. Atomically acquire worker claim
    const claimed = await this.acquireWorkerClaim(reportId, claimToken);
    if (!claimed) {
      logger.info({ reportId, claimToken }, '[CareerReportWorker] Could not acquire worker claim. Skipping execution.');
      return;
    }

    // 2. Fetch DB report record with relations
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { birthProfile: true, user: true },
    });

    if (!report) {
      logger.error({ reportId }, '[CareerReportWorker] Report record not found');
      await redisQueueService.releaseReportClaim(reportId, claimToken);
      return;
    }

    const supportedReportTypes = ['CAREER', 'KUNDLI', 'PLANETARY_SUMMARY', 'CAREER_PROSITY', 'MARRIAGE_COMPATIBILITY'];
    if (!supportedReportTypes.includes(report.reportType)) {
      await this.failJob(
        reportId,
        'REPORT_TYPE_NOT_SUPPORTED',
        `Report type ${report.reportType} is not supported. Dedicated generator is not available.`,
        claimToken
      );
      return;
    }

    const heartbeatIntervalMs = parseInt(process.env.WORKER_HEARTBEAT_INTERVAL_MS || '20000', 10);
    const claimLeaseTtlMs = 60000; // 60s lease renewed every 20s
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let isHeartbeating = false;
    let lostOwnership = false;

    const startHeartbeat = () => {
      heartbeatTimer = setInterval(async () => {
        if (isHeartbeating || lostOwnership) return;
        isHeartbeating = true;
        try {
          // 1. Atomically renew Redis claim lease
          const renewed = await redisQueueService.renewReportClaim(reportId, claimToken, claimLeaseTtlMs);
          if (!renewed) {
            lostOwnership = true;
            logger.warn({ reportId, claimToken }, '[CareerReportWorker] Lost Redis claim lease during renewal. Halting execution.');
            stopHeartbeat();
            return;
          }

          // 2. Touch PostgreSQL heartbeat
          const alive = await this.touchHeartbeat(reportId, claimToken);
          if (!alive) {
            lostOwnership = true;
            logger.warn({ reportId, claimToken }, '[CareerReportWorker] Lost DB ownership during heartbeat touch. Halting execution.');
            stopHeartbeat();
            return;
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

    const stopHeartbeat = () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const setStage = async (status: ReportStatus, progress: number, stage: string): Promise<boolean> => {
      if (lostOwnership) {
        logger.warn({ reportId, claimToken, stage }, '[CareerReportWorker] Aborting setStage because ownership was previously lost.');
        return false;
      }
      const ok = await this.updateJobStatus(reportId, status, progress, stage, claimToken);
      if (!ok) {
        lostOwnership = true;
        logger.warn({ reportId, claimToken, stage }, '[CareerReportWorker] Lost ownership during stage update. Aborting execution.');
        stopHeartbeat();
      }
      return ok;
    };

    try {
      startHeartbeat();

      if (report.reportType === 'CAREER') {

        const normalizedChart = await astrologyService.calculateNormalizedChart(
          { birthProfileId: report.birthProfileId },
          { id: report.userId, role: 'USER' }
        );

        if (!normalizedChart || !normalizedChart.ascendant || !normalizedChart.ascendant.sign) {
          await this.failJob(reportId, 'CHART_DATA_INCOMPLETE', 'Ascendant data is missing from chart calculation.', claimToken);
          return;
        }
        if (!Array.isArray(normalizedChart.planets) || normalizedChart.planets.length < 9) {
          await this.failJob(reportId, 'CHART_DATA_INCOMPLETE', 'Incomplete planetary positions from chart calculation.', claimToken);
          return;
        }
        if (!Array.isArray(normalizedChart.houses) || normalizedChart.houses.length < 12) {
          await this.failJob(reportId, 'CHART_DATA_INCOMPLETE', 'Incomplete house positions from chart calculation.', claimToken);
          return;
        }

        // --- STAGE 3: ANALYZING (35%) ---
        if (!(await setStage('ANALYZING', 35, 'ANALYZING'))) return;

        // Select LLM Provider: Check LLM_PROVIDER env var first, fallback to OpenRouter if API key present
        const isProduction = process.env.NODE_ENV === 'production';
        const llmProviderEnv = (process.env.LLM_PROVIDER || '').toLowerCase().trim();
        const openrouterConfig = getOpenRouterCareerConfig();
        const isApiKeyAvailable = Boolean(
          openrouterConfig.apiKey &&
          openrouterConfig.apiKey.trim().length > 0 &&
          openrouterConfig.apiKey !== 'mock-key-dev'
        );

        if (isProduction) {
          if (llmProviderEnv === 'mock') {
            logger.error({ reportId }, '[CareerReportWorker] Mock AI provider is strictly prohibited in production');
            await this.failJob(reportId, 'AI_PROVIDER_ERROR', 'Mock AI provider is strictly prohibited in production environment.', claimToken);
            return;
          }
          if (!isApiKeyAvailable) {
            logger.error({ reportId }, '[CareerReportWorker] OpenRouter API key missing in production');
            await this.failJob(reportId, 'AI_CREDENTIALS_MISSING', 'OpenRouter API key is required in production environment.', claimToken);
            return;
          }
        }

        const useMock = !isProduction && (llmProviderEnv === 'mock' || (!isApiKeyAvailable && llmProviderEnv !== 'openrouter'));
        const provider: CareerAnalysisProvider = useMock
          ? new MockCareerAnalysisProvider()
          : new OpenRouterCareerAnalysisProvider();

        logger.info(
          { reportId, provider: useMock ? 'MOCK' : 'OPENROUTER', model: openrouterConfig.model },
          '[CareerReportWorker] Initiating career analysis synthesis'
        );

        let pipelineResult;
        try {
          pipelineResult = await careerReportService.generateCareerReportData(normalizedChart, {
            provider,
            clientProfile: {
              clientName: report.birthProfile.name,
              dateOfBirth: report.birthProfile.dateOfBirth,
              timeOfBirth: report.birthProfile.timeOfBirth,
              birthPlace: report.birthProfile.placeName || undefined,
              timeZone: report.birthProfile.timezone,
              latitude: report.birthProfile.latitude,
              longitude: report.birthProfile.longitude,
            },
          });
        } catch (analysisErr: any) {
          logger.error({ reportId, err: analysisErr.message }, '[CareerReportWorker] Career analysis failed');
          await this.failJob(reportId, 'CAREER_ANALYSIS_FAILED', analysisErr.message || 'LLM Career Analysis failed.', claimToken);
          return;
        }

        // --- STAGE 4: RENDERING (60%) ---
        if (!(await setStage('RENDERING', 60, 'RENDERING'))) return;
        const reportDataTex = pipelineResult.reportDataTex;

        // --- STAGE 5: COMPILING (75%) ---
        if (!(await setStage('COMPILING', 75, 'COMPILING'))) return;

        let compilationResult;
        try {
          compilationResult = await latexCompiler.compileReport({
            reportId,
            reportDataTex,
            careerReportData: pipelineResult.reportData,
            timeoutMs: 180000,
          });
        } catch (compileErr: any) {
          const cleanMsg = compileErr?.message ? compileErr.message.split('\n')[0] : 'LaTeX PDF compilation failed.';
          await this.failJob(reportId, 'LATEX_COMPILE_FAILED', cleanMsg, claimToken);
          return;
        }

        // --- STAGE 5.5: VALIDATING / QA (85%) ---
        if (!(await setStage('COMPILING', 85, 'VALIDATING'))) return;
        const isQaEnabled = process.env.REPORT_PDF_QA_ENABLED?.toLowerCase().trim() !== 'false';

        const validation = validateReportPdf(
          compilationResult.pdfBuffer,
          compilationResult.pageCount,
          reportDataTex
        );

        if (isQaEnabled) {
          if (!validation.valid) {
            logger.error({ reportId, reason: validation.reason }, '[CareerReportWorker] PDF Validation QA failed');
            await this.failJob(reportId, 'PDF_QA_VALIDATION_FAILED', validation.reason || 'PDF failed quality verification.', claimToken);
            return;
          }
        } else {
          logger.info(
            { reportId, pageCount: compilationResult.pageCount, valid: validation.valid, reason: validation.reason },
            '[CareerReportWorker] PDF QA: SKIPPED (REPORT_PDF_QA_ENABLED=false)'
          );
        }

        // --- STAGE 6: UPLOADING (95%) ---
        if (!(await setStage('UPLOADING', 95, 'UPLOADING'))) return;

        // Fencing check: verify worker still owns the claim before external side effect (S3 upload)
        if (lostOwnership) {
          logger.warn({ reportId, claimToken }, '[CareerReportWorker] Lost ownership before S3 upload. Aborting execution.');
          return;
        }

        const storageKey = `reports/${report.userId}/${reportId}.pdf`;
        const fileName = `career-report-${report.birthProfile.name.toLowerCase().replace(/\s+/g, '-')}-${reportId.substring(0, 8)}.pdf`;

        let uploadResult;
        try {
          uploadResult = await storageService.upload({
            key: storageKey,
            body: compilationResult.pdfBuffer,
            contentType: 'application/pdf',
            metadata: {
              userId: report.userId,
              reportId,
              birthProfileId: report.birthProfileId,
            },
          });
        } catch (uploadErr: any) {
          logger.error({ reportId, err: uploadErr.message }, '[CareerReportWorker] Object storage upload failed');
          await this.failJob(reportId, 'OBJECT_STORAGE_UPLOAD_FAILED', uploadErr.message || 'Object storage upload failed.', claimToken);
          return;
        }

        // Fencing check: verify worker still owns the claim before DB completion and order fulfillment
        if (lostOwnership) {
          logger.warn({ reportId, claimToken }, '[CareerReportWorker] Lost ownership before DB completion. Aborting execution.');
          return;
        }

        // --- STAGE 7: COMPLETED (100%) ---
        const now = new Date();
        const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'];
        const completedRes = await prisma.report.updateMany({
          where: {
            id: reportId,
            status: { in: activeStatuses as any[] },
            metadata: {
              path: ['claimToken'],
              equals: claimToken,
            },
          },
          data: {
            status: 'COMPLETED',
            stage: 'COMPLETED',
            progress: 100,
            s3Url: null,
            storageKey,
            fileName,
            fileSize: uploadResult.fileSize,
            pageCount: compilationResult.pageCount,
            completedAt: now,
            updatedAt: now,
          } as any,
        });

        if (completedRes.count === 0) {
          logger.warn(
            { reportId, claimToken },
            '[CareerReportWorker] Career report completion skipped because report is no longer in active state or claimToken mismatch'
          );
          return;
        }

        // Fulfill associated paid order if bound
        if (report.orderId) {
          try {
            await prisma.order.updateMany({
              where: { id: report.orderId },
              data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
            });
            logger.info({ orderId: report.orderId, reportId }, '[CareerReportWorker] Order marked FULFILLED');
          } catch (ordErr: any) {
            logger.warn({ orderId: report.orderId, err: ordErr?.message }, '[CareerReportWorker] Failed to update order to FULFILLED');
          }
        }

        const durationMs = Date.now() - startTime;
        logger.info(
          { reportId, durationMs, pageCount: compilationResult.pageCount, fileSize: compilationResult.fileSize },
          '[CareerReportWorker] Career report completed successfully'
        );

        // Async notification dispatch (non-blocking)
        try {
          await notificationService.sendNotification({
            userId: report.userId,
            type: 'REPORT_READY',
            entityId: report.id,
            route: 'OPEN_REPORT',
            templateData: {
              reportName: 'Career Intelligence Report',
              reportId: report.id,
            },
          });
        } catch (notifErr) {
          logger.error({ reportId, notifErr }, '[CareerReportWorker] Failed to dispatch report completion notification');
        }
      } else {
        // --- STAGE 2: CALCULATING (15%) is already set by acquireWorkerClaim
        const metadata = ((report as any).metadata || {}) as Record<string, any>;
        const userCtx = { id: report.userId, role: 'USER' };
        const interpretationProvider = new DeterministicInterpretationProvider();

        const profileInput = {
          name: report.birthProfile.name,
          dateOfBirth: report.birthProfile.dateOfBirth,
          timeOfBirth: report.birthProfile.timeOfBirth,
          placeName: report.birthProfile.placeName,
          timezone: report.birthProfile.timezone,
          latitude: report.birthProfile.latitude,
          longitude: report.birthProfile.longitude,
        };

        let structuredReport: any;

        if (report.reportType === 'MARRIAGE_COMPATIBILITY') {
          const partnerProfileId = metadata.partnerProfileId;
          if (!partnerProfileId) {
            await this.failJob(
              reportId,
              'MISSING_PARTNER_PROFILE',
              'Partner birth profile ID is required for marriage compatibility report.',
              claimToken
            );
            return;
          }

          const partnerProfile = await prisma.birthProfile.findUnique({
            where: { id: partnerProfileId },
          });

          if (!partnerProfile) {
            await this.failJob(reportId, 'PARTNER_PROFILE_NOT_FOUND', 'Partner birth profile not found.', claimToken);
            return;
          }

          let chart1: any;
          let chart2: any;
          try {
            chart1 = await astrologyService.calculateChartForProfile(report.birthProfileId, userCtx);
            chart2 = await astrologyService.calculateChartForProfile(partnerProfileId, userCtx);
            validateAstrologyDataForReport(chart1);
            validateAstrologyDataForReport(chart2);
          } catch (chartErr: any) {
            await this.failJob(reportId, 'CHART_DATA_INCOMPLETE', chartErr.message || 'Error calculating partner charts.', claimToken);
            return;
          }

          // --- STAGE 3: ANALYZING (35%) ---
          if (!(await setStage('ANALYZING', 35, 'ANALYZING'))) return;

          const profile2Input = {
            name: partnerProfile.name,
            dateOfBirth: partnerProfile.dateOfBirth,
            timeOfBirth: partnerProfile.timeOfBirth,
            placeName: partnerProfile.placeName,
            timezone: partnerProfile.timezone,
            latitude: partnerProfile.latitude,
            longitude: partnerProfile.longitude,
          };

          try {
            structuredReport = await generateMatchmakingReport(
              profileInput,
              profile2Input,
              chart1,
              chart2,
              interpretationProvider
            );
          } catch (analysisErr: any) {
            logger.error({ reportId, err: analysisErr.message }, '[CareerReportWorker] Matchmaking analysis failed');
            await this.failJob(reportId, 'MATCHMAKING_ANALYSIS_FAILED', analysisErr.message || 'Matchmaking analysis failed.', claimToken);
            return;
          }
        } else {
          let chartResponse: any;
          try {
            chartResponse = await astrologyService.calculateChartForProfile(report.birthProfileId, userCtx);
            validateAstrologyDataForReport(chartResponse);
          } catch (chartErr: any) {
            await this.failJob(reportId, 'CHART_DATA_INCOMPLETE', chartErr.message || 'Incomplete chart data.', claimToken);
            return;
          }

          // --- STAGE 3: ANALYZING (35%) ---
          if (!(await setStage('ANALYZING', 35, 'ANALYZING'))) return;

          try {
            if (report.reportType === 'KUNDLI') {
              structuredReport = await generateKundliReport(profileInput, chartResponse, interpretationProvider);
            } else if (report.reportType === 'PLANETARY_SUMMARY') {
              structuredReport = await generatePlanetaryReport(profileInput, chartResponse, interpretationProvider);
            } else if (report.reportType === 'CAREER_PROSITY') {
              structuredReport = await generateProHoroscopeReport(profileInput, chartResponse, interpretationProvider);
            } else {
              await this.failJob(reportId, 'REPORT_TYPE_NOT_SUPPORTED', `Report type ${report.reportType} is not supported. Dedicated generator is not available.`, claimToken);
              return;
            }
          } catch (analysisErr: any) {
            logger.error({ reportId, err: analysisErr.message }, '[CareerReportWorker] Report analysis failed');
            await this.failJob(reportId, 'ANALYSIS_FAILED', analysisErr.message || 'Report analysis failed.', claimToken);
            return;
          }
        }

        // --- STAGE 4: RENDERING (60%) ---
        if (!(await setStage('RENDERING', 60, 'RENDERING'))) return;

        // --- STAGE 5: COMPILING (75%) ---
        if (!(await setStage('COMPILING', 75, 'COMPILING'))) return;

        let pdfBuffer: Buffer;
        try {
          pdfBuffer = await reportPdfService.generateReportPdf(structuredReport);
        } catch (renderErr: any) {
          logger.error({ reportId, err: renderErr.message }, '[CareerReportWorker] PDF rendering failed');
          await this.failJob(reportId, 'PDF_RENDER_FAILED', renderErr.message || 'PDF rendering failed.', claimToken);
          return;
        }

        // --- STAGE 5.5: VALIDATING (85%) ---
        if (!(await setStage('COMPILING', 85, 'VALIDATING'))) return;
        if (!pdfBuffer || pdfBuffer.length < 1000 || !pdfBuffer.slice(0, 5).toString('utf-8').startsWith('%PDF-')) {
          await this.failJob(reportId, 'PDF_QA_VALIDATION_FAILED', 'PDF binary verification failed (invalid %PDF header).', claimToken);
          return;
        }

        // --- STAGE 6: UPLOADING (95%) ---
        if (!(await setStage('UPLOADING', 95, 'UPLOADING'))) return;

        // Fencing check: verify worker still owns the claim before external side effect (S3 upload)
        if (lostOwnership) {
          logger.warn({ reportId, claimToken }, '[ConsumerReportWorker] Lost ownership before S3 upload. Aborting execution.');
          return;
        }

        const storageKey = `reports/${report.userId}/${reportId}.pdf`;
        const prefix = report.reportType.toLowerCase().replace(/_/g, '-');
        const fileName = `${prefix}-${report.birthProfile.name.toLowerCase().replace(/\s+/g, '-')}-${reportId.substring(0, 8)}.pdf`;

        let uploadResult;
        try {
          uploadResult = await storageService.upload({
            key: storageKey,
            body: pdfBuffer,
            contentType: 'application/pdf',
            metadata: {
              userId: report.userId,
              reportId,
              birthProfileId: report.birthProfileId,
              reportType: report.reportType,
            },
          });
        } catch (uploadErr: any) {
          logger.error({ reportId, err: uploadErr.message }, '[CareerReportWorker] Object storage upload failed');
          await this.failJob(reportId, 'OBJECT_STORAGE_UPLOAD_FAILED', uploadErr.message || 'Object storage upload failed.', claimToken);
          return;
        }

        // Fencing check: verify worker still owns the claim before DB completion and order fulfillment
        if (lostOwnership) {
          logger.warn({ reportId, claimToken }, '[ConsumerReportWorker] Lost ownership before DB completion. Aborting execution.');
          return;
        }

        // --- STAGE 7: COMPLETED (100%) ---
        const pageCount = (report.reportType === 'MARRIAGE_COMPATIBILITY' || report.reportType === 'CAREER_PROSITY') ? 4 : 3;
        const now = new Date();
        const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'];
        const completedRes = await prisma.report.updateMany({
          where: {
            id: reportId,
            status: { in: activeStatuses as any[] },
            metadata: {
              path: ['claimToken'],
              equals: claimToken,
            },
          },
          data: {
            status: 'COMPLETED',
            stage: 'COMPLETED',
            progress: 100,
            s3Url: null,
            storageKey,
            fileName,
            fileSize: uploadResult.fileSize,
            pageCount,
            completedAt: now,
            updatedAt: now,
          } as any,
        });

        if (completedRes.count === 0) {
          logger.warn(
            { reportId, claimToken },
            '[ConsumerReportWorker] Report completion skipped because report is no longer in active state or claimToken mismatch'
          );
          return;
        }

        // Fulfill associated paid order if bound
        if (report.orderId) {
          try {
            await prisma.order.updateMany({
              where: { id: report.orderId },
              data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
            });
            logger.info({ orderId: report.orderId, reportId }, '[ConsumerReportWorker] Order marked FULFILLED');
          } catch (ordErr: any) {
            logger.warn({ orderId: report.orderId, err: ordErr?.message }, '[ConsumerReportWorker] Failed to update order to FULFILLED');
          }
        }

        const durationMs = Date.now() - startTime;
        logger.info(
          { reportId, durationMs, pageCount, fileSize: uploadResult.fileSize, reportType: report.reportType },
          '[CareerReportWorker] Report completed successfully'
        );

        // Async notification dispatch (non-blocking)
        try {
          await notificationService.sendNotification({
            userId: report.userId,
            type: 'REPORT_READY',
            entityId: report.id,
            route: 'OPEN_REPORT',
            templateData: {
              reportName: report.reportType,
              reportId: report.id,
            },
          });
        } catch (notifErr) {
          logger.error({ reportId, notifErr }, '[CareerReportWorker] Failed to dispatch report completion notification');
        }
      }
    } catch (err: any) {
      logger.error({ reportId, err: err?.message || err }, '[CareerReportWorker] Pipeline error occurred');
      await this.failJob(reportId, 'PIPELINE_ERROR', err?.message || 'An unexpected worker error occurred.', claimToken);
    } finally {
      stopHeartbeat();
      await redisQueueService.releaseReportClaim(reportId, claimToken);
      await redisQueueService.completeJob(reportId, claimToken);
    }
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

      const currentMeta = (report.metadata || {}) as Record<string, any>;
      const nextVersion = ((currentMeta.claimVersion as number) || 0) + 1;

      const res = await tx.report.updateMany({
        where: { id: reportId, status: 'FAILED' },
        data: {
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
          errorCode: null,
          errorMessage: null,
          failedAt: null,
          updatedAt: new Date(),
          metadata: {
            ...currentMeta,
            enqueued: false,
            claimToken: null,
            claimVersion: nextVersion,
            recoveryAttempts: 0,
            retriedAt: new Date().toISOString(),
          },
        } as any,
      });

      if (res.count === 0) {
        return { success: false, reason: 'CONCURRENT_RETRY' };
      }

      if (report.orderId) {
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

    // Only enqueue once DB state transition strictly committed!
    const enqueued = await redisQueueService.enqueueJob(reportId);
    if (enqueued) {
      await this.markJobEnqueued(reportId);
    }
    return true;
  }

  /**
   * Directly touches heartbeat timestamp for an active report.
   * If claimToken is provided, respects ownership fencing.
   */
  public async touchHeartbeat(reportId: string, claimToken?: string): Promise<boolean> {
    const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'];
    try {
      const whereClause: any = {
        id: reportId,
        status: { in: activeStatuses as any[] },
      };
      if (claimToken) {
        whereClause.metadata = { path: ['claimToken'], equals: claimToken };
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
    claimToken?: string
  ): Promise<boolean> {
    const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'];
    try {
      const whereClause: any = {
        id: reportId,
        status: { in: activeStatuses as any[] },
      };
      if (claimToken) {
        whereClause.metadata = { path: ['claimToken'], equals: claimToken };
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
      // Atomic conditional CAS: only succeeds if updatedAt has NOT changed since the query!
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

      // Clean up Redis claim now that DB is FAILED
      await redisQueueService.completeJob(reportId).catch(() => {});

      // Update order fulfillmentStatus to FAILED (only if no completed report exists)
      const failedReport = await prisma.report.findUnique({
        where: { id: reportId },
        select: { orderId: true },
      });

      if (failedReport?.orderId) {
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
    claimToken?: string
  ): Promise<boolean> {
    const now = new Date();
    const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING', 'PENDING', 'PROCESSING'];

    try {
      const whereClause: any = {
        id: reportId,
        status: { in: activeStatuses as any[] },
      };
      if (claimToken) {
        whereClause.metadata = { path: ['claimToken'], equals: claimToken };
      }

      const updateResult = await prisma.report.updateMany({
        where: whereClause,
        data: {
          status: 'FAILED',
          stage: 'FAILED',
          progress: 0,
          errorCode,
          errorMessage,
          failedAt: now,
          updatedAt: now,
        } as any,
      });

      if (updateResult.count === 0) {
        logger.warn(
          { reportId, errorCode },
          '[CareerReportWorker] Skipped failJob: report is not in an active state (already COMPLETED or FAILED).'
        );
        return false;
      }

      await redisQueueService.completeJob(reportId, claimToken).catch(() => {});

      logger.warn({ reportId, errorCode, errorMessage }, '[CareerReportWorker] Job marked as FAILED');

      const failedReport = await prisma.report.findUnique({
        where: { id: reportId },
        select: { orderId: true },
      });

      if (failedReport?.orderId) {
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

      return true;
    } catch (dbErr: any) {
      logger.error(
        { reportId, errorCode, errorMessage, dbErr: dbErr?.message },
        '[CareerReportWorker] Critical double-fault: Failed to record FAILED report state to database.'
      );
      return false;
    }
  }
}

export function validateReportPdf(
  pdfBuffer: Buffer,
  pageCount: number,
  textContent: string
): { valid: boolean; reason?: string } {
  if (!pdfBuffer || pdfBuffer.length < 1000) {
    return { valid: false, reason: 'PDF buffer is missing or suspiciously small (<1KB).' };
  }

  const header = pdfBuffer.slice(0, 10).toString('utf-8');
  if (!header.startsWith('%PDF-1.')) {
    return { valid: false, reason: 'PDF binary header validation failed (invalid %PDF header).' };
  }

  const footer = pdfBuffer.slice(Math.max(0, pdfBuffer.length - 200)).toString('utf-8');
  if (!footer.includes('%%EOF')) {
    return { valid: false, reason: 'PDF binary footer validation failed (missing %%EOF marker).' };
  }

  if (pageCount < 1) {
    return { valid: false, reason: 'PDF has invalid page count (less than 1 page).' };
  }

  const forbiddenPlaceholders = [
    'Valued Client',
    'Not supplied',
    'TODO',
    'Lorem ipsum',
    'Personalized interpretation unavailable',
    'undefined',
    'null',
  ];

  for (const placeholder of forbiddenPlaceholders) {
    if (textContent.includes(placeholder)) {
      return { valid: false, reason: `PDF content failed QA: detected unrendered placeholder "${placeholder}".` };
    }
  }

  return { valid: true };
}

export const careerReportWorker = new CareerReportWorker();
