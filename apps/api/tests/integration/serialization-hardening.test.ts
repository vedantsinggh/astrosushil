import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';

describe('Phase 2Y Full Serialization Hardening & Empty-Object Zero Bug Audit', () => {
  let app: FastifyInstance;

  const testBirthDetails = {
    name: 'Standard Native',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
  };

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  const endpointsToAudit = [
    { name: 'Natal Chart', method: 'POST' as const, url: '/api/v1/astrology/chart', payload: { birthDetails: testBirthDetails } },
    { name: 'Kundli', method: 'POST' as const, url: '/api/v1/astrology/kundli', payload: { birthDetails: testBirthDetails } },
    { name: 'Vargas', method: 'POST' as const, url: '/api/v1/astrology/vargas', payload: { birthDetails: testBirthDetails, vargaTypes: ['D9', 'D10'] } },
    { name: 'Dashas', method: 'POST' as const, url: '/api/v1/astrology/dashas', payload: { birthDetails: testBirthDetails, maxLevel: 2 } },
    { name: 'Yogas', method: 'POST' as const, url: '/api/v1/astrology/yogas', payload: { birthDetails: testBirthDetails } },
    { name: 'Panchang', method: 'POST' as const, url: '/api/v1/astrology/panchang', payload: { dateOfBirth: testBirthDetails.dateOfBirth, timeOfBirth: testBirthDetails.timeOfBirth, latitude: testBirthDetails.latitude, longitude: testBirthDetails.longitude, timezone: testBirthDetails.timezone } },
    { name: 'Special Points', method: 'POST' as const, url: '/api/v1/astrology/special-points', payload: { birthDetails: testBirthDetails, dayOfWeek: 2, isDaytime: true } },
    { name: 'Jaimini', method: 'POST' as const, url: '/api/v1/astrology/jaimini', payload: { birthDetails: testBirthDetails } },
    { name: 'KP', method: 'POST' as const, url: '/api/v1/astrology/kp', payload: { birthDetails: testBirthDetails } },
    { name: 'Chart Variants', method: 'POST' as const, url: '/api/v1/astrology/chart-variants', payload: { birthDetails: testBirthDetails, variantType: 'MOON_CHART' } },
    { name: 'Planetary Intelligence', method: 'POST' as const, url: '/api/v1/astrology/planetary-intelligence', payload: { birthDetails: testBirthDetails } },
    // Chakras (Avakhada / Ghat / Tara), Vimshopaka Bala and Shadbala+Bhava Bala are served by the
    // consolidated /avakhada, /vimshopaka and /strength endpoints.
    { name: 'Chakras (Avakhada)', method: 'POST' as const, url: '/api/v1/astrology/avakhada', payload: { birthDetails: testBirthDetails } },
    { name: 'Vimshopaka Bala', method: 'POST' as const, url: '/api/v1/astrology/vimshopaka', payload: { birthDetails: testBirthDetails } },
    { name: 'Shadbala & Bhava Bala', method: 'POST' as const, url: '/api/v1/astrology/strength', payload: { birthDetails: testBirthDetails } },
    { name: 'Ashtakavarga', method: 'POST' as const, url: '/api/v1/astrology/ashtakavarga', payload: { birthDetails: testBirthDetails } },
    { name: 'Ashtottari Dasha', method: 'POST' as const, url: '/api/v1/astrology/dasha', payload: { birthDetails: testBirthDetails, dashaSystem: 'ASHTOTTARI', maxLevel: 2 } },
    { name: 'Yogini Dasha', method: 'POST' as const, url: '/api/v1/astrology/dashas/yogini', payload: { birthDetails: testBirthDetails, maxLevel: 2 } },
    { name: 'Chara Dasha', method: 'POST' as const, url: '/api/v1/astrology/dashas/chara', payload: { birthDetails: testBirthDetails, maxLevel: 2 } },
    { name: 'Narayana Dasha', method: 'POST' as const, url: '/api/v1/astrology/dashas/narayana', payload: { birthDetails: testBirthDetails, maxLevel: 2 } },
    { name: 'Kalachakra Dasha', method: 'POST' as const, url: '/api/v1/astrology/dashas/kalachakra', payload: { birthDetails: testBirthDetails, maxLevel: 2 } },
    { name: 'Conditional Dasha', method: 'POST' as const, url: '/api/v1/astrology/dasha', payload: { birthDetails: testBirthDetails, dashaSystem: 'DWISAPTATI_SAMA', maxLevel: 2 } },
    { name: 'Gochara Transits', method: 'POST' as const, url: '/api/v1/astrology/gochara', payload: { birthDetails: testBirthDetails, timestamp: '2026-09-24T06:00:00', timezone: 'Asia/Kolkata', location: { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' } } },
    { name: 'Varshaphala', method: 'POST' as const, url: '/api/v1/astrology/varshaphala', payload: { birthDetails: testBirthDetails, targetYear: 2025 } },
    { name: 'Prashna', method: 'POST' as const, url: '/api/v1/astrology/prashna', payload: { questionTimestamp: '2026-09-24T10:00:00', timezone: 'Asia/Kolkata', location: { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', placeName: 'New Delhi, India' } } },
    { name: 'Matchmaking', method: 'POST' as const, url: '/api/v1/astrology/matchmaking', payload: { boy: { birthDetails: testBirthDetails }, girl: { birthDetails: testBirthDetails } } },
    { name: 'Conventions', method: 'GET' as const, url: '/api/v1/astrology/conventions', payload: undefined },
  ];

  for (const ep of endpointsToAudit) {
    it(`audits endpoint ${ep.name} (${ep.url}) for zero empty object "{}" fallback bugs and valid serialization`, async () => {
      const response = await app.inject({
        method: ep.method,
        url: ep.url,
        payload: ep.payload,
      });

      expect(response.statusCode).toBe(200);
      const rawText = response.payload;

      // Serialization Hardening Assertions:
      expect(rawText).not.toBe('{}');
      expect(rawText).not.toContain('NaN');
      expect(rawText).not.toContain('Infinity');
      expect(rawText).not.toContain('undefined');
      expect(rawText).not.toContain('"[object Object]"');

      const parsed = JSON.parse(rawText);
      expect(typeof parsed).toBe('object');
      expect(parsed).not.toBeNull();
      expect(Object.keys(parsed).length).toBeGreaterThan(0);
    });
  }
});
