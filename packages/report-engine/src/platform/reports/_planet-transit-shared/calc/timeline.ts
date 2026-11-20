/**
 * Deterministic transit timeline for one slow planet, built only on the
 * astrology engine's TransitIngressSolver (same Lahiri sidereal frame as the
 * natal chart).
 *
 * - `SignSpan`: one continuous stay in a sign, between two solved ingresses.
 *   A retrograde back-and-forth therefore produces several spans.
 * - `SignStay`: the spans of ONE pass of the planet through a sign, i.e. its
 *   main stay plus any retrograde re-entries (spans of the same sign that are
 *   less than `maxGapDays` apart). This is how a transit "period" is read in
 *   gochara: "Saturn in Aries: 3 Jun 2027 – 20 Oct 2027 and 23 Feb 2028 – 8 Aug 2029".
 * - `Station`: a retrograde or direct station (speed sign change) from
 *   `TransitIngressSolver.findStationEvents`; paired into `RetroWindow`s.
 */
import { PlanetSymbol, TransitIngressSolver } from '@astro/astrology-engine';
import { SIGNS } from '../../../evidence/evidence-registry';

export const msToJd = (ms: number): number => ms / 86400000 + 2440587.5;
export const jdToIso = (jd: number): string => new Date((jd - 2440587.5) * 86400000).toISOString();
export const DAY_MS = 86400000;
export const YEAR_MS = 365.25 * DAY_MS;

export interface SignSpan {
  signIndex: number;
  sign: string;
  startIso: string;
  endIso: string;
  /** The span began with the planet moving backwards into the sign. */
  enteredRetrograde: boolean;
  /** Start / end is the edge of the calculation window, not a real ingress. */
  startClipped: boolean;
  endClipped: boolean;
}

export interface SignStay {
  signIndex: number;
  sign: string;
  spans: SignSpan[];
  firstStartIso: string;
  lastEndIso: string;
}

export interface Station {
  type: 'retrograde' | 'direct';
  iso: string;
  signIndex: number;
  sign: string;
  /** Sidereal longitude at the station, degrees. */
  longitude: number;
}

export interface RetroWindow {
  /** Retrograde station (undefined when the window began before the calculation start). */
  startIso?: string;
  /** Direct station (undefined when it ends after the calculation end). */
  endIso?: string;
  startSign?: string;
  endSign?: string;
  startDegree?: number;
  endDegree?: number;
}

export const signName = (i: number): string => SIGNS[(((i - 1) % 12) + 12) % 12];
export const houseFrom = (fromSign: number, sign: number): number => ((sign - fromSign + 12) % 12) + 1;
export const signAt = (fromSign: number, nth: number): number => ((fromSign - 1 + nth - 1) % 12) + 1;

/** All sign spans of `planet` between `from` and `to` (both clipped at the window edges). */
export async function computeSignSpans(
  planet: PlanetSymbol,
  from: Date,
  to: Date,
  solver: TransitIngressSolver = new TransitIngressSolver()
): Promise<SignSpan[]> {
  const startJd = msToJd(from.getTime());
  const endJd = msToJd(to.getTime());
  const initial = await solver.getPlanetaryState(planet, startJd);
  const events = await solver.findSignIngresses(planet, startJd, endJd);
  const spans: SignSpan[] = [];
  let cur = initial.rashiIndex;
  let start = from.toISOString();
  const isNode = planet === PlanetSymbol.RAHU || planet === PlanetSymbol.KETU;
  let retro = !isNode && initial.isRetrograde;
  let clippedStart = true;
  for (const ev of events) {
    spans.push({ signIndex: cur, sign: signName(cur), startIso: start, endIso: ev.timestampIso, enteredRetrograde: retro, startClipped: clippedStart, endClipped: false });
    const next = ev.toSign!.index;
    // The nodes always move backwards: a backward ingress is their normal motion, not a retrograde re-entry.
    retro = !isNode && (next === cur - 1 || (cur === 1 && next === 12));
    cur = next;
    start = ev.timestampIso;
    clippedStart = false;
  }
  spans.push({ signIndex: cur, sign: signName(cur), startIso: start, endIso: to.toISOString(), enteredRetrograde: retro, startClipped: clippedStart, endClipped: true });
  return spans;
}

