/**
 * Deterministic blocks of the Varshphal report. Every block renders from the
 * `extend` output (VarshaYearData) and cites the evidence IDs it shows.
 */
import { ordinal, PLANETS } from '../../evidence/evidence-registry';
import { label, nakshatraLabel, planetAbbr, ReportLanguage } from '../../i18n/hindi';
import { blockLang, BlockContext, BlockOutput, BlockRenderer, northChart } from '../../render/blocks';
import { tex } from '../../render/latex';
import { avakahadaBlock } from '../_annual-shared/avakahada';
import { L, masaLabel, ord, ordOblique, pk, planetL, signL, weekdayLabel } from '../_annual-shared/annual-shared.hindi';
import { GOCHARA_METHOD, pad2, PLANET_ASSOC, SYMBOL, TRANSIT_PLANETS } from '../_annual-shared/astro';
import { cols, gocharaChip, gridTable, kvTableL, localDate, localDateTime, longTable, transitRow } from '../_annual-shared/tables';
import { overlapFraction } from '../_annual-shared/transits';
import { LIFE_AREAS, pn, VarshaYearData } from './calc/varsha-year';
import { SAHAM_MEANING, SHOWN_SAHAMS, signEn } from './evidence';
import { officeSourceHi, officeTitleHi, sahamFormulaHi, sahamMeaningHi, sahamNameHi, tajikYogaLabel } from './varshphal.hindi';

export const EXT_KEY = 'varshphal';
const ABBR: Record<string, string> = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };

function data(ctx: BlockContext): VarshaYearData {
  const d = ctx.ext[EXT_KEY] as VarshaYearData | undefined;
  if (!d) throw new Error('BLOCK_DATA_MISSING: varshphal');
  return d;
}
const tz = (ctx: BlockContext) => ctx.snapshot.subject.timezone;
const small = (s: string) => `{\\fontsize{10}{14.5}\\selectfont ${s}\\par}`;
/** Table headings in the report language. */
const heads = (lang: ReportLanguage, en: string[]) => en.map((h) => L(lang, h));
/** Sign name (by number 1–12) in the report language. */
const signOf = (lang: ReportLanguage, i: number) => signL(lang, signEn(i));

export const varshphalSynopsis = avakahadaBlock('avakahada');

