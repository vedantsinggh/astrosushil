import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fp from 'fastify-plugin';

export const registerCors = fp(async function registerCors(app: FastifyInstance) {
  const allowedOrigins = new Set(
    (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        try {
          return new URL(item).origin;
        } catch {
          return item;
        }
      })
  );

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }

      let normalizedOrigin = origin;
      let hostname = '';
      try {
        const parsed = new URL(origin);
        normalizedOrigin = parsed.origin;
        hostname = parsed.hostname;
      } catch {
        cb(null, false);
        return;
      }

      // Allow localhost / 127.0.0.1 / local tunnels only in non-production environments
      if (
        process.env.NODE_ENV !== 'production' &&
        (hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.endsWith('.trycloudflare.com'))
      ) {
        cb(null, true);
        return;
      }

      if (allowedOrigins.has(normalizedOrigin)) {
        cb(null, true);
        return;
      }

      cb(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-request-id', 'x-admin-token'],
    credentials: true,
  });
});
