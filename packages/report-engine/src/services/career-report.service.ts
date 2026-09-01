import { AstroChart, NormalizedChart, normalizeAstroChart } from '@astro/astrology-engine';
import {
  careerEvidenceEngine,
  CareerAnalysisInput,
  CareerAnalysis,
  CareerAnalysisProvider,
} from '@astro/prediction-engine';
import { CareerReportData } from '../types/career-report.types';
import { mapNormalizedChartToCareerReportData, ClientProfileMetadata } from '../mappers/career-report.mapper';
import { generateReportDataTex } from '../generators/report-data-tex.generator';

export interface CareerReportGenerationOptions {
  provider?: CareerAnalysisProvider;
  analysis?: CareerAnalysis;
  clientProfile?: ClientProfileMetadata;
}

export interface CareerReportGenerationResult {
  normalizedChart: NormalizedChart;
  careerAnalysisInput: CareerAnalysisInput;
  careerAnalysis?: CareerAnalysis;
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
   * 5. Map NormalizedChart + CareerAnalysis -> CareerReportData
   * 6. Generate LaTeX-escaped report_data.tex string
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

    // 4. Run CareerAnalysisProvider if supplied, or use pre-analyzed input
    let careerAnalysis = options?.analysis;
    if (!careerAnalysis && options?.provider) {
      careerAnalysis = await options.provider.analyze(careerAnalysisInput);
    }

    // 5. Map NormalizedChart + CareerAnalysis to CareerReportData model
    const reportData = mapNormalizedChartToCareerReportData(normalizedChart, careerAnalysis, options?.clientProfile);

    // 6. Render TeX data file content
    const reportDataTex = generateReportDataTex(reportData);

    return {
      normalizedChart,
      careerAnalysisInput,
      careerAnalysis,
      reportData,
      reportDataTex,
    };
  }
}

export const careerReportService = new CareerReportService();
