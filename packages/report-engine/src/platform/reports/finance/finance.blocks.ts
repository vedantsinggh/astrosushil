/**
 * Finance Report — deterministic blocks (provenance `deterministic`).
 */
import { kvTable, BlockContext, BlockOutput, BlockRenderer } from '../../render/blocks';
import { ordinal, planetName, PLANETS } from '../../evidence/evidence-registry';
import { formatDate, tex } from '../../render/latex';
import { classifyFunctionalNature, FUNCTIONAL_METHOD, NATURE_LABEL } from '../_finance-couple-shared/functional-nature';
import { dayMonth, GOCHARA_FAVOURABLE_FROM_MOON, MONTHS, transitEvidenceId } from '../_finance-couple-shared/gochara';
import {
  avakhadaFor,
  chartEvidence,
  chartFor,
  mahadashaTable,
  panchangAtBirth,
  planetTable,
  PLANET_TABLE_METHOD,
  savChart,
  sideBySide,
  tableTex,
  titleCase,
} from '../_finance-couple-shared/natal-tables';
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

const two = (n: number) => String(n).padStart(2, '0');
const P = (sym: string) => planetName(sym);

export const financeSummary: BlockRenderer = (ctx) => {
  const s = ctx.snapshot;
  const asc = s.natal.ascendant;
  const moon = s.natal.planets.find((p) => P(p.name) === 'Moon')!;
  const av = avakhadaFor(s);
  const pc = panchangAtBirth(s);
  const act = s.vimshottari.activeDasha;
  const rows: Array<[string, string]> = [
    ['Ascendant (Lagna)', `${asc.sign} ${Math.floor(asc.degree)}°, ${asc.nakshatra} pada ${asc.pada}; lord ${P(asc.lord)}`],
    ['Moon sign and nakshatra', `${moon.sign}, ${moon.nakshatra} pada ${moon.pada} (nakshatra lord ${P(moon.nakshatraLord)})`],
    ['Tithi at birth', `${pc.tithi.name}, ${titleCase(pc.tithi.paksha)} paksha`],
    ['Yoga and Karana at birth', `${pc.yoga.name} yoga, ${pc.karana.name} karana`],
    ['Avakahada: Varna, Vashya', `${av.varna}, ${av.vashya}`],
    ['Avakahada: Yoni, Gana, Nadi', `${av.yoni} (${av.yoniGender.toLowerCase()}), ${av.gana}, ${av.nadi}`],
    ['Avakahada: Tatwa, Paya, Name syllable', `${av.tatwa}, ${av.paya}, ${av.namakshara}`],
    ['Vimshottari balance at birth', `${P(s.vimshottari.birthLord)} Mahadasha, ${s.vimshottari.balanceAtBirthYears.toFixed(2)} years remaining`],
    ['Running periods', act ? `${P(act.mahadasha.lord)} Mahadasha (to ${formatDate(act.mahadasha.endDateIso)})${act.antardasha ? `, ${P(act.antardasha.lord)} Antardasha (to ${formatDate(act.antardasha.endDateIso)})` : ''}` : '--'],
  ];
  return {
    tex: kvTable(rows),
    evidenceIds: ['asc.d1.sign', 'asc.d1.nakshatra', 'asc.d1.lord', 'planet.moon.d1.sign', 'planet.moon.d1.nakshatra', 'dasha.birth-lord', 'dasha.current.md', ...(act?.antardasha ? ['dasha.current.ad'] : [])],
    method: 'Panchang elements from the Sun-Moon elongation at the moment of birth; Avakahada Chakra from the Moon\'s sign and nakshatra (engine AvakhadaChakraCalculator). The weekday is not shown because the engine\'s weekday uses the UTC date, not the local sunrise rule.',
  };
};

export const financePlanetTable: BlockRenderer = (ctx) => {
  const t = planetTable(ctx.snapshot);
  return { ...t, method: PLANET_TABLE_METHOD };
};

export const financeChartsMain: BlockRenderer = (ctx) => ({
  tex: sideBySide(chartFor(ctx.snapshot, 'D1'), chartFor(ctx.snapshot, 'MOON'), 'Birth chart (Rasi, D1)', 'Moon chart (Chandra Lagna)'),
  evidenceIds: [...chartEvidence('', 'D1'), ...chartEvidence('', 'MOON')],
  method: 'North Indian style; numbers are signs (1 = Aries ... 12 = Pisces); the top diamond is the 1st house. The Moon chart counts houses from the Moon\'s sign. R = retrograde.',
});

