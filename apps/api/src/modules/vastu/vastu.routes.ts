import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { vastuService } from './vastu.service';
import { vastuGuidanceQuerySchema } from './vastu.schemas';

export async function vastuRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // GET /api/v1/vastu/categories
  fastify.get('/categories', {
    schema: {
      tags: ['Vastu'],
      summary: 'Get all Vastu room and space categories',
      security: [{ bearerAuth: [] }],
    },
    handler: async (_request, reply) => {
      const result = await vastuService.getCategories();
      return reply.status(200).send(result);
    },
  });

  // GET /api/v1/vastu/guidance
  fastify.get('/guidance', {
    schema: {
      tags: ['Vastu'],
      summary: 'Get authentic Vastu Shastra placement guidance and remedies',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string', example: 'main-entrance' },
          categoryId: { type: 'integer', example: 1 },
        },
      },
    },
    handler: async (request, reply) => {
      const query = vastuGuidanceQuerySchema.parse(request.query);
      const result = await vastuService.getGuidance(query);
      return reply.status(200).send(result);
    },
  });
}
