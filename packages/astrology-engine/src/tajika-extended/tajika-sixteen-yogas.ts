import { AstroChart } from '../chart/astro-chart.types';
import { PlanetSymbol } from '../planets/planet.types';
import { calculateCombustion } from '../planets/combustion';
import { getCompoundRelationship, getNaturalRelationship, getTemporalRelationship } from '../planets/planetary-relationships';
import { getRashiRuler, isDebilitated, isExalted } from '../planets/planetary-dignity';
import { VargaCalculator } from '../varga/varga-calculator';
import { calculateTajikaPanchaVargiyaBala } from './pancha-vargiya-bala';
import {
  TAJIKA_GRAHAS,
  tajikaAllowedOrb,
  tajikaAspectName,
  tajikaDeeptamsha,
  tajikaIsFaster,
  tajikaSignDistance,
} from './tajika-tables';
import {
  TajikaGraha,
  TajikaPairEvidence,
  TajikaPlanetState,
  TajikaSixteenYogaId,
  TajikaSixteenYogasResult,
  TajikaYogaEntry,
  TajikaYogaOccurrence,
  TajikaYogaOptions,
} from './tajika-extended.types';

const BOOK = 'P.V.R. Narasimha Rao, "Vedic Astrology: An Integrated Approach" (2000), ch. 29';
const NEELAKANTHI = 'Tajika Neelakanthi, Samjna Tantra (shodasha-yoga section)';

export const TAJIKA_SIXTEEN_YOGAS_SOURCE =
  `${NEELAKANTHI}, rules as given in ${BOOK} §29.2.1-29.2.16; aspects and deeptamshas ch. 28 §28.2; ` +
  'Pancha-vargiya Bala thresholds ch. 28 §28.4.6. Provisional – pending client review.';

interface YogaMeta {
  id: TajikaSixteenYogaId;
  name: string;
  alternateNames: string[];
  section: string;
  rule: string;
}

