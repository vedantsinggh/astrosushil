/**
 * Saturn report blocks: Sade Sati status, lifetime timeline, cycle tables and
 * Kantaka/Dhaiya tables. Rendered only from the module's `ext` (solver output).
 */
import { ordinal } from '../../evidence/evidence-registry';
import { pick, signLabel } from '../../i18n/hindi';
import { BlockContext, BlockOutput, BlockRenderer, blockLang, timelineTex } from '../../render/blocks';
import { formatDate, tex } from '../../render/latex';
import { card, dateL, kvTableL, ord, PHASE_LABEL, pickLazy, signAt, signName, spanL, tableTex, YEAR_MS } from '../_planet-transit-shared';
import { SaturnExt } from './saturn.calc';
import { KANTAK_LABEL_HI, PHASE_LABEL_HI, PHASE_WORD_HI, sl } from './saturn.hindi';

const SHORT = { rising: 'Rising (12th from Moon)', peak: 'Peak (Moon sign)', setting: 'Setting (2nd from Moon)' } as const;
const nn = (n: number) => String(n).padStart(2, '0');

function life(ctx: BlockContext) {
  const e = ctx.ext as unknown as SaturnExt;
  if (!e?.life) throw new Error('BLOCK_DATA_MISSING: saturn lifetime');
  return e.life;
}

export function sadeSatiStatusBlock(ctx: BlockContext): BlockOutput {
  const L = life(ctx);
  const st = L.status;
  const next = L.nextCycle !== undefined ? L.cycles[L.nextCycle] : undefined;
  const cur = st.active ? L.cycles.find((c) => c.n === st.cycle) : undefined;
  const m = L.moonSign;
  const lang = blockLang(ctx);
  const sign = (i: number) => signLabel(lang, signName(i));
  const rows: Array<[string, string]> = [
    [sl(lang, 'Your Moon sign'), sign(m)],
    [sl(lang, 'Sade Sati signs'), pickLazy(lang,
      () => `${signName(signAt(m, 12))} (rising), ${signName(m)} (peak), ${signName(signAt(m, 2))} (setting)`,
      () => `${sign(signAt(m, 12))} (${PHASE_WORD_HI.rising}), ${sign(m)} (${PHASE_WORD_HI.peak}), ${sign(signAt(m, 2))} (${PHASE_WORD_HI.setting})`)],
    [pick(lang, `Status on ${formatDate(ctx.snapshot.asOfIso)}`, `${dateL('hi', ctx.snapshot.asOfIso)} को स्थिति`), pickLazy(lang,
      () => (st.active ? `Active: cycle ${st.cycle}, ${PHASE_LABEL[st.phase!]}` : `Not active (Saturn in ${st.saturnSign}, ${ordinal(st.saturnHouseFromMoon)} from the Moon)`),
      () => (st.active ? `चल रही है: चक्र ${st.cycle}, ${PHASE_LABEL_HI[st.phase!]}` : `नहीं चल रही (शनि ${signLabel('hi', st.saturnSign)} में, चंद्र से ${ord('hi', st.saturnHouseFromMoon)})`))],
  ];
  if (cur) rows.push([sl(lang, 'Current cycle'), pick(lang, `${formatDate(cur.startIso)} to ${formatDate(cur.endIso)}`, `${dateL('hi', cur.startIso)} से ${dateL('hi', cur.endIso)} तक`)]);
  rows.push([sl(lang, 'Next cycle begins'), next ? pick(lang, `${formatDate(next.startIso)} (age ${next.ageAtStart})`, `${dateL('hi', next.startIso)} (आयु ${next.ageAtStart})`) : sl(lang, 'no further cycle before age 90')]);
  rows.push([sl(lang, 'Cycles in a 90-year life'), `${L.cycles.length}`]);
  return {
    tex: kvTableL(lang, rows),
    evidenceIds: ['sadesati.signs', 'sadesati.status', 'sadesati.next', 'sadesati.count'],
    method: sl(lang, 'Status read directly from solved Saturn sign spans on the report date, so retrograde re-entries are honoured.'),
  };
}

