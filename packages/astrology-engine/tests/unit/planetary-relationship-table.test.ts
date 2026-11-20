import { describe, it, expect } from 'vitest';
import { calculateRelationshipTable, AstroChart, PlanetSymbol } from '../../src/index';

/**
 * Expected values from BPHS ch. 3 (Graha Guna Svarupa), vv. 55–58 (natural friendships of the
 * seven grahas, as tabulated e.g. in R. Santhanam's translation, Vol. 1 p. 33):
 *   Sun: friends Moon, Mars, Jupiter; neutral Mercury; enemies Venus, Saturn.
 *   Moon: friends Sun, Mercury; neutral Mars, Jupiter, Venus, Saturn; no enemies.
 *   Mars: friends Sun, Moon, Jupiter; neutral Venus, Saturn; enemy Mercury.
 *   Mercury: friends Sun, Venus; neutral Mars, Jupiter, Saturn; enemy Moon.
 *   Jupiter: friends Sun, Moon, Mars; neutral Saturn; enemies Mercury, Venus.
 *   Venus: friends Mercury, Saturn; neutral Mars, Jupiter; enemies Sun, Moon.
 *   Saturn: friends Mercury, Venus; neutral Jupiter; enemies Sun, Moon, Mars.
 * Temporal (vv. 59–60): planets in the 2nd, 3rd, 4th, 10th, 11th, 12th from a planet are its
 * temporary friends; the others (1st, 5th–9th) temporary enemies. Compound (vv. 61–62):
 * F+F = great friend, F+N = friend, F+E or E+F = neutral, N+E = enemy, E+E = great enemy.
 */
const NATURAL: Record<string, { F: string[]; N: string[]; E: string[] }> = {
  SUN: { F: ['MOON', 'MARS', 'JUPITER'], N: ['MERCURY'], E: ['VENUS', 'SATURN'] },
  MOON: { F: ['SUN', 'MERCURY'], N: ['MARS', 'JUPITER', 'VENUS', 'SATURN'], E: [] },
  MARS: { F: ['SUN', 'MOON', 'JUPITER'], N: ['VENUS', 'SATURN'], E: ['MERCURY'] },
  MERCURY: { F: ['SUN', 'VENUS'], N: ['MARS', 'JUPITER', 'SATURN'], E: ['MOON'] },
  JUPITER: { F: ['SUN', 'MOON', 'MARS'], N: ['SATURN'], E: ['MERCURY', 'VENUS'] },
  VENUS: { F: ['MERCURY', 'SATURN'], N: ['MARS', 'JUPITER'], E: ['SUN', 'MOON'] },
  SATURN: { F: ['MERCURY', 'VENUS'], N: ['JUPITER'], E: ['SUN', 'MOON', 'MARS'] },
};

/** Minimal chart with planets placed in given signs (only rashiIndex is read). */
function chartWithSigns(signs: Record<string, number>): AstroChart {
  const planets: Record<string, unknown> = {};
  for (const [p, r] of Object.entries(signs)) planets[p] = { planet: p, rashiIndex: r, longitude: (r - 1) * 30 + 10 };
  return { planets } as unknown as AstroChart;
}

describe('calculateRelationshipTable (Panchadha Maitri)', () => {
  // Hand example: Sun in Mesha (1), Moon in Vrishabha (2), Mars in Simha (5), Mercury in Mesha (1),
  // Jupiter in Makara (10), Venus in Meena (12), Saturn in Tula (7), Rahu in Mithuna (3), Ketu in Dhanu (9).
  const signs = { SUN: 1, MOON: 2, MARS: 5, MERCURY: 1, JUPITER: 10, VENUS: 12, SATURN: 7, RAHU: 3, KETU: 9 };
  const t = calculateRelationshipTable(chartWithSigns(signs));
  const cell = (a: string, b: string) => t.cells.find((c) => c.from === a && c.to === b)!;

  it('natural relationships of the seven grahas match BPHS', () => {
    for (const [a, rel] of Object.entries(NATURAL)) {
      for (const b of rel.F) expect(cell(a, b).natural, `${a}->${b}`).toBe('FRIEND');
      for (const b of rel.N) expect(cell(a, b).natural, `${a}->${b}`).toBe('NEUTRAL');
      for (const b of rel.E) expect(cell(a, b).natural, `${a}->${b}`).toBe('ENEMY');
    }
  });

  it('temporal and compound relationships for the hand example', () => {
    // Sun (1) -> Moon (2): 2nd => temporary friend; natural friend => great friend
    expect(cell('SUN', 'MOON')).toMatchObject({ temporal: 'FRIEND', compound: 'GREAT_FRIEND' });
    // Sun (1) -> Mercury (1): same sign => temporary enemy; natural neutral => enemy
    expect(cell('SUN', 'MERCURY')).toMatchObject({ temporal: 'ENEMY', compound: 'ENEMY' });
    // Sun (1) -> Saturn (7): 7th => enemy; natural enemy => great enemy
    expect(cell('SUN', 'SATURN')).toMatchObject({ temporal: 'ENEMY', compound: 'GREAT_ENEMY' });
    // Sun (1) -> Jupiter (10): 10th => friend; natural friend => great friend
    expect(cell('SUN', 'JUPITER')).toMatchObject({ temporal: 'FRIEND', compound: 'GREAT_FRIEND' });
    // Sun (1) -> Venus (12): 12th => friend; natural enemy => neutral
    expect(cell('SUN', 'VENUS')).toMatchObject({ temporal: 'FRIEND', compound: 'NEUTRAL' });
    // Jupiter (10) -> Mars (5): 8th => enemy; natural friend => neutral
    expect(cell('JUPITER', 'MARS')).toMatchObject({ temporal: 'ENEMY', compound: 'NEUTRAL' });
    // Saturn (7) -> Jupiter (10): 4th => friend; natural neutral => friend
    expect(cell('SATURN', 'JUPITER')).toMatchObject({ temporal: 'FRIEND', compound: 'FRIEND' });
    // Moon (2) -> Venus (12): 11th => friend; natural neutral => friend
    expect(cell('MOON', 'VENUS')).toMatchObject({ temporal: 'FRIEND', compound: 'FRIEND' });
  });

  it('covers every ordered pair of the nine planets', () => {
    expect(t.cells.length).toBe(9 * 8);
    expect(t.signs[PlanetSymbol.KETU]).toBe(9);
  });
});
