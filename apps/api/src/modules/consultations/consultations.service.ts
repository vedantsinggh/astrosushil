import { getRazorpayPublicKeyId } from '../payments/razorpay-public-key';
import { prisma } from '../../services/prisma.service';
import { commerceService } from '../commerce/commerce.service';
import { paymentService } from '../../services/payment.service';
import { notificationService } from '../notifications/notification.service';
import { liveSessionService, AdminUser } from '../admin/live-session.service';
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../../errors/app-error';
import {
  ConsultationMode,
  BookingStatus,
  FulfillmentStatus,
} from '@prisma/client';
import { fulfillmentService } from '../fulfillment/fulfillment.service';
import { settleOrderPaid } from '../commerce/money/settlement';
import { logger } from '../../utils/logger';
import { availabilityService } from '../availability/availability.service';
import {
  formatTimeOfDay,
  istInstant,
  normaliseCalendarDate,
  parseSlotInput,
  parseTimeOfDay,
} from '../availability/availability.time';
import {
  claimSlot,
  PRACTITIONER_ID,
  PRACTITIONER_NAME,
  releaseAllExpiredHolds,
  releaseSlot,
  RESERVATION_HOLD_MINUTES,
} from '../bookings/slot-hold';
import { computeGst } from './consultation-gst';
import { consultationTypesService, ResolvedOffering } from './consultation-types.service';

export interface SlotInterval {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
}

export interface BookConsultationInput {
  consultationId: string;
  mode: ConsultationMode;
  date: string; // YYYY-MM-DD
  slot: string | SlotInterval;
  birthProfileId?: string;
  name?: string;
  phone?: string;
  dob?: string;
  tob?: string;
  pob?: string;
  notes?: string;
  timezone?: string;
}

export interface VerifyConsultationPaymentInput {
  bookingId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export class ConsultationsService {
  private readonly defaultPractitionerId = PRACTITIONER_ID;
  private readonly defaultPractitionerName = PRACTITIONER_NAME;
  private readonly reservationTimeoutMinutes = RESERVATION_HOLD_MINUTES;

  /**
   * One bookable offering (a consultation type in one mode) in the shape the mobile app reads.
   * `id` is the commerce catalog id; `pricePaise` is what the customer pays, GST included.
   */
  private toOffering(offering: ResolvedOffering) {
    const { type, mode, pricing } = offering;
    return {
      id: mode.catalogId,
      title: type.title,
      description: type.description ?? '',
      pricePaise: pricing.totalPaise,
      priceWithGst: pricing.totalPaise / 100,
      currency: 'INR',
      durationMinutes: type.durationMinutes,
      mode: mode.mode,
      responseDays: type.responseDays,
      taxIncluded: mode.gst.type === 'INCLUSIVE',
      taxRateBasisPoints: pricing.rateBasisPoints,
      practitionerName: this.defaultPractitionerName,
      // Added with admin-editable consultation types (website fields).
      consultationTypeId: type.id === mode.catalogId ? null : type.id,
      type: type.type,
      includes: type.includes,
      priceLabel: type.priceLabel,
      note: type.note,
      basePricePaise: mode.pricePaise,
      gstPaise: pricing.gstPaise,
      unavailableDates: type.unavailableDates,
    };
  }

  /**
   * List all active consultation offerings with verified pricing and details: one entry per
   * consultation type and mode. Reads the in-memory snapshot; async callers refresh it first.
   */
  public listConsultations() {
    return consultationTypesService
      .all()
      .filter((type) => type.isActive)
      .flatMap((type) =>
        type.modes.map((mode) =>
          this.toOffering({ type, mode, pricing: computeGst(mode.pricePaise, mode.gst) })
        )
      )
      .sort((a, b) => a.pricePaise - b.pricePaise);
  }

  /**
   * Get single consultation offering by its catalog id (or by consultation type id when the
   * type has one mode)
   */
  public getConsultationById(consultationId: string) {
    return this.toOffering(consultationTypesService.resolveOffering(consultationId));
  }

  /**
   * Get genuinely available slots for a consultation offering and date
   */
  public async getAvailableSlots(options: {
    consultationId: string;
    date: string;
    timezone?: string;
  }): Promise<{
    available: boolean;
    date: string;
    slots: SlotInterval[];
    message?: string;
  }> {
    const dateStr = normaliseCalendarDate(options.date);
    await consultationTypesService.refresh();
    const { type } = consultationTypesService.resolveOffering(options.consultationId);

    // Working hours, blocked days and slots, bookings and live payment holds of every
    // consultation type, and the notice period: see AvailabilityService.listCustomerSlots.
    return availabilityService.listCustomerSlots(
      {
        title: type.title,
        durationMinutes: type.durationMinutes,
        responseDays: type.responseDays,
        unavailableDates: type.unavailableDates,
      },
      dateStr
    );
  }

  /**
   * Concurrency-safe atomic consultation booking creation.
   *
   * The slot is held from this moment (status RESERVED, for `reservationTimeoutMinutes`), before
   * the customer pays, so two customers can never both pay for the same or an overlapping time.
   */
  public async bookConsultation(
    userId: string,
    input: BookConsultationInput
  ) {
    // Fail fast before reserving a slot or creating an order if checkout cannot be configured.
    const razorpayKeyId = getRazorpayPublicKeyId();

    // Price the booking from the database, never from a stale snapshot.
    await consultationTypesService.refresh({ force: true });
    const offering = consultationTypesService.resolveOffering(input.consultationId, input.mode);
    const tier = this.toOffering(offering);
    const dateStr = normaliseCalendarDate(input.date);
    const duration = tier.durationMinutes;

    const range = parseSlotInput(input.slot, duration);
    const startTime = formatTimeOfDay(range.startMinute);
    const endTime = formatTimeOfDay(range.endMinute);

    // The slot must be one the customer would be offered: inside working hours, the type's own
    // length, not blocked, not inside the notice period.
    await availabilityService.assertCustomerCanBook(
      {
        title: offering.type.title,
        durationMinutes: duration,
        responseDays: offering.type.responseDays,
        unavailableDates: offering.type.unavailableDates,
      },
      dateStr,
      range
    );

    // UTC timestamps of the slot (IST wall clock, fixed +05:30)
    const slotStartTimeUtc = istInstant(dateStr, range.startMinute);
    const slotEndTimeUtc = istInstant(dateStr, range.endMinute);

    // Check user profile or info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, phoneNumber: true },
    });
    if (!user) {
      throw new NotFoundError(`User '${userId}' not found`);
    }

