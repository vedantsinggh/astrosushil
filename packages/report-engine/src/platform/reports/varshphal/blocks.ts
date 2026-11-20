/**
 * Deterministic blocks of the Varshphal report. Every block renders from the
 * `extend` output (VarshaYearData) and cites the evidence IDs it shows.
 */
import { ordinal, PLANETS } from '../../evidence/evidence-registry';
import { BlockContext, BlockOutput, BlockRenderer, kvTable, northChart } from '../../render/blocks';
import { tex } from '../../render/latex';
import { avakahadaBlock } from '../_annual-shared/avakahada';
import { GOCHARA_METHOD, pad2, PLANET_ASSOC, SYMBOL, TRANSIT_PLANETS } from '../_annual-shared/astro';
import { cols, gocharaChip, gridTable, localDate, localDateTime, longTable, transitRow } from '../_annual-shared/tables';
import { overlapFraction } from '../_annual-shared/transits';
import { LIFE_AREAS, pn, VarshaYearData } from './calc/varsha-year';
import { SAHAM_MEANING, SHOWN_SAHAMS, signEn } from './evidence';

export const EXT_KEY = 'varshphal';
const ABBR: Record<string, string> = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };

function data(ctx: BlockContext): VarshaYearData {
  const d = ctx.ext[EXT_KEY] as VarshaYearData | undefined;
  if (!d) throw new Error('BLOCK_DATA_MISSING: varshphal');
  return d;
}
const tz = (ctx: BlockContext) => ctx.snapshot.subject.timezone;
const small = (s: string) => `{\\fontsize{10}{14.5}\\selectfont ${s}\\par}`;

export const varshphalSynopsis = avakahadaBlock('avakahada');

export function varshphalReturn(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const v = d.varsha;
  const sr = v.solarReturn;
  const lagna = signEn(v.varshaLagna.rashiIndex);
  const houses = Array.from({ length: 12 }, (_, i) => ({ sign: ((v.varshaLagna.rashiIndex - 1 + i) % 12) + 1, lines: [] as string[] }));
  for (const name of PLANETS) {
    const p = v.planets[SYMBOL[name]];
    houses[p.house - 1].lines.push(`${ABBR[name]} ${Math.floor(p.degreeInRashi)}°${p.isRetrograde && name !== 'Rahu' && name !== 'Ketu' ? ' R' : ''}`);
  }
  houses[0].lines.unshift('Asc');
  houses[v.muntha.houseInVarshaChart - 1].lines.push('(Muntha)');
  const rows: Array<[string, string]> = [
    ['Solar return (Varsha Pravesha)', `${localDateTime(sr.solarReturnUtcIso, tz(ctx))} (local time)`],
    ['Year covered', `${localDate(d.yearStartIso, tz(ctx))} to ${localDate(d.yearEndIso, tz(ctx))} (${(v.actualCycleDays ?? 365.25).toFixed(2)} days)`],
    ['Completed years', `${sr.age} (year ${sr.age + 1} of life)`],
    ['Place used for the annual chart', ctx.snapshot.subject.placeName],
    ['Natal Sun returns to', `${sr.natalSunDegree.toFixed(2)}° ${signEn(Math.floor(sr.natalSunLongitude / 30) + 1)} (sidereal)`],
    ['Annual Ascendant (Varsha Lagna)', `${lagna} ${v.varshaLagna.degreeInRashi.toFixed(1)}°, ruled by ${pn(v.varshaLagna.lord)}`],
    ['Type of return', v.panchadhikari.isDayReturn ? 'Day return (Sun above the horizon)' : 'Night return (Sun below the horizon)'],
  ];
  return {
    tex: `${kvTable(rows)}\n\\begin{center}${northChart(houses)}\\end{center}`,
    evidenceIds: ['varsha.return.date', 'varsha.year.end', 'varsha.age', 'varsha.lagna.sign', 'varsha.lagna.lord', 'varsha.day-night', 'varsha.muntha.house',
      ...PLANETS.map((p) => `varsha.planet.${p.toLowerCase()}.house`)],
    method: 'Tajik solar return: the exact instant the transiting sidereal Sun returns to its natal longitude, cast for the birthplace (engine SolarReturnSolver and VarshaphalaCalculator). North Indian style; the top diamond is the year\'s 1st house; numbers are signs. (Muntha) marks the Muntha house.',
  };
}

