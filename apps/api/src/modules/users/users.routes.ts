import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { usersService } from './users.service';
import { deleteAccountSchema } from './users.schemas';

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

  // DELETE /api/v1/users/me
  fastify.delete('/me', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['Users'],
      summary: 'Self-service account deletion and personal data erasure',
      description: 'Permanently deletes birth profiles, reports, and active sessions; revokes entitlements; scrubs personal identifiable information (PII) while retaining legally mandated order tax records.',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          confirmation: { type: 'string', enum: ['DELETE', 'DELETE_ACCOUNT'] },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            deletedAt: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const input = deleteAccountSchema.parse(request.body || {});
      const clientIp = request.ip;
      const result = await usersService.deleteOwnAccount(request.user.id, input, clientIp);
      return reply.status(200).send(result);
    },
  });
}
