import { describe, it, expect } from 'vitest';
import {
  ATTEMPT_TIMEOUT_MS,
  classifyGenerationError,
  decideRetry,
  deliveryDeadline,
  finalFailureMessage,
  MAX_GENERATION_ATTEMPTS,
  retryBackoffMs,
} from '../../src/services/report-retry.policy';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const booked = new Date('2026-11-18T10:00:00Z');
const deadline = new Date('2026-11-19T10:00:00Z');

describe('report retry policy', () => {
  it('limits one attempt to 10 minutes of wall-clock time', () => {
    expect(ATTEMPT_TIMEOUT_MS).toBe(10 * MIN);
  });

  it('classifies input errors as permanent and generation problems as transient', () => {
    for (const code of ['BIRTH_DATA_INVALID', 'MISSING_PARTNER_PROFILE', 'PARTNER_PROFILE_NOT_FOUND', 'REPORT_TYPE_NOT_AVAILABLE', 'REPORT_DATA_UNAVAILABLE']) {
      expect(classifyGenerationError(code), code).toBe('permanent');
    }
    for (const code of ['GENERATION_INCOMPLETE', 'ATTEMPT_TIMEOUT', 'PDF_RENDER_FAILED', 'LLM_NOT_CONFIGURED', 'OBJECT_STORAGE_UPLOAD_FAILED', 'PIPELINE_ERROR', 'SOMETHING_NEW']) {
      expect(classifyGenerationError(code), code).toBe('transient');
    }
  });

  it('backs off 15m, 30m, 1h, 2h, then caps at 4h', () => {
    expect([1, 2, 3, 4, 5, 6, 12].map(retryBackoffMs)).toEqual([15 * MIN, 30 * MIN, HOUR, 2 * HOUR, 4 * HOUR, 4 * HOUR, 4 * HOUR]);
    expect(retryBackoffMs(0)).toBe(15 * MIN);
  });

  it('uses expectedDeliveryAt as the deadline, else booking + 24h', () => {
    expect(deliveryDeadline({ expectedDeliveryAt: deadline, bookedAt: new Date('2020-01-01T00:00:00Z') })).toEqual(deadline);
    expect(deliveryDeadline({ expectedDeliveryAt: null, bookedAt: booked })).toEqual(deadline);
  });

  it('reschedules a transient failure with backoff', () => {
    const now = new Date('2026-11-18T10:05:00Z');
    expect(decideRetry({ errorCode: 'GENERATION_INCOMPLETE', failedAttempts: 1, now, deadline })).toEqual({
      action: 'retry', retryAt: new Date(now.getTime() + 15 * MIN), failureClass: 'transient',
    });
    const third = decideRetry({ errorCode: 'ATTEMPT_TIMEOUT', failedAttempts: 3, now, deadline });
    expect(third.action === 'retry' && third.retryAt).toEqual(new Date(now.getTime() + HOUR));
  });

  it('never schedules a retry after the deadline (last attempt starts at the deadline)', () => {
    const now = new Date('2026-11-19T08:30:00Z');
    const d = decideRetry({ errorCode: 'GENERATION_INCOMPLETE', failedAttempts: 6, now, deadline });
    expect(d).toEqual({ action: 'retry', retryAt: deadline, failureClass: 'transient' });
  });

  it('fails a permanent error immediately, whatever the time and attempt count', () => {
    const d = decideRetry({ errorCode: 'BIRTH_DATA_INVALID', failedAttempts: 1, now: booked, deadline });
    expect(d).toEqual({ action: 'fail', reason: 'PERMANENT_ERROR', failureClass: 'permanent' });
  });

  it('fails once the deadline has passed', () => {
    const d = decideRetry({ errorCode: 'GENERATION_INCOMPLETE', failedAttempts: 2, now: deadline, deadline });
    expect(d).toEqual({ action: 'fail', reason: 'DEADLINE_PASSED', failureClass: 'transient' });
  });

  it('fails when the attempt cap is reached before the deadline', () => {
    const now = new Date('2026-11-18T12:00:00Z');
    expect(decideRetry({ errorCode: 'PDF_RENDER_FAILED', failedAttempts: MAX_GENERATION_ATTEMPTS, now, deadline }))
      .toEqual({ action: 'fail', reason: 'ATTEMPTS_EXHAUSTED', failureClass: 'transient' });
    expect(decideRetry({ errorCode: 'PDF_RENDER_FAILED', failedAttempts: 2, now, deadline, maxAttempts: 2 }).action).toBe('fail');
    expect(decideRetry({ errorCode: 'PDF_RENDER_FAILED', failedAttempts: MAX_GENERATION_ATTEMPTS - 1, now, deadline }).action).toBe('retry');
  });

  it('is deterministic: identical inputs give identical decisions', () => {
    const input = { errorCode: 'GENERATION_INCOMPLETE', failedAttempts: 4, now: new Date('2026-11-18T15:00:00Z'), deadline };
    expect(decideRetry(input)).toEqual(decideRetry({ ...input }));
  });

  it('writes clear customer-facing failure messages without internal error text', () => {
    const late = finalFailureMessage({ action: 'fail', reason: 'DEADLINE_PASSED', failureClass: 'transient' }, 'GENERATION_INCOMPLETE', 9);
    expect(late).toContain('delivery time');
    expect(late).toContain('9 attempts');
    expect(finalFailureMessage({ action: 'fail', reason: 'PERMANENT_ERROR', failureClass: 'permanent' }, 'MISSING_PARTNER_PROFILE', 1, 'Partner birth profile ID is required for this report.'))
      .toBe('Partner birth profile ID is required for this report.');
    expect(finalFailureMessage({ action: 'fail', reason: 'ATTEMPTS_EXHAUSTED', failureClass: 'transient' }, 'PDF_RENDER_FAILED', 12)).toContain('12 attempts');
  });
});
