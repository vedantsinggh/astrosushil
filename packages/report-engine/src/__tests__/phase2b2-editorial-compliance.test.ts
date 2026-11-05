import { describe, it, expect } from 'vitest';
import { generateKundliReport } from '../generators/kundli-report.generator';
import { generateMatchmakingReport } from '../generators/matchmaking-report.generator';
import { generatePlanetaryReport } from '../generators/planetary-report.generator';
import { ReportPdfService } from '../pdf/report-pdf.service';
import { DeterministicInterpretationProvider } from '../providers/deterministic-interpretation.provider';
import { ReportProfileDto } from '../types/report.types';
import fs from 'fs';
import path from 'path';

describe('Phase 2B.2 Editorial Compliance & Dosha Removal Suite', () => {
  const interpretationProvider = new DeterministicInterpretationProvider();
  const pdfService = new ReportPdfService();

  const profileA: ReportProfileDto = {
    name: 'Aarav Sharma',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30',
    placeOfBirth: 'New Delhi, India',
    latitude: 28.6139,
    longitude: 77.209,
    gender: 'male',
  };

  const profileB: ReportProfileDto = {
    name: 'Pooja Verma',
    dateOfBirth: '1993-08-22',
    timeOfBirth: '09:15',
    placeOfBirth: 'Mumbai, India',
    latitude: 19.076,
    longitude: 72.8777,
    gender: 'female',
  };

  // Mock Normalized Astrology Chart
  const sampleChartData = {
    ascendant: { sign: 'Virgo', longitude: 165.5, house: 1, nakshatra: 'Hasta', nakshatraName: 'Hasta' },
    planets: [
      { planet: 'SUN', sign: 'Taurus', longitude: 45.2, house: 9, nakshatra: 'Rohini', nakshatraName: 'Rohini' },
      { planet: 'MOON', sign: 'Capricorn', longitude: 285.4, house: 5, nakshatra: 'Shravana', nakshatraName: 'Shravana' },
      { planet: 'MARS', sign: 'Aries', longitude: 12.1, house: 8, nakshatra: 'Ashwini', nakshatraName: 'Ashwini' }, // 8th house Mars
      { planet: 'MERCURY', sign: 'Taurus', longitude: 52.8, house: 9, nakshatra: 'Rohini', nakshatraName: 'Rohini' },
      { planet: 'JUPITER', sign: 'Gemini', longitude: 75.3, house: 10, nakshatra: 'Ardra', nakshatraName: 'Ardra' },
      { planet: 'VENUS', sign: 'Pisces', longitude: 350.2, house: 7, nakshatra: 'Revati', nakshatraName: 'Revati' },
      { planet: 'SATURN', sign: 'Capricorn', longitude: 290.1, house: 5, nakshatra: 'Dhanishta', nakshatraName: 'Dhanishta' },
      { planet: 'RAHU', sign: 'Sagittarius', longitude: 260.4, house: 4, nakshatra: 'Purva Ashadha', nakshatraName: 'Purva Ashadha' },
      { planet: 'KETU', sign: 'Gemini', longitude: 80.4, house: 10, nakshatra: 'Ardra', nakshatraName: 'Ardra' },
    ],
    houses: Array.from({ length: 12 }, (_, i) => ({
      houseNumber: i + 1,
      sign: ['Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo'][i],
      startDegree: i * 30,
      degree: i * 30,
    })),
    metadata: {
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      calculatedAt: '2026-11-04T00:00:00Z',
    },
  };

  // 1. KUNDLI REPORT EDITORIAL COMPLIANCE
  describe('1. Kundli Report Editorial Compliance', () => {
    it('generates Kundli report with 0 dosha classifications and neutral planetary placements', async () => {
      const report = await generateKundliReport(
        profileA,
        sampleChartData,
        interpretationProvider,
        'mock-report-id-1'
      );

      // Verify planetaryPlacementAndTransits structure
      expect(report.planetaryPlacementAndTransits).toBeDefined();
      const pTransits = report.planetaryPlacementAndTransits!;

      // 1. Manglik status is strictly Present / Not Present
      expect(['Present', 'Not Present']).toContain(pTransits.manglik.status);
      expect(pTransits.manglik.status).toBe('Present');
      expect(pTransits.manglik.isManglik).toBe(true);

      // Manglik description does not contain alarmist or curse language
      expect(pTransits.manglik.description).not.toContain('curse');
      expect(pTransits.manglik.description).not.toContain('disaster');
      expect(pTransits.manglik.description).not.toContain('illness');
      expect(pTransits.manglik.description).not.toContain('HIGH');
      expect(pTransits.manglik.description).not.toContain('MEDIUM');

      // 2. Saturn transit is neutral Gochara analysis, NOT a Sade Sati dosha classification
      expect(pTransits.saturnTransit).toBeDefined();
      expect(pTransits.saturnTransit.transitHouseFromMoon).toBeGreaterThanOrEqual(1);
      expect(pTransits.saturnTransit.transitHouseFromMoon).toBeLessThanOrEqual(12);
      expect(pTransits.saturnTransit.description).not.toContain('curse');
      expect(pTransits.saturnTransit.description).not.toContain('misfortune');
      expect(pTransits.saturnTransit.description).not.toContain('affliction');

      // 3. Prohibited terms audit across entire JSON report object
      const reportJson = JSON.stringify(report);
      expect(reportJson).not.toContain('Kaal Sarp');
      expect(reportJson).not.toContain('Prana Pratishtha');
      expect(reportJson).not.toContain('Kumbha Vivaha');
      expect(reportJson).not.toContain('Nadi Shanti');
      expect(reportJson).not.toContain('Manglik Dosha');

      // 4. Gemstone recommendations remain intact with traditional parameters
      expect(report.gemstoneRecommendations).toBeDefined();
      const gems = report.gemstoneRecommendations!;
      expect(gems.lagnaGem.gemstone).toBe('Emerald');
      expect(gems.lagnaGem.finger).toBe('Little Finger');
      expect(gems.lagnaGem.metal).toBe('Gold / Silver');
      expect(gems.luckyGem5th.gemstone).toBe('Blue Sapphire');
      expect(gems.fortuneGem9th.gemstone).toBe('Diamond / White Sapphire');

      // Gemstone caution does not contain Prana Pratishtha
      expect(gems.fortuneGem9th.caution).not.toContain('Prana Pratishtha');
      expect(gems.generalAdvisory).toContain('NOTE ON METHODOLOGY');
    });

    it('renders Kundli PDF with methodology disclaimer and zero dosha headers', async () => {
      const report = await generateKundliReport(
        profileA,
        sampleChartData,
        interpretationProvider,
        'mock-report-id-pdf'
      );

      const pdfBuffer = await pdfService.generateReportPdf(report);
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(1000);

      const pdfText = pdfBuffer.toString('utf-8');

      // Section 7 title must be neutral
      expect(pdfText).toContain('7. PLANETARY PLACEMENT & TRANSIT ANALYSIS');
      expect(pdfText).not.toContain('7. CLASSICAL DOSHA EVALUATION');
      expect(pdfText).not.toContain('Kaal Sarp');
      expect(pdfText).not.toContain('Kumbha Vivaha');
      expect(pdfText).not.toContain('Nadi Shanti');
      expect(pdfText).not.toContain('Prana Pratishtha');

      // Section 8 must render the methodology advisory disclaimer card
      expect(pdfText).toContain('8. ASTRONOMICAL GEMSTONE RECOMMENDATIONS');
      expect(pdfText).toContain('METHODOLOGY ADVISORY');
      expect(pdfText).toContain('NOTE ON METHODOLOGY');
    });
  });

  // 2. MATCHMAKING REPORT EDITORIAL COMPLIANCE
  describe('2. Matchmaking Report Editorial Compliance', () => {
    it('generates Matchmaking report with zero Kumbha Vivaha, Nadi Shanti, or DOSHA tags', async () => {
      const report = await generateMatchmakingReport(
        profileA,
        profileB,
        sampleChartData,
        sampleChartData,
        interpretationProvider,
        'mock-mm-report-1'
      );

      expect(report.gunaMilan).toBeDefined();
      expect(report.gunaMilan.totalScore).toBeGreaterThanOrEqual(0);
      expect(report.gunaMilan.totalScore).toBeLessThanOrEqual(36);

      // Kootas must not use 'DOSHA' status tag
      for (const koota of report.gunaMilan.kootas) {
        expect(koota.status).not.toBe('DOSHA');
      }

      // Manglik comparison strictly Present / Not Present
      expect(['Present', 'Not Present']).toContain(report.manglikComparison.personA.status);
      expect(['Present', 'Not Present']).toContain(report.manglikComparison.personB.status);

      // Synthesis & Manglik explanations must not contain superstitious remedies
      const reportJson = JSON.stringify(report);
      expect(reportJson).not.toContain('Kumbha Vivaha');
      expect(reportJson).not.toContain('Nadi Shanti');
      expect(reportJson).not.toContain('propitiation remedies');
      expect(reportJson).not.toContain('REQUIRING REMEDIES');
      expect(reportJson).not.toContain('DOSHA CANCELLED');
    });

    it('renders Matchmaking PDF without Kuja Dosha or alarmist headers', async () => {
      const report = await generateMatchmakingReport(
        profileA,
        profileB,
        sampleChartData,
        sampleChartData,
        interpretationProvider,
        'mock-mm-pdf-1'
      );

      const pdfBuffer = await pdfService.generateReportPdf(report);
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(1000);

      const pdfText = pdfBuffer.toString('utf-8');
      expect(pdfText).toContain('2. MANGLIK PLACEMENT COMPARATIVE EVALUATION');
      expect(pdfText).not.toContain('2. MANGLIK (KUJA DOSHA) COMPARATIVE VERDICT');
      expect(pdfText).not.toContain('Kumbha Vivaha');
      expect(pdfText).not.toContain('Nadi Shanti');
    });
  });

  // 3. MINI HOROSCOPE (PLANETARY TRANSIT) EDITORIAL COMPLIANCE
  describe('3. Mini Horoscope Editorial Compliance', () => {
    it('renders Mini Horoscope PDF without fear-based Sade Sati classification headers', async () => {
      const report = await generatePlanetaryReport(
        profileA,
        sampleChartData,
        interpretationProvider,
        'mock-planetary-1'
      );

      const pdfBuffer = await pdfService.generateReportPdf(report);
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(1000);

      const pdfText = pdfBuffer.toString('utf-8');
      expect(pdfText).toContain('2. SATURN TRANSIT');
      expect(pdfText).toContain('GOCHARA');
      expect(pdfText).not.toContain('SHANI SADE SATI');
      expect(pdfText).not.toContain('DHAIYYA');
    });
  });

  // 4. MOBILE SCREENS & LOCALIZATION EDITORIAL AUDIT
  describe('4. Mobile Customer-Facing Files Editorial Audit', () => {
    const mobileDir = path.resolve(__dirname, '../../../../apps/mobile');

    it('reports_screen.dart does not contain prohibited dosha marketing strings', () => {
      const reportsScreenPath = path.join(mobileDir, 'lib/home/screens/reports_screen.dart');
      const content = fs.readFileSync(reportsScreenPath, 'utf-8');

      expect(content).not.toContain('Classical Dosha Detection (Manglik, Sade Sati, Kaal Sarp)');
      expect(content).not.toContain('3-6 MONTH TRANSIT WINDOWS & SADE SATI');
      expect(content).not.toContain('Real-Time Sade Sati Phase Tracking & Astrological Influence');
      expect(content).not.toContain('Comparative Dual-Chart Manglik Dosha Analysis & Cancellation Rules');
      expect(content).not.toContain('Doshas & Gemstones (1st/5th/9th)');
      expect(content).not.toContain('Sade Sati Phase & Caution Dates');
    });

    it('matchmaking_screen.dart does not display Manglik Dosha or alarmist severity badges', () => {
      const mmScreenPath = path.join(mobileDir, 'lib/features/astrology/screens/matchmaking_screen.dart');
      const content = fs.readFileSync(mmScreenPath, 'utf-8');

      expect(content).not.toContain('Manglik Dosha Comparison (Kuja Dosha)');
      expect(content).not.toContain('MANGLIK (${status.severity})');
      expect(content).not.toContain('MANGLIK (CANCELLED)');
      expect(content).not.toContain('Dosha Cancelled:');
    });

    it('astrology_hub_screen.dart subtitle does not mention Manglik Dosha', () => {
      const hubScreenPath = path.join(mobileDir, 'lib/features/astrology/screens/astrology_hub_screen.dart');
      const content = fs.readFileSync(hubScreenPath, 'utf-8');

      expect(content).not.toContain('Manglik Dosha comparison');
    });

    it('app_en.arb does not contain dosha cancellation or remedies marketing', () => {
      const arbPath = path.join(mobileDir, 'lib/l10n/app_en.arb');
      const content = fs.readFileSync(arbPath, 'utf-8');

      expect(content).not.toContain('dosha cancellation & remedies');
    });
  });

  // 5. API ENDPOINT AUDIT & PROHIBITED EXPOSURE PREVENTION
  describe('5. API Endpoint Audit & Customer Exposure Prevention', () => {
    const apiRoutesPath = path.resolve(__dirname, '../../../../apps/api/src/modules/astrology/astrology.routes.ts');

    it('astrology.routes.ts decommissions /sade-sati with 410 and zero prohibited classifications', () => {
      const content = fs.readFileSync(apiRoutesPath, 'utf-8');

      expect(content).toContain("'ENDPOINT_DECOMMISSIONED'");
      expect(content).toContain("410");
      expect(content).not.toContain('calculateSadeSati(input');
      expect(content).not.toContain('tags: [\'Astrology\'],\n      summary: \'Calculate deterministic Sade Sati');
    });

    it('OpenAPI matchmaking routes do not expose Manglik Dosha', () => {
      const content = fs.readFileSync(apiRoutesPath, 'utf-8');

      expect(content).not.toContain('Guna Milan score and Manglik Dosha');
      expect(content).not.toContain('pairwise Manglik Dosha comparison');
      expect(content).toContain('Guna Milan score and Manglik status');
      expect(content).toContain('pairwise Manglik status comparison');
    });
  });
});