export function varshphalReturn(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const v = d.varsha;
  const sr = v.solarReturn;
  const lang = blockLang(ctx);
  const lagna = signOf(lang, v.varshaLagna.rashiIndex);
  const houses = Array.from({ length: 12 }, (_, i) => ({ sign: ((v.varshaLagna.rashiIndex - 1 + i) % 12) + 1, lines: [] as string[] }));
  for (const name of PLANETS) {
    const p = v.planets[SYMBOL[name]];
    houses[p.house - 1].lines.push(`${lang === 'hi' ? planetAbbr(lang, name) : ABBR[name]} ${Math.floor(p.degreeInRashi)}°${p.isRetrograde && name !== 'Rahu' && name !== 'Ketu' ? ` ${label(lang, 'R')}` : ''}`);
  }
  houses[0].lines.unshift(label(lang, 'Asc'));
  houses[v.muntha.houseInVarshaChart - 1].lines.push(L(lang, '(Muntha)'));
  const start = localDate(d.yearStartIso, tz(ctx), lang);
  const end = localDate(d.yearEndIso, tz(ctx), lang);
  const days = (v.actualCycleDays ?? 365.25).toFixed(2);
  const sunSign = signOf(lang, Math.floor(sr.natalSunLongitude / 30) + 1);
  const rows: Array<[string, string]> = [
    [L(lang, 'Solar return (Varsha Pravesha)'), `${localDateTime(sr.solarReturnUtcIso, tz(ctx), lang)} ${pk(lang, '(local time)', '(स्थानीय समय)')}`],
    [L(lang, 'Year covered'), pk(lang, `${start} to ${end} (${days} days)`, `${start} से ${end} तक (${days} दिन)`)],
    [L(lang, 'Completed years'), pk(lang, `${sr.age} (year ${sr.age + 1} of life)`, `${sr.age} (जीवन का ${ord(lang, sr.age + 1)} वर्ष)`)],
    [L(lang, 'Place used for the annual chart'), ctx.snapshot.subject.placeName],
    [L(lang, 'Natal Sun returns to'), `${sr.natalSunDegree.toFixed(2)}° ${sunSign} ${pk(lang, '(sidereal)', '(निरयण)')}`],
    [L(lang, 'Annual Ascendant (Varsha Lagna)'), `${lagna} ${v.varshaLagna.degreeInRashi.toFixed(1)}°, ${pk(lang, `ruled by ${pn(v.varshaLagna.lord)}`, `स्वामी ${planetL(lang, pn(v.varshaLagna.lord))}`)}`],
    [L(lang, 'Type of return'), L(lang, v.panchadhikari.isDayReturn ? 'Day return (Sun above the horizon)' : 'Night return (Sun below the horizon)')],
  ];
  return {
    tex: `${kvTableL(lang, rows)}\n\\begin{center}${northChart(houses)}\\end{center}`,
    evidenceIds: ['varsha.return.date', 'varsha.year.end', 'varsha.age', 'varsha.lagna.sign', 'varsha.lagna.lord', 'varsha.day-night', 'varsha.muntha.house',
      ...PLANETS.map((p) => `varsha.planet.${p.toLowerCase()}.house`)],
    method: pk(lang,
      'Tajik solar return: the exact instant the transiting sidereal Sun returns to its natal longitude, cast for the birthplace (engine SolarReturnSolver and VarshaphalaCalculator). North Indian style; the top diamond is the year\'s 1st house; numbers are signs. (Muntha) marks the Muntha house.',
      'ताजिक वर्ष प्रवेश: वह सटीक क्षण जब गोचर का निरयण सूर्य अपने जन्मकालीन अंश पर लौटता है; कुंडली जन्म स्थान के लिए बनाई गई है (गणना इंजन के वर्ष प्रवेश और वर्षफल गणकों से)। उत्तर भारतीय शैली; ऊपर का बीच वाला खाना वर्ष का पहला भाव है; अंक राशियाँ हैं। (मुंथा) मुंथा वाले भाव को दिखाता है।'),
  };
}

export function varshphalPositions(ctx: BlockContext): BlockOutput {
  const v = data(ctx).varsha;
  const lang = blockLang(ctx);
  const rows = PLANETS.map((name) => {
    const p = v.planets[SYMBOL[name]];
    const h = v.harshaBala[SYMBOL[name]];
    const node = name === 'Rahu' || name === 'Ketu';
    return [
      `\\textbf{${tex(planetL(lang, name))}}`, tex(signOf(lang, p.rashiIndex)), `${p.degreeInRashi.toFixed(2)}°`, tex(ord(lang, p.house)),
      tex(p.nakshatraName ? nakshatraLabel(lang, p.nakshatraName) : ''), node ? '--' : L(lang, p.isRetrograde ? 'Retrograde' : 'Direct'), node ? '--' : L(lang, p.isCombust ? 'Yes' : 'No'),
      node || !h ? '--' : `${h.totalScore} / 20`,
    ];
  });
  return {
    tex: gridTable(cols('l.09', 'l.11', 'r.08', 'c.06', 'X', 'l.1', 'c.08', 'c.09'), heads(lang, ['Planet', 'Sign', 'Degree', 'House', 'Nakshatra', 'Motion', 'Combust', 'Harsha Bala']), rows),
    evidenceIds: PLANETS.flatMap((p) => [`varsha.planet.${p.toLowerCase()}.sign`, `varsha.planet.${p.toLowerCase()}.house`]),
    method: pk(lang,
      'Positions at the solar-return instant (sidereal, Lahiri; whole-sign houses from the annual Ascendant). Harsha Bala is the Tajik four-fold "joy" strength (place, own/exaltation sign, gender of sign, day/night), 5 points each, out of 20.',
      'वर्ष प्रवेश के क्षण की स्थितियाँ (निरयण, लाहिरी अयनांश; वर्ष लग्न से संपूर्ण-राशि भाव)। हर्ष बल ताजिक का चार प्रकार का "हर्ष" बल है (स्थान, स्वराशि या उच्च राशि, राशि का लिंग, दिन या रात्रि); प्रत्येक के 5 अंक, कुल 20 में से।'),
  };
}

