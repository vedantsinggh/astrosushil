import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
import { DayDivisionsCalculator } from '../muhurta/day-divisions.calculator';
import { localMidnightUtcMs } from '../astronomy/solar-day';
import { NAKSHATRAS } from '../nakshatra/nakshatra';
import { MuhurtaExtMoonSolver } from './moon-longitude.solver';
import {
  AMRIT_KALAM_GHATIS,
  AMRIT_KALAM_SOURCE,
  DURMUHURTA_CONVENTION_NOTES,
  DURMUHURTA_SOURCE,
  DURMUHURTA_TABLE,
  GANDANTA_JUNCTION_PADAS,
  GANDMOOL_CONVENTION_NOTES,
  GANDMOOL_NAKSHATRA_INDICES,
  GANDMOOL_PANCHAKA_SOURCE,
  NAKSHATRA_GHATI_WINDOW_LENGTH,
  PANCHAKA_CONVENTION_NOTES,
  PANCHAKA_END_DEGREE,
  PANCHAKA_START_DEGREE,
  VARJYAM_AMRIT_CONVENTION_NOTES,
  VARJYAM_GHATIS_PRASHNA_MARGA,
  VARJYAM_GHATIS_PUBLISHED,
  VARJYAM_SOURCE_PRASHNA_MARGA,
  VARJYAM_SOURCE_PUBLISHED,
  VarjyamTableVariant,
} from './muhurta-extras.tables';

const iso = (ms: number): string => new Date(Math.round(ms)).toISOString();
const NAKSHATRA_SPAN = 360 / 27;
const DAY_MS = 86400000;

export interface MuhurtaExtrasDayInput {
  date: { year: number; month: number; day: number };
  /** IANA timezone of the place (civil day + weekday). */
  timezone: string;
  latitude: number;
  longitude: number;
}

export interface DurmuhurtaWindow {
  part: 'DAY' | 'NIGHT';
  muhurtaNumber: number;
  muhurtaName: string;
  startIso: string;
  endIso: string;
}

export interface NakshatraGhatiWindow {
  kind: 'VARJYAM' | 'AMRIT_KALAM';
  nakshatraIndex: number;
  nakshatraName: string;
  nakshatraStartIso: string;
  nakshatraEndIso: string;
  /** Tabulated ghatis (of 60) elapsed before the window starts. */
  ghatiOffset: number;
  ghatiLength: number;
  startIso: string;
  endIso: string;
}

export interface MuhurtaExtrasNakshatraSpan {
  index: number;
  name: string;
  startIso: string;
  endIso: string;
}

export interface MuhurtaExtrasDayReport {
  input: MuhurtaExtrasDayInput;
  /** Local civil day [local midnight, next local midnight) used to select Varjyam / Amrit Kalam windows. */
  civilDayStartIso: string;
  civilDayEndIso: string;
  sunriseIso: string;
  sunsetIso: string;
  nextSunriseIso: string;
  /** 0 = Sunday … 6 = Saturday (weekday of the Vedic day starting at this sunrise). */
  weekdayIndex: number;
  dayMuhurtaMinutes: number;
  nightMuhurtaMinutes: number;
  durmuhurta: DurmuhurtaWindow[];
  nakshatras: MuhurtaExtrasNakshatraSpan[];
  varjyam: NakshatraGhatiWindow[];
  amritKalam: NakshatraGhatiWindow[];
  varjyamTable: VarjyamTableVariant;
  provisional: true;
  source: string;
  conventionNotes: string[];
}

export interface GandmoolPanchakaMoment {
  instantIso: string;
  moonLongitude: number;
  nakshatraIndex: number;
  nakshatraName: string;
  pada: number;
  gandmool: boolean;
  /** Stricter variant: Moon in a gandanta junction pada. */
  gandantaJunctionPada: boolean;
  panchaka: boolean;
  provisional: true;
  source: string;
  conventionNotes: string[];
}

export interface GandmoolPanchakaWindow {
  kind: 'GANDMOOL' | 'PANCHAKA';
  startIso: string;
  endIso: string;
  durationHours: number;
  /** Nakshatras (whole or part) covered by the window, with their own start/end inside the window. */
  nakshatras: MuhurtaExtrasNakshatraSpan[];
}

