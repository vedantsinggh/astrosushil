/**
 * Career report — deterministic calculations built on @astro/astrology-engine
 * primitives only. Every function here is pure given the snapshot (and, for
 * transits, the ephemeris), so identical inputs always give identical output.
 *
 * Rules used (classical basis, see docs/report-system/decisions/career.md):
 *  - Graha drishti (BPHS ch. 26): all planets 7th; Mars 4/8; Jupiter 5/9;
 *    Saturn 3/10; Rahu/Ketu 5/9 (engine convention, Phaladeepika tradition).
 *  - Whole-sign house lords; D10 houses counted from the D10 ascendant.
 *  - Karmajiva (Brihat Jataka ch. 10): livelihood planet = lord of the
 *    Navamsa sign occupied by the lord of the 10th from Lagna, Moon and Sun.
 *  - Bhrigu Nandi Nadi (classical BNN): Saturn is the karma karaka; planets in
 *    the same sign, in trines (5th/9th) and in the 2nd/12th signs from Saturn
 *    are read as linked to it. No degree-based "chain" is computed.
 *  - Sarvashtakavarga benchmark of 28 bindus (BPHS Ashtakavarga chapters).
 */
import {
  getAspectedHouses,
  getRashiRuler,
  isDebilitated,
  isExalted,
  isOwnSign,
  PlanetSymbol,
  RASHIS,
  TransitIngressSolver,
} from '@astro/astrology-engine';
import { ordinal, PlanetName, planetName, PLANETS, SIGNS } from '../../../evidence/evidence-registry';
import { ChartSnapshot } from '../../../snapshot/chart-snapshot';
import { msToJd } from '../../../snapshot/transit-periods';

export const CAREER_HOUSES = [1, 2, 6, 7, 10, 11] as const;

/** 1-based sign index counted `n` signs from `from` (n = 1 is the same sign). */
export const signFrom = (from: number, n: number) => ((from - 1 + n - 1) % 12) + 1;
/** Position (1–12) of sign `target` counted from sign `from`. */
export const countFrom = (from: number, target: number) => ((target - from + 12) % 12) + 1;

export const signLord = (rashiIndex: number): PlanetName => planetName(getRashiRuler(rashiIndex));
const symbolOf = (name: PlanetName) => name.toUpperCase() as PlanetSymbol;
const signIdx = (name: string) => SIGNS.indexOf(name as (typeof SIGNS)[number]) + 1;

// ---------------------------------------------------------------------------
// D1 house aspects
// ---------------------------------------------------------------------------

export interface HouseAspect {
  planet: PlanetName;
  /** Aspect counted from the aspecting planet (3, 4, 5, 7, 8, 9 or 10). */
  aspect: number;
}

/** Planets casting graha drishti on each D1 house (whole sign). */
export function houseAspects(snapshot: ChartSnapshot): Record<number, HouseAspect[]> {
  const out: Record<number, HouseAspect[]> = {};
  for (let h = 1; h <= 12; h++) out[h] = [];
  for (const p of snapshot.natal.planets) {
    const name = planetName(p.name);
    for (const a of getAspectedHouses(p.name, p.house)) {
      out[a.house].push({ planet: name, aspect: countFrom(p.house, a.house) });
    }
  }
  for (const h of Object.keys(out)) out[Number(h)].sort((a, b) => PLANETS.indexOf(a.planet) - PLANETS.indexOf(b.planet));
  return out;
}

// ---------------------------------------------------------------------------
// D10 (Dashamsha)
// ---------------------------------------------------------------------------

export type SignDignity = 'exalted' | 'debilitated' | 'own sign' | 'neither exalted, debilitated nor in own sign';

export function signDignity(planet: PlanetName, rashiIndex: number): SignDignity {
  if (planet === 'Rahu' || planet === 'Ketu') return 'neither exalted, debilitated nor in own sign';
  const s = symbolOf(planet);
  if (isExalted(s, rashiIndex)) return 'exalted';
  if (isDebilitated(s, rashiIndex)) return 'debilitated';
  if (isOwnSign(s, rashiIndex)) return 'own sign';
  return 'neither exalted, debilitated nor in own sign';
}

export interface D10House {
  house: number;
  sign: string;
  signIndex: number;
  lord: PlanetName;
  lordHouse: number;
  lordSign: string;
  occupants: PlanetName[];
}

