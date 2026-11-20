import { describe, it, expect } from 'vitest';
import {
  calculateTajikaPanchaVargiyaBala,
  tajikaUchchaBala,
  TAJIKA_HADDA_TABLE,
  tajikaHaddaOf,
  tajikaPanchaVargiyaCategory,
} from '../../src/tajika-extended';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { tajikaTestChart } from './tajika-extended-helpers';

/**
 * Source: P.V.R. Narasimha Rao, "Vedic Astrology: An Integrated Approach" (2000), ch. 28 §28.4 (Pancha Vargeeya Bala,
 * following Tajika Neelakanthi) and Table 72 (Hadda lords). Expected values are hand-worked below from those rules.
 */
const T72: Array<[number[], string[]]> = [
  [[6, 12, 20, 25, 30], ['JUPITER', 'VENUS', 'MERCURY', 'MARS', 'SATURN']],
  [[8, 14, 22, 27, 30], ['VENUS', 'MERCURY', 'JUPITER', 'SATURN', 'MARS']],
  [[6, 12, 17, 24, 30], ['MERCURY', 'VENUS', 'JUPITER', 'MARS', 'SATURN']],
  [[7, 13, 19, 26, 30], ['MARS', 'VENUS', 'MERCURY', 'JUPITER', 'SATURN']],
  [[6, 11, 18, 24, 30], ['JUPITER', 'VENUS', 'SATURN', 'MERCURY', 'MARS']],
  [[7, 17, 21, 28, 30], ['MERCURY', 'VENUS', 'JUPITER', 'MARS', 'SATURN']],
  [[6, 14, 21, 28, 30], ['SATURN', 'MERCURY', 'JUPITER', 'VENUS', 'MARS']],
  [[7, 11, 19, 24, 30], ['MARS', 'VENUS', 'MERCURY', 'JUPITER', 'SATURN']],
  [[12, 17, 21, 26, 30], ['JUPITER', 'VENUS', 'MERCURY', 'MARS', 'SATURN']],
  [[7, 14, 22, 26, 30], ['MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'MARS']],
  [[7, 13, 20, 25, 30], ['MERCURY', 'VENUS', 'JUPITER', 'MARS', 'SATURN']],
  [[12, 16, 19, 28, 30], ['VENUS', 'JUPITER', 'MERCURY', 'MARS', 'SATURN']],
];

describe('Tajika Hadda table (Table 72)', () => {
  it('matches the published table cell by cell', () => {
    T72.forEach(([ends, lords], i) => {
      expect(TAJIKA_HADDA_TABLE[i].map((s) => s.end)).toEqual(ends);
      expect(TAJIKA_HADDA_TABLE[i].map((s) => s.lord)).toEqual(lords);
      expect(TAJIKA_HADDA_TABLE[i][0].start).toBe(0);
    });
  });
  it('looks up boundaries as [start, end)', () => {
    expect(tajikaHaddaOf(25).lord).toBe('SATURN'); // Ar 25° starts Saturn's hadda
    expect(tajikaHaddaOf(24.999).lord).toBe('MARS');
    expect(tajikaHaddaOf(359.99).lord).toBe('SATURN'); // Pi 28-30
  });
});

describe('Uchcha bala (§28.4.2)', () => {
  it('reproduces the worked example: Jupiter 8°30\' Vi -> 12.94', () => {
    // 275°0' − 158°30' = 116°30'; 116.5/180 × 20 = 12.944
    expect(tajikaUchchaBala(PlanetSymbol.JUPITER, 158.5).score).toBeCloseTo(12.944, 3);
  });
  it('is 20 at deep exaltation and 0 at deep debilitation', () => {
    expect(tajikaUchchaBala(PlanetSymbol.SUN, 10).score).toBeCloseTo(20, 9);
    expect(tajikaUchchaBala(PlanetSymbol.SUN, 190).score).toBeCloseTo(0, 9);
  });
});

describe('Pancha-vargiya Bala — hand-worked chart', () => {
  // Sun 25° Ar, Moon 10° Cn, Mars 20° Li, Mercury 10° Ta, Jupiter 5° Cn, Venus 27° Pi, Saturn 0° Aq.
  const chart = tajikaTestChart(1, { SUN: 25, MOON: 100, MARS: 200, MERCURY: 40, JUPITER: 95, VENUS: 357, SATURN: 300, RAHU: 10, KETU: 190 });
  const r = calculateTajikaPanchaVargiyaBala(chart);
  const get = (p: string) => r.planets.find((x) => x.planet === p)!;

  it('Sun 25° Aries', () => {
    // Kshetra: Mars's sign; Sun→Mars natural friend + temporal enemy (Mars 7th) = sama -> enemy value 7.5 (default AS_ENEMY)
    // Uchcha: |25 − 190| = 165 -> 165/180 × 20 = 18.333
    // Hadda: Ar 25-30 Saturn; natural enemy + temporal friend (Saturn 11th) = sama -> 15/4 = 3.75
    // Drekkana: Ar 20-30 -> Sg (Jupiter); natural friend + temporal friend (Cn is 4th) = adhimitra -> 10/2 = 5
    // Navamsha: Ar 25° = 8th navamsha from Ar = Sc (Mars); sama -> 5/4 = 1.25
    // Total 35.833, /4 = 8.958 (ordinary)
    const s = get('SUN');
    expect(s.kshetra.score).toBe(7.5);
    expect(s.uchcha.score).toBeCloseTo(18.3333, 4);
    expect(s.hadda.lord).toBe('SATURN');
    expect(s.hadda.score).toBe(3.75);
    expect(s.drekkana.lord).toBe('JUPITER');
    expect(s.drekkana.score).toBe(5);
    expect(s.navamsha.lord).toBe('MARS');
    expect(s.navamsha.score).toBe(1.25);
    expect(s.total).toBeCloseTo(35.8333, 4);
    expect(s.vimshopaka).toBeCloseTo(8.9583, 4);
    expect(s.category).toBe('ORDINARY');
  });

  it('Jupiter 5° Cancer (deep exaltation)', () => {
    // Kshetra Moon: friend + temporal enemy (same sign) = sama -> 7.5; Uchcha 20; Hadda Cn 0-7 Mars: friend + friend (Li 4th) -> 7.5
    // Drekkana Cn (Moon) sama -> 2.5; Navamsha Cn 5° = 2nd from Cn = Le (Sun): friend + friend (Ar 10th) -> 2.5. Total 40, /4 = 10.
    const j = get('JUPITER');
    expect([j.kshetra.score, j.uchcha.score, j.hadda.score, j.drekkana.score, j.navamsha.score]).toEqual([7.5, 20, 7.5, 2.5, 2.5]);
    expect(j.vimshopaka).toBe(10);
    expect(j.category).toBe('STRONG');
  });

  it('Saturn 0° Aquarius (own sign)', () => {
    // Kshetra own 30; Uchcha |300 − 20| = 280 -> 80 -> 8.889; Hadda Aq 0-7 Mercury: friend + friend (Ta 4th) -> 7.5
    // Drekkana Aq (own) 10; Navamsha Aq 0° = Li (Venus): friend + friend (Pi 2nd) -> 2.5. Total 58.889, /4 = 14.722.
    const s = get('SATURN');
    expect(s.kshetra.relation).toBe('OWN');
    expect(s.kshetra.score).toBe(30);
    expect(s.uchcha.score).toBeCloseTo(8.8889, 4);
    expect(s.hadda.score).toBe(7.5);
    expect(s.drekkana.score).toBe(10);
    expect(s.navamsha.score).toBe(2.5);
    expect(s.vimshopaka).toBeCloseTo(14.7222, 4);
  });

  it('neutralScoring AS_FRIEND scores a sama lord with the friend value', () => {
    const f = calculateTajikaPanchaVargiyaBala(chart, { neutralScoring: 'AS_FRIEND' });
    expect(f.planets.find((x) => x.planet === 'SUN')!.kshetra.score).toBe(15);
    expect(f.conventionNotes.join(' ')).toMatch(/friend value/);
  });

  it('carries the provisional label and covers the seven planets only', () => {
    expect(r.provisional).toBe(true);
    expect(r.source).toMatch(/§28\.4/);
    expect(r.planets.map((p) => p.planet)).toEqual(['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN']);
  });

  it('classifies per §28.4.6', () => {
    expect([4.99, 5, 9.99, 10, 15, 20, 20.1].map(tajikaPanchaVargiyaCategory)).toEqual(['WEAK', 'ORDINARY', 'ORDINARY', 'STRONG', 'VERY_STRONG', 'VERY_STRONG', 'EXTRAORDINARY']);
  });
});
