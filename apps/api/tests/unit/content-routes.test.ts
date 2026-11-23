import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';

vi.mock('../../src/services/prisma.service', async () => {
  const { fakePrisma } = await import('./content-test-helpers');
  return { prisma: fakePrisma };
});
vi.mock('../../src/modules/admin/admin.service', () => ({ adminService: { logAction: vi.fn() } }));
vi.mock('../../src/services/storage/storage-refs', () => ({
  validateUploadedRef: vi.fn((ref: { url?: string; key?: string }) => ({ url: ref.url ?? null, key: ref.key ?? 'derived-key' })),
  deleteUploadedObject: vi.fn(async () => true),
}));
vi.mock('../../src/services/redis-client', () => ({
  nativeRedisClient: { isConfigured: false, get: vi.fn(), del: vi.fn(), eval: vi.fn() },
}));

/** Permissions of the acting staff member, set per test. The real resolver reads them from the database. */
const granted = vi.hoisted(() => ({ permissions: new Set<string>() }));
vi.mock('../../src/modules/admin/rbac/check-permission', async () => {
  const { AuthorizationError } = await import('../../src/errors/app-error');
  return {
    checkPermission: (...required: string[]) => async (request: FastifyRequest) => {
      if (!request.user?.id) throw new AuthorizationError('Authentication required');
      if (!required.some((permission) => granted.permissions.has(permission))) {
        throw new AuthorizationError(`lacks '${required.join("' or '")}' permission`);
      }
    },
    getRequestStaffAccess: async () => ({ email: 'staff@example.test' }),
  };
});

import { adminService } from '../../src/modules/admin/admin.service';
import { globalErrorHandler } from '../../src/errors/error-handler';
import { registerJwt } from '../../src/plugins/jwt';
import { contentRoutes } from '../../src/modules/content/content.routes';
import { contentCache } from '../../src/modules/content/content.cache';
import { CONTACT_SUBMIT_MAX } from '../../src/modules/content/contacts.service';
import { fakePrisma, resetFakePrisma } from './content-test-helpers';

const logAction = vi.mocked(adminService.logAction);
const ID = '11111111-1111-4111-8111-111111111111';

/** Every admin route of the content module with the permission it must demand. */
const ADMIN_ROUTES: Array<[method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, permission: string]> = [
  ['GET', '/admin/banners', 'banners:read'],
  ['GET', `/admin/banners/${ID}`, 'banners:read'],
  ['POST', '/admin/banners', 'banners:create'],
  ['PUT', `/admin/banners/${ID}`, 'banners:update'],
  ['PATCH', `/admin/banners/${ID}/toggle`, 'banners:update'],
  ['DELETE', `/admin/banners/${ID}`, 'banners:delete'],
  ['GET', '/admin/blogs', 'blogs:read'],
  ['GET', `/admin/blogs/${ID}`, 'blogs:read'],
  ['POST', '/admin/blogs', 'blogs:create'],
  ['PUT', `/admin/blogs/${ID}`, 'blogs:update'],
  ['DELETE', `/admin/blogs/${ID}`, 'blogs:delete'],
  ['GET', '/admin/faqs', 'faqs:read'],
  ['GET', `/admin/faqs/${ID}`, 'faqs:read'],
  ['POST', '/admin/faqs', 'faqs:create'],
  ['PUT', `/admin/faqs/${ID}`, 'faqs:update'],
  ['DELETE', `/admin/faqs/${ID}`, 'faqs:delete'],
  ['GET', '/admin/testimonials', 'testimonials:read'],
  ['GET', `/admin/testimonials/${ID}`, 'testimonials:read'],
  ['POST', '/admin/testimonials', 'testimonials:create'],
  ['PUT', `/admin/testimonials/${ID}`, 'testimonials:update'],
  ['PATCH', `/admin/testimonials/${ID}/toggle`, 'testimonials:update'],
  ['DELETE', `/admin/testimonials/${ID}`, 'testimonials:delete'],
  ['GET', '/admin/media', 'media:read'],
  ['GET', `/admin/media/${ID}`, 'media:read'],
  ['POST', '/admin/media', 'media:create'],
  ['PUT', `/admin/media/${ID}`, 'media:update'],
  ['PATCH', `/admin/media/${ID}/toggle`, 'media:update'],
  ['DELETE', `/admin/media/${ID}`, 'media:delete'],
  ['GET', '/admin/inquiries', 'contacts:read'],
  ['GET', `/admin/inquiries/${ID}`, 'contacts:read'],
  ['PATCH', `/admin/inquiries/${ID}/remarks`, 'contacts:update'],
  ['DELETE', `/admin/inquiries/${ID}`, 'contacts:delete'],
  ['GET', '/admin/seo', 'seo:read'],
  ['GET', `/admin/seo/${ID}`, 'seo:read'],
  ['POST', '/admin/seo', 'seo:create'],
  ['PUT', `/admin/seo/${ID}`, 'seo:update'],
  ['DELETE', `/admin/seo/${ID}`, 'seo:delete'],
  ['GET', '/admin/settings', 'settings:read'],
  ['PUT', '/admin/settings', 'settings:update'],
];

