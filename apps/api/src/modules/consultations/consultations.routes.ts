import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { consultationsService } from './consultations.service';
import {
  getSlotsQuerySchema,
  bookConsultationSchema,
  verifyConsultationPaymentSchema,
  rescheduleBookingSchema,
  cancelBookingSchema,
  adminUpdateBookingSchema,
} from './consultations.schemas';

export async function consultationsRoutes(fastify: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // 1. PUBLIC / CLIENT CONSULTATION DISCOVERY & SLOTS
  // ---------------------------------------------------------------------------

  /**
   * GET /api/v1/consultations
   * List all verified consultation tiers
   */
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
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
   * GET /api/v1/consultations/:id
   * Get consultation tier details
   */
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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
     * Reschedule confirmed booking
     */
    authenticated.post('/bookings/:id/reschedule', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user;
      const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
      const body = rescheduleBookingSchema.parse(request.body);

      const updated = await consultationsService.rescheduleBooking(user.id, request.params.id, body, isAdmin);

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
