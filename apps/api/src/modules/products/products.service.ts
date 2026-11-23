import crypto from 'crypto';
import { prisma } from '../../services/prisma.service';
import { paymentService } from '../../services/payment.service';
import { notificationService } from '../notifications/notification.service';
import { adminService } from '../admin/admin.service';
import { NotFoundError, ValidationError, ForbiddenError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  OrderItemType,
  FulfillmentType,
  EntitlementSource,
  EntitlementStatus,
  ProductType,
  ObligationType,
} from '@prisma/client';
import { fulfillmentService } from '../fulfillment/fulfillment.service';
import { VERIFIED_PRODUCTS } from './products.seed';
import {
  ListProductsQuery,
  CalculateCartInput,
  CreateShopOrderInput,
  VerifyShopPaymentInput,
  ShippingAddressInput,
  AdminUpdateFulfillmentInput,
  AdminUpdateStockInput,
  AdminGrantEntitlementInput,
} from './products.schemas';
import { Prisma, ShopAddressType } from '@prisma/client';
import { storageService } from '../../services/storage.service';
import { getUploadedFileSignedUrl, resolveManagedKey } from '../../services/storage/storage-refs';
import { PRODUCT_INCLUDE, ProductRow, ResolvedLine, resolveLine, toPublicProduct, websiteType } from './product-view';
import { priceCart, PricedCart, PricedLine, resolveShippingPolicy } from './shop-pricing';
import { typeFilter } from './products.admin.service';
import { buildDraft, shopOrdersService, snapshotAddress } from '../shop-orders/shop-orders.service';
import { settleOrderPaid } from '../commerce/money/settlement';
import { transactionsService } from '../transactions/transactions.service';
import { assertGatewayPaymentMatches } from './payment-check';

/** Lifetime of a download link, in seconds. */
export const DOWNLOAD_LINK_TTL_SECONDS = 15 * 60;

/**
 * Storage key behind a stored download reference. Website data stores the full public S3 URL of a
 * file; the object key is the part after the bucket host. Anything else is used as it is.
 */
export function storageKeyOf(reference: string): string {
  const marker = '.amazonaws.com/';
  const at = reference.indexOf(marker);
  if (/^https?:\/\//i.test(reference) && at !== -1) {
    return decodeURIComponent(reference.slice(at + marker.length).split('?')[0]);
  }
  return reference;
}

function toAddressType(value: string | undefined): ShopAddressType | undefined {
  if (value === undefined) return undefined;
  const upper = value.toUpperCase();
  if (upper in ShopAddressType) return upper as ShopAddressType;
  throw new ValidationError('Address type must be home, work or other');
}

export class ProductsService {
  private seeded = false;

  /**
   * Seed/sync verified products to local PostgreSQL database
   */
  public async ensureProductsSeeded(): Promise<void> {
    if (this.seeded) return;
    try {
      for (const item of VERIFIED_PRODUCTS) {
        // The seed is the starting catalogue. Once a product has been created or edited in the
        // admin (managedByAdmin) the seed leaves it alone, and it never resets stock: stock is
        // live data, reduced by paid orders.
        const current = await prisma.product.findUnique({
          where: { slug: item.slug },
          select: { id: true, managedByAdmin: true },
        });
        if (current?.managedByAdmin) continue;
        const row = await prisma.product.upsert({
          where: { slug: item.slug },
          update: {
            catalogId: item.catalogId,
            title: item.title,
            hindiTitle: item.hindiTitle,
            description: item.description,
            hindiDescription: item.hindiDescription,
            category: item.category,
            productType: item.productType,
            mrp: item.mrp,
            price: item.price,
            currency: item.currency,
            hasVariants: Boolean(item.variants?.length),
            isAvailable: item.isAvailable,
            requiresShipping: item.requiresShipping,
            imageUrl: item.imageUrl,
            galleryImages: (item.galleryImages as any) ?? undefined,
            variants: (item.variants as any) ?? undefined,
            metadata: (item.metadata as any) ?? undefined,
          },
          create: {
            slug: item.slug,
            catalogId: item.catalogId,
            title: item.title,
            hindiTitle: item.hindiTitle,
            description: item.description,
            hindiDescription: item.hindiDescription,
            category: item.category,
            productType: item.productType,
            mrp: item.mrp,
            price: item.price,
            currency: item.currency,
            stock: item.stock,
            isAvailable: item.isAvailable,
            requiresShipping: item.requiresShipping,
            imageUrl: item.imageUrl,
            galleryImages: (item.galleryImages as any) ?? undefined,
            variants: (item.variants as any) ?? undefined,
            metadata: (item.metadata as any) ?? undefined,
            hasVariants: Boolean(item.variants?.length),
          },
        });
        // Seeded variants also live in product_variants, addressed by their seed id (`code`).
        for (const [index, variant] of (item.variants ?? []).entries()) {
          await prisma.productVariant.upsert({
            where: { productId_code: { productId: row.id, code: variant.id } },
            update: { name: variant.name, value: variant.value, mrp: variant.mrp, price: variant.price, sortOrder: index },
            create: {
              productId: row.id,
              code: variant.id,
              name: variant.name,
              value: variant.value,
              mrp: variant.mrp,
              price: variant.price,
              stock: variant.stock,
              sortOrder: index,
            },
          });
        }
      }
      this.seeded = true;
      logger.info('Verified shop products synchronized to database successfully');
    } catch (err) {
      logger.error({ err }, 'Failed to seed verified shop products');
    }
  }

