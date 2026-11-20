/**
 * Kota Chakra (ADR-016 §6, provisional). Expected values are transcribed from the cited published
 * sources, never from the engine's own output. Tolerances: exact integers / identifiers.
 *
 * Sources:
 *  [A] V. Ayalur, "Kota Chakra" (vijayalur.com, 2011-06-02): division lists by count from the janma
 *      nakshatra; worked example janma Rohini -> Stambha Punarvasu, Chitra, Uttarashadha, Revati;
 *      Magha pada 3 Moon -> Kota Swami Sun, Kota Pala Saturn.
 *  [G] M. R. Garg, "Kota Chakra (कोट / दुर्गा चक्र)" (2024): 108-pada Kota Pala table; example chart
 *      27-8-1980 08:30 Hyderabad, Moon in P.Bhadrapada pada 2 (Aquarius) -> Kota Swami Saturn, Kota Pala Rahu;
 *      entry path NE/SE/SW/NW converging on the Stambha, exit to E/S/W/N; Rahu/Ketu reverse entry/exit.
 */
import { describe, it, expect } from 'vitest';
import { kotaPositionForCount, kotaPalaFor, KotaChakraCalculator } from '../../src/chakras/kota';
import { CHAKRA_NAKSHATRAS_28 } from '../../src/chakras/chakra-nakshatra28';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { BirthDetails } from '../../src/input/birth-details';
import { PlanetSymbol } from '../../src/planets/planet.types';

const n28 = (name: string) => CHAKRA_NAKSHATRAS_28.indexOf(name) + 1;

describe('Kota divisions [A]', () => {
  const byDivision = (d: string) => Array.from({ length: 28 }, (_, i) => i + 1).filter((c) => kotaPositionForCount(c, 1).division === d);
  it('Stambha 4, 11, 18, 25', () => expect(byDivision('STAMBHA')).toEqual([4, 11, 18, 25]));
  it('Madhya 3, 5, 10, 12, 17, 19, 24, 26', () => expect(byDivision('MADHYA')).toEqual([3, 5, 10, 12, 17, 19, 24, 26]));
  it('Prakara 2, 6, 9, 13, 16, 20, 23, 27', () => expect(byDivision('PRAKARA')).toEqual([2, 6, 9, 13, 16, 20, 23, 27]));
  it('Bahya 1, 7, 8, 14, 15, 21, 22, 28', () => expect(byDivision('BAHYA')).toEqual([1, 7, 8, 14, 15, 21, 22, 28]));
  it('worked example: janma Rohini -> Stambha Punarvasu, Chitra, Uttarashadha, Revati', () => {
    const names = [4, 11, 18, 25].map((c) => kotaPositionForCount(c, n28('Rohini')).nakshatraName);
    expect(names).toEqual(['Punarvasu', 'Chitra', 'Uttara Ashadha', 'Revati']);
  });
});

describe('Entry / exit paths [G]', () => {
  it('janma in the NE; 1-4 enter along NE, 5-7 exit toward E; next quarter enters along SE', () => {
    const d = (c: number) => kotaPositionForCount(c, 1);
    expect([1, 2, 3, 4].map((c) => [d(c).direction, d(c).path])).toEqual(Array(4).fill(['NE', 'ENTRY']));
    expect([5, 6, 7].map((c) => [d(c).direction, d(c).path])).toEqual(Array(3).fill(['E', 'EXIT']));
    expect(d(8)).toMatchObject({ direction: 'SE', path: 'ENTRY', division: 'BAHYA' });
    expect(d(28)).toMatchObject({ direction: 'N', path: 'EXIT', division: 'BAHYA' });
  });
});

/**
 * [G] table, Kota Pala lord of each of the 108 padas (Ashwini p1 .. Revati p4), as published.
 * (The letter column of [G] has two typos — pada 2 "ञ" over "चे" and pada 105 "ञ" over "दे"; the lords,
 * Ve and Ju, agree with the Avakahada letters चे and दे.)
 */
const GARG_PALA = [
  'Ve Ve Ve Mo', 'Mo Mo Mo Mo', 'Su Su Su Su', 'Su Mo Mo Mo', 'Mo Mo Ma Ma', 'Ma Ma Ma Ve', 'Ma Ma Ra Ra', 'Ra Ra Ra Me', 'Me Me Me Me',
  'Sa Sa Sa Sa', 'Sa Me Me Me', 'Me Me Sa Sa', 'Sa Ra Me Me', 'Sa Sa Mo Mo', 'Mo Mo Mo Ju', 'Ju Ju Ju Ju', 'Ju Ju Ju Ju', 'Ju Mo Mo Mo',
  'Mo Mo Sa Sa', 'Sa Ju Sa Me', 'Sa Sa Ve Ve', 'Ma Ma Ma Ma', 'Ma Ma Ma Ma', 'Ma Ra Ra Ra', 'Ra Ra Ju Ju', 'Ju Ju Ve Ve', 'Ju Ju Ve Ve',
];
const ABBR: Record<string, PlanetSymbol> = {
  Su: PlanetSymbol.SUN, Mo: PlanetSymbol.MOON, Ma: PlanetSymbol.MARS, Me: PlanetSymbol.MERCURY, Ju: PlanetSymbol.JUPITER,
  Ve: PlanetSymbol.VENUS, Sa: PlanetSymbol.SATURN, Ra: PlanetSymbol.RAHU,
};

