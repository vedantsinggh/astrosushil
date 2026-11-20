/**
 * Couple Matching evidence (namespace `match.`).
 *
 * Labels that describe the partner never use the phrasing "<Planet> is in
 * <Sign>" or "<Planet> in the <n>th house", because the core claim validator
 * re-checks such sentences against the NATIVE's chart (see the core-change
 * request in docs/report-system/decisions/finance-couple.md, COU-010).
 */
import { AddEvidence, ordinal, planetName, PLANETS } from '../../evidence/evidence-registry';
import { formatDate } from '../../render/latex';
import { ChartSnapshot } from '../../snapshot/chart-snapshot';
import { classifyFunctionalNature } from '../_finance-couple-shared/functional-nature';
import { titleCase } from '../_finance-couple-shared/natal-tables';
import { CoupleExt, dashaOverlap, jointTransits, KOOTA_KEYS, KOOTA_SLUG, nodalAxis, saturnMoonPeriods, Who } from './couple.calc';

const SRC = 'report.couple';
const two = (n: number) => String(n).padStart(2, '0');
export const OVERLAP_YEARS = 12;
const fmtPts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function pl(snap: ChartSnapshot, name: string) {
  return snap.natal.planets.find((p) => planetName(p.name) === name)!;
}

export function coupleEvidence(add: AddEvidence, native: ChartSnapshot, partner: ChartSnapshot, ext: CoupleExt): void {
  const { match } = ext;
  const r = match.result;
  const k = r.ashtakoota.kootas;
  const whose = (w: Who) => (w === 'native' ? 'your' : "your partner's");

  add('match.groom-chart', 'matching-convention',
    `Directional kootas (Varna, Vashya) count ${match.groom === 'native' ? 'your' : "your partner's"} chart as the groom's chart`, match.groom, `${SRC}.convention`);

  // --- Ashtakoota --------------------------------------------------------
  const total = r.ashtakoota.totalObtainedPoints;
  const eff = r.ashtakoota.totalEffectivePoints ?? total;
  add('match.total', 'ashtakoota', `Ashtakoota (Guna Milan) total: ${fmtPts(total)} of 36 points`, total, 'matchmaking.MatchmakingCalculator');
  add('match.total-effective', 'ashtakoota',
    eff !== total ? `After the classical Bhakoot cancellation the effective Ashtakoota total is ${fmtPts(eff)} of 36` : `No Bhakoot cancellation applies; the effective Ashtakoota total stays ${fmtPts(eff)} of 36`,
    eff, 'matchmaking.MatchmakingCalculator');
  add('match.threshold', 'ashtakoota',
    `The classical minimum for Guna Milan is 18 of 36; this match scores ${fmtPts(total)}, ${total >= 18 ? 'at or above' : 'below'} that line`,
    total >= 18 ? 'above' : 'below', 'matchmaking.MatchmakingCalculator');
  const detail: Record<string, string> = {
    varna: `your Varna ${titleCase(match.profile.native.varna)}, your partner's ${titleCase(match.profile.partner.varna)}`,
    vashya: `your Vashya ${titleCase(match.profile.native.vashya)}, your partner's ${titleCase(match.profile.partner.vashya)}`,
    tara: `Tara counted both ways: ${titleCase(k.tara.personAToB.taraName)} and ${titleCase(k.tara.personBToA.taraName)}`,
    yoni: `your Yoni ${titleCase(match.profile.native.yoni.animal)}, your partner's ${titleCase(match.profile.partner.yoni.animal)} (${titleCase(k.yoni.relationshipCategory)})`,
    grahaMaitri: `Moon-sign lords ${planetName(match.profile.native.rashiLord)} (yours) and ${planetName(match.profile.partner.rashiLord)} (your partner's): ${titleCase(k.grahaMaitri.combinedFriendship)}`,
    gana: `your Gana ${titleCase(match.profile.native.gana)}, your partner's ${titleCase(match.profile.partner.gana)}`,
    bhakoot: `Moon signs ${k.bhakoot.relativeDistance} apart (${k.bhakoot.relationshipName})`,
    nadi: `your Nadi ${titleCase(match.profile.native.nadi)}, your partner's ${titleCase(match.profile.partner.nadi)}`,
  };
  for (const key of KOOTA_KEYS) {
    const kk = k[key];
    add(`match.koota.${KOOTA_SLUG[key]}`, 'koota',
      `${kk.name} koota: ${fmtPts(kk.obtainedPoints)} of ${kk.maxPoints} points (${detail[key]})`, kk.obtainedPoints, 'matchmaking.MatchmakingCalculator');
  }
  add('match.bhakoot.status', 'koota',
    k.bhakoot.condition === 'AUSPICIOUS'
      ? `Bhakoot: the Moon signs are ${k.bhakoot.relativeDistance} apart, a classically harmonious distance`
      : k.bhakoot.isDoshaCancelled
        ? `Bhakoot: the Moon signs are ${k.bhakoot.relativeDistance} apart; the classical exception applies because ${k.bhakoot.evidence.sameLord ? 'both Moon signs share one lord' : k.bhakoot.evidence.mutualFriends ? 'the two Moon-sign lords are natural friends' : 'both Moons share one nakshatra'}`
        : `Bhakoot: the Moon signs are ${k.bhakoot.relativeDistance} apart and none of the classical exceptions applies`,
    k.bhakoot.relativeDistance, 'matchmaking.MatchmakingCalculator');
  add('match.nadi.status', 'koota',
    k.nadi.condition === 'DIFFERENT_NADI'
      ? `Nadi: your Nadi (${titleCase(match.profile.native.nadi)}) differs from your partner's (${titleCase(match.profile.partner.nadi)})`
      : k.nadi.isDoshaCancelled
        ? `Nadi: both of you share the ${titleCase(match.profile.native.nadi)} Nadi and a classical exception applies (${k.nadi.cancellationReason?.replace(/^Nadi Dosha (cancelled|mitigated): /, '') ?? ''})`
        : `Nadi: both of you share the ${titleCase(match.profile.native.nadi)} Nadi and no classical exception applies`,
    titleCase(match.profile.native.nadi), 'matchmaking.MatchmakingCalculator');

  // --- Moon profiles -----------------------------------------------------
  for (const w of ['native', 'partner'] as const) {
    const p = match.profile[w];
    add(`match.avakhada.${w}`, 'avakhada',
      `${w === 'native' ? 'Your' : "Your partner's"} Moon profile: Varna ${titleCase(p.varna)}, Vashya ${titleCase(p.vashya)}, Yoni ${titleCase(p.yoni.animal)}, Gana ${titleCase(p.gana)}, Nadi ${titleCase(p.nadi)}`,
      [titleCase(p.varna), titleCase(p.vashya), titleCase(p.yoni.animal), titleCase(p.gana), titleCase(p.nadi)], 'matchmaking.deriveMoonProfile');
  }

  // --- Manglik (neutral) ---------------------------------------------------
  for (const w of ['native', 'partner'] as const) {
    const m = match.manglik[w];
    const mp = m.marsPlacement;
    add(`match.manglik.${w}`, 'manglik',
      `${w === 'native' ? 'Your' : "Your partner's"} Mars counts ${ordinal(mp.houseFromLagna ?? 0)} from the Ascendant, ${ordinal(mp.houseFromMoon ?? 0)} from the Moon and ${ordinal(mp.houseFromVenus ?? 0)} from Venus; classical Manglik placement from the Ascendant: ${m.isManglik ? 'yes' : 'no'}${m.cancellationFactors.length ? `; balancing factors: ${m.cancellationFactors.join(', ')}` : ''}`,
      m.isManglik ? 'yes' : 'no', 'matchmaking.evaluateManglikDosha');
  }
  const verdict = r.manglikComparison.verdict;
  add('match.manglik.comparison', 'manglik',
    verdict === 'BOTH_NON_MANGLIK' ? 'Manglik comparison: neither chart has the classical Mars placement after balancing factors, so the classical rule is satisfied'
      : verdict === 'BOTH_MANGLIK' ? 'Manglik comparison: both charts have the classical Mars placement, which the classical rule treats as mutually balanced'
        : verdict === 'MANGLIK_MISMATCH' ? 'Manglik comparison: only one chart has the classical Mars placement after balancing factors; the classical rule asks for both or neither'
          : 'Manglik comparison: a birth time is missing, so the Ascendant-based rule cannot be applied',
    verdict === 'MANGLIK_MISMATCH' ? 'only one' : verdict === 'BOTH_MANGLIK' ? 'both' : 'neither', 'matchmaking.compareManglikDosha');

  // --- Paired placements (safe labels) --------------------------------------
  for (const name of PLANETS) {
    const a = pl(native, name);
    const b = pl(partner, name);
    add(`match.pair.${name.toLowerCase()}`, 'pair-placement',
      `${name} - you: ${a.sign}, ${ordinal(a.house)} house; your partner: ${b.sign}, ${ordinal(b.house)} house`,
      [a.sign, b.sign], `${SRC}.pair`);
  }
  for (let h = 1; h <= 12; h++) {
    const ha = native.natal.houses.find((x) => x.number === h)!;
    const hb = partner.natal.houses.find((x) => x.number === h)!;
    const la = pl(native, planetName(ha.lord));
    const lb = pl(partner, planetName(hb.lord));
    const occ = (hs: typeof ha) => (hs.occupants.length ? hs.occupants.map((o) => planetName(o)).join(', ') : 'none');
    add(`match.pair.house.${h}`, 'pair-house',
      `${ordinal(h)} house - you: ${ha.sign}, lord ${planetName(ha.lord)} (${ordinal(la.house)} house), occupants ${occ(ha)}; your partner: ${hb.sign}, lord ${planetName(hb.lord)} (${ordinal(lb.house)} house), occupants ${occ(hb)}`,
      [ha.sign, hb.sign], `${SRC}.pair`);
  }
  add('match.pair.asc', 'pair-placement',
    `Ascendant - you: ${native.natal.ascendant.sign} (${native.natal.ascendant.nakshatra}); your partner: ${partner.natal.ascendant.sign} (${partner.natal.ascendant.nakshatra})`,
    [native.natal.ascendant.sign, partner.natal.ascendant.sign], `${SRC}.pair`);
  const d9asc = (s: ChartSnapshot) => {
    const c = s.vargas.D9!;
    return ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][c.ascendant!.rashiIndex - 1];
  };
  add('match.pair.d9-asc', 'pair-placement', `Navamsa (D9) ascendant - you: ${d9asc(native)}; your partner: ${d9asc(partner)}`, [d9asc(native), d9asc(partner)], `${SRC}.pair`);

  // --- Functional nature (both) ---------------------------------------------
  for (const [w, s] of [['native', native], ['partner', partner]] as const) {
    const fn = classifyFunctionalNature(s.natal.ascendant.rashiIndex);
    const fav = fn.filter((c) => c.nature === 'yogakaraka' || c.nature === 'favourable').map((c) => c.planet);
    add(`match.functional.${w}`, 'functional-nature',
      `Functionally favourable planets for ${whose(w)} ${s.natal.ascendant.sign} Ascendant: ${fav.join(', ')}${fn.some((c) => c.nature === 'yogakaraka') ? ` (Yogakaraka: ${fn.filter((c) => c.nature === 'yogakaraka').map((c) => c.planet).join(', ')})` : ''}`,
      fav, `${SRC}.functionalNature`);
  }

  // --- Dashas ---------------------------------------------------------------
  for (const [w, s] of [['native', native], ['partner', partner]] as const) {
    const a = s.vimshottari.activeDasha;
    if (!a) continue;
    add(`match.dasha.${w}`, 'dasha-current',
      `${w === 'native' ? 'Your' : "Your partner's"} running periods: ${planetName(a.mahadasha.lord)} Mahadasha until ${formatDate(a.mahadasha.endDateIso)}${a.antardasha ? `, ${planetName(a.antardasha.lord)} Antardasha until ${formatDate(a.antardasha.endDateIso)}` : ''}`,
      planetName(a.mahadasha.lord), 'dasha.vimshottari');
  }
  dashaOverlap(native, partner, OVERLAP_YEARS).forEach((seg, i) => {
    add(`match.overlap.${two(i + 1)}`, 'dasha-overlap',
      `From ${formatDate(seg.startIso)} to ${formatDate(seg.endIso)}: you run ${seg.native.md}-${seg.native.ad} while your partner runs ${seg.partner.md}-${seg.partner.ad}`,
      [seg.native.ad, seg.partner.ad], `${SRC}.dashaOverlap`);
  });

  // --- Saturn cycles and nodal axis -------------------------------------------
  for (const [w, s] of [['native', native], ['partner', partner]] as const) {
    const per = saturnMoonPeriods(s);
    add(`match.saturn.${w}.count`, 'saturn-cycle',
      per.length ? `Saturn transit periods over the 12th, 1st, 2nd, 4th or 8th from ${whose(w)} Moon in the next 12 years: ${per.length}` : `Saturn does not transit the 12th, 1st, 2nd, 4th or 8th from ${whose(w)} Moon in the next 12 years`,
      per.length, `${SRC}.saturnCycles`);
    per.forEach((p, i) => {
      add(`match.saturn.${w}.${two(i + 1)}`, 'saturn-cycle',
        `Saturn transits ${p.period.sign} from ${formatDate(p.period.startIso)} to ${formatDate(p.period.endIso)}: ${ordinal(p.houseFromMoon)} from ${whose(w)} Moon (${p.phase})`,
        p.period.sign, 'transit.TransitIngressSolver');
    });
    const ax = nodalAxis(s);
    add(`match.nodes.${w}`, 'nodal-axis',
      ax.oneSide ? `All seven planets of ${whose(w)} chart lie on one side of the Rahu-Ketu axis: yes` : `All seven planets of ${whose(w)} chart lie on one side of the Rahu-Ketu axis: no (Rahu side: ${ax.rahuSide.join(', ') || 'none'}; Ketu side: ${ax.ketuSide.join(', ') || 'none'})`,
      ax.oneSide ? 'yes' : 'no', `${SRC}.nodalAxis`);
  }

  // --- Joint transits (Jupiter) ------------------------------------------------
  jointTransits(native, partner).filter((t) => t.planet === 'JUPITER').forEach((t, i) => {
    add(`match.jupiter.${two(i + 1)}`, 'joint-transit',
      `Jupiter transits ${t.period.sign} from ${formatDate(t.period.startIso)} to ${formatDate(t.period.endIso)}: ${ordinal(t.native.fromMoon)} from your Moon (${t.native.favourable ? 'classically favourable' : 'not a favourable gochara house'}), ${ordinal(t.partner.fromMoon)} from your partner's Moon (${t.partner.favourable ? 'classically favourable' : 'not a favourable gochara house'})`,
      t.period.sign, 'transit.TransitIngressSolver');
  });
}
