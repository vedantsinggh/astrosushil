/**
 * Sarvatobhadra Chakra (ADR-016 §6, provisional). Every expected value is transcribed from a cited
 * published source, never from the engine's own output. Tolerances: cell coordinates and indices
 * are exact integers.
 *
 * Sources:
 *  [W] Wikipedia "Sarvatobhadra Chakra" grid (North at top, East on the right; citing G. K. Ojha's
 *      Phaladeepika ch. XXVI commentary). Transcribed below exactly as published, including its two
 *      slips (ऋ twice, लृ twice) which the engine corrects to ॠ / ॡ by the table's own vowel sequence.
 *  [B] "Sarvatobhadra chakra basics" (archive.org Astrology Book Collection), Example 7: Saturn in
 *      Punarvasu.
 *  [S] Saravali "Vedhas" (saravali.github.io/astrology/sbc_vedhas.html): forward / opposite / backward
 *      vedha of Aswini, Swati, Purvashadha, Krittika.
 */
import { describe, it, expect } from 'vitest';
import {
  sarvatobhadraLayout,
  sarvatobhadraNakshatraCell,
  sarvatobhadraVedhaLines,
  sarvatobhadraCornerVowel,
  SarvatobhadraChakraCalculator,
} from '../../src/chakras/sarvatobhadra';
import { chakraNakshatra28Index, CHAKRA_NAKSHATRAS_28 } from '../../src/chakras/chakra-nakshatra28';
import { AstroChart } from '../../src/chart/astro-chart.types';
import { BirthDetails } from '../../src/input/birth-details';
import { PlanetSymbol } from '../../src/planets/planet.types';

/** [W] as published (row 0 = top = North; column 8 = East). */
const WIKI: string[][] = [
  ['ई', 'Dhanista', 'Satabhisa', 'Poorvabhadrapada', 'Uttarabhadrapada', 'Revati', 'Ashwini', 'Bharani', 'अ'],
  ['Sravana', 'ऋ', 'ग', 'स', 'द', 'च', 'ल', 'उ', 'Krittika'],
  ['Abhijit', 'ख', 'ऐ', 'Aquarius', 'Pisces', 'Aries', 'लृ', 'अ', 'Rohini'],
  ['Uttarashada', 'ज', 'Capricorn', 'अः', 'Friday', 'ओ', 'Taurus', 'व', 'Mrigasira'],
  ['Poorvashada', 'भ', 'Sagittarius', 'Thursday', 'Saturday', 'Sunday / Tuesday', 'Gemini', 'क', 'Ardra'],
  ['Moola', 'य', 'Scorpio', 'अं', 'Monday / Wednesday', 'औ', 'Cancer', 'ह', 'Punarvasu'],
  ['Jyestha', 'न', 'ए', 'Libra', 'Virgo', 'Leo', 'लृ', 'ड', 'Pushya'],
  ['Anuradhha', 'ऋ', 'त', 'र', 'प', 'ट', 'म', 'ऊ', 'Ashelesha'],
  ['इ', 'Vishakha', 'Swati', 'Chitra', 'Hasta', 'Uttara Phalguni', 'Poorva Phalguni', 'Magha', 'आ'],
];
/** [W] spellings -> engine names. */
const NAK_ALIAS: Record<string, string> = {
  Dhanista: 'Dhanishta', Satabhisa: 'Shatabhisha', Poorvabhadrapada: 'Purva Bhadrapada', Uttarabhadrapada: 'Uttara Bhadrapada',
  Sravana: 'Shravana', Uttarashada: 'Uttara Ashadha', Poorvashada: 'Purva Ashadha', Moola: 'Mula', Jyestha: 'Jyeshtha',
  Anuradhha: 'Anuradha', 'Poorva Phalguni': 'Purva Phalguni', Ashelesha: 'Ashlesha', Mrigasira: 'Mrigashira',
};
const RASHI_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

