import { DayDivisionsCalculator, PanchangCalculator } from '@astro/astrology-engine';
import { Handler, intParam, offsetMinutes } from '../common';
import { parseLocation } from '../birth';

/**
 * Feature handlers: print (printable monthly panchang). Method names are listed in
 * docs/sidecar-protocol.md. Every value comes from the engine; this module only loops the days of
 * the requested month and shapes the rows.
 */

const panchangCalc = new PanchangCalculator();
const dayDivCalc = new DayDivisionsCalculator();

/** English weekday names indexed by the engine's weekday index (0 = Sunday). Labels only. */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad2 = (n: number) => String(n).padStart(2, '0');

export const handlers: Record<string, Handler> = {
  /**
   * Daily panchang rows for one civil month at a place. Each row is the engine's daily panchang
   * (values at local sunrise, with the end time of each element) plus the engine's day divisions
   * (sunrise, sunset, Rahu Kaala). Times are UTC ISO; `utcOffsetMinutes` is the zone offset at
   * that day's sunrise.
   */
  'panchang.month': (p) => {
    const year = intParam(p.year, 'year', 1, 9999);
    const month = intParam(p.month, 'month', 1, 12);
    const loc = parseLocation(p.location);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const rows = Array.from({ length: daysInMonth }, (_, k) => {
      const day = k + 1;
      // Civil date as the UTC calendar fields of a Date, plus the IANA zone (as in `panchang.compute`).
      const civilDate = new Date(Date.UTC(year, month - 1, day));
      const daily = panchangCalc.calculateDailyPanchang(civilDate, loc.latitude, loc.longitude, loc.timezone);
      const dd = dayDivCalc.calculate({ date: { year, month, day }, timezone: loc.timezone, latitude: loc.latitude, longitude: loc.longitude });
      const i = daily.instantaneous;
      const weekdayIndex = dd.bounds.weekdayIndex;
      return {
        date: `${year}-${pad2(month)}-${pad2(day)}`,
        day,
        weekdayIndex,
        weekday: WEEKDAYS[weekdayIndex] ?? '',
        vara: i.vara.name,
        utcOffsetMinutes: offsetMinutes(Date.parse(dd.bounds.sunriseIso), loc.timezone),
        sunriseIso: dd.bounds.sunriseIso,
        sunsetIso: dd.bounds.sunsetIso,
        tithi: { index: i.tithi.index, name: i.tithi.name, paksha: i.tithi.paksha, endIso: i.tithi.endIso ?? null },
        nakshatra: { index: i.nakshatra.index, name: i.nakshatra.name, pada: i.nakshatra.pada, endIso: i.nakshatra.endIso ?? null },
        yoga: { index: i.yoga.index, name: i.yoga.name, endIso: i.yoga.endIso ?? null },
        karana: { index: i.karana.index, name: i.karana.name, endIso: i.karana.endIso ?? null },
        masa: { amanta: daily.hinduCalendar.amantaMasa, purnimanta: daily.hinduCalendar.purnimantaMasa, isAdhika: daily.hinduCalendar.isAdhika },
        paksha: daily.hinduCalendar.paksha,
        rahuKaala: { startIso: dd.rahuKaala.startIso, endIso: dd.rahuKaala.endIso },
      };
    });
    return {
      year,
      month,
      location: loc,
      daysInMonth,
      reference: 'Tithi, nakshatra, yoga and karana are the values current at local sunrise (udaya); endIso is when each one ends.',
      rows,
    };
  },
};