export interface D10Analysis {
  ascSign: string;
  ascSignIndex: number;
  houses: D10House[];
  planets: Record<PlanetName, { sign: string; signIndex: number; house: number; dignity: SignDignity }>;
}

export function d10Analysis(snapshot: ChartSnapshot): D10Analysis {
  const chart = snapshot.vargas.D10;
  if (!chart?.ascendant) throw new Error('CAREER_D10_MISSING: the D10 chart was not computed');
  const asc = chart.ascendant.rashiIndex;
  const planets = {} as D10Analysis['planets'];
  for (const pl of Object.values(chart.placements)) {
    if (pl.planet === 'Ascendant') continue;
    const name = planetName(String(pl.planet));
    planets[name] = { sign: SIGNS[pl.rashiIndex - 1], signIndex: pl.rashiIndex, house: countFrom(asc, pl.rashiIndex), dignity: signDignity(name, pl.rashiIndex) };
  }
  const houses: D10House[] = [];
  for (let h = 1; h <= 12; h++) {
    const s = signFrom(asc, h);
    const lord = signLord(s);
    houses.push({
      house: h, sign: SIGNS[s - 1], signIndex: s, lord,
      lordHouse: planets[lord].house, lordSign: planets[lord].sign,
      occupants: PLANETS.filter((p) => planets[p]?.house === h),
    });
  }
  return { ascSign: SIGNS[asc - 1], ascSignIndex: asc, houses, planets };
}

// ---------------------------------------------------------------------------
// Bhrigu Nandi Nadi — Saturn as karma karaka
// ---------------------------------------------------------------------------

export interface BnnSaturn {
  saturnSign: string;
  saturnSignIndex: number;
  retrograde: boolean;
  /** Planets in Saturn's own sign (conjunction). */
  conjunct: PlanetName[];
  /** Planets in the 5th and 9th signs from Saturn. */
  trine5: PlanetName[];
  trine9: PlanetName[];
  /** Planet(s) in the sign after Saturn (2nd) and the sign before Saturn (12th). */
  second: PlanetName[];
  twelfth: PlanetName[];
  /** Signs Saturn aspects (3rd, 7th, 10th) and the planets there. */
  aspects: Array<{ aspect: number; sign: string; planets: PlanetName[] }>;
}

export function bnnSaturn(snapshot: ChartSnapshot): BnnSaturn {
  const sat = snapshot.natal.planets.find((p) => planetName(p.name) === 'Saturn')!;
  const at = (n: number) =>
    snapshot.natal.planets
      .filter((p) => planetName(p.name) !== 'Saturn' && p.rashiIndex === signFrom(sat.rashiIndex, n))
      .map((p) => planetName(p.name));
  return {
    saturnSign: sat.sign,
    saturnSignIndex: sat.rashiIndex,
    retrograde: sat.retrograde,
    conjunct: at(1),
    trine5: at(5),
    trine9: at(9),
    second: at(2),
    twelfth: at(12),
    aspects: [3, 7, 10].map((n) => ({ aspect: n, sign: SIGNS[signFrom(sat.rashiIndex, n) - 1], planets: at(n) })),
  };
}

// ---------------------------------------------------------------------------
// Karmajiva (Brihat Jataka ch. 10)
// ---------------------------------------------------------------------------

export interface KarmajivaRow {
  from: 'Lagna' | 'Moon' | 'Sun';
  tenthSign: string;
  tenthLord: PlanetName;
  lordNavamsaSign: string;
  karmajivaPlanet: PlanetName;
}

export function karmajiva(snapshot: ChartSnapshot): KarmajivaRow[] {
  const d9 = snapshot.vargas.D9;
  if (!d9) throw new Error('CAREER_D9_MISSING: the D9 chart was not computed');
  const natal = snapshot.natal;
  const refs: Array<[KarmajivaRow['from'], number]> = [
    ['Lagna', natal.ascendant.rashiIndex],
    ['Moon', natal.planets.find((p) => planetName(p.name) === 'Moon')!.rashiIndex],
    ['Sun', natal.planets.find((p) => planetName(p.name) === 'Sun')!.rashiIndex],
  ];
  return refs.map(([from, s]) => {
    const tenth = signFrom(s, 10);
    const lord = signLord(tenth);
    const placement = Object.values(d9.placements).find((pl) => pl.planet !== 'Ascendant' && planetName(String(pl.planet)) === lord)!;
    return {
      from, tenthSign: SIGNS[tenth - 1], tenthLord: lord,
      lordNavamsaSign: SIGNS[placement.rashiIndex - 1], karmajivaPlanet: signLord(placement.rashiIndex),
    };
  });
}

