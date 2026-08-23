import { describe, it, expect } from 'vitest';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';
import { AstronomyEngineAdapter } from '../../src/ephemeris/astronomy-engine.adapter';
import { AstrologyConfig } from '../../src/configuration/astrology-config';
import { BirthDetails } from '../../src/input/birth-details';
import { MANDATORY_VEDIC_PLANETS, PlanetSymbol } from '../../src/planets/planet.types';

/**
 * Regression test suite for the serialization bug where AstroChart domain objects
 * were being serialized as {} by Fastify's fast-json-stringify.
 *
 * Root Cause: Fastify response schema declared `type: 'object'` without `properties`
 * or `additionalProperties: true`, causing fast-json-stringify to strip all fields.
 *
 * These tests verify that the domain model objects are plain, serializable objects
 * with enumerable properties that survive JSON.stringify().
 */
describe('AstroChart Serialization Integrity (Regression)', () => {
  const config: AstrologyConfig = {
    zodiacType: 'SIDEREAL',
    ayanamsa: 'LAHIRI',
    houseSystem: 'WHOLE_SIGN',
    nodeCalculation: 'MEAN_NODE',
    planetaryCalculationMode: 'GEOCENTRIC',
    precisionDegrees: 0.0001,
    roundingRule: 'NEAREST',
    dashaSystem: 'VIMSHOTTARI',
  };

  const birthDetails: BirthDetails = {
    date: { year: 1995, month: 8, day: 15 },
    time: { hour: 14, minute: 30, second: 0 },
    timezone: 'Asia/Kolkata',
    latitude: 28.6139,
    longitude: 77.209,
    placeName: 'New Delhi, India',
  };

  describe('with MockEphemerisProvider', () => {
    const calculator = new ChartCalculator(new MockEphemerisProvider());

    it('should serialize planets as non-empty objects via JSON.stringify', async () => {
      const chart = await calculator.calculateChart(birthDetails, config);

      for (const symbol of MANDATORY_VEDIC_PLANETS) {
        const planet = chart.planets[symbol];
        expect(planet, `planet ${symbol} should exist`).toBeDefined();

        const serialized = JSON.stringify(planet);
        expect(serialized, `JSON.stringify(${symbol}) must not be empty object`).not.toBe('{}');

        const parsed = JSON.parse(serialized);
        expect(parsed.planet, `${symbol} must have 'planet' field after serialize`).toBe(symbol);
        expect(typeof parsed.longitude, `${symbol} must have 'longitude' after serialize`).toBe('number');
        expect(typeof parsed.rashiIndex, `${symbol} must have 'rashiIndex' after serialize`).toBe('number');
        expect(typeof parsed.rashiName, `${symbol} must have 'rashiName' after serialize`).toBe('string');
        expect(typeof parsed.nakshatraIndex, `${symbol} must have 'nakshatraIndex' after serialize`).toBe('number');
        expect(typeof parsed.nakshatraName, `${symbol} must have 'nakshatraName' after serialize`).toBe('string');
        expect(typeof parsed.pada, `${symbol} must have 'pada' after serialize`).toBe('number');
      }
    });

    it('should serialize ascendant as non-empty object via JSON.stringify', async () => {
      const chart = await calculator.calculateChart(birthDetails, config);

      expect(chart.ascendant, 'ascendant should exist').toBeDefined();
      const serialized = JSON.stringify(chart.ascendant);
      expect(serialized, 'JSON.stringify(ascendant) must not be empty object').not.toBe('{}');

      const parsed = JSON.parse(serialized);
      expect(parsed.name).toBe('Ascendant');
      expect(typeof parsed.longitude).toBe('number');
      expect(typeof parsed.rashiIndex).toBe('number');
      expect(typeof parsed.degreeInRashi).toBe('number');
      expect(typeof parsed.nakshatraIndex).toBe('number');
      expect(typeof parsed.pada).toBe('number');
    });

    it('should serialize houses as non-empty objects via JSON.stringify', async () => {
      const chart = await calculator.calculateChart(birthDetails, config);

      expect(chart.houses, 'houses should exist').toBeDefined();
      expect(chart.houses!.length).toBe(12);

      for (let i = 0; i < chart.houses!.length; i++) {
        const house = chart.houses![i];
        const serialized = JSON.stringify(house);
        expect(serialized, `JSON.stringify(house[${i}]) must not be empty object`).not.toBe('{}');

        const parsed = JSON.parse(serialized);
        expect(parsed.houseNumber, `house[${i}] must have houseNumber`).toBe(i + 1);
        expect(typeof parsed.cuspLongitude, `house[${i}] must have cuspLongitude`).toBe('number');
        expect(typeof parsed.rashiIndex, `house[${i}] must have rashiIndex`).toBe('number');
        expect(typeof parsed.rashiName, `house[${i}] must have rashiName`).toBe('string');
      }
    });

    it('should have all 9 planets with distinct identities via Object.keys', async () => {
      const chart = await calculator.calculateChart(birthDetails, config);

      const planetValues = Object.values(chart.planets);
      expect(planetValues.length).toBe(MANDATORY_VEDIC_PLANETS.length);

      for (const planet of planetValues) {
        const keys = Object.keys(planet);
        expect(keys.length, `Object.keys(planet) must not be empty`).toBeGreaterThan(0);
        expect(keys).toContain('planet');
        expect(keys).toContain('longitude');
        expect(keys).toContain('rashiIndex');
      }

      // Verify distinct identities
      const identities = planetValues.map((p) => p.planet);
      const uniqueIdentities = new Set(identities);
      expect(uniqueIdentities.size, 'all planets must have unique identity').toBe(MANDATORY_VEDIC_PLANETS.length);
    });

    it('should NOT produce empty object arrays in JSON output', async () => {
      const chart = await calculator.calculateChart(birthDetails, config);
      const fullJson = JSON.stringify(chart);
      const parsed = JSON.parse(fullJson);

      // Verify no empty planet objects
      const planetValues = Object.values(parsed.planets);
      for (const p of planetValues) {
        expect(Object.keys(p as object).length, 'serialized planet must have fields').toBeGreaterThan(0);
      }

      // Verify no empty house objects
      if (parsed.houses) {
        for (const h of parsed.houses) {
          expect(Object.keys(h).length, 'serialized house must have fields').toBeGreaterThan(0);
        }
      }

      // Verify ascendant is non-empty
      if (parsed.ascendant) {
        expect(Object.keys(parsed.ascendant).length, 'serialized ascendant must have fields').toBeGreaterThan(0);
      }
    });
  });

  describe('with AstronomyEngineAdapter', () => {
    const calculator = new ChartCalculator(new AstronomyEngineAdapter());

    it('should serialize all 9 planets with non-empty objects', async () => {
      const chart = await calculator.calculateChart(birthDetails, config);

      const planetValues = Object.values(chart.planets);
      expect(planetValues.length).toBe(9);

      const identities: string[] = [];

      for (const planet of planetValues) {
        // Object.keys test
        const keys = Object.keys(planet);
        expect(keys.length, `Object.keys(${planet.planet}) must not be empty`).toBeGreaterThan(0);

        // Object.getOwnPropertyNames test
        const ownNames = Object.getOwnPropertyNames(planet);
        expect(ownNames.length, `getOwnPropertyNames(${planet.planet}) must not be empty`).toBeGreaterThan(0);

        // JSON.stringify test
        const serialized = JSON.stringify(planet);
        expect(serialized, `JSON.stringify(${planet.planet}) must not be {}`).not.toBe('{}');

        identities.push(planet.planet);
      }

      // Verify distinct planet identities
      expect(new Set(identities).size).toBe(9);
      for (const expected of MANDATORY_VEDIC_PLANETS) {
        expect(identities, `must contain ${expected}`).toContain(expected);
      }
    });

    it('should serialize ascendant with all required fields', async () => {
      const chart = await calculator.calculateChart(birthDetails, config);

      expect(chart.ascendant).toBeDefined();
      const asc = chart.ascendant!;

      expect(Object.keys(asc).length).toBeGreaterThan(0);
      expect(JSON.stringify(asc)).not.toBe('{}');

      expect(asc.name).toBe('Ascendant');
      expect(asc.longitude).toBeGreaterThanOrEqual(0);
      expect(asc.longitude).toBeLessThan(360);
      expect(asc.rashiIndex).toBeGreaterThanOrEqual(1);
      expect(asc.rashiIndex).toBeLessThanOrEqual(12);
    });

    it('should serialize 12 houses with all required fields', async () => {
      const chart = await calculator.calculateChart(birthDetails, config);

      expect(chart.houses).toBeDefined();
      expect(chart.houses!.length).toBe(12);

      for (const house of chart.houses!) {
        expect(JSON.stringify(house)).not.toBe('{}');
        expect(house.houseNumber).toBeGreaterThanOrEqual(1);
        expect(house.houseNumber).toBeLessThanOrEqual(12);
        expect(typeof house.rashiName).toBe('string');
        expect(house.rashiName.length).toBeGreaterThan(0);
      }
    });
  });
});
