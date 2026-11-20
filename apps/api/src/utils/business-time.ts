/**
 * Business timezone helpers.
 *
 * Astro Sushil operates in India: "today", consultation slot dates, daily
 * horoscope keys and admin day buckets are IST calendar dates (Asia/Kolkata,
 * UTC+05:30, no DST), independent of the server's or the database's timezone.
 *
 * Never use the host's local time (`new Date().getDate()`, `setHours(0,0,0,0)`,
 * `toDateString()`, `toLocaleDateString()` without `timeZone`) for business
 * dates: production containers usually run in UTC, so those calls flip the
 * day at 05:30 IST instead of midnight.
 *
 * Birth date and time are NOT business dates: they are the birth place's civil
 * time and are handled by the birth-details normalizer.
 */

export const BUSINESS_TIMEZONE = 'Asia/Kolkata';

/** Asia/Kolkata has had a fixed +05:30 offset since 1945. */
export const IST_OFFSET_MS = 330 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** IST calendar date (YYYY-MM-DD) of an instant. */
export function istDateOf(instant: Date = new Date()): string {
  return new Date(instant.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** IST calendar year of an instant. */
export function istYearOf(instant: Date = new Date()): number {
  return Number(istDateOf(instant).slice(0, 4));
}

function parseDate(date: string): { y: number; m: number; d: number } {
  const match = DATE_RE.exec(date);
  if (!match) throw new RangeError(`Invalid date "${date}". Expected YYYY-MM-DD`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    throw new RangeError(`Invalid date "${date}"`);
  }
  return { y, m, d };
}

/** The instant of 00:00 IST on an IST calendar date. */
export function istStartOfDay(date: string): Date {
  const { y, m, d } = parseDate(date);
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

/** The last millisecond (23:59:59.999 IST) of an IST calendar date. */
export function istEndOfDay(date: string): Date {
  return new Date(istStartOfDay(date).getTime() + DAY_MS - 1);
}

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function calendarDaysBetween(from: string, to: string): number {
  const a = parseDate(from);
  const b = parseDate(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / DAY_MS);
}

/** True when the string is a valid YYYY-MM-DD calendar date. */
export function isCalendarDate(value: string): boolean {
  try {
    parseDate(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Range bound from a filter value: a bare YYYY-MM-DD is an IST business date
 * and covers that whole IST day ('start' = 00:00 IST, 'end' = 23:59:59.999 IST);
 * anything else is parsed as an ISO instant.
 */
export function parseDateBound(value: string, edge: 'start' | 'end'): Date {
  if (isCalendarDate(value)) return edge === 'start' ? istStartOfDay(value) : istEndOfDay(value);
  return new Date(value);
}
