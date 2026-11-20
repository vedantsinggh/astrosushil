import {
  GandmoolPanchakaRangeReport,
  GANDMOOL_PANCHAKA_MAX_RANGE_DAYS,
  MuhurtaExtrasCalculator,
  isValidIanaTimezone,
} from '@astro/astrology-engine';
import { ACTIVE_CONFIG, Handler, isoDate, offsetMinutes, optionalString, pageOf, stringList } from '../common';
import { parseDate, parseLocation } from '../birth';
import { ProtocolError } from '../protocol';

/** Feature handlers: muhurta-extras. Method names are listed in docs/sidecar-protocol.md. */
const calc = new MuhurtaExtrasCalculator(ACTIVE_CONFIG);

const VARJYAM_TABLES = ['PUBLISHED_PANCHANG', 'PRASHNA_MARGA'] as const;
const WINDOW_KINDS = ['GANDMOOL', 'PANCHAKA'] as const;

/** A year-long range takes a few seconds; keep the last few results so paging does not recompute. */
const rangeCache = new Map<string, Promise<GandmoolPanchakaRangeReport>>();
const RANGE_CACHE_SIZE = 4;

function rangeReport(start: Date, end: Date): Promise<GandmoolPanchakaRangeReport> {
  const key = `${start.toISOString()}|${end.toISOString()}`;
  const hit = rangeCache.get(key);
  if (hit) return hit;
  const pending = calc.gandmoolPanchakaWindows(start, end);
  pending.catch(() => rangeCache.delete(key));
  rangeCache.set(key, pending);
  if (rangeCache.size > RANGE_CACHE_SIZE) rangeCache.delete(rangeCache.keys().next().value as string);
  return pending;
}

function optionalTimezone(v: unknown): string | undefined {
  const tz = optionalString(v, 'timezone');
  if (tz !== undefined && !isValidIanaTimezone(tz)) throw new ProtocolError('INVALID_PARAMS', 'timezone must be a valid IANA timezone');
  return tz;
}

export const handlers: Record<string, Handler> = {
  /** Durmuhurta, Varjyam and Amrit Kalam for a local civil date at a place. */
  'muhurta.extras': async (p) => {
    const loc = parseLocation(p.location);
    const date = parseDate(p.date);
    const table = optionalString(p.varjyamTable, 'varjyamTable');
    if (table !== undefined && !(VARJYAM_TABLES as readonly string[]).includes(table)) {
      throw new ProtocolError('INVALID_PARAMS', `varjyamTable must be one of ${VARJYAM_TABLES.join(', ')}`);
    }
    let report;
    try {
      report = await calc.calculateDay(
        { date, timezone: loc.timezone, latitude: loc.latitude, longitude: loc.longitude },
        { varjyamTable: table as (typeof VARJYAM_TABLES)[number] | undefined }
      );
    } catch (e) {
      if (e instanceof Error && e.name === 'DayDivisionError') throw new ProtocolError('INVALID_PARAMS', e.message);
      throw e;
    }
    return { ...report, utcOffsetMinutes: offsetMinutes(Date.parse(report.sunriseIso), loc.timezone) };
  },

  /** Gandmool / Panchaka flags for the Moon at one instant. */
  'muhurta.gandmoolPanchakaAt': async (p) => calc.gandmoolPanchakaAt(isoDate(p.instant, 'instant')),

  /** Gandmool and Panchaka windows overlapping [startIso, endIso] (at most 366 days), paged. */
  'muhurta.gandmoolPanchaka': async (p) => {
    const start = isoDate(p.startIso, 'startIso');
    const end = isoDate(p.endIso, 'endIso');
    if (!(end.getTime() > start.getTime())) throw new ProtocolError('INVALID_PARAMS', 'endIso must be after startIso');
    if (end.getTime() - start.getTime() > GANDMOOL_PANCHAKA_MAX_RANGE_DAYS * 86400000) {
      throw new ProtocolError('INVALID_PARAMS', `range must not exceed ${GANDMOOL_PANCHAKA_MAX_RANGE_DAYS} days`);
    }
    const timezone = optionalTimezone(p.timezone);
    const kinds = stringList(p.kinds, 'kinds', WINDOW_KINDS) ?? [...WINDOW_KINDS];
    const report = await rangeReport(start, end);
    const rows = report.windows
      .filter((w) => kinds.includes(w.kind))
      .map((w) => (timezone ? { ...w, utcOffsetMinutes: offsetMinutes(Date.parse(w.startIso), timezone) } : w));
    return {
      startIso: report.startIso,
      endIso: report.endIso,
      timezone: timezone ?? null,
      kinds,
      provisional: report.provisional,
      source: report.source,
      conventionNotes: report.conventionNotes,
      ...pageOf(rows, p, 100, 500),
    };
  },
};
