import { FastifyInstance } from 'fastify';
import { wishlistProductSchema, wishlistService } from './wishlist.service';
import { requireActiveCustomer, sendOk } from '../products/shop-http';

/** Wishlist: /api/v1/wishlist (website `/wishlist`). The customer's own list only. */
export async function wishlistRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);
  fastify.addHook('preHandler', requireActiveCustomer);

  fastify.get('/', async (request, reply) => sendOk(reply, await wishlistService.get(request.user.id), 'Wishlist fetched'));

  fastify.post('/add', async (request, reply) => {
    const { productId } = wishlistProductSchema.parse(request.body);
    return sendOk(reply, await wishlistService.add(request.user.id, productId), 'Added to wishlist');
  });

  fastify.post('/toggle', async (request, reply) => {
    const { productId } = wishlistProductSchema.parse(request.body);
    return sendOk(reply, await wishlistService.toggle(request.user.id, productId), 'Wishlist updated');
  });

  fastify.post('/remove', async (request, reply) => {
    const { productId } = wishlistProductSchema.parse(request.body);
    return sendOk(reply, await wishlistService.remove(request.user.id, productId), 'Removed from wishlist');
  });

  fastify.delete('/clear', async (request, reply) => {
    return sendOk(reply, await wishlistService.clear(request.user.id), 'Wishlist cleared');
  });
}
