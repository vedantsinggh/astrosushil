/**
 * Staff booking operations, reminders and invoice data. prisma, notifications and the
 * customer-flow service are substituted; nothing external is called.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const prisma = {
    user: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    consultationBooking: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    consultationType: { findMany: vi.fn(), count: vi.fn() },
    appointmentSlot: { findFirst: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() },
    bookingAdminNote: { create: vi.fn() },
    order: { create: vi.fn(), update: vi.fn() },
    orderItem: { updateMany: vi.fn() },
    paymentTransaction: { updateMany: vi.fn() },
    fulfillmentUnit: { findMany: vi.fn() },
    invoice: { findUnique: vi.fn() },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  return {
    prisma,
    sendNotification: vi.fn(),
    bookingConfirmed: vi.fn(),
    bookingUpgraded: vi.fn(),
    rescheduleBooking: vi.fn(),
    settleOrderPaid: vi.fn(),
    createFulfillmentUnitsForOrder: vi.fn(),
    reconcileFulfillmentUnit: vi.fn(),
  };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: mocks.prisma }));
vi.mock('../../src/modules/notifications/notification.service', () => ({
  notificationService: { sendNotification: mocks.sendNotification },
}));
vi.mock('../../src/modules/notifications/notification.events', () => ({
  notificationEvents: { bookingConfirmed: mocks.bookingConfirmed, bookingUpgraded: mocks.bookingUpgraded },
  toWebsiteDate: (d: string) => d.split('-').reverse().join('-'),
}));
vi.mock('../../src/modules/commerce/money/settlement', () => ({ settleOrderPaid: mocks.settleOrderPaid }));
vi.mock('../../src/modules/fulfillment/fulfillment.service', () => ({
  fulfillmentService: {
    createFulfillmentUnitsForOrder: mocks.createFulfillmentUnitsForOrder,
    reconcileFulfillmentUnit: mocks.reconcileFulfillmentUnit,
  },
}));
vi.mock('../../src/modules/consultations/consultations.service', () => ({
  consultationsService: { rescheduleBooking: mocks.rescheduleBooking },
}));

import { BookingsService, toCsv } from '../../src/modules/bookings/bookings.service';
import { consultationTypesService } from '../../src/modules/consultations/consultation-types.service';
import { manualBookingSchema } from '../../src/modules/bookings/bookings.schemas';
import { ConflictError, NotFoundError, ValidationError } from '../../src/errors/app-error';

const { prisma } = mocks;
const admin = { id: 'admin-1', email: 'staff@example.com' };
const created = new Date('2026-11-01T00:00:00.000Z');

const typeRows = [
  {
    id: 'type-gen', legacyId: null, title: 'General Consultation', kind: 'NORMAL', description: null, includes: ['Chart reading'],
    durationMinutes: 30, responseDays: 15, priceLabel: null, note: null, isActive: true, deletedAt: null, createdAt: created, updatedAt: created,
    blockedDates: [],
    modes: [
      { id: 'm1', typeId: 'type-gen', mode: 'AUDIO', catalogId: 'consult-general-audio', pricePaise: 1000000, gstEnabled: true, gstRateBasisPoints: 1800, gstType: 'INCLUSIVE', isActive: true },
      { id: 'm2', typeId: 'type-gen', mode: 'VIDEO', catalogId: 'consult-general-video', pricePaise: 1500000, gstEnabled: true, gstRateBasisPoints: 1800, gstType: 'EXCLUSIVE', isActive: true },
    ],
  },
  {
    id: 'type-long', legacyId: null, title: 'Deep Dive', kind: 'SPECIAL', description: null, includes: [],
    durationMinutes: 60, responseDays: 7, priceLabel: null, note: null, isActive: true, deletedAt: null, createdAt: created, updatedAt: created,
    blockedDates: [],
    modes: [
      { id: 'm3', typeId: 'type-long', mode: 'VIDEO', catalogId: 'consult-deep-dive-video', pricePaise: 3000000, gstEnabled: true, gstRateBasisPoints: 1800, gstType: 'INCLUSIVE', isActive: true },
    ],
  },
];

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bk-1', userId: 'user-1', orderId: null, consultationId: 'consult-general-audio', consultationTypeId: 'type-gen',
    title: 'General Consultation', mode: 'AUDIO', durationMinutes: 30, date: '2026-12-01', startTime: '11:00', endTime: '11:30',
    slotStartTimeUtc: new Date('2026-12-01T05:30:00.000Z'), slotEndTimeUtc: new Date('2026-12-01T06:00:00.000Z'),
    status: 'CONFIRMED', customerName: 'Asha', customerPhone: '+919876543210', customerEmail: null, meetingLink: null,
    pricePaise: 1000000, discountType: null, discountValue: null, discountPaise: 0, gstRateBasisPoints: 1800, gstType: 'INCLUSIVE',
    taxablePaise: 847458, gstPaise: 152542, amountPaise: 1000000, paidCurrency: null, paidAmountMinor: null, exchangeRate: null,
    priceLabel: null, note: null, invoiceNumber: null, paymentMethod: 'MANUAL', confirmedAt: created, createdAt: created,
    reminderSentAt: null, deletedAt: null,
    user: { id: 'user-1', fullName: 'Asha', phoneNumber: '+919876543210', email: null },
    consultationType: { id: 'type-gen', title: 'General Consultation', durationMinutes: 30, kind: 'NORMAL' },
    order: null, birthProfile: null, adminNotes: [],
    ...overrides,
  };
}

let service: BookingsService;

beforeEach(async () => {
  vi.clearAllMocks();
  service = new BookingsService();
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
  prisma.$executeRaw.mockResolvedValue(1);
  prisma.consultationType.count.mockResolvedValue(2);
  prisma.consultationType.findMany.mockResolvedValue(typeRows);
  prisma.user.findUnique.mockResolvedValue({ id: 'user-1', fullName: 'Asha', phoneNumber: '+919876543210', email: null });
  prisma.user.findFirst.mockResolvedValue(null);
  prisma.appointmentSlot.findFirst.mockResolvedValue(null);
  prisma.appointmentSlot.updateMany.mockResolvedValue({ count: 0 });
  prisma.appointmentSlot.upsert.mockResolvedValue({});
  prisma.consultationBooking.findMany.mockResolvedValue([]);
  prisma.consultationBooking.findFirst.mockResolvedValue(null);
  prisma.consultationBooking.create.mockResolvedValue({ id: 'bk-1' });
  prisma.consultationBooking.findUnique.mockResolvedValue(bookingRow());
  prisma.consultationBooking.updateMany.mockResolvedValue({ count: 1 });
  prisma.bookingAdminNote.create.mockResolvedValue({ id: 'note-1' });
  prisma.order.create.mockResolvedValue({ id: 'order-1' });
  prisma.fulfillmentUnit.findMany.mockResolvedValue([{ id: 'unit-1' }]);
  prisma.invoice.findUnique.mockResolvedValue(null);
  mocks.settleOrderPaid.mockResolvedValue({ transactionId: 'txn-1', invoice: { number: 'INV-AS/101', status: 'ALLOCATED' } });
  mocks.sendNotification.mockResolvedValue({});
  mocks.bookingConfirmed.mockResolvedValue({});
  mocks.bookingUpgraded.mockResolvedValue({});
  await consultationTypesService.refresh({ force: true });
});

describe('manual booking', () => {
  it('books for an existing customer, confirmed and paid manually, with the slot taken', async () => {
    const { booking, createdUser } = await service.createManual(
      { consultationId: 'type-gen', mode: 'AUDIO', date: '2026-12-01', slot: '11:00-11:30', userId: 'user-1' },
      admin
    );
    expect(createdUser).toBe(false);
    expect(booking.id).toBe('bk-1');
    const data = prisma.consultationBooking.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: 'user-1', consultationId: 'consult-general-audio', consultationTypeId: 'type-gen', status: 'CONFIRMED',
      source: 'ADMIN', paymentMethod: 'MANUAL', date: '2026-12-01', startTime: '11:00', endTime: '11:30',
      pricePaise: 1000000, discountPaise: 0, amountPaise: 1000000, gstPaise: 152542, createdByAdminId: 'admin-1',
    });
    expect(data.slotStartTimeUtc.toISOString()).toBe('2026-12-01T05:30:00.000Z');
    expect(prisma.appointmentSlot.upsert.mock.calls[0][0].create).toMatchObject({ status: 'BOOKED', bookingId: 'bk-1' });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('creates a new customer WITHOUT any password (OTP login only)', async () => {
    prisma.user.create.mockResolvedValue({ id: 'user-new', fullName: 'Ravi', phoneNumber: '+919812345678', email: null });
    const { createdUser } = await service.createManual(
      { consultationId: 'consult-general-audio', date: '2026-12-01', slot: '12:00', name: ' Ravi ', phone: '98123 45678' },
      admin
    );
    expect(createdUser).toBe(true);
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data).toEqual({ fullName: 'Ravi', phoneNumber: '+919812345678', email: null, role: 'USER' });
    expect(data).not.toHaveProperty('passwordHash');
    expect(data).not.toHaveProperty('password');
  });

  it('refuses a new customer whose phone or e-mail already has an account', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(
      service.createManual({ consultationId: 'consult-general-audio', date: '2026-12-01', slot: '12:00', name: 'Ravi', phone: '9812345678' }, admin)
    ).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.consultationBooking.create).not.toHaveBeenCalled();
  });

  it('applies a percentage discount before GST; exclusive GST is added on top', async () => {
    await service.createManual(
      { consultationId: 'type-gen', mode: 'VIDEO', date: '2026-12-01', slot: '15:00', userId: 'user-1', discountType: 'PERCENTAGE', discountValue: 1000, note: ' VIP ' },
      admin
    );
    const data = prisma.consultationBooking.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      pricePaise: 1500000, discountType: 'PERCENTAGE', discountValue: 1000, discountPaise: 150000,
      taxablePaise: 1350000, gstPaise: 243000, amountPaise: 1593000, gstType: 'EXCLUSIVE', note: 'VIP',
    });
  });

  it('a flat discount cannot exceed the price', async () => {
    await service.createManual(
      { consultationId: 'type-gen', mode: 'AUDIO', date: '2026-12-01', slot: '15:00', userId: 'user-1', discountType: 'FLAT', discountValue: 99999999 },
      admin
    );
    expect(prisma.consultationBooking.create.mock.calls[0][0].data).toMatchObject({ discountPaise: 1000000, amountPaise: 0 });
  });

  it('ignores blocked days and the notice period (no availability lookup), but not another booking', async () => {
    // 2026-11-29 is a Sunday inside every notice period: staff may still book it.
    prisma.consultationBooking.findUnique.mockResolvedValue(bookingRow({ date: '2026-11-29' }));
    await expect(
      service.createManual({ consultationId: 'type-gen', mode: 'AUDIO', date: '2026-11-29', slot: '09:00', userId: 'user-1' }, admin)
    ).resolves.toBeTruthy();

    prisma.appointmentSlot.findFirst.mockResolvedValue({ id: 'taken' });
    await expect(
      service.createManual({ consultationId: 'type-gen', mode: 'AUDIO', date: '2026-11-29', slot: '09:00', userId: 'user-1' }, admin)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('is recorded as a manual payment: a paid MANUAL order, settled in the same transaction', async () => {
    await service.createManual(
      { consultationId: 'type-gen', mode: 'VIDEO', date: '2026-12-01', slot: '11:00', userId: 'user-1', discountType: 'FLAT', discountValue: 500000 },
      admin
    );
    const order = prisma.order.create.mock.calls[0][0].data;
    expect(order).toMatchObject({
      userId: 'user-1', razorpayOrderId: 'manual_bk-1', paymentMethod: 'MANUAL', status: 'PAID', paymentStatus: 'CAPTURED',
      amount: 1180000, subtotal: 1000000, taxAmount: 180000, discountAmount: 500000, currency: 'INR',
    });
    expect(order.paidAt).toBeInstanceOf(Date);
    expect(order.items.create[0]).toMatchObject({
      itemType: 'CONSULTATION', catalogId: 'consult-general-video', unitPrice: 1500000, taxRate: 1800,
      taxAmount: 180000, taxInclusive: false, totalAmount: 1180000, fulfillmentType: 'SERVICE',
    });
    // Ledger row and invoice number come from the money module, inside the transaction.
    expect(mocks.settleOrderPaid).toHaveBeenCalledWith(prisma, 'order-1', {}, { customerName: 'Asha' });
    expect(prisma.consultationBooking.update).toHaveBeenCalledWith({
      where: { id: 'bk-1' },
      data: { orderId: 'order-1', invoiceNumber: 'INV-AS/101', fulfillmentUnitId: 'unit-1' },
    });
    expect(mocks.createFulfillmentUnitsForOrder).toHaveBeenCalledWith('order-1', prisma);
  });

  it('a settlement failure fails the whole booking (nothing is half-recorded)', async () => {
    mocks.settleOrderPaid.mockRejectedValue(new Error('counter not initialised'));
    await expect(
      service.createManual({ consultationId: 'type-gen', mode: 'AUDIO', date: '2026-12-01', slot: '11:00', userId: 'user-1' }, admin)
    ).rejects.toThrow('counter not initialised');
    expect(mocks.bookingConfirmed).not.toHaveBeenCalled();
  });

  it('messages the customer once: push/in-app without the bridge, website channels with the amount', async () => {
    await service.createManual({ consultationId: 'type-gen', mode: 'AUDIO', date: '2026-12-01', slot: '11:00', userId: 'user-1' }, admin);
    expect(mocks.sendNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'BOOKING_CONFIRMED', websiteChannels: false }));
    expect(mocks.bookingConfirmed).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 'bk-1', amountMinor: 1000000, date: '01-12-2026', slot: '11:00-11:30', mode: 'audio', includes: ['Chart reading'] })
    );
  });

  it('a failing message does not undo the booking', async () => {
    mocks.bookingConfirmed.mockRejectedValue(new Error('provider down'));
    mocks.sendNotification.mockRejectedValue(new Error('push down'));
    await expect(
      service.createManual({ consultationId: 'type-gen', mode: 'AUDIO', date: '2026-12-01', slot: '11:00', userId: 'user-1' }, admin)
    ).resolves.toBeTruthy();
  });

  it('schema: needs a customer, never accepts a price, caps a percentage at 100', () => {
    const base = { consultationId: 'type-gen', date: '2026-12-01', slot: '11:00' };
    expect(() => manualBookingSchema.parse(base)).toThrow();
    expect(() => manualBookingSchema.parse({ ...base, name: 'Ravi' })).toThrow();
    expect(() => manualBookingSchema.parse({ ...base, userId: '7b0e7a54-3a5e-4f0b-9d1f-0f6f2f1f9a11', amountPaise: 1 })).toThrow();
    expect(() => manualBookingSchema.parse({ ...base, name: 'Ravi', phone: '9812345678', discountType: 'PERCENTAGE', discountValue: 10001 })).toThrow();
    expect(manualBookingSchema.parse({ ...base, name: 'Ravi', phone: '9812345678', mode: 'in_person' }).mode).toBe('IN_PERSON');
  });
});

describe('reschedule', () => {
  it('moves the booking through the shared calendar rules as staff and logs the reason', async () => {
    const result = await service.reschedule('bk-1', { date: '05-12-2026', slot: '16:00-16:30', adminNote: ' customer travelling ' }, admin);
    expect(mocks.rescheduleBooking).toHaveBeenCalledWith('admin-1', 'bk-1', { newDate: '2026-12-05', newSlot: { startTime: '16:00', endTime: '16:30' } }, true);
    expect(prisma.bookingAdminNote.create.mock.calls[0][0].data).toMatchObject({
      action: 'RESCHEDULE', note: 'customer travelling', addedById: 'admin-1', addedByName: 'Asha',
      changes: { from: { date: '2026-12-01', slot: '11:00-11:30' }, to: { date: '2026-12-05', slot: '16:00-16:30' } },
    });
    expect(result.oldBooking).toEqual({ date: '2026-12-01', slot: '11:00-11:30' });
  });

  it('refuses the same slot and a deleted booking', async () => {
    await expect(service.reschedule('bk-1', { date: '2026-12-01', slot: '11:00' }, admin)).rejects.toThrow(/different slot/);
    prisma.consultationBooking.findUnique.mockResolvedValue(bookingRow({ deletedAt: new Date() }));
    await expect(service.reschedule('bk-1', { date: '2026-12-02', slot: '11:00' }, admin)).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.rescheduleBooking).not.toHaveBeenCalled();
  });
});

describe('change plan', () => {
  it('re-prices at the new plan, drops the old discount and announces the upgrade once per change', async () => {
    prisma.consultationBooking.findUnique.mockResolvedValue(
      bookingRow({ orderId: 'order-1', discountType: 'FLAT', discountValue: 100000, discountPaise: 100000, amountPaise: 900000 })
    );
    await service.changePlan('bk-1', { consultationId: 'type-gen', mode: 'VIDEO', adminNote: 'upgrade' }, admin);
    expect(prisma.consultationBooking.update.mock.calls[0][0].data).toMatchObject({
      consultationId: 'consult-general-video', mode: 'VIDEO', pricePaise: 1500000, discountPaise: 0, discountType: null,
      gstType: 'EXCLUSIVE', gstPaise: 270000, amountPaise: 1770000, endTime: '11:30',
    });
    // Same duration: the slot is not touched.
    expect(prisma.appointmentSlot.upsert).not.toHaveBeenCalled();
    // The order, its line and the ledger row are re-stated, as the website re-states its transaction.
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { amount: 1770000, subtotal: 1500000, taxAmount: 270000, discountAmount: 0 },
    });
    expect(prisma.orderItem.updateMany.mock.calls[0][0].data).toMatchObject({ catalogId: 'consult-general-video', unitPrice: 1500000, taxInclusive: false, totalAmount: 1770000 });
    expect(prisma.paymentTransaction.updateMany).toHaveBeenCalledWith({
      where: { orderId: 'order-1' },
      data: { amountMinor: 1770000, baseAmountPaise: 1770000, subtotalPaise: 1500000, taxPaise: 270000, taxRateBp: 1800, taxInclusive: false, discountPaise: 0 },
    });
    expect(mocks.bookingUpgraded).toHaveBeenCalledWith(expect.objectContaining({ bookingId: 'bk-1', changeId: 'note-1' }));
    expect(prisma.bookingAdminNote.create.mock.calls[0][0].data).toMatchObject({ action: 'PLAN_CHANGE', note: 'upgrade' });
  });

  it('a longer plan must fit: the longer slot is claimed, and an overlap is refused', async () => {
    await service.changePlan('bk-1', { consultationId: 'type-long' }, admin);
    expect(prisma.appointmentSlot.upsert.mock.calls[0][0].update).toMatchObject({ endTime: '12:00', status: 'BOOKED' });
    expect(prisma.consultationBooking.update.mock.calls[0][0].data).toMatchObject({ endTime: '12:00', durationMinutes: 60 });

    prisma.consultationBooking.update.mockClear();
    prisma.appointmentSlot.findFirst.mockResolvedValue({ id: 'next-booking' });
    await expect(service.changePlan('bk-1', { consultationId: 'type-long' }, admin)).rejects.toThrow(/Reschedule the booking first/);
    expect(prisma.consultationBooking.update).not.toHaveBeenCalled();
  });

  it('only a paid, live booking can change plan', async () => {
    prisma.consultationBooking.findUnique.mockResolvedValue(bookingRow({ status: 'PENDING_PAYMENT' }));
    await expect(service.changePlan('bk-1', { consultationId: 'type-long' }, admin)).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('delete (soft, as on the website)', () => {
  it('marks the booking deleted, frees its slot and logs who did it', async () => {
    prisma.consultationBooking.findUnique
      .mockResolvedValueOnce({ id: 'bk-1', deletedAt: null })
      .mockResolvedValue(bookingRow({ deletedAt: new Date() }));
    await service.softDelete('bk-1', admin);
    const update = prisma.consultationBooking.update.mock.calls[0][0];
    expect(update.data.deletedAt).toBeInstanceOf(Date);
    expect(update.data.deletedById).toBe('admin-1');
    expect(update.data).not.toHaveProperty('status');
    expect(prisma.appointmentSlot.updateMany).toHaveBeenCalledWith({
      where: { bookingId: 'bk-1' },
      data: { status: 'AVAILABLE', bookingId: null, lockedUntil: null },
    });
    expect(prisma.bookingAdminNote.create.mock.calls[0][0].data.action).toBe('DELETE');
  });

  it('refuses a second delete and an unknown booking', async () => {
    prisma.consultationBooking.findUnique.mockResolvedValueOnce({ id: 'bk-1', deletedAt: new Date() });
    await expect(service.softDelete('bk-1', admin)).rejects.toThrow(/already deleted/);
    prisma.consultationBooking.findUnique.mockResolvedValueOnce(null);
    await expect(service.softDelete('nope', admin)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('list and export', () => {
  const NOW = new Date('2026-11-20T04:30:00.000Z');

  it('lists paid, non-deleted bookings; tabs split on the slot end; search covers name, phone and e-mail', async () => {
    prisma.consultationBooking.findMany.mockResolvedValue([bookingRow()]);
    prisma.consultationBooking.count.mockResolvedValue(1);
    const result = await service.list({ tab: 'upcoming', search: 'asha', consultationTypeId: 'type-gen', fromDate: '2026-11-01', toDate: '2026-11-30', date: '2026-12-01' }, NOW);
    const where = prisma.consultationBooking.findMany.mock.calls[0][0].where;
    expect(where.deletedAt).toBeNull();
    expect(where.status).toEqual({ in: ['CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW'] });
    expect(where.slotEndTimeUtc).toEqual({ gte: NOW });
    expect(where.consultationTypeId).toBe('type-gen');
    // Created-on range is whole IST days.
    expect(where.createdAt.gte.toISOString()).toBe('2026-10-31T18:30:00.000Z');
    expect(where.createdAt.lte.toISOString()).toBe('2026-11-30T18:29:59.999Z');
    expect(where.AND[0].slotStartTimeUtc.gte.toISOString()).toBe('2026-11-30T18:30:00.000Z');
    expect(JSON.stringify(where.AND[1])).toContain('"phoneNumber"');
    expect(result.items[0]).toMatchObject({ slot: '11:00-11:30', timing: 'upcoming', customer: { id: 'user-1' } });
    expect(result.counts).toEqual({ upcoming: 1, past: 1 });
  });

  it('export has the website columns and covers both tabs', async () => {
    prisma.consultationBooking.findMany.mockResolvedValue([
      bookingRow({ note: '=cmd()' }),
      bookingRow({ id: 'bk-2', paidCurrency: 'USD', paidAmountMinor: 12050, slotEndTimeUtc: new Date('2026-01-01T00:00:00.000Z') }),
    ]);
    const data = await service.exportRows({}, NOW);
    expect(prisma.consultationBooking.findMany.mock.calls[0][0].where).not.toHaveProperty('slotEndTimeUtc');
    expect(data.headers).toEqual(['Customer Name', 'Email', 'Phone', 'Consultation Plan', 'Mode', 'Date', 'Slot', 'Duration (min)', 'Amount', 'Currency', 'Status', 'Timing', 'Note']);
    expect(data.rows[0]).toEqual(['Asha', '', '+919876543210', 'General Consultation', 'AUDIO', '2026-12-01', '11:00-11:30', 30, '10000.00', 'INR', 'CONFIRMED', 'Upcoming', '=cmd()']);
    expect(data.rows[1].slice(8, 12)).toEqual(['120.50', 'USD', 'CONFIRMED', 'Past']);
    // A cell that would run as a formula is neutralised in the CSV.
    const csv = toCsv(data.headers, data.rows);
    expect(csv).toContain("'=cmd()");
    expect(csv).toContain("'+919876543210");
  });
});

describe('invoice data', () => {
  it('a customer can only read the invoice of their own booking', async () => {
    await expect(service.getInvoiceData('bk-1', 'someone-else')).rejects.toBeInstanceOf(NotFoundError);
    expect(prisma.consultationBooking.findFirst.mock.calls[0][0].where).toMatchObject({ id: 'bk-1', userId: 'someone-else', deletedAt: null });
  });

  it('returns the amounts with GST split out, pending until a number is allocated', async () => {
    prisma.consultationBooking.findFirst.mockResolvedValue(bookingRow());
    const invoice = await service.getInvoiceData('bk-1');
    expect(invoice).toMatchObject({
      invoiceNumber: null, invoiceStatus: 'pending', paymentMethod: 'MANUAL',
      customer: { name: 'Asha' },
      consultation: { slot: '11:00-11:30', timezone: 'Asia/Kolkata' },
      amounts: { pricePaise: 1000000, taxablePaise: 847458, gstPaise: 152542, totalPaise: 1000000, paidCurrency: 'INR', exchangeRate: '1' },
    });
  });

  it('takes the number from the order invoice when the webhook settled the payment', async () => {
    prisma.consultationBooking.findFirst.mockResolvedValue(bookingRow({ orderId: 'order-1' }));
    prisma.invoice.findUnique.mockResolvedValue({ number: 'INV-AS/77' });
    expect(await service.getInvoiceData('bk-1')).toMatchObject({ invoiceNumber: 'INV-AS/77', invoiceStatus: 'allocated' });
  });

  it('there is no invoice for an unpaid booking', async () => {
    prisma.consultationBooking.findFirst.mockResolvedValue(bookingRow({ status: 'PENDING_PAYMENT' }));
    await expect(service.getInvoiceData('bk-1')).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('reminders', () => {
  const NOW = new Date('2026-11-20T02:30:00.000Z'); // 08:00 IST, 20 Nov

  it('finds tomorrow\'s live, not yet reminded bookings (IST day)', async () => {
    prisma.consultationBooking.findMany.mockResolvedValue([bookingRow({ date: '2026-11-21' })]);
    const due = await service.listDueReminders({ now: NOW });
    const where = prisma.consultationBooking.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ deletedAt: null, reminderSentAt: null, status: { in: ['CONFIRMED', 'RESCHEDULED'] } });
    expect(where.slotStartTimeUtc.gte.toISOString()).toBe('2026-11-20T18:30:00.000Z');
    expect(where.slotStartTimeUtc.lte.toISOString()).toBe('2026-11-21T18:29:59.999Z');
    expect(due[0]).toMatchObject({ bookingId: 'bk-1', userPhone: '+919876543210', slot: '11:00-11:30' });
  });

  it('"today" asks for today\'s remaining bookings', async () => {
    await service.listDueReminders({ daysAhead: 0, now: NOW });
    const where = prisma.consultationBooking.findMany.mock.calls[0][0].where;
    expect(where.slotStartTimeUtc.gte.toISOString()).toBe('2026-11-19T18:30:00.000Z');
    expect(where.slotStartTimeUtc.gt).toEqual(NOW);
  });

  it('markReminded claims the booking exactly once', async () => {
    expect(await service.markReminded('bk-1', NOW)).toBe(true);
    expect(prisma.consultationBooking.updateMany).toHaveBeenCalledWith({
      where: { id: 'bk-1', reminderSentAt: null, deletedAt: null, status: { in: ['CONFIRMED', 'RESCHEDULED'] } },
      data: { reminderSentAt: NOW },
    });
    prisma.consultationBooking.updateMany.mockResolvedValue({ count: 0 });
    expect(await service.markReminded('bk-1', NOW)).toBe(false);
  });
});
