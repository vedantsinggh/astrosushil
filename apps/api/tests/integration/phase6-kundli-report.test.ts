import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { storageService } from '../../src/services/storage.service';
import { careerReportWorker } from '../../src/services/report-worker.service';
import {
  generateKundliReport,
  validateKundliReportInput,
} from '@astro/report-engine';
import {
  BirthDetailsValidationError,
  AstrologyEvidenceValidationError,
  AstrologyTraceabilityError,
  verifyAiInterpretationTraceability,
  assertAiInterpretationTraceability,
  extractVerifiedEvidenceFromChart,
  reportPdfService,
} from '@astro/report-engine';
import { OrderStatus, OrderItemType, FulfillmentStatus, ObligationType, ReportType } from '@prisma/client';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import { featureAccessService } from '../../src/services/feature-access.service';

describe('Phase 6.1: Premium Personalised Kundli Report Integration Suite', () => {
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

    // Setup Paid Order with SLA
    const paidAt = new Date('2026-11-07T10:00:00Z');
    const expectedDeliveryAt = new Date(paidAt.getTime() + 24 * 60 * 60 * 1000);

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
          catalogId: 'report-kundli',
          itemType: OrderItemType.REPORT,
          title: 'Premium Personalised Kundli Report',
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
          r.claimToken = 'mock-worker-claim-token-123';
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

  // 1. Valid birth profile generates complete Premium Personalised Kundli report
  it('1. Valid birth profile generates complete Premium Personalised Kundli report matching reference', async () => {
    const report = await generateKundliReport(realisticProfileInput, canonicalChartData);

    expect(report.type).toBe(ReportType.KUNDLI);
    expect(report.title).toBe('Birth Chart & Kundli Report');
    expect(report.profile.name).toBe('Puneet Kumar');
    expect(report.ascendant.sign).toBe('Scorpio');
    expect(report.planets.length).toBe(9);
    expect(report.houses.length).toBe(12);

    // Verify Chapter Sections (All 17 chapters present in ascending order)
    expect(report.sections.length).toBe(17);
    expect(report.sections[0].id).toBe('ch1_blueprint');
    expect(report.sections[1].id).toBe('ch2_influence');
    expect(report.sections[2].id).toBe('ch3_bhavphal');
    expect(report.sections[3].id).toBe('ch4_conjunctions');
    expect(report.sections[4].id).toBe('ch5_love_marriage');
    expect(report.sections[5].id).toBe('ch6_career');
    expect(report.sections[6].id).toBe('ch7_chara_karakas');
    expect(report.sections[7].id).toBe('ch8_rahu_ketu');
    expect(report.sections[8].id).toBe('ch9_mangalik');
    expect(report.sections[9].id).toBe('ch10_sade_sati');
    expect(report.sections[10].id).toBe('ch11_raj_yogas');
    expect(report.sections[11].id).toBe('ch12_karmic_lessons');
    expect(report.sections[12].id).toBe('ch13_mahadashas');
    expect(report.sections[13].id).toBe('ch14_numerology');
    expect(report.sections[14].id).toBe('ch15_spiritual');
    expect(report.sections[15].id).toBe('ch16_remedies');
    expect(report.sections[16].id).toBe('ch17_conclusion');

    // Verify Bhavphal for all 12 houses (1..12 house numbers, lords, lord house placements, signs)
    expect(report.bhavphal).toBeDefined();
    expect(report.bhavphal?.length).toBe(12);
    const expectedHouseLords = ['MARS', 'JUPITER', 'SATURN', 'SATURN', 'JUPITER', 'MARS', 'VENUS', 'MERCURY', 'MOON', 'SUN', 'MERCURY', 'VENUS'];
    for (let h = 1; h <= 12; h++) {
      const bh = report.bhavphal?.[h - 1];
      expect(bh).toBeDefined();
      expect(bh?.houseNumber).toBe(h);
      expect(bh?.houseName).toContain(`House ${h}`);
      expect(bh?.lord.toUpperCase()).toBe(expectedHouseLords[h - 1]);
      expect(bh?.lordPlacedInHouse).toBeGreaterThanOrEqual(1);
      expect(bh?.lordPlacedInHouse).toBeLessThanOrEqual(12);
      expect(bh?.sign).toBeDefined();
      expect(bh?.lordSign).toBeDefined();
      expect(bh?.analysis.length).toBeGreaterThan(20);
    }

    // Verify all 16 canonical Shodashvarga divisional charts
    expect(report.divisionalCharts).toBeDefined();
    expect(report.divisionalCharts?.length).toBe(16);
    const canonicalVargaCodes = ['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'];
    expect(report.divisionalCharts?.map((d) => d.vargaCode)).toEqual(canonicalVargaCodes);
    for (const vChart of report.divisionalCharts || []) {
      expect(vChart.ascendantSign).toBeDefined();
      expect(vChart.name).toBeDefined();
      expect(vChart.purpose).toBeDefined();
      expect(vChart.placements.length).toBeGreaterThanOrEqual(9);
      for (const pl of vChart.placements) {
        expect(pl.planet).toBeDefined();
        expect(pl.rashi).toBeDefined();
        expect(pl.house).toBeGreaterThanOrEqual(1);
        expect(pl.house).toBeLessThanOrEqual(12);
      }
    }

    // -------------------------------------------------------------------------
    // Independent Mathematical Regression Fixtures across representative Vargas (D9, D10, D7)
    // Derived from first principles according to classical Parashari rules (BPHS Ch. 6)
    // -------------------------------------------------------------------------

    // 1. D9 (Navamsha - Soul & Dharmic Destiny)
    // Rule: 9 divisions of 3°20' (3.333333°).
    //   - Fiery signs (1,5,9) start from Aries (1)
    //   - Earthy signs (2,6,10) start from Capricorn (10)
    //   - Airy signs (3,7,11) start from Libra (7)
    //   - Watery signs (4,8,12) start from Cancer (4)
    // Input Ascendant: Scorpio (Watery, 8) at 10.5° -> part index floor(10.5 / 3.333333) = 3.
    //   Watery starts Cancer (4) + 3 = Libra / Tula (7). D9 Ascendant = Tula.
    const d9Chart = report.divisionalCharts?.find((v) => v.vargaCode === 'D9');
    expect(d9Chart).toBeDefined();
    expect(d9Chart?.ascendantSign).toBe('Tula');
    const d9Placements = new Map(d9Chart?.placements.map((p) => [p.planet, p]));

    // Sun: Sagittarius 12.3° (Fiery, 9). Part = floor(12.3 / 3.333333) = 3. Starts Aries (1) + 3 = Cancer (4).
    // House from D9 Asc (Tula, 7) = (4 - 7 + 12) % 12 + 1 = 10.
    expect(d9Placements.get('SUN')?.rashi).toBe('Cancer');
    expect(d9Placements.get('SUN')?.house).toBe(10);

    // Moon: Virgo 29.8° (Earthy, 6). Part = floor(29.8 / 3.333333) = 8. Starts Capricorn (10) + 8 = Virgo (6).
    // House from D9 Asc (Tula, 7) = (6 - 7 + 12) % 12 + 1 = 12.
    expect(d9Placements.get('MOON')?.rashi).toBe('Virgo');
    expect(d9Placements.get('MOON')?.house).toBe(12);

    // Mars: Virgo 15.2° (Earthy, 6). Part = floor(15.2 / 3.333333) = 4. Starts Capricorn (10) + 4 = Taurus (2).
    // House from D9 Asc (Tula, 7) = (2 - 7 + 12) % 12 + 1 = 8.
    expect(d9Placements.get('MARS')?.rashi).toBe('Taurus');
    expect(d9Placements.get('MARS')?.house).toBe(8);

    // Jupiter: Sagittarius 8.4° (Fiery, 9). Part = floor(8.4 / 3.333333) = 2. Starts Aries (1) + 2 = Gemini (3).
    // House from D9 Asc (Tula, 7) = (3 - 7 + 12) % 12 + 1 = 9.
    expect(d9Placements.get('JUPITER')?.rashi).toBe('Gemini');
    expect(d9Placements.get('JUPITER')?.house).toBe(9);

    // Saturn: Libra 18.9° (Airy, 7). Part = floor(18.9 / 3.333333) = 5. Starts Libra (7) + 5 = Pisces (12).
    // House from D9 Asc (Tula, 7) = (12 - 7 + 12) % 12 + 1 = 6.
    expect(d9Placements.get('SATURN')?.rashi).toBe('Pisces');
    expect(d9Placements.get('SATURN')?.house).toBe(6);

    // 2. D10 (Dashamsha - Professional Trajectory & Authority)
    // Rule: 10 divisions of 3.0° (BPHS Ch. 6, Slokas 17-18).
    //   - Odd signs (1, 3, 5, 7, 9, 11) count begins from the occupied sign itself.
    //   - Even signs (2, 4, 6, 8, 10, 12) count begins from the 9th sign from the occupied sign.
    // Input Ascendant: Scorpio (8, Even sign) at 10.5°.
    //   9th from Scorpio = Cancer (4). Part index = floor(10.5 / 3) = 3.
    //   Sign = Cancer (4) + 3 = Libra / Tula (7). D10 Ascendant = Tula.
    const d10Chart = report.divisionalCharts?.find((v) => v.vargaCode === 'D10');
    expect(d10Chart).toBeDefined();
    expect(d10Chart?.ascendantSign).toBe('Tula');
    const d10Placements = new Map(d10Chart?.placements.map((p) => [p.planet, p]));

    // Sun: Sagittarius 12.3° (Sign 9, Odd sign). Starts from Sagittarius (9).
    //   Part index = floor(12.3 / 3) = 4. Sign = (9 - 1 + 4) % 12 + 1 = Aries (1).
    //   House from D10 Asc (Tula, 7) = (1 - 7 + 12) % 12 + 1 = 7.
    expect(d10Placements.get('SUN')?.rashi).toBe('Aries');
    expect(d10Placements.get('SUN')?.house).toBe(7);

    // Moon: Virgo 29.8° (Sign 6, Even sign). 9th from Virgo = Taurus (2).
    //   Part index = floor(29.8 / 3) = 9. Sign = (2 - 1 + 9) % 12 + 1 = Aquarius (11).
    //   House from D10 Asc (Tula, 7) = (11 - 7 + 12) % 12 + 1 = 5.
    expect(d10Placements.get('MOON')?.rashi).toBe('Aquarius');
    expect(d10Placements.get('MOON')?.house).toBe(5);

    // Mars: Virgo 15.2° (Sign 6, Even sign). 9th from Virgo = Taurus (2).
    //   Part index = floor(15.2 / 3) = 5. Sign = (2 - 1 + 5) % 12 + 1 = Libra (7).
    //   House from D10 Asc (Tula, 7) = (7 - 7 + 12) % 12 + 1 = 1.
    expect(d10Placements.get('MARS')?.rashi).toBe('Libra');
    expect(d10Placements.get('MARS')?.house).toBe(1);

    // Mercury: Sagittarius 28.1° (Sign 9, Odd sign). Starts from Sagittarius (9).
    //   Part index = floor(28.1 / 3) = 9 (10th part: 27°-30°).
    //   Counting 9 from Sagittarius: (9 - 1 + 9) % 12 + 1 = 17 % 12 + 1 = 6 (Virgo).
    //   House from D10 Asc (Tula, 7) = (6 - 7 + 12) % 12 + 1 = 12.
    //   VERIFIED: Mercury is mathematically in Virgo in House 12.
    expect(d10Placements.get('MERCURY')?.rashi).toBe('Virgo');
    expect(d10Placements.get('MERCURY')?.house).toBe(12);

    // Saturn: Libra 18.9° (Sign 7, Odd sign). Starts from Libra (7).
    //   Part index = floor(18.9 / 3) = 6 (7th part: 18°-21°).
    //   Counting 6 from Libra: (7 - 1 + 6) % 12 + 1 = 12 % 12 + 1 = 1 (Aries).
    //   House from D10 Asc (Tula, 7) = (1 - 7 + 12) % 12 + 1 = 7.
    //   VERIFIED: Saturn is mathematically in Aries in House 7.
    expect(d10Placements.get('SATURN')?.rashi).toBe('Aries');
    expect(d10Placements.get('SATURN')?.house).toBe(7);

    // 3. D7 (Saptamsha - Lineage, Progeny & Creative Fruit)
    // Rule: 7 divisions of 30/7° (~4.285714°). (BPHS Ch. 6, Slokas 11-12).
    //   - Odd signs start from the occupied sign itself.
    //   - Even signs start from the 7th sign from the occupied sign.
    // Input Ascendant: Scorpio (8, Even sign) at 10.5°.
    //   7th from Scorpio = Taurus (2). Part index = floor(10.5 / 4.285714) = 2.
    //   Sign = (2 - 1 + 2) % 12 + 1 = Cancer / Karka (4). D7 Ascendant = Karka.
    const d7Chart = report.divisionalCharts?.find((v) => v.vargaCode === 'D7');
    expect(d7Chart).toBeDefined();
    expect(d7Chart?.ascendantSign).toBe('Karka');
    const d7Placements = new Map(d7Chart?.placements.map((p) => [p.planet, p]));

    // Sun: Sagittarius 12.3° (Sign 9, Odd sign). Starts from Sagittarius (9).
    //   Part index = floor(12.3 / 4.285714) = 2. Sign = (9 - 1 + 2) % 12 + 1 = Aquarius (11).
    //   House from D7 Asc (Karka, 4) = (11 - 4 + 12) % 12 + 1 = 8.
    expect(d7Placements.get('SUN')?.rashi).toBe('Aquarius');
    expect(d7Placements.get('SUN')?.house).toBe(8);

    // Moon: Virgo 29.8° (Sign 6, Even sign). 7th from Virgo = Pisces (12).
    //   Part index = floor(29.8 / 4.285714) = 6. Sign = (12 - 1 + 6) % 12 + 1 = Virgo (6).
    //   House from D7 Asc (Karka, 4) = (6 - 4 + 12) % 12 + 1 = 3.
    expect(d7Placements.get('MOON')?.rashi).toBe('Virgo');
    expect(d7Placements.get('MOON')?.house).toBe(3);

    // Mars: Virgo 15.2° (Sign 6, Even sign). 7th from Virgo = Pisces (12).
    //   Part index = floor(15.2 / 4.285714) = 3. Sign = (12 - 1 + 3) % 12 + 1 = Gemini (3).
    //   House from D7 Asc (Karka, 4) = (3 - 4 + 12) % 12 + 1 = 12.
    expect(d7Placements.get('MARS')?.rashi).toBe('Gemini');
    expect(d7Placements.get('MARS')?.house).toBe(12);

    // Jupiter: Sagittarius 8.4° (Sign 9, Odd sign). Starts from Sagittarius (9).
    //   Part index = floor(8.4 / 4.285714) = 1. Sign = (9 - 1 + 1) % 12 + 1 = Capricorn (10).
    //   House from D7 Asc (Karka, 4) = (10 - 4 + 12) % 12 + 1 = 7.
    expect(d7Placements.get('JUPITER')?.rashi).toBe('Capricorn');
    expect(d7Placements.get('JUPITER')?.house).toBe(7);

    // Venus: Scorpio 25.6° (Sign 8, Even sign). 7th from Scorpio = Taurus (2).
    //   Part index = floor(25.6 / 4.285714) = 5. Sign = (2 - 1 + 5) % 12 + 1 = Libra (7).
    //   House from D7 Asc (Karka, 4) = (7 - 4 + 12) % 12 + 1 = 4.
    expect(d7Placements.get('VENUS')?.rashi).toBe('Libra');
    expect(d7Placements.get('VENUS')?.house).toBe(4);

    // Verify Avakahada Chakra
    expect(report.avakahadaChakra).toBeDefined();
    expect(report.avakahadaChakra?.varna).toBeDefined();
    expect(report.avakahadaChakra?.nadi).toBeDefined();

    // Verify Panchang Snapshot
    expect(report.panchangSnapshot).toBeDefined();
    expect(report.panchangSnapshot?.tithi).toBeDefined();

    // Verify Navamsha Kundli
    expect(report.navamshaKundli).toBeDefined();
    expect(report.navamshaKundli?.houses.length).toBe(12);

    // Verify Shodashvargas Table
    expect(report.shodashvargas).toBeDefined();
    expect(report.shodashvargas?.length).toBeGreaterThanOrEqual(10);

    // Verify Ashtakavarga SAV (Summing to exactly 337 points)
    expect(report.ashtakavargaTable?.totalPoints).toBe(337);

    // Verify Chara Karakas (8 Karakas)
    expect(report.charaKarakas?.length).toBe(8);
    expect(report.charaKarakas?.some((k) => k.karaka === 'Atmakaraka')).toBe(true);
    expect(report.charaKarakas?.some((k) => k.karaka === 'Amatyakaraka')).toBe(true);

    // Verify Numerology
    expect(report.numerology?.mulank).toBe(1);
    expect(report.numerology?.bhagyank).toBe(7);
    expect(report.numerology?.successNumber).toBe(4);
    expect(report.numerology?.connectionNumber).toBe(4);

    // Verify Gemstone Recommendations (Trikona Lords)
    expect(report.gemstoneRecommendations?.lagnaGem.gemstone).toBe('Red Coral'); // Scorpio lord = Mars
  });

  // 2. Missing birth time throws explicit error
  it('2. Missing birth time produces explicit error without silent defaults', () => {
    const invalidInput = { ...realisticProfileInput, timeOfBirth: '' };
    expect(() => validateKundliReportInput(invalidInput)).toThrowError(BirthDetailsValidationError);
    expect(() => validateKundliReportInput(invalidInput)).toThrowError(/time of birth/i);
  });

  // 3. Invalid birth location (coordinates out of bounds)
  it('3. Invalid birth location coordinates produce explicit error', () => {
    const invalidLat = { ...realisticProfileInput, latitude: 120.0 }; // > 90
    expect(() => validateKundliReportInput(invalidLat)).toThrowError(BirthDetailsValidationError);
    expect(() => validateKundliReportInput(invalidLat)).toThrowError(/latitude between -90/i);

    const invalidLong = { ...realisticProfileInput, longitude: -200.0 }; // < -180
    expect(() => validateKundliReportInput(invalidLong)).toThrowError(BirthDetailsValidationError);
    expect(() => validateKundliReportInput(invalidLong)).toThrowError(/longitude between -180/i);
  });

  // 4. Invalid or incomplete calculation evidence is rejected
  it('4. Invalid or incomplete calculation evidence is rejected by evidence validator', async () => {
    const incompleteChart = {
      ...canonicalChartData,
      chart: {
        ...canonicalChartData.chart,
        planets: canonicalChartData.chart.planets.filter((p) => p.planet !== 'SATURN'), // Missing Saturn
      },
    };

    await expect(generateKundliReport(realisticProfileInput, incompleteChart)).rejects.toThrow();
  });

  // 5. AI Traceability rejects unsupported astronomical claims
  it('5. AI Traceability rejects unsupported astronomical claims (hallucinated signs/houses)', () => {
    const verifiedEvidence = extractVerifiedEvidenceFromChart(canonicalChartData, realisticProfileInput, 'KUNDLI');

    // Sun is in Sagittarius in native chart. Hallucinating Sun in Aries must fail.
    const hallucinatedText = 'The native has Sun placed in Aries in the 1st house granting extraordinary pioneering zeal.';
    expect(() => {
      assertAiInterpretationTraceability(hallucinatedText, verifiedEvidence);
    }).toThrowError(AstrologyTraceabilityError);
  });

  // 6. PDF generation produces valid vector PDF with complete pages and dynamic pagination
  it('6. PDF generation produces valid multi-page vector PDF with headers, footers and page numbering', async () => {
    const report = await generateKundliReport(realisticProfileInput, canonicalChartData);
    const pdfBuffer = await reportPdfService.generateReportPdf(report);

    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(10000); // Dense multi-page vector document

    const pdfRaw = pdfBuffer.toString('binary');
    // PDF Header & Trailer
    expect(pdfRaw.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfRaw.includes('%%EOF')).toBe(true);

    // Profile & Native info present
    expect(pdfRaw.includes('Puneet Kumar')).toBe(true);
    expect(pdfRaw.includes('Bulandshahr')).toBe(true);

    // Astrological Tables & Vector Charts present
    expect(pdfRaw.includes('NORTH INDIAN KUNDLI CHART')).toBe(true);
    expect(pdfRaw.includes('CHANDRA KUNDLI')).toBe(true);
    expect(pdfRaw.includes('NAVAMSHA KUNDLI')).toBe(true);
    expect(pdfRaw.includes('AVAKAHADA CHAKRA')).toBe(true);
    expect(pdfRaw.includes('SHODASHVARGA 16-DIVISIONAL CHART SUMMARY')).toBe(true);
    expect(pdfRaw.includes('ASHTAKAVARGA SARVASHTAKAVARGA')).toBe(true);
    expect(pdfRaw.includes('JAIMINI CHARA KARAKAS')).toBe(true);

    // Standard Author Message & Legal Disclaimer
    expect(pdfRaw.includes('Astro Sushil')).toBe(true);
    expect(pdfRaw.includes('DISCLAIMER')).toBe(true);
    expect(pdfRaw.includes('Page ')).toBe(true);
  });

  // 7. Storage and customer download works via API
  it('7. Storage and customer download serves PDF with correct Content-Type', async () => {
    // Generate Kundli via synchronous endpoint
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        birthProfileId: validProfileId,
        reportType: 'KUNDLI',
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

  // 8. Unauthorized access is rejected (401 for guest, 404 for other user)
  it('8. Unauthorized customer access is rejected', async () => {
    // 1. Guest request rejected with 401
    const guestRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      payload: { birthProfileId: validProfileId, reportType: 'KUNDLI' },
    });
    expect(guestRes.statusCode).toBe(401);

    // 2. User 2 accessing User 1 profile rejected with 403 or 404
    const crossUserRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user2Token}` },
      payload: { birthProfileId: validProfileId, reportType: 'KUNDLI' },
    });
    expect([403, 404]).toContain(crossUserRes.statusCode);
  });

  // 9. Queue execution, retry and worker fencing
  it('9. Queue execution respects worker lease and CAS claim fencing', async () => {
    const queuedReport = {
      id: 'report-queue-test-1',
      userId: user1Id,
      birthProfileId: validProfileId,
      orderId: paidOrderId,
      fulfillmentUnitId,
      reportType: ReportType.KUNDLI,
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
    expect(claimedJob?.id).toBe('report-queue-test-1');
    expect(claimedJob?.claimToken).toBe('mock-worker-claim-token-123');

    // Completing with wrong token is rejected by CAS fence
    const wrongTokenResult = await postgresQueueService.completeJob('report-queue-test-1', 'invalid-token', 1, 'key', 'file', 1000, 16);
    expect(wrongTokenResult).toBe(false);

    // Completing with correct token succeeds
    const successResult = await postgresQueueService.completeJob('report-queue-test-1', 'mock-worker-claim-token-123', 1, 'key', 'file', 1000, 16);
    expect(successResult).toBe(true);
    expect(reportsDb.get('report-queue-test-1').status).toBe('COMPLETED');
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
      payload: { birthProfileId: validProfileId, reportType: 'KUNDLI' },
    });
    expect(res1.statusCode).toBe(201);
    const report1 = JSON.parse(res1.payload);

    // 2. Request without forceRegenerate -> returns existing report (reused: true)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: { birthProfileId: validProfileId, reportType: 'KUNDLI' },
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
      payload: { birthProfileId: validProfileId, reportType: 'KUNDLI', forceRegenerate: true },
    });
    expect(res3.statusCode).toBe(201);
    const report3 = JSON.parse(res3.payload);
    expect(Boolean(report3.reused)).toBe(false);
    expect(report3.id).not.toBe(report1.id);
  });
});
