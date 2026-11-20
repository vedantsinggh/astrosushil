import { describe, it, expect } from 'vitest';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { MS_PER_YEAR } from '../../src/dasha/dasha-calculator';
import {
  SignDashaExtendedRegistry,
  SIGN_DASHA_EXT_SYSTEMS,
  SIGN_DASHA_EXT_KENDRADI_OFFSETS,
  SIGN_DASHA_EXT_TRIKONA_OFFSETS,
  SIGN_DASHA_EXT_PROVISIONAL_LABEL,
  signDashaExtSequence,
  signDashaExtSreeLagna,
  signDashaExtAntardashaOrder,
  signDashaExtDrigSequence,
  SignDashaExtSystem,
} from '../../src/dasha-sign-extended/index';

/**
 * Extra sign dashas (ADR-016 decision 3). Expected values come from the cited books, or are
 * hand-worked from the cited rule (derivation in the comment next to each assertion); the engine's
 * own output is never used as an expected value.
 *
 * Sources:
 *  VAIA = P.V.R. Narasimha Rao, "Vedic Astrology: An Integrated Approach" (2000).
 *  BPHS = Brihat Parasara Hora Sastra, R. Santhanam tr. vol. 2 (ch. 46 v. 175-187, ch. 51 v. 5-12).
 * Sign abbreviations: Ar=1 Ta=2 Ge=3 Cn=4 Le=5 Vi=6 Li=7 Sc=8 Sg=9 Cp=10 Aq=11 Pi=12.
 * Tolerances: degrees 1/60 deg (the books print arc-minutes); years 1e-6 (pure arithmetic);
 * dates 1 day where the book prints calendar dates.
 */

const [Ar, Ta, Ge, Cn, Le, Vi, Li, Sc, Sg, Cp, Aq, Pi] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const BIRTH = new Date('2000-01-01T00:00:00.000Z');
type Placement = [PlanetSymbol, number, number];
const { SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU } = PlanetSymbol;

function buildChart(ascSign: number, ascDeg: number, placements: Placement[], birth: Date = BIRTH): AstroChart {
  const planets: any = {};
  for (const [p, sign, deg] of placements) {
    planets[p] = { planet: p, longitude: (sign - 1) * 30 + deg, rashiIndex: sign, degreeInRashi: deg, speedLongitude: 1, isRetrograde: false };
  }
  return {
    metadata: {
      engineVersion: '0.1.0',
      calculationTimestampIso: birth.toISOString(),
      providerName: 'Test',
      providerVersion: '1',
      config: {} as any,
      normalizedTime: { utcIsoString: birth.toISOString(), julianDayUT: 0, timezoneOffsetMinutes: 0 } as any,
    },
    birthDetails: {} as any,
    ascendant: { longitude: (ascSign - 1) * 30 + ascDeg, rashiIndex: ascSign } as any,
    planets,
  };
}

const dms = (d: number, m: number, s = 0) => d + m / 60 + s / 3600;
const signsOf = (t: { mahadashas: { signIndex: number; cycle?: number }[] }, cycle = 1) =>
  t.mahadashas.filter((p) => p.cycle === cycle).map((p) => p.signIndex);
const yearsOf = (t: { mahadashas: { nominalYears: number; cycle?: number }[] }, cycle = 1) =>
  t.mahadashas.filter((p) => p.cycle === cycle).map((p) => p.nominalYears);

/**
 * Chart E66 = the chart of VAIA Example 66 (born Aug 1912), positions as stated in the book's
 * text: Lagna Aq; Sun Cn; Moon Ta (exalted); Mars, Mercury, Venus Le; Jupiter Sc; Saturn Ta.
 * The book does not state the nodes; Rahu Ge / Ketu Sg are placed alone so that, as the book says,
 * Saturn is the lord used for Aq and Mars for Sc (more conjunctions, JSD-004).
 * Book Narayana-dasa lengths (VAIA 18.2.2 Example 66, odd-footed counting):
 *   Le 1, Cp 8, Ge 2, Sc 9, Ar 4, Vi 1, Aq 9, Cn 3, Sg 11, Ta 3, Li 10, Pi 4.
 */
