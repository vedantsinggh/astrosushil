import { ChartCalculator } from '../chart/chart-calculator';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { BirthDetails } from '../input/birth-details';
import { PlanetSymbol } from '../planets/planet.types';
import { normalizeBirthTime } from '../validation/birth-details.validator';
import { getLocalPartsFromUtc, getOffsetMsAtUtc } from '../validation/timezone.solver';
import { TajikaAnnualLocation, TithiPraveshaCandidate, TithiPraveshaResult } from './tajika-extended.types';

export const TITHI_PRAVESHA_SOURCE =
  'Tithi Pravesha chakra: the instant in the target year when the Sun–Moon elongation equals the natal elongation (same tithi ' +
  'and same degree within it) while the Sun is in its natal (sidereal) solar sign, cast for the birth place. Cf. P.V.R. ' +
  'Narasimha Rao, "Tithi Pravesha Charts" (vedicastrologer.org/articles/pp_tp.pdf): "cast every year when Moon is exactly at ' +
  'the same angle from Sun as at birth, in the same soli-lunar month as at birth". ADR-016 §6. Provisional – pending client review.';

const DAY_MS = 86400000;
/** Mean sidereal year in days, used only for the starting guess of the solar-return search. */
const SIDEREAL_YEAR_DAYS = 365.256363;

function wrap180(x: number): number {
  let d = ((x % 360) + 360) % 360;
  if (d >= 180) d -= 360;
  return d;
}

function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

