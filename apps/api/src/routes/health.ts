import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { HealthStatusResponse } from '@astro/shared';
import { config } from '../config';
import { checkDatabaseHealth } from '../services/prisma.service';

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

    const payload: HealthStatusResponse & { database: string } = {
      status: isDbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'astro-api',
      environment: config.NODE_ENV,
      database: isDbConnected ? 'connected' : 'disconnected',
    };

    const statusCode = isDbConnected ? 200 : 503;
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
