/**
 * Bridge from admin-editable consultation types to the commerce catalogue.
 *
 * The commerce catalogue (`commerce/commerce.catalog.ts`) used to hold the consultation tiers as
 * constants. They now live in `consultation_types`; the catalogue should ask this source for
 * every item whose type is CONSULTATION.
 *
 * WHERE IT IS PLUGGED IN (commerce.catalog.ts; done, the `consult-*` constants are gone):
 *   - `CommerceCatalogService.getItem(id)`: a code constant if there is one, else
 *     `consultationCatalogSource.getItem(id)`;
 *   - `CommerceCatalogService.listItems(filter)`: appends `consultationCatalogSource.listItems()`
 *     when `filter.itemType` is unset or CONSULTATION;
 *   - `calculateOrder` honours `taxIncluded === false` (GST added on top of `pricePaise`);
 *   - `commerceCatalog.refresh()` delegates to `refresh()` here. Asynchronous callers await it
 *     before reading: `commerceService.createOrder` with `force: true` whenever an item is not a
 *     code constant (money: re-read now, fail if the database cannot be read, so the first request
 *     after start-up and a price edited a moment ago are right), `GET /payments/catalog` without
 *     `force` (at most one read every 30 seconds). `getItem` / `listItems` stay synchronous.
 *
 * The seeded rows give exactly the catalogue items the constants gave (ids, titles, prices, GST,
 * modes, durations, notice days): proved by tests/unit/wire-payments-catalogue.test.ts against a
 * frozen copy of the former constants.
 *
 * Both methods read the in-memory snapshot kept by ConsultationTypesService.
 */
import { FulfillmentType, OrderItemType } from '@prisma/client';
import type { CatalogItem } from '../commerce/commerce.catalog';
import { consultationTypesService, ConsultationModeView, ConsultationTypeView } from './consultation-types.service';

export interface ConsultationCatalogSource {
  /** Reload from the database if the snapshot is older than 30 seconds. */
  refresh(options?: { force?: boolean }): Promise<void>;
  /** The catalogue item for a consultation mode's catalog id, or null. Includes inactive items. */
  getItem(catalogId: string): CatalogItem | null;
  listItems(filter?: { activeOnly?: boolean }): CatalogItem[];
}

const MODE_LABEL: Record<ConsultationModeView['mode'], string> = {
  AUDIO: 'Audio',
  VIDEO: 'Video',
  IN_PERSON: 'In Person',
  MESSAGE: 'WhatsApp Message',
};

export function toCatalogItem(type: ConsultationTypeView, mode: ConsultationModeView): CatalogItem {
  return {
    id: mode.catalogId,
    itemType: OrderItemType.CONSULTATION,
    // A type with several modes needs the mode in the line title; single-mode types
    // (every seeded tier) keep their title exactly.
    title: type.modes.length > 1 ? `${type.title} (${MODE_LABEL[mode.mode]})` : type.title,
    description: type.description ?? '',
    pricePaise: mode.pricePaise,
    currency: 'INR',
    taxRateBasisPoints: mode.gst.enabled ? mode.gst.rateBasisPoints : 0,
    taxIncluded: mode.gst.type === 'INCLUSIVE',
    fulfillmentType: FulfillmentType.SERVICE,
    isActive: type.isActive,
    minQuantity: 1,
    maxQuantity: 1,
    consultationMode: mode.mode,
    durationMinutes: type.durationMinutes,
    responseDays: type.responseDays,
  };
}

export const consultationCatalogSource: ConsultationCatalogSource = {
  refresh: (options) => consultationTypesService.refresh(options),

  getItem(catalogId) {
    for (const type of consultationTypesService.all()) {
      const mode = type.modes.find((m) => m.catalogId === catalogId);
      if (mode) return toCatalogItem(type, mode);
    }
    return null;
  },

  listItems(filter) {
    const activeOnly = filter?.activeOnly !== false;
    return consultationTypesService
      .all()
      .filter((type) => !activeOnly || type.isActive)
      .flatMap((type) => type.modes.map((mode) => toCatalogItem(type, mode)));
  },
};
