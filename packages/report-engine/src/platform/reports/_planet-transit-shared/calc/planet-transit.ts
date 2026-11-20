/**
 * Everything the planet-transit family (Saturn, Jupiter, Rahu–Ketu) computes
 * for one planet: natal placement facts, transit sign stays with retrograde
 * re-entries and stations, transit houses from the Lagna and the Moon,
 * transit aspects onto natal planets and Ashtakavarga support of each sign.
 *
 * All values derive from the chart snapshot and the engine's
 * TransitIngressSolver; nothing is read from fixed tables.
 */
import {
  getAspectedSigns,
  getNaturalRelationship,
  PlanetSymbol,
  TransitIngressSolver,
} from '@astro/astrology-engine';
import { planetName, PLANETS } from '../../../evidence/evidence-registry';
import { ChartSnapshot } from '../../../snapshot/chart-snapshot';
import {
  computeSignSpans,
  computeStations,
  groupStays,
  houseFrom,
  msToJd,
  pairRetroWindows,
  pickCurrentAndNext,
  RetroWindow,
  signAt,
  signName,
  SignSpan,
  SignStay,
  Station,
  windowsOverlapping,
  YEAR_MS,
} from './timeline';

export type PlanetKey = 'saturn' | 'jupiter' | 'rahu' | 'ketu';
export const PLANET_SYMBOL: Record<PlanetKey, PlanetSymbol> = {
  saturn: PlanetSymbol.SATURN, jupiter: PlanetSymbol.JUPITER, rahu: PlanetSymbol.RAHU, ketu: PlanetSymbol.KETU,
};
export const PLANET_NAME: Record<PlanetKey, string> = { saturn: 'Saturn', jupiter: 'Jupiter', rahu: 'Rahu', ketu: 'Ketu' };

export interface AspectHit {
  /** Aspect counted inclusively from the planet's sign (3rd, 5th, 7th, 9th, 10th). */
  nth: number;
  signIndex: number;
  sign: string;
  houseFromLagna: number;
  houseFromMoon: number;
  /** Natal planets occupying the aspected sign. */
  natalPlanets: string[];
}

export interface StayView {
  slot: 'a' | 'b';
  signIndex: number;
  sign: string;
  spans: SignSpan[];
  firstStartIso: string;
  lastEndIso: string;
  houseFromLagna: number;
  houseFromMoon: number;
  aspects: AspectHit[];
  /** Natal planets in the transit sign (transit conjunction by sign). */
  conjunctNatal: string[];
  /** Natal planets in signs the transit planet aspects. */
  aspectedNatal: string[];
  /** Planet's own Bhinnashtakavarga bindus in the transit sign (not for nodes). */
  bav?: number;
  sav: number;
  retroWindows: RetroWindow[];
  status: 'in-progress' | 'paused' | 'upcoming';
}

export interface OverviewStay {
  signIndex: number;
  sign: string;
  spans: SignSpan[];
  firstStartIso: string;
  lastEndIso: string;
  houseFromLagna: number;
  houseFromMoon: number;
  bav?: number;
  sav: number;
  /** The planet returns to its natal sign. */
  isReturn: boolean;
}

export interface NatalView {
  signIndex: number;
  sign: string;
  house: number;
  houseFromMoon: number;
  aspects: AspectHit[];
  aspectedPlanets: string[];
  /** Houses ruled from the Lagna (empty for nodes). */
  lordship: number[];
  lordshipTypes: string[];
  yogakaraka: boolean;
  /** Natural relationship of the planet to the lord of the Moon sign. */
  moonLord: string;
  moonLordRelationship: string;
  /** Lord of the sign the planet occupies (its dispositor). */
  dispositor: string;
  dispositorHouse: number;
  dispositorSign: string;
}

export interface PlanetTransitData {
  key: PlanetKey;
  name: string;
  horizonYears: number;
  /** Spans from 3 years before the report date to the end of the horizon. */
  spans: SignSpan[];
  stations: Station[];
  retroWindows: RetroWindow[];
  overview: OverviewStay[];
  a: StayView;
  b: StayView;
  natal: NatalView;
}

export interface TransitPosition {
  planet: string;
  signIndex: number;
  sign: string;
  degree: number;
  retrograde: boolean;
  houseFromLagna: number;
}

const KENDRA = [1, 4, 7, 10];
const TRIKONA = [1, 5, 9];
const DUSTHANA = [6, 8, 12];
const UPACHAYA = [3, 6, 10, 11];

