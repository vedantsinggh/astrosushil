/**
 * Pure logic of the shop catalogue: product views (what the public may see), variants, category
 * tree, product pricing, course links, customer export. No database.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/services/prisma.service', () => ({ prisma: {} }));
vi.mock('../../src/modules/admin/admin.service', () => ({ adminService: { logAction: vi.fn(), getProfile: vi.fn() } }));
vi.mock('../../src/modules/admin/rbac/check-permission', () => ({ checkPermission: () => async () => undefined }));
vi.mock('../../src/services/feature-access.service', () => ({ featureAccessService: { isUserSuspended: vi.fn(async () => false) } }));
vi.mock('../../src/services/storage/storage-refs', () => ({
  validateUploadedRef: vi.fn(),
  deleteUploadedObject: vi.fn(),
  getUploadedFileSignedUrl: vi.fn(),
  resolveManagedKey: vi.fn(),
}));

import { ProductType } from '@prisma/client';
import {
  findVariant,
  ProductRow,
  publicMetadata,
  resolveLine,
  toAdminProduct,
  toPublicProduct,
  websiteType,
} from '../../src/modules/products/product-view';
import { deriveProductPricing, storedDiscountValue, typeFilter } from '../../src/modules/products/products.admin.service';
import { buildCategoryTree, wouldCreateCycle } from '../../src/modules/categories/categories.service';
import { discountPercentage, toCourseLinkView } from '../../src/modules/courses/course-links.service';
import { csvCell, customersToCsv, splitName, toCustomerView } from '../../src/modules/customers/customers.service';
import { slugify, uniqueSlug, dateRange, pageParams } from '../../src/modules/products/shop-http';
import { bucketRevenue } from '../../src/modules/shop-orders/shop-orders.service';

const NOW = new Date('2026-11-24T06:00:00Z');

function product(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: 'p1',
    slug: 'maa-lakshmi',
    catalogId: 'maa-lakshmi',
    title: 'Maa Lakshmi',
    hindiTitle: null,
    description: null,
    hindiDescription: null,
    category: 'DIGITAL_ART',
    productType: ProductType.DIGITAL_ART,
    mrp: 249900,
    price: 249900,
    currency: 'INR',
    stock: -1,
    isAvailable: true,
    requiresShipping: false,
    imageUrl: 'https://cdn.example.test/assets/lakshmi.webp',
    galleryImages: ['https://cdn.example.test/assets/lakshmi.webp'],
    variants: null,
    metadata: {
      digitalAssetKey: 'private/digital-product/secret-file.zip',
      deliveryDays: 0,
      bundleAssets: [{ name: 'Wallpaper', key: 'private/digital-product/bundle-1.webp', type: 'IMAGE' }],
    },
    createdAt: NOW,
    updatedAt: NOW,
    legacyId: null,
    categoryId: null,
    shortDescription: null,
    thumbnailUrl: null,
    thumbnailKey: null,
    discountType: 'PERCENTAGE',
    discountValue: 0,
    sku: null,
    hasVariants: true,
    gstEnabled: true,
    gstRateBp: 1800,
    gstInclusive: true,
    isPublished: true,
    isFeatured: false,
    isTrending: false,
    isBestSeller: false,
    rating: 0,
    reviewsCount: 0,
    metaTitle: null,
    metaDescription: null,
    keywords: [],
    weightGrams: null,
    dimensions: null,
    managedByAdmin: false,
    categoryRef: null,
    variantRows: [
      {
        id: 'v-large',
        legacyId: null,
        productId: 'p1',
        code: 'size-large',
        name: 'Size',
        value: 'Large',
        mrp: 249900,
        price: 249900,
        stock: 10,
        downloadKey: 'private/digital-product/large-secret.zip',
        downloadName: 'large.zip',
        metaTitle: null,
        metaDescription: null,
        sortOrder: 0,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    ...overrides,
  } as ProductRow;
}

describe('public product view (website security finding 4)', () => {
  it('never contains the location of a downloadable file', () => {
    const text = JSON.stringify(toPublicProduct(product()));
    expect(text).not.toContain('secret-file');
    expect(text).not.toContain('large-secret');
    expect(text).not.toContain('bundle-1');
    expect(text).not.toContain('downloadKey');
    expect(text).not.toContain('digitalAssetKey');
  });

  it('keeps the bundle item names and other metadata', () => {
    expect(publicMetadata(product().metadata)).toEqual({
      deliveryDays: 0,
      bundleAssets: [{ name: 'Wallpaper', type: 'IMAGE' }],
    });
  });

  it('keeps every field the mobile app reads, and the website names for them', () => {
    const view = toPublicProduct(product());
    expect(view).toMatchObject({
      id: 'p1',
      slug: 'maa-lakshmi',
      catalogId: 'maa-lakshmi',
      title: 'Maa Lakshmi',
      name: 'Maa Lakshmi',
      productType: 'DIGITAL_ART',
      type: 'digital',
      requiresShipping: false,
      price: 249900,
      gst: { enabled: true, rate: 18, type: 'inclusive' },
    });
    // The app addresses seeded variants by their code.
    expect(view.variants[0]).toMatchObject({ id: 'size-large', variantId: 'v-large', value: 'Large', price: 249900 });
  });

  it('shows the file keys to the admin only', () => {
    const admin = toAdminProduct(product());
    expect(admin.downloadableFile).toEqual({ key: 'private/digital-product/secret-file.zip' });
    expect(admin.variants[0].downloadableFile).toEqual({ key: 'private/digital-product/large-secret.zip', name: 'large.zip' });
  });

  it('adds exclusive GST to priceWithGst', () => {
    const view = toPublicProduct(product({ price: 100000, gstRateBp: 1200, gstInclusive: false, variantRows: [] }));
    expect(view.priceWithGst).toBe(112000);
  });
});

describe('variants and cart lines', () => {
  it('finds a variant by row id, by code and by value', () => {
    const p = product();
    expect(findVariant(p, 'v-large')?.id).toBe('v-large');
    expect(findVariant(p, 'size-large')?.id).toBe('v-large');
    expect(findVariant(p, 'large')?.id).toBe('v-large');
    expect(findVariant(p, 'size-xl')).toBeNull();
  });

  it('falls back to the legacy JSON variants of a row that has no variant rows', () => {
    const p = product({ variantRows: [], variants: [{ id: 'size-small', name: 'Size', value: 'Small', price: 149900, mrp: 149900, stock: 5 }] });
    expect(findVariant(p, 'size-small')).toMatchObject({ id: 'size-small', price: 149900 });
  });

  it('prices a line from the catalogue: variant price when a variant is chosen', () => {
    const p = product({ price: 1, variantRows: [{ ...product().variantRows![0], price: 199900 }] });
    expect(resolveLine(p, 'size-large', { requireVariant: true })?.unitPricePaise).toBe(199900);
  });

  it('requires a variant for the saved cart but not for the app cart', () => {
    expect(resolveLine(product(), null, { requireVariant: true })).toBeNull();
    expect(resolveLine(product(), 'nope', { requireVariant: true })).toBeNull();
    expect(resolveLine(product(), null, { requireVariant: false })?.unitPricePaise).toBe(249900);
  });

  it('tracks stock for physical products only', () => {
    const herb = product({ requiresShipping: true, productType: ProductType.PHYSICAL, stock: 3, variantRows: [], hasVariants: false });
    expect(resolveLine(herb, null, { requireVariant: true })).toMatchObject({ physical: true, availableStock: 3 });
    expect(resolveLine(product(), 'v-large', { requireVariant: true })?.availableStock).toBeNull();
  });

  it('maps stored product types onto the website types', () => {
    expect(websiteType({ productType: ProductType.PHYSICAL, requiresShipping: true })).toBe('physical');
    expect(websiteType({ productType: ProductType.DIGITAL_BUNDLE, requiresShipping: false })).toBe('digital');
    expect(websiteType({ productType: ProductType.SERVICE, requiresShipping: false })).toBe('service');
    expect(typeFilter('physical')).toEqual({ requiresShipping: true });
  });
});

describe('admin product pricing', () => {
  it('derives the selling price of a product without variants', () => {
    expect(
      deriveProductPricing({ hasVariants: false, mrpPaise: 100000, discountType: 'PERCENTAGE', discountValue: 2000, variantMrps: [] })
    ).toEqual({ mrp: 100000, price: 80000, variants: [] });
  });
  it('applies the product discount to every variant and lists the cheapest as the product price', () => {
    const pricing = deriveProductPricing({
      hasVariants: true,
      mrpPaise: 0,
      discountType: 'FIXED',
      discountValue: 10000,
      variantMrps: [250000, 150000, 200000],
    });
    expect(pricing.variants.map((v) => v.price)).toEqual([240000, 140000, 190000]);
    expect(pricing).toMatchObject({ mrp: 150000, price: 140000 });
  });
  it('stores percentages as basis points and refuses more than 100%', () => {
    expect(storedDiscountValue('percentage', 12.5)).toBe(1250);
    expect(storedDiscountValue('fixed', 5000)).toBe(5000);
    expect(() => storedDiscountValue('percentage', 101)).toThrow();
    expect(() => storedDiscountValue('fixed', 10.5)).toThrow();
  });
});

describe('category tree', () => {
  const row = (id: string, parentId: string | null) => ({
    id,
    legacyId: null,
    name: id,
    slug: id,
    description: '',
    parentId,
    productType: 'PHYSICAL' as const,
    imageUrl: null,
    imageKey: null,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  });
  it('nests children under their parent', () => {
    const tree = buildCategoryTree([row('gems', null), row('rings', 'gems'), row('art', null), row('ruby', 'rings')]);
    expect(tree.map((n) => n.id)).toEqual(['gems', 'art']);
    expect(tree[0].children[0].id).toBe('rings');
    expect(tree[0].children[0].children[0].id).toBe('ruby');
  });
  it('makes a row whose parent is missing a root', () => {
    expect(buildCategoryTree([row('orphan', 'gone')]).map((n) => n.id)).toEqual(['orphan']);
  });
  it('detects a move that would create a loop', () => {
    const parentOf = new Map<string, string | null>([['gems', null], ['rings', 'gems'], ['ruby', 'rings']]);
    expect(wouldCreateCycle('gems', 'ruby', parentOf)).toBe(true);
    expect(wouldCreateCycle('ruby', 'gems', parentOf)).toBe(false);
  });
});

describe('helpers', () => {
  it('slugifies like the website', () => {
    expect(slugify('Dhan Varsha Kit – Maa Lakshmi!')).toBe('dhan-varsha-kit-maa-lakshmi');
  });
  it('finds the first free slug', async () => {
    const taken = new Set(['ring', 'ring-1']);
    expect(await uniqueSlug('ring', async (s) => taken.has(s))).toBe('ring-2');
  });
  it('bounds pagination', () => {
    expect(pageParams(0, 5000, 100)).toEqual({ page: 1, limit: 100, skip: 0 });
    expect(pageParams(3, 10)).toEqual({ page: 3, limit: 10, skip: 20 });
  });
  it('treats a bare toDate as the end of that day', () => {
    const range = dateRange('2026-11-01', '2026-11-24')!;
    expect(range.gte!.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(range.lte!.toISOString()).toBe('2026-11-24T23:59:59.999Z');
    expect(dateRange('not a date', undefined)).toBeUndefined();
  });
});

describe('course links', () => {
  it('computes the saving in whole percent', () => {
    expect(discountPercentage(599900, 1099900)).toBe(45);
    expect(discountPercentage(599900, null)).toBeNull();
    expect(discountPercentage(599900, 599900)).toBeNull();
  });
  it('shows the click count to admins only', () => {
    const row = {
      id: 'c1', legacyId: 'abc', courseId: null, title: 'Gupt Nadi', slug: 'gupt-nadi', shortDescription: null, category: null,
      tags: [], instructorName: null, language: null, level: null, pricePaise: 599900, originalPricePaise: null,
      discountPercentage: null, currency: 'INR', isFree: false, rating: 0, totalReviews: 0, totalLessons: null,
      totalDurationMinutes: null, thumbnailUrl: null, thumbnailKey: null, previewVideo: null, platformName: 'Graphy',
      redirectUrl: 'https://courses.example.test/gupt-nadi', clickCount: 42, isFeatured: false, status: 'ACTIVE' as const,
      metaTitle: null, metaDescription: null, createdAt: NOW, updatedAt: NOW,
    };
    expect(toCourseLinkView(row, { admin: false })).not.toHaveProperty('clickCount');
    expect(toCourseLinkView(row, { admin: true })).toMatchObject({ clickCount: 42 });
  });
});

describe('customers', () => {
  const row = {
    id: 'u1', email: 'asha@example.test', phoneNumber: '+919800000001', fullName: 'Asha Rani Verma',
    phoneVerifiedAt: NOW, emailVerifiedAt: null, createdAt: NOW, updatedAt: NOW, customerProfile: null,
  };
  it('splits a full name the way the website stores it', () => {
    expect(splitName('Asha Rani Verma')).toEqual({ firstName: 'Asha', lastName: 'Rani Verma' });
    expect(splitName(null)).toEqual({ firstName: '', lastName: '' });
  });
  it('shows BLOCKED for a suspended customer', () => {
    expect(toCustomerView(row, true).status).toBe('BLOCKED');
    expect(toCustomerView(row, false)).toMatchObject({ status: 'ACTIVE', firstName: 'Asha', isVerified: true });
  });
  it('writes CSV that a spreadsheet cannot run as a formula', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('plain')).toBe('plain');
    const csv = customersToCsv([toCustomerView({ ...row, fullName: 'Asha, Rani' }, false)]);
    expect(csv.split('\r\n')[0]).toContain('First Name,Last Name,Email');
    expect(csv).toContain('asha@example.test');
  });
});

describe('order report buckets', () => {
  it('groups revenue by Indian date and month', () => {
    const now = new Date('2026-11-24T12:00:00Z');
    const { daily, monthly } = bucketRevenue(
      [
        { amount: 100000, createdAt: new Date('2026-11-23T19:00:00Z') }, // 24 Nov 00:30 IST
        { amount: 50000, createdAt: new Date('2026-11-23T10:00:00Z') },
        { amount: 70000, createdAt: new Date('2026-09-10T10:00:00Z') },
      ],
      now
    );
    expect(daily).toHaveLength(7);
    expect(daily[6]).toEqual({ date: '2026-11-24', revenue: 100000, orders: 1 });
    expect(daily[5]).toEqual({ date: '2026-11-23', revenue: 50000, orders: 1 });
    expect(monthly.map((m) => m.month)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(monthly[3].revenue).toBe(70000);
    expect(monthly[5]).toMatchObject({ revenue: 150000, orders: 2 });
  });
});
