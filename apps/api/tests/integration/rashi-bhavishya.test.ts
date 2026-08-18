import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';

describe('Rashi Bhavishya API Endpoints Integration Tests', () => {
  let app: FastifyInstance;
  const user1Id = '11111111-1111-1111-1111-111111111111';
  let user1Token: string;

  beforeAll(async () => {
    vi.spyOn(prisma.birthProfile, 'findFirst').mockImplementation(async ({ where }: any) => {
      if (where.userId === user1Id) {
        return {
          id: 'profile-1',
          userId: user1Id,
          name: 'Test Profile',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30:00',
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 'Asia/Kolkata',
          placeName: 'Delhi',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return null;
    });

    app = buildApp();
    await app.ready();
    user1Token = app.jwt.sign({ sub: user1Id, role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('GET /api/v1/rashi-bhavishya/today should return prediction based on user birth profile Moon Rashi', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/rashi-bhavishya/today',
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data).toBeDefined();
    expect(body.data.rashi).toBeDefined();
    expect(body.data.rashi.sanskritName).toBeDefined();
    expect(body.data.prediction).toBeDefined();
    expect(body.data.prediction.categories.health).toBeDefined();
    expect(body.data.isDevelopmentFixture).toBe(true);
  });

  it('GET /api/v1/rashi-bhavishya/today with ?rashi=Mesha should return prediction for Mesha', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/rashi-bhavishya/today?rashi=Mesha',
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.rashi.index).toBe(1);
    expect(body.data.rashi.sanskritName).toBe('Mesha');
  });

  it('GET /api/v1/rashi-bhavishya/all should list predictions for all 12 Rashis', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/rashi-bhavishya/all',
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(12);
  });
});
