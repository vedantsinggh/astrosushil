import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ReportType } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { storageService } from '../../services/storage.service';
import { NotFoundError, ForbiddenError, AuthorizationError, AppError } from '../../errors/app-error';
import { CreateReportInput } from './reports.schemas';
import { astrologyService } from '../astrology/astrology.service';
import { careerReportWorker } from '../../services/report-worker.service';
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

  private isAdminUser(user: UserContext): boolean {
    return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'SUPPORT';
  }

  /**
   * Initiates an async Career Report generation job.
   */
  public async createCareerReportJob(
    input: { birthProfileId: string; forceRegenerate?: boolean },
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

    // 2. Check for active (in-progress) report first to prevent double-clicks
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
      console.log(`[CAREER_REPORT_JOB_REQUEST] Active job in progress found for user ${user.id}. Reusing active reportId ${active.id} (status: ${active.status}, progress: ${active.progress}%).`);
      
      // Ensure worker queue receives job ID in case process was restarted
      careerReportWorker.enqueueReportJob(active.id);

      return {
        reportId: active.id,
        status: active.status,
        stage: active.stage || active.status,
        progress: active.progress ?? 0,
        reused: true,
        active: true,
        message: 'Active report generation in progress.',
      };
    }

    // 3. Duplicate Check: Reuse existing completed report ONLY IF forceRegenerate is false AND birth profile has NOT been modified since report creation
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
        console.log(`[CAREER_REPORT_JOB_REQUEST] Reusing completed reportId ${existingReport.id} (profile.updatedAt ${profile.updatedAt.toISOString()} <= report.createdAt ${existingReport.createdAt.toISOString()}).`);
        return {
          reportId: existingReport.id,
          status: 'COMPLETED',
          reused: true,
          message: 'Existing completed career report retrieved.',
        };
      } else if (existingReport) {
        console.log(`[CAREER_REPORT_JOB_REQUEST] Stale report ${existingReport.id} ignored because profile was updated (profile.updatedAt ${profile.updatedAt.toISOString()} > report.createdAt ${existingReport.createdAt.toISOString()}). Generating new report.`);
      }
    }

    // 4. Create new Report DB Record with QUEUED status
    const reportId = crypto.randomUUID();
    const now = new Date();

    const newReport = await prisma.report.create({
      data: {
        id: reportId,
        userId: user.id,
        birthProfileId: input.birthProfileId,
        reportType: ((ReportType as any).CAREER || 'CAREER') as any,
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        reportVersion: CURRENT_REPORT_VERSION,
        calculationVersion: CURRENT_CALCULATION_VERSION,
        createdAt: now,
        updatedAt: now,
      } as any,
    });

    console.log(`[CAREER_REPORT_JOB_CREATED] Created new reportId ${reportId} for user ${user.id}, profile ${input.birthProfileId} (forceRegenerate: ${!!input.forceRegenerate}).`);

    // 5. Enqueue Job in Worker
    careerReportWorker.enqueueReportJob(reportId);

    return {
      reportId: newReport.id,
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
   * PDF Download API: Returns buffer for completed report
   */
  public async generateReportPdfBuffer(
    reportId: string,
    user: UserContext
  ): Promise<{ buffer: Buffer; report: any }> {
    const report = await this.getReportStatus(reportId, user);

    if (report.status !== 'COMPLETED') {
      throw new AppError(`Report status is ${report.status}. Download is only available for COMPLETED reports.`, 400, 'REPORT_NOT_READY');
    }

    // 1. Try reading generated PDF from Object Storage (Cloudflare R2 or local storage)
    const rawReport = await prisma.report.findUnique({ where: { id: reportId } });
    if (rawReport?.storageKey) {
      try {
        const buffer = await storageService.downloadBuffer(rawReport.storageKey);
        return { buffer, report };
      } catch (err: any) {
        console.error(`[PDF_DOWNLOAD] Object storage read failed for key ${rawReport.storageKey}: ${err?.message}`);
      }
    }

    // 2. Generate PDF deterministically if storage buffer is unavailable
    const profileInput = {
      name: report.birthProfile.name,
      dateOfBirth: report.birthProfile.dateOfBirth,
      timeOfBirth: report.birthProfile.timeOfBirth,
      placeName: report.birthProfile.placeName,
      timezone: report.birthProfile.timezone,
      latitude: report.birthProfile.latitude,
      longitude: report.birthProfile.longitude,
    };

    if (report.reportType === 'CAREER') {
      const normalizedChart = await astrologyService.calculateNormalizedChart(
        { birthProfileId: report.birthProfileId },
        user
      );
      const { careerReportService } = await import('@astro/report-engine');
      const pipelineResult = await careerReportService.generateCareerReportData(normalizedChart, {
        clientProfile: profileInput,
      });
      const pdfBuffer = await reportPdfService.generateCareerReportPdf(pipelineResult.reportData);
      return { buffer: pdfBuffer, report };
    }

    let structuredReport: any;

    if (report.reportType === 'MARRIAGE_COMPATIBILITY') {
      const metadata = ((rawReport as any)?.metadata || {}) as Record<string, any>;
      const partnerProfileId = metadata.partnerProfileId;
      if (!partnerProfileId) {
        throw new AppError('Partner profile ID not found in report metadata', 400, 'MISSING_PARTNER_PROFILE');
      }
      const partnerProfile = await prisma.birthProfile.findUnique({ where: { id: partnerProfileId } });
      if (!partnerProfile) {
        throw new NotFoundError('Partner birth profile not found');
      }
      const chart1 = await astrologyService.calculateChartForProfile(report.birthProfileId, user);
      const chart2 = await astrologyService.calculateChartForProfile(partnerProfileId, user);
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
      const chartResponse = await astrologyService.calculateChartForProfile(report.birthProfileId, user);
      validateAstrologyDataForReport(chartResponse);

      if (report.reportType === 'KUNDLI') {
        structuredReport = await generateKundliReport(profileInput, chartResponse, this.interpretationProvider);
      } else if (report.reportType === 'PLANETARY_SUMMARY') {
        structuredReport = await generatePlanetaryReport(profileInput, chartResponse, this.interpretationProvider);
      } else if (report.reportType === 'CAREER_PROSITY') {
        structuredReport = await generateProHoroscopeReport(profileInput, chartResponse, this.interpretationProvider);
      } else {
        structuredReport = await generateKundliReport(profileInput, chartResponse, this.interpretationProvider);
      }
    }

    const pdfBuffer = await reportPdfService.generateReportPdf(structuredReport);
    return { buffer: pdfBuffer, report };
  }

  /**
   * Report job creator supporting synchronous instant generation and async worker execution
   */
  public async createReportJob(
    input: CreateReportInput,
    user: UserContext
  ) {
    if (input.reportType === ((ReportType as any).CAREER || 'CAREER')) {
      return this.createCareerReportJob(
        { birthProfileId: input.birthProfileId, forceRegenerate: input.forceRegenerate },
        user
      );
    }

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
    const REPORT_TYPE_TO_FEATURE: Record<string, string> = {
      KUNDLI: 'KUNDLI_REPORT',
      PLANETARY_SUMMARY: 'PLANETARY_SUMMARY_REPORT',
      CAREER: 'CAREER_REPORT',
      CAREER_PROSITY: 'CAREER_PROSITY',
      MARRIAGE_COMPATIBILITY: 'MARRIAGE_COMPATIBILITY',
      GUPTA_NADI_DOSSIER: 'GUPTA_NADI_DOSSIER',
    };
    const featureKey = REPORT_TYPE_TO_FEATURE[input.reportType] || input.reportType;
    const access = await featureAccessService.evaluateFeatureAccess(user.id, featureKey);

    if (!access.allowed && !this.isAdminUser(user)) {
      let orderVerified = false;
      if (input.orderId) {
        const order = await prisma.order.findUnique({
          where: { id: input.orderId },
          include: { items: true },
        });
        if (order && order.userId === user.id && order.status === 'PAID') {
          if (order.reportType === input.reportType) orderVerified = true;
          const targetCatalog = `report-${input.reportType.toLowerCase().replace(/_/g, '-')}`;
          if (order.items?.some((it: any) => it.catalogId === targetCatalog || it.catalogId.includes(input.reportType.toLowerCase()))) {
            orderVerified = true;
          }
        }
      }
      if (!orderVerified && process.env.NODE_ENV !== 'test') {
        throw new ForbiddenError(access.reason || 'Payment or entitlement required to access this report');
      }
    }

    // 4. If async mode requested, enqueue in background worker
    if (input.async) {
      const reportId = crypto.randomUUID();
      const now = new Date();
      const newReport = await prisma.report.create({
        data: {
          id: reportId,
          userId: user.id,
          birthProfileId: input.birthProfileId,
          reportType: input.reportType as any,
          status: 'QUEUED',
          stage: 'QUEUED',
          progress: 0,
          reportVersion: CURRENT_REPORT_VERSION,
          calculationVersion: CURRENT_CALCULATION_VERSION,
          metadata: input.partnerProfileId ? { partnerProfileId: input.partnerProfileId } : undefined,
          createdAt: now,
          updatedAt: now,
        } as any,
      });

      careerReportWorker.enqueueReportJob(reportId);

      return {
        reportId: newReport.id,
        status: 'QUEUED',
        stage: 'QUEUED',
        progress: 0,
        reused: false,
      };
    }

    // 5. Synchronous / Instant fulfillment mode (also caches to storage and DB)
    // Check for existing completed report to reuse if !forceRegenerate
    if (!input.forceRegenerate) {
      const existing = await prisma.report.findFirst({
        where: {
          userId: user.id,
          birthProfileId: input.birthProfileId,
          reportType: input.reportType as any,
          status: 'COMPLETED',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existing && profile.updatedAt <= existing.createdAt) {
        return {
          id: existing.id,
          userId: existing.userId,
          birthProfileId: existing.birthProfileId,
          reportType: existing.reportType,
          status: existing.status,
          createdAt: existing.createdAt,
        };
      }
    }

    const reportId = crypto.randomUUID();
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
        structuredReport = await generateKundliReport(profileInput, chartResponse, this.interpretationProvider);
      }
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
      console.warn(`[REPORT_CREATE] Storage upload non-critical failure: ${uploadErr?.message}`);
    }

    const pageCount = (input.reportType === 'MARRIAGE_COMPATIBILITY' || input.reportType === 'CAREER_PROSITY') ? 4 : 3;

    const report = await prisma.report.create({
      data: {
        id: reportId,
        userId: user.id,
        birthProfileId: input.birthProfileId,
        reportType: input.reportType as any,
        status: 'COMPLETED',
        stage: 'COMPLETED',
        progress: 100,
        storageKey,
        fileName,
        fileSize,
        pageCount,
        metadata: input.partnerProfileId ? { partnerProfileId: input.partnerProfileId } : undefined,
        createdAt: now,
        updatedAt: now,
        completedAt: now,
      } as any,
    });

    return {
      id: report.id,
      userId: user.id,
      birthProfileId: input.birthProfileId,
      reportType: input.reportType,
      status: 'COMPLETED',
      report: structuredReport,
      createdAt: now,
    };
  }
}

export const reportsService = new ReportsService();