export interface GandmoolPanchakaRangeReport {
  startIso: string;
  endIso: string;
  /** Windows overlapping [startIso, endIso]; not clipped (full Moon ingress→egress). Sorted by start. */
  windows: GandmoolPanchakaWindow[];
  provisional: true;
  source: string;
  conventionNotes: string[];
}

/** Maximum span of a Gandmool/Panchaka range query. */
export const GANDMOOL_PANCHAKA_MAX_RANGE_DAYS = 366;

export class MuhurtaExtrasError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MuhurtaExtrasError';
  }
}

function nakshatraName(index: number): string {
  return NAKSHATRAS[index - 1].name;
}

function isGandmool(index: number): boolean {
  return GANDMOOL_NAKSHATRA_INDICES.includes(index);
}

function isPanchakaLongitude(lon: number): boolean {
  return lon >= PANCHAKA_START_DEGREE && lon < PANCHAKA_END_DEGREE;
}

/**
 * Durmuhurta, Varjyam, Amrit Kalam (for a civil date + place) and Gandmool / Panchaka (moment + range).
 * Provisional – pending client review (ADR-016 §6). Rule data in muhurta-extras.tables.ts.
 */
export class MuhurtaExtrasCalculator {
  private readonly moon: MuhurtaExtMoonSolver;
  private readonly days = new DayDivisionsCalculator();

  constructor(config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG, ephemerisProvider?: EphemerisProvider) {
    this.moon = new MuhurtaExtMoonSolver(config, ephemerisProvider);
  }

  /** Durmuhurta windows from a sunrise / sunset / next-sunrise triple and weekday (pure rule; no ephemeris). */
  public static durmuhurtaWindows(sunriseMs: number, sunsetMs: number, nextSunriseMs: number, weekdayIndex: number): DurmuhurtaWindow[] {
    const dayPart = (sunsetMs - sunriseMs) / 15;
    const nightPart = (nextSunriseMs - sunsetMs) / 15;
    return (DURMUHURTA_TABLE[weekdayIndex] ?? []).map((r) => {
      const base = r.part === 'DAY' ? sunriseMs : sunsetMs;
      const len = r.part === 'DAY' ? dayPart : nightPart;
      return {
        part: r.part,
        muhurtaNumber: r.muhurtaNumber,
        muhurtaName: r.muhurtaName,
        startIso: iso(base + (r.muhurtaNumber - 1) * len),
        endIso: iso(base + r.muhurtaNumber * len),
      };
    });
  }

  /** Varjyam / Amrit Kalam window for one nakshatra span (pure rule; proportional ghati scaling). */
  public static nakshatraGhatiWindow(
    kind: 'VARJYAM' | 'AMRIT_KALAM',
    nakshatraIndex: number,
    startMs: number,
    endMs: number,
    ghatiOffset: number
  ): NakshatraGhatiWindow {
    const ghatiMs = (endMs - startMs) / 60;
    return {
      kind,
      nakshatraIndex,
      nakshatraName: nakshatraName(nakshatraIndex),
      nakshatraStartIso: iso(startMs),
      nakshatraEndIso: iso(endMs),
      ghatiOffset,
      ghatiLength: NAKSHATRA_GHATI_WINDOW_LENGTH,
      startIso: iso(startMs + ghatiOffset * ghatiMs),
      endIso: iso(startMs + (ghatiOffset + NAKSHATRA_GHATI_WINDOW_LENGTH) * ghatiMs),
    };
  }

