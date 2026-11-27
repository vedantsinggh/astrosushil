/**
 * Deterministic content blocks (provenance `deterministic`).
 *
 * Each block renders LaTeX from the chart snapshot / evidence registry only and
 * reports which evidence it displayed, so the manifest can trace every number
 * in a table back to the engine.
 */
import { getNaturalRelationship, PlanetSymbol, VargaType } from '@astro/astrology-engine';
import { EvidenceRegistry, ordinal, planetName, SIGNS } from '../evidence/evidence-registry';
import { ChartSnapshot } from '../snapshot/chart-snapshot';
import { formatDate, tex } from './latex';

import { label, nakshatraLabel, pick, planetAbbr, planetLabel, ReportLanguage, signLabel } from '../i18n/hindi';
import { COLOUR_HI, dateLabel, GEM_HI, ordinalLabel, planetList, vargaMethodHi, weekdayLabel } from './blocks.hindi';

export interface BlockContext {
  snapshot: ChartSnapshot;
  registry: EvidenceRegistry;
  /** Second native for two-person reports. */
  partner?: ChartSnapshot;
  /** Report-specific computed data from the module's `extend` hook. */
  ext: Record<string, unknown>;
  /** Language of labels and notes (English when absent). */
  lang?: ReportLanguage;
}

/** The language a block labels itself in. */
export const blockLang = (ctx: BlockContext): ReportLanguage => ctx.lang ?? 'en';

export interface BlockOutput {
  tex: string;
  evidenceIds: string[];
  /** Short method note printed under the block. */
  method?: string;
}

export type BlockRenderer = (ctx: BlockContext) => BlockOutput;

const ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

export function northChart(houses: Array<{ sign: number; lines: string[] }>, scale = 0.95): string {
  const cell = (h: { sign: number; lines: string[] }) =>
    `\\SignNo{${h.sign}}${h.lines.length ? '\\\\' + h.lines.map(tex).join('\\\\') : ''}`;
  return `\\NorthChart{${scale}}${houses.map((h) => `{${cell(h)}}`).join('')}`;
}

/** Chart abbreviation of a planet in the block's language. */
const abbr = (lang: ReportLanguage, planet: string) => (lang === 'hi' ? planetAbbr(lang, planet) : ABBR[planet]);

export function d1Chart(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const lang = blockLang(ctx);
  const houses = natal.houses.map((h) => ({
    sign: h.rashiIndex,
    lines: natal.planets
      .filter((p) => p.house === h.number)
      .map((p) => `${abbr(lang, planetName(p.name))} ${Math.floor(p.degree)}°${p.retrograde ? ` ${label(lang, 'R')}` : ''}`),
  }));
  houses[0].lines.unshift(label(lang, 'Asc'));
  return {
    tex: `\\begin{center}${northChart(houses)}\\end{center}`,
    evidenceIds: ['asc.d1.sign', ...natal.planets.map((p) => `planet.${planetName(p.name).toLowerCase()}.d1.house`)],
    method: label(lang, 'North Indian style. Numbers are signs (1 = Aries … 12 = Pisces); the top diamond is the 1st house. R = retrograde.'),
  };
}

export function vargaChart(varga: VargaType): BlockRenderer {
  return (ctx) => {
    const lang = blockLang(ctx);
    const chart = ctx.snapshot.vargas[varga];
    if (!chart?.ascendant) throw new Error(`BLOCK_DATA_MISSING: ${varga}`);
    const ascSign = chart.ascendant.rashiIndex;
    const houses = Array.from({ length: 12 }, (_, i) => ({ sign: ((ascSign - 1 + i) % 12) + 1, lines: [] as string[] }));
    for (const pl of Object.values(chart.placements)) {
      if (pl.planet === 'Ascendant') continue;
      const h = ((pl.rashiIndex - ascSign + 12) % 12);
      houses[h].lines.push(abbr(lang, planetName(String(pl.planet))));
    }
    houses[0].lines.unshift(label(lang, 'Asc'));
    return {
      tex: `\\begin{center}${northChart(houses)}\\end{center}`,
      evidenceIds: [`asc.${varga.toLowerCase()}.sign`],
      method: lang === 'hi'
        ? vargaMethodHi(varga, chart.calculationRule)
        : `${chart.name} (${varga}), computed by the divisional-chart engine (${chart.calculationRule}).`,
    };
  };
}

