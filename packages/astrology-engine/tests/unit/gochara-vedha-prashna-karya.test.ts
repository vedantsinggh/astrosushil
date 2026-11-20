import { describe, it, expect } from 'vitest';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { evaluateGocharaVedha, GOCHARA_VEDHA_TABLE } from '../../src/transit/gochara-vedha';
import { evaluatePrashnaKarya, PRASHNA_DOMAIN_HOUSES } from '../../src/prashna/prashna-karya';
import { ConventionRegistry } from '../../src/metadata/convention-registry';

const { SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU } = PlanetSymbol;

describe('Gochara Vedha (Phaladeepika ch. 26)', () => {
  it('table has the classical favourable houses per planet', () => {
    const fav = (p: PlanetSymbol) => Object.keys(GOCHARA_VEDHA_TABLE[p]).map(Number);
    expect(fav(SUN)).toEqual([3, 6, 10, 11]);
    expect(fav(MOON)).toEqual([1, 3, 6, 7, 10, 11]);
    expect(fav(MARS)).toEqual([3, 6, 11]);
    expect(fav(MERCURY)).toEqual([2, 4, 6, 8, 10, 11]);
    expect(fav(JUPITER)).toEqual([2, 5, 7, 9, 11]);
    expect(fav(VENUS)).toEqual([1, 2, 3, 4, 5, 8, 9, 11, 12]);
    expect(fav(SATURN)).toEqual([3, 6, 11]);
  });

  it('Jupiter in 5th is obstructed by a planet in the 4th', () => {
    const v = evaluateGocharaVedha(JUPITER, { [JUPITER]: 5, [MARS]: 4, [SUN]: 1 });
    expect(v.isFavourableHouse).toBe(true);
    expect(v.pairedHouse).toBe(4);
    expect(v.obstructingPlanets).toEqual([MARS]);
    expect(v.netResult).toBe('FAVOURABLE_OBSTRUCTED');
  });

  it('Sun and Saturn never obstruct each other; Moon and Mercury neither', () => {
    // Sun in 3rd (Vedha 9th) with Saturn in the 9th: exempt.
    expect(evaluateGocharaVedha(SUN, { [SUN]: 3, [SATURN]: 9 }).isObstructed).toBe(false);
    // ...but Mars in the 9th does obstruct.
    expect(evaluateGocharaVedha(SUN, { [SUN]: 3, [MARS]: 9 }).isObstructed).toBe(true);
    // Mercury in 2nd (Vedha 5th) with the Moon in the 5th: exempt.
    expect(evaluateGocharaVedha(MERCURY, { [MERCURY]: 2, [MOON]: 5 }).isObstructed).toBe(false);
  });

  it('Vipareeta Vedha: a planet in the paired favourable house relieves an unfavourable position', () => {
    // Mars in 12th (the Vedha point of its 3rd) with Venus in the 3rd.
    const v = evaluateGocharaVedha(MARS, { [MARS]: 12, [VENUS]: 3 });
    expect(v.isFavourableHouse).toBe(false);
    expect(v.pairedHouse).toBe(3);
    expect(v.isVipareetaVedha).toBe(true);
    expect(v.netResult).toBe('UNFAVOURABLE_OBSTRUCTED');
    // Mars in the 1st is not a Vedha point of any favourable house.
    expect(evaluateGocharaVedha(MARS, { [MARS]: 1, [VENUS]: 3 }).pairedHouse).toBeUndefined();
  });

  it('Rahu/Ketu use the Saturn table and are never obstructers', () => {
    const v = evaluateGocharaVedha(RAHU, { [RAHU]: 11, [MARS]: 5, [KETU]: 5 });
    expect(v.tableUsed).toBe(SATURN);
    expect(v.obstructingPlanets).toEqual([MARS]);
    // Sun is exempt against Saturn's table, hence against the nodes too.
    expect(evaluateGocharaVedha(KETU, { [KETU]: 3, [SUN]: 12 }).isObstructed).toBe(false);
    // A node in the Vedha house does not obstruct.
    expect(evaluateGocharaVedha(SATURN, { [SATURN]: 3, [RAHU]: 12 }).isObstructed).toBe(false);
    expect(evaluateGocharaVedha(RAHU, { [RAHU]: 11 }, 'NONE').netResult).toBe('NOT_EVALUATED');
  });
});

describe('Prashna Karya Bhava and Karya lord', () => {
  const planets = (signs: Partial<Record<PlanetSymbol, number>>): any => {
    const out: any = {};
    for (const [p, sign] of Object.entries(signs)) {
      out[p] = { planet: p, longitude: (sign! - 1) * 30 + 10, rashiIndex: sign, degreeInRashi: 10, speedLongitude: 1, isRetrograde: false };
    }
    return out;
  };

  it('CAREER from an Aries Prashna Lagna -> 10th = Capricorn, lord Saturn', () => {
    const k = evaluatePrashnaKarya('CAREER', 1, planets({ [MARS]: 1, [SATURN]: 7 }));
    expect(k.karyaHouseNumber).toBe(10);
    expect(k.karyaHouseSignIndex).toBe(10);
    expect(k.lagnaLord).toBe(MARS);
    expect(k.karyaLord).toBe(SATURN);
    expect(k.lagnaLordHouse).toBe(1);
    expect(k.karyaLordHouse).toBe(7);
    expect(k.lordsInTajikaAspect).toBe(true); // 7 signs apart = opposition
  });

  it('MARRIAGE from a Leo Prashna Lagna -> 7th = Aquarius, lord Saturn; SELF -> same lord', () => {
    const k = evaluatePrashnaKarya('MARRIAGE', 5, planets({ [SUN]: 5, [SATURN]: 6 }));
    expect([k.karyaHouseNumber, k.karyaLord, k.lagnaLord]).toEqual([7, SATURN, SUN]);
    expect(k.lordsInTajikaAspect).toBe(false); // adjacent signs: no Tajika aspect
    const self = evaluatePrashnaKarya('SELF', 5, planets({ [SUN]: 5 }));
    expect(self.isSameLord).toBe(true);
    expect(self.tajikaYogasBetweenLords).toEqual([]);
  });

  it('every domain maps to a house 1..12', () => {
    for (const h of Object.values(PRASHNA_DOMAIN_HOUSES)) {
      expect(h).toBeGreaterThanOrEqual(1);
      expect(h).toBeLessThanOrEqual(12);
    }
  });
});

describe('Convention registry entries', () => {
  it('exposes ashtakavarga and gochara conventions, case-insensitively', () => {
    const all = ConventionRegistry.getAllConventions();
    expect(all.ashtakavarga.subsystem).toBe('Ashtakavarga Engine');
    expect(all.ashtakavarga.specialRules!.length).toBeGreaterThan(0);
    expect(all.gocharaTransit.subsystem).toBe('Gochara Planetary Transit Engine');
    expect(ConventionRegistry.getConvention('ASHTAKAVARGA').subsystem).toBe('Ashtakavarga Engine');
    expect(ConventionRegistry.getConvention('GOCHARA_TRANSIT').subsystem).toBe('Gochara Planetary Transit Engine');
    expect(ConventionRegistry.getConvention('kp').subsystem).toContain('Krishnamurti');
    expect(ConventionRegistry.getConvention('unknown').subsystem).toBe('Vedic Parashara Foundations');
  });
});
