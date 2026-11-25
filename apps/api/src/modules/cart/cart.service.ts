import { z } from 'zod/v3';
import { Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { PRODUCT_INCLUDE, ProductRow, ResolvedLine, resolveLine, websiteType } from '../products/product-view';
import { priceCart, PricedCart, PricedLine, resolveShippingPolicy, ShippingPolicy } from '../products/shop-pricing';
import { couponsService } from '../coupons/coupons.service';
import { CouponRejection } from '../coupons/coupon-rules';

/**
 * Saved cart, one per customer (website `cart` module).
 *
 * The cart stores what the customer chose: product, variant, quantity and a coupon code. It stores
 * no price. Every read, and checkout, prices the cart again from the catalogue as it is now (the
 * website kept the price from the moment the item was added).
 */

export const MAX_LINE_QUANTITY = 50;
export const MAX_CART_LINES = 50;

export const addToCartSchema = z.object({
  productId: z.string().min(1).max(300),
  variantId: z.string().min(1).max(100).nullable().optional(),
  quantity: z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY).default(1),
});
export const updateCartSchema = z.object({
  productId: z.string().min(1).max(300),
  variantId: z.string().min(1).max(100).nullable().optional(),
  quantity: z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY),
});
export const removeItemSchema = z.object({
  productId: z.string().min(1).max(300),
  variantId: z.string().min(1).max(100).nullable().optional(),
});
export const applyCouponSchema = z.object({ code: z.string().trim().min(2).max(20) });

type Db = Prisma.TransactionClient | typeof prisma;

export type CartLineProblem = 'PRODUCT_UNAVAILABLE' | 'VARIANT_UNAVAILABLE' | 'OUT_OF_STOCK';

export interface ComputedCartLine {
  itemId: string;
  productId: string;
  variantKey: string;
  quantity: number;
  /** Null when the product or variant can no longer be bought. */
  resolved: ResolvedLine | null;
  priced: PricedLine | null;
  problem: CartLineProblem | null;
  product: ProductRow | null;
}

export interface ComputedCart {
  cartId: string | null;
  userId: string;
  lines: ComputedCartLine[];
  priced: PricedCart;
  couponCode: string | null;
  /** Code actually giving a discount now, or null. */
  appliedCoupon: string | null;
  couponError: { reason: CouponRejection; message: string } | null;
}

const lineKey = (productId: string, variantKey: string) => `${productId}:${variantKey}`;

/**
 * Prices already-loaded cart lines. Lines that cannot be bought are reported but left out of the
 * totals. The coupon is checked against the value of the lines that can.
 */
export async function computeCartFromItems(
  db: Db,
  input: {
    cartId: string | null;
    userId: string;
    couponCode: string | null;
    items: Array<{ id: string; productId: string; variantKey: string; quantity: number; product: ProductRow | null }>;
  },
  options: { shipping?: ShippingPolicy; now?: Date; ignoreOrderId?: string } = {}
): Promise<ComputedCart> {
  const shipping = options.shipping ?? resolveShippingPolicy();

  const lines: ComputedCartLine[] = input.items.map((item) => {
    const base = { itemId: item.id, productId: item.productId, variantKey: item.variantKey, quantity: item.quantity, priced: null };
    const product = item.product;
    if (!product || !product.isPublished || !product.isAvailable) {
      return { ...base, product, resolved: null, problem: 'PRODUCT_UNAVAILABLE' as const };
    }
    const resolved = resolveLine(product, item.variantKey || null, { requireVariant: true });
    if (!resolved) return { ...base, product, resolved: null, problem: 'VARIANT_UNAVAILABLE' as const };
    const outOfStock = resolved.availableStock !== null && item.quantity > resolved.availableStock;
    return { ...base, product, resolved, problem: outOfStock ? ('OUT_OF_STOCK' as const) : null };
  });

  const buyable = lines.filter((l) => l.resolved !== null);
  const inputs = buyable.map((l) => ({
    key: lineKey(l.productId, l.variantKey),
    unitPricePaise: l.resolved!.unitPricePaise,
    quantity: l.quantity,
    gst: l.resolved!.gst,
    physical: l.resolved!.physical,
  }));
  const itemsTotal = inputs.reduce((sum, l) => sum + l.unitPricePaise * l.quantity, 0);

  let discountPaise = 0;
  let appliedCoupon: string | null = null;
  let couponError: ComputedCart['couponError'] = null;
  if (input.couponCode && buyable.length > 0) {
    const { coupon, result } = await couponsService.evaluate(db, {
      code: input.couponCode,
      userId: input.userId,
      itemsTotalPaise: itemsTotal,
      now: options.now,
      ignoreOrderId: options.ignoreOrderId,
    });
    if (coupon && result.ok) {
      discountPaise = result.discountPaise;
      appliedCoupon = coupon.code;
    } else if (!result.ok) {
      couponError = { reason: result.reason, message: result.message };
    }
  }

  const priced = priceCart(inputs, { discountPaise, shipping });
  const byKey = new Map(priced.lines.map((p) => [p.key, p]));
  for (const line of buyable) line.priced = byKey.get(lineKey(line.productId, line.variantKey)) ?? null;

  return { cartId: input.cartId, userId: input.userId, lines, priced, couponCode: input.couponCode, appliedCoupon, couponError };
}

