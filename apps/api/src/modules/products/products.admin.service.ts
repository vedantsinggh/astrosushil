import { z } from 'zod/v3';
import { Prisma, ProductType, ShopDiscountType } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { sanitizeRichText } from '../content/content.sanitizer';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { AdminActor, audit, pageParams, slugify, uniqueSlug } from './shop-http';
import { deriveSellingPrice } from './shop-pricing';
import { PRODUCT_INCLUDE, ProductRow, productDownloadKey, toAdminProduct, variantsOf, WebsiteProductType } from './product-view';
import { VERIFIED_PRODUCTS } from './products.seed';
import { deleteUploadedObject, validateUploadedRef } from '../../services/storage/storage-refs';

/**
 * Admin-managed products with the website's fields (website `products` module).
 *
 * Money is integer paise in and out. Files are references to objects already stored through
 * `POST /admin/uploads`: public images as `{ url, key }`, private downloads as `{ key }`.
 */

const publicFileSchema = z.object({
  url: z.string().max(2048).nullable().optional(),
  key: z.string().max(1024).nullable().optional(),
});
/** A private file: only the storage key is kept, never a URL. `name` is the file name customers see. */
const privateFileSchema = z.object({
  key: z.string().max(1024).nullable().optional(),
  url: z.string().max(2048).nullable().optional(),
  name: z.string().trim().max(255).optional(),
});

type PublicFileInput = z.infer<typeof publicFileSchema>;
type PrivateFileInput = z.infer<typeof privateFileSchema>;

/** Checks a product image reference against the upload contract; returns `{ url, key }` to store. */
function publicImage(input: PublicFileInput, field: string): { url: string; key: string } {
  const ref = validateUploadedRef(input, { visibility: 'public', purposes: ['product'], field });
  return { url: ref.url ?? '', key: ref.key };
}

/**
 * Checks a sold file. It must be a private upload; a file the website uploaded (public prefix) is
 * accepted so a migrated product can be saved again unchanged.
 */
function soldFile(input: PrivateFileInput, field: string): { key: string; name: string | null } {
  const ref = validateUploadedRef(input, { visibility: 'private', purposes: ['digital-product'], allowLegacy: true, field });
  return { key: ref.key, name: input.name ?? null };
}

const gstSchema = z.object({
  enabled: z.boolean().optional(),
  /** Percent, 0 to 100 (18 = 18%). */
  rate: z.number().min(0).max(100).optional(),
  type: z.enum(['inclusive', 'exclusive']).optional(),
});

const variantSchema = z.object({
  /** Present when editing an existing variant. */
  id: z.string().min(1).max(100).optional(),
  name: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1).max(200),
  mrpPaise: z.number().int().min(0),
  stock: z.number().int().min(0).optional(),
  downloadableFile: privateFileSchema.nullable().optional(),
  metaTitle: z.string().trim().max(300).optional(),
  metaDescription: z.string().trim().max(1000).optional(),
});

const productFields = {
  name: z.string().trim().min(2, 'Name required').max(300),
  hindiTitle: z.string().trim().max(300).nullable().optional(),
  shortDescription: z.string().trim().max(2000).nullable().optional(),
  description: z.string().max(100000).nullable().optional(),
  hindiDescription: z.string().max(100000).nullable().optional(),
  type: z.enum(['physical', 'digital', 'service']).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  images: z.array(publicFileSchema).max(10).optional(),
  thumbnail: publicFileSchema.nullable().optional(),
  hasVariants: z.boolean().optional(),
  mrpPaise: z.number().int().min(0).optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  /** Percent (0 to 100) when discountType is "percentage"; paise when it is "fixed". */
  discountValue: z.number().min(0).optional(),
  stock: z.number().int().min(-1).optional(),
  sku: z.string().trim().max(100).nullable().optional(),
  // GST invoice (2026-11-26): blank = the settings default for products.
  hsnSac: z.union([z.literal(''), z.string().trim().regex(/^(\d{4}|\d{6}|\d{8})$/, 'HSN code must be 4, 6 or 8 digits')]).nullable().optional(),
  variants: z.array(variantSchema).max(50).optional(),
  /** Download of a digital product that has no variants. */
  downloadableFile: privateFileSchema.nullable().optional(),
  gst: gstSchema.optional(),
  weightGrams: z.number().int().min(0).nullable().optional(),
  dimensions: z
    .object({ length: z.number().min(0).optional(), width: z.number().min(0).optional(), height: z.number().min(0).optional() })
    .nullable()
    .optional(),
  metaTitle: z.string().trim().max(300).nullable().optional(),
  metaDescription: z.string().trim().max(1000).nullable().optional(),
  keywords: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  isFeatured: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
};