/** Group spans into stays (one pass through a sign incl. retrograde re-entries). */
export function groupStays(spans: SignSpan[], maxGapDays = 730): SignStay[] {
  const stays: SignStay[] = [];
  for (const sp of spans) {
    const st = [...stays].reverse().find(
      (s) => s.signIndex === sp.signIndex && Date.parse(sp.startIso) - Date.parse(s.lastEndIso) <= maxGapDays * DAY_MS
    );
    if (st) {
      st.spans.push(sp);
      st.lastEndIso = sp.endIso;
    } else {
      stays.push({ signIndex: sp.signIndex, sign: sp.sign, spans: [sp], firstStartIso: sp.startIso, lastEndIso: sp.endIso });
    }
  }
  return stays.sort((a, b) => Date.parse(a.firstStartIso) - Date.parse(b.firstStartIso));
}

export async function computeStations(
  planet: PlanetSymbol,
  from: Date,
  to: Date,
  solver: TransitIngressSolver = new TransitIngressSolver()
): Promise<Station[]> {
  const ev = await solver.findStationEvents(planet, msToJd(from.getTime()), msToJd(to.getTime()));
  return ev.map((e) => ({
    type: e.eventType === 'RETROGRADE_STATION' ? 'retrograde' : 'direct',
    iso: e.timestampIso,
    signIndex: e.rashiIndex,
    sign: signName(e.rashiIndex),
    longitude: e.longitude,
  }));
}

/** Pair retrograde and direct stations into retrograde windows. */
export function pairRetroWindows(stations: Station[]): RetroWindow[] {
  const out: RetroWindow[] = [];
  let open: RetroWindow | undefined;
  for (const s of stations) {
    if (s.type === 'retrograde') {
      open = { startIso: s.iso, startSign: s.sign, startDegree: s.longitude % 30 };
      out.push(open);
    } else if (open && !open.endIso) {
      open.endIso = s.iso;
      open.endSign = s.sign;
      open.endDegree = s.longitude % 30;
      open = undefined;
    } else {
      out.push({ endIso: s.iso, endSign: s.sign, endDegree: s.longitude % 30 });
    }
  }
  return out;
}

/** Retrograde windows that overlap [fromIso, toIso]. */
export function windowsOverlapping(windows: RetroWindow[], fromIso: string, toIso: string): RetroWindow[] {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  return windows.filter((w) => {
    const s = w.startIso ? Date.parse(w.startIso) : -Infinity;
    const e = w.endIso ? Date.parse(w.endIso) : Infinity;
    return s <= b && e >= a;
  });
}

/** Whole years between two instants (age). */
export function yearsBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso);
  const b = new Date(toIso);
  let y = b.getUTCFullYear() - a.getUTCFullYear();
  if (b.getUTCMonth() < a.getUTCMonth() || (b.getUTCMonth() === a.getUTCMonth() && b.getUTCDate() < a.getUTCDate())) y--;
  return y;
}

/**
 * Pick the two transit stays a report details: the earliest stay that has not
 * finished by `asOfIso` (stay "a", in progress or next) and the stay after it ("b").
 */
export function pickCurrentAndNext(stays: SignStay[], asOfIso: string): [SignStay, SignStay] {
  const t = Date.parse(asOfIso);
  const idx = stays.findIndex((s) => Date.parse(s.lastEndIso) > t);
  if (idx < 0 || idx + 1 >= stays.length) throw new Error('TRANSIT_HORIZON_TOO_SHORT');
  return [stays[idx], stays[idx + 1]];
}
