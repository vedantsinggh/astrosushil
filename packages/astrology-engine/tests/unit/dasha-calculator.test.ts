import { describe, it, expect } from 'vitest';
import { DashaCalculator } from '../../src/dasha/dasha-calculator';
import { PlanetSymbol } from '../../src/planets/planet.types';

describe('DashaCalculator Unit Tests', () => {
  const calculator = new DashaCalculator();

  it('calculates Vimshottari Dasha starting with KETU for Ashwini Nakshatra Moon (0 degrees)', () => {
    // 0 degrees longitude = 1st Nakshatra (Ashwini), Lord = Ketu
    const birthDate = new Date('2000-01-01T00:00:00.000Z');
    const result = calculator.calculateVimshottariDasha(0.0, birthDate, 3);

    expect(result.moonNakshatraIndex).toBe(1);
    expect(result.balanceAtBirthYears).toBeCloseTo(7.0, 5); // 0 elapsed, 7 remaining
    expect(result.mahadashas).toHaveLength(9);
    expect(result.mahadashas[0].lord).toBe(PlanetSymbol.KETU);
    expect(result.mahadashas[1].lord).toBe(PlanetSymbol.VENUS);
    expect(result.mahadashas[2].lord).toBe(PlanetSymbol.SUN);

    // Verify sub-periods (Antardashas) exist
    expect(result.mahadashas[0].subPeriods).toHaveLength(9);
    expect(result.mahadashas[0].subPeriods![0].lord).toBe(PlanetSymbol.KETU);
    expect(result.mahadashas[0].subPeriods![1].lord).toBe(PlanetSymbol.VENUS);

    // Verify level 3 sub-periods (Pratyantardashas) exist
    expect(result.mahadashas[0].subPeriods![0].subPeriods).toHaveLength(9);
  });

  it('correctly calculates partial balance at birth for midpoint of Moon Nakshatra', () => {
    // 6.666666 degrees longitude = exactly half of Ashwini Nakshatra (13.33333 deg span)
    const birthDate = new Date('1990-06-15T12:00:00.000Z');
    const result = calculator.calculateVimshottariDasha(6.666666666666667, birthDate, 2);

    expect(result.moonNakshatraIndex).toBe(1);
    expect(result.balanceAtBirthYears).toBeCloseTo(3.5, 4); // Half of Ketu's 7 years
  });
});
