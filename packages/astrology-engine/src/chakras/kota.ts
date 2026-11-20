/**
 * Kota Chakra (Durga chakra): the 28 nakshatras (with Abhijit) counted from the janma nakshatra
 * and laid out in four concentric squares (Stambha, Madhya/Durgantara, Prakara, Bahya), with the
 * Kota Swami, the Kota Pala and the entry/exit paths.
 *
 * PROVISIONAL – pending client review (ADR-016 §6). Calculated facts only, no interpretation.
 *
 * Sources:
 *  - Division by count from the janma nakshatra (1 = janma): Stambha 4, 11, 18, 25; Madhya
 *    3, 5, 10, 12, 17, 19, 24, 26; Prakara 2, 6, 9, 13, 16, 20, 23, 27; Bahya 1, 7, 8, 14, 15, 21, 22, 28;
 *    janma nakshatra placed in the north-east; entry paths along the semi-cardinal directions
 *    (NE, SE, SW, NW) converging on the Stambha, exit paths from the Stambha to the cardinal points
 *    (E, S, W, N); Rahu, Ketu and retrograde planets reverse entry/exit. V. Ayalur, "Kota Chakra"
 *    (vijayalur.com, 2011, worked example: janma Rohini -> Stambha Punarvasu, Chitra, Uttarashadha,
 *    Revati) and M. R. Garg, "Kota Chakra (कोट / दुर्गा चक्र)" (2024), both after Narapatijayacharya
 *    Svarodaya and K. N. Rao / K. K. Joshi, "Kota Chakra and Sanghatta Chakra" (Sagar).
 *  - Kota Swami = lord of the rashi of the natal Moon; Kota Pala = lord of the varga of the janma
 *    nakshatra pada's Avakahada letter (Garg 2024, 108-pada table; Ayalur example Magha pada 3 -> Saturn).
 */
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { AstroChart } from '../chart/astro-chart.types';
import { ChartCalculator } from '../chart/chart-calculator';
import { BirthDetails } from '../input/birth-details';
import { MANDATORY_VEDIC_PLANETS, PlanetSymbol } from '../planets/planet.types';
import { RASHIS } from '../zodiac/rashi';
import { getNakshatraIndex } from '../nakshatra/nakshatra';
import { CHAKRA_NAKSHATRAS_28, chakraNakshatra28Index, chakraPada27 } from './chakra-nakshatra28';

export const KOTA_CHAKRA_SOURCE =
  'Kota Chakra after Narapatijayacharya Svarodaya: divisions, entry/exit paths and Kota Swami per V. Ayalur ' +
  '"Kota Chakra" (2011) and M. R. Garg "Kota Chakra" (2024, citing K. N. Rao / K. K. Joshi, Kota Chakra and ' +
  'Sanghatta Chakra); Kota Pala per Garg\'s 108-pada Avakahada table (letter-varga lords).';

export type KotaDivision = 'STAMBHA' | 'MADHYA' | 'PRAKARA' | 'BAHYA';
export type KotaDirection = 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'N';
export type KotaPath = 'ENTRY' | 'EXIT';

/** Division and path of the k-th position (1..7) inside each quarter of seven nakshatras. */
const QUARTER: Array<{ division: KotaDivision; path: KotaPath }> = [
  { division: 'BAHYA', path: 'ENTRY' },
  { division: 'PRAKARA', path: 'ENTRY' },
  { division: 'MADHYA', path: 'ENTRY' },
  { division: 'STAMBHA', path: 'ENTRY' },
  { division: 'MADHYA', path: 'EXIT' },
  { division: 'PRAKARA', path: 'EXIT' },
  { division: 'BAHYA', path: 'EXIT' },
];
const QUARTER_CORNER: KotaDirection[] = ['NE', 'SE', 'SW', 'NW'];
const QUARTER_CARDINAL: KotaDirection[] = ['E', 'S', 'W', 'N'];

