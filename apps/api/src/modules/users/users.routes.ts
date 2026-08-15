import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { usersService } from './users.service';

export async function usersRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // GET /api/v1/users/me
  fastify.get('/me', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Users'],
      summary: 'Get authenticated user profile',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const profile = await usersService.getUserById(request.user.id);
      return reply.status(200).send(profile);
    },
  });
}