/**
 * Two-column "factor / your chart" table. The headings follow `lang`; the rows are printed as
 * given, so a Hindi caller passes rows it has already put into Hindi.
 */
export function kvTable(rows: Array<[string, string]>, lang: ReportLanguage = 'en'): string {
  return [
    '\\begin{center}\\begin{tabularx}{0.86\\linewidth}{>{\\raggedright\\arraybackslash}p{0.38\\linewidth}X}',
    `\\TableHead\\THd{${tex(label(lang, 'Factor'))}} & \\THd{${tex(label(lang, 'Your chart'))}}\\\\`,
    ...rows.map(([k, v], i) => `${i % 2 ? '\\rowcolor{Surface}' : ''}\\TCell{\\textbf{${tex(k)}}} & \\TCell{${tex(v)}}\\\\`),
    '\\bottomrule\\end{tabularx}\\end{center}',
  ].join('\n');
}

function readBraced(s: string, start: number): { content: string; end: number } | undefined {
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

function expandColRepeats(spec: string): string {
  let out = '';
  for (let i = 0; i < spec.length; i++) {
    if (spec[i] === '*' && spec[i + 1] === '{') {
      const count = readBraced(spec, i + 1);
      if (count && spec[count.end] === '{') {
        const body = readBraced(spec, count.end);
        const n = Number(count.content);
        if (body && Number.isInteger(n) && n > 0 && n <= 30) {
          out += expandColRepeats(body.content).repeat(n);
          i = body.end - 1;
          continue;
        }
      }
    }
    out += spec[i];
  }
  return out;
}

/**
 * Convert a `tabularx` column specification into fixed-width `p{...}` columns
 * suitable for `longtable` with `\setlength{\tabcolsep}{3.5pt}`, guaranteeing
 * total width stays within `\linewidth` with zero right-margin clipping.
 */
export function tabularxSpecToLongtable(colSpec: string): string {
  const s = expandColRepeats(colSpec).replace(/@\{[^}]*\}/g, '');
  interface Col { prefix?: string; align: string; width?: number; isX: boolean }
  const cols: Col[] = [];
  let i = 0;
  while (i < s.length) {
    if (/\s|\|/.test(s[i])) { i++; continue; }
    let prefix: string | undefined;
    if (s[i] === '>' && s[i + 1] === '{') {
      const b = readBraced(s, i + 1);
      if (b) { prefix = b.content; i = b.end; }
    }
    while (i < s.length && /\s/.test(s[i])) i++;
    if (i >= s.length) break;
    const ch = s[i];
    if (ch === 'X') {
      cols.push({ prefix, align: '\\raggedright', isX: true });
      i++;
    } else if (ch === 'l' || ch === 'c' || ch === 'r') {
      const align = ch === 'c' ? '\\centering' : ch === 'r' ? '\\raggedleft' : '\\raggedright';
      cols.push({ prefix, align, width: ch === 'l' ? 0.14 : 0.09, isX: false });
      i++;
    } else if ((ch === 'p' || ch === 'm' || ch === 'b') && s[i + 1] === '{') {
      const b = readBraced(s, i + 1);
      if (b) {
        const lw = /([0-9.]+)\s*\\linewidth/.exec(b.content);
        const mm = /([0-9.]+)\s*mm/.exec(b.content);
        const w = lw ? Number(lw[1]) : mm ? Number(mm[1]) / 170 : 0.15;
        cols.push({ prefix, align: '\\raggedright', width: w, isX: false });
        i = b.end;
      } else { i++; }
    } else {
      i++;
    }
  }
  if (!cols.length) return colSpec;
  // Budget 0.97\linewidth minus 2*\tabcolsep (3.5pt ≈ 0.0145\linewidth per col).
  const budget = Math.max(0.55, 0.975 - cols.length * 0.0145);
  const xCount = cols.filter((c) => c.isX).length;
  const fixedSum = cols.reduce((acc, c) => acc + (c.isX ? 0 : (c.width ?? 0.14)), 0);
  const rawX = xCount > 0 ? Math.max(0.11, (budget - fixedSum) / xCount) : 0;
  const totalRaw = fixedSum + rawX * xCount;
  const scale = totalRaw > budget ? budget / totalRaw : 1;
  return cols.map((c) => {
    const w = ((c.isX ? rawX : (c.width ?? 0.14)) * scale).toFixed(3);
    const p = c.prefix ?? `${c.align}\\arraybackslash`;
    return `>{${p}}p{${w}\\linewidth}`;
  }).join('');
}

