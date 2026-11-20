/**
 * Kundli evidence contributor. Every ID is namespaced `kundli.` and derived
 * only from the snapshot and the deterministic `extend` output. Labels state
 * their value literally so narrative claims can be verified against them.
 */
import { AddEvidence, EvidenceRegistry, ordinal, planetName, PlanetName } from '../../evidence/evidence-registry';
import { computeNumerology } from '../../evidence/numerology';
import { ExtendContext } from '../../module';
import { kundliExt } from './extend';
import { planetsAspectedBy } from './calc/patterns';

const KARAKA_FULL: Record<string, string> = {
  AK: 'Atmakaraka', AMK: 'Amatyakaraka', BK: 'Bhratrikaraka', MK: 'Matrikaraka',
  PK: 'Putrakaraka', GK: 'Gnatikaraka', DK: 'Darakaraka', PIK: 'Pitrikaraka',
};

/** Ruling planet of a Mulank/Bhagyank (standard Indian numerology, D-003). */
export const NUMBER_RULER: Record<number, PlanetName> = {
  1: 'Sun', 2: 'Moon', 3: 'Jupiter', 4: 'Rahu', 5: 'Mercury', 6: 'Venus', 7: 'Ketu', 8: 'Saturn', 9: 'Mars',
};

export const SAV_AVERAGE = 28;

const iso = (s: string) => s.slice(0, 10);
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const pad2 = (n: number) => String(n).padStart(2, '0');
const YEAR_MS = 365.2425 * 86400000;

