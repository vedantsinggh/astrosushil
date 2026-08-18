import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { predictionsService } from './predictions.service';
import {
  generateNatalPredictionSchema,
  generateTransitPredictionSchema,
} from './predictions.schemas';

export async function predictionsRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /api/v1/predictions/natal
  fastify.post('/natal', {
    schema: {
      tags: ['Predictions'],
      summary: 'Generate natal prediction tree across life domains',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['birthProfileId'],
        properties: {
          birthProfileId: { type: 'string', format: 'uuid' },
          domain: {
            type: 'string',
            enum: ['ALL', 'CAREER', 'MARRIAGE', 'HEALTH', 'FINANCE', 'PROGENY'],
            default: 'ALL',
          },
        },
      },
    },
    handler: async (request, reply) => {
      const input = generateNatalPredictionSchema.parse(request.body);
      const result = await predictionsService.generateNatalPrediction(input, request.user);
      return reply.status(200).send(result);
    },
  });

  // POST /api/v1/predictions/transit
  fastify.post('/transit', {
    schema: {
      tags: ['Predictions'],
      summary: 'Generate transit prediction overlays for a target date',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['birthProfileId'],
        properties: {
          birthProfileId: { type: 'string', format: 'uuid' },
          targetDate: { type: 'string', example: '2026-08-16' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = generateTransitPredictionSchema.parse(request.body);
      const result = await predictionsService.generateTransitPrediction(input, request.user);
      return reply.status(200).send(result);
    },
  });
}