const E66 = buildChart(Aq, 10, [
  [SUN, Cn, 20],
  [MOON, Ta, 20],
  [MARS, Le, 10],
  [MERCURY, Le, 15],
  [VENUS, Le, 25],
  [JUPITER, Sc, 5],
  [SATURN, Ta, 10],
  [RAHU, Ge, 10],
  [KETU, Sg, 10],
]);
const E66_YEARS: Record<number, number> = { [Le]: 1, [Cp]: 8, [Ge]: 2, [Sc]: 9, [Ar]: 4, [Vi]: 1, [Aq]: 9, [Cn]: 3, [Sg]: 11, [Ta]: 3, [Li]: 10, [Pi]: 4 };
const STHIRA: Record<number, number> = { 1: 7, 2: 8, 3: 9, 4: 7, 5: 8, 6: 9, 7: 7, 8: 8, 9: 9, 10: 7, 11: 8, 12: 9 };

describe('registry', () => {
  it('lists the six implemented systems, all provisional with a source, and the four pending ones', () => {
    const list = SignDashaExtendedRegistry.listSystems();
    expect(list.map((s) => s.system)).toEqual(['SUDASA', 'DRIG', 'NIRYANA_SHOOLA', 'MANDOOKA', 'TRIKONA', 'KENDRADI']);
    for (const s of list) {
      expect(s.provisional).toBe(true);
      expect(s.provisionalLabel).toBe('provisional – pending client review');
      expect(s.source.length).toBeGreaterThan(20);
    }
    expect(SignDashaExtendedRegistry.listPending().map((p) => p.system)).toEqual(['BRAHMA', 'NAVAMSA', 'VARNADA', 'PADANADHAMSA']);
  });

  it('every result carries provisional, source, conventionNotes and the shared period-tree shape', () => {
    for (const system of SIGN_DASHA_EXT_SYSTEMS) {
      const t = SignDashaExtendedRegistry.calculate(system, E66, { maxLevel: 3, targetDate: '2030-06-01T00:00:00Z' });
      expect(t.provisional).toBe(true);
      expect(t.provisionalLabel).toBe(SIGN_DASHA_EXT_PROVISIONAL_LABEL);
      expect(t.source).toBeTruthy();
      expect(t.conventionNotes.length).toBeGreaterThan(0);
      expect(new Set(t.sequence).size).toBe(12);
      const md = t.mahadashas[0];
      expect(md.level).toBe(1);
      expect(md.subPeriods).toHaveLength(12);
      expect(md.subPeriods![0].subPeriods).toHaveLength(12);
      expect(md.subPeriods![0].level).toBe(2);
      // Consecutive Mahadashas are contiguous and the last Antardasha ends with its Mahadasha.
      for (let i = 1; i < t.mahadashas.length; i++) expect(t.mahadashas[i].nominalStartDateIso).toBe(t.mahadashas[i - 1].nominalEndDateIso);
      expect(md.subPeriods![11].nominalEndDateIso).toBe(md.nominalEndDateIso);
      // 2030-06-01 is 30.4 years after birth: exactly one active node per level.
      expect(t.currentPeriod).toBeDefined();
      expect(t.mahadashas.filter((p) => p.isActive)).toHaveLength(1);
      expect(t.currentPeriod!.pratyantardasha).toBeDefined();
    }
  });

  it('maxLevel 1 omits sub-periods; maxLevel is clamped to 1-3', () => {
    const t1 = SignDashaExtendedRegistry.calculate('DRIG', E66, { maxLevel: 1 });
    expect(t1.mahadashas[0].subPeriods).toBeUndefined();
    const t9 = SignDashaExtendedRegistry.calculate('DRIG', E66, { maxLevel: 9 });
    expect(t9.mahadashas[0].subPeriods![0].subPeriods![0].subPeriods).toBeUndefined();
  });
});

