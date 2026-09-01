import { redisQueueService } from './services/redis-queue.service';
import { careerReportWorker } from './services/report-worker.service';
import { logger } from './utils/logger';

async function startWorkerLoop() {
  logger.info('🚀 [ReportWorkerProcess] Background Report Worker started');

  let isRunning = true;

  const shutdown = (signal: string) => {
    logger.info(`[ReportWorkerProcess] Received ${signal}. Shutting down worker gracefully...`);
    isRunning = false;
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  while (isRunning) {
    try {
      const reportId = await redisQueueService.dequeueJob();
      if (reportId) {
        logger.info({ reportId }, '[ReportWorkerProcess] Dequeued report job from Redis. Executing pipeline...');
        await careerReportWorker.executeReportPipeline(reportId);
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