export const createProductSchema = z.object(productFields);
export const updateProductSchema = z.object({ ...productFields, name: productFields.name.optional() });

export const adminListProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().trim().max(200).optional(),
  type: z.enum(['physical', 'digital', 'service']).optional(),
  category: z.string().trim().max(2000).optional(),
  isPublished: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  isFeatured: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AdminListProductsQuery = z.infer<typeof adminListProductsQuerySchema>;
type VariantInput = z.infer<typeof variantSchema>;

/** Stored discount value: basis points for a percentage, paise for a fixed amount. */
export function storedDiscountValue(type: 'percentage' | 'fixed', value: number): number {
  if (type === 'percentage') {
    if (value > 100) throw new ValidationError('A percentage discount cannot be more than 100');
    return Math.round(value * 100);
  }
  if (!Number.isInteger(value)) throw new ValidationError('A fixed discount must be a whole number of paise');
  return value;
}

export function typeFilter(type: WebsiteProductType): Prisma.ProductWhereInput {
  if (type === 'physical') return { requiresShipping: true };
  if (type === 'service') return { productType: ProductType.SERVICE };
  return { requiresShipping: false, productType: { not: ProductType.SERVICE } };
}

function productTypeFor(type: WebsiteProductType): ProductType {
  if (type === 'physical') return ProductType.PHYSICAL;
  if (type === 'service') return ProductType.SERVICE;
  return ProductType.DIGITAL;
}

export interface PricedVariant {
  mrp: number;
  price: number;
}

/**
 * Product and variant prices from MRP and the product's discount (website pre-save hook).
 * With variants, the website stores no product price; here the product row carries the cheapest
 * variant's price and MRP so listings can show "from" prices.
 */
export function deriveProductPricing(input: {
  hasVariants: boolean;
  mrpPaise: number;
  discountType: ShopDiscountType;
  discountValue: number;
  variantMrps: number[];
}): { mrp: number; price: number; variants: PricedVariant[] } {
  if (!input.hasVariants) {
    const { pricePaise } = deriveSellingPrice(input.mrpPaise, input.discountType, input.discountValue);
    return { mrp: input.mrpPaise, price: pricePaise, variants: [] };
  }
  const variants = input.variantMrps.map((mrp) => ({
    mrp,
    price: deriveSellingPrice(mrp, input.discountType, input.discountValue).pricePaise,
  }));
  const cheapest = variants.reduce<PricedVariant | null>((best, v) => (!best || v.price < best.price ? v : best), null);
  return { mrp: cheapest?.mrp ?? 0, price: cheapest?.price ?? 0, variants };
}

const SEEDED_SLUGS = new Set(VERIFIED_PRODUCTS.map((p) => p.slug));

