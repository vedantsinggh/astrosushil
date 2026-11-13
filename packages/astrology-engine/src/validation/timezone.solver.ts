import { BirthDetailsValidationError, BirthTimeNonexistentError, BirthTimeAmbiguousError, AmbiguousTimeCandidate } from '../errors/astrology.error';
import { TimezoneDisambiguation } from '../input/birth-details';

export interface ResolvedUtcInstant {
  utcIsoString: string;
  utcTimestampMs: number;
  timezoneOffsetSeconds: number;
  timezoneOffsetMinutes: number;
  isDaylightSaving: boolean;
}

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function getCachedDtf(timeZone: string): Intl.DateTimeFormat {
  let dtf = dtfCache.get(timeZone);
  if (!dtf) {
    try {
      dtf = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      dtfCache.set(timeZone, dtf);
    } catch {
      throw new BirthDetailsValidationError(`Invalid IANA timezone identifier: "${timeZone}".`, [
        `Invalid IANA timezone identifier: "${timeZone}".`,
      ]);
    }
  }
  return dtf;
}

export function isValidIanaTimezone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export interface LocalCalendarParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function getLocalPartsFromUtc(utcMs: number, timeZone: string): LocalCalendarParts {
  const dtf = getCachedDtf(timeZone);
  const parts = dtf.formatToParts(new Date(utcMs));
  const v: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      v[p.type] = parseInt(p.value, 10);
    }
  }
  if (v.hour === 24) v.hour = 0;
  return {
    year: v.year,
    month: v.month,
    day: v.day,
    hour: v.hour,
    minute: v.minute,
    second: v.second,
  };
}

/**
 * Returns exact signed offset in milliseconds between local clock time and UTC instant.
 * Rounded to whole integer seconds because IANA timezone offsets are discrete seconds.
 */
export function getOffsetMsAtUtc(utcMs: number, timeZone: string): number {
  const loc = getLocalPartsFromUtc(utcMs, timeZone);
  const asUtc = Date.UTC(loc.year, loc.month - 1, loc.day, loc.hour, loc.minute, loc.second);
  const diff = asUtc - utcMs;
  return Math.round(diff / 1000) * 1000;
}

/**
 * Robustly converts local wall-clock date and time in an IANA timezone into a UTC instant.
 * Uses a transition-aware sampling algorithm across the full global IANA offset range [-15h, +15h]
 * with binary search of transition boundaries. Accurately handles:
 * - Single unambiguous instants.
 * - Nonexistent wall-clock times (spring-forward gap or skipped calendar days).
 * - Ambiguous wall-clock times (fall-back overlap).
 * - Historical offsets containing exact seconds (e.g. Paris before 1911, Liberia before 1972).
 * - Offset transitions larger than 1 hour (2h, 3h, or 24h dateline shifts).
 */
