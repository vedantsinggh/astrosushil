import { LedgerTransactionStatus, LedgerTransactionType, PaymentTransaction, Prisma, SalePaymentMethod } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { logger } from '../../utils/logger';
import { getSellerDetails } from '../invoices/seller';
import { invoiceLabel } from '../invoices/invoice-number';
import { AttemptOptions, LedgerOrder, buildAttemptData, sanitizeGatewayPayload } from './ledger';
import { GstReportRow, GstReportSummary, GstSourceRecord, buildGstRow, gstRowsToCsv, refundStateFor, summariseGstRows, summariseRefunds } from './gst-report';
import { formatDateIst, istDayBoundary, paiseToRupeeText, toCsv } from './csv';
import { formatMinor } from '../commerce/money/currency';
import type { GstReportQuery, TransactionsQuery } from './transactions.schemas';

type Tx = Prisma.TransactionClient;

export interface GatewayPaymentInfo {
  gatewayPaymentId?: string | null;
  gatewayOrderId?: string | null;
  /** Raw gateway payment entity; only allow-listed fields are stored. */
  raw?: unknown;
}

const STATUS_BY_QUERY: Record<string, LedgerTransactionStatus> = {
  pending: LedgerTransactionStatus.PENDING,
  success: LedgerTransactionStatus.SUCCESS,
  failed: LedgerTransactionStatus.FAILED,
};
const METHOD_BY_QUERY: Record<string, SalePaymentMethod> = {
  razorpay: SalePaymentMethod.RAZORPAY,
  manual: SalePaymentMethod.MANUAL,
  cod: SalePaymentMethod.COD,
};
const TYPE_BY_QUERY: Record<string, LedgerTransactionType> = {
  order: LedgerTransactionType.ORDER,
  consultation: LedgerTransactionType.CONSULTATION,
  report: LedgerTransactionType.REPORT,
};

function dateRange(fromDate?: string, toDate?: string): Prisma.DateTimeFilter | undefined {
  if (!fromDate && !toDate) return undefined;
  return {
    ...(fromDate ? { gte: istDayBoundary(fromDate, 'start') } : {}),
    ...(toDate ? { lte: istDayBoundary(toDate, 'end') } : {}),
  };
}

export class TransactionsService {
  /**
   * Writes the PENDING ledger row for a payment attempt. Call it in the transaction that creates the
   * order, for every order that will be paid. One row per order: a repeat call returns the row
   * already there.
   */
  public async recordAttempt(tx: Tx, order: LedgerOrder, options: AttemptOptions = {}): Promise<PaymentTransaction> {
    const existing = await tx.paymentTransaction.findFirst({ where: { orderId: order.id }, orderBy: { createdAt: 'desc' } });
    if (existing) return existing;
    return tx.paymentTransaction.create({ data: { ...buildAttemptData(order, options), status: LedgerTransactionStatus.PENDING } });
  }

  /**
   * Marks the order's ledger row successful. MUST run inside the transaction that marks the order
   * paid, after that transaction has locked the order row: the lock is what makes checkout verify
   * and the webhook claim a payment exactly once. A row that is already SUCCESS is returned
   * untouched. An order that reached payment without a ledger row (created by a code path that did
   * not record the attempt) gets one here, so no paid sale is ever missing from the ledger.
   */
  public async markOrderPaid(tx: Tx, order: LedgerOrder, payment: GatewayPaymentInfo, options: AttemptOptions = {}): Promise<PaymentTransaction> {
    const existing = await tx.paymentTransaction.findFirst({ where: { orderId: order.id }, orderBy: { createdAt: 'desc' } });
    if (existing?.status === LedgerTransactionStatus.SUCCESS) return existing;

    const raw = sanitizeGatewayPayload(payment.raw);
    const settled = {
      status: LedgerTransactionStatus.SUCCESS,
      gatewayPaymentId: payment.gatewayPaymentId ?? null,
      gatewayOrderId: payment.gatewayOrderId ?? order.razorpayOrderId,
      ...(raw ? { rawResponse: raw } : {}),
    };
    if (existing) {
      return tx.paymentTransaction.update({ where: { id: existing.id }, data: settled });
    }
    return tx.paymentTransaction.create({ data: { ...buildAttemptData(order, options), ...settled } });
  }

