/**
 * Varshphal evidence (`varsha.*`, `avakahada.*`). Labels describe annual-chart
 * houses as "the year's Nth house" so they can never be confused with natal
 * placements, and transit facts always carry the word "transit".
 */
import { AddEvidence, ordinal, PlanetName, PLANETS } from '../../evidence/evidence-registry';
import { addAvakahadaEvidence } from '../_annual-shared/avakahada';
import { isoDate, pad2, PLANET_ASSOC, SYMBOL, TRANSIT_PLANETS } from '../_annual-shared/astro';
import { localDate, localDateTime } from '../_annual-shared/tables';
import { LIFE_AREAS, pn, VarshaYearData } from './calc/varsha-year';

const SRC = 'varshaphala.VarshaphalaCalculator';
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ROLE_SLUG: Record<string, string> = {
  VARSHA_LAGNESHA: 'varsha-lagnesha', JANMESHA: 'janmesha', MUNTHESHA: 'munthesha', TRIRASHISHA: 'trirashisha', DINA_RATRI_PATI: 'dina-ratri-pati',
};
/** Sahams shown: the engine's Mitra Saham formula duplicates Yashas Saham, so it is omitted (decision VAR-006). */
export const SHOWN_SAHAMS = (d: VarshaYearData) => d.varsha.sahams.filter((s) => s.name !== 'Mitra Saham');

export const SAHAM_MEANING: Record<string, string> = {
  'Punya Saham': 'merit and good fortune',
  'Vidya Saham': 'learning and knowledge',
  'Yashas Saham': 'reputation and recognition',
  'Mahatmya Saham': 'standing and dignity',
  'Karma Saham': 'work and action',
  'Roga Saham': 'health sensitivity',
  'Karya Siddhi Saham': 'accomplishment of work',
  'Asha Saham': 'hopes and wishes',
  'Preeti Saham': 'affection and love',
};

