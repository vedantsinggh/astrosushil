import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Health API Endpoint (Integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should return 200 OK with service status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('astro-api');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /api/v1/health should return 200 OK with service status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('astro-api');
  });

  it('GET /api/v1/non-existent-route should return 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/non-existent-route',
    });

    expect(response.statusCode).toBe(404);
  });
});
