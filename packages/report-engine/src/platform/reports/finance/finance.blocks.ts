/**
 * Finance Report — deterministic blocks (provenance `deterministic`).
 */
import { blockLang, kvTable, BlockContext, BlockOutput, BlockRenderer } from '../../render/blocks';
import { ordinal, planetName, PLANETS } from '../../evidence/evidence-registry';
import { pick } from '../../i18n/hindi';
import { tex } from '../../render/latex';
import { classifyFunctionalNature, functionalMethod, functionalReason, natureLabel } from '../_finance-couple-shared/functional-nature';
import { dayMonthText, GOCHARA_FAVOURABLE_FROM_MOON, monthName, monthShort, transitEvidenceId } from '../_finance-couple-shared/gochara';
import {
  abbrOf,
  avakhadaFor,
  chartEvidence,
  chartFor,
  mahadashaTable,
  panchangAtBirth,
  planetTable,
  planetTableMethod,
  savChart,
  sideBySide,
  tableTex,
  titleCase,
} from '../_finance-couple-shared/natal-tables';
import { dateText, Lang, namaksharaText, nakshatraText, ord, ordOblique, planetText, signText, term } from '../_finance-couple-shared/shared.hindi';
import {
  dashaSpans,
  dhanaYogas,
  HOUSE_THEME,
  horaSplit,
  outlookWindow,
  planetWealthLink,
  savOfHouse,
  TransitRow,
  TRIK_HOUSES,
  WEALTH_HOUSES,
  yearOutlook,
} from './finance.calc';
import { FINANCE_HI, linkText, yearMethodHi, yogaConditionText, yogaNameText } from './finance.hindi';

const two = (n: number) => String(n).padStart(2, '0');
const P = (sym: string) => planetName(sym);

/** `kvTable` with its two headings in the report language (the shared helper prints English headings). */
function factorTable(lang: Lang, rows: Array<[string, string]>): string {
  if (lang === 'en') return kvTable(rows);
  return [
    '\\begin{center}\\begin{tabularx}{0.86\\linewidth}{>{\\raggedright\\arraybackslash}p{0.38\\linewidth}X}',
    `\\TableHead\\THd{${term(lang, 'Factor')}} & \\THd{${term(lang, 'Your chart')}}\\\\`,
    ...rows.map(([k, v], i) => `${i % 2 ? '\\rowcolor{Surface}' : ''}\\TCell{\\textbf{${tex(k)}}} & \\TCell{${tex(v)}}\\\\`),
    '\\bottomrule\\end{tabularx}\\end{center}',
  ].join('\n');
}

