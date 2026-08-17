import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Vastu API Endpoints Integration Tests', () => {
  let app: FastifyInstance;
  const user1Id = '11111111-1111-1111-1111-111111111111';
  let user1Token: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    user1Token = app.jwt.sign({ sub: user1Id, role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/vastu/categories should return all 8 Vastu categories', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/vastu/categories',
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(8);
    expect(body.data[0].slug).toBe('main-entrance');
  });

  it('GET /api/v1/vastu/guidance should return guidance items for all categories', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/vastu/guidance',
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(8);
    expect(body.data[0].idealDirection).toBeDefined();
    expect(body.data[0].dos.length).toBeGreaterThan(0);
    expect(body.data[0].remedies.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/vastu/guidance?categoryId=1 should return guidance for Main Entrance', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/vastu/guidance?categoryId=1',
      headers: { authorization: `Bearer ${user1Token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.data.length).toBe(1);
    expect(body.data[0].categorySlug).toBe('main-entrance');
  });
});
