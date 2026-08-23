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
            data: {
              type: 'object',
              additionalProperties: true,
            },
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
                ascendant: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    name: { type: 'string', example: 'Ascendant' },
                    longitude: { type: 'number', example: 148.5 },
                    rashiIndex: { type: 'integer', example: 5 },
                    degreeInRashi: { type: 'number', example: 28.5 },
                    nakshatraIndex: { type: 'integer', example: 11 },
                    pada: { type: 'integer', example: 4 },
                    nakshatraLord: { type: 'string', example: 'VENUS' },
                    rashiName: { type: 'string', example: 'Simha' },
                    nakshatraName: { type: 'string', example: 'Purva Phalguni' },
                  },
                  additionalProperties: true,
                },
                planets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      planet: { type: 'string', example: 'SUN' },
                      longitude: { type: 'number', example: 123.45 },
                      latitude: { type: 'number', example: 0.0001 },
                      speedLongitude: { type: 'number', example: 0.96 },
                      isRetrograde: { type: 'boolean', example: false },
                      rashiIndex: { type: 'integer', example: 5 },
                      rashiName: { type: 'string', example: 'Simha' },
                      degreeInRashi: { type: 'number', example: 3.45 },
                      nakshatraIndex: { type: 'integer', example: 10 },
                      nakshatraName: { type: 'string', example: 'Magha' },
                      pada: { type: 'integer', example: 1 },
                      nakshatraLord: { type: 'string', example: 'KETU' },
                    },
                    additionalProperties: true,
                  },
                },
                houses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      houseNumber: { type: 'integer', example: 1 },
                      cuspLongitude: { type: 'number', example: 120 },
                      startLongitude: { type: 'number', example: 120 },
                      endLongitude: { type: 'number', example: 150 },
                      rashiIndex: { type: 'integer', example: 5 },
                      rashiName: { type: 'string', example: 'Simha' },
                    },
                    additionalProperties: true,
                  },
                },
                rashis: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      index: { type: 'integer', example: 1 },
                      name: { type: 'string', example: 'Mesha' },
                      englishName: { type: 'string', example: 'Aries' },
                      lord: { type: 'string', example: 'MARS' },
                      element: { type: 'string', example: 'FIRE' },
                      modality: { type: 'string', example: 'CHARA' },
                      planetsPresent: { type: 'array', items: { type: 'string' } },
                    },
                    additionalProperties: true,
                  },
                },
                nakshatras: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      index: { type: 'integer', example: 1 },
                      name: { type: 'string', example: 'Ashwini' },
                      lord: { type: 'string', example: 'KETU' },
                      planetsPresent: { type: 'array', items: { type: 'string' } },
                    },
                    additionalProperties: true,
                  },
                },
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
      const startTime = Date.now();

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

      const durationMs = Date.now() - startTime;

      // [DEV-ONLY DIAGNOSTIC] Log serialization verification - REMOVE before production
      if (process.env.NODE_ENV !== 'production') {
        const chartData = result.chart;
        const firstPlanet = chartData.planets?.[0];
        request.log.info(
          {
            diagLabel: 'ASTROLOGY_ENGINE_RAW_RESULT',
            ascendant: {
              type: typeof chartData.ascendant,
              keys: chartData.ascendant ? Object.keys(chartData.ascendant) : [],
              jsonStringifyResult: JSON.stringify(chartData.ascendant)?.substring(0, 200),
            },
            planets: {
              count: chartData.planets?.length ?? 0,
              firstPlanetType: typeof firstPlanet,
              firstPlanetKeys: firstPlanet ? Object.keys(firstPlanet) : [],
              firstPlanetOwnPropertyNames: firstPlanet ? Object.getOwnPropertyNames(firstPlanet) : [],
              firstPlanetJsonStringify: JSON.stringify(firstPlanet)?.substring(0, 300),
              planetIdentities: chartData.planets?.map((p: any) => p.planet) ?? [],
            },
            houses: {
              count: chartData.houses?.length ?? 0,
              firstHouseKeys: chartData.houses?.[0] ? Object.keys(chartData.houses[0]) : [],
            },
            rashis: {
              count: chartData.rashis?.length ?? 0,
              firstRashiKeys: chartData.rashis?.[0] ? Object.keys(chartData.rashis[0]) : [],
            },
            nakshatras: {
              count: chartData.nakshatras?.length ?? 0,
              firstNakshatraKeys: chartData.nakshatras?.[0] ? Object.keys(chartData.nakshatras[0]) : [],
            },
          },
          'Astrology engine diagnostic: pre-serialization data inspection'
        );
      }
      // [END DEV-ONLY DIAGNOSTIC]

      // Log request metadata distinguishing guest vs authenticated mode without sensitive details
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
    },
  });
}