describe('movement tables', () => {
  it('kendradi offsets give the VAIA 19.2 worked sequences', () => {
    // VAIA 19.2: seed Ge forward -> Ge, Vi, Sg, Pi, Cn, Li, Cp, Ar, Le, Sc, Aq, Ta.
    expect(signDashaExtSequence(Ge, SIGN_DASHA_EXT_KENDRADI_OFFSETS, 'FORWARD')).toEqual([Ge, Vi, Sg, Pi, Cn, Li, Cp, Ar, Le, Sc, Aq, Ta]);
    // VAIA 19.2: seed Ta backward -> Ta, Aq, Sc, Le, Ar, Cp, Li, Cn, Pi, Sg, Vi, Ge.
    expect(signDashaExtSequence(Ta, SIGN_DASHA_EXT_KENDRADI_OFFSETS, 'REVERSE')).toEqual([Ta, Aq, Sc, Le, Ar, Cp, Li, Cn, Pi, Sg, Vi, Ge]);
  });

  it('trikona offsets give the BPHS ch. 46 v. 183-184 example sequence', () => {
    // Santhanam example (Lagna Aq strongest, odd): Aq, Ge, Li, Pi, Cn, Sc, Ar, Le, Sg, Ta, Vi, Cp.
    expect(signDashaExtSequence(Aq, SIGN_DASHA_EXT_TRIKONA_OFFSETS, 'FORWARD')).toEqual([Aq, Ge, Li, Pi, Cn, Sc, Ar, Le, Sg, Ta, Vi, Cp]);
  });

  it('Drig order matches the BPHS ch. 46 v. 185-187 example (Lagna Aq)', () => {
    // 9th Li (movable): aspected fixed signs counted backwards: Le, Ta, Aq.
    // 10th Sc (fixed): aspected movable signs counted onwards: Cp, Ar, Cn.
    // 11th Sg (dual, odd): aspected dual signs counted onwards: Pi, Ge, Vi.
    const d = signDashaExtDrigSequence(Aq);
    expect(d.sequence).toEqual([Li, Le, Ta, Aq, Sc, Cp, Ar, Cn, Sg, Pi, Ge, Vi]);
    expect(d.groups.map((g) => g.direction)).toEqual(['REVERSE', 'FORWARD', 'FORWARD']);
  });

  it('antardasha order follows the BPHS ch. 51 v. 7-12 examples', () => {
    // Chart with a planet in Aq and in Pi only, so Aq beats Le and Pi beats Vi on occupants.
    const c = buildChart(Aq, 5, [
      [SUN, Aq, 10], [MOON, Pi, 10], [MARS, Ar, 1], [MERCURY, Aq, 20], [JUPITER, Ta, 1],
      [VENUS, Pi, 20], [SATURN, Cp, 1], [RAHU, Ge, 1], [KETU, Sg, 1],
    ]);
    // Aq (fixed, odd): every 6th sign onwards from Aq: Aq, Cn, Sg, Ta, Li, Pi, Le, Cp, Ge, Sc, Ar, Vi (Santhanam table).
    expect(signDashaExtAntardashaOrder(c, Aq)).toEqual([Aq, Cn, Sg, Ta, Li, Pi, Le, Cp, Ge, Sc, Ar, Vi]);
    // Pi (dual, even): kendras of Pi in reverse (Pi, Sg, Vi, Ge), then of Sc (Sc, Le, Ta, Aq), then of Cn (Cn, Ar, Cp, Li).
    expect(signDashaExtAntardashaOrder(c, Pi)).toEqual([Pi, Sg, Vi, Ge, Sc, Le, Ta, Aq, Cn, Ar, Cp, Li]);
    // Ar (movable, odd; Ar has Mars, Li is empty): consecutive signs onwards.
    expect(signDashaExtAntardashaOrder(c, Ar)).toEqual([Ar, Ta, Ge, Cn, Le, Vi, Li, Sc, Sg, Cp, Aq, Pi]);
    // Li (movable, odd) is weaker than its 7th Ar (Mars there): antardashas start from Ar, onwards (Li is odd).
    expect(signDashaExtAntardashaOrder(c, Li)[0]).toBe(Ar);
  });
});

