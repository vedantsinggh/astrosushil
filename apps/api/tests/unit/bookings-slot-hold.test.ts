/**
 * Double-booking protection (slot-hold.ts) with the transaction client substituted.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

vi.mock('../../src/services/prisma.service', () => ({ prisma: {} }));

import { claimSlot, isRangeTaken, releaseExpiredHolds, utcRangeOf } from '../../src/modules/bookings/slot-hold';
import { ConflictError } from '../../src/errors/app-error';

function makeTx() {
  return {
    $executeRaw: vi.fn().mockResolvedValue(1),
    appointmentSlot: {
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockResolvedValue({}),
    },
    consultationBooking: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}
type Tx = ReturnType<typeof makeTx>;
const asTx = (tx: Tx) => tx as unknown as Prisma.TransactionClient;

const NOW = new Date('2026-11-20T04:30:00.000Z');
const range = { startMinute: 11 * 60, endMinute: 11 * 60 + 30 };
let tx: Tx;

beforeEach(() => {
  tx = makeTx();
});

describe('claimSlot', () => {
  it('takes the calendar lock first, then releases expired holds, checks, and writes', async () => {
    const order: string[] = [];
    tx.$executeRaw.mockImplementation(async () => { order.push('lock'); return 1; });
    tx.consultationBooking.findMany.mockImplementation(async () => { order.push('expired'); return []; });
    tx.appointmentSlot.findFirst.mockImplementation(async () => { order.push('check'); return null; });
    tx.appointmentSlot.upsert.mockImplementation(async () => { order.push('write'); return {}; });

    const lockedUntil = new Date(NOW.getTime() + 15 * 60 * 1000);
    const utc = await claimSlot(asTx(tx), { bookingId: 'b1', date: '2026-12-01', range, status: 'RESERVED', lockedUntil, now: NOW });

    expect(order.indexOf('lock')).toBe(0);
    expect(order.indexOf('expired')).toBeLessThan(order.indexOf('check'));
    expect(order.indexOf('check')).toBeLessThan(order.indexOf('write'));
    expect(utc.startUtc.toISOString()).toBe('2026-12-01T05:30:00.000Z');
    expect(utc.endUtc.toISOString()).toBe('2026-12-01T06:00:00.000Z');

    const upsert = tx.appointmentSlot.upsert.mock.calls[0][0];
    expect(upsert.create).toMatchObject({ date: '2026-12-01', startTime: '11:00', endTime: '11:30', status: 'RESERVED', bookingId: 'b1', lockedUntil });
  });

  it('refuses a time overlapping a live hold or booking and writes nothing', async () => {
    tx.appointmentSlot.findFirst.mockResolvedValue({ id: 'other' });
    await expect(claimSlot(asTx(tx), { bookingId: 'b2', date: '2026-12-01', range, status: 'RESERVED', lockedUntil: NOW, now: NOW })).rejects.toBeInstanceOf(ConflictError);
    expect(tx.appointmentSlot.upsert).not.toHaveBeenCalled();
  });

  it('refuses when a booking without a slot row overlaps', async () => {
    tx.consultationBooking.findFirst.mockResolvedValue({ id: 'legacy' });
    await expect(claimSlot(asTx(tx), { bookingId: 'b2', date: '2026-12-01', range, status: 'BOOKED', now: NOW })).rejects.toBeInstanceOf(ConflictError);
  });

  it('turns a database constraint violation into a conflict (unique key or exclusion constraint)', async () => {
    tx.appointmentSlot.upsert.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' })
    );
    await expect(claimSlot(asTx(tx), { bookingId: 'b3', date: '2026-12-01', range, status: 'BOOKED', now: NOW })).rejects.toBeInstanceOf(ConflictError);

    tx.appointmentSlot.upsert.mockRejectedValueOnce(
      new Error('conflicting key value violates exclusion constraint "appointment_slots_no_overlap"')
    );
    await expect(claimSlot(asTx(tx), { bookingId: 'b3', date: '2026-12-01', range, status: 'BOOKED', now: NOW })).rejects.toBeInstanceOf(ConflictError);
  });

  it('passes other errors through', async () => {
    tx.appointmentSlot.upsert.mockRejectedValueOnce(new Error('connection lost'));
    await expect(claimSlot(asTx(tx), { bookingId: 'b3', date: '2026-12-01', range, status: 'BOOKED', now: NOW })).rejects.toThrow('connection lost');
  });

  it('a confirmed booking has no expiry on its slot and frees the slot it held before', async () => {
    await claimSlot(asTx(tx), { bookingId: 'b4', date: '2026-12-01', range, status: 'BOOKED', lockedUntil: NOW, now: NOW });
    expect(tx.appointmentSlot.upsert.mock.calls[0][0].update).toMatchObject({ status: 'BOOKED', lockedUntil: null, bookingId: 'b4' });
    expect(tx.appointmentSlot.updateMany).toHaveBeenCalledWith({
      where: { bookingId: 'b4' },
      data: { status: 'AVAILABLE', bookingId: null, lockedUntil: null },
    });
  });
});

describe('isRangeTaken', () => {
  it('checks overlap on the UTC range, ignores expired holds and the booking itself', async () => {
    const utc = utcRangeOf('2026-12-01', range);
    await isRangeTaken(asTx(tx), utc, NOW, 'self');

    const slotWhere = tx.appointmentSlot.findFirst.mock.calls[0][0].where;
    expect(slotWhere.startTimeUtc).toEqual({ lt: utc.endUtc });
    expect(slotWhere.endTimeUtc).toEqual({ gt: utc.startUtc });
    expect(slotWhere.AND[0].OR).toContainEqual({ status: 'RESERVED', lockedUntil: { gt: NOW } });
    expect(slotWhere.AND[1]).toEqual({ OR: [{ bookingId: null }, { bookingId: { not: 'self' } }] });

    const bookingWhere = tx.consultationBooking.findFirst.mock.calls[0][0].where;
    expect(bookingWhere.id).toEqual({ not: 'self' });
    expect(bookingWhere.deletedAt).toBeNull();
    expect(bookingWhere.OR).toContainEqual({ status: 'PENDING_PAYMENT', reservationExpiresAt: { gt: NOW } });
    // Any consultation type: one calendar.
    expect(bookingWhere).not.toHaveProperty('consultationId');
  });
});

describe('releaseExpiredHolds', () => {
  it('frees expired holds and cancels their unpaid bookings', async () => {
    tx.consultationBooking.findMany.mockResolvedValue([{ id: 'old1' }, { id: 'old2' }]);
    const released = await releaseExpiredHolds(asTx(tx), NOW);
    expect(released).toBe(2);
    expect(tx.consultationBooking.findMany.mock.calls[0][0].where).toMatchObject({
      status: 'PENDING_PAYMENT',
      reservationExpiresAt: { lte: NOW },
    });
    expect(tx.appointmentSlot.updateMany.mock.calls[0][0].data).toEqual({ status: 'AVAILABLE', bookingId: null, lockedUntil: null });
    expect(tx.consultationBooking.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['old1', 'old2'] }, status: 'PENDING_PAYMENT' },
      data: { status: 'CANCELLED', cancellationReason: 'RESERVATION_EXPIRED' },
    });
  });

  it('cancels nothing when no hold has expired', async () => {
    expect(await releaseExpiredHolds(asTx(tx), NOW)).toBe(0);
    expect(tx.consultationBooking.updateMany).not.toHaveBeenCalled();
  });
});
