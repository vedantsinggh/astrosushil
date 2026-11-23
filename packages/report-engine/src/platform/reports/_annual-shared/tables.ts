/**
 * LaTeX table helpers for the annual reports. Cells are passed already
 * escaped (callers use `tex()`), so cells may contain light formatting.
 */
import { kvTable } from '../../render/blocks';
import { tex } from '../../render/latex';
import { ReportLanguage } from '../../i18n/hindi';
import { AnnualTransitPeriod } from './transits';
import { hindiDate, hindiDateTime, L, ord, planetL, signL } from './annual-shared.hindi';

/** Zebra table that fits on one page (tabularx). `cols` is a tabularx column spec. */
export function gridTable(cols: string, headers: string[], rows: string[][], width = '\\linewidth', centered = true): string {
  return [
    `${centered ? '\\begin{center}' : ''}\\begin{tabularx}{${width}}{${cols}}`,
    `\\TableHead${headers.map((h) => `\\THd{${h}}`).join(' & ')}\\\\`,
    ...rows.map((r, i) => `${i % 2 ? '\\rowcolor{Surface}' : ''}${r.map((c) => `\\TCell{${c}}`).join(' & ')}\\\\`),
    `\\bottomrule\\end{tabularx}${centered ? '\\end{center}' : ''}`,
  ].join('\n');
}

/** Multi-page zebra table (longtable) with a repeating header. `cols` must use fixed-width p{} columns. */
export function longTable(cols: string, headers: string[], rows: string[][]): string {
  const head = `\\TableHead${headers.map((h) => `\\THd{${h}}`).join(' & ')}\\\\`;
  return [
    `{\\setlength{\\LTpre}{2mm}\\setlength{\\LTpost}{2mm}\\begin{longtable}{${cols}}`,
    head, '\\endfirsthead', head, '\\endhead',
    ...rows.map((r, i) => `${i % 2 ? '\\rowcolor{Surface}' : ''}${r.map((c) => `\\TCell{${c}}`).join(' & ')}\\\\`),
    '\\bottomrule\\end{longtable}}',
  ].join('\n');
}

/** Local date of an instant in the subject's timezone, in the report language (English when not given). */
export function localDate(iso: string, timezone: string, lang: ReportLanguage = 'en'): string {
  if (lang === 'hi') return hindiDate(iso, timezone);
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: timezone });
}

export function localDateTime(iso: string, timezone: string, lang: ReportLanguage = 'en'): string {
  if (lang === 'hi') return hindiDateTime(iso, timezone);
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone,
  });
}

/** Status chip for a gochara verdict. */
export function gocharaChip(status: 'favourable' | 'demanding', lang: ReportLanguage = 'en'): string {
  return status === 'favourable' ? `\\textcolor{Primary}{\\textbf{${L(lang, 'Supportive')}}}` : `\\textcolor{Muted}{${L(lang, 'Demanding')}}`;
}

/** Two-column "factor / your chart" table with its headings in the report language. */
export function kvTableL(lang: ReportLanguage, rows: Array<[string, string]>): string {
  if (lang === 'en') return kvTable(rows);
  return [
    '\\begin{center}\\begin{tabularx}{0.86\\linewidth}{>{\\raggedright\\arraybackslash}p{0.38\\linewidth}X}',
    `\\TableHead\\THd{${L(lang, 'Factor')}} & \\THd{${L(lang, 'Your chart')}}\\\\`,
    ...rows.map(([k, v], i) => `${i % 2 ? '\\rowcolor{Surface}' : ''}\\TCell{\\textbf{${tex(k)}}} & \\TCell{${tex(v)}}\\\\`),
    '\\bottomrule\\end{tabularx}\\end{center}',
  ].join('\n');
}

/** Standard row for a transit period: dates, sign, houses from Lagna and Moon, gochara. */
export function transitRow(p: AnnualTransitPeriod, timezone: string, withPlanet = true, lang: ReportLanguage = 'en'): string[] {
  const cells = [
    `${tex(localDate(p.startIso, timezone, lang))} -- ${tex(localDate(p.endIso, timezone, lang))}`,
    `${tex(signL(lang, p.sign))}${p.retrograde ? L(lang, ' (R)') : ''}`,
    tex(ord(lang, p.houseFromLagna)),
    tex(ord(lang, p.houseFromMoon)),
    gocharaChip(p.gochara, lang),
  ];
  return withPlanet ? [`\\textbf{${tex(planetL(lang, p.planet))}}`, ...cells] : cells;
}

/**
 * Column spec built only from paragraph columns, so header cells of every
 * column share one baseline. Each entry: 'X' (flexible, ragged-right) or
 * '<align><width>' with align l/c/r and width as a fraction of \linewidth, e.g. 'l.18'.
 */
export function cols(...spec: string[]): string {
  return spec.map((s) => {
    if (s === 'X') return '>{\\raggedright\\arraybackslash}X';
    const align = s[0] === 'c' ? '\\centering' : s[0] === 'r' ? '\\raggedleft' : '\\raggedright';
    return `>{${align}\\arraybackslash}p{${s.slice(1)}\\linewidth}`;
  }).join('');
}