export function varshphalPanchadhikari(ctx: BlockContext): BlockOutput {
  const v = data(ctx).varsha;
  const lang = blockLang(ctx);
  const day = v.panchadhikari.isDayReturn;
  const lord = pn(v.varshesha.selectedVarshesha);
  const rows = v.panchadhikari.candidates.filter((c) => !c.isIndeterminate && c.planet).map((c) => {
    const p = pn(c.planet);
    return [
      tex(lang === 'hi' ? officeTitleHi(c.role, day) : c.roleTitle), `${p === lord ? '\\textbf{' : ''}${tex(planetL(lang, p))}${p === lord ? '}' : ''}`,
      tex(lang === 'hi' ? officeSourceHi(c.role, day, c.sourceDescription) : c.sourceDescription),
      tex(ord(lang, c.houseInVarshaChart)), c.aspectsVarshaLagna ? `${L(lang, 'Yes')} (${tex(ord(lang, c.aspectToVarshaLagna ?? 0))})` : L(lang, 'No'), `${c.harshaBalaScore} / 20`,
    ];
  });
  const lordHouse = v.planets[SYMBOL[lord]].house;
  const lordLine = pk(lang,
    `\\textbf{${tex(lord)}}, which falls in the year's ${tex(ordinal(lordHouse))} house.`,
    `\\textbf{${tex(planetL(lang, lord))}}, जो वर्ष के ${tex(ordOblique(lang, lordHouse))} भाव में स्थित है।`);
  const box = `\\begin{asHighlight}\\CardTitle{${L(lang, 'Year Lord (Varshesha)')}}{\\fontsize{10}{14}\\selectfont ${lordLine}\\par}\\end{asHighlight}`;
  return {
    tex: `${gridTable(cols('l.15', 'l.09', 'X', 'c.06', 'c.1', 'c.07'), heads(lang, ['Office', 'Planet', 'Why it holds the office', 'House', 'Aspects Asc', 'Harsha']), rows)}\n${box}`,
    evidenceIds: ['varsha.lord', 'varsha.lord.house', ...v.panchadhikari.candidates.filter((c) => !c.isIndeterminate && c.planet).map((c) => `varsha.office.${({ VARSHA_LAGNESHA: 'varsha-lagnesha', JANMESHA: 'janmesha', MUNTHESHA: 'munthesha', TRIRASHISHA: 'trirashisha', DINA_RATRI_PATI: 'dina-ratri-pati' } as Record<string, string>)[c.role]}`)],
    method: pk(lang, 'Tajika Neelakanthi: the five office-bearers are the lords of the natal Ascendant, the annual Ascendant, the Muntha sign, the Tri-Rashi lord (day/night table) and the Sun-sign lord (day return) or Moon-sign lord (night return). The Year Lord is the one with a Tajik aspect (1, 3, 4, 5, 7, 9, 10, 11 signs) on the annual Ascendant and the greatest strength; the engine measures strength by Harsha Bala, then number of offices held, then office order.',
      'ताजिक नीलकंठी: पाँच पदाधिकारी हैं जन्म लग्न, वर्ष लग्न और मुंथा राशि के स्वामी, त्रिराशि स्वामी (दिन या रात्रि की तालिका) और सूर्य राशि का स्वामी (दिन का प्रवेश) या चंद्र राशि का स्वामी (रात्रि का प्रवेश)। वर्षेश वह है जिसकी वर्ष लग्न पर ताजिक दृष्टि (1, 3, 4, 5, 7, 9, 10, 11 राशियाँ) हो और जिसका बल सबसे अधिक हो; इंजन बल को पहले हर्ष बल से, फिर धारण किए गए पदों की संख्या से, फिर पद के क्रम से मापता है।'),
  };
}

