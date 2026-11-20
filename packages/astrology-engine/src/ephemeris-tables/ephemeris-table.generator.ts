import * as Astronomy from 'astronomy-engine';
import { AstrologyConfig, DEFAULT_ASTROLOGY_CONFIG } from '../configuration/astrology-config';
import { ChartCalculator } from '../chart/chart-calculator';
import { AstroChart } from '../chart/astro-chart.types';
import { EphemerisProvider } from '../ephemeris/ephemeris.interface';
import { AstronomyEngineAdapter } from '../ephemeris/astronomy-engine.adapter';
import { PlanetSymbol, RawPlanetaryCoordinates } from '../planets/planet.types';
import { normalizeDegree } from '../coordinates/angular-math';
import { getRashiByLongitude, getDegreeInRashi } from '../zodiac/rashi';
import { getNakshatraByLongitude, getPada } from '../nakshatra/nakshatra';
import { getLocalPartsFromUtc, getOffsetMsAtUtc, isValidIanaTimezone, resolveLocalTimeToUtc } from '../validation/timezone.solver';
import { DayDivisionsCalculator } from '../muhurta/day-divisions.calculator';
import { LocalDateInput } from '../input/birth-details';
import {
  EPHEMERIS_OUTER_BODIES,
  EPHEMERIS_VEDIC_BODIES,
  EphemerisAscendantEntry,
  EphemerisBody,
  EphemerisBodyEntry,
  EphemerisRow,
  EphemerisTableRequest,
  EphemerisTableResult,
} from './ephemeris-table.types';

/** Hard limits that keep one request bounded (the sidecar pages through larger tables). */
export const EPHEMERIS_TABLE_MAX_ROWS_PER_CALL = 400;
export const EPHEMERIS_TABLE_MAX_TOTAL_ROWS = 40000;

export const EPHEMERIS_TABLE_SOURCE =
  'Positions: astronomy-engine 2.1 (MIT; VSOP87/ELP-based, about ±1 arc-minute) through the engine chart calculator; ' +
  'ayanamsa and node per the engine configuration. Magnitudes: astronomy-engine Illumination(). ' +
  'Uranus/Neptune/Pluto: provisional, ADR-016 §6.';

/**
 * Ephemeris provider decorator that remembers the raw (tropical, apparent) positions the chart
 * calculator asked for, so a table row can report the ayanamsa actually applied without
 * re-implementing the ayanamsa formula here.
 */
class RecordingEphemerisProvider implements EphemerisProvider {
  public last: Record<PlanetSymbol, RawPlanetaryCoordinates> | null = null;
  constructor(public readonly inner: EphemerisProvider) {}
  getProviderName(): string {
    return this.inner.getProviderName();
  }
  getProviderVersion(): string {
    return this.inner.getProviderVersion();
  }
  getPlanetaryPosition(planet: PlanetSymbol, julianDayUT: number) {
    return this.inner.getPlanetaryPosition(planet, julianDayUT);
  }
  async getAllPlanetaryPositions(julianDayUT: number) {
    const all = await this.inner.getAllPlanetaryPositions(julianDayUT);
    this.last = all;
    return all;
  }
}

const ASTRONOMY_BODY: Partial<Record<EphemerisBody, Astronomy.Body>> = {
  SUN: Astronomy.Body.Sun,
  MOON: Astronomy.Body.Moon,
  MERCURY: Astronomy.Body.Mercury,
  VENUS: Astronomy.Body.Venus,
  MARS: Astronomy.Body.Mars,
  JUPITER: Astronomy.Body.Jupiter,
  SATURN: Astronomy.Body.Saturn,
  URANUS: Astronomy.Body.Uranus,
  NEPTUNE: Astronomy.Body.Neptune,
  PLUTO: Astronomy.Body.Pluto,
};

/** Visual magnitude of a body at an instant (astronomy-engine `Illumination`); undefined for nodes. */
export function calculatePlanetaryMagnitude(body: EphemerisBody, utc: Date): number | undefined {
  const b = ASTRONOMY_BODY[body];
  if (b === undefined) return undefined;
  return Astronomy.Illumination(b, utc).mag;
}

const pad = (n: number) => String(n).padStart(2, '0');