function localIso(utcMs: number, timezone: string): string {
  const p = getLocalPartsFromUtc(utcMs, timezone);
  const z = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${z(p.year, 4)}-${z(p.month)}-${z(p.day)}T${z(p.hour)}:${z(p.minute)}:${z(p.second)}`;
}

function detailsAt(utcMs: number, loc: TajikaAnnualLocation): BirthDetails {
  const p = getLocalPartsFromUtc(utcMs, loc.timezone);
  return {
    date: { year: p.year, month: p.month, day: p.day },
    time: { hour: p.hour, minute: p.minute, second: p.second },
    timezone: loc.timezone,
    latitude: loc.latitude,
    longitude: loc.longitude,
    placeName: loc.placeName,
    utcDateTime: new Date(utcMs).toISOString(),
  };
}

/** Generic bracketing root finder (bisection). `f(lo)` and `f(hi)` must differ in sign. */
export async function tajikaBisectRoot(f: (t: number) => Promise<number>, lo: number, hi: number, tolerance: number, maxIter = 60): Promise<number> {
  let flo = await f(lo);
  for (let i = 0; i < maxIter && hi - lo > tolerance; i++) {
    const mid = (lo + hi) / 2;
    const fm = await f(mid);
    if ((fm < 0) === (flo < 0)) {
      lo = mid;
      flo = fm;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * Tithi Pravesha chart for a target year. Sun and Moon come only from ChartCalculator with the given config
 * (so the configured ayanamsa sets the Sun's sign; the elongation itself is ayanamsa-free).
 */
export async function calculateTithiPravesha(
  birth: BirthDetails,
  targetYear: number,
  location?: TajikaAnnualLocation,
  config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG,
  chartCalculator: ChartCalculator = new ChartCalculator(),
): Promise<TithiPraveshaResult> {
  if (!Number.isInteger(targetYear) || targetYear < birth.date.year) throw new Error('targetYear must be an integer not before the birth year');
  const loc: TajikaAnnualLocation = location ?? { latitude: birth.latitude, longitude: birth.longitude, timezone: birth.timezone, placeName: birth.placeName };
  const natalChart = await chartCalculator.calculateChart(birth, config);
  const birthUtcMs = normalizeBirthTime(birth).utcTimestampMs;
  const natalSun = natalChart.planets[PlanetSymbol.SUN].longitude;
  const natalMoon = natalChart.planets[PlanetSymbol.MOON].longitude;
  const natalElong = norm360(natalMoon - natalSun);
  const natalSunSign = natalChart.planets[PlanetSymbol.SUN].rashiIndex;

  const cache = new Map<number, { sun: number; moon: number; sunSign: number }>();
  const sky = async (ms: number) => {
    const k = Math.round(ms);
    const hit = cache.get(k);
    if (hit) return hit;
    const c = await chartCalculator.calculateChart(detailsAt(k, loc), config);
    const v = { sun: c.planets[PlanetSymbol.SUN].longitude, moon: c.planets[PlanetSymbol.MOON].longitude, sunSign: c.planets[PlanetSymbol.SUN].rashiIndex };
    cache.set(k, v);
    return v;
  };

  // 1. Solar return of the target year (Sun back at its natal sidereal longitude): Newton steps on the Sun's ~0.9856°/day.
  let sr = birthUtcMs + (targetYear - birth.date.year) * SIDEREAL_YEAR_DAYS * DAY_MS;
  for (let i = 0; i < 12; i++) {
    const d = wrap180((await sky(sr)).sun - natalSun);
    if (Math.abs(d) < 1e-7) break;
    sr -= (d / 0.9856) * DAY_MS;
  }

  // 2. Elongation matches within ±35 days of the solar return (covers the Sun's whole stay in the natal sign).
  const g = async (ms: number) => {
    const s = await sky(ms);
    return wrap180(norm360(s.moon - s.sun) - natalElong);
  };
  const step = 0.5 * DAY_MS;
  const candidates: TithiPraveshaCandidate[] = [];
  let prevT = sr - 35 * DAY_MS;
  let prevG = await g(prevT);
  for (let t = prevT + step; t <= sr + 35 * DAY_MS; t += step) {
    const gt = await g(t);
    // Elongation grows ~12°/day, so a root is a crossing from negative to non-negative with a small jump.
    if (prevG < 0 && gt >= 0 && gt - prevG < 90) {
      const root = await tajikaBisectRoot(g, prevT, t, 1); // 1 ms
      const s = await sky(root);
      candidates.push({
        utcIso: new Date(Math.round(root)).toISOString(),
        sunLongitude: s.sun,
        moonLongitude: s.moon,
        sunRashiIndex: s.sunSign,
        sunSignMatchesNatal: s.sunSign === natalSunSign,
        daysFromSolarReturn: (root - sr) / DAY_MS,
      });
    }
    prevT = t;
    prevG = gt;
  }
  if (candidates.length === 0) throw new Error('No Sun–Moon elongation match found near the solar return');
  const matching = candidates.filter((c) => c.sunSignMatchesNatal);
  const pool = matching.length > 0 ? matching : candidates;
  const chosen = pool.reduce((a, b) => (Math.abs(b.daysFromSolarReturn) < Math.abs(a.daysFromSolarReturn) ? b : a));
  const chosenMs = Date.parse(chosen.utcIso);

  const chart = await chartCalculator.calculateChart(detailsAt(chosenMs, loc), config);
  const elong = norm360(chart.planets[PlanetSymbol.MOON].longitude - chart.planets[PlanetSymbol.SUN].longitude);

  return {
    targetYear,
    natal: {
      utcIso: new Date(birthUtcMs).toISOString(),
      sunLongitude: natalSun,
      moonLongitude: natalMoon,
      elongation: natalElong,
      tithiIndex: Math.floor(natalElong / 12) + 1,
      sunRashiIndex: natalSunSign,
    },
    moment: {
      utcIso: chosen.utcIso,
      localIso: localIso(chosenMs, loc.timezone),
      timezone: loc.timezone,
      utcOffsetMinutes: Math.round(getOffsetMsAtUtc(chosenMs, loc.timezone) / 60000),
      elongation: elong,
      elongationResidual: wrap180(elong - natalElong),
      tithiIndex: Math.floor(elong / 12) + 1,
      sunRashiIndex: chart.planets[PlanetSymbol.SUN].rashiIndex,
      sunSignMatchesNatal: chosen.sunSignMatchesNatal,
    },
    solarReturnUtcIso: new Date(Math.round(sr)).toISOString(),
    candidates,
    location: loc,
    chart,
    provisional: true,
    source: TITHI_PRAVESHA_SOURCE,
    conventionNotes: [
      'Elongation = (Moon − Sun) mod 360 from the engine chart; the root is bracketed on a 12-hour grid within ±35 days of the target-year solar return and refined by bisection to 1 ms.',
      'When the Sun\'s stay in its natal sign holds two matches, the one nearest the solar return is used; all matches are listed in candidates.',
      'If no match falls with the Sun in its natal sign (the Sun can leave a sign in less than a synodic month), the match nearest the solar return is used and moment.sunSignMatchesNatal is false.',
      'Month rule used: Sun in the same sidereal sign as at birth. Alternative (P.V.R. Narasimha Rao, pp_tp.pdf): the same soli-lunar month, i.e. the Sun\'s tropical sign at the new moon preceding the moment equals its tropical sign at the new moon preceding birth. Popular guides use the angle alone, nearest the birthday.',
      'The chart is cast for the birth place unless a location is given (some authors use the place of residence).',
    ],
  };
}

