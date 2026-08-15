import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';

describe('Astrology API Endpoints Integration Tests (Phase 3)', () => {
  let app: FastifyInstance;

  // In-memory profiles mock database
  const profilesDb = new Map<string, any>();

  const user1Id = '11111111-1111-1111-1111-111111111111';
  const user2Id = '22222222-2222-2222-2222-222222222222';
  let user1Token: string;
  let user2Token: string;

  const user1ProfileId = '33333333-3333-3333-3333-333333333333';
  const user2ProfileId = '44444444-4444-4444-4444-444444444444';

  beforeAll(async () => {
    // Populate mock DB
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

    vi.spyOn(prisma.birthProfile, 'findUnique').mockImplementation(async ({ where }: any) => {
      return profilesDb.get(where.id) || null;
    });

    app = buildApp();
    await app.ready();

    user1Token = app.jwt.sign({ sub: user1Id, role: 'USER' });
    user2Token = app.jwt.sign({ sub: user2Id, role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // 1. AUTHENTICATION & AUTHORIZATION TESTS
  it('POST /api/v1/astrology/chart should return 401 when request is unauthenticated', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      payload: { birthProfileId: user1ProfileId },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('POST /api/v1/astrology/chart should DENY User 2 from calculating chart for User 1 birth profile (404 NOT_FOUND)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      headers: { authorization: `Bearer ${user2Token}` },
      payload: { birthProfileId: user1ProfileId },
    });

    expect(response.statusCode).toBe(404); // Ownership guard: 404 to prevent ID enumeration
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Birth profile not found');
  });

  // 2. REQUEST VALIDATION TESTS
  it('POST /api/v1/astrology/chart should return 400 VALIDATION_ERROR for missing birthProfileId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/astrology/chart should return 400 VALIDATION_ERROR for malformed non-UUID birthProfileId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: { birthProfileId: 'invalid-non-uuid-string' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/astrology/chart should return 404 NOT_FOUND for nonexistent birthProfileId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: { birthProfileId: '99999999-9999-9999-9999-999999999999' },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  // 3. CALCULATION & CONTRACT INTEGRATION TESTS
  it('POST /api/v1/astrology/chart should calculate AstroChart for authenticated user owner', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: { birthProfileId: user1ProfileId },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);

    expect(body.chart).toBeDefined();
    expect(body.chart.calculationVersion).toBe('0.1.0');
    expect(body.chart.providerName).toBeDefined();

    // Verify Contract Integrity & Accuracy:
    // User 1 birth profile (1990-05-15 14:30:00 Asia/Kolkata) -> 1990-05-15T09:00:00.000Z UTC
    expect(body.chart.normalizedTime.utcIsoString).toBe('1990-05-15T09:00:00.000Z');
    expect(body.chart.normalizedTime.timezoneOffsetMinutes).toBe(330);
    expect(body.chart.normalizedTime.julianDayUT).toBeCloseTo(2448026.875, 4);

    // Verify Config Metadata
    expect(body.chart.config.zodiacType).toBe('SIDEREAL');
    expect(body.chart.config.ayanamsa).toBe('LAHIRI');
    expect(body.chart.config.houseSystem).toBe('WHOLE_SIGN');

    // Verify Planets Array Data Vector
    expect(Array.isArray(body.chart.planets)).toBe(true);
    expect(body.chart.planets.length).toBeGreaterThanOrEqual(9);

    const sun = body.chart.planets.find((p: any) => p.planet === 'SUN');
    expect(sun).toBeDefined();
    expect(sun.rashiIndex).toBeGreaterThanOrEqual(1);
    expect(sun.rashiIndex).toBeLessThanOrEqual(12);
    expect(sun.nakshatraIndex).toBeGreaterThanOrEqual(1);
    expect(sun.nakshatraIndex).toBeLessThanOrEqual(27);
    expect(sun.pada).toBeGreaterThanOrEqual(1);
    expect(sun.pada).toBeLessThanOrEqual(4);
  });
});
