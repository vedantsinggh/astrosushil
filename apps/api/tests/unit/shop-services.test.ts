/**
 * Shop services against a substituted database, gateway, storage and messaging: owner checks,
 * safe public product reads, coupon holds, checkout, what a paid order triggers, cancellation,
 * payment verification and customer deletion. Nothing leaves the process.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  type Fn = ReturnType<typeof vi.fn>;
  const models = new Map<string, Record<string, Fn>>();
  const model = (name: string) => {
    if (!models.has(name)) {
      models.set(
        name,
        new Proxy({} as Record<string, Fn>, {
          get: (target, key: string | symbol) => (typeof key === 'string' && key !== 'then' ? (target[key] ??= vi.fn()) : undefined),
        })
      );
    }
    return models.get(name)!;
  };
  const roots: Record<string, Fn> = {};
  const prisma: any = new Proxy(
    {},
    {
      get: (_t, key: string | symbol) => {
        // Not a model: symbols (inspection, equality) and the thenable probe of `await`.
        if (typeof key !== 'string' || key === 'then' || key === 'toJSON' || key === 'asymmetricMatch') return undefined;
        if (key === '$transaction') return (roots[key] ??= vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)));
        if (key.startsWith('$')) return (roots[key] ??= vi.fn(async () => []));
        return model(key);
      },
    }
  );
  const reset = () => {
    for (const m of models.values()) for (const fn of Object.values(m)) fn.mockReset();
    for (const [key, fn] of Object.entries(roots)) {
      fn.mockReset();
      if (key === '$transaction') fn.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(prisma));
      else fn.mockImplementation(async () => []);
    }
  };
  return {
    prisma,
    reset,
    paymentService: { createRazorpayOrder: vi.fn(), verifyCheckoutSignature: vi.fn(), fetchRazorpayPayment: vi.fn(), verifySignature: vi.fn() },
    settleOrderPaid: vi.fn(),
    transactionsService: { recordAttempt: vi.fn(), markOrderFailed: vi.fn() },
    fulfillmentService: { createFulfillmentUnitsForOrder: vi.fn(), reconcileOrderFulfillment: vi.fn(), reconcileFulfillmentUnit: vi.fn() },
    notificationService: { sendNotification: vi.fn() },
    notificationEvents: { orderConfirmed: vi.fn(), digitalOrderConfirmed: vi.fn() },
    adminService: { logAction: vi.fn(), getProfile: vi.fn(), suspendUser: vi.fn(), activateUser: vi.fn() },
    featureAccess: { isUserSuspended: vi.fn(async () => false) },
    storage: { getSignedDownloadUrl: vi.fn(async (key: string) => `https://signed.example.test/${key}?sig=1`) },
    refs: {
      validateUploadedRef: vi.fn(),
      deleteUploadedObject: vi.fn(),
      getUploadedFileSignedUrl: vi.fn(async (key: string) => `https://signed.example.test/managed/${key}?sig=1`),
      resolveManagedKey: vi.fn((key: string) => (key.startsWith('private/') ? key : null)),
    },
    quoteCheckout: vi.fn(async (paise: number, currency: unknown) => ({
      currency: (currency as string) || 'INR',
      amountMinor: currency === 'USD' ? Math.round(paise / 85) : paise,
      exchangeRate: currency === 'USD' ? '0.0117647059' : '1.0000000000',
      baseAmountPaise: paise,
    })),
  };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: mocks.prisma }));
vi.mock('../../src/services/payment.service', () => ({ paymentService: mocks.paymentService }));
vi.mock('../../src/modules/commerce/money/settlement', () => ({ settleOrderPaid: mocks.settleOrderPaid }));
vi.mock('../../src/modules/commerce/money/checkout', () => ({ quoteCheckout: mocks.quoteCheckout }));
vi.mock('../../src/modules/transactions/transactions.service', () => ({ transactionsService: mocks.transactionsService }));
vi.mock('../../src/modules/fulfillment/fulfillment.service', () => ({ fulfillmentService: mocks.fulfillmentService }));
vi.mock('../../src/modules/notifications/notification.service', () => ({ notificationService: mocks.notificationService }));
vi.mock('../../src/modules/notifications/notification.events', () => ({ notificationEvents: mocks.notificationEvents }));
vi.mock('../../src/modules/admin/admin.service', () => ({ adminService: mocks.adminService }));
vi.mock('../../src/modules/admin/rbac/check-permission', () => ({ checkPermission: () => async () => undefined }));
vi.mock('../../src/services/feature-access.service', () => ({ featureAccessService: mocks.featureAccess }));
vi.mock('../../src/services/storage.service', () => ({ storageService: mocks.storage }));
vi.mock('../../src/services/storage/storage-refs', () => mocks.refs);
vi.mock('../../src/modules/payments/razorpay-public-key', () => ({ getRazorpayPublicKeyId: () => 'rzp_test_key' }));

import { ProductType } from '@prisma/client';
import { productsService, storageKeyOf } from '../../src/modules/products/products.service';
import { couponsService } from '../../src/modules/coupons/coupons.service';
import { cartService } from '../../src/modules/cart/cart.service';
import { shopOrdersService } from '../../src/modules/shop-orders/shop-orders.service';
import { customersService } from '../../src/modules/customers/customers.service';
import { courseLinksService } from '../../src/modules/courses/course-links.service';
import { isCustomerBlocked, forgetCustomerBlockState } from '../../src/modules/products/shop-http';

const db = mocks.prisma;
const NOW = new Date('2026-11-24T06:00:00Z');
const ACTOR = { id: 'admin-1', email: 'admin@example.test' };

function productRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p-herb',
    slug: 'herb',
    catalogId: 'herb',
    title: 'Herb',
    hindiTitle: null,
    description: null,
    hindiDescription: null,
    category: 'PHYSICAL_HERB',
    productType: ProductType.PHYSICAL,
    mrp: 100000,
    price: 100000,
    currency: 'INR',
    stock: 5,
    isAvailable: true,
    requiresShipping: true,
    imageUrl: null,
    galleryImages: [],
    variants: null,
    metadata: null,
    createdAt: NOW,
    updatedAt: NOW,
    thumbnailUrl: null,
    thumbnailKey: null,
    discountType: 'PERCENTAGE',
    discountValue: 0,
    hasVariants: false,
    gstEnabled: true,
    gstRateBp: 1800,
    gstInclusive: true,
    isPublished: true,
    keywords: [],
    variantRows: [],
    categoryRef: null,
    ...overrides,
  };
}

const ADDRESS = {
  id: 'addr-1',
  userId: 'u1',
  fullName: 'Asha Verma',
  phoneNumber: '+919800000001',
  postalCode: '226001',
  state: 'Uttar Pradesh',
  city: 'Lucknow',
  addressLine1: '12 Hazratganj',
  addressLine2: null,
  landmark: 'Near GPO',
  country: 'India',
};

function cartWith(items: unknown[], couponCode: string | null = null) {
  db.cart.findUnique.mockResolvedValue({ id: 'cart-1', userId: 'u1', couponCode, items });
}

function couponRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    code: 'SAVE10',
    discountType: 'PERCENTAGE',
    discountValue: 1000,
    maxDiscountPaise: null,
    minOrderPaise: 0,
    usageLimit: 1,
    usedCount: 0,
    validFrom: new Date('2026-01-01T00:00:00Z'),
    validTill: new Date('2027-01-01T00:00:00Z'),
    audience: 'GLOBAL',
    oneTimePerUser: true,
    isActive: true,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.reset();
  for (const group of [mocks.paymentService, mocks.transactionsService, mocks.fulfillmentService, mocks.notificationEvents, mocks.adminService]) {
    for (const fn of Object.values(group)) fn.mockReset();
  }
  mocks.settleOrderPaid.mockReset();
  for (const fn of [...Object.values(mocks.refs), ...Object.values(mocks.storage), mocks.quoteCheckout, mocks.notificationService.sendNotification]) {
    fn.mockClear();
  }
  mocks.featureAccess.isUserSuspended.mockReset().mockResolvedValue(false);
  shopOrdersService.configure({
    gateway: { createOrder: vi.fn(async () => ({ id: 'order_gw_1' })) },
    notifier: { orderConfirmed: mocks.notificationEvents.orderConfirmed },
  });
  // The code seed has already run as far as these tests are concerned.
  (productsService as unknown as { seeded: boolean }).seeded = true;
});

describe('public product reads', () => {
  it('looks a product up by id only among published products and returns no file location', async () => {
    db.product.findFirst.mockResolvedValue(
      productRow({ metadata: { digitalAssetKey: 'private/digital-product/paid.zip' }, requiresShipping: false })
    );
    const view = await productsService.getProductDetails('p-herb');
    expect(db.product.findFirst.mock.calls[0][0].where).toMatchObject({ isPublished: true });
    expect(JSON.stringify(view)).not.toContain('paid.zip');
  });

  it('answers 404 for an unpublished product', async () => {
    db.product.findFirst.mockResolvedValue(null);
    await expect(productsService.getProductDetails('hidden')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lists only published, available products', async () => {
    db.product.findMany.mockResolvedValue([]);
    db.product.count.mockResolvedValue(0);
    await productsService.listProducts({});
    expect(db.product.findMany.mock.calls[0][0].where).toMatchObject({ isPublished: true, isAvailable: true });
  });
});

describe('stateless cart/calculate keeps working', () => {
  it('returns the same shape and numbers as before for an 18% inclusive product', async () => {
    db.product.findFirst.mockResolvedValue(productRow());
    const result = await productsService.calculateCart(null, { items: [{ productId: 'herb', quantity: 1 }] });
    const net = Math.round((100000 * 10000) / 11800);
    expect(result).toMatchObject({
      subtotal: net,
      taxAmount: 100000 - net,
      shippingAmount: 50000,
      discountAmount: 0,
      totalAmount: 150000,
      currency: 'INR',
      requiresShipping: true,
      eligibleForFreeShipping: false,
    });
    expect(result.items[0]).toMatchObject({ productId: 'p-herb', unitPrice: 100000, taxRate: 1800, totalAmount: 100000 });
  });

  it('refuses more than the stock of a physical product', async () => {
    db.product.findFirst.mockResolvedValue(productRow({ stock: 1 }));
    await expect(productsService.calculateCart(null, { items: [{ productId: 'herb', quantity: 2 }] })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('addresses: owner checks everywhere (website security finding 6)', () => {
  it('does not update an address of another customer', async () => {
    db.shippingAddress.findFirst.mockResolvedValue(null);
    await expect(productsService.updateShippingAddress('u1', 'addr-other', { city: 'Delhi' })).rejects.toMatchObject({ statusCode: 404 });
    expect(db.shippingAddress.findFirst.mock.calls[0][0].where).toEqual({ id: 'addr-other', userId: 'u1' });
    expect(db.shippingAddress.updateMany).not.toHaveBeenCalled();
  });

  it('writes only address fields, scoped to the owner', async () => {
    db.shippingAddress.findFirst.mockResolvedValue(ADDRESS);
    db.shippingAddress.findFirstOrThrow.mockResolvedValue(ADDRESS);
    await productsService.updateShippingAddress('u1', 'addr-1', { city: 'Delhi', landmark: 'Gate 2', type: 'work', userId: 'attacker' } as never);
    const call = db.shippingAddress.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'addr-1', userId: 'u1' });
    expect(call.data).toEqual({ city: 'Delhi', landmark: 'Gate 2', type: 'WORK' });
  });

  it('does not delete or default an address of another customer', async () => {
    db.shippingAddress.deleteMany.mockResolvedValue({ count: 0 });
    await expect(productsService.deleteShippingAddress('u1', 'addr-other')).rejects.toMatchObject({ statusCode: 404 });
    expect(db.shippingAddress.deleteMany.mock.calls[0][0].where).toEqual({ id: 'addr-other', userId: 'u1' });

    db.shippingAddress.findFirst.mockResolvedValue(null);
    await expect(productsService.setDefaultShippingAddress('u1', 'addr-other')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('makes exactly one address the default', async () => {
    db.shippingAddress.findFirst.mockResolvedValue(ADDRESS);
    await productsService.setDefaultShippingAddress('u1', 'addr-1');
    expect(db.shippingAddress.updateMany.mock.calls[0][0]).toEqual({ where: { userId: 'u1' }, data: { isDefault: false } });
    expect(db.shippingAddress.updateMany.mock.calls[1][0]).toEqual({ where: { id: 'addr-1', userId: 'u1' }, data: { isDefault: true } });
  });

  it('rejects an unknown address type', async () => {
    await expect(productsService.createShippingAddress('u1', { ...ADDRESS, type: 'castle' } as never)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('digital downloads', () => {
  const entitlement = {
    id: 'ent-1',
    userId: 'u1',
    productId: 'p1',
    orderId: 'o1',
    variantId: 'v1',
    status: 'ACTIVE',
    expiresAt: null,
    assetKey: 'private/digital-product/large.zip',
    assetName: 'Maa Lakshmi (Large)',
    bundleAssets: null,
    downloadCount: 2,
    product: { title: 'Maa Lakshmi', imageUrl: null },
  };

  it('issues a short-lived signed link only to the owner of the entitlement', async () => {
    db.digitalProductEntitlement.findFirst.mockResolvedValue(entitlement);
    const result = await productsService.getSecureDownloadUrl('u1', 'ent-1');
    expect(db.digitalProductEntitlement.findFirst.mock.calls[0][0].where).toEqual({ id: 'ent-1', userId: 'u1' });
    expect(mocks.refs.getUploadedFileSignedUrl).toHaveBeenCalledWith('private/digital-product/large.zip', 900);
    expect(result.downloadUrl).toContain('sig=1');
    expect(result.downloadCount).toBe(3);
  });

  it('answers 404 to anyone else and 403 for a revoked purchase', async () => {
    db.digitalProductEntitlement.findFirst.mockResolvedValue(null);
    await expect(productsService.getSecureDownloadUrl('u2', 'ent-1')).rejects.toMatchObject({ statusCode: 404 });
    db.digitalProductEntitlement.findFirst.mockResolvedValue({ ...entitlement, status: 'REVOKED' });
    await expect(productsService.getSecureDownloadUrl('u1', 'ent-1')).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.refs.getUploadedFileSignedUrl).not.toHaveBeenCalled();
  });

  it('signs a website-era file by its key, never handing out the public URL', async () => {
    expect(storageKeyOf('https://bucket.s3.ap-south-1.amazonaws.com/assets/171-file.pdf')).toBe('assets/171-file.pdf');
    db.digitalProductEntitlement.findFirst.mockResolvedValue({
      ...entitlement,
      assetKey: 'https://bucket.s3.ap-south-1.amazonaws.com/assets/171-file.pdf',
    });
    const result = await productsService.getSecureDownloadUrl('u1', 'ent-1');
    expect(mocks.storage.getSignedDownloadUrl).toHaveBeenCalledWith('assets/171-file.pdf', 900);
    expect(result.downloadUrl).not.toBe('https://bucket.s3.ap-south-1.amazonaws.com/assets/171-file.pdf');
  });

  it('lists downloads without any storage key', async () => {
    db.digitalProductEntitlement.findMany.mockResolvedValue([
      {
        ...entitlement,
        bundleAssets: [{ name: 'Art', key: 'private/digital-product/art.webp', type: 'IMAGE' }],
        lastDownloadedAt: null,
        grantedAt: NOW,
        product: { slug: 'maa', title: 'Maa Lakshmi', hindiTitle: null, productType: 'DIGITAL_ART', category: 'DIGITAL_ART', imageUrl: null, thumbnailUrl: null, variantRows: [{ id: 'v1', name: 'Size', value: 'Large' }] },
      },
    ]);
    const list = await productsService.getMyDigitalDownloads('u1');
    expect(JSON.stringify(list)).not.toContain('private/');
    expect(list[0]).toMatchObject({ variantId: 'v1', variantName: 'Large', hasBundleAssets: true });
  });
});

describe('coupons under concurrency', () => {
  it('locks the coupon row before checking the rules and takes a hold', async () => {
    db.$queryRaw.mockResolvedValue([{ id: 'c1' }]);
    db.couponRedemption.findMany.mockResolvedValue([]);
    db.coupon.findUnique.mockResolvedValue(couponRow());
    db.couponRedemption.count.mockResolvedValue(0);
    const superseded = await couponsService.reserveForOrder(db, {
      code: 'save10',
      userId: 'u1',
      itemsTotalPaise: 100000,
      orderId: 'o1',
      expectedDiscountPaise: 10000,
      now: NOW,
    });
    expect(superseded).toEqual([]);
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(db.coupon.findUnique.mock.invocationCallOrder[0]);
    expect(db.couponRedemption.create.mock.calls[0][0].data).toMatchObject({ couponId: 'c1', orderId: 'o1', status: 'RESERVED', discountPaise: 10000 });
  });

  it('refuses the second checkout when the last use is already held', async () => {
    db.$queryRaw.mockResolvedValue([{ id: 'c1' }]);
    db.couponRedemption.findMany.mockResolvedValue([]);
    db.coupon.findUnique.mockResolvedValue(couponRow());
    // redeemed = 0, live holds = 1, this customer's = 0
    db.couponRedemption.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    await expect(
      couponsService.reserveForOrder(db, { code: 'SAVE10', userId: 'u2', itemsTotalPaise: 100000, orderId: 'o2', expectedDiscountPaise: 10000, now: NOW })
    ).rejects.toMatchObject({ statusCode: 409, code: 'COUPON_NO_LONGER_VALID' });
    expect(db.couponRedemption.create).not.toHaveBeenCalled();
  });

  it("replaces the customer's own earlier hold instead of calling the coupon used", async () => {
    db.$queryRaw.mockResolvedValue([{ id: 'c1' }]);
    db.couponRedemption.findMany.mockResolvedValue([{ id: 'r-old', orderId: 'o-old' }]);
    db.coupon.findUnique.mockResolvedValue(couponRow());
    db.couponRedemption.count.mockResolvedValue(0);
    const superseded = await couponsService.reserveForOrder(db, {
      code: 'SAVE10', userId: 'u1', itemsTotalPaise: 100000, orderId: 'o-new', expectedDiscountPaise: 10000, now: NOW,
    });
    expect(superseded).toEqual(['o-old']);
    expect(db.couponRedemption.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: { in: ['r-old'] } }, data: { status: 'RELEASED' } });
  });

  it('records a use once, however often the paid hook runs', async () => {
    db.couponRedemption.findUnique.mockResolvedValue({ id: 'r1', couponId: 'c1', status: 'RESERVED', reservedUntil: new Date(NOW.getTime() + 60000) });
    db.couponRedemption.updateMany.mockResolvedValue({ count: 1 });
    await couponsService.redeemForOrder(db, 'o1', NOW);
    expect(db.coupon.update).toHaveBeenCalledTimes(1);
    expect(db.coupon.update.mock.calls[0][0].data).toEqual({ usedCount: { increment: 1 } });

    db.coupon.update.mockClear();
    db.couponRedemption.findUnique.mockResolvedValue({ id: 'r1', couponId: 'c1', status: 'REDEEMED', reservedUntil: null });
    await couponsService.redeemForOrder(db, 'o1', NOW);
    db.couponRedemption.findUnique.mockResolvedValue({ id: 'r1', couponId: 'c1', status: 'RESERVED', reservedUntil: null });
    db.couponRedemption.updateMany.mockResolvedValue({ count: 0 }); // another transaction got there first
    await couponsService.redeemForOrder(db, 'o1', NOW);
    expect(db.coupon.update).not.toHaveBeenCalled();
  });

  it('shows a customer only coupons that are active, in date and theirs', async () => {
    db.coupon.findMany.mockResolvedValue([couponRow()]);
    const list = await couponsService.listForCustomer('u1', NOW);
    const where = db.coupon.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ isActive: true, validFrom: { lte: NOW }, validTill: { gte: NOW } });
    expect(where.OR[1]).toEqual({ audience: 'INDIVIDUAL', assignments: { some: { userId: 'u1' } } });
    expect(list[0]).toEqual({ code: 'SAVE10', description: undefined, type: 'PERCENTAGE', discount: 10, maxDiscountPaise: null, minOrderPaise: 0, validTill: couponRow().validTill });
  });
});

describe('saved cart', () => {
  it('prices from the catalogue as it is now, not from when the item was added', async () => {
    cartWith([{ id: 'ci1', productId: 'p-herb', variantKey: '', quantity: 2, product: productRow({ price: 80000 }) }]);
    const cart = await cartService.get('u1');
    expect(cart.items[0]).toMatchObject({ price: 80000, total: 160000, quantity: 2 });
    expect(cart).toMatchObject({ subTotal: 160000, shipping: 50000, totalAmount: 210000, canCheckout: true });
  });

  it('flags an item that is no longer published and leaves it out of the total', async () => {
    cartWith([{ id: 'ci1', productId: 'p-herb', variantKey: '', quantity: 1, product: productRow({ isPublished: false }) }]);
    const cart = await cartService.get('u1');
    expect(cart.items[0]).toMatchObject({ available: false, problem: 'PRODUCT_UNAVAILABLE' });
    expect(cart).toMatchObject({ subTotal: 0, canCheckout: false });
  });

  it('applies a valid coupon and refuses an invalid one', async () => {
    const items = [{ id: 'ci1', productId: 'p-herb', variantKey: '', quantity: 1, product: productRow() }];
    db.cart.findUnique.mockResolvedValue({ id: 'cart-1', userId: 'u1', couponCode: null, items });
    db.coupon.findUnique.mockResolvedValue(couponRow());
    db.couponRedemption.count.mockResolvedValue(0);
    const cart = await cartService.applyCoupon('u1', 'save10');
    expect(cart).toMatchObject({ appliedCoupon: 'SAVE10', discount: 10000, totalAmount: 100000 - 10000 + 50000 });
    expect(db.cart.update.mock.calls[0][0].data).toEqual({ couponCode: 'SAVE10' });

    db.cart.update.mockClear();
    db.coupon.findUnique.mockResolvedValue(couponRow({ isActive: false }));
    await expect(cartService.applyCoupon('u1', 'SAVE10')).rejects.toMatchObject({ statusCode: 400, message: 'Invalid coupon' });
    expect(db.cart.update).not.toHaveBeenCalled();
  });

  it('asks for a variant when the product has variants', async () => {
    db.product.findFirst.mockResolvedValue(
      productRow({ hasVariants: true, variantRows: [{ id: 'v1', code: null, name: 'Size', value: 'L', price: 1000, mrp: 1000, stock: 1 }] })
    );
    await expect(cartService.add('u1', { productId: 'herb', quantity: 1 })).rejects.toMatchObject({ statusCode: 400, message: 'Variant required' });
  });
});

describe('checkout of the saved cart', () => {
  const line = { id: 'ci1', productId: 'p-herb', variantKey: '', quantity: 1, product: productRow() };

  it('refuses cash on delivery', async () => {
    await expect(shopOrdersService.checkoutCart('u1', { paymentMethod: 'cod' })).rejects.toMatchObject({ code: 'PAYMENT_METHOD_NOT_AVAILABLE' });
  });

  it('refuses an empty cart, missing stock and a coupon that stopped being valid', async () => {
    cartWith([]);
    await expect(shopOrdersService.checkoutCart('u1', {})).rejects.toMatchObject({ statusCode: 400 });

    cartWith([{ ...line, quantity: 9 }]);
    await expect(shopOrdersService.checkoutCart('u1', { addressId: ADDRESS.id })).rejects.toMatchObject({ code: 'CART_ITEM_UNAVAILABLE' });

    cartWith([line], 'SAVE10');
    db.coupon.findUnique.mockResolvedValue(couponRow({ validTill: new Date('2020-01-01T00:00:00Z') }));
    db.couponRedemption.count.mockResolvedValue(0);
    await expect(shopOrdersService.checkoutCart('u1', { addressId: ADDRESS.id })).rejects.toMatchObject({ code: 'COUPON_NO_LONGER_VALID' });
    expect(db.order.create).not.toHaveBeenCalled();
  });

  it('needs an address for physical goods, and it must be the customer own', async () => {
    cartWith([line]);
    await expect(shopOrdersService.checkoutCart('u1', {})).rejects.toMatchObject({ statusCode: 400 });
    db.shippingAddress.findFirst.mockResolvedValue(null);
    await expect(shopOrdersService.checkoutCart('u1', { addressId: '11111111-1111-4111-8111-111111111111' })).rejects.toMatchObject({ statusCode: 404 });
    expect(db.shippingAddress.findFirst.mock.calls[0][0].where).toEqual({ id: '11111111-1111-4111-8111-111111111111', userId: 'u1' });
  });

  it('creates one gateway order, the order with server-computed lines, the ledger attempt and the address snapshot', async () => {
    const gateway = { createOrder: vi.fn(async () => ({ id: 'order_gw_9' })) };
    shopOrdersService.configure({ gateway });
    cartWith([line]);
    db.shippingAddress.findFirst.mockResolvedValue(ADDRESS);
    db.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'o1', ...data, items: [], razorpayPaymentId: null, createdAt: NOW, updatedAt: NOW,
    }));
    db.shopOrder.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 's1', cancelledAt: null, ...data }));

    const result = await shopOrdersService.checkoutCart('u1', { addressId: ADDRESS.id, paymentMethod: 'razorpay' });

    expect(gateway.createOrder).toHaveBeenCalledTimes(1);
    expect(gateway.createOrder.mock.calls[0].slice(0, 2)).toEqual([150000, 'INR']);
    const order = db.order.create.mock.calls[0][0].data;
    const net = Math.round((100000 * 10000) / 11800);
    expect(order).toMatchObject({
      userId: 'u1', razorpayOrderId: 'order_gw_9', amount: 150000, subtotal: net, taxAmount: 100000 - net,
      shippingAmount: 50000, discountAmount: 0, currency: 'INR', paidCurrency: 'INR', paidAmountMinor: 150000, status: 'PENDING',
    });
    expect(order.items.create[0]).toMatchObject({ itemType: 'PRODUCT', unitPrice: 100000, quantity: 1, taxRate: 1800, taxInclusive: true, fulfillmentType: 'PHYSICAL' });
    expect(db.shopOrder.create.mock.calls[0][0].data).toMatchObject({
      status: 'PAYMENT_PENDING', orderType: 'physical', source: 'cart',
      shippingAddress: { fullName: 'Asha Verma', pincode: '226001', landmark: 'Near GPO' },
    });
    expect(mocks.transactionsService.recordAttempt).toHaveBeenCalledWith(db, expect.objectContaining({ id: 'o1' }), { placeOfSupplyState: 'Uttar Pradesh' });
    expect(result).toMatchObject({ paymentRequired: true, razorpayConfig: { key: 'rzp_test_key', orderId: 'order_gw_9', amount: 150000, currency: 'INR' } });
    // The cart is emptied when the order is paid, not when it is created.
    expect(db.cartItem.deleteMany).not.toHaveBeenCalled();
  });

  it('charges a foreign currency through the money module and keeps the INR amount on the order', async () => {
    const gateway = { createOrder: vi.fn(async () => ({ id: 'order_gw_usd' })) };
    shopOrdersService.configure({ gateway });
    cartWith([{ ...line, product: productRow({ requiresShipping: false, productType: ProductType.DIGITAL, stock: -1 }) }]);
    db.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'o2', ...data, items: [] }));
    db.shopOrder.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 's2', ...data }));
    await shopOrdersService.checkoutCart('u1', { currency: 'USD' });
    expect(mocks.quoteCheckout).toHaveBeenCalledWith(100000, 'USD');
    expect(gateway.createOrder.mock.calls[0].slice(0, 2)).toEqual([Math.round(100000 / 85), 'USD']);
    expect(db.order.create.mock.calls[0][0].data).toMatchObject({ amount: 100000, currency: 'INR', paidCurrency: 'USD' });
  });
});

describe('what a paid order triggers', () => {
  function paidOrder(shopOverrides: Record<string, unknown> = {}, item: Record<string, unknown> = {}) {
    return {
      id: 'o1',
      userId: 'u1',
      shippingAddressId: null,
      shippingAddress: null,
      shippingAmount: 0,
      discountAmount: 0,
      items: [
        {
          id: 'oi1', itemType: 'PRODUCT', catalogId: 'herb', quantity: 2, unitPrice: 100000, fulfillmentType: 'PHYSICAL',
          metadata: { productId: 'p-herb', variantId: null }, ...item,
        },
      ],
      shopOrder: { id: 's1', orderId: 'o1', status: 'PAYMENT_PENDING', orderType: 'physical', source: 'cart', paidEffectsApplied: false, ...shopOverrides },
    };
  }

  it('takes stock with a conditional update, records the coupon use and empties the cart', async () => {
    db.order.findUnique.mockResolvedValue(paidOrder());
    db.product.findFirst.mockResolvedValue(productRow());
    db.product.updateMany.mockResolvedValue({ count: 1 });
    db.couponRedemption.findUnique.mockResolvedValue(null);
    db.cart.findUnique.mockResolvedValue({ id: 'cart-1' });

    const result = await shopOrdersService.applyPaidEffects(db, 'o1');

    expect(result.applied).toBe(true);
    expect(db.product.updateMany.mock.calls[0][0]).toEqual({ where: { id: 'p-herb', stock: { gte: 2 } }, data: { stock: { decrement: 2 } } });
    expect(db.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
    expect(db.shopOrder.update.mock.calls[0][0].data).toMatchObject({ paidEffectsApplied: true, status: 'PLACED' });
  });

  it('never lets stock go below zero and records the shortfall', async () => {
    db.order.findUnique.mockResolvedValue(paidOrder());
    db.product.findFirst.mockResolvedValue(productRow({ stock: 1 }));
    db.product.updateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    db.product.findUnique.mockResolvedValue({ stock: 1 });
    db.couponRedemption.findUnique.mockResolvedValue(null);
    db.cart.findUnique.mockResolvedValue(null);

    await shopOrdersService.applyPaidEffects(db, 'o1');

    expect(db.product.updateMany.mock.calls[1][0]).toEqual({ where: { id: 'p-herb', stock: { lt: 2, gte: 0 } }, data: { stock: 0 } });
    expect(db.shopOrder.update.mock.calls[0][0].data.stockShortfall).toEqual([{ orderItemId: 'oi1', productId: 'p-herb', variantId: null, missing: 1 }]);
  });

  it('runs once per order', async () => {
    db.order.findUnique.mockResolvedValue(paidOrder({ paidEffectsApplied: true }));
    const result = await shopOrdersService.applyPaidEffects(db, 'o1');
    expect(result).toEqual({ applied: false, entitlementIds: [] });
    expect(db.product.updateMany).not.toHaveBeenCalled();
  });

  it('grants one download per digital line, with the file of the purchased variant, and delivers the order', async () => {
    db.order.findUnique.mockResolvedValue(
      paidOrder({ orderType: 'digital' }, { fulfillmentType: 'DIGITAL', quantity: 1, metadata: { productId: 'p-art', variantId: 'size-large' } })
    );
    db.product.findFirst.mockResolvedValue(
      productRow({
        id: 'p-art', title: 'Art', requiresShipping: false, productType: ProductType.DIGITAL_ART, stock: -1,
        metadata: { digitalAssetKey: 'private/digital-product/default.zip' },
        variantRows: [{ id: 'v-large', code: 'size-large', name: 'Size', value: 'Large', price: 1, mrp: 1, stock: 0, downloadKey: 'private/digital-product/large.zip', downloadName: 'large.zip' }],
      })
    );
    db.$queryRaw.mockResolvedValue([{ id: 'unit-1' }]);
    db.digitalProductEntitlement.findFirst.mockResolvedValue(null);
    db.digitalProductEntitlement.create.mockResolvedValue({ id: 'ent-9' });
    db.couponRedemption.findUnique.mockResolvedValue(null);
    db.cart.findUnique.mockResolvedValue(null);

    const result = await shopOrdersService.applyPaidEffects(db, 'o1');

    expect(db.digitalProductEntitlement.findFirst.mock.calls[0][0].where).toEqual({ userId: 'u1', productId: 'p-art', orderId: 'o1', variantId: 'v-large' });
    expect(db.digitalProductEntitlement.create.mock.calls[0][0].data).toMatchObject({
      userId: 'u1', productId: 'p-art', orderId: 'o1', orderItemId: 'oi1', variantId: 'v-large',
      assetKey: 'private/digital-product/large.zip', assetName: 'Art (Large)', fulfillmentUnitId: 'unit-1', status: 'ACTIVE',
    });
    expect(result.entitlementIds).toEqual(['ent-9']);
    expect(db.product.updateMany).not.toHaveBeenCalled();
    expect(db.shopOrder.update.mock.calls[0][0].data.status).toBe('DELIVERED');
  });
});

describe('cancelling an order', () => {
  function order(status: string, paid: boolean, extra: Record<string, unknown> = {}) {
    return {
      id: 'o1', userId: 'u1', status: paid ? 'PAID' : 'PENDING', paymentStatus: paid ? 'CAPTURED' : 'PENDING',
      amount: 100000, currency: 'INR', razorpayOrderId: 'order_gw_1',
      items: [{ id: 'oi1', itemType: 'PRODUCT', fulfillmentType: 'PHYSICAL', quantity: 2, unitPrice: 50000, taxRate: 0, taxAmount: 0, totalAmount: 100000, title: 'Herb', metadata: { productId: 'p-herb', variantId: null } }],
      shopOrder: { id: 's1', orderId: 'o1', status, orderType: 'physical', paidEffectsApplied: paid, stockRestored: false, stockShortfall: null, ...extra },
    };
  }

  it("only finds the caller's own order", async () => {
    db.order.findFirst.mockResolvedValue(null);
    await expect(shopOrdersService.cancelMine('u2', 'o1')).rejects.toMatchObject({ statusCode: 404 });
    expect(db.order.findFirst.mock.calls[0][0].where).toEqual({ id: 'o1', userId: 'u2' });
  });

  it('refuses once the order has shipped', async () => {
    db.order.findFirst.mockResolvedValue(order('SHIPPED', true));
    await expect(shopOrdersService.cancelMine('u1', 'o1')).rejects.toMatchObject({ statusCode: 400 });
    expect(db.shopOrder.update).not.toHaveBeenCalled();
  });

  it('puts the stock back, keeps the payment (no refund) and sends no message', async () => {
    db.order.findFirst.mockResolvedValue(order('PLACED', true));
    db.shopOrder.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...order('PLACED', true).shopOrder, ...data }));
    db.order.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ ...order('PLACED', true), ...data }));

    const view = await shopOrdersService.cancelMine('u1', 'o1');

    expect(db.product.updateMany.mock.calls[0][0]).toEqual({ where: { id: 'p-herb', stock: { gte: 0 } }, data: { stock: { increment: 2 } } });
    expect(db.order.update.mock.calls[0][0].data).toEqual({ status: 'PAID', fulfillmentStatus: 'CANCELLED' });
    expect(db.shopOrder.update.mock.calls[0][0].data).toMatchObject({ status: 'CANCELLED', stockRestored: true, cancelledBy: 'customer:u1' });
    expect(view).toMatchObject({ orderStatus: 'cancelled', payment: { status: 'paid' } });
    expect(mocks.notificationEvents.orderConfirmed).not.toHaveBeenCalled();
    expect(db.refund.create).not.toHaveBeenCalled();
  });

  it('frees the coupon hold of an unpaid order and takes no stock back', async () => {
    db.order.findFirst.mockResolvedValue(order('PAYMENT_PENDING', false));
    db.shopOrder.update.mockResolvedValue({ ...order('PAYMENT_PENDING', false).shopOrder, status: 'CANCELLED' });
    db.order.update.mockResolvedValue({ ...order('PAYMENT_PENDING', false), status: 'CANCELLED' });
    await shopOrdersService.cancelMine('u1', 'o1');
    expect(db.product.updateMany).not.toHaveBeenCalled();
    expect(db.couponRedemption.updateMany.mock.calls[0][0]).toMatchObject({ where: { orderId: 'o1', status: 'RESERVED' }, data: { status: 'RELEASED' } });
    expect(db.order.update.mock.calls[0][0].data.status).toBe('CANCELLED');
  });
});

describe('admin order status', () => {
  const current = {
    id: 'o1', userId: 'u1', status: 'PAID', paymentStatus: 'CAPTURED', amount: 100000, currency: 'INR', items: [],
    shopOrder: { id: 's1', orderId: 'o1', status: 'PLACED', orderType: 'physical', itemsTotalPaise: 100000 },
  };

  it('moves the order, stamps dispatch, audits and messages the customer', async () => {
    db.order.findFirst.mockResolvedValue(current);
    db.shopOrder.update.mockResolvedValue({ ...current.shopOrder, status: 'SHIPPED' });
    db.order.update.mockResolvedValue({ ...current, fulfillmentStatus: 'DISPATCHED' });
    db.order.findUnique.mockResolvedValue({ ...current, shopOrder: { ...current.shopOrder, status: 'SHIPPED' }, user: { fullName: 'Asha', email: null, phoneNumber: '+919800000001' } });

    const view = await shopOrdersService.adminUpdateStatus('o1', { orderStatus: 'shipped', trackingNumber: 'BD123' }, ACTOR);

    expect(db.order.update.mock.calls[0][0].data).toMatchObject({ fulfillmentStatus: 'DISPATCHED', trackingNumber: 'BD123' });
    expect(db.order.update.mock.calls[0][0].data.dispatchedAt).toBeInstanceOf(Date);
    expect(mocks.adminService.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'SHOP_ORDER_STATUS_UPDATE', resource: 'Order:o1' }));
    expect(mocks.notificationEvents.orderConfirmed).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'o1', orderStatus: 'shipped', orderType: 'physical' }));
    expect(view.orderStatus).toBe('shipped');
  });

  it('rejects the website\'s "pending" and any change to an unpaid order except cancel', async () => {
    await expect(shopOrdersService.adminUpdateStatus('o1', { orderStatus: 'pending' }, ACTOR)).rejects.toMatchObject({ statusCode: 400 });
    db.order.findFirst.mockResolvedValue({ ...current, status: 'PENDING', paymentStatus: 'PENDING', shopOrder: { ...current.shopOrder, status: 'PAYMENT_PENDING' } });
    await expect(shopOrdersService.adminUpdateStatus('o1', { orderStatus: 'delivered' }, ACTOR)).rejects.toMatchObject({ statusCode: 400 });
    expect(mocks.adminService.logAction).not.toHaveBeenCalled();
  });

  it('exports orders as CSV with expected headers and rows', async () => {
    db.order.findMany.mockResolvedValue([
      {
        id: 'ord-1',
        createdAt: new Date('2026-11-20T10:00:00Z'),
        amount: 250000,
        currency: 'INR',
        paymentStatus: 'CAPTURED',
        status: 'PAID',
        user: { fullName: 'Asha Verma', email: 'asha@example.com', phoneNumber: '+919800000001' },
        shopOrder: { orderType: 'physical', status: 'SHIPPED' },
        items: [{ title: 'Rudraksha Mala', quantity: 2, unitPrice: 125000 }],
      },
    ]);
    const csv = await shopOrdersService.adminExportCsv({});
    expect(csv).toContain('Order ID,Customer Name,Email,Phone,Product,Quantity,Item Price,Order Type,Order Status,Payment Status,Currency,Order Total,Date');
    expect(csv).toContain('"ord-1","Asha Verma","asha@example.com","+919800000001","Rudraksha Mala","2","1250.00","physical","shipped","paid","INR","2500.00"');
  });

  it('retrieves order audit history', async () => {
    db.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        action: 'SHOP_ORDER_STATUS_UPDATE',
        details: 'Order status processing -> shipped',
        adminEmail: 'admin@astrosushil.com',
        createdAt: new Date('2026-11-20T12:00:00Z'),
      },
    ]);
    const res = await shopOrdersService.adminHistory('ord-1');
    expect(res.history).toHaveLength(1);
    expect(res.history[0]).toMatchObject({
      id: 'log-1',
      action: 'SHOP_ORDER_STATUS_UPDATE',
      adminEmail: 'admin@astrosushil.com',
    });
  });
});

describe('shop payment verification (website security finding 2)', () => {
  const pending = {
    id: 'o1', userId: 'u1', status: 'PENDING', paymentStatus: 'PENDING', razorpayOrderId: 'order_gw_1',
    amount: 109900, currency: 'INR', paidAmountMinor: 109900, paidCurrency: 'INR', items: [], shippingAddress: null,
  };
  const input = { razorpayOrderId: 'order_gw_1', razorpayPaymentId: 'pay_1', razorpaySignature: 'sig' };

  it("does not verify another customer's order", async () => {
    db.order.findUnique.mockResolvedValue(pending);
    await expect(productsService.verifyShopPayment({ id: 'u2' }, input)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('refuses when the order id sent does not belong to the gateway order', async () => {
    db.order.findUnique.mockResolvedValue(pending);
    await expect(productsService.verifyShopPayment({ id: 'u1' }, { ...input, orderId: 'another-order' })).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.paymentService.verifyCheckoutSignature).not.toHaveBeenCalled();
  });

  it('refuses a payment whose captured amount differs from the order, and marks nothing paid', async () => {
    db.order.findUnique.mockResolvedValue(pending);
    mocks.paymentService.verifyCheckoutSignature.mockReturnValue(true);
    mocks.paymentService.fetchRazorpayPayment.mockResolvedValue({ id: 'pay_1', orderId: 'order_gw_1', amount: 100, currency: 'INR', status: 'captured', captured: true, raw: {} });
    await expect(productsService.verifyShopPayment({ id: 'u1' }, input)).rejects.toMatchObject({ code: 'PAYMENT_MISMATCH' });
    expect(db.$executeRaw).not.toHaveBeenCalled();
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
  });

  it('marks the order failed and frees the coupon on a bad signature', async () => {
    db.order.findUnique.mockResolvedValue(pending);
    mocks.paymentService.verifyCheckoutSignature.mockReturnValue(false);
    await expect(productsService.verifyShopPayment({ id: 'u1' }, input)).rejects.toMatchObject({ statusCode: 400 });
    expect(db.shopOrder.updateMany.mock.calls[0][0]).toMatchObject({ where: { orderId: 'o1', status: 'PAYMENT_PENDING' }, data: { status: 'PAYMENT_FAILED' } });
    expect(mocks.transactionsService.markOrderFailed).toHaveBeenCalledWith('o1');
  });

  it('settles the ledger and invoice in the paying transaction and messages the customer once', async () => {
    db.order.findUnique
      .mockResolvedValueOnce(pending) // lookup by gateway order id
      .mockResolvedValueOnce({ status: 'PENDING' }) // under the lock
      .mockResolvedValueOnce({ ...pending, items: [], shopOrder: null, shippingAddress: null }) // paid hook
      .mockResolvedValueOnce({ ...pending, status: 'PAID', items: [{ title: 'Herb' }], shippingAddress: null }) // result
      .mockResolvedValue(null);
    mocks.paymentService.verifyCheckoutSignature.mockReturnValue(true);
    mocks.paymentService.fetchRazorpayPayment.mockResolvedValue({ id: 'pay_1', orderId: 'order_gw_1', amount: 109900, currency: 'INR', status: 'captured', captured: true, raw: { id: 'pay_1' } });

    const result = await productsService.verifyShopPayment({ id: 'u1' }, input);

    expect(result.message).toBe('Payment verified successfully');
    expect(mocks.settleOrderPaid).toHaveBeenCalledWith(db, 'o1', { gatewayPaymentId: 'pay_1', gatewayOrderId: 'order_gw_1', raw: { id: 'pay_1' } }, { placeOfSupplyState: null });
    expect(mocks.notificationService.sendNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'PAYMENT_SUCCESS', websiteChannels: false }));
  });

  it('returns an order the webhook already paid without paying it again', async () => {
    db.order.findUnique
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce({ status: 'PAID' })
      .mockResolvedValueOnce({ ...pending, status: 'PAID', items: [], shippingAddress: null })
      .mockResolvedValue(null);
    mocks.paymentService.verifyCheckoutSignature.mockReturnValue(true);
    mocks.paymentService.fetchRazorpayPayment.mockResolvedValue(null);
    await productsService.verifyShopPayment({ id: 'u1' }, input);
    expect(db.$executeRaw).not.toHaveBeenCalled();
    expect(mocks.settleOrderPaid).not.toHaveBeenCalled();
  });
});

describe('customers admin', () => {
  const customer = {
    id: 'u1', email: 'asha@example.test', phoneNumber: '+919800000001', fullName: 'Asha Verma',
    phoneVerifiedAt: NOW, emailVerifiedAt: null, createdAt: NOW, updatedAt: NOW, customerProfile: null,
  };

  it('blocks through the existing suspension mechanism', async () => {
    db.user.findFirst.mockResolvedValue(customer);
    db.auditLog.findMany.mockResolvedValue([]);
    await customersService.update('u1', { status: 'BLOCKED' }, ACTOR);
    expect(db.user.findFirst.mock.calls[0][0].where).toEqual({ id: 'u1', role: 'USER' });
    expect(mocks.adminService.suspendUser).toHaveBeenCalledWith('u1', { reason: 'Blocked from the Customers page' }, expect.objectContaining({ id: 'admin-1' }), expect.anything());
  });

  it('reads BLOCKED from the latest status entry of the audit log', async () => {
    db.user.findMany.mockResolvedValue([customer, { ...customer, id: 'u2' }]);
    db.user.count.mockResolvedValue(2);
    db.auditLog.findMany.mockResolvedValue([
      { resource: 'User:u1', action: 'USER_SUSPENDED' },
      { resource: 'User:u1', action: 'USER_ACTIVATED' },
      { resource: 'User:u2', action: 'USER_ACTIVATED' },
      { resource: 'User:u2', action: 'USER_SUSPENDED' },
    ]);
    const { users } = await customersService.list({});
    expect(users.map((u) => u.status)).toEqual(['BLOCKED', 'ACTIVE']);
    expect(db.user.findMany.mock.calls[0][0].where).toMatchObject({ role: 'USER' });
  });

  it('treats an empty string as "leave unchanged" and refuses a taken email', async () => {
    db.user.findFirst.mockResolvedValue(customer);
    db.auditLog.findMany.mockResolvedValue([]);
    await customersService.update('u1', { firstName: '', email: '' }, ACTOR);
    expect(db.user.update).not.toHaveBeenCalled();

    db.user.findUnique.mockResolvedValue({ id: 'someone-else' });
    await expect(customersService.update('u1', { email: 'taken@example.test' }, ACTOR)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('removes a customer who never paid, row and all', async () => {
    db.user.findFirst.mockResolvedValue(customer);
    db.order.count.mockResolvedValue(0);
    db.order.findMany.mockResolvedValue([{ id: 'o-unpaid' }]);
    const result = await customersService.remove('u1', ACTOR);
    expect(result).toEqual({ deleted: true, mode: 'hard', paidOrders: 0 });
    expect(db.shopOrder.deleteMany).toHaveBeenCalledWith({ where: { orderId: { in: ['o-unpaid'] } } });
    expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(db.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: 'USER_ACCOUNT_DELETED', resource: 'User:u1', adminId: 'admin-1' });
  });

  it('keeps the paid orders of a customer and removes every personal detail', async () => {
    db.user.findFirst.mockResolvedValue(customer);
    db.order.count.mockResolvedValue(3);
    db.consultationBooking.findMany.mockResolvedValue([]);
    const result = await customersService.remove('u1', ACTOR);
    expect(result).toEqual({ deleted: true, mode: 'anonymised', paidOrders: 3 });
    expect(db.user.delete).not.toHaveBeenCalled();
    expect(db.order.deleteMany).not.toHaveBeenCalled();
    expect(db.user.update.mock.calls[0][0].data).toMatchObject({ email: null, phoneNumber: null, fullName: 'Deleted User', passwordHash: null, googleId: null });
    for (const model of ['birthProfile', 'shippingAddress', 'cart', 'wishlistItem', 'customerProfile', 'refreshToken', 'notification'] as const) {
      expect(db[model].deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    }
    const details = JSON.parse(db.auditLog.create.mock.calls[0][0].data.details);
    expect(details).toMatchObject({ mode: 'anonymised', paidOrdersRetained: 3 });
    expect(JSON.stringify(details)).not.toContain('asha');
  });

  it('cannot be used on a staff account', async () => {
    db.user.findFirst.mockResolvedValue(null);
    await expect(customersService.remove('staff-1', ACTOR)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('blocked customers', () => {
  it('reads the block state from the suspension record and caches it briefly', async () => {
    forgetCustomerBlockState('u9');
    mocks.featureAccess.isUserSuspended.mockResolvedValue(true);
    expect(await isCustomerBlocked('u9', 1000)).toBe(true);
    expect(await isCustomerBlocked('u9', 2000)).toBe(true);
    expect(mocks.featureAccess.isUserSuspended).toHaveBeenCalledTimes(1);
    mocks.featureAccess.isUserSuspended.mockResolvedValue(false);
    expect(await isCustomerBlocked('u9', 1000 + 31_000)).toBe(false);
  });
});

describe('course links', () => {
  it('counts a click atomically and only for an active link', async () => {
    db.courseLink.findFirst.mockResolvedValue({ id: 'c1', redirectUrl: 'https://courses.example.test/x' });
    const result = await courseLinksService.registerClick('gupt-nadi');
    expect(db.courseLink.findFirst.mock.calls[0][0].where).toMatchObject({ status: 'ACTIVE' });
    expect(db.courseLink.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { clickCount: { increment: 1 } } });
    expect(result).toEqual({ redirectUrl: 'https://courses.example.test/x' });

    db.courseLink.findFirst.mockResolvedValue(null);
    await expect(courseLinksService.registerClick('inactive')).rejects.toMatchObject({ statusCode: 404 });
  });
});