export function varshphalPositions(ctx: BlockContext): BlockOutput {
  const v = data(ctx).varsha;
  const rows = PLANETS.map((name) => {
    const p = v.planets[SYMBOL[name]];
    const h = v.harshaBala[SYMBOL[name]];
    const node = name === 'Rahu' || name === 'Ketu';
    return [
      `\\textbf{${tex(name)}}`, tex(signEn(p.rashiIndex)), `${p.degreeInRashi.toFixed(2)}°`, tex(ordinal(p.house)),
      tex(p.nakshatraName ?? ''), node ? '--' : p.isRetrograde ? 'Retrograde' : 'Direct', node ? '--' : p.isCombust ? 'Yes' : 'No',
      node || !h ? '--' : `${h.totalScore} / 20`,
    ];
  });
  return {
    tex: gridTable(cols('l.09', 'l.11', 'r.08', 'c.06', 'X', 'l.1', 'c.08', 'c.09'), ['Planet', 'Sign', 'Degree', 'House', 'Nakshatra', 'Motion', 'Combust', 'Harsha Bala'], rows),
    evidenceIds: PLANETS.flatMap((p) => [`varsha.planet.${p.toLowerCase()}.sign`, `varsha.planet.${p.toLowerCase()}.house`]),
    method: 'Positions at the solar-return instant (sidereal, Lahiri; whole-sign houses from the annual Ascendant). Harsha Bala is the Tajik four-fold "joy" strength (place, own/exaltation sign, gender of sign, day/night), 5 points each, out of 20.',
  };
}

export function varshphalPanchadhikari(ctx: BlockContext): BlockOutput {
  const v = data(ctx).varsha;
  const lord = pn(v.varshesha.selectedVarshesha);
  const rows = v.panchadhikari.candidates.filter((c) => !c.isIndeterminate && c.planet).map((c) => {
    const p = pn(c.planet);
    return [
      tex(c.roleTitle), `${p === lord ? '\\textbf{' : ''}${tex(p)}${p === lord ? '}' : ''}`, tex(c.sourceDescription),
      tex(ordinal(c.houseInVarshaChart)), c.aspectsVarshaLagna ? `Yes (${tex(ordinal(c.aspectToVarshaLagna ?? 0))})` : 'No', `${c.harshaBalaScore} / 20`,
    ];
  });
  const box = `\\begin{asHighlight}\\CardTitle{Year Lord (Varshesha)}{\\fontsize{10}{14}\\selectfont \\textbf{${tex(lord)}}, which falls in the year's ${tex(ordinal(v.planets[SYMBOL[lord]].house))} house.\\par}\\end{asHighlight}`;
  return {
    tex: `${gridTable(cols('l.15', 'l.09', 'X', 'c.06', 'c.1', 'c.07'), ['Office', 'Planet', 'Why it holds the office', 'House', 'Aspects Asc', 'Harsha'], rows)}\n${box}`,
    evidenceIds: ['varsha.lord', 'varsha.lord.house', ...v.panchadhikari.candidates.filter((c) => !c.isIndeterminate && c.planet).map((c) => `varsha.office.${({ VARSHA_LAGNESHA: 'varsha-lagnesha', JANMESHA: 'janmesha', MUNTHESHA: 'munthesha', TRIRASHISHA: 'trirashisha', DINA_RATRI_PATI: 'dina-ratri-pati' } as Record<string, string>)[c.role]}`)],
    method: 'Tajika Neelakanthi: the five office-bearers are the lords of the natal Ascendant, the annual Ascendant, the Muntha sign, the Tri-Rashi lord (day/night table) and the Sun-sign lord (day return) or Moon-sign lord (night return). The Year Lord is the one with a Tajik aspect (1, 3, 4, 5, 7, 9, 10, 11 signs) on the annual Ascendant and the greatest strength; the engine measures strength by Harsha Bala, then number of offices held, then office order.',
  };
}

