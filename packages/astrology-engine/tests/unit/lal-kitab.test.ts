import { describe, it, expect } from 'vitest';
import {
  LAL_KITAB_VARSHPHAL_TABLE,
  LAL_KITAB_VARSHPHAL_RECONCILED_ROWS,
  LalKitabCalculator,
  lalKitabChartFromAstroChart,
  lalKitabVarshphalFromChart,
  lalKitabVarshphalRow,
  lalKitabAnnualHouse,
  lalKitabAgeForYear,
} from '../../src/lal-kitab';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { RASHIS } from '../../src/zodiac/rashi';
import { BirthDetails } from '../../src/input/birth-details';
import { DEFAULT_ASTROLOGY_CONFIG } from '../../src/configuration/astrology-config';

/*
 * Expected values come from the cited table transcriptions (rows copied below as comments) and from
 * hand calculation of the stated rules. Integers only: no tolerance applies.
 *   S1 = "Varshphal sequence of movement of planets as per Lalkitab", Astrostudents Collections
 *        (pdfcoffee.com/lalkitab-varshphal-chart-pdf-free.html)
 *   S2 = R. N. Bhandari, "Varshphal Annual Transition Chart Part 2", Saptarishis Astrology
 *        (saptarishisastrology.com/?p=10498)
 *   S3 = Rajinder Bhatia, IndiaDivine forum "Varshaphal -- Table"
 *        (indiadivine.org/content/topic/1423811-varshaphal-table/) — age 21 row only, quoted from Lal Kitab 1952.
 */