const YOGA_META: YogaMeta[] = [
  { id: 'IKKAVALA', name: 'Ikkavala', alternateNames: ['Ishkavala', 'Ikbal'], section: '§29.2.1', rule: 'All seven planets occupy kendras (1,4,7,10) or panapharas (2,5,8,11); apoklimas (3,6,9,12) are empty.' },
  { id: 'INDUVARA', name: 'Induvara', alternateNames: ['Induvar'], section: '§29.2.2', rule: 'All seven planets occupy apoklimas (3,6,9,12).' },
  { id: 'ITHASALA', name: 'Ithasala', alternateNames: ['Muthashila'], section: '§29.2.3', rule: 'Two planets in Tajika aspect within orb with the faster planet less advanced in its sign (applying). Poorna: gap <= 1°; Vartamana: within orb; Bhavishyat: the faster planet enters the orb after moving 1° or less.' },
  { id: 'ISHRAFA', name: 'Ishrafa', alternateNames: ['Eesarpha', 'Musaripha'], section: '§29.2.4', rule: 'Two planets in Tajika aspect within orb with the faster planet more advanced in its sign (separating).' },
  { id: 'NAKTA', name: 'Nakta', alternateNames: [], section: '§29.2.5', rule: 'Two planets without Ithasala/Ishrafa between them each have a present Ithasala with a third planet faster than both.' },
  { id: 'YAMAYA', name: 'Yamaya', alternateNames: ['Yamya'], section: '§29.2.6', rule: 'Two planets without Ithasala/Ishrafa between them each have a present Ithasala with a third planet slower than both.' },
  { id: 'MANAHOO', name: 'Manahoo', alternateNames: ['Manau'], section: '§29.2.7', rule: 'A present Ithasala in which Mars or Saturn (not one of the pair) is conjunct the faster planet within the faster planet\'s deeptamsha.' },
  { id: 'KAMBOOLA', name: 'Kamboola', alternateNames: ['Kambool'], section: '§29.2.8', rule: 'A present Ithasala between two planets (neither the Moon), and the Moon has a present Ithasala with one or both of them.' },
  { id: 'GAIRI_KAMBOOLA', name: 'Gairi-Kamboola', alternateNames: ['Gairikamboola'], section: '§29.2.9', rule: 'A present Ithasala (neither planet the Moon); the Moon, in the last degree of its sign and without Ithasala with either, forms Ithasala with one of them once it enters the next sign.' },
  { id: 'KHALLASARA', name: 'Khallasara', alternateNames: ['Khallasar'], section: '§29.2.10', rule: 'The lagna lord occupies the sign between the Moon and another planet X and has no present Ithasala with the Moon or with X.' },
  { id: 'RADDA', name: 'Radda', alternateNames: [], section: '§29.2.11', rule: 'A present Ithasala in which either planet is debilitated, retrograde or combust.' },
  { id: 'DUPHALI_KUTTHA', name: 'Duphali-kuttha', alternateNames: ['Duhphali-Kutta'], section: '§29.2.12', rule: 'A present Ithasala in which the slower planet is strong (exalted, own sign or Pancha-vargiya Bala >= 10) and the faster planet is weak (not exalted, not own sign, Pancha-vargiya Bala < 5).' },
  { id: 'DUTTHOTTHA_DAVIRA', name: 'Dutthottha-davira', alternateNames: ['Duttota'], section: '§29.2.13', rule: 'Both planets of a present Ithasala are weak (debilitated, in an inimical sign, or Pancha-vargiya Bala < 5) and one of them has a present Ithasala with a strong third planet (exalted, own sign or Pancha-vargiya Bala >= 10).' },
  { id: 'TAMBIRA', name: 'Tambira', alternateNames: ['Thambira', 'Tambeer'], section: '§29.2.14', rule: 'A planet in the last degree of its sign, without present Ithasala with a slower planet, forms Ithasala with that slower planet once it enters the next sign.' },
  { id: 'KUTTHA', name: 'Kuttha', alternateNames: ['Kutta'], section: '§29.2.15', rule: 'A planet in the lagna is aspected by another planet that is in its own or exaltation sign and placed in a kendra or panaphara.' },
  { id: 'DURUPHA', name: 'Durupha', alternateNames: [], section: '§29.2.16', rule: 'A present Ithasala in which both planets are afflicted: in a dusthana (6, 8, 12), combust, retrograde or debilitated.' },
];

const KENDRA_PANAPHARA = new Set([1, 2, 4, 5, 7, 8, 10, 11]);
const APOKLIMA = new Set([3, 6, 9, 12]);
const DUSTHANA = new Set([6, 8, 12]);

interface PointPos {
  longitude: number;
  rashiIndex: number;
  degreeInSign: number;
  isRetrograde: boolean;
}

function pointFromLongitude(lon: number, retro: boolean): PointPos {
  const l = ((lon % 360) + 360) % 360;
  const rashiIndex = Math.floor(l / 30) + 1;
  return { longitude: l, rashiIndex, degreeInSign: l - (rashiIndex - 1) * 30, isRetrograde: retro };
}

const vargaCalc = new VargaCalculator();

/**
 * Evaluates all 16 Tajika yogas on a chart (normally the Varshaphala annual chart; works on any chart with an ascendant).
 * Rule-based and deterministic: every input is a planet longitude/retrograde flag from the engine chart.
 */
