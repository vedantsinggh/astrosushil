import { describe, it, expect } from 'vitest';
import { getNakshatraIndex, getNakshatraByLongitude, getPada } from '../../src/nakshatra/nakshatra';
import { PlanetSymbol } from '../../src/planets/planet.types';

describe('Nakshatra Boundary & Pada Precision Unit Tests', () => {
  it('should assign 0.0° to Ashwini (Index 1), Pada 1, Lord Ketu', () => {
    expect(getNakshatraIndex(0.0)).toBe(1);
    const nakshatra = getNakshatraByLongitude(0.0);
    expect(nakshatra.name).toBe('Ashwini');
    expect(nakshatra.lord).toBe(PlanetSymbol.KETU);
    expect(getPada(0.0)).toBe(1);
  });

  it('should assign 3.33° to Ashwini Pada 1 and 3.34° to Ashwini Pada 2', () => {
    expect(getPada(3.2)).toBe(1);
    expect(getPada(3.4)).toBe(2);
  });

  it('should assign 13.333333° to Ashwini and 13.34° to Bharani (Index 2)', () => {
    expect(getNakshatraIndex(13.2)).toBe(1);
    expect(getNakshatraIndex(13.34)).toBe(2);
    expect(getNakshatraByLongitude(13.34).name).toBe('Bharani');
    expect(getNakshatraByLongitude(13.34).lord).toBe(PlanetSymbol.VENUS);
  });

  it('should assign 359.999° to Revati (Index 27), Pada 4, Lord Mercury', () => {
    expect(getNakshatraIndex(359.999)).toBe(27);
    const nakshatra = getNakshatraByLongitude(359.999);
    expect(nakshatra.name).toBe('Revati');
    expect(nakshatra.lord).toBe(PlanetSymbol.MERCURY);
    expect(getPada(359.999)).toBe(4);
  });
});
