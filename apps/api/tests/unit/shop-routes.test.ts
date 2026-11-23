/**
 * HTTP surface of the shop modules: every admin route demands a login and its own permission
 * (checked by the database-backed checker), every customer route demands a login and an unblocked
 * account, public routes are open, and the whole API still registers without a route clash.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';

const state = vi.hoisted(() => ({ permissions: new Set<string>(), blocked: false, checked: [] as string[] }));

vi.mock('../../src/services/prisma.service', () => ({ prisma: {} }));
vi.mock('../../src/modules/admin/admin.service', () => ({
  adminService: { logAction: vi.fn(), getProfile: vi.fn(async () => ({ email: 'staff@example.test' })) },
}));
vi.mock('../../src/modules/admin/rbac/check-permission', async () => {
  const { AuthorizationError } = await import('../../src/errors/app-error');
  return {
    checkPermission: (...required: string[]) => async (request: FastifyRequest) => {
      if (!request.user?.id) throw new AuthorizationError('Authentication required');
      state.checked.push(...required);
      if (!required.some((permission) => state.permissions.has(permission))) {
        throw new AuthorizationError(`lacks '${required.join("' or '")}' permission`);
      }
    },
    getRequestStaffAccess: async () => ({ email: 'staff@example.test' }),
  };
});
vi.mock('../../src/services/feature-access.service', () => ({
  featureAccessService: { isUserSuspended: vi.fn(async () => state.blocked) },
}));
vi.mock('../../src/services/storage/storage-refs', () => ({
  validateUploadedRef: vi.fn(),
  deleteUploadedObject: vi.fn(),
  getUploadedFileSignedUrl: vi.fn(),
  resolveManagedKey: vi.fn(),
}));

const { ok } = vi.hoisted(() => ({ ok: () => vi.fn(async () => ({ ok: true })) }));
vi.mock('../../src/modules/categories/categories.service', async (original) => ({
  ...(await original<typeof import('../../src/modules/categories/categories.service')>()),
  categoriesService: { list: ok(), tree: ok(), get: ok(), create: ok(), update: ok(), remove: ok() },
}));
vi.mock('../../src/modules/products/products.admin.service', async (original) => ({
  ...(await original<typeof import('../../src/modules/products/products.admin.service')>()),
  productsAdminService: { list: ok(), get: ok(), create: ok(), update: ok(), remove: ok() },
}));
vi.mock('../../src/modules/coupons/coupons.service', async (original) => ({
  ...(await original<typeof import('../../src/modules/coupons/coupons.service')>()),
  couponsService: { list: ok(), get: ok(), create: ok(), update: ok(), toggle: ok(), remove: ok(), listForCustomer: ok() },
}));
vi.mock('../../src/modules/cart/cart.service', async (original) => ({
  ...(await original<typeof import('../../src/modules/cart/cart.service')>()),
  cartService: { get: ok(), add: ok(), update: ok(), remove: ok(), applyCoupon: ok(), removeCoupon: ok(), clear: ok() },
}));
vi.mock('../../src/modules/wishlist/wishlist.service', async (original) => ({
  ...(await original<typeof import('../../src/modules/wishlist/wishlist.service')>()),
  wishlistService: { get: ok(), add: ok(), toggle: ok(), remove: ok(), clear: ok() },
}));
vi.mock('../../src/modules/shop-orders/shop-orders.service', async (original) => ({
  ...(await original<typeof import('../../src/modules/shop-orders/shop-orders.service')>()),
  shopOrdersService: {
    checkoutCart: vi.fn(async () => ({ isExisting: false })), listMine: ok(), getMine: ok(), cancelMine: ok(),
    adminList: ok(), adminGet: ok(), adminUpdateStatus: ok(), adminReports: ok(),
  },
}));
vi.mock('../../src/modules/products/products.service', () => ({ productsService: { verifyShopPayment: ok() } }));
vi.mock('../../src/modules/courses/course-links.service', async (original) => ({
  ...(await original<typeof import('../../src/modules/courses/course-links.service')>()),
  courseLinksService: {
    listPublic: vi.fn(async () => []), getPublic: ok(), registerClick: vi.fn(async () => ({ redirectUrl: 'https://courses.example.test/x' })),
    list: ok(), get: ok(), create: ok(), update: ok(), remove: ok(),
  },
}));
vi.mock('../../src/modules/customers/customers.service', async (original) => ({
  ...(await original<typeof import('../../src/modules/customers/customers.service')>()),
  customersService: { list: ok(), get: ok(), update: ok(), remove: ok(), exportCsv: vi.fn(async () => 'First Name\r\n') },
}));

import { globalErrorHandler } from '../../src/errors/error-handler';
import { registerJwt } from '../../src/plugins/jwt';
import { categoriesRoutes, adminCategoriesRoutes } from '../../src/modules/categories/categories.routes';
import { adminProductsRoutes } from '../../src/modules/products/products.admin.routes';
import { cartRoutes } from '../../src/modules/cart/cart.routes';
import { wishlistRoutes } from '../../src/modules/wishlist/wishlist.routes';
import { couponsRoutes, adminCouponsRoutes } from '../../src/modules/coupons/coupons.routes';
import { shopOrdersRoutes, adminShopOrdersRoutes } from '../../src/modules/shop-orders/shop-orders.routes';
import { courseLinksRoutes, adminCourseLinksRoutes } from '../../src/modules/courses/course-links.routes';
import { adminCustomersRoutes } from '../../src/modules/customers/customers.routes';
import { forgetCustomerBlockState } from '../../src/modules/products/shop-http';
import { customersService } from '../../src/modules/customers/customers.service';
import { shopOrdersService } from '../../src/modules/shop-orders/shop-orders.service';

const ID = '11111111-1111-4111-8111-111111111111';
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Every shop admin route with the permission it must demand. */
const ADMIN_ROUTES: Array<[Method, string, string, object?]> = [
  ['GET', '/admin/categories', 'categories:read'],
  ['GET', '/admin/categories/tree', 'categories:read'],
  ['GET', `/admin/categories/${ID}`, 'categories:read'],
  ['POST', '/admin/categories', 'categories:create', { name: 'Gems' }],
  ['PUT', `/admin/categories/${ID}`, 'categories:update', { name: 'Gems' }],
  ['DELETE', `/admin/categories/${ID}`, 'categories:delete'],
  ['GET', '/admin/shop-products', 'products:read'],
  ['GET', `/admin/shop-products/${ID}`, 'products:read'],
  ['POST', '/admin/shop-products', 'products:create', { name: 'Ring', mrpPaise: 1000 }],
  ['PUT', `/admin/shop-products/${ID}`, 'products:update', { name: 'Ring' }],
  ['DELETE', `/admin/shop-products/${ID}`, 'products:delete'],
  ['GET', '/admin/coupons', 'coupons:read'],
  ['GET', `/admin/coupons/${ID}`, 'coupons:read'],
  ['POST', '/admin/coupons', 'coupons:create', { code: 'SAVE10', type: 'FLAT', discount: 100, validTill: '2027-01-01', couponType: 'GLOBAL' }],
  ['PUT', `/admin/coupons/${ID}`, 'coupons:update', { description: 'x' }],
  ['PATCH', `/admin/coupons/${ID}/toggle`, 'coupons:update'],
  ['DELETE', `/admin/coupons/${ID}`, 'coupons:delete'],
  ['GET', '/admin/shop-orders', 'orders:read'],
  ['GET', '/admin/shop-orders/reports', 'orders:export'],
  ['GET', `/admin/shop-orders/${ID}`, 'orders:read'],
  ['PATCH', `/admin/shop-orders/${ID}/status`, 'orders:update', { orderStatus: 'shipped' }],
  ['GET', '/admin/course-links', 'courses:read'],
  ['GET', `/admin/course-links/${ID}`, 'courses:read'],
  ['POST', '/admin/course-links', 'courses:create', { title: 'Nadi', pricePaise: 100, redirectUrl: 'https://courses.example.test/nadi' }],
  ['PUT', `/admin/course-links/${ID}`, 'courses:update', { title: 'Nadi 2' }],
  ['DELETE', `/admin/course-links/${ID}`, 'courses:delete'],
  ['GET', '/admin/customers', 'customers:read'],
  ['GET', '/admin/customers/export', 'customers:read'],
  ['GET', `/admin/customers/${ID}`, 'customers:read'],
  ['PATCH', `/admin/customers/${ID}`, 'customers:update', { status: 'BLOCKED' }],
  ['DELETE', `/admin/customers/${ID}`, 'customers:delete'],
];

