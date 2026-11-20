/**
 * Finance Report evidence (namespace `finance.`). Every item is derived from
 * the snapshot through finance.calc.ts; labels state the value they carry so
 * that claims can be verified.
 */
import { AddEvidence, ordinal, PLANETS } from '../../evidence/evidence-registry';
import { formatDate } from '../../render/latex';
import { ChartSnapshot } from '../../snapshot/chart-snapshot';
import { classifyFunctionalNature, NATURE_LABEL } from '../_finance-couple-shared/functional-nature';
import { dayMonth } from '../_finance-couple-shared/gochara';
import {
  dashaSpans,
  dhanaYogas,
  FINANCE_YEARS,
  horaSplit,
  outlookWindow,
  planetWealthLink,
  savOfHouse,
  TransitRow,
  WEALTH_HOUSES,
  yearOutlook,
} from './finance.calc';

const SRC = 'report.finance';
const two = (n: number) => String(n).padStart(2, '0');
const PLANET_TITLE = (p: string) => (p === 'JUPITER' ? 'Jupiter' : 'Saturn');

function transitPhrase(rows: TransitRow[]): string {
  return rows
    .map((r) => `${r.period.sign}${r.period.enteredRetrograde ? ' (retrograde re-entry)' : ''} from ${dayMonth(r.period.clipStartIso)} to ${dayMonth(new Date(Date.parse(r.period.clipEndIso) - 1).toISOString())} (${ordinal(r.fromAsc)} from the Ascendant, ${ordinal(r.fromMoon)} from the Moon)`)
    .join('; ');
}

