import { describe, it, expect } from 'vitest';
import { referenceTrueLahiriAtMs } from '../fixtures/ayanamsa-reference';
import {
  MuhurtaExtrasCalculator,
  MuhurtaExtrasError,
  MuhurtaExtMoonSolver,
  DURMUHURTA_TABLE,
  VARJYAM_GHATIS_PUBLISHED,
  VARJYAM_GHATIS_PRASHNA_MARGA,
  AMRIT_KALAM_GHATIS,
  GANDMOOL_NAKSHATRA_INDICES,
  GANDANTA_JUNCTION_PADAS,
  PANCHAKA_START_DEGREE,
} from '../../src/muhurta-extended';
import { DayDivisionsCalculator } from '../../src/muhurta/day-divisions.calculator';

const calc = new MuhurtaExtrasCalculator();
const DELHI = { timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209 };
const MIN = 60000;
const NAK = 360 / 27;

/**
 * Ayanamsa CONVENTION INPUT for the independent JPL checks: the engine default since 0.2.0 is the
 * true Lahiri ayanamsa (ADR-017), here from the independent IAE 2027 formula in
 * tests/fixtures/ayanamsa-reference.ts (before 0.2.0: linear 23.85° + 0.01396°/yr, about 0.009°
 * less in 2026). Only this convention value is shared with the engine; the Moon comes from JPL.
 */
const conventionAyanamsa = (ms: number): number => referenceTrueLahiriAtMs(ms);

/**
 * JPL Horizons (https://ssd.jpl.nasa.gov/api/horizons.api), COMMAND='301' (Moon), CENTER='500@399'
 * (geocentre), QUANTITIES='31' (observer ecliptic-of-date apparent longitude), TIME_TYPE='UT', 5-minute steps.
 * Retrieved 2026-11-20. Columns: UTC, ecliptic longitude (deg).
 */
const JPL_FEB17: Array<[string, number]> = [
  ['2026-02-17T03:15Z', 324.0344936], ['2026-02-17T03:20Z', 324.0798906], ['2026-02-17T03:25Z', 324.1252908],
  ['2026-02-17T03:30Z', 324.1706942], ['2026-02-17T03:35Z', 324.2161007], ['2026-02-17T03:40Z', 324.2615104],
  ['2026-02-17T03:45Z', 324.3069232], ['2026-02-17T03:50Z', 324.3523392], ['2026-02-17T03:55Z', 324.3977583],
];
const JPL_MAR02: Array<[string, number]> = [
  ['2026-03-02T02:00Z', 144.019238], ['2026-03-02T02:05Z', 144.0666035], ['2026-03-02T02:10Z', 144.1139663],
  ['2026-03-02T02:15Z', 144.1613264], ['2026-03-02T02:20Z', 144.2086838], ['2026-03-02T02:25Z', 144.2560384],
  ['2026-03-02T02:30Z', 144.3033903], ['2026-03-02T02:35Z', 144.3507395], ['2026-03-02T02:40Z', 144.3980859],
];
const JPL_JAN24: Array<[string, number]> = [
  ['2026-01-24T08:25Z', 10.6899828], ['2026-01-24T08:30Z', 10.7372076], ['2026-01-24T08:35Z', 10.7844352],
  ['2026-01-24T08:40Z', 10.8316655], ['2026-01-24T08:45Z', 10.8788986], ['2026-01-24T08:50Z', 10.9261345],
  ['2026-01-24T08:55Z', 10.9733731], ['2026-01-24T09:00Z', 11.0206144], ['2026-01-24T09:05Z', 11.0678586],
];

/** Instant at which JPL tropical longitude − convention ayanamsa reaches `targetSidereal` (linear interpolation). */
function jplCrossingMs(table: Array<[string, number]>, targetSidereal: number): number {
  const sid = table.map(([t, lon]) => {
    const ms = Date.parse(t);
    let s = lon - conventionAyanamsa(ms);
    s = ((s % 360) + 360) % 360;
    if (targetSidereal > 300 && s < 60) s += 360; // unwrap near 0°/360°
    return [ms, s] as const;
  });
  for (let i = 1; i < sid.length; i++) {
    const [t0, s0] = sid[i - 1];
    const [t1, s1] = sid[i];
    if (s0 <= targetSidereal && s1 >= targetSidereal) return t0 + ((targetSidereal - s0) / (s1 - s0)) * (t1 - t0);
  }
  throw new Error('JPL table does not bracket the target');
}

