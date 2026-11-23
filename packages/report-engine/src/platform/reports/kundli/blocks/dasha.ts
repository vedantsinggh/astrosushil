/** Vimshottari blocks: life timeline, MD table, AD grid, PD grids and per-Mahadasha "at a glance" cards. */
import { DashaPeriod } from '@astro/astrology-engine';
import { BlockContext, blockLang, BlockOutput, BlockRenderer } from '../../../render/blocks';
import { tex } from '../../../render/latex';
import { ordinal, planetName } from '../../../evidence/evidence-registry';
import { nakshatraLabel, pick, planetAbbr, planetLabel, ReportLanguage, signLabel } from '../../../i18n/hindi';
import { kundliExt } from '../extend';
import { pad2 } from '../evidence';
import { subPeriodRelation } from '../calc/patterns';
import { dateIn, kl, listIn, ordHi } from '../kundli.hindi';
import { ABBR, dataTable, dignityIn, dignityText, dmy, planetOf } from './common';

/** Chart abbreviation of a planet in the block's language. */
const abbr = (lang: ReportLanguage, planet: string) => (lang === 'hi' ? planetAbbr(lang, planet) : ABBR[planet]);

const YEAR_MS = 365.2425 * 86400000;

function age(ctx: BlockContext, iso: string): number {
  const birth = Date.parse(ctx.snapshot.raw.metadata.normalizedTime.utcIsoString);
  return Math.max(0, (Date.parse(iso) - birth) / YEAR_MS);
}

function isActive(ctx: BlockContext, p: DashaPeriod): boolean {
  const t = Date.parse(ctx.snapshot.asOfIso);
  return Date.parse(p.startDateIso) <= t && t < Date.parse(p.endDateIso);
}

function duration(p: DashaPeriod, lang: ReportLanguage): string {
  const y = p.durationYears;
  const yy = Math.floor(y);
  const mm = Math.round((y - yy) * 12);
  return mm === 12 ? `${yy + 1} ${kl(lang, 'y')}` : `${yy} ${kl(lang, 'y')} ${mm} ${kl(lang, 'm')}`;
}

export function kundliLifeTimeline(ctx: BlockContext): BlockOutput {
  const mds = kundliExt(ctx).dasha.mahadashas;
  const lang = blockLang(ctx);
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
    if (b - a > 7) parts.push(`\\node[text=white,font=\\sffamily\\bfseries\\fontsize{7}{8}\\selectfont] at (${((a + b) / 2).toFixed(2)},4.5) {${abbr(lang, planetName(md.lord))}};`);
    parts.push(`\\draw[Muted,line width=0.3pt] (${a.toFixed(2)},0) -- (${a.toFixed(2)},-2);`);
    parts.push(`\\node[anchor=north,font=\\sffamily\\fontsize{5.8}{7}\\selectfont,text=Muted] at (${a.toFixed(2)},-2) {${md.startDateIso.slice(0, 4)}};`);
  });
  parts.push(`\\node[anchor=north,font=\\sffamily\\fontsize{5.8}{7}\\selectfont,text=Muted] at (${W},-2) {${mds[mds.length - 1].endDateIso.slice(0, 4)}};`);
  if (nowX > 0 && nowX < W) {
    parts.push(`\\draw[Accent,line width=1.2pt] (${nowX.toFixed(2)},-1) -- (${nowX.toFixed(2)},11);`);
    parts.push(`\\node[anchor=south,font=\\sffamily\\bfseries\\fontsize{6.5}{7.5}\\selectfont,text=Accent] at (${nowX.toFixed(2)},11) {${kl(lang, 'TODAY')}};`);
  }
  parts.push('\\end{tikzpicture}\\end{center}');
  return {
    tex: parts.join('\n'),
    evidenceIds: mds.map((_, i) => `dasha.md.${pad2(i + 1)}`),
    method: kl(lang, 'Vimshottari Mahadashas from birth, drawn to scale; the gold line marks the report date.'),
  };
}

