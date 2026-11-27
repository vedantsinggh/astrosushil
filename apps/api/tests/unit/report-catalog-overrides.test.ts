/**
 * Admin-editable report catalogue (owner decision 2026-11-26): edits override the code item,
 * prices are entered before GST and charged exactly as entered.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('../../src/services/prisma.service', () => ({ prisma: { reportCatalogEntry: { findMany: vi.fn(async () => []) } } }));

import { OrderItemType } from '@prisma/client';
import { applyOverride, basePriceOf, inclusivePrice, ReportCatalogOverride, reportCatalogOverrides } from '../../src/modules/commerce/report-catalog.overrides';
import { COMMERCE_CATALOG, commerceCatalog } from '../../src/modules/commerce/commerce.catalog';

function edit(overrides: Partial<ReportCatalogOverride>): ReportCatalogOverride {
  return {
    catalogId: 'report-planetary-summary',
    name: null,
    slug: null,
    shortDescription: null,
    description: null,
    coverImageUrl: null,
    coverImageKey: null,
    salePricePaise: null,
    priceIncludesGst: false,
    originalPricePaise: null,
    gstRateBp: null,
    isActive: null,
    isPremium: true,
    benefits: [],
    features: [],
    faqs: [],
    hsnSac: null,
    updatedAt: null,
    updatedById: null,
    ...overrides,
  };
}

afterEach(() => reportCatalogOverrides.reset());

describe('report catalogue overrides', () => {
  const code = COMMERCE_CATALOG['report-planetary-summary'];

  it('leaves the code item unchanged without edits, and the code base price is the website one', () => {
    expect(applyOverride(code, undefined)).toBe(code);
    expect(basePriceOf(code)).toBe(19900);
  });

  it('charges exactly the price entered before GST, plus GST', () => {
    for (const base of [19900, 29950, 1, 99999, 123457]) {
      const item = applyOverride(code, edit({ salePricePaise: base, gstRateBp: 1800 }));
      expect(item.pricePaise).toBe(inclusivePrice(base, 1800));
      const order = commerceCatalog.calculateOrder.call({ getItem: () => item } as never, [{ catalogId: item.id }]);
      expect(order.subtotal).toBe(base);
      expect(order.totalAmount).toBe(item.pricePaise);
    }
  });

  it('charges exactly the typed price when it is entered GST-inclusive (999 -> 846.61 + 152.39)', () => {
    const item = applyOverride(code, edit({ salePricePaise: 99900, gstRateBp: 1800, priceIncludesGst: true }));
    expect(item.pricePaise).toBe(99900);
    const order = commerceCatalog.calculateOrder.call({ getItem: () => item } as never, [{ catalogId: item.id }]);
    expect(order.totalAmount).toBe(99900);
    expect(order.subtotal).toBe(84661);
    expect(order.taxAmount).toBe(15239);
  });

  it('applies name, availability and struck-through price; ignores non-report items', () => {
    const item = applyOverride(code, edit({ name: 'Mini Horoscope', isActive: false, originalPricePaise: 59900 }));
    expect(item).toMatchObject({ title: 'Mini Horoscope', isActive: false, originalPricePaise: 59900, pricePaise: code.pricePaise });
    const product = { ...code, itemType: OrderItemType.PRODUCT };
    expect(applyOverride(product, edit({ name: 'X' }))).toBe(product);
  });

  it('is what the catalogue sells once loaded, and an inactive report is refused', () => {
    reportCatalogOverrides.setSnapshot([edit({ salePricePaise: 25000, gstRateBp: 1800, isActive: false })]);
    const item = commerceCatalog.getItem('report-planetary-summary');
    expect(item?.pricePaise).toBe(29500);
    expect(() => commerceCatalog.calculateOrder([{ catalogId: 'report-planetary-summary' }])).toThrow(/inactive/);
    expect(commerceCatalog.needsFreshRead('report-planetary-summary')).toBe(true);
  });
});