export function resolveLocalTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
  disambiguation?: TimezoneDisambiguation
): ResolvedUtcInstant {
  if (!isValidIanaTimezone(timeZone)) {
    throw new BirthDetailsValidationError(`Invalid IANA timezone identifier: "${timeZone}".`, [
      `Invalid IANA timezone identifier: "${timeZone}".`,
    ]);
  }

  const pad = (n: number) => n.toString().padStart(2, '0');
  const localIsoString = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;

  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  // Transition-aware offset search across the full [-15h, +15h] window
  const offsets = new Set<number>();
  const windowMs = 15 * 3600000;
  const stepMs = 30 * 60000; // 30-minute sampling steps

  let prevOffset: number | null = null;
  let prevT = naiveUtc - windowMs;

  for (let t = naiveUtc - windowMs; t <= naiveUtc + windowMs; t += stepMs) {
    const off = getOffsetMsAtUtc(t, timeZone);
    offsets.add(off);

    // If offset changed between consecutive sample points, binary search the exact transition boundary
    if (prevOffset !== null && off !== prevOffset) {
      let low = prevT;
      let high = t;
      while (high - low > 1000) {
        const mid = Math.floor((low + high) / 2000) * 1000;
        if (mid === low) break;
        const midOff = getOffsetMsAtUtc(mid, timeZone);
        if (midOff === prevOffset) {
          low = mid;
        } else {
          high = mid;
        }
      }
      offsets.add(getOffsetMsAtUtc(low, timeZone));
      offsets.add(getOffsetMsAtUtc(high, timeZone));
    }

    prevOffset = off;
    prevT = t;
  }

  interface MatchCandidate {
    utcMs: number;
    offsetSeconds: number;
    offsetMinutes: number;
    utcIso: string;
  }

  const matchedUtcs = new Set<number>();
  const matches: MatchCandidate[] = [];

  for (const off of offsets) {
    const candUtc = naiveUtc - off;
    if (matchedUtcs.has(candUtc)) continue;

    const loc = getLocalPartsFromUtc(candUtc, timeZone);
    if (
      loc.year === year &&
      loc.month === month &&
      loc.day === day &&
      loc.hour === hour &&
      loc.minute === minute &&
      loc.second === second
    ) {
      matchedUtcs.add(candUtc);
      const offsetSeconds = Math.round(off / 1000);
      const offsetMinutes = offsetSeconds / 60;
      matches.push({
        utcMs: candUtc,
        offsetSeconds,
        offsetMinutes,
        utcIso: new Date(candUtc).toISOString(),
      });
    }
  }

  // Sort matches chronologically (earlier occurrence first)
  matches.sort((a, b) => a.utcMs - b.utcMs);

  if (matches.length === 0) {
    throw new BirthTimeNonexistentError(localIsoString, timeZone);
  }

  if (matches.length > 1) {
    const candidates: AmbiguousTimeCandidate[] = [
      {
        disambiguation: 'earlier',
        utcIsoString: matches[0].utcIso,
        utcTimestampMs: matches[0].utcMs,
        timezoneOffsetSeconds: matches[0].offsetSeconds,
        offsetMinutes: matches[0].offsetMinutes,
        type: 'daylight',
      },
      {
        disambiguation: 'later',
        utcIsoString: matches[1].utcIso,
        utcTimestampMs: matches[1].utcMs,
        timezoneOffsetSeconds: matches[1].offsetSeconds,
        offsetMinutes: matches[1].offsetMinutes,
        type: 'standard',
      },
    ];

    if (disambiguation === 'earlier' || disambiguation === 'daylight') {
      return {
        utcIsoString: matches[0].utcIso,
        utcTimestampMs: matches[0].utcMs,
        timezoneOffsetSeconds: matches[0].offsetSeconds,
        timezoneOffsetMinutes: matches[0].offsetMinutes,
        isDaylightSaving: true,
      };
    }

    if (disambiguation === 'later' || disambiguation === 'standard') {
      return {
        utcIsoString: matches[1].utcIso,
        utcTimestampMs: matches[1].utcMs,
        timezoneOffsetSeconds: matches[1].offsetSeconds,
        timezoneOffsetMinutes: matches[1].offsetMinutes,
        isDaylightSaving: false,
      };
    }

    throw new BirthTimeAmbiguousError(localIsoString, timeZone, candidates);
  }

  // Single valid match
  const match = matches[0];
  const janOffset = Math.round(getOffsetMsAtUtc(Date.UTC(year, 0, 15, 12, 0, 0), timeZone) / 60000);
  const julOffset = Math.round(getOffsetMsAtUtc(Date.UTC(year, 6, 15, 12, 0, 0), timeZone) / 60000);
  const standardOffset = Math.min(janOffset, julOffset);
  const isDaylightSaving = match.offsetMinutes > standardOffset;

  return {
    utcIsoString: match.utcIso,
    utcTimestampMs: match.utcMs,
    timezoneOffsetSeconds: match.offsetSeconds,
    timezoneOffsetMinutes: match.offsetMinutes,
    isDaylightSaving,
  };
}
