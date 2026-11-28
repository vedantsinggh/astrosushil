import { buildApp } from './app';
import { config } from './config';
import { disconnectPrisma } from './services/prisma.service';
import { careerReportWorker, isInstantExecutionEnabled } from './services/report-worker.service';
import { setProcessRole } from './services/process-identity';
import { registerContactInquiryNotifier } from './modules/content/contact-inquiry.notifier';
import { registerSiteSettingsSellerDetails } from './modules/invoices/site-settings-seller.provider';
import { registerImageProcessor } from './modules/uploads/image-processor';
import { enforceDeploymentSafety } from './services/deployment-safety';

setProcessRole('api');

const app = buildApp();

const start = async () => {
  // Testing deployment only (DEPLOYMENT_ENVIRONMENT=testing): refuse live Razorpay keys, warn
  // when the messaging recipient allowlist is off. Unset: nothing is checked.
  try {
    enforceDeploymentSafety('api');
  } catch (err) {
    app.log.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // Hooks between modules. Contact form inquiries send the website's two e-mails through the
  // messaging outbox; invoice seller details come from the admin's site settings, with the
  // INVOICE_SELLER_* environment values as the fallback (neither call throws).
  registerContactInquiryNotifier();
  await registerSiteSettingsSellerDetails();
  // WebP conversion and product-preview watermarking of uploaded images (sharp); does not throw.
  registerImageProcessor();

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