export interface KotaPosition {
  count: number;             // 1..28 counted from the janma nakshatra (1 = janma)
  nakshatra28Index: number;  // 1..28 (22 = Abhijit)
  nakshatraName: string;
  division: KotaDivision;
  direction: KotaDirection;  // radial line the square sits on
  path: KotaPath;
  /** 1 = outermost square on its path .. 4 = Stambha (entry), and 3..1 going out (exit). */
  depth: number;
}

/** Kota position of the `count`-th nakshatra (1..28) from the janma nakshatra. Pure table rule. */
export function kotaPositionForCount(count: number, janma28: number): KotaPosition {
  if (!Number.isInteger(count) || count < 1 || count > 28) throw new RangeError(`count must be 1..28, got ${count}`);
  const q = Math.floor((count - 1) / 7);
  const k = (count - 1) % 7;
  const n28 = ((janma28 - 1 + count - 1) % 28) + 1;
  const depthByDivision: Record<KotaDivision, number> = { BAHYA: 1, PRAKARA: 2, MADHYA: 3, STAMBHA: 4 };
  return {
    count,
    nakshatra28Index: n28,
    nakshatraName: CHAKRA_NAKSHATRAS_28[n28 - 1],
    division: QUARTER[k].division,
    direction: k < 4 ? QUARTER_CORNER[q] : QUARTER_CARDINAL[q],
    path: QUARTER[k].path,
    depth: depthByDivision[QUARTER[k].division],
  };
}

/** Planetary lord of each Avakahada letter varga (Garg 2024 table, all 108 padas). */
export type KotaLetterVarga = 'A' | 'KA' | 'CA' | 'TTA' | 'TA' | 'PA' | 'YA' | 'SHA';
export const KOTA_VARGA_LORDS: Record<KotaLetterVarga, PlanetSymbol> = {
  A: PlanetSymbol.SUN,       // vowels
  KA: PlanetSymbol.MARS,     // क ख ग घ ङ
  CA: PlanetSymbol.VENUS,    // च छ ज झ ञ
  TTA: PlanetSymbol.MERCURY, // ट ठ ड ढ ण
  TA: PlanetSymbol.JUPITER,  // त थ द ध न
  PA: PlanetSymbol.SATURN,   // प फ ब भ म
  YA: PlanetSymbol.MOON,     // य र ल व
  SHA: PlanetSymbol.RAHU,    // श ष स ह
};

/**
 * Avakahada syllable (Devanagari) of each pada, 27 nakshatras x 4, and its letter varga.
 * Standard Avakahada / Namakshara table (e.g. Muhurta Chintamani; same letters as Garg 2024).
 */