export function lifetimeTimelineBlock(ctx: BlockContext): BlockOutput {
  const L = life(ctx);
  const lang = blockLang(ctx);
  /** A fixed caption of the drawing; Hindi passes through tex() (NFC) like every dynamic text. */
  const cap = (en: string) => (lang === 'en' ? en : tex(sl(lang, en)));
  const birth = Date.parse(L.birthIso);
  const W = 138; // mm for 90 years
  const x = (iso: string) => Math.min(90, Math.max(0, (Date.parse(iso) - birth) / YEAR_MS)) * (W / 90);
  const fill: Record<string, string> = { rising: 'Accent!55', peak: 'Primary!80', setting: 'Accent!85' };
  const parts: string[] = ['\\begin{center}\\begin{tikzpicture}[x=1mm,y=1mm]'];
  parts.push(`\\fill[Surface] (0,0) rectangle (${W},30);`);
  for (let a = 0; a <= 90; a += 10) {
    const xx = (a * W) / 90;
    parts.push(`\\draw[Rule] (${xx},0) -- (${xx},30); \\node[font=\\sffamily\\fontsize{6.5}{8}\\selectfont,text=Muted,below] at (${xx},0) {${a}};`);
  }
  parts.push(`\\node[font=\\sffamily\\fontsize{6.5}{8}\\selectfont\\bfseries,text=Primary,anchor=east,align=right] at (-1.5,20) {${lang === 'hi' ? `${tex('साढ़े')}\\\\${tex('साती')}` : 'SADE\\\\SATI'}};`);
  parts.push(`\\node[font=\\sffamily\\fontsize{6.5}{8}\\selectfont\\bfseries,text=Primary,anchor=east,align=right] at (-1.5,7) {${lang === 'hi' ? `${tex('कंटक')}\\\\${tex('और ढैया')}` : 'KANTAKA\\\\\\& DHAIYA'}};`);
  for (const c of L.cycles) {
    for (const p of c.phases) {
      for (const s of p.spans) {
        const a = x(s.startIso);
        const b = x(s.endIso);
        if (b - a > 0.05) parts.push(`\\fill[${fill[p.key]}] (${a.toFixed(2)},16) rectangle (${b.toFixed(2)},24);`);
      }
    }
    parts.push(`\\node[font=\\sffamily\\fontsize{6}{7}\\selectfont,text=Ink] at (${((x(c.startIso) + x(c.endIso)) / 2).toFixed(2)},26.5) {${lang === 'hi' ? tex(`चक्र ${c.n}`) : `Cycle ${c.n}`}};`);
  }
  for (const k of L.kantak) {
    const col = k.houseFromMoon === 8 ? 'Caution!55' : k.houseFromMoon === 4 ? 'Caution!35' : 'Primary!30';
    for (const s of k.spans) {
      const a = x(s.startIso);
      const b = x(s.endIso);
      if (b - a > 0.05) parts.push(`\\fill[${col}] (${a.toFixed(2)},3) rectangle (${b.toFixed(2)},11);`);
    }
  }
  const now = x(ctx.snapshot.asOfIso);
  parts.push(`\\draw[Caution,line width=0.8pt] (${now.toFixed(2)},-0.5) -- (${now.toFixed(2)},30.5); \\node[font=\\sffamily\\fontsize{6}{7}\\selectfont\\bfseries,text=Caution,above] at (${now.toFixed(2)},30.5) {${cap('today')}};`);
  parts.push(`\\node[font=\\sffamily\\fontsize{6.5}{8}\\selectfont,text=Muted] at (${W / 2},-5.5) {${cap('Age in years')}};`);
  parts.push('\\end{tikzpicture}\\end{center}');
  const legend = `{\\sffamily\\fontsize{7.2}{9}\\selectfont\\color{Ink}\\textcolor{Accent!55}{\\rule{3mm}{2mm}} ${cap('Rising (12th)')}\\quad \\textcolor{Primary!80}{\\rule{3mm}{2mm}} ${cap('Peak (Moon sign)')}\\quad \\textcolor{Accent!85}{\\rule{3mm}{2mm}} ${cap('Setting (2nd)')}\\quad \\textcolor{Caution!35}{\\rule{3mm}{2mm}} ${cap('4th: Kantaka + Dhaiya')}\\quad \\textcolor{Primary!30}{\\rule{3mm}{2mm}} ${cap('7th / 10th: Kantaka')}\\quad \\textcolor{Caution!55}{\\rule{3mm}{2mm}} ${cap('8th: Dhaiya')}\\par}`;
  return {
    tex: parts.join('\n') + '\n\\begin{center}' + legend + '\\end{center}',
    evidenceIds: [...L.cycles.map((c) => `sadesati.cycle.${nn(c.n)}.span`), ...L.kantak.map((k) => `kantak.period.${nn(k.n)}`)],
    method: sl(lang, 'Every Saturn transit of the 12th, 1st and 2nd (Sade Sati) and of the 4th, 7th, 8th and 10th (Kantaka/Dhaiya) from your Moon sign, birth to age 90, drawn to scale from solved ingress dates. Gaps inside a bar are retrograde returns to the previous sign.'),
  };
}