describe('Sree Lagna (VAIA 5.7)', () => {
  it('Example 10: Moon 13 Li 06, Lagna 25 Vi 05 -> SL 18 Pi 47', () => {
    const sl = signDashaExtSreeLagna(150 + dms(25, 5), 180 + dms(13, 6));
    expect(sl.signIndex).toBe(Pi);
    expect(Math.abs(sl.degreeInSign - dms(18, 47))).toBeLessThan(1 / 60);
  });
  it('Exercise 10 answer: Moon 15 Le 29, Lagna 14 Sc 19 -> SL 12 Cp 22', () => {
    const sl = signDashaExtSreeLagna(210 + dms(14, 19), 120 + dms(15, 29));
    expect(sl.signIndex).toBe(Cp);
    expect(Math.abs(sl.degreeInSign - dms(12, 22))).toBeLessThan(1 / 60);
  });
  it('ch. 32 example: Moon 13 Le 13 25, Lagna 17 Pi 35 50 -> SL 14 Pi 38 05', () => {
    const sl = signDashaExtSreeLagna(330 + dms(17, 35, 50), 120 + dms(13, 13, 25));
    expect(sl.signIndex).toBe(Pi);
    expect(Math.abs(sl.degreeInSign - dms(14, 38, 5))).toBeLessThan(1 / 60);
  });
});

