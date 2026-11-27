/**
 * Item 3: the commerce catalogue reads consultation items from the database-backed adapter.
 * Proves that the seeded rows give exactly the catalogue items the removed constants gave, that a
 * type created or re-priced in the admin can be paid for, and that the first request after
 * start-up is priced from the database. prisma and the gateway are substituted.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = { order: { create: vi.fn() } };
  return {
    tx,
    prisma: {
      consultationType: { findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
      consultationTypeMode: { findMany: vi.fn() },
      reportCatalogEntry: { findMany: vi.fn(async () => []) },
      order: { findUnique: vi.fn() },
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    },
    paymentService: { createRazorpayOrder: vi.fn() },
    transactionsService: { recordAttempt: vi.fn(), markOrderFailed: vi.fn() },
  };
});

vi.mock('../../src/services/prisma.service', () => ({ prisma: mocks.prisma }));
vi.mock('../../src/services/payment.service', () => ({ paymentService: mocks.paymentService }));
vi.mock('../../src/modules/transactions/transactions.service', () => ({ transactionsService: mocks.transactionsService }));
vi.mock('../../src/modules/commerce/money/settlement', () => ({ settleOrderPaid: vi.fn() }));
vi.mock('../../src/modules/shop-orders/shop-orders.service', () => ({ shopOrdersService: {} }));
vi.mock('../../src/modules/fulfillment/fulfillment.service', () => ({ fulfillmentService: {} }));
vi.mock('../../src/modules/notifications/notification.service', () => ({ notificationService: { sendNotification: vi.fn() } }));
vi.mock('../../src/services/platform-report.runner', () => ({
  REPORT_LANGUAGES: ['en', 'hi'],
  normalizeReportLanguage: (value: unknown) => (value === 'hi' ? 'hi' : 'en'),
  platformReportLanguages: () => ['en', 'hi'],
}));

import { COMMERCE_CATALOG, commerceCatalog } from '../../src/modules/commerce/commerce.catalog';
import { CommerceService } from '../../src/modules/commerce/commerce.service';
import { calculateSale } from '../../src/modules/commerce/money/tax';
import { consultationTypesService } from '../../src/modules/consultations/consultation-types.service';
import { DEFAULT_CONSULTATION_TIERS } from '../../src/modules/consultations/consultation-types.defaults';
import { FORMER_CONSULTATION_CONSTANTS } from './wire-payments-former-constants.fixture';

const { prisma } = mocks;
const created = new Date('2026-11-01T00:00:00.000Z');

/** Turns what `seedDefaults` wrote (its `create` payloads) into the rows a later read returns. */
function rowsFromSeedCalls() {
  return prisma.consultationType.create.mock.calls.map(([{ data }], index) => ({
    id: `type-${index}`,
    legacyId: null,
    title: data.title,
    kind: data.kind,
    description: data.description,
    includes: data.includes,
    durationMinutes: data.durationMinutes,
    responseDays: data.responseDays,
    priceLabel: null,
    note: null,
    isActive: data.isActive,
    deletedAt: null,
    createdAt: created,
    updatedAt: created,
    blockedDates: [],
    modes: data.modes.create.map((mode: Record<string, unknown>, m: number) => ({ id: `mode-${index}-${m}`, typeId: `type-${index}`, isActive: true, ...mode })),
  }));
}

function adminType(overrides: { pricePaise: number; gstType: 'INCLUSIVE' | 'EXCLUSIVE'; catalogId: string; title?: string; isActive?: boolean }) {
  return {
    id: 'type-admin', legacyId: null, title: overrides.title ?? 'Vastu Consultation', kind: 'SPECIAL', description: 'Site visit', includes: [],
    durationMinutes: 90, responseDays: 3, priceLabel: null, note: null, isActive: overrides.isActive ?? true, deletedAt: null,
    createdAt: created, updatedAt: created, blockedDates: [],
    modes: [
      { id: 'm1', typeId: 'type-admin', mode: 'VIDEO', catalogId: overrides.catalogId, pricePaise: overrides.pricePaise, gstEnabled: true, gstRateBasisPoints: 1800, gstType: overrides.gstType, isActive: true },
    ],
  };
}

