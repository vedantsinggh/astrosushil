import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import '@fastify/jwt';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/services/prisma.service';

describe('Phase 2X Advanced Astrological Subsystems Integration Tests', () => {
  let app: FastifyInstance;

  const validBirthDetails = {
    name: 'Rohit Sharma',
    dateOfBirth: '1987-04-30',
    timeOfBirth: '12:00:00',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
    placeName: 'Mumbai, India',
  };

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  // All endpoints below return their engine report under the standard `{ data }` envelope.
  const post = async (url: string, payload: Record<string, unknown>) => {
    const response = await app.inject({ method: 'POST', url, payload });
    expect(response.statusCode).toBe(200);
    return JSON.parse(response.payload).data;
  };

  it('POST /api/v1/astrology/chart-variants returns all derived variant charts', async () => {
    const data = await post('/api/v1/astrology/chart-variants', { birthDetails: validBirthDetails });

    expect(data.sunChart.variantType).toBe('SUN_CHART');
    expect(data.moonChart.variantType).toBe('MOON_CHART');
    expect(data.karakamshaChart.variantType).toBe('KARAKAMSHA_CHART');
    expect(data.rashi.variantType).toBe('RASHI');
    for (const key of ['rashi', 'sunChart', 'moonChart', 'karakamshaChart', 'sunriseChart', 'bhavaEqual', 'bhavaSripati']) {
      expect(data[key].referenceSignIndex).toBeGreaterThanOrEqual(1);
      expect(data[key].referenceSignIndex).toBeLessThanOrEqual(12);
      expect(data[key].chart.planets).toBeDefined();
    }
  });

  it('POST /api/v1/astrology/special-points returns Bhava, Hora, Ghatika and Indu special lagnas', async () => {
    const data = await post('/api/v1/astrology/special-points', { birthDetails: validBirthDetails });

    for (const key of ['bhavaLagna', 'horaLagna', 'ghatikaLagna', 'induLagna']) {
      const lagna = data.specialLagnas[key];
      expect(lagna).toBeDefined();
      expect(lagna.category).toBe('SPECIAL_LAGNA');
      expect(lagna.longitude).toBeGreaterThanOrEqual(0);
      expect(lagna.longitude).toBeLessThan(360);
    }
  });

  it('POST /api/v1/astrology/jaimini returns Chara Karakas, Arudhas, Rashi Drishti, and Argala', async () => {
    const data = await post('/api/v1/astrology/jaimini', { birthDetails: validBirthDetails });
    const data8 = await post('/api/v1/astrology/jaimini', { birthDetails: validBirthDetails, scheme: 'EIGHT_KARAKA' });

    expect(data.scheme).toBe('SEVEN_KARAKA');
    expect(data.charaKarakas.length).toBe(7);
    expect(data8.scheme).toBe('EIGHT_KARAKA');
    expect(data8.charaKarakas.length).toBe(8);

    const atmakaraka = data.charaKarakas.find((k: any) => k.code === 'AK');
    const darakaraka = data.charaKarakas.find((k: any) => k.code === 'DK');
    expect(atmakaraka).toBeDefined();
    expect(atmakaraka.rank).toBe(1);
    expect(darakaraka).toBeDefined();
    expect(darakaraka.rank).toBe(7);
    expect(data.karakamsha.atmakarakaPlanet).toBe(atmakaraka.planet);

    expect(data.arudhaPadas.length).toBe(12);
    expect(data.rashiDrishtis.length).toBe(12);
    expect(data.argalas.length).toBe(12);
    for (const argala of data.argalas) {
      expect(argala.houseNumber).toBeGreaterThanOrEqual(1);
      expect(argala.houseNumber).toBeLessThanOrEqual(12);
      expect(typeof argala.netArgalaScore).toBe('number');
    }
  });

  it('POST /api/v1/astrology/kp returns Star/Sub/Sub-sub lords, 4-Level Significators, and Ruling planets', async () => {
    const data = await post('/api/v1/astrology/kp', { birthDetails: validBirthDetails });

    expect(data.planets.SUN.starLord).toBeDefined();
    expect(data.planets.SUN.subLord).toBeDefined();
    expect(data.planets.SUN.subSubLord).toBeDefined();
    expect(data.cusps.length).toBe(12);
    expect(data.houseSignificators.length).toBe(12);
    for (const sig of data.houseSignificators) {
      expect(Array.isArray(sig.levelA_StarOfOccupants)).toBe(true);
      expect(Array.isArray(sig.levelB_Occupants)).toBe(true);
      expect(Array.isArray(sig.levelC_StarOfLord)).toBe(true);
      expect(Array.isArray(sig.levelD_Lord)).toBe(true);
    }
    expect(data.rulingPlanets.dayLord).toBeDefined();
  });

  it('POST /api/v1/astrology/varshaphala returns Muntha, Varshesha, and Panchadhikari', async () => {
    const data = await post('/api/v1/astrology/varshaphala', { birthDetails: validBirthDetails, targetYear: 2026 });

    expect(data.solarReturn.targetYear).toBe(2026);
    expect(data.muntha.rashiIndex).toBeGreaterThanOrEqual(1);
    expect(data.muntha.rashiIndex).toBeLessThanOrEqual(12);
    const munthesha = data.panchadhikari.candidates.find((c: any) => c.role === 'MUNTHESHA');
    expect(munthesha).toBeDefined();
    expect(munthesha.planet).toBe(data.muntha.lord);
    expect(data.varshesha.selectedVarshesha).toBeDefined();
    expect(data.panchadhikari.candidates.map((c: any) => c.planet)).toContain(data.varshesha.selectedVarshesha);
  });

  it('POST /api/v1/astrology/prashna returns horary chart, Lagna, Moon and Panchanga', async () => {
    const data = await post('/api/v1/astrology/prashna', {
      questionTimestamp: '2026-09-24T10:00:00',
      timezone: 'Asia/Kolkata',
      location: { latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata', placeName: 'Mumbai, India' },
      questionText: 'Will my career improve?',
    });

    expect(data.prashnaLagna).toBeDefined();
    expect(data.prashnaLagna.rashiIndex).toBeGreaterThanOrEqual(1);
    expect(data.prashnaLagna.rashiIndex).toBeLessThanOrEqual(12);
    expect(data.houses.length).toBe(12);
    expect(data.planets.SUN).toBeDefined();
    expect(data.moon).toBeDefined();
    expect(data.panchanga.tithi).toBeDefined();
    expect(typeof data.isRahuKala).toBe('boolean');
    expect(data.questionText).toBe('Will my career improve?');
  });

  it('POST /api/v1/astrology/prashna returns Karya Lord and Tajika aspects for a question domain', async () => {
    // NOT IMPLEMENTED in packages/astrology-engine (PrashnaCalculator has no question-domain /
    // Karya-house / Karya-lord / Tajika-aspect logic). Left failing intentionally pending spec/engine work.
    const data = await post('/api/v1/astrology/prashna', {
      questionTimestamp: '2026-09-24T10:00:00',
      timezone: 'Asia/Kolkata',
      location: { latitude: 19.076, longitude: 72.8777, timezone: 'Asia/Kolkata', placeName: 'Mumbai, India' },
      questionDomain: 'CAREER',
    });

    expect(data.questionDomain).toBe('CAREER');
    expect(data.karyaHouseNumber).toBe(10);
    expect(data.lagnaLord).toBeDefined();
    expect(data.karyaLord).toBeDefined();
  });

  it('POST /api/v1/astrology/planetary-intelligence returns Avasthas, dignities, Chara Karakas and aspects', async () => {
    const data = await post('/api/v1/astrology/planetary-intelligence', { birthDetails: validBirthDetails });

    for (const p of ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN']) {
      const pi = data.planets[p];
      expect(pi).toBeDefined();
      expect(pi.planet).toBe(p);
      expect(['BALA', 'KUMARA', 'YUVA', 'VRIDDHA', 'MRITA']).toContain(pi.avastha.baladi);
      expect(['JAGRATA', 'SWAPNA', 'SUSHUPTI']).toContain(pi.avastha.jagratadi);
      expect(pi.dignity).toBeDefined();
      expect(typeof pi.combustion.isCombust).toBe('boolean');
      expect(Array.isArray(pi.aspectsCast)).toBe(true);
    }
    expect(data.charaKarakas.length).toBeGreaterThanOrEqual(7);
    expect(Array.isArray(data.planetaryWars)).toBe(true);
    expect(Array.isArray(data.conjunctions)).toBe(true);
  });

  it('POST /api/v1/astrology/vimshopaka returns Planetary Rays (Rashmis)', async () => {
    const data = await post('/api/v1/astrology/vimshopaka', { birthDetails: validBirthDetails });

    let totalRays = 0;
    for (const p of ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN']) {
      expect(data.rashmis[p].planet).toBe(p);
      expect(data.rashmis[p].netRays).toBeGreaterThanOrEqual(0);
      totalRays += data.rashmis[p].netRays;
    }
    expect(totalRays).toBeGreaterThan(0);
  });

  it('POST /api/v1/astrology/special-points returns Mrityu Bhaga and 64th Navamsha / 22nd Drekkana sensitive points', async () => {
    const data = await post('/api/v1/astrology/special-points', { birthDetails: validBirthDetails });

    expect(data.mrityuBhaga.points.length).toBeGreaterThan(0);
    expect(typeof data.mrityuBhaga.hasAnyAfflicted).toBe('boolean');
    expect(data.arishtaPoints.sixtyFourthNavamshaMoon).toBeDefined();
    expect(data.arishtaPoints.sixtyFourthNavamshaAscendant).toBeDefined();
    expect(data.arishtaPoints.twentySecondDrekkanaAscendant).toBeDefined();
    expect(data.arishtaPoints.twentySecondDrekkanaMoon).toBeDefined();
  });

  it('POST /api/v1/astrology/avakhada returns 27-Tara Chakra, Avakhada and Ghat Chakra; Rahu Kala via /panchang', async () => {
    const data = await post('/api/v1/astrology/avakhada', { birthDetails: validBirthDetails });

    expect(data.tara.taras.length).toBe(27);
    expect(data.avakhada.varna).toBeDefined();
    expect(data.ghat.moonRashiIndex).toBeGreaterThanOrEqual(1);
    expect(data.ghat.moonRashiIndex).toBeLessThanOrEqual(12);
    expect(data.ghat.ghatLagna).toBeDefined();

    const panchang = await post('/api/v1/astrology/panchang', {
      dateOfBirth: validBirthDetails.dateOfBirth,
      timeOfBirth: validBirthDetails.timeOfBirth,
      latitude: validBirthDetails.latitude,
      longitude: validBirthDetails.longitude,
      timezone: validBirthDetails.timezone,
    });
    expect(panchang.rahuKala.startIso).toBeDefined();
    expect(Date.parse(panchang.rahuKala.endIso)).toBeGreaterThan(Date.parse(panchang.rahuKala.startIso));
  });

  it('POST /api/v1/astrology/sade-sati is decommissioned (editorial policy)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/sade-sati',
      payload: { birthDetails: validBirthDetails, transitSaturnRashiIndex: 11 },
    });

    expect(response.statusCode).toBe(410);
    const body = JSON.parse(response.payload);
    expect(body.error.code).toBe('ENDPOINT_DECOMMISSIONED');
    expect(body.error.requestId).toBeDefined();
  });

  it('POST /api/v1/astrology/special-points returns Upagrahas (Aprakash Grahas, Gulika, Mandi) and Yogi/Avyogi', async () => {
    const data = await post('/api/v1/astrology/special-points', { birthDetails: validBirthDetails });

    expect(data.upagrahas.dhooma.name).toBe('Dhooma');
    expect(data.upagrahas.vyatipata.name).toBe('Vyatipata');
    expect(data.upagrahas.parivesha.name).toBe('Parivesha');
    expect(data.upagrahas.indrachapa.name).toBe('Indrachapa');
    expect(data.upagrahas.upaketu.name).toBe('Upaketu');

    expect(data.upagrahas.gulika.name).toBe('Gulika');
    expect(data.upagrahas.mandi.name).toBe('Mandi');
    expect(data.yogiPoints.yogiPoint.longitude).toBeGreaterThanOrEqual(0);
    expect(data.yogiPoints.avyogiPoint.longitude).toBeGreaterThanOrEqual(0);
    expect(data.yogiPoints.yogiPlanet).toBeDefined();
    expect(data.yogiPoints.avyogiPlanet).toBeDefined();
  });

  it('POST /api/v1/astrology/vimshopaka returns 4 classical schemes', async () => {
    const data = await post('/api/v1/astrology/vimshopaka', { birthDetails: validBirthDetails });

    for (const p of ['SUN', 'MOON', 'MARS', 'MERCURY', 'JUPITER', 'VENUS', 'SATURN']) {
      const scores = data.planets[p];
      for (const key of ['shadvargaScore', 'saptavargaScore', 'dashavargaScore', 'shodashavargaScore']) {
        expect(scores[key]).toBeGreaterThanOrEqual(0);
        expect(scores[key]).toBeLessThanOrEqual(20);
      }
      expect(scores.shodashavargaPlacements).toHaveLength(16);
    }
  });

  it('GET /api/v1/astrology/conventions returns central metadata registry', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/astrology/conventions',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload).data;
    // PARASHARA covers the canonical chart and the 16-Varga engine.
    expect(body.conventions.PARASHARA.tradition).toBeDefined();
    expect(body.conventions.PARASHARA.description).toContain('16 Vargas');
    expect(body.conventions.JAIMINI.tradition).toBeDefined();
    expect(body.conventions.KP.tradition).toBeDefined();
    expect(body.conventions.KP.houseSystem).toBe('PLACIDUS');
    expect(body.conventions.VARSHAPHALA.tradition).toBeDefined();
    expect(body.conventions.PRASHNA.tradition).toBeDefined();
  });

  it('Serialization & Determinism Audit: no NaN, no null keys, 100% deterministic identical outputs', async () => {
    // Run twice with identical input
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/jaimini',
      payload: { birthDetails: validBirthDetails },
    });
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/v1/astrology/jaimini',
      payload: { birthDetails: validBirthDetails },
    });

    expect(res1.payload).toBe(res2.payload);
    expect(res1.payload).not.toContain('NaN');
    expect(res1.payload).not.toContain('null:');
    expect(res1.payload).not.toContain('undefined');
  });
});
