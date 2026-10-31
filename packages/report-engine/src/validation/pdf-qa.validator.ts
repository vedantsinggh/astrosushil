import { claimValidationEngine, ClaimValidationResult } from './claim-validation.engine';
import { duplicationDetector, DuplicationCheckResult } from './duplication-detector';
import { NormalizedChart } from '@astro/astrology-engine';
import { CareerReportData } from '../types/career-report.types';

export interface PdfQaOptions {
  pdfBuffer: Buffer;
  reportDataTex: string;
  expectedClientName?: string;
  minPageCount?: number;
  maxPageCount?: number;
  chart?: NormalizedChart;
  reportData?: CareerReportData;
}

export interface PdfQaResult {
  isValid: boolean;
  pageCount: number;
  fileSize: number;
  errors: string[];
  warnings: string[];
  claimValidation?: ClaimValidationResult;
  duplicationCheck?: DuplicationCheckResult;
}

export const FORBIDDEN_PLACEHOLDERS = [
  'Valued Client',
  'Date of Birth: Not supplied',
  'Time of Birth: Not supplied',
  'Personalized interpretation unavailable',
  'D10 Ascendant Lord: D10 Ascendant Lord',
  'Lorem ipsum',
  'TODO:',
  'FIXME:',
  'undefined',
  'null',
  'NaN',
  '[object Object]',
];

export class PdfQaValidator {
  public validatePdf(options: PdfQaOptions): PdfQaResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const minPages = options.minPageCount || 5;

    // 1. Validate PDF Buffer Header
    if (!options.pdfBuffer || options.pdfBuffer.length === 0) {
      errors.push('PDF Buffer is empty (0 bytes).');
      return { isValid: false, pageCount: 0, fileSize: 0, errors, warnings };
    }

    const header = options.pdfBuffer.toString('utf-8', 0, 5);
    if (!header.startsWith('%PDF-')) {
      errors.push(`Invalid PDF header: "${header}"`);
    }

    // 2. Determine Exact Physical Page Count
    const pdfText = options.pdfBuffer.toString('latin1');
    const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
    let pageCount = pageMatches ? pageMatches.length : 0;

    // Also check /Type /Pages /Count <N> in PDF dictionary
    const countMatches = [...pdfText.matchAll(/\/Count\s+(\d+)/g)];
    for (const match of countMatches) {
      const cnt = parseInt(match[1], 10);
      if (!isNaN(cnt) && cnt > pageCount) {
        pageCount = cnt;
      }
    }
    if (pageCount === 0) {
      pageCount = 1;
    }

    if (pageCount < minPages) {
      errors.push(`PDF page count is ${pageCount}, expected >= ${minPages} pages.`);
    }
    if (options.maxPageCount && pageCount > options.maxPageCount) {
      warnings.push(`PDF page count is ${pageCount}, exceeds expected max of ${options.maxPageCount}.`);
    }

    // 3. Scan TeX source for forbidden production placeholders
    for (const placeholder of FORBIDDEN_PLACEHOLDERS) {
      if (options.reportDataTex.includes(placeholder)) {
        errors.push(`Forbidden placeholder "${placeholder}" detected in generated TeX payload.`);
      }
    }

    // 4. Client Metadata QA
    if (options.expectedClientName && options.expectedClientName !== 'Valued Client') {
      if (!options.reportDataTex.includes(options.expectedClientName)) {
        errors.push(`Expected client name "${options.expectedClientName}" was not found in generated TeX report data.`);
      }
    }

    // 5. Run Claim Validation if chart & reportData provided
    let claimResult: ClaimValidationResult | undefined;
    if (options.chart && options.reportData) {
      claimResult = claimValidationEngine.validateReportClaims(options.reportData, options.chart);
      if (!claimResult.isValid) {
        for (const issue of claimResult.issues) {
          if (issue.severity === 'ERROR') {
            errors.push(`CLAIM VALIDATION ERROR: [${issue.field}] ${issue.message}`);
          } else {
            warnings.push(`CLAIM VALIDATION WARNING: [${issue.field}] ${issue.message}`);
          }
        }
      }
    }

    // 6. Run Duplication Detection on Sections
    const sectionMatches = [...options.reportDataTex.matchAll(/\\newcommand{\\([A-Za-z0-9]+)}{([\s\S]*?)}/g)];
    const sections = sectionMatches.map((m) => ({ name: m[1], content: m[2] }));
    const dupResult = duplicationDetector.detectDuplicates(sections, 5);
    if (dupResult.hasExcessiveDuplication) {
      warnings.push(`Excessive paragraph duplication detected: ${dupResult.duplicateCount} repeated snippets found across sections.`);
    }

    return {
      isValid: errors.length === 0,
      pageCount,
      fileSize: options.pdfBuffer.length,
      errors,
      warnings,
      claimValidation: claimResult,
      duplicationCheck: dupResult,
    };
  }
}

export const pdfQaValidator = new PdfQaValidator();