async function loadRows(rows: unknown[]) {
  prisma.consultationType.count.mockResolvedValue(rows.length || 1);
  prisma.consultationType.findMany.mockResolvedValue(rows);
  await consultationTypesService.refresh({ force: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.consultationTypeMode.findMany.mockResolvedValue([]);
  prisma.$transaction.mockImplementation(async (fn: (client: typeof mocks.tx) => Promise<unknown>) => fn(mocks.tx));
});

describe('the consult-* constants are gone and the seeded rows replace them exactly', () => {
  it('the code catalogue holds no consultation item any more', () => {
    expect(Object.values(COMMERCE_CATALOG).filter((item) => item.itemType === 'CONSULTATION')).toEqual([]);
    expect(Object.keys(COMMERCE_CATALOG).filter((id) => id.startsWith('consult-'))).toEqual([]);
  });

  it('the frozen copy is the full former set: 18 tiers, one per default tier', () => {
    expect(FORMER_CONSULTATION_CONSTANTS).toHaveLength(18);
    expect(FORMER_CONSULTATION_CONSTANTS.map((c) => c.id).sort()).toEqual(DEFAULT_CONSULTATION_TIERS.map((t) => t.catalogId).sort());
  });

  it('an empty table is seeded on first read, and every seeded row gives the identical catalogue item', async () => {
    // Brand-new database: no type at all, so the first read seeds the defaults...
    prisma.consultationType.count.mockResolvedValue(0);
    prisma.consultationType.create.mockResolvedValue({});
    prisma.consultationType.findMany.mockImplementation(async () => rowsFromSeedCalls());
    await consultationTypesService.refresh({ force: true });
    expect(prisma.consultationType.create).toHaveBeenCalledTimes(18);

    // ...and the catalogue, read back from those rows, is what the constants were: same id, title,
    // description, price, currency, GST rate, GST inside the price, mode, duration, notice days,
    // quantity limits, fulfilment type and active flag.
    for (const former of FORMER_CONSULTATION_CONSTANTS) {
      expect(commerceCatalog.getItem(former.id), former.id).toEqual(former);
    }
    const listed = commerceCatalog.listItems({ itemType: 'CONSULTATION' });
    expect(listed).toHaveLength(18);
    expect([...listed].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...FORMER_CONSULTATION_CONSTANTS].sort((a, b) => a.id.localeCompare(b.id))
    );
  });

  it('charges exactly what the constants charged: same net, GST and total for every tier', async () => {
    prisma.consultationType.count.mockResolvedValue(0);
    prisma.consultationType.create.mockResolvedValue({});
    prisma.consultationType.findMany.mockImplementation(async () => rowsFromSeedCalls());
    await consultationTypesService.refresh({ force: true });

    for (const former of FORMER_CONSULTATION_CONSTANTS) {
      const calculated = commerceCatalog.calculateOrder([{ catalogId: former.id }]);
      // The constants were all GST-inclusive at 18%: the customer pays the listed price.
      const net = Math.round((former.pricePaise * 10000) / (10000 + former.taxRateBasisPoints));
      expect(calculated).toMatchObject({ totalAmount: former.pricePaise, subtotal: net, taxAmount: former.pricePaise - net, currency: 'INR' });
      expect(calculated.items[0]).toMatchObject({ unitPrice: former.pricePaise, taxRate: 1800, quantity: 1 });
    }
  });

  it('the snapshot a process starts with (before any read) is the same set', async () => {
    const { ConsultationTypesService } = await import('../../src/modules/consultations/consultation-types.service');
    const { toCatalogItem } = await import('../../src/modules/consultations/consultation-catalog.adapter');
    const fresh = new ConsultationTypesService();
    const items = fresh.all().flatMap((type) => type.modes.map((mode) => toCatalogItem(type, mode)));
    expect([...items].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...FORMER_CONSULTATION_CONSTANTS].sort((a, b) => a.id.localeCompare(b.id))
    );
  });
});

