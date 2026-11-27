/**
 * Deterministic blocks of the Personalised (annual) Horoscope.
 */
import { ordinal } from '../../evidence/evidence-registry';
import { ReportLanguage } from '../../i18n/hindi';
import { blockLang, BlockContext, BlockOutput, BlockRenderer, timelineTex } from '../../render/blocks';
import { tex } from '../../render/latex';
import { avakahadaBlock } from '../_annual-shared/avakahada';
import { coloursLabel, deityLabel, gemLabel, L, mantraLabel, ord, pk, planetL, signL, weekdayLabel } from '../_annual-shared/annual-shared.hindi';
import { GOCHARA_METHOD, pad2, PLANET_ASSOC, SLOW_PLANETS } from '../_annual-shared/astro';
import { cols, gocharaChip, gridTable, kvTableL, localDate, longTable, transitRow } from '../_annual-shared/tables';
import { periodsBetween } from '../_annual-shared/transits';
import { HORO_AREAS, HoroAreaKey, HoroscopeYearData } from './calc/horoscope-year';
import { factorText } from './evidence';
import { factorTextHi, windowLabel } from './horoscope-annual.hindi';
import { luckyFor } from './lucky';

export const EXT_KEY = 'horoscope';

function data(ctx: BlockContext): HoroscopeYearData {
  const d = ctx.ext[EXT_KEY] as HoroscopeYearData | undefined;
  if (!d) throw new Error('BLOCK_DATA_MISSING: horoscope');
  return d;
}
const tz = (ctx: BlockContext) => ctx.snapshot.subject.timezone;
/** Table headings in the report language. */
const heads = (lang: ReportLanguage, en: string[]) => en.map((h) => L(lang, h));
const TRANSIT_HEADS = ['Planet', 'Period', 'Sign', 'From Asc', 'From Moon', 'Gochara'];

export const horoscopeSynopsis = avakahadaBlock('avakahada');

/** Windows × slow planets overview. */
export function horoscopeWindows(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const lang = blockLang(ctx);
  const mo = pk(lang, 'Mo', 'चं');
  const as = pk(lang, 'As', 'ल');
  const rows = d.windows.map((w) => [
    `\\textbf{${tex(windowLabel(lang, w))}}`,
    ...SLOW_PLANETS.map((p) => periodsBetween(d.transits[p], w.startIso, w.endIso)
      .map((t) => `${tex(signL(lang, t.sign))}~{\\color{Muted}(${mo}~${t.houseFromMoon}, ${as}~${t.houseFromLagna})}`).join('\\newline ')),
  ]);
  const tlItems = d.windows.map((w, idx) => ({
    date: `${localDate(w.startIso, tz(ctx), lang)} -- ${localDate(w.endIso, tz(ctx), lang)}`,
    title: windowLabel(lang, w),
    detail: SLOW_PLANETS.map((p) => {
      const ts = periodsBetween(d.transits[p], w.startIso, w.endIso);
      return `${planetL(lang, p)}: ${ts.map((t) => signL(lang, t.sign)).join(', ')}`;
    }).join(' · '),
    active: idx === 0,
  }));
  return {
    tex: `${timelineTex(tlItems)}\n${gridTable(cols('l.17', 'X', 'X', 'X', 'X'), [L(lang, 'Window'), ...SLOW_PLANETS.map((p) => planetL(lang, p))], rows)}`,
    evidenceIds: d.windows.flatMap((w) => [`horo.window.${w.index}.dates`, ...SLOW_PLANETS.map((p) => `horo.window.${w.index}.${p.toLowerCase()}`)]),
    method: pk(lang,
      'Signs occupied by the slow planets in each four-month window (TransitIngressSolver). Mo n = the nth house counted from your natal Moon sign; As n = counted from your natal Ascendant.',
      'चार-चार माह की हर अवधि में धीमे ग्रह जिन राशियों में रहते हैं (इंजन के गोचर गणक से)। "चं" के बाद का अंक = आपकी जन्म चंद्र राशि से गिना गया भाव; "ल" के बाद का अंक = आपके जन्म लग्न से गिना गया भाव।'),
  };
}

export function horoscopeSlowTable(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const lang = blockLang(ctx);
  const rows = SLOW_PLANETS.flatMap((p) => d.transits[p].map((t) => transitRow(t, tz(ctx), true, lang)));
  return {
    tex: longTable('p{0.1\\linewidth}p{0.29\\linewidth}p{0.15\\linewidth}p{0.09\\linewidth}p{0.09\\linewidth}p{0.13\\linewidth}', heads(lang, TRANSIT_HEADS), rows),
    evidenceIds: SLOW_PLANETS.flatMap((p) => d.transits[p].map((_, i) => `horo.transit.${p.toLowerCase()}.${pad2(i + 1)}`)),
    method: pk(lang,
      `Sign periods within the horoscope year; (R) = retrograde re-entry. ${GOCHARA_METHOD}`,
      `राशिफल वर्ष के भीतर की राशि अवधियाँ; (व) = वक्री अवस्था में पुनः प्रवेश। ${L(lang, GOCHARA_METHOD)}`),
  };
}