export const KOTA_PADA_LETTERS: ReadonlyArray<readonly [string, KotaLetterVarga, string, KotaLetterVarga, string, KotaLetterVarga, string, KotaLetterVarga]> = [
  ['चू', 'CA', 'चे', 'CA', 'चो', 'CA', 'ला', 'YA'],      // Ashwini
  ['ली', 'YA', 'लू', 'YA', 'ले', 'YA', 'लो', 'YA'],      // Bharani
  ['अ', 'A', 'इ', 'A', 'उ', 'A', 'ए', 'A'],              // Krittika
  ['ओ', 'A', 'वा', 'YA', 'वी', 'YA', 'वू', 'YA'],        // Rohini
  ['वे', 'YA', 'वो', 'YA', 'का', 'KA', 'की', 'KA'],      // Mrigashira
  ['कू', 'KA', 'घ', 'KA', 'ङ', 'KA', 'छ', 'CA'],         // Ardra
  ['के', 'KA', 'को', 'KA', 'हा', 'SHA', 'ही', 'SHA'],    // Punarvasu
  ['हू', 'SHA', 'हे', 'SHA', 'हो', 'SHA', 'डा', 'TTA'],  // Pushya
  ['डी', 'TTA', 'डू', 'TTA', 'डे', 'TTA', 'डो', 'TTA'],  // Ashlesha
  ['मा', 'PA', 'मी', 'PA', 'मू', 'PA', 'मे', 'PA'],      // Magha
  ['मो', 'PA', 'टा', 'TTA', 'टी', 'TTA', 'टू', 'TTA'],   // Purva Phalguni
  ['टे', 'TTA', 'टो', 'TTA', 'पा', 'PA', 'पी', 'PA'],    // Uttara Phalguni
  ['पू', 'PA', 'ष', 'SHA', 'ण', 'TTA', 'ठ', 'TTA'],      // Hasta
  ['पे', 'PA', 'पो', 'PA', 'रा', 'YA', 'री', 'YA'],      // Chitra
  ['रू', 'YA', 'रे', 'YA', 'रो', 'YA', 'ता', 'TA'],      // Swati
  ['ती', 'TA', 'तू', 'TA', 'ते', 'TA', 'तो', 'TA'],      // Vishakha
  ['ना', 'TA', 'नी', 'TA', 'नू', 'TA', 'ने', 'TA'],      // Anuradha
  ['नो', 'TA', 'या', 'YA', 'यी', 'YA', 'यू', 'YA'],      // Jyeshtha
  ['ये', 'YA', 'यो', 'YA', 'भा', 'PA', 'भी', 'PA'],      // Mula
  ['भू', 'PA', 'धा', 'TA', 'फा', 'PA', 'ढा', 'TTA'],     // Purva Ashadha
  ['भे', 'PA', 'भो', 'PA', 'जा', 'CA', 'जी', 'CA'],      // Uttara Ashadha
  ['खी', 'KA', 'खू', 'KA', 'खे', 'KA', 'खो', 'KA'],      // Shravana
  ['गा', 'KA', 'गी', 'KA', 'गू', 'KA', 'गे', 'KA'],      // Dhanishta
  ['गो', 'KA', 'सा', 'SHA', 'सी', 'SHA', 'सू', 'SHA'],   // Shatabhisha
  ['से', 'SHA', 'सो', 'SHA', 'दा', 'TA', 'दी', 'TA'],    // Purva Bhadrapada
  ['दू', 'TA', 'थ', 'TA', 'झ', 'CA', 'ञ', 'CA'],         // Uttara Bhadrapada
  ['दे', 'TA', 'दो', 'TA', 'चा', 'CA', 'ची', 'CA'],      // Revati
];

/** Kota Pala for a 27-scheme nakshatra (1..27) and pada (1..4). */
export function kotaPalaFor(nakshatra27: number, pada: number): { letter: string; varga: KotaLetterVarga; lord: PlanetSymbol } {
  const row = KOTA_PADA_LETTERS[nakshatra27 - 1];
  if (!row || pada < 1 || pada > 4) throw new RangeError(`invalid nakshatra ${nakshatra27} / pada ${pada}`);
  const letter = row[(pada - 1) * 2] as string;
  const varga = row[(pada - 1) * 2 + 1] as KotaLetterVarga;
  return { letter, varga, lord: KOTA_VARGA_LORDS[varga] };
}

export type KotaChartRole = 'NATAL' | 'TRANSIT';
export type KotaMovement = 'ENTERING' | 'EXITING';

export interface KotaPlacement extends KotaPosition {
  chart: KotaChartRole;
  planet: PlanetSymbol;
  longitude: number;
  isRetrograde: boolean;   // Rahu/Ketu always treated as retrograde (source rule)
  movement: KotaMovement;  // ENTRY path -> ENTERING when direct, reversed when retrograde
  isKotaSwami: boolean;
  isKotaPala: boolean;
}

export interface KotaChakraResult {
  provisional: true;
  source: string;
  conventionNotes: string[];
  janmaNakshatra: { nakshatra28Index: number; name: string; pada: number | null };
  kotaSwami: { planet: PlanetSymbol; moonRashiIndex: number; moonRashi: string };
  kotaPala: { planet: PlanetSymbol; letter: string; varga: KotaLetterVarga; nakshatra27Index: number; pada: number };
  positions: KotaPosition[];   // 28 squares, count order
  natal: KotaPlacement[];
  transit?: { utcIso: string; placements: KotaPlacement[] };
}

