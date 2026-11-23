import { FastifyInstance } from 'fastify';
import {
  adminListProductsQuerySchema,
  createProductSchema,
  productsAdminService,
  updateProductSchema,
} from './products.admin.service';
import { adminActor, protectAdminScope, requirePermission, sendOk } from './shop-http';

/**
 * Admin product management: /api/v1/admin/shop-products.
 * (`/admin/products/:id/stock` and `/admin/products/entitlements/*` in admin.routes.ts are unchanged.)
 */
export async function adminProductsRoutes(fastify: FastifyInstance) {
  protectAdminScope(fastify);

  fastify.get('/shop-products', { preHandler: [requirePermission('products:read')] }, async (request, reply) => {
    const query = adminListProductsQuerySchema.parse(request.query);
    return sendOk(reply, await productsAdminService.list(query), 'Products fetched');
  });

  fastify.get('/shop-products/:id', { preHandler: [requirePermission('products:read')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendOk(reply, await productsAdminService.get(id), 'Product fetched');
  });

  fastify.post('/shop-products', { preHandler: [requirePermission('products:create')] }, async (request, reply) => {
    const body = createProductSchema.parse(request.body);
    return sendOk(reply, await productsAdminService.create(body, await adminActor(request)), 'Product created', 201);
  });

  fastify.put('/shop-products/:id', { preHandler: [requirePermission('products:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateProductSchema.parse(request.body);
    return sendOk(reply, await productsAdminService.update(id, body, await adminActor(request)), 'Product updated');
  });

  fastify.delete('/shop-products/:id', { preHandler: [requirePermission('products:delete')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await productsAdminService.remove(id, await adminActor(request));
    return sendOk(reply, result, result.archived ? 'Product archived (it has purchases)' : 'Product deleted');
  });
}