describe('Sarvatobhadra layout vs the published grid [W]', () => {
  const grid = sarvatobhadraLayout();
  it('matches every one of the 81 cells after turning East to the top', () => {
    // Engine is East-top: engine[r][c] corresponds to wiki[c][8 - r] (a quarter turn anticlockwise).
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const w = WIKI[c][8 - r];
        const cell = grid[r][c];
        expect(cell.row).toBe(r);
        expect(cell.col).toBe(c);
        if (cell.kind === 'NAKSHATRA') expect(cell.label).toBe(NAK_ALIAS[w] ?? w);
        else if (cell.kind === 'RASHI') expect(RASHI_EN[(cell.rashiIndex ?? 0) - 1]).toBe(w);
        else if (cell.kind === 'TITHI_VARA') expect(cell.weekdays?.join(' / ')).toBe(w);
        else if (r === 7 && c === 1) expect([w, cell.devanagari]).toEqual(['ऋ', 'ॠ']); // ring-2 NW slip in [W]
        else if (r === 2 && c === 6) expect([w, cell.devanagari]).toEqual(['लृ', 'ॡ']); // ring-3 SE slip in [W]
        else expect(cell.devanagari).toBe(w === 'लृ' ? 'ऌ' : w); // [W] writes the vowel ḷ as ल + ृ; the engine uses the letter ऌ
      }
    }
  });
  it('holds the stated counts: 28 nakshatras, 16 vowels, 20 consonants, 12 rashis, 5 tithi/vara squares', () => {
    const flat = grid.flat();
    const count = (k: string) => flat.filter((c) => c.kind === k).length;
    expect([count('NAKSHATRA'), count('VOWEL'), count('CONSONANT'), count('RASHI'), count('TITHI_VARA')]).toEqual([28, 16, 20, 12, 5]);
    expect(new Set(flat.filter((c) => c.kind === 'VOWEL').map((c) => c.devanagari)).size).toBe(16);
  });
  it('places the tithi groups: Nanda E, Bhadra S, Jaya W, Rikta N, Purna centre ([B])', () => {
    expect(grid[3][4]).toMatchObject({ tithiGroup: 'NANDA', tithis: [1, 6, 11, 16, 21, 26], direction: 'E' });
    expect(grid[4][5]).toMatchObject({ tithiGroup: 'BHADRA', direction: 'S' });
    expect(grid[5][4]).toMatchObject({ tithiGroup: 'JAYA', direction: 'W' });
    expect(grid[4][3]).toMatchObject({ tithiGroup: 'RIKTA', direction: 'N' });
    expect(grid[4][4]).toMatchObject({ tithiGroup: 'PURNA', tithis: [5, 10, 15, 20, 25, 30], direction: 'CENTRE' });
  });
  it('puts Krittika first on the East side next to the NE vowel a', () => {
    expect(grid[0][0].devanagari).toBe('अ');
    expect(sarvatobhadraNakshatraCell(3)).toEqual({ row: 0, col: 1 });
    expect(sarvatobhadraNakshatraCell(22)).toEqual({ row: 8, col: 2 }); // Abhijit, between UA and Shravana on the West side
  });
});

const labels = (cells: Array<{ label: string }>) => cells.map((c) => c.label);
const n28 = (name: string) => CHAKRA_NAKSHATRAS_28.indexOf(name) + 1;

describe('Vedha lines', () => {
  it('reproduces [B] Example 7: Saturn in Punarvasu', () => {
    const v = sarvatobhadraVedhaLines(n28('Punarvasu'));
    // "h, rasi Cn, vowel au, tithis Bhadra, weekdays Monday and Wednesday, vowel am, rasi Sc, consonant y and Moola"
    expect(labels(v.OPPOSITE)).toEqual(['ha', 'Karka', 'au', 'Bhadra', 'aṃ', 'Vrischika', 'ya', 'Mula']);
    // "consonant k, rasis Ta and Ar, consonant d and Poorva Bhadrapada"
    expect(labels(v.BACKWARD)).toEqual(['ka', 'Vrishabha', 'Mesha', 'da', 'Purva Bhadrapada']);
    // "consonant d (alveolar), consonant m and Uttara Phalguni"
    expect(labels(v.FORWARD)).toEqual(['ḍa', 'ma', 'Uttara Phalguni']);
  });
  it.each([
    // [S]: nakshatra, forward, opposite, backward
    ['Ashwini', 'Rohini', 'Purva Phalguni', 'Jyeshtha'],
    ['Swati', 'Jyeshtha', 'Shatabhisha', 'Rohini'],
    ['Purva Ashadha', 'Uttara Bhadrapada', 'Ardra', 'Hasta'],
    ['Krittika', 'Vishakha', 'Shravana', 'Bharani'],
  ])('%s: forward %s, opposite %s, backward %s [S]', (name, fwd, opp, back) => {
    const v = sarvatobhadraVedhaLines(n28(name));
    expect(v.FORWARD[v.FORWARD.length - 1].label).toBe(fwd);
    expect(v.OPPOSITE[v.OPPOSITE.length - 1].label).toBe(opp);
    expect(v.BACKWARD[v.BACKWARD.length - 1].label).toBe(back);
    expect(v.OPPOSITE).toHaveLength(8); // straight across: 7 inner squares + far nakshatra
  });
  it('corner vowel rule: last pada before / first pada after a corner [B special principle (1)]', () => {
    expect(sarvatobhadraCornerVowel(25)?.devanagari).toBe('अ');   // Bharani pada 4 (23°20'–26°40')
    expect(sarvatobhadraCornerVowel(27)?.devanagari).toBe('अ');   // Krittika pada 1 (26°40'–30°)
    expect(sarvatobhadraCornerVowel(31)).toBeUndefined();          // Krittika pada 2
    expect(sarvatobhadraCornerVowel(118)?.devanagari).toBe('आ');  // Ashlesha pada 4 (116°40'–120°)
    expect(sarvatobhadraCornerVowel(214)?.devanagari).toBe('इ');  // Anuradha pada 1 (213°20'–216°40')
    expect(sarvatobhadraCornerVowel(292)?.devanagari).toBe('ई');  // Shravana pada 4 (290°–293°20')
    expect(sarvatobhadraCornerVowel(278)).toBeUndefined();         // Abhijit has no corner
  });
});

