/**
 * Avakahada Chakra (birth synopsis) shared by the annual reports.
 *
 * Moon-based attributes come from the engine's AvakhadaChakraCalculator; the
 * birth Panchanga (tithi, vara, yoga, karana) from PanchangCalculator at the
 * birth instant; the tropical ("Western") Sun sign from the raw ephemeris
 * longitude. Nothing here is estimated.
 */
import {
  AstronomyEngineAdapter,
  AvakhadaChakraCalculator,
  PanchangCalculator,
  PlanetSymbol,
} from '@astro/astrology-engine';
import { AddEvidence, planetName, SIGNS } from '../../evidence/evidence-registry';
import { nakshatraLabel } from '../../i18n/hindi';
import { blockLang, BlockOutput, BlockRenderer } from '../../render/blocks';
import { tex } from '../../render/latex';
import { avakahadaValueHi, L } from './annual-shared.hindi';
import { ChartSnapshot } from '../../snapshot/chart-snapshot';

export interface AvakahadaFacts {
  moonSign: string;
  moonSignLord: string;
  nakshatra: string;
  pada: number;
  nakshatraLord: string;
  lagnaSign: string;
  lagnaLord: string;
  tropicalSunSign: string;
  tithi: string;
  vara: string;
  yoga: string;
  karana: string;
  gana: string;
  yoni: string;
  nadi: string;
  varna: string;
  vashya: string;
  tatva: string;
  paya: string;
  yunja: string;
  hansaka: string;
  namakshara: string;
}

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export function computeAvakahada(snapshot: ChartSnapshot): AvakahadaFacts {
  const raw = snapshot.raw;
  const moon = raw.planets[PlanetSymbol.MOON];
  const sun = raw.planets[PlanetSymbol.SUN];
  const ascRashi = snapshot.natal.ascendant.rashiIndex;
  const av = AvakhadaChakraCalculator.calculateAvakhada(moon.longitude, ascRashi);
  const jd = raw.metadata.normalizedTime.julianDayUT;
  const birthUtc = new Date(Math.round((jd - 2440587.5) * 86400000));
  const pan = new PanchangCalculator().calculatePanchang(sun.longitude, moon.longitude, birthUtc, {
    latitude: snapshot.subject.latitude, longitude: snapshot.subject.longitude,
  });
  const tropicalSun = new AstronomyEngineAdapter().getPlanetaryPosition(PlanetSymbol.SUN, jd).longitude;
  const moonN = snapshot.natal.planets.find((p) => String(p.name).toUpperCase() === 'MOON')!;
  return {
    moonSign: moonN.sign,
    moonSignLord: planetName(String(av.rashiLord)),
    nakshatra: moonN.nakshatra,
    pada: moonN.pada,
    nakshatraLord: planetName(String(moonN.nakshatraLord)),
    lagnaSign: snapshot.natal.ascendant.sign,
    lagnaLord: planetName(String(snapshot.natal.ascendant.lord)),
    tropicalSunSign: SIGNS[Math.floor((((tropicalSun % 360) + 360) % 360) / 30)],
    tithi: `${title(pan.tithi.paksha)} ${pan.tithi.name}`,
    vara: pan.vara.name,
    yoga: pan.yoga.name,
    karana: pan.karana.name,
    gana: av.gana,
    yoni: `${av.yoni} (${av.yoniGender.toLowerCase()})`,
    nadi: av.nadi,
    varna: av.varna,
    vashya: av.vashya,
    tatva: av.tatwa,
    paya: av.paya,
    yunja: av.yunja,
    hansaka: av.hansaka,
    namakshara: av.namakshara,
  };
}

/** Registers `avakahada.*` evidence. */
export function addAvakahadaEvidence(add: AddEvidence, f: AvakahadaFacts): void {
  const src = 'panchang.AvakhadaChakraCalculator';
  add('avakahada.gana', 'avakahada', `Birth Gana (temperament class of the Moon's nakshatra) is ${f.gana}`, f.gana, src);
  add('avakahada.yoni', 'avakahada', `Birth Yoni (nakshatra animal symbol) is ${f.yoni}`, f.yoni, src);
  add('avakahada.nadi', 'avakahada', `Birth Nadi is ${f.nadi}`, f.nadi, src);
  add('avakahada.varna', 'avakahada', `Varna of the Moon sign is ${f.varna}`, f.varna, src);
  add('avakahada.vashya', 'avakahada', `Vashya of the Moon sign is ${f.vashya}`, f.vashya, src);
  add('avakahada.tatva', 'avakahada', `Element (tatva) of the Moon sign is ${f.tatva}`, f.tatva, src);
  add('avakahada.moon-sign-lord', 'avakahada', `The Moon sign (Rashi) ${f.moonSign} is ruled by ${f.moonSignLord}`, f.moonSignLord, src);
  add('avakahada.nakshatra-lord', 'avakahada', `The birth nakshatra ${f.nakshatra} (pada ${f.pada}) is ruled by ${f.nakshatraLord}`, f.nakshatraLord, src);
  add('avakahada.tithi', 'panchang', `Birth tithi (lunar day) is ${f.tithi}`, f.tithi, 'panchang.PanchangCalculator');
  add('avakahada.yoga', 'panchang', `Birth Panchanga yoga is ${f.yoga}`, f.yoga, 'panchang.PanchangCalculator');
  add('avakahada.karana', 'panchang', `Birth karana is ${f.karana}`, f.karana, 'panchang.PanchangCalculator');
  add('avakahada.vara', 'panchang', `Born on a ${f.vara} (weekday)`, f.vara, 'panchang.PanchangCalculator');
  add('avakahada.tropical-sun', 'avakahada', `Western (tropical) Sun sign is ${f.tropicalSunSign}`, f.tropicalSunSign, 'ephemeris.tropical');
}

