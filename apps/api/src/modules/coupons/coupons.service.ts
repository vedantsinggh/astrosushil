import { z } from 'zod';
import { Coupon, Prisma, ShopCouponAudience, ShopCouponDiscountType, ShopCouponRedemptionStatus } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { AdminActor, audit, pageParams } from '../products/shop-http';
import { CouponEvaluation, CouponRuleInput, evaluateCoupon } from './coupon-rules';

/**
 * Coupons (website `coupon` module). Product carts only, as on the website.
 *
 * Amounts: `discount` is a percent (0 to 100) for PERCENTAGE coupons and paise for FLAT ones;
 * `maxDiscountPaise` and `minOrderPaise` are paise.
 */

type Db = Prisma.TransactionClient | typeof prisma;

const couponFields = {
  code: z.string().trim().min(3).max(20),
  description: z.string().trim().max(1000).nullable().optional(),
  type: z.enum(['PERCENTAGE', 'FLAT']),
  discount: z.number().positive(),
  maxDiscountPaise: z.number().int().positive().nullable().optional(),
  minOrderPaise: z.number().int().min(0).optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  validFrom: z.coerce.date().optional(),
  validTill: z.coerce.date(),
  couponType: z.enum(['GLOBAL', 'INDIVIDUAL']),
  assignedUsers: z.array(z.string().uuid()).max(5000).optional(),
  oneTimePerUser: z.boolean().optional(),
  isActive: z.boolean().optional(),
};

export const createCouponSchema = z.object(couponFields);
export const updateCouponSchema = z.object(couponFields).partial();
export const listCouponsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  search: z.string().trim().max(50).optional(),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

type CouponWithAssignments = Coupon & {
  assignments?: Array<{ userId: string; user?: { id: string; fullName: string | null; email: string | null } }>;
};

function storedDiscount(type: 'PERCENTAGE' | 'FLAT', discount: number): number {
  if (type === 'PERCENTAGE') {
    if (discount > 100) throw new ValidationError('A percentage coupon cannot be more than 100');
    return Math.round(discount * 100);
  }
  if (!Number.isInteger(discount)) throw new ValidationError('A flat coupon amount must be a whole number of paise');
  return discount;
}

export function toRuleInput(coupon: Coupon): CouponRuleInput {
  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    maxDiscountPaise: coupon.maxDiscountPaise,
    minOrderPaise: coupon.minOrderPaise,
    usageLimit: coupon.usageLimit,
    validFrom: coupon.validFrom,
    validTill: coupon.validTill,
    audience: coupon.audience,
    oneTimePerUser: coupon.oneTimePerUser,
    isActive: coupon.isActive,
  };
}

export function toAdminCoupon(coupon: CouponWithAssignments) {
  return {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    type: coupon.discountType,
    discount: coupon.discountType === ShopCouponDiscountType.PERCENTAGE ? coupon.discountValue / 100 : coupon.discountValue,
    maxDiscountPaise: coupon.maxDiscountPaise,
    minOrderPaise: coupon.minOrderPaise,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    validFrom: coupon.validFrom,
    validTill: coupon.validTill,
    couponType: coupon.audience,
    assignedUsers: (coupon.assignments ?? []).map((a) => ({
      id: a.userId,
      fullName: a.user?.fullName ?? null,
      email: a.user?.email ?? null,
    })),
    oneTimePerUser: coupon.oneTimePerUser,
    isActive: coupon.isActive,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}

/** What a customer may see of a coupon (website `getFrontendCoupons` projection). */
export function toCustomerCoupon(coupon: Coupon) {
  return {
    code: coupon.code,
    description: coupon.description,
    type: coupon.discountType,
    discount: coupon.discountType === ShopCouponDiscountType.PERCENTAGE ? coupon.discountValue / 100 : coupon.discountValue,
    maxDiscountPaise: coupon.maxDiscountPaise,
    minOrderPaise: coupon.minOrderPaise,
    validTill: coupon.validTill,
  };
}

const ASSIGNMENT_INCLUDE = {
  assignments: { include: { user: { select: { id: true, fullName: true, email: true } } } },
} satisfies Prisma.CouponInclude;

export function couponHoldMinutes(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.SHOP_COUPON_HOLD_MINUTES);
  return Number.isFinite(n) && n >= 1 && n <= 24 * 60 ? Math.trunc(n) : 30;
}

export class CouponsService {
  // ---------------------------------------------------------------- admin

