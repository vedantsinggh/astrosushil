import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { paymentsService } from './payments.service';
import { createOrderSchema, verifyPaymentSchema, refundOrderSchema } from './payments.schemas';
import { commerceCatalog } from '../commerce/commerce.catalog';

export async function paymentsRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  // GET /api/v1/payments/catalog (Public endpoint to browse offerings & server prices)
  fastify.get('/catalog', {
    schema: {
      tags: ['Payments'],
      summary: 'Get list of available commerce offerings and server-authoritative prices',
    },
    handler: async (request, reply) => {
      const query = request.query as any;
      const items = commerceCatalog.listItems({
        itemType: query?.itemType,
        activeOnly: query?.includeInactive !== 'true',
      });
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
    authenticatedScope.post('/orders/:id/refund', {
      schema: {
        tags: ['Payments'],
        summary: 'Request a refund for an order (with balance validation and idempotency)',
        security: [{ bearerAuth: [] }],
      },
      handler: async (request, reply) => {
        const { id } = request.params as { id: string };
        const body = refundOrderSchema.parse(request.body || {});
        const result = await paymentsService.requestRefund({ ...body, orderId: id }, request.user);
        return reply.status(200).send(result);
      },
    });
  });
}