export function financeEvidence(add: AddEvidence, snap: ChartSnapshot): void {
  const asc = snap.natal.ascendant;

  // Functional nature by Lagna (replaces the reference's undefined gem power %).
  const fn = classifyFunctionalNature(asc.rashiIndex);
  for (const c of fn) {
    add(`finance.functional.${c.planet.toLowerCase()}`, 'functional-nature',
      `${c.planet} for ${asc.sign} Ascendant: ${NATURE_LABEL[c.nature]} (${c.reason.replace(/\.$/, '')})`, c.nature, `${SRC}.functionalNature`);
  }
  const yk = fn.filter((c) => c.nature === 'yogakaraka').map((c) => c.planet);
  add('finance.yogakaraka', 'functional-nature',
    yk.length ? `Yogakaraka for ${asc.sign} Ascendant: ${yk.join(', ')} (rules both a kendra and a trikona)` : `${asc.sign} Ascendant has no single Yogakaraka (no planet rules both a kendra and a trikona)`,
    yk, `${SRC}.functionalNature`);

  // Sarvashtakavarga of wealth houses.
  const savs = WEALTH_HOUSES.map((h) => savOfHouse(snap, h));
  const total = savs.reduce((a, b) => a + b, 0);
  add('finance.sav.wealth-total', 'ashtakavarga',
    `Sarvashtakavarga of the wealth houses: 2nd ${savs[0]}, 5th ${savs[1]}, 9th ${savs[2]}, 11th ${savs[3]} bindus (total ${total}; 28 per house is the classical average)`,
    total, `${SRC}.sav`);
  const s11 = savOfHouse(snap, 11);
  const s12 = savOfHouse(snap, 12);
  add('finance.sav.gain-vs-expense', 'ashtakavarga',
    `Sarvashtakavarga: 11th house (gains) ${s11} bindus, 12th house (expenditure) ${s12} bindus; ${s11 > s12 ? 'the 11th exceeds the 12th, which classically favours income over outgo' : 'the 12th equals or exceeds the 11th, which classically calls for conscious budgeting'}`,
    [String(s11), String(s12)], `${SRC}.sav`);

  // Engine-detected Dhana yogas only.
  const dy = dhanaYogas(snap);
  add('finance.dhana.count', 'yoga',
    dy.length ? `${dy.length} wealth yoga${dy.length > 1 ? 's' : ''} detected by the yoga engine: ${dy.map((y) => y.canonicalName).join(', ')}` : 'No Dhana or Lakshmi yoga was detected by the yoga engine for this chart',
    dy.length, `${SRC}.dhanaYogas`);

  // Hora (D2).
  const hora = horaSplit(snap);
  add('finance.d2.sun-hora', 'varga',
    hora.sun.length ? `In the Hora (D2) chart ${hora.sun.join(', ')} fall in the Sun's hora (Leo)` : 'In the Hora (D2) chart no planet falls in the Sun\'s hora (Leo)', hora.sun, `${SRC}.hora`);
  add('finance.d2.moon-hora', 'varga',
    hora.moon.length ? `In the Hora (D2) chart ${hora.moon.join(', ')} fall in the Moon's hora (Cancer)` : 'In the Hora (D2) chart no planet falls in the Moon\'s hora (Cancer)', hora.moon, `${SRC}.hora`);
  const lord2 = snap.natal.houses.find((h) => h.number === 2)!.lord;
  const lord2Name = fn.find((c) => c.planet.toUpperCase() === String(lord2).toUpperCase())!.planet;
  const lord2Hora = hora.sun.includes(lord2Name) ? "the Sun's hora (Leo)" : "the Moon's hora (Cancer)";
  add('finance.d2.lord2', 'varga', `The 2nd lord ${lord2Name} falls in ${lord2Hora} in the Hora (D2) chart`, lord2Hora.includes('Sun') ? 'Leo' : 'Cancer', `${SRC}.hora`);

  // Yearly outlook (5 calendar years).
  for (let n = 1; n <= FINANCE_YEARS; n++) {
    const y = yearOutlook(snap, n);
    add(`finance.year.${n}.year`, 'outlook-year', `Outlook year ${n} is the calendar year ${y.year}`, String(y.year), `${SRC}.yearOutlook`);
    for (const planet of ['JUPITER', 'SATURN'] as const) {
      const rows = y.transits.filter((t) => t.planet === planet);
      add(`finance.year.${n}.${planet.toLowerCase()}`, 'transit-summary',
        `In ${y.year} ${PLANET_TITLE(planet)} transits ${transitPhrase(rows)}`, [...new Set(rows.map((r) => r.period.sign))], 'transit.TransitIngressSolver');
      const gochara = rows.map((r) => `${r.period.sign} (${ordinal(r.fromMoon)} from the Moon): ${r.favourableFromMoon ? 'classically favourable' : 'not among the classically favourable houses'}`);
      add(`finance.year.${n}.${planet.toLowerCase()}-gochara`, 'gochara',
        `Classical gochara of ${PLANET_TITLE(planet)}'s transit in ${y.year}: ${gochara.join('; ')}`, [...new Set(rows.map((r) => r.period.sign))], `${SRC}.gochara`);
    }
    const contacts = y.transits
      .filter((t) => t.wealthOccupied.length || t.wealthAspected.length)
      .map((t) => `${PLANET_TITLE(t.planet)} in ${t.period.sign} ${[...t.wealthOccupied.map((h) => `occupies the ${ordinal(h)}`), ...t.wealthAspected.map((h) => `aspects the ${ordinal(h)}`)].join(' and ')}`);
    add(`finance.year.${n}.wealth-contacts`, 'transit-summary',
      contacts.length ? `Transit contacts with the wealth houses (2nd, 5th, 9th, 11th from the Ascendant) in ${y.year}: ${[...new Set(contacts)].join('; ')}` : `In ${y.year} neither Jupiter nor Saturn transits or aspects the 2nd, 5th, 9th or 11th house from the Ascendant`,
      [String(y.year)], `${SRC}.yearOutlook`);
    add(`finance.year.${n}.dasha`, 'dasha-period',
      `Vimshottari periods running in ${y.year}: ${y.dashas.map((d) => `${d.md}-${d.ad} (${formatDate(d.startIso)} to ${formatDate(d.endIso)})`).join(', ')}`,
      y.dashas.map((d) => d.ad), 'dasha.vimshottari');
  }

  // Dasha analysis: running and next Mahadasha, Antardashas in the outlook window.
  const now = Date.parse(snap.asOfIso);
  const mdIdx = snap.vimshottari.mahadashas.findIndex((md) => Date.parse(md.startDateIso) <= now && now < Date.parse(md.endDateIso));
  const describe = (planet: (typeof PLANETS)[number]) => {
    const l = planetWealthLink(snap, planet);
    const rules = l.rules.length ? `rules the ${l.rules.map(ordinal).join(' and ')}` : 'rules no sign';
    const links = [l.wealthLinks.length ? `wealth-house links (${l.wealthLinks.join(', ')})` : 'no direct wealth-house link', l.trikLinks.length ? `6/8/12 links (${l.trikLinks.join(', ')})` : ''].filter(Boolean).join('; ');
    return `${planet} sits in the ${ordinal(l.house)} house and ${rules}; ${NATURE_LABEL[l.functional.nature].toLowerCase()}; ${links}`;
  };
  const planetOf = (sym: string) => fn.find((c) => c.planet.toUpperCase() === String(sym).toUpperCase())!.planet;
  if (mdIdx >= 0) {
    const md = snap.vimshottari.mahadashas[mdIdx];
    const p = planetOf(md.lord);
    add('finance.md.current', 'dasha-finance', `Running Mahadasha ${p} (${formatDate(md.startDateIso)} to ${formatDate(md.endDateIso)}): ${describe(p)}`, p, `${SRC}.dasha`);
    const next = snap.vimshottari.mahadashas[mdIdx + 1];
    if (next) {
      const q = planetOf(next.lord);
      add('finance.md.next', 'dasha-finance', `Next Mahadasha ${q} (from ${formatDate(next.startDateIso)}): ${describe(q)}`, q, `${SRC}.dasha`);
    }
  }
  const win = outlookWindow(snap);
  dashaSpans(snap, win.startMs, win.endMs).forEach((d, i) => {
    add(`finance.ad.${two(i + 1)}`, 'dasha-finance',
      `${d.md}-${d.ad} Antardasha (${formatDate(d.startIso)} to ${formatDate(d.endIso)}): ${describe(d.ad)}`, d.ad, `${SRC}.dasha`);
  });
}
