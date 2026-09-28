import { describe, it, expect } from 'vitest';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import { calculateChartSchema, vargasRequestSchema } from '../../src/modules/astrology/astrology.schemas';

describe('Vargas (Divisional Charts) API & Service Unit Tests', () => {
  const sampleBirthDetails = {
    name: 'Varga Test Profile',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
  };

  const CANONICAL_VARGAS = [
    'D1',
    'D2',
    'D3',
    'D4',
    'D7',
    'D9',
    'D10',
    'D12',
    'D16',
    'D20',
    'D24',
    'D27',
    'D30',
    'D40',
    'D45',
    'D60',
  ] as const;

  it('1. calculateVargas returns all 16 canonical divisional charts by default', async () => {
    const result = await astrologyService.calculateVargas({
      birthDetails: sampleBirthDetails,
    });

    expect(result.birthDetails).toBeDefined();
    expect(result.vargas).toBeDefined();
    expect(result.vargas).toHaveLength(16);

    const returnedTypes = result.vargas.map((v) => v.vargaType);
    expect(returnedTypes).toEqual(CANONICAL_VARGAS);

    for (const varga of result.vargas) {
      expect(varga.name).toBeDefined();
      expect(varga.division).toBeGreaterThanOrEqual(1);
      expect(varga.calculationRule).toBeDefined();
      expect(varga.ascendant).toBeDefined();
      expect(varga.ascendant.rashiIndex).toBeGreaterThanOrEqual(1);
      expect(varga.ascendant.rashiIndex).toBeLessThanOrEqual(12);
      expect(varga.ascendant.rashiName).toBeDefined();
      expect(varga.ascendant.degreeInVarga).toBeGreaterThanOrEqual(0);
      expect(varga.ascendant.degreeInVarga).toBeLessThan(30);

      // Verify planets
      const planetPlacements = Object.values(varga.placements);
      expect(planetPlacements.length).toBeGreaterThanOrEqual(9);
      for (const p of planetPlacements) {
        expect(p.planet).toBeDefined();
        expect(p.rashiIndex).toBeGreaterThanOrEqual(1);
        expect(p.rashiIndex).toBeLessThanOrEqual(12);
        expect(p.rashiName).toBeDefined();
        expect(p.degreeInVarga).toBeGreaterThanOrEqual(0);
        expect(p.degreeInVarga).toBeLessThan(30);
        expect(p.house).toBeGreaterThanOrEqual(1);
        expect(p.house).toBeLessThanOrEqual(12);
      }

      // Verify 12 houses
      expect(varga.houses).toHaveLength(12);
      for (let h = 1; h <= 12; h++) {
        const house = varga.houses[h - 1];
        expect(house.houseNumber).toBe(h);
        expect(house.rashiIndex).toBeGreaterThanOrEqual(1);
        expect(house.rashiIndex).toBeLessThanOrEqual(12);
        expect(house.rashiName).toBeDefined();
        expect(house.occupants).toBeDefined();
        expect(Array.isArray(house.occupants)).toBe(true);
      }

      // Verify 12 signs
      expect(varga.signs).toHaveLength(12);
    }
  });

  it('2. calculateVargas returns only explicitly requested subset of vargas', async () => {
    const result = await astrologyService.calculateVargas({
      birthDetails: sampleBirthDetails,
      vargaTypes: ['D9', 'D60'],
    });

    expect(result.vargas).toHaveLength(2);
    expect(result.vargas[0].vargaType).toBe('D9');
    expect(result.vargas[0].name).toContain('Navamsha');
    expect(result.vargas[0].division).toBe(9);
    expect(result.vargas[1].vargaType).toBe('D60');
    expect(result.vargas[1].name).toContain('Shashtiamsa');
    expect(result.vargas[1].division).toBe(60);
  });

  it('3. calculateChartForDirectInput with default vargaType returns standard D1 chart', async () => {
    const res = await astrologyService.calculateChartForDirectInput(sampleBirthDetails);

    expect(res.data).toBeDefined();
    expect(res.chart).toBeDefined();
    expect(res.chart.ascendant).toBeDefined();
    expect(res.chart.ascendant.sign).toBeDefined();
    expect(res.chart.planets.length).toBeGreaterThanOrEqual(9);
    expect(res.chart.houses).toHaveLength(12);
    expect(res.chart.rashis).toHaveLength(12);
    expect(res.chart.nakshatras).toHaveLength(27);
  });

  it('4. calculateChartForDirectInput with vargaType D9 returns normalized Navamsha chart', async () => {
    const d1Res = await astrologyService.calculateChartForDirectInput(sampleBirthDetails, 'D1');
    const d9Res = await astrologyService.calculateChartForDirectInput(sampleBirthDetails, 'D9');

    expect(d9Res.data).toBeDefined();
    expect(d9Res.chart).toBeDefined();
    expect(d9Res.chart.providerName).toContain('D9');

    // Ascendant in D9 is calculated deterministically and may differ from D1
    expect(d9Res.chart.ascendant.sign).toBeDefined();
    expect(d9Res.chart.ascendant.degree).toBeGreaterThanOrEqual(0);
    expect(d9Res.chart.ascendant.degree).toBeLessThan(30);

    // Planets should all have valid signs, degrees, and whole-sign house assignments
    expect(d9Res.chart.planets.length).toBeGreaterThanOrEqual(9);
    for (const p of d9Res.chart.planets) {
      expect(p.planet).toBeDefined();
      expect(p.sign).toBeDefined();
      expect(p.degree).toBeGreaterThanOrEqual(0);
      expect(p.degree).toBeLessThan(30);
      expect(p.house).toBeGreaterThanOrEqual(1);
      expect(p.house).toBeLessThanOrEqual(12);
    }

    // 12 houses are correctly established based on D9 Ascendant
    expect(d9Res.chart.houses).toHaveLength(12);
    expect(d9Res.chart.houses[0].houseNumber).toBe(1);
    expect(d9Res.chart.houses[0].sign).toBe(d9Res.chart.ascendant.sign);
  });

  it('5. calculateChartForDirectInput with vargaType D10 returns normalized Dashamsha chart', async () => {
    const d10Res = await astrologyService.calculateChartForDirectInput(sampleBirthDetails, 'D10');

    expect(d10Res.chart.providerName).toContain('D10');
    expect(d10Res.chart.ascendant.sign).toBeDefined();
    expect(d10Res.chart.planets.length).toBeGreaterThanOrEqual(9);
    expect(d10Res.chart.houses).toHaveLength(12);
  });

  it('6. Serialization check: responses contain no empty {} objects', async () => {
    const vargasResult = await astrologyService.calculateVargas({
      birthDetails: sampleBirthDetails,
    });
    const serializedVargas = JSON.stringify(vargasResult);
    expect(serializedVargas).not.toContain('{}');

    const d9Result = await astrologyService.calculateChartForDirectInput(sampleBirthDetails, 'D9');
    const serializedD9 = JSON.stringify(d9Result);
    expect(serializedD9).not.toContain('"ascendant":{}');
    expect(serializedD9).not.toContain('"planets":[{}]');
    expect(serializedD9).not.toContain('"houses":[{}]');
  });

  it('7. Schema validation: calculateChartSchema and vargasRequestSchema validate vargaType', () => {
    const validChartInput = calculateChartSchema.parse({
      birthDetails: sampleBirthDetails,
      vargaType: 'D9',
    });
    expect(validChartInput.vargaType).toBe('D9');

    const defaultChartInput = calculateChartSchema.parse({
      birthDetails: sampleBirthDetails,
    });
    expect(defaultChartInput.vargaType).toBe('D1');

    expect(() =>
      calculateChartSchema.parse({
        birthDetails: sampleBirthDetails,
        vargaType: 'D99', // Invalid
      })
    ).toThrow();

    const validVargasInput = vargasRequestSchema.parse({
      birthDetails: sampleBirthDetails,
      vargaTypes: ['D1', 'D60'],
    });
    expect(validVargasInput.vargaTypes).toEqual(['D1', 'D60']);

    expect(() =>
      vargasRequestSchema.parse({
        birthDetails: sampleBirthDetails,
        vargaTypes: ['INVALID_VARGA'],
      })
    ).toThrow();
  });
});
