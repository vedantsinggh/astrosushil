import crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ReportType } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { NotFoundError, ForbiddenError, AuthorizationError, AppError } from '../../errors/app-error';
import { CreateReportInput } from './reports.schemas';
import { astrologyService } from '../astrology/astrology.service';
import { careerReportWorker } from '../../services/report-worker.service';
import {
  generateKundliReport,
  generatePlanetaryReport,
  validateAstrologyDataForReport,
  IncompleteAstrologyDataError,
  DeterministicInterpretationProvider,
  StructuredReportModel,
  reportPdfService,
} from '@astro/report-engine';

export const CURRENT_REPORT_VERSION = '1.0.0';
export const CURRENT_CALCULATION_VERSION = '1.0.0';

export class ReportsService {
  private readonly interpretationProvider = new DeterministicInterpretationProvider();

  /**
   * Initiates an async Career Report generation job.
   */
  public async createCareerReportJob(
    input: { birthProfileId: string; forceRegenerate?: boolean },
    user: { id: string; role: 'USER' | 'ADMIN' }
  ) {
    // 1. Validate birth profile ownership
    const profile = await prisma.birthProfile.findUnique({
      where: { id: input.birthProfileId },
    });

    if (!profile) {
      throw new NotFoundError('Birth profile not found');
    }

    if (profile.userId !== user.id && user.role !== 'ADMIN') {
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
    user: { id: string; role: 'USER' | 'ADMIN' }
  ) {
    const existingReport = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      throw new NotFoundError('Report not found');
    }

    if (existingReport.userId !== user.id && user.role !== 'ADMIN') {
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
    user: { id: string; role: 'USER' | 'ADMIN' }
  ) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have access to this report');
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
    user: { id: string; role: 'USER' | 'ADMIN' }
  ) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { birthProfile: true },
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    if (report.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have access to this report');
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
    user: { id: string; role: 'USER' | 'ADMIN' }
  ): Promise<{ buffer: Buffer; report: any }> {
    const report = await this.getReportStatus(reportId, user);

    if (report.status !== 'COMPLETED') {
      throw new AppError(`Report status is ${report.status}. Download is only available for COMPLETED reports.`, 400, 'REPORT_NOT_READY');
    }

    // 1. Try reading generated PDF from disk storage
    const storageDir = path.resolve('/tmp/astro-sushil/storage/reports/career', report.userId, reportId);
    if (fs.existsSync(storageDir)) {
      const files = fs.readdirSync(storageDir).filter((f) => f.endsWith('.pdf'));
      if (files.length > 0) {
        const filePath = path.join(storageDir, files[0]);
        const pdfBuffer = fs.readFileSync(filePath);
        return { buffer: pdfBuffer, report };
      }
    }

    // 2. Fallback for legacy MVP Kundli / Planetary summary reports
    const chartResponse = await astrologyService.calculateChartForProfile(report.birthProfileId, user);
    let structuredReport: StructuredReportModel;
    const profileInput = {
      name: report.birthProfile.name,
      dateOfBirth: report.birthProfile.dateOfBirth,
      timeOfBirth: report.birthProfile.timeOfBirth,
      placeName: report.birthProfile.placeName,
      timezone: report.birthProfile.timezone,
    };

    if (report.reportType === 'KUNDLI') {
      structuredReport = await generateKundliReport(profileInput, chartResponse, this.interpretationProvider);
    } else {
      structuredReport = await generatePlanetaryReport(profileInput, chartResponse, this.interpretationProvider);
    }

    const pdfBuffer = await reportPdfService.generateReportPdf(structuredReport);
    return { buffer: pdfBuffer, report };
  }

  /**
   * Legacy MVP synchronous report job creator
   */
  public async createReportJob(
    input: CreateReportInput,
    user: { id: string; role: 'USER' | 'ADMIN' }
  ) {
    if (input.reportType === ((ReportType as any).CAREER || 'CAREER')) {
      return this.createCareerReportJob({ birthProfileId: input.birthProfileId }, user);
    }

    const profile = await prisma.birthProfile.findUnique({
      where: { id: input.birthProfileId },
    });

    if (!profile || (profile.userId !== user.id && user.role !== 'ADMIN')) {
      throw new NotFoundError('Birth profile not found');
    }

    const chartResponse = await astrologyService.calculateChartForProfile(input.birthProfileId, user);

    validateAstrologyDataForReport(chartResponse);

    const reportId = crypto.randomUUID();
    const now = new Date();

    const report = await prisma.report.create({
      data: {
        id: reportId,
        userId: user.id,
        birthProfileId: input.birthProfileId,
        reportType: input.reportType as any,
        status: 'COMPLETED',
        stage: 'COMPLETED',
        progress: 100,
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
      createdAt: now,
    };
  }
}

export const reportsService = new ReportsService();
