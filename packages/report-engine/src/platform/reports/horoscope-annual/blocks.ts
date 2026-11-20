/**
 * Deterministic blocks of the Personalised (annual) Horoscope.
 */
import { ordinal } from '../../evidence/evidence-registry';
import { BlockContext, BlockOutput, BlockRenderer, kvTable } from '../../render/blocks';
import { tex } from '../../render/latex';
import { avakahadaBlock } from '../_annual-shared/avakahada';
import { GOCHARA_METHOD, pad2, PLANET_ASSOC, SLOW_PLANETS } from '../_annual-shared/astro';
import { cols, gocharaChip, gridTable, localDate, longTable, transitRow } from '../_annual-shared/tables';
import { periodsBetween } from '../_annual-shared/transits';
import { HORO_AREAS, HoroAreaKey, HoroscopeYearData } from './calc/horoscope-year';
import { factorText } from './evidence';
import { luckyFor } from './lucky';

export const EXT_KEY = 'horoscope';

function data(ctx: BlockContext): HoroscopeYearData {
  const d = ctx.ext[EXT_KEY] as HoroscopeYearData | undefined;
  if (!d) throw new Error('BLOCK_DATA_MISSING: horoscope');
  return d;
}
const tz = (ctx: BlockContext) => ctx.snapshot.subject.timezone;

export const horoscopeSynopsis = avakahadaBlock('avakahada');

