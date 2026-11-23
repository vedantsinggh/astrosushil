import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { checkPermission, getRequestStaffAccess } from '../admin/rbac/check-permission';
import { AdminActor } from './content.audit';
import { bannersService } from './banners.service';
import { blogsService } from './blogs.service';
import { contactsService } from './contacts.service';
import { faqsService } from './faqs.service';
import { mediaService } from './media.service';
import { seoService } from './seo.service';
import { settingsService } from './settings.service';
import { testimonialsService } from './testimonials.service';
import {
  adminBannerQuerySchema,
  adminBlogQuerySchema,
  adminContactQuerySchema,
  adminFaqQuerySchema,
  adminMediaQuerySchema,
  adminTestimonialQuerySchema,
  blogSlugParamSchema,
  contactRemarksSchema,
  createBannerSchema,
  createBlogSchema,
  createFaqSchema,
  createMediaSchema,
  createSeoSchema,
  createTestimonialSchema,
  idParamSchema,
  publicBannerQuerySchema,
  publicBlogQuerySchema,
  publicFaqQuerySchema,
  publicMediaQuerySchema,
  publicTestimonialQuerySchema,
  RICH_TEXT_BODY_LIMIT_BYTES,
  seoNameParamSchema,
  submitContactSchema,
  updateBannerSchema,
  updateBlogSchema,
  updateFaqSchema,
  updateMediaSchema,
  updateSeoSchema,
  updateSettingsSchema,
  updateTestimonialSchema,
} from './content.schemas';

/**
 * Website CMS routes, registered once under /api/v1 (routes/index.ts).
 *
 * Public (no login), on the website backend's own paths:
 *   GET  /banners/frontend   GET /blogs   GET /blogs/slug/:slug   GET /blogs/:id   GET /faqs
 *   GET  /testimonial        GET /testimonial/:id   GET /media   GET /media/:id
 *   POST /inquiry            GET /seo/:name         GET /settings
 *
 * Admin, under /admin/..., each behind a staff login, a server-side permission check and (for
 * every write) an audit-log entry written by the service.
 *
 * Responses use the envelope of the products module: { statusCode, success, message, data }.
 */

function send<T>(reply: FastifyReply, data: T, message: string, statusCode: number = 200): FastifyReply {
  return reply.status(statusCode).send({ statusCode, success: true, message, data });
}

function idOf(request: FastifyRequest): string {
  return idParamSchema.parse(request.params).id;
}

async function actorOf(request: FastifyRequest): Promise<AdminActor> {
  const access = await getRequestStaffAccess(request);
  const userAgent = request.headers['user-agent'];
  return {
    id: request.user.id,
    email: access.email || request.user.id,
    ipAddress: request.ip,
    userAgent: typeof userAgent === 'string' ? userAgent : undefined,
  };
}