export function sadeSatiCyclesBlock(ctx: BlockContext): BlockOutput {
  const L = life(ctx);
  const lang = blockLang(ctx);
  const rows: string[][] = [];
  const tlItems: Array<{ date: string; title: string; detail?: string; active?: boolean }> = [];
  const nowMs = Date.parse(ctx.snapshot.asOfIso);
  for (const c of L.cycles) {
    c.phases.forEach((p, i) => {
      const active = Date.parse(p.startIso) <= nowMs && nowMs < Date.parse(p.endIso);
      rows.push([
        i === 0 ? `\\textbf{${c.n}}` : '',
        tex(lang === 'hi' ? PHASE_LABEL_HI[p.key] : SHORT[p.key]),
        tex(signLabel(lang, p.sign)),
        p.spans.map((s) => tex(spanL(lang, s))).join('\\newline '),
        tex(`${Math.max(0, Math.floor((Date.parse(p.startIso) - Date.parse(L.birthIso)) / YEAR_MS))}–${Math.max(0, Math.floor((Date.parse(p.endIso) - Date.parse(L.birthIso)) / YEAR_MS))}`),
      ]);
      if (c.n === L.status.cycle || c.n === (L.nextCycle !== undefined ? L.cycles[L.nextCycle]?.n : 1) || (c.n === 1 && !L.status.active && L.nextCycle === undefined)) {
        tlItems.push({
          date: p.spans.map((s) => spanL(lang, s)).join('; '),
          title: `${lang === 'hi' ? `चक्र ${c.n}` : `Cycle ${c.n}`} · ${signLabel(lang, p.sign)}`,
          detail: lang === 'hi' ? PHASE_LABEL_HI[p.key] : SHORT[p.key],
          active,
        });
      }
    });
  }
  const notes = L.cycles.filter((c) => c.beganBeforeBirth).map((c) => pick(lang,
    `Cycle ${c.n} was already running when you were born; dates before birth are shown so the phases are complete.`,
    `चक्र ${c.n} आपके जन्म के समय पहले से चल रहा था; चरणों को पूरा दिखाने के लिए जन्म से पहले की तिथियाँ भी दी गई हैं।`));
  return {
    tex: (tlItems.length ? timelineTex(tlItems) + '\n' : '') +
      tableTex('p{0.06\\linewidth}>{\\raggedright\\arraybackslash}p{0.2\\linewidth}p{0.11\\linewidth}>{\\raggedright\\arraybackslash}X p{0.08\\linewidth}', ['Cycle', 'Phase', 'Saturn in', 'Dates (each continuous span)', 'Ages'].map((h) => (lang === 'en' ? h : tex(sl(lang, h)))), rows) +
      (notes.length ? '\n' + card(sl(lang, 'Born during a Sade Sati'), tex(notes.join(' ')), 'asCard') : ''),
    evidenceIds: L.cycles.flatMap((c) => [`sadesati.cycle.${nn(c.n)}.span`, ...c.phases.map((p) => `sadesati.cycle.${nn(c.n)}.${p.key}`)]),
    method: sl(lang, 'A cycle runs from Saturn\'s first ingress into the 12th sign from the Moon to its final egress from the 2nd (decision PT-003). Where Saturn retrogrades back across a boundary, each continuous span is listed, so phases may overlap by a few months; nothing is rounded to contiguous blocks.'),
  };
}

export function kantakBlock(ctx: BlockContext): BlockOutput {
  const L = life(ctx);
  const lang = blockLang(ctx);
  const rounds = [...new Set(L.kantak.map((k) => k.round))];
  const parts: string[] = [];
  for (const r of rounds) {
    const ks = L.kantak.filter((k) => k.round === r);
    parts.push(`{\\sffamily\\fontsize{8.5}{10.5}\\selectfont\\bfseries\\color{Primary}${lang === 'hi' ? tex(`शनि का फेरा ${r}: आयु ${ks[0].ageAtStart}–${ks[ks.length - 1].ageAtEnd}`) : `SATURN'S ROUND ${r}: AGES ${ks[0].ageAtStart}--${ks[ks.length - 1].ageAtEnd}`}\\par}`);
    parts.push(tableTex('>{\\raggedright\\arraybackslash}p{0.24\\linewidth}p{0.11\\linewidth}>{\\raggedright\\arraybackslash}X p{0.1\\linewidth}p{0.08\\linewidth}', ['Transit', 'Saturn in', 'Dates (each continuous span)', 'From Lagna', 'Ages'].map((h) => (lang === 'en' ? h : tex(sl(lang, h)))),
      ks.map((k) => [tex(lang === 'hi' ? KANTAK_LABEL_HI[k.houseFromMoon] : k.label), tex(signLabel(lang, k.sign)), k.spans.map((s) => tex(spanL(lang, s))).join('\\newline '), tex(ord(lang, k.houseFromLagna)), tex(`${k.ageAtStart}–${k.ageAtEnd}`)])));
  }
  return {
    tex: parts.join('\n'),
    evidenceIds: ['kantak.signs', ...L.kantak.map((k) => `kantak.period.${nn(k.n)}`)],
    method: sl(lang, 'Kantaka Shani = Saturn transiting the 4th, 7th or 10th sign from the Moon (kendras); Dhaiya = the 4th (Ardhashtama) and 8th (Ashtama) from the Moon (decision PT-004). Solved from Saturn ingresses, birth to age 90.'),
  };
}

export const SATURN_BLOCKS: Record<string, BlockRenderer> = {
  'saturn-sadesati-status': sadeSatiStatusBlock,
  'saturn-lifetime-timeline': lifetimeTimelineBlock,
  'saturn-sadesati-cycles': sadeSatiCyclesBlock,
  'saturn-kantak': kantakBlock,
};