export const financeSummary: BlockRenderer = (ctx) => {
  const lang = blockLang(ctx);
  const hi = lang === 'hi';
  const s = ctx.snapshot;
  const asc = s.natal.ascendant;
  const moon = s.natal.planets.find((p) => P(p.name) === 'Moon')!;
  const av = avakhadaFor(s);
  const pc = panchangAtBirth(s);
  const act = s.vimshottari.activeDasha;
  const yoni = `${term(lang, av.yoni)} (${term(lang, av.yoniGender.toLowerCase())})`;
  const syllable = namaksharaText(lang, av.namakshara, av.nakshatra, av.pada);
  const mdEnd = act ? dateText(lang, act.mahadasha.endDateIso) : '';
  const adEnd = act?.antardasha ? dateText(lang, act.antardasha.endDateIso) : '';
  const values: string[] = hi
    ? [
      `${signText(lang, asc.sign)} ${Math.floor(asc.degree)}°, ${nakshatraText(lang, asc.nakshatra)} चरण ${asc.pada}; स्वामी ${planetText(lang, asc.lord)}`,
      `${signText(lang, moon.sign)}, ${nakshatraText(lang, moon.nakshatra)} चरण ${moon.pada} (नक्षत्र स्वामी ${planetText(lang, moon.nakshatraLord)})`,
      `${term(lang, pc.tithi.name)}, ${term(lang, titleCase(pc.tithi.paksha))} पक्ष`,
      `${term(lang, pc.yoga.name)} योग, ${term(lang, pc.karana.name)} करण`,
      `${term(lang, av.varna)}, ${term(lang, av.vashya)}`,
      `${yoni}, ${term(lang, av.gana)}, ${term(lang, av.nadi)}`,
      `${term(lang, av.tatwa)}, ${term(lang, av.paya)}, ${syllable}`,
      `${planetText(lang, s.vimshottari.birthLord)} महादशा, ${s.vimshottari.balanceAtBirthYears.toFixed(2)} वर्ष शेष`,
      act ? `${planetText(lang, act.mahadasha.lord)} महादशा (${mdEnd} तक)${act.antardasha ? `, ${planetText(lang, act.antardasha.lord)} अंतर्दशा (${adEnd} तक)` : ''}` : '--',
    ]
    : [
      `${asc.sign} ${Math.floor(asc.degree)}°, ${asc.nakshatra} pada ${asc.pada}; lord ${P(asc.lord)}`,
      `${moon.sign}, ${moon.nakshatra} pada ${moon.pada} (nakshatra lord ${P(moon.nakshatraLord)})`,
      `${pc.tithi.name}, ${titleCase(pc.tithi.paksha)} paksha`,
      `${pc.yoga.name} yoga, ${pc.karana.name} karana`,
      `${av.varna}, ${av.vashya}`,
      `${av.yoni} (${av.yoniGender.toLowerCase()}), ${av.gana}, ${av.nadi}`,
      `${av.tatwa}, ${av.paya}, ${av.namakshara}`,
      `${P(s.vimshottari.birthLord)} Mahadasha, ${s.vimshottari.balanceAtBirthYears.toFixed(2)} years remaining`,
      act ? `${P(act.mahadasha.lord)} Mahadasha (to ${mdEnd})${act.antardasha ? `, ${P(act.antardasha.lord)} Antardasha (to ${adEnd})` : ''}` : '--',
    ];
  const rows: Array<[string, string]> = [
    'Ascendant (Lagna)', 'Moon sign and nakshatra', 'Tithi at birth', 'Yoga and Karana at birth', 'Avakahada: Varna, Vashya',
    'Avakahada: Yoni, Gana, Nadi', 'Avakahada: Tatwa, Paya, Name syllable', 'Vimshottari balance at birth', 'Running periods',
  ].map((k, i): [string, string] => [term(lang, k), values[i]]);
  return {
    tex: factorTable(lang, rows),
    evidenceIds: ['asc.d1.sign', 'asc.d1.nakshatra', 'asc.d1.lord', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'dasha.birth-lord', 'dasha.current.md', ...(act?.antardasha ? ['dasha.current.ad'] : [])],
    method: pick(lang, 'Panchang elements from the Sun-Moon elongation at the moment of birth; Avakahada Chakra from the Moon\'s sign and nakshatra (engine AvakhadaChakraCalculator). The weekday is not shown because the engine\'s weekday uses the UTC date, not the local sunrise rule.', FINANCE_HI.summaryMethod),
  };
};

export const financePlanetTable: BlockRenderer = (ctx) => {
  const lang = blockLang(ctx);
  const t = planetTable(ctx.snapshot, '', lang);
  return { ...t, method: planetTableMethod(lang) };
};

export const financeChartsMain: BlockRenderer = (ctx) => {
  const lang = blockLang(ctx);
  return {
    tex: sideBySide(chartFor(ctx.snapshot, 'D1', 0.95, lang), chartFor(ctx.snapshot, 'MOON', 0.95, lang), term(lang, 'Birth chart (Rasi, D1)'), term(lang, 'Moon chart (Chandra Lagna)')),
    evidenceIds: [...chartEvidence('', 'D1'), ...chartEvidence('', 'MOON')],
    method: pick(lang, 'North Indian style; numbers are signs (1 = Aries ... 12 = Pisces); the top diamond is the 1st house. The Moon chart counts houses from the Moon\'s sign. R = retrograde.', FINANCE_HI.chartsMainMethod),
  };
};

export const financeChartsWealth: BlockRenderer = (ctx) => {
  const lang = blockLang(ctx);
  const sav = savChart(ctx.snapshot);
  return {
    tex: sideBySide(chartFor(ctx.snapshot, 'D2', 0.95, lang), chartFor(ctx.snapshot, 'D9', 0.95, lang), term(lang, 'Hora (D2) - wealth'), term(lang, 'Navamsa (D9) - inner strength')) +
      '\n\\vspace{2mm}\n' + sideBySide(chartFor(ctx.snapshot, 'D10', 0.95, lang), sav.tex, term(lang, 'Dasamsa (D10) - profession'), term(lang, 'Sarvashtakavarga - bindus per house')),
    evidenceIds: [...chartEvidence('', 'D2'), ...chartEvidence('', 'D9'), ...chartEvidence('', 'D10'), ...sav.evidenceIds],
    method: pick(lang, 'Divisional charts from the engine\'s VargaCalculator (Parashari rules). In the Sarvashtakavarga chart each house shows its total bindus from the seven planets (337 in all; 28 is the average).', FINANCE_HI.chartsWealthMethod),
  };
};

