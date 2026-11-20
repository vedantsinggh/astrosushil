/**
 * Evidence contributed by the planet-transit family. IDs are namespaced by
 * planet (`saturn.`, `jupiter.`, `rahu.`, `ketu.`) and by the two detailed
 * transit stays (`.transit.a.` = in progress / next, `.transit.b.` = the one after).
 *
 * Labels always contain the value they carry, and every transit label contains
 * the word "transit", so the natal-placement prose check never mistakes a
 * transit statement for a natal one.
 */
import { AddEvidence } from '../../evidence/evidence-registry';
import { ordinal, SIGNS } from '../../evidence/evidence-registry';
import { formatDate } from '../../render/latex';
import { ChartSnapshot } from '../../snapshot/chart-snapshot';
import { PlanetReturn } from './calc/lifetime';
import { PlanetTransitData, StayView, TransitPosition } from './calc/planet-transit';
import { RetroWindow, SignSpan } from './calc/timeline';

const SRC = 'platform.planet-transit (TransitIngressSolver)';
export const slugSign = (s: string): string => s.toLowerCase();

export const spanText = (s: SignSpan): string =>
  `${s.startClipped ? 'before ' : ''}${formatDate(s.startIso)} to ${s.endClipped ? 'beyond ' : ''}${formatDate(s.endIso)}${s.enteredRetrograde ? ' (retrograde re-entry)' : ''}`;
export const retroText = (w: RetroWindow): string =>
  `retrograde ${w.startIso ? formatDate(w.startIso) : '(already retrograde)'} to ${w.endIso ? formatDate(w.endIso) : '(beyond horizon)'}${w.startSign ? ` (stations in ${w.startSign}` : ' ('}${w.endSign && w.endSign !== w.startSign ? `, turns direct in ${w.endSign})` : ')'}`;

