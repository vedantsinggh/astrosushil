import { describe, it, expect } from 'vitest';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MS_PER_YEAR } from '../../src/dasha/dasha-calculator';
import { BirthDetails } from '../../src/input/birth-details';
import { DEFAULT_ASTROLOGY_CONFIG } from '../../src/configuration/astrology-config';
import {
  TribhagiDashaCalculator,
  tribhagiYears,
  ShastihayaniDashaCalculator,
  SHASTIHAYANI_ORDER,
  SHASTIHAYANI_GROUPS,
  shastihayaniYears,
  shastihayaniSectorOf,
  evaluateShastihayaniEligibility,
  TaraDashaCalculator,
  taraNameOf,
  selectTaraStartingLord,
  patyayiniRows,
  buildPatyayiniPeriods,
  markPatyayiniActive,
  PatyayiniDashaCalculator,
  PlanetaryDashaExtendedRegistry,
  PLANETARY_EXT_PROVISIONAL_LABEL,
} from '../../src/dasha-planetary-extended/index';

/**
 * Hand-worked examples for the planet-based extra dashas (ADR-016 §3). Each expected value is
 * derived from the cited rule in the comment next to it; none is taken from engine output.
 * Tolerance: 1e-9 years for pure arithmetic, 1 ms for dates (Math.round of millisecond bounds).
 */

const BIRTH = new Date('2000-01-01T00:00:00.000Z');
const yearsBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / MS_PER_YEAR;

const P = PlanetSymbol;

describe('Tribhagi dasha (Vimshottari / 3, three 40-year cycles)', () => {
  // Table: Vimshottari years / 3 (BPHS 46.15 years: Ke 7, Ve 20, Su 6, Mo 10, Ma 7, Ra 18, Ju 16, Sa 19, Me 17).
  it('lord years are one third of Vimshottari and sum to 40', () => {
    expect(tribhagiYears(P.KETU)).toBeCloseTo(7 / 3, 12);
    expect(tribhagiYears(P.VENUS)).toBeCloseTo(20 / 3, 12);
    expect(tribhagiYears(P.SUN)).toBeCloseTo(2, 12);
    const sum = [P.KETU, P.VENUS, P.SUN, P.MOON, P.MARS, P.RAHU, P.JUPITER, P.SATURN, P.MERCURY]
      .reduce((s, l) => s + tribhagiYears(l), 0);
    expect(sum).toBeCloseTo(40, 12);
  });

  it('worked example: Moon at 10° Aries (Ashwini, Ketu)', () => {
    // Ashwini spans 0°-13°20'. 10° elapsed -> fraction elapsed 10 / 13.3333 = 0.75.
    // Ketu Tribhagi = 7/3 = 2.33333 y. Elapsed = 0.75 x 2.33333 = 1.75 y; balance = 0.58333 y.
    // Order: Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury, repeated 3 times (27 periods).
    const t = new TribhagiDashaCalculator().calculateFromMoon(10, BIRTH, { maxLevel: 2 });
    expect(t.provisional).toBe(true);
    expect(t.label).toBe(PLANETARY_EXT_PROVISIONAL_LABEL);
    expect(t.startingLord).toBe(P.KETU);
    expect(t.balanceAtBirthYears).toBeCloseTo(7 / 12, 9);
    expect(t.elapsedAtBirthYears).toBeCloseTo(1.75, 9);
    expect(t.mahadashas).toHaveLength(27);
    expect(t.mahadashas.slice(0, 3).map((m) => m.lord)).toEqual([P.KETU, P.VENUS, P.SUN]);
    expect(t.mahadashas[9].lord).toBe(P.KETU); // second cycle starts again with Ketu
    // First MD clipped at birth; ends 0.58333 y after birth.
    expect(t.mahadashas[0].startDateIso).toBe(BIRTH.toISOString());
    expect(yearsBetween(BIRTH.toISOString(), t.mahadashas[0].endDateIso)).toBeCloseTo(7 / 12, 8);
    // Venus MD = 20/3 = 6.6667 y.
    expect(t.mahadashas[1].nominalYears).toBeCloseTo(20 / 3, 12);
    // Whole sequence after birth = 120 - 1.75 = 118.25 y.
    expect(yearsBetween(BIRTH.toISOString(), t.mahadashas[26].endDateIso)).toBeCloseTo(118.25, 7);
    // Antardasha of Venus within Venus MD: 6.6667 x 20/120 = 1.11111 y (Vimshottari proportion).
    const venusMd = t.mahadashas[1];
    expect(venusMd.subPeriods?.[0].lord).toBe(P.VENUS);
    expect(venusMd.subPeriods?.[0].nominalYears).toBeCloseTo(10 / 9, 9);
    expect(venusMd.subPeriods?.[1].lord).toBe(P.SUN); // follows the dasha order
    expect(venusMd.subPeriods).toHaveLength(9);
  });

  it('marks the active period for a target date', () => {
    // Target 1 y after birth: Ketu ends at 0.5833 y, Venus runs 0.5833..7.25 y -> Venus active.
    const target = new Date(BIRTH.getTime() + 1 * MS_PER_YEAR);
    const t = new TribhagiDashaCalculator().calculateFromMoon(10, BIRTH, { maxLevel: 2, targetDate: target });
    expect(t.currentPeriod?.mahadasha.lord).toBe(P.VENUS);
    expect(t.mahadashas[1].isActive).toBe(true);
  });
});

