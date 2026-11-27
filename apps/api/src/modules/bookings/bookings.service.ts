import { customerDisplayName } from '../birth-profiles/account-identity';
/**
 * Staff-side booking operations (website module `booking`, admin half), the reminder queries
 * and the invoice data of a booking.
 *
 * The customer flow (book -> pay -> confirmed) stays in consultations.service.ts; both use the
 * same calendar rules through slot-hold.ts, so the app, the website and the admin share one
 * set of bookings.
 */
import {
  BookingStatus,
  ConsultationMode,
  FulfillmentType,
  OrderItemType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  SalePaymentMethod,
} from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { normalizePhoneNumber } from '../../utils/phone';
import { calendarDaysBetween, istDateOf, istEndOfDay, istStartOfDay, parseDateBound } from '../../utils/business-time';
import { notificationService } from '../notifications/notification.service';
import { BookingConfirmedEvent, notificationEvents, toWebsiteDate } from '../notifications/notification.events';
import { confirmedBookingPlace, consultationsService } from '../consultations/consultations.service';
import { consultationTypesService } from '../consultations/consultation-types.service';
import { computeDiscountPaise, computeGst, DiscountType } from '../consultations/consultation-gst';
import {
  formatTimeOfDay,
  istInstant,
  normaliseCalendarDate,
  parseSlotInput,
  parseTimeOfDay,
} from '../availability/availability.time';
import { settleOrderPaid } from '../commerce/money/settlement';
import { restateConsultationOrder, restatePaidAmountMinor } from '../commerce/money/restatement';
import { fulfillmentService } from '../fulfillment/fulfillment.service';
import { claimSlot, OCCUPYING_BOOKING_STATUSES, PRACTITIONER_ID, PRACTITIONER_NAME, releaseSlot } from './slot-hold';
import { couponsService } from '../coupons/coupons.service';
import type { BookingQuoteInput } from './bookings.schemas';

export interface AdminActor {
  id: string;
  email?: string;
}

export interface ManualBookingInput {
  /** A consultation type id, or the catalog id of one of its modes. */
  consultationId: string;
  mode?: ConsultationMode;
  /** Absent for a MESSAGE consultation. */
  date?: string;
  slot?: string | { startTime: string; endTime?: string };
  /** Existing customer ... */
  userId?: string;
  /** ... or a new one. */
  name?: string;
  phone?: string;
  email?: string;
  discountType?: DiscountType;
  /** FLAT: paise. PERCENTAGE: basis points. */
  discountValue?: number;
  couponCode?: string;
  note?: string;
}

export interface AdminBookingListQuery {
  tab?: 'upcoming' | 'past';
  search?: string;
  /** Created-on range, as the website's fromDate / toDate (IST days). */
  fromDate?: string;
  toDate?: string;
  /** Appointment date (IST). */
  date?: string;
  consultationTypeId?: string;
  consultationId?: string;
  mode?: ConsultationMode;
  source?: 'USER' | 'ADMIN';
  status?: BookingStatus[];
  sort?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/** Bookings the website calls "booked + paid": the ones staff work with. */
export const PAID_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.RESCHEDULED,
  BookingStatus.COMPLETED,
  BookingStatus.NO_SHOW,
];

