import { prisma } from '../../services/prisma.service';
import { COMMERCE_CATALOG, CatalogItem } from '../commerce/commerce.catalog';
import { commerceService } from '../commerce/commerce.service';
import { paymentService } from '../../services/payment.service';
import { notificationService } from '../notifications/notification.service';
import { liveSessionService, AdminUser } from '../admin/live-session.service';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  AuthorizationError,
} from '../../errors/app-error';
import {
  ConsultationMode,
  BookingStatus,
  SlotStatus,
  OrderItemType,
  PaymentStatus,
  FulfillmentStatus,
} from '@prisma/client';
import { logger } from '../../utils/logger';

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
  private readonly defaultPractitionerId = 'astro-sushil';
  private readonly defaultPractitionerName = 'Astro Sushil';
  private readonly reservationTimeoutMinutes = 15;

  /**
   * List all active consultation offerings with verified pricing and details
   */
  public listConsultations() {
    const items = Object.values(COMMERCE_CATALOG)
      .filter((item) => item.itemType === OrderItemType.CONSULTATION && item.isActive)
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        pricePaise: item.pricePaise,
        priceWithGst: item.pricePaise / 100,
        currency: item.currency,
        durationMinutes: item.durationMinutes || 30,
        mode: item.consultationMode || 'AUDIO',
        responseDays: item.responseDays || 7,
        taxIncluded: item.taxIncluded,
        taxRateBasisPoints: item.taxRateBasisPoints,
        practitionerName: this.defaultPractitionerName,
      }));

    return items;
  }

  /**
   * Get single consultation offering by ID
   */
  public getConsultationById(consultationId: string) {
    const item = COMMERCE_CATALOG[consultationId];
    if (!item || item.itemType !== OrderItemType.CONSULTATION || !item.isActive) {
      throw new NotFoundError(`Consultation offering '${consultationId}' not found`);
    }

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      pricePaise: item.pricePaise,
      priceWithGst: item.pricePaise / 100,
      currency: item.currency,
      durationMinutes: item.durationMinutes || 30,
      mode: item.consultationMode || 'AUDIO',
      responseDays: item.responseDays || 7,
      taxIncluded: item.taxIncluded,
      taxRateBasisPoints: item.taxRateBasisPoints,
      practitionerName: this.defaultPractitionerName,
    };
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
    const tier = this.getConsultationById(options.consultationId);
    const dateStr = options.date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
    if (isNaN(targetDate.getTime())) {
      throw new ValidationError('Invalid date format. Expected YYYY-MM-DD');
    }

    const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Notice window check: target date must be at least responseDays in future
    if (diffDays < tier.responseDays) {
      return {
        available: false,
        date: dateStr,
        slots: [],
        message: `This day is blocked. Minimum booking notice for ${tier.title} is ${tier.responseDays} day(s).`,
      };
    }

    // Booking horizon check (e.g. 60 days)
    if (diffDays > 60) {
      return {
        available: false,
        date: dateStr,
        slots: [],
        message: 'This day is blocked. Booking horizon is up to 60 days in advance.',
      };
    }

    // Day of week check (Sunday blocked for regular consultations)
    const dayOfWeek = targetDate.getUTCDay(); // 0 is Sunday
    if (dayOfWeek === 0) {
      return {
        available: false,
        date: dateStr,
        slots: [],
        message: 'This day is blocked. Sunday is reserved for special temple rituals.',
      };
    }

    // Clean up expired reservations first
    await this.releaseExpiredReservations();

    // Generate base working hour slots
    // Morning: 11:00 to 14:00 | Afternoon: 15:00 to 19:00
    const duration = tier.durationMinutes;
    const baseSlots = this._generateStandardSlots(duration);

    // Fetch occupied slots from database for this date & practitioner
    const occupiedSlots = await prisma.appointmentSlot.findMany({
      where: {
        practitionerId: this.defaultPractitionerId,
        date: dateStr,
        OR: [
          { status: SlotStatus.BOOKED },
          { status: SlotStatus.BLOCKED },
          {
            status: SlotStatus.RESERVED,
            lockedUntil: { gt: new Date() },
          },
        ],
      },
      select: { startTime: true },
    });

    const occupiedTimes = new Set(occupiedSlots.map((s) => s.startTime));

    // Also check bookings directly in case of legacy records
    const occupiedBookings = await prisma.consultationBooking.findMany({
      where: {
        practitionerId: this.defaultPractitionerId,
        date: dateStr,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED] },
      },
      select: { startTime: true },
    });

    for (const b of occupiedBookings) {
      occupiedTimes.add(b.startTime);
    }

    const availableSlots = baseSlots.filter((slot) => !occupiedTimes.has(slot.startTime));

    return {
      available: availableSlots.length > 0,
      date: dateStr,
      slots: availableSlots,
      message: availableSlots.length > 0 ? 'Slots fetched' : 'All slots on this date are fully booked',
    };
  }

  /**
   * Concurrency-safe atomic consultation booking creation
   */
  public async bookConsultation(
    userId: string,
    input: BookConsultationInput
  ) {
    const tier = this.getConsultationById(input.consultationId);
    const dateStr = input.date;
    const duration = tier.durationMinutes;

    const startTime = typeof input.slot === 'string' ? input.slot : input.slot.startTime;
    const endTime =
      typeof input.slot === 'object' && input.slot.endTime
        ? input.slot.endTime
        : this._calculateEndTime(startTime, duration);

    // Compute UTC timestamps for slot (assuming Asia/Kolkata +05:30)
    const slotStartTimeUtc = this._parseTimeToUtc(dateStr, startTime);
    const slotEndTimeUtc = this._parseTimeToUtc(dateStr, endTime);

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
      // Execute atomic database reservation transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Check existing active booking on this slot
        const existingBooking = await tx.consultationBooking.findFirst({
          where: {
            practitionerId: this.defaultPractitionerId,
            date: dateStr,
            startTime,
            status: {
              in: [
                BookingStatus.CONFIRMED,
                BookingStatus.RESCHEDULED,
                BookingStatus.PENDING_PAYMENT,
              ],
            },
            OR: [
              { reservationExpiresAt: null },
              { reservationExpiresAt: { gt: new Date() } },
            ],
          },
        });

        if (existingBooking) {
          throw new ConflictError(
            'This consultation slot has already been reserved or booked. Please select another slot.'
          );
        }

        // 2. Lock or create appointment slot
        const existingSlot = await tx.appointmentSlot.findUnique({
          where: {
            practitionerId_date_startTime: {
              practitionerId: this.defaultPractitionerId,
              date: dateStr,
              startTime,
            },
          },
        });

        if (
          existingSlot &&
          (existingSlot.status === SlotStatus.BOOKED ||
            existingSlot.status === SlotStatus.BLOCKED ||
            (existingSlot.status === SlotStatus.RESERVED &&
              existingSlot.lockedUntil &&
              existingSlot.lockedUntil > new Date()))
        ) {
          throw new ConflictError(
            'This consultation slot has already been reserved or booked. Please select another slot.'
          );
        }

        // 3. Create the ConsultationBooking in PENDING_PAYMENT state
        const booking = await tx.consultationBooking.create({
          data: {
            userId,
            birthProfileId: input.birthProfileId || null,
            consultationId: tier.id,
            title: tier.title,
            mode: input.mode,
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
          },
        });

        // 4. Upsert AppointmentSlot setting status = RESERVED
        if (existingSlot) {
          await tx.appointmentSlot.update({
            where: { id: existingSlot.id },
            data: {
              status: SlotStatus.RESERVED,
              bookingId: booking.id,
              lockedUntil: expiresAt,
            },
          });
        } else {
          await tx.appointmentSlot.create({
            data: {
              practitionerId: this.defaultPractitionerId,
              date: dateStr,
              startTime,
              endTime,
              startTimeUtc: slotStartTimeUtc,
              endTimeUtc: slotEndTimeUtc,
              status: SlotStatus.RESERVED,
              bookingId: booking.id,
              lockedUntil: expiresAt,
            },
          });
        }

        // 5. Create Order using unified CommerceService
        const order = await commerceService.createOrder(
          {
            items: [
              {
                catalogId: tier.id,
                quantity: 1,
                metadata: {
                  bookingId: booking.id,
                  date: dateStr,
                  startTime,
                  mode: input.mode,
                  birthProfileId: input.birthProfileId,
                },
              },
            ],
            notes: `Booking for ${tier.title} on ${dateStr} at ${startTime}`,
          },
          { id: userId }
        );

        // 6. Link Order with Booking
        const updatedBooking = await tx.consultationBooking.update({
          where: { id: booking.id },
          data: { orderId: order.orderId },
        });

        return {
          booking: updatedBooking,
          order,
          razorpayConfig: {
            key: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
            orderId: order.razorpayOrderId,
            amount: order.amount,
            currency: order.currency,
          },
        };
      });

      return result;
    } catch (err) {
      await this._releaseRedisLock(redisLockKey);
      throw err;
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

    if (booking.status === BookingStatus.CONFIRMED) {
      return { success: true, booking, message: 'Booking already confirmed' };
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

    const meetingLink =
      booking.mode === ConsultationMode.IN_PERSON
        ? null
        : `https://meet.astrosushil.com/consult-${booking.id.substring(0, 8)}`;

    const locationAddress =
      booking.mode === ConsultationMode.IN_PERSON
        ? 'Astro Sushil Vedic Centre, Sector 18, Noida / Delhi NCR'
        : null;

    // Transactionally confirm booking and update order
    const confirmedBooking = await prisma.$transaction(async (tx) => {
      // 1. Update order
      if (booking.orderId) {
        await tx.order.update({
          where: { id: booking.orderId },
          data: {
            status: 'PAID',
            paymentStatus: PaymentStatus.CAPTURED,
            fulfillmentStatus: FulfillmentStatus.SCHEDULED,
            razorpayPaymentId: input.razorpayPaymentId,
          },
        });
      }

      // 2. Update booking
      const updated = await tx.consultationBooking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CONFIRMED,
          confirmedAt: new Date(),
          reservationExpiresAt: null,
          meetingLink,
          locationAddress,
        },
      });

      // 3. Mark appointment slot as BOOKED
      await tx.appointmentSlot.updateMany({
        where: { bookingId: booking.id },
        data: {
          status: SlotStatus.BOOKED,
          lockedUntil: null,
        },
      });

      return updated;
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
      where: { userId },
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

    return bookings;
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

    // Hide internal notes from non-admin users
    if (!isAdmin) {
      return {
        ...booking,
        internalNotes: undefined,
      };
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

    if (!booking) {
      throw new NotFoundError(`Booking '${bookingId}' not found`);
    }

    if (booking.userId !== userId && !isAdmin) {
      throw new NotFoundError(`Booking '${bookingId}' not found`);
    }

    if (booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.RESCHEDULED) {
      throw new ValidationError(`Cannot reschedule a booking with status '${booking.status}'`);
    }

    const newStartTime =
      typeof input.newSlot === 'string' ? input.newSlot : input.newSlot.startTime;
    const newEndTime =
      typeof input.newSlot === 'object' && input.newSlot.endTime
        ? input.newSlot.endTime
        : this._calculateEndTime(newStartTime, booking.durationMinutes);

    const slotStartTimeUtc = this._parseTimeToUtc(input.newDate, newStartTime);
    const slotEndTimeUtc = this._parseTimeToUtc(input.newDate, newEndTime);

    // Atomically swap slots
    const updated = await prisma.$transaction(async (tx) => {
      // Check if new slot is taken
      const occupied = await tx.appointmentSlot.findFirst({
        where: {
          practitionerId: booking.practitionerId,
          date: input.newDate,
          startTime: newStartTime,
          OR: [
            { status: SlotStatus.BOOKED },
            { status: SlotStatus.BLOCKED },
            { status: SlotStatus.RESERVED, lockedUntil: { gt: new Date() } },
          ],
        },
      });

      if (occupied) {
        throw new ConflictError('The requested new slot is not available. Please choose another.');
      }

      // Release old slot
      await tx.appointmentSlot.updateMany({
        where: { bookingId: booking.id },
        data: { status: SlotStatus.AVAILABLE, bookingId: null, lockedUntil: null },
      });

      // Upsert new slot
      await tx.appointmentSlot.upsert({
        where: {
          practitionerId_date_startTime: {
            practitionerId: booking.practitionerId,
            date: input.newDate,
            startTime: newStartTime,
          },
        },
        create: {
          practitionerId: booking.practitionerId,
          date: input.newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          startTimeUtc: slotStartTimeUtc,
          endTimeUtc: slotEndTimeUtc,
          status: SlotStatus.BOOKED,
          bookingId: booking.id,
        },
        update: {
          status: SlotStatus.BOOKED,
          bookingId: booking.id,
          lockedUntil: null,
        },
      });

      // Update booking
      return await tx.consultationBooking.update({
        where: { id: booking.id },
        data: {
          date: input.newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          slotStartTimeUtc,
          slotEndTimeUtc,
          status: BookingStatus.RESCHEDULED,
          rescheduleReason: input.reason || null,
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

    if (!booking) {
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
      await tx.appointmentSlot.updateMany({
        where: { bookingId: booking.id },
        data: { status: SlotStatus.AVAILABLE, bookingId: null, lockedUntil: null },
      });

      // Update order fulfillment
      if (booking.orderId) {
        await tx.order.update({
          where: { id: booking.orderId },
          data: { fulfillmentStatus: FulfillmentStatus.CANCELLED },
        });
      }

      return await tx.consultationBooking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: reason || null,
          cancelledAt: new Date(),
        },
      });
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
    const where: any = {};
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
   * Release expired unpaid reservations
   */
  public async releaseExpiredReservations() {
    const now = new Date();

    const expiredBookings = await prisma.consultationBooking.findMany({
      where: {
        status: BookingStatus.PENDING_PAYMENT,
        reservationExpiresAt: { lte: now },
      },
      select: { id: true },
    });

    if (expiredBookings.length === 0) return 0;

    const expiredIds = expiredBookings.map((b) => b.id);

    await prisma.$transaction([
      prisma.appointmentSlot.updateMany({
        where: { bookingId: { in: expiredIds } },
        data: { status: SlotStatus.AVAILABLE, bookingId: null, lockedUntil: null },
      }),
      prisma.consultationBooking.updateMany({
        where: { id: { in: expiredIds } },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: 'RESERVATION_EXPIRED',
        },
      }),
    ]);

    return expiredIds.length;
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private _generateStandardSlots(durationMinutes: number): SlotInterval[] {
    const slots: SlotInterval[] = [];

    // Morning Session: 11:00 to 14:00 (180 mins)
    this._addSlotRange(slots, 11, 0, 14, 0, durationMinutes);

    // Afternoon Session: 15:00 to 19:00 (240 mins)
    this._addSlotRange(slots, 15, 0, 19, 0, durationMinutes);

    return slots;
  }

  private _addSlotRange(
    slots: SlotInterval[],
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    durationMinutes: number
  ) {
    let current = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    while (current + durationMinutes <= end) {
      const sH = String(Math.floor(current / 60)).padStart(2, '0');
      const sM = String(current % 60).padStart(2, '0');
      const next = current + durationMinutes;
      const eH = String(Math.floor(next / 60)).padStart(2, '0');
      const eM = String(next % 60).padStart(2, '0');

      slots.push({
        startTime: `${sH}:${sM}`,
        endTime: `${eH}:${eM}`,
      });

      current += durationMinutes;
    }
  }

  private _calculateEndTime(startTime: string, durationMinutes: number): string {
    const [h, m] = startTime.split(':').map(Number);
    const totalMinutes = h * 60 + m + durationMinutes;
    const eH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const eM = String(totalMinutes % 60).padStart(2, '0');
    return `${eH}:${eM}`;
  }

  private _parseTimeToUtc(dateStr: string, timeStr: string): Date {
    // Assuming IST (+05:30)
    // Convert YYYY-MM-DD and HH:mm to UTC Date
    const [h, m] = timeStr.split(':').map(Number);
    // IST is UTC + 5:30 -> UTC is IST - 5h 30m
    const utcDate = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000+05:30`);
    return utcDate;
  }

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