export function kundliMdTable(ctx: BlockContext): BlockOutput {
  const v = kundliExt(ctx).dasha;
  const lang = blockLang(ctx);
  const rows: string[][] = [];
  const hl: number[] = [];
  v.mahadashas.forEach((md, i) => {
    if (isActive(ctx, md)) hl.push(i);
    rows.push([String(i + 1), `\\textbf{${tex(planetLabel(lang, planetName(md.lord)))}}`, dateIn(lang, md.startDateIso), dateIn(lang, md.endDateIso), duration(md, lang), `${Math.floor(age(ctx, md.startDateIso))}--${Math.floor(age(ctx, md.endDateIso))}`]);
  });
  const bal = v.balanceAtBirthYears;
  const by = Math.floor(bal);
  const bm = Math.floor((bal - by) * 12);
  const bd = Math.floor(((bal - by) * 12 - bm) * 30.436875);
  const birthLord = tex(planetLabel(lang, planetName(v.birthLord)));
  const nakshatra = tex(nakshatraLabel(lang, v.moonNakshatraName));
  const intro = pick(lang,
    `The Moon was in ${nakshatra} (pada ${v.moonPada}) at birth, ruled by ${birthLord}, so life opened in the ${birthLord} Mahadasha with a balance of ${by} years ${bm} months ${bd} days.`,
    `जन्म के समय चंद्र ${nakshatra} नक्षत्र (चरण ${v.moonPada}) में था, जिसका स्वामी ${birthLord} है; इसलिए जीवन ${birthLord} की महादशा से आरंभ हुआ, जिसके ${by} वर्ष ${bm} माह ${bd} दिन शेष थे।`);
  return {
    tex: `{\\fontsize{9.6}{13.5}\\selectfont ${intro}\\par}\n`
      + dataTable('c>{\\raggedright\\arraybackslash}Xllll', ['#', 'Mahadasha', 'Begins', 'Ends', 'Length', 'Ages'].map((h) => (h === '#' ? h : kl(lang, h))), rows, { highlight: hl, fontPt: 9 }),
    evidenceIds: ['dasha.birth-lord', ...v.mahadashas.map((_, i) => `dasha.md.${pad2(i + 1)}`)],
    method: kl(lang, 'Vimshottari dasha (120-year cycle) from the Moon\'s nakshatra, year = 365.2425 days; the first period is shortened by the portion already elapsed before birth. The highlighted row is current on the report date.'),
  };
}

