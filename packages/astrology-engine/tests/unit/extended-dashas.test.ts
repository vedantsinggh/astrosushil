import { describe, it, expect } from 'vitest';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { MS_PER_YEAR } from '../../src/dasha/dasha-calculator';
import {
  YoginiDashaCalculator,
  YOGINIS,
  getStartingYoginiNumber,
  CharaDashaCalculator,
  NarayanaDashaCalculator,
  NARAYANA_PROGRESSION_OFFSETS,
  getNarayanaProgressionType,
  KalachakraDashaCalculator,
  getKalachakraPadaSequence,
  getKalachakraParamayus,
  isSavyaNakshatra,
  computeSignDashaYears,
  selectSignLord,
  compareSignStrength,
  DashaRegistry,
} from '../../src/dasha/index';

/**
 * Worked examples for the four dasha systems added on 2026-11-18. Every expected number below
 * is derived by hand from the rule in docs/report-system/decisions/engine-extensions.md; the
 * derivation is written next to each assertion.
 */

const BIRTH = new Date('2000-01-01T00:00:00.000Z');

type Placement = [PlanetSymbol, number /* sign 1..12 */, number /* degree in sign */];

function buildChart(ascSign: number, ascDeg: number, placements: Placement[]): AstroChart {
  const planets: any = {};
  for (const [p, sign, deg] of placements) {
    planets[p] = {
      planet: p,
      longitude: (sign - 1) * 30 + deg,
      rashiIndex: sign,
      degreeInRashi: deg,
      speedLongitude: 1,
      isRetrograde: false,
    };
  }
  return {
    metadata: {
      engineVersion: '0.1.0',
      calculationTimestampIso: '2000-01-01T00:00:00.000Z',
      providerName: 'Test',
      providerVersion: '1',
      config: {} as any,
      normalizedTime: { utcIsoString: BIRTH.toISOString(), julianDayUT: 2451544.5, timezoneOffsetMinutes: 0 } as any,
    },
    birthDetails: {} as any,
    ascendant: { longitude: (ascSign - 1) * 30 + ascDeg, rashiIndex: ascSign } as any,
    planets,
  };
}

/**
 * Reference chart A (fictional, chosen to exercise every Jaimini rule):
 *   Lagna Aries 15. Sun Aries 10 (exalted), Moon Cancer 5 (own), Mars Leo 20,
 *   Mercury Pisces 3 (debilitated), Jupiter Capricorn 8 (debilitated), Venus Pisces 12 (exalted),
 *   Saturn Libra 25 (exalted), Rahu Gemini 10, Ketu Sagittarius 10.
 */
const CHART_A = buildChart(1, 15, [
  [PlanetSymbol.SUN, 1, 10],
  [PlanetSymbol.MOON, 4, 5],
  [PlanetSymbol.MARS, 5, 20],
  [PlanetSymbol.MERCURY, 12, 3],
  [PlanetSymbol.JUPITER, 10, 8],
  [PlanetSymbol.VENUS, 12, 12],
  [PlanetSymbol.SATURN, 7, 25],
  [PlanetSymbol.RAHU, 3, 10],
  [PlanetSymbol.KETU, 9, 10],
]);

