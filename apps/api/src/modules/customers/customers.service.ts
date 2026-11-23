import { z } from 'zod';
import { BookingStatus, EntitlementStatus, PaymentStatus, Prisma, Role, SlotStatus } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { adminService } from '../admin/admin.service';
import { NotFoundError, ValidationError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { normalizePhoneNumber } from '../../utils/phone';
import { AdminActor, audit, dateRange, forgetCustomerBlockState, pageParams } from '../products/shop-http';

/**
 * Customers admin (the website's Customers page: `GET/PATCH/DELETE /auth`).
 *
 * Status ACTIVE / BLOCKED is not a second mechanism: BLOCKED is this backend's suspension, i.e. the
 * latest USER_SUSPENDED / USER_ACTIVATED / USER_ACCOUNT_DELETED audit entry for the user
 * (`featureAccessService.isUserSuspended`), written through `adminService.suspendUser` /
 * `activateUser`, which also revoke the customer's refresh tokens.
 */

const STATUS_ACTIONS = ['USER_SUSPENDED', 'USER_ACTIVATED', 'USER_ACCOUNT_DELETED'];
/** Payment states that mean money changed hands: such orders are financial records. */
const FINANCIAL_PAYMENT_STATES: PaymentStatus[] = [
  PaymentStatus.AUTHORIZED,
  PaymentStatus.CAPTURED,
  PaymentStatus.REFUNDED,
  PaymentStatus.PARTIALLY_REFUNDED,
];

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  search: z.string().trim().max(200).optional(),
  fromDate: z.string().trim().max(40).optional(),
  toDate: z.string().trim().max(40).optional(),
  status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
});

export const updateCustomerSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  email: z.string().trim().max(254).optional(),
  phoneNumber: z.string().trim().max(20).optional(),
  username: z.string().trim().max(60).optional(),
  dob: z.string().trim().max(40).optional(),
  gender: z.string().trim().max(40).optional(),
  birthPlace: z.string().trim().max(200).optional(),
  birthTime: z.string().trim().max(40).optional(),
  bio: z.string().trim().max(2000).optional(),
  status: z.enum(['ACTIVE', 'BLOCKED']).optional(),
  /** Why the customer is being blocked (kept in the audit log). */
  reason: z.string().trim().min(3).max(500).optional(),
});

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

const CUSTOMER_SELECT = {
  id: true,
  email: true,
  phoneNumber: true,
  fullName: true,
  phoneVerifiedAt: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
  customerProfile: true,
} satisfies Prisma.UserSelect;

type CustomerRow = Prisma.UserGetPayload<{ select: typeof CUSTOMER_SELECT }>;

