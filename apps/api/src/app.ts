import Fastify, { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { registerCors } from './plugins/cors';
import { registerHelmet } from './plugins/helmet';
import { registerJwt } from './plugins/jwt';
import { registerRateLimit } from './plugins/rate-limit';
import { registerSwagger } from './plugins/swagger';
import { registerRoutes } from './routes';
import { globalErrorHandler } from './errors/error-handler';
import { config } from './config';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'test' ? 'silent' : 'info',
      redact: ['req.headers.authorization', 'body.password', 'body.refreshToken', 'headers.cookie'],
    },
    ajv: {
      customOptions: {
        keywords: ['example'],
      },
    },
    genReqId: (req) => {
      const existingReqId = req.headers['x-request-id'];
      if (existingReqId && typeof existingReqId === 'string') {
        return existingReqId;
      }
      return crypto.randomUUID();
    },
  });

  // Attach request ID to response header
  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id);
    return payload;
  });

  // Maintenance mode check hook
  app.addHook('onRequest', async (request, reply) => {
    const isMaintenance = process.env.MAINTENANCE_MODE === 'true';
    const isHealthEndpoint = request.url === '/health' || request.url === '/ready' || request.url.startsWith('/documentation');

    if (isMaintenance && !isHealthEndpoint) {
      return reply.status(503).send({
        error: {
          code: 'SERVICE_MAINTENANCE',
          message: 'Astro Sushil is temporarily undergoing scheduled maintenance.',
          requestId: request.id,
        },
      });
    }
  });

  // Register Global Error Handler
  app.setErrorHandler(globalErrorHandler);

  // Register Plugins asynchronously in setup
  app.register(async (instance) => {
    await registerCors(instance);
    await registerHelmet(instance);
    await registerJwt(instance);
    await registerRateLimit(instance);
    await registerSwagger(instance);
    await registerRoutes(instance);
  });

  return app;
}
