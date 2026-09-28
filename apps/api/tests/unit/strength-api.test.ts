import { describe, it, expect } from 'vitest';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import { strengthRequestSchema } from '../../src/modules/astrology/astrology.schemas';

describe('Strength API & Service Unit Tests (Phase 2C: Shadbala & Bhava Bala)', () => {
  const sampleBirthDetails = {
    name: 'Strength Calculation Profile',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
  };

  it('1. validates strengthRequestSchema input correctly', () => {
    const valid = strengthRequestSchema.safeParse({
      birthDetails: sampleBirthDetails,
    });
    expect(valid.success).toBe(true);

    const invalid = strengthRequestSchema.safeParse({});
    expect(invalid.success).toBe(false);
  });

  it('2. calculates comprehensive Shadbala for all 7 physical planets', async () => {
    const result = await astrologyService.calculateStrength({
      birthDetails: sampleBirthDetails,
    });

    expect(result.birthDetails).toBeDefined();
    expect(result.shadbala).toBeDefined();
    expect(result.bhavaBala).toBeDefined();

    const expectedPlanets = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];
    expect(Object.keys(result.shadbala.planets)).toHaveLength(7);

    for (const p of expectedPlanets) {
      const planetData = (result.shadbala.planets as any)[p];
      expect(planetData).toBeDefined();
      expect(planetData.planet).toBe(p);
      expect(planetData.totalShashtiamsas).toBeGreaterThan(0);
      expect(planetData.totalRupas).toBeCloseTo(planetData.totalShashtiamsas / 60.0, 3);
      expect(planetData.minimumRequirement).toBeGreaterThan(0);
      expect(planetData.minimumRequirementRupas).toBeGreaterThan(0);
      expect(planetData.ratio).toBeCloseTo(planetData.totalShashtiamsas / planetData.minimumRequirement, 3);
      expect(typeof planetData.isStrong).toBe('boolean');
      expect(planetData.rank).toBeGreaterThanOrEqual(1);
      expect(planetData.rank).toBeLessThanOrEqual(7);

      // Sthana Bala subcomponents
      expect(planetData.sthanaBala).toBeDefined();
      expect(planetData.sthanaBala.uchchaBala).toBeGreaterThanOrEqual(0);
      expect(planetData.sthanaBala.saptavargajaBala).toBeGreaterThanOrEqual(0);
      expect(planetData.sthanaBala.ojhayugmaBala).toBeGreaterThanOrEqual(0);
      expect(planetData.sthanaBala.kendradiBala).toBeGreaterThanOrEqual(0);
      expect(planetData.sthanaBala.drekkanaBala).toBeGreaterThanOrEqual(0);
      expect(planetData.sthanaBala.total).toBeGreaterThan(0);

      // Dig Bala
      expect(planetData.digBala).toBeGreaterThanOrEqual(0);
      expect(planetData.digBala).toBeLessThanOrEqual(60);

      // Kala Bala subcomponents
      expect(planetData.kalaBala).toBeDefined();
      expect(planetData.kalaBala.nathonnathaBala).toBeGreaterThanOrEqual(0);
      expect(planetData.kalaBala.pakshaBala).toBeGreaterThanOrEqual(0);
      expect(planetData.kalaBala.tribhagaBala).toBeGreaterThanOrEqual(0);
      expect(planetData.kalaBala.varaBala).toBeGreaterThanOrEqual(0);
      expect(planetData.kalaBala.horaBala).toBeGreaterThanOrEqual(0);
      expect(planetData.kalaBala.total).toBeGreaterThan(0);

      // Cheshta Bala
      expect(planetData.cheshtaBala).toBeGreaterThanOrEqual(0);
      expect(planetData.cheshtaBala).toBeLessThanOrEqual(60);

      // Naisargika Bala
      expect(planetData.naisargikaBala).toBeGreaterThan(0);
      expect(planetData.naisargikaBala).toBeLessThanOrEqual(60);

      // Drik Bala
      expect(typeof planetData.drikBala).toBe('number');
    }

    // Nodes Rahu and Ketu are strictly excluded from classical Shadbala
    expect((result.shadbala.planets as any)['RAHU']).toBeUndefined();
    expect((result.shadbala.planets as any)['KETU']).toBeUndefined();

    // Summary contains all 7 planets sorted by ratio
    expect(result.shadbala.summary).toHaveLength(7);
    const ranks = result.shadbala.summary.map((s) => s.rank).sort();
    expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('3. calculates Bhava Bala for all 12 houses of D1', async () => {
    const result = await astrologyService.calculateStrength({
      birthDetails: sampleBirthDetails,
    });

    expect(result.bhavaBala.houses).toHaveLength(12);

    for (let h = 1; h <= 12; h++) {
      const house = result.bhavaBala.houses.find((item) => item.houseNumber === h);
      expect(house).toBeDefined();
      expect(house?.houseNumber).toBe(h);
      expect(house?.sign).toBeDefined();
      expect(house?.rashiIndex).toBeGreaterThanOrEqual(1);
      expect(house?.rashiIndex).toBeLessThanOrEqual(12);
      expect(house?.lord).toBeDefined();
      expect(house?.bhavadhipatiBala).toBeGreaterThan(0);
      expect(house?.bhavaDigBala).toBeGreaterThanOrEqual(0);
      expect(house?.bhavaDigBala).toBeLessThanOrEqual(60);
      expect(typeof house?.bhavaDrishtiBala).toBe('number');
      expect(typeof house?.bhavaOccupantBala).toBe('number');
      expect(house?.totalShashtiamsas).toBeGreaterThan(0);
      expect(house?.totalRupas).toBeCloseTo(house!.totalShashtiamsas / 60.0, 3);
      expect(house?.rank).toBeGreaterThanOrEqual(1);
      expect(house?.rank).toBeLessThanOrEqual(12);
    }

    // Unique house ranks 1 to 12
    const houseRanks = result.bhavaBala.houses.map((h) => h.rank).sort((a, b) => a - b);
    expect(houseRanks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('4. ensures zero empty {} objects in API JSON serialization', async () => {
    const result = await astrologyService.calculateStrength({
      birthDetails: sampleBirthDetails,
    });

    const jsonString = JSON.stringify(result);
    expect(jsonString).not.toContain('{}');
    expect(jsonString).not.toContain('null');
    expect(jsonString).not.toContain('undefined');

    const parsed = JSON.parse(jsonString);
    expect(parsed.shadbala.summary).toHaveLength(7);
    expect(parsed.bhavaBala.houses).toHaveLength(12);
  });

  it('5. deterministic repeatability: two independent runs yield strictly identical outputs', async () => {
    const run1 = await astrologyService.calculateStrength({
      birthDetails: sampleBirthDetails,
    });
    const run2 = await astrologyService.calculateStrength({
      birthDetails: sampleBirthDetails,
    });

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });
});
