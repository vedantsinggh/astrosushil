import { describe, it, expect } from 'vitest';
import { VarshaphalaCalculator } from '../../src/varshaphala/varshaphala-calculator';
import { MunthaCalculator } from '../../src/varshaphala/muntha-calculator';
import { HarshaBalaCalculator } from '../../src/varshaphala/harsha-bala-calculator';
import { PanchadhikariCalculator } from '../../src/varshaphala/panchadhikari-calculator';
import { TajikaYogasCalculator, isTajikaAspect } from '../../src/varshaphala/tajika-yogas-calculator';
import { SahamsCalculator } from '../../src/varshaphala/sahams-calculator';
import { MuddaDashaCalculator } from '../../src/varshaphala/mudda-dasha-calculator';
import { BirthDetails } from '../../src/input/birth-details';
import { PlanetSymbol } from '../../src/planets/planet.types';

describe('VarshaphalaCalculator & Tajika Annual Astrology (Phase 2S)', () => {
  const sampleBirth: BirthDetails = {
    date: { year: 1992, month: 8, day: 20 },
    time: { hour: 10, minute: 15, second: 0 },
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
  };

  it('should compute full Varshaphala annual chart for 2026 with complete evidence', async () => {
    const calculator = new VarshaphalaCalculator();
    const result = await calculator.calculateVarshaphala(sampleBirth, {
      targetYear: 2026,
    });

    // 1. Convention & Version
    expect(result.calculationVersion).toBeDefined();
    expect(result.convention).toBeDefined();
    expect(result.convention.zodiac).toBe('SIDEREAL');
    expect(result.convention.ayanamsa).toBe('LAHIRI');
    expect(result.convention.tripatakiStatus).toBe('PENDING');

    // 2. Solar Return Details
    expect(result.solarReturn).toBeDefined();
    expect(result.solarReturn.targetYear).toBe(2026);
    expect(result.solarReturn.age).toBe(34);
    expect(result.solarReturn.angularErrorDegrees).toBeLessThan(1e-6);
    expect(result.solarReturn.natalSunLongitude).toBeGreaterThanOrEqual(0);
    expect(result.solarReturn.natalSunSign).toBeDefined();
    expect(typeof result.solarReturn.natalSunDegree).toBe('number');
    expect(result.solarReturn.solarReturnSunSign).toBe(result.solarReturn.natalSunSign);
    expect(result.solarReturn.solarReturnSunLongitude).toBeCloseTo(result.solarReturn.natalSunLongitude, 4);

    // 3. Varsha Lagna
    expect(result.varshaLagna).toBeDefined();
    expect(result.varshaLagna.rashiIndex).toBeGreaterThanOrEqual(1);
    expect(result.varshaLagna.rashiIndex).toBeLessThanOrEqual(12);
    expect(result.varshaLagna.rashiName).toBeDefined();
    expect(result.varshaLagna.lord).toBeDefined();

    // 4. Natal Lagna
    expect(result.natalLagna).toBeDefined();

    // 5. Annual Planets (9 Vedic Planets with house and combustion)
    const requiredPlanets = [
      PlanetSymbol.SUN,
      PlanetSymbol.MOON,
      PlanetSymbol.MARS,
      PlanetSymbol.MERCURY,
      PlanetSymbol.JUPITER,
      PlanetSymbol.VENUS,
      PlanetSymbol.SATURN,
      PlanetSymbol.RAHU,
      PlanetSymbol.KETU,
    ];

    for (const sym of requiredPlanets) {
      const p = result.planets[sym];
      expect(p, `planet ${sym} must exist`).toBeDefined();
      expect(p.planet).toBe(sym);
      expect(p.longitude).toBeGreaterThanOrEqual(0);
      expect(p.longitude).toBeLessThan(360);
      expect(p.rashiIndex).toBeGreaterThanOrEqual(1);
      expect(p.rashiIndex).toBeLessThanOrEqual(12);
      expect(p.rashiName).toBeDefined();
      expect(p.house).toBeGreaterThanOrEqual(1);
      expect(p.house).toBeLessThanOrEqual(12);
      expect(typeof p.isCombust).toBe('boolean');
      expect(p.nakshatraName).toBeDefined();
      expect(p.pada).toBeGreaterThanOrEqual(1);
      expect(p.pada).toBeLessThanOrEqual(4);
    }

    // 6. Annual Whole Sign Houses
    expect(result.houses.length).toBe(12);
    for (let h = 1; h <= 12; h++) {
      const house = result.houses[h - 1];
      expect(house.houseNumber).toBe(h);
      expect(house.sign).toBeDefined();
      expect(house.lord).toBeDefined();
      expect(Array.isArray(house.occupyingPlanets)).toBe(true);
    }

    // 7. Muntha
    expect(result.muntha).toBeDefined();
    expect(result.muntha.rashiIndex).toBeGreaterThanOrEqual(1);
    expect(result.muntha.rashiIndex).toBeLessThanOrEqual(12);
    expect(result.muntha.progressionYears).toBe(34);
    expect(result.muntha.progressionIndex).toBe(34 % 12);
    expect(result.muntha.evidence).toBeDefined();
    expect(result.muntha.evidence?.completedYears).toBe(34);

    // 8. Harsha Bala & Harsha Yogas
    expect(result.harshaBala).toBeDefined();
    expect(result.harshaBala[PlanetSymbol.SUN].totalScore).toBeGreaterThanOrEqual(0);
    expect(result.harshaBala[PlanetSymbol.SUN].totalScore).toBeLessThanOrEqual(20);
    expect(result.harshaBala[PlanetSymbol.JUPITER].totalScore).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.harshaYogas)).toBe(true);

    // 9. Panchadhikari & Varshesha
    expect(result.panchadhikari).toBeDefined();
    expect(result.panchadhikari.candidates).toHaveLength(5);
    const roles = result.panchadhikari.candidates.map((c) => c.role);
    expect(roles).toContain('VARSHA_LAGNESHA');
    expect(roles).toContain('JANMESHA');
    expect(roles).toContain('MUNTHESHA');
    expect(roles).toContain('TRIRASHISHA');
    expect(roles).toContain('DINA_RATRI_PATI');

    expect(result.varshesha).toBeDefined();
    expect(result.varshesha.selectedVarshesha).toBeDefined();
    expect(result.varshesha.selectionReason).toBeDefined();
    expect(result.varshesha.convention).toBe('TAJIKA_NEELAKANTHI_RAMAN');

    // 10. Tajika Yogas
    expect(Array.isArray(result.tajikaYogas)).toBe(true);
    for (const yoga of result.tajikaYogas) {
      expect(yoga.name).toBeDefined();
      expect(yoga.planet1).toBeDefined();
      expect(yoga.planet2).toBeDefined();
      expect(typeof yoga.orbDegrees).toBe('number');
      expect(typeof yoga.isApplying).toBe('boolean');
    }

    // 11. Sahams (10 sensitive points)
    expect(result.sahams.length).toBe(10);
    const punya = result.sahams.find((s) => s.name === 'Punya Saham');
    expect(punya).toBeDefined();
    expect(punya?.longitude).toBeGreaterThanOrEqual(0);
    expect(punya?.longitude).toBeLessThan(360);
    expect(punya?.formula).toBeDefined();
    expect(punya?.sourcePoints).toBeDefined();
    expect(punya?.convention).toBe('TAJIKA_NEELAKANTHI_STANDARD');

    // 12. Mudda Dasha
    expect(result.muddaDasha).toBeDefined();
    expect(result.muddaDasha.periods.length).toBe(9);
    expect(result.muddaDasha.totalCycleDays).toBeCloseTo(365.25, 0);
    expect(result.muddaDasha.convention).toBe('MUDDA_FULL_CYCLE_PROPORTIONAL');

    // 13. Panchanga Context
    expect(result.panchanga).toBeDefined();
    expect(result.panchanga.tithi).toBeDefined();
    expect(result.panchanga.vara).toBeDefined();
    expect(result.panchanga.nakshatra).toBeDefined();
    expect(result.panchanga.yoga).toBeDefined();
    expect(result.panchanga.karana).toBeDefined();
  });

  it('should support explicit annual location different from natal location', async () => {
    const calculator = new VarshaphalaCalculator();
    const resultLondon = await calculator.calculateVarshaphala(sampleBirth, {
      targetYear: 2026,
      annualLocation: {
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
        placeName: 'London, UK',
      },
    });

    const resultDelhi = await calculator.calculateVarshaphala(sampleBirth, {
      targetYear: 2026,
    });

    // Solar return UTC time is identical
    expect(resultLondon.solarReturn.solarReturnUtcIso).toBe(resultDelhi.solarReturn.solarReturnUtcIso);

    // But Varsha Lagna differs due to different geographic coordinates / local sidereal time
    expect(resultLondon.varshaLagna.longitude).not.toBe(resultDelhi.varshaLagna.longitude);
    expect(resultLondon.solarReturn.timezone).toBe('Europe/London');
    expect(resultLondon.solarReturn.annualLocation.placeName).toBe('London, UK');
  });

  describe('Muntha Progression', () => {
    it('should advance by exactly 1 sign per year', () => {
      const calc = new MunthaCalculator();
      // Natal lagna: Aries (1), 15.0°
      const m0 = calc.calculateMuntha(1, 15.0, 1, 0);
      expect(m0.rashiIndex).toBe(1); // Birth year = Lagna
      expect(m0.degreeInRashi).toBeCloseTo(15.0, 4);
      expect(m0.progressionIndex).toBe(0);

      const m1 = calc.calculateMuntha(1, 15.0, 2, 1);
      expect(m1.rashiIndex).toBe(2); // Taurus
      expect(m1.progressionIndex).toBe(1);

      const m12 = calc.calculateMuntha(1, 15.0, 1, 12);
      expect(m12.rashiIndex).toBe(1); // 12 years completed -> back to Aries
      expect(m12.progressionIndex).toBe(0);

      const m13 = calc.calculateMuntha(1, 15.0, 2, 13);
      expect(m13.rashiIndex).toBe(2); // 13 years -> Taurus
      expect(m13.progressionIndex).toBe(1);
    });
  });

  describe('Tajika Yogas Framework', () => {
    it('should identify Tajika aspects correctly in both forward and reverse directions', () => {
      // Conjunction (1), Sextile (3, 11), Square (4, 10), Trine (5, 9), Opposition (7)
      expect(isTajikaAspect(1, 1)).toBe(true);  // Conjunction
      expect(isTajikaAspect(1, 3)).toBe(true);  // 3rd sign
      expect(isTajikaAspect(3, 1)).toBe(true);  // Reverse: 11th sign
      expect(isTajikaAspect(1, 4)).toBe(true);  // 4th sign
      expect(isTajikaAspect(4, 1)).toBe(true);  // Reverse: 10th sign
      expect(isTajikaAspect(1, 5)).toBe(true);  // 5th sign
      expect(isTajikaAspect(5, 1)).toBe(true);  // Reverse: 9th sign
      expect(isTajikaAspect(1, 7)).toBe(true);  // 7th sign
      expect(isTajikaAspect(7, 1)).toBe(true);  // Reverse: 7th sign
      expect(isTajikaAspect(1, 9)).toBe(true);  // 9th sign
      expect(isTajikaAspect(9, 1)).toBe(true);  // Reverse: 5th sign
      expect(isTajikaAspect(1, 10)).toBe(true); // 10th sign
      expect(isTajikaAspect(10, 1)).toBe(true); // Reverse: 4th sign
      expect(isTajikaAspect(1, 11)).toBe(true); // 11th sign
      expect(isTajikaAspect(11, 1)).toBe(true); // Reverse: 3rd sign

      // Non-aspecting sign distances: 2, 6, 8, 12 in both directions
      expect(isTajikaAspect(1, 2)).toBe(false);  // 2nd sign
      expect(isTajikaAspect(2, 1)).toBe(false);  // 12th sign
      expect(isTajikaAspect(1, 6)).toBe(false);  // 6th sign
      expect(isTajikaAspect(6, 1)).toBe(false);  // 8th sign
      expect(isTajikaAspect(1, 8)).toBe(false);  // 8th sign
      expect(isTajikaAspect(8, 1)).toBe(false);  // 6th sign
      expect(isTajikaAspect(1, 12)).toBe(false); // 12th sign
      expect(isTajikaAspect(12, 1)).toBe(false); // 2nd sign

      // Verification of Leo (Sign 5) and Scorpio (Sign 8):
      // Sign 5 to Sign 8 = 4th sign (aspect cast by Leo planet onto Scorpio)
      // Sign 8 to Sign 5 = 10th sign (aspect cast by Scorpio planet onto Leo)
      expect(((8 - 5 + 12) % 12) + 1).toBe(4);
      expect(((5 - 8 + 12) % 12) + 1).toBe(10);
      expect(isTajikaAspect(5, 8)).toBe(true);
      expect(isTajikaAspect(8, 5)).toBe(true);
    });

    it('should detect Ithasala and Isarpha yogas', () => {
      const calc = new TajikaYogasCalculator();
      const mockPlanets: any = {
        [PlanetSymbol.SUN]: {
          planet: PlanetSymbol.SUN,
          rashiIndex: 1, // Aries
          degreeInRashi: 10.0,
          longitude: 10.0,
          speedLongitude: 0.98,
        },
        [PlanetSymbol.MOON]: {
          planet: PlanetSymbol.MOON,
          rashiIndex: 5, // Leo (5th house from Aries = Trine aspect)
          degreeInRashi: 8.0,
          longitude: 128.0,
          speedLongitude: 13.2, // Moon is faster than Sun
        },
        [PlanetSymbol.MARS]: {
          planet: PlanetSymbol.MARS,
          rashiIndex: 9,
          degreeInRashi: 25.0,
          longitude: 265.0,
          speedLongitude: 0.6,
        },
        [PlanetSymbol.MERCURY]: {
          planet: PlanetSymbol.MERCURY,
          rashiIndex: 2,
          degreeInRashi: 5.0,
          longitude: 35.0,
          speedLongitude: 1.2,
        },
        [PlanetSymbol.JUPITER]: {
          planet: PlanetSymbol.JUPITER,
          rashiIndex: 6,
          degreeInRashi: 15.0,
          longitude: 165.0,
          speedLongitude: 0.1,
        },
        [PlanetSymbol.VENUS]: {
          planet: PlanetSymbol.VENUS,
          rashiIndex: 3,
          degreeInRashi: 20.0,
          longitude: 80.0,
          speedLongitude: 1.1,
        },
        [PlanetSymbol.SATURN]: {
          planet: PlanetSymbol.SATURN,
          rashiIndex: 10,
          degreeInRashi: 12.0,
          longitude: 282.0,
          speedLongitude: 0.05,
        },
      };

      const yogas = calc.evaluateTajikaYogas(mockPlanets);
      expect(Array.isArray(yogas)).toBe(true);

      // Moon (8.0°) is faster than Sun (10.0°), placed in 5th (Trine), applying (8° < 10°) -> Ithasala!
      const moonSunIthasala = yogas.find(
        (y) => y.type === 'ITHASALA' && y.planet1 === PlanetSymbol.MOON && y.planet2 === PlanetSymbol.SUN
      );
      expect(moonSunIthasala).toBeDefined();
      expect(moonSunIthasala?.isApplying).toBe(true);
    });
  });

  describe('Mudda Dasha calculation', () => {
    it('should partition 365.2425 days proportionally among the 9 planets', () => {
      const mockAnnualChart: any = {
        planets: {
          [PlanetSymbol.MOON]: {
            nakshatraIndex: 1, // Ashwini -> Ketu
          },
        },
      };

      const startDate = new Date('2026-08-20T10:00:00.000Z');
      const mudda = MuddaDashaCalculator.calculate(mockAnnualChart, startDate);

      expect(mudda.birthLord).toBe(PlanetSymbol.KETU);
      expect(mudda.periods.length).toBe(9);

      // Verify total duration equals 365.2425 days
      const totalDurationYears = mudda.periods.reduce((sum, p) => sum + p.durationYears, 0);
      expect(totalDurationYears).toBeCloseTo(1.0, 5);

      // Verify first period is Ketu
      expect(mudda.periods[0].lord).toBe(PlanetSymbol.KETU);
      expect(mudda.periods[0].durationYears).toBeCloseTo(7 / 120, 5);

      // Verify second period is Venus (20/120)
      expect(mudda.periods[1].lord).toBe(PlanetSymbol.VENUS);
      expect(mudda.periods[1].durationYears).toBeCloseTo(20 / 120, 5);
    });
  });

  describe('Untimed Birth Profile Handling', () => {
    const untimedBirth: BirthDetails = {
      date: { year: 1983, month: 12, day: 28 },
      time: { hour: 0, minute: 0, second: 0 },
      latitude: 28.4069,
      longitude: 77.8498,
      timezone: 'Asia/Kolkata',
      placeName: 'Bulandshahr, India',
    };

    it('should throw when birth time is unknown and no natal Sun longitude is established', async () => {
      const calculator = new VarshaphalaCalculator();
      await expect(
        calculator.calculateVarshaphala(untimedBirth, {
          targetYear: 2026,
          isTimeUnknown: true,
        })
      ).rejects.toThrow('Date-only birth records cannot establish an exact solar-return instant.');
    });

    it('should reject approximate natal Sun longitude when uncertainty is too large to establish exact return', async () => {
      const calculator = new VarshaphalaCalculator();
      await expect(
        calculator.calculateVarshaphala(untimedBirth, {
          targetYear: 2026,
          isTimeUnknown: true,
          natalSunLongitude: 252.0,
          natalSunProvenance: {
            source: 'DATE_ESTIMATE',
            ayanamsa: 'LAHIRI',
            coordinateConvention: 'GEOCENTRIC_SIDEREAL_ECLIPTIC',
            uncertaintyDegrees: 0.5, // ±0.5° is too uncertain (~12 hours)
            isSufficientlyPrecise: false,
          },
        })
      ).rejects.toThrow('exceeds maximum allowable precision threshold');
    });

    it('should accept independently established natal Sun longitude with high verified precision', async () => {
      const calculator = new VarshaphalaCalculator();
      const result = await calculator.calculateVarshaphala(untimedBirth, {
        targetYear: 2026,
        isTimeUnknown: true,
        natalSunLongitude: 252.008435,
        natalSunProvenance: {
          source: 'INDEPENDENT_VERIFIED_EPHEMERIS',
          ayanamsa: 'LAHIRI',
          coordinateConvention: 'GEOCENTRIC_SIDEREAL_ECLIPTIC',
          uncertaintyDegrees: 0.0001,
          isSufficientlyPrecise: true,
        },
      });

      expect(result.solarReturn.provenance?.isSufficientlyPrecise).toBe(true);
      expect(result.solarReturn.solarReturnSunLongitude).toBeCloseTo(252.008435, 4);
      expect(result.varshaLagna.longitude).toBeGreaterThan(0);
    });

    it('should separate Natal Lagna vs Varsha Lagna availability when birth time is unknown', async () => {
      const calculator = new VarshaphalaCalculator();
      const result = await calculator.calculateVarshaphala(untimedBirth, {
        targetYear: 2026,
        isTimeUnknown: true,
        natalSunLongitude: 252.008435, // Established natal Sun longitude
      });

      // Solar Return is calculated accurately from established Sun longitude
      expect(result.solarReturn.solarReturnSunLongitude).toBeCloseTo(252.008435, 4);

      // Annual Varsha Lagna IS calculable from exact solar return instant + return location
      expect(result.varshaLagna.isIndeterminate).toBeUndefined();
      expect(result.varshaLagna.rashiName).not.toBe('Indeterminate');
      expect(result.varshaLagna.longitude).toBeGreaterThan(0);

      // Natal Lagna IS indeterminate because natal birth time is unknown
      expect(result.natalLagna.isIndeterminate).toBe(true);

      // Annual houses (1-12) are validly calculable from Varsha Lagna
      expect(result.houses.length).toBe(12);
      expect(result.houses.every((h) => !h.isIndeterminate)).toBe(true);

      // Annual planetary houses are established
      for (const sym of [PlanetSymbol.SUN, PlanetSymbol.MOON, PlanetSymbol.MARS]) {
        expect(result.planets[sym].house).toBeGreaterThanOrEqual(1);
        expect(result.planets[sym].house).toBeLessThanOrEqual(12);
      }

      // Muntha depends on Natal Lagna, so Muntha IS indeterminate
      expect(result.muntha.isIndeterminate).toBe(true);
      expect(result.muntha.rashiName).toBe('Indeterminate');

      // Varshesh candidates: Janmesha and Munthesha are indeterminate,
      // but Varsha Lagnesha, Trirashisha, and Dina/Ratri Pati are calculated and eligible!
      expect(result.panchadhikari.candidates.length).toBe(5);
      const janmeshaCand = result.panchadhikari.candidates.find((c) => c.role === 'JANMESHA');
      const muntheshaCand = result.panchadhikari.candidates.find((c) => c.role === 'MUNTHESHA');
      const varshaLagneshaCand = result.panchadhikari.candidates.find((c) => c.role === 'VARSHA_LAGNESHA');

      expect(janmeshaCand?.isIndeterminate).toBe(true);
      expect(muntheshaCand?.isIndeterminate).toBe(true);
      expect(varshaLagneshaCand?.isIndeterminate).toBe(false);

      // Varshesh is deterministically chosen from available candidates
      expect(result.varshesha.isIndeterminate).toBe(false);
      expect(result.varshesha.selectedVarshesha).toBeDefined();
    });
  });

  describe('Canonical Puneet Kumar 2026 Fixture Verification', () => {
    const puneetBirth: BirthDetails = {
      date: { year: 1983, month: 12, day: 28 },
      time: { hour: 4, minute: 45, second: 0 },
      latitude: 28.4069,
      longitude: 77.8498,
      timezone: 'Asia/Kolkata',
      placeName: 'Bulandshahr, India',
    };

    it('should verify exact solar return, Scorpio Varsha Lagna, Muntha, and Mars as Varshesh (10/20)', async () => {
      const calculator = new VarshaphalaCalculator();
      const res = await calculator.calculateVarshaphala(puneetBirth, { targetYear: 2026 });

      // Natal Sun in Dhanu (Sagittarius) ~252.01°
      expect(res.solarReturn.natalSunLongitude).toBeCloseTo(252.0084, 2);
      expect(res.solarReturn.solarReturnSunLongitude).toBeCloseTo(res.solarReturn.natalSunLongitude, 4);
      expect(res.solarReturn.age).toBe(43);

      // Varsha Lagna is Scorpio (Vrischika, sign 8)
      expect(res.varshaLagna.rashiIndex).toBe(8);
      expect(res.varshaLagna.rashiName).toBe('Vrischika');

      // Muntha is in Gemini (Mithuna, sign 3) and occupies House 8 in the Varsha chart
      expect(res.muntha.rashiIndex).toBe(3);
      expect(res.muntha.rashiName).toBe('Mithuna');
      expect(res.muntha.houseInVarshaChart).toBe(8);

      // Varshesha selection: MARS (Score 10/20, aspects Lagna from Leo/House 10)
      expect(res.varshesha.selectedVarshesha).toBe(PlanetSymbol.MARS);
      expect(res.varshesha.harshaBalaScore).toBe(10);
      expect(res.varshesha.aspectsVarshaLagna).toBe(true);
      expect(res.planets[PlanetSymbol.MARS].house).toBe(10);
    });
  });

  describe('Second Independent Annual Chart Fixture Verification', () => {
    const fixture2: BirthDetails = {
      date: { year: 1995, month: 3, day: 3 },
      time: { hour: 14, minute: 30, second: 0 },
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
    };

    it('should deterministically calculate annual chart for 2026 with consistent return', async () => {
      const calculator = new VarshaphalaCalculator();
      const res = await calculator.calculateVarshaphala(fixture2, { targetYear: 2026 });

      expect(res.solarReturn.age).toBe(31);
      expect(res.solarReturn.solarReturnSunLongitude).toBeCloseTo(res.solarReturn.natalSunLongitude, 4);
      expect(res.varshaLagna.rashiIndex).toBeGreaterThanOrEqual(1);
      expect(res.varshaLagna.rashiIndex).toBeLessThanOrEqual(12);
      expect(res.varshesha.selectedVarshesha).toBeDefined();
      expect(res.varshesha.harshaBalaScore).toBeGreaterThanOrEqual(0);
      expect(res.muddaDasha.periods).toHaveLength(9);
    });
  });

  describe('Retrograde-Aware Tajika Aspects', () => {
    it('should correctly classify applying aspect when faster planet is retrograde moving toward slower planet', () => {
      const calc = new TajikaYogasCalculator();
      const planets: any = {
        [PlanetSymbol.MARS]: {
          planet: PlanetSymbol.MARS,
          rashiIndex: 1, // Aries
          degreeInRashi: 15.0,
          longitude: 15.0,
          speedLongitude: 0.8,
          isRetrograde: true, // Moving backward toward 10.0°
        },
        [PlanetSymbol.SATURN]: {
          planet: PlanetSymbol.SATURN,
          rashiIndex: 1, // Conjunction
          degreeInRashi: 10.0,
          longitude: 10.0,
          speedLongitude: 0.05,
          isRetrograde: false, // Stationary / slow forward
        },
      };

      const yogas = calc.evaluateTajikaYogas(planets);
      const marsSaturn = yogas.find((y) => y.planet1 === PlanetSymbol.MARS || y.planet2 === PlanetSymbol.MARS);
      expect(marsSaturn).toBeDefined();
      // Because Mars is retrograde at 15° and Saturn is at 10°, Mars is applying to Saturn!
      expect(marsSaturn?.type).toBe('ITHASALA');
      expect(marsSaturn?.isApplying).toBe(true);
    });
  });
});
