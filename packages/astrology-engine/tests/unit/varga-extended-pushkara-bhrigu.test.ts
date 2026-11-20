/**
 * Pushkara Navamsha / Pushkara Bhaga and Bhrigu Bindu (ADR-016 §6, provisional).
 * Tables asserted against the standard published tables (cited in src/varga-extended/pushkara.ts);
 * longitudes hand-worked. Tolerance: 1e-9 deg for arithmetic, exact for flags/indices.
 */
import { describe, it, expect } from 'vitest';
import {
  PUSHKARA_NAVAMSA_TABLE,
  PUSHKARA_BHAGA_TABLE,
  evaluatePushkara,
  pushkaraReferenceTable,
  PushkaraCalculator,
  computeBhriguBinduLongitude,
  bhriguBinduFromLongitudes,
  BhriguBinduCalculator,
} from '../../src/varga-extended';
import { BirthDetails } from '../../src/input/birth-details';

describe('Pushkara Navamsha table', () => {
  it('matches the published table (fire 7,9; earth 3,5; air 6,8; water 1,3)', () => {
    for (const s of [1, 5, 9]) expect(PUSHKARA_NAVAMSA_TABLE[s]).toEqual([7, 9]);
    for (const s of [2, 6, 10]) expect(PUSHKARA_NAVAMSA_TABLE[s]).toEqual([3, 5]);
    for (const s of [3, 7, 11]) expect(PUSHKARA_NAVAMSA_TABLE[s]).toEqual([6, 8]);
    for (const s of [4, 8, 12]) expect(PUSHKARA_NAVAMSA_TABLE[s]).toEqual([1, 3]);
  });
  it('every pushkara navamsa falls in a benefic sign (Ta, Cn, Vi, Li, Sg, Pi)', () => {
    const benefic = new Set([2, 4, 6, 7, 9, 12]);
    for (const row of pushkaraReferenceTable()) {
      for (const n of row.pushkaraNavamsas) expect(benefic.has(n.navamsaSign)).toBe(true);
    }
    // Published navamsa signs: fire -> Libra, Sagittarius; earth -> Pisces, Taurus; air -> Pisces, Taurus; water -> Cancer, Virgo
    const t = pushkaraReferenceTable();
    expect(t[0].pushkaraNavamsas.map((x) => x.navamsaSign)).toEqual([7, 9]);
    expect(t[1].pushkaraNavamsas.map((x) => x.navamsaSign)).toEqual([12, 2]);
    expect(t[2].pushkaraNavamsas.map((x) => x.navamsaSign)).toEqual([12, 2]);
    expect(t[3].pushkaraNavamsas.map((x) => x.navamsaSign)).toEqual([4, 6]);
    expect(t[0].pushkaraNavamsas[0].fromDegree).toBeCloseTo(20, 9); // 7th navamsa: 6 x 3.3333 = 20
    expect(t[0].pushkaraNavamsas[0].toDegree).toBeCloseTo(23 + 1 / 3, 9);
  });
  it('flags bodies at hand-worked longitudes', () => {
    // Aries 20 deg: 20*9/30 = 6 -> 7th navamsa (Libra) -> pushkara
    const a = evaluatePushkara('Ascendant', 20);
    expect(a.navamsaNumber).toBe(7);
    expect(a.navamsaSign).toBe(7);
    expect(a.inPushkaraNavamsa).toBe(true);
    expect(evaluatePushkara('Ascendant', 19.99).inPushkaraNavamsa).toBe(false); // 6th navamsa
    // Taurus 7 deg (lon 37): 7*0.3 = 2.1 -> 3rd navamsa (Pisces) -> pushkara
    expect(evaluatePushkara('Ascendant', 37).inPushkaraNavamsa).toBe(true);
    // Libra 17 deg (lon 197): 5.1 -> 6th navamsa (Pisces) -> pushkara
    expect(evaluatePushkara('Ascendant', 197).navamsaSign).toBe(12);
    expect(evaluatePushkara('Ascendant', 197).inPushkaraNavamsa).toBe(true);
    // Cancer 1 deg (lon 91): 1st navamsa (Cancer) -> pushkara; Cancer 4 deg -> 2nd (Leo) -> not
    expect(evaluatePushkara('Ascendant', 91).inPushkaraNavamsa).toBe(true);
    expect(evaluatePushkara('Ascendant', 94).inPushkaraNavamsa).toBe(false);
  });
});

