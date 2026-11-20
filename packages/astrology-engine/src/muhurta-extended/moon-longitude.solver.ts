import { ChartCalculator } from '../chart/chart-calculator';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
import { PlanetSymbol } from '../planets/planet.types';

const NAKSHATRA_SPAN = 360 / 27;
/** Sampling step. The Moon moves at most ~15.4°/day, i.e. < 2.6° per 4 h, well below one nakshatra (13°20′). */
const SAMPLE_STEP_MS = 4 * 3600 * 1000;
/** Bisection stops when the bracket is narrower than this. */
const BISECT_PRECISION_MS = 1000;

export interface MuhurtaExtMoonCrossing {
  /** UTC instant (ms) at which the Moon's sidereal longitude reaches `boundaryDeg`. */
  ms: number;
  /** Boundary in [0, 360). */
  boundaryDeg: number;
}

export interface MuhurtaExtNakshatraSpan {
  /** 1-based nakshatra index (1 = Ashwini … 27 = Revati). */
  index: number;
  startMs: number;
  endMs: number;
}

/**
 * Moon sidereal longitude and boundary crossings, obtained only through ChartCalculator
 * (so the configured ayanamsa flows through). The Moon is never retrograde, so its longitude is
 * strictly increasing; crossings are bracketed by 4-hour sampling and refined by bisection to 1 s.
 */
export class MuhurtaExtMoonSolver {
  private readonly charts: ChartCalculator;
  private readonly config: AstrologyConfig;

  constructor(config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG, ephemerisProvider?: EphemerisProvider) {
    this.charts = new ChartCalculator(ephemerisProvider);
    this.config = config;
  }

  /** Moon sidereal longitude in [0, 360) at a UTC instant. */
  public async moonLongitudeAt(ms: number): Promise<number> {
    const d = new Date(ms);
    const chart = await this.charts.calculateChart(
      {
        date: { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() },
        time: { hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() },
        timezone: 'UTC',
        latitude: 0,
        longitude: 0,
        utcDateTime: d.toISOString(),
        timezoneOffsetSeconds: 0,
      },
      this.config
    );
    const moon = chart.planets[PlanetSymbol.MOON];
    if (!moon) throw new Error('Moon position unavailable from ChartCalculator.');
    return moon.longitude;
  }

  /** Bisection for the instant the (unwrapped) Moon longitude reaches `targetUnwrapped` within [loMs, hiMs]. */
  private async bisect(loMs: number, loUnwrapped: number, hiMs: number, targetUnwrapped: number): Promise<number> {
    let lo = loMs;
    let hi = hiMs;
    const base = loUnwrapped - ((loUnwrapped % 360) + 360) % 360;
    while (hi - lo > BISECT_PRECISION_MS) {
      const mid = (lo + hi) / 2;
      let lon = (await this.moonLongitudeAt(mid)) + base;
      if (lon < loUnwrapped - 180) lon += 360;
      if (lon < targetUnwrapped) lo = mid;
      else hi = mid;
    }
    return Math.round((lo + hi) / 2);
  }

  /**
   * All instants in (startMs, endMs] at which the Moon reaches any of `boundariesDeg` (degrees in [0, 360)).
   * Sorted by time.
   */
  public async findCrossings(startMs: number, endMs: number, boundariesDeg: readonly number[]): Promise<MuhurtaExtMoonCrossing[]> {
    const out: MuhurtaExtMoonCrossing[] = [];
    let prevMs = startMs;
    let prevUnwrapped = await this.moonLongitudeAt(startMs);
    while (prevMs < endMs) {
      const nextMs = Math.min(prevMs + SAMPLE_STEP_MS, endMs);
      let nextUnwrapped = (await this.moonLongitudeAt(nextMs)) + (prevUnwrapped - (((prevUnwrapped % 360) + 360) % 360));
      if (nextUnwrapped < prevUnwrapped) nextUnwrapped += 360;
      const turnBase = Math.floor(prevUnwrapped / 360) * 360;
      const hits: number[] = [];
      for (const b of boundariesDeg) {
        for (const candidate of [turnBase + b, turnBase + 360 + b]) {
          if (candidate > prevUnwrapped && candidate <= nextUnwrapped) hits.push(candidate);
        }
      }
      hits.sort((a, b) => a - b);
      for (const target of hits) {
        const ms = await this.bisect(prevMs, prevUnwrapped, nextMs, target);
        out.push({ ms, boundaryDeg: ((target % 360) + 360) % 360 });
      }
      prevMs = nextMs;
      prevUnwrapped = nextUnwrapped;
    }
    return out;
  }

  /** Start of the nakshatra running at `ms` (searches back up to 2 days). */
  public async nakshatraStartBefore(ms: number): Promise<{ index: number; startMs: number }> {
    const lon = await this.moonLongitudeAt(ms);
    const index = Math.floor(lon / NAKSHATRA_SPAN) + 1;
    const boundary = ((index - 1) * NAKSHATRA_SPAN) % 360;
    const crossings = await this.findCrossings(ms - 2 * 86400000, ms, [boundary]);
    const last = crossings[crossings.length - 1];
    if (!last) throw new Error('Nakshatra start not found within 2 days.');
    return { index, startMs: last.ms };
  }

  /**
   * Complete nakshatra spans that overlap [startMs, endMs]; the first span's start and the last span's end may lie
   * outside the interval (they are solved exactly).
   */
  public async nakshatraSpans(startMs: number, endMs: number): Promise<MuhurtaExtNakshatraSpan[]> {
    const first = await this.nakshatraStartBefore(startMs);
    const boundaries = Array.from({ length: 27 }, (_, i) => i * NAKSHATRA_SPAN);
    // Extend 2 days past the end so the last span's end is found.
    const crossings = await this.findCrossings(startMs, endMs + 2 * 86400000, boundaries);
    const spans: MuhurtaExtNakshatraSpan[] = [];
    let curIndex = first.index;
    let curStart = first.startMs;
    for (const c of crossings) {
      spans.push({ index: curIndex, startMs: curStart, endMs: c.ms });
      if (c.ms > endMs) break;
      curIndex = (curIndex % 27) + 1;
      curStart = c.ms;
    }
    return spans;
  }
}