describe('Kota Pala [G]', () => {
  it('matches all 108 padas of the published table', () => {
    for (let n = 1; n <= 27; n++) {
      const lords = GARG_PALA[n - 1].split(' ');
      for (let p = 1; p <= 4; p++) expect(kotaPalaFor(n, p).lord, `nakshatra ${n} pada ${p}`).toBe(ABBR[lords[p - 1]]);
    }
  });
  it('[A] Magha pada 3 (letter मू, pa-varga) -> Saturn; [G] P.Bhadrapada pada 2 (सो) -> Rahu', () => {
    expect(kotaPalaFor(10, 3)).toEqual({ letter: 'मू', varga: 'PA', lord: PlanetSymbol.SATURN });
    expect(kotaPalaFor(25, 2)).toEqual({ letter: 'सो', varga: 'SHA', lord: PlanetSymbol.RAHU });
  });
});

function fakeChart(pos: Partial<Record<PlanetSymbol, [number, boolean]>>): AstroChart {
  const planets: Record<string, unknown> = {};
  for (const [p, [lon, retro]] of Object.entries(pos) as Array<[PlanetSymbol, [number, boolean]]>) {
    planets[p] = { planet: p, longitude: lon, isRetrograde: retro, rashiIndex: Math.floor(lon / 30) + 1 };
  }
  return { metadata: { normalizedTime: { utcIsoString: '2000-01-01T00:00:00.000Z' } }, planets } as unknown as AstroChart;
}

describe('Placements and movement [G]', () => {
  // Natal Moon 125° = Magha pada 2 (123°20'–126°40'), Simha -> Kota Swami Sun; pada letter मी -> Saturn.
  const natal = fakeChart({ [PlanetSymbol.MOON]: [125, false], [PlanetSymbol.SUN]: [125, false] });
  // Transit: Mars 165° = Hasta (count 4 from Magha: Magha, PPh, UPh, Hasta) -> Stambha on entry path, direct -> ENTERING.
  // Saturn 170° Hasta retrograde -> EXITING. Rahu 140° = Purva Phalguni (count 2, Prakara, entry) -> nodes reverse -> EXITING.
  // Jupiter 180° = Chitra (count 5, Madhya, exit path), direct -> EXITING.
  const transit = fakeChart({
    [PlanetSymbol.MARS]: [165, false], [PlanetSymbol.SATURN]: [170, true], [PlanetSymbol.RAHU]: [140, false], [PlanetSymbol.JUPITER]: [180, false],
  });
  const r = KotaChakraCalculator.fromCharts(natal, transit);
  const t = (p: PlanetSymbol) => r.transit!.placements.find((x) => x.planet === p)!;
  it('janma, Kota Swami, Kota Pala', () => {
    expect(r.janmaNakshatra).toEqual({ nakshatra28Index: 10, name: 'Magha', pada: 2 });
    expect(r.kotaSwami.planet).toBe(PlanetSymbol.SUN);
    expect(r.kotaPala).toMatchObject({ planet: PlanetSymbol.SATURN, letter: 'मी' });
    expect(r.positions).toHaveLength(28);
    expect(r.provisional).toBe(true);
  });
  it('entering / exiting by path and motion', () => {
    expect(t(PlanetSymbol.MARS)).toMatchObject({ count: 4, division: 'STAMBHA', path: 'ENTRY', movement: 'ENTERING' });
    expect(t(PlanetSymbol.SATURN)).toMatchObject({ count: 4, division: 'STAMBHA', movement: 'EXITING', isKotaPala: true });
    expect(t(PlanetSymbol.RAHU)).toMatchObject({ count: 2, division: 'PRAKARA', isRetrograde: true, movement: 'EXITING' });
    expect(t(PlanetSymbol.JUPITER)).toMatchObject({ count: 5, division: 'MADHYA', path: 'EXIT', movement: 'EXITING' });
    expect(r.natal.find((x) => x.planet === PlanetSymbol.SUN)).toMatchObject({ count: 1, isKotaSwami: true });
  });
});

describe('[G] example chart 27-8-1980 08:30 Hyderabad', () => {
  const birth: BirthDetails = {
    date: { year: 1980, month: 8, day: 27 }, time: { hour: 8, minute: 30, second: 0 },
    timezone: 'Asia/Kolkata', latitude: 17.385, longitude: 78.4867,
  };
  it('Moon in P.Bhadrapada pada 2, Kota Swami Saturn, Kota Pala Rahu', async () => {
    const r = await new KotaChakraCalculator().calculate(birth);
    expect(r.janmaNakshatra).toMatchObject({ name: 'Purva Bhadrapada', pada: 2 });
    expect(r.kotaSwami).toMatchObject({ planet: PlanetSymbol.SATURN, moonRashi: 'Kumbha' });
    expect(r.kotaPala.planet).toBe(PlanetSymbol.RAHU);
    expect(r.natal).toHaveLength(9);
  });
});
