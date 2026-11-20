import crypto from 'crypto';
import { ReportType, OrderStatus, FulfillmentStatus, ObligationType, OrderItemType } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { storageService } from '../../services/storage.service';
import { NotFoundError, ForbiddenError, AuthorizationError, AppError } from '../../errors/app-error';
import { CreateReportInput } from './reports.schemas';
import { careerReportWorker } from '../../services/report-worker.service';
import { distributedLockService } from '../../services/distributed-lock.service';
import { fulfillmentService } from '../fulfillment/fulfillment.service';
import { notificationService } from '../notifications/notification.service';
import { logger } from '../../utils/logger';
import { isPlatformReportType } from '../../services/platform-report.runner';
import { featureAccessService } from '../../services/feature-access.service';

export type UserContext = { id: string; role?: string; [key: string]: any };

export const CURRENT_REPORT_VERSION = '1.0.0';
/**
 * Calculation method version stored on every report. 2.0.0 = astrology engine 0.2.0 (ADR-017:
 * true Chitrapaksha Lahiri ayanamsa, Meeus mean node, true Placidus KP cusps, real-MC Sripati
 * bhava chalit). Completed reports are only reused when their calculationVersion matches, so
 * reports made with 1.0.0 (linear Lahiri approximation) are regenerated on the next request and
 * keep their '1.0.0' label.
 */
export const CURRENT_CALCULATION_VERSION = '2.0.0';

/**
 * Short display line for the generation screen ("Writing section 23 of 60"),
 * written by the worker during the LLM phase. Shown only while that phase is
 * running, so a value left over from an earlier attempt never appears.
 */
export function reportProgressDetail(report: { status?: string | null; stage?: string | null; metadata?: unknown }): string | null {
  if (report.status !== 'ANALYZING' || (report.stage && report.stage !== 'ANALYZING')) return null;
  const meta = report.metadata;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const detail = (meta as Record<string, unknown>).progressDetail;
  return typeof detail === 'string' && detail.length > 0 ? detail.slice(0, 120) : null;
}

export class ReportsService {
  private static readonly inflightJobLocks = new Map<string, Promise<any>>();

  private isAdminUser(user: UserContext): boolean {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'SUPPORT';
  }

