import { buildApp } from './app';
import { config } from './config';
import { disconnectPrisma } from './services/prisma.service';
import { careerReportWorker, isInstantExecutionEnabled } from './services/report-worker.service';
import { setProcessRole } from './services/process-identity';

setProcessRole('api');

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

  // When reports run inside the API (instant execution, development), the API is
  // also responsible for resuming them after a restart: release claims left by
  // the previous boot, recover expired leases, and keep dispatching queued and
  // retry-due reports. Otherwise the worker process (src/worker.ts) does this.
  if (isInstantExecutionEnabled()) {
    try {
      await careerReportWorker.recoverOnStartup();
    } catch (err) {
      app.log.error(err, 'Start-up report recovery failed');
    }
    careerReportWorker.startStaleRecoveryLoop();
    careerReportWorker.startInProcessDispatcher();
  }

  // pm2 wait_ready (zero-downtime reload): the new instance is listening.
  if (process.send) process.send('ready');
};

// Graceful shutdown handling
let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info(`Received ${signal}. Shutting down server gracefully...`);
  try {
    // Stop claiming reports and release (or finish) the ones running in this process
    // before the database connection goes away.
    const reports = await careerReportWorker.shutdown();
    if (reports.released || reports.finished) app.log.info(reports, 'In-flight reports handled');
    await app.close();
    await disconnectPrisma();
    app.log.info('Server and Database connections closed successfully.');
    process.exit(0);
  } catch (err) {
    app.log.error(err, 'Error during graceful shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

start();
