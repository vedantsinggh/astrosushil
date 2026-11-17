import { AstroChart, NormalizedChart, normalizeAstroChart } from '@astro/astrology-engine';
import {
  careerEvidenceEngine,
  CareerAnalysisInput,
  CareerAnalysis,
  CareerAnalysisProvider,
  VocationalSynthesisEngine,
  chapterPipelineService,
  ChapterContentOutput,
  ChapterId,
  MockCareerAnalysisProvider,
} from '@astro/prediction-engine';
import { CareerReportData } from '../types/career-report.types';
import { mapNormalizedChartToCareerReportData, ClientProfileMetadata } from '../mappers/career-report.mapper';
import { generateReportDataTex } from '../generators/report-data-tex.generator';

export interface CareerReportGenerationOptions {
  provider?: CareerAnalysisProvider;
  analysis?: CareerAnalysis;
  clientProfile?: ClientProfileMetadata;
  chapterContents?: Map<ChapterId, ChapterContentOutput>;
  apiKey?: string;
  forceRegenerateChapters?: boolean;
}

export interface CareerReportGenerationResult {
  normalizedChart: NormalizedChart;
  careerAnalysisInput: CareerAnalysisInput;
  careerAnalysis?: CareerAnalysis;
  chapterContents?: Map<ChapterId, ChapterContentOutput>;
  reportData: CareerReportData;
  reportDataTex: string;
}

export class CareerReportService {
  /**
   * Core Backend Pipeline for Career Report Generation:
   * 1. Normalize AstroChart -> NormalizedChart
   * 2. Validate NormalizedChart completeness
   * 3. Build CareerAnalysisInput using CareerEvidenceEngine
   * 4. Perform LLM Career Analysis using CareerAnalysisProvider (if options.provider supplied)
   * 5. Generate Chapter-Oriented Editorial Content using ChapterPipelineService
   * 6. Map NormalizedChart + CareerAnalysis + Chapters -> CareerReportData
   * 7. Generate LaTeX-escaped report_data.tex string
   */
  public async generateCareerReportData(
    chartInput: AstroChart | NormalizedChart,
    options?: CareerReportGenerationOptions
  ): Promise<CareerReportGenerationResult> {
    // 1. Normalize chart input
    const normalizedChart: NormalizedChart =
      'ascendant' in chartInput && 'planets' in chartInput && Array.isArray(chartInput.planets)
        ? (chartInput as NormalizedChart)
        : normalizeAstroChart(chartInput as AstroChart);

    // 2. Validate completeness of normalized chart
    if (!normalizedChart.ascendant || !normalizedChart.ascendant.sign) {
      throw new Error('CareerReportService Validation Error: Ascendant is missing or incomplete.');
    }
    if (!Array.isArray(normalizedChart.planets) || normalizedChart.planets.length < 9) {
      throw new Error('CareerReportService Validation Error: Incomplete planetary positions (requires 9 planets).');
    }
    if (!Array.isArray(normalizedChart.houses) || normalizedChart.houses.length < 12) {
      throw new Error('CareerReportService Validation Error: Incomplete houses (requires 12 houses).');
    }

    // 3. Build CareerAnalysisInput using CareerEvidenceEngine
    const careerAnalysisInput = careerEvidenceEngine.buildCareerAnalysisInput(normalizedChart);

    // 4. Run CareerAnalysisProvider if supplied, or use Mock provider fallback
    let careerAnalysis = options?.analysis;
    if (!careerAnalysis) {
      const provider = options?.provider || new MockCareerAnalysisProvider();
      careerAnalysis = await provider.analyze(careerAnalysisInput);
    }

    // 5. Generate or load 10-chapter editorial content
    const clientMetadata = {
      name: options?.clientProfile?.clientName || 'Puneet Kumar',
      dateOfBirth: options?.clientProfile?.dateOfBirth || '1983-12-28',
      timeOfBirth: options?.clientProfile?.timeOfBirth || '04:45',
      placeName: options?.clientProfile?.birthPlace || 'Bulandshahr, India',
    };

    const vocationalEngine = new VocationalSynthesisEngine();
    const vocationalSynthesis = vocationalEngine.synthesize({ chart: normalizedChart });

    let chapterContents = options?.chapterContents;
    if (!chapterContents) {
      chapterContents = await chapterPipelineService.generateAllChapters(
        normalizedChart,
        vocationalSynthesis,
        clientMetadata,
        {
          apiKey: options?.apiKey,
          forceRegenerate: options?.forceRegenerateChapters,
        }
      );
    }

    // 6. Map NormalizedChart + CareerAnalysis to CareerReportData model
    const reportData = mapNormalizedChartToCareerReportData(normalizedChart, careerAnalysis, options?.clientProfile);
    if (chapterContents) {
      reportData.chapters = Object.fromEntries(chapterContents.entries());
    }

    // 7. Render TeX data file content
    const reportDataTex = generateReportDataTex(reportData);

    return {
      normalizedChart,
      careerAnalysisInput,
      careerAnalysis,
      chapterContents,
      reportData,
      reportDataTex,
    };
  }
}

export const careerReportService = new CareerReportService();
