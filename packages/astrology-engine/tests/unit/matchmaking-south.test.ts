import { describe, it, expect } from 'vitest';
import {
  calculateDashakoota,
  calculatePorutham,
  southMatchPersonFromIndices,
  southMatchPersonFromMoonLongitude,
  southMatchPersonFromChart,
  SouthMatchingCalculator,
  SOUTH_RAJJU_GROUPS,
  SOUTH_VASYA_TABLE,
  SOUTH_VEDHA_PAIRS,
  SOUTH_YONI_ENEMY_PAIRS,
  PORUTHAM_DINA_GOOD_COUNTS,
  MAHENDRA_GOOD_COUNTS,
  southInclusiveCount,
  SouthKootaKey,
  SouthKootaResult,
} from '../../src/matchmaking-south';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';
import { DEFAULT_ASTROLOGY_CONFIG } from '../../src/configuration/astrology-config';

/**
 * South Indian Porutham / Dashakoota — expected values are hand-worked from the published tables:
 *  - Dinam list {2,4,6,8,9,11,13,15,18,20,24,26} (Tamil panchanga dina porutham tables, e.g. epanchang.com
 *    "Dina Porutham"); Dashakoota Dina remainder rule 2,4,6,8,0 (hindutone.com "Porutham Explained").
 *  - Mahendram {4,7,10,13,16,19,22,25}; Stree Deergham count > 13; Yoni hostile pairs; Rajju 5 groups;
 *    Vedhai pairs (hindutone.com "Porutham Explained").
 *  - Vasya table (astroved.com "Vasya Porutham").
 *  - Gana / yoni per nakshatra: standard tables (same as Ashtakoota): Ashwini Deva/Horse, Bharani
 *    Manushya/Elephant, Rohini Manushya/Serpent, Magha Rakshasa/Rat, Hasta Deva/Buffalo, Swati Deva/Buffalo,
 *    Anuradha Deva/Deer, Revati Deva/Elephant.
 *  - Rashi lords: Mesha Mars, Vrishabha Venus, Mithuna Mercury, Kataka Moon, Simha Sun, Thula Venus,
 *    Vrischika Mars, Meena Jupiter. Natural friendships (BPHS): Sun↔Mars friends, Mars↔Jupiter friends,
 *    Mercury→Moon enemy, Moon→Mercury friend.
 * Count convention: inclusive, girl → boy: count = ((boy − girl) mod 27) + 1.
 * Pure table rules: exact equality, no tolerance.
 */

const P = southMatchPersonFromIndices;
const byKey = (ks: SouthKootaResult[]) =>
  Object.fromEntries(ks.map((k) => [k.key, k])) as Record<SouthKootaKey, SouthKootaResult>;

describe('published tables', () => {
  it('Rajju: 5 groups covering all 27 nakshatras exactly once (Siro = Mrigashira, Chitra, Dhanishta)', () => {
    const all = Object.values(SOUTH_RAJJU_GROUPS).flat().sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
    expect(SOUTH_RAJJU_GROUPS.SIRO).toEqual([5, 14, 23]);
    expect(SOUTH_RAJJU_GROUPS.PADA).toEqual([1, 9, 10, 18, 19, 27]);
  });

  it('Vedha: 12 pairs + Mrigashira/Chitra/Dhanishta triplet; every nakshatra appears', () => {
    expect(SOUTH_VEDHA_PAIRS).toHaveLength(15);
    const seen = new Set(SOUTH_VEDHA_PAIRS.flat());
    expect(seen.size).toBe(27);
  });

  it('Yoni hostile pairs as published', () => {
    expect(SOUTH_YONI_ENEMY_PAIRS).toHaveLength(7);
    expect(SOUTH_YONI_ENEMY_PAIRS).toContainEqual(['CAT', 'RAT']);
    expect(SOUTH_YONI_ENEMY_PAIRS).toContainEqual(['SERPENT', 'MONGOOSE']);
    expect(SOUTH_YONI_ENEMY_PAIRS).toContainEqual(['COW', 'TIGER']);
  });

  it('Vasya table as published (astroved.com)', () => {
    expect(SOUTH_VASYA_TABLE).toEqual({
      1: [8, 5], 2: [4, 7], 3: [6], 4: [8, 9], 5: [7], 6: [3, 12],
      7: [10], 8: [4, 6], 9: [12], 10: [11, 1], 11: [1], 12: [10],
    });
  });

  it('count lists as published', () => {
    expect(PORUTHAM_DINA_GOOD_COUNTS).toEqual([2, 4, 6, 8, 9, 11, 13, 15, 18, 20, 24, 26]);
    expect(MAHENDRA_GOOD_COUNTS).toEqual([4, 7, 10, 13, 16, 19, 22, 25]);
  });

  it('inclusive count wraps across Revati → Ashwini', () => {
    expect(southInclusiveCount(27, 1, 27)).toBe(2); // Revati(27) → Ashwini(1): 1 step + 1
    expect(southInclusiveCount(2, 1, 27)).toBe(27); // Bharani → Ashwini: 26 steps + 1
    expect(southInclusiveCount(5, 5, 27)).toBe(1);
  });
});