export function contributeKundliEvidence(
  add: AddEvidence,
  ctx: ExtendContext & { ext: Record<string, unknown>; registry: EvidenceRegistry }
): void {
  const { snapshot } = ctx;
  const { natal } = snapshot;
  const k = kundliExt(ctx);
  const src = (s: string) => `kundli.${s}`;
  const byName = (n: string) => natal.planets.find((p) => planetName(p.name) === n)!;

  // --- Panchang at birth (Vedic day convention) ---------------------------
  const vd = k.vedicDay;
  add('kundli.vara', 'panchang', `Vedic weekday of birth (sunrise to sunrise) is ${vd.varaWeekday} (${vd.varaName}), ruled by ${planetName(vd.varaLord)}`, vd.varaWeekday, src('calc.vedic-day'));
  add('kundli.vara.lord', 'panchang', `The weekday lord at birth is ${planetName(vd.varaLord)}`, planetName(vd.varaLord), src('calc.vedic-day'));
  const t = k.panchangBirth.tithi;
  const paksha = t.paksha === 'SUKLA' ? 'Shukla' : 'Krishna';
  add('kundli.tithi', 'panchang', `Tithi at birth is ${paksha} ${t.name} (tithi ${t.index} of 30)`, `${paksha} ${t.name}`, 'panchang.calculatePanchang');
  add('kundli.paksha', 'panchang', `Birth falls in the ${paksha} paksha (${paksha === 'Shukla' ? 'waxing' : 'waning'} Moon)`, paksha, 'panchang.calculatePanchang');
  add('kundli.nitya-yoga', 'panchang', `The panchang yoga at birth is ${k.panchangBirth.yoga.name}`, k.panchangBirth.yoga.name, 'panchang.calculatePanchang');
  add('kundli.karana', 'panchang', `The karana at birth is ${k.panchangBirth.karana.name}`, k.panchangBirth.karana.name, 'panchang.calculatePanchang');
  const masa = k.panchangBirth.hinduCalendar?.amantaMasa;
  if (masa) add('kundli.masa', 'panchang', `The lunar month (amanta) at birth is ${masa}`, masa, 'panchang.hinduCalendar');
  add('kundli.ritu', 'panchang', `The season (ritu) at birth is ${k.ritu}`, k.ritu, src('calc.vedic-day'));

  // --- Avakahada ------------------------------------------------------------
  const av = k.avakhada;
  add('kundli.avakahada.gana', 'avakahada', `Gana (temperament class) is ${av.gana}`, av.gana, 'panchang.AvakhadaChakraCalculator');
  add('kundli.avakahada.yoni', 'avakahada', `Yoni (animal symbol) is ${av.yoni} (${av.yoniGender.toLowerCase()})`, av.yoni, 'panchang.AvakhadaChakraCalculator');
  add('kundli.avakahada.nadi', 'avakahada', `Nadi is ${av.nadi}`, av.nadi, 'panchang.AvakhadaChakraCalculator');
  add('kundli.avakahada.varna', 'avakahada', `Varna (Moon-sign class) is ${av.varna}`, av.varna, 'panchang.AvakhadaChakraCalculator');
  add('kundli.avakahada.vashya', 'avakahada', `Vashya is ${av.vashya}`, av.vashya, 'panchang.AvakhadaChakraCalculator');
  add('kundli.avakahada.tatwa', 'avakahada', `The Moon sign's element (tatwa) is ${av.tatwa}`, av.tatwa, 'panchang.AvakhadaChakraCalculator');
  add('kundli.avakahada.namakshara', 'avakahada', `The traditional name syllable (namakshara) is ${av.namakshara}`, av.namakshara, 'panchang.AvakhadaChakraCalculator');
  const moon = byName('Moon');
  add('kundli.moon.pada', 'nakshatra', `The Moon is in pada ${moon.pada} of ${moon.nakshatra}`, moon.pada, 'chart.normalizeAstroChart');
  add('kundli.asc.pada', 'nakshatra', `The Ascendant is in pada ${natal.ascendant.pada} of ${natal.ascendant.nakshatra}`, natal.ascendant.pada, 'chart.normalizeAstroChart');

  // --- Planet aspects -------------------------------------------------------
  for (const p of natal.planets) {
    const n = planetName(p.name);
    const low = n.toLowerCase();
    const houses = (p.aspectsCast ?? []).slice().sort((a, b) => a - b);
    add(`kundli.planet.${low}.aspects-houses`, 'planet-aspect',
      houses.length ? `${n} casts graha drishti on the ${list(houses.map(ordinal))} houses` : `${n} casts no graha drishti`,
      houses.map(String), 'planets.aspects');
    const targets = planetsAspectedBy(natal, p.name);
    add(`kundli.planet.${low}.aspects-planets`, 'planet-aspect',
      targets.length ? `${n} aspects ${list(targets)}` : `${n} aspects no planet (none occupy the houses it aspects)`,
      targets, 'planets.aspects');
  }

  // --- Houses ----------------------------------------------------------------
  for (const h of natal.houses) {
    const lord = planetName(h.lord);
    const lp = byName(lord);
    const asp = k.houseAspects[h.number] ?? [];
    add(`kundli.house.${h.number}.aspected-by`, 'house-aspect',
      asp.length ? `The ${ordinal(h.number)} house receives graha drishti from ${list(asp)}` : `The ${ordinal(h.number)} house receives no planetary aspect`,
      asp, 'planets.aspects');
    add(`kundli.house.${h.number}.lord-sign`, 'house-lord-placement', `The ${ordinal(h.number)} lord ${lord} is in ${lp.sign}`, lp.sign, 'houses.wholeSign');
    add(`kundli.house.${h.number}.lord-dignity`, 'house-lord-placement',
      `The ${ordinal(h.number)} lord ${lord} has ${String(lp.dignity).toLowerCase().replace(/_/g, ' ')} dignity`, lp.dignity, 'planets.calculatePlanetaryDignity');
  }

  // --- Conjunctions ----------------------------------------------------------
  add('kundli.conjunctions.count', 'conjunction', `The chart has ${k.conjunctions.length} conjunction group${k.conjunctions.length === 1 ? '' : 's'} (planets sharing a sign)`, k.conjunctions.length, src('calc.patterns'));
  k.conjunctions.forEach((g, i) => {
    add(`kundli.conjunction.${pad2(i + 1)}`, 'conjunction',
      `Conjunction in the ${ordinal(g.house)} house (${g.sign}): ${g.planets.map((m) => `${m.name} ${m.degree.toFixed(1)}°`).join(', ')}; closest pair ${g.closest.a}-${g.closest.b}, ${g.closest.orb.toFixed(1)}° apart`,
      g.planets.map((m) => m.name), src('calc.patterns'));
  });

  // --- Chara karakas -----------------------------------------------------------
  for (const p of natal.planets) {
    if (!p.charaKaraka) continue;
    const code = p.charaKaraka.toUpperCase();
    const n = planetName(p.name);
    add(`kundli.karaka.${code.toLowerCase()}.placement`, 'chara-karaka',
      `The ${KARAKA_FULL[code] ?? code} ${n} is in the ${ordinal(p.house)} house, in ${p.sign}`, p.house, 'jaimini.charaKaraka');
  }
  if (k.karakamsha) {
    const km = k.karakamsha;
    add('kundli.karakamsha.sign', 'jaimini', `The Karakamsha (Navamsa sign of the Atmakaraka ${km.atmakaraka}) is ${km.sign}`, km.sign, 'varga.D9');
    add('kundli.karakamsha.twelfth', 'jaimini',
      `The 12th sign from the Karakamsha is ${km.twelfthSign}, ruled by ${km.twelfthLord}${km.twelfthOccupantsD9.length ? `; Navamsa occupants: ${list(km.twelfthOccupantsD9)}` : ''}`,
      km.twelfthSign, 'varga.D9');
  }

  // --- Mahadashas of life ---------------------------------------------------------
  const birthMs = Date.parse(snapshot.raw.metadata.normalizedTime.utcIsoString);
  const asOfMs = Date.parse(snapshot.asOfIso);
  k.dasha.mahadashas.forEach((md, i) => {
    const n = i + 1;
    const id = `kundli.md.${pad2(n)}`;
    const lord = planetName(md.lord);
    const lp = byName(lord);
    const s = Date.parse(md.startDateIso);
    const e = Date.parse(md.endDateIso);
    const a0 = Math.max(0, Math.floor((s - birthMs) / YEAR_MS));
    const a1 = Math.floor((e - birthMs) / YEAR_MS);
    const status = e <= asOfMs ? 'past' : s <= asOfMs ? 'current' : 'future';
    add(`${id}.lord`, 'mahadasha', `Mahadasha ${n} of life is ruled by ${lord}`, lord, 'dasha.vimshottari');
    add(`${id}.period`, 'mahadasha', `The ${lord} Mahadasha runs from ${iso(md.startDateIso)} to ${iso(md.endDateIso)}`, [iso(md.startDateIso), iso(md.endDateIso)], 'dasha.vimshottari');
    add(`${id}.ages`, 'mahadasha', `The ${lord} Mahadasha covers ages ${a0} to ${a1}`, `ages ${a0} to ${a1}`, 'dasha.vimshottari');
    add(`${id}.status`, 'mahadasha', `As of ${iso(snapshot.asOfIso)} the ${lord} Mahadasha is ${status === 'current' ? 'the current' : `a ${status}`} period`, status, 'dasha.vimshottari');
    add(`${id}.lord-house`, 'mahadasha', `${lord}, lord of Mahadasha ${n}, is in the ${ordinal(lp.house)} house`, lp.house, 'chart.normalizeAstroChart');
    add(`${id}.lord-sign`, 'mahadasha', `${lord}, lord of Mahadasha ${n}, is placed in ${lp.sign}`, lp.sign, 'chart.normalizeAstroChart');
    add(`${id}.lord-rules`, 'mahadasha',
      lp.lordship.length ? `${lord}, lord of Mahadasha ${n}, rules the ${list(lp.lordship.map(ordinal))} house${lp.lordship.length > 1 ? 's' : ''}` : `${lord}, lord of Mahadasha ${n}, rules no house (shadow planet)`,
      lp.lordship.map(String), 'chart.normalizeAstroChart');
    add(`${id}.lord-dignity`, 'mahadasha', `${lord}, lord of Mahadasha ${n}, has ${String(lp.dignity).toLowerCase().replace(/_/g, ' ')} dignity`, lp.dignity, 'planets.calculatePlanetaryDignity');
    add(`${id}.lord-nakshatra`, 'mahadasha', `${lord}, lord of Mahadasha ${n}, is in ${lp.nakshatra} nakshatra`, lp.nakshatra, 'chart.normalizeAstroChart');
    const ads = (md.subPeriods ?? []).map((ad) => planetName(ad.lord));
    add(`${id}.antardashas`, 'mahadasha', `Antardashas within the ${lord} Mahadasha, in order: ${ads.join(', ')}`, ads, 'dasha.vimshottari');
  });

  // --- Mangal (Mars) placement check -------------------------------------------------
  const m = k.manglik;
  const mp = m.marsPlacement;
  if (mp.houseFromLagna) add('kundli.mangal.from-lagna', 'mangal', `Mars is ${ordinal(mp.houseFromLagna)} counted from the Ascendant`, mp.houseFromLagna, 'matchmaking.evaluateManglikDosha');
  if (mp.houseFromMoon) add('kundli.mangal.from-moon', 'mangal', `Mars is ${ordinal(mp.houseFromMoon)} counted from the Moon`, mp.houseFromMoon, 'matchmaking.evaluateManglikDosha');
  if (mp.houseFromVenus) add('kundli.mangal.from-venus', 'mangal', `Mars is ${ordinal(mp.houseFromVenus)} counted from Venus`, mp.houseFromVenus, 'matchmaking.evaluateManglikDosha');
  add('kundli.mangal.classical-houses', 'mangal', 'The classical Mangal houses counted are the 1st, 4th, 7th, 8th and 12th', ['1', '4', '7', '8', '12'], 'matchmaking.evaluateManglikDosha');
  const refs = [m.statusFromLagna === 'MANGLIK' ? 'Ascendant' : '', m.statusFromMoon === 'MANGLIK' ? 'Moon' : '', m.statusFromVenus === 'MANGLIK' ? 'Venus' : ''].filter(Boolean);
  add('kundli.mangal.pattern', 'mangal',
    refs.length ? `Mars falls in a classical Mangal house counted from the ${list(refs)}` : 'Mars falls in none of the classical Mangal houses from the Ascendant, Moon or Venus',
    refs, 'matchmaking.evaluateManglikDosha');
  add('kundli.mangal.exceptions', 'mangal',
    m.cancellationFactors.length ? `Classical exceptions present: ${m.cancellationFactors.join('; ')}` : 'No classical exception (parihara) applies',
    m.cancellationFactors, 'matchmaking.evaluateManglikDosha');

  // --- Sade Sati -----------------------------------------------------------------------
  add('kundli.sadesati.count', 'sade-sati', `Sade Sati occurs ${k.sadeSati.length} times within the first 100 years from birth`, k.sadeSati.length, src('calc.sade-sati'));
  k.sadeSati.forEach((c) => {
    add(`kundli.sadesati.cycle.${pad2(c.index)}`, 'sade-sati',
      `Sade Sati cycle ${c.index}: Saturn transits ${c.phases.map((p) => p.sign).join(', ')} from ${iso(c.startIso)} to ${iso(c.endIso)}`,
      [iso(c.startIso), iso(c.endIso)], src('calc.sade-sati'));
  });
  const active = k.sadeSati.find((c) => c.index === k.sadeSatiNow.activeIndex);
  add('kundli.sadesati.status', 'sade-sati',
    active ? `As of ${iso(snapshot.asOfIso)} Sade Sati is active (cycle ${active.index}, ${k.sadeSatiNow.phase} phase)` : `As of ${iso(snapshot.asOfIso)} Sade Sati is not active`,
    active ? 'active' : 'not active', src('calc.sade-sati'));
  const next = k.sadeSati.find((c) => c.index === k.sadeSatiNow.nextIndex);
  if (next) add('kundli.sadesati.next', 'sade-sati', `The next Sade Sati transit begins on ${iso(next.startIso)}`, iso(next.startIso), src('calc.sade-sati'));
  add('kundli.sadesati.at-birth', 'sade-sati', k.sadeSati[0]?.runningAtBirth ? 'A Sade Sati transit was already running at birth' : 'No Sade Sati transit was running at birth', Boolean(k.sadeSati[0]?.runningAtBirth), src('calc.sade-sati'));

  // --- Patterns presented neutrally ----------------------------------------------------------
  add('kundli.kaalsarp.pattern', 'pattern',
    k.kaalSarp.present ? 'All seven planets from the Sun to Saturn lie on one side of the Rahu-Ketu axis' : `The seven planets are spread on both sides of the Rahu-Ketu axis (outside the larger half: ${list(k.kaalSarp.outside)})`,
    k.kaalSarp.present, src('calc.patterns'));

  // --- Yogas --------------------------------------------------------------------------------
  const yogas = snapshot.yogas.filter((y) => y.isDetected).map((y) => y.canonicalName);
  add('kundli.yogas.count', 'yoga', `${yogas.length} classical yoga${yogas.length === 1 ? ' is' : 's are'} detected in the chart`, yogas.length, 'yoga.evaluateYogas');

  // --- Numerology ------------------------------------------------------------------------------
  const num = computeNumerology(snapshot.subject.dateOfBirth);
  add('kundli.numerology.mulank-planet', 'numerology', `Mulank ${num.mulank} is ruled by ${NUMBER_RULER[num.mulank]}`, NUMBER_RULER[num.mulank], 'platform.numerology');
  add('kundli.numerology.bhagyank-planet', 'numerology', `Bhagyank ${num.bhagyank} is ruled by ${NUMBER_RULER[num.bhagyank]}`, NUMBER_RULER[num.bhagyank], 'platform.numerology');

  // --- Ashtakavarga ----------------------------------------------------------------------------
  const strong = natal.houses.filter((h) => (snapshot.ashtakavarga.sav.signs[h.rashiIndex] ?? 0) > SAV_AVERAGE).map((h) => h.number);
  add('kundli.sav.above-average', 'ashtakavarga',
    strong.length ? `Houses with more than ${SAV_AVERAGE} Sarvashtakavarga bindus: ${list(strong.map(ordinal))}` : `No house has more than ${SAV_AVERAGE} Sarvashtakavarga bindus`,
    strong.map(String), 'ashtakavarga.sav');

  // --- Supportive-practice focus planets (remedies) --------------------------------------------
  const focus = remedyFocus(ctx);
  add('kundli.remedy.focus', 'remedy',
    `Planets chosen for supportive practice: ${focus.map((f) => `${f.planet} (${f.reason})`).join(', ')}`,
    [...new Set(focus.map((f) => f.planet))], src('remedy.focus'));
}

/** Ascendant lord, Moon-sign lord and current Mahadasha lord (classical propitiation focus; KUN-012). */
export function remedyFocus(ctx: Pick<ExtendContext, 'snapshot'>): Array<{ planet: PlanetName; reason: string }> {
  const { natal, vimshottari } = ctx.snapshot;
  const moon = natal.planets.find((p) => String(p.name) === 'MOON')!;
  const moonLord = natal.houses.find((h) => h.rashiIndex === moon.rashiIndex)!.lord;
  const out: Array<{ planet: PlanetName; reason: string }> = [
    { planet: planetName(natal.ascendant.lord), reason: 'Ascendant lord' },
    { planet: planetName(moonLord), reason: 'Moon-sign lord' },
  ];
  const md = vimshottari.activeDasha?.mahadasha.lord;
  if (md) out.push({ planet: planetName(md), reason: 'current Mahadasha lord' });
  return out;
}
