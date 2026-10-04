import { describe, it, expect } from 'vitest';
import { normalizeAstroChart, AstroChart } from '@astro/astrology-engine';
import {
  mapNormalizedChartToCareerReportData,
  generateReportDataTex,
  escapeLatex,
  careerReportService,
  latexCompiler,
  pdfQaValidator,
  FORBIDDEN_PLACEHOLDERS,
} from '../index';

describe('Career Report Phase 11 Intelligent Pipeline Suite', () => {
  const mockAstroChart: any = {
    ascendant: {
      sign: 'Aries',
      degree: 15.42,
      nakshatra: 'Bharani',
      pada: 1,
    },
    planets: [
      { name: 'Sun', sign: 'Leo', degree: 10.5, house: 5, nakshatra: 'Magha', pada: 4, retrograde: false },
      { name: 'Moon', sign: 'Taurus', degree: 22.1, house: 2, nakshatra: 'Rohini', pada: 3, retrograde: false },
      { name: 'Mars', sign: 'Aries', degree: 5.0, house: 1, nakshatra: 'Ashwini', pada: 2, retrograde: false },
      { name: 'Mercury', sign: 'Virgo', degree: 12.8, house: 6, nakshatra: 'Hasta', pada: 1, retrograde: false },
      { name: 'Jupiter', sign: 'Sagittarius', degree: 18.3, house: 9, nakshatra: 'Mula', pada: 2, retrograde: false },
      { name: 'Venus', sign: 'Libra', degree: 29.4, house: 7, nakshatra: 'Vishakha', pada: 3, retrograde: false },
      { name: 'Saturn', sign: 'Capricorn', degree: 8.2, house: 10, nakshatra: 'Uttara Ashadha', pada: 4, retrograde: true },
      { name: 'Rahu', sign: 'Gemini', degree: 14.1, house: 3, nakshatra: 'Ardra', pada: 2, retrograde: true },
      { name: 'Ketu', sign: 'Sagittarius', degree: 14.1, house: 9, nakshatra: 'Purva Ashadha', pada: 1, retrograde: true },
    ],
    houses: [
      { houseNumber: 1, sign: 'Aries', degree: 15.42 },
      { houseNumber: 2, sign: 'Taurus', degree: 15.42 },
      { houseNumber: 3, sign: 'Gemini', degree: 15.42 },
      { houseNumber: 4, sign: 'Cancer', degree: 15.42 },
      { houseNumber: 5, sign: 'Leo', degree: 15.42 },
      { houseNumber: 6, sign: 'Virgo', degree: 15.42 },
      { houseNumber: 7, sign: 'Libra', degree: 15.42 },
      { houseNumber: 8, sign: 'Scorpio', degree: 15.42 },
      { houseNumber: 9, sign: 'Sagittarius', degree: 15.42 },
      { houseNumber: 10, sign: 'Capricorn', degree: 15.42 },
      { houseNumber: 11, sign: 'Aquarius', degree: 15.42 },
      { houseNumber: 12, sign: 'Pisces', degree: 15.42 },
    ],
  };

  const clientProfile = {
    clientName: 'Aarav Sharma',
    dateOfBirth: '1992-10-15',
    timeOfBirth: '14:30:00',
    birthPlace: 'New Delhi, India',
    timeZone: 'Asia/Kolkata (+05:30)',
    latitude: 28.6139,
    longitude: 77.209,
  };

  it('1. Should normalize AstroChart and preserve client details', () => {
    const normalized = normalizeAstroChart(mockAstroChart);
    const reportData = mapNormalizedChartToCareerReportData(normalized, undefined, clientProfile);

    expect(reportData.client.clientName).toBe('Aarav Sharma');
    expect(reportData.client.dateOfBirth).toBe('1992-10-15');
    expect(reportData.client.timeOfBirth).toBe('14:30:00');
    expect(reportData.client.birthPlace).toBe('New Delhi, India');
    expect(reportData.client.reportDataStatus).toBe('VERIFIED');
  });

  it('2. Should calculate dynamic Dasha timing timeline from Moon position', () => {
    const normalized = normalizeAstroChart(mockAstroChart);
    const reportData = mapNormalizedChartToCareerReportData(normalized, undefined, clientProfile);

    expect(reportData.dasha.status).toBe('VERIFIED');
    expect(reportData.dasha.currentMahadasha).toBeDefined();
    expect(reportData.dasha.currentAntardasha).toBeDefined();
    expect(reportData.dasha.shortTermOutlook).toBeDefined();
  });

  it('3. Should escape LaTeX special characters reliably', () => {
    const rawStr = 'Tech & Strategy 100% #1 _test_ {value} \\path 15°';
    const escaped = escapeLatex(rawStr);

    expect(escaped).toContain('\\&');
    expect(escaped).toContain('\\%');
    expect(escaped).toContain('\\#');
    expect(escaped).toContain('\\_');
    expect(escaped).toContain('\\{');
    expect(escaped).toContain('\\}');
    expect(escaped).toContain('\\textbackslash{}');
  });

  it('4. Should generate valid report_data.tex string with macro definitions', () => {
    const normalized = normalizeAstroChart(mockAstroChart);
    const reportData = mapNormalizedChartToCareerReportData(normalized, undefined, clientProfile);
    const texOutput = generateReportDataTex(reportData);

    expect(texOutput).toContain('\\newcommand{\\ClientName}{\\RenderVerified{Aarav Sharma}}');
    expect(texOutput).toContain('\\newcommand{\\AscendantSign}{\\RenderVerified{Aries}}');
    expect(texOutput).toContain('\\newcommand{\\SunSign}{\\RenderVerified{Leo}}');
    expect(texOutput).toContain('\\newcommand{\\HouseTenLord}{\\RenderVerified{Saturn}}');
  });

  it('5. PdfQaValidator should pass for clean TeX source and fail for forbidden placeholders', () => {
    const normalized = normalizeAstroChart(mockAstroChart);
    const reportData = mapNormalizedChartToCareerReportData(normalized, undefined, clientProfile);
    const cleanTex = generateReportDataTex(reportData);

    // Mock PDF buffer (%PDF-1.4 with 6 pages)
    const mockPdfBuffer = Buffer.from(
      '%PDF-1.4\n' + '/Type /Page\n'.repeat(6) + '%%EOF'
    );

    const validResult = pdfQaValidator.validatePdf({
      pdfBuffer: mockPdfBuffer,
      reportDataTex: cleanTex,
      expectedClientName: 'Aarav Sharma',
      minPageCount: 5,
    });

    expect(validResult.isValid).toBe(true);

    // Test with forbidden placeholder
    const dirtyTex = cleanTex + '\n\\newcommand{\\Bad}{\\RenderUnavailable{Valued Client}}';
    const invalidResult = pdfQaValidator.validatePdf({
      pdfBuffer: mockPdfBuffer,
      reportDataTex: dirtyTex,
      expectedClientName: 'Aarav Sharma',
      minPageCount: 5,
    });

    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors.some((e) => e.includes('Forbidden placeholder'))).toBe(true);
  });

  it('6. Should compile actual career report containing Unicode text (CO₂, subscript numbers, etc.) via production XeLaTeX compiler', async () => {
    const normalized = normalizeAstroChart(mockAstroChart);
    const reportData = mapNormalizedChartToCareerReportData(normalized, undefined, clientProfile);
    
    // Inject representative Unicode content into report data
    reportData.careerAnalysis.executiveCareerSummary =
      'Analysis for CO₂ and H₂O environmental tech projects: X₁ Y₃ Z₄ levels under 15° 30\' orientation — ‘focused’ & “strategic” × 50% growth rate…';

    const texOutput = generateReportDataTex(reportData);

    try {
      const compilationResult = await latexCompiler.compileReport({
        reportId: 'unicode-compilation-test-aarav',
        reportDataTex: texOutput,
        minPageCount: 1,
        timeoutMs: 60000,
      });

      expect(compilationResult.pdfBuffer).toBeDefined();
      expect(compilationResult.pdfBuffer.length).toBeGreaterThan(100);
      expect(compilationResult.pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
      expect(compilationResult.pageCount).toBeGreaterThanOrEqual(1);
    } catch (err: any) {
      console.error('=== ACTUAL XELATEX COMPILATION ERROR ===\n', err.message);
      throw err;
    }
  }, 60000);
});

