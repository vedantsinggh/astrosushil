import { describe, it, expect } from 'vitest';
import { MatchmakingCalculator } from '../../src/matchmaking/matchmaking-calculator';
import { DerivedMoonProfile, BhakootDistance } from '../../src/matchmaking/matchmaking.types';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { AstroChart } from '../../src/chart/astro-chart.types';

describe('Phase 6.7B: Bhakoot Terminology, Manglik Audit & Birth-Time Handling', () => {
  const calculator = new MatchmakingCalculator();

  function makeMoonProfile(overrides: Partial<DerivedMoonProfile>): DerivedMoonProfile {
    return {
      moonLongitude: 0,
      rashiIndex: 1, // Aries
      rashiName: 'Mesha',
      rashiLord: PlanetSymbol.MARS,
      nakshatraIndex: 1,
      nakshatraName: 'Ashwini',
      pada: 1,
      nakshatraLord: PlanetSymbol.KETU,
      varna: 'KSHATRIYA',
      varnaRank: 3,
      vashya: 'CHATUSHPADA',
      gana: 'DEVA',
      yoni: { animal: 'HORSE', gender: 'MALE' },
      nadi: 'ADI',
      ...overrides,
    };
  }

  function makeChart(options: {
    marsRashi?: number;
    ascRashi?: number;
    moonRashi?: number;
    venusRashi?: number;
    jupiterRashi?: number;
    isTimeUnknown?: boolean;
    ascLongitude?: number | null;
  }): AstroChart {
    const ascRashi = options.ascRashi ?? 1;
    const isIndeterminate = options.isTimeUnknown || options.ascLongitude === null;

    const chart: any = {
      isTimeUnknown: Boolean(options.isTimeUnknown),
      ascendant: isIndeterminate
        ? { longitude: null, rashiName: 'Indeterminate', isIndeterminate: true }
        : {
            longitude: options.ascLongitude ?? (ascRashi - 1) * 30 + 15,
            rashiIndex: ascRashi,
            rashiName: 'AscendantSign',
          },
      planets: {},
    };

    if (options.marsRashi) {
      chart.planets[PlanetSymbol.MARS] = {
        symbol: PlanetSymbol.MARS,
        rashiIndex: options.marsRashi,
        longitude: (options.marsRashi - 1) * 30 + 10,
        house: isIndeterminate ? undefined : ((options.marsRashi - ascRashi + 12) % 12) + 1,
      };
    }

    if (options.moonRashi) {
      chart.planets[PlanetSymbol.MOON] = {
        symbol: PlanetSymbol.MOON,
        rashiIndex: options.moonRashi,
        longitude: (options.moonRashi - 1) * 30 + 12,
        house: isIndeterminate ? undefined : ((options.moonRashi - ascRashi + 12) % 12) + 1,
      };
    }

    if (options.venusRashi) {
      chart.planets[PlanetSymbol.VENUS] = {
        symbol: PlanetSymbol.VENUS,
        rashiIndex: options.venusRashi,
        longitude: (options.venusRashi - 1) * 30 + 14,
        house: isIndeterminate ? undefined : ((options.venusRashi - ascRashi + 12) % 12) + 1,
      };
    }

    if (options.jupiterRashi) {
      chart.planets[PlanetSymbol.JUPITER] = {
        symbol: PlanetSymbol.JUPITER,
        rashiIndex: options.jupiterRashi,
        longitude: (options.jupiterRashi - 1) * 30 + 16,
        house: isIndeterminate ? undefined : ((options.jupiterRashi - ascRashi + 12) % 12) + 1,
      };
    }

    return chart as AstroChart;
  }

  // ===========================================================================
  // 1. BHAKOOT TERMINOLOGY & SEMANTICS
  // ===========================================================================
  describe('1. Bhakoot Terminology and Semantics', () => {
    it('correctly designates 5/9 relationship as Nav-Pancham (not Shadashtak)', () => {
      // Virgo (6, Mercury) and Taurus (2, Venus)
      const pVirgo = makeMoonProfile({ rashiIndex: 6, rashiName: 'Kanya', rashiLord: PlanetSymbol.MERCURY });
      const pTaurus = makeMoonProfile({ rashiIndex: 2, rashiName: 'Vrishabha', rashiLord: PlanetSymbol.VENUS });

      const result = calculator.calculateBhakoot(pVirgo, pTaurus);

      expect(result.relativeDistance).toBe('5/9');
      expect(result.relationshipName).toBe('Nav-Pancham');
      expect(result.relationshipName).not.toContain('Shadashtak');

      // Raw points in table = 0.00
      expect(result.rawPoints).toBe(0);
      expect(result.nominalPoints).toBe(0);

      // Dosha is mitigated because Mercury and Venus are mutual natural friends
      expect(result.isDoshaCancelled).toBe(true);
      expect(result.effectivePoints).toBe(7);
      expect(result.cancellationReason).toContain('mutual natural friends');
      expect(result.cancellationReason).toContain('Bhakoot Dosh is not Severe since rasi lords are friendly');
    });

    it('correctly designates 6/8 relationship as Shadashtak', () => {
      // Aries (1, Mars) and Virgo (6, Mercury) with different nakshatras
      const pAries = makeMoonProfile({ rashiIndex: 1, rashiName: 'Mesha', rashiLord: PlanetSymbol.MARS, nakshatraIndex: 1, nakshatraName: 'Ashwini' });
      const pVirgo = makeMoonProfile({ rashiIndex: 6, rashiName: 'Kanya', rashiLord: PlanetSymbol.MERCURY, nakshatraIndex: 13, nakshatraName: 'Hasta' });

      const result = calculator.calculateBhakoot(pAries, pVirgo);

      expect(result.relativeDistance).toBe('6/8');
      expect(result.relationshipName).toBe('Shadashtak');
      expect(result.condition).toBe('DOSHA');
      expect(result.rawPoints).toBe(0);
      expect(result.isDoshaCancelled).toBe(false);
      expect(result.effectivePoints).toBe(0);
    });

    it('correctly designates 2/12 relationship as Dwi-Dwadash', () => {
      // Gemini (3, Mercury) and Cancer (4, Moon)
      const pGemini = makeMoonProfile({ rashiIndex: 3, rashiName: 'Mithuna', rashiLord: PlanetSymbol.MERCURY });
      const pCancer = makeMoonProfile({ rashiIndex: 4, rashiName: 'Karka', rashiLord: PlanetSymbol.MOON });

      const result = calculator.calculateBhakoot(pGemini, pCancer);

      expect(result.relativeDistance).toBe('2/12');
      expect(result.relationshipName).toBe('Dwi-Dwadash');
      expect(result.condition).toBe('DOSHA');
      expect(result.rawPoints).toBe(0);
    });

    describe('6/8 Shadashtak Cancellation & Non-Cancellation Cases', () => {
      it('cancels 6/8 when signs share the same planetary lord (Aries & Scorpio: Mars)', () => {
        const pAries = makeMoonProfile({ rashiIndex: 1, rashiName: 'Mesha', rashiLord: PlanetSymbol.MARS });
        const pScorpio = makeMoonProfile({ rashiIndex: 8, rashiName: 'Vrischika', rashiLord: PlanetSymbol.MARS });

        const result = calculator.calculateBhakoot(pAries, pScorpio);
        expect(result.relativeDistance).toBe('6/8');
        expect(result.relationshipName).toBe('Shadashtak');
        expect(result.isDoshaCancelled).toBe(true);
        expect(result.cancellationReason).toContain('same planetary lord (MARS)');
        expect(result.effectivePoints).toBe(7);
      });

      it('cancels 6/8 when signs share the same planetary lord (Taurus & Libra: Venus)', () => {
        const pTaurus = makeMoonProfile({ rashiIndex: 2, rashiName: 'Vrishabha', rashiLord: PlanetSymbol.VENUS });
        const pLibra = makeMoonProfile({ rashiIndex: 7, rashiName: 'Tula', rashiLord: PlanetSymbol.VENUS });

        const result = calculator.calculateBhakoot(pTaurus, pLibra);
        expect(result.relativeDistance).toBe('6/8');
        expect(result.isDoshaCancelled).toBe(true);
        expect(result.effectivePoints).toBe(7);
      });

      it('cancels 6/8 when sign lords are mutual natural friends (Pisces & Leo: Jupiter & Sun)', () => {
        const pPisces = makeMoonProfile({ rashiIndex: 12, rashiName: 'Meena', rashiLord: PlanetSymbol.JUPITER });
        const pLeo = makeMoonProfile({ rashiIndex: 5, rashiName: 'Simha', rashiLord: PlanetSymbol.SUN });

        const result = calculator.calculateBhakoot(pPisces, pLeo);
        expect(result.relativeDistance).toBe('6/8');
        expect(result.isDoshaCancelled).toBe(true);
        expect(result.effectivePoints).toBe(7);
      });

      it('does NOT cancel 6/8 when sign lords are mutual enemies (Leo & Capricorn: Sun & Saturn)', () => {
        const pLeo = makeMoonProfile({ rashiIndex: 5, rashiName: 'Simha', rashiLord: PlanetSymbol.SUN, nakshatraIndex: 10, nakshatraName: 'Magha' });
        const pCap = makeMoonProfile({ rashiIndex: 10, rashiName: 'Makara', rashiLord: PlanetSymbol.SATURN, nakshatraIndex: 22, nakshatraName: 'Shravana' });

        const result = calculator.calculateBhakoot(pLeo, pCap);
        expect(result.relativeDistance).toBe('6/8');
        expect(result.isDoshaCancelled).toBe(false);
        expect(result.rawPoints).toBe(0);
        expect(result.effectivePoints).toBe(0);
      });
    });

    describe('2/12 Dwi-Dwadash Cancellation & Non-Cancellation Cases', () => {
      it('cancels 2/12 when signs share the same lord (Capricorn & Aquarius: Saturn)', () => {
        const pCap = makeMoonProfile({ rashiIndex: 10, rashiName: 'Makara', rashiLord: PlanetSymbol.SATURN, nakshatraIndex: 22, nakshatraName: 'Shravana' });
        const pAqua = makeMoonProfile({ rashiIndex: 11, rashiName: 'Kumbha', rashiLord: PlanetSymbol.SATURN, nakshatraIndex: 24, nakshatraName: 'Shatabhisha' });

        const result = calculator.calculateBhakoot(pCap, pAqua);
        expect(result.relativeDistance).toBe('2/12');
        expect(result.relationshipName).toBe('Dwi-Dwadash');
        expect(result.isDoshaCancelled).toBe(true);
        expect(result.effectivePoints).toBe(7);
      });

      it('cancels 2/12 when sign lords are mutual friends (Cancer & Leo: Moon & Sun)', () => {
        const pCancer = makeMoonProfile({ rashiIndex: 4, rashiName: 'Karka', rashiLord: PlanetSymbol.MOON, nakshatraIndex: 8, nakshatraName: 'Pushya' });
        const pLeo = makeMoonProfile({ rashiIndex: 5, rashiName: 'Simha', rashiLord: PlanetSymbol.SUN, nakshatraIndex: 10, nakshatraName: 'Magha' });

        const result = calculator.calculateBhakoot(pCancer, pLeo);
        expect(result.relativeDistance).toBe('2/12');
        expect(result.isDoshaCancelled).toBe(true);
        expect(result.effectivePoints).toBe(7);
      });

      it('does NOT cancel 2/12 when sign lords are not mutual friends (Leo & Virgo: Sun & Mercury)', () => {
        const pLeo = makeMoonProfile({ rashiIndex: 5, rashiName: 'Simha', rashiLord: PlanetSymbol.SUN, nakshatraIndex: 10, nakshatraName: 'Magha' });
        const pVirgo = makeMoonProfile({ rashiIndex: 6, rashiName: 'Kanya', rashiLord: PlanetSymbol.MERCURY, nakshatraIndex: 13, nakshatraName: 'Hasta' });

        const result = calculator.calculateBhakoot(pLeo, pVirgo);
        expect(result.relativeDistance).toBe('2/12');
        expect(result.isDoshaCancelled).toBe(false);
        expect(result.rawPoints).toBe(0);
        expect(result.effectivePoints).toBe(0);
      });
    });
  });

  // ===========================================================================
  // 2. MANGLIK RULES AUDIT
  // ===========================================================================
  describe('2. Audit Manglik Rules (Lagna, Moon, Venus & Indeterminacy)', () => {
    it('evaluates Manglik positive from Lagna (Mars in 1st, 4th, 7th, 8th, 12th)', () => {
      // Ascendant = Aries (1), Mars in Cancer (4) -> 4th house from Lagna
      const chart = makeChart({ ascRashi: 1, marsRashi: 4, moonRashi: 9 });
      const status = calculator.evaluateManglikDosha(chart);

      expect(status.isManglik).toBe(true);
      expect(status.statusFromLagna).toBe('MANGLIK');
      expect(status.marsPlacement.houseFromLagna).toBe(4);
      expect(status.effectiveManglik).toBe(true);
      expect(status.status).toBe('Present');
    });

    it('evaluates Non-Manglik from Lagna (Mars in 11th house, matching Puneet Kumar)', () => {
      // Ascendant = Scorpio (8), Mars in Virgo (6) -> ((6 - 8 + 12) % 12) + 1 = 11th house
      const chart = makeChart({ ascRashi: 8, marsRashi: 6, moonRashi: 6 });
      const status = calculator.evaluateManglikDosha(chart);

      expect(status.isManglik).toBe(false);
      expect(status.statusFromLagna).toBe('NON_MANGLIK');
      expect(status.marsPlacement.houseFromLagna).toBe(11);
      expect(status.effectiveManglik).toBe(false);
      expect(status.status).toBe('Not Present');
    });

    it('evaluates Non-Manglik from Lagna (Mars in 10th house, matching Aditi Harish)', () => {
      // Ascendant = Leo (5), Mars in Taurus (2) -> ((2 - 5 + 12) % 12) + 1 = 10th house
      const chart = makeChart({ ascRashi: 5, marsRashi: 2, moonRashi: 2 });
      const status = calculator.evaluateManglikDosha(chart);

      expect(status.isManglik).toBe(false);
      expect(status.statusFromLagna).toBe('NON_MANGLIK');
      expect(status.marsPlacement.houseFromLagna).toBe(10);
      expect(status.effectiveManglik).toBe(false);
      expect(status.status).toBe('Not Present');
    });

    it('cancels Manglik dosha when Mars is in own sign Aries in 1st house', () => {
      const chart = makeChart({ ascRashi: 1, marsRashi: 1 });
      const status = calculator.evaluateManglikDosha(chart);

      expect(status.isManglik).toBe(true);
      expect(status.isCancelled).toBe(true);
      expect(status.effectiveManglik).toBe(false);
      expect(status.cancellationFactors).toContain('Mars in own sign (Aries) in 1st house');
    });

    it('cancels Manglik dosha when Jupiter aspects Mars', () => {
      // Ascendant = Aries (1), Mars in Libra (7) [7th house Manglik]
      // Jupiter in Gemini (3) -> aspects 5th house from itself = Gemini + 4 signs = Libra (7)
      const chart = makeChart({ ascRashi: 1, marsRashi: 7, jupiterRashi: 3 });
      const status = calculator.evaluateManglikDosha(chart);

      expect(status.isManglik).toBe(true);
      expect(status.isCancelled).toBe(true);
      expect(status.effectiveManglik).toBe(false);
      expect(status.cancellationFactors).toEqual(
        expect.arrayContaining([expect.stringContaining('Benefic Jupiter aspects Mars')])
      );
    });

    it('strictly marks Lagna Manglik as INDETERMINATE when birth time is unknown (never falsely Non-Manglik)', () => {
      // Missing birth time: Ascendant is indeterminate
      const chart = makeChart({ isTimeUnknown: true, marsRashi: 1, moonRashi: 6 });
      const status = calculator.evaluateManglikDosha(chart);

      expect(status.isIndeterminate).toBe(true);
      expect(status.statusFromLagna).toBe('INDETERMINATE');
      expect(status.marsPlacement.houseFromLagna).toBeUndefined();
      expect(status.severity).toBe('INDETERMINATE');
      expect(status.status).toBe('Indeterminate');
    });

    it('compareManglikDosha returns INDETERMINATE_BIRTH_TIME_REQUIRED when either partner has unknown birth time', () => {
      const chartTimed = makeChart({ ascRashi: 8, marsRashi: 6 }); // Non-Manglik timed
      const chartUntimed = makeChart({ isTimeUnknown: true, marsRashi: 2 }); // Untimed

      const statusA = calculator.evaluateManglikDosha(chartTimed);
      const statusB = calculator.evaluateManglikDosha(chartUntimed);

      const comparison = calculator.compareManglikDosha(statusA, statusB);

      expect(comparison.verdict).toBe('INDETERMINATE_BIRTH_TIME_REQUIRED');
      expect(comparison.isDoshaCancelledByMatch).toBe(false);
      expect(comparison.explanation).toContain('Verified birth time is required');
    });

    it('compareManglikDosha returns BOTH_NON_MANGLIK for verified Puneet & Aditi charts', () => {
      const maleChart = makeChart({ ascRashi: 8, marsRashi: 6 }); // Scorpio Lagna, Mars in 11th
      const femaleChart = makeChart({ ascRashi: 5, marsRashi: 2 }); // Leo Lagna, Mars in 10th

      const statusA = calculator.evaluateManglikDosha(maleChart);
      const statusB = calculator.evaluateManglikDosha(femaleChart);

      const comparison = calculator.compareManglikDosha(statusA, statusB);

      expect(comparison.verdict).toBe('BOTH_NON_MANGLIK');
      expect(comparison.isDoshaCancelledByMatch).toBe(true);
    });
  });

  // ===========================================================================
  // 3. UNKNOWN BIRTH TIME & MOON TRANSIT STABILITY
  // ===========================================================================
  describe('3. Unknown Birth-Time Handling & Moon Stability Analysis', () => {
    it('detects stable Moon across the entire 24-hour day (1995-03-03: Pisces / Uttara Bhadrapada)', () => {
      const stability = calculator.checkMoonStability('1995-03-03');

      expect(stability.isStable).toBe(true);
      expect(stability.startMoon.rashiName).toBe('Meena');
      expect(stability.endMoon.rashiName).toBe('Meena');
      expect(stability.startMoon.nakshatraName).toBe('Uttara Bhadrapada');
      expect(stability.endMoon.nakshatraName).toBe('Uttara Bhadrapada');
      expect(stability.transitionDescription).toBeUndefined();
    });

    it('detects Moon transit across sign/nakshatra on Puneet Kumar date (1983-12-28: Virgo to Libra)', () => {
      const stability = calculator.checkMoonStability('1983-12-28');

      expect(stability.isStable).toBe(false);
      expect(stability.startMoon.rashiName).toBe('Kanya');
      expect(stability.endMoon.rashiName).toBe('Tula');
      expect(stability.transitionDescription).toBeDefined();
      expect(stability.transitionDescription).toContain('transitions');
    });

    it('detects Moon transit across sign/nakshatra on Aditi Harish date (1992-08-21: Aries to Taurus)', () => {
      const stability = calculator.checkMoonStability('1992-08-21');

      expect(stability.isStable).toBe(false);
      expect(stability.startMoon.rashiName).toBe('Mesha');
      expect(stability.endMoon.rashiName).toBe('Vrishabha');
      expect(stability.transitionDescription).toBeDefined();
    });

    it('confirms Moon stability when approximate time window is supplied (1983-12-28 between 04:00 and 06:00 IST)', () => {
      // Between 04:00:00 and 06:00:00, Moon stays in Virgo (Chitra)
      const stability = calculator.checkMoonStability('1983-12-28', {
        timeWindow: { startTime: '04:00:00', endTime: '06:00:00' },
      });

      expect(stability.isStable).toBe(true);
      expect(stability.startMoon.rashiName).toBe('Kanya');
      expect(stability.endMoon.rashiName).toBe('Kanya');
      expect(stability.startMoon.nakshatraName).toBe('Chitra');
      expect(stability.endMoon.nakshatraName).toBe('Chitra');
    });
  });

  // ===========================================================================
  // 4. MULTI-REFERENCE POINT MANGLIK DOSHA & SCORE SEMANTICS RECONCILIATION
  // ===========================================================================
  describe('4. Multi-Reference Point Manglik Evidence & Bhakoot Semantics Invariants', () => {
    it('exposes separate independent evidence for Lagna, Moon, and Venus reference points', () => {
      // Ascendant = Aries (1), Moon = Taurus (2), Venus = Gemini (3), Mars = Cancer (4)
      // From Lagna (1): Mars is in 4th house -> MANGLIK
      // From Moon (2): Mars is in 3rd house -> NON_MANGLIK
      // From Venus (3): Mars is in 2nd house -> NON_MANGLIK (per [1,4,7,8,12] rule)
      const chart = makeChart({ ascRashi: 1, moonRashi: 2, venusRashi: 3, marsRashi: 4 });
      const status = calculator.evaluateManglikDosha(chart);

      expect(status.statusFromLagna).toBe('MANGLIK');
      expect(status.marsPlacement.houseFromLagna).toBe(4);
      expect(status.manglikHousesFromLagna).toEqual([4]);

      expect(status.statusFromMoon).toBe('NON_MANGLIK');
      expect(status.marsPlacement.houseFromMoon).toBe(3);
      expect(status.manglikHousesFromMoon).toEqual([]);

      expect(status.statusFromVenus).toBe('NON_MANGLIK');
      expect(status.marsPlacement.houseFromVenus).toBe(2);
      expect(status.manglikHousesFromVenus).toEqual([]);
    });

    it('returns INDETERMINATE for Moon or Venus reference point when respective planet is missing/indeterminate', () => {
      // Chart with Mars and Lagna, but no Moon and no Venus
      const chart: any = {
        isTimeUnknown: false,
        ascendant: { longitude: 15, rashiIndex: 1, rashiName: 'Mesha' },
        planets: {
          [PlanetSymbol.MARS]: { symbol: PlanetSymbol.MARS, rashiIndex: 4, longitude: 100 },
        },
      };

      const status = calculator.evaluateManglikDosha(chart);
      expect(status.statusFromLagna).toBe('MANGLIK');
      expect(status.statusFromMoon).toBe('INDETERMINATE');
      expect(status.marsPlacement.houseFromMoon).toBeUndefined();
      expect(status.statusFromVenus).toBe('INDETERMINATE');
      expect(status.marsPlacement.houseFromVenus).toBeUndefined();
    });

    it('strictly preserves Bhakoot score semantics: rawPoints=0, nominalPoints=0, effectivePoints=7, sum=23.50', () => {
      // Canonical Puneet (Virgo) & Aditi Harish (Taurus) 5/9 Nav-Pancham
      const pPuneet = makeMoonProfile({
        rashiIndex: 6,
        rashiName: 'Kanya',
        rashiLord: PlanetSymbol.MERCURY,
        nakshatraIndex: 14,
        nakshatraName: 'Chitra',
        pada: 2,
        varnaRank: 2,
        vashya: 'MANAVA',
        yoni: { animal: 'TIGER', gender: 'FEMALE' },
        gana: 'RAKSHASA',
        nadi: 'MADHYA',
      });

      const pAditi = makeMoonProfile({
        rashiIndex: 2,
        rashiName: 'Vrishabha',
        rashiLord: PlanetSymbol.VENUS,
        nakshatraIndex: 3,
        nakshatraName: 'Krittika',
        pada: 2,
        varnaRank: 2,
        vashya: 'CHATUSHPADA',
        yoni: { animal: 'SHEEP', gender: 'FEMALE' },
        gana: 'RAKSHASA',
        nadi: 'ANTYA',
      });

      const ashtakoota = calculator.calculateAshtakoota(pPuneet, pAditi);

      // Verify each individual koota score matches reference PDF
      expect(ashtakoota.kootas.varna.obtainedPoints).toBe(1);
      expect(ashtakoota.kootas.vashya.obtainedPoints).toBe(1);
      expect(ashtakoota.kootas.tara.obtainedPoints).toBe(1.5);
      expect(ashtakoota.kootas.yoni.obtainedPoints).toBe(1);
      expect(ashtakoota.kootas.grahaMaitri.obtainedPoints).toBe(5);
      expect(ashtakoota.kootas.gana.obtainedPoints).toBe(6);
      expect(ashtakoota.kootas.bhakoot.rawPoints).toBe(0);
      expect(ashtakoota.kootas.bhakoot.nominalPoints).toBe(0);
      expect(ashtakoota.kootas.bhakoot.obtainedPoints).toBe(0);
      expect(ashtakoota.kootas.bhakoot.effectivePoints).toBe(7);
      expect(ashtakoota.kootas.nadi.obtainedPoints).toBe(8);

      // Verify final raw total strictly equals the sum of the 8 displayed scores: 23.50 / 36.00
      expect(ashtakoota.totalObtainedPoints).toBe(23.5);
      // Effective points with mitigation is 30.50, but kept separate
      expect(ashtakoota.totalEffectivePoints).toBe(30.5);
    });
  });
});
