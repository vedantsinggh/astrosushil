import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { adminService } from '../admin/admin.service';
import { checkPermission, getRequestStaffAccess } from '../admin/rbac/check-permission';
import { AuthorizationError } from '../../errors/app-error';
import { invoiceService } from './invoice.service';
import { settleOrderPaid } from '../commerce/money/settlement';

const orderParams = z.object({ orderId: z.string().uuid() });
const initializeBody = z.object({
  confirmLastValue: z.string().regex(/^\d+$/, 'confirmLastValue must be a whole number'),
  allowEmpty: z.boolean().optional(),
});

/**
 * Invoices (registered without a prefix under /api/v1):
 *   GET  /invoices/orders/:orderId                 customer, own order only: invoice data
 *   GET  /admin/invoices/orders/:orderId           permission transactions:read
 *   GET  /admin/invoices/counter                   permission gst_report:read
 *   POST /admin/invoices/counter/initialize        super admin only
 *   POST /admin/invoices/allocate-pending          super admin only
 */
export async function invoicesRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.register(async (customerScope) => {
    customerScope.addHook('onRequest', fastify.authenticate);

    customerScope.get('/invoices/orders/:orderId', {
      schema: { tags: ['Invoices'], summary: 'Invoice data for one of the caller\'s orders', security: [{ bearerAuth: [] }] },
      handler: async (request, reply) => {
        const { orderId } = orderParams.parse(request.params);
        const invoice = await invoiceService.getInvoiceData(orderId, request.user);
        return reply.status(200).send({ invoice });
      },
    });
  });

  fastify.register(async (adminScope) => {
    adminScope.addHook('onRequest', fastify.authenticate);
    adminScope.addHook('onRequest', fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']));

    const requireSuperAdmin = async (request: Parameters<typeof getRequestStaffAccess>[0]) => {
      const access = await getRequestStaffAccess(request);
      if (!access.isSuperAdmin) throw new AuthorizationError('Only a Super Admin can manage the invoice counter');
    };

    adminScope.get('/admin/invoices/orders/:orderId', {
      schema: { tags: ['Admin Invoices'], summary: 'Invoice data for any order', security: [{ bearerAuth: [] }] },
      preHandler: [checkPermission('transactions:read')],
      handler: async (request, reply) => {
        const { orderId } = orderParams.parse(request.params);
        const invoice = await invoiceService.getInvoiceData(orderId, request.user, true);
        return reply.status(200).send({ invoice });
      },
    });

    adminScope.get('/admin/invoices/counter', {
      schema: { tags: ['Admin Invoices'], summary: 'Invoice counter state and a report on stored invoice numbers', security: [{ bearerAuth: [] }] },
      preHandler: [checkPermission('gst_report:read')],
      handler: async (_request, reply) => reply.status(200).send(await invoiceService.describeCounter()),
    });

    adminScope.post('/admin/invoices/counter/initialize', {
      schema: { tags: ['Admin Invoices'], summary: 'Initialise the invoice counter from migrated data (once)', security: [{ bearerAuth: [] }] },
      preHandler: [requireSuperAdmin],
      handler: async (request, reply) => {
        const body = initializeBody.parse(request.body ?? {});
        const result = await invoiceService.initializeCounter({ ...body, adminId: request.user.id });
        await adminService.logAction({
          adminId: request.user.id,
          adminEmail: request.user.id,
          action: 'INVOICE_COUNTER_INITIALIZED',
          resource: 'InvoiceCounter:INV-AS',
          details: `Last value ${result.lastValue}; next ${result.nextNumber}`,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(201).send(result);
      },
    });

    adminScope.post('/admin/invoices/allocate-pending', {
      schema: { tags: ['Admin Invoices'], summary: 'Number paid sales whose invoice is still pending', security: [{ bearerAuth: [] }] },
      preHandler: [requireSuperAdmin],
      handler: async (request, reply) => {
        const result = await invoiceService.allocatePending(200, async (tx, orderId) => (await settleOrderPaid(tx, orderId)).invoice);
        await adminService.logAction({
          adminId: request.user.id,
          adminEmail: request.user.id,
          action: 'INVOICES_ALLOCATED',
          resource: 'InvoiceCounter:INV-AS',
          details: `Allocated ${result.allocated.length}; still pending ${result.stillPending.length}; failed ${result.failures.length}`,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply.status(200).send(result);
      },
    });
  });
}
