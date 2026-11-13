import { postgresQueueService } from './services/postgres-queue.service';
import { careerReportWorker } from './services/report-worker.service';
import { logger } from './utils/logger';

async function startWorkerLoop() {
  logger.info('🚀 [ReportWorkerProcess] Background Report Worker started (PostgreSQL Queue)');

  // Start autonomous recurring stale-job recovery loop
  careerReportWorker.startStaleRecoveryLoop();

  let isRunning = true;

  const shutdown = async (signal: string) => {
    logger.info(`[ReportWorkerProcess] Received ${signal}. Shutting down worker gracefully...`);
    isRunning = false;
    careerReportWorker.stopStaleRecoveryLoop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  while (isRunning) {
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
