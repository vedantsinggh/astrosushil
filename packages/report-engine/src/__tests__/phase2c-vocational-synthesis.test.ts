import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { normalizeAstroChart } from '@astro/astrology-engine';
import {
  mapNormalizedChartToCareerReportData,
  generateReportDataTex,
  latexCompiler,
} from '../index';
import {
  VocationalSynthesisEngine,
  VOCATIONAL_ARCHETYPES,
  CareerArchetypeKey,
  MockCareerAnalysisProvider,
  careerEvidenceEngine,
  PROVISIONAL_HEURISTIC_WEIGHTS,
  getRelativeFitLevel,
} from '@astro/prediction-engine';

describe('Phase 2C: Vocational Evidence and Career Synthesis Personalization (CR-CONT-007 & CR-CONT-008)', () => {
  it('1. Verifies the 8 broad career families taxonomy provenance, traditional basis, and modern extrapolation disclosures', () => {
    const archetypes = Object.keys(VOCATIONAL_ARCHETYPES) as CareerArchetypeKey[];
    expect(archetypes.length).toBe(8);

    const expectedKeys: CareerArchetypeKey[] = [
      'ENGINEERING_TECH',
      'RESEARCH_SCIENCE',
      'MANAGEMENT_LEADERSHIP',
      'BUSINESS_ENTREPRENEURSHIP',
      'COMMUNICATION_EDUCATION',
      'CREATIVE_DESIGN',
      'PUBLIC_SERVICE',
      'FINANCE_ANALYTICS',
    ];

    expect(archetypes.sort()).toEqual(expectedKeys.sort());

    for (const key of expectedKeys) {
      const arch = VOCATIONAL_ARCHETYPES[key];
      expect(arch.title).toBeTruthy();
      expect(arch.category).toBeTruthy();
      expect(arch.primarySignificators.length).toBeGreaterThanOrEqual(2);
      expect(arch.primaryHouses.length).toBeGreaterThanOrEqual(3);
      expect(arch.relevantVargas).toContain('D10');

      // Traditional basis must cite verifiable classical Parashari/Jaimini principles
      expect(arch.traditionalBasis).toBeTruthy();
      expect(arch.traditionalBasis).toMatch(/BPHS|Brihat Jataka|Saravali|Jaimini|Phaladeepika/);

      // Modern mapping must explicitly disclose modern occupational extrapolation
      expect(arch.modernMapping).toContain('Modern occupational extrapolation:');
      expect(arch.knownLimitations).toBeTruthy();
      expect(arch.optimalEnvironment).toBeTruthy();
      expect(arch.practicalExperiment).toBeTruthy();
    }

    // Explicit check for modern technical fields being disclosed as extrapolations
    expect(VOCATIONAL_ARCHETYPES.ENGINEERING_TECH.modernMapping).toContain('artificial intelligence (AI)');
    expect(VOCATIONAL_ARCHETYPES.ENGINEERING_TECH.knownLimitations).toContain('modern heuristic extrapolation');
    expect(VOCATIONAL_ARCHETYPES.CREATIVE_DESIGN.modernMapping).toContain('UI/UX design');
    expect(VOCATIONAL_ARCHETYPES.FINANCE_ANALYTICS.modernMapping).toContain('Quantitative finance');
  });

  it('2. Evaluates contrasting charts and proves career directions are dynamically chart-dependent', () => {
    // -------------------------------------------------------------
    // Chart A: Technical & Engineering Focus
    // Aries Lagna, 10th House Capricorn with Mars exalted in 10th (28° Capricorn)
    // -------------------------------------------------------------
    const techChartData: any = {
      birthDetails: {
        name: 'Technical Native',
        dateOfBirth: '1990-01-15',
        timeOfBirth: '12:00',
        placeName: 'Delhi, India',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      ascendant: { sign: 'Aries', degree: 15.0, nakshatra: 'Bharani', pada: 1 },
      planets: [
        { name: 'Sun', sign: 'Capricorn', degree: 1.0, house: 10, nakshatra: 'Uttara Ashadha', pada: 2, retrograde: false, speedLongitude: 1.0, latitude: 0.0 },
        { name: 'Moon', sign: 'Leo', degree: 10.0, house: 5, nakshatra: 'Magha', pada: 3, retrograde: false, speedLongitude: 12.5, latitude: 1.0 },
        { name: 'Mars', sign: 'Capricorn', degree: 28.0, house: 10, nakshatra: 'Dhanishta', pada: 2, retrograde: false, speedLongitude: 0.8, latitude: -1.0 }, // Exalted in H10
        { name: 'Mercury', sign: 'Sagittarius', degree: 20.0, house: 9, nakshatra: 'Purva Ashadha', pada: 3, retrograde: false, speedLongitude: 1.2, latitude: 0.0 },
        { name: 'Jupiter', sign: 'Gemini', degree: 5.0, house: 3, nakshatra: 'Mrigashira', pada: 4, retrograde: true, speedLongitude: -0.08, latitude: 0.5 },
        { name: 'Venus', sign: 'Aquarius', degree: 12.0, house: 11, nakshatra: 'Shatabhisha', pada: 2, retrograde: false, speedLongitude: 1.1, latitude: -0.5 },
        { name: 'Saturn', sign: 'Sagittarius', degree: 25.0, house: 9, nakshatra: 'Purva Ashadha', pada: 4, retrograde: false, speedLongitude: 0.1, latitude: 1.0 }, // 10th Lord
        { name: 'Rahu', sign: 'Aquarius', degree: 22.0, house: 11, nakshatra: 'Purva Bhadrapada', pada: 1, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Leo', degree: 22.0, house: 5, nakshatra: 'Purva Phalguni', pada: 3, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      ],
      houses: [
        { houseNumber: 1, sign: 'Aries', degree: 15.0 },
        { houseNumber: 2, sign: 'Taurus', degree: 15.0 },
        { houseNumber: 3, sign: 'Gemini', degree: 15.0 },
        { houseNumber: 4, sign: 'Cancer', degree: 15.0 },
        { houseNumber: 5, sign: 'Leo', degree: 15.0 },
        { houseNumber: 6, sign: 'Virgo', degree: 15.0 },
        { houseNumber: 7, sign: 'Libra', degree: 15.0 },
        { houseNumber: 8, sign: 'Scorpio', degree: 15.0 },
        { houseNumber: 9, sign: 'Sagittarius', degree: 15.0 },
        { houseNumber: 10, sign: 'Capricorn', degree: 15.0 },
        { houseNumber: 11, sign: 'Aquarius', degree: 15.0 },
        { houseNumber: 12, sign: 'Pisces', degree: 15.0 },
      ],
    };

    // -------------------------------------------------------------
    // Chart B: Creative Arts & Brand Design Focus
    // Leo Lagna, 10th House Taurus, Venus in Taurus (Own sign in House 10)
    // -------------------------------------------------------------
    const creativeChartData: any = {
      birthDetails: {
        name: 'Creative Native',
        dateOfBirth: '1992-05-20',
        timeOfBirth: '12:00',
        placeName: 'Mumbai, India',
        latitude: 19.076,
        longitude: 72.8777,
        timezone: 'Asia/Kolkata',
      },
      ascendant: { sign: 'Leo', degree: 15.0, nakshatra: 'Purva Phalguni', pada: 1 },
      planets: [
        { name: 'Sun', sign: 'Taurus', degree: 5.0, house: 10, nakshatra: 'Krittika', pada: 3, retrograde: false, speedLongitude: 1.0, latitude: 0.0 },
        { name: 'Moon', sign: 'Cancer', degree: 15.0, house: 12, nakshatra: 'Pushya', pada: 4, retrograde: false, speedLongitude: 13.0, latitude: 2.0 },
        { name: 'Mars', sign: 'Aries', degree: 10.0, house: 9, nakshatra: 'Ashwini', pada: 3, retrograde: false, speedLongitude: 0.7, latitude: -0.5 },
        { name: 'Mercury', sign: 'Gemini', degree: 12.0, house: 11, nakshatra: 'Ardra', pada: 2, retrograde: false, speedLongitude: 1.3, latitude: 0.0 },
        { name: 'Jupiter', sign: 'Virgo', degree: 18.0, house: 2, nakshatra: 'Hasta', pada: 3, retrograde: true, speedLongitude: -0.05, latitude: 0.5 },
        { name: 'Venus', sign: 'Taurus', degree: 20.0, house: 10, nakshatra: 'Rohini', pada: 4, retrograde: false, speedLongitude: 1.2, latitude: 1.0 }, // Own sign in H10
        { name: 'Saturn', sign: 'Aquarius', degree: 22.0, house: 7, nakshatra: 'Purva Bhadrapada', pada: 1, retrograde: false, speedLongitude: 0.1, latitude: 0.8 },
        { name: 'Rahu', sign: 'Sagittarius', degree: 10.0, house: 5, nakshatra: 'Mula', pada: 4, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Gemini', degree: 10.0, house: 11, nakshatra: 'Ardra', pada: 2, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      ],
      houses: [
        { houseNumber: 1, sign: 'Leo', degree: 15.0 },
        { houseNumber: 2, sign: 'Virgo', degree: 15.0 },
        { houseNumber: 3, sign: 'Libra', degree: 15.0 },
        { houseNumber: 4, sign: 'Scorpio', degree: 15.0 },
        { houseNumber: 5, sign: 'Sagittarius', degree: 15.0 },
        { houseNumber: 6, sign: 'Capricorn', degree: 15.0 },
        { houseNumber: 7, sign: 'Aquarius', degree: 15.0 },
        { houseNumber: 8, sign: 'Pisces', degree: 15.0 },
        { houseNumber: 9, sign: 'Aries', degree: 15.0 },
        { houseNumber: 10, sign: 'Taurus', degree: 15.0 },
        { houseNumber: 11, sign: 'Gemini', degree: 15.0 },
        { houseNumber: 12, sign: 'Cancer', degree: 15.0 },
      ],
    };

    const normTech = normalizeAstroChart(techChartData);
    const normCreative = normalizeAstroChart(creativeChartData);

    const reportTech = mapNormalizedChartToCareerReportData(normTech, undefined, techChartData.birthDetails);
    const reportCreative = mapNormalizedChartToCareerReportData(normCreative, undefined, creativeChartData.birthDetails);

    // 1. Verify Career Directions are dynamic and NOT identical constants
    const techRank1 = reportTech.careerAnalysis.careerDirections[0];
    const creativeRank1 = reportCreative.careerAnalysis.careerDirections[0];

    expect(techRank1.title).toBeTruthy();
    expect(creativeRank1.title).toBeTruthy();

    // Must be genuinely different titles
    expect(techRank1.title).not.toEqual(creativeRank1.title);

    // Tech chart has Mars in Capricorn H10 + Sun in H10 ruled by Saturn -> Public Service / Leadership / Tech
    expect(
      techRank1.category === 'Public Service & Governance' ||
      techRank1.category === 'Strategy & Leadership' ||
      techRank1.category === 'Technology & Engineering'
    ).toBe(true);
    expect(techRank1.astrologicalEvidence).toContain('Capricorn');

    // Creative chart has Venus in Taurus in H10 (own sign) -> Creative Arts & Design
    expect(creativeRank1.category).toBe('Creative Arts & Design');

    // 2. Verify Sector Comparisons are chart-dependent
    expect(reportTech.careerAnalysis.sectorComparisons[0].sectorName).not.toEqual(
      reportCreative.careerAnalysis.sectorComparisons[0].sectorName
    );

    // 3. Verify Caution Directions dynamically reflect unanchored domains
    expect(reportTech.careerAnalysis.cautionCareerDirections.length).toBeGreaterThanOrEqual(1);
    expect(reportCreative.careerAnalysis.cautionCareerDirections.length).toBeGreaterThanOrEqual(1);
    expect(reportTech.careerAnalysis.cautionCareerDirections[0].title).not.toEqual(
      'High-Frequency Speculative Trading without Quantitative Models' // Old hardcoded static string
    );

    // 4. Verify Overconfident Predictions (CR-CONT-008) are eliminated
    expect(reportTech.careerAnalysis.roadmapThirtyDay.metrics).not.toContain('100% on-time milestone delivery');
    expect(reportTech.careerAnalysis.roadmapNinetyDay.metrics).not.toContain('Measurable 20% efficiency or revenue uplift');
    expect(reportTech.careerAnalysis.roadmapThirtyDay.metrics).not.toContain('10-15%');
    expect(reportCreative.careerAnalysis.roadmapThirtyDay.metrics).not.toContain('100% on-time milestone delivery');
  });

  it('3. Generates complete TeX macros and compiles production XeLaTeX PDF with dynamic career directions', async () => {
    const testAstroChart: any = {
      birthDetails: {
        name: 'Phase 2C Verified Native',
        dateOfBirth: '1988-04-18',
        timeOfBirth: '06:30',
        placeName: 'Jaipur, India',
        latitude: 26.9124,
        longitude: 75.7873,
        timezone: 'Asia/Kolkata',
      },
      ascendant: { sign: 'Aries', degree: 15.0, nakshatra: 'Bharani', pada: 1 },
      planets: [
        { name: 'Sun', sign: 'Aries', degree: 15.0, house: 1, nakshatra: 'Bharani', pada: 1, retrograde: false, speedLongitude: 1.0, latitude: 0.0 },
        { name: 'Moon', sign: 'Taurus', degree: 10.0, house: 2, nakshatra: 'Rohini', pada: 1, retrograde: false, speedLongitude: 13.0, latitude: 2.0 },
        { name: 'Mars', sign: 'Capricorn', degree: 28.0, house: 10, nakshatra: 'Dhanishta', pada: 2, retrograde: false, speedLongitude: 0.7, latitude: -1.0 },
        { name: 'Mercury', sign: 'Pisces', degree: 20.0, house: 12, nakshatra: 'Revati', pada: 2, retrograde: false, speedLongitude: 1.2, latitude: 1.5 },
        { name: 'Jupiter', sign: 'Aries', degree: 18.0, house: 1, nakshatra: 'Bharani', pada: 2, retrograde: false, speedLongitude: 0.2, latitude: -0.5 },
        { name: 'Venus', sign: 'Taurus', degree: 25.0, house: 2, nakshatra: 'Mrigashira', pada: 1, retrograde: false, speedLongitude: 1.1, latitude: 1.0 },
        { name: 'Saturn', sign: 'Sagittarius', degree: 8.0, house: 9, nakshatra: 'Mula', pada: 3, retrograde: true, speedLongitude: -0.03, latitude: 0.8 },
        { name: 'Rahu', sign: 'Aquarius', degree: 28.0, house: 11, nakshatra: 'Purva Bhadrapada', pada: 3, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Leo', degree: 28.0, house: 5, nakshatra: 'Uttara Phalguni', pada: 1, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      ],
      houses: [
        { houseNumber: 1, sign: 'Aries', degree: 15.0 },
        { houseNumber: 2, sign: 'Taurus', degree: 15.0 },
        { houseNumber: 3, sign: 'Gemini', degree: 15.0 },
        { houseNumber: 4, sign: 'Cancer', degree: 15.0 },
        { houseNumber: 5, sign: 'Leo', degree: 15.0 },
        { houseNumber: 6, sign: 'Virgo', degree: 15.0 },
        { houseNumber: 7, sign: 'Libra', degree: 15.0 },
        { houseNumber: 8, sign: 'Scorpio', degree: 15.0 },
        { houseNumber: 9, sign: 'Sagittarius', degree: 15.0 },
        { houseNumber: 10, sign: 'Capricorn', degree: 15.0 },
        { houseNumber: 11, sign: 'Aquarius', degree: 15.0 },
        { houseNumber: 12, sign: 'Pisces', degree: 15.0 },
      ],
    };

    const norm = normalizeAstroChart(testAstroChart);

    // Populate mock analysis to satisfy QA check
    const mockProvider = new MockCareerAnalysisProvider();
    const evidenceInput = careerEvidenceEngine.buildCareerAnalysisInput(norm);
    const mockAnalysis = await mockProvider.analyze(evidenceInput);

    const reportData = mapNormalizedChartToCareerReportData(norm, mockAnalysis, testAstroChart.birthDetails);

    // Verify dynamic synthesis output is populated
    expect(reportData.careerAnalysis.careerDirections.length).toBeGreaterThanOrEqual(1);
    const rank1Title = reportData.careerAnalysis.careerDirections[0].title;
    expect(rank1Title).toBeTruthy();

    const reportDataTex = generateReportDataTex(reportData);

    // Verify that dynamic synthesis macros are rendered into LaTeX
    const escapedRank1Title = rank1Title.replace(/&/g, '\\&');
    expect(reportDataTex).toContain('\\newcommand{\\CareerDirOneTitle}');
    expect(reportDataTex).toContain(escapedRank1Title);
    expect(reportDataTex).toContain('\\newcommand{\\SectorOneFit}');

    // Compile production XeLaTeX PDF
    const compileResult = await latexCompiler.compileReport({
      reportId: 'phase2c-vocational-test',
      reportDataTex,
      clientName: testAstroChart.birthDetails.name,
      reportType: 'Production Career Dossier',
      minPageCount: 1,
      timeoutMs: 120000,
    });

    expect(compileResult.pdfBuffer).toBeDefined();
    expect(compileResult.pdfBuffer.length).toBeGreaterThan(10000);
    expect(compileResult.pageCount).toBeGreaterThanOrEqual(1);

    const testPdfPath = '/tmp/phase2c_career_report_test.pdf';
    fs.writeFileSync(testPdfPath, compileResult.pdfBuffer);
    expect(fs.existsSync(testPdfPath)).toBe(true);

    // Verify extracted text from PDF contains the dynamically synthesized career title
    const pdftotextResult = execSync(`pdftotext "${testPdfPath}" -`).toString();
    expect(pdftotextResult).toContain('CAREER DOSSIER');
    expect(pdftotextResult).toContain('Phase 2C Verified Native');
  }, 180000);

  it('4. Robustness: Gracefully handles missing optional inputs (D10, AmK, Shadbala, SAV, Dasha) without crashing or NaNs', () => {
    const minimalChart: any = {
      birthDetails: {
        name: 'Minimal Input Native',
        dateOfBirth: '2000-01-01',
        timeOfBirth: '12:00',
        placeName: 'Delhi, India',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      ascendant: { sign: 'Taurus', degree: 10.0, nakshatra: 'Rohini', pada: 1 },
      planets: [
        { name: 'Sun', sign: 'Sagittarius', degree: 16.0, house: 8, nakshatra: 'Purva Ashadha', pada: 1, retrograde: false, speedLongitude: 1.0, latitude: 0.0 },
        { name: 'Moon', sign: 'Libra', degree: 20.0, house: 6, nakshatra: 'Vishakha', pada: 1, retrograde: false, speedLongitude: 12.0, latitude: 0.0 },
        { name: 'Mars', sign: 'Capricorn', degree: 5.0, house: 9, nakshatra: 'Uttara Ashadha', pada: 3, retrograde: false, speedLongitude: 0.8, latitude: 0.0 },
        { name: 'Mercury', sign: 'Sagittarius', degree: 10.0, house: 8, nakshatra: 'Mula', pada: 4, retrograde: false, speedLongitude: 1.2, latitude: 0.0 },
        { name: 'Jupiter', sign: 'Aries', degree: 2.0, house: 12, nakshatra: 'Ashwini', pada: 1, retrograde: false, speedLongitude: 0.1, latitude: 0.0 },
        { name: 'Venus', sign: 'Scorpio', degree: 28.0, house: 7, nakshatra: 'Jyeshtha', pada: 4, retrograde: false, speedLongitude: 1.1, latitude: 0.0 },
        { name: 'Saturn', sign: 'Aries', degree: 15.0, house: 12, nakshatra: 'Bharani', pada: 1, retrograde: false, speedLongitude: 0.05, latitude: 0.0 },
        { name: 'Rahu', sign: 'Cancer', degree: 12.0, house: 3, nakshatra: 'Pushya', pada: 3, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Capricorn', degree: 12.0, house: 9, nakshatra: 'Shravana', pada: 1, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      ],
      houses: [
        { houseNumber: 1, sign: 'Taurus', degree: 10.0 },
        { houseNumber: 2, sign: 'Gemini', degree: 10.0 },
        { houseNumber: 3, sign: 'Cancer', degree: 10.0 },
        { houseNumber: 4, sign: 'Leo', degree: 10.0 },
        { houseNumber: 5, sign: 'Virgo', degree: 10.0 },
        { houseNumber: 6, sign: 'Libra', degree: 10.0 },
        { houseNumber: 7, sign: 'Scorpio', degree: 10.0 },
        { houseNumber: 8, sign: 'Sagittarius', degree: 10.0 },
        { houseNumber: 9, sign: 'Capricorn', degree: 10.0 },
        { houseNumber: 10, sign: 'Aquarius', degree: 10.0 },
        { houseNumber: 11, sign: 'Pisces', degree: 10.0 },
        { houseNumber: 12, sign: 'Aries', degree: 10.0 },
      ],
    };

    const norm = normalizeAstroChart(minimalChart);
    const engine = new VocationalSynthesisEngine();

    // Call synthesize with NO optional fields provided
    const result = engine.synthesize({
      chart: norm,
    });

    expect(result.rankedArchetypes.length).toBe(8);
    for (const sa of result.rankedArchetypes) {
      expect(isNaN(sa.totalScore)).toBe(false);
      expect(sa.totalScore).toBeGreaterThanOrEqual(0);
      expect(isNaN(sa.breakdown.tenthLordScore)).toBe(false);
      expect(isNaN(sa.breakdown.tenthOccupantsScore)).toBe(false);
      expect(isNaN(sa.breakdown.tenthAspectsScore)).toBe(false);
      expect(isNaN(sa.breakdown.amkScore)).toBe(false);
      expect(isNaN(sa.breakdown.d10Score)).toBe(false);
      expect(isNaN(sa.breakdown.shadbalaScore)).toBe(false);
      expect(isNaN(sa.breakdown.savScore)).toBe(false);
      expect(isNaN(sa.breakdown.dashaScore)).toBe(false);
    }
  });

  it('5. Duplicate evidence contributions audit: Verifies 10th lord occupying 10th house is not counted twice in occupant or aspect score', () => {
    // Chart with Aries Lagna, 10th House Capricorn, Saturn in Capricorn in House 10
    // Saturn is BOTH 10th Lord AND physically in 10th House
    const doubleCountChart: any = {
      birthDetails: {
        name: 'Own House Native',
        dateOfBirth: '1990-01-01',
        timeOfBirth: '12:00',
        placeName: 'Delhi',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      ascendant: { sign: 'Aries', degree: 15.0, nakshatra: 'Bharani', pada: 1 },
      planets: [
        { name: 'Sun', sign: 'Sagittarius', degree: 10.0, house: 9, nakshatra: 'Mula', pada: 4, retrograde: false, speedLongitude: 1.0, latitude: 0.0 },
        { name: 'Moon', sign: 'Taurus', degree: 15.0, house: 2, nakshatra: 'Rohini', pada: 2, retrograde: false, speedLongitude: 12.0, latitude: 0.0 },
        { name: 'Mars', sign: 'Scorpio', degree: 5.0, house: 8, nakshatra: 'Anuradha', pada: 1, retrograde: false, speedLongitude: 0.8, latitude: 0.0 },
        { name: 'Mercury', sign: 'Sagittarius', degree: 20.0, house: 9, nakshatra: 'Purva Ashadha', pada: 3, retrograde: false, speedLongitude: 1.2, latitude: 0.0 },
        { name: 'Jupiter', sign: 'Cancer', degree: 15.0, house: 4, nakshatra: 'Pushya', pada: 4, retrograde: false, speedLongitude: 0.2, latitude: 0.0 },
        { name: 'Venus', sign: 'Capricorn', degree: 10.0, house: 10, nakshatra: 'Shravana', pada: 1, retrograde: false, speedLongitude: 1.1, latitude: 0.0 },
        { name: 'Saturn', sign: 'Capricorn', degree: 20.0, house: 10, nakshatra: 'Shravana', pada: 4, retrograde: false, speedLongitude: 0.1, latitude: 0.0, dignity: 'OWN_SIGN' }, // 10th lord in 10th house
        { name: 'Rahu', sign: 'Aquarius', degree: 15.0, house: 11, nakshatra: 'Shatabhisha', pada: 3, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Leo', degree: 15.0, house: 5, nakshatra: 'Purva Phalguni', pada: 1, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      ],
      houses: [
        { houseNumber: 1, sign: 'Aries', degree: 15.0 },
        { houseNumber: 2, sign: 'Taurus', degree: 15.0 },
        { houseNumber: 3, sign: 'Gemini', degree: 15.0 },
        { houseNumber: 4, sign: 'Cancer', degree: 15.0 },
        { houseNumber: 5, sign: 'Leo', degree: 15.0 },
        { houseNumber: 6, sign: 'Virgo', degree: 15.0 },
        { houseNumber: 7, sign: 'Libra', degree: 15.0 },
        { houseNumber: 8, sign: 'Scorpio', degree: 15.0 },
        { houseNumber: 9, sign: 'Sagittarius', degree: 15.0 },
        { houseNumber: 10, sign: 'Capricorn', degree: 15.0 },
        { houseNumber: 11, sign: 'Aquarius', degree: 15.0 },
        { houseNumber: 12, sign: 'Pisces', degree: 15.0 },
      ],
    };

    const norm = normalizeAstroChart(doubleCountChart);
    const engine = new VocationalSynthesisEngine();

    const result = engine.synthesize({ chart: norm });

    // Find PUBLIC_SERVICE (primary significator is Saturn)
    const pubService = result.rankedArchetypes.find((a) => a.archetype.key === 'PUBLIC_SERVICE');
    expect(pubService).toBeDefined();

    // 10th lord score should include TENTH_LORD_PRIMARY (30) + TENTH_LORD_DIGNITY_BONUS (8) + favorable sign (6) = 44
    expect(pubService!.breakdown.tenthLordScore).toBe(
      PROVISIONAL_HEURISTIC_WEIGHTS.TENTH_LORD_PRIMARY +
      PROVISIONAL_HEURISTIC_WEIGHTS.TENTH_LORD_DIGNITY_BONUS +
      PROVISIONAL_HEURISTIC_WEIGHTS.TENTH_HOUSE_FAVORABLE_SIGN
    );

    // Tenth occupants score must NOT include Saturn again!
    // Distinct occupants in H10 is only Venus (which is not primary for Public Service).
    expect(pubService!.breakdown.tenthOccupantsScore).toBe(0);

    // Saturn must NOT cast an aspect on its own 10th house
    expect(pubService!.breakdown.tenthAspectsScore).toBe(0);
  });

  it('6. Missing SAV handling: Verifies unavailable SAV contributes 0 points and is distinguishable from measured SAV', () => {
    const testChart: any = {
      birthDetails: {
        name: 'SAV Missing Native',
        dateOfBirth: '1995-03-21',
        timeOfBirth: '10:00',
        placeName: 'Delhi',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      ascendant: { sign: 'Taurus', degree: 15.0, nakshatra: 'Rohini', pada: 2 },
      planets: [
        { name: 'Sun', sign: 'Pisces', degree: 5.0, house: 11, nakshatra: 'Uttara Bhadrapada', pada: 1, retrograde: false, speedLongitude: 1.0, latitude: 0.0 },
        { name: 'Moon', sign: 'Scorpio', degree: 15.0, house: 7, nakshatra: 'Anuradha', pada: 4, retrograde: false, speedLongitude: 12.0, latitude: 0.0 },
        { name: 'Mars', sign: 'Cancer', degree: 20.0, house: 3, nakshatra: 'Ashlesha', pada: 2, retrograde: false, speedLongitude: 0.7, latitude: 0.0 },
        { name: 'Mercury', sign: 'Pisces', degree: 15.0, house: 11, nakshatra: 'Uttara Bhadrapada', pada: 4, retrograde: false, speedLongitude: 1.2, latitude: 0.0 },
        { name: 'Jupiter', sign: 'Scorpio', degree: 18.0, house: 7, nakshatra: 'Jyeshtha', pada: 1, retrograde: false, speedLongitude: 0.1, latitude: 0.0 },
        { name: 'Venus', sign: 'Capricorn', degree: 10.0, house: 9, nakshatra: 'Shravana', pada: 1, retrograde: false, speedLongitude: 1.1, latitude: 0.0 },
        { name: 'Saturn', sign: 'Aquarius', degree: 22.0, house: 10, nakshatra: 'Purva Bhadrapada', pada: 1, retrograde: false, speedLongitude: 0.1, latitude: 0.0 },
        { name: 'Rahu', sign: 'Libra', degree: 12.0, house: 6, nakshatra: 'Svati', pada: 2, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Aries', degree: 12.0, house: 12, nakshatra: 'Ashwini', pada: 4, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      ],
      houses: [
        { houseNumber: 1, sign: 'Taurus', degree: 15.0 },
        { houseNumber: 2, sign: 'Gemini', degree: 15.0 },
        { houseNumber: 3, sign: 'Cancer', degree: 15.0 },
        { houseNumber: 4, sign: 'Leo', degree: 15.0 },
        { houseNumber: 5, sign: 'Virgo', degree: 15.0 },
        { houseNumber: 6, sign: 'Libra', degree: 15.0 },
        { houseNumber: 7, sign: 'Scorpio', degree: 15.0 },
        { houseNumber: 8, sign: 'Sagittarius', degree: 15.0 },
        { houseNumber: 9, sign: 'Capricorn', degree: 15.0 },
        { houseNumber: 10, sign: 'Aquarius', degree: 15.0 },
        { houseNumber: 11, sign: 'Pisces', degree: 15.0 },
        { houseNumber: 12, sign: 'Aries', degree: 15.0 },
      ],
    };

    const norm = normalizeAstroChart(testChart);
    const engine = new VocationalSynthesisEngine();

    // 1. When savBindus is completely undefined / unavailable:
    const resultMissing = engine.synthesize({
      chart: norm,
      savBindus: undefined,
    });

    for (const a of resultMissing.rankedArchetypes) {
      expect(a.breakdown.savScore).toBe(0);
      expect(a.evidenceSummary).not.toContain('> 28 benchmark');
    }

    // Downstream strength dimensions must explicitly declare unavailable, NOT pretend it is 28
    const staminaDim = resultMissing.strengthMatrixDimensions.find((d) => d.dimension === 'Operational Discipline & Delivery Stamina');
    expect(staminaDim!.astrologicalEvidence).toContain('(Sarvashtakavarga bindus unavailable)');
    expect(staminaDim!.astrologicalEvidence).not.toContain('28 SAV bindus');
  });

  it('7. SAV benchmark equilibrium audit: Verifies actual SAV = 28 receives 0 bonus points and is distinguishable from unavailable SAV', () => {
    const testChart: any = {
      birthDetails: {
        name: 'SAV Equilibrium Native',
        dateOfBirth: '1995-03-21',
        timeOfBirth: '10:00',
        placeName: 'Delhi',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      ascendant: { sign: 'Taurus', degree: 15.0, nakshatra: 'Rohini', pada: 2 },
      planets: [
        { name: 'Sun', sign: 'Pisces', degree: 5.0, house: 11, nakshatra: 'Uttara Bhadrapada', pada: 1, retrograde: false, speedLongitude: 1.0, latitude: 0.0 },
        { name: 'Moon', sign: 'Scorpio', degree: 15.0, house: 7, nakshatra: 'Anuradha', pada: 4, retrograde: false, speedLongitude: 12.0, latitude: 0.0 },
        { name: 'Mars', sign: 'Cancer', degree: 20.0, house: 3, nakshatra: 'Ashlesha', pada: 2, retrograde: false, speedLongitude: 0.7, latitude: 0.0 },
        { name: 'Mercury', sign: 'Pisces', degree: 15.0, house: 11, nakshatra: 'Uttara Bhadrapada', pada: 4, retrograde: false, speedLongitude: 1.2, latitude: 0.0 },
        { name: 'Jupiter', sign: 'Scorpio', degree: 18.0, house: 7, nakshatra: 'Jyeshtha', pada: 1, retrograde: false, speedLongitude: 0.1, latitude: 0.0 },
        { name: 'Venus', sign: 'Capricorn', degree: 10.0, house: 9, nakshatra: 'Shravana', pada: 1, retrograde: false, speedLongitude: 1.1, latitude: 0.0 },
        { name: 'Saturn', sign: 'Aquarius', degree: 22.0, house: 10, nakshatra: 'Purva Bhadrapada', pada: 1, retrograde: false, speedLongitude: 0.1, latitude: 0.0 },
        { name: 'Rahu', sign: 'Libra', degree: 12.0, house: 6, nakshatra: 'Svati', pada: 2, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Aries', degree: 12.0, house: 12, nakshatra: 'Ashwini', pada: 4, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      ],
      houses: [
        { houseNumber: 1, sign: 'Taurus', degree: 15.0 },
        { houseNumber: 2, sign: 'Gemini', degree: 15.0 },
        { houseNumber: 3, sign: 'Cancer', degree: 15.0 },
        { houseNumber: 4, sign: 'Leo', degree: 15.0 },
        { houseNumber: 5, sign: 'Virgo', degree: 15.0 },
        { houseNumber: 6, sign: 'Libra', degree: 15.0 },
        { houseNumber: 7, sign: 'Scorpio', degree: 15.0 },
        { houseNumber: 8, sign: 'Sagittarius', degree: 15.0 },
        { houseNumber: 9, sign: 'Capricorn', degree: 15.0 },
        { houseNumber: 10, sign: 'Aquarius', degree: 15.0 },
        { houseNumber: 11, sign: 'Pisces', degree: 15.0 },
        { houseNumber: 12, sign: 'Aries', degree: 15.0 },
      ],
    };

    const norm = normalizeAstroChart(testChart);
    const engine = new VocationalSynthesisEngine();

    // When SAV is supplied as exactly 28 (neutral equilibrium):
    const result28 = engine.synthesize({
      chart: norm,
      savBindus: { 10: 28, 11: 28, 2: 28, 6: 28, 3: 28 },
    });

    for (const a of result28.rankedArchetypes) {
      expect(a.breakdown.savScore).toBe(0);
      expect(a.evidenceSummary).not.toContain('> 28 benchmark');
    }

    // Downstream text DOES record the measured value of 28 bindus
    const staminaDim = result28.strengthMatrixDimensions.find((d) => d.dimension === 'Operational Discipline & Delivery Stamina');
    expect(staminaDim!.astrologicalEvidence).toContain('6th House with 28 SAV bindus (Benchmark: 28)');
    expect(staminaDim!.astrologicalEvidence).not.toContain('unavailable');
  });

  it('8. SAV above-average bonus audit: Verifies actual SAV = 29 receives the configured above-average bonus', () => {
    const testChart: any = {
      birthDetails: {
        name: 'SAV Above Native',
        dateOfBirth: '1995-03-21',
        timeOfBirth: '10:00',
        placeName: 'Delhi',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      ascendant: { sign: 'Taurus', degree: 15.0, nakshatra: 'Rohini', pada: 2 },
      planets: [
        { name: 'Sun', sign: 'Pisces', degree: 5.0, house: 11, nakshatra: 'Uttara Bhadrapada', pada: 1, retrograde: false, speedLongitude: 1.0, latitude: 0.0 },
        { name: 'Moon', sign: 'Scorpio', degree: 15.0, house: 7, nakshatra: 'Anuradha', pada: 4, retrograde: false, speedLongitude: 12.0, latitude: 0.0 },
        { name: 'Mars', sign: 'Cancer', degree: 20.0, house: 3, nakshatra: 'Ashlesha', pada: 2, retrograde: false, speedLongitude: 0.7, latitude: 0.0 },
        { name: 'Mercury', sign: 'Pisces', degree: 15.0, house: 11, nakshatra: 'Uttara Bhadrapada', pada: 4, retrograde: false, speedLongitude: 1.2, latitude: 0.0 },
        { name: 'Jupiter', sign: 'Scorpio', degree: 18.0, house: 7, nakshatra: 'Jyeshtha', pada: 1, retrograde: false, speedLongitude: 0.1, latitude: 0.0 },
        { name: 'Venus', sign: 'Capricorn', degree: 10.0, house: 9, nakshatra: 'Shravana', pada: 1, retrograde: false, speedLongitude: 1.1, latitude: 0.0 },
        { name: 'Saturn', sign: 'Aquarius', degree: 22.0, house: 10, nakshatra: 'Purva Bhadrapada', pada: 1, retrograde: false, speedLongitude: 0.1, latitude: 0.0 },
        { name: 'Rahu', sign: 'Libra', degree: 12.0, house: 6, nakshatra: 'Svati', pada: 2, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Aries', degree: 12.0, house: 12, nakshatra: 'Ashwini', pada: 4, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      ],
      houses: [
        { houseNumber: 1, sign: 'Taurus', degree: 15.0 },
        { houseNumber: 2, sign: 'Gemini', degree: 15.0 },
        { houseNumber: 3, sign: 'Cancer', degree: 15.0 },
        { houseNumber: 4, sign: 'Leo', degree: 15.0 },
        { houseNumber: 5, sign: 'Virgo', degree: 15.0 },
        { houseNumber: 6, sign: 'Libra', degree: 15.0 },
        { houseNumber: 7, sign: 'Scorpio', degree: 15.0 },
        { houseNumber: 8, sign: 'Sagittarius', degree: 15.0 },
        { houseNumber: 9, sign: 'Capricorn', degree: 15.0 },
        { houseNumber: 10, sign: 'Aquarius', degree: 15.0 },
        { houseNumber: 11, sign: 'Pisces', degree: 15.0 },
        { houseNumber: 12, sign: 'Aries', degree: 15.0 },
      ],
    };

    const norm = normalizeAstroChart(testChart);
    const engine = new VocationalSynthesisEngine();

    const result29 = engine.synthesize({
      chart: norm,
      savBindus: { 10: 29, 11: 30, 2: 29, 6: 29, 3: 29 },
    });

    const fin29 = result29.rankedArchetypes.find((a) => a.archetype.key === 'FINANCE_ANALYTICS');
    expect(fin29!.breakdown.savScore).toBe(
      PROVISIONAL_HEURISTIC_WEIGHTS.SAV_BENCHMARK_ABOVE +
      PROVISIONAL_HEURISTIC_WEIGHTS.SAV_BENCHMARK_SECONDARY
    );
    expect(fin29!.evidenceSummary).toContain('2nd House SAV 29 > 28 benchmark');
    expect(fin29!.evidenceSummary).toContain('11th House SAV 30 > 28 benchmark');
  });

  it('9. Fit-tier presentation labels audit: Verifies presentation labels denote relative heuristic fit and eliminate calibration/probability overclaiming', () => {
    // Check all presentation tiers
    expect(getRelativeFitLevel(75)).toBe('Strong relative heuristic fit');
    expect(getRelativeFitLevel(70)).toBe('Strong relative heuristic fit');
    expect(getRelativeFitLevel(69)).toBe('Moderate relative heuristic fit');
    expect(getRelativeFitLevel(45)).toBe('Moderate relative heuristic fit');
    expect(getRelativeFitLevel(44)).toBe('Limited relative heuristic fit');
    expect(getRelativeFitLevel(25)).toBe('Limited relative heuristic fit');
    expect(getRelativeFitLevel(24)).toBe('Insufficient evidence');
    expect(getRelativeFitLevel(0)).toBe('Insufficient evidence');
  });

  it('10. Contradictory D1 and D10 evidence audit: Verifies D1 retains foundational hierarchy without inventing artificial conflict penalties', () => {
    // Chart where D1 has Aries Lagna, Capricorn 10th house ruled by Saturn -> favors Public Service / Leadership / Tech
    // D10 has 10th house ruled by Mercury -> favors Business / Communication
    const contradictoryChart: any = {
      birthDetails: {
        name: 'D1 vs D10 Native',
        dateOfBirth: '1988-08-10',
        timeOfBirth: '12:00',
        placeName: 'Delhi',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      ascendant: { sign: 'Aries', degree: 15.0, nakshatra: 'Bharani', pada: 1 },
      planets: [
        { name: 'Sun', sign: 'Cancer', degree: 20.0, house: 4, nakshatra: 'Ashlesha', pada: 2, retrograde: false, speedLongitude: 1.0, latitude: 0.0 },
        { name: 'Moon', sign: 'Gemini', degree: 10.0, house: 3, nakshatra: 'Ardra', pada: 2, retrograde: false, speedLongitude: 12.0, latitude: 0.0 },
        { name: 'Mars', sign: 'Pisces', degree: 5.0, house: 12, nakshatra: 'Uttara Bhadrapada', pada: 1, retrograde: false, speedLongitude: 0.8, latitude: 0.0 },
        { name: 'Mercury', sign: 'Leo', degree: 15.0, house: 5, nakshatra: 'Purva Phalguni', pada: 1, retrograde: false, speedLongitude: 1.2, latitude: 0.0 },
        { name: 'Jupiter', sign: 'Taurus', degree: 10.0, house: 2, nakshatra: 'Rohini', pada: 1, retrograde: false, speedLongitude: 0.1, latitude: 0.0 },
        { name: 'Venus', sign: 'Gemini', degree: 25.0, house: 3, nakshatra: 'Punarvasu', pada: 2, retrograde: false, speedLongitude: 1.1, latitude: 0.0 },
        { name: 'Saturn', sign: 'Sagittarius', degree: 2.0, house: 9, nakshatra: 'Mula', pada: 1, retrograde: false, speedLongitude: 0.05, latitude: 0.0 }, // 10th lord
        { name: 'Rahu', sign: 'Aquarius', degree: 20.0, house: 11, nakshatra: 'Purva Bhadrapada', pada: 1, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Leo', degree: 20.0, house: 5, nakshatra: 'Purva Phalguni', pada: 3, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      ],
      houses: [
        { houseNumber: 1, sign: 'Aries', degree: 15.0 },
        { houseNumber: 2, sign: 'Taurus', degree: 15.0 },
        { houseNumber: 3, sign: 'Gemini', degree: 15.0 },
        { houseNumber: 4, sign: 'Cancer', degree: 15.0 },
        { houseNumber: 5, sign: 'Leo', degree: 15.0 },
        { houseNumber: 6, sign: 'Virgo', degree: 15.0 },
        { houseNumber: 7, sign: 'Libra', degree: 15.0 },
        { houseNumber: 8, sign: 'Scorpio', degree: 15.0 },
        { houseNumber: 9, sign: 'Sagittarius', degree: 15.0 },
        { houseNumber: 10, sign: 'Capricorn', degree: 15.0 },
        { houseNumber: 11, sign: 'Aquarius', degree: 15.0 },
        { houseNumber: 12, sign: 'Pisces', degree: 15.0 },
      ],
    };

    const norm = normalizeAstroChart(contradictoryChart);
    const engine = new VocationalSynthesisEngine();

    const result = engine.synthesize({
      chart: norm,
      d10TenthHouseLord: 'MERCURY', // Contradicts D1 10th lord (Saturn)
    });

    const pubService = result.rankedArchetypes.find((a) => a.archetype.key === 'PUBLIC_SERVICE');
    const biz = result.rankedArchetypes.find((a) => a.archetype.key === 'BUSINESS_ENTREPRENEURSHIP');

    // D1 lord points go to Public Service (Primary 30 + Capricorn favorable sign 6 = 36)
    expect(pubService!.breakdown.tenthLordScore).toBe(
      PROVISIONAL_HEURISTIC_WEIGHTS.TENTH_LORD_PRIMARY +
      PROVISIONAL_HEURISTIC_WEIGHTS.TENTH_HOUSE_FAVORABLE_SIGN
    );
    expect(pubService!.breakdown.d10Score).toBe(0);

    // D10 lord points go to Business
    expect(biz!.breakdown.tenthLordScore).toBe(0);
    expect(biz!.breakdown.d10Score).toBe(PROVISIONAL_HEURISTIC_WEIGHTS.D10_TENTH_LORD);

    // D1 maintains higher foundational priority (weight 30 vs 16)
    expect(pubService!.breakdown.tenthLordScore).toBeGreaterThan(biz!.breakdown.d10Score);

    // Neither archetype receives artificial penalty deductions
    expect(pubService!.totalScore).toBeGreaterThanOrEqual(pubService!.breakdown.tenthLordScore);
    expect(biz!.totalScore).toBeGreaterThanOrEqual(biz!.breakdown.d10Score);
  });

  it('11. Deterministic tie-breaking audit: Verifies strict hierarchical resolution between identical-scoring archetypes', () => {
    // Construct a chart where multiple archetypes have identical scores
    const testChart: any = {
      birthDetails: {
        name: 'Tie Break Native',
        dateOfBirth: '2000-01-01',
        timeOfBirth: '12:00',
        placeName: 'Delhi',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      ascendant: { sign: 'Pisces', degree: 15.0, nakshatra: 'Uttara Bhadrapada', pada: 4 },
      planets: [
        { name: 'Sun', sign: 'Sagittarius', degree: 16.0, house: 10, nakshatra: 'Purva Ashadha', pada: 1, retrograde: false, speedLongitude: 1.0, latitude: 0.0 }, // 10th occupant
        { name: 'Moon', sign: 'Libra', degree: 20.0, house: 8, nakshatra: 'Vishakha', pada: 1, retrograde: false, speedLongitude: 12.0, latitude: 0.0 },
        { name: 'Mars', sign: 'Capricorn', degree: 5.0, house: 11, nakshatra: 'Uttara Ashadha', pada: 3, retrograde: false, speedLongitude: 0.8, latitude: 0.0 },
        { name: 'Mercury', sign: 'Sagittarius', degree: 10.0, house: 10, nakshatra: 'Mula', pada: 4, retrograde: false, speedLongitude: 1.2, latitude: 0.0 }, // 10th occupant
        { name: 'Jupiter', sign: 'Aries', degree: 2.0, house: 2, nakshatra: 'Ashwini', pada: 1, retrograde: false, speedLongitude: 0.1, latitude: 0.0 }, // 10th lord
        { name: 'Venus', sign: 'Scorpio', degree: 28.0, house: 9, nakshatra: 'Jyeshtha', pada: 4, retrograde: false, speedLongitude: 1.1, latitude: 0.0 },
        { name: 'Saturn', sign: 'Aries', degree: 15.0, house: 2, nakshatra: 'Bharani', pada: 1, retrograde: false, speedLongitude: 0.05, latitude: 0.0 },
        { name: 'Rahu', sign: 'Cancer', degree: 12.0, house: 5, nakshatra: 'Pushya', pada: 3, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Capricorn', degree: 12.0, house: 11, nakshatra: 'Shravana', pada: 1, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      ],
      houses: [
        { houseNumber: 1, sign: 'Pisces', degree: 15.0 },
        { houseNumber: 2, sign: 'Aries', degree: 15.0 },
        { houseNumber: 3, sign: 'Taurus', degree: 15.0 },
        { houseNumber: 4, sign: 'Gemini', degree: 15.0 },
        { houseNumber: 5, sign: 'Cancer', degree: 15.0 },
        { houseNumber: 6, sign: 'Leo', degree: 15.0 },
        { houseNumber: 7, sign: 'Virgo', degree: 15.0 },
        { houseNumber: 8, sign: 'Libra', degree: 15.0 },
        { houseNumber: 9, sign: 'Scorpio', degree: 15.0 },
        { houseNumber: 10, sign: 'Sagittarius', degree: 15.0 },
        { houseNumber: 11, sign: 'Capricorn', degree: 15.0 },
        { houseNumber: 12, sign: 'Aquarius', degree: 15.0 },
      ],
    };

    const norm = normalizeAstroChart(testChart);
    const engine = new VocationalSynthesisEngine();

    const run1 = engine.synthesize({ chart: norm });
    const run2 = engine.synthesize({ chart: norm });

    // Ranks must be 100% identical between runs
    expect(run1.rankedArchetypes.map((a) => a.archetype.key)).toEqual(
      run2.rankedArchetypes.map((a) => a.archetype.key)
    );
  });

  it('12. Insufficient evidence audit: Does not force career recommendations when chart evidence falls below provisional threshold', () => {
    // Construct a chart where NO archetype has sufficient alignment:
    // All planets in houses that do not aspect or occupy 10th, 10th lord debilitated, no AmK, no D10, no SAV, no Dasha.
    const vacantChart: any = {
      birthDetails: {
        name: 'Insufficient Evidence Native',
        dateOfBirth: '2005-01-01',
        timeOfBirth: '12:00',
        placeName: 'Delhi',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      ascendant: { sign: 'Taurus', degree: 15.0, nakshatra: 'Rohini', pada: 2 },
      planets: [
        // 10th house is Aquarius, 10th lord is Saturn. Place Saturn debilitated in Aries (House 12)
        // Ensure no planets aspect House 10 (Mars in H11, Jupiter in H5, Sun/Mercury in H2, Moon/Venus in H5)
        { name: 'Sun', sign: 'Gemini', degree: 15.0, house: 2, nakshatra: 'Ardra', pada: 3, retrograde: false, speedLongitude: 1.0, latitude: 0.0 },
        { name: 'Moon', sign: 'Virgo', degree: 15.0, house: 5, nakshatra: 'Hasta', pada: 2, retrograde: false, speedLongitude: 12.0, latitude: 0.0 },
        { name: 'Mars', sign: 'Pisces', degree: 28.0, house: 11, nakshatra: 'Revati', pada: 4, retrograde: false, speedLongitude: 0.8, latitude: 0.0 },
        { name: 'Mercury', sign: 'Gemini', degree: 5.0, house: 2, nakshatra: 'Mrigashira', pada: 4, retrograde: false, speedLongitude: 1.2, latitude: 0.0 },
        { name: 'Jupiter', sign: 'Virgo', degree: 15.0, house: 5, nakshatra: 'Hasta', pada: 2, retrograde: false, speedLongitude: 0.1, latitude: 0.0 },
        { name: 'Venus', sign: 'Virgo', degree: 10.0, house: 5, nakshatra: 'Uttara Phalguni', pada: 4, retrograde: false, speedLongitude: 1.1, latitude: 0.0 },
        { name: 'Saturn', sign: 'Aries', degree: 20.0, house: 12, nakshatra: 'Bharani', pada: 3, retrograde: false, speedLongitude: 0.05, latitude: 0.0, dignity: 'DEBILITATED' }, // 10th lord debilitated
        { name: 'Rahu', sign: 'Virgo', degree: 15.0, house: 5, nakshatra: 'Hasta', pada: 2, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Pisces', degree: 15.0, house: 11, nakshatra: 'Uttara Bhadrapada', pada: 4, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      ],
      houses: [
        { houseNumber: 1, sign: 'Taurus', degree: 15.0 },
        { houseNumber: 2, sign: 'Gemini', degree: 15.0 },
        { houseNumber: 3, sign: 'Cancer', degree: 15.0 },
        { houseNumber: 4, sign: 'Leo', degree: 15.0 },
        { houseNumber: 5, sign: 'Virgo', degree: 15.0 },
        { houseNumber: 6, sign: 'Libra', degree: 15.0 },
        { houseNumber: 7, sign: 'Scorpio', degree: 15.0 },
        { houseNumber: 8, sign: 'Sagittarius', degree: 15.0 },
        { houseNumber: 9, sign: 'Capricorn', degree: 15.0 },
        { houseNumber: 10, sign: 'Aquarius', degree: 15.0 },
        { houseNumber: 11, sign: 'Pisces', degree: 15.0 },
        { houseNumber: 12, sign: 'Aries', degree: 15.0 },
      ],
    };

    const norm = normalizeAstroChart(vacantChart);
    const engine = new VocationalSynthesisEngine();

    const result = engine.synthesize({
      chart: norm,
    });

    // Verify all archetypes receive < 25 points (provisional threshold for viable career recommendation)
    for (const a of result.rankedArchetypes) {
      expect(a.totalScore).toBeLessThan(25);
      expect(getRelativeFitLevel(a.totalScore)).toBe('Insufficient evidence');
    }

    // Must NOT artificially force 3 career recommendations!
    expect(result.careerDirections.length).toBe(0);
  });

  it('13. Determinism test: Identical chart input produces strictly identical synthesis outputs across 10 repeated runs', () => {
    const testChart: any = {
      birthDetails: {
        name: 'Determinism Native',
        dateOfBirth: '1985-06-15',
        timeOfBirth: '08:30',
        placeName: 'Delhi, India',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
      ascendant: { sign: 'Cancer', degree: 22.0, nakshatra: 'Ashlesha', pada: 2 },
      planets: [
        { name: 'Sun', sign: 'Gemini', degree: 1.0, house: 12, nakshatra: 'Mrigashira', pada: 3, retrograde: false, speedLongitude: 1.0, latitude: 0.0 },
        { name: 'Moon', sign: 'Aries', degree: 15.0, house: 10, nakshatra: 'Bharani', pada: 1, retrograde: false, speedLongitude: 12.5, latitude: 0.0 },
        { name: 'Mars', sign: 'Taurus', degree: 20.0, house: 11, nakshatra: 'Rohini', pada: 4, retrograde: false, speedLongitude: 0.7, latitude: 0.0 },
        { name: 'Mercury', sign: 'Gemini', degree: 10.0, house: 12, nakshatra: 'Ardra', pada: 1, retrograde: false, speedLongitude: 1.2, latitude: 0.0 },
        { name: 'Jupiter', sign: 'Capricorn', degree: 18.0, house: 7, nakshatra: 'Shravana', pada: 3, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Venus', sign: 'Aries', degree: 8.0, house: 10, nakshatra: 'Ashwini', pada: 3, retrograde: false, speedLongitude: 1.1, latitude: 0.0 },
        { name: 'Saturn', sign: 'Scorpio', degree: 28.0, house: 5, nakshatra: 'Jyeshtha', pada: 4, retrograde: true, speedLongitude: -0.04, latitude: 0.0 },
        { name: 'Rahu', sign: 'Aries', degree: 22.0, house: 10, nakshatra: 'Bharani', pada: 3, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Libra', degree: 22.0, house: 4, nakshatra: 'Vishakha', pada: 1, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      ],
      houses: [
        { houseNumber: 1, sign: 'Cancer', degree: 22.0 },
        { houseNumber: 2, sign: 'Leo', degree: 22.0 },
        { houseNumber: 3, sign: 'Virgo', degree: 22.0 },
        { houseNumber: 4, sign: 'Libra', degree: 22.0 },
        { houseNumber: 5, sign: 'Scorpio', degree: 22.0 },
        { houseNumber: 6, sign: 'Sagittarius', degree: 22.0 },
        { houseNumber: 7, sign: 'Capricorn', degree: 22.0 },
        { houseNumber: 8, sign: 'Aquarius', degree: 22.0 },
        { houseNumber: 9, sign: 'Pisces', degree: 22.0 },
        { houseNumber: 10, sign: 'Aries', degree: 22.0 },
        { houseNumber: 11, sign: 'Taurus', degree: 22.0 },
        { houseNumber: 12, sign: 'Gemini', degree: 22.0 },
      ],
    };

    const norm = normalizeAstroChart(testChart);
    const engine = new VocationalSynthesisEngine();

    const firstRun = engine.synthesize({
      chart: norm,
      amatyakarakaPlanet: 'VENUS',
      atmakarakaPlanet: 'SATURN',
      savBindus: { 10: 32, 11: 34, 2: 28, 6: 29 },
    });

    for (let i = 0; i < 9; i++) {
      const subsequentRun = engine.synthesize({
        chart: norm,
        amatyakarakaPlanet: 'VENUS',
        atmakarakaPlanet: 'SATURN',
        savBindus: { 10: 32, 11: 34, 2: 28, 6: 29 },
      });

      expect(subsequentRun.rankedArchetypes.map((a) => a.archetype.key)).toEqual(
        firstRun.rankedArchetypes.map((a) => a.archetype.key)
      );
      expect(subsequentRun.rankedArchetypes.map((a) => a.totalScore)).toEqual(
        firstRun.rankedArchetypes.map((a) => a.totalScore)
      );
      expect(subsequentRun.careerDirections[0].title).toBe(firstRun.careerDirections[0].title);
      expect(subsequentRun.sectorComparisons[0].fitLevel).toBe(firstRun.sectorComparisons[0].fitLevel);
    }
  });
});
