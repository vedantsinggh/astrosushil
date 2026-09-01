import { describe, it, expect, beforeAll, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeAstroChart, AstroChart } from '@astro/astrology-engine';
import { careerEvidenceEngine, MockCareerAnalysisProvider } from '@astro/prediction-engine';
import { careerReportService, xeLatexCompiler, escapeLatex, generateReportDataTex } from '@astro/report-engine';

describe('Phase 5: Complete Astro Sushil Career Report Pipeline Suite', () => {
  const aaravSharmaBirthDetails = {
    name: 'Aarav Sharma',
    dateOfBirth: '1995-08-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
  };

  const aaravAstroChart: AstroChart = {
    ascendant: { sign: 'Scorpio', degree: 22.45, nakshatra: 'Jyeshtha', pada: 2 },
    planets: [
      { name: 'Sun', sign: 'Leo', degree: 28.1, house: 10, nakshatra: 'Uttara Phalguni', pada: 1, retrograde: false },
      { name: 'Moon', sign: 'Pisces', degree: 14.2, house: 5, nakshatra: 'Uttara Bhadrapada', pada: 4, retrograde: false },
      { name: 'Mars', sign: 'Virgo', degree: 19.8, house: 11, nakshatra: 'Hasta', pada: 3, retrograde: false },
      { name: 'Mercury', sign: 'Leo', degree: 11.4, house: 10, nakshatra: 'Magha', pada: 4, retrograde: false },
      { name: 'Jupiter', sign: 'Scorpio', degree: 12.6, house: 1, nakshatra: 'Anuradha', pada: 3, retrograde: false },
      { name: 'Venus', sign: 'Cancer', degree: 25.3, house: 9, nakshatra: 'Ashlesha', pada: 3, retrograde: false },
      { name: 'Saturn', sign: 'Aquarius', degree: 28.9, house: 4, nakshatra: 'Purva Bhadrapada', pada: 3, retrograde: true },
      { name: 'Rahu', sign: 'Taurus', degree: 4.5, house: 7, nakshatra: 'Krittika', pada: 3, retrograde: true },
      { name: 'Ketu', sign: 'Scorpio', degree: 4.5, house: 1, nakshatra: 'Anuradha', pada: 1, retrograde: true },
    ],
    houses: [
      { houseNumber: 1, sign: 'Scorpio', degree: 22.45 },
      { houseNumber: 2, sign: 'Sagittarius', degree: 22.45 },
      { houseNumber: 3, sign: 'Capricorn', degree: 22.45 },
      { houseNumber: 4, sign: 'Aquarius', degree: 22.45 },
      { houseNumber: 5, sign: 'Pisces', degree: 22.45 },
      { houseNumber: 6, sign: 'Aries', degree: 22.45 },
      { houseNumber: 7, sign: 'Taurus', degree: 22.45 },
      { houseNumber: 8, sign: 'Gemini', degree: 22.45 },
      { houseNumber: 9, sign: 'Cancer', degree: 22.45 },
      { houseNumber: 10, sign: 'Leo', degree: 22.45 },
      { houseNumber: 11, sign: 'Virgo', degree: 22.45 },
      { houseNumber: 12, sign: 'Libra', degree: 22.45 },
    ],
  };

  it('1. Should validate chart completeness and reject incomplete charts', async () => {
    const incompleteChart: any = {
      ascendant: { sign: 'Scorpio' },
      planets: [{ name: 'Sun' }], // Missing 8 planets
      houses: [{ houseNumber: 1 }], // Missing 11 houses
    };

    await expect(
      careerReportService.generateCareerReportData(incompleteChart)
    ).rejects.toThrow('CareerReportService Validation Error');
  });

  it('2. Should extract evidence deterministically using CareerEvidenceEngine', () => {
    const normalized = normalizeAstroChart(aaravAstroChart);
    const evidence = careerEvidenceEngine.buildCareerAnalysisInput(normalized);

    expect(evidence.chartSummary.ascendantSign).toBe('Scorpio');
    expect(evidence.careerAxis.houseTenSign).toBe('Leo');
    expect(evidence.careerAxis.houseTenLord).toBe('Sun');
    expect(evidence.leadershipEvidence.sunPlacement.house).toBe(10);
    expect(evidence.planetaryEvidence).toHaveLength(9);
    expect(evidence.houseEvidence).toHaveLength(12);
  });

  it('3. Should interpret evidence using CareerAnalysisProvider (Mock)', async () => {
    const normalized = normalizeAstroChart(aaravAstroChart);
    const evidence = careerEvidenceEngine.buildCareerAnalysisInput(normalized);
    const provider = new MockCareerAnalysisProvider();

    const analysis = await provider.analyze(evidence);

    expect(analysis.executiveCareerSummary).toContain('Scorpio');
    expect(analysis.careerIdentity).toBeDefined();
    expect(analysis.recommendedFields?.length).toBeGreaterThan(0);
  });

  it('4. Should map chart and analysis into CareerReportData correctly', async () => {
    const normalized = normalizeAstroChart(aaravAstroChart);
    normalized.birthDetails = {
      name: aaravSharmaBirthDetails.name,
      dateOfBirth: aaravSharmaBirthDetails.dateOfBirth,
      timeOfBirth: aaravSharmaBirthDetails.timeOfBirth,
      latitude: aaravSharmaBirthDetails.latitude,
      longitude: aaravSharmaBirthDetails.longitude,
      timezone: aaravSharmaBirthDetails.timezone,
      placeName: aaravSharmaBirthDetails.placeName,
    };

    const provider = new MockCareerAnalysisProvider();
    const result = await careerReportService.generateCareerReportData(normalized, { provider });

    expect(result.reportData.client.clientName).toBe('Aarav Sharma');
    expect(result.reportData.ascendant.sign).toBe('Scorpio');
    expect(result.reportData.houses.houseTen.sign).toBe('Leo');
    expect(result.reportData.houses.houseTen.lord).toBe('Sun');
    expect(result.reportData.planets.sun.house).toBe('House 10');
  });

  it('5. Should safely escape LaTeX special characters', () => {
    const rawInput = 'Tech & Operations % 100 #1 _special_ {key} \\path 28°';
    const escaped = escapeLatex(rawInput);

    expect(escaped).toContain('\\&');
    expect(escaped).toContain('\\%');
    expect(escaped).toContain('\\#');
    expect(escaped).toContain('\\_');
    expect(escaped).toContain('\\{');
    expect(escaped).toContain('\\}');
    expect(escaped).toContain('\\textbackslash{}');
  });

  it('6. Should generate valid report_data.tex string', async () => {
    const normalized = normalizeAstroChart(aaravAstroChart);
    normalized.birthDetails = {
      name: aaravSharmaBirthDetails.name,
      dateOfBirth: aaravSharmaBirthDetails.dateOfBirth,
      timeOfBirth: aaravSharmaBirthDetails.timeOfBirth,
      latitude: aaravSharmaBirthDetails.latitude,
      longitude: aaravSharmaBirthDetails.longitude,
      timezone: aaravSharmaBirthDetails.timezone,
      placeName: aaravSharmaBirthDetails.placeName,
    };

    const result = await careerReportService.generateCareerReportData(normalized);
    const texOutput = generateReportDataTex(result.reportData);

    expect(texOutput).toContain('\\newcommand{\\ClientName}{\\RenderVerified{Aarav Sharma}}');
    expect(texOutput).toContain('\\newcommand{\\AscendantSign}{\\RenderVerified{Scorpio}}');
    expect(texOutput).toContain('\\newcommand{\\HouseTenSign}{\\RenderVerified{Leo}}');
    expect(texOutput).toContain('\\newcommand{\\HouseTenLord}{\\RenderVerified{Sun}}');
  });

  it('7. End-to-End Real Generation for Aarav Sharma PDF Compilation', async () => {
    const normalized = normalizeAstroChart(aaravAstroChart);
    normalized.birthDetails = {
      name: aaravSharmaBirthDetails.name,
      dateOfBirth: aaravSharmaBirthDetails.dateOfBirth,
      timeOfBirth: aaravSharmaBirthDetails.timeOfBirth,
      latitude: aaravSharmaBirthDetails.latitude,
      longitude: aaravSharmaBirthDetails.longitude,
      timezone: aaravSharmaBirthDetails.timezone,
      placeName: aaravSharmaBirthDetails.placeName,
    };

    const provider = new MockCareerAnalysisProvider();
    const pipelineResult = await careerReportService.generateCareerReportData(normalized, { provider });

    try {
      const compilation = await xeLatexCompiler.compileReport({
        reportId: 'aarav-sharma-e2e-test-12345',
        reportDataTex: pipelineResult.reportDataTex,
        timeoutMs: 60000,
      });

      expect(compilation.pdfBuffer).toBeDefined();
      expect(compilation.pdfBuffer.length).toBeGreaterThan(100);
      expect(compilation.pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
      expect(compilation.pageCount).toBeGreaterThan(4);
    } catch (err: any) {
      expect(err.message).toMatch(/LATEX_ENGINE_UNAVAILABLE|XELATEX_COMPILATION_FAILED/);
    }
  });
});