describe('Shastihayani dasha (BPHS 46.40-41)', () => {
  it('table: order, years (3 x 10 + 5 x 6 = 60) and 28-sector allocation from Ashwini', () => {
    expect(SHASTIHAYANI_ORDER).toEqual([P.JUPITER, P.SUN, P.MARS, P.MOON, P.MERCURY, P.VENUS, P.SATURN, P.RAHU]);
    expect(SHASTIHAYANI_ORDER.map(shastihayaniYears)).toEqual([10, 10, 10, 6, 6, 6, 6, 6]);
    expect(SHASTIHAYANI_ORDER.reduce((s, l) => s + shastihayaniYears(l), 0)).toBe(60);
    // Adawal's table: group sizes 3,4,3,4,3,4,3,4 = 28 (with Abhijit), contiguous from Ashwini.
    expect(SHASTIHAYANI_GROUPS.map((g) => g.sectors.length)).toEqual([3, 4, 3, 4, 3, 4, 3, 4]);
    expect(SHASTIHAYANI_GROUPS.flatMap((g) => g.sectors)).toHaveLength(28);
    expect(SHASTIHAYANI_GROUPS[1].sectors[0]).toBe('Rohini'); // Santhanam's example: Rohini precedes Mrigashira in Sun's group
    expect(SHASTIHAYANI_GROUPS[6].sectors[0]).toBe('Abhijit');
  });

  it("worked example (Santhanam's v.40-41 example): Moon in the middle of Mrigashira", () => {
    // Moon at 60° = Mrigashira (53°20'-66°40'), fraction 0.5. Sun group: Rohini, Mrigashira, Ardra, Punarvasu;
    // each 10/4 = 2.5 y ("2½ years or 30 months each"). Rohini fully elapsed (2.5 y) + 0.5 x 2.5 = 3.75 y elapsed;
    // balance = 10 - 3.75 = 6.25 y. Next dashas: Mars 10, Moon 6, Mercury 6, Venus 6, Saturn 6, Rahu 6, Jupiter 10.
    const s = shastihayaniSectorOf(60);
    expect(s.lord).toBe(P.SUN);
    expect(s.sectorName).toBe('Mrigashira');
    expect(s.orderInGroup).toBe(2);
    expect(s.elapsedYears).toBeCloseTo(3.75, 9);
    expect(s.balanceYears).toBeCloseTo(6.25, 9);
    const t = new ShastihayaniDashaCalculator().calculateFromMoon(60, BIRTH, { maxLevel: 2 });
    expect(t.mahadashas.slice(0, 8).map((m) => m.lord)).toEqual([P.SUN, P.MARS, P.MOON, P.MERCURY, P.VENUS, P.SATURN, P.RAHU, P.JUPITER]);
    expect(t.mahadashas).toHaveLength(16);
    expect(yearsBetween(BIRTH.toISOString(), t.mahadashas[0].endDateIso)).toBeCloseTo(6.25, 8);
    // Antardasha Mars/Mars: 10 x 10 / 60 = 1.6667 y; Mars/Moon: 10 x 6 / 60 = 1 y.
    expect(t.mahadashas[1].subPeriods?.[0].nominalYears).toBeCloseTo(10 / 6, 9);
    expect(t.mahadashas[1].subPeriods?.[1].lord).toBe(P.MOON);
    expect(t.mahadashas[1].subPeriods?.[1].nominalYears).toBeCloseTo(1, 9);
    // End of the two cycles = 120 - 3.75 = 116.25 y after birth.
    expect(yearsBetween(BIRTH.toISOString(), t.mahadashas[15].endDateIso)).toBeCloseTo(116.25, 7);
  });

  it('worked example: Moon in Abhijit (Saturn group, reduced sector span)', () => {
    // Abhijit = 276°40' to 280°53'20" (span 4°13'20" = 4.2222°). Moon at 278°: fraction 1.3333 / 4.2222 = 0.315789.
    // Saturn 6 y over 3 sectors -> 2 y each; Abhijit is first: elapsed 0.631579 y, balance 5.368421 y.
    const s = shastihayaniSectorOf(278);
    expect(s.sectorName).toBe('Abhijit');
    expect(s.lord).toBe(P.SATURN);
    expect(s.elapsedYears).toBeCloseTo(2 * (4 / 3) / (38 / 9), 9);
    expect(s.balanceYears).toBeCloseTo(6 - 2 * (4 / 3) / (38 / 9), 9);
  });

  it('eligibility: Sun in the Lagna sign', () => {
    const chart = (asc: number, sun: number) =>
      ({ ascendant: { rashiIndex: asc }, planets: { [P.SUN]: { rashiIndex: sun } } } as unknown as AstroChart);
    expect(evaluateShastihayaniEligibility(chart(5, 5)).isEligible).toBe(true);
    expect(evaluateShastihayaniEligibility(chart(5, 6)).isEligible).toBe(false);
  });
});

