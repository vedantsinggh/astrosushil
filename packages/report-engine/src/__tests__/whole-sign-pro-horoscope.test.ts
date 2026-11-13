import { describe, it, expect } from 'vitest';
import { generateProHoroscopeReport } from '../generators/pro-horoscope.generator';
import { DeterministicInterpretationProvider } from '../providers/deterministic-interpretation.provider';
import {
  RASHIS,
  PlanetSymbol,
  ShadbalaCalculator,
  calculateBhavaBala,
  ChartCalculator,
  normalizeAstroChart,
} from '@astro/astrology-engine';

describe('Whole Sign House Mapping & Strength Consistency in Pro Horoscope', () => {
  const sampleProfile = {
    name: 'Dev Test User',
    dateOfBirth: '1992-06-15',
    timeOfBirth: '09:30:00',
    placeName: 'New Delhi',
    timezone: 'Asia/Kolkata',
    latitude: 28.6139,
    longitude: 77.2090,
  };

  const createBasePlanets = (ascSignIndex: number) => {
    // Standard 9 Vedic planets placed across distinct rashis
    const planets = [
      { name: 'Sun', planet: 'SUN', sign: 'Gemini', degree: 1.0, longitude: 61.0, house: ((3 - ascSignIndex + 12) % 12) + 1, nakshatra: 'Mrigashira', pada: 3 },
      { name: 'Moon', planet: 'MOON', sign: 'Scorpio', degree: 15.0, longitude: 225.0, house: ((8 - ascSignIndex + 12) % 12) + 1, nakshatra: 'Anuradha', pada: 4 },
      { name: 'Mars', planet: 'MARS', sign: 'Aries', degree: 10.0, longitude: 10.0, house: ((1 - ascSignIndex + 12) % 12) + 1, nakshatra: 'Ashwini', pada: 3 },
      { name: 'Mercury', planet: 'MERCURY', sign: 'Taurus', degree: 20.0, longitude: 50.0, house: ((2 - ascSignIndex + 12) % 12) + 1, nakshatra: 'Rohini', pada: 4 },
      { name: 'Jupiter', planet: 'JUPITER', sign: 'Leo', degree: 12.0, longitude: 132.0, house: ((5 - ascSignIndex + 12) % 12) + 1, nakshatra: 'Magha', pada: 4 },
      { name: 'Venus', planet: 'VENUS', sign: 'Cancer', degree: 25.0, longitude: 115.0, house: ((4 - ascSignIndex + 12) % 12) + 1, nakshatra: 'Ashlesha', pada: 3 },
      { name: 'Saturn', planet: 'SATURN', sign: 'Aquarius', degree: 18.0, longitude: 318.0, house: ((11 - ascSignIndex + 12) % 12) + 1, nakshatra: 'Shatabhisha', pada: 4 },
      { name: 'Rahu', planet: 'RAHU', sign: 'Sagittarius', degree: 5.0, longitude: 245.0, house: ((9 - ascSignIndex + 12) % 12) + 1, nakshatra: 'Mula', pada: 2 },
      { name: 'Ketu', planet: 'KETU', sign: 'Gemini', degree: 5.0, longitude: 65.0, house: ((3 - ascSignIndex + 12) % 12) + 1, nakshatra: 'Ardra', pada: 1 },
    ];
    return planets;
  };

  const createDummyHouses = () => Array.from({ length: 12 }, (_, i) => ({
    houseNumber: i + 1,
    sign: 'Placeholder',
  }));

  it('correctly maps Whole Sign houses when ascendant is at 3° of a sign (early degree)', async () => {
    // Ascendant at 3° of Aries (longitude 3.0, sign index 1)
    const ascLongitude = 3.0;
    const chartData = {
      ascendant: {
        sign: 'Aries',
        rashiName: 'Mesha',
        rashiIndex: 1,
        degree: 3.0,
        degreeInRashi: 3.0,
        longitude: ascLongitude,
        absoluteDegree: ascLongitude,
        nakshatraName: 'Ashwini',
        pada: 1,
      },
      planets: createBasePlanets(1),
      houses: createDummyHouses(),
    };

    const provider = new DeterministicInterpretationProvider();
    const report = await generateProHoroscopeReport(sampleProfile, chartData, provider);

    // 1. Verify Ascendant degree remains within House 1
    expect(report.ascendant.sign).toBe('Aries');
    expect(report.ascendant.degree).toBe(3.0);

    // 2. Verify all 12 houses are canonical Whole Sign
    expect(report.houses).toHaveLength(12);
    expect(report.houses[0].houseNumber).toBe(1);
    expect(report.houses[0].sign).toBe('Aries');

    // Expected sequence of signs for Aries Lagna: Aries (1) to Pisces (12)
    const expectedSigns = [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
    ];
    for (let h = 1; h <= 12; h++) {
      expect(report.houses[h - 1].houseNumber).toBe(h);
      expect(report.houses[h - 1].sign).toBe(expectedSigns[h - 1]);
    }

    // 3. Verify Bhava Bala calculation succeeded with authentic strengths
    expect(report.bhavaBala).toHaveLength(12);
    for (const bhava of report.bhavaBala) {
      expect(bhava.totalRupas).toBeGreaterThan(0);
      expect(typeof bhava.bhavadhipatiBala).toBe('number');
      expect(typeof bhava.bhavaDigBala).toBe('number');
      expect(typeof bhava.bhavaDrishtiBala).toBe('number');
    }
  });

  it('correctly maps Whole Sign houses when ascendant is at 29° of a sign (late degree)', async () => {
    // Ascendant at 29° of Leo (longitude: 120 + 29 = 149.0, sign index 5)
    const ascLongitude = 149.0;
    const chartData = {
      ascendant: {
        sign: 'Leo',
        rashiName: 'Simha',
        rashiIndex: 5,
        degree: 29.0,
        degreeInRashi: 29.0,
        longitude: ascLongitude,
        absoluteDegree: ascLongitude,
        nakshatraName: 'Uttara Phalguni',
        pada: 1,
      },
      planets: createBasePlanets(5),
      houses: createDummyHouses(),
    };

    const provider = new DeterministicInterpretationProvider();
    const report = await generateProHoroscopeReport(sampleProfile, chartData, provider);

    // 1. Ascendant in House 1 (Leo)
    expect(report.ascendant.sign).toBe('Leo');
    expect(report.ascendant.degree).toBe(29.0);

    // 2. In Whole Sign, House 1 MUST be Leo, House 2 Virgo, etc.
    const expectedLeoHouses = [
      'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn',
      'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer',
    ];
    for (let h = 1; h <= 12; h++) {
      expect(report.houses[h - 1].houseNumber).toBe(h);
      expect(report.houses[h - 1].sign).toBe(expectedLeoHouses[h - 1]);
    }

    // 3. Bhava Bala verification
    expect(report.bhavaBala).toHaveLength(12);
    for (const bhava of report.bhavaBala) {
      expect(bhava.totalRupas).toBeGreaterThan(0);
      expect(bhava.relativeRank).toBeGreaterThanOrEqual(1);
      expect(bhava.relativeRank).toBeLessThanOrEqual(12);
    }
  });

  it('correctly maps Whole Sign houses when ascendant is close to a sign boundary', async () => {
    // Test 3a: Ascendant at 0.05° of Taurus (longitude 30.05, sign index 2)
    const chartTaurusBoundary = {
      ascendant: {
        sign: 'Taurus',
        rashiIndex: 2,
        degree: 0.05,
        degreeInRashi: 0.05,
        longitude: 30.05,
        nakshatraName: 'Krittika',
        pada: 2,
      },
      planets: createBasePlanets(2),
      houses: createDummyHouses(),
    };

    const provider = new DeterministicInterpretationProvider();
    const reportTaurus = await generateProHoroscopeReport(sampleProfile, chartTaurusBoundary, provider);

    expect(reportTaurus.ascendant.sign).toBe('Taurus');
    expect(reportTaurus.houses[0].sign).toBe('Taurus');
    expect(reportTaurus.houses[1].sign).toBe('Gemini');
    expect(reportTaurus.houses[11].sign).toBe('Aries');

    // Test 3b: Ascendant at 29.95° of Pisces (longitude 359.95, sign index 12)
    const chartPiscesBoundary = {
      ascendant: {
        sign: 'Pisces',
        rashiIndex: 12,
        degree: 29.95,
        degreeInRashi: 29.95,
        longitude: 359.95,
        nakshatraName: 'Revati',
        pada: 4,
      },
      planets: createBasePlanets(12),
      houses: createDummyHouses(),
    };

    const reportPisces = await generateProHoroscopeReport(sampleProfile, chartPiscesBoundary, provider);

    expect(reportPisces.ascendant.sign).toBe('Pisces');
    expect(reportPisces.houses[0].sign).toBe('Pisces');
    expect(reportPisces.houses[1].sign).toBe('Aries'); // wraps across 360° to Aries
    expect(reportPisces.houses[11].sign).toBe('Aquarius');
  });

  it('maintains input consistency between Whole Sign houses and Shadbala/Bhava Bala', async () => {
    // Ascendant at 14.5° of Scorpio (sign index 8)
    const ascLong = 224.5;
    const chartData = {
      ascendant: {
        sign: 'Scorpio',
        rashiName: 'Vrischika',
        rashiIndex: 8,
        degree: 14.5,
        degreeInRashi: 14.5,
        longitude: ascLong,
        nakshatraName: 'Anuradha',
        pada: 4,
      },
      planets: createBasePlanets(8),
      houses: createDummyHouses(),
    };

    const provider = new DeterministicInterpretationProvider();
    const report = await generateProHoroscopeReport(sampleProfile, chartData, provider);

    // Verify 6-fold Shadbala items calculated
    expect(report.shadbala.length).toBeGreaterThanOrEqual(7);
    const sunShadbala = report.shadbala.find((s) => s.planet === 'SUN');
    expect(sunShadbala).toBeDefined();
    expect(sunShadbala!.sthanaBala).toBeGreaterThan(0);
    expect(sunShadbala!.totalRupas).toBeGreaterThan(0);

    // Verify 12 Bhava Bala items calculated with accurate lords
    expect(report.bhavaBala).toHaveLength(12);
    // House 1 is Scorpio -> lord MARS
    expect(report.bhavaBala[0].houseNumber).toBe(1);
    expect(report.bhavaBala[0].lord).toBe('MARS');
    // House 2 is Sagittarius -> lord JUPITER
    expect(report.bhavaBala[1].houseNumber).toBe(2);
    expect(report.bhavaBala[1].lord).toBe('JUPITER');
    // House 9 is Cancer -> lord MOON
    expect(report.bhavaBala[8].houseNumber).toBe(9);
    expect(report.bhavaBala[8].lord).toBe('MOON');
    // House 10 is Leo -> lord SUN
    expect(report.bhavaBala[9].houseNumber).toBe(10);
    expect(report.bhavaBala[9].lord).toBe('SUN');
  });

  it('verifies real calculated chart through AstronomyEngineAdapter produces consistent Whole Sign houses', async () => {
    const calc = new ChartCalculator();
    const birthDetails = {
      date: { year: 1990, month: 1, day: 1 },
      time: { hour: 12, minute: 0, second: 0 },
      timezone: 'Asia/Kolkata',
      latitude: 28.6139,
      longitude: 77.2090,
    };
    const config = {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeCalculation: 'MEAN_NODE',
    } as any;
    const rawChart = await calc.calculateChart(birthDetails as any, config);
    const normalized = normalizeAstroChart(rawChart);

    const provider = new DeterministicInterpretationProvider();
    const report = await generateProHoroscopeReport(sampleProfile, normalized, provider);

    expect(report.ascendant.sign).toBe(normalized.ascendant.sign);
    expect(report.houses).toHaveLength(12);
    expect(report.houses[0].sign).toBe(normalized.ascendant.sign);

    // First house begins at 0° of lagna rashi
    const lagnaRashiIdx = normalized.ascendant.rashiIndex;
    for (let h = 1; h <= 12; h++) {
      const expectedRashiIdx = ((lagnaRashiIdx - 1 + (h - 1)) % 12) + 1;
      const expectedRashi = RASHIS[expectedRashiIdx - 1];
      expect(report.houses[h - 1].sign).toBe(expectedRashi.englishName);
    }
  });
});
