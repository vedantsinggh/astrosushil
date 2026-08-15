import { describe, it, expect } from 'vitest';
import { getRashiIndex, getDegreeInRashi, getRashiByLongitude } from '../../src/zodiac/rashi';

describe('Rashi Boundary & Precision Unit Tests', () => {
  it('should assign 0.0° to Mesha (Aries, Index 1)', () => {
    expect(getRashiIndex(0.0)).toBe(1);
    expect(getRashiByLongitude(0.0).sanskritName).toBe('Mesha');
    expect(getDegreeInRashi(0.0)).toBe(0.0);
  });

  it('should assign 29.999999° to Mesha (Aries, Index 1)', () => {
    expect(getRashiIndex(29.999999)).toBe(1);
    expect(getRashiByLongitude(29.999999).sanskritName).toBe('Mesha');
  });

  it('should assign exactly 30.0° to Vrishabha (Taurus, Index 2)', () => {
    expect(getRashiIndex(30.0)).toBe(2);
    expect(getRashiByLongitude(30.0).sanskritName).toBe('Vrishabha');
    expect(getDegreeInRashi(30.0)).toBe(0.0);
  });

  it('should assign 359.999999° to Meena (Pisces, Index 12)', () => {
    expect(getRashiIndex(359.999999)).toBe(12);
    expect(getRashiByLongitude(359.999999).sanskritName).toBe('Meena');
  });

  it('should handle negative angles gracefully by normalizing to [0, 360)', () => {
    expect(getRashiIndex(-10.0)).toBe(12); // -10° is 350° (Meena)
  });
});