describe('catalogue reads', () => {
  it('lists code items and consultation rows together; filters by type and by active', async () => {
    await loadRows([
      adminType({ catalogId: 'consult-vastu-consultation-video', pricePaise: 2500000, gstType: 'INCLUSIVE' }),
      { ...adminType({ catalogId: 'consult-old-video', pricePaise: 100000, gstType: 'INCLUSIVE', isActive: false }), id: 'type-off', title: 'Retired' },
    ]);
    const all = commerceCatalog.listItems();
    expect(all.some((item) => item.id === 'report-career')).toBe(true);
    expect(all.some((item) => item.id === 'consult-vastu-consultation-video')).toBe(true);
    expect(all.some((item) => item.id === 'consult-old-video')).toBe(false);

    expect(commerceCatalog.listItems({ itemType: 'CONSULTATION' }).map((item) => item.id)).toEqual(['consult-vastu-consultation-video']);
    expect(commerceCatalog.listItems({ itemType: 'CONSULTATION', activeOnly: false }).map((item) => item.id).sort()).toEqual([
      'consult-old-video',
      'consult-vastu-consultation-video',
    ]);
    expect(commerceCatalog.listItems({ itemType: 'REPORT' }).every((item) => item.itemType === 'REPORT')).toBe(true);
    expect(commerceCatalog.listItems({ itemType: 'COURSE' }).some((item) => item.itemType === 'CONSULTATION')).toBe(false);
  });

  it('a code constant keeps its id; an unknown id is not found; an inactive type is refused', async () => {
    await loadRows([
      { ...adminType({ catalogId: 'consult-old-video', pricePaise: 100000, gstType: 'INCLUSIVE', isActive: false }), title: 'Retired' },
    ]);
    expect(commerceCatalog.getItem('report-career')).toBe(COMMERCE_CATALOG['report-career']);
    expect(commerceCatalog.isDatabaseItem('report-career')).toBe(false);
    expect(commerceCatalog.isDatabaseItem('consult-anything')).toBe(true);
    expect(commerceCatalog.isDatabaseItem('constructor')).toBe(true);
    expect(commerceCatalog.getItem('constructor')).toBeNull();
    expect(commerceCatalog.getItem('consult-nope')).toBeNull();
    expect(() => commerceCatalog.calculateOrder([{ catalogId: 'consult-nope' }])).toThrow(/Catalog offering not found/);
    expect(() => commerceCatalog.calculateOrder([{ catalogId: 'consult-old-video' }])).toThrow(/inactive or unavailable/);
  });

  it('GST on top of the price is added to the total, exactly as the sale calculation charges it', async () => {
    await loadRows([adminType({ catalogId: 'consult-vastu-consultation-video', pricePaise: 1999999, gstType: 'EXCLUSIVE' })]);
    const calculated = commerceCatalog.calculateOrder([{ catalogId: 'consult-vastu-consultation-video' }]);
    const sale = calculateSale({
      lines: [{ key: 'k', unitPricePaise: 1999999, quantity: 1, gst: { enabled: true, rateBp: 1800, type: 'exclusive' } }],
    });
    expect(calculated).toMatchObject({ subtotal: 1999999, taxAmount: sale.totalTaxPaise, totalAmount: sale.totalPaise });
    expect(calculated.totalAmount).toBe(1999999 + 360000); // 18% of 19,999.99 = 3,599.9982 -> 3,600.00
  });
});