describe('Yogini Dasha (BPHS)', () => {
  const calc = new YoginiDashaCalculator();

  it('maps Janma Nakshatra to the starting Yogini by (n + 3) mod 8', () => {
    expect(getStartingYoginiNumber(6)).toBe(1);  // Ardra: 9 mod 8 = 1 -> Mangala
    expect(getStartingYoginiNumber(1)).toBe(4);  // Ashwini: 4 -> Bhramari
    expect(getStartingYoginiNumber(8)).toBe(3);  // Pushya: 11 mod 8 = 3 -> Dhanya
    expect(getStartingYoginiNumber(21)).toBe(8); // Uttara Ashadha: 24 mod 8 = 0 -> Sankata
    expect(getStartingYoginiNumber(27)).toBe(6); // Revati: 30 mod 8 = 6 -> Ulka
    expect(YOGINIS.reduce((s, y) => s + y.number, 0)).toBe(36);
  });

  it('worked example: Moon at the middle of Ardra -> Mangala with 0.5 year balance', () => {
    // Ardra spans 66.6667-80.0; its midpoint 73.3333 leaves half of Mangala's 1 year.
    const tree = calc.calculateYoginiDasha(73.333333333333, BIRTH, { maxLevel: 3, targetDate: '2001-06-01T00:00:00Z' });
    expect(tree.startingYogini).toBe('Mangala');
    expect(tree.startingLord).toBe(PlanetSymbol.MOON);
    expect(tree.balanceAtBirthYears).toBeCloseTo(0.5, 9);
    expect(tree.mahadashas.map((m) => m.yoginiName)).toEqual([
      'Mangala', 'Pingala', 'Dhanya', 'Bhramari', 'Bhadrika', 'Ulka', 'Siddha', 'Sankata',
    ]);
    expect(tree.mahadashas.map((m) => m.nominalYears)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    // Pingala MD (2 y): Antardashas start from Pingala; Pingala/Pingala = 2 x 2 / 36 years.
    const pingala = tree.mahadashas[1];
    expect(pingala.subPeriods!.map((a) => a.yoginiName)[0]).toBe('Pingala');
    expect(pingala.subPeriods!.map((a) => a.yoginiName)[7]).toBe('Mangala');
    expect(pingala.subPeriods![0].nominalYears).toBeCloseTo(4 / 36, 12);
    expect(pingala.subPeriods!.reduce((s, a) => s + a.nominalYears, 0)).toBeCloseTo(2, 12);
    // Pratyantar inside Pingala/Pingala starts from Pingala too: 4/36 x 2/36.
    expect(pingala.subPeriods![0].subPeriods![0].nominalYears).toBeCloseTo((4 / 36) * (2 / 36), 12);

    // Birth MD: half elapsed, so its nominal start is 0.5 y before birth.
    const md1 = tree.mahadashas[0];
    expect(md1.isBirthDasha).toBe(true);
    expect(md1.startDateIso).toBe(BIRTH.toISOString());
    expect(new Date(md1.nominalStartDateIso).getTime()).toBe(Math.round(BIRTH.getTime() - 0.5 * MS_PER_YEAR));
    // Mangala/Mangala (1/36 y) and Mangala/Pingala (2/36 y) ... up to 0.5 y are pre-birth.
    expect(md1.subPeriods![0].isBeforeBirth).toBe(true);
    expect(md1.subPeriods!).toHaveLength(8);

    // 2001-06-01 is 1.41 y after birth -> inside Pingala MD (0.5 .. 2.5 y).
    expect(tree.currentPeriod?.mahadasha.label).toBe('Pingala');
    expect(tree.currentPeriod?.antardasha).toBeDefined();
    expect(tree.currentPeriod?.pratyantardasha).toBeDefined();
  });

  it('supports multiple 36-year cycles', () => {
    const tree = calc.calculateYoginiDasha(73.333333333333, BIRTH, { maxLevel: 1, cycleCount: 2 });
    expect(tree.mahadashas).toHaveLength(16);
    expect(tree.mahadashas[8].yoginiName).toBe('Mangala');
  });
});

describe('Jaimini sign-dasha shared rules', () => {
  it('selects the stronger co-lord of Scorpio and Aquarius', () => {
    // Scorpio: Mars in Leo (fixed), Ketu in Sagittarius (dual); no conjunctions, none exalted
    // -> dual beats fixed -> Ketu.
    expect(selectSignLord(CHART_A, 8).lord).toBe(PlanetSymbol.KETU);
    // Aquarius: Saturn exalted in Libra vs Rahu in Gemini -> Saturn.
    expect(selectSignLord(CHART_A, 11).lord).toBe(PlanetSymbol.SATURN);
    // A lord occupying the sign itself hands over to the other lord.
    const c = buildChart(1, 0, [[PlanetSymbol.MARS, 8, 5], [PlanetSymbol.KETU, 2, 5]]);
    expect(selectSignLord(c, 8).lord).toBe(PlanetSymbol.KETU);
  });

  it('counts sign to lord, applies exaltation/debilitation, own sign = 12, floors 0 at 1', () => {
    // Taurus forward to Venus in Pisces: Ta..Pi = 11 signs -> 10, exalted +1 -> 11.
    const ta = computeSignDashaYears(CHART_A, 2, 'FORWARD');
    expect([ta.countInclusive, ta.baseYears, ta.adjustment, ta.years]).toEqual([11, 10, 1, 11]);
    // Cancer: Moon in Cancer -> 12.
    expect(computeSignDashaYears(CHART_A, 4, 'REVERSE').years).toBe(12);
    // Sagittarius forward to Jupiter in Capricorn: count 2 -> 1, debilitated -1 -> 0 -> floored 1.
    const sg = computeSignDashaYears(CHART_A, 9, 'FORWARD');
    expect(sg.years).toBe(1);
    expect(sg.flooredAtOne).toBe(true);
    // Second cycle = 12 - first cycle.
    expect(computeSignDashaYears(CHART_A, 2, 'FORWARD', 2).years).toBe(1);
  });
});

describe('Chara Dasha (K.N. Rao)', () => {
  const calc = new CharaDashaCalculator();

  it('worked example on reference chart A', () => {
    const tree = calc.calculateForChart(CHART_A, { maxLevel: 2 });
    // 9th from Aries = Sagittarius (odd-footed) -> forward from Aries.
    expect(tree.startingSign).toBe(1);
    expect(tree.direction).toBe('FORWARD');
    expect(tree.periods.map((p) => p.signIndex)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // Odd-footed signs (Ar Ta Ge Li Sc Sg) count forward, others in reverse:
    //  Ar->Mars Le  fwd 5 -> 4             Ta->Venus Pi fwd 11 -> 10 +1 = 11
    //  Ge->Merc Pi  fwd 10 -> 9 -1 = 8     Cn own sign = 12
    //  Le->Sun Ar   rev 5 -> 4 +1 = 5      Vi->Merc Pi rev 7 -> 6 -1 = 5
    //  Li->Venus Pi fwd 6 -> 5 +1 = 6      Sc->Ketu Sg fwd 2 -> 1
    //  Sg->Jup Cp   fwd 2 -> 1 -1 -> 1     Cp->Sat Li rev 4 -> 3 +1 = 4
    //  Aq->Sat Li   rev 5 -> 4 +1 = 5      Pi->Jup Cp rev 3 -> 2 -1 = 1
    expect(tree.periods.map((p) => p.nominalYears)).toEqual([4, 11, 8, 12, 5, 5, 6, 1, 1, 4, 5, 1]);
    expect(tree.totalCycleYears).toBe(63);

    // Antardashas of Aries (4 y): 12 x 1/3 y, from Taurus round to Aries last.
    const ar = tree.periods[0];
    expect(ar.subPeriods!.map((a) => a.signIndex)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1]);
    expect(ar.subPeriods![0].nominalYears).toBeCloseTo(4 / 12, 12);
    // No balance: first dasha starts at birth.
    expect(ar.startDateIso).toBe(BIRTH.toISOString());
  });

  it('runs in reverse when the 9th from Lagna is even-footed', () => {
    // Lagna Taurus -> 9th Capricorn (even-footed) -> reverse.
    const c = buildChart(2, 10, CHART_A_PLACEMENTS());
    const tree = calc.calculateForChart(c, { maxLevel: 1 });
    expect(tree.direction).toBe('REVERSE');
    expect(tree.periods.slice(0, 3).map((p) => p.signIndex)).toEqual([2, 1, 12]);
  });
});

function CHART_A_PLACEMENTS(): Placement[] {
  return Object.values(CHART_A.planets).map((p: any) => [p.planet, p.rashiIndex, p.degreeInRashi]);
}

describe('Narayana Dasha', () => {
  const calc = new NarayanaDashaCalculator();

  it('progression patterns for movable, fixed and dual signs', () => {
    expect(getNarayanaProgressionType(1)).toBe('MOVABLE_REGULAR');
    expect(getNarayanaProgressionType(2)).toBe('FIXED_SIXTH');
    expect(getNarayanaProgressionType(3)).toBe('DUAL_TRINE');
    const apply = (start: number, type: keyof typeof NARAYANA_PROGRESSION_OFFSETS) =>
      NARAYANA_PROGRESSION_OFFSETS[type].map((o) => ((start - 1 + o) % 12) + 1);
    // Taurus, every 6th sign: Ta Li Pi Le Cp Ge Sc Ar Vi Aq Cn Sg
    expect(apply(2, 'FIXED_SIXTH')).toEqual([2, 7, 12, 5, 10, 3, 8, 1, 6, 11, 4, 9]);
    // Gemini, trines: Ge Li Aq, Cn Sc Pi, Le Sg Ar, Vi Cp Ta
    expect(apply(3, 'DUAL_TRINE')).toEqual([3, 7, 11, 4, 8, 12, 5, 9, 1, 6, 10, 2]);
  });

  it('worked example on reference chart A', () => {
    const tree = calc.calculateForChart(CHART_A, { maxLevel: 2 });
    // Aries (Sun) vs Libra (Saturn): 1 occupant each. Association: Mars in Leo (fixed) aspects
    // Aries; nothing of Jupiter/Mercury/Venus reaches Libra -> Aries stronger.
    expect(tree.startingSignEvidence.chosen).toBe(1);
    expect(tree.startingSignEvidence.decidingRule).toContain('Jupiter, Mercury');
    expect(tree.startingSign).toBe(1);
    expect(tree.direction).toBe('FORWARD'); // odd sign, no Saturn/Ketu in it
    expect(tree.progressionType).toBe('MOVABLE_REGULAR');
    // Counting forward from odd signs, reverse from even signs:
    //  Ar->Le fwd 5 -> 4         Ta->Pi rev 3 -> 2 +1 = 3   Ge->Pi fwd 10 -> 9 -1 = 8
    //  Cn own = 12               Le->Ar fwd 9 -> 8 +1 = 9   Vi->Pi rev 7 -> 6 -1 = 5
    //  Li->Pi fwd 6 -> 5 +1 = 6  Sc->Ketu Sg rev 12 -> 11   Sg->Cp fwd 2 -> 1 -1 -> 1
    //  Cp->Li rev 4 -> 3 +1 = 4  Aq->Sat Li fwd 9 -> 8 +1 = 9   Pi->Cp rev 3 -> 2 -1 = 1
    expect(tree.periods.map((p) => p.nominalYears)).toEqual([4, 3, 8, 12, 9, 5, 6, 11, 1, 4, 9, 1]);
    expect(tree.totalCycleYears).toBe(73);
    // Antardashas start with the Mahadasha sign itself and follow the same pattern.
    expect(tree.periods[1].subPeriods!.map((a) => a.signIndex)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1]);
  });

  it('Saturn in the starting sign forces forward order; Ketu reverses it', () => {
    // Lagna Taurus (even) with Saturn in it and 2 occupants -> Taurus starts, forward, every 6th.
    const withSaturn = buildChart(2, 10, [
      [PlanetSymbol.SATURN, 2, 5], [PlanetSymbol.MOON, 2, 8], [PlanetSymbol.SUN, 5, 1],
      [PlanetSymbol.MARS, 1, 1], [PlanetSymbol.MERCURY, 6, 1], [PlanetSymbol.JUPITER, 9, 1],
      [PlanetSymbol.VENUS, 7, 1], [PlanetSymbol.RAHU, 4, 1], [PlanetSymbol.KETU, 10, 1],
    ]);
    const t1 = calc.calculateForChart(withSaturn, { maxLevel: 1 });
    expect(t1.startingSign).toBe(2);
    expect(t1.direction).toBe('FORWARD');
    expect(t1.periods.slice(0, 3).map((p) => p.signIndex)).toEqual([2, 7, 12]);

    // Lagna Aries (odd) holding Ketu and one more planet -> Aries starts, reversed.
    const withKetu = buildChart(1, 10, [
      [PlanetSymbol.KETU, 1, 5], [PlanetSymbol.MOON, 1, 8], [PlanetSymbol.SUN, 5, 1],
      [PlanetSymbol.MARS, 2, 1], [PlanetSymbol.MERCURY, 6, 1], [PlanetSymbol.JUPITER, 9, 1],
      [PlanetSymbol.VENUS, 3, 1], [PlanetSymbol.RAHU, 7, 1], [PlanetSymbol.SATURN, 10, 1],
    ]);
    const t2 = calc.calculateForChart(withKetu, { maxLevel: 1 });
    expect(t2.startingSign).toBe(1);
    expect(t2.direction).toBe('REVERSE');
    expect(t2.periods.slice(0, 3).map((p) => p.signIndex)).toEqual([1, 12, 11]);
  });

  it('sign strength rules are applied in order', () => {
    // Cancer (Moon) vs Capricorn (Jupiter): 1 occupant each; association 1 each (Moon owns
    // Cancer, Jupiter sits in Capricorn); no exalted occupants; both movable. Next rule: Cancer's
    // lord Moon is in Cancer (same oddity), Capricorn's lord Saturn is in Libra (odd) -> Capricorn.
    const cmp = compareSignStrength(CHART_A, 4, 10);
    expect(cmp.winner).toBe('B');
    expect(cmp.decidingRule).toBe('Sign lord occupies a sign of different oddity');
    // Aries (Sun) vs Taurus (empty): occupants decide.
    expect(compareSignStrength(CHART_A, 1, 2)).toMatchObject({ winner: 'A', decidingRule: 'More planets occupy the sign' });
  });
});

