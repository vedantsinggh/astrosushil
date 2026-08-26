import { describe, it, expect } from 'vitest';
import { VargaCalculator } from '../../src/varga/varga-calculator';

describe('VargaCalculator Unit Tests', () => {
  const calculator = new VargaCalculator();

  it('calculates D-1 (Rashi) correctly', () => {
    expect(calculator.calculateLongitudeVarga(15, 'D1')).toBe(1);  // 15 deg Aries -> Aries (1)
    expect(calculator.calculateLongitudeVarga(45, 'D1')).toBe(2);  // 45 deg Taurus -> Taurus (2)
    expect(calculator.calculateLongitudeVarga(340, 'D1')).toBe(12); // 340 deg Pisces -> Pisces (12)
  });

  it('calculates D-9 (Navamsha) correctly', () => {
    // 0 deg Aries (Fiery) -> Aries (1)
    expect(calculator.calculateLongitudeVarga(0.5, 'D9')).toBe(1);
    // 3.5 deg Aries -> Taurus (2)
    expect(calculator.calculateLongitudeVarga(3.5, 'D9')).toBe(2);
    // 0 deg Taurus (Earthy) -> Capricorn (10)
    expect(calculator.calculateLongitudeVarga(30.5, 'D9')).toBe(10);
    // 0 deg Gemini (Airy) -> Libra (7)
    expect(calculator.calculateLongitudeVarga(60.5, 'D9')).toBe(7);
    // 0 deg Cancer (Watery) -> Cancer (4)
    expect(calculator.calculateLongitudeVarga(90.5, 'D9')).toBe(4);
  });

  it('calculates D-10 (Dasamsa) correctly', () => {
    // 0-3 deg Aries (Odd sign) -> Aries (1)
    expect(calculator.calculateLongitudeVarga(1.0, 'D10')).toBe(1);
    // 3-6 deg Aries -> Taurus (2)
    expect(calculator.calculateLongitudeVarga(4.0, 'D10')).toBe(2);
    // 0-3 deg Taurus (Even sign) -> Starts from 9th from Taurus = Capricorn (10)
    expect(calculator.calculateLongitudeVarga(31.0, 'D10')).toBe(10);
  });
});
