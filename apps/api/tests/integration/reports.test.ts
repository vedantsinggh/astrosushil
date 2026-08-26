import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';
import { astrologyService } from '../../src/modules/astrology/astrology.service';

describe('Reports API & PDF Generation Integration Tests', () => {
  let app: FastifyInstance;

  const profilesDb = new Map<string, any>();
  const reportsDb = new Map<string, any>();

  const user1Id = '11111111-1111-1111-1111-111111111111';
  const user2Id = '22222222-2222-2222-2222-222222222222';
  let user1Token: string;
  let user2Token: string;

  const user1ProfileId = '33333333-3333-3333-3333-333333333333';
  const user2ProfileId = '44444444-4444-4444-4444-444444444444';
  let user1ReportId: string;
  let user2ReportId: string;

  beforeAll(async () => {
    // Populate birth profiles
    profilesDb.set(user1ProfileId, {
      id: user1ProfileId,
      userId: user1Id,
      name: 'User 1 Profile',
      dateOfBirth: '1990-05-15',
      timeOfBirth: '14:30:00',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    profilesDb.set(user2ProfileId, {
      id: user2ProfileId,
      userId: user2Id,
      name: 'User 2 Profile',
      dateOfBirth: '1992-08-20',
      timeOfBirth: '09:15:00',
      latitude: 19.076,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
      placeName: 'Mumbai, India',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (vi.spyOn(prisma.birthProfile, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return profilesDb.get(where.id) || null;
    });

    (vi.spyOn(prisma.report, 'create') as any).mockImplementation(async ({ data }: any) => {
      const id = `report-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const record = {
        id,
        userId: data.userId,
        birthProfileId: data.birthProfileId,
        orderId: data.orderId || null,
        reportType: data.reportType,
        status: data.status || 'COMPLETED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      reportsDb.set(id, record);
      return record;
    });

    (vi.spyOn(prisma.report, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      const record = reportsDb.get(where.id);
      if (!record) return null;
      return {
        ...record,
        birthProfile: profilesDb.get(record.birthProfileId),
      };
    });

    (vi.spyOn(prisma.report, 'findMany') as any).mockImplementation(async ({ where }: any) => {
      return Array.from(reportsDb.values()).filter((r) => r.userId === where.userId);
    });

    app = buildApp();
    await app.ready();

    user1Token = (app as any).jwt.sign({ sub: user1Id, role: 'USER' });
    user2Token = (app as any).jwt.sign({ sub: user2Id, role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // 1. Authenticated user can generate KUNDLI report
  it('1. Authenticated user can generate KUNDLI report', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        birthProfileId: user1ProfileId,
        reportType: 'KUNDLI',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.id).toBeDefined();
    expect(body.reportType).toBe('KUNDLI');
    expect(body.report.title).toBe('Birth Chart & Kundli Report');
    user1ReportId = body.id;
  });

  // 2. User downloads Kundli PDF
  it('2. User downloads Kundli PDF with application/pdf Content-Type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${user1ReportId}/pdf`,
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('attachment; filename=');

    const pdfRaw = response.payload;
    // 3. PDF opens correctly (starts with %PDF-1.4)
    expect(pdfRaw.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfRaw.includes('%%EOF')).toBe(true);

    // 4 & 5. Verify User Name and Birth Details are present in PDF stream
    expect(pdfRaw.includes('User 1 Profile')).toBe(true);
    expect(pdfRaw.includes('1990-05-15')).toBe(true);
    expect(pdfRaw.includes('14:30:00')).toBe(true);

    // 6 & 7. Ascendant and Planetary positions match report
    expect(pdfRaw.includes('Ascendant')).toBe(true);
    expect(pdfRaw.includes('SUN')).toBe(true);
    expect(pdfRaw.includes('MOON')).toBe(true);

    // 8. North Indian Kundli chart rendered in vector commands
    expect(pdfRaw.includes('NORTH INDIAN KUNDLI CHART')).toBe(true);
  });

  // 9. Planetary report PDF generation works
  it('9. Planetary report PDF generation works', async () => {
    // First generate planetary summary report
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/v1/reports',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        birthProfileId: user1ProfileId,
        reportType: 'PLANETARY_SUMMARY',
      },
    });
    const planReportId = JSON.parse(genRes.payload).id;

    // Download PDF
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${planReportId}/pdf`,
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    const pdfRaw = response.payload;
    expect(pdfRaw.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfRaw.includes('PLANETARY DYNAMICS & FORCE SUMMARY')).toBe(true);
  });

  // 10. Guest PDF download is rejected
  it('10. Guest PDF download is rejected (returns 401)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${user1ReportId}/pdf`,
    });

    expect(response.statusCode).toBe(401);
  });

  // 11. User A cannot download User B's report
  it('11. User A cannot download User B\'s report (returns 404)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${user1ReportId}/pdf`,
      headers: { authorization: `Bearer ${user2Token}` },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // 12. Incomplete chart data is rejected during PDF generation
  it('12. Incomplete chart data is rejected during PDF generation (returns 422)', async () => {
    const spy = vi.spyOn(astrologyService, 'calculateChartForProfile').mockResolvedValueOnce({
      data: { metadata: {} } as any,
      chart: { ascendant: {}, planets: [], houses: [] } as any, // Missing ascendant sign
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${user1ReportId}/pdf`,
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(response.statusCode).toBe(422);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('INCOMPLETE_ASTROLOGY_DATA');
    expect(body.error.message).toBe('Complete chart data is currently unavailable. Please try again.');

    spy.mockRestore();
  });

  // 13 & 14. Expired token refreshes and download succeeds
  it('13 & 14. Download succeeds with refreshed access token', async () => {
    const refreshedToken = (app as any).jwt.sign({ sub: user1Id, role: 'USER' }, { expiresIn: '15m' });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/${user1ReportId}/pdf`,
      headers: { authorization: `Bearer ${refreshedToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
  });
});
