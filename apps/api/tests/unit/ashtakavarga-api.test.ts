import { describe, it, expect } from 'vitest';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import { ashtakavargaRequestSchema } from '../../src/modules/astrology/astrology.schemas';

describe('Ashtakavarga API & Service Unit Tests (Phase 2D)', () => {
  const sampleBirthDetails = {
    name: 'Ashtakavarga Test Profile',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
  };

  it('1. validates ashtakavargaRequestSchema input correctly', () => {
    const valid = ashtakavargaRequestSchema.safeParse({
      birthDetails: sampleBirthDetails,
    });
    expect(valid.success).toBe(true);

    const invalid = ashtakavargaRequestSchema.safeParse({});
    expect(invalid.success).toBe(false);
  });

  it('2. calculates comprehensive Ashtakavarga for all 7 classical planets and SAV', async () => {
    const result = await astrologyService.calculateAshtakavarga({
      birthDetails: sampleBirthDetails,
    });

    expect(result.birthDetails).toBeDefined();
    expect(result.ashtakavarga).toBeDefined();

    const expectedPlanets = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN'];
    const expectedTotals: Record<string, number> = {
      SUN: 48,
      MOON: 49,
      MARS: 39,
      MERCURY: 54,
      JUPITER: 56,
      VENUS: 52,
      SATURN: 39,
    };

    // BAV checks
    expect(Object.keys(result.ashtakavarga.bav)).toHaveLength(7);
    for (const p of expectedPlanets) {
      const bavTable = (result.ashtakavarga.bav as any)[p];
      expect(bavTable).toBeDefined();
      expect(bavTable.planet).toBe(p);
      expect(bavTable.totalPoints).toBe(expectedTotals[p]);
      expect(bavTable.signList).toHaveLength(12);

      // Verify sign list sum
      const listSum = bavTable.signList.reduce((acc: number, val: number) => acc + val, 0);
      expect(listSum).toBe(expectedTotals[p]);

      // Prastara matrix
      expect(bavTable.prastara).toBeDefined();
      expect(Object.keys(bavTable.prastara)).toHaveLength(8);
      for (const row of Object.values(bavTable.prastara) as number[][]) {
        expect(row).toHaveLength(12);
      }
    }

    // SAV checks
    expect(result.ashtakavarga.sav).toBeDefined();
    expect(result.ashtakavarga.sav.grandTotal).toBe(337);
    expect(result.ashtakavarga.sav.signList).toHaveLength(12);
    const savSum = result.ashtakavarga.sav.signList.reduce((acc: number, val: number) => acc + val, 0);
    expect(savSum).toBe(337);

    // Shodhana checks
    expect(Object.keys(result.ashtakavarga.shodhana)).toHaveLength(7);
    for (const p of expectedPlanets) {
      const sh = (result.ashtakavarga.shodhana as any)[p];
      expect(sh).toBeDefined();
      expect(sh.trikonaReduced).toHaveLength(12);
      expect(sh.ekadhipatyaReduced).toHaveLength(12);
      expect(sh.totalTrikonaPoints).toBeLessThanOrEqual(expectedTotals[p]);
      expect(sh.totalEkadhipatyaPoints).toBeLessThanOrEqual(sh.totalTrikonaPoints);
    }

    // Shodhya Pinda checks
    expect(Object.keys(result.ashtakavarga.pinda)).toHaveLength(7);
    for (const p of expectedPlanets) {
      const pinda = (result.ashtakavarga.pinda as any)[p];
      expect(pinda).toBeDefined();
      expect(pinda.rashiPinda).toBeGreaterThan(0);
      expect(pinda.grahaPinda).toBeGreaterThan(0);
      expect(pinda.shodhyaPinda).toBe(pinda.rashiPinda + pinda.grahaPinda);
    }
  });

  it('3. ensures zero empty {} objects in API JSON serialization', async () => {
    const result = await astrologyService.calculateAshtakavarga({
      birthDetails: sampleBirthDetails,
    });

    const jsonString = JSON.stringify(result);
    expect(jsonString).not.toContain('{}');
    expect(jsonString).not.toContain('null');
    expect(jsonString).not.toContain('undefined');

    const parsed = JSON.parse(jsonString);
    expect(parsed.ashtakavarga.sav.grandTotal).toBe(337);
    expect(parsed.ashtakavarga.sav.signList).toHaveLength(12);
  });

  it('4. deterministic repeatability: two independent runs yield strictly identical outputs', async () => {
    const run1 = await astrologyService.calculateAshtakavarga({
      birthDetails: sampleBirthDetails,
    });
    const run2 = await astrologyService.calculateAshtakavarga({
      birthDetails: sampleBirthDetails,
    });

    expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
  });
});
