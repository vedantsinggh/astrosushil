/**
 * Deterministic LaTeX tables and charts that work on ANY snapshot (the native
 * or the partner), so the Finance and Couple Matching reports share one
 * implementation. Every helper returns the evidence IDs it displays, using the
 * given evidence prefix ('' for the native, 'partner.' for the partner).
 */
import {
  AvakhadaChakraCalculator,
  AvakhadaChakraReport,
  KPSubLordCalculator,
  PanchangCalculator,
  PanchangOutput,
  VargaType,
} from '@astro/astrology-engine';
import { ordinal, planetName, PlanetName, PLANETS, SIGNS } from '../../evidence/evidence-registry';
import { northChart } from '../../render/blocks';
import { formatDate, tex } from '../../render/latex';
import { ChartSnapshot } from '../../snapshot/chart-snapshot';

export const ABBR: Record<PlanetName, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};

export const SIGN_SHORT = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];

export interface TexWithEvidence {
  tex: string;
  evidenceIds: string[];
}

const DIGNITY_SHORT: Record<string, string> = {
  EXALTED: 'Exalted', DEBILITATED: 'Debilitated', MOOLATRIKONA: 'Moolatrikona', OWN_SIGN: 'Own sign',
  GREAT_FRIEND: 'Great friend', FRIEND: 'Friend', NEUTRAL: 'Neutral', ENEMY: 'Enemy', GREAT_ENEMY: 'Great enemy',
};

export const dignityText = (d: string) => DIGNITY_SHORT[d] ?? d.toLowerCase().replace(/_/g, ' ');

export function dms(degree: number): string {
  const d = Math.floor(degree);
  const m = Math.floor((degree - d) * 60);
  return `${d}°${String(m).padStart(2, '0')}'`;
}

export function safePlanet(symbol: string): PlanetName | undefined {
  try {
    return planetName(symbol);
  } catch {
    return undefined;
  }
}

/** Table row with zebra striping. */
export const zebra = (i: number) => (i % 2 ? '\\rowcolor{Surface}' : '');

export function tableTex(colSpec: string, header: string[], rows: string[][], opts: { width?: string; font?: string } = {}): string {
  const font = opts.font ?? '\\fontsize{8.4}{10.6}\\selectfont';
  return [
    `{${font}\\setlength{\\tabcolsep}{3.4pt}\\begin{center}\\begin{tabularx}{${opts.width ?? '\\linewidth'}}{${colSpec}}`,
    `\\TableHead${header.map((h) => `\\leavevmode\\THd{${h}}`).join(' & ')}\\\\`,
    ...rows.map((r, i) => `${zebra(i)}${r.join(' & ')}\\\\`),
    '\\bottomrule\\end{tabularx}\\end{center}}',
  ].join('\n');
}

/** Two pieces of LaTeX side by side with captions. */
export function sideBySide(left: string, right: string, leftTitle: string, rightTitle: string): string {
  const cap = (t: string) => `{\\sffamily\\fontsize{8}{10}\\selectfont\\bfseries\\color{Primary}${tex(t)}}\\par\\vspace{1.2mm}`;
  return `\\begin{center}\\begin{minipage}[t]{0.49\\linewidth}\\centering ${cap(leftTitle)}${left}\\end{minipage}\\hfill\\begin{minipage}[t]{0.49\\linewidth}\\centering ${cap(rightTitle)}${right}\\end{minipage}\\end{center}`;
}

// ---------------------------------------------------------------- charts --

export type ChartKind = 'D1' | 'MOON' | 'SUN' | VargaType;

