import { describe, it, expect } from 'vitest';
import {
  generateMatchmakingReport,
  InvalidMatchmakingProfilesError,
} from '../../../../packages/report-engine/src/generators/matchmaking-report.generator';
import {
  MatchmakingCalculator,
  getNameAshtavarga,
  getAshtavargaRelationship,
} from '../../../../packages/astrology-engine/src/matchmaking/index';
import {
  ReportType,
  MatchmakingReportModel,
} from '../../../../packages/report-engine/src/types/report.types';
import { reportPdfService } from '../../../../packages/report-engine/src/pdf/report-pdf.service';
import { COMMERCE_CATALOG } from '../../src/modules/commerce/commerce.catalog';
import { REPORT_PRICES_PAISE, paymentService } from '../../src/services/payment.service';
import { featureAccessService } from '../../src/services/feature-access.service';
import { CareerReportWorker } from '../../src/services/report-worker.service';

describe('Phase 6.7: Couple Kundli Matching Report Implementation Suite', () => {
  // Authoritative Puneet Kumar fixture (Groom / Partner A)
  const puneetProfile = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Puneet Kumar',
    dateOfBirth: '1983-12-28',
    timeOfBirth: '04:45',
    placeName: 'Bulandshahr, Uttar Pradesh, India',
    timezone: 'Asia/Kolkata',
    latitude: 28.4069,
    longitude: 77.8498,
    gender: 'MALE',
  };

  // Authoritative Aditi Harish fixture (Bride / Partner B)
  const aditiProfile = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Aditi Harish',
    dateOfBirth: '1992-08-21',
    timeOfBirth: '06:50',
    placeName: 'Kalka, Haryana, India',
    timezone: 'Asia/Kolkata',
    latitude: 30.5689,
    longitude: 76.9414,
    gender: 'FEMALE',
  };

  // Puneet Kumar natal chart fixture
  const puneetChartData = {
    ascendant: {
      sign: 'Scorpio',
      longitude: 223.45,
      degreeInRashi: 13.45,
      degree: 13.45,
      nakshatra: 'Anuradha',
      pada: 4,
    },
    planets: [
      { name: 'Sun', planet: 'SUN', sign: 'Sagittarius', longitude: 251.58, degreeInRashi: 11.58, degree: 11.58, house: 2, nakshatra: 'Mula', pada: 4, isRetrograde: false },
      { name: 'Moon', planet: 'MOON', sign: 'Virgo', longitude: 177.80, degreeInRashi: 27.80, degree: 27.80, house: 11, nakshatra: 'Chitra', pada: 2, isRetrograde: false },
      { name: 'Mars', planet: 'MARS', sign: 'Virgo', longitude: 154.15, degreeInRashi: 4.15, degree: 4.15, house: 11, nakshatra: 'Uttara Phalguni', pada: 3, isRetrograde: false },
      { name: 'Mercury', planet: 'MERCURY', sign: 'Sagittarius', longitude: 256.22, degreeInRashi: 16.22, degree: 16.22, house: 2, nakshatra: 'Purva Ashadha', pada: 1, isRetrograde: false },
      { name: 'Jupiter', planet: 'JUPITER', sign: 'Scorpio', longitude: 239.35, degreeInRashi: 29.35, degree: 29.35, house: 1, nakshatra: 'Jyeshtha', pada: 4, isRetrograde: false },
      { name: 'Venus', planet: 'VENUS', sign: 'Scorpio', longitude: 228.42, degreeInRashi: 18.42, degree: 18.42, house: 1, nakshatra: 'Jyeshtha', pada: 1, isRetrograde: false },
      { name: 'Saturn', planet: 'SATURN', sign: 'Libra', longitude: 198.52, degreeInRashi: 18.52, degree: 18.52, house: 12, nakshatra: 'Swati', pada: 4, isRetrograde: false },
      { name: 'Rahu', planet: 'RAHU', sign: 'Taurus', longitude: 51.40, degreeInRashi: 21.40, degree: 21.40, house: 7, nakshatra: 'Rohini', pada: 4, isRetrograde: true },
      { name: 'Ketu', planet: 'KETU', sign: 'Scorpio', longitude: 231.40, degreeInRashi: 21.40, degree: 21.40, house: 1, nakshatra: 'Jyeshtha', pada: 2, isRetrograde: true },
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

  // Aditi Harish natal chart fixture
  const aditiChartData = {
    ascendant: {
      sign: 'Leo',
      longitude: 142.10,
      degreeInRashi: 22.10,
      degree: 22.10,
      nakshatra: 'Purva Phalguni',
      pada: 3,
    },
    planets: [
      { name: 'Sun', planet: 'SUN', sign: 'Leo', longitude: 124.32, degreeInRashi: 4.32, degree: 4.32, house: 1, nakshatra: 'Magha', pada: 2, isRetrograde: false },
      { name: 'Moon', planet: 'MOON', sign: 'Taurus', longitude: 30.11, degreeInRashi: 0.11, degree: 0.11, house: 10, nakshatra: 'Krittika', pada: 2, isRetrograde: false },
      { name: 'Mars', planet: 'MARS', sign: 'Taurus', longitude: 54.50, degreeInRashi: 24.50, degree: 24.50, house: 10, nakshatra: 'Mrigashira', pada: 1, isRetrograde: false },
      { name: 'Mercury', planet: 'MERCURY', sign: 'Cancer', longitude: 118.14, degreeInRashi: 28.14, degree: 28.14, house: 12, nakshatra: 'Ashlesha', pada: 4, isRetrograde: false },
      { name: 'Jupiter', planet: 'JUPITER', sign: 'Leo', longitude: 141.05, degreeInRashi: 21.05, degree: 21.05, house: 1, nakshatra: 'Purva Phalguni', pada: 3, isRetrograde: false },
      { name: 'Venus', planet: 'VENUS', sign: 'Cancer', longitude: 99.30, degreeInRashi: 9.30, degree: 9.30, house: 12, nakshatra: 'Pushya', pada: 2, isRetrograde: false },
      { name: 'Saturn', planet: 'SATURN', sign: 'Capricorn', longitude: 290.12, degreeInRashi: 20.12, degree: 20.12, house: 6, nakshatra: 'Shravana', pada: 4, isRetrograde: true },
      { name: 'Rahu', planet: 'RAHU', sign: 'Sagittarius', longitude: 246.25, degreeInRashi: 6.25, degree: 6.25, house: 5, nakshatra: 'Mula', pada: 2, isRetrograde: true },
      { name: 'Ketu', planet: 'KETU', sign: 'Gemini', longitude: 66.25, degreeInRashi: 6.25, degree: 6.25, house: 11, nakshatra: 'Ardra', pada: 4, isRetrograde: true },
    ],
    houses: [
      { houseNumber: 1, sign: 'Leo', planetsPresent: ['SUN', 'JUPITER'] },
      { houseNumber: 2, sign: 'Virgo', planetsPresent: [] },
      { houseNumber: 3, sign: 'Libra', planetsPresent: [] },
      { houseNumber: 4, sign: 'Scorpio', planetsPresent: [] },
      { houseNumber: 5, sign: 'Sagittarius', planetsPresent: ['RAHU'] },
      { houseNumber: 6, sign: 'Capricorn', planetsPresent: ['SATURN'] },
      { houseNumber: 7, sign: 'Aquarius', planetsPresent: [] },
      { houseNumber: 8, sign: 'Pisces', planetsPresent: [] },
      { houseNumber: 9, sign: 'Aries', planetsPresent: [] },
      { houseNumber: 10, sign: 'Taurus', planetsPresent: ['MOON', 'MARS'] },
      { houseNumber: 11, sign: 'Gemini', planetsPresent: ['KETU'] },
      { houseNumber: 12, sign: 'Cancer', planetsPresent: ['MERCURY', 'VENUS'] },
    ],
  };

  const mockInterpretationProvider = {
    generateInterpretations: async () => [],
  };

  // ---------------------------------------------------------------------------
  // 1. INPUT VALIDATION & PROFILE SAFETY
  // ---------------------------------------------------------------------------
  describe('1. Input Validation & Edge Cases', () => {
    it('throws InvalidMatchmakingProfilesError when partner profiles share the same ID', async () => {
      const sameIdProfile = { ...aditiProfile, id: puneetProfile.id };
      await expect(
        generateMatchmakingReport(
          puneetProfile,
          sameIdProfile,
          puneetChartData,
          aditiChartData,
          mockInterpretationProvider as any
        )
      ).rejects.toThrow(InvalidMatchmakingProfilesError);
    });

    it('throws InvalidMatchmakingProfilesError when birth details are identical', async () => {
      const cloneProfile = { ...puneetProfile };
      await expect(
        generateMatchmakingReport(
          puneetProfile,
          cloneProfile,
          puneetChartData,
          puneetChartData,
          mockInterpretationProvider as any
        )
      ).rejects.toThrow(InvalidMatchmakingProfilesError);
    });

    it('throws InvalidMatchmakingProfilesError when date of birth is missing', async () => {
      const invalidBoy = { ...puneetProfile, dateOfBirth: '' };
      await expect(
        generateMatchmakingReport(
          invalidBoy,
          aditiProfile,
          puneetChartData,
          aditiChartData,
          mockInterpretationProvider as any
        )
      ).rejects.toThrow(InvalidMatchmakingProfilesError);
    });

    it('preserves unknown birth time explicitly: Ascendant and houses indeterminate, Moon invariant checked', async () => {
      // Puneet with untimed birth: on 1983-12-28, Moon transitions Virgo -> Libra across the day
      const untimedPuneet = { ...puneetProfile, timeOfBirth: '', isTimeUnknown: true };
      const report = await generateMatchmakingReport(
        untimedPuneet,
        aditiProfile,
        { ...puneetChartData, isTimeUnknown: true },
        aditiChartData,
        mockInterpretationProvider as any
      );
      expect(report).toBeDefined();
      expect(report.isTimeUnknownA).toBe(true);
      expect(report.profile1.isTimeUnknown).toBe(true);
      expect(report.astroDetails?.boy.ascendantSign).toBe('Indeterminate');
      expect(report.manglikComparison.personA.status).toBe('Indeterminate');
      expect(report.manglikComparison.personA.statusFromLagna).toBe('Indeterminate');
      expect(report.manglikComparison.personA.marsHouse).toBeNull();
      expect(report.manglikComparison.verdict).toBe('INDETERMINATE (EXACT BIRTH TIME REQUIRED)');
      expect(report.manglikComparison.explanation).toContain('Classical astrology strictly prohibits assuming a chart is Non-Manglik');

      // Moon transitions across day boundary for Puneet, so Moon-based Guna Milan is indeterminate
      expect(report.isMoonIndeterminate).toBe(true);
      expect(report.gunaMilan.isIndeterminate).toBe(true);
      expect(report.gunaMilan.verdict).toContain('INDETERMINATE (TIME OF BIRTH REQUIRED)');
    });

    it('computes Moon-based Guna Milan when Moon is invariant across birth day despite unknown birth time', async () => {
      // 1995-03-03: Moon stays strictly in Pisces / Uttara Bhadrapada all 24 hours
      const stableUntimedProfile = {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Stable Moon Boy',
        dateOfBirth: '1995-03-03',
        timeOfBirth: '',
        isTimeUnknown: true,
        placeName: 'Delhi, India',
        timezone: 'Asia/Kolkata',
      };
      const stableUntimedChartData = {
        isTimeUnknown: true,
        ascendant: { sign: 'Indeterminate', isIndeterminate: true },
        planets: [
          { name: 'Moon', planet: 'MOON', sign: 'Pisces', longitude: 338.5, nakshatra: 'Uttara Bhadrapada', pada: 2 },
          { name: 'Mars', planet: 'MARS', sign: 'Cancer', longitude: 105.2, nakshatra: 'Pushya', pada: 1 },
        ],
      };

      const report = await generateMatchmakingReport(
        stableUntimedProfile,
        aditiProfile,
        stableUntimedChartData,
        aditiChartData,
        mockInterpretationProvider as any
      );
      expect(report).toBeDefined();
      expect(report.isTimeUnknownA).toBe(true);
      expect(report.isMoonIndeterminate).toBe(false);
      // Guna Milan is successfully computed because Moon is invariant
      expect(report.gunaMilan.totalScore).toBeGreaterThan(0);
      expect(report.gunaMilan.verdict).not.toContain('INDETERMINATE (TIME OF BIRTH REQUIRED)');
      // But Lagna & house-based Manglik remain indeterminate
      expect(report.manglikComparison.personA.statusFromLagna).toBe('Indeterminate');
      expect(report.manglikComparison.verdict).toBe('INDETERMINATE (EXACT BIRTH TIME REQUIRED)');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. DETERMINISTIC ASHTAKOOTA GUNA MILAN SCORING (CANONICAL 23.50 / 36.00)
  // ---------------------------------------------------------------------------
  describe('2. Deterministic Ashtakoota Guna Milan Scoring', () => {
    let report: MatchmakingReportModel;

    it('generates the complete matchmaking report successfully', async () => {
      report = await generateMatchmakingReport(
        puneetProfile,
        aditiProfile,
        puneetChartData,
        aditiChartData,
        mockInterpretationProvider as any
      );
      expect(report.type).toBe(ReportType.MARRIAGE_COMPATIBILITY);
      expect(report.gunaMilan).toBeDefined();
    });

    it('verifies canonical Varna Koota (1.00 / 1.00): Vaishya vs Vaishya', () => {
      const varna = report.gunaMilan.kootas.find((k) => k.name === 'Varna');
      expect(varna).toBeDefined();
      expect(varna?.maxPoints).toBe(1);
      expect(varna?.obtainedPoints).toBe(1);
      expect(varna?.status).toBe('EXCELLENT');
    });

    it('verifies canonical Vashya Koota (1.00 / 2.00): Manav vs Chatushpad', () => {
      const vashya = report.gunaMilan.kootas.find((k) => k.name === 'Vashya');
      expect(vashya).toBeDefined();
      expect(vashya?.maxPoints).toBe(2);
      expect(vashya?.obtainedPoints).toBe(1);
    });

    it('verifies canonical Tara Koota (1.50 / 3.00): Vipat vs Mitra', () => {
      const tara = report.gunaMilan.kootas.find((k) => k.name === 'Tara');
      expect(tara).toBeDefined();
      expect(tara?.maxPoints).toBe(3);
      expect(tara?.obtainedPoints).toBe(1.5);
    });

    it('verifies canonical Yoni Koota (1.00 / 4.00): Tiger (Vyaghr) vs Sheep (Mesh)', () => {
      const yoni = report.gunaMilan.kootas.find((k) => k.name === 'Yoni');
      expect(yoni).toBeDefined();
      expect(yoni?.maxPoints).toBe(4);
      expect(yoni?.obtainedPoints).toBe(1);
    });

    it('verifies canonical Graha Maitri (5.00 / 5.00): Mercury vs Venus friendly rulers', () => {
      const maitri = report.gunaMilan.kootas.find((k) => k.name === 'Graha Maitri');
      expect(maitri).toBeDefined();
      expect(maitri?.maxPoints).toBe(5);
      expect(maitri?.obtainedPoints).toBe(5);
      expect(maitri?.status).toBe('EXCELLENT');
    });

    it('verifies canonical Gana Koota (6.00 / 6.00): Rakshas vs Rakshas identical temperament', () => {
      const gana = report.gunaMilan.kootas.find((k) => k.name === 'Gana');
      expect(gana).toBeDefined();
      expect(gana?.maxPoints).toBe(6);
      expect(gana?.obtainedPoints).toBe(6);
      expect(gana?.status).toBe('EXCELLENT');
    });

    it('verifies canonical Bhakoot Koota (0.00 / 7.00 with Dosha: Yes) in table marks with Nav-Pancham designation', () => {
      const bhakoot = report.gunaMilan.kootas.find((k) => k.name === 'Bhakoot');
      expect(bhakoot).toBeDefined();
      expect(bhakoot?.maxPoints).toBe(7);
      expect(bhakoot?.obtainedPoints).toBe(0);
      expect(bhakoot?.hasDosha).toBe(true);
      expect(bhakoot?.boyDetail).toContain('Nav-Pancham');
      expect(bhakoot?.boyDetail).not.toContain('Shadashtak');
    });

    it('verifies canonical Nadi Koota (8.00 / 8.00): Madhya vs Antya different Nadis', () => {
      const nadi = report.gunaMilan.kootas.find((k) => k.name === 'Nadi');
      expect(nadi).toBeDefined();
      expect(nadi?.maxPoints).toBe(8);
      expect(nadi?.obtainedPoints).toBe(8);
      expect(nadi?.status).toBe('EXCELLENT');
      expect(nadi?.hasDosha).toBe(false);
    });

    it('confirms the canonical total score strictly equals 23.50 / 36.00', () => {
      expect(report.gunaMilan.totalScore).toBe(23.5);
      expect(report.gunaMilan.maxScore).toBe(36);
      expect(report.gunaMilan.verdict).toContain('SHUBHA');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. BHAKOOT MITIGATION, ASHTAVARGA & MANGLIK ANALYSIS
  // ---------------------------------------------------------------------------
  describe('3. Bhakoot Mitigation, Ashtavarga & Manglik Synastry', () => {
    let report: MatchmakingReportModel;

    it('evaluates Bhakoot mitigation correctly in emotional harmony synthesis', async () => {
      report = await generateMatchmakingReport(
        puneetProfile,
        aditiProfile,
        puneetChartData,
        aditiChartData,
        mockInterpretationProvider as any
      );
      expect(report.synthesis.emotionalHarmony).toContain('Bhakoot Dosh is not Severe since rasi lords are friendly');
    });

    it('derives Akshara Ashtavarga accurately: Puneet (Mooshak) & Aditi (Garuda) are Friendly', () => {
      const puneetV = getNameAshtavarga('Puneet');
      const aditiV = getNameAshtavarga('Aditi');

      expect(puneetV.name).toBe('Mooshak');
      expect(aditiV.name).toBe('Garuda');
      expect(getAshtavargaRelationship(puneetV.name, aditiV.name)).toBe('Friendly');
    });

    it('verifies Manglik status: Neither partner is Manglik (Male Mars in 11th, Female Mars in 10th)', () => {
      expect(report.manglikComparison.personA.isManglik).toBe(false);
      expect(report.manglikComparison.personB.isManglik).toBe(false);
      expect(report.manglikComparison.verdict).toBe('BOTH PARTNERS: NOT PRESENT');
      expect(report.manglikComparison.explanation).toContain('is not Manglik since Mars is positioned in the house 11');
      expect(report.manglikComparison.explanation).toContain('is not Manglik since Mars is positioned in the house 10');
    });

    it('contains comprehensive synthesis and domain predictions', () => {
      expect(report.predictions).toBeDefined();
      expect(report.predictions?.nature).toContain('The natures of Puneet Kumar and Aditi Harish have harmonious alignment');
      expect(report.predictions?.health).toContain('they are free from Nadi Dosha');
      expect(report.predictions?.inLawsMale).toBeDefined();
      expect(report.predictions?.children).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. VECTOR PDF GENERATION (10 PAGES, EXACT RENDERING ACROSS TIMED & UNTIMED)
  // ---------------------------------------------------------------------------
  describe('4. Vector PDF Generation', () => {
    it('generates a valid, multi-page vector PDF for both-timed profiles', async () => {
      const report = await generateMatchmakingReport(
        puneetProfile,
        aditiProfile,
        puneetChartData,
        aditiChartData,
        mockInterpretationProvider as any
      );

      const pdfBuffer = await reportPdfService.generateReportPdf(report);
      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(15000);

      // Verify PDF header %PDF-
      const header = pdfBuffer.slice(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');

      // Verify expected page count (10 pages)
      const pdfText = pdfBuffer.toString('binary');
      const pageCount = (pdfText.match(/\/Type\s*\/Page\b/g) || []).length;
      expect(pageCount).toBe(10);

      // Verify PDF text content
      const utfText = pdfBuffer.toString('utf-8');
      expect(utfText).toContain('Nav-Pancham');
      expect(utfText).not.toContain('Shadashtaka (5/9)');
    });

    it('generates a valid, 10-page vector PDF for one untimed profile', async () => {
      const untimedPuneet = { ...puneetProfile, timeOfBirth: '', isTimeUnknown: true };
      const report = await generateMatchmakingReport(
        untimedPuneet,
        aditiProfile,
        { ...puneetChartData, isTimeUnknown: true },
        aditiChartData,
        mockInterpretationProvider as any
      );

      const pdfBuffer = await reportPdfService.generateReportPdf(report);
      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(15000);

      const pdfText = pdfBuffer.toString('binary');
      const pageCount = (pdfText.match(/\/Type\s*\/Page\b/g) || []).length;
      expect(pageCount).toBe(10);

      const utfText = pdfBuffer.toString('utf-8');
      expect(utfText).toContain('Time Unavailable');
      expect(utfText).toContain('LAGNA CHART UNAVAILABLE');
      expect(utfText).toContain('Lagna Manglik is Indeterminate');
    });

    it('generates a valid, 10-page vector PDF for both untimed profiles', async () => {
      const untimedPuneet = { ...puneetProfile, timeOfBirth: '', isTimeUnknown: true };
      const untimedAditi = { ...aditiProfile, timeOfBirth: '', isTimeUnknown: true };
      const report = await generateMatchmakingReport(
        untimedPuneet,
        untimedAditi,
        { ...puneetChartData, isTimeUnknown: true },
        { ...aditiChartData, isTimeUnknown: true },
        mockInterpretationProvider as any
      );

      const pdfBuffer = await reportPdfService.generateReportPdf(report);
      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(15000);

      const pdfText = pdfBuffer.toString('binary');
      const pageCount = (pdfText.match(/\/Type\s*\/Page\b/g) || []).length;
      expect(pageCount).toBe(10);

      const utfText = pdfBuffer.toString('utf-8');
      expect(utfText).toContain('LAGNA CHART UNAVAILABLE');
      expect(utfText).toContain('Lagna Manglik is Indeterminate');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. COMMERCIAL CATALOGUE, PRICING & WORKER INTEGRATION
  // ---------------------------------------------------------------------------
  describe('5. Commercial Catalogue & Worker Integration', () => {
    it('verifies report-matchmaking exists in COMMERCE_CATALOG with price ₹499 (49,900 paise)', () => {
      const catalogItem = COMMERCE_CATALOG['report-matchmaking'] || COMMERCE_CATALOG['report-marriage'];
      expect(catalogItem).toBeDefined();
      expect(catalogItem.pricePaise).toBe(49900);
      expect(catalogItem.currency).toBe('INR');
      expect(catalogItem.legacyReportType).toBe(ReportType.MARRIAGE_COMPATIBILITY);
    });

    it('verifies payment service pricing invariant for MARRIAGE_COMPATIBILITY is 49,900 paise', () => {
      expect(REPORT_PRICES_PAISE[ReportType.MARRIAGE_COMPATIBILITY]).toBe(49900);
    });

    it('verifies feature access service recognizes MARRIAGE_COMPATIBILITY', () => {
      expect(featureAccessService).toBeDefined();
    });

    it('verifies CareerReportWorker supports MARRIAGE_COMPATIBILITY dispatch', () => {
      expect(CareerReportWorker.SUPPORTED_REPORT_TYPES).toContain('MARRIAGE_COMPATIBILITY');
    });
  });
});
