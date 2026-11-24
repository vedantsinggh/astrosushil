/**
 * Compiles an invoice with XeLaTeX, the same engine the reports use (found on PATH, exactly as
 * `platform/render/document.ts` runs it), in a private work directory that is always deleted.
 *
 * It does not reuse `compileLatex`: that copies the 18 MB report picture library and the report
 * style for every run and allows four minutes per pass. An invoice needs one style file, a short
 * time limit, and `-no-shell-escape` as a second guard behind the text escaping.
 */
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { buildInvoiceLatex } from './latex';
import { InvoicePdfData, InvoicePdfError, RenderInvoiceOptions } from './types';

const STYLE_FILE = path.resolve(__dirname, '../../templates/invoice/astrosushil-invoice.sty');
const JOB = 'invoice';
export const DEFAULT_INVOICE_TIMEOUT_MS = 20_000;
/**
 * The style prints "Page 1 of N" from a label in the .aux file. It is seeded with N = 1, so a one-page
 * invoice is finished after one pass; a longer one makes LaTeX report changed labels and is run again.
 */
const SEEDED_AUX = '\\relax\n\\newlabel{LastPage}{{}{1}}\n';
const MAX_PASSES = 3;

interface RunResult {
  stdout: string;
  failure: 'timeout' | 'unavailable' | 'compile' | null;
}

function runXelatex(cwd: string, timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve) => {
    execFile(
      'xelatex',
      ['-interaction=nonstopmode', '-halt-on-error', '-no-shell-escape', `${JOB}.tex`],
      { cwd, timeout: timeoutMs, killSignal: 'SIGKILL', maxBuffer: 16 * 1024 * 1024 },
      (error, stdout) => {
        if (!error) return resolve({ stdout, failure: null });
        const failed = error as NodeJS.ErrnoException & { killed?: boolean };
        if (failed.code === 'ENOENT') return resolve({ stdout: '', failure: 'unavailable' });
        if (failed.killed) return resolve({ stdout, failure: 'timeout' });
        return resolve({ stdout, failure: 'compile' });
      }
    );
  });
}

/** Only the TeX error line itself ("! Undefined control sequence."); the lines after it quote the document. */
function texErrorLine(stdout: string): string | null {
  const line = stdout.split('\n').find((candidate) => candidate.startsWith('!'));
  return line ? line.slice(0, 200) : null;
}

export async function compileInvoiceLatex(source: string, options: RenderInvoiceOptions = {}): Promise<Buffer> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_INVOICE_TIMEOUT_MS;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'as-invoice-'));
  try {
    fs.chmodSync(dir, 0o700);
    fs.copyFileSync(STYLE_FILE, path.join(dir, 'astrosushil-invoice.sty'));
    fs.writeFileSync(path.join(dir, `${JOB}.tex`), source, { encoding: 'utf-8', mode: 0o600 });
    fs.writeFileSync(path.join(dir, `${JOB}.aux`), SEEDED_AUX, { encoding: 'utf-8', mode: 0o600 });

    for (let pass = 1; pass <= MAX_PASSES; pass++) {
      const { stdout, failure } = await runXelatex(dir, timeoutMs);
      if (failure === 'unavailable') throw new InvoicePdfError('unavailable', 'xelatex is not installed on this server');
      if (failure === 'timeout') throw new InvoicePdfError('timeout', `Invoice compile exceeded ${timeoutMs} ms`);
      if (failure === 'compile') throw new InvoicePdfError('compile', `Invoice compile failed on pass ${pass}`, texErrorLine(stdout));
      if (!/Rerun to get|Label\(s\) may have changed|undefined references/.test(stdout)) break;
    }

    const pdfPath = path.join(dir, `${JOB}.pdf`);
    if (!fs.existsSync(pdfPath)) throw new InvoicePdfError('compile', 'Invoice compile produced no PDF');
    const pdf = fs.readFileSync(pdfPath);
    if (pdf.length < 1000 || pdf.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new InvoicePdfError('compile', 'Invoice compile produced an invalid PDF');
    }
    return pdf;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true }); // the work directory holds customer details
  }
}

/** The invoice as a PDF. Throws `InvoicePdfError` (timeout, xelatex missing, or compile failure). */
export async function renderInvoicePdf(data: InvoicePdfData, options: RenderInvoiceOptions = {}): Promise<Buffer> {
  return compileInvoiceLatex(buildInvoiceLatex(data), options);
}
