import { z } from 'zod';
import {
  EntitlementSource,
  EntitlementStatus,
  FulfillmentStatus,
  FulfillmentType,
  FulfillmentUnitStatus,
  ObligationType,
  Order,
  OrderItem,
  OrderItemType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  ShopOrder,
  ShopOrderStatus,
} from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { paymentService } from '../../services/payment.service';
import { fulfillmentService } from '../fulfillment/fulfillment.service';
import { AppError, ForbiddenError, NotFoundError, ValidationError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { getRazorpayPublicKeyId } from '../payments/razorpay-public-key';
import { notificationEvents, OrderConfirmedEvent } from '../notifications/notification.events';
import { AdminActor, audit, dateRange, pageParams } from '../products/shop-http';
import { PRODUCT_INCLUDE, ProductRow, findVariant, productDownloadKey, ResolvedLine, websiteType, WebsiteProductType } from '../products/product-view';
import { PricedCart, PricedLine } from '../products/shop-pricing';
import { cartService, ComputedCart } from '../cart/cart.service';
import { couponsService } from '../coupons/coupons.service';
import { quoteCheckout } from '../commerce/money/checkout';
import { transactionsService } from '../transactions/transactions.service';
import {
  canCustomerCancel,
  checkAdminTransition,
  fulfillmentFor,
  isPaid,
  parseWebsiteStatus,
  statusAfterPayment,
  toWebsiteStatus,
  websitePaymentStatus,
} from './order-status';

/**
 * Product orders in the website's shape (website `Order` module), on top of the commerce
 * Order / OrderItem rows.
 *
 * There is one payment path. This service prices nothing and talks to no gateway directly: it
 * hands commerce a typed `ShopOrderDraft` (server-computed lines, tax, coupon share, shipping) and
 * gets a payable order back. Payment is verified by the existing shop verification
 * (`productsService.verifyShopPayment`) and by the Razorpay webhook; both must call
 * `applyPaidEffects` inside the transaction that marks the order paid.
 */

// --------------------------------------------------------------------------- typed inputs to commerce

export interface ShippingAddressSnapshot {
  fullName: string;
  phone: string;
  pincode: string;
  state: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  country: string;
}

export interface ShopOrderDraftItem {
  productId: string;
  catalogId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  /** Website product type. */
  type: WebsiteProductType;
  /** Stored product type (PHYSICAL, DIGITAL_WALLPAPER...), kept for the app. */
  productType: string;
  /** Variant row id, or null. */
  variantId: string | null;
  /** "Size: Large", or null. */
  variantLabel: string | null;
  quantity: number;
  unitPricePaise: number;
  mrpPaise: number;
  /** Tax config the line was priced with. */
  taxRateBp: number;
  taxInclusive: boolean;
  /** This line's share of the order's coupon discount. */
  couponDiscountPaise: number;
  taxablePaise: number;
  taxPaise: number;
  /** Amount charged for the line: discount off, exclusive tax on. */
  payablePaise: number;
}

export interface ShopOrderDraft {
  userId: string;
  /** "cart" = checkout of the saved cart; "direct" = the app's stateless order. */
  source: 'cart' | 'direct';
  /**
   * Currency the customer wants to pay in (one of the money module's supported currencies).
   * Every amount in the draft is INR paise; commerce converts the total at its server-side rate.
   */
  currency: string;
  items: ShopOrderDraftItem[];
  itemsTotalPaise: number;
  couponCode: string | null;
  couponDiscountPaise: number;
  shippingPaise: number;
  /** Exclusive GST added on top. */
  taxAddedPaise: number;
  /** All GST in the order. */
  taxTotalPaise: number;
  taxablePaise: number;
  totalPaise: number;
  shippingAddressId: string | null;
  shippingAddress: ShippingAddressSnapshot | null;
  idempotencyKey?: string | null;
  notes?: string | null;
}

/** The only thing this module needs from the payment gateway. Replaced by a fake in tests. */
export interface ShopPaymentGateway {
  createOrder(amountPaise: number, currency: string, receipt: string): Promise<{ id: string }>;
}

/**
 * Customer messages about an order (website: the "order-confirmed" e-mail / SMS / WhatsApp job,
 * raised when the payment is verified and at every admin status change). Replaced by a fake in tests.
 */
export interface ShopOrderNotifier {
  orderConfirmed(event: OrderConfirmedEvent): Promise<unknown>;
}

const defaultGateway: ShopPaymentGateway = {
  createOrder: (amountPaise, currency, receipt) => paymentService.createRazorpayOrder(amountPaise, currency, receipt),
};

const defaultNotifier: ShopOrderNotifier = {
  // The messaging outbox is idempotent per order and status, so the client verification and the
  // webhook may both raise the same event.
  orderConfirmed: (event) => notificationEvents.orderConfirmed(event),
};

export function buildDraftItem(resolved: ResolvedLine, priced: PricedLine): ShopOrderDraftItem {
  const product = resolved.product;
  return {
    productId: product.id,
    catalogId: product.catalogId,
    slug: product.slug,
    title: product.title,
    imageUrl: product.thumbnailUrl ?? product.imageUrl,
    type: websiteType(product),
    productType: product.productType,
    variantId: resolved.variant?.id ?? null,
    variantLabel: resolved.variantLabel,
    quantity: priced.quantity,
    unitPricePaise: priced.unitPricePaise,
    mrpPaise: resolved.mrpPaise,
    taxRateBp: priced.taxRateBp,
    taxInclusive: priced.taxInclusive,
    couponDiscountPaise: priced.discountPaise,
    taxablePaise: priced.taxablePaise,
    taxPaise: priced.taxPaise,
    payablePaise: priced.payablePaise,
  };
}

export function buildDraft(params: {
  userId: string;
  source: 'cart' | 'direct';
  lines: Array<{ resolved: ResolvedLine; priced: PricedLine }>;
  priced: PricedCart;
  couponCode: string | null;
  shippingAddressId: string | null;
  shippingAddress: ShippingAddressSnapshot | null;
  idempotencyKey?: string | null;
  notes?: string | null;
  currency?: string | null;
}): ShopOrderDraft {
  return {
    userId: params.userId,
    source: params.source,
    currency: params.currency || 'INR',
    items: params.lines.map((l) => buildDraftItem(l.resolved, l.priced)),
    itemsTotalPaise: params.priced.itemsTotalPaise,
    couponCode: params.priced.discountPaise > 0 ? params.couponCode : null,
    couponDiscountPaise: params.priced.discountPaise,
    shippingPaise: params.priced.shippingPaise,
    taxAddedPaise: params.priced.taxAddedPaise,
    taxTotalPaise: params.priced.taxTotalPaise,
    taxablePaise: params.priced.taxablePaise,
    totalPaise: params.priced.totalPaise,
    shippingAddressId: params.shippingAddressId,
    shippingAddress: params.shippingAddress,
    idempotencyKey: params.idempotencyKey ?? null,
    notes: params.notes ?? null,
  };
}

export function snapshotAddress(address: {
  fullName: string;
  phoneNumber: string;
  postalCode: string;
  state: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  country: string;
}): ShippingAddressSnapshot {
  return {
    fullName: address.fullName,
    phone: address.phoneNumber,
    pincode: address.postalCode,
    state: address.state,
    city: address.city,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    landmark: address.landmark,
    country: address.country,
  };
}

// --------------------------------------------------------------------------- request schemas

export const checkoutSchema = z.object({
  addressId: z.string().uuid().nullable().optional(),
  /** Only online payment. "cod" is refused: cash on delivery is not offered. */
  paymentMethod: z.string().trim().toLowerCase().optional(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
});

export const adminListOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.string().trim().max(40).optional(),
  fromDate: z.string().trim().max(40).optional(),
  toDate: z.string().trim().max(40).optional(),
  productId: z.string().trim().max(100).optional(),
});

