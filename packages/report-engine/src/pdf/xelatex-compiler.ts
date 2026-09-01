import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { reportPdfService } from './report-pdf.service';

const execFileAsync = promisify(execFile);

export interface LatexCompilationOptions {
  reportId: string;
  templateDir?: string;
  reportDataTex: string;
  timeoutMs?: number;
  structuredFallbackReport?: any;
  careerReportData?: any;
}

export interface LatexCompilationResult {
  pdfBuffer: Buffer;
  pageCount: number;
  fileSize: number;
  compilationMethod: 'XELATEX' | 'FALLBACK';
}

export class XeLatexCompiler {
  private readonly defaultTemplateDir: string;

  constructor(customTemplateDir?: string) {
    this.defaultTemplateDir =
      customTemplateDir ||
      path.resolve(__dirname, '../../templates');
  }

  /**
   * Compiles LaTeX report in an isolated per-job working directory.
   */
  public async compileReport(options: LatexCompilationOptions): Promise<LatexCompilationResult> {
    const reportId = options.reportId;
    const timeoutMs = options.timeoutMs || 60000;
    const templateDir = options.templateDir || this.defaultTemplateDir;

    // 1. Create isolated temporary directory: /tmp/astro-sushil/reports/{reportId}
    const baseTempDir = path.resolve('/tmp/astro-sushil/reports', reportId);
    const outputDir = path.join(baseTempDir, 'output');
    const assetsDir = path.join(baseTempDir, 'assets');

    try {
      if (fs.existsSync(baseTempDir)) {
        fs.rmSync(baseTempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(baseTempDir, { recursive: true });
      fs.mkdirSync(outputDir, { recursive: true });
      fs.mkdirSync(assetsDir, { recursive: true });

      // 2. Copy main.tex from production template directory
      const srcMainTex = path.join(templateDir, 'main.tex');
      const dstMainTex = path.join(baseTempDir, 'main.tex');
      if (fs.existsSync(srcMainTex)) {
        fs.copyFileSync(srcMainTex, dstMainTex);
      } else {
        throw new Error(`Production template main.tex not found at: ${srcMainTex}`);
      }

      // Copy assets if present
      const srcAssets = path.join(templateDir, 'assets');
      if (fs.existsSync(srcAssets)) {
        fs.cpSync(srcAssets, assetsDir, { recursive: true });
      }

      // 3. Write generated report_data.tex
      const dstReportDataTex = path.join(baseTempDir, 'report_data.tex');
      fs.writeFileSync(dstReportDataTex, options.reportDataTex, 'utf-8');

      // 4. Check if xelatex executable is available on system PATH
      const isXeLatexInstalled = await this.checkXeLatexAvailable();

      if (!isXeLatexInstalled) {
        throw new Error(
          'LATEX_ENGINE_UNAVAILABLE: XeLaTeX compiler binary is not installed on system PATH. ' +
            'The production career report engine requires XeLaTeX to compile main.tex into multi-page PDF reports.'
        );
      }

      console.log(
        `[XeLatexCompiler] Starting XeLaTeX compilation (career-report-template-version: 1.0.0) for reportId: ${reportId}`
      );

      // Run XeLaTeX in isolated subprocess (Pass 1 & Pass 2 for page numbering)
      try {
        for (let pass = 1; pass <= 2; pass++) {
          await execFileAsync(
            'xelatex',
            ['-interaction=nonstopmode', `-output-directory=${outputDir}`, 'main.tex'],
            { cwd: baseTempDir, timeout: timeoutMs }
          );
        }
      } catch (execErr: any) {
        const logError = this.extractLatexLogError(outputDir, execErr.message);
        console.error(
          `[XeLatexCompiler] XeLaTeX compilation failed for reportId ${reportId} (Exit Code: ${execErr.code}):\n${logError}`
        );
        throw new Error(`XELATEX_COMPILATION_FAILED (Exit Code ${execErr?.code ?? 'UNKNOWN'}): ${logError}`);
      }

      const generatedPdfPath = path.join(outputDir, 'main.pdf');
      if (!fs.existsSync(generatedPdfPath)) {
        const logError = this.extractLatexLogError(outputDir);
        throw new Error(`XELATEX_OUTPUT_MISSING: XeLaTeX completed but output PDF file main.pdf was not found. Log errors:\n${logError}`);
      }

      const pdfBuffer = fs.readFileSync(generatedPdfPath);
      this.validatePdfBuffer(pdfBuffer);

      const pageCount = this.estimatePdfPageCount(pdfBuffer);
      if (pageCount <= 4) {
        throw new Error(
          `PDF_PAGE_COUNT_TOO_LOW: Compiled PDF page count is ${pageCount}, expected > 4 pages for main.tex Career Report.`
        );
      }

      console.log(
        `[XeLatexCompiler] Successfully compiled reportId ${reportId} (career-report-template-version: 1.0.0, ${pageCount} pages, ${pdfBuffer.length} bytes).`
      );

      return {
        pdfBuffer,
        pageCount,
        fileSize: pdfBuffer.length,
        compilationMethod: 'XELATEX',
      };
    } finally {
      // 5. Cleanup temporary directory
      try {
        if (fs.existsSync(baseTempDir)) {
          fs.rmSync(baseTempDir, { recursive: true, force: true });
        }
      } catch (_) {}
    }
  }

  private extractLatexLogError(outputDir: string, rawErrorMessage?: string): string {
    const logPath = path.join(outputDir, 'main.log');
    let logLines: string[] = [];
    if (fs.existsSync(logPath)) {
      try {
        const logContent = fs.readFileSync(logPath, 'utf-8');
        logLines = logContent.split('\n');
      } catch (_) {}
    }

    const errorSnippets = logLines.filter(
      (line) =>
        line.startsWith('!') ||
        line.includes('LaTeX Error:') ||
        line.includes('Fatal error') ||
        line.includes('Emergency stop') ||
        line.includes('Undefined control sequence') ||
        line.includes('Font ') ||
        line.includes('File `')
    );

    const extracted = errorSnippets.slice(0, 20).join('\n');
    return extracted || rawErrorMessage || 'Unknown XeLaTeX compilation error log.';
  }

  private async checkXeLatexAvailable(): Promise<boolean> {
    try {
      await execFileAsync('which', ['xelatex']);
      return true;
    } catch (_) {
      return false;
    }
  }

  private validatePdfBuffer(buffer: Buffer): void {
    if (!buffer || buffer.length === 0) {
      throw new Error('PDF Validation Error: Generated PDF buffer is empty (0 bytes).');
    }
    const header = buffer.toString('utf-8', 0, 5);
    if (!header.startsWith('%PDF-')) {
      throw new Error(`PDF Validation Error: Invalid PDF header magic bytes: "${header}"`);
    }
  }

  private estimatePdfPageCount(buffer: Buffer): number {
    const text = buffer.toString('binary');
    const matches = text.match(/\/Type\s*\/Page\b/g);
    return matches ? matches.length : 1;
  }

  private generateFallbackPdfBuffer(reportDataTex: string): Buffer {
    // Generate minimal compliant PDF buffer with report title
    const content = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 50 >>\nstream\nBT /F1 12 Tf 50 700 Td (Astro Sushil Career Dossier) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n314\n%%EOF`;
    return Buffer.from(content, 'binary');
  }
}

export const xeLatexCompiler = new XeLatexCompiler();
