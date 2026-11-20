import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { ChartCalculator, DEFAULT_ASTROLOGY_CONFIG, PlanetSymbol } from '@astro/astrology-engine';

/**
 * Optional `ayanamsa` / `nodeType` body fields on the astrology endpoints (engine 0.2.0, ADR-017).
 * Expected values come from calling the engine directly with the same configuration.
 */
describe('Astrology calculation options (ayanamsa / nodeType)', () => {
  let app: FastifyInstance;
  const birthDetails = {
    name: 'Options Test',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
  };
  const engineBirth = {
    date: { year: 1990, month: 5, day: 15 },
    time: { hour: 14, minute: 30, second: 0 },
    timezone: 'Asia/Kolkata',
    latitude: 28.6139,
    longitude: 77.209,
  };

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const moonOf = (body: any) => body.chart.planets.find((p: any) => p.name === 'MOON' || p.planet === 'MOON');

  it('defaults to true Lahiri and the mean node', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/astrology/chart', payload: { birthDetails } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.chart.config.ayanamsa).toBe('LAHIRI');
    expect(body.chart.config.nodeCalculation).toBe('MEAN_NODE');
    const chart = await new ChartCalculator().calculateChart(engineBirth, DEFAULT_ASTROLOGY_CONFIG);
    expect(moonOf(body).absoluteDegree ?? moonOf(body).longitude).toBeCloseTo(chart.planets[PlanetSymbol.MOON].longitude, 3);
  });

  it('applies a selected ayanamsa and node type', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      payload: { birthDetails, ayanamsa: 'RAMAN', nodeType: 'TRUE_NODE' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.chart.config.ayanamsa).toBe('RAMAN');
    expect(body.chart.config.nodeCalculation).toBe('TRUE_NODE');
    const chart = await new ChartCalculator().calculateChart(engineBirth, {
      ...DEFAULT_ASTROLOGY_CONFIG,
      ayanamsa: 'RAMAN',
      nodeCalculation: 'TRUE_NODE',
    });
    expect(moonOf(body).absoluteDegree ?? moonOf(body).longitude).toBeCloseTo(chart.planets[PlanetSymbol.MOON].longitude, 3);
  });

  it('applies the options to other astrology endpoints (KP)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/astrology/kp', payload: { birthDetails, ayanamsa: 'KP' } });
    expect(res.statusCode).toBe(200);
    const text = res.body;
    expect(text).toContain('"cuspSystem":"PLACIDUS"');
    expect(text).toContain('"ayanamsaType":"KP"');
  });

  it('rejects invalid values with the standard error envelope', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/chart',
      payload: { birthDetails, ayanamsa: 'YUKTESHWAR' },
      headers: { 'x-request-id': 'options-test-0001' },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.requestId).toBe('options-test-0001');
    expect(body.error.details[0].field).toBe('ayanamsa');
  });
});
