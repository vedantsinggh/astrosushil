import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { locationService } from './locations.service';
import { locationSearchQuerySchema } from './locations.schemas';

export async function locationsRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // GET /api/v1/locations/search?q=...&limit=...
  fastify.get('/search', {
    schema: {
      tags: ['Locations'],
      summary: 'Search for verified geographic locations and cities worldwide',
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', description: 'Search query (city or place name, min 2 chars)', example: 'Delhi' },
          limit: { type: 'integer', minimum: 1, maximum: 20, default: 10, description: 'Maximum number of results to return' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'name', 'displayName', 'country', 'countryCode', 'latitude', 'longitude', 'timezone'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              displayName: { type: 'string' },
              country: { type: 'string' },
              countryCode: { type: 'string' },
              state: { type: 'string' },
              latitude: { type: 'number' },
              longitude: { type: 'number' },
              timezone: { type: 'string' },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { q, limit } = locationSearchQuerySchema.parse(request.query);
      const results = await locationService.searchPlaces(q, limit);
      return reply.status(200).send(results);
    },
  });
}
