import { describe, it, expect } from 'vitest';
import * as Astronomy from 'astronomy-engine';
import { PanchangCalculator } from '../../src/panchang/panchang-calculator';
import { findLocalSolarEvents, localMidnightUtcMs } from '../../src/astronomy/solar-day';
import { DayDivisionsCalculator } from '../../src/muhurta/day-divisions.calculator';

/**
 * Published sunrise/sunset references: U.S. Naval Observatory "Sun and Moon Data for One Day"
 * API, fetched 2026-11-20, converted here from the stated local standard time to UTC:
 *   https://aa.usno.navy.mil/api/rstt/oneday?date=<YYYY-MM-DD>&coords=<lat>,<lon>&tz=<std offset h>[&dst=true]
 * New Delhi: coords=28.6139,77.209 tz=5.5          New York: coords=40.7128,-74.006 tz=-5&dst=true
 * Sydney:    coords=-33.8688,151.2093 tz=10 (no dst flag; USNO applies US DST rules, so standard
 *            time was requested and AEDT handled here)
 * Tromso:    coords=69.6492,18.9553 tz=1&dst=true ("Object continuously above/below the Horizon")
 * USNO times are rounded to the minute (upper limb, standard refraction).
 * TOLERANCE: +/- 2 minutes.
 */
const TOL_MS = 2 * 60000;

interface SunRef {
  label: string;
  date: { year: number; month: number; day: number };
  timezone: string;
  latitude: number;
  longitude: number;
  riseUtc: string;
  setUtc: string;
}

const DELHI = { timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209 };
const NYC = { timezone: 'America/New_York', latitude: 40.7128, longitude: -74.006 };
const SYD = { timezone: 'Australia/Sydney', latitude: -33.8688, longitude: 151.2093 };

const REFS: SunRef[] = [
  // New Delhi (IST, UTC+5:30). Sunrise before 05:30 IST = before 00:00 UTC => old bug triggered.
  { label: 'New Delhi March equinox (USNO 06:25 / 18:33 IST)', date: { year: 2024, month: 3, day: 20 }, ...DELHI, riseUtc: '2024-03-20T00:55Z', setUtc: '2024-03-20T13:03Z' },
  { label: 'New Delhi June solstice (USNO 05:24 / 19:22 IST) [bug date]', date: { year: 2024, month: 6, day: 21 }, ...DELHI, riseUtc: '2024-06-20T23:54Z', setUtc: '2024-06-21T13:52Z' },
  { label: 'New Delhi Sept equinox (USNO 06:10 / 18:17 IST)', date: { year: 2024, month: 9, day: 22 }, ...DELHI, riseUtc: '2024-09-22T00:40Z', setUtc: '2024-09-22T12:47Z' },
  { label: 'New Delhi December solstice (USNO 07:10 / 17:29 IST)', date: { year: 2024, month: 12, day: 21 }, ...DELHI, riseUtc: '2024-12-21T01:40Z', setUtc: '2024-12-21T11:59Z' },
  // New York (western hemisphere, negative offset, DST).
  { label: 'New York DST start day (USNO 07:15 / 18:58 EDT)', date: { year: 2024, month: 3, day: 10 }, ...NYC, riseUtc: '2024-03-10T11:15Z', setUtc: '2024-03-10T22:58Z' },
  { label: 'New York June solstice (USNO 05:25 / 20:31 EDT)', date: { year: 2024, month: 6, day: 21 }, ...NYC, riseUtc: '2024-06-21T09:25Z', setUtc: '2024-06-22T00:31Z' },
  { label: 'New York December solstice (USNO 07:17 / 16:32 EST)', date: { year: 2024, month: 12, day: 21 }, ...NYC, riseUtc: '2024-12-21T12:17Z', setUtc: '2024-12-21T21:32Z' },
  // Sydney (southern hemisphere, UTC+10/+11). Sunrise is always before 00:00 UTC => old bug always triggered.
  { label: 'Sydney June solstice (USNO 07:00 / 16:54 AEST)', date: { year: 2024, month: 6, day: 21 }, ...SYD, riseUtc: '2024-06-20T21:00Z', setUtc: '2024-06-21T06:54Z' },
  { label: 'Sydney December solstice (USNO 04:41 / 19:06 AEST = 05:41 / 20:06 AEDT)', date: { year: 2024, month: 12, day: 21 }, ...SYD, riseUtc: '2024-12-20T18:41Z', setUtc: '2024-12-21T09:06Z' },
  { label: 'Sydney DST end day (USNO 06:12 / 17:42 AEST)', date: { year: 2024, month: 4, day: 7 }, ...SYD, riseUtc: '2024-04-06T20:12Z', setUtc: '2024-04-07T07:42Z' },
];

const calc = new PanchangCalculator();
const civilUtc = (d: { year: number; month: number; day: number }) => new Date(Date.UTC(d.year, d.month - 1, d.day));

describe('Sunrise/sunset searched from LOCAL midnight match USNO published times (+/- 2 min)', () => {
  it.each(REFS)('$label', (r) => {
    const s = calc.calculateSunriseSunset(civilUtc(r.date), r.latitude, r.longitude, r.timezone);
    expect(s.isFallback).toBeUndefined();
    expect(Math.abs(Date.parse(s.sunriseIso) - Date.parse(r.riseUtc))).toBeLessThanOrEqual(TOL_MS);
    expect(Math.abs(Date.parse(s.sunsetIso) - Date.parse(r.setUtc))).toBeLessThanOrEqual(TOL_MS);
  });

  it.each(REFS)('shared primitive used by Muhurta agrees: $label', (r) => {
    const b = new DayDivisionsCalculator().calculateSolarDay({ date: r.date, timezone: r.timezone, latitude: r.latitude, longitude: r.longitude });
    expect(Math.abs(Date.parse(b.sunriseIso) - Date.parse(r.riseUtc))).toBeLessThanOrEqual(TOL_MS);
    expect(Math.abs(Date.parse(b.sunsetIso) - Date.parse(r.setUtc))).toBeLessThanOrEqual(TOL_MS);
  });

  it('without a timezone, local mean midnight (longitude / 15 h) still finds the same day for Delhi and Sydney', () => {
    for (const r of [REFS[1], REFS[7]]) {
      const s = calc.calculateSunriseSunset(civilUtc(r.date), r.latitude, r.longitude);
      expect(Math.abs(Date.parse(s.sunriseIso) - Date.parse(r.riseUtc))).toBeLessThanOrEqual(TOL_MS);
    }
  });
});

