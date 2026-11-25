import { z } from 'zod/v3';
import { Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { PRODUCT_INCLUDE, toPublicProduct } from '../products/product-view';

/** Wishlist (website `wishlist` module): one row per customer and product. */

export const wishlistProductSchema = z.object({ productId: z.string().min(1, 'Product required').max(300) });

export const MAX_WISHLIST_ITEMS = 500;

export class WishlistService {
  private async productId(idOrSlug: string): Promise<string> {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }, { catalogId: idOrSlug }], isPublished: true },
      select: { id: true },
    });
    if (!product) throw new NotFoundError('Product not found');
    return product.id;
  }

  /** The customer's wishlist. Products that are no longer published are left out. */
  public async get(userId: string) {
    const rows = await prisma.wishlistItem.findMany({
      where: { userId, product: { isPublished: true } },
      include: { product: { include: PRODUCT_INCLUDE } },
      orderBy: { addedAt: 'desc' },
    });
    return {
      products: rows.map((row) => ({ product: toPublicProduct(row.product), addedAt: row.addedAt })),
      total: rows.length,
    };
  }

  public async add(userId: string, idOrSlug: string) {
    const productId = await this.productId(idOrSlug);
    const existing = await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId, productId } } });
    if (existing) throw new ValidationError('Already in wishlist');
    if ((await prisma.wishlistItem.count({ where: { userId } })) >= MAX_WISHLIST_ITEMS) {
      throw new ValidationError(`A wishlist can hold at most ${MAX_WISHLIST_ITEMS} products`);
    }
    try {
      await prisma.wishlistItem.create({ data: { userId, productId } });
    } catch (err) {
      // Two identical requests at once: the unique index decides, the outcome is the same.
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
    }
    return this.get(userId);
  }

  public async toggle(userId: string, idOrSlug: string) {
    const productId = await this.productId(idOrSlug);
    const removed = await prisma.wishlistItem.deleteMany({ where: { userId, productId } });
    const inWishlist = removed.count === 0;
    if (inWishlist) {
      await prisma.wishlistItem.upsert({
        where: { userId_productId: { userId, productId } },
        update: {},
        create: { userId, productId },
      });
    }
    return { ...(await this.get(userId)), inWishlist };
  }

  /** Removes one product. Removing a product that is not in the list is not an error. */
  public async remove(userId: string, idOrSlug: string) {
    await prisma.wishlistItem.deleteMany({
      where: { userId, product: { OR: [{ id: idOrSlug }, { slug: idOrSlug }, { catalogId: idOrSlug }] } },
    });
    return this.get(userId);
  }

  public async clear(userId: string) {
    await prisma.wishlistItem.deleteMany({ where: { userId } });
    return this.get(userId);
  }
}

export const wishlistService = new WishlistService();
