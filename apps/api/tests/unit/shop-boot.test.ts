import { describe, it, expect } from 'vitest';
import { buildApp } from '../../src/app';

describe('route table', () => {
  it('registers every route of the API together with the shop routes, without a clash', async () => {
    const app = buildApp();
    await app.ready();
    const has = (method: string, url: string) => app.hasRoute({ method: method as 'GET', url });
    expect(has('GET', '/api/v1/categories/tree')).toBe(true);
    expect(has('GET', '/api/v1/cart')).toBe(true);
    expect(has('POST', '/api/v1/wishlist/toggle')).toBe(true);
    expect(has('GET', '/api/v1/coupons/frontend')).toBe(true);
    expect(has('POST', '/api/v1/orders/create')).toBe(true);
    expect(has('GET', '/api/v1/course-links/:idOrSlug/go')).toBe(true);
    expect(has('PATCH', '/api/v1/admin/shop-orders/:orderId/status')).toBe(true);
    expect(has('POST', '/api/v1/admin/shop-products')).toBe(true);
    expect(has('DELETE', '/api/v1/admin/customers/:id')).toBe(true);
    // The app's existing shop and course endpoints are still there.
    expect(has('POST', '/api/v1/products/cart/calculate')).toBe(true);
    expect(has('POST', '/api/v1/products/orders')).toBe(true);
    expect(has('GET', '/api/v1/products/:idOrSlug')).toBe(true);
    expect(has('GET', '/api/v1/account/downloads/:entitlementId')).toBe(true);
    expect(has('PATCH', '/api/v1/account/addresses/:id/default')).toBe(true);
    expect(has('GET', '/api/v1/courses/:idOrSlug')).toBe(true);
    expect(has('POST', '/api/v1/courses/enroll')).toBe(true);
    await app.close();
  });
});