/** Tolerance for engine-vs-JPL Moon crossing instants: 60 s (≈ 0.009° of Moon motion). Observed differences ≲ 10 s. */
const JPL_TOLERANCE_MS = 60 * 1000;

describe('Durmuhurta — table (Muhurta Chintamani verse, 15-fold day/night muhurta order)', () => {
  it('matches the verse derivation for every weekday', () => {
    // Hand-derived from the verse (deity → position in the 15 day / 15 night muhurtas):
    // Sun Aryama=D14; Mon Brahma=D9, Rakshasa=D12; Tue Pitri=D4, Vahni=N7; Wed Abhijit=D8;
    // Thu Toya=D6, Rakshasa=D12; Fri Pitri=D4, Brahma=D9; Sat Isha=D1, Sarpa=D2.
    const expected: Record<number, string[]> = {
      0: ['D14'], 1: ['D9', 'D12'], 2: ['D4', 'N7'], 3: ['D8'], 4: ['D6', 'D12'], 5: ['D4', 'D9'], 6: ['D1', 'D2'],
    };
    for (let w = 0; w < 7; w++) {
      const got = DURMUHURTA_TABLE[w].map((r) => `${r.part[0]}${r.muhurtaNumber}`).sort();
      expect(got).toEqual([...expected[w]].sort());
    }
  });

  it('hand-worked example: 12 h day / 12 h night (muhurta = 48 min)', () => {
    // Sunrise 06:00, sunset 18:00, next sunrise 06:00 (UTC, synthetic).
    const rise = Date.parse('2026-01-04T06:00:00Z');
    const set = Date.parse('2026-01-04T18:00:00Z');
    const next = Date.parse('2026-01-05T06:00:00Z');
    // Sunday D14: 06:00 + 13×48 min = 16:24 → 17:12.
    expect(MuhurtaExtrasCalculator.durmuhurtaWindows(rise, set, next, 0)).toEqual([
      { part: 'DAY', muhurtaNumber: 14, muhurtaName: 'Aryama', startIso: '2026-01-04T16:24:00.000Z', endIso: '2026-01-04T17:12:00.000Z' },
    ]);
    // Tuesday N7: 18:00 + 6×48 min = 22:48 → 23:36; D4: 06:00 + 3×48 = 08:24 → 09:12.
    const tue = MuhurtaExtrasCalculator.durmuhurtaWindows(rise, set, next, 2);
    expect(tue.map((w) => [w.startIso, w.endIso])).toEqual([
      ['2026-01-04T08:24:00.000Z', '2026-01-04T09:12:00.000Z'],
      ['2026-01-04T22:48:00.000Z', '2026-01-04T23:36:00.000Z'],
    ]);
    // Saturday D1, D2: 06:00–06:48, 06:48–07:36.
    const sat = MuhurtaExtrasCalculator.durmuhurtaWindows(rise, set, next, 6);
    expect(sat.map((w) => [w.startIso, w.endIso])).toEqual([
      ['2026-01-04T06:00:00.000Z', '2026-01-04T06:48:00.000Z'],
      ['2026-01-04T06:48:00.000Z', '2026-01-04T07:36:00.000Z'],
    ]);
  });
});

