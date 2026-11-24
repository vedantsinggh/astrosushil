/**
 * The one rule for when a finished report reaches the customer (owner decision 2026-11-24,
 * open-questions R1): a report is released `REPORT_SEND_DELAY_HOURS` (default 24) after it was
 * completed. Until then the customer sees it as still being prepared, with the time it will be
 * delivered; at that moment it becomes openable and every channel (push, in-app, e-mail,
 * WhatsApp) announces it. Staff always see the true state.
 *
 * A delay of 0 releases a report the moment it completes (the behaviour before this decision).
 *
 * Pure functions only; reports.service.ts and report-release.sweep.ts apply them.
 */
import { messagingEnv } from '../../services/messaging/config';

const HOUR_MS = 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * HOUR_MS;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Generation deadline used when a report row carries none: payment + 24 h (see report-retry.policy.ts). */
export const GENERATION_WINDOW_MS = 24 * HOUR_MS;

/**
 * What a customer is shown while a completed report waits for its release. These are values the
 * mobile app already displays (ReportStatus `PROCESSING`; stage `UPLOADING` = the last step of
 * its checklist, "Saving to your reports"). No new status or stage value is introduced.
 */
export const HELD_STATUS = 'PROCESSING';
export const HELD_STAGE = 'UPLOADING';
export const HELD_PROGRESS = 99;

/** The configured delay in milliseconds (`REPORT_SEND_DELAY_HOURS`, default 24, never negative). */
export function reportReleaseDelayMs(env: NodeJS.ProcessEnv = process.env): number {
  return Math.max(0, messagingEnv(env).reportSendDelayHours) * HOUR_MS;
}

export interface ReleasableReport {
  status?: string | null;
  completedAt?: Date | null;
}

/**
 * When a completed report becomes available to the customer; null while it is not completed.
 * A completed row without a completion time (rows older than that column) is available at once.
 */
export function reportAvailableAt(report: ReleasableReport, delayMs: number): Date | null {
  if (report.status !== 'COMPLETED') return null;
  if (!report.completedAt) return new Date(0);
  return new Date(report.completedAt.getTime() + delayMs);
}

/** True when the report is completed and its release time has passed. */
export function isReportReleased(report: ReleasableReport, now: Date, delayMs: number): boolean {
  const availableAt = reportAvailableAt(report, delayMs);
  return availableAt !== null && now.getTime() >= availableAt.getTime();
}

/** True when the report is completed but must not be shown to the customer yet. */
export function isReportHeld(report: ReleasableReport, now: Date, delayMs: number): boolean {
  return report.status === 'COMPLETED' && !isReportReleased(report, now, delayMs);
}

/**
 * The delivery time promised to the customer.
 *  - completed: the release time (completion + delay);
 *  - not completed: the generation deadline (`expectedDeliveryAt`, else payment + 24 h) plus the
 *    delay. With the defaults that is 48 hours after payment, which is what the purchase message
 *    says ("within the next 48 hours").
 * Null when there is nothing to base a promise on (an unpaid report with no deadline).
 */
export function customerDeliveryAt(
  report: ReleasableReport & { expectedDeliveryAt?: Date | null },
  paidAt: Date | null | undefined,
  delayMs: number,
  now: Date = new Date()
): Date | null {
  if (isReportHeld(report, now, delayMs)) {
    return reportAvailableAt(report, delayMs);
  }
  const generationDeadline = report.expectedDeliveryAt ?? (paidAt ? new Date(paidAt.getTime() + GENERATION_WINDOW_MS) : null);
  return generationDeadline ? new Date(generationDeadline.getTime() + delayMs) : null;
}

/** "25 Nov 2026, 6:30 pm IST". */
export function formatDeliveryIst(instant: Date): string {
  const ist = new Date(instant.getTime() + IST_OFFSET_MS);
  const hour24 = ist.getUTCHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minutes = String(ist.getUTCMinutes()).padStart(2, '0');
  return `${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]} ${ist.getUTCFullYear()}, ${hour12}:${minutes} ${hour24 < 12 ? 'am' : 'pm'} IST`;
}

/** The line shown under the progress bar while a report is held (the app prints `progressDetail`). */
export function heldProgressDetail(availableAt: Date): string {
  return `Your report will be delivered by ${formatDeliveryIst(availableAt)}`;
}

/**
 * Customer view of a report row embedded in another record (an order's `reports`). A held report
 * is shown as being prepared, with nothing that could open the file; any other row is returned
 * with only the release time added.
 */
export function customerReportRow<T extends Record<string, unknown> & ReleasableReport>(
  row: T,
  now: Date,
  delayMs: number
): T & { availableAt: Date | null } {
  const availableAt = reportAvailableAt(row, delayMs);
  if (!isReportHeld(row, now, delayMs) || !availableAt) return { ...row, availableAt };
  return {
    ...row,
    status: HELD_STATUS,
    stage: HELD_STAGE,
    progress: HELD_PROGRESS,
    progressDetail: heldProgressDetail(availableAt),
    completedAt: null,
    s3Url: null,
    storageKey: null,
    pdfUrl: null,
    pdfKey: null,
    fileName: null,
    fileSize: null,
    pageCount: null,
    availableAt,
  };
}
