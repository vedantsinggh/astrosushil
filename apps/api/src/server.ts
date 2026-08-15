import { buildApp } from './app';
import { config } from './config';

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

start();
