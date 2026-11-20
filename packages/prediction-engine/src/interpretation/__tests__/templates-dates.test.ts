/**
 * Conclusion-text dates (audit F24): the IST (Asia/Kolkata, business timezone) calendar date in one
 * human format, "20 Nov 2026". Expected values are computed by hand: IST = UTC + 05:30.
 */
import { describe, expect, it } from 'vitest';
import { displayDate, periodText, spanText } from '../packs/career/templates';

describe('career pack dates', () => {
  it('displayDate gives the IST calendar date', () => {
    // Jupiter–Saturn Antardasha boundary of the golden chart: late on 19 Nov UTC = 20 Nov IST.
    expect(displayDate('2026-11-19T21:10:00.000Z')).toBe('20 Nov 2026');
    expect(displayDate('2026-11-19T18:29:59.000Z')).toBe('19 Nov 2026');
    expect(displayDate('2026-11-19T18:30:00.000Z')).toBe('20 Nov 2026');
    expect(displayDate('2027-06-03')).toBe('03 Jun 2027');
    expect(displayDate('2032-12-31T19:00:00.000Z')).toBe('01 Jan 2033');
  });

  it('period and span texts use it; the "until" decision still compares ISO dates', () => {
    expect(periodText('ad', 'the Jupiter–Saturn Antardasha', '2026-11-19T21:10:00.000Z', '2029-06-02T10:00:00.000Z', 22, 24, []))
      .toMatch(/\(20 Nov 2026 to 02 Jun 2029, ages 22–24\)/);
    expect(spanText('2026-11-20T00:00:00.000Z', '2027-06-03T05:00:00.000Z', '2026-11-20')).toBe('until 03 Jun 2027');
    expect(spanText('2027-06-03T05:00:00.000Z', '2027-10-20T05:00:00.000Z', '2026-11-20')).toBe('from 03 Jun 2027 to 20 Oct 2027');
  });
});
