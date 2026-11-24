import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { paymentsService } from './payments.service';
import { createOrderSchema, verifyPaymentSchema } from './payments.schemas';
import { AppError } from '../../errors/app-error';
import { commerceCatalog } from '../commerce/commerce.catalog';
import { platformReportLanguages } from '../../services/platform-report.runner';

export async function paymentsRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // GET /api/v1/payments/catalog (Public endpoint to browse offerings & server prices)
  fastify.get('/catalog', {
    schema: {
      tags: ['Payments'],
      summary: 'Get list of available commerce offerings and server-authoritative prices',
    },
    handler: async (request, reply) => {
      const query = request.query as any;
      // Consultation items are database rows read through an in-memory snapshot: bring it up to
      // date first (at most one read every 30 seconds; a failed read keeps the previous snapshot).
      await commerceCatalog.refresh();
      const items = commerceCatalog
        .listItems({
          itemType: query?.itemType,
          activeOnly: query?.includeInactive !== 'true',
        })
        // Report items also list the languages their PDF can be generated in (from the report registry).
        .map((item) => (item.legacyReportType ? { ...item, languages: platformReportLanguages(item.legacyReportType) } : item));
      return reply.status(200).send({ items });
    },
  });

  // Protected Routes
  fastify.register(async (authenticatedScope) => {
    authenticatedScope.addHook('onRequest', authenticatedScope.authenticate);

    // POST /api/v1/payments/create-order
    authenticatedScope.post('/create-order', {
      schema: {
        tags: ['Payments'],
        summary: 'Create a new Razorpay payment order for catalog items or reports',
        security: [{ bearerAuth: [] }],
      },
      handler: async (request, reply) => {
        const input = createOrderSchema.parse(request.body);
        const result = await paymentsService.createOrder(input, request.user);
        return reply.status(201).send(result);
      },
    });

    // POST /api/v1/payments/verify
    authenticatedScope.post('/verify', {
      schema: {
        tags: ['Payments'],
        summary: 'Verify Razorpay payment signature after checkout',
        security: [{ bearerAuth: [] }],
      },
      handler: async (request, reply) => {
        const input = verifyPaymentSchema.parse(request.body);
        const result = await paymentsService.verifyPayment(input, request.user);
        return reply.status(200).send(result);
      },
    });

    // GET /api/v1/payments/orders
    authenticatedScope.get('/orders', {
      schema: {
        tags: ['Payments'],
        summary: 'Get order history for authenticated user',
        security: [{ bearerAuth: [] }],
      },
      handler: async (request, reply) => {
        const orders = await paymentsService.getUserOrders(request.user);
        return reply.status(200).send({ orders });
      },
    });

    // GET /api/v1/payments/orders/:id
    authenticatedScope.get('/orders/:id', {
      schema: {
        tags: ['Payments'],
        summary: 'Get single order with items and refund status by ID',
        security: [{ bearerAuth: [] }],
      },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const order = await paymentsService.getOrderById(id, request.user);
        return reply.status(200).send({ order });
      },
    });

    // POST /api/v1/payments/orders/:id/refund
    // Owner decision 2026-11-24 (open-questions M4): refunds are staff-only. The path is kept so an
    // older client gets a clear, machine-readable refusal instead of a 404; it never reads the order
    // (so it reveals nothing about one) and never reaches the refund code. Staff use
    // POST /api/v1/admin/payments/orders/:id/refund (permission `payments:refund`).
    authenticatedScope.post('/orders/:id/refund', {
      schema: {
        tags: ['Payments'],
        summary: 'Retired: refunds are issued by staff only (always 403 REFUND_STAFF_ONLY)',
        security: [{ bearerAuth: [] }],
      },
      handler: async () => {
        throw new AppError('Refunds are issued by our staff. Please contact support.', 403, 'REFUND_STAFF_ONLY');
      },
    });
  });
}
