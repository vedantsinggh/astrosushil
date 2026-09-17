import { describe, it, expect } from 'vitest';
import {
  AshtottariCalculator,
  ASHTOTTARI_YEARS,
  ASHTOTTARI_ORDER,
  TOTAL_ASHTOTTARI_YEARS,
  MS_PER_YEAR,
} from '../../src/dasha/ashtottari-calculator';
import {
  ASHTOTTARI_SECTORS,
  getAshtottariSectorByLongitude,
} from '../../src/dasha/ashtottari-sectors';
import { evaluateAshtottariEligibility } from '../../src/dasha/ashtottari-eligibility';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { DashaPeriod } from '../../src/dasha/dasha.types';
import type { AstroChart } from '../../src/chart/astro-chart.types';

describe('AshtottariCalculator - Unit & Boundary Tests (Phase 2F)', () => {
  const calculator = new AshtottariCalculator();

  describe('Canonical Ashtottari Constants & Sequence', () => {
    it('1. verifies the 108-year cycle and planetary lord durations', () => {
      expect(TOTAL_ASHTOTTARI_YEARS).toBe(108);

      const canonicalLords = [
        PlanetSymbol.SUN,
        PlanetSymbol.MOON,
        PlanetSymbol.MARS,
        PlanetSymbol.MERCURY,
        PlanetSymbol.SATURN,
        PlanetSymbol.JUPITER,
        PlanetSymbol.RAHU,
        PlanetSymbol.VENUS,
      ];

      expect(ASHTOTTARI_ORDER).toEqual(canonicalLords);

      const totalYears = canonicalLords.reduce((sum, lord) => sum + ASHTOTTARI_YEARS[lord], 0);
      expect(totalYears).toBe(108);

      expect(ASHTOTTARI_YEARS[PlanetSymbol.SUN]).toBe(6);
      expect(ASHTOTTARI_YEARS[PlanetSymbol.MOON]).toBe(15);
      expect(ASHTOTTARI_YEARS[PlanetSymbol.MARS]).toBe(8);
      expect(ASHTOTTARI_YEARS[PlanetSymbol.MERCURY]).toBe(17);
      expect(ASHTOTTARI_YEARS[PlanetSymbol.SATURN]).toBe(10);
      expect(ASHTOTTARI_YEARS[PlanetSymbol.JUPITER]).toBe(19);
      expect(ASHTOTTARI_YEARS[PlanetSymbol.RAHU]).toBe(12);
      expect(ASHTOTTARI_YEARS[PlanetSymbol.VENUS]).toBe(21);

      // Ketu has no period in Ashtottari
      expect(ASHTOTTARI_YEARS[PlanetSymbol.KETU]).toBe(0);
    });
  });

  describe('28 Ashtottari Sectors & Abhijit Mapping', () => {
    it('2. verifies all 28 sectors map continuously across 360 degrees without gaps or overlaps', () => {
      expect(ASHTOTTARI_SECTORS).toHaveLength(28);

      // Check first sector starts at 0°
      expect(ASHTOTTARI_SECTORS[0].startDegree).toBe(0.0);
      // Check last sector ends at 360°
      expect(ASHTOTTARI_SECTORS[27].endDegree).toBe(360.0);

      let prevEnd = 0.0;
      for (let i = 0; i < ASHTOTTARI_SECTORS.length; i++) {
        const sector = ASHTOTTARI_SECTORS[i];
        expect(sector.index).toBe(i + 1);
        expect(sector.startDegree).toBeCloseTo(prevEnd, 8);
        expect(sector.endDegree).toBeGreaterThan(sector.startDegree);
        expect(sector.spanDegrees).toBeCloseTo(sector.endDegree - sector.startDegree, 8);
        prevEnd = sector.endDegree;
      }

      // Check Abhijit sector
      const abhijit = ASHTOTTARI_SECTORS.find((s) => s.name === 'Abhijit');
      expect(abhijit).toBeDefined();
      expect(abhijit!.lord).toBe(PlanetSymbol.SATURN);
      expect(abhijit!.startDegree).toBeCloseTo(276.666667, 4); // 276°40'
      expect(abhijit!.segmentYears).toBe(2.5); // 10 / 4
    });

    it('3. verifies starting lord and group order for representative Nakshatras', () => {
      // Ardra -> Sun (sector 6, order 1/4)
      const ardra = getAshtottariSectorByLongitude(68.0);
      expect(ardra.name).toBe('Ardra');
      expect(ardra.lord).toBe(PlanetSymbol.SUN);
      expect(ardra.orderInGroup).toBe(1);

      // Magha -> Moon (sector 10, order 1/3)
      const magha = getAshtottariSectorByLongitude(125.0);
      expect(magha.name).toBe('Magha');
      expect(magha.lord).toBe(PlanetSymbol.MOON);
      expect(magha.orderInGroup).toBe(1);

      // Hasta -> Mars (sector 13, order 1/4)
      const hasta = getAshtottariSectorByLongitude(165.0);
      expect(hasta.name).toBe('Hasta');
      expect(hasta.lord).toBe(PlanetSymbol.MARS);
      expect(hasta.orderInGroup).toBe(1);

      // Anuradha -> Mercury (sector 17, order 1/3)
      const anuradha = getAshtottariSectorByLongitude(220.0);
      expect(anuradha.name).toBe('Anuradha');
      expect(anuradha.lord).toBe(PlanetSymbol.MERCURY);
      expect(anuradha.orderInGroup).toBe(1);

      // Purva Ashadha -> Saturn (sector 20, order 1/4)
      const pa = getAshtottariSectorByLongitude(260.0);
      expect(pa.name).toBe('Purva Ashadha');
      expect(pa.lord).toBe(PlanetSymbol.SATURN);
      expect(pa.orderInGroup).toBe(1);

      // Abhijit -> Saturn (sector 22, order 3/4)
      const abhijit = getAshtottariSectorByLongitude(278.0);
      expect(abhijit.name).toBe('Abhijit');
      expect(abhijit.lord).toBe(PlanetSymbol.SATURN);
      expect(abhijit.orderInGroup).toBe(3);

      // Dhanishta -> Jupiter (sector 24, order 1/3)
      const dhanishta = getAshtottariSectorByLongitude(300.0);
      expect(dhanishta.name).toBe('Dhanishta');
      expect(dhanishta.lord).toBe(PlanetSymbol.JUPITER);
      expect(dhanishta.orderInGroup).toBe(1);

      // Uttara Bhadrapada -> Rahu (sector 27, order 1/4)
      const ub = getAshtottariSectorByLongitude(340.0);
      expect(ub.name).toBe('Uttara Bhadrapada');
      expect(ub.lord).toBe(PlanetSymbol.RAHU);
      expect(ub.orderInGroup).toBe(1);

      // Krittika -> Venus (sector 3, order 1/3)
      const krittika = getAshtottariSectorByLongitude(30.0);
      expect(krittika.name).toBe('Krittika');
      expect(krittika.lord).toBe(PlanetSymbol.VENUS);
      expect(krittika.orderInGroup).toBe(1);
    });
  });

  describe('Birth Balance & Continuous Position Calculations', () => {
    const birthDate = new Date('2000-01-01T00:00:00.000Z');

    it('4. calculates exact balance at start of 1st segment in a group (Ardra start)', () => {
      // Ardra starts at 66°40' (66.66666666666667°)
      const result = calculator.calculateAshtottariDasha(66.66666666666667, birthDate, 1);

      expect(result.birthLord).toBe(PlanetSymbol.SUN);
      expect(result.sectorName).toBe('Ardra');
      expect(result.elapsedAtBirthYears).toBeCloseTo(0.0, 5);
      expect(result.balanceAtBirthYears).toBeCloseTo(6.0, 5);
      expect(result.mahadashas[0].durationYears).toBeCloseTo(6.0, 5);
      expect(result.mahadashas[0].startDateIso).toBe(birthDate.toISOString());
    });

    it('5. calculates exact balance at 2nd segment in a group (Punarvasu start)', () => {
      // Punarvasu starts at 80°00'. It is segment 2 of Sun's 4 segments.
      // Segment 1 (Ardra, 1.5y) has fully elapsed!
      const result = calculator.calculateAshtottariDasha(80.0, birthDate, 1);

      expect(result.birthLord).toBe(PlanetSymbol.SUN);
      expect(result.sectorName).toBe('Punarvasu');
      expect(result.elapsedAtBirthYears).toBeCloseTo(1.5, 5);
      expect(result.balanceAtBirthYears).toBeCloseTo(4.5, 5);
      expect(result.elapsedAtBirthYears + result.balanceAtBirthYears).toBeCloseTo(6.0, 5);
    });

    it('6. calculates exact balance at 50% through a segment', () => {
      // Ardra spans 66.666667° to 80.0° (span 13.333333°).
      // Midpoint is 66.666667 + 6.666667 = 73.333333°
      const result = calculator.calculateAshtottariDasha(73.33333333333333, birthDate, 1);

      expect(result.birthLord).toBe(PlanetSymbol.SUN);
      // Segment 1 (1.5y) is 50% elapsed = 0.75y elapsed, 0.75y remaining in Ardra.
      // Plus segments 2, 3, 4 (3 * 1.5 = 4.5y remaining).
      // Total balance = 0.75 + 4.5 = 5.25 years!
      expect(result.elapsedAtBirthYears).toBeCloseTo(0.75, 4);
      expect(result.balanceAtBirthYears).toBeCloseTo(5.25, 4);
      expect(result.elapsedAtBirthYears + result.balanceAtBirthYears).toBeCloseTo(6.0, 5);
    });

    it('7. calculates exact balance inside Abhijit (Saturn segment 3 of 4)', () => {
      // Abhijit is from 276.666667° to 280.888889° (span 4.222222°).
      // Midpoint: 276.666667 + 2.111111 = 278.777778°
      const result = calculator.calculateAshtottariDasha(278.777778, birthDate, 1);

      expect(result.birthLord).toBe(PlanetSymbol.SATURN);
      expect(result.sectorName).toBe('Abhijit');
      // Purva Ashadha (2.5y) and UA (2.5y) already elapsed = 5.0y.
      // Abhijit is 50% elapsed = 1.25y. Total elapsed = 6.25y.
      // Remaining: 1.25y in Abhijit + 2.5y in Shravana = 3.75y.
      expect(result.elapsedAtBirthYears).toBeCloseTo(6.25, 3);
      expect(result.balanceAtBirthYears).toBeCloseTo(3.75, 3);
      expect(result.elapsedAtBirthYears + result.balanceAtBirthYears).toBeCloseTo(10.0, 5);
    });

    it('8. handles boundary normalization: 360° and negative degrees', () => {
      const result360 = calculator.calculateAshtottariDasha(360.0, birthDate, 1);
      expect(result360.sectorName).toBe('Ashwini');
      expect(result360.birthLord).toBe(PlanetSymbol.RAHU);

      const resultNeg = calculator.calculateAshtottariDasha(-10.0, birthDate, 1);
      // -10° normalizes to 350° (Revati)
      expect(resultNeg.sectorName).toBe('Revati');
      expect(resultNeg.birthLord).toBe(PlanetSymbol.RAHU);
    });
  });

  describe('Period Continuity Invariants (Step 5, 6, 7)', () => {
    function assertSubPeriodContinuity(parent: DashaPeriod, maxLevelAsserted: number) {
      if (!parent.subPeriods || parent.subPeriods.length === 0) {
        return;
      }

      const children = parent.subPeriods;

      // Invariant 1: First child starts exactly at parent's active start date
      expect(children[0].startDateIso).toBe(parent.startDateIso);

      // Invariant 2: Last child ends exactly at parent's active end date
      expect(children[children.length - 1].endDateIso).toBe(parent.endDateIso);

      // Invariant 3: Adjacent child periods are contiguous with zero gaps or overlaps
      for (let i = 0; i < children.length - 1; i++) {
        expect(children[i + 1].startDateIso).toBe(children[i].endDateIso);
      }

      // Invariant 4: Sum of child durationYears equals parent durationYears within precision
      const sumChildYears = children.reduce((acc, c) => acc + c.durationYears, 0);
      expect(sumChildYears).toBeCloseTo(parent.durationYears, 4);

      if (parent.level < maxLevelAsserted) {
        for (const child of children) {
          assertSubPeriodContinuity(child, maxLevelAsserted);
        }
      }
    }

    it('9. verifies complete Mahadasha timeline continuity across full 108-year cycle', () => {
      const birthDate = new Date('1990-05-15T10:30:00.000Z');
      const result = calculator.calculateAshtottariDasha(100.0, birthDate, 3);

      expect(result.dashaSystem).toBe('ASHTOTTARI');
      expect(result.totalCycleYears).toBe(108);
      expect(result.mahadashas).toHaveLength(8);

      // First Mahadasha starts at birth
      expect(result.mahadashas[0].startDateIso).toBe(birthDate.toISOString());
      expect(result.mahadashas[0].isBirthDasha).toBe(true);

      // Adjacent Mahadashas are strictly contiguous
      for (let i = 0; i < result.mahadashas.length - 1; i++) {
        expect(result.mahadashas[i + 1].startDateIso).toBe(result.mahadashas[i].endDateIso);
        expect(result.mahadashas[i + 1].isBirthDasha).toBe(false);
      }

      // Subperiod continuity down through Pratyantardasha (Level 3)
      for (const maha of result.mahadashas) {
        assertSubPeriodContinuity(maha, 3);
      }
    });

    it('10. verifies recursive continuity down to Level 5 (Sookshma & Prana)', () => {
      const birthDate = new Date('2005-02-14T10:00:00.000Z');
      const result = calculator.calculateAshtottariDasha(125.0, birthDate, 5);

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

  describe('Current Period Lookup (Step 8)', () => {
    const birthDate = new Date('1990-01-01T00:00:00.000Z');
    // Ardra start: Sun (6 years). Sun runs 1990 to 1996.
    // Moon (15 years) runs 1996 to 2011.
    // Mars (8 years) runs 2011 to 2019.
    // Mercury (17 years) runs 2019 to 2036.
    const tree = calculator.calculateAshtottariDasha(66.66666666666667, birthDate, { maxLevel: 3 });

    it('11. returns null for timestamp prior to birth', () => {
      const preBirth = new Date('1989-12-31T23:59:59.000Z');
      const active = calculator.getActiveDasha(tree, preBirth);
      expect(active).toBeNull();
    });

    it('12. returns active birth Dasha hierarchy at exact birth instant', () => {
      const active = calculator.getActiveDasha(tree, birthDate);
      expect(active).not.toBeNull();
      expect(active!.mahadasha.lord).toBe(PlanetSymbol.SUN);
      expect(active!.antardasha!.lord).toBe(PlanetSymbol.SUN);
      expect(active!.pratyantardasha!.lord).toBe(PlanetSymbol.SUN);
      expect(active!.path).toEqual([PlanetSymbol.SUN, PlanetSymbol.SUN, PlanetSymbol.SUN]);
      expect(active!.description).toBe('Sun - Sun - Sun');
    });

    it('13. identifies active period at arbitrary historical date (native at age 32 in 2022)', () => {
      // In 2022, native is 32. Sun (6y -> 1996) + Moon (15y -> 2011) + Mars (8y -> 2019).
      // 2022 is within Mercury (2019 to 2036).
      const date2022 = new Date('2022-06-15T12:00:00.000Z');
      const active = calculator.getActiveDasha(tree, date2022);

      expect(active).not.toBeNull();
      expect(active!.mahadasha.lord).toBe(PlanetSymbol.MERCURY);
      expect(active!.antardasha).toBeDefined();
      expect(active!.pratyantardasha).toBeDefined();
      expect(active!.description).toContain('Mercury -');
    });

    it('14. handles exact Mahadasha transition boundary deterministically', () => {
      const sunEndIso = tree.mahadashas[0].endDateIso;
      const transitionDate = new Date(sunEndIso);

      const active = calculator.getActiveDasha(tree, transitionDate);
      expect(active).not.toBeNull();
      expect(active!.mahadasha.lord).toBe(PlanetSymbol.MOON);
    });

    it('15. returns null for timestamp after the 108-year cycle horizon', () => {
      const dateAfter120Years = new Date('2120-01-01T00:00:00.000Z');
      const active = calculator.getActiveDasha(tree, dateAfter120Years);
      expect(active).toBeNull();
    });
  });

  describe('Parashari Eligibility Engine (Step 3)', () => {
    it('16. correctly evaluates eligibility for a mock chart where Rahu is in Kendra from Lagna Lord and night/shukla', () => {
      // Lagna: Aries (1) -> Lagna Lord: Mars
      // Mars in Aries (1). Rahu in Cancer (4) -> House 4 from Mars (Kendra!).
      // Rahu in house 4 from Lagna (not in Lagna!).
      // Sun in Pisces (12) -> Night birth (house 12 is below or above horizon? In our formula, houses 7-12 are Day).
      // Let's set Sun in Taurus (2) -> house 2 from Lagna (Night birth).
      // Moon in Gemini (3) -> Moon - Sun = 30° (0° to 180° = Shukla Paksha).
      // Night birth in Shukla Paksha -> meetsPakshaCondition = true!
      const mockChart: AstroChart = {
        metadata: {
          engineVersion: '0.1.0',
          calculationTimestampIso: new Date().toISOString(),
          providerName: 'test',
          providerVersion: '1.0',
          config: {} as any,
          normalizedTime: { utcIsoString: '1995-05-15T21:00:00.000Z' } as any,
        },
        birthDetails: {} as any,
        ascendant: {
          name: 'Ascendant',
          longitude: 15.0, // Aries (1)
          rashiIndex: 1,
          degreeInRashi: 15.0,
          nakshatraIndex: 2,
          pada: 1,
          nakshatraLord: PlanetSymbol.VENUS,
        },
        planets: {
          [PlanetSymbol.SUN]: { longitude: 45.0, rashiIndex: 2 } as any,     // Taurus (house 2: Night)
          [PlanetSymbol.MOON]: { longitude: 75.0, rashiIndex: 3 } as any,    // Gemini (Shukla Paksha)
          [PlanetSymbol.MARS]: { longitude: 10.0, rashiIndex: 1 } as any,    // Aries (Lagna Lord)
          [PlanetSymbol.RAHU]: { longitude: 100.0, rashiIndex: 4 } as any,   // Cancer (house 4 from Mars: Kendra)
          [PlanetSymbol.MERCURY]: { longitude: 50.0, rashiIndex: 2 } as any,
          [PlanetSymbol.JUPITER]: { longitude: 240.0, rashiIndex: 9 } as any,
          [PlanetSymbol.VENUS]: { longitude: 35.0, rashiIndex: 2 } as any,
          [PlanetSymbol.SATURN]: { longitude: 320.0, rashiIndex: 11 } as any,
          [PlanetSymbol.KETU]: { longitude: 280.0, rashiIndex: 10 } as any,
          [PlanetSymbol.URANUS]: {} as any,
          [PlanetSymbol.NEPTUNE]: {} as any,
          [PlanetSymbol.PLUTO]: {} as any,
        },
      };

      const eligibility = evaluateAshtottariEligibility(mockChart);
      expect(eligibility.lagnaLord).toBe(PlanetSymbol.MARS);
      expect(eligibility.rahuHouseFromLagna).toBe(4);
      expect(eligibility.rahuHouseFromLagnaLord).toBe(4);
      expect(eligibility.isRahuInKendraOrTrikonaFromLagnaLord).toBe(true);
      expect(eligibility.isRahuInLagna).toBe(false);
      expect(eligibility.meetsRahuCondition).toBe(true);
      expect(eligibility.paksha).toBe('SHUKLA');
      expect(eligibility.birthTimeOfDay).toBe('NIGHT');
      expect(eligibility.meetsPakshaCondition).toBe(true);
      expect(eligibility.isEligible).toBe(true);
      expect(eligibility.reason).toContain('fully satisfies classical Parashari Ashtottari eligibility');
    });

    it('17. disqualifies chart when Rahu is placed directly in the Lagna', () => {
      const mockChartWithRahuInLagna: AstroChart = {
        metadata: {
          engineVersion: '0.1.0',
          calculationTimestampIso: new Date().toISOString(),
          providerName: 'test',
          providerVersion: '1.0',
          config: {} as any,
          normalizedTime: { utcIsoString: '1995-05-15T21:00:00.000Z' } as any,
        },
        birthDetails: {} as any,
        ascendant: {
          name: 'Ascendant',
          longitude: 15.0, // Aries
          rashiIndex: 1,
          degreeInRashi: 15.0,
          nakshatraIndex: 2,
          pada: 1,
          nakshatraLord: PlanetSymbol.VENUS,
        },
        planets: {
          [PlanetSymbol.SUN]: { longitude: 45.0, rashiIndex: 2 } as any,
          [PlanetSymbol.MOON]: { longitude: 75.0, rashiIndex: 3 } as any,
          [PlanetSymbol.MARS]: { longitude: 10.0, rashiIndex: 1 } as any,
          [PlanetSymbol.RAHU]: { longitude: 18.0, rashiIndex: 1 } as any, // In Lagna!
          [PlanetSymbol.MERCURY]: { longitude: 50.0, rashiIndex: 2 } as any,
          [PlanetSymbol.JUPITER]: { longitude: 240.0, rashiIndex: 9 } as any,
          [PlanetSymbol.VENUS]: { longitude: 35.0, rashiIndex: 2 } as any,
          [PlanetSymbol.SATURN]: { longitude: 320.0, rashiIndex: 11 } as any,
          [PlanetSymbol.KETU]: { longitude: 198.0, rashiIndex: 7 } as any,
          [PlanetSymbol.URANUS]: {} as any,
          [PlanetSymbol.NEPTUNE]: {} as any,
          [PlanetSymbol.PLUTO]: {} as any,
        },
      };

      const eligibility = evaluateAshtottariEligibility(mockChartWithRahuInLagna);
      expect(eligibility.isRahuInLagna).toBe(true);
      expect(eligibility.meetsRahuCondition).toBe(false);
      expect(eligibility.isEligible).toBe(false);
      expect(eligibility.reason).toContain('disqualifying');
    });
  });

  describe('Determinism & Repeatability (Step 12)', () => {
    it('18. produces identical outputs across repeated runs with same inputs', () => {
      const birthDate = new Date('1988-10-24T05:45:00.000Z');
      const run1 = calculator.calculateAshtottariDasha(145.5, birthDate, 3);
      const run2 = calculator.calculateAshtottariDasha(145.5, birthDate, 3);

      expect(JSON.stringify(run1)).toBe(JSON.stringify(run2));
    });
  });

  describe('Sector Boundary Transitions & Continuous Positioning (Step 4 & 12)', () => {
    const birthDate = new Date('2000-01-01T00:00:00.000Z');

    it('19. tests exact transition boundaries across all 8 lord sector transitions', () => {
      const transitions = [
        // Boundary between Rahu (Bharani) and Venus (Krittika) at 26°40' (26.666667°)
        { degreeBefore: 26.666, lordBefore: PlanetSymbol.RAHU, degreeAfter: 26.667, lordAfter: PlanetSymbol.VENUS },
        // Boundary between Venus (Mrigashira) and Sun (Ardra) at 66°40' (66.666667°)
        { degreeBefore: 66.666, lordBefore: PlanetSymbol.VENUS, degreeAfter: 66.667, lordAfter: PlanetSymbol.SUN },
        // Boundary between Sun (Ashlesha) and Moon (Magha) at 120°00' (120.0°)
        { degreeBefore: 119.999, lordBefore: PlanetSymbol.SUN, degreeAfter: 120.001, lordAfter: PlanetSymbol.MOON },
        // Boundary between Moon (Uttara Phalguni) and Mars (Hasta) at 160°00' (160.0°)
        { degreeBefore: 159.999, lordBefore: PlanetSymbol.MOON, degreeAfter: 160.001, lordAfter: PlanetSymbol.MARS },
        // Boundary between Mars (Vishakha) and Mercury (Anuradha) at 213°20' (213.333333°)
        { degreeBefore: 213.332, lordBefore: PlanetSymbol.MARS, degreeAfter: 213.334, lordAfter: PlanetSymbol.MERCURY },
        // Boundary between Mercury (Mula) and Saturn (Purva Ashadha) at 253°20' (253.333333°)
        { degreeBefore: 253.332, lordBefore: PlanetSymbol.MERCURY, degreeAfter: 253.334, lordAfter: PlanetSymbol.SATURN },
        // Boundary between Saturn (Shravana) and Jupiter (Dhanishta) at 293°20' (293.333333°)
        { degreeBefore: 293.332, lordBefore: PlanetSymbol.SATURN, degreeAfter: 293.334, lordAfter: PlanetSymbol.JUPITER },
        // Boundary between Jupiter (Purva Bhadrapada) and Rahu (Uttara Bhadrapada) at 333°20' (333.333333°)
        { degreeBefore: 333.332, lordBefore: PlanetSymbol.JUPITER, degreeAfter: 333.334, lordAfter: PlanetSymbol.RAHU },
      ];

      for (const t of transitions) {
        const sectorBefore = getAshtottariSectorByLongitude(t.degreeBefore);
        expect(sectorBefore.lord, `expected ${t.lordBefore} before ${t.degreeBefore}`).toBe(t.lordBefore);

        const sectorAfter = getAshtottariSectorByLongitude(t.degreeAfter);
        expect(sectorAfter.lord, `expected ${t.lordAfter} after ${t.degreeAfter}`).toBe(t.lordAfter);
      }
    });

    it('20. verifies exact micro-epsilon behavior across 0° / 360° Aries boundary', () => {
      const atZero = getAshtottariSectorByLongitude(0.0);
      expect(atZero.name).toBe('Ashwini');
      expect(atZero.lord).toBe(PlanetSymbol.RAHU);
      expect(atZero.orderInGroup).toBe(3);

      const nearZero = getAshtottariSectorByLongitude(0.000001);
      expect(nearZero.name).toBe('Ashwini');

      const near360 = getAshtottariSectorByLongitude(359.999999);
      expect(near360.name).toBe('Revati');
      expect(near360.lord).toBe(PlanetSymbol.RAHU);
      expect(near360.orderInGroup).toBe(2);
    });
  });

  describe('calculateForChart & Integration (Step 4 & 5)', () => {
    it('21. calculates Ashtottari Dasha directly from an AstroChart instance with automatic eligibility', () => {
      const chart: AstroChart = {
        metadata: {
          engineVersion: '0.1.0',
          calculationTimestampIso: new Date().toISOString(),
          providerName: 'mock',
          providerVersion: '1.0',
          config: {} as any,
          normalizedTime: { utcIsoString: '1992-10-10T12:00:00.000Z' } as any,
        },
        birthDetails: {} as any,
        ascendant: {
          name: 'Ascendant',
          longitude: 0.0,
          rashiIndex: 1,
          degreeInRashi: 0.0,
          nakshatraIndex: 1,
          pada: 1,
          nakshatraLord: PlanetSymbol.KETU,
        },
        planets: {
          [PlanetSymbol.SUN]: { longitude: 175.0, rashiIndex: 6 } as any,
          [PlanetSymbol.MOON]: { longitude: 68.5, rashiIndex: 3 } as any, // Ardra (Sun lord)
          [PlanetSymbol.MARS]: { longitude: 90.0, rashiIndex: 4 } as any,
          [PlanetSymbol.MERCURY]: { longitude: 180.0, rashiIndex: 6 } as any,
          [PlanetSymbol.JUPITER]: { longitude: 150.0, rashiIndex: 5 } as any,
          [PlanetSymbol.VENUS]: { longitude: 200.0, rashiIndex: 7 } as any,
          [PlanetSymbol.SATURN]: { longitude: 300.0, rashiIndex: 10 } as any,
          [PlanetSymbol.RAHU]: { longitude: 260.0, rashiIndex: 9 } as any,
          [PlanetSymbol.KETU]: { longitude: 80.0, rashiIndex: 3 } as any,
          [PlanetSymbol.URANUS]: {} as any,
          [PlanetSymbol.NEPTUNE]: {} as any,
          [PlanetSymbol.PLUTO]: {} as any,
        },
      };

      const tree = calculator.calculateForChart(chart, { maxLevel: 2 });
      expect(tree.dashaSystem).toBe('ASHTOTTARI');
      expect(tree.birthLord).toBe(PlanetSymbol.SUN);
      expect(tree.sectorName).toBe('Ardra');
      expect(tree.eligibility).toBeDefined();
      expect(tree.mahadashas).toHaveLength(8);
    });

    it('22. throws informative error when Moon is missing from chart', () => {
      const chartWithoutMoon = {
        metadata: { normalizedTime: { utcIsoString: '2000-01-01T00:00:00.000Z' } },
        planets: {},
      } as any;

      expect(() => calculator.calculateForChart(chartWithoutMoon)).toThrow('Moon planet is missing from AstroChart');
    });
  });

  describe('Multi-Cycle & Time Horizon Options (Step 5)', () => {
    const birthDate = new Date('1990-01-01T00:00:00.000Z');

    it('23. supports cycleCount > 1 to wrap around the 108-year cycle', () => {
      const tree = calculator.calculateAshtottariDasha(100.0, birthDate, {
        cycleCount: 2,
        maxLevel: 1,
      });

      // 2 complete cycles of 8 lords = 16 Mahadashas
      expect(tree.mahadashas).toHaveLength(16);

      // Verify sequence wraps around
      for (let i = 0; i < 16; i++) {
        const expectedLord = tree.mahadashas[i % 8].lord;
        expect(tree.mahadashas[i].lord).toBe(expectedLord);
        expect(tree.mahadashas[i].order).toBe(i + 1);
      }
    });

    it('24. generates periods up to requested timeHorizonYears', () => {
      const tree = calculator.calculateAshtottariDasha(100.0, birthDate, {
        timeHorizonYears: 150,
        maxLevel: 1,
      });

      // 108 years is 8 Mahadashas. 150 years will generate at least 11-12 Mahadashas.
      expect(tree.mahadashas.length).toBeGreaterThan(8);

      const totalSpanMs =
        new Date(tree.mahadashas[tree.mahadashas.length - 1].endDateIso).getTime() -
        new Date(tree.mahadashas[0].startDateIso).getTime();
      const totalSpanYears = totalSpanMs / MS_PER_YEAR;
      expect(totalSpanYears).toBeGreaterThanOrEqual(150);
    });
  });
});
