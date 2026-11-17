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

describe('Phase 2A XeLaTeX Career Report PDF Verification', () => {
  it('Compiles full Career Report PDF with Scorpio Moon and verifies Dasha + Transits in PDF text', async () => {
    // Chart with Moon at Scorpio 15° (Anuradha nakshatra -> Saturn Mahadasha)
    // Ascendant: Leo 15°
    // Saturn: in Leo (House 1)
    // Jupiter: in Leo (House 1)
    const testAstroChart: any = {
      birthDetails: {
        name: 'Vikramaditya Singhania',
        dateOfBirth: '1995-11-28',
        timeOfBirth: '14:30',
        placeName: 'New Delhi, India',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata',
      },
      ascendant: {
        sign: 'Leo',
        degree: 15.0,
        nakshatra: 'Purva Phalguni',
        pada: 1,
      },
      planets: [
        { name: 'Sun', sign: 'Leo', degree: 15.0, house: 1, nakshatra: 'Purva Phalguni', pada: 1, retrograde: false, speedLongitude: 1.01, latitude: 0.0 },
        { name: 'Moon', sign: 'Scorpio', degree: 15.0, house: 4, nakshatra: 'Anuradha', pada: 4, retrograde: false, speedLongitude: 12.5, latitude: -4.5 },
        { name: 'Mars', sign: 'Aries', degree: 10.0, house: 9, nakshatra: 'Ashwini', pada: 3, retrograde: false, speedLongitude: 0.65, latitude: 1.2 },
        { name: 'Mercury', sign: 'Virgo', degree: 5.0, house: 2, nakshatra: 'Uttara Phalguni', pada: 3, retrograde: false, speedLongitude: 1.3, latitude: 2.1 },
        { name: 'Jupiter', sign: 'Leo', degree: 10.0, house: 1, nakshatra: 'Magha', pada: 3, retrograde: false, speedLongitude: 0.15, latitude: 0.8 },
        { name: 'Venus', sign: 'Libra', degree: 20.0, house: 3, nakshatra: 'Vishakha', pada: 1, retrograde: false, speedLongitude: 1.1, latitude: -1.0 },
        { name: 'Saturn', sign: 'Leo', degree: 5.0, house: 1, nakshatra: 'Magha', pada: 2, retrograde: false, speedLongitude: 0.08, latitude: 1.5 },
        { name: 'Rahu', sign: 'Taurus', degree: 12.0, house: 10, nakshatra: 'Rohini', pada: 1, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
        { name: 'Ketu', sign: 'Scorpio', degree: 12.0, house: 4, nakshatra: 'Anuradha', pada: 3, retrograde: true, speedLongitude: -0.05, latitude: 0.0 },
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

    const clientProfile = {
      clientName: 'Vikramaditya Singhania',
      gender: 'male',
      dateOfBirth: '1995-11-28',
      timeOfBirth: '14:30',
      birthPlace: 'New Delhi, India',
      latitude: 28.6139,
      longitude: 77.2090,
      timeZone: 'Asia/Kolkata',
    };

    const normalized = normalizeAstroChart(testAstroChart);
    const mockAnalysis = await new MockCareerAnalysisProvider().analyze(
      careerEvidenceEngine.buildCareerAnalysisInput(normalized)
    );

    const reportData = mapNormalizedChartToCareerReportData(normalized, mockAnalysis, clientProfile);

    // Verify reportData mapping directly
    expect(reportData.dasha.birthMahadasha.toUpperCase()).toContain('SATURN');
    expect(reportData.dasha.lifetimeMahadashas[0].planet.toUpperCase()).toBe('SATURN');
    expect(reportData.shadbala.status).toBe('VERIFIED');
    expect(reportData.transits.saturnTransit.houseFromMoon).toBe(5);
    expect(reportData.transits.saturnTransit.aspects).toContain('House 10, House 2, House 5');
    expect(reportData.transits.jupiterTransit.houseFromMoon).toBe(10);
    expect(reportData.transits.saturnTransit.sadeSatiActive).toBe(false);

    // Generate TeX
    const texOutput = generateReportDataTex(reportData);
    expect(texOutput).toContain('\\newcommand{\\BirthMahadasha}{\\RenderVerified{SATURN Mahadasha}}');
    expect(texOutput).toContain('\\newcommand{\\TransitSaturnHouseFromMoon}{\\RenderVerified{5}}');
    expect(texOutput).toContain('\\newcommand{\\TransitSaturnAspects}{\\RenderVerified{Aspects House 10, House 2, House 5}}');

    // Compile via XeLaTeX
    const compilationResult = await latexCompiler.compileReport({
      reportId: 'phase2a-test-scorpio',
      reportDataTex: texOutput,
      minPageCount: 1,
      timeoutMs: 120000,
    });

    expect(compilationResult.pdfBuffer).toBeDefined();
    expect(compilationResult.pdfBuffer.length).toBeGreaterThan(1000);
    expect(compilationResult.pageCount).toBeGreaterThanOrEqual(1);

    const pdfPath = '/tmp/phase2a_career_scorpio.pdf';
    fs.writeFileSync(pdfPath, compilationResult.pdfBuffer);

    // Extract text with pdftotext
    const extractedText = execSync(`pdftotext ${pdfPath} -`).toString('utf-8');

    // Verify key astrological tokens in extracted text
    expect(extractedText).toContain('Saturn');
    expect(extractedText).toContain('Vikramaditya Singhania');
    console.log('PDF Compiled and verified successfully! Size:', compilationResult.pdfBuffer.length, 'Pages:', compilationResult.pageCount);
  }, 120000);
});
