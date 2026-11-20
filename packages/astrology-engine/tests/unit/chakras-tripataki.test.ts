/**
 * Tripataki progression (ADR-016 §6, provisional). Expected signs are hand-counted from the cited rule
 * or transcribed from a published example; never from the engine's own output. Exact integers.
 *
 * Rule (K. S. Charak, A Textbook of Varshaphala ch. VIII; V. Ayalur "Tri Pataki Chakra" 2016):
 * running year = completed years + 1; Moon mod 9; Sun/Mercury/Jupiter/Venus/Saturn mod 4; Mars mod 6;
 * Rahu mod 6 backwards; Ketu opposite Rahu; remainder 0 -> divisor; count 1 = natal sign.
 * Example [V]: VedAstro Tripataki README (birth 23-04-1994, year 2026): completed 32, running 33;
 * Moon Virgo -> Aquarius (33 mod 9 = 6), Mars Pisces -> Taurus (33 mod 6 = 3),
 * Rahu Scorpio -> Virgo (reverse 3), Ketu Taurus -> Pisces.
 * Signs: 1 Ar 2 Ta 3 Ge 4 Cn 5 Le 6 Vi 7 Li 8 Sc 9 Sg 10 Cp 11 Aq 12 Pi.
 */
import { describe, it, expect } from 'vitest';
import { tripatakiProgression, TripatakiChakraCalculator } from '../../src/chakras/tripataki';
import { BirthDetails } from '../../src/input/birth-details';
import { PlanetSymbol } from '../../src/planets/planet.types';

const P = PlanetSymbol;
const signOf = (rows: ReturnType<typeof tripatakiProgression>, p: PlanetSymbol) => rows.find((r) => r.planet === p)?.rashiIndex;

describe('tripatakiProgression', () => {
  it('[V] published example: running year 33', () => {
    const rows = tripatakiProgression({ [P.MOON]: 6, [P.MARS]: 12, [P.RAHU]: 8, [P.KETU]: 2 }, 32);
    expect(signOf(rows, P.MOON)).toBe(11);
    expect(signOf(rows, P.MARS)).toBe(2);
    expect(signOf(rows, P.RAHU)).toBe(6);
    expect(signOf(rows, P.KETU)).toBe(12);
  });
  it('first year of life (running 1): every planet in its natal sign', () => {
    const natal = { [P.SUN]: 1, [P.MOON]: 2, [P.MARS]: 3, [P.MERCURY]: 4, [P.JUPITER]: 5, [P.VENUS]: 6, [P.SATURN]: 7, [P.RAHU]: 8, [P.KETU]: 2 };
    const rows = tripatakiProgression(natal, 0);
    for (const r of rows) expect(r.rashiIndex).toBe(r.natalRashiIndex);
    expect(rows).toHaveLength(9);
  });
  it('hand-worked: running 9 (completed 8)', () => {
    // Moon 9 mod 9 = 0 -> 9: 9th from Aries = Sagittarius (9). Sun 9 mod 4 = 1 -> natal Leo (5).
    // Mars 9 mod 6 = 3: 3rd from Cancer (4) = Virgo (6). Rahu 9 mod 6 = 3 backwards from Gemini (3) = Aries (1); Ketu = Libra (7).
    const rows = tripatakiProgression({ [P.MOON]: 1, [P.SUN]: 5, [P.MARS]: 4, [P.RAHU]: 3, [P.KETU]: 9 }, 8);
    expect([signOf(rows, P.MOON), signOf(rows, P.SUN), signOf(rows, P.MARS), signOf(rows, P.RAHU), signOf(rows, P.KETU)]).toEqual([9, 5, 6, 1, 7]);
  });
  it('rejects negative ages', () => expect(() => tripatakiProgression({}, -1)).toThrow());
});

describe('TripatakiChakraCalculator', () => {
  const birth: BirthDetails = { date: { year: 1990, month: 5, day: 15 }, time: { hour: 14, minute: 30, second: 0 }, timezone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209 };
  it('uses the solar-return age of the target year and emits no vedha', async () => {
    const r = await new TripatakiChakraCalculator().calculate(birth, 2026);
    expect(r.completedYears).toBe(36); // solar return in May 2026 completes 2026 - 1990 = 36 years
    expect(r.runningYear).toBe(37);
    expect(r.placements).toHaveLength(9);
    expect(r.vedha).toBeNull();
    expect(r.provisional).toBe(true);
    for (const p of r.placements) expect(p.houseFromVarshaLagna).toBe(((p.rashiIndex - r.varshaLagna.rashiIndex + 12) % 12) + 1);
  });
});
