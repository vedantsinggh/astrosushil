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

export interface BlockContext {
  snapshot: ChartSnapshot;
  registry: EvidenceRegistry;
  /** Second native for two-person reports. */
  partner?: ChartSnapshot;
  /** Report-specific computed data from the module's `extend` hook. */
  ext: Record<string, unknown>;
}

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

export function d1Chart(ctx: BlockContext): BlockOutput {
  const { natal } = ctx.snapshot;
  const houses = natal.houses.map((h) => ({
    sign: h.rashiIndex,
    lines: natal.planets
      .filter((p) => p.house === h.number)
      .map((p) => `${ABBR[planetName(p.name)]} ${Math.floor(p.degree)}°${p.retrograde ? ' R' : ''}`),
  }));
  houses[0].lines.unshift('Asc');
  return {
    tex: `\\begin{center}${northChart(houses)}\\end{center}`,
    evidenceIds: ['asc.d1.sign', ...natal.planets.map((p) => `planet.${planetName(p.name).toLowerCase()}.d1.house`)],
    method: 'North Indian style. Numbers are signs (1 = Aries … 12 = Pisces); the top diamond is the 1st house. R = retrograde.',
  };
}

export function vargaChart(varga: VargaType): BlockRenderer {
  return (ctx) => {
    const chart = ctx.snapshot.vargas[varga];
    if (!chart?.ascendant) throw new Error(`BLOCK_DATA_MISSING: ${varga}`);
    const ascSign = chart.ascendant.rashiIndex;
    const houses = Array.from({ length: 12 }, (_, i) => ({ sign: ((ascSign - 1 + i) % 12) + 1, lines: [] as string[] }));
    for (const pl of Object.values(chart.placements)) {
      if (pl.planet === 'Ascendant') continue;
      const h = ((pl.rashiIndex - ascSign + 12) % 12);
      houses[h].lines.push(ABBR[planetName(String(pl.planet))]);
    }
    houses[0].lines.unshift('Asc');
    return {
      tex: `\\begin{center}${northChart(houses)}\\end{center}`,
      evidenceIds: [`asc.${varga.toLowerCase()}.sign`],
      method: `${chart.name} (${varga}), computed by the divisional-chart engine (${chart.calculationRule}).`,
    };
  };
}

export function kvTable(rows: Array<[string, string]>): string {
  return [
    '\\begin{center}\\begin{tabularx}{0.86\\linewidth}{>{\\raggedright\\arraybackslash}p{0.38\\linewidth}X}',
    '\\TableHead\\THd{Factor} & \\THd{Your chart}\\\\',
    ...rows.map(([k, v], i) => `${i % 2 ? '\\rowcolor{Surface}' : ''}\\TCell{\\textbf{${tex(k)}}} & \\TCell{${tex(v)}}\\\\`),
    '\\bottomrule\\end{tabularx}\\end{center}',
  ].join('\n');
}

export const evidenceValue = (r: EvidenceRegistry, id: string) => {
  const item = r.get(id);
  if (!item) throw new Error(`BLOCK_EVIDENCE_MISSING: ${id}`);
  return item.value;
};