export const KOTA_CONVENTION_NOTES: readonly string[] = [
  'Count includes Abhijit (276°40\'–280°53\'20"); janma nakshatra = 28-scheme nakshatra of the natal Moon.',
  'Within each quarter of seven: positions 1–4 lie on the entry path (Bahya, Prakara, Madhya, Stambha along NE/SE/SW/NW); 5–7 on the exit path (Madhya, Prakara, Bahya toward E/S/W/N).',
  'The Stambha square is the end of the entry path; it is labelled ENTRY.',
  'Retrograde planets, and Rahu/Ketu always, have entry and exit reversed (movement EXITING on an entry path).',
  'Kota Pala uses the janma pada letter (Garg). Ayalur also allows the first letter of the given name; not used. For a Moon in Abhijit the pada of the ordinary 27-nakshatra scheme gives the letter.',
];

const PLANETS: readonly PlanetSymbol[] = MANDATORY_VEDIC_PLANETS;

function placementsOf(role: KotaChartRole, chart: AstroChart, janma28: number, swami: PlanetSymbol, pala: PlanetSymbol): KotaPlacement[] {
  const out: KotaPlacement[] = [];
  for (const planet of PLANETS) {
    const p = chart.planets[planet];
    if (!p) continue;
    const n28 = chakraNakshatra28Index(p.longitude);
    const count = ((n28 - janma28 + 28) % 28) + 1;
    const pos = kotaPositionForCount(count, janma28);
    const retro = planet === PlanetSymbol.RAHU || planet === PlanetSymbol.KETU ? true : Boolean(p.isRetrograde);
    const forward: KotaMovement = pos.path === 'ENTRY' ? 'ENTERING' : 'EXITING';
    const movement: KotaMovement = retro ? (forward === 'ENTERING' ? 'EXITING' : 'ENTERING') : forward;
    out.push({ ...pos, chart: role, planet, longitude: p.longitude, isRetrograde: retro, movement, isKotaSwami: planet === swami, isKotaPala: planet === pala });
  }
  return out;
}

export class KotaChakraCalculator {
  constructor(private readonly chartCalculator: ChartCalculator = new ChartCalculator()) {}

  public async calculate(birth: BirthDetails, moment?: BirthDetails, config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG): Promise<KotaChakraResult> {
    const natal = await this.chartCalculator.calculateChart(birth, config);
    const transit = moment ? await this.chartCalculator.calculateChart(moment, config) : undefined;
    return KotaChakraCalculator.fromCharts(natal, transit);
  }

  public static fromCharts(natalChart: AstroChart, transitChart?: AstroChart): KotaChakraResult {
    const moon = natalChart.planets[PlanetSymbol.MOON];
    const janma28 = chakraNakshatra28Index(moon.longitude);
    const n27 = getNakshatraIndex(moon.longitude);
    const pada = chakraPada27(moon.longitude);
    const swami = RASHIS[moon.rashiIndex - 1].ruler as PlanetSymbol;
    const pala = kotaPalaFor(n27, pada);
    const positions = Array.from({ length: 28 }, (_, i) => kotaPositionForCount(i + 1, janma28));
    return {
      provisional: true,
      source: KOTA_CHAKRA_SOURCE,
      conventionNotes: [...KOTA_CONVENTION_NOTES],
      janmaNakshatra: { nakshatra28Index: janma28, name: CHAKRA_NAKSHATRAS_28[janma28 - 1], pada: janma28 === 22 ? null : pada },
      kotaSwami: { planet: swami, moonRashiIndex: moon.rashiIndex, moonRashi: RASHIS[moon.rashiIndex - 1].sanskritName },
      kotaPala: { planet: pala.lord, letter: pala.letter, varga: pala.varga, nakshatra27Index: n27, pada },
      positions,
      natal: placementsOf('NATAL', natalChart, janma28, swami, pala.lord),
      ...(transitChart
        ? { transit: { utcIso: transitChart.metadata.normalizedTime.utcIsoString, placements: placementsOf('TRANSIT', transitChart, janma28, swami, pala.lord) } }
        : {}),
    };
  }
}