describe('content routes', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let customerToken: string;
  const registeredAdminRoutes: string[] = [];

  const call = (method: string, url: string, options: { token?: string; body?: unknown; ip?: string } = {}) =>
    app.inject({
      method: method as 'GET',
      url,
      headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
      payload: options.body as object | undefined,
      remoteAddress: options.ip,
    });

  beforeAll(async () => {
    app = Fastify();
    app.addHook('onRoute', (route) => {
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      for (const method of methods) {
        if (method !== 'HEAD' && route.url.startsWith('/admin/')) registeredAdminRoutes.push(`${method} ${route.url}`);
      }
    });
    app.setErrorHandler(globalErrorHandler);
    await app.register(registerJwt);
    await app.register(contentRoutes);
    await app.ready();
    adminToken = app.jwt.sign({ sub: 'admin-1', role: 'ADMIN' });
    customerToken = app.jwt.sign({ sub: 'user-1', role: 'USER' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetFakePrisma();
    contentCache.clearLocal();
    logAction.mockClear();
    granted.permissions = new Set();
  });

  it('has no admin route that this test does not cover', () => {
    const expected = ADMIN_ROUTES.map(([method, url]) => `${method} ${url.replace(ID, ':id')}`).sort();
    expect(registeredAdminRoutes.sort()).toEqual(expected);
  });

  describe.each(ADMIN_ROUTES)('%s %s', (method, url, permission) => {
    it('needs a login', async () => {
      const response = await call(method, url);
      expect(response.statusCode).toBe(401);
      expect(response.json().error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('refuses a customer token', async () => {
      granted.permissions = new Set([permission]);
      const response = await call(method, url, { token: customerToken });
      expect(response.statusCode).toBe(403);
    });

    it(`refuses staff without ${permission} and changes nothing`, async () => {
      const every = new Set(ADMIN_ROUTES.map(([, , key]) => key));
      every.delete(permission);
      granted.permissions = every;

      const response = await call(method, url, { token: adminToken, body: {} });
      expect(response.statusCode).toBe(403);
      expect(response.json().error).toMatchObject({ code: 'AUTHORIZATION_ERROR', requestId: expect.any(String) });
      expect(response.json().error.message).toContain(permission);
      expect(logAction).not.toHaveBeenCalled();
      for (const model of Object.values(fakePrisma)) expect(model.rows).toHaveLength(0);
    });

    it(`lets staff with ${permission} through the permission check`, async () => {
      granted.permissions = new Set([permission]);
      const response = await call(method, url, { token: adminToken, body: {} });
      expect([401, 403]).not.toContain(response.statusCode);
    });
  });

  describe('public endpoints need no login', () => {
    it.each([
      '/banners/frontend',
      '/banners/frontend?page=about',
      '/blogs',
      '/faqs',
      '/testimonial',
      '/media',
      '/media?section=podcast',
      '/settings',
    ])('GET %s', async (url) => {
      const response = await call('GET', url);
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ statusCode: 200, success: true });
    });

    it('answers 404 in the standard error shape for unknown records', async () => {
      for (const url of ['/seo/home', `/blogs/${ID}`, '/blogs/slug/nope', `/media/${ID}`, `/testimonial/${ID}`]) {
        const response = await call('GET', url);
        expect(response.statusCode).toBe(404);
        expect(response.json().error).toMatchObject({ code: 'NOT_FOUND', requestId: expect.any(String) });
      }
    });

    it('rejects malformed ids and query values with a validation error', async () => {
      expect((await call('GET', '/blogs/not-a-uuid')).statusCode).toBe(400);
      expect((await call('GET', '/media?section=testimonial')).statusCode).toBe(400);
      expect((await call('GET', '/blogs?limit=5000')).statusCode).toBe(400);
      expect((await call('GET', '/testimonial?rating=9')).json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  it('GET /settings returns only public fields; the admin endpoint returns the rest', async () => {
    await fakePrisma.siteSetting.create({
      data: {
        id: 'site',
        data: {
          business: { companyName: 'Astro Sushil LLP', gstNumber: '27ABCDE1234F1Z5', panNumber: 'ABCDE1234F' },
          payment: { codEnabled: false, razorpaySecret: 'RAZORPAY-SECRET-VALUE' },
          smtp: { password: 'SMTP-PASSWORD-VALUE' },
          sms: { apiKey: 'SMS-API-KEY-VALUE' },
        },
      },
    });

    const publicResponse = await call('GET', '/settings');
    expect(publicResponse.body).not.toMatch(/SECRET-VALUE|PASSWORD-VALUE|API-KEY-VALUE|27ABCDE1234F1Z5|ABCDE1234F/);
    expect(publicResponse.json().data.business).toEqual({ companyName: 'Astro Sushil LLP' });

    granted.permissions = new Set(['settings:read']);
    const adminResponse = await call('GET', '/admin/settings', { token: adminToken });
    expect(adminResponse.statusCode).toBe(200);
    expect(adminResponse.json().data.business.gstNumber).toBe('27ABCDE1234F1Z5');
    expect(adminResponse.body).not.toMatch(/SECRET-VALUE|PASSWORD-VALUE|API-KEY-VALUE/);
  });

  it('PUT /admin/settings refuses credentials with a 400 and stores nothing', async () => {
    granted.permissions = new Set(['settings:update']);
    const response = await call('PUT', '/admin/settings', { token: adminToken, body: { smtp: { password: 'x' } } });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(fakePrisma.siteSetting.rows).toHaveLength(0);
    expect(logAction).not.toHaveBeenCalled();
  });

  it('drafts are invisible publicly and visible to the admin; writes are audited with the staff email', async () => {
    granted.permissions = new Set(['blogs:create', 'blogs:read', 'blogs:update', 'blogs:delete']);
    const body = {
      title: 'Sade Sati explained',
      shortDescription: 'What the seven and a half years mean.',
      content: '<p>Saturn moves slowly.</p><script>alert(1)</script>',
      category: 'Astrology',
    };
    const created = await call('POST', '/admin/blogs', { token: adminToken, body });
    expect(created.statusCode).toBe(201);
    const blog = created.json().data;
    expect(blog).toMatchObject({ slug: 'sade-sati-explained', status: 'draft', content: '<p>Saturn moves slowly.</p>' });
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'BLOG_CREATE', adminId: 'admin-1', adminEmail: 'staff@example.test' })
    );

    expect((await call('GET', '/blogs')).json().data).toEqual({ blogs: [], total: 0 });
    expect((await call('GET', '/blogs/slug/sade-sati-explained')).statusCode).toBe(404);
    expect((await call('GET', `/blogs/${blog.id}`)).statusCode).toBe(404);
    expect((await call('GET', `/admin/blogs/${blog.id}`, { token: adminToken })).statusCode).toBe(200);

    const published = await call('PUT', `/admin/blogs/${blog.id}`, { token: adminToken, body: { status: 'published' } });
    expect(published.statusCode).toBe(200);
    expect((await call('GET', '/blogs')).json().data.total).toBe(1);
    expect((await call('GET', '/blogs/slug/sade-sati-explained')).json().data).toMatchObject({ views: 1, status: 'published' });

    const removed = await call('DELETE', `/admin/blogs/${blog.id}`, { token: adminToken });
    expect(removed.json()).toMatchObject({ statusCode: 200, success: true, data: null });
    expect(fakePrisma.blogPost.rows).toHaveLength(0);
  });

  describe('POST /inquiry', () => {
    const body = { name: 'Asha Rao', email: 'asha@example.com', message: 'Please call me back.' };

    it('accepts a valid form without a login and returns no admin fields', async () => {
      const response = await call('POST', '/inquiry', { body, ip: '198.51.100.20' });
      expect(response.statusCode).toBe(200);
      expect(response.json().data).toMatchObject({ name: 'Asha Rao', email: 'asha@example.com' });
      expect(response.json().data).not.toHaveProperty('remarks');
    });

    it('answers a bad form with field-level validation details', async () => {
      const response = await call('POST', '/inquiry', { body: { name: 'A', message: 'Hi' }, ip: '198.51.100.21' });
      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
      expect(response.json().error.details.map((d: { field: string }) => d.field).sort()).toEqual(['message', 'name']);
      expect(fakePrisma.contactInquiry.rows).toHaveLength(0);
    });

    it('answers 429 in the standard error shape once the per-IP limit is used up', async () => {
      for (let i = 0; i < CONTACT_SUBMIT_MAX; i++) {
        expect((await call('POST', '/inquiry', { body, ip: '198.51.100.22' })).statusCode).toBe(200);
      }
      const blocked = await call('POST', '/inquiry', { body, ip: '198.51.100.22' });
      expect(blocked.statusCode).toBe(429);
      expect(blocked.json().error).toMatchObject({ code: 'RATE_LIMIT_EXCEEDED', requestId: expect.any(String) });
      expect(fakePrisma.contactInquiry.rows).toHaveLength(CONTACT_SUBMIT_MAX);

      expect((await call('POST', '/inquiry', { body, ip: '198.51.100.23' })).statusCode).toBe(200);
    });
  });

  it('serves the SEO meta of a page by name, case-insensitively', async () => {
    granted.permissions = new Set(['seo:create']);
    const created = await call('POST', '/admin/seo', {
      token: adminToken,
      body: { name: 'Home', metaTitle: 'Astro Sushil', metaDescription: 'Vedic astrology' },
    });
    expect(created.statusCode).toBe(201);
    expect((await call('GET', '/seo/HOME')).json().data).toEqual({
      name: 'home', metaTitle: 'Astro Sushil', metaDescription: 'Vedic astrology', image: null,
    });
    const duplicate = await call('POST', '/admin/seo', {
      token: adminToken,
      body: { name: 'home', metaTitle: 'x', metaDescription: 'y' },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('CONFLICT');
  });
});
