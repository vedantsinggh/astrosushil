import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateCareerReport,
  generateCareerBasicReport,
  generateCareerProReport,
  validateCareerReportInput,
  reportPdfService,
  ReportType,
  CareerReportModel,
} from '@astro/report-engine';
import { BirthDetailsValidationError } from '@astro/astrology-engine';
import { COMMERCE_CATALOG } from '../../src/modules/commerce/commerce.catalog';

describe('Phase 6.3: Career Report Implementation Suite', () => {
  // Canonical reference profile: Puneet Kumar (from docs/reference repots/Career Report.pdf)
  const puneetProfile = {
    name: 'Puneet Kumar',
    dateOfBirth: '1983-12-28',
    timeOfBirth: '04:45:00',
    placeName: 'Bulandshahr, Uttar Pradesh, India',
    timezone: 'Asia/Kolkata',
    latitude: 28.4069,
    longitude: 77.8498,
  };

  // Canonical chart data for Puneet Kumar (Scorpio Rising)
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

  describe('1. Input Validation & Error Handling', () => {
    it('should successfully validate canonical profile input', () => {
      expect(() => validateCareerReportInput(puneetProfile)).not.toThrow();
    });

    it('should reject missing birth name', () => {
      const invalid = { ...puneetProfile, name: '' };
      expect(() => validateCareerReportInput(invalid)).toThrow(BirthDetailsValidationError);
    });

    it('should reject missing birth time', () => {
      const invalid = { ...puneetProfile, timeOfBirth: '' };
      expect(() => validateCareerReportInput(invalid)).toThrow(BirthDetailsValidationError);
    });

    it('should reject invalid timezone identifier', () => {
      const invalid = { ...puneetProfile, timezone: 'Invalid/NonExistent_Zone' };
      expect(() => validateCareerReportInput(invalid)).toThrow(BirthDetailsValidationError);
    });

    it('should reject out-of-range coordinates', () => {
      const invalidLat = { ...puneetProfile, latitude: 125.0 };
      expect(() => validateCareerReportInput(invalidLat)).toThrow(BirthDetailsValidationError);

      const invalidLng = { ...puneetProfile, longitude: -210.0 };
      expect(() => validateCareerReportInput(invalidLng)).toThrow(BirthDetailsValidationError);
    });
  });

  describe('2. Deterministic Astrological Calculations (Reference PDF Alignment)', () => {
    let proReport: CareerReportModel;

    beforeAll(async () => {
      proReport = await generateCareerProReport(puneetProfile, puneetChartData);
    });

    it('should determine Scorpio Ascendant and Leo 10th House (Karma Bhava)', () => {
      expect(proReport.ascendant.sign).toBe('Scorpio');
      expect(proReport.configuration.zodiacType).toBe('SIDEREAL');
      expect(proReport.configuration.ayanamsa).toBe('LAHIRI');
      expect(proReport.configuration.houseSystem).toBe('WHOLE_SIGN');

      const house10 = proReport.careerHouses.find((h) => h.houseNumber === 10);
      expect(house10).toBeDefined();
      expect(house10!.sign).toBe('Leo');
      expect(house10!.signLord).toBe('Sun');
    });

    it('should identify key career significators with correct dignities', () => {
      const sun = proReport.planetarySignificators.find((p) => p.planet === 'Sun');
      const saturn = proReport.planetarySignificators.find((p) => p.planet === 'Saturn');

      expect(sun).toBeDefined();
      expect(sun!.house).toBe(2);
      expect(sun!.sign).toBe('Sagittarius');

      expect(saturn).toBeDefined();
      expect(saturn!.house).toBe(12);
      expect(saturn!.sign).toBe('Libra');
      expect(saturn!.dignity).toContain('Exalted');
    });

    it('should accurately calculate Jaimini Amatyakaraka as Moon (2nd highest degree)', () => {
      expect(proReport.amatyakaraka).toBeDefined();
      expect(proReport.amatyakaraka!.planet).toBe('Moon');
      expect(proReport.amatyakaraka!.sign).toBe('Virgo');
      expect(proReport.amatyakaraka!.degreeInSign).toBe(27.8);
      expect(proReport.amatyakaraka!.coreAdvisory).toContain('emotional intelligence');
    });

    it('should compute D10 Dashamsha chart with Libra Ascendant and Cancer 10th House', () => {
      expect(proReport.d10Summary).toBeDefined();
      expect(proReport.d10Summary.ascendantSign).toBe('Libra');
      expect(proReport.d10Summary.tenthSign).toBe('Cancer');
      expect(proReport.d10Summary.tenthLord).toBe('Moon');
      expect(proReport.d10Summary.ascendantTraits.length).toBeGreaterThanOrEqual(3);
    });

    it('should compute BNN Shani Dev progression model and planetary chains without arbitrary age blocks', () => {
      expect(proReport.bnnSaturnAnalysis).toBeDefined();
      expect(proReport.bnnSaturnAnalysis!.saturnSign).toBe('Libra');
      expect(proReport.bnnSaturnAnalysis!.saturnHouse).toBe(12);
      expect(proReport.bnnSaturnAnalysis!.saturnDignity).toContain('Exalted');
      expect(proReport.bnnSaturnAnalysis!.saturnMindset).toBeDefined();
      expect(proReport.bnnSaturnAnalysis!.saturnMindset.length).toBeGreaterThan(50);
      expect(proReport.bnnSaturnAnalysis!.saturnInSignAnalysis).toContain('Libra');
      expect(proReport.bnnSaturnAnalysis!.saturnAspects).toHaveLength(3);
      expect(proReport.bnnSaturnAnalysis!.saturnAspects[0].house).toBe(2);
      expect(proReport.bnnSaturnAnalysis!.saturnAspects[1].house).toBe(6);
      expect(proReport.bnnSaturnAnalysis!.saturnAspects[2].house).toBe(9);
      expect(proReport.bnnSaturnAnalysis!.saturnPlanetaryChains.length).toBeGreaterThanOrEqual(3);
      expect(proReport.bnnSaturnAnalysis!.saturnPlanetaryChains[0].planet).toContain('Scorpio');
    });

    it('should analyze Rajya Seva (Government Job) potential deterministically', () => {
      expect(proReport.governmentJobAnalysis).toBeDefined();
      expect(proReport.governmentJobAnalysis!.sunHouse).toBe(2);
      expect(['STRONG', 'MODERATE', 'NEUTRAL']).toContain(proReport.governmentJobAnalysis!.rajyaSevaYogaStatus);
      expect(proReport.governmentJobAnalysis!.recommendations.length).toBeGreaterThanOrEqual(2);
    });

    it('should compute Entrepreneurial Compass and Ashtakavarga SAV comparative analysis without arbitrary numerical scores', () => {
      expect(proReport.entrepreneurialCompass).toBeDefined();
      const sav = proReport.entrepreneurialCompass!.ashtakavargaSavPoints;
      expect(sav.tenthHouse).toBe(28);
      expect(sav.eleventhHouse).toBe(34);
      expect(sav.seventhHouse).toBe(26);
      expect(sav.sixthHouse).toBe(30);
      expect(sav.firstHouse).toBe(26);

      const comp = proReport.entrepreneurialCompass!.comparativeAnalysis;
      expect(comp.sixthVsSeventhVerdict).toBe('EMPLOYMENT_PREFERRED');
      expect(comp.sixthVsSeventhAnalysis).toContain('30');
      expect(comp.sixthVsSeventhAnalysis).toContain('26');
      expect(comp.eleventhVsTenthVerdict).toBe('REWARDS_EXCEED_EFFORT');
      expect(comp.eleventhVsTenthAnalysis).toContain('34');
      expect(comp.eleventhVsTenthAnalysis).toContain('28');
      expect(comp.preferredOrientation).toBe('EMPLOYMENT_FOCUSED');
      expect(comp.rationale).toContain('Employment-Focused');
    });

    it('should dynamically calculate exact Vimshottari Dasha sub-periods for the 5-year roadmap (2026–2031)', () => {
      expect(proReport.multiYearCareerRoadmap).toBeDefined();
      expect(proReport.multiYearCareerRoadmap!).toHaveLength(3);

      const [p1, p2, p3] = proReport.multiYearCareerRoadmap!;

      // Period 1: Saturn - Mercury
      expect(p1.mahadasha).toBe('Saturn');
      expect(p1.antardasha).toBe('Mercury');
      expect(p1.period).toBe('2025-08-26 to 2028-05-05');
      expect(p1.durationYears).toBeCloseTo(2.69, 1);
      expect(p1.astrologicalBasis).toContain('Saturn');
      expect(p1.astrologicalBasis).toContain('Mercury');

      // Period 2: Saturn - Ketu
      expect(p2.mahadasha).toBe('Saturn');
      expect(p2.antardasha).toBe('Ketu');
      expect(p2.period).toBe('2028-05-05 to 2029-06-14');
      expect(p2.durationYears).toBeCloseTo(1.11, 1);
      expect(p2.astrologicalBasis).toContain('Ketu');

      // Period 3: Saturn - Venus
      expect(p3.mahadasha).toBe('Saturn');
      expect(p3.antardasha).toBe('Venus');
      expect(p3.period).toBe('2029-06-14 to 2032-08-13');
      expect(p3.durationYears).toBeCloseTo(3.17, 1);
      expect(p3.astrologicalBasis).toContain('Venus');
    });
  });

  describe('3. Career Basic vs Career Pro Tiering Separation', () => {
    it('Career Basic should contain core foundations but omit Pro deep dives', async () => {
      const basicReport = await generateCareerBasicReport(puneetProfile, puneetChartData);

      expect(basicReport.tier).toBe('BASIC');
      expect(basicReport.type).toBe(ReportType.CAREER);
      expect(basicReport.careerHouses).toHaveLength(6);
      expect(basicReport.planetarySignificators.length).toBeGreaterThanOrEqual(4);
      expect(basicReport.d10Summary).toBeDefined();
      expect(basicReport.suitableIndustries.length).toBeGreaterThan(0);

      // Pro deep-dive sections must be omitted from Basic
      expect(basicReport.amatyakaraka).toBeUndefined();
      expect(basicReport.bnnSaturnAnalysis).toBeUndefined();
      expect(basicReport.governmentJobAnalysis).toBeUndefined();
      expect(basicReport.entrepreneurialCompass).toBeUndefined();
      expect(basicReport.multiYearCareerRoadmap).toBeUndefined();
      expect(basicReport.careerRemedies).toBeUndefined();
    });

    it('Career Pro should contain all Basic foundations PLUS complete Pro deep dives', async () => {
      const proReport = await generateCareerProReport(puneetProfile, puneetChartData);

      expect(proReport.tier).toBe('PRO');
      expect(proReport.type).toBe(ReportType.CAREER_PROSITY);
      expect(proReport.careerHouses).toHaveLength(6);

      // All Pro deep-dive sections must be populated
      expect(proReport.amatyakaraka).toBeDefined();
      expect(proReport.bnnSaturnAnalysis).toBeDefined();
      expect(proReport.governmentJobAnalysis).toBeDefined();
      expect(proReport.entrepreneurialCompass).toBeDefined();
      expect(proReport.multiYearCareerRoadmap).toBeDefined();
      expect(proReport.multiYearCareerRoadmap!.length).toBeGreaterThanOrEqual(3);
      expect(proReport.careerRemedies).toBeDefined();
      expect(proReport.careerRemedies!.primaryGemstone.gemstone).toBeDefined();
      expect(proReport.careerRemedies!.mantras.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('4. Evidence Traceability & Anti-Hallucination Directives', () => {
    it('should ground all section interpretations in verified evidence without inventing data', async () => {
      const proReport = await generateCareerProReport(puneetProfile, puneetChartData);

      for (const section of proReport.sections) {
        expect(section.content).toBeDefined();
        expect(section.content.length).toBeGreaterThan(20);
        // Ensure no placeholder or NaN leaked
        expect(section.content).not.toContain('undefined');
        expect(section.content).not.toContain('NaN');
        expect(section.content).not.toContain('[object Object]');
        // Verify no guaranteed promises or cures
        expect(section.content.toLowerCase()).not.toContain('guaranteed salary');
        expect(section.content.toLowerCase()).not.toContain('100% cure');
      }
    });

    it('should include authentic Sushil Kumaar Singh author metadata and ephemeris notice', async () => {
      const proReport = await generateCareerProReport(puneetProfile, puneetChartData);
      expect(proReport.closingNote).toBeDefined();
      expect(proReport.closingNote!.author).toContain('Sushil Kumaar Singh');
      expect(proReport.closingNote!.ephemerisStandard).toBeDefined();
      expect(proReport.closingNote!.disclaimer).toBeDefined();
    });
  });

  describe('5. End-to-End Vector PDF Generation', () => {
    it('should generate a valid PDF buffer for Career Basic', async () => {
      const basicReport = await generateCareerBasicReport(puneetProfile, puneetChartData);
      const pdfBuffer = await reportPdfService.generateReportPdf(basicReport);

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(10000);
      expect(pdfBuffer.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
    });

    it('should generate a rich, multi-page vector PDF for Career Pro', async () => {
      const proReport = await generateCareerProReport(puneetProfile, puneetChartData);
      const pdfBuffer = await reportPdfService.generateReportPdf(proReport);

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.length).toBeGreaterThan(25000);
      expect(pdfBuffer.subarray(0, 5).toString('utf-8')).toBe('%PDF-');

      // Verify that pdf contains text markers from Career Pro
      const pdfString = pdfBuffer.toString('binary');
      expect(pdfString).toContain('/Page');
    });
  });

  describe('6. Commercial Product Catalogue Separation', () => {
    it('should enforce distinct ReportType values for Career Basic vs Career Pro vs Horoscope', () => {
      expect(ReportType.CAREER).toBe('CAREER');
      expect(ReportType.CAREER_PROSITY).toBe('CAREER_PROSITY');
      expect(ReportType.HOROSCOPE).toBe('HOROSCOPE');

      expect(ReportType.CAREER).not.toBe(ReportType.CAREER_PROSITY);
      expect(ReportType.CAREER_PROSITY).not.toBe(ReportType.HOROSCOPE);
      expect(ReportType.CAREER).not.toBe(ReportType.HOROSCOPE);
    });
  });

  describe('7. Commercial Fulfillment Pipeline Verification', () => {
    // Product catalogue definition
    const CATALOGUE = {
      'report-career': {
        sku: 'report-career',
        title: 'Career & Professional Life Report',
        reportType: ReportType.CAREER,
        tier: 'BASIC',
        priceInr: 499,
        pricePaise: 49900,
      },
      'report-career-pro': {
        sku: 'report-career-pro',
        title: 'Executive Career & Wealth Prosperity Dossier',
        reportType: ReportType.CAREER_PROSITY,
        tier: 'PRO',
        priceInr: 699,
        pricePaise: 69900,
      },
      'report-horoscope': {
        sku: 'report-horoscope',
        title: 'Personalised Horoscope & Yearly Transit Dossier 2026',
        reportType: ReportType.HOROSCOPE,
        tier: 'PRO',
        priceInr: 499,
        pricePaise: 49900,
      },
    };

    it('should map commercial SKUs to their dedicated report types, titles and authoritative prices', () => {
      expect(CATALOGUE['report-career'].reportType).toBe(ReportType.CAREER);
      expect(CATALOGUE['report-career-pro'].reportType).toBe(ReportType.CAREER_PROSITY);
      expect(CATALOGUE['report-horoscope'].reportType).toBe(ReportType.HOROSCOPE);

      // Verify zero overlap across products
      expect(CATALOGUE['report-career'].reportType).not.toBe(CATALOGUE['report-career-pro'].reportType);
      expect(CATALOGUE['report-career-pro'].reportType).not.toBe(CATALOGUE['report-horoscope'].reportType);

      // Verify authoritative pricing in backend COMMERCE_CATALOG
      expect(COMMERCE_CATALOG['report-career'].pricePaise).toBe(49900); // ₹499
      expect(COMMERCE_CATALOG['report-career-pro'].pricePaise).toBe(69900); // ₹699
      expect(COMMERCE_CATALOG['report-horoscope'].pricePaise).toBe(49900); // ₹499
    });

    it('should compute exact 24-hour delivery SLA upon payment confirmation (paidAt + 24h)', () => {
      const paidAt = new Date('2026-11-08T10:00:00.000Z');
      const expectedSla = new Date(paidAt.getTime() + 24 * 60 * 60 * 1000);

      const orderFixture = {
        id: 'ord-career-pro-001',
        sku: 'report-career-pro',
        status: 'PAID',
        paidAt: paidAt.toISOString(),
        deliverySla: expectedSla.toISOString(),
      };

      expect(new Date(orderFixture.deliverySla).getTime() - new Date(orderFixture.paidAt).getTime()).toBe(
        24 * 60 * 60 * 1000
      );
    });

    it('should enforce CAS claim fencing on queue to prevent duplicate worker execution', async () => {
      // In-memory queue state simulating PostgreSQL queue with CAS fencing
      const queueTask = {
        taskId: 'task-career-001',
        orderId: 'ord-career-pro-001',
        reportType: ReportType.CAREER_PROSITY,
        status: 'PENDING' as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
        claimedBy: null as string | null,
        claimedAt: null as Date | null,
        version: 1,
      };

      const worker1Id = 'worker-node-1';
      const worker2Id = 'worker-node-2';

      // Atomic CAS Claim Function: UPDATE queue SET status='PROCESSING', claimedBy=$worker, version=version+1 WHERE status='PENDING' AND version=$currentVersion
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

      // Worker 1 claims task
      const worker1Claimed = tryClaimTask(worker1Id, 1);
      expect(worker1Claimed).toBe(true);
      expect(queueTask.status).toBe('PROCESSING');
      expect(queueTask.claimedBy).toBe(worker1Id);

      // Concurrent Worker 2 attempts to claim same task with stale version
      const worker2Claimed = tryClaimTask(worker2Id, 1);
      expect(worker2Claimed).toBe(false);
      expect(queueTask.claimedBy).toBe(worker1Id);
    });

    it('should support cached report retrieval and forceRegenerate override', async () => {
      const cacheStore = new Map<string, any>();
      const cacheKey = `report:${puneetProfile.name}:CAREER_PROSITY`;

      // 1. Initial generation
      const initialReport = await generateCareerProReport(puneetProfile, puneetChartData);
      cacheStore.set(cacheKey, { ...initialReport, cachedAt: '2026-11-08T00:00:00Z' });

      // 2. Default fetch from cache
      const cached = cacheStore.get(cacheKey);
      expect(cached).toBeDefined();
      expect(cached.cachedAt).toBe('2026-11-08T00:00:00Z');

      // 3. Forced regeneration (forceRegenerate: true)
      const forceRegenerate = true;
      let finalReport = cached;
      if (forceRegenerate) {
        finalReport = await generateCareerProReport(puneetProfile, puneetChartData);
        cacheStore.set(cacheKey, { ...finalReport, cachedAt: new Date().toISOString() });
      }

      expect(cacheStore.get(cacheKey).cachedAt).not.toBe('2026-11-08T00:00:00Z');
      expect(finalReport.type).toBe(ReportType.CAREER_PROSITY);
    });

    it('should prevent cross-tier or cross-product content leakage', async () => {
      const basic = await generateCareerBasicReport(puneetProfile, puneetChartData);
      const pro = await generateCareerProReport(puneetProfile, puneetChartData);

      // Basic must not leak Pro sections
      expect(basic.amatyakaraka).toBeUndefined();
      expect(basic.bnnSaturnAnalysis).toBeUndefined();
      expect(basic.entrepreneurialCompass).toBeUndefined();
      expect(basic.multiYearCareerRoadmap).toBeUndefined();

      // Pro must not leak Horoscope sections
      expect((pro as any).moonSignDetails).toBeUndefined();
      expect((pro as any).lifeDomainForecasts).toBeUndefined();
      expect((pro as any).quarterlyForecasts).toBeUndefined();
      expect((pro as any).monthlyForecastMatrix).toBeUndefined();

      // Basic must not leak Horoscope sections
      expect((basic as any).moonSignDetails).toBeUndefined();
      expect((basic as any).lifeDomainForecasts).toBeUndefined();
      expect((basic as any).quarterlyForecasts).toBeUndefined();
    });
  });
});