const CUSTOMER_ROUTES: Array<[Method, string, object?]> = [
  ['GET', '/cart'],
  ['POST', '/cart/add', { productId: 'herb' }],
  ['PUT', '/cart/update', { productId: 'herb', quantity: 2 }],
  ['DELETE', '/cart/remove?productId=herb'],
  ['POST', '/cart/coupon', { code: 'SAVE10' }],
  ['DELETE', '/cart/coupon'],
  ['DELETE', '/cart/clear'],
  ['GET', '/wishlist'],
  ['POST', '/wishlist/add', { productId: 'herb' }],
  ['POST', '/wishlist/toggle', { productId: 'herb' }],
  ['POST', '/wishlist/remove', { productId: 'herb' }],
  ['DELETE', '/wishlist/clear'],
  ['GET', '/coupons/frontend'],
  ['POST', '/orders/create', {}],
  ['POST', '/orders/verify-payment', { orderId: ID, razorpay_payment_id: 'pay_1', razorpay_order_id: 'order_1', razorpay_signature: 'sig' }],
  ['GET', '/orders/my-orders'],
  ['PATCH', `/orders/${ID}/cancel`],
  ['GET', `/orders/${ID}`],
];

let app: FastifyInstance;
let staffToken: string;
let customerToken: string;

beforeAll(async () => {
  app = Fastify();
  app.setErrorHandler(globalErrorHandler);
  await app.register(registerJwt);
  await app.register(categoriesRoutes, { prefix: '/categories' });
  await app.register(cartRoutes, { prefix: '/cart' });
  await app.register(wishlistRoutes, { prefix: '/wishlist' });
  await app.register(couponsRoutes, { prefix: '/coupons' });
  await app.register(shopOrdersRoutes, { prefix: '/orders' });
  await app.register(courseLinksRoutes, { prefix: '/course-links' });
  for (const plugin of [adminCategoriesRoutes, adminProductsRoutes, adminCouponsRoutes, adminShopOrdersRoutes, adminCourseLinksRoutes, adminCustomersRoutes]) {
    await app.register(plugin, { prefix: '/admin' });
  }
  await app.ready();
  staffToken = app.jwt.sign({ sub: 'staff-1', role: 'ADMIN' });
  customerToken = app.jwt.sign({ sub: 'cust-1', role: 'USER' });
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  state.permissions = new Set();
  state.blocked = false;
  state.checked = [];
  forgetCustomerBlockState('cust-1');
});

