import { describe, it, expect } from 'vitest';
import { PrashnaCalculator } from '../../src/prashna/prashna-calculator';
import { PrashnaNumberCalculator } from '../../src/prashna/prashna-number.calculator';
import { PrashnaSphutaCalculator } from '../../src/prashna/prashna-sphuta.calculator';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { PrashnaQuestionInput } from '../../src/prashna/prashna.types';

describe('PrashnaCalculator & Horary Astrology Foundation (Phase 2T)', () => {
  const samplePrashnaInput: PrashnaQuestionInput = {
    questionTimestamp: '2026-09-17T10:30:00+05:30',
    timezone: 'Asia/Kolkata',
    location: {
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
    },
    questionText: 'Will the proposed project succeed?',
  };

  it('1. should compute a complete deterministic Prashna chart from explicit timestamp and location', async () => {
    const calculator = new PrashnaCalculator();
    const result = await calculator.calculatePrashna(samplePrashnaInput);

    expect(result).toBeDefined();
    expect(result.calculationVersion).toBeDefined();
    expect(result.convention.zodiac).toBe('SIDEREAL');
    expect(result.convention.ayanamsa).toBe('LAHIRI');
    expect(result.convention.houseSystem).toBe('WHOLE_SIGN');
    expect(result.convention.timeConvention).toBe('EXPLICIT_QUESTION_TIMESTAMP_NO_SERVER_TIME');

    // Question Time
    expect(result.questionTime.utcIso).toBe(new Date('2026-09-17T10:30:00+05:30').toISOString());
    expect(result.questionTime.timezone).toBe('Asia/Kolkata');
    expect(result.questionTime.localIso).toContain('2026-09-17T10:30:00');
    expect(result.questionTime.julianDayUT).toBeGreaterThan(2450000);

    // Question Text
    expect(result.questionText).toBe('Will the proposed project succeed?');

    // Prashna Lagna
    expect(result.prashnaLagna).toBeDefined();
    expect(result.prashnaLagna.rashiIndex).toBeGreaterThanOrEqual(1);
    expect(result.prashnaLagna.rashiIndex).toBeLessThanOrEqual(12);
    expect(result.prashnaLagna.degreeInRashi).toBeGreaterThanOrEqual(0);
    expect(result.prashnaLagna.degreeInRashi).toBeLessThan(30);
    expect(result.prashnaLagna.lord).toBeDefined();
    expect(result.prashnaLagna.nakshatraName).toBeDefined();
    expect(result.prashnaLagna.pada).toBeGreaterThanOrEqual(1);
    expect(result.prashnaLagna.pada).toBeLessThanOrEqual(4);

    // 9 Vedic Planets with house positions and combustion status
    const expectedPlanets = [
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

    for (const sym of expectedPlanets) {
      const p = result.planets[sym];
      expect(p, `Planet ${sym} must exist`).toBeDefined();
      expect(p.longitude).toBeGreaterThanOrEqual(0);
      expect(p.longitude).toBeLessThan(360);
      expect(p.house).toBeGreaterThanOrEqual(1);
      expect(p.house).toBeLessThanOrEqual(12);
      expect(typeof p.isCombust).toBe('boolean');
      expect(p.rashiName).toBeDefined();
      expect(p.nakshatraName).toBeDefined();
    }

    // 12 Whole Sign Houses
    expect(result.houses.length).toBe(12);
    for (let h = 1; h <= 12; h++) {
      const house = result.houses[h - 1];
      expect(house.houseNumber).toBe(h);
      expect(house.rashiIndex).toBeGreaterThanOrEqual(1);
      expect(house.rashiIndex).toBeLessThanOrEqual(12);
      expect(house.sign).toBeDefined();
      expect(house.lord).toBeDefined();
      expect(Array.isArray(house.occupyingPlanets)).toBe(true);
    }

    // Moon analysis (Chandra in Prashna)
    expect(result.moon).toBeDefined();
    expect(result.moon.longitude).toBeCloseTo(result.planets[PlanetSymbol.MOON].longitude, 4);
    expect(result.moon.house).toBe(result.planets[PlanetSymbol.MOON].house);
    expect(typeof result.moon.isWaxing).toBe('boolean');
    expect(['Shukla Paksha', 'Krishna Paksha']).toContain(result.moon.phaseName);
    expect(Array.isArray(result.moon.aspectsReceived)).toBe(true);

    // Instantaneous Panchanga
    expect(result.panchanga).toBeDefined();
    expect(result.panchanga.tithi).toBeDefined();
    expect(result.panchanga.vara).toBeDefined();
    expect(result.panchanga.nakshatra).toBeDefined();
    expect(result.panchanga.yoga).toBeDefined();
    expect(result.panchanga.karana).toBeDefined();
    expect(typeof result.isRahuKala).toBe('boolean');

    // Classical Sphutas
    expect(result.sphutas).toBeDefined();
    expect(result.sphutas.gulika).toBeDefined();
    expect(result.sphutas.trisphuta).toBeDefined();
    expect(result.sphutas.chatusphuta).toBeDefined();
    expect(result.sphutas.panchasphuta).toBeDefined();
    expect(result.sphutas.gulika.house).toBeGreaterThanOrEqual(1);
    expect(result.sphutas.gulika.house).toBeLessThanOrEqual(12);

    // Underlying AstroChart
    expect(result.astroChart).toBeDefined();
    expect(result.astroChart.ascendant?.longitude).toBeCloseTo(result.prashnaLagna.longitude, 4);
  });

  it('2. should verify classical Prashna Marga Sphuta mathematical identities', async () => {
    const calculator = new PrashnaCalculator();
    const result = await calculator.calculatePrashna(samplePrashnaInput);

    const lagnaLong = result.prashnaLagna.longitude;
    const moonLong = result.planets[PlanetSymbol.MOON].longitude;
    const sunLong = result.planets[PlanetSymbol.SUN].longitude;
    const rahuLong = result.planets[PlanetSymbol.RAHU].longitude;
    const gulikaLong = result.sphutas.gulika.longitude;

    // Trisphuta = (Lagna + Moon + Gulika) mod 360
    const expectedTrisphuta = ((lagnaLong + moonLong + gulikaLong) % 360 + 360) % 360;
    expect(result.sphutas.trisphuta.longitude).toBeCloseTo(expectedTrisphuta, 4);

    // Chatusphuta = (Trisphuta + Sun) mod 360
    const expectedChatusphuta = ((expectedTrisphuta + sunLong) % 360 + 360) % 360;
    expect(result.sphutas.chatusphuta.longitude).toBeCloseTo(expectedChatusphuta, 4);

    // Panchasphuta = (Chatusphuta + Rahu) mod 360
    const expectedPanchasphuta = ((expectedChatusphuta + rahuLong) % 360 + 360) % 360;
    expect(result.sphutas.panchasphuta.longitude).toBeCloseTo(expectedPanchasphuta, 4);
  });

  it('3. should evaluate classical Parashari 1–108 Navamsha Arudha question numbers', async () => {
    // Number 1: 0° - 3°20' -> Aries Navamsha 1 (Mesha), Ashwini Pada 1
    const sub1 = PrashnaNumberCalculator.calculateParashari108(1, 1);
    expect(sub1.system).toBe('PARASHARI_1_108');
    expect(sub1.number).toBe(1);
    expect(sub1.rashiIndex).toBe(1);
    expect(sub1.navamshaRashiIndex).toBe(1);
    expect(sub1.navamshaLord).toBe(PlanetSymbol.MARS);
    expect(sub1.nakshatraName).toBe('Ashwini');
    expect(sub1.pada).toBe(1);
    expect(sub1.nakshatraLord).toBe(PlanetSymbol.KETU);
    expect(sub1.arudhaHouseFromLagna).toBe(1);

    // Number 108: 356°40' - 360° -> Pisces Navamsha 12 (Meena), Revati Pada 4
    const sub108 = PrashnaNumberCalculator.calculateParashari108(108, 1);
    expect(sub108.number).toBe(108);
    expect(sub108.rashiIndex).toBe(12);
    expect(sub108.navamshaRashiIndex).toBe(12);
    expect(sub108.navamshaLord).toBe(PlanetSymbol.JUPITER);
    expect(sub108.nakshatraName).toBe('Revati');
    expect(sub108.pada).toBe(4);
    expect(sub108.nakshatraLord).toBe(PlanetSymbol.MERCURY);
    expect(sub108.arudhaHouseFromLagna).toBe(12);

    // Full Prashna calculation with questionNumber 27
    const calculator = new PrashnaCalculator();
    const result = await calculator.calculatePrashna({
      ...samplePrashnaInput,
      questionNumber: 27,
      questionNumberSystem: 'PARASHARI_1_108',
    });

    expect(result.questionNumberDetails).toBeDefined();
    expect(result.questionNumberDetails?.system).toBe('PARASHARI_1_108');
    expect(result.questionNumberDetails?.number).toBe(27);
    if (result.questionNumberDetails?.system === 'PARASHARI_1_108') {
      expect(result.questionNumberDetails.arudhaHouseFromLagna).toBeGreaterThanOrEqual(1);
      expect(result.questionNumberDetails.arudhaHouseFromLagna).toBeLessThanOrEqual(12);
    }
  });

  it('4. should evaluate KP 1–249 Horary sub-lord table and question numbers', () => {
    const table = PrashnaNumberCalculator.getKpTable();
    expect(table.length).toBe(249);

    // First sub: Aries, Mars sign, Ketu star, Ketu sub
    const first = table[0];
    expect(first.number).toBe(1);
    expect(first.rashiName).toBe('Mesha');
    expect(first.signLord).toBe(PlanetSymbol.MARS);
    expect(first.starLord).toBe(PlanetSymbol.KETU);
    expect(first.subLord).toBe(PlanetSymbol.KETU);
    expect(first.startLongitude).toBe(0);

    // 249th sub: Pisces
    const last = table[248];
    expect(last.number).toBe(249);
    expect(last.rashiName).toBe('Meena');
    expect(last.signLord).toBe(PlanetSymbol.JUPITER);
    expect(last.starLord).toBe(PlanetSymbol.MERCURY);
    expect(last.endLongitude).toBeCloseTo(360, 4);

    // Lookup through calculator
    const kp50 = PrashnaNumberCalculator.calculateKP249(50);
    expect(kp50.system).toBe('KP_1_249');
    expect(kp50.number).toBe(50);
    expect(kp50.signLord).toBeDefined();
    expect(kp50.starLord).toBeDefined();
    expect(kp50.subLord).toBeDefined();
  });

  it('5. should handle Auto questionNumber selection (<= 108 Parashari, > 108 KP)', () => {
    const p1 = PrashnaNumberCalculator.calculate(50, 1, 'AUTO');
    expect(p1.system).toBe('PARASHARI_1_108');

    const p2 = PrashnaNumberCalculator.calculate(150, 1, 'AUTO');
    expect(p2.system).toBe('KP_1_249');
  });

  it('6. should reject invalid input parameters cleanly', async () => {
    const calculator = new PrashnaCalculator();

    // Invalid timestamp
    await expect(calculator.calculatePrashna({
      ...samplePrashnaInput,
      questionTimestamp: 'not-a-date',
    })).rejects.toThrow('Invalid questionTimestamp');

    // Invalid coordinates
    await expect(calculator.calculatePrashna({
      ...samplePrashnaInput,
      location: { ...samplePrashnaInput.location, latitude: 120 },
    })).rejects.toThrow('Invalid latitude');

    // Invalid question number
    await expect(calculator.calculatePrashna({
      ...samplePrashnaInput,
      questionNumber: 300,
    })).rejects.toThrow('out of bounds');
  });
});