  private async validateAndClaimOrder(
    orderId: string | undefined,
    user: UserContext,
    reportType: string,
    birthProfileId: string,
    partnerProfileId?: string
  ): Promise<{ order?: any; targetOrderItem?: any; targetFulfillmentUnit?: any; existingReport?: any }> {
    const REPORT_TYPE_TO_FEATURE: Record<string, string> = {
      KUNDLI: 'KUNDLI_REPORT',
      PLANETARY_SUMMARY: 'PLANETARY_SUMMARY_REPORT',
      CAREER: 'CAREER_REPORT',
      CAREER_PROSITY: 'CAREER_PROSITY',
      MARRIAGE_COMPATIBILITY: 'MARRIAGE_COMPATIBILITY',
      GUPTA_NADI_DOSSIER: 'GUPTA_NADI_DOSSIER',
      HOROSCOPE: 'HOROSCOPE_REPORT',
      FINANCE: 'FINANCE_REPORT',
      LOVE: 'LOVE_REPORT',
      FORTUNE: 'FORTUNE_REPORT',
      FORTUNE_PLUS: 'FORTUNE_PLUS_REPORT',
      SATURN: 'SATURN_REPORT',
      JUPITER_TRANSIT: 'JUPITER_TRANSIT_REPORT',
      RAHU_KETU_TRANSIT: 'RAHU_KETU_TRANSIT_REPORT',
      VARSHPHAL: 'VARSHPHAL_REPORT',
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

    let targetItem = order.items?.find((it: any) => {
      if (reportType === 'CAREER_PROSITY' && it.catalogId === 'report-career-pro') return true;
      if (reportType === 'HOROSCOPE' && (it.catalogId === 'report-horoscope' || it.catalogId === 'report-personalised-horoscope')) return true;
      if (reportType === 'FINANCE' && it.catalogId === 'report-finance') return true;
      if (reportType === 'LOVE' && it.catalogId === 'report-love') return true;
      if (reportType === 'FORTUNE' && it.catalogId === 'report-fortune') return true;
      if (reportType === 'FORTUNE_PLUS' && it.catalogId === 'report-fortune-plus') return true;
      if (reportType === 'SATURN' && it.catalogId === 'report-saturn') return true;
      if (reportType === 'JUPITER_TRANSIT' && it.catalogId === 'report-jupiter-transit') return true;
      if (reportType === 'RAHU_KETU_TRANSIT' && it.catalogId === 'report-rahu-ketu-transit') return true;
      if (reportType === 'VARSHPHAL' && it.catalogId === 'report-varshphal') return true;
      const targetCatalog = `report-${reportType.toLowerCase().replace(/_/g, '-')}`;
      return it.itemType === OrderItemType.REPORT && (it.catalogId === targetCatalog || it.catalogId.includes(reportType.toLowerCase()));
    });

    if (!targetItem && order.reportType === reportType && order.items?.length > 0) {
      targetItem = order.items[0];
    }

    if (!targetItem && order.reportType !== reportType) {
      throw new ForbiddenError(access.reason || 'Payment or entitlement required to access this report');
    }

    // Ensure fulfillment units exist for this order
    let units = await prisma.fulfillmentUnit.findMany({
      where: {
        orderId: order.id,
        obligationType: ObligationType.REPORT,
        ...(targetItem ? { orderItemId: targetItem.id } : {}),
      },
      include: { report: true },
      orderBy: { unitIndex: 'asc' },
    });

    if (!units.length) {
      units = (await fulfillmentService.createFulfillmentUnitsForOrder(order.id)) as any;
      units = units.filter((u: any) => u.obligationType === ObligationType.REPORT && (!targetItem || u.orderItemId === targetItem.id));
    }

    // Look for unit already bound to a report for this birth profile
    const existingUnitForProfile = units.find((u: any) => {
      if (!u.report) return false;
      if (u.report.birthProfileId !== birthProfileId) return false;
      if (partnerProfileId) {
        const meta = (u.report.metadata || {}) as Record<string, any>;
        return meta.partnerProfileId === partnerProfileId;
      }
      return true;
    });

    if (existingUnitForProfile) {
      return {
        order,
        targetOrderItem: targetItem,
        targetFulfillmentUnit: existingUnitForProfile,
        existingReport: existingUnitForProfile.report,
      };
    }

    // Look for first unassigned fulfillment unit
    const availableUnit = units.find((u: any) => !u.report);
    if (!availableUnit) {
      const completedReport = order.reports?.find((r: any) => r.status === 'COMPLETED' && r.birthProfileId === birthProfileId);
      if (completedReport) {
        return { order, targetOrderItem: targetItem, existingReport: completedReport };
      }
      throw new AppError('All report slots for this order have already been utilized', 400, 'ORDER_ALREADY_FULFILLED');
    }

    return {
      order,
      targetOrderItem: targetItem,
      targetFulfillmentUnit: availableUnit,
    };
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

    // 2. Validate entitlement / commerce order and claim fulfillment unit
    const { order, targetFulfillmentUnit, existingReport: boundReport } =
      await this.validateAndClaimOrder(input.orderId, user, 'CAREER', input.birthProfileId);

    // 3. Check for active (in-progress) report first to prevent double-clicks
    const activeReport = boundReport && ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'PROCESSING', 'PENDING'].includes(boundReport.status)
      ? boundReport
      : await prisma.report.findFirst({
          where: {
            userId: user.id,
            birthProfileId: input.birthProfileId,
            ...(order ? { orderId: order.id } : {}),
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
      const existingReport = boundReport && boundReport.status === 'COMPLETED'
        ? boundReport
        : await prisma.report.findFirst({
            where: {
              userId: user.id,
              birthProfileId: input.birthProfileId,
              ...(order ? { orderId: order.id } : {}),
              reportType: ((ReportType as any).CAREER || 'CAREER') as any,
              status: 'COMPLETED',
              reportVersion: CURRENT_REPORT_VERSION,
              calculationVersion: CURRENT_CALCULATION_VERSION,
            } as any,
            orderBy: { createdAt: 'desc' },
          });

      if (existingReport && profile.updatedAt <= existingReport.createdAt) {
        if (order && targetFulfillmentUnit) {
          await fulfillmentService.reconcileFulfillmentUnit(order.id, targetFulfillmentUnit.id);
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
      }
    } else if (boundReport) {
      // Regeneration of existing bound report: re-queue existing record to preserve fulfillment unit & SLA deadline
      const reportId = boundReport.id;
      const now = new Date();
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
          errorCode: null,
          errorMessage: null,
          storageKey: null,
          fileName: null,
          fileSize: null,
          completedAt: null,
          failedAt: null,
          claimToken: null,
          claimExpiresAt: null,
          claimVersion: { increment: 1 },
          retryAfter: null,
          generationFailures: 0,
          lastAttemptErrorCode: null,
          lastAttemptErrorMessage: null,
          updatedAt: now,
        } as any,
      });

      logger.info(
        { reportId, userId: user.id, birthProfileId: input.birthProfileId },
        `[CAREER_REPORT_JOB_REGEN] Re-queued existing reportId ${reportId} for regeneration.`
      );

      if (order && targetFulfillmentUnit) {
        await fulfillmentService.reconcileFulfillmentUnit(order.id, targetFulfillmentUnit.id);
      }

      careerReportWorker.enqueueReportJob(reportId);

      return {
        reportId,
        id: reportId,
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        reused: false,
        message: 'Career report regeneration initiated.',
      };
    }

    // 5. Calculate authoritative 24-hour delivery SLA anchor from persisted Order.paidAt
    const expectedDeliveryAt = order?.paidAt
      ? new Date(order.paidAt.getTime() + 24 * 60 * 60 * 1000)
      : (boundReport?.expectedDeliveryAt ?? null);

    const reportId = crypto.randomUUID();
    const now = new Date();

    const newReport = await prisma.report.create({
      data: {
        id: reportId,
        userId: user.id,
        birthProfileId: input.birthProfileId,
        orderId: order?.id ?? undefined,
        fulfillmentUnitId: targetFulfillmentUnit?.id ?? undefined,
        reportType: ((ReportType as any).CAREER || 'CAREER') as any,
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        expectedDeliveryAt,
        reportVersion: CURRENT_REPORT_VERSION,
        calculationVersion: CURRENT_CALCULATION_VERSION,
        metadata: { enqueued: false },
        createdAt: now,
        updatedAt: now,
      } as any,
    });

    logger.info(
      { reportId, userId: user.id, birthProfileId: input.birthProfileId, fulfillmentUnitId: targetFulfillmentUnit?.id, expectedDeliveryAt },
      `[CAREER_REPORT_JOB_CREATED] Created new reportId ${reportId} (forceRegenerate: ${!!input.forceRegenerate}).`
    );

    // Non-blocking notification dispatch for job start
    try {
      await notificationService.sendNotification({
        userId: user.id,
        type: 'REPORT_STARTED',
        entityId: reportId,
        idempotencyKey: `report_started:${reportId}`,
        route: 'OPEN_REPORT',
        templateData: {
          reportName: 'Career Intelligence Report',
          reportId,
        },
      });
    } catch (_) {}

    // 6. Reconcile fulfillment unit immediately
    if (order && targetFulfillmentUnit) {
      await fulfillmentService.reconcileFulfillmentUnit(order.id, targetFulfillmentUnit.id);
    }

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
      {
        birthProfileId: existingReport.birthProfileId,
        forceRegenerate: true,
        orderId: existingReport.orderId || undefined,
      },
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
      include: { order: true },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== user.id && !this.isAdminUser(user)) {
      throw new NotFoundError('Report not found');
    }