describe('Pair A: girl Ashwini/Mesha, boy Magha/Simha', () => {
  // count = 10 − 1 + 1 = 10
  // Dinam: 10 ∉ list → no. Dashakoota Dina: 10 mod 9 = 1 → no.
  // Gana: Deva (girl) vs Rakshasa (boy) → no (adhama).
  // Mahendram: 10 ∈ list → yes. Stree Deergham: 10 ≤ 13 → no.
  // Yoni: Horse vs Rat → not hostile → yes.
  // Rasi: Mesha(1) → Simha(5): count 5 → no (not 1, not > 6). Reverse 9.
  // Rasi Athipathi: Mars vs Sun, mutual friends → yes (uttama).
  // Vasya: Mesha's vasya list {Vrischika, Simha} contains Simha → yes.
  // Rajju: Ashwini & Magha both Pada → Rajju dosha. Vedha: no pair (Ashwini–Jyeshtha, Magha–Revati) → yes.
  // Matched: Mahendra, Yoni, Rasi Athipathi, Vasya, Vedha = 5.
  const girl = P(1, 1, 'Girl');
  const boy = P(10, 5, 'Boy');
  const r = calculatePorutham(boy, girl);
  const k = byKey(r.kootas);

  it('evaluates each porutham', () => {
    expect(k.DINA.matched).toBe(false);
    expect(k.DINA.inputs.count).toBe(10);
    expect(k.GANA).toMatchObject({ matched: false, grade: 'ADHAMA' });
    expect(k.MAHENDRA.matched).toBe(true);
    expect(k.STREE_DEERGHA.matched).toBe(false);
    expect(k.YONI.matched).toBe(true);
    expect(k.RASI.matched).toBe(false);
    expect(k.RASI.inputs).toMatchObject({ count: 5, reverseCount: 9, shashtashtaka: false, dvirdvadasa: false });
    expect(k.RASI_ADHIPATI).toMatchObject({ matched: true, grade: 'UTTAMA' });
    expect(k.VASYA.matched).toBe(true);
    expect(k.VASYA.inputs.boyVasyaToGirl).toBe(true);
    expect(k.RAJJU).toMatchObject({ matched: false, dosha: true });
    expect(k.VEDHA).toMatchObject({ matched: true, dosha: false });
    expect(r.matchedCount).toBe(5);
    expect(r.rajjuDosha).toBe(true);
    expect(r.vedhaDosha).toBe(false);
  });

  it('carries inputs, provisional flag and source', () => {
    expect(r.girl.nakshatraName).toBe('Ashwini');
    expect(r.boy.nakshatraName).toBe('Magha');
    expect(r.girl.rashiName).toBe('Mesha');
    expect(r.boy.rashiName).toBe('Simha');
    expect(r.provisional).toBe(true);
    expect(r.source).toMatch(/Tamil/);
    expect(r.conventionNotes.length).toBeGreaterThan(3);
    expect(r.totalKootas).toBe(10);
  });
});

describe('Pair B (Rajju + Vedha positive): girl Rohini/Vrishabha, boy Swati/Thula', () => {
  // count = 15 − 4 + 1 = 12. Dinam: no; Dashakoota Dina: 12 mod 9 = 3 → no.
  // Gana: Manushya vs Deva → madhyama, yes. Mahendram 12 → no. Stree Deergham 12 → no.
  // Yoni: Serpent vs Buffalo → yes. Rasi: Vrishabha(2) → Thula(7): count 6 → no, shashtashtaka (reverse 8).
  // Rasi Athipathi: Venus/Venus same → uttama. Vasya: Rishabha list {Kataka, Thula} has Thula → yes.
  // Rajju: Rohini & Swati both Kantha → dosha. Vedha: Rohini–Swati is a published pair → dosha.
  // Matched: Gana, Yoni, Rasi Athipathi, Vasya = 4.
  const r = calculatePorutham(P(15, 7), P(4, 2));
  const k = byKey(r.kootas);
  it('flags both doshas', () => {
    expect(k.RAJJU).toMatchObject({ matched: false, dosha: true });
    expect(k.RAJJU.inputs.girlRajju).toBe('Kantha (neck)');
    expect(k.VEDHA).toMatchObject({ matched: false, dosha: true });
    expect(r.rajjuDosha && r.vedhaDosha).toBe(true);
  });
  it('other kootas', () => {
    expect(k.GANA).toMatchObject({ matched: true, grade: 'MADHYAMA' });
    expect(k.RASI.matched).toBe(false);
    expect(k.RASI.inputs.shashtashtaka).toBe(true);
    expect(k.RASI_ADHIPATI).toMatchObject({ matched: true, grade: 'UTTAMA' });
    expect(k.VASYA.matched).toBe(true);
    expect(r.matchedCount).toBe(4);
  });
});