export const adminUpdateStatusSchema = z.object({
  orderStatus: z.string().trim().min(1).max(40),
  trackingNumber: z.string().trim().max(100).optional(),
  courierPartner: z.string().trim().max(100).optional(),
});

// --------------------------------------------------------------------------- views

type OrderWithShop = Order & {
  items: OrderItem[];
  shopOrder: ShopOrder | null;
  user?: { id: string; fullName: string | null; email: string | null; phoneNumber: string | null } | null;
};

interface ItemMeta {
  productId?: string;
  slug?: string;
  variantId?: string | null;
  variantName?: string | null;
  productType?: string;
  type?: string;
  imageUrl?: string | null;
  mrp?: number;
  taxInclusive?: boolean;
  couponDiscount?: number;
}

function itemMeta(item: OrderItem): ItemMeta {
  return item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata) ? (item.metadata as ItemMeta) : {};
}

/** Website-shaped order. All amounts are paise in the order's currency; `taxRate` is a percent. */
export function toOrderView(order: OrderWithShop) {
  const shop = order.shopOrder;
  const productItems = order.items.filter((i) => i.itemType === OrderItemType.PRODUCT);
  return {
    id: order.id,
    orderStatus: shop ? toWebsiteStatus(shop.status) : null,
    orderType: shop?.orderType ?? null,
    items: productItems.map((item) => {
      const meta = itemMeta(item);
      return {
        id: item.id,
        product: meta.productId ?? null,
        slug: meta.slug ?? null,
        variantId: meta.variantId ?? null,
        variantName: meta.variantName ?? null,
        name: item.title,
        price: item.unitPrice,
        mrp: meta.mrp ?? item.unitPrice,
        quantity: item.quantity,
        image: meta.imageUrl ?? null,
        taxRate: item.taxRate / 100,
        taxType: meta.taxInclusive === false ? 'exclusive' : 'inclusive',
        taxAmount: item.taxAmount,
        discount: meta.couponDiscount ?? 0,
        total: item.totalAmount,
      };
    }),
    addressId: shop?.addressId ?? order.shippingAddressId,
    shippingAddress: shop?.shippingAddress ?? null,
    subTotal: shop?.itemsTotalPaise ?? order.subtotal ?? 0,
    discount: order.discountAmount ?? 0,
    shipping: order.shippingAmount ?? 0,
    tax: shop?.taxPaise ?? 0,
    taxTotal: order.taxAmount ?? 0,
    totalAmount: order.amount,
    coupon: shop?.couponCode ? { code: shop.couponCode, discountAmount: shop.couponDiscountPaise } : null,
    baseCurrency: order.currency,
    exchangeRate: order.exchangeRate ? order.exchangeRate.toString() : '1',
    payment: {
      method: 'razorpay',
      currency: order.paidCurrency || order.currency,
      amountMinor: order.paidAmountMinor ?? order.amount,
      status: websitePaymentStatus(order),
      transactionId: order.razorpayPaymentId,
      razorpayOrderId: order.razorpayOrderId,
    },
    trackingNumber: order.trackingNumber,
    courierPartner: order.courierPartner,
    dispatchedAt: order.dispatchedAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: shop?.cancelledAt ?? null,
    paidAt: order.paidAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    ...(order.user !== undefined
      ? {
          user: order.user
            ? { id: order.user.id, fullName: order.user.fullName, email: order.user.email, phoneNumber: order.user.phoneNumber }
            : null,
        }
      : {}),
  };
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Revenue per day (last `days` days) and per month (last `months` months), by Indian date. */
export function bucketRevenue(
  orders: Array<{ amount: number; createdAt: Date }>,
  now: Date,
  days = 7,
  months = 6
): { daily: Array<{ date: string; revenue: number; orders: number }>; monthly: Array<{ month: string; revenue: number; orders: number }> } {
  const ist = (d: Date) => new Date(d.getTime() + IST_OFFSET_MS).toISOString();
  const today = ist(now).slice(0, 10);
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dayKeys.push(ist(new Date(now.getTime() - i * 86_400_000)).slice(0, 10));
  }
  const monthKeys: string[] = [];
  const [year, month] = today.split('-').map(Number);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    monthKeys.push(d.toISOString().slice(0, 7));
  }
  const daily = new Map(dayKeys.map((k) => [k, { revenue: 0, orders: 0 }]));
  const monthly = new Map(monthKeys.map((k) => [k, { revenue: 0, orders: 0 }]));
  for (const order of orders) {
    const stamp = ist(order.createdAt);
    const day = daily.get(stamp.slice(0, 10));
    if (day) {
      day.revenue += order.amount;
      day.orders += 1;
    }
    const m = monthly.get(stamp.slice(0, 7));
    if (m) {
      m.revenue += order.amount;
      m.orders += 1;
    }
  }
  return {
    daily: dayKeys.map((date) => ({ date, ...daily.get(date)! })),
    monthly: monthKeys.map((key) => ({ month: key, ...monthly.get(key)! })),
  };
}

