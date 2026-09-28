import { describe, it, expect } from 'vitest';
import {
  DashaCalculator,
  DASHA_YEARS,
  DASHA_ORDER,
  TOTAL_VIMSHOTTARI_YEARS,
  MS_PER_YEAR,
} from '../../src/dasha/dasha-calculator';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { NAKSHATRAS, getNakshatraByLongitude } from '../../src/nakshatra/nakshatra';
import { DashaPeriod } from '../../src/dasha/dasha.types';

describe('DashaCalculator - Unit & Boundary Tests', () => {
  const calculator = new DashaCalculator();

  describe('Canonical Vimshottari Constants & Sequence', () => {
    it('verifies the 120-year cycle and planetary lord durations', () => {
      expect(TOTAL_VIMSHOTTARI_YEARS).toBe(120);

      const canonicalLords = [
        PlanetSymbol.KETU,
        PlanetSymbol.VENUS,
        PlanetSymbol.SUN,
        PlanetSymbol.MOON,
        PlanetSymbol.MARS,
        PlanetSymbol.RAHU,
        PlanetSymbol.JUPITER,
        PlanetSymbol.SATURN,
        PlanetSymbol.MERCURY,
      ];

      expect(DASHA_ORDER).toEqual(canonicalLords);

      const totalYears = canonicalLords.reduce((sum, lord) => sum + DASHA_YEARS[lord], 0);
      expect(totalYears).toBe(120);

      expect(DASHA_YEARS[PlanetSymbol.KETU]).toBe(7);
      expect(DASHA_YEARS[PlanetSymbol.VENUS]).toBe(20);
      expect(DASHA_YEARS[PlanetSymbol.SUN]).toBe(6);
      expect(DASHA_YEARS[PlanetSymbol.MOON]).toBe(10);
      expect(DASHA_YEARS[PlanetSymbol.MARS]).toBe(7);
      expect(DASHA_YEARS[PlanetSymbol.RAHU]).toBe(18);
      expect(DASHA_YEARS[PlanetSymbol.JUPITER]).toBe(16);
      expect(DASHA_YEARS[PlanetSymbol.SATURN]).toBe(19);
      expect(DASHA_YEARS[PlanetSymbol.MERCURY]).toBe(17);
    });
  });

  describe('Nakshatra Mapping for all 27 Nakshatras', () => {
    it('verifies that each of the 27 Nakshatras starts with the correct Mahadasha lord', () => {
      const birthDate = new Date('1995-04-12T08:30:00.000Z');

      for (let i = 0; i < 27; i++) {
        const nakshatra = NAKSHATRAS[i];
        // Test midpoint of each Nakshatra
        const midLongitude = (nakshatra.startDegree + nakshatra.endDegree) / 2;
        const result = calculator.calculateVimshottariDasha(midLongitude, birthDate, 1);

        expect(result.moonNakshatraIndex).toBe(i + 1);
        expect(result.moonNakshatraName).toBe(nakshatra.name);
        expect(result.birthLord).toBe(nakshatra.lord);
        expect(result.mahadashas[0].lord).toBe(nakshatra.lord);
      }
    });
  });

  describe('Boundary & Precision Testing', () => {
    const birthDate = new Date('2000-01-01T00:00:00.000Z');

    it('handles exact 0° Aries (Ashwini start) with full Ketu balance', () => {
      const result = calculator.calculateVimshottariDasha(0.0, birthDate, 3);

      expect(result.moonNakshatraIndex).toBe(1);
      expect(result.moonNakshatraName).toBe('Ashwini');
      expect(result.moonPada).toBe(1);
      expect(result.birthLord).toBe(PlanetSymbol.KETU);
      expect(result.balanceAtBirthYears).toBeCloseTo(7.0, 6);
      expect(result.elapsedAtBirthYears).toBeCloseTo(0.0, 6);
      expect(result.mahadashas).toHaveLength(9);
      expect(result.mahadashas[0].lord).toBe(PlanetSymbol.KETU);
      expect(result.mahadashas[0].durationYears).toBeCloseTo(7.0, 6);
      expect(result.mahadashas[0].startDateIso).toBe(birthDate.toISOString());
    });

    it('handles exact 13°20\' boundary (transition to Bharani)', () => {
      const boundaryDeg = 360 / 27; // 13.333333333333334
      const result = calculator.calculateVimshottariDasha(boundaryDeg, birthDate, 2);

      expect(result.moonNakshatraIndex).toBe(2);
      expect(result.moonNakshatraName).toBe('Bharani');
      expect(result.birthLord).toBe(PlanetSymbol.VENUS);
      expect(result.balanceAtBirthYears).toBeCloseTo(20.0, 5);
      expect(result.elapsedAtBirthYears).toBeCloseTo(0.0, 5);
    });

    it('handles just before 13°20\' boundary (end of Ashwini with tiny balance)', () => {
      const justBeforeDeg = 13.333333333333334 - 0.0001;
      const result = calculator.calculateVimshottariDasha(justBeforeDeg, birthDate, 2);

      expect(result.moonNakshatraIndex).toBe(1);
      expect(result.moonNakshatraName).toBe('Ashwini');
      expect(result.birthLord).toBe(PlanetSymbol.KETU);
      expect(result.balanceAtBirthYears).toBeLessThan(0.01);
      expect(result.elapsedAtBirthYears).toBeCloseTo(7.0, 2);
    });

    it('handles near 360° (end of Revati / Mercury balance)', () => {
      const result = calculator.calculateVimshottariDasha(359.9999, birthDate, 2);

      expect(result.moonNakshatraIndex).toBe(27);
      expect(result.moonNakshatraName).toBe('Revati');
      expect(result.birthLord).toBe(PlanetSymbol.MERCURY);
      expect(result.balanceAtBirthYears).toBeLessThan(0.01);
      expect(result.elapsedAtBirthYears).toBeCloseTo(17.0, 2);
    });

    it('handles 360° and negative degrees via normalization', () => {
      const result360 = calculator.calculateVimshottariDasha(360.0, birthDate, 1);
      expect(result360.moonNakshatraIndex).toBe(1);
      expect(result360.birthLord).toBe(PlanetSymbol.KETU);

      const resultNeg = calculator.calculateVimshottariDasha(-10.0, birthDate, 1);
      // -10° is normalized to 350°, which falls into Revati (346.67° - 360°)
      expect(resultNeg.moonNakshatraIndex).toBe(27);
      expect(resultNeg.birthLord).toBe(PlanetSymbol.MERCURY);
    });

    it('correctly calculates fractional balance at 50% through Nakshatra', () => {
      // 6.666666666666667 is 50% of Ashwini (span 13.333333333333334)
      const result = calculator.calculateVimshottariDasha(6.666666666666667, birthDate, 2);

      expect(result.moonNakshatraIndex).toBe(1);
      expect(result.balanceAtBirthYears).toBeCloseTo(3.5, 5);
      expect(result.elapsedAtBirthYears).toBeCloseTo(3.5, 5);
    });
  });

  describe('Period Continuity Invariants (Requirement 14)', () => {
    // Helper to recursively assert period continuity and no gaps/overlaps
    function assertSubPeriodContinuity(parent: DashaPeriod, maxLevelAsserted: number) {
      if (!parent.subPeriods || parent.subPeriods.length === 0) {
        return;
      }

      const children = parent.subPeriods;

      // Invariant 1: First child starts exactly at parent's active start date
      expect(children[0].startDateIso).toBe(parent.startDateIso);

      // Invariant 2: Last child ends exactly at parent's active end date
      expect(children[children.length - 1].endDateIso).toBe(parent.endDateIso);

      // Invariant 3: Adjacent child periods are contiguous with no gaps or overlaps
      for (let i = 0; i < children.length - 1; i++) {
        expect(children[i + 1].startDateIso).toBe(children[i].endDateIso);
      }

      // Invariant 4: Sum of child durationYears equals parent durationYears within precision
      const sumChildYears = children.reduce((acc, c) => acc + c.durationYears, 0);
      expect(sumChildYears).toBeCloseTo(parent.durationYears, 4);

      // Recurse to verify deeper levels
      if (parent.level < maxLevelAsserted) {
        for (const child of children) {
          assertSubPeriodContinuity(child, maxLevelAsserted);
        }
      }
    }

    it('verifies all continuity invariants for birth at 0% elapsed (full balance)', () => {
      const birthDate = new Date('1990-05-20T14:30:00.000Z');
      const result = calculator.calculateVimshottariDasha(0.0, birthDate, 3);

      // 1. First Mahadasha starts at birth
      expect(result.mahadashas[0].startDateIso).toBe(birthDate.toISOString());

      // 2. Birth Mahadasha ends exactly at birth + balance
      const birthTimeMs = birthDate.getTime();
      const expectedBirthMahaEndMs = birthTimeMs + Math.round(result.balanceAtBirthYears * MS_PER_YEAR);
      expect(new Date(result.mahadashas[0].endDateIso).getTime()).toBe(expectedBirthMahaEndMs);

      // 3. Contiguous Mahadashas with no gaps or overlaps
      for (let i = 0; i < result.mahadashas.length - 1; i++) {
        expect(result.mahadashas[i + 1].startDateIso).toBe(result.mahadashas[i].endDateIso);
      }

      // 4. Verify subperiod continuity down through Pratyantardasha (Level 3)
      for (const maha of result.mahadashas) {
        assertSubPeriodContinuity(maha, 3);
      }
    });

    it('verifies all continuity invariants for birth with partial balance (midpoint)', () => {
      const birthDate = new Date('1985-11-08T03:15:45.500Z');
      // 53.333333333333336 is start of Mrigashira (Mars, 7 years).
      // Let's take 53.333333333333336 + 6.666666666666667 = 60.0° (exactly 50% elapsed)
      const result = calculator.calculateVimshottariDasha(60.0, birthDate, 3);

      expect(result.birthLord).toBe(PlanetSymbol.MARS);
      expect(result.balanceAtBirthYears).toBeCloseTo(3.5, 4);

      // First Mahadasha starts at birth
      expect(result.mahadashas[0].startDateIso).toBe(birthDate.toISOString());

      // Contiguity across all Mahadashas
      for (let i = 0; i < result.mahadashas.length - 1; i++) {
        expect(result.mahadashas[i + 1].startDateIso).toBe(result.mahadashas[i].endDateIso);
      }

      // Subperiod continuity
      for (const maha of result.mahadashas) {
        assertSubPeriodContinuity(maha, 3);
      }
    });

    it('verifies all continuity invariants for birth with near-zero balance (99% elapsed)', () => {
      const birthDate = new Date('2015-08-25T23:59:59.000Z');
      // Rohini (Moon, 10 years) spans 40.0° to 53.333333333333336°.
      // Take 40.0 + 0.99 * 13.333333333333334 = 53.2°
      const moonLon = 40.0 + 0.99 * (360 / 27);
      const result = calculator.calculateVimshottariDasha(moonLon, birthDate, 3);

      expect(result.birthLord).toBe(PlanetSymbol.MOON);
      expect(result.balanceAtBirthYears).toBeCloseTo(0.1, 2);

      // First Mahadasha starts at birth
      expect(result.mahadashas[0].startDateIso).toBe(birthDate.toISOString());

      // Contiguity across all Mahadashas
      for (let i = 0; i < result.mahadashas.length - 1; i++) {
        expect(result.mahadashas[i + 1].startDateIso).toBe(result.mahadashas[i].endDateIso);
      }

      // Subperiod continuity
      for (const maha of result.mahadashas) {
        assertSubPeriodContinuity(maha, 3);
      }
    });

    it('verifies recursive continuity down to Level 5 (Sookshma & Prana)', () => {
      const birthDate = new Date('2005-02-14T10:00:00.000Z');
      const result = calculator.calculateVimshottariDasha(0.0, birthDate, 5);

      const firstMaha = result.mahadashas[0];
      expect(firstMaha.subPeriods).toBeDefined();

      const firstAntar = firstMaha.subPeriods![0];
      expect(firstAntar.subPeriods).toBeDefined();

      const firstPratyantar = firstAntar.subPeriods![0];
      expect(firstPratyantar.subPeriods).toBeDefined();

      const firstSookshma = firstPratyantar.subPeriods![0];
      expect(firstSookshma.subPeriods).toBeDefined();

      const firstPrana = firstSookshma.subPeriods![0];
      expect(firstPrana.level).toBe(5);

      assertSubPeriodContinuity(firstMaha, 5);
    });
  });

  describe('Current Dasha Query (Requirement 16)', () => {
    const birthDate = new Date('1990-01-01T00:00:00.000Z');
    // Longitude 0.0 -> Ketu (7 years). Ketu runs from 1990-01-01 to 1997-01-01.
    // Venus (20 years) runs from 1997-01-01 to 2017-01-01.
    // Sun (6 years) runs from 2017-01-01 to 2023-01-01.
    // Moon (10 years) runs from 2023-01-01 to 2033-01-01.
    const tree = calculator.calculateVimshottariDasha(0.0, birthDate, { maxLevel: 3 });

    it('returns null for timestamp prior to birth', () => {
      const preBirth = new Date('1989-12-31T23:59:59.000Z');
      const active = calculator.getActiveDasha(tree, preBirth);
      expect(active).toBeNull();
    });

    it('returns active birth Dasha hierarchy at exact birth instant', () => {
      const active = calculator.getActiveDasha(tree, birthDate);
      expect(active).not.toBeNull();
      expect(active!.mahadasha.lord).toBe(PlanetSymbol.KETU);
      expect(active!.antardasha!.lord).toBe(PlanetSymbol.KETU);
      expect(active!.pratyantardasha!.lord).toBe(PlanetSymbol.KETU);
      expect(active!.path).toEqual([PlanetSymbol.KETU, PlanetSymbol.KETU, PlanetSymbol.KETU]);
      expect(active!.description).toBe('Ketu - Ketu - Ketu');
    });

    it('identifies active periods at arbitrary historical timestamp (e.g. native at age 30)', () => {
      // In 2020 (30 years after 1990), native is in Venus Mahadasha (1997 to 2017? Wait: Ketu 7y -> 1997. Venus 20y -> 2017. Sun 6y -> 2023).
      // So in 2020, native is in Sun Mahadasha!
      const date2020 = new Date('2020-06-15T12:00:00.000Z');
      const active = calculator.getActiveDasha(tree, date2020);

      expect(active).not.toBeNull();
      expect(active!.mahadasha.lord).toBe(PlanetSymbol.SUN);
      expect(active!.antardasha).toBeDefined();
      expect(active!.pratyantardasha).toBeDefined();
      expect(active!.description).toContain('Sun -');
    });

    it('handles exact Mahadasha transition boundary deterministically', () => {
      // Transition from Ketu to Venus:
      const ketuEndIso = tree.mahadashas[0].endDateIso;
      const transitionDate = new Date(ketuEndIso);

      // At exact transition point, the new period (Venus) is active
      const active = calculator.getActiveDasha(tree, transitionDate);
      expect(active).not.toBeNull();
      expect(active!.mahadasha.lord).toBe(PlanetSymbol.VENUS);
    });

    it('returns null for timestamp after the 120-year cycle horizon', () => {
      const dateAfter130Years = new Date('2130-01-01T00:00:00.000Z');
      const active = calculator.getActiveDasha(tree, dateAfter130Years);
      expect(active).toBeNull();
    });

    it('tags tree nodes with isActive: true when targetDate is provided in options', () => {
      const targetDate = new Date('2005-06-01T00:00:00.000Z');
      const treeWithTarget = calculator.calculateVimshottariDasha(0.0, birthDate, {
        maxLevel: 3,
        targetDate,
      });

      expect(treeWithTarget.activeDasha).toBeDefined();
      expect(treeWithTarget.activeDasha!.targetDateIso).toBe(targetDate.toISOString());

      // In 2005 (15 years after 1990), Ketu was 7y (ended 1997), Venus is 20y (ends 2017). Venus is active!
      const activeMaha = treeWithTarget.mahadashas.find((m) => m.isActive === true);
      expect(activeMaha).toBeDefined();
      expect(activeMaha!.lord).toBe(PlanetSymbol.VENUS);

      // Active Antardasha has isActive: true
      const activeAntar = activeMaha!.subPeriods!.find((a) => a.isActive === true);
      expect(activeAntar).toBeDefined();
      expect(activeAntar!.isActive).toBe(true);
    });
  });

  describe('Configurable Time Horizon (Requirement 7)', () => {
    it('supports generating beyond standard 120-year cycle when requested', () => {
      const birthDate = new Date('2000-01-01T00:00:00.000Z');
      const tree = calculator.calculateVimshottariDasha(0.0, birthDate, {
        timeHorizonYears: 180,
        maxLevel: 1,
      });

      // Standard cycle is 9 Mahadashas. For 180 years, more Mahadashas must be generated.
      expect(tree.mahadashas.length).toBeGreaterThan(9);

      const totalYears = tree.mahadashas.reduce((acc, m) => acc + m.durationYears, 0);
      expect(totalYears).toBeGreaterThanOrEqual(180);
    });
  });

  describe('Dasha Period Model Field Completeness (Requirement 11)', () => {
    it('verifies all required fields exist on DashaPeriod without undefined/empty values', () => {
      const birthDate = new Date('1992-07-20T11:45:00.000Z');
      const tree = calculator.calculateVimshottariDasha(100.0, birthDate, 3);

      for (const maha of tree.mahadashas) {
        expect(maha.level).toBe(1);
        expect(maha.lord).toBeDefined();
        expect(typeof maha.order).toBe('number');
        expect(maha.startDateIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(maha.endDateIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(maha.durationYears).toBeGreaterThan(0);
        expect(maha.nominalYears).toBeGreaterThan(0);
        expect(typeof maha.isBirthDasha).toBe('boolean');

        if (maha.subPeriods) {
          for (const antar of maha.subPeriods) {
            expect(antar.level).toBe(2);
            expect(antar.parentLord).toBe(maha.lord);
            expect(antar.startDateIso).toBeDefined();
            expect(antar.endDateIso).toBeDefined();
            expect(antar.durationYears).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});
