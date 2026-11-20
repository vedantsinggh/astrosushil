import { describe, it, expect } from 'vitest';
import {
  EphemerisTableGenerator,
  listEphemerisTableDates,
  calculatePlanetaryMagnitude,
  getConfiguredAyanamsa,
  DEFAULT_ASTROLOGY_CONFIG,
} from '../../src/index';
import { referenceTrueLahiriDeg, REFERENCE_AYANAMSA_TOLERANCE_DEG } from '../fixtures/ayanamsa-reference';

/**
 * Reference values: JPL Horizons (https://ssd.jpl.nasa.gov/api/horizons.api, DE441), observer
 * table, CENTER='500@399' (geocentric), QUANTITIES='31' (apparent ecliptic longitude of date),
 * fetched 2026-11-20 at 1-hour steps. Sidereal value = Horizons tropical longitude minus the
 * true Lahiri ayanamsa of the Indian Astronomical Ephemeris (IAE 2027 formula, independent
 * implementation in tests/fixtures/ayanamsa-reference.ts; ADR-017): 24.221900° on 2026-01-02 0h UT
 * and 24.229538° on 2026-07-01 0h UT. (Before engine 0.2.0 these values used the linear
 * approximation 23.85° + 0.01396°/yr, i.e. 0.0089° / 0.0097° less; the sidereal values below
 * were shifted by exactly that difference.)
 * Speed = central difference of the Horizons longitudes at ±1 h, in °/day.
 * Tolerances: longitude 0.02° (astronomy-engine is accurate to about ±1 arc-minute);
 * speed 0.01°/day.
 */
const HORIZONS_2026_01_02_0UT: Record<string, { tropical: number; sidereal: number; speed: number }> = {
  SUN: { tropical: 281.58744, sidereal: 257.36554, speed: 1.01886 },
  MERCURY: { tropical: 270.17999, sidereal: 245.95809, speed: 1.53133 },
  VENUS: { tropical: 280.46476, sidereal: 256.24286, speed: 1.25826 },
  MARS: { tropical: 283.45485, sidereal: 259.23295, speed: 0.76703 },
  JUPITER: { tropical: 111.2266, sidereal: 87.0047, speed: -0.13142 },
  SATURN: { tropical: 356.22633, sidereal: 332.00443, speed: 0.05987 },
};
const HORIZONS_2026_07_01_0UT: Record<string, { sidereal: number; speed: number }> = {
  SUN: { sidereal: 74.9733, speed: 0.95326 },
  MERCURY: { sidereal: 91.96625, speed: -0.09697 },
  VENUS: { sidereal: 115.9635, speed: 1.13391 },
  MARS: { sidereal: 37.32898, speed: 0.71115 },
  JUPITER: { sidereal: 95.93209, speed: 0.21419 },
  SATURN: { sidereal: 349.95718, speed: 0.04302 },
};

const angDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe('EphemerisTableGenerator (sidereal daily table) vs JPL Horizons', () => {
  const gen = new EphemerisTableGenerator();

  it('daily rows at 00:00 UT match Horizons longitudes, speeds and retrograde flags', async () => {
    const t = await gen.generate({
      startDate: { year: 2026, month: 1, day: 1 },
      endDate: { year: 2026, month: 1, day: 3 },
      step: 'DAY',
      timezone: 'UTC',
      timeMode: { kind: 'FIXED_TIME', time: { hour: 0, minute: 0, second: 0 } },
    });
    expect(t.totalRows).toBe(3);
    expect(t.rows.map((r) => r.date)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    const row = t.rows[1];
    expect(row.utcIso).toBe('2026-01-02T00:00:00.000Z');
    for (const [body, ref] of Object.entries(HORIZONS_2026_01_02_0UT)) {
      const e = row.bodies.find((b) => b.body === body)!;
      expect(angDiff(e.longitude, ref.sidereal)).toBeLessThan(0.02);
      expect(Math.abs(e.speed - ref.speed)).toBeLessThan(0.01);
      expect(e.isRetrograde).toBe(ref.speed < 0);
      // sign / nakshatra / pada follow from the reference longitude (none is within 0.02° of a boundary)
      expect(e.rashiIndex).toBe(Math.floor(ref.sidereal / 30) + 1);
      expect(e.nakshatraIndex).toBe(Math.floor(ref.sidereal / (360 / 27)) + 1);
      expect(e.pada).toBe(Math.floor((ref.sidereal % (360 / 27)) / (360 / 108)) + 1);
    }
    // Ayanamsa reported = true Lahiri (IAE 2027 formula), 24.221900° at 2026-01-02 0h UT.
    expect(Math.abs(row.ayanamsa - referenceTrueLahiriDeg(2461042.5))).toBeLessThan(REFERENCE_AYANAMSA_TOLERANCE_DEG);
    expect(row.ascendant).toBeUndefined();
    expect(t.zodiac).toBe('SIDEREAL');
  });

  it('a 06:00 IST time of day maps to 00:30 UT; Horizons values hold mid-year (Mercury retrograde)', async () => {
    const t = await gen.generate({
      startDate: { year: 2026, month: 7, day: 1 },
      endDate: { year: 2026, month: 7, day: 1 },
      step: 'DAY',
      timezone: 'Asia/Kolkata',
      timeMode: { kind: 'FIXED_TIME', time: { hour: 5, minute: 30, second: 0 } },
    });
    const row = t.rows[0];
    expect(row.utcIso).toBe('2026-07-01T00:00:00.000Z');
    expect(row.localTime).toBe('05:30:00');
    expect(row.utcOffsetMinutes).toBe(330);
    for (const [body, ref] of Object.entries(HORIZONS_2026_07_01_0UT)) {
      const e = row.bodies.find((b) => b.body === body)!;
      expect(angDiff(e.longitude, ref.sidereal)).toBeLessThan(0.02);
      expect(Math.abs(e.speed - ref.speed)).toBeLessThan(0.01);
    }
    expect(row.bodies.find((b) => b.body === 'MERCURY')!.isRetrograde).toBe(true);
  });

  it('tropical config with outer planets matches Horizons tropical longitudes', async () => {
    const trop = new EphemerisTableGenerator(undefined, { ...DEFAULT_ASTROLOGY_CONFIG, zodiacType: 'TROPICAL' });
    const row = await trop.positionsAt(new Date('2026-01-02T00:00:00Z'), { includeOuterPlanets: true });
    expect(row.ayanamsa).toBe(0);
    for (const [body, ref] of Object.entries(HORIZONS_2026_01_02_0UT)) {
      expect(angDiff(row.bodies.find((b) => b.body === body)!.longitude, ref.tropical)).toBeLessThan(0.02);
    }
    // Horizons TLIST='2461042.5' (2026-01-02 00:00 UT), QUANTITIES='31', CENTER='500@399', fetched 2026-11-20:
    // Uranus (799) 57.92215°, Neptune (899) 359.51956°, Pluto (999) 302.74885°. Tolerance 0.02°.
    const outer: Record<string, number> = { URANUS: 57.9221501, NEPTUNE: 359.5195637, PLUTO: 302.7488518 };
    for (const [body, lon] of Object.entries(outer)) {
      expect(angDiff(row.bodies.find((b) => b.body === body)!.longitude, lon)).toBeLessThan(0.02);
    }
    expect(row.bodies.map((b) => b.body)).toEqual(['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU', 'URANUS', 'NEPTUNE', 'PLUTO']);
  });

  it('sunrise-based local ephemeris: row instant equals New Delhi sunrise per USNO (±1 min) and has an ascendant', async () => {
    // USNO Astronomical Applications API, https://aa.usno.navy.mil/api/rstt/oneday?date=2026-01-01&coords=28.6139,77.209&tz=5.5
    // fetched 2026-11-20: Rise 07:14 IST (= 01:44 UT), to the minute.
    const t = await gen.generate({
      startDate: { year: 2026, month: 1, day: 1 },
      endDate: { year: 2026, month: 1, day: 1 },
      step: 'DAY',
      timezone: 'Asia/Kolkata',
      timeMode: { kind: 'SUNRISE' },
      location: { latitude: 28.6139, longitude: 77.209 },
    });
    const row = t.rows[0];
    expect(Math.abs(Date.parse(row.utcIso) - Date.parse('2026-01-01T01:44:00Z'))).toBeLessThanOrEqual(90_000);
    expect(row.ascendant).toBeDefined();
    // At sunrise the Sun is on the eastern horizon, so the Lagna is the Sun's sign (Dhanu, Sun ≈ 256°).
    expect(row.ascendant!.rashiIndex).toBe(9);
  });

  it('paging returns the requested slice and the full row count', async () => {
    const req = {
      startDate: { year: 2026, month: 1, day: 1 },
      endDate: { year: 2026, month: 12, day: 31 },
      step: 'DAY' as const,
      timezone: 'UTC',
      timeMode: { kind: 'FIXED_TIME' as const, time: { hour: 0, minute: 0, second: 0 } },
      offset: 181,
      limit: 2,
    };
    const t = await gen.generate(req);
    expect(t.totalRows).toBe(365);
    expect(t.rows.map((r) => r.date)).toEqual(['2026-07-01', '2026-07-02']);
  });

  it('date lists for week and month steps (calendar arithmetic)', () => {
    expect(listEphemerisTableDates({ startDate: { year: 2026, month: 1, day: 31 }, endDate: { year: 2026, month: 5, day: 1 }, step: 'MONTH' }))
      .toEqual([{ year: 2026, month: 1, day: 31 }, { year: 2026, month: 2, day: 28 }, { year: 2026, month: 3, day: 31 }, { year: 2026, month: 4, day: 30 }]);
    expect(listEphemerisTableDates({ startDate: { year: 2026, month: 2, day: 20 }, endDate: { year: 2026, month: 3, day: 10 }, step: 'WEEK' }).length).toBe(3);
    expect(() => listEphemerisTableDates({ startDate: { year: 2026, month: 2, day: 2 }, endDate: { year: 2026, month: 2, day: 1 }, step: 'DAY' })).toThrow();
  });

  it('configured ayanamsa equals the true Lahiri ayanamsa (IAE 2027 formula, ADR-017)', async () => {
    const j = 2461042.5; // 2026-01-02 00:00 UT
    expect(Math.abs((await getConfiguredAyanamsa(j)) - referenceTrueLahiriDeg(j))).toBeLessThan(REFERENCE_AYANAMSA_TOLERANCE_DEG);
    expect(await getConfiguredAyanamsa(j, { ...DEFAULT_ASTROLOGY_CONFIG, zodiacType: 'TROPICAL' })).toBe(0);
  });
});

describe('Planetary magnitude vs JPL Horizons', () => {
  /**
   * Horizons QUANTITIES='9' (APmag), TLIST='2461041.5' (2026-01-01 00:00 UT), geocentric, fetched 2026-11-20.
   * Tolerance 0.15 mag: astronomy-engine and Horizons use different photometric models
   * (astronomy-engine: Astronomical Almanac 1984-era fits; Horizons: Mallama & Hilton 2018), and
   * geocentric vs topocentric differences are negligible for planets.
   */
  const REF: Record<string, number> = { SUN: -26.779, MOON: -11.997, MERCURY: -0.595, VENUS: -3.911, MARS: 1.071, JUPITER: -2.67, SATURN: 1.007, URANUS: 5.646, NEPTUNE: 7.767, PLUTO: 14.572 };
  for (const [body, mag] of Object.entries(REF)) {
    it(`${body} ≈ ${mag}`, () => {
      const m = calculatePlanetaryMagnitude(body as never, new Date('2026-01-01T00:00:00Z'))!;
      expect(Math.abs(m - mag)).toBeLessThan(0.15);
    });
  }
  it('is undefined for the nodes', () => {
    expect(calculatePlanetaryMagnitude('RAHU', new Date())).toBeUndefined();
  });
});