export const financeChartsWealth: BlockRenderer = (ctx) => {
  const sav = savChart(ctx.snapshot);
  return {
    tex: sideBySide(chartFor(ctx.snapshot, 'D2'), chartFor(ctx.snapshot, 'D9'), 'Hora (D2) - wealth', 'Navamsa (D9) - inner strength') +
      '\n\\vspace{2mm}\n' + sideBySide(chartFor(ctx.snapshot, 'D10'), sav.tex, 'Dasamsa (D10) - profession', 'Sarvashtakavarga - bindus per house'),
    evidenceIds: [...chartEvidence('', 'D2'), ...chartEvidence('', 'D9'), ...chartEvidence('', 'D10'), ...sav.evidenceIds],
    method: 'Divisional charts from the engine\'s VargaCalculator (Parashari rules). In the Sarvashtakavarga chart each house shows its total bindus from the seven planets (337 in all; 28 is the average).',
  };
};

export const financeVimshottari: BlockRenderer = (ctx) => ({
  ...mahadashaTable(ctx.snapshot),
  method: 'Vimshottari Mahadashas from the Moon\'s nakshatra at birth (120-year cycle, 365.25-day years).',
});

function houseRows(ctx: BlockContext, houses: readonly number[]) {
  const s = ctx.snapshot;
  const fn = classifyFunctionalNature(s.natal.ascendant.rashiIndex);
  const ids: string[] = [];
  const rows = houses.map((h) => {
    const house = s.natal.houses.find((x) => x.number === h)!;
    const lord = P(house.lord);
    const lp = s.natal.planets.find((p) => P(p.name) === lord)!;
    ids.push(`house.${h}.d1.sign`, `house.${h}.d1.lord`, `house.${h}.d1.lord-house`, `house.${h}.d1.occupants`, `sav.house.${h}`, `finance.functional.${lord.toLowerCase()}`);
    const occ = house.occupants.map((o) => P(o)).join(', ') || '--';
    return [
      `\\TCell{\\textbf{${ordinal(h)}}}`, `\\TCell{${tex(HOUSE_THEME[h])}}`, `\\TCell{${tex(house.sign)}}`, `\\TCell{${lord}}`,
      `\\TCell{${ordinal(lp.house)} (${tex(lp.sign)})}`, `\\TCell{${tex(occ)}}`, `\\TCell{${savOfHouse(s, h)}}`,
      `\\TCell{${tex(NATURE_LABEL[fn.find((c) => c.planet === lord)!.nature].replace('Functionally ', ''))}}`,
    ];
  });
  return { rows, ids };
}

const HOUSE_HEAD = ['House', 'Theme', 'Sign', 'Lord', 'Lord placed', 'Occupants', 'SAV', 'Lord\'s nature'];
const HOUSE_COLS = 'l >{\\raggedright\\arraybackslash}X l l l l c >{\\raggedright\\arraybackslash}p{0.13\\linewidth}';

export const financeWealthHouses: BlockRenderer = (ctx) => {
  const { rows, ids } = houseRows(ctx, [...WEALTH_HOUSES, 1, 10]);
  return {
    tex: `{\\fontsize{10}{14.5}\\selectfont The 2nd (accumulated wealth), 5th (investments), 9th (fortune) and 11th (gains) are the classical wealth houses (Dhana bhavas); the 1st and 10th, the self and the profession, are the engines that drive them.\\par}\n` + tableTex(HOUSE_COLS, HOUSE_HEAD, rows),
    evidenceIds: [...ids, 'finance.sav.wealth-total'],
    method: 'Whole Sign houses. SAV = Sarvashtakavarga bindus of the house sign (28 is the classical average; more bindus suggest the house\'s affairs flow more easily). Lord\'s nature: functional nature for this Lagna (see the Planetary Allies section).',
  };
};

