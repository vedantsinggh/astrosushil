import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../../errors/app-error';
import { consultationsService } from './consultations.service';
import {
  getSlotsQuerySchema,
  bookConsultationSchema,
  verifyConsultationPaymentSchema,
  rescheduleBookingSchema,
  cancelBookingSchema,
  adminUpdateBookingSchema,
} from './consultations.schemas';
import { consultationTypesService, ConsultationTypeView } from './consultation-types.service';
import { publicConsultationTypesQuerySchema } from './consultation-types.schemas';
import { availabilityService } from '../availability/availability.service';
import { blockedDatesQuerySchema } from '../availability/availability.schemas';
import { bookingsService } from '../bookings/bookings.service';
import { bookingIdParamSchema } from '../bookings/bookings.schemas';

/** A consultation type as the website shows it: one entry with its priced modes. */
function publicType(type: ConsultationTypeView) {
  return {
    id: type.id,
    title: type.title,
    type: type.type,
    description: type.description,
    responseDays: type.responseDays,
    includes: type.includes,
    durationMinutes: type.durationMinutes,
    priceLabel: type.priceLabel,
    note: type.note,
    isActive: type.isActive,
    unavailableDates: type.unavailableDates,
    modes: type.modes,
  };
}

export async function consultationsRoutes(fastify: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // 1. PUBLIC / CLIENT CONSULTATION DISCOVERY & SLOTS
  // ---------------------------------------------------------------------------

  /**
   * GET /api/v1/consultations
   * List all verified consultation tiers
   */
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    await consultationTypesService.refresh();
    const consultations = consultationsService.listConsultations();
    return reply.status(200).send({
      statusCode: 200,
      success: true,
      message: 'Consultations fetched',
      data: consultations,
    });
  });

  /**
   * GET /api/v1/consultations/slots
   * Query genuinely available slots for a consultation offering and date
   */
  fastify.get('/slots', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = getSlotsQuerySchema.parse(request.query);
    const result = await consultationsService.getAvailableSlots(query);

    return reply.status(200).send({
      statusCode: 200,
      success: true,
      message: result.message || 'Slots fetched',
      data: result.slots,
      meta: {
        available: result.available,
        date: result.date,
      },
    });
  });

  /**
   * GET /api/v1/consultations/types?type=normal|special
   * Consultation types grouped as on the website: one entry per type with its modes and
   * prices, cheapest first (website GET /consultation)
   */
  fastify.get('/types', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = publicConsultationTypesQuerySchema.parse(request.query);
    await consultationTypesService.refresh();
    return reply.status(200).send({
      statusCode: 200,
      success: true,
      message: 'Consultations fetched',
      data: consultationTypesService.listPublic(query.type).map(publicType),
    });
  });

  /**
   * GET /api/v1/consultations/types/:id
   * One consultation type with its modes (website GET /consultation/:id)
   */
  fastify.get('/types/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await consultationTypesService.refresh();
    return reply.status(200).send({
      statusCode: 200,
      success: true,
      message: 'Consultation fetched',
      data: publicType(consultationTypesService.getPublic(request.params.id)),
    });
  });

  /**
   * GET /api/v1/consultations/blocked-dates?month=&year=
   * Fully blocked dates of a month, for the booking calendar (website GET /availability/blocked-dates)
   */
  fastify.get('/blocked-dates', async (request: FastifyRequest, reply: FastifyReply) => {
    const { month, year } = blockedDatesQuerySchema.parse(request.query);
    return reply.status(200).send({
      statusCode: 200,
      success: true,
      message: 'Blocked dates fetched',
      data: await availabilityService.getBlockedDates(month, year),
    });
  });

  /**
   * GET /api/v1/consultations/:id
   * Get consultation tier details
   */
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await consultationTypesService.refresh();
    const consultation = consultationsService.getConsultationById(request.params.id);
    return reply.status(200).send({
      statusCode: 200,
      success: true,
      message: 'Consultation details fetched',
      data: consultation,
    });
  });

  // ---------------------------------------------------------------------------
  // 2. AUTHENTICATED BOOKING WORKFLOW
  // ---------------------------------------------------------------------------

  fastify.register(async (authenticated) => {
    authenticated.addHook('onRequest', fastify.authenticate);

    /**
     * POST /api/v1/consultations/book
     * Atomically reserve slot and initiate order checkout
     */
    authenticated.post('/book', async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      const body = bookConsultationSchema.parse(request.body);

      const result = await consultationsService.bookConsultation(user.id, body);

      return reply.status(201).send({
        statusCode: 201,
        success: true,
        message: 'Consultation reserved. Complete payment to confirm appointment.',
        data: result,
      });
    });

    /**
     * POST /api/v1/consultations/verify-payment
     * Verify payment signature and confirm booking
     */
    authenticated.post('/verify-payment', async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      const body = verifyConsultationPaymentSchema.parse(request.body);

      const result = await consultationsService.verifyPayment(user.id, body, user.role);

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: result.message,
        data: result.booking,
      });
    });

    /**
     * GET /api/v1/consultations/my-bookings
     * Retrieve authenticated user's consultation bookings
     */
    authenticated.get('/my-bookings', async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      const bookings = await consultationsService.getMyBookings(user.id);

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Bookings fetched',
        data: bookings,
      });
    });

    /**
     * GET /api/v1/consultations/my-bookings/:id/invoice
     * Invoice data of the caller's own paid booking (website GET /booking/my-bookings/:bookingId/invoice)
     */
    authenticated.get('/my-bookings/:id/invoice', async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = bookingIdParamSchema.parse(request.params);
      const invoice = await bookingsService.getInvoiceData(id, request.user.id);

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Booking invoice data fetched',
        data: invoice,
      });
    });

    /**
     * GET /api/v1/consultations/bookings/:id
     * Retrieve single booking details with strict IDOR defense
     */
    authenticated.get('/bookings/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

      const booking = await consultationsService.getBookingById(user.id, request.params.id, isAdmin);

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        data: booking,
      });
    });

    /**
     * POST /api/v1/consultations/bookings/:id/reschedule
     * Reschedule confirmed booking (admin only; clients cannot reschedule)
     */
    authenticated.post('/bookings/:id/reschedule', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
      if (!isAdmin) {
        throw new ForbiddenError('Consultations can only be rescheduled by an administrator.');
      }
      const body = rescheduleBookingSchema.parse(request.body);

      const updated = await consultationsService.rescheduleBooking(user.id, request.params.id, body, true);

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Consultation rescheduled successfully',
        data: updated,
      });
    });

    /**
     * POST /api/v1/consultations/bookings/:id/cancel
     * Cancel booking and release slot capacity
     */
    authenticated.post('/bookings/:id/cancel', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
      const body = cancelBookingSchema.parse(request.body || {});

      const updated = await consultationsService.cancelBooking(user.id, request.params.id, body.reason, isAdmin);

      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Consultation cancelled successfully',
        data: updated,
      });
    });
  });
}
