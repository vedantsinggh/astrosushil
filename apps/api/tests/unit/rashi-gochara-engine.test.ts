/**
 * Deterministic Rashi Bhavishya gochara engine.
 *
 * Hand-checked reference facts (sidereal / Lahiri, as printed in standard Indian panchangs):
 * - 2026-11-18 is a Wednesday (Budhavara), Shukla paksha (Amavasya was 2026-11-09, Diwali).
 * - On 2026-11-18: Sun in Vrischika (Scorpio; Vrischika Sankranti 2026-11-16), Jupiter in Simha (Leo;
 *   entered late Oct 2026), Saturn in Meena (Pisces; since 2025-03-29), Rahu in Kumbha (Aquarius;
 *   since 2025-05-18) and Ketu in Simha (Leo).
 * - Makar Sankranti 2026: the Sun enters Makara (Capricorn) on 2026-01-14 (IST afternoon).
 * Houses are counted inclusively from the Moon sign (whole signs).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  FAVOURABLE_HOUSES_FROM_MOON,
  gocharaClass,
  houseFromSign,
} from '../../src/modules/rashi-bhavishya/rashi-gochara.tables';
import {
  DailySky,
  RashiGocharaEngine,
  addDays,
  factsForRashi,
  istDateOf,
} from '../../src/modules/rashi-bhavishya/rashi-gochara.engine';

describe('gochara tables', () => {
  it('counts houses inclusively from the Moon sign', () => {
    expect(houseFromSign(1, 1)).toBe(1);
    expect(houseFromSign(1, 12)).toBe(12);
    expect(houseFromSign(12, 1)).toBe(2);
    expect(houseFromSign(5, 4)).toBe(12);
    expect(houseFromSign(10, 4)).toBe(7);
    expect(() => houseFromSign(0, 1)).toThrow(RangeError);
    expect(() => houseFromSign(1, 13)).toThrow(RangeError);
  });

  it('uses the Phaladeepika ch. 26 favourable-house table', () => {
    expect(FAVOURABLE_HOUSES_FROM_MOON.SUN).toEqual([3, 6, 10, 11]);
    expect(FAVOURABLE_HOUSES_FROM_MOON.MOON).toEqual([1, 3, 6, 7, 10, 11]);
    expect(FAVOURABLE_HOUSES_FROM_MOON.MARS).toEqual([3, 6, 11]);
    expect(FAVOURABLE_HOUSES_FROM_MOON.MERCURY).toEqual([2, 4, 6, 8, 10, 11]);
    expect(FAVOURABLE_HOUSES_FROM_MOON.JUPITER).toEqual([2, 5, 7, 9, 11]);
    expect(FAVOURABLE_HOUSES_FROM_MOON.VENUS).toEqual([1, 2, 3, 4, 5, 8, 9, 11, 12]);
    expect(FAVOURABLE_HOUSES_FROM_MOON.SATURN).toEqual([3, 6, 11]);
    expect(FAVOURABLE_HOUSES_FROM_MOON.RAHU).toEqual([3, 6, 11]);
    expect(FAVOURABLE_HOUSES_FROM_MOON.KETU).toEqual([3, 6, 11]);
    expect(gocharaClass('JUPITER', 5)).toBe('favourable');
    expect(gocharaClass('SATURN', 12)).toBe('demanding');
    expect(gocharaClass('VENUS', 12)).toBe('favourable');
    expect(gocharaClass('SUN', 1)).toBe('demanding');
  });

  it('derives IST dates without wall-clock dependence', () => {
    expect(istDateOf(new Date('2026-11-17T18:29:00Z'))).toBe('2026-11-17');
    expect(istDateOf(new Date('2026-11-17T18:31:00Z'))).toBe('2026-11-18');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('RashiGocharaEngine — 2026-11-18', () => {
  const engine = new RashiGocharaEngine();
  let sky: DailySky;

  beforeAll(async () => {
    sky = await engine.computeDailySky('2026-11-18');
  });

  const signOf = (planet: string) => sky.positions.find((p) => p.planet === planet)!.sign.englishName;

  it('places the slow planets and the Sun in the published signs', () => {
    expect(signOf('SUN')).toBe('Scorpio');
    expect(signOf('JUPITER')).toBe('Leo');
    expect(signOf('SATURN')).toBe('Pisces');
    expect(signOf('RAHU')).toBe('Aquarius');
    expect(signOf('KETU')).toBe('Leo');
    expect(sky.positions).toHaveLength(9);
  });

  it('uses sunrise at Ujjain on the IST date as the reference instant', () => {
    const rise = new Date(sky.reference.sunriseIso);
    // Ujjain sunrise in mid-November is about 06:40–06:45 IST (01:10–01:15 UTC).
    expect(rise.toISOString().slice(0, 10)).toBe('2026-11-18');
    expect(rise.getUTCHours()).toBe(1);
    expect(rise.getUTCMinutes()).toBeGreaterThanOrEqual(5);
    expect(rise.getUTCMinutes()).toBeLessThanOrEqual(20);
    expect(sky.reference.location.name).toBe('Ujjain');
    expect(new Date(sky.reference.nextSunriseIso).getTime()).toBeGreaterThan(rise.getTime());
  });

  it('reports the panchang of the day: Wednesday, Shukla paksha', () => {
    expect(sky.panchang.vara.name).toBe('Budhavara');
    expect(sky.panchang.vara.english).toBe('Wednesday');
    expect(sky.panchang.tithi.paksha).toBe('Shukla');
    expect(sky.panchang.tithi.label).toMatch(/^Shukla /);
    expect(sky.panchang.nakshatra.name.length).toBeGreaterThan(0);
  });

  it('counts houses and classifications from Aries (Mesha)', () => {
    const facts = factsForRashi(sky, 1);
    const p = (name: string) => facts.planets.find((x) => x.name === name)!;
    expect(p('Saturn').house).toBe(12);
    expect(p('Saturn').classification).toBe('demanding');
    expect(p('Jupiter').house).toBe(5);
    expect(p('Jupiter').classification).toBe('favourable');
    expect(p('Rahu').house).toBe(11);
    expect(p('Rahu').classification).toBe('favourable');
    expect(p('Sun').house).toBe(8);
    expect(p('Sun').classification).toBe('demanding');
    expect(facts.tally.favourable + facts.tally.demanding).toBe(9);
    expect(facts.tally.favourablePlanets).toEqual(facts.planets.filter((x) => x.classification === 'favourable').map((x) => x.name));
    expect(facts.method.vedha).toBe('not-applied');
  });

  it('counts the same sky differently for Pisces (Meena)', () => {
    const facts = factsForRashi(sky, 12);
    const saturn = facts.planets.find((x) => x.planet === 'SATURN')!;
    const jupiter = facts.planets.find((x) => x.planet === 'JUPITER')!;
    expect(saturn.house).toBe(1);
    expect(jupiter.house).toBe(6);
    expect(jupiter.classification).toBe('demanding');
  });

  it('is deterministic for identical input', async () => {
    const again = await new RashiGocharaEngine().computeDailySky('2026-11-18');
    expect(again).toEqual(sky);
    expect(factsForRashi(again, 7)).toEqual(factsForRashi(sky, 7));
  });

  it('rejects an unknown rashi index', () => {
    expect(() => factsForRashi(sky, 13)).toThrow();
  });
});

describe('RashiGocharaEngine — events', () => {
  const engine = new RashiGocharaEngine();

  it('detects Makar Sankranti on 2026-01-14 as a Sun ingress Dhanu → Makara today', async () => {
    const sky = await engine.computeDailySky('2026-01-14');
    const ingress = sky.events.find((e) => e.planet === 'SUN' && e.type === 'SIGN_INGRESS');
    expect(ingress).toBeDefined();
    expect(ingress!.fromSign!.sanskritName).toBe('Dhanu');
    expect(ingress!.toSign!.sanskritName).toBe('Makara');
    expect(ingress!.dateIst).toBe('2026-01-14');
    expect(ingress!.withinDay).toBe(true);
    // The Sun is still in Dhanu at sunrise and changes sign later that day.
    const facts = factsForRashi(sky, 10);
    const sun = facts.planets.find((p) => p.planet === 'SUN')!;
    expect(sun.sign.englishName).toBe('Sagittarius');
    expect(sun.house).toBe(12);
    expect(sun.changesTo?.sign.englishName).toBe('Capricorn');
    expect(sun.changesTo?.house).toBe(1);
  });

  it('records a Moon sign change within the day, consistent with the Moon\'s ~13°/day motion', async () => {
    // At sunrise on 2026-11-18 the Moon is at ~7.8° Aquarius, so it reaches Pisces about 1.7 days later (night of 19 Nov IST).
    const day18 = await engine.computeDailySky('2026-11-18');
    expect(day18.events.some((e) => e.planet === 'MOON')).toBe(false);
    const day19 = await engine.computeDailySky('2026-11-19');
    const moonChange = day19.events.find((e) => e.planet === 'MOON' && e.type === 'SIGN_INGRESS');
    expect(moonChange?.toSign?.englishName).toBe('Pisces');
    expect(moonChange?.withinDay).toBe(true);
    const facts = factsForRashi(day19, 11);
    expect(facts.moon.house).toBe(1);
    expect(facts.moon.changesTo?.house).toBe(2);
    expect(facts.moon.changesTo?.classification).toBe('demanding');
  });

  it('refuses malformed dates instead of guessing', () => {
    expect(() => engine.sunriseFor('2026-13-01')).toThrow();
    expect(() => engine.sunriseFor('18-11-2026')).toThrow();
  });
});