  public async list(query: z.infer<typeof listCouponsQuerySchema>) {
    const { page, limit, skip } = pageParams(query.page, query.limit, 200);
    const where: Prisma.CouponWhereInput = query.search ? { code: { contains: query.search, mode: 'insensitive' } } : {};
    const [rows, total] = await Promise.all([
      prisma.coupon.findMany({ where, include: ASSIGNMENT_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.coupon.count({ where }),
    ]);
    return { coupons: rows.map(toAdminCoupon), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  public async get(id: string) {
    const row = await prisma.coupon.findUnique({ where: { id }, include: ASSIGNMENT_INCLUDE });
    if (!row) throw new NotFoundError('Coupon not found');
    return toAdminCoupon(row);
  }

  private async assertUsersExist(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    const found = await prisma.user.count({ where: { id: { in: userIds } } });
    if (found !== new Set(userIds).size) throw new ValidationError('One or more assigned users do not exist');
  }

  public async create(input: CreateCouponInput, actor: AdminActor) {
    const code = input.code.toUpperCase();
    if (await prisma.coupon.findUnique({ where: { code }, select: { id: true } })) {
      throw new ValidationError('Coupon already exists');
    }
    const assigned = [...new Set(input.assignedUsers ?? [])];
    if (input.couponType === 'INDIVIDUAL' && assigned.length === 0) {
      throw new ValidationError('Assigned users required for individual coupon');
    }
    await this.assertUsersExist(assigned);

    const row = await prisma.coupon.create({
      data: {
        code,
        description: input.description ?? null,
        discountType: input.type,
        discountValue: storedDiscount(input.type, input.discount),
        maxDiscountPaise: input.maxDiscountPaise ?? null,
        minOrderPaise: input.minOrderPaise ?? 0,
        usageLimit: input.usageLimit ?? null,
        validFrom: input.validFrom ?? new Date(),
        validTill: input.validTill,
        audience: input.couponType as ShopCouponAudience,
        oneTimePerUser: input.oneTimePerUser ?? true,
        isActive: input.isActive ?? true,
        assignments: { create: assigned.map((userId) => ({ userId })) },
      },
      include: ASSIGNMENT_INCLUDE,
    });
    await audit(actor, 'COUPON_CREATED', `Coupon:${row.id}`, `Created coupon ${row.code} (${row.discountType}, ${row.audience})`);
    return toAdminCoupon(row);
  }

  public async update(id: string, input: UpdateCouponInput, actor: AdminActor) {
    const existing = await prisma.coupon.findUnique({ where: { id }, include: { assignments: true } });
    if (!existing) throw new NotFoundError('Coupon not found');

    const data: Prisma.CouponUpdateInput = {};
    if (input.code !== undefined) {
      const code = input.code.toUpperCase();
      const clash = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
      if (clash && clash.id !== id) throw new ValidationError('Coupon code already exists');
      data.code = code;
    }
    const type = input.type ?? existing.discountType;
    if (input.type !== undefined) data.discountType = input.type;
    if (input.discount !== undefined) data.discountValue = storedDiscount(type, input.discount);
    else if (input.type !== undefined && input.type !== existing.discountType) {
      throw new ValidationError('Send the discount together with a change of coupon type');
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.maxDiscountPaise !== undefined) data.maxDiscountPaise = input.maxDiscountPaise;
    if (input.minOrderPaise !== undefined) data.minOrderPaise = input.minOrderPaise;
    if (input.usageLimit !== undefined) data.usageLimit = input.usageLimit;
    if (input.validFrom !== undefined) data.validFrom = input.validFrom;
    if (input.validTill !== undefined) data.validTill = input.validTill;
    if (input.oneTimePerUser !== undefined) data.oneTimePerUser = input.oneTimePerUser;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.couponType !== undefined) data.audience = input.couponType as ShopCouponAudience;

    const audience = input.couponType ?? existing.audience;
    const assigned = input.assignedUsers !== undefined ? [...new Set(input.assignedUsers)] : existing.assignments.map((a) => a.userId);
    if (audience === 'INDIVIDUAL' && assigned.length === 0) {
      throw new ValidationError('Assigned users required for individual coupon');
    }
    if (input.assignedUsers !== undefined) await this.assertUsersExist(assigned);

    const row = await prisma.$transaction(async (tx) => {
      if (input.assignedUsers !== undefined) {
        await tx.couponAssignment.deleteMany({ where: { couponId: id, userId: { notIn: assigned } } });
        await tx.couponAssignment.createMany({
          data: assigned.map((userId) => ({ couponId: id, userId })),
          skipDuplicates: true,
        });
      }
      return tx.coupon.update({ where: { id }, data, include: ASSIGNMENT_INCLUDE });
    });
    await audit(actor, 'COUPON_UPDATED', `Coupon:${id}`, `Updated coupon ${row.code}. Fields: ${Object.keys(input).join(', ') || 'none'}`);
    return toAdminCoupon(row);
  }

  public async toggle(id: string, actor: AdminActor) {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Coupon not found');
    const row = await prisma.coupon.update({ where: { id }, data: { isActive: !existing.isActive } });
    await audit(actor, 'COUPON_TOGGLED', `Coupon:${id}`, `Coupon ${row.code} ${row.isActive ? 'enabled' : 'disabled'}`);
    return { id: row.id, isActive: row.isActive };
  }

  /**
   * Delete. A coupon that has been used on an order is kept, switched off (its uses are part of
   * the order history); an unused one is removed, as on the website.
   */
  public async remove(id: string, actor: AdminActor): Promise<{ deleted: boolean; deactivated: boolean }> {
    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Coupon not found');
    const uses = await prisma.couponRedemption.count({ where: { couponId: id } });
    if (uses > 0) {
      await prisma.coupon.update({ where: { id }, data: { isActive: false } });
      await audit(actor, 'COUPON_DEACTIVATED', `Coupon:${id}`, `Coupon ${existing.code} has ${uses} recorded use(s): switched off instead of deleted`);
      return { deleted: false, deactivated: true };
    }
    await prisma.coupon.delete({ where: { id } });
    await audit(actor, 'COUPON_DELETED', `Coupon:${id}`, `Deleted coupon ${existing.code}`);
    return { deleted: true, deactivated: false };
  }

  // ------------------------------------------------------------- customer

  /** Coupons a customer can use now: active, in their validity window, global or assigned to them. */
  public async listForCustomer(userId: string, now: Date = new Date()) {
    const rows = await prisma.coupon.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validTill: { gte: now },
        OR: [
          { audience: ShopCouponAudience.GLOBAL },
          { audience: ShopCouponAudience.INDIVIDUAL, assignments: { some: { userId } } },
        ],
      },
      orderBy: { validTill: 'asc' },
    });
    return rows.map(toCustomerCoupon);
  }

