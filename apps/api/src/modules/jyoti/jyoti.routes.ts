import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { JyotiChatRequestSchema, JyotiExplainRequestSchema } from './jyoti.schemas';
import { jyotiService } from './jyoti.service';

export async function jyotiRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // Enforce authentication for all Jyoti endpoints
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /api/v1/jyoti/chat
  fastify.post('/chat', {
    schema: {
      tags: ['Jyoti AI Assistant'],
      summary: 'Send a chat message to Jyoti AI Assistant',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', example: 'What does my 7th house mean?' },
          conversation: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['user', 'assistant'] },
                content: { type: 'string' },
              },
            },
          },
          context: {
            type: 'object',
            properties: {
              currentScreen: { type: 'string', example: 'BIRTH_CHART' },
              birthProfileId: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const payload = JyotiChatRequestSchema.parse(request.body);
      const result = await jyotiService.processChat(request.user.id, payload);
      return reply.status(200).send({
        data: {
          message: result.message,
          actions: result.actions ?? [],
          explanation: result.explanation,
        },
      });
    },
  });

  // POST /api/v1/jyoti/explain - Universal "Let Sushil Sir explain" System
  fastify.post('/explain', {
    schema: {
      tags: ['Sushil AI Explainer'],
      summary: 'Contextual one-shot explanation of current astrology screen by AI Sushil Sir',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['feature', 'screenTitle', 'context'],
        properties: {
          feature: {
            type: 'string',
            example: 'birth_chart',
            description: 'Allowed astrology feature identifier',
          },
          screenTitle: {
            type: 'string',
            example: 'Birth Chart',
            description: 'Human-readable screen title',
          },
          purpose: {
            type: 'string',
            example: 'Explain the natal chart placements',
          },
          context: {
            type: 'object',
            required: ['astrologyData'],
            properties: {
              astrologyData: { type: 'object' },
              importantValues: { type: 'object' },
              availableSections: { type: 'array', items: { type: 'string' } },
              userProfileContext: { type: 'object' },
              displayPreferences: { type: 'object' },
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
              properties: {
                headline: { type: 'string' },
                message: { type: 'string' },
                keyPoints: { type: 'array', items: { type: 'string' } },
                disclaimer: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const payload = JyotiExplainRequestSchema.parse(request.body);
      const result = await jyotiService.processExplain(request.user.id, payload);
      return reply.status(200).send({
        data: result,
      });
    },
  });
}
