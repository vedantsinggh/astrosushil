import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { productsService } from './products.service';
import {
  ListProductsQuery,
  CalculateCartInput,
  CreateShopOrderInput,
  VerifyShopPaymentInput,
  listProductsSchema,
  calculateCartSchema,
  createShopOrderSchema,
  verifyShopPaymentSchema,
} from './products.schemas';

export async function productsRoutes(fastify: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // 1. PUBLIC PRODUCT DISCOVERY & DETAILS
  // ---------------------------------------------------------------------------

  /**
   * GET /api/v1/products
   * List verified products with filters, search, and pagination
   */
  fastify.get(
    '/',
    {
      schema: listProductsSchema,
    },
    async (request: FastifyRequest<{ Querystring: ListProductsQuery }>, reply: FastifyReply) => {
      const result = await productsService.listProducts(request.query);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Products fetched successfully',
        data: result,
      });
    }
  );

  /**
   * POST /api/v1/products/cart/calculate
   * Server-authoritative cart calculation
   */
  fastify.post(
    '/cart/calculate',
    {
      onRequest: [fastify.authenticateOptional],
      schema: calculateCartSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request.user as any)?.id || null;
      const body = request.body as CalculateCartInput;
      const result = await productsService.calculateCart(userId, body);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Cart calculated successfully',
        data: result,
      });
    }
  );

  /**
   * POST /api/v1/products/orders
   * Create shop order reusing unified commerce architecture
   */
  fastify.post(
    '/orders',
    {
      onRequest: [fastify.authenticate],
      schema: createShopOrderSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { id: string };
      const body = request.body as CreateShopOrderInput;
      const result = await productsService.createShopOrder(user, body);
      const statusCode = (result as any).isExisting ? 200 : 201;
      return reply.status(statusCode).send({
        statusCode,
        success: true,
        message: (result as any).isExisting ? 'Existing order retrieved' : 'Shop order created successfully',
        data: result,
      });
    }
  );

  /**
   * POST /api/v1/products/orders/verify-payment
   * POST /api/v1/products/orders/:orderId/verify-payment
   * Verify Razorpay payment signature and fulfill products idempotently
   */
  fastify.post(
    '/orders/verify-payment',
    {
      onRequest: [fastify.authenticate],
      schema: verifyShopPaymentSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { id: string; role?: string };
      const body = request.body as VerifyShopPaymentInput;
      const result = await productsService.verifyShopPayment(user, body);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: result.message,
        data: result,
      });
    }
  );

  fastify.post(
    '/orders/:orderId/verify-payment',
    {
      onRequest: [fastify.authenticate],
      schema: verifyShopPaymentSchema,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user as { id: string; role?: string };
      const params = request.params as { orderId: string };
      const body = request.body as VerifyShopPaymentInput;
      const payload = {
        ...body,
        orderId: params.orderId,
      };
      const result = await productsService.verifyShopPayment(user, payload);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: result.message,
        data: result,
      });
    }
  );

  /**
   * GET /api/v1/products/:idOrSlug
   * Get product details (placed after static subpaths to avoid conflict)
   */
  fastify.get(
    '/:idOrSlug',
    async (request: FastifyRequest<{ Params: { idOrSlug: string } }>, reply: FastifyReply) => {
      const product = await productsService.getProductDetails(request.params.idOrSlug);
      return reply.status(200).send({
        statusCode: 200,
        success: true,
        message: 'Product details fetched successfully',
        data: product,
      });
    }
  );
}