describe('Lal Kitab Varshphal table (data)', () => {
  it('has 120 rows, each a permutation of houses 1..12', () => {
    expect(LAL_KITAB_VARSHPHAL_TABLE).toHaveLength(120);
    for (const row of LAL_KITAB_VARSHPHAL_TABLE) {
      expect([...row].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    }
  });

  // Rows copied from the sources (natal house 1..12 -> annual house).
  const sourceRows: Array<[number, number[], string]> = [
    // S1 age 1:  1 9 10 3 5 2 11 7 6 12 4 8   (S2 prints "6" for house 6: duplicate, rejected)
    [1, [1, 9, 10, 3, 5, 2, 11, 7, 6, 12, 4, 8], 'S1'],
    // S1 = S2 age 2:  4 1 12 9 3 7 5 6 2 8 10 11
    [2, [4, 1, 12, 9, 3, 7, 5, 6, 2, 8, 10, 11], 'S1=S2'],
    // S1 = S2 age 16: 3 9 4 1 12 8 6 5 2 7 11 10 (S2 worked example: Mars natal H1 -> H3 in 16th year)
    [16, [3, 9, 4, 1, 12, 8, 6, 5, 2, 7, 11, 10], 'S1=S2'],
    // S1 = S2 = S3 age 21: 12 2 8 5 10 3 9 4 1 11 7 6
    [21, [12, 2, 8, 5, 10, 3, 9, 4, 1, 11, 7, 6], 'S1=S2=S3'],
    // S1 = S2 age 35: 8 10 12 6 7 2 4 5 9 3 11 1
    [35, [8, 10, 12, 6, 7, 2, 4, 5, 9, 3, 11, 1], 'S1=S2'],
    // S1 = S2 age 57: 12 2 6 5 10 8 9 7 4 11 1 3
    [57, [12, 2, 6, 5, 10, 8, 9, 7, 4, 11, 1, 3], 'S1=S2'],
    // S1 = S2 age 88: 3 9 4 1 8 10 2 7 12 5 6 11
    [88, [3, 9, 4, 1, 8, 10, 2, 7, 12, 5, 6, 11], 'S1=S2'],
    // S1 = S2 age 100: 3 10 8 1 5 7 6 12 2 9 11 4
    [100, [3, 10, 8, 1, 5, 7, 6, 12, 2, 9, 11, 4], 'S1=S2'],
    // S1 age 120: 6 8 7 12 2 3 5 4 11 1 9 10 (S2 prints "4" for house 1: duplicate of house 8, rejected)
    [120, [6, 8, 7, 12, 2, 3, 5, 4, 11, 1, 9, 10], 'S1'],
  ];
  it.each(sourceRows)('row for age %i matches the source (%s)', (age, row) => {
    expect(lalKitabVarshphalRow(age)).toEqual(row);
  });

  it('reconciled rows use the valid-permutation value', () => {
    expect(LAL_KITAB_VARSHPHAL_RECONCILED_ROWS.map((r) => r.age)).toEqual([1, 43, 76, 96, 117, 120]);
    for (const r of LAL_KITAB_VARSHPHAL_RECONCILED_ROWS) {
      expect(lalKitabAnnualHouse(r.natalHouse, r.age)).toBe(r.used);
      // The rejected value must already appear elsewhere in the row (that is why it was rejected).
      expect(lalKitabVarshphalRow(r.age).filter((x) => x === r.rejected)).toHaveLength(1);
    }
    // S2 age 43: 7 5 11 2 3 4 8 10 8 9 12 6 (8 twice); S1: ... 4 1 10 ... -> house 7 = 1.
    expect(lalKitabVarshphalRow(43)).toEqual([7, 5, 11, 2, 3, 4, 1, 10, 8, 9, 12, 6]);
  });

  it('rejects ages outside 1..120 and houses outside 1..12', () => {
    expect(() => lalKitabVarshphalRow(0)).toThrow();
    expect(() => lalKitabVarshphalRow(121)).toThrow();
    expect(() => lalKitabVarshphalRow(2.5)).toThrow();
    expect(() => lalKitabAnnualHouse(13, 5)).toThrow();
  });

  it('maps a target calendar year to the running year beginning in it', () => {
    // Born 1990: running year 1 begins 1990, year 21 begins on the 2010 birthday.
    expect(lalKitabAgeForYear(1990, 1990)).toBe(1);
    expect(lalKitabAgeForYear(1990, 2010)).toBe(21);
    expect(() => lalKitabAgeForYear(1990, 1989)).toThrow();
    expect(() => lalKitabAgeForYear(1990, 2110)).toThrow();
  });
});

/** Minimal engine chart: only the sign of the lagna and of each planet matter to Lal Kitab. */
function handChart(lagnaRashi: number, signs: Record<string, number>): AstroChart {
  const planets: Record<string, unknown> = {};
  for (const [planet, rashi] of Object.entries(signs)) {
    planets[planet] = { planet, longitude: (rashi - 1) * 30 + 10, rashiIndex: rashi, rashiName: RASHIS[rashi - 1].sanskritName, isRetrograde: false };
  }
  return { ascendant: { name: 'Ascendant', longitude: (lagnaRashi - 1) * 30 + 5, rashiIndex: lagnaRashi }, planets } as unknown as AstroChart;
}

describe('Lal Kitab chart and Varshphal — hand-worked example', () => {
  /*
   * Lagna Simha (5). House from lagna = ((sign − 5 + 12) mod 12) + 1:
   *   Sun Simha 5 -> 1, Moon Vrischika 8 -> 4, Mars Mesha 1 -> 9, Mercury Kanya 6 -> 2,
   *   Jupiter Dhanu 9 -> 5, Venus Karka 4 -> 12, Saturn Makara 10 -> 6, Rahu Kumbha 11 -> 7, Ketu Simha 5 -> 1.
   * Lal Kitab chart: house N = fixed sign N (house 1 = Mesha).
   * Age 21 row (S1=S2=S3): natal 1..12 -> 12 2 8 5 10 3 9 4 1 11 7 6:
   *   Sun,Ketu 1->12; Moon 4->5; Mars 9->1; Mercury 2->2; Jupiter 5->10; Venus 12->6; Saturn 6->3; Rahu 7->9.
   */
  const chart = handChart(5, { SUN: 5, MOON: 8, MARS: 1, MERCURY: 6, JUPITER: 9, VENUS: 4, SATURN: 10, RAHU: 11, KETU: 5 });
  const lk = lalKitabChartFromAstroChart(chart);

  it('places planets by house from lagna in the fixed Aries-first chart', () => {
    const h = Object.fromEntries(lk.planets.map((p) => [p.planet, p.house]));
    expect(h).toEqual({ SUN: 1, MOON: 4, MARS: 9, MERCURY: 2, JUPITER: 5, VENUS: 12, SATURN: 6, RAHU: 7, KETU: 1 });
    expect(lk.houses[0]).toMatchObject({ house: 1, fixedRashiIndex: 1, fixedRashiName: 'Mesha', planets: [PlanetSymbol.SUN, PlanetSymbol.KETU] });
    expect(lk.houses[11]).toMatchObject({ house: 12, fixedRashiName: 'Meena', planets: [PlanetSymbol.VENUS] });
    expect(lk.natalLagnaRashiName).toBe('Simha');
    expect(lk.provisional).toBe(true);
    expect(lk.source).toMatch(/Lal Kitab/);
  });

  it('moves each natal house by the age-21 row', () => {
    const v = lalKitabVarshphalFromChart(lk, 21, 1990);
    const a = Object.fromEntries(v.planets.map((p) => [p.planet, p.annualHouse]));
    expect(a).toEqual({ SUN: 12, MOON: 5, MARS: 1, MERCURY: 2, JUPITER: 10, VENUS: 6, SATURN: 3, RAHU: 9, KETU: 12 });
    expect(v.houses[11].planets).toEqual([PlanetSymbol.SUN, PlanetSymbol.KETU]);
    expect(v.houses[3].planets).toEqual([]); // nothing goes to house 4 this year
    expect(v.startsInYear).toBe(2010);
    expect(v.tableRowReconciled).toBe(false);
    expect(v.houseMapping[8]).toEqual({ natalHouse: 9, annualHouse: 1 });
  });

  it('flags a reconciled row', () => {
    const v = lalKitabVarshphalFromChart(lk, 1, 1990);
    expect(v.tableRowReconciled).toBe(true);
    expect(v.conventionNotes.join(' ')).toMatch(/natal house 6/);
    // Age 1 row: Saturn natal H6 -> 2.
    expect(v.planets.find((p) => p.planet === PlanetSymbol.SATURN)!.annualHouse).toBe(2);
  });
});

describe('LalKitabCalculator with the engine chart', () => {
  // New Delhi, 1990-05-15 14:30 IST (REF_CHART_001 birth data).
  const birth: BirthDetails = {
    date: { year: 1990, month: 5, day: 15 },
    time: { hour: 14, minute: 30, second: 0 },
    timezone: 'Asia/Kolkata',
    latitude: 28.6139,
    longitude: 77.209,
  };
  const calc = new LalKitabCalculator();

  it('builds the teva from whole-sign houses of the natal lagna', async () => {
    const lk = await calc.calculateChart(birth, DEFAULT_ASTROLOGY_CONFIG);
    expect(lk.planets).toHaveLength(9);
    // Independent check: Lahiri Vrishabha sankranti was 14/15 May 1990, so the Sun is in sign 2.
    const sun = lk.planets.find((p) => p.planet === PlanetSymbol.SUN)!;
    expect(sun.natalRashiIndex).toBe(2);
    for (const p of lk.planets) expect(p.house).toBe(((p.natalRashiIndex - lk.natalLagnaRashiIndex + 12) % 12) + 1);
    // Rahu and Ketu are always 7 houses apart.
    const r = lk.planets.find((p) => p.planet === PlanetSymbol.RAHU)!.house;
    const k = lk.planets.find((p) => p.planet === PlanetSymbol.KETU)!.house;
    expect(((k - r + 12) % 12)).toBe(6);
  });

  it('varshphal by age and by target year agree and require exactly one', async () => {
    const byAge = await calc.calculateVarshphal(birth, { age: 21 });
    const byYear = await calc.calculateVarshphal(birth, { targetYear: 2010 });
    expect(byYear.age).toBe(21);
    expect(byYear.planets).toEqual(byAge.planets);
    for (const p of byAge.planets) expect(p.annualHouse).toBe([12, 2, 8, 5, 10, 3, 9, 4, 1, 11, 7, 6][p.natalHouse - 1]);
    await expect(calc.calculateVarshphal(birth, {})).rejects.toThrow();
    await expect(calc.calculateVarshphal(birth, { age: 3, targetYear: 1992 })).rejects.toThrow();
    await expect(calc.calculateVarshphal(birth, { age: 121 })).rejects.toThrow();
  });
});
