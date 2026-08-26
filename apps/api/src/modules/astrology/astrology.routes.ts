import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { astrologyService } from './astrology.service';
import {
  calculateChartSchema,
  dashaRequestSchema,
  panchangRequestSchema,
  vargasRequestSchema,
  matchmakingRequestSchema,
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

    let result;
    if (input.birthProfileId) {
      if (!request.user) {
        throw new AuthenticationError('Authentication required to calculate chart for saved profile');
      }
      result = await astrologyService.calculateChartForProfile(input.birthProfileId, request.user);
    } else if (input.birthDetails) {
      result = await astrologyService.calculateChartForDirectInput(input.birthDetails);
    } else {
      throw new AuthenticationError('Invalid calculation input');
    }

    const durationMs = Date.now() - startTime;
    request.log.info(
      {
        authMode,
        userId: request.user?.id ?? null,
        hasBirthProfileId: !!input.birthProfileId,
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
      summary: 'Calculate natal astrology chart',
      description: 'Calculates planetary positions, Rashis, and Nakshatras for a birth profile or direct birth details.',
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

  // POST /api/v1/astrology/dasha
  fastify.post('/dasha', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate Vimshottari Dasha periods',
      description: 'Calculates 3-tier Vimshottari Dasha timeline (Mahadasha -> Antardasha -> Pratyantardasha).',
    },
    handler: async (request, reply) => {
      const input = dashaRequestSchema.parse(request.body);
      const result = await astrologyService.calculateDasha(input, request.user);
      return reply.status(200).send({ data: result });
    },
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
      description: 'Calculates D-1 through D-30 divisional chart placements.',
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
}
