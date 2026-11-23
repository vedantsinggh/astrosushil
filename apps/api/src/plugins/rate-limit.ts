import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';

async function rateLimitPlugin(app: FastifyInstance) {
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => {
      return {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Rate limit exceeded. Try again in ${context.after}.`,
          requestId: request.id,
        },
      };
    },
  });
}

/**
 * Wrapped with fastify-plugin so the limiter applies to the whole application. Unwrapped, it stayed
 * inside this plugin's own scope and limited nothing, including the per-route `config.rateLimit`
 * settings. The limit is per client IP: behind a reverse proxy TRUST_PROXY must be set, otherwise
 * every request appears to come from the proxy and all customers share one allowance.
 */
export const registerRateLimit = fp(rateLimitPlugin, { name: 'rate-limit' });
