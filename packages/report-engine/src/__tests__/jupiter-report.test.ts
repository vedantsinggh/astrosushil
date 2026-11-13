import { describe, it, expect } from 'vitest';
import { ChartCalculator, AstronomyEngineAdapter, DEFAULT_ASTROLOGY_CONFIG } from '@astro/astrology-engine';
import { generateJupiterReport, reportPdfService, ReportType } from '../index';

describe('Jupiter Report Engine Suite (Phase 6.9)', () => {
  const chartCalculator = new ChartCalculator(new AstronomyEngineAdapter());

  const puneetBirthDetails = {
    date: { year: 1983, month: 12, day: 28 },
    time: { hour: 4, minute: 45, second: 0 },
    timezone: 'Asia/Kolkata',
    latitude: 28.407,
    longitude: 77.8498,
    placeName: 'Bulandshahr, India',
  };

  const clientProfile = {
    name: 'Puneet Kumar',
    dateOfBirth: '1983-12-28',
    timeOfBirth: '04:45:00',
    placeName: 'Bulandshahr, India',
    timezone: 'Asia/Kolkata',
  };

  const reportConfig = {
    zodiacType: 'SIDEREAL',
    ayanamsa: 'LAHIRI',
    houseSystem: 'WHOLE_SIGN',
    nodeCalculation: 'MEAN_NODE',
  };

  it('generates complete, deterministic JupiterReportModel for reference fixture', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const report = await generateJupiterReport(clientProfile, reportConfig, chart);

    expect(report.type).toBe(ReportType.JUPITER_TRANSIT);
    expect(report.title).toBe('Jupiter Transit Report');

    // 1. Placement verification
    expect(report.jupiterPlacement.sign).toContain('Dhanu');
    expect(report.jupiterPlacement.sign).toContain('Sagittarius');
    expect(report.jupiterPlacement.house).toBe(2);
    expect(report.jupiterPlacement.houseFormatted).toBe('2nd House');
    expect(report.jupiterPlacement.dignity).toBe('Moolatrikona');
    expect(report.jupiterPlacement.nakshatra).toBe('Mula');
    expect(report.jupiterPlacement.pada).toBe(1);
    expect(report.jupiterPlacement.isRetrograde).toBe(false);
    expect(report.jupiterPlacement.lordship).toEqual([2, 5]);

    // 2. Aspects (5th, 7th, 9th)
    expect(report.jupiterAspects.aspects).toHaveLength(3);
    const [a5, a7, a9] = report.jupiterAspects.aspects;
    expect(a5.aspectNumber).toBe(5);
    expect(a5.house).toBe(6);
    expect(a5.sign).toContain('Mesha');

    expect(a7.aspectNumber).toBe(7);
    expect(a7.house).toBe(8);
    expect(a7.sign).toContain('Mithuna');

    expect(a9.aspectNumber).toBe(9);
    expect(a9.house).toBe(10);
    expect(a9.sign).toContain('Simha');

    // 3. Moon Sign Relationship
    expect(report.moonSignRelation.moonSign).toContain('Kanya');
    expect(report.moonSignRelation.houseFromMoon).toBe(4);
    expect(report.moonSignRelation.archetype).toContain('Grounded');

    // 4. Nakshatra Analysis
    expect(report.jupiterNakshatraAnalysis.nakshatra).toBe('Mula');
    expect(report.jupiterNakshatraAnalysis.pada).toBe(1);
    expect(report.jupiterNakshatraAnalysis.lord).toBe('Ketu');

    // 5. Ashtakavarga (56 Points)
    expect(report.jupiterAshtakavarga.total).toBe(56);
    expect(report.jupiterAshtakavarga.bindus).toHaveLength(12);
    expect(report.jupiterAshtakavarga.currentGeminiPoints).toBe(report.jupiterAshtakavarga.bindus[2]);
    expect(report.jupiterAshtakavarga.cancerPoints).toBe(report.jupiterAshtakavarga.bindus[3]);
    expect(report.jupiterAshtakavarga.cancerPoints).toBeGreaterThanOrEqual(4);

    // 6. Transits & Remedies
    expect(report.geminiTransit.sign).toContain('Gemini');
    expect(report.geminiTransit.houseFromLagna).toBe(8);
    expect(report.geminiTransit.houseFromMoon).toBe(10);

    expect(report.cancerTransit.sign).toContain('Cancer');
    expect(report.cancerTransit.houseFromLagna).toBe(9);
    expect(report.cancerTransit.houseFromMoon).toBe(11);

    expect(report.remedies.gemstone.name).toContain('Yellow Sapphire');
    expect(report.remedies.rudraksha.mukhi).toContain('5 Mukhi');
    expect(report.remedies.astrovastu.direction).toContain('North-East');
  });

  it('renders crisp 11-page vector PDF for canonical Jupiter report', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const report = await generateJupiterReport(clientProfile, reportConfig, chart);
    const pdfBuffer = await reportPdfService.generateReportPdf(report);

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(10000);
    expect(pdfBuffer.toString('utf-8', 0, 8)).toContain('%PDF-1.4');

    const pageMatches = pdfBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
    expect(pageMatches).not.toBeNull();
    expect(pageMatches!.length).toBe(11); // Exactly 11 pages
  });

  it('handles untimed birth profile without corrupting calculations or PDF generation', async () => {
    const untimedChart = {
      ...(await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG)),
      isTimeUnknown: true,
      ascendant: undefined,
    };
    const report = await generateJupiterReport(
      { ...clientProfile, timeOfBirth: '00:00:00' },
      reportConfig,
      untimedChart,
      undefined,
      { allowUnknownBirthTime: true }
    );

    expect(report.jupiterPlacement.house).toBeNull();
    expect(report.jupiterPlacement.houseFormatted).toContain('Indeterminate');
    expect(report.jupiterPlacement.lordship).toEqual([]);

    const pdfBuffer = await reportPdfService.generateReportPdf(report);
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(10000);
  });
});
