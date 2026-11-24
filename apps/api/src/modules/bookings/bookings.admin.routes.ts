/**
 * Admin endpoints for consultation types, availability and bookings (website admin screens
 * Consultations, Bookings, Global Setting > Availability, Calendar).
 *
 * Registered without a prefix; every path starts with /admin/. Each route checks a permission
 * on the server with the database-backed checker, and every state-changing action writes an
 * audit entry through adminService.logAction.
 */
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { adminService } from '../admin/admin.service';
import { checkPermission } from '../admin/rbac/check-permission';
import { availabilityService } from '../availability/availability.service';
import {
  adminSlotsQuerySchema,
  blockedDatesQuerySchema,
  dateRangeBodySchema,
  dayBodySchema,
  scheduleQuerySchema,
  setAvailabilitySchema,
  slotsBodySchema,
} from '../availability/availability.schemas';
import { consultationTypesService } from '../consultations/consultation-types.service';
import {
  consultationTypeBlockDateSchema,
  consultationTypeIdParamSchema,
  createConsultationTypeSchema,
  updateConsultationTypeSchema,
} from '../consultations/consultation-types.schemas';
import {
  addBookingNoteSchema,
  adminBookingExportQuerySchema,
  adminBookingListQuerySchema,
  adminRescheduleSchema,
  bookingIdParamSchema,
  bookingQuoteSchema,
  bookingsByDateQuerySchema,
  changePlanSchema,
  manualBookingSchema,
  resolveConflictRefundSchema,
  resolveConflictSlotSchema,
} from './bookings.schemas';
import { issueStaffRefund } from '../payments/payments.admin.routes';
import { bookingsService, toCsv } from './bookings.service';

function send(reply: FastifyReply, data: unknown, message: string, statusCode: number = 200) {
  return reply.status(statusCode).send({ statusCode, success: true, message, data });
}

/** Audit entry for a state-changing action. `details` never carries a customer's contact data. */
async function audit(request: FastifyRequest, action: string, resource: string, details?: string) {
  await adminService.logAction({
    adminId: request.user.id,
    adminEmail: (request.user as { email?: string }).email || request.user.id,
    action,
    resource,
    details,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  });
}

