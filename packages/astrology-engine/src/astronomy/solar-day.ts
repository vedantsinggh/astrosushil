import * as Astronomy from 'astronomy-engine';
import { resolveLocalTimeToUtc } from '../validation/timezone.solver';
import { BirthTimeNonexistentError } from '../errors/astrology.error';

/**
 * Single shared sunrise/sunset primitive for everything anchored to the local solar day
 * (PanchangCalculator, DayDivisionsCalculator / Muhurta).
 *
 * Convention (client decision 2026-11-20, docs/decisions.md ADR-015): sunrise/sunset = the Sun's
 * UPPER LIMB on the horizon with standard atmospheric refraction (34'), observer at sea level, as in
 * published Indian panchangs and timeanddate.com / USNO. astronomy-engine `SearchRiseSet(Body.Sun, ...)`
 * implements exactly this (target altitude = -34' refraction minus the Sun's angular semi-diameter).
 * Verified against USNO times in tests/unit/sunrise-local-midnight.test.ts (+/- 2 min).
 *
 * The search for sunrise starts at LOCAL midnight of the requested civil date. (Searching from
 * UTC midnight returns the next day's sunrise east of Greenwich whenever sunrise falls before
 * 00:00 UTC, e.g. New Delhi in summer, where sunrise is ~23:54 UTC of the previous UTC date.)
 */

export interface CivilDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export interface LocalSolarEvents {
  /** UTC instant of local midnight that starts the civil date. */
  localMidnightMs: number;
  /** UTC instant of local midnight that starts the next civil date (23/24/25 h later). */
  nextLocalMidnightMs: number;
  /** First sunrise on the local civil date; null when the Sun does not rise that day (polar). */
  sunrise: Date | null;
  /** First sunset after that sunrise (within one day); null if none. */
  sunset: Date | null;
  /** First sunrise after that sunset (within one day); null if none. */
  nextSunrise: Date | null;
}

const HOUR_MS = 3600000;

/**
 * UTC instant at which the civil date begins at the location.
 * - With an IANA `timezone`: real local midnight, DST-aware. If midnight does not exist (a DST
 *   change at 00:00, e.g. America/Santiago), the first existing whole hour of that date is used.
 * - Without a timezone: local MEAN midnight from the longitude (UTC offset = longitude / 15 h).
 */
export function localMidnightUtcMs(date: CivilDate, timezone: string | undefined, longitude: number): number {
  if (!timezone) {
    return Date.UTC(date.year, date.month - 1, date.day) - (longitude / 15) * HOUR_MS;
  }
  for (let hour = 0; hour < 24; hour++) {
    try {
      return resolveLocalTimeToUtc(date.year, date.month, date.day, hour, 0, 0, timezone, 'earlier').utcTimestampMs;
    } catch (err) {
      if (!(err instanceof BirthTimeNonexistentError)) throw err;
    }
  }
  throw new BirthTimeNonexistentError(
    `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`,
    timezone,
    `Civil date does not exist in timezone "${timezone}".`
  );
}

function nextCivilDate(date: CivilDate): CivilDate {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Sunrise, sunset and next sunrise for a local civil date at a location.
 * Never throws for polar days; missing events are returned as null.
 */
export function findLocalSolarEvents(
  date: CivilDate,
  latitude: number,
  longitude: number,
  timezone?: string
): LocalSolarEvents {
  const localMidnightMs = localMidnightUtcMs(date, timezone, longitude);
  const nextLocalMidnightMs = localMidnightUtcMs(nextCivilDate(date), timezone, longitude);
  const observer = new Astronomy.Observer(latitude, longitude, 0);

  const dayLimit = (nextLocalMidnightMs - localMidnightMs) / 86400000;
  const rise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, new Date(localMidnightMs), dayLimit);
  const sunrise = rise && rise.date.getTime() < nextLocalMidnightMs ? rise.date : null;
  if (!sunrise) {
    return { localMidnightMs, nextLocalMidnightMs, sunrise: null, sunset: null, nextSunrise: null };
  }
  const set = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, sunrise, 1.0);
  const sunset = set ? set.date : null;
  const next = sunset ? Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, sunset, 1.0) : null;
  return { localMidnightMs, nextLocalMidnightMs, sunrise, sunset, nextSunrise: next ? next.date : null };
}
