import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Locations Search API Endpoints (Integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/locations/search?q=Delhi should return 200 with verified location results', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/locations/search?q=Delhi',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    const first = body[0];
    expect(first.name).toBeDefined();
    expect(first.displayName).toBeDefined();
    expect(first.country).toBe('India');
    expect(first.countryCode).toBe('IN');
    expect(first.latitude).toBeCloseTo(28.6139, 1);
    expect(first.longitude).toBeCloseTo(77.2090, 1);
    expect(first.timezone).toBe('Asia/Kolkata');
  });

  it('GET /api/v1/locations/search?q=a should return 400 validation error (min 2 chars required)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/locations/search?q=a',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/locations/search without "q" param should return 400 validation error', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/locations/search',
    });

    expect(response.statusCode).toBe(400);
  });
});
