/** Chart and position blocks: South Indian D1, Moon chart, divisional charts, planet/house/varga/aspect tables. */
import { VargaType } from '@astro/astrology-engine';
import { BlockContext, blockLang, BlockOutput, northChart } from '../../../render/blocks';
import { tex } from '../../../render/latex';
import { ordinal, planetName, SIGNS } from '../../../evidence/evidence-registry';
import { kundliExt } from '../extend';
import { dignityLabel, label, nakshatraLabel, planetLabel, signLabel } from '../../../i18n/hindi';
import { ABBR, dataTable, degMin, dignityText, list, PLANET_ORDER, planetOf, SIGN_SHORT } from './common';

/** Fixed sign cells of the South Indian chart: [column, row] from bottom-left, sign 1 = Aries. */
const SOUTH_CELLS: Record<number, [number, number]> = {
  12: [0, 3], 1: [1, 3], 2: [2, 3], 3: [3, 3],
  4: [3, 2], 5: [3, 1],
  6: [3, 0], 7: [2, 0], 8: [1, 0], 9: [0, 0],
  10: [0, 1], 11: [0, 2],
};

export function southChart(cells: Record<number, string[]>, ascSign: number, centre: string, unit = 14): string {
  const parts: string[] = [
    `\\begin{tikzpicture}[x=${unit}mm,y=${unit}mm]`,
    '\\fill[Tint] (0,0) rectangle (4,4);',
    '\\fill[white] (1,1) rectangle (3,3);',
    '\\draw[Primary!55,line width=0.5pt] (0,1)--(4,1) (0,3)--(4,3) (1,0)--(1,4) (3,0)--(3,4) (0,2)--(1,2) (3,2)--(4,2) (2,0)--(2,1) (2,3)--(2,4);',
    '\\draw[Primary,line width=1.1pt] (0,0) rectangle (4,4);',
    '\\draw[Accent,line width=0.6pt] (1,1) rectangle (3,3);',
    `\\node[align=center,font=\\displayfont\\fontsize{11}{13}\\selectfont,text=Primary] at (2,2) {${centre}};`,
  ];
  for (let s = 1; s <= 12; s++) {
    const [c, r] = SOUTH_CELLS[s];
    parts.push(`\\node[anchor=north west,inner sep=1.5pt,font=\\sffamily\\fontsize{5.5}{6}\\selectfont,text=Accent] at (${c},${r + 1}) {${SIGN_SHORT[s - 1]}};`);
    if (s === ascSign) parts.push(`\\draw[Accent,line width=0.8pt] (${c + 0.72},${r + 1}) -- (${c + 1},${r + 0.72});`);
    const lines = cells[s] ?? [];
    if (lines.length) {
      parts.push(`\\node[align=center,font=\\sffamily\\fontsize{6.6}{7.6}\\selectfont,text=Ink] at (${c + 0.5},${r + 0.45}) {${lines.map(tex).join('\\\\')}};`);
    }
  }
  parts.push('\\end{tikzpicture}');
  return parts.join('\n');
}

/** Pair planet abbreviations two per line so small charts stay legible. */
function pairLines(items: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < items.length; i += 2) out.push(items.slice(i, i + 2).join(' '));
  return out;
}

