import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { rashiBhavishyaService } from './rashi-bhavishya.service';
import { rashiBhavishyaQuerySchema } from './rashi-bhavishya.schemas';

export async function rashiBhavishyaRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // GET /api/v1/rashi-bhavishya/today
  fastify.get('/today', {
    schema: {
      tags: ['Rashi Bhavishya'],
      summary: "Get today's daily Rashi Bhavishya prediction for user's Moon Rashi or selected Rashi",
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          rashi: { type: 'string', example: 'Mesha' },
          rashiIndex: { type: 'integer', minimum: 1, maximum: 12, example: 1 },
          date: { type: 'string', example: '2026-08-18' },
        },
      },
    },
    handler: async (request, reply) => {
      const query = rashiBhavishyaQuerySchema.parse(request.query);
      const userId = request.user?.id || 'anonymous';
      const result = await rashiBhavishyaService.getTodayPrediction(userId, query);
      return reply.status(200).send(result);
    },
  });

  // GET /api/v1/rashi-bhavishya/all
  fastify.get('/all', {
    schema: {
      tags: ['Rashi Bhavishya'],
      summary: "List today's predictions for all 12 Rashis",
      security: [{ bearerAuth: [] }],
    },
    handler: async (_request, reply) => {
      const result = await rashiBhavishyaService.getAllPredictions();
      return reply.status(200).send(result);
    },
  });
}
