import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  LatexCompiler,
  LatexCompilationOptions,
  LatexCompilationResult,
} from './latex-compiler.interface';
import { pdfQaValidator } from '../validation/pdf-qa.validator';

const execFileAsync = promisify(execFile);

export class LocalXeLatexCompiler implements LatexCompiler {
  private readonly defaultTemplateDir: string;

  constructor(customTemplateDir?: string) {
    this.defaultTemplateDir =
      customTemplateDir || path.resolve(__dirname, '../../templates');
  }

  /**
   * Compiles LaTeX report locally using XeLaTeX executable in an isolated per-job working directory.
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
      const xeLatexInfo = await this.checkXeLatexAvailable();

      if (!xeLatexInfo.installed) {
        throw new Error(
          'LATEX_ENGINE_UNAVAILABLE: XeLaTeX compiler binary (xelatex) is not installed on local system PATH. Please install TeX Live (texlive-xetex).'
        );
      }

      // Check font availability on system
      await this.verifySystemFonts();

      console.log(
        `[REPORT][LATEX] Starting local XeLaTeX compilation for reportId: ${reportId} (Binary: ${xeLatexInfo.version || 'xelatex'})`
      );

      // Run XeLaTeX in isolated subprocess (3 passes for stable Table of Contents & page references)
      try {
        for (let pass = 1; pass <= 3; pass++) {
          await execFileAsync(
            'xelatex',
            ['-no-shell-escape', '-interaction=nonstopmode', `-output-directory=${outputDir}`, 'main.tex'],
            { cwd: baseTempDir, timeout: timeoutMs }
          );
        }
      } catch (execErr: any) {
        const logError = this.extractLatexLogError(outputDir, execErr);
        console.error(
          `[REPORT][LATEX] Local XeLaTeX compilation failed for reportId ${reportId} (Exit Code: ${execErr.code ?? 'UNKNOWN'}):\n${logError}`
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

      const qaResult = pdfQaValidator.validatePdf({
        pdfBuffer,
        reportDataTex: options.reportDataTex,
        expectedClientName: options.careerReportData?.client?.clientName,
        minPageCount: options.minPageCount !== undefined ? options.minPageCount : 5,
        reportData: options.careerReportData,
      });

      const isQaEnabled = process.env.REPORT_PDF_QA_ENABLED?.toLowerCase().trim() !== 'false';

      if (isQaEnabled) {
        if (!qaResult.isValid) {
          throw new Error(
            `AUTOMATED_PDF_QA_FAILED: Generated PDF failed quality assurance check:\n- ${qaResult.errors.join('\n- ')}`
          );
        }
      } else {
        console.log(
          `[REPORT][LATEX] PDF QA: SKIPPED (REPORT_PDF_QA_ENABLED=false) for reportId=${reportId}`
        );
        if (!qaResult.isValid) {
          console.warn(
            `[REPORT][LATEX] PDF QA warnings ignored (REPORT_PDF_QA_ENABLED=false):\n- ${qaResult.errors.join('\n- ')}`
          );
        }
      }

      const pageCount = qaResult.pageCount;

      console.log(
        `[REPORT][LATEX] compiler=local engine=xelatex reportId=${reportId} status=COMPLETED pageCount=${pageCount}`
      );

      return {
        pdfBuffer,
        pageCount,
        fileSize: pdfBuffer.length,
        compilationMethod: 'LOCAL',
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

  private async verifySystemFonts(): Promise<void> {
    const requiredFonts = ['TeX Gyre Pagella', 'Open Sans', 'Libre Bodoni'];
    try {
      const { stdout } = await execFileAsync('fc-list', [':', 'family']);
      const missing = requiredFonts.filter((f) => !stdout.includes(f));
      if (missing.length > 0) {
        console.warn(
          `[REPORT][LATEX][FONT_WARNING] Required fonts missing from fc-list: ${missing.join(', ')}. XeLaTeX may fallback or fail if fontspec cannot resolve them.`
        );
      }
    } catch (_) {
      // fontconfig/fc-list tool check ignored if not installed
    }
  }

  private extractLatexLogError(outputDir: string, rawExecErr?: any): string {
    const logPath = path.join(outputDir, 'main.log');
    let logLines: string[] = [];
    if (fs.existsSync(logPath)) {
      try {
        const logContent = fs.readFileSync(logPath, 'utf-8');
        logLines = logContent.split('\n');
      } catch (_) {}
    }

    const snippets: string[] = [];
    for (let i = 0; i < logLines.length; i++) {
      const line = logLines[i];
      if (
        line.startsWith('!') ||
        line.includes('LaTeX Error:') ||
        line.includes('Fatal error') ||
        line.includes('Emergency stop') ||
        line.includes('Undefined control sequence') ||
        line.includes('Runaway argument') ||
        line.includes('Missing ')
      ) {
        snippets.push(...logLines.slice(Math.max(0, i - 2), Math.min(logLines.length, i + 8)));
        i += 7;
      }
    }

    const extracted = snippets.join('\n');
    const stdout = rawExecErr?.stdout || '';
    const stderr = rawExecErr?.stderr || rawExecErr?.message || '';
    const fallbackOutput = [stdout, stderr].filter(Boolean).join('\n');

    return extracted.trim() || fallbackOutput || 'Unknown XeLaTeX compilation error.';
  }

  private async checkXeLatexAvailable(): Promise<{ installed: boolean; version?: string }> {
    try {
      const { stdout } = await execFileAsync('xelatex', ['--version']);
      const firstLine = stdout.split('\n')[0] || '';
      return { installed: true, version: firstLine };
    } catch (_) {
      return { installed: false };
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
}

export const localXeLatexCompiler = new LocalXeLatexCompiler();
export const xeLatexCompiler = localXeLatexCompiler; // Backward compatibility alias
export { LocalXeLatexCompiler as XeLatexCompiler };

