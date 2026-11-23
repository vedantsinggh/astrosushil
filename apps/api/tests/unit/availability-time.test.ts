import { describe, expect, it } from 'vitest';
import {
  calendarDatesBetween,
  generateDaySlots,
  istInstant,
  normaliseCalendarDate,
  parseSlotInput,
  parseTimeOfDay,
  rangesOverlap,
  slotLabel,
  weekdayOf,
} from '../../src/modules/availability/availability.time';

const hours = { startMinute: 11 * 60, endMinute: 19 * 60, gapMinutes: 0, breakStartMinute: 14 * 60, breakEndMinute: 15 * 60 };

describe('slot generation (IST wall clock)', () => {
  it('reproduces the former hard-coded hours: 11:00-14:00 and 15:00-19:00', () => {
    const slots = generateDaySlots(hours, 30).map(slotLabel);
    expect(slots[0]).toBe('11:00-11:30');
    expect(slots).toContain('13:30-14:00');
    expect(slots).not.toContain('14:00-14:30');
    expect(slots).not.toContain('14:30-15:00');
    expect(slots).toContain('15:00-15:30');
    expect(slots[slots.length - 1]).toBe('18:30-19:00');
    expect(slots).toHaveLength(14);
  });

  it('website rule: slots step by duration + gap and must end inside the window', () => {
    const slots = generateDaySlots(
      { startMinute: 9 * 60, endMinute: 13 * 60, gapMinutes: 20, breakStartMinute: null, breakEndMinute: null },
      30
    ).map(slotLabel);
    expect(slots).toEqual(['09:00-09:30', '09:50-10:20', '10:40-11:10', '11:30-12:00', '12:20-12:50']);
  });

  it('uses the consultation duration, not the global slot length', () => {
    const slots = generateDaySlots(hours, 45).map(slotLabel);
    expect(slots.slice(0, 4)).toEqual(['11:00-11:45', '11:45-12:30', '12:30-13:15', '13:15-14:00']);
    expect(slots[4]).toBe('15:00-15:45');
  });

  it('a slot longer than the window yields nothing', () => {
    expect(
      generateDaySlots({ startMinute: 600, endMinute: 630, gapMinutes: 0, breakStartMinute: null, breakEndMinute: null }, 60)
    ).toEqual([]);
  });
});

describe('time parsing and overlap', () => {
  it('parses HH:mm, the website HH:mm-HH:mm label and objects', () => {
    expect(parseTimeOfDay('09:05')).toBe(545);
    expect(parseSlotInput('11:00', 30)).toEqual({ startMinute: 660, endMinute: 690 });
    expect(parseSlotInput('11:00 - 11:45', 30)).toEqual({ startMinute: 660, endMinute: 705 });
    expect(parseSlotInput({ startTime: '15:00', endTime: '15:30' }, 15)).toEqual({ startMinute: 900, endMinute: 930 });
  });

  it('rejects malformed times and inverted slots', () => {
    expect(() => parseTimeOfDay('25:00')).toThrow();
    expect(() => parseTimeOfDay('11:60')).toThrow();
    expect(() => parseTimeOfDay('abc')).toThrow();
    expect(() => parseSlotInput('12:00-11:00', 30)).toThrow();
    expect(() => parseSlotInput('23:50', 30)).toThrow();
  });

  it('overlap is half-open: touching slots do not overlap, partial overlaps do', () => {
    const a = { startMinute: 660, endMinute: 690 };
    expect(rangesOverlap(a, { startMinute: 690, endMinute: 720 })).toBe(false);
    expect(rangesOverlap(a, { startMinute: 675, endMinute: 705 })).toBe(true);
    expect(rangesOverlap(a, { startMinute: 660, endMinute: 675 })).toBe(true);
    expect(rangesOverlap(a, { startMinute: 600, endMinute: 660 })).toBe(false);
  });
});

describe('dates', () => {
  it('IST wall clock converts to the right UTC instant (fixed +05:30)', () => {
    expect(istInstant('2026-12-01', 11 * 60).toISOString()).toBe('2026-12-01T05:30:00.000Z');
    // 02:00 IST is still the previous day in UTC.
    expect(istInstant('2026-12-01', 120).toISOString()).toBe('2026-11-30T20:30:00.000Z');
  });

  it('accepts the website DD-MM-YYYY format and rejects impossible dates', () => {
    expect(normaliseCalendarDate('25-12-2026')).toBe('2026-12-25');
    expect(normaliseCalendarDate('2026-12-25')).toBe('2026-12-25');
    expect(() => normaliseCalendarDate('2026-02-31')).toThrow(/Invalid date/);
    expect(() => normaliseCalendarDate('31-02-2026')).toThrow(/Invalid date/);
  });

  it('expands a range across a month boundary in either order', () => {
    expect(calendarDatesBetween('2026-11-29', '2026-12-02')).toEqual(['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02']);
    expect(calendarDatesBetween('2026-12-02', '2026-12-01')).toEqual(['2026-12-01', '2026-12-02']);
  });

  it('weekday of a calendar date', () => {
    expect(weekdayOf('2026-11-29')).toBe(0); // Sunday
    expect(weekdayOf('2026-11-30')).toBe(1);
  });
});
