import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { normalizeAstroChart, VargaCalculator } from '@astro/astrology-engine';
import {
  mapNormalizedChartToCareerReportData,
  generateReportDataTex,
  latexCompiler,
  synthesizeVargaCommentary,
} from '../index';
import {
  MockCareerAnalysisProvider,
  careerEvidenceEngine,
} from '@astro/prediction-engine';

describe('Phase 2D: Career Report Editorial & Content Intelligence Suite', () => {
  const representativeChartFixture: any = {
    birthDetails: {
      name: 'Aditya Vardhan Rao',
      dateOfBirth: '1988-06-21',
      timeOfBirth: '09:15',
      placeName: 'Hyderabad, India',
      latitude: 17.385,
      longitude: 78.4867,
      timezone: 'Asia/Kolkata',
    },
    ascendant: {
      sign: 'Leo',
      degree: 18.25,
      nakshatra: 'Purva Phalguni',
      pada: 2,
    },
    planets: [
      { name: 'Sun', sign: 'Gemini', degree: 6.5, house: 11, nakshatra: 'Mrigashira', pada: 4, retrograde: false, speedLongitude: 0.95, latitude: 0.0 },
      { name: 'Moon', sign: 'Virgo', degree: 14.2, house: 2, nakshatra: 'Hasta', pada: 2, retrograde: false, speedLongitude: 13.2, latitude: -2.1 },
      { name: 'Mars', sign: 'Pisces', degree: 22.8, house: 8, nakshatra: 'Revati', pada: 2, retrograde: false, speedLongitude: 0.72, latitude: -1.3 },
      { name: 'Mercury', sign: 'Gemini', degree: 28.1, house: 11, nakshatra: 'Punarvasu', pada: 3, retrograde: false, speedLongitude: 1.45, latitude: 1.8 },
      { name: 'Jupiter', sign: 'Taurus', degree: 29.4, house: 10, nakshatra: 'Mrigashira', pada: 2, retrograde: false, speedLongitude: 0.18, latitude: -0.4 },
      { name: 'Venus', sign: 'Gemini', degree: 12.0, house: 11, nakshatra: 'Ardra', pada: 2, retrograde: true, speedLongitude: -0.45, latitude: 3.2 },
      { name: 'Saturn', sign: 'Sagittarius', degree: 5.8, house: 5, nakshatra: 'Mula', pada: 2, retrograde: true, speedLongitude: -0.06, latitude: 0.9 },
      { name: 'Rahu', sign: 'Aquarius', degree: 24.1, house: 7, nakshatra: 'Purva Bhadrapada', pada: 2, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      { name: 'Ketu', sign: 'Leo', degree: 24.1, house: 1, nakshatra: 'Purva Phalguni', pada: 4, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
    ],
    houses: [
      { houseNumber: 1, sign: 'Leo', degree: 18.25 },
      { houseNumber: 2, sign: 'Virgo', degree: 18.25 },
      { houseNumber: 3, sign: 'Libra', degree: 18.25 },
      { houseNumber: 4, sign: 'Scorpio', degree: 18.25 },
      { houseNumber: 5, sign: 'Sagittarius', degree: 18.25 },
      { houseNumber: 6, sign: 'Capricorn', degree: 18.25 },
      { houseNumber: 7, sign: 'Aquarius', degree: 18.25 },
      { houseNumber: 8, sign: 'Pisces', degree: 18.25 },
      { houseNumber: 9, sign: 'Aries', degree: 18.25 },
      { houseNumber: 10, sign: 'Taurus', degree: 18.25 },
      { houseNumber: 11, sign: 'Gemini', degree: 18.25 },
      { houseNumber: 12, sign: 'Cancer', degree: 18.25 },
    ],
  };

  const scorpioChartFixture: any = {
    birthDetails: {
      name: 'Priya Sundaram',
      dateOfBirth: '1992-11-14',
      timeOfBirth: '06:30',
      placeName: 'Chennai, India',
      latitude: 13.0827,
      longitude: 80.2707,
      timezone: 'Asia/Kolkata',
    },
    ascendant: { sign: 'Scorpio', degree: 12.4, nakshatra: 'Anuradha', pada: 3 },
    planets: [
      { name: 'Sun', sign: 'Scorpio', degree: 28.1, house: 1, nakshatra: 'Jyeshtha', pada: 4, retrograde: false, speedLongitude: 1.0, latitude: 0.0 },
      { name: 'Moon', sign: 'Gemini', degree: 8.5, house: 8, nakshatra: 'Ardra', pada: 1, retrograde: false, speedLongitude: 12.5, latitude: 1.2 },
      { name: 'Mars', sign: 'Cancer', degree: 19.3, house: 9, nakshatra: 'Ashlesha', pada: 1, retrograde: true, speedLongitude: -0.2, latitude: 1.5 },
      { name: 'Mercury', sign: 'Scorpio', degree: 14.7, house: 1, nakshatra: 'Anuradha', pada: 4, retrograde: false, speedLongitude: 1.4, latitude: -0.5 },
      { name: 'Jupiter', sign: 'Virgo', degree: 16.2, house: 11, nakshatra: 'Hasta', pada: 2, retrograde: false, speedLongitude: 0.15, latitude: 1.1 },
      { name: 'Venus', sign: 'Sagittarius', degree: 5.6, house: 2, nakshatra: 'Mula', pada: 2, retrograde: false, speedLongitude: 1.1, latitude: -2.3 },
      { name: 'Saturn', sign: 'Capricorn', degree: 19.8, house: 3, nakshatra: 'Shravana', pada: 3, retrograde: false, speedLongitude: 0.08, latitude: 0.2 },
      { name: 'Rahu', sign: 'Sagittarius', degree: 27.4, house: 2, nakshatra: 'Uttara Ashadha', pada: 1, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      { name: 'Ketu', sign: 'Gemini', degree: 27.4, house: 8, nakshatra: 'Punarvasu', pada: 3, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
    ],
    houses: Array.from({ length: 12 }, (_, i) => ({
      houseNumber: i + 1,
      sign: ['Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra'][i],
      degree: 12.4,
    })),
  };

  const geminiChartFixture: any = {
    birthDetails: {
      name: 'Rohan Mehta',
      dateOfBirth: '1995-09-08',
      timeOfBirth: '23:45',
      placeName: 'Mumbai, India',
      latitude: 19.076,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
    },
    ascendant: { sign: 'Gemini', degree: 22.1, nakshatra: 'Punarvasu', pada: 1 },
    planets: [
      { name: 'Sun', sign: 'Leo', degree: 22.0, house: 3, nakshatra: 'Purva Phalguni', pada: 3, retrograde: false, speedLongitude: 0.98, latitude: 0.0 },
      { name: 'Moon', sign: 'Aquarius', degree: 15.4, house: 9, nakshatra: 'Shatabhisha', pada: 3, retrograde: false, speedLongitude: 13.8, latitude: -3.1 },
      { name: 'Mars', sign: 'Libra', degree: 26.5, house: 5, nakshatra: 'Vishakha', pada: 2, retrograde: false, speedLongitude: 0.65, latitude: -0.8 },
      { name: 'Mercury', sign: 'Virgo', degree: 12.8, house: 4, nakshatra: 'Hasta', pada: 1, retrograde: false, speedLongitude: 1.3, latitude: 2.1 },
      { name: 'Jupiter', sign: 'Scorpio', degree: 14.1, house: 6, nakshatra: 'Anuradha', pada: 4, retrograde: false, speedLongitude: 0.12, latitude: -0.3 },
      { name: 'Venus', sign: 'Leo', degree: 18.5, house: 3, nakshatra: 'Purva Phalguni', pada: 2, retrograde: false, speedLongitude: 1.05, latitude: 1.4 },
      { name: 'Saturn', sign: 'Pisces', degree: 28.2, house: 10, nakshatra: 'Revati', pada: 4, retrograde: true, speedLongitude: -0.04, latitude: -1.7 },
      { name: 'Rahu', sign: 'Libra', degree: 5.2, house: 5, nakshatra: 'Chitra', pada: 4, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
      { name: 'Ketu', sign: 'Aries', degree: 5.2, house: 11, nakshatra: 'Ashwini', pada: 2, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
    ],
    houses: Array.from({ length: 12 }, (_, i) => ({
      houseNumber: i + 1,
      sign: ['Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus'][i],
      degree: 22.1,
    })),
  };

  it('1. Plain-language transformation: Explains key Sanskrit and astrological concepts when introduced', async () => {
    const normalized = normalizeAstroChart(representativeChartFixture);
    const mockProvider = new MockCareerAnalysisProvider();
    const evidenceInput = careerEvidenceEngine.buildCareerAnalysisInput(normalized);
    const analysis = await mockProvider.analyze(evidenceInput);
    const reportData = mapNormalizedChartToCareerReportData(normalized, analysis, {
      clientName: representativeChartFixture.birthDetails.name,
    });
    const texOutput = generateReportDataTex(reportData);

    // Verify plain-language explanations in mapper outputs
    expect(reportData.ascendant.careerInterpretation).toContain('Ascendant (Lagna)');
    expect(reportData.ascendant.lordInterpretation).toContain('Lagna Lord');
    expect(reportData.careerAnalysis.moneyIncomeArchitecture.earningPattern).toContain('Dhana Bhava');
    expect(reportData.careerAnalysis.moneyIncomeArchitecture.earningPattern).toContain('Labha Bhava');
    expect(reportData.careerAnalysis.professionalRelationships.mentorAlliances).toContain('Bhagya Bhava');

    // Verify TeX macros exist and contain accessible text
    expect(texOutput).toContain('\\newcommand{\\AuthorMessage}');
    expect(texOutput).toContain('PENDING AUTHOR APPROVAL');
  });

  it('2. De-duplication audit: Proves Ascendant and Ascendant Lord boxes have completely distinct content', async () => {
    const normalized = normalizeAstroChart(representativeChartFixture);
    const mockProvider = new MockCareerAnalysisProvider();
    const evidenceInput = careerEvidenceEngine.buildCareerAnalysisInput(normalized);
    const analysis = await mockProvider.analyze(evidenceInput);
    const reportData = mapNormalizedChartToCareerReportData(normalized, analysis);

    // Box 1 (Ascendant persona) vs Box 2 (Career Identity)
    expect(reportData.ascendant.careerInterpretation).toBeDefined();
    expect(reportData.careerAnalysis.careerIdentity).toBeDefined();
    expect(reportData.ascendant.careerInterpretation).not.toEqual(reportData.careerAnalysis.careerIdentity);
    expect(reportData.ascendant.careerInterpretation.length).toBeGreaterThan(50);
    expect(reportData.careerAnalysis.careerIdentity.length).toBeGreaterThan(50);

    // Box 3 (Ascendant Lord analysis) vs Box 4 (Career DNA synthesis)
    expect(reportData.ascendant.lordInterpretation).toBeDefined();
    expect(reportData.careerAnalysis.careerDNAAnalysis).toBeDefined();
    expect(reportData.ascendant.lordInterpretation).not.toEqual(reportData.careerAnalysis.careerDNAAnalysis);
    expect(reportData.ascendant.lordInterpretation.length).toBeGreaterThan(50);
    expect(reportData.careerAnalysis.careerDNAAnalysis.length).toBeGreaterThan(50);
  });

  it('3. Absence of fabricated guarantees: Verifies no guaranteed salary, promotion, or employment promises', async () => {
    const normalized = normalizeAstroChart(representativeChartFixture);
    const mockProvider = new MockCareerAnalysisProvider();
    const evidenceInput = careerEvidenceEngine.buildCareerAnalysisInput(normalized);
    const analysis = await mockProvider.analyze(evidenceInput);
    const reportData = mapNormalizedChartToCareerReportData(normalized, analysis);
    const texOutput = generateReportDataTex(reportData);

    const forbiddenGuarantees = [
      'you will become rich',
      'guaranteed promotion',
      'guaranteed salary',
      '100% on-time milestone delivery',
      'measurable 20% efficiency or revenue uplift',
      'you are destined for success',
      'will definitely get a job',
    ];

    const fullText = JSON.stringify(reportData) + texOutput;
    for (const phrase of forbiddenGuarantees) {
      expect(fullText.toLowerCase()).not.toContain(phrase.toLowerCase());
    }
  });

  it('4. Missing evidence disclosure: Correctly evaluates SAV in wealth architecture without false claims', async () => {
    // 1. Chart where SAV calculations exist and are measured
    const normalized = normalizeAstroChart(representativeChartFixture);
    const mockProvider = new MockCareerAnalysisProvider();
    const evidenceInput = careerEvidenceEngine.buildCareerAnalysisInput(normalized);
    const analysis = await mockProvider.analyze(evidenceInput);
    const reportData = mapNormalizedChartToCareerReportData(normalized, analysis);

    // Verify it does NOT manufacture the old false claim "Very high; supported by strong 2nd and 11th houses (> 28 bindus)"
    expect(reportData.careerAnalysis.moneyIncomeArchitecture.financialStability).not.toContain('Very high; supported by strong 2nd and 11th houses');
    expect(reportData.careerAnalysis.moneyIncomeArchitecture.financialStability).toContain('28-bindu mathematical mean benchmark');
    expect(reportData.careerAnalysis.moneyIncomeArchitecture.financialStability).toContain('bindus');
  });

  it('5. Authentic Nakshatra register: Populates true planetary rulers and classical deities without placeholders', async () => {
    const normalized = normalizeAstroChart(representativeChartFixture);
    const mockProvider = new MockCareerAnalysisProvider();
    const evidenceInput = careerEvidenceEngine.buildCareerAnalysisInput(normalized);
    const analysis = await mockProvider.analyze(evidenceInput);
    const reportData = mapNormalizedChartToCareerReportData(normalized, analysis);

    const nakTable = reportData.nakshatras.nakshatraTable;
    expect(nakTable.length).toBeGreaterThanOrEqual(9);

    // Verify Sun in Mrigashira -> ruled by Mars
    const sunNak = nakTable.find((n) => n.planet.toUpperCase() === 'SUN');
    expect(sunNak).toBeDefined();
    expect(sunNak?.nakshatra).toBe('Mrigashira');
    expect(sunNak?.lord).toBe('MARS');
    expect(sunNak?.deity).toBe('Soma');

    // Verify Moon in Hasta -> ruled by Moon
    const moonNak = nakTable.find((n) => n.planet.toUpperCase() === 'MOON');
    expect(moonNak).toBeDefined();
    expect(moonNak?.nakshatra).toBe('Hasta');
    expect(moonNak?.lord).toBe('MOON');
    expect(moonNak?.deity).toBe('Savitar');

    // Verify no dummy placeholders
    for (const item of nakTable) {
      expect(item.lord).not.toBe('Governing Star Lord');
      expect(item.deity).not.toBe('Vedic Archetype Deity');
      expect(item.shakti).not.toBe('Power of Vocational Accomplishment');
    }
  });

  it('6. Divisional chart personalization: Verifies distinct varga text referencing individual ascendant and placements', async () => {
    const mockProvider = new MockCareerAnalysisProvider();

    // 1. Fixture 1: Aditya (Leo Lagna)
    const norm1 = normalizeAstroChart(representativeChartFixture);
    const analysis1 = await mockProvider.analyze(careerEvidenceEngine.buildCareerAnalysisInput(norm1));
    const rep1 = mapNormalizedChartToCareerReportData(norm1, analysis1);

    expect(rep1.vargas.d1.analysisText).toContain('Leo rising');
    expect(rep1.vargas.d1.analysisText.toUpperCase()).toContain('SUN');
    expect(rep1.vargas.d2.analysisText).toContain('Hora');
    expect(rep1.vargas.d2.analysisText).toContain('wealth allocation');
    expect(rep1.vargas.d10.analysisText).toContain('Dashamsha');
    expect(rep1.vargas.d10.analysisText).toContain('executive hierarchy');
    expect(rep1.vargas.d24.analysisText).toContain('Chaturvimshamsha');
    expect(rep1.vargas.d24.analysisText).toContain('technical skill');
    expect(rep1.vargas.d30.analysisText).toContain('Trimshamsha');
    expect(rep1.vargas.d30.analysisText).toContain('risk factors');

    // 2. Fixture 2: Priya (Scorpio Lagna)
    const norm2 = normalizeAstroChart(scorpioChartFixture);
    const analysis2 = await mockProvider.analyze(careerEvidenceEngine.buildCareerAnalysisInput(norm2));
    const rep2 = mapNormalizedChartToCareerReportData(norm2, analysis2);

    expect(rep2.vargas.d1.analysisText).toContain('Scorpio rising');
    expect(rep2.vargas.d1.analysisText.toUpperCase()).toContain('MARS');
    expect(rep2.vargas.d3.analysisText).toContain('Drekkana');
    expect(rep2.vargas.d3.analysisText).toContain('operational drive');
    expect(rep2.vargas.d1.analysisText).not.toEqual(rep1.vargas.d1.analysisText);
    expect(rep2.vargas.d10.analysisText).not.toEqual(rep1.vargas.d10.analysisText);

    // 3. Fixture 3: Rohan (Gemini Lagna)
    const norm3 = normalizeAstroChart(geminiChartFixture);
    const analysis3 = await mockProvider.analyze(careerEvidenceEngine.buildCareerAnalysisInput(norm3));
    const rep3 = mapNormalizedChartToCareerReportData(norm3, analysis3);

    expect(rep3.vargas.d1.analysisText).toContain('Gemini rising');
    expect(rep3.vargas.d1.analysisText.toUpperCase()).toContain('MERCURY');
    expect(rep3.vargas.d9.analysisText).toContain('Navamsha');
    expect(rep3.vargas.d9.analysisText).toContain('dharma');
    expect(rep3.vargas.d1.analysisText).not.toEqual(rep1.vargas.d1.analysisText);
    expect(rep3.vargas.d1.analysisText).not.toEqual(rep2.vargas.d1.analysisText);

    // Verify none use the old static boilerplate
    expect(rep1.vargas.d1.analysisText).not.toContain('This confirms sustainable career growth and institutional credibility.');
    expect(rep2.vargas.d1.analysisText).not.toContain('This confirms sustainable career growth and institutional credibility.');
    expect(rep3.vargas.d1.analysisText).not.toContain('This confirms sustainable career growth and institutional credibility.');

    // 4. Missing-Data Case: Verify UNAVAILABLE status and explicit disclosure
    const origCalc = VargaCalculator.prototype.calculateVarga;
    const vargaSpy = vi.spyOn(VargaCalculator.prototype, 'calculateVarga').mockImplementation(function (this: any, chart: any, vType: any) {
      if (vType === 'D40') {
        return null as any;
      }
      return origCalc.call(this, chart, vType);
    });

    const repMissing = mapNormalizedChartToCareerReportData(norm1, analysis1);
    expect(repMissing.vargas.d40.status).toBe('UNAVAILABLE');
    expect(repMissing.vargas.d40.analysisText).toContain('unavailable from the calculation engine');
    expect(repMissing.vargas.d40.ascendantSign).toBe('Unavailable');
    expect(repMissing.vargas.d40.ascendantLord).toBe('Unavailable');

    // Direct unit test of synthesizeVargaCommentary on missing data
    const synthesizedMissing = synthesizeVargaCommentary(
      'D40',
      { division: 40, name: 'Khavedamsha', sanskritName: 'Khavedamsa', purpose: 'Subtle auspicious trends', careerRelevance: 'Breakthroughs' },
      'Unavailable',
      'Unavailable',
      [],
      false
    );
    expect(synthesizedMissing.status).toBe('UNAVAILABLE');
    expect(synthesizedMissing.commentary).toContain('unavailable from the calculation engine');

    vargaSpy.mockRestore();
  });

  it('7. Anti-boilerplate audit: Verifies house interpretations have distinct domain-specific content', async () => {
    const mockProvider = new MockCareerAnalysisProvider();
    const normalized = normalizeAstroChart(representativeChartFixture);
    const evidenceInput = careerEvidenceEngine.buildCareerAnalysisInput(normalized);
    const analysis = await mockProvider.analyze(evidenceInput);

    expect(analysis.houseInterpretations).toBeDefined();
    expect(analysis.houseInterpretations?.length).toBe(12);

    const h2 = analysis.houseInterpretations?.find((h) => h.houseNumber === 2);
    const h6 = analysis.houseInterpretations?.find((h) => h.houseNumber === 6);
    const h10 = analysis.houseInterpretations?.find((h) => h.houseNumber === 10);
    const h12 = analysis.houseInterpretations?.find((h) => h.houseNumber === 12);

    expect(h2?.constructiveExpression).toContain('capital allocation');
    expect(h6?.constructiveExpression).toContain('workflows');
    expect(h10?.constructiveExpression).toContain('high-visibility');
    expect(h12?.constructiveExpression).toContain('cross-border');

    // Confirm they are not identical strings
    expect(h2?.constructiveExpression).not.toEqual(h6?.constructiveExpression);
    expect(h10?.constructiveExpression).not.toEqual(h12?.constructiveExpression);
  });

  it('8. Author message & TOC Part Grouping: Generates production TeX macros and compiles sample PDF', async () => {
    const normalized = normalizeAstroChart(representativeChartFixture);
    const mockProvider = new MockCareerAnalysisProvider();
    const evidenceInput = careerEvidenceEngine.buildCareerAnalysisInput(normalized);
    const analysis = await mockProvider.analyze(evidenceInput);
    const reportData = mapNormalizedChartToCareerReportData(normalized, analysis, {
      clientName: representativeChartFixture.birthDetails.name,
    });
    const texOutput = generateReportDataTex(reportData);

    // Verify Author Message is emitted
    expect(texOutput).toContain('\\newcommand{\\AuthorMessage}');
    expect(texOutput).toContain('PENDING AUTHOR APPROVAL');

    // Compile production XeLaTeX PDF with QA checks
    const compileResult = await latexCompiler.compileReport({
      reportId: 'phase2d-sample-career-dossier',
      reportDataTex: texOutput,
      clientName: representativeChartFixture.birthDetails.name,
      reportType: 'Production Career Dossier',
      minPageCount: 1,
      timeoutMs: 180000,
    });

    expect(compileResult.pdfBuffer).toBeDefined();
    expect(compileResult.pdfBuffer.length).toBeGreaterThan(10000);
    expect(compileResult.pageCount).toBeGreaterThanOrEqual(1);

    const testPdfPath = '/tmp/phase2d_career_report_sample.pdf';
    fs.writeFileSync(testPdfPath, compileResult.pdfBuffer);
    expect(fs.existsSync(testPdfPath)).toBe(true);

    // Also persist in workspace root for deliverable inspection
    fs.writeFileSync('./phase2d_career_report_sample.pdf', compileResult.pdfBuffer);

    // Extract text and inspect critical markers
    const extractedText = execSync(`pdftotext "${testPdfPath}" -`).toString('utf-8');

    // Verify Author Message appears
    expect(extractedText).toContain('A Note from the Author');
    expect(extractedText).toContain('Sushil Kumaar Singh');

    // Verify TOC contains Part headers
    expect(extractedText).toContain('PART I: EMBARKING ON YOUR QUEST');
    expect(extractedText).toContain('PART V: VOYAGE OF YOUR CAREER');
    expect(extractedText).toContain('PART X: ROADMAP & COUNSEL');

    // Verify Plain-Language Definitions appear
    expect(extractedText).toContain('Karma Bhava');
    expect(extractedText).toContain('Karmesh');
    expect(extractedText).toContain('Amatyakaraka');
    expect(extractedText).toContain('Dashamsha');
    expect(extractedText).toContain('Vimshottari Dasha');

    // Verify client name
    expect(extractedText).toContain('Aditya Vardhan Rao');
  }, 180000);
});
