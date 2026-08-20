import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { paymentsService } from './payments.service';
import { createOrderSchema, verifyPaymentSchema } from './payments.schemas';

export async function paymentsRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.addHook('onRequest', fastify.authenticate);

  // POST /api/v1/payments/create-order
  fastify.post('/create-order', {
    schema: {
      tags: ['Payments'],
      summary: 'Create a new Razorpay payment order for a report',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['reportType'],
        properties: {
          reportType: {
            type: 'string',
            enum: ['MARRIAGE_COMPATIBILITY', 'CAREER_PROSITY', 'CHILDBIRTH_FAMILY', 'GUPTA_NADI_DOSSIER'],
          },
        },
      },
    },
    handler: async (request, reply) => {
      const input = createOrderSchema.parse(request.body);
      const result = await paymentsService.createOrder(input, request.user);
      return reply.status(201).send(result);
    },
  });

  // POST /api/v1/payments/verify
  fastify.post('/verify', {
    schema: {
      tags: ['Payments'],
      summary: 'Verify Razorpay payment signature after checkout',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature'],
        properties: {
          razorpayOrderId: { type: 'string' },
          razorpayPaymentId: { type: 'string' },
          razorpaySignature: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const input = verifyPaymentSchema.parse(request.body);
      const result = await paymentsService.verifyPayment(input, request.user);
      return reply.status(200).send(result);
    },
  });

  // GET /api/v1/payments/orders
  fastify.get('/orders', {
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
}
