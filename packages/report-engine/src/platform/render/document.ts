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
import { BlockOutput, tabularxSpecToLongtable } from './blocks';
import {
  authorNotePage, closingPage, contentsPage, coverPage, CoverInfo, howToReadPage, philosophyPage, reportAssetKey,
} from './editorial';
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

const ABBREV_END = /(?:e\.g|i\.e|vs|no|ch|pp|fig|approx|dr|mr|mrs|ms|st|sr|jr)\.\s*$/i;

/**
 * Split overly long narrative paragraphs (> 520 chars, >= 4 sentences) at a
 * clean sentence boundary near the midpoint, preserving 100% of every word.
 */
function splitLongParagraph(para: string): string[] {
  const trimmed = para.trim();
  if (trimmed.length <= 520) return [trimmed];
  const splits: number[] = [];
  const re = /([a-z\u0900-\u097F0-9)]["”’']?[.।!?])\s+(?=[A-Z\u0900-\u097F"“‘(])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(trimmed)) !== null) {
    const end = m.index + m[1].length;
    const prefix = trimmed.slice(Math.max(0, end - 12), end);
    if (ABBREV_END.test(prefix)) continue;
    // Skip single-initial abbreviations like "K." or numbered list prefixes like "1."
    if (/(?:^|\s)[A-Z0-9]\.$/.test(prefix)) continue;
    splits.push(end);
  }
  if (splits.length < 3) return [trimmed];
  const mid = trimmed.length / 2;
  const best = splits.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
  const left = trimmed.slice(0, best).trim();
  const right = trimmed.slice(best).trim();
  if (left.length < 130 || right.length < 130) return [trimmed];
  return [left, right];
}

function narrativeTex(
  p: GeneratedTopicPayload,
  image: LibraryImage | undefined,
  sectionIdx: number,
  topicIdx: number
): string {
  const rawParas = p.paragraphs.flatMap(splitLongParagraph);
  const parts: string[] = [];
  const hasImage = Boolean(image && rawParas.length);
  const calloutIdx = rawParas.length >= 4 ? 2 : rawParas.length === 3 && !hasImage && topicIdx % 2 === 1 ? 1 : -1;

  const formatPara = (para: string, idx: number): string => {
    if (idx === calloutIdx) {
      return `\\begin{asCallout}\\CardTitleStar{\\InsightWord}{\\fontsize{9.8}{14.2}\\selectfont ${tex(para)}\\par}\\end{asCallout}`;
    }
    return `${tex(para)}\\par`;
  };

  if (hasImage && image) {
    const lead = `\\TopicLead{${tex(p.lead)}}`;
    const first = `${tex(rawParas[0])}\\par`;
    const imgLeft = topicIdx % 2 === 1;
    if (imgLeft) {
      parts.push(
        `\\noindent\\begin{minipage}[t]{0.285\\linewidth}\\vspace{0pt}\\raggedright\n${coverImageTex(image, 48, 44)}\n\\end{minipage}\\hfill` +
          `\\begin{minipage}[t]{0.68\\linewidth}\\vspace{0pt}\\setlength{\\parskip}{4pt}\n${lead}\n${first}\n\\end{minipage}\\par\\vspace{2mm}`
      );
    } else {
      parts.push(
        `\\noindent\\begin{minipage}[t]{0.68\\linewidth}\\vspace{0pt}\\setlength{\\parskip}{4pt}\n${lead}\n${first}\n\\end{minipage}\\hfill` +
          `\\begin{minipage}[t]{0.285\\linewidth}\\vspace{0pt}\\raggedleft\n${coverImageTex(image, 48, 44)}\n\\end{minipage}\\par\\vspace{2mm}`
      );
    }
    for (let i = 1; i < rawParas.length; i++) parts.push(formatPara(rawParas[i], i));
  } else {
    const leadStyle = topicIdx % 3;
    if (leadStyle === 0 && rawParas.length >= 2) {
      parts.push(`\\begin{asQuote}{\\fontsize{10.4}{15}\\selectfont\\itshape\\color{PrimaryDeep}\\InsightStar ${tex(p.lead)}\\par}\\end{asQuote}`);
    } else if (leadStyle === 1) {
      parts.push(`\\begin{asLeadBar}\\TopicLead{${tex(p.lead)}}\\end{asLeadBar}`);
    } else {
      parts.push(`\\TopicLead{${tex(p.lead)}}`);
    }
    for (let i = 0; i < rawParas.length; i++) parts.push(formatPara(rawParas[i], i));
  }

  if (p.bullets.length) {
    const listTex = `\\begin{gemlist}\n${p.bullets.map((b) => `  \\item ${tex(b)}`).join('\n')}\n\\end{gemlist}`;
    if (p.bullets.length >= 2 && (sectionIdx + topicIdx) % 2 === 1) {
      parts.push(`\\begin{asCard}\\CardTitleStar{\\KeyTakeawaysWord}\n${listTex}\n\\end{asCard}`);
    } else {
      parts.push(listTex);
    }
  }
  if (p.takeaway) parts.push(`\\Takeaway{${tex(p.takeaway)}}`);
  return parts.join('\n\n');
}

