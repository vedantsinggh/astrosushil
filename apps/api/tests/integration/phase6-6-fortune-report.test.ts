import { describe, it, expect } from 'vitest';
import {
  generateFortuneReport,
  generateFortuneReportData,
  calculateChaldeanNameNumber,
  calculateSoulUrgeNumber,
  calculatePersonalityNumber,
  calculateKuaNumber,
  buildLoShuGrid,
  evaluateLoShuPlanes,
  calculatePersonalYearAndMonths,
  calculateLifeChallenges,
  reduceToSingleDigit,
  FORTUNE_DISCLAIMER,
  FORTUNE_CLOSING_AUTHOR,
} from '../../../../packages/report-engine/src/generators/fortune-report.generator';
import {
  ReportType,
  FortuneReportModel,
} from '../../../../packages/report-engine/src/types/report.types';
import { reportPdfService } from '../../../../packages/report-engine/src/pdf/report-pdf.service';
import { COMMERCE_CATALOG } from '../../src/modules/commerce/commerce.catalog';
import { REPORT_PRICES_PAISE, paymentService } from '../../src/services/payment.service';
import { featureAccessService } from '../../src/services/feature-access.service';
import { CareerReportWorker } from '../../src/services/report-worker.service';

describe('Phase 6.6: Personalised Fortune Report Implementation Suite', () => {
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

  // Canonical chart data for Puneet Kumar matching reference PDFs
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

  // ---------------------------------------------------------------------------
  // 1. INPUT VALIDATION TESTS
  // ---------------------------------------------------------------------------
  describe('Input Validation', () => {
    it('should successfully validate canonical profile input', async () => {
      const report = await generateFortuneReport(puneetProfile, puneetChartData);
      expect(report).toBeDefined();
      expect(report.type).toBe(ReportType.FORTUNE);
      expect(report.profile.name).toBe('Puneet Kumar');
    });

    it('should reject missing birth name', async () => {
      await expect(
        generateFortuneReport({ ...puneetProfile, name: '' }, puneetChartData)
      ).rejects.toThrow(/Name is required/);
    });

    it('should reject missing or malformed birth date', async () => {
      await expect(
        generateFortuneReport({ ...puneetProfile, dateOfBirth: '28-12-1983' }, puneetChartData)
      ).rejects.toThrow(/date of birth/i);
    });

    it('should reject missing or malformed birth time', async () => {
      await expect(
        generateFortuneReport({ ...puneetProfile, timeOfBirth: 'invalid' }, puneetChartData)
      ).rejects.toThrow(/time of birth/i);
    });

    it('should reject invalid timezone identifier', async () => {
      await expect(
        generateFortuneReport({ ...puneetProfile, timezone: 'Invalid/City' }, puneetChartData)
      ).rejects.toThrow(/Invalid IANA timezone/);
    });

    it('should reject out-of-range coordinates', async () => {
      await expect(
        generateFortuneReport({ ...puneetProfile, latitude: 120.0 }, puneetChartData)
      ).rejects.toThrow(/Latitude must be between -90 and 90/);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. DETERMINISTIC ASTROLOGICAL & NUMEROLOGICAL CALCULATIONS
  // ---------------------------------------------------------------------------
  describe('Deterministic Numerological & Astrological Calculations', () => {
    it('should compute exact Mulank 1 and Bhagyank 7 matching reference', async () => {
      const report = await generateFortuneReport(puneetProfile, puneetChartData);
      expect(report.luckyProfile.mulank).toBe(1);
      expect(report.luckyProfile.mulankLord).toBe('Sun');
      expect(report.luckyProfile.bhagyank).toBe(7);
      expect(report.luckyProfile.bhagyankLord).toBe('Ketu');
    });

    it('should compute exact Kua Number 8 (Earth Element, West Group) for 1983 Male', async () => {
      const kua = calculateKuaNumber(1983, 'MALE');
      expect(kua).toBe(8);

      const report = await generateFortuneReport(puneetProfile, puneetChartData);
      expect(report.kuaAndDirection.kuaNumber).toBe(8);
      expect(report.kuaAndDirection.element).toContain('Earth');
      expect(report.kuaAndDirection.group).toContain('West Group');
      expect(report.kuaAndDirection.favourableDirections.wealthShengChi).toContain('Southwest');
      expect(report.kuaAndDirection.favourableDirections.healthTienYi).toContain('Northwest');
      expect(report.kuaAndDirection.favourableDirections.romanceNienYen).toContain('West');
      expect(report.kuaAndDirection.favourableDirections.growthFuWei).toContain('Northeast');
    });

    it('should compute exact Chaldean Name Number 3, Soul Urge 5, and Personality 7 for Puneet Kumar matching reference', () => {
      // P(8) + U(6) + N(5) + E(5) + E(5) + T(4) = 33 -> 6
      // K(2) + U(6) + M(4) + A(1) + R(2) = 15 -> 6
      // 6 + 6 = 12 -> 3 (Jupiter)
      const nameNum = calculateChaldeanNameNumber('Puneet Kumar');
      expect(nameNum).toBe(3);

      // Vowels: U(6) + E(5) + E(5) + U(6) + A(1) = 23 -> 5 (Mercury)
      const soulUrge = calculateSoulUrgeNumber('Puneet Kumar');
      expect(soulUrge).toBe(5);

      // Consonants: P(8) + N(5) + T(4) + K(2) + M(4) + R(2) = 25 -> 7 (Ketu)
      const personality = calculatePersonalityNumber('Puneet Kumar');
      expect(personality).toBe(7);
    });

    it('should build exact Lo-Shu grid counts matching reference Page 26-28 (DOB + Mulank + Bhagyank only)', async () => {
      // Puneet Kumar: 28/12/1983, Mulank 1, Bhagyank 7
      // DOB digits: 2, 8, 1, 2, 1, 9, 8, 3
      // Plus Mulank 1 -> count of 1 = 3
      // Plus Bhagyank 7 -> count of 7 = 1
      // Kua (8) is a separate spatial system and is NOT added to the grid -> count of 8 = 2
      const { matrix, counts } = buildLoShuGrid('1983-12-28', 1, 7);

      expect(counts[1]).toBe(3); // three 1s (12, 1983, + Mulank 1)
      expect(counts[2]).toBe(2); // two 2s (28, 12)
      expect(counts[3]).toBe(1); // one 3 (1983)
      expect(counts[4] || 0).toBe(0); // missing 4
      expect(counts[5] || 0).toBe(0); // missing 5
      expect(counts[6] || 0).toBe(0); // missing 6
      expect(counts[7]).toBe(1); // one 7 (Bhagyank 7)
      expect(counts[8]).toBe(2); // two 8s (28, 1983)
      expect(counts[9]).toBe(1); // one 9 (1983)

      // Matrix structure: Row 1 = [4, 9, 2], Row 2 = [3, 5, 7], Row 3 = [8, 1, 6] (0 indicates missing)
      expect(matrix[0]).toEqual([0, 9, 2]);
      expect(matrix[1]).toEqual([3, 0, 7]);
      expect(matrix[2]).toEqual([8, 1, 0]);

      // Missing numbers remedies
      const { arrowsOfStrength, arrowsOfWeakness } = evaluateLoShuPlanes(counts);
      expect(arrowsOfWeakness.some((w) => w.missingNumbers.includes(4))).toBe(true);

      const report = await generateFortuneReport(puneetProfile, puneetChartData);
      expect(report.fortuneGrid.missingNumberRemedies.map((r) => r.number)).toEqual([4, 5, 6]);
      expect(report.fortuneGrid.numberOccurrences[8]).toBe(2);
      expect(report.fortuneGrid.numberOccurrences[1]).toBe(3);
    });

    it('should compute exact Personal Year 5 for calendar year 2026 and 12 personal months', () => {
      // 28/12 -> 2+8 + 1+2 = 13 -> 4
      // 2026 -> 2+0+2+6 = 10 -> 1
      // 4 + 1 = 5
      const { currentYear, personalYear, personalYearTheme, personalMonths } = calculatePersonalYearAndMonths('1983-12-28', 2026);
      expect(currentYear).toBe(2026);
      expect(personalYear).toBe(5);
      expect(personalYearTheme).toContain('Dynamic Change');
      expect(personalMonths).toHaveLength(12);
      expect(personalMonths[0].monthName).toBe('January');
      expect(personalMonths[11].monthName).toBe('December');
    });

    it('should compute exact 4 Life Challenge Cycles using absolute differences (2, 2, 0, 0)', () => {
      // Day = 28 -> 1
      // Month = 12 -> 3
      // Year = 1983 -> 21 -> 3
      // Challenge 1 = |Day - Month| = |1 - 3| = 2
      // Challenge 2 = |Day - Year| = |1 - 3| = 2
      // Challenge 3 = |C1 - C2| = |2 - 2| = 0
      // Challenge 4 = |Month - Year| = |3 - 3| = 0
      const { challengeCycles } = calculateLifeChallenges('1983-12-28');
      expect(challengeCycles).toHaveLength(4);

      // Cycle 1: Age 0–29, Number 2
      expect(challengeCycles[0].cycle).toBe(1);
      expect(challengeCycles[0].ageRange).toContain('29');
      expect(challengeCycles[0].challengeNumber).toBe(2);

      // Cycle 2: Age 29–38, Number 2
      expect(challengeCycles[1].cycle).toBe(2);
      expect(challengeCycles[1].ageRange).toContain('38');
      expect(challengeCycles[1].challengeNumber).toBe(2);

      // Cycle 3: Age 38–47, Number 0
      expect(challengeCycles[2].cycle).toBe(3);
      expect(challengeCycles[2].ageRange).toContain('47');
      expect(challengeCycles[2].challengeNumber).toBe(0);

      // Cycle 4: Age 47+, Number 0
      expect(challengeCycles[3].cycle).toBe(4);
      expect(challengeCycles[3].challengeNumber).toBe(0);
    });

    it('should identify Darakaraka Jupiter and marriage timing windows in cosmic pathway', async () => {
      const report = await generateFortuneReport(puneetProfile, puneetChartData);
      expect(report.astrologyAnalysis.marriageAndSpouse.darakarakaPlanet).toBe('Jupiter');
      expect(report.astrologyAnalysis.marriageAndSpouse.timingWindows.length).toBeGreaterThanOrEqual(1);
      expect(report.astrologyAnalysis.manglikDosh.hasManglik).toBe(true);
      expect(report.astrologyAnalysis.manglikDosh.doshType).toBe('ANSHIK');
      expect(report.astrologyAnalysis.sadeSati.isUnderSadeSati).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. INDEPENDENT FIXTURES & EDGE CASES
  // ---------------------------------------------------------------------------
  describe('Independent Fixtures & Edge Cases', () => {
    it('should correctly compute Kua numbers across diverse birth years and genders', () => {
      // 1983 Male: 8+3=11 -> 2; 10 - 2 = 8
      expect(calculateKuaNumber(1983, 'MALE')).toBe(8);

      // 1983 Female: 8+3=11 -> 2; 5 + 2 = 7
      expect(calculateKuaNumber(1983, 'FEMALE')).toBe(7);

      // 1986 Male: 8+6=14 -> 5; 10 - 5 = 5 -> Kua 5 becomes 2 (Kun / Earth)
      expect(calculateKuaNumber(1986, 'MALE')).toBe(2);

      // 1981 Female: 8+1=9; 5 + 9 = 14 -> 5 -> Kua 5 becomes 8 (Gen / Earth)
      expect(calculateKuaNumber(1981, 'FEMALE')).toBe(8);

      // 2005 Male (Post-2000): 0+5=5; 9 - 5 = 4
      expect(calculateKuaNumber(2005, 'MALE')).toBe(4);

      // 2005 Female (Post-2000): 0+5=5; 6 + 5 = 11 -> 2
      expect(calculateKuaNumber(2005, 'FEMALE')).toBe(2);

      // 2000 Male: 0+0=0; 9 - 0 = 9
      expect(calculateKuaNumber(2000, 'MALE')).toBe(9);

      // 2000 Female: 0+0=0; 6 + 0 = 6
      expect(calculateKuaNumber(2000, 'FEMALE')).toBe(6);
    });

    it('should correctly compute Chaldean name numbers across diverse names', () => {
      expect(calculateChaldeanNameNumber('A')).toBe(1);
      expect(calculateChaldeanNameNumber('B')).toBe(2);
      expect(calculateChaldeanNameNumber('Sushil Kumar Singh')).toBeGreaterThan(0);
    });

    it('should correctly reduce double digit numbers to single digit 1-9', () => {
      expect(reduceToSingleDigit(28)).toBe(1); // 2+8=10 -> 1
      expect(reduceToSingleDigit(1983)).toBe(3); // 1+9+8+3=21 -> 3
      expect(reduceToSingleDigit(43)).toBe(7); // 4+3=7
      expect(reduceToSingleDigit(99)).toBe(9); // 9+9=18 -> 9
    });

    it('should verify independent expected-value fixtures for Lo-Shu grid (DOB + Mulank + Bhagyank only)', () => {
      // Fixture: 1990-05-15
      // Day 15 -> Mulank 6
      // Full date: 1+5+0+5+1+9+9+0 = 30 -> Bhagyank 3
      // Digits in 1990-05-15: 1 (x2), 5 (x2), 9 (x2)
      // + Mulank 6 (x1)
      // + Bhagyank 3 (x1)
      const { counts, matrix } = buildLoShuGrid('1990-05-15', 6, 3);
      expect(counts[1]).toBe(2);
      expect(counts[2]).toBe(0);
      expect(counts[3]).toBe(1);
      expect(counts[4]).toBe(0);
      expect(counts[5]).toBe(2);
      expect(counts[6]).toBe(1);
      expect(counts[7]).toBe(0);
      expect(counts[8]).toBe(0);
      expect(counts[9]).toBe(2);

      // Matrix: Row 0 = [0, 9, 0], Row 1 = [3, 5, 0], Row 2 = [0, 1, 6]
      expect(matrix[0]).toEqual([0, 9, 0]);
      expect(matrix[1]).toEqual([3, 5, 0]);
      expect(matrix[2]).toEqual([0, 1, 6]);
    });

    it('should verify independent expected-value fixtures for Life Challenges (absolute differences)', () => {
      // Fixture: 1995-07-21
      // Day: 21 -> 3
      // Month: 7 -> 7
      // Year: 1995 -> 24 -> 6
      // Bhagyank: 3 + 7 + 6 = 16 -> 7 (Cycle 1 ends at 36 - 7 = 29)
      // C1 = |3 - 7| = 4
      // C2 = |3 - 6| = 3
      // C3 = |4 - 3| = 1
      // C4 = |7 - 6| = 1
      const { challengeCycles } = calculateLifeChallenges('1995-07-21');
      expect(challengeCycles[0].challengeNumber).toBe(4);
      expect(challengeCycles[1].challengeNumber).toBe(3);
      expect(challengeCycles[2].challengeNumber).toBe(1);
      expect(challengeCycles[3].challengeNumber).toBe(1);

      expect(challengeCycles[0].ageRange).toBe('Age 0 to 29 Years');
      expect(challengeCycles[1].ageRange).toBe('Age 29 to 38 Years');
      expect(challengeCycles[2].ageRange).toBe('Age 38 to 47 Years');
      expect(challengeCycles[3].ageRange).toBe('Age 47 Years and Beyond');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. VECTOR PDF GENERATION (27 CANONICAL PAGES)
  // ---------------------------------------------------------------------------
  describe('Vector PDF Generation', () => {
    it('should generate a rich, exactly 27-page vector PDF for the Personalised Fortune Report', async () => {
      const report = await generateFortuneReport(puneetProfile, puneetChartData);
      const pdfBuffer = await reportPdfService.generateReportPdf(report);

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(10000);
      expect(pdfBuffer.toString('latin1', 0, 5)).toBe('%PDF-');

      // Verify page count in PDF stream (27 canonical pages)
      const pdfContent = pdfBuffer.toString('latin1');
      const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g);
      expect(pageMatches).toBeDefined();
      expect(pageMatches?.length).toBe(27);

      // Verify header and footer tokens
      expect(pdfContent).toContain('ASTRO SUSHIL');
      expect(pdfContent).toContain('PERSONALISED FORTUNE REPORT PLUS');
      expect(pdfContent).toContain('Page 1 of 27');
      expect(pdfContent).toContain('Page 27 of 27');

      // Verify corrected Bhagyank reduction equation (2023 -> 7, not 43 -> 7)
      expect(pdfContent).toContain('28 + 12 + 1983 = 2023 -> 2 + 0 + 2 + 3 = 7');
      expect(pdfContent).not.toContain('43 -> 7');

      // Verify medical disclaimer presence
      expect(pdfContent).toContain('IMPORTANT WELLNESS & MEDICAL DISCLAIMER');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. COMMERCIAL CATALOGUE, PRICING & FULFILLMENT VERIFICATION
  // ---------------------------------------------------------------------------
  describe('Commercial Catalogue, Pricing & Fulfillment Verification', () => {
    it('should map commercial SKU report-fortune to ReportType.FORTUNE with authoritative price ₹499', () => {
      const fortuneSku = COMMERCE_CATALOG['report-fortune'];
      expect(fortuneSku).toBeDefined();
      expect(fortuneSku.legacyReportType).toBe(ReportType.FORTUNE);
      expect(fortuneSku.pricePaise).toBe(49900); // ₹499
      expect(fortuneSku.currency).toBe('INR');
      expect(fortuneSku.taxIncluded).toBe(true);
      expect(fortuneSku.isActive).toBe(true);
    });

    it('should preserve authorized catalogue prices across the entire platform catalog', () => {
      expect(COMMERCE_CATALOG['report-kundli'].pricePaise).toBe(29900); // ₹299
      expect(COMMERCE_CATALOG['report-planetary-summary'].pricePaise).toBe(19900); // ₹199
      expect(COMMERCE_CATALOG['report-career'].pricePaise).toBe(49900); // ₹499
      expect(COMMERCE_CATALOG['report-career-pro'].pricePaise).toBe(69900); // ₹699
      expect(COMMERCE_CATALOG['report-finance'].pricePaise).toBe(49900); // ₹499
      expect(COMMERCE_CATALOG['report-love'].pricePaise).toBe(49900); // ₹499
      expect(COMMERCE_CATALOG['report-fortune'].pricePaise).toBe(49900); // ₹499
      expect(REPORT_PRICES_PAISE[ReportType.FORTUNE]).toBe(49900);
    });

    it('should configure feature access and worker routing for ReportType.FORTUNE', () => {
      const catalog = featureAccessService.getCatalog();
      const fortuneFeature = catalog.find((f) => f.code === 'FORTUNE_REPORT' || f.code === 'FORTUNE');
      expect(fortuneFeature).toBeDefined();
      expect(fortuneFeature?.isFree).toBe(false);

      expect(CareerReportWorker.SUPPORTED_REPORT_TYPES).toContain('FORTUNE');
    });
  });
});
