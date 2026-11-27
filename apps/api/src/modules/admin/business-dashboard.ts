/**
 * Business dashboard (website admin `GET /settings/dashboard`, owner decision 2026-11-26: every
 * function of the website admin). Revenue is the INR value of successful sales in the ledger
 * (`payment_transactions.baseAmountPaise`), counted in Indian calendar months.
 *
 *   GET /api/v1/admin/dashboard/business   permission dashboard:read
 *
 * Besides the website's figures it lists what needs staff attention (today's bookings, payment
 * conflicts, invoices still being numbered, new inquiries), so the first screen is a work list.
 */
import { FastifyInstance } from 'fastify';
import { BookingStatus, InvoiceAllocationStatus, PaymentStatus, LedgerTransactionStatus, LedgerTransactionType, OrderItemType } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { checkPermission } from './rbac/check-permission';
import { financialYearOf } from '../invoices/gst-split';

const IST_MS = 330 * 60_000;

/** "2026-11" of an instant in Indian time. */
export function istMonthKey(instant: Date): string {
  const ist = new Date(instant.getTime() + IST_MS);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** First instant of the Indian calendar month `offset` months from the one containing `now`. */
export function istMonthStart(now: Date, offset = 0): Date {
  const ist = new Date(now.getTime() + IST_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() + offset, 1) - IST_MS);
}