describe('Pair C (boundary Revati → Ashwini): girl Revati/Meena, boy Ashwini/Mesha', () => {
  // count = ((1 − 27) mod 27) + 1 = 2. Dinam: 2 ∈ list → yes; Dashakoota: 2 mod 9 = 2 → yes.
  // Gana: Deva/Deva → uttama. Mahendram 2 → no. Stree 2 → no. Yoni Elephant vs Horse → yes.
  // Rasi: Meena(12) → Mesha(1): count 2 → no, dvirdvadasa. Rasi Athipathi: Jupiter vs Mars mutual friends → yes.
  // Vasya: Meena {Makara}, Mesha {Vrischika, Simha} → no. Rajju: Revati & Ashwini both Pada → dosha.
  // Vedha: Revati pairs with Magha only → yes. Matched: Dina, Gana, Yoni, Rasi Athipathi, Vedha = 5.
  const boy = P(1, 1);
  const girl = P(27, 12);
  it('porutham', () => {
    const r = calculatePorutham(boy, girl);
    const k = byKey(r.kootas);
    expect(k.DINA.inputs.count).toBe(2);
    expect(k.DINA.matched).toBe(true);
    expect(k.GANA.grade).toBe('UTTAMA');
    expect(k.RASI.inputs).toMatchObject({ count: 2, dvirdvadasa: true });
    expect(k.VASYA.matched).toBe(false);
    expect(k.RAJJU.dosha).toBe(true);
    expect(k.VEDHA.matched).toBe(true);
    expect(r.matchedCount).toBe(5);
  });
  it('dashakoota agrees on Dina here', () => {
    const d = calculateDashakoota(boy, girl);
    expect(byKey(d.kootas).DINA).toMatchObject({ matched: true, inputs: { remainder: 2 } });
    expect(d.matchedCount).toBe(5);
    expect(d.points).toBeNull();
  });
});

describe('Pair D (Dina variant difference, count 17): girl Ashwini/Mesha, boy Anuradha/Vrischika', () => {
  // count 17. Dinam: 17 ∉ Tamil list → no. Dashakoota: 17 mod 9 = 8 → yes.
  // Gana Deva/Deva → yes. Mahendram 17 → no. Stree 17 > 13 → yes. Yoni Horse vs Deer → yes.
  // Rasi: Mesha → Vrischika count 8 (> 6) → yes, shashtashtaka flag. Rasi Athipathi Mars/Mars → yes.
  // Vasya: Mesha {Vrischika, Simha} → yes. Rajju: Pada vs Kati → yes. Vedha: none → yes.
  // Porutham 8, Dashakoota 9.
  const boy = P(17, 8);
  const girl = P(1, 1);
  it('porutham = 8, dashakoota = 9', () => {
    const p = calculatePorutham(boy, girl);
    const d = calculateDashakoota(boy, girl);
    expect(byKey(p.kootas).DINA.matched).toBe(false);
    expect(byKey(d.kootas).DINA.matched).toBe(true);
    expect(byKey(p.kootas).RASI.inputs.shashtashtaka).toBe(true);
    expect(byKey(p.kootas).RASI.matched).toBe(true);
    expect(p.matchedCount).toBe(8);
    expect(d.matchedCount).toBe(9);
    expect(d.system).toBe('DASHAKOOTA');
    expect(d.source).toMatch(/Raman/);
  });
  it('count 27 (girl Bharani, boy Ashwini): Tamil Dinam no, Dashakoota remainder 0 yes', () => {
    expect(byKey(calculatePorutham(P(1, 1), P(2, 1)).kootas).DINA.matched).toBe(false);
    expect(byKey(calculateDashakoota(P(1, 1), P(2, 1)).kootas).DINA).toMatchObject({ matched: true, inputs: { count: 27, remainder: 0 } });
  });
});

