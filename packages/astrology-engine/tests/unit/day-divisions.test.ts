import { describe, it, expect } from 'vitest';
import {
  DayDivisionsCalculator,
  CHALDEAN_HORA_ORDER,
  CHOGHADIYA_DAY_TABLE,
  CHOGHADIYA_NIGHT_TABLE,
  CHOGHADIYA_LORDS,
  YAMAGANDA_DAY_SEGMENTS,
  GULIKA_KAALA_DAY_SEGMENTS,
} from '../../src/muhurta/day-divisions.calculator';
import { PanchangCalculator, VARA_LORDS } from '../../src/panchang/panchang-calculator';
import { PlanetSymbol } from '../../src/planets/planet.types';

const calc = new DayDivisionsCalculator();
// New Delhi, 2024-06-21 (Friday)
const DELHI = { timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209 };

const istHm = (iso: string): number => {
  const d = new Date(Date.parse(iso) + 330 * 60000);
  return d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
};

describe('DayDivisionsCalculator — solar day bounds', () => {
  const report = calc.calculate({ date: { year: 2024, month: 6, day: 21 }, ...DELHI });

  it('uses the local civil weekday (2024-06-21 is a Friday, lord Venus)', () => {
    expect(report.bounds.weekdayIndex).toBe(5);
    expect(report.bounds.weekdayLord).toBe(PlanetSymbol.VENUS);
  });

  it('matches published New Delhi solstice sunrise/sunset within 3 minutes', () => {
    // Source: published almanac times for New Delhi on 2024-06-21
    // (timeanddate.com sun table / IMD): sunrise 05:24 IST, sunset 19:22 IST.
    expect(Math.abs(istHm(report.bounds.sunriseIso) - (5 * 60 + 24))).toBeLessThanOrEqual(3);
    expect(Math.abs(istHm(report.bounds.sunsetIso) - (19 * 60 + 22))).toBeLessThanOrEqual(3);
  });

  it('day + night length spans sunrise to next sunrise (~24h)', () => {
    const total = report.bounds.dayLengthMinutes + report.bounds.nightLengthMinutes;
    expect(total).toBeGreaterThan(1435);
    expect(total).toBeLessThan(1445);
  });

  it('agrees with the existing PanchangCalculator sunrise primitive', () => {
    // Both now share findLocalSolarEvents and search from LOCAL midnight of the civil date
    // (Delhi's 2024-06-21 sunrise is at ~23:54 UTC on 2024-06-20).
    const p = new PanchangCalculator().calculateSunriseSunset(
      new Date(Date.UTC(2024, 5, 21)),
      DELHI.latitude,
      DELHI.longitude,
      DELHI.timezone
    );
    expect(Math.abs(Date.parse(p.sunriseIso) - Date.parse(report.bounds.sunriseIso))).toBeLessThan(1000);
    expect(Math.abs(Date.parse(p.sunsetIso) - Date.parse(report.bounds.sunsetIso))).toBeLessThan(1000);
  });
});

describe('Kala Hora', () => {
  const report = calc.calculate({ date: { year: 2024, month: 6, day: 21 }, ...DELHI });

  it('has 24 contiguous horas from sunrise to next sunrise', () => {
    expect(report.horas).toHaveLength(24);
    expect(report.horas[0].startIso).toBe(report.bounds.sunriseIso);
    expect(report.horas[12].startIso).toBe(report.bounds.sunsetIso);
    expect(report.horas[23].endIso).toBe(report.bounds.nextSunriseIso);
    for (let i = 1; i < 24; i++) expect(report.horas[i].startIso).toBe(report.horas[i - 1].endIso);
  });

  it('starts with the weekday lord and follows the Chaldean order (Friday: Ve, Me, Mo, Sa, Ju, Ma, Su)', () => {
    expect(report.horas.slice(0, 7).map((h) => h.lord)).toEqual([
      PlanetSymbol.VENUS, PlanetSymbol.MERCURY, PlanetSymbol.MOON, PlanetSymbol.SATURN,
      PlanetSymbol.JUPITER, PlanetSymbol.MARS, PlanetSymbol.SUN,
    ]);
  });

  it('the 25th hora (next sunrise) is the next weekday lord for every weekday (classical vara-hora rule)', () => {
    for (let w = 0; w < 7; w++) {
      const start = CHALDEAN_HORA_ORDER.indexOf(VARA_LORDS[w].lord);
      expect(CHALDEAN_HORA_ORDER[(start + 24) % 7]).toBe(VARA_LORDS[(w + 1) % 7].lord);
    }
  });
});