function miniTable(title: string, rows: Array<[string, string, string?]>, activeRow: number, three: boolean, lang: ReportLanguage): string {
  const spec = three ? '@{}l@{\\hspace{3pt}}r@{\\hspace{4pt}}r@{}' : '@{}l@{\\hspace{4pt}}r@{}';
  const body = rows.map(([a, b, c], i) => `${i === activeRow ? '\\rowcolor{Accent!22}' : ''}${a} & ${b}${three ? ` & ${c ?? ''}` : ''}\\\\`).join('\n');
  return [
    `{\\sffamily\\fontsize{7.4}{9}\\selectfont\\bfseries\\color{Primary}${title}}\\par\\vspace{0.6mm}`,
    `{\\fontsize{7.1}{8.5}\\selectfont\\renewcommand{\\arraystretch}{1.08}\\begin{tabular}{${spec}}`,
    `${(three ? ['Period', 'From', 'To'] : ['Period', 'Ends']).map((h) => `{\\color{Muted}\\itshape ${kl(lang, h)}}`).join(' & ')}\\\\[-0.5pt]`,
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
  const lang = blockLang(ctx);
  const planet = (symbol: string) => tex(planetLabel(lang, planetName(symbol)));
  const cells = v.mahadashas.map((md) => {
    const ads = md.subPeriods ?? [];
    const active = ads.findIndex((ad) => isActive(ctx, ad));
    return miniTable(`${planet(md.lord).toUpperCase()} ${kl(lang, 'MAHADASHA')}`, ads.map((ad) => [planet(ad.lord), dmy(ad.startDateIso), dmy(ad.endDateIso)]), active, true, lang);
  });
  return {
    tex: gridOf(cells),
    evidenceIds: v.mahadashas.map((_, i) => `kundli.md.${pad2(i + 1)}.antardashas`),
    method: kl(lang, 'Antardashas (sub-periods) of every Mahadasha, dates dd-mm-yyyy. Sub-periods before birth are omitted. The highlighted row is current on the report date.'),
  };
}

export function kundliPdGrids(ctx: BlockContext): BlockOutput {
  const v = kundliExt(ctx).dasha;
  const lang = blockLang(ctx);
  const planet = (symbol: string) => tex(planetLabel(lang, planetName(symbol)));
  const blocks = v.mahadashas.map((md) => {
    const cells = (md.subPeriods ?? []).map((ad) => {
      const pds = ad.subPeriods ?? [];
      const active = pds.findIndex((pd) => isActive(ctx, pd));
      return miniTable(`${abbr(lang, planetName(md.lord))}--${planet(ad.lord)} \\textmd{${pick(lang, `from ${dmy(ad.startDateIso)}`, `${dmy(ad.startDateIso)} से`)}}`,
        pds.map((pd) => [planet(pd.lord), dmy(pd.endDateIso)]), active, false, lang);
    });
    return `\\needspace{18\\baselineskip}{\\sffamily\\fontsize{8.6}{10}\\selectfont\\bfseries\\color{Accent}${planet(md.lord).toUpperCase()} ${kl(lang, 'MAHADASHA')}\\enspace\\textmd{\\color{Muted}${dateIn(lang, md.startDateIso)} -- ${dateIn(lang, md.endDateIso)}}}\\par\\vspace{1.2mm}{\\color{Rule}\\rule{\\linewidth}{0.4pt}}\\par\\vspace{1.5mm}\n${gridOf(cells)}`;
  });
  return {
    tex: blocks.join('\n\\vspace{2mm}\n'),
    evidenceIds: v.mahadashas.map((_, i) => `kundli.md.${pad2(i + 1)}.period`),
    method: kl(lang, 'Pratyantardashas (sub-sub-periods) for every Mahadasha and Antardasha of life; each list shows the date on which the period ends (dd-mm-yyyy), beginning from the date in its heading.'),
  };
}

const RELATION_NOTE: Record<number, string> = {
  1: 'same sign', 2: '2nd', 3: '3rd', 4: '4th (kendra)', 5: '5th (trikona)', 6: '6th', 7: '7th (kendra)', 8: '8th', 9: '9th (trikona)', 10: '10th (kendra)', 11: '11th', 12: '12th',
};

/** Position of the sub-period lord counted from the period lord, in the block's language. */
function relationNote(lang: ReportLanguage, n: number): string {
  if (lang === 'en') return RELATION_NOTE[n];
  if (n === 1) return 'उसी राशि में';
  const group = [4, 7, 10].includes(n) ? ` (${kl(lang, 'kendra')})` : [5, 9].includes(n) ? ` (${kl(lang, 'trikona')})` : '';
  return `${ordHi(n, 'm')}${group}`;
}

/** "At a glance" card for the n-th Mahadasha of life (1-based). */
export function kundliMdGlance(n: number): BlockRenderer {
  return (ctx) => {
    const { natal } = ctx.snapshot;
    const lang = blockLang(ctx);
    const L = (en: string) => kl(lang, en);
    const md = kundliExt(ctx).dasha.mahadashas[n - 1];
    if (!md) throw new Error(`BLOCK_DATA_MISSING: Mahadasha ${n}`);
    const lord = planetName(md.lord);
    const lordName = planetLabel(lang, lord);
    const lp = planetOf(natal, lord);
    const t = Date.parse(ctx.snapshot.asOfIso);
    const status = Date.parse(md.endDateIso) <= t ? 'Completed' : Date.parse(md.startDateIso) <= t ? 'Running now' : 'Ahead';
    const rules = lp.lordship.length ? `rules the ${lp.lordship.map(ordinal).join(' and ')}` : 'rules no house (shadow planet)';
    const retro = lp.retrograde && lord !== 'Rahu' && lord !== 'Ketu';
    const placement = pick(lang,
      `${lord} sits in the ${ordinal(lp.house)} house in ${lp.sign} (${lp.nakshatra} nakshatra), ${rules}, dignity ${dignityText(lp.dignity).toLowerCase()}${retro ? ', retrograde' : ''}${lp.combust ? ', combust' : ''}.`,
      `${lordName} आपकी कुंडली में ${ordHi(lp.house, 'obl')} भाव में ${signLabel(lang, lp.sign)} राशि (${nakshatraLabel(lang, lp.nakshatra)} नक्षत्र) में स्थित है, ${
        lp.lordship.length ? `${listIn(lang, lp.lordship.map((h) => ordHi(h, 'obl')))} भाव का स्वामी है` : 'किसी भाव का स्वामी नहीं है (छाया ग्रह)'
      }, स्थिति: ${dignityIn(lang, lp.dignity)}${retro ? ', वक्री' : ''}${lp.combust ? ', अस्त' : ''}।`);
    const card = [
      '\\begin{asHighlight}',
      `{\\displayfont\\fontsize{15}{18}\\selectfont\\color{Primary}${tex(lordName)} ${L('Mahadasha')}\\par}\\vspace{1mm}`,
      `{\\sffamily\\fontsize{8.2}{11}\\selectfont\\color{Ink}${dateIn(lang, md.startDateIso)} -- ${dateIn(lang, md.endDateIso)}\\enspace\\textbar\\enspace ${L('ages')} ${Math.floor(age(ctx, md.startDateIso))}--${Math.floor(age(ctx, md.endDateIso))}\\enspace\\textbar\\enspace ${duration(md, lang)}\\enspace\\textbar\\enspace \\textbf{${L(status)}}\\par}\\vspace{1mm}`,
      `{\\fontsize{9.2}{12.5}\\selectfont ${tex(placement)}\\par}`,
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
        `\\textbf{${tex(planetLabel(lang, al))}}`, dmy(ad.startDateIso), dmy(ad.endDateIso), `${months}`,
        `${pick(lang, ordinal(ap.house), String(ap.house))}, ${tex(signLabel(lang, ap.sign))}`,
        tex(rel.fromParent === 1 && rel.natural === 'Self' ? L('itself') : relationNote(lang, rel.fromParent)), tex(rel.natural === 'Self' ? '--' : L(rel.natural)),
      ];
    });
    const table = dataTable('>{\\raggedright\\arraybackslash}p{0.11\\linewidth}lll>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}p{0.15\\linewidth}l',
      [L('Antardasha'), L('From'), L('To'), L('Months'), L('Its lord sits in'), pick(lang, `From ${lord}`, `${lordName} से`), L('Natural tie')], rows, { highlight: hl, fontPt: 8.2 });
    return {
      tex: `${card}\n${table}`,
      evidenceIds: [`dasha.md.${pad2(n)}`, `kundli.md.${pad2(n)}.lord-house`, `kundli.md.${pad2(n)}.lord-sign`, `kundli.md.${pad2(n)}.antardashas`],
      method: pick(lang,
        `For each Antardasha the table locates its lord in your birth chart, counts its sign from the Mahadasha lord (${lord}) and gives their natural (naisargika) relationship from ${lord}'s side. Classical dasha reading begins from these facts; they are shown here without grading.`,
        `हर अंतर्दशा के लिए यह तालिका उसके स्वामी को आपकी जन्म कुंडली में दिखाती है, महादशा स्वामी (${lordName}) से उसकी राशि गिनती है और ${lordName} की ओर से दोनों का नैसर्गिक संबंध बताती है। शास्त्रीय दशा फल इन्हीं तथ्यों से आरंभ होता है; यहाँ इन्हें बिना किसी श्रेणी के दिखाया गया है।`),
    };
  };
}
