import { describe, it, expect } from 'vitest';
import { dispatchLine } from '../src/dispatcher';

/**
 * The daily panchang must describe the requested LOCAL civil day in every zone, including
 * UTC+12/+13 (Pacific/Auckland) where local noon falls on the previous UTC date.
 * Independent facts used: 2026-01-01 is a Thursday; New Delhi and Auckland sunrise on that local
 * day lies between local 05:00 and 08:00 (USNO: Delhi 07:14 IST; Auckland ~06:00 NZDT, UTC+13).
 */
async function call(method: string, params: unknown): Promise<any> {
  return dispatchLine(JSON.stringify({ id: 1, method, params }));
}

const PLACES = [
  { name: 'Auckland', latitude: -36.8485, longitude: 174.7633, timezone: 'Pacific/Auckland', offsetMin: 13 * 60 },
  { name: 'New Delhi', latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', offsetMin: 330 },
];

describe('daily panchang uses the local civil date', () => {
  for (const pl of PLACES) {
    it(`panchang.compute for 2026-01-01 in ${pl.name}`, async () => {
      const r = await call('panchang.compute', { moment: { date: '2026-01-01', time: '12:00', timezone: pl.timezone, latitude: pl.latitude, longitude: pl.longitude } });
      expect(r.ok).toBe(true);
      expect(r.result.daily.date).toBe('2026-01-01');
      const riseLocalHours = ((Date.parse(r.result.daily.sun.sunriseIso) - Date.parse('2026-01-01T00:00:00Z')) / 3600000 + pl.offsetMin / 60);
      expect(riseLocalHours).toBeGreaterThan(5);
      expect(riseLocalHours).toBeLessThan(8);
      expect(r.result.utcOffsetMinutes).toBe(pl.offsetMin);
    });

    it(`panchang.month January 2026 in ${pl.name}: rows are the local days, 1 Jan is Thursday`, async () => {
      const r = await call('panchang.month', { year: 2026, month: 1, location: { latitude: pl.latitude, longitude: pl.longitude, timezone: pl.timezone } });
      expect(r.ok).toBe(true);
      expect(r.result.rows[0].date).toBe('2026-01-01');
      expect(r.result.rows[0].weekdayIndex).toBe(4);
      for (const row of r.result.rows) {
        const dayStartUtc = Date.parse(`${row.date}T00:00:00Z`) - pl.offsetMin * 60000;
        const rise = Date.parse(row.sunriseIso);
        expect(rise).toBeGreaterThan(dayStartUtc);
        expect(rise).toBeLessThan(dayStartUtc + 86400000);
      }
    });
  }
});
