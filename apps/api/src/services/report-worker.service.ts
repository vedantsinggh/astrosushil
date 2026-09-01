import * as fs from 'fs';
import * as path from 'path';
import { prisma } from './prisma.service';
import { astrologyService } from '../modules/astrology/astrology.service';
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
      console.error(`[CareerReportWorker] Unhandled pipeline exception for reportId ${reportId}:`, err?.message || err);
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
      console.error(`[CareerReportWorker] Report record ${reportId} not found.`);
      return;
    }

    if (report.status === 'COMPLETED') {
      console.log(`[CareerReportWorker] Report ${reportId} is already COMPLETED. Skipping.`);
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
        console.error(`[CareerReportWorker] Career analysis failed for reportId ${reportId}:`, analysisErr.message);
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
        console.error(`[CareerReportWorker] LaTeX compilation failed for reportId ${reportId}:`, compileErr.message);
        await this.failJob(reportId, 'LATEX_COMPILE_FAILED', compileErr.message || 'LaTeX PDF compilation failed.');
        return;
      }

      // --- STAGE 6: UPLOADING (95%) ---
      await this.updateJobStatus(reportId, 'UPLOADING', 95, 'UPLOADING');

      const storageDir = path.resolve('/tmp/astro-sushil/storage/reports/career', report.userId, reportId);
      fs.mkdirSync(storageDir, { recursive: true });

      const fileName = `career-report-${report.birthProfile.name.toLowerCase().replace(/\s+/g, '-')}-${reportId.substring(0, 8)}.pdf`;
      const pdfFilePath = path.join(storageDir, fileName);
      fs.writeFileSync(pdfFilePath, compilationResult.pdfBuffer);

      const storageKey = `reports/career/${report.userId}/${reportId}/${fileName}`;
      const s3Url = `/api/v1/reports/${reportId}/download-file`;

      // --- STAGE 7: COMPLETED (100%) ---
      const now = new Date();
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'COMPLETED',
          stage: 'COMPLETED',
          progress: 100,
          s3Url,
          storageKey,
          fileName,
          fileSize: compilationResult.fileSize,
          pageCount: compilationResult.pageCount,
          completedAt: now,
          updatedAt: now,
        } as any,
      });

      const durationMs = Date.now() - startTime;
      console.log(`[CareerReportWorker] Report ${reportId} successfully completed in ${durationMs}ms (${compilationResult.pageCount} pages, ${compilationResult.fileSize} bytes).`);
    } catch (err: any) {
      console.error(`[CareerReportWorker] Pipeline error for reportId ${reportId}:`, err);
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

export const careerReportWorker = new CareerReportWorker();
