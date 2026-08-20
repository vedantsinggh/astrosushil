import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { guptaNadiService } from './gupta-nadi.service';
import { evaluateGuptaNadiSchema } from './gupta-nadi.schemas';

export async function guptaNadiRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // Enforce JWT Authentication for all gupta-nadi routes
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /api/v1/gupta-nadi/evaluate
  fastify.post('/evaluate', {
    schema: {
      tags: ['Gupta Nadi'],
      summary: 'Evaluate Brihaspati Nandi Nadi (BNN) rules for a birth profile',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['birthProfileId'],
        properties: {
          birthProfileId: { type: 'string', format: 'uuid' },
          transitDate: { type: 'string', example: '2026-08-16' },
          gender: { type: 'string', enum: ['MALE', 'FEMALE'], default: 'MALE' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = evaluateGuptaNadiSchema.parse(request.body);
      const result = await guptaNadiService.evaluateForProfile(input, request.user);
      return reply.status(200).send(result);
    },
  });

  // GET /api/v1/gupta-nadi/rules
  fastify.get('/rules', {
    schema: {
      tags: ['Gupta Nadi'],
      summary: 'Get list of active Gupta Nadi (BNN) rule definitions',
      security: [{ bearerAuth: [] }],
    },
    handler: async (_request, reply) => {
      const rules = guptaNadiService.getAvailableRules();
      return reply.status(200).send({ rules });
    },
  });
}
