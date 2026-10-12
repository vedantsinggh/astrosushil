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
} from '@prisma/client';
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

export class ProductsService {
  private seeded = false;

  /**
   * Seed/sync verified products to local PostgreSQL database
   */
  public async ensureProductsSeeded(): Promise<void> {
    if (this.seeded) return;
    try {
      for (const item of VERIFIED_PRODUCTS) {
        await prisma.product.upsert({
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
            stock: item.stock,
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
          },
        });
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
  public async listProducts(query: ListProductsQuery) {
    await this.ensureProductsSeeded();

    const where: any = { isAvailable: true };
    if (query.category) {
      where.category = query.category;
    }
    if (query.productType) {
      where.productType = query.productType as ProductType;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { hindiTitle: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const limit = query.limit ? Math.min(Math.max(query.limit, 1), 50) : 20;
    const offset = query.offset ? Math.max(query.offset, 0) : 0;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ requiresShipping: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Get product details by ID or slug
   */
  public async getProductDetails(idOrSlug: string) {
    await this.ensureProductsSeeded();

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }, { catalogId: idOrSlug }],
      },
    });

    if (!product) {
      throw new NotFoundError(`Product not found: "${idOrSlug}"`);
    }

    return product;
  }

  /**
   * Calculate cart server-authoritatively.
   * Completely immune to client-submitted prices, discounts, or tax rates.
   */
  public async calculateCart(userId: string | null, input: CalculateCartInput) {
    await this.ensureProductsSeeded();

    if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
      throw new ValidationError('At least one product must be in the cart');
    }

    if (input.items.length > 50) {
      throw new ValidationError('Cart exceeds maximum allowed item count (50 items)');
    }

    let calculatedItems: any[] = [];
    let itemsSubtotalPaise = 0;
    let itemsTaxPaise = 0;
    let itemsTotalPaise = 0;
    let hasPhysicalItems = false;
    let physicalSubtotalPaise = 0;