// ---------------------------------------------------------------------------
// Vocational signature (descriptive sign qualities)
// ---------------------------------------------------------------------------

export interface SignQuality {
  sign: string;
  element: 'fire' | 'earth' | 'air' | 'water';
  modality: 'movable' | 'fixed' | 'dual';
}

export function signQuality(signName: string): SignQuality {
  const r = RASHIS[signIdx(signName) - 1];
  const modality = r.modality === 'CHARA' ? 'movable' : r.modality === 'STHIRA' ? 'fixed' : 'dual';
  return { sign: signName, element: r.element.toLowerCase() as SignQuality['element'], modality };
}

// ---------------------------------------------------------------------------
// Ashtakavarga job/business comparison
// ---------------------------------------------------------------------------

export const SAV_BENCHMARK = 28;

export function savByHouse(snapshot: ChartSnapshot): Record<number, number> {
  const out: Record<number, number> = {};
  for (const h of snapshot.natal.houses) out[h.number] = Number(snapshot.ashtakavarga.sav.signs[h.rashiIndex as keyof typeof snapshot.ashtakavarga.sav.signs]);
  return out;
}

export type Comparison = 'higher' | 'lower' | 'equal';
export const compare = (a: number, b: number): Comparison => (a > b ? 'higher' : a < b ? 'lower' : 'equal');

// ---------------------------------------------------------------------------
// Sun / Saturn reference counts and the government-service facts
// ---------------------------------------------------------------------------

export interface PlanetFrames {
  planet: PlanetName;
  sign: string;
  house: number;
  fromMoon: number;
  fromTenth: number;
}

export function planetFrames(snapshot: ChartSnapshot, name: PlanetName): PlanetFrames {
  const p = snapshot.natal.planets.find((x) => planetName(x.name) === name)!;
  const moon = snapshot.natal.planets.find((x) => planetName(x.name) === 'Moon')!;
  return { planet: name, sign: p.sign, house: p.house, fromMoon: countFrom(moon.rashiIndex, p.rashiIndex), fromTenth: countFrom(10, p.house) };
}

export interface SunSaturnRelation {
  /** Descriptions of each link found, e.g. "conjunction", "Saturn aspects the Sun (3rd aspect)". */
  links: string[];
}

export function sunSaturnRelation(snapshot: ChartSnapshot): SunSaturnRelation {
  const sun = snapshot.natal.planets.find((x) => planetName(x.name) === 'Sun')!;
  const sat = snapshot.natal.planets.find((x) => planetName(x.name) === 'Saturn')!;
  const links: string[] = [];
  if (sun.rashiIndex === sat.rashiIndex) links.push('conjunction (same sign)');
  const satOnSun = getAspectedHouses(PlanetSymbol.SATURN, sat.house).some((a) => a.house === sun.house);
  const sunOnSat = getAspectedHouses(PlanetSymbol.SUN, sun.house).some((a) => a.house === sat.house);
  if (satOnSun && sun.rashiIndex !== sat.rashiIndex) links.push(`Saturn aspects the Sun (${ordinal(countFrom(sat.house, sun.house))} aspect)`);
  if (sunOnSat && sun.rashiIndex !== sat.rashiIndex) links.push('the Sun aspects Saturn (7th aspect)');
  return { links };
}

/** How the Sun relates to the 10th house: rules it, occupies it, aspects it. */
export function sunAndTenth(snapshot: ChartSnapshot): string[] {
  const sun = snapshot.natal.planets.find((x) => planetName(x.name) === 'Sun')!;
  const tenth = snapshot.natal.houses.find((h) => h.number === 10)!;
  const out: string[] = [];
  if (planetName(tenth.lord) === 'Sun') out.push('the Sun rules the 10th house');
  if (sun.house === 10) out.push('the Sun occupies the 10th house');
  if (getAspectedHouses(PlanetSymbol.SUN, sun.house).some((a) => a.house === 10)) out.push('the Sun aspects the 10th house');
  return out;
}

// ---------------------------------------------------------------------------
// Career-relevant yogas (engine-detected only)
// ---------------------------------------------------------------------------

