import { describe, it, expect } from 'vitest';
import { AvakhadaChakraCalculator } from '../../src/panchang/avakhada-chakra';
import { GhatChakraCalculator } from '../../src/panchang/ghat-chakra';
import { TaraChakraCalculator } from '../../src/panchang/tara-chakra';

describe('Panchang Birth Chakras Engine Tests', () => {
  it('should compute Avakhada Chakra with Varna, Vashya, Yoni, Gana, Nadi, and Namakshara', () => {
    // Rohini Nakshatra (Taurus 45°) with Lagna Aries (1)
    const avakhada = AvakhadaChakraCalculator.calculateAvakhada(45.0, 1);

    expect(avakhada.varna).toBe('Vaishya');
    expect(avakhada.vashya).toBe('Chatushpada');
    expect(avakhada.yoni).toBe('Sarpa (Serpent)');
    expect(avakhada.yoniGender).toBe('Male');
    expect(avakhada.gana).toBe('Manushya');
    expect(avakhada.nadi).toBe('Antya');
    expect(avakhada.rashi).toBe('Vrishabha');
    expect(avakhada.nakshatra).toBe('Rohini');
    expect(avakhada.namakshara).toBeDefined();
    expect(avakhada.paya).toBe('Rajata (Silver)');
  });

  it('should compute Ghat Chakra inauspicious elements for Moon Rashi', () => {
    const ghat = GhatChakraCalculator.calculateGhatChakra(1); // Aries

    expect(ghat.moonRashiIndex).toBe(1);
    expect(ghat.ghatMasa).toBe('Kartika');
    expect(ghat.ghatVara).toBe('Ravivara (Sunday)');
    expect(ghat.ghatNakshatra).toBe('Magha');
  });

  it('should compute 9-Tara Chakra for 27 Nakshatras', () => {
    const taraReport = TaraChakraCalculator.calculateTaraChakra(1); // Ashwini

    expect(taraReport.taras.length).toBe(27);
    expect(taraReport.taras[0].taraCategory).toBe('JANMA');
    expect(taraReport.taras[1].taraCategory).toBe('SAMPAT');
    expect(taraReport.taras[2].taraCategory).toBe('VIPAT');
    expect(taraReport.taras[3].taraCategory).toBe('KSHEMA');
    expect(taraReport.taras[4].taraCategory).toBe('PRATYAK');
    expect(taraReport.taras[5].taraCategory).toBe('SADHANA');
    expect(taraReport.taras[6].taraCategory).toBe('NAIDHANA');
    expect(taraReport.taras[7].taraCategory).toBe('MITRA');
    expect(taraReport.taras[8].taraCategory).toBe('PARAMA_MITRA');
  });
});