export function varshphalMuntha(ctx: BlockContext): BlockOutput {
  const v = data(ctx).varsha;
  const m = v.muntha;
  const lang = blockLang(ctx);
  const ml = pn(m.lord);
  const mlp = v.planets[SYMBOL[ml]];
  const rows: Array<[string, string]> = [
    [L(lang, 'Muntha sign'), `${signOf(lang, m.rashiIndex)} (${m.degreeInRashi.toFixed(1)}°)`],
    [L(lang, 'House in the annual chart'), ord(lang, m.houseInVarshaChart)],
    [L(lang, 'Sign counted from the natal Ascendant'), ord(lang, m.houseInNatalChart)],
    [L(lang, 'Muntha lord'), pk(lang,
      `${ml}, in the year's ${ordinal(mlp.house)} house (${signEn(mlp.rashiIndex)})`,
      `${planetL(lang, ml)}, वर्ष के ${ordOblique(lang, mlp.house)} भाव में (${signOf(lang, mlp.rashiIndex)})`)],
    [L(lang, 'How it is found'), pk(lang,
      `Natal Ascendant sign advanced by one sign for each of the ${m.progressionYears} completed years`,
      `जन्म लग्न की राशि को पूर्ण हुए ${m.progressionYears} वर्षों में से हर वर्ष के लिए एक राशि आगे बढ़ाकर`)],
  ];
  return {
    tex: kvTableL(lang, rows),
    evidenceIds: ['varsha.muntha.sign', 'varsha.muntha.house', 'varsha.muntha.natal-house', 'varsha.muntha.lord'],
    method: pk(lang,
      'Muntha (Tajika Neelakanthi): starts at the natal Ascendant and moves one sign per completed year, keeping the Ascendant\'s degree.',
      'मुंथा (ताजिक नीलकंठी): जन्म लग्न से आरंभ होकर हर पूर्ण वर्ष पर एक राशि आगे बढ़ती है और लग्न का अंश बनाए रखती है।'),
  };
}

export function varshphalTajik(ctx: BlockContext): BlockOutput {
  const v = data(ctx).varsha;
  const lang = blockLang(ctx);
  if (!v.tajikaYogas.length) {
    return {
      tex: small(pk(lang,
        '{\\itshape No Tajik yoga (Ithasala, Isarpha, Nakta, Yamaya or Kamboola) is formed between the seven classical planets in this annual chart.}',
        '{\\itshape इस वर्ष कुंडली में सात शास्त्रीय ग्रहों के बीच कोई ताजिक योग (इत्थशाल, ईसराफ, नक्त, यमया या कंबूल) नहीं बन रहा है।}')),
      evidenceIds: ['varsha.tajik.count'],
      method: pk(lang,
        'Tajik aspects with the deeptamsha (orb) of each planet, as computed by the engine\'s TajikaYogasCalculator.',
        'हर ग्रह के दीप्तांश के साथ ताजिक दृष्टियाँ, जैसी इंजन के ताजिक योग गणक ने निकाली हैं।'),
    };
  }
  const via = (p: string) => pk(lang, ` (via ${pn(p)})`, ` (${planetL(lang, pn(p))} के माध्यम से)`);
  const rows = v.tajikaYogas.map((y) => [
    `\\textbf{${tex(tajikYogaLabel(lang, y.type))}}`,
    tex(`${planetL(lang, pn(y.planet1))} -- ${planetL(lang, pn(y.planet2))}${y.intermediaryPlanet ? via(y.intermediaryPlanet) : ''}`),
    `${y.actualDistanceDegrees.toFixed(2)}°`, `${y.orbDegrees.toFixed(1)}°`, L(lang, y.isApplying ? 'Applying' : 'Separating'),
  ]);
  return {
    tex: gridTable(cols('l.12', 'X', 'r.1', 'r.07', 'l.11'), heads(lang, ['Yoga', 'Planets', 'Distance', 'Orb', 'Motion']), rows),
    evidenceIds: ['varsha.tajik.count', ...v.tajikaYogas.map((_, i) => `varsha.tajik.${pad2(i + 1)}`)],
    method: pk(lang, 'Tajik yogas between the seven classical planets: Ithasala = faster planet applying to a slower one within their mean orb (deeptamsha: Sun 15°, Moon 12°, Mars 8°, Mercury 7°, Jupiter 9°, Venus 7°, Saturn 9°); Isarpha = separating; Nakta / Yamaya = light transferred or collected by a third planet; Kamboola = the Moon joining an Ithasala. Distance is the difference of degrees within the signs.',
      'सात शास्त्रीय ग्रहों के बीच ताजिक योग: इत्थशाल = तेज़ ग्रह का धीमे ग्रह की ओर, दोनों के औसत दीप्तांश के भीतर, बढ़ना (दीप्तांश: सूर्य 15°, चंद्र 12°, मंगल 8°, बुध 7°, गुरु 9°, शुक्र 7°, शनि 9°); ईसराफ = दूर जाना; नक्त / यमया = किसी तीसरे ग्रह द्वारा प्रकाश का स्थानांतरण या संग्रह; कंबूल = चंद्र का किसी इत्थशाल से जुड़ना। दूरी राशियों के भीतर के अंशों का अंतर है।'),
  };
}

