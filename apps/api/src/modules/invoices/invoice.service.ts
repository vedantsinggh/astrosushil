import { InvoiceAllocationStatus, LedgerTransactionStatus, LedgerTransactionType, Prisma } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { AppError, ConflictError, NotFoundError, ValidationError } from '../../errors/app-error';
import { logger } from '../../utils/logger';
import { deriveSaleType } from '../transactions/ledger';
import {
  INVOICE_COUNTER_KEY,
  InvoiceNumberAnalysis,
  analyseInvoiceNumbers,
  formatInvoiceNumber,
  invoiceLabel,
} from './invoice-number';
import { getSellerDetails, placeOfSupplyFor, SellerDetails } from './seller';

export interface AllocationResult {
  number: string | null;
  status: InvoiceAllocationStatus;
}

export interface InvoiceDocumentData {
  invoiceNumber: string;
  numberAllocated: boolean;
  allocationStatus: InvoiceAllocationStatus | null;
  saleType: 'order' | 'consultation' | 'report';
  orderId: string;
  /** Short reference printed on the invoice (website: last 12 characters of the id for orders, 10 otherwise). */
  orderReference: string;
  orderDate: string;
  orderStatus: string;
  seller: SellerDetails;
  placeOfSupply: string;
  reverseCharge: false;
  customer: { name: string; email: string | null; phone: string | null };
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  payment: {
    status: 'pending' | 'paid' | 'failed';
    method: string;
    gatewayPaymentId: string | null;
    paidAt: string | null;
    /** What was charged at the gateway. */
    currency: string;
    amountMinor: number;
    exchangeRate: string;
  };
  lines: Array<{
    title: string;
    description: string | null;
    itemType: string;
    quantity: number;
    unitPricePaise: number;
    lineTotalPaise: number;
    taxRateBp: number;
    taxInclusive: boolean;
    taxPaise: number;
    /**
     * Value the GST was charged on: the line's stored payable total (after its share of any
     * discount, GST included) minus its GST. Null if the stored figures do not allow it.
     */
    taxablePaise: number | null;
  }>;
  totals: {
    subTotalPaise: number;
    discountPaise: number;
    shippingPaise: number;
    /** One row per GST rate actually charged (website: "GST 18%"). */
    taxByRate: Array<{ rateBp: number; taxPaise: number; inclusive: boolean }>;
    taxPaise: number;
    /** INR. */
    grandTotalPaise: number;
  };
}

type Tx = Prisma.TransactionClient;

export class InvoiceService {
  /**
   * The website gates numbering on INVOICE_NUMBERING_ENABLED=true and marks sales made while it is
   * off as "not_required" for ever. The series is live, so numbering here is on whenever the counter
   * has been initialised. Setting INVOICE_NUMBERING_ENABLED=false only pauses it: sales stay
   * "pending" and are numbered, in payment order, once it is switched back on.
   */
  public isPaused(): boolean {
    return process.env.INVOICE_NUMBERING_ENABLED?.trim().toLowerCase() === 'false';
  }