export function kundliSouthAndMoon(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const cells: Record<number, string[]> = {};
  const ascSign = natal.ascendant.rashiIndex;
  cells[ascSign] = ['Asc'];
  for (const p of natal.planets) {
    const n = planetName(p.name);
    (cells[p.rashiIndex] ??= []).push(`${ABBR[n]} ${Math.floor(p.degree)}°${p.retrograde && n !== 'Rahu' && n !== 'Ketu' ? 'R' : ''}`);
  }
  const moon = planetOf(natal, 'Moon');
  const houses = Array.from({ length: 12 }, (_, i) => ({ sign: ((moon.rashiIndex - 1 + i) % 12) + 1, lines: [] as string[] }));
  const items: Record<number, string[]> = {};
  for (const p of natal.planets) (items[(p.rashiIndex - moon.rashiIndex + 12) % 12] ??= []).push(ABBR[planetName(p.name)]);
  const ascIdx = (ascSign - moon.rashiIndex + 12) % 12;
  (items[ascIdx] ??= []).unshift('Asc');
  houses.forEach((h, i) => (h.lines = pairLines(items[i] ?? [])));
  return {
    tex: [
      '\\begin{center}',
      `\\begin{minipage}[t]{0.49\\linewidth}\\centering{\\sffamily\\fontsize{8}{10}\\selectfont\\bfseries\\color{Primary}SOUTH INDIAN STYLE (D1)}\\par\\vspace{2mm}${southChart(cells, ascSign, 'Rasi\\\\[-1pt]{\\fontsize{8}{10}\\selectfont D1}', 13.5)}\\end{minipage}\\hfill`,
      `\\begin{minipage}[t]{0.49\\linewidth}\\centering{\\sffamily\\fontsize{8}{10}\\selectfont\\bfseries\\color{Primary}MOON CHART (CHANDRA LAGNA)}\\par\\vspace{2mm}${northChart(houses, 0.675)}\\end{minipage}`,
      '\\end{center}',
    ].join('\n'),
    evidenceIds: ['asc.d1.sign', 'planet.moon.d1.sign', ...natal.planets.map((p) => `planet.${planetName(p.name).toLowerCase()}.d1.sign`)],
    method: 'South Indian chart: signs are fixed (Aries is the second box of the top row, counting clockwise); the diagonal stroke in the top-right corner of a box marks the Ascendant sign. The Moon chart treats the Moon\'s sign as the 1st house. R = retrograde (Rahu and Ketu always move backwards and are not marked).',
  };
}

// --- Divisional charts --------------------------------------------------------

export const VARGA_SET: Array<{ v: VargaType; name: string; purpose: string }> = [
  { v: 'D2', name: 'Hora', purpose: 'Wealth and resources' },
  { v: 'D3', name: 'Drekkana', purpose: 'Siblings, courage, initiative' },
  { v: 'D4', name: 'Chaturthamsa', purpose: 'Home, property, fortune' },
  { v: 'D7', name: 'Saptamsa', purpose: 'Children and creativity' },
  { v: 'D9', name: 'Navamsa', purpose: 'Marriage, dharma, inner strength' },
  { v: 'D10', name: 'Dasamsa', purpose: 'Career and public standing' },
  { v: 'D12', name: 'Dwadasamsa', purpose: 'Parents and lineage' },
  { v: 'D16', name: 'Shodasamsa', purpose: 'Vehicles, comforts, happiness' },
  { v: 'D20', name: 'Vimsamsa', purpose: 'Worship and spiritual practice' },
  { v: 'D24', name: 'Chaturvimsamsa', purpose: 'Learning and education' },
  { v: 'D27', name: 'Saptavimsamsa', purpose: 'Strength and stamina' },
  { v: 'D30', name: 'Trimsamsa', purpose: 'Adversity and resilience' },
  { v: 'D40', name: 'Khavedamsa', purpose: 'Maternal legacy, wellbeing' },
  { v: 'D45', name: 'Akshavedamsa', purpose: 'Paternal legacy, character' },
  { v: 'D60', name: 'Shashtiamsa', purpose: 'Overall karma, fine detail' },
];

export const KUNDLI_VARGAS: VargaType[] = ['D1', ...VARGA_SET.map((x) => x.v)];

function smallVargaChart(ctx: BlockContext, v: VargaType): string {
  const chart = ctx.snapshot.vargas[v];
  if (!chart?.ascendant) throw new Error(`BLOCK_DATA_MISSING: ${v}`);
  const asc = chart.ascendant.rashiIndex;
  const items: Record<number, string[]> = { 0: ['As'] };
  for (const pl of Object.values(chart.placements)) {
    if (pl.planet === 'Ascendant') continue;
    (items[(pl.rashiIndex - asc + 12) % 12] ??= []).push(ABBR[planetName(String(pl.planet))]);
  }
  const houses = Array.from({ length: 12 }, (_, i) => ({ sign: ((asc - 1 + i) % 12) + 1, lines: pairLines(items[i] ?? []) }));
  return northChart(houses, 0.6);
}