function sectionHeadTex(section: ReportSection, sectionIdx: number): string {
  const macro = sectionIdx % 2 === 1 ? '\\ReportSectionJewel' : '\\ReportSection';
  return `${macro}{${tex(section.kicker)}}{${tex(section.title)}}{${tex(section.intro ?? '')}}`;
}

/** Read a balanced `{...}` group starting at `start`, returning its inner text and end index. */
function readBraceGroup(s: string, start: number): { content: string; end: number } | undefined {
  if (s[start] !== '{') return undefined;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) return { content: s.slice(start + 1, i), end: i + 1 };
    }
  }
  return undefined;
}

/**
 * Safety net for deterministic blocks that emit a standalone multi-page
 * `\begin{tabularx}{\linewidth}{...}` (>= 9 rows) outside `minipage`/`tcolorbox`:
 * upgrades it to `longtable` with `\endfirsthead` and `\endhead` so headers
 * repeat cleanly across page breaks and long tables never overflow A4 pages.
 */
export function upgradeLongTabularx(source: string): string {
  let out = '';
  let i = 0;
  let minipageDepth = 0;
  let tcolorboxDepth = 0;
  const ENV_TOKEN = /\\(begin|end)\{(minipage|tcolorbox|tabularx)\}/g;
  ENV_TOKEN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ENV_TOKEN.exec(source)) !== null) {
    const pos = m.index;
    const kind = m[1];
    const env = m[2];
    if (env === 'minipage') {
      minipageDepth += kind === 'begin' ? 1 : -1;
      continue;
    }
    if (env === 'tcolorbox') {
      tcolorboxDepth += kind === 'begin' ? 1 : -1;
      continue;
    }
    if (env === 'tabularx' && kind === 'begin' && minipageDepth === 0 && tcolorboxDepth === 0) {
      const afterBegin = pos + m[0].length;
      const widthGrp = readBraceGroup(source, afterBegin);
      if (!widthGrp || widthGrp.content.trim() !== '\\linewidth') continue;
      const colGrp = readBraceGroup(source, widthGrp.end);
      if (!colGrp) continue;
      const endTag = '\\end{tabularx}';
      const endPos = source.indexOf(endTag, colGrp.end);
      // Skip nested tabularx if another \begin{tabularx} appears before endPos.
      const nextBegin = source.indexOf('\\begin{tabularx}', colGrp.end);
      if (endPos < 0 || (nextBegin >= 0 && nextBegin < endPos)) continue;
      const body = source.slice(colGrp.end, endPos);
      const lines = body.trim().split('\n');
      const headIdx = lines.findIndex((l) => l.includes('\\TableHead'));
      const dataRows = lines.filter((l) => l.includes('\\\\') && !l.includes('\\TableHead')).length;
      if (headIdx < 0 || dataRows < 9) continue;

      const ltSpec = tabularxSpecToLongtable(colGrp.content);
      const headLine = lines[headIdx];
      const rest = [...lines.slice(0, headIdx), ...lines.slice(headIdx + 1)].join('\n');
      let replacement =
        `\\setlength{\\tabcolsep}{3.5pt}\\begin{longtable}{${ltSpec}}\n` +
        `${headLine}\n\\endfirsthead\n${headLine}\n\\endhead\n${rest}\n\\end{longtable}`;

      // Unwrap an immediately enclosing `\begin{center}...\end{center}` because
      // longtable is centered natively and breaks more cleanly outside `center`.
      let prefix = source.slice(i, pos);
      let nextStart = endPos + endTag.length;
      const centerOpen = /\\begin\{center\}\s*$/.exec(prefix);
      const centerClose = /^\s*\\end\{center\}/.exec(source.slice(nextStart));
      if (centerOpen && centerClose) {
        prefix = prefix.slice(0, centerOpen.index);
        nextStart += centerClose[0].length;
      }
      out += prefix + replacement;
      i = nextStart;
      ENV_TOKEN.lastIndex = i;
    }
  }
  out += source.slice(i);
  return out;
}