describe('single-rule boundaries', () => {
  it('Stree Deergham: girl Ashwini, boy Hasta (count 13) no; boy Chitra (count 14) yes', () => {
    expect(byKey(calculatePorutham(P(13, 6), P(1, 1)).kootas).STREE_DEERGHA.matched).toBe(false);
    expect(byKey(calculatePorutham(P(14, 6), P(1, 1)).kootas).STREE_DEERGHA.matched).toBe(true);
  });
  it('Yoni hostile: Ashwini (horse) with Hasta (buffalo) → no agreement', () => {
    const y = byKey(calculatePorutham(P(13, 6), P(1, 1)).kootas).YONI;
    expect(y).toMatchObject({ matched: false, grade: 'ADHAMA' });
  });
  it('Rasi Athipathi one-sided enmity: girl Mithuna (Mercury), boy Kataka (Moon) → no', () => {
    // Mercury → Moon ENEMY, Moon → Mercury FRIEND (BPHS natural relationships).
    const ra = byKey(calculatePorutham(P(8, 4), P(7, 3)).kootas).RASI_ADHIPATI;
    expect(ra).toMatchObject({ matched: false, grade: 'ADHAMA' });
    expect(ra.inputs).toMatchObject({ girlLordTowardBoyLord: 'ENEMY', boyLordTowardGirlLord: 'FRIEND' });
  });
  it('Gana: both Rakshasa → uttama', () => {
    expect(byKey(calculatePorutham(P(10, 5), P(3, 1)).kootas).GANA.grade).toBe('UTTAMA');
  });
  it('Vedha triplet: Mrigashira with Dhanishta and with Chitra', () => {
    expect(byKey(calculatePorutham(P(23, 10), P(5, 2)).kootas).VEDHA.dosha).toBe(true);
    expect(byKey(calculatePorutham(P(14, 6), P(5, 2)).kootas).VEDHA.dosha).toBe(true);
  });
  it('Mahendram: count 4 yes, count 5 no', () => {
    expect(byKey(calculatePorutham(P(4, 2), P(1, 1)).kootas).MAHENDRA.matched).toBe(true);
    expect(byKey(calculatePorutham(P(5, 2), P(1, 1)).kootas).MAHENDRA.matched).toBe(false);
  });
});

describe('profiles from Moon longitude (nakshatra / rashi boundaries)', () => {
  it('0° → Ashwini/Mesha; 13°20′ → Bharani; 359.999° → Revati/Meena; 30° → Krittika/Vrishabha', () => {
    expect(southMatchPersonFromMoonLongitude(0)).toMatchObject({ nakshatraIndex: 1, rashiIndex: 1, rajju: 'PADA' });
    expect(southMatchPersonFromMoonLongitude(40 / 3).nakshatraIndex).toBe(2);
    expect(southMatchPersonFromMoonLongitude(359.999)).toMatchObject({ nakshatraIndex: 27, rashiIndex: 12, rashiLord: 'JUPITER' });
    expect(southMatchPersonFromMoonLongitude(30)).toMatchObject({ nakshatraIndex: 3, rashiIndex: 2, rashiName: 'Vrishabha' });
  });
  it('rejects invalid indices', () => {
    expect(() => P(0, 1)).toThrow();
    expect(() => P(1, 13)).toThrow();
  });
});

describe('SouthMatchingCalculator (charts through ChartCalculator with config)', () => {
  it('derives profiles from each chart Moon and is deterministic', async () => {
    const cc = new ChartCalculator(new MockEphemerisProvider());
    const calc = new SouthMatchingCalculator(cc);
    const boy = { date: { year: 1990, month: 5, day: 15 }, time: { hour: 14, minute: 30, second: 0 }, timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209 };
    const girl = { date: { year: 1992, month: 8, day: 20 }, time: { hour: 6, minute: 0, second: 0 }, timezone: 'Asia/Kolkata', latitude: 13.0827, longitude: 80.2707 };
    const r1 = await calc.porutham(boy, girl, DEFAULT_ASTROLOGY_CONFIG);
    const r2 = await calc.porutham(boy, girl);
    expect(r1).toEqual(r2);
    const boyChart = await cc.calculateChart(boy, DEFAULT_ASTROLOGY_CONFIG);
    expect(r1.boy).toEqual(southMatchPersonFromChart(boyChart, 'Boy'));
    const d = await calc.dashakoota(boy, girl);
    expect(d.boy).toEqual(r1.boy);
    expect(d.kootas.slice(1)).toEqual(r1.kootas.slice(1));
  });
});