export function varshphalSahams(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const list = SHOWN_SAHAMS(d);
  const lang = blockLang(ctx);
  const hi = lang === 'hi';
  const rows = list.map((s) => [
    `\\textbf{${tex(hi ? sahamNameHi(s.name) : s.name)}}`, tex(hi ? sahamMeaningHi(s.name) : SAHAM_MEANING[s.name] ?? ''), tex(hi ? sahamFormulaHi(s.formula) : s.formula),
    tex(`${signL(lang, s.rashiName)} ${s.degreeInRashi.toFixed(1)}°`), tex(ord(lang, s.houseInVarshaChart)),
  ]);
  const day = d.varsha.panchadhikari.isDayReturn;
  return {
    tex: gridTable(cols('l.19', 'X', 'l.2', 'l.15', 'c.06'), heads(lang, ['Saham', 'Signifies', 'Formula', 'Position', 'House']), rows),
    evidenceIds: list.map((s) => `varsha.saham.${s.name.replace(/ Saham$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
    method: pk(lang,
      `Tajik Sahams (sensitive points) = Ascendant + A − B, with A and B reversed for a ${day ? 'night' : 'day'} return (this is a ${day ? 'day' : 'night'} return). Computed by the engine\'s SahamsCalculator. Mitra Saham is omitted because the engine\'s formula for it currently duplicates Yashas Saham.`,
      `ताजिक सहम (संवेदनशील बिंदु) = लग्न + क − ख; ${day ? 'रात्रि' : 'दिन'} के प्रवेश में क और ख आपस में बदल जाते हैं (यह ${day ? 'दिन' : 'रात्रि'} का प्रवेश है)। गणना इंजन के सहम गणक से की गई है। मित्र सहम छोड़ा गया है क्योंकि इंजन में उसका सूत्र अभी यश सहम के समान है।`),
  };
}

export function varshphalMudda(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const lang = blockLang(ctx);
  const rows = d.mudda.map((p) => [
    `${p.order}`, `\\textbf{${tex(planetL(lang, p.lord))}}`, tex(localDate(p.startIso, tz(ctx), lang)), tex(localDate(p.endIso, tz(ctx), lang)), `${p.days.toFixed(1)}`,
    L(lang, p.part === 'balance' ? 'Balance at the start of the year' : p.part === 'closing' ? 'Remaining part, closes the year' : 'Full period'),
  ]);
  return {
    tex: gridTable(cols('c.04', 'l.1', 'l.13', 'l.13', 'r.06', 'X'), ['\\#', ...heads(lang, ['Lord', 'From', 'To', 'Days', 'Note'])], rows),
    evidenceIds: d.mudda.map((_, i) => `varsha.mudda.${pad2(i + 1)}`),
    method: pk(lang, 'Mudda dasha (Tajika Neelakanthi): first lord = remainder of (natal nakshatra number + completed years − 2) ÷ 9, counted Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury, Ketu, Venus. Each lord rules (Vimshottari years ÷ 120) of the actual year; the first period runs for the natal Moon\'s remaining share of its nakshatra and its elapsed share closes the year.',
      'मुद्दा दशा (ताजिक नीलकंठी): पहला स्वामी = (जन्म नक्षत्र की संख्या + पूर्ण हुए वर्ष − 2) ÷ 9 का शेष, जिसे सूर्य, चंद्र, मंगल, राहु, गुरु, शनि, बुध, केतु, शुक्र के क्रम में गिना जाता है। हर स्वामी वास्तविक वर्ष के (विंशोत्तरी वर्ष ÷ 120) भाग पर शासन करता है; पहली अवधि उतनी चलती है जितना भाग जन्म के चंद्र को अपने नक्षत्र में तय करना शेष था, और उसका बीता हुआ भाग वर्ष को पूरा करता है।'),
  };
}

