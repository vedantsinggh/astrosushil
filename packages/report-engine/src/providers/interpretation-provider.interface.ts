import { ReportSectionDto, ReportType } from '../types/report.types';

export interface ReportInterpretationProvider {
  /**
   * Generates human-readable interpretation sections based on verified chart data.
   * Keeps astrology calculation separate from interpretation rendering.
   */
  generateInterpretations(
    reportType: ReportType,
    chartData: any
  ): Promise<ReportSectionDto[]>;
}