export function varshphalMuntha(ctx: BlockContext): BlockOutput {
  const v = data(ctx).varsha;
  const m = v.muntha;
  const ml = pn(m.lord);
  const rows: Array<[string, string]> = [
    ['Muntha sign', `${signEn(m.rashiIndex)} (${m.degreeInRashi.toFixed(1)}°)`],
    ['House in the annual chart', ordinal(m.houseInVarshaChart)],
    ['Sign counted from the natal Ascendant', ordinal(m.houseInNatalChart)],
    ['Muntha lord', `${ml}, in the year's ${ordinal(v.planets[SYMBOL[ml]].house)} house (${signEn(v.planets[SYMBOL[ml]].rashiIndex)})`],
    ['How it is found', `Natal Ascendant sign advanced by one sign for each of the ${m.progressionYears} completed years`],
  ];
  return {
    tex: kvTable(rows),
    evidenceIds: ['varsha.muntha.sign', 'varsha.muntha.house', 'varsha.muntha.natal-house', 'varsha.muntha.lord'],
    method: 'Muntha (Tajika Neelakanthi): starts at the natal Ascendant and moves one sign per completed year, keeping the Ascendant\'s degree.',
  };
}

export function varshphalTajik(ctx: BlockContext): BlockOutput {
  const v = data(ctx).varsha;
  if (!v.tajikaYogas.length) {
    return { tex: small('{\\itshape No Tajik yoga (Ithasala, Isarpha, Nakta, Yamaya or Kamboola) is formed between the seven classical planets in this annual chart.}'), evidenceIds: ['varsha.tajik.count'], method: 'Tajik aspects with the deeptamsha (orb) of each planet, as computed by the engine\'s TajikaYogasCalculator.' };
  }
  const rows = v.tajikaYogas.map((y) => [
    `\\textbf{${tex(y.type.charAt(0) + y.type.slice(1).toLowerCase())}}`,
    tex(`${pn(y.planet1)} -- ${pn(y.planet2)}${y.intermediaryPlanet ? ` (via ${pn(y.intermediaryPlanet)})` : ''}`),
    `${y.actualDistanceDegrees.toFixed(2)}°`, `${y.orbDegrees.toFixed(1)}°`, y.isApplying ? 'Applying' : 'Separating',
  ]);
  return {
    tex: gridTable(cols('l.12', 'X', 'r.1', 'r.07', 'l.11'), ['Yoga', 'Planets', 'Distance', 'Orb', 'Motion'], rows),
    evidenceIds: ['varsha.tajik.count', ...v.tajikaYogas.map((_, i) => `varsha.tajik.${pad2(i + 1)}`)],
    method: 'Tajik yogas between the seven classical planets: Ithasala = faster planet applying to a slower one within their mean orb (deeptamsha: Sun 15°, Moon 12°, Mars 8°, Mercury 7°, Jupiter 9°, Venus 7°, Saturn 9°); Isarpha = separating; Nakta / Yamaya = light transferred or collected by a third planet; Kamboola = the Moon joining an Ithasala. Distance is the difference of degrees within the signs.',
  };
}

export function varshphalSahams(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const list = SHOWN_SAHAMS(d);
  const rows = list.map((s) => [`\\textbf{${tex(s.name)}}`, tex(SAHAM_MEANING[s.name] ?? ''), tex(s.formula), tex(`${s.rashiName} ${s.degreeInRashi.toFixed(1)}°`), tex(ordinal(s.houseInVarshaChart))]);
  return {
    tex: gridTable(cols('l.19', 'X', 'l.2', 'l.15', 'c.06'), ['Saham', 'Signifies', 'Formula', 'Position', 'House'], rows),
    evidenceIds: list.map((s) => `varsha.saham.${s.name.replace(/ Saham$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`),
    method: `Tajik Sahams (sensitive points) = Ascendant + A − B, with A and B reversed for a ${d.varsha.panchadhikari.isDayReturn ? 'night' : 'day'} return (this is a ${d.varsha.panchadhikari.isDayReturn ? 'day' : 'night'} return). Computed by the engine\'s SahamsCalculator. Mitra Saham is omitted because the engine\'s formula for it currently duplicates Yashas Saham.`,
  };
}

export function varshphalMudda(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const rows = d.mudda.map((p) => [
    `${p.order}`, `\\textbf{${tex(p.lord)}}`, tex(localDate(p.startIso, tz(ctx))), tex(localDate(p.endIso, tz(ctx))), `${p.days.toFixed(1)}`,
    p.part === 'balance' ? 'Balance at the start of the year' : p.part === 'closing' ? 'Remaining part, closes the year' : 'Full period',
  ]);
  return {
    tex: gridTable(cols('c.04', 'l.1', 'l.13', 'l.13', 'r.06', 'X'), ['\\#', 'Lord', 'From', 'To', 'Days', 'Note'], rows),
    evidenceIds: d.mudda.map((_, i) => `varsha.mudda.${pad2(i + 1)}`),
    method: 'Mudda dasha (Tajika Neelakanthi): first lord = remainder of (natal nakshatra number + completed years − 2) ÷ 9, counted Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury, Ketu, Venus. Each lord rules (Vimshottari years ÷ 120) of the actual year; the first period runs for the natal Moon\'s remaining share of its nakshatra and its elapsed share closes the year.',
  };
}

