import { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';

export async function registerHelmet(app: FastifyInstance) {
  await app.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  });
}
