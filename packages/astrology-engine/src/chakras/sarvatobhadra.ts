/**
 * Sarvatobhadra Chakra (SBC, "Trailokya-deepika chakra"): the 9x9 grid of 28 nakshatras (with
 * Abhijit), 16 vowels, 20 consonants, 12 rashis and the 5 tithi groups with the 7 weekdays, plus the
 * three vedha lines cast from each occupied nakshatra.
 *
 * PROVISIONAL – pending client review (ADR-016 §6). Calculated facts only, no interpretation.
 *
 * Layout source (cell by cell):
 *  - Wikipedia "Sarvatobhadra Chakra" grid (citing G. K. Ojha's commentary on Phaladeepika ch. XXVI,
 *    Motilal Banarsidass; M. K. Aggarwal, "Mystics of Sarvatobhadra Chakra"; Mansagari), with two
 *    transcription slips in that table corrected by the vowel sequence it otherwise follows
 *    (ring-2 NW corner ॠ, ring-3 SE corner ॡ; vowels run a, ā, i, ī | u, ū, ṛ, ṝ | ḷ, ḹ, e, ai |
 *    o, au, aṃ, aḥ clockwise NE→SE→SW→NW from the outer ring inwards).
 *  - Cross-checked against the worked example "Saturn in Punarvasu" (Sarvatobhadra chakra basics,
 *    archive.org Astrology Book Collection) and the vedha table of Saravali "Vedhas"
 *    (saravali.github.io/astrology/sbc_vedhas.html); both are reproduced in the unit tests.
 *  - Tithi groups (Nanda 1/6/11, Bhadra 2/7/12, Jaya 3/8/13, Rikta 4/9/14, Purna 5/10/15/30) and their
 *    weekdays (Nanda Sun+Tue, Bhadra Mon+Wed, Jaya Thu, Rikta Fri, Purna Sat at the centre): same
 *    archive.org text and M. R. Garg "Sarvato Bhadra Chakra / Trilokya Deepika Chakra" (2022).
 * Vedha rule: from each nakshatra one straight line across the grid and two 45° diagonals (forward =
 *  clockwise/zodiacal, backward = anticlockwise); every square on a line receives vedha
 *  (Narapatijayacharya Svarodaya as summarised by the sources above). Corner-vowel rule: a planet in the
 *  last pada of the nakshatra before a corner or the first pada of the one after it pierces that
 *  corner's vowel (archive.org basics text, "special principles" (1)).
 */
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { AstroChart } from '../chart/astro-chart.types';
import { ChartCalculator } from '../chart/chart-calculator';
import { BirthDetails } from '../input/birth-details';
import { MANDATORY_VEDIC_PLANETS, PlanetSymbol } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { CHAKRA_NAKSHATRAS_28, chakraNakshatra28Index, chakraPada27 } from './chakra-nakshatra28';

export const SARVATOBHADRA_SOURCE =
  'Sarvatobhadra Chakra after Narapatijayacharya Svarodaya: grid as published in G. K. Ojha, Phaladeepika ' +
  '(Bhavartha Bodhini) ch. XXVI commentary, reproduced in Wikipedia "Sarvatobhadra Chakra"; vedha lines and ' +
  'worked example per "Sarvatobhadra chakra basics" (archive.org) and Saravali "Vedhas"; motion rule per ' +
  'M. K. Aggarwal, Mystics of Sarvatobhadra Chakra p. 45 and M. R. Garg (2022).';

export type SbcCellKind = 'NAKSHATRA' | 'VOWEL' | 'CONSONANT' | 'RASHI' | 'TITHI_VARA';
export type SbcDirection = 'E' | 'S' | 'W' | 'N' | 'NE' | 'SE' | 'SW' | 'NW' | 'CENTRE';
export type SbcTithiGroup = 'NANDA' | 'BHADRA' | 'JAYA' | 'RIKTA' | 'PURNA';
export type SbcVedhaDirection = 'OPPOSITE' | 'FORWARD' | 'BACKWARD' | 'CORNER_VOWEL';