describe('Choghadiya', () => {
  it('published day table follows the weekday-lord rule (start = weekday lord, step +5 weekdays)', () => {
    for (let w = 0; w < 7; w++) {
      for (let k = 0; k < 8; k++) {
        const expectedLord = VARA_LORDS[(w + 5 * k) % 7].lord;
        expect(CHOGHADIYA_LORDS[CHOGHADIYA_DAY_TABLE[w][k]]).toBe(expectedLord);
      }
    }
  });

  it('published night table follows the rule (start = 5th weekday lord, step +4 weekdays)', () => {
    for (let w = 0; w < 7; w++) {
      for (let k = 0; k < 8; k++) {
        const expectedLord = VARA_LORDS[(w + 4 + 4 * k) % 7].lord;
        expect(CHOGHADIYA_LORDS[CHOGHADIYA_NIGHT_TABLE[w][k]]).toBe(expectedLord);
      }
    }
  });

  it('Friday 2024-06-21 Delhi: 16 contiguous periods, day starts Char, night starts Rog', () => {
    const r = calc.calculate({ date: { year: 2024, month: 6, day: 21 }, ...DELHI });
    expect(r.choghadiya).toHaveLength(16);
    expect(r.choghadiya[0].name).toBe('CHAR');
    expect(r.choghadiya[8].name).toBe('ROG');
    expect(r.choghadiya[8].startIso).toBe(r.bounds.sunsetIso);
    expect(r.choghadiya[15].endIso).toBe(r.bounds.nextSunriseIso);
  });
});

describe('Rahu / Yamaganda / Gulika Kaala and Abhijit', () => {
  it('weekday octant tables are permutations that never collide on the same day', () => {
    for (let w = 0; w < 7; w++) {
      expect(YAMAGANDA_DAY_SEGMENTS[w]).not.toBe(GULIKA_KAALA_DAY_SEGMENTS[w]);
    }
    expect(new Set(Object.values(YAMAGANDA_DAY_SEGMENTS)).size).toBe(7);
    expect(new Set(Object.values(GULIKA_KAALA_DAY_SEGMENTS)).size).toBe(7);
  });

  it('Rahu Kaala equals the existing PanchangCalculator.calculateRahuKala output', () => {
    const r = calc.calculate({ date: { year: 2024, month: 6, day: 21 }, ...DELHI });
    const p = new PanchangCalculator().calculateRahuKala(r.bounds.sunriseIso, r.bounds.sunsetIso, r.bounds.weekdayIndex);
    expect(r.rahuKaala.startIso).toBe(p.startIso);
    expect(r.rahuKaala.endIso).toBe(p.endIso);
    expect(r.rahuKaala.segmentIndex).toBe(4); // Friday = 4th octant
  });

  it('Abhijit is centred on the midpoint of sunrise and sunset and lasts 1/15 of the day', () => {
    const r = calc.calculate({ date: { year: 2024, month: 6, day: 21 }, ...DELHI });
    const mid = (Date.parse(r.bounds.sunriseIso) + Date.parse(r.bounds.sunsetIso)) / 2;
    const aMid = (Date.parse(r.abhijitMuhurta.startIso) + Date.parse(r.abhijitMuhurta.endIso)) / 2;
    expect(Math.abs(mid - aMid)).toBeLessThan(1000);
    const len = (Date.parse(r.abhijitMuhurta.endIso) - Date.parse(r.abhijitMuhurta.startIso)) / 60000;
    expect(Math.abs(len - r.bounds.dayLengthMinutes / 15)).toBeLessThan(0.05);
  });

  it('is deterministic', () => {
    const a = calc.calculate({ date: { year: 2024, month: 1, day: 7 }, ...DELHI });
    const b = calc.calculate({ date: { year: 2024, month: 1, day: 7 }, ...DELHI });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('throws a clear error where the Sun does not rise (polar night)', () => {
    expect(() =>
      calc.calculate({ date: { year: 2024, month: 12, day: 21 }, timezone: 'Arctic/Longyearbyen', latitude: 78.22, longitude: 15.65 }),
    ).toThrow(/sunrise/i);
  });
});