export function list(items: string[], none = 'none'): string {
  if (!items.length) return none;
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Classical reading of a planet's own bindus in a transit sign (decision PT-006). */
export function binduReading(b: number): string {
  if (b >= 5) return 'above 4: the classical texts read this as a supportive transit';
  if (b === 4) return 'exactly 4: the classical texts read this as balanced (mixed) support';
  return 'below 4: the classical texts read this as a transit that asks for patience and effort';
}
export function savReading(s: number): string {
  if (s >= 28) return 'at or above the average of 28';
  return 'below the average of 28';
}

function stayEvidence(add: AddEvidence, d: PlanetTransitData, st: StayView): void {
  const p = d.key;
  const N = d.name;
  const base = `${p}.transit.${st.slot}`;
  const when = st.slot === 'a' ? 'current/next' : 'following';
  add(`${base}.sign`, 'transit-stay', `Transiting ${N} (${when} sign period) is in ${st.sign}`, st.sign, SRC);
  add(`${base}.dates`, 'transit-stay', `Transiting ${N} occupies ${st.sign}: ${st.spans.map(spanText).join('; ')}`, st.spans.map(spanText), SRC);
  add(`${base}.status`, 'transit-stay',
    `On the report date the ${N} transit of ${st.sign} is ${st.status === 'in-progress' ? 'in progress' : st.status === 'paused' ? 'paused (the planet has briefly moved to a neighbouring sign and will return)' : 'upcoming'}`,
    st.status === 'in-progress' ? 'in progress' : st.status, SRC);
  add(`${base}.house-asc`, 'transit-house', `Transiting ${N} in ${st.sign} passes through the ${ordinal(st.houseFromLagna)} house from the Ascendant`, st.houseFromLagna, SRC);
  add(`${base}.house-moon`, 'transit-house', `Transiting ${N} in ${st.sign} is ${ordinal(st.houseFromMoon)} from the natal Moon sign`, st.houseFromMoon, SRC);
  add(`${base}.aspects`, 'transit-aspect',
    `Transiting ${N} in ${st.sign} aspects ${list(st.aspects.map((a) => `${a.sign} with its ${ordinal(a.nth)} aspect (${ordinal(a.houseFromLagna)} house from the Ascendant)`))}`,
    st.aspects.map((a) => a.sign), SRC);
  add(`${base}.aspects-moon`, 'transit-aspect',
    `Counted from the Moon, transiting ${N} in ${st.sign} aspects the ${list(st.aspects.map((a) => ordinal(a.houseFromMoon)))} houses`,
    st.aspects.map((a) => ordinal(a.houseFromMoon)), SRC);
  add(`${base}.conjunct`, 'transit-contact',
    st.conjunctNatal.length ? `Transiting ${N} in ${st.sign} passes over natal ${list(st.conjunctNatal)}` : `Transiting ${N} in ${st.sign} passes over no natal planet (the sign is empty in the birth chart)`,
    st.conjunctNatal, SRC);
  add(`${base}.aspected-natal`, 'transit-contact',
    st.aspectedNatal.length
      ? `Transiting ${N} in ${st.sign} aspects natal ${list(st.aspects.filter((a) => a.natalPlanets.length).map((a) => `${list(a.natalPlanets)} in ${a.sign} (${ordinal(a.nth)} aspect)`))}`
      : `Transiting ${N} in ${st.sign} aspects no natal planet (the aspected signs are empty in the birth chart)`,
    st.aspectedNatal, SRC);
  if (st.bav !== undefined) {
    add(`${base}.bav`, 'transit-ashtakavarga', `Transiting ${N} in ${st.sign}: ${N}'s own Bhinnashtakavarga gives ${st.bav} bindus in this sign (${binduReading(st.bav)})`, st.bav, SRC);
  }
  add(`${base}.sav`, 'transit-ashtakavarga', `Transit sign ${st.sign} holds ${st.sav} Sarvashtakavarga bindus (${savReading(st.sav)})`, st.sav, SRC);
  if (p === 'saturn' || p === 'jupiter') {
    add(`${base}.retro`, 'transit-station',
      st.retroWindows.length ? `Transiting ${N} during its ${st.sign} transit: ${st.retroWindows.map(retroText).join('; ')}` : `Transiting ${N} makes no retrograde station during its ${st.sign} transit`,
      st.retroWindows.map(retroText), 'TransitIngressSolver.findStationEvents');
  }
}

export function addPlanetEvidence(add: AddEvidence, snapshot: ChartSnapshot, d: PlanetTransitData): void {
  const p = d.key;
  const N = d.name;
  const n = d.natal;
  add(`${p}.natal.aspects`, 'natal-aspect',
    `Natal ${N} casts ${list(n.aspects.map((a) => `its ${ordinal(a.nth)} aspect on ${a.sign} (${ordinal(a.houseFromLagna)} house)`))}`,
    n.aspects.map((a) => a.sign), 'planets.getAspectedSigns');
  add(`${p}.natal.aspected-planets`, 'natal-aspect',
    n.aspectedPlanets.length ? `Natal ${N} aspects natal ${list(n.aspectedPlanets)}` : `Natal ${N} aspects no natal planet (its aspected signs are empty)`,
    n.aspectedPlanets, 'planets.getAspectedSigns');
  add(`${p}.natal.house-from-moon`, 'natal-moon-view', `Natal ${N} is placed ${ordinal(n.houseFromMoon)} from the Moon sign`, n.houseFromMoon, 'chart.normalizeAstroChart');
  const rel = n.moonLordRelationship.toLowerCase();
  add(`${p}.natal.moon-lord-relationship`, 'natal-moon-view',
    rel === 'self'
      ? `${N}'s relationship to the Moon-sign lord: self (${N} itself rules the Moon sign)`
      : `${N}'s natural relationship to ${n.moonLord}, lord of the Moon sign, is ${rel}`,
    rel, 'planets.getNaturalRelationship');
  add(`${p}.natal.dispositor`, 'natal-dispositor',
    n.dispositor === N
      ? `${N} is its own dispositor (it rules ${n.sign}, the sign it occupies)`
      : `${n.dispositor} (lord of ${n.sign}) is the dispositor of ${N}; ${n.dispositor} occupies the ${ordinal(n.dispositorHouse)} house in ${n.dispositorSign}`,
    n.dispositor, 'chart.normalizeAstroChart');
  if (n.lordship.length) {
    const cats = [...new Set(n.lordshipTypes.flatMap((t) => t.split(':')[1].split('+')))];
    add(`${p}.natal.lordship-type`, 'natal-lordship',
      `From the Ascendant, ${N} rules ${list(n.lordshipTypes.map((t) => `the ${ordinal(Number(t.split(':')[0]))} house (${t.split(':')[1].replace(/\+/g, ', ')})`))}`,
      cats, 'houses.wholeSign');
    add(`${p}.natal.yogakaraka`, 'natal-lordship',
      n.yogakaraka ? `${N} is a yogakaraka for this Ascendant (it rules both a kendra and a trikona)` : `${N} is not a yogakaraka for this Ascendant`,
      n.yogakaraka, 'houses.wholeSign (BPHS ch. 34)');
  }
  // Ashtakavarga of the planet itself.
  if (p === 'saturn' || p === 'jupiter') {
    const sym = p.toUpperCase() as 'SATURN' | 'JUPITER';
    const bav = snapshot.ashtakavarga.bav[sym as keyof typeof snapshot.ashtakavarga.bav];
    const asc = snapshot.natal.ascendant.rashiIndex;
    SIGNS.forEach((s, i) => {
      const h = ((i + 1 - asc + 12) % 12) + 1;
      add(`${p}.bav.sign.${slugSign(s)}`, 'bav', `${N}'s Bhinnashtakavarga: ${bav.signs[i + 1]} bindus in ${s} (the ${ordinal(h)} house)`, bav.signs[i + 1], 'ashtakavarga.bav');
    });
    add(`${p}.bav.total`, 'bav', `${N}'s Bhinnashtakavarga total is ${bav.totalPoints} bindus`, bav.totalPoints, 'ashtakavarga.bav');
    add(`${p}.bav.natal-sign`, 'bav', `Natal ${N}'s own sign ${n.sign} holds ${bav.signs[n.signIndex]} of its Bhinnashtakavarga bindus`, bav.signs[n.signIndex], 'ashtakavarga.bav');
    const max = Math.max(...bav.signList);
    const min = Math.min(...bav.signList);
    const strongest = SIGNS.filter((_, i) => bav.signList[i] === max);
    const weakest = SIGNS.filter((_, i) => bav.signList[i] === min);
    add(`${p}.bav.strongest`, 'bav', `${N}'s Bhinnashtakavarga is highest (${max} bindus) in ${list([...strongest])}`, [...strongest], 'ashtakavarga.bav');
    add(`${p}.bav.weakest`, 'bav', `${N}'s Bhinnashtakavarga is lowest (${min} bindus) in ${list([...weakest])}`, [...weakest], 'ashtakavarga.bav');
  }
  stayEvidence(add, d, d.a);
  stayEvidence(add, d, d.b);
  add(`${p}.transit.horizon`, 'transit-overview',
    `${N}'s transit sign periods are listed for ${d.horizonYears} years: ${list(d.overview.slice(0, 6).map((o) => `${o.sign} from ${formatDate(o.firstStartIso)}`))}${d.overview.length > 6 ? ' and later periods' : ''}`,
    d.overview.map((o) => o.sign), SRC);
}

export function addReturnEvidence(add: AddEvidence, key: string, name: string, returns: PlanetReturn[]): void {
  add(`${key}.returns`, 'planet-return',
    returns.length
      ? `${name} transits back to its natal sign ${returns[0].sign} ${returns.length} times by age 90: ${list(returns.map((r) => `from ${formatDate(r.startIso)} (age ${r.age})`))}`
      : `${name} makes no full transit return to its natal sign by age 90`,
    returns.map((r) => formatDate(r.startIso)), SRC);
}

export function addPositionEvidence(add: AddEvidence, snapshot: ChartSnapshot, positions: TransitPosition[]): void {
  const on = formatDate(snapshot.asOfIso);
  for (const pos of positions) {
    add(`transit-now.${pos.planet.toLowerCase()}.sign`, 'transit-position',
      `On ${on}, transiting ${pos.planet} is in ${pos.sign} at ${pos.degree.toFixed(1)}°${pos.retrograde && pos.planet !== 'Rahu' && pos.planet !== 'Ketu' ? ' (retrograde)' : ''}, the ${ordinal(pos.houseFromLagna)} house from the Ascendant`,
      pos.sign, 'TransitIngressSolver.getPlanetaryState');
  }
}
