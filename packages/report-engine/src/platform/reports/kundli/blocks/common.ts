/** Shared LaTeX helpers for Kundli blocks. All dynamic text passes through `tex()`. */
import { NormalizedChart } from '@astro/astrology-engine';
import { longTableTex } from '../../../render/blocks';
import { planetName, PlanetName } from '../../../evidence/evidence-registry';
import { tex } from '../../../render/latex';
import { dignityLabel, ReportLanguage } from '../../../i18n/hindi';
import { kl, listIn } from '../kundli.hindi';

export const PLANET_ORDER: PlanetName[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

export const ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

export const SIGN_ABBR = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
export const SIGN_SHORT = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];

/** dd-mm-yyyy from an ISO instant (UTC calendar date, consistent with core dasha evidence). */
export function dmy(iso: string): string {
  return `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
}

/** Degrees and minutes within a sign, e.g. 12°07′. */
export function degMin(deg: number): string {
  let d = Math.floor(deg);
  let m = Math.round((deg - d) * 60);
  if (m === 60) {
    d += 1;
    m = 0;
  }
  return `${d}°${String(m).padStart(2, '0')}′`;
}

export function dignityText(d: string): string {
  return String(d).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** A dignity in the report language: title case in English, the glossary term in Hindi. */
export function dignityIn(lang: ReportLanguage, d: string): string {
  return lang === 'hi' ? dignityLabel(lang, String(d)) : dignityText(d);
}

export function planetOf(natal: NormalizedChart, name: string) {
  const p = natal.planets.find((x) => planetName(x.name) === name);
  if (!p) throw new Error(`BLOCK_DATA_MISSING: planet ${name}`);
  return p;
}

export interface TableOptions {
  fontPt?: number;
  width?: string;
  /** Row indices to highlight (e.g. the current period). */
  highlight?: number[];
  tabcolsep?: string;
}

/** Striped table (upgrades to repeating-header `longtable` when >= 9 rows). Header strings are escaped here; row cells must already be LaTeX-safe. */
export function dataTable(colSpec: string, header: string[], rows: string[][], opts: TableOptions = {}): string {
  const pt = opts.fontPt ?? 8.6;
  const hl = new Set(opts.highlight ?? []);
  const font = `\\fontsize{${pt}}{${(pt * 1.32).toFixed(1)}}\\selectfont`;
  if (rows.length >= 9 && (!opts.width || opts.width === '\\linewidth')) {
    return longTableTex(
      colSpec,
      header.map((h) => `\\THd{${tex(h)}}`),
      rows,
      { font, tabcolsep: opts.tabcolsep ?? '4pt', highlight: opts.highlight, raw: true }
    );
  }
  return [
    `\\begin{center}{${font}\\setlength{\\tabcolsep}{${opts.tabcolsep ?? '4pt'}}`,
    `\\begin{tabularx}{${opts.width ?? '\\linewidth'}}{${colSpec}}`,
    `\\TableHead${header.map((h) => `\\THd{${tex(h)}}`).join(' & ')}\\\\`,
    ...rows.map((r, i) => `${hl.has(i) ? '\\rowcolor{Accent!22}' : i % 2 ? '\\rowcolor{Surface}' : ''}${r.join(' & ')}\\\\`),
    '\\bottomrule\\end{tabularx}}\\end{center}',
  ].join('\n');
}

/** Two key/value pairs per row: | key | value | key | value |. Values must be plain text (escaped here). */
export function pairTable(pairs: Array<[string, string]>, fontPt = 8.8, lang: ReportLanguage = 'en'): string {
  const rows: string[][] = [];
  for (let i = 0; i < pairs.length; i += 2) {
    const a = pairs[i];
    const b = pairs[i + 1];
    rows.push([`\\textbf{${tex(a[0])}}`, tex(a[1]), b ? `\\textbf{${tex(b[0])}}` : '', b ? tex(b[1]) : '']);
  }
  return dataTable(
    '>{\\raggedright\\arraybackslash}p{0.2\\linewidth}>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}p{0.2\\linewidth}>{\\raggedright\\arraybackslash}X',
    ['Particular', 'Value', 'Particular', 'Value'].map((h) => kl(lang, h)), rows, { fontPt });
}

export function noteBox(kind: 'asCard' | 'asHighlight' | 'asCaution', title: string, body: string): string {
  return `\\begin{${kind}}\\CardTitle{${tex(title)}}{\\fontsize{9.2}{13}\\selectfont ${tex(body)}\\par}\\end{${kind}}`;
}

export function para(text: string, pt = 9.8): string {
  return `{\\fontsize{${pt}}{${(pt * 1.45).toFixed(1)}}\\selectfont ${tex(text)}\\par}`;
}

export function list(xs: string[], lang: ReportLanguage = 'en'): string {
  return listIn(lang, xs);
}
