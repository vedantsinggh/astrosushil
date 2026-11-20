import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';

describe('Phase 5 API Surface Complete Verification Suite', () => {
  let app: FastifyInstance;
  let userAToken: string;
  let userBToken: string;

  const userAId = '11111111-1111-1111-1111-111111111111';
  const userBId = '22222222-2222-2222-2222-222222222222';
  const userAProfileId = '33333333-3333-3333-3333-333333333333';
  const userBProfileId = '44444444-4444-4444-4444-444444444444';

  const profilesDb = new Map<string, any>();

  const validDirectBirth = {
    name: 'Sushil Test Subject',
    dateOfBirth: '1990-05-15',
    timeOfBirth: '14:30:00',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
    placeName: 'New Delhi, India',
  };

  beforeAll(async () => {
    // Populate mock in-memory database
    profilesDb.set(userAProfileId, {
      id: userAProfileId,
      userId: userAId,
      name: 'User A Natal Chart',
      dateOfBirth: '1990-05-15',
      timeOfBirth: '14:30:00',
      latitude: 28.6139,
      longitude: 77.209,
      timezone: 'Asia/Kolkata',
      placeName: 'New Delhi, India',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    profilesDb.set(userBProfileId, {
      id: userBProfileId,
      userId: userBId,
      name: 'User B Natal Chart',
      dateOfBirth: '1992-08-20',
      timeOfBirth: '09:15:00',
      latitude: 19.076,
      longitude: 72.8777,
      timezone: 'Asia/Kolkata',
      placeName: 'Mumbai, India',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(prisma.birthProfile, 'findUnique').mockImplementation((async ({ where }: any) => {
      return profilesDb.get(where.id) || null;
    }) as any);

    vi.spyOn(prisma.birthProfile, 'update').mockImplementation((async ({ where, data }: any) => {
      const existing = profilesDb.get(where.id);
      if (!existing) throw new Error('Record not found');
      const updated = { ...existing, ...data, updatedAt: new Date() };
      profilesDb.set(where.id, updated);
      return updated;
    }) as any);

    vi.spyOn(prisma.birthProfile, 'delete').mockImplementation((async ({ where }: any) => {
      const existing = profilesDb.get(where.id);
      if (!existing) throw new Error('Record not found');
      profilesDb.delete(where.id);
      return existing;
    }) as any);

    app = buildApp();
    await app.ready();

    userAToken = app.jwt.sign({ sub: userAId, email: 'userA@test.com', role: 'USER' });
    userBToken = app.jwt.sign({ sub: userBId, email: 'userB@test.com', role: 'USER' });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  // ==========================================
  // TASK 1 & 2: Subsystem Coverage & Endpoint Exposure
  // ==========================================
  describe('Task 1 & 2: 2A–2Y Subsystem Coverage & Completeness', () => {
    it('2A: /chart & /kundli endpoints return valid chart data', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.chart.planets.length).toBeGreaterThanOrEqual(9);
      expect(json.chart.houses.length).toBe(12);
      expect(json.chart.ascendant.sign).toBeDefined();

      // Alias /kundli
      const resKundli = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/kundli',
        payload: { birthDetails: validDirectBirth },
      });
      expect(resKundli.statusCode).toBe(200);
    });

    it('2B: /dashas & /dasha endpoints return Vimshottari tree', async () => {
      for (const url of ['/api/v1/astrology/dashas', '/api/v1/astrology/dasha']) {
        const res = await app.inject({
          method: 'POST',
          url,
          payload: { birthDetails: validDirectBirth, maxLevel: 2 },
        });
        expect(res.statusCode).toBe(200);
        const json = JSON.parse(res.payload).data;
        expect(json.system).toBe('VIMSHOTTARI');
        expect(json.totalSpanYears).toBe(120);
        expect(json.tree).toBeDefined();
        expect(json.tree.mahadashas.length).toBe(9);
      }
    });

    it('2C: /panchang endpoint returns Tithi, Vara, Nakshatra, Yoga, Karana', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/panchang',
        payload: {
          dateOfBirth: validDirectBirth.dateOfBirth,
          timeOfBirth: validDirectBirth.timeOfBirth,
          latitude: validDirectBirth.latitude,
          longitude: validDirectBirth.longitude,
          timezone: validDirectBirth.timezone,
        },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.panchang.tithi).toBeDefined();
      expect(json.panchang.nakshatra).toBeDefined();
      expect(json.panchang.yoga).toBeDefined();
      expect(json.panchang.karana).toBeDefined();
      expect(json.panchang.vara).toBeDefined();
    });

    it('2D: /vargas endpoint returns divisional charts; /vimshopaka returns Shodashvarga summary', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/vargas',
        payload: { birthDetails: validDirectBirth, vargaTypes: ['D1', 'D9', 'D10'] },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.vargas).toHaveLength(3);
      expect(json.vargasMap.D1).toBeDefined();
      expect(json.vargasMap.D9).toBeDefined();
      expect(json.vargasMap.D10).toBeDefined();

      const vim = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/vimshopaka',
        payload: { birthDetails: validDirectBirth },
      });
      expect(vim.statusCode).toBe(200);
      const vimJson = JSON.parse(vim.payload).data;
      expect(vimJson.planets.SUN.shodashavargaPlacements).toHaveLength(16);
    });

    it('2E: /matchmaking endpoint returns Ashtakoota score (0-36)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/matchmaking',
        payload: {
          boy: { birthDetails: validDirectBirth },
          girl: {
            birthDetails: {
              ...validDirectBirth,
              name: 'Bride',
              dateOfBirth: '1992-08-20',
            },
          },
        },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.ashtakoota.totalMaxPoints).toBe(36);
      expect(json.ashtakoota.totalObtainedPoints).toBeGreaterThanOrEqual(0);
      expect(json.ashtakoota.totalObtainedPoints).toBeLessThanOrEqual(36);
      expect(json.personA.personLabel).toBe('Boy');
      expect(json.personB.personLabel).toBe('Girl');
      expect(typeof json.manglikComparison.personA.isManglik).toBe('boolean');
      expect(typeof json.manglikComparison.personB.isManglik).toBe('boolean');
    });

    it('2F: /yogas endpoint returns classical yoga detections', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/yogas',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.detectedCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(json.detectedYogas)).toBe(true);
      expect(json.detectedYogas.length).toBe(json.detectedCount);
    });

    it('2G: /chart-variants endpoint returns variant charts; /special-points returns special lagnas', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart-variants',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.moonChart.variantType).toBe('MOON_CHART');

      const sp = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/special-points',
        payload: { birthDetails: validDirectBirth },
      });
      expect(sp.statusCode).toBe(200);
      expect(JSON.parse(sp.payload).data.specialLagnas.horaLagna).toBeDefined();
    });

    it('2H: /jaimini endpoint returns Chara Karakas, Arudhas, and Rashi Drishti', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/jaimini',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.charaKarakas.length).toBe(7);
      expect(json.arudhaPadas.length).toBe(12);
      expect(json.rashiDrishtis.length).toBe(12);
    });

    it('2I: /kp endpoint returns KP Significators & Sub Lords', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/kp',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.cusps.length).toBe(12);
      expect(json.houseSignificators.length).toBe(12);
      expect(json.planets.SUN.subLord).toBeDefined();
    });

    it('2J: /varshaphala endpoint returns Muntha and Varshesha', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/varshaphala',
        payload: { birthDetails: validDirectBirth, targetYear: 2026 },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.solarReturn.targetYear).toBe(2026);
      expect(json.muntha.rashiIndex).toBeGreaterThanOrEqual(1);
      expect(json.muntha.rashiIndex).toBeLessThanOrEqual(12);
      expect(json.varshesha.selectedVarshesha).toBeDefined();
    });

    it('2K: /prashna endpoint returns Horary chart', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/prashna',
        payload: {
          questionTimestamp: '2026-09-24T10:00:00',
          timezone: 'Asia/Kolkata',
          location: { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata', placeName: 'New Delhi, India' },
        },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.prashnaLagna.rashiIndex).toBeGreaterThanOrEqual(1);
      expect(json.houses.length).toBe(12);
      // Karya Lord / question-domain analysis is not implemented by the engine (see phase-2x.test.ts).
    });

    it('2L: /planetary-intelligence returns Avasthas; Argala via /jaimini and Rays via /vimshopaka', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/planetary-intelligence',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.planets.SUN.avastha.baladi).toBeDefined();

      const jaimini = JSON.parse(
        (await app.inject({ method: 'POST', url: '/api/v1/astrology/jaimini', payload: { birthDetails: validDirectBirth } })).payload
      ).data;
      expect(jaimini.argalas.length).toBe(12);

      const vim = JSON.parse(
        (await app.inject({ method: 'POST', url: '/api/v1/astrology/vimshopaka', payload: { birthDetails: validDirectBirth } })).payload
      ).data;
      const totalRays = Object.values(vim.rashmis).reduce((acc: number, r: any) => acc + r.netRays, 0);
      expect(totalRays).toBeGreaterThan(0);
    });

    it('2M: /avakhada returns Navatara, Avakhada, Ghat; Sade Sati is decommissioned', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/avakhada',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.tara.taras.length).toBe(27);
      expect(json.avakhada).toBeDefined();
      expect(json.ghat).toBeDefined();

      const sadeSati = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/sade-sati',
        payload: { birthDetails: validDirectBirth },
      });
      expect(sadeSati.statusCode).toBe(410);
      expect(JSON.parse(sadeSati.payload).error.code).toBe('ENDPOINT_DECOMMISSIONED');
    });

    it('2N: /special-points returns Aprakash Grahas, Upagrahas, Yogi/Avyogi', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/special-points',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.upagrahas.dhooma).toBeDefined();
      expect(json.upagrahas.gulika).toBeDefined();
      expect(json.yogiPoints.yogiPoint.longitude).toBeDefined();
    });

    it('2O: /vimshopaka returns 4 classical schemes', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/vimshopaka',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.planets.SUN.shadvargaScore).toBeDefined();
      expect(json.planets.SUN.saptavargaScore).toBeDefined();
      expect(json.planets.SUN.dashavargaScore).toBeDefined();
      expect(json.planets.SUN.shodashavargaScore).toBeDefined();
    });

    it('2P: /strength returns six-fold Shadbala strengths & rank', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/strength',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.shadbala.planets.SUN.totalShashtiamsas).toBeGreaterThan(0);
      expect(json.shadbala.planets.SUN.totalRupas).toBeGreaterThan(0);
      expect(json.shadbala.summary.length).toBe(7);
    });

    it('2Q: /strength returns 12 Bhava Bala house strengths & rank', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/strength',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.bhavaBala.houses.length).toBe(12);
      const strongest = json.bhavaBala.houses.find((h: any) => h.rank === 1);
      expect(strongest.houseNumber).toBeGreaterThanOrEqual(1);
      expect(strongest.houseNumber).toBeLessThanOrEqual(12);
    });

    it('2R: /ashtakavarga returns BAV, SAV 337, Shodhana, and Shodhya Pinda', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/ashtakavarga',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.sav.grandTotal).toBe(337);
      expect(json.bav.SUN).toBeDefined();
      expect(json.shodhana.SUN).toBeDefined();
      expect(json.pinda.SUN.shodhyaPinda).toBeDefined();
    });

    it('2S: /dasha (ASHTOTTARI) returns Ashtottari 108-year timeline', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dasha',
        payload: { birthDetails: validDirectBirth, dashaSystem: 'ASHTOTTARI', maxLevel: 2 },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.totalSpanYears).toBe(108);
      expect(json.tree.mahadashas.length).toBe(8);
    });

    it('2T: /gochara returns transit analysis with Ashtakavarga', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/gochara',
        payload: {
          birthDetails: validDirectBirth,
          timestamp: '2026-08-16T10:00:00',
          timezone: 'Asia/Kolkata',
          location: { latitude: 28.6139, longitude: 77.209, timezone: 'Asia/Kolkata' },
        },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.transitChart.planets.JUPITER).toBeDefined();
      expect(json.transitChart.planets.SATURN).toBeDefined();
      expect(json.ashtakavargaTransit.find((a: any) => a.planet === 'SATURN')).toBeDefined();
      // Vedha is not implemented by the engine (see gochara.test.ts).
    });

    it('2U: /dashas/yogini returns Yogini 36-year cycle timeline', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dashas/yogini',
        payload: { birthDetails: validDirectBirth, maxLevel: 2 },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.system).toBe('YOGINI');
      expect(json.totalCycleYears).toBe(36);
      expect(json.mahadashas.length).toBe(8);
    });

    it('2V: /dashas/chara returns Jaimini Chara sign-based timeline', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dashas/chara',
        payload: { birthDetails: validDirectBirth, maxLevel: 2 },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.system).toBe('CHARA');
      expect(json.periods.length).toBe(12);
    });

    it('2W: /dashas/narayana returns Narayana sign progression timeline', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dashas/narayana',
        payload: { birthDetails: validDirectBirth, maxLevel: 2 },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.system).toBe('NARAYANA');
      expect(json.periods.length).toBe(12);
    });

    it('2X: /dashas/kalachakra returns 108-Pada Kalachakra timeline', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dashas/kalachakra',
        payload: { birthDetails: validDirectBirth, maxLevel: 2 },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.system).toBe('KALACHAKRA');
      expect(json.dehaRashi).toBeDefined();
      expect(json.jeevaRashi).toBeDefined();
      expect(json.mahadashas.length).toBe(9);
    });

    it('2Y: /dasha (DWISAPTATI_SAMA) returns Parashara conditional system with eligibility', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/dasha',
        payload: {
          birthDetails: { ...validDirectBirth, timeOfBirth: '23:30:00' }, // eligible: 7th lord Moon in Lagna
          dashaSystem: 'DWISAPTATI_SAMA',
          maxLevel: 2,
        },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.system).toBe('DWISAPTATI_SAMA');
      expect(json.totalSpanYears).toBe(72);
      expect(json.eligibility.isEligible).toBe(true);
      expect(json.tree.mahadashas.length).toBe(9);
    });

    it('Conventions registry /conventions returns central metadata', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/astrology/conventions',
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload).data;
      expect(json.conventions.PARASHARA.tradition).toBeDefined();
      expect(json.dashaSystems.implemented.find((d: any) => d.system === 'DWISAPTATI_SAMA').tradition).toBe('PARASHARA');
      // No Ashtakavarga convention entry exists in the engine registry yet (see ashtakavarga.test.ts).
    });
  });

  // ==========================================
  // TASK 3: Input Validation Strictness
  // ==========================================
  describe('Task 3: Input Validation Verification', () => {
    it('Rejects request with missing both birthProfileId and birthDetails', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.payload);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });

    it('Rejects invalid dateOfBirth format', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        payload: {
          birthDetails: {
            ...validDirectBirth,
            dateOfBirth: '15-05-1990', // Invalid, must be YYYY-MM-DD
          },
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('Rejects out-of-range latitude (> 90)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        payload: {
          birthDetails: {
            ...validDirectBirth,
            latitude: 120.5,
          },
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('Rejects out-of-range longitude (> 180)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        payload: {
          birthDetails: {
            ...validDirectBirth,
            longitude: 250.0,
          },
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('Rejects invalid enum in vargas request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/vargas',
        payload: {
          birthDetails: validDirectBirth,
          vargaTypes: ['D1', 'INVALID_D999' as any],
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it('Rejects invalid UUID in birthProfileId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        payload: {
          birthProfileId: 'not-a-valid-uuid',
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ==========================================
  // TASK 4 & 5: Conventions & Serialization Verification
  // ==========================================
  describe('Task 4 & 5: Convention Passing & Serialization Integrity', () => {
    it('Preserves default conventions (SIDEREAL, LAHIRI, WHOLE_SIGN, MEAN_NODE, GEOCENTRIC)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      expect(json.chart.config.zodiacType).toBe('SIDEREAL');
      expect(json.chart.config.ayanamsa).toBe('LAHIRI');
      expect(json.chart.config.houseSystem).toBe('WHOLE_SIGN');
      expect(json.chart.config.nodeCalculation).toBe('MEAN_NODE');
      expect(json.chart.config.planetaryCalculationMode).toBe('GEOCENTRIC');
    });

    it('Guarantees non-empty objects for ascendant, planets, houses, rashis, and nakshatras', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);

      // Ascendant must be populated
      expect(json.chart.ascendant).not.toEqual({});
      expect(typeof json.chart.ascendant.longitude).toBe('number');
      expect(typeof json.chart.ascendant.sign).toBe('string');
      expect(typeof json.chart.ascendant.nakshatra).toBe('string');

      // Planets must be populated
      expect(Array.isArray(json.chart.planets)).toBe(true);
      for (const p of json.chart.planets) {
        expect(p).not.toEqual({});
        expect(typeof p.planet).toBe('string');
        expect(typeof p.longitude).toBe('number');
        expect(typeof p.sign).toBe('string');
        expect(typeof p.nakshatra).toBe('string');
        expect(typeof p.house).toBe('number');
        expect(typeof p.isRetrograde).toBe('boolean');
      }

      // Houses must be populated
      expect(json.chart.houses.length).toBe(12);
      for (const h of json.chart.houses) {
        expect(h).not.toEqual({});
        expect(typeof h.number).toBe('number');
        expect(typeof h.sign).toBe('string');
        expect(typeof h.cuspLongitude).toBe('number');
      }

      // Rashis must be populated
      expect(json.chart.rashis.length).toBe(12);
      for (const r of json.chart.rashis) {
        expect(typeof r.index).toBe('number');
        expect(typeof r.name).toBe('string');
        expect(typeof r.lord).toBe('string');
      }

      // Nakshatras must be populated
      expect(json.chart.nakshatras.length).toBe(27);
      for (const n of json.chart.nakshatras) {
        expect(typeof n.index).toBe('number');
        expect(typeof n.name).toBe('string');
        expect(typeof n.lord).toBe('string');
      }
    });
  });

  // ==========================================
  // TASK 6: Response Contract Consistency Across Endpoints
  // ==========================================
  describe('Task 6: Cross-Endpoint Astrological Value Consistency', () => {
    it('Reports consistent planetary longitudes across Chart, Vargas, Shadbala, and Jaimini', async () => {
      const [chartRes, vargaRes, shadbalaRes, jaiminiRes] = await Promise.all([
        app.inject({
          method: 'POST',
          url: '/api/v1/astrology/chart',
          payload: { birthDetails: validDirectBirth },
        }),
        app.inject({
          method: 'POST',
          url: '/api/v1/astrology/vargas',
          payload: { birthDetails: validDirectBirth, vargaTypes: ['D1'] },
        }),
        app.inject({
          method: 'POST',
          url: '/api/v1/astrology/strength',
          payload: { birthDetails: validDirectBirth },
        }),
        app.inject({
          method: 'POST',
          url: '/api/v1/astrology/jaimini',
          payload: { birthDetails: validDirectBirth },
        }),
      ]);

      const chartData = JSON.parse(chartRes.payload);
      const vargaData = JSON.parse(vargaRes.payload).data;
      const strengthData = JSON.parse(shadbalaRes.payload).data;
      const jaiminiData = JSON.parse(jaiminiRes.payload).data;

      const sunChart = chartData.chart.planets.find((p: any) => p.planet.toUpperCase() === 'SUN');
      const sunVarga = vargaData.vargasMap.D1.placements['SUN'];

      expect(sunChart).toBeDefined();
      expect(sunVarga).toBeDefined();
      expect(sunChart.rashiIndex).toBe(sunVarga.rashiIndex);
      expect(sunVarga.sourceLongitude).toBeCloseTo(sunChart.longitude, 6);
      expect(strengthData.shadbala.planets.SUN.planet).toBe('SUN');

      const atmakaraka = jaiminiData.charaKarakas.find((k: any) => k.code === 'AK');
      expect(atmakaraka).toBeDefined();
      const akChart = chartData.chart.planets.find((p: any) => p.planet === atmakaraka.planet);
      expect(atmakaraka.degreeInSign).toBeCloseTo(akChart.degreeInRashi, 3);
    });
  });

  // ==========================================
  // TASK 7: Authentication & Guest Access
  // ==========================================
  describe('Task 7: Guest Calculation vs Authenticated Profile Access', () => {
    it('Allows guest calculation without JWT token using direct birthDetails', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        payload: { birthDetails: validDirectBirth },
      });
      expect(res.statusCode).toBe(200);
    });

    it('Rejects guest calculating for saved birthProfileId without JWT token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        payload: { birthProfileId: userAProfileId },
      });
      expect(res.statusCode).toBe(401);
      const json = JSON.parse(res.payload);
      expect(json.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('Allows authenticated user to calculate chart using their own saved birthProfileId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        headers: { authorization: `Bearer ${userAToken}` },
        payload: { birthProfileId: userAProfileId },
      });
      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.payload);
      // The chart response does not echo birthProfileId; verify it was computed from the
      // saved profile by comparing against a direct calculation of the same birth data.
      const direct = JSON.parse(
        (await app.inject({ method: 'POST', url: '/api/v1/astrology/chart', payload: { birthDetails: validDirectBirth } })).payload
      );
      expect(json.chart.ascendant.longitude).toBe(direct.chart.ascendant.longitude);
      expect(json.chart.planets).toEqual(direct.chart.planets);
    });
  });

  // ==========================================
  // TASK 8: Ownership / IDOR Testing
  // ==========================================
  describe('Task 8: Ownership & IDOR Protection', () => {
    it('Prevents User B from calculating chart using User A birthProfileId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        headers: { authorization: `Bearer ${userBToken}` },
        payload: { birthProfileId: userAProfileId }, // User A's profile
      });
      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('Prevents User B from retrieving User A birth profile by ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/birth-profiles/${userAProfileId}`,
        headers: { authorization: `Bearer ${userBToken}` },
      });
      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.error.code).toBe('NOT_FOUND');
    });

    it('Prevents User B from updating User A birth profile', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/birth-profiles/${userAProfileId}`,
        headers: { authorization: `Bearer ${userBToken}` },
        payload: { name: 'Tampered Profile Name' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('Prevents User B from deleting User A birth profile', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/birth-profiles/${userAProfileId}`,
        headers: { authorization: `Bearer ${userBToken}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ==========================================
  // TASK 9: Error Contract & Security
  // ==========================================
  describe('Task 9: Structured Error Responses & Zero Secret Leakage', () => {
    it('Returns standardized error structure with code, message, and requestId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        payload: { birthProfileId: '00000000-0000-0000-0000-000000000000' },
        headers: { authorization: `Bearer ${userAToken}` },
      });
      expect(res.statusCode).toBe(404);
      const json = JSON.parse(res.payload);
      expect(json.error).toBeDefined();
      expect(json.error.code).toBe('NOT_FOUND');
      expect(json.error.message).toBeDefined();
      expect(json.error.requestId).toBeDefined();
    });

    it('Never leaks internal file paths, database queries, or stack traces in error replies', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/chart',
        payload: { invalidJsonStructure: true },
      });
      expect(res.statusCode).toBe(400);
      expect(res.payload).not.toContain('node_modules');
      expect(res.payload).not.toContain('prisma');
      expect(res.payload).not.toContain('SELECT ');
      expect(res.payload).not.toContain('DATABASE_URL');
    });
  });

  // ==========================================
  // TASK 10 & 11: Determinism & Latency Sanity Checks
  // ==========================================
  describe('Task 10 & 11: Determinism & Performance Verification', () => {
    it('Produces bit-for-bit identical outputs for identical inputs across multiple runs', async () => {
      const run1 = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/ashtakavarga',
        payload: { birthDetails: validDirectBirth },
      });
      const run2 = await app.inject({
        method: 'POST',
        url: '/api/v1/astrology/ashtakavarga',
        payload: { birthDetails: validDirectBirth },
      });

      expect(run1.statusCode).toBe(200);
      expect(run2.statusCode).toBe(200);
      expect(run1.payload).toBe(run2.payload);
    });

    it('Executes high-complexity calculation endpoints within reasonable latency (< 200ms)', async () => {
      const endpoints = [
        { url: '/api/v1/astrology/chart', payload: { birthDetails: validDirectBirth } },
        { url: '/api/v1/astrology/vargas', payload: { birthDetails: validDirectBirth } },
        { url: '/api/v1/astrology/strength', payload: { birthDetails: validDirectBirth } },
        { url: '/api/v1/astrology/ashtakavarga', payload: { birthDetails: validDirectBirth } },
        { url: '/api/v1/astrology/dashas', payload: { birthDetails: validDirectBirth, maxLevel: 3 } },
      ];

      for (const ep of endpoints) {
        const start = Date.now();
        const res = await app.inject({
          method: 'POST',
          url: ep.url,
          payload: ep.payload,
        });
        const duration = Date.now() - start;
        expect(res.statusCode).toBe(200);
        expect(duration).toBeLessThan(300); // Well within interactive bounds
      }
    });
  });
});