export interface LongTableOpts {
  font?: string;
  tabcolsep?: string;
  highlight?: number[];
  /** Pass true when `headers` and `rows` are already LaTeX-formatted (not plain text). */
  raw?: boolean;
}

/**
 * Multi-page `longtable` with repeating header (`\endfirsthead` and `\endhead`),
 * zebra striping (`Surface`), optional active-row highlight (`Tint`), and safe widths.
 */
export function longTableTex(colSpec: string, headers: string[], rows: string[][], opts: LongTableOpts = {}): string {
  const ltSpec = tabularxSpecToLongtable(colSpec);
  const hl = new Set(opts.highlight ?? []);
  const fmtHead = (h: string) => (opts.raw ? h : `\\THd{${tex(h)}}`);
  const fmtCell = (c: string) => (opts.raw ? c : `\\TCell{${tex(c)}}`);
  const headRow = `\\TableHead${headers.map(fmtHead).join(' & ')}\\\\`;
  const font = opts.font ?? '';
  const sep = opts.tabcolsep ?? '3.5pt';
  return [
    `{${font}\\setlength{\\tabcolsep}{${sep}}\\begin{longtable}{${ltSpec}}`,
    headRow,
    '\\endfirsthead',
    headRow,
    '\\endhead',
    ...rows.map((r, i) => `${hl.has(i) ? '\\rowcolor{Accent!18}' : i % 2 ? '\\rowcolor{Surface}' : ''}${r.map(fmtCell).join(' & ')}\\\\`),
    '\\bottomrule\\end{longtable}}',
  ].join('\n');
}

export interface TimelineEntry {
  date: string;
  title: string;
  detail?: string;
  active?: boolean;
}

/** Vertical visual timeline built with `\asTimelineItem` / `\asTimelineItemActive`. */
export function timelineTex(items: TimelineEntry[]): string {
  return items
    .map((it) =>
      `${it.active ? '\\asTimelineItemActive' : '\\asTimelineItem'}{${tex(it.date)}}{${tex(it.title)}}{${it.detail ? tex(it.detail) : ''}}`
    )
    .join('\n');
}

/** Compact 3- or 4-column stat strip for key natal/transit metrics. */
export function statStripTex(items: Array<[string, string]>): string {
  if (items.length === 3) {
    return `\\asStatStripThree${items.map(([k, v]) => `{${tex(k)}}{${tex(v)}}`).join('')}`;
  }
  if (items.length === 4) {
    return `\\asStatStripFour${items.map(([k, v]) => `{${tex(k)}}{${tex(v)}}`).join('')}`;
  }
  return '';
}

export const evidenceValue = (r: EvidenceRegistry, id: string) => {
  const item = r.get(id);
  if (!item) throw new Error(`BLOCK_EVIDENCE_MISSING: ${id}`);
  return item.value;
};