    for (const item of input.items) {
      const product = await prisma.product.findFirst({
        where: {
          OR: [{ id: item.productId }, { slug: item.productId }, { catalogId: item.productId }],
        },
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

      // Check stock if physical product with tracked inventory
      if (product.requiresShipping && product.stock >= 0) {
        if (qty > product.stock) {
          throw new ValidationError(
            `Requested quantity (${qty}) exceeds available stock (${product.stock}) for "${product.title}"`
          );
        }
      }

      // Resolve unit price: check if variant is selected
      let unitPrice = product.price;
      let variantName: string | null = null;

      if (item.variantId && Array.isArray(product.variants)) {
        const variant = (product.variants as any[]).find(
          (v) => v.id === item.variantId || (item.variantId && v.value?.toLowerCase() === item.variantId.toLowerCase())
        );
        if (variant && typeof variant.price === 'number') {
          unitPrice = variant.price;
          variantName = `${variant.name}: ${variant.value}`;
        }
      }

      const lineGross = unitPrice * qty;
      const taxRateBasisPoints = 1800; // 18% inclusive GST
      const lineNet = Math.round((lineGross * 10000) / (10000 + taxRateBasisPoints));
      const lineTax = lineGross - lineNet;

      if (product.requiresShipping) {
        hasPhysicalItems = true;
        physicalSubtotalPaise += lineGross;
      }

      calculatedItems.push({
        productId: product.id,
        catalogId: product.catalogId,
        slug: product.slug,
        title: product.title,
        hindiTitle: product.hindiTitle,
        imageUrl: product.imageUrl,
        productType: product.productType,
        requiresShipping: product.requiresShipping,
        variantId: item.variantId || null,
        variantName,
        quantity: qty,
        unitPrice,
        taxRate: taxRateBasisPoints,
        subtotal: lineNet,
        taxAmount: lineTax,
        totalAmount: lineGross,
      });

      itemsSubtotalPaise += lineNet;
      itemsTaxPaise += lineTax;
      itemsTotalPaise += lineGross;
    }

    // Shipping calculation:
    // If physical items exist:
    // - Free shipping threshold: physical order >= ₹2,000 (200000 paise)
    // - Otherwise standard shipping: ₹99 (9900 paise)
    // If all digital: ₹0 shipping
    let shippingAmountPaise = 0;
    let eligibleForFreeShipping = false;

    if (hasPhysicalItems) {
      if (physicalSubtotalPaise >= 200000) {
        shippingAmountPaise = 0;
        eligibleForFreeShipping = true;
      } else {
        shippingAmountPaise = 9900;
        eligibleForFreeShipping = false;
      }
    }

    // Validate shipping address if provided
    let shippingAddress: any = null;
    if (input.shippingAddressId && userId) {
      shippingAddress = await prisma.shippingAddress.findFirst({
        where: { id: input.shippingAddressId, userId },
      });
    }

    const finalPayablePaise = itemsTotalPaise + shippingAmountPaise;

    return {
      items: calculatedItems,
      subtotal: itemsSubtotalPaise,
      taxAmount: itemsTaxPaise,
      shippingAmount: shippingAmountPaise,
      discountAmount: 0,
      totalAmount: finalPayablePaise,
      currency: 'INR',
      requiresShipping: hasPhysicalItems,
      eligibleForFreeShipping,
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
    const calculated = await this.calculateCart(user.id, {
      items: input.items,
      shippingAddressId: input.shippingAddressId,
    });

    // 3. Physical fulfillment validation: shipping address is mandatory if order has physical items
    if (calculated.requiresShipping && !input.shippingAddressId) {
      throw new ValidationError('A valid shipping address is required for orders containing physical products');
    }

    if (calculated.requiresShipping && input.shippingAddressId) {
      const address = await prisma.shippingAddress.findFirst({
        where: { id: input.shippingAddressId, userId: user.id },
      });
      if (!address) {
        throw new ValidationError('Selected shipping address was not found or does not belong to this account');
      }
    }

    // 4. Create Gateway Order
    const rzOrder = await paymentService.createRazorpayOrder(
      calculated.totalAmount,
      calculated.currency,
      `shop_${Date.now()}`
    );

    // 5. Persist unified Order and OrderItems in single transaction
    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: user.id,
          razorpayOrderId: rzOrder.id,
          amount: calculated.totalAmount,
          subtotal: calculated.subtotal,
          taxAmount: calculated.taxAmount,
          shippingAmount: calculated.shippingAmount,
          shippingAddressId: input.shippingAddressId || null,
          discountAmount: 0,
          currency: calculated.currency,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          idempotencyKey: input.idempotencyKey || null,
          notes: input.notes || null,
          items: {
            create: calculated.items.map((item) => ({
              itemType: OrderItemType.PRODUCT,
              catalogId: item.catalogId,
              title: item.title,
              description: item.variantName ? `${item.title} (${item.variantName})` : item.title,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
              totalAmount: item.totalAmount,
              currency: calculated.currency,
              fulfillmentType: item.requiresShipping ? FulfillmentType.PHYSICAL : FulfillmentType.DIGITAL,
              metadata: {
                productId: item.productId,
                slug: item.slug,
                variantId: item.variantId,
                variantName: item.variantName,
                productType: item.productType,
                imageUrl: item.imageUrl,
              },
            })),
          },
        },
        include: {
          items: true,
          shippingAddress: true,
        },
      });