export interface SarvatobhadraCellDef {
  row: number;            // 0 = top (East side) .. 8
  col: number;            // 0 = left (North side) .. 8
  ring: number;           // 0 = outer ring .. 4 = centre
  direction: SbcDirection;
  kind: SbcCellKind;
  label: string;          // transliteration / name
  devanagari?: string;
  nakshatra28Index?: number;  // 1..28 (22 = Abhijit)
  rashiIndex?: number;        // 1..12
  tithiGroup?: SbcTithiGroup;
  tithis?: number[];          // tithi numbers 1..30 in the group
  weekdays?: string[];
}

interface Letter { label: string; devanagari: string }
const V = (label: string, devanagari: string): Letter => ({ label, devanagari });

/** Corner vowels per ring, clockwise NE, SE, SW, NW. */
const RING_CORNER_VOWELS: Letter[][] = [
  [V('a', 'अ'), V('ā', 'आ'), V('i', 'इ'), V('ī', 'ई')],
  [V('u', 'उ'), V('ū', 'ऊ'), V('ṛ', 'ऋ'), V('ṝ', 'ॠ')],
  [V('ḷ', 'ऌ'), V('ḹ', 'ॡ'), V('e', 'ए'), V('ai', 'ऐ')],
  [V('o', 'ओ'), V('au', 'औ'), V('aṃ', 'अं'), V('aḥ', 'अः')],
];

/** Ring-1 letters per side (East, South, West, North), each listed clockwise. */
const RING1_CONSONANTS: Letter[][] = [
  [V('a', 'अ'), V('va', 'व'), V('ka', 'क'), V('ha', 'ह'), V('ḍa', 'ड')],
  [V('ma', 'म'), V('ṭa', 'ट'), V('pa', 'प'), V('ra', 'र'), V('ta', 'त')],
  [V('na', 'न'), V('ya', 'य'), V('bha', 'भ'), V('ja', 'ज'), V('kha', 'ख')],
  [V('ga', 'ग'), V('sa', 'स'), V('da', 'द'), V('ca', 'च'), V('la', 'ल')],
];

/** Ring-2 rashis per side, clockwise (Vrishabha..Karka on the East side). */
const RING2_RASHIS: number[][] = [[2, 3, 4], [5, 6, 7], [8, 9, 10], [11, 12, 1]];

/** Outer-ring nakshatras (28-scheme indices) per side, clockwise, East side starting with Krittika. */
const RING0_NAKSHATRAS: number[][] = [
  [3, 4, 5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14, 15, 16],
  [17, 18, 19, 20, 21, 22, 23],
  [24, 25, 26, 27, 28, 1, 2],
];

interface TithiVara { group: SbcTithiGroup; label: string; tithis: number[]; weekdays: string[] }
const TITHI_VARA: Record<'E' | 'S' | 'W' | 'N' | 'CENTRE', TithiVara> = {
  E: { group: 'NANDA', label: 'Nanda', tithis: [1, 6, 11, 16, 21, 26], weekdays: ['Sunday', 'Tuesday'] },
  S: { group: 'BHADRA', label: 'Bhadra', tithis: [2, 7, 12, 17, 22, 27], weekdays: ['Monday', 'Wednesday'] },
  W: { group: 'JAYA', label: 'Jaya', tithis: [3, 8, 13, 18, 23, 28], weekdays: ['Thursday'] },
  N: { group: 'RIKTA', label: 'Rikta', tithis: [4, 9, 14, 19, 24, 29], weekdays: ['Friday'] },
  CENTRE: { group: 'PURNA', label: 'Purna', tithis: [5, 10, 15, 20, 25, 30], weekdays: ['Saturday'] },
};

const SIDES: Array<'E' | 'S' | 'W' | 'N'> = ['E', 'S', 'W', 'N'];
const CORNERS: Array<'NE' | 'SE' | 'SW' | 'NW'> = ['NE', 'SE', 'SW', 'NW'];

/** Cells of side `s` of ring `k`, in clockwise order (East = top row, left to right). */
function sideCells(k: number, s: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const lo = k + 1;
  const hi = 7 - k;
  for (let i = 0; i <= hi - lo; i++) {
    if (s === 0) out.push([k, lo + i]);
    else if (s === 1) out.push([lo + i, 8 - k]);
    else if (s === 2) out.push([8 - k, hi - i]);
    else out.push([hi - i, k]);
  }
  return out;
}