    if (report.order && (report.order.status === OrderStatus.REFUNDED || report.order.status === OrderStatus.CANCELLED) && !this.isAdminUser(user)) {
      throw new NotFoundError('Report not found');
    }

    const r = report as any;
    const isCompleted = r.status === 'COMPLETED';
    const isFailed = r.status === 'FAILED';
    const expectedDeliveryAt = r.expectedDeliveryAt || (r.order?.paidAt ? new Date(r.order.paidAt.getTime() + 24 * 60 * 60 * 1000) : null);
    const now = new Date();
    const isOverdue = Boolean(expectedDeliveryAt && !isCompleted && now > expectedDeliveryAt);
    const isOnSchedule = !isCompleted && !isFailed && !isOverdue;
    const isReady = isCompleted;
    // A report waiting for a scheduled retry is QUEUED and simply still being prepared.
    const isPreparing = !isCompleted && !isFailed;
    const paymentStatus = r.order?.paymentStatus ?? (r.orderId ? 'CAPTURED' : 'UNPAID');

    return {
      id: r.id,
      status: r.status,
      stage: r.stage || r.status,
      progress: r.progress ?? 0,
      progressDetail: reportProgressDetail(r),
      errorCode: isFailed ? r.errorCode ?? null : null,
      errorMessage: isFailed ? r.errorMessage ?? null : null,
      expectedDeliveryAt,
      paymentStatus,
      isOnSchedule,
      isOverdue,
      isFailed,
      isReady,
      isPreparing,
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
      include: { birthProfile: true, order: true },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== user.id && !this.isAdminUser(user)) {
      throw new NotFoundError('Report not found');
    }