export const financeVimshottari: BlockRenderer = (ctx) => {
  const lang = blockLang(ctx);
  return {
    ...mahadashaTable(ctx.snapshot, '', lang),
    method: pick(lang, 'Vimshottari Mahadashas from the Moon\'s nakshatra at birth (120-year cycle, 365.25-day years).', FINANCE_HI.vimshottariMethod),
  };
};

function houseRows(ctx: BlockContext, houses: readonly number[]) {
  const lang = blockLang(ctx);
  const s = ctx.snapshot;
  const fn = classifyFunctionalNature(s.natal.ascendant.rashiIndex);
  const ids: string[] = [];
  const rows = houses.map((h) => {
    const house = s.natal.houses.find((x) => x.number === h)!;
    const lord = P(house.lord);
    const lp = s.natal.planets.find((p) => P(p.name) === lord)!;
    ids.push(`house.${h}.d1.sign`, `house.${h}.d1.lord`, `house.${h}.d1.lord-house`, `house.${h}.d1.occupants`, `sav.house.${h}`, `finance.functional.${lord.toLowerCase()}`);
    const occ = house.occupants.map((o) => planetText(lang, o)).join(', ') || '--';
    return [
      `\\TCell{\\textbf{${ord(lang, h)}}}`, `\\TCell{${tex(term(lang, HOUSE_THEME[h]))}}`, `\\TCell{${tex(signText(lang, house.sign))}}`, `\\TCell{${planetText(lang, lord)}}`,
      `\\TCell{${ord(lang, lp.house)} (${tex(signText(lang, lp.sign))})}`, `\\TCell{${tex(occ)}}`, `\\TCell{${savOfHouse(s, h)}}`,
      `\\TCell{${tex(natureLabel(lang, fn.find((c) => c.planet === lord)!.nature, true))}}`,
    ];
  });
  return { rows, ids };
}

const HOUSE_HEAD = ['House', 'Theme', 'Sign', 'Lord', 'Lord placed', 'Occupants', 'SAV', 'Lord\'s nature'];
/** Headings of the house tables; the Hindi SAV column is headed "बिंदु" (explained in the method note). */
const houseHead = (lang: Lang) => (lang === 'en' ? HOUSE_HEAD : HOUSE_HEAD.map((h) => (h === 'SAV' ? 'बिंदु' : term(lang, h))));
const HOUSE_COLS = 'l >{\\raggedright\\arraybackslash}X l l l l c >{\\raggedright\\arraybackslash}p{0.13\\linewidth}';

export const financeWealthHouses: BlockRenderer = (ctx) => {
  const lang = blockLang(ctx);
  const { rows, ids } = houseRows(ctx, [...WEALTH_HOUSES, 1, 10]);
  return {
    tex: `{\\fontsize{10}{14.5}\\selectfont ${pick(lang, 'The 2nd (accumulated wealth), 5th (investments), 9th (fortune) and 11th (gains) are the classical wealth houses (Dhana bhavas); the 1st and 10th, the self and the profession, are the engines that drive them.', FINANCE_HI.wealthHousesIntro)}\\par}\n` + tableTex(HOUSE_COLS, houseHead(lang), rows),
    evidenceIds: [...ids, 'finance.sav.wealth-total'],
    method: pick(lang, 'Whole Sign houses. SAV = Sarvashtakavarga bindus of the house sign (28 is the classical average; more bindus suggest the house\'s affairs flow more easily). Lord\'s nature: functional nature for this Lagna (see the Planetary Allies section).', FINANCE_HI.wealthHousesMethod),
  };
};