export const financeTrikHouses: BlockRenderer = (ctx) => {
  const { rows, ids } = houseRows(ctx, [...TRIK_HOUSES, 3]);
  const s11 = savOfHouse(ctx.snapshot, 11);
  const s12 = savOfHouse(ctx.snapshot, 12);
  return {
    tex: tableTex(HOUSE_COLS, HOUSE_HEAD, rows) +
      `\n\\begin{asCard}\\CardTitle{Gains and outgo in the Ashtakavarga}{\\fontsize{9.5}{13}\\selectfont 11th house (gains): \\textbf{${s11}} bindus\\quad 12th house (expenditure): \\textbf{${s12}} bindus. ${s11 > s12 ? 'The 11th exceeds the 12th, which classical Ashtakavarga reads as income tending to exceed outgo.' : 'The 12th equals or exceeds the 11th; classical Ashtakavarga reads this as a chart that benefits from conscious budgeting.'}\\par}\\end{asCard}`,
    evidenceIds: [...ids, 'finance.sav.gain-vs-expense'],
    method: 'The 6th, 8th and 12th (dusthanas) govern debts, sudden events and expenditure; the 3rd governs one\'s own effort. Gains-versus-outgo rule: compare Sarvashtakavarga bindus of the 11th and 12th houses (classical Ashtakavarga practice).',
  };
};

export const financeHora: BlockRenderer = (ctx) => {
  const s = ctx.snapshot;
  const d2 = s.vargas.D2!;
  const split = horaSplit(s);
  const rows = PLANETS.map((p) => {
    const pl = Object.values(d2.placements).find((x) => x.planet !== 'Ascendant' && P(String(x.planet)) === p)!;
    const sun = pl.rashiIndex === 5;
    const nat = s.natal.planets.find((x) => P(x.name) === p)!;
    return [`\\TCell{\\textbf{${p}}}`, `\\TCell{${tex(nat.sign)} ${Math.floor(nat.degree)}°}`, `\\TCell{${sun ? 'Sun\'s hora (Leo)' : 'Moon\'s hora (Cancer)'}}`, `\\TCell{${sun ? 'Earning through effort, authority, visibility' : 'Accumulating through care, saving, nurturing'}}`];
  });
  return {
    tex: tableTex('l l l X', ['Planet', 'Natal position', 'Hora', 'Classical emphasis'], rows) +
      `\n\\begin{asHighlight}{\\fontsize{9.5}{13}\\selectfont Sun's hora: \\textbf{${split.sun.join(', ') || 'none'}}.\\quad Moon's hora: \\textbf{${split.moon.join(', ') || 'none'}}.\\par}\\end{asHighlight}`,
    evidenceIds: ['finance.d2.sun-hora', 'finance.d2.moon-hora', 'finance.d2.lord2', ...PLANETS.map((p) => `planet.${p.toLowerCase()}.d2.sign`)],
    method: 'Parashari Hora: each sign is halved at 15°; in odd signs the first half is the Sun\'s hora (Leo) and the second the Moon\'s (Cancer), reversed in even signs. The "classical emphasis" column restates the traditional meaning of the two horas, not a prediction.',
  };
};

