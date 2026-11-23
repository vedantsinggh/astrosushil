/**
 * Assemble a full LaTeX document from a definition + resolved topic contents,
 * and compile it with XeLaTeX in an isolated, auto-deleted work directory.
 */
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { GeneratedTopicPayload, ReportDefinition, ReportSection, ReportTopic } from '../contracts';
import { BlockOutput } from './blocks';
import { authorNotePage, closingPage, contentsPage, coverPage, CoverInfo, howToReadPage, philosophyPage } from './editorial';
import { coverImageTex, imageCreditsPage, IllustrationPlan, LibraryImage } from './illustrations';
import { tex } from './latex';

const execFileAsync = promisify(execFile);

export type ResolvedTopic =
  | { topic: ReportTopic; kind: 'narrative'; payload: GeneratedTopicPayload }
  | { topic: ReportTopic; kind: 'block'; block: BlockOutput }
  | { topic: ReportTopic; kind: 'unavailable'; reason: string };

export interface AssembleInput {
  definition: ReportDefinition;
  cover: CoverInfo;
  llmProviderLabel: string;
  sections: Array<{ section: ReportSection; topics: ResolvedTopic[] }>;
  /** Pictures for section openers and topics (presentation only). Omitted = no pictures. */
  illustrations?: IllustrationPlan;
}

function narrativeTex(p: GeneratedTopicPayload, image?: LibraryImage): string {
  const lead = `\\TopicLead{${tex(p.lead)}}`;
  const paras = p.paragraphs.map((para) => `${tex(para)}\\par`);
  const parts: string[] = [];
  if (image && paras.length) {
    // A small picture beside the opening of the passage it illustrates, with no caption (credits are at the back).
    parts.push(
      `\\noindent\\begin{minipage}[t]{0.68\\linewidth}\\vspace{0pt}\\setlength{\\parskip}{4pt}\n${lead}\n${paras[0]}\n\\end{minipage}\\hfill` +
        `\\begin{minipage}[t]{0.285\\linewidth}\\vspace{0pt}\\raggedleft\n${coverImageTex(image, 48, 44)}\n\\end{minipage}\\par\\vspace{2mm}`
    );
    parts.push(...paras.slice(1));
  } else {
    parts.push(lead, ...paras);
  }
  if (p.bullets.length) parts.push(`\\begin{gemlist}\n${p.bullets.map((b) => `  \\item ${tex(b)}`).join('\n')}\n\\end{gemlist}`);
  if (p.takeaway) parts.push(`\\Takeaway{${tex(p.takeaway)}}`);
  return parts.join('\n\n');
}

function sectionHeadTex(section: ReportSection): string {
  return `\\ReportSection{${tex(section.kicker)}}{${tex(section.title)}}{${tex(section.intro ?? '')}}`;
}

function topicTex(rt: ResolvedTopic, lang: 'en' | 'hi', image?: LibraryImage): string {
  const head = `\\ReportTopic{${tex(rt.topic.title)}}{${tex(rt.topic.subtitle ?? '')}}`;
  if (rt.kind === 'narrative') {
    // \needspace keeps a heading together with its picture.
    return `${image ? '\\needspace{62mm}\n' : ''}${head}\n{\\fontsize{10.3}{15}\\selectfont\n${narrativeTex(rt.payload, image)}\n}`;
  }
  if (rt.kind === 'block') {
    return `${head}\n${rt.block.tex}\n${rt.block.method ? `\\SourceNote{${lang === 'hi' ? 'विधि' : 'Method'}: ${tex(rt.block.method)}}` : ''}`;
  }
  return `${head}\n\\begin{asCaution}{\\fontsize{9.5}{13}\\selectfont ${lang === 'hi' ? 'यह विषय आपकी कुंडली के लिए अभी तैयार नहीं हो सका' : 'This topic could not be prepared for your chart'}: ${tex(rt.reason)}\\par}\\end{asCaution}`;
}

export function assembleDocument(input: AssembleInput): string {
  const { definition: def, cover } = input;
  const plan = input.illustrations;
  const body = input.sections
    .map(({ section, topics }) =>
      [
        sectionHeadTex(section),
        ...topics.map((t) => topicTex(t, def.language, t.kind === 'narrative' ? plan?.topics.get(t.topic.id) : undefined)),
      ].join('\n\n')
    )
    .join('\n\n');
  return String.raw`\documentclass[10pt,oneside]{article}
\usepackage{xcolor}
\definecolor{Primary}{HTML}{${def.theme.primary}}
\definecolor{Accent}{HTML}{${def.theme.accent}}
\definecolor{Tint}{HTML}{${def.theme.tint}}
\usepackage{astrosushil-platform}
\newcommand{\ClientName}{${tex(cover.clientName)}}
\renewcommand{\PreparedForLine}{${def.language === 'hi' ? '\\ClientName\\ के लिए तैयार' : 'Prepared for \\ClientName'}}
\renewcommand{\ReportRunningTitle}{${tex(def.title.toUpperCase())}}
\hypersetup{pdftitle={${tex(def.title)}},pdfauthor={Astro Sushil},pdfcreator={Astro Sushil Report Platform}}
\begin{document}
${coverPage(def, cover)}
\pagenumbering{arabic}\setcounter{page}{2}
${authorNotePage(def)}
${philosophyPage(input.llmProviderLabel, def.language)}
${howToReadPage(def)}
${contentsPage(def.language)}
${body}
${plan ? imageCreditsPage(plan, def.language) : ''}
${closingPage(def)}
\end{document}
`;
}

export interface CompileResult {
  pdf: Buffer;
  log: string;
}

const TEMPLATE_ROOT = path.resolve(__dirname, '../../../templates');

export async function compileLatex(source: string, jobName = 'report', timeoutMs = 240000): Promise<CompileResult> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'as-report-'));
  try {
    fs.chmodSync(dir, 0o700);
    fs.cpSync(path.join(TEMPLATE_ROOT, 'assets'), path.join(dir, 'assets'), { recursive: true });
    fs.copyFileSync(path.join(TEMPLATE_ROOT, 'platform', 'astrosushil-platform.sty'), path.join(dir, 'astrosushil-platform.sty'));
    fs.writeFileSync(path.join(dir, `${jobName}.tex`), source, 'utf-8');
    let log = '';
    // Three passes: TOC, LastPage and hyperref anchors settle.
    for (let pass = 0; pass < 3; pass++) {
      try {
        const { stdout } = await execFileAsync('xelatex', ['-interaction=nonstopmode', '-halt-on-error', `${jobName}.tex`], {
          cwd: dir, timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024,
        });
        log = stdout;
      } catch (err) {
        const out = (err as { stdout?: string }).stdout ?? '';
        const firstError = out.split('\n').findIndex((l) => l.startsWith('!'));
        const excerpt = firstError >= 0 ? out.split('\n').slice(firstError, firstError + 8).join('\n') : out.slice(-1500);
        throw new Error(`LATEX_COMPILE_FAILED (pass ${pass + 1}):\n${excerpt}`);
      }
    }
    return { pdf: fs.readFileSync(path.join(dir, `${jobName}.pdf`)), log };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true }); // the work dir contains client details
  }
}
