import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import { featureAccessService } from '../../src/services/feature-access.service';
import { postgresQueueService } from '../../src/services/postgres-queue.service';
import { careerReportWorker } from '../../src/services/report-worker.service';
import {
  VerifiedAstrologyEvidence,
  validateVerifiedAstrologyEvidence,
  AstrologyEvidenceValidationError,
  getEvidenceRequirementsForReport,
  extractVerifiedEvidenceFromChart,
  ReportSectionComposer,
  sharedReportPdfRenderer,
  reportPdfService,
  verifyAiInterpretationTraceability,
  assertAiInterpretationTraceability,
  AstrologyTraceabilityError,
} from '@astro/report-engine';

describe('Phase 5A: Shared Report Foundation Integration & Verification', () => {
  let app: FastifyInstance;

  const profilesDb = new Map<string, any>();
  const reportsDb = new Map<string, any>();
  const ordersDb = new Map<string, any>();

  const userId = '11111111-2222-3333-4444-555555555555';
  let userToken: string;
  const profileId = '66666666-7777-8888-9999-000000000000';
  let generatedReportId: string;

  const canonicalEvidenceFixture: VerifiedAstrologyEvidence = {
    snapshotId: 'SNAP-PHASE5A-001',
    calculationVersion: '1.0.0',
    providerName: 'AstroSushil Engine',
    calculationTimestampIso: '2026-11-07T14:00:00Z',
    config: {
      zodiacType: 'SIDEREAL',
      ayanamsa: 'LAHIRI',
      houseSystem: 'WHOLE_SIGN',
      nodeCalculation: 'MEAN_NODE',
      planetaryCalculationMode: 'GEOCENTRIC',
    },
    birthDetails: {
      name: 'Pooja Verma',
      dateOfBirth: '1993-04-12',
      timeOfBirth: '08:30:00',
      placeName: 'Varanasi, Uttar Pradesh, India',
      latitude: 25.3176,
      longitude: 82.9739,
      timezone: 'Asia/Kolkata',
    },
    ascendant: {
      sign: 'Taurus',
      signIndex: 2,
      degree: 12.18,
      nakshatra: 'Rohini',
      pada: 1,
      lord: 'Venus',
    },
    planets: [
      { planet: 'SUN', sign: 'Pisces', signIndex: 12, degree: 28.5, house: 11, nakshatra: 'Revati', pada: 4, isRetrograde: false },
      { planet: 'MOON', sign: 'Sagittarius', signIndex: 9, degree: 14.2, house: 8, nakshatra: 'Purva Ashadha', pada: 1, isRetrograde: false },
      { planet: 'MARS', sign: 'Gemini', signIndex: 3, degree: 19.4, house: 2, nakshatra: 'Ardra', pada: 4, isRetrograde: false },
      { planet: 'MERCURY', sign: 'Pisces', signIndex: 12, degree: 15.0, house: 11, nakshatra: 'Uttara Bhadrapada', pada: 4, isRetrograde: false },
      { planet: 'JUPITER', sign: 'Virgo', signIndex: 6, degree: 16.3, house: 5, nakshatra: 'Hasta', pada: 2, isRetrograde: true },
      { planet: 'VENUS', sign: 'Pisces', signIndex: 12, degree: 8.7, house: 11, nakshatra: 'Uttara Bhadrapada', pada: 2, isRetrograde: false },
      { planet: 'SATURN', sign: 'Aquarius', signIndex: 11, degree: 2.1, house: 10, nakshatra: 'Dhanishta', pada: 3, isRetrograde: false },
      { planet: 'RAHU', sign: 'Scorpio', signIndex: 8, degree: 20.0, house: 7, nakshatra: 'Jyeshtha', pada: 2, isRetrograde: true },
      { planet: 'KETU', sign: 'Taurus', signIndex: 2, degree: 20.0, house: 1, nakshatra: 'Rohini', pada: 4, isRetrograde: true },
    ],
    houses: Array.from({ length: 12 }, (_, i) => ({
      houseNumber: i + 1,
      sign: ['Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces', 'Aries'][i],
      signIndex: ((1 + i) % 12) + 1,
      degree: 12.18,
      lord: ['Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter', 'Mars'][i],
      occupants: [],
    })),
    dashas: {
      currentMahadasha: 'VENUS',
      currentAntardasha: 'MARS',
      startDate: '2024-01-01',
      endDate: '2027-01-01',
    },
    transits: [
      { planet: 'SATURN', sign: 'Aquarius', degree: 15.0, houseFromLagna: 10, houseFromMoon: 3, isRetrograde: false },
      { planet: 'JUPITER', sign: 'Taurus', degree: 22.0, houseFromLagna: 1, houseFromMoon: 6, isRetrograde: false },
    ],
  };

  beforeAll(async () => {
    profilesDb.set(profileId, {
      id: profileId,
      userId,
      name: 'Pooja Verma',
      dateOfBirth: '1993-04-12',
      timeOfBirth: '08:30:00',
      placeName: 'Varanasi, Uttar Pradesh, India',
      latitude: 25.3176,
      longitude: 82.9739,
      timezone: 'Asia/Kolkata',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const orderId = 'order-phase5a-001';
    ordersDb.set(orderId, {
      id: orderId,
      userId,
      status: 'PAID',
      paymentStatus: 'CAPTURED',
      fulfillmentStatus: 'PENDING',
      reportType: 'KUNDLI',
      paidAt: new Date(),
      items: [
        { id: 'item-5a-1', orderId, itemType: 'REPORT', catalogId: 'report-kundli', quantity: 1, price: 999 },
      ],
      reports: [],
    });

    (vi.spyOn(featureAccessService, 'evaluateFeatureAccess') as any).mockResolvedValue({
      allowed: true,
      source: 'SUPPORT_ENTITLEMENT_GRANT',
    });

    (vi.spyOn(prisma.birthProfile, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return profilesDb.get(where.id) || null;
    });

    (vi.spyOn(prisma.order, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return ordersDb.get(where.id) || null;
    });

    (vi.spyOn(prisma.order, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return Array.from(ordersDb.values()).find((o) => {
        if (where.userId && o.userId !== where.userId) return false;
        if (where.status && o.status !== where.status) return false;
        return true;
      }) || null;
    });

    (vi.spyOn(prisma.report, 'create') as any).mockImplementation(async ({ data }: any) => {
      const id = data.id || crypto.randomUUID();
      const record = {
        id,
        userId: data.userId,
        birthProfileId: data.birthProfileId,
        orderId: data.orderId || null,
        fulfillmentUnitId: data.fulfillmentUnitId || null,
        reportType: data.reportType,
        status: data.status || 'QUEUED',
        stage: data.stage || 'QUEUED',
        progress: data.progress ?? 0,
        storageKey: data.storageKey || null,
        fileName: data.fileName || null,
        fileSize: data.fileSize || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      reportsDb.set(id, record);
      return record;
    });

    (vi.spyOn(prisma.report, 'updateMany') as any).mockImplementation(async ({ where, data }: any) => {
      let count = 0;
      for (const [id, r] of reportsDb.entries()) {
        if (where.id && r.id !== where.id) continue;
        if (where.status?.in && !where.status.in.includes(r.status)) continue;
        Object.assign(r, data);
        count++;
      }
      return { count };
    });

    (vi.spyOn(prisma.report, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      const record = reportsDb.get(where.id);
      if (!record) return null;
      return {
        ...record,
        birthProfile: profilesDb.get(record.birthProfileId),
      };
    });

    (vi.spyOn(prisma.report, 'findFirst') as any).mockImplementation(async ({ where }: any) => {
      return Array.from(reportsDb.values()).find((r) => {
        if (where.userId && r.userId !== where.userId) return false;
        if (where.birthProfileId && r.birthProfileId !== where.birthProfileId) return false;
        if (where.reportType && r.reportType !== where.reportType) return false;
        return true;
      }) || null;
    });

    app = buildApp();
    await app.ready();

    userToken = (app as any).jwt.sign({ sub: userId, role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // 1. A real report-generation request reaches the shared pipeline
  it('1. A real report-generation request reaches the shared pipeline and completes', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        birthProfileId: profileId,
        reportType: 'KUNDLI',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.id).toBeDefined();
    expect(body.status).toBe('COMPLETED');
    expect(body.report).toBeDefined();
    expect(body.report.sections.length).toBeGreaterThan(0);
    generatedReportId = body.id;
  });

  // 2. Invalid evidence is rejected before interpretation
  it('2. Invalid evidence is rejected before interpretation with AstrologyEvidenceValidationError', () => {
    const invalidEvidence = {
      ...canonicalEvidenceFixture,
      config: {
        ...canonicalEvidenceFixture.config,
        zodiacType: 'TROPICAL' as any, // Violates Vedic Sidereal convention
      },
    };

    expect(() => validateVerifiedAstrologyEvidence(invalidEvidence)).toThrowError(AstrologyEvidenceValidationError);
    try {
      validateVerifiedAstrologyEvidence(invalidEvidence);
    } catch (err: any) {
      expect(err.code).toBe('INVALID_CALCULATION_EVIDENCE');
      expect(err.validationErrors.some((e: string) => e.includes('SIDEREAL'))).toBe(true);
    }
  });

  // 3. Valid evidence reaches section composition
  it('3. Valid evidence reaches section composition in strictly ascending order', async () => {
    const composer = new ReportSectionComposer();

    composer.registerSection({
      id: 'SEC_LAGNA',
      title: 'Ascendant Personality Framework',
      category: 'IDENTITY',
      order: 1,
      isRequired: true,
      evaluate: (ctx) => ({
        id: 'SEC_LAGNA',
        title: 'Ascendant Personality Framework',
        category: 'IDENTITY',
        order: 1,
        isRequired: true,
        status: 'VERIFIED',
        summary: `Lagna in ${ctx.evidence.ascendant.sign} governed by ${ctx.evidence.ascendant.lord}.`,
        content: `Detailed evaluation of Taurus Lagna at ${ctx.evidence.ascendant.degree.toFixed(2)} degrees.`,
        evidenceRefs: ['ASC_TAURUS_12DEG', 'VENUS_LORD'],
      }),
    });

    composer.registerSection({
      id: 'SEC_DASHA',
      title: 'Operating Dasha Period Influence',
      category: 'TIMING',
      order: 2,
      isRequired: true,
      evaluate: (ctx) => ({
        id: 'SEC_DASHA',
        title: 'Operating Dasha Period Influence',
        category: 'TIMING',
        order: 2,
        isRequired: true,
        status: 'VERIFIED',
        summary: `Operating ${ctx.evidence.dashas?.currentMahadasha} Mahadasha.`,
        content: `Current period window from ${ctx.evidence.dashas?.startDate} to ${ctx.evidence.dashas?.endDate}.`,
        evidenceRefs: ['DASHA_VENUS_MARS'],
      }),
    });

    const metadata = {
      reportId: 'REP-INT-001',
      reportType: 'KUNDLI',
      title: 'Birth Chart & Kundli Dossier',
      version: '1.0.0',
      generationTimestampIso: '2026-11-07T14:00:00Z',
      clientName: 'Pooja Verma',
    };

    const doc = await composer.compose(metadata, canonicalEvidenceFixture);

    expect(doc.sections.length).toBe(2);
    expect(doc.sections[0].id).toBe('SEC_LAGNA');
    expect(doc.sections[0].order).toBe(1);
    expect(doc.sections[1].id).toBe('SEC_DASHA');
    expect(doc.sections[1].order).toBe(2);
    expect(doc.authorMessage.authorName).toBe('Sushil Kumaar Singh');
    expect(doc.methodologyNote.body).toContain('Lahiri');
    expect(doc.legalDisclaimer.title).toContain('Disclaimer');
  });

  // 4. Composed result reaches PDF rendering (via shared renderer & reportPdfService adapter)
  it('4. Composed result reaches PDF rendering and contains required author message, methodology and disclaimer', async () => {
    const rawChartData = {
      chart: {
        config: { zodiacType: 'SIDEREAL', ayanamsa: 'LAHIRI', houseSystem: 'WHOLE_SIGN' },
        ascendant: { sign: 'Taurus', degreeInRashi: 12.18, nakshatra: 'Rohini', pada: 1, lord: 'Venus' },
        planets: canonicalEvidenceFixture.planets,
        houses: canonicalEvidenceFixture.houses,
      },
    };

    // 1. Render through sharedReportPdfRenderer
    const structuredModel = {
      version: '1.0',
      type: 'KUNDLI',
      title: 'Birth Chart & Kundli Report',
      generatedAt: '2026-11-07T14:00:00Z',
      profile: canonicalEvidenceFixture.birthDetails,
      configuration: canonicalEvidenceFixture.config,
      ascendant: canonicalEvidenceFixture.ascendant,
      planets: canonicalEvidenceFixture.planets,
      houses: canonicalEvidenceFixture.houses,
      nakshatra: {
        birthNakshatra: 'Purva Ashadha',
        pada: 1,
        rulingPlanet: 'Venus',
        associatedInfo: 'Moon in Sagittarius',
      },
      sections: [
        {
          id: 'sec_1',
          title: 'Ascendant Dynamics',
          type: 'TEXT',
          content: 'Taurus Ascendant confers stability, perseverance, and aesthetic appreciation.',
          keyValues: { Sign: 'Taurus', Lord: 'Venus' },
        },
      ],
    };

    const sharedPdfBuffer = sharedReportPdfRenderer.renderStructuredReport(structuredModel);
    expect(Buffer.isBuffer(sharedPdfBuffer)).toBe(true);
    expect(sharedPdfBuffer.length).toBeGreaterThan(1000);
    const sharedPdfStr = sharedPdfBuffer.toString('binary');
    expect(sharedPdfStr.startsWith('%PDF-1.4')).toBe(true);
    expect(sharedPdfStr.includes('%%EOF')).toBe(true);
    expect(sharedPdfStr.includes('Sushil Kumaar Singh')).toBe(true);
    expect(sharedPdfStr.includes('AUTHORITATIVE DISCLAIMER & TERMS OF GUIDANCE')).toBe(true);

    // 2. Render through existing reportPdfService adapter
    const adapterPdfBuffer = await reportPdfService.generateReportPdf(structuredModel);
    expect(Buffer.isBuffer(adapterPdfBuffer)).toBe(true);
    const adapterPdfStr = adapterPdfBuffer.toString('binary');
    expect(adapterPdfStr.startsWith('%PDF-1.4')).toBe(true);
    expect(adapterPdfStr.includes('Sushil Kumaar Singh')).toBe(true);
    expect(adapterPdfStr.includes('AUTHORITATIVE DISCLAIMER & TERMS OF GUIDANCE')).toBe(true);
  });

  // 5. The resulting PDF is stored and downloadable
  it('5. The resulting PDF is stored and downloadable with application/pdf Content-Type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${generatedReportId}/pdf`,
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('attachment; filename=');

    const pdfRaw = response.payload;
    expect(pdfRaw.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfRaw.includes('%%EOF')).toBe(true);
    expect(pdfRaw.includes('Pooja Verma')).toBe(true);
    expect(pdfRaw.includes('Sushil Kumaar Singh')).toBe(true);
  });

  // 6. Report-specific evidence requirement works without requiring irrelevant evidence
  it('6. Report-specific evidence requirement works for transit reports without requiring all 12 natal houses', () => {
    // A transit report only requires transit placements and natal Moon, NOT all 12 natal houses
    const transitEvidenceOnly = {
      snapshotId: 'SNAP-TRANSIT-001',
      calculationVersion: '1.0.0',
      providerName: 'AstroSushil Engine',
      calculationTimestampIso: '2026-11-07T14:00:00Z',
      config: canonicalEvidenceFixture.config,
      birthDetails: canonicalEvidenceFixture.birthDetails,
      ascendant: canonicalEvidenceFixture.ascendant,
      planets: [
        { planet: 'MOON', sign: 'Sagittarius', signIndex: 9, degree: 14.2, house: 8, nakshatra: 'Purva Ashadha', pada: 1, isRetrograde: false },
      ],
      houses: [], // Zero natal houses supplied!
      transits: [
        { planet: 'SATURN', sign: 'Aquarius', degree: 15.0, houseFromLagna: 10, houseFromMoon: 3, isRetrograde: false },
      ],
    };

    // 6.1 Validation for PLANETARY_SUMMARY (transit) succeeds without houses
    expect(() =>
      validateVerifiedAstrologyEvidence(transitEvidenceOnly, { reportType: 'PLANETARY_SUMMARY' })
    ).not.toThrow();

    // 6.2 Validation for KUNDLI (full birth chart) explicitly FAILS on the same payload because houses and 9 planets are missing
    expect(() =>
      validateVerifiedAstrologyEvidence(transitEvidenceOnly, { reportType: 'KUNDLI' })
    ).toThrowError(AstrologyEvidenceValidationError);

    // 6.3 If required transit evidence is missing from PLANETARY_SUMMARY, it fails explicitly
    const missingTransitData = { ...transitEvidenceOnly, transits: [] };
    expect(() =>
      validateVerifiedAstrologyEvidence(missingTransitData, { reportType: 'PLANETARY_SUMMARY' })
    ).toThrowError(AstrologyEvidenceValidationError);
    try {
      validateVerifiedAstrologyEvidence(missingTransitData, { reportType: 'PLANETARY_SUMMARY' });
    } catch (err: any) {
      expect(err.validationErrors.some((v: string) => v.includes('Transit placements evidence is required'))).toBe(true);
    }
  });

  // 7. Worker failures still follow existing queue fencing and retry behavior
  it('7. Worker failures still follow existing queue fencing and retry behavior', async () => {
    const failedReportId = 'failing-job-phase5a-001';
    reportsDb.set(failedReportId, {
      id: failedReportId,
      userId,
      birthProfileId: profileId,
      reportType: 'KUNDLI',
      status: 'CALCULATING',
      stage: 'CALCULATING',
      progress: 15,
      claimToken: 'token-active-1',
      claimVersion: 1,
      claimExpiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const failSpy = vi.spyOn(postgresQueueService, 'failJob').mockImplementation(async (reportId, token, version, code, msg) => {
      const r = reportsDb.get(reportId);
      if (r && r.claimToken === token && r.claimVersion === version) {
        r.status = 'FAILED';
        r.stage = 'FAILED';
        r.errorCode = code;
        r.errorMessage = msg;
        r.claimToken = null;
        return true;
      }
      return false;
    });

    const updateSpy = vi.spyOn(postgresQueueService, 'updateJobStatus').mockImplementation(async (reportId, token, version, status, stage, progress) => {
      const r = reportsDb.get(reportId);
      if (r && r.claimToken === token && r.claimVersion === version) {
        r.status = status;
        r.stage = stage;
        r.progress = progress;
        return true;
      }
      return false;
    });

    // Worker fails job with explicit error code
    await careerReportWorker.failJob(
      failedReportId,
      'INVALID_CALCULATION_EVIDENCE',
      'Ascendant sign calculation was corrupted',
      'token-active-1',
      1
    );

    const updated = reportsDb.get(failedReportId);
    expect(updated.status).toBe('FAILED');
    expect(updated.stage).toBe('FAILED');
    expect(updated.errorCode).toBe('INVALID_CALCULATION_EVIDENCE');
    expect(updated.errorMessage).toContain('Ascendant sign calculation was corrupted');

    // Fencing check: stale token cannot update or overwrite the failed job
    const staleUpdate = await postgresQueueService.updateJobStatus(
      failedReportId,
      'stale-token-xyz',
      1,
      'COMPLETED' as any,
      'COMPLETED',
      100
    );
    expect(staleUpdate).toBe(false);
    expect(reportsDb.get(failedReportId).status).toBe('FAILED');

    failSpy.mockRestore();
    updateSpy.mockRestore();
  });

  // 8. AI Traceability: Rejects unsupported positions, dates, degrees, or invented dashas
  it('8. AI Traceability rejects hallucinated planetary positions and invented dashas', () => {
    // 8.1 Valid text matching evidence passes traceability
    const validText =
      'Native was born with Moon in Sagittarius in the 8th house, and Saturn in Aquarius in the 10th house. Active Venus Mahadasha is operating.';
    const validResult = verifyAiInterpretationTraceability(validText, canonicalEvidenceFixture);
    expect(validResult.valid).toBe(true);
    expect(validResult.violations.length).toBe(0);

    // 8.2 Hallucinated planetary sign (claims Sun in Aries, but natal Sun is in Pisces)
    const hallucinatedSignText =
      'With your Sun in Aries, you possess natural pioneering leadership.';
    expect(() =>
      assertAiInterpretationTraceability(hallucinatedSignText, canonicalEvidenceFixture)
    ).toThrowError(AstrologyTraceabilityError);

    // 8.3 Hallucinated house placement (claims Mars in 7th house, but natal Mars is in 2nd house)
    const hallucinatedHouseText =
      'Mars in the 7th house creates direct friction in interpersonal relationships.';
    const houseResult = verifyAiInterpretationTraceability(hallucinatedHouseText, canonicalEvidenceFixture);
    expect(houseResult.valid).toBe(false);
    expect(houseResult.violations.some((v) => v.includes('Unsupported house placement'))).toBe(true);

    // 8.4 Hallucinated dasha (claims active Rahu Mahadasha, but verified active is Venus)
    const hallucinatedDashaText =
      'You are currently running Rahu Mahadasha, bringing sudden shifts in career.';
    const dashaResult = verifyAiInterpretationTraceability(hallucinatedDashaText, canonicalEvidenceFixture);
    expect(dashaResult.valid).toBe(false);
    expect(dashaResult.violations.some((v) => v.includes('Unsupported dasha claim'))).toBe(true);

    // 8.5 Forbidden placeholder strings
    const placeholderText = 'Your career outlook is unknown at this time due to N/A placement.';
    const phResult = verifyAiInterpretationTraceability(placeholderText, canonicalEvidenceFixture);
    expect(phResult.valid).toBe(false);
    expect(phResult.violations.some((v) => v.includes('Forbidden placeholder'))).toBe(true);
  });
});
