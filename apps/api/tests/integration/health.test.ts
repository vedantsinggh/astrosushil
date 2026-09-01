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
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('GET /health/ready should return readiness status and x-request-id header', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect([200, 503]).toContain(response.statusCode);
    const body = JSON.parse(response.payload);
    expect(body.service).toBe('astro-api');
    expect(body.database).toBeDefined();
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('GET /ready should return readiness status as alias', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    expect([200, 503]).toContain(response.statusCode);
    const body = JSON.parse(response.payload);
    expect(body.service).toBe('astro-api');
    expect(body.database).toBeDefined();
  });

  it('should sanitize untrusted user x-request-id headers', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-request-id': '<script>alert(1)</script>',
      },
    });

    expect(response.statusCode).toBe(200);
    // Should replace hostile header with safe UUID format
    expect(response.headers['x-request-id']).not.toContain('<script>');
  });

  it('should accept valid custom x-request-id headers', async () => {
    const customId = 'req_custom_test_12345678';
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: {
        'x-request-id': customId,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBe(customId);
  });
});