export function varshphalTransitSummary(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const lang = blockLang(ctx);
  const rows = TRANSIT_PLANETS.map((planet) => {
    const ps = d.transits[planet];
    const first = ps[0];
    const sup = ps.filter((p) => p.gochara === 'favourable').reduce((a, p) => a + overlapFraction(p, d.yearStartIso, d.yearEndIso), 0);
    return [`\\textbf{${tex(planetL(lang, planet))}}`, tex(signL(lang, first.sign)), tex(ord(lang, first.houseFromLagna)), tex(ord(lang, first.houseFromMoon)), gocharaChip(first.gochara, lang), `${Math.round(sup * 100)}\\%`, `${ps.length}`];
  });
  return {
    tex: gridTable(cols('l.1', 'l.13', 'c.08', 'c.08', 'l.12', 'c.14', 'c.09'), heads(lang, ['Planet', 'Sign at year start', 'From Asc', 'From Moon', 'At year start', 'Supportive share of year', 'Sign periods']), rows),
    evidenceIds: TRANSIT_PLANETS.map((p) => `varsha.transit.${p.toLowerCase()}.01`),
    method: pk(lang,
      `${GOCHARA_METHOD} "Supportive share" is the fraction of the year's days the planet spends in supportive houses from the Moon — a count, not a grade.`,
      `${L(lang, GOCHARA_METHOD)} "सहायक भाग" वर्ष के उन दिनों का अनुपात है जो ग्रह चंद्र से सहायक भावों में बिताता है; यह एक गिनती है, कोई श्रेणी नहीं।`),
  };
}

export function varshphalTransitTable(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const lang = blockLang(ctx);
  const rows = TRANSIT_PLANETS.flatMap((planet) => d.transits[planet].map((p) => transitRow(p, tz(ctx), true, lang)));
  return {
    tex: longTable('p{0.1\\linewidth}p{0.29\\linewidth}p{0.15\\linewidth}p{0.09\\linewidth}p{0.09\\linewidth}p{0.13\\linewidth}', heads(lang, ['Planet', 'Period', 'Sign', 'From Asc', 'From Moon', 'Gochara']), rows),
    evidenceIds: TRANSIT_PLANETS.flatMap((planet) => d.transits[planet].map((_, i) => `varsha.transit.${planet.toLowerCase()}.${pad2(i + 1)}`)),
    method: pk(lang,
      `Sign ingresses solved by the engine's TransitIngressSolver for the whole Varsha year; (R) = re-entry while retrograde (Rahu and Ketu always move backwards). ${GOCHARA_METHOD}`,
      `पूरे वर्ष के राशि प्रवेश इंजन के गोचर गणक से निकाले गए हैं; (व) = वक्री अवस्था में पुनः प्रवेश (राहु और केतु सदा उलटी दिशा में चलते हैं)। ${L(lang, GOCHARA_METHOD)}`),
  };
}