describe('Kalachakra Dasha (BPHS)', () => {
  const calc = new KalachakraDashaCalculator();

  it('groups nakshatras into Savya and Apasavya triads', () => {
    const savya = [1, 2, 3, 7, 8, 9, 13, 14, 15, 19, 20, 21, 25, 26, 27];
    for (let n = 1; n <= 27; n++) expect(isSavyaNakshatra(n)).toBe(savya.includes(n));
  });

  it('reproduces BPHS pada sequences and paramayus', () => {
    expect(getKalachakraPadaSequence(0)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);        // Ashwini 1
    expect(getKalachakraPadaSequence(1)).toEqual([10, 11, 12, 8, 7, 6, 4, 5, 3]);     // Ashwini 2
    expect(getKalachakraPadaSequence(4)).toEqual([8, 7, 6, 4, 5, 3, 2, 1, 12]);       // Bharani 1
    expect(getKalachakraPadaSequence(8)).toEqual(getKalachakraPadaSequence(0));       // Krittika 1 = Ashwini 1
    expect(getKalachakraPadaSequence(12)).toEqual([9, 10, 11, 12, 1, 2, 3, 5, 4]);    // Rohini 1
    expect(getKalachakraPadaSequence(16)).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4]);    // Mrigashira 1
    for (let p = 0; p < 108; p++) {
      const nak = Math.floor(p / 4) + 1;
      const expected = isSavyaNakshatra(nak) ? [100, 85, 83, 86] : [86, 83, 85, 100];
      expect(getKalachakraParamayus(p)).toBe(expected[p % 4]);
    }
  });

  it('worked example: Moon 25% into Ashwini pada 1', () => {
    // Paramayus 100 -> 25 y elapsed. Ar 7 + Ta 16 = 23, so Gemini (9 y) runs with 2 y elapsed,
    // balance 7 y. Following dashas: Cn 21, Le 5, Vi 9, Li 16, Sc 7, Sg 10, then Ashwini 2: Cp, Aq.
    const tree = calc.calculateKalachakraDasha(0.25 * (360 / 108), BIRTH, { maxLevel: 2 });
    expect(tree.directionType).toBe('SAVYA');
    expect(tree.nakshatraName).toBe('Ashwini');
    expect(tree.pada).toBe(1);
    expect(tree.totalPadaYears).toBe(100);
    expect(tree.elapsedInPadaYears).toBeCloseTo(25, 9);
    expect(tree.balanceAtBirthYears).toBeCloseTo(7, 9);
    expect(tree.dehaRashi.signIndex).toBe(1);
    expect(tree.jeevaRashi.signIndex).toBe(9);
    expect(tree.mahadashas.map((m) => m.signIndex)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(tree.mahadashas.map((m) => m.nominalYears)).toEqual([9, 21, 5, 9, 16, 7, 10, 4, 4]);
    expect(tree.mahadashas[0].durationYears).toBeCloseTo(7, 6);
    expect(tree.mahadashas[6].isJeeva).toBe(true);  // Sagittarius closes Ashwini 1
    expect(tree.mahadashas[7].isDeha).toBe(true);   // Capricorn opens Ashwini 2

    // Cancer MD (21 y): Antardashas Cn Le Vi Li Sc Sg Ar Ta Ge, each 21 x signYears / 100.
    const cn = tree.mahadashas[1];
    expect(cn.subPeriods!.map((a) => a.signIndex)).toEqual([4, 5, 6, 7, 8, 9, 1, 2, 3]);
    expect(cn.subPeriods![0].nominalYears).toBeCloseTo(4.41, 12);
    expect(cn.subPeriods![8].nominalYears).toBeCloseTo(1.89, 12);
  });

  it('Apasavya Deha/Jeeva convention is configurable', () => {
    const rohini1 = 40 + 0.1; // Rohini pada 1: Sg Cp Aq Pi Ar Ta Ge Le Cn
    const reversed = calc.calculateKalachakraDasha(rohini1, BIRTH, { maxLevel: 1 });
    expect(reversed.directionType).toBe('APASAVYA');
    expect(reversed.dehaRashi.signIndex).toBe(4);  // last sign
    expect(reversed.jeevaRashi.signIndex).toBe(9); // first sign
    const same = calc.calculateKalachakraDasha(rohini1, BIRTH, { maxLevel: 1, dehaJeevaConvention: 'SAME_AS_SAVYA' });
    expect(same.dehaRashi.signIndex).toBe(9);
    expect(same.jeevaRashi.signIndex).toBe(4);
  });
});

describe('Registry dispatch and determinism', () => {
  it('dispatches the four systems and yields identical output for identical input', () => {
    const chart = buildChart(1, 15, [...CHART_A_PLACEMENTS()]);
    for (const sys of ['YOGINI', 'CHARA', 'NARAYANA', 'KALACHAKRA']) {
      expect(DashaRegistry.isSupported(sys)).toBe(true);
      const a = DashaRegistry.calculateDasha(sys, chart, { maxLevel: 3, targetDate: '2010-01-01T00:00:00Z' });
      const b = DashaRegistry.calculateDasha(sys, chart, { maxLevel: 3, targetDate: '2010-01-01T00:00:00Z' });
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(JSON.stringify(a)).not.toMatch(/NaN|Infinity/);
    }
  });
});