/** Windows × slow planets overview. */
export function horoscopeWindows(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const rows = d.windows.map((w) => [
    `\\textbf{${tex(w.label)}}`,
    ...SLOW_PLANETS.map((p) => periodsBetween(d.transits[p], w.startIso, w.endIso)
      .map((t) => `${tex(t.sign)}~{\\color{Muted}(Mo~${t.houseFromMoon}, As~${t.houseFromLagna})}`).join('\\newline ')),
  ]);
  return {
    tex: gridTable(cols('l.17', 'X', 'X', 'X', 'X'), ['Window', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'], rows),
    evidenceIds: d.windows.flatMap((w) => [`horo.window.${w.index}.dates`, ...SLOW_PLANETS.map((p) => `horo.window.${w.index}.${p.toLowerCase()}`)]),
    method: 'Signs occupied by the slow planets in each four-month window (TransitIngressSolver). Mo n = the nth house counted from your natal Moon sign; As n = counted from your natal Ascendant.',
  };
}

export function horoscopeSlowTable(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const rows = SLOW_PLANETS.flatMap((p) => d.transits[p].map((t) => transitRow(t, tz(ctx))));
  return {
    tex: gridTable(cols('l.1', 'l.29', 'l.14', 'c.1', 'c.1', 'X'), ['Planet', 'Period', 'Sign', 'From Asc', 'From Moon', 'Gochara'], rows),
    evidenceIds: SLOW_PLANETS.flatMap((p) => d.transits[p].map((_, i) => `horo.transit.${p.toLowerCase()}.${pad2(i + 1)}`)),
    method: `Sign periods within the horoscope year; (R) = retrograde re-entry. ${GOCHARA_METHOD}`,
  };
}

export function horoscopeFastTable(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const planets = ['Venus', 'Mars', 'Mercury'] as const;
  const rows = planets.flatMap((p) => d.transits[p].map((t) => transitRow(t, tz(ctx))));
  return {
    tex: longTable('p{0.1\\linewidth}p{0.29\\linewidth}p{0.15\\linewidth}p{0.09\\linewidth}p{0.09\\linewidth}p{0.13\\linewidth}', ['Planet', 'Period', 'Sign', 'From Asc', 'From Moon', 'Gochara'], rows),
    evidenceIds: planets.flatMap((p) => d.transits[p].map((_, i) => `horo.transit.${p.toLowerCase()}.${pad2(i + 1)}`)),
    method: `Venus, Mars and Mercury sign periods within the horoscope year. ${GOCHARA_METHOD}`,
  };
}

export function horoscopeArea(key: HoroAreaKey): BlockRenderer {
  return (ctx) => {
    const d = data(ctx);
    const area = HORO_AREAS.find((a) => a.key === key)!;
    const rows = d.windows.map((w, i) => {
      const list = d.areaFactors[key][i];
      return [`\\textbf{${tex(w.label)}}`, list.length ? list.map((f) => tex(factorText(f, tz(ctx)))).join('\\newline ') : '{\\color{Muted}No slow-planet transit over these houses; the natal promise and the running dasha carry this window.}'];
    });
    return {
      tex: `\\begin{asCard}\\CardTitle{In short: ${tex(area.label.toLowerCase())} through the year}{\\fontsize{9}{12}\\selectfont Houses watched: ${tex(area.houses.map(ordinal).join(', '))}, counted from your Moon sign and from your Ascendant.\\par}\\end{asCard}\n${gridTable(cols('l.22', 'X'), ['Window', 'Slow-planet transits over these houses'], rows)}`,
      evidenceIds: d.windows.map((w) => `horo.area.${key}.window.${w.index}`),
      method: 'Jupiter, Saturn, Rahu and Ketu transits that fall on the houses classically signifying this area (BPHS bhava significations), counted both from the Moon sign and from the Ascendant. Listed as facts, not graded.',
    };
  };
}

export function horoscopeLucky(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const l = luckyFor(d.moonSignLord, d.lagnaLord);
  const rows: Array<[string, string]> = [
    ['Ruling planet of your Moon sign', `${l.planet} (Ascendant lord: ${l.secondary})`],
    ['Supportive number', String(l.number)],
    ['Supportive dates of any month', l.dates.map((x) => ordinal(x)).join(', ')],
    ['Supportive weekday', l.weekday],
    ['Favourable colours', `${l.colours}; also ${l.secondaryColours} (from ${l.secondary})`],
    ['Colours to use more sparingly', l.cautionColours || '—'],
    ['Dates calling for extra patience', l.cautionDates.length ? l.cautionDates.map((x) => ordinal(x)).join(', ') : '—'],
    ['Traditional gem of the ruling planet', `${l.gem} (symbolic only; nothing to buy)`],
    ['Traditional deity and mantra', `${PLANET_ASSOC[l.planet].deity}; “${PLANET_ASSOC[l.planet].mantra}”`],
  ];
  return {
    tex: `${kvTable(rows)}\n\\begin{asCaution}{\\fontsize{9.3}{13}\\selectfont These are traditional correspondences, offered as gentle symbols. No colour, date or gem can override your choices, and none needs to be bought.\\par}\\end{asCaution}`,
    evidenceIds: ['horo.lucky.planet', 'horo.lucky.number', 'horo.lucky.dates', 'horo.lucky.weekday', 'horo.lucky.colours', 'horo.lucky.caution', 'horo.lucky.deity'],
    method: 'Derived from the planet ruling your natal Moon sign (the basis of a Rashi horoscope): its number (1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars), dates whose digits add up to it, its weekday, colours and gem; "sparingly" colours and dates belong to its natural enemies (BPHS naisargika relationships). See decision HOR-004.',
  };
}

export function horoscopeNumerology(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const rows = d.numerology.map((n) => [String(n.year), String(n.universal), String(n.personal), tex(PLANET_ASSOC[(['Sun', 'Moon', 'Jupiter', 'Rahu', 'Mercury', 'Venus', 'Ketu', 'Saturn', 'Mars'] as const)[n.personal - 1]].weekday)]);
  return {
    tex: gridTable(cols('l.15', 'c.2', 'c.2', 'X'), ['Calendar year', 'Universal year', 'Your personal year', 'Weekday of the personal-year planet'], rows),
    evidenceIds: d.numerology.flatMap((n) => [`horo.numerology.universal.${n.year}`, `horo.numerology.personal.${n.year}`]),
    method: 'Universal year = digit sum of the calendar year. Personal year = digit sum of your birth day + birth month + the calendar year (standard numerology), reduced to 1–9.',
  };
}

export function horoscopeGochara(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const rows = SLOW_PLANETS.map((p) => {
    const t = d.transits[p][0];
    return [`\\textbf{${tex(p)}}`, tex(t.sign), tex(ordinal(t.houseFromMoon)), tex(ordinal(t.houseFromLagna)), gocharaChip(t.gochara), tex(localDate(t.endIso, tz(ctx)))];
  });
  return {
    tex: gridTable(cols('l.12', 'l.16', 'c.12', 'c.14', 'l.14', 'X'), ['Planet', 'Sign now', 'From Moon', 'From Asc', 'Gochara', 'Stays until'], rows),
    evidenceIds: SLOW_PLANETS.map((p) => `horo.transit.${p.toLowerCase()}.01`),
    method: `Position at the start of the horoscope year. ${GOCHARA_METHOD}`,
  };
}
