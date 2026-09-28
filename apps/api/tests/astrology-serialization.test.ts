import { describe, it, expect } from 'vitest';
import { mapAstroChartToResponse } from '../src/modules/astrology/astrology-response.mapper';
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

  it('dasha API response (Vimshottari & Ashtottari) should not contain empty objects', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');

    const dashaInput = {
      name: 'Serialization Native',
      dateOfBirth: '1995-08-15',
      timeOfBirth: '14:30:00',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
    };

    // Test Vimshottari
    const vimshottariRes = await astrologyService.calculateDasha({
      birthDetails: dashaInput,
      dashaSystem: 'VIMSHOTTARI',
      maxLevel: 3,
      targetDate: '2026-09-08T00:00:00.000Z',
    });

    const vimJson = JSON.stringify(vimshottariRes);
    const vimParsed = JSON.parse(vimJson);
    expect(vimParsed.dashaTree).toBeDefined();
    expect(vimParsed.dashaTree.mahadashas.length).toBe(9);
    for (const m of vimParsed.dashaTree.mahadashas) {
      expect(Object.keys(m).length, 'Mahadasha in Vimshottari response must not be {}').toBeGreaterThan(0);
      expect(m.lord).toBeDefined();
    }

    // Test Ashtottari
    const ashtottariRes = await astrologyService.calculateDasha({
      birthDetails: dashaInput,
      dashaSystem: 'ASHTOTTARI',
      maxLevel: 3,
      targetDate: '2026-09-08T00:00:00.000Z',
    });

    const ashJson = JSON.stringify(ashtottariRes);
    const ashParsed = JSON.parse(ashJson);
    expect(ashParsed.dashaTree).toBeDefined();
    expect(ashParsed.dashaTree.dashaSystem).toBe('ASHTOTTARI');

    if (ashParsed.dashaTree.mahadashas) {
      expect(ashParsed.dashaTree.mahadashas.length).toBe(8);
      for (const m of ashParsed.dashaTree.mahadashas) {
        expect(Object.keys(m).length, 'Mahadasha in Ashtottari response must not be {}').toBeGreaterThan(0);
        expect(m.lord).toBeDefined();
        expect(m.startDateIso).toBeDefined();
        expect(m.endDateIso).toBeDefined();
      }
    }

    // Eligibility object not {}
    expect(ashParsed.dashaTree.eligibility).toBeDefined();
    expect(Object.keys(ashParsed.dashaTree.eligibility).length).toBeGreaterThan(0);

    // Active Dasha object not {} if present
    if (ashParsed.dashaTree.activeDasha) {
      expect(Object.keys(ashParsed.dashaTree.activeDasha).length).toBeGreaterThan(0);
      expect(ashParsed.dashaTree.activeDasha.mahadasha.lord).toBeDefined();
    }
  });

  it('Varshaphala API response should serialize without empty {} objects, NaN or undefined', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');

    const varshaphalaRes = await astrologyService.calculateVarshaphala({
      birthDetails: {
        name: 'Varshaphala Native',
        dateOfBirth: '1992-08-20',
        timeOfBirth: '10:15:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
        placeName: 'New Delhi, India',
      },
      targetYear: 2026,
    });

    const serialized = JSON.stringify(varshaphalaRes);
    expect(serialized).not.toBe('{}');
    expect(serialized).not.toContain('"{}"');
    expect(serialized).not.toContain('NaN');
    expect(serialized).not.toContain('null,');

    const parsed = JSON.parse(serialized);

    // 1. Solar Return Details
    expect(parsed.solarReturn).toBeDefined();
    expect(parsed.solarReturn.targetYear).toBe(2026);
    expect(typeof parsed.solarReturn.natalSunLongitude).toBe('number');
    expect(typeof parsed.solarReturn.natalSunSign).toBe('string');
    expect(typeof parsed.solarReturn.solarReturnSunLongitude).toBe('number');
    expect(typeof parsed.solarReturn.solarReturnSunSign).toBe('string');
    expect(typeof parsed.solarReturn.solarReturnUtcIso).toBe('string');
    expect(typeof parsed.solarReturn.solarReturnLocalIso).toBe('string');

    // 2. Varsha Lagna
    expect(parsed.varshaLagna).toBeDefined();
    expect(typeof parsed.varshaLagna.rashiIndex).toBe('number');
    expect(typeof parsed.varshaLagna.rashiName).toBe('string');
    expect(typeof parsed.varshaLagna.lord).toBe('string');

    // 3. Planets (9 Vedic Planets)
    expect(parsed.planets).toBeDefined();
    const planetsList = Object.values(parsed.planets) as any[];
    expect(planetsList.length).toBe(9);
    for (const p of planetsList) {
      expect(Object.keys(p).length).toBeGreaterThan(0);
      expect(typeof p.planet).toBe('string');
      expect(typeof p.longitude).toBe('number');
      expect(typeof p.rashiIndex).toBe('number');
      expect(typeof p.house).toBe('number');
      expect(typeof p.isCombust).toBe('boolean');
    }

    // 4. Houses (12 Whole Sign Houses)
    expect(parsed.houses).toBeDefined();
    expect(parsed.houses.length).toBe(12);
    for (const h of parsed.houses) {
      expect(Object.keys(h).length).toBeGreaterThan(0);
      expect(typeof h.houseNumber).toBe('number');
      expect(typeof h.sign).toBe('string');
      expect(typeof h.lord).toBe('string');
      expect(Array.isArray(h.occupyingPlanets)).toBe(true);
    }

    // 5. Muntha
    expect(parsed.muntha).toBeDefined();
    expect(typeof parsed.muntha.rashiIndex).toBe('number');
    expect(typeof parsed.muntha.rashiName).toBe('string');
    expect(typeof parsed.muntha.progressionYears).toBe('number');
    expect(typeof parsed.muntha.progressionIndex).toBe('number');

    // 6. Panchadhikari & Varshesha
    expect(parsed.panchadhikari).toBeDefined();
    expect(parsed.panchadhikari.candidates.length).toBe(5);
    for (const c of parsed.panchadhikari.candidates) {
      expect(typeof c.role).toBe('string');
      expect(typeof c.planet).toBe('string');
      expect(typeof c.harshaBalaScore).toBe('number');
    }
    expect(parsed.varshesha).toBeDefined();
    expect(typeof parsed.varshesha.selectedVarshesha).toBe('string');
    expect(typeof parsed.varshesha.selectionReason).toBe('string');
    expect(typeof parsed.varshesha.convention).toBe('string');

    // 7. Harsha Bala
    expect(parsed.harshaBala).toBeDefined();
    expect(parsed.harshaBala.SUN).toBeDefined();
    expect(typeof parsed.harshaBala.SUN.totalScore).toBe('number');

    // 8. Tajika Yogas
    expect(Array.isArray(parsed.tajikaYogas)).toBe(true);

    // 9. Sahams
    expect(parsed.sahams).toBeDefined();
    expect(parsed.sahams.length).toBe(10);
    for (const s of parsed.sahams) {
      expect(typeof s.name).toBe('string');
      expect(typeof s.longitude).toBe('number');
      expect(typeof s.formula).toBe('string');
      expect(Array.isArray(s.sourcePoints)).toBe(true);
    }

    // 10. Mudda Dasha
    expect(parsed.muddaDasha).toBeDefined();
    expect(parsed.muddaDasha.dashaSystem).toBe('MUDDA');
    expect(parsed.muddaDasha.periods.length).toBe(9);
    for (const period of parsed.muddaDasha.periods) {
      expect(typeof period.lord).toBe('string');
      expect(typeof period.startDateIso).toBe('string');
      expect(typeof period.endDateIso).toBe('string');
    }

    // 11. Panchanga
    expect(parsed.panchanga).toBeDefined();
    expect(parsed.panchanga.tithi).toBeDefined();
    expect(parsed.panchanga.nakshatra).toBeDefined();
  });

  it('Prashna API response should serialize without empty {} objects, NaN or undefined', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');

    const prashnaRes = await astrologyService.calculatePrashna({
      questionTimestamp: '2026-09-17T10:30:00+05:30',
      timezone: 'Asia/Kolkata',
      location: {
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
        placeName: 'New Delhi, India',
      },
      questionNumber: 81,
      questionNumberSystem: 'PARASHARI_1_108',
      questionText: 'Will I relocate abroad?',
    });

    const json = JSON.stringify(prashnaRes);
    expect(json).not.toBe('{}');
    expect(json).not.toContain('"{}"');
    expect(json).not.toContain('NaN');
    expect(json).not.toContain('null,');

    const parsed = JSON.parse(json);

    // 1. Convention & Metadata
    expect(parsed.calculationVersion).toBeDefined();
    expect(parsed.convention).toBeDefined();
    expect(parsed.convention.zodiac).toBe('SIDEREAL');
    expect(parsed.convention.ayanamsa).toBe('LAHIRI');

    // 2. Question Time & Location
    expect(parsed.questionTime).toBeDefined();
    expect(parsed.questionTime.utcIso).toBeDefined();
    expect(parsed.questionTime.localIso).toBeDefined();
    expect(parsed.location).toBeDefined();
    expect(parsed.location.latitude).toBe(28.6139);
    expect(parsed.questionText).toBe('Will I relocate abroad?');

    // 3. Prashna Lagna
    expect(parsed.prashnaLagna).toBeDefined();
    expect(Object.keys(parsed.prashnaLagna).length).toBeGreaterThan(0);
    expect(typeof parsed.prashnaLagna.longitude).toBe('number');
    expect(typeof parsed.prashnaLagna.rashiIndex).toBe('number');
    expect(typeof parsed.prashnaLagna.lord).toBe('string');

    // 4. Planets (9 Vedic Planets)
    expect(parsed.planets).toBeDefined();
    expect(Object.keys(parsed.planets).length).toBe(9);
    for (const p of Object.values(parsed.planets) as any[]) {
      expect(Object.keys(p).length).toBeGreaterThan(0);
      expect(typeof p.house).toBe('number');
      expect(typeof p.isCombust).toBe('boolean');
      expect(typeof p.longitude).toBe('number');
    }

    // 5. Houses (12 Whole Sign Houses)
    expect(parsed.houses).toBeDefined();
    expect(parsed.houses.length).toBe(12);
    for (const h of parsed.houses) {
      expect(Object.keys(h).length).toBeGreaterThan(0);
      expect(typeof h.houseNumber).toBe('number');
      expect(typeof h.sign).toBe('string');
      expect(typeof h.lord).toBe('string');
      expect(Array.isArray(h.occupyingPlanets)).toBe(true);
    }

    // 6. Moon
    expect(parsed.moon).toBeDefined();
    expect(typeof parsed.moon.house).toBe('number');
    expect(typeof parsed.moon.isWaxing).toBe('boolean');
    expect(Array.isArray(parsed.moon.aspectsReceived)).toBe(true);

    // 7. Sphutas
    expect(parsed.sphutas).toBeDefined();
    expect(parsed.sphutas.gulika).toBeDefined();
    expect(parsed.sphutas.trisphuta).toBeDefined();
    expect(parsed.sphutas.chatusphuta).toBeDefined();
    expect(parsed.sphutas.panchasphuta).toBeDefined();
    expect(typeof parsed.sphutas.gulika.house).toBe('number');

    // 8. Question Number Details
    expect(parsed.questionNumberDetails).toBeDefined();
    expect(parsed.questionNumberDetails.system).toBe('PARASHARI_1_108');
    expect(parsed.questionNumberDetails.number).toBe(81);
    expect(typeof parsed.questionNumberDetails.arudhaHouseFromLagna).toBe('number');

    // 9. Panchanga & Rahu Kala
    expect(parsed.panchanga).toBeDefined();
    expect(parsed.panchanga.tithi).toBeDefined();
    expect(parsed.panchanga.vara).toBeDefined();
    expect(typeof parsed.isRahuKala).toBe('boolean');
  });

  it('Compatibility & Matchmaking API response should serialize without empty {} objects, NaN or undefined', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');

    const compatibilityRes = await astrologyService.calculateCompatibility({
      personA: {
        birthDetails: {
          name: 'Person A (Groom)',
          dateOfBirth: '1992-05-10',
          timeOfBirth: '10:00:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
          placeName: 'New Delhi, India',
        },
      },
      personB: {
        birthDetails: {
          name: 'Person B (Bride)',
          dateOfBirth: '1994-08-20',
          timeOfBirth: '18:30:00',
          latitude: 19.076,
          longitude: 72.8777,
          timezone: 'Asia/Kolkata',
          placeName: 'Mumbai, India',
        },
      },
    });

    const serialized = JSON.stringify(compatibilityRes);
    expect(serialized).not.toBe('{}');
    expect(serialized).not.toContain('"{}"');
    expect(serialized).not.toContain('NaN');
    expect(serialized).not.toContain('null,');

    const parsed = JSON.parse(serialized);

    // 1. Root structure
    expect(parsed.personA).toBeDefined();
    expect(parsed.personB).toBeDefined();
    expect(parsed.compatibility).toBeDefined();

    const comp = parsed.compatibility;

    // 2. Metadata & Convention
    expect(comp.calculationVersion).toBe('0.1.0');
    expect(comp.convention).toBeDefined();
    expect(comp.convention.totalMaxScore).toBe(36);
    expect(comp.convention.ayanamsa).toBe('LAHIRI');
    expect(comp.convention.zodiac).toBe('SIDEREAL');

    // 3. Derived Moon Profiles
    expect(comp.personA).toBeDefined();
    expect(typeof comp.personA.moonLongitude).toBe('number');
    expect(typeof comp.personA.rashiIndex).toBe('number');
    expect(typeof comp.personA.rashiName).toBe('string');
    expect(typeof comp.personA.rashiLord).toBe('string');
    expect(typeof comp.personA.nakshatraIndex).toBe('number');
    expect(typeof comp.personA.nakshatraName).toBe('string');
    expect(typeof comp.personA.pada).toBe('number');
    expect(typeof comp.personA.varna).toBe('string');
    expect(typeof comp.personA.varnaRank).toBe('number');
    expect(typeof comp.personA.vashya).toBe('string');
    expect(typeof comp.personA.gana).toBe('string');
    expect(typeof comp.personA.yoni.animal).toBe('string');
    expect(typeof comp.personA.yoni.gender).toBe('string');
    expect(typeof comp.personA.nadi).toBe('string');

    expect(comp.personB).toBeDefined();
    expect(typeof comp.personB.moonLongitude).toBe('number');
    expect(typeof comp.personB.rashiIndex).toBe('number');

    // 4. Ashtakoota 8 Kootas
    expect(comp.ashtakoota).toBeDefined();
    expect(comp.ashtakoota.totalMaxPoints).toBe(36);
    expect(typeof comp.ashtakoota.totalObtainedPoints).toBe('number');
    expect(typeof comp.ashtakoota.isCompatible).toBe('boolean');

    const kootas = comp.ashtakoota.kootas;
    expect(kootas.varna).toBeDefined();
    expect(kootas.varna.maxPoints).toBe(1);
    expect(typeof kootas.varna.obtainedPoints).toBe('number');
    expect(Object.keys(kootas.varna.evidence).length).toBeGreaterThan(0);

    expect(kootas.vashya).toBeDefined();
    expect(kootas.vashya.maxPoints).toBe(2);
    expect(typeof kootas.vashya.obtainedPoints).toBe('number');

    expect(kootas.tara).toBeDefined();
    expect(kootas.tara.maxPoints).toBe(3);
    expect(typeof kootas.tara.obtainedPoints).toBe('number');

    expect(kootas.yoni).toBeDefined();
    expect(kootas.yoni.maxPoints).toBe(4);
    expect(typeof kootas.yoni.obtainedPoints).toBe('number');

    expect(kootas.grahaMaitri).toBeDefined();
    expect(kootas.grahaMaitri.maxPoints).toBe(5);
    expect(typeof kootas.grahaMaitri.obtainedPoints).toBe('number');

    expect(kootas.gana).toBeDefined();
    expect(kootas.gana.maxPoints).toBe(6);
    expect(typeof kootas.gana.obtainedPoints).toBe('number');

    expect(kootas.bhakoot).toBeDefined();
    expect(kootas.bhakoot.maxPoints).toBe(7);
    expect(typeof kootas.bhakoot.obtainedPoints).toBe('number');

    expect(kootas.nadi).toBeDefined();
    expect(kootas.nadi.maxPoints).toBe(8);
    expect(typeof kootas.nadi.obtainedPoints).toBe('number');

    // 5. Manglik Comparison
    expect(comp.manglikComparison).toBeDefined();
    expect(comp.manglikComparison.personA).toBeDefined();
    expect(typeof comp.manglikComparison.personA.isManglik).toBe('boolean');
    expect(comp.manglikComparison.personB).toBeDefined();
    expect(typeof comp.manglikComparison.personB.isManglik).toBe('boolean');
    expect(typeof comp.manglikComparison.verdict).toBe('string');
    expect(typeof comp.manglikComparison.isDoshaCancelledByMatch).toBe('boolean');
    expect(typeof comp.manglikComparison.explanation).toBe('string');

    // 6. Overall Summary
    expect(comp.overallSummary).toBeDefined();
    expect(comp.overallSummary.totalScore).toBe(comp.ashtakoota.totalObtainedPoints);
    expect(comp.overallSummary.maxScore).toBe(36);
  });

  it('Gochara (Transit) snapshot API response should serialize without empty {} objects, NaN or undefined', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');

    const gocharaRes = await astrologyService.calculateGochara({
      timestamp: '2026-03-20T12:00:00Z',
      timezone: 'Asia/Kolkata',
      location: {
        latitude: 28.6139,
        longitude: 77.209,
        placeName: 'New Delhi, India',
      },
      birthDetails: {
        name: 'Natal Test Subject',
        dateOfBirth: '1990-01-15',
        timeOfBirth: '08:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      vargas: ['D1', 'D9'],
    });

    const serialized = JSON.stringify(gocharaRes);
    expect(serialized).not.toBe('{}');
    expect(serialized).not.toContain('"{}"');
    expect(serialized).not.toContain('NaN');
    expect(serialized).not.toContain('null,');

    const parsed = JSON.parse(serialized);

    // 1. Root structure
    expect(parsed.calculationVersion).toBeDefined();
    expect(parsed.transitChart).toBeDefined();
    expect(parsed.transitChart.transitTime.utcIso).toBe('2026-03-20T12:00:00.000Z');
    expect(parsed.transitChart.location).toBeDefined();
    expect(parsed.transitChart.location.latitude).toBe(28.6139);

    // 2. Transit Lagna & Planets
    expect(parsed.transitChart.ascendant).toBeDefined();
    expect(typeof parsed.transitChart.ascendant.longitude).toBe('number');
    expect(typeof parsed.transitChart.ascendant.rashiIndex).toBe('number');

    expect(parsed.transitChart.planets).toBeDefined();
    expect(Object.keys(parsed.transitChart.planets).length).toBe(9);
    for (const p of Object.values(parsed.transitChart.planets) as any[]) {
      expect(Object.keys(p).length).toBeGreaterThan(0);
      expect(typeof p.longitude).toBe('number');
      expect(typeof p.house).toBe('number');
      expect(typeof p.isRetrograde).toBe('boolean');
    }

    // 3. Houses (12 Whole Sign Houses)
    expect(parsed.transitChart.houses).toBeDefined();
    expect(parsed.transitChart.houses.length).toBe(12);
    for (const h of parsed.transitChart.houses) {
      expect(Object.keys(h).length).toBeGreaterThan(0);
      expect(typeof h.houseNumber).toBe('number');
      expect(typeof h.rashiName).toBe('string');
      expect(typeof h.lord).toBe('string');
    }

    // 4. Parashari Drishti Aspects
    expect(parsed.aspectsToNatal).toBeDefined();
    expect(Array.isArray(parsed.aspectsToNatal)).toBe(true);

    // 5. Natal Relationships
    expect(parsed.transitToLagna).toBeDefined();
    expect(parsed.transitToLagna.length).toBe(9);
    expect(parsed.transitToMoon).toBeDefined();
    expect(parsed.transitToMoon.length).toBe(9);
    expect(parsed.transitToNatalPlanets).toBeDefined();
    expect(parsed.ashtakavargaTransit).toBeDefined();
    expect(parsed.ashtakavargaTransit.length).toBe(9);
    expect(parsed.gocharaKakshas).toBeDefined();
    expect(parsed.gocharaKakshas.length).toBe(9);
    expect(parsed.vargaTransits).toBeDefined();
  });

  it('Gochara (Transit) timeline API response should serialize without empty {} objects, NaN or undefined', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');

    const timelineRes = await astrologyService.calculateGocharaTimeline({
      startDate: '2026-03-01',
      endDate: '2026-04-15',
      timezone: 'Asia/Kolkata',
      planets: ['SUN', 'MARS', 'JUPITER'],
    });

    const serialized = JSON.stringify(timelineRes);
    expect(serialized).not.toBe('{}');
    expect(serialized).not.toContain('"{}"');
    expect(serialized).not.toContain('NaN');

    const parsed = JSON.parse(serialized);

    expect(parsed.startDateIso).toBe('2026-03-01T00:00:00.000Z');
    expect(parsed.endDateIso).toBe('2026-04-15T00:00:00.000Z');
    expect(parsed.eventCount).toBeGreaterThan(0);
    expect(Array.isArray(parsed.events)).toBe(true);

    for (const evt of parsed.events) {
      expect(typeof evt.timestampIso).toBe('string');
      expect(typeof evt.planet).toBe('string');
      expect(typeof evt.eventType).toBe('string');
      expect(typeof evt.longitude).toBe('number');
    }
  });

  it('Yoga evaluation API response should serialize without empty {} objects, NaN or undefined', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');

    const yogaRes = await astrologyService.calculateYogas({
      birthDetails: {
        name: 'Yoga Test Subject',
        dateOfBirth: '1990-01-15',
        timeOfBirth: '08:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      varga: 'D1',
      includeUndetected: true,
    });

    const serialized = JSON.stringify(yogaRes);
    expect(serialized).not.toBe('{}');
    expect(serialized).not.toContain('"{}"');
    expect(serialized).not.toContain('NaN');
    expect(serialized).not.toContain('null,');

    const parsed = JSON.parse(serialized);

    // 1. Root structure
    expect(parsed.calculationVersion).toBe('0.1.0');
    expect(parsed.varga).toBe('D1');
    expect(typeof parsed.totalEvaluated).toBe('number');
    expect(parsed.totalEvaluated).toBeGreaterThan(0);
    expect(typeof parsed.detectedCount).toBe('number');
    expect(Array.isArray(parsed.detectedYogas)).toBe(true);

    // 2. Detected Yogas format
    for (const y of parsed.detectedYogas) {
      expect(typeof y.id).toBe('string');
      expect(typeof y.canonicalName).toBe('string');
      expect(typeof y.sanskritName).toBe('string');
      expect(typeof y.category).toBe('string');
      expect(y.isDetected).toBe(true);
      expect(typeof y.convention).toBe('string');
      expect(y.evidence).toBeDefined();
      expect(Array.isArray(y.evidence.conditions)).toBe(true);
      for (const cond of y.evidence.conditions) {
        expect(typeof cond.id).toBe('string');
        expect(typeof cond.description).toBe('string');
        expect(typeof cond.satisfied).toBe('boolean');
        expect(cond.expected).toBeDefined();
        expect(cond.observed).toBeDefined();
      }
    }
  });

  it('should serialize Special Points without {} leakage or NaN', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');
    const res = await astrologyService.calculateSpecialPoints({
      birthDetails: {
        name: 'Special Points Subject',
        dateOfBirth: '1990-01-15',
        timeOfBirth: '08:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
    });

    const serialized = JSON.stringify(res);
    expect(serialized).not.toBe('{}');
    expect(serialized).not.toContain('"{}"');
    expect(serialized).not.toContain('NaN');
    expect(serialized).not.toContain('null,');

    const parsed = JSON.parse(serialized);
    expect(parsed.upagrahas.dhooma).toBeDefined();
    expect(parsed.specialLagnas.bhavaLagna).toBeDefined();
    expect(parsed.arishtaPoints.sixtyFourthNavamshaMoon).toBeDefined();
    expect(parsed.yogiPoints.yogiPoint).toBeDefined();
    expect(parsed.mrityuBhaga.points.length).toBeGreaterThan(0);
  });

  it('should serialize Jaimini report without {} leakage or NaN', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');
    const res = await astrologyService.calculateJaimini({
      birthDetails: {
        name: 'Jaimini Subject',
        dateOfBirth: '1990-01-15',
        timeOfBirth: '08:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      scheme: 'SEVEN_KARAKA',
    });

    const serialized = JSON.stringify(res);
    expect(serialized).not.toBe('{}');
    expect(serialized).not.toContain('"{}"');
    expect(serialized).not.toContain('NaN');

    const parsed = JSON.parse(serialized);
    expect(parsed.charaKarakas.length).toBe(7);
    expect(parsed.arudhaPadas.length).toBe(12);
    expect(parsed.arudhaLagna).toBeDefined();
    expect(parsed.upapadaLagna).toBeDefined();
    expect(parsed.karakamsha).toBeDefined();
  });

  it('should serialize KP report without {} leakage or NaN', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');
    const res = await astrologyService.calculateKP({
      birthDetails: {
        name: 'KP Subject',
        dateOfBirth: '1990-01-15',
        timeOfBirth: '08:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
    });

    const serialized = JSON.stringify(res);
    expect(serialized).not.toBe('{}');
    expect(serialized).not.toContain('"{}"');
    expect(serialized).not.toContain('NaN');

    const parsed = JSON.parse(serialized);
    expect(parsed.cusps.length).toBe(12);
    expect(parsed.houseSignificators.length).toBe(12);
    expect(parsed.rulingPlanets).toBeDefined();
    expect(parsed.parsFortuna).toBeDefined();
  });

  it('should serialize Sade Sati report without {} leakage or NaN', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');
    const res = await astrologyService.calculateSadeSati({
      birthDetails: {
        name: 'Sade Sati Subject',
        dateOfBirth: '1990-01-15',
        timeOfBirth: '08:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      transitSaturnLongitude: 45.0,
    });

    const serialized = JSON.stringify(res);
    expect(serialized).not.toBe('{}');
    expect(serialized).not.toContain('"{}"');
    expect(serialized).not.toContain('NaN');

    const parsed = JSON.parse(serialized);
    expect(typeof parsed.isSadeSatiActive).toBe('boolean');
    expect(typeof parsed.phase).toBe('string');
    expect(typeof parsed.houseFromMoon).toBe('number');
  });

  it('should serialize Chart Variants without {} leakage or NaN', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');
    const res = await astrologyService.calculateChartVariants({
      birthDetails: {
        name: 'Variants Subject',
        dateOfBirth: '1990-01-15',
        timeOfBirth: '08:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
    });

    const serialized = JSON.stringify(res);
    expect(serialized).not.toBe('{}');
    expect(serialized).not.toContain('"{}"');
    expect(serialized).not.toContain('NaN');

    const parsed = JSON.parse(serialized);
    expect(parsed.rashi).toBeDefined();
    expect(parsed.sunChart).toBeDefined();
    expect(parsed.moonChart).toBeDefined();
    expect(parsed.karakamshaChart).toBeDefined();
    expect(parsed.bhavaEqual).toBeDefined();
  });

  it('should serialize Avakhada/Ghat/Tara Chakras without {} leakage or NaN', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');
    const res = await astrologyService.calculateAvakhada({
      birthDetails: {
        name: 'Avakhada Subject',
        dateOfBirth: '1990-01-15',
        timeOfBirth: '08:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
    });

    const serialized = JSON.stringify(res);
    expect(serialized).not.toBe('{}');
    expect(serialized).not.toContain('"{}"');
    expect(serialized).not.toContain('NaN');

    const parsed = JSON.parse(serialized);
    expect(parsed.avakhada.varna).toBeDefined();
    expect(parsed.ghat.ghatMasa).toBeDefined();
    expect(parsed.tara.taras.length).toBe(27);
  });

  it('should serialize Vimshopaka Bala & Rashmis without {} leakage or NaN', async () => {
    const { astrologyService } = await import('../src/modules/astrology/astrology.service');
    const res = await astrologyService.calculateVimshopaka({
      birthDetails: {
        name: 'Vimshopaka Subject',
        dateOfBirth: '1990-01-15',
        timeOfBirth: '08:30:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
    });

    const serialized = JSON.stringify(res);
    expect(serialized).not.toBe('{}');
    expect(serialized).not.toContain('"{}"');
    expect(serialized).not.toContain('NaN');

    const parsed = JSON.parse(serialized);
    expect(Object.keys(parsed.planets).length).toBe(7);
    expect(Object.keys(parsed.rashmis).length).toBe(7);
    expect(typeof parsed.totalChartRays).toBe('number');
  });
});
