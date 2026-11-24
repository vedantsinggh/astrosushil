import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { adminListOrdersQuerySchema, adminUpdateStatusSchema, checkoutSchema, shopOrdersService } from './shop-orders.service';
import { productsService } from '../products/products.service';
import { adminActor, protectAdminScope, requireActiveCustomer, requirePermission, sendOk } from '../products/shop-http';

/** Website field names (snake_case) and this backend's (camelCase) are both accepted. */
const verifyPaymentSchema = z
  .object({
    orderId: z.string().min(1).max(100),
    razorpay_payment_id: z.string().min(1).max(200).optional(),
    razorpay_order_id: z.string().min(1).max(200).optional(),
    razorpay_signature: z.string().min(1).max(500).optional(),
    razorpayPaymentId: z.string().min(1).max(200).optional(),
    razorpayOrderId: z.string().min(1).max(200).optional(),
    razorpaySignature: z.string().min(1).max(500).optional(),
  })
  .transform((v, ctx) => {
    const razorpayPaymentId = v.razorpayPaymentId ?? v.razorpay_payment_id;
    const razorpayOrderId = v.razorpayOrderId ?? v.razorpay_order_id;
    const razorpaySignature = v.razorpaySignature ?? v.razorpay_signature;
    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Payment id, order id and signature are required' });
      return z.NEVER;
    }
    return { orderId: v.orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature };
  });

/**
 * Customer product orders: /api/v1/orders (website `/orders`). Every route needs a logged-in,
 * unblocked customer and only ever touches that customer's own orders.
 */
export async function shopOrdersRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('preHandler', requireActiveCustomer);

  fastify.post('/create', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = checkoutSchema.parse(request.body ?? {});
    const result = await shopOrdersService.checkoutCart(request.user.id, body);
    return sendOk(reply, result, result.isExisting ? 'Existing order retrieved' : 'Order created successfully', result.isExisting ? 200 : 201);
  });

  fastify.post('/verify-payment', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = verifyPaymentSchema.parse(request.body);
    // The one shop payment verification: owner, stored gateway order id and signature are checked there.
    await productsService.verifyShopPayment({ id: request.user.id, role: request.user.role }, body);
    return sendOk(reply, await shopOrdersService.getMine(request.user.id, body.orderId), 'Payment verified successfully');
  });

  fastify.get('/my-orders', async (request, reply) => {
    return sendOk(reply, await shopOrdersService.listMine(request.user.id), 'Orders fetched successfully');
  });

  fastify.patch('/:orderId/cancel', async (request, reply) => {
    const { orderId } = request.params as { orderId: string };
    return sendOk(reply, await shopOrdersService.cancelMine(request.user.id, orderId), 'Order cancelled successfully');
  });

  fastify.get('/:orderId', async (request, reply) => {
    const { orderId } = request.params as { orderId: string };
    return sendOk(reply, await shopOrdersService.getMine(request.user.id, orderId), 'Order fetched successfully');
  });
}

/** Admin: /api/v1/admin/shop-orders */
export async function adminShopOrdersRoutes(fastify: FastifyInstance) {
  protectAdminScope(fastify);

  fastify.get('/shop-orders', { preHandler: [requirePermission('orders:read')] }, async (request, reply) => {
    const query = adminListOrdersQuerySchema.parse(request.query);
    return sendOk(reply, await shopOrdersService.adminList(query), 'All orders fetched successfully');
  });

  fastify.get('/shop-orders/reports', { preHandler: [requirePermission('orders:export')] }, async (_request, reply) => {
    return sendOk(reply, await shopOrdersService.adminReports(), 'Order reports fetched successfully');
  });

  fastify.get('/shop-orders/export.csv', { preHandler: [requirePermission('orders:export')] }, async (request, reply) => {
    const query = adminListOrdersQuerySchema.parse(request.query);
    const csv = await shopOrdersService.adminExportCsv(query);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="orders.csv"')
      .send(csv);
  });

  fastify.get('/shop-orders/export', { preHandler: [requirePermission('orders:export')] }, async (request, reply) => {
    const query = adminListOrdersQuerySchema.parse(request.query);
    const csv = await shopOrdersService.adminExportCsv(query);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="orders.csv"')
      .send(csv);
  });

  fastify.get('/shop-orders/:orderId/history', { preHandler: [requirePermission('orders:read')] }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string };
    const historyData = await shopOrdersService.adminHistory(orderId);
    return sendOk(reply, historyData, 'Order history fetched successfully');
  });

  fastify.get('/shop-orders/:orderId', { preHandler: [requirePermission('orders:read')] }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string };
    return sendOk(reply, await shopOrdersService.adminGet(orderId), 'Order details fetched successfully');
  });

  fastify.patch('/shop-orders/:orderId/status', { preHandler: [requirePermission('orders:update')] }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string };
    const body = adminUpdateStatusSchema.parse(request.body);
    return sendOk(
      reply,
      await shopOrdersService.adminUpdateStatus(orderId, body, await adminActor(request)),
      'Order status updated successfully'
    );
  });
}
