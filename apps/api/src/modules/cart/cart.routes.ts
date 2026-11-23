import { FastifyInstance } from 'fastify';
import { addToCartSchema, applyCouponSchema, cartService, removeItemSchema, updateCartSchema } from './cart.service';
import { requireActiveCustomer, sendOk } from '../products/shop-http';

/**
 * Saved cart: /api/v1/cart (website `/cart`). Every route needs a logged-in, unblocked customer and
 * acts only on that customer's own cart.
 */
export async function cartRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('preHandler', requireActiveCustomer);

  fastify.get('/', async (request, reply) => sendOk(reply, await cartService.get(request.user.id), 'Cart fetched'));

  fastify.post('/add', async (request, reply) => {
    const body = addToCartSchema.parse(request.body);
    return sendOk(reply, await cartService.add(request.user.id, body), 'Added to cart');
  });

  fastify.put('/update', async (request, reply) => {
    const body = updateCartSchema.parse(request.body);
    return sendOk(reply, await cartService.update(request.user.id, body), 'Cart updated');
  });

  fastify.delete('/remove', async (request, reply) => {
    // The website sends the item in the body of a DELETE; a query string is accepted too.
    const body = removeItemSchema.parse({ ...(request.query as object), ...((request.body as object | null) ?? {}) });
    return sendOk(reply, await cartService.remove(request.user.id, body), 'Item removed');
  });

  fastify.post('/coupon', async (request, reply) => {
    const body = applyCouponSchema.parse(request.body);
    return sendOk(reply, await cartService.applyCoupon(request.user.id, body.code), 'Coupon applied');
  });

  fastify.delete('/coupon', async (request, reply) => {
    return sendOk(reply, await cartService.removeCoupon(request.user.id), 'Coupon removed');
  });

  fastify.delete('/clear', async (request, reply) => {
    await cartService.clear(request.user.id);
    return sendOk(reply, await cartService.get(request.user.id), 'Cart cleared');
  });
}
