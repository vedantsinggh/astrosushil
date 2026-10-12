import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { productsService } from './products.service';
import { ShippingAddressInput, shippingAddressSchema } from './products.schemas';

export async function accountRoutes(fastify: FastifyInstance) {
  // All account routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  /**
   * GET /api/v1/account/summary
   * Consolidated customer account hub metrics, profile, and recent activity
   */
  fastify.get('/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string };
    const summary = await productsService.getAccountSummary(user.id);
    return reply.status(200).send({
      statusCode: 200,
      success: true,
      message: 'Account summary fetched successfully',
      data: summary,
    });
  });

  /**
   * GET /api/v1/account/orders
   * Customer order history across reports, consultations, courses, and shop items
   */
  fastify.get(
    '/orders',
    async (request: FastifyRequest<{ Querystring: { limit?: number; offset?: number } }>, reply: FastifyReply) => {
      const user = request.user as { id: string };
      const orders = await productsService.getMyOrders(user.id, request.query);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Order history fetched successfully',
        data: orders,
      });
    }
  );

  /**
   * GET /api/v1/account/orders/:orderId
   * Detailed order breakdown with invoice, tracking, and items
   */
  fastify.get(
    '/orders/:orderId',
    async (request: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
      const user = request.user as { id: string };
      const order = await productsService.getOrderDetails(user.id, request.params.orderId);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Order details fetched successfully',
        data: order,
      });
    }
  );

  /**
   * GET /api/v1/account/downloads
   * "My Digital Products" library for purchased wallpapers, artwork, and bundles
   */
  fastify.get('/downloads', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string };
    const downloads = await productsService.getMyDigitalDownloads(user.id);
    return reply.status(200).send({
      statusCode: 200,
      success: true,
      message: 'Digital downloads fetched successfully',
      data: {
        items: downloads,
        total: downloads.length,
      },
    });
  });

  /**
   * GET /api/v1/account/downloads/:entitlementId
   * Secure expiring signed download link
   */
  fastify.get(
    '/downloads/:entitlementId',
    async (
      request: FastifyRequest<{ Params: { entitlementId: string }; Querystring: { assetIndex?: string } }>,
      reply: FastifyReply
    ) => {
      const user = request.user as { id: string };
      const assetIdx = request.query.assetIndex ? parseInt(request.query.assetIndex, 10) : undefined;
      const downloadInfo = await productsService.getSecureDownloadUrl(user.id, request.params.entitlementId, assetIdx);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Download link generated successfully',
        data: downloadInfo,
      });
    }
  );

  /**
   * Shipping Addresses CRUD
   */
  fastify.get('/addresses', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string };
    const addresses = await productsService.getShippingAddresses(user.id);
    return reply.status(200).send({
      statusCode: 200,
      success: true,
      message: 'Shipping addresses fetched successfully',
      data: addresses,
    });
  });

  fastify.post(
    '/addresses',
    { schema: shippingAddressSchema },
    async (request: FastifyRequest<{ Body: ShippingAddressInput }>, reply: FastifyReply) => {
      const user = request.user as { id: string };
      const address = await productsService.createShippingAddress(user.id, request.body);
      return reply.status(201).send({
        statusCode: 201,
        success: true,
        message: 'Shipping address created successfully',
        data: address,
      });
    }
  );

  fastify.put(
    '/addresses/:id',
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: Partial<ShippingAddressInput> }>,
      reply: FastifyReply
    ) => {
      const user = request.user as { id: string };
      const address = await productsService.updateShippingAddress(user.id, request.params.id, request.body);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Shipping address updated successfully',
        data: address,
      });
    }
  );

  fastify.delete(
    '/addresses/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user as { id: string };
      const result = await productsService.deleteShippingAddress(user.id, request.params.id);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Shipping address deleted successfully',
        data: result,
      });
    }
  );
}