describe('Varjyam / Amrit Kalam — tables', () => {
  it('published-panchang Varjyam table (drikpanchang "Nakshatra Thyajyam": tyajya ghatis start+1 … start+4)', () => {
    // Transcribed from the published table's "Tyajya Ghatis" column (51–54 → 50 elapsed, etc.):
    // Ashwini 51-54, Bharani 25-28, Krittika 31-34, Rohini 41-44, Mrigashira 15-18, Ardra 22-25, Punarvasu 31-34,
    // Pushya 21-24, Ashlesha 33-36, Magha 31-34, P.Phalguni 21-24, U.Phalguni 19-22, Hasta 22-25, Chitra 21-24,
    // Swati 15-18, Vishakha 15-18, Anuradha 11-14, Jyeshtha 15-18, Mula 57-60, P.Ashadha 25-28, U.Ashadha 21-24,
    // Shravana 11-14, Dhanishta 11-14, Shatabhisha 19-22, P.Bhadrapada 17-20, U.Bhadrapada 25-28, Revati 31-34.
    const firstGhati = [51, 25, 31, 41, 15, 22, 31, 21, 33, 31, 21, 19, 22, 21, 15, 15, 11, 15, 57, 25, 21, 11, 11, 19, 17, 25, 31];
    expect(VARJYAM_GHATIS_PUBLISHED).toEqual(firstGhati.map((g) => g - 1));
  });

  it('Prashna Marga Visha / Amrita ghati columns (B.V. Raman tr., pp. 45–47, via wisdomlib Table 5.6)', () => {
    // Visha "from" values: 50,24,30,40,14,11,30,20,32,30,20,18,22,20,14,14,10,14,20,24,20,10,10,18,16,24,30.
    expect(VARJYAM_GHATIS_PRASHNA_MARGA).toEqual([50, 24, 30, 40, 14, 11, 30, 20, 32, 30, 20, 18, 22, 20, 14, 14, 10, 14, 20, 24, 20, 10, 10, 18, 16, 24, 30]);
    // Amrita "from" values (Prashnamarga column): 42-46, 48-52, 54-58, 52-56, 38-42, 35-39, 54-58, 44-48, 56-60, 54-58,
    // 44-48, 42-46, 45-49, 44-48, 38-42, 38-42, 28-32, 38-42, 44-48, 48-52, 44-48, 34-38, 34-38, 42-46, 40-44, 48-52, 54-58.
    expect(AMRIT_KALAM_GHATIS).toEqual([42, 48, 54, 52, 38, 35, 54, 44, 56, 54, 44, 42, 45, 44, 38, 38, 28, 38, 44, 48, 44, 34, 34, 42, 40, 48, 54]);
  });

  it('hand-worked: 60-ghati nakshatra of exactly 24 h reproduces the published start-time column', () => {
    // The published table lists start times for a 24-h nakshatra beginning 00:00: Ashwini 20:00 (50 gh × 24 min),
    // Bharani 09:36 (24 gh), Anuradha 04:00 (10 gh); each window lasts 4 gh = 96 min.
    const s = Date.parse('2026-01-01T00:00:00Z');
    const e = s + 86400000;
    const w1 = MuhurtaExtrasCalculator.nakshatraGhatiWindow('VARJYAM', 1, s, e, VARJYAM_GHATIS_PUBLISHED[0]);
    expect([w1.startIso, w1.endIso]).toEqual(['2026-01-01T20:00:00.000Z', '2026-01-01T21:36:00.000Z']);
    const w2 = MuhurtaExtrasCalculator.nakshatraGhatiWindow('VARJYAM', 2, s, e, VARJYAM_GHATIS_PUBLISHED[1]);
    expect(w2.startIso).toBe('2026-01-01T09:36:00.000Z');
    const w17 = MuhurtaExtrasCalculator.nakshatraGhatiWindow('VARJYAM', 17, s, e, VARJYAM_GHATIS_PUBLISHED[16]);
    expect(w17.startIso).toBe('2026-01-01T04:00:00.000Z');
  });

  it('scales proportionally to a non-24 h nakshatra (Magha 54 gh Amrita, 30 h nakshatra)', () => {
    // 30 h nakshatra → 1 ghati = 30 min; 54 gh → +27 h; 4 gh → 2 h.
    const s = Date.parse('2026-01-01T00:00:00Z');
    const w = MuhurtaExtrasCalculator.nakshatraGhatiWindow('AMRIT_KALAM', 10, s, s + 30 * 3600000, AMRIT_KALAM_GHATIS[9]);
    expect([w.startIso, w.endIso]).toEqual(['2026-01-02T03:00:00.000Z', '2026-01-02T05:00:00.000Z']);
  });
});

