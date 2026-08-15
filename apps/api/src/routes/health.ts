import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { HealthStatusResponse } from '@astro/shared';
import { config } from '../config';

export async function healthRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // Support both /health and /api/v1/health
  const handler = async (_request: any, reply: any) => {
    const payload: HealthStatusResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'astro-api',
      environment: config.NODE_ENV,
    };
    return reply.status(200).send(payload);
  };

  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Get service health status',
    },
    handler,
  });
}
