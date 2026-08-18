import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { astrologyService } from './astrology.service';
import { calculateChartSchema } from './astrology.schemas';

export async function astrologyRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // Enforce JWT Authentication for all astrology routes
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /api/v1/astrology/chart
  fastify.post('/chart', {
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate natal astrology chart for a birth profile',
      description: 'Calculates planetary positions, Rashis, and Nakshatras for an authenticated user birth profile.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['birthProfileId'],
        properties: {
          birthProfileId: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
            description: 'UUID of the user-owned BirthProfile',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            chart: {
              type: 'object',
              properties: {
                calculationVersion: { type: 'string', example: '0.1.0' },
                providerName: { type: 'string', example: 'AstronomyEngineAdapter (astronomy-engine)' },
                providerVersion: { type: 'string', example: '2.1.19-mit' },
                normalizedTime: {
                  type: 'object',
                  properties: {
                    utcIsoString: { type: 'string', example: '1990-05-15T09:00:00.000Z' },
                    julianDayUT: { type: 'number', example: 2448026.875 },
                    timezoneOffsetMinutes: { type: 'number', example: 330 },
                  },
                },
                config: {
                  type: 'object',
                  properties: {
                    zodiacType: { type: 'string', example: 'SIDEREAL' },
                    ayanamsa: { type: 'string', example: 'LAHIRI' },
                    houseSystem: { type: 'string', example: 'WHOLE_SIGN' },
                    nodeCalculation: { type: 'string', example: 'MEAN_NODE' },
                    planetaryCalculationMode: { type: 'string', example: 'GEOCENTRIC' },
                  },
                },
                ascendant: { type: 'object', nullable: true },
                planets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      planet: { type: 'string', example: 'SUN' },
                      longitude: { type: 'number', example: 50.2541 },
                      latitude: { type: 'number', example: 0.0 },
                      speedLongitude: { type: 'number', example: 0.963 },
                      isRetrograde: { type: 'boolean', example: false },
                      rashiIndex: { type: 'number', example: 2 },
                      rashiName: { type: 'string', example: 'Vrishabha' },
                      degreeInRashi: { type: 'number', example: 20.2541 },
                      nakshatraIndex: { type: 'number', example: 4 },
                      nakshatraName: { type: 'string', example: 'Rohini' },
                      pada: { type: 'number', example: 4 },
                      nakshatraLord: { type: 'string', example: 'MOON' },
                    },
                  },
                },
                houses: { type: 'array', items: { type: 'object' } },
                rashis: { type: 'array', items: { type: 'object' } },
                nakshatras: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'birthProfileId must be a valid UUID' },
              },
            },
          },
        },
        401: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'AUTHENTICATION_ERROR' },
                message: { type: 'string', example: 'Authentication required' },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'NOT_FOUND' },
                message: { type: 'string', example: 'Birth profile not found' },
              },
            },
          },
        },
        422: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'UNCONFIRMED_METHODOLOGY' },
                message: { type: 'string', example: 'Calculation blocked: methodology requires explicit client confirmation.' },
              },
            },
          },
        },
        500: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'ASTROLOGY_CALCULATION_FAILED' },
                message: { type: 'string', example: 'Unable to calculate astrology chart' },
              },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      // Validate request payload
      const { birthProfileId } = calculateChartSchema.parse(request.body);

      // Perform calculation via AstrologyService
      const result = await astrologyService.calculateChartForProfile(birthProfileId, request.user);

      // Log execution metrics without sensitive birth details
      request.log.info(
        {
          birthProfileId,
          userId: request.user.id,
          calculationVersion: result.chart.calculationVersion,
          durationMs: result.executionMetrics.durationMs,
          methodologyVersion: result.executionMetrics.methodologyVersion,
        },
        'Astrology chart calculated successfully'
      );

      // Omit executionMetrics from client response to maintain strict DTO contract
      const { executionMetrics, ...responsePayload } = result;

      return reply.status(200).send(responsePayload);
    },
  });
}