export function varshphalTransitSummary(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const rows = TRANSIT_PLANETS.map((planet) => {
    const ps = d.transits[planet];
    const first = ps[0];
    const sup = ps.filter((p) => p.gochara === 'favourable').reduce((a, p) => a + overlapFraction(p, d.yearStartIso, d.yearEndIso), 0);
    return [`\\textbf{${tex(planet)}}`, tex(first.sign), tex(ordinal(first.houseFromLagna)), tex(ordinal(first.houseFromMoon)), gocharaChip(first.gochara), `${Math.round(sup * 100)}\\%`, `${ps.length}`];
  });
  return {
    tex: gridTable(cols('l.1', 'l.13', 'c.08', 'c.08', 'l.12', 'c.14', 'c.09'), ['Planet', 'Sign at year start', 'From Asc', 'From Moon', 'At year start', 'Supportive share of year', 'Sign periods'], rows),
    evidenceIds: TRANSIT_PLANETS.map((p) => `varsha.transit.${p.toLowerCase()}.01`),
    method: `${GOCHARA_METHOD} "Supportive share" is the fraction of the year's days the planet spends in supportive houses from the Moon — a count, not a grade.`,
  };
}

export function varshphalTransitTable(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const rows = TRANSIT_PLANETS.flatMap((planet) => d.transits[planet].map((p) => transitRow(p, tz(ctx))));
  return {
    tex: longTable('p{0.1\\linewidth}p{0.29\\linewidth}p{0.15\\linewidth}p{0.09\\linewidth}p{0.09\\linewidth}p{0.13\\linewidth}', ['Planet', 'Period', 'Sign', 'From Asc', 'From Moon', 'Gochara'], rows),
    evidenceIds: TRANSIT_PLANETS.flatMap((planet) => d.transits[planet].map((_, i) => `varsha.transit.${planet.toLowerCase()}.${pad2(i + 1)}`)),
    method: `Sign ingresses solved by the engine's TransitIngressSolver for the whole Varsha year; (R) = re-entry while retrograde (Rahu and Ketu always move backwards). ${GOCHARA_METHOD}`,
  };
}

