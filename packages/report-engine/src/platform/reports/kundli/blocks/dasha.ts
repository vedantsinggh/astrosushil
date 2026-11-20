/** Vimshottari blocks: life timeline, MD table, AD grid, PD grids and per-Mahadasha "at a glance" cards. */
import { DashaPeriod } from '@astro/astrology-engine';
import { BlockContext, BlockOutput, BlockRenderer } from '../../../render/blocks';
import { formatDate, tex } from '../../../render/latex';
import { ordinal, planetName } from '../../../evidence/evidence-registry';
import { kundliExt } from '../extend';
import { pad2 } from '../evidence';
import { subPeriodRelation } from '../calc/patterns';
import { ABBR, dataTable, dignityText, dmy, planetOf } from './common';

const YEAR_MS = 365.2425 * 86400000;

function age(ctx: BlockContext, iso: string): number {
  const birth = Date.parse(ctx.snapshot.raw.metadata.normalizedTime.utcIsoString);
  return Math.max(0, (Date.parse(iso) - birth) / YEAR_MS);
}

function isActive(ctx: BlockContext, p: DashaPeriod): boolean {
  const t = Date.parse(ctx.snapshot.asOfIso);
  return Date.parse(p.startDateIso) <= t && t < Date.parse(p.endDateIso);
}

function duration(p: DashaPeriod): string {
  const y = p.durationYears;
  const yy = Math.floor(y);
  const mm = Math.round((y - yy) * 12);
  return mm === 12 ? `${yy + 1} y` : `${yy} y ${mm} m`;
}

export function kundliLifeTimeline(ctx: BlockContext): BlockOutput {
  const mds = kundliExt(ctx).dasha.mahadashas;
  const start = Date.parse(mds[0].startDateIso);
  const end = Date.parse(mds[mds.length - 1].endDateIso);
  const W = 170; // mm
  const x = (iso: string) => ((Date.parse(iso) - start) / (end - start)) * W;
  const nowX = x(ctx.snapshot.asOfIso);
  const parts: string[] = ['\\begin{center}\\begin{tikzpicture}[x=1mm,y=1mm]'];
  mds.forEach((md, i) => {
    const a = x(md.startDateIso);
    const b = x(md.endDateIso);
    const fill = i % 2 ? 'Primary!75' : 'Primary';
    parts.push(`\\fill[${fill}] (${a.toFixed(2)},0) rectangle (${b.toFixed(2)},9);`);
    if (b - a > 7) parts.push(`\\node[text=white,font=\\sffamily\\bfseries\\fontsize{7}{8}\\selectfont] at (${((a + b) / 2).toFixed(2)},4.5) {${ABBR[planetName(md.lord)]}};`);
    parts.push(`\\draw[Muted,line width=0.3pt] (${a.toFixed(2)},0) -- (${a.toFixed(2)},-2);`);
    parts.push(`\\node[anchor=north,font=\\sffamily\\fontsize{5.8}{7}\\selectfont,text=Muted] at (${a.toFixed(2)},-2) {${md.startDateIso.slice(0, 4)}};`);
  });
  parts.push(`\\node[anchor=north,font=\\sffamily\\fontsize{5.8}{7}\\selectfont,text=Muted] at (${W},-2) {${mds[mds.length - 1].endDateIso.slice(0, 4)}};`);
  if (nowX > 0 && nowX < W) {
    parts.push(`\\draw[Accent,line width=1.2pt] (${nowX.toFixed(2)},-1) -- (${nowX.toFixed(2)},11);`);
    parts.push(`\\node[anchor=south,font=\\sffamily\\bfseries\\fontsize{6.5}{7.5}\\selectfont,text=Accent] at (${nowX.toFixed(2)},11) {TODAY};`);
  }
  parts.push('\\end{tikzpicture}\\end{center}');
  return {
    tex: parts.join('\n'),
    evidenceIds: mds.map((_, i) => `dasha.md.${pad2(i + 1)}`),
    method: 'Vimshottari Mahadashas from birth, drawn to scale; the gold line marks the report date.',
  };
}

