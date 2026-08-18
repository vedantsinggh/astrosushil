import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { astrologyService } from './astrology.service';
import { calculateChartSchema } from './astrology.schemas';
import { AuthenticationError } from '../../errors/app-error';

export async function astrologyRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // Use optional authentication hook for astrology routes to support Guest Mode
  fastify.addHook('onRequest', fastify.authenticateOptional);

  // POST /api/v1/astrology/chart
  fastify.post('/chart', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
      },
    },
    schema: {
      tags: ['Astrology'],
      summary: 'Calculate natal astrology chart for a birth profile or direct birth details',
      description: 'Calculates planetary positions, Rashis, and Nakshatras for a DB birth profile or direct guest birth details.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          birthProfileId: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
            description: 'UUID of the user-owned BirthProfile (requires authentication)',
          },
          birthDetails: {
            type: 'object',
            description: 'Direct birth details for guest calculations',
            properties: {
              name: { type: 'string', example: 'Aarav Sharma' },
              dateOfBirth: { type: 'string', example: '1995-08-15' },
              timeOfBirth: { type: 'string', example: '14:30:00' },
              latitude: { type: 'number', example: 28.6139 },
              longitude: { type: 'number', example: 77.2090 },
              timezone: { type: 'string', example: 'Asia/Kolkata' },
              placeName: { type: 'string', example: 'New Delhi, India' },
            },
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
                  items: { type: 'object' },
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
                message: { type: 'string', example: 'Either birthProfileId or birthDetails must be provided' },
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
        429: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'RATE_LIMIT_EXCEEDED' },
                message: { type: 'string', example: 'Rate limit exceeded' },
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
      const input = calculateChartSchema.parse(request.body);

      let result;
      const authMode = request.user ? 'authenticated' : 'guest';

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

      // Log request metadata distinguishing guest vs authenticated mode without sensitive details
      request.log.info(
        {
          authMode,
          userId: request.user?.id ?? null,
          hasBirthProfileId: !!input.birthProfileId,
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
