import { FastifyInstance } from 'fastify';
import {
  courseLinksService,
  createCourseLinkSchema,
  listCourseLinksQuerySchema,
  updateCourseLinkSchema,
} from './course-links.service';
import { adminActor, protectAdminScope, requirePermission, sendOk } from '../products/shop-http';

const CLICK_LIMIT = { rateLimit: { max: 30, timeWindow: '1 minute' } };

/**
 * Public: /api/v1/course-links (the website's course catalogue of outside links).
 * `/api/v1/courses` stays the in-app course module.
 */
export async function courseLinksRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const query = listCourseLinksQuerySchema.parse(request.query);
    const items = await courseLinksService.listPublic(query);
    return sendOk(reply, { items, total: items.length }, 'Courses fetched');
  });

  fastify.get('/slug/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    return sendOk(reply, await courseLinksService.getPublic(slug), 'Course fetched');
  });

  /** Counts the click, then sends the browser to the outside platform. */
  fastify.get('/:idOrSlug/go', { config: CLICK_LIMIT }, async (request, reply) => {
    const { idOrSlug } = request.params as { idOrSlug: string };
    const { redirectUrl } = await courseLinksService.registerClick(idOrSlug);
    return reply.redirect(redirectUrl, 302);
  });

  /** Same count for clients that open the link themselves (the app): returns the URL. */
  fastify.post('/:idOrSlug/click', { config: CLICK_LIMIT }, async (request, reply) => {
    const { idOrSlug } = request.params as { idOrSlug: string };
    return sendOk(reply, await courseLinksService.registerClick(idOrSlug), 'Click recorded');
  });

  fastify.get('/:idOrSlug', async (request, reply) => {
    const { idOrSlug } = request.params as { idOrSlug: string };
    return sendOk(reply, await courseLinksService.getPublic(idOrSlug), 'Course fetched');
  });
}

/** Admin: /api/v1/admin/course-links */
export async function adminCourseLinksRoutes(fastify: FastifyInstance) {
  protectAdminScope(fastify);

  fastify.get('/course-links', { preHandler: [requirePermission('courses:read')] }, async (request, reply) => {
    const query = listCourseLinksQuerySchema.parse(request.query);
    return sendOk(reply, await courseLinksService.list(query), 'Courses fetched');
  });

  fastify.get('/course-links/:id', { preHandler: [requirePermission('courses:read')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendOk(reply, await courseLinksService.get(id), 'Course fetched');
  });

  fastify.post('/course-links', { preHandler: [requirePermission('courses:create')] }, async (request, reply) => {
    const body = createCourseLinkSchema.parse(request.body);
    return sendOk(reply, await courseLinksService.create(body, await adminActor(request)), 'Course created', 201);
  });

  fastify.put('/course-links/:id', { preHandler: [requirePermission('courses:update')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateCourseLinkSchema.parse(request.body);
    return sendOk(reply, await courseLinksService.update(id, body, await adminActor(request)), 'Course updated');
  });

  fastify.delete('/course-links/:id', { preHandler: [requirePermission('courses:delete')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return sendOk(reply, await courseLinksService.remove(id, await adminActor(request)), 'Deleted');
  });
}