describe('28-nakshatra scheme with Abhijit 276°40\'–280°53\'20"', () => {
  it.each([
    [0, 1], [276.6, 21], [276.67, 22], [280.85, 22], [280.9, 23], [293.4, 24], [359.99, 28],
  ])('%f° -> %i', (lon, idx) => expect(chakraNakshatra28Index(lon)).toBe(idx));
});

/** Minimal synthetic chart: only fields read by the chakra (longitude, rashi, retrograde). */
function fakeChart(pos: Partial<Record<PlanetSymbol, [number, boolean]>>, ascLon = 10): AstroChart {
  const planets: Record<string, unknown> = {};
  for (const [p, [lon, retro]] of Object.entries(pos) as Array<[PlanetSymbol, [number, boolean]]>) {
    planets[p] = { planet: p, longitude: lon, isRetrograde: retro, rashiIndex: Math.floor(lon / 30) + 1, speedLongitude: retro ? -0.1 : 0.1 };
  }
  return {
    metadata: { normalizedTime: { utcIsoString: '2000-01-01T00:00:00.000Z' } },
    planets,
    ascendant: { longitude: ascLon, rashiIndex: Math.floor(ascLon / 30) + 1 },
  } as unknown as AstroChart;
}

describe('Motion rule (Garg 2022 / Aggarwal p. 45)', () => {
  const natal = fakeChart({
    [PlanetSymbol.MOON]: [85, false],     // Punarvasu
    [PlanetSymbol.SATURN]: [85, true],    // Punarvasu, retrograde
    [PlanetSymbol.JUPITER]: [85, false],  // Punarvasu, direct
  });
  const r = SarvatobhadraChakraCalculator.fromCharts(natal);
  const eff = (p: PlanetSymbol) => r.natal.vedhas.filter((v) => v.planet === p && v.effectiveByMotion).map((v) => v.direction).sort();
  it('Sun/Moon/Rahu/Ketu: all three; direct planet: opposite; retrograde planet: backward', () => {
    expect(eff(PlanetSymbol.MOON)).toEqual(['BACKWARD', 'FORWARD', 'OPPOSITE']);
    expect(eff(PlanetSymbol.JUPITER)).toEqual(['OPPOSITE']);
    expect(eff(PlanetSymbol.SATURN)).toEqual(['BACKWARD']);
  });
  it('marks the occupied square and the natal references', () => {
    expect(r.grid[5].natalPlanets.sort()).toEqual([PlanetSymbol.JUPITER, PlanetSymbol.MOON, PlanetSymbol.SATURN].sort()); // (0,5) = Punarvasu
    expect(r.natalReferences.janmaNakshatra).toMatchObject({ name: 'Punarvasu', row: 0, col: 5 });
    expect(r.natalReferences.moonRashi).toMatchObject({ name: 'Mithuna', row: 2, col: 4 });
    expect(r.provisional).toBe(true);
    expect(r.source).toMatch(/Narapatijayacharya/);
  });
});

describe('SarvatobhadraChakraCalculator end to end', () => {
  const birth: BirthDetails = { date: { year: 1990, month: 5, day: 15 }, time: { hour: 14, minute: 30, second: 0 }, timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209 };
  const moment: BirthDetails = { date: { year: 2026, month: 11, day: 20 }, time: { hour: 12, minute: 0, second: 0 }, timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209 };
  it('places 9 natal and 9 transit bodies on their nakshatra squares', async () => {
    const r = await new SarvatobhadraChakraCalculator().calculate(birth, moment);
    expect(r.grid).toHaveLength(81);
    expect(r.natal.placements).toHaveLength(9);
    expect(r.transit?.placements).toHaveLength(9);
    for (const p of [...r.natal.placements, ...(r.transit?.placements ?? [])]) {
      expect(r.grid[p.row * 9 + p.col].nakshatra28Index).toBe(p.nakshatra28Index);
    }
    expect(r.natal.vedhas.filter((v) => v.direction !== 'CORNER_VOWEL')).toHaveLength(27);
  });
});
