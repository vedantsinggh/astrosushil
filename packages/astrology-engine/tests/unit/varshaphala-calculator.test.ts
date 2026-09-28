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
    expect(result.muddaDasha.totalCycleDays).toBeCloseTo(365.2425, 2);
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
    it('should identify Tajika aspects correctly', () => {
      // Conjunction (1), Sextile (3, 11), Square (4, 10), Trine (5, 9), Opposition (7)
      expect(isTajikaAspect(1, 1)).toBe(true);  // Conjunction
      expect(isTajikaAspect(1, 3)).toBe(true);  // Sextile (3rd)
      expect(isTajikaAspect(1, 4)).toBe(true);  // Square (4th)
      expect(isTajikaAspect(1, 5)).toBe(true);  // Trine (5th)
      expect(isTajikaAspect(1, 7)).toBe(true);  // Opposition (7th)
      expect(isTajikaAspect(1, 9)).toBe(true);  // Trine (9th)
      expect(isTajikaAspect(1, 10)).toBe(true); // Square (10th)
      expect(isTajikaAspect(1, 11)).toBe(true); // Sextile (11th)

      // Inimical / Non-aspecting houses: 2, 6, 8, 12
      expect(isTajikaAspect(1, 2)).toBe(false);
      expect(isTajikaAspect(1, 6)).toBe(false);
      expect(isTajikaAspect(1, 8)).toBe(false);
      expect(isTajikaAspect(1, 12)).toBe(false);
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

  describe('Consecutive Years Return Consistency', () => {
    it('should compute consistent solar return Sun longitudes across consecutive years', async () => {
      const calculator = new VarshaphalaCalculator();
      const res2025 = await calculator.calculateVarshaphala(sampleBirth, { targetYear: 2025 });
      const res2026 = await calculator.calculateVarshaphala(sampleBirth, { targetYear: 2026 });
      const res2027 = await calculator.calculateVarshaphala(sampleBirth, { targetYear: 2027 });

      // Sun sidereal longitude at return must match natal Sun longitude within 1e-5 degrees across all years
      expect(res2025.solarReturn.solarReturnSunLongitude).toBeCloseTo(res2025.solarReturn.natalSunLongitude, 4);
      expect(res2026.solarReturn.solarReturnSunLongitude).toBeCloseTo(res2026.solarReturn.natalSunLongitude, 4);
      expect(res2027.solarReturn.solarReturnSunLongitude).toBeCloseTo(res2027.solarReturn.natalSunLongitude, 4);

      // Muntha progresses by 1 sign each year
      expect(res2026.muntha.rashiIndex).toBe(((res2025.muntha.rashiIndex - 1 + 1) % 12) + 1);
      expect(res2027.muntha.rashiIndex).toBe(((res2026.muntha.rashiIndex - 1 + 1) % 12) + 1);
    });
  });
});
