import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { rashiBhavishyaService } from './rashi-bhavishya.service';
import { rashiBhavishyaAllQuerySchema, rashiBhavishyaQuerySchema } from './rashi-bhavishya.schemas';

export async function rashiBhavishyaRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // GET /api/v1/rashi-bhavishya/today
  fastify.get('/today', {
    // Optional auth: a signed-in user's Moon rashi is derived from their own birth profile.
    onRequest: [fastify.authenticateOptional],
    schema: {
      tags: ['Rashi Bhavishya'],
      summary: "Daily Rashi Bhavishya (gochara from the Moon sign) for the user's Moon sign or a selected rashi",
      description:
        'Moon sign: rashiIndex, rashi (name) or profileId (signed-in user), else the latest birth profile of the signed-in user. ' +
        'Facts are computed deterministically; the narrative is written from those facts only and validated. ' +
        'When validated narrative cannot be produced (LLM not configured or failed), the same facts are returned with ' +
        'deterministic plain wording and narrativeSource "deterministic". 503 RASHI_BHAVISHYA_UNAVAILABLE only if the facts cannot be computed.',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          rashi: { type: 'string', example: 'Mesha' },
          rashiIndex: { type: 'integer', minimum: 1, maximum: 12, example: 1 },
          profileId: { type: 'string', format: 'uuid' },
          date: { type: 'string', example: '2026-11-18', description: 'IST date; today-7 … tomorrow' },
        },
      },
    },
    handler: async (request, reply) => {
      const query = rashiBhavishyaQuerySchema.parse(request.query);
      const userId = request.user?.id;
      const result = await rashiBhavishyaService.getTodayPrediction(userId, query);
      return reply.status(200).send(result);
    },
  });

  // GET /api/v1/rashi-bhavishya/all
  fastify.get('/all', {
    schema: {
      tags: ['Rashi Bhavishya'],
      summary: 'Every Moon sign already prepared for the date (never generated inside this request)',
      querystring: {
        type: 'object',
        properties: { date: { type: 'string', example: '2026-11-18' } },
      },
    },
    handler: async (request, reply) => {
      const query = rashiBhavishyaAllQuerySchema.parse(request.query);
      const result = await rashiBhavishyaService.getAllPredictions(query.date);
      return reply.status(200).send(result);
    },
  });
}