    if (report.order && (report.order.status === OrderStatus.REFUNDED || report.order.status === OrderStatus.CANCELLED) && !this.isAdminUser(user)) {
      throw new NotFoundError('Report not found');
    }

    const downloadUrl = `/api/v1/reports/${report.id}/download-file`;
    const r = report as any;
    const isCompleted = r.status === 'COMPLETED';
    const isFailed = r.status === 'FAILED';
    const expectedDeliveryAt = r.expectedDeliveryAt || (r.order?.paidAt ? new Date(r.order.paidAt.getTime() + 24 * 60 * 60 * 1000) : null);
    const now = new Date();
    const isOverdue = Boolean(expectedDeliveryAt && !isCompleted && now > expectedDeliveryAt);
    const isOnSchedule = !isCompleted && !isFailed && !isOverdue;
    const isReady = isCompleted;
    // A report waiting for a scheduled retry is QUEUED and simply still being prepared.
    const isPreparing = !isCompleted && !isFailed;
    const paymentStatus = r.order?.paymentStatus ?? (r.orderId ? 'CAPTURED' : 'UNPAID');

    return {
      id: r.id,
      userId: r.userId,
      orderId: r.orderId ?? null,
      birthProfileId: r.birthProfileId,
      reportType: r.reportType,
      status: r.status,
      stage: r.stage || r.status,
      progress: r.progress ?? 0,
      reportVersion: r.reportVersion ?? '1.0.0',
      calculationVersion: r.calculationVersion ?? '1.0.0',
      pageCount: r.pageCount ?? null,
      fileSize: r.fileSize ?? null,
      errorCode: isFailed ? r.errorCode ?? null : null,
      errorMessage: isFailed ? r.errorMessage ?? null : null,
      createdAt: r.createdAt,
      completedAt: r.completedAt ?? null,
      expectedDeliveryAt,
      paymentStatus,
      isOnSchedule,
      isOverdue,
      isFailed,
      isReady,
      isPreparing,
      downloadUrl: isReady ? downloadUrl : null,
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
      include: { order: true },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== user.id && !this.isAdminUser(user)) {
      throw new NotFoundError('Report not found');
    }

    if (report.order && (report.order.status === OrderStatus.REFUNDED || report.order.status === OrderStatus.CANCELLED) && !this.isAdminUser(user)) {
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
      include: { order: true },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== user.id && !this.isAdminUser(user)) {
      throw new NotFoundError('Report not found');
    }