export function lordshipTypes(houses: number[]): string[] {
  const out: string[] = [];
  for (const h of houses) {
    const t: string[] = [];
    if (KENDRA.includes(h)) t.push('kendra');
    if (TRIKONA.includes(h)) t.push('trikona');
    if (DUSTHANA.includes(h)) t.push('dusthana');
    if (UPACHAYA.includes(h)) t.push('upachaya');
    if (h === 2 || h === 11) t.push('dhana');
    out.push(`${h}:${t.join('+') || 'neutral'}`);
  }
  return out;
}

/** Yogakaraka (BPHS ch. 34): one planet ruling both a kendra (other than the 1st) and a trikona. */
export function isYogakaraka(houses: number[]): boolean {
  return houses.some((h) => [4, 7, 10].includes(h)) && houses.some((h) => [5, 9].includes(h));
}

const SIGN_LORD: PlanetSymbol[] = [
  PlanetSymbol.MARS, PlanetSymbol.VENUS, PlanetSymbol.MERCURY, PlanetSymbol.MOON, PlanetSymbol.SUN, PlanetSymbol.MERCURY,
  PlanetSymbol.VENUS, PlanetSymbol.MARS, PlanetSymbol.JUPITER, PlanetSymbol.SATURN, PlanetSymbol.SATURN, PlanetSymbol.JUPITER,
];
export const signLord = (signIndex: number): string => planetName(SIGN_LORD[signIndex - 1]);

function natalPlanetsIn(snapshot: ChartSnapshot, signIndex: number, exclude?: string): string[] {
  return snapshot.natal.planets
    .filter((p) => p.rashiIndex === signIndex && planetName(p.name) !== exclude)
    .map((p) => planetName(p.name));
}

function aspectHits(snapshot: ChartSnapshot, symbol: PlanetSymbol, fromSign: number, exclude?: string): AspectHit[] {
  const asc = snapshot.natal.ascendant.rashiIndex;
  const moon = snapshot.natal.planets.find((p) => p.name === PlanetSymbol.MOON)!.rashiIndex;
  return getAspectedSigns(symbol, fromSign)
    .map((a) => ({
      nth: houseFrom(fromSign, a.rashiIndex),
      signIndex: a.rashiIndex,
      sign: signName(a.rashiIndex),
      houseFromLagna: houseFrom(asc, a.rashiIndex),
      houseFromMoon: houseFrom(moon, a.rashiIndex),
      natalPlanets: natalPlanetsIn(snapshot, a.rashiIndex, exclude),
    }))
    .sort((x, y) => x.nth - y.nth);
}

function bavFor(snapshot: ChartSnapshot, key: PlanetKey, signIndex: number): number | undefined {
  if (key === 'rahu' || key === 'ketu') return undefined;
  const t = snapshot.ashtakavarga.bav[PLANET_SYMBOL[key] as keyof typeof snapshot.ashtakavarga.bav];
  return t.signs[signIndex];
}
export const savFor = (snapshot: ChartSnapshot, signIndex: number): number => snapshot.ashtakavarga.sav.signs[signIndex];

function stayStatus(st: SignStay, asOfIso: string): StayView['status'] {
  const t = Date.parse(asOfIso);
  if (Date.parse(st.firstStartIso) > t) return 'upcoming';
  return st.spans.some((s) => Date.parse(s.startIso) <= t && t < Date.parse(s.endIso)) ? 'in-progress' : 'paused';
}

export function natalView(snapshot: ChartSnapshot, key: PlanetKey): NatalView {
  const symbol = PLANET_SYMBOL[key];
  const p = snapshot.natal.planets.find((x) => x.name === symbol)!;
  const moon = snapshot.natal.planets.find((x) => x.name === PlanetSymbol.MOON)!;
  const aspects = aspectHits(snapshot, symbol, p.rashiIndex, PLANET_NAME[key]);
  const moonLordSym = SIGN_LORD[moon.rashiIndex - 1];
  const rel = symbol === moonLordSym ? 'SELF' : String(getNaturalRelationship(symbol, moonLordSym));
  const dispositor = signLord(p.rashiIndex);
  const dp = snapshot.natal.planets.find((x) => planetName(x.name) === dispositor)!;
  const lordship = key === 'rahu' || key === 'ketu' ? [] : [...p.lordship].sort((a, b) => a - b);
  return {
    signIndex: p.rashiIndex, sign: p.sign, house: p.house, houseFromMoon: houseFrom(moon.rashiIndex, p.rashiIndex),
    aspects, aspectedPlanets: [...new Set(aspects.flatMap((a) => a.natalPlanets))],
    lordship, lordshipTypes: lordshipTypes(lordship), yogakaraka: isYogakaraka(lordship),
    moonLord: planetName(moonLordSym), moonLordRelationship: rel,
    dispositor, dispositorHouse: dp.house, dispositorSign: dp.sign,
  };
}

