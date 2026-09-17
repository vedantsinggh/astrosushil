import { describe, it, expect } from 'vitest';
import { ChartCalculator } from '../../src/chart/chart-calculator';
import { MockEphemerisProvider } from '../../src/ephemeris/mock-ephemeris.provider';
import { AstronomyEngineAdapter } from '../../src/ephemeris/astronomy-engine.adapter';
import { AstrologyConfig } from '../../src/configuration/astrology-config';
import { BirthDetails } from '../../src/input/birth-details';
import { MANDATORY_VEDIC_PLANETS, PlanetSymbol } from '../../src/planets/planet.types';

import { AshtottariCalculator } from '../../src/dasha/ashtottari-calculator';
import { DashaCalculator } from '../../src/dasha/dasha-calculator';
import { DashaRegistry } from '../../src/dasha/dasha-registry';

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

      for (const planet of planetValues) {
        expect(JSON.stringify(planet)).not.toBe('{}');
        expect(Object.keys(planet).length).toBeGreaterThan(0);
      }
    });

    it('should serialize ascendant with all expected fields', async () => {
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

  describe('Dasha Serialization Integrity (Vimshottari & Ashtottari - Step 11)', () => {
    const ashtottariCalc = new AshtottariCalculator();
    const vimshottariCalc = new DashaCalculator();
    const birthDate = new Date('1995-08-15T14:30:00.000Z');
    const targetDate = '2026-09-08T00:00:00.000Z';

    it('should serialize AshtottariDashaTree with zero empty objects or missing fields', () => {
      const tree = ashtottariCalc.calculateAshtottariDasha(100.0, birthDate, {
        maxLevel: 3,
        targetDate,
      });

      const serialized = JSON.stringify(tree);
      expect(serialized).not.toBe('{}');

      // Check regex for empty object "{}" anywhere in serialized output
      // Note: empty objects might be representation of empty dicts, but periods must not be {}
      const parsed = JSON.parse(serialized);

      expect(parsed.dashaSystem).toBe('ASHTOTTARI');
      expect(parsed.totalCycleYears).toBe(108);
      expect(typeof parsed.moonLongitude).toBe('number');
      expect(typeof parsed.moonNakshatraName).toBe('string');
      expect(typeof parsed.sectorName).toBe('string');
      expect(typeof parsed.sectorIndex).toBe('number');
      expect(typeof parsed.balanceAtBirthYears).toBe('number');
      expect(typeof parsed.elapsedAtBirthYears).toBe('number');

      // Verify all 8 Mahadashas survive serialization
      expect(parsed.mahadashas).toHaveLength(8);
      for (const maha of parsed.mahadashas) {
        expect(JSON.stringify(maha)).not.toBe('{}');
        expect(maha.level).toBe(1);
        expect(typeof maha.lord).toBe('string');
        expect(typeof maha.order).toBe('number');
        expect(typeof maha.startDateIso).toBe('string');
        expect(typeof maha.endDateIso).toBe('string');
        expect(typeof maha.durationYears).toBe('number');
        expect(typeof maha.nominalYears).toBe('number');
        expect(typeof maha.isBirthDasha).toBe('boolean');

        // Subperiods
        if (maha.subPeriods) {
          for (const antar of maha.subPeriods) {
            expect(JSON.stringify(antar)).not.toBe('{}');
            expect(antar.level).toBe(2);
            expect(typeof antar.lord).toBe('string');
            expect(typeof antar.parentLord).toBe('string');
            expect(typeof antar.order).toBe('number');
            expect(typeof antar.startDateIso).toBe('string');
            expect(typeof antar.endDateIso).toBe('string');

            if (antar.subPeriods) {
              for (const pratyantar of antar.subPeriods) {
                expect(JSON.stringify(pratyantar)).not.toBe('{}');
                expect(pratyantar.level).toBe(3);
                expect(typeof pratyantar.lord).toBe('string');
              }
            }
          }
        }
      }

      // Verify activeDasha survives serialization
      expect(parsed.activeDasha).toBeDefined();
      expect(JSON.stringify(parsed.activeDasha)).not.toBe('{}');
      expect(parsed.activeDasha.targetDateIso).toBe(targetDate);
      expect(parsed.activeDasha.mahadasha).toBeDefined();
      expect(JSON.stringify(parsed.activeDasha.mahadasha)).not.toBe('{}');
      expect(parsed.activeDasha.path.length).toBeGreaterThan(0);
      expect(parsed.activeDasha.description.length).toBeGreaterThan(0);
    });

    it('should serialize Ashtottari eligibility without empty objects', async () => {
      const chartCalc = new ChartCalculator(new MockEphemerisProvider());
      const chart = await chartCalc.calculateChart(birthDetails, config);
      const tree = ashtottariCalc.calculateForChart(chart, { maxLevel: 2 });

      expect(tree.eligibility).toBeDefined();
      const el = tree.eligibility!;
      const serialized = JSON.stringify(el);
      expect(serialized).not.toBe('{}');

      const parsed = JSON.parse(serialized);
      expect(typeof parsed.isEligible).toBe('boolean');
      expect(typeof parsed.rahuHouseFromLagna).toBe('number');
      expect(typeof parsed.rahuHouseFromLagnaLord).toBe('number');
      expect(typeof parsed.lagnaLord).toBe('string');
      expect(typeof parsed.paksha).toBe('string');
      expect(typeof parsed.birthTimeOfDay).toBe('string');
      expect(typeof parsed.reason).toBe('string');
      expect(parsed.reason.length).toBeGreaterThan(0);
    });

    it('should serialize VimshottariDashaTree with zero empty objects', () => {
      const tree = vimshottariCalc.calculateVimshottariDasha(100.0, birthDate, {
        maxLevel: 3,
        targetDate,
      });

      const serialized = JSON.stringify(tree);
      expect(serialized).not.toBe('{}');

      const parsed = JSON.parse(serialized);
      expect(parsed.dashaSystem).toBe('VIMSHOTTARI');
      expect(parsed.totalCycleYears).toBe(120);
      expect(parsed.mahadashas).toHaveLength(9);

      for (const maha of parsed.mahadashas) {
        expect(JSON.stringify(maha)).not.toBe('{}');
        expect(typeof maha.lord).toBe('string');
        expect(typeof maha.startDateIso).toBe('string');
      }
    });

    it('should serialize all 7 Phase 2R Dasha systems with zero empty objects', async () => {
      const chartCalc = new ChartCalculator(new MockEphemerisProvider());
      const chart = await chartCalc.calculateChart(birthDetails, config);
      const targetDate = new Date('2026-01-01T00:00:00.000Z');

      const systems = [
        'STHIRA',
        'SHOOLA',
        'DWISAPTATI_SAMA',
        'SHATABDIKA',
        'CHATURASEETI_SAMA',
        'DWADASHOTTARI',
        'PANCHOTTARI',
      ] as const;

      for (const sys of systems) {
        const result = DashaRegistry.calculateDasha(sys, chart, { maxLevel: 2, targetDate });
        const serialized = JSON.stringify(result);
        expect(serialized, `${sys} serialization must not be empty object`).not.toBe('{}');
        expect(serialized).not.toContain('"{}"');
        expect(serialized).not.toContain('null,');

        const parsed = JSON.parse(serialized);
        expect(parsed.dashaSystem).toBe(sys);
      }
    });

    it('should serialize VarshaphalaChart without empty objects, NaN or undefined', async () => {
      const { VarshaphalaCalculator } = await import('../../src/varshaphala/varshaphala-calculator');
      const varshaphalaCalc = new VarshaphalaCalculator();
      const result = await varshaphalaCalc.calculateVarshaphala(birthDetails, {
        targetYear: 2026,
      });

      const serialized = JSON.stringify(result);
      expect(serialized).not.toBe('{}');
      expect(serialized).not.toContain('"{}"');
      expect(serialized).not.toContain('NaN');
      expect(serialized).not.toContain('null,');

      const parsed = JSON.parse(serialized);
      expect(parsed.convention).toBeDefined();
      expect(parsed.convention.zodiac).toBe('SIDEREAL');
      expect(parsed.solarReturn).toBeDefined();
      expect(parsed.solarReturn.targetYear).toBe(2026);
      expect(parsed.solarReturn.natalSunSign).toBeDefined();
      expect(parsed.solarReturn.solarReturnSunSign).toBeDefined();

      expect(parsed.varshaLagna).toBeDefined();
      expect(parsed.planets).toBeDefined();
      expect(Object.keys(parsed.planets).length).toBe(9);
      for (const p of Object.values(parsed.planets) as any[]) {
        expect(Object.keys(p).length).toBeGreaterThan(0);
        expect(typeof p.house).toBe('number');
        expect(typeof p.isCombust).toBe('boolean');
      }

      expect(parsed.houses).toBeDefined();
      expect(parsed.houses.length).toBe(12);
      for (const h of parsed.houses) {
        expect(Object.keys(h).length).toBeGreaterThan(0);
        expect(typeof h.lord).toBe('string');
        expect(Array.isArray(h.occupyingPlanets)).toBe(true);
      }

      expect(parsed.muntha).toBeDefined();
      expect(typeof parsed.muntha.progressionIndex).toBe('number');
      expect(parsed.panchadhikari).toBeDefined();
      expect(parsed.varshesha).toBeDefined();
      expect(parsed.harshaBala).toBeDefined();
      expect(parsed.tajikaYogas).toBeDefined();
      expect(parsed.sahams).toBeDefined();
      expect(parsed.muddaDasha).toBeDefined();
      expect(parsed.panchanga).toBeDefined();
    });

    it('should serialize PrashnaChart without empty objects, NaN or undefined', async () => {
      const { PrashnaCalculator } = await import('../../src/prashna/prashna-calculator');
      const prashnaCalc = new PrashnaCalculator();
      const result = await prashnaCalc.calculatePrashna({
        questionTimestamp: '2026-09-17T10:30:00+05:30',
        timezone: 'Asia/Kolkata',
        location: {
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
          placeName: 'New Delhi, India',
        },
        questionNumber: 42,
        questionNumberSystem: 'PARASHARI_1_108',
        questionText: 'Will the contract finalize?',
      });

      const serialized = JSON.stringify(result);
      expect(serialized).not.toBe('{}');
      expect(serialized).not.toContain('"{}"');
      expect(serialized).not.toContain('NaN');
      expect(serialized).not.toContain('null,');

      const parsed = JSON.parse(serialized);
      expect(parsed.convention).toBeDefined();
      expect(parsed.convention.zodiac).toBe('SIDEREAL');
      expect(parsed.convention.houseSystem).toBe('WHOLE_SIGN');

      expect(parsed.questionTime).toBeDefined();
      expect(parsed.questionTime.utcIso).toBeDefined();
      expect(parsed.questionTime.localIso).toBeDefined();

      expect(parsed.prashnaLagna).toBeDefined();
      expect(typeof parsed.prashnaLagna.longitude).toBe('number');
      expect(typeof parsed.prashnaLagna.rashiIndex).toBe('number');
      expect(typeof parsed.prashnaLagna.lord).toBe('string');

      expect(parsed.planets).toBeDefined();
      expect(Object.keys(parsed.planets).length).toBe(9);
      for (const p of Object.values(parsed.planets) as any[]) {
        expect(Object.keys(p).length).toBeGreaterThan(0);
        expect(typeof p.house).toBe('number');
        expect(typeof p.isCombust).toBe('boolean');
      }

      expect(parsed.houses).toBeDefined();
      expect(parsed.houses.length).toBe(12);
      for (const h of parsed.houses) {
        expect(Object.keys(h).length).toBeGreaterThan(0);
        expect(typeof h.lord).toBe('string');
        expect(Array.isArray(h.occupyingPlanets)).toBe(true);
      }

      expect(parsed.moon).toBeDefined();
      expect(typeof parsed.moon.house).toBe('number');
      expect(typeof parsed.moon.isWaxing).toBe('boolean');
      expect(Array.isArray(parsed.moon.aspectsReceived)).toBe(true);

      expect(parsed.sphutas).toBeDefined();
      expect(parsed.sphutas.gulika).toBeDefined();
      expect(parsed.sphutas.trisphuta).toBeDefined();
      expect(parsed.sphutas.chatusphuta).toBeDefined();
      expect(parsed.sphutas.panchasphuta).toBeDefined();
      expect(typeof parsed.sphutas.gulika.house).toBe('number');

      expect(parsed.questionNumberDetails).toBeDefined();
      expect(parsed.questionNumberDetails.system).toBe('PARASHARI_1_108');
      expect(parsed.questionNumberDetails.number).toBe(42);

      expect(parsed.panchanga).toBeDefined();
      expect(typeof parsed.isRahuKala).toBe('boolean');
    });
  });
});

