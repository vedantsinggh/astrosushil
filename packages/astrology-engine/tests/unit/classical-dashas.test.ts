import { describe, it, expect } from 'vitest';
import { PlanetSymbol } from '../../src/planets/planet.types';
import { AstroChart } from '../../src/chart/astro-chart.types';
import {
  SthiraDashaCalculator,
  STHIRA_RASHI_YEARS,
  TOTAL_STHIRA_YEARS,
  ShoolaDashaCalculator,
  SHOOLA_SIGN_YEARS,
  TOTAL_SHOOLA_YEARS,
  DwisaptatiSamaCalculator,
  DWISAPTATI_SAMA_ORDER,
  DWISAPTATI_SAMA_YEARS,
  TOTAL_DWISAPTATI_SAMA_YEARS,
  ShatabdikaCalculator,
  SHATABDIKA_ORDER,
  SHATABDIKA_YEARS,
  TOTAL_SHATABDIKA_YEARS,
  ChaturaseetiSamaCalculator,
  CHATURASEETI_SAMA_ORDER,
  CHATURASEETI_SAMA_YEARS,
  TOTAL_CHATURASEETI_SAMA_YEARS,
  DwadashottariCalculator,
  DWADASHOTTARI_ORDER,
  DWADASHOTTARI_YEARS,
  TOTAL_DWADASHOTTARI_YEARS,
  PanchottariCalculator,
  PANCHOTTARI_ORDER,
  PANCHOTTARI_YEARS,
  TOTAL_PANCHOTTARI_YEARS,
  DashaRegistry,
} from '../../src/dasha/index';