function addDays(d: LocalDateInput, days: number): LocalDateInput {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

function addMonths(d: LocalDateInput, months: number): LocalDateInput {
  const first = new Date(Date.UTC(d.year, d.month - 1 + months, 1));
  const y = first.getUTCFullYear();
  const m = first.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { year: y, month: m, day: Math.min(d.day, lastDay) };
}

const dateKey = (d: LocalDateInput) => d.year * 10000 + d.month * 100 + d.day;
const dateStr = (d: LocalDateInput) => `${d.year}-${pad(d.month)}-${pad(d.day)}`;

/** The civil dates of the table, in order (the row count is the table length). */
export function listEphemerisTableDates(req: Pick<EphemerisTableRequest, 'startDate' | 'endDate' | 'step'>): LocalDateInput[] {
  const out: LocalDateInput[] = [];
  const end = dateKey(req.endDate);
  if (dateKey(req.startDate) > end) throw new Error('Ephemeris table endDate precedes startDate');
  for (let i = 0; ; i++) {
    const d = req.step === 'MONTH' ? addMonths(req.startDate, i) : addDays(req.startDate, req.step === 'WEEK' ? 7 * i : i);
    if (dateKey(d) > end) break;
    out.push(d);
    if (out.length > EPHEMERIS_TABLE_MAX_TOTAL_ROWS) throw new Error(`Ephemeris table exceeds ${EPHEMERIS_TABLE_MAX_TOTAL_ROWS} rows; use a larger step or a shorter range`);
  }
  return out;
}

function bodyEntry(body: EphemerisBody, raw: { longitude: number; latitude: number; speedLongitude: number; isRetrograde: boolean; distanceAU: number }, utc: Date, withMag: boolean): EphemerisBodyEntry {
  const lon = normalizeDegree(raw.longitude);
  const nak = getNakshatraByLongitude(lon);
  const entry: EphemerisBodyEntry = {
    body,
    longitude: lon,
    latitude: raw.latitude,
    degreeInSign: getDegreeInRashi(lon),
    rashiIndex: getRashiByLongitude(lon).index,
    rashiName: getRashiByLongitude(lon).sanskritName,
    nakshatraIndex: nak.index,
    nakshatraName: nak.name,
    pada: getPada(lon),
    nakshatraLord: nak.lord,
    speed: raw.speedLongitude,
    isRetrograde: raw.isRetrograde,
    distanceAU: raw.distanceAU,
  };
  if (withMag) {
    const m = calculatePlanetaryMagnitude(body, utc);
    if (m !== undefined) entry.magnitude = m;
  }
  return entry;
}

export interface EphemerisMomentOptions {
  location?: { latitude: number; longitude: number };
  timezone?: string;
  includeOuterPlanets?: boolean;
  includeMagnitude?: boolean;
}

/**
 * Deterministic ephemeris tables: planet longitudes, speed, retrograde flag, sign, nakshatra and
 * pada for a range of civil dates at a fixed local time or at local sunrise, plus the ascendant
 * when a location is given (local ephemeris). Positions come from the engine chart calculator, so
 * the ayanamsa and node method follow the `AstrologyConfig` passed in.
 */
export class EphemerisTableGenerator {
  private readonly recorder: RecordingEphemerisProvider;
  private readonly chartCalc: ChartCalculator;
  private readonly dayCalc = new DayDivisionsCalculator();

  constructor(ephemerisProvider?: EphemerisProvider, private readonly config: AstrologyConfig = DEFAULT_ASTROLOGY_CONFIG) {
    this.recorder = new RecordingEphemerisProvider(ephemerisProvider ?? new AstronomyEngineAdapter());
    this.chartCalc = new ChartCalculator(this.recorder);
  }

  /** Positions (and ascendant when a location is given) at one UTC instant. */
  public async positionsAt(utc: Date, opts: EphemerisMomentOptions = {}): Promise<EphemerisRow> {
    const timezone = opts.timezone ?? 'UTC';
    if (!isValidIanaTimezone(timezone)) throw new Error(`Invalid IANA timezone: ${timezone}`);
    const ms = utc.getTime();
    if (!Number.isFinite(ms)) throw new Error('Invalid instant');
    const l = getLocalPartsFromUtc(ms, timezone);
    const chart: AstroChart = await this.chartCalc.calculateChart(
      {
        date: { year: l.year, month: l.month, day: l.day },
        time: { hour: l.hour, minute: l.minute, second: l.second },
        timezone,
        latitude: opts.location?.latitude ?? 0,
        longitude: opts.location?.longitude ?? 0,
        utcDateTime: new Date(ms).toISOString(),
      },
      this.config,
    );
    const raw = this.recorder.last;
    if (!raw) throw new Error('Ephemeris provider returned no positions');
    const sidereal = this.config.zodiacType === 'SIDEREAL';
    // Ayanamsa actually applied by the chart calculator = tropical Sun - zodiacal Sun.
    let ayanamsa = sidereal ? normalizeDegree(raw[PlanetSymbol.SUN].longitude - chart.planets[PlanetSymbol.SUN].longitude) : 0;
    if (ayanamsa > 180) ayanamsa -= 360;

    const bodies: EphemerisBodyEntry[] = [];
    for (const b of EPHEMERIS_VEDIC_BODIES) {
      const p = chart.planets[b as PlanetSymbol];
      if (p) bodies.push(bodyEntry(b, p, utc, !!opts.includeMagnitude));
    }
    if (opts.includeOuterPlanets) {
      const jd = chart.metadata.normalizedTime.julianDayUT;
      for (const b of EPHEMERIS_OUTER_BODIES) {
        const r = await this.recorder.inner.getPlanetaryPosition(b as PlanetSymbol, jd);
        bodies.push(bodyEntry(b, { ...r, longitude: r.longitude - ayanamsa }, utc, !!opts.includeMagnitude));
      }
    }
    let ascendant: EphemerisAscendantEntry | undefined;
    if (opts.location && chart.ascendant) {
      const a = chart.ascendant;
      ascendant = {
        longitude: a.longitude,
        degreeInSign: a.degreeInRashi,
        rashiIndex: a.rashiIndex,
        rashiName: getRashiByLongitude(a.longitude).sanskritName,
        nakshatraIndex: a.nakshatraIndex,
        nakshatraName: getNakshatraByLongitude(a.longitude).name,
        pada: a.pada,
      };
    }
    return {
      date: `${l.year}-${pad(l.month)}-${pad(l.day)}`,
      localTime: `${pad(l.hour)}:${pad(l.minute)}:${pad(l.second)}`,
      utcIso: new Date(ms).toISOString(),
      julianDayUT: chart.metadata.normalizedTime.julianDayUT,
      utcOffsetMinutes: Math.round(getOffsetMsAtUtc(ms, timezone) / 60000),
      ayanamsa,
      bodies,
      ascendant,
    };
  }

  /** UTC instant of one table row. */
  public rowInstant(date: LocalDateInput, req: EphemerisTableRequest): Date {
    if (req.timeMode.kind === 'SUNRISE') {
      if (!req.location) throw new Error('A location is required for sunrise-based rows');
      const bounds = this.dayCalc.calculateSolarDay({ date, timezone: req.timezone, latitude: req.location.latitude, longitude: req.location.longitude });
      return new Date(bounds.sunriseIso);
    }
    const t = req.timeMode.time;
    return new Date(resolveLocalTimeToUtc(date.year, date.month, date.day, t.hour, t.minute, t.second, req.timezone, 'earlier').utcTimestampMs);
  }

  /** One page of the table (rows [offset, offset + limit)). */
  public async generate(req: EphemerisTableRequest): Promise<EphemerisTableResult> {
    if (!isValidIanaTimezone(req.timezone)) throw new Error(`Invalid IANA timezone: ${req.timezone}`);
    const dates = listEphemerisTableDates(req);
    const offset = Math.max(0, Math.floor(req.offset ?? 0));
    const limit = Math.min(EPHEMERIS_TABLE_MAX_ROWS_PER_CALL, Math.max(1, Math.floor(req.limit ?? EPHEMERIS_TABLE_MAX_ROWS_PER_CALL)));
    const rows: EphemerisRow[] = [];
    for (const d of dates.slice(offset, offset + limit)) {
      const row = await this.positionsAt(this.rowInstant(d, req), {
        location: req.location,
        timezone: req.timezone,
        includeOuterPlanets: req.includeOuterPlanets,
        includeMagnitude: req.includeMagnitude,
      });
      rows.push({ ...row, date: dateStr(d) });
    }
    const sidereal = this.config.zodiacType === 'SIDEREAL';
    const notes = [
      'Positions are geocentric and apparent (light-time and aberration corrected), from astronomy-engine (about ±1 arc-minute).',
      sidereal ? `Sidereal zodiac, ayanamsa ${this.config.ayanamsa} as implemented by the engine (see feature-parity Q1).` : 'Tropical zodiac (no ayanamsa).',
      `Rahu/Ketu: ${this.config.nodeCalculation === 'TRUE_NODE' ? 'true' : 'mean'} node per the engine configuration.`,
      'Speed is in degrees per day; a negative speed means retrograde motion.',
    ];
    if (req.timeMode.kind === 'SUNRISE') notes.push('Rows are at local sunrise as computed by the engine (upper limb, standard refraction; see Q19).');
    if (req.includeOuterPlanets) notes.push('Uranus, Neptune and Pluto: provisional – pending client review (ADR-016 §6).');
    return {
      zodiac: sidereal ? 'SIDEREAL' : 'TROPICAL',
      ayanamsaSystem: sidereal ? String(this.config.ayanamsa) : null,
      nodeCalculation: String(this.config.nodeCalculation),
      step: req.step,
      timeMode: req.timeMode,
      timezone: req.timezone,
      totalRows: dates.length,
      offset,
      rows,
      notes,
      provisional: !!req.includeOuterPlanets,
      source: EPHEMERIS_TABLE_SOURCE,
    };
  }
}