const ADMIN_INCLUDE = {
  user: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
  consultationType: { select: { id: true, title: true, durationMinutes: true, kind: true } },
  order: { select: { id: true, amount: true, currency: true, paymentStatus: true, status: true } },
  birthProfile: { select: { id: true, name: true, dateOfBirth: true, timeOfBirth: true, placeName: true } },
  adminNotes: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.ConsultationBookingInclude;

type AdminBookingRow = Prisma.ConsultationBookingGetPayload<{ include: typeof ADMIN_INCLUDE }>;

export const EXPORT_HEADERS = [
  'Customer Name',
  'Email',
  'Phone',
  'Consultation Plan',
  'Mode',
  'Date',
  'Slot',
  'Duration (min)',
  'Amount',
  'Currency',
  'Status',
  'Timing',
  'Note',
] as const;

const EXPORT_ROW_LIMIT = 10_000;

function minorToDecimal(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** A cell that a spreadsheet would run as a formula is prefixed so it stays text. */
function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: readonly string[], rows: Array<Array<string | number>>): string {
  return [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n');
}

/** "10:00-10:30", or null for a MESSAGE consultation (no appointment). */
function slotOf(b: { startTime: string | null; endTime: string | null }): string | null {
  return b.startTime && b.endTime ? `${b.startTime}-${b.endTime}` : null;
}

/**
 * Upcoming or past. A MESSAGE consultation has no appointment: it is upcoming until it is
 * answered (or otherwise closed).
 */
function timingOf(b: { slotEndTimeUtc: Date | null; status: BookingStatus; respondedAt?: Date | null }, now: Date): 'upcoming' | 'past' {
  if (b.slotEndTimeUtc) return b.slotEndTimeUtc.getTime() >= now.getTime() ? 'upcoming' : 'past';
  return b.respondedAt || b.status === BookingStatus.COMPLETED || b.status === BookingStatus.CANCELLED ? 'past' : 'upcoming';
}

function adminView(row: AdminBookingRow, now: Date = new Date()) {
  const { user, consultationType, ...booking } = row;
  return {
    ...booking,
    slot: slotOf(row),
    timing: timingOf(row, now),
    customer: user,
    consultation: consultationType ?? {
      id: null,
      title: row.title,
      durationMinutes: row.durationMinutes,
      kind: null,
    },
  };
}

export type AdminBookingView = ReturnType<typeof adminView>;

/** Run a follow-up (a message) without letting its failure undo a booking that is already saved. */
async function safely(what: string, bookingId: string, run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (err) {
    logger.error(
      { bookingId, err: err instanceof Error ? err.message : String(err) },
      `[Bookings] ${what} failed after the booking was saved`
    );
  }
}

export class BookingsService {
  // ---------------------------------------------------------------------------
  // Lists and detail
  // ---------------------------------------------------------------------------

  private listWhere(query: AdminBookingListQuery): Prisma.ConsultationBookingWhereInput {
    const where: Prisma.ConsultationBookingWhereInput = {
      deletedAt: null,
      status: { in: query.status && query.status.length > 0 ? query.status : PAID_BOOKING_STATUSES },
    };
    const and: Prisma.ConsultationBookingWhereInput[] = [];

    if (query.fromDate || query.toDate) {
      where.createdAt = {
        ...(query.fromDate ? { gte: parseDateBound(query.fromDate, 'start') } : {}),
        ...(query.toDate ? { lte: parseDateBound(query.toDate, 'end') } : {}),
      };
    }
    if (query.date) {
      const day = normaliseCalendarDate(query.date);
      and.push({ slotStartTimeUtc: { gte: istStartOfDay(day), lte: istEndOfDay(day) } });
    }
    if (query.consultationTypeId) where.consultationTypeId = query.consultationTypeId;
    if (query.consultationId) where.consultationId = query.consultationId;
    if (query.mode) where.mode = query.mode;
    if (query.source) where.source = query.source;

    const search = query.search?.trim();
    if (search) {
      const contains = { contains: search, mode: 'insensitive' as const };
      and.push({
        OR: [
          { customerName: contains },
          { customerPhone: contains },
          { customerEmail: contains },
          { user: { OR: [{ fullName: contains }, { phoneNumber: contains }, { email: contains }] } },
        ],
      });
    }
    if (and.length > 0) where.AND = and;
    return where;
  }

  /**
   * Website `GET /booking/bookings`, with the admin page's upcoming / past tabs, plan filter
   * and search done on the server and paginated.
   */
  public async list(query: AdminBookingListQuery, now: Date = new Date()) {
    const base = this.listWhere(query);
    const upcoming: Prisma.ConsultationBookingWhereInput = { ...base, slotEndTimeUtc: { gte: now } };
    const past: Prisma.ConsultationBookingWhereInput = { ...base, slotEndTimeUtc: { lt: now } };
    const where = query.tab === 'upcoming' ? upcoming : query.tab === 'past' ? past : base;

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 50));
    const sort = query.sort ?? (query.tab === 'past' ? 'desc' : 'asc');

    const [rows, total, upcomingCount, pastCount] = await Promise.all([
      prisma.consultationBooking.findMany({
        where,
        include: ADMIN_INCLUDE,
        orderBy: { slotStartTimeUtc: sort },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.consultationBooking.count({ where }),
      prisma.consultationBooking.count({ where: upcoming }),
      prisma.consultationBooking.count({ where: past }),
    ]);

    return {
      items: rows.map((r) => adminView(r, now)),
      total,
      page,
      limit,
      counts: { upcoming: upcomingCount, past: pastCount },
    };
  }

  /**
   * The rows of the admin page's CSV export: every booking matching the filters, upcoming and
   * past together, whatever tab is open (as on the website).
   */
  public async exportRows(query: AdminBookingListQuery, now: Date = new Date()) {
    const rows = await prisma.consultationBooking.findMany({
      where: this.listWhere(query),
      include: ADMIN_INCLUDE,
      orderBy: { slotStartTimeUtc: 'asc' },
      take: EXPORT_ROW_LIMIT,
    });
    const data = rows.map((b) => {
      const paidInOtherCurrency = b.paidCurrency && b.paidCurrency !== 'INR' && b.paidAmountMinor !== null;
      const amountMinor = paidInOtherCurrency ? b.paidAmountMinor : b.amountPaise ?? b.order?.amount ?? null;
      return [
        b.user?.fullName ?? b.customerName ?? '',
        b.user?.email ?? b.customerEmail ?? '',
        b.user?.phoneNumber ?? b.customerPhone ?? '',
        b.consultationType?.title ?? b.title,
        b.mode,
        b.date ?? '',
        slotOf(b) ?? '',
        b.durationMinutes,
        amountMinor === null || amountMinor === undefined ? '' : minorToDecimal(amountMinor),
        paidInOtherCurrency ? (b.paidCurrency as string) : 'INR',
        b.status,
        timingOf(b, now) === 'upcoming' ? 'Upcoming' : 'Past',
        b.note ?? '',
      ] as Array<string | number>;
    });
    return { headers: [...EXPORT_HEADERS], rows: data, truncated: rows.length === EXPORT_ROW_LIMIT };
  }

  /** Website `GET /booking/bookings/date`: the bookings of one day, for the calendar. */
  public async listByDate(date: string, now: Date = new Date()): Promise<AdminBookingView[]> {
    const day = normaliseCalendarDate(date);
    const rows = await prisma.consultationBooking.findMany({
      where: { deletedAt: null, slotStartTimeUtc: { gte: istStartOfDay(day), lte: istEndOfDay(day) } },
      include: ADMIN_INCLUDE,
      orderBy: { slotStartTimeUtc: 'asc' },
    });
    return rows.map((r) => adminView(r, now));
  }

  /** Booking detail for staff. A deleted booking is still readable here (`deletedAt` is set). */
  public async getById(id: string): Promise<AdminBookingView> {
    return adminView(await this.load(id, { includeDeleted: true }));
  }

  /**
   * Bookings whose order was paid but which hold no slot (the payment arrived after the hold had
   * expired and the time was taken, or the booking was cancelled meanwhile). The website has
   * no trace of these; here staff can find them and the money module can refund them.
   */
  public async listPaymentConflicts(): Promise<AdminBookingView[]> {
    const rows = await prisma.consultationBooking.findMany({
      where: {
        deletedAt: null,
        status: { in: [BookingStatus.CANCELLED, BookingStatus.PENDING_PAYMENT] },
        order: { paymentStatus: PaymentStatus.CAPTURED },
      },
      include: ADMIN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => adminView(r));
  }

  /** True when the booking is a payment conflict: its order is paid (captured) and it holds no confirmed slot. */
  private isPaymentConflict(booking: { status: BookingStatus; order: { paymentStatus: PaymentStatus } | null }): boolean {
    return (
      (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.PENDING_PAYMENT) &&
      booking.order?.paymentStatus === PaymentStatus.CAPTURED
    );
  }

  /**
   * Owner decision 2026-11-24 (open-questions M9): a customer paid after the 15-minute hold
   * expired and the time was taken; staff give them another time. The booking is confirmed
   * against the payment ALREADY captured: nothing is charged, the order's amounts are not
   * touched, and the sale is settled through `settleOrderPaid` (ledger row SUCCESS and invoice
   * number; a no-op when the webhook has already settled it).
   *
   * As for a manual booking and a staff reschedule, blocked days and the notice period do not
   * apply; an overlap with another booking or a live payment hold is refused (`claimSlot`).
   * The customer is told through the existing booking-confirmed messages, and the booking leaves
   * the payment-conflicts list because it is CONFIRMED.
   */
  public async resolveConflictWithSlot(
    bookingId: string,
    input: { date: string; slot: string | { startTime: string; endTime?: string }; adminNote?: string },
    admin: AdminActor
  ) {
    const before = await this.load(bookingId);
    if (!this.isPaymentConflict(before) || !before.orderId) {
      throw new ConflictError('This booking is not a payment conflict: its order is not paid, or it already has a slot.');
    }
    const orderId = before.orderId;
    const date = normaliseCalendarDate(input.date);
    const range = parseSlotInput(input.slot, before.durationMinutes);
    const startTime = formatTimeOfDay(range.startMinute);
    const endTime = formatTimeOfDay(range.endMinute);
    const adminName = await this.staffName(admin);
    const now = new Date();
    const place = confirmedBookingPlace(before);

    await prisma.$transaction(async (tx) => {
      // Calendar first (advisory lock inside claimSlot), then the order row: the order used by
      // payment verification. Refuses an overlap; nothing below is written in that case.
      await claimSlot(tx, { bookingId, date, range, status: 'BOOKED', now });

      await tx.$queryRaw`SELECT id FROM "orders" WHERE id = ${orderId} FOR UPDATE;`;
      // Re-read under the lock: a refund or another staff member may have dealt with it meanwhile.
      const current = await tx.consultationBooking.findUnique({
        where: { id: bookingId },
        select: { status: true, deletedAt: true, order: { select: { paymentStatus: true, razorpayPaymentId: true, razorpayOrderId: true } } },
      });
      if (!current || current.deletedAt || !this.isPaymentConflict(current)) {
        throw new ConflictError('This payment conflict has already been dealt with.');
      }

      // No new charge: the captured payment settles the sale. Safe to repeat after the webhook.
      const settlement = await settleOrderPaid(tx, orderId, {
        gatewayPaymentId: current.order?.razorpayPaymentId ?? null,
        gatewayOrderId: current.order?.razorpayOrderId ?? null,
      });

      await fulfillmentService.createFulfillmentUnitsForOrder(orderId, tx);
      const units = await tx.fulfillmentUnit.findMany({
        where: { orderId, obligationType: 'CONSULTATION' },
        orderBy: { unitIndex: 'asc' },
        take: 1,
        select: { id: true },
      });
      const unitId = units[0]?.id ?? null;

      await tx.consultationBooking.update({
        where: { id: bookingId },
        data: {
          date,
          startTime,
          endTime,
          slotStartTimeUtc: istInstant(date, range.startMinute),
          slotEndTimeUtc: istInstant(date, range.endMinute),
          status: BookingStatus.CONFIRMED,
          confirmedAt: now,
          reservationExpiresAt: null,
          cancellationReason: null,
          cancelledAt: null,
          meetingLink: place.meetingLink,
          locationAddress: place.locationAddress,
          ...(settlement.invoice.number ? { invoiceNumber: settlement.invoice.number } : {}),
          ...(unitId && !before.fulfillmentUnitId ? { fulfillmentUnitId: unitId } : {}),
        },
      });
      if (unitId) await fulfillmentService.reconcileFulfillmentUnit(orderId, unitId, tx);

      await tx.bookingAdminNote.create({
        data: {
          bookingId,
          action: 'RESCHEDULE',
          note: input.adminNote?.trim() || null,
          changes: {
            paymentConflict: 'RESOLVED_WITH_NEW_SLOT',
            from: { date: before.date, slot: slotOf(before), status: before.status },
            to: { date, slot: `${startTime}-${endTime}`, status: BookingStatus.CONFIRMED },
            chargedAgain: false,
          },
          addedByName: adminName,
          addedById: admin.id,
        },
      });
    });

    const saved = await this.load(bookingId);
    // The existing booking-confirmed event: push and in-app, then the website channels with the
    // "includes" list (same pair as a manual booking).
    await safely('The in-app booking notification', bookingId, () =>
      notificationService.sendNotification({
        userId: saved.userId,
        type: 'BOOKING_CONFIRMED',
        entityId: bookingId,
        route: 'OPEN_CONSULTATIONS',
        templateData: {
          consultationTitle: saved.title,
          date: saved.date,
          startTime: saved.startTime,
          mode: saved.mode,
          meetingLink: saved.meetingLink,
        },
        websiteChannels: false,
      })
    );
    await safely('The booking-confirmed messages', bookingId, () =>
      notificationEvents.bookingConfirmed(this.messageOf(saved))
    );

    return { booking: adminView(saved), oldBooking: { date: before.date, slot: slotOf(before) } };
  }

  /**
   * The fallback for a payment conflict: the money is returned. `refund` issues the staff refund
   * (the one refund path, POST /admin/payments/orders/:id/refund: permission, gateway call,
   * order state, audit); this records the outcome on the booking. A full refund marks the booking
   * REFUNDED; a partial one leaves its status and records the amount in the staff history. Either
   * way the order is no longer "captured", so the booking leaves the payment-conflicts list.
   */
  public async resolveConflictWithRefund(
    bookingId: string,
    refund: (orderId: string) => Promise<{ refund: { id: string; amount: number; status: string }; order: { status: OrderStatus } }>,
    input: { adminNote?: string },
    admin: AdminActor
  ) {
    const before = await this.load(bookingId);
    if (!this.isPaymentConflict(before) || !before.orderId) {
      throw new ConflictError('This booking is not a payment conflict: its order is not paid, or it already has a slot.');
    }
    const result = await refund(before.orderId);
    const refunded = result.refund.status === 'PROCESSED';
    const fully = refunded && result.order.status === OrderStatus.REFUNDED;
    const adminName = await this.staffName(admin);

    await prisma.$transaction(async (tx) => {
      if (fully) {
        await releaseSlot(tx, bookingId);
        await tx.consultationBooking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.REFUNDED,
            cancellationReason: 'PAYMENT_CONFLICT_REFUNDED',
            cancelledAt: before.cancelledAt ?? new Date(),
            reservationExpiresAt: null,
          },
        });
      }
      await tx.bookingAdminNote.create({
        data: {
          bookingId,
          action: 'NOTE',
          note: input.adminNote?.trim() || null,
          changes: {
            paymentConflict: refunded ? (fully ? 'RESOLVED_WITH_REFUND' : 'PARTIALLY_REFUNDED') : 'REFUND_FAILED',
            refundId: result.refund.id,
            refundPaise: result.refund.amount,
            refundStatus: result.refund.status,
          },
          addedByName: adminName,
          addedById: admin.id,
        },
      });
    });

    return { booking: adminView(await this.load(bookingId)), refund: result.refund, fullyRefunded: fully };
  }

  // ---------------------------------------------------------------------------
  // Manual booking
  // ---------------------------------------------------------------------------

  /**
   * Price quote for a manual booking or plan change with optional discount or coupon.
   */
  public async quote(input: BookingQuoteInput) {
    if (input.couponCode && (input.discountType !== undefined || (input.discountValue !== undefined && input.discountValue > 0))) {
      throw new ValidationError('Coupons cannot be combined with a staff discount');
    }
    await consultationTypesService.refresh({ force: true });
    const offering = consultationTypesService.resolveOffering(input.consultationId, input.mode, { includeInactive: true });

    let discountPaise = computeDiscountPaise(offering.mode.pricePaise, input.discountType, input.discountValue);
    if (input.couponCode) {
      const { coupon, result: evalResult } = await couponsService.evaluate(prisma, {
        code: input.couponCode,
        userId: input.userId || 'guest-quote',
        itemsTotalPaise: offering.mode.pricePaise,
        saleType: 'consultations',
      });
      if (!coupon || !evalResult.ok) {
        const reason = !evalResult.ok ? evalResult.reason : 'COUPON_INACTIVE';
        const message = !evalResult.ok ? evalResult.message : 'This coupon is no longer valid';
        throw new AppError(message, 400, reason);
      }
      discountPaise = evalResult.discountPaise;
    }
    const pricing = computeGst(offering.mode.pricePaise - discountPaise, offering.mode.gst);

    return {
      pricePaise: offering.mode.pricePaise,
      discountPaise,
      taxablePaise: pricing.taxablePaise,
      gstPaise: pricing.gstPaise,
      gstRateBasisPoints: pricing.rateBasisPoints,
      gstType: pricing.type,
      totalPaise: pricing.totalPaise,
    };
  }

  /**
   * Website `POST /booking/admin/book`: staff book a slot for an existing or a new customer,
   * optionally with a discount and a note. Blocked days, blocked slots and the notice period do
   * not apply; an overlap with another booking or a live payment hold still does. The booking
   * is confirmed at once and recorded as a manual payment: an order with paymentMethod MANUAL,
   * settled in the same transaction (ledger row + invoice number).
   *
   * A new customer account has NO password: customers sign in by OTP only. (The website set
   * the same hardcoded password on every such account.)
   */
  public async createManual(input: ManualBookingInput, admin: AdminActor) {
    if (input.couponCode && (input.discountType !== undefined || (input.discountValue !== undefined && input.discountValue > 0))) {
      throw new ValidationError('Coupons cannot be combined with a staff discount');
    }
    await consultationTypesService.refresh({ force: true });
    const offering = consultationTypesService.resolveOffering(input.consultationId, input.mode, { includeInactive: true });
    // A MESSAGE consultation has no appointment (website: staff can book one without a date).
    const isMessage = offering.mode.mode === ConsultationMode.MESSAGE;
    if (!isMessage && (!input.date || !input.slot)) throw new ValidationError('Date and slot are required for scheduled consultations');
    const date = isMessage ? null : normaliseCalendarDate(input.date as string);
    const range = isMessage ? null : parseSlotInput(input.slot as NonNullable<ManualBookingInput['slot']>, offering.type.durationMinutes);
    const adminName = await this.staffName(admin);
    const now = new Date();

    let createdUser = false;
    const bookingId = await this.guardUnique(() =>
      prisma.$transaction(async (tx) => {
        let user: { id: string; fullName: string | null; phoneNumber: string | null; email: string | null };
        if (input.userId) {
          const found = await tx.user.findUnique({
            where: { id: input.userId },
            select: { id: true, fullName: true, phoneNumber: true, email: true },
          });
          if (!found) throw new NotFoundError('User not found');
          user = found;
        } else {
          if (!input.name?.trim() || !input.phone?.trim()) {
            throw new ValidationError('Name & phone required');
          }
          const phoneNumber = normalizePhoneNumber(input.phone);
          const email = input.email?.trim().toLowerCase() || null;
          const clash = await tx.user.findFirst({
            where: { OR: [{ phoneNumber }, ...(email ? [{ email }] : [])] },
            select: { id: true },
          });
          if (clash) {
            throw new ConflictError(
              'A customer with this phone number or e-mail already exists. Select the existing customer instead.'
            );
          }
          // No passwordHash: the customer logs in with an OTP sent to this phone.
          user = await tx.user.create({
            data: { fullName: input.name.trim(), phoneNumber, email, role: 'USER' },
            select: { id: true, fullName: true, phoneNumber: true, email: true },
          });
          createdUser = true;
        }

        let discountPaise = computeDiscountPaise(offering.mode.pricePaise, input.discountType, input.discountValue);
        if (input.couponCode) {
          const { coupon, result: evalResult } = await couponsService.evaluate(tx, {
            code: input.couponCode,
            userId: user.id,
            itemsTotalPaise: offering.mode.pricePaise,
            saleType: 'consultations',
          });
          if (!coupon || !evalResult.ok) {
            const reason = !evalResult.ok ? evalResult.reason : 'COUPON_INACTIVE';
            const message = !evalResult.ok ? evalResult.message : 'This coupon is no longer valid';
            throw new AppError(message, 400, reason);
          }
          discountPaise = evalResult.discountPaise;
        }
        const pricing = computeGst(offering.mode.pricePaise - discountPaise, offering.mode.gst);

        const booking = await tx.consultationBooking.create({
          data: {
            userId: user.id,
            consultationId: offering.mode.catalogId,
            consultationTypeId: this.typeIdOrNull(offering.type.id, offering.mode.catalogId),
            title: offering.type.title,
            mode: offering.mode.mode,
            durationMinutes: offering.type.durationMinutes,
            date,
            startTime: range ? formatTimeOfDay(range.startMinute) : null,
            endTime: range ? formatTimeOfDay(range.endMinute) : null,
            slotStartTimeUtc: date && range ? istInstant(date, range.startMinute) : null,
            slotEndTimeUtc: date && range ? istInstant(date, range.endMinute) : null,
            practitionerId: PRACTITIONER_ID,
            practitionerName: PRACTITIONER_NAME,
            status: BookingStatus.CONFIRMED,
            confirmedAt: now,
            customerName: user.fullName?.trim() || (await customerDisplayName(tx, user.id, input.name)),
            customerPhone: user.phoneNumber,
            customerEmail: user.email,
            source: 'ADMIN',
            paymentMethod: 'MANUAL',
            pricePaise: offering.mode.pricePaise,
            discountType: discountPaise > 0 ? (input.couponCode ? 'FLAT' : input.discountType ?? null) : null,
            discountValue: discountPaise > 0 ? (input.couponCode ? discountPaise : input.discountValue ?? null) : null,
            discountPaise,
            gstRateBasisPoints: pricing.rateBasisPoints,
            gstType: pricing.type,
            taxablePaise: pricing.taxablePaise,
            gstPaise: pricing.gstPaise,
            amountPaise: pricing.totalPaise,
            priceLabel: offering.type.priceLabel,
            note: input.note?.trim() || null,
            createdByAdminId: admin.id,
          },
          select: { id: true },
        });

        if (date && range) await claimSlot(tx, { bookingId: booking.id, date, range, status: 'BOOKED', now });

        // Money: a manual sale is an order paid outside the gateway (paymentMethod MANUAL). It
        // is created already paid and settled in this transaction, so it has a ledger row and
        // an invoice number like any other sale (the website's manual transaction).
        const order = await tx.order.create({
          data: {
            userId: user.id,
            // The column is required and unique; a manual sale has no gateway order.
            razorpayOrderId: `manual_${booking.id}`,
            amount: pricing.totalPaise,
            subtotal: pricing.taxablePaise,
            taxAmount: pricing.gstPaise,
            discountAmount: discountPaise,
            currency: 'INR',
            paidCurrency: 'INR',
            paymentMethod: SalePaymentMethod.MANUAL,
            status: OrderStatus.PAID,
            paymentStatus: PaymentStatus.CAPTURED,
            paidAt: now,
            notes: date && range ? `Manual booking for ${offering.type.title} on ${date} at ${formatTimeOfDay(range.startMinute)}` : `Manual message consultation: ${offering.type.title}`,
            items: {
              create: [
                {
                  itemType: OrderItemType.CONSULTATION,
                  catalogId: offering.mode.catalogId,
                  title: offering.type.title,
                  description: offering.type.description,
                  quantity: 1,
                  unitPrice: offering.mode.pricePaise,
                  taxRate: pricing.rateBasisPoints,
                  taxAmount: pricing.gstPaise,
                  taxInclusive: pricing.type === 'INCLUSIVE',
                  totalAmount: pricing.totalPaise,
                  currency: 'INR',
                  fulfillmentType: FulfillmentType.SERVICE,
                  metadata: { bookingId: booking.id, ...(date && range ? { date, startTime: formatTimeOfDay(range.startMinute) } : {}), mode: offering.mode.mode, manual: true },
                },
              ],
            },
          },
          select: { id: true },
        });

        if (input.couponCode && discountPaise > 0) {
          await couponsService.reserveForOrder(tx, {
            code: input.couponCode,
            userId: user.id,
            itemsTotalPaise: offering.mode.pricePaise,
            orderId: order.id,
            expectedDiscountPaise: discountPaise,
            saleType: 'consultations',
          });
        }

        const settlement = await settleOrderPaid(tx, order.id, {}, { customerName: user.fullName });

        // Same fulfilment bookkeeping as a booking paid at checkout.
        await fulfillmentService.createFulfillmentUnitsForOrder(order.id, tx);
        const units = await tx.fulfillmentUnit.findMany({
          where: { orderId: order.id, obligationType: 'CONSULTATION' },
          orderBy: { unitIndex: 'asc' },
          take: 1,
          select: { id: true },
        });
        const unitId = units[0]?.id ?? null;
        await tx.consultationBooking.update({
          where: { id: booking.id },
          data: {
            orderId: order.id,
            invoiceNumber: settlement.invoice.number ?? null,
            ...(unitId ? { fulfillmentUnitId: unitId } : {}),
          },
        });
        if (unitId) await fulfillmentService.reconcileFulfillmentUnit(order.id, unitId, tx);

        await tx.bookingAdminNote.create({
          data: {
            bookingId: booking.id,
            action: 'MANUAL_BOOKING',
            note: null,
            changes: { discountPaise, amountPaise: pricing.totalPaise, newCustomer: createdUser },
            addedByName: adminName,
            addedById: admin.id,
          },
        });
        return booking.id;
      })
    );

    const saved = await this.load(bookingId);

    await safely('The in-app booking notification', bookingId, () =>
      notificationService.sendNotification({
        userId: saved.userId,
        type: 'BOOKING_CONFIRMED',
        entityId: bookingId,
        route: 'OPEN_CONSULTATIONS',
        templateData: {
          consultationTitle: saved.title,
          date: saved.date,
          startTime: saved.startTime,
          mode: saved.mode,
          meetingLink: saved.meetingLink,
        },
        // The website channels are raised just below, with the "includes" list.
        websiteChannels: false,
      })
    );
    await safely('The booking-confirmed messages', bookingId, () =>
      notificationEvents.bookingConfirmed(this.messageOf(saved))
    );

    return { booking: adminView(await this.load(bookingId)), createdUser };
  }

  // ---------------------------------------------------------------------------
  // Reschedule, change plan, notes, delete
  // ---------------------------------------------------------------------------

  /**
   * Website `PATCH /booking/reschedule/:bookingId`. Staff may move a booking onto a blocked day
   * or inside the notice period, never onto another booking. The reason is kept in the staff
   * history; it is not shown to the customer.
   */
  public async reschedule(
    bookingId: string,
    input: { date: string; slot: string | { startTime: string; endTime?: string }; adminNote?: string },
    admin: AdminActor
  ) {
    const before = await this.load(bookingId);
    const date = normaliseCalendarDate(input.date);
    const range = parseSlotInput(input.slot, before.durationMinutes);
    const startTime = formatTimeOfDay(range.startMinute);
    const endTime = formatTimeOfDay(range.endMinute);
    if (before.date === date && before.startTime === startTime && before.endTime === endTime) {
      throw new ValidationError('Please choose a different slot');
    }

    await consultationsService.rescheduleBooking(admin.id, bookingId, { newDate: date, newSlot: { startTime, endTime } }, true);

    const oldBooking = { date: before.date, slot: slotOf(before) };
    await prisma.bookingAdminNote.create({
      data: {
        bookingId,
        action: 'RESCHEDULE',
        note: input.adminNote?.trim() || null,
        changes: { from: oldBooking, to: { date, slot: `${startTime}-${endTime}` } },
        addedByName: await this.staffName(admin),
        addedById: admin.id,
      },
    });

    // The customer is told by rescheduleBooking above (push, in-app and the website channels).
    const saved = await this.load(bookingId);
    return { booking: adminView(saved), oldBooking };
  }

  /**
   * Website `PATCH /booking/bookings/:bookingId/change-plan`: move a paid booking to another
   * consultation type and/or mode. The booking, its order and the order's ledger row are
   * re-stated at the new plan's price (nothing is charged or refunded). The start time stays;
   * the end follows the new duration, and the change is refused if that would run into another
   * booking.
   */
  public async changePlan(
    bookingId: string,
    input: { consultationId: string; mode?: ConsultationMode; adminNote?: string },
    admin: AdminActor
  ) {
    const before = await this.load(bookingId);
    if (!OCCUPYING_BOOKING_STATUSES.includes(before.status)) {
      throw new ValidationError('Only paid bookings can be updated');
    }

    await consultationTypesService.refresh({ force: true });
    const offering = consultationTypesService.resolveOffering(input.consultationId, input.mode, { includeInactive: true });
    const pricing = offering.pricing;

    // A MESSAGE consultation has no appointment: it cannot become a call (book that as a new
    // consultation) and a call cannot become a message.
    if (!before.date || !before.startTime || before.mode === ConsultationMode.MESSAGE || offering.mode.mode === ConsultationMode.MESSAGE) {
      throw new ValidationError('A message consultation cannot be changed to or from a scheduled consultation.');
    }
    const bookedDate = before.date;
    const startMinute = parseTimeOfDay(before.startTime);
    const range = { startMinute, endMinute: startMinute + offering.type.durationMinutes };
    if (range.endMinute > 24 * 60) {
      throw new ValidationError('The new plan does not fit in the day at this start time. Reschedule the booking first.');
    }
    const endTime = formatTimeOfDay(range.endMinute);
    const durationChanged = endTime !== before.endTime;
    const adminName = await this.staffName(admin);

    // The amount charged in a foreign currency is re-stated with the stored rate, as the website
    // does (the money module's conversion: the currency's own smallest unit, whole yen for JPY).
    const paidAmountMinor = restatePaidAmountMinor(pricing.totalPaise, before.paidCurrency, before.exchangeRate, before.paidAmountMinor);

    const changeNote = await prisma.$transaction(async (tx) => {
      if (durationChanged) {
        try {
          await claimSlot(tx, { bookingId, date: bookedDate, range, status: 'BOOKED' });
        } catch (err) {
          if (err instanceof ConflictError) {
            throw new ConflictError(
              'The new plan is longer and would overlap the next booking. Reschedule the booking first.'
            );
          }
          throw err;
        }
      }
      await tx.consultationBooking.update({
        where: { id: bookingId },
        data: {
          consultationId: offering.mode.catalogId,
          consultationTypeId: this.typeIdOrNull(offering.type.id, offering.mode.catalogId),
          title: offering.type.title,
          mode: offering.mode.mode,
          durationMinutes: offering.type.durationMinutes,
          endTime,
          slotEndTimeUtc: istInstant(bookedDate, range.endMinute),
          pricePaise: offering.mode.pricePaise,
          // The new amount is the plan's full price, so an earlier discount no longer applies.
          discountType: null,
          discountValue: null,
          discountPaise: 0,
          gstRateBasisPoints: pricing.rateBasisPoints,
          gstType: pricing.type,
          taxablePaise: pricing.taxablePaise,
          gstPaise: pricing.gstPaise,
          amountPaise: pricing.totalPaise,
          paidAmountMinor,
          priceLabel: offering.type.priceLabel,
        },
      });
      // Website: the linked transaction is re-stated with the new plan's amounts (nothing is
      // charged or refunded). Here that is the booking's order, its consultation line and the
      // order's ledger row, re-stated together by the money module. An invoice number already
      // issued is kept (as on the website) and written into the history entry below.
      const restated = before.orderId
        ? await restateConsultationOrder(tx, before.orderId, {
            catalogId: offering.mode.catalogId,
            title: offering.type.title,
            description: offering.type.description,
            unitPricePaise: offering.mode.pricePaise,
            taxRateBp: pricing.rateBasisPoints,
            taxInclusive: pricing.type === 'INCLUSIVE',
            taxablePaise: pricing.taxablePaise,
            taxPaise: pricing.gstPaise,
            totalPaise: pricing.totalPaise,
          })
        : null;

      return tx.bookingAdminNote.create({
        data: {
          bookingId,
          action: 'PLAN_CHANGE',
          note: input.adminNote?.trim() || null,
          changes: {
            from: {
              consultationId: before.consultationId,
              title: before.title,
              mode: before.mode,
              durationMinutes: before.durationMinutes,
              amountPaise: before.amountPaise,
            },
            to: {
              consultationId: offering.mode.catalogId,
              title: offering.type.title,
              mode: offering.mode.mode,
              durationMinutes: offering.type.durationMinutes,
              amountPaise: pricing.totalPaise,
            },
            // Set when a tax invoice had already been issued for this sale: its number is
            // unchanged and the invoice now states the new plan and amount.
            ...(restated?.invoiceNumber ? { invoiceNumberKept: restated.invoiceNumber } : {}),
          },
          addedByName: adminName,
          addedById: admin.id,
        },
      });
    });

    const saved = await this.load(bookingId);
    // Website job "booking-upgraded". The history entry identifies this change, so a second
    // plan change of the same booking is announced too.
    await safely('The booking-upgraded messages', bookingId, () =>
      notificationEvents.bookingUpgraded({ ...this.messageOf(saved), changeId: changeNote.id })
    );
    return adminView(saved);
  }

  /** A free-text staff note in the booking's history. */
  public async addNote(bookingId: string, note: string, admin: AdminActor) {
    await this.load(bookingId);
    await prisma.bookingAdminNote.create({
      data: {
        bookingId,
        action: 'NOTE',
        note: note.trim(),
        addedByName: await this.staffName(admin),
        addedById: admin.id,
      },
    });
    return adminView(await this.load(bookingId));
  }

  /**
   * Website `PATCH /booking/bookings/:bookingId/message-response`: staff answer a paid MESSAGE
   * consultation once. The answer is shown to the customer; the booking becomes COMPLETED.
   * A second answer, an unpaid or deleted booking, or a scheduled consultation is refused.
   */
  public async respondToMessage(bookingId: string, text: string, admin: AdminActor) {
    const responseText = text.trim();
    if (!responseText || responseText.length > 5000) throw new ValidationError('Response must be between 1 and 5000 characters');
    const respondedBy = await this.staffName(admin);
    const now = new Date();
    const result = await prisma.consultationBooking.updateMany({
      where: {
        id: bookingId,
        deletedAt: null,
        mode: ConsultationMode.MESSAGE,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED] },
        responseText: null,
      },
      data: { responseText, respondedAt: now, respondedBy, status: BookingStatus.COMPLETED, completedAt: now },
    });
    if (result.count === 0) {
      await this.load(bookingId);
      throw new ConflictError('Message consultation is no longer eligible for a response');
    }
    return adminView(await this.load(bookingId));
  }

  /**
   * Website `DELETE /booking/bookings/:id`. The website does not remove the document: it sets
   * `isDeleted`, after which the booking is gone from every list, from the customer's bookings,
   * from reminders, and its time can be booked again. This does exactly that (`deletedAt`).
   */
  public async softDelete(bookingId: string, admin: AdminActor) {
    const booking = await prisma.consultationBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, deletedAt: true },
    });
    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.deletedAt) throw new ValidationError('Booking already deleted');

    const adminName = await this.staffName(admin);
    await prisma.$transaction(async (tx) => {
      await tx.consultationBooking.update({
        where: { id: bookingId },
        data: { deletedAt: new Date(), deletedById: admin.id },
      });
      await releaseSlot(tx, bookingId);
      await tx.bookingAdminNote.create({
        data: { bookingId, action: 'DELETE', note: null, addedByName: adminName, addedById: admin.id },
      });
    });
    return adminView(await this.load(bookingId, { includeDeleted: true }));
  }

  // ---------------------------------------------------------------------------
  // Invoice
  // ---------------------------------------------------------------------------

  /** Called by the invoice module once a number in the INV-AS series is allocated. */
  public async setInvoiceNumber(bookingId: string, invoiceNumber: string): Promise<void> {
    await prisma.consultationBooking.updateMany({
      where: { id: bookingId, invoiceNumber: null },
      data: { invoiceNumber },
    });
  }

  /**
   * Everything an invoice for a booking needs. With `ownerUserId`, the booking must belong to
   * that customer (website `GET /booking/my-bookings/:bookingId/invoice`); staff pass none.
   * Rendering the PDF belongs to the invoice module.
   */
  public async getInvoiceData(bookingId: string, ownerUserId?: string) {
    const booking = await prisma.consultationBooking.findFirst({
      where: { id: bookingId, deletedAt: null, ...(ownerUserId ? { userId: ownerUserId } : {}) },
      include: {
        user: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
        order: { select: { id: true, amount: true, subtotal: true, taxAmount: true, currency: true, paidAt: true } },
      },
    });
    if (!booking) throw new NotFoundError('Booking not found');
    if (!PAID_BOOKING_STATUSES.includes(booking.status)) {
      throw new ValidationError('An invoice exists only for a paid booking');
    }

    // Bookings made before the price snapshot existed fall back to their order's amounts.
    const totalPaise = booking.amountPaise ?? booking.order?.amount ?? null;
    const gstPaise = booking.gstPaise ?? booking.order?.taxAmount ?? null;
    const taxablePaise = booking.taxablePaise ?? booking.order?.subtotal ?? null;

    // The number is copied onto the booking when this module settles the payment; a booking
    // settled by the gateway webhook has it on the order's invoice only.
    let invoiceNumber = booking.invoiceNumber;
    if (!invoiceNumber && booking.orderId) {
      const invoice = await prisma.invoice.findUnique({ where: { orderId: booking.orderId }, select: { number: true } });
      invoiceNumber = invoice?.number ?? null;
    }

    return {
      bookingId: booking.id,
      invoiceNumber,
      invoiceStatus: invoiceNumber ? ('allocated' as const) : ('pending' as const),
      issuedAt: booking.order?.paidAt ?? booking.confirmedAt ?? booking.createdAt,
      paymentMethod: booking.paymentMethod ?? (booking.orderId ? ('RAZORPAY' as const) : null),
      orderId: booking.orderId,
      customer: {
        id: booking.userId,
        name: booking.user?.fullName ?? booking.customerName,
        phone: booking.user?.phoneNumber ?? booking.customerPhone,
        email: booking.user?.email ?? booking.customerEmail,
      },
      consultation: {
        title: booking.title,
        mode: booking.mode,
        durationMinutes: booking.durationMinutes,
        priceLabel: booking.priceLabel,
        date: booking.date,
        slot: slotOf(booking),
        timezone: 'Asia/Kolkata',
      },
      amounts: {
        currency: 'INR',
        pricePaise: booking.pricePaise ?? totalPaise,
        discountType: booking.discountType,
        discountValue: booking.discountValue,
        discountPaise: booking.discountPaise,
        taxablePaise,
        gstRateBasisPoints: booking.gstRateBasisPoints,
        gstType: booking.gstType,
        gstPaise,
        totalPaise,
        paidCurrency: booking.paidCurrency ?? 'INR',
        paidAmountMinor: booking.paidAmountMinor ?? totalPaise,
        exchangeRate: booking.exchangeRate ? booking.exchangeRate.toString() : '1',
      },
      note: booking.note,
    };
  }

  // ---------------------------------------------------------------------------
  // Reminders (the messaging module sends them)
  // ---------------------------------------------------------------------------

  /**
   * Confirmed bookings on a given IST day that have not been reminded yet. `daysAhead` 1 is the
   * website's daily job ("tomorrow"); 0 is "today".
   */
  public async listDueReminders(options: { daysAhead?: number; date?: string; now?: Date } = {}) {
    const now = options.now ?? new Date();
    let day: string;
    if (options.date) {
      day = normaliseCalendarDate(options.date);
    } else {
      const ahead = options.daysAhead ?? 1;
      day = istDateOf(new Date(istStartOfDay(istDateOf(now)).getTime() + ahead * 24 * 60 * 60 * 1000));
    }
    if (calendarDaysBetween(istDateOf(now), day) < 0) return [];

    const rows = await prisma.consultationBooking.findMany({
      where: {
        deletedAt: null,
        reminderSentAt: null,
        status: { in: OCCUPYING_BOOKING_STATUSES },
        slotStartTimeUtc: { gte: istStartOfDay(day), lte: istEndOfDay(day), gt: now },
      },
      include: { user: { select: { fullName: true, phoneNumber: true, email: true } } },
      orderBy: { slotStartTimeUtc: 'asc' },
    });

    return rows.map((b) => ({
      bookingId: b.id,
      userId: b.userId,
      userName: b.user?.fullName ?? b.customerName,
      userPhone: b.user?.phoneNumber ?? b.customerPhone,
      userEmail: b.user?.email ?? b.customerEmail,
      consultationTitle: b.title,
      mode: b.mode,
      date: b.date,
      slot: slotOf(b),
      startsAt: b.slotStartTimeUtc,
    }));
  }

  /**
   * The same query in the shape the messaging module's daily sweep takes as `findBookings`
   * (notifications/consultation-reminder.sweep.ts): live, not deleted, not yet reminded
   * bookings on one IST date.
   */
  public async findReminderBookings(date: string) {
    const day = normaliseCalendarDate(date);
    // Only scheduled consultations: a MESSAGE consultation has no appointment to remind of
    // (the website skips it too).
    const rows = await prisma.consultationBooking.findMany({
      where: {
        deletedAt: null,
        reminderSentAt: null,
        status: { in: OCCUPYING_BOOKING_STATUSES },
        slotStartTimeUtc: { gte: istStartOfDay(day), lte: istEndOfDay(day) },
      },
      select: {
        id: true,
        userId: true,
        title: true,
        mode: true,
        date: true,
        startTime: true,
        endTime: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        user: { select: { fullName: true, email: true, phoneNumber: true } },
      },
      orderBy: { slotStartTimeUtc: 'asc' },
    });
    return rows.flatMap((row) =>
      row.date && row.startTime && row.endTime && row.mode !== ConsultationMode.MESSAGE
        ? [{ ...row, date: row.date, startTime: row.startTime, endTime: row.endTime }]
        : []
    );
  }

  /**
   * Mark a booking as reminded. Returns false when it was already marked (or is no longer a
   * live booking), so two workers cannot both send the same reminder: mark first, then send.
   */
  public async markReminded(bookingId: string, at: Date = new Date()): Promise<boolean> {
    const result = await prisma.consultationBooking.updateMany({
      where: { id: bookingId, reminderSentAt: null, deletedAt: null, status: { in: OCCUPYING_BOOKING_STATUSES } },
      data: { reminderSentAt: at },
    });
    return result.count === 1;
  }

  /** Undo `markReminded` after a send that failed for good, so the next run tries again. */
  public async clearReminded(bookingId: string): Promise<void> {
    await prisma.consultationBooking.updateMany({ where: { id: bookingId }, data: { reminderSentAt: null } });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async load(id: string, options: { includeDeleted?: boolean } = {}): Promise<AdminBookingRow> {
    const row = await prisma.consultationBooking.findUnique({ where: { id }, include: ADMIN_INCLUDE });
    if (!row || (row.deletedAt && !options.includeDeleted)) throw new NotFoundError('Booking not found');
    return row;
  }

  /** Before the first database read the snapshot's type ids are catalog ids, not row ids. */
  private typeIdOrNull(typeId: string, catalogId: string): string | null {
    return typeId === catalogId ? null : typeId;
  }

  private async staffName(admin: AdminActor): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: admin.id }, select: { fullName: true, email: true } });
    return user?.fullName || user?.email || admin.email || admin.id;
  }

  /** Payload of the website's booking messages (dates as DD-MM-YYYY, modes in lower case). */
  private messageOf(b: AdminBookingRow): BookingConfirmedEvent {
    const type = consultationTypesService
      .all()
      .find((t) => t.id === b.consultationTypeId || t.modes.some((m) => m.catalogId === b.consultationId));
    const mode = b.mode.toLowerCase() as 'audio' | 'video' | 'in_person';
    return {
      bookingId: b.id,
      customer: {
        userId: b.userId,
        name: b.user?.fullName ?? b.customerName,
        email: b.user?.email ?? b.customerEmail,
        phone: b.user?.phoneNumber ?? b.customerPhone,
      },
      consultationTitle: b.title,
      includes: type?.includes ?? [],
      mode,
      date: b.date ? toWebsiteDate(b.date) : null,
      slot: slotOf(b),
      amountMinor: b.amountPaise ?? b.order?.amount ?? null,
      currency: 'INR',
    };
  }

  private async guardUnique<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = JSON.stringify(err.meta?.target ?? '');
        if (target.includes('phoneNumber') || target.includes('email')) {
          throw new ConflictError(
            'A customer with this phone number or e-mail already exists. Select the existing customer instead.'
          );
        }
      }
      throw err;
    }
  }
}

export const bookingsService = new BookingsService();