  /**
   * Checks a coupon for a customer and cart value. Reads only: it is used when a coupon is applied
   * and whenever the cart is shown. `ignoreOrderId` leaves that order's own hold out of the counts.
   */
  public async evaluate(
    db: Db,
    params: { code: string; userId: string; itemsTotalPaise: number; now?: Date; ignoreOrderId?: string }
  ): Promise<{ coupon: Coupon | null; result: CouponEvaluation }> {
    const now = params.now ?? new Date();
    const coupon = await db.coupon.findUnique({ where: { code: params.code.toUpperCase() } });
    if (!coupon) {
      return { coupon: null, result: { ok: false, reason: 'COUPON_INACTIVE', message: 'Invalid coupon' } };
    }
    const counted: Prisma.CouponRedemptionWhereInput = {
      couponId: coupon.id,
      ...(params.ignoreOrderId ? { NOT: { orderId: params.ignoreOrderId } } : {}),
    };
    const liveHold: Prisma.CouponRedemptionWhereInput = {
      status: ShopCouponRedemptionStatus.RESERVED,
      reservedUntil: { gt: now },
    };
    const [redeemed, held, userUses, assignment] = await Promise.all([
      db.couponRedemption.count({ where: { ...counted, status: ShopCouponRedemptionStatus.REDEEMED } }),
      db.couponRedemption.count({ where: { ...counted, ...liveHold } }),
      db.couponRedemption.count({
        where: { ...counted, userId: params.userId, OR: [{ status: ShopCouponRedemptionStatus.REDEEMED }, liveHold] },
      }),
      coupon.audience === ShopCouponAudience.INDIVIDUAL
        ? db.couponAssignment.findUnique({ where: { couponId_userId: { couponId: coupon.id, userId: params.userId } } })
        : Promise.resolve(null),
    ]);
    const result = evaluateCoupon(toRuleInput(coupon), {
      now,
      itemsTotalPaise: params.itemsTotalPaise,
      isAssigned: Boolean(assignment),
      // `usedCount` carries the website's historic count for migrated coupons.
      activeUses: Math.max(coupon.usedCount, redeemed) + held,
      userUses,
    });
    return { coupon, result };
  }

