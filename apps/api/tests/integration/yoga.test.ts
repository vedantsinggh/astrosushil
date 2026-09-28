import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';

describe('Yoga API Endpoints Integration Tests (Phase 2W)', () => {
  let app: FastifyInstance;

  const profilesDb = new Map<string, any>();
  const user1Id = '11111111-1111-1111-1111-111111111111';
  const user1ProfileId = '33333333-3333-3333-3333-333333333333';
  let user1Token: string;

  beforeAll(async () => {
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

    (vi.spyOn(prisma.birthProfile, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return profilesDb.get(where.id) || null;
    });

    app = buildApp();
    await app.ready();

    user1Token = (app as any).jwt.sign({ sub: user1Id, role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('POST /api/v1/astrology/yogas should evaluate Yogas for direct birth details (Guest Mode)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/yogas',
      payload: {
        birthDetails: {
          name: 'Guest User',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(body.data.yogas).toBeDefined();
    expect(body.data.yogas.totalEvaluated).toBeGreaterThan(0);
    expect(Array.isArray(body.data.yogas.detectedYogas)).toBe(true);
    expect(body.data.yogas.categoriesSummary).toBeDefined();
  });

  it('POST /api/v1/astrology/yogas should evaluate Yogas for saved birth profile with category filter', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/yogas',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        birthProfileId: user1ProfileId,
        categories: ['MAHAPURUSHA', 'RAJA'],
        includeUndetected: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.yogas).toBeDefined();
    expect(body.data.yogas.undetectedYogas).toBeDefined();

    for (const y of body.data.yogas.detectedYogas) {
      expect(['MAHAPURUSHA', 'RAJA']).toContain(y.category);
    }
  });

  it('POST /api/v1/astrology/yogas should evaluate specific Yogas by IDs', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/yogas',
      payload: {
        birthDetails: {
          name: 'Guest User',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
        },
        yogaIds: ['GAJAKESARI_YOGA', 'BUDHA_ADITYA_YOGA'],
        includeUndetected: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.yogas.totalEvaluated).toBe(2);
  });

  it('POST /api/v1/astrology/yogas should return 400 validation error for missing birthDetails & birthProfileId', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/yogas',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
