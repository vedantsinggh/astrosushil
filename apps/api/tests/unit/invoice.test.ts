/**
 * Invoice numbering: the shared INV-AS/<n> series, its counter, fallback labels and seller details.
 * The database is replaced by an in-memory stand-in; no connection is made.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

interface InvoiceRow {
  id: string;
  orderId: string | null;
  legacyId: string | null;
  saleType: string;
  number: string | null;
  sequence: bigint | null;
  status: string;
  allocatedAt: Date | null;
}

const db = vi.hoisted(() => {
  const state = {
    counter: null as { key: string; lastValue: bigint; initializedBy: string | null; createdAt: Date } | null,
    invoices: [] as InvoiceRow[],
    counterLocks: 0,
    nextId: 1,
  };

  const tx = {
    invoice: {
      findUnique: async ({ where }: { where: { orderId: string } }) => state.invoices.find((row) => row.orderId === where.orderId) ?? null,
      findMany: async () => state.invoices.filter((row) => row.number !== null).map((row) => ({ number: row.number })),
      create: async ({ data }: { data: Partial<InvoiceRow> }) => {
        if (data.sequence !== undefined && data.sequence !== null && state.invoices.some((row) => row.sequence === data.sequence)) {
          throw new Error('Unique constraint failed on invoices.sequence');
        }
        const row: InvoiceRow = {
          id: `inv-${state.nextId++}`,
          orderId: data.orderId ?? null,
          legacyId: data.legacyId ?? null,
          saleType: data.saleType ?? 'ORDER',
          number: data.number ?? null,
          sequence: data.sequence ?? null,
          status: data.status ?? 'PENDING',
          allocatedAt: data.allocatedAt ?? null,
        };
        state.invoices.push(row);
        return row;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<InvoiceRow> }) => {
        const row = state.invoices.find((candidate) => candidate.id === where.id);
        if (!row) throw new Error('invoice not found');
        Object.assign(row, data);
        return row;
      },
      count: async () => state.invoices.filter((row) => row.status === 'PENDING').length,
    },
    invoiceCounter: {
      findUnique: async () => state.counter,
      create: async ({ data }: { data: { key: string; lastValue: bigint; initializedBy: string | null } }) => {
        if (state.counter) throw new Error('Unique constraint failed on invoice_counters.key');
        state.counter = { ...data, createdAt: new Date() };
        return state.counter;
      },
      update: async ({ data }: { data: { lastValue: bigint } }) => {
        if (!state.counter) throw new Error('counter not found');
        state.counter.lastValue = data.lastValue;
        return state.counter;
      },
    },
    // The only raw query the invoice service issues inside a caller's transaction is the counter row lock.
    $queryRaw: async (strings: TemplateStringsArray) => {
      const sql = strings.join('?');
      if (sql.includes('"invoice_counters"') && sql.includes('FOR UPDATE')) {
        state.counterLocks += 1;
        return state.counter ? [{ lastValue: state.counter.lastValue }] : [];
      }
      throw new Error(`unexpected raw query: ${sql}`);
    },
  };

  const prisma = {
    ...tx,
    // Runs the callback against a copy and commits only on success, like a real transaction.
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>): Promise<T> => {
      const snapshot = {
        counter: state.counter ? { ...state.counter } : null,
        invoices: state.invoices.map((row) => ({ ...row })),
      };
      try {
        return await fn(tx);
      } catch (err) {
        state.counter = snapshot.counter;
        state.invoices = snapshot.invoices;
        throw err;
      }
    },
  };

  return { state, tx, prisma };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: db.prisma }));

import { InvoiceService } from '../../src/modules/invoices/invoice.service';
import {
  INVOICE_LABEL_BEING_PREPARED,
  INVOICE_LABEL_NOT_ISSUED,
  analyseInvoiceNumbers,
  formatInvoiceNumber,
  invoiceLabel,
  parseInvoiceNumber,
} from '../../src/modules/invoices/invoice-number';
import { EnvSellerDetailsProvider, placeOfSupplyFor } from '../../src/modules/invoices/seller';

const service = new InvoiceService();
// The stand-in implements the slice of the transaction client the service uses.
const tx = db.tx as unknown as Parameters<InvoiceService['allocateForPaidOrder']>[0];

function seedCounter(lastValue: bigint) {
  db.state.counter = { key: 'INV-AS', lastValue, initializedBy: 'admin-1', createdAt: new Date('2026-11-24T00:00:00Z') };
}

beforeEach(() => {
  db.state.counter = null;
  db.state.invoices = [];
  db.state.counterLocks = 0;
  db.state.nextId = 1;
  delete process.env.INVOICE_NUMBERING_ENABLED;
});

afterEach(() => {
  delete process.env.INVOICE_NUMBERING_ENABLED;
});

describe('invoice number format', () => {
  it('pads to two digits exactly as the website does', () => {
    expect(formatInvoiceNumber(1n)).toBe('INV-AS/01');
    expect(formatInvoiceNumber(9)).toBe('INV-AS/09');
    expect(formatInvoiceNumber(23n)).toBe('INV-AS/23');
    expect(formatInvoiceNumber(100n)).toBe('INV-AS/100');
    expect(formatInvoiceNumber(12345n)).toBe('INV-AS/12345');
    expect(() => formatInvoiceNumber(0n)).toThrow();
  });

  it('parses only INV-AS/<digits>', () => {
    expect(parseInvoiceNumber('INV-AS/07')).toBe(7n);
    expect(parseInvoiceNumber('INV-AS/7')).toBe(7n);
    expect(parseInvoiceNumber('INV-AS/1204')).toBe(1204n);
    for (const bad of ['INV-34567890', 'inv-as/07', 'INV-AS/', 'INV-AS/7a', ' INV-AS/07', null, undefined, '']) {
      expect(parseInvoiceNumber(bad)).toBeNull();
    }
  });
});

describe('invoice labels (website fallbacks)', () => {
  it('legacy booking and report sales without a number use the stable id fallback', () => {
    expect(invoiceLabel({ saleType: 'CONSULTATION', number: null, status: null, paid: true, fallbackId: 'booking1234567890' })).toBe('INV-34567890');
    expect(invoiceLabel({ saleType: 'REPORT', number: null, status: 'NOT_REQUIRED', paid: true, fallbackId: 'report1234567890' })).toBe('INV-34567890');
    expect(invoiceLabel({ saleType: 'REPORT', number: null, status: null, paid: true, fallbackId: '665f1c2ab7e4d9a01c3fa9be' })).toBe('INV-1C3FA9BE');
  });

  it('pending booking and report allocations show "Invoice being prepared", never the fallback', () => {
    expect(invoiceLabel({ saleType: 'CONSULTATION', number: null, status: 'PENDING', paid: true, fallbackId: 'booking1234567890' })).toBe(INVOICE_LABEL_BEING_PREPARED);
    expect(invoiceLabel({ saleType: 'REPORT', number: '', status: 'PENDING', paid: true, fallbackId: 'report1234567890' })).toBe(INVOICE_LABEL_BEING_PREPARED);
  });

  it('product orders never use the id fallback', () => {
    expect(invoiceLabel({ saleType: 'ORDER', number: null, status: null, paid: true, fallbackId: 'product1234567890' })).toBe(INVOICE_LABEL_NOT_ISSUED);
    expect(invoiceLabel({ saleType: 'ORDER', number: null, status: 'PENDING', paid: true, fallbackId: 'product1234567890' })).toBe(INVOICE_LABEL_BEING_PREPARED);
    expect(invoiceLabel({ saleType: 'ORDER', number: null, status: 'PENDING', paid: false, fallbackId: 'product1234567890' })).toBe(INVOICE_LABEL_NOT_ISSUED);
    expect(invoiceLabel({ saleType: 'ORDER', number: null, status: 'NOT_REQUIRED', paid: true, fallbackId: 'product1234567890' })).toBe(INVOICE_LABEL_NOT_ISSUED);
  });

  it('a stored number is always returned unchanged', () => {
    expect(invoiceLabel({ saleType: 'CONSULTATION', number: 'INV-AS/01', status: 'ALLOCATED', paid: true, fallbackId: 'x' })).toBe('INV-AS/01');
    expect(invoiceLabel({ saleType: 'ORDER', number: 'INV-AS/23', status: 'ALLOCATED', paid: true, fallbackId: 'x' })).toBe('INV-AS/23');
    // A malformed historical value is shown as stored, not rewritten.
    expect(invoiceLabel({ saleType: 'REPORT', number: 'INV-AS-0007', status: 'ALLOCATED', paid: true, fallbackId: 'x' })).toBe('INV-AS-0007');
  });
});

describe('analysis of stored numbers', () => {
  it('reports the highest number, duplicates and malformed values without repairing them', () => {
    const analysis = analyseInvoiceNumbers(['INV-AS/01', 'INV-AS/02', 'INV-AS/2', 'INV-AS/117', 'INV-AS-0007', 'INV-34567890', null, '', undefined]);
    expect(analysis).toEqual({
      total: 6,
      wellFormed: 4,
      highest: '117',
      nextNumber: 'INV-AS/118',
      duplicates: [{ value: '2', numbers: ['INV-AS/02', 'INV-AS/2'], count: 2 }],
      malformed: ['INV-AS-0007', 'INV-34567890'],
    });
  });

  it('an empty history has highest 0', () => {
    expect(analyseInvoiceNumbers([])).toMatchObject({ highest: '0', nextNumber: 'INV-AS/01', duplicates: [], malformed: [] });
  });
});

describe('allocation for a paid order', () => {
  it('continues from the counter, one number per order, in order', async () => {
    seedCounter(117n);
    expect(await service.allocateForPaidOrder(tx, { orderId: 'o1', saleType: 'REPORT' })).toEqual({ number: 'INV-AS/118', status: 'ALLOCATED' });
    expect(await service.allocateForPaidOrder(tx, { orderId: 'o2', saleType: 'CONSULTATION' })).toEqual({ number: 'INV-AS/119', status: 'ALLOCATED' });
    expect(await service.allocateForPaidOrder(tx, { orderId: 'o3', saleType: 'ORDER' })).toEqual({ number: 'INV-AS/120', status: 'ALLOCATED' });
    expect(db.state.counter?.lastValue).toBe(120n);
    expect(db.state.invoices.map((row) => [row.orderId, row.number, row.sequence, row.saleType])).toEqual([
      ['o1', 'INV-AS/118', 118n, 'REPORT'],
      ['o2', 'INV-AS/119', 119n, 'CONSULTATION'],
      ['o3', 'INV-AS/120', 120n, 'ORDER'],
    ]);
    expect(db.state.invoices.every((row) => row.allocatedAt instanceof Date)).toBe(true);
  });

  it('takes the counter row lock before reading it', async () => {
    seedCounter(5n);
    await service.allocateForPaidOrder(tx, { orderId: 'o1', saleType: 'ORDER' });
    expect(db.state.counterLocks).toBe(1);
  });

  it('is idempotent: a retry returns the same number and does not move the counter', async () => {
    seedCounter(41n);
    const first = await service.allocateForPaidOrder(tx, { orderId: 'o1', saleType: 'REPORT' });
    const again = await service.allocateForPaidOrder(tx, { orderId: 'o1', saleType: 'REPORT' });
    expect(first).toEqual({ number: 'INV-AS/42', status: 'ALLOCATED' });
    expect(again).toEqual(first);
    expect(db.state.counter?.lastValue).toBe(42n);
    expect(db.state.invoices).toHaveLength(1);
    expect(db.state.counterLocks).toBe(1);
  });

  it('never renumbers a sale that already has a number, even a malformed historical one', async () => {
    seedCounter(200n);
    db.state.invoices.push({ id: 'h1', orderId: 'old', legacyId: 'mongo1', saleType: 'CONSULTATION', number: 'INV-AS/07', sequence: null, status: 'ALLOCATED', allocatedAt: null });
    db.state.invoices.push({ id: 'h2', orderId: 'odd', legacyId: 'mongo2', saleType: 'REPORT', number: 'INV-AS-0009', sequence: null, status: 'ALLOCATED', allocatedAt: null });
    expect(await service.allocateForPaidOrder(tx, { orderId: 'old', saleType: 'CONSULTATION' })).toEqual({ number: 'INV-AS/07', status: 'ALLOCATED' });
    expect(await service.allocateForPaidOrder(tx, { orderId: 'odd', saleType: 'REPORT' })).toEqual({ number: 'INV-AS-0009', status: 'ALLOCATED' });
    expect(db.state.counter?.lastValue).toBe(200n);
    expect(db.state.counterLocks).toBe(0);
  });

  it('never numbers historical sales marked not required', async () => {
    seedCounter(200n);
    db.state.invoices.push({ id: 'h1', orderId: 'old', legacyId: 'mongo1', saleType: 'REPORT', number: null, sequence: null, status: 'NOT_REQUIRED', allocatedAt: null });
    expect(await service.allocateForPaidOrder(tx, { orderId: 'old', saleType: 'REPORT' })).toEqual({ number: null, status: 'NOT_REQUIRED' });
    expect(db.state.counter?.lastValue).toBe(200n);
  });

  it('refuses to allocate before the counter is initialised: the sale is left pending, nothing is invented', async () => {
    const result = await service.allocateForPaidOrder(tx, { orderId: 'o1', saleType: 'REPORT' });
    expect(result).toEqual({ number: null, status: 'PENDING' });
    expect(db.state.counter).toBeNull();
    expect(db.state.invoices).toEqual([expect.objectContaining({ orderId: 'o1', number: null, sequence: null, status: 'PENDING' })]);

    // A second attempt does not create a second row.
    await service.allocateForPaidOrder(tx, { orderId: 'o1', saleType: 'REPORT' });
    expect(db.state.invoices).toHaveLength(1);

    // Once initialised, the pending sale gets the next number.
    seedCounter(117n);
    expect(await service.allocateForPaidOrder(tx, { orderId: 'o1', saleType: 'REPORT' })).toEqual({ number: 'INV-AS/118', status: 'ALLOCATED' });
    expect(db.state.invoices).toHaveLength(1);
  });

  it('INVOICE_NUMBERING_ENABLED=false pauses numbering (pending), and it resumes without gaps', async () => {
    seedCounter(10n);
    process.env.INVOICE_NUMBERING_ENABLED = 'false';
    expect(service.isPaused()).toBe(true);
    expect(await service.allocateForPaidOrder(tx, { orderId: 'o1', saleType: 'ORDER' })).toEqual({ number: null, status: 'PENDING' });
    expect(db.state.counter?.lastValue).toBe(10n);

    delete process.env.INVOICE_NUMBERING_ENABLED;
    expect(service.isPaused()).toBe(false);
    expect(await service.allocateForPaidOrder(tx, { orderId: 'o1', saleType: 'ORDER' })).toEqual({ number: 'INV-AS/11', status: 'ALLOCATED' });
  });

  it('numbering is on by default and for any value other than "false"', () => {
    expect(service.isPaused()).toBe(false);
    process.env.INVOICE_NUMBERING_ENABLED = 'true';
    expect(service.isPaused()).toBe(false);
    process.env.INVOICE_NUMBERING_ENABLED = '';
    expect(service.isPaused()).toBe(false);
  });

  it('a rolled-back sale gives its number back: the next sale reuses it (no gap)', async () => {
    seedCounter(50n);
    await expect(
      db.prisma.$transaction(async (client) => {
        const result = await service.allocateForPaidOrder(client as unknown as typeof tx, { orderId: 'fails', saleType: 'ORDER' });
        expect(result.number).toBe('INV-AS/51');
        throw new Error('something later in the payment transaction failed');
      })
    ).rejects.toThrow('something later');

    expect(db.state.counter?.lastValue).toBe(50n);
    expect(db.state.invoices).toHaveLength(0);

    const next = await db.prisma.$transaction((client) =>
      service.allocateForPaidOrder(client as unknown as typeof tx, { orderId: 'ok', saleType: 'ORDER' })
    );
    expect(next.number).toBe('INV-AS/51');
  });
});

describe('counter initialisation', () => {
  const history = (numbers: Array<string | null>) =>
    numbers.forEach((number, index) =>
      db.state.invoices.push({ id: `h${index}`, orderId: null, legacyId: `mongo${index}`, saleType: 'CONSULTATION', number, sequence: null, status: number ? 'ALLOCATED' : 'NOT_REQUIRED', allocatedAt: null })
    );

  it('starts the counter at the highest migrated number when the caller confirms that value', async () => {
    history(['INV-AS/01', 'INV-AS/117', 'INV-AS/56', null, 'INV-AS-0007']);
    const result = await service.initializeCounter({ confirmLastValue: '117', adminId: 'admin-1' });
    expect(result).toMatchObject({ lastValue: '117', nextNumber: 'INV-AS/118' });
    expect(result.analysis.malformed).toEqual(['INV-AS-0007']);
    expect(db.state.counter).toMatchObject({ key: 'INV-AS', lastValue: 117n, initializedBy: 'admin-1' });

    expect(await service.allocateForPaidOrder(tx, { orderId: 'new', saleType: 'REPORT' })).toEqual({ number: 'INV-AS/118', status: 'ALLOCATED' });
    // Historical rows are untouched.
    expect(db.state.invoices.filter((row) => row.legacyId).map((row) => row.number)).toEqual(['INV-AS/01', 'INV-AS/117', 'INV-AS/56', null, 'INV-AS-0007']);
  });

  it('refuses a confirmed value that differs from the data', async () => {
    history(['INV-AS/117']);
    await expect(service.initializeCounter({ confirmLastValue: '100', adminId: 'a' })).rejects.toMatchObject({ code: 'INVOICE_COUNTER_MISMATCH', statusCode: 409 });
    await expect(service.initializeCounter({ confirmLastValue: '118', adminId: 'a' })).rejects.toMatchObject({ code: 'INVOICE_COUNTER_MISMATCH' });
    expect(db.state.counter).toBeNull();
  });

  it('refuses to start from zero when no history has been imported, unless explicitly allowed', async () => {
    await expect(service.initializeCounter({ confirmLastValue: '0', adminId: 'a' })).rejects.toMatchObject({ code: 'INVOICE_HISTORY_MISSING' });
    expect(db.state.counter).toBeNull();
    const result = await service.initializeCounter({ confirmLastValue: '0', allowEmpty: true, adminId: 'a' });
    expect(result).toMatchObject({ lastValue: '0', nextNumber: 'INV-AS/01' });
  });

  it('refuses to initialise twice', async () => {
    seedCounter(117n);
    await expect(service.initializeCounter({ confirmLastValue: '117', adminId: 'a' })).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    expect(db.state.counter?.lastValue).toBe(117n);
  });

  it('rejects a value that is not a whole number', async () => {
    await expect(service.initializeCounter({ confirmLastValue: '11.5', adminId: 'a' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.initializeCounter({ confirmLastValue: '-1', adminId: 'a' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('describes the counter and the stored numbers', async () => {
    history(['INV-AS/02', 'INV-AS/2']);
    db.state.invoices.push({ id: 'p', orderId: 'o9', legacyId: null, saleType: 'ORDER', number: null, sequence: null, status: 'PENDING', allocatedAt: null });
    expect(await service.describeCounter()).toMatchObject({ initialised: false, lastValue: null, nextNumber: null, pendingInvoices: 1, analysis: { highest: '2', duplicates: [{ value: '2', count: 2 }] } });
    seedCounter(2n);
    expect(await service.describeCounter()).toMatchObject({ initialised: true, paused: false, lastValue: '2', nextNumber: 'INV-AS/03' });
  });
});

describe('seller details', () => {
  const env = {
    INVOICE_SELLER_NAME: 'Example Seller Private Limited',
    INVOICE_SELLER_ADDRESS: '1 Example Road, Example City',
    INVOICE_SELLER_GSTIN: '00AAAAA0000A0Z0',
    INVOICE_SELLER_STATE: 'Example State',
    INVOICE_SELLER_EMAIL: ' billing@example.test ',
  } as NodeJS.ProcessEnv;

  it('come from configuration', () => {
    expect(new EnvSellerDetailsProvider(() => env).get()).toEqual({
      legalName: 'Example Seller Private Limited',
      tagline: null,
      address: '1 Example Road, Example City',
      gstin: '00AAAAA0000A0Z0',
      state: 'Example State',
      email: 'billing@example.test',
      phone: null,
      website: null,
    });
  });

  it('are a configuration error naming what is missing, with no built-in defaults', () => {
    expect(() => new EnvSellerDetailsProvider(() => ({}) as NodeJS.ProcessEnv).get()).toThrowError(
      expect.objectContaining({
        code: 'INVOICE_SELLER_UNCONFIGURED',
        statusCode: 503,
        message: expect.stringContaining('INVOICE_SELLER_GSTIN'),
      })
    );
    expect(() => new EnvSellerDetailsProvider(() => ({ ...env, INVOICE_SELLER_STATE: '  ' }) as NodeJS.ProcessEnv).get()).toThrowError(
      expect.objectContaining({ message: expect.stringContaining('INVOICE_SELLER_STATE') })
    );
  });

  it('place of supply is the delivery state, else the seller state', () => {
    const seller = new EnvSellerDetailsProvider(() => env).get();
    expect(placeOfSupplyFor('Maharashtra', seller)).toBe('Maharashtra');
    expect(placeOfSupplyFor(' ', seller)).toBe('Example State');
    expect(placeOfSupplyFor(null, seller)).toBe('Example State');
    expect(placeOfSupplyFor(undefined, seller)).toBe('Example State');
  });
});