  public async calculateDay(input: MuhurtaExtrasDayInput, options: { varjyamTable?: VarjyamTableVariant } = {}): Promise<MuhurtaExtrasDayReport> {
    const varjyamTable = options.varjyamTable ?? 'PUBLISHED_PANCHANG';
    const bounds = this.days.calculateSolarDay(input);
    const riseMs = Date.parse(bounds.sunriseIso);
    const setMs = Date.parse(bounds.sunsetIso);
    const nextMs = Date.parse(bounds.nextSunriseIso);

    const dayStartMs = localMidnightUtcMs(input.date, input.timezone, input.longitude);
    const nd = new Date(Date.UTC(input.date.year, input.date.month - 1, input.date.day + 1));
    const dayEndMs = localMidnightUtcMs(
      { year: nd.getUTCFullYear(), month: nd.getUTCMonth() + 1, day: nd.getUTCDate() },
      input.timezone,
      input.longitude
    );

    const spans = await this.moon.nakshatraSpans(dayStartMs, dayEndMs);
    const varjyamGhatis = varjyamTable === 'PRASHNA_MARGA' ? VARJYAM_GHATIS_PRASHNA_MARGA : VARJYAM_GHATIS_PUBLISHED;
    const overlaps = (w: NakshatraGhatiWindow): boolean => Date.parse(w.endIso) > dayStartMs && Date.parse(w.startIso) < dayEndMs;
    const varjyam = spans
      .map((s) => MuhurtaExtrasCalculator.nakshatraGhatiWindow('VARJYAM', s.index, s.startMs, s.endMs, varjyamGhatis[s.index - 1]))
      .filter(overlaps);
    const amritKalam = spans
      .map((s) => MuhurtaExtrasCalculator.nakshatraGhatiWindow('AMRIT_KALAM', s.index, s.startMs, s.endMs, AMRIT_KALAM_GHATIS[s.index - 1]))
      .filter(overlaps);

    return {
      input,
      civilDayStartIso: iso(dayStartMs),
      civilDayEndIso: iso(dayEndMs),
      sunriseIso: bounds.sunriseIso,
      sunsetIso: bounds.sunsetIso,
      nextSunriseIso: bounds.nextSunriseIso,
      weekdayIndex: bounds.weekdayIndex,
      dayMuhurtaMinutes: (setMs - riseMs) / 15 / 60000,
      nightMuhurtaMinutes: (nextMs - setMs) / 15 / 60000,
      durmuhurta: MuhurtaExtrasCalculator.durmuhurtaWindows(riseMs, setMs, nextMs, bounds.weekdayIndex),
      nakshatras: spans
        .filter((s) => s.endMs > dayStartMs && s.startMs < dayEndMs)
        .map((s) => ({ index: s.index, name: nakshatraName(s.index), startIso: iso(s.startMs), endIso: iso(s.endMs) })),
      varjyam,
      amritKalam,
      varjyamTable,
      provisional: true,
      source: [DURMUHURTA_SOURCE, varjyamTable === 'PRASHNA_MARGA' ? VARJYAM_SOURCE_PRASHNA_MARGA : VARJYAM_SOURCE_PUBLISHED, AMRIT_KALAM_SOURCE].join(' '),
      conventionNotes: [...DURMUHURTA_CONVENTION_NOTES, ...VARJYAM_AMRIT_CONVENTION_NOTES],
    };
  }

  /** Gandmool / Panchaka flags for the Moon at one UTC instant. */
  public async gandmoolPanchakaAt(instant: Date): Promise<GandmoolPanchakaMoment> {
    const lon = await this.moon.moonLongitudeAt(instant.getTime());
    const index = Math.min(27, Math.floor(lon / NAKSHATRA_SPAN) + 1);
    const pada = Math.min(4, Math.floor((lon - (index - 1) * NAKSHATRA_SPAN) / (NAKSHATRA_SPAN / 4)) + 1);
    return {
      instantIso: instant.toISOString(),
      moonLongitude: lon,
      nakshatraIndex: index,
      nakshatraName: nakshatraName(index),
      pada,
      gandmool: isGandmool(index),
      gandantaJunctionPada: GANDANTA_JUNCTION_PADAS.some(([n, p]) => n === index && p === pada),
      panchaka: isPanchakaLongitude(lon),
      provisional: true,
      source: GANDMOOL_PANCHAKA_SOURCE,
      conventionNotes: [...GANDMOOL_CONVENTION_NOTES, ...PANCHAKA_CONVENTION_NOTES],
    };
  }

