import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BUSINESS_TIMEZONE,
  calendarDaysBetween,
  isCalendarDate,
  istDateOf,
  istEndOfDay,
  istStartOfDay,
  istYearOf,
  parseDateBound,
} from '../../src/utils/business-time';
import { parseAnalyticsDateRange } from '../../src/modules/admin/analytics.service';
import { consultationsService } from '../../src/modules/consultations/consultations.service';
import { reportPlatform } from '@astro/report-engine';

describe('business time (IST, Asia/Kolkata)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses Asia/Kolkata as the business timezone', () => {
    expect(BUSINESS_TIMEZONE).toBe('Asia/Kolkata');
  });

  it('00:30 IST is already the next IST date although UTC is still the previous day', () => {
    // 2026-11-19T19:00Z = 2026-11-20 00:30 IST
    expect(istDateOf(new Date('2026-11-19T19:00:00.000Z'))).toBe('2026-11-20');
    // 2026-11-19T18:29:59Z = 2026-11-19 23:59:59 IST
    expect(istDateOf(new Date('2026-11-19T18:29:59.999Z'))).toBe('2026-11-19');
  });

  it('the reported order (22:52:22 UTC on 19 Nov) is 20 Nov in IST', () => {
    expect(istDateOf(new Date('2026-11-19T22:52:22.000Z'))).toBe('2026-11-20');
  });

  it('IST year flips at IST midnight on 1 January', () => {
    expect(istYearOf(new Date('2026-12-31T18:30:00.000Z'))).toBe(2027);
    expect(istYearOf(new Date('2026-12-31T18:29:59.000Z'))).toBe(2026);
  });

  it('IST day bounds', () => {
    expect(istStartOfDay('2026-11-20').toISOString()).toBe('2026-11-19T18:30:00.000Z');
    expect(istEndOfDay('2026-11-20').toISOString()).toBe('2026-11-20T18:29:59.999Z');
  });

  it('calendar day differences across months and years', () => {
    expect(calendarDaysBetween('2026-11-20', '2026-11-24')).toBe(4);
    expect(calendarDaysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(calendarDaysBetween('2026-11-20', '2026-11-19')).toBe(-1);
  });

  it('validates calendar dates', () => {
    expect(isCalendarDate('2026-11-20')).toBe(true);
    expect(isCalendarDate('2026-02-31')).toBe(false);
    expect(isCalendarDate('2026-11-20T00:00:00Z')).toBe(false);
    expect(() => istStartOfDay('20-11-2026')).toThrow(RangeError);
  });

  it('date-only filter bounds cover the whole IST day; ISO instants pass through', () => {
    expect(parseDateBound('2026-11-20', 'start').toISOString()).toBe('2026-11-19T18:30:00.000Z');
    expect(parseDateBound('2026-11-20', 'end').toISOString()).toBe('2026-11-20T18:29:59.999Z');
    expect(parseDateBound('2026-11-20T10:00:00.000Z', 'end').toISOString()).toBe('2026-11-20T10:00:00.000Z');
  });
});

describe('admin analytics uses IST days', () => {
  afterEach(() => vi.useRealTimers());

  it("'today' starts at midnight IST, not at the server's local midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-19T19:00:00.000Z')); // 00:30 IST on 20 Nov
    const range = parseAnalyticsDateRange('today');
    expect(range.startDate.toISOString()).toBe('2026-11-19T18:30:00.000Z');
    expect(range.periodLabel).toBe('Today');
  });

  it('custom YYYY-MM-DD range includes the whole end day in IST', () => {
    const range = parseAnalyticsDateRange('custom', '2026-11-01', '2026-11-20');
    expect(range.startDate.toISOString()).toBe('2026-10-31T18:30:00.000Z');
    expect(range.endDate.toISOString()).toBe('2026-11-20T18:29:59.999Z');
    expect(range.periodLabel).toBe('Custom (2026-11-01 to 2026-11-20)');
  });
});

describe('consultation notice window counts IST days', () => {
  afterEach(() => vi.useRealTimers());

  it('at 00:30 IST on 20 Nov, a 4-day notice offering cannot book 23 Nov', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-19T19:00:00.000Z')); // 00:30 IST, Fri 20 Nov
    const tier = consultationsService.getConsultationById('consult-urgent-audio');
    expect(tier.responseDays).toBe(4);
    // IST today is 20 Nov: 23 Nov is 3 days away (< 4). Counting from the UTC
    // date (19 Nov) would wrongly allow it.
    const res = await consultationsService.getAvailableSlots({ consultationId: 'consult-urgent-audio', date: '2026-11-23' });
    expect(res.available).toBe(false);
    expect(res.message).toMatch(/Minimum booking notice/);
  });

  it('a date exactly at the notice boundary passes the notice check', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-19T19:00:00.000Z'));
    // 29 Nov 2026 is a Sunday: past the notice window, then blocked as Sunday
    // (returns before any database access).
    const res = await consultationsService.getAvailableSlots({ consultationId: 'consult-urgent-audio', date: '2026-11-29' });
    expect(res.message).toMatch(/Sunday/);
  });

  it('rejects malformed dates', async () => {
    await expect(
      consultationsService.getAvailableSlots({ consultationId: 'consult-urgent-audio', date: '2026-02-31' })
    ).rejects.toThrow(/Invalid date/);
  });
});

describe('report "as of" date is the IST business date', () => {
  it('an order at 04:22 IST on 20 Nov is as of 20 Nov', () => {
    expect(reportPlatform.businessAsOfDate(new Date('2026-11-19T22:52:22.000Z')).toISOString()).toBe(
      '2026-11-20T00:00:00.000Z'
    );
    expect(reportPlatform.businessAsOfDate(new Date('2026-11-19T18:29:59.000Z')).toISOString()).toBe(
      '2026-11-19T00:00:00.000Z'
    );
  });
});
