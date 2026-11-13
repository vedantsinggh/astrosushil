import { describe, it, expect } from 'vitest';
import {
  calculateSuccessNumber,
  calculateConnectionNumber,
  calculateMaturityNumber,
  calculateLifePinnacles,
  calculateLalKitabPlacements,
  generateFortunePlusReport,
  generateFortunePlusReportData,
  THREE_REMEDY_CAUTION_RULE,
} from '../generators/fortune-plus-report.generator';
import {
  ReportType,
  FortunePlusReportModel,
} from '../types/report.types';
import { reportPdfService } from '../pdf/report-pdf.service';

describe('Phase 6.11: Personalised Fortune Plus Deterministic Calculations Suite', () => {
  const puneetProfile = {
    name: 'Puneet Kumar',
    dateOfBirth: '1983-12-28',
    timeOfBirth: '04:45',
    placeName: 'Bulandshahr, Uttar Pradesh, India',
    timezone: 'Asia/Kolkata',
    latitude: 28.4069,
    longitude: 77.8498,
    gender: 'MALE',
  };

  const puneetChartData = {
    ascendant: {
      sign: 'Scorpio',
      degree: 9.24,
      nakshatra: 'Anuradha',
      pada: 2,
    },
    planets: [
      { planet: 'SUN', sign: 'Sagittarius', degree: 12.15, house: 2, nakshatra: 'Mula', pada: 4, isRetrograde: false },
      { planet: 'MOON', sign: 'Virgo', degree: 27.8, house: 11, nakshatra: 'Chitra', pada: 2, isRetrograde: false },
      { planet: 'MARS', sign: 'Virgo', degree: 28.45, house: 11, nakshatra: 'Chitra', pada: 2, isRetrograde: false },
      { planet: 'MERCURY', sign: 'Sagittarius', degree: 19.7, house: 2, nakshatra: 'Purva Ashadha', pada: 2, isRetrograde: false },
      { planet: 'JUPITER', sign: 'Sagittarius', degree: 1.38, house: 2, nakshatra: 'Mula', pada: 1, isRetrograde: false },
      { planet: 'VENUS', sign: 'Scorpio', degree: 1.44, house: 1, nakshatra: 'Vishakha', pada: 4, isRetrograde: false },
      { planet: 'SATURN', sign: 'Libra', degree: 19.37, house: 12, nakshatra: 'Svati', pada: 4, isRetrograde: false },
      { planet: 'RAHU', sign: 'Taurus', degree: 21.05, house: 7, nakshatra: 'Rohini', pada: 4, isRetrograde: true },
      { planet: 'KETU', sign: 'Scorpio', degree: 21.05, house: 1, nakshatra: 'Jyeshtha', pada: 2, isRetrograde: true },
    ],
    houses: [
      { houseNumber: 1, sign: 'Scorpio', planetsPresent: ['VENUS', 'KETU'] },
      { houseNumber: 2, sign: 'Sagittarius', planetsPresent: ['SUN', 'MERCURY', 'JUPITER'] },
      { houseNumber: 3, sign: 'Capricorn', planetsPresent: [] },
      { houseNumber: 4, sign: 'Aquarius', planetsPresent: [] },
      { houseNumber: 5, sign: 'Pisces', planetsPresent: [] },
      { houseNumber: 6, sign: 'Aries', planetsPresent: [] },
      { houseNumber: 7, sign: 'Taurus', planetsPresent: ['RAHU'] },
      { houseNumber: 8, sign: 'Gemini', planetsPresent: [] },
      { houseNumber: 9, sign: 'Cancer', planetsPresent: [] },
      { houseNumber: 10, sign: 'Leo', planetsPresent: [] },
      { houseNumber: 11, sign: 'Virgo', planetsPresent: ['MOON', 'MARS'] },
      { houseNumber: 12, sign: 'Libra', planetsPresent: ['SATURN'] },
    ],
  };

  describe('1. Chapter 10 Deterministic Numerical Formulations', () => {
    it('should calculate Success Number accurately for canonical and independent fixtures', () => {
      // Canonical Puneet: 28 Dec -> Day 28 (10 -> 1) + Month 12 (3) = 4
      expect(calculateSuccessNumber('1983-12-28')).toBe(4);

      // Fixture 2: 1995-07-21 -> Day 21 (3) + Month 7 (7) = 10 -> 1
      expect(calculateSuccessNumber('1995-07-21')).toBe(1);

      // Fixture 3: 2000-01-09 -> Day 9 (9) + Month 1 (1) = 10 -> 1
      expect(calculateSuccessNumber('2000-01-09')).toBe(1);

      // Fixture 4: 1990-05-18 -> Day 18 (9) + Month 5 (5) = 14 -> 5
      expect(calculateSuccessNumber('1990-05-18')).toBe(5);

      // Fixture 5: 1988-11-29 -> Day 29 (11 -> 2) + Month 11 (2) = 4
      expect(calculateSuccessNumber('1988-11-29')).toBe(4);
    });

    it('should calculate Connection Number (|Bhagyank - Mulank|) accurately', () => {
      // Canonical Puneet: Bhagyank 7, Mulank 1 -> |7 - 1| = 6
      expect(calculateConnectionNumber('1983-12-28')).toBe(6);

      // Fixture 2: 1995-07-21 -> Day 21 (3), DOB sum: 21 + 7 + 1995 = 2023 -> 7. |7 - 3| = 4
      expect(calculateConnectionNumber('1995-07-21')).toBe(4);

      // Fixture 3: 1990-05-18 -> Day 18 (9), DOB sum: 18 + 5 + 1990 = 2013 -> 6. |6 - 9| = 3
      expect(calculateConnectionNumber('1990-05-18')).toBe(3);

      // Fixture 4: 1988-11-29 -> Day 29 (11 -> 2), DOB sum: 29 + 11 + 1988 = 2028 -> 12 -> 3. |3 - 2| = 1
      expect(calculateConnectionNumber('1988-11-29')).toBe(1);
    });

    it('should calculate Maturity Number accurately (Mulank + Name Number)', () => {
      // Canonical Puneet Kumar: Mulank 1 + Chaldean Name Number 3 = 4
      expect(calculateMaturityNumber('1983-12-28', 'Puneet Kumar')).toBe(4);

      // Independent Fixture 2: Amit Sharma (Chaldean 8) with Mulank 3 -> 3 + 8 = 11 -> 2
      expect(calculateMaturityNumber('1995-07-21', 'Amit Sharma')).toBe(2);

      // Independent Fixture 3: Rahul Verma (Chaldean 8) with Mulank 9 -> 9 + 8 = 17 -> 8
      expect(calculateMaturityNumber('1990-05-18', 'Rahul Verma')).toBe(8);
    });
  });

  describe('2. Chapter 9 Four Life Pinnacles / Challenge Cycles', () => {
    it('should calculate exact 4 Life Pinnacles matching reference PDF pages 63-66', () => {
      // Puneet: 1983-12-28
      // Day = 28 -> 1, Month = 12 -> 3, Year = 1983 -> 21 -> 3, Bhagyank = 7
      // Cycle 1: Month + Day = 3 + 1 = 4 (Age 0 to 36-7 = 29)
      // Cycle 2: Day + Year = 1 + 3 = 4 (Age 29 to 38)
      // Cycle 3: P1 + P2 = 4 + 4 = 8 (Age 38 to 47)
      // Cycle 4: Month + Year = 3 + 3 = 6 (Age 47 onwards)
      const pinnacles = calculateLifePinnacles('1983-12-28');
      expect(pinnacles).toHaveLength(4);

      expect(pinnacles[0].cycle).toBe(1);
      expect(pinnacles[0].ageRange).toBe('0-29');
      expect(pinnacles[0].pinnacleNumber).toBe(4);

      expect(pinnacles[1].cycle).toBe(2);
      expect(pinnacles[1].ageRange).toBe('29-38');
      expect(pinnacles[1].pinnacleNumber).toBe(4);

      expect(pinnacles[2].cycle).toBe(3);
      expect(pinnacles[2].ageRange).toBe('38-47');
      expect(pinnacles[2].pinnacleNumber).toBe(8);

      expect(pinnacles[3].cycle).toBe(4);
      expect(pinnacles[3].ageRange).toBe('from 47 onwards');
      expect(pinnacles[3].pinnacleNumber).toBe(6);
    });

    it('should calculate Life Pinnacles for independent test fixture 1995-07-21', () => {
      // 1995-07-21: Day 21 -> 3, Month 7 -> 7, Year 1995 -> 24 -> 6, Bhagyank = 7
      // End age 1 = 36 - 7 = 29
      // P1: Month + Day = 7 + 3 = 10 -> 1 (0-29)
      // P2: Day + Year = 3 + 6 = 9 (29-38)
      // P3: P1 + P2 = 1 + 9 = 10 -> 1 (38-47)
      // P4: Month + Year = 7 + 6 = 13 -> 4 (from 47 onwards)
      const pinnacles = calculateLifePinnacles('1995-07-21');
      expect(pinnacles[0].pinnacleNumber).toBe(1);
      expect(pinnacles[0].ageRange).toBe('0-29');
      expect(pinnacles[1].pinnacleNumber).toBe(9);
      expect(pinnacles[1].ageRange).toBe('29-38');
      expect(pinnacles[2].pinnacleNumber).toBe(1);
      expect(pinnacles[2].ageRange).toBe('38-47');
      expect(pinnacles[3].pinnacleNumber).toBe(4);
      expect(pinnacles[3].ageRange).toBe('from 47 onwards');
    });

    it('should calculate Life Pinnacles for independent test fixture 1988-11-29', () => {
      // 1988-11-29: Day 29 -> 11 -> 2, Month 11 -> 2, Year 1988 -> 26 -> 8
      // Bhagyank = 29 + 11 + 1988 = 2028 -> 12 -> 3
      // End age 1 = 36 - 3 = 33
      // P1: Month + Day = 2 + 2 = 4 (0-33)
      // P2: Day + Year = 2 + 8 = 10 -> 1 (33-42)
      // P3: P1 + P2 = 4 + 1 = 5 (42-51)
      // P4: Month + Year = 2 + 8 = 10 -> 1 (from 51 onwards)
      const pinnacles = calculateLifePinnacles('1988-11-29');
      expect(pinnacles[0].pinnacleNumber).toBe(4);
      expect(pinnacles[0].ageRange).toBe('0-33');
      expect(pinnacles[1].pinnacleNumber).toBe(1);
      expect(pinnacles[1].ageRange).toBe('33-42');
      expect(pinnacles[2].pinnacleNumber).toBe(5);
      expect(pinnacles[2].ageRange).toBe('42-51');
      expect(pinnacles[3].pinnacleNumber).toBe(1);
      expect(pinnacles[3].ageRange).toBe('from 51 onwards');
    });
  });

  describe('3. Chapter 13 Lal Kitab Chart Calculations', () => {
    it('should map natal planets into Lal Kitab chart fixing Aries as House 1', () => {
      const lalKitab = calculateLalKitabPlacements(puneetChartData.houses);
      expect(lalKitab).toHaveLength(12);

      // House 1 is always Aries in Lal Kitab, holding natal H1 planets (VENUS, KETU)
      expect(lalKitab[0].houseNumber).toBe(1);
      expect(lalKitab[0].sign).toBe('Aries');
      expect(lalKitab[0].planetsPresent).toEqual(['VENUS', 'KETU']);

      // House 2 is Taurus, holding natal H2 planets (SUN, MERCURY, JUPITER)
      expect(lalKitab[1].houseNumber).toBe(2);
      expect(lalKitab[1].sign).toBe('Taurus');
      expect(lalKitab[1].planetsPresent).toEqual(['SUN', 'MERCURY', 'JUPITER']);

      // House 7 is Libra, holding natal H7 planets (RAHU)
      expect(lalKitab[6].houseNumber).toBe(7);
      expect(lalKitab[6].sign).toBe('Libra');
      expect(lalKitab[6].planetsPresent).toEqual(['RAHU']);

      // House 11 is Aquarius, holding natal H11 planets (MOON, MARS)
      expect(lalKitab[10].houseNumber).toBe(11);
      expect(lalKitab[10].sign).toBe('Aquarius');
      expect(lalKitab[10].planetsPresent).toEqual(['MOON', 'MARS']);

      // House 12 is Pisces, holding natal H12 planets (SATURN)
      expect(lalKitab[11].houseNumber).toBe(12);
      expect(lalKitab[11].sign).toBe('Pisces');
      expect(lalKitab[11].planetsPresent).toEqual(['SATURN']);
    });
  });

  describe('4. Three-Remedy Caution Rule Verification', () => {
    it('should explicitly enforce the 3-remedy caution rule in recommendations', () => {
      expect(THREE_REMEDY_CAUTION_RULE).toContain('select and perform no more than three remedies at a time');
      expect(THREE_REMEDY_CAUTION_RULE).not.toContain('minimum three remedies');
    });
  });

  describe('5. Comprehensive Report Generation & Vector PDF Verification', () => {
    it('should generate complete Fortune Plus report with all 25 chapters and 35 canonical PDF pages', async () => {
      const report: FortunePlusReportModel = await generateFortunePlusReport(puneetProfile, puneetChartData);

      expect(report.type).toBe(ReportType.FORTUNE_PLUS);
      expect(report.title).toBe('Personalised Fortune Report Plus');
      expect(report.luckyProfile.mulank).toBe(1);
      expect(report.luckyProfile.bhagyank).toBe(7);
      expect(report.areYouOnRightPath.successNumber).toBe(4);
      expect(report.areYouOnRightPath.connectionNumber).toBe(6);
      expect(report.areYouOnRightPath.maturityNumber).toBe(4);
      expect(report.lifePinnacles).toHaveLength(4);
      expect(report.cosmicPathway.charts.lalKitab).toHaveLength(12);

      // Generate PDF
      const pdfBuffer = await reportPdfService.generateReportPdf(report);
      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(15000);
      expect(pdfBuffer.toString('latin1', 0, 5)).toBe('%PDF-');

      const pdfContent = pdfBuffer.toString('latin1');
      const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g);
      expect(pageMatches).toBeDefined();
      expect(pageMatches?.length).toBe(35);

      // Verify tokens
      expect(pdfContent).toContain('PERSONALISED FORTUNE REPORT PLUS');
      expect(pdfContent).toContain('SUCCESS NUMBER : 4');
      expect(pdfContent).toContain('CONNECTION NUMBER : 6');
      expect(pdfContent).toContain('MATURITY NUMBER : 4');
      expect(pdfContent).toContain('MANDATORY THREE-REMEDY CAUTION RULE');
      expect(pdfContent).toContain('A. JANMA KUNDLI \\(D1 LAGNA\\)');
      expect(pdfContent).toContain('D. LAL KITAB PLANETARY KUNDLI');
    });
  });
});
