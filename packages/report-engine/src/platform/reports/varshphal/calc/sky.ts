/**
 * Time-points inside a Varsha year, solved numerically from the engine's
 * TransitIngressSolver (same sidereal model as the solar-return solver):
 *
 * - Masa Pravesha: the 12 Tajika months begin each time the Sun has advanced
 *   a further 30° from its natal longitude (month 1 begins at the solar return).
 * - Purnima / Amavasya and named tithis: instants where the Moon–Sun
 *   elongation reaches a given angle (tithi n spans (n-1)·12° … n·12°).
 */
import { AMANTA_MASAS, PlanetSymbol, TransitIngressSolver } from '@astro/astrology-engine';

const msToJd = (ms: number) => ms / 86400000 + 2440587.5;
const jdToIso = (jd: number) => new Date(Math.round((jd - 2440587.5) * 86400000)).toISOString();
const norm = (x: number) => ((x % 360) + 360) % 360;
/** Signed difference a−b in (−180, 180]. */
const delta = (a: number, b: number) => {
  const d = norm(a - b);
  return d > 180 ? d - 360 : d;
};

async function bisect(f: (jd: number) => Promise<number>, lo: number, hi: number, iterations = 40): Promise<number> {
  let flo = await f(lo);
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    const fm = await f(mid);
    if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface VarshaMonth {
  index: number; // 1..12
  startIso: string;
  endIso: string;
  /** Sun's sidereal sign at the start of the month. */
  sunSignIndex: number;
}

export async function computeMasaPravesha(natalSunLongitude: number, yearStartIso: string, yearEndIso: string, solver = new TransitIngressSolver()): Promise<VarshaMonth[]> {
  const sunLon = async (jd: number) => (await solver.getPlanetaryState(PlanetSymbol.SUN, jd)).longitude;
  const starts: string[] = [yearStartIso];
  const jd0 = msToJd(Date.parse(yearStartIso));
  for (let k = 1; k < 12; k++) {
    const target = norm(natalSunLongitude + 30 * k);
    const guess = jd0 + k * 30.44;
    const jd = await bisect(async (j) => delta(await sunLon(j), target), guess - 8, guess + 8);
    starts.push(jdToIso(jd));
  }
  const months: VarshaMonth[] = [];
  for (let k = 0; k < 12; k++) {
    const startIso = starts[k];
    const st = await solver.getPlanetaryState(PlanetSymbol.SUN, msToJd(Date.parse(startIso) + 3600000));
    months.push({ index: k + 1, startIso, endIso: k < 11 ? starts[k + 1] : yearEndIso, sunSignIndex: st.rashiIndex });
  }
  return months;
}

export interface LunarEvent {
  kind: 'purnima' | 'amavasya' | 'shukla-tritiya-start' | 'shukla-tritiya-end';
  iso: string;
  /** Amanta lunar month (named from the Sun's sign at the preceding new moon). */
  masa: string;
}

/** All instants in [fromIso, toIso) where the elongation crosses `angle`. */
export async function elongationCrossings(angle: number, fromIso: string, toIso: string, solver = new TransitIngressSolver()): Promise<string[]> {
  const elong = async (jd: number) => {
    const [s, m] = await Promise.all([solver.getPlanetaryState(PlanetSymbol.SUN, jd), solver.getPlanetaryState(PlanetSymbol.MOON, jd)]);
    return delta(norm(m.longitude - s.longitude), angle);
  };
  const out: string[] = [];
  const end = msToJd(Date.parse(toIso));
  let a = msToJd(Date.parse(fromIso));
  let fa = await elong(a);
  while (a < end) {
    const b = Math.min(a + 1, end);
    const fb = await elong(b);
    // elongation only increases, so a sign change from − to + is a crossing (+→− is the 180° wrap).
    if (fa < 0 && fb >= 0) out.push(jdToIso(await bisect(elong, a, b, 30)));
    a = b;
    fa = fb;
  }
  return out;
}

export async function computeLunarEvents(fromIso: string, toIso: string, solver = new TransitIngressSolver()): Promise<LunarEvent[]> {
  // Start a month early so the first lunation's masa is known.
  const early = new Date(Date.parse(fromIso) - 32 * 86400000).toISOString();
  const late = new Date(Date.parse(toIso) + 32 * 86400000).toISOString();
  const newMoons = await elongationCrossings(0, early, late, solver);
  // A lunation is Adhika (intercalary) when the next new moon falls with the Sun in the same sign.
  const nmSigns = await Promise.all(newMoons.map(async (n) => (await solver.getPlanetaryState(PlanetSymbol.SUN, msToJd(Date.parse(n)))).rashiIndex));
  const masaAt = async (iso: string) => {
    const t = Date.parse(iso);
    let k = -1;
    newMoons.forEach((n, i) => { if (Date.parse(n) <= t) k = i; });
    if (k < 0) return 'unknown';
    const adhika = k + 1 < nmSigns.length && nmSigns[k + 1] === nmSigns[k];
    return `${adhika ? 'Adhika ' : ''}${AMANTA_MASAS[nmSigns[k]]}`;
  };
  const events: LunarEvent[] = [];
  const add = async (kind: LunarEvent['kind'], list: string[]) => {
    for (const iso of list) if (Date.parse(iso) >= Date.parse(fromIso)) events.push({ kind, iso, masa: await masaAt(iso) });
  };
  await add('amavasya', newMoons.filter((n) => Date.parse(n) < Date.parse(toIso)));
  await add('purnima', await elongationCrossings(180, fromIso, toIso, solver));
  await add('shukla-tritiya-start', await elongationCrossings(24, fromIso, toIso, solver));
  await add('shukla-tritiya-end', await elongationCrossings(36, fromIso, toIso, solver));
  return events.sort((x, y) => Date.parse(x.iso) - Date.parse(y.iso));
}
