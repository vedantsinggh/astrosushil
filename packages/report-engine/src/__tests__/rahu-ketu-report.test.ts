import { describe, it, expect } from 'vitest';
import { ChartCalculator, AstronomyEngineAdapter, DEFAULT_ASTROLOGY_CONFIG } from '@astro/astrology-engine';
import { generateRahuKetuReport, reportPdfService, ReportType } from '../index';

describe('Rahu-Ketu Report Engine Suite (Phase 6.9)', () => {
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

  it('generates complete, deterministic RahuKetuReportModel for reference fixture', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const report = await generateRahuKetuReport(clientProfile, reportConfig, chart);

    expect(report.type).toBe(ReportType.RAHU_KETU_TRANSIT);
    expect(report.title).toBe('Rahu Ketu Transit Report');

    // 1. Placement & 180° Axis verification
    expect(report.nodalPlacement.rahu.sign).toContain('Vrishabha');
    expect(report.nodalPlacement.rahu.sign).toContain('Taurus');
    expect(report.nodalPlacement.rahu.house).toBe(7);
    expect(report.nodalPlacement.rahu.houseFormatted).toBe('7th House');
    expect(report.nodalPlacement.rahu.dignity).toBe('Exalted (Uchcha)');
    expect(report.nodalPlacement.rahu.nakshatra).toBe('Rohini');
    expect(report.nodalPlacement.rahu.pada).toBe(4);

    expect(report.nodalPlacement.ketu.sign).toContain('Vrischika');
    expect(report.nodalPlacement.ketu.sign).toContain('Scorpio');
    expect(report.nodalPlacement.ketu.house).toBe(1);
    expect(report.nodalPlacement.ketu.houseFormatted).toBe('1st House');
    expect(report.nodalPlacement.ketu.dignity).toBe('Exalted (Uchcha)');
    expect(report.nodalPlacement.ketu.nakshatra).toBe('Jyeshtha');
    expect(report.nodalPlacement.ketu.pada).toBe(2);

    expect(report.nodalPlacement.axisSeparation).toBe(180.0);

    // 2. Aspects
    expect(report.nodalAspects.rahuAspects).toHaveLength(3);
    const [r5, r7, r9] = report.nodalAspects.rahuAspects;
    expect(r5.aspectNumber).toBe(5);
    expect(r5.house).toBe(11);
    expect(r7.aspectNumber).toBe(7);
    expect(r7.house).toBe(1);
    expect(r9.aspectNumber).toBe(9);
    expect(r9.house).toBe(3);

    expect(report.nodalAspects.ketuAspects).toHaveLength(3);
    const [k5, k7, k9] = report.nodalAspects.ketuAspects;
    expect(k5.aspectNumber).toBe(5);
    expect(k5.house).toBe(5);
    expect(k7.aspectNumber).toBe(7);
    expect(k7.house).toBe(7);
    expect(k9.aspectNumber).toBe(9);
    expect(k9.house).toBe(9);

    // 3. Conjunctions & Moon Sign Relationship
    expect(report.nodalConjunctions.ketuConjunctions).toContain('VENUS');
    expect(report.moonSignRelation.moonSign).toContain('Kanya');
    expect(report.moonSignRelation.rahuHouseFromMoon).toBe(9);
    expect(report.moonSignRelation.ketuHouseFromMoon).toBe(3);

    // 4. Transits (2025-2026 & 2026-2028)
    expect(report.transit2025_2026.rahuSign).toContain('Kumbha');
    expect(report.transit2025_2026.rahuHouseFromLagna).toBe(4);
    expect(report.transit2025_2026.rahuHouseFromMoon).toBe(6);
    expect(report.transit2025_2026.ketuSign).toContain('Simha');
    expect(report.transit2025_2026.ketuHouseFromLagna).toBe(10);
    expect(report.transit2025_2026.ketuHouseFromMoon).toBe(12);

    expect(report.transit2026_2028.rahuSign).toContain('Makara');
    expect(report.transit2026_2028.rahuHouseFromLagna).toBe(3);
    expect(report.transit2026_2028.rahuHouseFromMoon).toBe(5);
    expect(report.transit2026_2028.ketuSign).toContain('Karka');
    expect(report.transit2026_2028.ketuHouseFromLagna).toBe(9);
    expect(report.transit2026_2028.ketuHouseFromMoon).toBe(11);

    // 5. Remedies
    expect(report.remedies.gemstones.rahuGomedCaution).toContain('Caution on Hessonite');
    expect(report.remedies.rudraksha.rahuMukhi).toContain('8 Mukhi');
    expect(report.remedies.rudraksha.ketuMukhi).toContain('9 Mukhi');
    expect(report.remedies.astrovastu.rahuDirection).toContain('South-West');
  });

  it('renders crisp 12-page vector PDF for canonical Rahu-Ketu report', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const report = await generateRahuKetuReport(clientProfile, reportConfig, chart);
    const pdfBuffer = await reportPdfService.generateReportPdf(report);

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(10000);
    expect(pdfBuffer.toString('utf-8', 0, 8)).toContain('%PDF-1.4');

    const pageMatches = pdfBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
    expect(pageMatches).not.toBeNull();
    expect(pageMatches!.length).toBe(12); // Exactly 12 pages
  });

  it('handles untimed birth profile without throwing or corrupting calculations', async () => {
    const untimedChart = {
      ...(await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG)),
      isTimeUnknown: true,
      ascendant: undefined,
    };
    const report = await generateRahuKetuReport(
      { ...clientProfile, timeOfBirth: '00:00:00' },
      reportConfig,
      untimedChart,
      undefined,
      { allowUnknownBirthTime: true }
    );

    expect(report.nodalPlacement.rahu.house).toBeNull();
    expect(report.nodalPlacement.rahu.houseFormatted).toContain('Indeterminate');
    expect(report.nodalPlacement.ketu.house).toBeNull();
    expect(report.nodalPlacement.ketu.houseFormatted).toContain('Indeterminate');

    const pdfBuffer = await reportPdfService.generateReportPdf(report);
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(10000);
  });
});