  // ------------------------------------------------------ order lifecycle

  /**
   * Takes a hold on the coupon for an order that is about to be paid. Must run inside the
   * transaction that creates the order. The coupon row is locked first, so two checkouts cannot
   * both take the last use; the rules are checked again under the lock.
   */
  public async reserveForOrder(
    tx: Prisma.TransactionClient,
    params: { code: string; userId: string; itemsTotalPaise: number; orderId: string; expectedDiscountPaise: number; now?: Date }
  ): Promise<string[]> {
    const now = params.now ?? new Date();
    const code = params.code.toUpperCase();
    const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "coupons" WHERE code = ${code} FOR UPDATE`;
    if (!locked.length) throw new AppError('This coupon is no longer valid', 409, 'COUPON_NO_LONGER_VALID');

    // A customer who starts checkout again replaces their own earlier hold instead of being told
    // the coupon is "already used". The caller cancels the unpaid orders those holds belonged to.
    const ownHolds = await tx.couponRedemption.findMany({
      where: { couponId: locked[0].id, userId: params.userId, status: ShopCouponRedemptionStatus.RESERVED },
      select: { id: true, orderId: true },
    });
    if (ownHolds.length > 0) {
      await tx.couponRedemption.updateMany({
        where: { id: { in: ownHolds.map((h) => h.id) } },
        data: { status: ShopCouponRedemptionStatus.RELEASED, reservedUntil: null },
      });
    }
    const superseded = ownHolds.map((h) => h.orderId).filter((id): id is string => Boolean(id));

    const { coupon, result } = await this.evaluate(tx, { code, userId: params.userId, itemsTotalPaise: params.itemsTotalPaise, now });
    if (!coupon || !result.ok) {
      throw new AppError(result.ok ? 'This coupon is no longer valid' : result.message, 409, 'COUPON_NO_LONGER_VALID');
    }
    if (result.discountPaise !== params.expectedDiscountPaise) {
      throw new ConflictError('The coupon discount changed. Please review your cart and try again.');
    }
    await tx.couponRedemption.create({
      data: {
        couponId: coupon.id,
        userId: params.userId,
        orderId: params.orderId,
        status: ShopCouponRedemptionStatus.RESERVED,
        discountPaise: result.discountPaise,
        reservedUntil: new Date(now.getTime() + couponHoldMinutes() * 60_000),
      },
    });
    return superseded;
  }

  /**
   * Records the coupon as used, in the transaction that marks the order paid. Idempotent.
   * A hold that lapsed before a late payment is still honoured (the customer paid the discounted
   * amount); that is the one case where a limit can be exceeded, and it is logged.
   */
  public async redeemForOrder(tx: Prisma.TransactionClient, orderId: string, now: Date = new Date()): Promise<void> {
    const redemption = await tx.couponRedemption.findUnique({ where: { orderId } });
    if (!redemption || redemption.status === ShopCouponRedemptionStatus.REDEEMED) return;
    const lapsed =
      redemption.status === ShopCouponRedemptionStatus.RELEASED ||
      (redemption.reservedUntil !== null && redemption.reservedUntil.getTime() < now.getTime());
    const flipped = await tx.couponRedemption.updateMany({
      where: { id: redemption.id, status: { not: ShopCouponRedemptionStatus.REDEEMED } },
      data: { status: ShopCouponRedemptionStatus.REDEEMED, usedAt: now, reservedUntil: null },
    });
    if (flipped.count === 0) return;
    await tx.coupon.update({ where: { id: redemption.couponId }, data: { usedCount: { increment: 1 } } });
    if (lapsed) {
      logger.warn({ orderId, couponId: redemption.couponId }, 'Coupon hold had lapsed when the order was paid; use recorded anyway');
    }
  }

  /** Frees the hold of an order that was cancelled or failed before payment. A redeemed use stays. */
  public async releaseForOrder(db: Db, orderId: string): Promise<void> {
    await db.couponRedemption.updateMany({
      where: { orderId, status: ShopCouponRedemptionStatus.RESERVED },
      data: { status: ShopCouponRedemptionStatus.RELEASED, reservedUntil: null },
    });
  }
}

export const couponsService = new CouponsService();
