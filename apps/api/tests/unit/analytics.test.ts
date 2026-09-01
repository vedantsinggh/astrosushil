import { describe, it, expect } from 'vitest';
import { parseAnalyticsDateRange, formatChange } from '../../src/modules/admin/analytics.service';

describe('Analytics Date Range Parsing & Format Helpers (Unit)', () => {
  it('should parse 7d period correctly', () => {
    const range = parseAnalyticsDateRange('7d');
    expect(range.periodLabel).toBe('7 Days');
    expect(range.endDate.getTime()).toBeGreaterThan(range.startDate.getTime());
    const durationDays = (range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(durationDays)).toBe(7);
  });

  it('should parse 30d period correctly', () => {
    const range = parseAnalyticsDateRange('30d');
    expect(range.periodLabel).toBe('30 Days');
    const durationDays = (range.endDate.getTime() - range.startDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(Math.round(durationDays)).toBe(30);
  });

  it('should parse custom date range correctly', () => {
    const startStr = '2026-08-01T00:00:00.000Z';
    const endStr = '2026-08-15T00:00:00.000Z';
    const range = parseAnalyticsDateRange('custom', startStr, endStr);
    expect(range.periodLabel).toContain('Custom');
    expect(range.startDate.toISOString()).toBe(startStr);
    expect(range.endDate.toISOString()).toBe(endStr);
  });

  it('should format positive percentage changes correctly', () => {
    const result = formatChange(1284, 1084);
    expect(result.changePercent).toBe(18.5);
    expect(result.text).toBe('+18.5%');
  });

  it('should format negative percentage changes correctly', () => {
    const result = formatChange(80, 100);
    expect(result.changePercent).toBe(-20);
    expect(result.text).toBe('-20%');
  });

  it('should return "No previous-period data" when previous period value is 0', () => {
    const result = formatChange(50, 0);
    expect(result.changePercent).toBeNull();
    expect(result.text).toBe('No previous-period data');
  });

  it('should return 0% when both current and previous period values are 0', () => {
    const result = formatChange(0, 0);
    expect(result.changePercent).toBe(0);
    expect(result.text).toBe('0.0%');
  });
});