export function varshphalMonth(index: number): BlockRenderer {
  return (ctx) => {
    const d = data(ctx);
    const lang = blockLang(ctx);
    const date = (iso: string) => tex(localDate(iso, tz(ctx), lang));
    const mf = d.months[index - 1];
    const n = pad2(index);
    const rows = TRANSIT_PLANETS.map((p) => {
      const t = mf.mid[p];
      return [`\\textbf{${tex(planetL(lang, p))}}`, `${tex(signL(lang, t.sign))}${t.retrograde ? L(lang, ' (R)') : ''}`, tex(ord(lang, t.houseFromLagna)), tex(ord(lang, t.houseFromMoon)), gocharaChip(t.gochara, lang)];
    });
    const muddaText = mf.mudda.map((p) => `\\textbf{${tex(planetL(lang, p.lord))}} (${date(p.startIso)} -- ${date(p.endIso)})`).join(pk(lang, ', then ', ', फिर '));
    const ingress = mf.ingresses.length
      ? mf.ingresses.map((t) => pk(lang,
        `${date(t.startIso)}: ${tex(t.planet)} enters ${tex(t.sign)}${t.retrograde ? ' (R)' : ''}`,
        `${date(t.startIso)}: ${tex(planetL(lang, t.planet))} का ${tex(signL(lang, t.sign))} में प्रवेश${t.retrograde ? L(lang, ' (R)') : ''}`)).join('; ')
      : L(lang, 'No planet changes sign this month.');
    const areaRows = LIFE_AREAS.map((a) => {
      const list = mf.areas[a.key];
      return [`\\textbf{${tex(L(lang, a.label))}}`, tex(a.houses.map((h) => ord(lang, h)).join(', ')), list.length ? tex(list.map((x) => `${planetL(lang, x.planet)} (${ord(lang, x.house)})`).join(', ')) : `{\\color{Muted}${L(lang, 'none')}}`];
    });
    const weekday = tex(weekdayLabel(lang, PLANET_ASSOC[mf.focus].weekday));
    const header = pk(lang,
      `\\begin{asHighlight}\\CardTitle{Month ${index}: ${date(mf.month.startIso)} to ${date(mf.month.endIso)}}{\\fontsize{9.5}{13.5}\\selectfont Mudda dasha: ${muddaText}.\\\\ Sign changes: ${ingress}\\\\ Transits supportive from your Moon at mid-month: \\textbf{${mf.supportiveCount} of 8}. Practice planet for the month: \\textbf{${tex(mf.focus)}} (${weekday}).\\par}\\end{asHighlight}`,
      `\\begin{asHighlight}\\CardTitle{माह ${index}: ${date(mf.month.startIso)} से ${date(mf.month.endIso)} तक}{\\fontsize{9.5}{13.5}\\selectfont मुद्दा दशा: ${muddaText}।\\\\ राशि परिवर्तन: ${ingress}\\\\ माह के मध्य में आपके चंद्र से सहायक गोचर: \\textbf{8 में से ${mf.supportiveCount}}। इस माह का साधना ग्रह: \\textbf{${tex(planetL(lang, mf.focus))}} (${weekday})।\\par}\\end{asHighlight}`);
    return {
      tex: [
        header,
        '\\begin{minipage}[t]{0.49\\linewidth}\\vspace{0pt}',
        gridTable(cols('l.15', 'l.21', 'c.08', 'c.09', 'X'), [L(lang, 'Planet'), L(lang, 'Sign'), pk(lang, 'Asc', 'लग्न'), pk(lang, 'Moon', 'चंद्र'), L(lang, 'Gochara')], rows, '\\linewidth', false),
        '\\end{minipage}\\hfill\\begin{minipage}[t]{0.49\\linewidth}\\vspace{0pt}',
        gridTable(cols('l.3', 'l.22', 'X'), heads(lang, ['Life area', 'Houses', 'Planets there']), areaRows, '\\linewidth', false),
        '\\end{minipage}\\par\\vspace{2mm}',
      ].join('\n'),
      evidenceIds: [`varsha.month.${n}.dates`, `varsha.month.${n}.mudda`, `varsha.month.${n}.ingresses`, `varsha.month.${n}.supportive-count`, `varsha.month.${n}.focus`,
        ...TRANSIT_PLANETS.map((p) => `varsha.month.${n}.transit.${p.toLowerCase()}`), ...LIFE_AREAS.map((a) => `varsha.month.${n}.area.${a.key}`)],
      method: pk(lang, `Month = Tajik Masa Pravesha (the Sun advancing a further 30° from its natal position). Positions at mid-month; houses counted from your natal Ascendant (Asc) and Moon. Life-area houses follow the classical bhava significations. "${mf.supportiveCount} of 8" is a plain count of planets in classically supportive houses from the Moon, not a rating. The practice planet is the Mudda lord running at mid-month.`,
        `माह = ताजिक मास प्रवेश (सूर्य का अपनी जन्मकालीन स्थिति से हर बार 30° और आगे बढ़ना)। स्थितियाँ माह के मध्य की हैं; भाव आपके जन्म लग्न और चंद्र से गिने गए हैं। जीवन क्षेत्रों के भाव शास्त्रीय भाव कारकत्वों के अनुसार हैं। "8 में से ${mf.supportiveCount}" चंद्र से शास्त्रीय रूप से सहायक भावों में स्थित ग्रहों की सीधी गिनती है, कोई मूल्यांकन नहीं। साधना ग्रह वह मुद्दा दशा स्वामी है जो माह के मध्य में चल रहा है।`),
    };
  };
}

