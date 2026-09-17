import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { astrologyService } from './astrology.service';
import {
  calculateChartSchema,
  evidenceRequestSchema,
  predictionsRequestSchema,
  dashaRequestSchema,
  panchangRequestSchema,
  vargasRequestSchema,
  matchmakingRequestSchema,
  compatibilityRequestSchema,
  strengthRequestSchema,
  ashtakavargaRequestSchema,
  varshaphalaRequestSchema,
  prashnaRequestSchema,
  gocharaRequestSchema,
  gocharaTimelineRequestSchema,
  yogaRequestSchema,
  specialPointsRequestSchema,
  jaiminiRequestSchema,
  kpRequestSchema,
  sadeSatiRequestSchema,
  chartVariantsRequestSchema,
  avakhadaRequestSchema,
  vimshopakaRequestSchema,
} from './astrology.schemas';
import { AuthenticationError } from '../../errors/app-error';

export async function astrologyRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // Use optional authentication hook for astrology routes to support Guest Mode
  fastify.addHook('onRequest', fastify.authenticateOptional);

  // POST /api/v1/astrology/chart & POST /api/v1/astrology/kundli
  const chartRouteHandler = async (request: any, reply: any) => {
    const startTime = Date.now();
    const input = calculateChartSchema.parse(request.body);
    const authMode = request.user ? 'authenticated' : 'guest';
    const vargaType = (input.vargaType as any) || 'D1';

    let result;
    if (input.birthProfileId) {
      if (!request.user) {
        throw new AuthenticationError('Authentication required to calculate chart for saved profile');
      }
      result = await astrologyService.calculateChartForProfile(input.birthProfileId, request.user, vargaType);
    } else if (input.birthDetails) {
      result = await astrologyService.calculateChartForDirectInput(input.birthDetails, vargaType);
    } else {
      throw new AuthenticationError('Invalid calculation input');
    }

    const durationMs = Date.now() - startTime;
    request.log.info(
      {
        authMode,
        userId: request.user?.id ?? null,
        hasBirthProfileId: !!input.birthProfileId,
        vargaType,
        calculationVersion: result.chart.calculationVersion,
        durationMs,
      },
      'Astrology chart calculated successfully'
    );

    return reply.status(200).send(result);
  };

  fastify.post('/chart', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate natal or divisional astrology chart',
      description: 'Calculates planetary positions, Rashis, and Nakshatras for a birth profile or direct birth details. Optionally accepts vargaType (D1 to D60).',
    },
    handler: chartRouteHandler,
  });

  fastify.post('/kundli', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate Kundli chart (Alias for /chart)',
    },
    handler: chartRouteHandler,
  });

  const dashaRouteHandler = async (request: any, reply: any) => {
    const input = dashaRequestSchema.parse(request.body);
    const result = await astrologyService.calculateDasha(input, request.user);
    return reply.status(200).send({ data: result });
  };

  // POST /api/v1/astrology/dasha
  fastify.post('/dasha', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate Dasha periods (Vimshottari or Ashtottari)',
      description: 'Calculates multi-tier Dasha timeline (Vimshottari 120-year or Ashtottari 108-year cycle: Mahadasha -> Antardasha -> Pratyantardasha) with Parashari eligibility evaluation and active period lookup.',
    },
    handler: dashaRouteHandler,
  });

  // POST /api/v1/astrology/dashas (plural alias)
  fastify.post('/dashas', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate Dasha periods (Alias for /dasha)',
      description: 'Calculates multi-tier Dasha timeline (Vimshottari 120-year or Ashtottari 108-year cycle: Mahadasha -> Antardasha -> Pratyantardasha).',
    },
    handler: dashaRouteHandler,
  });

  // POST /api/v1/astrology/panchang
  fastify.post('/panchang', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate daily Panchang elements',
      description: 'Calculates daily Tithi, Vara, Nakshatra, Yoga, and Karana.',
    },
    handler: async (request, reply) => {
      const input = panchangRequestSchema.parse(request.body);
      const result = await astrologyService.calculatePanchang(input);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/vargas
  fastify.post('/vargas', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate Divisional Charts (Vargas)',
      description: 'Calculates D-1 through D-60 divisional chart placements.',
    },
    handler: async (request, reply) => {
      const input = vargasRequestSchema.parse(request.body);
      const result = await astrologyService.calculateVargas(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/matchmaking
  fastify.post('/matchmaking', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate Ashtakoota Matchmaking (Guna Milan)',
      description: 'Evaluates 36-point Guna Milan score and Manglik Dosha for Boy and Girl.',
    },
    handler: async (request, reply) => {
      const input = matchmakingRequestSchema.parse(request.body);
      const result = await astrologyService.calculateMatchmaking(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/compatibility
  fastify.post('/compatibility', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate deterministic Kundli compatibility and Ashtakoota matching',
      description: 'Evaluates complete 36-point Ashtakoota (8 Kootas: Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi) and independent pairwise Manglik Dosha comparison.',
    },
    handler: async (request, reply) => {
      const input = compatibilityRequestSchema.parse(request.body);
      const result = await astrologyService.calculateCompatibility(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/evidence
  fastify.post('/evidence', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Get deterministic domain evidence',
      description: 'Extracts structured evidence facts for CAREER, MONEY, EDUCATION, RELATIONSHIPS, HEALTH_GENERAL, PERSONALITY, or TIMING.',
    },
    handler: async (request: any, reply: any) => {
      const input = evidenceRequestSchema.parse(request.body);
      const result = await astrologyService.getDomainEvidence(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/predictions
  fastify.post('/predictions', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Get deterministic rule-based predictions',
      description: 'Generates rule-based predictions with underlying evidence and confidence metrics.',
    },
    handler: async (request: any, reply: any) => {
      const input = predictionsRequestSchema.parse(request.body);
      const result = await astrologyService.getPredictions(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/strength
  fastify.post('/strength', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate deterministic Shadbala & Bhava Bala planetary and house strengths',
      description: 'Calculates classical sixfold planetary strength (Shadbala: Sthana, Dig, Kala, Cheshta, Naisargika, Drik) and house strength (Bhava Bala: Bhavadhipati, Dig, Drishti, Occupant).',
    },
    handler: async (request: any, reply: any) => {
      const input = strengthRequestSchema.parse(request.body);
      const result = await astrologyService.calculateStrength(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/ashtakavarga
  fastify.post('/ashtakavarga', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate deterministic Ashtakavarga charts and matrices',
      description: 'Calculates Bhinnashtakavarga (BAV), Sarvashtakavarga (SAV), Prastara matrices, Trikona & Ekadhipatya Shodhana, and Shodhya Pindas.',
    },
    handler: async (request: any, reply: any) => {
      const input = ashtakavargaRequestSchema.parse(request.body);
      const result = await astrologyService.calculateAshtakavarga(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/varshaphala
  fastify.post('/varshaphala', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate deterministic Varshaphala (Tajika Solar Return) annual chart',
      description: 'Calculates astronomical sidereal Solar Return, Varsha Lagna, Muntha, Panchadhikari & Varshesha, Harsha Bala, Tajika Yogas, Sahams, Mudda Dasha, and Panchanga.',
    },
    handler: async (request: any, reply: any) => {
      const input = varshaphalaRequestSchema.parse(request.body);
      const result = await astrologyService.calculateVarshaphala(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/prashna
  fastify.post('/prashna', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate deterministic Prashna (Horary) chart',
      description: 'Calculates Prashna Lagna, planets, Whole Sign houses, Chandra analysis, instantaneous Panchanga, Gulika, classical Sphutas (Trisphuta, Chatusphuta, Panchasphuta), and optional question number (Parashari 1-108 or KP 1-249).',
    },
    handler: async (request: any, reply: any) => {
      const input = prashnaRequestSchema.parse(request.body);
      const result = await astrologyService.calculatePrashna(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/gochara
  fastify.post('/gochara', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate deterministic Gochara (planetary transits) snapshot',
      description: 'Calculates planetary transit positions, houses, Parashari Drishti, Ashtakavarga, Kaksha division, and optional natal chart relationships.',
    },
    handler: async (request: any, reply: any) => {
      const input = gocharaRequestSchema.parse(request.body);
      const result = await astrologyService.calculateGochara(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/gochara/timeline
  fastify.post('/gochara/timeline', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate chronological transit events timeline',
      description: 'Calculates transit sign ingresses, Nakshatra ingresses, and stationary points over a bounded date range (up to 730 days).',
    },
    handler: async (request: any, reply: any) => {
      const input = gocharaTimelineRequestSchema.parse(request.body);
      const result = await astrologyService.calculateGocharaTimeline(input);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/yogas
  fastify.post('/yogas', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate deterministic classical Vedic Yogas',
      description: 'Evaluates classical Yogas (Pancha Mahapurusha, Chandra, Surya, Raja, Dhana, Neecha Bhanga, Parivartana, Viparita, Nabhasa, Lakshmi, Saraswati, etc.) with complete condition evidence.',
    },
    handler: async (request: any, reply: any) => {
      const input = yogaRequestSchema.parse(request.body);
      const result = await astrologyService.calculateYogas(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // -------------------------------------------------------------
  // Phase 2X Extended Endpoints
  // -------------------------------------------------------------

  // POST /api/v1/astrology/special-points
  fastify.post('/special-points', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate Upagrahas, Special Lagnas, Arishta Points, Yogi/Avyogi, and Mrityu Bhaga',
      description: 'Computes 5 mathematical Upagrahas (Dhooma, Vyatipata, Parivesha, Indrachapa, Upaketu), Gulika, Mandi, Bhava/Hora/Ghatika/Indu/Pranapada/Varnada Lagnas, 64th Navamsha, 22nd Drekkana, Sarpa Drekkana, Yogi/Avyogi/Sahayogi, and Mrityu Bhaga.',
    },
    handler: async (request: any, reply: any) => {
      const input = specialPointsRequestSchema.parse(request.body);
      const result = await astrologyService.calculateSpecialPoints(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/jaimini
  fastify.post('/jaimini', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate deterministic Jaimini astrology foundations',
      description: 'Computes 7/8 Chara Karakas, 12 Arudha Padas (A1/AL to A12/UL) with shift exceptions, Rashi Drishti sign aspects, Argala & Virodha Argala, and Karakamsha Lagna.',
    },
    handler: async (request: any, reply: any) => {
      const input = jaiminiRequestSchema.parse(request.body);
      const result = await astrologyService.calculateJaimini(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/kp
  fastify.post('/kp', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate deterministic KP (Krishnamurti Padhdhati) System report',
      description: 'Computes KP Placidus cusps, 4-tier planetary lordships (Sign, Star, Sub, Sub-Sub) via 249 sub table, 4-level House Significators, Ruling Planets (RP), and Pars Fortuna.',
    },
    handler: async (request: any, reply: any) => {
      const input = kpRequestSchema.parse(request.body);
      const result = await astrologyService.calculateKP(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/sade-sati
  fastify.post('/sade-sati', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate deterministic Sade Sati and Dhaiyya status',
      description: 'Evaluates 7.5-year Sade Sati (Phase 1 Setting, Phase 2 Peak, Phase 3 Rising) and 2.5-year Dhaiyya (Kantaka 4th and Ashtama 8th from Moon) for a birth chart.',
    },
    handler: async (request: any, reply: any) => {
      const input = sadeSatiRequestSchema.parse(request.body);
      const result = await astrologyService.calculateSadeSati(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/chart-variants
  fastify.post('/chart-variants', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate derived Chart Variants',
      description: 'Derives Sun Chart (Surya Lagna), Moon Chart (Chandra Lagna), Karakamsha Chart, Sunrise Chart, Equal Bhava Chart, and Sripati Bhava Chart from a base birth chart.',
    },
    handler: async (request: any, reply: any) => {
      const input = chartVariantsRequestSchema.parse(request.body);
      const result = await astrologyService.calculateChartVariants(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/avakhada
  fastify.post('/avakhada', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate Avakhada Chakra, Ghat Chakra, and Tara Chakra',
      description: 'Computes traditional birth facts (Varna, Vashya, Yoni, Gana, Nadi, Paya, Namakshara), Ghat Chakra inauspicious factors, and 9-Tara Chakra relative to natal Moon.',
    },
    handler: async (request: any, reply: any) => {
      const input = avakhadaRequestSchema.parse(request.body);
      const result = await astrologyService.calculateAvakhada(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });

  // POST /api/v1/astrology/vimshopaka
  fastify.post('/vimshopaka', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate Vimshopaka Bala, Shodashvarga Summary, and Planetary Rays',
      description: 'Computes classical 20-point Vimshopaka Bala (Shadvarga, Saptavarga, Dashavarga, Shodashavarga), complete 16-Varga dignity matrix with Vaisheshikamsa category, and Planetary Rays (Rashmis).',
    },
    handler: async (request: any, reply: any) => {
      const input = vimshopakaRequestSchema.parse(request.body);
      const result = await astrologyService.calculateVimshopaka(input, request.user);
      return reply.status(200).send({ data: result });
    },
  });
}