describe('Sudasa (VAIA ch. 20)', () => {
  /**
   * VAIA Example 77 (Sri Vajpayee): SL 12 Cp 21, Cp even -> backward kendradi:
   * Cp, Li, Cn, Ar, Sg, Vi, Ge, Pi, Sc, Le, Ta, Aq with years 2, 2, 11, 12, 2, 10, 5, 1, 2, 8, 7, 3;
   * first dasa balance (30 - 12 deg 21')/30 = 0.5883 of 2 years = 1.1766 years.
   * Chart: Saturn and Mercury in Sc (VAIA Example 78) and Sun in Sg (December birth) are from the
   * book; the other lord placements are the ones the book's own years imply under the stated
   * counting rule (Cp 2: Saturn 3rd backward = Sc; Li 2: Venus 3rd forward = Sg; Cn 11: Moon 12th
   * backward = Le; Ar 12: Mars in Ar; Sg 2: Jupiter 3rd forward = Aq; Sc 2: Ketu 3rd forward = Cp,
   * the stronger Sc lord because, with no conjunctions or exaltation and equal modality, Ketu is
   * more advanced (30 - 5 = 25 deg vs Mars 5 deg)). Vi 10, Ge 5, Pi 1, Le 8, Ta 7, Aq 3 then
   * follow independently and check the counting rule. The Moon sits at 0 Le (start of Magha), so
   * SL = Lagna. Ketu therefore occupies the SL sign Cp, yet the book's order is backward: this is
   * why no Ketu exception is applied to Sudasa (VAIA 20.2 states none).
   */
  const VAJPAYEE = buildChart(Cp, dms(12, 21), [
    [SUN, Sg, 10], [MOON, Le, 1e-7], [MARS, Ar, 5], [MERCURY, Sc, 15], [JUPITER, Aq, 10],
    [VENUS, Sg, 20], [SATURN, Sc, 20], [RAHU, Cn, 5], [KETU, Cp, 5],
  ]);

  it('Example 77: sequence, years and balance', () => {
    const t = SignDashaExtendedRegistry.calculate('SUDASA', VAJPAYEE);
    expect(t.startingSign).toBe(Cp);
    expect(t.direction).toBe('REVERSE');
    expect(signsOf(t)).toEqual([Cp, Li, Cn, Ar, Sg, Vi, Ge, Pi, Sc, Le, Ta, Aq]);
    expect(yearsOf(t)).toEqual([2, 2, 11, 12, 2, 10, 5, 1, 2, 8, 7, 3]);
    // 2 x (1800' - 741')/1800' = 1.17667 years ("1 year 2 months 3 days 14 hours").
    expect(t.balanceAtBirthYears).toBeCloseTo((2 * (1800 - 741)) / 1800, 4);
    const firstEnd = new Date(t.mahadashas[0].endDateIso).getTime();
    expect((firstEnd - BIRTH.getTime()) / MS_PER_YEAR).toBeCloseTo((2 * (1800 - 741)) / 1800, 4);
    expect(t.mahadashas[0].isBirthDasha).toBe(true);
    // Second cycle: 12 - first-cycle years (Cp 10, Li 10, Cn 1, Ar 0 -> skipped, ...).
    expect(signsOf(t, 2).slice(0, 4)).toEqual([Cp, Li, Cn, Sg]);
    expect(yearsOf(t, 2).slice(0, 4)).toEqual([10, 10, 1, 10]);
  });

  /**
   * VAIA Example 79 (Jayalalita, born Feb 1948): SL 22 Sg 22; Sg odd -> forward:
   * Sg, Pi, Ge, Vi (kendras), Cp, Ar, Cn, Li, Aq, Ta, Le, Sc. Sg = 12 years (Jupiter in Sg),
   * 12 x (30 - 22 deg 22')/30 = 3.0533 years left (3 years 19 days); then Pi 3, Ge 8, Vi 7, Cp 6,
   * Ar 4, Cn 11, Li 6, and Li runs Feb 1990 - Feb 1996.
   * Chart: lord placements implied by those years: Jupiter Sg; Mercury Aq (Ge 9th forward, Vi
   * 8th backward - consistent); Saturn Cn (Cp 7th backward); Mars Le (Ar 5th forward); Moon Le
   * (Cn 12th backward); Venus Ar (Li 7th forward). Moon at 0 Le so SL = Lagna.
   */
  it('Example 79: forward sequence, first-dasa balance and the Libra dasa dates', () => {
    const birth = new Date('1948-02-24T12:00:00Z');
    const c = buildChart(Sg, dms(22, 22), [
      [SUN, Aq, 12], [MOON, Le, 1e-7], [MARS, Le, 5], [MERCURY, Aq, 20], [JUPITER, Sg, 2],
      [VENUS, Ar, 10], [SATURN, Cn, 20], [RAHU, Ar, 20], [KETU, Li, 20],
    ], birth);
    const t = SignDashaExtendedRegistry.calculate('SUDASA', c);
    expect(signsOf(t)).toEqual([Sg, Pi, Ge, Vi, Cp, Ar, Cn, Li, Aq, Ta, Le, Sc]);
    expect(yearsOf(t).slice(0, 8)).toEqual([12, 3, 8, 7, 6, 4, 11, 6]);
    expect(t.balanceAtBirthYears).toBeCloseTo(12 * (30 - dms(22, 22)) / 30, 4);
    const li = t.mahadashas[7];
    expect(li.startDateIso.slice(0, 7)).toBe('1990-03'); // book: "Feb 1990" (birth 24 Feb + 0.0533 y -> early March)
    expect(li.endDateIso.slice(0, 4)).toBe('1996');
  });

  it('E66 chart: SL from Moon 20 Ta / Lagna 10 Aq is 10 Sc; backward kendradi; balance 6 of 9 years', () => {
    // Moon 50 deg: Rohini (40 - 53 20') traversed 10/13.333 = 0.75 -> 270 deg; 310 + 270 = 580 = 220 = 10 Sc.
    const t = SignDashaExtendedRegistry.calculate('SUDASA', E66);
    expect(t.sreeLagna!.signIndex).toBe(Sc);
    expect(t.sreeLagna!.degreeInSign).toBeCloseTo(10, 6);
    expect(signsOf(t)).toEqual([Sc, Le, Ta, Aq, Li, Cn, Ar, Cp, Vi, Ge, Pi, Sg]);
    expect(yearsOf(t)).toEqual(signsOf(t).map((s) => E66_YEARS[s]));
    // Sc = 9 years; (30 - 10)/30 of it = 6 years left, 3 elapsed before birth.
    expect(t.balanceAtBirthYears).toBeCloseTo(6, 9);
    expect(t.elapsedAtBirthYears).toBeCloseTo(3, 9);
  });
});

