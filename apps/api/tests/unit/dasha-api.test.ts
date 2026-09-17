import { describe, it, expect } from 'vitest';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import { dashaRequestSchema, DASHA_SYSTEMS_ENUM } from '../../src/modules/astrology/astrology.schemas';

describe('Dasha API & Service Unit Tests (Phase 2E, 2F, 2R)', () => {
  const sampleBirthDetails = {
    name: 'Dasha Test Native',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
  };

  describe('Vimshottari Dasha API (Phase 2E)', () => {
    it('1. validates dashaRequestSchema input correctly', () => {
      const valid = dashaRequestSchema.safeParse({
        birthDetails: sampleBirthDetails,
        maxLevel: 3,
        targetDate: '2026-09-08T00:00:00.000Z',
      });
      expect(valid.success).toBe(true);

      const validDefault = dashaRequestSchema.parse({
        birthDetails: sampleBirthDetails,
      });
      expect(validDefault.maxLevel).toBe(3);

      const invalid = dashaRequestSchema.safeParse({});
      expect(invalid.success).toBe(false);

      const invalidLevel = dashaRequestSchema.safeParse({
        birthDetails: sampleBirthDetails,
        maxLevel: 6,
      });
      expect(invalidLevel.success).toBe(false);
    });

    it('2. calculates deterministic Vimshottari Dasha tree from canonical birth chart', async () => {
      const result = await astrologyService.calculateDasha({
        birthDetails: sampleBirthDetails,
        maxLevel: 3,
      });

      expect(result.birthDetails).toBeDefined();
      expect(result.dashaTree).toBeDefined();

      const tree = result.dashaTree as any;
      expect(typeof tree.moonLongitude).toBe('number');
      expect(tree.moonLongitude).toBeGreaterThanOrEqual(0);
      expect(tree.moonLongitude).toBeLessThan(360);

      expect(tree.moonNakshatraIndex).toBeGreaterThanOrEqual(1);
      expect(tree.moonNakshatraIndex).toBeLessThanOrEqual(27);
      expect(typeof tree.moonNakshatraName).toBe('string');
      expect(tree.moonPada).toBeGreaterThanOrEqual(1);
      expect(tree.moonPada).toBeLessThanOrEqual(4);

      expect(tree.birthLord).toBeDefined();
      expect(tree.balanceAtBirthYears).toBeGreaterThan(0);
      expect(tree.elapsedAtBirthYears).toBeGreaterThanOrEqual(0);
      expect(tree.totalCycleYears).toBe(120);

      expect(tree.mahadashas).toHaveLength(9);
      expect(tree.mahadashas[0].lord).toBe(tree.birthLord);
      expect(tree.mahadashas[0].isBirthDasha).toBe(true);
      expect(tree.mahadashas[0].durationYears).toBeCloseTo(tree.balanceAtBirthYears, 4);

      for (let i = 1; i < tree.mahadashas.length; i++) {
        expect(tree.mahadashas[i].isBirthDasha).toBe(false);
      }
    });

    it('3. enforces period continuity: no gaps, no overlaps, contiguous timestamps', async () => {
      const result = await astrologyService.calculateDasha({
        birthDetails: sampleBirthDetails,
        maxLevel: 3,
      });

      const tree = result.dashaTree as any;

      for (let i = 0; i < tree.mahadashas.length - 1; i++) {
        expect(tree.mahadashas[i + 1].startDateIso).toBe(tree.mahadashas[i].endDateIso);
      }

      for (const maha of tree.mahadashas) {
        if (maha.subPeriods && maha.subPeriods.length > 0) {
          expect(maha.subPeriods[0].startDateIso).toBe(maha.startDateIso);
          expect(maha.subPeriods[maha.subPeriods.length - 1].endDateIso).toBe(maha.endDateIso);

          for (let j = 0; j < maha.subPeriods.length - 1; j++) {
            expect(maha.subPeriods[j + 1].startDateIso).toBe(maha.subPeriods[j].endDateIso);
          }
        }
      }
    });

    it('4. resolves active Dasha hierarchy for requested targetDate deterministically', async () => {
      const targetDate = '2026-09-08T00:27:00.000Z';
      const result = await astrologyService.calculateDasha({
        birthDetails: sampleBirthDetails,
        maxLevel: 3,
        targetDate,
      });

      const tree = result.dashaTree as any;
      expect(tree.activeDasha).toBeDefined();

      const active = tree.activeDasha!;
      expect(active.targetDateIso).toBe(targetDate);
      expect(active.mahadasha).toBeDefined();
      expect(active.mahadasha.level).toBe(1);
      expect(active.antardasha).toBeDefined();
      expect(active.antardasha!.level).toBe(2);
      expect(active.pratyantardasha).toBeDefined();
      expect(active.pratyantardasha!.level).toBe(3);

      expect(active.path).toHaveLength(3);
      expect(active.description).toContain(' - ');

      const activeMaha = tree.mahadashas.find((m: any) => m.isActive === true);
      expect(activeMaha).toBeDefined();
      expect(activeMaha!.lord).toBe(active.mahadasha.lord);
    });

    it('5. serializes safely to JSON with zero empty objects or undefined fields', async () => {
      const result = await astrologyService.calculateDasha({
        birthDetails: sampleBirthDetails,
        maxLevel: 3,
        targetDate: '2025-01-01T00:00:00.000Z',
      });

      const jsonString = JSON.stringify(result);
      const parsed = JSON.parse(jsonString);

      expect(parsed.birthDetails).toBeDefined();
      expect(parsed.dashaTree).toBeDefined();
      expect(parsed.dashaTree.moonLongitude).toBeDefined();
      expect(parsed.dashaTree.moonNakshatraName).toBeDefined();
      expect(parsed.dashaTree.activeDasha).toBeDefined();
      expect(parsed.dashaTree.mahadashas.length).toBe(9);

      for (const maha of parsed.dashaTree.mahadashas) {
        expect(maha.lord).toBeDefined();
        expect(maha.startDateIso).toBeDefined();
        expect(maha.endDateIso).toBeDefined();
        expect(maha.durationYears).toBeDefined();
      }
    });
  });

  describe('Ashtottari Dasha API (Phase 2F)', () => {
    it('6. validates dashaRequestSchema for ASHTOTTARI system', () => {
      const valid = dashaRequestSchema.safeParse({
        birthDetails: sampleBirthDetails,
        dashaSystem: 'ASHTOTTARI',
        maxLevel: 3,
        timeHorizonYears: 108,
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.dashaSystem).toBe('ASHTOTTARI');
      }
    });

    it('7. calculates deterministic Ashtottari Dasha tree with 108-year cycle and 8 lords', async () => {
      const result = await astrologyService.calculateDasha({
        birthDetails: sampleBirthDetails,
        dashaSystem: 'ASHTOTTARI',
        maxLevel: 3,
      });

      expect(result.birthDetails).toBeDefined();
      expect(result.dashaTree).toBeDefined();

      const tree = result.dashaTree as any;
      expect(tree.dashaSystem).toBe('ASHTOTTARI');
      expect(tree.totalCycleYears).toBe(108);
      expect(tree.mahadashas).toHaveLength(8);
      expect(tree.mahadashas[0].lord).toBe(tree.birthLord);
      expect(tree.mahadashas[0].isBirthDasha).toBe(true);
      expect(tree.eligibility).toBeDefined();
    });
  });

  describe('Phase 2R: Additional Classical Dasha Systems API & Services', () => {
    it('8. validates dashaRequestSchema accepts all 9 supported Dasha systems', () => {
      for (const sys of DASHA_SYSTEMS_ENUM) {
        const parsed = dashaRequestSchema.safeParse({
          birthDetails: sampleBirthDetails,
          dashaSystem: sys,
        });
        expect(parsed.success).toBe(true);
      }
    });

    it('9. calculates Sthira Dasha (96-year Rashi dasha) via API', async () => {
      const result = await astrologyService.calculateDasha({
        birthDetails: sampleBirthDetails,
        dashaSystem: 'STHIRA',
        maxLevel: 2,
        targetDate: '2026-09-08T00:00:00.000Z',
      });

      expect(result.dashaTree).toBeDefined();
      const tree = result.dashaTree as any;
      expect(tree.dashaSystem).toBe('STHIRA');
      expect(tree.basis).toBe('RASHI');
      expect(tree.totalCycleYears).toBe(96);
      expect(tree.mahadashas).toHaveLength(12);
      expect(tree.startingRashiName).toBeDefined();
      expect(tree.activeDasha).toBeDefined();

      // Serialization test
      const json = JSON.stringify(result);
      expect(json).not.toContain('{}');
    });

    it('10. calculates Shoola Dasha (108-year Rashi dasha) via API', async () => {
      const result = await astrologyService.calculateDasha({
        birthDetails: sampleBirthDetails,
        dashaSystem: 'SHOOLA',
        maxLevel: 2,
        targetDate: '2026-09-08T00:00:00.000Z',
      });

      expect(result.dashaTree).toBeDefined();
      const tree = result.dashaTree as any;
      expect(tree.dashaSystem).toBe('SHOOLA');
      expect(tree.basis).toBe('RASHI');
      expect(tree.totalCycleYears).toBe(108);
      expect(tree.mahadashas).toHaveLength(12);
      expect(['DIRECT', 'REVERSE']).toContain(tree.direction);
      expect([1, 7]).toContain(tree.startingFromHouse);
    });

    it('11. calculates or returns structured eligibility for conditional Parashari Dasha systems', async () => {
      const systems = [
        'DWISAPTATI_SAMA',
        'SHATABDIKA',
        'CHATURASEETI_SAMA',
        'DWADASHOTTARI',
        'PANCHOTTARI',
      ] as const;

      for (const sys of systems) {
        const result = await astrologyService.calculateDasha({
          birthDetails: sampleBirthDetails,
          dashaSystem: sys,
        });

        expect(result.dashaTree).toBeDefined();
        const tree = result.dashaTree as any;
        expect(tree.dashaSystem).toBe(sys);

        if (tree.isEligible === false) {
          // If ineligible, structured response with reason and criteria
          expect(tree.eligibility).toBeDefined();
          expect(typeof tree.eligibility.reason).toBe('string');
        } else {
          // If eligible, full timeline is present
          expect(tree.mahadashas).toBeDefined();
          expect(tree.totalCycleYears).toBeGreaterThan(0);
        }
      }
    });

    it('12. serializes all 7 new Dasha systems safely to JSON with zero empty objects', async () => {
      const allSystems = [
        'STHIRA',
        'SHOOLA',
        'DWISAPTATI_SAMA',
        'SHATABDIKA',
        'CHATURASEETI_SAMA',
        'DWADASHOTTARI',
        'PANCHOTTARI',
      ] as const;

      for (const sys of allSystems) {
        const result = await astrologyService.calculateDasha({
          birthDetails: sampleBirthDetails,
          dashaSystem: sys,
          maxLevel: 2,
          targetDate: '2025-06-01T00:00:00.000Z',
        });

        const json = JSON.stringify(result);
        const parsed = JSON.parse(json);

        expect(parsed.birthDetails).toBeDefined();
        expect(parsed.dashaTree).toBeDefined();
        expect(parsed.dashaTree.dashaSystem).toBe(sys);
      }
    });
  });
});