  /** Gandmool and Panchaka windows (Moon ingress → egress) overlapping [start, end]; range ≤ 366 days. */
  public async gandmoolPanchakaWindows(start: Date, end: Date): Promise<GandmoolPanchakaRangeReport> {
    const startMs = start.getTime();
    const endMs = end.getTime();
    if (!(endMs > startMs)) throw new MuhurtaExtrasError('Range end must be after range start.');
    if (endMs - startMs > GANDMOOL_PANCHAKA_MAX_RANGE_DAYS * DAY_MS) {
      throw new MuhurtaExtrasError(`Range must not exceed ${GANDMOOL_PANCHAKA_MAX_RANGE_DAYS} days.`);
    }
    // Pad by 6 days each side: a Panchaka (60° of Moon motion) lasts at most ~5.1 days, a merged Gandmool
    // window (2 nakshatras) at most ~2.3 days, so every window overlapping the range is found whole.
    const padMs = 6 * DAY_MS;
    const scanStart = startMs - padMs;
    const scanEnd = endMs + padMs;
    const boundaries = Array.from({ length: 27 }, (_, i) => i * NAKSHATRA_SPAN);
    // Panchaka starts mid-Dhanishta (300°), not on a nakshatra boundary.
    const crossings = await this.moon.findCrossings(scanStart, scanEnd, [...boundaries, PANCHAKA_START_DEGREE]);

    // Segment timeline: [segStart, segEnd) with nakshatra index + panchaka flag.
    const lon0 = await this.moon.moonLongitudeAt(scanStart);
    let curIndex = Math.min(27, Math.floor(lon0 / NAKSHATRA_SPAN) + 1);
    let curPanchaka = isPanchakaLongitude(lon0);
    let segStart = scanStart;
    interface Seg { index: number; panchaka: boolean; startMs: number; endMs: number; open: boolean }
    const segs: Seg[] = [];
    for (const c of crossings) {
      segs.push({ index: curIndex, panchaka: curPanchaka, startMs: segStart, endMs: c.ms, open: segs.length === 0 });
      const onNakBoundary = Math.abs(c.boundaryDeg - PANCHAKA_START_DEGREE) > 1e-9;
      if (onNakBoundary) curIndex = Math.round(c.boundaryDeg / NAKSHATRA_SPAN) + 1;
      curPanchaka = c.boundaryDeg === 0 ? false : c.boundaryDeg >= PANCHAKA_START_DEGREE - 1e-9 ? true : curPanchaka;
      segStart = c.ms;
    }
    segs.push({ index: curIndex, panchaka: curPanchaka, startMs: segStart, endMs: scanEnd, open: true });

    const windows: GandmoolPanchakaWindow[] = [];
    const build = (kind: 'GANDMOOL' | 'PANCHAKA', pred: (s: Seg) => boolean): void => {
      let run: Seg[] = [];
      const flush = (): void => {
        if (run.length === 0) return;
        const first = run[0];
        const last = run[run.length - 1];
        run = [];
        if (first.open || last.open) return; // truncated by the padded scan; cannot occur for windows overlapping the range
        if (last.endMs <= startMs || first.startMs >= endMs) return;
        // Merge consecutive segments of the same nakshatra (split at 300° for Panchaka bookkeeping).
        const naks: MuhurtaExtrasNakshatraSpan[] = [];
        for (const s of segsBetween(first, last)) {
          const prev = naks[naks.length - 1];
          if (prev && prev.index === s.index) prev.endIso = iso(s.endMs);
          else naks.push({ index: s.index, name: nakshatraName(s.index), startIso: iso(s.startMs), endIso: iso(s.endMs) });
        }
        windows.push({
          kind,
          startIso: iso(first.startMs),
          endIso: iso(last.endMs),
          durationHours: (last.endMs - first.startMs) / 3600000,
          nakshatras: naks,
        });
      };
      const segsBetween = (a: Seg, b: Seg): Seg[] => segs.slice(segs.indexOf(a), segs.indexOf(b) + 1);
      for (const s of segs) {
        if (pred(s)) run.push(s);
        else flush();
      }
      flush();
    };
    build('GANDMOOL', (s) => isGandmool(s.index));
    build('PANCHAKA', (s) => s.panchaka);
    windows.sort((a, b) => Date.parse(a.startIso) - Date.parse(b.startIso) || a.kind.localeCompare(b.kind));

    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      windows,
      provisional: true,
      source: GANDMOOL_PANCHAKA_SOURCE,
      conventionNotes: [...GANDMOOL_CONVENTION_NOTES, ...PANCHAKA_CONVENTION_NOTES],
    };
  }
}
