import { FastifyInstance, FastifyPluginOptions, FastifyRequest } from 'fastify';
import { adminService } from '../admin/admin.service';
import { checkPermission } from '../admin/rbac/check-permission';
import { transactionsService } from './transactions.service';
import { gstReportQuerySchema, transactionsQuerySchema } from './transactions.schemas';

function exportSuffix(fromDate?: string, toDate?: string): string {
  return fromDate || toDate ? `${fromDate || 'start'}_to_${toDate || 'end'}` : 'all';
}

async function auditExport(request: FastifyRequest, action: string, details: string) {
  await adminService.logAction({
    adminId: request.user.id,
    adminEmail: request.user.id,
    action,
    resource: 'PaymentTransaction',
    details,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  });
}

/**
 * Transactions ledger and GST report for staff (registered without a prefix under /api/v1):
 *   GET /admin/transactions          permission transactions:read
 *   GET /admin/transactions/export   permission transactions:export  (CSV)
 *   GET /admin/gst-report            permission gst_report:read
 *   GET /admin/gst-report/export     permission gst_report:export    (CSV)
 */
export async function transactionsRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.register(async (adminScope) => {
    adminScope.addHook('onRequest', fastify.authenticate);
    adminScope.addHook('onRequest', fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']));

    adminScope.get('/admin/transactions', {
      schema: { tags: ['Admin Transactions'], summary: 'Payment transactions ledger', security: [{ bearerAuth: [] }] },
      preHandler: [checkPermission('transactions:read')],
      handler: async (request, reply) => {
        const query = transactionsQuerySchema.parse(request.query ?? {});
        return reply.status(200).send(await transactionsService.list(query));
      },
    });

    adminScope.get('/admin/transactions/export', {
      schema: { tags: ['Admin Transactions'], summary: 'Payment transactions ledger as CSV', security: [{ bearerAuth: [] }] },
      preHandler: [checkPermission('transactions:export')],
      handler: async (request, reply) => {
        const query = transactionsQuerySchema.parse(request.query ?? {});
        const csv = await transactionsService.exportCsv(query);
        await auditExport(request, 'TRANSACTIONS_EXPORTED', `Range ${exportSuffix(query.fromDate, query.toDate)}`);
        return reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="transactions_${exportSuffix(query.fromDate, query.toDate)}.csv"`)
          .status(200)
          .send(csv);
      },
    });

    adminScope.get('/admin/gst-report', {
      schema: { tags: ['Admin Transactions'], summary: 'GST report: invoice-wise rows and totals', security: [{ bearerAuth: [] }] },
      preHandler: [checkPermission('gst_report:read')],
      handler: async (request, reply) => {
        const query = gstReportQuerySchema.parse(request.query ?? {});
        return reply.status(200).send(await transactionsService.gstReport(query));
      },
    });

    adminScope.get('/admin/gst-report/export', {
      schema: { tags: ['Admin Transactions'], summary: 'GST report as CSV', security: [{ bearerAuth: [] }] },
      preHandler: [checkPermission('gst_report:export')],
      handler: async (request, reply) => {
        const query = gstReportQuerySchema.parse(request.query ?? {});
        const csv = await transactionsService.gstReportCsv(query);
        await auditExport(request, 'GST_REPORT_EXPORTED', `Range ${exportSuffix(query.fromDate, query.toDate)}`);
        return reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="gst-report_${exportSuffix(query.fromDate, query.toDate)}.csv"`)
          .status(200)
          .send(csv);
      },
    });
  });
}
