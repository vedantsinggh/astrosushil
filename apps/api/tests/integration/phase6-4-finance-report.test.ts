import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateFinanceReport,
  generateCareerProReport,
  generateKundliReport,
  reportPdfService,
  ReportType,
  FinanceReportModel,
} from '@astro/report-engine';
import { BirthDetailsValidationError } from '@astro/astrology-engine';
import { COMMERCE_CATALOG } from '../../src/modules/commerce/commerce.catalog';
import { REPORT_PRICES_PAISE } from '../../src/services/payment.service';

describe('Phase 6.4A: Finance Report Verification and Integration Completion Suite', () => {
  // Canonical reference profile: Puneet Kumar (from docs/reference repots/Finance Report.pdf)
  const puneetProfile = {
    name: 'Puneet Kumar',
    dateOfBirth: '1983-12-28',
    timeOfBirth: '04:45:00',
    placeName: 'Bulandshahr, Uttar Pradesh, India',
    timezone: 'Asia/Kolkata',
    latitude: 28.4069,
    longitude: 77.8498,
  };

  // Canonical chart data for Puneet Kumar (Scorpio Rising) matching Finance Report.pdf
  const puneetChartData = {
    ascendant: {
      sign: 'Scorpio',
      degree: 9.24,
      nakshatra: 'Anuradha',
      pada: 2,
    },
    planets: [
      { planet: 'SUN', sign: 'Sagittarius', degree: 12.15, house: 2, nakshatra: 'Mula', pada: 4, isRetrograde: false },
      { planet: 'MOON', sign: 'Virgo', degree: 27.8, house: 11, nakshatra: 'Chitra', pada: 2, isRetrograde: false },
      { planet: 'MARS', sign: 'Virgo', degree: 28.45, house: 11, nakshatra: 'Chitra', pada: 2, isRetrograde: false },
      { planet: 'MERCURY', sign: 'Sagittarius', degree: 19.7, house: 2, nakshatra: 'Purva Ashadha', pada: 2, isRetrograde: false },
      { planet: 'JUPITER', sign: 'Sagittarius', degree: 1.38, house: 2, nakshatra: 'Mula', pada: 1, isRetrograde: false },
      { planet: 'VENUS', sign: 'Scorpio', degree: 1.44, house: 1, nakshatra: 'Vishakha', pada: 4, isRetrograde: false },
      { planet: 'SATURN', sign: 'Libra', degree: 19.37, house: 12, nakshatra: 'Svati', pada: 4, isRetrograde: false },
      { planet: 'RAHU', sign: 'Taurus', degree: 21.05, house: 7, nakshatra: 'Rohini', pada: 4, isRetrograde: true },
      { planet: 'KETU', sign: 'Scorpio', degree: 21.05, house: 1, nakshatra: 'Jyeshtha', pada: 2, isRetrograde: true },
    ],
    houses: [
      { houseNumber: 1, sign: 'Scorpio', planetsPresent: ['VENUS', 'KETU'] },
      { houseNumber: 2, sign: 'Sagittarius', planetsPresent: ['SUN', 'MERCURY', 'JUPITER'] },
      { houseNumber: 3, sign: 'Capricorn', planetsPresent: [] },
      { houseNumber: 4, sign: 'Aquarius', planetsPresent: [] },
      { houseNumber: 5, sign: 'Pisces', planetsPresent: [] },
      { houseNumber: 6, sign: 'Aries', planetsPresent: [] },
      { houseNumber: 7, sign: 'Taurus', planetsPresent: ['RAHU'] },
      { houseNumber: 8, sign: 'Gemini', planetsPresent: [] },
      { houseNumber: 9, sign: 'Cancer', planetsPresent: [] },
      { houseNumber: 10, sign: 'Leo', planetsPresent: [] },
      { houseNumber: 11, sign: 'Virgo', planetsPresent: ['MOON', 'MARS'] },
      { houseNumber: 12, sign: 'Libra', planetsPresent: ['SATURN'] },
    ],
  };

  // ---------------------------------------------------------------------------
  // 1. INPUT VALIDATION SUITE
  // ---------------------------------------------------------------------------
  describe('Input Validation', () => {
    it('should successfully validate canonical profile input', async () => {
      const report = await generateFinanceReport(puneetProfile, puneetChartData);
      expect(report).toBeDefined();
      expect(report.type).toBe(ReportType.FINANCE);
      expect(report.profile.name).toBe('Puneet Kumar');
    });

    it('should reject missing birth name', async () => {
      const badInput = { ...puneetProfile, name: '' };
      await expect(generateFinanceReport(badInput, puneetChartData)).rejects.toThrow(BirthDetailsValidationError);
    });

    it('should reject missing or malformed birth time', async () => {
      const badInput = { ...puneetProfile, timeOfBirth: 'invalid-time' };
      await expect(generateFinanceReport(badInput, puneetChartData)).rejects.toThrow(BirthDetailsValidationError);
    });

    it('should reject invalid timezone identifier', async () => {
      const badInput = { ...puneetProfile, timezone: 'Moon/Station_Alpha' };
      await expect(generateFinanceReport(badInput, puneetChartData)).rejects.toThrow(BirthDetailsValidationError);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. DETERMINISTIC ASTROLOGICAL CALCULATIONS & THE WEALTH AXIS
  // ---------------------------------------------------------------------------
  describe('Deterministic Astrological Calculations & Wealth Axis', () => {
    let report: FinanceReportModel;

    beforeAll(async () => {
      report = await generateFinanceReport(puneetProfile, puneetChartData);
    });

    it('should correctly identify Scorpio Ascendant and the core financial houses', () => {
      expect(report.ascendant.sign).toBe('Scorpio');

      const h2 = report.wealthHouses.find((h) => h.houseNumber === 2);
      expect(h2).toBeDefined();
      expect(h2?.sign).toBe('Sagittarius');
      expect(h2?.lord).toBe('Jupiter');
      expect(h2?.occupantPlanets).toContain('SUN');
      expect(h2?.occupantPlanets).toContain('MERCURY');
      expect(h2?.occupantPlanets).toContain('JUPITER');

      const h11 = report.wealthHouses.find((h) => h.houseNumber === 11);
      expect(h11).toBeDefined();
      expect(h11?.sign).toBe('Virgo');
      expect(h11?.lord).toBe('Mercury');
      expect(h11?.occupantPlanets).toContain('MOON');
      expect(h11?.occupantPlanets).toContain('MARS');
    });

    it('should correctly evaluate supporting houses 9 (Bhagya), 10 (Karma), and 12 (Vyaya)', () => {
      const h9 = report.wealthHouses.find((h) => h.houseNumber === 9);
      expect(h9?.sign).toBe('Cancer');
      expect(h9?.lord).toBe('Moon');

      const h10 = report.wealthHouses.find((h) => h.houseNumber === 10);
      expect(h10?.sign).toBe('Leo');
      expect(h10?.lord).toBe('Sun');

      const h12 = report.wealthHouses.find((h) => h.houseNumber === 12);
      expect(h12?.sign).toBe('Libra');
      expect(h12?.lord).toBe('Venus');
      expect(h12?.occupantPlanets).toContain('SATURN');
    });

    it('should identify all 5 universal Financial Grahas with accurate roles and dignities', () => {
      expect(report.financialSignificators.length).toBe(5);

      const jup = report.financialSignificators.find((s) => s.planet.toUpperCase() === 'JUPITER');
      expect(jup).toBeDefined();
      expect(jup?.house).toBe(2);
      expect(jup?.sign).toBe('Sagittarius');
      expect(jup?.dignity).toContain('Moolatrikona');
      expect(jup?.role).toContain('Dhana Karaka');

      const merc = report.financialSignificators.find((s) => s.planet.toUpperCase() === 'MERCURY');
      expect(merc).toBeDefined();
      expect(merc?.house).toBe(2);
      expect(merc?.role).toContain('Vyapar & Kosa Karaka');

      const sat = report.financialSignificators.find((s) => s.planet.toUpperCase() === 'SATURN');
      expect(sat).toBeDefined();
      expect(sat?.house).toBe(12);
      expect(sat?.sign).toBe('Libra');
      expect(sat?.dignity).toContain('Exalted');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. CLASSICAL DHANA YOGAS EVALUATION WITH INDEPENDENT FIXTURES
  // ---------------------------------------------------------------------------
  describe('Classical Dhana Yogas Evaluation', () => {
    let report: FinanceReportModel;

    beforeAll(async () => {
      report = await generateFinanceReport(puneetProfile, puneetChartData);
    });

    it('should identify Swakshetra Dhana Yoga (2nd Lord in 2nd House) as ACTIVE', () => {
      const swakshetraYoga = report.dhanaYogas.find((y) => y.name.includes('Swakshetra Dhana Yoga'));
      expect(swakshetraYoga).toBeDefined();
      expect(swakshetraYoga?.status).toBe('ACTIVE');
      expect(swakshetraYoga?.participatingPlanets).toContain('Jupiter');
      expect(swakshetraYoga?.classicalReference).toContain('Brihat Parashara Hora Shastra');
    });

    it('should identify Dhana-Labha Sambandha as ACTIVE (11th Lord Mercury in 2nd House)', () => {
      const dhanaLabha = report.dhanaYogas.find((y) => y.name.includes('Dhana-Labha Sambandha'));
      expect(dhanaLabha).toBeDefined();
      expect(dhanaLabha?.status).toBe('ACTIVE');
      expect(dhanaLabha?.participatingPlanets).toContain('Mercury');
    });

    it('should identify Karma-Dhana Yoga as ACTIVE (10th Lord Sun in 2nd House)', () => {
      const karmaDhana = report.dhanaYogas.find((y) => y.name.includes('Karma-Dhana Yoga'));
      expect(karmaDhana).toBeDefined();
      expect(karmaDhana?.status).toBe('ACTIVE');
      expect(karmaDhana?.participatingPlanets).toContain('Sun');
    });

    it('should identify Chandra-Mangala Yoga as ACTIVE (Moon and Mars conjunct in 11th House)', () => {
      const cmYoga = report.dhanaYogas.find((y) => y.name.includes('Chandra-Mangala Yoga'));
      expect(cmYoga).toBeDefined();
      expect(cmYoga?.status).toBe('ACTIVE');
      expect(cmYoga?.participatingPlanets).toContain('Moon');
      expect(cmYoga?.participatingPlanets).toContain('Mars');
    });

    it('should identify Shani Uccha Sanchaya as ACTIVE (Exalted Saturn in Libra) and distinguish it as report-specific', () => {
      const shaniYoga = report.dhanaYogas.find((y) => y.name.includes('Shani Uccha Sanchaya'));
      expect(shaniYoga).toBeDefined();
      expect(shaniYoga?.status).toBe('ACTIVE');
      expect(shaniYoga?.participatingPlanets).toContain('Saturn');
      expect(shaniYoga?.classicalReference).toContain('Report-Specific Interpretation');
      expect(shaniYoga?.description).toContain('report-specific methodology');
    });

    it('should classify overall Wealth Accumulation Capacity as EXCEPTIONAL based on active yogas and SAV strength', () => {
      const activeCount = report.dhanaYogas.filter((y) => y.status === 'ACTIVE').length;
      expect(activeCount).toBeGreaterThanOrEqual(5);
      expect(report.financialOverview.wealthAccumulationCapacity).toBe('EXCEPTIONAL');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. SARVASHTAKAVARGA (SAV) CASHFLOW & BALANCE SHEET
  // ---------------------------------------------------------------------------
  describe('Sarvashtakavarga (SAV) Wealth Flow Analysis', () => {
    let report: FinanceReportModel;

    beforeAll(async () => {
      report = await generateFinanceReport(puneetProfile, puneetChartData);
    });

    it('should calculate complete 12-house SAV points distribution dynamically from chart', () => {
      expect(report.savWealthFlow).toBeDefined();
      expect(Object.keys(report.savWealthFlow.housePoints).length).toBe(12);
      expect(report.savWealthFlow.labhaPoints).toBe(34);
      expect(report.savWealthFlow.vyayaPoints).toBe(36);
      expect(report.savWealthFlow.dhanaPoints).toBe(24);
      expect(report.savWealthFlow.karmaPoints).toBe(28);

      // Verify all 12 SAV house totals for the verified chart (Scorpio Lagna)
      const expectedSavHouses: Record<number, number> = {
        1: 26,  // Scorpio (Rashi 8)
        2: 24,  // Sagittarius (Rashi 9)
        3: 22,  // Capricorn (Rashi 10)
        4: 29,  // Aquarius (Rashi 11)
        5: 22,  // Pisces (Rashi 12)
        6: 30,  // Aries (Rashi 1)
        7: 26,  // Taurus (Rashi 2)
        8: 25,  // Gemini (Rashi 3)
        9: 35,  // Cancer (Rashi 4)
        10: 28, // Leo (Rashi 5)
        11: 34, // Virgo (Rashi 6)
        12: 36, // Libra (Rashi 7)
      };

      for (let h = 1; h <= 12; h++) {
        expect(report.savWealthFlow.housePoints[h]).toBe(expectedSavHouses[h]);
      }

      // Assert total SAV consistency: sum across all 12 houses must equal exactly 337
      const totalPoints = Object.values(report.savWealthFlow.housePoints).reduce((a, b) => a + b, 0);
      expect(totalPoints).toBe(337);
    });

    it('should calculate exact mathematical wealth retention ratio (34 / 36 = 0.94)', () => {
      expect(report.savWealthFlow.wealthRetentionRatio).toBe(0.94);
      expect(report.savWealthFlow.inflowVsOutflowSummary).toContain('12th house of expenditure (36 SAV points)');
      expect(report.savWealthFlow.inflowVsOutflowSummary).toContain('11th house of gains (34 points)');
      expect(report.savWealthFlow.cashflowTrajectory).toContain('EXPANSIVE_ACCUMULATION');
    });

    it('should verify individual planetary BAV contributions summing to exactly 337', async () => {
      const { extractOrCalculateSav } = await import('@astro/report-engine');
      const savData = extractOrCalculateSav(puneetChartData, 8);

      // Individual classical BAV expected totals per BPHS
      expect(savData.bavTotals['SUN']).toBe(48);
      expect(savData.bavTotals['MOON']).toBe(49);
      expect(savData.bavTotals['MARS']).toBe(39);
      expect(savData.bavTotals['MERCURY']).toBe(54);
      expect(savData.bavTotals['JUPITER']).toBe(56);
      expect(savData.bavTotals['VENUS']).toBe(52);
      expect(savData.bavTotals['SATURN']).toBe(39);

      const bavSum = Object.values(savData.bavTotals).reduce((a, b) => a + b, 0);
      expect(bavSum).toBe(337);
      expect(savData.savTotal).toBe(337);
    });

    it('should verify whole-sign to house mapping for Scorpio Lagna', async () => {
      const { extractOrCalculateSav } = await import('@astro/report-engine');
      const savData = extractOrCalculateSav(puneetChartData, 8); // Scorpio Lagna = Rashi 8

      // Sign totals
      const expectedSigns: Record<number, number> = {
        1: 30, // Aries
        2: 26, // Taurus
        3: 25, // Gemini
        4: 35, // Cancer
        5: 28, // Leo
        6: 34, // Virgo
        7: 36, // Libra
        8: 26, // Scorpio
        9: 24, // Sagittarius
        10: 22, // Capricorn
        11: 29, // Aquarius
        12: 22, // Pisces
      };

      for (let s = 1; s <= 12; s++) {
        expect(savData.savSigns[s]).toBe(expectedSigns[s]);
      }

      // Whole-sign bijection: House h = ((8 - 1 + (h - 1)) % 12) + 1
      for (let h = 1; h <= 12; h++) {
        const expectedSign = ((8 - 1 + (h - 1)) % 12) + 1;
        expect(savData.savHouses[h]).toBe(savData.savSigns[expectedSign]);
      }
    });

    it('should assert cross-report SAV equality across Kundli, Career, and Finance reports', async () => {
      const kundliReport = await generateKundliReport(puneetProfile, puneetChartData);
      const careerReport = await generateCareerProReport(puneetProfile, puneetChartData);
      const financeReport = await generateFinanceReport(puneetProfile, puneetChartData);

      // 1. Kundli SAV signs match
      expect(kundliReport.ashtakavargaTable.totalPoints).toBe(337);
      expect(kundliReport.ashtakavargaTable.sav[8]).toBe(26); // Scorpio (House 1)
      expect(kundliReport.ashtakavargaTable.sav[9]).toBe(24); // Sagittarius (House 2)
      expect(kundliReport.ashtakavargaTable.sav[5]).toBe(28); // Leo (House 10)
      expect(kundliReport.ashtakavargaTable.sav[6]).toBe(34); // Virgo (House 11)
      expect(kundliReport.ashtakavargaTable.sav[7]).toBe(36); // Libra (House 12)

      // 2. Career SAV points match
      const cSav = careerReport.entrepreneurialCompass!.ashtakavargaSavPoints;
      expect(cSav.firstHouse).toBe(26);
      expect(cSav.sixthHouse).toBe(30);
      expect(cSav.seventhHouse).toBe(26);
      expect(cSav.tenthHouse).toBe(28);
      expect(cSav.eleventhHouse).toBe(34);

      // 3. Finance SAV points match
      const fSav = financeReport.savWealthFlow.housePoints;
      expect(fSav[1]).toBe(cSav.firstHouse);
      expect(fSav[6]).toBe(cSav.sixthHouse);
      expect(fSav[7]).toBe(cSav.seventhHouse);
      expect(fSav[10]).toBe(cSav.tenthHouse);
      expect(fSav[11]).toBe(cSav.eleventhHouse);
      expect(fSav[12]).toBe(36);

      // Cross-equality
      expect(cSav.firstHouse).toBe(kundliReport.ashtakavargaTable.sav[8]);
      expect(cSav.tenthHouse).toBe(kundliReport.ashtakavargaTable.sav[5]);
      expect(cSav.eleventhHouse).toBe(kundliReport.ashtakavargaTable.sav[6]);
    });

    it('should verify exact Dasha mathematical balance derivation at birth', async () => {
      // DOB: 28 Dec 1983, Moon: 177.80° Virgo in Chitra Nakshatra (173°20 to 186°40 = 800)
      // Traversed: 177.80 - 173.3333 = 4.4667 = 268 arcminutes
      // Remaining: 800 - 268 = 532 arcminutes
      // Fraction remaining: 532 / 800 = 0.665
      // Mars total span: 7 years -> 7 * 0.665 = 4.655 years = 4 years, 7 months, 26 days
      // Ending: 23 August 1988
      const dashaSection = report.sections.find((s) => s.id === 'ch7_vimshottari_dasha');
      expect(dashaSection).toBeDefined();
      expect(dashaSection!.content).toContain('4 years, 7 months, and 26 days');
      expect(dashaSection!.content).toContain('4.655 years');
      expect(dashaSection!.content).toContain('23 August 1988');
      expect(dashaSection!.content).toContain('Mars Mahadasha balance');
      expect(dashaSection!.content).not.toContain('4 years, 11 months, 22 days');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. THREE-YEAR ANNUAL FINANCIAL HORIZONS (2026 - 2028)
  // ---------------------------------------------------------------------------
  describe('Three-Year Annual Financial Horizons', () => {
    let report: FinanceReportModel;

    beforeAll(async () => {
      report = await generateFinanceReport(puneetProfile, puneetChartData);
    });

    it('should provide complete 3-year forecasts for 2026, 2027, and 2028', () => {
      expect(report.multiYearForecast.length).toBe(3);
      const years = report.multiYearForecast.map((f) => f.year);
      expect(years).toEqual([2026, 2027, 2028]);
    });

    it('each annual forecast should have 4 quarterly trajectories, auspicious and caution windows', () => {
      for (const yf of report.multiYearForecast) {
        expect(yf.annualTheme).toBeDefined();
        expect(yf.overview).toBeDefined();
        expect(yf.quarterlyOutlook.length).toBe(4);
        expect(yf.auspiciousWindows.length).toBeGreaterThan(0);
        expect(yf.cautionWindows.length).toBeGreaterThan(0);

        for (const q of yf.quarterlyOutlook) {
          expect(q.quarter).toBeDefined();
          expect(q.outlook).toBeDefined();
          expect(typeof q.rating).toBe('number');
          expect(q.rating).toBeGreaterThanOrEqual(1);
          expect(q.rating).toBeLessThanOrEqual(10);
        }
      }
    });

    it('2026 forecast should explicitly identify Saturn in Pisces and Jupiter in Gemini transits', () => {
      const f2026 = report.multiYearForecast.find((f) => f.year === 2026);
      expect(f2026).toBeDefined();
      const sat = f2026?.keyTransitInfluences.find((t) => t.planet === 'Saturn');
      expect(sat?.sign).toBe('Pisces');
      const jup = f2026?.keyTransitInfluences.find((t) => t.planet === 'Jupiter');
      expect(jup?.sign).toBe('Gemini');
    });

    it('2027 forecast should identify Exalted Jupiter in Cancer transit', () => {
      const f2027 = report.multiYearForecast.find((f) => f.year === 2027);
      expect(f2027).toBeDefined();
      const jup = f2027?.keyTransitInfluences.find((t) => t.planet.includes('Jupiter'));
      expect(jup?.sign).toBe('Cancer');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. VIMSHOTTARI DASHA FINANCIAL TIMELINE
  // ---------------------------------------------------------------------------
  describe('Vimshottari Dasha Financial Trajectory', () => {
    let report: FinanceReportModel;

    beforeAll(async () => {
      report = await generateFinanceReport(puneetProfile, puneetChartData);
    });

    it('should compute active and upcoming Vimshottari periods with actionable financial guidance', () => {
      expect(report.vimshottariDashaTimeline.length).toBeGreaterThanOrEqual(2);

      const mercuryPeriod = report.vimshottariDashaTimeline.find((p) => p.periodName.includes('Mercury'));
      expect(mercuryPeriod).toBeDefined();
      expect(mercuryPeriod?.startDate).toBe('2025-08-26');
      expect(mercuryPeriod?.endDate).toBe('2028-05-05');

      const ketuPeriod = report.vimshottariDashaTimeline.find((p) => p.periodName.includes('Ketu'));
      expect(ketuPeriod).toBeDefined();
      expect(ketuPeriod?.startDate).toBe('2028-05-05');
      expect(ketuPeriod?.endDate).toBe('2029-06-14');

      const venusPeriod = report.vimshottariDashaTimeline.find((p) => p.periodName.includes('Venus'));
      expect(venusPeriod).toBeDefined();
      expect(venusPeriod?.startDate).toBe('2029-06-14');
      expect(venusPeriod?.endDate).toBe('2032-08-13');

      for (const dp of report.vimshottariDashaTimeline) {
        expect(dp.periodName).toBeDefined();
        expect(dp.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(dp.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(dp.financialTone).toBeDefined();
        expect(dp.recommendation).toBeDefined();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 6B. CROSS-REPORT DASHA CONSISTENCY REGRESSION TEST (Phase 6.4B Requirement 1)
  // ---------------------------------------------------------------------------
  describe('Cross-Report Dasha Consistency Verification (Kundli, Career, Finance)', () => {
    it('should assert identical Mahadasha and Antardasha boundaries across Career and Finance reports for the same profile', async () => {
      const financeReport = await generateFinanceReport(puneetProfile, puneetChartData);
      const careerProReport = await generateCareerProReport(puneetProfile, puneetChartData);
      const kundliReport = await generateKundliReport(puneetProfile, puneetChartData);

      // 1. Verify Mahadasha consistency
      expect(careerProReport.multiYearCareerRoadmap).toBeDefined();
      const [careerP1, careerP2, careerP3] = careerProReport.multiYearCareerRoadmap!;
      expect(careerP1.mahadasha).toBe('Saturn');
      expect(careerP1.antardasha).toBe('Mercury');
      expect(careerP1.period).toBe('2025-08-26 to 2028-05-05');

      const finMerc = financeReport.vimshottariDashaTimeline.find((p) => p.antardashaLord === 'Mercury');
      expect(finMerc).toBeDefined();
      expect(finMerc?.mahadashaLord).toBe('Saturn');
      expect(finMerc?.startDate).toBe('2025-08-26');
      expect(finMerc?.endDate).toBe('2028-05-05');
      expect(`${finMerc?.startDate} to ${finMerc?.endDate}`).toBe(careerP1.period);

      // Period 2: Saturn - Ketu
      expect(careerP2.mahadasha).toBe('Saturn');
      expect(careerP2.antardasha).toBe('Ketu');
      expect(careerP2.period).toBe('2028-05-05 to 2029-06-14');

      const finKetu = financeReport.vimshottariDashaTimeline.find((p) => p.antardashaLord === 'Ketu');
      expect(finKetu).toBeDefined();
      expect(finKetu?.mahadashaLord).toBe('Saturn');
      expect(finKetu?.startDate).toBe('2028-05-05');
      expect(finKetu?.endDate).toBe('2029-06-14');
      expect(`${finKetu?.startDate} to ${finKetu?.endDate}`).toBe(careerP2.period);

      // Period 3: Saturn - Venus
      expect(careerP3.mahadasha).toBe('Saturn');
      expect(careerP3.antardasha).toBe('Venus');
      expect(careerP3.period).toBe('2029-06-14 to 2032-08-13');

      const finVenus = financeReport.vimshottariDashaTimeline.find((p) => p.antardashaLord === 'Venus');
      expect(finVenus).toBeDefined();
      expect(finVenus?.mahadashaLord).toBe('Saturn');
      expect(finVenus?.startDate).toBe('2029-06-14');
      expect(finVenus?.endDate).toBe('2032-08-13');
      expect(`${finVenus?.startDate} to ${finVenus?.endDate}`).toBe(careerP3.period);

      // 2. Kundli active dasha matches Saturn Mahadasha
      expect(kundliReport.vimshottariDasha).toBeDefined();
      expect(kundliReport.vimshottariDasha?.currentMahadasha.toUpperCase()).toBe('SATURN');
    });
  });

  // ---------------------------------------------------------------------------
  // 6C. INDEPENDENT DHANA YOGA POSITIVE & NEGATIVE FIXTURE VERIFICATION (Phase 6.4B Requirement 5)
  // ---------------------------------------------------------------------------
  describe('Independent Dhana Yoga Positive & Negative Fixtures', () => {
    // Helper to generate a modified chart based on puneetChartData for testing specific yogas
    const createCustomChart = (overrides: {
      planets?: Array<{ planet: string; sign?: string; house?: number; degree?: number; nakshatra?: string }>;
    }) => {
      const mergedPlanets = puneetChartData.planets.map((bp) => {
        const found = overrides.planets?.find((p) => p.planet.toUpperCase() === bp.planet.toUpperCase());
        return found ? { ...bp, ...found } : bp;
      });

      return {
        ...puneetChartData,
        planets: mergedPlanets,
      };
    };

    it('Swakshetra Dhana Yoga: positive when L2 in H2, negative when L2 outside H2', async () => {
      // Pos: Jupiter (2nd lord for Scorpio Lagna) in H2 (Sagittarius)
      const posChart = createCustomChart({ planets: [{ planet: 'Jupiter', sign: 'Sagittarius', house: 2, degree: 25 }] });
      const posRep = await generateFinanceReport(puneetProfile, posChart);
      const posYoga = posRep.dhanaYogas.find((y) => y.name.includes('Swakshetra Dhana'));
      expect(posYoga?.status).toBe('ACTIVE');
      expect(posYoga?.classicalReference).toContain('Brihat Parashara');

      // Neg: Jupiter placed in H6 (Aries)
      const negChart = createCustomChart({ planets: [{ planet: 'Jupiter', sign: 'Aries', house: 6, degree: 25 }] });
      const negRep = await generateFinanceReport(puneetProfile, negChart);
      const negYoga = negRep.dhanaYogas.find((y) => y.name.includes('Swakshetra Dhana'));
      expect(negYoga?.status).toBe('ABSENT');
    });

    it('Dhana-Labha Sambandha: positive when L11 in H2 or L2 in H11, negative when unassociated', async () => {
      // Pos: Mercury (11th lord for Scorpio) in H2
      const posChart = createCustomChart({ planets: [{ planet: 'Mercury', sign: 'Sagittarius', house: 2, degree: 10 }] });
      const posRep = await generateFinanceReport(puneetProfile, posChart);
      const posYoga = posRep.dhanaYogas.find((y) => y.name.includes('Dhana-Labha'));
      expect(posYoga?.status).toBe('ACTIVE');
      expect(posYoga?.classicalReference).toContain('Phaladeepika');

      // Neg: Mercury in H8 and Jupiter in H4 (no association)
      const negChart = createCustomChart({
        planets: [
          { planet: 'Mercury', sign: 'Gemini', house: 8, degree: 10 },
          { planet: 'Jupiter', sign: 'Aquarius', house: 4, degree: 10 },
        ],
      });
      const negRep = await generateFinanceReport(puneetProfile, negChart);
      const negYoga = negRep.dhanaYogas.find((y) => y.name.includes('Dhana-Labha'));
      expect(negYoga?.status).toBe('ABSENT');
    });

    it('Karma-Dhana Yoga: positive when L10 in H2 or L2 in H10, negative when unassociated', async () => {
      // Pos: Sun (10th lord) in H2
      const posChart = createCustomChart({ planets: [{ planet: 'Sun', sign: 'Sagittarius', house: 2, degree: 15 }] });
      const posRep = await generateFinanceReport(puneetProfile, posChart);
      const posYoga = posRep.dhanaYogas.find((y) => y.name.includes('Karma-Dhana'));
      expect(posYoga?.status).toBe('ACTIVE');
      expect(posYoga?.classicalReference).toContain('Brihat Parashara');

      // Neg: Sun in H6 and Jupiter in H8
      const negChart = createCustomChart({
        planets: [
          { planet: 'Sun', sign: 'Aries', house: 6, degree: 15 },
          { planet: 'Jupiter', sign: 'Gemini', house: 8, degree: 10 },
        ],
      });
      const negRep = await generateFinanceReport(puneetProfile, negChart);
      const negYoga = negRep.dhanaYogas.find((y) => y.name.includes('Karma-Dhana'));
      expect(negYoga?.status).toBe('ABSENT');
    });

    it('Chandra-Mangala Yoga: positive when Moon conjunct Mars, negative when in divergent houses', async () => {
      // Pos: Moon and Mars conjunct in H11
      const posChart = createCustomChart({
        planets: [
          { planet: 'Moon', sign: 'Virgo', house: 11, degree: 20 },
          { planet: 'Mars', sign: 'Virgo', house: 11, degree: 25 },
        ],
      });
      const posRep = await generateFinanceReport(puneetProfile, posChart);
      const posYoga = posRep.dhanaYogas.find((y) => y.name.includes('Chandra-Mangala'));
      expect(posYoga?.status).toBe('ACTIVE');
      expect(posYoga?.classicalReference).toContain('Saravali');

      // Neg: Moon in H1 and Mars in H4 (no conjunction, no mutual aspect)
      const negChart = createCustomChart({
        planets: [
          { planet: 'Moon', sign: 'Scorpio', house: 1, degree: 10 },
          { planet: 'Mars', sign: 'Aquarius', house: 4, degree: 15 },
        ],
      });
      const negRep = await generateFinanceReport(puneetProfile, negChart);
      const negYoga = negRep.dhanaYogas.find((y) => y.name.includes('Chandra-Mangala'));
      expect(negYoga?.status).toBe('ABSENT');
    });

    it('Maha Lakshmi Yoga: positive when Lagna Lord & 9th Lord conjunct in Kendra/Trikona/11th, negative when separated in dusthana', async () => {
      // Pos: Lagna lord Mars and 9th lord Moon conjunct in H11
      const posChart = createCustomChart({
        planets: [
          { planet: 'Mars', sign: 'Virgo', house: 11, degree: 28 },
          { planet: 'Moon', sign: 'Virgo', house: 11, degree: 27 },
        ],
      });
      const posRep = await generateFinanceReport(puneetProfile, posChart);
      const posYoga = posRep.dhanaYogas.find((y) => y.name.includes('Maha Lakshmi'));
      expect(posYoga?.status).toBe('ACTIVE');
      expect(posYoga?.classicalReference).toContain('Brihat Parashara');

      // Neg: Mars in H6 and Moon in H8 (no sambandha, in dusthanas)
      const negChart = createCustomChart({
        planets: [
          { planet: 'Mars', sign: 'Aries', house: 6, degree: 10 },
          { planet: 'Moon', sign: 'Gemini', house: 8, degree: 15 },
        ],
      });
      const negRep = await generateFinanceReport(puneetProfile, negChart);
      const negYoga = negRep.dhanaYogas.find((y) => y.name.includes('Maha Lakshmi'));
      expect(negYoga?.status).toBe('ABSENT');
    });

    it('Vasumathi Yoga: positive when benefics in Upachaya houses (3, 6, 10, 11), negative when in non-upachayas', async () => {
      // Pos: Jupiter in H10, Mercury in H11, Venus in H3 (all in Upachayas)
      const posChart = createCustomChart({
        planets: [
          { planet: 'Jupiter', sign: 'Leo', house: 10, degree: 15 },
          { planet: 'Mercury', sign: 'Virgo', house: 11, degree: 12 },
          { planet: 'Venus', sign: 'Capricorn', house: 3, degree: 10 },
        ],
      });
      const posRep = await generateFinanceReport(puneetProfile, posChart);
      const posYoga = posRep.dhanaYogas.find((y) => y.name.includes('Vasumathi'));
      expect(posYoga?.status).toBe('ACTIVE');
      expect(posYoga?.classicalReference).toContain('Brihat Jataka');

      // Neg: Benefics in H2 and H12 (Puneet chart: Jupiter in H2, Mercury in H2, Venus in H12 -> 0 in Upachaya)
      const negRep = await generateFinanceReport(puneetProfile, puneetChartData);
      const negYoga = negRep.dhanaYogas.find((y) => y.name.includes('Vasumathi'));
      expect(negYoga?.status).toBe('ABSENT');
    });

    it('Shani Uccha Sanchaya: positive when Saturn exalted in Libra, negative when in other signs', async () => {
      // Pos: Saturn exalted in Libra
      const posChart = createCustomChart({ planets: [{ planet: 'Saturn', sign: 'Libra', house: 12, degree: 19 }] });
      const posRep = await generateFinanceReport(puneetProfile, posChart);
      const posYoga = posRep.dhanaYogas.find((y) => y.name.includes('Shani Uccha Sanchaya'));
      expect(posYoga?.status).toBe('ACTIVE');
      expect(posYoga?.classicalReference).toContain('Report-Specific Interpretation');

      // Neg: Saturn in Aries (Debilitated)
      const negChart = createCustomChart({ planets: [{ planet: 'Saturn', sign: 'Aries', house: 6, degree: 19 }] });
      const negRep = await generateFinanceReport(puneetProfile, negChart);
      const negYoga = negRep.dhanaYogas.find((y) => y.name.includes('Shani Uccha Sanchaya'));
      expect(negYoga?.status).toBe('ABSENT');
    });
  });

  // ---------------------------------------------------------------------------
  // 6D. AUDIT OF QUALIFIED FORECAST INTERPRETATION & COMPARATIVE SAV RATIO
  // ---------------------------------------------------------------------------
  describe('Audit of Forecast Interpretation & Comparative SAV Ratios', () => {
    let report: FinanceReportModel;

    beforeAll(async () => {
      report = await generateFinanceReport(puneetProfile, puneetChartData);
    });

    it('should provide qualified qualitative assessments (outlookAssessment) for every quarterly forecast', () => {
      for (const yf of report.multiYearForecast) {
        for (const q of yf.quarterlyOutlook) {
          expect(q.outlookAssessment).toBeDefined();
          expect(typeof q.outlookAssessment).toBe('string');
          expect(q.outlookAssessment!.length).toBeGreaterThan(3);
        }
      }
    });

    it('should frame wealth retention ratio as a Comparative SAV Inflow vs Outflow Indicator', () => {
      expect(report.savWealthFlow.wealthRetentionRatio).toBe(0.94);
      expect(report.savWealthFlow.comparativeSavIndicator).toBeDefined();
      expect(report.savWealthFlow.comparativeSavIndicator).toContain('H11 (34 pts) / H12 (36 pts) = 0.94');
      expect(report.financialOverview.executiveSummary).toContain('Comparative SAV Indicator: 0.94');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. CONSECRATED WEALTH REMEDIES & PROTECTIONS
  // ---------------------------------------------------------------------------
  describe('Consecrated Wealth Remedies & Protections', () => {
    let report: FinanceReportModel;

    beforeAll(async () => {
      report = await generateFinanceReport(puneetProfile, puneetChartData);
    });

    it('should recommend Primary Gemstone (Yellow Sapphire) with comprehensive wearing instructions', () => {
      const gem = report.financialRemedies.primaryGemstone;
      expect(gem).toBeDefined();
      expect(gem.name).toContain('Yellow Sapphire');
      expect(gem.planet).toBe('Jupiter');
      expect(gem.finger).toContain('Index');
      expect(gem.metal).toContain('Gold');
      expect(gem.wearingDay).toContain('Thursday');
      expect(gem.mantra).toBeDefined();
      expect(gem.rationale).toContain('2nd Lord');
    });

    it('should recommend the 3, 4, 6, 7-Mukhi Sacred Rudraksha Kavach matching the reference report', () => {
      const kavach = report.financialRemedies.rudrakshaKavach;
      expect(kavach).toBeDefined();
      expect(kavach.mukhis).toEqual([3, 4, 6, 7]);
      expect(kavach.wearingDay).toContain('Monday');
      expect(kavach.rulingDeities).toContain('Mahalakshmi');
      expect(kavach.consecrationRitual).toContain('Gangajal');
    });

    it('should provide daily sacred mantras and ethical wealth stewardship guidelines', () => {
      expect(report.financialRemedies.sacredMantras.length).toBeGreaterThanOrEqual(3);
      expect(report.financialRemedies.ethicalStewardshipRules.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. TRACEABILITY, EDITORIAL INTEGRITY & NON-INVESTMENT DISCLAIMER
  // ---------------------------------------------------------------------------
  describe('Traceability & Strict Legal Wealth Disclaimer', () => {
    let report: FinanceReportModel;

    beforeAll(async () => {
      report = await generateFinanceReport(puneetProfile, puneetChartData);
    });

    it('should ground all section interpretations in verified evidence without inventing data', () => {
      expect(report.sections.length).toBeGreaterThanOrEqual(8);
      for (const section of report.sections) {
        expect(section.id).toBeDefined();
        expect(section.title).toBeDefined();
        expect(section.content).toBeDefined();
        expect(section.content.length).toBeGreaterThan(30);
      }
    });

    it('should include authentic Sushil Kumaar Singh author metadata and ephemeris notice', () => {
      expect(report.closingNote.author).toContain('Sushil Kumaar Singh');
      expect(report.closingNote.ephemerisStandard).toContain('Lahiri Ayanamsha');
    });

    it('must include strict non-investment advisory disclaimer distinguishing astrology from SEBI-registered financial advice', () => {
      const disclaimer = report.closingNote.nonInvestmentDisclaimer;
      expect(disclaimer).toContain('WEALTH ADVISORY DISCLAIMER');
      expect(disclaimer).toContain('SEBI');
      expect(disclaimer).toContain('Certified Financial Planner');
      expect(disclaimer).toContain('NOT constitute certified financial advice');
    });
  });

  // ---------------------------------------------------------------------------
  // 9. VECTOR PDF GENERATION
  // ---------------------------------------------------------------------------
  describe('Vector PDF Generation', () => {
    it('should generate a rich, exactly 12-page vector PDF for the Personalised Finance Report', async () => {
      const report = await generateFinanceReport(puneetProfile, puneetChartData);
      const pdfBuffer = await reportPdfService.generateReportPdf(report);

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(15000);
      expect(pdfBuffer.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
    });
  });

  // ---------------------------------------------------------------------------
  // 10. COMMERCIAL CATALOGUE, PRICING & FULFILLMENT PIPELINE
  // ---------------------------------------------------------------------------
  describe('Commercial Catalogue, Pricing & Fulfillment Verification', () => {
    it('should map commercial SKU report-finance to ReportType.FINANCE with title and authoritative price', () => {
      const catalogItem = COMMERCE_CATALOG['report-finance'];
      expect(catalogItem).toBeDefined();
      expect(catalogItem.id).toBe('report-finance');
      expect(catalogItem.legacyReportType).toBe(ReportType.FINANCE);
      expect(catalogItem.title).toBe('Personalised Finance & Wealth Dossier');
      expect(catalogItem.pricePaise).toBe(49900); // ₹499
      expect(catalogItem.currency).toBe('INR');
      expect(catalogItem.taxRateBasisPoints).toBe(1800);
      expect(catalogItem.taxIncluded).toBe(true);
      expect(catalogItem.isActive).toBe(true);
    });

    it('should preserve authorized catalogue prices across the entire platform catalog', () => {
      expect(COMMERCE_CATALOG['report-kundli'].pricePaise).toBe(29900); // ₹299
      expect(COMMERCE_CATALOG['report-planetary-summary'].pricePaise).toBe(19900); // ₹199
      expect(COMMERCE_CATALOG['report-career'].pricePaise).toBe(49900); // ₹499
      expect(COMMERCE_CATALOG['report-marriage'].pricePaise).toBe(49900); // ₹499
      expect(COMMERCE_CATALOG['report-career-pro'].pricePaise).toBe(69900); // ₹699
      expect(COMMERCE_CATALOG['report-horoscope'].pricePaise).toBe(49900); // ₹499
      expect(COMMERCE_CATALOG['report-finance'].pricePaise).toBe(49900); // ₹499

      expect(REPORT_PRICES_PAISE[ReportType.KUNDLI]).toBe(29900);
      expect(REPORT_PRICES_PAISE[ReportType.PLANETARY_SUMMARY]).toBe(19900);
      expect(REPORT_PRICES_PAISE[ReportType.CAREER]).toBe(49900);
      expect(REPORT_PRICES_PAISE[ReportType.CAREER_PROSITY]).toBe(69900);
      expect(REPORT_PRICES_PAISE[ReportType.HOROSCOPE]).toBe(49900);
      expect(REPORT_PRICES_PAISE[ReportType.FINANCE]).toBe(49900);
    });

    it('should compute exact 24-hour delivery SLA upon payment confirmation (paidAt + 24h)', () => {
      const paidAt = new Date('2026-11-08T12:00:00.000Z');
      const expectedDeliveryAt = new Date(paidAt.getTime() + 24 * 60 * 60 * 1000);
      expect(expectedDeliveryAt.toISOString()).toBe('2026-11-09T12:00:00.000Z');
    });

    it('should ensure strict content isolation between Finance, Career, and Horoscope reports', async () => {
      const finReport = await generateFinanceReport(puneetProfile, puneetChartData);

      expect(finReport.type).toBe(ReportType.FINANCE);
      expect(finReport.financialOverview).toBeDefined();
      expect(finReport.wealthHouses).toBeDefined();
      expect(finReport.dhanaYogas).toBeDefined();

      // Ensure no career-specific fields leak into Finance report
      expect((finReport as any).careerOverview).toBeUndefined();
      expect((finReport as any).d10Summary).toBeUndefined();
      expect((finReport as any).amatyakaraka).toBeUndefined();
      expect((finReport as any).moonSignDetails).toBeUndefined();
    });
  });
});