  /** Marks a still-pending attempt failed (gateway `payment.failed`, or a rejected verification). Never touches a successful row. */
  public async markOrderFailed(orderId: string, payment: GatewayPaymentInfo = {}, client: Tx | typeof prisma = prisma): Promise<number> {
    const raw = sanitizeGatewayPayload(payment.raw);
    const result = await client.paymentTransaction.updateMany({
      where: { orderId, status: LedgerTransactionStatus.PENDING },
      data: {
        status: LedgerTransactionStatus.FAILED,
        ...(payment.gatewayPaymentId ? { gatewayPaymentId: payment.gatewayPaymentId } : {}),
        ...(raw ? { rawResponse: raw } : {}),
      },
    });
    return result.count;
  }

  /**
   * Re-states the amounts of the order's ledger row from the order as it stands now (an admin
   * moved a paid booking to another plan; nothing was charged or refunded). Every figure is
   * derived from the order with the same function that wrote the row (`buildAttemptData`), so the
   * ledger cannot drift from the order. Status, method, gateway ids, place of supply, customer
   * name and dates are left alone.
   *
   * Call it in the transaction that changed the order, after locking the order row. Returns null
   * when the order has no ledger row; the caller decides whether one must be created.
   */
  public async restateFromOrder(tx: Tx, order: LedgerOrder): Promise<PaymentTransaction | null> {
    const existing = await tx.paymentTransaction.findFirst({ where: { orderId: order.id }, orderBy: { createdAt: 'desc' } });
    if (!existing) return null;
    const now = buildAttemptData(order);
    return tx.paymentTransaction.update({
      where: { id: existing.id },
      data: {
        amountMinor: now.amountMinor,
        baseAmountPaise: now.baseAmountPaise,
        subtotalPaise: now.subtotalPaise,
        shippingPaise: now.shippingPaise,
        taxPaise: now.taxPaise,
        taxRateBp: now.taxRateBp,
        taxInclusive: now.taxInclusive,
        discountPaise: now.discountPaise,
      },
    });
  }

