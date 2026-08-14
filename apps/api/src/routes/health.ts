import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.get('/health', async (_request, reply) => {
    return reply.status(200).send({
      status: 'ok',
    });
  });
}