export function loveAstralDetails(ctx: BlockContext): BlockOutput {
  const r = ctx.registry;
  const lang = blockLang(ctx);
  const sign = (id: string) => signLabel(lang, String(evidenceValue(r, id)));
  const nak = (id: string) => nakshatraLabel(lang, String(evidenceValue(r, id)));
  const house = (id: string) => ordinalLabel(lang, Number(evidenceValue(r, id)));
  const dk = String(evidenceValue(r, 'karaka.dk'));
  const dkName = planetLabel(lang, dk);
  const dkHouse = house(`planet.${dk.toLowerCase()}.d1.house`);
  const dkSign = sign(`planet.${dk.toLowerCase()}.d1.sign`);
  const seventhLord = planetLabel(lang, String(evidenceValue(r, 'house.7.d1.lord')));
  const ids = ['asc.d1.sign', 'asc.d1.nakshatra', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'planet.venus.d1.sign',
    'planet.venus.d1.house', 'house.5.d1.sign', 'house.7.d1.sign', 'house.7.d1.lord', 'karaka.dk', 'numerology.mulank', 'numerology.bhagyank'];
  const rows: Array<[string, string]> = [
    ['Ascendant (Lagna)', pick(lang, `${sign('asc.d1.sign')} (${nak('asc.d1.nakshatra')} nakshatra)`, `${sign('asc.d1.sign')} (${nak('asc.d1.nakshatra')} नक्षत्र)`)],
    ['Moon sign (Rashi)', sign('planet.moon.d1.sign')],
    ['Birth nakshatra', nak('planet.moon.d1.nakshatra')],
    ['Venus', pick(lang, `${sign('planet.venus.d1.sign')}, ${house('planet.venus.d1.house')} house`, `${sign('planet.venus.d1.sign')}, ${house('planet.venus.d1.house')} भाव`)],
    ['5th house (romance)', sign('house.5.d1.sign')],
    ['7th house (partnership)', pick(lang, `${sign('house.7.d1.sign')}, ruled by ${seventhLord}`, `${sign('house.7.d1.sign')}, स्वामी ${seventhLord}`)],
    ['Darakaraka (spouse significator)', pick(lang, `${dkName}, ${dkHouse} house in ${dkSign}`, `${dkName}, ${dkHouse} भाव, ${dkSign}`)],
    ['Mulank / Bhagyank', `${evidenceValue(r, 'numerology.mulank')} / ${evidenceValue(r, 'numerology.bhagyank')}`],
  ];
  return { tex: kvTable(rows.map(([k, v]) => [label(lang, k), v]), lang), evidenceIds: ids };
}

// --- Numerology associations (classical, rule-derived) ---------------------

const NUMBER_PLANET: PlanetSymbol[] = [
  PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.JUPITER, PlanetSymbol.RAHU, PlanetSymbol.MERCURY,
  PlanetSymbol.VENUS, PlanetSymbol.KETU, PlanetSymbol.SATURN, PlanetSymbol.MARS,
];
const PLANET_DAY: Record<string, string> = {
  Sun: 'Sunday', Moon: 'Monday', Mars: 'Tuesday', Mercury: 'Wednesday', Jupiter: 'Thursday', Venus: 'Friday', Saturn: 'Saturday',
  Rahu: 'Saturday', Ketu: 'Tuesday',
};
const PLANET_COLOUR: Record<string, string> = {
  Sun: 'gold, saffron', Moon: 'white, silver', Mars: 'red, coral', Mercury: 'green', Jupiter: 'yellow',
  Venus: 'white, pastel pink', Saturn: 'deep blue, black', Rahu: 'smoky grey', Ketu: 'earthy brown, grey',
};
const PLANET_GEM: Record<string, string> = {
  Sun: 'Ruby', Moon: 'Pearl', Mars: 'Red Coral', Mercury: 'Emerald', Jupiter: 'Yellow Sapphire',
  Venus: 'Diamond', Saturn: 'Blue Sapphire', Rahu: 'Hessonite', Ketu: "Cat's Eye",
};

function numbersBy(mulank: number, rel: 'FRIEND' | 'ENEMY'): number[] {
  const self = NUMBER_PLANET[mulank - 1];
  return NUMBER_PLANET.map((p, i) => ({ n: i + 1, p }))
    .filter(({ n, p }) => n !== mulank && String(getNaturalRelationship(self, p)).toUpperCase().includes(rel))
    .map(({ n }) => n);
}

/** Dates of the month that reduce to the Mulank; Hindi prints the plain dates. */
function luckyDates(mulank: number, lang: ReportLanguage): string {
  return Array.from({ length: 31 }, (_, i) => i + 1)
    .filter((d) => ((d - 1) % 9) + 1 === mulank)
    .map((d) => (lang === 'hi' ? String(d) : ordinal(d)))
    .join(', ');
}

/** A fixed English table value in the block's language, from one of the Hindi tables of blocks.hindi.ts. */
function fromTable(lang: ReportLanguage, table: Record<string, string>, en: string): string {
  if (lang === 'en') return en;
  const hi = table[en];
  if (hi === undefined) throw new Error(`HINDI_LABEL_MISSING: "${en}"`);
  return hi;
}