describe('Tara dasha (BPHS 46.207-209)', () => {
  it("tara labels follow Santhanam's table (Sun Janma ... Venus Atimaitra)", () => {
    // Santhanam's table: Jupiter Pratyari, Saturn Sadhana, Mercury Vadha, Ketu Maitra, Venus Atimaitra,
    // Sun Janma, Moon Sampat, Mars Vipat, Rahu Kshema.
    expect(taraNameOf(P.JUPITER)).toBe('Pratyari');
    expect(taraNameOf(P.SATURN)).toBe('Sadhana');
    expect(taraNameOf(P.KETU)).toBe('Maitra');
    expect(taraNameOf(P.SUN)).toBe('Janma');
    expect(taraNameOf(P.RAHU)).toBe('Kshema');
  });

  it("worked example (Santhanam's illustration): Jupiter strongest in kendras", () => {
    // Kendra planets: Jupiter (7.2 rupas), Moon (6.1), Rahu (no Shadbala). Strongest = Jupiter.
    // Sequence = Vimshottari from Jupiter with full years: Ju 16, Sa 19, Me 17, Ke 7, Ve 20, Su 6, Mo 10, Ma 7, Ra 18.
    const kendra = [
      { planet: P.MOON, house: 4, shadbalaRupas: 6.1 },
      { planet: P.JUPITER, house: 1, shadbalaRupas: 7.2 },
      { planet: P.RAHU, house: 10, shadbalaRupas: null },
    ];
    expect(selectTaraStartingLord(kendra)).toBe(P.JUPITER);
    const t = new TaraDashaCalculator().calculateFromKendraPlanets(kendra, 100, BIRTH, { maxLevel: 2 });
    expect(t.eligibility.isEligible).toBe(true);
    expect(t.mahadashas.map((m) => m.lord)).toEqual([P.JUPITER, P.SATURN, P.MERCURY, P.KETU, P.VENUS, P.SUN, P.MOON, P.MARS, P.RAHU]);
    expect(t.mahadashas.map((m) => m.nominalYears)).toEqual([16, 19, 17, 7, 20, 6, 10, 7, 18]);
    expect(t.mahadashas[0].taraName).toBe('Pratyari');
    expect(t.mahadashas[0].startDateIso).toBe(BIRTH.toISOString());
    expect(yearsBetween(BIRTH.toISOString(), t.mahadashas[8].endDateIso)).toBeCloseTo(120, 7);
    // Antardasha Jupiter/Saturn = 16 x 19 / 120 = 2.5333 y.
    expect(t.mahadashas[0].subPeriods?.[1].lord).toBe(P.SATURN);
    expect(t.mahadashas[0].subPeriods?.[1].nominalYears).toBeCloseTo(16 * 19 / 120, 9);
  });

  it('not applicable without kendra planets, not determinable with only the nodes', () => {
    const calc = new TaraDashaCalculator();
    expect(calc.calculateFromKendraPlanets([], 100, BIRTH).eligibility.isEligible).toBe(false);
    const nodesOnly = calc.calculateFromKendraPlanets(
      [{ planet: P.RAHU, house: 1, shadbalaRupas: null }, { planet: P.KETU, house: 7, shadbalaRupas: null }], 100, BIRTH);
    expect(nodesOnly.eligibility.isEligible).toBe(false);
    expect(nodesOnly.mahadashas).toHaveLength(0);
  });
});

