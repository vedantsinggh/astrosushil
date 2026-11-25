import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import fs from 'fs';
import path from 'path';
import { globalErrorHandler } from '../../src/errors/error-handler';
import { registerCors } from '../../src/plugins/cors';
import { AppError } from '../../src/errors/app-error';
import { reportsRoutes } from '../../src/modules/reports/reports.routes';
import { exchangeRateService, FakeExchangeRateProvider } from '../../src/modules/commerce/money/rates';

describe('Security & API Audit Regression Fixes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('SEC-001: globalErrorHandler does not reflect arbitrary Origin headers', async () => {
    const app = Fastify();
    app.setErrorHandler(globalErrorHandler);
    app.get('/boom', async () => {
      throw new AppError('Test failure', 400, 'TEST_FAILURE');
    });

    const res = await app.inject({
      method: 'GET',
      url: '/boom',
      headers: { origin: 'https://evil.attacker.com' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    const body = res.json();
    expect(body.error.code).toBe('TEST_FAILURE');
  });

  it('SEC-002: registerCors rejects substring-spoofed origins in production and allows exact match', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://astrosushil.com,https://admin.astrosushil.com';

    const app = Fastify();
    await app.register(registerCors);
    app.get('/ping', async () => ({ ok: true }));

    const evilLocalhost = await app.inject({
      method: 'GET',
      url: '/ping',
      headers: { origin: 'https://evil-localhost.com' },
    });
    expect(evilLocalhost.headers['access-control-allow-origin']).toBeUndefined();

    const evilTunnel = await app.inject({
      method: 'GET',
      url: '/ping',
      headers: { origin: 'https://trycloudflare.com.attacker.com' },
    });
    expect(evilTunnel.headers['access-control-allow-origin']).toBeUndefined();

    const prodLocalhost = await app.inject({
      method: 'GET',
      url: '/ping',
      headers: { origin: 'http://localhost:3000' },
    });
    expect(prodLocalhost.headers['access-control-allow-origin']).toBeUndefined();

    const validOrigin = await app.inject({
      method: 'GET',
      url: '/ping',
      headers: { origin: 'https://astrosushil.com' },
    });
    expect(validOrigin.headers['access-control-allow-origin']).toBe('https://astrosushil.com');
    expect(validOrigin.headers['access-control-allow-credentials']).toBe('true');
  });

  it('SEC-008: report-engine compileLatex includes -no-shell-escape', () => {
    const docPath = path.resolve(__dirname, '../../../../packages/report-engine/src/platform/render/document.ts');
    const source = fs.readFileSync(docPath, 'utf-8');
    expect(source).toContain("'-no-shell-escape'");
  });

  it('API-001: /reports/download-secure is reachable without JWT and returns standard error envelope', async () => {
    const app = Fastify();
    app.decorate('authenticate', async () => {
      throw new Error('authenticate should not run on /download-secure');
    });
    await app.register(reportsRoutes, { prefix: '/api/v1/reports' });

    const missingParams = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/download-secure',
    });
    expect(missingParams.statusCode).toBe(400);
    const body = missingParams.json();
    expect(body.error.code).toBe('MISSING_SIGNATURE_PARAMS');
    expect(body.error.requestId).toBeDefined();
  });

  it('API-007: exchangeRateService.getPublicRates returns INR-based rates without throwing', async () => {
    exchangeRateService.configure(new FakeExchangeRateProvider({ USD: 0.012 }));
    const snap = await exchangeRateService.getPublicRates();
    expect(snap.base).toBe('INR');
    expect(snap.rates.INR).toBe(1);
    expect(snap.rates.USD).toBe(0.012);
  });
});