/** North Indian chart for any snapshot: D1 (with degrees), Moon or Sun chart, or any computed varga. */
export function chartFor(snap: ChartSnapshot, kind: ChartKind, scale = 0.95): string {
  const { natal } = snap;
  if (kind === 'D1' || kind === 'MOON' || kind === 'SUN') {
    const first = kind === 'D1'
      ? natal.ascendant.rashiIndex
      : natal.planets.find((p) => planetName(p.name) === (kind === 'MOON' ? 'Moon' : 'Sun'))!.rashiIndex;
    const houses = Array.from({ length: 12 }, (_, i) => ({ sign: ((first - 1 + i) % 12) + 1, lines: [] as string[] }));
    for (const p of natal.planets) {
      const h = (p.rashiIndex - first + 12) % 12;
      houses[h].lines.push(kind === 'D1' ? `${ABBR[planetName(p.name)]} ${Math.floor(p.degree)}°${p.retrograde ? ' R' : ''}` : `${ABBR[planetName(p.name)]}${p.retrograde ? ' R' : ''}`);
    }
    houses[(natal.ascendant.rashiIndex - first + 12) % 12].lines.unshift('Asc');
    return northChart(houses, scale);
  }
  const chart = snap.vargas[kind];
  if (!chart?.ascendant) throw new Error(`BLOCK_DATA_MISSING: ${kind}`);
  const asc = chart.ascendant.rashiIndex;
  const houses = Array.from({ length: 12 }, (_, i) => ({ sign: ((asc - 1 + i) % 12) + 1, lines: [] as string[] }));
  for (const pl of Object.values(chart.placements)) {
    if (pl.planet === 'Ascendant') continue;
    const name = safePlanet(String(pl.planet));
    if (!name) continue;
    houses[(pl.rashiIndex - asc + 12) % 12].lines.push(ABBR[name]);
  }
  houses[0].lines.unshift('Asc');
  return northChart(houses, scale);
}

/** Evidence IDs a chart displays. */
export function chartEvidence(prefix: string, kind: ChartKind): string[] {
  if (kind === 'D1') return [`${prefix}asc.d1.sign`, ...PLANETS.map((p) => `${prefix}planet.${p.toLowerCase()}.d1.house`)];
  if (kind === 'MOON') return [`${prefix}planet.moon.d1.sign`, ...PLANETS.map((p) => `${prefix}planet.${p.toLowerCase()}.d1.sign`)];
  if (kind === 'SUN') return [`${prefix}planet.sun.d1.sign`, ...PLANETS.map((p) => `${prefix}planet.${p.toLowerCase()}.d1.sign`)];
  const v = kind.toLowerCase();
  return [`${prefix}asc.${v}.sign`, ...PLANETS.map((p) => `${prefix}planet.${p.toLowerCase()}.${v}.sign`)];
}

/** Sarvashtakavarga chart: bindus per house, laid out on the D1 houses. */
export function savChart(snap: ChartSnapshot, prefix = '', scale = 0.95): TexWithEvidence {
  const asc = snap.natal.ascendant.rashiIndex;
  const houses = Array.from({ length: 12 }, (_, i) => {
    const sign = ((asc - 1 + i) % 12) + 1;
    return { sign, lines: [`${snap.ashtakavarga.sav.signs[sign as keyof typeof snap.ashtakavarga.sav.signs]}`] };
  });
  return { tex: northChart(houses, scale), evidenceIds: Array.from({ length: 12 }, (_, i) => `${prefix}sav.house.${i + 1}`) };
}

// ----------------------------------------------------------- planet table --