export const financeTrikHouses: BlockRenderer = (ctx) => {
  const lang = blockLang(ctx);
  const { rows, ids } = houseRows(ctx, [...TRIK_HOUSES, 3]);
  const s11 = savOfHouse(ctx.snapshot, 11);
  const s12 = savOfHouse(ctx.snapshot, 12);
  const card = lang === 'hi'
    ? `11वाँ भाव (लाभ): \\textbf{${s11}} बिंदु\\quad 12वाँ भाव (व्यय): \\textbf{${s12}} बिंदु। ${s11 > s12 ? FINANCE_HI.gainsExceed : FINANCE_HI.outgoExceeds}`
    : `11th house (gains): \\textbf{${s11}} bindus\\quad 12th house (expenditure): \\textbf{${s12}} bindus. ${s11 > s12 ? 'The 11th exceeds the 12th, which classical Ashtakavarga reads as income tending to exceed outgo.' : 'The 12th equals or exceeds the 11th; classical Ashtakavarga reads this as a chart that benefits from conscious budgeting.'}`;
  return {
    tex: tableTex(HOUSE_COLS, houseHead(lang), rows) +
      `\n\\begin{asCard}\\CardTitle{${term(lang, 'Gains and outgo in the Ashtakavarga')}}{\\fontsize{9.5}{13}\\selectfont ${card}\\par}\\end{asCard}`,
    evidenceIds: [...ids, 'finance.sav.gain-vs-expense'],
    method: pick(lang, 'The 6th, 8th and 12th (dusthanas) govern debts, sudden events and expenditure; the 3rd governs one\'s own effort. Gains-versus-outgo rule: compare Sarvashtakavarga bindus of the 11th and 12th houses (classical Ashtakavarga practice).', FINANCE_HI.trikMethod),
  };
};

export const financeHora: BlockRenderer = (ctx) => {
  const lang = blockLang(ctx);
  const s = ctx.snapshot;
  const d2 = s.vargas.D2!;
  const split = horaSplit(s);
  const names = (planets: string[]) => planets.map((p) => planetText(lang, p)).join(', ') || term(lang, 'none');
  const rows = PLANETS.map((p) => {
    const pl = Object.values(d2.placements).find((x) => x.planet !== 'Ascendant' && P(String(x.planet)) === p)!;
    const sun = pl.rashiIndex === 5;
    const nat = s.natal.planets.find((x) => P(x.name) === p)!;
    return [`\\TCell{\\textbf{${planetText(lang, p)}}}`, `\\TCell{${tex(signText(lang, nat.sign))} ${Math.floor(nat.degree)}°}`, `\\TCell{${term(lang, sun ? 'Sun\'s hora (Leo)' : 'Moon\'s hora (Cancer)')}}`, `\\TCell{${term(lang, sun ? 'Earning through effort, authority, visibility' : 'Accumulating through care, saving, nurturing')}}`];
  });
  return {
    tex: tableTex('l l l X', ['Planet', 'Natal position', 'Hora', 'Classical emphasis'].map((h) => term(lang, h)), rows) +
      (lang === 'hi'
        ? `\n\\begin{asHighlight}{\\fontsize{9.5}{13}\\selectfont सूर्य की होरा: \\textbf{${names(split.sun)}}।\\quad चंद्र की होरा: \\textbf{${names(split.moon)}}।\\par}\\end{asHighlight}`
        : `\n\\begin{asHighlight}{\\fontsize{9.5}{13}\\selectfont Sun's hora: \\textbf{${split.sun.join(', ') || 'none'}}.\\quad Moon's hora: \\textbf{${split.moon.join(', ') || 'none'}}.\\par}\\end{asHighlight}`),
    evidenceIds: ['finance.d2.sun-hora', 'finance.d2.moon-hora', 'finance.d2.lord2', ...PLANETS.map((p) => `planet.${p.toLowerCase()}.d2.sign`)],
    method: pick(lang, 'Parashari Hora: each sign is halved at 15°; in odd signs the first half is the Sun\'s hora (Leo) and the second the Moon\'s (Cancer), reversed in even signs. The "classical emphasis" column restates the traditional meaning of the two horas, not a prediction.', FINANCE_HI.horaMethod),
  };
};

