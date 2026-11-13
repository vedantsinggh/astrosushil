import { describe, it, expect } from 'vitest';
import {
  generateFortunePlusReport,
  generateFortunePlusReportData,
  calculateSuccessNumber,
  calculateConnectionNumber,
  calculateMaturityNumber,
  calculateLifePinnacles,
  calculateLalKitabPlacements,
  THREE_REMEDY_CAUTION_RULE,
  FORTUNE_PLUS_DISCLAIMER,
  FORTUNE_PLUS_CLOSING_AUTHOR,
} from '../../../../packages/report-engine/src/generators/fortune-plus-report.generator';
import {
  ReportType,
  FortunePlusReportModel,
} from '../../../../packages/report-engine/src/types/report.types';
import { reportPdfService } from '../../../../packages/report-engine/src/pdf/report-pdf.service';
import { COMMERCE_CATALOG } from '../../src/modules/commerce/commerce.catalog';
import { REPORT_PRICES_PAISE, paymentService } from '../../src/services/payment.service';
import { featureAccessService } from '../../src/services/feature-access.service';
import { CareerReportWorker } from '../../src/services/report-worker.service';

describe('Phase 6.11: Personalised Fortune Plus Integration & Verification Suite', () => {
  const puneetProfile = {
    name: 'Puneet Kumar',
    dateOfBirth: '1983-12-28',
    timeOfBirth: '04:45',
    placeName: 'Bulandshahr, Uttar Pradesh, India',
    timezone: 'Asia/Kolkata',
    latitude: 28.4069,
    longitude: 77.8498,
    gender: 'MALE',
  };

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
  // 1. INPUT VALIDATION TESTS
  // ---------------------------------------------------------------------------
  describe('Input Validation', () => {
    it('should successfully validate canonical profile input', async () => {
      const report = await generateFortunePlusReport(puneetProfile, puneetChartData);
      expect(report).toBeDefined();
      expect(report.type).toBe(ReportType.FORTUNE_PLUS);
      expect(report.profile.name).toBe('Puneet Kumar');
    });

    it('should reject missing birth name', async () => {
      await expect(
        generateFortunePlusReport({ ...puneetProfile, name: '' }, puneetChartData)
      ).rejects.toThrow(/Name is required/);
    });

    it('should reject missing or malformed birth date', async () => {
      await expect(
        generateFortunePlusReport({ ...puneetProfile, dateOfBirth: '28-12-1983' }, puneetChartData)
      ).rejects.toThrow(/date of birth/i);
    });

    it('should reject missing or malformed birth time', async () => {
      await expect(
        generateFortunePlusReport({ ...puneetProfile, timeOfBirth: 'invalid' }, puneetChartData)
      ).rejects.toThrow(/time of birth/i);
    });

    it('should reject invalid timezone identifier', async () => {
      await expect(
        generateFortunePlusReport({ ...puneetProfile, timezone: 'Mars/Phobos' }, puneetChartData)
      ).rejects.toThrow(/timezone/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. DETERMINISTIC CALCULATIONS & REFERENCE FIDELITY
  // ---------------------------------------------------------------------------
  describe('Deterministic Calculations & Reference Fidelity', () => {
    it('should compute exact Success Number 4, Connection Number 6, and Maturity Number 4 for Puneet Kumar', async () => {
      const report = await generateFortunePlusReport(puneetProfile, puneetChartData);

      expect(report.areYouOnRightPath.successNumber).toBe(4);
      expect(report.areYouOnRightPath.connectionNumber).toBe(6);
      expect(report.areYouOnRightPath.maturityNumber).toBe(4);

      expect(report.areYouOnRightPath.successNumberQualities.length).toBeGreaterThan(0);
      expect(report.areYouOnRightPath.connectionNumberSynthesis).toContain('Connection Number 6');
    });

    it('should compute exact 4 Life Pinnacles matching reference PDF pages 63-66', async () => {
      const report = await generateFortunePlusReport(puneetProfile, puneetChartData);
      const pinnacles = report.lifePinnacles;

      expect(pinnacles).toHaveLength(4);
      expect(pinnacles[0].pinnacleNumber).toBe(4);
      expect(pinnacles[0].ageRange).toBe('0-29');

      expect(pinnacles[1].pinnacleNumber).toBe(4);
      expect(pinnacles[1].ageRange).toBe('29-38');

      expect(pinnacles[2].pinnacleNumber).toBe(8);
      expect(pinnacles[2].ageRange).toBe('38-47');

      expect(pinnacles[3].pinnacleNumber).toBe(6);
      expect(pinnacles[3].ageRange).toBe('from 47 onwards');
    });

    it('should construct the 4 Vedic charts quadrant including Lal Kitab chart with Aries as House 1', async () => {
      const report = await generateFortunePlusReport(puneetProfile, puneetChartData);
      const charts = report.cosmicPathway.charts;

      expect(charts.lagna).toHaveLength(12);
      expect(charts.moon).toHaveLength(12);
      expect(charts.navamsha).toHaveLength(12);
      expect(charts.lalKitab).toHaveLength(12);

      // Verify Lal Kitab Aries House 1
      expect(charts.lalKitab[0].houseNumber).toBe(1);
      expect(charts.lalKitab[0].sign).toBe('Aries');
      expect(charts.lalKitab[0].planetsPresent).toEqual(['VENUS', 'KETU']);

      // House 2 is Taurus
      expect(charts.lalKitab[1].houseNumber).toBe(2);
      expect(charts.lalKitab[1].sign).toBe('Taurus');
      expect(charts.lalKitab[1].planetsPresent).toEqual(['SUN', 'MERCURY', 'JUPITER']);
    });

    it('should strictly enforce the Three-Remedy Caution Rule', async () => {
      const report = await generateFortunePlusReport(puneetProfile, puneetChartData);
      expect(report.threeRemedyCautionRule).toContain('select and perform no more than three remedies at a time');
      expect(report.threeRemedyCautionRule).not.toContain('minimum three remedies');
    });

    it('should provide complete everyday lucky items matching reference Page 71', async () => {
      const report = await generateFortunePlusReport(puneetProfile, puneetChartData);
      expect(report.everydayLuckyItems.luckyEmailId).toBe('puneet_kumar@gmail.com');
      expect(report.everydayLuckyItems.luckyBanks).toContain('Bank of India');
      expect(report.everydayLuckyItems.luckyBanks).toContain('ICICI Bank');
      expect(report.everydayLuckyItems.luckyTattoo).toContain('Capricorn');
      expect(report.everydayLuckyItems.signatureAdvice).toContain('15° to 20°');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. VECTOR PDF GENERATION (35 CANONICAL PAGES)
  // ---------------------------------------------------------------------------
  describe('Vector PDF Generation', () => {
    it('should generate an immaculate, exactly 35-page vector PDF for Personalised Fortune Plus', async () => {
      const report = await generateFortunePlusReport(puneetProfile, puneetChartData);
      const pdfBuffer = await reportPdfService.generateReportPdf(report);

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(15000);
      expect(pdfBuffer.toString('latin1', 0, 5)).toBe('%PDF-');

      const pdfContent = pdfBuffer.toString('latin1');
      const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g);
      expect(pageMatches).toBeDefined();
      expect(pageMatches?.length).toBe(35);

      // Verify key tokens
      expect(pdfContent).toContain('PERSONALISED FORTUNE REPORT PLUS');
      expect(pdfContent).toContain('SUCCESS NUMBER : 4');
      expect(pdfContent).toContain('CONNECTION NUMBER : 6');
      expect(pdfContent).toContain('MATURITY NUMBER : 4');
      expect(pdfContent).toContain('MANDATORY THREE-REMEDY CAUTION RULE');
      expect(pdfContent).toContain('Page 1 of 35');
      expect(pdfContent).toContain('Page 35 of 35');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. COMMERCIAL CATALOGUE, PRICING & CHECKOUT BLOCKING
  // ---------------------------------------------------------------------------
  describe('Commercial Catalogue, Pricing & Checkout Blocking', () => {
    it('should preserve existing report-fortune SKU at ₹499 without modification', () => {
      const fortuneSku = COMMERCE_CATALOG['report-fortune'];
      expect(fortuneSku).toBeDefined();
      expect(fortuneSku.pricePaise).toBe(49900); // ₹499
      expect(fortuneSku.isActive).toBe(true);
      expect(fortuneSku.legacyReportType).toBe(ReportType.FORTUNE);
    });

    it('should register report-fortune-plus inactive at 0 paise pending commercial pricing', () => {
      const fortunePlusSku = COMMERCE_CATALOG['report-fortune-plus'];
      expect(fortunePlusSku).toBeDefined();
      expect(fortunePlusSku.pricePaise).toBe(0);
      expect(fortunePlusSku.isActive).toBe(false);
      expect(fortunePlusSku.legacyReportType).toBe(ReportType.FORTUNE_PLUS);
      expect(REPORT_PRICES_PAISE[ReportType.FORTUNE_PLUS]).toBe(0);
    });

    it('should block checkout for report-fortune-plus due to unresolved commercial pricing', async () => {
      const pricePaise = REPORT_PRICES_PAISE[ReportType.FORTUNE_PLUS];
      expect(pricePaise).toBe(0);
      await expect(
        paymentService.createRazorpayOrder(pricePaise)
      ).rejects.toThrow(/Approved pricing is pending sign-off/);
    });

    it('should configure feature access and worker routing for FORTUNE_PLUS', () => {
      const catalog = featureAccessService.getCatalog();
      const fortunePlusFeature = catalog.find((f) => f.code === 'FORTUNE_PLUS_REPORT' || f.code === 'FORTUNE_PLUS');
      expect(fortunePlusFeature).toBeDefined();
      expect(fortunePlusFeature?.isFree).toBe(false);

      expect(CareerReportWorker.SUPPORTED_REPORT_TYPES).toContain('FORTUNE_PLUS');
    });
  });
});