    const customerName = input.name || user.fullName || user.email || 'Valued Client';
    const customerPhone = input.phone || user.phoneNumber || null;
    const customerEmail = user.email;

    // Optional birth profile verification
    if (input.birthProfileId) {
      const profile = await prisma.birthProfile.findUnique({
        where: { id: input.birthProfileId },
        select: { id: true, userId: true },
      });
      if (!profile || profile.userId !== userId) {
        throw new NotFoundError('Selected birth profile does not exist or belong to your account');
      }
    }

    const expiresAt = new Date(Date.now() + this.reservationTimeoutMinutes * 60 * 1000);

    // Redis lock attempt (best-effort distributed lock)
    const redisLockKey = `slot:lock:${this.defaultPractitionerId}:${dateStr}:${startTime}`;
    await this._acquireRedisLock(redisLockKey, userId, this.reservationTimeoutMinutes * 60);

    try {
      // 1. Atomically create the PENDING_PAYMENT booking and hold its slot. claimSlot serialises
      //    calendar changes, releases expired holds and refuses any overlap with a booking or a
      //    live hold of any consultation type.
      const booking = await prisma.$transaction(async (tx) => {
        const created = await tx.consultationBooking.create({
          data: {
            userId,
            birthProfileId: input.birthProfileId || null,
            consultationId: tier.id,
            consultationTypeId: tier.consultationTypeId,
            title: tier.title,
            mode: offering.mode.mode,
            durationMinutes: duration,
            date: dateStr,
            startTime,
            endTime,
            slotStartTimeUtc,
            slotEndTimeUtc,
            timezone: input.timezone || 'Asia/Kolkata',
            practitionerId: this.defaultPractitionerId,
            practitionerName: this.defaultPractitionerName,
            status: BookingStatus.PENDING_PAYMENT,
            customerName,
            customerPhone,
            customerEmail,
            primaryQuestion: input.notes || null,
            reservationExpiresAt: expiresAt,
            source: 'USER',
            paymentMethod: 'RAZORPAY',
            pricePaise: offering.mode.pricePaise,
            gstRateBasisPoints: offering.pricing.rateBasisPoints,
            gstType: offering.pricing.type,
            taxablePaise: offering.pricing.taxablePaise,
            gstPaise: offering.pricing.gstPaise,
            amountPaise: offering.pricing.totalPaise,
            priceLabel: offering.type.priceLabel,
          },
        });

        await claimSlot(tx, {
          bookingId: created.id,
          date: dateStr,
          range,
          status: 'RESERVED',
          lockedUntil: expiresAt,
        });

        return created;
      });

      // 2. Create Order using unified CommerceService (the existing payment path). Done after
      //    the hold is committed so the calendar lock is not kept during the gateway call.
      let order: Awaited<ReturnType<typeof commerceService.createOrder>>;
      try {
        order = await commerceService.createOrder(
          {
            items: [
              {
                catalogId: tier.id,
                quantity: 1,
                metadata: {
                  bookingId: booking.id,
                  date: dateStr,
                  startTime,
                  mode: offering.mode.mode,
                  birthProfileId: input.birthProfileId,
                },
              },
            ],
            notes: `Booking for ${tier.title} on ${dateStr} at ${startTime}`,
          },
          { id: userId }
        );

        // The customer must be charged exactly the consultation's price with its GST (inclusive:
        // the price; exclusive: price + GST). The website charged the bare price for exclusive
        // GST in INR; here a mismatch stops the booking instead of under- or over-charging.
        if (order.amount !== offering.pricing.totalPaise) {
          logger.error(
            { bookingId: booking.id, catalogId: tier.id, orderAmount: order.amount, expected: offering.pricing.totalPaise },
            '[ConsultationsService] Commerce order amount differs from the consultation price'
          );
          throw new AppError(
            'This consultation cannot be booked right now. Please try again later.',
            500,
            'CONSULTATION_PRICE_MISMATCH'
          );
        }
      } catch (err) {
        await this.abandonReservation(booking.id, 'ORDER_CREATION_FAILED');
        throw err;
      }

      // 3. Link Order with Booking
      const paid = order as { paidCurrency?: string; paidAmountMinor?: number; exchangeRate?: string };
      const chargedCurrency = paid.paidCurrency || order.currency;
      const chargedAmount = paid.paidAmountMinor ?? order.amount;
      const updatedBooking = await prisma.consultationBooking.update({
        where: { id: booking.id },
        data: {
          orderId: order.orderId,
          // Only when the customer is charged in another currency (money module's quote).
          ...(chargedCurrency !== 'INR'
            ? { paidCurrency: chargedCurrency, paidAmountMinor: chargedAmount, exchangeRate: paid.exchangeRate ?? null }
            : {}),
        },
      });

      return {
        booking: this.withoutStaffFields(updatedBooking),
        order,
        razorpayConfig: {
          key: razorpayKeyId,
          orderId: order.razorpayOrderId,
          amount: chargedAmount,
          currency: chargedCurrency,
        },
      };
    } catch (err) {
      await this._releaseRedisLock(redisLockKey);
      throw err;
    }
  }

  /** Give up a reservation that could not reach checkout: cancel it and free its slot. */
  private async abandonReservation(bookingId: string, reason: string) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.consultationBooking.updateMany({
          where: { id: bookingId, status: BookingStatus.PENDING_PAYMENT },
          data: { status: BookingStatus.CANCELLED, cancellationReason: reason, cancelledAt: new Date() },
        });
        await releaseSlot(tx, bookingId);
      });
    } catch (err) {
      // The hold expires by itself after reservationTimeoutMinutes.
      logger.warn(
        { bookingId, err: err instanceof Error ? err.message : String(err) },
        '[ConsultationsService] Could not release an abandoned reservation'
      );
    }
  }

  /**
   * Verify payment and transition booking to CONFIRMED
   */
  public async verifyPayment(
    userId: string,
    input: VerifyConsultationPaymentInput,
    userRole: string = 'USER'
  ) {
    const booking = await prisma.consultationBooking.findUnique({
      where: { id: input.bookingId },
      include: { order: true },
    });

    if (!booking) {
      throw new NotFoundError(`Booking '${input.bookingId}' not found`);
    }

    if (booking.userId !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new NotFoundError(`Booking '${input.bookingId}' not found`);
    }

    if (booking.deletedAt) {
      throw new NotFoundError(`Booking '${input.bookingId}' not found`);
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      return { success: true, booking, message: 'Booking already confirmed' };
    }

    // The payment must be the one created for THIS booking: a valid signature for some other
    // (cheaper) Razorpay order must not confirm it.
    if (!booking.order || booking.order.razorpayOrderId !== input.razorpayOrderId) {
      throw new ValidationError('Order ID mismatch');
    }

    // Only an unpaid reservation can be confirmed. One whose hold has just expired is still
    // accepted here: the slot is re-claimed below and the confirmation fails if it was taken.
    const reservationExpired =
      booking.status === BookingStatus.CANCELLED && booking.cancellationReason === 'RESERVATION_EXPIRED';
    if (booking.status !== BookingStatus.PENDING_PAYMENT && !reservationExpired) {
      throw new ValidationError(`Cannot confirm a booking with status '${booking.status}'`);
    }

    // Verify HMAC signature
    const isValidSignature = paymentService.verifySignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature
    );

    if (!isValidSignature) {
      throw new ValidationError('Invalid Razorpay payment signature');
    }

    // The signature only proves that the gateway issued this payment id for this gateway order
    // id. Read the payment back and compare what was actually paid with the stored order
    // (gateway order id, amount, currency), as commerceService.verifyPayment does. Nothing is
    // marked paid on a mismatch.
    const expectedAmount = booking.order.paidAmountMinor ?? booking.order.amount;
    const expectedCurrency = booking.order.paidCurrency || booking.order.currency;
    const gatewayPayment = await paymentService.fetchRazorpayPayment(input.razorpayPaymentId);
    if (gatewayPayment) {
      const settled = gatewayPayment.status === 'captured' || gatewayPayment.status === 'authorized';
      if (
        gatewayPayment.id !== input.razorpayPaymentId ||
        gatewayPayment.orderId !== booking.order.razorpayOrderId ||
        gatewayPayment.amount !== expectedAmount ||
        gatewayPayment.currency.toUpperCase() !== expectedCurrency.toUpperCase() ||
        !settled
      ) {
        logger.error(
          {
            bookingId: booking.id,
            orderId: booking.orderId,
            expectedAmount,
            expectedCurrency,
            actualAmount: gatewayPayment.amount,
            actualCurrency: gatewayPayment.currency,
            orderIdMatches: gatewayPayment.orderId === booking.order.razorpayOrderId,
            paymentStatus: gatewayPayment.status,
          },
          '[ConsultationsService] Payment does not match the booking order; verification refused'
        );
        throw new AppError('Payment does not match this order', 400, 'PAYMENT_MISMATCH');
      }
    }

    const meetingLink =
      booking.mode === ConsultationMode.IN_PERSON
        ? null
        : `https://meet.astrosushil.com/consult-${booking.id.substring(0, 8)}`;

    const locationAddress =
      booking.mode === ConsultationMode.IN_PERSON
        ? 'Astro Sushil Vedic Centre, Sector 18, Noida / Delhi NCR'
        : null;

    const slotRange = {
      startMinute: parseTimeOfDay(booking.startTime),
      endMinute: parseTimeOfDay(booking.endTime),
    };

    // Transactionally confirm booking and update order
    const confirmedBooking = await prisma.$transaction(async (tx) => {
      let consultUnitId: string | null = null;
      let invoiceNumber: string | null = null;

      // 0. Take the slot for good. Refuses if, after this booking's hold expired, the time
      //    went to someone else; nothing below is written in that case.
      await claimSlot(tx, { bookingId: booking.id, date: booking.date, range: slotRange, status: 'BOOKED' });

      // 1. Update order and create fulfillment units
      if (booking.orderId) {
        // Lock Order FIRST
        await tx.$queryRaw`
          SELECT id FROM "orders" WHERE id = ${booking.orderId} FOR UPDATE;
        `;

        // Lock OrderItems SECOND
        await tx.$queryRaw`
          SELECT id FROM "order_items" WHERE "orderId" = ${booking.orderId} ORDER BY id ASC FOR UPDATE;
        `;

        // Transition order to PAID atomically
        await tx.$executeRaw`
          UPDATE "orders"
          SET
            status = 'PAID'::"OrderStatus",
            "paymentStatus" = 'CAPTURED'::"PaymentStatus",
            "paidAt" = clock_timestamp(),
            "version" = version + 1,
            "razorpayPaymentId" = ${input.razorpayPaymentId},
            "updatedAt" = clock_timestamp()
          WHERE id = ${booking.orderId};
        `;

        // Money: ledger transaction -> SUCCESS and the invoice number, in this same transaction
        // (the order row is locked above; settleOrderPaid is safe to repeat after the webhook).
        const settlement = await settleOrderPaid(tx, booking.orderId, {
          gatewayPaymentId: input.razorpayPaymentId,
          gatewayOrderId: input.razorpayOrderId,
          raw: gatewayPayment?.raw,
        });
        invoiceNumber = settlement.invoice.number ?? null;

        // Create fulfillment units
        await fulfillmentService.createFulfillmentUnitsForOrder(booking.orderId, tx);

        // Find CONSULTATION fulfillment unit
        const units = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "fulfillment_units"
          WHERE "orderId" = ${booking.orderId} AND "obligationType" = 'CONSULTATION'::"ObligationType"
          ORDER BY "unitIndex" ASC
          LIMIT 1;
        `;
        consultUnitId = units[0]?.id || null;
      }

      // 2. Update booking
      const updated = await tx.consultationBooking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
          fulfillmentUnitId: consultUnitId || undefined,
          confirmedAt: new Date(),
          reservationExpiresAt: null,
          cancellationReason: null,
          ...(invoiceNumber ? { invoiceNumber } : {}),
          meetingLink,
          locationAddress,
        },
      });

      // 3. The appointment slot was marked BOOKED by claimSlot above.

      // 4. Reconcile fulfillment unit
      if (booking.orderId && consultUnitId) {
        await fulfillmentService.reconcileFulfillmentUnit(booking.orderId, consultUnitId, tx);
      }

      return updated;
    }).catch((err) => {
      if (err instanceof ConflictError) {
        // Paid, but the time is gone. Staff see this booking under payment conflicts
        // (bookingsService.listPaymentConflicts) once the payment is captured.
        logger.error(
          { bookingId: booking.id, orderId: booking.orderId },
          '[ConsultationsService] Payment verified for a slot that is no longer free'
        );
        throw new ConflictError(
          'Your payment was received, but this slot is no longer available. Our team will contact you to reschedule or refund.'
        );
      }
      throw err;
    });

    // Send confirmation notification
    try {
      await notificationService.sendNotification({
        userId: booking.userId,
        type: 'BOOKING_CONFIRMED',
        entityId: confirmedBooking.id,
        route: 'OPEN_CONSULTATIONS',
        templateData: {
          consultationTitle: confirmedBooking.title,
          date: confirmedBooking.date,
          startTime: confirmedBooking.startTime,
          mode: confirmedBooking.mode,
          meetingLink: confirmedBooking.meetingLink,
          includes: this.includesOf(confirmedBooking),
        },
      });
    } catch (e: any) {
      logger.warn({ err: e?.message }, '[ConsultationsService] Failed to send booking notification');
    }

    return {
      success: true,
      booking: confirmedBooking,
      message: 'Consultation appointment confirmed successfully',
    };
  }

  /**
   * Get user's consultation bookings (My Bookings)
   */
  public async getMyBookings(userId: string) {
    const bookings = await prisma.consultationBooking.findMany({
      where: { userId, deletedAt: null },
      include: {
        birthProfile: {
          select: { id: true, name: true, dateOfBirth: true, timeOfBirth: true, placeName: true },
        },
        order: {
          select: { id: true, amount: true, currency: true, paymentStatus: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((b) => this.withoutStaffFields(b));
  }

  /** "What is included" of the booking's consultation type, for the confirmation messages. */
  private includesOf(booking: { consultationTypeId: string | null; consultationId: string }): string[] {
    const type = consultationTypesService
      .all()
      .find((t) => t.id === booking.consultationTypeId || t.modes.some((m) => m.catalogId === booking.consultationId));
    return type?.includes ?? [];
  }

  /** Staff-only columns never leave the server on a customer endpoint. */
  private withoutStaffFields<T extends { internalNotes?: unknown }>(booking: T) {
    return {
      ...booking,
      internalNotes: undefined,
      createdByAdminId: undefined,
      deletedById: undefined,
      deletedAt: undefined,
      legacyId: undefined,
    };
  }

  /**
   * Get booking details with strict IDOR defense
   */
  public async getBookingById(
    userId: string,
    bookingId: string,
    isAdmin: boolean = false
  ) {
    const booking = await prisma.consultationBooking.findUnique({
      where: { id: bookingId },
      include: {
        birthProfile: true,
        order: true,
        sessions: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            endedAt: true,
            durationSeconds: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError(`Booking '${bookingId}' not found`);
    }

    if (booking.userId !== userId && !isAdmin) {
      // 404 to avoid enumeration
      throw new NotFoundError(`Booking '${bookingId}' not found`);
    }

    // Hide staff-only fields from non-admin users; a booking deleted by staff no longer exists for them
    if (!isAdmin) {
      if (booking.deletedAt) {
        throw new NotFoundError(`Booking '${bookingId}' not found`);
      }
      return this.withoutStaffFields(booking);
    }

    return booking;
  }

  /**
   * Reschedule an existing confirmed consultation
   */
  public async rescheduleBooking(
    userId: string,
    bookingId: string,
    input: { newDate: string; newSlot: string | SlotInterval; reason?: string },
    isAdmin: boolean = false
  ) {
    const booking = await prisma.consultationBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.deletedAt) {
      throw new NotFoundError(`Booking '${bookingId}' not found`);
    }

    if (booking.userId !== userId && !isAdmin) {
      throw new NotFoundError(`Booking '${bookingId}' not found`);
    }

    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.RESCHEDULED) {
      throw new ValidationError(`Cannot reschedule a booking with status '${booking.status}'`);
    }

    const newDate = normaliseCalendarDate(input.newDate);
    const range = parseSlotInput(input.newSlot, booking.durationMinutes);
    const newStartTime = formatTimeOfDay(range.startMinute);
    const newEndTime = formatTimeOfDay(range.endMinute);

    // A customer may only move to a slot they could have booked: inside working hours, not on a
    // blocked day or slot, and not inside the notice period. Staff are not bound by these (as on
    // the website); nobody can move onto another booking.
    if (!isAdmin) {
      await consultationTypesService.refresh();
      let responseDays = 0;
      let unavailableDates: string[] = [];
      try {
        const offering = consultationTypesService.resolveOffering(booking.consultationId, null, { includeInactive: true });
        responseDays = offering.type.responseDays;
        unavailableDates = offering.type.unavailableDates;
      } catch (_) {
        // The consultation type no longer exists: only the calendar rules apply.
      }
      await availabilityService.assertCustomerCanBook(
        { title: booking.title, durationMinutes: booking.durationMinutes, responseDays, unavailableDates },
        newDate,
        range
      );
    }

    // Atomically swap slots (claimSlot releases the old one and refuses an overlap)
    const updated = await prisma.$transaction(async (tx) => {
      const utc = await claimSlot(tx, { bookingId: booking.id, date: newDate, range, status: 'BOOKED' });

      return await tx.consultationBooking.update({
        where: { id: booking.id },
        data: {
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          slotStartTimeUtc: utc.startUtc,
          slotEndTimeUtc: utc.endUtc,
          status: BookingStatus.RESCHEDULED,
          rescheduleReason: input.reason || null,
          // The reminder already sent was for the old time.
          reminderSentAt: null,
        },
      });
    });

    // Notify user
    try {
      await notificationService.sendNotification({
        userId: booking.userId,
        type: 'BOOKING_RESCHEDULED',
        entityId: updated.id,
        templateData: {
          consultationTitle: updated.title,
          date: updated.date,
          startTime: updated.startTime,
          // The previous schedule, for the website's reschedule e-mail / WhatsApp / SMS.
          oldDate: booking.date,
          oldStartTime: booking.startTime,
          oldEndTime: booking.endTime,
          includes: this.includesOf(updated),
        },
      });
    } catch (_) {}

    return updated;
  }

  /**
   * Cancel consultation booking and release capacity
   */
  public async cancelBooking(
    userId: string,
    bookingId: string,
    reason?: string,
    isAdmin: boolean = false
  ) {
    const booking = await prisma.consultationBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking || booking.deletedAt) {
      throw new NotFoundError(`Booking '${bookingId}' not found`);
    }

    if (booking.userId !== userId && !isAdmin) {
      throw new NotFoundError(`Booking '${bookingId}' not found`);
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.COMPLETED) {
      throw new ValidationError(`Booking is already ${booking.status.toLowerCase()}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Release slot
      await releaseSlot(tx, booking.id);

      const updatedBooking = await tx.consultationBooking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: reason || null,
          cancelledAt: new Date(),
        },
      });

      // Update order fulfillment via reconciliation without destroying other items
      if (booking.orderId && booking.fulfillmentUnitId) {
        await fulfillmentService.reconcileFulfillmentUnit(booking.orderId, booking.fulfillmentUnitId, tx);
      } else if (booking.orderId) {
        await tx.order.update({
          where: { id: booking.orderId },
          data: { fulfillmentStatus: FulfillmentStatus.CANCELLED },
        });
      }

      return updatedBooking;
    });

    try {
      await notificationService.sendNotification({
        userId: booking.userId,
        type: 'BOOKING_CANCELLED',
        entityId: updated.id,
        templateData: {
          consultationTitle: updated.title,
          reason,
        },
      });
    } catch (_) {}

    return updated;
  }

  /**
   * Admin list bookings with filtering
   */
  public async adminListBookings(filters: {
    date?: string;
    status?: BookingStatus;
    consultationId?: string;
    userId?: string;
  }) {
    // Bookings deleted by staff are hidden everywhere (website `isDeleted`).
    const where: any = { deletedAt: null };
    if (filters.date) where.date = filters.date;
    if (filters.status) where.status = filters.status;
    if (filters.consultationId) where.consultationId = filters.consultationId;
    if (filters.userId) where.userId = filters.userId;

    const bookings = await prisma.consultationBooking.findMany({
      where,
      include: {
        birthProfile: {
          select: { id: true, name: true, dateOfBirth: true, timeOfBirth: true, placeName: true },
        },
        order: {
          select: { id: true, amount: true, currency: true, paymentStatus: true },
        },
        user: {
          select: { id: true, email: true, fullName: true, phoneNumber: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    return bookings;
  }

  /**
   * Admin start Live Session for booking
   */
  public async adminStartLiveSession(adminUser: AdminUser, bookingId: string) {
    const booking = await prisma.consultationBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundError(`Booking '${bookingId}' not found`);
    }

    if (!booking.birthProfileId) {
      throw new ValidationError('Cannot start Live Session without an associated client Birth Profile');
    }

    // Call existing LiveSessionService
    const sessionResult = await liveSessionService.createSession(
      {
        userId: booking.userId,
        birthProfileId: booking.birthProfileId,
      },
      adminUser
    );

    // Link booking with session
    await prisma.consultationSession.update({
      where: { id: sessionResult.session.id },
      data: { bookingId: booking.id },
    });

    return {
      session: sessionResult.session,
      client: sessionResult.client,
      birthProfile: sessionResult.birthProfile,
      bookingId: booking.id,
    };
  }

  /**
   * Release expired unpaid reservations: the slot is free again and the unpaid booking is
   * cancelled with reason RESERVATION_EXPIRED. Returns how many bookings were cancelled.
   */
  public async releaseExpiredReservations() {
    return releaseAllExpiredHolds();
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------


  private redisClient: any = null;

  private async _getRedisClient(): Promise<any> {
    if (this.redisClient) return this.redisClient;
    try {
      const redisUrl = process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:6379` : 'redis://localhost:6379');
      const { default: Redis } = await import('ioredis').catch(() => ({ default: null as any }));
      if (!Redis) return null;
      const client = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
      await client.connect();
      this.redisClient = client;
      return this.redisClient;
    } catch (_) {
      return null;
    }
  }

  private async _acquireRedisLock(key: string, val: string, ttlSec: number): Promise<boolean> {
    try {
      const client = await this._getRedisClient();
      if (!client) return true;
      const res = await client.set(key, val, 'EX', ttlSec, 'NX');
      return res === 'OK';
    } catch (_) {
      return true; // Fallback to DB locking
    }
  }

  private async _releaseRedisLock(key: string): Promise<void> {
    try {
      const client = await this._getRedisClient();
      if (!client) return;
      await client.del(key);
    } catch (_) {}
  }
}

export const consultationsService = new ConsultationsService();