export function kundliMdTable(ctx: BlockContext): BlockOutput {
  const v = kundliExt(ctx).dasha;
  const rows: string[][] = [];
  const hl: number[] = [];
  v.mahadashas.forEach((md, i) => {
    if (isActive(ctx, md)) hl.push(i);
    rows.push([String(i + 1), `\\textbf{${tex(planetName(md.lord))}}`, formatDate(md.startDateIso), formatDate(md.endDateIso), duration(md), `${Math.floor(age(ctx, md.startDateIso))}--${Math.floor(age(ctx, md.endDateIso))}`]);
  });
  const bal = v.balanceAtBirthYears;
  const by = Math.floor(bal);
  const bm = Math.floor((bal - by) * 12);
  const bd = Math.floor(((bal - by) * 12 - bm) * 30.436875);
  return {
    tex: `{\\fontsize{9.6}{13.5}\\selectfont The Moon was in ${tex(v.moonNakshatraName)} (pada ${v.moonPada}) at birth, ruled by ${tex(planetName(v.birthLord))}, so life opened in the ${tex(planetName(v.birthLord))} Mahadasha with a balance of ${by} years ${bm} months ${bd} days.\\par}\n`
      + dataTable('c>{\\raggedright\\arraybackslash}Xllll', ['#', 'Mahadasha', 'Begins', 'Ends', 'Length', 'Ages'], rows, { highlight: hl, fontPt: 9 }),
    evidenceIds: ['dasha.birth-lord', ...v.mahadashas.map((_, i) => `dasha.md.${pad2(i + 1)}`)],
    method: 'Vimshottari dasha (120-year cycle) from the Moon\'s nakshatra, year = 365.2425 days; the first period is shortened by the portion already elapsed before birth. The highlighted row is current on the report date.',
  };
}

function miniTable(title: string, rows: Array<[string, string, string?]>, activeRow: number, three: boolean): string {
  const spec = three ? '@{}l@{\\hspace{3pt}}r@{\\hspace{4pt}}r@{}' : '@{}l@{\\hspace{4pt}}r@{}';
  const body = rows.map(([a, b, c], i) => `${i === activeRow ? '\\rowcolor{Accent!22}' : ''}${a} & ${b}${three ? ` & ${c ?? ''}` : ''}\\\\`).join('\n');
  return [
    `{\\sffamily\\fontsize{7.4}{9}\\selectfont\\bfseries\\color{Primary}${title}}\\par\\vspace{0.6mm}`,
    `{\\fontsize{7.1}{8.5}\\selectfont\\renewcommand{\\arraystretch}{1.08}\\begin{tabular}{${spec}}`,
    `${(three ? ['Period', 'From', 'To'] : ['Period', 'Ends']).map((h) => `{\\color{Muted}\\itshape ${h}}`).join(' & ')}\\\\[-0.5pt]`,
    body,
    '\\end{tabular}}',
  ].join('\n');
}

function gridOf(cells: string[]): string {
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 3) {
    const row = cells.slice(i, i + 3).map((c) => `\\begin{minipage}[t]{0.315\\linewidth}${c}\\end{minipage}`);
    while (row.length < 3) row.push('\\begin{minipage}[t]{0.315\\linewidth}\\mbox{}\\end{minipage}');
    rows.push(`\\noindent${row.join('\\hfill')}\\par\\vspace{2.6mm}`);
  }
  return rows.join('\n');
}

export function kundliAdGrid(ctx: BlockContext): BlockOutput {
  const v = kundliExt(ctx).dasha;
  const cells = v.mahadashas.map((md) => {
    const ads = md.subPeriods ?? [];
    const active = ads.findIndex((ad) => isActive(ctx, ad));
    return miniTable(`${tex(planetName(md.lord)).toUpperCase()} MAHADASHA`, ads.map((ad) => [tex(planetName(ad.lord)), dmy(ad.startDateIso), dmy(ad.endDateIso)]), active, true);
  });
  return {
    tex: gridOf(cells),
    evidenceIds: v.mahadashas.map((_, i) => `kundli.md.${pad2(i + 1)}.antardashas`),
    method: 'Antardashas (sub-periods) of every Mahadasha, dates dd-mm-yyyy. Sub-periods before birth are omitted. The highlighted row is current on the report date.',
  };
}

export function kundliPdGrids(ctx: BlockContext): BlockOutput {
  const v = kundliExt(ctx).dasha;
  const blocks = v.mahadashas.map((md) => {
    const cells = (md.subPeriods ?? []).map((ad) => {
      const pds = ad.subPeriods ?? [];
      const active = pds.findIndex((pd) => isActive(ctx, pd));
      return miniTable(`${ABBR[planetName(md.lord)]}--${tex(planetName(ad.lord))} \\textmd{from ${dmy(ad.startDateIso)}}`,
        pds.map((pd) => [tex(planetName(pd.lord)), dmy(pd.endDateIso)]), active, false);
    });
    return `\\needspace{18\\baselineskip}{\\sffamily\\fontsize{8.6}{10}\\selectfont\\bfseries\\color{Accent}${tex(planetName(md.lord)).toUpperCase()} MAHADASHA\\enspace\\textmd{\\color{Muted}${formatDate(md.startDateIso)} -- ${formatDate(md.endDateIso)}}}\\par\\vspace{1.2mm}{\\color{Rule}\\rule{\\linewidth}{0.4pt}}\\par\\vspace{1.5mm}\n${gridOf(cells)}`;
  });
  return {
    tex: blocks.join('\n\\vspace{2mm}\n'),
    evidenceIds: v.mahadashas.map((_, i) => `kundli.md.${pad2(i + 1)}.period`),
    method: 'Pratyantardashas (sub-sub-periods) for every Mahadasha and Antardasha of life; each list shows the date on which the period ends (dd-mm-yyyy), beginning from the date in its heading.',
  };
}