const ROWS: Array<[string, (f: AvakahadaFacts) => string]> = [
  ['Ascendant (Lagna)', (f) => f.lagnaSign],
  ['Ascendant lord', (f) => f.lagnaLord],
  ['Moon sign (Rashi)', (f) => f.moonSign],
  ['Rashi lord', (f) => f.moonSignLord],
  ['Nakshatra and pada', (f) => `${f.nakshatra}, pada ${f.pada}`],
  ['Nakshatra lord', (f) => f.nakshatraLord],
  ['Western Sun sign', (f) => f.tropicalSunSign],
  ['Name syllable (namakshara)', (f) => f.namakshara],
  ['Tithi', (f) => f.tithi],
  ['Vara (weekday)', (f) => f.vara],
  ['Yoga', (f) => f.yoga],
  ['Karana', (f) => f.karana],
  ['Gana', (f) => f.gana],
  ['Yoni', (f) => f.yoni],
  ['Nadi', (f) => f.nadi],
  ['Varna', (f) => f.varna],
  ['Vashya', (f) => f.vashya],
  ['Tatva (element)', (f) => f.tatva],
  ['Paya', (f) => f.paya],
  ['Yunja', (f) => f.yunja],
  ['Hansaka', (f) => f.hansaka],
];

export const AVAKAHADA_IDS = [
  'asc.d1.sign', 'asc.d1.lord', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'avakahada.moon-sign-lord',
  'avakahada.nakshatra-lord', 'avakahada.tropical-sun', 'avakahada.tithi', 'avakahada.vara', 'avakahada.yoga',
  'avakahada.karana', 'avakahada.gana', 'avakahada.yoni', 'avakahada.nadi', 'avakahada.varna', 'avakahada.vashya', 'avakahada.tatva',
];

/** Two-column-pair synopsis table. `extKey` names where the module stored AvakahadaFacts in ext. */
export function avakahadaBlock(extKey: string): BlockRenderer {
  return (ctx): BlockOutput => {
    const f = ctx.ext[extKey] as AvakahadaFacts | undefined;
    if (!f) throw new Error('BLOCK_DATA_MISSING: avakahada');
    const s = ctx.snapshot.subject;
    const lang = blockLang(ctx);
    const head: Array<[string, string]> = [
      [L(lang, 'Name'), s.name],
      [L(lang, 'Date of birth'), s.dateOfBirth.split('-').reverse().join('/')],
      [L(lang, 'Time of birth'), s.timeOfBirth ?? '—'],
      [L(lang, 'Place of birth'), s.placeName],
    ];
    const nak = (en: string) => nakshatraLabel('hi', en);
    const all = [...head, ...ROWS.map(([k, fn]) => [L(lang, k), lang === 'hi' ? avakahadaValueHi(k, f, nak) : fn(f)] as [string, string])];
    const half = Math.ceil(all.length / 2);
    const lines: string[] = [];
    for (let i = 0; i < half; i++) {
      const a = all[i];
      const b = all[i + half];
      lines.push(`${i % 2 ? '\\rowcolor{Surface}' : ''}\\TCell{\\textbf{${tex(a[0])}}} & \\TCell{${tex(a[1])}} & \\TCell{${b ? `\\textbf{${tex(b[0])}}` : ''}} & \\TCell{${b ? tex(b[1]) : ''}}\\\\`);
    }
    return {
      tex: [
        '\\begin{center}\\begin{tabularx}{\\linewidth}{>{\\raggedright\\arraybackslash}p{0.2\\linewidth}>{\\raggedright\\arraybackslash}X>{\\raggedright\\arraybackslash}p{0.2\\linewidth}>{\\raggedright\\arraybackslash}X}',
        `\\TableHead\\THd{${L(lang, 'Factor')}} & \\THd{${L(lang, 'Value')}} & \\THd{${L(lang, 'Factor')}} & \\THd{${L(lang, 'Value')}}\\\\`,
        ...lines,
        '\\bottomrule\\end{tabularx}\\end{center}',
      ].join('\n'),
      evidenceIds: AVAKAHADA_IDS,
      method: L(lang, `Avakahada Chakra from the Moon's sign, nakshatra and pada, and the Panchanga at the birth instant, computed by the engine's Avakhada and Panchanga calculators. Western Sun sign uses the tropical zodiac; everything else is sidereal (Lahiri).`),
    };
  };
}