describe('Kendradi Rasi Dasa (VAIA ch. 19)', () => {
  it('E66: seed Le (3 planets vs none in Aq), odd -> forward; Narayana years from VAIA Example 66', () => {
    const t = SignDashaExtendedRegistry.calculate('KENDRADI', E66);
    expect(t.startingSign).toBe(Le);
    expect(t.direction).toBe('FORWARD');
    // Kendras Le, Sc, Aq, Ta; panapharas Vi, Sg, Pi, Ge; apoklimas Li, Cp, Ar, Cn.
    expect(signsOf(t)).toEqual([Le, Sc, Aq, Ta, Vi, Sg, Pi, Ge, Li, Cp, Ar, Cn]);
    expect(yearsOf(t)).toEqual([1, 9, 9, 3, 1, 11, 4, 2, 10, 8, 4, 3]);
    expect(t.totalCycleYears).toBe(65);
    // Second cycle = 12 - first: 11, 3, 3, 9, 11, 1, 8, 10, 2, 4, 8, 9.
    expect(yearsOf(t, 2)).toEqual([11, 3, 3, 9, 11, 1, 8, 10, 2, 4, 8, 9]);
    // First dasa runs in full from birth.
    expect(t.mahadashas[0].startDateIso).toBe(BIRTH.toISOString());
    // Le antardashas (BPHS ch. 51): Le stronger than Aq; fixed, odd -> every 6th onwards:
    // Le, Cp, Ge, Sc, Ar, Vi, Aq, Cn, Sg, Ta, Li, Pi; each 1/12 year.
    expect(t.mahadashas[0].subPeriods!.map((p) => p.signIndex)).toEqual([Le, Cp, Ge, Sc, Ar, Vi, Aq, Cn, Sg, Ta, Li, Pi]);
    expect(t.mahadashas[0].subPeriods![0].nominalYears).toBeCloseTo(1 / 12, 9);
  });

  it('Saturn in the seed makes the order forward; Ketu reverses it (VAIA 19.2(2))', () => {
    // Lagna Ta with Saturn: Ta even would go backward, Saturn makes it forward: Ta, Le, Sc, Aq, Ge, ...
    const sat = buildChart(Ta, 5, [[SATURN, Ta, 10], [SUN, Ar, 1], [MOON, Ar, 2], [MARS, Ar, 3], [MERCURY, Ar, 4], [JUPITER, Ar, 5], [VENUS, Ar, 6], [RAHU, Cn, 1], [KETU, Cp, 1]]);
    expect(signsOf(SignDashaExtendedRegistry.calculate('KENDRADI', sat)).slice(0, 5)).toEqual([Ta, Le, Sc, Aq, Ge]);
    // Lagna Ge with Ketu and the Sun (2 occupants) vs Sg with Rahu (1): seed Ge. Ge odd would go
    // forward; Ketu reverses: Ge, Pi, Sg, Vi, then Ta (2nd counted backward).
    const ket = buildChart(Ge, 5, [[KETU, Ge, 10], [SUN, Ge, 20], [RAHU, Sg, 10], [MOON, Ar, 2], [MARS, Ar, 3], [MERCURY, Ar, 4], [JUPITER, Ar, 5], [VENUS, Ar, 6], [SATURN, Ar, 7]]);
    const t = SignDashaExtendedRegistry.calculate('KENDRADI', ket);
    expect(t.startingSign).toBe(Ge);
    expect(t.direction).toBe('REVERSE');
    expect(signsOf(t).slice(0, 5)).toEqual([Ge, Pi, Sg, Vi, Ta]);
  });
});

