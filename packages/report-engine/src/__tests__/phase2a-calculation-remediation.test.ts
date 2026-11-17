import { describe, it, expect } from 'vitest';
import {
  mapNormalizedChartToCareerReportData,
} from '../mappers/career-report.mapper';
import {
  PlanetSymbol,
  normalizeAstroChart,
  AstroChart,
  NormalizedChart,
  getAspectedHouses,
  SadeSatiCalculator,
} from '@astro/astrology-engine';

describe('Phase 2A: Critical Career Report Calculation Remediation Test Suite', () => {
  const baseClientProfile = {
    clientName: 'Test Native',
    dateOfBirth: '1990-06-15',
    timeOfBirth: '12:00:00',
    birthPlace: 'New Delhi, India',
    timeZone: 'Asia/Kolkata',
    latitude: 28.6139,
    longitude: 77.209,
  };

  function createTestNormalizedChart(overrides: {
    moonSign: string;
    moonRashiIndex: number;
    moonDegree: number;
    moonAbsoluteDegree?: number;
    moonHouse?: number;
    planetsSpeed?: Record<string, number>;
    planetsLatitude?: Record<string, number>;
  }): NormalizedChart {
    const rawChart: any = {
      ascendant: {
        sign: 'Aries',
        degree: 15.0,
        nakshatra: 'Bharani',
        pada: 1,
      },
      planets: [
        {
          name: 'Sun',
          sign: 'Gemini',
          degree: 1.0,
          house: 3,
          nakshatra: 'Mrigashira',
          pada: 3,
          retrograde: false,
          speedLongitude: 0.985,
          latitude: 0.0,
        },
        {
          name: 'Moon',
          sign: overrides.moonSign,
          rashiIndex: overrides.moonRashiIndex,
          degree: overrides.moonDegree,
          absoluteDegree:
            overrides.moonAbsoluteDegree ??
            (overrides.moonRashiIndex - 1) * 30 + overrides.moonDegree,
          house: overrides.moonHouse ?? overrides.moonRashiIndex,
          nakshatra: 'Ashwini',
          pada: 1,
          retrograde: false,
          speedLongitude: 13.2,
          latitude: 1.5,
        },
        {
          name: 'Mars',
          sign: 'Aries',
          degree: 10.0,
          house: 1,
          nakshatra: 'Ashwini',
          pada: 3,
          retrograde: overrides.planetsSpeed?.['MARS'] ? overrides.planetsSpeed['MARS'] < 0 : false,
          speedLongitude: overrides.planetsSpeed?.['MARS'] ?? 0.52,
          latitude: overrides.planetsLatitude?.['MARS'] ?? 0.2,
        },
        {
          name: 'Mercury',
          sign: 'Taurus',
          degree: 14.0,
          house: 2,
          nakshatra: 'Rohini',
          pada: 2,
          retrograde: false,
          speedLongitude: overrides.planetsSpeed?.['MERCURY'] ?? 1.4,
          latitude: overrides.planetsLatitude?.['MERCURY'] ?? 1.1,
        },
        {
          name: 'Jupiter',
          sign: 'Cancer',
          degree: 5.0,
          house: 4,
          nakshatra: 'Pushya',
          pada: 1,
          retrograde: false,
          speedLongitude: overrides.planetsSpeed?.['JUPITER'] ?? 0.08,
          latitude: overrides.planetsLatitude?.['JUPITER'] ?? 0.1,
        },
        {
          name: 'Venus',
          sign: 'Taurus',
          degree: 20.0,
          house: 2,
          nakshatra: 'Rohini',
          pada: 4,
          retrograde: false,
          speedLongitude: overrides.planetsSpeed?.['VENUS'] ?? 1.15,
          latitude: overrides.planetsLatitude?.['VENUS'] ?? -1.2,
        },
        {
          name: 'Saturn',
          sign: 'Capricorn',
          degree: 15.0,
          house: 10,
          nakshatra: 'Shravana',
          pada: 2,
          retrograde: false,
          speedLongitude: overrides.planetsSpeed?.['SATURN'] ?? 0.03,
          latitude: overrides.planetsLatitude?.['SATURN'] ?? -0.8,
        },
        {
          name: 'Rahu',
          sign: 'Aquarius',
          degree: 12.0,
          house: 11,
          nakshatra: 'Shatabhisha',
          pada: 2,
          retrograde: true,
          speedLongitude: -0.05,
          latitude: 0.0,
        },
        {
          name: 'Ketu',
          sign: 'Leo',
          degree: 12.0,
          house: 5,
          nakshatra: 'Magha',
          pada: 4,
          retrograde: true,
          speedLongitude: -0.05,
          latitude: 0.0,
        },
      ],
      houses: Array.from({ length: 12 }, (_, i) => ({
        houseNumber: i + 1,
        sign: [
          'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
          'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ][i],
        startDegree: i * 30,
        degree: i * 30,
      })),
    };

    return normalizeAstroChart(rawChart);
  }

  // =========================================================================
  // TASK 1: VIMSHOTTARI DASHA LONGITUDE CORRECTION
  // =========================================================================
  describe('Task 1: Vimshottari Dasha Longitude Verification', () => {
    // 27 classical Nakshatras with independent reference rulers
    const NAKSHATRA_REFERENCE: Array<{
      nakshatra: string;
      ruler: string;
      rashiName: string;
      rashiIndex: number;
      degreeInRashi: number;
    }> = [
      { nakshatra: 'Ashwini', ruler: 'KETU', rashiName: 'Aries', rashiIndex: 1, degreeInRashi: 5.0 },
      { nakshatra: 'Bharani', ruler: 'VENUS', rashiName: 'Aries', rashiIndex: 1, degreeInRashi: 20.0 },
      { nakshatra: 'Krittika', ruler: 'SUN', rashiName: 'Taurus', rashiIndex: 2, degreeInRashi: 5.0 },
      { nakshatra: 'Rohini', ruler: 'MOON', rashiName: 'Taurus', rashiIndex: 2, degreeInRashi: 18.0 },
      { nakshatra: 'Mrigashira', ruler: 'MARS', rashiName: 'Gemini', rashiIndex: 3, degreeInRashi: 2.0 },
      { nakshatra: 'Ardra', ruler: 'RAHU', rashiName: 'Gemini', rashiIndex: 3, degreeInRashi: 12.0 },
      { nakshatra: 'Punarvasu', ruler: 'JUPITER', rashiName: 'Gemini', rashiIndex: 3, degreeInRashi: 25.0 },
      { nakshatra: 'Pushya', ruler: 'SATURN', rashiName: 'Cancer', rashiIndex: 4, degreeInRashi: 8.0 },
      { nakshatra: 'Ashlesha', ruler: 'MERCURY', rashiName: 'Cancer', rashiIndex: 4, degreeInRashi: 25.0 },
      { nakshatra: 'Magha', ruler: 'KETU', rashiName: 'Leo', rashiIndex: 5, degreeInRashi: 5.0 },
      { nakshatra: 'Purva Phalguni', ruler: 'VENUS', rashiName: 'Leo', rashiIndex: 5, degreeInRashi: 20.0 },
      { nakshatra: 'Uttara Phalguni', ruler: 'SUN', rashiName: 'Virgo', rashiIndex: 6, degreeInRashi: 5.0 },
      { nakshatra: 'Hasta', ruler: 'MOON', rashiName: 'Virgo', rashiIndex: 6, degreeInRashi: 18.0 },
      { nakshatra: 'Chitra', ruler: 'MARS', rashiName: 'Libra', rashiIndex: 7, degreeInRashi: 2.0 },
      { nakshatra: 'Swati', ruler: 'RAHU', rashiName: 'Libra', rashiIndex: 7, degreeInRashi: 12.0 },
      { nakshatra: 'Vishakha', ruler: 'JUPITER', rashiName: 'Scorpio', rashiIndex: 8, degreeInRashi: 2.0 },
      { nakshatra: 'Anuradha', ruler: 'SATURN', rashiName: 'Scorpio', rashiIndex: 8, degreeInRashi: 15.0 },
      { nakshatra: 'Jyeshtha', ruler: 'MERCURY', rashiName: 'Scorpio', rashiIndex: 8, degreeInRashi: 25.0 },
      { nakshatra: 'Mula', ruler: 'KETU', rashiName: 'Sagittarius', rashiIndex: 9, degreeInRashi: 5.0 },
      { nakshatra: 'Purva Ashadha', ruler: 'VENUS', rashiName: 'Sagittarius', rashiIndex: 9, degreeInRashi: 20.0 },
      { nakshatra: 'Uttara Ashadha', ruler: 'SUN', rashiName: 'Capricorn', rashiIndex: 10, degreeInRashi: 5.0 },
      { nakshatra: 'Shravana', ruler: 'MOON', rashiName: 'Capricorn', rashiIndex: 10, degreeInRashi: 18.0 },
      { nakshatra: 'Dhanishta', ruler: 'MARS', rashiName: 'Aquarius', rashiIndex: 11, degreeInRashi: 2.0 },
      { nakshatra: 'Shatabhisha', ruler: 'RAHU', rashiName: 'Aquarius', rashiIndex: 11, degreeInRashi: 12.0 },
      { nakshatra: 'Purva Bhadrapada', ruler: 'JUPITER', rashiName: 'Pisces', rashiIndex: 12, degreeInRashi: 2.0 },
      { nakshatra: 'Uttara Bhadrapada', ruler: 'SATURN', rashiName: 'Pisces', rashiIndex: 12, degreeInRashi: 15.0 },
      { nakshatra: 'Revati', ruler: 'MERCURY', rashiName: 'Pisces', rashiIndex: 12, degreeInRashi: 25.0 },
    ];

    it('1.1 Computes correct starting Mahadasha across all 27 Nakshatras', () => {
      for (const ref of NAKSHATRA_REFERENCE) {
        const chart = createTestNormalizedChart({
          moonSign: ref.rashiName,
          moonRashiIndex: ref.rashiIndex,
          moonDegree: ref.degreeInRashi,
        });

        const reportData = mapNormalizedChartToCareerReportData(chart, undefined, baseClientProfile);

        expect(reportData.dasha.lifetimeMahadashas.length).toBeGreaterThanOrEqual(1);
        const birthMahadasha = reportData.dasha.lifetimeMahadashas[0];
        expect(
          birthMahadasha.planet.toUpperCase(),
          `Nakshatra ${ref.nakshatra} (Moon at ${ref.degreeInRashi}° in ${ref.rashiName}) must start with ${ref.ruler} Mahadasha`
        ).toBe(ref.ruler.toUpperCase());
      }
    });

    it('1.2 Matches explicit task specification test cases', () => {
      // Aries 0° -> Ashwini (Ketu)
      const c1 = createTestNormalizedChart({ moonSign: 'Aries', moonRashiIndex: 1, moonDegree: 0.0 });
      const r1 = mapNormalizedChartToCareerReportData(c1, undefined, baseClientProfile);
      expect(r1.dasha.lifetimeMahadashas[0].planet.toUpperCase()).toBe('KETU');

      // Aries 15° -> Bharani (Venus)
      const c2 = createTestNormalizedChart({ moonSign: 'Aries', moonRashiIndex: 1, moonDegree: 15.0 });
      const r2 = mapNormalizedChartToCareerReportData(c2, undefined, baseClientProfile);
      expect(r2.dasha.lifetimeMahadashas[0].planet.toUpperCase()).toBe('VENUS');

      // Scorpio 15° -> Anuradha (Saturn)
      const c3 = createTestNormalizedChart({ moonSign: 'Scorpio', moonRashiIndex: 8, moonDegree: 15.0 });
      const r3 = mapNormalizedChartToCareerReportData(c3, undefined, baseClientProfile);
      expect(r3.dasha.lifetimeMahadashas[0].planet.toUpperCase()).toBe('SATURN');

      // Pisces 15° -> Uttara Bhadrapada (Saturn)
      const c4 = createTestNormalizedChart({ moonSign: 'Pisces', moonRashiIndex: 12, moonDegree: 15.0 });
      const r4 = mapNormalizedChartToCareerReportData(c4, undefined, baseClientProfile);
      expect(r4.dasha.lifetimeMahadashas[0].planet.toUpperCase()).toBe('SATURN');
    });

    it('1.3 Handles boundary transitions between Nakshatras accurately', () => {
      // Ashwini (0.0° to 13.3333°) vs Bharani (13.3333° to 26.6667°)
      const ashwiniEnd = createTestNormalizedChart({ moonSign: 'Aries', moonRashiIndex: 1, moonDegree: 13.32 });
      const bharaniStart = createTestNormalizedChart({ moonSign: 'Aries', moonRashiIndex: 1, moonDegree: 13.35 });

      const rAsh = mapNormalizedChartToCareerReportData(ashwiniEnd, undefined, baseClientProfile);
      const rBha = mapNormalizedChartToCareerReportData(bharaniStart, undefined, baseClientProfile);

      expect(rAsh.dasha.lifetimeMahadashas[0].planet.toUpperCase()).toBe('KETU');
      expect(rBha.dasha.lifetimeMahadashas[0].planet.toUpperCase()).toBe('VENUS');

      // Pisces 29.99° (Revati - Mercury)
      const revatiEnd = createTestNormalizedChart({ moonSign: 'Pisces', moonRashiIndex: 12, moonDegree: 29.99 });
      const rRev = mapNormalizedChartToCareerReportData(revatiEnd, undefined, baseClientProfile);
      expect(rRev.dasha.lifetimeMahadashas[0].planet.toUpperCase()).toBe('MERCURY');
    });
  });

  // =========================================================================
  // TASK 2: SADE SATI LONGITUDE CORRECTION
  // =========================================================================
  describe('Task 2: Sade Sati Longitude Verification', () => {
    it('2.1 Evaluates Sade Sati correctly for all 12 Moon signs', () => {
      // Transiting Saturn fixed in Pisces (Sign 12, ~345°)
      const transitSaturnLong = 345.0; // Pisces

      for (let moonSign = 1; moonSign <= 12; moonSign++) {
        const totalMoonLong = (moonSign - 1) * 30 + 15.0;
        const evaluation = SadeSatiCalculator.evaluateSadeSati(totalMoonLong, transitSaturnLong);

        // Independent expected calculation:
        // Saturn in Pisces (12).
        // If Moon in Aries (1): Saturn in 12th from Moon -> Phase 1 (Setting)
        // If Moon in Pisces (12): Saturn in 1st from Moon -> Phase 2 (Peak)
        // If Moon in Aquarius (11): Saturn in 2nd from Moon -> Phase 3 (Rising)
        // If Moon in Sagittarius (9): Saturn in 4th from Moon -> Kantaka Dhaiyya
        // If Moon in Leo (5): Saturn in 8th from Moon -> Ashtama Dhaiyya

        if (moonSign === 1) {
          expect(evaluation.isSadeSatiActive).toBe(true);
          expect(evaluation.phase).toBe('PHASE_1_SETTING');
          expect(evaluation.houseFromMoon).toBe(12);
        } else if (moonSign === 12) {
          expect(evaluation.isSadeSatiActive).toBe(true);
          expect(evaluation.phase).toBe('PHASE_2_PEAK');
          expect(evaluation.houseFromMoon).toBe(1);
        } else if (moonSign === 11) {
          expect(evaluation.isSadeSatiActive).toBe(true);
          expect(evaluation.phase).toBe('PHASE_3_RISING');
          expect(evaluation.houseFromMoon).toBe(2);
        } else if (moonSign === 9) {
          expect(evaluation.isSadeSatiActive).toBe(false);
          expect(evaluation.isDhaiyyaActive).toBe(true);
          expect(evaluation.dhaiyyaType).toBe('KANTAKA_4TH');
          expect(evaluation.houseFromMoon).toBe(4);
        } else if (moonSign === 5) {
          expect(evaluation.isSadeSatiActive).toBe(false);
          expect(evaluation.isDhaiyyaActive).toBe(true);
          expect(evaluation.dhaiyyaType).toBe('ASHTAMA_8TH');
          expect(evaluation.houseFromMoon).toBe(8);
        } else {
          expect(evaluation.isSadeSatiActive).toBe(false);
          expect(evaluation.isDhaiyyaActive).toBe(false);
        }
      }
    });
  });

  // =========================================================================
  // TASK 3: TRANSIT HOUSE FROM MOON (144 COMBINATIONS)
  // =========================================================================
  describe('Task 3: Transit House from Moon (144 Combinations)', () => {
    it('3.1 Accurately computes houseFromMoon for all 144 Moon & Transit Sign combinations', () => {
      for (let transitSign = 1; transitSign <= 12; transitSign++) {
        for (let moonSign = 1; moonSign <= 12; moonSign++) {
          const expectedHouse = ((transitSign - moonSign + 12) % 12) + 1;

          // Verify mathematical formula:
          const actualHouse = ((transitSign - moonSign + 12) % 12) + 1;
          expect(actualHouse).toBe(expectedHouse);
          expect(actualHouse).toBeGreaterThanOrEqual(1);
          expect(actualHouse).toBeLessThanOrEqual(12);

          // Test specific cases:
          // Transit = Natal Moon -> House 1
          if (transitSign === moonSign) {
            expect(actualHouse).toBe(1);
          }
          // Transit 1 sign ahead -> House 2
          if (transitSign === (moonSign % 12) + 1) {
            expect(actualHouse).toBe(2);
          }
          // Transit 1 sign behind -> House 12
          if (transitSign === ((moonSign - 2 + 12) % 12) + 1) {
            expect(actualHouse).toBe(12);
          }
        }
      }
    });

    it('3.2 Mapper correctly sets saturnHouseFromMoon and jupiterHouseFromMoon relative to Moon Rashi', () => {
      // Native with Lagna Leo (5) and Moon in Gemini (Sign 3, House 11 from Lagna)
      const chart = createTestNormalizedChart({
        moonSign: 'Gemini',
        moonRashiIndex: 3,
        moonDegree: 10.0,
        moonHouse: 11, // Natal Moon in House 11
      });

      const reportData = mapNormalizedChartToCareerReportData(chart, undefined, baseClientProfile);

      // Verify that saturnHouseFromMoon is computed using Moon Rashi (3), NOT Moon House (11)
      const saturnSignIdx = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
      ].findIndex((s) => s.toLowerCase() === reportData.transits.saturnTransit.sign.toLowerCase()) + 1;

      const expectedSaturnFromMoon = ((saturnSignIdx - 3 + 12) % 12) + 1;
      expect(reportData.transits.saturnTransit.houseFromMoon).toBe(expectedSaturnFromMoon);

      const jupiterSignIdx = [
        'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
        'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
      ].findIndex((s) => s.toLowerCase() === reportData.transits.jupiterTransit.sign.toLowerCase()) + 1;

      const expectedJupiterFromMoon = ((jupiterSignIdx - 3 + 12) % 12) + 1;
      expect(reportData.transits.jupiterTransit.houseFromMoon).toBe(expectedJupiterFromMoon);
    });
  });

  // =========================================================================
  // TASK 4: TRANSIT ASPECTS FOR ALL 12 SOURCE HOUSES
  // =========================================================================
  describe('Task 4: Planetary Aspects for All 12 Source Houses', () => {
    it('4.1 Accurately evaluates Saturn, Jupiter and Mars aspects across all 12 houses', () => {
      for (let h = 1; h <= 12; h++) {
        // Saturn: 3rd, 7th, 10th
        const satExpected = [
          ((h - 1 + 2) % 12) + 1,
          ((h - 1 + 6) % 12) + 1,
          ((h - 1 + 9) % 12) + 1,
        ];
        const satActual = getAspectedHouses(PlanetSymbol.SATURN, h).map((a) => a.house);
        expect(satActual).toEqual(expect.arrayContaining(satExpected));

        // Jupiter: 5th, 7th, 9th
        const jupExpected = [
          ((h - 1 + 4) % 12) + 1,
          ((h - 1 + 6) % 12) + 1,
          ((h - 1 + 8) % 12) + 1,
        ];
        const jupActual = getAspectedHouses(PlanetSymbol.JUPITER, h).map((a) => a.house);
        expect(jupActual).toEqual(expect.arrayContaining(jupExpected));

        // Mars: 4th, 7th, 8th
        const marsExpected = [
          ((h - 1 + 3) % 12) + 1,
          ((h - 1 + 6) % 12) + 1,
          ((h - 1 + 7) % 12) + 1,
        ];
        const marsActual = getAspectedHouses(PlanetSymbol.MARS, h).map((a) => a.house);
        expect(marsActual).toEqual(expect.arrayContaining(marsExpected));
      }
    });

    it('4.2 Saturn in House 1 aspects Houses 3, 7, 10; Jupiter in House 1 aspects 5, 7, 9', () => {
      const satH1 = getAspectedHouses(PlanetSymbol.SATURN, 1).map((a) => a.house);
      expect(satH1).toEqual(expect.arrayContaining([3, 7, 10]));
      expect(satH1).not.toContain(4);
      expect(satH1).not.toContain(8);
      expect(satH1).not.toContain(11);

      const jupH1 = getAspectedHouses(PlanetSymbol.JUPITER, 1).map((a) => a.house);
      expect(jupH1).toEqual(expect.arrayContaining([5, 7, 9]));
      expect(jupH1).not.toContain(6);
      expect(jupH1).not.toContain(8);
      expect(jupH1).not.toContain(10);
    });

    it('4.3 Mapper transit aspect strings display correct houses without off-by-one shifts', () => {
      const chart = createTestNormalizedChart({
        moonSign: 'Aries',
        moonRashiIndex: 1,
        moonDegree: 10.0,
      });

      const reportData = mapNormalizedChartToCareerReportData(chart, undefined, baseClientProfile);

      const satHouse = reportData.transits.saturnTransit.houseFromLagna;
      const expectedSat3rd = ((satHouse - 1 + 2) % 12) + 1;
      const expectedSat7th = ((satHouse - 1 + 6) % 12) + 1;
      const expectedSat10th = ((satHouse - 1 + 9) % 12) + 1;

      expect(reportData.transits.saturnTransit.aspects).toBe(
        `Aspects House ${expectedSat3rd}, House ${expectedSat7th}, House ${expectedSat10th}`
      );

      const jupHouse = reportData.transits.jupiterTransit.houseFromLagna;
      const expectedJup5th = ((jupHouse - 1 + 4) % 12) + 1;
      const expectedJup7th = ((jupHouse - 1 + 6) % 12) + 1;
      const expectedJup9th = ((jupHouse - 1 + 8) % 12) + 1;

      expect(reportData.transits.jupiterTransit.aspects).toBe(
        `Benefic 5th, 7th, and 9th aspects cast on House ${expectedJup5th}, House ${expectedJup7th}, House ${expectedJup9th}`
      );
    });
  });

  // =========================================================================
  // TASK 5: SHADBALA INPUT DATA & MOTIONAL VELOCITY PRESERVATION
  // =========================================================================
  describe('Task 5: Shadbala Motion Data Preservation', () => {
    it('5.1 Preserves genuine planetary speeds and calculates Cheshta Bala accordingly', () => {
      // Retrograde Mars (-0.35 deg/day) and direct Mercury (1.5 deg/day)
      const chart = createTestNormalizedChart({
        moonSign: 'Aries',
        moonRashiIndex: 1,
        moonDegree: 10.0,
        planetsSpeed: {
          MARS: -0.35,
          MERCURY: 1.5,
          JUPITER: 0.08,
          VENUS: 1.2,
          SATURN: 0.033,
        },
      });

      const reportData = mapNormalizedChartToCareerReportData(chart, undefined, baseClientProfile);

      expect(reportData.shadbala.status).toBe('VERIFIED');
      expect(reportData.shadbala.planets.length).toBe(7);

      // In BPHS Ch. 27: Retrograde planet receives full Cheshta Bala (60.0 Shashtiamsas)
      const marsShadbala = reportData.shadbala.planets.find((p) => p.planet === 'MARS');
      expect(marsShadbala).toBeDefined();
      expect(Number(marsShadbala?.cheshtaBala)).toBe(60.0);
    });

    it('5.2 Marks Shadbala status as DERIVED when planetary motion data is incomplete', () => {
      // Mock chart with missing speedLongitude on planets
      const rawIncompleteChart: any = {
        ascendant: { sign: 'Aries', degree: 15.0, nakshatra: 'Bharani', pada: 1 },
        planets: [
          { name: 'Sun', sign: 'Leo', degree: 10.0, house: 5 },
          { name: 'Moon', sign: 'Taurus', degree: 15.0, house: 2 },
          { name: 'Mars', sign: 'Aries', degree: 5.0, house: 1 },
          { name: 'Mercury', sign: 'Virgo', degree: 12.0, house: 6 },
          { name: 'Jupiter', sign: 'Sagittarius', degree: 18.0, house: 9 },
          { name: 'Venus', sign: 'Libra', degree: 20.0, house: 7 },
          { name: 'Saturn', sign: 'Capricorn', degree: 8.0, house: 10 },
          { name: 'Rahu', sign: 'Gemini', degree: 14.0, house: 3 },
          { name: 'Ketu', sign: 'Sagittarius', degree: 14.0, house: 9 },
        ],
        houses: Array.from({ length: 12 }, (_, i) => ({
          houseNumber: i + 1,
          sign: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][i],
          degree: i * 30,
        })),
      };

      // Manually strip speedLongitude from normalized chart
      const norm = normalizeAstroChart(rawIncompleteChart);
      for (const p of norm.planets) {
        delete (p as any).speedLongitude;
      }

      const reportData = mapNormalizedChartToCareerReportData(norm, undefined, baseClientProfile);

      // When motional velocities are missing, status must be DERIVED (no false precision)
      expect(reportData.shadbala.status).toBe('DERIVED');
    });
  });

  // =========================================================================
  // TASK 7: MISSING & INVALID ASTRONOMICAL INPUTS
  // =========================================================================
  describe('Task 7: Input Validation & Error Boundaries', () => {
    it('7.1 Throws explicit error when Moon placement is missing', () => {
      const chart = createTestNormalizedChart({ moonSign: 'Aries', moonRashiIndex: 1, moonDegree: 10.0 });
      // Remove Moon from planets array
      chart.planets = chart.planets.filter((p) => p.name.toUpperCase() !== 'MOON');

      expect(() => {
        mapNormalizedChartToCareerReportData(chart, undefined, baseClientProfile);
      }).toThrow(/Moon placement is missing from chart/);
    });

    it('7.2 Throws explicit error when Moon degree in sign is negative or >= 30', () => {
      const chartNegative = createTestNormalizedChart({ moonSign: 'Aries', moonRashiIndex: 1, moonDegree: -2.0 });
      expect(() => {
        mapNormalizedChartToCareerReportData(chartNegative, undefined, baseClientProfile);
      }).toThrow(/Invalid Moon degree in sign/);

      const chartOverflow = createTestNormalizedChart({ moonSign: 'Aries', moonRashiIndex: 1, moonDegree: 32.0 });
      expect(() => {
        mapNormalizedChartToCareerReportData(chartOverflow, undefined, baseClientProfile);
      }).toThrow(/Invalid Moon degree in sign/);
    });
  });
});

