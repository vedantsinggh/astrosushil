import { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fp from 'fastify-plugin';

export const registerCors = fp(async function registerCors(app: FastifyInstance) {
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow non-browser clients (like curl, postman, mobile) or any localhost/127.0.0.1/trycloudflare origin in dev
      if (
        !origin ||
        process.env.NODE_ENV !== 'production' ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('trycloudflare.com')
      ) {
        cb(null, true);
        return;
      }
      if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.split(',').some((allowed) => origin.includes(allowed.trim()))) {
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
