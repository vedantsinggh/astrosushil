import * as fs from 'fs';
import * as path from 'path';
import { prisma } from './prisma.service';
import { storageService } from './storage.service';
import { astrologyService } from '../modules/astrology/astrology.service';
import { notificationService } from '../modules/notifications/notification.service';
import { logger } from '../utils/logger';
import {
  careerEvidenceEngine,
  GeminiCareerAnalysisProvider,
  MockCareerAnalysisProvider,
  CareerAnalysisProvider,
  getGeminiCareerConfig,
} from '@astro/prediction-engine';
import {
  careerReportService,
  xeLatexCompiler,
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

export interface ReportJobProgress {
  stage: ReportJobStage;
  progress: number;
  message?: string;
}

export class CareerReportWorker {
  private isProcessing = false;
  private readonly jobQueue: string[] = [];

  /**
   * Enqueues a report generation job by ID and kicks off worker processing loop.
   */
  public enqueueReportJob(reportId: string): void {
    if (!this.jobQueue.includes(reportId)) {
      this.jobQueue.push(reportId);
    }
    // Asynchronously process jobs without blocking call stack
    setImmediate(() => {
      this.processQueue();
    });
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
   * Complete End-to-End Async Pipeline Execution
   */
  public async executeReportPipeline(reportId: string): Promise<void> {
    const startTime = Date.now();

    // 1. Fetch DB report record
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { birthProfile: true, user: true },
    });

    if (!report) {
      logger.error({ reportId }, '[CareerReportWorker] Report record not found');
      return;
    }

    if (report.status === 'COMPLETED') {
      logger.info({ reportId }, '[CareerReportWorker] Report is already COMPLETED. Skipping.');
      return;
    }

    try {
      // --- STAGE 1: QUEUED (0%) ---
      await this.updateJobStatus(reportId, 'QUEUED', 0, 'QUEUED');

      // --- STAGE 2: CALCULATING (15%) ---
      await this.updateJobStatus(reportId, 'CALCULATING', 15, 'CALCULATING');

      const normalizedChart = await astrologyService.calculateNormalizedChart(
        { birthProfileId: report.birthProfileId },
        { id: report.userId, role: 'USER' }
      );

      // Validate completeness of calculated chart (Ascendant, 9 planets, 12 houses)
      if (!normalizedChart.ascendant || !normalizedChart.ascendant.sign) {
        await this.failJob(reportId, 'CHART_DATA_INCOMPLETE', 'Ascendant data is missing from chart calculation.');
        return;
      }
      if (!Array.isArray(normalizedChart.planets) || normalizedChart.planets.length < 9) {
        await this.failJob(reportId, 'CHART_DATA_INCOMPLETE', 'Incomplete planetary positions from chart calculation.');
        return;
      }
      if (!Array.isArray(normalizedChart.houses) || normalizedChart.houses.length < 12) {
        await this.failJob(reportId, 'CHART_DATA_INCOMPLETE', 'Incomplete house positions from chart calculation.');
        return;
      }

      // --- STAGE 3: ANALYZING (35%) ---
      await this.updateJobStatus(reportId, 'ANALYZING', 35, 'ANALYZING');

      // Select LLM Provider: Use Gemini if API key is configured, else MockProvider for offline dev/test
      const geminiConfig = getGeminiCareerConfig();
      const isApiKeyAvailable = Boolean(
        geminiConfig.apiKey &&
        geminiConfig.apiKey.trim().length > 0 &&
        geminiConfig.apiKey !== 'mock-key-dev'
      );

      const provider: CareerAnalysisProvider = isApiKeyAvailable
        ? new GeminiCareerAnalysisProvider()
        : new MockCareerAnalysisProvider();

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
        await this.failJob(reportId, 'CAREER_ANALYSIS_FAILED', analysisErr.message || 'LLM Career Analysis failed.');
        return;
      }

      // --- STAGE 4: RENDERING (60%) ---
      await this.updateJobStatus(reportId, 'RENDERING', 60, 'RENDERING');
      const reportDataTex = pipelineResult.reportDataTex;

      // --- STAGE 5: COMPILING (75%) ---
      await this.updateJobStatus(reportId, 'COMPILING', 75, 'COMPILING');

      let compilationResult;
      try {
        compilationResult = await xeLatexCompiler.compileReport({
          reportId,
          reportDataTex,
          careerReportData: pipelineResult.reportData,
          timeoutMs: 60000,
        });
      } catch (compileErr: any) {
        logger.error({ reportId, err: compileErr.message }, '[CareerReportWorker] LaTeX compilation failed');
        await this.failJob(reportId, 'LATEX_COMPILE_FAILED', compileErr.message || 'LaTeX PDF compilation failed.');
        return;
      }


      // --- STAGE 5.5: VALIDATING / QA (85%) ---
      await this.updateJobStatus(reportId, 'VALIDATING', 85, 'VALIDATING');
      const validation = validateReportPdf(
        compilationResult.pdfBuffer,
        compilationResult.pageCount,
        reportDataTex
      );
      if (!validation.valid) {
        logger.error({ reportId, reason: validation.reason }, '[CareerReportWorker] PDF Validation QA failed');
        await this.failJob(reportId, 'PDF_QA_VALIDATION_FAILED', validation.reason || 'PDF failed quality verification.');
        return;
      }

      // --- STAGE 6: UPLOADING (95%) ---
      await this.updateJobStatus(reportId, 'UPLOADING', 95, 'UPLOADING');

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
        await this.failJob(reportId, 'OBJECT_STORAGE_UPLOAD_FAILED', uploadErr.message || 'Object storage upload failed.');
        return;
      }

      // --- STAGE 7: COMPLETED (100%) ---
      const now = new Date();
      await prisma.report.update({
        where: { id: reportId },
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

      const durationMs = Date.now() - startTime;
      logger.info(
        { reportId, durationMs, pageCount: compilationResult.pageCount, fileSize: compilationResult.fileSize },
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
            reportName: report.reportType || 'Career Intelligence Report',
            reportId: report.id,
          },
        });
      } catch (notifErr) {
        logger.error({ reportId, notifErr }, '[CareerReportWorker] Failed to dispatch report completion notification');
      }
    } catch (err: any) {
      logger.error({ reportId, err: err?.message || err }, '[CareerReportWorker] Pipeline error occurred');
      await this.failJob(reportId, 'PIPELINE_ERROR', err?.message || 'An unexpected worker error occurred.');
    }
  }

  private async updateJobStatus(
    reportId: string,
    status: any,
    progress: number,
    stage: string
  ): Promise<void> {
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        stage,
        progress,
        updatedAt: new Date(),
      } as any,
    });
  }

  private async failJob(reportId: string, errorCode: string, errorMessage: string): Promise<void> {
    const now = new Date();
    logger.warn({ reportId, errorCode, errorMessage }, '[CareerReportWorker] Job marked as FAILED');
    await prisma.report.update({
      where: { id: reportId },
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