export const financeDhanaYogas: BlockRenderer = (ctx) => {
  const ys = dhanaYogas(ctx.snapshot);
  const ids = ['finance.dhana.count'];
  if (!ys.length) {
    return {
      tex: '\\begin{asCard}{\\fontsize{9.8}{13.5}\\selectfont The yoga engine did not detect a classical Dhana or Lakshmi yoga in this chart. This is common and is not a verdict on wealth: in classical reading, the condition of the 2nd and 11th lords, the dasha sequence and steady effort shape finances far more than any single combination.\\par}\\end{asCard}',
      evidenceIds: ids,
      method: 'Only yogas detected by the engine\'s YogaCalculator (category DHANA, plus Lakshmi Yoga) are listed; none were found.',
    };
  }
  const rows = ys.map((y) => {
    const slug = y.id.replace(/^YOGA_/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    ids.push(`yoga.${slug}`);
    const cond = y.evidence.conditions.filter((c) => c.satisfied).map((c) => c.description).slice(0, 3).join('; ');
    return [`\\TCell{\\textbf{${tex(y.canonicalName)}}}`, `\\TCell{${tex(cond || y.convention)}}`];
  });
  return {
    tex: tableTex('>{\\raggedright\\arraybackslash}p{0.3\\linewidth} X', ['Yoga', 'Conditions met in your chart'], rows),
    evidenceIds: ids,
    method: 'Only yogas detected by the engine\'s YogaCalculator (category DHANA, plus Lakshmi Yoga) are listed; conditions are quoted from the engine\'s rule evidence. No yoga has been added by hand.',
  };
};

export const financeFunctional: BlockRenderer = (ctx) => {
  const s = ctx.snapshot;
  const fn = classifyFunctionalNature(s.natal.ascendant.rashiIndex);
  const rows = fn.map((c) => {
    const l = planetWealthLink(s, c.planet);
    return [`\\TCell{\\textbf{${c.planet}}}`, `\\TCell{${c.lordships.length ? c.lordships.map(ordinal).join(', ') : '--'}}`, `\\TCell{${ordinal(l.house)}}`,
      `\\TCell{${tex(NATURE_LABEL[c.nature])}}`, `\\TCell{${tex(c.reason)}}`];
  });
  return {
    tex: tableTex('l l c >{\\raggedright\\arraybackslash}p{0.2\\linewidth} X', ['Planet', 'Rules', 'In house', 'Functional nature', 'Why'], rows),
    evidenceIds: [...PLANETS.map((p) => `finance.functional.${p.toLowerCase()}`), 'finance.yogakaraka', 'asc.d1.sign'],
    method: FUNCTIONAL_METHOD + ' This replaces percentage "gem power" scores, for which no classical rule exists.',
  };
};

export const financeDashaNature: BlockRenderer = (ctx) => {
  const s = ctx.snapshot;
  const now = Date.parse(s.asOfIso);
  const rows = s.vimshottari.mahadashas.map((md) => {
    const p = P(md.lord);
    const l = planetWealthLink(s, p);
    const cur = Date.parse(md.startDateIso) <= now && now < Date.parse(md.endDateIso);
    const b = (x: string) => (cur ? `\\textbf{${x}}` : x);
    return [`\\TCell{${b(p)}}`, `\\TCell{${b(`${formatDate(md.startDateIso)} -- ${formatDate(md.endDateIso)}`)}}`,
      `\\TCell{${tex(NATURE_LABEL[l.functional.nature].replace('Functionally ', ''))}}`,
      `\\TCell{${tex(l.wealthLinks.join(', ') || '--')}}`, `\\TCell{${tex(l.trikLinks.join(', ') || '--')}}`];
  });
  return {
    tex: tableTex('l l >{\\raggedright\\arraybackslash}p{0.2\\linewidth} X X', ['Mahadasha', 'Period', 'Lord\'s nature', 'Wealth links (2/5/9/11)', '6/8/12 links'], rows),
    evidenceIds: [...s.vimshottari.mahadashas.map((_, i) => `dasha.md.${two(i + 1)}`), ...PLANETS.map((p) => `finance.functional.${p.toLowerCase()}`)],
    method: '"rules N" = the period lord owns the Nth house; "in N" = it occupies the Nth house. Classical dasha reading: a period gives the results of the houses its lord rules and occupies. Bold = running period.',
  };
};

function transitCell(rows: TransitRow[]): string {
  if (!rows.length) return '--';
  return rows.map((r) => `${tex(r.period.sign)}${r.period.enteredRetrograde ? ' (R)' : ''} ${r.fromAsc}/${r.fromMoon}${r.favourableFromMoon ? '$^{\\ast}$' : ''}`).join(' $\\to$ ');
}

export function financeYear(n: number): BlockRenderer {
  return (ctx) => {
    const y = yearOutlook(ctx.snapshot, n);
    const ids = [`finance.year.${n}.year`, `finance.year.${n}.jupiter`, `finance.year.${n}.saturn`, `finance.year.${n}.jupiter-gochara`, `finance.year.${n}.saturn-gochara`, `finance.year.${n}.wealth-contacts`, `finance.year.${n}.dasha`];
    const periodRows = y.transits.map((t) => {
      ids.push(transitEvidenceId('', t.planet, t.period.index));
      const wealth = [...t.wealthOccupied.map((h) => `in ${ordinal(h)}`), ...t.wealthAspected.map((h) => `aspects ${ordinal(h)}`)].join(', ') || '--';
      return [`\\TCell{\\textbf{${t.planet === 'JUPITER' ? 'Jupiter' : 'Saturn'}}}`, `\\TCell{${tex(t.period.sign)}${t.period.enteredRetrograde ? ' (R)' : ''}}`,
        `\\TCell{${dayMonth(t.period.clipStartIso)} -- ${dayMonth(new Date(Date.parse(t.period.clipEndIso) - 1).toISOString())}}`,
        `\\TCell{${ordinal(t.fromAsc)}}`, `\\TCell{${ordinal(t.fromMoon)}}`, `\\TCell{${t.favourableFromMoon ? 'favourable' : '--'}}`, `\\TCell{${tex(wealth)}}`];
    });
    const monthRows = y.months.map((m) => [
      `\\TCell{\\textbf{${MONTHS[m.month].slice(0, 3)}}}`, `\\TCell{${transitCell(m.jupiter)}}`, `\\TCell{${transitCell(m.saturn)}}`,
      `\\TCell{${tex(m.dashas.map((d) => `${d.md.slice(0, 2)}-${d.ad.slice(0, 2)}`).join(' / '))}}`,
      `\\TCell{${tex([m.jupiter.some((r) => r.wealthOccupied.length || r.wealthAspected.length) ? 'Ju' : '', m.saturn.some((r) => r.wealthOccupied.length || r.wealthAspected.length) ? 'Sa' : ''].filter(Boolean).join(', ') || '--')}}`,
    ]);
    const dashaLine = y.dashas.map((d) => `${d.md}--${d.ad} (${formatDate(d.startIso)} -- ${formatDate(d.endIso)})`).join('; ');
    return {
      tex: [
        `{\\sffamily\\fontsize{9}{11}\\selectfont\\bfseries\\color{Accent}JANUARY -- DECEMBER ${y.year}}\\par\\vspace{1mm}`,
        `{\\fontsize{9.5}{13}\\selectfont\\textbf{Dasha periods this year:} ${tex(dashaLine)}\\par}`,
        tableTex('l l l c c l X', ['Planet', 'Sign', 'Period', 'From Lagna', 'From Moon', 'Gochara', 'Wealth houses'], periodRows),
        `{\\sffamily\\fontsize{8.5}{10}\\selectfont\\bfseries\\color{Primary}MONTH BY MONTH}\\par`,
        tableTex('l X X l l', ['Month', 'Jupiter: sign, house from Lagna/Moon', 'Saturn: sign, house from Lagna/Moon', 'Dasha (MD-AD)', 'Wealth contact'], monthRows, { font: '\\fontsize{8}{10}\\selectfont' }),
      ].join('\n'),
      evidenceIds: [...new Set(ids)],
      method: `Sign periods from the transit ingress solver (Lahiri); (R) = retrograde re-entry; "a/b" = house from Lagna / house from Moon. Gochara (Phaladeepika ch. 26): Jupiter is favourable in the ${GOCHARA_FAVOURABLE_FROM_MOON.JUPITER.map(ordinal).join(', ')} from the Moon and Saturn in the ${GOCHARA_FAVOURABLE_FROM_MOON.SATURN.map(ordinal).join(', ')}; an asterisk marks these. Vedha is not applied. Wealth contact = the planet occupies or aspects (Jupiter 5/7/9, Saturn 3/7/10) the 2nd, 5th, 9th or 11th from Lagna. No percentage scores are given: no classical rule defines them.`,
    };
  };
}

export const financeDashaWindow: BlockRenderer = (ctx) => {
  const s = ctx.snapshot;
  const win = outlookWindow(s);
  const now = Date.parse(s.asOfIso);
  const ids: string[] = ['dasha.current.md', 'finance.md.current'];
  if (ctx.registry.has('finance.md.next')) ids.push('finance.md.next');
  const rows = dashaSpans(s, win.startMs, win.endMs).map((d, i) => {
    ids.push(`finance.ad.${two(i + 1)}`);
    const l = planetWealthLink(s, d.ad);
    const cur = Date.parse(d.startIso) <= now && now < Date.parse(d.endIso);
    const b = (x: string) => (cur ? `\\textbf{${x}}` : x);
    return [`\\TCell{${b(`${d.md}--${d.ad}`)}}`, `\\TCell{${b(`${formatDate(d.startIso)} -- ${formatDate(d.endIso)}`)}}`,
      `\\TCell{${ordinal(l.house)}}`, `\\TCell{${l.rules.length ? l.rules.map(ordinal).join(', ') : '--'}}`,
      `\\TCell{${tex(NATURE_LABEL[l.functional.nature].replace('Functionally ', ''))}}`,
      `\\TCell{${tex(l.wealthLinks.join(', ') || '--')}}`, `\\TCell{${tex(l.trikLinks.join(', ') || '--')}}`];
  });
  return {
    tex: tableTex('l l c l >{\\raggedright\\arraybackslash}p{0.13\\linewidth} X X', ['Period', 'Dates', 'AD lord in', 'AD lord rules', 'Nature', 'Wealth links', '6/8/12 links'], rows),
    evidenceIds: ids,
    method: 'All Vimshottari Antardashas overlapping the five-year outlook window. Each sub-period colours the Mahadasha with the houses its own lord rules and occupies (classical Parashari dasha reading). Bold = running.',
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