function topicTex(
  rt: ResolvedTopic,
  lang: 'en' | 'hi',
  image: LibraryImage | undefined,
  sectionIdx: number,
  topicIdx: number
): string {
  const head = `\\ReportTopic{${tex(rt.topic.title)}}{${tex(rt.topic.subtitle ?? '')}}`;
  if (rt.kind === 'narrative') {
    // \needspace keeps a heading together with its picture.
    return `${image ? '\\needspace{62mm}\n' : ''}${head}\n{\\fontsize{10.2}{15}\\selectfont\n${narrativeTex(rt.payload, image, sectionIdx, topicIdx)}\n}`;
  }
  if (rt.kind === 'block') {
    const blockTex = upgradeLongTabularx(rt.block.tex);
    return `${head}\n${blockTex}\n${rt.block.method ? `\\SourceNote{${lang === 'hi' ? 'विधि' : 'Method'}: ${tex(rt.block.method)}}` : ''}`;
  }
  return `${head}\n\\begin{asCaution}{\\fontsize{9.5}{13}\\selectfont ${lang === 'hi' ? 'यह विषय आपकी कुंडली के लिए अभी तैयार नहीं हो सका' : 'This topic could not be prepared for your chart'}: ${tex(rt.reason)}\\par}\\end{asCaution}`;
}

export function assembleDocument(input: AssembleInput): string {
  const { definition: def, cover } = input;
  const plan = input.illustrations;
  const assetKey = reportAssetKey(def);
  const body = input.sections
    .map(({ section, topics }, sectionIdx) =>
      [
        sectionHeadTex(section, sectionIdx),
        ...topics.map((t, topicIdx) =>
          topicTex(t, def.language, t.kind === 'narrative' ? plan?.topics.get(t.topic.id) : undefined, sectionIdx, topicIdx)
        ),
      ].join('\n\n')
    )
    .join('\n\n');
  return String.raw`\documentclass[10pt,oneside]{article}
\usepackage{xcolor}
\definecolor{Primary}{HTML}{${def.theme.primary}}
\definecolor{Accent}{HTML}{${def.theme.accent}}
\definecolor{Tint}{HTML}{${def.theme.tint}}
\usepackage{astrosushil-platform}
\renewcommand{\ReportSpotIllustration}{assets/illustrations/${assetKey}.png}
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
        const { stdout } = await execFileAsync('xelatex', ['-no-shell-escape', '-interaction=nonstopmode', '-halt-on-error', `${jobName}.tex`], {
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