const CAREER_YOGA_CATEGORIES = new Set(['RAJA', 'DHANA', 'MAHAPURUSHA', 'SURYA', 'NEECHA_BHANGA', 'PARIVARTANA', 'VIPARITA']);
const CAREER_YOGA_IDS = new Set(['YOGA_GAJAKESARI', 'YOGA_CHANDRA_MANGALA', 'YOGA_AMALA', 'YOGA_DHARMA_KARMADHIPATI', 'YOGA_LAKSHMI', 'YOGA_SARASWATI', 'YOGA_BUDHA_ADITYA']);

export interface CareerYoga {
  id: string;
  evidenceId: string;
  name: string;
  category: string;
  conditions: string[];
}

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Detected yogas that classical texts tie to status, work or earnings. Never adds a yoga the engine did not detect. */
export function careerYogas(snapshot: ChartSnapshot): CareerYoga[] {
  return snapshot.yogas
    .filter((y) => y.isDetected)
    .filter((y) => CAREER_YOGA_CATEGORIES.has(y.category) || CAREER_YOGA_IDS.has(y.id))
    .map((y) => ({
      id: y.id,
      evidenceId: `yoga.${slug(y.id.replace(/^YOGA_/, ''))}`,
      name: y.canonicalName,
      category: y.category,
      conditions: y.evidence.conditions.filter((c) => c.satisfied).map((c) => c.description),
    }));
}

// ---------------------------------------------------------------------------
// Dasha timeline with career links
// ---------------------------------------------------------------------------

export interface DashaRow {
  lord: PlanetName;
  startIso: string;
  endIso: string;
  active: boolean;
  rules: number[];
  house: number;
  d10House: number;
  /** Career houses the lord rules or occupies in D1, and its D10 house when it is 1/10/11. */
  careerLinks: string[];
}

const CAREER_HOUSE_SET = new Set([2, 6, 10, 11]);

export function careerLinksFor(snapshot: ChartSnapshot, d10: D10Analysis, lord: PlanetName): Omit<DashaRow, 'startIso' | 'endIso' | 'active' | 'lord'> {
  const p = snapshot.natal.planets.find((x) => planetName(x.name) === lord)!;
  const links: string[] = [];
  for (const h of p.lordship) if (CAREER_HOUSE_SET.has(h)) links.push(`rules the ${ordinal(h)}`);
  if (CAREER_HOUSE_SET.has(p.house)) links.push(`occupies the ${ordinal(p.house)}`);
  if (getAspectedHouses(p.name, p.house).some((a) => a.house === 10)) links.push('aspects the 10th');
  const dh = d10.planets[lord].house;
  if ([1, 10, 11].includes(dh)) links.push(`D10 house ${dh}`);
  if (d10.houses[9].lord === lord) links.push('rules the D10 10th');
  return { rules: p.lordship, house: p.house, d10House: dh, careerLinks: links };
}

export function dashaTimeline(snapshot: ChartSnapshot, d10: D10Analysis): DashaRow[] {
  const asOf = Date.parse(snapshot.asOfIso);
  return snapshot.vimshottari.mahadashas.map((md) => {
    const lord = planetName(md.lord);
    return {
      lord, startIso: md.startDateIso, endIso: md.endDateIso,
      active: Date.parse(md.startDateIso) <= asOf && asOf < Date.parse(md.endDateIso),
      ...careerLinksFor(snapshot, d10, lord),
    };
  });
}

export interface AntardashaRow {
  lord: PlanetName;
  startIso: string;
  endIso: string;
  active: boolean;
}

export function currentAntardashas(snapshot: ChartSnapshot): AntardashaRow[] {
  const asOf = Date.parse(snapshot.asOfIso);
  const md = snapshot.vimshottari.mahadashas.find((m) => Date.parse(m.startDateIso) <= asOf && asOf < Date.parse(m.endDateIso));
  return (md?.subPeriods ?? []).map((ad) => ({
    lord: planetName(ad.lord), startIso: ad.startDateIso, endIso: ad.endDateIso,
    active: Date.parse(ad.startDateIso) <= asOf && asOf < Date.parse(ad.endDateIso),
  }));
}

// ---------------------------------------------------------------------------
// Transits: true sign periods (actual ingress dates, not clipped to the report date)
// ---------------------------------------------------------------------------

export interface TransitPeriod {
  planet: PlanetName;
  sign: string;
  signIndex: number;
  startIso: string;
  endIso: string;
  /** Movement at the ingress that began the period (nodes are always retrograde). */
  retrogradeEntry: boolean;
  fromAsc: number;
  fromMoon: number;
}

