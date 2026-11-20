/**
 * Post-render PDF QA. Inspects the produced PDF — not the LaTeX source.
 * Uses poppler-utils (pdfinfo, pdftotext, pdffonts), already required by the
 * worker image for other checks.
 */
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { ValidationIssue } from '../contracts';

const run = promisify(execFile);

export interface PdfQaInput {
  pdf: Buffer;
  /** Headings that must appear in the extracted text, in order. */
  requiredHeadings: string[];
  /** Strings that must never appear. */
  forbidden: RegExp[];
  minPages: number;
}

export interface PdfQaResult {
  passed: boolean;
  pageCount: number;
  issues: ValidationIssue[];
  text: string;
}

export async function runPdfQa(input: PdfQaInput): Promise<PdfQaResult> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'as-qa-'));
  const file = path.join(dir, 'r.pdf');
  const issues: ValidationIssue[] = [];
  try {
    fs.writeFileSync(file, input.pdf);
    if (input.pdf.subarray(0, 5).toString() !== '%PDF-') issues.push({ severity: 'error', code: 'NOT_A_PDF', message: 'Missing %PDF header' });

    const info = (await run('pdfinfo', [file])).stdout;
    const pageCount = Number(/Pages:\s+(\d+)/.exec(info)?.[1] ?? 0);
    if (pageCount < input.minPages) issues.push({ severity: 'error', code: 'TOO_FEW_PAGES', message: `${pageCount} < ${input.minPages}` });

    const fonts = (await run('pdffonts', [file])).stdout.split('\n').slice(2).filter(Boolean);
    // pdffonts columns end with: emb sub uni object-id generation
    const notEmbedded = fonts.filter((l) => {
      const t = l.trim().split(/\s+/);
      return t.length >= 5 && t[t.length - 5] === 'no';
    });
    if (notEmbedded.length) issues.push({ severity: 'error', code: 'FONT_NOT_EMBEDDED', message: notEmbedded.join('; ').slice(0, 300) });

    const text = (await run('pdftotext', ['-layout', file, '-'], { maxBuffer: 64 * 1024 * 1024 })).stdout;
    if (text.replace(/\s/g, '').length < pageCount * 200) issues.push({ severity: 'error', code: 'LOW_TEXT', message: 'Extracted text is unexpectedly short' });
    if (/�/.test(text)) issues.push({ severity: 'error', code: 'REPLACEMENT_GLYPH', message: 'Unicode replacement characters found' });
    if (/\?\?/.test(text)) issues.push({ severity: 'warning', code: 'UNRESOLVED_REFERENCE', message: '"??" found (unresolved reference?)' });

    const norm = (t: string) => t.replace(/[\u2018\u2019\u02BC]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\s+/g, ' ').toLowerCase();
    const flat = norm(text);
    let cursor = 0;
    for (const h of input.requiredHeadings) {
      const at = flat.indexOf(norm(h), cursor);
      if (at < 0) issues.push({ severity: 'error', code: 'MISSING_HEADING', message: `"${h}" not found (in order)` });
      else cursor = at;
    }
    for (const re of input.forbidden) {
      const m = re.exec(text);
      if (m) issues.push({ severity: 'error', code: 'FORBIDDEN_TEXT', message: `"${m[0]}"` });
    }
    return { passed: !issues.some((i) => i.severity === 'error'), pageCount, issues, text };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