export function horoscopeFastTable(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const lang = blockLang(ctx);
  const planets = ['Venus', 'Mars', 'Mercury'] as const;
  const rows = planets.flatMap((p) => d.transits[p].map((t) => transitRow(t, tz(ctx), true, lang)));
  return {
    tex: longTable('p{0.1\\linewidth}p{0.29\\linewidth}p{0.15\\linewidth}p{0.09\\linewidth}p{0.09\\linewidth}p{0.13\\linewidth}', heads(lang, TRANSIT_HEADS), rows),
    evidenceIds: planets.flatMap((p) => d.transits[p].map((_, i) => `horo.transit.${p.toLowerCase()}.${pad2(i + 1)}`)),
    method: pk(lang,
      `Venus, Mars and Mercury sign periods within the horoscope year. ${GOCHARA_METHOD}`,
      `राशिफल वर्ष के भीतर शुक्र, मंगल और बुध की राशि अवधियाँ। ${L(lang, GOCHARA_METHOD)}`),
  };
}

export function horoscopeArea(key: HoroAreaKey): BlockRenderer {
  return (ctx) => {
    const d = data(ctx);
    const lang = blockLang(ctx);
    const area = HORO_AREAS.find((a) => a.key === key)!;
    const rows = d.windows.map((w, i) => {
      const list = d.areaFactors[key][i];
      return [`\\textbf{${tex(windowLabel(lang, w))}}`, list.length
        ? list.map((f) => tex(lang === 'hi' ? factorTextHi(f, tz(ctx)) : factorText(f, tz(ctx)))).join('\\newline ')
        : pk(lang,
          '{\\color{Muted}No slow-planet transit over these houses; the natal promise and the running dasha carry this window.}',
          '{\\color{Muted}इन भावों पर किसी धीमे ग्रह का गोचर नहीं है; इस अवधि में जन्म कुंडली के संकेत और चल रही दशा ही प्रमुख रहते हैं।}')];
    });
    const card = pk(lang,
      `\\begin{asCard}\\CardTitle{In short: ${tex(area.label.toLowerCase())} through the year}{\\fontsize{9}{12}\\selectfont Houses watched: ${tex(area.houses.map(ordinal).join(', '))}, counted from your Moon sign and from your Ascendant.\\par}\\end{asCard}`,
      `\\begin{asCard}\\CardTitle{संक्षेप में: पूरे वर्ष में ${tex(L(lang, area.label))}}{\\fontsize{9}{12}\\selectfont देखे गए भाव: ${tex(area.houses.map((h) => ord(lang, h)).join(', '))}; आपकी चंद्र राशि और आपके लग्न, दोनों से गिने गए।\\par}\\end{asCard}`);
    return {
      tex: `${card}\n${gridTable(cols('l.22', 'X'), heads(lang, ['Window', 'Slow-planet transits over these houses']), rows)}`,
      evidenceIds: d.windows.map((w) => `horo.area.${key}.window.${w.index}`),
      method: pk(lang,
        'Jupiter, Saturn, Rahu and Ketu transits that fall on the houses classically signifying this area (BPHS bhava significations), counted both from the Moon sign and from the Ascendant. Listed as facts, not graded.',
        'गुरु, शनि, राहु और केतु के वे गोचर जो इस क्षेत्र के शास्त्रीय कारक भावों (बृहत् पाराशर होरा शास्त्र के भाव कारकत्व) पर पड़ते हैं; चंद्र राशि और लग्न दोनों से गिने गए। ये तथ्य के रूप में दिए गए हैं, इन्हें कोई श्रेणी नहीं दी गई है।'),
    };
  };
}

