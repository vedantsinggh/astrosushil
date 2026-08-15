import { buildApp } from './app';
import { config } from './config';
import { disconnectPrisma } from './services/prisma.service';

const app = buildApp();

const start = async () => {
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`🚀 Astro Sushil Backend API running on http://${config.HOST}:${config.PORT}`);
    app.log.info(`📚 Swagger Documentation available at http://${config.HOST}:${config.PORT}/documentation`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal}. Shutting down server gracefully...`);
  try {
    await app.close();
    await disconnectPrisma();
    app.log.info('Server and Database connections closed successfully.');
    process.exit(0);
  } catch (err) {
    app.log.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