/** Full planet table: sign, degree, nakshatra-pada, star/sub lord, house, dignity, state, lordship, karaka. */
export function planetTable(snap: ChartSnapshot, prefix = ''): TexWithEvidence {
  const ids: string[] = [`${prefix}asc.d1.sign`, `${prefix}asc.d1.degree`, `${prefix}asc.d1.nakshatra`];
  const asc = snap.natal.ascendant;
  const ascKp = KPSubLordCalculator.calculateKPLords(asc.absoluteDegree);
  const rows: string[][] = [[
    '\\TCell{\\textbf{Ascendant}}', `\\TCell{${tex(asc.sign)}}`, `\\TCell{${tex(dms(asc.degree))}}`,
    `\\TCell{${tex(asc.nakshatra)}-${asc.pada}}`, `\\TCell{${ABBR[planetName(ascKp.starLord)]}/${ABBR[planetName(ascKp.subLord)]}}`,
    '\\TCell{1}', '\\TCell{--}', '\\TCell{--}', '\\TCell{--}', '\\TCell{--}',
  ]];
  for (const p of snap.natal.planets) {
    const name = planetName(p.name);
    const k = `${prefix}planet.${name.toLowerCase()}.d1`;
    ids.push(`${k}.sign`, `${k}.degree`, `${k}.nakshatra`, `${k}.house`, `${k}.dignity`, `${k}.retrograde`, `${k}.lordship`);
    const kp = KPSubLordCalculator.calculateKPLords(p.absoluteDegree);
    const state = [p.retrograde ? 'R' : '', p.combust ? 'C' : ''].filter(Boolean).join(' ') || '--';
    rows.push([
      `\\TCell{\\textbf{${name}}}`, `\\TCell{${tex(p.sign)}}`, `\\TCell{${tex(dms(p.degree))}}`,
      `\\TCell{${tex(p.nakshatra)}-${p.pada}}`, `\\TCell{${ABBR[planetName(kp.starLord)]}/${ABBR[planetName(kp.subLord)]}}`,
      `\\TCell{${p.house}}`, `\\TCell{${tex(dignityText(p.dignity))}}`, `\\TCell{${state}}`,
      `\\TCell{${p.lordship.length ? p.lordship.join(', ') : '--'}}`, `\\TCell{${tex(p.charaKaraka ?? '--')}}`,
    ]);
  }
  return {
    tex: tableTex('l l l l l c l c c c', ['Planet', 'Sign', 'Degree', 'Nakshatra-pada', 'Star/Sub', 'House', 'Dignity', 'State', 'Rules', 'Karaka'], rows),
    evidenceIds: ids,
  };
}

export const PLANET_TABLE_METHOD =
  'Sidereal (Lahiri) positions, Whole Sign houses, mean nodes. Star/Sub = nakshatra lord / KP sub lord (Krishnamurti 249-sub division of the same Lahiri longitude). ' +
  'State: R = retrograde, C = combust. Rules = houses owned. Karaka = Jaimini 7-karaka scheme (AK Atma, AmK Amatya, BK Bhratri, MK Matri, PK Putra, GK Gnati, DK Dara).';

// ------------------------------------------------------- Avakahada/Panchang --

export function avakhadaFor(snap: ChartSnapshot): AvakhadaChakraReport {
  const moon = snap.natal.planets.find((p) => planetName(p.name) === 'Moon')!;
  return AvakhadaChakraCalculator.calculateAvakhada(moon.absoluteDegree, snap.natal.ascendant.rashiIndex);
}

export function panchangAtBirth(snap: ChartSnapshot): PanchangOutput {
  const sun = snap.natal.planets.find((p) => planetName(p.name) === 'Sun')!;
  const moon = snap.natal.planets.find((p) => planetName(p.name) === 'Moon')!;
  return new PanchangCalculator().calculatePanchang(sun.absoluteDegree, moon.absoluteDegree, new Date(snap.natal.calculation.normalizedTime.utcIsoString));
}

export const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s_-])([a-z])/g, (_, a, b) => `${a === '_' ? ' ' : a}${b.toUpperCase()}`);

// --------------------------------------------------------------- dashas --

/** Vimshottari Mahadasha list; the running period is highlighted. */
export function mahadashaTable(snap: ChartSnapshot, prefix = ''): TexWithEvidence {
  const now = Date.parse(snap.asOfIso);
  const rows = snap.vimshottari.mahadashas.map((md) => {
    const cur = Date.parse(md.startDateIso) <= now && now < Date.parse(md.endDateIso);
    const b = (s: string) => (cur ? `\\textbf{${s}}` : s);
    return [`\\TCell{${b(planetName(md.lord))}}`, `\\TCell{${b(formatDate(md.startDateIso))}}`, `\\TCell{${b(formatDate(md.endDateIso))}}`, `\\TCell{${cur ? '\\textbf{running}' : ''}}`];
  });
  return {
    tex: tableTex('X l l l', ['Mahadasha', 'From', 'To', ''], rows),
    evidenceIds: snap.vimshottari.mahadashas.map((_, i) => `${prefix}dasha.md.${String(i + 1).padStart(2, '0')}`),
  };
}

