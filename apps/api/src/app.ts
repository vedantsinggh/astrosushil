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
import { LOG_REDACT_KEYS } from './utils/logger';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'test' ? 'silent' : config.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: LOG_REDACT_KEYS,
    },
    ajv: {
      customOptions: {
        keywords: ['example'],
      },
    },
    genReqId: (req) => {
      const existingReqId = req.headers['x-request-id'];
      // Validate user-provided request ID to prevent injection/log tampering
      if (
        existingReqId &&
        typeof existingReqId === 'string' &&
        /^[a-zA-Z0-9_-]{8,64}$/.test(existingReqId)
      ) {
        return existingReqId;
      }
      return crypto.randomUUID();
    },
  });

  // Retain raw body for webhook HMAC signature verification while parsing JSON
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      const rawString = body.toString('utf8');
      (req as any).rawBody = rawString;
      const parsed = rawString.trim() ? JSON.parse(rawString) : {};
      done(null, parsed);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // Register CORS Plugin first so preflight and headers apply to all hooks & errors
  app.register(registerCors);

  // Attach request ID to response header
  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id);
    return payload;
  });

  // Maintenance mode check hook
  app.addHook('onRequest', async (request, reply) => {
    const isMaintenance = process.env.MAINTENANCE_MODE === 'true';
    const isHealthEndpoint =
      request.url === '/health' ||
      request.url === '/ready' ||
      request.url === '/health/ready' ||
      request.url.startsWith('/documentation');

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

  // Register remaining Plugins
  app.register(registerHelmet);
  app.register(registerJwt);
  app.register(registerRateLimit);
  app.register(registerSwagger);
  app.register(registerRoutes);

  return app;
}
