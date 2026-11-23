import { FastifyInstance } from 'fastify';
import {
  categoriesService,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from './categories.service';
import { adminActor, protectAdminScope, requirePermission, sendOk } from '../products/shop-http';

/** Public: GET /api/v1/categories, /categories/tree, /categories/:idOrSlug */
export async function categoriesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const query = listCategoriesQuerySchema.parse(request.query);
    return sendOk(reply, await categoriesService.list(query, { publicOnly: true }), 'Categories fetched');
  });

  fastify.get('/tree', async (_request, reply) => {
    return sendOk(reply, await categoriesService.tree({ publicOnly: true }), 'Category tree fetched');
  });

  fastify.get('/:idOrSlug', async (request, reply) => {
    const { idOrSlug } = request.params as { idOrSlug: string };
    return sendOk(reply, await categoriesService.get(idOrSlug, { publicOnly: true }), 'Category fetched');
  });
}

/** Admin: /api/v1/admin/categories */
export async function adminCategoriesRoutes(fastify: FastifyInstance) {
  protectAdminScope(fastify);

  fastify.get('/categories', { preHandler: [requirePermission('categories:read')] }, async (request, reply) => {
    const query = listCategoriesQuerySchema.parse(request.query);
    return sendOk(reply, await categoriesService.list(query, { publicOnly: false }), 'Categories fetched');
  });

  fastify.get('/categories/tree', { preHandler: [requirePermission('categories:read')] }, async (_request, reply) => {
    return sendOk(reply, await categoriesService.tree({ publicOnly: false }), 'Category tree fetched');
  });

  fastify.get('/categories/:id', { preHandler: [requirePermission('categories:read')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendOk(reply, await categoriesService.get(id, { publicOnly: false }), 'Category fetched');
  });

  fastify.post('/categories', { preHandler: [requirePermission('categories:create')] }, async (request, reply) => {
    const body = createCategorySchema.parse(request.body);
    return sendOk(reply, await categoriesService.create(body, await adminActor(request)), 'Category created', 201);
  });

  fastify.put('/categories/:id', { preHandler: [requirePermission('categories:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateCategorySchema.parse(request.body);
    return sendOk(reply, await categoriesService.update(id, body, await adminActor(request)), 'Category updated');
  });

  fastify.delete('/categories/:id', { preHandler: [requirePermission('categories:delete')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendOk(reply, await categoriesService.remove(id, await adminActor(request)), 'Category deleted');
  });
}