function metadataObject(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

export class ProductsAdminService {
  public async list(query: AdminListProductsQuery) {
    const { page, limit, skip } = pageParams(query.page, query.limit, 200);
    const where: Prisma.ProductWhereInput = {};
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.type) Object.assign(where, typeFilter(query.type));
    if (query.category) {
      const ids = query.category.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length) where.categoryId = { in: ids };
    }
    if (query.isPublished !== undefined) where.isPublished = query.isPublished;
    if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;

    const [rows, total] = await Promise.all([
      prisma.product.findMany({ where, include: PRODUCT_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.product.count({ where }),
    ]);
    return {
      products: rows.map(toAdminProduct),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  public async get(id: string) {
    const row = await prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    if (!row) throw new NotFoundError('Product not found');
    return toAdminProduct(row);
  }

  private async assertCategory(categoryId: string | null | undefined): Promise<{ slug: string } | null> {
    if (!categoryId) return null;
    const category = await prisma.productCategory.findUnique({ where: { id: categoryId }, select: { slug: true } });
    if (!category) throw new ValidationError('Category not found');
    return category;
  }

  private assertVariantRules(type: WebsiteProductType, hasVariants: boolean, variants: Array<{ hasFile: boolean }>): void {
    if (hasVariants && variants.length === 0) throw new ValidationError('Variants required');
    // Website rule: every variant of a digital product carries its own file.
    if (type === 'digital' && hasVariants && variants.some((v) => !v.hasFile)) {
      throw new ValidationError('Each digital variant must have a downloadable file');
    }
  }

  public async create(input: CreateProductInput, actor: AdminActor) {
    const type: WebsiteProductType = input.type ?? 'physical';
    const hasVariants = input.hasVariants ?? false;
    const variants = hasVariants ? input.variants ?? [] : [];

    if (hasVariants && input.mrpPaise !== undefined) throw new ValidationError('Do not send mrp when variants exist');
    if (!hasVariants && input.mrpPaise === undefined) throw new ValidationError('MRP required when no variants');
    const images = (input.images ?? []).map((image, n) => publicImage(image, `images.${n}`));
    const thumbnail = input.thumbnail ? publicImage(input.thumbnail, 'thumbnail') : null;
    const productFile = input.downloadableFile ? soldFile(input.downloadableFile, 'downloadableFile') : null;
    const variantFiles = variants.map((v, n) =>
      v.downloadableFile ? soldFile(v.downloadableFile, `variants.${n}.downloadableFile`) : null
    );
    this.assertVariantRules(type, hasVariants, variantFiles.map((f) => ({ hasFile: Boolean(f) })));

    const category = await this.assertCategory(input.categoryId);
    const discountType = input.discountType === 'fixed' ? ShopDiscountType.FIXED : ShopDiscountType.PERCENTAGE;
    const discountValue = storedDiscountValue(input.discountType ?? 'percentage', input.discountValue ?? 0);
    const pricing = deriveProductPricing({
      hasVariants,
      mrpPaise: input.mrpPaise ?? 0,
      discountType,
      discountValue,
      variantMrps: variants.map((v) => v.mrpPaise),
    });

    const slug = await uniqueSlug(slugify(input.name), async (candidate) =>
      Boolean(
        await prisma.product.findFirst({
          where: { OR: [{ slug: candidate }, { catalogId: candidate }] },
          select: { id: true },
        })
      )
    );

    const metadata: Record<string, unknown> = {};
    if (productFile) {
      metadata.digitalAssetKey = productFile.key;
      if (productFile.name) metadata.digitalAssetName = productFile.name;
    }
    if (images.length) metadata.galleryKeys = images.map((i) => i.key);

    const row = await prisma.product.create({
      data: {
        slug,
        catalogId: slug,
        title: input.name,
        hindiTitle: input.hindiTitle ?? null,
        shortDescription: input.shortDescription ?? null,
        description: input.description ? sanitizeRichText(input.description) : null,
        hindiDescription: input.hindiDescription ?? null,
        category: category?.slug ?? type.toUpperCase(),
        categoryId: input.categoryId ?? null,
        productType: productTypeFor(type),
        requiresShipping: type === 'physical',
        mrp: pricing.mrp,
        price: pricing.price,
        discountType,
        discountValue,
        stock: input.stock ?? (type === 'physical' ? 0 : -1),
        sku: input.sku ?? null,
        hsnSac: input.hsnSac || null,
        hasVariants,
        imageUrl: thumbnail?.url ?? images[0]?.url ?? null,
        thumbnailUrl: thumbnail?.url ?? null,
        thumbnailKey: thumbnail?.key ?? null,
        galleryImages: images.map((i) => i.url),
        gstEnabled: input.gst?.enabled ?? true,
        gstRateBp: Math.round((input.gst?.rate ?? 0) * 100),
        gstInclusive: input.gst?.type === 'inclusive',
        isPublished: input.isPublished ?? true,
        isAvailable: input.isAvailable ?? true,
        isFeatured: input.isFeatured ?? false,
        isTrending: input.isTrending ?? false,
        isBestSeller: input.isBestSeller ?? false,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        keywords: input.keywords ?? [],
        weightGrams: input.weightGrams ?? null,
        dimensions: input.dimensions ?? Prisma.JsonNull,
        metadata: metadata as Prisma.InputJsonValue,
        managedByAdmin: true,
        variantRows: {
          create: variants.map((v, index) => ({
            name: v.name,
            value: v.value,
            mrp: pricing.variants[index].mrp,
            price: pricing.variants[index].price,
            stock: v.stock ?? 0,
            downloadKey: variantFiles[index]?.key ?? null,
            downloadName: variantFiles[index]?.name ?? null,
            metaTitle: v.metaTitle ?? null,
            metaDescription: v.metaDescription ?? null,
            sortOrder: index,
          })),
        },
      },
      include: PRODUCT_INCLUDE,
    });

    await audit(actor, 'PRODUCT_CREATED', `Product:${row.id}`, `Created ${type} product "${row.title}" (${row.slug})`);
    return toAdminProduct(row);
  }

  /**
   * Update. Fields left out are kept. `variants`, when sent, is the complete list: a variant with an
   * `id` is updated, one without is added, and existing variants missing from the list are removed
   * (the website can only add and edit variants; it has no way to remove one).
   */
  public async update(id: string, input: UpdateProductInput, actor: AdminActor) {
    const existing: ProductRow | null = await prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    if (!existing) throw new NotFoundError('Product not found');

    const currentType: WebsiteProductType =
      existing.productType === ProductType.SERVICE ? 'service' : existing.requiresShipping ? 'physical' : 'digital';
    const type = input.type ?? currentType;
    const hasVariants = input.hasVariants ?? existing.hasVariants;
    const existingRows = existing.variantRows ?? [];

    const discountType =
      input.discountType !== undefined
        ? input.discountType === 'fixed'
          ? ShopDiscountType.FIXED
          : ShopDiscountType.PERCENTAGE
        : existing.discountType;
    const discountValue =
      input.discountValue !== undefined
        ? storedDiscountValue(discountType === ShopDiscountType.FIXED ? 'fixed' : 'percentage', input.discountValue)
        : existing.discountValue;

    // The complete variant list after this update.
    interface TargetVariant {
      rowId: string | null;
      input: VariantInput | null;
      mrp: number;
      downloadKey: string | null;
      downloadName: string | null;
    }
    let targets: TargetVariant[] = [];
    if (hasVariants) {
      if (input.variants !== undefined) {
        targets = input.variants.map((v, n) => {
          const row = v.id ? existingRows.find((r) => r.id === v.id || r.code === v.id) : undefined;
          if (v.id && !row) throw new ValidationError(`Variant not found on this product: ${v.id}`);
          // A file left out keeps the existing one; null removes it.
          const keepsFile = v.downloadableFile === undefined;
          const file = v.downloadableFile ? soldFile(v.downloadableFile, `variants.${n}.downloadableFile`) : null;
          return {
            rowId: row?.id ?? null,
            input: v,
            mrp: v.mrpPaise,
            downloadKey: keepsFile ? row?.downloadKey ?? null : file?.key ?? null,
            downloadName: keepsFile ? row?.downloadName ?? null : file?.name ?? null,
          };
        });
      } else {
        targets = existingRows.map((r) => ({
          rowId: r.id,
          input: null,
          mrp: r.mrp,
          downloadKey: r.downloadKey,
          downloadName: r.downloadName,
        }));
      }
    }
    this.assertVariantRules(type, hasVariants, targets.map((t) => ({ hasFile: Boolean(t.downloadKey) })));

    const pricing = deriveProductPricing({
      hasVariants,
      mrpPaise: input.mrpPaise ?? existing.mrp,
      discountType,
      discountValue,
      variantMrps: targets.map((t) => t.mrp),
    });

    const data: Prisma.ProductUncheckedUpdateInput = {
      managedByAdmin: true,
      hasVariants,
      discountType,
      discountValue,
      mrp: pricing.mrp,
      price: pricing.price,
    };
    if (input.name !== undefined) data.title = input.name;
    if (input.hindiTitle !== undefined) data.hindiTitle = input.hindiTitle;
    if (input.shortDescription !== undefined) data.shortDescription = input.shortDescription;
    if (input.description !== undefined) {
      data.description = input.description ? sanitizeRichText(input.description) : null;
    }
    if (input.hindiDescription !== undefined) data.hindiDescription = input.hindiDescription;
    if (input.type !== undefined) {
      data.productType = productTypeFor(type);
      data.requiresShipping = type === 'physical';
    }
    if (input.categoryId !== undefined) {
      const category = await this.assertCategory(input.categoryId);
      data.categoryId = input.categoryId;
      if (category) data.category = category.slug;
    }
    if (input.stock !== undefined) data.stock = input.stock;
    if (input.sku !== undefined) data.sku = input.sku;
    if (input.hsnSac !== undefined) data.hsnSac = input.hsnSac || null;
    if (input.gst?.enabled !== undefined) data.gstEnabled = input.gst.enabled;
    if (input.gst?.rate !== undefined) data.gstRateBp = Math.round(input.gst.rate * 100);
    if (input.gst?.type !== undefined) data.gstInclusive = input.gst.type === 'inclusive';
    if (input.isPublished !== undefined) data.isPublished = input.isPublished;
    if (input.isAvailable !== undefined) data.isAvailable = input.isAvailable;
    if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
    if (input.isTrending !== undefined) data.isTrending = input.isTrending;
    if (input.isBestSeller !== undefined) data.isBestSeller = input.isBestSeller;
    if (input.metaTitle !== undefined) data.metaTitle = input.metaTitle;
    if (input.metaDescription !== undefined) data.metaDescription = input.metaDescription;
    if (input.keywords !== undefined) data.keywords = input.keywords;
    if (input.weightGrams !== undefined) data.weightGrams = input.weightGrams;
    if (input.dimensions !== undefined) data.dimensions = input.dimensions ?? Prisma.JsonNull;

    const metadata = metadataObject(existing.metadata);
    let metadataChanged = false;
    // Files this update no longer refers to; removed from storage after the database write.
    const orphaned: string[] = [];
    if (input.images !== undefined) {
      const images = input.images.map((image, n) => publicImage(image, `images.${n}`));
      const keep = new Set(images.map((i) => i.key));
      const previousKeys = Array.isArray(metadata.galleryKeys) ? (metadata.galleryKeys as unknown[]) : [];
      for (const key of previousKeys) {
        if (typeof key === 'string' && !keep.has(key)) orphaned.push(key);
      }
      data.galleryImages = images.map((i) => i.url);
      metadata.galleryKeys = images.map((i) => i.key);
      metadataChanged = true;
      if (input.thumbnail === undefined && !existing.thumbnailUrl) data.imageUrl = images[0]?.url ?? null;
    }
    if (input.thumbnail !== undefined) {
      const thumbnail = input.thumbnail ? publicImage(input.thumbnail, 'thumbnail') : null;
      if (existing.thumbnailKey && existing.thumbnailKey !== thumbnail?.key) orphaned.push(existing.thumbnailKey);
      data.thumbnailUrl = thumbnail?.url ?? null;
      data.thumbnailKey = thumbnail?.key ?? null;
      if (thumbnail?.url) data.imageUrl = thumbnail.url;
    }
    if (input.downloadableFile !== undefined) {
      const productFile = input.downloadableFile ? soldFile(input.downloadableFile, 'downloadableFile') : null;
      if (productFile) {
        metadata.digitalAssetKey = productFile.key;
        if (productFile.name) metadata.digitalAssetName = productFile.name;
      } else {
        delete metadata.digitalAssetKey;
        delete metadata.digitalAssetName;
      }
      metadataChanged = true;
    }
    if (metadataChanged) data.metadata = metadata as Prisma.InputJsonValue;

    const keepIds = new Set(targets.map((t) => t.rowId).filter((x): x is string => Boolean(x)));
    const removedIds = existingRows.filter((r) => !keepIds.has(r.id)).map((r) => r.id);
    const variantsTouched = input.variants !== undefined || input.hasVariants !== undefined;

    const row = await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id }, data });
      if (variantsTouched && removedIds.length > 0) {
        await tx.productVariant.deleteMany({ where: { id: { in: removedIds }, productId: id } });
        await tx.cartItem.deleteMany({ where: { productId: id, variantKey: { in: removedIds } } });
      }
      for (let index = 0; index < targets.length; index++) {
        const target = targets[index];
        const priced = pricing.variants[index];
        if (target.rowId) {
          await tx.productVariant.update({
            where: { id: target.rowId },
            data: {
              mrp: priced.mrp,
              price: priced.price,
              downloadKey: target.downloadKey,
              downloadName: target.downloadName,
              ...(target.input
                ? {
                    name: target.input.name,
                    value: target.input.value,
                    ...(target.input.stock !== undefined ? { stock: target.input.stock } : {}),
                    ...(target.input.metaTitle !== undefined ? { metaTitle: target.input.metaTitle } : {}),
                    ...(target.input.metaDescription !== undefined ? { metaDescription: target.input.metaDescription } : {}),
                    sortOrder: index,
                  }
                : {}),
            },
          });
        } else if (target.input) {
          await tx.productVariant.create({
            data: {
              productId: id,
              name: target.input.name,
              value: target.input.value,
              mrp: priced.mrp,
              price: priced.price,
              stock: target.input.stock ?? 0,
              downloadKey: target.downloadKey,
              downloadName: target.downloadName,
              metaTitle: target.input.metaTitle ?? null,
              metaDescription: target.input.metaDescription ?? null,
              sortOrder: index,
            },
          });
        }
      }
      return tx.product.findUniqueOrThrow({ where: { id }, include: PRODUCT_INCLUDE });
    });

    // Sold files are never deleted here: customers who bought them still download them.
    for (const key of orphaned) await deleteUploadedObject(key);

    await audit(
      actor,
      'PRODUCT_UPDATED',
      `Product:${id}`,
      `Updated "${row.title}". Fields: ${Object.keys(input).join(', ') || 'none'}; variants now ${variantsOf(row).length}`
    );
    return toAdminProduct(row);
  }

  /**
   * Delete. The website removes the document outright. Here a product that customers have bought
   * (a download entitlement or an order line refers to it) or that the code seed would re-create
   * is archived instead: unpublished and unavailable, so purchases and downloads keep working.
   */
  public async remove(id: string, actor: AdminActor): Promise<{ deleted: boolean; archived: boolean }> {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Product not found');

    const [entitlements, orderLines] = await Promise.all([
      prisma.digitalProductEntitlement.count({ where: { productId: id } }),
      prisma.orderItem.count({ where: { catalogId: { in: [existing.catalogId, existing.id, existing.slug] } } }),
    ]);
    const variantKeys = (await prisma.productVariant.findMany({ where: { productId: id }, select: { downloadKey: true } }))
      .map((v) => v.downloadKey);
    const mustArchive = entitlements > 0 || orderLines > 0 || SEEDED_SLUGS.has(existing.slug);

    if (mustArchive) {
      await prisma.product.update({
        where: { id },
        data: { isPublished: false, isAvailable: false, managedByAdmin: true },
      });
      await prisma.cartItem.deleteMany({ where: { productId: id } });
      await audit(
        actor,
        'PRODUCT_ARCHIVED',
        `Product:${id}`,
        `Archived "${existing.title}" instead of deleting (entitlements: ${entitlements}, order lines: ${orderLines}, seeded: ${SEEDED_SLUGS.has(existing.slug)})`
      );
      return { deleted: false, archived: true };
    }

    await prisma.product.delete({ where: { id } });
    // Nobody bought it (checked above), so its images and files can go too.
    const meta = metadataObject(existing.metadata);
    const keys = [
      existing.thumbnailKey,
      ...(Array.isArray(meta.galleryKeys) ? (meta.galleryKeys as unknown[]) : []),
      meta.digitalAssetKey,
      ...variantKeys,
    ];
    for (const key of keys) {
      if (typeof key === 'string' && key) await deleteUploadedObject(key);
    }
    await audit(actor, 'PRODUCT_DELETED', `Product:${id}`, `Deleted product "${existing.title}" (${existing.slug})`);
    return { deleted: true, archived: false };
  }

  /** Storage key of the file a purchase of this product/variant unlocks, or null. */
  public downloadKeyFor(product: ProductRow, variantRowId: string | null): { key: string | null; name: string | null } {
    const variant = variantRowId ? variantsOf(product).find((v) => v.id === variantRowId) : undefined;
    if (variant?.downloadKey) return { key: variant.downloadKey, name: variant.downloadName };
    return { key: productDownloadKey(product), name: null };
  }
}

export const productsAdminService = new ProductsAdminService();