export function loveAllies(ctx: BlockContext): BlockOutput {
  const lang = blockLang(ctx);
  const mulank = Number(evidenceValue(ctx.registry, 'numerology.mulank'));
  const planet = planetName(NUMBER_PLANET[mulank - 1]);
  const friends = numbersBy(mulank, 'FRIEND');
  const gem = fromTable(lang, GEM_HI, PLANET_GEM[planet]);
  const rows: Array<[string, string]> = [
    ['Your Mulank and its ruling planet', `${mulank} (${planetLabel(lang, planet)})`],
    ['Harmonious numbers', friends.join(', ') || label(lang, 'none in the natural-friendship table')],
    ['Supportive weekday', weekdayLabel(lang, PLANET_DAY[planet])],
    ['Supportive colours', fromTable(lang, COLOUR_HI, PLANET_COLOUR[planet])],
    ['Supportive dates of the month', luckyDates(mulank, lang)],
    ['Traditional gem of the ruling planet', pick(lang, `${gem} (symbolic only; nothing to buy)`, `${gem} (केवल प्रतीक के रूप में; कुछ भी खरीदने की ज़रूरत नहीं)`)],
  ];
  return {
    tex: kvTable(rows.map(([k, v]) => [label(lang, k), v]), lang),
    evidenceIds: ['numerology.mulank'],
    method: label(lang, 'Derived from classical rules: the planet ruling your Mulank (1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars), its weekday and colours, and numbers ruled by its natural friends (Brihat Parashara Hora Shastra).'),
  };
}

export function loveCautions(ctx: BlockContext): BlockOutput {
  const lang = blockLang(ctx);
  const mulank = Number(evidenceValue(ctx.registry, 'numerology.mulank'));
  const planet = planetName(NUMBER_PLANET[mulank - 1]);
  const enemies = numbersBy(mulank, 'ENEMY');
  const enemyPlanets = enemies.map((n) => planetName(NUMBER_PLANET[n - 1]));
  const why = pick(lang,
    `Their ruling planets (${enemyPlanets.join(', ')}) are natural opposites of ${planet}`,
    `इनके स्वामी ग्रह (${planetList(lang, enemyPlanets)}) स्वभाव से ${planetLabel(lang, planet)} के विपरीत माने जाते हैं`);
  const rows: Array<[string, string]> = [
    ['Numbers that may need more patience', enemies.join(', ') || label(lang, 'none in the natural-enmity table')],
    ['Why', enemies.length ? why : '—'],
    ['Weekdays to approach with extra care', [...new Set(enemyPlanets.map((p) => weekdayLabel(lang, PLANET_DAY[p])))].join(', ') || '—'],
  ];
  const caution = label(lang, 'These are gentle tendencies, not warnings. A relationship with someone of any number can flourish with understanding, respect and good communication.');
  return {
    tex: kvTable(rows.map(([k, v]) => [label(lang, k), v]), lang) + `\n\\begin{asCaution}{\\fontsize{9.3}{13}\\selectfont ${caution}\\par}\\end{asCaution}`,
    evidenceIds: ['numerology.mulank'],
    method: label(lang, 'Derived from the natural (naisargika) enmities between your Mulank\'s ruling planet and the rulers of other numbers.'),
  };
}

// --- Jupiter supportive windows ---------------------------------------------