/** Website-shaped cart. Amounts are paise; `taxRate` is a percent. */
export function toCartView(cart: ComputedCart) {
  return {
    id: cart.cartId,
    items: cart.lines.map((line) => {
      const product = line.product;
      const resolved = line.resolved;
      return {
        product: line.productId,
        slug: product?.slug ?? null,
        variantId: line.variantKey || null,
        variantName: resolved?.variantLabel ?? null,
        name: product?.title ?? null,
        thumbnail: product?.thumbnailUrl ?? product?.imageUrl ?? null,
        productType: product ? websiteType(product) : null,
        quantity: line.quantity,
        price: resolved?.unitPricePaise ?? null,
        mrp: resolved?.mrpPaise ?? null,
        total: line.priced?.lineTotalPaise ?? null,
        discount: line.priced?.discountPaise ?? 0,
        taxRate: (line.priced?.taxRateBp ?? 0) / 100,
        taxType: line.priced?.taxInclusive ? 'inclusive' : 'exclusive',
        taxAmount: line.priced?.taxPaise ?? 0,
        available: line.resolved !== null,
        inStock: line.problem === null,
        problem: line.problem,
      };
    }),
    subTotal: cart.priced.itemsTotalPaise,
    discount: cart.priced.discountPaise,
    couponCode: cart.couponCode,
    appliedCoupon: cart.appliedCoupon,
    couponError: cart.couponError,
    shipping: cart.priced.shippingPaise,
    freeShipping: cart.priced.freeShipping,
    tax: cart.priced.taxAddedPaise,
    taxIncluded: cart.priced.taxTotalPaise - cart.priced.taxAddedPaise,
    totalAmount: cart.priced.totalPaise,
    currency: 'INR',
    requiresShipping: cart.priced.hasPhysical,
    canCheckout:
      cart.lines.length > 0 && cart.lines.every((l) => l.problem === null) && cart.couponError === null && cart.priced.totalPaise > 0,
  };
}

export type CartView = ReturnType<typeof toCartView>;

const CART_INCLUDE = {
  items: { orderBy: { createdAt: 'asc' }, include: { product: { include: PRODUCT_INCLUDE } } },
} satisfies Prisma.CartInclude;

export class CartService {
  /** Loads and prices the customer's cart. `db` lets checkout read it inside its own transaction. */
  public async compute(userId: string, db: Db = prisma, options: { now?: Date } = {}): Promise<ComputedCart> {
    const cart = await db.cart.findUnique({ where: { userId }, include: CART_INCLUDE });
    return computeCartFromItems(
      db,
      { cartId: cart?.id ?? null, userId, couponCode: cart?.couponCode ?? null, items: cart?.items ?? [] },
      options
    );
  }

  public async get(userId: string): Promise<CartView> {
    return toCartView(await this.compute(userId));
  }