  /**
   * List products with filtering and pagination
   */
  public async listProducts(query: ListProductsQuery, userId?: string | null) {
    await this.ensureProductsSeeded();

    // Public catalogue: published and available products only.
    const where: Prisma.ProductWhereInput = { isAvailable: true, isPublished: true };
    const and: Prisma.ProductWhereInput[] = [];
    if (query.category) {
      // The app sends a category code ("DIGITAL_ART"); the website sends one or more category ids.
      const values = String(query.category).split(',').map((s) => s.trim()).filter(Boolean);
      and.push({
        OR: [{ category: { in: values } }, { categoryId: { in: values } }, { categoryRef: { slug: { in: values } } }],
      });
    }
    if (query.productType) {
      if (!(query.productType in ProductType)) {
        throw new ValidationError(`Unknown product type: "${query.productType}"`);
      }
      where.productType = query.productType as ProductType;
    }
    if (query.type === 'physical' || query.type === 'digital' || query.type === 'service') {
      and.push(typeFilter(query.type));
    }
    if (query.featured === true || query.featured === 'true') {
      where.isFeatured = true;
    }
    if (query.search) {
      and.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { hindiTitle: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const limit = query.limit ? Math.min(Math.max(query.limit, 1), 50) : 20;
    const offset = query.page ? (Math.max(query.page, 1) - 1) * limit : query.offset ? Math.max(query.offset, 0) : 0;

    const [rows, total, cartItems, wishlistItems] = await Promise.all([
      prisma.product.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ requiresShipping: 'desc' }, { createdAt: 'desc' }],
        include: PRODUCT_INCLUDE,
      }),
      prisma.product.count({ where }),
      userId ? prisma.cartItem.findMany({ where: { cart: { userId } }, select: { productId: true } }) : Promise.resolve([]),
      userId ? prisma.wishlistItem.findMany({ where: { userId }, select: { productId: true } }) : Promise.resolve([]),
    ]);

    const inCart = new Set(cartItems.map((i) => i.productId));
    const inWishlist = new Set(wishlistItems.map((i) => i.productId));
    const products = rows.map((row) => ({
      ...toPublicProduct(row),
      isInCart: inCart.has(row.id),
      isInWishlist: inWishlist.has(row.id),
    }));

    return {
      products,
      pagination: {
        total,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get product details by ID, slug or catalog id. Unpublished products are not found, and the
   * response never carries the location of a downloadable file (website security finding 4).
   */
  public async getProductDetails(idOrSlug: string) {
    await this.ensureProductsSeeded();

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }, { catalogId: idOrSlug }],
        isPublished: true,
      },
      include: PRODUCT_INCLUDE,
    });

    if (!product) {
      throw new NotFoundError(`Product not found: "${idOrSlug}"`);
    }

    return toPublicProduct(product);
  }

  /**
   * Prices a list of chosen products from the catalogue as it is now. Shared by the stateless
   * `cart/calculate` endpoint and the app's order creation, on the same engine as the saved cart.
   */
  private async priceSelections(
    items: CalculateCartInput['items']
  ): Promise<{ lines: Array<{ resolved: ResolvedLine; priced: PricedLine; requestedVariantId: string | null }>; priced: PricedCart }> {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('At least one product must be in the cart');
    }
    if (items.length > 50) {
      throw new ValidationError('Cart exceeds maximum allowed item count (50 items)');
    }

    const resolvedLines: Array<{ resolved: ResolvedLine; quantity: number; requestedVariantId: string | null }> = [];
    for (const item of items) {
      const product: ProductRow | null = await prisma.product.findFirst({
        where: {
          OR: [{ id: item.productId }, { slug: item.productId }, { catalogId: item.productId }],
          isPublished: true,
        },
        include: PRODUCT_INCLUDE,
      });
      if (!product) {
        throw new ValidationError(`Product not found: "${item.productId}"`);
      }
      if (!product.isAvailable) {
        throw new ValidationError(`Product "${product.title}" is currently unavailable`);
      }

      const qty = item.quantity ?? 1;
      if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
        throw new ValidationError(`Invalid quantity for "${product.title}". Must be between 1 and 50`);
      }

      // As before: an unknown or missing variant falls back to the product's own price.
      const resolved = resolveLine(product, item.variantId ?? null, { requireVariant: false })!;
      if (resolved.availableStock !== null && qty > resolved.availableStock) {
        throw new ValidationError(
          `Requested quantity (${qty}) exceeds available stock (${resolved.availableStock}) for "${product.title}"`
        );
      }
      resolvedLines.push({ resolved, quantity: qty, requestedVariantId: item.variantId || null });
    }

    const priced = priceCart(
      resolvedLines.map((line, index) => ({
        key: String(index),
        unitPricePaise: line.resolved.unitPricePaise,
        quantity: line.quantity,
        gst: line.resolved.gst,
        physical: line.resolved.physical,
      })),
      { shipping: resolveShippingPolicy() }
    );

    return {
      lines: resolvedLines.map((line, index) => ({
        resolved: line.resolved,
        priced: priced.lines[index],
        requestedVariantId: line.requestedVariantId,
      })),
      priced,
    };
  }

  /**
   * Calculate cart server-authoritatively.
   * Completely immune to client-submitted prices, discounts, or tax rates.
   */
  public async calculateCart(userId: string | null, input: CalculateCartInput) {
    await this.ensureProductsSeeded();

    const { lines, priced } = await this.priceSelections(input.items);

    // Per-product GST (seeded products: 18% inclusive) and the shop's shipping rule, both from the
    // shared price engine (shop-pricing.ts). `subtotal` is the taxable value, as before.
    const calculatedItems = lines.map(({ resolved, priced: line, requestedVariantId }) => ({
      productId: resolved.product.id,
      catalogId: resolved.product.catalogId,
      slug: resolved.product.slug,
      title: resolved.product.title,
      hindiTitle: resolved.product.hindiTitle,
      imageUrl: resolved.product.imageUrl,
      productType: resolved.product.productType,
      requiresShipping: resolved.product.requiresShipping,
      variantId: requestedVariantId,
      variantName: resolved.variantLabel,
      quantity: line.quantity,
      unitPrice: line.unitPricePaise,
      taxRate: line.taxRateBp,
      taxType: line.taxInclusive ? 'inclusive' : 'exclusive',
      subtotal: line.taxablePaise,
      taxAmount: line.taxPaise,
      totalAmount: line.payablePaise,
    }));

    // Validate shipping address if provided
    let shippingAddress: any = null;
    if (input.shippingAddressId && userId) {
      shippingAddress = await prisma.shippingAddress.findFirst({
        where: { id: input.shippingAddressId, userId },
      });
    }

    return {
      items: calculatedItems,
      subtotal: priced.taxablePaise,
      taxAmount: priced.taxTotalPaise,
      shippingAmount: priced.shippingPaise,
      discountAmount: 0,
      totalAmount: priced.totalPaise,
      currency: 'INR',
      requiresShipping: priced.hasPhysical,
      eligibleForFreeShipping: priced.freeShipping,
      shippingAddress,
    };
  }

  /**
   * Create shop order reusing Phase 3 Order and OrderItem architecture
   */
  public async createShopOrder(
    user: { id: string },
    input: CreateShopOrderInput
  ) {
    await this.ensureProductsSeeded();

    // 1. Idempotency check: if order exists with this key, return it
    if (input.idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { items: true, shippingAddress: true },
      });
      if (existing) {
        if (existing.userId !== user.id) {
          throw new ForbiddenError('Idempotency key belongs to another user');
        }
        logger.info({ orderId: existing.id, idempotencyKey: input.idempotencyKey }, 'Returning idempotent shop order');
        return {
          orderId: existing.id,
          razorpayOrderId: existing.razorpayOrderId,
          amount: existing.amount,
          shippingAmount: existing.shippingAmount,
          currency: existing.currency,
          status: existing.status,
          paymentStatus: existing.paymentStatus,
          fulfillmentStatus: existing.fulfillmentStatus,
          items: existing.items,
          isExisting: true,
        };
      }
    }

    // 2. Authoritative server calculation
    const { lines, priced } = await this.priceSelections(input.items);

    // 3. Physical fulfillment validation: shipping address is mandatory if order has physical items
    if (priced.hasPhysical && !input.shippingAddressId) {
      throw new ValidationError('A valid shipping address is required for orders containing physical products');
    }

    let shippingAddressRow: Awaited<ReturnType<typeof prisma.shippingAddress.findFirst>> = null;
    if (priced.hasPhysical && input.shippingAddressId) {
      shippingAddressRow = await prisma.shippingAddress.findFirst({
        where: { id: input.shippingAddressId, userId: user.id },
      });
      if (!shippingAddressRow) {
        throw new ValidationError('Selected shipping address was not found or does not belong to this account');
      }
    }

    // 4-5. One order-creation path for the app and the website: the priced lines go to the shop
    // order service as a typed draft (gateway order, Order + OrderItems, ShopOrder in one transaction).
    const created = await shopOrdersService.createFromDraft(
      buildDraft({
        userId: user.id,
        source: 'direct',
        lines,
        priced,
        couponCode: null,
        shippingAddressId: shippingAddressRow?.id ?? null,
        // The address is copied onto the order, so later edits to the saved address do not change it.
        shippingAddress: shippingAddressRow ? snapshotAddress(shippingAddressRow) : null,
        idempotencyKey: input.idempotencyKey,
        notes: input.notes,
      })
    );
    const order = { ...created, shippingAddress: shippingAddressRow };

    logger.info(
      { userId: user.id, orderId: order.id, razorpayOrderId: order.razorpayOrderId, amount: order.amount },
      'Shop order created successfully'
    );

    return {
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      amount: order.amount,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      shippingAmount: order.shippingAmount,
      currency: order.currency,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      items: order.items,
      shippingAddress: order.shippingAddress,
    };
  }

  /**
   * Verify checkout signature and fulfill products idempotently
   */
  public async verifyShopPayment(
    user: { id: string; role?: string },
    input: VerifyShopPaymentInput
  ) {
    const order = await prisma.order.findUnique({
      where: { razorpayOrderId: input.razorpayOrderId },
      include: { items: true, shippingAddress: true, digitalEntitlements: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Enforce ownership: only order owner or admin
    if (order.userId !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new NotFoundError('Order not found');
    }

    // The payment must belong to the order the caller names (website security finding 2): the order
    // is found by the gateway order id stored for it, and an order id sent alongside must match.
    if (input.orderId && input.orderId !== order.id) {
      throw new NotFoundError('Order not found');
    }

    // Idempotent replay: if already PAID, return cleanly
    if (order.status === OrderStatus.PAID) {
      logger.info({ orderId: order.id, userId: user.id }, 'Shop payment already verified (Idempotent replay)');
      // The gateway webhook can mark the order paid before the customer's browser gets here. Until
      // the webhook itself calls `applyPaidEffects`, its own product step has taken the stock but
      // knows nothing of the coupon, the saved cart, variants or the website status: finish those
      // here. A no-op once the effects are recorded on the shop order.
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "orders" WHERE id = ${order.id} FOR UPDATE`;
        await shopOrdersService.applyPaidEffects(tx, order.id, { stockAlreadyTaken: true });
      });
      const entitlements = await prisma.digitalProductEntitlement.findMany({
        where: { orderId: order.id },
        include: { product: true },
      });
      return {
        message: 'Payment verified successfully',
        order,
        digitalEntitlements: entitlements,
      };
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new ValidationError('Cannot verify payment for a cancelled order');
    }

    // Verify signature
    const isValid = paymentService.verifyCheckoutSignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature
    );

    if (!isValid) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.FAILED,
          paymentStatus: PaymentStatus.FAILED,
        },
      });
      await shopOrdersService.markPaymentFailed(order.id);
      await transactionsService.markOrderFailed(order.id);
      throw new ValidationError('Invalid payment signature');
    }

    // Read the payment back from the gateway and compare order id, amount and currency with the
    // stored order before anything is marked paid.
    const gatewayRaw = await assertGatewayPaymentMatches(order, input.razorpayPaymentId);

    // Fulfill order in atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock Order FIRST (Global Lock Hierarchy)
      await tx.$queryRaw`
        SELECT id FROM "orders" WHERE id = ${order.id} FOR UPDATE;
      `;

      // 2. Lock OrderItems SECOND
      await tx.$queryRaw`
        SELECT id FROM "order_items" WHERE "orderId" = ${order.id} ORDER BY id ASC FOR UPDATE;
      `;

      // Claim once: under the row lock, an order the webhook (or a parallel request) already paid
      // is returned as it is, and one cancelled meanwhile is refused.
      const locked = await tx.order.findUnique({ where: { id: order.id }, select: { status: true } });
      if (locked?.status === OrderStatus.PAID) {
        const current = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true, shippingAddress: true },
        });
        return { updatedOrder: current!, createdEntitlements: [] };
      }
      if (locked?.status === OrderStatus.CANCELLED) {
        throw new ValidationError('Cannot verify payment for a cancelled order');
      }

      // 3. Atomically transition order to PAID, CAPTURED, paidAt = clock_timestamp(), version = version + 1
      await tx.$executeRaw`
        UPDATE "orders"
        SET
          status = 'PAID'::"OrderStatus",
          "paymentStatus" = 'CAPTURED'::"PaymentStatus",
          "paidAt" = clock_timestamp(),
          "version" = version + 1,
          "razorpayPaymentId" = ${input.razorpayPaymentId},
          "updatedAt" = clock_timestamp()
        WHERE id = ${order.id};
      `;

      // 4. Create fulfillment units idempotently
      await fulfillmentService.createFulfillmentUnitsForOrder(order.id, tx);

      // 5. Fulfill items: stock taken atomically, one download per digital line (per variant),
      // coupon use recorded, saved cart emptied. Runs once per order.
      const effects = await shopOrdersService.applyPaidEffects(tx, order.id);
      const createdEntitlements = effects.entitlementIds.length
        ? await tx.digitalProductEntitlement.findMany({
            where: { id: { in: effects.entitlementIds } },
            include: { product: true },
          })
        : [];

      // 6. Reconcile overall order fulfillment status
      await fulfillmentService.reconcileOrderFulfillment(order.id, tx);

      // 7. Money: ledger row -> SUCCESS and the invoice number, in this same transaction.
      await settleOrderPaid(
        tx,
        order.id,
        { gatewayPaymentId: input.razorpayPaymentId, gatewayOrderId: input.razorpayOrderId, raw: gatewayRaw ?? undefined },
        { placeOfSupplyState: order.shippingAddress?.state ?? null }
      );

      const updatedOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true, shippingAddress: true },
      });

      return { updatedOrder: updatedOrder!, createdEntitlements };
    });

    logger.info(
      { orderId: result.updatedOrder.id, userId: user.id },
      'Shop payment verified and fulfillment completed successfully'
    );

    // Website channels (e-mail / SMS / WhatsApp "order confirmed"), then the app's push and in-app
    // notice with websiteChannels off so the customer is not messaged twice for one sale.
    await shopOrdersService.notifyOrderStatus(result.updatedOrder.id);

    // Non-blocking notification dispatch
    try {
      await notificationService.sendNotification({
        userId: user.id,
        type: 'PAYMENT_SUCCESS',
        entityId: result.updatedOrder.id,
        route: 'OPEN_PAYMENTS',
        websiteChannels: false,
        templateData: {
          amountRupees: (result.updatedOrder.amount / 100).toFixed(2),
          orderId: result.updatedOrder.id,
          reportName: result.updatedOrder.items[0]?.title || 'Shop Purchase',
        },
      });
    } catch (notifErr) {
      logger.error({ orderId: result.updatedOrder.id, notifErr }, 'Failed to dispatch notification');
    }

    return {
      message: 'Payment verified successfully',
      order: result.updatedOrder,
      digitalEntitlements: result.createdEntitlements,
    };
  }

  /**
   * Get authenticated user's digital downloads library
   */
  public async getMyDigitalDownloads(userId: string) {
    const entitlements = await prisma.digitalProductEntitlement.findMany({
      where: { userId },
      include: { product: { include: { variantRows: true } }, order: true },
      orderBy: { grantedAt: 'desc' },
    });

    // The storage key of a file is never part of this list: a link is issued per download.
    return entitlements.map((ent) => {
      const variant = ent.variantId ? ent.product.variantRows.find((v) => v.id === ent.variantId) : undefined;
      const bundle = Array.isArray(ent.bundleAssets) ? (ent.bundleAssets as Array<{ name?: string; type?: string }>) : [];
      return {
        id: ent.id,
        productId: ent.productId,
        productSlug: ent.product.slug,
        orderId: ent.orderId,
        variantId: ent.variantId,
        variantName: variant ? variant.value || variant.name : null,
        productTitle: ent.product.title,
        productName: ent.assetName ?? ent.product.title,
        productHindiTitle: ent.product.hindiTitle,
        productType: ent.product.productType,
        category: ent.product.category,
        imageUrl: ent.product.imageUrl,
        thumbnail: ent.product.thumbnailUrl ?? ent.product.imageUrl,
        status: ent.status,
        downloadCount: ent.downloadCount,
        totalDownloads: ent.downloadCount,
        lastDownloadedAt: ent.lastDownloadedAt,
        grantedAt: ent.grantedAt,
        expiresAt: ent.expiresAt,
        bundleAssets: bundle.map((asset) => ({ name: asset?.name ?? null, type: asset?.type ?? null })),
        hasBundleAssets: bundle.length > 0,
      };
    });
  }

  /**
   * Issue a short-lived signed link for a purchased file, after checking that the entitlement
   * belongs to the caller and is active. The file itself stays private in storage; the website
   * returned its permanent public S3 address instead.
   */
  public async getSecureDownloadUrl(userId: string, entitlementId: string, assetIndex?: number) {
    const entitlement = await prisma.digitalProductEntitlement.findFirst({
      where: { id: entitlementId, userId },
      include: { product: true },
    });

    if (!entitlement) {
      throw new NotFoundError('Digital download not found or not entitled to your account');
    }

    if (entitlement.status !== EntitlementStatus.ACTIVE) {
      throw new ForbiddenError(`Digital product access is ${entitlement.status.toLowerCase()}`);
    }

    if (entitlement.expiresAt && entitlement.expiresAt < new Date()) {
      throw new ForbiddenError('Digital download entitlement has expired');
    }

    // Determine target asset: the file of the purchased variant (kept on the entitlement when it
    // was granted), or one file of a bundle.
    let targetAssetKey = entitlement.assetKey || entitlement.product.imageUrl;
    let targetAssetName = entitlement.assetName || entitlement.product.title;

    if (
      Array.isArray(entitlement.bundleAssets) &&
      (entitlement.bundleAssets as any[]).length > 0 &&
      typeof assetIndex === 'number'
    ) {
      const bundleItem = (entitlement.bundleAssets as any[])[assetIndex];
      if (bundleItem) {
        targetAssetKey = bundleItem.key || targetAssetKey;
        targetAssetName = bundleItem.name || targetAssetName;
      }
    }

    if (!targetAssetKey) {
      throw new NotFoundError('The file for this purchase is not available yet');
    }

    // Files uploaded through the upload endpoint (and website-era files) go through the upload
    // helper; the seeded catalogue's own keys ("digital/...") are signed directly.
    const downloadUrl = resolveManagedKey(targetAssetKey)
      ? await getUploadedFileSignedUrl(targetAssetKey, DOWNLOAD_LINK_TTL_SECONDS)
      : await storageService.getSignedDownloadUrl(storageKeyOf(targetAssetKey), DOWNLOAD_LINK_TTL_SECONDS);

    // Atomically increment download count
    await prisma.digitalProductEntitlement.update({
      where: { id: entitlement.id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadedAt: new Date(),
      },
    });

    return {
      entitlementId: entitlement.id,
      assetName: targetAssetName,
      downloadUrl,
      file: downloadUrl,
      expiresAt: new Date(Date.now() + DOWNLOAD_LINK_TTL_SECONDS * 1000).toISOString(),
      downloadCount: entitlement.downloadCount + 1,
    };
  }

  /**
   * Shipping Address CRUD. Every lookup and write carries the caller's user id, so one customer
   * can never read, change, delete or default another customer's address (website finding 6).
   */
  public async getShippingAddresses(userId: string) {
    return prisma.shippingAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  public async createShippingAddress(userId: string, data: ShippingAddressInput) {
    const type = toAddressType(data.type);
    return prisma.$transaction(async (tx) => {
      // The first address of an account is its default.
      const makeDefault = Boolean(data.isDefault) || (await tx.shippingAddress.count({ where: { userId } })) === 0;
      if (makeDefault) {
        await tx.shippingAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      return tx.shippingAddress.create({
        data: {
          userId,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2 || null,
          landmark: data.landmark || null,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country || 'India',
          ...(type ? { type } : {}),
          isDefault: makeDefault,
        },
      });
    });
  }

  public async updateShippingAddress(userId: string, addressId: string, data: Partial<ShippingAddressInput>) {
    const type = toAddressType(data.type);
    return prisma.$transaction(async (tx) => {
      const existing = await tx.shippingAddress.findFirst({ where: { id: addressId, userId } });
      if (!existing) {
        throw new NotFoundError('Shipping address not found');
      }

      if (data.isDefault) {
        await tx.shippingAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      }

      // Only the address fields may be written: never userId or id, whatever the body contains.
      await tx.shippingAddress.updateMany({
        where: { id: addressId, userId },
        data: {
          ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
          ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber } : {}),
          ...(data.addressLine1 !== undefined ? { addressLine1: data.addressLine1 } : {}),
          ...(data.addressLine2 !== undefined ? { addressLine2: data.addressLine2 || null } : {}),
          ...(data.landmark !== undefined ? { landmark: data.landmark || null } : {}),
          ...(data.city !== undefined ? { city: data.city } : {}),
          ...(data.state !== undefined ? { state: data.state } : {}),
          ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
          ...(data.country !== undefined ? { country: data.country } : {}),
          ...(type ? { type } : {}),
          ...(data.isDefault !== undefined ? { isDefault: Boolean(data.isDefault) } : {}),
        },
      });
      return tx.shippingAddress.findFirstOrThrow({ where: { id: addressId, userId } });
    });
  }

  /** Website `PATCH /address/:id/default`. */
  public async setDefaultShippingAddress(userId: string, addressId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.shippingAddress.findFirst({ where: { id: addressId, userId } });
      if (!existing) {
        throw new NotFoundError('Shipping address not found');
      }
      await tx.shippingAddress.updateMany({ where: { userId }, data: { isDefault: false } });
      await tx.shippingAddress.updateMany({ where: { id: addressId, userId }, data: { isDefault: true } });
      return { ...existing, isDefault: true };
    });
  }

  public async deleteShippingAddress(userId: string, addressId: string) {
    const deleted = await prisma.shippingAddress.deleteMany({
      where: { id: addressId, userId },
    });
    if (deleted.count === 0) {
      throw new NotFoundError('Shipping address not found');
    }

    return { success: true };
  }

  /**
   * Customer Account: Order history and details
   */
  public async getMyOrders(userId: string, query?: { limit?: number; offset?: number }) {
    const limit = query?.limit ? Math.min(Math.max(query.limit, 1), 50) : 20;
    const offset = query?.offset ? Math.max(query.offset, 0) : 0;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        take: limit,
        skip: offset,
        include: {
          items: true,
          shippingAddress: true,
          refunds: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where: { userId } }),
    ]);

    return {
      orders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  public async getOrderDetails(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: true,
        shippingAddress: true,
        refunds: true,
        digitalEntitlements: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  /**
   * Comprehensive Customer Account Hub summary
   */
  public async getAccountSummary(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const [
      birthProfilesCount,
      reportsCount,
      consultationsCount,
      coursesCount,
      ordersCount,
      digitalDownloadsCount,
      recentReports,
      recentOrders,
    ] = await Promise.all([
      prisma.birthProfile.count({ where: { userId } }),
      prisma.report.count({ where: { userId } }),
      prisma.consultationBooking.count({ where: { userId } }),
      prisma.courseEntitlement.count({ where: { userId, status: EntitlementStatus.ACTIVE } }),
      prisma.order.count({ where: { userId } }),
      prisma.digitalProductEntitlement.count({ where: { userId, status: EntitlementStatus.ACTIVE } }),
      prisma.report.findMany({
        where: { userId },
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { birthProfile: true },
      }),
      prisma.order.findMany({
        where: { userId },
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
    ]);

    return {
      user,
      stats: {
        birthProfilesCount,
        reportsCount,
        consultationsCount,
        coursesCount,
        ordersCount,
        digitalDownloadsCount,
      },
      recentReports,
      recentOrders,
    };
  }

  /**
   * Admin: List all orders with filters
   */
  public async adminListOrders(query: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    fulfillmentStatus?: FulfillmentStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.fulfillmentStatus) where.fulfillmentStatus = query.fulfillmentStatus;
    if (query.search) {
      where.OR = [
        { id: { contains: query.search } },
        { razorpayOrderId: { contains: query.search } },
        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const limit = query.limit ? Math.min(Math.max(query.limit, 1), 50) : 20;
    const offset = query.offset ? Math.max(query.offset, 0) : 0;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
          items: true,
          shippingAddress: true,
          refunds: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, limit, offset };
  }

  /**
   * Admin: Update physical fulfillment status with audit logging
   */
  public async adminUpdateFulfillment(
    admin: { id: string; email: string },
    orderId: string,
    input: AdminUpdateFulfillmentInput
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { shippingAddress: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const updateData: any = {
      fulfillmentStatus: input.fulfillmentStatus as FulfillmentStatus,
    };

    if (input.trackingNumber) updateData.trackingNumber = input.trackingNumber;
    if (input.courierPartner) updateData.courierPartner = input.courierPartner;
    if (input.fulfillmentStatus === 'DISPATCHED') updateData.dispatchedAt = new Date();
    if (input.fulfillmentStatus === 'DELIVERED') updateData.deliveredAt = new Date();

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Audit logging requirement
    await adminService.logAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ORDER_FULFILLMENT_UPDATE',
      resource: `Order:${orderId}`,
      details: `Updated fulfillmentStatus to ${input.fulfillmentStatus}. Tracking: ${input.trackingNumber || 'N/A'}, Courier: ${input.courierPartner || 'N/A'}`,
    });

    return updated;
  }

  /**
   * Admin: Update product stock and availability with audit logging
   */
  public async adminUpdateStock(
    admin: { id: string; email: string },
    productId: string,
    input: AdminUpdateStockInput
  ) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        stock: input.stock,
        isAvailable: input.isAvailable,
      },
    });

    await adminService.logAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'PRODUCT_STOCK_UPDATE',
      resource: `Product:${productId}`,
      details: `Updated stock to ${input.stock}, isAvailable to ${input.isAvailable} for "${product.title}"`,
    });

    return updated;
  }

  /**
   * Admin: Grant digital entitlement with audit logging
   */
  public async adminGrantEntitlement(
    admin: { id: string; email: string },
    input: AdminGrantEntitlementInput
  ) {
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new NotFoundError('Product not found');

    const entitlement = await prisma.digitalProductEntitlement.create({
      data: {
        userId: input.userId,
        productId: input.productId,
        source: EntitlementSource.ADMIN_GRANT,
        status: EntitlementStatus.ACTIVE,
        assetKey: (product.metadata as any)?.digitalAssetKey || product.imageUrl,
        bundleAssets: (product.metadata as any)?.bundleAssets || null,
      },
      include: { product: true },
    });

    await adminService.logAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'DIGITAL_ENTITLEMENT_GRANT',
      resource: `DigitalProductEntitlement:${entitlement.id}`,
      details: `Admin granted digital entitlement to user ${input.userId} for product "${product.title}"`,
    });

    return entitlement;
  }

  /**
   * Admin: Revoke digital entitlement with audit logging
   */
  public async adminRevokeEntitlement(
    admin: { id: string; email: string },
    entitlementId: string,
    reason?: string
  ) {
    const entitlement = await prisma.digitalProductEntitlement.findUnique({
      where: { id: entitlementId },
      include: { product: true },
    });
    if (!entitlement) throw new NotFoundError('Entitlement not found');

    const updated = await prisma.digitalProductEntitlement.update({
      where: { id: entitlementId },
      data: { status: EntitlementStatus.REVOKED },
    });

    await adminService.logAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'DIGITAL_ENTITLEMENT_REVOKE',
      resource: `DigitalProductEntitlement:${entitlementId}`,
      details: `Revoked entitlement for product "${entitlement.product.title}". Reason: ${reason || 'Administrative revocation'}`,
    });

    return updated;
  }
}

export const productsService = new ProductsService();
