/**
 * Retry-later policy for report generation.
 *
 * Reports are delivered one day after booking, so a transient failure
 * (LLM unavailable or timing out, an incomplete narrative, a PDF compile
 * glitch, an attempt running past its time limit) must not fail the report
 * for the customer. The attempt is rescheduled with backoff; topics that
 * already passed validation come from the topic cache, so retries are cheap.
 *
 * A report is marked FAILED only when:
 *   - the error is permanent (bad or missing input: retrying cannot help), or
 *   - the delivery deadline has passed, or
 *   - the maximum number of failed attempts is reached.
 *
 * Pure functions only: no database, no clock reads (callers pass `now`).
 */

/** Hard wall-clock limit for one generation attempt. */
export const ATTEMPT_TIMEOUT_MS = 10 * 60 * 1000;

/** Delay before the 1st, 2nd, 3rd… retry; the last value repeats (cap). */
export const RETRY_BACKOFF_MINUTES: readonly number[] = [15, 30, 60, 120, 240];

/** Failed attempts after which the report is marked FAILED even before the deadline. */
export const MAX_GENERATION_ATTEMPTS = 12;

/** Delivery window used when a report has no expectedDeliveryAt: booking + 24 h. */
export const DEFAULT_DELIVERY_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Errors that a retry cannot fix. Everything else is treated as transient and
 * bounded by the deadline and the attempt cap.
 */
export const PERMANENT_ERROR_CODES: ReadonlySet<string> = new Set([
  'BIRTH_DATA_INVALID',
  'BIRTH_PROFILE_NOT_FOUND',
  'MISSING_PARTNER_PROFILE',
  'PARTNER_PROFILE_NOT_FOUND',
  'REPORT_TYPE_NOT_SUPPORTED',
  'REPORT_TYPE_NOT_AVAILABLE',
  'REPORT_TYPE_MISMATCH',
  'REPORT_LANGUAGE_NOT_AVAILABLE',
  'REPORT_DATA_UNAVAILABLE',
]);

export type FailureClass = 'transient' | 'permanent';

export function classifyGenerationError(errorCode: string): FailureClass {
  return PERMANENT_ERROR_CODES.has(errorCode) ? 'permanent' : 'transient';
}

/** Backoff before retry number `failureNumber` (1 = first failure). */
export function retryBackoffMs(failureNumber: number): number {
  const i = Math.min(Math.max(failureNumber, 1), RETRY_BACKOFF_MINUTES.length) - 1;
  return RETRY_BACKOFF_MINUTES[i] * 60 * 1000;
}

/** The time by which the report must be delivered: expectedDeliveryAt, else booking (paid or created) + 24 h. */
export function deliveryDeadline(input: { expectedDeliveryAt?: Date | null; bookedAt: Date }): Date {
  return input.expectedDeliveryAt ?? new Date(input.bookedAt.getTime() + DEFAULT_DELIVERY_WINDOW_MS);
}

export interface RetryDecisionInput {
  errorCode: string;
  /** Failed attempts so far, including the one that just failed (≥ 1). */
  failedAttempts: number;
  now: Date;
  deadline: Date;
  maxAttempts?: number;
}

export type RetryDecision =
  | { action: 'retry'; retryAt: Date; failureClass: 'transient' }
  | { action: 'fail'; reason: 'PERMANENT_ERROR' | 'DEADLINE_PASSED' | 'ATTEMPTS_EXHAUSTED'; failureClass: FailureClass };

export function decideRetry(input: RetryDecisionInput): RetryDecision {
  const failureClass = classifyGenerationError(input.errorCode);
  if (failureClass === 'permanent') return { action: 'fail', reason: 'PERMANENT_ERROR', failureClass };
  if (input.now.getTime() >= input.deadline.getTime()) return { action: 'fail', reason: 'DEADLINE_PASSED', failureClass };
  if (input.failedAttempts >= (input.maxAttempts ?? MAX_GENERATION_ATTEMPTS)) {
    return { action: 'fail', reason: 'ATTEMPTS_EXHAUSTED', failureClass };
  }
  // Never schedule past the deadline: the last attempt may start at the deadline itself.
  const retryAt = new Date(Math.min(input.now.getTime() + retryBackoffMs(input.failedAttempts), input.deadline.getTime()));
  return { action: 'retry', retryAt, failureClass: 'transient' };
}

/** Customer-facing FAILED message for a decision to stop retrying (no internal error text). */
export function finalFailureMessage(decision: Extract<RetryDecision, { action: 'fail' }>, errorCode: string, failedAttempts: number, userMessage?: string): string {
  switch (decision.reason) {
    case 'PERMANENT_ERROR':
      return userMessage ?? 'This report cannot be prepared from the details on file. Please check the birth details and contact support.';
    case 'DEADLINE_PASSED':
      return `We could not prepare this report by its delivery time (${errorCode} after ${failedAttempts} attempt${failedAttempts === 1 ? '' : 's'}). Our team has been alerted and will contact you.`;
    case 'ATTEMPTS_EXHAUSTED':
      return `We could not prepare this report after ${failedAttempts} attempts (${errorCode}). Our team has been alerted and will contact you.`;
  }
}