function stayView(snapshot: ChartSnapshot, key: PlanetKey, st: SignStay, slot: 'a' | 'b', windows: RetroWindow[]): StayView {
  const asc = snapshot.natal.ascendant.rashiIndex;
  const moon = snapshot.natal.planets.find((p) => p.name === PlanetSymbol.MOON)!.rashiIndex;
  const aspects = aspectHits(snapshot, PLANET_SYMBOL[key], st.signIndex);
  return {
    slot, signIndex: st.signIndex, sign: st.sign, spans: st.spans, firstStartIso: st.firstStartIso, lastEndIso: st.lastEndIso,
    houseFromLagna: houseFrom(asc, st.signIndex), houseFromMoon: houseFrom(moon, st.signIndex),
    aspects,
    conjunctNatal: natalPlanetsIn(snapshot, st.signIndex),
    aspectedNatal: [...new Set(aspects.flatMap((a) => a.natalPlanets))],
    bav: bavFor(snapshot, key, st.signIndex),
    sav: savFor(snapshot, st.signIndex),
    retroWindows: windowsOverlapping(windows, st.firstStartIso, st.lastEndIso),
    status: stayStatus(st, snapshot.asOfIso),
  };
}

export interface PlanetTransitOptions {
  horizonYears: number;
  solver?: TransitIngressSolver;
}

export async function computePlanetTransit(snapshot: ChartSnapshot, key: PlanetKey, opts: PlanetTransitOptions): Promise<PlanetTransitData> {
  const solver = opts.solver ?? new TransitIngressSolver();
  const asOf = new Date(snapshot.asOfIso);
  const from = new Date(asOf.getTime() - 3 * YEAR_MS);
  const to = new Date(asOf.getTime() + opts.horizonYears * YEAR_MS);
  const symbol = PLANET_SYMBOL[key];
  const spans = await computeSignSpans(symbol, from, to, solver);
  const stations = await computeStations(symbol, from, to, solver);
  const windows = pairRetroWindows(stations);
  const stays = groupStays(spans);
  const [sa, sb] = pickCurrentAndNext(stays, snapshot.asOfIso);
  const asc = snapshot.natal.ascendant.rashiIndex;
  const moon = snapshot.natal.planets.find((p) => p.name === PlanetSymbol.MOON)!.rashiIndex;
  const natal = natalView(snapshot, key);
  const overview = stays
    .filter((s) => Date.parse(s.lastEndIso) > asOf.getTime())
    .map((s) => ({
      signIndex: s.signIndex, sign: s.sign, spans: s.spans, firstStartIso: s.firstStartIso, lastEndIso: s.lastEndIso,
      houseFromLagna: houseFrom(asc, s.signIndex), houseFromMoon: houseFrom(moon, s.signIndex),
      bav: bavFor(snapshot, key, s.signIndex), sav: savFor(snapshot, s.signIndex), isReturn: s.signIndex === natal.signIndex,
    }));
  return {
    key, name: PLANET_NAME[key], horizonYears: opts.horizonYears, spans, stations, retroWindows: windows, overview,
    a: stayView(snapshot, key, sa, 'a', windows),
    b: stayView(snapshot, key, sb, 'b', windows),
    natal,
  };
}

/** Sidereal positions of the nine grahas on the report date, placed in natal-Lagna houses. */
export async function transitPositions(snapshot: ChartSnapshot, solver = new TransitIngressSolver()): Promise<TransitPosition[]> {
  const jd = msToJd(Date.parse(snapshot.asOfIso));
  const asc = snapshot.natal.ascendant.rashiIndex;
  const out: TransitPosition[] = [];
  for (const name of PLANETS) {
    const st = await solver.getPlanetaryState(name.toUpperCase() as PlanetSymbol, jd);
    out.push({
      planet: name, signIndex: st.rashiIndex, sign: signName(st.rashiIndex), degree: st.longitude % 30,
      retrograde: name === 'Rahu' || name === 'Ketu' ? true : st.isRetrograde, houseFromLagna: houseFrom(asc, st.rashiIndex),
    });
  }
  return out;
}

export { signAt };