describe('Mandooka Dasa (BPHS ch. 46 v. 179-180)', () => {
  it('BPHS example: Lagna Aq stronger, odd -> Aq, Ta, Le, Sc, Pi, Ge, Vi, Sg, Ar, Cn, Li, Cp with Sthira years', () => {
    const c = buildChart(Aq, 5, [[SUN, Aq, 10], [MERCURY, Aq, 12], [JUPITER, Aq, 20], [MOON, Ar, 1], [MARS, Cn, 1], [VENUS, Cp, 1], [SATURN, Ta, 1], [RAHU, Ge, 1], [KETU, Sg, 1]]);
    const t = SignDashaExtendedRegistry.calculate('MANDOOKA', c);
    expect(signsOf(t)).toEqual([Aq, Ta, Le, Sc, Pi, Ge, Vi, Sg, Ar, Cn, Li, Cp]);
    expect(yearsOf(t)).toEqual([8, 8, 8, 8, 9, 9, 9, 9, 7, 7, 7, 7]);
    expect(t.totalCycleYears).toBe(96);
    expect(t.cycles).toBe(1);
  });
  it('E66: seed Le, odd -> onward jumps: Le, Sc, Aq, Ta, Vi, Sg, Pi, Ge, Li, Cp, Ar, Cn', () => {
    const t = SignDashaExtendedRegistry.calculate('MANDOOKA', E66);
    expect(signsOf(t)).toEqual([Le, Sc, Aq, Ta, Vi, Sg, Pi, Ge, Li, Cp, Ar, Cn]);
    expect(yearsOf(t)).toEqual(signsOf(t).map((s) => STHIRA[s]));
  });
});

describe('Trikona Dasa (BPHS ch. 46 v. 183-184)', () => {
  it('BPHS example: Lagna Aq strongest of Aq/Ge/Li -> Aq, Ge, Li, Pi, Cn, Sc, Ar, Le, Sg, Ta, Vi, Cp', () => {
    const c = buildChart(Aq, 5, [[SUN, Aq, 10], [MERCURY, Aq, 12], [JUPITER, Aq, 20], [MOON, Ar, 1], [MARS, Cn, 1], [VENUS, Cp, 1], [SATURN, Ta, 1], [RAHU, Le, 1], [KETU, Aq, 1]]);
    const t = SignDashaExtendedRegistry.calculate('TRIKONA', c);
    expect(signsOf(t)).toEqual([Aq, Ge, Li, Pi, Cn, Sc, Ar, Le, Sg, Ta, Vi, Cp]);
  });
  it('E66: Ge (Rahu) beats Aq and Li on occupants; odd -> forward trines; Chara/Narayana years', () => {
    const t = SignDashaExtendedRegistry.calculate('TRIKONA', E66);
    expect(t.startingSign).toBe(Ge);
    expect(signsOf(t)).toEqual([Ge, Li, Aq, Cn, Sc, Pi, Le, Sg, Ar, Vi, Cp, Ta]);
    expect(yearsOf(t)).toEqual([2, 10, 9, 3, 9, 4, 1, 11, 4, 1, 8, 3]);
  });
});

describe('Drig Dasa (BPHS ch. 46 v. 185-187)', () => {
  it('E66 (Lagna Aq): the BPHS example order with Sthira years, 96 years in all', () => {
    const t = SignDashaExtendedRegistry.calculate('DRIG', E66);
    expect(signsOf(t)).toEqual([Li, Le, Ta, Aq, Sc, Cp, Ar, Cn, Sg, Pi, Ge, Vi]);
    expect(yearsOf(t)).toEqual([7, 8, 8, 8, 8, 7, 7, 7, 9, 9, 9, 9]);
    expect(t.totalCycleYears).toBe(96);
  });
});