const call = (method: Method, url: string, token?: string, payload?: object) =>
  app.inject({
    method,
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    ...(payload ? { payload } : {}),
  });

describe('shop admin routes', () => {
  it.each(ADMIN_ROUTES)('%s %s needs a login', async (method, url, _permission, payload) => {
    const res = await call(method, url, undefined, payload);
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe('AUTHENTICATION_ERROR');
  });

  it.each(ADMIN_ROUTES)('%s %s is closed to customers', async (method, url, _permission, payload) => {
    state.permissions = new Set(ADMIN_ROUTES.map((r) => r[2]));
    const res = await call(method, url, customerToken, payload);
    expect(res.statusCode).toBe(403);
  });

  it.each(ADMIN_ROUTES)('%s %s demands %s', async (method, url, permission, payload) => {
    // Every permission except the one this route needs.
    state.permissions = new Set(ADMIN_ROUTES.map((r) => r[2]).filter((p) => p !== permission));
    const denied = await call(method, url, staffToken, payload);
    expect(denied.statusCode).toBe(403);
    expect(denied.json().error).toMatchObject({ code: 'AUTHORIZATION_ERROR' });
    expect(state.checked).toContain(permission);

    state.permissions = new Set([permission]);
    const allowed = await call(method, url, staffToken, payload);
    expect(allowed.statusCode).toBeLessThan(300);
  });

  it('exports customers as a CSV download', async () => {
    state.permissions = new Set(['customers:read']);
    const res = await call('GET', '/admin/customers/export', staffToken);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('customers.csv');
    expect(vi.mocked(customersService.exportCsv)).toHaveBeenCalled();
  });
});

describe('shop customer routes', () => {
  it.each(CUSTOMER_ROUTES)('%s %s needs a login', async (method, url, payload) => {
    const res = await call(method, url, undefined, payload);
    expect(res.statusCode).toBe(401);
  });

  it.each(CUSTOMER_ROUTES)('%s %s works for a logged-in customer', async (method, url, payload) => {
    const res = await call(method, url, customerToken, payload);
    expect(res.statusCode).toBeLessThan(300);
  });

  it.each(CUSTOMER_ROUTES)('%s %s is refused to a blocked customer (website finding 12)', async (method, url, payload) => {
    state.blocked = true;
    const res = await call(method, url, customerToken, payload);
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('passes the caller, never a user id from the body, to checkout', async () => {
    await call('POST', '/orders/create', customerToken, { userId: 'someone-else', paymentMethod: 'razorpay' });
    const [userId, body] = vi.mocked(shopOrdersService.checkoutCart).mock.calls.at(-1)!;
    expect(userId).toBe('cust-1');
    expect(body).not.toHaveProperty('userId');
  });

  it('rejects a verification without the payment fields', async () => {
    const res = await call('POST', '/orders/verify-payment', customerToken, { orderId: ID });
    expect(res.statusCode).toBe(400);
  });
});

describe('public shop routes', () => {
  it.each([
    ['GET', '/categories'],
    ['GET', '/categories/tree'],
    ['GET', '/categories/gems'],
    ['GET', '/course-links'],
    ['GET', '/course-links/slug/gupt-nadi'],
    ['GET', '/course-links/gupt-nadi'],
  ] as Array<[Method, string]>)('%s %s is open', async (method, url) => {
    const res = await call(method, url);
    expect(res.statusCode).toBe(200);
  });

  it('redirects a course click to the outside platform', async () => {
    const res = await call('GET', '/course-links/gupt-nadi/go');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('https://courses.example.test/x');
    const viaPost = await call('POST', '/course-links/gupt-nadi/click');
    expect(viaPost.json().data).toEqual({ redirectUrl: 'https://courses.example.test/x' });
  });
});