export function loveAstralDetails(ctx: BlockContext): BlockOutput {
  const r = ctx.registry;
  const dk = String(evidenceValue(r, 'karaka.dk'));
  const ids = ['asc.d1.sign', 'asc.d1.nakshatra', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'planet.venus.d1.sign',
    'planet.venus.d1.house', 'house.5.d1.sign', 'house.7.d1.sign', 'house.7.d1.lord', 'karaka.dk', 'numerology.mulank', 'numerology.bhagyank'];
  const rows: Array<[string, string]> = [
    ['Ascendant (Lagna)', `${evidenceValue(r, 'asc.d1.sign')} (${evidenceValue(r, 'asc.d1.nakshatra')} nakshatra)`],
    ['Moon sign (Rashi)', String(evidenceValue(r, 'planet.moon.d1.sign'))],
    ['Birth nakshatra', String(evidenceValue(r, 'planet.moon.d1.nakshatra'))],
    ['Venus', `${evidenceValue(r, 'planet.venus.d1.sign')}, ${ordinal(Number(evidenceValue(r, 'planet.venus.d1.house')))} house`],
    ['5th house (romance)', String(evidenceValue(r, 'house.5.d1.sign'))],
    ['7th house (partnership)', `${evidenceValue(r, 'house.7.d1.sign')}, ruled by ${evidenceValue(r, 'house.7.d1.lord')}`],
    ['Darakaraka (spouse significator)', `${dk}, ${ordinal(Number(evidenceValue(r, `planet.${dk.toLowerCase()}.d1.house`)))} house in ${evidenceValue(r, `planet.${dk.toLowerCase()}.d1.sign`)}`],
    ['Mulank / Bhagyank', `${evidenceValue(r, 'numerology.mulank')} / ${evidenceValue(r, 'numerology.bhagyank')}`],
  ];
  return { tex: kvTable(rows), evidenceIds: ids };
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

function luckyDates(mulank: number): string {
  return Array.from({ length: 31 }, (_, i) => i + 1)
    .filter((d) => ((d - 1) % 9) + 1 === mulank)
    .map((d) => ordinal(d))
    .join(', ');
}

export function loveAllies(ctx: BlockContext): BlockOutput {
  const mulank = Number(evidenceValue(ctx.registry, 'numerology.mulank'));
  const planet = planetName(NUMBER_PLANET[mulank - 1]);
  const friends = numbersBy(mulank, 'FRIEND');
  const rows: Array<[string, string]> = [
    ['Your Mulank and its ruling planet', `${mulank} (${planet})`],
    ['Harmonious numbers', friends.join(', ') || 'none in the natural-friendship table'],
    ['Supportive weekday', PLANET_DAY[planet]],
    ['Supportive colours', PLANET_COLOUR[planet]],
    ['Supportive dates of the month', luckyDates(mulank)],
    ['Traditional gem of the ruling planet', `${PLANET_GEM[planet]} (symbolic only; nothing to buy)`],
  ];
  return {
    tex: kvTable(rows),
    evidenceIds: ['numerology.mulank'],
    method: 'Derived from classical rules: the planet ruling your Mulank (1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars), its weekday and colours, and numbers ruled by its natural friends (Brihat Parashara Hora Shastra).',
  };
}

export function loveCautions(ctx: BlockContext): BlockOutput {
  const mulank = Number(evidenceValue(ctx.registry, 'numerology.mulank'));
  const planet = planetName(NUMBER_PLANET[mulank - 1]);
  const enemies = numbersBy(mulank, 'ENEMY');
  const enemyPlanets = enemies.map((n) => planetName(NUMBER_PLANET[n - 1]));
  const rows: Array<[string, string]> = [
    ['Numbers that may need more patience', enemies.join(', ') || 'none in the natural-enmity table'],
    ['Why', enemies.length ? `Their ruling planets (${enemyPlanets.join(', ')}) are natural opposites of ${planet}` : '—'],
    ['Weekdays to approach with extra care', [...new Set(enemyPlanets.map((p) => PLANET_DAY[p]))].join(', ') || '—'],
  ];
  return {
    tex: kvTable(rows) + '\n\\begin{asCaution}{\\fontsize{9.3}{13}\\selectfont These are gentle tendencies, not warnings. A relationship with someone of any number can flourish with understanding, respect and good communication.\\par}\\end{asCaution}',
    evidenceIds: ['numerology.mulank'],
    method: 'Derived from the natural (naisargika) enmities between your Mulank\'s ruling planet and the rulers of other numbers.',
  };
}

// --- Jupiter supportive windows ---------------------------------------------

export function loveJupiterWindows(ctx: BlockContext): BlockOutput {
  const r = ctx.registry;
  const seventhSign = String(evidenceValue(r, 'house.7.d1.sign'));
  const seventhLord = String(evidenceValue(r, 'house.7.d1.lord')).toLowerCase();
  const lordSign = String(evidenceValue(r, `planet.${seventhLord}.d1.sign`));
  const dk = String(evidenceValue(r, 'karaka.dk'));
  const dkSign = String(evidenceValue(r, `planet.${dk.toLowerCase()}.d1.sign`));
  const idx = (s: string) => SIGNS.indexOf(s as (typeof SIGNS)[number]) + 1;
  const targets: Array<[string, number]> = [
    ['7th house', idx(seventhSign)],
    [`7th lord (${planetName(seventhLord)})`, idx(lordSign)],
    [`Darakaraka (${dk})`, idx(dkSign)],
  ];
  const rows: string[] = [];
  const ids: string[] = ['house.7.d1.sign', 'house.7.d1.lord', `planet.${seventhLord}.d1.sign`, 'karaka.dk', `planet.${dk.toLowerCase()}.d1.sign`];
  const periods = ctx.snapshot.transits.JUPITER;
  periods.forEach((per, i) => {
    const factors: string[] = [];
    for (const [label, sign] of targets) {
      const dist = ((sign - per.signIndex + 12) % 12) + 1; // house of target counted from Jupiter
      if (dist === 1) factors.push(`transits ${label}`);
      else if ([5, 7, 9].includes(dist)) factors.push(`aspects ${label} (${ordinal(dist)})`);
    }
    if (!factors.length) return;
    ids.push(`transit.jupiter.${String(i + 1).padStart(2, '0')}`);
    rows.push(`${rows.length % 2 ? '\\rowcolor{Surface}' : ''}\\TCell{${formatDate(per.startIso)} -- ${formatDate(per.endIso)}} & \\TCell{${tex(per.sign)}${per.enteredRetrograde ? ' (R)' : ''}} & \\TCell{${tex(factors.join('; '))}}\\\\`);
  });
  const table = rows.length
    ? ['\\begin{center}\\begin{tabularx}{\\linewidth}{p{0.34\\linewidth}p{0.17\\linewidth}X}',
       '\\TableHead\\THd{Period} & \\THd{Jupiter in} & \\THd{Jupiter\'s influence}\\\\', ...rows, '\\bottomrule\\end{tabularx}\\end{center}'].join('\n')
    : '{\\itshape No Jupiter contact with these points falls within the calculated horizon.}';
  return {
    tex: `{\\fontsize{10}{14.5}\\selectfont In classical timing, Jupiter's transit (gochar) over, or its 5th, 7th or 9th aspect on, the 7th house, the 7th lord and the Darakaraka marks periods that support commitment and partnership. The table lists every such period in the next ${Math.round((Date.parse(periods[periods.length - 1].endIso) - Date.parse(periods[0].startIso)) / 3.15576e10)} years. More contacts at once suggest a stronger window; these are seasons of opportunity, not promised events.\\par}\n${table}`,
    evidenceIds: ids,
    method: 'Jupiter sign periods computed by the transit ingress solver from your report date; (R) marks a retrograde re-entry.',
  };
}

/** Blocks available to every report. Report modules add their own. */
export const CORE_BLOCKS: Record<string, BlockRenderer> = {
  'chart-d1': d1Chart,
  'chart-d9': vargaChart('D9'),
  'chart-d10': vargaChart('D10'),
};