export function varshphalMonth(index: number): BlockRenderer {
  return (ctx) => {
    const d = data(ctx);
    const mf = d.months[index - 1];
    const n = pad2(index);
    const rows = TRANSIT_PLANETS.map((p) => {
      const t = mf.mid[p];
      return [`\\textbf{${tex(p)}}`, `${tex(t.sign)}${t.retrograde ? ' (R)' : ''}`, tex(ordinal(t.houseFromLagna)), tex(ordinal(t.houseFromMoon)), gocharaChip(t.gochara)];
    });
    const muddaText = mf.mudda.map((p) => `\\textbf{${tex(p.lord)}} (${tex(localDate(p.startIso, tz(ctx)))} -- ${tex(localDate(p.endIso, tz(ctx)))})`).join(', then ');
    const ingress = mf.ingresses.length
      ? mf.ingresses.map((t) => `${tex(localDate(t.startIso, tz(ctx)))}: ${tex(t.planet)} enters ${tex(t.sign)}${t.retrograde ? ' (R)' : ''}`).join('; ')
      : 'No planet changes sign this month.';
    const areaRows = LIFE_AREAS.map((a) => {
      const list = mf.areas[a.key];
      return [`\\textbf{${tex(a.label)}}`, tex(a.houses.map(ordinal).join(', ')), list.length ? tex(list.map((x) => `${x.planet} (${ordinal(x.house)})`).join(', ')) : '{\\color{Muted}none}'];
    });
    const header = `\\begin{asHighlight}\\CardTitle{Month ${index}: ${tex(localDate(mf.month.startIso, tz(ctx)))} to ${tex(localDate(mf.month.endIso, tz(ctx)))}}{\\fontsize{9.5}{13.5}\\selectfont Mudda dasha: ${muddaText}.\\\\ Sign changes: ${ingress}\\\\ Transits supportive from your Moon at mid-month: \\textbf{${mf.supportiveCount} of 8}. Practice planet for the month: \\textbf{${tex(mf.focus)}} (${tex(PLANET_ASSOC[mf.focus].weekday)}).\\par}\\end{asHighlight}`;
    return {
      tex: [
        header,
        '\\begin{minipage}[t]{0.49\\linewidth}\\vspace{0pt}',
        gridTable(cols('l.15', 'l.21', 'c.08', 'c.09', 'X'), ['Planet', 'Sign', 'Asc', 'Moon', 'Gochara'], rows, '\\linewidth', false),
        '\\end{minipage}\\hfill\\begin{minipage}[t]{0.49\\linewidth}\\vspace{0pt}',
        gridTable(cols('l.3', 'l.22', 'X'), ['Life area', 'Houses', 'Planets there'], areaRows, '\\linewidth', false),
        '\\end{minipage}\\par\\vspace{2mm}',
      ].join('\n'),
      evidenceIds: [`varsha.month.${n}.dates`, `varsha.month.${n}.mudda`, `varsha.month.${n}.ingresses`, `varsha.month.${n}.supportive-count`, `varsha.month.${n}.focus`,
        ...TRANSIT_PLANETS.map((p) => `varsha.month.${n}.transit.${p.toLowerCase()}`), ...LIFE_AREAS.map((a) => `varsha.month.${n}.area.${a.key}`)],
      method: `Month = Tajik Masa Pravesha (the Sun advancing a further 30° from its natal position). Positions at mid-month; houses counted from your natal Ascendant (Asc) and Moon. Life-area houses follow the classical bhava significations. "${mf.supportiveCount} of 8" is a plain count of planets in classically supportive houses from the Moon, not a rating. The practice planet is the Mudda lord running at mid-month.`,
    };
  };
}

export function varshphalObservances(ctx: BlockContext): BlockOutput {
  const d = data(ctx);
  const z = tz(ctx);
  const timed: Array<{ t: number; row: string[] }> = [];
  for (const e of d.lunar.filter((x) => x.kind === 'purnima')) {
    const note = e.masa === 'Chaitra' ? 'Chaitra Purnima, observed as Hanuman Jayanti in North India' : e.masa === 'Vaisakha' ? 'Vaishakha Purnima (Buddha Purnima)' : e.masa === 'Ashadha' ? 'Ashadha Purnima (Guru Purnima)' : e.masa === 'Kartika' ? 'Kartika Purnima' : '';
    timed.push({ t: Date.parse(e.iso), row: [tex(localDateTime(e.iso, z)), `${tex(e.masa)} Purnima`, tex(note)] });
  }
  const starts = d.lunar.filter((x) => x.kind === 'shukla-tritiya-start' && x.masa === 'Vaisakha');
  for (const s of starts) {
    const end = d.lunar.find((x) => x.kind === 'shukla-tritiya-end' && Date.parse(x.iso) > Date.parse(s.iso));
    timed.push({ t: Date.parse(s.iso), row: [tex(localDateTime(s.iso, z)), 'Vaishakha Shukla Tritiya', tex(`Akshaya Tritiya tithi, until ${end ? localDateTime(end.iso, z) : 'the next day'}`)] });
  }
  const rows = timed.sort((a, b) => a.t - b.t).map((x) => x.row);
  return {
    tex: gridTable(cols('l.27', 'l.27', 'X'), ['Begins (local time)', 'Lunar day', 'Observance'], rows),
    evidenceIds: ['varsha.observances.purnima'],
    method: 'Full moons are the instants the Moon is 180° from the Sun; Shukla Tritiya spans 24°–36°. The lunar month (amanta) is named from the Sun\'s sidereal sign at the preceding new moon. Festival calendars fix the civil day by the tithi at local sunrise, so a printed almanac may list the observance one day later.',
  };
}

export function varshphalRemedyNote(): BlockOutput {
  return {
    tex: '\\begin{asCaution}\\CardTitle{A note on practices}{\\fontsize{9.5}{13.5}\\selectfont The practices in this report are invitations, not obligations. They cost nothing, require no purchase and work through attention, discipline and kindness. Choose two or three that feel natural, keep them simple, and never let a practice replace medical, legal or financial advice from a qualified professional.\\par}\\end{asCaution}',
    evidenceIds: [],
  };
}