      return createdOrder;
    });

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

    // Idempotent replay: if already PAID, return cleanly
    if (order.status === OrderStatus.PAID) {
      logger.info({ orderId: order.id, userId: user.id }, 'Shop payment already verified (Idempotent replay)');
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
      throw new ValidationError('Invalid payment signature');
    }

    // Fulfill order in atomic transaction
    const hasPhysicalItems = order.items.some((i) => i.fulfillmentType === FulfillmentType.PHYSICAL);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Order status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paymentStatus: PaymentStatus.CAPTURED,
          fulfillmentStatus: hasPhysicalItems ? FulfillmentStatus.PROCESSING : FulfillmentStatus.FULFILLED,
          razorpayPaymentId: input.razorpayPaymentId,
        },
        include: { items: true, shippingAddress: true },
      });

      // 2. Fulfill items
      const createdEntitlements: any[] = [];

      for (const item of order.items) {
        if (item.itemType === OrderItemType.PRODUCT) {
          const product = await tx.product.findFirst({
            where: {
              OR: [{ catalogId: item.catalogId }, { id: item.catalogId }, { slug: item.catalogId }],
            },
          });

          if (product) {
            if (product.requiresShipping) {
              // Physical product: safely decrement stock if stock tracking enabled
              if (product.stock > 0) {
                await tx.product.update({
                  where: { id: product.id },
                  data: {
                    stock: { decrement: Math.min(item.quantity, product.stock) },
                  },
                });
              }
            } else {
              // Digital product: grant digital entitlement
              const existingEntitlement = await tx.digitalProductEntitlement.findFirst({
                where: {
                  userId: order.userId,
                  productId: product.id,
                  orderId: order.id,
                },
              });

              if (!existingEntitlement) {
                const entitlement = await tx.digitalProductEntitlement.create({
                  data: {
                    userId: order.userId,
                    productId: product.id,
                    orderId: order.id,
                    source: EntitlementSource.PURCHASE,
                    status: EntitlementStatus.ACTIVE,
                    assetKey: (product.metadata as any)?.digitalAssetKey || product.imageUrl,
                    bundleAssets: (product.metadata as any)?.bundleAssets || null,
                  },
                  include: { product: true },
                });
                createdEntitlements.push(entitlement);
              }
            }
          }
        }
      }

      return { updatedOrder, createdEntitlements };
    });

    logger.info(
      { orderId: result.updatedOrder.id, userId: user.id },
      'Shop payment verified and fulfillment completed successfully'
    );

    // Non-blocking notification dispatch
    try {
      await notificationService.sendNotification({
        userId: user.id,
        type: 'PAYMENT_SUCCESS',
        entityId: result.updatedOrder.id,
        route: 'OPEN_PAYMENTS',
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
      include: { product: true, order: true },
      orderBy: { grantedAt: 'desc' },
    });

    return entitlements.map((ent) => ({
      id: ent.id,
      productId: ent.productId,
      orderId: ent.orderId,
      productTitle: ent.product.title,
      productHindiTitle: ent.product.hindiTitle,
      productType: ent.product.productType,
      category: ent.product.category,
      imageUrl: ent.product.imageUrl,
      status: ent.status,
      downloadCount: ent.downloadCount,
      lastDownloadedAt: ent.lastDownloadedAt,
      grantedAt: ent.grantedAt,
      expiresAt: ent.expiresAt,
      bundleAssets: ent.bundleAssets,
      hasBundleAssets: Array.isArray(ent.bundleAssets) && (ent.bundleAssets as any[]).length > 0,
    }));
  }

  /**
   * Generate secure expiring signed download link for digital asset
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

    // Determine target asset
    let targetAssetKey = entitlement.assetKey || entitlement.product.imageUrl;
    let targetAssetName = entitlement.product.title;

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

    // Atomically increment download count
    await prisma.digitalProductEntitlement.update({
      where: { id: entitlement.id },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadedAt: new Date(),
      },
    });

    // Generate signed HMAC token with 15-minute expiry
    const expiryTimestamp = Math.floor(Date.now() / 1000) + 15 * 60; // 15 mins
    const secret = process.env.JWT_SECRET || 'astro-sushil-secure-token-secret';
    const payload = `${entitlement.id}:${targetAssetKey}:${expiryTimestamp}`;
    const token = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const downloadUrl = `https://downloads.astrosushil.com/secure/${entitlement.id}?token=${token}&expires=${expiryTimestamp}&asset=${encodeURIComponent(
      targetAssetKey || ''
    )}`;

    return {
      entitlementId: entitlement.id,
      assetName: targetAssetName,
      downloadUrl,
      expiresAt: new Date(expiryTimestamp * 1000).toISOString(),
      downloadCount: entitlement.downloadCount + 1,
    };
  }

  /**
   * Shipping Address CRUD
   */
  public async getShippingAddresses(userId: string) {
    return prisma.shippingAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  public async createShippingAddress(userId: string, data: ShippingAddressInput) {
    if (data.isDefault) {
      await prisma.shippingAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return prisma.shippingAddress.create({
      data: {
        userId,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || null,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country || 'India',
        isDefault: data.isDefault || false,
      },
    });
  }

  public async updateShippingAddress(userId: string, addressId: string, data: Partial<ShippingAddressInput>) {
    const existing = await prisma.shippingAddress.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) {
      throw new NotFoundError('Shipping address not found');
    }

    if (data.isDefault) {
      await prisma.shippingAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    return prisma.shippingAddress.update({
      where: { id: addressId },
      data: {
        ...data,
      },
    });
  }

  public async deleteShippingAddress(userId: string, addressId: string) {
    const existing = await prisma.shippingAddress.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) {
      throw new NotFoundError('Shipping address not found');
    }

    await prisma.shippingAddress.delete({
      where: { id: addressId },
    });

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
