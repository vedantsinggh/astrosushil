import Fastify, { FastifyInstance } from 'fastify';
import { healthRoutes } from './routes/health';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  // Global Error Handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
      },
    });
  });

  // Register Routes
  app.register(healthRoutes);

  return app;
}