export const financeDhanaYogas: BlockRenderer = (ctx) => {
  const lang = blockLang(ctx);
  const ys = dhanaYogas(ctx.snapshot);
  const ids = ['finance.dhana.count'];
  if (!ys.length) {
    return {
      tex: `\\begin{asCard}{\\fontsize{9.8}{13.5}\\selectfont ${pick(lang, 'The yoga engine did not detect a classical Dhana or Lakshmi yoga in this chart. This is common and is not a verdict on wealth: in classical reading, the condition of the 2nd and 11th lords, the dasha sequence and steady effort shape finances far more than any single combination.', FINANCE_HI.noYogaCard)}\\par}\\end{asCard}`,
      evidenceIds: ids,
      method: pick(lang, 'Only yogas detected by the engine\'s YogaCalculator (category DHANA, plus Lakshmi Yoga) are listed; none were found.', FINANCE_HI.noYogaMethod),
    };
  }
  const rows = ys.map((y) => {
    const slug = y.id.replace(/^YOGA_/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    ids.push(`yoga.${slug}`);
    const cond = y.evidence.conditions.filter((c) => c.satisfied).map((c) => yogaConditionText(lang, c.description)).slice(0, 3).join('; ');
    return [`\\TCell{\\textbf{${tex(yogaNameText(lang, y.canonicalName))}}}`, `\\TCell{${tex(cond || pick(lang, y.convention, FINANCE_HI.yogaConventionFallback))}}`];
  });
  return {
    tex: tableTex('>{\\raggedright\\arraybackslash}p{0.3\\linewidth} X', ['Yoga', 'Conditions met in your chart'].map((h) => term(lang, h)), rows),
    evidenceIds: ids,
    method: pick(lang, 'Only yogas detected by the engine\'s YogaCalculator (category DHANA, plus Lakshmi Yoga) are listed; conditions are quoted from the engine\'s rule evidence. No yoga has been added by hand.', FINANCE_HI.yogaMethod),
  };
};

export const financeFunctional: BlockRenderer = (ctx) => {
  const lang = blockLang(ctx);
  const s = ctx.snapshot;
  const fn = classifyFunctionalNature(s.natal.ascendant.rashiIndex);
  const rows = fn.map((c) => {
    const l = planetWealthLink(s, c.planet);
    return [`\\TCell{\\textbf{${planetText(lang, c.planet)}}}`, `\\TCell{${c.lordships.length ? c.lordships.map((h) => ord(lang, h)).join(', ') : '--'}}`, `\\TCell{${ord(lang, l.house)}}`,
      `\\TCell{${tex(natureLabel(lang, c.nature))}}`, `\\TCell{${tex(functionalReason(lang, c))}}`];
  });
  return {
    tex: tableTex('l l c >{\\raggedright\\arraybackslash}p{0.2\\linewidth} X', ['Planet', 'Rules', 'In house', 'Functional nature', 'Why'].map((h) => term(lang, h)), rows),
    evidenceIds: [...PLANETS.map((p) => `finance.functional.${p.toLowerCase()}`), 'finance.yogakaraka', 'asc.d1.sign'],
    method: functionalMethod(lang) + pick(lang, ' This replaces percentage "gem power" scores, for which no classical rule exists.', FINANCE_HI.functionalMethodTail),
  };
};

export const financeDashaNature: BlockRenderer = (ctx) => {
  const lang = blockLang(ctx);
  const s = ctx.snapshot;
  const now = Date.parse(s.asOfIso);
  const links = (phrases: string[]) => phrases.map((x) => linkText(lang, x)).join(', ') || '--';
  const rows = s.vimshottari.mahadashas.map((md) => {
    const p = P(md.lord);
    const l = planetWealthLink(s, p);
    const cur = Date.parse(md.startDateIso) <= now && now < Date.parse(md.endDateIso);
    const b = (x: string) => (cur ? `\\textbf{${x}}` : x);
    return [`\\TCell{${b(planetText(lang, p))}}`, `\\TCell{${b(`${dateText(lang, md.startDateIso)} -- ${dateText(lang, md.endDateIso)}`)}}`,
      `\\TCell{${tex(natureLabel(lang, l.functional.nature, true))}}`,
      `\\TCell{${tex(links(l.wealthLinks))}}`, `\\TCell{${tex(links(l.trikLinks))}}`];
  });
  return {
    tex: tableTex('l l >{\\raggedright\\arraybackslash}p{0.2\\linewidth} X X', ['Mahadasha', 'Period', 'Lord\'s nature', 'Wealth links (2/5/9/11)', '6/8/12 links'].map((h) => term(lang, h)), rows),
    evidenceIds: [...s.vimshottari.mahadashas.map((_, i) => `dasha.md.${two(i + 1)}`), ...PLANETS.map((p) => `finance.functional.${p.toLowerCase()}`)],
    method: pick(lang, '"rules N" = the period lord owns the Nth house; "in N" = it occupies the Nth house. Classical dasha reading: a period gives the results of the houses its lord rules and occupies. Bold = running period.', FINANCE_HI.dashaNatureMethod),
  };
};

function transitCell(rows: TransitRow[], lang: Lang): string {
  if (!rows.length) return '--';
  return rows.map((r) => `${tex(signText(lang, r.period.sign))}${r.period.enteredRetrograde ? ` (${term(lang, 'R')})` : ''} ${r.fromAsc}/${r.fromMoon}${r.favourableFromMoon ? '$^{\\ast}$' : ''}`).join(' $\\to$ ');
}

export function financeYear(n: number): BlockRenderer {
  return (ctx) => {
    const lang = blockLang(ctx);
    const hi = lang === 'hi';
    const y = yearOutlook(ctx.snapshot, n);
    const ids = [`finance.year.${n}.year`, `finance.year.${n}.jupiter`, `finance.year.${n}.saturn`, `finance.year.${n}.jupiter-gochara`, `finance.year.${n}.saturn-gochara`, `finance.year.${n}.wealth-contacts`, `finance.year.${n}.dasha`];
    const periodRows = y.transits.map((t) => {
      ids.push(transitEvidenceId('', t.planet, t.period.index));
      const wealth = [
        ...t.wealthOccupied.map((h) => (hi ? `${ordOblique(lang, h)} में` : `in ${ordinal(h)}`)),
        ...t.wealthAspected.map((h) => (hi ? `${ordOblique(lang, h)} पर दृष्टि` : `aspects ${ordinal(h)}`)),
      ].join(', ') || '--';
      return [`\\TCell{\\textbf{${planetText(lang, t.planet === 'JUPITER' ? 'Jupiter' : 'Saturn')}}}`, `\\TCell{${tex(signText(lang, t.period.sign))}${t.period.enteredRetrograde ? ` (${term(lang, 'R')})` : ''}}`,
        `\\TCell{${dayMonthText(lang, t.period.clipStartIso)} -- ${dayMonthText(lang, new Date(Date.parse(t.period.clipEndIso) - 1).toISOString())}}`,
        `\\TCell{${ord(lang, t.fromAsc)}}`, `\\TCell{${ord(lang, t.fromMoon)}}`, `\\TCell{${t.favourableFromMoon ? term(lang, 'favourable') : '--'}}`, `\\TCell{${tex(wealth)}}`];
    });
    const monthRows = y.months.map((m) => [
      `\\TCell{\\textbf{${monthShort(lang, m.month)}}}`, `\\TCell{${transitCell(m.jupiter, lang)}}`, `\\TCell{${transitCell(m.saturn, lang)}}`,
      `\\TCell{${tex(m.dashas.map((d) => (hi ? `${abbrOf(lang, d.md)}-${abbrOf(lang, d.ad)}` : `${d.md.slice(0, 2)}-${d.ad.slice(0, 2)}`)).join(' / '))}}`,
      `\\TCell{${tex([m.jupiter.some((r) => r.wealthOccupied.length || r.wealthAspected.length) ? abbrOf(lang, 'Jupiter') : '', m.saturn.some((r) => r.wealthOccupied.length || r.wealthAspected.length) ? abbrOf(lang, 'Saturn') : ''].filter(Boolean).join(', ') || '--')}}`,
    ]);
    const dashaLine = y.dashas.map((d) => `${planetText(lang, d.md)}--${planetText(lang, d.ad)} (${dateText(lang, d.startIso)} -- ${dateText(lang, d.endIso)})`).join('; ');
    return {
      tex: [
        `{\\sffamily\\fontsize{9}{11}\\selectfont\\bfseries\\color{Accent}${hi ? `${monthName(lang, 0)} -- ${monthName(lang, 11)}` : 'JANUARY -- DECEMBER'} ${y.year}}\\par\\vspace{1mm}`,
        `{\\fontsize{9.5}{13}\\selectfont\\textbf{${term(lang, 'Dasha periods this year:')}} ${tex(dashaLine)}\\par}`,
        tableTex('l l l c c l X', ['Planet', 'Sign', 'Period', 'From Lagna', 'From Moon', 'Gochara', 'Wealth houses'].map((h) => term(lang, h)), periodRows),
        `{\\sffamily\\fontsize{8.5}{10}\\selectfont\\bfseries\\color{Primary}${term(lang, 'MONTH BY MONTH')}}\\par`,
        tableTex('l X X l l', ['Month', 'Jupiter: sign, house from Lagna/Moon', 'Saturn: sign, house from Lagna/Moon', 'Dasha (MD-AD)', 'Wealth contact'].map((h) => term(lang, h)), monthRows, { font: '\\fontsize{8}{10}\\selectfont' }),
      ].join('\n'),
      evidenceIds: [...new Set(ids)],
      method: hi
        ? yearMethodHi(GOCHARA_FAVOURABLE_FROM_MOON.JUPITER.map((h) => ordOblique(lang, h)).join(', '), GOCHARA_FAVOURABLE_FROM_MOON.SATURN.map((h) => ordOblique(lang, h)).join(', '))
        : `Sign periods from the transit ingress solver (Lahiri); (R) = retrograde re-entry; "a/b" = house from Lagna / house from Moon. Gochara (Phaladeepika ch. 26): Jupiter is favourable in the ${GOCHARA_FAVOURABLE_FROM_MOON.JUPITER.map(ordinal).join(', ')} from the Moon and Saturn in the ${GOCHARA_FAVOURABLE_FROM_MOON.SATURN.map(ordinal).join(', ')}; an asterisk marks these. Vedha is not applied. Wealth contact = the planet occupies or aspects (Jupiter 5/7/9, Saturn 3/7/10) the 2nd, 5th, 9th or 11th from Lagna. No percentage scores are given: no classical rule defines them.`,
    };
  };
}

export const financeDashaWindow: BlockRenderer = (ctx) => {
  const lang = blockLang(ctx);
  const s = ctx.snapshot;
  const win = outlookWindow(s);
  const now = Date.parse(s.asOfIso);
  const ids: string[] = ['dasha.current.md', 'finance.md.current'];
  if (ctx.registry.has('finance.md.next')) ids.push('finance.md.next');
  const links = (phrases: string[]) => phrases.map((x) => linkText(lang, x)).join(', ') || '--';
  const rows = dashaSpans(s, win.startMs, win.endMs).map((d, i) => {
    ids.push(`finance.ad.${two(i + 1)}`);
    const l = planetWealthLink(s, d.ad);
    const cur = Date.parse(d.startIso) <= now && now < Date.parse(d.endIso);
    const b = (x: string) => (cur ? `\\textbf{${x}}` : x);
    return [`\\TCell{${b(`${planetText(lang, d.md)}--${planetText(lang, d.ad)}`)}}`, `\\TCell{${b(`${dateText(lang, d.startIso)} -- ${dateText(lang, d.endIso)}`)}}`,
      `\\TCell{${ord(lang, l.house)}}`, `\\TCell{${l.rules.length ? l.rules.map((h) => ord(lang, h)).join(', ') : '--'}}`,
      `\\TCell{${tex(natureLabel(lang, l.functional.nature, true))}}`,
      `\\TCell{${tex(links(l.wealthLinks))}}`, `\\TCell{${tex(links(l.trikLinks))}}`];
  });
  return {
    tex: tableTex('l l c l >{\\raggedright\\arraybackslash}p{0.13\\linewidth} X X', ['Period', 'Dates', 'AD lord in', 'AD lord rules', 'Nature', 'Wealth links', '6/8/12 links'].map((h) => term(lang, h)), rows),
    evidenceIds: ids,
    method: pick(lang, 'All Vimshottari Antardashas overlapping the five-year outlook window. Each sub-period colours the Mahadasha with the houses its own lord rules and occupies (classical Parashari dasha reading). Bold = running.', FINANCE_HI.dashaWindowMethod),
  };
};

export const FINANCE_BLOCKS: Record<string, BlockRenderer> = {
  'finance-summary': financeSummary,
  'finance-planet-table': financePlanetTable,
  'finance-charts-main': financeChartsMain,
  'finance-charts-wealth': financeChartsWealth,
  'finance-vimshottari': financeVimshottari,
  'finance-wealth-houses': financeWealthHouses,
  'finance-trik-houses': financeTrikHouses,
  'finance-hora': financeHora,
  'finance-dhana-yogas': financeDhanaYogas,
  'finance-functional': financeFunctional,
  'finance-dasha-nature': financeDashaNature,
  'finance-dasha-window': financeDashaWindow,
  'finance-year-1': financeYear(1),
  'finance-year-2': financeYear(2),
  'finance-year-3': financeYear(3),
  'finance-year-4': financeYear(4),
  'finance-year-5': financeYear(5),
};

export type { BlockOutput };
