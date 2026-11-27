import { Prisma, Product, ProductType, ProductVariant } from '@prisma/client';
import { computeGst, GstConfig } from './shop-pricing';
import { sanitizeRichText } from '../content/content.sanitizer';

/**
 * What a product looks like to the public, to the admin, and to the price engine.
 *
 * Public views are built field by field (never by spreading the row) so a private column added
 * later cannot leak. Storage keys of downloadable files never appear in a public view
 * (website security finding 4).
 */

export const PRODUCT_INCLUDE = {
  variantRows: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  categoryRef: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductInclude;

export type ProductRow = Product & {
  variantRows?: ProductVariant[];
  categoryRef?: { id: string; name: string; slug: string } | null;
};

export type WebsiteProductType = 'physical' | 'digital' | 'service';

export function websiteType(product: Pick<Product, 'productType' | 'requiresShipping'>): WebsiteProductType {
  if (product.productType === ProductType.SERVICE) return 'service';
  if (product.productType === ProductType.PHYSICAL || product.requiresShipping) return 'physical';
  return 'digital';
}

export function gstOf(product: Pick<Product, 'gstEnabled' | 'gstRateBp' | 'gstInclusive'>): GstConfig {
  return { enabled: product.gstEnabled, rateBp: product.gstRateBp, inclusive: product.gstInclusive };
}

export interface VariantInfo {
  /** Row id, or the seed's own id for a variant that only exists in the legacy JSON column. */
  id: string;
  /** Stable id the app uses ("size-large"); equals `id` for admin-created variants. */
  code: string;
  name: string;
  value: string;
  price: number;
  mrp: number;
  stock: number;
  metaTitle: string | null;
  metaDescription: string | null;
  downloadKey: string | null;
  downloadName: string | null;
}

interface LegacyJsonVariant {
  id?: unknown;
  name?: unknown;
  value?: unknown;
  price?: unknown;
  mrp?: unknown;
  stock?: unknown;
}

/** Variants of a product: table rows, or the legacy JSON column for rows not yet synchronised. */
export function variantsOf(product: ProductRow): VariantInfo[] {
  if (product.variantRows && product.variantRows.length > 0) {
    return product.variantRows.map((v) => ({
      id: v.id,
      code: v.code ?? v.id,
      name: v.name,
      value: v.value,
      price: v.price,
      mrp: v.mrp,
      stock: v.stock,
      metaTitle: v.metaTitle,
      metaDescription: v.metaDescription,
      downloadKey: v.downloadKey,
      downloadName: v.downloadName,
    }));
  }
  if (!Array.isArray(product.variants)) return [];
  const out: VariantInfo[] = [];
  for (const raw of product.variants as unknown as LegacyJsonVariant[]) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.price !== 'number') continue;
    out.push({
      id: raw.id,
      code: raw.id,
      name: typeof raw.name === 'string' ? raw.name : '',
      value: typeof raw.value === 'string' ? raw.value : '',
      price: raw.price,
      mrp: typeof raw.mrp === 'number' ? raw.mrp : raw.price,
      stock: typeof raw.stock === 'number' ? raw.stock : 0,
      metaTitle: null,
      metaDescription: null,
      downloadKey: null,
      downloadName: null,
    });
  }
  return out;
}

/** Finds a variant by row id, by code, or (as the app's cart does today) by its value. */
export function findVariant(product: ProductRow, variantId: string | null | undefined): VariantInfo | null {
  if (!variantId) return null;
  const variants = variantsOf(product);
  const wanted = variantId.toLowerCase();
  return (
    variants.find((v) => v.id === variantId) ??
    variants.find((v) => v.code === variantId) ??
    variants.find((v) => v.value.toLowerCase() === wanted) ??
    null
  );
}

interface BundleAsset {
  name?: unknown;
  key?: unknown;
  type?: unknown;
}

/** Product metadata without anything that locates a paid file. */
export function publicMetadata(metadata: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (key === 'digitalAssetKey' || key === 'digitalAssetName' || key === 'downloadKey') continue;
    if (key === 'bundleAssets') {
      out.bundleAssets = Array.isArray(value)
        ? (value as BundleAsset[]).map((asset) => ({
            name: typeof asset?.name === 'string' ? asset.name : null,
            type: typeof asset?.type === 'string' ? asset.type : null,
          }))
        : [];
      continue;
    }
    out[key] = value;
  }
  return out;
}