const RELATION_NOTE: Record<number, string> = {
  1: 'same sign', 2: '2nd', 3: '3rd', 4: '4th (kendra)', 5: '5th (trikona)', 6: '6th', 7: '7th (kendra)', 8: '8th', 9: '9th (trikona)', 10: '10th (kendra)', 11: '11th', 12: '12th',
};

/** "At a glance" card for the n-th Mahadasha of life (1-based). */
export function kundliMdGlance(n: number): BlockRenderer {
  return (ctx) => {
    const { natal } = ctx.snapshot;
    const md = kundliExt(ctx).dasha.mahadashas[n - 1];
    if (!md) throw new Error(`BLOCK_DATA_MISSING: Mahadasha ${n}`);
    const lord = planetName(md.lord);
    const lp = planetOf(natal, lord);
    const t = Date.parse(ctx.snapshot.asOfIso);
    const status = Date.parse(md.endDateIso) <= t ? 'Completed' : Date.parse(md.startDateIso) <= t ? 'Running now' : 'Ahead';
    const rules = lp.lordship.length ? `rules the ${lp.lordship.map(ordinal).join(' and ')}` : 'rules no house (shadow planet)';
    const card = [
      '\\begin{asHighlight}',
      `{\\displayfont\\fontsize{15}{18}\\selectfont\\color{Primary}${tex(lord)} Mahadasha\\par}\\vspace{1mm}`,
      `{\\sffamily\\fontsize{8.2}{11}\\selectfont\\color{Ink}${formatDate(md.startDateIso)} -- ${formatDate(md.endDateIso)}\\enspace\\textbar\\enspace ages ${Math.floor(age(ctx, md.startDateIso))}--${Math.floor(age(ctx, md.endDateIso))}\\enspace\\textbar\\enspace ${duration(md)}\\enspace\\textbar\\enspace \\textbf{${status}}\\par}\\vspace{1mm}`,
      `{\\fontsize{9.2}{12.5}\\selectfont ${tex(`${lord} sits in the ${ordinal(lp.house)} house in ${lp.sign} (${lp.nakshatra} nakshatra), ${rules}, dignity ${dignityText(lp.dignity).toLowerCase()}${lp.retrograde && lord !== 'Rahu' && lord !== 'Ketu' ? ', retrograde' : ''}${lp.combust ? ', combust' : ''}.`)}\\par}`,
      '\\end{asHighlight}',
    ].join('\n');
    const ads = md.subPeriods ?? [];
    const hl: number[] = [];
    const rows = ads.map((ad, i) => {
      if (isActive(ctx, ad)) hl.push(i);
      const al = planetName(ad.lord);
      const ap = planetOf(natal, al);
      const rel = subPeriodRelation(natal, String(md.lord), String(ad.lord));
      const months = Math.round(ad.durationYears * 12 * 10) / 10;
      return [
        `\\textbf{${tex(al)}}`, dmy(ad.startDateIso), dmy(ad.endDateIso), `${months}`,
        `${ordinal(ap.house)}, ${tex(ap.sign)}`, tex(rel.fromParent === 1 && rel.natural === 'Self' ? 'itself' : RELATION_NOTE[rel.fromParent]), tex(rel.natural === 'Self' ? '--' : rel.natural),
      ];
    });
    const table = dataTable('>{\\raggedright\\arraybackslash}p{0.11\\linewidth}lll>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}p{0.15\\linewidth}l',
      ['Antardasha', 'From', 'To', 'Months', 'Its lord sits in', `From ${lord}`, 'Natural tie'], rows, { highlight: hl, fontPt: 8.2 });
    return {
      tex: `${card}\n${table}`,
      evidenceIds: [`dasha.md.${pad2(n)}`, `kundli.md.${pad2(n)}.lord-house`, `kundli.md.${pad2(n)}.lord-sign`, `kundli.md.${pad2(n)}.antardashas`],
      method: `For each Antardasha the table locates its lord in your birth chart, counts its sign from the Mahadasha lord (${lord}) and gives their natural (naisargika) relationship from ${lord}'s side. Classical dasha reading begins from these facts; they are shown here without grading.`,
    };
  };
}
