import { describe, it, expect } from 'vitest';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import { varshaphalaRequestSchema } from '../../src/modules/astrology/astrology.schemas';

describe('Varshaphala API & Service Unit Tests (Phase 2S: Annual Astrology Foundation)', () => {
  const sampleBirthDetails = {
    name: 'Varshaphala Profile',
    dateOfBirth: '1992-08-20',
    timeOfBirth: '10:15:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
  };

  it('1. validates varshaphalaRequestSchema correctly', () => {
    const valid = varshaphalaRequestSchema.safeParse({
      birthDetails: sampleBirthDetails,
      targetYear: 2026,
    });
    expect(valid.success).toBe(true);

    const invalidYear = varshaphalaRequestSchema.safeParse({
      birthDetails: sampleBirthDetails,
      targetYear: 1850,
    });
    expect(invalidYear.success).toBe(false);

    const missingDetails = varshaphalaRequestSchema.safeParse({
      targetYear: 2026,
    });
    expect(missingDetails.success).toBe(false);
  });

  it('2. calculates deterministic Varshaphala annual chart through astrologyService', async () => {
    const result = await astrologyService.calculateVarshaphala({
      birthDetails: sampleBirthDetails,
      targetYear: 2026,
    });

    expect(result).toBeDefined();
    expect(result.calculationVersion).toBeDefined();

    // Solar Return
    expect(result.solarReturn.targetYear).toBe(2026);
    expect(result.solarReturn.age).toBe(34);
    expect(result.solarReturn.angularErrorDegrees).toBeLessThan(1e-6);
    expect(result.solarReturn.solarReturnUtcIso).toBeDefined();
    expect(result.solarReturn.solarReturnLocalIso).toBeDefined();

    // Varsha Lagna
    expect(result.varshaLagna).toBeDefined();
    expect(result.varshaLagna.rashiIndex).toBeGreaterThanOrEqual(1);
    expect(result.varshaLagna.rashiIndex).toBeLessThanOrEqual(12);
    expect(result.varshaLagna.lord).toBeDefined();

    // Muntha
    expect(result.muntha).toBeDefined();
    expect(result.muntha.progressionYears).toBe(34);
    expect(result.muntha.rashiIndex).toBeGreaterThanOrEqual(1);
    expect(result.muntha.rashiIndex).toBeLessThanOrEqual(12);

    // Harsha Bala
    expect(result.harshaBala).toBeDefined();
    expect(result.harshaBala.SUN.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.harshaBala.SUN.totalScore).toBeLessThanOrEqual(20);

    // Panchadhikari & Varshesha
    expect(result.panchadhikari.candidates).toHaveLength(5);
    expect(result.varshesha.selectedVarshesha).toBeDefined();
    expect(result.varshesha.selectionReason).toBeDefined();

    // Tajika Yogas
    expect(Array.isArray(result.tajikaYogas)).toBe(true);

    // Sahams
    expect(result.sahams).toHaveLength(10);
    for (const saham of result.sahams) {
      expect(saham.name).toBeDefined();
      expect(saham.longitude).toBeGreaterThanOrEqual(0);
      expect(saham.longitude).toBeLessThan(360);
      expect(saham.formula).toBeDefined();
    }

    // Mudda Dasha
    expect(result.muddaDasha.dashaSystem).toBe('MUDDA');
    expect(result.muddaDasha.periods).toHaveLength(9);
    expect(result.muddaDasha.totalCycleDays).toBeCloseTo(365.2425, 2);

    // Annual Panchanga
    expect(result.panchanga).toBeDefined();
    expect(result.panchanga.tithi).toBeDefined();
    expect(result.panchanga.nakshatra).toBeDefined();
  });

  it('3. supports annual location override in Varshaphala calculation', async () => {
    const result = await astrologyService.calculateVarshaphala({
      birthDetails: sampleBirthDetails,
      targetYear: 2026,
      annualLocation: {
        latitude: 40.7128,
        longitude: -74.006,
        timezone: 'America/New_York',
        placeName: 'New York, USA',
      },
    });

    expect(result.solarReturn.timezone).toBe('America/New_York');
    expect(result.solarReturn.annualLocation.placeName).toBe('New York, USA');
  });

  it('4. rejects annual year preceding birth year with clear validation error', async () => {
    await expect(
      astrologyService.calculateVarshaphala({
        birthDetails: sampleBirthDetails,
        targetYear: 1980,
      })
    ).rejects.toThrow(/cannot precede birth year/);
  });
});