export async function bookingsAdminRoutes(fastify: FastifyInstance) {
  await fastify.register(async (admin) => {
    admin.addHook('onRequest', fastify.authenticate);
    admin.addHook('onRequest', fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']));

    const actor = (request: FastifyRequest) => ({
      id: request.user.id,
      email: (request.user as { email?: string }).email,
    });

    // =========================================================================
    // Consultation types
    // =========================================================================

    admin.get('/admin/consultation-types', {
      preHandler: [checkPermission('consultations:read')],
      schema: { tags: ['Admin Consultation Types'], summary: 'All consultation types, newest first' },
      handler: async (_request, reply) => send(reply, await consultationTypesService.listAdmin(), 'Consultations fetched'),
    });

    admin.get('/admin/consultation-types/flat', {
      preHandler: [checkPermission('consultations:read')],
      schema: { tags: ['Admin Consultation Types'], summary: 'One row per consultation type and mode (booking drawer)' },
      handler: async (_request, reply) =>
        send(reply, await consultationTypesService.listAdminFlat(), 'Admin consultations fetched'),
    });

    admin.get('/admin/consultation-types/:id', {
      preHandler: [checkPermission('consultations:read')],
      schema: { tags: ['Admin Consultation Types'], summary: 'One consultation type' },
      handler: async (request, reply) => {
        const { id } = consultationTypeIdParamSchema.parse(request.params);
        return send(reply, await consultationTypesService.getAdmin(id), 'Consultation fetched');
      },
    });

    admin.post('/admin/consultation-types', {
      preHandler: [checkPermission('consultations:create')],
      schema: { tags: ['Admin Consultation Types'], summary: 'Create a consultation type' },
      handler: async (request, reply) => {
        const body = createConsultationTypeSchema.parse(request.body);
        const created = await consultationTypesService.create(body);
        await audit(request, 'CONSULTATION_TYPE_CREATE', `ConsultationType:${created.id}`, `Created "${created.title}"`);
        return send(reply, created, 'Consultation created', 201);
      },
    });

    admin.put('/admin/consultation-types/:id', {
      preHandler: [checkPermission('consultations:update')],
      schema: { tags: ['Admin Consultation Types'], summary: 'Update a consultation type (modes are merged by mode)' },
      handler: async (request, reply) => {
        const { id } = consultationTypeIdParamSchema.parse(request.params);
        const body = updateConsultationTypeSchema.parse(request.body);
        const updated = await consultationTypesService.update(id, body);
        await audit(request, 'CONSULTATION_TYPE_UPDATE', `ConsultationType:${id}`, `Fields: ${Object.keys(body).join(', ')}`);
        return send(reply, updated, 'Consultation updated successfully');
      },
    });

    admin.delete('/admin/consultation-types/:id', {
      preHandler: [checkPermission('consultations:delete')],
      schema: { tags: ['Admin Consultation Types'], summary: 'Delete a consultation type' },
      handler: async (request, reply) => {
        const { id } = consultationTypeIdParamSchema.parse(request.params);
        await consultationTypesService.remove(id);
        await audit(request, 'CONSULTATION_TYPE_DELETE', `ConsultationType:${id}`);
        return send(reply, null, 'Consultation deleted successfully');
      },
    });

    admin.get('/admin/consultation-types/:id/blocked-dates', {
      preHandler: [checkPermission('consultations:read')],
      schema: { tags: ['Admin Consultation Types'], summary: 'Dates on which this type cannot be booked' },
      handler: async (request, reply) => {
        const { id } = consultationTypeIdParamSchema.parse(request.params);
        return send(reply, await consultationTypesService.getBlockedDates(id), 'Blocked dates fetched');
      },
    });

    admin.post('/admin/consultation-types/:id/block-date', {
      preHandler: [checkPermission('consultations:update')],
      schema: { tags: ['Admin Consultation Types'], summary: 'Block one date for this type' },
      handler: async (request, reply) => {
        const { id } = consultationTypeIdParamSchema.parse(request.params);
        const { date } = consultationTypeBlockDateSchema.parse(request.body);
        const dates = await consultationTypesService.blockDate(id, date);
        await audit(request, 'CONSULTATION_TYPE_BLOCK_DATE', `ConsultationType:${id}`, `Blocked ${date}`);
        return send(reply, dates, 'Date blocked');
      },
    });

    admin.post('/admin/consultation-types/:id/unblock-date', {
      preHandler: [checkPermission('consultations:update')],
      schema: { tags: ['Admin Consultation Types'], summary: 'Unblock one date for this type' },
      handler: async (request, reply) => {
        const { id } = consultationTypeIdParamSchema.parse(request.params);
        const { date } = consultationTypeBlockDateSchema.parse(request.body);
        const dates = await consultationTypesService.unblockDate(id, date);
        await audit(request, 'CONSULTATION_TYPE_UNBLOCK_DATE', `ConsultationType:${id}`, `Unblocked ${date}`);
        return send(reply, dates, 'Date unblocked');
      },
    });

    // =========================================================================
    // Availability
    // =========================================================================

    admin.get('/admin/availability', {
      preHandler: [checkPermission('availability:read')],
      schema: { tags: ['Admin Availability'], summary: 'Working hours' },
      handler: async (_request, reply) => send(reply, await availabilityService.getAvailability(), 'Availability fetched'),
    });

    const saveAvailability = async (request: FastifyRequest, reply: FastifyReply) => {
      const body = setAvailabilitySchema.parse(request.body);
      const saved = await availabilityService.setAvailability(body, request.user.id);
      await audit(
        request,
        'AVAILABILITY_UPDATE',
        'AvailabilitySetting:default',
        `${saved.startTime}-${saved.endTime}, slot ${saved.slotDuration} min, gap ${saved.gap} min`
      );
      return send(reply, saved, 'Availability updated');
    };
    admin.put('/admin/availability', {
      preHandler: [checkPermission('availability:update')],
      schema: { tags: ['Admin Availability'], summary: 'Set working hours' },
      handler: saveAvailability,
    });
    // The website admin saves with POST.
    admin.post('/admin/availability', {
      preHandler: [checkPermission('availability:update')],
      schema: { tags: ['Admin Availability'], summary: 'Set working hours (website verb)' },
      handler: saveAvailability,
    });

    admin.post('/admin/availability/block-day', {
      preHandler: [checkPermission('availability:update')],
      schema: { tags: ['Admin Availability'], summary: 'Block a whole day' },
      handler: async (request, reply) => {
        const { date } = dayBodySchema.parse(request.body);
        const schedule = await availabilityService.blockDay(date);
        await audit(request, 'AVAILABILITY_BLOCK_DAY', `ScheduleDay:${schedule.date}`);
        return send(reply, schedule, 'Day blocked');
      },
    });

    admin.post('/admin/availability/unblock-day', {
      preHandler: [checkPermission('availability:update')],
      schema: { tags: ['Admin Availability'], summary: 'Unblock a whole day' },
      handler: async (request, reply) => {
        const { date } = dayBodySchema.parse(request.body);
        const schedule = await availabilityService.unblockDay(date);
        await audit(request, 'AVAILABILITY_UNBLOCK_DAY', `ScheduleDay:${schedule.date}`);
        return send(reply, schedule, 'Day unblocked');
      },
    });

    admin.post('/admin/availability/block-range', {
      preHandler: [checkPermission('availability:update')],
      schema: { tags: ['Admin Availability'], summary: 'Block every day of a date range (calendar page)' },
      handler: async (request, reply) => {
        const { from, to } = dateRangeBodySchema.parse(request.body);
        const days = await availabilityService.blockRange(from, to);
        await audit(request, 'AVAILABILITY_BLOCK_RANGE', 'ScheduleDay', `Blocked ${days.length} day(s): ${from} to ${to}`);
        return send(reply, days, 'Days blocked');
      },
    });

    admin.post('/admin/availability/unblock-range', {
      preHandler: [checkPermission('availability:update')],
      schema: { tags: ['Admin Availability'], summary: 'Unblock every day of a date range' },
      handler: async (request, reply) => {
        const { from, to } = dateRangeBodySchema.parse(request.body);
        const days = await availabilityService.unblockRange(from, to);
        await audit(request, 'AVAILABILITY_UNBLOCK_RANGE', 'ScheduleDay', `Unblocked ${days.length} day(s): ${from} to ${to}`);
        return send(reply, days, 'Days unblocked');
      },
    });

    admin.post('/admin/availability/block-slots', {
      preHandler: [checkPermission('availability:update')],
      schema: { tags: ['Admin Availability'], summary: 'Block individual slots of a date' },
      handler: async (request, reply) => {
        const { date, slots } = slotsBodySchema.parse(request.body);
        const schedule = await availabilityService.blockSlots(date, slots);
        await audit(request, 'AVAILABILITY_BLOCK_SLOTS', `ScheduleDay:${schedule.date}`, `${slots.length} slot(s)`);
        return send(reply, schedule, 'Slots blocked');
      },
    });

    admin.post('/admin/availability/unblock-slots', {
      preHandler: [checkPermission('availability:update')],
      schema: { tags: ['Admin Availability'], summary: 'Unblock individual slots of a date' },
      handler: async (request, reply) => {
        const { date, slots } = slotsBodySchema.parse(request.body);
        const schedule = await availabilityService.unblockSlots(date, slots);
        await audit(request, 'AVAILABILITY_UNBLOCK_SLOTS', `ScheduleDay:${schedule.date}`, `${slots.length} slot(s)`);
        return send(reply, schedule, 'Slots unblocked');
      },
    });

    admin.get('/admin/availability/schedule', {
      preHandler: [checkPermission('availability:read')],
      schema: { tags: ['Admin Availability'], summary: 'Blocked state and blocked slots of one date' },
      handler: async (request, reply) => {
        const { date } = scheduleQuerySchema.parse(request.query);
        return send(reply, await availabilityService.getSchedule(date), 'Schedule fetched');
      },
    });

    admin.get('/admin/availability/blocked-dates', {
      preHandler: [checkPermission('availability:read')],
      schema: { tags: ['Admin Availability'], summary: 'Fully blocked dates of a month' },
      handler: async (request, reply) => {
        const { month, year } = blockedDatesQuerySchema.parse(request.query);
        return send(reply, await availabilityService.getBlockedDates(month, year), 'Blocked dates fetched');
      },
    });

    admin.get('/admin/availability/slots', {
      preHandler: [checkPermission('availability:read')],
      schema: { tags: ['Admin Availability'], summary: 'Every slot of a date with its state (booked, held, blocked)' },
      handler: async (request, reply) => {
        const { date, consultationId } = adminSlotsQuerySchema.parse(request.query);
        let offering: { durationMinutes: number } | undefined;
        if (consultationId) {
          await consultationTypesService.refresh({ force: true });
          offering = consultationTypesService.resolveOffering(consultationId, null, { includeInactive: true }).type;
        }
        return send(reply, await availabilityService.listAdminSlots(date, offering), 'Slots fetched successfully');
      },
    });

    // =========================================================================
    // Bookings
    // =========================================================================

    admin.get('/admin/bookings', {
      preHandler: [checkPermission('bookings:read')],
      schema: { tags: ['Admin Bookings'], summary: 'Bookings: upcoming / past, search, date and plan filters' },
      handler: async (request, reply) => {
        const query = adminBookingListQuerySchema.parse(request.query);
        return send(reply, await bookingsService.list(query), 'All bookings fetched');
      },
    });

    admin.get('/admin/bookings/export', {
      preHandler: [checkPermission('bookings:read')],
      schema: { tags: ['Admin Bookings'], summary: 'Export rows of the bookings matching the filters (?format=csv)' },
      handler: async (request, reply) => {
        const { format, ...query } = adminBookingExportQuerySchema.parse(request.query);
        const data = await bookingsService.exportRows(query);
        await audit(request, 'BOOKINGS_EXPORT', 'ConsultationBooking', `${data.rows.length} row(s)`);
        if (format === 'csv') {
          return reply
            .status(200)
            .header('Content-Type', 'text/csv; charset=utf-8')
            .header('Content-Disposition', 'attachment; filename="bookings.csv"')
            .send(toCsv(data.headers, data.rows));
        }
        return send(reply, data, 'Bookings export');
      },
    });

    admin.get('/admin/bookings/by-date', {
      preHandler: [checkPermission('bookings:read')],
      schema: { tags: ['Admin Bookings'], summary: 'Bookings of one day' },
      handler: async (request, reply) => {
        const { date } = bookingsByDateQuerySchema.parse(request.query);
        return send(reply, await bookingsService.listByDate(date), 'Bookings by date fetched');
      },
    });

    admin.get('/admin/bookings/payment-conflicts', {
      preHandler: [checkPermission('bookings:read')],
      schema: { tags: ['Admin Bookings'], summary: 'Paid orders whose booking holds no slot (need a reschedule or refund)' },
      handler: async (_request, reply) =>
        send(reply, await bookingsService.listPaymentConflicts(), 'Payment conflicts fetched'),
    });

    // Owner decision 2026-11-24 (open-questions M9): paid, slot taken -> staff reschedule;
    // a staff refund is the fallback.
    admin.post('/admin/bookings/:id/payment-conflict/assign-slot', {
      preHandler: [checkPermission('bookings:update')],
      schema: {
        tags: ['Admin Bookings'],
        summary: 'Payment conflict: confirm the booking at a new time against the payment already captured (no new charge)',
      },
      handler: async (request, reply) => {
        const { id } = bookingIdParamSchema.parse(request.params);
        const body = resolveConflictSlotSchema.parse(request.body);
        const result = await bookingsService.resolveConflictWithSlot(id, body, actor(request));
        await audit(
          request,
          'BOOKING_PAYMENT_CONFLICT_RESCHEDULED',
          `ConsultationBooking:${id}`,
          `${result.oldBooking.date} ${result.oldBooking.slot} -> ${result.booking.date} ${result.booking.slot}; confirmed against the captured payment of order ${result.booking.orderId}; no new charge`
        );
        return send(reply, { ...result.booking, oldBooking: result.oldBooking }, 'Booking confirmed at the new time');
      },
    });

    admin.post('/admin/bookings/:id/payment-conflict/refund', {
      // Both: it changes a booking and it returns money.
      preHandler: [checkPermission('bookings:update'), checkPermission('payments:refund')],
      schema: { tags: ['Admin Bookings'], summary: 'Payment conflict: refund the captured payment and mark the booking refunded' },
      handler: async (request, reply) => {
        const { id } = bookingIdParamSchema.parse(request.params);
        const { adminNote, ...refundBody } = resolveConflictRefundSchema.parse(request.body);
        const result = await bookingsService.resolveConflictWithRefund(
          id,
          // The one staff refund path; it writes its own audit entry (ORDER_REFUND_ISSUED / _REFUSED).
          (orderId) => issueStaffRefund(request, orderId, refundBody, `Payment conflict of booking ${id}`),
          { adminNote },
          actor(request)
        );
        await audit(
          request,
          'BOOKING_PAYMENT_CONFLICT_REFUNDED',
          `ConsultationBooking:${id}`,
          `Refund ${result.refund.id} of ${result.refund.amount} paise, status ${result.refund.status}; booking is now ${result.booking.status}`
        );
        return send(reply, result, result.fullyRefunded ? 'Payment refunded; booking marked refunded' : 'Refund recorded');
      },
    });

    admin.post('/admin/bookings/quote', {
      preHandler: [checkPermission('bookings:read')],
      schema: { tags: ['Admin Bookings'], summary: 'Calculate price quote for manual booking or plan change' },
      handler: async (request, reply) => {
        const body = bookingQuoteSchema.parse(request.body);
        return send(reply, await bookingsService.quote(body), 'Booking quote calculated');
      },
    });

    admin.post('/admin/bookings', {
      preHandler: [checkPermission('bookings:create')],
      schema: { tags: ['Admin Bookings'], summary: 'Manual booking for an existing or a new customer' },
      handler: async (request, reply) => {
        const body = manualBookingSchema.parse(request.body);
        const { booking, createdUser } = await bookingsService.createManual(body, actor(request));
        await audit(
          request,
          'BOOKING_MANUAL_CREATE',
          `ConsultationBooking:${booking.id}`,
          `${booking.title} (${booking.mode}) on ${booking.date} ${booking.slot}; amount ${booking.amountPaise} paise; discount ${booking.discountPaise} paise`
        );
        if (createdUser) {
          await audit(request, 'CUSTOMER_CREATE_FOR_BOOKING', `User:${booking.userId}`, 'Customer account created without a password (OTP login)');
        }
        return send(reply, booking, 'Booking successful', 201);
      },
    });

    admin.get('/admin/bookings/:id', {
      preHandler: [checkPermission('bookings:read')],
      schema: { tags: ['Admin Bookings'], summary: 'Booking detail with its staff history' },
      handler: async (request, reply) => {
        const { id } = bookingIdParamSchema.parse(request.params);
        return send(reply, await bookingsService.getById(id), 'Booking fetched');
      },
    });

    admin.get('/admin/bookings/:id/invoice', {
      preHandler: [checkPermission('bookings:read')],
      schema: { tags: ['Admin Bookings'], summary: 'Invoice data of a booking' },
      handler: async (request, reply) => {
        const { id } = bookingIdParamSchema.parse(request.params);
        return send(reply, await bookingsService.getInvoiceData(id), 'Booking invoice data fetched');
      },
    });

    admin.patch('/admin/bookings/:id/reschedule', {
      preHandler: [checkPermission('bookings:update')],
      schema: { tags: ['Admin Bookings'], summary: 'Move a booking to another date or slot, with a reason' },
      handler: async (request, reply) => {
        const { id } = bookingIdParamSchema.parse(request.params);
        const body = adminRescheduleSchema.parse(request.body);
        const result = await bookingsService.reschedule(id, body, actor(request));
        await audit(
          request,
          'BOOKING_RESCHEDULE',
          `ConsultationBooking:${id}`,
          `${result.oldBooking.date} ${result.oldBooking.slot} -> ${result.booking.date} ${result.booking.slot}`
        );
        return send(reply, { ...result.booking, oldBooking: result.oldBooking }, 'Booking rescheduled successfully');
      },
    });

    admin.patch('/admin/bookings/:id/change-plan', {
      preHandler: [checkPermission('bookings:update')],
      schema: { tags: ['Admin Bookings'], summary: 'Move a paid booking to another consultation type or mode' },
      handler: async (request, reply) => {
        const { id } = bookingIdParamSchema.parse(request.params);
        const body = changePlanSchema.parse(request.body);
        const booking = await bookingsService.changePlan(id, body, actor(request));
        await audit(
          request,
          'BOOKING_CHANGE_PLAN',
          `ConsultationBooking:${id}`,
          `Now ${booking.title} (${booking.mode}); amount ${booking.amountPaise} paise`
        );
        return send(reply, booking, 'Booking plan updated successfully');
      },
    });

    admin.post('/admin/bookings/:id/notes', {
      preHandler: [checkPermission('bookings:update')],
      schema: { tags: ['Admin Bookings'], summary: 'Add a staff-only note to the booking history' },
      handler: async (request, reply) => {
        const { id } = bookingIdParamSchema.parse(request.params);
        const { note } = addBookingNoteSchema.parse(request.body);
        const booking = await bookingsService.addNote(id, note, actor(request));
        await audit(request, 'BOOKING_NOTE_ADD', `ConsultationBooking:${id}`);
        return send(reply, booking, 'Note added', 201);
      },
    });

    admin.delete('/admin/bookings/:id', {
      preHandler: [checkPermission('bookings:delete')],
      schema: { tags: ['Admin Bookings'], summary: 'Delete a booking (soft, as on the website); its time becomes free' },
      handler: async (request, reply) => {
        const { id } = bookingIdParamSchema.parse(request.params);
        const booking = await bookingsService.softDelete(id, actor(request));
        await audit(request, 'BOOKING_DELETE', `ConsultationBooking:${id}`, `${booking.title} on ${booking.date} ${booking.slot}`);
        return send(reply, booking, 'Booking deleted (soft)');
      },
    });
  });
}
