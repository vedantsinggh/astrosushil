import { FastifyInstance } from 'fastify';
import { appHomeService } from './app-home.service';

/** Public: GET /app/home, the mobile home page's featured ids, switches and CMS content. */
export async function appHomeRoutes(fastify: FastifyInstance) {
  fastify.get('/home', {
    schema: { tags: ['App'], summary: 'Mobile app home page content' },
    handler: async (_request, reply) => {
      const data = await appHomeService.get();
      return reply.status(200).send({ statusCode: 200, success: true, message: 'App home fetched successfully', data });
    },
  });
}
