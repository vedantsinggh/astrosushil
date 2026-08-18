import { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

export async function registerRateLimit(app: FastifyInstance) {
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