/** Antardashas of the running Mahadasha. */
export function antardashaTable(snap: ChartSnapshot, prefix = ''): TexWithEvidence {
  const now = Date.parse(snap.asOfIso);
  const mdIndex = snap.vimshottari.mahadashas.findIndex((md) => Date.parse(md.startDateIso) <= now && now < Date.parse(md.endDateIso));
  const md = snap.vimshottari.mahadashas[mdIndex];
  if (!md) throw new Error('BLOCK_DATA_MISSING: running mahadasha');
  const rows = (md.subPeriods ?? []).map((ad) => {
    const cur = Date.parse(ad.startDateIso) <= now && now < Date.parse(ad.endDateIso);
    const b = (s: string) => (cur ? `\\textbf{${s}}` : s);
    return [`\\TCell{${b(`${planetName(md.lord)}--${planetName(ad.lord)}`)}}`, `\\TCell{${b(formatDate(ad.startDateIso))}}`, `\\TCell{${b(formatDate(ad.endDateIso))}}`];
  });
  return {
    tex: tableTex('X l l', ['Antardasha', 'From', 'To'], rows),
    evidenceIds: [`${prefix}dasha.md.${String(mdIndex + 1).padStart(2, '0')}`, `${prefix}dasha.current.md`],
  };
}

// --------------------------------------------------------- ashtakavarga --

const AV_PLANETS = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'] as const;

/** Bhinnashtakavarga per planet by sign, with the Sarvashtakavarga total and the house number of each sign. */
export function ashtakavargaTable(snap: ChartSnapshot, prefix = ''): TexWithEvidence {
  const av = snap.ashtakavarga;
  const asc = snap.natal.ascendant.rashiIndex;
  const head = ['', ...SIGN_SHORT, 'Tot'];
  const rows: string[][] = [];
  rows.push(['\\TCell{\\textit{House}}', ...SIGN_SHORT.map((_, i) => `\\TCell{\\textit{${((i + 1 - asc + 12) % 12) + 1}}}`), '\\TCell{}']);
  for (const p of AV_PLANETS) {
    const t = av.bav[p];
    rows.push([`\\TCell{${ABBR[planetName(p)]}}`, ...t.signList.map((n) => `\\TCell{${n}}`), `\\TCell{${t.totalPoints}}`]);
  }
  rows.push(['\\TCell{\\textbf{SAV}}', ...av.sav.signList.map((n) => `\\TCell{\\textbf{${n}}}`), `\\TCell{\\textbf{${av.sav.grandTotal}}}`]);
  return {
    tex: tableTex(`l ${'c '.repeat(13)}`, head, rows, { font: '\\fontsize{8}{10}\\selectfont' }),
    evidenceIds: Array.from({ length: 12 }, (_, i) => `${prefix}sav.house.${i + 1}`),
  };
}

export function sodhyaPindaTable(snap: ChartSnapshot): string {
  const rows = AV_PLANETS.map((p) => {
    const pd = snap.ashtakavarga.pinda[p];
    return [`\\TCell{${planetName(p)}}`, `\\TCell{${pd.rashiPinda}}`, `\\TCell{${pd.grahaPinda}}`, `\\TCell{${pd.shodhyaPinda}}`];
  });
  return tableTex('X c c c', ['Planet', 'Rashi pinda', 'Graha pinda', 'Shodhya pinda'], rows);
}

/** Convenience: the 1..12 sign index of a sign name. */
export const signIndex = (name: string) => SIGNS.indexOf(name as (typeof SIGNS)[number]) + 1;

export { ordinal };