export function istDay(now: Date, offsetDays = 0): string {
  return new Date(now.getTime() + IST_MS + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

/** Percentage change, one decimal; 100 when growing from zero, 0 when both are zero. */
export function growth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

type SaleKind = 'order' | 'consultation' | 'report';
const KIND: Record<LedgerTransactionType, SaleKind> = {
  [LedgerTransactionType.ORDER]: 'order',
  [LedgerTransactionType.CONSULTATION]: 'consultation',
  [LedgerTransactionType.REPORT]: 'report',
};

export interface MonthPoint {
  month: string;
  revenuePaise: number;
  order: number;
  consultation: number;
  report: number;
}

export async function businessDashboard(now: Date = new Date()) {
  const thisMonth = istMonthStart(now, 0);
  const lastMonth = istMonthStart(now, -1);
  const yearAgo = istMonthStart(now, -11);
  const success = LedgerTransactionStatus.SUCCESS;

  const [allTime, recentRows, newUsersThis, newUsersLast, totalCustomers, latest, topItems, bookingsToday, bookingsWeek, conflicts, pendingInvoices, inquiriesWeek, yearlyRows] =
    await Promise.all([
      prisma.paymentTransaction.groupBy({ by: ['type'], where: { status: success }, _sum: { baseAmountPaise: true }, _count: { _all: true } }),
      prisma.paymentTransaction.findMany({
        where: { status: success, createdAt: { gte: yearAgo } },
        select: { type: true, baseAmountPaise: true, createdAt: true },
      }),
      prisma.user.count({ where: { role: 'USER', createdAt: { gte: thisMonth } } }),
      prisma.user.count({ where: { role: 'USER', createdAt: { gte: lastMonth, lt: thisMonth } } }),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.paymentTransaction.findMany({
        where: { status: success },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, orderId: true, userId: true, type: true, baseAmountPaise: true, currency: true, amountMinor: true, customerName: true, createdAt: true },
      }),
      prisma.orderItem.groupBy({
        by: ['catalogId', 'title'],
        where: { itemType: OrderItemType.PRODUCT, order: { paymentStatus: PaymentStatus.CAPTURED } },
        _sum: { quantity: true, totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
      prisma.consultationBooking.count({ where: { date: istDay(now), status: { in: [BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED] } } }),
      prisma.consultationBooking.count({
        where: { date: { gte: istDay(now), lte: istDay(now, 6) }, status: { in: [BookingStatus.CONFIRMED, BookingStatus.RESCHEDULED] } },
      }),
      // Same rule as BookingsService.isPaymentConflict: paid, but the booking lost its slot.
      prisma.consultationBooking.count({
        where: { deletedAt: null, status: { in: [BookingStatus.CANCELLED, BookingStatus.PENDING_PAYMENT] }, order: { paymentStatus: PaymentStatus.CAPTURED } },
      }),
      prisma.invoice.count({ where: { status: InvoiceAllocationStatus.PENDING } }),
      prisma.contactInquiry.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
      prisma.paymentTransaction.findMany({ where: { status: success }, select: { baseAmountPaise: true, createdAt: true } }),
    ]);

  const buyers = await prisma.user.findMany({
    where: { id: { in: [...new Set(latest.map((row) => row.userId))] } },
    select: { id: true, fullName: true, phoneNumber: true, email: true },
  });
  const buyerName = new Map(buyers.map((u) => [u.id, u.fullName || u.phoneNumber || u.email || null]));

  const months: MonthPoint[] = [];
  for (let i = -11; i <= 0; i++) {
    months.push({ month: istMonthKey(istMonthStart(now, i)), revenuePaise: 0, order: 0, consultation: 0, report: 0 });
  }
  const byMonth = new Map(months.map((m) => [m.month, m]));
  for (const row of recentRows) {
    const point = byMonth.get(istMonthKey(row.createdAt));
    if (!point) continue;
    point.revenuePaise += row.baseAmountPaise;
    point[KIND[row.type]] += 1;
  }
  const current = months[months.length - 1];
  const previous = months[months.length - 2];

  const yearly = new Map<string, number>();
  for (const row of yearlyRows) {
    const fy = financialYearOf(row.createdAt);
    yearly.set(fy, (yearly.get(fy) ?? 0) + row.baseAmountPaise);
  }

  const totals = { order: 0, consultation: 0, report: 0 };
  let totalRevenuePaise = 0;
  for (const group of allTime) {
    totals[KIND[group.type]] = group._count._all;
    totalRevenuePaise += group._sum.baseAmountPaise ?? 0;
  }

  const kindBlock = (kind: SaleKind) => ({
    thisMonth: current[kind],
    lastMonth: previous[kind],
    total: totals[kind],
    growth: growth(current[kind], previous[kind]),
  });

  return {
    generatedAt: now.toISOString(),
    revenue: {
      totalPaise: totalRevenuePaise,
      thisMonthPaise: current.revenuePaise,
      lastMonthPaise: previous.revenuePaise,
      growth: growth(current.revenuePaise, previous.revenuePaise),
    },
    orders: kindBlock('order'),
    bookings: kindBlock('consultation'),
    reportOrders: kindBlock('report'),
    customers: { total: totalCustomers, newThisMonth: newUsersThis, newLastMonth: newUsersLast, growth: growth(newUsersThis, newUsersLast) },
    monthly: months,
    yearly: [...yearly.entries()].map(([financialYear, revenuePaise]) => ({ financialYear, revenuePaise })).sort((a, b) => a.financialYear.localeCompare(b.financialYear)),
    topProducts: topItems.map((item) => ({
      catalogId: item.catalogId,
      title: item.title,
      quantity: item._sum.quantity ?? 0,
      revenuePaise: item._sum.totalAmount ?? 0,
    })),
    recentSales: latest.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      type: KIND[row.type],
      customerName: row.customerName || buyerName.get(row.userId) || null,
      amountPaise: row.baseAmountPaise,
      currency: row.currency,
      amountMinor: row.amountMinor,
      createdAt: row.createdAt.toISOString(),
    })),
    attention: {
      bookingsToday,
      bookingsNext7Days: bookingsWeek,
      paymentConflicts: conflicts,
      invoicesPending: pendingInvoices,
      inquiriesLast7Days: inquiriesWeek,
    },
  };
}

export async function businessDashboardRoutes(fastify: FastifyInstance) {
  fastify.register(async (scope) => {
    scope.addHook('onRequest', fastify.authenticate);
    scope.get('/admin/dashboard/business', {
      schema: { tags: ['Admin Dashboard'], summary: 'Revenue, sales, customers and the work list', security: [{ bearerAuth: [] }] },
      preHandler: [checkPermission('dashboard:read')],
      handler: async (_request, reply) => reply.status(200).send(await businessDashboard()),
    });
  });
}
