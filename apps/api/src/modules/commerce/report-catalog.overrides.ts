/**
 * Admin edits of the report catalogue (owner decision 2026-11-26: the website admin's "PDF
 * Reports" screen). The report types stay in code (`COMMERCE_CATALOG`, the engine generates
 * them); rows of `report_catalog_entries` override what is sold and shown.
 *
 * Like the consultation types, the catalogue reads a synchronous in-memory snapshot:
 *   - `refresh()` re-reads at most every 30 seconds, a failed read keeps the previous snapshot;
 *   - `refresh({ force: true })` re-reads now and throws when the database cannot be read. It runs
 *     before an order is priced, so a price edited a moment ago is the one charged;
 *   - every admin write refreshes the snapshot of this process.
 *
 * Prices: staff enter the price before GST and the GST rate, as on the website. The catalogue keeps
 * the GST-inclusive amount (every report constant is inclusive): base + round(base x rate), from
 * which `calculateOrder` derives exactly the base again.
 */
import { OrderItemType, Prisma, ReportCatalogEntry } from '@prisma/client';
import { prisma } from '../../services/prisma.service';
import { logger } from '../../utils/logger';
import type { CatalogItem } from './commerce.catalog';

const REFRESH_INTERVAL_MS = 30_000;

export interface ReportContentBlock {
  title: string;
  description: string;
  icon?: string;
}

export interface ReportFaq {
  question: string;
  answer: string;
}

/** What the admin may change. Null fields keep the code value. */
export interface ReportCatalogOverride {
  catalogId: string;
  name: string | null;
  slug: string | null;
  shortDescription: string | null;
  description: string | null;
  coverImageUrl: string | null;
  coverImageKey: string | null;
  /** The price as entered: before GST, or the final price when priceIncludesGst. */
  salePricePaise: number | null;
  priceIncludesGst: boolean;
  originalPricePaise: number | null;
  gstRateBp: number | null;
  isActive: boolean | null;
  isPremium: boolean;
  benefits: ReportContentBlock[];
  features: ReportContentBlock[];
  faqs: ReportFaq[];
  hsnSac: string | null;
  updatedAt: Date | null;
  updatedById: string | null;
}

function blocks(value: Prisma.JsonValue): ReportContentBlock[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Prisma.JsonObject => typeof v === 'object' && v !== null && !Array.isArray(v))
    .map((v) => ({
      title: typeof v.title === 'string' ? v.title : '',
      description: typeof v.description === 'string' ? v.description : '',
      ...(typeof v.icon === 'string' && v.icon ? { icon: v.icon } : {}),
    }))
    .filter((b) => b.title || b.description);
}

function faqs(value: Prisma.JsonValue): ReportFaq[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Prisma.JsonObject => typeof v === 'object' && v !== null && !Array.isArray(v))
    .map((v) => ({ question: typeof v.question === 'string' ? v.question : '', answer: typeof v.answer === 'string' ? v.answer : '' }))
    .filter((f) => f.question && f.answer);
}

export function rowToOverride(row: ReportCatalogEntry): ReportCatalogOverride {
  return {
    catalogId: row.catalogId,
    name: row.name,
    slug: row.slug,
    shortDescription: row.shortDescription,
    description: row.description,
    coverImageUrl: row.coverImageUrl,
    coverImageKey: row.coverImageKey,
    salePricePaise: row.salePricePaise,
    priceIncludesGst: row.priceIncludesGst,
    originalPricePaise: row.originalPricePaise,
    gstRateBp: row.gstRateBp,
    isActive: row.isActive,
    isPremium: row.isPremium,
    benefits: blocks(row.benefits),
    features: blocks(row.features),
    faqs: faqs(row.faqs),
    hsnSac: row.hsnSac,
    updatedAt: row.updatedAt,
    updatedById: row.updatedById,
  };
}

/** The price before GST of a code item (inclusive constants are split the way `calculateOrder` splits them). */
export function basePriceOf(item: Pick<CatalogItem, 'pricePaise' | 'taxIncluded' | 'taxRateBasisPoints'>): number {
  if (!item.taxIncluded) return item.pricePaise;
  return Math.round((item.pricePaise * 10000) / (10000 + item.taxRateBasisPoints));
}

/** GST-inclusive price from a price before GST. */
export function inclusivePrice(basePaise: number, rateBp: number): number {
  return basePaise + Math.floor((basePaise * rateBp + 5000) / 10000);
}

/** The code item with the admin's edits applied. A non-report item is returned unchanged. */
export function applyOverride(item: CatalogItem, override: ReportCatalogOverride | undefined): CatalogItem {
  if (!override || item.itemType !== OrderItemType.REPORT) return item;
  const rateBp = override.gstRateBp ?? item.taxRateBasisPoints;
  const priceChanged = override.salePricePaise !== null || override.gstRateBp !== null;
  // GST-inclusive entry: the customer pays exactly what staff typed (e.g. ₹999); otherwise GST is
  // added on top of the typed price. The catalogue always keeps the GST-inclusive amount.
  let pricePaise = item.pricePaise;
  if (priceChanged) {
    if (override.salePricePaise !== null && override.priceIncludesGst) pricePaise = override.salePricePaise;
    else pricePaise = inclusivePrice(override.salePricePaise ?? basePriceOf(item), rateBp);
  }
  return {
    ...item,
    title: override.name?.trim() || item.title,
    description: override.description?.trim() || item.description,
    pricePaise,
    taxRateBasisPoints: rateBp,
    taxIncluded: priceChanged ? true : item.taxIncluded,
    originalPricePaise: override.originalPricePaise ?? item.originalPricePaise,
    isActive: override.isActive ?? item.isActive,
  };
}

export class ReportCatalogOverrides {
  private snapshot = new Map<string, ReportCatalogOverride>();
  private nextRefreshAt = 0;
  private refreshing: Promise<void> | null = null;

  public async refresh(options: { force?: boolean } = {}): Promise<void> {
    if (!options.force && Date.now() < this.nextRefreshAt) return;
    if (!this.refreshing) {
      this.refreshing = this.load().finally(() => {
        this.refreshing = null;
      });
    }
    try {
      await this.refreshing;
    } catch (err) {
      if (options.force) throw err;
      logger.warn({ err }, '[ReportCatalog] Could not read report catalogue edits; keeping the previous snapshot');
    }
  }

  private async load(): Promise<void> {
    const rows = await prisma.reportCatalogEntry.findMany();
    this.snapshot = new Map(rows.map((row) => [row.catalogId, rowToOverride(row)]));
    this.nextRefreshAt = Date.now() + REFRESH_INTERVAL_MS;
  }

  public get(catalogId: string): ReportCatalogOverride | undefined {
    return this.snapshot.get(catalogId);
  }

  public all(): ReportCatalogOverride[] {
    return [...this.snapshot.values()];
  }

  /** Tests. */
  public setSnapshot(entries: ReportCatalogOverride[]): void {
    this.snapshot = new Map(entries.map((e) => [e.catalogId, e]));
    this.nextRefreshAt = Number.MAX_SAFE_INTEGER;
  }

  public reset(): void {
    this.snapshot = new Map();
    this.nextRefreshAt = 0;
  }
}

export const reportCatalogOverrides = new ReportCatalogOverrides();
