/**
 * Announces a report to the customer at the moment it is released (report-release.ts): push,
 * in-app, e-mail and WhatsApp all leave together, `REPORT_SEND_DELAY_HOURS` after completion.
 *
 *  - `announceReportCompleted` is what the report worker calls when a report completes. With a
 *    delay of 0 it sends at once (the behaviour before the owner decision of 2026-11-24). With a
 *    delay it sends nothing: the report is not available yet.
 *  - `ReportReleaseSweep.tick` runs inside the worker's existing outbox dispatch sweep
 *    (messaging.scheduler.ts), just before the outbox is processed. It raises REPORT_READY for
 *    every report whose release time has passed and that has not been announced. Raising it
 *    creates the in-app notification, sends the push, and queues the e-mail and WhatsApp with
 *    notBefore = completion + delay, which is already due, so the same sweep run sends them.
 *
 * "Announced" is the in-app notification row (`report_ready:<reportId>` in its metadata), which
 * `notificationService.sendNotification` writes and checks; a report is therefore announced once.
 */
import { prisma } from '../../services/prisma.service';
import { logger } from '../../utils/logger';
import { notificationService } from '../notifications/notification.service';
import type { SendNotificationOptions } from '../notifications/notification.types';
import { reportReleaseDelayMs } from './report-release';

const DAY_MS = 24 * 60 * 60 * 1000;
/** With no delay the worker announces at completion; the sweep only picks up what that send missed. */
const IMMEDIATE_GRACE_MS = 5 * 60 * 1000;
/** Reports released longer ago than this are never announced late. */
const LOOKBACK_MS = 7 * DAY_MS;
const BATCH = 25;
/** Arbitrary constant key for pg_try_advisory_xact_lock: one sweep at a time across worker processes. */
const SWEEP_LOCK_KEY = 7241126001;

export interface AnnounceableReport {
  id: string;
  userId: string;
  reportType: string;
}

export function reportReadyNotification(report: AnnounceableReport): SendNotificationOptions {
  return {
    userId: report.userId,
    type: 'REPORT_READY',
    entityId: report.id,
    idempotencyKey: `report_ready:${report.id}`,
    route: 'OPEN_REPORT',
    templateData: { reportName: report.reportType, reportId: report.id },
  };
}

type Send = (options: SendNotificationOptions) => Promise<unknown>;

/**
 * Called by the report worker when a report completes. Returns true when the announcement was
 * sent now (no delay configured), false when it is left to the release sweep.
 */
export async function announceReportCompleted(
  report: AnnounceableReport,
  deps: { send?: Send; delayMs?: number } = {}
): Promise<boolean> {
  const delayMs = deps.delayMs ?? reportReleaseDelayMs();
  if (delayMs > 0) {
    logger.info({ reportId: report.id, delayHours: delayMs / 3_600_000 }, '[ReportRelease] Report completed; it is released and announced after the configured delay');
    return false;
  }
  const send = deps.send ?? ((options) => notificationService.sendNotification(options));
  await send(reportReadyNotification(report));
  return true;
}

export interface ReportReleaseSweepOptions {
  send?: Send;
  /** Reports due for their announcement, oldest first. Default: the database query below. */
  findDue?: (cutoff: Date, floor: Date, limit: number) => Promise<AnnounceableReport[]>;
  /** Runs `work` only if this process holds the sweep lock. Default: a PostgreSQL advisory lock. */
  withLock?: (work: () => Promise<void>) => Promise<void>;
  delayMs?: () => number;
  now?: () => Date;
}

const defaultFindDue = (cutoff: Date, floor: Date, limit: number): Promise<AnnounceableReport[]> =>
  prisma.$queryRaw<AnnounceableReport[]>`
    SELECT r.id, r."userId", r."reportType"::text AS "reportType"
    FROM "reports" r
    WHERE r.status = 'COMPLETED'::"ReportStatus"
      AND r."completedAt" IS NOT NULL
      AND r."completedAt" <= ${cutoff}
      AND r."completedAt" >= ${floor}
      AND NOT EXISTS (
        SELECT 1 FROM "notifications" n
        WHERE n."userId" = r."userId" AND n.type = 'REPORT_READY' AND n.metadata LIKE '%report_ready:' || r.id || '%'
      )
      AND (
        r."orderId" IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM "orders" o
          WHERE o.id = r."orderId" AND o.status IN ('REFUNDED'::"OrderStatus", 'CANCELLED'::"OrderStatus")
        )
      )
    ORDER BY r."completedAt" ASC
    LIMIT ${limit};
  `;

const defaultWithLock = async (work: () => Promise<void>): Promise<void> => {
  await prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(${SWEEP_LOCK_KEY}::bigint) AS locked;`;
      if (!rows[0]?.locked) return;
      await work();
    },
    { timeout: 120_000, maxWait: 5_000 }
  );
};

export class ReportReleaseSweep {
  constructor(private readonly options: ReportReleaseSweepOptions = {}) {}

  /** Announces every report whose release time has passed. Returns the number announced. */
  public async tick(): Promise<number> {
    const now = (this.options.now ?? (() => new Date()))();
    const delayMs = (this.options.delayMs ?? reportReleaseDelayMs)();
    const cutoff = new Date(now.getTime() - (delayMs > 0 ? delayMs : IMMEDIATE_GRACE_MS));
    const floor = new Date(cutoff.getTime() - LOOKBACK_MS);
    const send = this.options.send ?? ((options: SendNotificationOptions) => notificationService.sendNotification(options));
    const findDue = this.options.findDue ?? defaultFindDue;
    const withLock = this.options.withLock ?? defaultWithLock;

    let announced = 0;
    await withLock(async () => {
      const due = await findDue(cutoff, floor, BATCH);
      for (const report of due) {
        try {
          await send(reportReadyNotification(report));
          announced += 1;
        } catch (err) {
          // Left unannounced: the next run finds it again.
          logger.error({ reportId: report.id, err: err instanceof Error ? err.message : String(err) }, '[ReportRelease] Could not announce a released report');
        }
      }
    });
    if (announced > 0) logger.info({ announced }, '[ReportRelease] Released reports announced');
    return announced;
  }
}

export const reportReleaseSweep = new ReportReleaseSweep();