describe('Day report — New Delhi 2026-03-03 (Tuesday)', async () => {
  const input = { date: { year: 2026, month: 3, day: 3 }, ...DELHI };
  const report = await calc.calculateDay(input);
  const bounds = new DayDivisionsCalculator().calculateSolarDay(input);

  it('is provisional, cites sources, and uses the Tuesday rule (2026-03-03 is a Tuesday)', () => {
    expect(report.provisional).toBe(true);
    expect(report.source).toContain('Muhurta Chintamani');
    expect(report.weekdayIndex).toBe(2);
    expect(report.civilDayStartIso).toBe('2026-03-02T18:30:00.000Z'); // IST midnight = 18:30 UTC previous day
  });

  it('Durmuhurta = 4th day muhurta and 7th night muhurta, relative to the engine sunrise/sunset', () => {
    const rise = Date.parse(bounds.sunriseIso);
    const set = Date.parse(bounds.sunsetIso);
    const next = Date.parse(bounds.nextSunriseIso);
    const d = (set - rise) / 15;
    const n = (next - set) / 15;
    const [a, b] = report.durmuhurta;
    expect(Math.abs(Date.parse(a.startIso) - (rise + 3 * d))).toBeLessThanOrEqual(1);
    expect(Math.abs(Date.parse(a.endIso) - (rise + 4 * d))).toBeLessThanOrEqual(1);
    expect(b.part).toBe('NIGHT');
    expect(Math.abs(Date.parse(b.startIso) - (set + 6 * n))).toBeLessThanOrEqual(1);
    // Independent sanity: a muhurta near the equinox at Delhi lasts 44–52 min.
    expect(report.dayMuhurtaMinutes).toBeGreaterThan(44);
    expect(report.dayMuhurtaMinutes).toBeLessThan(52);
  });

  it('Magha start (Moon at sidereal 120°) on 2026-03-02 agrees with JPL Horizons within 60 s', () => {
    const magha = report.nakshatras.find((s) => s.index === 10);
    expect(magha).toBeDefined();
    const jpl = jplCrossingMs(JPL_MAR02, 120);
    expect(Math.abs(Date.parse(magha!.startIso) - jpl)).toBeLessThanOrEqual(JPL_TOLERANCE_MS);
  });

  it('each Varjyam / Amrit window follows the proportional ghati rule from its nakshatra span and overlaps the civil day', () => {
    const dayStart = Date.parse(report.civilDayStartIso);
    const dayEnd = Date.parse(report.civilDayEndIso);
    expect(report.varjyam.length).toBeGreaterThanOrEqual(1);
    expect(report.amritKalam.length).toBeGreaterThanOrEqual(1);
    for (const w of [...report.varjyam, ...report.amritKalam]) {
      const s = Date.parse(w.nakshatraStartIso);
      const g = (Date.parse(w.nakshatraEndIso) - s) / 60;
      const table = w.kind === 'VARJYAM' ? VARJYAM_GHATIS_PUBLISHED : AMRIT_KALAM_GHATIS;
      expect(w.ghatiOffset).toBe(table[w.nakshatraIndex - 1]);
      expect(Math.abs(Date.parse(w.startIso) - (s + w.ghatiOffset * g))).toBeLessThanOrEqual(1);
      expect(Math.abs(Date.parse(w.endIso) - (s + (w.ghatiOffset + 4) * g))).toBeLessThanOrEqual(1);
      expect(Date.parse(w.endIso)).toBeGreaterThan(dayStart);
      expect(Date.parse(w.startIso)).toBeLessThan(dayEnd);
    }
  });

  it('nakshatra spans are contiguous and consecutive', () => {
    for (let i = 1; i < report.nakshatras.length; i++) {
      expect(report.nakshatras[i].startIso).toBe(report.nakshatras[i - 1].endIso);
      expect(report.nakshatras[i].index).toBe((report.nakshatras[i - 1].index % 27) + 1);
    }
  });

  it('Prashna Marga variant changes only the Varjyam table', async () => {
    const pm = await calc.calculateDay(input, { varjyamTable: 'PRASHNA_MARGA' });
    expect(pm.varjyamTable).toBe('PRASHNA_MARGA');
    expect(pm.amritKalam).toEqual(report.amritKalam);
    expect(pm.durmuhurta).toEqual(report.durmuhurta);
  });
});

