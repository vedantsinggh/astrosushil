import { FastifyInstance } from 'fastify';
import { customersService, listCustomersQuerySchema, updateCustomerSchema } from './customers.service';
import { adminActor, protectAdminScope, requirePermission, sendOk } from '../products/shop-http';

/** Admin: /api/v1/admin/customers (the website's Customers page). */
export async function adminCustomersRoutes(fastify: FastifyInstance) {
  protectAdminScope(fastify);

  fastify.get('/customers', { preHandler: [requirePermission('customers:read')] }, async (request, reply) => {
    const query = listCustomersQuerySchema.parse(request.query);
    return sendOk(reply, await customersService.list(query), 'Users fetched successfully');
  });

  fastify.get('/customers/export', { preHandler: [requirePermission('customers:read')] }, async (request, reply) => {
    const query = listCustomersQuerySchema.parse(request.query);
    const csv = await customersService.exportCsv(query, await adminActor(request));
    return reply
      .status(200)
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="customers.csv"')
      .send(csv);
  });

  fastify.get('/customers/:id', { preHandler: [requirePermission('customers:read')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendOk(reply, await customersService.get(id), 'User fetched successfully');
  });

  fastify.patch('/customers/:id', { preHandler: [requirePermission('customers:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateCustomerSchema.parse(request.body);
    return sendOk(reply, await customersService.update(id, body, await adminActor(request)), 'User updated successfully');
  });

  fastify.delete('/customers/:id', { preHandler: [requirePermission('customers:delete')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendOk(reply, await customersService.remove(id, await adminActor(request)), 'User deleted successfully');
  });
}
