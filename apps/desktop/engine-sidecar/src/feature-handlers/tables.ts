/**
 * Feature handlers: ephemeris tables, positions, Lagna rising, combustion periods, planetary
 * relationships, transit tables and Sade Sati periods. Thin adapters over @astro/astrology-engine.
 */
import {
  AscendantRisingCalculator,
  BirthTimeSensitivityCalculator,
  AstrologyConfig,
  calculateRelationshipTable,
  CombustionPeriodSolver,
  COMBUSTION_PERIOD_PLANETS,
  EphemerisTableGenerator,
  EphemerisStep,
  PlanetSymbol,
  MANDATORY_VEDIC_PLANETS,
  SadeSatiPeriodsCalculator,
  TransitCalculator,
  isValidIanaTimezone,
} from '@astro/astrology-engine';
import { ACTIVE_CONFIG, chartFor, Handler, intParam, isoDate, isRecord, offsetMinutes, optionalString, pageOf, stringList } from '../common';
import { parseBirthInput, parseDate, parseLocation, parseTime, toUtcIso } from '../birth';
import { ProtocolError } from '../protocol';

const STEPS: EphemerisStep[] = ['DAY', 'WEEK', 'MONTH'];
const ZODIACS = ['SIDEREAL', 'TROPICAL'] as const;
const EVENT_TYPES = ['SIGN_INGRESS', 'NAKSHATRA_INGRESS', 'RETROGRADE_STATION', 'DIRECT_STATION'] as const;
const DAY_MS = 86400000;

function bad(message: string): never {
  throw new ProtocolError('INVALID_PARAMS', message);
}

function configFor(p: Record<string, unknown>): AstrologyConfig {
  const z = optionalString(p.zodiac, 'zodiac') ?? 'SIDEREAL';
  if (!(ZODIACS as readonly string[]).includes(z)) bad(`zodiac must be one of ${ZODIACS.join(', ')}`);
  return z === 'TROPICAL' ? { ...ACTIVE_CONFIG, zodiacType: 'TROPICAL' } : ACTIVE_CONFIG;
}

function bool(v: unknown, field: string): boolean {
  if (v === undefined) return false;
  if (typeof v !== 'boolean') bad(`${field} must be a boolean`);
  return v;
}

function zone(v: unknown, field = 'timezone'): string {
  if (typeof v !== 'string' || !isValidIanaTimezone(v)) bad(`${field} must be a valid IANA timezone`);
  return v;
}

function range(p: Record<string, unknown>, maxDays: number): { start: Date; end: Date } {
  const start = isoDate(p.startIso, 'startIso');
  const end = isoDate(p.endIso, 'endIso');
  if (end <= start || end.getTime() - start.getTime() > maxDays * DAY_MS) bad(`range must be positive and at most ${maxDays} days`);
  return { start, end };
}

const generators = new Map<string, EphemerisTableGenerator>();
function generator(config: AstrologyConfig): EphemerisTableGenerator {
  const key = config.zodiacType;
  let g = generators.get(key);
  if (!g) {
    g = new EphemerisTableGenerator(undefined, config);
    generators.set(key, g);
  }
  return g;
}

