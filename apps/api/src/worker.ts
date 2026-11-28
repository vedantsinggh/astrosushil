import { postgresQueueService } from './services/postgres-queue.service';
import { careerReportWorker } from './services/report-worker.service';
import { rashiBhavishyaScheduler } from './services/rashi-bhavishya.scheduler';
import { messagingScheduler } from './services/messaging/messaging.scheduler';
import { invoiceRecoveryScheduler } from './modules/invoices/invoice-recovery.sweep';
import { disconnectPrisma } from './services/prisma.service';
import { setProcessRole } from './services/process-identity';
import { logger } from './utils/logger';
import { enforceDeploymentSafety } from './services/deployment-safety';

setProcessRole('worker');

async function startWorkerLoop() {
  // Testing deployment only (DEPLOYMENT_ENVIRONMENT=testing): refuse live Razorpay keys, warn
  // when the messaging recipient allowlist is off. Unset: nothing is checked.
  try {
    enforceDeploymentSafety('worker');
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, '[ReportWorkerProcess] Refusing to start');
    process.exit(1);
  }

  logger.info('🚀 [ReportWorkerProcess] Background Report Worker started (PostgreSQL Queue)');

  let isRunning = true;
  let shuttingDown = false;

  // Graceful shutdown: stop claiming, give in-flight reports a short grace period,
  // then release their claims (back to QUEUED) so the next process resumes them at once.
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`[ReportWorkerProcess] Received ${signal}. Shutting down worker gracefully...`);
    isRunning = false;
    rashiBhavishyaScheduler.stop();
    messagingScheduler.stop();
    invoiceRecoveryScheduler.stop();
    try {
      const result = await careerReportWorker.shutdown();
      logger.info(result, '[ReportWorkerProcess] In-flight reports handled');
      await disconnectPrisma();
    } catch (err: any) {
      logger.error({ err: err?.message || err }, '[ReportWorkerProcess] Error during graceful shutdown');
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // Requeue reports left by a previous boot of this worker and expired leases
  // before claiming anything.
  try {
    await careerReportWorker.recoverOnStartup();
  } catch (err: any) {
    logger.error({ err: err?.message || err }, '[ReportWorkerProcess] Start-up recovery error');
  }

  // Start autonomous recurring stale-job recovery loop
  careerReportWorker.startStaleRecoveryLoop();

  // Prepare the daily Rashi Bhavishya (12 Moon signs) ahead of time
  // (RASHI_BHAVISHYA_SCHEDULER_ENABLED=false switches it off)
  rashiBhavishyaScheduler.start();

  // Outbound messaging: outbox dispatch (incl. delayed report-ready), consultation reminders
  // (MESSAGING_SCHEDULER_ENABLED=false switches all off; OUTBOX_DISPATCH_, REPORT_RELEASE_,
  // CONSULTATION_REMINDER_, OTP_CLEANUP_SCHEDULER_ENABLED=false switch one off)
  messagingScheduler.start();

  // Invoices left pending get their number (website: recovery every 5 minutes)
  // (INVOICE_RECOVERY_ENABLED=false switches it off)
  invoiceRecoveryScheduler.start();

  // pm2 wait_ready: the worker is ready once recovery ran.
  if (process.send) process.send('ready');

  while (isRunning && !careerReportWorker.isDraining()) {
    try {
      const claim = await postgresQueueService.claimJob('worker-main');
      if (claim) {
        logger.info(
          { reportId: claim.id, claimToken: claim.claimToken, claimVersion: claim.claimVersion },
          '[ReportWorkerProcess] Dequeued report job from PostgreSQL. Executing pipeline...'
        );
        await careerReportWorker.executeReportPipeline(claim.id, claim.claimToken, claim.claimVersion);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (err: any) {
      logger.error({ err: err?.message || err }, '[ReportWorkerProcess] Worker loop iteration error');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

startWorkerLoop();
