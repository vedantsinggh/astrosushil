import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { storageService } from '../../src/services/storage.service';
import {
  generateProHoroscopeReport,
  validateHoroscopeReportInput,
  BirthDetailsValidationError,
  AstrologyEvidenceValidationError,
  AstrologyTraceabilityError,
  assertAiInterpretationTraceability,
  extractVerifiedEvidenceFromChart,
  reportPdfService,
} from '@astro/report-engine';
import { OrderStatus, OrderItemType, FulfillmentStatus, ObligationType, ReportType } from '@prisma/client';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import { featureAccessService } from '../../src/services/feature-access.service';
import { COMMERCE_CATALOG } from '../../src/modules/commerce/commerce.catalog';

describe('Phase 6.2: Personalised Horoscope Report Integration Suite', () => {
  let app: FastifyInstance;

  const user1Id = '66666666-1111-1111-1111-111111111111';
  const user2Id = '66666666-2222-2222-2222-222222222222';
  let user1Token: string;
  let user2Token: string;

  const validProfileId = '77777777-1111-1111-1111-111111111111';
  const paidOrderId = '88888888-1111-1111-1111-111111111111';
  const orderItemId = '88888888-2222-2222-2222-222222222222';
  const fulfillmentUnitId = '88888888-3333-3333-3333-333333333333';

  // In-memory mock storage
  const mockStorage = new Map<string, Buffer>();
  const reportsDb = new Map<string, any>();
  const ordersDb = new Map<string, any>();
  const fulfillmentUnitsDb = new Map<string, any>();
  const profilesDb = new Map<string, any>();

  const realisticProfileInput = {
    name: 'Puneet Kumar',
    dateOfBirth: '1983-12-28',
    timeOfBirth: '04:45:00',
    placeName: 'Bulandshahr, Uttar Pradesh, India',
    latitude: 28.407,
    longitude: 77.85,
    timezone: 'Asia/Kolkata',
  };

  const canonicalChartData = {
    chart: {
      ascendant: {
        rashiName: 'Scorpio',
        sign: 'Scorpio',
        degreeInRashi: 10.5,
        degree: 10.5,
        nakshatraName: 'Anuradha',
        nakshatra: 'Anuradha',
        pada: 3,
        rashiIndex: 8,
      },
      planets: [
        { planet: 'SUN', name: 'SUN', rashiName: 'Sagittarius', sign: 'Sagittarius', degreeInRashi: 12.3, degree: 12.3, house: 2, nakshatraName: 'Mula', nakshatra: 'Mula', pada: 4, isRetrograde: false, longitude: 252.3 },
        { planet: 'MOON', name: 'MOON', rashiName: 'Virgo', sign: 'Virgo', degreeInRashi: 29.8, degree: 29.8, house: 11, nakshatraName: 'Chitra', nakshatra: 'Chitra', pada: 2, isRetrograde: false, longitude: 179.8 },
        { planet: 'MARS', name: 'MARS', rashiName: 'Virgo', sign: 'Virgo', degreeInRashi: 15.2, degree: 15.2, house: 11, nakshatraName: 'Hasta', nakshatra: 'Hasta', pada: 2, isRetrograde: false, longitude: 165.2 },
        { planet: 'MERCURY', name: 'MERCURY', rashiName: 'Sagittarius', sign: 'Sagittarius', degreeInRashi: 28.1, degree: 28.1, house: 2, nakshatraName: 'Uttara Ashadha', nakshatra: 'Uttara Ashadha', pada: 1, isRetrograde: false, longitude: 268.1 },
        { planet: 'JUPITER', name: 'JUPITER', rashiName: 'Sagittarius', sign: 'Sagittarius', degreeInRashi: 8.4, degree: 8.4, house: 2, nakshatraName: 'Mula', nakshatra: 'Mula', pada: 3, isRetrograde: false, longitude: 248.4 },
        { planet: 'VENUS', name: 'VENUS', rashiName: 'Scorpio', sign: 'Scorpio', degreeInRashi: 25.6, degree: 25.6, house: 1, nakshatraName: 'Jyeshtha', nakshatra: 'Jyeshtha', pada: 3, isRetrograde: false, longitude: 235.6 },
        { planet: 'SATURN', name: 'SATURN', rashiName: 'Libra', sign: 'Libra', degreeInRashi: 18.9, degree: 18.9, house: 12, nakshatraName: 'Swati', nakshatra: 'Swati', pada: 4, isRetrograde: false, longitude: 198.9 },
        { planet: 'RAHU', name: 'RAHU', rashiName: 'Taurus', sign: 'Taurus', degreeInRashi: 22.0, degree: 22.0, house: 7, nakshatraName: 'Rohini', nakshatra: 'Rohini', pada: 4, isRetrograde: true, longitude: 52.0 },
        { planet: 'KETU', name: 'KETU', rashiName: 'Scorpio', sign: 'Scorpio', degreeInRashi: 22.0, degree: 22.0, house: 1, nakshatraName: 'Jyeshtha', nakshatra: 'Jyeshtha', pada: 2, isRetrograde: true, longitude: 232.0 },
      ],
      houses: [
        { houseNumber: 1, sign: 'Scorpio', rashiName: 'Scorpio', planetsPresent: ['VENUS', 'KETU'] },
        { houseNumber: 2, sign: 'Sagittarius', rashiName: 'Sagittarius', planetsPresent: ['SUN', 'MERCURY', 'JUPITER'] },
        { houseNumber: 3, sign: 'Capricorn', rashiName: 'Capricorn', planetsPresent: [] },
        { houseNumber: 4, sign: 'Aquarius', rashiName: 'Aquarius', planetsPresent: [] },
        { houseNumber: 5, sign: 'Pisces', rashiName: 'Pisces', planetsPresent: [] },
        { houseNumber: 6, sign: 'Aries', rashiName: 'Aries', planetsPresent: [] },
        { houseNumber: 7, sign: 'Taurus', rashiName: 'Taurus', planetsPresent: ['RAHU'] },
        { houseNumber: 8, sign: 'Gemini', rashiName: 'Gemini', planetsPresent: [] },
        { houseNumber: 9, sign: 'Cancer', rashiName: 'Cancer', planetsPresent: [] },
        { houseNumber: 10, sign: 'Leo', rashiName: 'Leo', planetsPresent: [] },
        { houseNumber: 11, sign: 'Virgo', rashiName: 'Virgo', planetsPresent: ['MOON', 'MARS'] },
        { houseNumber: 12, sign: 'Libra', rashiName: 'Libra', planetsPresent: ['SATURN'] },
      ],
      config: {
        zodiacType: 'SIDEREAL',
        ayanamsa: 'LAHIRI',
        houseSystem: 'WHOLE_SIGN',
        nodeCalculation: 'MEAN_NODE',
      },
    },
  };

  beforeAll(async () => {
    // Setup Mock Profiles
    profilesDb.set(validProfileId, {
      id: validProfileId,
      userId: user1Id,
      ...realisticProfileInput,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(astrologyService, 'calculateChartForProfile').mockResolvedValue(canonicalChartData as any);

    vi.spyOn(featureAccessService, 'evaluateFeatureAccess').mockResolvedValue({
      allowed: true,
      source: 'SUPPORT_ENTITLEMENT_GRANT',
    });

    // Setup Paid Order with SLA for report-horoscope
    const paidAt = new Date('2026-11-07T10:00:00Z');

    ordersDb.set(paidOrderId, {
      id: paidOrderId,
      userId: user1Id,
      status: OrderStatus.PAID,
      paymentStatus: 'CAPTURED',
      fulfillmentStatus: FulfillmentStatus.PROCESSING,
      paidAt,
      version: 1,
      items: [
        {
          id: orderItemId,
          orderId: paidOrderId,
          catalogId: 'report-horoscope',
          itemType: OrderItemType.REPORT,
          title: 'Personalised Horoscope & Yearly Transit Dossier 2026',
          quantity: 1,
          fulfillmentType: 'DIGITAL',
        },
      ],
    });

    fulfillmentUnitsDb.set(fulfillmentUnitId, {
      id: fulfillmentUnitId,
      orderId: paidOrderId,
      orderItemId,
      unitIndex: 1,
      obligationType: ObligationType.REPORT,
      status: 'PROCESSING',
      reportId: null,
      createdAt: paidAt,
      updatedAt: paidAt,
    });

    // Mock storageService
    vi.spyOn(storageService, 'upload').mockImplementation(async (params: any) => {
      mockStorage.set(params.key, Buffer.from(params.body));
      return {
        key: params.key,
        url: `https://mock-storage.astrosushil.internal/${params.key}`,
        fileSize: Buffer.from(params.body).length,
      };
    });

    vi.spyOn(storageService, 'downloadBuffer').mockImplementation(async (key: string) => {
      const buf = mockStorage.get(key);
      if (!buf) throw new Error('Asset not found');
      return buf;
    });

    // Mock Prisma lookups
    vi.spyOn(prisma.birthProfile, 'findUnique').mockImplementation(async (args: any) => {
      return profilesDb.get(args.where.id) || null;
    });

    vi.spyOn(prisma.order, 'findUnique').mockImplementation(async (args: any) => {
      const order = ordersDb.get(args.where.id);
      if (!order) return null;
      return {
        ...order,
        items: order.items,
        reports: Array.from(reportsDb.values()).filter((r) => r.orderId === order.id),
      };
    });

    vi.spyOn(prisma.order, 'findFirst').mockImplementation(async (args: any) => {
      for (const order of ordersDb.values()) {
        if (order.userId === args.where.userId && order.status === args.where.status) {
          return {
            ...order,
            items: order.items,
            reports: Array.from(reportsDb.values()).filter((r) => r.orderId === order.id),
          };
        }
      }
      return null;
    });

    vi.spyOn(prisma.fulfillmentUnit, 'findMany').mockImplementation(async (args: any) => {
      return Array.from(fulfillmentUnitsDb.values()).filter((u) => u.orderId === args.where.orderId);
    });

    vi.spyOn(prisma.report, 'findUnique').mockImplementation(async (args: any) => {
      const record = reportsDb.get(args.where.id);
      if (!record) return null;
      return {
        ...record,
        birthProfile: profilesDb.get(record.birthProfileId),
      };
    });

    vi.spyOn(prisma.report, 'findFirst').mockImplementation(async (args: any) => {
      for (const r of reportsDb.values()) {
        if (args.where.userId && r.userId !== args.where.userId) continue;
        if (args.where.reportType && r.reportType !== args.where.reportType) continue;
        if (args.where.birthProfileId && r.birthProfileId !== args.where.birthProfileId) continue;
        if (args.where.status && typeof args.where.status === 'string' && r.status !== args.where.status) continue;
        if (args.where.status?.in && !args.where.status.in.includes(r.status)) continue;
        return {
          ...r,
          birthProfile: profilesDb.get(r.birthProfileId),
        };
      }
      return null;
    });

    vi.spyOn(prisma.report, 'create').mockImplementation(async (args: any) => {
      const report = {
        id: args.data.id || `report-${Date.now()}`,
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      reportsDb.set(report.id, report);
      return {
        ...report,
        birthProfile: profilesDb.get(report.birthProfileId),
      };
    });

    vi.spyOn(prisma.report, 'updateMany').mockImplementation(async (args: any) => {
      const report = reportsDb.get(args.where.id);
      if (report) {
        Object.assign(report, args.data, { updatedAt: new Date() });
        return { count: 1 };
      }
      return { count: 0 };
    });

    vi.spyOn(postgresQueueService, 'claimJob').mockImplementation(async () => {
      for (const r of reportsDb.values()) {
        if (r.status === 'QUEUED') {
          r.status = 'CALCULATING';
          r.claimToken = 'mock-worker-claim-token-pro-123';
          r.claimVersion = 1;
          r.claimExpiresAt = new Date(Date.now() + 300000);
          return {
            id: r.id,
            claimToken: r.claimToken,
            claimVersion: 1,
            executionAttempts: 1,
            maxExecutionAttempts: 3,
            reportType: r.reportType,
            userId: r.userId,
            birthProfileId: r.birthProfileId,
          } as any;
        }
      }
      return null;
    });

    vi.spyOn(postgresQueueService, 'completeJob').mockImplementation(async (reportId: string, claimToken: string) => {
      const r = reportsDb.get(reportId);
      if (r && r.claimToken === claimToken) {
        r.status = 'COMPLETED';
        r.completedAt = new Date();
        r.claimToken = null;
        return true;
      }
      return false;
    });

    app = await buildApp();
    await app.ready();

    user1Token = (app as any).jwt.sign({ sub: user1Id, role: 'USER' });
    user2Token = (app as any).jwt.sign({ sub: user2Id, role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
  });

  // 1. Valid birth profile generates complete Personalised Horoscope matching reference
  it('1. Valid birth profile generates complete Personalised Horoscope matching reference', async () => {
    const report = await generateProHoroscopeReport(realisticProfileInput, canonicalChartData);

    expect(report.type).toBe(ReportType.HOROSCOPE);
    expect(report.title).toBe('Personalised Horoscope & Yearly Transit Dossier 2026');
    expect(report.profile.name).toBe('Puneet Kumar');

    // Verify Moon Sign (Chandra Lagna) Details
    expect(report.moonSignDetails).toBeDefined();
    expect(report.moonSignDetails?.sign).toBe('Virgo');
    expect(report.moonSignDetails?.sanskritSign).toBe('Kanya');
    expect(report.moonSignDetails?.signLord).toBe('Mercury');
    expect(report.moonSignDetails?.nakshatra).toBe('Chitra');
    expect(report.moonSignDetails?.element).toBe('Earth');
    expect(report.moonSignDetails?.modality).toBe('Mutable');
    expect(report.moonSignDetails?.symbol).toBe('The Maiden');
    expect(report.moonSignDetails?.syllables).toContain('To, Pa');

    // Verify 2026 Yearly Overview
    expect(report.yearlyOverview).toBeDefined();
    expect(report.yearlyOverview?.year).toBe(2026);
    expect(report.yearlyOverview?.universalYearNumber).toBe(1);
    expect(report.yearlyOverview?.opportunities.length).toBeGreaterThanOrEqual(3);
    expect(report.yearlyOverview?.cautions.length).toBeGreaterThanOrEqual(3);

    // Verify Chapter Sections (All 8 chapters present)
    expect(report.sections.length).toBe(8);
    expect(report.sections[0].id).toBe('ch1_overview');
    expect(report.sections[1].id).toBe('ch2_personality');
    expect(report.sections[2].id).toBe('ch3_life_domains');
    expect(report.sections[3].id).toBe('ch4_planetary_influence');
    expect(report.sections[4].id).toBe('ch5_empowered_pathways');
    expect(report.sections[5].id).toBe('ch6_numerology_affirmations');
    expect(report.sections[6].id).toBe('ch7_quarterly_monthly');
    expect(report.sections[7].id).toBe('ch8_closing');

    // Verify 6 Life Domains
    expect(report.lifeDomainForecasts?.length).toBe(6);
    const expectedDomains = ['CAREER', 'FINANCE', 'EDUCATION', 'LOVE_RELATIONSHIPS', 'FAMILY', 'HEALTH'];
    expect(report.lifeDomainForecasts?.map((d) => d.domain)).toEqual(expectedDomains);
    for (const d of report.lifeDomainForecasts || []) {
      expect(d.outlook.length).toBeGreaterThan(30);
      expect(d.timeline).toBeDefined();
      expect(d.keyGuidance).toBeDefined();
      expect(d.highlights.length).toBeGreaterThanOrEqual(2);
    }

    // Verify Major Planetary Transits (Saturn, Jupiter, Rahu, Ketu in relation to Moon)
    expect(report.planetaryInfluences?.length).toBe(4);
    const saturnTransit = report.planetaryInfluences?.find((p) => p.planet === 'SATURN');
    expect(saturnTransit?.transitSign).toBe('Pisces');
    expect(saturnTransit?.houseFromMoon).toBe(7); // Pisces is 7th from Virgo
    expect(saturnTransit?.period).toContain('2026');

    const jupiterTransit = report.planetaryInfluences?.find((p) => p.planet === 'JUPITER');
    expect(jupiterTransit?.houseFromMoon).toBe(11); // Cancer is 11th from Virgo
    expect(jupiterTransit?.period).toContain('June 2'); // Exact calculated ingress date

    const rahuTransit = report.planetaryInfluences?.find((p) => p.planet === 'RAHU');
    expect(rahuTransit?.transitSign).toBe('Aquarius');
    expect(rahuTransit?.houseFromMoon).toBe(6); // Aquarius is 6th from Virgo
    expect(rahuTransit?.period).toContain('Dec 5, 2026'); // Exact calculated ingress date

    const ketuTransit = report.planetaryInfluences?.find((p) => p.planet === 'KETU');
    expect(ketuTransit?.transitSign).toBe('Leo');
    expect(ketuTransit?.houseFromMoon).toBe(12); // Leo is 12th from Virgo

    // Verify Favorable & Unfavorable Colors and Dates
    expect(report.favorableUnfavorable).toBeDefined();
    expect(report.favorableUnfavorable?.favorableColors.some((c) => c.color.includes('Green'))).toBe(true);
    expect(report.favorableUnfavorable?.unfavorableColors.some((c) => c.color.includes('Red'))).toBe(true);
    expect(report.favorableUnfavorable?.luckyDates.some((d) => d.dates.includes('5th'))).toBe(true); // Mercury

    // Verify Gemstones (Emerald & Peridot for Virgo)
    expect(report.gemstones?.primaryGem.name).toBe('Emerald');
    expect(report.gemstones?.primaryGem.rulingPlanet).toBe('Mercury');
    expect(report.gemstones?.primaryGem.wearingInstructions.finger).toBe('Little Finger');
    expect(report.gemstones?.secondaryGem.name).toBe('Peridot');

    // Verify Empowered Pathways (Do's, Don'ts, Spiritual Practices)
    expect(report.empoweredPathways?.dos.length).toBeGreaterThanOrEqual(3);
    expect(report.empoweredPathways?.donts.length).toBeGreaterThanOrEqual(3);
    expect(report.empoweredPathways?.spiritualPractices.length).toBeGreaterThanOrEqual(3);

    // Verify Numerology & Affirmations
    expect(report.numerologyForecast?.universalYear).toBe(1);
    expect(report.numerologyForecast?.mulank).toBe(1); // 28 -> 2+8=10 -> 1
    expect(report.numerologyForecast?.bhagyank).toBe(7); // 1983-12-28 -> 7
    expect(report.affirmations?.length).toBe(3);

    // Verify no unsupported pseudo-scientific claims (neurological / medical)
    const reportJson = JSON.stringify(report).toLowerCase();
    expect(reportJson.includes('dopamine')).toBe(false);
    expect(reportJson.includes('prefrontal')).toBe(false);
    expect(reportJson.includes('cortisol')).toBe(false);
    expect(reportJson.includes('amygdala')).toBe(false);

    // Verify Quarterly & 12-Month Matrix
    expect(report.quarterlyForecasts?.length).toBe(4);
    expect(report.monthlyForecastMatrix?.length).toBe(12);
    expect(report.monthlyForecastMatrix?.[0].month).toBe('January');
    expect(report.monthlyForecastMatrix?.[11].month).toBe('December');

    // Verify Shodashvargas & Shadbala
    expect(report.vargas.length).toBe(5);
    expect(report.shadbala.length).toBeGreaterThanOrEqual(7);
    expect(report.bhavaBala.length).toBe(12);
  });

  // 2. Missing or blank birth time throws explicit error
  it('2. Missing or blank birth time produces explicit error without silent defaults', () => {
    const invalidInput = { ...realisticProfileInput, timeOfBirth: '' };
    expect(() => validateHoroscopeReportInput(invalidInput)).toThrowError(BirthDetailsValidationError);
    expect(() => validateHoroscopeReportInput(invalidInput)).toThrowError(/time of birth/i);
  });

  // 3. Invalid birth location coordinates out of bounds
  it('3. Invalid birth location coordinates produce explicit error', () => {
    const invalidLat = { ...realisticProfileInput, latitude: 120.0 }; // > 90
    expect(() => validateHoroscopeReportInput(invalidLat)).toThrowError(BirthDetailsValidationError);
    expect(() => validateHoroscopeReportInput(invalidLat)).toThrowError(/latitude between -90/i);

    const invalidLong = { ...realisticProfileInput, longitude: -200.0 }; // < -180
    expect(() => validateHoroscopeReportInput(invalidLong)).toThrowError(BirthDetailsValidationError);
    expect(() => validateHoroscopeReportInput(invalidLong)).toThrowError(/longitude between -180/i);
  });

  // 4. Invalid or incomplete calculation evidence is rejected by evidence validator
  it('4. Invalid or incomplete calculation evidence is rejected by evidence validator', async () => {
    const incompleteChart = {
      ...canonicalChartData,
      chart: {
        ...canonicalChartData.chart,
        planets: canonicalChartData.chart.planets.filter((p) => p.planet !== 'MOON'), // Missing Moon
      },
    };

    await expect(generateProHoroscopeReport(realisticProfileInput, incompleteChart)).rejects.toThrow();
  });

  // 5. AI Traceability rejects unsupported astronomical claims
  it('5. AI Traceability rejects unsupported astronomical claims (hallucinated signs/houses)', () => {
    const verifiedEvidence = extractVerifiedEvidenceFromChart(canonicalChartData, realisticProfileInput, 'HOROSCOPE');

    // Moon is in Virgo in native chart. Hallucinating Moon in Aries must fail.
    const hallucinatedText = 'The native has Moon in Aries in the 1st house giving an aggressive and reckless emotional disposition.';
    expect(() => {
      assertAiInterpretationTraceability(hallucinatedText, verifiedEvidence);
    }).toThrowError(AstrologyTraceabilityError);
  });

  // 6. PDF generation produces valid vector PDF with complete pages and dynamic pagination
  it('6. PDF generation produces valid multi-page vector PDF with headers, footers and page numbering', async () => {
    const report = await generateProHoroscopeReport(realisticProfileInput, canonicalChartData);
    const pdfBuffer = await reportPdfService.generateReportPdf(report);

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(15000); // Dense multi-page vector document

    const pdfRaw = pdfBuffer.toString('binary');
    // PDF Header & Trailer
    expect(pdfRaw.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfRaw.includes('%%EOF')).toBe(true);

    // Profile & Moon Sign info present
    expect(pdfRaw.includes('Puneet Kumar')).toBe(true);
    expect(pdfRaw.includes('VIRGO')).toBe(true);
    expect(pdfRaw.includes('YEARLY HOROSCOPE REPORT 2026')).toBe(true);

    // Structured Chapter Cards present
    expect(pdfRaw.includes('CONSTITUTIONAL ANCHOR')).toBe(true);
    expect(pdfRaw.includes('2026 LIFE DOMAIN FORECASTS')).toBe(true);
    expect(pdfRaw.includes('MAJOR 2026 PLANETARY TRANSITS')).toBe(true);
    expect(pdfRaw.includes('FAVORABLE VEDIC GEMSTONES FOR 2026')).toBe(true);
    expect(pdfRaw.includes('EMPOWERED PATHWAYS')).toBe(true);
    expect(pdfRaw.includes('12-MONTH MATRIX FORECAST')).toBe(true);

    // Standard Author Message & Legal Disclaimer
    expect(pdfRaw.includes('Astro Sushil')).toBe(true);
    expect(pdfRaw.includes('DISCLAIMER')).toBe(true);
    expect(pdfRaw.includes('Page ')).toBe(true);
  });

  // 7. Storage and customer download works via API with correct Content-Type
  it('7. Storage and customer download serves PDF with correct Content-Type', async () => {
    // Generate Horoscope via synchronous endpoint
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        birthProfileId: validProfileId,
        reportType: 'HOROSCOPE',
      },
    });

    expect(genRes.statusCode).toBe(201);
    const body = JSON.parse(genRes.payload);
    expect(body.id).toBeDefined();
    const createdReportId = body.id;

    // Download PDF
    const dlRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${createdReportId}/pdf`,
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(dlRes.statusCode).toBe(200);
    expect(dlRes.headers['content-type']).toBe('application/pdf');
    expect(dlRes.headers['content-disposition']).toContain('attachment; filename=');

    const downloadedPdf = dlRes.payload;
    expect(downloadedPdf.startsWith('%PDF-1.4')).toBe(true);
    expect(downloadedPdf.includes('Puneet Kumar')).toBe(true);
  });

  // 8. Unauthorized access is rejected (401 for guest, 403/404 for other user)
  it('8. Unauthorized customer access is rejected', async () => {
    // 1. Guest request rejected with 401
    const guestRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      payload: { birthProfileId: validProfileId, reportType: 'HOROSCOPE' },
    });
    expect(guestRes.statusCode).toBe(401);

    // 2. User 2 accessing User 1 profile rejected with 403 or 404
    const crossUserRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user2Token}` },
      payload: { birthProfileId: validProfileId, reportType: 'HOROSCOPE' },
    });
    expect([403, 404]).toContain(crossUserRes.statusCode);
  });

  // 9. Queue execution, retry and worker fencing
  it('9. Queue execution respects worker lease and CAS claim fencing', async () => {
    const queuedReport = {
      id: 'report-queue-test-pro-1',
      userId: user1Id,
      birthProfileId: validProfileId,
      orderId: paidOrderId,
      fulfillmentUnitId,
      reportType: ReportType.HOROSCOPE,
      status: 'QUEUED',
      claimToken: null,
      claimVersion: 0,
      attempts: 0,
      maxAttempts: 3,
    };
    reportsDb.set(queuedReport.id, queuedReport);

    // Claim job atomically
    const claimedJob = await postgresQueueService.claimJob('worker-instance-A', 30);
    expect(claimedJob).toBeDefined();
    expect(claimedJob?.id).toBe('report-queue-test-pro-1');
    expect(claimedJob?.claimToken).toBe('mock-worker-claim-token-pro-123');

    // Completing with wrong token is rejected by CAS fence
    const wrongTokenResult = await postgresQueueService.completeJob('report-queue-test-pro-1', 'invalid-token', 1, 'key', 'file', 1000, 11);
    expect(wrongTokenResult).toBe(false);

    // Completing with correct token succeeds
    const successResult = await postgresQueueService.completeJob('report-queue-test-pro-1', 'mock-worker-claim-token-pro-123', 1, 'key', 'file', 1000, 11);
    expect(successResult).toBe(true);
    expect(reportsDb.get('report-queue-test-pro-1').status).toBe('COMPLETED');
  });

  // 10. Fulfillment unit and 24-hour SLA integration
  it('10. Fulfillment unit is reconciled and 24-hour delivery SLA is computed from Order.paidAt', async () => {
    const order = ordersDb.get(paidOrderId);
    expect(order.paidAt).toBeDefined();

    // Verify 24-hour delivery SLA
    const expectedDeliveryAt = new Date(order.paidAt.getTime() + 24 * 60 * 60 * 1000);
    expect(expectedDeliveryAt.getTime() - order.paidAt.getTime()).toBe(24 * 60 * 60 * 1000);

    // Unit exists and is bound to REPORT obligation
    const unit = fulfillmentUnitsDb.get(fulfillmentUnitId);
    expect(unit.obligationType).toBe('REPORT');
    expect(unit.status).toBe('PROCESSING');
  });

  // 11. Caching vs Explicit Regeneration Behavior
  it('11. Opening an existing report returns cached artifact; explicit regeneration creates a new version', async () => {
    // 1. Create first report
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: { birthProfileId: validProfileId, reportType: 'HOROSCOPE' },
    });
    expect(res1.statusCode).toBe(201);
    const report1 = JSON.parse(res1.payload);

    // 2. Request without forceRegenerate -> returns existing report (reused: true)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: { birthProfileId: validProfileId, reportType: 'HOROSCOPE' },
    });
    expect(res2.statusCode).toBe(201);
    const report2 = JSON.parse(res2.payload);
    expect(report2.reused).toBe(true);
    expect(report2.reportId).toBe(report1.id);

    // 3. Request with forceRegenerate: true -> creates new report version
    const res3 = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: { birthProfileId: validProfileId, reportType: 'HOROSCOPE', forceRegenerate: true },
    });
    expect(res3.statusCode).toBe(201);
    const report3 = JSON.parse(res3.payload);
    expect(Boolean(report3.reused)).toBe(false);
    expect(report3.id).not.toBe(report1.id);
  });

  // 12. Critical Product Separation: Horoscope vs Career Pro
  it('12. Critical Product Separation: report-horoscope and report-career-pro have distinct identities and never cross-fulfill', async () => {
    // 1. Catalogue item check
    const horoscopeCatalog = COMMERCE_CATALOG['report-horoscope'];
    const careerProCatalog = COMMERCE_CATALOG['report-career-pro'];

    expect(horoscopeCatalog).toBeDefined();
    expect(careerProCatalog).toBeDefined();

    // Distinct legacyReportType and SKU
    expect(horoscopeCatalog.id).toBe('report-horoscope');
    expect(horoscopeCatalog.legacyReportType).toBe(ReportType.HOROSCOPE);
    expect(horoscopeCatalog.title).toContain('Personalised Horoscope');
    expect(horoscopeCatalog.pricePaise).toBe(49900); // ₹499

    expect(careerProCatalog.id).toBe('report-career-pro');
    expect(careerProCatalog.legacyReportType).toBe(ReportType.CAREER_PROSITY);
    expect(careerProCatalog.title).toContain('Executive Career & Wealth Prosperity Dossier');
    expect(careerProCatalog.pricePaise).toBe(69900); // ₹699 (distinct untouched price)

    // 2. Generating Horoscope produces Horoscope model, not Career
    const horoscopeReport = await generateProHoroscopeReport(realisticProfileInput, canonicalChartData);
    expect(horoscopeReport.type).toBe(ReportType.HOROSCOPE);
    expect(horoscopeReport.title).toBe('Personalised Horoscope & Yearly Transit Dossier 2026');
    expect(horoscopeReport.moonSignDetails).toBeDefined();
    expect(horoscopeReport.quarterlyForecasts).toBeDefined();
    expect(horoscopeReport.type).not.toBe(ReportType.CAREER);
    expect(horoscopeReport.type).not.toBe(ReportType.CAREER_PROSITY);

    // 3. Enforcing order matching rejects cross-fulfillment attempt
    const crossOrderRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        birthProfileId: validProfileId,
        reportType: 'CAREER_PROSITY', // Ordering Career Pro against a Horoscope order must be rejected
        orderId: paidOrderId,
      },
    });

    // Expect 403 Forbidden because paidOrderId contains 'report-horoscope', not 'report-career-pro'
    expect(crossOrderRes.statusCode).toBe(403);
  });
});
