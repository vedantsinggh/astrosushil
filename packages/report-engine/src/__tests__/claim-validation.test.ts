import { describe, it, expect } from 'vitest';
import { normalizeAstroChart } from '@astro/astrology-engine';
import { mapNormalizedChartToCareerReportData } from '../mappers/career-report.mapper';
import { claimValidationEngine } from '../validation/claim-validation.engine';
import { duplicationDetector } from '../validation/duplication-detector';

describe('ClaimValidationEngine & DuplicationDetector Test Suite', () => {
  const sampleChart: any = {
    ascendant: { sign: 'Aries', degree: 15.42, nakshatra: 'Bharani', pada: 1 },
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

  it('1. Should validate claims on correctly generated CareerReportData with VERIFIED status', () => {
    const normalized = normalizeAstroChart(sampleChart);
    const reportData = mapNormalizedChartToCareerReportData(normalized, undefined, {
      clientName: 'Aarav Sharma',
      dateOfBirth: '1995-10-15',
      timeOfBirth: '14:30:00',
    });

    const result = claimValidationEngine.validateReportClaims(reportData, normalized);

    expect(result.isValid).toBe(true);
    expect(result.status).toBe('VERIFIED');
    expect(result.statusLabel).toBe('VERIFIED');
    expect(result.issues.filter((i) => i.severity === 'ERROR').length).toBe(0);
    expect(result.passedChecks).toBe(result.totalChecks);
  });

  it('2. Should detect Ashtakavarga claim contradiction if SAV house claim is corrupted', () => {
    const normalized = normalizeAstroChart(sampleChart);
    const reportData = mapNormalizedChartToCareerReportData(normalized);

    // Corrupt SAV text intentionally to simulate false claim:
    // set 10th house bindus = 24 (below benchmark), but claim it exceeds benchmark
    reportData.ashtakavarga.savHouses[10] = 24;
    reportData.ashtakavarga.savAnalysis = 'The 10th house (24 bindus) exceeds the benchmark of 28 bindus.';

    const result = claimValidationEngine.validateReportClaims(reportData, normalized);

    expect(result.isValid).toBe(false);
    expect(result.statusLabel).toBe('NOT VERIFIED');
    const savIssue = result.issues.find((i) => i.field === 'ashtakavarga.savAnalysis.h10');
    expect(savIssue).toBeDefined();
    expect(savIssue?.severity).toBe('ERROR');
  });

  it('3. Should detect forbidden placeholder strings', () => {
    const normalized = normalizeAstroChart(sampleChart);
    const reportData = mapNormalizedChartToCareerReportData(normalized);

    // Corrupt with forbidden placeholder
    reportData.d10Dashamsha.ascendantLord = 'D10 Ascendant Lord: D10 Ascendant Lord';

    const result = claimValidationEngine.validateReportClaims(reportData, normalized);

    expect(result.isValid).toBe(false);
    const placeholderIssue = result.issues.find((i) => i.field === 'd10.ascendantLord');
    expect(placeholderIssue).toBeDefined();
  });

  it('4. DuplicationDetector should detect repeated substantive paragraphs across sections', () => {
    const sections = [
      {
        name: 'House 1',
        content: 'This is a substantive custom paragraph analyzing executive leadership and strategic governance across multiple enterprise domains.',
      },
      {
        name: 'House 2',
        content: 'This is a substantive custom paragraph analyzing executive leadership and strategic governance across multiple enterprise domains.',
      },
      {
        name: 'House 3',
        content: 'This is a completely distinct paragraph discussing tactical execution and short-cycle communication milestones.',
      },
    ];

    const dupResult = duplicationDetector.detectDuplicates(sections, 0);

    expect(dupResult.duplicateCount).toBe(1);
    expect(dupResult.duplicateSnippets[0].occurrences).toBe(2);
    expect(dupResult.duplicateSnippets[0].locations).toEqual(['House 1', 'House 2']);
  });
});
