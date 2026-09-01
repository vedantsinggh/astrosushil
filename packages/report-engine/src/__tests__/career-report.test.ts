import { normalizeAstroChart, AstroChart } from '@astro/astrology-engine';
import {
  mapNormalizedChartToCareerReportData,
  generateReportDataTex,
  escapeLatex,
  careerReportService,
} from '../index';

describe('Career Report Backend Foundation Suite', () => {
  // Verified Mock AstroChart input (Aarav Sharma birth data)
  const mockAstroChart: AstroChart = {
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

  it('1. Should correctly normalize raw AstroChart to NormalizedChart model', () => {
    const normalized = normalizeAstroChart(mockAstroChart);

    expect(normalized.ascendant.sign).toBe('Aries');
    expect(normalized.ascendant.lord).toBe('Mars');
    expect(normalized.planets).toHaveLength(9);
    expect(normalized.houses).toHaveLength(12);

    // Check Dignities
    const sun = normalized.planets.find((p) => p.name === 'Sun');
    expect(sun?.dignity).toBe('Own Sign / Moolatrikona');

    const moon = normalized.planets.find((p) => p.name === 'Moon');
    expect(moon?.dignity).toBe('Exalted');

    // Check House 10 Lordship
    const house10 = normalized.houses.find((h) => h.house === 10 || (h as any).houseNumber === 10);
    expect(house10?.sign).toBe('Capricorn');
    expect(house10?.lord).toBe('Saturn');
  });

  it('2. Should map NormalizedChart into CareerReportData correctly', () => {
    const normalized = normalizeAstroChart(mockAstroChart);
    const reportData = mapNormalizedChartToCareerReportData(normalized);

    // Client verification
    expect(reportData.client.clientName).toBe('Sample Client');
    expect(reportData.client.reportDataStatus).toBe('VERIFIED');

    // Calculation settings
    expect(reportData.calculation.zodiacSystem).toBe('Sidereal');
    expect(reportData.calculation.ayanamsa).toBe('Lahiri');
    expect(reportData.calculation.houseSystem).toBe('Equal House / Whole Sign');

    // Ascendant verification
    expect(reportData.ascendant.sign).toBe('Aries');
    expect(reportData.ascendant.lord).toBe('Mars');

    // House 10 verification
    expect(reportData.houses.houseTen.sign).toBe('Capricorn');
    expect(reportData.houses.houseTen.lord).toBe('Saturn');
    expect(reportData.houses.houseTen.occupants).toBe('Saturn');

    // Planet Sun verification
    expect(reportData.planets.sun.sign).toBe('Leo');
    expect(reportData.planets.sun.house).toBe('5');
    expect(reportData.planets.sun.dignity).toBe('Own Sign / Moolatrikona');
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
    const reportData = mapNormalizedChartToCareerReportData(normalized);
    const texOutput = generateReportDataTex(reportData);

    expect(texOutput).toContain('\\newcommand{\\ClientName}{\\RenderVerified{Sample Client}}');
    expect(texOutput).toContain('\\newcommand{\\AscendantSign}{\\RenderVerified{Aries}}');
    expect(texOutput).toContain('\\newcommand{\\SunSign}{\\RenderVerified{Leo}}');
    expect(texOutput).toContain('\\newcommand{\\HouseTenLord}{\\RenderVerified{Saturn}}');
    expect(texOutput).toContain('\\newcommand{\\SunName}{Sun}');
  });

  it('5. Should execute the complete CareerReportService pipeline seamlessly', async () => {
    const result = await careerReportService.generateCareerReportData(mockAstroChart);

    expect(result.normalizedChart).toBeDefined();
    expect(result.careerAnalysisInput).toBeDefined();
    expect(result.reportData).toBeDefined();
    expect(result.reportDataTex).toBeDefined();
    expect(result.reportDataTex.length).toBeGreaterThan(500);
  });
});