describe('createOrder: a type created or re-priced in the admin can be paid for', () => {
  const service = new CommerceService();

  beforeEach(() => {
    mocks.paymentService.createRazorpayOrder.mockResolvedValue({ id: 'order_rzp_1' });
    mocks.tx.order.create.mockImplementation(async ({ data }: { data: Record<string, unknown> & { items: { create: unknown[] } } }) => ({
      id: 'order-1', ...data, items: data.items.create,
    }));
  });

  it('first request after start-up: the price comes from the database, not from the default snapshot', async () => {
    // The process has only its start-up snapshot (default tiers: Rs 15,000 for this id) ...
    const { ConsultationTypesService } = await import('../../src/modules/consultations/consultation-types.service');
    const startUp = new ConsultationTypesService();
    expect(startUp.resolveOffering('consult-general-video').mode.pricePaise).toBe(1500000);

    // ... while the admin has re-priced that tier to Rs 18,000 in the database.
    prisma.consultationType.count.mockResolvedValue(1);
    prisma.consultationType.findMany.mockResolvedValue([
      adminType({ catalogId: 'consult-general-video', pricePaise: 1800000, gstType: 'INCLUSIVE', title: 'General Consultation (Video)' }),
    ]);
    // Force the shared service back to "never read" so this is a true first request.
    (consultationTypesService as unknown as { snapshot: unknown; nextRefreshAt: number }).snapshot = startUp.all();
    (consultationTypesService as unknown as { nextRefreshAt: number }).nextRefreshAt = 0;

    const order = await service.createOrder({ items: [{ catalogId: 'consult-general-video' }] }, { id: 'user-1' });
    expect(prisma.consultationType.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.paymentService.createRazorpayOrder.mock.calls[0][0]).toBe(1800000);
    expect(order.amount).toBe(1800000);
    expect(order.items[0]).toMatchObject({ catalogId: 'consult-general-video', unitPrice: 1800000, itemType: 'CONSULTATION', fulfillmentType: 'SERVICE' });
  });

  it('a new type with GST on top is charged price + GST, re-read even inside the 30-second window', async () => {
    await loadRows([adminType({ catalogId: 'consult-vastu-consultation-video', pricePaise: 2000000, gstType: 'EXCLUSIVE' })]);
    // Re-priced a second later by an admin on another process: this process's snapshot is "fresh".
    prisma.consultationType.findMany.mockResolvedValue([
      adminType({ catalogId: 'consult-vastu-consultation-video', pricePaise: 3000000, gstType: 'EXCLUSIVE' }),
    ]);
    const order = await service.createOrder({ items: [{ catalogId: 'consult-vastu-consultation-video' }] }, { id: 'user-1' });
    expect(order.amount).toBe(3540000);
    expect(order.taxAmount).toBe(540000);
    expect(order.items[0]).toMatchObject({ unitPrice: 3000000, taxAmount: 540000, taxInclusive: false, totalAmount: 3540000 });
    expect(mocks.paymentService.createRazorpayOrder.mock.calls[0][0]).toBe(3540000);
  });

  it('does not charge from a stale snapshot when the database cannot be read', async () => {
    await loadRows([adminType({ catalogId: 'consult-vastu-consultation-video', pricePaise: 2000000, gstType: 'INCLUSIVE' })]);
    prisma.consultationType.count.mockRejectedValue(new Error('database is down'));
    await expect(service.createOrder({ items: [{ catalogId: 'consult-vastu-consultation-video' }] }, { id: 'user-1' })).rejects.toThrow('database is down');
    expect(mocks.paymentService.createRazorpayOrder).not.toHaveBeenCalled();
  });

  it('an order of code items only does not read consultation types', async () => {
    await service.createOrder({ items: [{ catalogId: 'report-career' }] }, { id: 'user-1' });
    expect(prisma.consultationType.findMany).not.toHaveBeenCalled();
    expect(prisma.consultationType.count).not.toHaveBeenCalled();
  });

  it('the catalogue listing refreshes without forcing: one read, then the snapshot for 30 seconds', async () => {
    (consultationTypesService as unknown as { nextRefreshAt: number }).nextRefreshAt = 0;
    prisma.consultationType.count.mockResolvedValue(1);
    prisma.consultationType.findMany.mockResolvedValue([adminType({ catalogId: 'consult-vastu-consultation-video', pricePaise: 2000000, gstType: 'INCLUSIVE' })]);
    await commerceCatalog.refresh();
    await commerceCatalog.refresh();
    expect(prisma.consultationType.findMany).toHaveBeenCalledTimes(1);
    expect(commerceCatalog.getItem('consult-vastu-consultation-video')?.pricePaise).toBe(2000000);
  });
});