  /**
   * Money the gateway captured for an order that is not paid in our books: a capture that arrived
   * after the order was cancelled (see `recordCaptureForCancelledOrder` in
   * commerce/money/settlement.ts). The ledger row says SUCCESS because the money was received; the
   * order is still not paid, has no invoice number and delivered nothing. Staff must refund the
   * payment at the gateway or honour the order.
   */
  public async listUnappliedPayments(limit: number = 200) {
    const take = Math.min(Math.max(Math.trunc(limit) || 0, 1), 500);
    const hits = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT t.id
      FROM "payment_transactions" t
      JOIN "orders" o ON o.id = t."orderId"
      WHERE t.status = 'SUCCESS'::"LedgerTransactionStatus" AND o."paidAt" IS NULL
      ORDER BY t."updatedAt" DESC
      LIMIT ${take};
    `;
    if (!hits.length) return { payments: [], total: 0 };
    const transactions = await prisma.paymentTransaction.findMany({
      where: { id: { in: hits.map((row) => row.id) } },
      orderBy: { updatedAt: 'desc' },
    });
    const payments = (await this.loadContext(transactions)).map((ctx) => this.present(ctx));
    return { payments, total: payments.length };
  }

  private async loadContext(transactions: PaymentTransaction[]) {
    const userIds = [...new Set(transactions.map((txn) => txn.userId))];
    const orderIds = [...new Set(transactions.map((txn) => txn.orderId).filter((id): id is string => !!id))];
    const legacySourceIds = [...new Set(transactions.map((txn) => txn.legacySourceId).filter((id): id is string => !!id))];

    const [users, orders, invoices, refunds] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true, email: true, phoneNumber: true } }),
      prisma.order.findMany({
            where: { id: { in: orderIds } },
            select: {
              id: true,
              status: true,
              paymentStatus: true,
              fulfillmentStatus: true,
              paidAt: true,
              shippingAddress: { select: { state: true } },
              items: { select: { taxRate: true, taxInclusive: true } },
            },
          }),
      prisma.invoice.findMany({
        where: { OR: [{ orderId: { in: orderIds } }, { legacyId: { in: legacySourceIds } }] },
        select: { orderId: true, legacyId: true, number: true, status: true },
      }),
      // Refunds are recorded per order (`refunds`); the ledger row is joined to them through its
      // order, so a refunded sale is identifiable in the ledger and in the GST report.
      orderIds.length
        ? prisma.refund.findMany({
            where: { orderId: { in: orderIds }, status: 'PROCESSED' },
            select: { orderId: true, amount: true, status: true, createdAt: true },
          })
        : Promise.resolve([]),
    ]);
    const refundByOrderId = summariseRefunds(refunds);

    const userById = new Map(users.map((user) => [user.id, user]));
    const orderById = new Map(orders.map((order) => [order.id, order]));
    const invoiceByOrderId = new Map(invoices.filter((inv) => inv.orderId).map((inv) => [inv.orderId as string, inv]));
    const invoiceByLegacyId = new Map(invoices.filter((inv) => inv.legacyId).map((inv) => [inv.legacyId as string, inv]));

    return transactions.map((txn) => {
      const order = txn.orderId ? orderById.get(txn.orderId) ?? null : null;
      const invoice =
        (txn.orderId ? invoiceByOrderId.get(txn.orderId) : undefined) ??
        (txn.legacySourceId ? invoiceByLegacyId.get(txn.legacySourceId) : undefined) ??
        null;
      const refund = txn.orderId ? refundByOrderId.get(txn.orderId) ?? null : null;
      return { txn, user: userById.get(txn.userId) ?? null, order, invoice, refund };
    });
  }

  private toGstSource(ctx: Awaited<ReturnType<TransactionsService['loadContext']>>[number]): GstSourceRecord {
    return {
      transaction: ctx.txn,
      user: ctx.user,
      invoice: ctx.invoice ? { number: ctx.invoice.number, status: ctx.invoice.status } : null,
      order: ctx.order
        ? { paid: ctx.order.paidAt !== null, deliveryState: ctx.order.shippingAddress?.state ?? null, items: ctx.order.items }
        : null,
      refund: ctx.refund,
    };
  }

  private async listWhere(query: TransactionsQuery): Promise<Prisma.PaymentTransactionWhereInput> {
    {
      const where: Prisma.PaymentTransactionWhereInput = {};
      if (query.status) where.status = STATUS_BY_QUERY[query.status];
      if (query.method) where.method = METHOD_BY_QUERY[query.method];
      const createdAt = dateRange(query.fromDate, query.toDate);
      if (createdAt) where.createdAt = createdAt;
      if (query.search) {
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { phoneNumber: { contains: query.search } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
          take: 500,
        });
        where.userId = { in: users.map((user) => user.id) };
      }
      return where;
    }
  }

  private present(ctx: Awaited<ReturnType<TransactionsService['loadContext']>>[number]) {
    const { txn, user, order, invoice, refund } = ctx;
    const refundedPaise = refund?.refundedPaise ?? 0;
    return {
      id: txn.id,
      transactionType: txn.type.toLowerCase(),
      user: user ? { id: user.id, fullName: user.fullName, email: user.email, phoneNumber: user.phoneNumber } : null,
      customerName: txn.customerName,
      orderId: txn.orderId,
      order: order
        ? { id: order.id, status: order.status, paymentStatus: order.paymentStatus, fulfillmentStatus: order.fulfillmentStatus }
        : null,
      invoiceNo: invoiceLabel({
        saleType: txn.type,
        number: invoice?.number ?? null,
        status: invoice?.status ?? null,
        paid: order ? order.paidAt !== null : txn.status === LedgerTransactionStatus.SUCCESS,
        fallbackId: txn.legacySourceId ?? txn.orderId ?? txn.legacyId ?? txn.id,
      }),
      amountMinor: txn.amountMinor,
      amount: formatMinor(txn.amountMinor, txn.currency),
      currency: txn.currency,
      baseCurrency: txn.baseCurrency,
      baseAmountPaise: txn.baseAmountPaise,
      subtotalPaise: txn.subtotalPaise,
      shippingPaise: txn.shippingPaise,
      taxPaise: txn.taxPaise,
      taxRateBp: txn.taxRateBp,
      taxInclusive: txn.taxInclusive,
      discountPaise: txn.discountPaise,
      exchangeRate: txn.exchangeRate.toString(),
      method: txn.method.toLowerCase(),
      status: txn.status.toLowerCase(),
      transactionId: txn.gatewayPaymentId,
      razorpayOrderId: txn.gatewayOrderId,
      rawResponse: txn.rawResponse,
      // Processed refunds against the sale (INR paise). The row itself stays SUCCESS: the sale happened.
      refundedPaise,
      refundStatus: refundStateFor(refundedPaise, txn.baseAmountPaise > 0 ? txn.baseAmountPaise : txn.amountMinor),
      refundedAt: refund?.lastRefundAt ?? null,
      createdAt: txn.createdAt,
      updatedAt: txn.updatedAt,
    };
  }

  /** Admin list (website `GET /transactions`): newest first, paged, with the website's filters. */
  public async list(query: TransactionsQuery) {
    const where = await this.listWhere(query);
    const [transactions, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.paymentTransaction.count({ where }),
    ]);
    const context = await this.loadContext(transactions);
    return {
      transactions: context.map((ctx) => this.present(ctx)),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  /** CSV of the filtered ledger (all pages), capped. */
  public async exportCsv(query: TransactionsQuery, cap: number = 20000): Promise<string> {
    const where = await this.listWhere(query);
    const transactions = await prisma.paymentTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, take: cap });
    if (transactions.length === cap) logger.warn({ cap }, 'Transactions export reached its row cap');
    const rows = (await this.loadContext(transactions)).map((ctx) => this.present(ctx));
    return toCsv(
      ['Date', 'Invoice No', 'Type', 'Customer Name', 'Email', 'Phone', 'Amount', 'Currency', 'INR Amount', 'Subtotal', 'Shipping', 'Discount', 'GST', 'Exchange Rate', 'Method', 'Status', 'Razorpay Txn ID', 'Razorpay Order ID', 'Refunded Amount', 'Refund Status'],
      rows.map((row) => [
        formatDateIst(row.createdAt),
        row.invoiceNo,
        row.transactionType,
        row.customerName || row.user?.fullName || '',
        row.user?.email ?? '',
        row.user?.phoneNumber ?? '',
        row.amount,
        row.currency,
        paiseToRupeeText(row.baseAmountPaise),
        paiseToRupeeText(row.subtotalPaise),
        paiseToRupeeText(row.shippingPaise),
        paiseToRupeeText(row.discountPaise),
        paiseToRupeeText(row.taxPaise),
        row.exchangeRate,
        row.method,
        row.status,
        row.transactionId ?? '',
        row.razorpayOrderId ?? '',
        row.refundedPaise > 0 ? paiseToRupeeText(row.refundedPaise) : '',
        row.refundStatus === 'none' ? '' : row.refundStatus,
      ])
    );
  }

  /**
   * GST report (website `GET /transactions/gst-report`): every matching transaction, oldest first,
   * with totals. Dates are Indian calendar days. Deliberately not filtered by the linked order's
   * current state: it is the record of what was collected at the time of sale.
   */
  public async gstReport(query: GstReportQuery): Promise<{ rows: GstReportRow[]; summary: GstReportSummary }> {
    const seller = getSellerDetails();
    const where: Prisma.PaymentTransactionWhereInput = {};
    if (query.status) where.status = STATUS_BY_QUERY[query.status];
    if (query.transactionType) where.type = TYPE_BY_QUERY[query.transactionType];
    const createdAt = dateRange(query.fromDate, query.toDate);
    if (createdAt) where.createdAt = createdAt;

    const transactions = await prisma.paymentTransaction.findMany({ where, orderBy: { createdAt: 'asc' } });
    const rows = (await this.loadContext(transactions)).map((ctx) => buildGstRow(this.toGstSource(ctx), seller.state));
    return { rows, summary: summariseGstRows(rows) };
  }

  public async gstReportCsv(query: GstReportQuery): Promise<string> {
    const { rows } = await this.gstReport(query);
    return gstRowsToCsv(rows);
  }
}

export const transactionsService = new TransactionsService();