function images(product: Product): string[] {
  return Array.isArray(product.galleryImages)
    ? (product.galleryImages as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
}

/**
 * Public product: every field the mobile app reads today, plus the website's names for the same
 * things (`name`, `type`, `thumbnail`, `images`, `gst`, `priceWithGst`, `discount`).
 */
export function toPublicProduct(product: ProductRow) {
  const gst = gstOf(product);
  const variants = variantsOf(product).map((v) => ({
    id: v.code,
    variantId: v.id,
    name: v.name,
    value: v.value,
    price: v.price,
    mrp: v.mrp,
    priceWithGst: computeGst(v.price, gst).total,
    stock: v.stock,
    metaTitle: v.metaTitle,
    metaDescription: v.metaDescription,
  }));
  const gallery = images(product);
  return {
    id: product.id,
    slug: product.slug,
    catalogId: product.catalogId,
    title: product.title,
    name: product.title,
    hindiTitle: product.hindiTitle,
    shortDescription: product.shortDescription,
    description: product.description ? sanitizeRichText(product.description) : product.description,
    hindiDescription: product.hindiDescription,
    category: product.category,
    categoryId: product.categoryId,
    categoryInfo: product.categoryRef ?? null,
    productType: product.productType,
    type: websiteType(product),
    mrp: product.mrp,
    price: product.price,
    priceWithGst: computeGst(product.price, gst).total,
    discountType: product.discountType === 'FIXED' ? 'fixed' : 'percentage',
    discountValue: product.discountValue,
    discount: product.mrp > 0 ? Math.max(0, Math.round(((product.mrp - product.price) / product.mrp) * 100)) : 0,
    currency: product.currency,
    stock: product.stock,
    sku: product.sku,
    hsnSac: product.hsnSac ?? null,
    isAvailable: product.isAvailable,
    requiresShipping: product.requiresShipping,
    imageUrl: product.imageUrl,
    thumbnail: product.thumbnailUrl ?? product.imageUrl,
    galleryImages: gallery,
    images: gallery,
    hasVariants: variants.length > 0,
    variants,
    gst: { enabled: gst.enabled, rate: gst.rateBp / 100, type: gst.inclusive ? 'inclusive' : 'exclusive' },
    isFeatured: product.isFeatured,
    isTrending: product.isTrending,
    isBestSeller: product.isBestSeller,
    rating: product.rating,
    reviewsCount: product.reviewsCount,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    keywords: product.keywords,
    weightGrams: product.weightGrams,
    dimensions: product.dimensions,
    metadata: publicMetadata(product.metadata),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export type PublicProduct = ReturnType<typeof toPublicProduct>;

/** Storage key of the product-level download (seeded wallpapers; digital products without variants). */
export function productDownloadKey(product: Pick<Product, 'metadata'>): string | null {
  const meta = product.metadata;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const key = (meta as Record<string, unknown>).digitalAssetKey;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

/** Admin product: the public view plus publication state and the private file keys. */
export function toAdminProduct(product: ProductRow) {
  const base = toPublicProduct(product);
  const variantFiles = new Map(variantsOf(product).map((v) => [v.id, v]));
  return {
    ...base,
    isPublished: product.isPublished,
    managedByAdmin: product.managedByAdmin,
    legacyId: product.legacyId,
    thumbnailKey: product.thumbnailKey,
    downloadableFile: productDownloadKey(product) ? { key: productDownloadKey(product) } : null,
    variants: base.variants.map((v) => {
      const file = variantFiles.get(v.variantId);
      return {
        ...v,
        downloadableFile: file?.downloadKey ? { key: file.downloadKey, name: file.downloadName } : null,
      };
    }),
    metadata: product.metadata,
  };
}

export interface ResolvedLine {
  product: ProductRow;
  variant: VariantInfo | null;
  unitPricePaise: number;
  mrpPaise: number;
  /** "Size: Large", or null. */
  variantLabel: string | null;
  physical: boolean;
  /** Units that can be sold now; null when stock is not tracked (digital, service, or stock -1). */
  availableStock: number | null;
  gst: GstConfig;
}

/**
 * Current price and stock of one cart line, read from the catalogue (never from the cart).
 * Returns null when the product needs a variant and none (or an unknown one) was chosen and
 * `requireVariant` is set; without it the product's own price is used, as the app's cart does today.
 */
export function resolveLine(
  product: ProductRow,
  variantId: string | null | undefined,
  options: { requireVariant: boolean }
): ResolvedLine | null {
  const variants = variantsOf(product);
  const variant = findVariant(product, variantId);
  if (options.requireVariant && variants.length > 0 && !variant) return null;
  if (options.requireVariant && variantId && !variant) return null;

  const physical = product.requiresShipping;
  const rawStock = variant ? variant.stock : product.stock;
  return {
    product,
    variant,
    unitPricePaise: variant ? variant.price : product.price,
    mrpPaise: variant ? variant.mrp : product.mrp,
    variantLabel: variant ? `${variant.name}: ${variant.value}` : null,
    physical,
    availableStock: physical && rawStock >= 0 ? rawStock : null,
    gst: gstOf(product),
  };
}
