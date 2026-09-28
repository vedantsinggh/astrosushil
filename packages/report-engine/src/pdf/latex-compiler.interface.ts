export interface LatexCompilationOptions {
  reportId: string;
  templateDir?: string;
  reportDataTex: string;
  timeoutMs?: number;
  minPageCount?: number;
  structuredFallbackReport?: any;
  careerReportData?: any;
}

export interface LatexCompilationResult {
  pdfBuffer: Buffer;
  pageCount: number;
  fileSize: number;
  compilationMethod: 'LATEXTO' | 'PRESSA' | 'XELATEX' | 'LOCAL';
}

export interface LatexCompiler {
  compileReport(options: LatexCompilationOptions): Promise<LatexCompilationResult>;
}