/** "Asha Rani Verma" -> first "Asha", last "Rani Verma" (the website stores the two separately). */
export function splitName(fullName: string | null): { firstName: string; lastName: string } {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

export function toCustomerView(row: CustomerRow, blocked: boolean) {
  const profile = row.customerProfile;
  const name = splitName(row.fullName);
  return {
    id: row.id,
    firstName: profile?.firstName ?? name.firstName,
    lastName: profile?.lastName ?? name.lastName,
    fullName: row.fullName,
    username: profile?.username ?? null,
    email: row.email,
    phoneNumber: row.phoneNumber,
    dob: profile?.dob ?? null,
    gender: profile?.gender ?? null,
    birthPlace: profile?.birthPlace ?? null,
    birthTime: profile?.birthTime ?? null,
    bio: profile?.bio ?? null,
    profilePhoto: profile?.profilePhoto ?? null,
    isVerified: Boolean(row.phoneVerifiedAt || row.emailVerifiedAt),
    status: blocked ? 'BLOCKED' : 'ACTIVE',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export type CustomerView = ReturnType<typeof toCustomerView>;

const CSV_COLUMNS: Array<{ header: string; value: (c: CustomerView) => string }> = [
  { header: 'First Name', value: (c) => c.firstName },
  { header: 'Last Name', value: (c) => c.lastName },
  { header: 'Email', value: (c) => c.email ?? '' },
  { header: 'Phone', value: (c) => c.phoneNumber ?? '' },
  { header: 'Username', value: (c) => c.username ?? '' },
  { header: 'Date of Birth', value: (c) => c.dob ?? '' },
  { header: 'Gender', value: (c) => c.gender ?? '' },
  { header: 'Birth Place', value: (c) => c.birthPlace ?? '' },
  { header: 'Birth Time', value: (c) => c.birthTime ?? '' },
  { header: 'Status', value: (c) => c.status },
  { header: 'Joined', value: (c) => c.createdAt.toISOString() },
];

/** One CSV cell. A value a spreadsheet would run as a formula is made inert. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function customersToCsv(customers: CustomerView[]): string {
  const lines = [CSV_COLUMNS.map((c) => csvCell(c.header)).join(',')];
  for (const customer of customers) {
    lines.push(CSV_COLUMNS.map((c) => csvCell(c.value(customer))).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

export class CustomersService {
  /** Which of these users are blocked now: the latest status entry per user decides. */
  private async blockedIds(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const logs = await prisma.auditLog.findMany({
      where: { resource: { in: userIds.map((id) => `User:${id}`) }, action: { in: STATUS_ACTIONS } },
      orderBy: { createdAt: 'desc' },
      select: { resource: true, action: true },
    });
    const latest = new Map<string, string>();
    for (const log of logs) {
      if (log.resource && !latest.has(log.resource)) latest.set(log.resource, log.action);
    }
    const blocked = new Set<string>();
    for (const [resource, action] of latest) {
      if (action !== 'USER_ACTIVATED') blocked.add(resource.slice('User:'.length));
    }
    return blocked;
  }

  private where(query: ListCustomersQuery): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = { role: Role.USER };
    if (query.search) {
      const search = query.search;
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { customerProfile: { is: { username: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    const range = dateRange(query.fromDate, query.toDate);
    if (range) where.createdAt = range;
    return where;
  }

  public async list(query: ListCustomersQuery) {
    const { page, limit, skip } = pageParams(query.page, query.limit, 1000);
    const where = this.where(query);
    const [rows, total] = await Promise.all([
      prisma.user.findMany({ where, select: CUSTOMER_SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.user.count({ where }),
    ]);
    const blocked = await this.blockedIds(rows.map((r) => r.id));
    let users = rows.map((row) => toCustomerView(row, blocked.has(row.id)));
    // Status lives in the audit log, so this filter applies to the page that was read.
    if (query.status) users = users.filter((u) => u.status === query.status);
    return { users, total, page, limit };
  }

  /** The filtered customers as CSV (the website builds the same file in the browser). */
  public async exportCsv(query: ListCustomersQuery, actor: AdminActor): Promise<string> {
    const where = this.where(query);
    const rows = await prisma.user.findMany({ where, select: CUSTOMER_SELECT, orderBy: { createdAt: 'desc' }, take: 20000 });
    const blocked = await this.blockedIds(rows.map((r) => r.id));
    let users = rows.map((row) => toCustomerView(row, blocked.has(row.id)));
    if (query.status) users = users.filter((u) => u.status === query.status);
    await audit(actor, 'CUSTOMERS_EXPORTED', 'Customers', `Exported ${users.length} customer(s) as CSV`);
    return customersToCsv(users);
  }

  private async loadCustomer(id: string): Promise<CustomerRow> {
    const row = await prisma.user.findFirst({ where: { id, role: Role.USER }, select: CUSTOMER_SELECT });
    if (!row) throw new NotFoundError('User not found');
    return row;
  }

  public async get(id: string): Promise<CustomerView> {
    const row = await this.loadCustomer(id);
    return toCustomerView(row, (await this.blockedIds([id])).has(id));
  }

  /**
   * Edit profile fields and status. As on the website, an empty string means "leave unchanged".
   * Only customers can be edited here; staff accounts are managed on the Staff page.
   */
  public async update(id: string, input: UpdateCustomerInput, actor: AdminActor): Promise<CustomerView> {
    const existing = await this.loadCustomer(id);
    const given = <T extends string | undefined>(value: T): value is Exclude<T, undefined | ''> => value !== undefined && value !== '';

    const userData: Prisma.UserUpdateInput = {};
    const profileData: Prisma.CustomerProfileUncheckedUpdateInput = {};
    const changed: string[] = [];

    if (given(input.email)) {
      const email = input.email.toLowerCase();
      if (!z.string().email().safeParse(email).success) throw new ValidationError('Enter a valid email address');
      if (email !== existing.email) {
        const clash = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (clash && clash.id !== id) throw new ValidationError('Email already in use');
        userData.email = email;
        userData.emailVerifiedAt = null;
        changed.push('email');
      }
    }
    if (given(input.phoneNumber)) {
      const phone = normalizePhoneNumber(input.phoneNumber);
      if (phone !== existing.phoneNumber) {
        const clash = await prisma.user.findUnique({ where: { phoneNumber: phone }, select: { id: true } });
        if (clash && clash.id !== id) throw new ValidationError('Phone number already in use');
        userData.phoneNumber = phone;
        userData.phoneVerifiedAt = null;
        changed.push('phoneNumber');
      }
    }
    if (given(input.username) && input.username !== existing.customerProfile?.username) {
      const clash = await prisma.customerProfile.findUnique({ where: { username: input.username }, select: { userId: true } });
      if (clash && clash.userId !== id) throw new ValidationError('Username already taken');
      profileData.username = input.username;
      changed.push('username');
    }
    if (given(input.firstName) || given(input.lastName)) {
      const current = splitName(existing.fullName);
      const firstName = given(input.firstName) ? input.firstName : existing.customerProfile?.firstName ?? current.firstName;
      const lastName = given(input.lastName) ? input.lastName : existing.customerProfile?.lastName ?? current.lastName;
      profileData.firstName = firstName;
      profileData.lastName = lastName;
      userData.fullName = `${firstName} ${lastName}`.trim();
      changed.push('name');
    }
    for (const key of ['dob', 'gender', 'birthPlace', 'birthTime', 'bio'] as const) {
      const value = input[key];
      if (given(value)) {
        profileData[key] = value;
        changed.push(key);
      }
    }

    if (Object.keys(userData).length > 0 || Object.keys(profileData).length > 0) {
      await prisma.$transaction(async (tx) => {
        if (Object.keys(userData).length > 0) await tx.user.update({ where: { id }, data: userData });
        if (Object.keys(profileData).length > 0) {
          await tx.customerProfile.upsert({
            where: { userId: id },
            update: profileData,
            create: { ...(profileData as Omit<Prisma.CustomerProfileUncheckedCreateInput, 'userId'>), userId: id },
          });
        }
      });
      // Field names only: personal data is not copied into the audit log.
      await audit(actor, 'CUSTOMER_UPDATED', `User:${id}`, `Updated customer fields: ${changed.join(', ')}`);
    }

    if (input.status) {
      const blockedNow = (await this.blockedIds([id])).has(id);
      const admin = { id: actor.id, email: actor.email, role: 'ADMIN' };
      const meta = { ipAddress: actor.ipAddress, userAgent: actor.userAgent };
      if (input.status === 'BLOCKED' && !blockedNow) {
        await adminService.suspendUser(id, { reason: input.reason ?? 'Blocked from the Customers page' }, admin, meta);
      } else if (input.status === 'ACTIVE' && blockedNow) {
        await adminService.activateUser(id, { reason: input.reason }, admin, meta);
      }
      forgetCustomerBlockState(id);
    }

    return this.get(id);
  }

  /**
   * Delete a customer (owner decision: works as on the website, where the user document is removed).
   *
   * A database row that money depends on cannot simply vanish, so there are two outcomes:
   *
   *  - The customer never paid for anything: the account and everything attached to it is removed
   *    ("hard": user row gone).
   *  - The customer has paid orders: every piece of personal data is removed (profile, birth
   *    profiles, reports, addresses, cart, wishlist, tokens, notifications, contact details on
   *    bookings) and the login is destroyed, but the user row stays as an anonymous "Deleted User"
   *    so paid orders, bookings, invoices and ledger rows still add up ("anonymised"). The
   *    shipping address copied onto a paid order is kept, as an invoice record needs it.
   *
   * Either way the action is audited and the account can never log in again.
   */
  public async remove(id: string, actor: AdminActor): Promise<{ deleted: true; mode: 'hard' | 'anonymised'; paidOrders: number }> {
    const existing = await this.loadCustomer(id);
    const paidOrders = await prisma.order.count({ where: { userId: id, paymentStatus: { in: FINANCIAL_PAYMENT_STATES } } });
    const now = new Date();

    if (paidOrders === 0) {
      await prisma.$transaction(async (tx) => {
        const orders = await tx.order.findMany({ where: { userId: id }, select: { id: true } });
        const orderIds = orders.map((o) => o.id);
        if (orderIds.length > 0) {
          // Unpaid orders only (checked above). Their dependants that do not cascade go first.
          await tx.couponRedemption.deleteMany({ where: { orderId: { in: orderIds } } });
          await tx.shopOrder.deleteMany({ where: { orderId: { in: orderIds } } });
          await tx.fulfillmentUnit.deleteMany({ where: { orderId: { in: orderIds } } });
        }
        await tx.appointmentSlot.updateMany({
          where: { booking: { userId: id } },
          data: { status: SlotStatus.AVAILABLE, bookingId: null, lockedUntil: null },
        });
        await tx.user.delete({ where: { id } });
        await tx.auditLog.create({
          data: {
            adminId: actor.id,
            adminEmail: actor.email,
            action: 'USER_ACCOUNT_DELETED',
            resource: `User:${id}`,
            details: JSON.stringify({ event: 'ADMIN_CUSTOMER_DELETION', mode: 'hard', deletedAt: now.toISOString() }),
            ipAddress: actor.ipAddress ?? null,
            userAgent: actor.userAgent ?? null,
          },
        });
      });
      forgetCustomerBlockState(id);
      logger.info({ userId: id, mode: 'hard' }, 'Customer deleted by admin');
      return { deleted: true, mode: 'hard', paidOrders: 0 };
    }

    await prisma.$transaction(async (tx) => {
      const activeBookings = await tx.consultationBooking.findMany({
        where: { userId: id, status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED] } },
        select: { id: true },
      });
      for (const booking of activeBookings) {
        await tx.consultationBooking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CANCELLED, cancellationReason: 'USER_ACCOUNT_DELETED', cancelledAt: now },
        });
        await tx.appointmentSlot.updateMany({
          where: { bookingId: booking.id },
          data: { status: SlotStatus.AVAILABLE, bookingId: null, lockedUntil: null },
        });
      }
      await tx.consultationBooking.updateMany({
        where: { userId: id },
        data: { customerName: 'Deleted User', customerPhone: null, customerEmail: null, primaryQuestion: null },
      });
      await tx.birthProfile.deleteMany({ where: { userId: id } });
      await tx.report.deleteMany({ where: { userId: id } });
      await tx.courseEntitlement.updateMany({ where: { userId: id, status: EntitlementStatus.ACTIVE }, data: { status: EntitlementStatus.REVOKED } });
      await tx.lessonProgress.deleteMany({ where: { userId: id } });
      await tx.digitalProductEntitlement.updateMany({ where: { userId: id, status: EntitlementStatus.ACTIVE }, data: { status: EntitlementStatus.REVOKED } });
      await tx.shippingAddress.deleteMany({ where: { userId: id } });
      await tx.cart.deleteMany({ where: { userId: id } });
      await tx.wishlistItem.deleteMany({ where: { userId: id } });
      await tx.couponAssignment.deleteMany({ where: { userId: id } });
      await tx.customerProfile.deleteMany({ where: { userId: id } });
      await tx.order.updateMany({ where: { userId: id }, data: { notes: null } });
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      await tx.deviceToken.deleteMany({ where: { userId: id } });
      await tx.otpVerification.deleteMany({ where: { userId: id } });
      await tx.notificationPreference.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.user.update({
        where: { id },
        data: {
          email: null,
          phoneNumber: null,
          fullName: 'Deleted User',
          googleId: null,
          passwordHash: null,
          phoneVerifiedAt: null,
          emailVerifiedAt: null,
        },
      });
      await tx.auditLog.create({
        data: {
          adminId: actor.id,
          adminEmail: actor.email,
          action: 'USER_ACCOUNT_DELETED',
          resource: `User:${id}`,
          details: JSON.stringify({
            event: 'ADMIN_CUSTOMER_DELETION',
            mode: 'anonymised',
            deletedAt: now.toISOString(),
            paidOrdersRetained: paidOrders,
          }),
          ipAddress: actor.ipAddress ?? null,
          userAgent: actor.userAgent ?? null,
        },
      });
    });
    forgetCustomerBlockState(id);
    logger.info({ userId: existing.id, mode: 'anonymised', paidOrders }, 'Customer deleted by admin; financial records kept');
    return { deleted: true, mode: 'anonymised', paidOrders };
  }
}

export const customersService = new CustomersService();