function cornerCells(k: number): Array<[number, number]> {
  return [[k, k], [k, 8 - k], [8 - k, 8 - k], [8 - k, k]];
}

let layoutCache: SarvatobhadraCellDef[][] | undefined;

/**
 * The fixed 9x9 layout, East at the top (North on the left), counted clockwise from the
 * north-east (Ishana) corner. Returned as rows of cells; do not mutate.
 */
export function sarvatobhadraLayout(): SarvatobhadraCellDef[][] {
  if (layoutCache) return layoutCache;
  const grid: (SarvatobhadraCellDef | undefined)[][] = Array.from({ length: 9 }, () => Array<SarvatobhadraCellDef | undefined>(9));
  for (let k = 0; k < 4; k++) {
    cornerCells(k).forEach(([row, col], c) => {
      const v = RING_CORNER_VOWELS[k][c];
      grid[row][col] = { row, col, ring: k, direction: CORNERS[c], kind: 'VOWEL', label: v.label, devanagari: v.devanagari };
    });
    for (let s = 0; s < 4; s++) {
      sideCells(k, s).forEach(([row, col], i) => {
        const direction = SIDES[s];
        if (k === 0) {
          const n = RING0_NAKSHATRAS[s][i];
          grid[row][col] = { row, col, ring: k, direction, kind: 'NAKSHATRA', label: CHAKRA_NAKSHATRAS_28[n - 1], nakshatra28Index: n };
        } else if (k === 1) {
          const l = RING1_CONSONANTS[s][i];
          grid[row][col] = { row, col, ring: k, direction, kind: 'CONSONANT', label: l.label, devanagari: l.devanagari };
        } else if (k === 2) {
          const r = RASHIS[RING2_RASHIS[s][i] - 1];
          grid[row][col] = { row, col, ring: k, direction, kind: 'RASHI', label: r.sanskritName, rashiIndex: r.index };
        } else {
          const t = TITHI_VARA[direction];
          grid[row][col] = { row, col, ring: k, direction, kind: 'TITHI_VARA', label: t.label, tithiGroup: t.group, tithis: t.tithis, weekdays: t.weekdays };
        }
      });
    }
  }
  const t = TITHI_VARA.CENTRE;
  grid[4][4] = { row: 4, col: 4, ring: 4, direction: 'CENTRE', kind: 'TITHI_VARA', label: t.label, tithiGroup: t.group, tithis: t.tithis, weekdays: t.weekdays };
  layoutCache = grid.map((r) => r.map((c) => c as SarvatobhadraCellDef));
  return layoutCache;
}

/** Grid position of a nakshatra (28-scheme index). */
export function sarvatobhadraNakshatraCell(n28: number): { row: number; col: number } {
  for (let s = 0; s < 4; s++) {
    const i = RING0_NAKSHATRAS[s].indexOf(n28);
    if (i >= 0) {
      const [row, col] = sideCells(0, s)[i];
      return { row, col };
    }
  }
  throw new RangeError(`nakshatra28Index must be 1..28, got ${n28}`);
}

export interface SarvatobhadraCellRef {
  row: number;
  col: number;
  kind: SbcCellKind;
  label: string;
  devanagari?: string;
}

const ref = (c: SarvatobhadraCellDef): SarvatobhadraCellRef =>
  c.devanagari ? { row: c.row, col: c.col, kind: c.kind, label: c.label, devanagari: c.devanagari } : { row: c.row, col: c.col, kind: c.kind, label: c.label };

/**
 * The three vedha lines from a nakshatra square: OPPOSITE (straight across), FORWARD (diagonal toward
 * the clockwise / zodiacal side) and BACKWARD (diagonal toward the anticlockwise side). Each list
 * holds the pierced squares in order, ending at the nakshatra on the far border.
 */
