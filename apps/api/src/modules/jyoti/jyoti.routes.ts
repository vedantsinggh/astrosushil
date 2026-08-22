import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { JyotiChatRequestSchema } from './jyoti.schemas';
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
      console.log('[JYOTI TRACE 1] Request reached controller');
      console.log('[JYOTI TRACE 2] Authentication passed');
      const payload = JyotiChatRequestSchema.parse(request.body);
      console.log('[JYOTI TRACE 3] DTO validation passed');
      const result = await jyotiService.processChat(request.user.id, payload);
      console.log('[JYOTI TRACE 10] Response returned to controller');
      return reply.status(200).send({ data: result });
    },
  });
}