describe('Regression: the old UTC-midnight anchor returned the NEXT day sunrise east of Greenwich', () => {
  // Re-implements the pre-fix search exactly (SearchRiseSet from 00:00 UTC of the date, limit 1.2 d).
  const legacySunrise = (d: Date, lat: number, lon: number): Date => {
    const dayStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    return Astronomy.SearchRiseSet(Astronomy.Body.Sun, new Astronomy.Observer(lat, lon, 0), +1, dayStart, 1.2)!.date;
  };
  const istDate = (ms: number) => new Date(ms + 330 * 60000).toISOString().slice(0, 10);

  it('New Delhi 2024-06-21: legacy gave 2024-06-22 sunrise; fixed gives 2024-06-21', () => {
    const date = new Date(Date.UTC(2024, 5, 21));
    const legacy = legacySunrise(date, DELHI.latitude, DELHI.longitude);
    expect(istDate(legacy.getTime())).toBe('2024-06-22'); // the bug
    expect(Math.abs(legacy.getTime() - Date.parse('2024-06-21T23:54Z'))).toBeLessThanOrEqual(TOL_MS);

    const fixed = calc.calculateSunriseSunset(date, DELHI.latitude, DELHI.longitude, DELHI.timezone);
    expect(istDate(Date.parse(fixed.sunriseIso))).toBe('2024-06-21');
  });

  it('daily panchang for New Delhi 2024-06-21 is anchored to that day sunrise (vara Friday, Rahu Kaal 4th octant)', () => {
    // The API encodes the requested local wall-clock date as UTC fields.
    const daily = calc.calculateDailyPanchang(new Date(Date.UTC(2024, 5, 21, 12)), DELHI.latitude, DELHI.longitude, DELHI.timezone);
    expect(daily.date).toBe('2024-06-21');
    expect(Math.abs(Date.parse(daily.sun.sunriseIso) - Date.parse('2024-06-20T23:54Z'))).toBeLessThanOrEqual(TOL_MS);
    expect(daily.instantaneous.vara.dayIndex).toBe(5);
    expect(daily.instantaneous.vara.name).toBe('Shukravara');
    expect(daily.instantaneous.sunriseSunset).toEqual(daily.sun);
    expect(daily.instantaneous.rahuKala).toEqual(daily.rahuKala);
    expect(daily.rahuKala.segmentIndex).toBe(4); // Friday
    // Rahu Kaal = 4th eighth of (sunrise..sunset): starts 3/8 of the day after sunrise.
    const rise = Date.parse(daily.sun.sunriseIso);
    const set = Date.parse(daily.sun.sunsetIso);
    expect(Math.abs(Date.parse(daily.rahuKala.startIso) - (rise + (3 * (set - rise)) / 8))).toBeLessThanOrEqual(1);
    // Sunrise event now falls inside the local civil day and is listed.
    expect(daily.transitions.some((t) => t.type === 'SUNRISE' && t.timestampIso === daily.sun.sunriseIso)).toBe(true);
  });
});

describe('Local midnight and polar handling', () => {
  it('local midnight honours negative offsets and DST', () => {
    expect(new Date(localMidnightUtcMs({ year: 2024, month: 6, day: 21 }, 'America/New_York', -74)).toISOString()).toBe('2024-06-21T04:00:00.000Z');
    expect(new Date(localMidnightUtcMs({ year: 2024, month: 12, day: 21 }, 'America/New_York', -74)).toISOString()).toBe('2024-12-21T05:00:00.000Z');
    expect(new Date(localMidnightUtcMs({ year: 2024, month: 6, day: 21 }, 'Asia/Kolkata', 77)).toISOString()).toBe('2024-06-20T18:30:00.000Z');
  });

  it('a date whose midnight does not exist (America/Santiago DST start 2024-09-08) starts at 01:00 local', () => {
    expect(new Date(localMidnightUtcMs({ year: 2024, month: 9, day: 8 }, 'America/Santiago', -70.67)).toISOString()).toBe('2024-09-08T04:00:00.000Z');
  });

  it.each([
    ['midnight sun', 6],
    ['polar night', 12],
  ])('Tromso 2024 %s: no sunrise (USNO: continuously above/below horizon) => null / flagged fallback', (_label, month) => {
    const ev = findLocalSolarEvents({ year: 2024, month, day: 21 }, 69.6492, 18.9553, 'Europe/Oslo');
    expect(ev.sunrise).toBeNull();
    const s = calc.calculateSunriseSunset(new Date(Date.UTC(2024, month - 1, 21)), 69.6492, 18.9553, 'Europe/Oslo');
    expect(s.isFallback).toBe(true);
    expect(() =>
      new DayDivisionsCalculator().calculateSolarDay({ date: { year: 2024, month, day: 21 }, timezone: 'Europe/Oslo', latitude: 69.6492, longitude: 18.9553 })
    ).toThrow(/No sunrise/);
  });
});