export function sarvatobhadraVedhaLines(n28: number): Record<'OPPOSITE' | 'FORWARD' | 'BACKWARD', SarvatobhadraCellRef[]> {
  const grid = sarvatobhadraLayout();
  const { row, col } = sarvatobhadraNakshatraCell(n28);
  // Inward normal n and clockwise tangent t of the side the nakshatra sits on.
  let n: [number, number];
  let t: [number, number];
  if (row === 0) { n = [1, 0]; t = [0, 1]; }
  else if (col === 8) { n = [0, -1]; t = [1, 0]; }
  else if (row === 8) { n = [-1, 0]; t = [0, -1]; }
  else { n = [0, 1]; t = [-1, 0]; }
  const walk = (dr: number, dc: number): SarvatobhadraCellRef[] => {
    const out: SarvatobhadraCellRef[] = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r <= 8 && c >= 0 && c <= 8) {
      out.push(ref(grid[r][c]));
      if (r === 0 || r === 8 || c === 0 || c === 8) break;
      r += dr;
      c += dc;
    }
    return out;
  };
  return {
    OPPOSITE: walk(n[0], n[1]),
    FORWARD: walk(n[0] + t[0], n[1] + t[1]),
    BACKWARD: walk(n[0] - t[0], n[1] - t[1]),
  };
}

/** Corner vowels and the nakshatra padas that pierce them (prev = last pada, next = first pada). */
const CORNER_NEIGHBOURS: Array<{ row: number; col: number; prev: number; next: number }> = [
  { row: 0, col: 0, prev: 2, next: 3 },    // NE a: Bharani 4 / Krittika 1
  { row: 0, col: 8, prev: 9, next: 10 },   // SE ā: Ashlesha 4 / Magha 1
  { row: 8, col: 8, prev: 16, next: 17 },  // SW i: Vishakha 4 / Anuradha 1
  { row: 8, col: 0, prev: 23, next: 24 },  // NW ī: Shravana 4 / Dhanishta 1
];

/** Corner vowel pierced by a body at this longitude, if any. */
export function sarvatobhadraCornerVowel(longitude: number): SarvatobhadraCellRef | undefined {
  const n28 = chakraNakshatra28Index(longitude);
  if (n28 === 22) return undefined;
  const pada = chakraPada27(longitude);
  const grid = sarvatobhadraLayout();
  for (const c of CORNER_NEIGHBOURS) {
    if ((n28 === c.prev && pada === 4) || (n28 === c.next && pada === 1)) return ref(grid[c.row][c.col]);
  }
  return undefined;
}

/** Planets whose vedha acts in all three directions regardless of motion (Garg 2022 after Narapati). */
const ALL_DIRECTION_PLANETS = new Set<PlanetSymbol>([PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.RAHU, PlanetSymbol.KETU]);

export type SarvatobhadraChartRole = 'NATAL' | 'TRANSIT';

export interface SarvatobhadraPlacement {
  planet: PlanetSymbol;
  longitude: number;
  nakshatra28Index: number;
  nakshatraName: string;
  pada: number | null;      // null inside Abhijit
  isRetrograde: boolean;
  row: number;
  col: number;
}

export interface SarvatobhadraVedha {
  chart: SarvatobhadraChartRole;
  planet: PlanetSymbol;
  fromNakshatra: string;
  direction: SbcVedhaDirection;
  /** True when the source's motion rule makes this line operative for the planet's present motion. */
  effectiveByMotion: boolean;
  cells: SarvatobhadraCellRef[];
}

export interface SarvatobhadraReferenceHit {
  chart: SarvatobhadraChartRole;   // chart of the piercing planet
  planet: PlanetSymbol;
  direction: SbcVedhaDirection;
  effectiveByMotion: boolean;
  reference: 'JANMA_NAKSHATRA' | 'MOON_RASHI' | 'LAGNA_RASHI';
  row: number;
  col: number;
  label: string;
}

export interface SarvatobhadraCell extends SarvatobhadraCellDef {
  natalPlanets: PlanetSymbol[];
  transitPlanets: PlanetSymbol[];
}

export interface SarvatobhadraChartSet {
  placements: SarvatobhadraPlacement[];
  vedhas: SarvatobhadraVedha[];
}