export async function contentRoutes(fastify: FastifyInstance) {
  // ===========================================================================
  // PUBLIC
  // ===========================================================================

  fastify.get('/banners/frontend', {
    schema: { tags: ['Content'], summary: 'Active banners of one page (?page=home|about|contact|services)' },
    handler: async (request, reply) => {
      const query = publicBannerQuerySchema.parse(request.query);
      return send(reply, await bannersService.getPublicBanners(query.page), 'Banners fetched');
    },
  });

  fastify.get('/blogs', {
    schema: { tags: ['Content'], summary: 'Published blog posts' },
    handler: async (request, reply) => {
      const query = publicBlogQuerySchema.parse(request.query);
      return send(reply, await blogsService.listPublished(query), 'Blogs fetched');
    },
  });

  fastify.get('/blogs/slug/:slug', {
    schema: { tags: ['Content'], summary: 'One published blog post by slug (counts a view)' },
    handler: async (request, reply) => {
      const { slug } = blogSlugParamSchema.parse(request.params);
      return send(reply, await blogsService.getPublishedBySlug(slug), 'Blog fetched');
    },
  });

  fastify.get('/blogs/:id', {
    schema: { tags: ['Content'], summary: 'One published blog post by id (counts a view)' },
    handler: async (request, reply) => {
      return send(reply, await blogsService.getPublishedById(idOf(request)), 'Blog fetched');
    },
  });

  fastify.get('/faqs', {
    schema: { tags: ['Content'], summary: 'Active FAQs (?page=)' },
    handler: async (request, reply) => {
      const query = publicFaqQuerySchema.parse(request.query);
      return send(reply, await faqsService.listPublic(query.page), 'FAQs fetched successfully');
    },
  });

  fastify.get('/testimonial', {
    schema: { tags: ['Content'], summary: 'Active testimonials (?page=&serviceName=&rating=&limit=)' },
    handler: async (request, reply) => {
      const query = publicTestimonialQuerySchema.parse(request.query);
      return send(reply, await testimonialsService.listPublic(query), 'Testimonials fetched');
    },
  });

  fastify.get('/testimonial/:id', {
    schema: { tags: ['Content'], summary: 'One active testimonial' },
    handler: async (request, reply) => {
      return send(reply, await testimonialsService.getPublicById(idOf(request)), 'Testimonial fetched');
    },
  });

  fastify.get('/media', {
    schema: { tags: ['Content'], summary: 'Active media items (?section=podcast|celebrity|wishes)' },
    handler: async (request, reply) => {
      const query = publicMediaQuerySchema.parse(request.query);
      return send(reply, await mediaService.listPublic(query.section), 'Media fetched successfully');
    },
  });

  fastify.get('/media/:id', {
    schema: { tags: ['Content'], summary: 'One active media item' },
    handler: async (request, reply) => {
      return send(reply, await mediaService.getPublicById(idOf(request)), 'Media fetched');
    },
  });

  fastify.post('/inquiry', {
    schema: { tags: ['Content'], summary: 'Submit the contact form (limited per IP)' },
    handler: async (request, reply) => {
      const body = submitContactSchema.parse(request.body);
      return send(reply, await contactsService.submit(body, request.ip), 'Contact submitted successfully');
    },
  });

  fastify.get('/seo/:name', {
    schema: { tags: ['Content'], summary: 'SEO meta of one page by name' },
    handler: async (request, reply) => {
      const { name } = seoNameParamSchema.parse(request.params);
      return send(reply, await seoService.getPublicByName(name), 'SEO fetched successfully');
    },
  });

  fastify.get('/settings', {
    schema: { tags: ['Content'], summary: 'Public site settings (allow-listed fields only)' },
    handler: async (_request, reply) => {
      return send(reply, await settingsService.getPublicSettings(), 'Settings fetched successfully');
    },
  });

  // ===========================================================================
  // ADMIN
  // ===========================================================================

  await fastify.register(async (admin) => {
    admin.addHook('onRequest', fastify.authenticate);
    admin.addHook('onRequest', fastify.authorize(['SUPER_ADMIN', 'ADMIN', 'SUPPORT']));

    // ----- Banners -----------------------------------------------------------

    admin.get('/admin/banners', {
      preHandler: [checkPermission('banners:read')],
      schema: { tags: ['Admin Content'], summary: 'List banners (?page=&type=&isActive=)' },
      handler: async (request, reply) => {
        const query = adminBannerQuerySchema.parse(request.query);
        return send(reply, await bannersService.list(query), 'Banners fetched');
      },
    });

    admin.get('/admin/banners/:id', {
      preHandler: [checkPermission('banners:read')],
      schema: { tags: ['Admin Content'], summary: 'Get a banner' },
      handler: async (request, reply) => send(reply, await bannersService.getById(idOf(request)), 'Banner fetched'),
    });

    admin.post('/admin/banners', {
      preHandler: [checkPermission('banners:create')],
      schema: { tags: ['Admin Content'], summary: 'Create a banner' },
      handler: async (request, reply) => {
        const body = createBannerSchema.parse(request.body);
        return send(reply, await bannersService.create(body, await actorOf(request)), 'Banner created successfully', 201);
      },
    });

    admin.put('/admin/banners/:id', {
      preHandler: [checkPermission('banners:update')],
      schema: { tags: ['Admin Content'], summary: 'Update a banner' },
      handler: async (request, reply) => {
        const body = updateBannerSchema.parse(request.body);
        return send(reply, await bannersService.update(idOf(request), body, await actorOf(request)), 'Banner updated successfully');
      },
    });

    admin.patch('/admin/banners/:id/toggle', {
      preHandler: [checkPermission('banners:update')],
      schema: { tags: ['Admin Content'], summary: 'Activate or deactivate a banner' },
      handler: async (request, reply) => {
        const banner = await bannersService.toggle(idOf(request), await actorOf(request));
        return send(reply, banner, `Banner ${banner.isActive ? 'activated' : 'deactivated'}`);
      },
    });

    admin.delete('/admin/banners/:id', {
      preHandler: [checkPermission('banners:delete')],
      schema: { tags: ['Admin Content'], summary: 'Delete a banner' },
      handler: async (request, reply) => {
        await bannersService.remove(idOf(request), await actorOf(request));
        return send(reply, null, 'Banner deleted successfully');
      },
    });

    // ----- Blogs -------------------------------------------------------------

    admin.get('/admin/blogs', {
      preHandler: [checkPermission('blogs:read')],
      schema: { tags: ['Admin Content'], summary: 'List blog posts of every status' },
      handler: async (request, reply) => {
        const query = adminBlogQuerySchema.parse(request.query);
        return send(reply, await blogsService.list(query), 'Blogs fetched');
      },
    });

    admin.get('/admin/blogs/:id', {
      preHandler: [checkPermission('blogs:read')],
      schema: { tags: ['Admin Content'], summary: 'Get a blog post (does not count a view)' },
      handler: async (request, reply) => send(reply, await blogsService.getById(idOf(request)), 'Blog fetched'),
    });

    admin.post('/admin/blogs', {
      bodyLimit: RICH_TEXT_BODY_LIMIT_BYTES,
      preHandler: [checkPermission('blogs:create')],
      schema: { tags: ['Admin Content'], summary: 'Create a blog post' },
      handler: async (request, reply) => {
        const body = createBlogSchema.parse(request.body);
        return send(reply, await blogsService.create(body, await actorOf(request)), 'Blog created', 201);
      },
    });

    admin.put('/admin/blogs/:id', {
      bodyLimit: RICH_TEXT_BODY_LIMIT_BYTES,
      preHandler: [checkPermission('blogs:update')],
      schema: { tags: ['Admin Content'], summary: 'Update a blog post' },
      handler: async (request, reply) => {
        const body = updateBlogSchema.parse(request.body);
        return send(reply, await blogsService.update(idOf(request), body, await actorOf(request)), 'Blog updated');
      },
    });

    admin.delete('/admin/blogs/:id', {
      preHandler: [checkPermission('blogs:delete')],
      schema: { tags: ['Admin Content'], summary: 'Delete a blog post' },
      handler: async (request, reply) => {
        await blogsService.remove(idOf(request), await actorOf(request));
        return send(reply, null, 'Blog deleted');
      },
    });

    // ----- FAQs --------------------------------------------------------------

    admin.get('/admin/faqs', {
      preHandler: [checkPermission('faqs:read')],
      schema: { tags: ['Admin Content'], summary: 'List FAQs, active and inactive' },
      handler: async (request, reply) => {
        const query = adminFaqQuerySchema.parse(request.query);
        return send(reply, await faqsService.list(query), 'All FAQs fetched');
      },
    });

    admin.get('/admin/faqs/:id', {
      preHandler: [checkPermission('faqs:read')],
      schema: { tags: ['Admin Content'], summary: 'Get a FAQ' },
      handler: async (request, reply) => send(reply, await faqsService.getById(idOf(request)), 'FAQ fetched'),
    });

    admin.post('/admin/faqs', {
      preHandler: [checkPermission('faqs:create')],
      schema: { tags: ['Admin Content'], summary: 'Create a FAQ' },
      handler: async (request, reply) => {
        const body = createFaqSchema.parse(request.body);
        return send(reply, await faqsService.create(body, await actorOf(request)), 'FAQ created successfully', 201);
      },
    });

    admin.put('/admin/faqs/:id', {
      preHandler: [checkPermission('faqs:update')],
      schema: { tags: ['Admin Content'], summary: 'Update a FAQ' },
      handler: async (request, reply) => {
        const body = updateFaqSchema.parse(request.body);
        return send(reply, await faqsService.update(idOf(request), body, await actorOf(request)), 'FAQ updated successfully');
      },
    });

    admin.delete('/admin/faqs/:id', {
      preHandler: [checkPermission('faqs:delete')],
      schema: { tags: ['Admin Content'], summary: 'Delete a FAQ' },
      handler: async (request, reply) => {
        await faqsService.remove(idOf(request), await actorOf(request));
        return send(reply, null, 'FAQ deleted successfully');
      },
    });

    // ----- Testimonials ------------------------------------------------------

    admin.get('/admin/testimonials', {
      preHandler: [checkPermission('testimonials:read')],
      schema: { tags: ['Admin Content'], summary: 'List testimonials, active and inactive' },
      handler: async (request, reply) => {
        const query = adminTestimonialQuerySchema.parse(request.query);
        return send(reply, await testimonialsService.list(query), 'Testimonials fetched');
      },
    });

    admin.get('/admin/testimonials/:id', {
      preHandler: [checkPermission('testimonials:read')],
      schema: { tags: ['Admin Content'], summary: 'Get a testimonial' },
      handler: async (request, reply) => send(reply, await testimonialsService.getById(idOf(request)), 'Testimonial fetched'),
    });

    admin.post('/admin/testimonials', {
      preHandler: [checkPermission('testimonials:create')],
      schema: { tags: ['Admin Content'], summary: 'Create a testimonial' },
      handler: async (request, reply) => {
        const body = createTestimonialSchema.parse(request.body);
        return send(reply, await testimonialsService.create(body, await actorOf(request)), 'Created', 201);
      },
    });

    admin.put('/admin/testimonials/:id', {
      preHandler: [checkPermission('testimonials:update')],
      schema: { tags: ['Admin Content'], summary: 'Update a testimonial' },
      handler: async (request, reply) => {
        const body = updateTestimonialSchema.parse(request.body);
        return send(reply, await testimonialsService.update(idOf(request), body, await actorOf(request)), 'Updated');
      },
    });

    admin.patch('/admin/testimonials/:id/toggle', {
      preHandler: [checkPermission('testimonials:update')],
      schema: { tags: ['Admin Content'], summary: 'Activate or deactivate a testimonial' },
      handler: async (request, reply) => {
        const item = await testimonialsService.toggle(idOf(request), await actorOf(request));
        return send(reply, item, `Testimonial ${item.isActive ? 'activated' : 'deactivated'}`);
      },
    });

    admin.delete('/admin/testimonials/:id', {
      preHandler: [checkPermission('testimonials:delete')],
      schema: { tags: ['Admin Content'], summary: 'Delete a testimonial' },
      handler: async (request, reply) => {
        await testimonialsService.remove(idOf(request), await actorOf(request));
        return send(reply, null, 'Deleted');
      },
    });

    // ----- Media -------------------------------------------------------------

    admin.get('/admin/media', {
      preHandler: [checkPermission('media:read')],
      schema: { tags: ['Admin Content'], summary: 'List media items, active and inactive' },
      handler: async (request, reply) => {
        const query = adminMediaQuerySchema.parse(request.query);
        return send(reply, await mediaService.list(query), 'All media fetched');
      },
    });

    admin.get('/admin/media/:id', {
      preHandler: [checkPermission('media:read')],
      schema: { tags: ['Admin Content'], summary: 'Get a media item' },
      handler: async (request, reply) => send(reply, await mediaService.getById(idOf(request)), 'Media fetched'),
    });

    admin.post('/admin/media', {
      preHandler: [checkPermission('media:create')],
      schema: { tags: ['Admin Content'], summary: 'Create a media item' },
      handler: async (request, reply) => {
        const body = createMediaSchema.parse(request.body);
        return send(reply, await mediaService.create(body, await actorOf(request)), 'Media created successfully', 201);
      },
    });

    admin.put('/admin/media/:id', {
      preHandler: [checkPermission('media:update')],
      schema: { tags: ['Admin Content'], summary: 'Update a media item' },
      handler: async (request, reply) => {
        const body = updateMediaSchema.parse(request.body);
        return send(reply, await mediaService.update(idOf(request), body, await actorOf(request)), 'Media updated successfully');
      },
    });

    admin.patch('/admin/media/:id/toggle', {
      preHandler: [checkPermission('media:update')],
      schema: { tags: ['Admin Content'], summary: 'Activate or deactivate a media item' },
      handler: async (request, reply) => {
        const item = await mediaService.toggle(idOf(request), await actorOf(request));
        return send(reply, item, `Media ${item.isActive ? 'activated' : 'deactivated'}`);
      },
    });

    admin.delete('/admin/media/:id', {
      preHandler: [checkPermission('media:delete')],
      schema: { tags: ['Admin Content'], summary: 'Delete a media item' },
      handler: async (request, reply) => {
        await mediaService.remove(idOf(request), await actorOf(request));
        return send(reply, null, 'Media deleted successfully');
      },
    });

    // ----- Contact inquiries -------------------------------------------------

    admin.get('/admin/inquiries', {
      preHandler: [checkPermission('contacts:read')],
      schema: { tags: ['Admin Content'], summary: 'List contact inquiries (?page=&limit=&search=&fromDate=&toDate=)' },
      handler: async (request, reply) => {
        const query = adminContactQuerySchema.parse(request.query);
        return send(reply, await contactsService.list(query), 'Contacts fetched');
      },
    });

    admin.get('/admin/inquiries/:id', {
      preHandler: [checkPermission('contacts:read')],
      schema: { tags: ['Admin Content'], summary: 'Get a contact inquiry' },
      handler: async (request, reply) => send(reply, await contactsService.getById(idOf(request)), 'Contact fetched'),
    });

    admin.patch('/admin/inquiries/:id/remarks', {
      preHandler: [checkPermission('contacts:update')],
      schema: { tags: ['Admin Content'], summary: 'Set the admin remarks of a contact inquiry' },
      handler: async (request, reply) => {
        const body = contactRemarksSchema.parse(request.body ?? {});
        const contact = await contactsService.updateRemarks(idOf(request), body.remarks, await actorOf(request));
        return send(reply, contact, 'Remarks updated successfully');
      },
    });

    admin.delete('/admin/inquiries/:id', {
      preHandler: [checkPermission('contacts:delete')],
      schema: { tags: ['Admin Content'], summary: 'Delete a contact inquiry' },
      handler: async (request, reply) => {
        await contactsService.remove(idOf(request), await actorOf(request));
        return send(reply, null, 'Contact deleted successfully');
      },
    });

    // ----- SEO ---------------------------------------------------------------

    admin.get('/admin/seo', {
      preHandler: [checkPermission('seo:read')],
      schema: { tags: ['Admin Content'], summary: 'List the SEO meta of every page' },
      handler: async (_request, reply) => send(reply, await seoService.list(), 'All SEO fetched'),
    });

    admin.get('/admin/seo/:id', {
      preHandler: [checkPermission('seo:read')],
      schema: { tags: ['Admin Content'], summary: 'Get the SEO meta of a page by id' },
      handler: async (request, reply) => send(reply, await seoService.getById(idOf(request)), 'SEO fetched successfully'),
    });

    admin.post('/admin/seo', {
      preHandler: [checkPermission('seo:create')],
      schema: { tags: ['Admin Content'], summary: 'Create the SEO meta of a page' },
      handler: async (request, reply) => {
        const body = createSeoSchema.parse(request.body);
        return send(reply, await seoService.create(body, await actorOf(request)), 'SEO created successfully', 201);
      },
    });

    admin.put('/admin/seo/:id', {
      preHandler: [checkPermission('seo:update')],
      schema: { tags: ['Admin Content'], summary: 'Update the SEO meta of a page' },
      handler: async (request, reply) => {
        const body = updateSeoSchema.parse(request.body);
        return send(reply, await seoService.update(idOf(request), body, await actorOf(request)), 'SEO updated successfully');
      },
    });

    admin.delete('/admin/seo/:id', {
      preHandler: [checkPermission('seo:delete')],
      schema: { tags: ['Admin Content'], summary: 'Delete the SEO meta of a page' },
      handler: async (request, reply) => {
        await seoService.remove(idOf(request), await actorOf(request));
        return send(reply, null, 'SEO deleted successfully');
      },
    });

    // ----- Site settings -----------------------------------------------------

    admin.get('/admin/settings', {
      preHandler: [checkPermission('settings:read')],
      schema: { tags: ['Admin Content'], summary: 'The complete site settings' },
      handler: async (_request, reply) => send(reply, await settingsService.getSettings(), 'Settings fetched successfully'),
    });

    admin.put('/admin/settings', {
      bodyLimit: RICH_TEXT_BODY_LIMIT_BYTES,
      preHandler: [checkPermission('settings:update')],
      schema: { tags: ['Admin Content'], summary: 'Update any subset of the site settings sections' },
      handler: async (request, reply) => {
        const body = updateSettingsSchema.parse(request.body);
        return send(reply, await settingsService.update(body, await actorOf(request)), 'Settings updated successfully');
      },
    });
  });
}