describe('Niryana Shoola Dasa (BPHS ch. 46 v. 181-182, VAIA ch. 22)', () => {
  it('VAIA Example 84: Lagna Sc, 2nd Sg stronger, odd -> Sg 9, Cp 7, Aq 8, Pi 9, Ar 7, Ta 8; Ge starts after 48 years', () => {
    const c = buildChart(Sc, 5, [[JUPITER, Sg, 10], [SUN, Ar, 1], [MOON, Ar, 2], [MARS, Ar, 3], [MERCURY, Ar, 4], [VENUS, Ar, 6], [SATURN, Le, 7], [RAHU, Cn, 1], [KETU, Cp, 1]]);
    const t = SignDashaExtendedRegistry.calculate('NIRYANA_SHOOLA', c);
    expect(t.startingSign).toBe(Sg);
    expect(signsOf(t).slice(0, 7)).toEqual([Sg, Cp, Aq, Pi, Ar, Ta, Ge]);
    expect(yearsOf(t).slice(0, 7)).toEqual([9, 7, 8, 9, 7, 8, 9]);
    const ge = t.mahadashas[6];
    expect((new Date(ge.nominalStartDateIso).getTime() - BIRTH.getTime()) / MS_PER_YEAR).toBeCloseTo(48, 6);
  });
  it('BPHS example: Lagna Aq, 2nd Pi stronger, even -> Pi, Aq, Cp, Sg, Sc, Li, Vi, Le, Cn, Ge, Ta, Ar', () => {
    const c = buildChart(Aq, 5, [[MOON, Pi, 10], [SUN, Ar, 1], [MARS, Ar, 3], [MERCURY, Ar, 4], [JUPITER, Ar, 5], [VENUS, Ar, 6], [SATURN, Le, 7], [RAHU, Cn, 1], [KETU, Cp, 1]]);
    const t = SignDashaExtendedRegistry.calculate('NIRYANA_SHOOLA', c);
    expect(signsOf(t)).toEqual([Pi, Aq, Cp, Sg, Sc, Li, Vi, Le, Cn, Ge, Ta, Ar]);
    expect(yearsOf(t)).toEqual(signsOf(t).map((s) => STHIRA[s]));
  });
  it('VAIA Example 88: 8th Cp with Saturn is stronger; Saturn exception -> forward; Vi starts after 63 years', () => {
    // Lagna Ge: 2nd Cn (empty), 8th Cp (Saturn). Cp even would go backward; Saturn makes it Cp, Aq, Pi, Ar, ...
    const c = buildChart(Ge, 5, [[SATURN, Cp, 10], [SUN, Ar, 1], [MOON, Ar, 2], [MARS, Ar, 3], [MERCURY, Ar, 4], [JUPITER, Ar, 5], [VENUS, Ar, 6], [RAHU, Li, 1], [KETU, Ar, 1]]);
    const t = SignDashaExtendedRegistry.calculate('NIRYANA_SHOOLA', c);
    expect(t.startingSign).toBe(Cp);
    expect(t.direction).toBe('FORWARD');
    expect(signsOf(t).slice(0, 9)).toEqual([Cp, Aq, Pi, Ar, Ta, Ge, Cn, Le, Vi]);
    // 7 + 8 + 9 + 7 + 8 + 9 + 7 + 8 = 63 years.
    const vi = t.mahadashas[8];
    expect((new Date(vi.nominalStartDateIso).getTime() - BIRTH.getTime()) / MS_PER_YEAR).toBeCloseTo(63, 6);
  });
});

describe('determinism', () => {
  it('identical inputs give identical outputs', () => {
    for (const s of SIGN_DASHA_EXT_SYSTEMS as readonly SignDashaExtSystem[]) {
      const a = SignDashaExtendedRegistry.calculate(s, E66, { maxLevel: 3, targetDate: '2010-01-01T00:00:00Z' });
      const b = SignDashaExtendedRegistry.calculate(s, E66, { maxLevel: 3, targetDate: '2010-01-01T00:00:00Z' });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    }
  });
});
