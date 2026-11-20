import { describe, it, expect } from 'vitest';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { calculateSudarshanaChakra, signFromReference } from '../../src/chart/sudarshana-chakra';
import { calculateIshtaKashtaFromBalas, calculateIshtaKashtaPhala } from '../../src/strength/ishta-kashta';
import { ShadbalaCalculator } from '../../src/strength/shadbala-calculator';
import { VargaCalculator } from '../../src/varga/varga-calculator';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { BENCHMARK_REFERENCE_CHARTS } from '../fixtures/reference-charts';

const ref = BENCHMARK_REFERENCE_CHARTS[0];

describe('Sudarshana Chakra', () => {
  it('counts houses whole-sign from the reference sign', () => {
    expect(signFromReference(1, 1)).toBe(1);
    expect(signFromReference(11, 3)).toBe(1);
    expect(signFromReference(12, 12)).toBe(11);
  });

  it('builds Lagna/Chandra/Surya rings from the verified reference chart', async () => {
    const chart = await new ChartCalculator().calculateChart(ref.birthDetails, ref.config);
    const sc = calculateSudarshanaChakra(chart);
    expect(sc.rings.map((r) => r.ring)).toEqual(['LAGNA', 'CHANDRA', 'SURYA']);
    // Rings are re-indexings of the engine's own natal placements (fixture birth data only).
    expect(sc.rings[0].referenceRashiIndex).toBe(chart.ascendant!.rashiIndex);
    const surya = sc.rings[2];
    expect(surya.referenceRashiIndex).toBe(chart.planets[PlanetSymbol.SUN].rashiIndex);
    expect(surya.houses[0].occupants).toContain(PlanetSymbol.SUN);
    const chandra = sc.rings[1];
    expect(chandra.referenceRashiIndex).toBe(chart.planets[PlanetSymbol.MOON].rashiIndex);
    expect(chandra.houses[0].occupants).toContain(PlanetSymbol.MOON);
    // Each planet's house in the Lagna ring equals its whole-sign house from the ascendant.
    for (const h of sc.rings[0].houses) {
      for (const p of h.occupants) {
        const expected = ((chart.planets[p].rashiIndex - chart.ascendant!.rashiIndex + 12) % 12) + 1;
        expect(h.houseNumber).toBe(expected);
      }
    }
    for (const ring of sc.rings) {
      expect(ring.houses).toHaveLength(12);
      const total = ring.houses.reduce((n, h) => n + h.occupants.length, 0);
      expect(total).toBe(9);
    }
  });
});

describe('Ishta / Kashta Phala (BPHS formula)', () => {
  it('applies Ishta = sqrt(U*C), Kashta = sqrt((60-U)(60-C))', () => {
    // Worked by hand from the BPHS formula
    expect(calculateIshtaKashtaFromBalas(60, 60)).toEqual({ ishta: 60, kashta: 0 });
    expect(calculateIshtaKashtaFromBalas(0, 0)).toEqual({ ishta: 0, kashta: 60 });
    const r = calculateIshtaKashtaFromBalas(40, 10); // sqrt(400)=20, sqrt(20*50)=sqrt(1000)
    expect(r.ishta).toBeCloseTo(20, 10);
    expect(r.kashta).toBeCloseTo(31.6227766, 6);
  });

  it('derives values for the 7 grahas from the engine Shadbala without altering it', async () => {
    const chart = await new ChartCalculator().calculateChart(ref.birthDetails, ref.config);
    const sb = new ShadbalaCalculator(new VargaCalculator()).calculateShadbala(chart);
    const before = JSON.stringify(sb);
    const ik = calculateIshtaKashtaPhala(sb);
    expect(JSON.stringify(sb)).toBe(before);
    expect(ik).toHaveLength(7);
    for (const row of ik) {
      expect(row.ishtaPhala).toBeGreaterThanOrEqual(0);
      expect(row.ishtaPhala).toBeLessThanOrEqual(60);
      expect(row.kashtaPhala).toBeGreaterThanOrEqual(0);
      expect(row.kashtaPhala).toBeLessThanOrEqual(60);
      expect(row.net).toBeCloseTo(row.ishtaPhala - row.kashtaPhala, 10);
    }
  });
});