export interface SarvatobhadraResult {
  provisional: true;
  source: string;
  conventionNotes: string[];
  orientation: 'EAST_TOP';
  grid: SarvatobhadraCell[];   // 81 cells, row-major
  natal: SarvatobhadraChartSet;
  transit?: SarvatobhadraChartSet & { utcIso: string };
  natalReferences: {
    janmaNakshatra: { nakshatra28Index: number; name: string; row: number; col: number };
    moonRashi: { rashiIndex: number; name: string; row: number; col: number };
    lagnaRashi?: { rashiIndex: number; name: string; row: number; col: number };
  };
  /** Squares holding the natal references that fall on any vedha line (natal or transit). */
  referenceHits: SarvatobhadraReferenceHit[];
}

export const SARVATOBHADRA_CONVENTION_NOTES: readonly string[] = [
  'Grid drawn with East at the top (North on the left), counted clockwise from the north-east (Ishana) corner; some books draw North at the top — the cell relations are identical.',
  'Abhijit = 276°40\'–280°53\'20" (Uttarashadha pada 4 + first 1/15 of Shravana); alternative: Uttarashadha pada 4 only.',
  'Each occupied nakshatra casts three lines (OPPOSITE, FORWARD = clockwise diagonal, BACKWARD = anticlockwise diagonal); all three are listed for every planet.',
  'effectiveByMotion: Sun, Moon, Rahu and Ketu all three lines (Garg 2022; Aggarwal p. 45 names Sun and the nodes only); other planets OPPOSITE when direct, BACKWARD when retrograde.',
  'FORWARD vedha of a fast-moving (atichara) planet is not flagged: the sources give no speed threshold for "fast". Alternative (archive.org basics text): luminaries FORWARD only, nodes BACKWARD only.',
  'Corner vowels: a planet in the last pada of the nakshatra before a corner or the first pada of the one after pierces that vowel. The "similar vowel / paired consonant" extensions are not applied.',
  'Two slips in the published Wikipedia table (duplicate ṛ and ḷ) are corrected to ṝ (ring 2 NW) and ḹ (ring 3 SE) following the table\'s own vowel sequence.',
];

const PLANETS: readonly PlanetSymbol[] = MANDATORY_VEDIC_PLANETS;

function placementsOf(chart: AstroChart): SarvatobhadraPlacement[] {
  const out: SarvatobhadraPlacement[] = [];
  for (const planet of PLANETS) {
    const p = chart.planets[planet];
    if (!p) continue;
    const n28 = chakraNakshatra28Index(p.longitude);
    const { row, col } = sarvatobhadraNakshatraCell(n28);
    out.push({
      planet,
      longitude: p.longitude,
      nakshatra28Index: n28,
      nakshatraName: CHAKRA_NAKSHATRAS_28[n28 - 1],
      pada: n28 === 22 ? null : chakraPada27(p.longitude),
      isRetrograde: Boolean(p.isRetrograde),
      row,
      col,
    });
  }
  return out;
}

function vedhasOf(role: SarvatobhadraChartRole, placements: SarvatobhadraPlacement[]): SarvatobhadraVedha[] {
  const out: SarvatobhadraVedha[] = [];
  for (const pl of placements) {
    const lines = sarvatobhadraVedhaLines(pl.nakshatra28Index);
    const all = ALL_DIRECTION_PLANETS.has(pl.planet);
    const eff: Record<'OPPOSITE' | 'FORWARD' | 'BACKWARD', boolean> = {
      OPPOSITE: all || !pl.isRetrograde,
      FORWARD: all,
      BACKWARD: all || pl.isRetrograde,
    };
    for (const d of ['OPPOSITE', 'FORWARD', 'BACKWARD'] as const) {
      out.push({ chart: role, planet: pl.planet, fromNakshatra: pl.nakshatraName, direction: d, effectiveByMotion: eff[d], cells: lines[d] });
    }
    const corner = sarvatobhadraCornerVowel(pl.longitude);
    if (corner) out.push({ chart: role, planet: pl.planet, fromNakshatra: pl.nakshatraName, direction: 'CORNER_VOWEL', effectiveByMotion: true, cells: [corner] });
  }
  return out;
}