const ORDER_INCLUDE = { items: true, shopOrder: true } satisfies Prisma.OrderInclude;
const ADMIN_ORDER_INCLUDE = {
  items: true,
  shopOrder: true,
  user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
} satisfies Prisma.OrderInclude;

interface StockShortfall {
  orderItemId: string;
  productId: string;
  variantId: string | null;
  missing: number;
}

// --------------------------------------------------------------------------- service

export class ShopOrdersService {
  private gateway: ShopPaymentGateway = defaultGateway;
  private notifier: ShopOrderNotifier = defaultNotifier;

  /** Test seam / wiring point for the payment and notification modules. */
  public configure(ports: { gateway?: ShopPaymentGateway; notifier?: ShopOrderNotifier }): void {
    if (ports.gateway) this.gateway = ports.gateway;
    if (ports.notifier) this.notifier = ports.notifier;
  }

  // ------------------------------------------------------------- creating

  /**
   * Turns a priced draft into a payable order: one gateway order, one Order with its lines, one
   * ShopOrder, and the coupon hold. The amounts are the draft's; nothing here comes from a client.
   */
  public async createFromDraft(draft: ShopOrderDraft): Promise<OrderWithShop> {
    if (draft.items.length === 0) throw new ValidationError('Cart is empty');
    if (draft.totalPaise <= 0) throw new ValidationError('The order total must be greater than zero');

    const hasPhysical = draft.items.some((i) => i.type === 'physical');
    // What the gateway charges: the INR total converted by the money module at its own rate.
    // An unsupported currency is refused there; a rate is never taken from the client.
    const quote = await quoteCheckout(draft.totalPaise, draft.currency);
    const gatewayOrder = await this.gateway.createOrder(quote.amountMinor, quote.currency, `shop_${Date.now()}`);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: draft.userId,
          razorpayOrderId: gatewayOrder.id,
          amount: draft.totalPaise,
          subtotal: draft.taxablePaise,
          taxAmount: draft.taxTotalPaise,
          shippingAmount: draft.shippingPaise,
          shippingAddressId: draft.shippingAddressId,
          discountAmount: draft.couponDiscountPaise,
          currency: 'INR',
          paidCurrency: quote.currency,
          paidAmountMinor: quote.amountMinor,
          exchangeRate: quote.exchangeRate,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          idempotencyKey: draft.idempotencyKey || null,
          notes: draft.notes || null,
          items: {
            create: draft.items.map((item) => ({
              itemType: OrderItemType.PRODUCT,
              catalogId: item.catalogId,
              title: item.title,
              description: item.variantLabel ? `${item.title} (${item.variantLabel})` : item.title,
              quantity: item.quantity,
              unitPrice: item.unitPricePaise,
              taxRate: item.taxRateBp,
              taxAmount: item.taxPaise,
              taxInclusive: item.taxInclusive,
              totalAmount: item.payablePaise,
              currency: 'INR',
              fulfillmentType:
                item.type === 'physical' ? FulfillmentType.PHYSICAL : item.type === 'service' ? FulfillmentType.SERVICE : FulfillmentType.DIGITAL,
              metadata: {
                productId: item.productId,
                slug: item.slug,
                variantId: item.variantId,
                variantName: item.variantLabel,
                productType: item.productType,
                type: item.type,
                imageUrl: item.imageUrl,
                mrp: item.mrpPaise,
                taxInclusive: item.taxInclusive,
                couponDiscount: item.couponDiscountPaise,
                taxable: item.taxablePaise,
              },
            })),
          },
        },
        include: { items: true },
      });

      // Ledger: the PENDING payment attempt is written with the order (money module).
      await transactionsService.recordAttempt(tx, created, { placeOfSupplyState: draft.shippingAddress?.state ?? null });

      const shopOrder = await tx.shopOrder.create({
        data: {
          orderId: created.id,
          status: ShopOrderStatus.PAYMENT_PENDING,
          orderType: hasPhysical ? 'physical' : 'digital',
          source: draft.source,
          addressId: draft.shippingAddressId,
          shippingAddress: draft.shippingAddress ? (draft.shippingAddress as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          couponCode: draft.couponCode,
          couponDiscountPaise: draft.couponDiscountPaise,
          itemsTotalPaise: draft.itemsTotalPaise,
          shippingPaise: draft.shippingPaise,
          taxPaise: draft.taxAddedPaise,
        },
      });

      if (draft.couponCode) {
        const superseded = await couponsService.reserveForOrder(tx, {
          code: draft.couponCode,
          userId: draft.userId,
          itemsTotalPaise: draft.itemsTotalPaise,
          orderId: created.id,
          expectedDiscountPaise: draft.couponDiscountPaise,
        });
        // An earlier unpaid order of this customer held the same coupon: it is replaced by this one.
        for (const oldOrderId of superseded) {
          const cancelled = await tx.order.updateMany({
            where: { id: oldOrderId, userId: draft.userId, status: OrderStatus.PENDING },
            data: { status: OrderStatus.CANCELLED, fulfillmentStatus: FulfillmentStatus.CANCELLED },
          });
          if (cancelled.count > 0) {
            await tx.shopOrder.updateMany({
              where: { orderId: oldOrderId },
              data: { status: ShopOrderStatus.CANCELLED, cancelledAt: new Date(), cancelledBy: 'superseded' },
            });
          }
        }
      }

      return { ...created, shopOrder };
    });

    logger.info({ orderId: order.id, userId: draft.userId, amount: order.amount, source: draft.source }, 'Shop order created');
    return order;
  }

  /**
   * Checkout of the saved cart (website `POST /orders/create`). The cart is priced again here from
   * current catalogue prices; a stale coupon, an unavailable item or missing stock stops the order
   * instead of silently changing what the customer pays.
   */
  public async checkoutCart(userId: string, input: z.infer<typeof checkoutSchema>) {
    if (input.paymentMethod && input.paymentMethod !== 'razorpay') {
      throw new AppError('Cash on delivery is not available. Please pay online.', 400, 'PAYMENT_METHOD_NOT_AVAILABLE');
    }
    if (input.idempotencyKey) {
      const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: ORDER_INCLUDE });
      if (existing) {
        if (existing.userId !== userId) throw new ForbiddenError('Idempotency key belongs to another user');
        return this.checkoutResponse(existing, true);
      }
    }

    const cart: ComputedCart = await cartService.compute(userId);
    if (cart.lines.length === 0) throw new ValidationError('Cart is empty');

    const blocked = cart.lines.find((l) => l.problem !== null);
    if (blocked) {
      const name = blocked.product?.title ?? 'An item in your cart';
      const reason =
        blocked.problem === 'OUT_OF_STOCK' ? 'is out of stock in the quantity you chose' : 'is no longer available';
      throw new AppError(`${name} ${reason}. Please update your cart.`, 409, 'CART_ITEM_UNAVAILABLE');
    }
    if (cart.couponCode && !cart.appliedCoupon) {
      throw new AppError(
        `${cart.couponError?.message ?? 'This coupon is no longer valid'}. Remove the coupon to continue.`,
        409,
        'COUPON_NO_LONGER_VALID'
      );
    }

    let shippingAddressId: string | null = null;
    let shippingAddress: ShippingAddressSnapshot | null = null;
    if (cart.priced.hasPhysical) {
      if (!input.addressId) throw new ValidationError('Address is required for physical products');
      // Owner check: the address must belong to the customer placing the order.
      const address = await prisma.shippingAddress.findFirst({ where: { id: input.addressId, userId } });
      if (!address) throw new NotFoundError('Address not found');
      shippingAddressId = address.id;
      shippingAddress = snapshotAddress(address);
    }

    const draft = buildDraft({
      userId,
      source: 'cart',
      lines: cart.lines.map((l) => ({ resolved: l.resolved!, priced: l.priced! })),
      priced: cart.priced,
      couponCode: cart.appliedCoupon,
      shippingAddressId,
      shippingAddress,
      idempotencyKey: input.idempotencyKey,
      currency: input.currency,
    });
    const order = await this.createFromDraft(draft);
    return this.checkoutResponse(order, false);
  }

  private checkoutResponse(order: OrderWithShop, isExisting: boolean) {
    return {
      order: toOrderView(order),
      paymentRequired: !isPaid(order),
      isExisting,
      razorpayConfig: {
        key: getRazorpayPublicKeyId(),
        orderId: order.razorpayOrderId,
        // What the gateway charges: the paid currency and its minor units.
        amount: order.paidAmountMinor ?? order.amount,
        currency: order.paidCurrency || order.currency,
      },
    };
  }

  // -------------------------------------------------------------- payment

  private async takeStock(
    tx: Prisma.TransactionClient,
    product: ProductRow,
    variantRowId: string | null,
    quantity: number
  ): Promise<number> {
    if (variantRowId) {
      const taken = await tx.productVariant.updateMany({
        where: { id: variantRowId, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (taken.count === 1) return 0;
      const row = await tx.productVariant.findUnique({ where: { id: variantRowId }, select: { stock: true } });
      const have = Math.max(row?.stock ?? 0, 0);
      await tx.productVariant.updateMany({ where: { id: variantRowId, stock: { lt: quantity } }, data: { stock: 0 } });
      return quantity - have;
    }
    if (product.stock < 0) return 0; // stock not tracked
    const taken = await tx.product.updateMany({
      where: { id: product.id, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    if (taken.count === 1) return 0;
    const row = await tx.product.findUnique({ where: { id: product.id }, select: { stock: true } });
    const have = Math.max(row?.stock ?? 0, 0);
    await tx.product.updateMany({ where: { id: product.id, stock: { lt: quantity, gte: 0 } }, data: { stock: 0 } });
    return quantity - have;
  }

  /**
   * Everything a paid product order triggers, in the caller's transaction (the one that marked the
   * order paid, holding the order row lock): stock taken with conditional updates (never below
   * zero), one download entitlement per digital line, the coupon use recorded, the saved cart
   * emptied, the website status advanced. Runs once per order (`paidEffectsApplied`).
   *
   * If stock ran out between checkout and payment the order still stands (it is paid) and the
   * shortfall is written on the shop order for the admin.
   */
  public async applyPaidEffects(
    tx: Prisma.TransactionClient,
    orderId: string,
    options: { stockAlreadyTaken?: boolean } = {}
  ): Promise<{ applied: boolean; entitlementIds: string[] }> {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, shopOrder: true, shippingAddress: true } });
    if (!order) throw new NotFoundError('Order not found');
    const productItems = order.items.filter((i) => i.itemType === OrderItemType.PRODUCT);
    if (productItems.length === 0) return { applied: false, entitlementIds: [] };

    let shop = order.shopOrder;
    if (!shop) {
      // Order created before shop orders existed, or by another path: give it its shop row now.
      const physical = productItems.some((i) => i.fulfillmentType === FulfillmentType.PHYSICAL);
      shop = await tx.shopOrder.create({
        data: {
          orderId,
          status: ShopOrderStatus.PAYMENT_PENDING,
          orderType: physical ? 'physical' : 'digital',
          source: 'direct',
          addressId: order.shippingAddressId,
          shippingAddress: order.shippingAddress
            ? (snapshotAddress(order.shippingAddress) as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          itemsTotalPaise: productItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
          shippingPaise: order.shippingAmount ?? 0,
          couponDiscountPaise: order.discountAmount ?? 0,
        },
      });
    }
    if (shop.paidEffectsApplied) return { applied: false, entitlementIds: [] };

    const shortfall: StockShortfall[] = [];
    const entitlementIds: string[] = [];

    for (const item of productItems) {
      const meta = itemMeta(item);
      const product: ProductRow | null = await tx.product.findFirst({
        where: {
          OR: [
            ...(meta.productId ? [{ id: meta.productId }] : []),
            { catalogId: item.catalogId },
            { id: item.catalogId },
            { slug: item.catalogId },
          ],
        },
        include: PRODUCT_INCLUDE,
      });
      if (!product) {
        logger.error({ orderId, orderItemId: item.id }, 'Paid order line refers to a product that no longer exists');
        continue;
      }
      const variant = findVariant(product, meta.variantId ?? null);
      const variantRowId = variant && product.variantRows?.some((r) => r.id === variant.id) ? variant.id : null;

      if (product.requiresShipping) {
        if (options.stockAlreadyTaken) continue;
        const missing = await this.takeStock(tx, product, variantRowId, item.quantity);
        if (missing > 0) shortfall.push({ orderItemId: item.id, productId: product.id, variantId: variantRowId, missing });
        continue;
      }
      if (websiteType(product) !== 'digital') continue; // a service has neither stock nor a file

      const digitalUnits = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "fulfillment_units"
        WHERE "orderItemId" = ${item.id} AND "obligationType" = 'DIGITAL_PRODUCT'::"ObligationType"
        ORDER BY "unitIndex" ASC
        LIMIT 1;
      `;
      const unitId = digitalUnits[0]?.id ?? null;

      const existing = await tx.digitalProductEntitlement.findFirst({
        where: { userId: order.userId, productId: product.id, orderId, variantId: variantRowId },
      });
      if (!existing) {
        // Seeded products without a file fall back to the product image, as before.
        const assetKey = variant?.downloadKey ?? productDownloadKey(product) ?? product.imageUrl;
        const bundle = (product.metadata as { bundleAssets?: Prisma.InputJsonValue } | null)?.bundleAssets;
        const created = await tx.digitalProductEntitlement.create({
          data: {
            userId: order.userId,
            productId: product.id,
            orderId,
            orderItemId: item.id,
            variantId: variantRowId,
            assetName: variant ? `${product.title} (${variant.value})` : product.title,
            fulfillmentUnitId: unitId,
            source: EntitlementSource.PURCHASE,
            status: EntitlementStatus.ACTIVE,
            assetKey,
            bundleAssets: bundle ?? Prisma.JsonNull,
          },
        });
        entitlementIds.push(created.id);
      } else if (!existing.fulfillmentUnitId && unitId) {
        await tx.digitalProductEntitlement.update({ where: { id: existing.id }, data: { fulfillmentUnitId: unitId } });
      }
      if (unitId) await fulfillmentService.reconcileFulfillmentUnit(orderId, unitId, tx);
    }

    await couponsService.redeemForOrder(tx, orderId);
    if (shop.source === 'cart') await cartService.clear(order.userId, tx);

    await tx.shopOrder.update({
      where: { id: shop.id },
      data: {
        paidEffectsApplied: true,
        status: shop.status === ShopOrderStatus.CANCELLED ? shop.status : statusAfterPayment(shop.orderType),
        stockShortfall: shortfall.length ? (shortfall as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
    if (shortfall.length) {
      logger.error({ orderId, shortfall }, 'Paid shop order is short of stock');
    }
    return { applied: true, entitlementIds };
  }

  /** A failed payment: the website status follows and the coupon hold is freed. */
  public async markPaymentFailed(orderId: string): Promise<void> {
    await prisma.shopOrder.updateMany({
      where: { orderId, status: ShopOrderStatus.PAYMENT_PENDING },
      data: { status: ShopOrderStatus.PAYMENT_FAILED },
    });
    await couponsService.releaseForOrder(prisma, orderId);
  }

  // ------------------------------------------------------------- customer

  public async listMine(userId: string) {
    const orders = await prisma.order.findMany({
      where: { userId, shopOrder: { isNot: null } },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(toOrderView);
  }

  public async getMine(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, userId, shopOrder: { isNot: null } }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundError('Order not found');
    return toOrderView(order);
  }

  /**
   * Cancels inside one transaction. No refund is made (owner decision): an unpaid order becomes
   * CANCELLED, a paid one keeps its payment. Stock taken for the order goes back on the shelf.
   */
  private async cancel(orderId: string, cancelledBy: string, ownerId: string | null): Promise<OrderWithShop> {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "orders" WHERE id = ${orderId} FOR UPDATE`;
      const order = await tx.order.findFirst({
        where: { id: orderId, ...(ownerId ? { userId: ownerId } : {}) },
        include: ORDER_INCLUDE,
      });
      if (!order || !order.shopOrder) throw new NotFoundError('Order not found');
      const shop = order.shopOrder;
      if (shop.status === ShopOrderStatus.CANCELLED) throw new ValidationError('Order is already cancelled');
      if (ownerId && !canCustomerCancel(shop.status)) {
        throw new ValidationError(
          shop.status === ShopOrderStatus.DELIVERED
            ? 'Delivered order cannot be cancelled'
            : 'This order has already been shipped and cannot be cancelled'
        );
      }

      const paid = isPaid(order);
      if (ownerId && paid) {
        throw new ValidationError('Paid orders can only be cancelled by staff');
      }
      let stockRestored = shop.stockRestored;
      if (shop.paidEffectsApplied && !shop.stockRestored) {
        const shortfall = Array.isArray(shop.stockShortfall) ? (shop.stockShortfall as unknown as StockShortfall[]) : [];
        for (const item of order.items) {
          if (item.itemType !== OrderItemType.PRODUCT || item.fulfillmentType !== FulfillmentType.PHYSICAL) continue;
          const meta = itemMeta(item);
          const missing = shortfall.find((s) => s.orderItemId === item.id)?.missing ?? 0;
          const giveBack = item.quantity - missing;
          if (giveBack <= 0 || !meta.productId) continue;
          if (meta.variantId) {
            const restored = await tx.productVariant.updateMany({
              where: { id: meta.variantId, productId: meta.productId },
              data: { stock: { increment: giveBack } },
            });
            if (restored.count > 0) continue;
          }
          await tx.product.updateMany({ where: { id: meta.productId, stock: { gte: 0 } }, data: { stock: { increment: giveBack } } });
        }
        stockRestored = true;
      }
      if (!paid) await couponsService.releaseForOrder(tx, orderId);

      await tx.fulfillmentUnit.updateMany({
        where: {
          orderId,
          obligationType: ObligationType.PHYSICAL_PRODUCT,
          status: { in: [FulfillmentUnitStatus.UNFULFILLED, FulfillmentUnitStatus.PROCESSING] },
        },
        data: { status: FulfillmentUnitStatus.CANCELLED, cancelledAt: new Date() },
      });
      const updatedShop = await tx.shopOrder.update({
        where: { id: shop.id },
        data: { status: ShopOrderStatus.CANCELLED, cancelledAt: new Date(), cancelledBy, stockRestored },
      });
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: paid ? order.status : OrderStatus.CANCELLED, fulfillmentStatus: FulfillmentStatus.CANCELLED },
        include: { items: true },
      });
      return { ...updated, shopOrder: updatedShop };
    });
  }

  public async cancelMine(userId: string, orderId: string) {
    // As on the website, a customer's own cancellation sends no message.
    const order = await this.cancel(orderId, `customer:${userId}`, userId);
    return toOrderView(order);
  }

  /**
   * Tells the customer about their order in its current website status. Call it after the payment
   * is verified (client verification and webhook) and after an admin changes the status. Never
   * throws: a messaging problem must not undo an order change.
   */
  public async notifyOrderStatus(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({ where: { id: orderId }, include: ADMIN_ORDER_INCLUDE });
      if (!order || !order.shopOrder) return;
      const shop = order.shopOrder;
      await this.notifier.orderConfirmed({
        orderId: order.id,
        orderStatus: toWebsiteStatus(shop.status),
        customer: {
          userId: order.userId,
          name: order.user?.fullName ?? null,
          email: order.user?.email ?? null,
          phone: order.user?.phoneNumber ?? null,
        },
        items: order.items
          .filter((i) => i.itemType === OrderItemType.PRODUCT)
          .map((i) => ({ name: i.title, quantity: i.quantity, unitPriceMinor: i.unitPrice })),
        subTotalMinor: shop.itemsTotalPaise,
        totalMinor: order.amount,
        shippingMinor: order.shippingAmount ?? 0,
        currency: order.currency,
        orderType: shop.orderType === 'digital' ? 'digital' : 'physical',
      });
    } catch (err) {
      logger.error({ orderId, err }, 'Could not raise the order message');
    }
  }

  // ---------------------------------------------------------------- admin

  private adminListWhere(query: z.infer<typeof adminListOrdersQuerySchema>): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = { shopOrder: { isNot: null } };
    if (query.status) {
      const status = parseWebsiteStatus(query.status);
      if (!status) throw new ValidationError('Invalid order status');
      where.shopOrder = { is: { status } };
    }
    const range = dateRange(query.fromDate, query.toDate);
    if (range) where.createdAt = range;
    if (query.productId) {
      where.items = { some: { metadata: { path: ['productId'], equals: query.productId } } };
    }
    if (query.search) {
      const search = query.search;
      where.OR = [
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { phoneNumber: { contains: search } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { items: { some: { title: { contains: search, mode: 'insensitive' } } } },
        { shopOrder: { is: { shippingAddress: { path: ['phone'], string_contains: search } } } },
        { id: search },
      ];
    }
    return where;
  }

  public async adminList(query: z.infer<typeof adminListOrdersQuerySchema>) {
    const { page, limit, skip } = pageParams(query.page, query.limit, 200);
    const where = this.adminListWhere(query);
    const [orders, totalOrders] = await Promise.all([
      prisma.order.findMany({ where, include: ADMIN_ORDER_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.order.count({ where }),
    ]);
    return {
      orders: orders.map(toOrderView),
      pagination: { totalOrders, currentPage: page, totalPages: Math.ceil(totalOrders / limit), limit },
    };
  }

  public async adminExportCsv(query: z.infer<typeof adminListOrdersQuerySchema>) {
    const where = this.adminListWhere(query);
    const orders = await prisma.order.findMany({
      where,
      include: ADMIN_ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const headers = [
      'Order ID',
      'Customer Name',
      'Email',
      'Phone',
      'Product',
      'Quantity',
      'Item Price',
      'Order Type',
      'Order Status',
      'Payment Status',
      'Currency',
      'Order Total',
      'Date',
    ];

    const escapeCsv = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const lines: string[] = [headers.join(',')];

    for (const order of orders) {
      const customerName = order.user?.fullName || '';
      const email = order.user?.email || '';
      const phone = order.user?.phoneNumber || '';
      const orderType = order.shopOrder?.orderType || 'physical';
      const orderStatus = order.shopOrder ? toWebsiteStatus(order.shopOrder.status) : '';
      const paymentStatus = websitePaymentStatus(order);
      const currency = order.currency || 'INR';
      const orderTotal = (order.amount / 100).toFixed(2);
      const date = order.createdAt.toISOString();

      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          lines.push(
            [
              escapeCsv(order.id),
              escapeCsv(customerName),
              escapeCsv(email),
              escapeCsv(phone),
              escapeCsv(item.title),
              escapeCsv(item.quantity),
              escapeCsv((item.unitPrice / 100).toFixed(2)),
              escapeCsv(orderType),
              escapeCsv(orderStatus),
              escapeCsv(paymentStatus),
              escapeCsv(currency),
              escapeCsv(orderTotal),
              escapeCsv(date),
            ].join(',')
          );
        }
      } else {
        lines.push(
          [
            escapeCsv(order.id),
            escapeCsv(customerName),
            escapeCsv(email),
            escapeCsv(phone),
            escapeCsv(''),
            escapeCsv(0),
            escapeCsv('0.00'),
            escapeCsv(orderType),
            escapeCsv(orderStatus),
            escapeCsv(paymentStatus),
            escapeCsv(currency),
            escapeCsv(orderTotal),
            escapeCsv(date),
          ].join(',')
        );
      }
    }

    return lines.join('\r\n');
  }

  public async adminHistory(orderId: string) {
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { resource: `Order:${orderId}` },
          { details: { contains: orderId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      history: logs.map((l) => ({
        id: l.id,
        action: l.action,
        details: l.details,
        adminEmail: l.adminEmail,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }

  public async adminGet(orderId: string) {
    const order = await prisma.order.findFirst({ where: { id: orderId, shopOrder: { isNot: null } }, include: ADMIN_ORDER_INCLUDE });
    if (!order) throw new NotFoundError('Order not found');
    return { ...toOrderView(order), stockShortfall: order.shopOrder?.stockShortfall ?? null, notes: order.notes };
  }

  public async adminUpdateStatus(orderId: string, input: z.infer<typeof adminUpdateStatusSchema>, actor: AdminActor) {
    const target = parseWebsiteStatus(input.orderStatus);
    if (!target) throw new ValidationError('Invalid order status');
    const current = await prisma.order.findFirst({ where: { id: orderId, shopOrder: { isNot: null } }, include: ORDER_INCLUDE });
    if (!current || !current.shopOrder) throw new NotFoundError('Order not found');

    const from = current.shopOrder.status;
    const check = checkAdminTransition(from, target, isPaid(current));
    if (!check.ok) throw new ValidationError(check.message);

    let result: OrderWithShop;
    if (target === ShopOrderStatus.CANCELLED) {
      result = await this.cancel(orderId, `admin:${actor.id}`, null);
    } else {
      const fulfillment = fulfillmentFor(target);
      result = await prisma.$transaction(async (tx) => {
        const shopOrder = await tx.shopOrder.update({ where: { orderId }, data: { status: target } });
        const order = await tx.order.update({
          where: { id: orderId },
          data: {
            ...(fulfillment ? { fulfillmentStatus: fulfillment } : {}),
            ...(target === ShopOrderStatus.SHIPPED ? { dispatchedAt: new Date() } : {}),
            ...(target === ShopOrderStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
            ...(input.trackingNumber ? { trackingNumber: input.trackingNumber } : {}),
            ...(input.courierPartner ? { courierPartner: input.courierPartner } : {}),
          },
          include: { items: true },
        });
        return { ...order, shopOrder };
      });
    }

    await audit(
      actor,
      'SHOP_ORDER_STATUS_UPDATE',
      `Order:${orderId}`,
      `Order status ${toWebsiteStatus(from)} -> ${toWebsiteStatus(target)}${input.trackingNumber ? `; tracking ${input.trackingNumber}` : ''}`
    );
    await this.notifyOrderStatus(orderId);
    return toOrderView(result);
  }

  /** Website `GET /orders/admin/reports`: counts and revenue of product orders. */
  public async adminReports(now: Date = new Date()) {
    const base: Prisma.OrderWhereInput = { shopOrder: { isNot: null } };
    const paidWhere: Prisma.OrderWhereInput = {
      ...base,
      paymentStatus: { in: [PaymentStatus.CAPTURED, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED] },
    };
    const since = new Date(now.getTime() - 190 * 86_400_000);

    const [totalOrders, byStatus, byType, byPayment, paidOrders, recent] = await Promise.all([
      prisma.order.count({ where: base }),
      prisma.shopOrder.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.shopOrder.groupBy({ by: ['orderType'], _count: { _all: true } }),
      prisma.order.groupBy({ by: ['paymentStatus'], where: base, _count: { _all: true } }),
      prisma.order.findMany({ where: paidWhere, select: { amount: true, paidCurrency: true, paidAmountMinor: true, createdAt: true } }),
      prisma.order.findMany({ where: base, include: ADMIN_ORDER_INCLUDE, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    // `amount` is always the INR value of the sale, so it can be added up. What customers paid in
    // each currency is listed separately and never added across currencies.
    const paidByCurrency = new Map<string, { paidMinor: number; orders: number }>();
    let totalSales = 0;
    for (const order of paidOrders) {
      totalSales += order.amount;
      const currency = order.paidCurrency || 'INR';
      const entry = paidByCurrency.get(currency) ?? { paidMinor: 0, orders: 0 };
      entry.paidMinor += order.paidAmountMinor ?? order.amount;
      entry.orders += 1;
      paidByCurrency.set(currency, entry);
    }
    const buckets = bucketRevenue(paidOrders.filter((o) => o.createdAt >= since), now);

    const paymentStatusCounts = { pending: 0, paid: 0, failed: 0 };
    for (const row of byPayment) {
      const key = websitePaymentStatus({ status: OrderStatus.PENDING, paymentStatus: row.paymentStatus });
      paymentStatusCounts[key] += row._count._all;
    }

    return {
      totalOrders,
      totalSales,
      avgOrderValue: paidOrders.length > 0 ? Math.round(totalSales / paidOrders.length) : 0,
      currency: 'INR',
      paidByCurrency: [...paidByCurrency.entries()].map(([currency, v]) => ({ currency, ...v })),
      statusWiseOrders: byStatus.map((r) => ({ status: toWebsiteStatus(r.status), count: r._count._all })),
      paymentMethodBreakdown: [{ method: 'razorpay', count: totalOrders }],
      paymentStatusBreakdown: Object.entries(paymentStatusCounts).map(([status, count]) => ({ status, count })),
      orderTypeBreakdown: byType.map((r) => ({ orderType: r.orderType, count: r._count._all })),
      dailyRevenue: buckets.daily,
      monthlyRevenue: buckets.monthly,
      recentOrders: recent.map(toOrderView),
    };
  }
}

export const shopOrdersService = new ShopOrdersService();