  private async findProduct(productId: string): Promise<ProductRow> {
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: productId }, { slug: productId }, { catalogId: productId }], isPublished: true },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  /** Resolves the caller's variant reference to the key stored on the cart line ("" = no variant). */
  private variantKeyFor(product: ProductRow, variantId: string | null | undefined): string {
    const resolved = resolveLine(product, variantId ?? null, { requireVariant: true });
    if (!resolved) {
      throw variantId ? new NotFoundError('Variant not found') : new ValidationError('Variant required');
    }
    return resolved.variant?.id ?? '';
  }

  public async add(userId: string, input: z.infer<typeof addToCartSchema>): Promise<CartView> {
    const product = await this.findProduct(input.productId);
    if (!product.isAvailable) throw new ValidationError(`"${product.title}" is currently unavailable`);
    const variantKey = this.variantKeyFor(product, input.variantId);

    const cart = await prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } });
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId_variantKey: { cartId: cart.id, productId: product.id, variantKey } },
    });
    if (existing) {
      const quantity = existing.quantity + input.quantity;
      if (quantity > MAX_LINE_QUANTITY) throw new ValidationError(`At most ${MAX_LINE_QUANTITY} of one item can be ordered`);
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity } });
    } else {
      const lineCount = await prisma.cartItem.count({ where: { cartId: cart.id } });
      if (lineCount >= MAX_CART_LINES) throw new ValidationError(`A cart can hold at most ${MAX_CART_LINES} different items`);
      await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id, variantKey, quantity: input.quantity } });
    }
    return this.get(userId);
  }

  private async findLine(userId: string, productId: string, variantId: string | null | undefined) {
    const cart = await prisma.cart.findUnique({ where: { userId }, include: CART_INCLUDE });
    if (!cart) throw new NotFoundError('Cart not found');
    const wanted = variantId ?? '';
    const item = cart.items.find((i) => {
      const sameProduct = i.productId === productId || i.product.slug === productId || i.product.catalogId === productId;
      if (!sameProduct) return false;
      if (i.variantKey === wanted) return true;
      // The app addresses seeded variants by code ("size-large"); the line stores the row id.
      const resolved = wanted ? resolveLine(i.product, wanted, { requireVariant: true }) : null;
      return Boolean(resolved?.variant && resolved.variant.id === i.variantKey);
    });
    if (!item) throw new NotFoundError('Item not found');
    return item;
  }

  public async update(userId: string, input: z.infer<typeof updateCartSchema>): Promise<CartView> {
    const item = await this.findLine(userId, input.productId, input.variantId);
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: input.quantity } });
    return this.get(userId);
  }

  public async remove(userId: string, input: z.infer<typeof removeItemSchema>): Promise<CartView> {
    const item = await this.findLine(userId, input.productId, input.variantId);
    await prisma.cartItem.delete({ where: { id: item.id } });
    return this.get(userId);
  }

  public async applyCoupon(userId: string, rawCode: string): Promise<CartView> {
    const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } });
    if (!cart) throw new NotFoundError('Cart not found');
    const code = rawCode.toUpperCase();
    const computed = await computeCartFromItems(prisma, {
      ...(await this.loadItems(userId)),
      couponCode: code,
    });
    if (!computed.appliedCoupon) {
      throw new ValidationError(computed.couponError?.message ?? 'Coupon not applicable');
    }
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: code } });
    return toCartView(computed);
  }

  private async loadItems(userId: string) {
    const cart = await prisma.cart.findUnique({ where: { userId }, include: CART_INCLUDE });
    return { cartId: cart?.id ?? null, userId, couponCode: cart?.couponCode ?? null, items: cart?.items ?? [] };
  }

  public async removeCoupon(userId: string): Promise<CartView> {
    await prisma.cart.updateMany({ where: { userId }, data: { couponCode: null } });
    return this.get(userId);
  }

  /** Empties the cart and forgets its coupon. */
  public async clear(userId: string, db: Db = prisma): Promise<void> {
    const cart = await db.cart.findUnique({ where: { userId }, select: { id: true } });
    if (!cart) return;
    await db.cartItem.deleteMany({ where: { cartId: cart.id } });
    await db.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
  }
}

export const cartService = new CartService();
