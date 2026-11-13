import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from './prisma.service';
import { ReportStatus, FulfillmentStatus, OrderStatus, FulfillmentUnitStatus } from '@prisma/client';
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
  generateCareerReport,
  generateFinanceReport,
  generateLoveReport,
  generateFortuneReport,
  generateFortunePlusReport,
  generateSaturnReport,
  generateJupiterReport,
  generateRahuKetuReport,
  generateVarshphalReport,
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

import { postgresQueueService, ClaimedReportJob } from './postgres-queue.service';
import { fulfillmentService } from '../modules/fulfillment/fulfillment.service';
import { distributedLockService } from './distributed-lock.service';

export interface ReportJobProgress {
  stage: ReportJobStage;
  progress: number;
  message?: string;
}

export class CareerReportWorker {
  public static readonly SUPPORTED_REPORT_TYPES = [
    'CAREER',
    'KUNDLI',
    'PLANETARY_SUMMARY',
    'CAREER_PROSITY',
    'MARRIAGE_COMPATIBILITY',
    'HOROSCOPE',
    'FINANCE',
    'LOVE',
    'FORTUNE',
    'FORTUNE_PLUS',
    'SATURN',
    'JUPITER_TRANSIT',
    'RAHU_KETU_TRANSIT',
    'VARSHPHAL',
  ] as const;

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

      // In test and debug mode, deliver report as soon as it is ready
      const isTestOrDebug =
        process.env.NODE_ENV !== 'production' ||
        process.env.DEBUG === 'true' ||
        process.env.AUTO_DELIVER_WHEN_READY === 'true';