export function horoscopeLucky(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const l = luckyFor(d.moonSignLord, d.lagnaLord);
  const lang = blockLang(ctx);
  // Dates of the month: English ordinals ("5th, 14th"), plain day numbers in Hindi.
  const dates = (list: number[]) => list.map((x) => pk(lang, ordinal(x), String(x))).join(', ');
  const planet = planetL(lang, l.planet);
  const secondary = planetL(lang, l.secondary);
  const assoc = PLANET_ASSOC[l.planet];
  const rows: Array<[string, string]> = [
    [L(lang, 'Ruling planet of your Moon sign'), pk(lang, `${l.planet} (Ascendant lord: ${l.secondary})`, `${planet} (लग्नेश: ${secondary})`)],
    [L(lang, 'Supportive number'), String(l.number)],
    [L(lang, 'Supportive dates of any month'), dates(l.dates)],
    [L(lang, 'Supportive weekday'), weekdayLabel(lang, l.weekday)],
    [L(lang, 'Favourable colours'), pk(lang,
      `${l.colours}; also ${l.secondaryColours} (from ${l.secondary})`,
      `${coloursLabel(lang, l.colours)}; साथ ही ${coloursLabel(lang, l.secondaryColours)} (${secondary} से)`)],
    [L(lang, 'Colours to use more sparingly'), coloursLabel(lang, l.cautionColours) || '—'],
    [L(lang, 'Dates calling for extra patience'), l.cautionDates.length ? dates(l.cautionDates) : '—'],
    [L(lang, 'Traditional gem of the ruling planet'), pk(lang, `${l.gem} (symbolic only; nothing to buy)`, `${gemLabel(lang, l.gem)} (केवल प्रतीक रूप में; कुछ भी ख़रीदने की आवश्यकता नहीं)`)],
    [L(lang, 'Traditional deity and mantra'), `${deityLabel(lang, assoc.deity)}; “${mantraLabel(lang, assoc.mantra)}”`],
  ];
  const caution = pk(lang,
    'These are traditional correspondences, offered as gentle symbols. No colour, date or gem can override your choices, and none needs to be bought.',
    'ये पारंपरिक संबंध हैं, जो कोमल प्रतीकों के रूप में दिए गए हैं। कोई भी रंग, तारीख़ या रत्न आपके अपने चुनाव से बड़ा नहीं है, और किसी को ख़रीदने की आवश्यकता नहीं है।');
  return {
    tex: `${kvTableL(lang, rows)}\n\\begin{asCaution}{\\fontsize{9.3}{13}\\selectfont ${caution}\\par}\\end{asCaution}`,
    evidenceIds: ['horo.lucky.planet', 'horo.lucky.number', 'horo.lucky.dates', 'horo.lucky.weekday', 'horo.lucky.colours', 'horo.lucky.caution', 'horo.lucky.deity'],
    method: pk(lang, 'Derived from the planet ruling your natal Moon sign (the basis of a Rashi horoscope): its number (1 Sun, 2 Moon, 3 Jupiter, 4 Rahu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars), dates whose digits add up to it, its weekday, colours and gem; "sparingly" colours and dates belong to its natural enemies (BPHS naisargika relationships). See decision HOR-004.',
      'आपकी जन्म चंद्र राशि के स्वामी ग्रह से निकाला गया है (राशिफल का यही आधार है): उसका अंक (1 सूर्य, 2 चंद्र, 3 गुरु, 4 राहु, 5 बुध, 6 शुक्र, 7 केतु, 8 शनि, 9 मंगल), वे तारीख़ें जिनके अंकों का योग वही अंक हो, उसका वार, रंग और रत्न; "कम प्रयोग" वाले रंग और तारीख़ें उसके नैसर्गिक शत्रु ग्रहों की हैं (बृहत् पाराशर होरा शास्त्र के नैसर्गिक संबंध)।'),
  };
}

export function horoscopeNumerology(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const lang = blockLang(ctx);
  const rows = d.numerology.map((n) => [String(n.year), String(n.universal), String(n.personal), tex(weekdayLabel(lang, PLANET_ASSOC[(['Sun', 'Moon', 'Jupiter', 'Rahu', 'Mercury', 'Venus', 'Ketu', 'Saturn', 'Mars'] as const)[n.personal - 1]].weekday))]);
  return {
    tex: gridTable(cols('l.15', 'c.2', 'c.2', 'X'), heads(lang, ['Calendar year', 'Universal year', 'Your personal year', 'Weekday of the personal-year planet']), rows),
    evidenceIds: d.numerology.flatMap((n) => [`horo.numerology.universal.${n.year}`, `horo.numerology.personal.${n.year}`]),
    method: pk(lang,
      'Universal year = digit sum of the calendar year. Personal year = digit sum of your birth day + birth month + the calendar year (standard numerology), reduced to 1–9.',
      'वैश्विक वर्ष अंक = ईस्वी वर्ष के अंकों का योग। व्यक्तिगत वर्ष अंक = आपके जन्म दिन + जन्म माह + ईस्वी वर्ष के अंकों का योग (प्रचलित अंक ज्योतिष), जिसे घटाकर 1–9 के बीच लाया गया है।'),
  };
}

export function horoscopeGochara(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const lang = blockLang(ctx);
  const rows = SLOW_PLANETS.map((p) => {
    const t = d.transits[p][0];
    return [`\\textbf{${tex(planetL(lang, p))}}`, tex(signL(lang, t.sign)), tex(ord(lang, t.houseFromMoon)), tex(ord(lang, t.houseFromLagna)), gocharaChip(t.gochara, lang), tex(localDate(t.endIso, tz(ctx), lang))];
  });
  return {
    tex: gridTable(cols('l.12', 'l.16', 'c.12', 'c.14', 'l.14', 'X'), heads(lang, ['Planet', 'Sign now', 'From Moon', 'From Asc', 'Gochara', 'Stays until']), rows),
    evidenceIds: SLOW_PLANETS.map((p) => `horo.transit.${p.toLowerCase()}.01`),
    method: pk(lang, `Position at the start of the horoscope year. ${GOCHARA_METHOD}`, `राशिफल वर्ष के आरंभ की स्थिति। ${L(lang, GOCHARA_METHOD)}`),
  };
}
