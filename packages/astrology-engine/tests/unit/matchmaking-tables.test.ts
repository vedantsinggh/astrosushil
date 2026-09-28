import { describe, it, expect } from 'vitest';
import {
  ASHTAKOOTA_WEIGHTS,
  TOTAL_MAX_ASHTAKOOTA_SCORE,
  validateAshtakootaWeights,
  RASHI_VARNA_MAP,
  RASHI_VASHYA_MAP,
  RASHI_VASHYA_MATRIX,
  TARA_DEFINITIONS,
  NAKSHATRA_YONI_MAP,
  YONI_COMPATIBILITY_MATRIX,
  YONI_ANIMALS_ORDER,
  NAKSHATRA_GANA_MAP,
  GANA_COMPATIBILITY_MATRIX,
  NAKSHATRA_NADI_MAP,
} from '../../src/matchmaking/koota-tables';

describe('Ashtakoota Matchmaking Tables & Canonical Matrices (Phase 2U)', () => {
  // 1. Weight Registry & Invariants
  it('validates canonical Ashtakoota weight registry sum is strictly 36', () => {
    expect(validateAshtakootaWeights()).toBe(true);
    expect(ASHTAKOOTA_WEIGHTS.VARNA).toBe(1);
    expect(ASHTAKOOTA_WEIGHTS.VASHYA).toBe(2);
    expect(ASHTAKOOTA_WEIGHTS.TARA).toBe(3);
    expect(ASHTAKOOTA_WEIGHTS.YONI).toBe(4);
    expect(ASHTAKOOTA_WEIGHTS.GRAHA_MAITRI).toBe(5);
    expect(ASHTAKOOTA_WEIGHTS.GANA).toBe(6);
    expect(ASHTAKOOTA_WEIGHTS.BHAKOOT).toBe(7);
    expect(ASHTAKOOTA_WEIGHTS.NADI).toBe(8);

    const calculatedSum =
      ASHTAKOOTA_WEIGHTS.VARNA +
      ASHTAKOOTA_WEIGHTS.VASHYA +
      ASHTAKOOTA_WEIGHTS.TARA +
      ASHTAKOOTA_WEIGHTS.YONI +
      ASHTAKOOTA_WEIGHTS.GRAHA_MAITRI +
      ASHTAKOOTA_WEIGHTS.GANA +
      ASHTAKOOTA_WEIGHTS.BHAKOOT +
      ASHTAKOOTA_WEIGHTS.NADI;

    expect(calculatedSum).toBe(TOTAL_MAX_ASHTAKOOTA_SCORE);
    expect(calculatedSum).toBe(36);
  });

  // 2. Exhaustive 27 Nakshatras to Yoni Map & 14x14 Matrix
  it('exhaustively covers all 27 Nakshatras in NAKSHATRA_YONI_MAP', () => {
    for (let i = 1; i <= 27; i++) {
      const entry = NAKSHATRA_YONI_MAP[i];
      expect(entry, `Nakshatra index ${i} must have a Yoni entry`).toBeDefined();
      expect(typeof entry.animal).toBe('string');
      expect(YONI_ANIMALS_ORDER).toContain(entry.animal);
      expect(['MALE', 'FEMALE']).toContain(entry.gender);
    }
  });

  it('exhaustively verifies all 14x14 Yoni combinations in YONI_COMPATIBILITY_MATRIX', () => {
    for (const a1 of YONI_ANIMALS_ORDER) {
      for (const a2 of YONI_ANIMALS_ORDER) {
        const score = YONI_COMPATIBILITY_MATRIX[a1]?.[a2];
        expect(score, `Score for ${a1} vs ${a2} must be defined`).toBeDefined();
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(4);

        if (a1 === a2) {
          expect(score, `Self Yoni ${a1} must score 4 points`).toBe(4);
        }
      }
    }

    // Verify classical sworn enemies score 0 points
    expect(YONI_COMPATIBILITY_MATRIX.COW.TIGER).toBe(0);
    expect(YONI_COMPATIBILITY_MATRIX.TIGER.COW).toBe(0);
    expect(YONI_COMPATIBILITY_MATRIX.ELEPHANT.LION).toBe(0);
    expect(YONI_COMPATIBILITY_MATRIX.LION.ELEPHANT).toBe(0);
    expect(YONI_COMPATIBILITY_MATRIX.HORSE.BUFFALO).toBe(0);
    expect(YONI_COMPATIBILITY_MATRIX.BUFFALO.HORSE).toBe(0);
    expect(YONI_COMPATIBILITY_MATRIX.DOG.DEER).toBe(0);
    expect(YONI_COMPATIBILITY_MATRIX.DEER.DOG).toBe(0);
    expect(YONI_COMPATIBILITY_MATRIX.SERPENT.MONGOOSE).toBe(0);
    expect(YONI_COMPATIBILITY_MATRIX.MONGOOSE.SERPENT).toBe(0);
    expect(YONI_COMPATIBILITY_MATRIX.MONKEY.SHEEP).toBe(0);
    expect(YONI_COMPATIBILITY_MATRIX.SHEEP.MONKEY).toBe(0);
    expect(YONI_COMPATIBILITY_MATRIX.CAT.RAT).toBe(0);
    expect(YONI_COMPATIBILITY_MATRIX.RAT.CAT).toBe(0);
  });

  // 3. Exhaustive 27 Nakshatras to Gana Map & 3x3 Matrix
  it('exhaustively covers all 27 Nakshatras in NAKSHATRA_GANA_MAP (9 Deva, 9 Manushya, 9 Rakshasa)', () => {
    const counts = { DEVA: 0, MANUSHYA: 0, RAKSHASA: 0 };
    for (let i = 1; i <= 27; i++) {
      const gana = NAKSHATRA_GANA_MAP[i];
      expect(gana, `Nakshatra ${i} must have Gana`).toBeDefined();
      expect(['DEVA', 'MANUSHYA', 'RAKSHASA']).toContain(gana);
      counts[gana]++;
    }

    expect(counts.DEVA).toBe(9);
    expect(counts.MANUSHYA).toBe(9);
    expect(counts.RAKSHASA).toBe(9);
  });

  it('exhaustively verifies 3x3 Gana matrix rules', () => {
    // Same Gana -> 6 points
    expect(GANA_COMPATIBILITY_MATRIX.DEVA.DEVA).toBe(6);
    expect(GANA_COMPATIBILITY_MATRIX.MANUSHYA.MANUSHYA).toBe(6);
    expect(GANA_COMPATIBILITY_MATRIX.RAKSHASA.RAKSHASA).toBe(6);

    // Deva Groom + Manushya Bride -> 6 points
    expect(GANA_COMPATIBILITY_MATRIX.DEVA.MANUSHYA).toBe(6);
    // Manushya Groom + Deva Bride -> 5 points
    expect(GANA_COMPATIBILITY_MATRIX.MANUSHYA.DEVA).toBe(5);

    // Deva Groom + Rakshasa Bride -> 1 point
    expect(GANA_COMPATIBILITY_MATRIX.DEVA.RAKSHASA).toBe(1);
    // Rakshasa Groom + Deva Bride -> 0 points
    expect(GANA_COMPATIBILITY_MATRIX.RAKSHASA.DEVA).toBe(0);

    // Manushya & Rakshasa incompatibilities -> 0 points
    expect(GANA_COMPATIBILITY_MATRIX.MANUSHYA.RAKSHASA).toBe(0);
    expect(GANA_COMPATIBILITY_MATRIX.RAKSHASA.MANUSHYA).toBe(0);
  });

  // 4. Exhaustive 27 Nakshatras to Nadi Map (Serpentine 9-9-9)
  it('exhaustively covers all 27 Nakshatras in NAKSHATRA_NADI_MAP (9 Adi, 9 Madhya, 9 Antya)', () => {
    const counts = { ADI: 0, MADHYA: 0, ANTYA: 0 };
    for (let i = 1; i <= 27; i++) {
      const nadi = NAKSHATRA_NADI_MAP[i];
      expect(nadi, `Nakshatra ${i} must have Nadi`).toBeDefined();
      expect(['ADI', 'MADHYA', 'ANTYA']).toContain(nadi);
      counts[nadi]++;
    }

    expect(counts.ADI).toBe(9);
    expect(counts.MADHYA).toBe(9);
    expect(counts.ANTYA).toBe(9);
  });

  // 5. Exhaustive 12 Rashis to Varna Map
  it('exhaustively covers all 12 Rashis in RASHI_VARNA_MAP (3 Brahmin, 3 Kshatriya, 3 Vaishya, 3 Shudra)', () => {
    const counts = { BRAHMIN: 0, KSHATRIYA: 0, VAISHYA: 0, SHUDRA: 0 };
    for (let r = 1; r <= 12; r++) {
      const entry = RASHI_VARNA_MAP[r];
      expect(entry, `Rashi ${r} must have Varna`).toBeDefined();
      expect(['BRAHMIN', 'KSHATRIYA', 'VAISHYA', 'SHUDRA']).toContain(entry.varna);
      expect([1, 2, 3, 4]).toContain(entry.rank);
      counts[entry.varna]++;
    }

    expect(counts.BRAHMIN).toBe(3);
    expect(counts.KSHATRIYA).toBe(3);
    expect(counts.VAISHYA).toBe(3);
    expect(counts.SHUDRA).toBe(3);
  });

  // 6. Exhaustive 12 Rashis to Vashya Map & 12x12 Matrix
  it('exhaustively covers all 12 Rashis in RASHI_VASHYA_MAP and RASHI_VASHYA_MATRIX', () => {
    for (let r = 1; r <= 12; r++) {
      const vashya = RASHI_VASHYA_MAP[r];
      expect(vashya, `Rashi ${r} must have Vashya`).toBeDefined();
      expect(['CHATUSHPADA', 'MANAVA', 'JALACHARA', 'VANACHARA', 'KEETA']).toContain(vashya);

      for (let r2 = 1; r2 <= 12; r2++) {
        const score = RASHI_VASHYA_MATRIX[r]?.[r2];
        expect(score, `Vashya score for Rashi ${r} vs ${r2} must be defined`).toBeDefined();
        expect([0, 1, 2]).toContain(score);
        if (r === r2) {
          expect(score).toBe(2);
        }
      }
    }
  });

  // 7. Exhaustive 9 Navataras
  it('exhaustively defines all 9 Navataras in TARA_DEFINITIONS', () => {
    const inauspicious = [3, 5, 7];
    for (let t = 1; t <= 9; t++) {
      const def = TARA_DEFINITIONS[t];
      expect(def, `Tara ${t} must be defined`).toBeDefined();
      expect(typeof def.name).toBe('string');
      expect(typeof def.isAuspicious).toBe('boolean');

      if (inauspicious.includes(t)) {
        expect(def.isAuspicious, `Tara ${t} must be inauspicious`).toBe(false);
      } else {
        expect(def.isAuspicious, `Tara ${t} must be auspicious`).toBe(true);
      }
    }
  });
});

