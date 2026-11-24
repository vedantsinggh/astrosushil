import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { requireActiveCustomer, sendOk } from '../products/shop-http';
import { webReportsService } from './web-reports.service';
import { webBuyReportSchema, webVerifyReportPaymentSchema } from './web-reports.schemas';

/**
 * The website's report endpoints. Registered twice in routes/index.ts:
 *
 *   /api/v1/web/reports/...   the canonical paths
 *   /api/v1/report/...        the website's own paths (singular; this backend's own report API is
 *                             /api/v1/reports, so nothing clashes)
 *
 *   GET  /                  public   the four website products, priced from our catalogue
 *   GET  /slug/:slug        public   one product, with `priceBreakdown`
 *   GET  /orders            customer the buyer's delivered report orders
 *   POST /buy               customer creates the order through the commerce layer
 *   POST /verify-payment    customer verifies the payment and creates the report job
 *   GET  /:id               public   one product by id (registered last, after the fixed paths)
 *
 * Responses use the website's envelope `{ statusCode, success, message, data }`; errors use this
 * backend's standard `{ error: { code, message, requestId } }`.
 *
 * Not here: the website's admin routes for report products (`/add`, `/edit/:id`, `/delete/:id`,
 * `/orders/all`): the products are catalogue items of this backend. The invoice download
 * (`/orders/:orderId/invoice`) is the invoices module's `GET /invoices/orders/:orderId`.
 */

/** Per-IP limits, requests per minute. Buying creates a gateway order, so it is the tightest. */
export const WEB_REPORTS_RATE_LIMITS = {
  list: { max: 60, timeWindow: '1 minute' },
  orders: { max: 30, timeWindow: '1 minute' },
  buy: { max: 10, timeWindow: '1 minute' },
  verify: { max: 20, timeWindow: '1 minute' },
} as const;

export async function webReportsRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.get('/', {
    config: { rateLimit: WEB_REPORTS_RATE_LIMITS.list },
    schema: { tags: ['Website reports'], summary: 'The website report products with prices from the catalogue' },
    handler: async (_request, reply) => sendOk(reply, webReportsService.listReports(), 'Reports fetched successfully'),
  });

  fastify.get('/slug/:slug', {
    config: { rateLimit: WEB_REPORTS_RATE_LIMITS.list },
    schema: { tags: ['Website reports'], summary: 'One website report product by slug' },
    handler: async (request, reply) => {
      const { slug } = request.params as { slug: string };
      return sendOk(reply, webReportsService.getReport(String(slug).slice(0, 100)), 'Report fetched successfully');
    },
  });

  // Customer routes: a login and an account that is not blocked.
  fastify.register(async (customer) => {
    customer.addHook('onRequest', customer.authenticate);
    customer.addHook('preHandler', requireActiveCustomer);

    customer.get('/orders', {
      config: { rateLimit: WEB_REPORTS_RATE_LIMITS.orders },
      schema: { tags: ['Website reports'], summary: "The buyer's delivered report orders", security: [{ bearerAuth: [] }] },
      handler: async (request, reply) => {
        reply.header('Cache-Control', 'no-store');
        return sendOk(reply, await webReportsService.listDeliveredOrders(request.user), 'Report orders fetched successfully');
      },
    });

    customer.post('/buy', {
      config: { rateLimit: WEB_REPORTS_RATE_LIMITS.buy },
      schema: { tags: ['Website reports'], summary: 'Buy a website report: creates the order from the catalogue price', security: [{ bearerAuth: [] }] },
      handler: async (request, reply) => {
        const input = webBuyReportSchema.parse(request.body);
        return sendOk(reply, await webReportsService.buy(input, request.user), 'Report order created successfully');
      },
    });

    customer.post('/verify-payment', {
      config: { rateLimit: WEB_REPORTS_RATE_LIMITS.verify },
      schema: { tags: ['Website reports'], summary: 'Verify the payment of a report order and start its report', security: [{ bearerAuth: [] }] },
      handler: async (request, reply) => {
        const input = webVerifyReportPaymentSchema.parse(request.body);
        return sendOk(reply, await webReportsService.verifyPayment(input, request.user), 'Payment verified successfully');
      },
    });
  });

  fastify.get('/:id', {
    config: { rateLimit: WEB_REPORTS_RATE_LIMITS.list },
    schema: { tags: ['Website reports'], summary: 'One website report product by id' },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      return sendOk(reply, webReportsService.getReport(String(id).slice(0, 100)), 'Report fetched successfully');
    },
  });
}
