/**
 * AvailabilityService with prisma substituted. No database connection.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  availabilitySetting: { upsert: vi.fn() },
  scheduleDay: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), updateMany: vi.fn() },
  scheduleBlockedSlot: { deleteMany: vi.fn(), createMany: vi.fn() },
  appointmentSlot: { findMany: vi.fn(), findFirst: vi.fn() },
  consultationBooking: { findMany: vi.fn(), findFirst: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('../../src/services/prisma.service', () => ({ prisma: mockPrisma }));

import { AvailabilityService, DEFAULT_AVAILABILITY } from '../../src/modules/availability/availability.service';

const settingsRow = { id: 'default', ...DEFAULT_AVAILABILITY };
// Tuesday 1 Dec 2026; "now" is Friday 20 Nov 2026, 10:00 IST.
const NOW = new Date('2026-11-20T04:30:00.000Z');
const DAY = '2026-12-01';
const offering = { title: 'General Consultation', durationMinutes: 30, responseDays: 4, unavailableDates: [] as string[] };

let service: AvailabilityService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new AvailabilityService();
  mockPrisma.availabilitySetting.upsert.mockResolvedValue(settingsRow);
  mockPrisma.scheduleDay.findUnique.mockResolvedValue(null);
  mockPrisma.appointmentSlot.findMany.mockResolvedValue([]);
  mockPrisma.appointmentSlot.findFirst.mockResolvedValue(null);
  mockPrisma.consultationBooking.findMany.mockResolvedValue([]);
  mockPrisma.consultationBooking.findFirst.mockResolvedValue(null);
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma));
});

describe('customer slot list', () => {
  it('lists the generated slots of an open day', async () => {
    const res = await service.listCustomerSlots(offering, DAY, NOW);
    expect(res.available).toBe(true);
    expect(res.slots).toHaveLength(14);
    expect(res.slots[0]).toEqual({ startTime: '11:00', endTime: '11:30' });
  });

  it('refuses a date inside the notice period without reading anything', async () => {
    const res = await service.listCustomerSlots(offering, '2026-11-23', NOW);
    expect(res.available).toBe(false);
    expect(res.message).toMatch(/Minimum booking notice/);
    expect(mockPrisma.availabilitySetting.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.appointmentSlot.findMany).not.toHaveBeenCalled();
  });

  it('refuses a weekly day off, a date beyond the horizon and a date blocked for the type', async () => {
    expect((await service.listCustomerSlots(offering, '2026-11-29', NOW)).message).toMatch(/Sunday/);
    expect((await service.listCustomerSlots(offering, '2027-03-01', NOW)).message).toMatch(/horizon/);
    const blockedForType = await service.listCustomerSlots({ ...offering, unavailableDates: [DAY] }, DAY, NOW);
    expect(blockedForType.slots).toEqual([]);
    expect(blockedForType.message).toMatch(/blocked for General Consultation/);
  });

  it('a blocked day has no slots', async () => {
    mockPrisma.scheduleDay.findUnique.mockResolvedValue({ isBlocked: true, blockedSlots: [] });
    const res = await service.listCustomerSlots(offering, DAY, NOW);
    expect(res.available).toBe(false);
    expect(res.slots).toEqual([]);
  });

  it('hides slots that overlap a blocked slot', async () => {
    mockPrisma.scheduleDay.findUnique.mockResolvedValue({
      isBlocked: false,
      blockedSlots: [{ startMinute: 11 * 60 + 15, endMinute: 11 * 60 + 45 }],
    });
    const starts = (await service.listCustomerSlots(offering, DAY, NOW)).slots.map((s) => s.startTime);
    expect(starts).not.toContain('11:00');
    expect(starts).not.toContain('11:30');
    expect(starts).toContain('12:00');
  });

  it('hides slots overlapping a booking of ANY consultation type, even a shorter one', async () => {
    // A 15-minute booking 11:15-11:30 of another type blocks the 30-minute 11:00 slot.
    mockPrisma.consultationBooking.findMany.mockResolvedValue([
      { startTime: '11:15', endTime: '11:30', status: 'CONFIRMED' },
    ]);
    const starts = (await service.listCustomerSlots(offering, DAY, NOW)).slots.map((s) => s.startTime);
    expect(starts).not.toContain('11:00');
    expect(starts).toContain('11:30');
    // The query itself must not filter by consultation type.
    const where = mockPrisma.consultationBooking.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('consultationId');
    expect(where).not.toHaveProperty('consultationTypeId');
    expect(where.deletedAt).toBeNull();
  });

  it('hides a slot another customer is paying for (live hold)', async () => {
    mockPrisma.appointmentSlot.findMany.mockResolvedValue([{ startTime: '15:00', endTime: '15:30', status: 'RESERVED' }]);
    const starts = (await service.listCustomerSlots(offering, DAY, NOW)).slots.map((s) => s.startTime);
    expect(starts).not.toContain('15:00');
    const where = mockPrisma.appointmentSlot.findMany.mock.calls[0][0].where;
    expect(where.OR).toContainEqual({ status: 'RESERVED', lockedUntil: { gt: NOW } });
  });

  it('never offers a slot that has already started', async () => {
    // 12:10 IST on the day itself, for a type with no notice period.
    const now = new Date('2026-12-01T06:40:00.000Z');
    const starts = (await service.listCustomerSlots({ ...offering, responseDays: 0 }, DAY, now)).slots.map((s) => s.startTime);
    expect(starts[0]).toBe('12:30');
  });
});

describe('customer booking validation', () => {
  const slot = { startMinute: 11 * 60, endMinute: 11 * 60 + 30 };

  it('accepts an offered slot', async () => {
    await expect(service.assertCustomerCanBook(offering, DAY, slot, NOW)).resolves.toBeUndefined();
  });

  it('rejects a slot that is not on the grid or has the wrong length', async () => {
    await expect(service.assertCustomerCanBook(offering, DAY, { startMinute: 665, endMinute: 695 }, NOW)).rejects.toThrow(/not offered/);
    await expect(service.assertCustomerCanBook(offering, DAY, { startMinute: 660, endMinute: 720 }, NOW)).rejects.toThrow(/not offered/);
    await expect(service.assertCustomerCanBook(offering, DAY, { startMinute: 14 * 60, endMinute: 14 * 60 + 30 }, NOW)).rejects.toThrow(/not offered/);
  });

  it('rejects the notice period, a blocked day and a blocked slot', async () => {
    await expect(service.assertCustomerCanBook(offering, '2026-11-21', slot, NOW)).rejects.toThrow(/Minimum booking notice/);
    mockPrisma.scheduleDay.findUnique.mockResolvedValue({ isBlocked: true, blockedSlots: [] });
    await expect(service.assertCustomerCanBook(offering, DAY, slot, NOW)).rejects.toThrow(/not available/);
    mockPrisma.scheduleDay.findUnique.mockResolvedValue({ isBlocked: false, blockedSlots: [{ startMinute: 660, endMinute: 690 }] });
    await expect(service.assertCustomerCanBook(offering, DAY, slot, NOW)).rejects.toThrow(/blocked/);
  });
});

describe('admin slot list', () => {
  it('shows every slot, marking booked, held and blocked ones', async () => {
    mockPrisma.scheduleDay.findUnique.mockResolvedValue({ isBlocked: false, blockedSlots: [{ startMinute: 720, endMinute: 750 }] });
    mockPrisma.appointmentSlot.findMany.mockResolvedValue([{ startTime: '11:30', endTime: '12:00', status: 'RESERVED' }]);
    mockPrisma.consultationBooking.findMany.mockResolvedValue([{ startTime: '11:00', endTime: '11:30', status: 'CONFIRMED' }]);
    const slots = await service.listAdminSlots(DAY, { durationMinutes: 30 }, NOW);
    expect(slots).toHaveLength(14);
    expect(slots[0]).toMatchObject({ slot: '11:00-11:30', status: 'booked', blocked: false });
    expect(slots[1]).toMatchObject({ slot: '11:30-12:00', status: 'held' });
    expect(slots[2]).toMatchObject({ slot: '12:00-12:30', status: 'available', blocked: true });
  });

  it('falls back to the global slot length when no consultation is given', async () => {
    const slots = await service.listAdminSlots(DAY, undefined, NOW);
    expect(slots[0].slot).toBe('11:00-11:30');
  });
});

describe('working hours and blocking', () => {
  it('rejects an end before the start and a break outside the window', async () => {
    await expect(service.setAvailability({ startTime: '18:00', endTime: '09:00', slotDuration: 30, gap: 0 })).rejects.toThrow(/End time/);
    await expect(
      service.setAvailability({ startTime: '09:00', endTime: '13:00', slotDuration: 30, gap: 0, breakStartTime: '14:00', breakEndTime: '15:00' })
    ).rejects.toThrow(/break/);
  });

  it('saves the website fields and keeps the others when they are not sent', async () => {
    await service.setAvailability({ startTime: '09:00', endTime: '18:00', slotDuration: 30, gap: 10 }, 'admin-1');
    const args = mockPrisma.availabilitySetting.upsert.mock.calls.find((c) => Object.keys(c[0].update).length > 0)![0];
    expect(args.update).toMatchObject({
      startMinute: 540,
      endMinute: 1080,
      slotDurationMinutes: 30,
      gapMinutes: 10,
      breakStartMinute: 840,
      breakEndMinute: 900,
      blockedWeekdays: [0],
      bookingHorizonDays: 60,
      updatedById: 'admin-1',
    });
  });

  it('blocks every day of a range and clears their blocked slots (website block-day)', async () => {
    mockPrisma.scheduleDay.upsert.mockImplementation(async ({ create }: { create: { date: Date } }) => ({ id: `d-${create.date.toISOString()}` }));
    const days = await service.blockRange('30-11-2026', '2026-12-02');
    expect(days.map((d) => d.date)).toEqual(['2026-11-30', '2026-12-01', '2026-12-02']);
    expect(mockPrisma.scheduleDay.upsert).toHaveBeenCalledTimes(3);
    expect(mockPrisma.scheduleDay.upsert.mock.calls[0][0].update).toEqual({ isBlocked: true });
    expect(mockPrisma.scheduleBlockedSlot.deleteMany).toHaveBeenCalledTimes(3);
  });

  it('blocked dates of a month use a real date range (website compared DD-MM-YYYY strings)', async () => {
    mockPrisma.scheduleDay.findMany.mockResolvedValue([{ date: new Date('2026-02-10T00:00:00.000Z') }]);
    expect(await service.getBlockedDates(2, 2026)).toEqual(['2026-02-10']);
    const where = mockPrisma.scheduleDay.findMany.mock.calls[0][0].where;
    expect(where.isBlocked).toBe(true);
    expect(where.date.gte.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(where.date.lte.toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  it('keeps the last known hours when the database cannot be read, unless forced', async () => {
    mockPrisma.availabilitySetting.upsert.mockRejectedValue(new Error('db down'));
    await expect(service.getSettings()).resolves.toEqual(DEFAULT_AVAILABILITY);
    await expect(service.getSettings({ force: true })).rejects.toThrow('db down');
  });
});
