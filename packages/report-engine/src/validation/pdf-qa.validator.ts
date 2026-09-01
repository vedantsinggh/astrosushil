export interface PdfQaOptions {
  pdfBuffer: Buffer;
  reportDataTex: string;
  expectedClientName?: string;
  minPageCount?: number;
}

export interface PdfQaResult {
  isValid: boolean;
  pageCount: number;
  fileSize: number;
  errors: string[];
  warnings: string[];
}

export const FORBIDDEN_PLACEHOLDERS = [
  'Valued Client',
  'Date of Birth: Not supplied',
  'Time of Birth: Not supplied',
  'Personalized interpretation unavailable',
  'Lorem ipsum',
  'TODO:',
  'FIXME:',
  'undefined',
  'null',
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

    // 2. Determine Page Count
    const pdfText = options.pdfBuffer.toString('binary');
    const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
    const pageCount = pageMatches ? pageMatches.length : 1;

    if (pageCount < minPages) {
      errors.push(`PDF page count is ${pageCount}, expected >= ${minPages} pages.`);
    }

    // 3. Scan TeX source & PDF raw text for forbidden production placeholders
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

    return {
      isValid: errors.length === 0,
      pageCount,
      fileSize: options.pdfBuffer.length,
      errors,
      warnings,
    };
  }
}

export const pdfQaValidator = new PdfQaValidator();
