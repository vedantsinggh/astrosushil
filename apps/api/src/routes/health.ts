import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { HealthStatusResponse } from '@astro/shared';
import { config } from '../config';
import { checkDatabaseHealth } from '../services/prisma.service';

export async function healthRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // GET /health and /api/v1/health
  const handler = async (_request: any, reply: any) => {
    const isDbConnected = await checkDatabaseHealth();

    const payload: HealthStatusResponse & { database?: string } = {
      status: isDbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'astro-api',
      environment: config.NODE_ENV,
      database: isDbConnected ? 'connected' : 'disconnected',
    };

    const statusCode = isDbConnected ? 200 : 503;
    return reply.status(statusCode).send(payload);
  };

  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Get service health status with database connectivity check',
    },
    handler,
  });
}
