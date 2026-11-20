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
    // Current request contract: ISO `timestamp` + IANA `timezone` + transit `location`
    // (natal birthDetails/birthProfileId optional). Response is wrapped in `{ data }`.
    const transitPayload = {
      birthDetails: validBirthDetails,
      timestamp: '2026-09-24T06:00:00',
      timezone: 'Asia/Kolkata',
      location: { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', placeName: 'New Delhi, India' },
    };
    const planets = ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN', 'RAHU', 'KETU'];

    it('calculates Gochara planetary transits for 9 Grahas against natal Lagna & Moon', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/gochara',
        payload: transitPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload).data;

      expect(body.calculationVersion).toBeDefined();
      expect(body.transitChart.transitTime.utcIso).toBe('2026-09-24T00:30:00.000Z');
      expect(body.transitChart.transitTime.timezone).toBe('Asia/Kolkata');

      for (const p of planets) {
        const t = body.transitChart.planets[p];
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

        const fromLagna = body.transitToLagna.find((x: any) => x.transitPlanet === p);
        expect(fromLagna).toBeDefined();
        expect(fromLagna.natalLagnaSignIndex).toBe(6); // natal Kanya Lagna
        expect(fromLagna.transitSignIndex).toBe(t.rashiIndex);
        expect(fromLagna.houseFromLagna).toBe(((t.rashiIndex - 6 + 12) % 12) + 1);

        const fromMoon = body.transitToMoon.find((x: any) => x.transitPlanet === p);
        expect(fromMoon).toBeDefined();
        expect(fromMoon.natalMoonSignIndex).toBe(10); // natal Makara Moon
        expect(fromMoon.houseFromMoon).toBe(((t.rashiIndex - 10 + 12) % 12) + 1);
      }

      expect(Array.isArray(body.aspectsToNatal)).toBe(true);
      expect(body.aspectsToNatal.length).toBeGreaterThan(0);
      expect(Array.isArray(body.transitToNatalPlanets)).toBe(true);

      // Ashtakavarga transit scoring (BAV 0-8 bindus per sign)
      expect(body.ashtakavargaTransit).toHaveLength(9);
      for (const av of body.ashtakavargaTransit) {
        expect(av.bavPoints).toBeGreaterThanOrEqual(0);
        expect(av.bavPoints).toBeLessThanOrEqual(8);
        expect(typeof av.isBavFavorable).toBe('boolean');
      }

      // Kakshya division: 8 Kakshyas of 3 deg 45 min per sign
      expect(body.gocharaKakshas).toHaveLength(9);
      for (const k of body.gocharaKakshas) {
        expect(k.kakshaIndex).toBeGreaterThanOrEqual(1);
        expect(k.kakshaIndex).toBeLessThanOrEqual(8);
        expect(k.kakshaRuler).toBeDefined();
        expect(k.endDegree - k.startDegree).toBeCloseTo(3.75, 6);
        expect(k.degreeInSign).toBeGreaterThanOrEqual(k.startDegree);
        expect(k.degreeInSign).toBeLessThan(k.endDegree);
        expect(typeof k.hasNatalBindu).toBe('boolean');
      }

      // Sade Sati / Dhaiya classifications were deliberately decommissioned (Phase 2B.2
      // editorial policy); the transit snapshot must stay neutral.
      expect(response.payload).not.toMatch(/sadeSati|dhaiya/i);
    });

    it('reports Vedha obstruction and Guru transit favourability per transit planet', async () => {
      // NOT IMPLEMENTED in packages/astrology-engine (TransitCalculator computes no Vedha
      // and no Guru Peyarchi favourability). Left failing intentionally pending spec/engine work.
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/gochara',
        payload: transitPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload).data;
      for (const p of planets) {
        const fromMoon = body.transitToMoon.find((x: any) => x.transitPlanet === p);
        expect(fromMoon.vedha).toBeDefined();
      }
      expect(typeof body.majorTransits?.isGuruPeyarchiFavorable).toBe('boolean');
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
      // No Gochara entry exists in the engine ConventionRegistry yet (pending spec content).
      const body = JSON.parse(response.payload).data;
      expect(body.conventions.gocharaTransit).toBeDefined();
      expect(body.conventions.gocharaTransit.subsystem).toBe('Gochara Planetary Transit Engine');
    });
  });
});
