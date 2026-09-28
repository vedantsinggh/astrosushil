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
import { localXeLatexCompiler } from './xelatex-compiler';

const execFileAsync = promisify(execFile);

export class LatextoCompiler implements LatexCompiler {
  private readonly defaultTemplateDir: string;

  constructor(customTemplateDir?: string) {
    this.defaultTemplateDir =
      customTemplateDir || path.resolve(__dirname, '../../templates');
  }

  /**
   * Compiles LaTeX report using the official LaTeX.to CLI (WebAssembly TeX engine).
   * Spawns: npx latexto pdf <project-directory> --main main.tex --engine xelatex --profile <isolated-profile-dir>
   */
  public async compileReport(
    options: LatexCompilationOptions
  ): Promise<LatexCompilationResult> {
    const reportId = options.reportId;
    const timeoutMs = options.timeoutMs || 180000;
    const templateDir = options.templateDir || this.defaultTemplateDir;

    // 1. Create isolated base temp directory: /tmp/astro-sushil/reports/career-report-{reportId}
    const baseTempDir = path.resolve('/tmp/astro-sushil/reports', `career-report-${reportId}`);
    const projectDir = path.join(baseTempDir, 'project');

    try {
      if (fs.existsSync(baseTempDir)) {
        fs.rmSync(baseTempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(baseTempDir, { recursive: true });
      fs.mkdirSync(projectDir, { recursive: true });

      // Clean up stale lock files from default cache directory if present
      this.cleanupDefaultCacheLock();

      // 2. Populate project directory with complete template files (preserving structure)
      if (!fs.existsSync(templateDir)) {
        throw new Error(`LATEX_ENGINE_UNAVAILABLE: Template directory not found at: ${templateDir}`);
      }

      fs.cpSync(templateDir, projectDir, { recursive: true });

      // Verify main.tex exists
      const mainTexPath = path.join(projectDir, 'main.tex');
      if (!fs.existsSync(mainTexPath)) {
        throw new Error(`LATEX_COMPILATION_FAILED: main.tex entrypoint missing in template: ${mainTexPath}`);
      }

      // Write personalized report_data.tex
      const reportDataTexPath = path.join(projectDir, 'report_data.tex');
      fs.writeFileSync(reportDataTexPath, options.reportDataTex, 'utf-8');

      // 3. Attempt compilation with xelatex first (required for fontspec & OpenType fonts), fallback to pdflatex
      const engines = ['xelatex', 'pdflatex'];
      let generatedPdfPath: string | undefined;
      const engineLogs: Record<string, string> = {};
      const startTime = Date.now();
      const perEngineTimeoutMs = Math.max(timeoutMs, 240000);

      // Shared persistent profile cache to reuse downloaded CheerpX WASM TeX packages
      const profileDir = path.resolve('/tmp/astro-sushil', 'latexto-profile-cache');
      fs.mkdirSync(profileDir, { recursive: true });

      for (const engine of engines) {
        // Clean up stale Chromium lock files before starting compilation
        this.cleanupProfileLocks(profileDir);

        console.log(
          `[REPORT][LATEX] Starting LaTeX.to compilation for reportId: ${reportId} (Engine: ${engine}, Profile: ${profileDir})`
        );

        let stdout = '';
        let stderr = '';
        let engineOutput = '';

        try {
          const result = await execFileAsync(
            'npx',
            [
              'latexto',
              'pdf',
              projectDir,
              '--main',
              'main.tex',
              '--engine',
              engine,
              '--profile',
              profileDir,
            ],
            {
              cwd: projectDir,
              timeout: perEngineTimeoutMs,
              env: { ...process.env },
            }
          );
          stdout = result.stdout || '';
          stderr = result.stderr || '';
          engineOutput = [stdout, stderr].filter(Boolean).join('\n');
        } catch (execErr: any) {
          stdout = execErr?.stdout || '';
          stderr = execErr?.stderr || execErr?.message || '';
          engineOutput = [stdout, stderr].filter(Boolean).join('\n');

          if (execErr?.code === 'ETIMEDOUT') {
            console.warn(
              `[REPORT][LATEX] Engine ${engine} timed out after ${perEngineTimeoutMs}ms. Continuing to fallback engine/compiler...`
            );
          }
        } finally {
          this.cleanupProfileLocks(profileDir);
        }

        engineLogs[engine] = engineOutput;

        // Check if output PDF was generated across standard output locations
        const possiblePdfPaths = [
          path.join(projectDir, 'main.pdf'),
          path.join(projectDir, 'output', 'main.pdf'),
          path.join(projectDir, 'build', 'main.pdf'),
          path.join(projectDir, `${reportId}.pdf`),
          path.join(baseTempDir, 'main.pdf'),
        ];

        for (const pPath of possiblePdfPaths) {
          if (fs.existsSync(pPath)) {
            generatedPdfPath = pPath;
            break;
          }
        }

        if (generatedPdfPath) {
          console.log(`[REPORT][LATEX] LaTeX.to compilation succeeded with engine ${engine}`);
          break;
        }

        console.warn(
          `[REPORT][LATEX] Engine ${engine} did not produce PDF. Log snippet:\n${engineOutput.substring(0, 250)}`
        );
      }

      // Fallback: If LaTeX.to CLI did not produce PDF, attempt local XeLaTeX binary compilation if installed
      if (!generatedPdfPath) {
        console.warn(
          `[REPORT][LATEX] LaTeX.to CLI did not produce output PDF. Attempting local XeLaTeX binary fallback...`
        );
        try {
          return await localXeLatexCompiler.compileReport(options);
        } catch (fallbackErr: any) {
          console.error(`[REPORT][LATEX] Local XeLaTeX fallback compilation failed:`, fallbackErr.message);
        }
      }

      if (!generatedPdfPath) {
        const xelatexLog = engineLogs['xelatex'] || 'No xelatex log';
        const pdflatexLog = engineLogs['pdflatex'] || 'No pdflatex log';

        console.error(
          `[REPORT][LATEX] Output PDF not found after LaTeX.to execution.\n--- XeLaTeX Log ---\n${xelatexLog}\n--- pdfLaTeX Log ---\n${pdflatexLog}`
        );

        // Prioritize xelatex log snippet for error reporting
        const primaryLog = engineLogs['xelatex'] || engineLogs['pdflatex'] || '';
        const cleanErrSnippet = primaryLog
          .split('\n')
          .filter(
            (line) =>
              !line.startsWith('npm warn') &&
              !line.includes('browser sandbox') &&
              line.trim().length > 0
          )
          .slice(-5)
          .join(' ')
          .substring(0, 200);

        throw new Error(
          `LATEX_COMPILATION_FAILED: LaTeX compilation failed (${cleanErrSnippet || 'PDF output not produced'}).`
        );
      }

      // 4. Load and validate PDF
      const pdfBuffer = fs.readFileSync(generatedPdfPath);
      this.validatePdfHeader(pdfBuffer);

      const qaResult = pdfQaValidator.validatePdf({
        pdfBuffer,
        reportDataTex: options.reportDataTex,
        expectedClientName: options.careerReportData?.client?.clientName,
        minPageCount: options.minPageCount !== undefined ? options.minPageCount : 5,
      });

      const isQaEnabled = process.env.REPORT_PDF_QA_ENABLED?.toLowerCase().trim() !== 'false';

      if (isQaEnabled) {
        if (!qaResult.isValid) {
          throw new Error(
            `LATEX_PDF_VALIDATION_FAILED: Generated PDF failed quality assurance checks:\n- ${qaResult.errors.join('\n- ')}`
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

      const duration = Date.now() - startTime;
      const pageCount = qaResult.pageCount;

      console.log(
        `[REPORT][LATEX] compiler=latexto reportId=${reportId} status=COMPLETED duration=${duration}ms pageCount=${pageCount}`
      );

      return {
        pdfBuffer,
        pageCount,
        fileSize: pdfBuffer.length,
        compilationMethod: 'LATEXTO',
      };
    } finally {
      // 5. Cleanup temporary project directory and profiles
      try {
        if (fs.existsSync(baseTempDir)) {
          fs.rmSync(baseTempDir, { recursive: true, force: true });
        }
      } catch (_) {}
    }
  }

  private cleanupProfileLocks(profileDir: string): void {
    try {
      if (fs.existsSync(profileDir)) {
        const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'];
        for (const file of lockFiles) {
          const lockPath = path.join(profileDir, file);
          if (fs.existsSync(lockPath)) {
            fs.rmSync(lockPath, { recursive: true, force: true });
          }
        }
      }
    } catch (_) {}
  }

  private cleanupDefaultCacheLock(): void {
    try {
      const defaultCacheDir = path.join(process.env.HOME || '/tmp', '.cache/latexto');
      const lockFile = path.join(defaultCacheDir, 'SingletonLock');
      if (fs.existsSync(lockFile)) {
        fs.rmSync(lockFile, { force: true });
      }
    } catch (_) {}
  }

  private validatePdfHeader(buffer: Buffer): void {
    if (!buffer || buffer.length === 0) {
      throw new Error('LATEX_PDF_VALIDATION_FAILED: Generated PDF buffer is empty (0 bytes).');
    }
    const header = buffer.toString('utf-8', 0, 5);
    if (!header.startsWith('%PDF-')) {
      throw new Error(
        `LATEX_PDF_VALIDATION_FAILED: Invalid PDF header magic bytes: "${header}"`
      );
    }
  }
}

export const latextoCompiler = new LatextoCompiler();

