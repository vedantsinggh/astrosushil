import { describe, it, expect } from 'vitest';
import { MatchmakingCalculator } from '../../src/matchmaking/matchmaking-calculator';
import { DerivedMoonProfile } from '../../src/matchmaking/matchmaking.types';
import { PlanetSymbol } from '../../src/planets/planet.types';

describe('MatchmakingCalculator - 8 Kootas & Manglik Engine (Phase 2U)', () => {
  const calculator = new MatchmakingCalculator();

  // Helper factory to create sample Moon profiles for deterministic testing
  function createProfile(overrides: Partial<DerivedMoonProfile>): DerivedMoonProfile {
    return {
      moonLongitude: 0,
      rashiIndex: 1, // Aries
      rashiName: 'Mesha',
      rashiLord: PlanetSymbol.MARS,
      nakshatraIndex: 1, // Ashwini
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

  // 1. VARNA KOOTA
  describe('Varna Koota (Max 1 Point)', () => {
    it('awards 1 point when Groom Varna rank >= Bride Varna rank', () => {
      const groom = createProfile({ varna: 'BRAHMIN', varnaRank: 4 });
      const bride = createProfile({ varna: 'KSHATRIYA', varnaRank: 3 });
      const result = calculator.calculateVarna(groom, bride);

      expect(result.maxPoints).toBe(1);
      expect(result.obtainedPoints).toBe(1);
      expect(result.personARank).toBe(4);
      expect(result.personBRank).toBe(3);
    });

    it('awards 1 point when Groom and Bride have equal Varna rank', () => {
      const groom = createProfile({ varna: 'VAISHYA', varnaRank: 2 });
      const bride = createProfile({ varna: 'VAISHYA', varnaRank: 2 });
      const result = calculator.calculateVarna(groom, bride);

      expect(result.obtainedPoints).toBe(1);
      expect(result.isSymmetric).toBe(true);
    });

    it('awards 0 points when Groom Varna rank < Bride Varna rank (Directional rule)', () => {
      const groom = createProfile({ varna: 'SHUDRA', varnaRank: 1 });
      const bride = createProfile({ varna: 'BRAHMIN', varnaRank: 4 });
      const result = calculator.calculateVarna(groom, bride);

      expect(result.obtainedPoints).toBe(0);
      expect(result.isSymmetric).toBe(false);
    });
  });

  // 2. VASHYA KOOTA
  describe('Vashya Koota (Max 2 Points)', () => {
    it('awards 2 points for identical Rashis (Same Vashya)', () => {
      const pA = createProfile({ rashiIndex: 1, vashya: 'CHATUSHPADA' });
      const pB = createProfile({ rashiIndex: 1, vashya: 'CHATUSHPADA' });
      const result = calculator.calculateVashya(pA, pB);

      expect(result.maxPoints).toBe(2);
      expect(result.obtainedPoints).toBe(2);
      expect(result.relationship).toBe('SAME_VASHYA');
    });

    it('awards 2 points for mutually vashya pairs (e.g. Taurus & Libra)', () => {
      const pA = createProfile({ rashiIndex: 2, vashya: 'CHATUSHPADA' }); // Taurus
      const pB = createProfile({ rashiIndex: 7, vashya: 'MANAVA' });       // Libra
      const result = calculator.calculateVashya(pA, pB);

      expect(result.obtainedPoints).toBe(2);
    });

    it('awards 0 points for hostile Vashya combinations (e.g. Leo vs Gemini/Cancer/Scorpio)', () => {
      const pA = createProfile({ rashiIndex: 5, vashya: 'VANACHARA' }); // Leo
      const pB = createProfile({ rashiIndex: 3, vashya: 'MANAVA' });     // Gemini
      const result = calculator.calculateVashya(pA, pB);

      expect(result.obtainedPoints).toBe(0);
      expect(result.relationship).toBe('ENEMY_VASHYA');
    });
  });

  // 3. TARA KOOTA
  describe('Tara Koota (Max 3 Points)', () => {
    it('awards 3 points when both counts result in auspicious Taras', () => {
      // Ashwini (1) and Bharani (2)
      // 1 -> 2: count 2 (Sampat - Auspicious)
      // 2 -> 1: count 27 -> 27 % 9 = 9 (Parama Mitra - Auspicious)
      const pA = createProfile({ nakshatraIndex: 1, nakshatraName: 'Ashwini' });
      const pB = createProfile({ nakshatraIndex: 2, nakshatraName: 'Bharani' });
      const result = calculator.calculateTara(pA, pB);

      expect(result.maxPoints).toBe(3);
      expect(result.obtainedPoints).toBe(3);
      expect(result.personAToB.isAuspicious).toBe(true);
      expect(result.personBToA.isAuspicious).toBe(true);
      expect(result.isSymmetric).toBe(true);
    });

    it('awards 1.5 points when one direction is auspicious and other is inauspicious', () => {
      // Ashwini (1) and Krittika (3)
      // 1 -> 3: count 3 (Vipat - Inauspicious)
      // 3 -> 1: count 26 -> 26 % 9 = 8 (Mitra - Auspicious)
      const pA = createProfile({ nakshatraIndex: 1, nakshatraName: 'Ashwini' });
      const pB = createProfile({ nakshatraIndex: 3, nakshatraName: 'Krittika' });
      const result = calculator.calculateTara(pA, pB);

      expect(result.obtainedPoints).toBe(1.5);
      expect(result.personAToB.isAuspicious).toBe(false);
      expect(result.personBToA.isAuspicious).toBe(true);
    });
  });

  // 4. YONI KOOTA
  describe('Yoni Koota (Max 4 Points)', () => {
    it('awards 4 points for Swayoni (Same Animal Yoni)', () => {
      const pA = createProfile({ yoni: { animal: 'HORSE', gender: 'MALE' } });
      const pB = createProfile({ yoni: { animal: 'HORSE', gender: 'FEMALE' } });
      const result = calculator.calculateYoni(pA, pB);

      expect(result.maxPoints).toBe(4);
      expect(result.obtainedPoints).toBe(4);
      expect(result.relationshipCategory).toBe('SWAYONI');
    });

    it('awards 0 points for deadly sworn enemy Yonis (e.g. Serpent vs Mongoose)', () => {
      const pA = createProfile({ yoni: { animal: 'SERPENT', gender: 'MALE' } });
      const pB = createProfile({ yoni: { animal: 'MONGOOSE', gender: 'MALE' } });
      const result = calculator.calculateYoni(pA, pB);

      expect(result.obtainedPoints).toBe(0);
      expect(result.relationshipCategory).toBe('SWORN_ENEMY');
    });

    it('awards 0 points for Cow vs Tiger Yoni pair', () => {
      const pA = createProfile({ yoni: { animal: 'COW', gender: 'MALE' } });
      const pB = createProfile({ yoni: { animal: 'TIGER', gender: 'FEMALE' } });
      const result = calculator.calculateYoni(pA, pB);

      expect(result.obtainedPoints).toBe(0);
      expect(result.relationshipCategory).toBe('SWORN_ENEMY');
    });

    it('awards 3 points for friendly Yoni pairs (e.g. Horse vs Monkey)', () => {
      const pA = createProfile({ yoni: { animal: 'HORSE', gender: 'MALE' } });
      const pB = createProfile({ yoni: { animal: 'MONKEY', gender: 'FEMALE' } });
      const result = calculator.calculateYoni(pA, pB);

      expect(result.obtainedPoints).toBe(3);
      expect(result.relationshipCategory).toBe('FRIEND');
    });
  });

  // 5. GRAHA MAITRI KOOTA
  describe('Graha Maitri Koota (Max 5 Points)', () => {
    it('awards 5 points when both Moon signs share the same ruler', () => {
      const pA = createProfile({ rashiIndex: 1, rashiLord: PlanetSymbol.MARS }); // Aries
      const pB = createProfile({ rashiIndex: 8, rashiLord: PlanetSymbol.MARS }); // Scorpio
      const result = calculator.calculateGrahaMaitri(pA, pB);

      expect(result.maxPoints).toBe(5);
      expect(result.obtainedPoints).toBe(5);
      expect(result.combinedFriendship).toBe('SAME_LORD');
    });

    it('awards 5 points when Moon sign lords are mutual natural friends (e.g. Sun & Mars)', () => {
      const pA = createProfile({ rashiIndex: 5, rashiLord: PlanetSymbol.SUN });  // Leo
      const pB = createProfile({ rashiIndex: 1, rashiLord: PlanetSymbol.MARS }); // Aries
      const result = calculator.calculateGrahaMaitri(pA, pB);

      expect(result.obtainedPoints).toBe(5);
      expect(result.combinedFriendship).toBe('MUTUAL_FRIENDS');
    });

    it('awards 4 points when one lord is Friend and the other is Neutral (e.g. Sun & Mercury)', () => {
      const pA = createProfile({ rashiIndex: 5, rashiLord: PlanetSymbol.SUN });     // Leo
      const pB = createProfile({ rashiIndex: 3, rashiLord: PlanetSymbol.MERCURY }); // Gemini
      const result = calculator.calculateGrahaMaitri(pA, pB);

      expect(result.obtainedPoints).toBe(4);
      expect(result.combinedFriendship).toBe('FRIEND_AND_NEUTRAL');
    });

    it('awards 0.5 points for Neutral & Enemy pair (e.g. Mars & Saturn)', () => {
      const pA = createProfile({ rashiIndex: 1, rashiLord: PlanetSymbol.MARS });   // Aries (Mars considers Saturn neutral)
      const pB = createProfile({ rashiIndex: 10, rashiLord: PlanetSymbol.SATURN }); // Capricorn (Saturn considers Mars enemy)
      const result = calculator.calculateGrahaMaitri(pA, pB);

      expect(result.obtainedPoints).toBe(0.5);
      expect(result.combinedFriendship).toBe('NEUTRAL_AND_ENEMY');
    });

    it('awards 0 points for Mutual Enemies (e.g. Sun & Saturn)', () => {
      const pA = createProfile({ rashiIndex: 5, rashiLord: PlanetSymbol.SUN });     // Leo
      const pB = createProfile({ rashiIndex: 10, rashiLord: PlanetSymbol.SATURN }); // Capricorn
      const result = calculator.calculateGrahaMaitri(pA, pB);

      expect(result.obtainedPoints).toBe(0);
      expect(result.combinedFriendship).toBe('MUTUAL_ENEMIES');
    });
  });

  // 6. GANA KOOTA
  describe('Gana Koota (Max 6 Points)', () => {
    it('awards 6 points for identical Ganas (Deva-Deva, Manushya-Manushya, Rakshasa-Rakshasa)', () => {
      const devA = createProfile({ gana: 'DEVA' });
      const devB = createProfile({ gana: 'DEVA' });
      expect(calculator.calculateGana(devA, devB).obtainedPoints).toBe(6);

      const manA = createProfile({ gana: 'MANUSHYA' });
      const manB = createProfile({ gana: 'MANUSHYA' });
      expect(calculator.calculateGana(manA, manB).obtainedPoints).toBe(6);

      const rakA = createProfile({ gana: 'RAKSHASA' });
      const rakB = createProfile({ gana: 'RAKSHASA' });
      expect(calculator.calculateGana(rakA, rakB).obtainedPoints).toBe(6);
    });

    it('awards 6 points for Deva Groom + Manushya Bride', () => {
      const groom = createProfile({ gana: 'DEVA' });
      const bride = createProfile({ gana: 'MANUSHYA' });
      const result = calculator.calculateGana(groom, bride);

      expect(result.maxPoints).toBe(6);
      expect(result.obtainedPoints).toBe(6);
    });

    it('awards 5 points for Manushya Groom + Deva Bride', () => {
      const groom = createProfile({ gana: 'MANUSHYA' });
      const bride = createProfile({ gana: 'DEVA' });
      const result = calculator.calculateGana(groom, bride);

      expect(result.obtainedPoints).toBe(5);
    });

    it('awards 1 point for Deva Groom + Rakshasa Bride', () => {
      const groom = createProfile({ gana: 'DEVA' });
      const bride = createProfile({ gana: 'RAKSHASA' });
      const result = calculator.calculateGana(groom, bride);

      expect(result.obtainedPoints).toBe(1);
    });

    it('awards 0 points for Rakshasa Groom + Deva Bride or Manushya/Rakshasa combinations', () => {
      const rakGroom = createProfile({ gana: 'RAKSHASA' });
      const devBride = createProfile({ gana: 'DEVA' });
      expect(calculator.calculateGana(rakGroom, devBride).obtainedPoints).toBe(0);

      const manGroom = createProfile({ gana: 'MANUSHYA' });
      const rakBride = createProfile({ gana: 'RAKSHASA' });
      expect(calculator.calculateGana(manGroom, rakBride).obtainedPoints).toBe(0);
    });
  });

  // 7. BHAKOOT KOOTA
  describe('Bhakoot Koota (Max 7 Points)', () => {
    it('awards 7 points for auspicious relative positions (1/1, 3/11, 4/10, 7/7)', () => {
      // 1/1
      const p1 = createProfile({ rashiIndex: 1, rashiName: 'Mesha', rashiLord: PlanetSymbol.MARS });
      const p2 = createProfile({ rashiIndex: 1, rashiName: 'Mesha', rashiLord: PlanetSymbol.MARS });
      expect(calculator.calculateBhakoot(p1, p2).obtainedPoints).toBe(7);

      // 3/11 (Aries & Gemini)
      const pGem = createProfile({ rashiIndex: 3, rashiName: 'Mithuna', rashiLord: PlanetSymbol.MERCURY });
      expect(calculator.calculateBhakoot(p1, pGem).obtainedPoints).toBe(7);

      // 4/10 (Aries & Cancer)
      const pCan = createProfile({ rashiIndex: 4, rashiName: 'Karka', rashiLord: PlanetSymbol.MOON });
      expect(calculator.calculateBhakoot(p1, pCan).obtainedPoints).toBe(7);

      // 7/7 (Aries & Libra)
      const pLib = createProfile({ rashiIndex: 7, rashiName: 'Tula', rashiLord: PlanetSymbol.VENUS });
      expect(calculator.calculateBhakoot(p1, pLib).obtainedPoints).toBe(7);
    });

    it('awards 0 points for unmitigated Bhakoot Dosha (e.g. 6/8 Aries & Virgo)', () => {
      // Aries (Mars) & Virgo (Mercury) -> 6/8, lords are enemies
      const pAries = createProfile({ rashiIndex: 1, rashiName: 'Mesha', rashiLord: PlanetSymbol.MARS, nakshatraIndex: 1, nakshatraName: 'Ashwini' });
      const pVirgo = createProfile({ rashiIndex: 6, rashiName: 'Kanya', rashiLord: PlanetSymbol.MERCURY, nakshatraIndex: 13, nakshatraName: 'Hasta' });
      const result = calculator.calculateBhakoot(pAries, pVirgo);

      expect(result.maxPoints).toBe(7);
      expect(result.obtainedPoints).toBe(0);
      expect(result.condition).toBe('DOSHA');
      expect(result.isDoshaCancelled).toBe(false);
    });

    it('cancels Bhakoot Dosha when both signs share the same planetary lord (e.g. 6/8 Aries & Scorpio)', () => {
      // Aries (1, Mars) and Scorpio (8, Mars) -> 6/8 distance, but same ruler Mars
      const pAries = createProfile({ rashiIndex: 1, rashiName: 'Mesha', rashiLord: PlanetSymbol.MARS });
      const pScorpio = createProfile({ rashiIndex: 8, rashiName: 'Vrischika', rashiLord: PlanetSymbol.MARS });
      const result = calculator.calculateBhakoot(pAries, pScorpio);

      expect(result.obtainedPoints).toBe(7);
      expect(result.isDoshaCancelled).toBe(true);
      expect(result.cancellationReason).toContain('ruled by the same planetary lord');
    });

    it('cancels Bhakoot Dosha when sign lords are mutual natural friends (e.g. 2/12 Cancer & Leo)', () => {
      // Cancer (Moon) and Leo (Sun) -> 2/12 distance, lords are mutual friends
      const pCancer = createProfile({ rashiIndex: 4, rashiName: 'Karka', rashiLord: PlanetSymbol.MOON });
      const pLeo = createProfile({ rashiIndex: 5, rashiName: 'Simha', rashiLord: PlanetSymbol.SUN });
      const result = calculator.calculateBhakoot(pCancer, pLeo);

      expect(result.obtainedPoints).toBe(7);
      expect(result.isDoshaCancelled).toBe(true);
      expect(result.cancellationReason).toContain('mutual natural friends');
    });
  });

  // 8. NADI KOOTA
  describe('Nadi Koota (Max 8 Points)', () => {
    it('awards 8 points when Nadis are different', () => {
      const pAdi = createProfile({ nadi: 'ADI' });
      const pMadhya = createProfile({ nadi: 'MADHYA' });
      const result = calculator.calculateNadi(pAdi, pMadhya);

      expect(result.maxPoints).toBe(8);
      expect(result.obtainedPoints).toBe(8);
      expect(result.condition).toBe('DIFFERENT_NADI');
      expect(result.isDoshaCancelled).toBe(false);
    });

    it('awards 0 points for unmitigated same Nadi Dosha', () => {
      const p1 = createProfile({
        nakshatraIndex: 1,
        nakshatraName: 'Ashwini',
        nadi: 'ADI',
        rashiIndex: 1,
        pada: 1,
      });
      const p2 = createProfile({
        nakshatraIndex: 1,
        nakshatraName: 'Ashwini',
        nadi: 'ADI',
        rashiIndex: 1,
        pada: 1,
      });
      const result = calculator.calculateNadi(p1, p2);

      expect(result.maxPoints).toBe(8);
      expect(result.obtainedPoints).toBe(0);
      expect(result.condition).toBe('SAME_NADI_DOSHA');
      expect(result.isDoshaCancelled).toBe(false);
    });

    it('cancels Nadi Dosha when same Nakshatra falls in different Rashis (e.g. Krittika across Aries & Taurus)', () => {
      const p1 = createProfile({
        nakshatraIndex: 3,
        nakshatraName: 'Krittika',
        rashiIndex: 1,
        rashiName: 'Mesha',
        pada: 1,
        nadi: 'ANTYA',
      });
      const p2 = createProfile({
        nakshatraIndex: 3,
        nakshatraName: 'Krittika',
        rashiIndex: 2,
        rashiName: 'Vrishabha',
        pada: 2,
        nadi: 'ANTYA',
      });
      const result = calculator.calculateNadi(p1, p2);

      expect(result.obtainedPoints).toBe(8);
      expect(result.isDoshaCancelled).toBe(true);
      expect(result.cancellationReason).toContain('spans different Rashis');
    });
  });

  // 9. ASHTAKOOTA AGGREGATE & SCORE INVARIANTS
  describe('Ashtakoota Aggregate & Score Invariants', () => {
    it('verifies that totalObtainedPoints strictly equals the sum of all 8 factor scores', () => {
      const pA = createProfile({
        rashiIndex: 1,
        rashiName: 'Mesha',
        rashiLord: PlanetSymbol.MARS,
        nakshatraIndex: 1,
        nakshatraName: 'Ashwini',
        varnaRank: 3,
        vashya: 'CHATUSHPADA',
        gana: 'DEVA',
        yoni: { animal: 'HORSE', gender: 'MALE' },
        nadi: 'ADI',
      });

      const pB = createProfile({
        rashiIndex: 4,
        rashiName: 'Karka',
        rashiLord: PlanetSymbol.MOON,
        nakshatraIndex: 8,
        nakshatraName: 'Pushya',
        varnaRank: 4,
        vashya: 'JALACHARA',
        gana: 'DEVA',
        yoni: { animal: 'SHEEP', gender: 'MALE' },
        nadi: 'MADHYA',
      });

      const result = calculator.calculateAshtakoota(pA, pB);

      expect(result.totalMaxPoints).toBe(36);
      const computedSum =
        result.kootas.varna.obtainedPoints +
        result.kootas.vashya.obtainedPoints +
        result.kootas.tara.obtainedPoints +
        result.kootas.yoni.obtainedPoints +
        result.kootas.grahaMaitri.obtainedPoints +
        result.kootas.gana.obtainedPoints +
        result.kootas.bhakoot.obtainedPoints +
        result.kootas.nadi.obtainedPoints;

      expect(result.totalObtainedPoints).toBe(computedSum);
      expect(result.totalObtainedPoints).toBeGreaterThanOrEqual(0);
      expect(result.totalObtainedPoints).toBeLessThanOrEqual(36);
      expect(result.isCompatible).toBe(result.totalObtainedPoints >= 18);
    });
  });

  // 10. MANGLIK DOSHA EVALUATION & PAIRWISE COMPARISON
  describe('Manglik Dosha Evaluation & Pairwise Comparison', () => {
    it('compares two Non-Manglik individuals', () => {
      const mangalA = {
        isManglik: false,
        marsPlacement: { rashiIndex: 3, rashiName: 'Mithuna', longitude: 65, houseFromLagna: 3, houseFromMoon: 3 },
        manglikHousesFromLagna: [],
        manglikHousesFromMoon: [],
        severity: 'NONE' as const,
        cancellationFactors: [],
        isCancelled: false,
        effectiveManglik: false,
      };

      const mangalB = {
        isManglik: false,
        marsPlacement: { rashiIndex: 6, rashiName: 'Kanya', longitude: 155, houseFromLagna: 6, houseFromMoon: 6 },
        manglikHousesFromLagna: [],
        manglikHousesFromMoon: [],
        severity: 'NONE' as const,
        cancellationFactors: [],
        isCancelled: false,
        effectiveManglik: false,
      };

      const comparison = calculator.compareManglikDosha(mangalA, mangalB);
      expect(comparison.verdict).toBe('BOTH_NON_MANGLIK');
      expect(comparison.isDoshaCancelledByMatch).toBe(true);
    });

    it('neutralizes Dosha when both individuals are active Manglik', () => {
      const mangalA = {
        isManglik: true,
        marsPlacement: { rashiIndex: 7, rashiName: 'Tula', longitude: 195, houseFromLagna: 7, houseFromMoon: 7 },
        manglikHousesFromLagna: [7],
        manglikHousesFromMoon: [7],
        severity: 'HIGH' as const,
        cancellationFactors: [],
        isCancelled: false,
        effectiveManglik: true,
      };

      const mangalB = {
        isManglik: true,
        marsPlacement: { rashiIndex: 8, rashiName: 'Vrischika', longitude: 220, houseFromLagna: 8, houseFromMoon: 8 },
        manglikHousesFromLagna: [8],
        manglikHousesFromMoon: [8],
        severity: 'HIGH' as const,
        cancellationFactors: [],
        isCancelled: false,
        effectiveManglik: true,
      };

      const comparison = calculator.compareManglikDosha(mangalA, mangalB);
      expect(comparison.verdict).toBe('BOTH_MANGLIK');
      expect(comparison.isDoshaCancelledByMatch).toBe(true);
    });

    it('detects Manglik mismatch when one is Manglik and other is Non-Manglik', () => {
      const mangalA = {
        isManglik: true,
        marsPlacement: { rashiIndex: 7, rashiName: 'Tula', longitude: 195, houseFromLagna: 7, houseFromMoon: 7 },
        manglikHousesFromLagna: [7],
        manglikHousesFromMoon: [7],
        severity: 'HIGH' as const,
        cancellationFactors: [],
        isCancelled: false,
        effectiveManglik: true,
      };

      const mangalB = {
        isManglik: false,
        marsPlacement: { rashiIndex: 3, rashiName: 'Mithuna', longitude: 65, houseFromLagna: 3, houseFromMoon: 3 },
        manglikHousesFromLagna: [],
        manglikHousesFromMoon: [],
        severity: 'NONE' as const,
        cancellationFactors: [],
        isCancelled: false,
        effectiveManglik: false,
      };

      const comparison = calculator.compareManglikDosha(mangalA, mangalB);
      expect(comparison.verdict).toBe('MANGLIK_MISMATCH');
      expect(comparison.isDoshaCancelledByMatch).toBe(false);
    });
  });
});