describe('Phase 2R: Classical Dasha Systems Test Suite', () => {
  const birthDate = new Date('1990-05-15T14:30:00.000Z');

  // Helper chart builder
  const buildMockChart = (overrides?: Partial<AstroChart>): AstroChart => {
    return {
      metadata: {
        engineVersion: '0.1.0',
        calculationTimestampIso: new Date().toISOString(),
        providerName: 'TestProvider',
        providerVersion: '1.0.0',
        config: {
          zodiacType: 'SIDEREAL',
          ayanamsa: 'LAHIRI',
          houseSystem: 'WHOLE_SIGN',
          nodeCalculation: 'TRUE_NODE',
          planetaryCalculationMode: 'GEOCENTRIC',
          precisionDegrees: 0.0001,
          roundingRule: 'NEAREST',
          dashaSystem: 'VIMSHOTTARI',
        },
        normalizedTime: {
          utcIsoString: birthDate.toISOString(),
          julianDayUT: 2448027.104167,
          timezoneOffsetMinutes: 330,
        },
      },
      birthDetails: {
        date: { year: 1990, month: 5, day: 15 },
        time: { hour: 14, minute: 30, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.6139,
        longitude: 77.209,
      },
      ascendant: {
        longitude: 145.5, // Leo 25°30' (Rashi 5)
        rashiIndex: 5,
        speedLongitude: 0,
      },
      planets: {
        [PlanetSymbol.SUN]: { longitude: 30.5, speedLongitude: 0.98, isRetrograde: false, rashiIndex: 2 } as any, // Taurus
        [PlanetSymbol.MOON]: { longitude: 282.5, speedLongitude: 13.2, isRetrograde: false, rashiIndex: 10 } as any, // Shravana (Capricorn)
        [PlanetSymbol.MARS]: { longitude: 315.0, speedLongitude: 0.7, isRetrograde: false, rashiIndex: 11 } as any, // Aquarius
        [PlanetSymbol.MERCURY]: { longitude: 15.0, speedLongitude: 1.1, isRetrograde: false, rashiIndex: 1 } as any, // Aries
        [PlanetSymbol.JUPITER]: { longitude: 72.0, speedLongitude: 0.1, isRetrograde: false, rashiIndex: 3 } as any, // Gemini
        [PlanetSymbol.VENUS]: { longitude: 350.0, speedLongitude: 1.2, isRetrograde: false, rashiIndex: 12 } as any, // Pisces
        [PlanetSymbol.SATURN]: { longitude: 265.0, speedLongitude: -0.05, isRetrograde: true, rashiIndex: 9 } as any, // Sagittarius
        [PlanetSymbol.RAHU]: { longitude: 290.0, speedLongitude: -0.05, isRetrograde: true, rashiIndex: 10 } as any, // Capricorn
        [PlanetSymbol.KETU]: { longitude: 110.0, speedLongitude: -0.05, isRetrograde: true, rashiIndex: 4 } as any, // Cancer
        [PlanetSymbol.URANUS]: { longitude: 0, speedLongitude: 0, isRetrograde: false, rashiIndex: 1 } as any,
        [PlanetSymbol.NEPTUNE]: { longitude: 0, speedLongitude: 0, isRetrograde: false, rashiIndex: 1 } as any,
        [PlanetSymbol.PLUTO]: { longitude: 0, speedLongitude: 0, isRetrograde: false, rashiIndex: 1 } as any,
      },
      ...overrides,
    };
  };

  // ==========================================================================
  // 1. STHIRA DASHA (96-Year Rashi Dasha)
  // ==========================================================================
  describe('1. Sthira Dasha (Jaimini 96-Year Rashi System)', () => {
    const calculator = new SthiraDashaCalculator();

    it('validates 96-year canonical duration sum and sign durations', () => {
      expect(TOTAL_STHIRA_YEARS).toBe(96);
      expect(STHIRA_RASHI_YEARS[1]).toBe(7);  // Movable (Aries)
      expect(STHIRA_RASHI_YEARS[2]).toBe(8);  // Fixed (Taurus)
      expect(STHIRA_RASHI_YEARS[3]).toBe(9);  // Dual (Gemini)
      expect(STHIRA_RASHI_YEARS[4]).toBe(7);  // Movable (Cancer)
      expect(STHIRA_RASHI_YEARS[5]).toBe(8);  // Fixed (Leo)
      expect(STHIRA_RASHI_YEARS[6]).toBe(9);  // Dual (Virgo)
      expect(STHIRA_RASHI_YEARS[7]).toBe(7);  // Movable (Libra)
      expect(STHIRA_RASHI_YEARS[8]).toBe(8);  // Fixed (Scorpio)
      expect(STHIRA_RASHI_YEARS[9]).toBe(9);  // Dual (Sagittarius)
      expect(STHIRA_RASHI_YEARS[10]).toBe(7); // Movable (Capricorn)
      expect(STHIRA_RASHI_YEARS[11]).toBe(8); // Fixed (Aquarius)
      expect(STHIRA_RASHI_YEARS[12]).toBe(9); // Dual (Pisces)

      let total = 0;
      for (let r = 1; r <= 12; r++) total += STHIRA_RASHI_YEARS[r];
      expect(total).toBe(96);
    });

    it('calculates Sthira Dasha starting from Lagna sign with direct progression', () => {
      // Lagna at 15° Aries (15.0) -> Aries (1)
      const tree = calculator.calculateSthiraDasha(15.0, birthDate, { maxLevel: 2 });
      expect(tree.dashaSystem).toBe('STHIRA');
      expect(tree.startingRashiIndex).toBe(1);
      expect(tree.startingRashiName).toBe('Aries');
      expect(tree.totalCycleYears).toBe(96);
      expect(tree.balanceAtBirthYears).toBeCloseTo(3.5, 4); // (15/30)*7 = 3.5 balance
      expect(tree.elapsedAtBirthYears).toBeCloseTo(3.5, 4);

      expect(tree.mahadashas).toHaveLength(12);
      expect(tree.mahadashas[0].signName).toBe('Aries');
      expect(tree.mahadashas[0].durationYears).toBeCloseTo(3.5, 4);
      expect(tree.mahadashas[1].signName).toBe('Taurus');
      expect(tree.mahadashas[1].durationYears).toBeCloseTo(8.0, 4);
      expect(tree.mahadashas[2].signName).toBe('Gemini');
      expect(tree.mahadashas[2].durationYears).toBeCloseTo(9.0, 4);
    });

    it('verifies sub-period continuity and active period lookup', () => {
      const tree = calculator.calculateSthiraDasha(145.5, birthDate, {
        maxLevel: 2,
        targetDate: '1995-05-15T00:00:00.000Z',
      });
      expect(tree.activeDasha).toBeDefined();
      expect(tree.activeDasha?.mahadasha).toBeDefined();
      expect(tree.activeDasha?.path.length).toBeGreaterThanOrEqual(1);

      // Verify no gaps in sub-periods
      const firstMaha = tree.mahadashas[1]; // full period
      expect(firstMaha.subPeriods).toHaveLength(12);
      for (let i = 0; i < 11; i++) {
        expect(firstMaha.subPeriods![i].endDateIso).toBe(firstMaha.subPeriods![i + 1].startDateIso);
      }
    });
  });

  // ==========================================================================
  // 2. SHOOLA DASHA (108-Year Rashi Dasha)
  // ==========================================================================
  describe('2. Shoola Dasha (Jaimini 108-Year Rashi System)', () => {
    const calculator = new ShoolaDashaCalculator();

    it('validates 108-year duration with 9 years per sign', () => {
      expect(SHOOLA_SIGN_YEARS).toBe(9);
      expect(TOTAL_SHOOLA_YEARS).toBe(108);
    });

    it('evaluates direct progression for Odd starting sign and reverse for Even starting sign', () => {
      // Odd sign: 0° Aries -> Direct
      const oddTree = calculator.calculateShoolaDasha(0.0, birthDate, 1, { maxLevel: 2 });
      expect(oddTree.direction).toBe('DIRECT');
      expect(oddTree.mahadashas[0].signName).toBe('Aries');
      expect(oddTree.mahadashas[1].signName).toBe('Taurus');
      expect(oddTree.mahadashas[2].signName).toBe('Gemini');

      // Even sign: 30° Taurus -> Reverse
      const evenTree = calculator.calculateShoolaDasha(30.0, birthDate, 1, { maxLevel: 2 });
      expect(evenTree.direction).toBe('REVERSE');
      expect(evenTree.mahadashas[0].signName).toBe('Taurus');
      expect(evenTree.mahadashas[1].signName).toBe('Aries');
      expect(evenTree.mahadashas[2].signName).toBe('Pisces');
    });

    it('determines stronger starting house between 1st and 7th', () => {
      const chart = buildMockChart();
      const stronger = calculator.determineStrongerStartingHouse(chart);
      expect([1, 7]).toContain(stronger);

      const tree = calculator.calculateForChart(chart);
      expect(tree.dashaSystem).toBe('SHOOLA');
      expect(tree.mahadashas).toHaveLength(12);
    });
  });

  // ==========================================================================
  // 3. DWISAPTATI SAMA DASHA (72-Year Nakshatra Dasha)
  // ==========================================================================
  describe('3. Dwisaptati Sama Dasha (Parashari 72-Year System)', () => {
    const calculator = new DwisaptatiSamaCalculator();

    it('validates 72-year cycle (9 planets × 8 years)', () => {
      expect(TOTAL_DWISAPTATI_SAMA_YEARS).toBe(72);
      expect(DWISAPTATI_SAMA_YEARS).toBe(8);
      expect(DWISAPTATI_SAMA_ORDER).toHaveLength(9);
    });

    it('calculates correct starting lord from Moola (Nakshatra 19)', () => {
      // Moon in Moola (0° Sagittarius = 240.0°) -> Sun
      const treeMoola = calculator.calculateDwisaptatiSamaDasha(240.0, birthDate);
      expect(treeMoola.birthLord).toBe(PlanetSymbol.SUN);
      expect(treeMoola.moonNakshatraName).toBe('Mula');

      // Moon in Purva Ashadha (254.0°) -> Moon
      const treePA = calculator.calculateDwisaptatiSamaDasha(254.0, birthDate);
      expect(treePA.birthLord).toBe(PlanetSymbol.MOON);
    });

    it('evaluates eligibility: Lagna lord in 7th or 7th lord in Lagna', () => {
      // Chart 1: Lagna Leo (5, Lord Sun in Taurus [10th house]) -> not eligible
      const chart1 = buildMockChart();
      const tree1 = calculator.calculateForChart(chart1);
      expect(tree1.eligibility?.isEligible).toBe(false);

      // Chart 2: Lagna Aries (1, Lord Mars placed in 7th house Libra [185°]) -> eligible!
      const chart2 = buildMockChart({
        ascendant: { longitude: 10.0, rashiIndex: 1, speedLongitude: 0 },
        planets: {
          ...buildMockChart().planets,
          [PlanetSymbol.MARS]: { longitude: 185.0, rashiIndex: 7, isRetrograde: false, speedLongitude: 1.0 } as any,
        },
      });
      const tree2 = calculator.calculateForChart(chart2);
      expect(tree2.eligibility?.isEligible).toBe(true);
    });
  });

  // ==========================================================================
  // 4. SHATABDIKA DASHA (100-Year Nakshatra Dasha)
  // ==========================================================================
  describe('4. Shatabdika Dasha (Parashari 100-Year System)', () => {
    const calculator = new ShatabdikaCalculator();

    it('validates 100-year cycle and planetary sequence', () => {
      expect(TOTAL_SHATABDIKA_YEARS).toBe(100);
      expect(SHATABDIKA_ORDER).toHaveLength(7);
      const total = SHATABDIKA_ORDER.reduce((s, p) => s + SHATABDIKA_YEARS[p], 0);
      expect(total).toBe(100);
    });

    it('maps Nakshatra groups from Revati correctly', () => {
      // Revati (350°) -> Sun (5y group)
      const treeRevati = calculator.calculateShatabdikaDasha(350.0, birthDate);
      expect(treeRevati.birthLord).toBe(PlanetSymbol.SUN);

      // Krittika (30°) -> Moon (5y group)
      const treeKrittika = calculator.calculateShatabdikaDasha(30.0, birthDate);
      expect(treeKrittika.birthLord).toBe(PlanetSymbol.MOON);

      // Ardra (70°) -> Venus (10y group)
      const treeArdra = calculator.calculateShatabdikaDasha(70.0, birthDate);
      expect(treeArdra.birthLord).toBe(PlanetSymbol.VENUS);
    });

    it('evaluates eligibility: Lagna is Vargottama', () => {
      // Lagna at 145.5° (Leo 25°30' -> 8th Navamsha of Leo = Pisces [12] vs Leo [5]) -> not Vargottama
      const chart1 = buildMockChart();
      const tree1 = calculator.calculateForChart(chart1);
      expect(tree1.eligibility?.isEligible).toBe(false);

      // Lagna at 1.5° Aries (Movable sign 1st Navamsha = Aries [1]) -> Vargottama!
      const chart2 = buildMockChart({
        ascendant: { longitude: 1.5, rashiIndex: 1, speedLongitude: 0 },
      });
      const tree2 = calculator.calculateForChart(chart2);
      expect(tree2.eligibility?.isEligible).toBe(true);
    });
  });

  // ==========================================================================
  // 5. CHATURASEETI SAMA DASHA (84-Year Nakshatra Dasha)
  // ==========================================================================
  describe('5. Chaturaseeti Sama Dasha (Parashari 84-Year System)', () => {
    const calculator = new ChaturaseetiSamaCalculator();

    it('validates 84-year cycle (7 planets × 12 years)', () => {
      expect(TOTAL_CHATURASEETI_SAMA_YEARS).toBe(84);
      expect(CHATURASEETI_SAMA_YEARS).toBe(12);
      expect(CHATURASEETI_SAMA_ORDER).toHaveLength(7);
    });

    it('maps Janma Nakshatra from Ardra (Nakshatra 6)', () => {
      // Ardra (Nakshatra 6, 70°) -> Sun
      const treeArdra = calculator.calculateChaturaseetiSamaDasha(70.0, birthDate);
      expect(treeArdra.birthLord).toBe(PlanetSymbol.SUN);

      // Punarvasu (Nakshatra 7, 85°) -> Moon
      const treePunar = calculator.calculateChaturaseetiSamaDasha(85.0, birthDate);
      expect(treePunar.birthLord).toBe(PlanetSymbol.MOON);
    });

    it('evaluates eligibility: 10th lord is in the 10th house', () => {
      // Lagna Leo (5) -> 10th house is Taurus (2, lord Venus). Venus at 350° Pisces (8th house) -> not in 10th
      const chart1 = buildMockChart();
      const tree1 = calculator.calculateForChart(chart1);
      expect(tree1.eligibility?.isEligible).toBe(false);

      // Place Venus at 45.0° Taurus (10th house) -> eligible!
      const chart2 = buildMockChart({
        planets: {
          ...buildMockChart().planets,
          [PlanetSymbol.VENUS]: { longitude: 45.0, rashiIndex: 2, isRetrograde: false, speedLongitude: 1.0 } as any,
        },
      });
      const tree2 = calculator.calculateForChart(chart2);
      expect(tree2.eligibility?.isEligible).toBe(true);
    });
  });

  // ==========================================================================
  // 6. DWADASHOTTARI DASHA (112-Year Nakshatra Dasha)
  // ==========================================================================
  describe('6. Dwadashottari Dasha (Parashari 112-Year System)', () => {
    const calculator = new DwadashottariCalculator();

    it('validates 112-year cycle and planetary sequence', () => {
      expect(TOTAL_DWADASHOTTARI_YEARS).toBe(112);
      expect(DWADASHOTTARI_ORDER).toHaveLength(8);
      const total = DWADASHOTTARI_ORDER.reduce((s, p) => s + DWADASHOTTARI_YEARS[p], 0);
      expect(total).toBe(112);
    });

    it('maps Janma Nakshatra from Pushya (Nakshatra 8)', () => {
      // Pushya (Nakshatra 8, 100°) -> Sun (7y)
      const treePushya = calculator.calculateDwadashottariDasha(100.0, birthDate);
      expect(treePushya.birthLord).toBe(PlanetSymbol.SUN);

      // Ashlesha (Nakshatra 9, 110°) -> Jupiter (9y)
      const treeAshlesha = calculator.calculateDwadashottariDasha(110.0, birthDate);
      expect(treeAshlesha.birthLord).toBe(PlanetSymbol.JUPITER);
    });

    it('evaluates eligibility: Lagna is in Venus Navamsha (Taurus or Libra)', () => {
      // Lagna at 145.5° (Pisces Navamsha) -> false
      const chart1 = buildMockChart();
      const tree1 = calculator.calculateForChart(chart1);
      expect(tree1.eligibility?.isEligible).toBe(false);

      // Lagna at 3.5° Taurus (Earth sign 2nd Navamsha = Aquarius [11]), at 13.5° Taurus (5th = Taurus [2] Navamsha!) -> true!
      const chart2 = buildMockChart({
        ascendant: { longitude: 43.5, rashiIndex: 2, speedLongitude: 0 },
      });
      const tree2 = calculator.calculateForChart(chart2);
      expect(tree2.eligibility?.isEligible).toBe(true);
    });
  });

  // ==========================================================================
  // 7. PANCHOTTARI DASHA (105-Year Nakshatra Dasha)
  // ==========================================================================
  describe('7. Panchottari Dasha (Parashari 105-Year System)', () => {
    const calculator = new PanchottariCalculator();

    it('validates 105-year cycle and planetary sequence', () => {
      expect(TOTAL_PANCHOTTARI_YEARS).toBe(105);
      expect(PANCHOTTARI_ORDER).toHaveLength(7);
      const total = PANCHOTTARI_ORDER.reduce((s, p) => s + PANCHOTTARI_YEARS[p], 0);
      expect(total).toBe(105);
    });

    it('maps Janma Nakshatra from Anuradha (Nakshatra 17)', () => {
      // Anuradha (Nakshatra 17, 220°) -> Sun (12y)
      const treeAnuradha = calculator.calculatePanchottariDasha(220.0, birthDate);
      expect(treeAnuradha.birthLord).toBe(PlanetSymbol.SUN);

      // Jyeshtha (Nakshatra 18, 230°) -> Mercury (13y)
      const treeJyeshtha = calculator.calculatePanchottariDasha(230.0, birthDate);
      expect(treeJyeshtha.birthLord).toBe(PlanetSymbol.MERCURY);
    });

    it('evaluates eligibility: Cancer Lagna (D1) and Cancer Dwadasamsha (D12)', () => {
      // Chart 1: Leo Lagna -> false
      const chart1 = buildMockChart();
      const tree1 = calculator.calculateForChart(chart1);
      expect(tree1.eligibility?.isEligible).toBe(false);

      // Chart 2: Cancer Lagna at 91.0° (Cancer 1°00', 1st D12 is Cancer [4]) -> true!
      const chart2 = buildMockChart({
        ascendant: { longitude: 91.0, rashiIndex: 4, speedLongitude: 0 },
      });
      const tree2 = calculator.calculateForChart(chart2);
      expect(tree2.eligibility?.isEligible).toBe(true);
    });
  });

  // ==========================================================================
  // 8. DASHA REGISTRY TESTS
  // ==========================================================================
  describe('8. DashaRegistry - Unified Metadata, Dispatch & Eligibility', () => {
    it('answers isSupported for all implemented systems', () => {
      expect(DashaRegistry.isSupported('VIMSHOTTARI')).toBe(true);
      expect(DashaRegistry.isSupported('ASHTOTTARI')).toBe(true);
      expect(DashaRegistry.isSupported('STHIRA')).toBe(true);
      expect(DashaRegistry.isSupported('SHOOLA')).toBe(true);
      expect(DashaRegistry.isSupported('DWISAPTATI_SAMA')).toBe(true);
      expect(DashaRegistry.isSupported('SHATABDIKA')).toBe(true);
      expect(DashaRegistry.isSupported('CHATURASEETI_SAMA')).toBe(true);
      expect(DashaRegistry.isSupported('DWADASHOTTARI')).toBe(true);
      expect(DashaRegistry.isSupported('PANCHOTTARI')).toBe(true);
      expect(DashaRegistry.isSupported('NON_EXISTENT')).toBe(false);
    });

    it('exposes implemented systems list and pending systems list', () => {
      const implemented = DashaRegistry.getImplementedSystems();
      expect(implemented.length).toBe(9);

      const pending = DashaRegistry.getPendingSystems();
      expect(pending.length).toBeGreaterThanOrEqual(4);
      const pendingNames = pending.map((p) => p.name);
      expect(pendingNames).toContain('Yogini Dasha');
      expect(pendingNames).toContain('Chara Dasha');
      expect(pendingNames).toContain('Narayana Dasha');
      expect(pendingNames).toContain('Kalachakra Dasha');
    });

    it('handles conditional dispatch: returns IneligibleDashaResult when chart is ineligible', () => {
      const chart = buildMockChart(); // Ineligible for Panchottari
      const result = DashaRegistry.calculateDasha('PANCHOTTARI', chart);
      expect(result.isEligible).toBe(false);
      expect('eligibility' in result).toBe(true);
      expect(result.eligibility.reason).toContain('does not satisfy');
    });

    it('handles universal dispatch: returns full timeline when eligible', () => {
      const chart = buildMockChart();
      const result = DashaRegistry.calculateDasha('STHIRA', chart);
      expect('mahadashas' in result).toBe(true);
      if ('mahadashas' in result) {
        expect(result.mahadashas).toHaveLength(12);
      }
    });
  });
});
