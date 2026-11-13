import { describe, it, expect } from 'vitest';
import {
  generateVarshphalReport,
  reportPdfService,
  ReportType,
  VarshphalReportModel,
} from '../../../../packages/report-engine/src/index';
import {
  ChartCalculator,
  AstronomyEngineAdapter,
  DEFAULT_ASTROLOGY_CONFIG,
} from '../../../../packages/astrology-engine/src/index';
import { COMMERCE_CATALOG, commerceCatalog } from '../../src/modules/commerce/commerce.catalog';
import { REPORT_PRICES_PAISE } from '../../src/services/payment.service';
import { featureAccessService } from '../../src/services/feature-access.service';

describe('Phase 6.10: Varshphal (Annual Solar Return) Report Integration Suite', () => {
  const chartCalculator = new ChartCalculator(new AstronomyEngineAdapter());

  const puneetProfile = {
    name: 'Puneet Kumar',
    dateOfBirth: '1983-12-28',
    timeOfBirth: '04:45:00',
    placeName: 'Bulandshahr, Uttar Pradesh, India',
    timezone: 'Asia/Kolkata',
    latitude: 28.4069,
    longitude: 77.8498,
    gender: 'MALE',
  };

  const untimedProfile = {
    name: 'Puneet Kumar (Untimed)',
    dateOfBirth: '1983-12-28',
    timeOfBirth: '00:00:00',
    placeName: 'Bulandshahr, Uttar Pradesh, India',
    timezone: 'Asia/Kolkata',
    latitude: 28.4069,
    longitude: 77.8498,
    gender: 'MALE',
    isTimeUnknown: true,
  };

  const reportConfig = {
    zodiacType: 'SIDEREAL',
    ayanamsa: 'LAHIRI',
    houseSystem: 'WHOLE_SIGN',
    nodeCalculation: 'MEAN_NODE',
  };

  // ---------------------------------------------------------------------------
  // 1. COMMERCE, CATALOG & PRICING INTEGRATION (STRICT RELEASE BLOCKER SAFEGUARDS)
  // ---------------------------------------------------------------------------
  describe('Commerce, Catalog & Strict Pricing Safeguards', () => {
    it('verifies Varshphal Report catalog entry has pricing unresolved (0 paise) and is inactive', () => {
      const item = COMMERCE_CATALOG['report-varshphal'];
      expect(item).toBeDefined();
      expect(item.id).toBe('report-varshphal');
      expect(item.pricePaise).toBe(0); // STRICT RELEASE BLOCKER: 0 paise pending commercial sign-off
      expect(item.currency).toBe('INR');
      expect(item.legacyReportType).toBe(ReportType.VARSHPHAL);
      expect(item.isActive).toBe(false); // Strictly inactive
      expect(item.fulfillmentType).toBe('DIGITAL');
    });

    it('verifies payment service price mapping for VARSHPHAL report is 0 paise', () => {
      expect(REPORT_PRICES_PAISE[ReportType.VARSHPHAL]).toBe(0);
    });

    it('verifies all existing active report prices remain 100% untouched and preserved', () => {
      expect(REPORT_PRICES_PAISE[ReportType.KUNDLI]).toBe(29900);
      expect(REPORT_PRICES_PAISE[ReportType.HOROSCOPE]).toBe(49900);
      expect(REPORT_PRICES_PAISE[ReportType.CAREER]).toBe(49900);
      expect(REPORT_PRICES_PAISE[ReportType.CAREER_PROSITY]).toBe(69900);
      expect(REPORT_PRICES_PAISE[ReportType.FINANCE]).toBe(49900);
      expect(REPORT_PRICES_PAISE[ReportType.LOVE]).toBe(49900);
      expect(REPORT_PRICES_PAISE[ReportType.FORTUNE]).toBe(49900);
      expect(REPORT_PRICES_PAISE[ReportType.SATURN]).toBe(49900);
      expect(REPORT_PRICES_PAISE[ReportType.MARRIAGE_COMPATIBILITY]).toBe(49900);
    });

    it('verifies feature access service catalog registration for VARSHPHAL', () => {
      const catalog = featureAccessService.getCatalog();
      const varshphalFeature = catalog.find((f) => f.code === 'VARSHPHAL');
      const varshphalReportFeature = catalog.find((f) => f.code === 'VARSHPHAL_REPORT');

      expect(varshphalFeature).toBeDefined();
      expect(varshphalFeature?.isFree).toBe(false);
      expect(varshphalFeature?.reportTypeKey).toBe('VARSHPHAL');

      expect(varshphalReportFeature).toBeDefined();
      expect(varshphalReportFeature?.isFree).toBe(false);
      expect(varshphalReportFeature?.reportTypeKey).toBe('VARSHPHAL');
    });

    it('blocks order creation for inactive report-varshphal offering', () => {
      expect(() => {
        commerceCatalog.calculateOrder([{ catalogId: 'report-varshphal', quantity: 1 }]);
      }).toThrow(/currently inactive or unavailable/);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. DETERMINISTIC ASTROLOGICAL CALCULATION & REPORT MODEL ACCURACY
  // ---------------------------------------------------------------------------
  describe('Astrological Calculations & Model Integrity', () => {
    it('generates complete, deterministic VarshphalReportModel for Puneet Kumar 2026 fixture', async () => {
      const natalBirthDetails = {
        date: { year: 1983, month: 12, day: 28 },
        time: { hour: 4, minute: 45, second: 0 },
        latitude: 28.4069,
        longitude: 77.8498,
        timezone: 'Asia/Kolkata',
      };

      const natalChart = await chartCalculator.calculateChart(natalBirthDetails, DEFAULT_ASTROLOGY_CONFIG);

      const report: VarshphalReportModel = await generateVarshphalReport(
        puneetProfile as any,
        reportConfig as any,
        natalChart,
        undefined,
        { targetYear: 2026 }
      );

      expect(report.type).toBe(ReportType.VARSHPHAL);
      expect(report.targetYear).toBe(2026);

      // Solar Return validation
      expect(report.solarReturn.age).toBe(43);
      expect(report.solarReturn.angularErrorDegrees).toBeLessThan(0.0001);

      // Varsha Lagna: Scorpio (Vrischika) ~15.86°
      expect(report.varshaLagna.sign).toBe('Vrischika');
      expect(report.varshaLagna.signIndex).toBe(8);
      expect(report.varshaLagna.degreeInRashi).toBeCloseTo(15.86, 1);

      // Muntha: Gemini (Mithuna) in 8th house (matching reference PDF Page 19)
      expect(report.muntha.rashiName).toBe('Mithuna');
      expect(report.muntha.rashiIndex).toBe(3);
      expect(report.muntha.houseInVarshaChart).toBe(8);
      expect(report.muntha.houseInNatalChart).toBe(8);

      // Varshesh (Year Lord)
      expect(report.varshesha.candidates.length).toBeGreaterThanOrEqual(5);
      expect(report.varshesha.selectedVarshesha).toBeDefined();

      // Harsha Bala
      expect(report.harshaBala.scores).toBeDefined();
      const scoredPlanets = Object.keys(report.harshaBala.scores);
      expect(scoredPlanets.length).toBeGreaterThanOrEqual(7);

      // Tajika Yogas
      expect(report.tajikaYogas.length).toBeGreaterThanOrEqual(1);

      // Mudda Dasha Timeline
      expect(report.muddaDasha.length).toBeGreaterThanOrEqual(9);

      // 12-Month Performance Matrix
      expect(report.monthlyForecasts).toHaveLength(12);

      // Consecrated Remedies & Caution Rule
      expect(report.panchangRemedies.length).toBeGreaterThanOrEqual(3);
      expect(report.remedyCaution).toContain('no more than three remedies');
    });

    it('handles untimed birth profile gracefully', async () => {
      const natalBirthDetails = {
        date: { year: 1983, month: 12, day: 28 },
        time: { hour: 12, minute: 0, second: 0 },
        latitude: 28.4069,
        longitude: 77.8498,
        timezone: 'Asia/Kolkata',
      };

      const untimedChart = {
        ...(await chartCalculator.calculateChart(natalBirthDetails, DEFAULT_ASTROLOGY_CONFIG)),
        isTimeUnknown: true,
        ascendant: undefined,
      };

      const report = await generateVarshphalReport(
        untimedProfile as any,
        reportConfig as any,
        untimedChart,
        undefined,
        { allowUnknownBirthTime: true, targetYear: 2026 }
      );

      expect(report.type).toBe(ReportType.VARSHPHAL);
      expect(report.targetYear).toBe(2026);
      expect(report.solarReturn).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. VECTOR PDF GENERATION & 16-PAGE VALIDATION
  // ---------------------------------------------------------------------------
  describe('Vector PDF Rendering & Deliverables', () => {
    it('generates a strict 16-page vector PDF artifact with zero defects', async () => {
      const natalBirthDetails = {
        date: { year: 1983, month: 12, day: 28 },
        time: { hour: 4, minute: 45, second: 0 },
        latitude: 28.4069,
        longitude: 77.8498,
        timezone: 'Asia/Kolkata',
      };

      const natalChart = await chartCalculator.calculateChart(natalBirthDetails, DEFAULT_ASTROLOGY_CONFIG);

      const report = await generateVarshphalReport(
        puneetProfile as any,
        reportConfig as any,
        natalChart,
        undefined,
        { targetYear: 2026 }
      );

      const pdfBuffer = await reportPdfService.generateReportPdf(report);

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(50000);
      expect(pdfBuffer.toString('utf-8', 0, 8)).toContain('%PDF-1.4');

      // Count pages in PDF stream
      const pageMatches = pdfBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
      expect(pageMatches).not.toBeNull();
      expect(pageMatches!).toHaveLength(16);
    });
  });
});