export function addVarshaphalEvidence(add: AddEvidence, d: VarshaYearData, timezone: string): void {
  const v = d.varsha;
  const sr = v.solarReturn;
  addAvakahadaEvidence(add, d.avakahada);

  add('varsha.return.date', 'varsha', `This year's solar return (Varsha Pravesha) falls on ${localDateTime(sr.solarReturnUtcIso, timezone)} local time, when the Sun returns to its natal position`, localDate(sr.solarReturnUtcIso, timezone), SRC);
  add('varsha.year.end', 'varsha', `This Varsha year runs until the next solar return on ${localDate(d.yearEndIso, timezone)}`, localDate(d.yearEndIso, timezone), SRC);
  add('varsha.age', 'varsha', `Completed years at this solar return: ${sr.age} (the year now running is year ${sr.age + 1} of life)`, sr.age, SRC);
  add('varsha.day-night', 'varsha', `This is a ${v.panchadhikari.isDayReturn ? 'day' : 'night'}-time solar return (the Sun is ${v.panchadhikari.isDayReturn ? 'above' : 'below'} the horizon)`, v.panchadhikari.isDayReturn ? 'day' : 'night', SRC);

  const lagnaSign = signEn(v.varshaLagna.rashiIndex);
  add('varsha.lagna.sign', 'varsha', `The annual (Varsha) Ascendant is ${lagnaSign}`, lagnaSign, SRC);
  add('varsha.lagna.lord', 'varsha', `The annual Ascendant lord is ${pn(v.varshaLagna.lord)}`, pn(v.varshaLagna.lord), SRC);
  const fromNatal = ((v.varshaLagna.rashiIndex - d.natalLagnaSign + 12) % 12) + 1;
  add('varsha.lagna.from-natal', 'varsha', `The annual Ascendant ${lagnaSign} is the ${ordinal(fromNatal)} sign counted from the natal Ascendant`, fromNatal, SRC);

  for (const name of PLANETS) {
    const p = v.planets[SYMBOL[name]];
    if (!p) continue;
    const k = name.toLowerCase();
    add(`varsha.planet.${k}.sign`, 'varsha-planet', `Annual chart: ${name}'s sign is ${signEn(p.rashiIndex)} (${p.degreeInRashi.toFixed(1)}°)${p.isRetrograde && name !== 'Rahu' && name !== 'Ketu' ? ', retrograde' : ''}`, signEn(p.rashiIndex), SRC);
    add(`varsha.planet.${k}.house`, 'varsha-planet', `Annual chart: ${name} falls in the year's ${ordinal(p.house)} house`, p.house, SRC);
    const h = v.harshaBala[SYMBOL[name]];
    if (h && name !== 'Rahu' && name !== 'Ketu') add(`varsha.harsha.${k}`, 'varsha-strength', `Harsha Bala (Tajik four-fold joy strength) of ${name}: ${h.totalScore} of 20`, h.totalScore, 'varshaphala.HarshaBalaCalculator');
  }

  // Panchadhikari (five office-bearers) and the Year Lord.
  for (const c of v.panchadhikari.candidates) {
    if (c.isIndeterminate || !c.planet) continue;
    const planet = pn(c.planet);
    add(`varsha.office.${ROLE_SLUG[c.role]}`, 'varsha-office',
      `Office-bearer (${c.roleTitle}): ${planet}, falling in the year's ${ordinal(c.houseInVarshaChart)} house; ${c.aspectsVarshaLagna ? 'it has a Tajik aspect on the annual Ascendant' : 'it has no Tajik aspect on the annual Ascendant'}`,
      planet, 'varshaphala.PanchadhikariCalculator');
  }
  const lord = pn(v.varshesha.selectedVarshesha);
  add('varsha.lord', 'varsha-lord', `The Year Lord (Varshesha) is ${lord}`, lord, 'varshaphala.PanchadhikariCalculator');
  add('varsha.lord.house', 'varsha-lord', `The Year Lord ${lord} falls in the year's ${ordinal(v.planets[SYMBOL[lord]].house)} house`, v.planets[SYMBOL[lord]].house, 'varshaphala.PanchadhikariCalculator');
  add('varsha.lord.natal-lordship', 'varsha-lord', `In the birth chart the Year Lord ${lord} rules: ${lordshipText(d, lord)}`, lord, 'chart.normalizeAstroChart');

  // Muntha.
  const m = v.muntha;
  add('varsha.muntha.sign', 'muntha', `Muntha (the year's progressed point) is in ${signEn(m.rashiIndex)}`, signEn(m.rashiIndex), 'varshaphala.MunthaCalculator');
  add('varsha.muntha.house', 'muntha', `Muntha falls in the year's ${ordinal(m.houseInVarshaChart)} house of the annual chart`, m.houseInVarshaChart, 'varshaphala.MunthaCalculator');
  add('varsha.muntha.natal-house', 'muntha', `Counted from the natal Ascendant, Muntha is the ${ordinal(m.houseInNatalChart)} sign`, m.houseInNatalChart, 'varshaphala.MunthaCalculator');
  const ml = pn(m.lord);
  add('varsha.muntha.lord', 'muntha', `The Muntha lord is ${ml}, falling in the year's ${ordinal(v.planets[SYMBOL[ml]].house)} house`, ml, 'varshaphala.MunthaCalculator');

  // Tajik yogas.
  add('varsha.tajik.count', 'tajik', v.tajikaYogas.length ? `${v.tajikaYogas.length} Tajik yogas are formed in the annual chart` : 'No Tajik yoga is formed in the annual chart', v.tajikaYogas.length, 'varshaphala.TajikaYogasCalculator');
  v.tajikaYogas.forEach((y, i) => {
    const kind = y.type.charAt(0) + y.type.slice(1).toLowerCase();
    const via = y.intermediaryPlanet ? ` through ${pn(y.intermediaryPlanet)}` : '';
    add(`varsha.tajik.${pad2(i + 1)}`, 'tajik', `Tajik ${kind} yoga between ${pn(y.planet1)} and ${pn(y.planet2)}${via} (${y.actualDistanceDegrees.toFixed(1)}° apart, orb ${y.orbDegrees.toFixed(1)}°, ${y.isApplying ? 'applying' : 'separating'})`, [kind, pn(y.planet1), pn(y.planet2)], 'varshaphala.TajikaYogasCalculator');
  });

  // Sahams.
  for (const s of SHOWN_SAHAMS(d)) {
    add(`varsha.saham.${slug(s.name.replace(/ Saham$/, ''))}`, 'saham', `${s.name} (point of ${SAHAM_MEANING[s.name] ?? 'significance'}) falls in ${s.rashiName}, the year's ${ordinal(s.houseInVarshaChart)} house`, [s.rashiName, ordinal(s.houseInVarshaChart)], 'varshaphala.SahamsCalculator');
  }

  // Mudda dasha.
  d.mudda.forEach((p, i) => {
    add(`varsha.mudda.${pad2(i + 1)}`, 'mudda', `Mudda dasha period ${i + 1}: ${p.lord} from ${localDate(p.startIso, timezone)} to ${localDate(p.endIso, timezone)} (${Math.round(p.days)} days)`, [p.lord, isoDate(p.startIso), isoDate(p.endIso)], 'report.varshphal.mudda');
  });

  // Year transits.
  for (const planet of TRANSIT_PLANETS) {
    d.transits[planet].forEach((t, i) => {
      add(`varsha.transit.${planet.toLowerCase()}.${pad2(i + 1)}`, 'transit-period',
        `${planet} transits ${t.sign} from ${localDate(t.startIso, timezone)} to ${localDate(t.endIso, timezone)}${t.retrograde ? ' (retrograde re-entry)' : ''}: the ${ordinal(t.houseFromLagna)} house from the Ascendant and the ${ordinal(t.houseFromMoon)} from the Moon (classically ${t.gochara === 'favourable' ? 'supportive' : 'demanding'} from the Moon)`,
        [t.sign, ordinal(t.houseFromLagna), ordinal(t.houseFromMoon)], 'transit.TransitIngressSolver');
    });
  }

  // Months.
  for (const mf of d.months) {
    const n = pad2(mf.month.index);
    const label = `month ${mf.month.index}`;
    add(`varsha.month.${n}.dates`, 'varsha-month', `Varsha ${label} (Masa Pravesha) runs from ${localDate(mf.month.startIso, timezone)} to ${localDate(mf.month.endIso, timezone)}`, [localDate(mf.month.startIso, timezone), localDate(mf.month.endIso, timezone)], 'report.varshphal.masa');
    add(`varsha.month.${n}.mudda`, 'varsha-month', `Mudda dasha during ${label}: ${mf.mudda.map((p) => `${p.lord} (${localDate(p.startIso, timezone)} to ${localDate(p.endIso, timezone)})`).join(', then ')}`, mf.mudda.map((p) => p.lord), 'report.varshphal.mudda');
    add(`varsha.month.${n}.focus`, 'varsha-month', `The Mudda dasha lord at the middle of ${label} is ${mf.focus} (traditional weekday ${PLANET_ASSOC[mf.focus].weekday})`, mf.focus, 'report.varshphal.mudda');
    for (const planet of TRANSIT_PLANETS) {
      const t = mf.mid[planet];
      add(`varsha.month.${n}.transit.${planet.toLowerCase()}`, 'transit-position',
        `Mid-${label} transit: ${planet} through ${t.sign}, the ${ordinal(t.houseFromLagna)} house from the Ascendant and the ${ordinal(t.houseFromMoon)} from the Moon (classically ${t.gochara === 'favourable' ? 'supportive' : 'demanding'})`,
        [t.sign, ordinal(t.houseFromLagna)], 'transit.TransitIngressSolver');
    }
    add(`varsha.month.${n}.ingresses`, 'varsha-month',
      mf.ingresses.length ? `Transit sign changes during ${label}: ${mf.ingresses.map((t) => `${t.planet} enters ${t.sign} on ${localDate(t.startIso, timezone)}${t.retrograde ? ' (retrograde)' : ''}`).join('; ')}` : `No transiting planet changes sign during ${label}`,
      mf.ingresses.map((t) => `${t.planet} enters ${t.sign}`), 'transit.TransitIngressSolver');
    add(`varsha.month.${n}.supportive-count`, 'varsha-month', `At mid-${label}, ${mf.supportiveCount} of 8 transiting planets are in classically supportive houses from the Moon`, mf.supportiveCount, 'report.annual.gochara');
    for (const a of LIFE_AREAS) {
      const list = mf.areas[a.key];
      add(`varsha.month.${n}.area.${a.key}`, 'varsha-month',
        list.length
          ? `Mid-${label} transit through the ${a.label.toLowerCase()} houses (${a.houses.map(ordinal).join(', ')} from the Ascendant): ${list.map((x) => `${x.planet} (${ordinal(x.house)})`).join(', ')}`
          : `At mid-${label} no transiting planet is in the ${a.label.toLowerCase()} houses (${a.houses.map(ordinal).join(', ')} from the Ascendant)`,
        list.map((x) => x.planet), 'report.varshphal.areas');
    }
  }

  // Observances.
  const purnimas = d.lunar.filter((e) => e.kind === 'purnima');
  add('varsha.observances.purnima', 'lunar', `Full moons (Purnima) of this Varsha year fall on: ${purnimas.map((e) => `${localDate(e.iso, timezone)} (${e.masa})`).join(', ')}`, purnimas.map((e) => localDate(e.iso, timezone)), 'report.varshphal.lunar');
}

function signEn(i: number): string {
  return ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][i - 1];
}
export { signEn };

function lordshipText(d: VarshaYearData, lord: PlanetName): string {
  const houses: number[] = [];
  for (let h = 1; h <= 12; h++) {
    const sign = ((d.natalLagnaSign - 1 + h - 1) % 12) + 1;
    if (['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'][sign - 1] === lord) houses.push(h);
  }
  return houses.length ? `the ${houses.map(ordinal).join(' and ')} house${houses.length > 1 ? 's' : ''}` : 'no house (a shadow planet)';
}
