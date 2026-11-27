/**
 * Customer flow: book -> pay -> confirmed, with ownership and payment checks.
 * prisma, commerce, the gateway, money settlement, fulfilment and notifications are substituted.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const prisma = {
    user: { findUnique: vi.fn() },
    birthProfile: { findUnique: vi.fn() },
    consultationBooking: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    consultationType: { findMany: vi.fn(), count: vi.fn() },
    availabilitySetting: { upsert: vi.fn() },
    scheduleDay: { findUnique: vi.fn() },
    appointmentSlot: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() },
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  return {
    prisma,
    createOrder: vi.fn(),
    verifySignature: vi.fn(),
    fetchRazorpayPayment: vi.fn(),
    settleOrderPaid: vi.fn(),
    sendNotification: vi.fn(),
    createFulfillmentUnitsForOrder: vi.fn(),
    reconcileFulfillmentUnit: vi.fn(),
  };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: mocks.prisma }));
vi.mock('../../src/modules/payments/razorpay-public-key', () => ({ getRazorpayPublicKeyId: () => 'rzp_test_key' }));
vi.mock('../../src/modules/commerce/commerce.service', () => ({ commerceService: { createOrder: mocks.createOrder } }));
vi.mock('../../src/services/payment.service', () => ({
  paymentService: { verifySignature: mocks.verifySignature, fetchRazorpayPayment: mocks.fetchRazorpayPayment },
}));
vi.mock('../../src/modules/commerce/money/settlement', () => ({ settleOrderPaid: mocks.settleOrderPaid }));
vi.mock('../../src/modules/notifications/notification.service', () => ({
  notificationService: { sendNotification: mocks.sendNotification },
}));
vi.mock('../../src/modules/admin/live-session.service', () => ({ liveSessionService: {} }));
vi.mock('../../src/modules/fulfillment/fulfillment.service', () => ({
  fulfillmentService: {
    createFulfillmentUnitsForOrder: mocks.createFulfillmentUnitsForOrder,
    reconcileFulfillmentUnit: mocks.reconcileFulfillmentUnit,
  },
}));

import { ConsultationsService } from '../../src/modules/consultations/consultations.service';
import { DEFAULT_AVAILABILITY } from '../../src/modules/availability/availability.service';
import { ConflictError, NotFoundError, ValidationError } from '../../src/errors/app-error';

const { prisma } = mocks;
const created = new Date('2026-11-01T00:00:00.000Z');
const typeRows = [
  {
    id: 'type-gen', legacyId: null, title: 'General Consultation', kind: 'NORMAL', description: 'd', includes: ['Chart reading'],
    durationMinutes: 30, responseDays: 4, priceLabel: null, note: null, isActive: true, deletedAt: null, createdAt: created, updatedAt: created,
    blockedDates: [],
    modes: [
      { id: 'm1', typeId: 'type-gen', mode: 'AUDIO', catalogId: 'consult-general-audio', pricePaise: 1000000, gstEnabled: true, gstRateBasisPoints: 1800, gstType: 'INCLUSIVE', isActive: true },
      { id: 'm2', typeId: 'type-gen', mode: 'VIDEO', catalogId: 'consult-general-video', pricePaise: 1500000, gstEnabled: true, gstRateBasisPoints: 1800, gstType: 'EXCLUSIVE', isActive: true },
    ],
  },
];

// Friday 20 Nov 2026, 10:00 IST. 1 Dec 2026 is a Tuesday.
const NOW = new Date('2026-11-20T04:30:00.000Z');
const book = { consultationId: 'consult-general-audio', mode: 'AUDIO' as const, date: '2026-12-01', slot: { startTime: '11:00', endTime: '11:30' } };

function pendingBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bk-1', userId: 'user-1', orderId: 'order-1', consultationId: 'consult-general-audio', consultationTypeId: 'type-gen',
    title: 'General Consultation', mode: 'AUDIO', date: '2026-12-01', startTime: '11:00', endTime: '11:30', status: 'PENDING_PAYMENT',
    cancellationReason: null, deletedAt: null, internalNotes: 'staff only', amountPaise: 1000000,
    customerName: 'Asha', customerPhone: null, customerEmail: null,
    order: { id: 'order-1', razorpayOrderId: 'order_rzp_1', amount: 1000000, currency: 'INR', paidCurrency: 'INR', paidAmountMinor: null },
    ...overrides,
  };
}

let service: ConsultationsService;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  service = new ConsultationsService();
  // No Redis in unit tests: the best-effort lock reports "acquired".
  (service as unknown as { _getRedisClient: () => Promise<null> })._getRedisClient = async () => null;

  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
  prisma.$executeRaw.mockResolvedValue(1);
  prisma.$queryRaw.mockResolvedValue([{ id: 'unit-1' }]);
  prisma.consultationType.count.mockResolvedValue(1);
  prisma.consultationType.findMany.mockResolvedValue(typeRows);
  prisma.availabilitySetting.upsert.mockResolvedValue({ id: 'default', ...DEFAULT_AVAILABILITY });
  prisma.scheduleDay.findUnique.mockResolvedValue(null);
  prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: null, fullName: 'Asha', phoneNumber: '+919876543210' });
  prisma.appointmentSlot.findFirst.mockResolvedValue(null);
  prisma.appointmentSlot.findMany.mockResolvedValue([]);
  prisma.appointmentSlot.updateMany.mockResolvedValue({ count: 0 });
  prisma.appointmentSlot.upsert.mockResolvedValue({});
  prisma.consultationBooking.findMany.mockResolvedValue([]);
  prisma.consultationBooking.findFirst.mockResolvedValue(null);
  prisma.consultationBooking.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'bk-1', ...data }));
  prisma.consultationBooking.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...pendingBooking(), ...data }));
  prisma.consultationBooking.updateMany.mockResolvedValue({ count: 1 });
  mocks.createOrder.mockResolvedValue({ orderId: 'order-1', razorpayOrderId: 'order_rzp_1', amount: 1000000, currency: 'INR' });
  mocks.verifySignature.mockReturnValue(true);
  mocks.fetchRazorpayPayment.mockResolvedValue(null);
  mocks.settleOrderPaid.mockResolvedValue({ transactionId: 'txn-1', invoice: { number: 'INV-AS/9', status: 'ALLOCATED' } });
  mocks.sendNotification.mockResolvedValue({});
});

describe('booking a consultation', () => {
  it('holds the slot before payment starts and prices the booking on the server', async () => {
    const result = await service.bookConsultation('user-1', book);

    const data = prisma.consultationBooking.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      status: 'PENDING_PAYMENT', consultationId: 'consult-general-audio', consultationTypeId: 'type-gen', source: 'USER',
      pricePaise: 1000000, amountPaise: 1000000, gstPaise: 152542, startTime: '11:00', endTime: '11:30',
    });
    expect(data.reservationExpiresAt.getTime()).toBe(NOW.getTime() + 15 * 60 * 1000);
    expect(data.slotStartTimeUtc.toISOString()).toBe('2026-12-01T05:30:00.000Z');

    const hold = prisma.appointmentSlot.upsert.mock.calls[0][0].create;
    expect(hold).toMatchObject({ status: 'RESERVED', bookingId: 'bk-1', lockedUntil: data.reservationExpiresAt });

    // The hold is committed before the payment order is created.
    expect(prisma.appointmentSlot.upsert.mock.invocationCallOrder[0]).toBeLessThan(mocks.createOrder.mock.invocationCallOrder[0]);
    expect(mocks.createOrder.mock.calls[0][0].items[0]).toMatchObject({ catalogId: 'consult-general-audio', quantity: 1 });
    expect(result.razorpayConfig).toEqual({ key: 'rzp_test_key', orderId: 'order_rzp_1', amount: 1000000, currency: 'INR' });
    expect(result.booking).toMatchObject({ id: 'bk-1', orderId: 'order-1' });
  });

  it('a second customer cannot take the same or an overlapping time: no order, no payment', async () => {
    prisma.appointmentSlot.findFirst.mockResolvedValue({ id: 'held-by-someone-else' });
    await expect(service.bookConsultation('user-2', book)).rejects.toBeInstanceOf(ConflictError);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it('refuses a slot the customer was not offered (off the grid, blocked day, notice period)', async () => {
    await expect(service.bookConsultation('user-1', { ...book, slot: '11:10' })).rejects.toThrow(/not offered/);
    await expect(service.bookConsultation('user-1', { ...book, date: '2026-11-21' })).rejects.toThrow(/Minimum booking notice/);
    prisma.scheduleDay.findUnique.mockResolvedValue({ isBlocked: true, blockedSlots: [] });
    await expect(service.bookConsultation('user-1', book)).rejects.toThrow(/not available/);
    expect(prisma.consultationBooking.create).not.toHaveBeenCalled();
  });

  it('exclusive GST: the booking expects price + GST and refuses an order that charges less', async () => {
    const video = { ...book, consultationId: 'type-gen', mode: 'VIDEO' as const };
    // The website's bug: the bare price is charged. Here the booking is abandoned instead.
    mocks.createOrder.mockResolvedValue({ orderId: 'order-1', razorpayOrderId: 'order_rzp_1', amount: 1500000, currency: 'INR' });
    await expect(service.bookConsultation('user-1', video)).rejects.toMatchObject({ code: 'CONSULTATION_PRICE_MISMATCH' });
    expect(prisma.consultationBooking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'bk-1', status: 'PENDING_PAYMENT' }, data: expect.objectContaining({ status: 'CANCELLED', cancellationReason: 'ORDER_CREATION_FAILED' }) })
    );
    expect(prisma.appointmentSlot.updateMany).toHaveBeenCalledWith({ where: { bookingId: 'bk-1' }, data: { status: 'AVAILABLE', bookingId: null, lockedUntil: null } });

    mocks.createOrder.mockResolvedValue({ orderId: 'order-1', razorpayOrderId: 'order_rzp_1', amount: 1770000, currency: 'INR' });
    const ok = await service.bookConsultation('user-1', video);
    expect(prisma.consultationBooking.create.mock.calls[1][0].data).toMatchObject({ amountPaise: 1770000, gstPaise: 270000, taxablePaise: 1500000, gstType: 'EXCLUSIVE' });
    expect(ok.razorpayConfig.amount).toBe(1770000);
  });

  it('releases the hold when the payment order cannot be created', async () => {
    mocks.createOrder.mockRejectedValue(new Error('gateway down'));
    await expect(service.bookConsultation('user-1', book)).rejects.toThrow('gateway down');
    expect(prisma.appointmentSlot.updateMany).toHaveBeenCalledWith({ where: { bookingId: 'bk-1' }, data: { status: 'AVAILABLE', bookingId: null, lockedUntil: null } });
  });

  it('a birth profile must belong to the caller', async () => {
    prisma.birthProfile.findUnique.mockResolvedValue({ id: 'bp', userId: 'someone-else' });
    await expect(service.bookConsultation('user-1', { ...book, birthProfileId: 'bp' })).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('verifying the payment', () => {
  const input = { bookingId: 'bk-1', razorpayOrderId: 'order_rzp_1', razorpayPaymentId: 'pay_1', razorpaySignature: 'sig' };

  beforeEach(() => {
    prisma.consultationBooking.findUnique.mockResolvedValue(pendingBooking());
  });

  it('confirms the booking, books the slot and settles the money in one transaction', async () => {
    const result = await service.verifyPayment('user-1', input);
    expect(result.booking.status).toBe('CONFIRMED');
    expect(prisma.appointmentSlot.upsert.mock.calls[0][0].update).toMatchObject({ status: 'BOOKED', lockedUntil: null });
    expect(mocks.settleOrderPaid).toHaveBeenCalledWith(prisma, 'order-1', { gatewayPaymentId: 'pay_1', gatewayOrderId: 'order_rzp_1', raw: undefined });
    expect(prisma.consultationBooking.update.mock.calls[0][0].data).toMatchObject({ status: 'CONFIRMED', reservationExpiresAt: null, invoiceNumber: 'INV-AS/9' });
    expect(mocks.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'BOOKING_CONFIRMED', templateData: expect.objectContaining({ includes: ['Chart reading'] }) })
    );
  });

  it('another customer cannot verify (or even see) the booking', async () => {
    await expect(service.verifyPayment('user-2', input)).rejects.toBeInstanceOf(NotFoundError);
    expect(mocks.verifySignature).not.toHaveBeenCalled();
  });

  it('refuses a payment made for a different gateway order, before looking at the signature', async () => {
    await expect(service.verifyPayment('user-1', { ...input, razorpayOrderId: 'order_cheap' })).rejects.toThrow(/Order ID mismatch/);
    expect(mocks.verifySignature).not.toHaveBeenCalled();
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
  });

  it('refuses a bad signature', async () => {
    mocks.verifySignature.mockReturnValue(false);
    await expect(service.verifyPayment('user-1', input)).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.consultationBooking.update).not.toHaveBeenCalled();
  });

  it('refuses when the gateway says a different amount, currency or order was paid', async () => {
    const paid = { id: 'pay_1', orderId: 'order_rzp_1', amount: 1000000, currency: 'INR', status: 'captured', captured: true, raw: {} };
    for (const wrong of [{ amount: 100 }, { currency: 'USD' }, { orderId: 'order_other' }, { status: 'failed' }]) {
      mocks.fetchRazorpayPayment.mockResolvedValue({ ...paid, ...wrong });
      await expect(service.verifyPayment('user-1', input)).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH' });
    }
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
    mocks.fetchRazorpayPayment.mockResolvedValue(paid);
    await expect(service.verifyPayment('user-1', input)).resolves.toMatchObject({ success: true });
  });

  it('is idempotent for a booking that is already confirmed', async () => {
    prisma.consultationBooking.findUnique.mockResolvedValue(pendingBooking({ status: 'CONFIRMED' }));
    const result = await service.verifyPayment('user-1', input);
    expect(result.message).toMatch(/already confirmed/);
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
  });

  it('a hold that expired is re-claimed if the time is still free', async () => {
    prisma.consultationBooking.findUnique.mockResolvedValue(pendingBooking({ status: 'CANCELLED', cancellationReason: 'RESERVATION_EXPIRED' }));
    await expect(service.verifyPayment('user-1', input)).resolves.toMatchObject({ success: true });
    expect(prisma.consultationBooking.update.mock.calls[0][0].data).toMatchObject({ status: 'CONFIRMED', cancellationReason: null });
  });

  it('a hold that expired and whose time was taken is not confirmed and nothing is settled', async () => {
    prisma.consultationBooking.findUnique.mockResolvedValue(pendingBooking({ status: 'CANCELLED', cancellationReason: 'RESERVATION_EXPIRED' }));
    prisma.appointmentSlot.findFirst.mockResolvedValue({ id: 'someone-else' });
    await expect(service.verifyPayment('user-1', input)).rejects.toThrow(/no longer available/);
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
    expect(prisma.consultationBooking.update).not.toHaveBeenCalled();
  });

  it('a booking cancelled by the customer or deleted by staff cannot be confirmed', async () => {
    prisma.consultationBooking.findUnique.mockResolvedValue(pendingBooking({ status: 'CANCELLED', cancellationReason: 'changed my mind' }));
    await expect(service.verifyPayment('user-1', input)).rejects.toBeInstanceOf(ValidationError);
    prisma.consultationBooking.findUnique.mockResolvedValue(pendingBooking({ deletedAt: new Date() }));
    await expect(service.verifyPayment('user-1', input)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('my bookings and booking detail', () => {
  it('lists only the caller\'s own, non-deleted bookings and never the staff fields', async () => {
    prisma.consultationBooking.findMany.mockResolvedValue([pendingBooking({ createdByAdminId: 'admin-1', legacyId: 'abc' })]);
    const [mine] = await service.getMyBookings('user-1');
    expect(prisma.consultationBooking.findMany.mock.calls[0][0].where).toEqual({ userId: 'user-1', deletedAt: null });
    expect(mine.internalNotes).toBeUndefined();
    expect(mine.createdByAdminId).toBeUndefined();
    expect(mine.legacyId).toBeUndefined();
    expect(prisma.consultationBooking.findMany.mock.calls[0][0].include).not.toHaveProperty('adminNotes');
  });

  it('detail: 404 for someone else\'s booking and for a deleted one; staff still see it', async () => {
    prisma.consultationBooking.findUnique.mockResolvedValue(pendingBooking());
    await expect(service.getBookingById('user-2', 'bk-1')).rejects.toBeInstanceOf(NotFoundError);
    expect((await service.getBookingById('user-1', 'bk-1')).internalNotes).toBeUndefined();

    prisma.consultationBooking.findUnique.mockResolvedValue(pendingBooking({ deletedAt: new Date() }));
    await expect(service.getBookingById('user-1', 'bk-1')).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getBookingById('admin-1', 'bk-1', true)).resolves.toMatchObject({ internalNotes: 'staff only' });
  });
});

describe('reschedule (admin only)', () => {
  beforeEach(() => {
    prisma.consultationBooking.findUnique.mockResolvedValue(pendingBooking({ status: 'CONFIRMED', durationMinutes: 30, reminderSentAt: new Date() }));
  });

  it('rejects client reschedule with ForbiddenError', async () => {
    await expect(
      service.rescheduleBooking('user-1', 'bk-1', { newDate: '2026-12-02', newSlot: { startTime: '16:00', endTime: '16:30' } })
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      service.rescheduleBooking('user-2', 'bk-1', { newDate: '2026-12-02', newSlot: '16:00' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('admin reschedule moves to the requested slot, tells the customer the old schedule and re-arms the reminder', async () => {
    await service.rescheduleBooking('admin-1', 'bk-1', { newDate: '2026-12-02', newSlot: { startTime: '16:00', endTime: '16:30' } }, true);
    expect(prisma.consultationBooking.update.mock.calls[0][0].data).toMatchObject({
      date: '2026-12-02', startTime: '16:00', endTime: '16:30', status: 'RESCHEDULED', reminderSentAt: null,
    });
    expect(mocks.sendNotification.mock.calls[0][0].templateData).toMatchObject({
      oldDate: '2026-12-01', oldStartTime: '11:00', oldEndTime: '11:30', includes: ['Chart reading'],
    });
  });

  it('staff are not bound by calendar rules, but nobody can take a booked time', async () => {
    const sunday = { newDate: '2026-11-29', newSlot: '16:00' };
    await expect(service.rescheduleBooking('admin-1', 'bk-1', sunday, true)).resolves.toBeTruthy();

    prisma.appointmentSlot.findFirst.mockResolvedValue({ id: 'taken' });
    await expect(service.rescheduleBooking('admin-1', 'bk-1', sunday, true)).rejects.toBeInstanceOf(ConflictError);
  });
});
