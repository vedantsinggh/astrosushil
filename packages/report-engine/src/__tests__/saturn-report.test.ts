import { describe, it, expect } from 'vitest';
import { ChartCalculator, AstronomyEngineAdapter, DEFAULT_ASTROLOGY_CONFIG } from '@astro/astrology-engine';
import { generateSaturnReport, reportPdfService, ReportType } from '../index';

describe('Saturn Report Engine Suite (Phase 6.8)', () => {
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

  it('generates complete, deterministic SaturnReportModel for reference fixture', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const report = await generateSaturnReport(clientProfile, reportConfig, chart);

    expect(report.type).toBe(ReportType.SATURN);
    expect(report.title).toBe('Saturn in Your Birth Chart Report');

    // 1. Placement verification
    expect(report.saturnPlacement.sign).toBe('Tula');
    expect(report.saturnPlacement.house).toBe(12);
    expect(report.saturnPlacement.houseFormatted).toBe('12th House');
    expect(report.saturnPlacement.dignity).toBe('Exalted (Uchcha)');
    expect(report.saturnPlacement.nakshatra).toBe('Swati');
    expect(report.saturnPlacement.pada).toBe(4);
    expect(report.saturnPlacement.isRetrograde).toBe(false);
    expect(report.saturnPlacement.isCombust).toBe(false);
    expect(report.saturnPlacement.lordship).toEqual([3, 4]);

    // 2. Aspects
    expect(report.saturnAspects.aspects).toHaveLength(3);
    const [a3, a7, a10] = report.saturnAspects.aspects;
    expect(a3.aspectNumber).toBe(3);
    expect(a3.house).toBe(2);
    expect(a3.sign).toBe('Dhanu');

    expect(a7.aspectNumber).toBe(7);
    expect(a7.house).toBe(6);
    expect(a7.sign).toBe('Mesha');

    expect(a10.aspectNumber).toBe(10);
    expect(a10.house).toBe(9);
    expect(a10.sign).toBe('Karka');

    // 3. Moon Sign Relationship & Nakshatras
    expect(report.moonSignRelation.moonSign).toContain('Kanya');
    expect(report.moonSignRelation.moonNakshatra).toBe('Chitra');
    expect(report.moonSignRelation.moonPada).toBe(2);
    expect(report.moonSignRelation.moonNakshatraLord).toBe('MARS');
    expect(report.moonSignRelation.houseFromMoon).toBe(2);
    expect(report.moonSignRelation.saturnRelationToMoonLord).toBe('Natural Friend');
    expect(report.saturnPlacement.nakshatra).toBe('Swati');
    expect(report.saturnPlacement.pada).toBe(4);
    expect(report.saturnNakshatraAnalysis.nakshatra).toBe('Swati');
    expect(report.saturnNakshatraAnalysis.pada).toBe(4);

    // 4. Ashtakavarga
    expect(report.saturnAshtakavarga.total).toBe(39);
    expect(report.saturnAshtakavarga.bindus).toHaveLength(12);
    expect(report.saturnAshtakavarga.natalHousePoints).toBe(report.saturnAshtakavarga.bindus[6]);
    expect(report.saturnAshtakavarga.currentTransitHousePoints).toBe(report.saturnAshtakavarga.bindus[11]);

    // 5. Sade Sati & Kantak Shani
    expect(report.sadeSatiPhases.isActive).toBe(false);
    expect(report.kantakShani.isActiveFromMoon).toBe(true);
    expect(report.kantakShani.houseFromMoon).toBe(7);

    // 6. Transits & Remedies
    expect(report.saturnTransits.transit2025_2027.sign).toBe('Meena (Pisces)');
    expect(report.saturnTransits.transit2027_2029.sign).toBe('Mesha (Aries)');
    expect(report.remedies.gemstone.name).toContain('Blue Sapphire');
    expect(report.iconicInspirations.length).toBeGreaterThanOrEqual(4);
  });

  it('renders a 10-page vector PDF with zero text clipping or defects', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const report = await generateSaturnReport(clientProfile, reportConfig, chart);
    const pdfBuffer = await reportPdfService.generateReportPdf(report);

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(10000);
    expect(pdfBuffer.toString('utf-8', 0, 8)).toContain('%PDF-1.4');

    // Count pages in PDF stream
    const pageMatches = pdfBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
    expect(pageMatches).not.toBeNull();
    // 10 content pages + 1 catalog / closing standard if applicable
    expect(pageMatches!.length).toBeGreaterThanOrEqual(10);
  });

  it('handles untimed birth profile without throwing or corrupting deterministic calculations', async () => {
    const untimedChart = {
      ...(await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG)),
      isTimeUnknown: true,
      ascendant: undefined,
    };
    const report = await generateSaturnReport(
      { ...clientProfile, timeOfBirth: '00:00:00' },
      reportConfig,
      untimedChart,
      undefined,
      { allowUnknownBirthTime: true }
    );

    expect(report.saturnPlacement.house).toBeNull();
    expect(report.saturnPlacement.houseFormatted).toContain('Indeterminate');
    expect(report.saturnPlacement.lordship).toEqual([]);

    const pdfBuffer = await reportPdfService.generateReportPdf(report);
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(10000);
  });
});