  /**
   * Gives the paid order its invoice number. MUST be called inside the database transaction that
   * marks the order paid, after that transaction has locked the order row (lock order:
   * orders -> order_items -> ... -> invoice_counters, always last).
   *
   * The counter row is locked FOR UPDATE, incremented and the invoice row written in this same
   * transaction: a rollback undoes the increment (no gap), the lock serialises concurrent sales (no
   * duplicate), and `invoices.sequence` is unique as a second guard. Calling it again for the same
   * order returns the number it already has.
   *
   * When the counter has not been initialised nothing is numbered: the invoice is left PENDING and
   * the payment still commits.
   */
  public async allocateForPaidOrder(tx: Tx, params: { orderId: string; saleType: LedgerTransactionType }): Promise<AllocationResult> {
    const existing = await tx.invoice.findUnique({ where: { orderId: params.orderId } });
    if (existing?.number) {
      return { number: existing.number, status: existing.status };
    }
    // Historical sales the website never numbered are never numbered later.
    if (existing?.status === InvoiceAllocationStatus.NOT_REQUIRED) {
      return { number: null, status: existing.status };
    }

    const leavePending = async (): Promise<AllocationResult> => {
      if (!existing) {
        await tx.invoice.create({
          data: { orderId: params.orderId, saleType: params.saleType, status: InvoiceAllocationStatus.PENDING },
        });
      }
      return { number: null, status: InvoiceAllocationStatus.PENDING };
    };

    if (this.isPaused()) return leavePending();

    const counters = await tx.$queryRaw<Array<{ lastValue: bigint }>>`
      SELECT "lastValue" FROM "invoice_counters" WHERE "key" = ${INVOICE_COUNTER_KEY} FOR UPDATE;
    `;
    if (!counters.length) {
      logger.error({ orderId: params.orderId }, 'Invoice counter is not initialised; invoice left pending');
      return leavePending();
    }

    const next = BigInt(counters[0].lastValue) + 1n;
    const number = formatInvoiceNumber(next);
    await tx.invoiceCounter.update({ where: { key: INVOICE_COUNTER_KEY }, data: { lastValue: next } });

    const data = { number, sequence: next, status: InvoiceAllocationStatus.ALLOCATED, allocatedAt: new Date() };
    if (existing) {
      await tx.invoice.update({ where: { id: existing.id }, data });
    } else {
      await tx.invoice.create({ data: { orderId: params.orderId, saleType: params.saleType, ...data } });
    }
    return { number, status: InvoiceAllocationStatus.ALLOCATED };
  }

  /** Counter state and a report on every stored invoice number (duplicates and malformed values included). */
  public async describeCounter(): Promise<{
    initialised: boolean;
    paused: boolean;
    lastValue: string | null;
    nextNumber: string | null;
    pendingInvoices: number;
    analysis: InvoiceNumberAnalysis;
  }> {
    const [counter, numbered, pendingInvoices] = await Promise.all([
      prisma.invoiceCounter.findUnique({ where: { key: INVOICE_COUNTER_KEY } }),
      prisma.invoice.findMany({ where: { number: { not: null } }, select: { number: true } }),
      prisma.invoice.count({ where: { status: InvoiceAllocationStatus.PENDING } }),
    ]);
    return {
      initialised: !!counter,
      paused: this.isPaused(),
      lastValue: counter ? counter.lastValue.toString() : null,
      nextNumber: counter ? formatInvoiceNumber(counter.lastValue + 1n) : null,
      pendingInvoices,
      analysis: analyseInvoiceNumbers(numbered.map((row) => row.number)),
    };
  }

