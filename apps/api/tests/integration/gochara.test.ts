import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';

describe('Phase 2G/2V Gochara Planetary Transits API Integration Tests', () => {
  let app: FastifyInstance;

  const validBirthDetails = {
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

  describe('POST /api/v1/astrology/gochara', () => {
    it('calculates Gochara planetary transits for 9 Grahas against natal Lagna & Moon', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/gochara',
        payload: {
          birthDetails: validBirthDetails,
          transitDate: '2026-09-24',
          transitTime: '06:00:00',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);

      expect(body.birthDetails).toBeDefined();
      expect(body.transitDateIso).toBeDefined();
      expect(body.natalLagnaRashiIndex).toBeGreaterThanOrEqual(1);
      expect(body.natalMoonRashiIndex).toBeGreaterThanOrEqual(1);

      expect(body.transits).toBeDefined();
      const planets = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU'];

      for (const p of planets) {
        const t = body.transits[p];
        expect(t).toBeDefined();
        expect(t.planet).toBe(p);
        expect(t.longitude).toBeGreaterThanOrEqual(0);
        expect(t.longitude).toBeLessThan(360);
        expect(t.rashiIndex).toBeGreaterThanOrEqual(1);
        expect(t.rashiIndex).toBeLessThanOrEqual(12);
        expect(t.rashiName).toBeDefined();
        expect(t.degreeInRashi).toBeGreaterThanOrEqual(0);
        expect(t.nakshatraIndex).toBeGreaterThanOrEqual(1);
        expect(t.nakshatraIndex).toBeLessThanOrEqual(27);
        expect(t.pada).toBeGreaterThanOrEqual(1);
        expect(t.pada).toBeLessThanOrEqual(4);

        expect(t.houseFromLagna).toBeGreaterThanOrEqual(1);
        expect(t.houseFromLagna).toBeLessThanOrEqual(12);
        expect(t.houseFromMoon).toBeGreaterThanOrEqual(1);
        expect(t.houseFromMoon).toBeLessThanOrEqual(12);

        expect(Array.isArray(t.aspectsToNatalPlanets)).toBe(true);
        expect(t.vedha).toBeDefined();
      }

      // Major Transits
      expect(body.majorTransits).toBeDefined();
      expect(body.majorTransits.saturnHouseFromMoon).toBeGreaterThanOrEqual(1);
      expect(body.majorTransits.saturnHouseFromMoon).toBeLessThanOrEqual(12);
      expect(typeof body.majorTransits.isSadeSati).toBe('boolean');
      expect(typeof body.majorTransits.isDhaiya).toBe('boolean');
      expect(typeof body.majorTransits.isGuruPeyarchiFavorable).toBe('boolean');
    });

    it('returns 400 when invalid birth details are provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/gochara',
        payload: {
          birthDetails: {
            ...validBirthDetails,
            latitude: 150, // invalid latitude
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when neither birthProfileId nor birthDetails is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/gochara',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/astrology/conventions', () => {
    it('includes gochara_transit in registry response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/astrology/conventions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.conventions.gocharaTransit).toBeDefined();
      expect(body.conventions.gocharaTransit.subsystem).toBe('Gochara Planetary Transit Engine');
    });
  });
});
