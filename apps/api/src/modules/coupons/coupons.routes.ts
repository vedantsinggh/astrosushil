import { FastifyInstance } from 'fastify';
import { couponsService, createCouponSchema, listCouponsQuerySchema, updateCouponSchema } from './coupons.service';
import { adminActor, protectAdminScope, requireActiveCustomer, requirePermission, sendOk } from '../products/shop-http';

/** Customer: GET /api/v1/coupons/frontend (website `/coupons/frontend`). */
export async function couponsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/frontend',
    { onRequest: [fastify.authenticate], preHandler: [requireActiveCustomer] },
    async (request, reply) => sendOk(reply, await couponsService.listForCustomer(request.user.id), 'Available coupons')
  );
}

/** Admin: /api/v1/admin/coupons */
export async function adminCouponsRoutes(fastify: FastifyInstance) {
  protectAdminScope(fastify);

  fastify.get('/coupons', { preHandler: [requirePermission('coupons:read')] }, async (request, reply) => {
    const query = listCouponsQuerySchema.parse(request.query);
    return sendOk(reply, await couponsService.list(query), 'Coupons fetched');
  });

  fastify.get('/coupons/:id', { preHandler: [requirePermission('coupons:read')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendOk(reply, await couponsService.get(id), 'Coupon fetched');
  });

  fastify.post('/coupons', { preHandler: [requirePermission('coupons:create')] }, async (request, reply) => {
    const body = createCouponSchema.parse(request.body);
    return sendOk(reply, await couponsService.create(body, await adminActor(request)), 'Coupon created', 201);
  });

  fastify.put('/coupons/:id', { preHandler: [requirePermission('coupons:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateCouponSchema.parse(request.body);
    return sendOk(reply, await couponsService.update(id, body, await adminActor(request)), 'Coupon updated successfully');
  });

  fastify.patch('/coupons/:id/toggle', { preHandler: [requirePermission('coupons:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await couponsService.toggle(id, await adminActor(request));
    return sendOk(reply, result, `Coupon ${result.isActive ? 'enabled' : 'disabled'} successfully`);
  });

  fastify.delete('/coupons/:id', { preHandler: [requirePermission('coupons:delete')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendOk(reply, await couponsService.remove(id, await adminActor(request)), 'Coupon deleted successfully');
  });
}
