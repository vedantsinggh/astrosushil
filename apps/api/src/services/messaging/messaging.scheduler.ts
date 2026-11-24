import { logger } from '../../utils/logger';
import { consultationReminderSweep } from '../../modules/notifications/consultation-reminder.sweep';
import { messagingEnv } from './config';
import { otpSendLimiter } from './otp-delivery.service';
import { outboxService } from './outbox.service';
import { reportReleaseSweep } from '../../modules/reports/report-release.sweep';

const REMINDER_INTERVAL_MS = 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Messaging sweeps, run in the worker process:
 *
 *  - outbox dispatch (every MESSAGING_DISPATCH_INTERVAL_MS): releases reports whose
 *    REPORT_SEND_DELAY_HOURS has passed (push and in-app notification, plus their
 *    e-mail and WhatsApp), sends due messages, retries failed ones and closes sends
 *    interrupted by a crash;
 *  - consultation reminder (checked every 15 minutes, runs once per IST day);
 *  - clean-up of old OTP send-counter rows (hourly).
 *
 * The website's hourly deletion of stale pending orders/bookings/transactions is
 * NOT here: it belongs to the commerce modules.
 */
export class MessagingScheduler {
  private timers: NodeJS.Timeout[] = [];

  public start(): void {
    if (this.timers.length) return;
    if (process.env.MESSAGING_SCHEDULER_ENABLED === 'false') {
      logger.info('[MessagingScheduler] Disabled by MESSAGING_SCHEDULER_ENABLED=false');
      return;
    }
    const { dispatchIntervalMs } = messagingEnv().outbox;
    logger.info({ dispatchIntervalMs }, '[MessagingScheduler] Starting outbox dispatch and messaging sweeps');

    this.every(dispatchIntervalMs, 'outbox dispatch', async () => {
      await outboxService.recoverStale();
      // Reports whose release time has passed are announced here (push, in-app) and their e-mail
      // and WhatsApp are queued already due, so `processDue` below sends them in this same run.
      // A failure here must not stop the outbox.
      try {
        await reportReleaseSweep.tick();
      } catch (err) {
        logger.error({ err: err instanceof Error ? err.message : String(err) }, '[MessagingScheduler] Report release sweep failed');
      }
      await outboxService.processDue();
    });
    this.every(REMINDER_INTERVAL_MS, 'consultation reminder', async () => {
      await consultationReminderSweep.tick();
    });
    this.every(CLEANUP_INTERVAL_MS, 'otp send-log clean-up', async () => {
      await otpSendLimiter.purgeOld();
    });
  }

  public stop(): void {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }

  private every(intervalMs: number, name: string, task: () => Promise<void>): void {
    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      try {
        await task();
      } catch (err) {
        logger.error({ task: name, err: err instanceof Error ? err.message : String(err) }, '[MessagingScheduler] Sweep failed');
      } finally {
        running = false;
      }
    };
    void run();
    const timer = setInterval(() => void run(), intervalMs);
    timer.unref?.();
    this.timers.push(timer);
  }
}

export const messagingScheduler = new MessagingScheduler();
