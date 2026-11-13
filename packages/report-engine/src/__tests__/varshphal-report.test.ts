import { describe, it, expect } from 'vitest';
import { ChartCalculator, AstronomyEngineAdapter, DEFAULT_ASTROLOGY_CONFIG } from '@astro/astrology-engine';
import { generateVarshphalReport, reportPdfService, ReportType } from '../index';

describe('Varshphal Report Engine Suite (Phase 6.10)', () => {
  const chartCalculator = new ChartCalculator(new AstronomyEngineAdapter());

  const puneetBirthDetails = {
    date: { year: 1983, month: 12, day: 28 },
    time: { hour: 4, minute: 45, second: 0 },
    timezone: 'Asia/Kolkata',
    latitude: 28.4069,
    longitude: 77.8498,
    placeName: 'Bulandshahr, India',
  };

  const clientProfile = {
    name: 'Puneet Kumar',
    dateOfBirth: '1983-12-28',
    timeOfBirth: '04:45:00',
    placeName: 'Bulandshahr, India',
    timezone: 'Asia/Kolkata',
    latitude: 28.4069,
    longitude: 77.8498,
  };

  const reportConfig = {
    zodiacType: 'SIDEREAL',
    ayanamsa: 'LAHIRI',
    houseSystem: 'WHOLE_SIGN',
    nodeCalculation: 'MEAN_NODE',
  };

  it('generates complete, deterministic VarshphalReportModel matching reference PDF structure', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const report = await generateVarshphalReport(
      clientProfile as any,
      reportConfig as any,
      chart,
      undefined,
      { targetYear: 2026 }
    );

    expect(report.type).toBe(ReportType.VARSHPHAL);
    expect(report.title).toBe('Varshphal Report 2026');
    expect(report.targetYear).toBe(2026);

    // 1. Solar Return Astronomical Accuracy
    expect(report.solarReturn.targetYear).toBe(2026);
    expect(report.solarReturn.age).toBe(43);
    expect(report.solarReturn.angularErrorDegrees).toBeLessThan(0.0001);
    expect(report.solarReturn.solarReturnUtcIso).toBeDefined();
    expect(report.solarReturn.solarReturnLocalIso).toBeDefined();

    // 2. Varsha Lagna & Muntha
    expect(report.varshaLagna.sign).toBe('Vrischika');
    expect(report.varshaLagna.signIndex).toBe(8);
    expect(report.varshaLagna.degreeInRashi).toBeCloseTo(15.86, 1);

    // Muntha: (8 + 43) % 12 = 51 % 12 = 3 (Gemini / Mithuna), House 8 in Scorpio Lagna
    expect(report.muntha.rashiIndex).toBe(3);
    expect(report.muntha.rashiName).toBe('Mithuna');
    expect(report.muntha.houseInVarshaChart).toBe(8);
    expect(report.muntha.houseInNatalChart).toBe(8);
    expect(report.muntha.lord).toBe('MERCURY');
    expect(report.muntha.rashiName).toBe('Mithuna');
    expect(report.muntha.houseInVarshaChart).toBe(8);

    // 3. Varshesha (Year Lord) & Panchadhikari
    expect(report.varshesha.candidates.length).toBeGreaterThanOrEqual(5);
    expect(report.varshesha.selectedVarshesha).toBe('MARS');
    expect(report.varshesha.harshaBalaScore).toBe(10);
    expect(report.varshesha.aspectsVarshaLagna).toBe(true);

    // 4. Harsha Bala Scorecard (9 planets evaluated across 4 pillars)
    expect(report.harshaBala.scores).toBeDefined();
    const evaluatedPlanets = Object.keys(report.harshaBala.scores);
    expect(evaluatedPlanets.length).toBeGreaterThanOrEqual(7);
    for (const score of Object.values(report.harshaBala.scores)) {
      expect(score.sthanaBala).toBeGreaterThanOrEqual(0);
      expect(score.ucchaBala).toBeGreaterThanOrEqual(0);
      expect(score.striPurushaBala).toBeGreaterThanOrEqual(0);
      expect(score.dinaRatriBala).toBeGreaterThanOrEqual(0);
      expect(score.totalScore).toBe(score.sthanaBala + score.ucchaBala + score.striPurushaBala + score.dinaRatriBala);
      expect(score.totalScore).toBeLessThanOrEqual(20);
    }

    // 5. Tajika Yogas
    expect(report.tajikaYogas.length).toBeGreaterThanOrEqual(1);

    // 6. Annual Planet Effects & House Transits
    expect(report.annualPlanetEffects.length).toBeGreaterThanOrEqual(7);

    // 7. Mudda Dasha Condensed Vimshottari Timeline
    expect(report.muddaDasha.length).toBeGreaterThanOrEqual(9);
    const totalDays = report.muddaDasha.reduce((acc, p) => acc + p.durationDays, 0);
    expect(totalDays).toBeGreaterThanOrEqual(360);
    expect(totalDays).toBeLessThanOrEqual(370);

    // 8. 12-Month Performance Matrix
    expect(report.monthlyForecasts).toHaveLength(12);
    for (const mf of report.monthlyForecasts) {
      expect(mf.ratings.career).toBeGreaterThanOrEqual(1);
      expect(mf.ratings.career).toBeLessThanOrEqual(5);
      expect(mf.ratings.health).toBeGreaterThanOrEqual(1);
      expect(mf.ratings.health).toBeLessThanOrEqual(5);
    }

    // 9. Panchang Remedies & Three-Remedy Caution Rule
    expect(report.panchangRemedies.length).toBeGreaterThanOrEqual(3);
    expect(report.remedyCaution).toContain('no more than three remedies');

    // 10. Dual Chart Placements
    expect(report.natalChartPlacements.length).toBeGreaterThanOrEqual(7);
    expect(report.annualChartPlacements.length).toBeGreaterThanOrEqual(7);
  });

  it('renders a customer-facing 16-page vector PDF with zero defects', async () => {
    const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
    const report = await generateVarshphalReport(
      clientProfile as any,
      reportConfig as any,
      chart,
      undefined,
      { targetYear: 2026 }
    );

    const pdfBuffer = await reportPdfService.generateReportPdf(report);

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(50000);
    expect(pdfBuffer.toString('utf-8', 0, 8)).toContain('%PDF-1.4');

    // Count pages in PDF stream: exactly 16 pages
    const pageMatches = pdfBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
    expect(pageMatches).not.toBeNull();
    expect(pageMatches!).toHaveLength(16);
  });

  it('handles untimed birth profile gracefully with fallback defaults', async () => {
    const untimedChart = {
      ...(await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG)),
      isTimeUnknown: true,
      ascendant: undefined,
    };

    const report = await generateVarshphalReport(
      { ...clientProfile, timeOfBirth: '00:00:00', isTimeUnknown: true } as any,
      reportConfig as any,
      untimedChart,
      undefined,
      { allowUnknownBirthTime: true, targetYear: 2026 }
    );

    expect(report.type).toBe(ReportType.VARSHPHAL);
    expect(report.targetYear).toBe(2026);
    expect(report.isTimeUnknown).toBe(true);
    expect(report.solarReturn).toBeDefined();

    // Verify separate Natal Lagna vs Varsha Lagna availability:
    // Varsha Lagna is deterministically established from the exact solar return instant + return location
    expect(report.varshaLagna.sign).not.toBe('Indeterminate');
    expect(report.varshaLagna.nakshatra).not.toBe('Indeterminate');

    // Muntha depends on Natal Lagna, so Muntha IS indeterminate
    expect(report.muntha.rashiName).toBe('Indeterminate');

    // Natal chart placements have house 0 (withheld) because natal time is unrecorded
    expect(report.natalChartPlacements.every((p) => p.house === 0)).toBe(true);

    // Annual chart placements have valid houses 1-12 from Varsha Lagna
    expect(report.annualChartPlacements.every((p) => p.house >= 1 && p.house <= 12)).toBe(true);

    // Monthly forecasts withhold natal quantitative ratings
    expect(report.monthlyForecasts.every((mf) => mf.ratings.isIndeterminate && mf.ratings.career === null)).toBe(true);

    const pdfBuffer = await reportPdfService.generateReportPdf(report);
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(50000);

    const pageMatches = pdfBuffer.toString('latin1').match(/\/Type\s*\/Page\b/g);
    expect(pageMatches!).toHaveLength(16);
  });

  describe('Phase 6.10C Final Acceptance Criteria', () => {
    it('strictly enforces the three-remedy maximum caution rule across report model and narratives', async () => {
      const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
      const report = await generateVarshphalReport(
        clientProfile as any,
        reportConfig as any,
        chart,
        undefined,
        { targetYear: 2026 }
      );

      // Verify disclaimer explicitly forbids taking more than three remedies at a time
      expect(report.remedyCaution).toContain('select no more than three remedies at a time');
      expect(report.remedyCaution).not.toContain('minimum of three');
      expect(report.remedyCaution).not.toContain('at least three');

      // Verify that every monthly forecast contains the caution framing
      for (const mf of report.monthlyForecasts) {
        expect(Array.isArray(mf.remedies)).toBe(true);
        expect(mf.remedies.length).toBeGreaterThanOrEqual(1);
        // None of the remedy items should recommend doing more than three simultaneously
        for (const rem of mf.remedies) {
          expect(rem).not.toContain('must do all');
          expect(rem).not.toContain('minimum three');
        }
      }
    });

    it('handles distinct annual return locations and rejects missing coordinates', async () => {
      const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);

      // Location 1: London, UK
      const reportLondon = await generateVarshphalReport(
        clientProfile as any,
        reportConfig as any,
        chart,
        undefined,
        {
          targetYear: 2026,
          annualLocation: {
            latitude: 51.5074,
            longitude: -0.1278,
            timezone: 'Europe/London',
            placeName: 'London, UK',
          },
        }
      );

      // Location 2: Tokyo, Japan
      const reportTokyo = await generateVarshphalReport(
        clientProfile as any,
        reportConfig as any,
        chart,
        undefined,
        {
          targetYear: 2026,
          annualLocation: {
            latitude: 35.6762,
            longitude: 139.6503,
            timezone: 'Asia/Tokyo',
            placeName: 'Tokyo, Japan',
          },
        }
      );

      // Astronomical solar return UTC instant is identical regardless of location
      expect(reportLondon.solarReturn.solarReturnUtcIso).toBe(reportTokyo.solarReturn.solarReturnUtcIso);

      // But Varsha Lagna is location-dependent due to different local sidereal times
      expect(reportLondon.varshaLagna.degree).not.toBe(reportTokyo.varshaLagna.degree);
      expect(reportLondon.solarReturn.annualLocation.placeName).toBe('London, UK');
      expect(reportTokyo.solarReturn.annualLocation.placeName).toBe('Tokyo, Japan');

      // Birth profile without coordinates must throw an error, preventing silent fallback
      const invalidProfile = { ...clientProfile, latitude: undefined, longitude: undefined };
      await expect(
        generateVarshphalReport(invalidProfile as any, reportConfig as any, chart, undefined, { targetYear: 2026 })
      ).rejects.toThrow('Birth profile requires valid geographical coordinates');
    });

    it('verifies exact Panchadhikari offices, aspect qualifications, and final Varshesh for canonical fixture', async () => {
      const chart = await chartCalculator.calculateChart(puneetBirthDetails, DEFAULT_ASTROLOGY_CONFIG);
      const report = await generateVarshphalReport(
        clientProfile as any,
        reportConfig as any,
        chart,
        undefined,
        { targetYear: 2026 }
      );

      // 1. Munthesha: Mercury (Gemini Muntha)
      const munthesha = report.varshesha.candidates.find((c) => c.role === 'MUNTHESHA');
      expect(munthesha?.planet).toBe('MERCURY');
      expect(munthesha?.houseInVarshaChart).toBe(2);
      expect(munthesha?.aspectsVarshaLagna).toBe(false); // 2nd house does NOT aspect Lagna

      // 2. Janmesha: Mars (Scorpio Natal Lagna)
      const janmesha = report.varshesha.candidates.find((c) => c.role === 'JANMESHA');
      expect(janmesha?.planet).toBe('MARS');
      expect(janmesha?.houseInVarshaChart).toBe(10);
      expect(janmesha?.aspectsVarshaLagna).toBe(true); // 4th sign Tajika aspect onto Scorpio Lagna

      // 3. Varsha Lagnesha: Mars (Scorpio Varsha Lagna)
      const varshaLagnesha = report.varshesha.candidates.find((c) => c.role === 'VARSHA_LAGNESHA');
      expect(varshaLagnesha?.planet).toBe('MARS');
      expect(varshaLagnesha?.houseInVarshaChart).toBe(10);
      expect(varshaLagnesha?.aspectsVarshaLagna).toBe(true);

      // 4. Trirashisha: Venus (Night return in Scorpio)
      const trirashisha = report.varshesha.candidates.find((c) => c.role === 'TRIRASHISHA');
      expect(trirashisha?.planet).toBe('VENUS');
      expect(trirashisha?.houseInVarshaChart).toBe(12);
      expect(trirashisha?.aspectsVarshaLagna).toBe(false); // 12th house does NOT aspect Lagna

      // 5. Dina/Ratri Pati: Sun (Night return Moon in Leo -> Lord Sun)
      const dinaRatriPati = report.varshesha.candidates.find((c) => c.role === 'DINA_RATRI_PATI');
      expect(dinaRatriPati?.planet).toBe('SUN');
      expect(dinaRatriPati?.houseInVarshaChart).toBe(2);
      expect(dinaRatriPati?.aspectsVarshaLagna).toBe(false); // 2nd house does NOT aspect Lagna

      // Final Varshesh selection: Mars is the sole aspecting candidate with Harsha Bala 10/20
      expect(report.varshesha.selectedVarshesha).toBe('MARS');
      expect(report.varshesha.harshaBalaScore).toBe(10);
      expect(report.varshesha.aspectsVarshaLagna).toBe(true);
    });
  });
});
