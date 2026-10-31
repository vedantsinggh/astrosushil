import { describe, it, expect } from 'vitest';
import { normalizeAstroChart, AstroChart } from '@astro/astrology-engine';
import { mapNormalizedChartToCareerReportData } from '../mappers/career-report.mapper';
import { generateReportDataTex } from '../generators/report-data-tex.generator';
import { claimValidationEngine } from '../validation/claim-validation.engine';
import { pdfQaValidator } from '../validation/pdf-qa.validator';

describe('Multi-Chart Profile Quality & Edge-Case Robustness Suite', () => {
  it('1. Should validate and process Dense Chart with 4-planet Stellium in 10th House', () => {
    const denseChart: any = {
      ascendant: { sign: 'Leo', degree: 12.3, nakshatra: 'Magha', pada: 4 },
      planets: [
        { name: 'Sun', sign: 'Taurus', degree: 5.0, house: 10, nakshatra: 'Krittika', pada: 3, retrograde: false },
        { name: 'Mercury', sign: 'Taurus', degree: 8.2, house: 10, nakshatra: 'Krittika', pada: 4, retrograde: false },
        { name: 'Venus', sign: 'Taurus', degree: 14.5, house: 10, nakshatra: 'Rohini', pada: 2, retrograde: false },
        { name: 'Jupiter', sign: 'Taurus', degree: 22.1, house: 10, nakshatra: 'Rohini', pada: 4, retrograde: false },
        { name: 'Moon', sign: 'Cancer', degree: 18.0, house: 12, nakshatra: 'Ashlesha', pada: 1, retrograde: false },
        { name: 'Mars', sign: 'Aries', degree: 28.5, house: 9, nakshatra: 'Krittika', pada: 1, retrograde: false },
        { name: 'Saturn', sign: 'Aquarius', degree: 11.2, house: 7, nakshatra: 'Shatabhisha', pada: 2, retrograde: true },
        { name: 'Rahu', sign: 'Pisces', degree: 4.0, house: 8, nakshatra: 'Uttara Bhadrapada', pada: 1, retrograde: true },
        { name: 'Ketu', sign: 'Virgo', degree: 4.0, house: 2, nakshatra: 'Uttara Phalguni', pada: 3, retrograde: true },
      ],
      houses: Array.from({ length: 12 }, (_, i) => ({
        houseNumber: i + 1,
        sign: ['Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer'][i],
        degree: 12.3,
      })),
    };

    const normalized = normalizeAstroChart(denseChart);
    const reportData = mapNormalizedChartToCareerReportData(normalized, undefined, {
      clientName: 'Priya Patel',
      dateOfBirth: '1988-05-20',
      timeOfBirth: '11:15:00',
      birthPlace: 'Mumbai, India',
    });

    const claimResult = claimValidationEngine.validateReportClaims(reportData, normalized);
    expect(claimResult.isValid).toBe(true);
    expect(claimResult.status).toBe('VERIFIED');

    const tex = generateReportDataTex(reportData);
    expect(tex).toContain('\\newcommand{\\ClientName}{\\RenderVerified{Priya Patel}}');
    expect(tex).toContain('Taurus');
  });

  it('2. Should validate Chart with 4 Retrograde Planets without contradictory status claims', () => {
    const retroChart: any = {
      ascendant: { sign: 'Scorpio', degree: 24.1, nakshatra: 'Jyeshtha', pada: 3 },
      planets: [
        { name: 'Sun', sign: 'Scorpio', degree: 10.0, house: 1, nakshatra: 'Anuradha', pada: 3, retrograde: false },
        { name: 'Moon', sign: 'Taurus', degree: 14.2, house: 7, nakshatra: 'Rohini', pada: 2, retrograde: false },
        { name: 'Mars', sign: 'Capricorn', degree: 28.0, house: 3, nakshatra: 'Dhanishta', pada: 2, retrograde: false },
        { name: 'Mercury', sign: 'Scorpio', degree: 18.5, house: 1, nakshatra: 'Jyeshtha', pada: 1, retrograde: true },
        { name: 'Jupiter', sign: 'Pisces', degree: 9.2, house: 5, nakshatra: 'Uttara Bhadrapada', pada: 2, retrograde: true },
        { name: 'Venus', sign: 'Libra', degree: 12.0, house: 12, nakshatra: 'Swati', pada: 2, retrograde: true },
        { name: 'Saturn', sign: 'Aquarius', degree: 15.0, house: 4, nakshatra: 'Shatabhisha', pada: 3, retrograde: true },
        { name: 'Rahu', sign: 'Aries', degree: 20.0, house: 6, nakshatra: 'Bharani', pada: 3, retrograde: true },
        { name: 'Ketu', sign: 'Libra', degree: 20.0, house: 12, nakshatra: 'Vishakha', pada: 1, retrograde: true },
      ],
      houses: Array.from({ length: 12 }, (_, i) => ({
        houseNumber: i + 1,
        sign: ['Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra'][i],
        degree: 24.1,
      })),
    };

    const normalized = normalizeAstroChart(retroChart);
    const reportData = mapNormalizedChartToCareerReportData(normalized, undefined, {
      clientName: 'Devendra Rao',
      dateOfBirth: '1984-11-28',
      timeOfBirth: '06:45:00',
      birthPlace: 'Bengaluru, India',
    });

    const claimResult = claimValidationEngine.validateReportClaims(reportData, normalized);
    expect(claimResult.isValid).toBe(true);
    expect(reportData.planets.mercury.retrograde).toContain('Yes');
    expect(reportData.planets.jupiter.retrograde).toContain('Yes');
    expect(reportData.planets.venus.retrograde).toContain('Yes');
    expect(reportData.planets.saturn.retrograde).toContain('Yes');
  });

  it('3. Should validate International / Southern Hemisphere Birth Coordinates', () => {
    const sydneyChart: any = {
      ascendant: { sign: 'Capricorn', degree: 18.5, nakshatra: 'Shravana', pada: 3 },
      planets: [
        { name: 'Sun', sign: 'Aquarius', degree: 2.0, house: 2, nakshatra: 'Dhanishta', pada: 3, retrograde: false },
        { name: 'Moon', sign: 'Virgo', degree: 25.0, house: 9, nakshatra: 'Chitra', pada: 1, retrograde: false },
        { name: 'Mars', sign: 'Sagittarius', degree: 12.0, house: 12, nakshatra: 'Mula', pada: 4, retrograde: false },
        { name: 'Mercury', sign: 'Capricorn', degree: 22.0, house: 1, nakshatra: 'Shravana', pada: 4, retrograde: false },
        { name: 'Jupiter', sign: 'Taurus', degree: 5.0, house: 5, nakshatra: 'Krittika', pada: 3, retrograde: false },
        { name: 'Venus', sign: 'Pisces', degree: 27.0, house: 3, nakshatra: 'Revati', pada: 4, retrograde: false },
        { name: 'Saturn', sign: 'Libra', degree: 19.0, house: 10, nakshatra: 'Swati', pada: 4, retrograde: false },
        { name: 'Rahu', sign: 'Gemini', degree: 11.0, house: 6, nakshatra: 'Ardra', pada: 2, retrograde: true },
        { name: 'Ketu', sign: 'Sagittarius', degree: 11.0, house: 12, nakshatra: 'Mula', pada: 4, retrograde: true },
      ],
      houses: Array.from({ length: 12 }, (_, i) => ({
        houseNumber: i + 1,
        sign: ['Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius'][i],
        degree: 18.5,
      })),
    };

    const normalized = normalizeAstroChart(sydneyChart);
    const reportData = mapNormalizedChartToCareerReportData(normalized, undefined, {
      clientName: 'Alexander Hayes',
      dateOfBirth: '1982-02-14',
      timeOfBirth: '05:30:00',
      birthPlace: 'Sydney, Australia',
      latitude: -33.8688,
      longitude: 151.2093,
      timeZone: 'Australia/Sydney',
    });

    const claimResult = claimValidationEngine.validateReportClaims(reportData, normalized);
    expect(claimResult.isValid).toBe(true);
    expect(reportData.client.latitude).toContain('33.8688° S');
    expect(reportData.client.longitude).toContain('151.2093° E');
    expect(reportData.client.birthDataScopeNote).toContain('centroid');
  });
});