export function varshphalObservances(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const z = tz(ctx);
  const lang = blockLang(ctx);
  const timed: Array<{ t: number; row: string[] }> = [];
  for (const e of d.lunar.filter((x) => x.kind === 'purnima')) {
    const note = e.masa === 'Chaitra' ? 'Chaitra Purnima, observed as Hanuman Jayanti in North India' : e.masa === 'Vaisakha' ? 'Vaishakha Purnima (Buddha Purnima)' : e.masa === 'Ashadha' ? 'Ashadha Purnima (Guru Purnima)' : e.masa === 'Kartika' ? 'Kartika Purnima' : '';
    timed.push({ t: Date.parse(e.iso), row: [tex(localDateTime(e.iso, z, lang)), `${tex(masaLabel(lang, e.masa))} ${pk(lang, 'Purnima', 'पूर्णिमा')}`, tex(note ? L(lang, note) : '')] });
  }
  const starts = d.lunar.filter((x) => x.kind === 'shukla-tritiya-start' && x.masa === 'Vaisakha');
  for (const s of starts) {
    const end = d.lunar.find((x) => x.kind === 'shukla-tritiya-end' && Date.parse(x.iso) > Date.parse(s.iso));
    timed.push({ t: Date.parse(s.iso), row: [tex(localDateTime(s.iso, z, lang)), L(lang, 'Vaishakha Shukla Tritiya'), tex(pk(lang,
      `Akshaya Tritiya tithi, until ${end ? localDateTime(end.iso, z) : 'the next day'}`,
      `अक्षय तृतीया की तिथि, ${end ? localDateTime(end.iso, z, lang) : 'अगले दिन'} तक`))] });
  }
  const rows = timed.sort((a, b) => a.t - b.t).map((x) => x.row);
  return {
    tex: gridTable(cols('l.27', 'l.27', 'X'), heads(lang, ['Begins (local time)', 'Lunar day', 'Observance']), rows),
    evidenceIds: ['varsha.observances.purnima'],
    method: pk(lang, 'Full moons are the instants the Moon is 180° from the Sun; Shukla Tritiya spans 24°–36°. The lunar month (amanta) is named from the Sun\'s sidereal sign at the preceding new moon. Festival calendars fix the civil day by the tithi at local sunrise, so a printed almanac may list the observance one day later.',
      'पूर्णिमा वह क्षण है जब चंद्र सूर्य से 180° पर होता है; शुक्ल तृतीया 24°–36° तक रहती है। चांद्र मास (अमांत) का नाम पिछली अमावस्या पर सूर्य की निरयण राशि से रखा जाता है। पर्व-पंचांग स्थानीय सूर्योदय की तिथि से दिन तय करते हैं, इसलिए छपे पंचांग में यह पर्व एक दिन बाद दिया हो सकता है।'),
  };
}

export function varshphalRemedyNote(ctx?: BlockContext): BlockOutput {
  const lang = ctx ? blockLang(ctx) : 'en';
  return {
    tex: pk(lang,
      '\\begin{asCaution}\\CardTitle{A note on practices}{\\fontsize{9.5}{13.5}\\selectfont The practices in this report are invitations, not obligations. They cost nothing, require no purchase and work through attention, discipline and kindness. Choose two or three that feel natural, keep them simple, and never let a practice replace medical, legal or financial advice from a qualified professional.\\par}\\end{asCaution}',
      '\\begin{asCaution}\\CardTitle{साधनाओं के बारे में एक बात}{\\fontsize{9.5}{13.5}\\selectfont इस वर्षफल में दी गई साधनाएँ निमंत्रण हैं, बाध्यता नहीं। इनमें कोई ख़र्च नहीं है, कुछ ख़रीदना नहीं पड़ता, और ये ध्यान, अनुशासन और दयालुता के सहारे काम करती हैं। जो दो या तीन आपको सहज लगें उन्हें चुनें, उन्हें सरल रखें, और किसी भी साधना को योग्य चिकित्सक, वकील या वित्तीय सलाहकार की सलाह का स्थान कभी न लेने दें।\\par}\\end{asCaution}'),
    evidenceIds: [],
  };
}