describe('Patyayini dasha (Narasimha Rao, Integrated Approach 30.3, Table 75)', () => {
  // Table 75 krisamsas (annual chart of Example 122, 1993-94):
  // Venus 1°38', Mercury 4°47', Moon 4°49', Saturn 6°30', Lagna 7°14', Jupiter 10°59', Sun 17°05', Mars 23°53'.
  // Patyamsas: 1°38', 3°09', 0°02', 1°41', 0°44', 3°45', 6°06', 6°48' (sum = 23°53' = largest krisamsa).
  // Fractions (patyamsa / 23°53' = x / 1433'): .0684 .1319 .0014 .0705 .0307 .1570 .2554 .2847.
  // Days (x 365.2425): 24.98 48.17 0.51 25.74 11.21 57.35 93.29 103.99.
  const dm = (d: number, m: number) => d + m / 60;
  const points = [
    { key: 'LAGNA' as const, degreeInSign: dm(7, 14) },
    { key: P.SUN, degreeInSign: dm(17, 5) },
    { key: P.MOON, degreeInSign: dm(4, 49) },
    { key: P.MARS, degreeInSign: dm(23, 53) },
    { key: P.MERCURY, degreeInSign: dm(4, 47) },
    { key: P.JUPITER, degreeInSign: dm(10, 59) },
    { key: P.VENUS, degreeInSign: dm(1, 38) },
    { key: P.SATURN, degreeInSign: dm(6, 30) },
  ];

  it('reproduces Table 75 order, patyamsas, fractions and days', () => {
    const rows = patyayiniRows(points);
    expect(rows.map((r) => r.key)).toEqual([P.VENUS, P.MERCURY, P.MOON, P.SATURN, 'LAGNA', P.JUPITER, P.SUN, P.MARS]);
    const expectedPatyamshaMin = [98, 189, 2, 101, 44, 225, 366, 408];
    rows.forEach((r, i) => expect(r.patyamsha * 60).toBeCloseTo(expectedPatyamshaMin[i], 9));
    const expectedFractions = [0.0684, 0.1319, 0.0014, 0.0705, 0.0307, 0.157, 0.2554, 0.2847];
    rows.forEach((r, i) => expect(Math.abs(r.fraction - expectedFractions[i])).toBeLessThan(0.00006)); // table rounds to 4 dp
    const start = Date.UTC(1993, 5, 1, 8, 0, 4); // Varshapravesh 1 Jun 1993 13:30:04 IST
    const end = start + 365.2425 * 86400000;
    const periods = buildPatyayiniPeriods(rows, start, end, 2);
    const expectedDays = [24.98, 48.17, 0.51, 25.74, 11.21, 57.35, 93.29, 103.99];
    periods.forEach((p, i) => expect(Math.abs(p.days - expectedDays[i])).toBeLessThan(0.006)); // table rounds to 0.01 d
    // "first 25 days (June 1-26, 1993) is Venus dasa. Next 48 days (June 26-Aug 13, 1993) is Mercury dasa"
    expect(periods[0].endDateIso.slice(0, 10)).toBe('1993-06-26');
    expect(periods[1].endDateIso.slice(0, 10)).toBe('1993-08-13');
    expect(periods[7].endDateIso).toBe(new Date(end).toISOString());
    // Antardasas of Venus: Venus 0.0684 x 24.98 = 1.7 d, Mercury 0.1319 x 24.98 = 3.3 d, Moon 0.03 d, Saturn 1.8 d.
    const ad = periods[0].subPeriods!;
    expect(ad.map((a) => a.key).slice(0, 4)).toEqual([P.VENUS, P.MERCURY, P.MOON, P.SATURN]);
    expect(ad[0].days).toBeCloseTo(1.7, 1);
    expect(ad[1].days).toBeCloseTo(3.3, 1);
    expect(ad[2].days).toBeCloseTo(0.03, 2);
    expect(ad[3].days).toBeCloseTo(1.8, 1);
    // Mercury dasa antardasas start with Mercury, then Moon ... and wrap to Venus last.
    expect(periods[1].subPeriods!.map((a) => a.key)).toEqual([P.MERCURY, P.MOON, P.SATURN, 'LAGNA', P.JUPITER, P.SUN, P.MARS, P.VENUS]);
    // The marriage on 24 July 1993 falls in Mercury dasa.
    expect(markPatyayiniActive(periods, '1993-07-24T06:00:00Z')?.[0]).toBe(P.MERCURY);
    expect(periods[1].isActive).toBe(true);
  });

  it('annual chart: 8 points (no nodes), bounded by consecutive solar returns', async () => {
    const birth: BirthDetails = {
      date: { year: 1990, month: 5, day: 15 }, time: { hour: 14, minute: 30, second: 0 },
      timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209,
    };
    const r = await new PatyayiniDashaCalculator().calculate(birth, { targetYear: 2026, maxLevel: 2 });
    expect(r.provisional).toBe(true);
    expect(r.rows).toHaveLength(8);
    expect(r.rows.some((x) => x.key === P.RAHU || x.key === P.KETU)).toBe(false);
    expect(r.rows.reduce((s, x) => s + x.fraction, 0)).toBeCloseTo(1, 12);
    for (let i = 1; i < 8; i++) expect(r.rows[i].krishamsha).toBeGreaterThanOrEqual(r.rows[i - 1].krishamsha);
    expect(r.periods[0].startDateIso).toBe(new Date(r.solarReturnUtcIso).toISOString());
    expect(r.periods[7].endDateIso).toBe(new Date(r.nextSolarReturnUtcIso).toISOString());
    // A sidereal solar year is 365.2564 d; allow ±0.1 d for the solver.
    expect(Math.abs(r.yearLengthDays - 365.2564)).toBeLessThan(0.1);
    expect(r.solarReturnUtcIso.startsWith('2026-05')).toBe(true);
  }, 60000);
});

