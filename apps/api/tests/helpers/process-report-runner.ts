import { reportsService } from '../../src/modules/reports/reports.service';
import { careerReportWorker } from '../../src/services/report-worker.service';
import { redisQueueService } from '../../src/services/redis-queue.service';
import { nativeRedisClient } from '../../src/services/redis-client';
import { prisma } from '../../src/services/prisma.service';
import { FulfillmentStatus, OrderStatus } from '@prisma/client';
import { logger } from '../../src/utils/logger';

// Signal to parent that process has initialized and is ready
if (process.send) {
  process.send({ event: 'READY', pid: process.pid });
}

process.on('message', async (msg: any) => {
  if (!process.send) return;

  try {
    switch (msg.action) {
      case 'PING': {
        process.send({ event: 'PONG', pid: process.pid });
        break;
      }

      case 'DISABLE_REDIS': {
        nativeRedisClient.setMockDisabled(true);
        process.send({ event: 'REDIS_DISABLED', id: msg.id, pid: process.pid });
        break;
      }

      case 'ENABLE_REDIS': {
        nativeRedisClient.setMockDisabled(false);
        process.send({ event: 'REDIS_ENABLED', id: msg.id, pid: process.pid });
        break;
      }

      case 'CREATE_REPORT': {
        const { id, input, user } = msg;
        try {
          const result = await reportsService.createReportJob(input, user);
          process.send({
            event: 'REPORT_RESULT',
            id,
            pid: process.pid,
            success: true,
            result,
          });
        } catch (err: any) {
          process.send({
            event: 'REPORT_RESULT',
            id,
            pid: process.pid,
            success: false,
            error: {
              message: err?.message || 'Unknown error',
              code: err?.code || err?.statusCode || 'UNKNOWN_ERROR',
            },
          });
        }
        break;
      }

      case 'CRASH_BEFORE_ENQUEUE': {
        // Creates report in DB and terminates process before Redis enqueue
        const { reportData } = msg;
        const rep = await prisma.report.create({ data: reportData });
        if (rep.orderId) {
          await prisma.order.updateMany({
            where: { id: rep.orderId },
            data: { fulfillmentStatus: FulfillmentStatus.PROCESSING },
          });
        }
        process.send({ event: 'CRASHING_BEFORE_ENQUEUE', reportId: rep.id, pid: process.pid });
        // Hard exit immediately to simulate API server crash
        setTimeout(() => process.exit(1), 20);
        break;
      }

      case 'CRASH_AFTER_ENQUEUE': {
        // Creates report in DB, enqueues to Redis, and terminates before DB metadata update
        const { reportData } = msg;
        const rep = await prisma.report.create({ data: reportData });
        if (rep.orderId) {
          await prisma.order.updateMany({
            where: { id: rep.orderId },
            data: { fulfillmentStatus: FulfillmentStatus.PROCESSING },
          });
        }
        await redisQueueService.enqueueJob(rep.id);
        process.send({ event: 'CRASHING_AFTER_ENQUEUE', reportId: rep.id, pid: process.pid });
        // Hard exit immediately before markJobEnqueued can run
        setTimeout(() => process.exit(1), 20);
        break;
      }

      case 'DEQUEUE_AND_CRASH': {
        // Pops job from queue and crashes before pipeline can complete
        const dequeuedId = await redisQueueService.dequeueJob();
        process.send({ event: 'DEQUEUED_CRASHING', reportId: dequeuedId, pid: process.pid });
        setTimeout(() => process.exit(1), 20);
        break;
      }

      case 'RUN_LONG_JOB_HEARTBEAT': {
        const { reportId, durationMs, heartbeatIntervalMs } = msg;
        const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'];
        await prisma.report.updateMany({
          where: { id: reportId, status: { in: activeStatuses as any[] } },
          data: { status: 'CALCULATING', stage: 'CALCULATING', progress: 20 },
        });

        const timer = setInterval(async () => {
          await careerReportWorker.touchHeartbeat(reportId);
        }, heartbeatIntervalMs || 100);

        setTimeout(async () => {
          clearInterval(timer);
          process.send({ event: 'LONG_JOB_HEARTBEAT_DONE', reportId, pid: process.pid });
        }, durationMs || 600);
        break;
      }

      case 'SIMULATE_COMPLETION': {
        const { reportId } = msg;
        const activeStatuses = ['QUEUED', 'CALCULATING', 'ANALYZING', 'RENDERING', 'COMPILING', 'UPLOADING'];
        const res = await prisma.report.updateMany({
          where: { id: reportId, status: { in: activeStatuses as any[] } },
          data: {
            status: 'COMPLETED',
            stage: 'COMPLETED',
            progress: 100,
            completedAt: new Date(),
            updatedAt: new Date(),
            metadata: { summary: 'Completed from runner process' },
          },
        });
        process.send({ event: 'SIMULATE_COMPLETION_DONE', count: res.count, pid: process.pid });
        break;
      }

      case 'RECOVER_STALE_JOBS': {
        const { id } = msg;
        try {
          const res = await careerReportWorker.recoverStaleJobs();
          process.send({
            event: 'RECOVERY_RESULT',
            id,
            pid: process.pid,
            success: true,
            result: res,
          });
        } catch (err: any) {
          process.send({
            event: 'RECOVERY_RESULT',
            id,
            pid: process.pid,
            success: false,
            error: {
              message: err?.message || 'Unknown recovery error',
            },
          });
        }
        break;
      }

      case 'ACQUIRE_CLAIM': {
        const { id, reportId, claimToken } = msg;
        try {
          const acquired = await careerReportWorker.acquireWorkerClaim(reportId, claimToken);
          process.send({
            event: 'CLAIM_RESULT',
            id,
            pid: process.pid,
            success: true,
            acquired,
          });
        } catch (err: any) {
          process.send({
            event: 'CLAIM_RESULT',
            id,
            pid: process.pid,
            success: false,
            error: err?.message || String(err),
          });
        }
        break;
      }

      case 'RELEASE_CLAIM': {
        const { id, reportId, claimToken } = msg;
        try {
          const released = await redisQueueService.releaseReportClaim(reportId, claimToken);
          process.send({
            event: 'RELEASE_RESULT',
            id,
            pid: process.pid,
            success: true,
            released,
          });
        } catch (err: any) {
          process.send({
            event: 'RELEASE_RESULT',
            id,
            pid: process.pid,
            success: false,
            error: err?.message || String(err),
          });
        }
        break;
      }

      case 'RENEW_CLAIM': {
        const { id, reportId, claimToken, ttlMs } = msg;
        try {
          const renewed = await redisQueueService.renewReportClaim(reportId, claimToken, ttlMs);
          process.send({
            event: 'RENEW_RESULT',
            id,
            pid: process.pid,
            success: true,
            renewed,
          });
        } catch (err: any) {
          process.send({
            event: 'RENEW_RESULT',
            id,
            pid: process.pid,
            success: false,
            error: err?.message || String(err),
          });
        }
        break;
      }

      case 'COMPLETE_JOB': {
        const { id, reportId, claimToken } = msg;
        try {
          const completed = await redisQueueService.completeJob(reportId, claimToken);
          process.send({
            event: 'COMPLETE_JOB_RESULT',
            id,
            pid: process.pid,
            success: true,
            completed,
          });
        } catch (err: any) {
          process.send({
            event: 'COMPLETE_JOB_RESULT',
            id,
            pid: process.pid,
            success: false,
            error: err?.message || String(err),
          });
        }
        break;
      }

      case 'SET_STAGE': {
        const { id, reportId, status, progress, stage, claimToken } = msg;
        try {
          const updated = await careerReportWorker.updateJobStatus(reportId, status, progress, stage, claimToken);
          process.send({
            event: 'SET_STAGE_RESULT',
            id,
            pid: process.pid,
            success: true,
            updated,
          });
        } catch (err: any) {
          process.send({
            event: 'SET_STAGE_RESULT',
            id,
            pid: process.pid,
            success: false,
            error: err?.message || String(err),
          });
        }
        break;
      }

      case 'TOUCH_HEARTBEAT': {
        const { id, reportId, claimToken } = msg;
        try {
          const alive = await careerReportWorker.touchHeartbeat(reportId, claimToken);
          process.send({
            event: 'TOUCH_HEARTBEAT_RESULT',
            id,
            pid: process.pid,
            success: true,
            alive,
          });
        } catch (err: any) {
          process.send({
            event: 'TOUCH_HEARTBEAT_RESULT',
            id,
            pid: process.pid,
            success: false,
            error: err?.message || String(err),
          });
        }
        break;
      }

      case 'RETRY_REPORT': {
        const { id, reportId } = msg;
        try {
          const retried = await careerReportWorker.retryReportJob(reportId);
          process.send({
            event: 'RETRY_RESULT',
            id,
            pid: process.pid,
            success: true,
            retried,
          });
        } catch (err: any) {
          process.send({
            event: 'RETRY_RESULT',
            id,
            pid: process.pid,
            success: false,
            error: err?.message || String(err),
          });
        }
        break;
      }

      case 'FAIL_IF_STALE': {
        const { id, reportId, capturedUpdatedAt, errorCode, errorMessage } = msg;
        try {
          const failed = await careerReportWorker.failJobIfStale(
            reportId,
            new Date(capturedUpdatedAt),
            errorCode || 'RECOVERY_TIMEOUT',
            errorMessage || 'Stale execution'
          );
          process.send({
            event: 'FAIL_IF_STALE_RESULT',
            id,
            pid: process.pid,
            success: true,
            failed,
          });
        } catch (err: any) {
          process.send({
            event: 'FAIL_IF_STALE_RESULT',
            id,
            pid: process.pid,
            success: false,
            error: err?.message || String(err),
          });
        }
        break;
      }

      case 'ENQUEUE_JOB': {
        const { id, reportId } = msg;
        try {
          const enqueued = await redisQueueService.enqueueJob(reportId);
          process.send({
            event: 'ENQUEUE_RESULT',
            id,
            pid: process.pid,
            success: true,
            enqueued,
          });
        } catch (err: any) {
          process.send({
            event: 'ENQUEUE_RESULT',
            id,
            pid: process.pid,
            success: false,
            error: err?.message || String(err),
          });
        }
        break;
      }

      case 'CLAIM_AND_CRASH': {
        const { reportId, claimToken } = msg;
        const acquired = await careerReportWorker.acquireWorkerClaim(reportId, claimToken);
        process.send({ event: 'CLAIMED_CRASHING', acquired, pid: process.pid });
        setTimeout(() => process.exit(1), 20);
        break;
      }

      case 'EXIT': {
        process.send({ event: 'EXIT_ACK', pid: process.pid });
        await nativeRedisClient.quit().catch(() => {});
        setTimeout(() => process.exit(0), 50);
        break;
      }

      default:
        logger.warn({ msg }, '[ProcessRunner] Unrecognized message action');
    }
  } catch (outerErr: any) {
    process.send({
      event: 'PROCESS_ERROR',
      pid: process.pid,
      error: outerErr?.message || String(outerErr),
    });
  }
});