      if (isTestOrDebug && process.env.NODE_ENV !== 'test') {
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
   * Complete End-to-End Async Pipeline Execution
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
      include: { birthProfile: true, user: true },
    });

    if (!report) {
      logger.error({ reportId }, '[CareerReportWorker] Report record not found');
      return;
    }

    const supportedReportTypes = ['CAREER', 'KUNDLI', 'PLANETARY_SUMMARY', 'CAREER_PROSITY', 'MARRIAGE_COMPATIBILITY', 'HOROSCOPE', 'FINANCE', 'LOVE', 'FORTUNE'];
    if (!supportedReportTypes.includes(report.reportType)) {
      await this.failJob(
        reportId,
        'REPORT_TYPE_NOT_SUPPORTED',
        `Report type ${report.reportType} is not supported. Dedicated generator is not available.`,
        claimToken,
        claimVersion
      );
      return;
    }

    const heartbeatIntervalMs = parseInt(process.env.WORKER_HEARTBEAT_INTERVAL_MS || '20000', 10);
    const claimLeaseTtlSeconds = 60; // 60s lease renewed every 20s
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let isHeartbeating = false;
    let lostOwnership = false;

    const startHeartbeat = () => {
      heartbeatTimer = setInterval(async () => {
        if (isHeartbeating || lostOwnership) return;
        isHeartbeating = true;
        try {
          const alive = await postgresQueueService.touchHeartbeat(
            reportId,
            claimToken!,
            claimVersion!,
            claimLeaseTtlSeconds
          );
          if (!alive) {
            lostOwnership = true;
            logger.warn({ reportId, claimToken, claimVersion }, '[CareerReportWorker] Lost DB ownership during heartbeat touch. Halting execution.');
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
      const ok = await postgresQueueService.updateJobStatus(
        reportId,
        claimToken!,
        claimVersion!,
        status,
        stage,
        progress
      );
      if (!ok) {
        lostOwnership = true;
        logger.warn({ reportId, claimToken, stage }, '[CareerReportWorker] Lost ownership during stage update. Aborting execution.');
        stopHeartbeat();
      }
      return ok;
    };

    try {
      startHeartbeat();

      if (report.reportType === 'CAREER' || report.reportType === 'CAREER_PROSITY') {

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

        let compilationResult: any;
        try {
          compilationResult = await latexCompiler.compileReport({
            reportId,
            reportDataTex,
            careerReportData: pipelineResult.reportData,
            timeoutMs: 180000,
          });
        } catch (compileErr: any) {
          logger.warn({ reportId, err: compileErr.message }, '[CareerReportWorker] LaTeX compilation unavailable or failed; gracefully falling back to vector PDF pipeline');
          try {
            const tier = report.reportType === 'CAREER_PROSITY' ? 'PRO' : 'BASIC';
            const profileInput = {
              name: report.birthProfile.name,
              dateOfBirth: report.birthProfile.dateOfBirth,
              timeOfBirth: report.birthProfile.timeOfBirth,
              placeName: report.birthProfile.placeName,
              timezone: report.birthProfile.timezone,
              latitude: report.birthProfile.latitude,
              longitude: report.birthProfile.longitude,
            };
            const chartResponse = await astrologyService.calculateChartForProfile(report.birthProfileId, { id: report.userId, role: 'USER' });
            const structuredReport = await generateCareerReport(profileInput, chartResponse, new DeterministicInterpretationProvider(), { tier });
            const pdfBuffer = await reportPdfService.generateReportPdf(structuredReport);
            const pageCount = tier === 'PRO' ? 13 : 7;
            compilationResult = {
              pdfBuffer,
              pageCount,
              fileSize: pdfBuffer.length,
            };
          } catch (fallbackErr: any) {
            const cleanMsg = compileErr?.message ? compileErr.message.split('\n')[0] : 'LaTeX PDF compilation failed.';
            await this.failJob(reportId, 'LATEX_COMPILE_FAILED', cleanMsg, claimToken);
            return;
          }
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
        const completedRes = await postgresQueueService.completeJob(
          reportId,
          claimToken!,
          claimVersion!,
          storageKey,
          fileName,
          uploadResult.fileSize,
          compilationResult.pageCount
        );

        if (!completedRes) {
          logger.warn(
            { reportId, claimToken },
            '[CareerReportWorker] Career report completion skipped because report is no longer in active state or claimToken mismatch'
          );
          try {
            await storageService.delete(storageKey);
          } catch (_) {}
          return;
        }

        // Fulfill associated paid order or reconcile fulfillment unit
        if (report.orderId && report.fulfillmentUnitId) {
          try {
            await fulfillmentService.reconcileFulfillmentUnit(report.orderId, report.fulfillmentUnitId);
            logger.info({ orderId: report.orderId, fulfillmentUnitId: report.fulfillmentUnitId, reportId }, '[CareerReportWorker] FulfillmentUnit reconciled');
          } catch (ordErr: any) {
            logger.warn({ orderId: report.orderId, err: ordErr?.message }, '[CareerReportWorker] Failed to reconcile fulfillment unit');
          }
        } else if (report.orderId) {
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
            idempotencyKey: `report_ready:${report.id}`,
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
            } else if ((report.reportType as string) === 'HOROSCOPE' || (report.reportType as string) === 'RASHI_BHAVISHYA') {
              structuredReport = await generateProHoroscopeReport(profileInput, chartResponse, interpretationProvider);
            } else if ((report.reportType as string) === 'CAREER' || (report.reportType as string) === 'CAREER_PROSITY') {
              const tier = (report.reportType as string) === 'CAREER_PROSITY' ? 'PRO' : 'BASIC';
              structuredReport = await generateCareerReport(profileInput, chartResponse, interpretationProvider, { tier });
            } else if ((report.reportType as string) === 'FINANCE') {
              structuredReport = await generateFinanceReport(profileInput, chartResponse, interpretationProvider);
            } else if ((report.reportType as string) === 'LOVE') {
              structuredReport = await generateLoveReport(profileInput, chartResponse, interpretationProvider);
            } else if ((report.reportType as string) === 'FORTUNE') {
              structuredReport = await generateFortuneReport(profileInput, chartResponse, interpretationProvider);
            } else if ((report.reportType as string) === 'FORTUNE_PLUS') {
              structuredReport = await generateFortunePlusReport(profileInput, chartResponse, interpretationProvider);
            } else if ((report.reportType as string) === 'SATURN') {
              structuredReport = await generateSaturnReport(profileInput, {
                zodiacType: 'SIDEREAL',
                ayanamsa: 'LAHIRI',
                houseSystem: 'WHOLE_SIGN',
                nodeCalculation: 'MEAN_NODE',
              }, chartResponse, interpretationProvider);
            } else if ((report.reportType as string) === 'JUPITER_TRANSIT') {
              const referenceDate = metadata.referenceDate || report.createdAt || new Date();
              const referenceDateIso = referenceDate instanceof Date ? referenceDate.toISOString() : new Date(referenceDate).toISOString();
              if (!metadata.referenceDate) {
                metadata.referenceDate = referenceDateIso;
                await prisma.report.update({
                  where: { id: reportId },
                  data: { metadata: { ...metadata, referenceDate: referenceDateIso } },
                });
              }
              structuredReport = await generateJupiterReport(profileInput, {
                zodiacType: 'SIDEREAL',
                ayanamsa: 'LAHIRI',
                houseSystem: 'WHOLE_SIGN',
                nodeCalculation: 'MEAN_NODE',
              }, chartResponse, interpretationProvider, { referenceDate: referenceDateIso });
            } else if ((report.reportType as string) === 'RAHU_KETU_TRANSIT') {
              const referenceDate = metadata.referenceDate || report.createdAt || new Date();
              const referenceDateIso = referenceDate instanceof Date ? referenceDate.toISOString() : new Date(referenceDate).toISOString();
              if (!metadata.referenceDate) {
                metadata.referenceDate = referenceDateIso;
                await prisma.report.update({
                  where: { id: reportId },
                  data: { metadata: { ...metadata, referenceDate: referenceDateIso } },
                });
              }
              structuredReport = await generateRahuKetuReport(profileInput, {
                zodiacType: 'SIDEREAL',
                ayanamsa: 'LAHIRI',
                houseSystem: 'WHOLE_SIGN',
                nodeCalculation: 'MEAN_NODE',
              }, chartResponse, interpretationProvider, { referenceDate: referenceDateIso });
            } else if ((report.reportType as string) === 'VARSHPHAL') {
              const targetYear = metadata.targetYear || metadata.year || (report.createdAt ? new Date(report.createdAt).getFullYear() : new Date().getFullYear());
              if (!metadata.targetYear) {
                metadata.targetYear = targetYear;
                await prisma.report.update({
                  where: { id: reportId },
                  data: { metadata: { ...metadata, targetYear } },
                });
              }
              structuredReport = await generateVarshphalReport(profileInput, {
                zodiacType: 'SIDEREAL',
                ayanamsa: 'LAHIRI',
                houseSystem: 'WHOLE_SIGN',
                nodeCalculation: 'MEAN_NODE',
              }, chartResponse, interpretationProvider, { targetYear });
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
        const pageCount = (report.reportType as string) === 'FORTUNE_PLUS' ? 35 : ((report.reportType as string) === 'FORTUNE' ? 27 : ((report.reportType as string) === 'LOVE' ? 23 : ((report.reportType as string) === 'VARSHPHAL' ? 16 : ((report.reportType as string) === 'FINANCE' ? 12 : ((report.reportType as string) === 'RAHU_KETU_TRANSIT' ? 12 : ((report.reportType as string) === 'JUPITER_TRANSIT' ? 11 : ((report.reportType as string) === 'SATURN' ? 10 : (report.reportType === 'MARRIAGE_COMPATIBILITY' || report.reportType === 'HOROSCOPE') ? 11 : 3)))))));
        const completedRes = await postgresQueueService.completeJob(
          reportId,
          claimToken!,
          claimVersion!,
          storageKey,
          fileName,
          uploadResult.fileSize,
          pageCount
        );

        if (!completedRes) {
          logger.warn(
            { reportId, claimToken },
            '[ConsumerReportWorker] Report completion skipped because report is no longer in active state or claimToken mismatch'
          );
          try {
            await storageService.delete(storageKey);
          } catch (_) {}
          return;
        }

        // Fulfill associated paid order or reconcile fulfillment unit
        if (report.orderId && report.fulfillmentUnitId) {
          try {
            await fulfillmentService.reconcileFulfillmentUnit(report.orderId, report.fulfillmentUnitId);
            logger.info({ orderId: report.orderId, fulfillmentUnitId: report.fulfillmentUnitId, reportId }, '[ConsumerReportWorker] FulfillmentUnit reconciled');
          } catch (ordErr: any) {
            logger.warn({ orderId: report.orderId, err: ordErr?.message }, '[ConsumerReportWorker] Failed to reconcile fulfillment unit');
          }
        } else if (report.orderId) {
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
            idempotencyKey: `report_ready:${report.id}`,
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
      await this.failJob(reportId, 'PIPELINE_ERROR', err?.message || 'An unexpected worker error occurred.', claimToken, claimVersion);
    } finally {
      stopHeartbeat();
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