function rashiCell(rashiIndex: number): { row: number; col: number } {
  for (let s = 0; s < 4; s++) {
    const i = RING2_RASHIS[s].indexOf(rashiIndex);
    if (i >= 0) {
      const [row, col] = sideCells(2, s)[i];
      return { row, col };
    }
  }
  throw new RangeError(`rashiIndex must be 1..12, got ${rashiIndex}`);
}

export class SarvatobhadraChakraCalculator {
  constructor(private readonly chartCalculator: ChartCalculator = new ChartCalculator()) {}

  /** Natal chakra, optionally with transit planets at `moment` (a civil moment + place). */
  public async calculate(
    birth: BirthDetails,
    moment?: BirthDetails,
    config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG,
  ): Promise<SarvatobhadraResult> {
    const natal = await this.chartCalculator.calculateChart(birth, config);
    const transit = moment ? await this.chartCalculator.calculateChart(moment, config) : undefined;
    return SarvatobhadraChakraCalculator.fromCharts(natal, transit);
  }

  /** Pure assembly from already-computed charts. */
  public static fromCharts(natalChart: AstroChart, transitChart?: AstroChart): SarvatobhadraResult {
    const layout = sarvatobhadraLayout();
    const natalPl = placementsOf(natalChart);
    const transitPl = transitChart ? placementsOf(transitChart) : [];
    const grid: SarvatobhadraCell[] = [];
    for (const row of layout) {
      for (const c of row) {
        grid.push({
          ...c,
          natalPlanets: natalPl.filter((p) => p.row === c.row && p.col === c.col).map((p) => p.planet),
          transitPlanets: transitPl.filter((p) => p.row === c.row && p.col === c.col).map((p) => p.planet),
        });
      }
    }
    const natal: SarvatobhadraChartSet = { placements: natalPl, vedhas: vedhasOf('NATAL', natalPl) };
    const transit = transitChart
      ? { utcIso: transitChart.metadata.normalizedTime.utcIsoString, placements: transitPl, vedhas: vedhasOf('TRANSIT', transitPl) }
      : undefined;

    const moon = natalChart.planets[PlanetSymbol.MOON];
    const jn = chakraNakshatra28Index(moon.longitude);
    const jnCell = sarvatobhadraNakshatraCell(jn);
    const moonRashiCell = rashiCell(moon.rashiIndex);
    const asc = natalChart.ascendant;
    const natalReferences: SarvatobhadraResult['natalReferences'] = {
      janmaNakshatra: { nakshatra28Index: jn, name: CHAKRA_NAKSHATRAS_28[jn - 1], ...jnCell },
      moonRashi: { rashiIndex: moon.rashiIndex, name: RASHIS[moon.rashiIndex - 1].sanskritName, ...moonRashiCell },
      ...(asc ? { lagnaRashi: { rashiIndex: asc.rashiIndex, name: RASHIS[asc.rashiIndex - 1].sanskritName, ...rashiCell(asc.rashiIndex) } } : {}),
    };

    const refs: Array<{ reference: SarvatobhadraReferenceHit['reference']; row: number; col: number; label: string }> = [
      { reference: 'JANMA_NAKSHATRA', ...jnCell, label: natalReferences.janmaNakshatra.name },
      { reference: 'MOON_RASHI', ...moonRashiCell, label: natalReferences.moonRashi.name },
    ];
    if (natalReferences.lagnaRashi) {
      const l = natalReferences.lagnaRashi;
      refs.push({ reference: 'LAGNA_RASHI', row: l.row, col: l.col, label: l.name });
    }
    const referenceHits: SarvatobhadraReferenceHit[] = [];
    for (const v of [...natal.vedhas, ...(transit?.vedhas ?? [])]) {
      for (const r of refs) {
        if (v.cells.some((c) => c.row === r.row && c.col === r.col)) {
          referenceHits.push({ chart: v.chart, planet: v.planet, direction: v.direction, effectiveByMotion: v.effectiveByMotion, ...r });
        }
      }
    }

    return {
      provisional: true,
      source: SARVATOBHADRA_SOURCE,
      conventionNotes: [...SARVATOBHADRA_CONVENTION_NOTES],
      orientation: 'EAST_TOP',
      grid,
      natal,
      ...(transit ? { transit } : {}),
      natalReferences,
      referenceHits,
    };
  }
}