describe('Gandmool / Panchaka', () => {
  it('rule data: six Gandmool nakshatras, gandanta junction padas, Panchaka from 300°', () => {
    // Ashwini 1, Ashlesha 9, Magha 10, Jyeshtha 18, Mula 19, Revati 27.
    expect([...GANDMOOL_NAKSHATRA_INDICES]).toEqual([1, 9, 10, 18, 19, 27]);
    expect(GANDANTA_JUNCTION_PADAS.length).toBe(6);
    // Dhanishta spans 293°20′–306°40′; its 3rd pada starts at 293°20′ + 2 × 3°20′ = 300° = Kumbha 0°.
    expect(PANCHAKA_START_DEGREE).toBeCloseTo(22 * NAK + 2 * (NAK / 4), 9);
  });

  it('moment flags agree with JPL-derived Moon positions', async () => {
    // JPL Horizons Moon (QUANTITIES=31) at 00:00 UT: 2026-03-02 142.8816528°, 2026-02-18 335.4345118°,
    // 2026-02-10 236.3577548°. Minus convention ayanamsa (~24.22°) → 118.66° (Ashlesha pada 4),
    // 311.22° (Shatabhisha, Panchaka), 212.14° (Vishakha, neither).
    const a = await calc.gandmoolPanchakaAt(new Date('2026-03-02T00:00:00Z'));
    expect(a.moonLongitude).toBeCloseTo(142.8816528 - conventionAyanamsa(Date.parse('2026-03-02T00:00:00Z')), 2);
    expect([a.nakshatraIndex, a.pada, a.gandmool, a.gandantaJunctionPada, a.panchaka]).toEqual([9, 4, true, true, false]);
    const b = await calc.gandmoolPanchakaAt(new Date('2026-02-18T00:00:00Z'));
    expect([b.nakshatraIndex, b.gandmool, b.panchaka]).toEqual([24, false, true]);
    const c = await calc.gandmoolPanchakaAt(new Date('2026-02-10T00:00:00Z'));
    expect([c.nakshatraIndex, c.gandmool, c.panchaka]).toEqual([16, false, false]);
    expect(a.provisional).toBe(true);
    expect(a.source).toContain('Gandmool');
  });

  it('windows Jan–Mar 2026: ingress instants agree with JPL; window structure follows the rules', async () => {
    const r = await calc.gandmoolPanchakaWindows(new Date('2026-01-01T00:00:00Z'), new Date('2026-03-31T00:00:00Z'));
    expect(r.provisional).toBe(true);
    const panchaka = r.windows.filter((w) => w.kind === 'PANCHAKA');
    const gandmool = r.windows.filter((w) => w.kind === 'GANDMOOL');
    // ~3 lunar months: 3–4 Panchakas, 3 Gandmool windows per sidereal month.
    expect(panchaka.length).toBeGreaterThanOrEqual(3);
    expect(gandmool.length).toBeGreaterThanOrEqual(9);

    // Panchaka start on 2026-02-17 (Moon at sidereal 300°) vs JPL.
    const feb = panchaka.find((w) => w.startIso.startsWith('2026-02-17'));
    expect(feb).toBeDefined();
    expect(Math.abs(Date.parse(feb!.startIso) - jplCrossingMs(JPL_FEB17, 300))).toBeLessThanOrEqual(JPL_TOLERANCE_MS);
    // Revati start (346°40′) on 2026-01-24 vs JPL: starts a Gandmool window.
    const jan = gandmool.find((w) => w.startIso.startsWith('2026-01-24'));
    expect(jan).toBeDefined();
    expect(Math.abs(Date.parse(jan!.startIso) - jplCrossingMs(JPL_JAN24, 26 * NAK))).toBeLessThanOrEqual(JPL_TOLERANCE_MS);

    for (const w of panchaka) {
      expect(w.nakshatras.map((n) => n.index)).toEqual([23, 24, 25, 26, 27]);
      // 60° of Moon motion at 11.8–15.4°/day → 3.9–5.1 days.
      expect(w.durationHours).toBeGreaterThan(3.8 * 24);
      expect(w.durationHours).toBeLessThan(5.2 * 24);
    }
    for (const w of gandmool) {
      const ids = w.nakshatras.map((n) => n.index);
      expect([[27, 1], [9, 10], [18, 19]]).toContainEqual(ids);
      expect(w.nakshatras[1].startIso).toBe(w.nakshatras[0].endIso);
    }
    // Panchaka and the Revati/Ashwini Gandmool share the Revati ingress instant.
    expect(gandmool.some((g) => panchaka.some((p) => p.nakshatras[4].startIso === g.startIso))).toBe(true);
  }, 30000);

  it('rejects ranges over 366 days and reversed ranges', async () => {
    await expect(calc.gandmoolPanchakaWindows(new Date('2026-01-01T00:00:00Z'), new Date('2027-01-03T00:00:00Z'))).rejects.toThrow(MuhurtaExtrasError);
    await expect(calc.gandmoolPanchakaWindows(new Date('2026-02-01T00:00:00Z'), new Date('2026-01-01T00:00:00Z'))).rejects.toThrow(MuhurtaExtrasError);
  });

  it('moon solver: crossings are strictly increasing and bracket-consistent', async () => {
    const solver = new MuhurtaExtMoonSolver();
    const xs = await solver.findCrossings(Date.parse('2026-01-01T00:00:00Z'), Date.parse('2026-01-15T00:00:00Z'), [0, 120, 240]);
    for (let i = 1; i < xs.length; i++) expect(xs[i].ms).toBeGreaterThan(xs[i - 1].ms);
    for (const x of xs) {
      const before = await solver.moonLongitudeAt(x.ms - MIN);
      const after = await solver.moonLongitudeAt(x.ms + MIN);
      const rel = (v: number): number => ((v - x.boundaryDeg + 540) % 360) - 180;
      expect(rel(before)).toBeLessThan(0);
      expect(rel(after)).toBeGreaterThan(0);
    }
  });
});