export function evaluateTajikaSixteenYogas(chart: AstroChart, options: TajikaYogaOptions = {}): TajikaSixteenYogasResult {
  const opts: Required<TajikaYogaOptions> = {
    orbRule: options.orbRule ?? 'MUTUAL',
    includeSemiSextile: options.includeSemiSextile ?? false,
    manahooByAspect: options.manahooByAspect ?? false,
  };
  if (!chart.ascendant) throw new Error('Tajika yogas need a chart with an ascendant');
  const ascRashi = chart.ascendant.rashiIndex;
  const sunLon = chart.planets[PlanetSymbol.SUN].longitude;
  const bala = calculateTajikaPanchaVargiyaBala(chart);
  const pvb = new Map(bala.planets.map((p) => [p.planet, p.vimshopaka]));

  const pos = new Map<TajikaGraha, PointPos>();
  const states: TajikaPlanetState[] = [];
  for (const p of TAJIKA_GRAHAS) {
    const cp = chart.planets[p];
    if (!cp) throw new Error(`Chart has no position for ${p}`);
    const pt = pointFromLongitude(cp.longitude, cp.isRetrograde);
    pos.set(p, pt);
    const lord = getRashiRuler(pt.rashiIndex);
    const ownSign = lord === p;
    states.push({
      planet: p,
      longitude: pt.longitude,
      rashiIndex: pt.rashiIndex,
      degreeInSign: pt.degreeInSign,
      house: tajikaSignDistance(ascRashi, pt.rashiIndex),
      isRetrograde: pt.isRetrograde,
      isCombust: calculateCombustion(p, pt.longitude, sunLon, pt.isRetrograde).isCombust,
      isExalted: isExalted(p, pt.rashiIndex),
      isDebilitated: isDebilitated(p, pt.rashiIndex),
      isOwnSign: ownSign,
      signLordRelationship: ownSign
        ? undefined
        : getCompoundRelationship(getNaturalRelationship(p, lord), getTemporalRelationship(pt.rashiIndex, chart.planets[lord].rashiIndex)),
      panchaVargiyaBala: pvb.get(p) ?? 0,
    });
  }
  const st = new Map(states.map((s) => [s.planet, s]));

  const pairWith = (a: TajikaGraha, pa: PointPos, b: TajikaGraha, pb: PointPos): TajikaPairEvidence => {
    const aFaster = tajikaIsFaster(a, b);
    const [f, s, pf, ps] = aFaster ? [a, b, pa, pb] : [b, a, pb, pa];
    const aspect = tajikaAspectName(pf.rashiIndex, ps.rashiIndex, opts.includeSemiSextile);
    const gap = ps.degreeInSign - pf.degreeInSign;
    const allowedOrb = tajikaAllowedOrb(f, s, opts.orbRule);
    const withinOrb = Math.abs(gap) <= allowedOrb;
    // §29.2.3 special notes: a retrograde faster planet reverses the sense (behind = separating, ahead = applying).
    const applying = pf.isRetrograde ? gap < 0 : gap >= 0;
    return {
      faster: f,
      slower: s,
      fasterLongitude: pf.longitude,
      slowerLongitude: ps.longitude,
      fasterDegreeInSign: pf.degreeInSign,
      slowerDegreeInSign: ps.degreeInSign,
      signDistance: tajikaSignDistance(pf.rashiIndex, ps.rashiIndex),
      aspect,
      degreeGap: gap,
      fasterDeeptamsha: tajikaDeeptamsha(f),
      slowerDeeptamsha: tajikaDeeptamsha(s),
      allowedOrb,
      withinOrb,
      fasterRetrograde: pf.isRetrograde,
      slowerRetrograde: ps.isRetrograde,
      motion: aspect !== 'NONE' && withinOrb ? (applying ? 'APPLYING' : 'SEPARATING') : 'NONE',
    };
  };
  const pair = (a: TajikaGraha, b: TajikaGraha) => pairWith(a, pos.get(a)!, b, pos.get(b)!);
  const isBhavishyat = (e: TajikaPairEvidence): boolean => {
    if (e.aspect === 'NONE' || e.withinOrb) return false;
    const applyingSense = e.fasterRetrograde ? e.degreeGap < 0 : e.degreeGap > 0;
    return applyingSense && Math.abs(e.degreeGap) - e.allowedOrb <= 1;
  };
  /** Position at 0° of the next sign (the "after moving to the next rasi" test of §29.2.9 / §29.2.14). */
  const nextSignStart = (p: PointPos): PointPos => pointFromLongitude(p.rashiIndex * 30, p.isRetrograde);
  const inLastDegree = (p: PointPos) => p.degreeInSign >= 29 && !p.isRetrograde;

  const pairs: Array<[TajikaGraha, TajikaGraha]> = [];
  for (let i = 0; i < TAJIKA_GRAHAS.length; i++) for (let j = i + 1; j < TAJIKA_GRAHAS.length; j++) pairs.push([TAJIKA_GRAHAS[i], TAJIKA_GRAHAS[j]]);
  const ev = new Map<string, TajikaPairEvidence>();
  const key = (a: TajikaGraha, b: TajikaGraha) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const [a, b] of pairs) ev.set(key(a, b), pair(a, b));
  const evOf = (a: TajikaGraha, b: TajikaGraha) => ev.get(key(a, b))!;
  const ithasala = (a: TajikaGraha, b: TajikaGraha) => evOf(a, b).motion === 'APPLYING';
  const presentIthasalas = pairs.map(([a, b]) => evOf(a, b)).filter((e) => e.motion === 'APPLYING');

  const strong = (p: TajikaGraha) => st.get(p)!.isExalted || st.get(p)!.isOwnSign || st.get(p)!.panchaVargiyaBala >= 10;
  const strengthFacts = (p: TajikaGraha) => {
    const s = st.get(p)!;
    return `${p}: exalted=${s.isExalted}, debilitated=${s.isDebilitated}, ownSign=${s.isOwnSign}, signLord=${s.signLordRelationship ?? 'OWN'}, panchaVargiyaBala=${s.panchaVargiyaBala.toFixed(2)}`;
  };
  const afflictionFacts = (p: TajikaGraha) => {
    const s = st.get(p)!;
    return `${p}: house=${s.house}, combust=${s.isCombust}, retrograde=${s.isRetrograde}, debilitated=${s.isDebilitated}`;
  };

  const found = new Map<TajikaSixteenYogaId, TajikaYogaOccurrence[]>(YOGA_META.map((m) => [m.id, []]));
  const add = (id: TajikaSixteenYogaId, o: TajikaYogaOccurrence) => found.get(id)!.push(o);

  // §29.2.1 / §29.2.2
  const houses = states.map((s) => `${s.planet}:${s.house}`);
  if (states.every((s) => KENDRA_PANAPHARA.has(s.house))) add('IKKAVALA', { planets: [...TAJIKA_GRAHAS], roles: {}, evidence: [], facts: houses });
  if (states.every((s) => APOKLIMA.has(s.house))) add('INDUVARA', { planets: [...TAJIKA_GRAHAS], roles: {}, evidence: [], facts: houses });

  // §29.2.3 / §29.2.4
  for (const [a, b] of pairs) {
    const e = evOf(a, b);
    const roles = { faster: e.faster, slower: e.slower };
    if (e.motion === 'APPLYING') {
      add('ITHASALA', { planets: [e.faster, e.slower], roles, variant: Math.abs(e.degreeGap) <= 1 ? 'POORNA' : 'VARTAMANA', evidence: [e], facts: [] });
    } else if (e.motion === 'SEPARATING') {
      add('ISHRAFA', { planets: [e.faster, e.slower], roles, evidence: [e], facts: [] });
    } else if (isBhavishyat(e)) {
      add('ITHASALA', { planets: [e.faster, e.slower], roles, variant: 'BHAVISHYAT', evidence: [e], facts: [`gap ${Math.abs(e.degreeGap).toFixed(4)}° exceeds orb ${e.allowedOrb}° by ${(Math.abs(e.degreeGap) - e.allowedOrb).toFixed(4)}° (<= 1°)`] });
    }
  }

  // §29.2.5 / §29.2.6
  for (const [a, b] of pairs) {
    if (evOf(a, b).motion !== 'NONE') continue;
    for (const t of TAJIKA_GRAHAS) {
      if (t === a || t === b || !ithasala(t, a) || !ithasala(t, b)) continue;
      const evidence = [evOf(t, a), evOf(t, b), evOf(a, b)];
      if (tajikaIsFaster(t, a) && tajikaIsFaster(t, b)) add('NAKTA', { planets: [a, b, t], roles: { first: a, second: b, intermediary: t }, evidence, facts: [] });
      if (tajikaIsFaster(a, t) && tajikaIsFaster(b, t)) add('YAMAYA', { planets: [a, b, t], roles: { first: a, second: b, intermediary: t }, evidence, facts: [] });
    }
  }

  for (const e of presentIthasalas) {
    const f = e.faster;
    const s = e.slower;
    const roles = { faster: f, slower: s };
    // §29.2.7
    for (const m of [PlanetSymbol.MARS, PlanetSymbol.SATURN] as TajikaGraha[]) {
      if (m === f || m === s) continue;
      const pm = pos.get(m)!;
      const pf = pos.get(f)!;
      const conj = pm.rashiIndex === pf.rashiIndex;
      const asp = tajikaAspectName(pm.rashiIndex, pf.rashiIndex, opts.includeSemiSextile) !== 'NONE';
      const dist = Math.abs(pm.degreeInSign - pf.degreeInSign);
      if ((conj || (opts.manahooByAspect && asp)) && dist <= tajikaDeeptamsha(f)) {
        add('MANAHOO', { planets: [f, s, m], roles: { ...roles, obstructor: m }, evidence: [e, evOf(m, f)], facts: [`${m} ${conj ? 'conjunct' : 'aspecting'} ${f} at ${dist.toFixed(4)}° <= deeptamsha of ${f} (${tajikaDeeptamsha(f)}°)`] });
      }
    }
    // §29.2.8 / §29.2.9
    const moon = PlanetSymbol.MOON as TajikaGraha;
    if (f !== moon && s !== moon) {
      const mf = ithasala(moon, f);
      const ms = ithasala(moon, s);
      if (mf || ms) {
        add('KAMBOOLA', { planets: [f, s, moon], roles: { ...roles, moon }, evidence: [e, ...(mf ? [evOf(moon, f)] : []), ...(ms ? [evOf(moon, s)] : [])], facts: [] });
      } else if (inLastDegree(pos.get(moon)!)) {
        const future = nextSignStart(pos.get(moon)!);
        const futF = pairWith(moon, future, f, pos.get(f)!);
        const futS = pairWith(moon, future, s, pos.get(s)!);
        const hits = [futF, futS].filter((x) => x.motion === 'APPLYING');
        if (hits.length > 0) {
          const strongPartners = TAJIKA_GRAHAS.filter((p) => p !== moon && strong(p) && pairWith(moon, future, p, pos.get(p)!).motion === 'APPLYING');
          const mp = pos.get(moon)!;
          const d9 = vargaCalc.calculateLongitudeVarga(mp.longitude, 'D9');
          const d3 = vargaCalc.calculateLongitudeVarga(mp.longitude, 'D3');
          const moonClear = !st.get(moon)!.isExalted && !st.get(moon)!.isDebilitated && getRashiRuler(d9) !== moon && getRashiRuler(d3) !== moon;
          add('GAIRI_KAMBOOLA', {
            planets: [f, s, moon],
            roles: { ...roles, moon },
            evidence: [e, ...hits],
            facts: [
              `Moon at ${mp.degreeInSign.toFixed(4)}° of sign ${mp.rashiIndex}; evidence uses the Moon at 0° of sign ${future.rashiIndex}`,
              `strong planets in future Ithasala with the Moon: ${strongPartners.join(', ') || 'none'}`,
              `Moon exalted=${st.get(moon)!.isExalted}, debilitated=${st.get(moon)!.isDebilitated}, navamsha lord=${getRashiRuler(d9)}, drekkana lord=${getRashiRuler(d3)} (the Moon rules no hadda)`,
            ],
            effective: strongPartners.length > 0 && moonClear,
          });
        }
      }
    }
    // §29.2.11
    const radda = [f, s].filter((p) => st.get(p)!.isDebilitated || st.get(p)!.isRetrograde || st.get(p)!.isCombust);
    if (radda.length > 0) add('RADDA', { planets: [f, s], roles, evidence: [e], facts: radda.map(afflictionFacts) });
    // §29.2.12
    const sf = st.get(f)!;
    const fasterWeak = !sf.isExalted && !sf.isOwnSign && sf.panchaVargiyaBala < 5;
    if (strong(s) && fasterWeak) add('DUPHALI_KUTTHA', { planets: [f, s], roles, evidence: [e], facts: [strengthFacts(s), strengthFacts(f)] });
    // §29.2.13
    const weak = (p: TajikaGraha) => {
      const x = st.get(p)!;
      return x.isDebilitated || x.signLordRelationship === 'ENEMY' || x.signLordRelationship === 'GREAT_ENEMY' || x.panchaVargiyaBala < 5;
    };
    if (weak(f) && weak(s)) {
      for (const c of TAJIKA_GRAHAS) {
        if (c === f || c === s || !strong(c)) continue;
        for (const member of [f, s]) {
          if (ithasala(member, c)) {
            add('DUTTHOTTHA_DAVIRA', { planets: [f, s, c], roles: { ...roles, linked: member, strongPlanet: c }, evidence: [e, evOf(member, c)], facts: [strengthFacts(f), strengthFacts(s), strengthFacts(c)] });
          }
        }
      }
    }
    // §29.2.16
    const afflicted = (p: TajikaGraha) => {
      const x = st.get(p)!;
      return DUSTHANA.has(x.house) || x.isCombust || x.isRetrograde || x.isDebilitated;
    };
    if (afflicted(f) && afflicted(s)) add('DURUPHA', { planets: [f, s], roles, evidence: [e], facts: [afflictionFacts(f), afflictionFacts(s)] });
  }

  // §29.2.10
  const lagnesha = getRashiRuler(ascRashi) as TajikaGraha;
  const moon = PlanetSymbol.MOON as TajikaGraha;
  if (lagnesha !== moon) {
    const m = pos.get(moon)!.rashiIndex;
    const l = pos.get(lagnesha)!.rashiIndex;
    for (const x of TAJIKA_GRAHAS) {
      if (x === moon || x === lagnesha) continue;
      const xr = pos.get(x)!.rashiIndex;
      const fwd = tajikaSignDistance(m, l) === 2 && tajikaSignDistance(m, xr) === 3;
      const back = tajikaSignDistance(l, m) === 2 && tajikaSignDistance(xr, m) === 3;
      if ((fwd || back) && !ithasala(lagnesha, moon) && !ithasala(lagnesha, x)) {
        add('KHALLASARA', { planets: [moon, lagnesha, x], roles: { moon, lagnesha, x }, evidence: [evOf(lagnesha, moon), evOf(lagnesha, x)], facts: [`signs: Moon ${m}, lagna lord ${l}, ${x} ${xr}`] });
      }
    }
  }

  // §29.2.14
  for (const p of TAJIKA_GRAHAS) {
    const pp = pos.get(p)!;
    if (!inLastDegree(pp)) continue;
    const future = nextSignStart(pp);
    for (const q of TAJIKA_GRAHAS) {
      if (q === p || !tajikaIsFaster(p, q) || ithasala(p, q)) continue;
      const fe = pairWith(p, future, q, pos.get(q)!);
      if (fe.motion === 'APPLYING') {
        add('TAMBIRA', { planets: [p, q], roles: { faster: p, slower: q }, evidence: [evOf(p, q), fe], facts: [`${p} at ${pp.degreeInSign.toFixed(4)}° of sign ${pp.rashiIndex}; second evidence row uses ${p} at 0° of sign ${future.rashiIndex}`] });
      }
    }
  }

  // §29.2.15
  for (const a of TAJIKA_GRAHAS) {
    if (st.get(a)!.house !== 1) continue;
    for (const b of TAJIKA_GRAHAS) {
      if (b === a) continue;
      const sb = st.get(b)!;
      if (!(sb.isOwnSign || sb.isExalted) || !KENDRA_PANAPHARA.has(sb.house)) continue;
      if (tajikaAspectName(sb.rashiIndex, st.get(a)!.rashiIndex, opts.includeSemiSextile) === 'NONE') continue;
      add('KUTTHA', { planets: [a, b], roles: { inLagna: a, aspecting: b }, evidence: [evOf(a, b)], facts: [`${b}: house ${sb.house}, ownSign=${sb.isOwnSign}, exalted=${sb.isExalted}`] });
    }
  }

  const yogas: TajikaYogaEntry[] = YOGA_META.map((m) => {
    const occurrences = found.get(m.id)!;
    return { id: m.id, name: m.name, alternateNames: m.alternateNames, present: occurrences.length > 0, occurrences, rule: m.rule, source: `${NEELAKANTHI}; ${BOOK} ${m.section}` };
  });

  return {
    ascendantRashiIndex: ascRashi,
    planets: states,
    yogas,
    options: opts,
    provisional: true,
    source: TAJIKA_SIXTEEN_YOGAS_SOURCE,
    conventionNotes: [
      'Seven grahas only (Sun..Saturn); the nodes and outer planets take no part. Houses are whole signs from the chart ascendant.',
      'Faster/slower follows the natural speed order of the source (ch. 29 fn. 83), not the instantaneous speed.',
      'Aspects are sign-based Tajika aspects (1, 3/11, 4/10, 5/9, 7). The 2/12 semi-sextile (a neutral aspect in ch. 28 §28.2, used in some ch. 29 examples) is counted only with includeSemiSextile.',
      `Orb rule ${opts.orbRule}: ${opts.orbRule === 'MUTUAL' ? 'each planet within the other\'s deeptamsha, i.e. gap <= min of the two (§29.2.3 worked example)' : 'gap <= half the sum of the two deeptamshas'}. Alternative: ${opts.orbRule === 'MUTUAL' ? 'HALF_SUM (engine TajikaYogasCalculator)' : 'MUTUAL (§29.2.3)'}.`,
      'Retrogression (§29.2.3 special notes): a retrograde faster planet that is behind is separating, and one that is ahead is applying. The "about to turn retrograde" refinement and the "smaller gap under retrogression" remark are not quantified by the source and are not applied.',
      'Nakta, Yamaya, Manahoo, Kamboola, Radda and the later yogas build on present (Vartamana/Poorna) Ithasala only, not Bhavishyat.',
      '"Last degree of a sign" (Gairi-Kamboola, Tambira) = 29° or more, direct motion; the future Ithasala is tested with the planet at 0° of the next sign.',
      'Manahoo uses conjunction only, as the source advises; aspect-based Manahoo is option manahooByAspect.',
      'Duphali-kuttha: the source\'s wording (faster strong / slower weak) and its worked example (slower strong / faster weak) disagree; the worked example is implemented.',
      'Strong = exalted, own sign or Pancha-vargiya Bala >= 10 ("strong", §28.4.6); weak = Pancha-vargiya Bala < 5 ("weak", §28.4.6), plus debilitation / inimical sign where the yoga text names them.',
      'Durupha: the source requires both Ithasala planets to be in a dusthana or combust or retrograde or debilitated; its example (both debilitated, not in dusthanas) shows any one affliction per planet suffices.',
      'Khallasara: "the sign between" is read as Moon and X two signs apart with the lagna lord in the sign between them (either direction). Other authors define Khallasara differently.',
      'Kuttha: the aspect is the sign-based Tajika aspect; the evidence row shows the orb but it is not required.',
      'Combustion uses the engine\'s calculateCombustion orbs (planets/combustion.ts).',
      'Verse numbers of Tajika Neelakanthi are not cited (the edition used for verse numbering is not fixed); section numbers of the cited English text are given instead.',
    ],
  };
}
