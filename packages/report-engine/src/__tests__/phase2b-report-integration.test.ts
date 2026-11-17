import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { normalizeAstroChart } from '@astro/astrology-engine';
import {
  mapNormalizedChartToCareerReportData,
  generateReportDataTex,
  latexCompiler,
} from '../index';
import { MockCareerAnalysisProvider, careerEvidenceEngine } from '@astro/prediction-engine';

describe('Phase 2B: Career Report PDF Aspect Evidence Integration', () => {
  it('Integrates genuine aspect evidence into TeX macros and compiles production XeLaTeX PDF with verified aspect text', async () => {
    // Chart with Saturn in House 10 (Capricorn), Sun in House 1 (Aries), Jupiter in House 5 (Leo)
    const testAstroChart: any = {
      birthDetails: {
        name: 'Devendra Singhal',
        dateOfBirth: '1988-04-18',
        timeOfBirth: '06:30',
        placeName: 'Jaipur, India',
        latitude: 26.9124,
        longitude: 75.7873,
        timezone: 'Asia/Kolkata',
      },
      ascendant: {
        sign: 'Aries',
        degree: 15.0,
        nakshatra: 'Bharani',
        pada: 1,
      },
      planets: [
        { name: 'Sun', sign: 'Aries', degree: 15.0, house: 1, nakshatra: 'Bharani', pada: 1, retrograde: false, speedLongitude: 1.0, latitude: 0.0 },
        { name: 'Moon', sign: 'Taurus', degree: 10.0, house: 2, nakshatra: 'Rohini', pada: 1, retrograde: false, speedLongitude: 13.0, latitude: 2.0 },
        { name: 'Mars', sign: 'Capricorn', degree: 28.0, house: 10, nakshatra: 'Dhanishta', pada: 2, retrograde: false, speedLongitude: 0.7, latitude: -1.0 },
        { name: 'Mercury', sign: 'Pisces', degree: 20.0, house: 12, nakshatra: 'Revati', pada: 2, retrograde: false, speedLongitude: 1.2, latitude: 1.5 },
        { name: 'Jupiter', sign: 'Leo', degree: 10.0, house: 5, nakshatra: 'Magha', pada: 3, retrograde: false, speedLongitude: 0.1, latitude: 0.5 },
        { name: 'Venus', sign: 'Gemini', degree: 5.0, house: 3, nakshatra: 'Mrigashira', pada: 4, retrograde: false, speedLongitude: 1.1, latitude: -0.8 },
        { name: 'Saturn', sign: 'Capricorn', degree: 8.0, house: 10, nakshatra: 'Uttara Ashadha', pada: 4, retrograde: true, speedLongitude: -0.04, latitude: 1.2 },
        { name: 'Rahu', sign: 'Aquarius', degree: 12.0, house: 11, nakshatra: 'Shatabhisha', pada: 2, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Leo', degree: 12.0, house: 5, nakshatra: 'Magha', pada: 4, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
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

    const clientProfile = {
      clientName: 'Devendra Singhal',
      gender: 'male',
      dateOfBirth: '1988-04-18',
      timeOfBirth: '06:30',
      birthPlace: 'Jaipur, India',
      latitude: 26.9124,
      longitude: 75.7873,
      timeZone: 'Asia/Kolkata',
    };

    const normalized = normalizeAstroChart(testAstroChart);
    const analysisInput = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    // 1. Verify CareerEvidenceEngine populated genuine aspects
    const saturnEv = analysisInput.planetaryEvidence.find((p) => p.planet.toUpperCase() === 'SATURN');
    expect(saturnEv?.aspects).toEqual([12, 4, 7]); // 3rd to H12, 7th to H4, 10th to H7

    const h12Ev = analysisInput.houseEvidence.find((h) => h.houseNumber === 12);
    expect(h12Ev?.aspects.some((a) => a.toUpperCase().includes('SATURN'))).toBe(true);

    // 2. Run MockCareerAnalysisProvider
    const provider = new MockCareerAnalysisProvider();
    const analysis = await provider.analyze(analysisInput);

    // 3. Map to CareerReportData
    const reportData = mapNormalizedChartToCareerReportData(normalized, analysis, clientProfile);

    // 4. Verify House models have genuine aspect data
    expect(reportData.houses.houseTwelve.aspects.toUpperCase()).toContain('SATURN');
    expect(reportData.houses.houseFour.aspects.toUpperCase()).toContain('SATURN');
    expect(reportData.houses.houseSeven.aspects.toUpperCase()).toContain('SATURN');

    // 5. Verify Planet models have genuine aspect data
    expect(reportData.planets.saturn.aspectsRelationships).toContain('3rd aspect on House 12');
    expect(reportData.planets.saturn.aspectsRelationships).toContain('7th aspect on House 4');
    expect(reportData.planets.saturn.aspectsRelationships).toContain('10th aspect on House 7');
    expect(reportData.planets.rahu.aspectsRelationships).toBe('No Parashari aspects cast');

    // 6. Generate report_data.tex
    const texOutput = generateReportDataTex(reportData);
    expect(texOutput).toContain('\\newcommand{\\HouseTwelveAspects}');
    expect(texOutput).toContain('SATURN');
    expect(texOutput).toContain('\\newcommand{\\SaturnAspectsRelationships}');
    expect(texOutput).toContain('3rd aspect on House 12');

    // 7. Compile via XeLaTeX
    const compilationResult = await latexCompiler.compileReport({
      reportId: 'phase2b-aspect-integration-test',
      reportDataTex: texOutput,
      minPageCount: 1,
      timeoutMs: 120000,
    });

    expect(compilationResult.pdfBuffer).toBeDefined();
    expect(compilationResult.pdfBuffer.length).toBeGreaterThan(1000);

    const pdfPath = '/tmp/phase2b_career_aspect_test.pdf';
    fs.writeFileSync(pdfPath, compilationResult.pdfBuffer);

    // 8. Extract text via pdftotext and verify aspect content
    const extractedText = execSync(`pdftotext ${pdfPath} -`).toString('utf-8');
    expect(extractedText).toContain('Devendra Singhal');
    expect(extractedText).toContain('Saturn');
    console.log('Phase 2B PDF Compiled and verified successfully! Size:', compilationResult.pdfBuffer.length);
  }, 120000);
});

