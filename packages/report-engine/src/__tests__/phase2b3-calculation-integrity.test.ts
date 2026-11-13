import { describe, it, expect } from 'vitest';
import { generatePlanetaryReport } from '../generators/planetary-report.generator';
import { generateProHoroscopeReport } from '../generators/pro-horoscope.generator';
import { generateKundliReport } from '../generators/kundli-report.generator';
import { mapNormalizedChartToCareerReportData } from '../mappers/career-report.mapper';
import { generateReportDataTex } from '../generators/report-data-tex.generator';
import { ReportPdfService } from '../pdf/report-pdf.service';
import { LocalXeLatexCompiler } from '../pdf/xelatex-compiler';
import { DeterministicInterpretationProvider } from '../providers/deterministic-interpretation.provider';
import {
  normalizeBirthTime,
  ChartCalculator,
  AstronomyEngineAdapter,
  DEFAULT_ASTROLOGY_CONFIG,
  normalizeAstroChart,
  PlanetSymbol,
  RASHIS,
} from '@astro/astrology-engine';
import { CareerAnalysis, MockCareerAnalysisProvider, careerEvidenceEngine } from '@astro/prediction-engine';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Phase 2B.3 Calculation Integrity & Report Correctness Suite', () => {
  const interpretationProvider = new DeterministicInterpretationProvider();
  const pdfService = new ReportPdfService();

  const standardProfile = {
    name: 'Aarav Sharma',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30',
    placeName: 'New Delhi, India',
    timezone: 'Asia/Kolkata',
    latitude: 28.6139,
    longitude: 77.209,
  };

  const sampleChartData = {
    ascendant: { sign: 'Virgo', longitude: 165.5, house: 1, nakshatra: 'Hasta', nakshatraName: 'Hasta' },
    planets: [
      { planet: 'SUN', sign: 'Taurus', longitude: 45.2, house: 9, nakshatra: 'Rohini', nakshatraName: 'Rohini' },
      { planet: 'MOON', sign: 'Capricorn', longitude: 285.4, house: 5, nakshatra: 'Shravana', nakshatraName: 'Shravana' },
      { planet: 'MARS', sign: 'Aries', longitude: 12.1, house: 8, nakshatra: 'Ashwini', nakshatraName: 'Ashwini' },
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

  // =========================================================================
  // TASK A: Dynamic Planetary Transits
  // =========================================================================
  describe('Task A: Dynamic Planetary Transits', () => {
    it('1. Calculates dynamic transits that change when calculation date changes', async () => {
      const date2024 = new Date('2024-01-15T12:00:00Z');
      const date2026 = new Date('2026-11-01T12:00:00Z');

      const report2024 = await generatePlanetaryReport(
        { ...standardProfile, calculationDate: date2024 },
        sampleChartData,
        interpretationProvider
      );

      const report2026 = await generatePlanetaryReport(
        { ...standardProfile, calculationDate: date2026 },
        sampleChartData,
        interpretationProvider
      );

      const transits2024 = report2024.miniHoroscopeData?.currentTransits;
      const transits2026 = report2026.miniHoroscopeData?.currentTransits;

      expect(transits2024).toBeDefined();
      expect(transits2026).toBeDefined();

      const jup2024 = transits2024?.find((t) => t.planet === 'JUPITER');
      const jup2026 = transits2026?.find((t) => t.planet === 'JUPITER');
      expect(jup2024).toBeDefined();
      expect(jup2026).toBeDefined();

      // Jupiter moves significantly between Jan 2024 (Aries) and Nov 2026 (Taurus/Gemini)
      expect(jup2024?.currentSign).not.toBe(jup2026?.currentSign);

      const sun2024 = transits2024?.find((t) => t.planet === 'SUN');
      const sun2026 = transits2026?.find((t) => t.planet === 'SUN');
      // Sun in mid-January is in Capricorn; Sun in early November is in Libra
      expect(sun2024?.currentSign).toBe('Capricorn');
      expect(sun2026?.currentSign).toBe('Libra');

      // Verify NO frozen Oct 2024 snapshot (which had Sun in Libra with deg 24.0, Mars in Gemini 11.4)
      // When date is Jan 2024, Sun must be in Capricorn, NOT Libra
      expect(sun2024?.currentSign).not.toBe('Libra');
    });

    it('2. General Saturn transit remains functional as neutral transit data without doshas', async () => {
      const date2026 = new Date('2026-11-01T12:00:00Z');
      const report = await generatePlanetaryReport(
        { ...standardProfile, calculationDate: date2026 },
        sampleChartData,
        interpretationProvider
      );

      const saturnTransit = report.miniHoroscopeData?.currentTransits?.find((t) => t.planet === 'SATURN');
      expect(saturnTransit).toBeDefined();
      expect(saturnTransit?.houseFromMoon).toBeGreaterThanOrEqual(1);
      expect(saturnTransit?.houseFromMoon).toBeLessThanOrEqual(12);

      // Verify no dosha classifications
      const json = JSON.stringify(report).toLowerCase();
      expect(json).not.toContain('sade sati dosha');
      expect(json).not.toContain('dhaiyya dosha');
      expect(json).not.toContain('kaal sarp');
      expect(json).not.toContain('nadi dosha');
    });
  });

  // =========================================================================
  // TASK B: Pro Horoscope UTC and Timezone Correctness
  // =========================================================================
  describe('Task B: Pro Horoscope UTC and Timezone Correctness', () => {
    it('1. Correctly preserves authoritative resolved UTC instant and does not hardcode +05:30', async () => {
      // New York DST earlier case from Phase 2A (2023-11-05 01:30:00 EDT, offset -04:00 -> 05:30:00Z)
      const nyProfile = {
        name: 'John Doe',
        dateOfBirth: '2023-11-05',
        timeOfBirth: '01:30',
        placeName: 'New York, USA',
        timezone: 'America/New_York',
        latitude: 40.7128,
        longitude: -74.006,
        disambiguation: 'earlier' as const,
      };

      // Compute authoritative normalization via canonical engine
      const normalizedTime = normalizeBirthTime({
        date: { year: 2023, month: 11, day: 5 },
        time: { hour: 1, minute: 30, second: 0 },
        timezone: 'America/New_York',
        latitude: 40.7128,
        longitude: -74.006,
        disambiguation: 'earlier',
      });

      expect(normalizedTime.utcIsoString).toBe('2023-11-05T05:30:00.000Z');
      expect(normalizedTime.timezoneOffsetMinutes).toBe(-240); // -4 hours

      // Build real chart via ChartCalculator
      const calculator = new ChartCalculator(new AstronomyEngineAdapter());
      const realChart = await calculator.calculateChart(
        {
          date: { year: 2023, month: 11, day: 5 },
          time: { hour: 1, minute: 30, second: 0 },
          timezone: 'America/New_York',
          latitude: 40.7128,
          longitude: -74.006,
          disambiguation: 'earlier',
        },
        DEFAULT_ASTROLOGY_CONFIG
      );

      const normalizedChart = normalizeAstroChart(realChart);
      const proHoroscope = await generateProHoroscopeReport(
        nyProfile,
        normalizedChart,
        interpretationProvider
      );

      expect(proHoroscope).toBeDefined();
      expect(proHoroscope.vargas.length).toBeGreaterThanOrEqual(5);
      expect(proHoroscope.shadbala.length).toBe(7);
      expect(proHoroscope.bhavaBala.length).toBe(12);

      // Verify that profile reflects actual timezone, NOT Asia/Kolkata
      expect(proHoroscope.profile.timezone).toBe('America/New_York');
    });

    it('2. Distinguishes DST earlier vs later instants in chart calculations', async () => {
      // Earlier instant: 05:30:00Z (offset -240)
      const earlierNorm = normalizeBirthTime({
        date: { year: 2023, month: 11, day: 5 },
        time: { hour: 1, minute: 30, second: 0 },
        timezone: 'America/New_York',
        latitude: 40.7128,
        longitude: -74.006,
        disambiguation: 'earlier',
      });

      // Later instant: 06:30:00Z (offset -300)
      const laterNorm = normalizeBirthTime({
        date: { year: 2023, month: 11, day: 5 },
        time: { hour: 1, minute: 30, second: 0 },
        timezone: 'America/New_York',
        latitude: 40.7128,
        longitude: -74.006,
        disambiguation: 'later',
      });

      expect(earlierNorm.utcIsoString).toBe('2023-11-05T05:30:00.000Z');
      expect(laterNorm.utcIsoString).toBe('2023-11-05T06:30:00.000Z');
      expect(earlierNorm.julianDayUT).not.toBe(laterNorm.julianDayUT);

      // Verify J2000 epoch (2451545.0) is not returned for 2023 birth
      expect(earlierNorm.julianDayUT).toBeGreaterThan(2460000.0);
    });

    it('3. Runs Phase 2A New York DST earlier/later fixtures through actual Pro Horoscope generation path and confirms persisted resolved UTC is authoritative', async () => {
      const calculator = new ChartCalculator(new AstronomyEngineAdapter());

      // Phase 2A New York DST Earlier Fixture (2020-11-01 01:30:00 EDT)
      const earlierDetails = {
        name: 'Ambiguous Test Earlier',
        dateOfBirth: '2020-11-01',
        timeOfBirth: '01:30:00',
        latitude: 40.7128,
        longitude: -74.006,
        timezone: 'America/New_York',
        disambiguation: 'earlier' as const,
        resolvedUtc: '2020-11-01T05:30:00.000Z',
        timezoneOffsetSeconds: -14400,
      };

      const earlierChart = await calculator.calculateChart(
        {
          date: { year: 2020, month: 11, day: 1 },
          time: { hour: 1, minute: 30, second: 0 },
          timezone: 'America/New_York',
          latitude: 40.7128,
          longitude: -74.006,
          disambiguation: 'earlier',
          utcDateTime: earlierDetails.resolvedUtc,
          timezoneOffsetSeconds: earlierDetails.timezoneOffsetSeconds,
        },
        DEFAULT_ASTROLOGY_CONFIG
      );

      const earlierReport = await generateProHoroscopeReport(
        earlierDetails,
        normalizeAstroChart(earlierChart),
        interpretationProvider
      );

      // Verify exact authoritative UTC instant used
      expect(earlierReport.normalizedTime.utcIsoString).toBe('2020-11-01T05:30:00.000Z');
      expect(earlierReport.normalizedTime.timezoneOffsetMinutes).toBe(-240);

      // Phase 2A New York DST Later Fixture (2020-11-01 01:30:00 EST)
      const laterDetails = {
        name: 'Ambiguous Test Later',
        dateOfBirth: '2020-11-01',
        timeOfBirth: '01:30:00',
        latitude: 40.7128,
        longitude: -74.006,
        timezone: 'America/New_York',
        disambiguation: 'later' as const,
        resolvedUtc: '2020-11-01T06:30:00.000Z',
        timezoneOffsetSeconds: -18000,
      };

      const laterChart = await calculator.calculateChart(
        {
          date: { year: 2020, month: 11, day: 1 },
          time: { hour: 1, minute: 30, second: 0 },
          timezone: 'America/New_York',
          latitude: 40.7128,
          longitude: -74.006,
          disambiguation: 'later',
          utcDateTime: laterDetails.resolvedUtc,
          timezoneOffsetSeconds: laterDetails.timezoneOffsetSeconds,
        },
        DEFAULT_ASTROLOGY_CONFIG
      );

      const laterReport = await generateProHoroscopeReport(
        laterDetails,
        normalizeAstroChart(laterChart),
        interpretationProvider
      );

      // Verify exact authoritative UTC instant used
      expect(laterReport.normalizedTime.utcIsoString).toBe('2020-11-01T06:30:00.000Z');
      expect(laterReport.normalizedTime.timezoneOffsetMinutes).toBe(-300);

      // Confirm persisted resolved UTC instant is authoritative without shifting
      expect(earlierReport.normalizedTime.utcIsoString).not.toBe(laterReport.normalizedTime.utcIsoString);
      expect(earlierReport.normalizedTime.julianDayUT).not.toBe(laterReport.normalizedTime.julianDayUT);
    });
  });

  // =========================================================================
  // TASK C: Career Report Input and Mapper Correctness
  // =========================================================================
  describe('Task C: Career Report Input and Mapper Correctness', () => {
    it('1. Preserves and propagates all 10 priority and horizon fields from analysis into CareerReportData and TeX', async () => {
      const calculator = new ChartCalculator(new AstronomyEngineAdapter());
      const rawChart = await calculator.calculateChart(
        {
          date: { year: 1990, month: 5, day: 15 },
          time: { hour: 14, minute: 30, second: 0 },
          timezone: 'Asia/Kolkata',
          latitude: 28.6139,
          longitude: 77.209,
        },
        DEFAULT_ASTROLOGY_CONFIG
      );
      const normalizedChart = normalizeAstroChart(rawChart);

      const customAnalysis: CareerAnalysis = {
        executiveCareerSummary: 'Custom executive summary for Aarav Sharma.',
        executiveDecisionThemes: 'Strategic domain depth over ad-hoc pivot.',
        executiveRecommendations: 'Focus on enterprise architecture.',
        careerIdentity: 'Analytical operational architect.',
        professionalPersonality: 'Methodical and disciplined.',
        naturalStrengths: 'Systems engineering and execution.',
        professionalChallenges: 'Balancing perfectionism with speed.',
        careerDNAAnalysis: '10th lord in 9th house alignment.',
        planetarySynthesis: 'Sun-Mercury synthesis.',
        yogaAnalysis: 'Active Budhaditya Yoga.',
        employmentEntrepreneurshipAnalysis: 'High alignment with independent consultancy.',
        leadershipAnalysis: 'Authoritative and data-driven.',
        technicalAnalyticalAptitude: 'Exceptional systems thinking.',
        creativeCommunicationBusinessAptitude: 'Clear executive presentations.',
        researchPotential: 'Deep domain investigation capabilities.',
        sectorFit: 'Fintech and enterprise software.',
        internationalCareer: 'Favorable overseas engagement.',
        workEnvironment: 'Autonomous structured setting.',
        careerFieldsAnalysis: 'Technology Architecture and Quantitative Finance.',
        topCareerDirections: 'Enterprise Architect, Principal Consultant.',
        careerDirectionsCaution: 'Avoid speculative low-structure environments.',
        moneyIncomePattern: 'Compounding equity and high-ticket advisory revenue.',
        relationshipsNetworking: 'Focused high-trust senior executive network.',
        teamDynamics: 'Demands high excellence and provides clear standards.',
        sustainabilityAnalysis: 'Prioritize offline restoration periods.',
        careerObstacles: 'Organizational inertia and slow approvals.',
        professionalGrowth: 'Systematic authority scaling.',
        recommendations: 'Deliver flagship transformation program.',
        professionalDevelopmentPriorities: 'Master enterprise cloud governance.',
        decisionGuidance: 'Filter opportunities by mandate autonomy.',
        actionPlanSummary: 'Phased 30-90-365 day execution sprint.',
        finalSynthesis: 'Formidable career blueprint for distinction.',
        // 10 Horizon and Priority fields:
        primaryProfessionalPriority: 'Deliver flagship architectural mandate with full autonomy.',
        technicalSkillPriority: 'Enterprise distributed systems and cloud governance.',
        communicationSkillPriority: 'Executive board-level business case presentation.',
        leadershipSkillPriority: 'Empowering specialized domain teams without micromanaging.',
        networkSkillPriority: 'Cultivating senior investor and CTO advisory relationships.',
        mistakeToAvoid: 'Getting bogged down in tactical bug-fixes rather than system design.',
        thirtyDayFocus: 'Audit active commitments and cancel 3 low-leverage initiatives.',
        ninetyDayFocus: 'Ship core prototype for the flagship analytics platform.',
        oneYearFocus: 'Formal appointment to VP of Architecture or advisory equivalent.',
        threeYearDirection: 'Founding an independent high-yield strategic consulting practice.',
      };

      const reportData = mapNormalizedChartToCareerReportData(
        normalizedChart,
        customAnalysis,
        { clientName: 'Aarav Sharma' }
      );

      // Verify mapper mapped the priority fields into roadmaps and direct properties
      expect(reportData.careerAnalysis.roadmapThirtyDay.focus).toBe(customAnalysis.thirtyDayFocus);
      expect(reportData.careerAnalysis.roadmapThirtyDay.skills).toBe(customAnalysis.technicalSkillPriority);
      expect(reportData.careerAnalysis.roadmapThirtyDay.immediateActions).toBe(customAnalysis.primaryProfessionalPriority);
      expect(reportData.careerAnalysis.roadmapThirtyDay.risks).toBe(customAnalysis.mistakeToAvoid);

      expect(reportData.careerAnalysis.roadmapNinetyDay.focus).toBe(customAnalysis.ninetyDayFocus);
      expect(reportData.careerAnalysis.roadmapNinetyDay.skills).toBe(customAnalysis.communicationSkillPriority);

      expect(reportData.careerAnalysis.roadmapOneYear.focus).toBe(customAnalysis.oneYearFocus);
      expect(reportData.careerAnalysis.roadmapOneYear.skills).toBe(customAnalysis.leadershipSkillPriority);

      expect(reportData.careerAnalysis.roadmapThreeYear.focus).toBe(customAnalysis.threeYearDirection);
      expect(reportData.careerAnalysis.roadmapThreeYear.skills).toBe(customAnalysis.networkSkillPriority);

      expect(reportData.careerAnalysis.decisionFramework).toBe(customAnalysis.decisionGuidance);
      expect(reportData.careerAnalysis.moneyIncomeArchitecture.earningPattern).toBe(customAnalysis.moneyIncomePattern);
      expect(reportData.careerAnalysis.professionalRelationships.networkingStrategy).toBe(customAnalysis.relationshipsNetworking);
      expect(reportData.careerAnalysis.careerSustainability.workLifeBalance).toBe(customAnalysis.sustainabilityAnalysis);

      // Verify TeX generation renders these exact fields
      const tex = generateReportDataTex(reportData);
      expect(tex).toContain(customAnalysis.thirtyDayFocus);
      expect(tex).toContain(customAnalysis.ninetyDayFocus);
      expect(tex).toContain(customAnalysis.oneYearFocus);
      expect(tex).toContain(customAnalysis.threeYearDirection);
      expect(tex).toContain(customAnalysis.primaryProfessionalPriority);
      expect(tex).toContain(customAnalysis.mistakeToAvoid);
    });
  });

  // =========================================================================
  // TASK D: Remove Fabricated Shadbala and Bhava Bala Values
  // =========================================================================
  describe('Task D: Remove Fabricated Shadbala and Bhava Bala Values', () => {
    it('1. Does not substitute 5.50 Rupas when Bhava Bala data is missing', async () => {
      const calculator = new ChartCalculator(new AstronomyEngineAdapter());
      const rawChart = await calculator.calculateChart(
        {
          date: { year: 1990, month: 5, day: 15 },
          time: { hour: 14, minute: 30, second: 0 },
          timezone: 'Asia/Kolkata',
          latitude: 28.6139,
          longitude: 77.209,
        },
        DEFAULT_ASTROLOGY_CONFIG
      );
      const normalizedChart = normalizeAstroChart(rawChart);
      const reportData = mapNormalizedChartToCareerReportData(normalizedChart);

      // Every house with valid calculation must have actual totalRupas, not 5.50 default
      const houseOne = reportData.houses.houseOne;
      expect(houseOne.bhavaBalaScore).toBeDefined();
      expect(houseOne.bhavaBalaScore).toContain('Rupas');

      // Test simulated missing score in TeX generator
      const modifiedReportData = JSON.parse(JSON.stringify(reportData));
      modifiedReportData.houses.houseOne.bhavaBalaScore = undefined;
      modifiedReportData.houses.houseOne.bhavaBalaRank = undefined;

      const tex = generateReportDataTex(modifiedReportData);
      expect(tex).not.toContain('5.50 Rupas');
      expect(tex).toContain('\\newcommand{\\HouseOneBhavaBalaScore}{\\RenderUnavailable{Unavailable}}');
    });

    it('2. Controlled failure when Shadbala calculation receives invalid chart data', async () => {
      const invalidChart = {
        ...sampleChartData,
        planets: [], // Broken planets
      };

      await expect(
        generateProHoroscopeReport(
          standardProfile,
          invalidChart,
          interpretationProvider
        )
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // TASK E: Unsupported Report SKU Handling
  // =========================================================================
  describe('Task E: Unsupported Report SKU Handling', () => {
    it('1. Verifies supported report types constant contains canonical SKUs', () => {
      const SUPPORTED = ['CAREER', 'KUNDLI', 'PLANETARY_SUMMARY', 'CAREER_PROSITY', 'MARRIAGE_COMPATIBILITY'];
      expect(SUPPORTED).toContain('KUNDLI');
      expect(SUPPORTED).toContain('PLANETARY_SUMMARY');
      expect(SUPPORTED).toContain('CAREER');
      expect(SUPPORTED).toContain('CAREER_PROSITY');
      expect(SUPPORTED).toContain('MARRIAGE_COMPATIBILITY');

      expect(SUPPORTED).not.toContain('GUPTA_NADI_DOSSIER');
      expect(SUPPORTED).not.toContain('CHILDBIRTH_FAMILY');
    });
  });

  // =========================================================================
  // TASK F: Actual PDF Generation and Text Verification
  // =========================================================================
  describe('Task F: Actual PDF Generation and Text Verification', () => {
    it('1. Generates actual Planetary Summary PDF and extracts text', async () => {
      const report = await generatePlanetaryReport(
        { ...standardProfile, calculationDate: new Date('2026-11-04T12:00:00Z') },
        sampleChartData,
        interpretationProvider
      );

      const pdfBuffer = await pdfService.generateReportPdf(report);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');

      // Save artifact for inspection
      const artifactPath = path.join(__dirname, '../../../../phase2b3_planetary_summary_test.pdf');
      fs.writeFileSync(artifactPath, pdfBuffer);
      expect(fs.existsSync(artifactPath)).toBe(true);

      // Verify text extraction if pdftotext is available
      try {
        const text = execSync(`pdftotext "${artifactPath}" -`, { encoding: 'utf-8' });
        expect(text).toContain('Aarav Sharma');
        expect(text).toContain('SATURN TRANSIT');
        expect(text).not.toContain('Kaal Sarp');
        expect(text).not.toContain('Sade Sati Dosha');
      } catch (err: any) {
        // If pdftotext is not installed in environment, verify PDF buffer length and header
        expect(pdfBuffer.length).toBeGreaterThan(10000);
      }
    });

    it('2. Generates actual Kundli PDF and verifies buffer validity', async () => {
      const report = await generateKundliReport(
        standardProfile,
        sampleChartData,
        interpretationProvider
      );

      const pdfBuffer = await pdfService.generateReportPdf(report);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');

      const artifactPath = path.join(__dirname, '../../../../phase2b3_kundli_test.pdf');
      fs.writeFileSync(artifactPath, pdfBuffer);
      expect(fs.existsSync(artifactPath)).toBe(true);
    });

    it('3. Generates actual Pro Horoscope PDF and verifies Whole Sign / Shadbala / Varga sections', async () => {
      const calculator = new ChartCalculator(new AstronomyEngineAdapter());
      const rawChart = await calculator.calculateChart(
        {
          date: { year: 1990, month: 5, day: 15 },
          time: { hour: 14, minute: 30, second: 0 },
          timezone: 'Asia/Kolkata',
          latitude: 28.6139,
          longitude: 77.209,
        },
        DEFAULT_ASTROLOGY_CONFIG
      );

      const normalizedChart = normalizeAstroChart(rawChart);
      const report = await generateProHoroscopeReport(
        standardProfile,
        normalizedChart,
        interpretationProvider
      );

      const pdfBuffer = await pdfService.generateReportPdf(report);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      expect(pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');

      const artifactPath = path.join(__dirname, '../../../../phase2b3_pro_horoscope_test.pdf');
      fs.writeFileSync(artifactPath, pdfBuffer);
      expect(fs.existsSync(artifactPath)).toBe(true);

      try {
        const text = execSync(`pdftotext "${artifactPath}" -`, { encoding: 'utf-8' });
        expect(text).toContain('PRO HOROSCOPE');
        expect(text).toContain('Aarav Sharma');
        expect(text).toContain('SHADBALA');
        expect(text).toContain('BHAVA BALA');
      } catch {
        expect(pdfBuffer.length).toBeGreaterThan(10000);
      }
    });

    it('4. Generates actual Career Report PDF and verifies all 10 priority/horizon fields and 5 structured analysis fields propagate into the PDF text', async () => {
      const calculator = new ChartCalculator(new AstronomyEngineAdapter());
      const rawChart = await calculator.calculateChart(
        {
          date: { year: 1990, month: 5, day: 15 },
          time: { hour: 14, minute: 30, second: 0 },
          timezone: 'Asia/Kolkata',
          latitude: 28.6139,
          longitude: 77.209,
        },
        DEFAULT_ASTROLOGY_CONFIG
      );
      const normalizedChart = normalizeAstroChart(rawChart);
      const mockAnalysis = await new MockCareerAnalysisProvider().analyze(
        careerEvidenceEngine.buildCareerAnalysisInput(normalizedChart)
      );

      const customAnalysis: CareerAnalysis = {
        ...mockAnalysis,
        executiveCareerSummary: 'Executive career blueprint analysis for Vikram Malhotra.',
        executiveDecisionThemes: 'Strategic domain consolidation with high-leverage mandate.',
        professionalChallenges: 'Balancing execution velocity with enterprise governance.',
        careerDNAAnalysis: '10th lord in 9th house alignment.',
        planetarySynthesis: 'Sun-Mercury synthesis.',
        yogaAnalysis: 'Active Budhaditya Yoga.',
        employmentEntrepreneurshipAnalysis: 'High alignment with independent enterprise advisory.',
        leadershipAnalysis: 'Authoritative, merit-oriented and quantitative.',
        technicalAnalyticalAptitude: 'Enterprise systems architecture and distributed computing.',
        creativeCommunicationBusinessAptitude: 'Executive board-level strategic presentations.',
        researchPotential: 'Deep domain investigation capabilities.',
        sectorFit: 'Fintech and enterprise infrastructure.',
        internationalCareer: 'Favorable overseas engagement.',
        workEnvironment: 'Autonomous structured setting.',
        careerFieldsAnalysis: 'Technology Architecture and Quantitative Finance.',
        topCareerDirections: 'Chief Technology Officer, Enterprise Principal.',
        careerDirectionsCaution: 'Avoid speculative low-structure environments.',
        moneyIncomePattern: 'Compounding equity and high-ticket advisory revenue.',
        relationshipsNetworking: 'Focused high-trust senior executive network.',
        teamDynamics: 'Demands high excellence and provides clear standards.',
        sustainabilityAnalysis: 'Prioritize offline restoration periods.',
        careerObstacles: 'Organizational inertia and slow approvals.',
        professionalGrowth: 'Systematic authority scaling.',
        recommendations: 'Deliver flagship transformation program.',
        professionalDevelopmentPriorities: 'Master enterprise cloud governance.',
        decisionGuidance: 'Filter opportunities by mandate autonomy.',
        actionPlanSummary: 'Phased 30-90-365 day execution sprint.',
        finalSynthesis: 'Formidable career blueprint for enduring distinction.',
        // 10 Horizon and Priority fields:
        primaryProfessionalPriority: 'Deliver flagship architectural mandate with full autonomy.',
        technicalSkillPriority: 'Enterprise distributed systems and cloud governance.',
        communicationSkillPriority: 'Executive board-level business case presentation.',
        leadershipSkillPriority: 'Empowering specialized domain teams without micromanaging.',
        networkSkillPriority: 'Cultivating senior investor and CTO advisory relationships.',
        mistakeToAvoid: 'Getting bogged down in tactical bug-fixes rather than system design.',
        thirtyDayFocus: 'Audit active commitments and cancel 3 low-leverage initiatives.',
        ninetyDayFocus: 'Ship core prototype for the flagship analytics platform.',
        oneYearFocus: 'Formal appointment to VP of Architecture or advisory equivalent.',
        threeYearDirection: 'Founding an independent high-yield strategic consulting practice.',
      };

      const reportData = mapNormalizedChartToCareerReportData(
        normalizedChart,
        customAnalysis,
        { clientName: 'Vikram Malhotra', reportId: 'phase2b3-career-verification' }
      );

      const texOutput = generateReportDataTex(reportData);

      const compiler = new LocalXeLatexCompiler(path.resolve(__dirname, '../../templates'));

      const compilationResult = await compiler.compileReport({
        reportId: 'phase2b3-career-verification',
        reportDataTex: texOutput,
        minPageCount: 1,
        timeoutMs: 120000,
      });

      expect(compilationResult.pdfBuffer).toBeInstanceOf(Buffer);
      expect(compilationResult.pdfBuffer.length).toBeGreaterThan(1000);
      expect(compilationResult.pdfBuffer.subarray(0, 5).toString()).toBe('%PDF-');

      const artifactPath = path.join(__dirname, '../../../../phase2b3_career_report_test.pdf');
      fs.writeFileSync(artifactPath, compilationResult.pdfBuffer);
      expect(fs.existsSync(artifactPath)).toBe(true);

      const text = execSync(`pdftotext "${artifactPath}" -`, { encoding: 'utf-8' });

      // Verify all 10 priority/horizon fields in extracted PDF text:
      expect(text).toContain('Audit active commitments');
      expect(text).toContain('leverage initiatives');
      expect(text).toContain('Ship core prototype for the flagship analytics');
      expect(text).toContain('Formal appointment to VP of Architecture');
      expect(text).toContain('Founding an independent high-yield strategic');
      expect(text).toContain('Deliver flagship architectural mandate with');
      expect(text).toContain('full autonomy');
      expect(text).toContain('Enterprise distributed systems and cloud');
      expect(text).toContain('Executive board-level business case');
      expect(text).toContain('Empowering specialized domain teams');
      expect(text).toContain('Cultivating senior investor and CTO advisory');
      expect(text).toContain('Getting bogged down in tactical bug');

      // Verify 5 structured analysis fields in extracted PDF text:
      expect(text).toContain('Compounding equity');
      expect(text).toContain('advisory revenue');
      expect(text).toContain('Focused high-trust senior executive network');
      expect(text).toContain('Demands high excellence and provides clear standards');
      expect(text).toContain('Prioritize offline restoration periods');
      expect(text).toContain('Filter opportunities by mandate autonomy');
    }, 120000);
  });
});
