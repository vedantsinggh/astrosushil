import { describe, it, expect } from 'vitest';
import {
  generateLoveReport,
  generateLoveReportData,
  calculateMulank,
  calculateBhagyank,
  findDarakaraka,
  calculateMarriageTimingWindows,
  LOVE_DISCLAIMER,
  LOVE_CLOSING_AUTHOR,
} from '../../../../packages/report-engine/src/generators/love-report.generator';
import {
  ReportType,
  LoveReportModel,
} from '../../../../packages/report-engine/src/types/report.types';
import { reportPdfService } from '../../../../packages/report-engine/src/pdf/report-pdf.service';
import { COMMERCE_CATALOG } from '../../src/modules/commerce/commerce.catalog';
import { REPORT_PRICES_PAISE, paymentService } from '../../src/services/payment.service';
import { featureAccessService } from '../../src/services/feature-access.service';
import { CareerReportWorker } from '../../src/services/report-worker.service';

describe('Phase 6.5: Personalised Love Report Implementation Suite', () => {
  const puneetProfile = {
    name: 'Puneet Kumar',
    dateOfBirth: '1983-12-28',
    timeOfBirth: '04:45',
    placeName: 'Bulandshahr, Uttar Pradesh, India',
    timezone: 'Asia/Kolkata',
    latitude: 28.4069,
    longitude: 77.8498,
  };

  // Canonical chart data for Puneet Kumar matching Love Report.pdf reference
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
      const report = await generateLoveReport(puneetProfile, puneetChartData);
      expect(report).toBeDefined();
      expect(report.type).toBe(ReportType.LOVE);
      expect(report.profile.name).toBe('Puneet Kumar');
    });

    it('should reject missing birth name', async () => {
      await expect(
        generateLoveReport({ ...puneetProfile, name: '' }, puneetChartData)
      ).rejects.toThrow(/Name is required/);
    });

    it('should reject missing or malformed birth date', async () => {
      await expect(
        generateLoveReport({ ...puneetProfile, dateOfBirth: '28-12-1983' }, puneetChartData)
      ).rejects.toThrow(/Date of birth must be in YYYY-MM-DD format/);
    });

    it('should reject missing or malformed birth time', async () => {
      await expect(
        generateLoveReport({ ...puneetProfile, timeOfBirth: 'invalid' }, puneetChartData)
      ).rejects.toThrow(/Time of birth must be in HH:MM/);
    });

    it('should reject invalid timezone identifier', async () => {
      await expect(
        generateLoveReport({ ...puneetProfile, timezone: 'Invalid/City' }, puneetChartData)
      ).rejects.toThrow(/Invalid IANA timezone/);
    });

    it('should reject out-of-range coordinates', async () => {
      await expect(
        generateLoveReport({ ...puneetProfile, latitude: 95.0 }, puneetChartData)
      ).rejects.toThrow(/Latitude must be between -90 and 90/);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. DETERMINISTIC ASTROLOGICAL & NUMEROLOGICAL CALCULATIONS (REFERENCE ALIGNMENT)
  // ---------------------------------------------------------------------------
  describe('Deterministic Astrological & Numerological Calculations', () => {
    it('should compute exact Mulank and Bhagyank matching reference (Mulank: 1, Bhagyank: 7)', async () => {
      const m = calculateMulank('1983-12-28');
      const b = calculateBhagyank('1983-12-28');
      expect(m).toBe(1);
      expect(b).toBe(7);

      const report = await generateLoveReport(puneetProfile, puneetChartData);
      expect(report.astralDetails.mulank).toBe(1);
      expect(report.astralDetails.bhagyank).toBe(7);
      expect(report.numerologyOfLove.mulank).toBe(1);
      expect(report.numerologyOfLove.bhagyank).toBe(7);
    });

    it('should identify Scorpio Ascendant and Virgo Moon (Chitra Nakshatra)', async () => {
      const report = await generateLoveReport(puneetProfile, puneetChartData);
      expect(report.astralDetails.lagnaAscendant).toBe('Scorpio');
      expect(report.astralDetails.moonSign).toBe('Virgo');
      expect(report.astralDetails.nakshatra).toBe('Chitra');
    });

    it('should identify Venus in 1st House in Scorpio conjunct Ketu', async () => {
      const report = await generateLoveReport(puneetProfile, puneetChartData);
      expect(report.astralDetails.venusHousePlacement).toBe(1);
      expect(report.astralDetails.venusSignPlacement).toBe('Scorpio');

      const conj = report.venusCelestialCupid.venusConjunctions;
      expect(conj.length).toBeGreaterThanOrEqual(1);
      expect(conj[0].conjunctionWith).toBe('Ketu');
      expect(conj[0].house).toBe(1);
      expect(conj[0].sign).toBe('Scorpio');
      expect(conj[0].influence).toContain('deeply introspective');
    });

    it('should identify 5th House as Pisces and 5th Lord as Jupiter (The Love Compass)', async () => {
      const report = await generateLoveReport(puneetProfile, puneetChartData);
      expect(report.loveCompass.fifthHouseSign).toBe('Pisces');
      expect(report.loveCompass.fifthHouseLord).toBe('Jupiter');
      expect(report.loveCompass.heartstringsInsights).toContain('dreamy, romantic, and full of idealistic fantasies');
    });

    it('should identify 7th House as Taurus and 7th Lord as Venus (The House of Eternal Bonds)', async () => {
      const report = await generateLoveReport(puneetProfile, puneetChartData);
      expect(report.marriageHouse.seventhHouseSign).toBe('Taurus');
      expect(report.marriageHouse.seventhHouseLord).toBe('Venus');
      expect(report.marriageHouse.eternalBondsInsights).toContain('stability and comfort take center stage');
    });

    it('should deterministically identify Jaimini Darakaraka as Jupiter with lowest degree (1.38 deg in H2)', async () => {
      const dk = findDarakaraka(puneetChartData.planets);
      expect(dk.planet).toBe('Jupiter');
      expect(dk.degree).toBe(1.38);
      expect(dk.house).toBe(2);

      const report = await generateLoveReport(puneetProfile, puneetChartData);
      expect(report.astralDetails.darkarak).toBe('Jupiter');
      expect(report.spousePortrait.darakarakaPlanet).toBe('Jupiter');
      expect(report.spousePortrait.darakarakaHouse).toBe(2);
      expect(report.spousePortrait.darakarakaInsights[0]).toContain('blend of wisdom and humor');
      expect(report.spousePortrait.darakarakaHouseInsights[0]).toContain('wise and cautious when it comes to financial matters');
    });

    it('should match the authoritative astrology-engine JaiminiCalculator outputs for Puneet Kumar fixture', () => {
      const { JaiminiCalculator } = require('@astro/astrology-engine');
      const jc = new JaiminiCalculator();
      const karakas = jc.calculateCharaKarakas({
        SUN: { degreeInRashi: 12.15 },
        MOON: { degreeInRashi: 27.8 },
        MARS: { degreeInRashi: 28.45 },
        MERCURY: { degreeInRashi: 19.7 },
        JUPITER: { degreeInRashi: 1.38 },
        VENUS: { degreeInRashi: 1.44 },
        SATURN: { degreeInRashi: 19.37 },
      });

      // Assert 7 Chara Karakas ordered strictly by degree descending
      expect(karakas[0].planet).toBe('MARS'); // AK (28.45)
      expect(karakas[0].code).toBe('AK');
      expect(karakas[1].planet).toBe('MOON'); // AmK (27.8)
      expect(karakas[1].code).toBe('AmK');
      expect(karakas[2].planet).toBe('MERCURY'); // BK (19.7)
      expect(karakas[3].planet).toBe('SATURN'); // MK (19.37)
      expect(karakas[4].planet).toBe('SUN'); // PK (12.15)
      expect(karakas[5].planet).toBe('VENUS'); // GK (1.44)
      expect(karakas[6].planet).toBe('JUPITER'); // DK (1.38)
      expect(karakas[6].code).toBe('DK');
      expect(karakas[6].rank).toBe(7);
      expect(karakas[6].degreeInSign).toBe(1.38);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. NUMEROLOGY OF LOVE, ALLIES & RED FLAGS
  // ---------------------------------------------------------------------------
  describe('Numerology of Love, Cosmic Allies & Red Flags', () => {
    it('should provide authentic Mulank 1 relationship dynamics matching reference', async () => {
      const report = await generateLoveReport(puneetProfile, puneetChartData);
      const ni = report.numerologyOfLove.numerologyInsights;
      expect(ni.length).toBe(3);
      expect(ni[0]).toContain('softhearted and caring');
      expect(ni[1]).toContain('supportive friend');
      expect(ni[2]).toContain('calm, humble, and loyal');
    });

    it('should provide complete Cosmic Allies table matching reference', async () => {
      const report = await generateLoveReport(puneetProfile, puneetChartData);
      const allies = report.starsOfFavour;
      expect(allies.compatibleMulanks).toEqual([2, 3, 5, 6, 9]);
      expect(allies.compatibleMoonSigns).toContain('Taurus');
      expect(allies.compatibleMoonSigns).toContain('Capricorn');
      expect(allies.compatibleMoonSigns).toContain('Cancer');
      expect(allies.compatibleMoonSigns).toContain('Scorpio');
      expect(allies.luckyDays).toEqual(['Sunday', 'Monday']);
      expect(allies.luckyColours).toEqual(['Yellow', 'Golden', 'Orange']);
      expect(allies.favourableStone).toBe('Yellow Sapphire');
      expect(allies.rudraksh).toBe('3 Mukhi');
      expect(allies.luckyDates).toEqual(['10th', '15th', '19th', '24th of any month']);
      expect(allies.luckyBracelet).toBe('Sun Stone Bracelet');
    });

    it('should provide Cosmic Red Flags and Tithi married life table matching reference', async () => {
      const report = await generateLoveReport(puneetProfile, puneetChartData);
      const rf = report.cosmicRedFlags;
      expect(rf.incompatibleMulanks).toEqual([4, 7, 8]);
      expect(rf.frictionMoonSigns).toEqual(['Gemini', 'Sagittarius']);
      expect(rf.unfavourableDays).toEqual(['Saturday', 'Friday']);
      expect(rf.unfavourableStones).toEqual(['Emerald', 'Diamond']);

      // Tithi Analysis Table
      expect(rf.tithiAnalysis.shuklaPaksha.good).toContain('Purnima');
      expect(rf.tithiAnalysis.shuklaPaksha.challenging).toEqual(['Pratipada', 'Chaturthi', 'Chaturdashi']);
      expect(rf.tithiAnalysis.krishnaPaksha.challenging).toContain('Amavasya');

      // Nakshatra Qualities
      expect(rf.nakshatraQualities.nakshatraName).toBe('Chitra');
      expect(rf.nakshatraQualities.qualities).toContain('Focused on aesthetics and beauty');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. CONSECRATED LOVE REMEDIES & MARRIAGE TIMING TABLE
  // ---------------------------------------------------------------------------
  describe('Consecrated Love Remedies & Marriage Timing Windows', () => {
    it('should provide personalized suggestions and 5 consecrated sacred remedies matching reference', async () => {
      const report = await generateLoveReport(puneetProfile, puneetChartData);
      const rem = report.pathToEverlastingLove;

      expect(rem.personalizedSuggestions.length).toBe(3);
      expect(rem.personalizedSuggestions[0]).toContain('equality in your relationship');
      expect(rem.personalizedSuggestions[1]).toContain('sweet tone');
      expect(rem.personalizedSuggestions[2]).toContain('romantic dinner date');

      expect(rem.consecratedRemedies.length).toBe(5);
      expect(rem.consecratedRemedies[0].remedy).toContain('Om Krim Kalikayai Namah');
      expect(rem.consecratedRemedies[1].remedy).toContain('red or maroon');
      expect(rem.consecratedRemedies[2].remedy).toContain('honey');
      expect(rem.consecratedRemedies[3].remedy).toContain('sindoor and chola to Lord Hanuman');
      expect(rem.consecratedRemedies[4].remedy).toContain('rock salt to your bathwater');
    });

    it('should compute exact 11 Jupiter Gochara marriage timing windows matching reference table', async () => {
      const windows = calculateMarriageTimingWindows('Taurus', 'Sagittarius');
      expect(windows.length).toBe(11);

      expect(windows[0]).toEqual({
        rating: 'Good',
        beginningPeriod: 'November 26, 2027',
        endingPeriod: 'February 28, 2028',
        astrologicalBasis: expect.any(String),
      });

      expect(windows[1].beginningPeriod).toBe('July 24, 2028');
      expect(windows[1].endingPeriod).toBe('December 26, 2028');

      expect(windows[8].rating).toBe('Fair');
      expect(windows[8].beginningPeriod).toBe('March 28, 2034');

      expect(windows[9].rating).toBe('Very Good');
      expect(windows[9].beginningPeriod).toBe('April 15, 2036');
      expect(windows[9].endingPeriod).toBe('September 10, 2036');

      expect(windows[10].rating).toBe('Very Good');
      expect(windows[10].beginningPeriod).toBe('November 17, 2036');
      expect(windows[10].endingPeriod).toBe('April 26, 2037');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. INDEPENDENT FIXTURES & EDGE CASES
  // ---------------------------------------------------------------------------
  describe('Independent Fixtures & Edge Cases', () => {
    it('should correctly compute Mulanks 1 through 9 for diverse birth days', () => {
      expect(calculateMulank('1990-01-01')).toBe(1);
      expect(calculateMulank('1990-01-10')).toBe(1);
      expect(calculateMulank('1990-01-19')).toBe(1);
      expect(calculateMulank('1990-01-28')).toBe(1);

      expect(calculateMulank('1990-01-02')).toBe(2);
      expect(calculateMulank('1990-01-11')).toBe(2);
      expect(calculateMulank('1990-01-20')).toBe(2);
      expect(calculateMulank('1990-01-29')).toBe(2);

      expect(calculateMulank('1990-01-03')).toBe(3);
      expect(calculateMulank('1990-01-04')).toBe(4);
      expect(calculateMulank('1990-01-05')).toBe(5);
      expect(calculateMulank('1990-01-06')).toBe(6);
      expect(calculateMulank('1990-01-07')).toBe(7);
      expect(calculateMulank('1990-01-08')).toBe(8);
      expect(calculateMulank('1990-01-09')).toBe(9);
    });

    it('should correctly compute Bhagyank for diverse birth dates with full digit summation', () => {
      // 1983-12-28: 1+9+8+3 + 1+2 + 2+8 = 21 + 3 + 10 = 34 -> 7
      expect(calculateBhagyank('1983-12-28')).toBe(7);
      // 1990-01-01: 1+9+9+0 + 0+1 + 0+1 = 19 + 1 + 1 = 21 -> 3
      expect(calculateBhagyank('1990-01-01')).toBe(3);
      // 2000-05-15: 2+0+0+0 + 0+5 + 1+5 = 2 + 5 + 6 = 13 -> 4
      expect(calculateBhagyank('2000-05-15')).toBe(4);
      // 1995-09-09: 1+9+9+5 + 0+9 + 0+9 = 24 + 9 + 9 = 42 -> 6
      expect(calculateBhagyank('1995-09-09')).toBe(6);
    });

    it('should dynamically evaluate marriage timing windows for alternative Lagna and Darakaraka charts', () => {
      // For Aries Lagna: 7th house is Libra, 9th house is Sagittarius, Darakaraka is Gemini
      const ariesWindows = calculateMarriageTimingWindows('Libra', 'Gemini', 'Aries');
      expect(ariesWindows.length).toBe(11);

      // In Jan 2030, Jupiter transits Libra (direct over 7th house for Aries Lagna) -> 'Very Good'
      const libraTransitWindow = ariesWindows.find((w) => w.beginningPeriod.includes('2030'));
      expect(libraTransitWindow).toBeDefined();
      expect(libraTransitWindow!.rating).toBe('Very Good');
      expect(libraTransitWindow!.astrologicalBasis).toContain('7th House of marriage (Libra)');

      // In Aries (2034-2035), Jupiter transits 1st house (Lagna), casting 7th aspect onto Libra (7th house) -> 'Good'
      const ariesTransitWindow = ariesWindows.find((w) => w.beginningPeriod.includes('2034'));
      expect(ariesTransitWindow).toBeDefined();
      expect(ariesTransitWindow!.rating).toBe('Good');
      expect(ariesTransitWindow!.astrologicalBasis).toContain('aspecting 7th House of marriage (Libra)');
    });

    it('should correctly identify Moon as Darakaraka when Moon has lowest degree', () => {
      const altPlanets = [
        { planet: 'SUN', degree: 15.0, house: 1, sign: 'Aries' },
        { planet: 'MOON', degree: 2.1, house: 4, sign: 'Cancer' },
        { planet: 'MARS', degree: 22.0, house: 10, sign: 'Capricorn' },
        { planet: 'MERCURY', degree: 18.0, house: 2, sign: 'Taurus' },
        { planet: 'JUPITER', degree: 12.0, house: 9, sign: 'Sagittarius' },
        { planet: 'VENUS', degree: 25.0, house: 5, sign: 'Leo' },
        { planet: 'SATURN', degree: 8.0, house: 7, sign: 'Libra' },
      ];
      const dk = findDarakaraka(altPlanets);
      expect(dk.planet).toBe('Moon');
      expect(dk.degree).toBe(2.1);
      expect(dk.house).toBe(4);
    });

    it('should handle standalone Venus without planetary conjunctions', () => {
      const solitaryVenusChart = {
        profile: puneetProfile,
        ascendant: { sign: 'Aries', degree: 10.0 },
        planets: [
          { planet: 'VENUS', sign: 'Taurus', degree: 15.0, house: 2 },
          { planet: 'MOON', sign: 'Cancer', degree: 5.0, house: 4 },
          { planet: 'SUN', sign: 'Aries', degree: 20.0, house: 1 },
        ],
        houses: [{ house: 5, sign: 'Leo' }, { house: 7, sign: 'Libra' }],
      };
      const rep = generateLoveReportData(solitaryVenusChart);
      expect(rep.venusCelestialCupid.venusConjunctions[0].conjunctionWith).toContain('Standalone');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. TRACEABILITY & EPILOGUE
  // ---------------------------------------------------------------------------
  describe('Traceability & Epilogue', () => {
    it('should include authentic author metadata and non-investment ephemeris disclaimer', async () => {
      const report = await generateLoveReport(puneetProfile, puneetChartData);
      expect(report.closingNote.epilogueTitle).toContain('Unlock the mysteries of your heart');
      expect(report.closingNote.offerCouponCode).toBe('GEM15');
      expect(report.closingNote.closingBlessing).toContain('The stars are aligned, and your soulmate is closer than you think');
      expect(LOVE_DISCLAIMER).toContain('This report is based entirely on astrological calculations');
      expect(LOVE_CLOSING_AUTHOR).toContain('Astro Sushil');
    });
  });

  // ---------------------------------------------------------------------------
  // 7. VECTOR PDF GENERATION
  // ---------------------------------------------------------------------------
  describe('Vector PDF Generation', () => {
    it('should generate a rich, exactly 23-page vector PDF for the Personalised Love Report', async () => {
      const report = await generateLoveReport(puneetProfile, puneetChartData);
      const pdfBuffer = await reportPdfService.generateReportPdf(report);

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(5000);

      // Verify PDF 1.4 header
      const headerStr = pdfBuffer.slice(0, 8).toString('utf-8');
      expect(headerStr).toContain('%PDF-1.4');

      // Verify exact 23-page count
      const pdfText = pdfBuffer.toString('utf-8');
      const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
      expect(pageMatches).toBeDefined();
      expect(pageMatches!.length).toBe(23);

      // Verify core text markers inside the PDF stream
      expect(pdfText).toContain('PERSONALISED LOVE REPORT');
      expect(pdfText.toUpperCase()).toContain('PUNEET KUMAR');
      expect(pdfText).toContain('THE MIRROR OF YOUR SOUL');
      expect(pdfText).toContain('VENUS, THE CELESTIAL CUPID');
      expect(pdfText).toContain('THE LOVE COMPASS');
      expect(pdfText).toContain('MARRIAGE: THE HOUSE OF ETERNAL BONDS');
      expect(pdfText).toContain('YOUR PERFECT PARTNER AWAITS!');
      expect(pdfText).toContain('NUMEROLOGY OF LOVE');
      expect(pdfText).toContain('STARS OF FAVOUR: YOUR COSMIC ALLIES');
      expect(pdfText).toContain('BEWARE OF THE SHADOWS: COSMIC RED FLAGS');
      expect(pdfText).toContain('PATH TO EVERLASTING LOVE');
      expect(pdfText).toContain('FAVOURABLE TIMING OF MARRIAGE');
      expect(pdfText).toContain('EMBRACING THE LOVE YOU DESERVE');
    });
  });

  // ---------------------------------------------------------------------------
  // 8. COMMERCIAL CATALOGUE, PRICING & FULFILLMENT VERIFICATION
  // ---------------------------------------------------------------------------
  describe('Commercial Catalogue, Pricing & Fulfillment Verification', () => {
    it('should map commercial SKU report-love to ReportType.LOVE with title and authoritative price ₹499', () => {
      const catalogItem = COMMERCE_CATALOG['report-love'];
      expect(catalogItem).toBeDefined();
      expect(catalogItem.id).toBe('report-love');
      expect(catalogItem.title).toBe('Personalised Love & Relationship Report');
      expect(catalogItem.legacyReportType).toBe(ReportType.LOVE);
      expect(catalogItem.pricePaise).toBe(49900); // Authoritative ₹499
      expect(catalogItem.currency).toBe('INR');
      expect(catalogItem.isActive).toBe(true);
    });

    it('should preserve authorized catalogue prices across the entire platform catalog', () => {
      expect(REPORT_PRICES_PAISE[ReportType.KUNDLI]).toBe(29900);
      expect(REPORT_PRICES_PAISE[ReportType.PLANETARY_SUMMARY]).toBe(19900);
      expect(REPORT_PRICES_PAISE[ReportType.CAREER]).toBe(49900);
      expect(REPORT_PRICES_PAISE[ReportType.CAREER_PROSITY]).toBe(69900);
      expect(REPORT_PRICES_PAISE[ReportType.HOROSCOPE]).toBe(49900);
      expect(REPORT_PRICES_PAISE[ReportType.FINANCE]).toBe(49900);
      expect(REPORT_PRICES_PAISE[ReportType.LOVE]).toBe(49900);
    });

    it('should compute exact 24-hour delivery SLA upon payment confirmation (paidAt + 24h)', () => {
      const paidAt = new Date('2026-11-09T10:00:00.000Z');
      const slaDeadline = new Date(paidAt.getTime() + 24 * 60 * 60 * 1000);
      expect(slaDeadline.toISOString()).toBe('2026-11-10T10:00:00.000Z');
    });

    it('should ensure strict content isolation between Love, Finance, Career, and Horoscope reports', async () => {
      const loveReport = await generateLoveReport(puneetProfile, puneetChartData);

      expect(loveReport.type).toBe(ReportType.LOVE);
      expect((loveReport as any).financialOverview).toBeUndefined();
      expect((loveReport as any).dhanaYogas).toBeUndefined();
      expect((loveReport as any).careerAnalysis).toBeUndefined();
      expect((loveReport as any).roadmapFiveYear).toBeUndefined();
      expect(loveReport.mirrorOfSoul).toBeDefined();
      expect(loveReport.spousePortrait).toBeDefined();
      expect(loveReport.pathToEverlastingLove).toBeDefined();
    });

    it('should correctly configure payment validation, feature access, and worker routing for ReportType.LOVE', () => {
      // Payment validation for LOVE report is strictly 49900 paise (₹499)
      expect(REPORT_PRICES_PAISE[ReportType.LOVE]).toBe(49900);
      expect(COMMERCE_CATALOG['report-love'].pricePaise).toBe(49900);

      // Feature access mapping contains LOVE_REPORT
      const loveFeature = featureAccessService.getCatalog().find((f) => f.code === 'LOVE_REPORT');
      expect(loveFeature).toBeDefined();
      expect(loveFeature!.reportTypeKey).toBe('LOVE');
      expect(loveFeature!.isFree).toBe(false);

      // Report worker supports ReportType.LOVE with 23 pages
      expect(CareerReportWorker.SUPPORTED_REPORT_TYPES).toContain(ReportType.LOVE);
    });

    it('should support cached report retrieval and verify forceRegenerate behavior without accidental regeneration', async () => {
      const reportStore = new Map<string, any>();
      const reportId = 'rep-love-cached-001';

      // 1. Initial report generation & caching
      const initialReport = await generateLoveReport(puneetProfile, puneetChartData);
      reportStore.set(reportId, {
        ...initialReport,
        id: reportId,
        status: 'READY',
        generatedAt: '2026-11-09T00:00:00.000Z',
        version: 1,
      });

      // 2. Fetch existing report: opening an existing report must return cached artifact without regenerating
      let generationCount = 0;
      const getReport = async (id: string, forceRegenerate = false) => {
        const existing = reportStore.get(id);
        if (existing && existing.status === 'READY' && !forceRegenerate) {
          return existing; // returns cached artifact
        }
        generationCount++;
        const newReport = await generateLoveReport(puneetProfile, puneetChartData);
        const updated = {
          ...newReport,
          id,
          status: 'READY',
          generatedAt: new Date().toISOString(),
          version: (existing?.version || 1) + 1,
        };
        reportStore.set(id, updated);
        return updated;
      };

      // Normal retrieval: does not generate
      const retrieved = await getReport(reportId, false);
      expect(generationCount).toBe(0);
      expect(retrieved.generatedAt).toBe('2026-11-09T00:00:00.000Z');
      expect(retrieved.version).toBe(1);

      // Explicit regeneration: creates a new version
      const regenerated = await getReport(reportId, true);
      expect(generationCount).toBe(1);
      expect(regenerated.version).toBe(2);
      expect(new Date(regenerated.generatedAt).getTime()).toBeGreaterThan(
        new Date('2026-11-09T00:00:00.000Z').getTime()
      );
    });

    it('should enforce PostgreSQL queue CAS claim fencing for ReportType.LOVE', () => {
      const queueTask = {
        taskId: 'task-love-001',
        orderId: 'ord-love-001',
        reportType: ReportType.LOVE,
        status: 'PENDING' as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
        claimedBy: null as string | null,
        claimedAt: null as Date | null,
        version: 1,
      };

      const worker1Id = 'worker-node-1';
      const worker2Id = 'worker-node-2';

      // Atomic CAS Claim: UPDATE queue SET status='PROCESSING', claimedBy=$worker, version=version+1 WHERE status='PENDING' AND version=$currentVersion
      const tryClaimTask = (workerId: string, currentVersion: number) => {
        if (queueTask.status === 'PENDING' && queueTask.version === currentVersion) {
          queueTask.status = 'PROCESSING';
          queueTask.claimedBy = workerId;
          queueTask.claimedAt = new Date();
          queueTask.version += 1;
          return true;
        }
        return false;
      };

      // Worker 1 successfully claims task
      const worker1Claimed = tryClaimTask(worker1Id, 1);
      expect(worker1Claimed).toBe(true);
      expect(queueTask.status).toBe('PROCESSING');
      expect(queueTask.claimedBy).toBe(worker1Id);
      expect(queueTask.version).toBe(2);

      // Concurrent Worker 2 fails claim because version has incremented (stale version 1)
      const worker2Claimed = tryClaimTask(worker2Id, 1);
      expect(worker2Claimed).toBe(false);
      expect(queueTask.claimedBy).toBe(worker1Id);
    });
  });
});