    if (report.order && (report.order.status === OrderStatus.REFUNDED || report.order.status === OrderStatus.CANCELLED) && !this.isAdminUser(user)) {
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
    const reports = await prisma.report.findMany({
      where: { userId: user.id },
      include: { birthProfile: true, order: true },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    return reports.map((r: any) => {
      const isCompleted = r.status === 'COMPLETED';
      const isFailed = r.status === 'FAILED';
      const expectedDeliveryAt = r.expectedDeliveryAt || (r.order?.paidAt ? new Date(r.order.paidAt.getTime() + 24 * 60 * 60 * 1000) : null);
      const isOverdue = Boolean(expectedDeliveryAt && !isCompleted && now > expectedDeliveryAt);
      const isOnSchedule = !isCompleted && !isFailed && !isOverdue;
      const isReady = isCompleted;
      const isPreparing = !isCompleted && !isFailed;
      const paymentStatus = r.order?.paymentStatus ?? (r.orderId ? 'CAPTURED' : 'UNPAID');

      const metadata = r.metadata && typeof r.metadata === 'object' ? { ...r.metadata, platformManifest: undefined } : r.metadata;
      return {
        ...r,
        metadata,
        errorCode: isFailed ? r.errorCode ?? null : null,
        errorMessage: isFailed ? r.errorMessage ?? null : null,
        expectedDeliveryAt,
        paymentStatus,
        isOnSchedule,
        isOverdue,
        isFailed,
        isReady,
        isPreparing,
        claimToken: undefined,
        claimExpiresAt: undefined,
        claimVersion: undefined,
        // Internal retry bookkeeping is never shown to customers.
        retryAfter: undefined,
        generationFailures: undefined,
        lastAttemptAt: undefined,
        lastAttemptErrorCode: undefined,
        lastAttemptErrorMessage: undefined,
      };
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
    // Only report types with a genuine generator (a registered platform module) can be generated.
    // CHILDBIRTH_FAMILY and GUPTA_NADI_DOSSIER have none and are rejected; nothing is substituted.
    if (!isPlatformReportType(input.reportType)) {
      throw new AppError(
        `The ${input.reportType} report is not available. It cannot be generated because no genuine generator exists for it.`,
        400,
        'REPORT_TYPE_NOT_AVAILABLE'
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

      // 2. Generation always runs in the report worker through the universal platform
      // (there is no synchronous in-request generation). `async` is accepted for
      // backward compatibility and has no effect.
      careerReportWorker.enqueueReportJob(initResult.reportId);
      return {
        reportId: initResult.reportId,
        id: initResult.reportId,
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        reused: false,
      };
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
    const { order, targetFulfillmentUnit, existingReport: boundReport } = await this.validateAndClaimOrder(
      input.orderId,
      user,
      input.reportType,
      input.birthProfileId,
      input.partnerProfileId
    );

    // 4. Deduplication Check 1: Active In-Progress Job Check
    const activeReport = boundReport && ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'PROCESSING', 'PENDING'].includes(boundReport.status)
      ? boundReport
      : await prisma.report.findFirst({
          where: {
            userId: user.id,
            birthProfileId: input.birthProfileId,
            ...(order ? { orderId: order.id } : {}),
            reportType: input.reportType as any,
            status: { in: ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'PROCESSING', 'PENDING'] as any[] },
            ...(input.partnerProfileId ? { metadata: { path: ['partnerProfileId'], equals: input.partnerProfileId } } : {}),
          },
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
      const existing = boundReport && boundReport.status === 'COMPLETED'
        ? boundReport
        : await prisma.report.findFirst({
            where: {
              userId: user.id,
              birthProfileId: input.birthProfileId,
              ...(order ? { orderId: order.id } : {}),
              reportType: input.reportType as any,
              status: 'COMPLETED',
              reportVersion: CURRENT_REPORT_VERSION,
              calculationVersion: CURRENT_CALCULATION_VERSION,
              ...(input.partnerProfileId ? { metadata: { path: ['partnerProfileId'], equals: input.partnerProfileId } } : {}),
            },
            orderBy: { createdAt: 'desc' },
          });

      const isProfileFresh = existing && profile.updatedAt <= existing.createdAt;
      const isPartnerFresh = !partnerProfile || (existing && partnerProfile.updatedAt <= existing.createdAt);

      if (existing && isProfileFresh && isPartnerFresh) {
        if (order && targetFulfillmentUnit) {
          await fulfillmentService.reconcileFulfillmentUnit(order.id, targetFulfillmentUnit.id);
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
    } else if (boundReport) {
      // Regeneration of existing bound report: re-queue existing record
      const reportId = boundReport.id;
      const now = new Date();
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
          errorCode: null,
          errorMessage: null,
          storageKey: null,
          fileName: null,
          fileSize: null,
          completedAt: null,
          failedAt: null,
          claimToken: null,
          claimExpiresAt: null,
          claimVersion: { increment: 1 },
          retryAfter: null,
          generationFailures: 0,
          lastAttemptErrorCode: null,
          lastAttemptErrorMessage: null,
          updatedAt: now,
        } as any,
      });

      if (order && targetFulfillmentUnit) {
        await fulfillmentService.reconcileFulfillmentUnit(order.id, targetFulfillmentUnit.id);
      }

      return {
        reused: false,
        reportId,
        order,
        profile,
        partnerProfile,
      };
    }

    // 6. Calculate authoritative 24-hour delivery SLA anchor from persisted Order.paidAt
    const expectedDeliveryAt = order?.paidAt
      ? new Date(order.paidAt.getTime() + 24 * 60 * 60 * 1000)
      : (boundReport?.expectedDeliveryAt ?? null);

    const reportId = crypto.randomUUID();
    const now = new Date();
    await prisma.report.create({
      data: {
        id: reportId,
        userId: user.id,
        birthProfileId: input.birthProfileId,
        orderId: order?.id ?? undefined,
        fulfillmentUnitId: targetFulfillmentUnit?.id ?? undefined,
        reportType: input.reportType as any,
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        expectedDeliveryAt,
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

    // Non-blocking notification dispatch for job start
    try {
      await notificationService.sendNotification({
        userId: user.id,
        type: 'REPORT_STARTED',
        entityId: reportId,
        idempotencyKey: `report_started:${reportId}`,
        route: 'OPEN_REPORT',
        templateData: {
          reportName: input.reportType,
          reportId,
        },
      });
    } catch (_) {}

    if (order && targetFulfillmentUnit) {
      await fulfillmentService.reconcileFulfillmentUnit(order.id, targetFulfillmentUnit.id);
    }

    return {
      reused: false,
      reportId,
      order,
      profile,
      partnerProfile,
    };
  }
}

export const reportsService = new ReportsService();