export function kundliVargaCharts(ctx: BlockContext): BlockOutput {
  const cells = VARGA_SET.map(({ v, name, purpose }) =>
    `\\begin{minipage}[t]{0.32\\linewidth}\\centering{\\sffamily\\fontsize{7.6}{9}\\selectfont\\bfseries\\color{Primary}${tex(`${v} ${name}`.toUpperCase())}}\\par{\\fontsize{7.4}{9}\\selectfont\\itshape\\color{Muted}${tex(purpose)}\\par}\\vspace{1mm}${smallVargaChart(ctx, v)}\\end{minipage}`);
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 3) rows.push(`\\noindent ${cells.slice(i, i + 3).join('\\hfill')}\\par\\vspace{4mm}`);
  return {
    tex: rows.join('\n'),
    evidenceIds: VARGA_SET.map(({ v }) => `asc.${v.toLowerCase()}.sign`),
    method: 'Each divisional chart (varga) re-divides every sign by the number shown (D9 = nine parts) using the Brihat Parashara Hora Shastra rules in the divisional-chart engine. North Indian style; numbers are signs, the top diamond is the varga ascendant (As).',
  };
}

export function kundliVargaTable(ctx: BlockContext): BlockOutput {
  const { natal, vargas } = ctx.snapshot;
  const header = ['Chart', 'Asc', ...PLANET_ORDER.map((p) => ABBR[p])];
  const rows = KUNDLI_VARGAS.map((v) => {
    if (v === 'D1') return ['\\textbf{D1 Rasi}', SIGN_SHORT[natal.ascendant.rashiIndex - 1], ...PLANET_ORDER.map((p) => SIGN_SHORT[planetOf(natal, p).rashiIndex - 1])];
    const ch = vargas[v];
    if (!ch?.ascendant) throw new Error(`BLOCK_DATA_MISSING: ${v}`);
    const byPlanet = new Map(Object.values(ch.placements).map((pl) => [String(pl.planet), pl.rashiIndex]));
    const name = VARGA_SET.find((x) => x.v === v)!.name;
    return [`\\textbf{${v}} ${tex(name)}`, SIGN_SHORT[ch.ascendant.rashiIndex - 1], ...PLANET_ORDER.map((p) => SIGN_SHORT[(byPlanet.get(p.toUpperCase()) ?? 0) - 1] ?? '--')];
  });
  return {
    tex: dataTable(`>{\\raggedright\\arraybackslash}p{0.2\\linewidth}*{10}{>{\\centering\\arraybackslash}X}`, header, rows, { fontPt: 8.2 }),
    evidenceIds: ['asc.d1.sign', ...VARGA_SET.map(({ v }) => `asc.${v.toLowerCase()}.sign`)],
    method: 'Sign occupied by the Ascendant and each planet in every divisional chart (Shodashavarga set computed by the engine).',
  };
}

// --- Planet and house tables ------------------------------------------------------

export function kundliPlanetTable(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const lang = blockLang(ctx);
  const asc = natal.ascendant;
  const dignity = (d: string) => (lang === 'hi' ? dignityLabel(lang, String(d)) : dignityText(d));
  const rows: string[][] = [[
    `\\textbf{${tex(label(lang, 'Ascendant'))}}`, tex(signLabel(lang, asc.sign)), degMin(asc.degree), `${tex(nakshatraLabel(lang, asc.nakshatra))} ${asc.pada}`,
    tex(planetLabel(lang, planetName(asc.lord))), '--', '1', '--', '--', '--',
  ]];
  for (const n of PLANET_ORDER) {
    const p = planetOf(natal, n);
    const flags = [p.retrograde ? label(lang, 'R') : '', p.combust ? label(lang, 'C') : ''].filter(Boolean).join(' ') || '--';
    const signLord = planetName(natal.houses.find((h) => h.rashiIndex === p.rashiIndex)!.lord);
    rows.push([
      `\\textbf{${tex(planetLabel(lang, n))}}`, tex(signLabel(lang, p.sign)), degMin(p.degree), `${tex(nakshatraLabel(lang, p.nakshatra))} ${p.pada}`,
      tex(planetLabel(lang, signLord)), tex(planetLabel(lang, planetName(p.nakshatraLord))),
      String(p.house), tex(dignity(p.dignity)), flags, typeof p.speedLongitude === 'number' ? p.speedLongitude.toFixed(3) : '--',
    ]);
  }
  return {
    tex: dataTable('>{\\raggedright\\arraybackslash}p{0.1\\linewidth}>{\\raggedright\\arraybackslash}p{0.085\\linewidth}rl>{\\raggedright\\arraybackslash}p{0.07\\linewidth}>{\\raggedright\\arraybackslash}p{0.07\\linewidth}c>{\\raggedright\\arraybackslash}Xcr',
      ['Planet', 'Sign', 'Degree', 'Nakshatra / pada', 'Sign lord', 'Nak. lord', 'House', 'Dignity', 'R / C', '°/day'].map((h) => label(lang, h)), rows, { fontPt: 7.9, tabcolsep: '3pt' }),
    evidenceIds: PLANET_ORDER.flatMap((n) => [`planet.${n.toLowerCase()}.d1.sign`, `planet.${n.toLowerCase()}.d1.degree`, `planet.${n.toLowerCase()}.d1.nakshatra`, `planet.${n.toLowerCase()}.d1.dignity`]),
    method: label(lang, 'Degree within the sign. R = retrograde, C = combust (within the classical distance of the Sun). Speed is daily motion in longitude; negative means retrograde. Rahu and Ketu are mean nodes and always retrograde.'),
  };
}