describe('PlanetaryDashaExtendedRegistry', () => {
  it('lists systems with source + provisional flags; Moola is reported as not implemented', () => {
    const list = PlanetaryDashaExtendedRegistry.listSystems();
    expect(list.map((s) => s.system)).toEqual(['TRIBHAGI', 'SHASTIHAYANI', 'TARA', 'PATYAYINI', 'MOOLA']);
    for (const s of list) {
      expect(s.provisional).toBe(true);
      expect(s.source.length).toBeGreaterThan(10);
    }
    expect(list.find((s) => s.system === 'MOOLA')?.implemented).toBe(false);
  });

  it('calculates every registered system for a real chart (shape + determinism)', async () => {
    const chart = await new ChartCalculator().calculateChart({
      date: { year: 1990, month: 5, day: 15 }, time: { hour: 14, minute: 30, second: 0 },
      timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209,
    }, DEFAULT_ASTROLOGY_CONFIG);
    for (const sys of ['TRIBHAGI', 'SHASTIHAYANI', 'TARA'] as const) {
      const a = PlanetaryDashaExtendedRegistry.calculate(sys, chart, { maxLevel: 2, targetDate: '2026-11-20T00:00:00Z' });
      const b = PlanetaryDashaExtendedRegistry.calculate(sys, chart, { maxLevel: 2, targetDate: '2026-11-20T00:00:00Z' });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(a.dashaSystem).toBe(sys);
      expect(a.provisional).toBe(true);
      if (a.mahadashas.length > 0) {
        expect(a.mahadashas[0].isBirthDasha).toBe(true);
        expect(a.mahadashas[0].subPeriods?.length).toBeGreaterThan(0);
      }
    }
    expect(() => PlanetaryDashaExtendedRegistry.calculate('MOOLA' as never, chart)).toThrow();
  }, 60000);
});
