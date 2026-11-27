import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v3';
import { adminService } from '../admin/admin.service';
import { checkPermission, getRequestStaffAccess } from '../admin/rbac/check-permission';
import { AuthorizationError } from '../../errors/app-error';
import { invoiceService } from './invoice.service';
import { INVOICE_PDF_LIMITS, InvoicePdfResult, invoicePdfService } from './invoice-pdf.service';
import { settlePaidOrderForRecovery } from './invoice-recovery.sweep';
import { invoiceRegisterService } from './invoice-register';

const orderParams = z.object({ orderId: z.string().uuid() });
const initializeBody = z.object({
  confirmLastValue: z.string().regex(/^\d+$/, 'confirmLastValue must be a whole number'),
  allowEmpty: z.boolean().optional(),
});

/**
 * Invoices (registered without a prefix under /api/v1):
 *   GET  /invoices/orders/:orderId                 customer, own order only: invoice data
 *   GET  /invoices/orders/:orderId/pdf             customer, own order only: the invoice as a PDF
 *   GET  /admin/invoices/orders/:orderId           permission transactions:read
 *   GET  /admin/invoices/orders/:orderId/pdf       permission transactions:read
 *   GET  /admin/invoices/counter                   permission gst_report:read
 *   POST /admin/invoices/counter/initialize        super admin only
 *   POST /admin/invoices/allocate-pending          super admin only
 *   GET  /admin/invoices/register                  permission gst_report:read   (fy | month | from+to)
 *   GET  /admin/invoices/register/export           permission gst_report:export (kind=lines|hsn|states, CSV)
 *   GET  /admin/invoices/register/zip              permission gst_report:export (every PDF + the CSVs)
 */
const registerQuery = z.object({
  fy: z.string().max(10).optional(),
  month: z.string().max(10).optional(),
  from: z.string().max(10).optional(),
  to: z.string().max(10).optional(),
});
const exportQuery = registerQuery.extend({ kind: z.enum(['lines', 'hsn', 'states']).default('lines') });
function sendPdf(reply: FastifyReply, result: InvoicePdfResult) {
  return reply
    .status(200)
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="${result.filename}"`)
    .header('Cache-Control', 'private, no-store')
    .header('X-Content-Type-Options', 'nosniff')
    .send(result.pdf);
}

/**
 * Per-route limit of the global rate limiter, counted per signed-in user (it runs after
 * `authenticate`). The PDF service applies the same limit itself, so the route is protected even
 * where the limiter plugin is not registered.
 */
function pdfRateLimit(max: number) {
  return {
    rateLimit: {
      max,
      timeWindow: INVOICE_PDF_LIMITS.windowMs,
      keyGenerator: (request: FastifyRequest) => `invoice-pdf:${request.user?.id ?? request.ip}`,
    },
  };
}

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

    customerScope.get('/invoices/orders/:orderId/pdf', {
      schema: { tags: ['Invoices'], summary: 'Invoice PDF for one of the caller\'s orders', security: [{ bearerAuth: [] }] },
      config: pdfRateLimit(INVOICE_PDF_LIMITS.customerPerWindow),
      handler: async (request, reply) => {
        const { orderId } = orderParams.parse(request.params);
        return sendPdf(reply, await invoicePdfService.getInvoicePdf(orderId, request.user));
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

    adminScope.get('/admin/invoices/orders/:orderId/pdf', {
      schema: { tags: ['Admin Invoices'], summary: 'Invoice PDF for any order', security: [{ bearerAuth: [] }] },
      // No limit for staff (owner decision 2026-11-26).
      preHandler: [checkPermission('transactions:read')],
      handler: async (request, reply) => {
        const { orderId } = orderParams.parse(request.params);
        return sendPdf(reply, await invoicePdfService.getInvoicePdf(orderId, request.user, true));
      },
    });

    adminScope.get('/admin/invoices/counter', {
      schema: { tags: ['Admin Invoices'], summary: 'Invoice counter state and a report on stored invoice numbers', security: [{ bearerAuth: [] }] },
      preHandler: [checkPermission('gst_report:read')],
      handler: async (_request, reply) => reply.status(200).send(await invoiceService.describeCounter()),
    });

    adminScope.get('/admin/invoices/register', {
      schema: { tags: ['Admin Invoices'], summary: 'GST invoice register of a period, with totals by rate, HSN/SAC and state', security: [{ bearerAuth: [] }] },
      preHandler: [checkPermission('gst_report:read')],
      handler: async (request, reply) => {
        const query = registerQuery.parse(request.query);
        return reply.status(200).send(await invoiceRegisterService.register(query, request.user));
      },
    });

    adminScope.get('/admin/invoices/register/export', {
      schema: { tags: ['Admin Invoices'], summary: 'Invoice register as CSV: lines, HSN summary or state summary', security: [{ bearerAuth: [] }] },
      preHandler: [checkPermission('gst_report:export')],
      handler: async (request, reply) => {
        const { kind, ...period } = exportQuery.parse(request.query);
        const result = await invoiceRegisterService.csv(period, kind, request.user);
        await adminService.logAction({
          adminId: request.user.id,
          adminEmail: request.user.id,
          action: 'INVOICE_REGISTER_EXPORTED',
          resource: 'InvoiceRegister',
          details: `${kind} ${result.filename}`,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply
          .status(200)
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${result.filename}"`)
          .header('Cache-Control', 'private, no-store')
          .send('\uFEFF' + result.csv);
      },
    });

    adminScope.get('/admin/invoices/register/zip', {
      schema: { tags: ['Admin Invoices'], summary: 'Every invoice PDF of a period with the register CSVs, as one ZIP', security: [{ bearerAuth: [] }] },
      preHandler: [checkPermission('gst_report:export')],
      // Compiling hundreds of PDFs takes minutes: a reverse proxy in front must allow that long a response.
      handler: async (request, reply) => {
        const query = registerQuery.parse(request.query);
        const result = await invoiceRegisterService.zip(query, request.user, async (orderId) => (await invoicePdfService.getInvoicePdf(orderId, request.user, true)).pdf);
        await adminService.logAction({
          adminId: request.user.id,
          adminEmail: request.user.id,
          action: 'INVOICE_REGISTER_ZIP',
          resource: 'InvoiceRegister',
          details: `${result.filename}${result.failed.length ? `; failed ${result.failed.join(', ')}` : ''}`,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
        return reply
          .status(200)
          .header('Content-Type', 'application/zip')
          .header('Content-Disposition', `attachment; filename="${result.filename}"`)
          .header('Cache-Control', 'private, no-store')
          .send(result.zip);
      },
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
        const result = await invoiceService.allocatePending(200, settlePaidOrderForRecovery);
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
