import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ReportType, OrderStatus, FulfillmentStatus } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { storageService } from '../../services/storage.service';
import { NotFoundError, ForbiddenError, AuthorizationError, AppError } from '../../errors/app-error';
import { CreateReportInput } from './reports.schemas';
import { astrologyService } from '../astrology/astrology.service';
import { careerReportWorker } from '../../services/report-worker.service';
import { distributedLockService } from '../../services/distributed-lock.service';
import { logger } from '../../utils/logger';
import {
  generateKundliReport,
  generatePlanetaryReport,
  generateProHoroscopeReport,
  generateMatchmakingReport,
  validateAstrologyDataForReport,
  IncompleteAstrologyDataError,
  DeterministicInterpretationProvider,
  StructuredReportModel,
  reportPdfService,
} from '@astro/report-engine';
import { featureAccessService } from '../../services/feature-access.service';

export type UserContext = { id: string; role?: string; [key: string]: any };

export const CURRENT_REPORT_VERSION = '1.0.0';
export const CURRENT_CALCULATION_VERSION = '1.0.0';

export class ReportsService {
  private readonly interpretationProvider = new DeterministicInterpretationProvider();
  private static readonly inflightJobLocks = new Map<string, Promise<any>>();

  private isAdminUser(user: UserContext): boolean {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'SUPPORT';
  }

