import { describe, it, expect } from 'vitest';
import {
  generateSaturnReport,
  reportPdfService,
  ReportType,
  SaturnReportModel,
} from '../../../../packages/report-engine/src/index';
import {
  ChartCalculator,
  AstronomyEngineAdapter,
  DEFAULT_ASTROLOGY_CONFIG,
} from '../../../../packages/astrology-engine/src/index';
import { COMMERCE_CATALOG } from '../../src/modules/commerce/commerce.catalog';
import { REPORT_PRICES_PAISE } from '../../src/services/payment.service';
import { featureAccessService } from '../../src/services/feature-access.service';

describe('Phase 6.8: Saturn in Your Birth Chart Report Integration Suite', () => {
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

  const reportConfig = {
    zodiacType: 'SIDEREAL',
    ayanamsa: 'LAHIRI',
    houseSystem: 'WHOLE_SIGN',
    nodeCalculation: 'MEAN_NODE',
  };

  // ---------------------------------------------------------------------------
  // 1. COMMERCE, CATALOG & PRICING INTEGRATION
  // ---------------------------------------------------------------------------
  describe('Commerce & SKU Catalog Integration', () => {
    it('verifies report-saturn catalog entry at authoritative price ₹499', () => {
      const item = COMMERCE_CATALOG['report-saturn'];
      expect(item).toBeDefined();
      expect(item.id).toBe('report-saturn');
      expect(item.pricePaise).toBe(49900); // strictly ₹499
      expect(item.currency).toBe('INR');
      expect(item.legacyReportType).toBe(ReportType.SATURN);
      expect(item.isActive).toBe(true);
      expect(item.fulfillmentType).toBe('DIGITAL');
    });

    it('verifies payment service price mapping for SATURN report', () => {
      expect(REPORT_PRICES_PAISE[ReportType.SATURN]).toBe(49900);
    });

    it('verifies feature access service catalog registration', () => {
      const catalog = featureAccessService.getCatalog();
      const saturnFeature = catalog.find((f) => f.code === 'SATURN');
      const saturnReportFeature = catalog.find((f) => f.code === 'SATURN_REPORT');

      expect(saturnFeature).toBeDefined();
      expect(saturnFeature?.reportTypeKey).toBe('SATURN');
      expect(saturnFeature?.isFree).toBe(false);

      expect(saturnReportFeature).toBeDefined();
      expect(saturnReportFeature?.reportTypeKey).toBe('SATURN');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. DETERMINISTIC ASTROLOGICAL CALCULATION INTEGRITY (CANONICAL FIXTURE)
  // ---------------------------------------------------------------------------
  describe('Astrological Calculation Integrity for Reference Fixture', () => {
    it('evaluates exact Saturn natal placement and dignity for Puneet Kumar', async () => {
      const birthDetails = {
        date: { year: 1983, month: 12, day: 28 },
        time: { hour: 4, minute: 45, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.4069,
        longitude: 77.8498,
        placeName: 'Bulandshahr, India',
      };

      const chart = await chartCalculator.calculateChart(birthDetails, DEFAULT_ASTROLOGY_CONFIG);
      const report: SaturnReportModel = await generateSaturnReport(puneetProfile, reportConfig, chart);

      expect(report.type).toBe(ReportType.SATURN);
      expect(report.title).toBe('Saturn in Your Birth Chart Report');

      // Natal Saturn in Libra (Tula), 12th house from Scorpio Lagna
      expect(report.saturnPlacement.sign).toBe('Tula');
      expect(report.saturnPlacement.signIndex).toBe(7);
      expect(report.saturnPlacement.house).toBe(12);
      expect(report.saturnPlacement.houseFormatted).toBe('12th House');
      expect(report.saturnPlacement.dignity).toBe('Exalted (Uchcha)');
      expect(report.saturnPlacement.nakshatra).toBe('Swati');
      expect(report.saturnPlacement.pada).toBe(4);
      expect(report.saturnPlacement.isRetrograde).toBe(false);
      expect(report.saturnPlacement.isCombust).toBe(false);
      expect(report.saturnPlacement.lordship).toEqual([3, 4]); // Capricorn=3, Aquarius=4

      // Special 3rd, 7th, 10th Aspects
      expect(report.saturnAspects.aspects).toHaveLength(3);
      const [asp3, asp7, asp10] = report.saturnAspects.aspects;
      expect(asp3.aspectNumber).toBe(3);
      expect(asp3.house).toBe(2);
      expect(asp3.sign).toBe('Dhanu'); // Sagittarius

      expect(asp7.aspectNumber).toBe(7);
      expect(asp7.house).toBe(6);
      expect(asp7.sign).toBe('Mesha'); // Aries

      expect(asp10.aspectNumber).toBe(10);
      expect(asp10.house).toBe(9);
      expect(asp10.sign).toBe('Karka'); // Cancer

      // Moon Sign Relationship & Nakshatra Identification
      expect(report.moonSignRelation.moonSign).toContain('Kanya'); // Virgo Moon
      expect(report.moonSignRelation.moonNakshatra).toBe('Chitra'); // Chitra Pada 2
      expect(report.moonSignRelation.moonPada).toBe(2);
      expect(report.moonSignRelation.moonNakshatraLord).toBe('MARS');
      expect(report.moonSignRelation.houseFromMoon).toBe(2);
      expect(report.moonSignRelation.saturnRelationToMoonLord).toBe('Natural Friend');

      // Saturn's Natal Nakshatra Identification (Swati Pada 4)
      expect(report.saturnPlacement.nakshatra).toBe('Swati');
      expect(report.saturnPlacement.pada).toBe(4);
      expect(report.saturnNakshatraAnalysis.nakshatra).toBe('Swati');
      expect(report.saturnNakshatraAnalysis.pada).toBe(4);
      expect(report.saturnNakshatraAnalysis.lord).toBe('RAHU');

      // Bhinnashtakavarga (BAV): exactly 39 points
      expect(report.saturnAshtakavarga.total).toBe(39);
      expect(report.saturnAshtakavarga.bindus).toHaveLength(12);
      expect(report.saturnAshtakavarga.natalHousePoints).toBe(report.saturnAshtakavarga.bindus[6]);
      expect(report.saturnAshtakavarga.currentTransitHousePoints).toBe(report.saturnAshtakavarga.bindus[11]);

      // Sade Sati: Inactive for Virgo Moon with Saturn in Pisces
      expect(report.sadeSatiPhases.isActive).toBe(false);
      expect(report.sadeSatiPhases.currentStatus).toContain('INACTIVE');
      expect(report.sadeSatiPhases.firstCycle).toHaveLength(3);
      expect(report.sadeSatiPhases.secondCycle).toHaveLength(3);

      // Kantak Shani: Active (7th from Moon in Pisces)
      expect(report.kantakShani.isActiveFromMoon).toBe(true);
      expect(report.kantakShani.houseFromMoon).toBe(7);

      // Transits and Consecrated Remedies
      expect(report.saturnTransits.transit2025_2027.sign).toBe('Meena (Pisces)');
      expect(report.saturnTransits.transit2027_2029.sign).toBe('Mesha (Aries)');
      expect(report.remedies.gemstone.name).toContain('Blue Sapphire');
      expect(report.remedies.rudraksha.mukhi).toContain('7 Mukhi');
      expect(report.remedies.astrovastu.direction).toContain('West');
      expect(report.remedies.mantras.beejMantra).toContain('Om Sham Shanaishcharaya Namah');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. UNTIMED BIRTH PROFILE HANDLING
  // ---------------------------------------------------------------------------
  describe('Untimed Birth Profile Handling', () => {
    it('gracefully handles missing birth time without corrupting planetary calculations', async () => {
      const birthDetails = {
        date: { year: 1983, month: 12, day: 28 },
        time: { hour: 4, minute: 45, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.4069,
        longitude: 77.8498,
        placeName: 'Bulandshahr, India',
      };

      const chart = await chartCalculator.calculateChart(birthDetails, DEFAULT_ASTROLOGY_CONFIG);
      const untimedChart = { ...chart, isTimeUnknown: true, ascendant: undefined };

      const report = await generateSaturnReport(
        { ...puneetProfile, timeOfBirth: '00:00:00' },
        reportConfig,
        untimedChart,
        undefined,
        { allowUnknownBirthTime: true }
      );

      expect(report.saturnPlacement.house).toBeNull();
      expect(report.saturnPlacement.houseFormatted).toContain('Indeterminate');
      expect(report.saturnPlacement.lordship).toEqual([]);

      // Signs and Moon relation remain deterministic
      expect(report.saturnPlacement.sign).toBe('Tula');
      expect(report.moonSignRelation.houseFromMoon).toBe(2);
      expect(report.saturnAshtakavarga.total).toBe(39);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. MULTI-PROFILE VECTOR PDF GENERATION
  // ---------------------------------------------------------------------------
  describe('Vector PDF Generation & Visual Verification', () => {
    it('compiles crisp 10-page vector PDF for canonical Puneet Kumar chart', async () => {
      const birthDetails = {
        date: { year: 1983, month: 12, day: 28 },
        time: { hour: 4, minute: 45, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.4069,
        longitude: 77.8498,
        placeName: 'Bulandshahr, India',
      };

      const chart = await chartCalculator.calculateChart(birthDetails, DEFAULT_ASTROLOGY_CONFIG);
      const report = await generateSaturnReport(puneetProfile, reportConfig, chart);
      const pdfBuffer = await reportPdfService.generateReportPdf(report);

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(15000);
      expect(pdfBuffer.toString('utf-8', 0, 8)).toContain('%PDF-1.4');

      // Verify page count contains at least 10 pages
      const pageMatches = pdfBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
      expect(pageMatches).not.toBeNull();
      expect(pageMatches!.length).toBeGreaterThanOrEqual(10);
    });

    it('compiles vector PDF for untimed birth profile with conditional notice box', async () => {
      const birthDetails = {
        date: { year: 1983, month: 12, day: 28 },
        time: { hour: 4, minute: 45, second: 0 },
        timezone: 'Asia/Kolkata',
        latitude: 28.4069,
        longitude: 77.8498,
        placeName: 'Bulandshahr, India',
      };

      const chart = await chartCalculator.calculateChart(birthDetails, DEFAULT_ASTROLOGY_CONFIG);
      const untimedChart = { ...chart, isTimeUnknown: true, ascendant: undefined };

      const report = await generateSaturnReport(
        { ...puneetProfile, timeOfBirth: '00:00:00' },
        reportConfig,
        untimedChart,
        undefined,
        { allowUnknownBirthTime: true }
      );

      const pdfBuffer = await reportPdfService.generateReportPdf(report);
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(15000);
      expect(pdfBuffer.toString('utf-8', 0, 8)).toContain('%PDF-1.4');
    });
  });
});
