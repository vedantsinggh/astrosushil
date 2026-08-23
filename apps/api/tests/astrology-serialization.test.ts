import { describe, it, expect } from 'vitest';
import { mapAstroChartToResponse } from '../../src/modules/astrology/astrology-response.mapper';
import { ChartCalculator } from '@astro/astrology-engine';
import { MockEphemerisProvider } from '@astro/astrology-engine';

/**
 * Regression tests for the astrology API response mapper.
 *
 * Verifies that mapAstroChartToResponse produces plain serializable DTOs
 * that will not become {} when serialized by Fastify's fast-json-stringify.
 */
describe('astrology-response.mapper serialization regression', () => {
  const config = {
    zodiacType: 'SIDEREAL' as const,
    ayanamsa: 'LAHIRI' as const,
    houseSystem: 'WHOLE_SIGN' as const,
    nodeCalculation: 'MEAN_NODE' as const,
    planetaryCalculationMode: 'GEOCENTRIC' as const,
    precisionDegrees: 0.0001,
    roundingRule: 'NEAREST' as const,
    dashaSystem: 'VIMSHOTTARI' as const,
  };

  const birthDetails = {
    date: { year: 1995, month: 8, day: 15 },
    time: { hour: 14, minute: 30, second: 0 },
    timezone: 'Asia/Kolkata',
    latitude: 28.6139,
    longitude: 77.209,
    placeName: 'New Delhi, India',
  };

  it('should produce non-empty planet DTOs in chart.planets', async () => {
    const calculator = new ChartCalculator(new MockEphemerisProvider());
    const chart = await calculator.calculateChart(birthDetails, config);
    const response = mapAstroChartToResponse(chart);

    expect(response.chart.planets.length).toBe(9);

    for (const planet of response.chart.planets) {
      const serialized = JSON.stringify(planet);
      expect(serialized, `planet ${planet.planet} must not serialize to {}`).not.toBe('{}');

      // Verify all PlanetResponseDto fields are present
      expect(typeof planet.planet).toBe('string');
      expect(planet.planet.length).toBeGreaterThan(0);
      expect(typeof planet.longitude).toBe('number');
      expect(typeof planet.latitude).toBe('number');
      expect(typeof planet.speedLongitude).toBe('number');
      expect(typeof planet.isRetrograde).toBe('boolean');
      expect(typeof planet.rashiIndex).toBe('number');
      expect(typeof planet.rashiName).toBe('string');
      expect(typeof planet.degreeInRashi).toBe('number');
      expect(typeof planet.nakshatraIndex).toBe('number');
      expect(typeof planet.nakshatraName).toBe('string');
      expect(typeof planet.pada).toBe('number');
      expect(typeof planet.nakshatraLord).toBe('string');
    }
  });

  it('should produce non-empty ascendant DTO in chart.ascendant', async () => {
    const calculator = new ChartCalculator(new MockEphemerisProvider());
    const chart = await calculator.calculateChart(birthDetails, config);
    const response = mapAstroChartToResponse(chart);

    expect(response.chart.ascendant).toBeDefined();
    expect(response.chart.ascendant).not.toBeNull();

    const serialized = JSON.stringify(response.chart.ascendant);
    expect(serialized, 'ascendant must not serialize to {}').not.toBe('{}');

    expect(response.chart.ascendant.name).toBe('Ascendant');
    expect(typeof response.chart.ascendant.longitude).toBe('number');
    expect(typeof response.chart.ascendant.rashiIndex).toBe('number');
    expect(typeof response.chart.ascendant.rashiName).toBe('string');
  });

  it('should produce non-empty house DTOs in chart.houses', async () => {
    const calculator = new ChartCalculator(new MockEphemerisProvider());
    const chart = await calculator.calculateChart(birthDetails, config);
    const response = mapAstroChartToResponse(chart);

    expect(response.chart.houses.length).toBe(12);

    for (let i = 0; i < response.chart.houses.length; i++) {
      const house = response.chart.houses[i];
      const serialized = JSON.stringify(house);
      expect(serialized, `house[${i}] must not serialize to {}`).not.toBe('{}');

      expect(house.houseNumber).toBe(i + 1);
      expect(typeof house.rashiName).toBe('string');
    }
  });

  it('should produce non-empty rashi DTOs in chart.rashis', async () => {
    const calculator = new ChartCalculator(new MockEphemerisProvider());
    const chart = await calculator.calculateChart(birthDetails, config);
    const response = mapAstroChartToResponse(chart);

    expect(response.chart.rashis.length).toBe(12);

    for (const rashi of response.chart.rashis) {
      const serialized = JSON.stringify(rashi);
      expect(serialized, `rashi ${rashi.name} must not serialize to {}`).not.toBe('{}');

      expect(typeof rashi.index).toBe('number');
      expect(typeof rashi.name).toBe('string');
      expect(typeof rashi.englishName).toBe('string');
      expect(typeof rashi.lord).toBe('string');
      expect(typeof rashi.element).toBe('string');
      expect(typeof rashi.modality).toBe('string');
      expect(Array.isArray(rashi.planetsPresent)).toBe(true);
    }
  });

  it('should produce non-empty nakshatra DTOs in chart.nakshatras', async () => {
    const calculator = new ChartCalculator(new MockEphemerisProvider());
    const chart = await calculator.calculateChart(birthDetails, config);
    const response = mapAstroChartToResponse(chart);

    expect(response.chart.nakshatras.length).toBe(27);

    for (const nakshatra of response.chart.nakshatras) {
      const serialized = JSON.stringify(nakshatra);
      expect(serialized, `nakshatra ${nakshatra.name} must not serialize to {}`).not.toBe('{}');

      expect(typeof nakshatra.index).toBe('number');
      expect(typeof nakshatra.name).toBe('string');
      expect(typeof nakshatra.lord).toBe('string');
      expect(Array.isArray(nakshatra.planetsPresent)).toBe(true);
    }
  });

  it('should produce planet objects with distinct identities', async () => {
    const calculator = new ChartCalculator(new MockEphemerisProvider());
    const chart = await calculator.calculateChart(birthDetails, config);
    const response = mapAstroChartToResponse(chart);

    const planetNames = response.chart.planets.map(p => p.planet);
    const uniqueNames = new Set(planetNames);
    expect(uniqueNames.size).toBe(9);

    // Expected planets in Vedic astrology
    const expectedPlanets = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU'];
    for (const expected of expectedPlanets) {
      expect(planetNames, `must contain ${expected}`).toContain(expected);
    }
  });

  it('full response JSON.stringify should not contain empty object arrays', async () => {
    const calculator = new ChartCalculator(new MockEphemerisProvider());
    const chart = await calculator.calculateChart(birthDetails, config);
    const response = mapAstroChartToResponse(chart);

    const fullJson = JSON.stringify(response);
    const parsed = JSON.parse(fullJson);

    // Verify chart.planets are not [{}, {}, ...]
    for (const p of parsed.chart.planets) {
      expect(Object.keys(p).length, 'planet in serialized response must have fields').toBeGreaterThan(0);
    }

    // Verify chart.houses are not [{}, {}, ...]
    for (const h of parsed.chart.houses) {
      expect(Object.keys(h).length, 'house in serialized response must have fields').toBeGreaterThan(0);
    }

    // Verify chart.rashis are not [{}, {}, ...]
    for (const r of parsed.chart.rashis) {
      expect(Object.keys(r).length, 'rashi in serialized response must have fields').toBeGreaterThan(0);
    }

    // Verify chart.nakshatras are not [{}, {}, ...]
    for (const n of parsed.chart.nakshatras) {
      expect(Object.keys(n).length, 'nakshatra in serialized response must have fields').toBeGreaterThan(0);
    }

    // Verify ascendant is not {}
    if (parsed.chart.ascendant) {
      expect(Object.keys(parsed.chart.ascendant).length, 'ascendant must have fields').toBeGreaterThan(0);
    }
  });
});