  private async validateAndClaimOrder(
    orderId: string | undefined,
    user: UserContext,
    reportType: string,
    birthProfileId: string
  ): Promise<{ order?: any }> {
    const REPORT_TYPE_TO_FEATURE: Record<string, string> = {
      KUNDLI: 'KUNDLI_REPORT',
      PLANETARY_SUMMARY: 'PLANETARY_SUMMARY_REPORT',
      CAREER: 'CAREER_REPORT',
      CAREER_PROSITY: 'CAREER_PROSITY',
      MARRIAGE_COMPATIBILITY: 'MARRIAGE_COMPATIBILITY',
      GUPTA_NADI_DOSSIER: 'GUPTA_NADI_DOSSIER',
    };
    const featureKey = REPORT_TYPE_TO_FEATURE[reportType] || reportType;
    const access = await featureAccessService.evaluateFeatureAccess(user.id, featureKey);

    const isManualEntitled = this.isAdminUser(user) || (access.allowed && access.source === 'SUPPORT_ENTITLEMENT_GRANT');

    let order: any = null;

    if (orderId) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, reports: true },
      });

      if (!order) {
        throw new NotFoundError('Order not found');
      }
    } else {
      if (isManualEntitled) {
        return {};
      }
      if (!access.allowed) {
        throw new ForbiddenError(access.reason || 'Payment or entitlement required to access this report');
      }

      order = await prisma.order.findFirst({
        where: {
          userId: user.id,
          status: OrderStatus.PAID,
          reportType: reportType as any,
        },
        include: { items: true, reports: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!order) {
        throw new ForbiddenError(access.reason || 'Payment or entitlement required to access this report');
      }
    }

    if (order.userId !== user.id && !this.isAdminUser(user)) {
      throw new ForbiddenError(access.reason || 'Payment or entitlement required to access this report');
    }

    if (order.status !== OrderStatus.PAID) {
      throw new ForbiddenError(access.reason || 'Payment or entitlement required to access this report');
    }

    let matchesSku = order.reportType === reportType;
    const targetCatalog = `report-${reportType.toLowerCase().replace(/_/g, '-')}`;
    if (order.items?.some((it: any) => it.catalogId === targetCatalog || it.catalogId.includes(reportType.toLowerCase()))) {
      matchesSku = true;
    }
    if (!matchesSku) {
      throw new ForbiddenError(access.reason || 'Payment or entitlement required to access this report');
    }

    // Check if order was already bound to a different birth profile
    const foreignReport = order.reports?.find((r: any) => r.birthProfileId !== birthProfileId);
    if (foreignReport) {
      throw new ForbiddenError('This paid order has already been bound to a different birth profile');
    }

    // Check if order is already completely fulfilled
    if (order.fulfillmentStatus === FulfillmentStatus.FULFILLED) {
      const completedReport = order.reports?.find((r: any) => r.status === 'COMPLETED' && r.birthProfileId === birthProfileId);
      if (completedReport) {
        return { order };
      }
      throw new AppError('This paid order has already been fulfilled', 400, 'ORDER_ALREADY_FULFILLED');
    }

    return { order };
  }

  /**
   * Initiates an async Career Report generation job.
   */
  public async createCareerReportJob(
    input: { birthProfileId: string; forceRegenerate?: boolean; orderId?: string },
    user: UserContext
  ) {
    const concurrencyKey = `${user.id}:${input.birthProfileId}:CAREER`;
    if (!input.forceRegenerate && ReportsService.inflightJobLocks.has(concurrencyKey)) {
      logger.info(
        { userId: user.id, birthProfileId: input.birthProfileId },
        '[CAREER_REPORT_JOB_REQUEST] Concurrent in-flight job detected. Reusing in-flight promise.'
      );
      return await ReportsService.inflightJobLocks.get(concurrencyKey)!;
    }

    const runTask = () =>
      distributedLockService.withDistributedLock(concurrencyKey, async () => {
        return await this.executeCareerReportJob(input, user);
      });

    const jobPromise = runTask();
    if (!input.forceRegenerate) {
      ReportsService.inflightJobLocks.set(concurrencyKey, jobPromise);
    }
    try {
      return await jobPromise;
    } finally {
      ReportsService.inflightJobLocks.delete(concurrencyKey);
    }
  }

  private async executeCareerReportJob(
    input: { birthProfileId: string; forceRegenerate?: boolean; orderId?: string },
    user: UserContext
  ) {
    // 1. Validate birth profile ownership
    const profile = await prisma.birthProfile.findUnique({
      where: { id: input.birthProfileId },
    });

    if (!profile) {
      throw new NotFoundError('Birth profile not found');
    }

    if (profile.userId !== user.id && !this.isAdminUser(user)) {
      throw new ForbiddenError('You do not have access to this birth profile');
    }

    // 2. Validate entitlement / commerce order
    const { order } = await this.validateAndClaimOrder(input.orderId, user, 'CAREER', input.birthProfileId);

    // 3. Check for active (in-progress) report first to prevent double-clicks
    const activeReport = await prisma.report.findFirst({
      where: {
        userId: user.id,
        birthProfileId: input.birthProfileId,
        reportType: ((ReportType as any).CAREER || 'CAREER') as any,
        status: { in: ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'PROCESSING', 'PENDING'] as any[] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeReport && !input.forceRegenerate) {
      const active = activeReport as any;
      logger.info(
        { userId: user.id, reportId: active.id },
        `[CAREER_REPORT_JOB_REQUEST] Active job in progress found for user ${user.id}. Reusing active reportId ${active.id} (status: ${active.status}, progress: ${active.progress}%).`
      );
      
      // Ensure worker queue receives job ID in case process was restarted
      careerReportWorker.enqueueReportJob(active.id);

      return {
        reportId: active.id,
        id: active.id,
        status: active.status,
        stage: active.stage || active.status,
        progress: active.progress ?? 0,
        reused: true,
        active: true,
        message: 'Active report generation in progress.',
      };
    }

    // 4. Duplicate Check: Reuse existing completed report ONLY IF forceRegenerate is false AND birth profile has NOT been modified since report creation
    if (!input.forceRegenerate) {
      const existingReport = await prisma.report.findFirst({
        where: {
          userId: user.id,
          birthProfileId: input.birthProfileId,
          reportType: ((ReportType as any).CAREER || 'CAREER') as any,
          status: 'COMPLETED',
          reportVersion: CURRENT_REPORT_VERSION,
          calculationVersion: CURRENT_CALCULATION_VERSION,
        } as any,
        orderBy: { createdAt: 'desc' },
      });

      if (existingReport && profile.updatedAt <= existingReport.createdAt) {
        if (order && order.fulfillmentStatus !== FulfillmentStatus.FULFILLED) {
          await prisma.order.updateMany({
            where: { id: order.id },
            data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
          });
        }
        logger.info(
          { userId: user.id, reportId: existingReport.id },
          `[CAREER_REPORT_JOB_REQUEST] Reusing completed reportId ${existingReport.id} (profile.updatedAt ${profile.updatedAt.toISOString()} <= report.createdAt ${existingReport.createdAt.toISOString()}).`
        );
        return {
          reportId: existingReport.id,
          id: existingReport.id,
          status: 'COMPLETED',
          stage: 'COMPLETED',
          progress: 100,
          reused: true,
          completed: true,
          message: 'Existing completed career report retrieved.',
        };
      } else if (existingReport) {
        logger.info(
          { userId: user.id, reportId: existingReport.id },
          `[CAREER_REPORT_JOB_REQUEST] Stale report ${existingReport.id} ignored because profile was updated (profile.updatedAt ${profile.updatedAt.toISOString()} > report.createdAt ${existingReport.createdAt.toISOString()}). Generating new report.`
        );
      }
    }

    // 5. Atomic Order Fulfillment Claim (transition UNFULFILLED or FAILED to PROCESSING)
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

    // 6. Create new Report DB Record with QUEUED status
    const reportId = crypto.randomUUID();
    const now = new Date();

    const newReport = await prisma.report.create({
      data: {
        id: reportId,
        userId: user.id,
        birthProfileId: input.birthProfileId,
        orderId: order?.id ?? undefined,
        reportType: ((ReportType as any).CAREER || 'CAREER') as any,
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        reportVersion: CURRENT_REPORT_VERSION,
        calculationVersion: CURRENT_CALCULATION_VERSION,
        metadata: { enqueued: false },
        createdAt: now,
        updatedAt: now,
      } as any,
    });

    logger.info(
      { reportId, userId: user.id, birthProfileId: input.birthProfileId },
      `[CAREER_REPORT_JOB_CREATED] Created new reportId ${reportId} (forceRegenerate: ${!!input.forceRegenerate}).`
    );

    // 7. Enqueue Job in Worker
    careerReportWorker.enqueueReportJob(reportId);

    return {
      reportId: newReport.id,
      id: newReport.id,
      status: 'QUEUED',
      stage: 'QUEUED',
      progress: 0,
      reused: false,
    };
  }

  /**
   * Regenerates a career report by creating a new version.
   */
  public async regenerateCareerReport(
    reportId: string,
    user: UserContext
  ) {
    const existingReport = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      throw new NotFoundError('Report not found');
    }

    if (existingReport.userId !== user.id && !this.isAdminUser(user)) {
      throw new ForbiddenError('You do not have access to this report');
    }

    return this.createCareerReportJob(
      { birthProfileId: existingReport.birthProfileId, forceRegenerate: true },
      user
    );
  }

  /**
   * Status API for polling report progress
   */
  public async getReportStatusOnly(
    reportId: string,
    user: UserContext
  ) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== user.id && !this.isAdminUser(user)) {
      throw new NotFoundError('Report not found');
    }

    const r = report as any;
    return {
      id: r.id,
      status: r.status,
      stage: r.stage || r.status,
      progress: r.progress ?? 0,
      errorCode: r.errorCode ?? null,
      errorMessage: r.errorMessage ?? null,
    };
  }

  /**
   * Full Report details lookup API
   */
  public async getReportStatus(
    reportId: string,
    user: UserContext
  ) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { birthProfile: true },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== user.id && !this.isAdminUser(user)) {
      throw new NotFoundError('Report not found');
    }

    const downloadUrl = `/api/v1/reports/${report.id}/download-file`;
    const r = report as any;

    return {
      id: r.id,
      userId: r.userId,
      birthProfileId: r.birthProfileId,
      reportType: r.reportType,
      status: r.status,
      stage: r.stage || r.status,
      progress: r.progress ?? 0,
      reportVersion: r.reportVersion ?? '1.0.0',
      calculationVersion: r.calculationVersion ?? '1.0.0',
      pageCount: r.pageCount ?? null,
      fileSize: r.fileSize ?? null,
      errorCode: r.errorCode ?? null,
      errorMessage: r.errorMessage ?? null,
      createdAt: r.createdAt,
      completedAt: r.completedAt ?? null,
      downloadUrl: r.status === 'COMPLETED' ? downloadUrl : null,
      birthProfile: r.birthProfile,
    };
  }

  /**
   * Secure access endpoint: Returns a short-lived signed URL for report download
   */
  public async getReportAccessUrl(
    reportId: string,
    user: UserContext
  ): Promise<{ reportId: string; accessUrl: string; expiresAt: string; fileName: string }> {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== user.id && !this.isAdminUser(user)) {
      throw new NotFoundError('Report not found');
    }

    if (report.status !== 'COMPLETED') {
      throw new AppError(
        `Report status is ${report.status}. Download is only available for COMPLETED reports.`,
        400,
        'REPORT_NOT_READY'
      );
    }

    const storageKey = report.storageKey || `reports/${report.userId}/${report.id}.pdf`;
    const expiresInSeconds = 900; // 15 minutes
    const accessUrl = await storageService.getSignedDownloadUrl(storageKey, expiresInSeconds);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const fileName = report.fileName || `career-report-${report.id.substring(0, 8)}.pdf`;

    return {
      reportId: report.id,
      accessUrl,
      expiresAt,
      fileName,
    };
  }

  /**
   * Deletes a report DB record and removes its PDF object from private storage
   */
  public async deleteReport(
    reportId: string,
    user: UserContext
  ): Promise<{ success: boolean; reportId: string }> {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== user.id && !this.isAdminUser(user)) {
      throw new NotFoundError('Report not found');
    }

    // 1. Delete binary from private object storage if key exists
    const storageKey = report.storageKey || `reports/${report.userId}/${report.id}.pdf`;
    try {
      await storageService.delete(storageKey);
    } catch (err: any) {
      console.error(`[REPORT_DELETE] Storage object deletion warning for ${storageKey}: ${err?.message}`);
    }

    // 2. Delete DB record
    await prisma.report.delete({
      where: { id: reportId },
    });

    console.log(`[REPORT_DELETED] Report ${reportId} deleted by user ${user.id} (role: ${user.role}).`);
    return { success: true, reportId };
  }

  public async getUserReports(user: { id: string }) {
    return prisma.report.findMany({
      where: { userId: user.id },
      include: { birthProfile: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * PDF Download API: Returns exact stored buffer for completed report.
   * Never recalculates or regenerates on download.
   */
  public async generateReportPdfBuffer(
    reportId: string,
    user: UserContext
  ): Promise<{ buffer: Buffer; report: any }> {
    const report = await this.getReportStatus(reportId, user);

    if (report.status !== 'COMPLETED') {
      throw new AppError(`Report status is ${report.status}. Download is only available for COMPLETED reports.`, 400, 'REPORT_NOT_READY');
    }

    const rawReport = await prisma.report.findUnique({ where: { id: reportId } });
    if (!rawReport?.storageKey) {
      logger.error(
        { reportId, userId: user.id },
        '[PDF_DOWNLOAD_ALERT] Completed report record has missing storageKey in database'
      );
      throw new AppError('Report PDF file is not available in storage. Please contact support.', 404, 'REPORT_ASSET_NOT_FOUND');
    }

    try {
      const buffer = await storageService.downloadBuffer(rawReport.storageKey);
      if (!buffer || buffer.length === 0) {
        throw new Error('Retrieved storage buffer is empty');
      }
      return { buffer, report };
    } catch (err: any) {
      logger.error(
        { reportId, storageKey: rawReport.storageKey, err: err?.message },
        '[PDF_DOWNLOAD_ALERT] Failed to retrieve stored report artifact from object storage'
      );
      throw new AppError('Report PDF file is not available in storage. Please contact support.', 404, 'REPORT_ASSET_NOT_FOUND');
    }
  }

  /**
   * Report job creator supporting synchronous instant generation and async worker execution
   */
  public async createReportJob(
    input: CreateReportInput,
    user: UserContext
  ) {
    const SUPPORTED_REPORT_TYPES: string[] = [
      'CAREER',
      'KUNDLI',
      'PLANETARY_SUMMARY',
      'CAREER_PROSITY',
      'MARRIAGE_COMPATIBILITY',
    ];

    if (!SUPPORTED_REPORT_TYPES.includes(input.reportType)) {
      throw new AppError(
        `Report type ${input.reportType} is not supported. Dedicated generator is not available.`,
        400,
        'REPORT_TYPE_NOT_SUPPORTED'
      );
    }

    if (input.reportType === ((ReportType as any).CAREER || 'CAREER')) {
      return this.createCareerReportJob(
        { birthProfileId: input.birthProfileId, forceRegenerate: input.forceRegenerate, orderId: input.orderId },
        user
      );
    }

    const concurrencyKey = `${user.id}:${input.birthProfileId}:${input.reportType}:${input.partnerProfileId || ''}`;
    if (!input.forceRegenerate && ReportsService.inflightJobLocks.has(concurrencyKey)) {
      logger.info(
        { userId: user.id, birthProfileId: input.birthProfileId, reportType: input.reportType },
        '[REPORT_JOB_REQUEST] Concurrent in-flight job detected. Reusing in-flight promise.'
      );
      return await ReportsService.inflightJobLocks.get(concurrencyKey)!;
    }

    const runTask = async () => {
      // 1. Critical section under distributed lock (ONLY DB lookups, CAS order claim, and Report record initialization)
      // Releases the distributed lock immediately after DB state is committed!
      const initResult = await distributedLockService.withDistributedLock(concurrencyKey, async () => {
        return await this.initializeReportJob(input, user);
      });

      // If existing active or completed report was reused, return immediately
      if (initResult.reused) {
        return initResult.result;
      }

      // If async mode requested, enqueue in background worker and return immediately
      if (input.async) {
        careerReportWorker.enqueueReportJob(initResult.reportId);
        return {
          reportId: initResult.reportId,
          id: initResult.reportId,
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
          reused: false,
        };
      }

      // 2. Long-running synchronous pipeline OUTSIDE the distributed lock!
      // PDF rendering, calculations, AI providers, and S3 storage upload
      return await this.executeSynchronousReportPipeline(
        initResult.reportId,
        input,
        user,
        initResult.order,
        initResult.profile,
        initResult.partnerProfile
      );
    };

    const jobPromise = runTask();
    if (!input.forceRegenerate) {
      ReportsService.inflightJobLocks.set(concurrencyKey, jobPromise);
    }
    try {
      return await jobPromise;
    } finally {
      ReportsService.inflightJobLocks.delete(concurrencyKey);
    }
  }

  /**
   * Fast lock-protected initialization: Performs checks, CAS order claim, and Report DB record creation.
   * Runs in milliseconds and releases the distributed lock before any long-running tasks.
   */
  private async initializeReportJob(
    input: CreateReportInput,
    user: UserContext
  ): Promise<{
    reused: boolean;
    result?: any;
    reportId: string;
    order?: any;
    profile: any;
    partnerProfile?: any;
  }> {
    // 1. Validate primary birth profile ownership
    const profile = await prisma.birthProfile.findUnique({
      where: { id: input.birthProfileId },
    });

    if (!profile) {
      throw new NotFoundError('Birth profile not found');
    }

    if (profile.userId !== user.id && !this.isAdminUser(user)) {
      throw new ForbiddenError('You do not have access to this birth profile');
    }

    // 2. Validate partner profile if Matchmaking
    let partnerProfile: any = null;
    if (input.reportType === 'MARRIAGE_COMPATIBILITY') {
      if (!input.partnerProfileId) {
        throw new AppError('Partner birth profile is required for marriage compatibility report', 400, 'MISSING_PARTNER_PROFILE');
      }
      if (input.partnerProfileId === input.birthProfileId) {
        throw new AppError('Partner birth profile must be distinct from primary birth profile', 400, 'DUPLICATE_PARTNER_PROFILES');
      }
      partnerProfile = await prisma.birthProfile.findUnique({
        where: { id: input.partnerProfileId },
      });
      if (!partnerProfile) {
        throw new NotFoundError('Partner birth profile not found');
      }
      if (partnerProfile.userId !== user.id && !this.isAdminUser(user)) {
        throw new ForbiddenError('You do not have access to partner birth profile');
      }
    }

    // 3. Entitlement / Commerce verification
    const { order } = await this.validateAndClaimOrder(
      input.orderId,
      user,
      input.reportType,
      input.birthProfileId
    );

    // 4. Deduplication Check 1: Active In-Progress Job Check
    const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'PROCESSING', 'PENDING'];
    const activeWhere: any = {
      userId: user.id,
      birthProfileId: input.birthProfileId,
      reportType: input.reportType as any,
      status: { in: activeStatuses as any[] },
    };
    if (input.partnerProfileId) {
      activeWhere.metadata = {
        path: ['partnerProfileId'],
        equals: input.partnerProfileId,
      };
    }

    const activeReport = await prisma.report.findFirst({
      where: activeWhere,
      orderBy: { createdAt: 'desc' },
    });

    if (activeReport && !input.forceRegenerate) {
      const active = activeReport as any;
      logger.info(
        { userId: user.id, reportId: active.id, reportType: input.reportType },
        '[REPORT_JOB_REQUEST] Active job in progress found. Reusing active report.'
      );
      careerReportWorker.enqueueReportJob(active.id);
      return {
        reused: true,
        reportId: active.id,
        profile,
        partnerProfile,
        result: {
          reportId: active.id,
          id: active.id,
          status: active.status,
          stage: active.stage || active.status,
          progress: active.progress ?? 0,
          reused: true,
          active: true,
          message: 'Active report generation in progress.',
        },
      };
    }

    // 5. Deduplication Check 2: Completed Report Reuse
    if (!input.forceRegenerate) {
      const completedWhere: any = {
        userId: user.id,
        birthProfileId: input.birthProfileId,
        reportType: input.reportType as any,
        status: 'COMPLETED',
        reportVersion: CURRENT_REPORT_VERSION,
        calculationVersion: CURRENT_CALCULATION_VERSION,
      };
      if (input.partnerProfileId) {
        completedWhere.metadata = {
          path: ['partnerProfileId'],
          equals: input.partnerProfileId,
        };
      }

      const existing = await prisma.report.findFirst({
        where: completedWhere,
        orderBy: { createdAt: 'desc' },
      });

      const isProfileFresh = existing && profile.updatedAt <= existing.createdAt;
      const isPartnerFresh = !partnerProfile || (existing && partnerProfile.updatedAt <= existing.createdAt);

      if (existing && isProfileFresh && isPartnerFresh) {
        if (order && order.fulfillmentStatus !== FulfillmentStatus.FULFILLED) {
          await prisma.order.updateMany({
            where: { id: order.id },
            data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
          });
        }
        logger.info(
          { userId: user.id, reportId: existing.id, reportType: input.reportType },
          '[REPORT_JOB_REQUEST] Reusing existing completed report artifact.'
        );
        return {
          reused: true,
          reportId: existing.id,
          profile,
          partnerProfile,
          result: {
            reportId: existing.id,
            id: existing.id,
            userId: existing.userId,
            birthProfileId: existing.birthProfileId,
            reportType: existing.reportType,
            status: existing.status,
            stage: 'COMPLETED',
            progress: 100,
            createdAt: existing.createdAt,
            reused: true,
            completed: true,
            message: 'Existing completed report retrieved.',
          },
        };
      }
    }

    // 6. Atomic Order Fulfillment Claim (transition UNFULFILLED or FAILED to PROCESSING)
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

    // 7. Persist Report DB Record in QUEUED status
    const reportId = crypto.randomUUID();
    const now = new Date();
    await prisma.report.create({
      data: {
        id: reportId,
        userId: user.id,
        birthProfileId: input.birthProfileId,
        orderId: order?.id ?? undefined,
        reportType: input.reportType as any,
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        reportVersion: CURRENT_REPORT_VERSION,
        calculationVersion: CURRENT_CALCULATION_VERSION,
        metadata: {
          enqueued: false,
          ...(input.partnerProfileId ? { partnerProfileId: input.partnerProfileId } : {}),
        },
        createdAt: now,
        updatedAt: now,
      } as any,
    });

    return {
      reused: false,
      reportId,
      order,
      profile,
      partnerProfile,
    };
  }

  /**
   * Executes long-running synchronous report generation pipeline OUTSIDE the distributed lock.
   */
  private async executeSynchronousReportPipeline(
    reportId: string,
    input: CreateReportInput,
    user: UserContext,
    order: any,
    profile: any,
    partnerProfile: any
  ) {
    const now = new Date();

    const profileInput = {
      name: profile.name,
      dateOfBirth: profile.dateOfBirth,
      timeOfBirth: profile.timeOfBirth,
      placeName: profile.placeName,
      timezone: profile.timezone,
      latitude: profile.latitude,
      longitude: profile.longitude,
    };

    let structuredReport: any;
    try {
      if (input.reportType === 'MARRIAGE_COMPATIBILITY') {
        const chart1 = await astrologyService.calculateChartForProfile(input.birthProfileId, user);
        const chart2 = await astrologyService.calculateChartForProfile(input.partnerProfileId!, user);
        validateAstrologyDataForReport(chart1);
        validateAstrologyDataForReport(chart2);

        const profile2Input = {
          name: partnerProfile.name,
          dateOfBirth: partnerProfile.dateOfBirth,
          timeOfBirth: partnerProfile.timeOfBirth,
          placeName: partnerProfile.placeName,
          timezone: partnerProfile.timezone,
          latitude: partnerProfile.latitude,
          longitude: partnerProfile.longitude,
        };
        structuredReport = await generateMatchmakingReport(profileInput, profile2Input, chart1, chart2, this.interpretationProvider);
      } else {
        const chartResponse = await astrologyService.calculateChartForProfile(input.birthProfileId, user);
        validateAstrologyDataForReport(chartResponse);

        if (input.reportType === 'KUNDLI') {
          structuredReport = await generateKundliReport(profileInput, chartResponse, this.interpretationProvider);
        } else if (input.reportType === 'PLANETARY_SUMMARY') {
          structuredReport = await generatePlanetaryReport(profileInput, chartResponse, this.interpretationProvider);
        } else if (input.reportType === 'CAREER_PROSITY') {
          structuredReport = await generateProHoroscopeReport(profileInput, chartResponse, this.interpretationProvider);
        } else {
          throw new AppError(
            `Report type ${input.reportType} is not supported. Dedicated generator is not available.`,
            400,
            'REPORT_TYPE_NOT_SUPPORTED'
          );
        }
      }
    } catch (genErr: any) {
      const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING', 'PENDING', 'PROCESSING'];
      await prisma.report.updateMany({
        where: {
          id: reportId,
          status: { in: activeStatuses as any[] },
        },
        data: {
          status: 'FAILED',
          stage: 'FAILED',
          progress: 0,
          errorCode: genErr?.code || 'GENERATION_FAILED',
          errorMessage: genErr?.message || 'Failed during report generation',
          failedAt: now,
          updatedAt: now,
        } as any,
      });
      if (order?.id) {
        try {
          await prisma.order.updateMany({
            where: { id: order.id, fulfillmentStatus: FulfillmentStatus.PROCESSING },
            data: { fulfillmentStatus: FulfillmentStatus.FAILED },
          });
        } catch (_) {}
      }
      throw genErr;
    }

    // Render & upload PDF to private storage
    const pdfBuffer = await reportPdfService.generateReportPdf(structuredReport);
    const storageKey = `reports/${user.id}/${reportId}.pdf`;
    const prefix = input.reportType.toLowerCase().replace(/_/g, '-');
    const fileName = `${prefix}-${profile.name.toLowerCase().replace(/\s+/g, '-')}-${reportId.substring(0, 8)}.pdf`;

    let fileSize = pdfBuffer.length;
    try {
      const uploadRes = await storageService.upload({
        key: storageKey,
        body: pdfBuffer,
        contentType: 'application/pdf',
        metadata: {
          userId: user.id,
          reportId,
          birthProfileId: input.birthProfileId,
          reportType: input.reportType,
        },
      });
      fileSize = uploadRes.fileSize;
    } catch (uploadErr: any) {
      logger.error(
        { reportId, userId: user.id, err: uploadErr?.message },
        '[REPORT_CREATE] Storage upload critical failure. Report cannot be marked COMPLETED.'
      );
      try {
        const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING', 'PENDING', 'PROCESSING'];
        await prisma.report.updateMany({
          where: {
            id: reportId,
            status: { in: activeStatuses as any[] },
          },
          data: {
            status: 'FAILED',
            stage: 'FAILED',
            progress: 0,
            errorCode: 'STORAGE_UPLOAD_FAILED',
            errorMessage: uploadErr?.message || 'Failed to persist report artifact to storage',
            storageKey,
            fileName,
            fileSize: 0,
            pageCount: 0,
            updatedAt: now,
            failedAt: now,
          } as any,
        });
      } catch (dbErr: any) {
        logger.error(
          { reportId, userId: user.id, uploadErr: uploadErr?.message, dbErr: dbErr?.message },
          '[REPORT_CREATE] Critical double-fault: Failed to record FAILED report state to database after storage upload failure.'
        );
      }
      if (order?.id) {
        try {
          await prisma.order.updateMany({
            where: { id: order.id, fulfillmentStatus: FulfillmentStatus.PROCESSING },
            data: { fulfillmentStatus: FulfillmentStatus.FAILED },
          });
        } catch (_) {}
      }
      throw new AppError(`Failed to persist report artifact to storage: ${uploadErr?.message || 'unknown storage error'}`, 500, 'STORAGE_UPLOAD_FAILED');
    }

    const pageCount = (input.reportType === 'MARRIAGE_COMPATIBILITY' || input.reportType === 'CAREER_PROSITY') ? 4 : 3;

    const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING', 'PENDING', 'PROCESSING'];
    const compRes = await prisma.report.updateMany({
      where: {
        id: reportId,
        status: { in: activeStatuses as any[] },
      },
      data: {
        status: 'COMPLETED',
        stage: 'COMPLETED',
        progress: 100,
        storageKey,
        fileName,
        fileSize,
        pageCount,
        updatedAt: now,
        completedAt: now,
      } as any,
    });

    if (compRes.count > 0 && order?.id) {
      try {
        await prisma.order.updateMany({
          where: { id: order.id },
          data: { fulfillmentStatus: FulfillmentStatus.FULFILLED },
        });
      } catch (_) {}
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    return {
      id: report?.id ?? reportId,
      userId: user.id,
      birthProfileId: input.birthProfileId,
      reportType: input.reportType,
      status: 'COMPLETED',
      report: structuredReport,
      createdAt: report?.createdAt ?? new Date(),
    };
  }
}

export const reportsService = new ReportsService();
