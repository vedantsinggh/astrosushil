import { describe, it, expect } from 'vitest';
import { PanchangCalculator } from '../../src/panchang/panchang-calculator';

describe('PanchangCalculator Unit Tests', () => {
  const calculator = new PanchangCalculator();

  it('calculates Sukla Paksha Pratipada when Sun and Moon are conjunct (0 degree diff)', () => {
    const sunLong = 0.0;
    const moonLong = 5.0; // 5 deg ahead -> Tithi 1
    const birthDate = new Date('2026-08-24T00:00:00Z');

    const result = calculator.calculatePanchang(sunLong, moonLong, birthDate);

    expect(result.tithi.index).toBe(1);
    expect(result.tithi.paksha).toBe('SUKLA');
    expect(result.tithi.name).toBe('Pratipada');
    expect(result.nakshatra.name).toBe('Ashwini');
  });

  it('calculates Purnima when Moon is opposite Sun (180 degree diff)', () => {
    const sunLong = 0.0;
    const moonLong = 175.0; // 175 deg ahead -> Tithi 15 (168..180)
    const birthDate = new Date('2026-08-24T00:00:00Z');

    const result = calculator.calculatePanchang(sunLong, moonLong, birthDate);

    expect(result.tithi.index).toBe(15);
    expect(result.tithi.paksha).toBe('SUKLA');
    expect(result.tithi.name).toBe('Purnima');
  });

  it('calculates Amavasya in Krishna Paksha when Moon is 355 deg ahead of Sun', () => {
    const sunLong = 0.0;
    const moonLong = 355.0; // Tithi 30
    const birthDate = new Date('2026-08-24T00:00:00Z');

    const result = calculator.calculatePanchang(sunLong, moonLong, birthDate);

    expect(result.tithi.index).toBe(30);
    expect(result.tithi.paksha).toBe('KRISHNA');
    expect(result.tithi.name).toBe('Amavasya');
  });
});
