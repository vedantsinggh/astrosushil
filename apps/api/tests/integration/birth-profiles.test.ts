import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';

describe('Birth Profiles API Endpoints (Integration)', () => {
  let app: FastifyInstance;

  // In-memory data store for profiles tests
  const profilesDb = new Map<string, any>();

  beforeAll(async () => {
    (vi.spyOn(prisma.birthProfile, 'create') as any).mockImplementation(async ({ data }: any) => {
      const id = `profile-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
      const updated = { ...existing, ...data, updatedAt: new Date() };
      profilesDb.set(where.id, updated);
      return updated;
    });

    (vi.spyOn(prisma.birthProfile, 'delete') as any).mockImplementation(async ({ where }: any) => {
      const existing = profilesDb.get(where.id);
      if (!existing) throw new Error('Not found');
      profilesDb.delete(where.id);
      return existing;
    });

    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // JWT Tokens for two distinct users
  let user1Token: string;
  let user2Token: string;
  const user1Id = '11111111-1111-1111-1111-111111111111';
  const user2Id = '22222222-2222-2222-2222-222222222222';

  let createdProfileId: string;

  beforeAll(async () => {
    user1Token = (app as any).jwt.sign({ sub: user1Id, role: 'USER' });
    user2Token = (app as any).jwt.sign({ sub: user2Id, role: 'USER' });
  });

  it('POST /api/v1/birth-profiles should create a valid profile for User 1', async () => {
    const payload = {
      name: 'User 1 Profile',
      dateOfBirth: '1995-10-25',
      timeOfBirth: '08:45:00',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'Delhi, India',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/birth-profiles',
      headers: { authorization: `Bearer ${user1Token}` },
      payload,
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.id).toBeDefined();
    expect(body.name).toBe(payload.name);
    expect(body.userId).toBe(user1Id);
    expect(body.normalizedDetails.utcDateTime).toBeDefined();

    createdProfileId = body.id;
  });

  it('POST /api/v1/birth-profiles should reject invalid latitude (> 90)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/birth-profiles',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        name: 'Invalid Lat',
        dateOfBirth: '1995-10-25',
        timeOfBirth: '08:45:00',
        latitude: 120.0,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/birth-profiles should reject non-existent calendar date (2023-02-29)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/birth-profiles',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        name: 'Invalid Leap Date',
        dateOfBirth: '2023-02-29',
        timeOfBirth: '08:45:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Asia/Kolkata',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('POST /api/v1/birth-profiles should reject invalid timezone', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/birth-profiles',
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        name: 'Invalid TZ',
        dateOfBirth: '1995-10-25',
        timeOfBirth: '08:45:00',
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 'Invalid/City',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('GET /api/v1/birth-profiles should return list of profiles owned by User 1', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/birth-profiles',
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
    expect(body[0].id).toBe(createdProfileId);
  });

  it('GET /api/v1/birth-profiles/:id should return profile details for User 1', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/birth-profiles/${createdProfileId}`,
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.id).toBe(createdProfileId);
  });

  it('GET /api/v1/birth-profiles/:id should DENY User 2 from accessing User 1 profile', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/birth-profiles/${createdProfileId}`,
      headers: { authorization: `Bearer ${user2Token}` },
    });

    expect(response.statusCode).toBe(404); // Returns 404 to prevent ID enumeration
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('PATCH /api/v1/birth-profiles/:id should allow User 1 to update their profile', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/birth-profiles/${createdProfileId}`,
      headers: { authorization: `Bearer ${user1Token}` },
      payload: {
        name: 'Updated User 1 Name via PATCH',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.name).toBe('Updated User 1 Name via PATCH');
  });

  it('PATCH /api/v1/birth-profiles/:id should DENY User 2 from updating User 1 profile', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/birth-profiles/${createdProfileId}`,
      headers: { authorization: `Bearer ${user2Token}` },
      payload: {
        name: 'Hacked Name',
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it('DELETE /api/v1/birth-profiles/:id should DENY User 2 from deleting User 1 profile', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/birth-profiles/${createdProfileId}`,
      headers: { authorization: `Bearer ${user2Token}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it('DELETE /api/v1/birth-profiles/:id should allow User 1 to delete their profile', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/birth-profiles/${createdProfileId}`,
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(response.statusCode).toBe(200);

    // Verify profile is deleted
    const checkResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/birth-profiles/${createdProfileId}`,
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(checkResponse.statusCode).toBe(404);
  });

  it('All endpoints should return 401 when accessed without authentication', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/birth-profiles',
    });

    expect(response.statusCode).toBe(401);
  });
});
