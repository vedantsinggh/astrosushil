import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { HealthStatusResponse } from '@astro/shared';
import { config } from '../config';
import { checkDatabaseHealth } from '../services/prisma.service';
import { redisQueueService } from '../services/redis-queue.service';

export async function healthRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // Liveness endpoint GET /health (Fast non-blocking probe)
  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Liveness probe for server uptime',
    },
    handler: async (_request, reply) => {
      const payload: HealthStatusResponse = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'astro-api',
        environment: config.NODE_ENV,
      };
      return reply.status(200).send(payload);
    },
  });

  const readinessHandler = async (_request: any, reply: any) => {
    const isDbConnected = await checkDatabaseHealth();
    const isRedisConnected = await redisQueueService.checkHealth();

    const payload: HealthStatusResponse & { database: string; redis: string } = {
      status: isDbConnected && isRedisConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'astro-api',
      environment: config.NODE_ENV,
      database: isDbConnected ? 'connected' : 'disconnected',
      redis: isRedisConnected ? 'connected' : 'disconnected',
    };

    const statusCode = isDbConnected && isRedisConnected ? 200 : 503;
    return reply.status(statusCode).send(payload);
  };

  // Readiness endpoint GET /ready (Dependency readiness check including DB)
  fastify.get('/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness probe checking database connectivity',
    },
    handler: readinessHandler,
  });

  // Readiness endpoint GET /health/ready (Standard Kubernetes readiness probe path)
  fastify.get('/health/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness probe checking database connectivity (Kubernetes alias)',
    },
    handler: readinessHandler,
  });
}
