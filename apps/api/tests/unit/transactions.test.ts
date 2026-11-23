/**
 * Transactions ledger and GST report. Database access is replaced by an in-memory stand-in.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

interface TxnRow {
  id: string;
  orderId: string | null;
  status: string;
  createdAt: Date;
  [key: string]: unknown;
}

const db = vi.hoisted(() => {
  const state = { transactions: [] as TxnRow[], nextId: 1 };
  const paymentTransaction = {
    findFirst: async ({ where }: { where: { orderId: string } }) =>
      [...state.transactions].reverse().find((row) => row.orderId === where.orderId) ?? null,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `txn-${state.nextId++}`, createdAt: new Date(), status: 'PENDING', ...data } as TxnRow;
      state.transactions.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = state.transactions.find((candidate) => candidate.id === where.id);
      if (!row) throw new Error('transaction not found');
      Object.assign(row, data);
      return row;
    },
    updateMany: async ({ where, data }: { where: { orderId: string; status: string }; data: Record<string, unknown> }) => {
      const rows = state.transactions.filter((row) => row.orderId === where.orderId && row.status === where.status);
      rows.forEach((row) => Object.assign(row, data));
      return { count: rows.length };
    },
  };
  return { state, prisma: { paymentTransaction } };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: db.prisma }));

import { TransactionsService } from '../../src/modules/transactions/transactions.service';
import { buildAttemptData, deriveSaleType, sanitizeGatewayPayload, LedgerOrder } from '../../src/modules/transactions/ledger';
import { GST_CSV_HEADERS, GstSourceRecord, buildGstRow, gstRowsToCsv, summariseGstRows } from '../../src/modules/transactions/gst-report';
import { csvCell, formatDateIst, istDayBoundary, paiseToRupeeText, toCsv } from '../../src/modules/transactions/csv';
import { gstReportQuerySchema, transactionsQuerySchema } from '../../src/modules/transactions/transactions.schemas';

const service = new TransactionsService();
const tx = db.prisma as unknown as Parameters<TransactionsService['recordAttempt']>[0];

function order(overrides: Partial<LedgerOrder> = {}): LedgerOrder {
  return {
    id: 'order-1',
    userId: 'user-1',
    razorpayOrderId: 'order_rzp_1',
    amount: 35282,
    discountAmount: 0,
    shippingAmount: 0,
    taxAmount: 5382,
    paidCurrency: 'INR',
    paidAmountMinor: 35282,
    exchangeRate: '1',
    paymentMethod: 'RAZORPAY',
    items: [{ itemType: 'REPORT', quantity: 1, unitPrice: 35282, taxRate: 1800, taxAmount: 5382, taxInclusive: true }],
    ...overrides,
  };
}

beforeEach(() => {
  db.state.transactions = [];
  db.state.nextId = 1;
});

describe('sale type', () => {
  it('maps our orders to the website transaction types', () => {
    expect(deriveSaleType([{ itemType: 'REPORT' }])).toBe('REPORT');
    expect(deriveSaleType([{ itemType: 'REPORT' }, { itemType: 'REPORT' }])).toBe('REPORT');
    expect(deriveSaleType([{ itemType: 'CONSULTATION' }])).toBe('CONSULTATION');
    expect(deriveSaleType([{ itemType: 'PRODUCT' }])).toBe('ORDER');
    expect(deriveSaleType([{ itemType: 'COURSE' }])).toBe('ORDER');
    expect(deriveSaleType([{ itemType: 'REPORT' }, { itemType: 'PRODUCT' }])).toBe('ORDER');
    expect(deriveSaleType([])).toBe('ORDER');
  });
});

describe('gateway payload', () => {
  it('keeps only allow-listed fields: no card, contact, e-mail, VPA or notes', () => {
    const stored = sanitizeGatewayPayload({
      id: 'pay_1',
      entity: 'payment',
      order_id: 'order_rzp_1',
      amount: 35282,
      currency: 'INR',
      status: 'captured',
      method: 'card',
      captured: true,
      international: false,
      fee: 833,
      tax: 127,
      error_code: null,
      created_at: 1795000000,
      email: 'customer@example.test',
      contact: '+919999999999',
      vpa: 'someone@upi',
      card_id: 'card_1',
      card: { last4: '1111', network: 'Visa', name: 'A Customer' },
      bank: 'HDFC',
      wallet: null,
      notes: { address: 'somewhere' },
      acquirer_data: { auth_code: '123456' },
      token_id: 'token_1',
    });
    expect(stored).toEqual({
      id: 'pay_1',
      entity: 'payment',
      order_id: 'order_rzp_1',
      amount: 35282,
      currency: 'INR',
      status: 'captured',
      method: 'card',
      captured: true,
      international: false,
      fee: 833,
      tax: 127,
      error_code: null,
      created_at: 1795000000,
    });
  });

  it('ignores nested values smuggled under an allowed key, and non-objects', () => {
    expect(sanitizeGatewayPayload({ id: { card: '4111' }, status: ['x'], amount: 5 })).toEqual({ amount: 5 });
    expect(sanitizeGatewayPayload(null)).toBeNull();
    expect(sanitizeGatewayPayload('pay_1')).toBeNull();
    expect(sanitizeGatewayPayload([{ id: 'pay_1' }])).toBeNull();
    expect(sanitizeGatewayPayload({ email: 'a@b.test' })).toBeNull();
  });
});

describe('ledger row for a payment attempt', () => {
  it('records the INR breakdown and the paid currency amount', () => {
    const data = buildAttemptData(order());
    expect(data).toMatchObject({
      userId: 'user-1',
      orderId: 'order-1',
      type: 'REPORT',
      amountMinor: 35282,
      currency: 'INR',
      baseCurrency: 'INR',
      baseAmountPaise: 35282,
      subtotalPaise: 35282,
      shippingPaise: 0,
      taxPaise: 5382,
      taxRateBp: 1800,
      taxInclusive: true,
      discountPaise: 0,
      method: 'RAZORPAY',
      gatewayOrderId: 'order_rzp_1',
      placeOfSupply: null,
    });
    expect(data.exchangeRate.toString()).toBe('1');
  });

  it('keeps a foreign-currency payment next to its INR base amount and rate', () => {
    const data = buildAttemptData(order({ paidCurrency: 'USD', paidAmountMinor: 423, exchangeRate: '0.0120000000' }));
    expect(data).toMatchObject({ amountMinor: 423, currency: 'USD', baseCurrency: 'INR', baseAmountPaise: 35282, taxPaise: 5382 });
    expect(data.exchangeRate.toString()).toBe('0.012');
  });

  it('mixed GST rates leave the single-rate fields empty; shop orders carry shipping, discount and delivery state', () => {
    const data = buildAttemptData(
      order({
        amount: 239625,
        paidAmountMinor: null,
        discountAmount: 15000,
        shippingAmount: 50000,
        items: [
          { itemType: 'PRODUCT', quantity: 1, unitPrice: 100000, taxRate: 1800, taxAmount: 14110, taxInclusive: true },
          { itemType: 'PRODUCT', quantity: 2, unitPrice: 50000, taxRate: 500, taxAmount: 4625, taxInclusive: false },
        ],
        shippingAddress: { state: 'Maharashtra' },
      })
    );
    expect(data).toMatchObject({
      type: 'ORDER',
      amountMinor: 239625,
      baseAmountPaise: 239625,
      subtotalPaise: 200000,
      shippingPaise: 50000,
      discountPaise: 15000,
      taxPaise: 18735,
      taxRateBp: 0,
      taxInclusive: false,
      placeOfSupply: 'Maharashtra',
    });
  });

  it('models cash on delivery and manual payments for migrated or admin-entered sales', () => {
    expect(buildAttemptData(order({ paymentMethod: 'COD' })).method).toBe('COD');
    expect(buildAttemptData(order({ paymentMethod: 'MANUAL' })).method).toBe('MANUAL');
  });
});

describe('payment flow writes the ledger', () => {
  it('records one pending row per order', async () => {
    const first = await service.recordAttempt(tx, order());
    const second = await service.recordAttempt(tx, order());
    expect(second.id).toBe(first.id);
    expect(db.state.transactions).toHaveLength(1);
    expect(db.state.transactions[0]).toMatchObject({ status: 'PENDING', orderId: 'order-1', gatewayOrderId: 'order_rzp_1' });
  });

  it('marks it successful once, with the gateway ids and a sanitised payload', async () => {
    await service.recordAttempt(tx, order());
    const paid = await service.markOrderPaid(tx, order(), {
      gatewayPaymentId: 'pay_1',
      gatewayOrderId: 'order_rzp_1',
      raw: { id: 'pay_1', amount: 35282, currency: 'INR', email: 'customer@example.test', card: { last4: '1111' } },
    });
    expect(paid).toMatchObject({ status: 'SUCCESS', gatewayPaymentId: 'pay_1', gatewayOrderId: 'order_rzp_1' });
    expect(paid.rawResponse).toEqual({ id: 'pay_1', amount: 35282, currency: 'INR' });
    expect(db.state.transactions).toHaveLength(1);
  });

  it('the second claim (verify after webhook, or the reverse) changes nothing', async () => {
    await service.recordAttempt(tx, order());
    await service.markOrderPaid(tx, order(), { gatewayPaymentId: 'pay_1' });
    const again = await service.markOrderPaid(tx, order(), { gatewayPaymentId: 'pay_OTHER', raw: { id: 'pay_OTHER' } });
    expect(again.gatewayPaymentId).toBe('pay_1');
    expect(db.state.transactions).toHaveLength(1);
    expect(db.state.transactions[0]).toMatchObject({ status: 'SUCCESS', gatewayPaymentId: 'pay_1' });
  });

  it('a paid order that never recorded an attempt still gets its ledger row', async () => {
    const paid = await service.markOrderPaid(tx, order({ id: 'order-legacy-path' }), { gatewayPaymentId: 'pay_2' });
    expect(paid).toMatchObject({ orderId: 'order-legacy-path', status: 'SUCCESS', gatewayPaymentId: 'pay_2', baseAmountPaise: 35282 });
    expect(db.state.transactions).toHaveLength(1);
  });

  it('a failed attempt is marked failed, but a successful one is never downgraded', async () => {
    await service.recordAttempt(tx, order());
    expect(await service.markOrderFailed('order-1', { gatewayPaymentId: 'pay_f', raw: { id: 'pay_f', error_code: 'BAD_REQUEST_ERROR', contact: '+91999' } }, tx)).toBe(1);
    expect(db.state.transactions[0]).toMatchObject({ status: 'FAILED', gatewayPaymentId: 'pay_f', rawResponse: { id: 'pay_f', error_code: 'BAD_REQUEST_ERROR' } });

    // A later genuine capture still succeeds.
    await service.markOrderPaid(tx, order(), { gatewayPaymentId: 'pay_ok' });
    expect(db.state.transactions[0]).toMatchObject({ status: 'SUCCESS', gatewayPaymentId: 'pay_ok' });
    expect(await service.markOrderFailed('order-1', {}, tx)).toBe(0);
    expect(db.state.transactions[0].status).toBe('SUCCESS');
  });
});

describe('GST report rows', () => {
  const SELLER_STATE = 'Example State';
  const base = (overrides: Partial<GstSourceRecord['transaction']> = {}): GstSourceRecord['transaction'] => ({
    id: 'txn-uuid-0000-0000-abcdef123456',
    legacyId: null,
    legacySourceId: null,
    orderId: 'order-uuid-0000-0000-000012345678',
    type: 'REPORT',
    amountMinor: 35282,
    currency: 'INR',
    baseAmountPaise: 35282,
    taxPaise: 5382,
    taxRateBp: 1800,
    taxInclusive: false,
    method: 'RAZORPAY',
    status: 'SUCCESS',
    gatewayPaymentId: 'pay_1',
    placeOfSupply: null,
    customerName: null,
    createdAt: new Date('2026-06-30T19:00:00.000Z'),
    ...overrides,
  });
  const user = { fullName: 'Asha Rao', email: 'asha@example.test', phoneNumber: '+919876543210' };

  it('a numbered report sale', () => {
    const row = buildGstRow(
      { transaction: base(), user, invoice: { number: 'INV-AS/118', status: 'ALLOCATED' }, order: { paid: true, deliveryState: null, items: [{ taxRate: 1800, taxInclusive: false }] } },
      SELLER_STATE
    );
    expect(row).toEqual({
      transactionId: 'txn-uuid-0000-0000-abcdef123456',
      date: new Date('2026-06-30T19:00:00.000Z'),
      invoiceNo: 'INV-AS/118',
      type: 'report',
      customerName: 'Asha Rao',
      customerEmail: 'asha@example.test',
      customerPhone: '+919876543210',
      placeOfSupply: 'Example State',
      taxableAmount: 29900,
      gstRateLabel: '18%',
      gstType: 'Exclusive',
      gstAmount: 5382,
      totalAmount: 35282,
      currency: 'INR',
      paymentMethod: 'razorpay',
      paymentStatus: 'success',
      razorpayTransactionId: 'pay_1',
    });
  });

  it('taxable + GST always equals the total, net of discount and including shipping', () => {
    const row = buildGstRow(
      {
        transaction: base({ type: 'ORDER', baseAmountPaise: 239625, amountMinor: 239625, taxPaise: 18735, taxRateBp: 0, placeOfSupply: 'Maharashtra' }),
        user,
        invoice: { number: 'INV-AS/119', status: 'ALLOCATED' },
        order: { paid: true, deliveryState: 'Maharashtra', items: [{ taxRate: 1800, taxInclusive: true }, { taxRate: 500, taxInclusive: false }] },
      },
      SELLER_STATE
    );
    expect(row.taxableAmount + row.gstAmount).toBe(row.totalAmount);
    expect(row).toMatchObject({ placeOfSupply: 'Maharashtra', gstRateLabel: 'Mixed (18/5%)', gstType: 'Mixed', totalAmount: 239625, taxableAmount: 220890 });
  });

  it('a foreign-currency sale is reported in INR from its base amount', () => {
    const row = buildGstRow(
      { transaction: base({ amountMinor: 423, currency: 'USD' }), user, invoice: { number: 'INV-AS/120', status: 'ALLOCATED' }, order: null },
      SELLER_STATE
    );
    expect(row).toMatchObject({ totalAmount: 35282, gstAmount: 5382, taxableAmount: 29900, currency: 'INR' });
  });

  it('an old website transaction with no base amount falls back to the paid amount and currency', () => {
    const row = buildGstRow(
      { transaction: base({ baseAmountPaise: 0, amountMinor: 1200, currency: 'USD', taxPaise: 0, taxRateBp: 0 }), user, invoice: null, order: null },
      SELLER_STATE
    );
    expect(row).toMatchObject({ totalAmount: 1200, gstAmount: 0, taxableAmount: 1200, currency: 'USD', gstRateLabel: '0%', gstType: '—' });
  });

  it('pre-GST records with a tax total but no rate are reported as 18% exclusive', () => {
    const consultation = buildGstRow(
      { transaction: base({ type: 'CONSULTATION', taxRateBp: 0, taxPaise: 1800, baseAmountPaise: 11800 }), user, invoice: null, order: null },
      SELLER_STATE
    );
    expect(consultation).toMatchObject({ gstRateLabel: '18%', gstType: 'Exclusive' });

    const productOrder = buildGstRow(
      { transaction: base({ type: 'ORDER', taxRateBp: 0, taxPaise: 1800, baseAmountPaise: 11800 }), user, invoice: null, order: { paid: true, deliveryState: null, items: [{ taxRate: 0, taxInclusive: true }] } },
      SELLER_STATE
    );
    expect(productOrder).toMatchObject({ gstRateLabel: '18%', gstType: 'Exclusive' });
  });

  it('untaxed sales show 0% and a dash; inclusive single-rate sales say so', () => {
    expect(buildGstRow({ transaction: base({ taxPaise: 0, taxRateBp: 0, baseAmountPaise: 99900 }), user, invoice: null, order: null }, SELLER_STATE)).toMatchObject({
      gstRateLabel: '0%',
      gstType: '—',
      taxableAmount: 99900,
    });
    expect(buildGstRow({ transaction: base({ taxInclusive: true }), user, invoice: null, order: null }, SELLER_STATE)).toMatchObject({ gstRateLabel: '18%', gstType: 'Inclusive' });
    expect(
      buildGstRow({ transaction: base({ type: 'ORDER' }), user, invoice: null, order: { paid: true, deliveryState: null, items: [{ taxRate: 250, taxInclusive: true }] } }, SELLER_STATE)
    ).toMatchObject({ gstRateLabel: '2.5%', gstType: 'Inclusive' });
  });

  it('invoice column: stored number, pending text, legacy fallback from the website record id, none for unnumbered product orders', () => {
    const report = (invoice: GstSourceRecord['invoice'], txn: Partial<GstSourceRecord['transaction']> = {}) =>
      buildGstRow({ transaction: base(txn), user, invoice, order: null }, SELLER_STATE).invoiceNo;

    expect(report({ number: 'INV-AS/07', status: 'ALLOCATED' })).toBe('INV-AS/07');
    expect(report({ number: null, status: 'PENDING' })).toBe('Invoice being prepared');
    // Migrated report order without a number: last 8 characters of the website report order id.
    expect(report(null, { legacySourceId: 'report1234567890', legacyId: 'transaction123456', orderId: null })).toBe('INV-34567890');
    // Website: falls back to the transaction id when the linked record is gone.
    expect(report(null, { legacySourceId: null, legacyId: 'transaction123456', orderId: null })).toBe('INV-ON123456');
    // Our own unnumbered sale: last 8 characters of our order id.
    expect(report(null)).toBe('INV-12345678');

    const productOrder = (invoice: GstSourceRecord['invoice'], paid: boolean) =>
      buildGstRow({ transaction: base({ type: 'ORDER' }), user, invoice, order: { paid, deliveryState: null, items: [] } }, SELLER_STATE).invoiceNo;
    expect(productOrder(null, true)).toBe('No invoice issued');
    expect(productOrder({ number: null, status: 'PENDING' }, true)).toBe('Invoice being prepared');
    expect(productOrder({ number: null, status: 'PENDING' }, false)).toBe('No invoice issued');
  });

  it('customer name: the recorded recipient, else the account name, else the e-mail, else a dash', () => {
    const name = (txn: Partial<GstSourceRecord['transaction']>, u: GstSourceRecord['user']) =>
      buildGstRow({ transaction: base(txn), user: u, invoice: null, order: null }, SELLER_STATE).customerName;
    expect(name({ customerName: 'Meera & Arjun' }, user)).toBe('Meera & Arjun');
    expect(name({}, user)).toBe('Asha Rao');
    expect(name({}, { fullName: ' ', email: 'x@example.test', phoneNumber: null })).toBe('x@example.test');
    expect(name({}, null)).toBe('—');
  });

  it('summary adds up the rows', () => {
    const rows = [
      buildGstRow({ transaction: base(), user, invoice: null, order: null }, SELLER_STATE),
      buildGstRow({ transaction: base({ baseAmountPaise: 99900, taxPaise: 0, taxRateBp: 0 }), user, invoice: null, order: null }, SELLER_STATE),
    ];
    expect(summariseGstRows(rows)).toEqual({ taxableTotal: 29900 + 99900, gstTotal: 5382, grandTotal: 35282 + 99900, count: 2 });
    expect(summariseGstRows([])).toEqual({ taxableTotal: 0, gstTotal: 0, grandTotal: 0, count: 0 });
  });

  it('CSV export: website columns, rupee figures, Indian dates, quoted fields', () => {
    const rows = [
      buildGstRow(
        {
          transaction: base({ customerName: 'Rao, Asha "AR"' }),
          user,
          invoice: { number: 'INV-AS/118', status: 'ALLOCATED' },
          order: null,
        },
        'Uttar Pradesh'
      ),
    ];
    const csv = gstRowsToCsv(rows);
    const [header, line, trailing] = csv.split('\r\n');
    expect(header).toBe(GST_CSV_HEADERS.join(','));
    expect(header).toBe(
      'Date,Invoice No,Type,Customer Name,Email,Phone,Place of Supply,Taxable Value,GST Rate,GST Type,GST Amount,Total Value,Currency,Payment Method,Payment Status,Razorpay Txn ID'
    );
    // 19:00 UTC on 30 June is 00:30 on 1 July in India.
    expect(line).toBe(
      '01 Jul 2026,INV-AS/118,Astrology Report,"Rao, Asha ""AR""",asha@example.test,+919876543210,Uttar Pradesh,299.00,18%,Exclusive,53.82,352.82,INR,razorpay,success,pay_1'
    );
    expect(trailing).toBe('');
  });
});

describe('CSV writing', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('line1\r\nline2')).toBe('"line1\r\nline2"');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(0)).toBe('0');
  });

  it('neutralises spreadsheet formulas but leaves numbers and phone numbers alone', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('+cmd|calc')).toBe("'+cmd|calc");
    expect(csvCell('-2+3')).toBe("'-2+3");
    expect(csvCell('+919876543210')).toBe('+919876543210');
    expect(csvCell('-12.50')).toBe('-12.50');
    expect(csvCell('— 18%')).toBe('— 18%');
  });

  it('joins records with CRLF', () => {
    expect(toCsv(['a', 'b'], [[1, 'x,y'], [2, null]])).toBe('a,b\r\n1,"x,y"\r\n2,\r\n');
  });

  it('formats paise and Indian calendar days', () => {
    expect(paiseToRupeeText(35282)).toBe('352.82');
    expect(paiseToRupeeText(5)).toBe('0.05');
    expect(paiseToRupeeText(0)).toBe('0.00');
    expect(paiseToRupeeText(100000)).toBe('1000.00');
    expect(paiseToRupeeText(-250)).toBe('-2.50');
    expect(formatDateIst(new Date('2026-11-24T18:29:59.000Z'))).toBe('24 Nov 2026');
    expect(formatDateIst(new Date('2026-11-24T18:30:00.000Z'))).toBe('25 Nov 2026');
    expect(istDayBoundary('2026-06-01', 'start').toISOString()).toBe('2026-05-31T18:30:00.000Z');
    expect(istDayBoundary('2026-06-30', 'end').toISOString()).toBe('2026-06-30T18:29:59.999Z');
  });
});

describe('query filters', () => {
  it('transactions list: website defaults and limits', () => {
    expect(transactionsQuerySchema.parse({})).toEqual({ page: 1, limit: 10 });
    expect(transactionsQuerySchema.parse({ status: 'SUCCESS', method: 'Razorpay', fromDate: '2026-06-01', toDate: '2026-06-30', search: ' asha ', page: '3', limit: '50' })).toEqual({
      status: 'success',
      method: 'razorpay',
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
      search: 'asha',
      page: 3,
      limit: 50,
    });
    expect(transactionsQuerySchema.parse({ status: '', method: '', fromDate: '', search: '' })).toEqual({ page: 1, limit: 10 });
    expect(transactionsQuerySchema.parse({ method: 'cod' }).method).toBe('cod');
    expect(transactionsQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(transactionsQuerySchema.safeParse({ status: 'paid' }).success).toBe(false);
    expect(transactionsQuerySchema.safeParse({ fromDate: '01-06-2026' }).success).toBe(false);
  });

  it('GST report: status defaults to success, an empty status means all', () => {
    expect(gstReportQuerySchema.parse({})).toEqual({ status: 'success' });
    expect(gstReportQuerySchema.parse({ status: '' })).toEqual({});
    expect(gstReportQuerySchema.parse({ status: 'pending', transactionType: 'consultation', fromDate: '2026-06-01', toDate: '2026-06-30' })).toEqual({
      status: 'pending',
      transactionType: 'consultation',
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    });
    expect(gstReportQuerySchema.safeParse({ transactionType: 'course' }).success).toBe(false);
  });
});