describe('Pushkara Bhaga table', () => {
  it('matches the published table', () => {
    expect([...PUSHKARA_BHAGA_TABLE]).toEqual([21, 14, 18, 8, 19, 9, 24, 11, 23, 14, 19, 9]);
  });
  it('flags the bhaga-th degree [bhaga-1, bhaga)', () => {
    // Aries bhaga 21 -> 20.5 deg is within the 21st degree
    const x = evaluatePushkara('Ascendant', 20.5);
    expect(x.pushkaraBhaga).toBe(21);
    expect(x.inPushkaraBhaga).toBe(true);
    expect(x.distanceFromBhaga).toBeCloseTo(-0.5, 9);
    expect(evaluatePushkara('Ascendant', 21).inPushkaraBhaga).toBe(false); // 22nd degree begins
    // Libra bhaga 24 -> lon 180 + 23.5 = 203.5
    expect(evaluatePushkara('Ascendant', 203.5).inPushkaraBhaga).toBe(true);
    // Cancer bhaga 8 -> lon 97.5
    expect(evaluatePushkara('Ascendant', 97.5).inPushkaraBhaga).toBe(true);
    expect(evaluatePushkara('Ascendant', 96.9).inPushkaraBhaga).toBe(false);
  });
});

describe('Bhrigu Bindu = Rahu + ((Moon - Rahu) mod 360)/2', () => {
  it('hand-worked arithmetic', () => {
    expect(computeBhriguBinduLongitude(100, 40)).toBeCloseTo(70, 9); // (100+40)/2 = 70
    expect(computeBhriguBinduLongitude(10, 300)).toBeCloseTo(335, 9); // (10+360+300)/2 = 335
    expect(computeBhriguBinduLongitude(50, 280)).toBeCloseTo(345, 9); // (50+360+280)/2 = 345
    expect(computeBhriguBinduLongitude(200, 10)).toBeCloseTo(105, 9); // arc 190 -> 10 + 95 = 105
  });
  it('reports sign, nakshatra and the shorter-arc alternative', () => {
    const r = bhriguBinduFromLongitudes(100, 40);
    // 70 deg = Gemini (3) 10 deg; nakshatra 70/13.3333 = 5.25 -> 6th Ardra; pada floor(70/3.3333)=21 -> 21 mod 4 + 1 = 2
    expect(r.rashiIndex).toBe(3);
    expect(r.degreeInSign).toBeCloseTo(10, 9);
    expect(r.nakshatra).toBe('Ardra');
    expect(r.pada).toBe(2);
    expect(r.shorterArcLongitude).toBeCloseTo(70, 9);
    expect(r.provisional).toBe(true);
    // Rahu-to-Moon arc 190 > 180: the shorter-arc midpoint is 180 deg away: 200 + 170/2 = 285
    const s = bhriguBinduFromLongitudes(200, 10);
    expect(s.arcRahuToMoon).toBeCloseTo(190, 9);
    expect(s.shorterArcLongitude).toBeCloseTo(285, 9);
  });
  it('chart-based calculators use Moon and Rahu from ChartCalculator', async () => {
    const details: BirthDetails = {
      date: { year: 1990, month: 5, day: 15 },
      time: { hour: 14, minute: 30, second: 0 },
      timezone: 'Asia/Kolkata',
      latitude: 28.6139,
      longitude: 77.209,
    };
    const bb = await new BhriguBinduCalculator().calculate(details);
    expect(bb.longitude).toBeCloseTo(computeBhriguBinduLongitude(bb.moonLongitude, bb.rahuLongitude), 9);
    const pk = await new PushkaraCalculator().calculate(details);
    expect(pk.bodies[0].body).toBe('Ascendant');
    expect(pk.bodies.length).toBeGreaterThanOrEqual(10);
    expect(pk.table).toHaveLength(12);
  });
});
