import crypto from 'crypto';
import { prisma } from '../../services/prisma.service';
import { NotFoundError, AppError } from '../../errors/app-error';
import { CreateReportInput } from './reports.schemas';
import { astrologyService } from '../astrology/astrology.service';
import {
  generateKundliReport,
  generatePlanetaryReport,
  validateAstrologyDataForReport,
  IncompleteAstrologyDataError,
  DeterministicInterpretationProvider,
  StructuredReportModel,
  reportPdfService,
} from '@astro/report-engine';

export class ReportsService {
  private readonly interpretationProvider = new DeterministicInterpretationProvider();

  private async ensureReportTypeEnumValues(): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "ReportType" ADD VALUE IF NOT EXISTS 'KUNDLI';`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "ReportType" ADD VALUE IF NOT EXISTS 'PLANETARY_SUMMARY';`);
    } catch (_) {
      // Ignore if DB does not support ADD VALUE IF NOT EXISTS or if already altered
    }
  }

  public async createReportJob(
    input: CreateReportInput,
    user: { id: string; role: 'USER' | 'ADMIN' }
  ) {
    // 1. Verify birth profile ownership
    const profile = await prisma.birthProfile.findUnique({
      where: { id: input.birthProfileId },
    });

    if (!profile || (profile.userId !== user.id && user.role !== 'ADMIN')) {
      throw new NotFoundError('Birth profile not found');
    }

    // 2. Calculate astrology chart data
    const chartResponse = await astrologyService.calculateChartForProfile(input.birthProfileId, user);

    // 3. Validate complete astrology data (prevent empty ascendant/planets/houses or N/A strings)
    try {
      validateAstrologyDataForReport(chartResponse);
    } catch (err: any) {
      if (err instanceof IncompleteAstrologyDataError) {
        console.error(`[REPORTS_ENGINE_ERROR] Developer Diagnostic: ${err.developerMessage}`);
        throw new AppError(err.message, 422, 'INCOMPLETE_ASTROLOGY_DATA');
      }
      throw err;
    }

    // 4. Generate structured report model deterministically
    let structuredReport: StructuredReportModel;
    const profileInput = {
      name: profile.name,
      dateOfBirth: profile.dateOfBirth,
      timeOfBirth: profile.timeOfBirth,
      placeName: profile.placeName,
      timezone: profile.timezone,
    };

    if ((input.reportType as string) === 'KUNDLI') {
      structuredReport = await generateKundliReport(
        profileInput,
        chartResponse,
        this.interpretationProvider
      );
    } else if ((input.reportType as string) === 'PLANETARY_SUMMARY') {
      structuredReport = await generatePlanetaryReport(
        profileInput,
        chartResponse,
        this.interpretationProvider
      );
    } else {
      throw new AppError(`Report type '${input.reportType}' is not currently supported in MVP.`, 400, 'UNSUPPORTED_REPORT_TYPE');
    }

    // 5. Persist Report DB Record via Raw SQL to bypass outdated Prisma JS client enum validation
    await this.ensureReportTypeEnumValues();

    const reportId = crypto.randomUUID();
    const now = new Date();

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "reports" ("id", "userId", "birthProfileId", "orderId", "reportType", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5::"ReportType", $6::"ReportStatus", $7, $8)`,
        reportId,
        user.id,
        input.birthProfileId,
        input.orderId || null,
        input.reportType,
        'COMPLETED',
        now,
        now
      );
    } catch (_) {
      // Fallback: If enum type casting fails, insert as text
      await prisma.$executeRawUnsafe(
        `INSERT INTO "reports" ("id", "userId", "birthProfileId", "orderId", "reportType", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        reportId,
        user.id,
        input.birthProfileId,
        input.orderId || null,
        input.reportType,
        'COMPLETED',
        now,
        now
      );
    }

    return {
      id: reportId,
      userId: user.id,
      birthProfileId: input.birthProfileId,
      reportType: input.reportType,
      status: 'COMPLETED',
      version: structuredReport.version,
      createdAt: now,
      report: structuredReport,
    };
  }

  public async getReportStatus(
    reportId: string,
    user: { id: string; role: 'USER' | 'ADMIN' }
  ) {
    const rawReports: any[] = await prisma.$queryRawUnsafe(
      `SELECT r.*, row_to_json(bp.*) as "birthProfile"
       FROM "reports" r
       JOIN "birth_profiles" bp ON bp."id" = r."birthProfileId"
       WHERE r."id" = $1 LIMIT 1`,
      reportId
    );

    const report = rawReports[0];

    if (!report || (report.userId !== user.id && user.role !== 'ADMIN')) {
      throw new NotFoundError('Report not found');
    }

    // Re-generate structured report payload on-demand
    const profile = typeof report.birthProfile === 'string'
        ? JSON.parse(report.birthProfile)
        : report.birthProfile;

    const chartResponse = await astrologyService.calculateChartForProfile(profile.id, user);

    let structuredReport: StructuredReportModel;
    const profileInput = {
      name: profile.name,
      dateOfBirth: profile.dateOfBirth,
      timeOfBirth: profile.timeOfBirth,
      placeName: profile.placeName,
      timezone: profile.timezone,
    };

    if ((report.reportType as string) === 'KUNDLI') {
      structuredReport = await generateKundliReport(profileInput, chartResponse, this.interpretationProvider);
    } else {
      structuredReport = await generatePlanetaryReport(profileInput, chartResponse, this.interpretationProvider);
    }

    return {
      ...report,
      report: structuredReport,
    };
  }

  public async getUserReports(user: { id: string }) {
    return prisma.$queryRawUnsafe(
      `SELECT r.*, row_to_json(bp.*) as "birthProfile"
       FROM "reports" r
       JOIN "birth_profiles" bp ON bp."id" = r."birthProfileId"
       WHERE r."userId" = $1
       ORDER BY r."createdAt" DESC`,
      user.id
    );
  }

  public async generateReportPdfBuffer(
    reportId: string,
    user: { id: string; role: 'USER' | 'ADMIN' }
  ): Promise<{ buffer: Buffer; report: any }> {
    const reportData = await this.getReportStatus(reportId, user);

    try {
      const pdfBuffer = await reportPdfService.generateReportPdf(reportData.report);
      return { buffer: pdfBuffer, report: reportData };
    } catch (err: any) {
      if (err instanceof IncompleteAstrologyDataError) {
        console.error(`[REPORTS_PDF_ERROR] Developer Diagnostic: ${err.developerMessage}`);
        throw new AppError(err.message, 422, 'INCOMPLETE_ASTROLOGY_DATA');
      }
      throw err;
    }
  }
}

export const reportsService = new ReportsService();
