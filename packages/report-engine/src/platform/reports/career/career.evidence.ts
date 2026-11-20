/**
 * Career evidence contributor. Every ID is namespaced `career.` and derived from
 * the snapshot plus the deterministic `extend` output (calc/career-calc.ts).
 *
 * Label rules (they are what the LLM may quote, and what the claim validator
 * checks): every label states its value verbatim, and positions counted from
 * anything other than the Ascendant never use the phrase "in the Nth house".
 */
import { AddEvidence, ordinal, planetName } from '../../evidence/evidence-registry';
import { businessDateIso, ChartSnapshot, formatBusinessDate } from '../../snapshot/chart-snapshot';
import { CAREER_HOUSES, CareerExt, compare, durationText, EARNINGS_WINDOW, earningsWindowDashas, SAV_BENCHMARK, signQuality } from './calc/career-calc';

const SRC = 'report.career.calc';
/** Evidence values: the IST calendar date (YYYY-MM-DD); labels use the human IST date (audit F24). */
const date = (iso: string) => businessDateIso(iso);
const day = (iso: string) => formatBusinessDate(iso);
const an = (w: string) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);
const list = (xs: string[], none: string) => (xs.length ? xs.join(', ') : none);

export function contributeCareerEvidence(add: AddEvidence, snapshot: ChartSnapshot, c: CareerExt): void {
  // --- D1 house aspects (all 12 houses) --------------------------------------
  for (let h = 1; h <= 12; h++) {
    const a = c.aspects[h];
    add(`career.house.${h}.aspected-by`, 'house-aspect',
      a.length
        ? `The ${ordinal(h)} house receives graha drishti from ${a.map((x) => `${x.planet} (${ordinal(x.aspect)} aspect)`).join(', ')}`
        : `The ${ordinal(h)} house receives no planetary aspect`,
      a.map((x) => x.planet), `${SRC}.houseAspects (engine getAspectedHouses)`);
  }

  // --- Ashtakavarga benchmark and comparisons ----------------------------------
  for (const h of CAREER_HOUSES) {
    const v = c.sav[h];
    const rel = v > SAV_BENCHMARK ? 'above' : v === SAV_BENCHMARK ? 'equal to' : 'below';
    add(`career.sav.house.${h}.benchmark`, 'ashtakavarga',
      `The ${ordinal(h)} house has ${v} Sarvashtakavarga bindus, ${rel} the classical benchmark of ${SAV_BENCHMARK}`, v, 'ashtakavarga.sav');
  }
  const s6 = c.sav[6], s7 = c.sav[7], s10 = c.sav[10], s11 = c.sav[11];
  add('career.sav.service-vs-partnership', 'ashtakavarga-comparison',
    `Sarvashtakavarga: the 6th house (service) has ${s6} bindus and the 7th house (partnership, trade) has ${s7}; the 6th is ${compare(s6, s7)}${compare(s6, s7) === 'equal' ? ' to the 7th' : ' than the 7th'}`,
    [String(s6), String(s7)], 'ashtakavarga.sav');
  add('career.sav.effort-vs-gain', 'ashtakavarga-comparison',
    `Sarvashtakavarga: the 10th house (action) has ${s10} bindus and the 11th house (gains) has ${s11}; the 11th is ${compare(s11, s10)}${compare(s11, s10) === 'equal' ? ' to the 10th' : ' than the 10th'}`,
    [String(s10), String(s11)], 'ashtakavarga.sav');

  // --- D10 -------------------------------------------------------------------
  const d10 = c.d10;
  for (const h of d10.houses) {
    const b = `career.d10.house.${h.house}`;
    add(`${b}.sign`, 'd10-house', `In the D10 chart the ${ordinal(h.house)} house is ${h.sign}`, h.sign, 'varga.D10');
    add(`${b}.lord`, 'd10-house', `In the D10 chart the ${ordinal(h.house)} house lord is ${h.lord}`, h.lord, 'varga.D10');
    add(`${b}.lord-house`, 'd10-house',
      `In the D10 chart the ${ordinal(h.house)} lord ${h.lord} sits in D10 house ${h.lordHouse} (${h.lordSign})`, h.lordHouse, 'varga.D10');
    add(`${b}.occupants`, 'd10-house',
      h.occupants.length ? `In the D10 chart the ${ordinal(h.house)} house holds ${h.occupants.join(', ')}` : `In the D10 chart the ${ordinal(h.house)} house is unoccupied`,
      h.occupants, 'varga.D10');
  }
  for (const p of ['Sun', 'Saturn', 'Rahu', 'Moon', 'Mercury', 'Jupiter', 'Venus', 'Mars', 'Ketu'] as const) {
    const d = d10.planets[p];
    add(`career.d10.${p.toLowerCase()}.dignity`, 'd10-dignity', `In the D10 chart ${p} is in ${d.sign}: ${d.dignity}`, d.dignity, 'planets.dignity (sign-based)');
  }
  const ascQ = signQuality(d10.ascSign);
  add('career.d10.asc.quality', 'd10-ascendant', `The D10 ascendant ${d10.ascSign} is ${an(ascQ.element)}, ${ascQ.modality} sign`, [ascQ.element, ascQ.modality], 'zodiac.RASHIS');

  // --- BNN Saturn --------------------------------------------------------------
  const bnn = c.bnn;
  add('career.bnn.saturn.sign', 'bnn', `BNN karma karaka Saturn is in ${bnn.saturnSign}${bnn.retrograde ? ' (retrograde)' : ''}`, bnn.saturnSign, `${SRC}.bnnSaturn`);
  add('career.bnn.conjunct', 'bnn', `Planets sharing Saturn's sign: ${list(bnn.conjunct, 'none')}`, bnn.conjunct, `${SRC}.bnnSaturn`);
  add('career.bnn.trine', 'bnn',
    `Planets in the 5th and 9th signs from Saturn (trines): 5th sign ${list(bnn.trine5, 'none')}; 9th sign ${list(bnn.trine9, 'none')}`,
    [...bnn.trine5, ...bnn.trine9], `${SRC}.bnnSaturn`);
  add('career.bnn.second', 'bnn', `Planets in the 2nd sign from Saturn (the sign ahead): ${list(bnn.second, 'none')}`, bnn.second, `${SRC}.bnnSaturn`);
  add('career.bnn.twelfth', 'bnn', `Planets in the 12th sign from Saturn (the sign behind): ${list(bnn.twelfth, 'none')}`, bnn.twelfth, `${SRC}.bnnSaturn`);
  add('career.bnn.aspects', 'bnn',
    `Saturn's 3rd, 7th and 10th aspects fall on ${bnn.aspects.map((a) => `${a.sign}${a.planets.length ? ` (${a.planets.join(', ')})` : ''}`).join(', ')}`,
    bnn.aspects.map((a) => a.sign), `${SRC}.bnnSaturn`);

  // --- Karmajiva and vocational signature ----------------------------------
  for (const k of c.karmajiva) {
    add(`career.karmajiva.${k.from.toLowerCase()}`, 'karmajiva',
      `Karmajiva from the ${k.from}: the 10th sign is ${k.tenthSign}, its lord ${k.tenthLord} occupies ${k.lordNavamsaSign} in the Navamsa, so the livelihood planet is ${k.karmajivaPlanet}`,
      k.karmajivaPlanet, `${SRC}.karmajiva (Brihat Jataka ch. 10)`);
  }
  const tenthLordName = planetName(snapshot.natal.houses.find((h) => h.number === 10)!.lord);
  const tenthLord = snapshot.natal.planets.find((p) => planetName(p.name) === tenthLordName)!;
  const q10 = signQuality(tenthLord.sign);
  add('career.vocation.lord10.quality', 'vocation',
    `The 10th lord occupies ${tenthLord.sign}, ${an(q10.element)}, ${q10.modality} sign`, [q10.element, q10.modality], 'zodiac.RASHIS');
  const h10 = snapshot.natal.houses.find((h) => h.number === 10)!;
  const qh = signQuality(h10.sign);
  add('career.vocation.house10.quality', 'vocation', `The 10th house sign ${h10.sign} is ${an(qh.element)}, ${qh.modality} sign`, [qh.element, qh.modality], 'zodiac.RASHIS');

  // --- Sun / Saturn frames and government facts --------------------------------
  for (const f of [c.sun, c.saturn]) {
    const k = f.planet.toLowerCase();
    add(`career.${k}.from-moon`, 'reference-count', `Counted from the Moon's sign, ${f.planet === 'Sun' ? 'the Sun' : 'Saturn'} falls ${ordinal(f.fromMoon)}`, f.fromMoon, SRC);
    add(`career.${k}.from-tenth`, 'reference-count', `Counted from the 10th house (bhavat bhavam), ${f.planet === 'Sun' ? 'the Sun' : 'Saturn'} falls ${ordinal(f.fromTenth)}`, f.fromTenth, SRC);
  }
  add('career.gov.sun-saturn', 'government',
    c.sunSaturn.links.length ? `Sun and Saturn are linked: ${c.sunSaturn.links.join('; ')}` : 'Sun and Saturn have no conjunction and no aspect between them',
    c.sunSaturn.links, `${SRC}.sunSaturnRelation`);
  add('career.gov.sun-tenth', 'government',
    c.sunTenth.length ? `Sun and the 10th house: ${c.sunTenth.join('; ')}` : 'The Sun has no direct link (lordship, occupation or aspect) with the 10th house',
    c.sunTenth, `${SRC}.sunAndTenth`);

  // --- Yogas -------------------------------------------------------------------
  add('career.yogas.relevant', 'yoga-summary',
    c.yogas.length ? `Career-relevant yogas detected by the engine: ${c.yogas.map((y) => y.name).join(', ')}` : 'The engine detected no career-relevant yoga (none of the raja, dhana, mahapurusha, solar or related combinations)',
    c.yogas.map((y) => y.name), 'yoga.evaluateYogas');

  // --- Dasha ------------------------------------------------------------------
  c.dashas.forEach((d, i) => {
    add(`career.dasha.md.${String(i + 1).padStart(2, '0')}.links`, 'dasha-career',
      `${d.lord} Mahadasha ${day(d.startIso)} to ${day(d.endIso)}: career links ${list(d.careerLinks, 'none')}`,
      [d.lord, ...d.careerLinks], `${SRC}.dashaTimeline`);
  });
  const ci = c.dashas.findIndex((d) => d.active);
  if (ci >= 0 && ci + 1 < c.dashas.length) {
    const n = c.dashas[ci + 1];
    add('career.dasha.next.md', 'dasha', `Next Mahadasha: ${n.lord} from ${day(n.startIso)} to ${day(n.endIso)}`, n.lord, 'dasha.vimshottari');
  }
  // Earning-years window (product default, see EARNINGS_WINDOW): only these Mahadashas may be
  // offered as earnings seasons by the first-earnings topic (audit F1).
  for (const d of earningsWindowDashas(snapshot)) {
    add(`career.window.earnings.md.${String(d.index + 1).padStart(2, '0')}`, 'dasha-window',
      `${d.lord} Mahadasha ${day(d.startIso)} to ${day(d.endIso)} (age ${d.ageAtStart} to ${d.ageAtEnd}) falls within the working-age window used for earnings timing (starts by age ${EARNINGS_WINDOW.maxStartAge}, ends after age ${EARNINGS_WINDOW.minEndAge})`,
      [d.lord, date(d.startIso), date(d.endIso)], `${SRC}.earningsWindowDashas`);
  }
  c.antardashas.forEach((a, i) => {
    add(`career.dasha.ad.${String(i + 1).padStart(2, '0')}`, 'dasha-period',
      `Antardasha of ${a.lord} within the current Mahadasha: ${day(a.startIso)} to ${day(a.endIso)}`, [a.lord, date(a.startIso), date(a.endIso)], 'dasha.vimshottari');
  });

  // --- Transits (true ingress dates) --------------------------------------------
  for (const t of c.transits) {
    const k = t.planet.toLowerCase();
    const p = t.current;
    add(`career.transit.${k}.current`, 'transit-current',
      `${t.planet} transits ${p.sign} from ${day(p.startIso)} to ${day(p.endIso)} (${durationText(p.startIso, p.endIso)}): the ${ordinal(p.fromAsc)} from the Ascendant and the ${ordinal(p.fromMoon)} from the Moon`,
      [p.sign, date(p.startIso), date(p.endIso), String(p.fromAsc)], 'transit.TransitIngressSolver');
    t.upcoming.forEach((u, i) => {
      add(`career.transit.${k}.next.${String(i + 1).padStart(2, '0')}`, 'transit-upcoming',
        `${t.planet} will transit ${u.sign} from ${day(u.startIso)} to ${day(u.endIso)}${u.retrogradeEntry && k !== 'rahu' && k !== 'ketu' ? ' (retrograde re-entry)' : ''}: the ${ordinal(u.fromAsc)} from the Ascendant and the ${ordinal(u.fromMoon)} from the Moon`,
        [u.sign, date(u.startIso), date(u.endIso), String(u.fromAsc)], 'transit.TransitIngressSolver');
    });
  }
}
