import { describe, it, expect } from 'vitest';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import { prashnaRequestSchema } from '../../src/modules/astrology/astrology.schemas';

describe('Prashna API & Service Unit Tests (Phase 2T: Horary Astrology Foundation)', () => {
  const samplePrashnaInput = {
    questionTimestamp: '2026-09-17T10:30:00+05:30',
    timezone: 'Asia/Kolkata',
    location: {
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
    },
    questionNumber: 54,
    questionNumberSystem: 'PARASHARI_1_108' as const,
    questionText: 'Will the interview lead to an offer?',
  };

  it('1. validates prashnaRequestSchema correctly', () => {
    // Valid input
    const valid = prashnaRequestSchema.safeParse(samplePrashnaInput);
    expect(valid.success).toBe(true);

    // Missing questionTimestamp
    const missingTime = prashnaRequestSchema.safeParse({
      ...samplePrashnaInput,
      questionTimestamp: undefined,
    });
    expect(missingTime.success).toBe(false);

    // Invalid questionTimestamp string
    const invalidTime = prashnaRequestSchema.safeParse({
      ...samplePrashnaInput,
      questionTimestamp: 'not-a-valid-date',
    });
    expect(invalidTime.success).toBe(false);

    // Out of bound questionNumber
    const outOfBounds = prashnaRequestSchema.safeParse({
      ...samplePrashnaInput,
      questionNumber: 300,
    });
    expect(outOfBounds.success).toBe(false);

    // Question number < 1
    const negativeNumber = prashnaRequestSchema.safeParse({
      ...samplePrashnaInput,
      questionNumber: 0,
    });
    expect(negativeNumber.success).toBe(false);

    // Invalid coordinates
    const invalidLat = prashnaRequestSchema.safeParse({
      ...samplePrashnaInput,
      location: { ...samplePrashnaInput.location, latitude: 95 },
    });
    expect(invalidLat.success).toBe(false);
  });

  it('2. calculates deterministic Prashna chart via astrologyService', async () => {
    const result = await astrologyService.calculatePrashna(samplePrashnaInput);

    expect(result).toBeDefined();
    expect(result.calculationVersion).toBeDefined();

    // Convention
    expect(result.convention.zodiac).toBe('SIDEREAL');
    expect(result.convention.ayanamsa).toBe('LAHIRI');
    expect(result.convention.houseSystem).toBe('WHOLE_SIGN');
    expect(result.convention.timeConvention).toBe('EXPLICIT_QUESTION_TIMESTAMP_NO_SERVER_TIME');

    // Timing & Location
    expect(result.questionTime.timezone).toBe('Asia/Kolkata');
    expect(result.location.latitude).toBe(28.6139);
    expect(result.location.longitude).toBe(77.209);
    expect(result.questionText).toBe('Will the interview lead to an offer?');

    // Prashna Lagna
    expect(result.prashnaLagna).toBeDefined();
    expect(result.prashnaLagna.rashiIndex).toBeGreaterThanOrEqual(1);
    expect(result.prashnaLagna.rashiIndex).toBeLessThanOrEqual(12);
    expect(result.prashnaLagna.lord).toBeDefined();

    // Planets
    expect(result.planets).toBeDefined();
    expect(Object.keys(result.planets).length).toBe(9);
    for (const p of Object.values(result.planets)) {
      expect(p.house).toBeGreaterThanOrEqual(1);
      expect(p.house).toBeLessThanOrEqual(12);
      expect(typeof p.isCombust).toBe('boolean');
    }

    // Houses
    expect(result.houses.length).toBe(12);
    for (const h of result.houses) {
      expect(h.lord).toBeDefined();
      expect(Array.isArray(h.occupyingPlanets)).toBe(true);
    }

    // Moon
    expect(result.moon).toBeDefined();
    expect(result.moon.house).toBeGreaterThanOrEqual(1);
    expect(typeof result.moon.isWaxing).toBe('boolean');

    // Classical Sphutas
    expect(result.sphutas.gulika).toBeDefined();
    expect(result.sphutas.trisphuta).toBeDefined();
    expect(result.sphutas.chatusphuta).toBeDefined();
    expect(result.sphutas.panchasphuta).toBeDefined();

    // Question number
    expect(result.questionNumberDetails).toBeDefined();
    expect(result.questionNumberDetails?.system).toBe('PARASHARI_1_108');
    expect(result.questionNumberDetails?.number).toBe(54);

    // Instantaneous Panchanga
    expect(result.panchanga.tithi).toBeDefined();
    expect(result.panchanga.vara).toBeDefined();
    expect(result.panchanga.nakshatra).toBeDefined();
    expect(typeof result.isRahuKala).toBe('boolean');
  });

  it('3. calculates Prashna chart with KP 1–249 question number', async () => {
    const result = await astrologyService.calculatePrashna({
      questionTimestamp: '2026-09-17T14:15:00Z',
      timezone: 'UTC',
      location: {
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'UTC',
        placeName: 'London, UK',
      },
      questionNumber: 215,
      questionNumberSystem: 'KP_1_249',
    });

    expect(result).toBeDefined();
    expect(result.questionNumberDetails).toBeDefined();
    expect(result.questionNumberDetails?.system).toBe('KP_1_249');
    expect(result.questionNumberDetails?.number).toBe(215);

    if (result.questionNumberDetails?.system === 'KP_1_249') {
      expect(result.questionNumberDetails.signLord).toBeDefined();
      expect(result.questionNumberDetails.starLord).toBeDefined();
      expect(result.questionNumberDetails.subLord).toBeDefined();
    }
  });
});

