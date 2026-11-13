import { describe, it, expect } from 'vitest';
import {
  generateJupiterReport,
  generateRahuKetuReport,
  reportPdfService,
  ReportType,
  JupiterReportModel,
  RahuKetuReportModel,
} from '../../../../packages/report-engine/src/index';
import {
  ChartCalculator,
  AstronomyEngineAdapter,
  DEFAULT_ASTROLOGY_CONFIG,
} from '../../../../packages/astrology-engine/src/index';
import { COMMERCE_CATALOG, commerceCatalog } from '../../src/modules/commerce/commerce.catalog';
import { REPORT_PRICES_PAISE } from '../../src/services/payment.service';
import { featureAccessService } from '../../src/services/feature-access.service';

describe('Phase 6.9: Jupiter Transit & Rahu-Ketu Transit Reports Integration Suite', () => {
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
  // 1. COMMERCE, CATALOG & PRICING INTEGRATION (STRICT RELEASE BLOCKER ENFORCEMENT)
  // ---------------------------------------------------------------------------
  describe('Commerce, Catalog & Strict Pricing Safeguards', () => {
    it('verifies Jupiter Transit Report catalog entry has pricing unresolved (0 paise) and is inactive', () => {
      const item = COMMERCE_CATALOG['report-jupiter-transit'];
      expect(item).toBeDefined();
      expect(item.id).toBe('report-jupiter-transit');
      expect(item.pricePaise).toBe(0); // STRICT RELEASE BLOCKER
      expect(item.currency).toBe('INR');
      expect(item.legacyReportType).toBe(ReportType.JUPITER_TRANSIT);
      expect(item.isActive).toBe(false); // blocked until authorized pricing is assigned
      expect(item.fulfillmentType).toBe('DIGITAL');
    });

    it('verifies Rahu-Ketu Transit Report catalog entry has pricing unresolved (0 paise) and is inactive', () => {
      const item = COMMERCE_CATALOG['report-rahu-ketu-transit'];
      expect(item).toBeDefined();
      expect(item.id).toBe('report-rahu-ketu-transit');
      expect(item.pricePaise).toBe(0); // STRICT RELEASE BLOCKER
      expect(item.currency).toBe('INR');
      expect(item.legacyReportType).toBe(ReportType.RAHU_KETU_TRANSIT);
      expect(item.isActive).toBe(false); // blocked until authorized pricing is assigned
      expect(item.fulfillmentType).toBe('DIGITAL');
    });

    it('blocks purchase attempts for inactive zero-price transit reports in commerce catalog', () => {
      // Direct catalog calculation safeguard
      expect(() =>
        commerceCatalog.calculateOrder([{ catalogId: 'report-jupiter-transit', quantity: 1 }])
      ).toThrow(/currently inactive or unavailable/i);

      expect(() =>
        commerceCatalog.calculateOrder([{ catalogId: 'report-rahu-ketu-transit', quantity: 1 }])
      ).toThrow(/currently inactive or unavailable/i);
    });

    it('strictly preserves existing commercial report prices', () => {
      expect(REPORT_PRICES_PAISE[ReportType.SATURN]).toBe(49900); // strictly ₹499
      expect(REPORT_PRICES_PAISE[ReportType.MARRIAGE_COMPATIBILITY]).toBe(49900); // strictly ₹499
      expect(REPORT_PRICES_PAISE[ReportType.CAREER]).toBe(49900); // strictly ₹499
      expect(REPORT_PRICES_PAISE[ReportType.KUNDLI]).toBe(29900); // strictly ₹299
      expect(REPORT_PRICES_PAISE[ReportType.FINANCE]).toBe(49900); // strictly ₹499
      expect(REPORT_PRICES_PAISE[ReportType.LOVE]).toBe(49900); // strictly ₹499
      expect(REPORT_PRICES_PAISE[ReportType.FORTUNE]).toBe(49900); // strictly ₹499
    });

    it('verifies payment service price mapping holds 0 paise for both reports', () => {
      expect(REPORT_PRICES_PAISE[ReportType.JUPITER_TRANSIT]).toBe(0);
      expect(REPORT_PRICES_PAISE[ReportType.RAHU_KETU_TRANSIT]).toBe(0);
    });

    it('verifies feature access service catalog registration for Jupiter and Rahu-Ketu', () => {
      const catalog = featureAccessService.getCatalog();

      const jupiterFeature = catalog.find((f) => f.code === 'JUPITER_TRANSIT');
      const jupiterReportFeature = catalog.find((f) => f.code === 'JUPITER_TRANSIT_REPORT');
      expect(jupiterFeature).toBeDefined();
      expect(jupiterFeature?.reportTypeKey).toBe('JUPITER_TRANSIT');
      expect(jupiterReportFeature).toBeDefined();
      expect(jupiterReportFeature?.reportTypeKey).toBe('JUPITER_TRANSIT');

      const rahuKetuFeature = catalog.find((f) => f.code === 'RAHU_KETU_TRANSIT');
      const rahuKetuReportFeature = catalog.find((f) => f.code === 'RAHU_KETU_TRANSIT_REPORT');
      expect(rahuKetuFeature).toBeDefined();
      expect(rahuKetuFeature?.reportTypeKey).toBe('RAHU_KETU_TRANSIT');
      expect(rahuKetuReportFeature).toBeDefined();
      expect(rahuKetuReportFeature?.reportTypeKey).toBe('RAHU_KETU_TRANSIT');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. JUPITER TRANSIT REPORT: DETERMINISTIC ASTROLOGY & PDF COMPILATION
  // ---------------------------------------------------------------------------
  describe('Jupiter Transit Report Calculations & PDF Generation', () => {
    it('calculates deterministic Jupiter placements, 56-pt BAV and 2026 transits for Puneet Kumar', async () => {
      const birthDetails = {
        date: { year: 1983, month: 12, day: 28 },
        time: { hour: 4, minute: 45, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.4069,
        longitude: 77.8498,
        placeName: 'Bulandshahr, India',
      };

      const chart = await chartCalculator.calculateChart(birthDetails, DEFAULT_ASTROLOGY_CONFIG);
      const report: JupiterReportModel = await generateJupiterReport(puneetProfile, reportConfig, chart);

      expect(report.type).toBe(ReportType.JUPITER_TRANSIT);
      expect(report.title).toBe('Jupiter Transit Report');

      // Natal Jupiter in Sagittarius (Dhanu), House 2 (Lagna) / House 4 (Moon)
      expect(report.jupiterPlacement.sign).toContain('Dhanu');
      expect(report.jupiterPlacement.sign).toContain('Sagittarius');
      expect(report.jupiterPlacement.house).toBe(2);
      expect(report.jupiterPlacement.dignity).toBe('Moolatrikona');
      expect(report.jupiterPlacement.nakshatra).toBe('Mula');

      // 5th, 7th, 9th Aspects
      expect(report.jupiterAspects.aspects).toHaveLength(3);
      expect(report.jupiterAspects.aspects[0].aspectNumber).toBe(5);
      expect(report.jupiterAspects.aspects[0].sign).toContain('Mesha');
      expect(report.jupiterAspects.aspects[0].house).toBe(6);

      expect(report.jupiterAspects.aspects[1].aspectNumber).toBe(7);
      expect(report.jupiterAspects.aspects[1].sign).toContain('Mithuna');
      expect(report.jupiterAspects.aspects[1].house).toBe(8);

      expect(report.jupiterAspects.aspects[2].aspectNumber).toBe(9);
      expect(report.jupiterAspects.aspects[2].sign).toContain('Simha');
      expect(report.jupiterAspects.aspects[2].house).toBe(10);

      // Bhinnashtakavarga (BAV) total must equal 56 points across 12 signs
      expect(report.jupiterAshtakavarga.total).toBe(56);
      expect(report.jupiterAshtakavarga.currentGeminiPoints).toBe(3);
      expect(report.jupiterAshtakavarga.cancerPoints).toBe(6);

      // Transits
      expect(report.geminiTransit.sign).toContain('Gemini');
      expect(report.geminiTransit.houseFromLagna).toBe(8);
      expect(report.geminiTransit.houseFromMoon).toBe(10);

      expect(report.cancerTransit.sign).toContain('Cancer');
      expect(report.cancerTransit.houseFromLagna).toBe(9);
      expect(report.cancerTransit.houseFromMoon).toBe(11);

      // Leo Transit (October 31, 2026 Ingress) & Master Timeline
      expect(report.leoTransit.sign).toContain('Leo');
      expect(report.leoTransit.houseFromLagna).toBe(10);
      expect(report.leoTransit.houseFromMoon).toBe(12);
      expect(report.transitTimeline).toBeDefined();
      expect(report.transitTimeline).toHaveLength(13); // Complete 2025–2029 timeline
      const leoItem = report.transitTimeline.find((t) => t.sign.includes('Leo'));
      expect(leoItem).toBeDefined();
      expect(leoItem?.startDateIso).toBe('2026-10-31T04:46:58Z');

      // Remedies
      expect(report.remedies.gemstone.name).toContain('Yellow Sapphire');
      expect(report.remedies.rudraksha.mukhi).toContain('5 Mukhi');
    });

    it('compiles an authoritative 11-page Jupiter Transit Report PDF', async () => {
      const birthDetails = {
        date: { year: 1983, month: 12, day: 28 },
        time: { hour: 4, minute: 45, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.4069,
        longitude: 77.8498,
        placeName: 'Bulandshahr, India',
      };

      const chart = await chartCalculator.calculateChart(birthDetails, DEFAULT_ASTROLOGY_CONFIG);
      const report: JupiterReportModel = await generateJupiterReport(puneetProfile, reportConfig, chart);

      const pdfBuffer = await reportPdfService.generateReportPdf(report);
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(10000);
      expect(pdfBuffer.toString('utf-8', 0, 8)).toContain('%PDF-1.4');

      const pageMatches = pdfBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
      expect(pageMatches).not.toBeNull();
      expect(pageMatches!.length).toBe(11); // Strictly 11 pages
    });
  });

  // ---------------------------------------------------------------------------
  // 3. RAHU-KETU TRANSIT REPORT: DETERMINISTIC ASTROLOGY & PDF COMPILATION
  // ---------------------------------------------------------------------------
  describe('Rahu-Ketu Transit Report Calculations & PDF Generation', () => {
    it('calculates deterministic Rahu-Ketu axis, 180° opposition and transits for Puneet Kumar', async () => {
      const birthDetails = {
        date: { year: 1983, month: 12, day: 28 },
        time: { hour: 4, minute: 45, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.4069,
        longitude: 77.8498,
        placeName: 'Bulandshahr, India',
      };

      const chart = await chartCalculator.calculateChart(birthDetails, DEFAULT_ASTROLOGY_CONFIG);
      const report: RahuKetuReportModel = await generateRahuKetuReport(puneetProfile, reportConfig, chart);

      expect(report.type).toBe(ReportType.RAHU_KETU_TRANSIT);
      expect(report.title).toBe('Rahu Ketu Transit Report');

      // Natal Placements
      expect(report.nodalPlacement.rahu.sign).toContain('Vrishabha');
      expect(report.nodalPlacement.rahu.sign).toContain('Taurus');
      expect(report.nodalPlacement.rahu.house).toBe(7);
      expect(report.nodalPlacement.rahu.nakshatra).toBe('Rohini');

      expect(report.nodalPlacement.ketu.sign).toContain('Vrischika');
      expect(report.nodalPlacement.ketu.sign).toContain('Scorpio');
      expect(report.nodalPlacement.ketu.house).toBe(1);
      expect(report.nodalPlacement.ketu.nakshatra).toBe('Jyeshtha');

      // Exact 180.00° separation
      expect(report.nodalPlacement.axisSeparation).toBeCloseTo(180.0, 1);

      // Venus-Ketu Conjunction in 1st house Scorpio
      expect(report.nodalConjunctions.ketuConjunctions).toHaveLength(1);
      expect(report.nodalConjunctions.ketuConjunctions[0]).toBe('VENUS');

      // Transits
      expect(report.transit2025_2026.rahuSign).toContain('Aquarius');
      expect(report.transit2025_2026.ketuSign).toContain('Leo');
      expect(report.transit2026_2028.rahuSign).toContain('Capricorn');
      expect(report.transit2026_2028.ketuSign).toContain('Cancer');

      // Verified 2025–2030 Nodal Timeline
      expect(report.transitTimeline).toBeDefined();
      expect(report.transitTimeline).toHaveLength(3);
      expect(report.transitTimeline[0].startDateIso).toBe('2025-05-18T17:24:31Z');
      expect(report.transitTimeline[1].startDateIso).toBe('2026-12-05T20:22:35Z');
      expect(report.transitTimeline[2].startDateIso).toBe('2028-06-23T23:20:42Z');

      // Qualified remedies
      expect(report.remedies.gemstones.rahuGomedCaution).toContain('Caution on Hessonite');
      expect(report.remedies.rudraksha.rahuMukhi).toContain('8 Mukhi');
      expect(report.remedies.rudraksha.ketuMukhi).toContain('9 Mukhi');
    });

    it('compiles an authoritative 12-page Rahu-Ketu Transit Report PDF', async () => {
      const birthDetails = {
        date: { year: 1983, month: 12, day: 28 },
        time: { hour: 4, minute: 45, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.4069,
        longitude: 77.8498,
        placeName: 'Bulandshahr, India',
      };

      const chart = await chartCalculator.calculateChart(birthDetails, DEFAULT_ASTROLOGY_CONFIG);
      const report: RahuKetuReportModel = await generateRahuKetuReport(puneetProfile, reportConfig, chart);

      const pdfBuffer = await reportPdfService.generateReportPdf(report);
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(10000);
      expect(pdfBuffer.toString('utf-8', 0, 8)).toContain('%PDF-1.4');

      const pageMatches = pdfBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
      expect(pageMatches).not.toBeNull();
      expect(pageMatches!.length).toBe(12); // Strictly 12 pages
    });
  });

  // ---------------------------------------------------------------------------
  // 4. UNTIMED BIRTH HANDLING
  // ---------------------------------------------------------------------------
  describe('Untimed Birth Handling', () => {
    it('qualifies interpretations for untimed birth profile in Jupiter report', async () => {
      const birthDetails = {
        date: { year: 1983, month: 12, day: 28 },
        time: { hour: 12, minute: 0, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.4069,
        longitude: 77.8498,
        placeName: 'Bulandshahr, India',
      };

      const untimedChart = {
        ...(await chartCalculator.calculateChart(birthDetails, DEFAULT_ASTROLOGY_CONFIG)),
        isTimeUnknown: true,
        ascendant: undefined,
      };

      const report: JupiterReportModel = await generateJupiterReport(
        untimedProfile,
        reportConfig,
        untimedChart,
        undefined,
        { allowUnknownBirthTime: true }
      );

      expect(report.jupiterPlacement.house).toBeNull();
      expect(report.jupiterPlacement.houseFormatted).toContain('Indeterminate');
    });

    it('qualifies interpretations for untimed birth profile in Rahu-Ketu report', async () => {
      const birthDetails = {
        date: { year: 1983, month: 12, day: 28 },
        time: { hour: 12, minute: 0, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.4069,
        longitude: 77.8498,
        placeName: 'Bulandshahr, India',
      };

      const untimedChart = {
        ...(await chartCalculator.calculateChart(birthDetails, DEFAULT_ASTROLOGY_CONFIG)),
        isTimeUnknown: true,
        ascendant: undefined,
      };

      const report: RahuKetuReportModel = await generateRahuKetuReport(
        untimedProfile,
        reportConfig,
        untimedChart,
        undefined,
        { allowUnknownBirthTime: true }
      );

      expect(report.nodalPlacement.rahu.house).toBeNull();
      expect(report.nodalPlacement.rahu.houseFormatted).toContain('Indeterminate');
      expect(report.nodalPlacement.ketu.house).toBeNull();
      expect(report.nodalPlacement.ketu.houseFormatted).toContain('Indeterminate');
    });
  });
});