export interface TransitSet {
  planet: PlanetName;
  current: TransitPeriod;
  upcoming: TransitPeriod[];
}

const TRANSIT_WINDOWS: Record<'Saturn' | 'Jupiter' | 'Rahu' | 'Ketu', { back: number; ahead: number }> = {
  Saturn: { back: 3.6, ahead: 9 },
  Jupiter: { back: 1.6, ahead: 4 },
  Rahu: { back: 2, ahead: 6 },
  Ketu: { back: 2, ahead: 6 },
};

export async function careerTransits(snapshot: ChartSnapshot, solver = new TransitIngressSolver()): Promise<TransitSet[]> {
  const asOfMs = Date.parse(snapshot.asOfIso);
  const asOfJd = msToJd(asOfMs);
  const ascIdx = snapshot.natal.ascendant.rashiIndex;
  const moonIdx = snapshot.natal.planets.find((p) => planetName(p.name) === 'Moon')!.rashiIndex;
  const out: TransitSet[] = [];
  for (const [name, win] of Object.entries(TRANSIT_WINDOWS) as Array<[PlanetName & keyof typeof TRANSIT_WINDOWS, { back: number; ahead: number }]>) {
    const sym = symbolOf(name);
    const events = await solver.findSignIngresses(sym, asOfJd - win.back * 365.25, asOfJd + win.ahead * 365.25);
    const periods: TransitPeriod[] = [];
    for (let i = 0; i + 1 < events.length; i++) {
      const ev = events[i];
      const to = ev.toSign!.index;
      const from = ev.fromSign!.index;
      periods.push({
        planet: name, sign: SIGNS[to - 1], signIndex: to,
        startIso: ev.timestampIso, endIso: events[i + 1].timestampIso,
        retrogradeEntry: countFrom(from, to) === 12,
        fromAsc: countFrom(ascIdx, to), fromMoon: countFrom(moonIdx, to),
      });
    }
    const ci = periods.findIndex((p) => Date.parse(p.startIso) <= asOfMs && asOfMs < Date.parse(p.endIso));
    if (ci < 0) throw new Error(`CAREER_TRANSIT_WINDOW: no complete ${name} period contains the report date`);
    out.push({ planet: name, current: periods[ci], upcoming: periods.slice(ci + 1, ci + 4) });
  }
  return out;
}

/** "2 years 3 months" style duration (calendar arithmetic, UTC). */
export function durationText(startIso: string, endIso: string): string {
  const a = new Date(startIso);
  const b = new Date(endIso);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y) parts.push(`${y} year${y > 1 ? 's' : ''}`);
  if (m) parts.push(`${m} month${m > 1 ? 's' : ''}`);
  if (!parts.length) {
    const days = Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
    parts.push(`${days} day${days > 1 ? 's' : ''}`);
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Aggregate (module `extend` output)
// ---------------------------------------------------------------------------

export interface CareerExt {
  aspects: Record<number, HouseAspect[]>;
  d10: D10Analysis;
  bnn: BnnSaturn;
  karmajiva: KarmajivaRow[];
  sav: Record<number, number>;
  sun: PlanetFrames;
  saturn: PlanetFrames;
  sunSaturn: SunSaturnRelation;
  sunTenth: string[];
  yogas: CareerYoga[];
  dashas: DashaRow[];
  antardashas: AntardashaRow[];
  transits: TransitSet[];
}

export async function computeCareer(snapshot: ChartSnapshot, solver?: TransitIngressSolver): Promise<CareerExt> {
  const d10 = d10Analysis(snapshot);
  return {
    aspects: houseAspects(snapshot),
    d10,
    bnn: bnnSaturn(snapshot),
    karmajiva: karmajiva(snapshot),
    sav: savByHouse(snapshot),
    sun: planetFrames(snapshot, 'Sun'),
    saturn: planetFrames(snapshot, 'Saturn'),
    sunSaturn: sunSaturnRelation(snapshot),
    sunTenth: sunAndTenth(snapshot),
    yogas: careerYogas(snapshot),
    dashas: dashaTimeline(snapshot, d10),
    antardashas: currentAntardashas(snapshot),
    transits: await careerTransits(snapshot, solver),
  };
}

export function careerExt(ext: Record<string, unknown>): CareerExt {
  const c = ext.career as CareerExt | undefined;
  if (!c) throw new Error('CAREER_EXT_MISSING: career extend() output not available');
  return c;
}
