import { AppError } from '../../errors/app-error';
import { ContentCache } from '../content/content.cache';

/**
 * Timezone of a birth place for the website-compatible endpoints.
 *
 * The vendor the website used assumed Indian time (UTC+5:30) for every birth, so a chart for a
 * birth outside India was calculated for the wrong instant. This backend never assumes a zone:
 *
 *   1. a `timezone` sent with the request (the IANA name our place search returns) is used;
 *   2. otherwise the zone our own place search returned for exactly these coordinates is used
 *      (the website page copies latitude and longitude from the selected place unchanged);
 *   3. otherwise the request is refused with TIMEZONE_REQUIRED. Nothing is guessed, because a
 *      guessed zone silently shifts every value of the chart.
 *
 * There is no coordinates-to-timezone table in this repository (the place search gets the zone
 * from the geocoding provider with each place), so step 2 can only know places that were searched.
 */

const PLACE_TZ_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOCAL_MAX_ENTRIES = 20_000;

/** Coordinates are compared at 4 decimal places (about 11 m), the precision place search returns. */
export function coordinateKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

export class PlaceTimezoneMemo {
  private readonly local = new Map<string, string>();

  constructor(private readonly shared: Pick<ContentCache, 'get' | 'set'> = new ContentCache()) {}

  /** Remembers the zone place search returned for these coordinates. */
  public async remember(latitude: number, longitude: number, timezone: string): Promise<void> {
    const key = coordinateKey(latitude, longitude);
    if (this.local.size >= LOCAL_MAX_ENTRIES && !this.local.has(key)) {
      const oldest = this.local.keys().next().value;
      if (oldest !== undefined) this.local.delete(oldest);
    }
    this.local.set(key, timezone);
    // Shared between API processes when Redis is configured (ContentCache falls back to memory).
    await this.shared.set(`web-astrology:place-tz:${key}`, timezone, PLACE_TZ_TTL_MS);
  }

  public async lookup(latitude: number, longitude: number): Promise<string | null> {
    const key = coordinateKey(latitude, longitude);
    const local = this.local.get(key);
    if (local) return local;
    const shared = await this.shared.get<string>(`web-astrology:place-tz:${key}`);
    if (typeof shared === 'string' && shared.length > 0) {
      this.local.set(key, shared);
      return shared;
    }
    return null;
  }

  /** Test helper. */
  public clear(): void {
    this.local.clear();
  }
}

export type TimezoneSource = 'request' | 'place-search';

export interface ResolvedTimezone {
  timezone: string;
  source: TimezoneSource;
}

export class TimezoneRequiredError extends AppError {
  constructor(field = 'timezone') {
    super(
      'The timezone of the birth place is needed. Send the "timezone" value returned by place search with the selected place.',
      422,
      'TIMEZONE_REQUIRED',
      [{ field, message: 'IANA timezone of the birth place, for example "Asia/Kolkata"', code: 'TIMEZONE_REQUIRED' }]
    );
  }
}

export async function resolveBirthTimezone(
  memo: PlaceTimezoneMemo,
  input: { latitude: number; longitude: number; timezone?: string | null },
  field = 'timezone'
): Promise<ResolvedTimezone> {
  if (input.timezone) return { timezone: input.timezone, source: 'request' };
  const remembered = await memo.lookup(input.latitude, input.longitude);
  if (remembered) return { timezone: remembered, source: 'place-search' };
  throw new TimezoneRequiredError(field);
}

/** Offset from UTC, in hours, of an instant in a zone (5.5 for India). The vendor's `timezone` field was this number. */
export function utcOffsetHours(offsetMinutes: number): number {
  return Math.round((offsetMinutes / 60) * 100) / 100;
}
