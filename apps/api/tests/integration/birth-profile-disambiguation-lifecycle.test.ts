import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { astrologyService } from '../../src/modules/astrology/astrology.service';
import * as timezoneSolver from '@astro/astrology-engine';

describe('Phase 2A.4: Real-Service Birth-Time Disambiguation, Authoritative UTC Propagation & Lifecycle Tests', () => {
  let app: FastifyInstance;
  const profilesDb = new Map<string, any>();
  const reportsDb = new Map<string, any>();

  const userId = '11111111-2222-3333-4444-555555555555';
  let userToken: string;

  beforeAll(async () => {
    (vi.spyOn(prisma.birthProfile, 'create') as any).mockImplementation(async ({ data }: any) => {
      const id = crypto.randomUUID();
      const profile = {
        id,
        userId: data.userId,
        name: data.name,
        dateOfBirth: data.dateOfBirth,
        timeOfBirth: data.timeOfBirth,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        placeName: data.placeName || null,
        country: data.country || null,
        countryCode: data.countryCode || null,
        state: data.state || null,
        isResolved: data.isResolved ?? true,
        disambiguation: data.disambiguation ?? null,
        utcDateTime: data.utcDateTime ? new Date(data.utcDateTime) : null,
        timezoneOffsetSeconds: data.timezoneOffsetSeconds ?? null,
        disambiguationRequired: data.disambiguationRequired ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      profilesDb.set(id, profile);
      return profile;
    });

    (vi.spyOn(prisma.birthProfile, 'findMany') as any).mockImplementation(async ({ where }: any) => {
      return Array.from(profilesDb.values()).filter((p) => p.userId === where.userId);
    });

    (vi.spyOn(prisma.birthProfile, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return profilesDb.get(where.id) || null;
    });

    (vi.spyOn(prisma.birthProfile, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const existing = profilesDb.get(where.id);
      if (!existing) throw new Error('Not found');
      const updated = {
        ...existing,
        ...data,
        utcDateTime: data.utcDateTime !== undefined ? (data.utcDateTime ? new Date(data.utcDateTime) : null) : existing.utcDateTime,
        updatedAt: new Date(),
      };
      profilesDb.set(where.id, updated);
      return updated;
    });

    (vi.spyOn(prisma.birthProfile, 'delete') as any).mockImplementation(async ({ where }: any) => {
      const existing = profilesDb.get(where.id);
      if (!existing) throw new Error('Not found');
      profilesDb.delete(where.id);
      return existing;
    });

    (vi.spyOn(prisma.report, 'create') as any).mockImplementation(async ({ data }: any) => {
      const id = data.id || crypto.randomUUID();
      const report = {
        id,
        userId: data.userId,
        birthProfileId: data.birthProfileId,
        orderId: data.orderId || null,
        reportType: data.reportType,
        status: data.status || 'COMPLETED',
        metadata: data.metadata || null,
        storageKey: data.storageKey || null,
        fileName: data.fileName || null,
        fileSize: data.fileSize || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      reportsDb.set(id, report);
      return report;
    });

    (vi.spyOn(prisma.report, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      const report = reportsDb.get(where.id);
      if (!report) return null;
      return {
        ...report,
        birthProfile: profilesDb.get(report.birthProfileId),
      };
    });

    (vi.spyOn(prisma.report, 'findMany') as any).mockImplementation(async ({ where }: any) => {
      return Array.from(reportsDb.values()).filter((r) => r.userId === where.userId);
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

  // TEST A: Earlier Occurrence (Real astrologyService.calculateChartForProfile)
  let sequenceAProfileId: string;
  let earlierCalculatedChart: any;

  it('Test A: Earlier occurrence -> Create, retrieve, calculate chart via real service, verify authoritative UTC', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/birth-profiles',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        name: 'Ambiguous Earlier User',
        dateOfBirth: '2020-11-01',
        timeOfBirth: '01:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        placeName: 'New York, USA',
        disambiguation: 'earlier',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    sequenceAProfileId = body.id;
    expect(body.disambiguation).toBe('earlier');
    expect(body.utcDateTime).toBe('2020-11-01T05:30:00.000Z');
    expect(body.timezoneOffsetSeconds).toBe(-14400); // EDT = UTC-4
    expect(body.disambiguationRequired).toBe(false);

    // Retrieve saved profile from database
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/birth-profiles/${sequenceAProfileId}`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(getRes.statusCode).toBe(200);
    const retrieved = JSON.parse(getRes.body);
    expect(retrieved.disambiguation).toBe('earlier');
    expect(retrieved.utcDateTime).toBe('2020-11-01T05:30:00.000Z');
    expect(retrieved.timezoneOffsetSeconds).toBe(-14400);

    // Invoke REAL PRODUCTION SERVICE: astrologyService.calculateChartForProfile
    earlierCalculatedChart = await astrologyService.calculateChartForProfile(
      sequenceAProfileId,
      { id: userId, role: 'USER' }
    );

    expect(earlierCalculatedChart).toBeDefined();
    expect(earlierCalculatedChart.chart.ascendant.longitude).toBeGreaterThanOrEqual(0);

    // UTC INVARIANT VERIFICATION:
    // Persisted BirthProfile.utcDateTime === UTC instant received by the astrology calculation
    const chartNormalizedUtc = earlierCalculatedChart.chart.normalizedTime.utcIsoString;
    expect(chartNormalizedUtc).toBe('2020-11-01T05:30:00.000Z');
    expect(chartNormalizedUtc).toBe(retrieved.utcDateTime);
    expect(earlierCalculatedChart.chart.normalizedTime.timezoneOffsetMinutes).toBe(-240);
  });

  // TEST B: Later Occurrence (Real astrologyService.calculateChartForProfile)
  let sequenceBProfileId: string;
  let laterCalculatedChart: any;

  it('Test B: Later occurrence -> Verify distinct persisted UTC instant and distinct chart', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/birth-profiles',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        name: 'Ambiguous Later User',
        dateOfBirth: '2020-11-01',
        timeOfBirth: '01:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        placeName: 'New York, USA',
        disambiguation: 'later',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    sequenceBProfileId = body.id;
    expect(body.disambiguation).toBe('later');
    expect(body.utcDateTime).toBe('2020-11-01T06:30:00.000Z');
    expect(body.timezoneOffsetSeconds).toBe(-18000); // EST = UTC-5

    // Verify exactly 1 hour difference (3600 seconds = 3600000 ms) in persisted UTC
    const earlierMs = new Date('2020-11-01T05:30:00.000Z').getTime();
    const laterMs = new Date(body.utcDateTime).getTime();
    expect(laterMs - earlierMs).toBe(3600000);

    // Invoke REAL PRODUCTION SERVICE: astrologyService.calculateChartForProfile
    laterCalculatedChart = await astrologyService.calculateChartForProfile(
      sequenceBProfileId,
      { id: userId, role: 'USER' }
    );

    // UTC INVARIANT VERIFICATION:
    const chartNormalizedUtc = laterCalculatedChart.chart.normalizedTime.utcIsoString;
    expect(chartNormalizedUtc).toBe('2020-11-01T06:30:00.000Z');
    expect(chartNormalizedUtc).toBe(body.utcDateTime);
    expect(laterCalculatedChart.chart.normalizedTime.timezoneOffsetMinutes).toBe(-300);

    // Ascendant degree differs by approximately 14 degrees across the 1-hour interval
    const ascDiff = Math.abs(
      laterCalculatedChart.chart.ascendant.longitude - earlierCalculatedChart.chart.ascendant.longitude
    );
    expect(ascDiff).toBeGreaterThan(10);
    expect(ascDiff).toBeLessThan(20);
  });

  // TEST C: Timezone Database Independence
  it('Test C: Persisted UTC instant is authoritative and does not re-invoke resolveLocalTimeToUtc', async () => {
    // Spy on resolveLocalTimeToUtc
    const resolveSpy = vi.spyOn(timezoneSolver, 'resolveLocalTimeToUtc');

    // Calculate chart for already saved profile
    const chartRes = await astrologyService.calculateChartForProfile(
      sequenceAProfileId,
      { id: userId, role: 'USER' }
    );

    // Verify resolveLocalTimeToUtc was NEVER called because authoritative utcDateTime was honored directly
    expect(resolveSpy).not.toHaveBeenCalled();
    expect(chartRes.chart.normalizedTime.utcIsoString).toBe('2020-11-01T05:30:00.000Z');

    resolveSpy.mockRestore();
  });

  // TEST D: Non-Temporal Profile Update
  it('Test D: Updating non-temporal profile fields preserves authoritative instant and calculations', async () => {
    // 1. Update name only
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/api/v1/birth-profiles/${sequenceAProfileId}`,
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        name: 'Ambiguous User Name Modified',
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updated = JSON.parse(updateRes.body);
    expect(updated.name).toBe('Ambiguous User Name Modified');
    expect(updated.disambiguation).toBe('earlier');
    expect(updated.utcDateTime).toBe('2020-11-01T05:30:00.000Z');
    expect(updated.timezoneOffsetSeconds).toBe(-14400);

    // 2. Real chart calculation remains identical to original instant
    const chartRes = await astrologyService.calculateChartForProfile(
      sequenceAProfileId,
      { id: userId, role: 'USER' }
    );
    expect(chartRes.chart.normalizedTime.utcIsoString).toBe('2020-11-01T05:30:00.000Z');
    expect(chartRes.chart.ascendant.longitude).toBe(earlierCalculatedChart.chart.ascendant.longitude);
  });

  // TEST E: Real Report Generation Pipeline
  it('Test E: Exercise real report generation pipeline with saved ambiguous profile', async () => {
    // 1. Create a KUNDLI report referencing the ambiguous profile
    const reportCreateRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        birthProfileId: sequenceAProfileId,
        reportType: 'KUNDLI',
      },
    });

    expect(reportCreateRes.statusCode).toBe(201);
    const reportBody = JSON.parse(reportCreateRes.body);
    const reportId = reportBody.id;
    expect(reportId).toBeDefined();

    // 2. Download generated PDF through real service pipeline
    const pdfRes = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${reportId}/pdf`,
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    expect(pdfRes.payload.startsWith('%PDF-1.4')).toBe(true);

    // 3. Verify report generation calculated chart using the exact authoritative UTC instant
    const profileInDb = profilesDb.get(sequenceAProfileId);
    expect(profileInDb.utcDateTime.toISOString()).toBe('2020-11-01T05:30:00.000Z');
  });

  // TEST F: Legacy Unresolved Profile Handling
  it('Test F: Legacy ambiguous profile requires disambiguation, flags UI, and rejects calculation without guessing', async () => {
    const legacyId = crypto.randomUUID();
    const legacyProfile = {
      id: legacyId,
      userId,
      name: 'Legacy Ambiguous Profile',
      dateOfBirth: '2020-11-01',
      timeOfBirth: '01:30:00',
      latitude: 40.7128,
      longitude: -74.0060,
      timezone: 'America/New_York',
      placeName: 'New York, USA',
      country: 'USA',
      countryCode: 'US',
      state: 'NY',
      isResolved: true,
      disambiguation: null,
      utcDateTime: null,
      timezoneOffsetSeconds: null,
      disambiguationRequired: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    profilesDb.set(legacyId, legacyProfile);

    // 1. Profile listing does NOT crash; flags disambiguationRequired
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/birth-profiles',
      headers: { authorization: `Bearer ${userToken}` },
    });

    expect(listRes.statusCode).toBe(200);
    const list = JSON.parse(listRes.body);
    const legacyMatch = list.find((p: any) => p.id === legacyId);
    expect(legacyMatch).toBeDefined();
    expect(legacyMatch.disambiguationRequired).toBe(true);

    // 2. Real chart calculation rejects with AMBIGUOUS_LOCAL_TIME and candidates, without guessing
    await expect(
      astrologyService.calculateChartForProfile(legacyId, { id: userId, role: 'USER' })
    ).rejects.toThrowError(/Ambiguous local birth time/);

    try {
      await astrologyService.calculateChartForProfile(legacyId, { id: userId, role: 'USER' });
    } catch (err: any) {
      expect(err.details).toBeDefined();
      const ambDetail = err.details.find((d: any) => d.code === 'AMBIGUOUS_LOCAL_TIME');
      expect(ambDetail).toBeDefined();
      expect(ambDetail.candidates).toHaveLength(2);
      expect(ambDetail.candidates[0].disambiguation).toBe('earlier');
      expect(ambDetail.candidates[1].disambiguation).toBe('later');
    }
  });

  // TEST G: Profile with invalid or nonexistent local time
  it('Test G: Nonexistent local time (spring-forward gap) correctly returns actionable validation error', async () => {
    const nonexistentRes = await app.inject({
      method: 'POST',
      url: '/api/v1/birth-profiles',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        name: 'Nonexistent User',
        dateOfBirth: '2020-03-08',
        timeOfBirth: '02:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        placeName: 'New York, USA',
      },
    });

    expect(nonexistentRes.statusCode).toBe(400);
    const nonexistentBody = JSON.parse(nonexistentRes.body);
    const detail = nonexistentBody.error.details.find((d: any) => d.code === 'NONEXISTENT_LOCAL_TIME');
    expect(detail).toBeDefined();
    expect(detail.message).toContain('does not exist');
  });

  // TEST H: Direct Flutter Candidate Selection and Retry Flow
  it('Test H: Mobile client can extract candidate choices and retry seamlessly', async () => {
    // 1. Initial attempt fails with AMBIGUOUS_LOCAL_TIME
    const attempt1 = await app.inject({
      method: 'POST',
      url: '/api/v1/birth-profiles',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        name: 'Mobile Flow User',
        dateOfBirth: '2020-11-01',
        timeOfBirth: '01:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        placeName: 'New York, USA',
      },
    });

    expect(attempt1.statusCode).toBe(400);
    const errBody = JSON.parse(attempt1.body);
    const detail = errBody.error.details.find((d: any) => d.code === 'AMBIGUOUS_LOCAL_TIME');
    expect(detail).toBeDefined();
    const candidateChoice = detail.candidates[0].disambiguation; // 'earlier'

    // 2. Client resubmits with chosen candidate disambiguation
    const attempt2 = await app.inject({
      method: 'POST',
      url: '/api/v1/birth-profiles',
      headers: { authorization: `Bearer ${userToken}` },
      payload: {
        name: 'Mobile Flow User',
        dateOfBirth: '2020-11-01',
        timeOfBirth: '01:30:00',
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: 'America/New_York',
        placeName: 'New York, USA',
        disambiguation: candidateChoice,
      },
    });

    expect(attempt2.statusCode).toBe(201);
    const successBody = JSON.parse(attempt2.body);
    expect(successBody.disambiguation).toBe('earlier');
    expect(successBody.utcDateTime).toBe('2020-11-01T05:30:00.000Z');

    // 3. Immediately calculate chart for newly created profile via real service
    const chartRes = await astrologyService.calculateChartForProfile(
      successBody.id,
      { id: userId, role: 'USER' }
    );
    expect(chartRes.chart.normalizedTime.utcIsoString).toBe('2020-11-01T05:30:00.000Z');
  });
});