export function loveJupiterWindows(ctx: BlockContext): BlockOutput {
  const r = ctx.registry;
  const lang = blockLang(ctx);
  const seventhSign = String(evidenceValue(r, 'house.7.d1.sign'));
  const seventhLord = String(evidenceValue(r, 'house.7.d1.lord')).toLowerCase();
  const lordSign = String(evidenceValue(r, `planet.${seventhLord}.d1.sign`));
  const dk = String(evidenceValue(r, 'karaka.dk'));
  const dkSign = String(evidenceValue(r, `planet.${dk.toLowerCase()}.d1.sign`));
  const idx = (s: string) => SIGNS.indexOf(s as (typeof SIGNS)[number]) + 1;
  const targets: Array<[string, number]> = [
    [pick(lang, '7th house', '7वें भाव'), idx(seventhSign)],
    [pick(lang, `7th lord (${planetName(seventhLord)})`, `7वें भाव के स्वामी (${planetLabel(lang, planetName(seventhLord))})`), idx(lordSign)],
    [pick(lang, `Darakaraka (${dk})`, `दारकारक (${planetLabel(lang, dk)})`), idx(dkSign)],
  ];
  const rawRows: string[][] = [];
  const timelineItems: TimelineEntry[] = [];
  const ids: string[] = ['house.7.d1.sign', 'house.7.d1.lord', `planet.${seventhLord}.d1.sign`, 'karaka.dk', `planet.${dk.toLowerCase()}.d1.sign`];
  const periods = ctx.snapshot.transits.JUPITER;
  const nowMs = Date.parse(ctx.snapshot.asOfIso);
  periods.forEach((per, i) => {
    const factors: string[] = [];
    for (const [target, sign] of targets) {
      const dist = ((sign - per.signIndex + 12) % 12) + 1; // house of target counted from Jupiter
      if (dist === 1) factors.push(pick(lang, `transits ${target}`, `${target} पर गोचर`));
      else if ([5, 7, 9].includes(dist)) factors.push(pick(lang, `aspects ${target} (${ordinal(dist)})`, `${target} पर ${ordinalLabel(lang, dist, 'feminine')} दृष्टि`));
    }
    if (!factors.length) return;
    ids.push(`transit.jupiter.${String(i + 1).padStart(2, '0')}`);
    const retro = per.enteredRetrograde ? ` (${label(lang, 'R')})` : '';
    const span = `${dateLabel(lang, formatDate(per.startIso))} -- ${dateLabel(lang, formatDate(per.endIso))}`;
    const signStr = `${signLabel(lang, per.sign)}${retro}`;
    const factorStr = factors.join('; ');
    rawRows.push([`\\TCell{${span}}`, `\\TCell{${tex(signStr)}}`, `\\TCell{${tex(factorStr)}}`]);
    timelineItems.push({
      date: `${dateLabel(lang, formatDate(per.startIso))} – ${dateLabel(lang, formatDate(per.endIso))}`,
      title: signStr,
      detail: factorStr,
      active: Date.parse(per.startIso) <= nowMs && nowMs < Date.parse(per.endIso),
    });
  });
  const head = ['Period', 'Jupiter in', 'Jupiter\'s influence'].map((h) => `\\THd{${tex(label(lang, h))}}`);
  const activeIdx = timelineItems.reduce<number[]>((acc, it, idx) => (it.active ? [...acc, idx] : acc), []);
  const table = rawRows.length
    ? [
        timelineTex(timelineItems.slice(0, 6)),
        longTableTex('p{0.34\\linewidth}p{0.17\\linewidth}X', head, rawRows, { raw: true, highlight: activeIdx }),
      ].join('\n\\vspace{2mm}\n')
    : `{\\itshape ${label(lang, 'No Jupiter contact with these points falls within the calculated horizon.')}}`;
  const years = Math.round((Date.parse(periods[periods.length - 1].endIso) - Date.parse(periods[0].startIso)) / 3.15576e10);
  const intro = pick(lang,
    `In classical timing, Jupiter's transit (gochar) over, or its 5th, 7th or 9th aspect on, the 7th house, the 7th lord and the Darakaraka marks periods that support commitment and partnership. The table lists every such period in the next ${years} years. More contacts at once suggest a stronger window; these are seasons of opportunity, not promised events.`,
    `शास्त्रीय काल-निर्णय में 7वें भाव, उसके स्वामी और दारकारक पर गुरु का गोचर, या इन पर गुरु की 5वीं, 7वीं या 9वीं दृष्टि, ऐसे समय का संकेत मानी जाती है जो प्रतिबद्धता और साझेदारी के लिए सहायक होता है। तालिका में अगले ${years} वर्षों की ऐसी हर अवधि दी गई है। एक साथ जितने अधिक संपर्क बनें, समय उतना ही प्रबल माना जाता है; ये अवसर के मौसम हैं, घटनाओं का वादा नहीं।`);
  return {
    tex: `{\\fontsize{10}{14.5}\\selectfont ${intro}\\par}\n${table}`,
    evidenceIds: ids,
    method: label(lang, 'Jupiter sign periods computed by the transit ingress solver from your report date; (R) marks a retrograde re-entry.'),
  };
}

/** Blocks available to every report. Report modules add their own. */
export const CORE_BLOCKS: Record<string, BlockRenderer> = {
  'chart-d1': d1Chart,
  'chart-d9': vargaChart('D9'),
  'chart-d10': vargaChart('D10'),
};

