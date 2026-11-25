import { z } from 'zod/v3';
import { Prisma, ProductCategory, ShopCategoryProductType } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { AdminActor, audit, pageParams, slugify, uniqueSlug } from '../products/shop-http';
import { deleteUploadedObject, validateUploadedRef } from '../../services/storage/storage-refs';

/** A file already stored through `POST /admin/uploads`. */
export const uploadedFileSchema = z.object({
  url: z.string().max(2048).nullable().optional(),
  key: z.string().max(1024).nullable().optional(),
});

const productTypeSchema = z.enum(['physical', 'digital']);

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(200),
  description: z.string().trim().max(5000).optional(),
  parent: z.string().uuid().nullable().optional(),
  productType: productTypeSchema.optional(),
  image: uploadedFileSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});
export const updateCategorySchema = createCategorySchema.partial();

const queryBoolean = z.enum(['true', 'false']).transform((v) => v === 'true');

export const listCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().trim().max(200).optional(),
  topLevel: queryBoolean.optional(),
  parent: z.string().trim().max(2000).optional(),
  productType: productTypeSchema.optional(),
  isActive: queryBoolean.optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;

export interface CategoryView {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent: { id: string; name: string } | null;
  productType: 'physical' | 'digital';
  image: { url: string; key: string | null } | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTreeNode extends Omit<CategoryView, 'parent'> {
  parentId: string | null;
  children: CategoryTreeNode[];
}

type CategoryWithParent = ProductCategory & { parent?: { id: string; name: string } | null };

function toProductType(value: 'physical' | 'digital' | undefined): ShopCategoryProductType {
  return value === 'digital' ? ShopCategoryProductType.DIGITAL : ShopCategoryProductType.PHYSICAL;
}

export function toCategoryView(row: CategoryWithParent): CategoryView {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    parent: row.parent ? { id: row.parent.id, name: row.parent.name } : null,
    productType: row.productType === ShopCategoryProductType.DIGITAL ? 'digital' : 'physical',
    image: row.imageUrl ? { url: row.imageUrl, key: row.imageKey } : null,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Nests a flat list by `parentId`. A row whose parent is not in the list becomes a root. */
export function buildCategoryTree(rows: ProductCategory[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>();
  for (const row of rows) {
    const { parent: _parent, ...view } = toCategoryView(row);
    nodes.set(row.id, { ...view, parentId: row.parentId, children: [] });
  }
  const roots: CategoryTreeNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parent = row.parentId ? nodes.get(row.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** True when making `parentId` the parent of `categoryId` would create a loop. */
export function wouldCreateCycle(
  categoryId: string,
  parentId: string,
  parentOf: Map<string, string | null>
): boolean {
  let cursor: string | null | undefined = parentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === categoryId) return true;
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = parentOf.get(cursor);
  }
  return false;
}

export class CategoriesService {
  private buildWhere(query: ListCategoriesQuery, publicOnly: boolean): Prisma.ProductCategoryWhereInput {
    const where: Prisma.ProductCategoryWhereInput = {};
    if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
    if (query.topLevel) where.parentId = null;
    if (query.parent) {
      const ids = query.parent.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length) where.parentId = { in: ids };
    }
    if (query.productType) where.productType = toProductType(query.productType);
    if (query.isActive !== undefined) where.isActive = query.isActive;
    else if (publicOnly) where.isActive = true;
    return where;
  }

  /** List with the website's filters. The public list shows active categories unless `isActive` is given. */
  public async list(query: ListCategoriesQuery, options: { publicOnly: boolean }) {
    const { page, limit, skip } = pageParams(query.page, query.limit, 200);
    const where = this.buildWhere(query, options.publicOnly);
    const [rows, total] = await Promise.all([
      prisma.productCategory.findMany({
        where,
        include: { parent: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.productCategory.count({ where }),
    ]);
    return {
      categories: rows.map(toCategoryView),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  public async tree(options: { publicOnly: boolean }): Promise<CategoryTreeNode[]> {
    const rows = await prisma.productCategory.findMany({
      where: options.publicOnly ? { isActive: true } : {},
      orderBy: { name: 'asc' },
    });
    return buildCategoryTree(rows);
  }

  public async get(idOrSlug: string, options: { publicOnly: boolean }): Promise<CategoryView> {
    const row = await prisma.productCategory.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        ...(options.publicOnly ? { isActive: true } : {}),
      },
      include: { parent: { select: { id: true, name: true } } },
    });
    if (!row) throw new NotFoundError('Category not found');
    return toCategoryView(row);
  }

  private async assertParent(parentId: string | null | undefined): Promise<void> {
    if (!parentId) return;
    const parent = await prisma.productCategory.findUnique({ where: { id: parentId }, select: { id: true } });
    if (!parent) throw new ValidationError('Parent category not found');
  }

  public async create(input: CreateCategoryInput, actor: AdminActor): Promise<CategoryView> {
    await this.assertParent(input.parent);
    const image = input.image
      ? validateUploadedRef(input.image, { visibility: 'public', purposes: ['category'], field: 'image' })
      : null;
    const slug = await uniqueSlug(slugify(input.name), async (candidate) =>
      Boolean(await prisma.productCategory.findUnique({ where: { slug: candidate }, select: { id: true } }))
    );
    const row = await prisma.productCategory.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? '',
        parentId: input.parent ?? null,
        productType: toProductType(input.productType),
        imageUrl: image?.url ?? null,
        imageKey: image?.key ?? null,
        isActive: input.isActive ?? true,
      },
      include: { parent: { select: { id: true, name: true } } },
    });
    await audit(actor, 'CATEGORY_CREATED', `ProductCategory:${row.id}`, `Created category "${row.name}" (${slug})`);
    return toCategoryView(row);
  }

  public async update(id: string, input: UpdateCategoryInput, actor: AdminActor): Promise<CategoryView> {
    const existing = await prisma.productCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Category not found');

    const data: Prisma.ProductCategoryUncheckedUpdateInput = {};
    if (input.name !== undefined && input.name !== existing.name) {
      data.name = input.name;
      // As on the website, renaming a category gives it a new slug.
      data.slug = await uniqueSlug(slugify(input.name), async (candidate) => {
        const hit = await prisma.productCategory.findUnique({ where: { slug: candidate }, select: { id: true } });
        return Boolean(hit && hit.id !== id);
      });
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.parent !== undefined) {
      if (input.parent === id) throw new ValidationError('Category cannot be its own parent');
      if (input.parent) {
        await this.assertParent(input.parent);
        const all = await prisma.productCategory.findMany({ select: { id: true, parentId: true } });
        const parentOf = new Map(all.map((c) => [c.id, c.parentId]));
        if (wouldCreateCycle(id, input.parent, parentOf)) {
          throw new ValidationError('A category cannot be moved under one of its own subcategories');
        }
      }
      data.parentId = input.parent ?? null;
    }
    if (input.productType !== undefined) data.productType = toProductType(input.productType);
    let replacedImage: string | null = null;
    if (input.image !== undefined) {
      const image = input.image
        ? validateUploadedRef(input.image, { visibility: 'public', purposes: ['category'], field: 'image' })
        : null;
      data.imageUrl = image?.url ?? null;
      data.imageKey = image?.key ?? null;
      const previous = existing.imageKey ?? existing.imageUrl;
      if (previous && existing.imageKey !== image?.key) replacedImage = previous;
    }
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const row = await prisma.productCategory.update({
      where: { id },
      data,
      include: { parent: { select: { id: true, name: true } } },
    });
    if (replacedImage) await deleteUploadedObject(replacedImage);
    await audit(actor, 'CATEGORY_UPDATED', `ProductCategory:${id}`, `Updated fields: ${Object.keys(data).join(', ') || 'none'}`);
    return toCategoryView(row);
  }

  /** Website rule: a category with subcategories cannot be deleted. Its products are kept, uncategorised. */
  public async remove(id: string, actor: AdminActor): Promise<{ deleted: true; uncategorisedProducts: number }> {
    const existing = await prisma.productCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Category not found');
    const child = await prisma.productCategory.findFirst({ where: { parentId: id }, select: { id: true } });
    if (child) throw new ValidationError('Cannot delete category with subcategories');

    const uncategorisedProducts = await prisma.product.count({ where: { categoryId: id } });
    await prisma.productCategory.delete({ where: { id } });
    await deleteUploadedObject(existing.imageKey ?? existing.imageUrl);
    await audit(
      actor,
      'CATEGORY_DELETED',
      `ProductCategory:${id}`,
      `Deleted category "${existing.name}"; ${uncategorisedProducts} product(s) left without a category`
    );
    return { deleted: true, uncategorisedProducts };
  }
}

export const categoriesService = new CategoriesService();