export const handlers: Record<string, Handler> = {
  /** Paged ephemeris table: one row per date (fixed local time or sunrise). */
  'ephemeris.table': async (p) => {
    const config = configFor(p);
    const step = (optionalString(p.step, 'step') ?? 'DAY') as EphemerisStep;
    if (!STEPS.includes(step)) bad(`step must be one of ${STEPS.join(', ')}`);
    const timezone = zone(p.timezone);
    const sunrise = bool(p.sunrise, 'sunrise');
    const location = p.location === undefined ? undefined : parseLocation({ ...(isRecord(p.location) ? p.location : {}), timezone });
    if (sunrise && !location) bad('location is required when sunrise is true');
    const pageSize = intParam(p.pageSize, 'pageSize', 1, 400, 100);
    const page = intParam(p.page, 'page', 0, 100000, 0);
    const result = await generator(config).generate({
      startDate: parseDate(p.startDate, 'startDate'),
      endDate: parseDate(p.endDate, 'endDate'),
      step,
      timezone,
      timeMode: sunrise ? { kind: 'SUNRISE' } : { kind: 'FIXED_TIME', time: parseTime(p.time ?? '00:00', 'time') },
      location: location ? { latitude: location.latitude, longitude: location.longitude } : undefined,
      includeOuterPlanets: bool(p.includeOuterPlanets, 'includeOuterPlanets'),
      includeMagnitude: bool(p.includeMagnitude, 'includeMagnitude'),
      offset: page * pageSize,
      limit: pageSize,
    }).catch((e: unknown) => bad(e instanceof Error ? e.message : String(e)));
    return { ...result, page, pageSize, pageCount: Math.max(1, Math.ceil(result.totalRows / pageSize)) };
  },

  /** Positions of all bodies (and the Lagna) at one local moment and place. */
  'ephemeris.positions': async (p) => {
    const moment = parseBirthInput(p.moment, 'moment');
    return generator(configFor(p)).positionsAt(new Date(toUtcIso(moment)), {
      location: { latitude: moment.latitude, longitude: moment.longitude },
      timezone: moment.timezone,
      includeOuterPlanets: bool(p.includeOuterPlanets, 'includeOuterPlanets'),
      includeMagnitude: p.includeMagnitude === undefined ? true : bool(p.includeMagnitude, 'includeMagnitude'),
    });
  },

  /** Rising time of each sign over a civil day (or sunrise to sunrise) at a place. */
  'ascendant.rising': async (p) => {
    const loc = parseLocation(p.location);
    const span = optionalString(p.span, 'span') ?? 'CIVIL_DAY';
    if (span !== 'CIVIL_DAY' && span !== 'SUNRISE_TO_SUNRISE') bad('span must be CIVIL_DAY or SUNRISE_TO_SUNRISE');
    try {
      const t = await new AscendantRisingCalculator(ACTIVE_CONFIG).calculate({ date: parseDate(p.date), timezone: loc.timezone, latitude: loc.latitude, longitude: loc.longitude, span });
      return { ...t, utcOffsetMinutes: offsetMinutes(Date.parse(t.windowStartIso) + DAY_MS / 2, loc.timezone) };
    } catch (e) {
      if (e instanceof ProtocolError) throw e;
      return bad(e instanceof Error ? e.message : String(e));
    }
  },

  /** Combustion (asta) periods over a range (≤ 5 years). */
  'combustion.periods': async (p) => {
    const { start, end } = range(p, 5 * 366);
    const planets = stringList(p.planets, 'planets', COMBUSTION_PERIOD_PLANETS as readonly string[]) as PlanetSymbol[] | undefined;
    const timezone = p.timezone === undefined ? undefined : zone(p.timezone);
    const r = await new CombustionPeriodSolver().findPeriods({ startIso: start.toISOString(), endIso: end.toISOString(), planets });
    if (!timezone) return r;
    return { ...r, timezone, periods: r.periods.map((x) => ({ ...x, startOffsetMinutes: offsetMinutes(Date.parse(x.startIso), timezone), endOffsetMinutes: offsetMinutes(Date.parse(x.endIso), timezone) })) };
  },

  /** Natural, temporal and compound relationships for a chart. */
  'relationships.compute': async (p) => calculateRelationshipTable(await chartFor(parseBirthInput(p.birth))),

  /** Paged transit tables: sign / nakshatra ingresses and stations, filtered. */
  'transit.tables': async (p) => {
    const { start, end } = range(p, 730);
    const timezone = p.timezone === undefined ? undefined : zone(p.timezone);
    const planets = stringList(p.planets, 'planets', MANDATORY_VEDIC_PLANETS as readonly string[]) as PlanetSymbol[] | undefined;
    const eventTypes = stringList(p.eventTypes, 'eventTypes', EVENT_TYPES) as (typeof EVENT_TYPES)[number][] | undefined;
    const timeline = await new TransitCalculator().calculateTransitTimeline({ startDateIso: start.toISOString(), endDateIso: end.toISOString(), timezone, planets, eventTypes });
    const events = timezone ? timeline.events.map((e) => ({ ...e, utcOffsetMinutes: offsetMinutes(Date.parse(e.timestampIso), timezone) })) : timeline.events;
    const paged = pageOf(events, p, 500, 2000);
    return { startIso: start.toISOString(), endIso: end.toISOString(), timezone: timezone ?? null, ...paged };
  },

  /** Sade Sati cycles (Saturn in the 12th, 1st and 2nd signs from the natal Moon). */
  'sadeSati.periods': async (p) => {
    const birth = parseBirthInput(p.birth);
    const chart = await chartFor(birth);
    const startIso = p.startIso === undefined ? chart.metadata.normalizedTime.utcIsoString : isoDate(p.startIso, 'startIso').toISOString();
    const years = intParam(p.years, 'years', 1, 120, 100);
    const endIso = p.endIso === undefined ? new Date(Date.parse(startIso) + years * 365.25 * DAY_MS).toISOString() : isoDate(p.endIso, 'endIso').toISOString();
    try {
      const r = await new SadeSatiPeriodsCalculator(undefined, ACTIVE_CONFIG).calculate({ natalMoonLongitude: chart.planets[PlanetSymbol.MOON].longitude, startIso, endIso });
      return { ...r, utcOffsetMinutes: offsetMinutes(Date.parse(startIso), birth.timezone), timezone: birth.timezone };
    } catch (e) {
      return bad(e instanceof Error ? e.message : String(e));
    }
  },

  /** Birth-time sensitivity (rectification aid): boundary crossings of the Lagna and Moon near the birth time. */
  'rectification.sensitivity': async (p) => {
    const birth = parseBirthInput(p.birth);
    const windowMinutes = intParam(p.windowMinutes, 'windowMinutes', 1, 180, 30);
    try {
      const r = await new BirthTimeSensitivityCalculator(ACTIVE_CONFIG).calculate({ birthUtcIso: toUtcIso(birth), latitude: birth.latitude, longitude: birth.longitude, windowMinutes });
      return { ...r, utcOffsetMinutes: offsetMinutes(Date.parse(r.birthUtcIso), birth.timezone) };
    } catch (e) {
      return bad(e instanceof Error ? e.message : String(e));
    }
  },
};