export function kundliHouseTable(ctx: BlockContext): BlockOutput {
  const { natal, ashtakavarga } = ctx.snapshot;
  const asp = kundliExt(ctx).houseAspects;
  const rows = natal.houses.map((h) => {
    const lord = planetName(h.lord);
    const lp = planetOf(natal, lord);
    return [
      `\\textbf{${ordinal(h.number)}}`, tex(h.sign), tex(lord), `${ordinal(lp.house)} (${tex(lp.sign)})`,
      tex(h.occupants.map((o) => planetName(o)).join(', ') || '--'), tex((asp[h.number] ?? []).join(', ') || '--'),
      String(ashtakavarga.sav.signs[h.rashiIndex] ?? '--'),
    ];
  });
  return {
    tex: dataTable('cl>{\\raggedright\\arraybackslash}p{0.09\\linewidth}>{\\raggedright\\arraybackslash}p{0.16\\linewidth}>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}X c',
      ['House', 'Sign', 'Lord', 'Lord placed in', 'Occupants', 'Aspected by', 'SAV'], rows, { fontPt: 8.2 }),
    evidenceIds: natal.houses.flatMap((h) => [`house.${h.number}.d1.sign`, `house.${h.number}.d1.lord-house`, `house.${h.number}.d1.occupants`, `kundli.house.${h.number}.aspected-by`, `sav.house.${h.number}`]),
    method: 'Whole Sign houses. Aspects are graha drishti: every planet aspects the 7th from itself; Mars also the 4th and 8th, Jupiter the 5th and 9th, Saturn the 3rd and 10th, and Rahu and Ketu the 5th and 9th (engine convention). SAV = Sarvashtakavarga bindus of the sign.',
  };
}

export function kundliAspectTable(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const rows = PLANET_ORDER.map((n) => {
    const p = planetOf(natal, n);
    const houses = (p.aspectsCast ?? []).slice().sort((a, b) => a - b);
    const signs = houses.map((h) => SIGNS[natal.houses.find((x) => x.number === h)!.rashiIndex - 1]);
    const targets = natal.planets.filter((o) => o.name !== p.name && houses.includes(o.house)).map((o) => planetName(o.name));
    const from = (p.aspectsReceived ?? []).map((s) => planetName(s));
    return [`\\textbf{${n}}`, `${p.house}`, tex(houses.map(ordinal).join(', ')), tex(signs.join(', ')), tex(targets.join(', ') || '--'), tex(from.join(', ') || '--')];
  });
  return {
    tex: dataTable('lc>{\\raggedright\\arraybackslash}p{0.15\\linewidth}>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}p{0.16\\linewidth}>{\\raggedright\\arraybackslash}p{0.16\\linewidth}',
      ['Planet', 'House', 'Aspects houses', 'Signs aspected', 'Planets aspected', 'Aspected by'], rows, { fontPt: 8.2 }),
    evidenceIds: PLANET_ORDER.flatMap((n) => [`kundli.planet.${n.toLowerCase()}.aspects-houses`, `kundli.planet.${n.toLowerCase()}.aspects-planets`, `planet.${n.toLowerCase()}.d1.aspected-by`]),
    method: 'Graha drishti by whole signs (Parashari). Special aspects: Mars 4th and 8th, Jupiter 5th and 9th, Saturn 3rd and 10th, Rahu and Ketu 5th and 9th, in addition to the 7th for all.',
  };
}

export { list };
