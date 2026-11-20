/**
 * Saturn report: extend payload and evidence (lifetime Sade Sati, Kantaka
 * Shani and Dhaiya on top of the shared planet-transit data).
 *
 * The legacy `saturn-calculator.ts` (hard-coded Sade Sati dates) is NOT used;
 * everything here is derived from solved Saturn ingresses.
 */
import { AddEvidence, ordinal } from '../../evidence/evidence-registry';
import { formatDate } from '../../render/latex';
import { ChartSnapshot } from '../../snapshot/chart-snapshot';
import {
  addPlanetTransitEvidence,
  computePlanetTransitExt,
  computeSaturnLifetime,
  list,
  PHASE_LABEL,
  PlanetTransitExt,
  SaturnLifetime,
  signAt,
  signName,
  spanText,
} from '../_planet-transit-shared';

export const SATURN_HORIZON_YEARS = 30;

export interface SaturnExt extends PlanetTransitExt {
  life: SaturnLifetime;
}

export async function saturnExtend(snapshot: ChartSnapshot): Promise<SaturnExt> {
  const base = await computePlanetTransitExt(snapshot, [{ key: 'saturn', horizonYears: SATURN_HORIZON_YEARS }]);
  return { ...base, life: await computeSaturnLifetime(snapshot) };
}

const SRC = 'platform.saturn.lifetime (TransitIngressSolver)';
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const nn = (n: number) => String(n).padStart(2, '0');

export function addSaturnEvidence(add: AddEvidence, snapshot: ChartSnapshot, ext: SaturnExt): void {
  addPlanetTransitEvidence(add, snapshot, ext);
  const L = ext.life;
  const on = formatDate(snapshot.asOfIso);
  const m = L.moonSign;
  const ssSigns = [signAt(m, 12), m, signAt(m, 2)].map(signName);
  const fromLagna = [signAt(m, 12), m, signAt(m, 2)].map((s) => ordinal(((s - L.lagnaSign + 12) % 12) + 1));

  add('sadesati.signs', 'sade-sati', `Sade Sati is Saturn's transit of ${ssSigns[0]} (12th from the Moon), ${ssSigns[1]} (the Moon sign) and ${ssSigns[2]} (2nd from the Moon)`, ssSigns, SRC);
  add('sadesati.signs-from-lagna', 'sade-sati', `The Sade Sati signs ${list(ssSigns)} are the ${list(fromLagna)} houses from the Ascendant`, fromLagna, SRC);
  const st = L.status;
  add('sadesati.status', 'sade-sati',
    st.active
      ? `On ${on} Sade Sati is active: cycle ${st.cycle}, ${lc(PHASE_LABEL[st.phase!])}, with transiting Saturn in ${st.saturnSign}`
      : `On ${on} Sade Sati is not active: transiting Saturn is in ${st.saturnSign}, ${ordinal(st.saturnHouseFromMoon)} from the Moon`,
    st.active ? 'active' : 'not active', SRC);
  add('sadesati.count', 'sade-sati', `${L.cycles.length} Sade Sati cycles fall between birth and age 90`, L.cycles.length, SRC);
  for (const c of L.cycles) {
    add(`sadesati.cycle.${nn(c.n)}.span`, 'sade-sati-cycle',
      `Sade Sati cycle ${c.n} (Saturn's transit of ${list(c.phases.map((p) => p.sign))}): ${formatDate(c.startIso)} to ${formatDate(c.endIso)}, ages ${c.ageAtStart} to ${c.ageAtEnd}${c.beganBeforeBirth ? ' (already running at birth)' : ''}`,
      [formatDate(c.startIso), formatDate(c.endIso)], SRC);
    for (const p of c.phases) {
      add(`sadesati.cycle.${nn(c.n)}.${p.key}`, 'sade-sati-phase',
        `Sade Sati cycle ${c.n}, ${lc(PHASE_LABEL[p.key])}: Saturn transits ${p.sign} ${p.spans.map(spanText).join('; ')}`,
        [p.sign, formatDate(p.startIso), formatDate(p.endIso)], SRC);
    }
  }
  const next = L.nextCycle !== undefined ? L.cycles[L.nextCycle] : undefined;
  add('sadesati.next', 'sade-sati',
    next ? `The next Sade Sati cycle begins on ${formatDate(next.startIso)} (age ${next.ageAtStart}), when transiting Saturn enters ${next.phases[0].sign}` : 'No further Sade Sati cycle begins before age 90 after the report date',
    next ? formatDate(next.startIso) : 'no further', SRC);

  const kSigns = [4, 7, 8, 10].map((h) => `${signName(signAt(m, h))} (${ordinal(h)} from the Moon, ${ordinal(((signAt(m, h) - L.lagnaSign + 12) % 12) + 1)} from the Ascendant)`);
  add('kantak.signs', 'kantak', `Saturn's Kantaka and Dhaiya transit signs are ${list(kSigns)}`, [4, 7, 8, 10].map((h) => signName(signAt(m, h))), SRC);
  for (const k of L.kantak) {
    add(`kantak.period.${nn(k.n)}`, 'kantak-period',
      `${k.label}: Saturn transits ${k.sign} ${k.spans.map(spanText).join('; ')} (ages ${k.ageAtStart} to ${k.ageAtEnd}; ${ordinal(k.houseFromLagna)} house from the Ascendant)`,
      [k.sign, formatDate(k.startIso), formatDate(k.endIso)], SRC);
  }
  const t = Date.parse(snapshot.asOfIso);
  const cur = L.kantak.find((k) => k.spans.some((s) => Date.parse(s.startIso) <= t && t < Date.parse(s.endIso)));
  const nk = L.kantak.find((k) => Date.parse(k.startIso) > t);
  add('kantak.status', 'kantak',
    cur ? `On ${on} a ${cur.label} transit is in progress: transiting Saturn in ${cur.sign}, ${ordinal(cur.houseFromMoon)} from the Moon` : `On ${on} no Kantaka or Dhaiya transit is in progress (transiting Saturn is ${ordinal(L.status.saturnHouseFromMoon)} from the Moon)`,
    cur ? 'in progress' : 'no', SRC);
  add('kantak.next', 'kantak',
    nk ? `The next Kantaka or Dhaiya transit is ${nk.label}: transiting Saturn in ${nk.sign} from ${formatDate(nk.startIso)} (age ${nk.ageAtStart})` : 'No further Kantaka or Dhaiya transit begins before age 90 after the report date',
    nk ? formatDate(nk.startIso) : 'no further', SRC);
}