  /**
   * Creates the counter row, once, from the migrated data's highest number.
   *
   * The caller must state the value it expects (`confirmLastValue`); it is compared with the highest
   * `INV-AS/<n>` found among stored invoices and the call is refused when they differ, so the series
   * can never start from an assumed value. An empty table (highest 0) is refused unless
   * `allowEmpty` is set, which is meant for development databases only.
   */
  public async initializeCounter(params: { confirmLastValue: string; allowEmpty?: boolean; adminId: string }) {
    if (!/^\d+$/.test(params.confirmLastValue)) {
      throw new ValidationError('confirmLastValue must be a whole number');
    }
    const confirmed = BigInt(params.confirmLastValue);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.invoiceCounter.findUnique({ where: { key: INVOICE_COUNTER_KEY } });
      if (existing) {
        throw new ConflictError(`Invoice counter is already initialised (last value ${existing.lastValue.toString()})`);
      }
      const numbered = await tx.invoice.findMany({ where: { number: { not: null } }, select: { number: true } });
      const analysis = analyseInvoiceNumbers(numbered.map((row) => row.number));
      const highest = BigInt(analysis.highest);

      if (confirmed !== highest) {
        throw new AppError(
          `confirmLastValue (${confirmed}) does not match the highest stored invoice number (${highest}).`,
          409,
          'INVOICE_COUNTER_MISMATCH'
        );
      }
      if (highest === 0n && !params.allowEmpty) {
        throw new AppError(
          'No migrated invoice numbers were found. Import the website invoices first; the series must continue from its last number.',
          409,
          'INVOICE_HISTORY_MISSING'
        );
      }

      const counter = await tx.invoiceCounter.create({
        data: { key: INVOICE_COUNTER_KEY, lastValue: highest, initializedBy: params.adminId },
      });
      return { lastValue: counter.lastValue.toString(), nextNumber: formatInvoiceNumber(highest + 1n), analysis };
    });
  }

  /**
   * Numbers paid sales that have none yet, oldest payment first (website: invoice recovery worker).
   * Covers invoices left PENDING and orders paid since the counter was initialised that have no
   * invoice row at all. Orders paid before initialisation without a row are history and are left alone.
   */
  public async allocatePending(
    limit: number = 200,
    /** What to run for each order under its row lock. The route passes the full settlement (ledger + invoice). */
    settle?: (tx: Tx, orderId: string) => Promise<AllocationResult>
  ): Promise<{
    allocated: Array<{ orderId: string; number: string }>;
    stillPending: string[];
    failures: Array<{ orderId: string; message: string }>;
  }> {
    const counter = await prisma.invoiceCounter.findUnique({ where: { key: INVOICE_COUNTER_KEY } });
    if (!counter) {
      throw new AppError('Invoice counter is not initialised.', 409, 'INVOICE_COUNTER_NOT_INITIALISED');
    }
    if (this.isPaused()) {
      throw new AppError('Invoice numbering is paused (INVOICE_NUMBERING_ENABLED=false).', 409, 'INVOICE_NUMBERING_PAUSED');
    }

    const pending = await prisma.invoice.findMany({
      where: { status: InvoiceAllocationStatus.PENDING, orderId: { not: null } },
      select: { orderId: true },
    });
    const invoiced = await prisma.invoice.findMany({ where: { orderId: { not: null } }, select: { orderId: true } });
    const invoicedIds = invoiced.map((row) => row.orderId).filter((id): id is string => !!id);
    const candidates = await prisma.order.findMany({
      where: {
        paidAt: { not: null },
        OR: [
          { id: { in: pending.map((row) => row.orderId).filter((id): id is string => !!id) } },
          { paidAt: { gte: counter.createdAt }, id: { notIn: invoicedIds } },
        ],
      },
      select: { id: true },
      orderBy: { paidAt: 'asc' },
      take: limit,
    });

    const allocated: Array<{ orderId: string; number: string }> = [];
    const stillPending: string[] = [];
    const failures: Array<{ orderId: string; message: string }> = [];

    for (const { id } of candidates) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const locked = await tx.$queryRaw<Array<{ id: string; paidAt: Date | null }>>`
            SELECT id, "paidAt" FROM "orders" WHERE id = ${id} FOR UPDATE;
          `;
          if (!locked.length || !locked[0].paidAt) return null;
          if (settle) return settle(tx, id);
          const items = await tx.orderItem.findMany({ where: { orderId: id }, select: { itemType: true } });
          return this.allocateForPaidOrder(tx, { orderId: id, saleType: deriveSaleType(items) });
        });
        if (result?.number) allocated.push({ orderId: id, number: result.number });
        else stillPending.push(id);
      } catch (err) {
        failures.push({ orderId: id, message: err instanceof Error ? err.message : 'Invoice allocation failed' });
      }
    }
    return { allocated, stillPending, failures };
  }

  /**
   * Everything an invoice document shows, for one order. The requester must own the order unless
   * `asStaff` is set (the route has then already checked an admin permission).
   */
  public async getInvoiceData(orderId: string, requester: { id: string }, asStaff: boolean = false): Promise<InvoiceDocumentData> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { orderBy: { createdAt: 'asc' } }, shippingAddress: true, user: true },
    });
    if (!order || (!asStaff && order.userId !== requester.id)) {
      throw new NotFoundError('Order not found');
    }

    const [invoice, transaction] = await Promise.all([
      prisma.invoice.findUnique({ where: { orderId } }),
      prisma.paymentTransaction.findFirst({ where: { orderId }, orderBy: { createdAt: 'desc' } }),
    ]);
    const seller = getSellerDetails();
    const saleType = invoice?.saleType ?? deriveSaleType(order.items);
    const paid = order.paidAt !== null;

    const taxByRate = new Map<string, { rateBp: number; taxPaise: number; inclusive: boolean }>();
    for (const item of order.items) {
      if (item.taxRate > 0 && item.taxAmount > 0) {
        const key = `${item.taxRate}:${item.taxInclusive}`;
        const row = taxByRate.get(key) ?? { rateBp: item.taxRate, taxPaise: 0, inclusive: item.taxInclusive };
        row.taxPaise += item.taxAmount;
        taxByRate.set(key, row);
      }
    }

    const paymentStatus: InvoiceDocumentData['payment']['status'] = paid
      ? 'paid'
      : transaction?.status === LedgerTransactionStatus.FAILED || order.paymentStatus === 'FAILED'
        ? 'failed'
        : 'pending';

    return {
      invoiceNumber: invoiceLabel({
        saleType,
        number: invoice?.number ?? null,
        status: invoice?.status ?? null,
        paid,
        fallbackId: invoice?.legacyId ?? transaction?.legacySourceId ?? order.id,
      }),
      numberAllocated: !!invoice?.number,
      allocationStatus: invoice?.status ?? null,
      saleType: saleType.toLowerCase() as InvoiceDocumentData['saleType'],
      orderId: order.id,
      orderReference: order.id.slice(saleType === LedgerTransactionType.ORDER ? -12 : -10).toUpperCase(),
      orderDate: order.createdAt.toISOString(),
      orderStatus: order.status,
      seller,
      placeOfSupply: placeOfSupplyFor(transaction?.placeOfSupply ?? order.shippingAddress?.state, seller),
      reverseCharge: false,
      customer: {
        name: transaction?.customerName || order.user.fullName || 'Customer',
        email: order.user.email,
        phone: order.user.phoneNumber,
      },
      shippingAddress: order.shippingAddress
        ? {
            fullName: order.shippingAddress.fullName,
            phone: order.shippingAddress.phoneNumber,
            addressLine1: order.shippingAddress.addressLine1,
            addressLine2: order.shippingAddress.addressLine2,
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            postalCode: order.shippingAddress.postalCode,
            country: order.shippingAddress.country,
          }
        : null,
      payment: {
        status: paymentStatus,
        method: (transaction?.method ?? order.paymentMethod).toLowerCase(),
        gatewayPaymentId: transaction?.gatewayPaymentId ?? order.razorpayPaymentId,
        paidAt: order.paidAt ? order.paidAt.toISOString() : null,
        currency: order.paidCurrency,
        amountMinor: order.paidAmountMinor ?? order.amount,
        exchangeRate: (order.exchangeRate ?? new Prisma.Decimal(1)).toString(),
      },
      lines: order.items.map((item) => ({
        title: item.title,
        description: item.description,
        itemType: item.itemType,
        quantity: item.quantity,
        unitPricePaise: item.unitPrice,
        lineTotalPaise: item.unitPrice * item.quantity,
        taxRateBp: item.taxRate,
        taxInclusive: item.taxInclusive,
        taxPaise: item.taxAmount,
        taxablePaise: item.totalAmount >= item.taxAmount ? item.totalAmount - item.taxAmount : null,
      })),
      totals: {
        subTotalPaise: order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
        discountPaise: order.discountAmount ?? 0,
        shippingPaise: order.shippingAmount ?? 0,
        taxByRate: [...taxByRate.values()].sort((a, b) => a.rateBp - b.rateBp),
        taxPaise: order.items.reduce((sum, item) => sum + item.taxAmount, 0),
        grandTotalPaise: order.amount,
      },
    };
  }
}

export const invoiceService = new InvoiceService();
